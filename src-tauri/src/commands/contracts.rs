use crate::db::DbState;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::Manager;

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
#[serde(deny_unknown_fields)]
pub struct CreateContractPayload {
    pub client_id: String,
    pub project_id: Option<String>,
    pub proposal_id: Option<String>,
    pub title: String,
    pub status: Option<String>,
    pub body: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
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
pub fn get_contracts(app: tauri::AppHandle) -> Result<Vec<Contract>, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut stmt = conn
        .prepare("SELECT id, client_id, project_id, proposal_id, title, status, body, signed_at, created_at FROM contracts ORDER BY created_at DESC")
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
pub fn get_contract(app: tauri::AppHandle, id: String) -> Result<Option<Contract>, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut stmt = conn
        .prepare("SELECT id, client_id, project_id, proposal_id, title, status, body, signed_at, created_at FROM contracts WHERE id = ?")
        .map_err(|_| "Database operation failed".to_string())?;
    let contract = stmt
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
        .ok();
    Ok(contract)
}

#[tauri::command]
pub fn create_contract(
    app: tauri::AppHandle,
    payload: CreateContractPayload,
) -> Result<Contract, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();
    let status = payload.status.unwrap_or_else(|| "draft".to_string());
    conn.execute(
        "INSERT INTO contracts (id, client_id, project_id, proposal_id, title, status, body, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![id, payload.client_id, payload.project_id, payload.proposal_id, payload.title, status, payload.body, created_at],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(Contract {
        id,
        client_id: payload.client_id,
        project_id: payload.project_id,
        proposal_id: payload.proposal_id,
        title: payload.title,
        status,
        body: payload.body,
        signed_at: None,
        created_at,
    })
}

#[tauri::command]
pub fn update_contract(
    app: tauri::AppHandle,
    payload: UpdateContractPayload,
) -> Result<(), String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let signed_at = if payload.status == "active" { Some(Utc::now().to_rfc3339()) } else { None };
    conn.execute(
        "UPDATE contracts SET client_id = ?1, project_id = ?2, proposal_id = ?3, title = ?4, status = ?5, body = ?6, signed_at = COALESCE(?7, signed_at) WHERE id = ?8",
        rusqlite::params![payload.client_id, payload.project_id, payload.proposal_id, payload.title, payload.status, payload.body, signed_at, payload.id],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_contract(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    conn.execute("DELETE FROM contracts WHERE id = ?", [&id])
        .map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}
