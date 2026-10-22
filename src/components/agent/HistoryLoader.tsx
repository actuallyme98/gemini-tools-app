import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

export function HistoryLoader({ loading, onLoad, label }: { loading: boolean; onLoad: () => void; label: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const button = ref.current;
    if (!button || loading) return;
    const root = button.closest("[data-history-scroll]") ?? document.getElementById("main-content");
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) onLoad();
    }, { root, rootMargin: "80px" });
    // Let the reader scroll before auto-loading; the button always works with a keyboard.
    const arm = () => observer.observe(button);
    root?.addEventListener("scroll", arm, { once: true, passive: true });
    return () => { observer.disconnect(); root?.removeEventListener("scroll", arm); };
  }, [loading, onLoad]);
  return <button ref={ref} type="button" className="history-loader" disabled={loading} onClick={onLoad}>
    {loading && <Loader2 className="studio-loading-spinner" size={15} aria-hidden="true" />}
    <span role={loading ? "status" : undefined}>{loading ? "Đang tải lịch sử…" : label}</span>
  </button>;
}
