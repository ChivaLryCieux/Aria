import React, { useEffect, useRef, useState } from "react";
import { ProviderModel, ReasoningEffort, Soul } from "../types/chat";

const EFFORT_OPTIONS: { key: ReasoningEffort; label: string }[] = [
  { key: "max", label: "最高" },
  { key: "high", label: "标准" },
  { key: "low", label: "低" },
  { key: "off", label: "关闭" },
];

type DropdownItem = { key: string; label: string };

type PillDropdownProps = {
  label: string;
  items: DropdownItem[];
  selectedKey?: string | null;
  onSelect: (key: string) => void;
  emptyHint?: string;
};

function PillDropdown({ label, items, selectedKey, onSelect, emptyHint }: PillDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="pill-dropdown" ref={ref}>
      <button type="button" className="pill-dropdown-btn" onClick={() => setOpen((prev) => !prev)}>
        <span>{label}</span>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="pill-dropdown-menu">
          {items.length === 0 && <div className="pill-dropdown-empty">{emptyHint ?? "暂无可选项"}</div>}
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`pill-dropdown-item ${item.key === selectedKey ? "active" : ""}`}
              onClick={() => {
                onSelect(item.key);
                setOpen(false);
              }}
            >
              <span>{item.label}</span>
              {item.key === selectedKey && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type PromptCardProps = {
  projectName: string;
  projectTooltip?: string;
  placeholder: string;
  draft: string;
  setDraft: (v: string) => void;
  onSend: () => void;
  isSending: boolean;
  souls: Soul[];
  activeSoul: string | null;
  onActivateSoul: (folder: string) => void;
  models: ProviderModel[];
  selectedModel: string;
  onSelectModel: (name: string) => void;
  reasoningEffort: ReasoningEffort;
  onSelectReasoningEffort: (effort: ReasoningEffort) => void;
};

export function PromptCard({
  projectName,
  projectTooltip,
  placeholder,
  draft,
  setDraft,
  onSend,
  isSending,
  souls,
  activeSoul,
  onActivateSoul,
  models,
  selectedModel,
  onSelectModel,
  reasoningEffort,
  onSelectReasoningEffort,
}: PromptCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (draft.trim() && !isSending) onSend();
    }
  };

  const activeSoulName = souls.find((s) => s.folder === activeSoul)?.name ?? "默认人格";
  const modelItems: DropdownItem[] = models
    .filter((m) => m.name.trim())
    .map((m) => ({ key: m.name, label: m.name }));
  const soulItems: DropdownItem[] = souls.map((s) => ({ key: s.folder, label: s.name }));

  return (
    <div className="prompt-card">
      {/* Header: static project name */}
      <div className="prompt-card-header">
        <span className="project-label" title={projectTooltip}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span>{projectName}</span>
        </span>
      </div>

      {/* Text Input Area */}
      <textarea
        className="prompt-textarea"
        placeholder={placeholder}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={2}
      />

      {/* Bottom Actions Bar: soul / model / effort — send */}
      <div className="prompt-card-footer">
        <div className="footer-left-controls">
          <PillDropdown
            label={activeSoulName}
            items={soulItems}
            selectedKey={activeSoul}
            onSelect={onActivateSoul}
            emptyHint="暂无人格"
          />
          <PillDropdown
            label={selectedModel || "模型"}
            items={modelItems}
            selectedKey={selectedModel}
            onSelect={onSelectModel}
            emptyHint="该供应商暂无模型"
          />
          <PillDropdown
            label={EFFORT_OPTIONS.find((o) => o.key === reasoningEffort)?.label ?? "标准"}
            items={EFFORT_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
            selectedKey={reasoningEffort}
            onSelect={(key) => onSelectReasoningEffort(key as ReasoningEffort)}
          />
        </div>

        <div className="footer-right-controls">
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
  );
}
