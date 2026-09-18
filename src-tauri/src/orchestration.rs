use reqwest::Client;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

use crate::ai_client::send_openai_compatible;
use crate::messages::to_api_messages;
use crate::models::{
    AiProfile, ChatMessage, OrchestrationProgress, OrchestrationStage,
};

// ─── Stage templates ───────────────────────────────────────────

struct StageTemplate {
    title: &'static str,
    role: &'static str,
    instruction: &'static str,
}

const ROLE_TEMPLATES: &[StageTemplate] = &[
    StageTemplate {
        title: "Node-01 // 探针解析",
        role: "探针解析算子 (Probe)",
        instruction: "你是装具流水线中的 Node-01 探针节点。请对输入的目标指令或技术问题进行首轮结构化拆解与直接回应，优先明确关键结论、核心论据与执行基线。不评述装具内部机制。",
    },
    StageTemplate {
        title: "Node-02 // 深度拓展",
        role: "拓展综合算子 (Synthesis)",
        instruction: "你是装具流水线中的 Node-02 综合节点。请基于目标问题与前序 Node-01 的分析结果进行纵深拓展，补齐架构背景、技术边界、边缘条件与可执行实现细节。避免低效重复。",
    },
    StageTemplate {
        title: "Node-03 // 审校评判",
        role: "评判校验算子 (Critique)",
        instruction: "你是装具流水线中的 Node-03 校验节点。请客观审校前序各节点的输出，指出潜在的逻辑漏洞、安全性隐患与实现风险，收敛分歧并输出高可信度的终极工程建议。",
    },
];

const SPECIALIST_TEMPLATE: StageTemplate = StageTemplate {
    title: "", // computed at runtime
    role: "专项处理算子 (Specialist)",
    instruction: "你是装具流水线中的专项扩展节点。请结合前序算子输出，针对专精维度提供增量技术洞察与补充推演。",
};

// ─── Public API ────────────────────────────────────────────────

/// Build orchestration stages from the selected profiles.
pub fn build_stages(profiles: &[AiProfile]) -> Vec<OrchestrationStage> {
    profiles
        .iter()
        .enumerate()
        .map(|(index, profile)| {
            let template = ROLE_TEMPLATES
                .get(index)
                .unwrap_or(&SPECIALIST_TEMPLATE);

            let title = if index < ROLE_TEMPLATES.len() {
                template.title.to_string()
            } else {
                format!("Node-{:02} // 专项算子", index + 1)
            };

            let depends_on = if index == 0 {
                vec![]
            } else {
                vec![format!("{}-{}", profiles[index - 1].id, index - 1)]
            };

            OrchestrationStage {
                id: format!("{}-{}", profile.id, index),
                title,
                role: template.role.to_string(),
                instruction: template.instruction.to_string(),
                profile: profile.clone(),
                depends_on,
            }
        })
        .collect()
}

/// Append orchestration instructions to a profile's system prompt.
pub fn with_stage_instruction(profile: &AiProfile, stage: &OrchestrationStage) -> AiProfile {
    let base_prompt = profile.system_prompt.trim();
    let orchestration_prompt = format!(
        "[ARIA_HARNESS_DISPATCH]\n\
         - 当前流水线节点: {}\n\
         - 算子角色: {}\n\
         - 调度执行指令: {}\n\
         - 准则: 保持冷静、理性、高度结构化与工业级严谨，直接输出工程与技术解析，不暴露底座实现细节。",
        stage.title, stage.role, stage.instruction,
    );

    let system_prompt = if base_prompt.is_empty() {
        orchestration_prompt
    } else {
        format!("{base_prompt}\n\n{orchestration_prompt}")
    };

    AiProfile {
        system_prompt,
        ..profile.clone()
    }
}

/// Execute the full orchestration pipeline and return the final message list.
///
/// For DAG mode, stages execute sequentially; each stage's output is appended
/// to the context for the next stage.  Progress events are emitted to the
/// frontend via Tauri's event system.
///
/// For parallel mode, all profiles are queried concurrently with the same
/// base context.
pub async fn execute(
    app: &AppHandle,
    http: &Client,
    profiles: &[AiProfile],
    base_messages: &[ChatMessage],
    mode: &str,
) -> Vec<ChatMessage> {
    if mode == "parallel" {
        execute_parallel(app, http, profiles, base_messages).await
    } else {
        execute_dag(app, http, profiles, base_messages).await
    }
}

// ─── DAG execution ─────────────────────────────────────────────

