import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Soul } from "../types/chat";
import { AppDialog, AppDialogRequest } from "./AppDialog";

type SoulManagerDialogProps = {
  souls: Soul[];
  activeSoul: string | null;
  onActivate: (folder: string) => void;
  onChanged: () => void;
  onDeleted: (folder: string) => void;
  onClose: () => void;
};

export function SoulManagerDialog({
  souls,
  activeSoul,
  onActivate,
  onChanged,
  onDeleted,
  onClose,
}: SoulManagerDialogProps) {
  const [selectedFolder, setSelectedFolder] = useState<string>(
    () => souls.find((s) => s.folder === activeSoul)?.folder ?? souls[0]?.folder ?? "Default"
  );
  const [creating, setCreating] = useState(souls.length === 0);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState<AppDialogRequest | null>(null);

  const selected = souls.find((s) => s.folder === selectedFolder) ?? null;

  useEffect(() => {
    if (selected) {
      setDraftName(selected.name);
      setDraftDescription(selected.description);
      setDraftContent(selected.content);
      setDirty(false);
    }
  }, [selected?.folder]);

  const handleCreate = async () => {
    if (!newName.trim()) {
      setDialog({ kind: "alert", title: "提示", message: "请先填写人格名称。", tone: "danger" });
      return;
    }
    try {
      const soul = await invoke<Soul>("create_soul", {
        name: newName.trim(),
        description: newDescription.trim(),
      });
      setCreating(false);
      setNewName("");
      setNewDescription("");
      onChanged();
      setSelectedFolder(soul.folder);
    } catch (err) {
      setDialog({ kind: "alert", title: "新建失败", message: String(err), tone: "danger" });
    }
  };

  const handleSave = async () => {
    if (!selected || !draftName.trim()) return;
    setSaving(true);
    try {
      await invoke<Soul>("save_soul", {
        folder: selected.folder,
        name: draftName.trim(),
        description: draftDescription.trim(),
        content: draftContent,
      });
      setDirty(false);
      onChanged();
      setDialog({ kind: "alert", title: "提示", message: `人格「${draftName.trim()}」已保存。` });
    } catch (err) {
      setDialog({ kind: "alert", title: "保存失败", message: String(err), tone: "danger" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!selected || selected.isDefault) return;
    const label = selected.name;
    setDialog({
      kind: "confirm",
      title: "危险操作",
      tone: "danger",
      message: `确定要删除人格「${label}」吗？其 Souls/${selected.folder}/ 目录将被移除，不可恢复。`,
      onConfirm: async () => {
        try {
          await invoke("delete_soul", { folder: selected.folder });
          onChanged();
          onDeleted(selected.folder);
          setSelectedFolder("Default");
        } catch (err) {
          setDialog({ kind: "alert", title: "删除失败", message: String(err), tone: "danger" });
        }
      },
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog soul-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">人格管理</span>
          <button type="button" className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="soul-split">
          {/* Left: souls list */}
          <div className="soul-list">
            {souls.map((soul) => (
              <div
                key={soul.folder}
                className={`soul-list-item ${soul.folder === selectedFolder ? "active" : ""}`}
                onClick={() => {
                  setSelectedFolder(soul.folder);
                  setCreating(false);
                }}
              >
                <span className="soul-item-name">{soul.name}</span>
                <span className="soul-item-badges">
                  {soul.folder === activeSoul && <span className="soul-badge active-badge">启用中</span>}
                  {soul.isDefault && <span className="soul-badge">出厂</span>}
                </span>
              </div>
            ))}
            <button
              type="button"
              className={`soul-new-btn ${creating ? "active" : ""}`}
              onClick={() => setCreating(true)}
            >
              + 新建人格
            </button>
          </div>

          {/* Right: editor / create form */}
          <div className="soul-editor">
            {creating ? (
              <>
                <div className="form-item">
                  <label>人格名称</label>
                  <input
                    type="text"
                    className="zcode-input"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="例如：严谨审校员"
                    autoFocus
                  />
                </div>
                <div className="form-item">
                  <label>描述（可空）</label>
                  <input
                    type="text"
                    className="zcode-input"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="这个人格的定位与用途"
                  />
                </div>
                <p className="soul-hint">
                  创建后将在 Souls/&lt;人格&gt;/ 下生成 SOUL.md，可在右侧继续编辑人格内容。
                </p>
                <div className="soul-editor-actions">
                  <button type="button" className="btn-secondary" onClick={() => setCreating(false)}>
                    取消
                  </button>
                  <button type="button" className="btn-primary" disabled={!newName.trim()} onClick={handleCreate}>
                    创建人格
                  </button>
                </div>
              </>
            ) : selected ? (
              <>
                <div className="form-item">
                  <label>人格名称</label>
                  <input
                    type="text"
                    className="zcode-input"
                    value={draftName}
                    onChange={(e) => {
                      setDraftName(e.target.value);
                      setDirty(true);
                    }}
                  />
                </div>
                <div className="form-item">
                  <label>描述（可空）</label>
                  <input
                    type="text"
                    className="zcode-input"
                    value={draftDescription}
                    onChange={(e) => {
                      setDraftDescription(e.target.value);
                      setDirty(true);
                    }}
                  />
                </div>
                <div className="form-item">
                  <div className="directory-header">
                    <label>SOUL.md（Souls/{selected.folder}/）</label>
                    {dirty && <span className="soul-dirty">未保存</span>}
                  </div>
                  <textarea
                    className="soul-textarea"
                    value={draftContent}
                    onChange={(e) => {
                      setDraftContent(e.target.value);
                      setDirty(true);
                    }}
                    spellCheck={false}
                  />
                </div>
                <div className="soul-editor-actions">
                  <button
                    type="button"
                    className="zcode-btn-danger small"
                    onClick={handleDelete}
                    disabled={selected.isDefault}
                    title={selected.isDefault ? "默认人格不可删除" : "删除该人格"}
                  >
                    删除
                  </button>
                  <div style={{ flex: 1 }} />
                  <button
                    type="button"
                    className={`btn-secondary ${selected.folder === activeSoul ? "active" : ""}`}
                    disabled={selected.folder === activeSoul}
                    onClick={() => onActivate(selected.folder)}
                    title="启用后，编排请求将注入该人格的 SOUL.md 内容"
                  >
                    {selected.folder === activeSoul ? "启用中" : "启用"}
                  </button>
                  <button type="button" className="btn-primary" disabled={saving || !dirty} onClick={handleSave}>
                    {saving ? "保存中..." : "保存"}
                  </button>
                </div>
              </>
            ) : (
              <div className="list-empty-item">暂无人格，点击左侧「+ 新建人格」创建。</div>
            )}
          </div>
        </div>
      </div>

      {/* Nested dialogs must not bubble clicks to the outer backdrop */}
      {dialog && (
        <div onClick={(e) => e.stopPropagation()}>
          <AppDialog request={dialog} onClose={() => setDialog(null)} />
        </div>
      )}
    </div>
  );
}
