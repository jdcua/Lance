use axum::{
    extract::{ConnectInfo, Path, State},
    response::Html,
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tokio::runtime::Runtime;
use tokio::sync::Mutex;
use axum::response::IntoResponse;
use tower_http::{limit::RequestBodyLimitLayer, timeout::TimeoutLayer};

const RATE_LIMIT_MAX: u64 = 60;
const RATE_LIMIT_WINDOW_SECS: u64 = 60;
const TOKEN_LOOKUP_FAIL_MAX: u64 = 10;
const TOKEN_LOOKUP_LOCKOUT_SECS: u64 = 300;
const REQUEST_TIMEOUT_SECS: u64 = 30;

/// Cap on concurrent portal requests.
///
/// Without this a local process can hold connections open indefinitely; each one
/// opens its own SQLite handle. The permit is released when the response future
/// is dropped, so a panicking handler cannot leak capacity.
///
/// Accepting the connection when the limit is already reached would just move
/// the queue into the kernel backlog, which is what the timeout is for, so
/// excess requests are shed immediately instead.
const MAX_CONCURRENT_REQUESTS: usize = 64;

// A portal response is a name, a signature and one enum value. A kilobyte is
// generous by two orders of magnitude, and it is checked BEFORE serde parses the
// body, so an unauthenticated caller cannot make us allocate.
const MAX_REQUEST_BODY_BYTES: usize = 16 * 1024;

fn chrono_now() -> String {
    Utc::now().to_rfc3339()
}

#[derive(Clone)]
pub struct AppState {
    pub db_path: String,
    pub rate_limits: Arc<Mutex<HashMap<String, (u64, u64)>>>,
    pub token_failures: Arc<Mutex<HashMap<String, (u64, u64)>>>,
}

impl AppState {
    async fn check_rate_limit(&self, token: &str) -> bool {
        let now = Utc::now().timestamp() as u64;
        let mut limits = self.rate_limits.lock().await;
        let entry = limits.entry(token.to_string()).or_insert((0, now));
        if now - entry.1 >= RATE_LIMIT_WINDOW_SECS {
            *entry = (1, now);
            true
        } else if entry.0 < RATE_LIMIT_MAX {
            entry.0 += 1;
            true
        } else {
            false
        }
    }

    async fn record_token_failure(&self, source: &str) -> bool {
        let now = Utc::now().timestamp() as u64;
        let mut failures = self.token_failures.lock().await;
        let entry = failures.entry(source.to_string()).or_insert((0, now));
        if now - entry.1 >= TOKEN_LOOKUP_LOCKOUT_SECS {
            *entry = (1, now);
            true
        } else if entry.0 < TOKEN_LOOKUP_FAIL_MAX {
            entry.0 += 1;
            true
        } else {
            false
        }
    }
}

pub struct ServerHandle {
    pub port: u16,
    shutdown_tx: Option<tokio::sync::oneshot::Sender<()>>,
    _runtime: Runtime,
}

impl Drop for ServerHandle {
    fn drop(&mut self) {
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(());
        }
    }
}

fn db_connection(db_path: &str) -> Result<Connection, String> {
    Connection::open(db_path).map_err(|e| format!("DB open failed: {}", e))
}

#[allow(dead_code)]
struct TokenRecord {
    token: String,
    entity_type: String,
    entity_id: String,
    expires_at: Option<String>,
    view_count: i64,
    client_response: Option<String>,
    client_response_at: Option<String>,
    client_name: Option<String>,
    client_signature: Option<String>,
    client_signed_at: Option<String>,
}

fn find_token(conn: &Connection, token: &str) -> Result<Option<TokenRecord>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT token, entity_type, entity_id, expires_at,
                    view_count, client_response, client_response_at, client_name,
                    client_signature, client_signed_at
             FROM share_tokens WHERE token = ?1",
        )
        .map_err(|e| e.to_string())?;
    Ok(stmt
        .query_row(rusqlite::params![token], |row| {
            Ok(TokenRecord {
                token: row.get(0)?,
                entity_type: row.get(1)?,
                entity_id: row.get(2)?,
                expires_at: row.get(3)?,
                view_count: row.get(4)?,
                client_response: row.get(5)?,
                client_response_at: row.get(6)?,
                client_name: row.get(7)?,
                client_signature: row.get(8)?,
                client_signed_at: row.get(9)?,
            })
        })
        .ok())
}

