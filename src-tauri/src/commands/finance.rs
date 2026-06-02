use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::db;

#[derive(Debug, Serialize, Deserialize)]
pub struct Expense {
    pub id: String,
    pub category: String,
    pub description: String,
    pub amount: f64,
    pub date: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserProfile {
    pub id: Option<i64>,
    pub name: Option<String>,
    pub email: Option<String>,
    pub hourly_rate: Option<f64>,
    pub currency: String,
    pub writing_voice: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateExpensePayload {
    pub category: String,
    pub description: String,
    pub amount: f64,
    pub date: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateExpensePayload {
    pub id: String,
    pub category: String,
    pub description: String,
    pub amount: f64,
    pub date: String,
}

#[derive(Debug, Deserialize)]
pub struct UpsertProfilePayload {
    pub name: Option<String>,
    pub email: Option<String>,
    pub hourly_rate: Option<f64>,
    pub currency: String,
    pub writing_voice: Option<String>,
}

#[tauri::command]
pub fn get_expenses(app: AppHandle) -> Result<Vec<Expense>, String> {
    let conn = db::get_connection(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, category, description, amount, date FROM expenses ORDER BY date DESC")
        .map_err(|e| e.to_string())?;
    let expenses = stmt
        .query_map([], |row| {
            Ok(Expense {
                id: row.get(0)?,
                category: row.get(1)?,
                description: row.get(2)?,
                amount: row.get(3)?,
                date: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(expenses)
}

#[tauri::command]
pub fn create_expense(app: AppHandle, payload: CreateExpensePayload) -> Result<Expense, String> {
    let conn = db::get_connection(&app)?;
    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO expenses (id, category, description, amount, date) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, payload.category, payload.description, payload.amount, payload.date],
    ).map_err(|e| e.to_string())?;
    Ok(Expense {
        id,
        category: payload.category,
        description: payload.description,
        amount: payload.amount,
        date: payload.date,
    })
}

#[tauri::command]
pub fn update_expense(app: AppHandle, payload: UpdateExpensePayload) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    conn.execute(
        "UPDATE expenses SET category = ?1, description = ?2, amount = ?3, date = ?4 WHERE id = ?5",
        rusqlite::params![
            payload.category,
            payload.description,
            payload.amount,
            payload.date,
            payload.id
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_expense(app: AppHandle, id: String) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    conn.execute("DELETE FROM expenses WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_user_profile(app: AppHandle) -> Result<Option<UserProfile>, String> {
    let conn = db::get_connection(&app)?;
    let mut stmt = conn.prepare("SELECT id, name, email, hourly_rate, currency, writing_voice FROM user_profile WHERE id = 1")
        .map_err(|e| e.to_string())?;
    Ok(stmt
        .query_row([], |row| {
            Ok(UserProfile {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                email: row.get(2)?,
                hourly_rate: row.get(3)?,
                currency: row.get::<_, String>(4).unwrap_or("CAD".to_string()),
                writing_voice: row.get(5)?,
            })
        })
        .ok())
}

#[tauri::command]
pub fn upsert_user_profile(app: AppHandle, payload: UpsertProfilePayload) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    conn.execute(
        "INSERT INTO user_profile (id, name, email, hourly_rate, currency, writing_voice) VALUES (1, ?1, ?2, ?3, ?4, ?5) ON CONFLICT(id) DO UPDATE SET name = ?1, email = ?2, hourly_rate = ?3, currency = ?4, writing_voice = ?5",
        rusqlite::params![payload.name, payload.email, payload.hourly_rate, payload.currency, payload.writing_voice],
    ).map_err(|e| e.to_string())?;
    Ok(())
}
