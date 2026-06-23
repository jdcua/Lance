use crate::commands::clients::chrono_now;
use crate::db;
use serde::{Deserialize, Serialize};

type HeadlineMetricRow = (
    String,
    String,
    String,
    String,
    Option<String>,
    Option<String>,
    Option<String>,
    Option<String>,
    Option<String>,
    Option<String>,
    Option<String>,
    Option<String>,
);

// ── Metric Definition ──

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MetricDefinition {
    pub id: String,
    pub client_id: String,
    pub name: String,
    pub metric_type: String,
    pub unit_label: Option<String>,
    pub is_headline: bool,
    pub sort_order: i32,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateMetricDefinitionPayload {
    pub client_id: String,
    pub name: String,
    pub metric_type: String,
    pub unit_label: Option<String>,
    pub is_headline: Option<bool>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMetricDefinitionPayload {
    pub id: String,
    pub name: String,
    pub metric_type: String,
    pub unit_label: Option<String>,
    pub is_headline: bool,
    pub sort_order: i32,
}

#[tauri::command]
pub fn create_metric_definition(
    app: tauri::AppHandle,
    payload: CreateMetricDefinitionPayload,
) -> Result<MetricDefinition, String> {
    let conn = db::get_connection(&app)?;
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = chrono_now();
    let is_headline = if payload.is_headline.unwrap_or(false) { 1 } else { 0 };
    let sort_order = payload.sort_order.unwrap_or(0);
    conn.execute(
        "INSERT INTO metric_definitions (id, client_id, name, metric_type, unit_label, is_headline, sort_order, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![id, payload.client_id, payload.name, payload.metric_type, payload.unit_label, is_headline, sort_order, created_at],
    )
    .map_err(|_| "Database operation failed".to_string())?;
    Ok(MetricDefinition {
        id,
        client_id: payload.client_id,
        name: payload.name,
        metric_type: payload.metric_type,
        unit_label: payload.unit_label,
        is_headline: payload.is_headline.unwrap_or(false),
        sort_order,
        created_at,
    })
}

#[tauri::command]
pub fn get_metric_definitions(
    app: tauri::AppHandle,
    client_id: String,
) -> Result<Vec<MetricDefinition>, String> {
    let conn = db::get_connection(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, client_id, name, metric_type, unit_label, is_headline, sort_order, created_at FROM metric_definitions WHERE client_id = ? ORDER BY sort_order ASC, created_at ASC")
        .map_err(|_| "Database operation failed".to_string())?;
    let results = stmt
        .query_map([&client_id], |row| {
            Ok(MetricDefinition {
                id: row.get(0)?,
                client_id: row.get(1)?,
                name: row.get(2)?,
                metric_type: row.get(3)?,
                unit_label: row.get(4)?,
                is_headline: row.get::<_, i32>(5)? != 0,
                sort_order: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(results)
}

#[tauri::command]
pub fn update_metric_definition(
    app: tauri::AppHandle,
    payload: UpdateMetricDefinitionPayload,
) -> Result<MetricDefinition, String> {
    let conn = db::get_connection(&app)?;
    let is_headline = if payload.is_headline { 1 } else { 0 };
    conn.execute(
        "UPDATE metric_definitions SET name = ?, metric_type = ?, unit_label = ?, is_headline = ?, sort_order = ? WHERE id = ?",
        rusqlite::params![payload.name, payload.metric_type, payload.unit_label, is_headline, payload.sort_order, payload.id],
    )
    .map_err(|_| "Database operation failed".to_string())?;
    Ok(MetricDefinition {
        id: payload.id.clone(),
        client_id: String::new(),
        name: payload.name,
        metric_type: payload.metric_type,
        unit_label: payload.unit_label,
        is_headline: payload.is_headline,
        sort_order: payload.sort_order,
        created_at: String::new(),
    })
}

#[tauri::command]
pub fn delete_metric_definition(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    conn.execute("DELETE FROM metric_definitions WHERE id = ?", [&id])
        .map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

// ── Metric Values ──

#[derive(Debug, Serialize, Deserialize, Clone)]
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
pub struct LogMetricValuePayload {
    pub definition_id: String,
    pub client_id: String,
    pub value: String,
    pub period: String,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct GetMetricValuesPayload {
    pub definition_id: String,
    pub limit: Option<i32>,
}

#[tauri::command]
pub fn log_metric_value(
    app: tauri::AppHandle,
    payload: LogMetricValuePayload,
) -> Result<MetricValue, String> {
    let conn = db::get_connection(&app)?;
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = chrono_now();
    conn.execute(
        "INSERT INTO metric_values (id, definition_id, client_id, value, period, notes, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![id, payload.definition_id, payload.client_id, payload.value, payload.period, payload.notes, created_at],
    )
    .map_err(|_| "Database operation failed".to_string())?;
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
    limit: Option<i32>,
) -> Result<Vec<MetricValue>, String> {
    let conn = db::get_connection(&app)?;
    let query = if limit.is_some() {
        "SELECT id, definition_id, client_id, value, period, notes, created_at FROM metric_values WHERE definition_id = ? ORDER BY period ASC LIMIT ?"
    } else {
        "SELECT id, definition_id, client_id, value, period, notes, created_at FROM metric_values WHERE definition_id = ? ORDER BY period ASC"
    };
    let mut stmt = conn.prepare(query).map_err(|_| "Database operation failed".to_string())?;
    let limit_val = limit.unwrap_or(i32::MAX);
    let results = stmt
        .query_map(rusqlite::params![&definition_id, limit_val], |row| {
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
    Ok(results)
}

#[tauri::command]
pub fn delete_metric_value(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    conn.execute("DELETE FROM metric_values WHERE id = ?", [&id]).map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

// ── Headline Metrics (for Insights) ──

#[derive(Debug, Serialize, Deserialize)]
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
pub fn get_all_headline_metrics(app: tauri::AppHandle) -> Result<Vec<HeadlineMetric>, String> {
    let conn = db::get_connection(&app)?;
    // Get the last 20 values for each headline definition
    let mut stmt = conn
        .prepare(
            "SELECT d.id, d.client_id, d.name, d.metric_type, d.unit_label,
                    v.id as vid, v.definition_id, v.client_id as vclient, v.value, v.period, v.notes, v.created_at
             FROM metric_definitions d
             LEFT JOIN metric_values v ON v.definition_id = d.id
             WHERE d.is_headline = 1
             ORDER BY d.client_id, d.sort_order, v.period ASC"
        )
        .map_err(|_| "Database operation failed".to_string())?;

    let rows: Vec<HeadlineMetricRow> = stmt
        .query_map([], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
                row.get(6)?,
                row.get(7)?,
                row.get(8)?,
                row.get(9)?,
                row.get(10)?,
                row.get(11)?,
            ))
        })
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // Group values by definition
    let mut grouped: std::collections::BTreeMap<String, HeadlineMetric> =
        std::collections::BTreeMap::new();
    for row in &rows {
        let def_id = &row.0;
        let entry = grouped.entry(def_id.clone()).or_insert_with(|| HeadlineMetric {
            client_id: row.1.clone(),
            client_name: String::new(),
            definition_id: row.0.clone(),
            metric_name: row.2.clone(),
            metric_type: row.3.clone(),
            unit_label: row.4.clone(),
            latest_value: None,
            previous_value: None,
            values: Vec::new(),
        });
        if let Some(value) = &row.8 {
            if let Some(period) = &row.9 {
                entry.values.push(MetricValue {
                    id: row.5.clone().unwrap_or_default(),
                    definition_id: row.6.clone().unwrap_or_default(),
                    client_id: row.7.clone().unwrap_or_default(),
                    value: value.clone(),
                    period: period.clone(),
                    notes: row.10.clone(),
                    created_at: row.11.clone().unwrap_or_default(),
                });
            }
        }
    }

    // Compute latest/previous
    for entry in grouped.values_mut() {
        let len = entry.values.len();
        if len > 0 {
            entry.latest_value = Some(entry.values[len - 1].value.clone());
        }
        if len > 1 {
            entry.previous_value = Some(entry.values[len - 2].value.clone());
        }
    }

    // Get client names
    let client_names: std::collections::HashMap<String, String> = {
        let mut stmt = conn.prepare("SELECT id, name FROM clients").map_err(|_| "Database operation failed".to_string())?;
        let results: Vec<(String, String)> = stmt
            .query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))
            .map_err(|_| "Database operation failed".to_string())?
            .filter_map(|r| r.ok())
            .collect();
        results.into_iter().collect()
    };

    for entry in grouped.values_mut() {
        entry.client_name =
            client_names.get(&entry.client_id).cloned().unwrap_or_else(|| entry.client_id.clone());
    }

    Ok(grouped.into_values().collect())
}

// ── Metric Templates ──

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MetricTemplate {
    pub id: String,
    pub name: String,
    pub definitions_json: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct SaveMetricTemplatePayload {
    pub name: String,
    pub definitions_json: String,
}

#[tauri::command]
pub fn save_metric_template(
    app: tauri::AppHandle,
    payload: SaveMetricTemplatePayload,
) -> Result<MetricTemplate, String> {
    let conn = db::get_connection(&app)?;
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = chrono_now();
    // Upsert by name
    conn.execute("DELETE FROM metric_templates WHERE name = ?", [&payload.name])
        .map_err(|_| "Database operation failed".to_string())?;
    conn.execute(
        "INSERT INTO metric_templates (id, name, definitions_json, created_at) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![id, payload.name, payload.definitions_json, created_at],
    )
    .map_err(|_| "Database operation failed".to_string())?;
    Ok(MetricTemplate {
        id,
        name: payload.name,
        definitions_json: payload.definitions_json,
        created_at,
    })
}

#[tauri::command]
pub fn get_metric_templates(app: tauri::AppHandle) -> Result<Vec<MetricTemplate>, String> {
    let conn = db::get_connection(&app)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, definitions_json, created_at FROM metric_templates ORDER BY name ASC",
        )
        .map_err(|_| "Database operation failed".to_string())?;
    let results = stmt
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
    Ok(results)
}

#[tauri::command]
pub fn delete_metric_template(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    conn.execute("DELETE FROM metric_templates WHERE id = ?", [&id]).map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}
