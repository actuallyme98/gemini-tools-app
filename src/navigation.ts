import { useCallback } from "react";
import { useNavigate } from "react-router";

export const pagePaths: Record<string, string> = {
  studio: "/",
  "studio-new": "/ideas/new",
  "studio-ideas": "/ideas",
  "studio-gallery": "/gallery",
  "studio-mockups": "/mockups",
  "studio-outputs": "/outputs",
  "studio-manage": "/manage/teams",
  "studio-guide": "/guide",
  admin: "/admin",
  "admin-users": "/admin/users",
  "admin-runs": "/admin/jobs",
  "admin-audit": "/admin/audit",
  "admin-settings": "/admin/settings",
};
const oldAliases: Record<string, string> = {
  agent: "studio",
  home: "studio",
  jobs: "studio-ideas",
  library: "studio-gallery",
  "background-studio": "studio-mockups",
  "mockup-generator": "studio-mockups",
  guide: "studio-guide",
  settings: "admin-settings",
};
export function studioPath(page: string, id?: string) {
  const [name, query = ""] = page.replace(/^#/, "").split("?");
  const key = oldAliases[name] ?? name;
  const params = new URLSearchParams(query);
  const selected = id ?? params.get("id");
  params.delete("id");
  let path = pagePaths[key] ?? "/";
  if (
    selected &&
    ["studio-new", "studio-ideas", "studio-gallery", "studio-mockups"].includes(
      key,
    )
  )
    path =
      key === "studio-new"
        ? `/ideas/${encodeURIComponent(selected)}/edit`
        : `${path}/${encodeURIComponent(selected)}`;
  if (key === "studio-manage") {
    const tab = params.get("tab");
    if (
      tab &&
      ["teams", "stores", "library", "budget", "operations"].includes(tab)
    )
      path = `/manage/${tab === "operations" ? "schedule" : tab === "budget" ? "budgets" : tab}`;
    params.delete("tab");
  }
  return path + (params.size ? `?${params}` : "");
}
export function useStudioNavigate() {
  const navigate = useNavigate();
  return useCallback(
    (page: string, id?: string) => {
      void navigate(studioPath(page, id));
    },
    [navigate],
  );
}
