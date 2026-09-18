import { useState } from "react";
import { AppSettings, AiProfile } from "../types/chat";

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
  const [themeMode, setThemeMode] = useState<"light" | "system" | "dark">("light");
  const [fontSize, setFontSize] = useState<"13px" | "14px" | "15px">("14px");

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

  return (
    <div className="settings-page-layout">
      {/* Left Settings Sidebar */}
      <aside className="settings-sidebar">
        {/* Top: App Logo & Back Button */}
        <div className="settings-sidebar-header">
          <div className="app-logo-badge" title="ZCode / Aria">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 5h16v3.2l-10.2 10.8H20v3H4v-3.2L14.2 8H4V5z" />
            </svg>
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
                    value={workspacePath || "c:\\Users\\LRY\\Desktop\\BASE\\Aria"}
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
                    onClick={() => {
                      if (confirm("确定要清空全部会话与运行历史记录吗？此操作不可逆。")) {
                        onClearHistory();
                      }
                    }}
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
                    <button
                      type="button"
                      className={`theme-option-btn ${themeMode === "light" ? "active" : ""}`}
                      onClick={() => setThemeMode("light")}
                    >
                      <span>明亮浅色 (ZCode)</span>
                    </button>
                    <button
                      type="button"
                      className={`theme-option-btn ${themeMode === "system" ? "active" : ""}`}
                      onClick={() => setThemeMode("system")}
                    >
                      <span>跟随操作系统</span>
                    </button>
                    <button
                      type="button"
                      className={`theme-option-btn ${themeMode === "dark" ? "active" : ""}`}
                      onClick={() => setThemeMode("dark")}
                    >
                      <span>暗黑冷灰</span>
                    </button>
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
                    onChange={(e) => setFontSize(e.target.value as any)}
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
        {/* TAB 3: 模型设置 (1:1 参考 ZCode 截图布局)                 */}
        {/* ========================================================= */}
        {activeTab === "model" && (
          <div className="settings-tab-pane">
            <div className="pane-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h2 className="pane-title">模型设置</h2>
                <p className="pane-subtitle">管理自定义模型供应商，配置后可在聊天时选择使用。</p>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button type="button" className="zcode-icon-btn" title="刷新服务可用性">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 4v6h-6" />
                    <path d="M1 20v-6h6" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                </button>
                <button type="button" className="zcode-btn-primary">
                  + 添加供应商
                </button>
              </div>
            </div>

            <div className="model-split-view">
              {/* Left Column: Providers List */}
              <div className="providers-column">
                <div className="column-subheading">官方与预设</div>
                <div
                  className={`provider-list-item ${currentProfile?.name.includes("BigModel") ? "active" : ""}`}
                  onClick={() => {
                    const found = settings.aiProfiles.find((p) => p.name.includes("BigModel"));
                    if (found) setActiveProfileId(found.id);
                  }}
                >
                  <span className="provider-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                      <polygon points="12 2 2 7 12 12 22 7 12 2" />
                      <polyline points="2 17 12 22 22 17" />
                      <polyline points="2 12 12 17 22 12" />
                    </svg>
                  </span>
                  <span className="provider-name">BigModel</span>
                  <span className="status-dot warning" title="体验通道" />
                </div>

                <div className="column-subheading">自定义供应商</div>
                {settings.aiProfiles.map((profile) => (
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
                    <span className="provider-name">{profile.name}</span>
                    <span className="status-dot success" title="运行就绪" />
                  </div>
                ))}
              </div>

              {/* Right Column: Provider Detail Card */}
              <div className="provider-detail-column">
                <div className="provider-detail-card">
                  {/* Card Top Row */}
                  <div className="detail-card-header">
                    <div className="provider-title-group">
                      <span className="provider-badge-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                          <polygon points="12 2 2 7 12 12 22 7 12 2" />
                          <polyline points="2 17 12 22 22 17" />
                        </svg>
                      </span>
                      <h3>{currentProfile?.name || "DeepSeek"}</h3>
                    </div>

                    <div className="connect-mode-group">
                      <span className="connect-mode-label">连接方式</span>
                      <select className="zcode-select small">
                        <option value="direct">API 密钥认证</option>
                        <option value="proxy">体验套餐</option>
                        <option value="local">本地 Ollama / vLLM</option>
                      </select>
                    </div>
                  </div>

                  {/* Build / Auth Banner */}
                  <div className="provider-banner">
                    <div className="banner-left">
                      <strong>ZCode / Aria Engine Link</strong>
                      <div className="banner-sub">
                        <span className="text-success">待生效 23:00</span>
                        <span> · 验证周期 2026-09-20</span>
                      </div>
                    </div>
                    <div className="banner-right">
                      <button
                        type="button"
                        className="zcode-btn-dark-pill"
                        onClick={() => alert("端点连通性自检：正常响应 200 OK")}
                      >
                        测试通道
                      </button>
                    </div>
                  </div>

                  {/* Connection Config Form */}
                  <div className="config-form-section">
                    <div className="form-item">
                      <label>API 基础端点 (Base URL)</label>
                      <input
                        type="text"
                        className="zcode-input"
                        value={currentProfile?.endpoint || ""}
                        onChange={(e) => handleUpdateCurrentProfile({ endpoint: e.target.value })}
                        placeholder="https://api.deepseek.com/v1"
                      />
                    </div>

                    <div className="form-item">
                      <label>API Key 认证凭据</label>
                      <input
                        type="password"
                        className="zcode-input"
                        value={currentProfile?.apiKey || ""}
                        onChange={(e) => handleUpdateCurrentProfile({ apiKey: e.target.value })}
                        placeholder="sk-..."
                      />
                    </div>
                  </div>

                  {/* Models List Section */}
                  <div className="models-list-section">
                    <div className="models-list-header">
                      <span>可用模型列表</span>
                      <button
                        type="button"
                        className="zcode-btn-secondary small"
                        onClick={() => {
                          const model = prompt("请输入要添加的模型 ID (如 deepseek-reasoner):");
                          if (model) handleUpdateCurrentProfile({ model });
                        }}
                      >
                        + 添加模型
                      </button>
                    </div>

                    <div className="models-table">
                      {["deepseek-chat", "deepseek-reasoner", "deepseek-flash"].map((modelId) => (
                        <div key={modelId} className="model-row-item">
                          <div className="model-info">
                            <span className="model-title">{modelId}</span>
                            <span className="model-tag">128K 上下文</span>
                          </div>
                          <button
                            type="button"
                            className={`zcode-btn-secondary small ${currentProfile?.model === modelId ? "active" : ""}`}
                            onClick={() => handleUpdateCurrentProfile({ model: modelId })}
                          >
                            {currentProfile?.model === modelId ? "使用中" : "设为默认"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: 词元统计                                           */}
        {/* ========================================================= */}
        {activeTab === "tokens" && (
          <div className="settings-tab-pane">
            <div className="pane-header">
              <h2 className="pane-title">词元统计</h2>
              <p className="pane-subtitle">监控各智能体模型 Token 吞吐量、推理耗时与成本估算明细。</p>
            </div>

            {/* Metric Overview Cards */}
            <div className="stats-metric-grid">
              <div className="metric-card">
                <span className="metric-label">输入 Prompt Tokens</span>
                <span className="metric-value">128,450</span>
                <span className="metric-trend text-success">↑ 较昨日 +12%</span>
              </div>

              <div className="metric-card">
                <span className="metric-label">生成 Completion Tokens</span>
                <span className="metric-value">46,230</span>
                <span className="metric-trend text-success">↑ 深度推演 8 次</span>
              </div>

              <div className="metric-card">
                <span className="metric-label">总调度请求次数</span>
                <span className="metric-value">84 次</span>
                <span className="metric-trend">成功率 100%</span>
              </div>

              <div className="metric-card">
                <span className="metric-label">平均响应延迟</span>
                <span className="metric-value">620 ms</span>
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
                  <span>平均延迟</span>
                  <span>状态</span>
                </div>
                <div className="model-row-item">
                  <span className="model-title">deepseek-flash</span>
                  <span>82,100</span>
                  <span>24,500</span>
                  <span>380ms</span>
                  <span className="status-badge active">活跃</span>
                </div>
                <div className="model-row-item">
                  <span className="model-title">deepseek-chat</span>
                  <span>34,120</span>
                  <span>12,800</span>
                  <span>650ms</span>
                  <span className="status-badge active">就绪</span>
                </div>
                <div className="model-row-item">
                  <span className="model-title">deepseek-reasoner</span>
                  <span>12,230</span>
                  <span>8,930</span>
                  <span>1,420ms</span>
                  <span className="status-badge active">思考算子</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
