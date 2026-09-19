use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelUsageStats {
    pub model_name: String,
    pub prompt_tokens: usize,
    pub completion_tokens: usize,
    pub request_count: usize,
    pub total_latency_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct TokenMetrics {
    pub total_prompt_tokens: usize,
    pub total_completion_tokens: usize,
    pub total_requests: usize,
    pub total_latency_ms: u64,
    #[serde(default)]
    pub models: Vec<ModelUsageStats>,
    #[serde(default)]
    pub projects: Vec<ProjectUsageStats>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ProjectUsageStats {
    pub project_id: String,
    pub project_name: String,
    pub prompt_tokens: usize,
    pub completion_tokens: usize,
    pub request_count: usize,
    pub total_latency_ms: u64,
    #[serde(default)]
    pub models: Vec<ModelUsageStats>,
}

fn metrics_file(app: &AppHandle) -> Result<PathBuf, String> {
    crate::storage::config_dir(app).map(|dir| dir.join("token_metrics.json"))
}

pub fn load_metrics(app: &AppHandle) -> TokenMetrics {
    let path = match metrics_file(app) {
        Ok(p) => p,
        Err(_) => return TokenMetrics::default(),
    };

    if !path.exists() {
        return TokenMetrics::default();
    }

    match fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
        Err(_) => TokenMetrics::default(),
    }
}

pub fn save_metrics(app: &AppHandle, metrics: &TokenMetrics) -> Result<(), String> {
    let path = metrics_file(app)?;
    let content = serde_json::to_string_pretty(metrics).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}

pub fn reset_metrics(app: &AppHandle) -> Result<TokenMetrics, String> {
    let empty = TokenMetrics::default();
    save_metrics(app, &empty)?;
    Ok(empty)
}

pub fn record_usage(
    app: &AppHandle,
    model_name: &str,
    prompt_tokens: usize,
    completion_tokens: usize,
    latency_ms: u64,
    project: Option<(&str, &str)>,
) {
    let mut metrics = load_metrics(app);

    metrics.total_prompt_tokens += prompt_tokens;
    metrics.total_completion_tokens += completion_tokens;
    metrics.total_requests += 1;
    metrics.total_latency_ms += latency_ms;

    accumulate_model(&mut metrics.models, model_name, prompt_tokens, completion_tokens, latency_ms);

    if let Some((project_id, project_name)) = project {
        let entry = project_entry(&mut metrics.projects, project_id, project_name);
        entry.prompt_tokens += prompt_tokens;
        entry.completion_tokens += completion_tokens;
        entry.request_count += 1;
        entry.total_latency_ms += latency_ms;
        accumulate_model(&mut entry.models, model_name, prompt_tokens, completion_tokens, latency_ms);
    }

    let _ = save_metrics(app, &metrics);
}

fn project_entry<'a>(
    projects: &'a mut Vec<ProjectUsageStats>,
    project_id: &str,
    project_name: &str,
) -> &'a mut ProjectUsageStats {
    if let Some(index) = projects.iter().position(|p| p.project_id == project_id) {
        return &mut projects[index];
    }
    projects.push(ProjectUsageStats {
        project_id: project_id.to_string(),
        project_name: project_name.to_string(),
        ..Default::default()
    });
    let last = projects.len() - 1;
    &mut projects[last]
}

fn accumulate_model(
    models: &mut Vec<ModelUsageStats>,
    model_name: &str,
    prompt_tokens: usize,
    completion_tokens: usize,
    latency_ms: u64,
) {
    if let Some(existing) = models.iter_mut().find(|m| m.model_name == model_name) {
        existing.prompt_tokens += prompt_tokens;
        existing.completion_tokens += completion_tokens;
        existing.request_count += 1;
        existing.total_latency_ms += latency_ms;
    } else {
        models.push(ModelUsageStats {
            model_name: model_name.to_string(),
            prompt_tokens,
            completion_tokens,
            request_count: 1,
            total_latency_ms: latency_ms,
        });
    }
}

/// Fast, high-accuracy BPE & CJK token estimator without external heavy models
pub fn estimate_tokens(text: &str) -> usize {
    if text.is_empty() {
        return 0;
    }

    let mut count = 0;
    let mut ascii_word_chars = 0;

    for c in text.chars() {
        if c.is_ascii() {
            if c.is_ascii_alphanumeric() {
                ascii_word_chars += 1;
            } else {
                if ascii_word_chars > 0 {
                    count += (ascii_word_chars + 3) / 4;
                    ascii_word_chars = 0;
                }
                if !c.is_whitespace() {
                    count += 1;
                }
            }
        } else {
            if ascii_word_chars > 0 {
                count += (ascii_word_chars + 3) / 4;
                ascii_word_chars = 0;
            }
            // CJK characters roughly count as 1 to 1.5 tokens
            count += 1;
        }
    }

    if ascii_word_chars > 0 {
        count += (ascii_word_chars + 3) / 4;
    }

    std::cmp::max(count, 1)
}
