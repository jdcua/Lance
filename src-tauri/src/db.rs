use rusqlite::Connection;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

pub fn get_db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_dir =
        app.path().app_data_dir().map_err(|e| format!("Failed to get app data dir: {}", e))?;
    std::fs::create_dir_all(&app_dir)
        .map_err(|e| format!("Failed to create app data dir: {}", e))?;
    Ok(app_dir.join("lance.db"))
}

pub fn get_connection(app: &AppHandle) -> Result<Connection, String> {
    let db_path = get_db_path(app)?;
    let path_str = db_path.to_str().ok_or("Invalid db path")?;
    let conn = Connection::open(path_str).map_err(|e| format!("Failed to open database: {}", e))?;
    conn.execute_batch("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;")
        .map_err(|e| format!("Failed to set pragmas: {}", e))?;
    Ok(conn)
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
           color TEXT,
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
           tax_rate REAL DEFAULT 0,
           payment_terms INTEGER DEFAULT 14,
           tagline TEXT,
           always_include TEXT,
           writing_style TEXT DEFAULT 'professional',
           theme TEXT DEFAULT 'light',
           license_key TEXT,
           licensed_at TEXT,
           ai_enabled INTEGER DEFAULT 0,
           profession TEXT,
           custom_archetype_config TEXT,
           density TEXT DEFAULT 'comfortable',
           accent_color TEXT
         );

         CREATE TABLE IF NOT EXISTS communications (
           id TEXT PRIMARY KEY,
           client_id TEXT NOT NULL,
           type TEXT NOT NULL,
           summary TEXT NOT NULL,
           date TEXT NOT NULL,
           created_at TEXT NOT NULL,
           FOREIGN KEY (client_id) REFERENCES clients(id)
         );

         CREATE TABLE IF NOT EXISTS recurring_invoices (
           id TEXT PRIMARY KEY,
           client_id TEXT NOT NULL,
           project_id TEXT,
           title TEXT NOT NULL,
           frequency TEXT NOT NULL,
           line_items TEXT NOT NULL DEFAULT '[]',
           subtotal REAL NOT NULL DEFAULT 0,
           tax_rate REAL,
           total REAL NOT NULL DEFAULT 0,
           notes TEXT,
           active INTEGER NOT NULL DEFAULT 1,
           next_due TEXT NOT NULL,
           last_generated TEXT,
           created_at TEXT NOT NULL,
           FOREIGN KEY (client_id) REFERENCES clients(id)
         );

         CREATE TABLE IF NOT EXISTS achievements (
           id TEXT PRIMARY KEY,
           key TEXT NOT NULL UNIQUE,
           unlocked_at TEXT NOT NULL
         );

         CREATE TABLE IF NOT EXISTS import_log (
           id TEXT PRIMARY KEY,
           filename TEXT NOT NULL,
           file_type TEXT NOT NULL,
           file_path TEXT NOT NULL,
           detected_type TEXT,
           target_entity TEXT,
           target_id TEXT,
           status TEXT NOT NULL DEFAULT 'pending',
           error_message TEXT,
           imported_at TEXT NOT NULL
         );

         CREATE TABLE IF NOT EXISTS attachments (
           id TEXT PRIMARY KEY,
           entity_type TEXT NOT NULL,
           entity_id TEXT NOT NULL,
           filename TEXT NOT NULL,
           file_path TEXT NOT NULL,
           mime_type TEXT NOT NULL,
           size_bytes INTEGER NOT NULL,
           tags TEXT DEFAULT '[]',
           notes TEXT,
           created_at TEXT NOT NULL
         );

         CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
         CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id);
         CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id);
         CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
         CREATE INDEX IF NOT EXISTS idx_communications_client ON communications(client_id);
         CREATE INDEX IF NOT EXISTS idx_proposals_client ON proposals(client_id);
         CREATE INDEX IF NOT EXISTS idx_contracts_client ON contracts(client_id);
         CREATE INDEX IF NOT EXISTS idx_recurring_invoices_client ON recurring_invoices(client_id);
         CREATE INDEX IF NOT EXISTS idx_import_log_status ON import_log(status);
         CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id);
         CREATE INDEX IF NOT EXISTS idx_attachments_mime ON attachments(mime_type);

         CREATE TABLE IF NOT EXISTS metric_definitions (
           id TEXT PRIMARY KEY,
           client_id TEXT NOT NULL,
           name TEXT NOT NULL,
           metric_type TEXT NOT NULL DEFAULT 'number',
           unit_label TEXT,
           is_headline INTEGER NOT NULL DEFAULT 0,
           sort_order INTEGER NOT NULL DEFAULT 0,
           created_at TEXT NOT NULL,
           FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
         );

         CREATE TABLE IF NOT EXISTS metric_values (
           id TEXT PRIMARY KEY,
           definition_id TEXT NOT NULL,
           client_id TEXT NOT NULL,
           value TEXT NOT NULL,
           period TEXT NOT NULL,
           notes TEXT,
           created_at TEXT NOT NULL,
           FOREIGN KEY (definition_id) REFERENCES metric_definitions(id) ON DELETE CASCADE,
           FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
         );

         CREATE TABLE IF NOT EXISTS metric_templates (
           id TEXT PRIMARY KEY,
           name TEXT NOT NULL UNIQUE,
           definitions_json TEXT NOT NULL,
           created_at TEXT NOT NULL
         );

         CREATE INDEX IF NOT EXISTS idx_metric_defs_client ON metric_definitions(client_id);
         CREATE INDEX IF NOT EXISTS idx_metric_values_def ON metric_values(definition_id);
         CREATE INDEX IF NOT EXISTS idx_metric_values_client ON metric_values(client_id);
         CREATE INDEX IF NOT EXISTS idx_metric_values_period ON metric_values(definition_id, period);

         CREATE TABLE IF NOT EXISTS follow_up_log (
           id TEXT PRIMARY KEY,
           entity_type TEXT NOT NULL,
           entity_id TEXT NOT NULL,
           stage INTEGER NOT NULL DEFAULT 1,
           status TEXT NOT NULL DEFAULT 'pending',
           drafted_at TEXT NOT NULL,
           actioned_at TEXT,
           action TEXT
         );

         CREATE INDEX IF NOT EXISTS idx_follow_up_entity ON follow_up_log(entity_type, entity_id);

         CREATE TABLE IF NOT EXISTS archetype_render_log (
           id TEXT PRIMARY KEY,
           project_id TEXT NOT NULL,
           pass_name TEXT,
           duration_minutes INTEGER,
           software TEXT,
           frame_range TEXT,
           notes TEXT,
           created_at TEXT NOT NULL,
           FOREIGN KEY (project_id) REFERENCES projects(id)
         );

         CREATE TABLE IF NOT EXISTS archetype_sessions (
           id TEXT PRIMARY KEY,
           client_id TEXT NOT NULL,
           project_id TEXT,
           session_type TEXT,
           duration_minutes INTEGER,
           notes TEXT,
           action_items TEXT,
           next_session_date TEXT,
           created_at TEXT NOT NULL
         );

         CREATE TABLE IF NOT EXISTS archetype_shoots (
           id TEXT PRIMARY KEY,
           project_id TEXT NOT NULL,
           shoot_date TEXT,
           location TEXT,
           shoot_type TEXT,
           camera_system TEXT,
           hours_on_location REAL,
           conditions_notes TEXT,
           created_at TEXT NOT NULL,
           FOREIGN KEY (project_id) REFERENCES projects(id)
         );

         CREATE TABLE IF NOT EXISTS archetype_revisions (
           id TEXT PRIMARY KEY,
           project_id TEXT NOT NULL,
           round_number INTEGER NOT NULL,
           change_summary TEXT,
           approved INTEGER NOT NULL DEFAULT 0,
           created_at TEXT NOT NULL,
           FOREIGN KEY (project_id) REFERENCES projects(id)
         );

         CREATE TABLE IF NOT EXISTS archetype_builds (
           id TEXT PRIMARY KEY,
           project_id TEXT NOT NULL,
           version TEXT,
           platform TEXT,
           notes TEXT,
           created_at TEXT NOT NULL,
           FOREIGN KEY (project_id) REFERENCES projects(id)
         );

         CREATE TABLE IF NOT EXISTS archetype_keywords (
           id TEXT PRIMARY KEY,
           client_id TEXT NOT NULL,
           keyword TEXT NOT NULL,
           position_start REAL,
           position_current REAL,
           target_position REAL,
           created_at TEXT NOT NULL
         );

         CREATE TABLE IF NOT EXISTS archetype_datasets (
           id TEXT PRIMARY KEY,
           project_id TEXT NOT NULL,
           dataset_name TEXT,
           source TEXT,
           size_bytes INTEGER,
           format_type TEXT,
           license_type TEXT,
           created_at TEXT NOT NULL,
           FOREIGN KEY (project_id) REFERENCES projects(id)
         );

         CREATE TABLE IF NOT EXISTS export_templates (
           id TEXT PRIMARY KEY,
           name TEXT NOT NULL,
           type TEXT NOT NULL,
           header TEXT,
           footer TEXT,
           sections TEXT NOT NULL DEFAULT '[]',
           color_scheme TEXT,
           created_at TEXT NOT NULL
         );

         CREATE TABLE IF NOT EXISTS contract_templates (
           id TEXT PRIMARY KEY,
           name TEXT NOT NULL,
           category TEXT,
           body TEXT NOT NULL,
           variables TEXT NOT NULL DEFAULT '[]',
           created_at TEXT NOT NULL
         );",
    )
    .map_err(|e| format!("Migration failed: {}", e))?;

    // Add new columns that may not exist in older databases
    let _ = conn.execute("ALTER TABLE projects ADD COLUMN color TEXT", []);
    let _ =
        conn.execute("ALTER TABLE expenses ADD COLUMN recurring INTEGER NOT NULL DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE expenses ADD COLUMN frequency TEXT DEFAULT 'monthly'", []);

    Ok(())
}
