import { useState } from "react";

type AboutTab = "about" | "charter";

type AboutDialogProps = {
  onClose: () => void;
};

export function AboutDialog({ onClose }: AboutDialogProps) {
  const [tab, setTab] = useState<AboutTab>("about");

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">
            {tab === "about" ? "关于 Atrium" : "智役宪章"}
          </span>
          <button type="button" className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Tab switch: 关于 Atrium / 智役宪章 */}
        <div className="about-tabs">
          <button
            type="button"
            className={`about-tab ${tab === "about" ? "active" : ""}`}
            onClick={() => setTab("about")}
          >
            关于 ATRIUM
          </button>
          <button
            type="button"
            className={`about-tab ${tab === "charter" ? "active" : ""}`}
            onClick={() => setTab("charter")}
          >
            智役宪章
          </button>
        </div>

        <div className="modal-body">
          {tab === "about" ? (
            <>
              <div className="about-meta">
                <span>ATRIUM // 智役中庭 — AI Agent Harness Terminal</span>
                <span>版本 v0.2.0</span>
                <span>内核: DeepSeek Harness (dsh) · Tauri 2 · React 18</span>
              </div>
              <div className="about-placeholder">
                【产品简介占位】在此填入 Atrium 的一句话定位与产品简介：它是什么、
                为谁而造、解决什么问题。
              </div>
              <div className="about-placeholder">
                【设计理念占位】在此填入砼核粗野主义视觉与装具化调度背后的设计哲学。
              </div>
              <div className="about-placeholder">
                【署名与版权占位】在此填入作者、团队、许可证与致谢信息。
              </div>
            </>
          ) : (
            <>
              <div className="about-placeholder charter">
                【智役宪章 · 序言占位】在此填入宪章的立意：智役与操作员的关系、
                这部宪章为何而立。
              </div>
              <div className="about-placeholder charter">
                第一章 【章名占位】
                {"\n"}第一条 【条款占位】
                {"\n"}第二条 【条款占位】
              </div>
              <div className="about-placeholder charter">
                第二章 【章名占位】
                {"\n"}第三条 【条款占位】
                {"\n"}第四条 【条款占位】
              </div>
              <div className="about-placeholder charter">
                附则 【占位】宪章的修订方式与生效条件。
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-primary" onClick={onClose}>
            知道了
          </button>
        </div>
      </div>
    </div>
  );
}
