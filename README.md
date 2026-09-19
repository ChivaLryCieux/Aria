# Atrium // 智役中庭

> **Atrium (AI Agent Harness Terminal)** 是一个基于 DeepSeek Harness (`dsh`) 内核、Cordis 微内核架构、Rust Tauri 2 与 React 18 构建的工程级智能体装具与编排终端。优先面向 **Desktop / Windows 桌面端**，为复杂研发、推理与多模型协同任务提供严谨、可预测、高信息密度的 AI 编排能力。

---

## 核心定位

Atrium 定位于与 **Codex、ZCode、Antigravity** 同类型的 **AI Agent Harness（智能体装具）** 应用：
- **真实内核驱动 (Real Kernel Runtime)**：桌面壳通过官方 `@deepseek-ai/dsh-sdk-client` 以 stdio JSON-RPC 拉起 vendored `deepseek-harness` 的 `dsh --profile sdk` 运行时，会话、工具与模型调度全部由 dsh 内核执行，Atrium 不再绕过内核直连 API。
- **装具化调度 (Harness & Dispatch)**：每个智能体作为一个标准化算子槽位（Slot），支持专属凭据、模型参数与工程约束；多轮上下文由内核会话（Session）持有。
- **确定性 DAG 流水线 (Deterministic DAG Pipeline)**：多节点协同流水线（探针 Probe -> 拓展 Synthesis -> 审校 Critique）逐节点推进内核会话，节点输出以流式增量实时渲染。
- **全向并行群测 (Parallel Concurrency)**：多智能体同态输入并列响应，用于基准对比与多样性探索。
- **直连兜底 (Direct Fallback)**：内核不可用（未构建/无 Node）时自动回退 OpenAI 兼容直连通道，产品保持可用。
- **Cordis 微内核扩展 (Zero-Pollution Microkernel)**：通过外置的 `@aria/dsh-plugin-desktop` 与 Cordis Profile (`aria-desktop`) 实现无侵入热插拔定制，上游 `deepseek-harness` 仓库保持 0 代码污染。

---

## 视觉与工程美学：砼核粗野主义 (Concrete Core Brutalism)

Atrium 采用冷静、克制、硬核的**粗野主义（Brutalism）**与**砼核（Béton Brut）**美学：
- **胶片颗粒与水泥噪点覆层 (Film Grain & Noise Texture)**：SVG `feTurbulence` 分形噪点遮罩，模拟工业冷钢与现浇水泥表面质感。
- **纯直角机械装具排版 (0px Radius / Precision Geometry)**：坚固冷硬的结构分割线、等宽字体（Monospace）遥测标线与工业状态指示灯。
- **桌面级工作台布局 (Desktop-First Ergonomics)**：为 Windows 桌面设计的多窗格装具插槽、中央执行遥测流与内核装具检查器（Harness Inspector）。

---

## 架构概览

```text
Atrium 桌面工作台 (Desktop Host)
├── 表现层 (React 18 + TypeScript + Vite)
│   ├── 胶片颗粒滤镜层 (Film Grain Overlay)
│   ├── 算子槽位管理器 (Agent Harness Slots)
│   ├── 执行遥测流 (Brutalist Execution Stream)
│   ├── 装具内核遥测 (Harness Inspector)
│   └── DSH WebSocket 流式客户端 (dshClient.ts)
│
├── 宿主层 (Rust + Tauri 2.0)
│   ├── 内核桥接进程托管 (daemon.rs: spawn/探活/退出回收)
│   ├── 确定性编排拓扑服务 (orchestration.rs: 内核路由 + 直连兜底)
│   ├── 原生系统遥测与 Explorer 集成 (commands.rs)
│   └── 本地配置与状态持久化 (storage.rs)
│
└── 内核层 (DeepSeek Harness / Cordis Microkernel)
    ├── 内核桥 (@aria/desktop-host: SDK stdio 运行时 + HTTP/WS 桥面)
    ├── 核心运行时 (deepseek-harness upstream) - [ZERO POLLUTION]
    ├── SDK 协议 (@deepseek-ai/dsh-sdk-client: initialize/session/prompt)
    └── Cordis Profile (@aria/profile-desktop + cordis.patch.yml)
```

### 内核数据流

```text
React UI ──Tauri IPC──> Rust 编排 ──POST /v1/turn──> @aria/desktop-host
                                                          │ DeepSeekHarness.run()
                                                          ▼
                                        dsh --profile sdk (stdio JSON-RPC 子进程)
                                                          │ session.event
React UI <──WS /events── 桥接广播 assistant-stream 增量 ◄──┘
```

---

## 常用命令

```powershell
# 安装 monorepo 依赖
pnpm install

# 检查与同步上游 deepseek-harness 引擎 (保持零污染)
pnpm run sync:upstream
pnpm run sync:upstream -- --fetch

# 构建内核（安装并编译 vendored deepseek-harness，桥接层运行的前提）
pnpm run prepare:kernel

# 启动桌面端开发调试 (Windows Desktop)
pnpm run tauri:dev

# 构建桌面端独立发行包 (.msi / .exe)
pnpm run bundle:runtime
pnpm run tauri:build

# 前端单独构建与类型校验
pnpm run build
```

---

## 上游无污染同步机制 (Zero-Pollution Sync Policy)

1. **绝对隔离**：`deepseek-harness/` 保持为官方纯净克隆，不在该目录内修改任何业务代码。
2. **Profile 叠加**：内核定制通过有序 `--patch` 覆写文件（`packages/aria-core/profiles/aria-desktop/atrium-sdk.cordis.patch.yml`）声明式注入 SDK 运行时。
3. **进程边界**：Atrium 与内核之间的全部交互收敛在官方 SDK 协议（initialize / session/prompt / session.event），桌面侧不做任何内核内改造。
4. **一键同步**：运行 `pnpm run sync:upstream` 自动校验目录干净度、检测上游新 Tag 并验证 Cordis Profile 兼容性；`pnpm run prepare:kernel` 负责内核安装与构建。
