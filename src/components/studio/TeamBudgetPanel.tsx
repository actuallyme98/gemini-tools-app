import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Wallet } from "lucide-react";
import { toast } from "sonner";
import { studioClient, type StudioTeam } from "../../services/studio.service";
import { getErrorMessage } from "../../services/api.service";
import { notifyApiError } from "../../utils/api-error-toast";
import { Button } from "../ui/button";

type Summary = {
  teamId: string;
  currency: "CREDIT" | "USD";
  key: string;
  end: string;
  policyVersion: number;
  dailyLimit: number | null;
  configuredDailyLimit: number | null;
  spent: number;
  reserved: number;
  available: number | null;
  usedPercent: number | null;
  unresolvedCount: number;
};
type Entry = {
  id: string;
  owner: string;
  requestId: string;
  scope?: string;
  personalPeriod: string;
  status: string;
  reservedMicro: number;
  costMicro?: number;
};
type Journal = {
  items: Entry[];
  total: number;
  page: number;
  limit: number;
  summary: Summary;
};
export function TeamBudgetPanel({ teams }: { teams: StudioTeam[] }) {
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [data, setData] = useState<Journal>();
  const [page, setPage] = useState(1);
  const [day, setDay] = useState("");
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState("");
  const [unlimited, setUnlimited] = useState<boolean>();
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (!teamId) return;
    const controller = new AbortController();
    void studioClient
      .get<Journal>(
        `/team-budgets/${teamId}/entries?page=${page}${day ? `&day=${day}` : ""}`,
        controller.signal,
      )
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
          setError("");
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(getErrorMessage(cause));
      });
    return () => controller.abort();
  }, [teamId, day, page, revision]);
  const current =
    data?.summary.teamId === teamId &&
    data.page === page &&
    (!day || data.summary.key === day)
      ? data
      : undefined;
  const summary = current?.summary;
  const unit = summary?.currency === "CREDIT" ? "credit" : "USD";
  const money = (value: number) =>
    `${value.toLocaleString("vi-VN", { maximumFractionDigits: 6 })} ${unit}`;
  const uncapped = unlimited ?? summary?.configuredDailyLimit === null;
  async function save() {
    if (!summary || busy) return;
    setBusy(true);
    try {
      await studioClient.patch(`/team-budgets/${teamId}`, {
        dailyLimit: uncapped
          ? null
          : Number(limit || summary.configuredDailyLimit || 0),
        policyVersion: summary.policyVersion,
        reason,
      });
      toast.success(
        "Đã cập nhật hạn mức Team. Hạn mức cá nhân vẫn được kiểm tra riêng.",
      );
      setLimit("");
      setUnlimited(undefined);
      setReason("");
      setRevision((value) => value + 1);
    } catch (cause) {
      notifyApiError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <header className="studio-page-heading">
        <div>
          <h2>Ngân sách Team theo ngày</h2>
          <p>
            Tính từ 00:00 đến 24:00 giờ Việt Nam. Tạo ảnh, phân tích và lập
            brief đều được tính khi có phí.
          </p>
        </div>
        <Button
          variant="outline"
          aria-label="Tải lại usage Team"
          onClick={() => setRevision((value) => value + 1)}
        >
          <RefreshCw size={17} />
        </Button>
      </header>
      <div className="studio-form-grid">
        <label>
          Nhóm
          <select
            value={teamId}
            onChange={(event) => {
              setTeamId(event.target.value);
              setPage(1);
              setUnlimited(undefined);
              setLimit("");
            }}
          >
            <option value="">Chọn nhóm</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ngày xem usage
          <input
            type="date"
            value={day}
            onChange={(event) => {
              setDay(event.target.value);
              setPage(1);
            }}
          />
          <small>Để trống để xem hôm nay.</small>
        </label>
      </div>
      {!teamId && <p>Chưa có Team. Tạo nhóm trước để cấu hình hạn mức.</p>}
      {error && (
        <p className="studio-error" role="alert">
          {error}
        </p>
      )}
      {teamId && !current && !error && (
        <p role="status">Đang tải usage Team…</p>
      )}
      {summary && (
        <>
          <section className="studio-card studio-team-budget">
            <Wallet size={22} aria-hidden="true" />
            <h3>
              {summary.available === null
                ? "Chưa đặt giới hạn Team"
                : `${money(summary.available)} khả dụng`}
            </h3>
            <p>
              Đã dùng {money(summary.spent)} · Đang giữ chỗ{" "}
              {money(summary.reserved)}
              {summary.dailyLimit !== null
                ? ` / ${money(summary.dailyLimit)} mỗi ngày`
                : ""}
            </p>
            {summary.usedPercent !== null && (
              <progress
                max={100}
                value={summary.usedPercent}
                aria-label="Usage Team đã dùng và giữ chỗ"
              />
            )}
            <small>
              Ngày {summary.key} · cấp lại{" "}
              {new Date(summary.end).toLocaleString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
              })}{" "}
              (UTC+7)
            </small>
            {summary.unresolvedCount > 0 && (
              <p className="studio-note">
                Có {summary.unresolvedCount} khoản đang giữ chỗ hoặc cần đối
                soát. Không giải phóng chi phí khi chưa kiểm tra provider.
              </p>
            )}
          </section>
          <form
            className="studio-card studio-form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <h3 className="studio-span-full">Đặt hoặc tăng hạn mức</h3>
            <label className="studio-check studio-span-full">
              <input
                type="checkbox"
                checked={!!uncapped}
                onChange={(event) => setUnlimited(event.target.checked)}
              />
              Không giới hạn ở cấp Team (vẫn áp dụng hạn mức cá nhân)
            </label>
            <label>
              Hạn mức Team mỗi ngày ({unit})
              <input
                type="number"
                min={0}
                max={1000000}
                step="0.01"
                disabled={uncapped || busy}
                value={limit || (summary.configuredDailyLimit ?? "")}
                onChange={(event) => setLimit(event.target.value)}
                required={!uncapped}
              />
              <small>
                0 chặn lượt AI mới của Team. Thay đổi áp dụng cho các lần gửi
                tiếp theo.
              </small>
            </label>
            <label>
              Lý do thay đổi
              <textarea
                value={reason}
                minLength={3}
                maxLength={1000}
                onChange={(event) => setReason(event.target.value)}
                required
              />
            </label>
            <Button disabled={busy || reason.trim().length < 3}>
              {busy && <Loader2 className="animate-spin" size={16} />}Lưu hạn
              mức Team
            </Button>
          </form>
          <section className="studio-card">
            <h3>Sổ chi phí ngày {summary.key}</h3>
            {current?.items.length ? (
              current.items.map((entry) => (
                <details key={entry.id}>
                  <summary>
                    {entry.status === "settled"
                      ? "Đã chốt"
                      : entry.status === "unresolved"
                        ? "Cần đối soát"
                        : "Đang giữ chỗ"}{" "}
                    · {money((entry.costMicro ?? entry.reservedMicro) / 1e6)}
                  </summary>
                  <dl className="studio-summary">
                    <div>
                      <dt>Tài khoản</dt>
                      <dd>{entry.owner}</dd>
                    </div>
                    <div>
                      <dt>Mã request</dt>
                      <dd>{entry.requestId}</dd>
                    </div>
                    <div>
                      <dt>Công việc</dt>
                      <dd>{entry.scope ?? "Không có"}</dd>
                    </div>
                  </dl>
                  <a className="studio-link-button" href="#admin-users">
                    Mở tài khoản để đối soát khoản phí gốc
                  </a>
                </details>
              ))
            ) : (
              <p>Chưa có chi phí trong ngày này.</p>
            )}
            <div className="studio-pagination">
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
                disabled={!current || current.total <= page * current.limit}
                onClick={() => setPage(page + 1)}
              >
                Trang sau
              </Button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
