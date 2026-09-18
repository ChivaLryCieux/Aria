import { AppSettings } from "../types/chat";
import { Field } from "./Field";

type SettingsPanelProps = {
  settings: AppSettings;
  onClear: () => void;
  onChangeUserName: (value: string) => void;
  onChangeOrchestrationMode: (value: AppSettings["orchestrationMode"]) => void;
};

export function SettingsPanel({ settings, onClear, onChangeUserName, onChangeOrchestrationMode }: SettingsPanelProps) {
  return (
    <div className="panel-content">
      <div className="panel-head">
        <div>
          <p className="eyebrow">SYSTEM CONFIG</p>
          <h2>终端参数配置</h2>
        </div>
      </div>

      <section className="profile-card">
        <Field label="操作员识别名 (OPERATOR_ID)" value={settings.userName} onChange={onChangeUserName} />

        <label className="field">
          <span>默认调度协议 (DISPATCH_PROTOCOL)</span>
          <select
            value={settings.orchestrationMode}
            onChange={(event) => onChangeOrchestrationMode(event.target.value as AppSettings["orchestrationMode"])}
          >
            <option value="dag">确定性 DAG 流水线 (Deterministic DAG)</option>
            <option value="parallel">全向并行群测 (Parallel Concurrency)</option>
          </select>
        </label>

        <button className="danger full" onClick={onClear}>
          PURGE LOGS // 清空本机运行时执行记录
        </button>
        <p className="hint">
          // HARNESS_TELEMETRY: 所有凭据与节点参数均原子持久化于操作系统受保护的应用配置目录。DAG 编排按槽位依赖自动级联上下文并执行前向拓扑注入。
        </p>
      </section>
    </div>
  );
}
