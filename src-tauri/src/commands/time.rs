use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::db;

#[derive(Debug, Serialize, Deserialize)]
pub struct TimeEntry {
    pub id: String,
    pub project_id: String,
    pub client_id: String,
    pub description: Option<String>,
    pub start_time: String,
    pub end_time: Option<String>,
    pub duration_minutes: Option<i64>,
    pub billable: bool,
    pub invoiced: bool,
}

#[derive(Debug, Deserialize)]
pub struct CreateTimeEntryPayload {
    pub project_id: String,
    pub client_id: String,
    pub description: Option<String>,
    pub start_time: String,
    pub billable: bool,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTimeEntryPayload {
    pub id: String,
    pub project_id: String,
    pub client_id: String,
    pub description: Option<String>,
    pub start_time: String,
    pub end_time: Option<String>,
    pub duration_minutes: Option<i64>,
    pub billable: bool,
    pub invoiced: bool,
}

#[tauri::command]
pub fn get_time_entries(app: AppHandle) -> Result<Vec<TimeEntry>, String> {
    let conn = db::get_connection(&app)?;
    let mut stmt = conn.prepare("SELECT id, project_id, client_id, description, start_time, end_time, duration_minutes, billable, invoiced FROM time_entries ORDER BY start_time DESC")
        .map_err(|_| "Database operation failed".to_string())?;
    let entries = stmt
        .query_map([], |row| {
            Ok(TimeEntry {
                id: row.get(0)?,
                project_id: row.get(1)?,
                client_id: row.get(2)?,
                description: row.get(3)?,
                start_time: row.get(4)?,
                end_time: row.get(5)?,
                duration_minutes: row.get(6)?,
                billable: row.get::<_, i32>(7)? != 0,
                invoiced: row.get::<_, i32>(8)? != 0,
            })
        })
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(entries)
}

#[tauri::command]
pub fn get_time_entry(app: AppHandle, id: String) -> Result<Option<TimeEntry>, String> {
    let conn = db::get_connection(&app)?;
    let mut stmt = conn.prepare("SELECT id, project_id, client_id, description, start_time, end_time, duration_minutes, billable, invoiced FROM time_entries WHERE id = ?")
        .map_err(|_| "Database operation failed".to_string())?;
    Ok(stmt
        .query_row([&id], |row| {
            Ok(TimeEntry {
                id: row.get(0)?,
                project_id: row.get(1)?,
                client_id: row.get(2)?,
                description: row.get(3)?,
                start_time: row.get(4)?,
                end_time: row.get(5)?,
                duration_minutes: row.get(6)?,
                billable: row.get::<_, i32>(7)? != 0,
                invoiced: row.get::<_, i32>(8)? != 0,
            })
        })
        .ok())
}

#[tauri::command]
pub fn create_time_entry(
    app: AppHandle,
    payload: CreateTimeEntryPayload,
) -> Result<TimeEntry, String> {
    let conn = db::get_connection(&app)?;
    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO time_entries (id, project_id, client_id, description, start_time, billable, invoiced) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0)",
        rusqlite::params![id, payload.project_id, payload.client_id, payload.description, payload.start_time, payload.billable as i32],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(TimeEntry {
        id,
        project_id: payload.project_id,
        client_id: payload.client_id,
        description: payload.description,
        start_time: payload.start_time,
        end_time: None,
        duration_minutes: None,
        billable: payload.billable,
        invoiced: false,
    })
}

#[tauri::command]
pub fn update_time_entry(app: AppHandle, payload: UpdateTimeEntryPayload) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    conn.execute(
        "UPDATE time_entries SET project_id = ?1, client_id = ?2, description = ?3, start_time = ?4, end_time = ?5, duration_minutes = ?6, billable = ?7, invoiced = ?8 WHERE id = ?9",
        rusqlite::params![payload.project_id, payload.client_id, payload.description, payload.start_time, payload.end_time, payload.duration_minutes, payload.billable as i32, payload.invoiced as i32, payload.id],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_time_entry(app: AppHandle, id: String) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    conn.execute("DELETE FROM time_entries WHERE id = ?", [&id])
        .map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}
