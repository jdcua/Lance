use crate::db::DbState;
use serde::{Deserialize, Serialize};
use tauri::Manager;

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

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CreateExpensePayload {
    pub category: String,
    pub description: String,
    pub amount: f64,
    pub date: String,
    pub recurring: Option<bool>,
    pub frequency: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct UpdateExpensePayload {
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
    pub currency: Option<String>,
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
    pub custom_archetype_config: Option<String>,
    pub density: Option<String>,
    pub accent_color: Option<String>,
    pub proposal_expiry_days: Option<i64>,
    pub income_target: Option<f64>,
    pub payment_instructions: Option<String>,
    /// Manual exchange rates as a JSON string: {"USD": 1.36} meaning
    /// 1 USD = 1.36 profile-currency units.
    pub exchange_rates: Option<String>,
    pub license_tier: Option<String>,
    pub license_expires_at: Option<String>,
    pub license_validated_at: Option<String>,
    pub license_grace_until: Option<String>,
    pub trial_started_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct UpsertProfilePayload {
    /// Accepted for round-tripping the profile object from the UI, but the
    /// command always targets the singleton row (id = 1).
    pub id: Option<i64>,
    pub name: Option<String>,
    pub email: Option<String>,
    pub hourly_rate: Option<f64>,
    pub currency: Option<String>,
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
    pub custom_archetype_config: Option<String>,
    pub density: Option<String>,
    pub accent_color: Option<String>,
    pub proposal_expiry_days: Option<i64>,
    pub income_target: Option<f64>,
    pub payment_instructions: Option<String>,
    /// Accepts the rates object (browser parity) or a pre-encoded JSON string.
    pub exchange_rates: Option<serde_json::Value>,
    pub license_tier: Option<String>,
    pub license_expires_at: Option<String>,
    pub license_validated_at: Option<String>,
    pub license_grace_until: Option<String>,
    pub trial_started_at: Option<String>,
}

#[tauri::command]
pub fn get_expenses(app: tauri::AppHandle) -> Result<Vec<Expense>, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut stmt = conn
        .prepare("SELECT id, category, description, amount, date, recurring, frequency FROM expenses ORDER BY date DESC")
        .map_err(|_| "Database operation failed".to_string())?;
    let expenses = stmt
        .query_map([], |row| {
            Ok(Expense {
                id: row.get(0)?,
                category: row.get(1)?,
                description: row.get(2)?,
                amount: row.get(3)?,
                date: row.get(4)?,
                recurring: row.get::<_, Option<i32>>(5)?.map(|v| v != 0),
                frequency: row.get(6)?,
            })
        })
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(expenses)
}

#[tauri::command]
pub fn create_expense(
    app: tauri::AppHandle,
    payload: CreateExpensePayload,
) -> Result<Expense, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let id = uuid::Uuid::new_v4().to_string();
    let recurring = payload.recurring.unwrap_or(false) as i32;
    let frequency = payload.frequency.unwrap_or_else(|| "monthly".to_string());
    conn.execute(
        "INSERT INTO expenses (id, category, description, amount, date, recurring, frequency) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![id, payload.category, payload.description, payload.amount, payload.date, recurring, frequency],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(Expense {
        id,
        category: payload.category,
        description: payload.description,
        amount: payload.amount,
        date: payload.date,
        recurring: payload.recurring,
        frequency: Some(frequency),
    })
}

