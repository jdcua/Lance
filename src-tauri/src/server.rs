use axum::{
    extract::{Path, State},
    response::Html,
    routing::{get, post},
    Json, Router,
};
use rusqlite::Connection;
use serde::Deserialize;
use std::net::TcpListener;
use tokio::runtime::Runtime;

fn chrono_now() -> String {
    crate::commands::clients::chrono_now()
}

#[derive(Clone)]
pub struct AppState {
    pub db_path: String,
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

#[derive(Debug, Deserialize)]
struct RespondPayload {
    response: String,
    client_name: Option<String>,
    client_signature: Option<String>,
    #[allow(dead_code)]
    message: Option<String>,
}

fn build_portal_html(
    conn: &Connection,
    token: &TokenRecord,
) -> Result<String, String> {
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
            title, body, scope, timeline, rate, rate_type, _created_at,
            client_name, freelancer_name, tagline, currency,
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

        let body_html = body.unwrap_or_default();

        let name_placeholder = token
            .client_name
            .as_deref()
            .unwrap_or(&client_val);

        let action_section = if let Some(resp) = response {
            let resp_date = token
                .client_response_at
                .as_deref()
                .map(format_date)
                .unwrap_or_default();
            let name = token.client_name.as_deref().unwrap_or("Client");
            format!(
                r#"<div class="response-banner {}">
                    <div class="response-icon">{}</div>
                    <div>{} this proposal on {}</div>
                </div>"#,
                resp,
                if resp == "accepted" { "&#10003;" } else { "&#10007;" },
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
                            headers: {{ 'Content-Type': 'application/json' }},
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
<title>{} — Proposal</title>
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
            freelancer, tl, client,
            t, details, body_html,
            action_section,
        ))
    } else {
        // Contract portal
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
        let body_html = body.unwrap_or_default();

        let sign_section = if let Some(ref sig) = token.client_signature {
            let sig_date = token
                .client_signed_at
                .as_deref()
                .map(format_date)
                .unwrap_or_default();
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
                            headers: {{ 'Content-Type': 'application/json' }},
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
<title>{} — Contract</title>
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
            freelancer, tl, client,
            t, body_html,
            sign_section,
        ))
    }
}

fn fallback_page() -> Html<String> {
    Html(
        r#"<!DOCTYPE html>
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
            .to_string(),
    )
}

async fn serve_portal(
    State(state): State<AppState>,
    Path(token): Path<String>,
) -> Html<String> {
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
            return Html(
                r#"<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Expired</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f7;color:#1d1d1f;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center}h1{font-size:20px}p{color:#86868b;font-size:14px}</style></head><body><div><h1>Link Expired</h1><p>This share link has expired. Please contact your freelancer for a new link.</p></div></body></html>"#
                    .to_string(),
            );
        }
    }

    let _ = record_view(&conn, &token);

    match build_portal_html(&conn, &record) {
        Ok(html) => Html(html),
        Err(_) => fallback_page(),
    }
}

async fn handle_respond(
    State(state): State<AppState>,
    Path(token): Path<String>,
    Json(payload): Json<RespondPayload>,
) -> Result<Html<String>, (axum::http::StatusCode, String)> {
    let conn =
        db_connection(&state.db_path).map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e))?;

    let record = find_token(&conn, &token)
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e))?
        .ok_or_else(|| {
            (
                axum::http::StatusCode::NOT_FOUND,
                "Share link not found.".to_string(),
            )
        })?;

    if record.client_response.is_some() {
        return Err((
            axum::http::StatusCode::CONFLICT,
            "You have already responded to this.".to_string(),
        ));
    }

    if let Some(ref exp) = record.expires_at {
        if exp.as_str() < chrono_now().as_str() {
            return Err((
                axum::http::StatusCode::GONE,
                "This share link has expired.".to_string(),
            ));
        }
    }

    let now = chrono_now();

    if record.entity_type == "contract" {
        let sig = payload
            .client_signature
            .as_deref()
            .unwrap_or("Unknown")
            .to_string();
        conn.execute(
            "UPDATE share_tokens SET client_response = 'accepted', client_response_at = ?1, client_signature = ?2, client_signed_at = ?3 WHERE token = ?4",
            rusqlite::params![now, sig, now, token],
        )
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        conn.execute(
            "UPDATE contracts SET signed_at = ?1 WHERE id = ?2",
            rusqlite::params![now, record.entity_id],
        )
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    } else {
        let name = payload
            .client_name
            .as_deref()
            .unwrap_or("Client")
            .to_string();
        conn.execute(
            "UPDATE share_tokens SET client_response = ?1, client_response_at = ?2, client_name = ?3 WHERE token = ?4",
            rusqlite::params![payload.response, now, name, token],
        )
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        if payload.response == "accepted" {
            conn.execute(
                "UPDATE proposals SET status = 'accepted' WHERE id = ?1",
                rusqlite::params![record.entity_id],
            )
            .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        }
    }

    Ok(Html(
        r#"<!DOCTYPE html>
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
        .to_string(),
    ))
}

pub fn start_server(db_path: String) -> Result<ServerHandle, String> {
    let listener =
        TcpListener::bind("127.0.0.1:0").map_err(|e| format!("Failed to bind: {}", e))?;
    let port = listener
        .local_addr()
        .map_err(|e| format!("Failed to get local addr: {}", e))?
        .port();

    let state = AppState { db_path };

    let app = Router::new()
        .route("/share/{token}", get(serve_portal))
        .route("/share/{token}/respond", post(handle_respond))
        .with_state(state);

    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel::<()>();

    let runtime = Runtime::new().map_err(|e| format!("Failed to create runtime: {}", e))?;

    runtime.spawn(async move {
        let listener = tokio::net::TcpListener::from_std(listener)
            .expect("Failed to convert listener");
        axum::serve(listener, app)
            .with_graceful_shutdown(async {
                let _ = shutdown_rx.await;
            })
            .await
            .ok();
    });

    Ok(ServerHandle {
        port,
        shutdown_tx: Some(shutdown_tx),
        _runtime: runtime,
    })
}
