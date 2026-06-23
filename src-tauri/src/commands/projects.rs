use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::db;

#[derive(Debug, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub client_id: String,
    pub title: String,
    pub status: String,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub budget: Option<f64>,
    pub notes: Option<String>,
    pub color: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Milestone {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub due_date: Option<String>,
    pub completed: bool,
    pub invoice_on_completion: bool,
}

#[derive(Debug, Deserialize)]
pub struct CreateProjectPayload {
    pub client_id: String,
    pub title: String,
    pub status: String,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub budget: Option<f64>,
    pub notes: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProjectPayload {
    pub id: String,
    pub client_id: String,
    pub title: String,
    pub status: String,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub budget: Option<f64>,
    pub notes: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateMilestonePayload {
    pub project_id: String,
    pub title: String,
    pub due_date: Option<String>,
    pub completed: bool,
    pub invoice_on_completion: bool,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMilestonePayload {
    pub id: String,
    pub title: String,
    pub due_date: Option<String>,
    pub completed: bool,
    pub invoice_on_completion: bool,
}

#[tauri::command]
pub fn get_projects(app: AppHandle) -> Result<Vec<Project>, String> {
    let conn = db::get_connection(&app)?;
    let mut stmt = conn.prepare("SELECT id, client_id, title, status, start_date, end_date, budget, notes, color, created_at FROM projects ORDER BY created_at DESC")
        .map_err(|_| "Database operation failed".to_string())?;
    let projects = stmt
        .query_map([], |row| {
            Ok(Project {
                id: row.get(0)?,
                client_id: row.get(1)?,
                title: row.get(2)?,
                status: row.get(3)?,
                start_date: row.get(4)?,
                end_date: row.get(5)?,
                budget: row.get(6)?,
                notes: row.get(7)?,
                color: row.get(8)?,
                created_at: row.get(9)?,
            })
        })
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(projects)
}

#[tauri::command]
pub fn get_project(app: AppHandle, id: String) -> Result<Option<Project>, String> {
    let conn = db::get_connection(&app)?;
    let mut stmt = conn.prepare("SELECT id, client_id, title, status, start_date, end_date, budget, notes, color, created_at FROM projects WHERE id = ?")
        .map_err(|_| "Database operation failed".to_string())?;
    Ok(stmt
        .query_row([&id], |row| {
            Ok(Project {
                id: row.get(0)?,
                client_id: row.get(1)?,
                title: row.get(2)?,
                status: row.get(3)?,
                start_date: row.get(4)?,
                end_date: row.get(5)?,
                budget: row.get(6)?,
                notes: row.get(7)?,
                color: row.get(8)?,
                created_at: row.get(9)?,
            })
        })
        .ok())
}

#[tauri::command]
pub fn create_project(app: AppHandle, payload: CreateProjectPayload) -> Result<Project, String> {
    let conn = db::get_connection(&app)?;
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = super::clients::chrono_now();
    conn.execute(
        "INSERT INTO projects (id, client_id, title, status, start_date, end_date, budget, notes, color, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![id, payload.client_id, payload.title, payload.status, payload.start_date, payload.end_date, payload.budget, payload.notes, payload.color, created_at],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(Project {
        id,
        client_id: payload.client_id,
        title: payload.title,
        status: payload.status,
        start_date: payload.start_date,
        end_date: payload.end_date,
        budget: payload.budget,
        notes: payload.notes,
        color: payload.color,
        created_at,
    })
}

#[tauri::command]
pub fn update_project(app: AppHandle, payload: UpdateProjectPayload) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    conn.execute(
        "UPDATE projects SET client_id = ?1, title = ?2, status = ?3, start_date = ?4, end_date = ?5, budget = ?6, notes = ?7, color = ?8 WHERE id = ?9",
        rusqlite::params![payload.client_id, payload.title, payload.status, payload.start_date, payload.end_date, payload.budget, payload.notes, payload.color, payload.id],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_project(app: AppHandle, id: String) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    conn.execute("DELETE FROM projects WHERE id = ?", [&id])
        .map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_milestones(app: AppHandle, project_id: String) -> Result<Vec<Milestone>, String> {
    let conn = db::get_connection(&app)?;
    let mut stmt = conn.prepare("SELECT id, project_id, title, due_date, completed, invoice_on_completion FROM milestones WHERE project_id = ? ORDER BY title")
        .map_err(|_| "Database operation failed".to_string())?;
    let milestones = stmt
        .query_map([&project_id], |row| {
            Ok(Milestone {
                id: row.get(0)?,
                project_id: row.get(1)?,
                title: row.get(2)?,
                due_date: row.get(3)?,
                completed: row.get::<_, i32>(4)? != 0,
                invoice_on_completion: row.get::<_, i32>(5)? != 0,
            })
        })
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(milestones)
}

#[tauri::command]
pub fn create_milestone(
    app: AppHandle,
    payload: CreateMilestonePayload,
) -> Result<Milestone, String> {
    let conn = db::get_connection(&app)?;
    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO milestones (id, project_id, title, due_date, completed, invoice_on_completion) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![id, payload.project_id, payload.title, payload.due_date, payload.completed as i32, payload.invoice_on_completion as i32],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(Milestone {
        id,
        project_id: payload.project_id,
        title: payload.title,
        due_date: payload.due_date,
        completed: payload.completed,
        invoice_on_completion: payload.invoice_on_completion,
    })
}

#[tauri::command]
pub fn update_milestone(app: AppHandle, payload: UpdateMilestonePayload) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    conn.execute(
        "UPDATE milestones SET title = ?1, due_date = ?2, completed = ?3, invoice_on_completion = ?4 WHERE id = ?5",
        rusqlite::params![payload.title, payload.due_date, payload.completed as i32, payload.invoice_on_completion as i32, payload.id],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_milestone(app: AppHandle, id: String) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    conn.execute("DELETE FROM milestones WHERE id = ?", [&id])
        .map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}
