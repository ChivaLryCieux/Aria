import { useState } from "react";
import { AppSettings } from "../types/chat";

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (nextSettings: AppSettings) => void;
  onClearHistory: () => void;
};

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
  onClearHistory,
}: SettingsModalProps) {
  const [userName, setUserName] = useState(settings.userName);
  const [activeProfile, setActiveProfile] = useState(settings.aiProfiles[0]);
  const [activeTab, setActiveTab] = useState<"general" | "model">("general");

  if (!isOpen) return null;

  const handleSave = () => {
    const updatedProfiles = settings.aiProfiles.map((p) =>
      p.id === activeProfile.id ? activeProfile : p
    );
    onSave({
      ...settings,
      userName,
      aiProfiles: updatedProfiles,
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span className="modal-title">偏好与参数设置</span>
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                type="button"
                className={`segmented-btn ${activeTab === "general" ? "active" : ""}`}
                onClick={() => setActiveTab("general")}
              >
                常规
              </button>
              <button
                type="button"
                className={`segmented-btn ${activeTab === "model" ? "active" : ""}`}
                onClick={() => setActiveTab("model")}
              >
                模型服务
              </button>
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {activeTab === "general" ? (
            <>
              <div className="form-field">
                <label>个人账户姓名</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="例如: Tempsyche"
                />
              </div>

              <div className="form-field">
                <label>编排调度协议</label>
                <select
                  value={settings.orchestrationMode}
                  onChange={(e) =>
                    onSave({
                      ...settings,
                      orchestrationMode: e.target.value as AppSettings["orchestrationMode"],
                    })
                  }
                >
                  <option value="dag">确定性 DAG 流水线 (Deterministic DAG)</option>
                  <option value="parallel">全向并行群测 (Parallel Concurrency)</option>
                </select>
              </div>

              <div style={{ marginTop: "12px" }}>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-secondary)" }}>
                  数据管理
                </label>
                <div style={{ marginTop: "6px" }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ color: "var(--accent-danger)", borderColor: "#fca5a5" }}
                    onClick={() => {
                      if (confirm("确定要清空所有会话和执行历史记录吗？")) {
                        onClearHistory();
                      }
                    }}
                  >
                    清空本机运行记录与历史
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="form-field">
                <label>模型名称</label>
                <input
                  type="text"
                  value={activeProfile.model}
                  onChange={(e) =>
                    setActiveProfile({ ...activeProfile, model: e.target.value })
                  }
                  placeholder="deepseek-chat 或 deepseek-reasoner"
                />
              </div>

              <div className="form-field">
                <label>API 端点 (Base URL)</label>
                <input
                  type="text"
                  value={activeProfile.endpoint}
                  onChange={(e) =>
                    setActiveProfile({ ...activeProfile, endpoint: e.target.value })
                  }
                  placeholder="https://api.deepseek.com/v1"
                />
              </div>

              <div className="form-field">
                <label>API Key (凭据密钥)</label>
                <input
                  type="password"
                  value={activeProfile.apiKey}
                  onChange={(e) =>
                    setActiveProfile({ ...activeProfile, apiKey: e.target.value })
                  }
                  placeholder="sk-..."
                />
              </div>

              <div className="form-field">
                <label>系统设定提示词 (System Prompt)</label>
                <textarea
                  style={{
                    minHeight: "80px",
                    padding: "8px 12px",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-sm)",
                    fontFamily: "inherit",
                    fontSize: "13px",
                    outline: "none",
                  }}
                  value={activeProfile.systemPrompt}
                  onChange={(e) =>
                    setActiveProfile({ ...activeProfile, systemPrompt: e.target.value })
                  }
                />
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            取消
          </button>
          <button type="button" className="btn-primary" onClick={handleSave}>
            保存更改
          </button>
        </div>
      </div>
    </div>
  );
}
