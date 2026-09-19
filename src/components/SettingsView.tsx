import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AppSettings, AiProfile, ProviderModel, TokenMetrics } from "../types/chat";
import { AppDialog, AppDialogRequest } from "./AppDialog";

type SettingsTab = "general" | "appearance" | "model" | "tokens";

type SettingsViewProps = {
  onBack: () => void;
  settings: AppSettings;
  onSaveSettings: (next: AppSettings) => void;
  onClearHistory: () => void;
  workspacePath: string;
  onOpenWorkspace: () => void;
};

export function SettingsView({
  onBack,
  settings,
  onSaveSettings,
  onClearHistory,
  workspacePath,
  onOpenWorkspace,
}: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("model");

  // Local draft state for editing
  const [userName, setUserName] = useState(settings.userName);
  const [activeProfileId, setActiveProfileId] = useState<string>(
    settings.aiProfiles[0]?.id || ""
  );
  const [tokenMetrics, setTokenMetrics] = useState<TokenMetrics | null>(null);
  const [dialog, setDialog] = useState<AppDialogRequest | null>(null);

  const showConfirm = (
    message: string,
    onConfirm: () => void,
    options: { tone?: "default" | "danger"; title?: string; confirmText?: string } = {}
  ) => {
    setDialog({
      kind: "confirm",
      title: options.title ?? (options.tone === "danger" ? "危险操作" : "确认操作"),
      message,
      tone: options.tone ?? "danger",
      confirmText: options.confirmText,
      onConfirm,
    });
  };

  const showAlert = (message: string, tone: "default" | "danger" = "default") => {
    setDialog({ kind: "alert", title: "提示", message, tone });
  };

  const themeMode = settings.themeMode ?? "light";
  const fontSize = settings.fontSize ?? "14px";

  useEffect(() => {
    if (activeTab === "tokens") {
      invoke<TokenMetrics>("get_token_statistics")
        .then((data) => setTokenMetrics(data))
        .catch((err) => console.error("获取词元统计失败:", err));
    }
  }, [activeTab]);

  const handleResetTokens = async () => {
    try {
      const reset = await invoke<TokenMetrics>("reset_token_statistics");
      setTokenMetrics(reset);
    } catch (err) {
      console.error("重置词元统计失败:", err);
    }
  };

  const currentProfile =
    settings.aiProfiles.find((p) => p.id === activeProfileId) ||
    settings.aiProfiles[0];

  const handleUpdateCurrentProfile = (patch: Partial<AiProfile>) => {
    if (!currentProfile) return;
    const updatedProfiles = settings.aiProfiles.map((p) =>
      p.id === currentProfile.id ? { ...p, ...patch } : p
    );
    onSaveSettings({
      ...settings,
      aiProfiles: updatedProfiles,
    });
  };

  const handleSaveGeneral = () => {
    onSaveSettings({
      ...settings,
      userName: userName.trim() || "Tempsyche",
    });
  };

  const handleAddProvider = async () => {
    try {
      const profile = await invoke<AiProfile>("create_profile");
      const next: AppSettings = {
        ...settings,
        aiProfiles: [...settings.aiProfiles, profile],
      };
      onSaveSettings(next);
      setActiveProfileId(profile.id);
    } catch (err) {
      console.error("添加供应商失败:", err);
    }
  };

  const handleDeleteProvider = async () => {
    if (!currentProfile) return;
    const label = currentProfile.name.trim() || `供应商${profileIndex < 0 ? 1 : profileIndex + 1}`;
    showConfirm(`确定要删除供应商「${label}」吗？删除后不可恢复。`, async () => {
      try {
        const next = await invoke<AppSettings>("delete_profile", {
          profileId: currentProfile.id,
        });
        onSaveSettings(next);
        setActiveProfileId(next.aiProfiles[0]?.id || "");
      } catch (err) {
        console.error("删除供应商失败:", err);
        showAlert(`删除供应商失败：${String(err)}`, "danger");
      }
    });
  };

  const handleProbeProvider = async () => {
    if (!currentProfile) return;
    try {
      const message = await invoke<string>("probe_provider", {
        endpoint: currentProfile.endpoint,
        apiKey: currentProfile.apiKey,
      });
      showAlert(`通道自检通过：${message}`);
    } catch (err) {
      showAlert(`通道自检失败：${String(err)}`, "danger");
    }
  };

  const displayName = (profile: AiProfile, index: number) =>
    profile.name.trim() || `供应商${index + 1}`;

  const profileIndex = settings.aiProfiles.findIndex((p) => p.id === currentProfile?.id);

  const updateModels = (models: ProviderModel[]) => {
    handleUpdateCurrentProfile({ models });
  };

  const handleAddModel = () => {
    if (!currentProfile) return;
    updateModels([
      ...currentProfile.models,
      { id: crypto.randomUUID(), name: "", contextLength: null },
    ]);
  };

  const handleUpdateModel = (modelId: string, patch: Partial<ProviderModel>) => {
    if (!currentProfile) return;
    updateModels(currentProfile.models.map((m) => (m.id === modelId ? { ...m, ...patch } : m)));
  };

  const handleRemoveModel = (modelId: string) => {
    if (!currentProfile) return;
    updateModels(currentProfile.models.filter((m) => m.id !== modelId));
  };

  const handleSetDefaultModel = (name: string) => {
    handleUpdateCurrentProfile({ model: name.trim() });
  };

  return (
    <div className="settings-page-layout">
      {/* Left Settings Sidebar */}
      <aside className="settings-sidebar">
        {/* Top: App Logo & Back Button */}
        <div className="settings-sidebar-header">
          <div className="app-logo-badge" title="Atrium // 智役中庭">
            <img src="/logo.png" alt="Atrium" className="app-logo-icon" />
          </div>
          <button type="button" className="settings-back-btn" onClick={onBack} title="返回工作区">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span>返回工作区</span>
          </button>
        </div>

        {/* Section Header */}
        <div className="settings-menu-group-title">基础设置</div>

        {/* Nav Items */}
        <nav className="settings-menu-list">
          {/* 1. 常规 */}
          <button
            type="button"
            className={`settings-menu-item ${activeTab === "general" ? "active" : ""}`}
            onClick={() => setActiveTab("general")}
          >
            <span className="menu-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </span>
            <span>常规</span>
          </button>

          {/* 2. 外观 */}
          <button
            type="button"
            className={`settings-menu-item ${activeTab === "appearance" ? "active" : ""}`}
            onClick={() => setActiveTab("appearance")}
          >
            <span className="menu-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            </span>
            <span>外观</span>
          </button>

          {/* 3. 模型 */}
          <button
            type="button"
            className={`settings-menu-item ${activeTab === "model" ? "active" : ""}`}
            onClick={() => setActiveTab("model")}
          >
            <span className="menu-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </span>
            <span>模型</span>
          </button>

          {/* 4. 词元统计 */}
          <button
            type="button"
            className={`settings-menu-item ${activeTab === "tokens" ? "active" : ""}`}
            onClick={() => setActiveTab("tokens")}
          >
            <span className="menu-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </span>
            <span>词元统计</span>
          </button>
        </nav>
      </aside>

      {/* Right Settings Content Canvas */}
      <main className="settings-main-content">
        {/* ========================================================= */}
        {/* TAB 1: 常规设置                                           */}
        {/* ========================================================= */}
        {activeTab === "general" && (
          <div className="settings-tab-pane">
            <div className="pane-header">
              <h2 className="pane-title">常规设置</h2>
              <p className="pane-subtitle">管理个人账户、工作区环境与流水线调度协议。</p>
            </div>

            <div className="settings-card">
              <div className="setting-row">
                <div className="setting-label-col">
                  <span className="setting-title">个人账户名称</span>
                  <span className="setting-desc">用于对话消息标识与装具操作员身份</span>
                </div>
                <div className="setting-control-col">
                  <input
                    type="text"
                    className="zcode-input"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    onBlur={handleSaveGeneral}
                    placeholder="例如: Tempsyche"
                  />
                </div>
              </div>

              <div className="setting-row">
                <div className="setting-label-col">
                  <span className="setting-title">默认工作区目录</span>
                  <span className="setting-desc">代码工程与任务缓存所在系统路径</span>
                </div>
                <div className="setting-control-col" style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    className="zcode-input"
                    readOnly
                    value={workspacePath || "（尚未定位工作区目录）"}
                  />
                  <button type="button" className="zcode-btn-secondary" onClick={onOpenWorkspace}>
                    打开目录
                  </button>
                </div>
              </div>

              <div className="setting-row">
                <div className="setting-label-col">
                  <span className="setting-title">智能体编排调度协议</span>
                  <span className="setting-desc">控制多节点协同流水线是串行拓扑还是并行基准对比</span>
                </div>
                <div className="setting-control-col">
                  <select
                    className="zcode-select"
                    value={settings.orchestrationMode}
                    onChange={(e) =>
                      onSaveSettings({
                        ...settings,
                        orchestrationMode: e.target.value as AppSettings["orchestrationMode"],
                      })
                    }
                  >
                    <option value="dag">确定性 DAG 流水线 (Deterministic DAG)</option>
                    <option value="parallel">全向并行群测 (Parallel Concurrency)</option>
                  </select>
                </div>
              </div>

              <div className="setting-row danger-zone">
                <div className="setting-label-col">
                  <span className="setting-title" style={{ color: "var(--accent-danger)" }}>
                    会话历史与缓存重置
                  </span>
                  <span className="setting-desc">清空所有聊天记录、执行节点日志与临时缓存文件</span>
                </div>
                <div className="setting-control-col">
                  <button
                    type="button"
                    className="zcode-btn-danger"
                    onClick={() =>
                      showConfirm("确定要清空全部会话与运行历史记录吗？此操作不可逆。", () => onClearHistory())
                    }
                  >
                    清空运行缓存与记录
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: 外观设置                                           */}
        {/* ========================================================= */}
        {activeTab === "appearance" && (
          <div className="settings-tab-pane">
            <div className="pane-header">
              <h2 className="pane-title">外观设置</h2>
              <p className="pane-subtitle">定制终端视觉模式、字体字号与界面密度偏好。</p>
            </div>

            <div className="settings-card">
              <div className="setting-row">
                <div className="setting-label-col">
                  <span className="setting-title">界面主题偏好</span>
                  <span className="setting-desc">选择契合工作环境的配色方案</span>
                </div>
                <div className="setting-control-col">
                  <div className="theme-toggle-group">
                    {(["light", "system", "dark"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        className={`theme-option-btn ${themeMode === mode ? "active" : ""}`}
                        onClick={() => onSaveSettings({ ...settings, themeMode: mode })}
                      >
                        <span>
                          {mode === "light" ? "明亮浅色" : mode === "system" ? "跟随操作系统" : "暗黑冷灰"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="setting-row">
                <div className="setting-label-col">
                  <span className="setting-title">正文字号大小</span>
                  <span className="setting-desc">调整代码遥测流与对话流文字缩放</span>
                </div>
                <div className="setting-control-col">
                  <select
                    className="zcode-select"
                    value={fontSize}
                    onChange={(e) =>
                      onSaveSettings({ ...settings, fontSize: e.target.value as AppSettings["fontSize"] })
                    }
                  >
                    <option value="13px">紧凑 (13px)</option>
                    <option value="14px">标准 (14px)</option>
                    <option value="15px">舒适 (15px)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: 模型设置（全部为自定义供应商）                      */}
        {/* ========================================================= */}
        {activeTab === "model" && (
          <div className="settings-tab-pane">
            <div className="pane-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h2 className="pane-title">模型设置</h2>
                <p className="pane-subtitle">管理自定义模型供应商，配置后可在聊天时选择使用。</p>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button type="button" className="zcode-btn-primary" onClick={handleAddProvider}>
                  + 添加供应商
                </button>
              </div>
            </div>

            <div className="model-split-view">
              {/* Left Column: Providers List */}
              <div className="providers-column">
                <div className="column-subheading">供应商</div>
                {settings.aiProfiles.map((profile, index) => {
                  const ready = profile.apiKey.trim() !== "" && profile.endpoint.trim() !== "";
                  return (
                    <div
                      key={profile.id}
                      className={`provider-list-item ${currentProfile?.id === profile.id ? "active" : ""}`}
                      onClick={() => setActiveProfileId(profile.id)}
                    >
                      <span className="provider-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        </svg>
                      </span>
                      <span className="provider-text">
                        <span className="provider-name">{displayName(profile, index)}</span>
                        {profile.description.trim() && (
                          <span className="provider-desc">{profile.description}</span>
                        )}
                      </span>
                      <span
                        className={`status-dot ${ready ? "success" : "warning"}`}
                        title={ready ? "凭据与端点已配置" : "待配置端点或凭据"}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Provider Detail Card */}
              <div className="provider-detail-column">
                {currentProfile ? (
                  <div className="provider-detail-card">
                    {/* Identity */}
                    <div className="detail-card-header">
                      <span className="provider-badge-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        </svg>
                      </span>
                      <h3>{displayName(currentProfile, profileIndex < 0 ? 0 : profileIndex)}</h3>
                    </div>

                    {/* Connection Config Form */}
                    <div className="config-form-section">
                      <div className="form-item">
                        <label>供应商名称（可空）</label>
                        <input
                          type="text"
                          className="zcode-input"
                          value={currentProfile.name}
                          onChange={(e) => handleUpdateCurrentProfile({ name: e.target.value })}
                          placeholder={`供应商${profileIndex < 0 ? 1 : profileIndex + 1}`}
                        />
                      </div>

                      <div className="form-item">
                        <label>描述（可空）</label>
                        <input
                          type="text"
                          className="zcode-input"
                          value={currentProfile.description}
                          onChange={(e) => handleUpdateCurrentProfile({ description: e.target.value })}
                          placeholder="例如：DeepSeek 官方 API"
                        />
                      </div>

                      <div className="form-item">
                        <label>Base URL</label>
                        <input
                          type="text"
                          className="zcode-input"
                          value={currentProfile.endpoint}
                          onChange={(e) => handleUpdateCurrentProfile({ endpoint: e.target.value })}
                          placeholder="https://api.deepseek.com/v1"
                        />
                      </div>

                      <div className="form-item">
                        <label>API Key</label>
                        <input
                          type="password"
                          className="zcode-input"
                          value={currentProfile.apiKey}
                          onChange={(e) => handleUpdateCurrentProfile({ apiKey: e.target.value })}
                          placeholder="sk-..."
                        />
                      </div>
                    </div>

                    {/* Models List Section */}
                    <div className="models-list-section">
                      <div className="models-list-header">
                        <span>模型列表</span>
                        <button type="button" className="zcode-btn-secondary small" onClick={handleAddModel}>
                          + 添加模型
                        </button>
                      </div>

                      <div className="models-table">
                        {currentProfile.models.length > 0 ? (
                          currentProfile.models.map((model) => (
                            <div key={model.id} className="model-edit-row">
                              <input
                                type="text"
                                className="zcode-input"
                                value={model.name}
                                onChange={(e) => handleUpdateModel(model.id, { name: e.target.value })}
                                placeholder="模型名称，如 deepseek-flash"
                              />
                              <input
                                type="text"
                                className="zcode-input"
                                value={model.contextLength ?? ""}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/[^0-9]/g, "");
                                  handleUpdateModel(model.id, { contextLength: raw === "" ? null : Number(raw) });
                                }}
                                placeholder="上下文长度"
                              />
                              <button
                                type="button"
                                className={`zcode-btn-secondary small ${currentProfile.model === model.name.trim() && model.name.trim() ? "active" : ""}`}
                                disabled={!model.name.trim()}
                                onClick={() => handleSetDefaultModel(model.name)}
                                title="将此模型设为该供应商默认模型"
                              >
                                {model.name.trim() !== "" && currentProfile.model === model.name.trim() ? "默认" : "设为默认"}
                              </button>
                              <button
                                type="button"
                                className="model-row-remove"
                                onClick={() => handleRemoveModel(model.id)}
                                title="删除模型"
                              >
                                ✕
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="model-row-item" style={{ color: "var(--text-muted)", justifyContent: "center", padding: "14px" }}>
                            暂无模型，点击「+ 添加模型」创建
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="detail-actions">
                      <button
                        type="button"
                        className="zcode-btn-dark-pill"
                        onClick={handleProbeProvider}
                        title="使用当前 Base URL 与 API Key 执行连通性自检"
                      >
                        测试通道
                      </button>
                      <button
                        type="button"
                        className="zcode-btn-danger"
                        onClick={handleDeleteProvider}
                        title="删除当前供应商"
                      >
                        删除供应商
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="provider-detail-card" style={{ color: "var(--text-muted)" }}>
                    暂无供应商，点击右上角「+ 添加供应商」创建。
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: 词元统计                                           */}
        {/* ========================================================= */}
        {activeTab === "tokens" && (
          <div className="settings-tab-pane">
            <div className="pane-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h2 className="pane-title">词元统计</h2>
                <p className="pane-subtitle">监控各智能体模型 Token 吞吐量、推理耗时与成本估算明细。</p>
              </div>
              <button
                type="button"
                className="zcode-btn-secondary small"
                onClick={handleResetTokens}
                title="清空并重置所有词元统计数据"
              >
                重置统计
              </button>
            </div>

            {/* Metric Overview Cards */}
            <div className="stats-metric-grid">
              <div className="metric-card">
                <span className="metric-label">输入 Prompt Tokens</span>
                <span className="metric-value">
                  {tokenMetrics ? tokenMetrics.totalPromptTokens.toLocaleString() : "0"}
                </span>
                <span className="metric-trend text-success">原生 Rust BPE/CJK 高精估算</span>
              </div>

              <div className="metric-card">
                <span className="metric-label">生成 Completion Tokens</span>
                <span className="metric-value">
                  {tokenMetrics ? tokenMetrics.totalCompletionTokens.toLocaleString() : "0"}
                </span>
                <span className="metric-trend text-success">实时追踪</span>
              </div>

              <div className="metric-card">
                <span className="metric-label">总调度请求次数</span>
                <span className="metric-value">
                  {tokenMetrics ? `${tokenMetrics.totalRequests} 次` : "0 次"}
                </span>
                <span className="metric-trend">安全审计记录</span>
              </div>

              <div className="metric-card">
                <span className="metric-label">平均响应延迟</span>
                <span className="metric-value">
                  {tokenMetrics && tokenMetrics.totalRequests > 0
                    ? `${Math.round(tokenMetrics.totalLatencyMs / tokenMetrics.totalRequests)} ms`
                    : "0 ms"}
                </span>
                <span className="metric-trend">极速吞吐</span>
              </div>
            </div>

            {/* Token Usage Breakdown Table */}
            <div className="settings-card" style={{ marginTop: "20px" }}>
              <div className="list-section-header" style={{ marginBottom: "8px" }}>
                模型维度调用细则
              </div>
              <div className="models-table">
                <div className="model-row-item header">
                  <span>模型名称</span>
                  <span>输入 Tokens</span>
                  <span>输出 Tokens</span>
                  <span>调用次数</span>
                  <span>平均延迟</span>
                  <span>状态</span>
                </div>
                {tokenMetrics && tokenMetrics.models.length > 0 ? (
                  tokenMetrics.models.map((m) => (
                    <div key={m.modelName} className="model-row-item">
                      <span className="model-title">{m.modelName}</span>
                      <span>{m.promptTokens.toLocaleString()}</span>
                      <span>{m.completionTokens.toLocaleString()}</span>
                      <span>{m.requestCount} 次</span>
                      <span>
                        {m.requestCount > 0
                          ? `${Math.round(m.totalLatencyMs / m.requestCount)} ms`
                          : "-"}
                      </span>
                      <span className="status-badge active">就绪</span>
                    </div>
                  ))
                ) : (
                  <div className="model-row-item" style={{ color: "var(--zcode-text-tertiary)", justifyContent: "center", padding: "16px" }}>
                    暂无模型调度记录
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* In-app centered dialog (replaces native confirm/alert) */}
      {dialog && <AppDialog request={dialog} onClose={() => setDialog(null)} />}
    </div>
  );
}
