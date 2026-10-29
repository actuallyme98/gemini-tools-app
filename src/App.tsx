import { lazy, Suspense, useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router";
import { AIProviderProvider } from "./context/AIProviderProvider";
import { Toaster } from "./components/ui/sonner";
import { StudioSkeleton } from "./components/studio/StudioSkeleton";
import { pagePaths, studioPath } from "./navigation";

const StudioPage = lazy(() => import("./pages/StudioPage"));
function PageRoutes() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  if (location.hash.startsWith("#") && location.hash !== "#studio-main")
    return <Navigate to={studioPath(location.hash)} replace />;
  return (
    <Suspense
      fallback={
        <main className="studio-loading-frame">
          <StudioSkeleton />
        </main>
      }
    >
      <Routes>
        {Object.entries(pagePaths).map(([page, path]) => (
          <Route key={page} path={path} element={<StudioPage page={page} />} />
        ))}
        <Route path="/ideas/:id" element={<StudioPage page="studio-ideas" />} />
        <Route
          path="/ideas/:id/edit"
          element={<StudioPage page="studio-new" />}
        />
        <Route
          path="/gallery/:id"
          element={<StudioPage page="studio-gallery" />}
        />
        <Route
          path="/mockups/:id"
          element={<StudioPage page="studio-mockups" />}
        />
        {["stores", "library", "budgets", "schedule"].map((tab) => (
          <Route
            key={tab}
            path={`/manage/${tab}`}
            element={<StudioPage page="studio-manage" />}
          />
        ))}
        <Route
          path="/manage"
          element={<Navigate to="/manage/teams" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <AIProviderProvider>
        <Toaster
          position="top-right"
          offset={76}
          richColors
          closeButton
          duration={6000}
        />
        <PageRoutes />
      </AIProviderProvider>
    </BrowserRouter>
  );
}
