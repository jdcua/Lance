use crate::db;
use crate::commands::clients::chrono_now;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

// ── Import Log ──

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportLog {
    pub id: String,
    pub filename: String,
    pub file_type: String,
    pub file_path: String,
    pub detected_type: Option<String>,
    pub target_entity: Option<String>,
    pub target_id: Option<String>,
    pub status: String,
    pub error_message: Option<String>,
    pub imported_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateImportLogPayload {
    pub filename: String,
    pub file_type: String,
    pub file_path: String,
    pub detected_type: Option<String>,
    pub target_entity: Option<String>,
    pub target_id: Option<String>,
    pub status: String,
    pub error_message: Option<String>,
}

// ── Attachment ──

#[derive(Debug, Serialize, Deserialize)]
pub struct Attachment {
    pub id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub filename: String,
    pub file_path: String,
    pub mime_type: String,
    pub size_bytes: i64,
    pub tags: String,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateAttachmentPayload {
    pub entity_type: String,
    pub entity_id: String,
    pub filename: String,
    pub file_path: String,
    pub mime_type: String,
    pub size_bytes: i64,
    pub tags: Option<String>,
    pub notes: Option<String>,
}

// ── File Storage ──

fn get_imports_dir_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    use tauri::Manager;
    let documents_dir = app
        .path()
        .document_dir()
        .map_err(|e| format!("Failed to get documents dir: {}", e))?;
    let imports_dir = documents_dir.join("Lance").join("imports");
    std::fs::create_dir_all(&imports_dir)
        .map_err(|e| format!("Failed to create imports dir: {}", e))?;
    Ok(imports_dir)
}

fn get_assets_dir_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    use tauri::Manager;
    let documents_dir = app
        .path()
        .document_dir()
        .map_err(|e| format!("Failed to get documents dir: {}", e))?;
    let assets_dir = documents_dir.join("Lance").join("Assets");
    std::fs::create_dir_all(&assets_dir)
        .map_err(|e| format!("Failed to create assets dir: {}", e))?;
    Ok(assets_dir)
}

#[tauri::command]
pub fn get_imports_dir(app: tauri::AppHandle) -> Result<String, String> {
    let dir = get_imports_dir_path(&app)?;
    dir.to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Invalid path encoding".to_string())
}

#[tauri::command]
pub fn get_assets_dir(app: tauri::AppHandle) -> Result<String, String> {
    let dir = get_assets_dir_path(&app)?;
    dir.to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Invalid path encoding".to_string())
}

#[tauri::command]
pub fn save_import_file(
    app: tauri::AppHandle,
    filename: String,
    data: Vec<u8>,
) -> Result<String, String> {
    let imports_dir = get_imports_dir_path(&app)?;
    let id = uuid::Uuid::new_v4().to_string();
    let safe_name = sanitize_filename(&filename);
    let stored_name = format!("{}_{}", id, safe_name);
    let file_path = imports_dir.join(&stored_name);
    std::fs::write(&file_path, &data)
        .map_err(|e| format!("Failed to write import file: {}", e))?;
    file_path
        .to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Invalid path encoding".to_string())
}

#[tauri::command]
pub fn save_asset_file(
    app: tauri::AppHandle,
    filename: String,
    data: Vec<u8>,
) -> Result<String, String> {
    let assets_dir = get_assets_dir_path(&app)?;
    let id = uuid::Uuid::new_v4().to_string();
    let safe_name = sanitize_filename(&filename);
    let stored_name = format!("{}_{}", id, safe_name);
    let file_path = assets_dir.join(&stored_name);
    std::fs::write(&file_path, &data)
        .map_err(|e| format!("Failed to write asset file: {}", e))?;
    file_path
        .to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Invalid path encoding".to_string())
}

fn sanitize_filename(filename: &str) -> String {
    filename
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '.' || c == '-' || c == '_' { c } else { '_' })
        .collect::<String>()
}

// ── Import Log Commands ──

