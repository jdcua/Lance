use tauri::Manager;

pub mod commands;
pub mod db;
pub mod server;

pub struct SharedServerPort {
    pub port: u16,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let conn = db::get_connection(app.handle())?;
            db::run_migrations(&conn).expect("Failed to run migrations");

            let db_path = db::get_db_path(app.handle())
                .expect("Failed to get db path")
                .to_str()
                .ok_or("Invalid db path")?
                .to_string();

            let server_handle = server::start_server(db_path)
                .expect("Failed to start share server");
            let port = server_handle.port;

            app.manage(SharedServerPort { port });
            // Leak the handle to keep the server running for the app lifetime
            std::mem::forget(server_handle);

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
            commands::proposals::expire_sent_proposals,
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
            commands::invoices::get_invoice_payments,
            commands::invoices::get_all_invoice_payments,
            commands::invoices::create_invoice_payment,
            commands::invoices::delete_invoice_payment,
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
            commands::imports::get_assets_dir,
            commands::imports::save_asset_file,
            commands::imports::create_attachment,
            commands::imports::get_attachments,
            commands::imports::get_all_attachments,
            commands::imports::delete_attachment,
            commands::imports::rename_attachment,
            commands::imports::move_attachment,
            commands::imports::update_attachment_meta,
            commands::imports::get_asset_stats,
            commands::imports::search_assets,
            commands::metrics::create_metric_definition,
            commands::metrics::get_metric_definitions,
            commands::metrics::update_metric_definition,
            commands::metrics::delete_metric_definition,
            commands::metrics::log_metric_value,
            commands::metrics::get_metric_values,
            commands::metrics::delete_metric_value,
            commands::metrics::get_all_headline_metrics,
            commands::metrics::save_metric_template,
            commands::metrics::get_metric_templates,
            commands::metrics::delete_metric_template,
            commands::follow_ups::log_follow_up,
            commands::follow_ups::get_follow_up_log,
            commands::follow_ups::update_follow_up_status,
            commands::follow_ups::get_all_pending_follow_ups,
            commands::mailto::open_mailto,
            commands::archetypes::get_render_logs,
            commands::archetypes::create_render_log,
            commands::archetypes::delete_render_log,
            commands::archetypes::get_sessions,
            commands::archetypes::create_session,
            commands::archetypes::delete_session,
            commands::archetypes::get_shoots,
            commands::archetypes::create_shoot,
            commands::archetypes::delete_shoot,
            commands::archetypes::get_revisions,
            commands::archetypes::create_revision,
            commands::archetypes::delete_revision,
            commands::archetypes::get_builds,
            commands::archetypes::create_build,
            commands::archetypes::delete_build,
            commands::archetypes::get_keywords,
            commands::archetypes::create_keyword,
            commands::archetypes::update_keyword,
            commands::archetypes::delete_keyword,
            commands::archetypes::get_datasets,
            commands::archetypes::create_dataset,
            commands::archetypes::delete_dataset,
            commands::sharing::create_share_token,
            commands::sharing::get_share_token,
            commands::sharing::get_share_token_for_entity,
            commands::sharing::revoke_share_token,
            commands::sharing::get_portal_activity,
            commands::sharing::get_share_server_port,
            commands::sharing::get_all_share_tokens,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
