mod ai_client;
mod commands;
pub mod daemon;
mod messages;
mod models;
mod orchestration;
mod storage;
pub mod tokens;

use std::sync::Arc;
use reqwest::Client;
use tokio::sync::Mutex;
use daemon::DshDaemon;
use tauri::Manager;

pub(crate) struct AppState {
    pub http: Client,
    /// Long-timeout client for kernel bridge turns (agent turns with tools
    /// legitimately run for minutes; the shared client stays at 120s).
    pub kernel_http: Client,
    pub daemon: Arc<Mutex<DshDaemon>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let http = ai_client::build_http_client();
    let kernel_http = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(900))
        .build()
        .expect("failed to create kernel HTTP client");
    let daemon = Arc::new(Mutex::new(DshDaemon::new()));

    tauri::Builder::default()
        .manage(AppState { http, kernel_http, daemon })
        .invoke_handler(tauri::generate_handler![
            commands::load_settings,
            commands::save_settings,
            commands::load_history,
            commands::save_history,
            commands::clear_history,
            commands::create_profile,
            commands::delete_profile,
            commands::send_chat,
            commands::execute_orchestration,
            commands::build_orchestration,
            commands::start_harness_daemon,
            commands::stop_harness_daemon,
            commands::get_harness_connection,
            commands::get_system_telemetry,
            commands::open_path_in_explorer,
            commands::get_default_workspace_path,
            commands::minimize_window,
            commands::toggle_maximize_window,
            commands::close_window,
            commands::get_token_statistics,
            commands::reset_token_statistics,
            commands::list_sessions,
            commands::create_session,
            commands::load_session_messages,
            commands::save_session_messages,
            commands::delete_session,
        ])
        .build(tauri::generate_context!())
        .expect("error while building Atrium")
        .run(|app, event| {
            if let tauri::RunEvent::Exit = event {
                // The kernel bridge (and the dsh runtime beneath it) must not
                // outlive the shell.
                let state = app.state::<AppState>();
                let mut daemon = match state.daemon.try_lock() {
                    Ok(guard) => guard,
                    Err(_) => return,
                };
                let _ = tauri::async_runtime::block_on(daemon.stop());
            }
        });
}
