import {
  ArrowUpRight,
  Bot,
  Boxes,
  ChevronRight,
  FolderOpen,
  Image,
  Layers,
  Lightbulb,
  LogOut,
  MessageSquare,
  Plus,
  Settings2,
  Wand2,
} from "lucide-react";
import type { AgentUser, Conversation } from "../services/agent.service";

const navigation = [
  { id: "agent", label: "Trợ lý AI", icon: MessageSquare },
  { id: "jobs", label: "Công việc", icon: Boxes },
  { id: "library", label: "Thư viện", icon: FolderOpen },
  { id: "templates", label: "Templates", icon: Layers },
];
const tools = [
  { id: "mockup-generator", label: "Mockup Generator", icon: Wand2 },
  { id: "background-studio", label: "Mockup Studio", icon: Layers },
  { id: "idea-generator", label: "Idea Generator", icon: Lightbulb },
  { id: "image-editor", label: "Image Editor", icon: Image },
];

export interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  user?: AgentUser;
  conversations?: Conversation[];
  selectedId?: string;
  onConversation?: (id: string) => void;
  onNew?: () => void;
  onLogout?: () => void;
  activeCount?: number;
  busy?: boolean;
}

export function Sidebar({
  currentPage,
  onPageChange,
  user,
  conversations = [],
  selectedId,
  onConversation,
  onNew,
  onLogout,
  activeCount = 0,
  busy = false,
}: SidebarProps) {
  return (
    <aside className="workspace-sidebar">
      <button
        type="button"
        className="workspace-brand"
        onClick={() => onPageChange("agent")}
        aria-label="LCG Agent — trang chính"
      >
        <span className="brand-symbol">
          <Bot aria-hidden="true" />
        </span>
        <span>
          <strong>
            LCG<span className="font-normal"> Agent</span>
          </strong>
          <small>CREATIVE WORKSPACE</small>
        </span>
      </button>
      <button
        type="button"
        className="new-conversation"
        onClick={onNew}
        disabled={busy}
      >
        <Plus size={18} aria-hidden="true" /> Cuộc trò chuyện mới <span>+</span>
      </button>
      <nav aria-label="Điều hướng chính" className="workspace-navigation">
        <p className="nav-caption">KHÔNG GIAN LÀM VIỆC</p>
        {navigation.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onPageChange(id)}
            aria-current={currentPage === id ? "page" : undefined}
            className="workspace-nav-item"
          >
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
            {id === "jobs" && activeCount > 0 && (
              <span className="nav-count">{activeCount}</span>
            )}
          </button>
        ))}
        <div className="nav-divider" />
        <button
          type="button"
          className="workspace-nav-item"
          aria-current={currentPage === "home" ? "page" : undefined}
          onClick={() => onPageChange("home")}
        >
          <Wand2 size={18} aria-hidden="true" />
          <span>Công cụ</span>
          <ArrowUpRight size={14} aria-hidden="true" />
        </button>
        <details
          className="tool-navigation"
          open={tools.some((tool) => tool.id === currentPage) || undefined}
        >
          <summary>
            Công cụ bổ trợ <ChevronRight size={14} aria-hidden="true" />
          </summary>
          {tools.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className="workspace-nav-item"
              onClick={() => onPageChange(id)}
              aria-current={currentPage === id ? "page" : undefined}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </details>
      </nav>
      <div className="recent-conversations">
        <p className="nav-caption">TRÒ CHUYỆN GẦN ĐÂY</p>
        {conversations.length ? (
          <nav aria-label="Lịch sử công việc">
            {conversations.slice(0, 8).map((conversation) => (
              <button
                type="button"
                key={conversation.id}
                className="recent-conversation"
                aria-current={
                  currentPage === "agent" && selectedId === conversation.id
                    ? "page"
                    : undefined
                }
                onClick={() => onConversation?.(conversation.id)}
                disabled={busy}
              >
                <MessageSquare size={14} aria-hidden="true" />
                <span>{conversation.title}</span>
              </button>
            ))}
          </nav>
        ) : (
          <p className="sidebar-empty">
            {user
              ? "Ý tưởng tiếp theo bắt đầu từ một cuộc trò chuyện."
              : "Đăng nhập để lưu ý tưởng và công việc của bạn."}
          </p>
        )}
      </div>
      <div className="sidebar-bottom">
        <button
          type="button"
          className="workspace-nav-item"
          aria-current={currentPage === "settings" ? "page" : undefined}
          onClick={() => onPageChange("settings")}
        >
          <Settings2 size={18} aria-hidden="true" />
          <span>Cấu hình Agent</span>
        </button>
        <div className="workspace-account">
          <span className="account-avatar">
            {user?.email.slice(0, 1).toUpperCase() || "L"}
          </span>
          <div>
            <strong>{user?.email.split("@")[0] || "LCG Media"}</strong>
            <small>
              {user
                ? user.role === "admin"
                  ? "Quản trị viên"
                  : "Không gian cá nhân"
                : "AI cho sản phẩm POD"}
            </small>
          </div>
          {user && (
            <button
              type="button"
              className="icon-button"
              aria-label="Đăng xuất"
              onClick={onLogout}
              disabled={busy}
            >
              <LogOut size={17} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
