mod ai_client;
mod commands;
pub mod daemon;
mod messages;
mod models;
mod orchestration;
mod storage;

use std::sync::Arc;
use reqwest::Client;
use tokio::sync::Mutex;
use daemon::DshDaemon;

pub(crate) struct AppState {
    pub http: Client,
    pub daemon: Arc<Mutex<DshDaemon>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let http = ai_client::build_http_client();
    let daemon = Arc::new(Mutex::new(DshDaemon::new()));

    tauri::Builder::default()
        .manage(AppState { http, daemon })
        .invoke_handler(tauri::generate_handler![
            commands::load_settings,
            commands::save_settings,
            commands::load_history,
            commands::save_history,
            commands::clear_history,
            commands::create_profile,
            commands::send_chat,
            commands::execute_orchestration,
            commands::build_orchestration,
            commands::start_harness_daemon,
            commands::stop_harness_daemon,
            commands::get_harness_connection,
            commands::get_system_telemetry,
            commands::open_path_in_explorer,
            commands::get_default_workspace_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Aria");
}
