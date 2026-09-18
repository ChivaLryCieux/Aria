import React, { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { TopBar } from "./components/TopBar";
import { Sidebar, TaskSummary } from "./components/Sidebar";
import { CenterHome } from "./components/CenterHome";
import { SettingsView } from "./components/SettingsView";
import { createUserMessage } from "./constants/defaults";
import {
  AiProfile,
  AppSettings,
  ChatMessage,
  OrchestrationProgressEvent,
  OrchestrationStage,
} from "./types/chat";
import { createPendingMessages } from "./utils/messages";
import { dshClient } from "./services/dshClient";

export function App() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("deepseek-flash");
  const [draft, setDraft] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<"workspace" | "settings">("workspace");
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [workspacePath, setWorkspacePath] = useState<string>("");
  const [orchestrationStages, setOrchestrationStages] = useState<OrchestrationStage[]>([]);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  // ── Load Settings & History ──────────────────────────────────
  useEffect(() => {
    invoke<AppSettings>("load_settings")
      .then((loaded) => {
        // Ensure default username is Tempsyche if empty
        if (!loaded.userName || loaded.userName === "OPERATOR") {
          loaded.userName = "Tempsyche";
        }
        setSettings(loaded);
        if (loaded.aiProfiles.length > 0) {
          setActiveProfileId(loaded.aiProfiles[0].id);
          if (loaded.aiProfiles[0].model) {
            setSelectedModel(loaded.aiProfiles[0].model);
          }
        }
      })
      .catch(console.error);

    invoke<ChatMessage[]>("load_history")
      .then((cached) => {
        if (cached && cached.length > 0) setMessages(cached);
      })
      .catch(console.error);

    invoke<string>("get_default_workspace_path")
      .then(setWorkspacePath)
      .catch(console.error);

    // Initialize DSH daemon client in background
    dshClient.init().catch(console.error);
  }, []);

  // ── Auto-scroll to latest message ────────────────────────────
  useEffect(() => {
    if (messages.length > 0) {
      messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // ── Persist chat history (debounced) ─────────────────────────
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

  // ── Derived active profile ───────────────────────────────────
  const activeProfile = useMemo(() => {
    return (
      settings?.aiProfiles.find((p) => p.id === activeProfileId) ||
      settings?.aiProfiles[0] ||
      null
    );
  }, [activeProfileId, settings]);

  // ── Build Orchestration Stages ───────────────────────────────
  useEffect(() => {
    if (!activeProfile || !settings) return;
    invoke<OrchestrationStage[]>("build_orchestration", {
      profiles: [activeProfile],
    })
      .then(setOrchestrationStages)
      .catch(console.error);
  }, [activeProfile, settings]);

  // ── Save Settings Helper ─────────────────────────────────────
  const handleSaveSettings = async (nextSettings: AppSettings) => {
    setSettings(nextSettings);
    try {
      await invoke("save_settings", { settings: nextSettings });
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
  };

  // ── Clear History ────────────────────────────────────────────
  const handleClearHistory = async () => {
    setMessages([]);
    try {
      await invoke("clear_history");
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  };

  // ── Start New Task ───────────────────────────────────────────
  const handleNewTask = () => {
    setMessages([]);
    setDraft("");
  };

  // ── Open Workspace Directory ─────────────────────────────────
  const handleOpenWorkspace = async () => {
    try {
      const path = workspacePath || "c:\\Users\\LRY\\Desktop\\BASE\\Aria";
      await invoke("open_path_in_explorer", { path });
    } catch (err) {
      console.error("Failed to open path:", err);
    }
  };

  // ── Send Message ─────────────────────────────────────────────
  const handleSend = async () => {
    if (!draft.trim() || !activeProfile || !settings || isSending) return;

    const userMessage = createUserMessage(draft.trim(), settings.userName || "Tempsyche");
    const baseMessages = [...messages, userMessage];
    const pendingMessages = createPendingMessages([activeProfile]);

    setDraft("");
    setIsSending(true);
    setMessages([...baseMessages, ...pendingMessages]);

    try {
      const unlisten = await listen<OrchestrationProgressEvent>(
        "orchestration-progress",
        (event) => {
          const { stageTitle, status: eventStatus } = event.payload;
          if (eventStatus === "running") {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.pending ? { ...msg, content: `[${stageTitle}] 正在解析推演中...` } : msg
              )
            );
          }
        }
      );

      // Execute request
      const finalReplies = await invoke<ChatMessage[]>("execute_orchestration", {
        request: {
          profiles: [
            {
              ...activeProfile,
              model: selectedModel || activeProfile.model,
            },
          ],
          messages: baseMessages,
          mode: settings.orchestrationMode,
        },
      });

      unlisten();
      setMessages([...baseMessages, ...finalReplies]);
    } catch (error) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.pending
            ? {
                ...msg,
                content: `[调度执行异常] ${String(error)}`,
                pending: false,
                error: true,
              }
            : msg
        )
      );
    } finally {
      setIsSending(false);
    }
  };

  // ── Tasks list for sidebar (derived from first user prompt) ──
  const taskSummaries: TaskSummary[] = useMemo(() => {
    if (messages.length === 0) return [];
    const firstUserMsg = messages.find((m) => m.role === "user");
    return [
      {
        id: "current-task",
        title: firstUserMsg ? firstUserMsg.content.slice(0, 24) : "当前任务",
      },
    ];
  }, [messages]);

  // ── Keyboard shortcuts (Ctrl+N, Ctrl+K) ──────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleNewTask();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsHelpOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const workspaceName = useMemo(() => {
    if (!workspacePath) return "Aria";
    const parts = workspacePath.replace(/\\/g, "/").split("/");
    return parts[parts.length - 1] || "Aria";
  }, [workspacePath]);

  return (
    <div className="app-container">
      {/* 1:1 Top Bar */}
      <TopBar
        onNewTerminal={() => {
          setCurrentView("workspace");
          handleNewTask();
        }}
        onOpenHelp={() => setIsHelpOpen(true)}
        canGoBack={messages.length > 0 || currentView === "settings"}
        canGoForward={false}
        onGoBack={() => {
          if (currentView === "settings") {
            setCurrentView("workspace");
          } else {
            handleNewTask();
          }
        }}
      />

      {currentView === "settings" && settings ? (
        <SettingsView
          onBack={() => setCurrentView("workspace")}
          settings={settings}
          onSaveSettings={handleSaveSettings}
          onClearHistory={handleClearHistory}
          workspacePath={workspacePath}
          onOpenWorkspace={handleOpenWorkspace}
        />
      ) : (
        /* Main Workspace Body */
        <div className="workspace-body">
          {/* 1:1 Left Sidebar */}
          <Sidebar
            userName={settings?.userName || "Tempsyche"}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
            onNewTask={handleNewTask}
            onOpenSettings={() => setCurrentView("settings")}
            tasks={taskSummaries}
            activeTaskId={messages.length > 0 ? "current-task" : undefined}
            workspaceName={workspaceName}
            onOpenWorkspace={handleOpenWorkspace}
          />

          {/* Center Stage Canvas */}
          <main className="stage-container">
            {messages.length === 0 ? (
              /* Home / Greeting Stage (Exact 1:1 match to screenshot) */
              <CenterHome
                draft={draft}
                setDraft={setDraft}
                onSend={handleSend}
                isSending={isSending}
                profiles={settings?.aiProfiles || []}
                selectedProfileId={activeProfileId}
                onSelectProfile={setActiveProfileId}
                selectedModel={selectedModel}
                onSelectModel={setSelectedModel}
                workspaceName={workspaceName}
                onOpenWorkspace={handleOpenWorkspace}
              />
            ) : (
              /* Active Conversation View */
              <div className="chat-conversation-view">
                <div className="chat-message-stream">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`message-bubble-row ${msg.role}`}>
                      <div className="bubble-body">
                        {msg.role === "assistant" && (
                          <div className="speaker-header">
                            <span className="node-badge">ZCode // {msg.speakerName}</span>
                            {msg.pending && <span>思考生成中...</span>}
                          </div>
                        )}
                        <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
                      </div>
                    </div>
                  ))}
                  <div ref={messageEndRef} />
                </div>

                {/* Bottom Docked Input Box in Active Chat */}
                <div className="chat-docked-input">
                  <div className="prompt-card" style={{ width: "720px" }}>
                    <textarea
                      className="prompt-textarea"
                      placeholder="向 ZCode 提问，继续跟进任务..."
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      rows={2}
                    />
                    <div className="prompt-card-footer">
                      <div className="footer-left-controls">
                        <span className="model-tag-pill">ds/{selectedModel}</span>
                      </div>
                      <div className="footer-right-controls">
                        <button
                          type="button"
                          className="send-arrow-btn"
                          disabled={!draft.trim() || isSending}
                          onClick={handleSend}
                          title="发送"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="19" x2="12" y2="5" strokeLinecap="round" />
                            <polyline points="5 12 12 5 19 12" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* Help / Shortcuts Modal */}
      {isHelpOpen && (
        <div className="modal-backdrop" onClick={() => setIsHelpOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">快捷键与功能指引</span>
              <button type="button" className="icon-btn" onClick={() => setIsHelpOpen(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: "13px" }}>新建任务</span>
                <span className="shortcut-badge">Ctrl + N</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: "13px" }}>全局搜索 / 快捷指令</span>
                <span className="shortcut-badge">Ctrl + K</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: "13px" }}>发送指令</span>
                <span className="shortcut-badge">Enter</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                <span style={{ fontSize: "13px" }}>输入框换行</span>
                <span className="shortcut-badge">Shift + Enter</span>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-primary" onClick={() => setIsHelpOpen(false)}>
                知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
