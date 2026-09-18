use serde::{Deserialize, Serialize};
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HarnessConnection {
    pub status: String,
    pub url: String,
    pub port: u16,
    pub token: Option<String>,
    pub pid: Option<u32>,
    pub message: Option<String>,
}

impl Default for HarnessConnection {
    fn default() -> Self {
        Self {
            status: "standby".to_string(),
            url: "http://127.0.0.1:19387".to_string(),
            port: 19387,
            token: Some("aria-session-token".to_string()),
            pid: None,
            message: Some("Harness daemon not started yet".to_string()),
        }
    }
}

pub struct DshDaemon {
    pub connection: HarnessConnection,
    child: Option<Child>,
}

impl DshDaemon {
    pub fn new() -> Self {
        Self {
            connection: HarnessConnection::default(),
            child: None,
        }
    }

    pub async fn start(&mut self) -> Result<HarnessConnection, String> {
        if let Some(child) = &mut self.child {
            if let Ok(None) = child.try_wait() {
                return Ok(self.connection.clone());
            }
        }

        let mut cmd = Command::new("node");
        cmd.arg("scripts/dsh-daemon.mjs");
        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn DSH daemon: {e}"))?;
        let pid = child.id();

        let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
        let mut reader = BufReader::new(stdout).lines();

        let mut conn = HarnessConnection {
            status: "ready".to_string(),
            url: "http://127.0.0.1:19387".to_string(),
            port: 19387,
            token: Some("aria-session-token".to_string()),
            pid,
            message: Some("DSH Core Daemon online".to_string()),
        };

        let startup_future = async {
            while let Ok(Some(line)) = reader.next_line().await {
                if line.contains("[ARIA_DSH_DAEMON_READY]") {
                    if let Some(json_str) = line.split("[ARIA_DSH_DAEMON_READY]").nth(1) {
                        if let Ok(val) = serde_json::from_str::<serde_json::Value>(json_str.trim()) {
                            if let Some(url) = val.get("url").and_then(|u| u.as_str()) {
                                conn.url = url.to_string();
                            }
                            if let Some(port) = val.get("port").and_then(|p| p.as_u64()) {
                                conn.port = port as u16;
                            }
                            if let Some(token) = val.get("token").and_then(|t| t.as_str()) {
                                conn.token = Some(token.to_string());
                            }
                        }
                    }
                    break;
                }
            }
        };

        let _ = tokio::time::timeout(std::time::Duration::from_secs(5), startup_future).await;

        self.connection = conn.clone();
        self.child = Some(child);

        Ok(conn)
    }

    pub async fn stop(&mut self) -> Result<(), String> {
        if let Some(mut child) = self.child.take() {
            let _ = child.kill().await;
        }
        self.connection.status = "stopped".to_string();
        self.connection.pid = None;
        self.connection.message = Some("Daemon terminated".to_string());
        Ok(())
    }
}
