# Atrium // 智役中庭

> **Atrium (AI Agent Harness Terminal)** 是一个基于 DeepSeek Harness (`dsh`) 内核、Cordis 微内核架构、Rust Tauri 2 与 React 18 构建的工程级智能体装具与编排终端。优先面向 **Desktop / Windows 桌面端**，为复杂研发、推理与多模型协同任务提供严谨、可预测、高信息密度的 AI 编排能力。

---

## 核心定位

Atrium 定位于与 **Codex、ZCode、Antigravity** 同类型的 **AI Agent Harness（智能体装具）** 应用：
- **装具化调度 (Harness & Dispatch)**：基于 `deepseek-harness` 驱动，每个智能体作为一个标准化算子槽位（Slot），支持专属凭据、模型参数与工程约束。
- **确定性 DAG 流水线 (Deterministic DAG Pipeline)**：将多节点协同流水线（探针 Probe -> 拓展 Synthesis -> 审校 Critique）深度接入内核级调度。
- **全向并行群测 (Parallel Concurrency)**：支持多智能体同态输入并列响应，用于基准对比与多样性探索。
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
│   └── DSH WebSocket RPC 客户端 (dshClient.ts)
│
├── 宿主层 (Rust + Tauri 2.0)
│   ├── DSH Daemon 守护进程生命周期 (daemon.rs)
│   ├── 原生系统遥测与 Explorer 集成 (commands.rs)
│   ├── 确定性编排拓扑服务 (orchestration.rs)
│   └── 本地配置与状态持久化 (storage.rs)
│
└── 内核层 (DeepSeek Harness / Cordis Microkernel)
    ├── 核心运行时 (deepseek-harness upstream) - [ZERO POLLUTION]
    ├── Cordis Profile (@aria/profile-desktop + cordis.patch.yml)
    ├── 桌面插件 (@aria/dsh-plugin-desktop: 遥测广播 + 桌面专属工具)
    └── DAG 流水线注入中间件 (AriaOrchestrationService)
```

---

## 常用命令

```powershell
# 安装 monorepo 依赖
pnpm install

# 检查与同步上游 deepseek-harness 引擎 (保持零污染)
pnpm run sync:upstream
pnpm run sync:upstream -- --fetch

# 准备桌面打包依赖
pnpm run bundle:runtime

# 启动桌面端开发调试 (Windows Desktop)
pnpm run tauri:dev

# 构建桌面端独立发行包 (.msi / .exe)
pnpm run tauri:build

# 前端单独构建与类型校验
pnpm run build
```

---

## 上游无污染同步机制 (Zero-Pollution Sync Policy)

1. **绝对隔离**：`deepseek-harness/` 保持为官方纯净克隆，不在该目录内修改任何业务代码。
2. **Profile 叠加**：所有定制项通过 `packages/aria-core/profiles/aria-desktop/` 的 `cordis.patch.yml` 进行声明式覆写。
3. **插件扩展**：所有桌面桥接工具与遥测钩子由 `packages/aria-dsh-plugin/` 承载，热插拔挂载入 Cordis 微内核上下文。
4. **一键同步**：运行 `pnpm run sync:upstream` 自动校验目录干净度、检测上游新 Tag 并验证 Cordis Profile 兼容性。
