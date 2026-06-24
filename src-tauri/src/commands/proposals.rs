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
    pub expires_at: Option<String>,
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
    pub expires_at: Option<String>,
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
    pub expires_at: Option<String>,
}

#[tauri::command]
pub fn get_proposals(app: AppHandle) -> Result<Vec<Proposal>, String> {
    let conn = db::get_connection(&app)?;
    let mut stmt = conn.prepare("SELECT id, client_id, project_id, title, status, scope, timeline, rate, rate_type, body, sent_at, expires_at, created_at FROM proposals ORDER BY created_at DESC")
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
pub fn get_proposal(app: AppHandle, id: String) -> Result<Option<Proposal>, String> {
    let conn = db::get_connection(&app)?;
    let mut stmt = conn.prepare("SELECT id, client_id, project_id, title, status, scope, timeline, rate, rate_type, body, sent_at, expires_at, created_at FROM proposals WHERE id = ?")
        .map_err(|_| "Database operation failed".to_string())?;
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
                expires_at: row.get(11)?,
                created_at: row.get(12)?,
            })
        })
        .ok())
}

#[tauri::command]
pub fn create_proposal(app: AppHandle, payload: CreateProposalPayload) -> Result<Proposal, String> {
    let conn = db::get_connection(&app)?;
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = super::clients::chrono_now();
    let sent_at = if payload.status == "sent" { Some(created_at.clone()) } else { None };
    conn.execute(
        "INSERT INTO proposals (id, client_id, project_id, title, status, scope, timeline, rate, rate_type, body, sent_at, expires_at, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        rusqlite::params![id, payload.client_id, payload.project_id, payload.title, payload.status, payload.scope, payload.timeline, payload.rate, payload.rate_type, payload.body, sent_at, payload.expires_at, created_at],
    ).map_err(|_| "Database operation failed".to_string())?;
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
        sent_at,
        expires_at: payload.expires_at,
        created_at,
    })
}

#[tauri::command]
pub fn update_proposal(app: AppHandle, payload: UpdateProposalPayload) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    let now = super::clients::chrono_now();
    conn.execute(
        "UPDATE proposals SET client_id = ?1, project_id = ?2, title = ?3, status = ?4, scope = ?5, timeline = ?6, rate = ?7, rate_type = ?8, body = ?9, sent_at = CASE WHEN status = 'sent' AND (SELECT status FROM proposals WHERE id = ?10) != 'sent' THEN ?11 ELSE sent_at END, expires_at = ?12 WHERE id = ?10",
        rusqlite::params![payload.client_id, payload.project_id, payload.title, payload.status, payload.scope, payload.timeline, payload.rate, payload.rate_type, payload.body, payload.id, now, payload.expires_at],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_proposal(app: AppHandle, id: String) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    conn.execute("DELETE FROM proposals WHERE id = ?", [&id])
        .map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExpiredProposal {
    pub id: String,
    pub client_id: String,
    pub title: String,
}

#[tauri::command]
pub fn expire_sent_proposals(app: AppHandle) -> Result<Vec<ExpiredProposal>, String> {
    let conn = db::get_connection(&app)?;
    let now = super::clients::chrono_now();

    let mut stmt = conn
        .prepare("SELECT id, client_id, title FROM proposals WHERE status = 'sent' AND expires_at IS NOT NULL AND expires_at < ?1")
        .map_err(|_| "Database operation failed".to_string())?;

    let expired: Vec<ExpiredProposal> = stmt
        .query_map(rusqlite::params![now], |row| {
            Ok(ExpiredProposal { id: row.get(0)?, client_id: row.get(1)?, title: row.get(2)? })
        })
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect();

    for ep in &expired {
        let _ = conn.execute(
            "UPDATE proposals SET status = 'expired' WHERE id = ?1",
            rusqlite::params![ep.id],
        );
    }

    Ok(expired)
}
