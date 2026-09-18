# Aria // 智役：咏叹终端

> **Aria (AI Agent Harness Terminal)** 是一个基于 Rust、Tauri 2、React 与 TypeScript 构建的工程级智能体装具与编排终端。优先面向 **Desktop / Windows 桌面端**，为复杂研发、推理与多模型协同任务提供严谨、可预测、高信息密度的 AI 编排能力。

---

## 核心定位

Aria 定位于与 **Codex、ZCode、Antigravity** 同类型的 **AI Agent Harness（智能体装具）** 应用：
- **装具化调度 (Harness & Dispatch)**：每个智能体作为一个标准化算子节点（Agent Node Slot），支持自定义接入点、专属凭据、模型参数与工程约束。
- **确定性 DAG 流水线 (Deterministic DAG Pipeline)**：串行化推进多节点协同执行：
  ```text
  输入指令 -> Node-01 // 探针解析 (Probe) -> Node-02 // 深度拓展 (Synthesis) -> Node-03 // 审校评判 (Critique) -> Node-0X 专项算子
  ```
- **全向并行群测 (Parallel Concurrency)**：支持多智能体同态输入并列响应，用于基准对比与多样性探索。
- **上下文拓扑映射 (Context Topology Mapping)**：异构智能体上下文自动翻译并保真注入，实现跨模型的稳定级联。

---

## 视觉与工程美学：砼核粗野主义 (Concrete Core Brutalism)

Aria 采用冷静、克制、硬核的**粗野主义（Brutalism）**与**砼核（Béton Brut）**美学：
- **胶片颗粒与水泥噪点覆层 (Film Grain & Noise Texture)**：底层融合高精度分形噪点，带来硬核工业冷钢与现浇水泥表面质感。
- **纯直角机械装具排版 (0px Radius / Precision Geometry)**：坚固冷硬的结构分割线、等宽字体（Monospace）遥测标线与工业状态指示灯。
- **桌面级工作台布局 (Desktop-First Ergonomics)**：为高分辨率大屏幕设计的装具插槽列、中央执行遥测流与侧边检查器。

---

## 常用命令

```bash
# 安装前端依赖
bun install # 或 npm install

# 启动桌面端开发调试 (Windows / Desktop)
npm run tauri:dev

# 构建桌面端独立发行包
npm run tauri:build

# 前端单独构建与类型校验
npm run build
```

---

## 架构概览

```text
Aria 桌面工作台 (Desktop Host)
├── 前端层 (React 18 + TypeScript + Vite)
│   ├── 胶片颗粒/水泥噪点滤镜层 (Noise Overlay Shader)
│   ├── 智能体装具插槽 (Agent Harness Slots)
│   ├── 算子执行流与遥测视窗 (Execution Telemetry Stream)
│   └── 终端状态与管线控制器 (Pipeline Controller)
│
└── 宿主层 (Rust + Tauri 2.0)
    ├── 编排引擎 (orchestration.rs): DAG 级联调度与进度事件广播
    ├── 消息拓扑适配器 (messages.rs): 跨智能体上下文重构
    ├── API 通讯总线 (ai_client.rs): OpenAI 兼容协议适配器
    └── 原子状态持久化 (storage.rs): 应用配置与会话存储
```
