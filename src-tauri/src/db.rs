use rusqlite::Connection;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

pub fn get_db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    std::fs::create_dir_all(&app_dir)
        .map_err(|e| format!("Failed to create app data dir: {}", e))?;
    Ok(app_dir.join("lance.db"))
}

pub fn get_connection(app: &AppHandle) -> Result<Connection, String> {
    let db_path = get_db_path(app)?;
    let path_str = db_path.to_str().ok_or("Invalid db path")?;
    Connection::open(path_str).map_err(|e| format!("Failed to open database: {}", e))
}

pub fn run_migrations(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "PRAGMA journal_mode=WAL;
         PRAGMA foreign_keys=ON;

         CREATE TABLE IF NOT EXISTS clients (
           id TEXT PRIMARY KEY,
           name TEXT NOT NULL,
           email TEXT,
           phone TEXT,
           company TEXT,
           notes TEXT,
           created_at TEXT NOT NULL
         );

         CREATE TABLE IF NOT EXISTS projects (
           id TEXT PRIMARY KEY,
           client_id TEXT NOT NULL,
           title TEXT NOT NULL,
           status TEXT NOT NULL DEFAULT 'active',
           start_date TEXT,
           end_date TEXT,
           budget REAL,
           notes TEXT,
           created_at TEXT NOT NULL,
           FOREIGN KEY (client_id) REFERENCES clients(id)
         );

         CREATE TABLE IF NOT EXISTS milestones (
           id TEXT PRIMARY KEY,
           project_id TEXT NOT NULL,
           title TEXT NOT NULL,
           due_date TEXT,
           completed INTEGER NOT NULL DEFAULT 0,
           invoice_on_completion INTEGER NOT NULL DEFAULT 0,
           FOREIGN KEY (project_id) REFERENCES projects(id)
         );

         CREATE TABLE IF NOT EXISTS proposals (
           id TEXT PRIMARY KEY,
           client_id TEXT NOT NULL,
           project_id TEXT,
           title TEXT NOT NULL,
           status TEXT NOT NULL DEFAULT 'draft',
           scope TEXT,
           timeline TEXT,
           rate REAL,
           rate_type TEXT NOT NULL DEFAULT 'flat',
           body TEXT,
           sent_at TEXT,
           created_at TEXT NOT NULL,
           FOREIGN KEY (client_id) REFERENCES clients(id)
         );

         CREATE TABLE IF NOT EXISTS contracts (
           id TEXT PRIMARY KEY,
           client_id TEXT NOT NULL,
           project_id TEXT,
           proposal_id TEXT,
           title TEXT NOT NULL,
           status TEXT NOT NULL DEFAULT 'draft',
           body TEXT,
           signed_at TEXT,
           created_at TEXT NOT NULL,
           FOREIGN KEY (client_id) REFERENCES clients(id)
         );

         CREATE TABLE IF NOT EXISTS time_entries (
           id TEXT PRIMARY KEY,
           project_id TEXT NOT NULL,
           client_id TEXT NOT NULL,
           description TEXT,
           start_time TEXT NOT NULL,
           end_time TEXT,
           duration_minutes INTEGER,
           billable INTEGER NOT NULL DEFAULT 1,
           invoiced INTEGER NOT NULL DEFAULT 0,
           FOREIGN KEY (project_id) REFERENCES projects(id)
         );

         CREATE TABLE IF NOT EXISTS invoices (
           id TEXT PRIMARY KEY,
           client_id TEXT NOT NULL,
           project_id TEXT,
           invoice_number TEXT NOT NULL,
           status TEXT NOT NULL DEFAULT 'draft',
           line_items TEXT NOT NULL DEFAULT '[]',
           subtotal REAL NOT NULL DEFAULT 0,
           tax_rate REAL,
           total REAL NOT NULL DEFAULT 0,
           due_date TEXT,
           paid_at TEXT,
           notes TEXT,
           created_at TEXT NOT NULL,
           FOREIGN KEY (client_id) REFERENCES clients(id)
         );

         CREATE TABLE IF NOT EXISTS expenses (
           id TEXT PRIMARY KEY,
           category TEXT NOT NULL,
           description TEXT NOT NULL,
           amount REAL NOT NULL,
           date TEXT NOT NULL
         );

         CREATE TABLE IF NOT EXISTS user_profile (
           id INTEGER PRIMARY KEY DEFAULT 1,
           name TEXT,
           email TEXT,
           hourly_rate REAL,
           currency TEXT DEFAULT 'CAD',
           writing_voice TEXT,
           tax_rate REAL,
           payment_terms INTEGER,
           tagline TEXT,
           always_include TEXT,
           writing_style TEXT,
           theme TEXT,
           license_key TEXT,
           licensed_at TEXT,
           ai_enabled INTEGER DEFAULT 0,
           profession TEXT
         );

         CREATE TABLE IF NOT EXISTS communications (
           id TEXT PRIMARY KEY,
           client_id TEXT NOT NULL,
           type TEXT NOT NULL,
           summary TEXT NOT NULL,
           date TEXT NOT NULL,
           created_at TEXT NOT NULL,
           FOREIGN KEY (client_id) REFERENCES clients(id)
         );",
    )
    .map_err(|e| format!("Migration failed: {}", e))?;

    Ok(())
}
