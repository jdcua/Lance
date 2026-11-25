use crate::db::DbState;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize)]
pub struct Communication {
    pub id: String,
    pub client_id: String,
    pub r#type: String,
    pub summary: String,
    pub date: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CreateCommunicationPayload {
    pub client_id: String,
    pub r#type: String,
    pub summary: String,
    pub date: String,
}

#[tauri::command]
pub fn get_communications(
    app: tauri::AppHandle,
    client_id: Option<String>,
) -> Result<Vec<Communication>, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let (sql, params): (String, Vec<String>) = match client_id {
        Some(id) => (
            "SELECT id, client_id, type, summary, date, created_at FROM communications WHERE client_id = ? ORDER BY date DESC".to_string(),
            vec![id],
        ),
        None => (
            "SELECT id, client_id, type, summary, date, created_at FROM communications ORDER BY date DESC".to_string(),
            vec![],
        ),
    };
    let mut stmt = conn.prepare(&sql).map_err(|_| "Database operation failed".to_string())?;
    let comms = stmt
        .query_map(rusqlite::params_from_iter(params), |row| {
            Ok(Communication {
                id: row.get(0)?,
                client_id: row.get(1)?,
                r#type: row.get(2)?,
                summary: row.get(3)?,
                date: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(comms)
}

#[tauri::command]
pub fn create_communication(
    app: tauri::AppHandle,
    payload: CreateCommunicationPayload,
) -> Result<Communication, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO communications (id, client_id, type, summary, date, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![id, payload.client_id, payload.r#type, payload.summary, payload.date, created_at],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(Communication {
        id,
        client_id: payload.client_id,
        r#type: payload.r#type,
        summary: payload.summary,
        date: payload.date,
        created_at,
    })
}

#[derive(Debug, Deserialize)]
pub struct UpdateCommunicationPayload {
    pub id: String,
    pub summary: String,
}

#[tauri::command]
pub fn update_communication(
    app: tauri::AppHandle,
    payload: UpdateCommunicationPayload,
) -> Result<(), String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    conn.execute(
        "UPDATE communications SET summary = ?1 WHERE id = ?2",
        rusqlite::params![payload.summary, payload.id],
    )
    .map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_communication(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    conn.execute("DELETE FROM communications WHERE id = ?", [&id])
        .map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}
