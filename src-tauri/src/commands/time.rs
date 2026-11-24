use crate::db::DbState;
use serde::{Deserialize, Serialize};
use tauri::Manager;

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
#[serde(deny_unknown_fields)]
pub struct CreateTimeEntryPayload {
    pub project_id: String,
    pub client_id: String,
    pub description: Option<String>,
    pub start_time: String,
    pub end_time: Option<String>,
    pub duration_minutes: Option<i64>,
    pub billable: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct UpdateTimeEntryPayload {
    pub id: String,
    pub project_id: String,
    pub client_id: String,
    pub description: Option<String>,
    pub start_time: String,
    pub end_time: Option<String>,
    pub duration_minutes: Option<i64>,
    pub billable: bool,
    pub invoiced: Option<bool>,
}

#[tauri::command]
pub fn get_time_entries(app: tauri::AppHandle) -> Result<Vec<TimeEntry>, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut stmt = conn
        .prepare("SELECT id, project_id, client_id, description, start_time, end_time, duration_minutes, billable, invoiced FROM time_entries ORDER BY start_time DESC")
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
pub fn get_time_entry(app: tauri::AppHandle, id: String) -> Result<Option<TimeEntry>, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut stmt = conn
        .prepare("SELECT id, project_id, client_id, description, start_time, end_time, duration_minutes, billable, invoiced FROM time_entries WHERE id = ?")
        .map_err(|_| "Database operation failed".to_string())?;
    let entry = stmt
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
        .ok();
    Ok(entry)
}

#[tauri::command]
pub fn create_time_entry(
    app: tauri::AppHandle,
    payload: CreateTimeEntryPayload,
) -> Result<TimeEntry, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let id = uuid::Uuid::new_v4().to_string();
    let billable = payload.billable.unwrap_or(true) as i32;
    conn.execute(
        "INSERT INTO time_entries (id, project_id, client_id, description, start_time, end_time, duration_minutes, billable, invoiced) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0)",
        rusqlite::params![id, payload.project_id, payload.client_id, payload.description, payload.start_time, payload.end_time, payload.duration_minutes, billable],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(TimeEntry {
        id,
        project_id: payload.project_id,
        client_id: payload.client_id,
        description: payload.description,
        start_time: payload.start_time,
        end_time: payload.end_time,
        duration_minutes: payload.duration_minutes,
        billable: billable != 0,
        invoiced: false,
    })
}

#[tauri::command]
pub fn update_time_entry(
    app: tauri::AppHandle,
    payload: UpdateTimeEntryPayload,
) -> Result<(), String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let billable = payload.billable as i32;
    let invoiced = payload.invoiced.unwrap_or(false) as i32;
    conn.execute(
        "UPDATE time_entries SET project_id = ?1, client_id = ?2, description = ?3, start_time = ?4, end_time = ?5, duration_minutes = ?6, billable = ?7, invoiced = ?8 WHERE id = ?9",
        rusqlite::params![payload.project_id, payload.client_id, payload.description, payload.start_time, payload.end_time, payload.duration_minutes, billable, invoiced, payload.id],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_time_entry(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    conn.execute("DELETE FROM time_entries WHERE id = ?", [&id])
        .map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}
