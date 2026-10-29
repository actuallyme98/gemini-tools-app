import { StudioSkeleton } from "./StudioSkeleton";
import { useEffect, useState } from "react";
import { Clock3, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  studioClient,
  studioLabels,
  type StudioPage,
  type StudioTicket,
  type StudioSlot,
  type StudioPlanStep,
  type StudioTeam,
} from "../../services/studio.service";
import { notifyApiError } from "../../utils/api-error-toast";
import { getErrorMessage } from "../../services/api.service";
import { Button } from "../ui/button";
import { StudioScheduleSettings } from "./StudioScheduleSettings";

type Batch = {
  id: string;
  teamId: string;
  occurrenceId: string;
  day: string;
  dueAt: string;
  ticketCount: number;
  states: Record<string, number>;
};
type BatchDetail = StudioPage<StudioTicket> & {
  batch: Batch;
  occurrence: { cutoffAt: string; windowEndsAt: string };
};
type Task = {
  ticket: StudioTicket;
  slots: StudioSlot[];
  plans: StudioPlanStep[];
};
const safeCodes = [
  "TEAM_BUDGET_EXCEEDED",
  "USER_BUDGET_EXCEEDED",
  "BUDGET_PRICING_UNAVAILABLE",
  "TEAM_BUDGET_ACCESS_REVOKED",
  "STUDIO_ACCESS_REVOKED",
];
export function StudioOperations({
  teams,
  onScheduleChanged,
}: {
  teams: StudioTeam[];
  onScheduleChanged: () => void;
}) {
  const [page, setPage] = useState(1),
    [batchPage, setBatchPage] = useState(1);
  const [list, setList] = useState<
    StudioPage<Batch> & { schedulerEnabled: boolean }
  >();
  const [batchId, setBatchId] = useState("");
  const [detail, setDetail] = useState<BatchDetail>();
  const [ticketId, setTicketId] = useState("");
  const [task, setTask] = useState<Task>();
  const [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [reason, setReason] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void studioClient
      .get<StudioPage<Batch> & { schedulerEnabled: boolean }>(
        `/operations/batches?page=${page}`,
        controller.signal,
      )
      .then((data) => {
        setList(data);
        setError("");
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(getErrorMessage(cause));
      });
    return () => controller.abort();
  }, [page, revision]);
  useEffect(() => {
    if (!batchId) return;
    const controller = new AbortController();
    void studioClient
      .get<BatchDetail>(
        `/operations/batches/${batchId}?page=${batchPage}`,
        controller.signal,
      )
      .then(setDetail)
      .catch((cause) => {
        if (!controller.signal.aborted) setError(getErrorMessage(cause));
      });
    return () => controller.abort();
  }, [batchId, batchPage, revision]);
  useEffect(() => {
    if (!ticketId) return;
    const controller = new AbortController();
    void studioClient
      .get<Task>(`/operations/tickets/${ticketId}`, controller.signal)
      .then(setTask)
      .catch((cause) => {
        if (!controller.signal.aborted) setError(getErrorMessage(cause));
      });
    return () => controller.abort();
  }, [ticketId, revision]);
  async function act(path: string, body: unknown, message: string) {
    setBusy(true);
    try {
      await studioClient.post(path, body);
      toast.success(message);
      setReason("");
      setRevision((value) => value + 1);
    } catch (cause) {
      notifyApiError(cause);
    } finally {
      setBusy(false);
    }
  }
  const current =
    detail?.batch.id === batchId && detail.page === batchPage
      ? detail
      : undefined;
  const focused = task?.ticket.id === ticketId ? task : undefined;
  const steps = [...(focused?.plans ?? []), ...(focused?.slots ?? [])];
  const canResume =
    !!focused &&
    ["blocked", "failed", "partial_failed"].includes(focused.ticket.state) &&
    !steps.some((step) =>
      ["submitted", "preparing", "interrupted"].includes(step.state),
    ) &&
    steps.some(
      (step) =>
        step.state === "failed" && safeCodes.includes(step.errorCode ?? ""),
    );
  return (
    <div>
      <header className="studio-page-heading">
        <div>
          <h2>Vận hành lịch & lô chạy</h2>
          <p>
            Mỗi kỳ theo giờ đã chọn có hồ sơ riêng; mỗi Team có một lô. Đóng tab
            không làm mất công việc.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setRevision((value) => value + 1)}
        >
          <RefreshCw size={16} />
          Cập nhật lô chạy
        </Button>
      </header>
      {list && (
        <p className="studio-note">
          <Clock3 size={17} aria-hidden="true" />
          {list.schedulerEnabled
            ? "Lịch tự động đang bật."
            : "Lịch tự động chưa bật trên máy chủ."}{" "}
          Giờ đã chọn là giờ bắt đầu, không phải giờ hoàn thành. Lỡ cửa sổ chạy
          cần quản trị xác nhận chạy bù.
        </p>
      )}
      <StudioScheduleSettings
        onSaved={() => {
          onScheduleChanged();
          setRevision((value) => value + 1);
        }}
      />
      {error && (
        <p className="studio-error" role="alert">
          {error}
        </p>
      )}
      {!list ? (
        <StudioSkeleton variant="table" />
      ) : !list.items.length ? (
        <section className="studio-card studio-empty">
          <Clock3 size={28} />
          <h3>Chưa có lô chạy theo lịch</h3>
          <p>
            Lô xuất hiện khi ý tưởng được duyệt để chạy theo giờ đã cấu hình.
          </p>
        </section>
      ) : (
        <div className="studio-operations-grid">
          <section className="studio-card">
            <h3>Các lô gần đây</h3>
            {list.items.map((batch) => (
              <button
                className="studio-list-row"
                key={batch.id}
                onClick={() => {
                  setBatchId(batch.id);
                  setBatchPage(1);
                  setTicketId("");
                }}
              >
                <strong>
                  {teams.find((team) => team.id === batch.teamId)?.name ??
                    "Team đã lưu trữ"}{" "}
                  · {batch.day}
                </strong>
                <span>
                  {batch.ticketCount} ý tưởng ·{" "}
                  {Object.entries(batch.states)
                    .map(
                      ([state, count]) =>
                        `${studioLabels[state] ?? state}: ${count}`,
                    )
                    .join(" · ")}
                </span>
              </button>
            ))}
            <footer className="studio-pagination">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Trang trước
              </Button>
              <span>Trang {page}</span>
              <Button
                variant="outline"
                disabled={page * list.limit >= list.total}
                onClick={() => setPage(page + 1)}
              >
                Trang sau
              </Button>
            </footer>
          </section>
          <section className="studio-card">
            <h3>Chi tiết lô</h3>
            {!batchId ? (
              <p>Chọn một lô để xem công việc và lỗi.</p>
            ) : !current ? (
              <StudioSkeleton variant="table" />
            ) : (
              <>
                <p>
                  Kỳ{" "}
                  {new Date(current.occurrence.cutoffAt).toLocaleString(
                    "vi-VN",
                    { timeZone: "Asia/Ho_Chi_Minh" },
                  )}{" "}
                  · UTC+7
                </p>
                <small>
                  Chốt đầu vào:{" "}
                  {new Date(current.occurrence.cutoffAt).toLocaleString(
                    "vi-VN",
                    { timeZone: "Asia/Ho_Chi_Minh" },
                  )}
                  . Ý tưởng duyệt sau mốc này thuộc kỳ kế tiếp.
                </small>
                {current.items.map((ticket) => (
                  <div className="studio-operation-ticket" key={ticket.id}>
                    <button
                      className="studio-list-row"
                      onClick={() => setTicketId(ticket.id)}
                    >
                      <strong>{ticket.snapshot.input.title}</strong>
                      <span>
                        {studioLabels[ticket.state] ?? ticket.state} ·{" "}
                        {ticket.snapshot.input.count} mẫu
                      </span>
                    </button>
                    {ticket.error && (
                      <p className="studio-error">{ticket.error}</p>
                    )}
                    {ticket.state === "missed" && (
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          void act(
                            `/tickets/${ticket.id}/catch-up`,
                            {},
                            "Đã tiếp nhận chạy bù. Dùng lại lượt và các kết quả hiện có.",
                          )
                        }
                      >
                        Chạy bù lô bị lỡ
                      </Button>
                    )}
                  </div>
                ))}
                <footer className="studio-pagination">
                  <Button
                    variant="outline"
                    disabled={batchPage <= 1}
                    onClick={() => setBatchPage(batchPage - 1)}
                  >
                    Trước
                  </Button>
                  <span>Trang {batchPage}</span>
                  <Button
                    variant="outline"
                    disabled={batchPage * current.limit >= current.total}
                    onClick={() => setBatchPage(batchPage + 1)}
                  >
                    Sau
                  </Button>
                </footer>
              </>
            )}
          </section>
        </div>
      )}
      {focused && (
        <section className="studio-card">
          <h3>
            <ShieldCheck size={18} aria-hidden="true" />
            Kiểm tra lượt chạy
          </h3>
          <p>{focused.ticket.snapshot.input.title}</p>
          <p className="studio-note">
            Request chưa rõ kết quả cần đối soát chi phí trước. Chỉ thao tác
            tiếp tục những lượt được xác định chưa gửi AI vì hạn mức, bảng giá
            hoặc quyền truy cập.
          </p>
          {steps.map((step) => (
            <details key={step.id}>
              <summary>
                {"phase" in step
                  ? step.phase === "analysis"
                    ? "Phân tích ảnh"
                    : "Lập brief"
                  : `Ảnh ${step.index + 1}`}{" "}
                · {studioLabels[step.state] ?? step.state}
              </summary>
              <dl className="studio-summary">
                <div>
                  <dt>Mã yêu cầu</dt>
                  <dd>{step.requestId}</dd>
                </div>
                {step.errorCode && (
                  <div>
                    <dt>Mã lỗi</dt>
                    <dd>{step.errorCode}</dd>
                  </div>
                )}
              </dl>
              {step.error && <p className="studio-error">{step.error}</p>}
            </details>
          ))}
          {canResume && (
            <form
              className="studio-form-grid"
              onSubmit={(event) => {
                event.preventDefault();
                void act(
                  `/operations/tickets/${ticketId}/resume-budget`,
                  { reason },
                  "Đã đưa phần chưa gửi vào hàng đợi; ảnh đã xong được giữ nguyên.",
                );
              }}
            >
              <label>
                Lý do tiếp tục sau khi xử lý hạn mức/giá/quyền
                <textarea
                  value={reason}
                  minLength={3}
                  maxLength={1000}
                  required
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
              <Button disabled={busy || reason.trim().length < 3}>
                Tiếp tục phần chưa gửi AI
              </Button>
            </form>
          )}
          <a href="#admin-users" className="studio-link-button">
            Mở tài khoản và sổ chi phí để đối soát
          </a>
        </section>
      )}
    </div>
  );
}
