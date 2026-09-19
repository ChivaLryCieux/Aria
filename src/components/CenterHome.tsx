import React from "react";
import { ExecutionMode, ProviderModel, Project, ReasoningEffort, Soul } from "../types/chat";
import { PromptCard } from "./PromptCard";

type CenterHomeProps = {
  draft: string;
  setDraft: (val: string) => void;
  onSend: () => void;
  isSending: boolean;
  activeProject: Project | null;
  fallbackProjectName: string;
  souls: Soul[];
  activeSoul: string | null;
  onActivateSoul: (folder: string) => void;
  models: ProviderModel[];
  selectedModel: string;
  onSelectModel: (m: string) => void;
  reasoningEffort: ReasoningEffort;
  onSelectReasoningEffort: (effort: ReasoningEffort) => void;
  executionMode: ExecutionMode;
  onSelectExecutionMode: (mode: ExecutionMode) => void;
};

export function CenterHome({
  draft,
  setDraft,
  onSend,
  isSending,
  activeProject,
  fallbackProjectName,
  souls,
  activeSoul,
  onActivateSoul,
  models,
  selectedModel,
  onSelectModel,
  reasoningEffort,
  onSelectReasoningEffort,
  executionMode,
  onSelectExecutionMode,
}: CenterHomeProps) {
  return (
    <div className="center-home">
      {/* Greeting Heading */}
      <h1 className="greeting-text">您的智能体清醒着</h1>

      <PromptCard
        projectName={activeProject?.name?.trim() || fallbackProjectName}
        projectTooltip={activeProject?.description || activeProject?.defaultDirectory || undefined}
        placeholder="向 Atrium 提问，使用 @ 添加上下文，使用 / 呼出指令能力"
        draft={draft}
        setDraft={setDraft}
        onSend={onSend}
        isSending={isSending}
        souls={souls}
        activeSoul={activeSoul}
        onActivateSoul={onActivateSoul}
        models={models}
        selectedModel={selectedModel}
        onSelectModel={onSelectModel}
        reasoningEffort={reasoningEffort}
        onSelectReasoningEffort={onSelectReasoningEffort}
        executionMode={executionMode}
        onSelectExecutionMode={onSelectExecutionMode}
      />
    </div>
  );
}
