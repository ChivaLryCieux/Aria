use std::{fs, path::PathBuf};

use tauri::{AppHandle, Manager};
use uuid::Uuid;

use crate::models::{AiProfile, AppSettings, ChatMessage, ProviderModel};

const SETTINGS_FILE: &str = "settings.json";
const HISTORY_FILE: &str = "chat_history.json";

/// Kernel-aligned seed catalog for profiles that carry no model list yet.
fn seed_models(default: Option<&str>) -> Vec<ProviderModel> {
    let catalog = [
        ("deepseek-flash", Some(1_000_000u64)),
        ("deepseek-v4-pro", Some(1_000_000)),
    ];
    let mut models: Vec<ProviderModel> = catalog
        .iter()
        .map(|(name, ctx)| ProviderModel {
            id: Uuid::new_v4().to_string(),
            name: name.to_string(),
            context_length: *ctx,
        })
        .collect();
    if let Some(name) = default.map(str::trim).filter(|s| !s.is_empty()) {
        if !models.iter().any(|m| m.name == name) {
            models.insert(
                0,
                ProviderModel { id: Uuid::new_v4().to_string(), name: name.to_string(), context_length: None },
            );
        }
    }
    models
}

// ─── Paths ─────────────────────────────────────────────────────

pub fn config_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|err| format!("无法定位应用配置目录: {err}"))?;
    fs::create_dir_all(&dir).map_err(|err| format!("无法创建应用配置目录: {err}"))?;
    Ok(dir)
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(config_dir(app)?.join(SETTINGS_FILE))
}

fn history_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(config_dir(app)?.join(HISTORY_FILE))
}

// ─── Settings ──────────────────────────────────────────────────

fn default_settings() -> AppSettings {
    AppSettings {
        user_name: "我".to_string(),
        ai_profiles: vec![default_profile()],
        orchestration_mode: "dag".to_string(),
        reasoning_effort: None,
        theme_mode: Some("light".to_string()),
        font_size: Some("14px".to_string()),
    }
}

fn default_profile() -> AiProfile {
    AiProfile {
        id: "atrium-prime".to_string(),
        name: "Atrium Prime".to_string(),
        description: String::new(),
        avatar: "ATRIUM".to_string(),
        endpoint: "https://api.deepseek.com/v1/chat/completions".to_string(),
        api_key: String::new(),
        model: "deepseek-flash".to_string(),
        models: seed_models(Some("deepseek-flash")),
        system_prompt: "你是 Atrium 智役中庭的主控智能体（Atrium Prime）。作为装具中枢，你冷静、精确、恪守事实，提供高信息密度、逻辑严谨的工程与技术分析。".to_string(),
        temperature: 0.5,
    }
}

/// Ensure settings have valid defaults.
fn normalize_settings(mut settings: AppSettings) -> AppSettings {
    if settings.ai_profiles.is_empty() {
        settings.ai_profiles = vec![default_profile()];
    }
    if settings.orchestration_mode != "dag" && settings.orchestration_mode != "parallel" {
        settings.orchestration_mode = "dag".to_string();
    }
    for profile in &mut settings.ai_profiles {
        // Legacy settings carry a single `model` string and no list.
        if profile.models.is_empty() {
            profile.models = seed_models(Some(&profile.model));
        }
        if profile.model.trim().is_empty() {
            profile.model = profile.models.first().map(|m| m.name.clone()).unwrap_or_default();
        }
    }
    if let Some(effort) = &settings.reasoning_effort {
        if !["off", "low", "high", "max"].contains(&effort.as_str()) {
            settings.reasoning_effort = None;
        }
    }
    if let Some(theme) = &settings.theme_mode {
        if !["light", "system", "dark"].contains(&theme.as_str()) {
            settings.theme_mode = None;
        }
    }
    if let Some(size) = &settings.font_size {
        if !["13px", "14px", "15px"].contains(&size.as_str()) {
            settings.font_size = None;
        }
    }
    settings
}

pub fn load_settings(app: &AppHandle) -> Result<AppSettings, String> {
    let path = settings_path(app)?;
    if !path.exists() {
        return Ok(default_settings());
    }
    let text = fs::read_to_string(&path).map_err(|err| format!("无法读取设置: {err}"))?;
    let settings: AppSettings =
        serde_json::from_str(&text).map_err(|err| format!("设置文件格式无效: {err}"))?;
    Ok(normalize_settings(settings))
}

pub fn save_settings(app: &AppHandle, settings: &AppSettings) -> Result<(), String> {
    let path = settings_path(app)?;
    let text =
        serde_json::to_string_pretty(settings).map_err(|err| format!("无法序列化设置: {err}"))?;
    let tmp_path = path.with_extension("json.tmp");
    fs::write(&tmp_path, text).map_err(|err| format!("无法保存设置: {err}"))?;
    match fs::rename(&tmp_path, &path) {
        Ok(()) => Ok(()),
        Err(rename_err) if path.exists() => {
            fs::remove_file(&path).map_err(|err| format!("无法替换旧设置文件: {err}"))?;
            fs::rename(tmp_path, path)
                .map_err(|err| format!("无法完成设置保存: {err}; 初次替换失败: {rename_err}"))
        }
        Err(err) => Err(format!("无法完成设置保存: {err}")),
    }
}

// ─── Chat History ──────────────────────────────────────────────

pub fn load_history(app: &AppHandle) -> Result<Vec<ChatMessage>, String> {
    let path = history_path(app)?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let text = fs::read_to_string(&path).map_err(|err| format!("无法读取聊天记录: {err}"))?;
    serde_json::from_str(&text).map_err(|err| format!("聊天记录格式无效: {err}"))
}

