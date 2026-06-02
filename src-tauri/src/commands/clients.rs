use crate::db;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

pub struct DbState(pub Mutex<Connection>);

#[derive(Debug, Serialize, Deserialize)]
pub struct Client {
    pub id: String,
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub company: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateClientPayload {
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub company: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateClientPayload {
    pub id: String,
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub company: Option<String>,
    pub notes: Option<String>,
}

#[tauri::command]
pub fn get_clients(app: tauri::AppHandle) -> Result<Vec<Client>, String> {
    let conn = db::get_connection(&app)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, email, phone, company, notes, created_at FROM clients ORDER BY name",
        )
        .map_err(|e| e.to_string())?;
    let clients = stmt
        .query_map([], |row| {
            Ok(Client {
                id: row.get(0)?,
                name: row.get(1)?,
                email: row.get(2)?,
                phone: row.get(3)?,
                company: row.get(4)?,
                notes: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(clients)
}

#[tauri::command]
pub fn get_client(app: tauri::AppHandle, id: String) -> Result<Option<Client>, String> {
    let conn = db::get_connection(&app)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, email, phone, company, notes, created_at FROM clients WHERE id = ?",
        )
        .map_err(|e| e.to_string())?;
    let client = stmt
        .query_row([&id], |row| {
            Ok(Client {
                id: row.get(0)?,
                name: row.get(1)?,
                email: row.get(2)?,
                phone: row.get(3)?,
                company: row.get(4)?,
                notes: row.get(5)?,
                created_at: row.get(6)?,
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
    let conn = db::get_connection(&app)?;
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = chrono_now();
    conn.execute(
        "INSERT INTO clients (id, name, email, phone, company, notes, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![id, payload.name, payload.email, payload.phone, payload.company, payload.notes, created_at],
    ).map_err(|e| e.to_string())?;
    Ok(Client {
        id,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        company: payload.company,
        notes: payload.notes,
        created_at,
    })
}

#[tauri::command]
pub fn update_client(app: tauri::AppHandle, payload: UpdateClientPayload) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    conn.execute(
        "UPDATE clients SET name = ?1, email = ?2, phone = ?3, company = ?4, notes = ?5 WHERE id = ?6",
        rusqlite::params![payload.name, payload.email, payload.phone, payload.company, payload.notes, payload.id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_client(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    conn.execute("DELETE FROM clients WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn chrono_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;
    let days = now / 86400;
    let secs = now % 86400;
    let hours = secs / 3600;
    let mins = (secs % 3600) / 60;
    let secs = secs % 60;
    let (year, month, day) = days_since_epoch_to_date(days);
    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        year, month, day, hours, mins, secs
    )
}

fn days_since_epoch_to_date(days: i64) -> (i64, i64, i64) {
    let d = days + 719468;
    let era = if d >= 0 { d } else { d - 146096 } / 146097;
    let doe = d - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = if month <= 2 { y + 1 } else { y };
    (year, month, day)
}
