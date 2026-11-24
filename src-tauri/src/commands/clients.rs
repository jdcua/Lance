use crate::db::DbState;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize)]
pub struct Client {
    pub id: String,
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub company: Option<String>,
    pub notes: Option<String>,
    pub preferred_currency: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CreateClientPayload {
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub company: Option<String>,
    pub notes: Option<String>,
    pub preferred_currency: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct UpdateClientPayload {
    pub id: String,
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub company: Option<String>,
    pub notes: Option<String>,
    pub preferred_currency: Option<String>,
}

#[tauri::command]
pub fn get_clients(app: tauri::AppHandle) -> Result<Vec<Client>, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, email, phone, company, notes, preferred_currency, created_at FROM clients ORDER BY name",
        )
        .map_err(|_| "Database operation failed".to_string())?;
    let clients = stmt
        .query_map([], |row| {
            Ok(Client {
                id: row.get(0)?,
                name: row.get(1)?,
                email: row.get(2)?,
                phone: row.get(3)?,
                company: row.get(4)?,
                notes: row.get(5)?,
                preferred_currency: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(clients)
}

#[tauri::command]
pub fn get_client(app: tauri::AppHandle, id: String) -> Result<Option<Client>, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, email, phone, company, notes, preferred_currency, created_at FROM clients WHERE id = ?",
        )
        .map_err(|_| "Database operation failed".to_string())?;
    let client = stmt
        .query_row([&id], |row| {
            Ok(Client {
                id: row.get(0)?,
                name: row.get(1)?,
                email: row.get(2)?,
                phone: row.get(3)?,
                company: row.get(4)?,
                notes: row.get(5)?,
                preferred_currency: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .ok();
    Ok(client)
}

#[tauri::command]
pub fn create_client(
    app: tauri::AppHandle,
    payload: CreateClientPayload,
) -> Result<Client, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO clients (id, name, email, phone, company, notes, preferred_currency, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![id, payload.name, payload.email, payload.phone, payload.company, payload.notes, payload.preferred_currency, created_at],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(Client {
        id,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        company: payload.company,
        notes: payload.notes,
        preferred_currency: payload.preferred_currency,
        created_at,
    })
}

#[tauri::command]
pub fn update_client(app: tauri::AppHandle, payload: UpdateClientPayload) -> Result<(), String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    conn.execute(
        "UPDATE clients SET name = ?1, email = ?2, phone = ?3, company = ?4, notes = ?5, preferred_currency = ?6 WHERE id = ?7",
        rusqlite::params![payload.name, payload.email, payload.phone, payload.company, payload.notes, payload.preferred_currency, payload.id],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_client(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    conn.execute("DELETE FROM clients WHERE id = ?", [&id])
        .map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}
