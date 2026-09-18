export type TaskSummary = {
  id: string;
  title: string;
  timestamp?: number;
};

type SidebarProps = {
  userName: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onNewTask: () => void;
  onOpenSettings: () => void;
  tasks?: TaskSummary[];
  activeTaskId?: string;
  onSelectTask?: (id: string) => void;
  onDeleteTask?: (id: string) => void;
  workspaceName?: string;
  onOpenWorkspace?: () => void;
};

export function Sidebar({
  userName = "Tempsyche",
  isCollapsed,
  onToggleCollapse,
  onNewTask,
  onOpenSettings,
  tasks = [],
  activeTaskId,
  onSelectTask,
  onDeleteTask,
  workspaceName,
  onOpenWorkspace,
}: SidebarProps) {
  const avatarInitial = (userName || "T").trim().charAt(0).toUpperCase();

  return (
    <aside className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      {/* Top Action: Only New Task & Project List */}
      <div className="sidebar-top-actions">
        {/* 新建任务 */}
        <button
          type="button"
          className="action-row"
          onClick={onNewTask}
          title="新建任务 (Ctrl+N)"
        >
          <div className="action-left">
            <span className="action-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="4" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </span>
            <span>新建任务</span>
          </div>
          <span className="shortcut-badge">Ctrl+N</span>
        </button>

        {/* 项目列表 */}
        <button
          type="button"
          className="action-row active"
          onClick={onOpenWorkspace}
          title="项目列表"
        >
          <div className="action-left">
            <span className="action-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </span>
            <span>项目列表</span>
          </div>
        </button>
      </div>

      {/* Project & Task Section List */}
      <div className="sidebar-list-content">
        {/* Active Project */}
        <div className="list-section-header">项目</div>
        {workspaceName ? (
          <div className="task-item active" onClick={onOpenWorkspace} title={workspaceName}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span>{workspaceName}</span>
            </span>
          </div>
        ) : (
          <div
            className="list-empty-item"
            style={{ cursor: onOpenWorkspace ? "pointer" : "default" }}
            onClick={onOpenWorkspace}
          >
            尚未打开项目
          </div>
        )}

        {/* Task List */}
        <div className="list-section-header">任务</div>
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`task-item ${activeTaskId === task.id ? "active" : ""}`}
              onClick={() => onSelectTask?.(task.id)}
            >
              <span className="truncate" style={{ maxWidth: "180px" }}>
                {task.title || "新任务"}
              </span>
              {onDeleteTask && (
                <button
                  type="button"
                  className="icon-btn"
                  style={{ width: "18px", height: "18px", opacity: 0.6 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTask(task.id);
                  }}
                  title="删除任务"
                >
                  ✕
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="list-empty-item">还没有任务</div>
        )}
      </div>

      {/* Footer: User Profile, Avatar, Dock Toggle, Settings */}
      <div className="sidebar-footer">
        <div className="user-profile-info" onClick={onOpenSettings} title="个人信息与账户">
          <div className="user-avatar-circle">{avatarInitial}</div>
          <span className="user-name-text">{userName || "Tempsyche"}</span>
        </div>

        <div className="footer-actions">
          <button
            type="button"
            className="footer-action-btn"
            onClick={onToggleCollapse}
            title={isCollapsed ? "展开侧边栏" : "折叠侧边栏"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>

          <button
            type="button"
            className="footer-action-btn"
            onClick={onOpenSettings}
            title="设置"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
