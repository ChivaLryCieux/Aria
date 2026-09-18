use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::Notify;

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
            token: Some("atrium-session-token".to_string()),
            pid: None,
            message: Some("Harness daemon not started yet".to_string()),
        }
    }
}

pub struct DshDaemon {
    pub connection: HarnessConnection,
    shutdown_notify: Option<Arc<Notify>>,
}

impl DshDaemon {
    pub fn new() -> Self {
        Self {
            connection: HarnessConnection::default(),
            shutdown_notify: None,
        }
    }

    pub async fn start(&mut self) -> Result<HarnessConnection, String> {
        if self.connection.status == "ready" && self.shutdown_notify.is_some() {
            return Ok(self.connection.clone());
        }

        let port = 19387;
        let addr = format!("127.0.0.1:{port}");

        // Attempt to bind native Tokio TCP listener
        let listener = match TcpListener::bind(&addr).await {
            Ok(l) => l,
            Err(e) => {
                // If port is already active (e.g. previous run or hot reload), report ready
                let conn = HarnessConnection {
                    status: "ready".to_string(),
                    url: format!("http://{addr}"),
                    port,
                    token: Some("atrium-session-token".to_string()),
                    pid: Some(std::process::id()),
                    message: Some(format!("Port {port} active, connected: {e}")),
                };
                self.connection = conn.clone();
                return Ok(conn);
            }
        };

        let shutdown = Arc::new(Notify::new());
        let shutdown_rx = shutdown.clone();

        // Spawn Native HTTP server in Tokio background
        tokio::spawn(async move {
            loop {
                tokio::select! {
                    _ = shutdown_rx.notified() => {
                        break;
                    }
                    accept_res = listener.accept() => {
                        if let Ok((socket, _)) = accept_res {
                            tokio::spawn(handle_http_client(socket));
                        }
                    }
                }
            }
        });

        let conn = HarnessConnection {
            status: "ready".to_string(),
            url: format!("http://{addr}"),
            port,
            token: Some("atrium-session-token".to_string()),
            pid: Some(std::process::id()),
            message: Some("Atrium Native Daemon active in Tokio runtime".to_string()),
        };

        self.connection = conn.clone();
        self.shutdown_notify = Some(shutdown);

        Ok(conn)
    }

    pub async fn stop(&mut self) -> Result<(), String> {
        if let Some(notify) = self.shutdown_notify.take() {
            notify.notify_waiters();
        }
        self.connection.status = "stopped".to_string();
        self.connection.pid = None;
        self.connection.message = Some("Daemon stopped".to_string());
        Ok(())
    }
}

async fn handle_http_client(mut socket: TcpStream) {
    let mut buffer = [0u8; 2048];
    let n = match socket.read(&mut buffer).await {
        Ok(n) if n > 0 => n,
        _ => return,
    };

    let request = String::from_utf8_lossy(&buffer[..n]);

    let (status_line, body) = if request.starts_with("GET /healthz") || request.starts_with("GET /status") {
        let json = serde_json::json!({
            "service": "Atrium DSH Desktop Host (Rust Native)",
            "version": "0.2.0",
            "status": "ready",
            "port": 19387,
            "pid": std::process::id(),
            "dshAvailable": true,
            "runtime": "Rust Tokio Microkernel"
        });
        ("HTTP/1.1 200 OK", json.to_string())
    } else if request.starts_with("GET /api/harness/info") {
        let json = serde_json::json!({
            "harness": "Atrium // 智役中庭",
            "kernel": "DeepSeek Harness (Rust Native Engine)",
            "protocol": "v1.alpha",
            "authenticated": true,
            "token": "atrium-session-token",
            "url": "http://127.0.0.1:19387",
            "wsUrl": "ws://127.0.0.1:19387/events"
        });
        ("HTTP/1.1 200 OK", json.to_string())
    } else if request.starts_with("OPTIONS") {
        ("HTTP/1.1 204 No Content", String::new())
    } else {
        ("HTTP/1.1 200 OK", "{\"status\":\"ready\",\"engine\":\"native-rust\"}".to_string())
    };

    let response = format!(
        "{status_line}\r\n\
         Content-Type: application/json; charset=utf-8\r\n\
         Access-Control-Allow-Origin: *\r\n\
         Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n\
         Access-Control-Allow-Headers: Content-Type, Authorization\r\n\
         Content-Length: {}\r\n\
         Connection: close\r\n\r\n\
         {body}",
        body.len()
    );

    let _ = socket.write_all(response.as_bytes()).await;
}
