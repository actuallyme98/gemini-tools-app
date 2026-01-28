import { useState } from "react";

import { HomePage } from "./pages/HomePage";
import { MockupGeneratorPage } from "./pages/MockupGeneratorPage";
import { IdeaGeneratorPage } from "./pages/IdeaGeneratorPage";
import { ImageProcessingPage } from "./pages/ImageProcessingPage";

import { Sidebar } from "./components/Sidebar";
import { Toaster } from "./components/ui/sonner";
import { Card } from "./components/ui/card";

export default function App() {
  const [currentPage, setCurrentPage] = useState("home");

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <HomePage onNavigate={setCurrentPage} />;
      case "mockup-generator":
        return <MockupGeneratorPage />;
      case "idea-generator":
        return <IdeaGeneratorPage />;
      case "image-editor":
        return <ImageProcessingPage />;
      case "batch-processing":
        return <PlaceholderPage title="Batch Processing" />;
      case "ai-enhance":
        return <PlaceholderPage title="AI Enhance" />;
      case "templates":
        return <PlaceholderPage title="Templates" />;
      case "settings":
        return <PlaceholderPage title="Settings" />;
      default:
        return <HomePage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Toaster />

      {/* Sidebar */}
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">{renderPage()}</div>
      </main>
    </div>
  );
}

// Placeholder component for disabled features
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
        <p className="text-gray-600 mt-2">
          Tính năng này đang được phát triển.
        </p>
      </div>

      <Card className="p-12">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mb-6">
            <span className="text-4xl">🚧</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Coming Soon
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            Chúng tôi đang nỗ lực để mang đến cho bạn tính năng{" "}
            {title.toLowerCase()} tuyệt vời nhất. Hãy quay lại sau nhé!
          </p>
          <div className="mt-8 inline-flex gap-2">
            <div
              className="w-2 h-2 rounded-full bg-blue-600 animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="w-2 h-2 rounded-full bg-purple-600 animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <div
              className="w-2 h-2 rounded-full bg-pink-600 animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
