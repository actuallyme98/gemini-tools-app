import { useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  BookOpen,
  CheckCheck,
  ChevronRight,
  FolderHeart,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Menu,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import type { AgentUser } from "../../services/agent.service";
import { studioNavigate } from "../../services/studio.service";
import { WeeklyBudget } from "../agent/UsageBudget";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "../ui/sheet";

const navigation = [
  { id: "studio", label: "Tổng quan", icon: LayoutDashboard },
  { id: "studio-ideas", label: "Ý tưởng", icon: Lightbulb },
  { id: "studio-mockups", label: "Tạo mockup", icon: Sparkles },
  { id: "studio-outputs", label: "Thành phẩm", icon: FolderHeart },
];
export function StudioShell({
  user,
  page,
  onLogout,
  children,
}: {
  user: AgentUser;
  page: string;
  onLogout: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const go = (next: string) => {
    studioNavigate(next);
    setOpen(false);
  };
  const sidebar = (
    <>
      <a className="studio-brand" href="#studio">
        <span>
          <Sparkles aria-hidden="true" size={23} />
        </span>
        <div>
          <strong>LCG</strong>
          <small>CREATIVE STUDIO</small>
        </div>
      </a>
      <p className="studio-nav-label">KHÔNG GIAN SÁNG TẠO</p>
      <nav aria-label="Điều hướng Studio">
        {navigation.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            aria-current={
              page === id || (id === "studio-ideas" && page === "studio-new")
                ? "page"
                : undefined
            }
            onClick={() => go(id)}
          >
            <Icon size={19} aria-hidden="true" />
            {label}
            <ChevronRight
              className="studio-nav-chevron"
              size={15}
              aria-hidden="true"
            />
          </button>
        ))}
        {user.role === "admin" && (
          <button
            aria-current={page === "studio-manage" ? "page" : undefined}
            onClick={() => go("studio-manage")}
          >
            <Settings2 size={19} aria-hidden="true" />
            Quản lý
          </button>
        )}
      </nav>
      <div className="studio-sidebar-tip">
        <CheckCheck size={19} aria-hidden="true" />
        <strong>Bạn chuẩn bị. Agent thực hiện.</strong>
        <p>Chốt ý tưởng cùng Leader. Xem và duyệt ảnh khi có kết quả.</p>
      </div>
      <div className="studio-nav-bottom">
        <button onClick={() => go("studio-guide")}>
          <BookOpen size={18} aria-hidden="true" />
          Hướng dẫn sử dụng
        </button>
        <a href="#agent">
          Lịch sử & trợ lý cũ <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      </div>
      <div className="studio-profile">
        <span>{user.email.slice(0, 1).toUpperCase()}</span>
        <div>
          <strong>
            {user.role === "admin" ? "Quản trị viên" : "Thành viên"}
          </strong>
          <small>{user.email}</small>
        </div>
        <button aria-label="Đăng xuất" onClick={onLogout}>
          <LogOut size={17} aria-hidden="true" />
        </button>
      </div>
    </>
  );
  return (
    <div className="studio-application">
      <a
        className="skip-link"
        href="#studio-main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("studio-main")?.focus();
        }}
      >
        Đến nội dung chính
      </a>
      <aside className="studio-sidebar">{sidebar}</aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="studio-mobile-nav">
          <SheetTitle className="sr-only">Điều hướng Studio</SheetTitle>
          <SheetDescription className="sr-only">
            Ý tưởng, mockup và thành phẩm của bạn.
          </SheetDescription>
          {sidebar}
          <button
            className="studio-mobile-close"
            aria-label="Đóng menu"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </SheetContent>
      </Sheet>
      <div className="studio-main-layout">
        <header className="studio-topbar">
          <button
            className="studio-mobile-menu"
            aria-label="Mở menu"
            onClick={() => setOpen(true)}
          >
            <Menu size={22} />
          </button>
          <span>
            Không gian làm việc <ChevronRight size={14} aria-hidden="true" />{" "}
            <strong>
              {navigation.find((item) => item.id === page)?.label ??
                (page === "studio-new"
                  ? "Tạo ý tưởng"
                  : page === "studio-manage"
                    ? "Quản lý"
                    : "Hướng dẫn")}
            </strong>
          </span>
          <WeeklyBudget userId={user.id} activeCount={0} />
        </header>
        <main id="studio-main" tabIndex={-1} className="studio-main">
          {children}
        </main>
      </div>
    </div>
  );
}
