use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::db;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Communication {
    pub id: String,
    pub client_id: String,
    #[serde(rename = "type")]
    pub comm_type: String,
    pub summary: String,
    pub date: String,
    pub created_at: String,
}

#[tauri::command]
pub fn get_communications(app: AppHandle, client_id: String) -> Result<Vec<Communication>, String> {
    let conn = db::get_connection(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, client_id, type, summary, date, created_at FROM communications WHERE client_id = ?1 ORDER BY date DESC")
        .map_err(|_| "Database operation failed".to_string())?;
    let comms = stmt
        .query_map([client_id], |row| {
            Ok(Communication {
                id: row.get(0)?,
                client_id: row.get(1)?,
                comm_type: row.get(2)?,
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
    app: AppHandle,
    payload: Communication,
) -> Result<Communication, String> {
    let conn = db::get_connection(&app)?;
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = super::clients::chrono_now();
    conn.execute(
        "INSERT INTO communications (id, client_id, type, summary, date, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![id, payload.client_id, payload.comm_type, payload.summary, payload.date, created_at],
    )
    .map_err(|_| "Database operation failed".to_string())?;
    Ok(Communication {
        id,
        client_id: payload.client_id,
        comm_type: payload.comm_type,
        summary: payload.summary,
        date: payload.date,
        created_at,
    })
}

#[tauri::command]
pub fn update_communication(app: AppHandle, id: String, summary: String) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    conn.execute(
        "UPDATE communications SET summary = ?1 WHERE id = ?2",
        rusqlite::params![summary, id],
    )
    .map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_communication(app: AppHandle, id: String) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    conn.execute("DELETE FROM communications WHERE id = ?1", [id])
        .map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}
