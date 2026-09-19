import React from "react";
import { AiProfile, ReasoningEffort } from "../types/chat";

export const KERNEL_MODEL_CATALOG = ["deepseek-flash", "deepseek-v4-pro"] as const;

const EFFORT_LABEL: Record<ReasoningEffort, string> = {
  max: "最高",
  high: "标准",
  low: "低",
  off: "关闭",
};

type CenterHomeProps = {
  draft: string;
  setDraft: (val: string) => void;
  onSend: () => void;
  isSending: boolean;
  profiles: AiProfile[];
  selectedProfileId: string;
  onSelectProfile: (id: string) => void;
  selectedModel: string;
  onSelectModel: (m: string) => void;
  reasoningEffort: ReasoningEffort;
  onSelectReasoningEffort: () => void;
  workspaceName?: string;
  onOpenWorkspace?: () => void;
};

export function CenterHome({
  draft,
  setDraft,
  onSend,
  isSending,
  profiles,
  selectedProfileId,
  onSelectProfile,
  selectedModel,
  onSelectModel,
  reasoningEffort,
  onSelectReasoningEffort,
  workspaceName = "更改环境",
  onOpenWorkspace,
}: CenterHomeProps) {
  const activeProfile = profiles.find((p) => p.id === selectedProfileId) || profiles[0];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (draft.trim() && !isSending) {
        onSend();
      }
    }
  };

  return (
    <div className="center-home">
      {/* Greeting Heading without decorative watermark lines */}
      <h1 className="greeting-text">您的智能体清醒着</h1>

      {/* Floating Prompt Input Card */}
      <div className="prompt-card">
        {/* Environment Picker Header */}
        <div className="prompt-card-header">
          <button
            type="button"
            className="env-selector-pill"
            onClick={onOpenWorkspace}
            title="选择或更改当前工作区环境"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span>{workspaceName || "更改环境"}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Text Input Area */}
        <textarea
          className="prompt-textarea"
          placeholder="向 Atrium 提问，使用 @ 添加上下文，使用 / 呼出指令能力"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
        />

        {/* Bottom Actions Bar */}
        <div className="prompt-card-footer">
          {/* Left Controls */}
          <div className="footer-left-controls">
            <button type="button" className="add-attachment-btn" title="添加附件或上下文">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>

            {/* Profile / Agent Selector (No emoji, no button background) */}
            <button
              type="button"
              className="pill-dropdown-btn"
              title="选择算子模型"
              onClick={() => {
                if (profiles.length > 1) {
                  const currentIndex = profiles.findIndex((p) => p.id === activeProfile?.id);
                  const next = profiles[(currentIndex + 1) % profiles.length];
                  onSelectProfile(next.id);
                }
              }}
            >
              <span>{activeProfile?.name || "生思创造默认"}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Right Controls (No button background / no emoji) */}
          <div className="footer-right-controls">
            {/* Model Tag - Cycles the kernel model catalog */}
            <button
              type="button"
              className="model-tag-pill"
              title="切换底层模型"
              onClick={() => {
                const models = KERNEL_MODEL_CATALOG as readonly string[];
                const curIdx = models.indexOf(selectedModel);
                const nextModel = models[(curIdx + 1) % models.length];
                onSelectModel(nextModel);
              }}
            >
              <span>ds/{selectedModel || "deepseek-flash"}</span>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Effort Tag - cycles kernel reasoning effort, persisted in settings */}
            <button
              type="button"
              className="mode-tag-pill"
              title="推理档位（最高 / 标准 / 关闭）"
              onClick={onSelectReasoningEffort}
            >
              <span>{EFFORT_LABEL[reasoningEffort] ?? "标准"}</span>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Send Button */}
            <button
              type="button"
              className="send-arrow-btn"
              disabled={!draft.trim() || isSending}
              onClick={onSend}
              title="发送指令"
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
  );
}
