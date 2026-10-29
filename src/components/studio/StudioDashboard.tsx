import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { studioClient, studioNavigate } from "../../services/studio.service";
import { getErrorMessage } from "../../services/api.service";
type Stats = {
  ideas: Record<string, number>;
  tickets: Record<string, number>;
  mockups: Record<string, number>;
  outputs: Record<string, number>;
  reviews: Record<string, number>;
  storeCount: number;
  generatedAt: string;
};
const sum = (values: Record<string, number>) =>
  Object.values(values).reduce((a, b) => a + b, 0);
export function StudioDashboard({ onPending }: { onPending: () => void }) {
  const [data, setData] = useState<Stats>(),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let loading = false;
    const load = () => {
      if (loading || document.hidden) return;
      loading = true;
      void studioClient
        .get<Stats>("/dashboard", controller.signal)
        .then((value) => {
          if (!controller.signal.aborted) {
            setData(value);
            setError("");
          }
        })
        .catch((cause) => {
          if (!controller.signal.aborted) setError(getErrorMessage(cause));
        })
        .finally(() => {
          loading = false;
        });
    };
    load();
    const timer = setInterval(load, 30000);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [retry]);
  return (
    <section
      aria-label="Số liệu vận hành Studio"
      className="studio-dashboard-stats"
    >
      {error && (
        <p className="studio-error" role="alert">
          Không tải được số liệu: {error}
          <Button variant="outline" onClick={() => setRetry((v) => v + 1)}>
            Tải lại số liệu
          </Button>
        </p>
      )}
      {!data ? (
        <p role="status">Đang tính số liệu từ công việc đã lưu…</p>
      ) : (
        <>
          <div className="studio-overview-grid">
            {[
              {
                label: "Ý tưởng trong phạm vi của bạn",
                value: sum(data.ideas),
                click: () => studioNavigate("studio-ideas"),
              },
              {
                label: "Chờ Leader duyệt",
                value: data.ideas.pending ?? 0,
                click: onPending,
              },
              {
                label: "Lượt đã lên lịch",
                value: data.tickets.scheduled ?? 0,
                click: () => studioNavigate("studio-ideas"),
              },
              {
                label: "Lượt đang chờ / đang chạy",
                value: ["queued", "running"].reduce(
                  (n, k) => n + (data.tickets[k] ?? 0) + (data.mockups[k] ?? 0),
                  0,
                ),
                click: () => studioNavigate("studio-ideas"),
              },
              {
                label: "Ảnh và artwork đã tạo",
                value: sum(data.outputs),
                click: () => studioNavigate("studio-outputs"),
              },
              {
                label: "Lượt cần kiểm tra lỗi / chạy bù",
                value: ["failed", "partial_failed", "blocked", "missed"].reduce(
                  (n, k) => n + (data.tickets[k] ?? 0) + (data.mockups[k] ?? 0),
                  0,
                ),
                click: () => studioNavigate("studio-ideas"),
              },
            ].map((item) => (
              <button
                key={item.label}
                className="studio-card"
                onClick={item.click}
              >
                <strong className="studio-metric-value">{item.value}</strong>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          <p className="studio-muted">
            Dữ liệu thật trong {data.storeCount} cửa hàng được cấp · cập nhật{" "}
            {new Date(data.generatedAt).toLocaleTimeString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
            })}
            . Một lượt có thể tạo nhiều ảnh.
          </p>
        </>
      )}
    </section>
  );
}
