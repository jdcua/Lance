pub mod commands;
pub mod db;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        // TODO: Re-enable updater when endpoint is live
        // .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let conn = db::get_connection(app.handle())?;
            db::run_migrations(&conn).expect("Failed to run migrations");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::clients::get_clients,
            commands::clients::get_client,
            commands::clients::create_client,
            commands::clients::update_client,
            commands::clients::delete_client,
            commands::projects::get_projects,
            commands::projects::get_project,
            commands::projects::create_project,
            commands::projects::update_project,
            commands::projects::delete_project,
            commands::projects::get_milestones,
            commands::projects::create_milestone,
            commands::projects::update_milestone,
            commands::projects::delete_milestone,
            commands::proposals::get_proposals,
            commands::proposals::get_proposal,
            commands::proposals::create_proposal,
            commands::proposals::update_proposal,
            commands::proposals::delete_proposal,
            commands::contracts::get_contracts,
            commands::contracts::get_contract,
            commands::contracts::create_contract,
            commands::contracts::update_contract,
            commands::contracts::delete_contract,
            commands::time::get_time_entries,
            commands::time::get_time_entry,
            commands::time::create_time_entry,
            commands::time::update_time_entry,
            commands::time::delete_time_entry,
            commands::invoices::get_invoices,
            commands::invoices::get_invoice,
            commands::invoices::create_invoice,
            commands::invoices::update_invoice,
            commands::invoices::delete_invoice,
            commands::invoices::get_recurring_invoices,
            commands::invoices::create_recurring_invoice,
            commands::invoices::update_recurring_invoice,
            commands::invoices::delete_recurring_invoice,
            commands::finance::get_expenses,
            commands::finance::create_expense,
            commands::finance::update_expense,
            commands::finance::delete_expense,
            commands::finance::get_user_profile,
            commands::finance::upsert_user_profile,
            commands::finance::delete_user_profile,
            commands::communications::get_communications,
            commands::communications::create_communication,
            commands::communications::update_communication,
            commands::communications::delete_communication,
            commands::imports::get_imports_dir,
            commands::imports::save_import_file,
            commands::imports::log_import,
            commands::imports::get_import_log,
            commands::imports::create_attachment,
            commands::imports::get_attachments,
            commands::imports::get_all_attachments,
            commands::imports::delete_attachment,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
