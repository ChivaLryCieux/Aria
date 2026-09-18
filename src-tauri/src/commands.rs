use tauri::{AppHandle, State};

use crate::models::{
    AiProfile, AppSettings, ChatMessage, ChatRequest, ChatResponse, OrchestrationRequest,
};
use crate::orchestration;
use crate::storage;

// ─── Settings ──────────────────────────────────────────────────

#[tauri::command]
pub fn load_settings(app: AppHandle) -> Result<AppSettings, String> {
    storage::load_settings(&app)
}

#[tauri::command]
pub fn save_settings(app: AppHandle, settings: AppSettings) -> Result<(), String> {
    storage::save_settings(&app, &settings)
}

// ─── Chat History ──────────────────────────────────────────────

#[tauri::command]
pub fn load_history(app: AppHandle) -> Result<Vec<ChatMessage>, String> {
    storage::load_history(&app)
}

#[tauri::command]
pub fn save_history(app: AppHandle, messages: Vec<ChatMessage>) -> Result<(), String> {
    storage::save_history(&app, &messages)
}

#[tauri::command]
pub fn clear_history(app: AppHandle) -> Result<(), String> {
    storage::clear_history(&app)
}

// ─── Profile management ────────────────────────────────────────

#[tauri::command]
pub fn create_profile() -> AiProfile {
    storage::create_profile()
}

// ─── Single chat call (kept for direct use) ────────────────────

#[tauri::command]
pub async fn send_chat(
    state: State<'_, crate::AppState>,
    request: ChatRequest,
) -> Result<ChatResponse, String> {
    crate::ai_client::send_openai_compatible(&state.http, &request.profile, &request.messages)
        .await
        .map_err(|err| err.to_string())
}

// ─── Orchestration ─────────────────────────────────────────────

#[tauri::command]
pub async fn execute_orchestration(
    app: AppHandle,
    state: State<'_, crate::AppState>,
    request: OrchestrationRequest,
) -> Result<Vec<ChatMessage>, String> {
    let replies =
        orchestration::execute(&app, &state.http, &request.profiles, &request.messages, &request.mode).await;
    Ok(replies)
}

#[tauri::command]
pub fn build_orchestration(profiles: Vec<AiProfile>) -> Vec<crate::models::OrchestrationStage> {
    orchestration::build_stages(&profiles)
}

// ─── DSH Core Daemon Controls ──────────────────────────────────

#[tauri::command]
pub async fn start_harness_daemon(
    state: State<'_, crate::AppState>,
) -> Result<crate::daemon::HarnessConnection, String> {
    let mut daemon = state.daemon.lock().await;
    daemon.start().await
}

#[tauri::command]
pub async fn stop_harness_daemon(
    state: State<'_, crate::AppState>,
) -> Result<(), String> {
    let mut daemon = state.daemon.lock().await;
    daemon.stop().await
}

#[tauri::command]
pub async fn get_harness_connection(
    state: State<'_, crate::AppState>,
) -> Result<crate::daemon::HarnessConnection, String> {
    let daemon = state.daemon.lock().await;
    Ok(daemon.connection.clone())
}

// ─── Native System Bridges ─────────────────────────────────────

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemTelemetry {
    pub os: String,
    pub arch: String,
    pub core_count: usize,
    pub hostname: String,
    pub app_version: String,
}

#[tauri::command]
pub fn get_system_telemetry() -> SystemTelemetry {
    let cores = std::thread::available_parallelism().map(|n| n.get()).unwrap_or(4);
    let host = std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "ARIA-TERMINAL".to_string());

    SystemTelemetry {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        core_count: cores,
        hostname: host,
        app_version: env!("CARGO_PKG_VERSION").to_string(),
    }
}

#[tauri::command]
pub fn open_path_in_explorer(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("无法打开目录: {e}"))?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = path;
    }
    Ok(())
}

#[tauri::command]
pub fn get_default_workspace_path(app: AppHandle) -> Result<String, String> {
    storage::config_dir(&app).map(|p| p.to_string_lossy().to_string())
}

// ─── Native Window Frame Controls ──────────────────────────────

#[tauri::command]
pub fn minimize_window(window: tauri::Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_maximize_window(window: tauri::Window) -> Result<(), String> {
    if window.is_maximized().unwrap_or(false) {
        window.unmaximize().map_err(|e| e.to_string())
    } else {
        window.maximize().map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn close_window(window: tauri::Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

// ─── Token Statistics ──────────────────────────────────────────

#[tauri::command]
pub fn get_token_statistics(app: AppHandle) -> crate::tokens::TokenMetrics {
    crate::tokens::load_metrics(&app)
}

#[tauri::command]
pub fn reset_token_statistics(app: AppHandle) -> Result<crate::tokens::TokenMetrics, String> {
    crate::tokens::reset_metrics(&app)
}

// ─── Multi-Session Storage ─────────────────────────────────────

#[tauri::command]
pub fn list_sessions(app: AppHandle) -> Result<Vec<storage::SessionSummary>, String> {
    storage::list_sessions(&app)
}

#[tauri::command]
pub fn create_session(app: AppHandle, title: Option<String>) -> Result<storage::SessionSummary, String> {
    let t = title.unwrap_or_default();
    storage::create_session(&app, &t)
}

#[tauri::command]
pub fn load_session_messages(app: AppHandle, session_id: String) -> Result<Vec<ChatMessage>, String> {
    storage::load_session_messages(&app, &session_id)
}

#[tauri::command]
pub fn save_session_messages(
    app: AppHandle,
    session_id: String,
    messages: Vec<ChatMessage>,
) -> Result<(), String> {
    storage::save_session_messages(&app, &session_id, &messages)
}

#[tauri::command]
pub fn delete_session(app: AppHandle, session_id: String) -> Result<(), String> {
    storage::delete_session(&app, &session_id)
}

