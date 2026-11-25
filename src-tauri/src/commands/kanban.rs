use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::db::DbState;

#[derive(Debug, Serialize, Deserialize)]
pub struct KanbanBoard {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct KanbanColumn {
    pub id: String,
    pub board_id: String,
    pub name: String,
    pub color: Option<String>,
    pub sort_order: i64,
    pub wip_limit: Option<i64>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct KanbanCard {
    pub id: String,
    pub column_id: String,
    pub project_id: String,
    pub title: String,
    pub description: Option<String>,
    pub priority: String,
    pub hours_estimated: Option<f64>,
    pub hours_actual: Option<f64>,
    pub due_date: Option<String>,
    pub labels: String,
    pub assignee: Option<String>,
    pub sort_order: i64,
    pub created_at: String,
}

// ─── Board ───

#[tauri::command]
pub fn get_kanban_board(
    state: State<DbState>,
    project_id: String,
) -> Result<Option<KanbanBoard>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, project_id, name, created_at FROM kanban_boards WHERE project_id = ?1")
        .map_err(|e| e.to_string())?;
    let board = stmt
        .query_row(params![project_id], |row| {
            Ok(KanbanBoard {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .ok();
    Ok(board)
}

#[tauri::command]
pub fn create_kanban_board(
    state: State<DbState>,
    project_id: String,
) -> Result<KanbanBoard, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = uuid_v4();
    let now = now_iso();
    conn.execute(
        "INSERT INTO kanban_boards (id, project_id, name, created_at) VALUES (?1, ?2, 'Main Board', ?3)",
        params![id, project_id, now],
    )
    .map_err(|e| e.to_string())?;

    let columns = [
        ("Backlog", "#6B7280", 0),
        ("In Progress", "#3B82F6", 1),
        ("Review", "#F59E0B", 2),
        ("Done", "#10B981", 3),
    ];
    for (name, color, order) in &columns {
        let cid = uuid_v4();
        conn.execute(
            "INSERT INTO kanban_columns (id, board_id, name, color, sort_order, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![cid, id, name, color, order, now],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(KanbanBoard { id, project_id, name: "Main Board".to_string(), created_at: now })
}

// ─── Columns ───

#[tauri::command]
pub fn get_kanban_columns(
    state: State<DbState>,
    board_id: String,
) -> Result<Vec<KanbanColumn>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, board_id, name, color, sort_order, wip_limit, created_at FROM kanban_columns WHERE board_id = ?1 ORDER BY sort_order ASC")
        .map_err(|e| e.to_string())?;
    let columns = stmt
        .query_map(params![board_id], |row| {
            Ok(KanbanColumn {
                id: row.get(0)?,
                board_id: row.get(1)?,
                name: row.get(2)?,
                color: row.get(3)?,
                sort_order: row.get(4)?,
                wip_limit: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(columns)
}

#[derive(Debug, Deserialize)]
pub struct CreateColumnPayload {
    pub board_id: String,
    pub name: String,
    pub color: Option<String>,
}

#[tauri::command]
pub fn create_kanban_column(
    state: State<DbState>,
    payload: CreateColumnPayload,
) -> Result<KanbanColumn, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = uuid_v4();
    let now = now_iso();
    let max_order: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM kanban_columns WHERE board_id = ?1",
            params![payload.board_id],
            |row| row.get(0),
        )
        .unwrap_or(0);
    conn.execute(
        "INSERT INTO kanban_columns (id, board_id, name, color, sort_order, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, payload.board_id, payload.name, payload.color, max_order, now],
    )
    .map_err(|e| e.to_string())?;
    Ok(KanbanColumn {
        id,
        board_id: payload.board_id,
        name: payload.name,
        color: payload.color,
        sort_order: max_order,
        wip_limit: None,
        created_at: now,
    })
}

#[derive(Debug, Deserialize)]
pub struct UpdateColumnPayload {
    pub id: String,
    pub name: Option<String>,
    pub color: Option<String>,
    pub wip_limit: Option<i64>,
}

#[tauri::command]
pub fn update_kanban_column(
    state: State<DbState>,
    payload: UpdateColumnPayload,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(name) = &payload.name {
        conn.execute(
            "UPDATE kanban_columns SET name = ?1 WHERE id = ?2",
            params![name, payload.id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(ref color) = payload.color {
        conn.execute(
            "UPDATE kanban_columns SET color = ?1 WHERE id = ?2",
            params![color, payload.id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(wip) = payload.wip_limit {
        conn.execute(
            "UPDATE kanban_columns SET wip_limit = ?1 WHERE id = ?2",
            params![wip, payload.id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn delete_kanban_column(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM kanban_cards WHERE column_id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM kanban_columns WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Debug, Deserialize)]
pub struct ReorderColumnsPayload {
    pub board_id: String,
    pub column_ids: Vec<String>,
}

#[tauri::command]
pub fn reorder_kanban_columns(
    state: State<DbState>,
    payload: ReorderColumnsPayload,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    for (i, col_id) in payload.column_ids.iter().enumerate() {
        conn.execute(
            "UPDATE kanban_columns SET sort_order = ?1 WHERE id = ?2 AND board_id = ?3",
            params![i as i64, col_id, payload.board_id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ─── Cards ───

#[tauri::command]
pub fn get_kanban_cards(
    state: State<DbState>,
    column_id: String,
) -> Result<Vec<KanbanCard>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, column_id, project_id, title, description, priority, hours_estimated, hours_actual, due_date, labels, assignee, sort_order, created_at FROM kanban_cards WHERE column_id = ?1 ORDER BY sort_order ASC, created_at ASC")
        .map_err(|e| e.to_string())?;
    let cards = stmt
        .query_map(params![column_id], |row| {
            Ok(KanbanCard {
                id: row.get(0)?,
                column_id: row.get(1)?,
                project_id: row.get(2)?,
                title: row.get(3)?,
                description: row.get(4)?,
                priority: row.get(5)?,
                hours_estimated: row.get(6)?,
                hours_actual: row.get(7)?,
                due_date: row.get(8)?,
                labels: row.get(9)?,
                assignee: row.get(10)?,
                sort_order: row.get(11)?,
                created_at: row.get(12)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(cards)
}

#[derive(Debug, Deserialize)]
pub struct CreateCardPayload {
    pub column_id: String,
    pub project_id: String,
    pub title: String,
    pub description: Option<String>,
    pub priority: Option<String>,
    pub hours_estimated: Option<f64>,
    pub due_date: Option<String>,
    pub labels: Option<String>,
    pub assignee: Option<String>,
}

#[tauri::command]
pub fn create_kanban_card(
    state: State<DbState>,
    payload: CreateCardPayload,
) -> Result<KanbanCard, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = uuid_v4();
    let now = now_iso();
    let max_order: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM kanban_cards WHERE column_id = ?1",
            params![payload.column_id],
            |row| row.get(0),
        )
        .unwrap_or(0);
    let priority = payload.priority.unwrap_or_else(|| "medium".to_string());
    let labels = payload.labels.unwrap_or_else(|| "[]".to_string());
    conn.execute(
        "INSERT INTO kanban_cards (id, column_id, project_id, title, description, priority, hours_estimated, due_date, labels, assignee, sort_order, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![id, payload.column_id, payload.project_id, payload.title, payload.description, priority, payload.hours_estimated, payload.due_date, labels, payload.assignee, max_order, now],
    )
    .map_err(|e| e.to_string())?;
    Ok(KanbanCard {
        id,
        column_id: payload.column_id,
        project_id: payload.project_id,
        title: payload.title,
        description: payload.description,
        priority,
        hours_estimated: payload.hours_estimated,
        hours_actual: None,
        due_date: payload.due_date,
        labels,
        assignee: payload.assignee,
        sort_order: max_order,
        created_at: now,
    })
}

#[derive(Debug, Deserialize)]
pub struct UpdateCardPayload {
    pub id: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub priority: Option<String>,
    pub hours_estimated: Option<f64>,
    pub hours_actual: Option<f64>,
    pub due_date: Option<String>,
    pub labels: Option<String>,
    pub assignee: Option<String>,
}

#[tauri::command]
pub fn update_kanban_card(state: State<DbState>, payload: UpdateCardPayload) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(title) = &payload.title {
        conn.execute(
            "UPDATE kanban_cards SET title = ?1 WHERE id = ?2",
            params![title, payload.id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(ref desc) = payload.description {
        conn.execute(
            "UPDATE kanban_cards SET description = ?1 WHERE id = ?2",
            params![desc, payload.id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(ref pri) = payload.priority {
        conn.execute(
            "UPDATE kanban_cards SET priority = ?1 WHERE id = ?2",
            params![pri, payload.id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(est) = payload.hours_estimated {
        conn.execute(
            "UPDATE kanban_cards SET hours_estimated = ?1 WHERE id = ?2",
            params![est, payload.id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(act) = payload.hours_actual {
        conn.execute(
            "UPDATE kanban_cards SET hours_actual = ?1 WHERE id = ?2",
            params![act, payload.id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(ref dd) = payload.due_date {
        conn.execute(
            "UPDATE kanban_cards SET due_date = ?1 WHERE id = ?2",
            params![dd, payload.id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(ref lbl) = payload.labels {
        conn.execute("UPDATE kanban_cards SET labels = ?1 WHERE id = ?2", params![lbl, payload.id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(ref assign) = payload.assignee {
        conn.execute(
            "UPDATE kanban_cards SET assignee = ?1 WHERE id = ?2",
            params![assign, payload.id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn delete_kanban_card(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM kanban_cards WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Debug, Deserialize)]
pub struct MoveCardPayload {
    pub card_id: String,
    pub from_column_id: String,
    pub to_column_id: String,
}

#[tauri::command]
pub fn move_kanban_card(state: State<DbState>, payload: MoveCardPayload) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let max_order: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM kanban_cards WHERE column_id = ?1",
            params![payload.to_column_id],
            |row| row.get(0),
        )
        .unwrap_or(0);
    conn.execute(
        "UPDATE kanban_cards SET column_id = ?1, sort_order = ?2 WHERE id = ?3",
        params![payload.to_column_id, max_order, payload.card_id],
    )
    .map_err(|e| e.to_string())?;
    // Renumber remaining cards in source column
    let remaining: Vec<String> = conn
        .prepare("SELECT id FROM kanban_cards WHERE column_id = ?1 ORDER BY sort_order ASC, created_at ASC")
        .map_err(|e| e.to_string())?
        .query_map(params![payload.from_column_id], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    for (i, card_id) in remaining.iter().enumerate() {
        conn.execute(
            "UPDATE kanban_cards SET sort_order = ?1 WHERE id = ?2",
            params![i as i64, card_id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[derive(Debug, Deserialize)]
pub struct ReorderCardsPayload {
    pub column_id: String,
    pub card_ids: Vec<String>,
}

#[tauri::command]
pub fn reorder_kanban_cards(
    state: State<DbState>,
    payload: ReorderCardsPayload,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    for (i, card_id) in payload.card_ids.iter().enumerate() {
        conn.execute(
            "UPDATE kanban_cards SET sort_order = ?1 WHERE id = ?2 AND column_id = ?3",
            params![i as i64, card_id, payload.column_id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn uuid_v4() -> String {
    uuid::Uuid::new_v4().to_string()
}

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn setup_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1, client_id TEXT NOT NULL, title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL);
             CREATE TABLE IF NOT EXISTS kanban_boards (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, name TEXT NOT NULL DEFAULT 'Main Board', created_at TEXT NOT NULL);
             CREATE TABLE IF NOT EXISTS kanban_columns (id TEXT PRIMARY KEY, board_id TEXT NOT NULL, name TEXT NOT NULL, color TEXT, sort_order INTEGER NOT NULL DEFAULT 0, wip_limit INTEGER, created_at TEXT NOT NULL);
             CREATE TABLE IF NOT EXISTS kanban_cards (id TEXT PRIMARY KEY, column_id TEXT NOT NULL, project_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT, priority TEXT NOT NULL DEFAULT 'medium', hours_estimated REAL, hours_actual REAL, due_date TEXT, labels TEXT NOT NULL DEFAULT '[]', assignee TEXT, sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);",
        )
        .unwrap();
        conn.execute("INSERT INTO projects (id, user_id, client_id, title, status, created_at) VALUES ('proj-1', 1, 'client-1', 'Test', 'active', '2024-01-01T00:00:00Z')", []).unwrap();
        conn
    }

    #[test]
    fn test_uuid_v4_is_valid() {
        let id = uuid_v4();
        assert_eq!(id.len(), 36);
        assert_eq!(id.chars().filter(|&c| c == '-').count(), 4);
    }

    #[test]
    fn test_now_iso_format() {
        let ts = now_iso();
        assert!(ts.contains('T'));
        assert!(ts.ends_with('Z') || ts.contains('+'));
    }

    #[test]
    fn test_create_board_and_columns() {
        let conn = setup_db();
        let board_id = uuid_v4();
        let now = now_iso();
        let project_id = "proj-1";

        conn.execute(
            "INSERT INTO kanban_boards (id, project_id, name, created_at) VALUES (?1, ?2, 'Main Board', ?3)",
            params![board_id, project_id, now],
        )
        .unwrap();

        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM kanban_boards WHERE project_id = ?1",
                params![project_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 1);

        let columns = [
            ("Backlog", "#6B7280", 0),
            ("In Progress", "#3B82F6", 1),
            ("Review", "#F59E0B", 2),
            ("Done", "#10B981", 3),
        ];
        for (name, color, order) in &columns {
            let cid = uuid_v4();
            conn.execute(
                "INSERT INTO kanban_columns (id, board_id, name, color, sort_order, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![cid, board_id, name, color, order, now],
            )
            .unwrap();
        }

        let col_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM kanban_columns WHERE board_id = ?1",
                params![board_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(col_count, 4);
    }

    #[test]
    fn test_create_and_move_card() {
        let conn = setup_db();
        let board_id = uuid_v4();
        let now = now_iso();
        let project_id = "proj-1";

        conn.execute("INSERT INTO kanban_boards (id, project_id, name, created_at) VALUES (?1, ?2, 'Main Board', ?3)", params![board_id, project_id, now]).unwrap();

        let col1_id = uuid_v4();
        let col2_id = uuid_v4();
        conn.execute("INSERT INTO kanban_columns (id, board_id, name, color, sort_order, created_at) VALUES (?1, ?2, 'Backlog', '#6B7280', 0, ?3)", params![col1_id, board_id, now]).unwrap();
        conn.execute("INSERT INTO kanban_columns (id, board_id, name, color, sort_order, created_at) VALUES (?1, ?2, 'Done', '#10B981', 1, ?3)", params![col2_id, board_id, now]).unwrap();

        let card_id = uuid_v4();
        conn.execute(
            "INSERT INTO kanban_cards (id, column_id, project_id, title, sort_order, created_at) VALUES (?1, ?2, ?3, 'Test Card', 0, ?4)",
            params![card_id, col1_id, project_id, now],
        )
        .unwrap();

        let title: String = conn
            .query_row("SELECT title FROM kanban_cards WHERE id = ?1", params![card_id], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(title, "Test Card");

        conn.execute(
            "UPDATE kanban_cards SET column_id = ?1, sort_order = 0 WHERE id = ?2",
            params![col2_id, card_id],
        )
        .unwrap();

        let col: String = conn
            .query_row(
                "SELECT column_id FROM kanban_cards WHERE id = ?1",
                params![card_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(col, col2_id);
    }

    #[test]
    fn test_reorder_columns() {
        let conn = setup_db();
        let board_id = uuid_v4();
        let now = now_iso();
        let project_id = "proj-1";

        conn.execute("INSERT INTO kanban_boards (id, project_id, name, created_at) VALUES (?1, ?2, 'Main Board', ?3)", params![board_id, project_id, now]).unwrap();

        let ids: Vec<String> = (0..3).map(|i| {
            let cid = uuid_v4();
            conn.execute("INSERT INTO kanban_columns (id, board_id, name, color, sort_order, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)", params![cid, board_id, format!("Col {i}", i = i), "#000", i, now]).unwrap();
            cid
        }).collect();

        for (i, col_id) in ids.iter().rev().enumerate() {
            conn.execute(
                "UPDATE kanban_columns SET sort_order = ?1 WHERE id = ?2",
                params![i as i64, col_id],
            )
            .unwrap();
        }

        let order: Vec<String> = conn
            .prepare("SELECT id FROM kanban_columns WHERE board_id = ?1 ORDER BY sort_order ASC")
            .unwrap()
            .query_map(params![board_id], |row| row.get(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(order, vec![ids[2].clone(), ids[1].clone(), ids[0].clone()]);
    }
}
