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
           user_id INTEGER NOT NULL DEFAULT 1,
           name TEXT NOT NULL,
           -- SECURITY: encrypt with user key in v2 before cloud sync
           email TEXT,
           phone TEXT,
           company TEXT,
           notes TEXT,
           created_at TEXT NOT NULL
         );

         CREATE TABLE IF NOT EXISTS projects (
           id TEXT PRIMARY KEY,
           user_id INTEGER NOT NULL DEFAULT 1,
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
           user_id INTEGER NOT NULL DEFAULT 1,
           project_id TEXT NOT NULL,
           title TEXT NOT NULL,
           due_date TEXT,
           completed INTEGER NOT NULL DEFAULT 0,
           invoice_on_completion INTEGER NOT NULL DEFAULT 0,
           FOREIGN KEY (project_id) REFERENCES projects(id)
         );

         CREATE TABLE IF NOT EXISTS proposals (
           id TEXT PRIMARY KEY,
           user_id INTEGER NOT NULL DEFAULT 1,
           client_id TEXT NOT NULL,
           project_id TEXT,
           title TEXT NOT NULL,
           status TEXT NOT NULL DEFAULT 'draft',
           scope TEXT,
           timeline TEXT,
           rate REAL,
           rate_type TEXT NOT NULL DEFAULT 'flat',
           -- SECURITY: encrypt with user key in v2 before cloud sync
           body TEXT,
           sent_at TEXT,
           created_at TEXT NOT NULL,
           FOREIGN KEY (client_id) REFERENCES clients(id)
         );

         CREATE TABLE IF NOT EXISTS contracts (
           id TEXT PRIMARY KEY,
           user_id INTEGER NOT NULL DEFAULT 1,
           client_id TEXT NOT NULL,
           project_id TEXT,
           proposal_id TEXT,
           title TEXT NOT NULL,
           status TEXT NOT NULL DEFAULT 'draft',
           -- SECURITY: encrypt with user key in v2 before cloud sync
           body TEXT,
           signed_at TEXT,
           created_at TEXT NOT NULL,
           FOREIGN KEY (client_id) REFERENCES clients(id)
         );

         CREATE TABLE IF NOT EXISTS time_entries (
           id TEXT PRIMARY KEY,
           user_id INTEGER NOT NULL DEFAULT 1,
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
           user_id INTEGER NOT NULL DEFAULT 1,
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
           user_id INTEGER NOT NULL DEFAULT 1,
           category TEXT NOT NULL,
           description TEXT NOT NULL,
           amount REAL NOT NULL,
           date TEXT NOT NULL
         );

         CREATE TABLE IF NOT EXISTS user_profile (
           id INTEGER PRIMARY KEY DEFAULT 1,
           name TEXT CHECK(length(name) <= 100),
           -- SECURITY: encrypt with user key in v2 before cloud sync
           email TEXT CHECK(length(email) <= 254),
           hourly_rate REAL,
           currency TEXT DEFAULT 'CAD',
           writing_voice TEXT CHECK(length(writing_voice) <= 1000),
           tax_rate REAL DEFAULT 0,
           payment_terms INTEGER DEFAULT 14,
           tagline TEXT CHECK(length(tagline) <= 200),
           always_include TEXT CHECK(length(always_include) <= 2000),
           writing_style TEXT DEFAULT 'professional',
           theme TEXT DEFAULT 'light',
           -- SECURITY: encrypt with user key in v2 before cloud sync
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
           user_id INTEGER NOT NULL DEFAULT 1,
           client_id TEXT NOT NULL,
           type TEXT NOT NULL,
           summary TEXT NOT NULL,
           date TEXT NOT NULL,
           created_at TEXT NOT NULL,
           FOREIGN KEY (client_id) REFERENCES clients(id)
         );

         CREATE TABLE IF NOT EXISTS recurring_invoices (
           id TEXT PRIMARY KEY,
           user_id INTEGER NOT NULL DEFAULT 1,
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
           user_id INTEGER NOT NULL DEFAULT 1,
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
           user_id INTEGER NOT NULL DEFAULT 1,
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
           user_id INTEGER NOT NULL DEFAULT 1,
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
           user_id INTEGER NOT NULL DEFAULT 1,
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
           user_id INTEGER NOT NULL DEFAULT 1,
           entity_type TEXT NOT NULL,
           entity_id TEXT NOT NULL,
           stage INTEGER NOT NULL DEFAULT 1,
           status TEXT NOT NULL DEFAULT 'pending',
           drafted_at TEXT NOT NULL,
           actioned_at TEXT,
           action TEXT
         );

         CREATE INDEX IF NOT EXISTS idx_follow_up_entity ON follow_up_log(entity_type, entity_id);
         CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON invoice_payments(invoice_id);

         CREATE TABLE IF NOT EXISTS archetype_render_log (
           id TEXT PRIMARY KEY,
           user_id INTEGER NOT NULL DEFAULT 1,
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
           user_id INTEGER NOT NULL DEFAULT 1,
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
           user_id INTEGER NOT NULL DEFAULT 1,
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
           user_id INTEGER NOT NULL DEFAULT 1,
           project_id TEXT NOT NULL,
           round_number INTEGER NOT NULL,
           change_summary TEXT,
           approved INTEGER NOT NULL DEFAULT 0,
           created_at TEXT NOT NULL,
           FOREIGN KEY (project_id) REFERENCES projects(id)
         );

         CREATE TABLE IF NOT EXISTS archetype_builds (
           id TEXT PRIMARY KEY,
           user_id INTEGER NOT NULL DEFAULT 1,
           project_id TEXT NOT NULL,
           version TEXT,
           platform TEXT,
           notes TEXT,
           created_at TEXT NOT NULL,
           FOREIGN KEY (project_id) REFERENCES projects(id)
         );

         CREATE TABLE IF NOT EXISTS archetype_keywords (
           id TEXT PRIMARY KEY,
           user_id INTEGER NOT NULL DEFAULT 1,
           client_id TEXT NOT NULL,
           keyword TEXT NOT NULL,
           position_start REAL,
           position_current REAL,
           target_position REAL,
           created_at TEXT NOT NULL
         );

         CREATE TABLE IF NOT EXISTS archetype_datasets (
           id TEXT PRIMARY KEY,
           user_id INTEGER NOT NULL DEFAULT 1,
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
           user_id INTEGER NOT NULL DEFAULT 1,
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
         );

         CREATE TABLE IF NOT EXISTS invoice_payments (
           id TEXT PRIMARY KEY,
           user_id INTEGER NOT NULL DEFAULT 1,
           invoice_id TEXT NOT NULL,
           amount REAL NOT NULL,
           payment_date TEXT NOT NULL,
           payment_method TEXT NOT NULL,
           -- SECURITY: encrypt with user key in v2 before cloud sync
           reference TEXT,
           notes TEXT,
           created_at TEXT DEFAULT CURRENT_TIMESTAMP,
           FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
         );

         CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON invoice_payments(invoice_id);
         CREATE INDEX IF NOT EXISTS idx_time_entries_billable ON time_entries(billable);
         CREATE INDEX IF NOT EXISTS idx_time_entries_invoiced ON time_entries(invoiced);
         CREATE INDEX IF NOT EXISTS idx_time_entries_created ON time_entries(created_at);
         CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
         CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
         CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
         CREATE INDEX IF NOT EXISTS idx_proposals_expires ON proposals(expires_at);
         CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
         CREATE INDEX IF NOT EXISTS idx_follow_up_status ON follow_up_log(status);
         CREATE INDEX IF NOT EXISTS idx_project_templates_default ON project_templates(is_default);
         CREATE INDEX IF NOT EXISTS idx_archetype_render_log_project ON archetype_render_log(project_id);
         CREATE INDEX IF NOT EXISTS idx_archetype_render_log_created ON archetype_render_log(created_at);
         CREATE INDEX IF NOT EXISTS idx_archetype_sessions_project ON archetype_sessions(project_id);
         CREATE INDEX IF NOT EXISTS idx_archetype_sessions_created ON archetype_sessions(created_at);
         CREATE INDEX IF NOT EXISTS idx_archetype_shoots_project ON archetype_shoots(project_id);
         CREATE INDEX IF NOT EXISTS idx_archetype_shoots_created ON archetype_shoots(created_at);
         CREATE INDEX IF NOT EXISTS idx_archetype_revisions_project ON archetype_revisions(project_id);
         CREATE INDEX IF NOT EXISTS idx_archetype_revisions_created ON archetype_revisions(created_at);
         CREATE INDEX IF NOT EXISTS idx_archetype_builds_project ON archetype_builds(project_id);
         CREATE INDEX IF NOT EXISTS idx_archetype_builds_created ON archetype_builds(created_at);
         CREATE INDEX IF NOT EXISTS idx_archetype_keywords_client ON archetype_keywords(client_id);
         CREATE INDEX IF NOT EXISTS idx_archetype_datasets_project ON archetype_datasets(project_id);
         CREATE INDEX IF NOT EXISTS idx_archetype_datasets_created ON archetype_datasets(created_at);
         CREATE INDEX IF NOT EXISTS idx_metrics_values_client_period ON metric_values(client_id, period);",
    )
    .map_err(|e| format!("Migration failed: {}", e))?;

    let _ = conn.execute("ALTER TABLE projects ADD COLUMN color TEXT", []);
    let _ =
        conn.execute("ALTER TABLE expenses ADD COLUMN recurring INTEGER NOT NULL DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE expenses ADD COLUMN frequency TEXT DEFAULT 'monthly'", []);
    let _ = conn.execute("ALTER TABLE proposals ADD COLUMN expires_at TEXT", []);
    let _ = conn.execute("ALTER TABLE invoices ADD COLUMN currency TEXT DEFAULT NULL", []);
    let _ =
        conn.execute("ALTER TABLE clients ADD COLUMN preferred_currency TEXT DEFAULT NULL", []);
    let _ = conn.execute(
        "ALTER TABLE user_profile ADD COLUMN proposal_expiry_days INTEGER",
        [],
    );

    // v2 user_id columns for row-level security
    let user_id_columns = [
        "ALTER TABLE clients ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE projects ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE milestones ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE proposals ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE contracts ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE time_entries ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE invoices ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE expenses ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE communications ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE recurring_invoices ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE import_log ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE attachments ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE metric_definitions ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE metric_values ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE follow_up_log ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE archetype_render_log ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE archetype_sessions ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE archetype_shoots ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE archetype_revisions ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE archetype_builds ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE archetype_keywords ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE archetype_datasets ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE export_templates ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE invoice_payments ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE share_tokens ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1",
    ];
    for sql in &user_id_columns {
        let _ = conn.execute(sql, []);
    }

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS share_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL DEFAULT 1,
            token TEXT UNIQUE NOT NULL,
            entity_type TEXT NOT NULL CHECK(entity_type IN ('proposal','contract')),
            entity_id TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            expires_at TEXT,
            viewed_at TEXT,
            view_count INTEGER DEFAULT 0,
            client_response TEXT CHECK(client_response IN ('accepted','declined')),
            client_response_at TEXT,
            client_name TEXT,
            client_signature TEXT,
            client_signed_at TEXT
         );
         CREATE INDEX IF NOT EXISTS idx_share_tokens_token ON share_tokens(token);
         CREATE INDEX IF NOT EXISTS idx_share_tokens_entity ON share_tokens(entity_type, entity_id);

         CREATE TABLE IF NOT EXISTS app_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            payload TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
         );
         CREATE INDEX IF NOT EXISTS idx_app_events_type ON app_events(event_type);",
    )
    .map_err(|e| format!("Share tokens migration failed: {}", e))?;

    Ok(())
}
