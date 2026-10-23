import { useEffect, useRef, useState } from "react";
import { RefreshCw, Wallet } from "lucide-react";
import { agentClient } from "../../services/agent.service";
import { getErrorMessage } from "../../services/api.service";
import { notifyApiError } from "../../utils/api-error-toast";
import { toast } from "sonner";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import type {
  BudgetDetails,
  BudgetPolicy,
  BudgetSummary,
  PriceRule,
} from "../../services/budget.service";
import { usd, budgetDate } from "../../services/budget.service";
import "../../styles/budget.css";

function useBudget<T>(path: string, refreshKey?: string) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{
    path: string;
    data?: T;
    error?: string;
  }>({ path });
  useEffect(() => {
    const controller = new AbortController();
    agentClient
      .get<T>(path, { signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted) setState({ path, data: response.data });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ path, error: getErrorMessage(error) });
      });
    return () => controller.abort();
  }, [path, revision, refreshKey]);
  return {
    data: state.path === path ? state.data : undefined,
    error: state.path === path ? state.error : undefined,
    reload: () => setRevision((value) => value + 1),
  };
}
export function BudgetMeter({ data }: { data: BudgetSummary }) {
  return (
    <div className="budget-meter">
      <div>
        <strong>{usd(data.availableUsd)} khả dụng</strong>
        <span>/ {usd(data.limitUsd)} mỗi tuần</span>
      </div>
      <progress
        max={100}
        value={data.usedPercent}
        aria-label="Ngân sách AI đã dùng và giữ chỗ"
        aria-valuetext={`${usd(data.spentUsd)} đã dùng, ${usd(data.reservedUsd)} đang giữ chỗ; hạn mức ${usd(data.limitUsd)}`}
        className={data.usedPercent >= 80 ? "budget-warning" : undefined}
      />
      <p>
        Đã dùng {usd(data.spentUsd)} · Đang giữ chỗ {usd(data.reservedUsd)}
      </p>
      <small>
        Tuần từ {budgetDate(data.periodStart)} · Cấp lại{" "}
        {budgetDate(data.periodEnd)} (UTC+7)
      </small>
    </div>
  );
}
export function WeeklyBudget({
  userId,
  activeCount,
}: {
  userId: string;
  activeCount: number;
}) {
  const [tick, setTick] = useState(0);
  const resource = useBudget<BudgetSummary>(
    "/usage",
    `${userId}:${tick}:${activeCount}`,
  );
  useEffect(() => {
    const interval = setInterval(() => setTick((value) => value + 1), 30000);
    return () => clearInterval(interval);
  }, [userId]);
  return (
    <details className="weekly-budget">
      <summary>
        <Wallet size={15} aria-hidden="true" />
        {resource.error
          ? "Chưa tải được ngân sách"
          : resource.data
            ? `${usd(resource.data.availableUsd)} / ${usd(resource.data.limitUsd)} tuần này`
            : "Đang tải ngân sách…"}
      </summary>
      <div>
        {resource.error ? (
          <p>{resource.error}</p>
        ) : (
          resource.data && <BudgetMeter data={resource.data} />
        )}
        <Button size="sm" variant="ghost" onClick={resource.reload}>
          <RefreshCw size={14} aria-hidden="true" />
          Cập nhật ngân sách
        </Button>
      </div>
    </details>
  );
}
export function EmployeeBudgetDialog({
  account,
  close,
  onChanged,
}: {
  account: { id: string; email: string };
  close: () => void;
  onChanged: () => void;
}) {
  const opener = useRef<HTMLElement | null>(null);
  const [period, setPeriod] = useState("");
  const [cursor, setCursor] = useState(0);
  const resource = useBudget<BudgetDetails>(
    `/admin/users/${account.id}/usage?cursor=${cursor}${period ? "&period=" + period : ""}`,
  );
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState<string>();
  const [inherit, setInherit] = useState<boolean>();
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [reconcile, setReconcile] =
    useState<BudgetDetails["entries"][number]>();
  const [actual, setActual] = useState("");
  const data = resource.data;
  const currentWeek = !period;
  const useDefault = inherit ?? data?.overrideUsd === null;
  const proposed = useDefault
    ? (data?.defaultWeeklyUsd ?? 50)
    : Number(limit ?? data?.limitUsd ?? 50);
  const save = async () => {
    if (!data || busy) return;
    setBusy(true);
    try {
      if (reconcile)
        await agentClient.patch(
          `/admin/users/${account.id}/usage/${new Date(data.periodStart).toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" })}/${reconcile.id}`,
          { costUsd: Number(actual), reason },
        );
      else
        await agentClient.patch(`/admin/users/${account.id}/budget`, {
          weeklyUsd: useDefault ? null : proposed,
          policyVersion: data.policyVersion,
          reason,
        });
      toast.success(
        reconcile ? "Đã đối soát chi phí." : "Đã cập nhật hạn mức.",
      );
      setReason("");
      setConfirm(false);
      setReconcile(undefined);
      resource.reload();
      onChanged();
    } catch (error) {
      notifyApiError(error);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) close();
      }}
    >
      <DialogContent
        className="budget-dialog"
        onOpenAutoFocus={() => {
          opener.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const target = opener.current?.isConnected
            ? opener.current
            : document.getElementById(`budget-user-${account.id}`);
          target?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Ngân sách AI của nhân viên</DialogTitle>
          <DialogDescription>
            {account.email} · Hạn mức theo tuần; tăng hoặc giảm theo nhu cầu.
          </DialogDescription>
        </DialogHeader>
        {resource.error ? (
          <div role="alert">
            <p>{resource.error}</p>
            <Button onClick={resource.reload}>Tải lại dữ liệu ngân sách</Button>
          </div>
        ) : !data ? (
          <p role="status">Đang tải ngân sách…</p>
        ) : (
          <>
            <label>
              Tuần sử dụng
              <select
                value={period}
                disabled={busy}
                onChange={(event) => {
                  setPeriod(event.target.value);
                  setCursor(0);
                  setConfirm(false);
                  setReconcile(undefined);
                  setReason("");
                }}
              >
                <option value="">Tuần hiện tại</option>
                {data.periods.map((value) => (
                  <option key={value} value={value}>
                    Tuần {value}
                  </option>
                ))}
              </select>
            </label>
            <BudgetMeter data={data} />
            {currentWeek && !reconcile && (
              <form
                className="budget-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  setConfirm(true);
                }}
              >
                <label className="budget-checkbox">
                  <input
                    type="checkbox"
                    checked={useDefault}
                    disabled={busy || confirm}
                    onChange={(event) => setInherit(event.target.checked)}
                  />
                  Dùng mặc định công ty ({usd(data.defaultWeeklyUsd)}/tuần)
                </label>
                <label>
                  Hạn mức mỗi tuần (USD)
                  <input
                    type="number"
                    min={0}
                    max={1000000}
                    step="0.01"
                    required
                    value={
                      useDefault
                        ? data.defaultWeeklyUsd
                        : (limit ?? data.limitUsd)
                    }
                    disabled={busy || confirm || useDefault}
                    onChange={(event) => setLimit(event.target.value)}
                  />
                </label>
                <p>
                  Hạn mức {usd(data.limitUsd)} →{" "}
                  {Number.isFinite(proposed) ? usd(proposed) : "—"}. Còn khả
                  dụng sau thay đổi:{" "}
                  {Number.isFinite(proposed)
                    ? usd(
                        Math.max(
                          0,
                          proposed - data.spentUsd - data.reservedUsd,
                        ),
                      )
                    : "—"}
                  .
                </p>
                <label>
                  Lý do điều chỉnh
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={500}
                    value={reason}
                    disabled={busy || confirm}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </label>
                {!confirm && <Button type="submit">Xem lại thay đổi</Button>}
              </form>
            )}
            {reconcile && (
              <form
                className="budget-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  setConfirm(true);
                }}
              >
                <strong>Đối soát request {reconcile.requestId}</strong>
                <p>
                  Chỉ nhập chi phí đã kiểm tra với provider. Nhập 0 nếu đã xác
                  nhận không tính phí. Không gửi lại request AI.
                </p>
                <label>
                  Chi phí đã xác minh (USD)
                  <input
                    type="number"
                    min={0}
                    max={1000000}
                    step="0.000001"
                    required
                    value={actual}
                    disabled={busy || confirm}
                    onChange={(event) => setActual(event.target.value)}
                  />
                </label>
                <label>
                  Lý do và căn cứ đối soát
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={500}
                    value={reason}
                    disabled={busy || confirm}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </label>
                {!confirm && (
                  <>
                    <Button type="submit">Xem lại đối soát</Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => {
                        setReconcile(undefined);
                        setReason("");
                      }}
                    >
                      Hủy đối soát
                    </Button>
                  </>
                )}
              </form>
            )}
            {confirm && (
              <div
                className="budget-confirm"
                role="group"
                aria-label="Xác nhận thay đổi ngân sách"
              >
                <p>
                  {reconcile
                    ? `Chốt ${usd(Number(actual))} cho request này?`
                    : `Áp dụng ${usd(proposed)}/tuần cho ${account.email}?`}{" "}
                  Chi phí đã dùng được giữ nguyên.
                </p>
                <Button disabled={busy} onClick={() => void save()}>
                  {busy ? "Đang lưu…" : "Xác nhận lưu"}
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setConfirm(false)}
                >
                  Quay lại chỉnh sửa
                </Button>
              </div>
            )}
            <div
              className="budget-journal"
              role="region"
              aria-label="Chi phí từng request"
              tabIndex={0}
            >
              <table>
                <thead>
                  <tr>
                    <th>Request / model</th>
                    <th>Chi phí / giữ chỗ</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        <span>{entry.model}</span>
                        <small>{entry.requestId}</small>
                        <small>
                          {entry.operation} ·{" "}
                          {new Date(entry.createdAt).toLocaleString("vi-VN")}
                        </small>
                        <small>Căn cứ giá: {entry.priceSource}</small>
                      </td>
                      <td>
                        {entry.costUsd === undefined
                          ? `${usd(entry.reservedUsd)} giữ chỗ`
                          : usd(entry.costUsd)}
                      </td>
                      <td>
                        {entry.status === "settled"
                          ? entry.basis === "configured_rates"
                            ? "Theo bảng giá cấu hình"
                            : "Đã chốt"
                          : entry.canReconcile
                            ? "Chờ đối soát"
                            : "Đang xử lý"}
                        {entry.canReconcile && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy || confirm}
                            onClick={() => {
                              setReconcile(entry);
                              setActual("");
                              setReason("");
                            }}
                          >
                            Đối soát
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.entries.length && <p>Tuần này chưa có request AI.</p>}
            </div>
            <div className="budget-pagination">
              <Button
                variant="ghost"
                disabled={busy || cursor === 0}
                onClick={() => setCursor(Math.max(0, cursor - 50))}
              >
                Usage trước
              </Button>
              <span>{data.totalEntries ?? data.entries.length} request</span>
              <Button
                variant="ghost"
                disabled={busy || typeof data.nextCursor !== "number"}
                onClick={() => setCursor(data.nextCursor!)}
              >
                Usage tiếp theo
              </Button>
            </div>
            <Button variant="outline" disabled={busy} onClick={resource.reload}>
              Tải lại dữ liệu ngân sách
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
export function BudgetPolicyPanel() {
  const resource = useBudget<BudgetPolicy>("/admin/budget-policy");
  const [draft, setDraft] = useState<BudgetPolicy>();
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const data = draft ?? resource.data;
  const change = (index: number, fields: Partial<PriceRule>) => {
    if (data)
      setDraft({
        ...data,
        prices: data.prices.map((rule, i) =>
          i === index ? { ...rule, ...fields } : rule,
        ),
      });
  };
  return (
    <section className="budget-policy admin-panel">
      <h2>Ngân sách & bảng giá AI</h2>
      <p>
        Mặc định 50 USD/tài khoản/tuần. Tuần bắt đầu thứ Hai 00:00 (UTC+7). Bảng
        giá nội bộ dùng để dự toán và tính usage; không lấy chênh lệch số dư
        chung để trừ tiền nhân viên.
      </p>
      {resource.error ? (
        <div role="alert">
          <p>{resource.error}</p>
          <Button onClick={resource.reload}>Thử tải lại bảng giá</Button>
        </div>
      ) : !data ? (
        <p role="status">Đang tải chính sách ngân sách…</p>
      ) : (
        <form
          className="budget-form"
          onSubmit={(event) => {
            event.preventDefault();
            setConfirm(true);
          }}
        >
          <fieldset disabled={busy || confirm}>
            <label>
              Hạn mức mặc định mỗi tuần (USD)
              <input
                type="number"
                min={0}
                max={1000000}
                step="0.01"
                required
                value={data.defaultWeeklyUsd}
                onChange={(event) =>
                  setDraft({
                    ...data,
                    defaultWeeklyUsd: Number(event.target.value),
                  })
                }
              />
            </label>
            <p>
              Áp dụng cho các tài khoản dùng mặc định. Tài khoản có hạn mức
              riêng không bị ghi đè. Model chưa có quy tắc giữ chỗ sẽ bị chặn
              trước khi gọi AI.
            </p>
            <div className="budget-price-rules">
              {data.prices.map((rule, index) => (
                <fieldset key={index} className="budget-price-rule">
                  <legend>Quy tắc giá {index + 1}</legend>
                  <div className="budget-price-grid">
                    <label>
                      Kết nối
                      <select
                        aria-label={`Kết nối giá ${index + 1}`}
                        value={rule.provider}
                        onChange={(event) =>
                          change(index, { provider: event.target.value })
                        }
                      >
                        <option value="shopaikey">Provider 1</option>
                        <option value="gemini">Provider 2</option>
                        <option value="vyceai">Provider văn bản</option>
                      </select>
                    </label>
                    <label>
                      Model
                      <input
                        type="text"
                        required
                        maxLength={180}
                        value={rule.model}
                        onChange={(event) =>
                          change(index, { model: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      Tác vụ
                      <select
                        value={rule.operation}
                        onChange={(event) =>
                          change(index, {
                            operation: event.target.value,
                            imageUsd: undefined,
                          })
                        }
                      >
                        <option value="image">Tạo / sửa ảnh</option>
                        <option value="text">Văn bản</option>
                        <option value="vision">Phân tích ảnh</option>
                        <option value="health">Kiểm tra health có phí</option>
                      </select>
                    </label>
                    <label>
                      Giữ chỗ tối đa / lượt (USD)
                      <input
                        type="number"
                        min="0.000001"
                        max={1000000}
                        step="0.000001"
                        required
                        value={rule.reserveUsd}
                        onChange={(event) =>
                          change(index, {
                            reserveUsd: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                    {(
                      [
                        ["requestUsd", "Phí cố định / lượt (USD)"],
                        ["inputUsdPerMillion", "1 triệu token đầu vào (USD)"],
                        ["outputUsdPerMillion", "1 triệu token đầu ra (USD)"],
                        ...(rule.operation === "image"
                          ? [["imageUsd", "Mỗi ảnh đầu ra (USD)"]]
                          : []),
                      ] as [keyof PriceRule, string][]
                    ).map(([key, label]) => (
                      <label key={key}>
                        {label}
                        <input
                          type="number"
                          min={0}
                          max={1000000}
                          step="0.000001"
                          value={rule[key] ?? ""}
                          onChange={(event) =>
                            change(index, {
                              [key]:
                                event.target.value === ""
                                  ? undefined
                                  : Number(event.target.value),
                            })
                          }
                        />
                      </label>
                    ))}
                    <label className="budget-price-source">
                      Nguồn giá / căn cứ xác minh
                      <input
                        type="text"
                        required
                        minLength={3}
                        maxLength={500}
                        value={rule.source}
                        onChange={(event) =>
                          change(index, { source: event.target.value })
                        }
                      />
                    </label>
                  </div>
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...data,
                        prices: data.prices.filter((_, i) => i !== index),
                      })
                    }
                  >
                    Bỏ quy tắc {index + 1}
                  </Button>
                </fieldset>
              ))}
            </div>
            <p>
              Để trống phí/token/ảnh khi chưa xác minh được giá: request vẫn giữ
              chỗ và chờ admin đối soát, không tự tính bằng 0. Chi phí tính từ
              bảng giá được ghi nhãn riêng với chi phí provider báo.
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={data.prices.length >= 200}
              onClick={() =>
                setDraft({
                  ...data,
                  prices: [
                    ...data.prices,
                    {
                      provider: "shopaikey",
                      model: "",
                      operation: "image",
                      reserveUsd: 1,
                      source: "",
                    },
                  ],
                })
              }
            >
              Thêm quy tắc giá
            </Button>
            <label>
              Lý do thay đổi chính sách
              <input
                type="text"
                required
                minLength={3}
                maxLength={500}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
          </fieldset>
          {!confirm ? (
            <Button type="submit">Xem lại chính sách ngân sách</Button>
          ) : (
            <div
              className="budget-confirm"
              role="group"
              aria-label="Xác nhận chính sách ngân sách"
            >
              <p>
                Áp dụng mặc định {usd(data.defaultWeeklyUsd)}/tuần và{" "}
                {data.prices.length} quy tắc giá?
              </p>
              <Button
                type="button"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void agentClient
                    .patch("/admin/budget-policy", {
                      defaultWeeklyUsd: data.defaultWeeklyUsd,
                      prices: data.prices,
                      updatedAt: resource.data?.updatedAt,
                      reason,
                    })
                    .then(() => {
                      toast.success("Đã lưu chính sách ngân sách.");
                      setDraft(undefined);
                      setReason("");
                      setConfirm(false);
                      resource.reload();
                    })
                    .catch(notifyApiError)
                    .finally(() => setBusy(false));
                }}
              >
                {busy ? "Đang lưu…" : "Xác nhận lưu chính sách"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => setConfirm(false)}
              >
                Quay lại chỉnh sửa
              </Button>
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              setDraft(undefined);
              setConfirm(false);
              resource.reload();
            }}
          >
            Tải lại chính sách
          </Button>
        </form>
      )}
    </section>
  );
}
