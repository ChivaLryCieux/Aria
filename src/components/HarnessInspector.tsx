import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { HarnessConnectionInfo } from "../services/dshClient";

interface HarnessInspectorProps {
  harnessConn: HarnessConnectionInfo | null;
  onRefreshConn: () => void;
}

export function HarnessInspector({ harnessConn, onRefreshConn }: HarnessInspectorProps) {
  const [workspacePath, setWorkspacePath] = useState<string>("");
  const [telemetryLogs] = useState<Array<{ id: string; time: string; text: string }>>([
    { id: "1", time: "INIT", text: "Atrium Harness Inspector ready." },
    { id: "2", time: "CORE", text: "DSH Core Daemon connection monitored on port 19387." },
    { id: "3", time: "CORDIS", text: "Cordis microkernel service graph healthy." },
  ]);

  useEffect(() => {
    invoke<string>("get_default_workspace_path")
      .then(setWorkspacePath)
      .catch(console.error);
  }, []);

  async function handleOpenWorkspace() {
    if (workspacePath) {
      try {
        await invoke("open_path_in_explorer", { path: workspacePath });
      } catch (err) {
        console.error(err);
      }
    }
  }

  return (
    <div className="panel-content">
      <div className="panel-head">
        <div>
          <p className="eyebrow">RUNTIME TELEMETRY</p>
          <h2>装具内核遥测</h2>
        </div>
        <button className="secondary" onClick={onRefreshConn}>
          重连 / 刷新
        </button>
      </div>

      <section className="profile-card">
        <div className="profile-card-head">
          <label className="toggle-row">
            <span className="status-indicator" style={{ display: "inline-block", marginRight: "6px" }} />
            <span>DSH CORE DAEMON</span>
          </label>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--signal-amber)" }}>
            {harnessConn?.status.toUpperCase() || "STANDBY"}
          </span>
        </div>

        <div className="field">
          <span>RPC 监听地址</span>
          <input type="text" readOnly value={harnessConn?.url || "http://127.0.0.1:19387"} />
        </div>

        <div className="field">
          <span>进程 PID</span>
          <input type="text" readOnly value={harnessConn?.pid ? String(harnessConn.pid) : "HOST_MANAGED"} />
        </div>

        <div className="field">
          <span>工作区路径 (WORKSPACE_PATH)</span>
          <input type="text" readOnly value={workspacePath || "C:\\Users\\...\\Atrium"} />
        </div>

        <button className="secondary full" onClick={handleOpenWorkspace}>
          OPEN IN EXPLORER // 打开本地工作目录
        </button>
      </section>

      <section className="profile-card">
        <div className="profile-card-head">
          <span>遥测事件流 (LIVE_EVENTS)</span>
          <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>{telemetryLogs.length} EVENTS</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "180px", overflowY: "auto" }}>
          {telemetryLogs.map((log) => (
            <div
              key={log.id}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                padding: "4px 6px",
                background: "var(--bg-input)",
                borderLeft: "2px solid var(--signal-cyan)",
              }}
            >
              <span style={{ color: "var(--signal-amber)", marginRight: "6px" }}>[{log.time}]</span>
              <span style={{ color: "var(--text-chalk)" }}>{log.text}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
