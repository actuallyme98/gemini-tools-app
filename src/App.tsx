import { lazy, Suspense, useSyncExternalStore } from "react";
import { HomePage } from "./pages/HomePage";
import { MockupGeneratorPage } from "./pages/MockupGeneratorPage";
import { IdeaGeneratorPage } from "./pages/IdeaGeneratorPage";
import { ImageProcessingPage } from "./pages/ImageProcessingPage";
import { BackgroundStudioPage } from "./pages/BackgroundStudioPage";
import { AgentPage } from "./pages/AgentPage";
import { AIProviderProvider } from "./context/AIProviderProvider";
import { Toaster } from "./components/ui/sonner";
const SharedConversationPage = lazy(
  () => import("./pages/SharedConversationPage"),
);

const pages = [
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
  return pages.includes(page) ? page : "agent";
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
      <AgentPage page={page} onNavigate={navigate}>
        <section hidden={page !== "home"} aria-label="Công cụ">
          <HomePage onNavigate={navigate} />
        </section>
        <section
          hidden={page !== "mockup-generator"}
          aria-label="Mockup Generator"
        >
          <MockupGeneratorPage />
        </section>
        <section
          hidden={page !== "background-studio"}
          aria-label="Mockup Studio"
        >
          <BackgroundStudioPage />
        </section>
        <section hidden={page !== "idea-generator"} aria-label="Idea Generator">
          <IdeaGeneratorPage />
        </section>
        <section hidden={page !== "image-editor"} aria-label="Image Editor">
          <ImageProcessingPage />
        </section>
      </AgentPage>
    </AIProviderProvider>
  );
}
