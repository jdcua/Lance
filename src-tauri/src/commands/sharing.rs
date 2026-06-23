use rand::Rng;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::db;

type ResponseRow = (
    String,
    String,
    String,
    String,
    String,
    Option<String>,
    Option<String>,
);

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ShareToken {
    pub id: i64,
    pub token: String,
    pub entity_type: String,
    pub entity_id: String,
    pub created_at: String,
    pub expires_at: Option<String>,
    pub viewed_at: Option<String>,
    pub view_count: i64,
    pub client_response: Option<String>,
    pub client_response_at: Option<String>,
    pub client_name: Option<String>,
    pub client_signature: Option<String>,
    pub client_signed_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateShareTokenPayload {
    pub entity_type: String,
    pub entity_id: String,
    pub expires_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PortalActivity {
    pub entity_type: String,
    pub entity_id: String,
    pub token: String,
    pub activity: String,
    pub timestamp: String,
}

fn generate_token() -> String {
    let mut rng = rand::thread_rng();
    let chars: Vec<char> = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        .chars()
        .collect();
    (0..32).map(|_| chars[rng.gen_range(0..chars.len())]).collect()
}

#[tauri::command]
pub fn create_share_token(
    app: AppHandle,
    payload: CreateShareTokenPayload,
) -> Result<ShareToken, String> {
    let conn = db::get_connection(&app)?;

    // Check if token already exists for this entity
    let mut stmt = conn
        .prepare(
            "SELECT id, token, entity_type, entity_id, created_at, expires_at, viewed_at,
                    view_count, client_response, client_response_at, client_name,
                    client_signature, client_signed_at
             FROM share_tokens WHERE entity_type = ?1 AND entity_id = ?2",
        )
        .map_err(|_| "Database operation failed".to_string())?;

    if let Ok(existing) = stmt.query_row(rusqlite::params![payload.entity_type, payload.entity_id], |row| {
        Ok(ShareToken {
            id: row.get(0)?,
            token: row.get(1)?,
            entity_type: row.get(2)?,
            entity_id: row.get(3)?,
            created_at: row.get(4)?,
            expires_at: row.get(5)?,
            viewed_at: row.get(6)?,
            view_count: row.get(7)?,
            client_response: row.get(8)?,
            client_response_at: row.get(9)?,
            client_name: row.get(10)?,
            client_signature: row.get(11)?,
            client_signed_at: row.get(12)?,
        })
    }) {
        return Ok(existing);
    }

    let token = generate_token();
    let created_at = super::clients::chrono_now();

    conn.execute(
        "INSERT INTO share_tokens (token, entity_type, entity_id, created_at, expires_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![token, payload.entity_type, payload.entity_id, created_at, payload.expires_at],
    )
    .map_err(|_| "Database operation failed".to_string())?;

    Ok(ShareToken {
        id: 0,
        token,
        entity_type: payload.entity_type,
        entity_id: payload.entity_id,
        created_at,
        expires_at: payload.expires_at,
        viewed_at: None,
        view_count: 0,
        client_response: None,
        client_response_at: None,
        client_name: None,
        client_signature: None,
        client_signed_at: None,
    })
}

#[tauri::command]
pub fn get_share_token(app: AppHandle, token: String) -> Result<Option<ShareToken>, String> {
    let conn = db::get_connection(&app)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, token, entity_type, entity_id, created_at, expires_at, viewed_at,
                    view_count, client_response, client_response_at, client_name,
                    client_signature, client_signed_at
             FROM share_tokens WHERE token = ?1",
        )
        .map_err(|_| "Database operation failed".to_string())?;

    Ok(stmt
        .query_row(rusqlite::params![token], |row| {
            Ok(ShareToken {
                id: row.get(0)?,
                token: row.get(1)?,
                entity_type: row.get(2)?,
                entity_id: row.get(3)?,
                created_at: row.get(4)?,
                expires_at: row.get(5)?,
                viewed_at: row.get(6)?,
                view_count: row.get(7)?,
                client_response: row.get(8)?,
                client_response_at: row.get(9)?,
                client_name: row.get(10)?,
                client_signature: row.get(11)?,
                client_signed_at: row.get(12)?,
            })
        })
        .ok())
}

#[tauri::command]
pub fn get_share_token_for_entity(
    app: AppHandle,
    entity_type: String,
    entity_id: String,
) -> Result<Option<ShareToken>, String> {
    let conn = db::get_connection(&app)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, token, entity_type, entity_id, created_at, expires_at, viewed_at,
                    view_count, client_response, client_response_at, client_name,
                    client_signature, client_signed_at
             FROM share_tokens WHERE entity_type = ?1 AND entity_id = ?2",
        )
        .map_err(|_| "Database operation failed".to_string())?;

    Ok(stmt
        .query_row(rusqlite::params![entity_type, entity_id], |row| {
            Ok(ShareToken {
                id: row.get(0)?,
                token: row.get(1)?,
                entity_type: row.get(2)?,
                entity_id: row.get(3)?,
                created_at: row.get(4)?,
                expires_at: row.get(5)?,
                viewed_at: row.get(6)?,
                view_count: row.get(7)?,
                client_response: row.get(8)?,
                client_response_at: row.get(9)?,
                client_name: row.get(10)?,
                client_signature: row.get(11)?,
                client_signed_at: row.get(12)?,
            })
        })
        .ok())
}

