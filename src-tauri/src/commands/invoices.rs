use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::db;

#[derive(Debug, Serialize, Deserialize)]
pub struct Invoice {
    pub id: String,
    pub client_id: String,
    pub project_id: Option<String>,
    pub invoice_number: String,
    pub status: String,
    pub line_items: String,
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
pub struct CreateInvoicePayload {
    pub client_id: String,
    pub project_id: Option<String>,
    pub invoice_number: String,
    pub status: String,
    pub line_items: String,
    pub subtotal: f64,
    pub tax_rate: Option<f64>,
    pub total: f64,
    pub due_date: Option<String>,
    pub notes: Option<String>,
    pub currency: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateInvoicePayload {
    pub id: String,
    pub client_id: String,
    pub project_id: Option<String>,
    pub invoice_number: String,
    pub status: String,
    pub line_items: String,
    pub subtotal: f64,
    pub tax_rate: Option<f64>,
    pub total: f64,
    pub due_date: Option<String>,
    pub notes: Option<String>,
    pub currency: Option<String>,
}

#[tauri::command]
pub fn get_invoices(app: AppHandle) -> Result<Vec<Invoice>, String> {
    let conn = db::get_connection(&app)?;
    let mut stmt = conn.prepare("SELECT id, client_id, project_id, invoice_number, status, line_items, subtotal, tax_rate, total, due_date, paid_at, notes, currency, created_at FROM invoices ORDER BY created_at DESC")
        .map_err(|_| "Database operation failed".to_string())?;
    let invoices = stmt
        .query_map([], |row| {
            Ok(Invoice {
                id: row.get(0)?,
                client_id: row.get(1)?,
                project_id: row.get(2)?,
                invoice_number: row.get(3)?,
                status: row.get(4)?,
                line_items: row.get(5)?,
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
pub fn get_invoice(app: AppHandle, id: String) -> Result<Option<Invoice>, String> {
    let conn = db::get_connection(&app)?;
    let mut stmt = conn.prepare("SELECT id, client_id, project_id, invoice_number, status, line_items, subtotal, tax_rate, total, due_date, paid_at, notes, currency, created_at FROM invoices WHERE id = ?")
        .map_err(|_| "Database operation failed".to_string())?;
    Ok(stmt
        .query_row([&id], |row| {
            Ok(Invoice {
                id: row.get(0)?,
                client_id: row.get(1)?,
                project_id: row.get(2)?,
                invoice_number: row.get(3)?,
                status: row.get(4)?,
                line_items: row.get(5)?,
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
pub fn create_invoice(app: AppHandle, payload: CreateInvoicePayload) -> Result<Invoice, String> {
    let conn = db::get_connection(&app)?;
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = super::clients::chrono_now();
    conn.execute(
        "INSERT INTO invoices (id, client_id, project_id, invoice_number, status, line_items, subtotal, tax_rate, total, due_date, notes, currency, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        rusqlite::params![id, payload.client_id, payload.project_id, payload.invoice_number, payload.status, payload.line_items, payload.subtotal, payload.tax_rate, payload.total, payload.due_date, payload.notes, payload.currency, created_at],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(Invoice {
        id,
        client_id: payload.client_id,
        project_id: payload.project_id,
        invoice_number: payload.invoice_number,
        status: payload.status,
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
pub fn update_invoice(app: AppHandle, payload: UpdateInvoicePayload) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    let now = super::clients::chrono_now();
    conn.execute(
        "UPDATE invoices SET client_id = ?1, project_id = ?2, invoice_number = ?3, status = ?4, line_items = ?5, subtotal = ?6, tax_rate = ?7, total = ?8, due_date = ?9, paid_at = CASE WHEN status = 'paid' AND (SELECT status FROM invoices WHERE id = ?10) != 'paid' THEN ?11 ELSE paid_at END, notes = ?12, currency = ?13 WHERE id = ?10",
        rusqlite::params![payload.client_id, payload.project_id, payload.invoice_number, payload.status, payload.line_items, payload.subtotal, payload.tax_rate, payload.total, payload.due_date, payload.id, now, payload.notes, payload.currency],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_invoice(app: AppHandle, id: String) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    conn.execute("DELETE FROM invoices WHERE id = ?", [&id])
        .map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

// ── Invoice Payments ──

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
pub struct CreatePaymentPayload {
    pub invoice_id: String,
    pub amount: f64,
    pub payment_date: String,
    pub payment_method: String,
    pub reference: Option<String>,
    pub notes: Option<String>,
}

#[tauri::command]
pub fn get_invoice_payments(app: AppHandle, invoice_id: String) -> Result<Vec<InvoicePayment>, String> {
    let conn = db::get_connection(&app)?;
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
pub fn create_invoice_payment(app: AppHandle, payload: CreatePaymentPayload) -> Result<InvoicePayment, String> {
    let conn = db::get_connection(&app)?;
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = super::clients::chrono_now();
    conn.execute(
        "INSERT INTO invoice_payments (id, invoice_id, amount, payment_date, payment_method, reference, notes, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![id, payload.invoice_id, payload.amount, payload.payment_date, payload.payment_method, payload.reference, payload.notes, created_at],
    ).map_err(|_| "Database operation failed".to_string())?;
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

#[tauri::command]
pub fn get_all_invoice_payments(app: AppHandle) -> Result<Vec<InvoicePayment>, String> {
    let conn = db::get_connection(&app)?;
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
pub fn delete_invoice_payment(app: AppHandle, id: String) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    conn.execute("DELETE FROM invoice_payments WHERE id = ?", [&id])
        .map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

// ── Recurring Invoices ──

#[derive(Debug, Serialize, Deserialize)]
pub struct RecurringInvoice {
    pub id: String,
    pub client_id: String,
    pub project_id: Option<String>,
    pub title: String,
    pub frequency: String,
    pub line_items: String,
    pub subtotal: f64,
    pub tax_rate: Option<f64>,
    pub total: f64,
    pub notes: Option<String>,
    pub active: bool,
    pub next_due: String,
    pub last_generated: Option<String>,
    pub created_at: String,
}

#[tauri::command]
pub fn get_recurring_invoices(app: AppHandle) -> Result<Vec<RecurringInvoice>, String> {
    let conn = db::get_connection(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, client_id, project_id, title, frequency, line_items, subtotal, tax_rate, total, notes, active, next_due, last_generated, created_at FROM recurring_invoices ORDER BY next_due ASC")
        .map_err(|_| "Database operation failed".to_string())?;
    let items = stmt
        .query_map([], |row| {
            Ok(RecurringInvoice {
                id: row.get(0)?,
                client_id: row.get(1)?,
                project_id: row.get(2)?,
                title: row.get(3)?,
                frequency: row.get(4)?,
                line_items: row.get(5)?,
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
    Ok(items)
}

#[derive(Debug, Deserialize)]
pub struct CreateRecurringInvoicePayload {
    pub client_id: String,
    pub project_id: Option<String>,
    pub title: String,
    pub frequency: String,
    pub line_items: String,
    pub subtotal: f64,
    pub tax_rate: Option<f64>,
    pub total: f64,
    pub notes: Option<String>,
    pub active: bool,
    pub next_due: String,
}

#[tauri::command]
pub fn create_recurring_invoice(
    app: AppHandle,
    payload: CreateRecurringInvoicePayload,
) -> Result<RecurringInvoice, String> {
    let conn = db::get_connection(&app)?;
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = super::clients::chrono_now();
    conn.execute(
        "INSERT INTO recurring_invoices (id, client_id, project_id, title, frequency, line_items, subtotal, tax_rate, total, notes, active, next_due, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        rusqlite::params![id, payload.client_id, payload.project_id, payload.title, payload.frequency, payload.line_items, payload.subtotal, payload.tax_rate, payload.total, payload.notes, payload.active as i32, payload.next_due, created_at],
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
        active: payload.active,
        next_due: payload.next_due,
        last_generated: None,
        created_at,
    })
}

#[tauri::command]
pub fn update_recurring_invoice(app: AppHandle, payload: RecurringInvoice) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    conn.execute(
        "UPDATE recurring_invoices SET client_id = ?1, project_id = ?2, title = ?3, frequency = ?4, line_items = ?5, subtotal = ?6, tax_rate = ?7, total = ?8, notes = ?9, active = ?10, next_due = ?11, last_generated = ?12 WHERE id = ?13",
        rusqlite::params![payload.client_id, payload.project_id, payload.title, payload.frequency, payload.line_items, payload.subtotal, payload.tax_rate, payload.total, payload.notes, payload.active as i32, payload.next_due, payload.last_generated, payload.id],
    ).map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_recurring_invoice(app: AppHandle, id: String) -> Result<(), String> {
    let conn = db::get_connection(&app)?;
    conn.execute("DELETE FROM recurring_invoices WHERE id = ?", [&id])
        .map_err(|_| "Database operation failed".to_string())?;
    Ok(())
}
