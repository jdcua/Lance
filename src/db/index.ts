import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (db) return db;
  db = await Database.load('sqlite:lance.db');
  await runMigrations(db);
  return db;
}

async function runMigrations(database: Database): Promise<void> {
  await database.execute('PRAGMA journal_mode=WAL');
  await database.execute('PRAGMA foreign_keys=ON');

  await database.execute(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    )
  `);

  await database.execute(`
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
      created_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS milestones (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      due_date TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      invoice_on_completion INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  await database.execute(`
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
      body TEXT,
      sent_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS contracts (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL,
      project_id TEXT,
      proposal_id TEXT,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      body TEXT,
      signed_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);

  await database.execute(`
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
    )
  `);

  await database.execute(`
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
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      recurring INTEGER NOT NULL DEFAULT 0,
      frequency TEXT DEFAULT 'monthly'
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY DEFAULT 1,
      name TEXT CHECK(length(name) <= 100),
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
      license_key TEXT,
      licensed_at TEXT,
      ai_enabled INTEGER DEFAULT 0,
      profession TEXT,
      custom_archetype_config TEXT,
      density TEXT DEFAULT 'comfortable',
      accent_color TEXT
    )
  `);

  const newColumns = [
    'ALTER TABLE user_profile ADD COLUMN tax_rate REAL DEFAULT 0',
    'ALTER TABLE user_profile ADD COLUMN payment_terms INTEGER DEFAULT 14',
    'ALTER TABLE user_profile ADD COLUMN tagline TEXT',
    'ALTER TABLE user_profile ADD COLUMN always_include TEXT',
    'ALTER TABLE user_profile ADD COLUMN writing_style TEXT DEFAULT \'professional\'',
    'ALTER TABLE user_profile ADD COLUMN theme TEXT DEFAULT \'light\'',
    'ALTER TABLE projects ADD COLUMN color TEXT',
    'ALTER TABLE user_profile ADD COLUMN license_key TEXT',
    'ALTER TABLE user_profile ADD COLUMN licensed_at TEXT',
    'ALTER TABLE user_profile ADD COLUMN profession TEXT',
    'ALTER TABLE user_profile ADD COLUMN custom_archetype_config TEXT',
    'ALTER TABLE user_profile ADD COLUMN density TEXT DEFAULT \'comfortable\'',
    'ALTER TABLE user_profile ADD COLUMN accent_color TEXT',
    'ALTER TABLE user_profile ADD COLUMN ai_enabled INTEGER DEFAULT 0',
    'ALTER TABLE expenses ADD COLUMN recurring INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE expenses ADD COLUMN frequency TEXT DEFAULT \'monthly\'',
    'ALTER TABLE clients ADD COLUMN seeded INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE projects ADD COLUMN seeded INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE proposals ADD COLUMN seeded INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE contracts ADD COLUMN seeded INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE time_entries ADD COLUMN seeded INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE invoices ADD COLUMN seeded INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE recurring_invoices ADD COLUMN seeded INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE expenses ADD COLUMN seeded INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE project_templates ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE proposals ADD COLUMN expires_at TEXT',
    'ALTER TABLE invoices ADD COLUMN currency TEXT DEFAULT NULL',
    'ALTER TABLE clients ADD COLUMN preferred_currency TEXT DEFAULT NULL',
    'ALTER TABLE user_profile ADD COLUMN proposal_expiry_days INTEGER',
  ];
  for (const sql of newColumns) {
    try { await database.execute(sql); } catch { /* column already exists */ }
  }

  // v2 user_id columns for row-level security
  const user_id_columns = [
    'ALTER TABLE clients ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1',
    'ALTER TABLE projects ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1',
    'ALTER TABLE milestones ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1',
    'ALTER TABLE proposals ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1',
    'ALTER TABLE contracts ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1',
    'ALTER TABLE time_entries ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1',
    'ALTER TABLE invoices ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1',
    'ALTER TABLE expenses ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1',
  ];
  for (const sql of user_id_columns) {
    try { await database.execute(sql); } catch { /* column already exists */ }
  }

  await database.execute(`
    CREATE TABLE IF NOT EXISTS communications (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL,
      type TEXT NOT NULL,
      summary TEXT NOT NULL,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);

  await database.execute(`
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
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      unlocked_at TEXT NOT NULL
    )
  `);

  await database.execute(`
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
    )
  `);

  await database.execute(`
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
    )
  `);

  await database.execute(`
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
    )
  `);

  await database.execute(`
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
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS metric_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      definitions_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  await database.execute(`
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
    )
  `);

  await database.execute(`
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
    )
  `);

  await database.execute(`
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
    )
  `);

  await database.execute(`
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
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS archetype_revisions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      round_number INTEGER NOT NULL,
      change_summary TEXT,
      approved INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS archetype_builds (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      version TEXT,
      platform TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS archetype_keywords (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL,
      keyword TEXT NOT NULL,
      position_start REAL,
      position_current REAL,
      target_position REAL,
      created_at TEXT NOT NULL
    )
  `);

  await database.execute(`
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
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS project_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      default_budget REAL,
      default_status TEXT NOT NULL DEFAULT 'Active',
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS project_template_milestones (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL,
      title TEXT NOT NULL,
      days_from_start INTEGER NOT NULL DEFAULT 0,
      invoice_on_completion INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (template_id) REFERENCES project_templates(id) ON DELETE CASCADE
    )
  `);

  await database.execute(`
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
    )
  `);

   await database.execute(`
    CREATE TABLE IF NOT EXISTS contract_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      body TEXT NOT NULL,
      variables TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS invoice_payments (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      invoice_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      reference TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS app_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      payload TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER NOT NULL
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS auto_backup_state (
      id INTEGER PRIMARY KEY DEFAULT 1,
      enabled INTEGER NOT NULL DEFAULT 0,
      frequency TEXT NOT NULL DEFAULT 'weekly',
      backup_path TEXT,
      last_backup_at TEXT,
      last_backup_error TEXT
    )
  `);

  // ── Phase tracker (Animator, Filmmaker, Data Analyst) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS project_phases (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      phase_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      color TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS time_entry_phases (
      id TEXT PRIMARY KEY,
      time_entry_id TEXT NOT NULL,
      phase_id TEXT NOT NULL,
      FOREIGN KEY (phase_id) REFERENCES project_phases(id)
    )
  `);
  // ── Deliverables (Animator) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS deliverables (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      file_name TEXT,
      format TEXT,
      resolution TEXT,
      delivery_date TEXT,
      client_approved INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Sprint tasks (Developer) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS sprint_tasks (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'backlog',
      priority TEXT NOT NULL DEFAULT 'medium',
      hours_estimated REAL,
      hours_actual REAL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Project stack (Developer) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS project_stack (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      technology TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'other',
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Bugs (Developer) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS bugs (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'open',
      hours_spent REAL,
      created_at TEXT NOT NULL,
      resolved_at TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Mood board (Designer) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS mood_board_items (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      asset_id TEXT,
      url TEXT,
      notes TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Client feedback (Designer) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS client_feedback (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL,
      project_id TEXT,
      date TEXT NOT NULL,
      medium TEXT NOT NULL,
      summary TEXT NOT NULL,
      actioned INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  // ── Culling sessions (Photographer) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS culling_sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      shoot_id TEXT,
      date TEXT,
      shoot_hours REAL,
      culling_hours REAL,
      editing_hours REAL,
      notes TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Project deliveries (Photographer) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS project_deliveries (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      selects_count INTEGER,
      delivered_count INTEGER,
      gallery_link TEXT,
      delivery_date TEXT,
      notes TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Equipment usage (Photographer) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS equipment_usage (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      shoot_id TEXT,
      equipment_name TEXT NOT NULL,
      equipment_type TEXT NOT NULL DEFAULT 'other',
      notes TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Storage log (Photographer) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS storage_log (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      raw_gb REAL,
      exported_gb REAL,
      logged_date TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Time entry words (Writer) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS time_entry_words (
      id TEXT PRIMARY KEY,
      time_entry_id TEXT NOT NULL,
      word_count INTEGER NOT NULL
    )
  `);
  // ── Publications (Writer) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS publications (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      outlet_name TEXT,
      url TEXT,
      publish_date TEXT,
      byline TEXT,
      notes TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Client style guides (Writer) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS client_style_guides (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL,
      tone TEXT,
      formatting_rules TEXT,
      banned_words TEXT,
      style_guide_ref TEXT,
      notes TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  // ── Retainers (Consultant) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS retainers (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL,
      monthly_hours REAL NOT NULL DEFAULT 0,
      rate REAL NOT NULL DEFAULT 0,
      renewal_date TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  // ── Action items (Consultant) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS action_items (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL,
      session_id TEXT,
      title TEXT NOT NULL,
      owner TEXT NOT NULL DEFAULT 'consultant',
      due_date TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  // ── Outcomes (Consultant) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS outcomes (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      before_state TEXT,
      after_state TEXT,
      metrics_improved TEXT,
      testimonial_draft TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Shots (Filmmaker) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS shots (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      scene TEXT,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'planned',
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Cuts (Filmmaker) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS cuts (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      cut_name TEXT,
      duration_seconds INTEGER,
      format TEXT,
      client_approved INTEGER NOT NULL DEFAULT 0,
      delivery_date TEXT,
      notes TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Deliverable specs (Filmmaker) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS deliverable_specs (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      format TEXT,
      resolution TEXT,
      aspect_ratio TEXT,
      audio_spec TEXT,
      delivery_method TEXT,
      notes TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Commissions (Illustrator) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS commissions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL,
      title TEXT NOT NULL,
      brief TEXT,
      deadline TEXT,
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      sort_order INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'queued',
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  // ── Project style tags (Illustrator) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS project_style_tags (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      tag TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Asset licenses (Illustrator, Musician) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS asset_licenses (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      asset_id TEXT NOT NULL,
      license_type TEXT NOT NULL,
      licensee TEXT,
      term TEXT,
      fee REAL,
      currency TEXT DEFAULT 'CAD',
      created_at TEXT NOT NULL
    )
  `);
  // ── Project complexity (3D Artist) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS project_complexity (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      poly_count TEXT,
      texture_count INTEGER,
      rig_complexity TEXT,
      software TEXT,
      notes TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Format deliverables (3D Artist) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS format_deliverables (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      format TEXT,
      poly_spec TEXT,
      texture_spec TEXT,
      delivered INTEGER NOT NULL DEFAULT 0,
      delivery_date TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Game features (Game Developer) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS game_features (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'should',
      status TEXT NOT NULL DEFAULT 'backlog',
      hours_estimated REAL,
      hours_actual REAL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Project platforms (Game Developer) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS project_platforms (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      engine TEXT,
      target_platform TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── QA sessions (Game Developer) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS qa_sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      date TEXT,
      build_version TEXT,
      bugs_found INTEGER,
      bugs_fixed INTEGER,
      hours REAL,
      notes TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Build deliveries (Game Developer) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS build_deliveries (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      version TEXT,
      date TEXT,
      platform TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Research activities (UX Designer) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS research_activities (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      type TEXT NOT NULL,
      date TEXT,
      participants INTEGER,
      key_findings TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Prototypes (UX Designer) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS prototypes (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      tool TEXT,
      fidelity TEXT,
      iteration INTEGER NOT NULL DEFAULT 1,
      link TEXT,
      feedback TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Usability tests (UX Designer) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS usability_tests (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      date TEXT,
      participants INTEGER,
      tasks_tested TEXT,
      issues_found TEXT,
      severity TEXT NOT NULL DEFAULT 'medium',
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Handoff items (UX Designer) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS handoff_items (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      item TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Component count (UX Designer) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS component_counts (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      component_name TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Campaigns (Marketing) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      channel TEXT,
      start_date TEXT,
      end_date TEXT,
      budget REAL,
      kpi_target TEXT,
      kpi_result TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Client report cadence (Marketing) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS client_report_cadence (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL,
      frequency TEXT NOT NULL DEFAULT 'monthly',
      last_report_date TEXT,
      next_due TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  // ── Project channels (Marketing) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS project_channels (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Content posts (Social Media) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS content_posts (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL,
      date TEXT,
      platform TEXT NOT NULL,
      content_type TEXT,
      status TEXT NOT NULL DEFAULT 'planned',
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  // ── Client platforms (Social Media) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS client_platforms (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      handle TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  // ── Stems (Musician) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS stems (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      format TEXT,
      delivered INTEGER NOT NULL DEFAULT 0,
      delivery_date TEXT,
      notes TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Sync licenses (Musician) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS sync_licenses (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT,
      track_name TEXT NOT NULL,
      licensee TEXT,
      use_type TEXT,
      territory TEXT,
      term TEXT,
      fee REAL,
      royalty INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);
  // ── Credits (Musician) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS credits (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      artist TEXT,
      role TEXT,
      release_link TEXT,
      release_date TEXT,
      notes TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Architecture phases (Architect) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS arch_phases (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      phase_name TEXT NOT NULL,
      completion_percent INTEGER NOT NULL DEFAULT 0,
      invoice_trigger INTEGER NOT NULL DEFAULT 0,
      completed INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Consultants (Architect) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS arch_consultants (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      discipline TEXT,
      fee REAL,
      fee_type TEXT,
      status TEXT NOT NULL DEFAULT 'contracted',
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Submissions (Architect) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      type TEXT NOT NULL,
      submitted_date TEXT,
      response_date TEXT,
      status TEXT NOT NULL DEFAULT 'submitted',
      resubmit INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Revision sets (Architect) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS revision_sets (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      set_number INTEGER NOT NULL,
      date TEXT,
      changes_summary TEXT,
      distributed_to TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Site visits (Architect) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS site_visits (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      date TEXT,
      phase TEXT,
      observations TEXT,
      photo_asset_ids TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── VA tasks (Virtual Assistant) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS va_tasks (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL,
      title TEXT NOT NULL,
      duration_minutes INTEGER,
      category TEXT NOT NULL DEFAULT 'other',
      completed_date TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  // ── SOPs (Virtual Assistant) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS sops (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  // ── Translation counts (Translator) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS translation_counts (
      id TEXT PRIMARY KEY,
      time_entry_id TEXT NOT NULL,
      source_words INTEGER,
      target_words INTEGER,
      characters INTEGER
    )
  `);
  // ── Project language pairs (Translator) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS project_language_pairs (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      source_lang TEXT NOT NULL,
      target_lang TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Project quality (Translator) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS project_quality (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      quality_tier TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Glossary terms (Translator) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS glossary_terms (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL,
      term TEXT NOT NULL,
      approved_translation TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  // ── SEO deliverables (SEO) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS seo_deliverables (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL,
      period TEXT NOT NULL,
      title TEXT NOT NULL,
      type TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      due_date TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  // ── Client reports (SEO) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS client_reports (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL,
      date TEXT NOT NULL,
      traffic_notes TEXT,
      ranking_notes TEXT,
      conversion_notes TEXT,
      summary TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  // ── Analysis deliverables (Data Analyst) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS analysis_deliverables (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      type TEXT,
      version TEXT,
      delivery_date TEXT,
      notes TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Analysis complexity (Data Analyst) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS project_analysis_complexity (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      complexity_tier TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Incidents (DevOps) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'open',
      resolved_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Automations (DevOps) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS automations (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'script',
      frequency TEXT,
      last_run TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Infrastructure (DevOps) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS infrastructure (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      service_name TEXT NOT NULL,
      provider TEXT,
      cost_monthly REAL,
      status TEXT NOT NULL DEFAULT 'active',
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── SLAs (DevOps) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS slas (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      metric_name TEXT NOT NULL,
      target TEXT,
      actual TEXT,
      period TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Experiments (AI Engineer) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS experiments (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'model',
      status TEXT NOT NULL DEFAULT 'planned',
      metrics TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Models (AI Engineer) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      framework TEXT,
      version TEXT,
      status TEXT NOT NULL DEFAULT 'development',
      metrics TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Compute costs (AI Engineer) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS compute_costs (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      provider TEXT,
      instance_type TEXT,
      hours REAL,
      cost REAL,
      date TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Dataset versions (AI Engineer) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS dataset_versions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      dataset_id TEXT NOT NULL,
      version TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Students (Tutor) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL,
      grade_level TEXT,
      subject TEXT,
      hourly_rate REAL,
      status TEXT NOT NULL DEFAULT 'active',
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  // ── Curriculum items (Tutor) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS curriculum_items (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      item_order INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'planned',
      notes TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Progress reports (Tutor) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS progress_reports (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL,
      date TEXT NOT NULL,
      summary TEXT,
      next_steps TEXT,
      score INTEGER,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // ── Cancellations (Wellness) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS cancellations (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL,
      session_date TEXT NOT NULL,
      reason TEXT,
      refund_amount REAL,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  // ── Intake forms (Wellness) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS intake_forms (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL,
      form_data TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  // ── Progress notes (Wellness) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS progress_notes (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL,
      date TEXT NOT NULL,
      mood_score INTEGER,
      notes TEXT,
      goals TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  // ── Programs (Trainer) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS programs (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL,
      name TEXT NOT NULL,
      duration_weeks INTEGER,
      sessions_per_week INTEGER,
      notes TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  // ── Assessments (Trainer) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS assessments (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL,
      date TEXT NOT NULL,
      metrics TEXT,
      notes TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  // ── Client progress (Trainer) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS client_progress (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL,
      date TEXT NOT NULL,
      measurements TEXT,
      notes TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  // ── Commission TOS (Illustrator) ──
  await database.execute(`
    CREATE TABLE IF NOT EXISTS commission_tos (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 1,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  // ── User profile additions for Rate Calculator ──
  try { await database.execute('ALTER TABLE user_profile ADD COLUMN income_target REAL'); } catch { /* exists */ }

  const versionColumns = [
    'ALTER TABLE recurring_invoices ADD COLUMN last_catch_up_warning TEXT',
  ];
  for (const sql of versionColumns) {
    try { await database.execute(sql); } catch { /* column already exists */ }
  }

  await database.execute('CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_communications_client ON communications(client_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_proposals_client ON proposals(client_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_contracts_client ON contracts(client_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_recurring_invoices_client ON recurring_invoices(client_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_import_log_status ON import_log(status)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_attachments_mime ON attachments(mime_type)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_metric_defs_client ON metric_definitions(client_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_metric_values_def ON metric_values(definition_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_metric_values_client ON metric_values(client_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_metric_values_period ON metric_values(definition_id, period)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_follow_up_entity ON follow_up_log(entity_type, entity_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_follow_up_status ON follow_up_log(status)');

  await database.execute('CREATE INDEX IF NOT EXISTS idx_time_entries_billable ON time_entries(billable)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_time_entries_invoiced ON time_entries(invoiced)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_time_entries_created ON time_entries(created_at)');

  await database.execute('CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date)');

  await database.execute('CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON invoice_payments(invoice_id)');

  await database.execute('CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_proposals_expires ON proposals(expires_at)');

  await database.execute('CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status)');

  await database.execute('CREATE INDEX IF NOT EXISTS idx_project_templates_default ON project_templates(is_default)');

  await database.execute('CREATE INDEX IF NOT EXISTS idx_archetype_render_log_project ON archetype_render_log(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_archetype_render_log_created ON archetype_render_log(created_at)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_archetype_sessions_project ON archetype_sessions(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_archetype_sessions_created ON archetype_sessions(created_at)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_archetype_shoots_project ON archetype_shoots(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_archetype_shoots_created ON archetype_shoots(created_at)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_archetype_revisions_project ON archetype_revisions(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_archetype_revisions_created ON archetype_revisions(created_at)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_archetype_builds_project ON archetype_builds(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_archetype_builds_created ON archetype_builds(created_at)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_archetype_keywords_client ON archetype_keywords(client_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_archetype_datasets_project ON archetype_datasets(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_archetype_datasets_created ON archetype_datasets(created_at)');

  await database.execute('CREATE INDEX IF NOT EXISTS idx_metrics_values_client_period ON metric_values(client_id, period)');

  await database.execute('CREATE INDEX IF NOT EXISTS idx_app_events_type ON app_events(event_type)');

  // ── New archetype table indexes ──
  await database.execute('CREATE INDEX IF NOT EXISTS idx_project_phases_project ON project_phases(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_deliverables_project ON deliverables(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_sprint_tasks_project ON sprint_tasks(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_sprint_tasks_status ON sprint_tasks(status)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_project_stack_project ON project_stack(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_bugs_project ON bugs(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_bugs_status ON bugs(status)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_mood_board_project ON mood_board_items(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_client_feedback_client ON client_feedback(client_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_culling_sessions_project ON culling_sessions(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_project_deliveries_project ON project_deliveries(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_equipment_usage_project ON equipment_usage(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_storage_log_project ON storage_log(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_publications_project ON publications(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_style_guides_client ON client_style_guides(client_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_retainers_client ON retainers(client_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_action_items_client ON action_items(client_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_outcomes_project ON outcomes(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_shots_project ON shots(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_cuts_project ON cuts(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_deliverable_specs_project ON deliverable_specs(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_commissions_client ON commissions(client_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_style_tags_project ON project_style_tags(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_asset_licenses_asset ON asset_licenses(asset_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_project_complexity_project ON project_complexity(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_format_deliverables_project ON format_deliverables(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_game_features_project ON game_features(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_project_platforms_project ON project_platforms(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_qa_sessions_project ON qa_sessions(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_build_deliveries_project ON build_deliveries(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_research_activities_project ON research_activities(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_prototypes_project ON prototypes(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_usability_tests_project ON usability_tests(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_handoff_items_project ON handoff_items(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_component_counts_project ON component_counts(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_campaigns_project ON campaigns(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_report_cadence_client ON client_report_cadence(client_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_project_channels_project ON project_channels(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_content_posts_client ON content_posts(client_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_client_platforms_client ON client_platforms(client_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_stems_project ON stems(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_sync_licenses_project ON sync_licenses(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_credits_project ON credits(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_arch_phases_project ON arch_phases(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_arch_consultants_project ON arch_consultants(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_submissions_project ON submissions(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_revision_sets_project ON revision_sets(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_site_visits_project ON site_visits(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_va_tasks_client ON va_tasks(client_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_sops_client ON sops(client_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_language_pairs_project ON project_language_pairs(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_project_quality_project ON project_quality(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_glossary_terms_client ON glossary_terms(client_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_seo_deliverables_client ON seo_deliverables(client_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_client_reports_client ON client_reports(client_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_analysis_deliverables_project ON analysis_deliverables(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_analysis_complexity_project ON project_analysis_complexity(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_incidents_project ON incidents(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_automations_project ON automations(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_infrastructure_project ON infrastructure(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_slas_project ON slas(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_experiments_project ON experiments(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_models_project ON models(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_compute_costs_project ON compute_costs(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_dataset_versions_project ON dataset_versions(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_students_client ON students(client_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_curriculum_items_project ON curriculum_items(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_progress_reports_project ON progress_reports(project_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_cancellations_client ON cancellations(client_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_intake_forms_client ON intake_forms(client_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_progress_notes_client ON progress_notes(client_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_programs_client ON programs(client_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_assessments_client ON assessments(client_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_client_progress_client ON client_progress(client_id)');

  const row = await database.select<{ cnt: number }[]>('SELECT COUNT(*) as cnt FROM schema_version');
  if (!row || row.length === 0 || row[0].cnt === 0) {
    await database.execute('INSERT INTO schema_version (version) VALUES (?)', [computeSchemaVersion()]);
  }
}

function computeSchemaVersion(): number {
  const count = runMigrations.toString().match(/CREATE TABLE IF NOT EXISTS/g);
  return count ? count.length : 1;
}

export function getCurrentSchemaVersion(): number {
  return computeSchemaVersion();
}

export async function getSchemaVersionFromDb(): Promise<number> {
  const { getDb } = await import('./index');
  const db = await getDb();
  const rows = await db.select<{ version: number }[]>('SELECT version FROM schema_version LIMIT 1');
  return rows && rows.length > 0 ? rows[0].version : computeSchemaVersion();
}
