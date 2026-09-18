import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import AgentPanel from "./components/AgentPanel";
import { Avatar } from "./components/Avatar";
import { SettingsPanel } from "./components/SettingsPanel";
import { createUserMessage } from "./constants/defaults";
import { AiProfile, AppSettings, ChatMessage, OrchestrationMode, OrchestrationStage } from "./types/chat";
import { createPendingMessages } from "./utils/messages";
import { OrchestrationProgressEvent } from "./types/chat";
import { dshClient, HarnessConnectionInfo } from "./services/dshClient";

export function App() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [activePanel, setActivePanel] = useState<"chat" | "agents" | "settings">("chat");
  const [isSidePanelCollapsed, setIsSidePanelCollapsed] = useState(false);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("HARNESS_STANDBY // 终端就绪");
  const [isSending, setIsSending] = useState(false);
  const [orchestrationStages, setOrchestrationStages] = useState<OrchestrationStage[]>([]);
  const [harnessConn, setHarnessConn] = useState<HarnessConnectionInfo | null>(null);
  const [systemTelemetry, setSystemTelemetry] = useState<{
    os: string;
    arch: string;
    coreCount: number;
    hostname: string;
    appVersion: string;
  } | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Initialize: load settings, history, DSH daemon & telemetry ──

  useEffect(() => {
    invoke<AppSettings>("load_settings")
      .then((loaded) => {
        setSettings(loaded);
        setActiveIds([loaded.aiProfiles[0].id]);
      })
      .catch((error) => {
        console.error(error);
        setStatus(String(error));
      });

    invoke<ChatMessage[]>("load_history")
      .then((cached) => {
        if (cached.length > 0) setMessages(cached);
      })
      .catch(console.error);

    // Initialize DSH Core Daemon Client
    dshClient.init().then(setHarnessConn).catch(console.error);

    // Query Native System Telemetry
    invoke<any>("get_system_telemetry")
      .then(setSystemTelemetry)
      .catch(console.error);
  }, []);

  // ── Persist chat history to backend (debounced) ──────────────

  useEffect(() => {
    if (!settings) return;
    if (saveTimeoutRef.current !== undefined) {
      clearTimeout(saveTimeoutRef.current);
    }
    const timeoutId = setTimeout(() => {
      if (messages.length > 0) {
        invoke("save_history", { messages }).catch(console.error);
      }
    }, 500);
    saveTimeoutRef.current = timeoutId;
  }, [messages, settings]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current !== undefined) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // ── Fetch orchestration stages from backend ──────────────────

  useEffect(() => {
    if (activeProfiles.length === 0) {
      setOrchestrationStages([]);
      return;
    }
    invoke<OrchestrationStage[]>("build_orchestration", { profiles: activeProfiles })
      .then(setOrchestrationStages)
      .catch(console.error);
  }, [settings, activeIds]);

  // ── Derived state ────────────────────────────────────────────

  const activeProfiles = useMemo(
    () =>
      activeIds
        .map((id) => settings?.aiProfiles.find((profile) => profile.id === id))
        .filter((profile): profile is AiProfile => Boolean(profile)),
    [activeIds, settings],
  );

  const canSend = draft.trim().length > 0 && activeProfiles.length > 0 && !isSending && settings !== null;

  // ── Settings persistence ─────────────────────────────────────

  async function persist(nextSettings: AppSettings) {
    setSettings(nextSettings);
    try {
      await invoke("save_settings", { settings: nextSettings });
      setStatus("设置已保存");
    } catch (error) {
      setStatus(String(error));
    }
  }

  function updateProfile(id: string, patch: Partial<AiProfile>) {
    if (!settings) return;
    void persist({
      ...settings,
      aiProfiles: settings.aiProfiles.map((profile) => (profile.id === id ? { ...profile, ...patch } : profile)),
    });
  }

  async function addProfile() {
    if (!settings) return;
    const profile = await invoke<AiProfile>("create_profile");
    void persist({ ...settings, aiProfiles: [...settings.aiProfiles, profile] });
    setActiveIds((ids) => [...ids, profile.id]);
  }

  function removeProfile(id: string) {
    if (!settings) return;
    if (settings.aiProfiles.length <= 1) {
      setStatus("至少保留一个 AI");
      return;
    }
    void persist({
      ...settings,
      aiProfiles: settings.aiProfiles.filter((profile) => profile.id !== id),
    });
    setActiveIds((ids) => ids.filter((activeId) => activeId !== id));
  }

  function toggleActive(id: string) {
    setActiveIds((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));
  }

  // ── Send message — delegates all orchestration to backend ────

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!canSend || !settings) return;

    const userMessage = createUserMessage(draft.trim(), settings.userName);
    const baseMessages = [...messages, userMessage];
    const pendingMessages = createPendingMessages(activeProfiles).map((message, index) => ({
      ...message,
      content:
        settings.orchestrationMode === "dag"
          ? `[${orchestrationStages[index]?.title ?? activeProfiles[index].name}] 正在初始化算子通道...`
          : "算子通道正在处理...",
    }));

    setDraft("");
    setIsSending(true);
    setMessages([...baseMessages, ...pendingMessages]);
    setStatus(settings.orchestrationMode === "dag" && activeProfiles.length > 1 ? "DAG 流水线执行中" : "通道调度中");

    // Map stage.id → pending message id for progress event matching
    const stageToPending = new Map<string, string>();
    orchestrationStages.forEach((stage, index) => {
      if (pendingMessages[index]) {
        stageToPending.set(stage.id, pendingMessages[index].id);
      }
    });

    try {
      // Listen for progress events (DAG mode emits these per stage)
      const unlisten = await listen<OrchestrationProgressEvent>("orchestration-progress", (event) => {
        const { stageId, stageTitle, profileName, status: eventStatus } = event.payload;
        const pendingId = stageToPending.get(stageId);

        if (eventStatus === "running") {
          setStatus(`${stageTitle}: ${profileName} 推进中`);
          if (pendingId) {
            setMessages((prev) =>
              prev.map((msg) => (msg.id === pendingId ? { ...msg, content: `[${stageTitle}] 算子解析中...` } : msg)),
            );
          }
        }
      });

      const finalMessages = await invoke<ChatMessage[]>("execute_orchestration", {
        request: {
          profiles: activeProfiles,
          messages: baseMessages,
          mode: settings.orchestrationMode,
        },
      });

      unlisten();

      // Replace pending messages with final results
      setMessages([...baseMessages, ...finalMessages]);
    } catch (error) {
      // Mark all pending messages as errors
      setMessages((prev) =>
        prev.map((msg) =>
          msg.pending ? { ...msg, content: `[DISPATCH_ERROR] ${String(error)}`, pending: false, error: true } : msg,
        ),
      );
    } finally {
      setIsSending(false);
      setStatus("HARNESS_STANDBY // 终端就绪");
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSend) {
        void sendMessage(event);
      }
    }
  }

  // ── Clear history ────────────────────────────────────────────

  async function handleClearHistory() {
    setMessages([]);
    try {
      await invoke("clear_history");
      setStatus("RUNTIME_LOGS_PURGED // 缓存已清空");
    } catch (error) {
      console.error(error);
    }
  }

  // ── Guard: don't render until settings are loaded ────────────

  if (!settings) {
    return (
      <div className="app-shell">
        <div className="film-grain-overlay" aria-hidden="true" />
        <header className="topbar">
          <div className="brand-block">
            <span className="brand-tag">AGENT HARNESS</span>
            <h1 className="brand-title">ARIA</h1>
            <span className="brand-sub">// 智役：咏叹终端</span>
          </div>
          <div className="topbar-telemetry">
            <div className="telemetry-item">
              <span className="status-indicator busy" />
              <span>INITIALIZING...</span>
            </div>
          </div>
        </header>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="app-shell">
      <div className="film-grain-overlay" aria-hidden="true" />

      <header className="topbar">
        <div className="brand-block">
          <span className="brand-tag">AGENT HARNESS</span>
          <h1 className="brand-title">ARIA</h1>
          <span className="brand-sub">// 智役：咏叹终端</span>
        </div>

        <div className="topbar-telemetry">
          <div className="telemetry-item">
            <span>SYS:</span>
            <strong>
              {systemTelemetry
                ? `${systemTelemetry.os.toUpperCase()}_${systemTelemetry.arch.toUpperCase()} (${systemTelemetry.coreCount}C)`
                : "WIN_DESKTOP"}
            </strong>
          </div>
          <div className="telemetry-item">
            <span>DSH:</span>
            <strong>{harnessConn ? `${harnessConn.status.toUpperCase()}:${harnessConn.port}` : "STANDBY"}</strong>
          </div>
          <div className="telemetry-item">
            <span>SLOTS:</span>
            <strong>
              {activeProfiles.length} / {settings.aiProfiles.length}
            </strong>
          </div>
          <div className="telemetry-item">
            <span className={`status-indicator ${isSending ? "busy" : ""}`} />
            <span>{status}</span>
          </div>
        </div>
      </header>

      <main className={`workspace ${isSidePanelCollapsed ? "side-panel-collapsed" : ""}`}>
        <aside className={`side-panel ${activePanel === "chat" ? "" : "open"} ${isSidePanelCollapsed ? "collapsed" : ""}`}>
          <button
            className="panel-collapse-button"
            type="button"
            aria-label={isSidePanelCollapsed ? "展开装具面板" : "收起装具面板"}
            aria-expanded={!isSidePanelCollapsed}
            onClick={() => setIsSidePanelCollapsed((collapsed) => !collapsed)}
          >
            {isSidePanelCollapsed ? ">" : "<"}
          </button>

          {(activePanel === "agents" || activePanel === "chat") && (
            <AgentPanel
              profiles={settings.aiProfiles}
              activeIds={activeIds}
              onAdd={addProfile}
              onRemove={removeProfile}
              onToggle={toggleActive}
              onUpdate={updateProfile}
            />
          )}

          {activePanel === "settings" && (
            <SettingsPanel
              settings={settings}
              onClear={handleClearHistory}
              onChangeUserName={(userName) => void persist({ ...settings, userName })}
              onChangeOrchestrationMode={(orchestrationMode) =>
                void persist({ ...settings, orchestrationMode: orchestrationMode as OrchestrationMode })
              }
            />
          )}
        </aside>

        <section className="chat-area" aria-label="执行终端">
          <div className="mode-strip">
            <button className={activePanel === "chat" ? "active" : ""} onClick={() => setActivePanel("chat")}>
              TERMINAL // 执行流
            </button>
            <button className={activePanel === "agents" ? "active" : ""} onClick={() => setActivePanel("agents")}>
              SLOTS // 算子槽位
            </button>
            <button className={activePanel === "settings" ? "active" : ""} onClick={() => setActivePanel("settings")}>
              CONFIG // 系统设置
            </button>
          </div>

          <div className="orchestration-bar">
            <div>
              <p className="eyebrow">DISPATCH PROTOCOL</p>
              <strong>{settings.orchestrationMode === "dag" ? "DETERMINISTIC DAG // 确定性拓扑" : "PARALLEL CONCURRENT // 并行群测"}</strong>
            </div>
            <div className="segmented">
              <button
                className={settings.orchestrationMode === "dag" ? "active" : ""}
                onClick={() => void persist({ ...settings, orchestrationMode: "dag" })}
              >
                DAG PIPELINE
              </button>
              <button
                className={settings.orchestrationMode === "parallel" ? "active" : ""}
                onClick={() => void persist({ ...settings, orchestrationMode: "parallel" })}
              >
                PARALLEL
              </button>
            </div>
          </div>

          <div className="agent-row">
            {settings.aiProfiles.map((profile, index) => (
              <button
                key={profile.id}
                className={`agent-chip ${activeIds.includes(profile.id) ? "selected" : ""}`}
                onClick={() => toggleActive(profile.id)}
              >
                <Avatar value={profile.avatar} fallback={profile.name} />
                <span>
                  [SLOT-{String(index + 1).padStart(2, "0")}] {profile.name}
                </span>
              </button>
            ))}
          </div>

          {settings.orchestrationMode === "dag" && activeProfiles.length > 1 && (
            <div className="dag-strip" aria-label="当前 DAG 流水线">
              {orchestrationStages.map((stage, index) => (
                <div className="dag-node" key={stage.id}>
                  <span>{stage.title}</span>
                  <strong>{stage.profile.name}</strong>
                  {index > 0 && <small>// 依赖上游算子结果</small>}
                </div>
              ))}
            </div>
          )}

          <div className="message-list">
            {messages.length === 0 ? (
              <div className="empty-state">
                <h2>ARIA // AGENT HARNESS READY</h2>
                <p>
                  终端装具中枢已就绪。选定算子槽位后在底部终端录入目标指令。
                  <br />
                  <strong>DAG PIPELINE 模式</strong>将串行推进探针、拓展与审校算子；
                  <br />
                  <strong>PARALLEL 模式</strong>将并发派发至所有激活槽位。
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <article
                  key={message.id}
                  className={`message ${message.role === "user" ? "from-user" : "from-ai"} ${message.error ? "error" : ""}`}
                >
                  <Avatar value={message.avatar} fallback={message.speakerName} />
                  <div className="bubble">
                    <div className="speaker">
                      {message.role === "user" ? `// OPERATOR::${message.speakerName}` : `// HARNESS_NODE::${message.speakerName}`}
                    </div>
                    <p>{message.content}</p>
                  </div>
                </article>
              ))
            )}
          </div>

          <form className="composer" onSubmit={sendMessage}>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                activeProfiles.length
                  ? "输入目标指令并按 Enter 派发 (Shift+Enter 换行)..."
                  : "未挂载激活槽位，请先勾选至少一个算子节点"
              }
              rows={2}
            />
            <button disabled={!canSend}>DISPATCH // 派发</button>
          </form>
        </section>
      </main>
    </div>
  );
}