async fn execute_dag(
    app: &AppHandle,
    http: &Client,
    profiles: &[AiProfile],
    base_messages: &[ChatMessage],
) -> Vec<ChatMessage> {
    let stages = build_stages(profiles);
    let mut completed_replies: Vec<ChatMessage> = Vec::new();

    for stage in &stages {
        let message_id = Uuid::new_v4().to_string();

        // Emit "running" progress
        let _ = app.emit(
            "orchestration-progress",
            OrchestrationProgress {
                stage_id: stage.id.clone(),
                stage_title: stage.title.clone(),
                profile_name: stage.profile.name.clone(),
                status: "running".to_string(),
                content: Some(format!("{} 正在处理...", stage.title)),
                message_id: Some(message_id.clone()),
            },
        );

        // Build context: base messages + all completed replies so far
        let mut context: Vec<ChatMessage> = base_messages.to_vec();
        context.extend(completed_replies.clone());

        let augmented_profile = with_stage_instruction(&stage.profile, stage);
        let api_messages = to_api_messages(&context, Some(&augmented_profile));
        let start_time = std::time::Instant::now();
        let prompt_tokens = context.iter().map(|m| crate::tokens::estimate_tokens(&m.content)).sum::<usize>();

        let timeout_fut = tokio::time::timeout(
            std::time::Duration::from_secs(60),
            send_openai_compatible(http, &augmented_profile, &api_messages),
        );

        let result = match timeout_fut.await {
            Ok(inner_res) => inner_res,
            Err(_) => Err(anyhow::anyhow!("节点执行超时 (60s 熔断保护)")),
        };

        let latency = start_time.elapsed().as_millis() as u64;

        match result {
            Ok(response) => {
                let completion_tokens = crate::tokens::estimate_tokens(&response.content);
                crate::tokens::record_usage(app, &stage.profile.model, prompt_tokens, completion_tokens, latency);

                let reply = ChatMessage {
                    id: message_id,
                    role: "assistant".to_string(),
                    content: response.content,
                    speaker_id: Some(stage.profile.id.clone()),
                    speaker_name: format!("{} · {}", stage.title, stage.profile.name),
                    avatar: stage.profile.avatar.clone(),
                    pending: false,
                    error: false,
                };
                completed_replies.push(reply.clone());

                let _ = app.emit(
                    "orchestration-progress",
                    OrchestrationProgress {
                        stage_id: stage.id.clone(),
                        stage_title: stage.title.clone(),
                        profile_name: stage.profile.name.clone(),
                        status: "completed".to_string(),
                        content: Some(reply.content),
                        message_id: Some(reply.id),
                    },
                );
            }
            Err(err) => {
                let reply = ChatMessage {
                    id: message_id,
                    role: "assistant".to_string(),
                    content: err.to_string(),
                    speaker_id: Some(stage.profile.id.clone()),
                    speaker_name: format!("{} · {}", stage.title, stage.profile.name),
                    avatar: stage.profile.avatar.clone(),
                    pending: false,
                    error: true,
                };
                completed_replies.push(reply.clone());

                let _ = app.emit(
                    "orchestration-progress",
                    OrchestrationProgress {
                        stage_id: stage.id.clone(),
                        stage_title: stage.title.clone(),
                        profile_name: stage.profile.name.clone(),
                        status: "error".to_string(),
                        content: Some(err.to_string()),
                        message_id: Some(reply.id),
                    },
                );
            }
        }
    }

    completed_replies
}

// ─── Parallel execution ────────────────────────────────────────

async fn execute_parallel(
    _app: &AppHandle,
    http: &Client,
    profiles: &[AiProfile],
    base_messages: &[ChatMessage],
) -> Vec<ChatMessage> {
    let api_messages_per_profile: Vec<_> = profiles
        .iter()
        .map(|p| to_api_messages(base_messages, Some(p)))
        .collect();

    let futures: Vec<_> = profiles
        .iter()
        .zip(api_messages_per_profile.iter())
        .map(|(profile, api_msgs)| async move {
            let result = send_openai_compatible(http, profile, api_msgs).await;
            (profile, result)
        })
        .collect();

    let results = futures::future::join_all(futures).await;

    results
        .into_iter()
        .map(|(profile, result)| {
            let message_id = Uuid::new_v4().to_string();
            match result {
                Ok(response) => ChatMessage {
                    id: message_id,
                    role: "assistant".to_string(),
                    content: response.content,
                    speaker_id: Some(profile.id.clone()),
                    speaker_name: profile.name.clone(),
                    avatar: profile.avatar.clone(),
                    pending: false,
                    error: false,
                },
                Err(err) => ChatMessage {
                    id: message_id,
                    role: "assistant".to_string(),
                    content: err.to_string(),
                    speaker_id: Some(profile.id.clone()),
                    speaker_name: profile.name.clone(),
                    avatar: profile.avatar.clone(),
                    pending: false,
                    error: true,
                },
            }
        })
        .collect()
}
