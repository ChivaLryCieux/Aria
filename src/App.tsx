import React, { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { TopBar } from "./components/TopBar";
import { Sidebar, TaskSummary } from "./components/Sidebar";
import { CenterHome } from "./components/CenterHome";
import { SettingsView } from "./components/SettingsView";
import { ProjectDialog } from "./components/ProjectDialog";
import { createUserMessage } from "./constants/defaults";
import {
  AiProfile,
  AppSettings,
  ChatMessage,
  OrchestrationProgressEvent,
  OrchestrationStage,
  PendingMessage,
  Project,
  ReasoningEffort,
  SessionSummary,
} from "./types/chat";
import { createPendingMessages } from "./utils/messages";
import { dshClient, KernelStatusEvent } from "./services/dshClient";

export function App() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projectDialog, setProjectDialog] = useState<{ mode: "create" | "edit"; projectId?: string } | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeProfileId, setActiveProfileId] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("deepseek-flash");
  const [reasoningEffort, setReasoningEffort] = useState<"off" | "low" | "high" | "max">("high");
  const [draft, setDraft] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<"workspace" | "settings">("workspace");
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [workspacePath, setWorkspacePath] = useState<string>("");
  const [orchestrationStages, setOrchestrationStages] = useState<OrchestrationStage[]>([]);
  const [kernelStatus, setKernelStatus] = useState<KernelStatusEvent | null>(null);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  // ── Load Settings, Sessions & History ────────────────────────
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
        if (loaded.reasoningEffort) {
          setReasoningEffort(loaded.reasoningEffort);
        }
      })
      .catch(console.error);

    invoke<SessionSummary[]>("list_sessions")
      .then((sessionList) => {
        if (sessionList && sessionList.length > 0) {
          setSessions(sessionList);
          const first = sessionList[0];
          setActiveSessionId(first.id);
          invoke<ChatMessage[]>("load_session_messages", { sessionId: first.id })
            .then((loadedMsgs) => {
              if (loadedMsgs && loadedMsgs.length > 0) setMessages(loadedMsgs);
            })
            .catch(console.error);
        } else {
          // Fallback to legacy history if any
          invoke<ChatMessage[]>("load_history")
            .then(async (cached) => {
              if (cached && cached.length > 0) {
                try {
                  const firstUser = cached.find((m) => m.role === "user");
                  const title = firstUser ? firstUser.content.slice(0, 20) : "历史任务";
                  const created = await invoke<SessionSummary>("create_session", { title });
                  await invoke("save_session_messages", {
                    sessionId: created.id,
                    messages: cached,
                  });
                  setSessions([created]);
                  setActiveSessionId(created.id);
                  setMessages(cached);
                } catch {
                  setMessages(cached);
                }
              }
            })
            .catch(console.error);
        }
      })
      .catch(console.error);

    invoke<string>("get_default_workspace_path")
      .then(setWorkspacePath)
      .catch(console.error);

    // Projects (creates the default project and migrates legacy sessions)
    invoke<Project[]>("list_projects")
      .then((list) => {
        setProjects(list);
        if (list.length > 0) setActiveProjectId(list[0].id);
      })
      .catch(console.error);

    // Initialize DSH daemon client in background
    dshClient.init().catch(console.error);

    // Live kernel stream: streamed deltas land in the matching pending node.
    const unlistenStream = dshClient.onStream((chunk) => {
      if (chunk.conversationId && chunk.conversationId !== activeSessionIdRef.current) return;
      if (!chunk.stageId || !chunk.content) return;
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== chunk.stageId || !msg.pending) return msg;
          const isPlaceholder = msg.content === "思考中..." || msg.content.includes("正在解析推演中");
          return { ...msg, content: isPlaceholder ? chunk.content! : msg.content + chunk.content! };
        })
      );
    });

    const unlistenKernelStatus = dshClient.onKernelStatus((event) => setKernelStatus(event));

    return () => {
      unlistenStream();
      unlistenKernelStatus();
    };
  }, []);

  // ── Auto-scroll to latest message ────────────────────────────
  useEffect(() => {
    if (messages.length > 0) {
      messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // ── Apply theme + font scale ─────────────────────────────────
  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    const theme = settings.themeMode ?? "light";
    root.dataset.theme = theme;
    if (theme === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      root.dataset.resolvedTheme = media.matches ? "dark" : "light";
      const onChange = (e: MediaQueryListEvent) => {
        root.dataset.resolvedTheme = e.matches ? "dark" : "light";
      };
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    }
    root.dataset.resolvedTheme = theme;
  }, [settings?.themeMode]);

  useEffect(() => {
    const size = settings?.fontSize ?? "14px";
    const zoom = size === "13px" ? 0.94 : size === "15px" ? 1.06 : 1.0;
    document.body.style.zoom = String(zoom);
  }, [settings?.fontSize]);

  // ── Persist chat history (debounced) ─────────────────────────
  useEffect(() => {
    if (!settings || messages.length === 0) return;
    if (saveTimeoutRef.current !== undefined) {
      clearTimeout(saveTimeoutRef.current);
    }
    const timeoutId = setTimeout(() => {
      if (activeSessionId) {
        invoke("save_session_messages", {
          sessionId: activeSessionId,
          messages,
        })
          .then(() => {
            invoke<SessionSummary[]>("list_sessions")
              .then(setSessions)
              .catch(console.error);
          })
          .catch(console.error);
      }
      invoke("save_history", { messages }).catch(console.error);
    }, 500);
    saveTimeoutRef.current = timeoutId;
  }, [messages, activeSessionId, settings]);

  // ── Derived active profile ───────────────────────────────────
  const activeProfile = useMemo(() => {
    return (
      settings?.aiProfiles.find((p) => p.id === activeProfileId) ||
      settings?.aiProfiles[0] ||
      null
    );
  }, [activeProfileId, settings]);

  // ── Follow the active profile's default model on switch ──────
  useEffect(() => {
    if (activeProfile?.model) {
      setSelectedModel(activeProfile.model);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfileId]);

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
    setActiveSessionId(null);
    setSessions([]);
    try {
      await invoke("clear_history");
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  };

  // ── Start New Task (inside the given project) ─────────────────
  const handleNewTask = (projectId?: string) => {
    if (projectId) setActiveProjectId(projectId);
    setActiveSessionId(null);
    setMessages([]);
    setDraft("");
  };

  // ── Project dialog save ──────────────────────────────────────
  const handleProjectSaved = (saved: Project) => {
    invoke<Project[]>("list_projects")
      .then((list) => {
        setProjects(list);
        setActiveProjectId(saved.id);
      })
      .catch(console.error);
  };

  // ── Select Existing Session ──────────────────────────────────
  const handleSelectSession = async (sessionId: string) => {
    if (sessionId === activeSessionId) return;
    try {
      const msgs = await invoke<ChatMessage[]>("load_session_messages", { sessionId });
      setActiveSessionId(sessionId);
      setMessages(msgs || []);
    } catch (err) {
      console.error("加载会话失败:", err);
    }
  };

  // ── Delete Session ───────────────────────────────────────────
  const handleDeleteSession = async (sessionId: string) => {
    try {
      await invoke("delete_session", { sessionId });
      const updated = sessions.filter((s) => s.id !== sessionId);
      setSessions(updated);
      if (activeSessionId === sessionId) {
        if (updated.length > 0) {
          handleSelectSession(updated[0].id);
        } else {
          setActiveSessionId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error("删除会话失败:", err);
    }
  };

  // ── Open Workspace Directory (active project's default directory) ──
  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  const openDirectory = activeProject?.defaultDirectory || workspacePath;

  const handleOpenWorkspace = async () => {
    if (!openDirectory) return;
    try {
      await invoke("open_path_in_explorer", { path: openDirectory });
    } catch (err) {
      console.error("Failed to open path:", err);
    }
  };

  // ── Reasoning effort cycling (最高 → 标准 → 关闭) ────────────
  const EFFORT_ORDER: ReasoningEffort[] = ["max", "high", "off"];

  const handleCycleReasoningEffort = () => {
    const next = EFFORT_ORDER[(EFFORT_ORDER.indexOf(reasoningEffort) + 1) % EFFORT_ORDER.length];
    setReasoningEffort(next);
    if (settings) {
      handleSaveSettings({ ...settings, reasoningEffort: next });
    }
  };

  // ── Send Message ─────────────────────────────────────────────
  const handleSend = async () => {
    if (!draft.trim() || !activeProfile || !settings || isSending) return;

    let curSessionId = activeSessionId;
    if (!curSessionId) {
      try {
        const title = draft.trim().slice(0, 20);
        const created = await invoke<SessionSummary>("create_session", {
          title,
          projectId: activeProjectId,
        });
        curSessionId = created.id;
        setActiveSessionId(curSessionId);
        setSessions((prev) => [created, ...prev.filter((s) => s.id !== created.id)]);
      } catch (err) {
        console.error("无法创建新会话:", err);
      }
    }

    const userMessage = createUserMessage(draft.trim(), settings.userName || "Tempsyche");
    const baseMessages = [...messages, userMessage];

    // One pending bubble per pipeline node; its id equals the stage id so the
    // kernel's streamed deltas and settled replies land in the same node.
    const pendingMessages: PendingMessage[] =
      orchestrationStages.length > 0
        ? orchestrationStages.map((stage) => ({
            id: stage.id,
            role: "assistant" as const,
            content: "思考中...",
            speakerId: stage.profile.id,
            speakerName: `${stage.title} · ${stage.profile.name}`,
            avatar: stage.profile.avatar,
            pending: true as const,
          }))
        : createPendingMessages([activeProfile]);

    setDraft("");
    setIsSending(true);
    setMessages([...baseMessages, ...pendingMessages]);

    try {
      const unlisten = await listen<OrchestrationProgressEvent>(
        "orchestration-progress",
        (event) => {
          const { stageId, stageTitle, status: eventStatus } = event.payload;
          if (eventStatus === "running") {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.pending && (!stageId || msg.id === stageId) && msg.content === "思考中..."
                  ? { ...msg, content: `[${stageTitle}] 正在解析推演中...` }
                  : msg
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
          conversationId: curSessionId,
          reasoningEffort,
        },
      });

      unlisten();
      const updatedMessages = [...baseMessages, ...finalReplies];
      setMessages(updatedMessages);

      if (curSessionId) {
        invoke("save_session_messages", {
          sessionId: curSessionId,
          messages: updatedMessages,
        })
          .then(() => {
            invoke<SessionSummary[]>("list_sessions").then(setSessions).catch(console.error);
          })
          .catch(console.error);
      }
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

  // ── Tasks list for sidebar from native sessions ──────────────
  const sidebarTasks: TaskSummary[] = useMemo(() => {
    return sessions.map((s) => ({
      id: s.id,
      title: s.title,
      timestamp: s.updatedAt,
      projectId: s.projectId,
    }));
  }, [sessions]);

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
    const dir = openDirectory;
    if (!dir) return "Atrium";
    const parts = dir.replace(/\\/g, "/").split("/");
    return parts[parts.length - 1] || "Atrium";
  }, [openDirectory]);

  return (
    <div className="app-container">
      {/* 1:1 Top Bar */}
      <TopBar
        sidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
        kernelStatus={kernelStatus}
        onNewTerminal={() => {
          setCurrentView("workspace");
          handleNewTask();
        }}
        onOpenHelp={() => setIsHelpOpen(true)}
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
          {/* 1:1 Left Sidebar: project tree */}
          <Sidebar
            userName={settings?.userName || "Tempsyche"}
            isCollapsed={isSidebarCollapsed}
            onOpenSettings={() => setCurrentView("settings")}
            projects={projects}
            tasks={sidebarTasks}
            activeTaskId={activeSessionId || undefined}
            activeProjectId={activeProjectId}
            onSelectProject={setActiveProjectId}
            onNewProject={() => setProjectDialog({ mode: "create" })}
            onNewTask={(projectId) => handleNewTask(projectId)}
            onOpenProjectSettings={(projectId) => setProjectDialog({ mode: "edit", projectId })}
            onSelectTask={handleSelectSession}
            onDeleteTask={handleDeleteSession}
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
                reasoningEffort={reasoningEffort}
                onSelectReasoningEffort={handleCycleReasoningEffort}
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
                            <span className="node-badge">ATRIUM // {msg.speakerName}</span>
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
                      placeholder="向 Atrium 提问，继续跟进任务..."
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

      {/* Project create / settings dialog */}
      {projectDialog && (
        <ProjectDialog
          mode={projectDialog.mode}
          project={
            projectDialog.mode === "edit"
              ? projects.find((p) => p.id === projectDialog.projectId) ?? null
              : null
          }
          fallbackDirectory={workspacePath}
          onClose={() => setProjectDialog(null)}
          onSaved={handleProjectSaved}
        />
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