#[tauri::command]
pub fn log_import(
    app: tauri::AppHandle,
    payload: CreateImportLogPayload,
) -> Result<ImportLog, String> {
    let conn = db::get_connection(&app)?;
    let id = uuid::Uuid::new_v4().to_string();
    let imported_at = chrono_now();
    conn.execute(
        "INSERT INTO import_log (id, filename, file_type, file_path, detected_type, target_entity, target_id, status, error_message, imported_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![
            id,
            payload.filename,
            payload.file_type,
            payload.file_path,
            payload.detected_type,
            payload.target_entity,
            payload.target_id,
            payload.status,
            payload.error_message,
            imported_at,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(ImportLog {
        id,
        filename: payload.filename,
        file_type: payload.file_type,
        file_path: payload.file_path,
        detected_type: payload.detected_type,
        target_entity: payload.target_entity,
        target_id: payload.target_id,
        status: payload.status,
        error_message: payload.error_message,
        imported_at,
    })
}

#[tauri::command]
pub fn get_import_log(app: tauri::AppHandle) -> Result<Vec<ImportLog>, String> {
    let conn = db::get_connection(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, filename, file_type, file_path, detected_type, target_entity, target_id, status, error_message, imported_at FROM import_log ORDER BY imported_at DESC")
        .map_err(|e| e.to_string())?;
    let logs = stmt
        .query_map([], |row| {
            Ok(ImportLog {
                id: row.get(0)?,
                filename: row.get(1)?,
                file_type: row.get(2)?,
                file_path: row.get(3)?,
                detected_type: row.get(4)?,
                target_entity: row.get(5)?,
                target_id: row.get(6)?,
                status: row.get(7)?,
                error_message: row.get(8)?,
                imported_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(logs)
}

// ── Attachment Commands ──

#[tauri::command]
pub fn create_attachment(
    app: tauri::AppHandle,
    payload: CreateAttachmentPayload,
) -> Result<Attachment, String> {
    let conn = db::get_connection(&app)?;
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = chrono_now();
    let tags = payload.tags.unwrap_or_else(|| "[]".to_string());
    conn.execute(
        "INSERT INTO attachments (id, entity_type, entity_id, filename, file_path, mime_type, size_bytes, tags, notes, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![
            id,
            payload.entity_type,
            payload.entity_id,
            payload.filename,
            payload.file_path,
            payload.mime_type,
            payload.size_bytes,
            tags,
            payload.notes,
            created_at,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(Attachment {
        id,
        entity_type: payload.entity_type,
        entity_id: payload.entity_id,
        filename: payload.filename,
        file_path: payload.file_path,
        mime_type: payload.mime_type,
        size_bytes: payload.size_bytes,
        tags,
        notes: payload.notes,
        created_at,
    })
}

#[tauri::command]
pub fn get_attachments(
    app: tauri::AppHandle,
    entity_type: String,
    entity_id: String,
) -> Result<Vec<Attachment>, String> {
    let conn = db::get_connection(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, entity_type, entity_id, filename, file_path, mime_type, size_bytes, tags, notes, created_at FROM attachments WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    let attachments = stmt
        .query_map([&entity_type, &entity_id], |row| {
            Ok(Attachment {
                id: row.get(0)?,
                entity_type: row.get(1)?,
                entity_id: row.get(2)?,
                filename: row.get(3)?,
                file_path: row.get(4)?,
                mime_type: row.get(5)?,
                size_bytes: row.get(6)?,
                tags: row.get(7)?,
                notes: row.get(8)?,
                created_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(attachments)
}

#[tauri::command]
pub fn get_all_attachments(app: tauri::AppHandle) -> Result<Vec<Attachment>, String> {
    let conn = db::get_connection(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, entity_type, entity_id, filename, file_path, mime_type, size_bytes, tags, notes, created_at FROM attachments ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    let attachments = stmt
        .query_map([], |row| {
            Ok(Attachment {
                id: row.get(0)?,
                entity_type: row.get(1)?,
                entity_id: row.get(2)?,
                filename: row.get(3)?,
                file_path: row.get(4)?,
                mime_type: row.get(5)?,
                size_bytes: row.get(6)?,
                tags: row.get(7)?,
                notes: row.get(8)?,
                created_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(attachments)
}

#[tauri::command]
pub fn delete_attachment(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    // Get file path before deleting record
    let file_path: Option<String> = conn
        .query_row(
            "SELECT file_path FROM attachments WHERE id = ?",
            [&id],
            |row| row.get(0),
        )
        .ok();
    conn.execute("DELETE FROM attachments WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;
    // Best-effort file cleanup
    if let Some(path) = file_path {
        let _ = std::fs::remove_file(path);
    }
    Ok(())
}

// ── Asset Management Commands ──

#[derive(Debug, Deserialize)]
pub struct RenameAttachmentPayload {
    pub id: String,
    pub new_filename: String,
}

#[tauri::command]
pub fn rename_attachment(
    app: tauri::AppHandle,
    payload: RenameAttachmentPayload,
) -> Result<Attachment, String> {
    let conn = db::get_connection(&app)?;
    conn.execute(
        "UPDATE attachments SET filename = ? WHERE id = ?",
        rusqlite::params![payload.new_filename, payload.id],
    )
    .map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, entity_type, entity_id, filename, file_path, mime_type, size_bytes, tags, notes, created_at FROM attachments WHERE id = ?")
        .map_err(|e| e.to_string())?;
    stmt.query_row([&payload.id], |row| {
        Ok(Attachment {
            id: row.get(0)?,
            entity_type: row.get(1)?,
            entity_id: row.get(2)?,
            filename: row.get(3)?,
            file_path: row.get(4)?,
            mime_type: row.get(5)?,
            size_bytes: row.get(6)?,
            tags: row.get(7)?,
            notes: row.get(8)?,
            created_at: row.get(9)?,
        })
    })
    .map_err(|e| e.to_string())
}

#[derive(Debug, Deserialize)]
pub struct MoveAttachmentPayload {
    pub id: String,
    pub entity_type: String,
    pub entity_id: String,
}

#[tauri::command]
pub fn move_attachment(
    app: tauri::AppHandle,
    payload: MoveAttachmentPayload,
) -> Result<Attachment, String> {
    let conn = db::get_connection(&app)?;
    conn.execute(
        "UPDATE attachments SET entity_type = ?, entity_id = ? WHERE id = ?",
        rusqlite::params![payload.entity_type, payload.entity_id, payload.id],
    )
    .map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, entity_type, entity_id, filename, file_path, mime_type, size_bytes, tags, notes, created_at FROM attachments WHERE id = ?")
        .map_err(|e| e.to_string())?;
    stmt.query_row([&payload.id], |row| {
        Ok(Attachment {
            id: row.get(0)?,
            entity_type: row.get(1)?,
            entity_id: row.get(2)?,
            filename: row.get(3)?,
            file_path: row.get(4)?,
            mime_type: row.get(5)?,
            size_bytes: row.get(6)?,
            tags: row.get(7)?,
            notes: row.get(8)?,
            created_at: row.get(9)?,
        })
    })
    .map_err(|e| e.to_string())
}

#[derive(Debug, Deserialize)]
pub struct UpdateAttachmentMetaPayload {
    pub id: String,
    pub tags: Option<String>,
    pub notes: Option<String>,
}

#[tauri::command]
pub fn update_attachment_meta(
    app: tauri::AppHandle,
    payload: UpdateAttachmentMetaPayload,
) -> Result<Attachment, String> {
    let conn = db::get_connection(&app)?;
    if let Some(ref tags) = payload.tags {
        conn.execute(
            "UPDATE attachments SET tags = ? WHERE id = ?",
            rusqlite::params![tags, payload.id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(ref notes) = payload.notes {
        conn.execute(
            "UPDATE attachments SET notes = ? WHERE id = ?",
            rusqlite::params![notes, payload.id],
        )
        .map_err(|e| e.to_string())?;
    }

    let mut stmt = conn
        .prepare("SELECT id, entity_type, entity_id, filename, file_path, mime_type, size_bytes, tags, notes, created_at FROM attachments WHERE id = ?")
        .map_err(|e| e.to_string())?;
    stmt.query_row([&payload.id], |row| {
        Ok(Attachment {
            id: row.get(0)?,
            entity_type: row.get(1)?,
            entity_id: row.get(2)?,
            filename: row.get(3)?,
            file_path: row.get(4)?,
            mime_type: row.get(5)?,
            size_bytes: row.get(6)?,
            tags: row.get(7)?,
            notes: row.get(8)?,
            created_at: row.get(9)?,
        })
    })
    .map_err(|e| e.to_string())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AssetStats {
    pub total_files: i64,
    pub total_size_bytes: i64,
    pub by_entity: Vec<EntityStat>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EntityStat {
    pub entity_type: String,
    pub entity_id: String,
    pub count: i64,
}

#[tauri::command]
pub fn get_asset_stats(app: tauri::AppHandle) -> Result<AssetStats, String> {
    let conn = db::get_connection(&app)?;

    let (total_files, total_size): (i64, i64) = conn
        .query_row(
            "SELECT COUNT(*), COALESCE(SUM(size_bytes), 0) FROM attachments",
            [],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT entity_type, entity_id, COUNT(*) as cnt FROM attachments GROUP BY entity_type, entity_id ORDER BY cnt DESC")
        .map_err(|e| e.to_string())?;
    let by_entity: Vec<EntityStat> = stmt
        .query_map([], |row| {
            Ok(EntityStat {
                entity_type: row.get(0)?,
                entity_id: row.get(1)?,
                count: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(AssetStats {
        total_files,
        total_size_bytes: total_size,
        by_entity,
    })
}

#[tauri::command]
pub fn search_assets(
    app: tauri::AppHandle,
    query: String,
) -> Result<Vec<Attachment>, String> {
    let conn = db::get_connection(&app)?;
    let pattern = format!("%{}%", query);
    let mut stmt = conn
        .prepare("SELECT id, entity_type, entity_id, filename, file_path, mime_type, size_bytes, tags, notes, created_at FROM attachments WHERE filename LIKE ? OR tags LIKE ? OR notes LIKE ? ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    let results = stmt
        .query_map(rusqlite::params![pattern, pattern, pattern], |row| {
            Ok(Attachment {
                id: row.get(0)?,
                entity_type: row.get(1)?,
                entity_id: row.get(2)?,
                filename: row.get(3)?,
                file_path: row.get(4)?,
                mime_type: row.get(5)?,
                size_bytes: row.get(6)?,
                tags: row.get(7)?,
                notes: row.get(8)?,
                created_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(results)
}