#[tauri::command]
pub fn revoke_share_token(app: AppHandle, token: String) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    conn.execute("DELETE FROM share_tokens WHERE token = ?1", rusqlite::params![token])
        .map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_portal_activity(app: AppHandle) -> Result<Vec<PortalActivity>, String> {
    let conn = db::get_connection(&app)?;
    let mut activities: Vec<PortalActivity> = Vec::new();

    // Views
    let mut stmt = conn
        .prepare(
            "SELECT entity_type, entity_id, token, viewed_at, view_count
             FROM share_tokens WHERE viewed_at IS NOT NULL ORDER BY viewed_at DESC LIMIT 20",
        )
        .map_err(|_| "Database operation failed".to_string())?;

    let rows: Vec<(String, String, String, String, i64)> = stmt
        .query_map([], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
            ))
        })
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect();

    for (et, eid, tok, viewed_at, view_count) in rows {
        let label = if et == "proposal" { "Proposal" } else { "Contract" };
        let name = get_entity_title(&conn, &et, &eid).unwrap_or_default();
        activities.push(PortalActivity {
            entity_type: et,
            entity_id: eid,
            token: tok,
            activity: format!("{} \"{}\" viewed {} times", label, name, view_count),
            timestamp: viewed_at,
        });
    }

    // Responses
    let mut stmt2 = conn
        .prepare(
            "SELECT entity_type, entity_id, token, client_response, client_response_at, client_name, client_signature
             FROM share_tokens WHERE client_response IS NOT NULL ORDER BY client_response_at DESC LIMIT 20",
        )
        .map_err(|_| "Database operation failed".to_string())?;

    let rows2: Vec<ResponseRow> = stmt2
        .query_map([], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
                row.get(6)?,
            ))
        })
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect();

    for (et, eid, tok, resp, resp_at, client_name, client_signature) in rows2 {
        let label = if et == "proposal" { "Proposal" } else { "Contract" };
        let name = get_entity_title(&conn, &et, &eid).unwrap_or_default();
        let activity = if et == "contract" {
            let sig = client_signature.unwrap_or_else(|| "Someone".into());
            format!("Contract \"{}\" signed by {}", name, sig)
        } else {
            let cn = client_name.unwrap_or_else(|| "Client".into());
            format!("{} \"{}\" {} by {}", label, name, resp, cn)
        };
        activities.push(PortalActivity {
            entity_type: et,
            entity_id: eid,
            token: tok,
            activity,
            timestamp: resp_at,
        });
    }

    activities.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

    Ok(activities)
}

fn get_entity_title(conn: &rusqlite::Connection, entity_type: &str, entity_id: &str) -> Option<String> {
    if entity_type == "proposal" {
        conn.query_row(
            "SELECT title FROM proposals WHERE id = ?1",
            rusqlite::params![entity_id],
            |row| row.get(0),
        )
        .ok()
    } else {
        conn.query_row(
            "SELECT title FROM contracts WHERE id = ?1",
            rusqlite::params![entity_id],
            |row| row.get(0),
        )
        .ok()
    }
}

#[tauri::command]
pub fn get_share_server_port(app: AppHandle) -> Result<u16, String> {
    app.try_state::<crate::SharedServerPort>()
        .ok_or("Server port not available".to_string())
        .map(|s| s.port)
}

#[tauri::command]
pub fn get_all_share_tokens(app: AppHandle) -> Result<Vec<ShareToken>, String> {
    let conn = db::get_connection(&app)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, token, entity_type, entity_id, created_at, expires_at, viewed_at,
                    view_count, client_response, client_response_at, client_name,
                    client_signature, client_signed_at
             FROM share_tokens ORDER BY created_at DESC",
        )
        .map_err(|_| "Database operation failed".to_string())?;

    let tokens = stmt
        .query_map([], |row| {
            Ok(ShareToken {
                id: row.get(0)?,
                token: row.get(1)?,
                entity_type: row.get(2)?,
                entity_id: row.get(3)?,
                created_at: row.get(4)?,
                expires_at: row.get(5)?,
                viewed_at: row.get(6)?,
                view_count: row.get(7)?,
                client_response: row.get(8)?,
                client_response_at: row.get(9)?,
                client_name: row.get(10)?,
                client_signature: row.get(11)?,
                client_signed_at: row.get(12)?,
            })
        })
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(tokens)
}
