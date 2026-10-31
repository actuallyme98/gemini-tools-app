import { Link } from "react-router";
import { useStudioNavigate, studioPath } from "../../navigation";
import { useState, type ReactNode } from "react";
import {
  BookOpen,
  ChevronRight,
  FolderHeart,
  Images,
  LayoutDashboard,
  Layers3,
  Lightbulb,
  LogOut,
  Menu,
  Settings2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { AgentUser } from "../../services/agent.service";
import { WeeklyBudget } from "../agent/UsageBudget";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "../ui/sheet";

const navigation = [
  {
    id: "studio",
    label: "Tổng quan",
    icon: LayoutDashboard,
    group: "KHÔNG GIAN LÀM VIỆC",
  },
  {
    id: "studio-ideas",
    label: "Idea Board",
    icon: Lightbulb,
    group: "SẢN XUẤT",
  },
  {
    id: "studio-gallery",
    label: "Design Gallery",
    icon: Images,
    group: "SẢN XUẤT",
  },
  {
    id: "studio-mockups",
    label: "Mockup Studio",
    icon: Sparkles,
    group: "SẢN XUẤT",
  },
  {
    id: "studio-outputs",
    label: "Thành phẩm",
    icon: FolderHeart,
    group: "SẢN XUẤT",
  },
];
export function StudioShell({
  user,
  page,
  onLogout,
  children,
  workbench = false,
}: {
  user: AgentUser;
  page: string;
  onLogout: () => void;
  children: ReactNode;
  workbench?: boolean;
}) {
  const studioNavigate = useStudioNavigate();
  const [open, setOpen] = useState(false);
  const go = (next: string) => {
    studioNavigate(next);
    setOpen(false);
  };
  const admin = page.startsWith("admin");
  const title = admin
    ? "Quản trị công ty"
    : page === "studio-new"
      ? "Tạo ý tưởng"
      : page === "studio-manage"
        ? "Quản lý thư viện & nhóm"
        : page === "studio-guide"
          ? "Hướng dẫn sử dụng"
          : navigation.find((n) => n.id === page)?.label;
  const sidebar = (
    <>
      <Link
        className="studio-brand"
        to={studioPath("studio")}
        aria-label="LCG Creative Studio — Tổng quan"
      >
        <span>
          <Layers3 size={23} aria-hidden="true" />
        </span>
        <div>
          <strong>
            LCG Studio<span>AI</span>
          </strong>
          <small>Không gian sáng tạo</small>
        </div>
      </Link>
      <button className="studio-create-button" onClick={() => go("studio-new")}>
        <Lightbulb size={17} aria-hidden="true" />
        Tạo ý tưởng mới<span>＋</span>
      </button>
      <nav aria-label="Điều hướng Studio">
        {navigation.map(({ id, label, icon: Icon, group }, index) => (
          <div key={id}>
            {(index === 0 || navigation[index - 1].group !== group) && (
              <p className="studio-nav-label">{group}</p>
            )}
            <button
              aria-current={
                page === id || (id === "studio-ideas" && page === "studio-new")
                  ? "page"
                  : undefined
              }
              onClick={() => go(id)}
            >
              <Icon size={18} aria-hidden="true" />
              {label}
              <ChevronRight
                className="studio-nav-chevron"
                size={14}
                aria-hidden="true"
              />
            </button>
          </div>
        ))}
        {user.role === "admin" && (
          <div>
            <p className="studio-nav-label">QUẢN LÝ</p>
            <button
              aria-current={page === "studio-manage" ? "page" : undefined}
              onClick={() => go("studio-manage")}
            >
              <Settings2 size={18} aria-hidden="true" />
              Thư viện & nhóm
            </button>
            <button
              aria-current={admin ? "page" : undefined}
              onClick={() => go("admin")}
            >
              <ShieldCheck size={18} aria-hidden="true" />
              Quản trị công ty
            </button>
          </div>
        )}
      </nav>
      <div className="studio-nav-bottom">
        <button
          aria-current={page === "studio-guide" ? "page" : undefined}
          onClick={() => go("studio-guide")}
        >
          <BookOpen size={18} aria-hidden="true" />
          Hướng dẫn sử dụng
        </button>
      </div>
      <div className="studio-profile">
        <span>{user.email[0].toUpperCase()}</span>
        <div>
          <strong>
            {user.role === "admin" ? "Quản trị viên" : "Thành viên"}
          </strong>
          <small title={user.email}>{user.email}</small>
        </div>
        <button aria-label="Đăng xuất" onClick={onLogout}>
          <LogOut size={17} />
        </button>
      </div>
    </>
  );
  return (
    <div className="studio-application">
      <a
        className="skip-link"
        href="#studio-main"
        onClick={(e) => {
          e.preventDefault();
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
            Không gian sản xuất sáng tạo.
          </SheetDescription>
          {sidebar}
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
            <span>LCG Workspace</span>
            <ChevronRight size={14} aria-hidden="true" />
            <strong>{title}</strong>
          </span>
          <WeeklyBudget userId={user.id} activeCount={0} />
        </header>
        <main
          id="studio-main"
          tabIndex={-1}
          className={`studio-main${workbench ? " studio-main-workbench" : ""}`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
