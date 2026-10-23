import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, Menu } from "lucide-react";
import { Sidebar, type SidebarProps } from "../Sidebar";
import { WeeklyBudget } from "./UsageBudget";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "../ui/sheet";

const titles: Record<string, string> = {
  agent: "Trợ lý AI",
  jobs: "Công việc",
  library: "Thư viện",
  templates: "Templates",
  workflows: "Custom workflows",
  guide: "Hướng dẫn sử dụng",
  admin: "Quản trị · Tổng quan",
  "admin-users": "Quản trị · Tài khoản",
  "admin-runs": "Quản trị · Công việc",
  "admin-audit": "Quản trị · Audit logs",
  "admin-settings": "Quản trị · Vận hành",
  home: "Công cụ",
  "mockup-generator": "Mockup Generator",
  "background-studio": "Mockup Studio",
  "idea-generator": "Idea Generator",
  "image-editor": "Image Editor",
};

export function AgentShell({
  children,
  ...props
}: SidebarProps & { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    main.current?.scrollTo({ top: 0 });
  }, [props.currentPage, props.selectedId]);
  const sidebarProps = {
    ...props,
    onPageChange: (page: string) => {
      props.onPageChange(page);
      setOpen(false);
    },
    onNew: () => {
      props.onNew?.();
      setOpen(false);
    },
    onConversation: (id: string) => {
      props.onConversation?.(id);
      setOpen(false);
    },
  };
  return (
    <div className="agent-application">
      <a
        href="#main-content"
        className="skip-link"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Đến nội dung chính
      </a>
      <div className="desktop-sidebar">
        <Sidebar {...sidebarProps} />
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetTitle className="sr-only">Điều hướng</SheetTitle>
          <SheetDescription className="sr-only">
            Trò chuyện, công việc và thư viện.
          </SheetDescription>
          <Sidebar {...sidebarProps} />
        </SheetContent>
      </Sheet>
      <div className="workspace-body">
        <header className="workspace-header">
          <button
            type="button"
            className="icon-button mobile-menu"
            aria-label="Mở menu"
            onClick={() => setOpen(true)}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          <div className="workspace-breadcrumb">
            <span>Workspace</span>
            <span aria-hidden="true">/</span>
            <strong>{titles[props.currentPage] || "Trợ lý AI"}</strong>
          </div>
          <div className="workspace-header-end">
            {props.user && (
              <WeeklyBudget
                userId={props.user.id}
                activeCount={props.activeCount ?? 0}
              />
            )}
            {(props.activeCount ?? 0) > 0 ? (
              <span className="header-activity">
                <i />
                {props.activeCount} đang xử lý
              </span>
            ) : (
              <span className="workspace-label">LCG MEDIA</span>
            )}
            <button
              type="button"
              className="workspace-header-link"
              onClick={() => props.onPageChange("library")}
            >
              Tài sản sáng tạo <ArrowUpRight size={15} aria-hidden="true" />
            </button>
          </div>
        </header>
        <main
          ref={main}
          id="main-content"
          tabIndex={-1}
          className={`workspace-main${props.currentPage === "agent" ? " workspace-main-chat" : ""}`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
