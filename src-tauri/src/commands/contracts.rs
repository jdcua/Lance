use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::db;

#[derive(Debug, Serialize, Deserialize)]
pub struct Contract {
    pub id: String,
    pub client_id: String,
    pub project_id: Option<String>,
    pub proposal_id: Option<String>,
    pub title: String,
    pub status: String,
    pub body: Option<String>,
    pub signed_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateContractPayload {
    pub client_id: String,
    pub project_id: Option<String>,
    pub proposal_id: Option<String>,
    pub title: String,
    pub status: String,
    pub body: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateContractPayload {
    pub id: String,
    pub client_id: String,
    pub project_id: Option<String>,
    pub proposal_id: Option<String>,
    pub title: String,
    pub status: String,
    pub body: Option<String>,
}

#[tauri::command]
pub fn get_contracts(app: AppHandle) -> Result<Vec<Contract>, String> {
    let conn = db::get_connection(&app)?;
    let mut stmt = conn.prepare("SELECT id, client_id, project_id, proposal_id, title, status, body, signed_at, created_at FROM contracts ORDER BY created_at DESC")
        .map_err(|_| "Database operation failed".to_string())?;
    let contracts = stmt
        .query_map([], |row| {
            Ok(Contract {
                id: row.get(0)?,
                client_id: row.get(1)?,
                project_id: row.get(2)?,
                proposal_id: row.get(3)?,
                title: row.get(4)?,
                status: row.get(5)?,
                body: row.get(6)?,
                signed_at: row.get(7)?,
                created_at: row.get(8)?,
            })
        })
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(contracts)
}

#[tauri::command]
pub fn get_contract(app: AppHandle, id: String) -> Result<Option<Contract>, String> {
    let conn = db::get_connection(&app)?;
    let mut stmt = conn.prepare("SELECT id, client_id, project_id, proposal_id, title, status, body, signed_at, created_at FROM contracts WHERE id = ?")
        .map_err(|_| "Database operation failed".to_string())?;
    Ok(stmt
        .query_row([&id], |row| {
            Ok(Contract {
                id: row.get(0)?,
                client_id: row.get(1)?,
                project_id: row.get(2)?,
                proposal_id: row.get(3)?,
                title: row.get(4)?,
                status: row.get(5)?,
                body: row.get(6)?,
                signed_at: row.get(7)?,
                created_at: row.get(8)?,
            })
        })
        .ok())
}

#[tauri::command]
pub fn create_contract(app: AppHandle, payload: CreateContractPayload) -> Result<Contract, String> {
    let conn = db::get_connection(&app)?;
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = super::clients::chrono_now();
    conn.execute(
        "INSERT INTO contracts (id, client_id, project_id, proposal_id, title, status, body, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![id, payload.client_id, payload.project_id, payload.proposal_id, payload.title, payload.status, payload.body, created_at],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(Contract {
        id,
        client_id: payload.client_id,
        project_id: payload.project_id,
        proposal_id: payload.proposal_id,
        title: payload.title,
        status: payload.status,
        body: payload.body,
        signed_at: None,
        created_at,
    })
}

#[tauri::command]
pub fn update_contract(app: AppHandle, payload: UpdateContractPayload) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    let now = super::clients::chrono_now();
    conn.execute(
        "UPDATE contracts SET client_id = ?1, project_id = ?2, proposal_id = ?3, title = ?4, status = ?5, body = ?6, signed_at = CASE WHEN status = 'active' AND (SELECT status FROM contracts WHERE id = ?7) = 'draft' THEN ?8 ELSE signed_at END WHERE id = ?7",
        rusqlite::params![payload.client_id, payload.project_id, payload.proposal_id, payload.title, payload.status, payload.body, payload.id, now],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_contract(app: AppHandle, id: String) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    conn.execute("DELETE FROM contracts WHERE id = ?", [&id]).map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}
