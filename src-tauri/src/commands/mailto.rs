use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

/// Opens the system default email client via mailto: URL.
///
/// TODO v1.5: SMTP integration
/// Allow users to configure SMTP credentials (host, port, user, password, from address)
/// stored encrypted in SQLite. Use lettre (Rust SMTP crate) in lib.rs to send directly.
/// Remove mailto: approach, replace with Tauri command: send_email(to, subject, body)
/// This enables true auto-send without opening the mail client.
#[tauri::command]
#[allow(deprecated)]
pub fn open_mailto(app: AppHandle, mailto_url: String) -> Result<(), String> {
    app.shell()
        .open(mailto_url, None)
        .map_err(|e| format!("Failed to open mailto link: {}", e))?;
    Ok(())
}