pub fn save_history(app: &AppHandle, messages: &[ChatMessage]) -> Result<(), String> {
    let path = history_path(app)?;
    let text = serde_json::to_string_pretty(messages)
        .map_err(|err| format!("无法序列化聊天记录: {err}"))?;
    let tmp_path = path.with_extension("json.tmp");
    fs::write(&tmp_path, text).map_err(|err| format!("无法保存聊天记录: {err}"))?;
    match fs::rename(&tmp_path, &path) {
        Ok(()) => Ok(()),
        Err(rename_err) if path.exists() => {
            fs::remove_file(&path).map_err(|err| format!("无法替换旧聊天记录: {err}"))?;
            fs::rename(tmp_path, path)
                .map_err(|err| format!("无法完成聊天记录保存: {err}; 初次替换失败: {rename_err}"))
        }
        Err(err) => Err(format!("无法完成聊天记录保存: {err}")),
    }
}

pub fn clear_history(app: &AppHandle) -> Result<(), String> {
    let path = history_path(app)?;
    if path.exists() {
        let _ = fs::remove_file(&path);
    }
    let s_dir = sessions_dir(app)?;
    if s_dir.exists() {
        let _ = fs::remove_dir_all(&s_dir);
    }
    Ok(())
}

// ─── Multi-Session Structured Storage ──────────────────────────

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionSummary {
    pub id: String,
    pub title: String,
    pub updated_at: u64,
    pub message_count: usize,
}

fn sessions_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = config_dir(app)?.join("sessions");
    fs::create_dir_all(&dir).map_err(|e| format!("无法创建 sessions 目录: {e}"))?;
    Ok(dir)
}

fn sessions_index_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(sessions_dir(app)?.join("index.json"))
}

pub fn list_sessions(app: &AppHandle) -> Result<Vec<SessionSummary>, String> {
    let path = sessions_index_path(app)?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let text = fs::read_to_string(&path).map_err(|e| format!("无法读取会话索引: {e}"))?;
    serde_json::from_str(&text).map_err(|e| format!("会话索引格式无效: {e}"))
}

pub fn save_session_index(app: &AppHandle, sessions: &[SessionSummary]) -> Result<(), String> {
    let path = sessions_index_path(app)?;
    let text = serde_json::to_string_pretty(sessions).map_err(|e| format!("序列化会话失败: {e}"))?;
    fs::write(path, text).map_err(|e| format!("保存会话索引失败: {e}"))
}

pub fn create_session(app: &AppHandle, title: &str) -> Result<SessionSummary, String> {
    let mut sessions = list_sessions(app).unwrap_or_default();
    let id = Uuid::new_v4().to_string();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let summary = SessionSummary {
        id: id.clone(),
        title: if title.trim().is_empty() { "新任务".to_string() } else { title.trim().to_string() },
        updated_at: now,
        message_count: 0,
    };

    sessions.insert(0, summary.clone());
    save_session_index(app, &sessions)?;
    save_session_messages(app, &id, &[])?;

    Ok(summary)
}

pub fn load_session_messages(app: &AppHandle, session_id: &str) -> Result<Vec<ChatMessage>, String> {
    let path = sessions_dir(app)?.join(format!("{session_id}.json"));
    if !path.exists() {
        return Ok(Vec::new());
    }
    let text = fs::read_to_string(&path).map_err(|e| format!("读取会话消息失败: {e}"))?;
    serde_json::from_str(&text).map_err(|e| format!("消息格式无效: {e}"))
}

pub fn save_session_messages(app: &AppHandle, session_id: &str, messages: &[ChatMessage]) -> Result<(), String> {
    let path = sessions_dir(app)?.join(format!("{session_id}.json"));
    let text = serde_json::to_string_pretty(messages).map_err(|e| format!("序列化消息失败: {e}"))?;
    fs::write(path, text).map_err(|e| format!("写入消息失败: {e}"))?;

    // Update count in index
    let mut sessions = list_sessions(app).unwrap_or_default();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    if let Some(s) = sessions.iter_mut().find(|s| s.id == session_id) {
        s.message_count = messages.len();
        s.updated_at = now;
        if s.title == "新任务" {
            if let Some(first_user) = messages.iter().find(|m| m.role == "user") {
                let first_line = first_user.content.lines().next().unwrap_or(&first_user.content);
                s.title = first_line.chars().take(20).collect();
            }
        }
        let _ = save_session_index(app, &sessions);
    }

    Ok(())
}

pub fn delete_session(app: &AppHandle, session_id: &str) -> Result<(), String> {
    let mut sessions = list_sessions(app).unwrap_or_default();
    sessions.retain(|s| s.id != session_id);
    save_session_index(app, &sessions)?;

    let path = sessions_dir(app)?.join(format!("{session_id}.json"));
    if path.exists() {
        let _ = fs::remove_file(path);
    }
    Ok(())
}

// ─── Create profile ────────────────────────────────────────────

pub fn create_profile() -> AiProfile {
    AiProfile {
        id: Uuid::new_v4().to_string(),
        name: String::new(),
        description: String::new(),
        avatar: "NODE".to_string(),
        endpoint: "https://api.deepseek.com/v1/chat/completions".to_string(),
        api_key: String::new(),
        model: "deepseek-flash".to_string(),
        models: seed_models(Some("deepseek-flash")),
        system_prompt: "你是搭载于 Atrium 智役中庭的高效工程智能体，专注于结构化分析与解决问题。".to_string(),
        temperature: 0.5,
    }
}

pub fn delete_profile(app: &AppHandle, profile_id: &str) -> Result<AppSettings, String> {
    let mut settings = load_settings(app)?;
    settings.ai_profiles.retain(|p| p.id != profile_id);
    if settings.ai_profiles.is_empty() {
        settings.ai_profiles = vec![default_profile()];
    }
    save_settings(app, &settings)?;
    Ok(settings)
}
