import {
  ArrowUpRight,
  Bot,
  Boxes,
  ChevronRight,
  CircleHelp,
  FolderOpen,
  Image,
  Layers,
  Lightbulb,
  LogOut,
  MessageSquare,
  Plus,
  RefreshCw,
  ShieldCheck,
  Wand2,
  Workflow,
} from "lucide-react";
import type { AgentUser, Conversation } from "../services/agent.service";
import { HistoryLoader } from "./agent/HistoryLoader";

const navigation = [
  { id: "agent", label: "Trợ lý AI", icon: MessageSquare },
  { id: "jobs", label: "Công việc", icon: Boxes },
  { id: "library", label: "Thư viện", icon: FolderOpen },
  { id: "templates", label: "Templates", icon: Layers },
  { id: "workflows", label: "Workflows", icon: Workflow },
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
  historyHasMore?: boolean;
  historyLoading?: boolean;
  historyRefreshing?: boolean;
  historyError?: string;
  onRefreshHistory?: () => void;
  onMoreHistory?: () => void;
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
  historyHasMore,
  historyLoading = false,
  historyRefreshing = false,
  historyError,
  onRefreshHistory,
  onMoreHistory,
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
        title="Bắt đầu hội thoại mới"
        onClick={onNew}
        disabled={busy}
      >
        <Plus size={18} aria-hidden="true" /> Trò chuyện mới
      </button>
      <nav aria-label="Điều hướng chính" className="workspace-navigation">
        <p className="nav-caption">KHÔNG GIAN LÀM VIỆC</p>
        {navigation.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onPageChange(id)}
            title={
              id === "agent" && selectedId
                ? "Quay lại hội thoại đang mở"
                : label
            }
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
      <section className="recent-conversations" aria-label="Trò chuyện gần đây">
        <div className="recent-conversations-heading">
          <h2 className="nav-caption">TRÒ CHUYỆN GẦN ĐÂY</h2>
          {onRefreshHistory && (
            <button
              type="button"
              className="icon-button history-refresh"
              aria-label="Làm mới hội thoại"
              title="Làm mới hội thoại"
              onClick={onRefreshHistory}
              disabled={historyRefreshing}
            >
              <RefreshCw
                size={15}
                aria-hidden="true"
                className={
                  historyRefreshing ? "studio-loading-spinner" : undefined
                }
              />
            </button>
          )}
        </div>
        {historyError && (
          <p className="sidebar-empty" role="alert">
            Không tải được lịch sử. {historyError} Bấm làm mới để thử lại.
          </p>
        )}
        {!conversations.length && historyRefreshing && (
          <p className="sidebar-empty" role="status">
            Đang tải hội thoại…
          </p>
        )}
        {conversations.length ? (
          <nav aria-label="Lịch sử công việc" data-history-scroll>
            {conversations.map((conversation) => (
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
            {historyHasMore && onMoreHistory && (
              <HistoryLoader
                loading={historyLoading}
                onLoad={onMoreHistory}
                label="Tải thêm hội thoại"
              />
            )}
          </nav>
        ) : !historyRefreshing && !historyError ? (
          <p className="sidebar-empty">
            {user
              ? "Chưa có hội thoại đã lưu. Gửi yêu cầu cho Trợ lý AI để bắt đầu; tác vụ từ các công cụ nằm trong Công việc."
              : "Đăng nhập để lưu ý tưởng và công việc của bạn."}
          </p>
        ) : null}
      </section>
      <div className="sidebar-bottom">
        <button
          type="button"
          className="workspace-nav-item"
          aria-current={currentPage === "guide" ? "page" : undefined}
          onClick={() => onPageChange("guide")}
        >
          <CircleHelp size={18} aria-hidden="true" />
          <span>Hướng dẫn sử dụng?</span>
        </button>
        {user?.role === "admin" && (
          <button
            type="button"
            className="workspace-nav-item"
            aria-current={currentPage.startsWith("admin") ? "page" : undefined}
            onClick={() => onPageChange("admin")}
          >
            <ShieldCheck size={18} aria-hidden="true" />
            <span>Quản trị công ty</span>
          </button>
        )}
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
