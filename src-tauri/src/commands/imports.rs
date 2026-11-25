use crate::db::DbState;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportLogEntry {
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
#[serde(deny_unknown_fields)]
pub struct LogImportPayload {
    pub filename: String,
    pub file_type: String,
    pub file_path: String,
    pub detected_type: Option<String>,
    pub target_entity: Option<String>,
    pub target_id: Option<String>,
    pub status: String,
    pub error_message: Option<String>,
}

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
#[serde(deny_unknown_fields)]
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

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RenameAttachmentPayload {
    pub id: String,
    pub new_filename: String,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct MoveAttachmentPayload {
    pub id: String,
    pub entity_type: String,
    pub entity_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct UpdateMetaPayload {
    pub id: String,
    pub tags: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AssetStats {
    pub total_files: i64,
    pub total_size_bytes: i64,
    pub by_entity: Vec<EntityCount>,
}

#[derive(Debug, Serialize)]
pub struct EntityCount {
    pub entity_type: String,
    pub entity_id: String,
    pub count: i64,
}

fn ensure_dir(app: &tauri::AppHandle, sub: &str) -> Result<PathBuf, String> {
    let app_dir =
        app.path().app_data_dir().map_err(|e| format!("Failed to get app data dir: {}", e))?;
    let dir = app_dir.join(sub);
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create dir: {}", e))?;
    Ok(dir)
}

#[tauri::command]
pub fn get_imports_dir(app: tauri::AppHandle) -> Result<String, String> {
    Ok(ensure_dir(&app, "imports")?.to_str().unwrap_or("").to_string())
}

/// Largest file any single import/attachment command will write.
///
/// A Tauri command is callable by a compromised renderer, and these take
/// `data: Vec<u8>` straight off the wire. Unbounded, a renderer could ask for
/// gigabytes and exhaust memory before the write is even attempted. 50MB is the
/// same ceiling the client-side import path enforces, so this does not change
/// what the product accepts.
const MAX_FILE_BYTES: usize = 50 * 1024 * 1024;

/// Reject any filename that is not a single, plain path component.
///
/// This is a BLOCKER fix. `dir.join(&filename)` with a renderer-supplied string
/// is arbitrary file write: `../../.ssh/authorized_keys` resolves outside the
/// imports directory and `fs::write` creates or truncates it. The sibling
/// `save_asset_file` already stripped separators, which is how this call site
/// was identifiable as the odd one out.
///
/// Stripping characters is not enough on its own (`....//` and friends), so the
/// filename is required to BE a component rather than cleaned into one.
fn safe_component(filename: &str) -> Result<&str, String> {
    let name = filename.trim();
    if name.is_empty() {
        return Err("Filename is required".into());
    }
    if name == "." || name == ".." {
        return Err("Invalid filename".into());
    }
    if name.contains('/') || name.contains('\\') {
        return Err("Filename must not contain a path separator".into());
    }
    if name.contains('\0') {
        return Err("Filename must not contain a null byte".into());
    }
    // Reject anything the OS would treat as a separator or drive reference.
    if Path::new(name).components().count() != 1 {
        return Err("Invalid filename".into());
    }
    Ok(name)
}

#[tauri::command]
pub fn save_import_file(
    app: tauri::AppHandle,
    filename: String,
    data: Vec<u8>,
) -> Result<String, String> {
    if data.len() > MAX_FILE_BYTES {
        return Err("File exceeds the 50MB limit".into());
    }
    let dir = ensure_dir(&app, "imports")?;
    let path = dir.join(safe_component(&filename)?);
    // Belt and braces: confirm the resolved path is still inside dir before
    // writing. Cheap, and it survives a future change to safe_component.
    if !path.starts_with(&dir) {
        return Err("Invalid filename".into());
    }
    fs::write(&path, data).map_err(|e| format!("Failed to write file: {}", e))?;
    Ok(path.to_str().unwrap_or("").to_string())
}

#[tauri::command]
pub fn log_import(
    app: tauri::AppHandle,
    payload: LogImportPayload,
) -> Result<ImportLogEntry, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let id = uuid::Uuid::new_v4().to_string();
    let imported_at = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO import_log (id, filename, file_type, file_path, detected_type, target_entity, target_id, status, error_message, imported_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![id, payload.filename, payload.file_type, payload.file_path, payload.detected_type, payload.target_entity, payload.target_id, payload.status, payload.error_message, imported_at],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(ImportLogEntry {
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
pub fn get_import_log(app: tauri::AppHandle) -> Result<Vec<ImportLogEntry>, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut stmt = conn
        .prepare("SELECT id, filename, file_type, file_path, detected_type, target_entity, target_id, status, error_message, imported_at FROM import_log ORDER BY imported_at DESC")
        .map_err(|_| "Database operation failed".to_string())?;
    let logs = stmt
        .query_map([], |row| {
            Ok(ImportLogEntry {
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
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(logs)
}

#[tauri::command]
pub fn get_assets_dir(app: tauri::AppHandle) -> Result<String, String> {
    Ok(ensure_dir(&app, "assets")?.to_str().unwrap_or("").to_string())
}

#[tauri::command]
pub fn save_asset_file(
    app: tauri::AppHandle,
    filename: String,
    data: Vec<u8>,
) -> Result<String, String> {
    if data.len() > MAX_FILE_BYTES {
        return Err("File exceeds the 50MB limit".into());
    }
    let dir = ensure_dir(&app, "assets")?;
    // Same hard check as save_import_file. This one already stripped separators,
    // but replacing them still leaves `..` and NUL intact, and the resulting name
    // is what the portal and exports later read back.
    let name = safe_component(&filename)?;
    let safe_name = name.replace([':', '*', '?', '"', '<', '>', '|'], "_");
    let path = dir.join(&safe_name);
    if !path.starts_with(&dir) {
        return Err("Invalid filename".into());
    }
    fs::write(&path, data).map_err(|e| format!("Failed to write file: {}", e))?;
    Ok(path.to_str().unwrap_or("").to_string())
}

#[tauri::command]
pub fn create_attachment(
    app: tauri::AppHandle,
    payload: CreateAttachmentPayload,
) -> Result<Attachment, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();
    let tags = payload.tags.unwrap_or_else(|| "[]".to_string());
    conn.execute(
        "INSERT INTO attachments (id, entity_type, entity_id, filename, file_path, mime_type, size_bytes, tags, notes, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![id, payload.entity_type, payload.entity_id, payload.filename, payload.file_path, payload.mime_type, payload.size_bytes, tags, payload.notes, created_at],
    ).map_err(|_| "Database operation failed".to_string())?;
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
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut stmt = conn
        .prepare("SELECT id, entity_type, entity_id, filename, file_path, mime_type, size_bytes, tags, notes, created_at FROM attachments WHERE entity_type = ?1 AND entity_id = ?2 ORDER BY created_at DESC")
        .map_err(|_| "Database operation failed".to_string())?;
    let attachments = stmt
        .query_map(rusqlite::params![entity_type, entity_id], |row| {
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
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(attachments)
}

#[tauri::command]
pub fn get_all_attachments(app: tauri::AppHandle) -> Result<Vec<Attachment>, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut stmt = conn
        .prepare("SELECT id, entity_type, entity_id, filename, file_path, mime_type, size_bytes, tags, notes, created_at FROM attachments ORDER BY created_at DESC")
        .map_err(|_| "Database operation failed".to_string())?;
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
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(attachments)
}

#[tauri::command]
pub fn delete_attachment(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let path: Option<String> = conn
        .query_row("SELECT file_path FROM attachments WHERE id = ?", [&id], |row| row.get(0))
        .ok();
    if let Some(ref p) = path {
        let _ = fs::remove_file(p);
    }
    conn.execute("DELETE FROM attachments WHERE id = ?", [&id])
        .map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

#[tauri::command]
pub fn rename_attachment(
    app: tauri::AppHandle,
    payload: RenameAttachmentPayload,
) -> Result<Attachment, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let safe_name =
        payload.new_filename.replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], "_");
    conn.execute(
        "UPDATE attachments SET filename = ?1 WHERE id = ?2",
        rusqlite::params![safe_name, payload.id],
    )
    .map_err(|_| "Database operation failed".to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, entity_type, entity_id, filename, file_path, mime_type, size_bytes, tags, notes, created_at FROM attachments WHERE id = ?")
        .map_err(|_| "Database operation failed".to_string())?;
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
    .map_err(|_| "Database operation failed".to_string())
}

#[tauri::command]
pub fn move_attachment(
    app: tauri::AppHandle,
    payload: MoveAttachmentPayload,
) -> Result<Attachment, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    conn.execute(
        "UPDATE attachments SET entity_type = ?1, entity_id = ?2 WHERE id = ?3",
        rusqlite::params![payload.entity_type, payload.entity_id, payload.id],
    )
    .map_err(|_| "Database operation failed".to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, entity_type, entity_id, filename, file_path, mime_type, size_bytes, tags, notes, created_at FROM attachments WHERE id = ?")
        .map_err(|_| "Database operation failed".to_string())?;
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
    .map_err(|_| "Database operation failed".to_string())
}

#[tauri::command]
pub fn update_attachment_meta(
    app: tauri::AppHandle,
    payload: UpdateMetaPayload,
) -> Result<Attachment, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    if let Some(ref t) = payload.tags {
        conn.execute(
            "UPDATE attachments SET tags = ?1 WHERE id = ?2",
            rusqlite::params![t, payload.id],
        )
        .map_err(|_| "Database operation failed".to_string())?;
    }
    if let Some(ref n) = payload.notes {
        conn.execute(
            "UPDATE attachments SET notes = ?1 WHERE id = ?2",
            rusqlite::params![n, payload.id],
        )
        .map_err(|_| "Database operation failed".to_string())?;
    }
    let mut stmt = conn
        .prepare("SELECT id, entity_type, entity_id, filename, file_path, mime_type, size_bytes, tags, notes, created_at FROM attachments WHERE id = ?")
        .map_err(|_| "Database operation failed".to_string())?;
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
    .map_err(|_| "Database operation failed".to_string())
}

#[tauri::command]
pub fn get_asset_stats(app: tauri::AppHandle) -> Result<AssetStats, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let total_files: i64 =
        conn.query_row("SELECT COUNT(*) FROM attachments", [], |row| row.get(0)).unwrap_or(0);
    let total_size_bytes: i64 = conn
        .query_row("SELECT COALESCE(SUM(size_bytes), 0) FROM attachments", [], |row| row.get(0))
        .unwrap_or(0);
    let mut stmt = conn
        .prepare("SELECT entity_type, entity_id, COUNT(*) as cnt FROM attachments GROUP BY entity_type, entity_id ORDER BY cnt DESC LIMIT 50")
        .map_err(|_| "Database operation failed".to_string())?;
    let by_entity: Vec<EntityCount> = stmt
        .query_map([], |row| {
            Ok(EntityCount { entity_type: row.get(0)?, entity_id: row.get(1)?, count: row.get(2)? })
        })
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(AssetStats { total_files, total_size_bytes, by_entity })
}

#[tauri::command]
pub fn search_assets(app: tauri::AppHandle, query: String) -> Result<Vec<Attachment>, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let pattern = format!("%{}%", query);
    let mut stmt = conn
        .prepare("SELECT id, entity_type, entity_id, filename, file_path, mime_type, size_bytes, tags, notes, created_at FROM attachments WHERE filename LIKE ?1 OR notes LIKE ?1 OR tags LIKE ?1 ORDER BY created_at DESC LIMIT 100")
        .map_err(|_| "Database operation failed".to_string())?;
    let results = stmt
        .query_map([&pattern], |row| {
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
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::safe_component;

    /// A Tauri command is callable by a compromised renderer, so a
    /// renderer-supplied filename is attacker input. `dir.join(name)` with an
    /// unvalidated name is arbitrary file write.
    #[test]
    fn rejects_path_traversal() {
        for evil in [
            "../evil",
            "../../.ssh/authorized_keys",
            "..",
            ".",
            "a/b",
            "a\\b",
            "sub/dir/file.txt",
            "",
            "   ",
            "with\0nul",
        ] {
            assert!(safe_component(evil).is_err(), "should have rejected {evil:?}");
        }
    }

    #[test]
    fn accepts_ordinary_filenames() {
        for good in [
            "invoices.csv",
            "Bank Statement Jan.pdf",
            "report.2026-10.csv",
            "Ünïcodé name.txt",
            "file with spaces.docx",
            "..leading-dots.csv",
        ] {
            assert!(safe_component(good).is_ok(), "should have accepted {good:?}");
        }
    }

    #[test]
    fn never_returns_a_name_that_escapes_its_directory() {
        use std::path::{Path, PathBuf};
        let dir = PathBuf::from("/tmp/lance/imports");
        // Whatever safe_component lets through must not resolve outside dir.
        for candidate in
            ["plain.csv", "..leading.csv", "....//x.csv", "%2e%2e/x", "a/../../b.csv", "....csv"]
        {
            if let Ok(name) = safe_component(candidate) {
                let joined = dir.join(name);
                assert!(joined.starts_with(dir.as_path()), "{candidate:?} escaped: {joined:?}");
                // And a single component, so nothing above can re-enter.
                assert_eq!(
                    Path::new(name).components().count(),
                    1,
                    "{candidate:?} was not a single component"
                );
            }
        }
    }
}
