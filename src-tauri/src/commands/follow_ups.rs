use crate::db::DbState;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize)]
pub struct FollowUpLog {
    pub id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub stage: i64,
    pub status: String,
    pub drafted_at: String,
    pub actioned_at: Option<String>,
    pub action: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct LogFollowUpPayload {
    pub entity_type: String,
    pub entity_id: String,
    pub stage: i64,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct UpdateFollowUpStatusPayload {
    pub id: String,
    pub status: String,
    pub action: Option<String>,
}

#[tauri::command]
pub fn log_follow_up(
    app: tauri::AppHandle,
    payload: LogFollowUpPayload,
) -> Result<FollowUpLog, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let id = uuid::Uuid::new_v4().to_string();
    let drafted_at = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO follow_up_log (id, entity_type, entity_id, stage, status, drafted_at) VALUES (?1, ?2, ?3, ?4, 'pending', ?5)",
        rusqlite::params![id, payload.entity_type, payload.entity_id, payload.stage, drafted_at],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(FollowUpLog {
        id,
        entity_type: payload.entity_type,
        entity_id: payload.entity_id,
        stage: payload.stage,
        status: "pending".to_string(),
        drafted_at,
        actioned_at: None,
        action: None,
    })
}

#[tauri::command]
pub fn get_follow_up_log(
    app: tauri::AppHandle,
    entity_type: String,
    entity_id: String,
) -> Result<Vec<FollowUpLog>, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut stmt = conn
        .prepare("SELECT id, entity_type, entity_id, stage, status, drafted_at, actioned_at, action FROM follow_up_log WHERE entity_type = ?1 AND entity_id = ?2 ORDER BY drafted_at DESC")
        .map_err(|_| "Database operation failed".to_string())?;
    let logs = stmt
        .query_map(rusqlite::params![entity_type, entity_id], |row| {
            Ok(FollowUpLog {
                id: row.get(0)?,
                entity_type: row.get(1)?,
                entity_id: row.get(2)?,
                stage: row.get(3)?,
                status: row.get(4)?,
                drafted_at: row.get(5)?,
                actioned_at: row.get(6)?,
                action: row.get(7)?,
            })
        })
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(logs)
}

#[tauri::command]
pub fn update_follow_up_status(
    app: tauri::AppHandle,
    payload: UpdateFollowUpStatusPayload,
) -> Result<(), String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE follow_up_log SET status = ?1, actioned_at = ?2, action = ?3 WHERE id = ?4",
        rusqlite::params![payload.status, now, payload.action, payload.id],
    )
    .map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_all_pending_follow_ups(app: tauri::AppHandle) -> Result<Vec<FollowUpLog>, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut stmt = conn
        .prepare("SELECT id, entity_type, entity_id, stage, status, drafted_at, actioned_at, action FROM follow_up_log WHERE status = 'pending' ORDER BY drafted_at DESC")
        .map_err(|_| "Database operation failed".to_string())?;
    let logs = stmt
        .query_map([], |row| {
            Ok(FollowUpLog {
                id: row.get(0)?,
                entity_type: row.get(1)?,
                entity_id: row.get(2)?,
                stage: row.get(3)?,
                status: row.get(4)?,
                drafted_at: row.get(5)?,
                actioned_at: row.get(6)?,
                action: row.get(7)?,
            })
        })
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(logs)
}
