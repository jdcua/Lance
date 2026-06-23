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
    pub recurring: Option<bool>,
    pub frequency: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserProfile {
    pub id: Option<i64>,
    pub name: Option<String>,
    pub email: Option<String>,
    pub hourly_rate: Option<f64>,
    pub currency: String,
    pub writing_voice: Option<String>,
    pub tax_rate: Option<f64>,
    pub payment_terms: Option<i64>,
    pub tagline: Option<String>,
    pub always_include: Option<String>,
    pub writing_style: Option<String>,
    pub theme: Option<String>,
    pub license_key: Option<String>,
    pub licensed_at: Option<String>,
    pub ai_enabled: Option<bool>,
    pub profession: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateExpensePayload {
    pub category: String,
    pub description: String,
    pub amount: f64,
    pub date: String,
    #[serde(default)]
    pub recurring: Option<bool>,
    #[serde(default)]
    pub frequency: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateExpensePayload {
    pub id: String,
    pub category: String,
    pub description: String,
    pub amount: f64,
    pub date: String,
    #[serde(default)]
    pub recurring: Option<bool>,
    #[serde(default)]
    pub frequency: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpsertProfilePayload {
    pub name: Option<String>,
    pub email: Option<String>,
    pub hourly_rate: Option<f64>,
    pub currency: String,
    pub writing_voice: Option<String>,
    pub tax_rate: Option<f64>,
    pub payment_terms: Option<i64>,
    pub tagline: Option<String>,
    pub always_include: Option<String>,
    pub writing_style: Option<String>,
    pub theme: Option<String>,
    pub license_key: Option<String>,
    pub licensed_at: Option<String>,
    pub ai_enabled: Option<bool>,
    pub profession: Option<String>,
}

#[tauri::command]
pub fn get_expenses(app: AppHandle) -> Result<Vec<Expense>, String> {
    let conn = db::get_connection(&app)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, category, description, amount, date, recurring, frequency FROM expenses ORDER BY date DESC",
        )
        .map_err(|e| e.to_string())?;
    let expenses = stmt
        .query_map([], |row| {
            Ok(Expense {
                id: row.get(0)?,
                category: row.get(1)?,
                description: row.get(2)?,
                amount: row.get(3)?,
                date: row.get(4)?,
                recurring: row.get::<_, Option<bool>>(5)?,
                frequency: row.get(6)?,
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
    let recurring_int = payload.recurring.map(|v| if v { 1 } else { 0 });
    conn.execute(
        "INSERT INTO expenses (id, category, description, amount, date, recurring, frequency) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![id, payload.category, payload.description, payload.amount, payload.date, recurring_int, payload.frequency],
    )
    .map_err(|e| e.to_string())?;
    Ok(Expense {
        id,
        category: payload.category,
        description: payload.description,
        amount: payload.amount,
        date: payload.date,
        recurring: payload.recurring,
        frequency: payload.frequency,
    })
}

#[tauri::command]
pub fn update_expense(app: AppHandle, payload: UpdateExpensePayload) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    let recurring_int = payload.recurring.map(|v| if v { 1 } else { 0 });
    conn.execute(
        "UPDATE expenses SET category = ?1, description = ?2, amount = ?3, date = ?4, recurring = ?5, frequency = ?6 WHERE id = ?7",
        rusqlite::params![payload.category, payload.description, payload.amount, payload.date, recurring_int, payload.frequency, payload.id],
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
    let mut stmt = conn.prepare("SELECT id, name, email, hourly_rate, currency, writing_voice, tax_rate, payment_terms, tagline, always_include, writing_style, theme, license_key, licensed_at, ai_enabled, profession FROM user_profile WHERE id = 1")
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
                tax_rate: row.get(6)?,
                payment_terms: row.get(7)?,
                tagline: row.get(8)?,
                always_include: row.get(9)?,
                writing_style: row.get(10)?,
                theme: row.get(11)?,
                license_key: row.get(12)?,
                licensed_at: row.get(13)?,
                ai_enabled: row.get::<_, Option<i64>>(14)?.map(|v| v != 0),
                profession: row.get(15)?,
            })
        })
        .ok())
}

#[tauri::command]
pub fn upsert_user_profile(app: AppHandle, payload: UpsertProfilePayload) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    let ai_enabled_int = payload.ai_enabled.map(|v| if v { 1 } else { 0 });
    conn.execute(
        "INSERT INTO user_profile (id, name, email, hourly_rate, currency, writing_voice, tax_rate, payment_terms, tagline, always_include, writing_style, theme, license_key, licensed_at, ai_enabled, profession) VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15) ON CONFLICT(id) DO UPDATE SET name = ?1, email = ?2, hourly_rate = ?3, currency = ?4, writing_voice = ?5, tax_rate = ?6, payment_terms = ?7, tagline = ?8, always_include = ?9, writing_style = ?10, theme = ?11, license_key = ?12, licensed_at = ?13, ai_enabled = ?14, profession = ?15",
        rusqlite::params![payload.name, payload.email, payload.hourly_rate, payload.currency, payload.writing_voice, payload.tax_rate, payload.payment_terms, payload.tagline, payload.always_include, payload.writing_style, payload.theme, payload.license_key, payload.licensed_at, ai_enabled_int, payload.profession],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_user_profile(app: AppHandle) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    conn.execute("DELETE FROM user_profile", [])
        .map_err(|e| e.to_string())?;
    Ok(())
}
