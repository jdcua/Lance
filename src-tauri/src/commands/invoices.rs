use crate::db::DbState;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize)]
pub struct Invoice {
    pub id: String,
    pub client_id: String,
    pub project_id: Option<String>,
    pub invoice_number: String,
    pub status: String,
    pub line_items: serde_json::Value,
    pub subtotal: f64,
    pub tax_rate: Option<f64>,
    pub total: f64,
    pub due_date: Option<String>,
    pub paid_at: Option<String>,
    pub notes: Option<String>,
    pub currency: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CreateInvoicePayload {
    pub client_id: String,
    pub project_id: Option<String>,
    pub invoice_number: String,
    pub status: Option<String>,
    pub line_items: serde_json::Value,
    pub subtotal: f64,
    pub tax_rate: Option<f64>,
    pub total: f64,
    pub due_date: Option<String>,
    pub notes: Option<String>,
    pub currency: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct UpdateInvoicePayload {
    pub id: String,
    pub client_id: String,
    pub project_id: Option<String>,
    pub invoice_number: String,
    pub status: String,
    pub line_items: serde_json::Value,
    pub subtotal: f64,
    pub tax_rate: Option<f64>,
    pub total: f64,
    pub due_date: Option<String>,
    pub paid_at: Option<String>,
    pub notes: Option<String>,
    pub currency: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InvoicePayment {
    pub id: String,
    pub invoice_id: String,
    pub amount: f64,
    pub payment_date: String,
    pub payment_method: String,
    pub reference: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CreatePaymentPayload {
    pub invoice_id: String,
    pub amount: f64,
    pub payment_date: String,
    pub payment_method: String,
    pub reference: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RecurringInvoice {
    pub id: String,
    pub client_id: String,
    pub project_id: Option<String>,
    pub title: String,
    pub frequency: String,
    pub line_items: serde_json::Value,
    pub subtotal: f64,
    pub tax_rate: Option<f64>,
    pub total: f64,
    pub notes: Option<String>,
    pub active: bool,
    pub next_due: String,
    pub last_generated: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CreateRecurringInvoicePayload {
    pub client_id: String,
    pub project_id: Option<String>,
    pub title: String,
    pub frequency: String,
    pub line_items: serde_json::Value,
    pub subtotal: f64,
    pub tax_rate: Option<f64>,
    pub total: f64,
    pub notes: Option<String>,
    pub next_due: String,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct UpdateRecurringInvoicePayload {
    pub id: String,
    pub client_id: String,
    pub project_id: Option<String>,
    pub title: String,
    pub frequency: String,
    pub line_items: serde_json::Value,
    pub subtotal: f64,
    pub tax_rate: Option<f64>,
    pub total: f64,
    pub notes: Option<String>,
    pub active: Option<bool>,
    pub next_due: String,
    pub last_generated: Option<String>,
}

// ── Invoice CRUD ──

#[tauri::command]
pub fn get_invoices(app: tauri::AppHandle) -> Result<Vec<Invoice>, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut stmt = conn
        .prepare("SELECT id, client_id, project_id, invoice_number, status, line_items, subtotal, tax_rate, total, due_date, paid_at, notes, currency, created_at FROM invoices ORDER BY created_at DESC")
        .map_err(|_| "Database operation failed".to_string())?;
    let invoices = stmt
        .query_map([], |row| {
            let line_items_str: String = row.get(5)?;
            Ok(Invoice {
                id: row.get(0)?,
                client_id: row.get(1)?,
                project_id: row.get(2)?,
                invoice_number: row.get(3)?,
                status: row.get(4)?,
                line_items: serde_json::from_str(&line_items_str).unwrap_or(serde_json::json!([])),
                subtotal: row.get(6)?,
                tax_rate: row.get(7)?,
                total: row.get(8)?,
                due_date: row.get(9)?,
                paid_at: row.get(10)?,
                notes: row.get(11)?,
                currency: row.get(12)?,
                created_at: row.get(13)?,
            })
        })
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(invoices)
}

#[tauri::command]
pub fn get_invoice(app: tauri::AppHandle, id: String) -> Result<Option<Invoice>, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut stmt = conn
        .prepare("SELECT id, client_id, project_id, invoice_number, status, line_items, subtotal, tax_rate, total, due_date, paid_at, notes, currency, created_at FROM invoices WHERE id = ?")
        .map_err(|_| "Database operation failed".to_string())?;
    Ok(stmt
        .query_row([&id], |row| {
            let line_items_str: String = row.get(5)?;
            Ok(Invoice {
                id: row.get(0)?,
                client_id: row.get(1)?,
                project_id: row.get(2)?,
                invoice_number: row.get(3)?,
                status: row.get(4)?,
                line_items: serde_json::from_str(&line_items_str).unwrap_or(serde_json::json!([])),
                subtotal: row.get(6)?,
                tax_rate: row.get(7)?,
                total: row.get(8)?,
                due_date: row.get(9)?,
                paid_at: row.get(10)?,
                notes: row.get(11)?,
                currency: row.get(12)?,
                created_at: row.get(13)?,
            })
        })
        .ok())
}

#[tauri::command]
pub fn create_invoice(
    app: tauri::AppHandle,
    payload: CreateInvoicePayload,
) -> Result<Invoice, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();
    let status = payload.status.unwrap_or_else(|| "draft".to_string());
    let line_items_str = payload.line_items.to_string();
    conn.execute(
        "INSERT INTO invoices (id, client_id, project_id, invoice_number, status, line_items, subtotal, tax_rate, total, due_date, notes, currency, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        rusqlite::params![id, payload.client_id, payload.project_id, payload.invoice_number, status, line_items_str, payload.subtotal, payload.tax_rate, payload.total, payload.due_date, payload.notes, payload.currency, created_at],
    ).map_err(|e| format!("Database operation failed: {}", e))?;
    Ok(Invoice {
        id,
        client_id: payload.client_id,
        project_id: payload.project_id,
        invoice_number: payload.invoice_number,
        status,
        line_items: payload.line_items,
        subtotal: payload.subtotal,
        tax_rate: payload.tax_rate,
        total: payload.total,
        due_date: payload.due_date,
        paid_at: None,
        notes: payload.notes,
        currency: payload.currency,
        created_at,
    })
}

#[tauri::command]
pub fn update_invoice(app: tauri::AppHandle, payload: UpdateInvoicePayload) -> Result<(), String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let line_items_str = payload.line_items.to_string();
    conn.execute(
        "UPDATE invoices SET client_id = ?1, project_id = ?2, invoice_number = ?3, status = ?4, line_items = ?5, subtotal = ?6, tax_rate = ?7, total = ?8, due_date = ?9, paid_at = ?10, notes = ?11, currency = ?12 WHERE id = ?13",
        rusqlite::params![payload.client_id, payload.project_id, payload.invoice_number, payload.status, line_items_str, payload.subtotal, payload.tax_rate, payload.total, payload.due_date, payload.paid_at, payload.notes, payload.currency, payload.id],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_invoice(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    conn.execute("DELETE FROM invoices WHERE id = ?", [&id])
        .map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

// ── Invoice Payments ──

#[tauri::command]
pub fn get_invoice_payments(
    app: tauri::AppHandle,
    invoice_id: String,
) -> Result<Vec<InvoicePayment>, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut stmt = conn
        .prepare("SELECT id, invoice_id, amount, payment_date, payment_method, reference, notes, created_at FROM invoice_payments WHERE invoice_id = ? ORDER BY payment_date DESC")
        .map_err(|_| "Database operation failed".to_string())?;
    let payments = stmt
        .query_map([&invoice_id], |row| {
            Ok(InvoicePayment {
                id: row.get(0)?,
                invoice_id: row.get(1)?,
                amount: row.get(2)?,
                payment_date: row.get(3)?,
                payment_method: row.get(4)?,
                reference: row.get(5)?,
                notes: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(payments)
}

#[tauri::command]
pub fn get_all_invoice_payments(app: tauri::AppHandle) -> Result<Vec<InvoicePayment>, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut stmt = conn
        .prepare("SELECT id, invoice_id, amount, payment_date, payment_method, reference, notes, created_at FROM invoice_payments ORDER BY payment_date DESC")
        .map_err(|_| "Database operation failed".to_string())?;
    let payments = stmt
        .query_map([], |row| {
            Ok(InvoicePayment {
                id: row.get(0)?,
                invoice_id: row.get(1)?,
                amount: row.get(2)?,
                payment_date: row.get(3)?,
                payment_method: row.get(4)?,
                reference: row.get(5)?,
                notes: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(payments)
}

#[tauri::command]
pub fn create_invoice_payment(
    app: tauri::AppHandle,
    payload: CreatePaymentPayload,
) -> Result<InvoicePayment, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();

    // Atomic: the payment row and the derived invoice status must land
    // together. Previously the INSERT committed, then the status UPDATE ran
    // separately with its error discarded (`let _ =`), so a failure between
    // them left a recorded payment against a still-unpaid invoice. The client
    // recomputes status itself, but the database is the source of truth for
    // exports, reports, and the portal.
    let tx = conn.unchecked_transaction().map_err(|_| "Database operation failed".to_string())?;

    tx.execute(
        "INSERT INTO invoice_payments (id, invoice_id, amount, payment_date, payment_method, reference, notes, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![id, payload.invoice_id, payload.amount, payload.payment_date, payload.payment_method, payload.reference, payload.notes, created_at],
    ).map_err(|_| "Database operation failed".to_string())?;

    // Summed and compared in integer CENTS. A raw f64 comparison is the bug
    // that made a displayed balance unpayable: 3 x 10.005 stores as 30.015 but
    // renders as $30.02, and `30.015 >= 30.02` is false. See the same fix in
    // src/screens/Invoices.tsx.
    let total_paid: f64 = tx
        .query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM invoice_payments WHERE invoice_id = ?",
            [&payload.invoice_id],
            |row| row.get(0),
        )
        .unwrap_or(0.0);
    let invoice_total: f64 = tx
        .query_row("SELECT total FROM invoices WHERE id = ?", [&payload.invoice_id], |row| {
            row.get(0)
        })
        .unwrap_or(0.0);
    let new_status = if cents(total_paid) >= cents(invoice_total) {
        "paid"
    } else if cents(total_paid) > 0 {
        "partial"
    } else {
        "sent"
    };
    tx.execute(
        "UPDATE invoices SET status = ?1 WHERE id = ?2 AND status NOT IN ('paid', 'draft')",
        rusqlite::params![new_status, payload.invoice_id],
    )
    .map_err(|_| "Database operation failed".to_string())?;

    tx.commit().map_err(|_| "Database operation failed".to_string())?;

    Ok(InvoicePayment {
        id,
        invoice_id: payload.invoice_id,
        amount: payload.amount,
        payment_date: payload.payment_date,
        payment_method: payload.payment_method,
        reference: payload.reference,
        notes: payload.notes,
        created_at,
    })
}

/// Round a currency amount to whole cents for comparison purposes.
fn cents(amount: f64) -> i64 {
    (amount * 100.0).round() as i64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn whole_and_fractional_amounts_round_to_cents() {
        assert_eq!(cents(0.0), 0);
        assert_eq!(cents(1.0), 100);
        assert_eq!(cents(12.34), 1234);
    }

    #[test]
    fn half_cents_round_away_from_zero() {
        assert_eq!(cents(0.005), 1);
        assert_eq!(cents(-0.005), -1);
    }

    #[test]
    fn binary_float_noise_does_not_change_the_cent() {
        assert_eq!(cents(0.1 + 0.2), 30);
        assert_eq!(cents(19.99), 1999);
    }

    #[test]
    fn negative_amounts_keep_their_sign() {
        assert_eq!(cents(-42.5), -4250);
    }
}

#[tauri::command]
pub fn delete_invoice_payment(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    conn.execute("DELETE FROM invoice_payments WHERE id = ?", [&id])
        .map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

// ── Recurring Invoices ──

#[tauri::command]
pub fn get_recurring_invoices(app: tauri::AppHandle) -> Result<Vec<RecurringInvoice>, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut stmt = conn
        .prepare("SELECT id, client_id, project_id, title, frequency, line_items, subtotal, tax_rate, total, notes, active, next_due, last_generated, created_at FROM recurring_invoices ORDER BY created_at DESC")
        .map_err(|_| "Database operation failed".to_string())?;
    let invoices = stmt
        .query_map([], |row| {
            let line_items_str: String = row.get(5)?;
            Ok(RecurringInvoice {
                id: row.get(0)?,
                client_id: row.get(1)?,
                project_id: row.get(2)?,
                title: row.get(3)?,
                frequency: row.get(4)?,
                line_items: serde_json::from_str(&line_items_str).unwrap_or(serde_json::json!([])),
                subtotal: row.get(6)?,
                tax_rate: row.get(7)?,
                total: row.get(8)?,
                notes: row.get(9)?,
                active: row.get::<_, i32>(10)? != 0,
                next_due: row.get(11)?,
                last_generated: row.get(12)?,
                created_at: row.get(13)?,
            })
        })
        .map_err(|_| "Database operation failed".to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(invoices)
}

#[tauri::command]
pub fn create_recurring_invoice(
    app: tauri::AppHandle,
    payload: CreateRecurringInvoicePayload,
) -> Result<RecurringInvoice, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();
    let line_items_str = payload.line_items.to_string();
    conn.execute(
        "INSERT INTO recurring_invoices (id, client_id, project_id, title, frequency, line_items, subtotal, tax_rate, total, notes, active, next_due, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 1, ?11, ?12)",
        rusqlite::params![id, payload.client_id, payload.project_id, payload.title, payload.frequency, line_items_str, payload.subtotal, payload.tax_rate, payload.total, payload.notes, payload.next_due, created_at],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(RecurringInvoice {
        id,
        client_id: payload.client_id,
        project_id: payload.project_id,
        title: payload.title,
        frequency: payload.frequency,
        line_items: payload.line_items,
        subtotal: payload.subtotal,
        tax_rate: payload.tax_rate,
        total: payload.total,
        notes: payload.notes,
        active: true,
        next_due: payload.next_due,
        last_generated: None,
        created_at,
    })
}

#[tauri::command]
pub fn update_recurring_invoice(
    app: tauri::AppHandle,
    payload: UpdateRecurringInvoicePayload,
) -> Result<(), String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let active = payload.active.unwrap_or(true) as i32;
    let line_items_str = payload.line_items.to_string();
    conn.execute(
        "UPDATE recurring_invoices SET client_id = ?1, project_id = ?2, title = ?3, frequency = ?4, line_items = ?5, subtotal = ?6, tax_rate = ?7, total = ?8, notes = ?9, active = ?10, next_due = ?11, last_generated = ?12 WHERE id = ?13",
        rusqlite::params![payload.client_id, payload.project_id, payload.title, payload.frequency, line_items_str, payload.subtotal, payload.tax_rate, payload.total, payload.notes, active, payload.next_due, payload.last_generated, payload.id],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_recurring_invoice(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    conn.execute("DELETE FROM recurring_invoices WHERE id = ?", [&id])
        .map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}
