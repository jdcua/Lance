use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::db;

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
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateProposalPayload {
    pub client_id: String,
    pub project_id: Option<String>,
    pub title: String,
    pub status: String,
    pub scope: Option<String>,
    pub timeline: Option<String>,
    pub rate: Option<f64>,
    pub rate_type: String,
    pub body: Option<String>,
}

#[derive(Debug, Deserialize)]
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
}

#[tauri::command]
pub fn get_proposals(app: AppHandle) -> Result<Vec<Proposal>, String> {
    let conn = db::get_connection(&app)?;
    let mut stmt = conn.prepare("SELECT id, client_id, project_id, title, status, scope, timeline, rate, rate_type, body, sent_at, created_at FROM proposals ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
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
                created_at: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(proposals)
}

#[tauri::command]
pub fn get_proposal(app: AppHandle, id: String) -> Result<Option<Proposal>, String> {
    let conn = db::get_connection(&app)?;
    let mut stmt = conn.prepare("SELECT id, client_id, project_id, title, status, scope, timeline, rate, rate_type, body, sent_at, created_at FROM proposals WHERE id = ?")
        .map_err(|e| e.to_string())?;
    Ok(stmt
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
                created_at: row.get(11)?,
            })
        })
        .ok())
}

#[tauri::command]
pub fn create_proposal(app: AppHandle, payload: CreateProposalPayload) -> Result<Proposal, String> {
    let conn = db::get_connection(&app)?;
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = super::clients::chrono_now();
    conn.execute(
        "INSERT INTO proposals (id, client_id, project_id, title, status, scope, timeline, rate, rate_type, body, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        rusqlite::params![id, payload.client_id, payload.project_id, payload.title, payload.status, payload.scope, payload.timeline, payload.rate, payload.rate_type, payload.body, created_at],
    ).map_err(|e| e.to_string())?;
    Ok(Proposal {
        id,
        client_id: payload.client_id,
        project_id: payload.project_id,
        title: payload.title,
        status: payload.status,
        scope: payload.scope,
        timeline: payload.timeline,
        rate: payload.rate,
        rate_type: payload.rate_type,
        body: payload.body,
        sent_at: None,
        created_at,
    })
}

#[tauri::command]
pub fn update_proposal(app: AppHandle, payload: UpdateProposalPayload) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    let now = super::clients::chrono_now();
    conn.execute(
        "UPDATE proposals SET client_id = ?1, project_id = ?2, title = ?3, status = ?4, scope = ?5, timeline = ?6, rate = ?7, rate_type = ?8, body = ?9, sent_at = CASE WHEN status = 'sent' AND (SELECT status FROM proposals WHERE id = ?10) != 'sent' THEN ?11 ELSE sent_at END WHERE id = ?10",
        rusqlite::params![payload.client_id, payload.project_id, payload.title, payload.status, payload.scope, payload.timeline, payload.rate, payload.rate_type, payload.body, payload.id, now],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_proposal(app: AppHandle, id: String) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    conn.execute("DELETE FROM proposals WHERE id = ?", [&id]).map_err(|e| e.to_string())?;
    Ok(())
}
