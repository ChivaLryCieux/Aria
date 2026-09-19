use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::Arc;
use tokio::sync::Mutex;

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
            message: Some("Kernel bridge not started yet".to_string()),
        }
    }
}

pub struct DshDaemon {
    pub connection: HarnessConnection,
    child: Option<Child>,
}

/// Filesystem layout of the Atrium workspace relative to the compiled binary.
struct BridgePaths {
    script: String,
    dsh_root: String,
    patch: Option<String>,
}

fn bridge_paths() -> BridgePaths {
    // Compile-time workspace layout (dev builds); overridable for packaged runs.
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_default();

    let script = std::env::var("ATRIUM_BRIDGE_SCRIPT")
        .unwrap_or_else(|_| root.join("packages/aria-desktop-host/src/index.js").to_string_lossy().to_string());
    let dsh_root = std::env::var("ATRIUM_DSH_ROOT")
        .unwrap_or_else(|_| root.join("deepseek-harness").to_string_lossy().to_string());
    let patch_default = root.join("packages/aria-core/profiles/aria-desktop/atrium-sdk.cordis.patch.yml");
    let patch = std::env::var("ATRIUM_KERNEL_PATCH")
        .ok()
        .or_else(|| patch_default.exists().then(|| patch_default.to_string_lossy().to_string()));

    BridgePaths { script, dsh_root, patch }
}

impl DshDaemon {
    pub fn new() -> Self {
        Self {
            connection: HarnessConnection::default(),
            child: None,
        }
    }

    /// Spawn the `@aria/desktop-host` kernel bridge and wait until it answers
    /// `/healthz`. The bridge owns the real dsh runtime; it spawns lazily on
    /// the first turn, so startup here is fast even before the kernel boots.
    pub async fn start(&mut self, http: &reqwest::Client, app: &tauri::AppHandle) -> Result<HarnessConnection, String> {
        if self.connection.status == "ready" && self.child.is_some() {
            return Ok(self.connection.clone());
        }

        let port: u16 = std::env::var("ATRIUM_BRIDGE_PORT")
            .ok()
            .and_then(|p| p.parse().ok())
            .unwrap_or(19387);

        // An already-running bridge (hot reload, previous run) is good enough.
        if Self::probe_health(http, port).await {
            let conn = HarnessConnection {
                status: "ready".to_string(),
                url: format!("http://127.0.0.1:{port}"),
                port,
                token: Some("atrium-session-token".to_string()),
                pid: None,
                message: Some("Existing kernel bridge detected on port".to_string()),
            };
            self.connection = conn.clone();
            return Ok(conn);
        }

        let paths = bridge_paths();
        if !std::path::Path::new(&paths.script).exists() {
            let msg = format!("kernel bridge script missing: {}", paths.script);
            self.connection.message = Some(msg.clone());
            return Err(msg);
        }

        let workspace = tauri::Manager::path(app)
            .app_config_dir()
            .map(|d| d.to_string_lossy().to_string())
            .ok();

        let mut command = Command::new("node");
        command
            .arg(&paths.script)
            .arg("--port").arg(port.to_string())
            .arg("--host").arg("127.0.0.1")
            .arg("--dsh-root").arg(&paths.dsh_root)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        if let Some(patch) = &paths.patch {
            command.arg("--patch").arg(patch);
        }
        if let Some(workspace) = &workspace {
            command.arg("--workspace").arg(workspace);
        }

        #[cfg(target_os = "windows")]
        {
            const CREATE_NO_WINDOW: u32 = 0x0800_0000;
            use std::os::windows::process::CommandExt;
            command.creation_flags(CREATE_NO_WINDOW);
        }

        let mut child = command.spawn().map_err(|e| format!("无法启动内核桥接进程 (node): {e}"))?;
        let pid = child.id();

        if let Some(stdout) = child.stdout.take() {
            std::thread::spawn(move || log_stream("bridge:stdout", stdout));
        }
        if let Some(stderr) = child.stderr.take() {
            std::thread::spawn(move || log_stream("bridge:stderr", stderr));
        }

        let healthy = Self::wait_for_health(http, port, 20).await;
        let message = if healthy {
            "Kernel bridge ready (DeepSeek Harness runtime attached)".to_string()
        } else {
            "Kernel bridge spawned but /healthz not answering yet".to_string()
        };

        let conn = HarnessConnection {
            status: if healthy { "ready".to_string() } else { "starting".to_string() },
            url: format!("http://127.0.0.1:{port}"),
            port,
            token: Some("atrium-session-token".to_string()),
            pid: Some(pid),
            message: Some(message.clone()),
        };
        self.connection = conn.clone();
        self.child = Some(child);
        Ok(conn)
    }

    pub async fn stop(&mut self) -> Result<(), String> {
        if let Some(mut child) = self.child.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
        self.connection.status = "stopped".to_string();
        self.connection.pid = None;
        self.connection.message = Some("Kernel bridge stopped".to_string());
        Ok(())
    }

    /// Whether agent turns should attempt the kernel route. Covers both a
    /// bridge we spawned and one that was already listening on the port.
    pub fn kernel_available(&self) -> bool {
        self.connection.status == "ready"
    }

    async fn probe_health(http: &reqwest::Client, port: u16) -> bool {
        let url = format!("http://127.0.0.1:{port}/healthz");
        matches!(
            tokio::time::timeout(std::time::Duration::from_millis(1200), http.get(&url).send()).await,
            Ok(Ok(resp)) if resp.status().is_success()
        )
    }

    async fn wait_for_health(http: &reqwest::Client, port: u16, seconds: u64) -> bool {
        let deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(seconds);
        while tokio::time::Instant::now() < deadline {
            if Self::probe_health(http, port).await {
                return true;
            }
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        }
        false
    }
}

fn log_stream(tag: &str, stream: impl std::io::Read + Send + 'static) {
    let reader = BufReader::new(stream);
    for line in reader.lines().map_while(Result::ok) {
        eprintln!("[{tag}] {line}");
    }
}

/// Shared handle used by Tauri commands.
pub type SharedDaemon = Arc<Mutex<DshDaemon>>;

impl Drop for DshDaemon {
    fn drop(&mut self) {
        if let Some(mut child) = self.child.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}
