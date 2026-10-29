import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  studioClient,
  type StudioSchedule,
} from "../../services/studio.service";
import { getErrorMessage } from "../../services/api.service";
import { notifyApiError } from "../../utils/api-error-toast";
import { Button } from "../ui/button";

export function StudioScheduleSettings({ onSaved }: { onSaved: () => void }) {
  const [saved, setSaved] = useState<StudioSchedule>();
  const [dailyTime, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void studioClient
      .get<StudioSchedule>("/operations/schedule", controller.signal)
      .then((value) => {
        if (controller.signal.aborted) return;
        setSaved(value);
        setTime(value.dailyTime);
        setError("");
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(getErrorMessage(cause));
      });
    return () => controller.abort();
  }, [retry]);
  async function save() {
    if (!saved || busy) return;
    setBusy(true);
    setError("");
    try {
      const value = await studioClient.patch<StudioSchedule>(
        "/operations/schedule",
        { dailyTime, revision: saved.revision, reason },
      );
      setSaved(value);
      setTime(value.dailyTime);
      setReason("");
      toast.success(`Đã lưu giờ chạy tự động ${value.dailyTime} (UTC+7).`);
      onSaved();
    } catch (cause) {
      setError(getErrorMessage(cause));
      notifyApiError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="studio-card studio-team-budget"
      aria-labelledby="studio-schedule-heading"
    >
      <h3 id="studio-schedule-heading">Giờ chạy tự động mỗi ngày</h3>
      <p>
        Áp dụng chung cho Studio theo giờ Việt Nam (UTC+7). Mặc định 22:00; có
        thể chọn bất kỳ giờ nào trong ngày.
      </p>
      {error && (
        <p className="studio-error" role="alert">
          {error}{" "}
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setRetry((v) => v + 1)}
          >
            Tải lại cấu hình giờ
          </Button>
        </p>
      )}
      {!saved ? (
        <p role="status">Đang tải giờ chạy…</p>
      ) : (
        <>
          <p>
            Giờ đang áp dụng: <strong>{saved.dailyTime} · UTC+7</strong>
          </p>
          <div className="studio-form-grid">
            <label htmlFor="studio-schedule-time">
              Giờ chạy hằng ngày
              <input
                id="studio-schedule-time"
                type="time"
                step={60}
                required
                value={dailyTime}
                disabled={busy}
                onChange={(e) => setTime(e.target.value)}
              />
            </label>
            <label htmlFor="studio-schedule-reason">
              Lý do thay đổi giờ chạy
              <input
                id="studio-schedule-reason"
                maxLength={1000}
                value={reason}
                disabled={busy}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
          </div>
          <p className="studio-note">
            Giờ mới áp dụng cho các lượt được duyệt sau khi lưu. Lượt đã lên
            lịch giữ nguyên thời điểm đã chốt. Nếu đã qua giờ chạy, lượt mới sẽ
            vào ngày kế tiếp. Đổi giờ không tự bật lịch đang tắt.
          </p>
          <Button
            disabled={
              busy ||
              !dailyTime ||
              dailyTime === saved.dailyTime ||
              reason.trim().length < 3
            }
            onClick={() => void save()}
          >
            {busy ? "Đang lưu…" : "Lưu giờ chạy tự động"}
          </Button>
        </>
      )}
    </section>
  );
}
