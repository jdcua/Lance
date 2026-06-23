use crate::commands::clients::chrono_now;
use crate::db;
use serde::{Deserialize, Serialize};

fn validate_string_len(s: &Option<String>, max: usize, field: &str) -> Result<(), String> {
    if let Some(ref val) = s {
        if val.len() > max {
            return Err(format!("{} exceeds maximum length of {}", field, max));
        }
    }
    Ok(())
}

fn validate_required_len(s: &str, max: usize, field: &str) -> Result<(), String> {
    if s.len() > max {
        return Err(format!("{} exceeds maximum length of {}", field, max));
    }
    Ok(())
}

// ── Render Log ──

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ArchetypeRenderLog {
    pub id: String,
    pub project_id: String,
    pub pass_name: Option<String>,
    pub duration_minutes: Option<i64>,
    pub software: Option<String>,
    pub frame_range: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateRenderLogPayload {
    pub project_id: String,
    pub pass_name: Option<String>,
    pub duration_minutes: Option<i64>,
    pub software: Option<String>,
    pub frame_range: Option<String>,
    pub notes: Option<String>,
}

#[tauri::command]
pub fn get_render_logs(
    app: tauri::AppHandle,
    project_id: String,
) -> Result<Vec<ArchetypeRenderLog>, String> {
    let conn = db::get_connection(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, project_id, pass_name, duration_minutes, software, frame_range, notes, created_at FROM archetype_render_log WHERE project_id = ?1 ORDER BY created_at DESC")
        .map_err(|_| "Database operation failed".to_string())?;
    let rows = stmt
        .query_map([&project_id], |row| {
            Ok(ArchetypeRenderLog {
                id: row.get(0)?,
                project_id: row.get(1)?,
                pass_name: row.get(2)?,
                duration_minutes: row.get(3)?,
                software: row.get(4)?,
                frame_range: row.get(5)?,
                notes: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect::<Vec<_>>();
    Ok(rows)
}

#[tauri::command]
pub fn create_render_log(
    app: tauri::AppHandle,
    payload: CreateRenderLogPayload,
) -> Result<ArchetypeRenderLog, String> {
    validate_required_len(&payload.project_id, 512, "project_id")?;
    validate_string_len(&payload.pass_name, 512, "pass_name")?;
    validate_string_len(&payload.software, 512, "software")?;
    validate_string_len(&payload.frame_range, 512, "frame_range")?;
    validate_string_len(&payload.notes, 10000, "notes")?;
    let conn = db::get_connection(&app)?;
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = chrono_now();
    conn.execute(
        "INSERT INTO archetype_render_log (id, project_id, pass_name, duration_minutes, software, frame_range, notes, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![id, payload.project_id, payload.pass_name, payload.duration_minutes, payload.software, payload.frame_range, payload.notes, created_at],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(ArchetypeRenderLog {
        id,
        project_id: payload.project_id,
        pass_name: payload.pass_name,
        duration_minutes: payload.duration_minutes,
        software: payload.software,
        frame_range: payload.frame_range,
        notes: payload.notes,
        created_at,
    })
}

#[tauri::command]
pub fn delete_render_log(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    conn.execute("DELETE FROM archetype_render_log WHERE id = ?", [&id])
        .map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

// ── Sessions ──

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ArchetypeSession {
    pub id: String,
    pub client_id: String,
    pub project_id: Option<String>,
    pub session_type: Option<String>,
    pub duration_minutes: Option<i64>,
    pub notes: Option<String>,
    pub action_items: Option<String>,
    pub next_session_date: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateSessionPayload {
    pub client_id: String,
    pub project_id: Option<String>,
    pub session_type: Option<String>,
    pub duration_minutes: Option<i64>,
    pub notes: Option<String>,
    pub action_items: Option<String>,
    pub next_session_date: Option<String>,
}

#[tauri::command]
pub fn get_sessions(
    app: tauri::AppHandle,
    client_id: Option<String>,
    project_id: Option<String>,
) -> Result<Vec<ArchetypeSession>, String> {
    let conn = db::get_connection(&app)?;
    if let Some(ref pid) = project_id {
        let mut stmt = conn.prepare("SELECT id, client_id, project_id, session_type, duration_minutes, notes, action_items, next_session_date, created_at FROM archetype_sessions WHERE project_id = ?1 ORDER BY created_at DESC").map_err(|_| "Database operation failed".to_string())?;
        let rows: Vec<ArchetypeSession> = stmt.query_map([pid], |row| {
            Ok(ArchetypeSession {
                id: row.get(0)?,
                client_id: row.get(1)?,
                project_id: row.get(2)?,
                session_type: row.get(3)?,
                duration_minutes: row.get(4)?,
                notes: row.get(5)?,
                action_items: row.get(6)?,
                next_session_date: row.get(7)?,
                created_at: row.get(8)?,
            })
        })
        .map_err(|_| "Database operation failed".to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Database operation failed".to_string())?;
        Ok(rows)
    } else if let Some(ref cid) = client_id {
        let mut stmt = conn.prepare("SELECT id, client_id, project_id, session_type, duration_minutes, notes, action_items, next_session_date, created_at FROM archetype_sessions WHERE client_id = ?1 ORDER BY created_at DESC").map_err(|_| "Database operation failed".to_string())?;
        let rows: Vec<ArchetypeSession> = stmt.query_map([cid], |row| {
            Ok(ArchetypeSession {
                id: row.get(0)?,
                client_id: row.get(1)?,
                project_id: row.get(2)?,
                session_type: row.get(3)?,
                duration_minutes: row.get(4)?,
                notes: row.get(5)?,
                action_items: row.get(6)?,
                next_session_date: row.get(7)?,
                created_at: row.get(8)?,
            })
        })
        .map_err(|_| "Database operation failed".to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Database operation failed".to_string())?;
        Ok(rows)
    } else {
        let mut stmt = conn.prepare("SELECT id, client_id, project_id, session_type, duration_minutes, notes, action_items, next_session_date, created_at FROM archetype_sessions ORDER BY created_at DESC").map_err(|_| "Database operation failed".to_string())?;
        let rows: Vec<ArchetypeSession> = stmt.query_map([], |row| {
            Ok(ArchetypeSession {
                id: row.get(0)?,
                client_id: row.get(1)?,
                project_id: row.get(2)?,
                session_type: row.get(3)?,
                duration_minutes: row.get(4)?,
                notes: row.get(5)?,
                action_items: row.get(6)?,
                next_session_date: row.get(7)?,
                created_at: row.get(8)?,
            })
        })
        .map_err(|_| "Database operation failed".to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Database operation failed".to_string())?;
        Ok(rows)
    }
}

#[tauri::command]
pub fn create_session(
    app: tauri::AppHandle,
    payload: CreateSessionPayload,
) -> Result<ArchetypeSession, String> {
    validate_required_len(&payload.client_id, 512, "client_id")?;
    validate_string_len(&payload.project_id, 512, "project_id")?;
    validate_string_len(&payload.session_type, 512, "session_type")?;
    validate_string_len(&payload.notes, 10000, "notes")?;
    validate_string_len(&payload.action_items, 10000, "action_items")?;
    validate_string_len(&payload.next_session_date, 512, "next_session_date")?;
    let conn = db::get_connection(&app)?;
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = chrono_now();
    conn.execute(
        "INSERT INTO archetype_sessions (id, client_id, project_id, session_type, duration_minutes, notes, action_items, next_session_date, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        rusqlite::params![id, payload.client_id, payload.project_id, payload.session_type, payload.duration_minutes, payload.notes, payload.action_items, payload.next_session_date, created_at],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(ArchetypeSession {
        id,
        client_id: payload.client_id,
        project_id: payload.project_id,
        session_type: payload.session_type,
        duration_minutes: payload.duration_minutes,
        notes: payload.notes,
        action_items: payload.action_items,
        next_session_date: payload.next_session_date,
        created_at,
    })
}

#[tauri::command]
pub fn delete_session(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    conn.execute("DELETE FROM archetype_sessions WHERE id = ?", [&id])
        .map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

// ── Shoots ──

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ArchetypeShoot {
    pub id: String,
    pub project_id: String,
    pub shoot_date: Option<String>,
    pub location: Option<String>,
    pub shoot_type: Option<String>,
    pub camera_system: Option<String>,
    pub hours_on_location: Option<f64>,
    pub conditions_notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateShootPayload {
    pub project_id: String,
    pub shoot_date: Option<String>,
    pub location: Option<String>,
    pub shoot_type: Option<String>,
    pub camera_system: Option<String>,
    pub hours_on_location: Option<f64>,
    pub conditions_notes: Option<String>,
}

#[tauri::command]
pub fn get_shoots(
    app: tauri::AppHandle,
    project_id: String,
) -> Result<Vec<ArchetypeShoot>, String> {
    let conn = db::get_connection(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, project_id, shoot_date, location, shoot_type, camera_system, hours_on_location, conditions_notes, created_at FROM archetype_shoots WHERE project_id = ?1 ORDER BY shoot_date DESC")
        .map_err(|_| "Database operation failed".to_string())?;
    let rows = stmt
        .query_map([&project_id], |row| {
            Ok(ArchetypeShoot {
                id: row.get(0)?,
                project_id: row.get(1)?,
                shoot_date: row.get(2)?,
                location: row.get(3)?,
                shoot_type: row.get(4)?,
                camera_system: row.get(5)?,
                hours_on_location: row.get(6)?,
                conditions_notes: row.get(7)?,
                created_at: row.get(8)?,
            })
        })
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect::<Vec<_>>();
    Ok(rows)
}

#[tauri::command]
pub fn create_shoot(
    app: tauri::AppHandle,
    payload: CreateShootPayload,
) -> Result<ArchetypeShoot, String> {
    validate_required_len(&payload.project_id, 512, "project_id")?;
    validate_string_len(&payload.shoot_date, 512, "shoot_date")?;
    validate_string_len(&payload.location, 512, "location")?;
    validate_string_len(&payload.shoot_type, 512, "shoot_type")?;
    validate_string_len(&payload.camera_system, 512, "camera_system")?;
    validate_string_len(&payload.conditions_notes, 10000, "conditions_notes")?;
    let conn = db::get_connection(&app)?;
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = chrono_now();
    conn.execute(
        "INSERT INTO archetype_shoots (id, project_id, shoot_date, location, shoot_type, camera_system, hours_on_location, conditions_notes, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        rusqlite::params![id, payload.project_id, payload.shoot_date, payload.location, payload.shoot_type, payload.camera_system, payload.hours_on_location, payload.conditions_notes, created_at],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(ArchetypeShoot {
        id,
        project_id: payload.project_id,
        shoot_date: payload.shoot_date,
        location: payload.location,
        shoot_type: payload.shoot_type,
        camera_system: payload.camera_system,
        hours_on_location: payload.hours_on_location,
        conditions_notes: payload.conditions_notes,
        created_at,
    })
}

#[tauri::command]
pub fn delete_shoot(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    conn.execute("DELETE FROM archetype_shoots WHERE id = ?", [&id]).map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

// ── Revisions ──

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ArchetypeRevision {
    pub id: String,
    pub project_id: String,
    pub round_number: i64,
    pub change_summary: Option<String>,
    pub approved: bool,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateRevisionPayload {
    pub project_id: String,
    pub round_number: i64,
    pub change_summary: Option<String>,
    pub approved: Option<bool>,
}

#[tauri::command]
pub fn get_revisions(
    app: tauri::AppHandle,
    project_id: String,
) -> Result<Vec<ArchetypeRevision>, String> {
    let conn = db::get_connection(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, project_id, round_number, change_summary, approved, created_at FROM archetype_revisions WHERE project_id = ?1 ORDER BY round_number DESC")
        .map_err(|_| "Database operation failed".to_string())?;
    let rows = stmt
        .query_map([&project_id], |row| {
            Ok(ArchetypeRevision {
                id: row.get(0)?,
                project_id: row.get(1)?,
                round_number: row.get(2)?,
                change_summary: row.get(3)?,
                approved: row.get::<_, i64>(4)? != 0,
                created_at: row.get(5)?,
            })
        })
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect::<Vec<_>>();
    Ok(rows)
}

#[tauri::command]
pub fn create_revision(
    app: tauri::AppHandle,
    payload: CreateRevisionPayload,
) -> Result<ArchetypeRevision, String> {
    validate_required_len(&payload.project_id, 512, "project_id")?;
    validate_string_len(&payload.change_summary, 512, "change_summary")?;
    let conn = db::get_connection(&app)?;
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = chrono_now();
    conn.execute(
        "INSERT INTO archetype_revisions (id, project_id, round_number, change_summary, approved, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![id, payload.project_id, payload.round_number, payload.change_summary, payload.approved.unwrap_or(false) as i64, created_at],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(ArchetypeRevision {
        id,
        project_id: payload.project_id,
        round_number: payload.round_number,
        change_summary: payload.change_summary,
        approved: payload.approved.unwrap_or(false),
        created_at,
    })
}

#[tauri::command]
pub fn delete_revision(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    conn.execute("DELETE FROM archetype_revisions WHERE id = ?", [&id])
        .map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

// ── Builds ──

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ArchetypeBuild {
    pub id: String,
    pub project_id: String,
    pub version: Option<String>,
    pub platform: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateBuildPayload {
    pub project_id: String,
    pub version: Option<String>,
    pub platform: Option<String>,
    pub notes: Option<String>,
}

#[tauri::command]
pub fn get_builds(
    app: tauri::AppHandle,
    project_id: String,
) -> Result<Vec<ArchetypeBuild>, String> {
    let conn = db::get_connection(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, project_id, version, platform, notes, created_at FROM archetype_builds WHERE project_id = ?1 ORDER BY created_at DESC")
        .map_err(|_| "Database operation failed".to_string())?;
    let rows = stmt
        .query_map([&project_id], |row| {
            Ok(ArchetypeBuild {
                id: row.get(0)?,
                project_id: row.get(1)?,
                version: row.get(2)?,
                platform: row.get(3)?,
                notes: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect::<Vec<_>>();
    Ok(rows)
}

#[tauri::command]
pub fn create_build(
    app: tauri::AppHandle,
    payload: CreateBuildPayload,
) -> Result<ArchetypeBuild, String> {
    validate_required_len(&payload.project_id, 512, "project_id")?;
    validate_string_len(&payload.version, 512, "version")?;
    validate_string_len(&payload.platform, 512, "platform")?;
    validate_string_len(&payload.notes, 10000, "notes")?;
    let conn = db::get_connection(&app)?;
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = chrono_now();
    conn.execute(
        "INSERT INTO archetype_builds (id, project_id, version, platform, notes, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![id, payload.project_id, payload.version, payload.platform, payload.notes, created_at],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(ArchetypeBuild {
        id,
        project_id: payload.project_id,
        version: payload.version,
        platform: payload.platform,
        notes: payload.notes,
        created_at,
    })
}

#[tauri::command]
pub fn delete_build(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    conn.execute("DELETE FROM archetype_builds WHERE id = ?", [&id]).map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

// ── Keywords ──

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ArchetypeKeyword {
    pub id: String,
    pub client_id: String,
    pub keyword: String,
    pub position_start: Option<f64>,
    pub position_current: Option<f64>,
    pub target_position: Option<f64>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateKeywordPayload {
    pub client_id: String,
    pub keyword: String,
    pub position_start: Option<f64>,
    pub position_current: Option<f64>,
    pub target_position: Option<f64>,
}

#[tauri::command]
pub fn get_keywords(
    app: tauri::AppHandle,
    client_id: String,
) -> Result<Vec<ArchetypeKeyword>, String> {
    let conn = db::get_connection(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, client_id, keyword, position_start, position_current, target_position, created_at FROM archetype_keywords WHERE client_id = ?1 ORDER BY keyword ASC")
        .map_err(|_| "Database operation failed".to_string())?;
    let rows = stmt
        .query_map([&client_id], |row| {
            Ok(ArchetypeKeyword {
                id: row.get(0)?,
                client_id: row.get(1)?,
                keyword: row.get(2)?,
                position_start: row.get(3)?,
                position_current: row.get(4)?,
                target_position: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect::<Vec<_>>();
    Ok(rows)
}

#[tauri::command]
pub fn create_keyword(
    app: tauri::AppHandle,
    payload: CreateKeywordPayload,
) -> Result<ArchetypeKeyword, String> {
    validate_required_len(&payload.client_id, 512, "client_id")?;
    validate_required_len(&payload.keyword, 512, "keyword")?;
    let conn = db::get_connection(&app)?;
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = chrono_now();
    conn.execute(
        "INSERT INTO archetype_keywords (id, client_id, keyword, position_start, position_current, target_position, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![id, payload.client_id, payload.keyword, payload.position_start, payload.position_current, payload.target_position, created_at],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(ArchetypeKeyword {
        id,
        client_id: payload.client_id,
        keyword: payload.keyword,
        position_start: payload.position_start,
        position_current: payload.position_current,
        target_position: payload.target_position,
        created_at,
    })
}

#[tauri::command]
pub fn update_keyword(
    app: tauri::AppHandle,
    id: String,
    position_current: Option<f64>,
    target_position: Option<f64>,
) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    conn.execute(
        "UPDATE archetype_keywords SET position_current = ?1, target_position = ?2 WHERE id = ?3",
        rusqlite::params![position_current, target_position, id],
    )
    .map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_keyword(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    conn.execute("DELETE FROM archetype_keywords WHERE id = ?", [&id])
        .map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

// ── Datasets ──

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ArchetypeDataset {
    pub id: String,
    pub project_id: String,
    pub dataset_name: Option<String>,
    pub source: Option<String>,
    pub size_bytes: Option<i64>,
    pub format_type: Option<String>,
    pub license_type: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateDatasetPayload {
    pub project_id: String,
    pub dataset_name: Option<String>,
    pub source: Option<String>,
    pub size_bytes: Option<i64>,
    pub format_type: Option<String>,
    pub license_type: Option<String>,
}

#[tauri::command]
pub fn get_datasets(
    app: tauri::AppHandle,
    project_id: String,
) -> Result<Vec<ArchetypeDataset>, String> {
    let conn = db::get_connection(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, project_id, dataset_name, source, size_bytes, format_type, license_type, created_at FROM archetype_datasets WHERE project_id = ?1 ORDER BY created_at DESC")
        .map_err(|_| "Database operation failed".to_string())?;
    let rows = stmt
        .query_map([&project_id], |row| {
            Ok(ArchetypeDataset {
                id: row.get(0)?,
                project_id: row.get(1)?,
                dataset_name: row.get(2)?,
                source: row.get(3)?,
                size_bytes: row.get(4)?,
                format_type: row.get(5)?,
                license_type: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect::<Vec<_>>();
    Ok(rows)
}

#[tauri::command]
pub fn create_dataset(
    app: tauri::AppHandle,
    payload: CreateDatasetPayload,
) -> Result<ArchetypeDataset, String> {
    validate_required_len(&payload.project_id, 512, "project_id")?;
    validate_string_len(&payload.dataset_name, 512, "dataset_name")?;
    validate_string_len(&payload.source, 512, "source")?;
    validate_string_len(&payload.format_type, 512, "format_type")?;
    validate_string_len(&payload.license_type, 512, "license_type")?;
    let conn = db::get_connection(&app)?;
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = chrono_now();
    conn.execute(
        "INSERT INTO archetype_datasets (id, project_id, dataset_name, source, size_bytes, format_type, license_type, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![id, payload.project_id, payload.dataset_name, payload.source, payload.size_bytes, payload.format_type, payload.license_type, created_at],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(ArchetypeDataset {
        id,
        project_id: payload.project_id,
        dataset_name: payload.dataset_name,
        source: payload.source,
        size_bytes: payload.size_bytes,
        format_type: payload.format_type,
        license_type: payload.license_type,
        created_at,
    })
}

#[tauri::command]
pub fn delete_dataset(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    conn.execute("DELETE FROM archetype_datasets WHERE id = ?", [&id])
        .map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}
