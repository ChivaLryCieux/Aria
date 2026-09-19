import { invoke } from "@tauri-apps/api/core";
import { KernelStatusEvent } from "../services/dshClient";

type TopBarProps = {
  kernelStatus?: KernelStatusEvent | null;
  onNewTerminal?: () => void;
  onOpenHelp?: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
  onGoBack?: () => void;
  onGoForward?: () => void;
};

const KERNEL_STATUS_META: Record<string, { color: string; label: string }> = {
  ready: { color: "var(--signal-green, #3fb27f)", label: "内核在线" },
  starting: { color: "var(--signal-amber, #d9a441)", label: "内核启动中" },
  error: { color: "var(--accent-danger, #c2543e)", label: "内核异常" },
  missing: { color: "var(--accent-danger, #c2543e)", label: "内核未构建" },
  stopping: { color: "var(--text-dim, #8a8a8a)", label: "内核停止中" },
};

export function TopBar({
  kernelStatus,
  onNewTerminal,
  onOpenHelp,
  canGoBack = false,
  canGoForward = false,
  onGoBack,
  onGoForward,
}: TopBarProps) {
  const handleMinimize = async () => {
    try {
      await invoke("minimize_window");
    } catch {
      console.log("Window minimize (fallback browser mode)");
    }
  };

  const handleToggleMaximize = async () => {
    try {
      await invoke("toggle_maximize_window");
    } catch {
      console.log("Window maximize (fallback browser mode)");
    }
  };

  const handleClose = async () => {
    try {
      await invoke("close_window");
    } catch {
      console.log("Window close (fallback browser mode)");
    }
  };

  return (
    <header className="top-bar" data-tauri-drag-region>
      {/* Left: App Logo & Navigation Arrows */}
      <div className="top-bar-left">
        <div className="app-logo-badge" title="Atrium // 智役中庭">
          <img src="/logo.png" alt="Atrium" className="app-logo-icon" />
        </div>

        <div className="history-nav">
          <button
            type="button"
            className="nav-btn"
            disabled={!canGoBack}
            onClick={onGoBack}
            title="后退"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            className="nav-btn"
            disabled={!canGoForward}
            onClick={onGoForward}
            title="前进"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Center Draggable Spacer */}
      <div className="top-bar-center" data-tauri-drag-region />

      {/* Right: Help, New Terminal, Window Controls */}
      <div className="top-bar-right">
        {/* Kernel status indicator */}
        <div
          className="kernel-status-chip"
          title={kernelStatus?.detail || "DSH 内核状态"}
        >
          <span
            className="status-dot"
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: KERNEL_STATUS_META[kernelStatus?.status ?? ""]?.color ?? "var(--text-dim, #8a8a8a)",
              display: "inline-block",
            }}
          />
          <span style={{ fontSize: "11px", letterSpacing: "0.5px" }}>
            {KERNEL_STATUS_META[kernelStatus?.status ?? ""]?.label ?? "DSH 内核"}
          </span>
        </div>

        {/* Help icon */}
        <button
          type="button"
          className="icon-btn"
          title="帮助中心"
          onClick={onOpenHelp}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" />
          </svg>
        </button>

        {/* New Terminal icon [>_] */}
        <button
          type="button"
          className="icon-btn"
          title="新建终端"
          onClick={onNewTerminal}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="16" rx="3" />
            <path d="M7 9l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="13" y1="15" x2="17" y2="15" strokeLinecap="round" />
          </svg>
        </button>

        {/* Windows Frame Controls: Minimize, Maximize, Close */}
        <div className="window-controls">
          <button
            type="button"
            className="win-btn minimize"
            title="最小化"
            onClick={handleMinimize}
          >
            <svg width="11" height="11" viewBox="0 0 12 12">
              <rect fill="currentColor" width="10" height="1.2" x="1" y="5.5" />
            </svg>
          </button>
          <button
            type="button"
            className="win-btn maximize"
            title="最大化 / 还原"
            onClick={handleToggleMaximize}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="1.5" y="1.5" width="9" height="9" />
            </svg>
          </button>
          <button
            type="button"
            className="win-btn close"
            title="关闭"
            onClick={handleClose}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
              <line x1="1.5" y1="1.5" x2="10.5" y2="10.5" />
              <line x1="10.5" y1="1.5" x2="1.5" y2="10.5" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