#[tauri::command]
pub fn update_expense(app: tauri::AppHandle, payload: UpdateExpensePayload) -> Result<(), String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let recurring = payload.recurring.unwrap_or(false) as i32;
    let frequency = payload.frequency.unwrap_or_else(|| "monthly".to_string());
    conn.execute(
        "UPDATE expenses SET category = ?1, description = ?2, amount = ?3, date = ?4, recurring = ?5, frequency = ?6 WHERE id = ?7",
        rusqlite::params![payload.category, payload.description, payload.amount, payload.date, recurring, frequency, payload.id],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_expense(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    conn.execute("DELETE FROM expenses WHERE id = ?", [&id])
        .map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_user_profile(app: tauri::AppHandle) -> Result<Option<UserProfile>, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut stmt = conn
        .prepare("SELECT id, name, email, hourly_rate, currency, writing_voice, tax_rate, payment_terms, tagline, always_include, writing_style, theme, license_key, licensed_at, ai_enabled, profession, custom_archetype_config, density, accent_color, proposal_expiry_days, income_target, payment_instructions, exchange_rates, license_tier, license_expires_at, license_validated_at, license_grace_until, trial_started_at FROM user_profile WHERE id = 1")
        .map_err(|_| "Database operation failed".to_string())?;
    let profile = stmt
        .query_row([], |row| {
            Ok(UserProfile {
                id: row.get(0)?,
                name: row.get(1)?,
                email: row.get(2)?,
                hourly_rate: row.get(3)?,
                currency: row.get(4)?,
                writing_voice: row.get(5)?,
                tax_rate: row.get(6)?,
                payment_terms: row.get(7)?,
                tagline: row.get(8)?,
                always_include: row.get(9)?,
                writing_style: row.get(10)?,
                theme: row.get(11)?,
                license_key: row.get(12)?,
                licensed_at: row.get(13)?,
                ai_enabled: row.get::<_, Option<i32>>(14)?.map(|v| v != 0),
                profession: row.get(15)?,
                custom_archetype_config: row.get(16)?,
                density: row.get(17)?,
                accent_color: row.get(18)?,
                proposal_expiry_days: row.get(19)?,
                income_target: row.get(20)?,
                payment_instructions: row.get(21)?,
                exchange_rates: row.get(22)?,
                license_tier: row.get(23)?,
                license_expires_at: row.get(24)?,
                license_validated_at: row.get(25)?,
                license_grace_until: row.get(26)?,
                trial_started_at: row.get(27)?,
            })
        })
        .ok();
    Ok(profile)
}

#[tauri::command]
pub fn upsert_user_profile(
    app: tauri::AppHandle,
    payload: UpsertProfilePayload,
) -> Result<(), String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let ai_enabled = payload.ai_enabled.map(|v| v as i32);
    // Rates arrive as an object (or string); the column stores JSON text.
    let exchange_rates: Option<String> = payload.exchange_rates.as_ref().map(|v| match v {
        serde_json::Value::String(s) => s.clone(),
        _ => v.to_string(),
    });

    let existing: bool = conn
        .query_row("SELECT COUNT(*) FROM user_profile WHERE id = 1", [], |row| row.get::<_, i64>(0))
        .unwrap_or(0)
        > 0;

    if existing {
        conn.execute(
            "UPDATE user_profile SET name = ?1, email = ?2, hourly_rate = ?3, currency = ?4, writing_voice = ?5, tax_rate = ?6, payment_terms = ?7, tagline = ?8, always_include = ?9, writing_style = ?10, theme = ?11, license_key = ?12, licensed_at = ?13, ai_enabled = ?14, profession = ?15, custom_archetype_config = ?16, density = ?17, accent_color = ?18, proposal_expiry_days = ?19, income_target = ?20, payment_instructions = ?21, exchange_rates = ?22, license_tier = ?23, license_expires_at = ?24, license_validated_at = ?25, license_grace_until = ?26, trial_started_at = ?27 WHERE id = 1",
            rusqlite::params![payload.name, payload.email, payload.hourly_rate, payload.currency, payload.writing_voice, payload.tax_rate, payload.payment_terms, payload.tagline, payload.always_include, payload.writing_style, payload.theme, payload.license_key, payload.licensed_at, ai_enabled, payload.profession, payload.custom_archetype_config, payload.density, payload.accent_color, payload.proposal_expiry_days, payload.income_target, payload.payment_instructions, exchange_rates, payload.license_tier, payload.license_expires_at, payload.license_validated_at, payload.license_grace_until, payload.trial_started_at],
        ).map_err(|_| "Database operation failed".to_string())?;
    } else {
        conn.execute(
            "INSERT INTO user_profile (name, email, hourly_rate, currency, writing_voice, tax_rate, payment_terms, tagline, always_include, writing_style, theme, license_key, licensed_at, ai_enabled, profession, custom_archetype_config, density, accent_color, proposal_expiry_days, income_target, payment_instructions, exchange_rates, license_tier, license_expires_at, license_validated_at, license_grace_until, trial_started_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27)",
            rusqlite::params![payload.name, payload.email, payload.hourly_rate, payload.currency, payload.writing_voice, payload.tax_rate, payload.payment_terms, payload.tagline, payload.always_include, payload.writing_style, payload.theme, payload.license_key, payload.licensed_at, ai_enabled, payload.profession, payload.custom_archetype_config, payload.density, payload.accent_color, payload.proposal_expiry_days, payload.income_target, payload.payment_instructions, exchange_rates, payload.license_tier, payload.license_expires_at, payload.license_validated_at, payload.license_grace_until, payload.trial_started_at],
        ).map_err(|_| "Database operation failed".to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn delete_user_profile(app: tauri::AppHandle) -> Result<(), String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    conn.execute("DELETE FROM user_profile WHERE id = 1", [])
        .map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}
