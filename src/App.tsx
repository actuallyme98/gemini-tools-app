import { useState, useSyncExternalStore } from "react";
import { Menu } from "lucide-react";
import { HomePage } from "./pages/HomePage";
import { MockupGeneratorPage } from "./pages/MockupGeneratorPage";
import { IdeaGeneratorPage } from "./pages/IdeaGeneratorPage";
import { ImageProcessingPage } from "./pages/ImageProcessingPage";
import { Sidebar } from "./components/Sidebar";
import { Toaster } from "./components/ui/sonner";
import { Button } from "./components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "./components/ui/sheet";

const pages = ["home", "mockup-generator", "idea-generator", "image-editor"];
function currentPage() {
  const page = location.hash.slice(1);
  return pages.includes(page) ? page : "home";
}
function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}
export default function App() {
  const page = useSyncExternalStore(subscribe, currentPage, () => "home");
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = (next: string) => {
    if (pages.includes(next)) location.hash = next;
    setMenuOpen(false);
  };
  return (
    <div className="flex h-dvh bg-gray-50 overflow-hidden">
      <Toaster />
      <a
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-3 focus:bg-white"
      >
        Đến nội dung chính
      </a>
      <div className="hidden md:flex shrink-0">
        <Sidebar currentPage={page} onPageChange={navigate} />
      </div>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Điều hướng</SheetTitle>
          <SheetDescription className="sr-only">
            Chọn công cụ xử lý ảnh
          </SheetDescription>
          <Sidebar currentPage={page} onPageChange={navigate} />
        </SheetContent>
      </Sheet>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden border-b bg-white p-3 flex items-center gap-3">
          <Button
            aria-label="Mở menu"
            variant="outline"
            size="icon"
            onClick={() => setMenuOpen(true)}
          >
            <Menu />
          </Button>
          <span className="font-semibold">Creative Studio</span>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 min-w-0 overflow-y-auto"
        >
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <section hidden={page !== "home"} aria-label="Dashboard">
              <HomePage onNavigate={navigate} />
            </section>
            <section
              hidden={page !== "mockup-generator"}
              aria-label="Mockup Generator"
            >
              <MockupGeneratorPage />
            </section>
            <section
              hidden={page !== "idea-generator"}
              aria-label="Idea Generator"
            >
              <IdeaGeneratorPage />
            </section>
            <section hidden={page !== "image-editor"} aria-label="Image Editor">
              <ImageProcessingPage />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
