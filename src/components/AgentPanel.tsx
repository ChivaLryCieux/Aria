import { AiProfile } from "../types/chat";
import { Field } from "./Field";
import { memo } from "react";

type AgentPanelProps = {
  profiles: AiProfile[];
  activeIds: string[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
  onUpdate: (id: string, patch: Partial<AiProfile>) => void;
};

const AgentPanelComponent = ({ profiles, activeIds, onAdd, onRemove, onToggle, onUpdate }: AgentPanelProps) => {
  return (
    <div className="panel-content">
      <div className="panel-head">
        <div>
          <p className="eyebrow">AGENT HARNESS SLOTS</p>
          <h2>装具算子配置</h2>
        </div>
        <button className="secondary" onClick={onAdd}>
          + 挂载槽位
        </button>
      </div>

      {profiles.map((profile, index) => (
        <section className={`profile-card ${activeIds.includes(profile.id) ? "active-slot" : ""}`} key={profile.id}>
          <div className="profile-card-head">
            <label className="toggle-row">
              <input type="checkbox" checked={activeIds.includes(profile.id)} onChange={() => onToggle(profile.id)} />
              <span>SLOT-{String(index + 1).padStart(2, "0")} // 激活调度</span>
            </label>
            <button className="danger" onClick={() => onRemove(profile.id)}>
              卸载
            </button>
          </div>

          <Field label="算子代号 (OPERATOR_NAME)" value={profile.name} onChange={(name) => onUpdate(profile.id, { name })} />
          <Field label="标识标识符 (AVATAR / EMBLEM)" value={profile.avatar} onChange={(avatar) => onUpdate(profile.id, { avatar })} />

          <label className="field">
            <span>上传头像图片</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => onUpdate(profile.id, { avatar: String(reader.result) });
                reader.readAsDataURL(file);
              }}
            />
          </label>

          <Field
            label="API 端点 (BASE_URL / ENDPOINT)"
            value={profile.endpoint}
            onChange={(endpoint) => onUpdate(profile.id, { endpoint })}
          />
          <Field label="访问凭据密钥 (API_KEY)" type="password" value={profile.apiKey} onChange={(apiKey) => onUpdate(profile.id, { apiKey })} />
          <Field label="目标模型架构 (MODEL_ID)" value={profile.model} onChange={(model) => onUpdate(profile.id, { model })} />

          <label className="field">
            <span>节点固化指令集 (SYSTEM_PROMPT)</span>
            <textarea
              value={profile.systemPrompt}
              onChange={(event) => onUpdate(profile.id, { systemPrompt: event.target.value })}
              rows={4}
            />
          </label>

          <label className="field">
            <span>采样温度 (TEMPERATURE: {profile.temperature.toFixed(1)})</span>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={profile.temperature}
              onChange={(event) => onUpdate(profile.id, { temperature: Number(event.target.value) })}
            />
          </label>
        </section>
      ))}
    </div>
  );
};

export default memo(AgentPanelComponent, (prevProps, nextProps) => {
  // Prevent unnecessary re-renders if profiles and activeIds haven't changed meaningfully
  if (prevProps.profiles.length !== nextProps.profiles.length) return false;
  
  // Check if any profile has changed
  for (let i = 0; i < prevProps.profiles.length; i++) {
    if (prevProps.profiles[i] !== nextProps.profiles[i]) {
      // Deep check for profile changes
      const prevProfile = prevProps.profiles[i];
      const nextProfile = nextProps.profiles[i];
      if (
        prevProfile.id !== nextProfile.id ||
        prevProfile.name !== nextProfile.name ||
        prevProfile.avatar !== nextProfile.avatar ||
        prevProfile.endpoint !== nextProfile.endpoint ||
        prevProfile.apiKey !== nextProfile.apiKey ||
        prevProfile.model !== nextProfile.model ||
        prevProfile.systemPrompt !== nextProfile.systemPrompt ||
        prevProfile.temperature !== nextProfile.temperature
      ) {
        return false;
      }
    }
  }
  
  // Check activeIds
  if (prevProps.activeIds.length !== nextProps.activeIds.length) return false;
  for (let i = 0; i < prevProps.activeIds.length; i++) {
    if (prevProps.activeIds[i] !== nextProps.activeIds[i]) return false;
  }
  
  return true;
});
