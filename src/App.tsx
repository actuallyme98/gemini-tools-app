import { lazy, Suspense, useEffect, useSyncExternalStore } from "react";
import { AIProviderProvider } from "./context/AIProviderProvider";
import { Toaster } from "./components/ui/sonner";

const StudioPage = lazy(() => import("./pages/StudioPage"));
const pages = new Set([
  "studio",
  "studio-new",
  "studio-ideas",
  "studio-gallery",
  "studio-mockups",
  "studio-outputs",
  "studio-manage",
  "studio-guide",
  "admin",
  "admin-users",
  "admin-runs",
  "admin-audit",
  "admin-settings",
]);
const aliases: Record<string, string> = {
  home: "studio",
  agent: "studio",
  jobs: "studio-ideas",
  library: "studio-gallery",
  "background-studio": "studio-mockups",
  "mockup-generator": "studio-mockups",
  guide: "studio-guide",
  settings: "admin-settings",
};
function currentPage() {
  const value = location.hash.slice(1).split("?")[0];
  return pages.has(value) ? value : (aliases[value] ?? "studio");
}
function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}
export default function App() {
  const page = useSyncExternalStore(subscribe, currentPage, () => "studio");
  useEffect(() => {
    const original = location.hash.slice(1).split("?")[0];
    if (!pages.has(original)) history.replaceState(null, "", `#${page}`);
  }, [page]);
  return (
    <AIProviderProvider>
      <Toaster
        position="top-right"
        offset={76}
        richColors
        closeButton
        duration={6000}
      />
      <Suspense
        fallback={
          <main className="studio-boot" role="status">
            Đang mở Creative Studio…
          </main>
        }
      >
        <StudioPage page={page} />
      </Suspense>
    </AIProviderProvider>
  );
}
