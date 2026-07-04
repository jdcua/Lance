use crate::db::DbState;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize)]
pub struct Proposal {
    pub id: String,
    pub client_id: String,
    pub project_id: Option<String>,
    pub title: String,
    pub status: String,
    pub scope: Option<String>,
    pub timeline: Option<String>,
    pub rate: Option<f64>,
    pub rate_type: String,
    pub body: Option<String>,
    pub sent_at: Option<String>,
    pub expires_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CreateProposalPayload {
    pub client_id: String,
    pub project_id: Option<String>,
    pub title: String,
    pub status: Option<String>,
    pub scope: Option<String>,
    pub timeline: Option<String>,
    pub rate: Option<f64>,
    pub rate_type: Option<String>,
    pub body: Option<String>,
    pub sent_at: Option<String>,
    pub expires_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct UpdateProposalPayload {
    pub id: String,
    pub client_id: String,
    pub project_id: Option<String>,
    pub title: String,
    pub status: String,
    pub scope: Option<String>,
    pub timeline: Option<String>,
    pub rate: Option<f64>,
    pub rate_type: String,
    pub body: Option<String>,
    pub sent_at: Option<String>,
    pub expires_at: Option<String>,
}

#[tauri::command]
pub fn get_proposals(app: tauri::AppHandle) -> Result<Vec<Proposal>, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut stmt = conn
        .prepare("SELECT id, client_id, project_id, title, status, scope, timeline, rate, rate_type, body, sent_at, expires_at, created_at FROM proposals ORDER BY created_at DESC")
        .map_err(|_| "Database operation failed".to_string())?;
    let proposals = stmt
        .query_map([], |row| {
            Ok(Proposal {
                id: row.get(0)?,
                client_id: row.get(1)?,
                project_id: row.get(2)?,
                title: row.get(3)?,
                status: row.get(4)?,
                scope: row.get(5)?,
                timeline: row.get(6)?,
                rate: row.get(7)?,
                rate_type: row.get(8)?,
                body: row.get(9)?,
                sent_at: row.get(10)?,
                expires_at: row.get(11)?,
                created_at: row.get(12)?,
            })
        })
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(proposals)
}

#[tauri::command]
pub fn get_proposal(app: tauri::AppHandle, id: String) -> Result<Option<Proposal>, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut stmt = conn
        .prepare("SELECT id, client_id, project_id, title, status, scope, timeline, rate, rate_type, body, sent_at, expires_at, created_at FROM proposals WHERE id = ?")
        .map_err(|_| "Database operation failed".to_string())?;
    let proposal = stmt
        .query_row([&id], |row| {
            Ok(Proposal {
                id: row.get(0)?,
                client_id: row.get(1)?,
                project_id: row.get(2)?,
                title: row.get(3)?,
                status: row.get(4)?,
                scope: row.get(5)?,
                timeline: row.get(6)?,
                rate: row.get(7)?,
                rate_type: row.get(8)?,
                body: row.get(9)?,
                sent_at: row.get(10)?,
                expires_at: row.get(11)?,
                created_at: row.get(12)?,
            })
        })
        .ok();
    Ok(proposal)
}

#[tauri::command]
pub fn create_proposal(
    app: tauri::AppHandle,
    payload: CreateProposalPayload,
) -> Result<Proposal, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();
    let status = payload.status.unwrap_or_else(|| "draft".to_string());
    let rate_type = payload.rate_type.unwrap_or_else(|| "flat".to_string());
    conn.execute(
        "INSERT INTO proposals (id, client_id, project_id, title, status, scope, timeline, rate, rate_type, body, sent_at, expires_at, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        rusqlite::params![id, payload.client_id, payload.project_id, payload.title, status, payload.scope, payload.timeline, payload.rate, rate_type, payload.body, payload.sent_at, payload.expires_at, created_at],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(Proposal {
        id,
        client_id: payload.client_id,
        project_id: payload.project_id,
        title: payload.title,
        status,
        scope: payload.scope,
        timeline: payload.timeline,
        rate: payload.rate,
        rate_type,
        body: payload.body,
        sent_at: payload.sent_at,
        expires_at: payload.expires_at,
        created_at,
    })
}

#[tauri::command]
pub fn update_proposal(
    app: tauri::AppHandle,
    payload: UpdateProposalPayload,
) -> Result<(), String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    conn.execute(
        "UPDATE proposals SET client_id = ?1, project_id = ?2, title = ?3, status = ?4, scope = ?5, timeline = ?6, rate = ?7, rate_type = ?8, body = ?9, sent_at = ?10, expires_at = ?11 WHERE id = ?12",
        rusqlite::params![payload.client_id, payload.project_id, payload.title, payload.status, payload.scope, payload.timeline, payload.rate, payload.rate_type, payload.body, payload.sent_at, payload.expires_at, payload.id],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_proposal(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    conn.execute("DELETE FROM proposals WHERE id = ?", [&id])
        .map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

#[tauri::command]
pub fn expire_sent_proposals(app: tauri::AppHandle) -> Result<Vec<serde_json::Value>, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE proposals SET status = 'expired' WHERE status = 'sent' AND expires_at IS NOT NULL AND expires_at < ?1",
        rusqlite::params![now],
    )
    .map_err(|_| "Database operation failed".to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, client_id, title FROM proposals WHERE status = 'expired' AND expires_at IS NOT NULL AND expires_at < ?1",
        )
        .map_err(|_| "Database operation failed".to_string())?;
    let expired = stmt
        .query_map([&now], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "client_id": row.get::<_, String>(1)?,
                "title": row.get::<_, String>(2)?,
            }))
        })
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(expired)
}