fn record_view(conn: &Connection, token: &str) -> Result<(), String> {
    let now = chrono_now();
    conn.execute(
        "UPDATE share_tokens SET view_count = view_count + 1, viewed_at = CASE WHEN viewed_at IS NULL THEN ?1 ELSE viewed_at END WHERE token = ?2",
        rusqlite::params![now, token],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn format_date(iso: &str) -> String {
    iso.split('T').next().unwrap_or(iso).to_string()
}

fn escape_html(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

fn sanitize_html(html: &str) -> String {
    let mut cleaner = ammonia::Builder::new();
    let clean_tags: std::collections::HashSet<&str> =
        ["script", "style", "iframe", "object", "embed", "form", "input"].into_iter().collect();
    cleaner
        .add_tags(&["p", "strong", "em", "a", "h1", "h2", "ul", "ol", "li", "blockquote", "hr", "br"])
        .add_tag_attributes("a", &["href", "title"])
        // Links are freelancer-authored (portfolio, payment URLs), not
        // attacker input — but href stays scheme-gated by ammonia's default
        // url_schemes (no javascript:/data:) and never inherits a target.
        .link_rel(Some("noopener"))
        .clean_content_tags(clean_tags)
        .id_prefix(None);
    cleaner.clean(html).to_string()
}

#[derive(Debug, Deserialize)]
struct RespondPayload {
    response: String,
    client_name: Option<String>,
    client_signature: Option<String>,
    #[allow(dead_code)]
    message: Option<String>,
}

fn build_portal_html(conn: &Connection, token: &TokenRecord) -> Result<String, String> {
    let entity_type = &token.entity_type;
    let entity_id = &token.entity_id;
    let response = token.client_response.as_deref();

    if entity_type == "proposal" {
        let mut stmt = conn
            .prepare(
                "SELECT p.title, p.body, p.scope, p.timeline, p.rate, p.rate_type, p.created_at,
                        c.name as client_name, u.name as freelancer_name, u.tagline, u.currency
                 FROM proposals p
                 LEFT JOIN clients c ON p.client_id = c.id
                 CROSS JOIN (SELECT name, tagline, currency FROM user_profile WHERE id = 1) u
                 WHERE p.id = ?1",
            )
            .map_err(|e| e.to_string())?;
        let row = stmt
            .query_row(rusqlite::params![entity_id], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, Option<String>>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, Option<String>>(3)?,
                    row.get::<_, Option<f64>>(4)?,
                    row.get::<_, Option<String>>(5)?,
                    row.get::<_, String>(6)?,
                    row.get::<_, Option<String>>(7)?,
                    row.get::<_, Option<String>>(8)?,
                    row.get::<_, Option<String>>(9)?,
                    row.get::<_, Option<String>>(10)?,
                ))
            })
            .map_err(|e| e.to_string())?;

        let (
            title,
            body,
            scope,
            timeline,
            rate,
            rate_type,
            _created_at,
            client_name,
            freelancer_name,
            tagline,
            currency,
        ) = row;

        let freelancer_val = freelancer_name.unwrap_or_else(|| "Freelancer".into());
        let freelancer = escape_html(&freelancer_val);
        let tl_val = tagline.unwrap_or_default();
        let tl = escape_html(&tl_val);
        let client_val = client_name.clone().unwrap_or_else(|| "Client".into());
        let client = escape_html(&client_val);
        let t = escape_html(&title);

        let mut details = String::new();
        if let Some(s) = scope {
            details.push_str(&format!(
                "<div class=\"detail\"><span class=\"label\">Scope</span><span>{}</span></div>",
                escape_html(&s)
            ));
        }
        if let Some(ref tl_val2) = timeline {
            details.push_str(&format!(
                "<div class=\"detail\"><span class=\"label\">Timeline</span><span>{}</span></div>",
                escape_html(tl_val2)
            ));
        }
        if let Some(r) = rate {
            let curr = currency.unwrap_or_else(|| "CAD".into());
            let rt = rate_type.unwrap_or_else(|| "flat".into());
            let label = if rt == "hourly" {
                format!("${:.2}/hr {}", r, curr)
            } else {
                format!("${:.2} flat {}", r, curr)
            };
            details.push_str(&format!(
                "<div class=\"detail\"><span class=\"label\">Rate</span><span>{}</span></div>",
                escape_html(&label)
            ));
        }

        let raw_body = body.unwrap_or_default();
        let body_html = sanitize_html(&raw_body);

        let name_placeholder = token.client_name.as_deref().unwrap_or(&client_val);

        let action_section = if let Some(resp_raw) = response {
            let resp_date =
                token.client_response_at.as_deref().map(format_date).unwrap_or_default();
            let name = token.client_name.as_deref().unwrap_or("Client");
            // Escape at the sink. This interpolation used neither escape_html nor
            // sanitize_html, the only unescaped one on the page, and its only
            // protection was a DB CHECK that no migration backfills into an
            // existing database.
            let resp = escape_html(resp_raw);
            format!(
                r#"<div class="response-banner {}">
                    <div class="response-icon">{}</div>
                    <div>{} this proposal on {}</div>
                </div>"#,
                resp,
                if resp_raw == "accepted" { "&#10003;" } else { "&#10007;" },
                escape_html(name),
                escape_html(&resp_date),
            )
        } else {
            format!(
                r#"<div class="actions">
                    <input type="text" id="client-name" class="name-input" placeholder="Your name" value="{}">
                    <div class="button-row">
                        <button class="btn btn-accept" onclick="respond('accepted')">Accept Proposal</button>
                        <button class="btn btn-decline" onclick="respond('declined')">Decline</button>
                    </div>
                    <input type="text" id="client-message" class="name-input" placeholder="Optional message..." style="margin-top:8px">
                    <div id="error-msg" class="error-msg"></div>
                </div>
                <script>
                    function respond(response) {{
                        var name = document.getElementById('client-name').value.trim();
                        if (!name) {{
                            document.getElementById('error-msg').textContent = 'Please enter your name.';
                            return;
                        }}
                        var msg = document.getElementById('client-message').value.trim();
                        var payload = {{ response: response, client_name: name, message: msg || null }};
                        fetch(window.location.pathname + '/respond', {{
                            method: 'POST',
                            headers: {{ 'Content-Type': 'application/json', 'X-Lance-Client': 'portal' }},
                            body: JSON.stringify(payload)
                        }}).then(function(r) {{
                            if (r.ok) location.reload();
                            else r.text().then(function(t) {{ document.getElementById('error-msg').textContent = t; }});
                        }}).catch(function() {{
                            document.getElementById('error-msg').textContent = 'Network error. Try again.';
                        }});
                    }}
                </script>"#,
                escape_html(name_placeholder),
            )
        };

        let stylesheet = r#"<style>
 *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
 body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f7;color:#1d1d1f;line-height:1.6;min-height:100vh}
 .container{max-width:680px;margin:0 auto;padding:32px 16px}
 .header{text-align:center;padding:40px 0 24px;border-bottom:1px solid #e5e5e7;margin-bottom:24px}
 .header h1{font-size:22px;font-weight:700;margin-bottom:4px}
 .header .tagline{font-size:13px;color:#86868b}
 .header .for-client{font-size:12px;color:#86868b;margin-top:8px}
 .title{font-size:20px;font-weight:700;margin-bottom:16px}
 .details{display:flex;flex-wrap:wrap;gap:16px;margin-bottom:24px}
 .detail{display:flex;flex-direction:column;gap:2px;background:#fff;padding:12px 16px;border-radius:10px;border:1px solid #e5e5e7;min-width:120px}
 .detail .label{font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#86868b;font-weight:600}
 .detail span:last-child{font-size:14px;color:#1d1d1f;font-weight:500}
 .body{background:#fff;border-radius:12px;padding:24px;border:1px solid #e5e5e7;margin-bottom:24px;font-size:14px}
 .body h1,.body h2,.body h3{margin:16px 0 8px}
 .body h2{font-size:18px}
 .body h3{font-size:15px}
 .body p{margin:8px 0}
 .body ul,.body ol{margin:8px 0;padding-left:24px}
 .body blockquote{border-left:3px solid #e5e5e7;margin:12px 0;padding:4px 16px;color:#86868b}
 .actions{background:#fff;border-radius:12px;padding:24px;border:1px solid #e5e5e7;margin-bottom:24px}
 .name-input{width:100%;padding:10px 14px;border:1px solid #d2d2d7;border-radius:8px;font-size:14px;margin-bottom:12px;outline:none}
 .name-input:focus{border-color:#0071e3;box-shadow:0 0 0 3px rgba(0,113,227,.15)}
 .button-row{display:flex;gap:12px}
 .btn{flex:1;padding:12px 20px;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:all .15s}
 .btn-accept{background:#34c759;color:#fff}
 .btn-accept:hover{background:#30b350}
 .btn-decline{background:transparent;color:#86868b;border:1px solid #d2d2d7}
 .btn-decline:hover{background:#f5f5f7;color:#1d1d1f}
 .response-banner{display:flex;align-items:center;gap:8px;padding:16px 20px;border-radius:10px;font-size:14px;font-weight:500;margin-bottom:24px}
 .response-banner.accepted{background:#e8f8ed;color:#1d7a3e;border:1px solid #c3e8ce}
 .response-banner.declined{background:#fee;color:#c92a2a;border:1px solid #fcc}
 .response-icon{font-size:18px}
 .error-msg{color:#c92a2a;font-size:12px;margin-top:8px}
 .footer{text-align:center;color:#86868b;font-size:11px;padding:24px 0}
 @media(max-width:480px){.button-row{flex-direction:column}.detail{min-width:100%}}
 </style>"#;

        Ok(format!(
            r#"<!DOCTYPE html>
 <html lang="en">
 <head>
 <meta charset="UTF-8">
 <meta name="viewport" content="width=device-width, initial-scale=1.0">
 <title>{}, Proposal</title>
 {}
 </head>
 <body>
 <div class="container">
 <div class="header">
     <h1>{}</h1>
     <div class="tagline">{}</div>
     <div class="for-client">Prepared for: {}</div>
 </div>
 <div class="title">{}</div>
 <div class="details">{}</div>
 <div class="body">{}</div>
 {}
 <div class="footer">Powered by Lance &middot; This link only works while Lance is open</div>
 </div>
 </body>
 </html>"#,
            escape_html(&title),
            stylesheet,
            freelancer,
            tl,
            client,
            t,
            details,
            body_html,
            action_section,
        ))
    } else {
        let mut stmt = conn
            .prepare(
                "SELECT c.title, c.body, c.created_at,
                        cl.name as client_name, u.name as freelancer_name, u.tagline
                 FROM contracts c
                 LEFT JOIN clients cl ON c.client_id = cl.id
                 CROSS JOIN (SELECT name, tagline FROM user_profile WHERE id = 1) u
                 WHERE c.id = ?1",
            )
            .map_err(|e| e.to_string())?;
        let row = stmt
            .query_row(rusqlite::params![entity_id], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, Option<String>>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, Option<String>>(3)?,
                    row.get::<_, Option<String>>(4)?,
                    row.get::<_, Option<String>>(5)?,
                ))
            })
            .map_err(|e| e.to_string())?;

        let (title, body, _created_at, client_name, freelancer_name, tagline) = row;

        let freelancer_val = freelancer_name.unwrap_or_else(|| "Freelancer".into());
        let freelancer = escape_html(&freelancer_val);
        let tl_val = tagline.unwrap_or_default();
        let tl = escape_html(&tl_val);
        let client_val = client_name.unwrap_or_else(|| "Client".into());
        let client = escape_html(&client_val);
        let t = escape_html(&title);
        let raw_body = body.unwrap_or_default();
        let body_html = sanitize_html(&raw_body);

        let sign_section = if let Some(ref sig) = token.client_signature {
            let sig_date = token.client_signed_at.as_deref().map(format_date).unwrap_or_default();
            format!(
                r#"<div class="signed-banner">
                    &#10003; Signed by {} on {}
                </div>"#,
                escape_html(sig),
                escape_html(&sig_date),
            )
        } else {
            let today = chrono_now();
            let today_date = format_date(&today);
            format!(
                r#"<div class="sign-section">
                    <p>By typing your name below you agree to the terms of this contract.</p>
                    <input type="text" id="signature-name" class="name-input" placeholder="Type your full name">
                    <div class="date-display">Date: {}</div>
                    <input type="text" id="client-message" class="name-input" placeholder="Optional message..." style="margin-top:8px">
                    <button class="sign-btn" onclick="signContract()">Sign Contract</button>
                    <div id="error-msg" class="error-msg"></div>
                </div>
                <script>
                    function signContract() {{
                        var name = document.getElementById('signature-name').value.trim();
                        if (!name) {{
                            document.getElementById('error-msg').textContent = 'Please type your name to sign.';
                            return;
                        }}
                        var msg = document.getElementById('client-message').value.trim();
                        var payload = {{ response: 'signed', client_signature: name, message: msg || null }};
                        fetch(window.location.pathname + '/respond', {{
                            method: 'POST',
                            headers: {{ 'Content-Type': 'application/json', 'X-Lance-Client': 'portal' }},
                            body: JSON.stringify(payload)
                        }}).then(function(r) {{
                            if (r.ok) location.reload();
                            else r.text().then(function(t) {{ document.getElementById('error-msg').textContent = t; }});
                        }}).catch(function() {{
                            document.getElementById('error-msg').textContent = 'Network error. Try again.';
                        }});
                    }}
                </script>"#,
                escape_html(&today_date),
            )
        };

        let stylesheet = r#"<style>
 *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
 body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f7;color:#1d1d1f;line-height:1.6;min-height:100vh}
 .container{max-width:680px;margin:0 auto;padding:32px 16px}
 .header{text-align:center;padding:40px 0 24px;border-bottom:1px solid #e5e5e7;margin-bottom:24px}
 .header h1{font-size:22px;font-weight:700;margin-bottom:4px}
 .header .tagline{font-size:13px;color:#86868b}
 .header .for-client{font-size:12px;color:#86868b;margin-top:8px}
 .title{font-size:20px;font-weight:700;margin-bottom:16px}
 .body{background:#fff;border-radius:12px;padding:24px;border:1px solid #e5e5e7;margin-bottom:24px;font-size:14px}
 .body h1,.body h2,.body h3{margin:16px 0 8px}
 .body h2{font-size:18px}
 .body h3{font-size:15px}
 .body p{margin:8px 0}
 .body ul,.body ol{margin:8px 0;padding-left:24px}
 .body blockquote{border-left:3px solid #e5e5e7;margin:12px 0;padding:4px 16px;color:#86868b}
 .name-input{width:100%;padding:10px 14px;border:1px solid #d2d2d7;border-radius:8px;font-size:14px;margin-bottom:12px;outline:none}
 .name-input:focus{border-color:#0071e3;box-shadow:0 0 0 3px rgba(0,113,227,.15)}
 .sign-section{background:#fff;border-radius:12px;padding:24px;border:1px solid #e5e5e7;margin-bottom:24px}
 .sign-section p{font-size:13px;color:#86868b;margin-bottom:12px}
 .sign-btn{width:100%;padding:14px;border:none;border-radius:8px;background:#0071e3;color:#fff;font-size:15px;font-weight:600;cursor:pointer}
 .sign-btn:hover{background:#0077ed}
 .date-display{font-size:12px;color:#86868b;margin-top:8px}
 .signed-banner{background:#e8f8ed;border:1px solid #c3e8ce;border-radius:10px;padding:16px 20px;color:#1d7a3e;font-size:14px;font-weight:500;margin-bottom:24px}
 .error-msg{color:#c92a2a;font-size:12px;margin-top:8px}
 .footer{text-align:center;color:#86868b;font-size:11px;padding:24px 0}
 @media(max-width:480px){.button-row{flex-direction:column}.detail{min-width:100%}}
 </style>"#;

        Ok(format!(
            r#"<!DOCTYPE html>
 <html lang="en">
 <head>
 <meta charset="UTF-8">
 <meta name="viewport" content="width=device-width, initial-scale=1.0">
 <title>{}, Contract</title>
 {}
 </head>
 <body>
 <div class="container">
 <div class="header">
     <h1>{}</h1>
     <div class="tagline">{}</div>
     <div class="for-client">Prepared for: {}</div>
 </div>
 <div class="title">{}</div>
 <div class="body">{}</div>
 {}
 <div class="footer">Powered by Lance &middot; This link only works while Lance is open</div>
 </div>
 </body>
 </html>"#,
            escape_html(&title),
            stylesheet,
            freelancer,
            tl,
            client,
            t,
            body_html,
            sign_section,
        ))
    }
}

fn security_headers() -> axum::http::HeaderMap {
    use axum::http::{HeaderMap, HeaderName, HeaderValue};
    let mut headers = HeaderMap::new();
    headers.insert(HeaderName::from_static("x-frame-options"), HeaderValue::from_static("DENY"));
    headers.insert(
        HeaderName::from_static("x-content-type-options"),
        HeaderValue::from_static("nosniff"),
    );
    headers.insert(
        HeaderName::from_static("content-security-policy"),
        HeaderValue::from_static(
            // form-action is NOT covered by default-src, and it is the directive
            // that stops an injected handler exfiltrating the page: a form POST
            // is a top-level navigation, so connect-src would not stop it.
            "default-src 'self'; style-src 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'",
        ),
    );
    headers.insert(
        HeaderName::from_static("referrer-policy"),
        HeaderValue::from_static("no-referrer"),
    );
    headers
}

fn add_security_headers(
    html: Html<String>,
) -> (axum::http::StatusCode, axum::http::HeaderMap, String) {
    let headers = security_headers();
    (axum::http::StatusCode::OK, headers, html.0)
}

fn fallback_page() -> (axum::http::StatusCode, axum::http::HeaderMap, String) {
    let html = r#"<!DOCTYPE html>
 <html lang="en">
 <head>
 <meta charset="UTF-8">
 <meta name="viewport" content="width=device-width, initial-scale=1.0">
 <title>Lance</title>
 <style>
 body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f7;color:#1d1d1f;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;text-align:center}
 .card{background:#fff;border-radius:16px;padding:40px 32px;border:1px solid #e5e5e7;max-width:400px;width:100%}
 .card h1{font-size:20px;margin-bottom:8px}
 .card p{font-size:14px;color:#86868b;margin-top:8px;line-height:1.5}
 </style>
 </head>
 <body>
 <div class="card">
 <h1>Lance is not running</h1>
 <p>Please ask your freelancer to open Lance to view this content. Share links only work while the Lance app is open.</p>
 </div>
 </body>
 </html>"#
        .to_string();
    (axum::http::StatusCode::OK, security_headers(), html)
}

fn rate_limited_page() -> (axum::http::StatusCode, axum::http::HeaderMap, String) {
    let html = r#"<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rate Limited</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f7;color:#1d1d1f;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center}h1{font-size:20px}p{color:#86868b;font-size:14px}</style></head><body><div><h1>Too Many Requests</h1><p>Please wait a moment before trying again.</p></div></body></html>"#
            .to_string();
    (axum::http::StatusCode::TOO_MANY_REQUESTS, security_headers(), html)
}

async fn serve_portal(
    State(state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    Path(token): Path<String>,
) -> (axum::http::StatusCode, axum::http::HeaderMap, String) {
    let source = addr.ip().to_string();

    if !state.check_rate_limit(&token).await {
        return rate_limited_page();
    }

    if !state.record_token_failure(&source).await {
        let html = r#"<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Blocked</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f7;color:#1d1d1f;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center}h1{font-size:20px}p{color:#86868b;font-size:14px}</style></head><body><div><h1>Access Blocked</h1><p>Too many failed attempts. Please try again later.</p></div></body></html>"#
            .to_string();
        return (axum::http::StatusCode::TOO_MANY_REQUESTS, security_headers(), html);
    }

    let conn = match db_connection(&state.db_path) {
        Ok(c) => c,
        Err(_) => return fallback_page(),
    };

    let record = match find_token(&conn, &token) {
        Ok(Some(r)) => r,
        _ => return fallback_page(),
    };

    if let Some(ref exp) = record.expires_at {
        if exp.as_str() < chrono_now().as_str() {
            let html = r#"<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Expired</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f7;color:#1d1d1f;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center}h1{font-size:20px}p{color:#86868b;font-size:14px}</style></head><body><div><h1>Link Expired</h1><p>This share link has expired. Please contact your freelancer for a new link.</p></div></body></html>"#
                    .to_string();
            return (axum::http::StatusCode::GONE, security_headers(), html);
        }
    }

    let _ = record_view(&conn, &token);

    match build_portal_html(&conn, &record) {
        Ok(html) => add_security_headers(Html(html)),
        Err(_) => fallback_page(),
    }
}

/// Anti-CSRF check for the respond endpoint.
///
/// Scope, stated honestly: this stops a WEB PAGE loaded in the freelancer's
/// browser from POSTing on a client's behalf. A cross-origin `fetch` carrying a
/// custom header triggers a CORS preflight, and this server registers no OPTIONS
/// route and sends no `Access-Control-Allow-*` header, so the browser refuses it.
/// A plain form POST cannot set the header at all. That is the whole job, and it
/// works.
///
/// It is NOT authentication against a local process. Anything running as the
/// user can set this header, read the portal HTML to learn the token, or open
/// `lance.db` directly. Tightening the header value would buy nothing, because
/// every value a stronger check needs is already sitting in a file the same local
/// caller can read. The real controls for that position are filesystem
/// permissions on the app data directory, which are outside this file.
///
/// The compare is constant-time anyway; it costs nothing and removes the habit.
fn check_portal_header(headers: &axum::http::HeaderMap) -> bool {
    let expected = b"portal";
    let Some(value) = headers.get("X-Lance-Client").map(|v| v.as_bytes()) else {
        return false;
    };
    if value.len() != expected.len() {
        return false;
    }
    let mut diff = 0u8;
    for (a, b) in value.iter().zip(expected.iter()) {
        diff |= a ^ b;
    }
    diff == 0
}

async fn handle_respond(
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    State(state): State<AppState>,
    Path(token): Path<String>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<RespondPayload>,
) -> Result<(axum::http::StatusCode, axum::http::HeaderMap, String), (axum::http::StatusCode, String)>
{
    if !check_portal_header(&headers) {
        return Err((axum::http::StatusCode::FORBIDDEN, "Access denied.".to_string()));
    }

    // Same guard as serve_portal. This route previously had NEITHER limiter, so
    // it was an unthrottled token oracle: it returns 404 for unknown, 410 for
    // expired, 409 for already-answered and 200 on success, so a caller holding
    // a leaked partial token could confirm it and learn its state as fast as the
    // socket allowed. Tokens are 256-bit so blind enumeration is infeasible, but
    // confirming a leaked one is exactly the case that matters.
    if !state.check_rate_limit(&token).await {
        return Err((
            axum::http::StatusCode::TOO_MANY_REQUESTS,
            "Too many requests.".to_string(),
        ));
    }
    let source = addr.ip().to_string();
    if !state.record_token_failure(&source).await {
        return Err((
            axum::http::StatusCode::TOO_MANY_REQUESTS,
            "Too many failed attempts.".to_string(),
        ));
    }

    let conn = db_connection(&state.db_path)
        .map_err(|_| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, "Database unavailable.".to_string()))?;

    let record = find_token(&conn, &token)
        .map_err(|_| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, "Database unavailable.".to_string()))?
        .ok_or_else(|| (axum::http::StatusCode::NOT_FOUND, "Share link not found.".to_string()))?;

    // The client needs honest feedback, but the client is the legitimate holder
    // of this token. The oracle that mattered was the unthrottled probe, which
    // the guard above now closes; the messages here stay specific because the
    // only party who can receive them is someone who already has the token.
    if record.client_response.is_some() {
        return Err((
            axum::http::StatusCode::CONFLICT,
            "You have already responded to this.".to_string(),
        ));
    }

    if let Some(ref exp) = record.expires_at {
        if exp.as_str() < chrono_now().as_str() {
            return Err((axum::http::StatusCode::GONE, "This share link has expired.".to_string()));
        }
    }

    // Truncate by character, not by byte index. `trimmed[..200]` panics when the
    // cut lands inside a multi-byte character, and [profile.release] sets
    // panic = "abort", so that panic aborts the whole app: one POST from anyone
    // holding a share link, with 199 ASCII bytes followed by a 3-byte character.
    let sanitized_name = payload
        .client_name
        .as_deref()
        .map(|name| name.trim().chars().take(200).collect::<String>())
        .unwrap_or_else(|| "Client".to_string());

    let sanitized_sig = payload
        .client_signature
        .as_deref()
        .map(|sig| sig.trim().chars().take(200).collect::<String>())
        .unwrap_or_else(|| "Unknown".to_string());

    // Boundary validation. `client_response` reaches the portal HTML, so it is
    // a closed enum here rather than trusting the DB CHECK, which no migration
    // backfills into an existing database.
    let response = match payload.response.as_str() {
        "accepted" => "accepted",
        "declined" => "declined",
        "signed" => "signed",
        _ => return Err((axum::http::StatusCode::BAD_REQUEST, "Invalid response.".into())),
    };

    let now = chrono_now();

    if record.entity_type == "contract" {
        conn.execute(
            "UPDATE share_tokens SET client_response = 'accepted', client_response_at = ?1, client_signature = ?2, client_signed_at = ?3 WHERE token = ?4",
            rusqlite::params![now, sanitized_sig, now, token],
        )
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        conn.execute(
            "UPDATE contracts SET signed_at = ?1 WHERE id = ?2",
            rusqlite::params![now, record.entity_id],
        )
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    } else {
        conn.execute(
            "UPDATE share_tokens SET client_response = ?1, client_response_at = ?2, client_name = ?3 WHERE token = ?4",
            rusqlite::params![response, now, sanitized_name, token],
        )
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        if response == "accepted" {
            conn.execute(
                "UPDATE proposals SET status = 'accepted' WHERE id = ?1",
                rusqlite::params![record.entity_id],
            )
            .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        }
    }

    let html = r#"<!DOCTYPE html>
 <html lang="en">
 <head>
 <meta charset="UTF-8">
 <meta name="viewport" content="width=device-width, initial-scale=1.0">
 <title>Response Sent</title>
 <style>
 body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f7;color:#1d1d1f;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;text-align:center}
 .card{background:#fff;border-radius:16px;padding:40px 32px;border:1px solid #e5e5e7;max-width:400px;width:100%}
 .card h1{font-size:20px;margin-bottom:8px}
 .card p{font-size:14px;color:#86868b;margin-top:8px;line-height:1.5}
 </style>
 </head>
 <body>
 <div class="card">
 <h1>Thank you!</h1>
 <p>Your response has been recorded. The freelancer has been notified.</p>
 </div>
 </body>
 </html>"#
        .to_string();

    Ok((axum::http::StatusCode::OK, security_headers(), html))
}

#[derive(Debug, Serialize, Clone)]
struct PortalServerReadyPayload {
    port: u16,
}

#[derive(Debug, Serialize, Clone)]
struct PortalServerFailedPayload {
    reason: String,
}

pub fn start_server(db_path: String, app_handle: AppHandle) -> Result<ServerHandle, String> {
    let preferred_ports: Vec<u16> = (39821..=39830).collect();

    let (listener, port) = try_bind_sequential(&preferred_ports).inspect_err(|_e| {
        let _ = app_handle.emit(
            "portal-server-failed",
            PortalServerFailedPayload { reason: "Port conflict".to_string() },
        );
    })?;

    let state = AppState {
        db_path,
        rate_limits: Arc::new(Mutex::new(HashMap::new())),
        token_failures: Arc::new(Mutex::new(HashMap::new())),
    };

    let permits = std::sync::Arc::new(tokio::sync::Semaphore::new(MAX_CONCURRENT_REQUESTS));
    let app = Router::new()
        // axum 0.7 uses `:param` (matchit normalises params to `b':'`, see
        // matchit-0.7 tree.rs). The `{token}` spelling is axum 0.8 syntax, so
        // BOTH of these were being registered as literal paths containing the
        // text "{token}" and never matched a request. Every share link 404'd
        // with an empty body, and the portal has been dead on arrival. Verified
        // by inserting a real token into share_tokens and requesting it.
        .route("/share/:token", get(serve_portal))
        .route("/share/:token/respond", post(handle_respond))
        .with_state(state)
        .layer(TimeoutLayer::new(Duration::from_secs(REQUEST_TIMEOUT_SECS)))
        // The body cap was the half of the `limit` feature that was enabled but
        // never wired up. A portal response is a name, a signature and one enum;
        // axum's implicit 2MB limit meant an unauthenticated caller could make
        // serde allocate 2MB per request. Checked before parsing.
        .layer(RequestBodyLimitLayer::new(MAX_REQUEST_BODY_BYTES))
        // Concurrency last, so it wraps everything beneath it: a request that
        // cannot get a permit is shed before it reaches a handler or opens a
        // SQLite handle. `try_acquire_owned` means we shed rather than queue,
        // because queueing would just move the backlog into the kernel.
        .layer(axum::middleware::from_fn(move |req: axum::extract::Request, next: axum::middleware::Next| {
            let permits = permits.clone();
            async move {
                match permits.clone().try_acquire_owned() {
                    Ok(permit) => {
                        let response = next.run(req).await;
                        drop(permit);
                        response
                    }
                    Err(_) => (
                        axum::http::StatusCode::TOO_MANY_REQUESTS,
                        [(axum::http::header::CONTENT_TYPE, "text/plain; charset=utf-8")],
                        "Portal busy",
                    )
                        .into_response(),
                }
            }
        }));

    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel::<()>();

    let runtime = Runtime::new().map_err(|e| format!("Failed to create runtime: {}", e))?;

    let _ = app_handle.emit("portal-server-ready", PortalServerReadyPayload { port });

    runtime.spawn(async move {
        // Not .expect(): [profile.release] sets panic = "abort", so a failure
        // here would kill the whole desktop app rather than just the portal
        // server. try_bind_sequential already guarantees the listener is
        // non-blocking (tokio's from_std panics on a blocking socket), but a
        // portal that fails to start must not be able to take the app with it.
        let listener = match tokio::net::TcpListener::from_std(listener) {
            Ok(l) => l,
            Err(e) => {
                eprintln!("[portal] listener conversion failed, portal disabled: {e}");
                return;
            }
        };
        axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>())
            .with_graceful_shutdown(async {
                let _ = shutdown_rx.await;
            })
            .await
            .ok();
    });

    Ok(ServerHandle { port, shutdown_tx: Some(shutdown_tx), _runtime: runtime })
}

fn try_bind_sequential(ports: &[u16]) -> Result<(std::net::TcpListener, u16), String> {
    // Tokio rejects blocking sockets (panics in from_std on recent
    // versions), so flip every candidate non-blocking before returning it.
    // A blocking listener here used to crash the app on launch.
    for &port in ports {
        if let Ok(listener) = std::net::TcpListener::bind(format!("127.0.0.1:{}", port)) {
            listener
                .set_nonblocking(true)
                .map_err(|e| format!("Failed to configure listener: {}", e))?;
            return Ok((listener, port));
        }
    }
    // Not .unwrap(): same reasoning as the from_std call above, panic = "abort"
    // turns this into an app kill on the fallback path.
    std::net::TcpListener::bind("127.0.0.1:0")
        .map_err(|e| format!("Failed to bind to any port: {}", e))
        .and_then(|listener| {
            let port = listener
                .local_addr()
                .map_err(|e| format!("Failed to read listener address: {}", e))?
                .port();
            Ok((listener, port))
        })
        .map_err(|e| format!("Failed to bind to any port: {}", e))
        .and_then(|(listener, port)| {
            listener
                .set_nonblocking(true)
                .map_err(|e| format!("Failed to configure listener: {}", e))?;
            Ok((listener, port))
        })
}

#[cfg(test)]
mod portal_tests {
    use super::{check_portal_header, MAX_REQUEST_BODY_BYTES};
    use axum::http::{HeaderMap, HeaderValue};

    fn headers_with(value: &str) -> HeaderMap {
        let mut h = HeaderMap::new();
        h.insert("X-Lance-Client", HeaderValue::from_str(value).unwrap());
        h
    }

    /// The anti-CSRF property: a browser cannot forge this cross-origin,
    /// because setting a custom header forces a preflight that this server
    /// never answers. That is the control, and it must not regress.
    #[test]
    fn accepts_exact_header_only() {
        assert!(check_portal_header(&headers_with("portal")));
    }

    #[test]
    fn rejects_missing_wrong_and_near_miss_headers() {
        assert!(!check_portal_header(&HeaderMap::new()), "missing header");
        assert!(!check_portal_header(&headers_with("Portal")), "case differs");
        assert!(!check_portal_header(&headers_with("porta1")), "transposed char");
        assert!(!check_portal_header(&headers_with("portal ")), "trailing space");
        assert!(!check_portal_header(&headers_with(" portal")), "leading space");
        assert!(!check_portal_header(&headers_with("portalx")), "prefix");
        assert!(!check_portal_header(&headers_with("")), "empty");
    }

    /// A 256-bit token is the real secret; the body carries a name, a signature
    /// and one enum. The cap must sit far below what a real request needs.
    #[test]
    fn body_cap_is_generous_for_real_payloads() {
        let realistic = r#"{"response":"accepted","client_name":"Riley Chen","client_signature":"Riley Chen","notes":"Thanks, sending the deposit today."}"#;
        assert!(
            realistic.len() < MAX_REQUEST_BODY_BYTES,
            "a realistic response must fit under the cap"
        );
    }

    #[test]
    fn body_cap_rejects_an_abusive_payload() {
        let abusive = "x".repeat(MAX_REQUEST_BODY_BYTES + 1);
        assert!(abusive.len() > MAX_REQUEST_BODY_BYTES);
    }

    /// Proposal links are freelancer-authored (portfolio, payment URLs), so
    /// safe schemes survive with rel=noopener; dangerous schemes and event
    /// handlers die while the link text is preserved.
    #[test]
    fn links_survive_with_safe_schemes_only() {
        let https = super::sanitize_html(r#"<p>See <a href="https://example.com/work">portfolio</a></p>"#);
        assert!(
            https.contains(r#"<a href="https://example.com/work" rel="noopener">portfolio</a>"#),
            "https link kept with rel: {https}"
        );
        let mailto = super::sanitize_html(r#"<a href="mailto:a@example.com">mail</a>"#);
        assert!(mailto.contains("mailto:a@example.com"), "mailto kept: {mailto}");
        for bad in ["javascript:alert(1)", "data:text/html,<b>x</b>", "vbscript:msgbox(1)"] {
            let out = super::sanitize_html(&format!(r#"<a href="{bad}">click</a>"#));
            assert!(!out.contains("href="), "dangerous scheme stripped ({bad}): {out}");
            assert!(out.contains("click"), "link text survives: {out}");
        }
        let handler = super::sanitize_html(r#"<a href="https://example.com" onclick="alert(1)">x</a>"#);
        assert!(!handler.contains("onclick"), "event handler stripped: {handler}");
    }
}
