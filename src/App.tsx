import { lazy, Suspense, useSyncExternalStore } from "react";
import { AIProviderProvider } from "./context/AIProviderProvider";
import { Toaster } from "./components/ui/sonner";
const SharedConversationPage = lazy(
  () => import("./pages/SharedConversationPage"),
);
const StudioPage = lazy(() => import("./pages/StudioPage"));
const LegacyWorkspace = lazy(() => import("./pages/LegacyWorkspace"));

const pages = [
  "studio",
  "studio-new",
  "studio-ideas",
  "studio-mockups",
  "studio-outputs",
  "studio-manage",
  "studio-guide",
  "agent",
  "share",
  "jobs",
  "library",
  "workspace",
  "templates",
  "workflows",
  "settings",
  "guide",
  "admin",
  "admin-users",
  "admin-runs",
  "admin-audit",
  "admin-settings",
  "home",
  "mockup-generator",
  "background-studio",
  "idea-generator",
  "image-editor",
];
function currentPage() {
  const page = location.hash.slice(1).split("?")[0];
  return pages.includes(page)
    ? page
    : import.meta.env.VITE_STUDIO_ENABLED === "true"
      ? "studio"
      : "agent";
}
function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}
export default function App() {
  const page = useSyncExternalStore(subscribe, currentPage, () => "agent");
  const navigate = (next: string) => {
    if (pages.includes(next)) location.hash = next;
  };
  if (page === "share")
    return (
      <Suspense fallback={<main role="status">Đang tải cuộc trò chuyện…</main>}>
        <SharedConversationPage />
      </Suspense>
    );
  return (
    <AIProviderProvider>
      <Toaster
        position="top-right"
        offset={80}
        mobileOffset={{ top: 76, right: 16, left: 16 }}
        richColors
        closeButton
        duration={6000}
      />
      {page.startsWith("studio") ? (
        <Suspense
          fallback={<main role="status">Đang tải Creative Studio…</main>}
        >
          <StudioPage page={page} />
        </Suspense>
      ) : (
        <Suspense
          fallback={<main role="status">Đang tải không gian làm việc…</main>}
        >
          <LegacyWorkspace page={page} onNavigate={navigate} />
        </Suspense>
      )}
    </AIProviderProvider>
  );
}
