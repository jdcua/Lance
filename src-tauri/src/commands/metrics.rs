use crate::db::DbState;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize)]
pub struct MetricDefinition {
    pub id: String,
    pub client_id: String,
    pub name: String,
    pub metric_type: String,
    pub unit_label: Option<String>,
    pub is_headline: bool,
    pub sort_order: i64,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CreateMetricDefPayload {
    pub client_id: String,
    pub name: String,
    pub metric_type: Option<String>,
    pub unit_label: Option<String>,
    pub is_headline: Option<bool>,
    pub sort_order: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct UpdateMetricDefPayload {
    pub id: String,
    pub name: String,
    pub metric_type: String,
    pub unit_label: Option<String>,
    pub is_headline: bool,
    pub sort_order: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MetricValue {
    pub id: String,
    pub definition_id: String,
    pub client_id: String,
    pub value: String,
    pub period: String,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct LogMetricValuePayload {
    pub definition_id: String,
    pub client_id: String,
    pub value: String,
    pub period: String,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MetricTemplate {
    pub id: String,
    pub name: String,
    pub definitions_json: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SaveMetricTemplatePayload {
    pub name: String,
    pub definitions_json: String,
}

#[derive(Debug, Serialize)]
pub struct HeadlineMetric {
    pub client_id: String,
    pub client_name: String,
    pub definition_id: String,
    pub metric_name: String,
    pub metric_type: String,
    pub unit_label: Option<String>,
    pub latest_value: Option<String>,
    pub previous_value: Option<String>,
    pub values: Vec<MetricValue>,
}

#[tauri::command]
pub fn create_metric_definition(
    app: tauri::AppHandle,
    payload: CreateMetricDefPayload,
) -> Result<MetricDefinition, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();
    let metric_type = payload.metric_type.unwrap_or_else(|| "number".to_string());
    let is_headline = if payload.is_headline.unwrap_or(false) { 1 } else { 0 };
    let sort_order = payload.sort_order.unwrap_or(0);
    conn.execute(
        "INSERT INTO metric_definitions (id, client_id, name, metric_type, unit_label, is_headline, sort_order, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![id, payload.client_id, payload.name, metric_type, payload.unit_label, is_headline, sort_order, created_at],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(MetricDefinition {
        id,
        client_id: payload.client_id,
        name: payload.name,
        metric_type,
        unit_label: payload.unit_label,
        is_headline: is_headline != 0,
        sort_order,
        created_at,
    })
}

#[tauri::command]
pub fn get_all_metric_definitions(app: tauri::AppHandle) -> Result<Vec<MetricDefinition>, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut stmt = conn
        .prepare("SELECT id, client_id, name, metric_type, unit_label, is_headline, sort_order, created_at FROM metric_definitions ORDER BY sort_order ASC, created_at ASC")
        .map_err(|_| "Database operation failed".to_string())?;
    let defs = stmt
        .query_map(rusqlite::params![], |row| {
            Ok(MetricDefinition {
                id: row.get(0)?,
                client_id: row.get(1)?,
                name: row.get(2)?,
                metric_type: row.get(3)?,
                unit_label: row.get(4)?,
                is_headline: row.get::<_, i64>(5)? != 0,
                sort_order: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(defs)
}

#[tauri::command]
pub fn get_metric_definitions(
    app: tauri::AppHandle,
    client_id: String,
) -> Result<Vec<MetricDefinition>, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut stmt = conn
        .prepare("SELECT id, client_id, name, metric_type, unit_label, is_headline, sort_order, created_at FROM metric_definitions WHERE client_id = ? ORDER BY sort_order ASC, created_at ASC")
        .map_err(|_| "Database operation failed".to_string())?;
    let defs = stmt
        .query_map([&client_id], |row| {
            Ok(MetricDefinition {
                id: row.get(0)?,
                client_id: row.get(1)?,
                name: row.get(2)?,
                metric_type: row.get(3)?,
                unit_label: row.get(4)?,
                is_headline: row.get::<_, i64>(5)? != 0,
                sort_order: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(defs)
}

#[tauri::command]
pub fn update_metric_definition(
    app: tauri::AppHandle,
    payload: UpdateMetricDefPayload,
) -> Result<(), String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let is_headline = if payload.is_headline { 1 } else { 0 };
    conn.execute(
        "UPDATE metric_definitions SET name = ?1, metric_type = ?2, unit_label = ?3, is_headline = ?4, sort_order = ?5 WHERE id = ?6",
        rusqlite::params![payload.name, payload.metric_type, payload.unit_label, is_headline, payload.sort_order, payload.id],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_metric_definition(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    conn.execute("DELETE FROM metric_definitions WHERE id = ?", [&id])
        .map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

#[tauri::command]
pub fn log_metric_value(
    app: tauri::AppHandle,
    payload: LogMetricValuePayload,
) -> Result<MetricValue, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO metric_values (id, definition_id, client_id, value, period, notes, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![id, payload.definition_id, payload.client_id, payload.value, payload.period, payload.notes, created_at],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(MetricValue {
        id,
        definition_id: payload.definition_id,
        client_id: payload.client_id,
        value: payload.value,
        period: payload.period,
        notes: payload.notes,
        created_at,
    })
}

#[tauri::command]
pub fn get_metric_values(
    app: tauri::AppHandle,
    definition_id: String,
    limit: Option<i64>,
) -> Result<Vec<MetricValue>, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    // `limit` is interpolated rather than bound because SQLite will not accept a
    // parameter there. It is an i64, so it cannot carry SQL, but it IS
    // renderer-supplied and unbounded: LIMIT -1 means "no limit" and i64::MAX
    // asks SQLite to plan an enormous result. Clamp it.
    const MAX_LIMIT: i64 = 1000;
    let capped = limit.map(|l| l.clamp(1, MAX_LIMIT)).unwrap_or(MAX_LIMIT);
    let query = format!(
        "SELECT id, definition_id, client_id, value, period, notes, created_at FROM metric_values WHERE definition_id = ? ORDER BY created_at DESC LIMIT {}",
        capped
    );
    let mut stmt = conn.prepare(&query).map_err(|_| "Database operation failed".to_string())?;
    let values = stmt
        .query_map([&definition_id], |row| {
            Ok(MetricValue {
                id: row.get(0)?,
                definition_id: row.get(1)?,
                client_id: row.get(2)?,
                value: row.get(3)?,
                period: row.get(4)?,
                notes: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(values)
}

#[tauri::command]
pub fn delete_metric_value(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    conn.execute("DELETE FROM metric_values WHERE id = ?", [&id])
        .map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

type HeadlineRow = (String, String, String, String, Option<String>, Option<String>);

#[tauri::command]
pub fn get_all_headline_metrics(app: tauri::AppHandle) -> Result<Vec<HeadlineMetric>, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut stmt = conn
        .prepare("SELECT md.id, md.client_id, md.name, md.metric_type, md.unit_label, c.name as client_name FROM metric_definitions md LEFT JOIN clients c ON md.client_id = c.id WHERE md.is_headline = 1 ORDER BY c.name, md.sort_order")
        .map_err(|_| "Database operation failed".to_string())?;
    let rows: Vec<HeadlineRow> = stmt
        .query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?, row.get(5)?))
        })
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let mut result = Vec::new();
    for (def_id, client_id, name, metric_type, unit_label, client_name) in rows {
        let mut vstmt = conn
            .prepare("SELECT id, definition_id, client_id, value, period, notes, created_at FROM metric_values WHERE definition_id = ? ORDER BY created_at DESC LIMIT 2")
            .map_err(|_| "Database operation failed".to_string())?;
        let values: Vec<MetricValue> = vstmt
            .query_map([&def_id], |row| {
                Ok(MetricValue {
                    id: row.get(0)?,
                    definition_id: row.get(1)?,
                    client_id: row.get(2)?,
                    value: row.get(3)?,
                    period: row.get(4)?,
                    notes: row.get(5)?,
                    created_at: row.get(6)?,
                })
            })
            .map_err(|_| "Database operation failed".to_string())?
            .filter_map(|r| r.ok())
            .collect();

        let latest = values.first().map(|v| v.value.clone());
        let previous = values.get(1).map(|v| v.value.clone());

        result.push(HeadlineMetric {
            client_id,
            client_name: client_name.unwrap_or_else(|| "Unknown".to_string()),
            definition_id: def_id,
            metric_name: name,
            metric_type,
            unit_label,
            latest_value: latest,
            previous_value: previous,
            values,
        });
    }
    Ok(result)
}

#[tauri::command]
pub fn save_metric_template(
    app: tauri::AppHandle,
    payload: SaveMetricTemplatePayload,
) -> Result<(), String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();
    let _ = conn.execute("DELETE FROM metric_templates WHERE name = ?", [&payload.name]);
    conn.execute(
        "INSERT INTO metric_templates (id, name, definitions_json, created_at) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![id, payload.name, payload.definitions_json, created_at],
    )
    .map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_metric_templates(app: tauri::AppHandle) -> Result<Vec<MetricTemplate>, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut stmt = conn
        .prepare("SELECT id, name, definitions_json, created_at FROM metric_templates ORDER BY created_at DESC")
        .map_err(|_| "Database operation failed".to_string())?;
    let templates = stmt
        .query_map([], |row| {
            Ok(MetricTemplate {
                id: row.get(0)?,
                name: row.get(1)?,
                definitions_json: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(templates)
}

#[tauri::command]
pub fn delete_metric_template(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    conn.execute("DELETE FROM metric_templates WHERE id = ?", [&id])
        .map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}
