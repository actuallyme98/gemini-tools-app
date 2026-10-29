import { StudioSkeleton } from "../components/studio/StudioSkeleton";
import { StudioSelect } from "../components/ui/StudioSelect";
import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Database,
  Download,
  Loader2,
  LockKeyhole,
  Pause,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { agentClient, type AgentUser } from "../services/agent.service";
import { getErrorMessage } from "../services/api.service";
import type {
  AdminAudit,
  AdminOverview,
  AdminRun,
  AdminSettings,
  AdminStep,
  AdminUser,
  CompanySettings,
  Diagnostic,
  DiagnosticPage,
  RequestDiagnostics,
  PageResult,
  ProviderUsageSnapshot,
} from "../services/admin.service";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent as BaseDialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { saveBlob } from "../utils/download.util";
import { toast } from "sonner";
import { notifyApiError } from "../utils/api-error-toast";
import "../styles/admin.css";
import {
  BudgetMeter,
  EmployeeBudgetDialog,
  BudgetPolicyPanel,
} from "../components/agent/UsageBudget";

function DialogContent(props: ComponentProps<typeof BaseDialogContent>) {
  const opener = useRef<HTMLElement | null>(null);
  return (
    <BaseDialogContent
      {...props}
      aria-modal="true"
      onOpenAutoFocus={(event) => {
        opener.current =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        props.onOpenAutoFocus?.(event);
      }}
      onCloseAutoFocus={(event) => {
        props.onCloseAutoFocus?.(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
        const target =
          opener.current?.isConnected &&
          !opener.current.closest('[data-state="closed"]')
            ? opener.current
            : document.querySelector<HTMLButtonElement>(
                '.admin-tabs button[aria-current="page"]',
              );
        target?.focus();
      }}
    />
  );
}

const tabs = [
  { id: "admin", label: "Tổng quan", icon: Activity },
  { id: "admin-users", label: "Tài khoản", icon: Users },
  { id: "admin-runs", label: "Công việc", icon: ClipboardList },
  { id: "admin-audit", label: "Audit logs", icon: ShieldCheck },
  { id: "admin-settings", label: "Vận hành", icon: Settings2 },
];
const labels: Record<string, string> = {
  admin: "Quản trị viên",
  designer: "Designer",
  planning: "Lên kế hoạch",
  needs_input: "Cần bổ sung",
  draft: "Bản nháp",
  queued: "Đang chờ",
  running: "Đang xử lý",
  review: "Chờ duyệt",
  completed: "Hoàn tất",
  partial_failed: "Lỗi một phần",
  failed: "Thất bại",
  cancelled: "Đã dừng",
  done: "Hoàn tất",
  interrupted: "Gián đoạn",
  success: "Thành công",
  pending: "Chưa xác định",
  active: "Hoạt động",
  disabled: "Đã khóa",
};
const actions: Record<string, string> = {
  "account.create": "Tạo tài khoản",
  "account.password_reset": "Đặt lại mật khẩu",
  "account.sessions_revoked": "Thu hồi phiên",
  "account.role_changed": "Đổi quyền",
  "account.disabled": "Khóa tài khoản",
  "account.enabled": "Mở khóa tài khoản",
  "run.cancelled": "Dừng công việc",
  "company.settings_changed": "Đổi cấu hình công ty",
};
const date = (value?: string) =>
  value ? new Date(value).toLocaleString("vi-VN") : "Chưa có";
const count = (value: number) => new Intl.NumberFormat("vi-VN").format(value);
const bytes = (value = 0) =>
  value < 1024
    ? `${value} B`
    : value < 1048576
      ? `${(value / 1024).toFixed(1)} KB`
      : value < 1073741824
        ? `${(value / 1048576).toFixed(1)} MB`
        : `${(value / 1073741824).toFixed(2)} GB`;
function Badge({ value }: { value: string }) {
  return (
    <span
      className={`admin-badge ${["failed", "partial_failed", "interrupted", "disabled"].includes(value) ? "is-danger" : ["success", "completed", "done", "active"].includes(value) ? "is-success" : ""}`}
    >
      {labels[value] || value}
    </span>
  );
}
function useAdminResource<T>(url: string | null) {
  const [result, setResult] = useState<{
    url: string;
    revision: number;
    data?: T;
    error?: string;
  }>();
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    void agentClient
      .get<T>(url, { signal: controller.signal, timeout: 15000 })
      .then(({ data }) => {
        if (!controller.signal.aborted) {
          setResult({ url, revision, data });
          toast.dismiss(`admin-resource-${url}`);
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setResult({ url, revision, error: getErrorMessage(cause) });
          notifyApiError(cause, { id: `admin-resource-${url}` });
        }
      });
    return () => controller.abort();
  }, [url, revision]);
  const current =
    result?.url === url && result?.revision === revision ? result : undefined;
  return {
    data: current?.data,
    loading: !!url && !current,
    error: current?.error || "",
    reload: () => setRevision((value) => value + 1),
  };
}
function ResourceState({
  resource,
  children,
}: {
  resource: { loading: boolean; error: string; reload: () => void };
  children: ReactNode;
}) {
  if (resource.loading)
    return <StudioSkeleton variant="table" label="Đang tải dữ liệu…" />;
  if (resource.error)
    return (
      <div className="admin-placeholder">
        <p>Chưa tải được dữ liệu.</p>
        <Button variant="outline" onClick={resource.reload}>
          Thử lại
        </Button>
      </div>
    );
  return children;
}
function Pagination({
  page,
  total,
  limit,
  setPage,
  busy,
}: {
  page: number;
  total: number;
  limit: number;
  setPage: (page: number) => void;
  busy: boolean;
}) {
  return (
    <div className="admin-pagination">
      <span>
        {count(total)} bản ghi · Trang {page} /{" "}
        {Math.max(1, Math.ceil(total / limit))}
      </span>
      <div>
        <Button
          size="sm"
          variant="outline"
          disabled={page <= 1 || busy}
          onClick={() => setPage(page - 1)}
        >
          Trước
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={page * limit >= total || busy}
          onClick={() => setPage(page + 1)}
        >
          Sau
        </Button>
      </div>
    </div>
  );
}
function Refresh({
  reload,
  loading,
}: {
  reload: () => void;
  loading: boolean;
}) {
  return (
    <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
      <RefreshCw size={15} aria-hidden="true" /> Làm mới
    </Button>
  );
}
type Action = {
  title: string;
  description: string;
  password?: boolean;
  work: (reason: string, password: string) => Promise<unknown>;
};
function ConfirmAction({
  action,
  close,
  onDone,
}: {
  action: Action | null;
  close: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open={!!action}
      onOpenChange={(open) => {
        if (!open && !busy) close();
      }}
    >
      <DialogContent
        className="admin-dialog"
        onInteractOutside={(event) => {
          if (busy) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{action?.title}</DialogTitle>
          <DialogDescription>{action?.description}</DialogDescription>
        </DialogHeader>
        <form
          className="admin-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!action || busy) return;
            setBusy(true);
            void action
              .work(reason, password)
              .then(() => {
                toast.success("Đã áp dụng thay đổi.");
                onDone();
                close();
              })
              .catch((cause) => notifyApiError(cause))
              .finally(() => setBusy(false));
          }}
        >
          {action?.password && (
            <label>
              Mật khẩu mới
              <input
                type="password"
                aria-label="Mật khẩu mới"
                aria-describedby="admin-new-password-help"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <small id="admin-new-password-help">
                Tối thiểu 12 ký tự. Người dùng cần đăng nhập lại bằng mật khẩu
                mới.
              </small>
            </label>
          )}
          <label>
            Lý do thao tác
            <textarea
              aria-label="Lý do thao tác"
              required
              minLength={3}
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ghi rõ lý do để đối chiếu trong audit logs"
            />
          </label>
          <div className="admin-dialog-actions">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={close}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && (
                <Loader2
                  className="studio-loading-spinner"
                  aria-hidden="true"
                />
              )}
              Xác nhận
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function ProviderBalances() {
  const resource = useAdminResource<ProviderUsageSnapshot>(
    "/admin/provider-usage",
  );
  const money = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(value);
  useEffect(() => {
    for (const provider of resource.data?.items ?? [])
      if (provider.status === "error")
        notifyApiError(new Error(`${provider.label}: ${provider.message}`), {
          id: `provider-balance-${provider.id}`,
        });
      else toast.dismiss(`provider-balance-${provider.id}`);
  }, [resource.data]);
  return (
    <section className="admin-provider-balances" aria-label="Số dư provider">
      <div className="admin-section-title">
        <div>
          <h2>Số dư & mức sử dụng AI</h2>
          <p>Credit do provider trả về · đồng bộ tối đa mỗi 60 giây.</p>
        </div>
        <Refresh {...resource} />
      </div>
      <ResourceState resource={resource}>
        <div className="admin-balance-grid">
          {resource.data?.items.map((provider) => (
            <article
              key={provider.id}
              className="admin-balance-card"
              aria-label={`Số dư ${provider.label}`}
            >
              <h3>{provider.label}</h3>
              {provider.status === "available" &&
              provider.balance !== undefined ? (
                <>
                  <p className="admin-balance-label">Credit còn lại</p>
                  <strong
                    className={`admin-balance-amount${provider.balance <= 0 ? " is-empty" : ""}`}
                  >
                    {money(provider.balance)} <small>credit</small>
                  </strong>
                  {provider.usedPercent !== undefined &&
                  provider.total !== undefined &&
                  provider.used !== undefined ? (
                    <>
                      <div className="admin-balance-percent">
                        <span>Đã dùng</span>
                        <strong>
                          {new Intl.NumberFormat("vi-VN", {
                            maximumFractionDigits: 1,
                          }).format(provider.usedPercent)}
                          %
                        </strong>
                      </div>
                      <progress
                        className={provider.usedPercent >= 90 ? "is-low" : ""}
                        value={provider.usedPercent}
                        max={100}
                        aria-label={`Mức sử dụng ${provider.label}`}
                        aria-describedby={`usage-note-${provider.id}`}
                      />
                      <dl className="admin-balance-breakdown">
                        <div>
                          <dt>Đã sử dụng</dt>
                          <dd>{money(provider.used)}</dd>
                        </div>
                        <div>
                          <dt>
                            {provider.totalBasis === "provider"
                              ? "Tổng credit"
                              : "Đã dùng + còn lại"}
                          </dt>
                          <dd>{money(provider.total)}</dd>
                        </div>
                      </dl>
                      <p
                        className="admin-balance-note"
                        id={`usage-note-${provider.id}`}
                      >
                        {provider.totalBasis === "provider"
                          ? "Tỷ lệ đã dùng trên tổng credit provider báo."
                          : "Tỷ lệ = đã dùng / (đã dùng + còn lại); không phải hạn mức tháng hoặc tổng tiền nạp."}
                      </p>
                    </>
                  ) : (
                    <p className="admin-balance-note">
                      Provider chưa trả đủ tổng credit và mức dùng để tính phần
                      trăm.
                    </p>
                  )}
                  <p className="admin-balance-note">
                    Cập nhật: {date(provider.checkedAt)}
                  </p>
                </>
              ) : (
                <div className="admin-balance-unavailable">
                  <strong>
                    {provider.status === "error"
                      ? "Chưa lấy được số dư"
                      : "Chưa hỗ trợ số dư"}
                  </strong>
                  <p>{provider.message}</p>
                  {provider.code && <small>{provider.code}</small>}
                </div>
              )}
            </article>
          ))}
        </div>
        {resource.data && !resource.data.items.length && (
          <p className="admin-empty">
            Chưa có provider được cấu hình để kiểm tra số dư.
          </p>
        )}
      </ResourceState>
      <p className="admin-balance-note">
        Đơn vị credit USD của provider, không quy đổi thành tiền đã thanh toán.
        Số dư áp dụng cho key/tài khoản đang kết nối và có thể bao gồm sử dụng
        bên ngoài ứng dụng này.
      </p>
    </section>
  );
}

function Overview({ onNavigate }: { onNavigate: (page: string) => void }) {
  const resource = useAdminResource<AdminOverview>("/admin/overview");
  const data = resource.data;
  useEffect(() => {
    if (data?.queuePaused)
      toast.warning(
        "Hàng đợi đang tạm dừng. Các request đã gửi vẫn có thể hoàn tất.",
        { id: "company-queue-paused" },
      );
    else toast.dismiss("company-queue-paused");
  }, [data?.queuePaused]);
  const total = (kind: string) =>
    data?.totals.find((row) => row._id === kind)?.count || 0;
  const state = (...states: string[]) =>
    data?.runs
      .filter((row) => states.includes(row._id))
      .reduce((sum, row) => sum + row.count, 0) || 0;
  const storage = data?.storage[0];
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(
      (data ? Date.parse(data.generatedAt) : 0) - (6 - index) * 86400000,
    )
      .toISOString()
      .slice(0, 10);
    return {
      day,
      count: data?.daily.find((row) => row._id === day)?.count || 0,
    };
  });
  const max = Math.max(1, ...days.map((day) => day.count));
  return (
    <>
      <div className="admin-section-title">
        <div>
          <h2>Nhịp vận hành hôm nay</h2>
          <p>
            Dữ liệu toàn công ty · cập nhật{" "}
            {data ? date(data.generatedAt) : "…"}
          </p>
        </div>
        <Refresh {...resource} />
      </div>
      <ResourceState resource={resource}>
        {data && (
          <>
            {data.queuePaused && (
              <div className="admin-warning">
                <Pause size={18} aria-hidden="true" />
                <button onClick={() => onNavigate("admin-settings")}>
                  Quản lý hàng đợi đang tạm dừng{" "}
                  <ArrowRight size={14} aria-hidden="true" />
                </button>
              </div>
            )}
            <div className="admin-stats">
              {[
                {
                  label: "Tài khoản",
                  value: count(total("user")),
                  note: `${data.sessions[0]?.count || 0} phiên còn hạn`,
                  icon: Users,
                },
                {
                  label: "Công việc đang xử lý",
                  value: count(state("planning", "queued", "running")),
                  note: `${state("review")} công việc chờ duyệt`,
                  icon: Activity,
                },
                {
                  label: "Cần kiểm tra",
                  value: count(state("failed", "partial_failed")),
                  note: "Công việc lỗi hoặc lỗi một phần",
                  icon: XCircle,
                },
                {
                  label: "Tài sản sáng tạo",
                  value: count(total("asset")),
                  note: `${bytes(storage?.bytes)} dung lượng ảnh logic`,
                  icon: Database,
                },
              ].map(({ label, value, note, icon: Icon }) => (
                <article className="admin-stat" key={label}>
                  <div>
                    <span>{label}</span>
                    <Icon size={18} aria-hidden="true" />
                  </div>
                  <strong>{value}</strong>
                  <small>{note}</small>
                </article>
              ))}
            </div>
            <ProviderBalances />
            <div className="admin-overview-grid">
              <section className="admin-panel">
                <div className="admin-panel-heading">
                  <div>
                    <h3>Khối lượng công việc</h3>
                    <p>Số công việc được tạo trong 7 ngày gần nhất (UTC)</p>
                  </div>
                  <ClipboardList size={19} aria-hidden="true" />
                </div>
                <div
                  className="admin-chart"
                  role="img"
                  aria-label={days
                    .map((row) => `${row.day}: ${row.count} công việc`)
                    .join("; ")}
                >
                  {days.map((row) => (
                    <div className="admin-chart-column" key={row.day}>
                      <strong>{row.count}</strong>
                      <div>
                        <span
                          style={{
                            height: `${Math.max(2, (row.count / max) * 100)}%`,
                          }}
                        />
                      </div>
                      <small>
                        {row.day.slice(8)}/{row.day.slice(5, 7)}
                      </small>
                    </div>
                  ))}
                </div>
              </section>
              <section className="admin-panel">
                <div className="admin-panel-heading">
                  <div>
                    <h3>Trạng thái công việc</h3>
                    <p>Toàn bộ lịch sử Agent của công ty</p>
                  </div>
                  <CheckCircle2 size={19} aria-hidden="true" />
                </div>
                <div className="admin-state-list">
                  {data.runs.length ? (
                    data.runs.map((row) => (
                      <div key={row._id}>
                        <Badge value={row._id} />
                        <strong>{count(row.count)}</strong>
                      </div>
                    ))
                  ) : (
                    <p>Chưa có công việc.</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => onNavigate("admin-runs")}
                >
                  Xem toàn bộ công việc{" "}
                  <ArrowRight size={15} aria-hidden="true" />
                </Button>
              </section>
            </div>
            <div className="admin-overview-grid">
              <section className="admin-panel">
                <h3>Lưu trữ & dữ liệu</h3>
                <dl className="admin-definition">
                  <div>
                    <dt>Ảnh trong thư viện</dt>
                    <dd>{count(storage?.count || 0)}</dd>
                  </div>
                  <div>
                    <dt>Ảnh lưu dự phòng MongoDB</dt>
                    <dd>{count(storage?.backups || 0)}</dd>
                  </div>
                  <div>
                    <dt>Template đã tạo</dt>
                    <dd>{count(total("template"))}</dd>
                  </div>
                </dl>
                <p className="admin-note">
                  Dung lượng tính từ file ảnh gốc; không phải dung lượng tính
                  phí của R2 hoặc chi phí AI.
                </p>
              </section>
              <section className="admin-panel admin-help-panel">
                <ShieldCheck size={25} aria-hidden="true" />
                <h3>Thao tác có thể đối chiếu</h3>
                <p>
                  Khóa tài khoản, đổi quyền, thu hồi phiên và thay đổi cấu hình
                  đều được ghi lịch sử quản trị.
                </p>
                <Button
                  variant="outline"
                  onClick={() => onNavigate("admin-audit")}
                >
                  Mở audit logs <ArrowRight size={15} aria-hidden="true" />
                </Button>
              </section>
            </div>
          </>
        )}
      </ResourceState>
    </>
  );
}

function CreateAccount({
  open,
  close,
  onDone,
}: {
  open: boolean;
  close: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open && !busy) close();
      }}
    >
      <DialogContent className="admin-dialog">
        <DialogHeader>
          <DialogTitle>Cấp tài khoản nhân viên</DialogTitle>
          <DialogDescription>
            Tài khoản dùng chung với đăng nhập Google khi email hợp lệ. Chỉ cấp
            quyền quản trị cho người phụ trách vận hành.
          </DialogDescription>
        </DialogHeader>
        <form
          className="admin-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (busy) return;
            const form = new FormData(event.currentTarget);
            setBusy(true);
            void agentClient
              .post("/admin/users", {
                email: form.get("email"),
                password: form.get("password"),
                role: form.get("role"),
              })
              .then(() => {
                toast.success("Đã cấp tài khoản nhân viên.");
                onDone();
                close();
              })
              .catch((cause) => notifyApiError(cause))
              .finally(() => setBusy(false));
          }}
        >
          <label>
            Email nhân viên
            <input
              name="email"
              type="email"
              autoComplete="off"
              required
              maxLength={254}
            />
          </label>
          <label>
            Mật khẩu ban đầu
            <input
              name="password"
              aria-label="Mật khẩu ban đầu"
              aria-describedby="admin-initial-password-help"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
            <small id="admin-initial-password-help">
              Tối thiểu 12 ký tự. Chia sẻ cho nhân viên qua kênh riêng.
            </small>
          </label>
          <label>
            Quyền truy cập
            <StudioSelect name="role" defaultValue="designer">
              <option value="designer">Designer</option>
              <option value="admin">Quản trị viên</option>
            </StudioSelect>
          </label>
          <div className="admin-dialog-actions">
            <Button
              type="button"
              variant="outline"
              onClick={close}
              disabled={busy}
            >
              Hủy
            </Button>
            <Button disabled={busy} type="submit">
              {busy && (
                <Loader2
                  className="studio-loading-spinner"
                  aria-hidden="true"
                />
              )}
              Tạo tài khoản
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Accounts({ user }: { user: AgentUser }) {
  const [budgetUser, setBudgetUser] = useState<AdminUser>();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState("");
  const [selected, setSelected] = useState<AdminUser>();
  const [create, setCreate] = useState(false);
  const [action, setAction] = useState<Action | null>(null);
  const resource = useAdminResource<
    PageResult<AdminUser> & { protectedAdminId: string }
  >(`/admin/users?page=${page}&${filters}`);
  const data = resource.data;
  const prepare = (
    target: AdminUser,
    title: string,
    description: string,
    change: Record<string, unknown>,
    password = false,
  ) => {
    setSelected(undefined);
    setAction({
      title,
      description,
      password,
      work: (reason, newPassword) =>
        agentClient.patch(`/admin/users/${target.id}`, {
          updatedAt: target.updatedAt,
          reason,
          ...change,
          ...(password ? { password: newPassword } : {}),
        }),
    });
  };
  return (
    <>
      <div className="admin-section-title">
        <div>
          <h2>Những người cùng sáng tạo</h2>
          <p>Cấp quyền phù hợp, kiểm soát truy cập và phiên đăng nhập.</p>
        </div>
        <div className="admin-inline-actions">
          <Refresh {...resource} />
          <Button onClick={() => setCreate(true)}>
            <Users size={16} aria-hidden="true" />
            Thêm tài khoản
          </Button>
        </div>
      </div>
      <form
        className="admin-filters"
        onSubmit={(event) => {
          event.preventDefault();
          const f = new FormData(event.currentTarget);
          const query = new URLSearchParams();
          for (const [key, value] of f)
            if (value) query.set(key, String(value));
          setPage(1);
          setFilters(query.toString());
        }}
      >
        <label>
          Tìm email
          <input
            name="search"
            type="search"
            placeholder="Nhập email nhân viên"
            maxLength={254}
          />
        </label>
        <label>
          Quyền
          <StudioSelect name="role">
            <option value="">Tất cả quyền</option>
            <option value="admin">Quản trị viên</option>
            <option value="designer">Designer</option>
          </StudioSelect>
        </label>
        <label>
          Trạng thái
          <StudioSelect name="disabled">
            <option value="">Tất cả trạng thái</option>
            <option value="false">Hoạt động</option>
            <option value="true">Đã khóa</option>
          </StudioSelect>
        </label>
        <Button type="submit" variant="outline">
          Lọc tài khoản
        </Button>
      </form>
      <ResourceState resource={resource}>
        {data && (
          <>
            <div
              className="admin-table-scroll"
              role="region"
              aria-label="Danh sách tài khoản"
              tabIndex={0}
            >
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nhân viên</th>
                    <th>Quyền & truy cập</th>
                    <th>Sử dụng</th>
                    <th>Ngân sách AI / tuần</th>
                    <th>Đăng nhập gần nhất</th>
                    <th>
                      <span className="sr-only">Thao tác</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((account) => (
                    <tr key={account.id}>
                      <td>
                        <strong>{account.email}</strong>
                        <small>
                          {account.id === data.protectedAdminId
                            ? "Quản trị viên gốc"
                            : `Tạo ${date(account.createdAt)}`}
                        </small>
                      </td>
                      <td>
                        <Badge value={account.role} />
                        <Badge
                          value={account.disabled ? "disabled" : "active"}
                        />
                      </td>
                      <td>
                        {account.usage.run?.count || 0} công việc ·{" "}
                        {account.usage.asset?.count || 0} ảnh
                        <small>
                          {account.usage.session?.count || 0} phiên còn hạn
                        </small>
                      </td>
                      <td>
                        {account.budget ? (
                          <BudgetMeter data={account.budget} />
                        ) : (
                          <span>Chưa tải ngân sách</span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setBudgetUser(account)}
                          id={`budget-user-${account.id}`}
                        >
                          Điều chỉnh ngân sách
                          <span className="sr-only"> {account.email}</span>
                        </Button>
                      </td>
                      <td>
                        {date(account.lastLoginAt)}
                        <small>
                          {[
                            account.hasPassword && "Mật khẩu",
                            account.googleLinked && "Google",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </small>
                      </td>
                      <td>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelected(account)}
                        >
                          Quản lý
                          <span className="sr-only"> {account.email}</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.items.length && (
                <p className="admin-empty">Không tìm thấy tài khoản phù hợp.</p>
              )}
            </div>
            <Pagination {...data} setPage={setPage} busy={resource.loading} />
          </>
        )}
      </ResourceState>
      {budgetUser && (
        <EmployeeBudgetDialog
          account={budgetUser}
          close={() => setBudgetUser(undefined)}
          onChanged={resource.reload}
        />
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(undefined);
        }}
      >
        <DialogContent className="admin-dialog">
          <DialogHeader>
            <DialogTitle>Quản lý tài khoản</DialogTitle>
            <DialogDescription>{selected?.email}</DialogDescription>
          </DialogHeader>
          {selected && (
            <>
              <dl className="admin-definition">
                <div>
                  <dt>ID tài khoản</dt>
                  <dd className="admin-mono">{selected.id}</dd>
                </div>
                <div>
                  <dt>Quyền</dt>
                  <dd>
                    <Badge value={selected.role} />
                  </dd>
                </div>
                <div>
                  <dt>Trạng thái</dt>
                  <dd>
                    <Badge value={selected.disabled ? "disabled" : "active"} />
                  </dd>
                </div>
              </dl>
              {(selected.id === user.id ||
                selected.id === data?.protectedAdminId) && (
                <p className="admin-note">
                  Tài khoản này được bảo vệ khỏi khóa và hạ quyền.
                </p>
              )}
              <div className="admin-account-actions">
                <Button
                  variant="outline"
                  disabled={
                    selected.id === user.id ||
                    selected.id === data?.protectedAdminId
                  }
                  onClick={() =>
                    prepare(
                      selected,
                      `Đổi quyền ${selected.email}`,
                      "Các phiên hiện tại sẽ bị thu hồi. Người dùng cần đăng nhập lại.",
                      {
                        role: selected.role === "admin" ? "designer" : "admin",
                      },
                    )
                  }
                >
                  Chuyển thành{" "}
                  {selected.role === "admin" ? "Designer" : "Quản trị viên"}
                </Button>
                <Button
                  variant="outline"
                  disabled={
                    !selected.disabled &&
                    (selected.id === user.id ||
                      selected.id === data?.protectedAdminId)
                  }
                  onClick={() =>
                    prepare(
                      selected,
                      selected.disabled
                        ? "Mở khóa tài khoản"
                        : "Khóa tài khoản",
                      "Khóa sẽ chặn đăng nhập và thu hồi phiên. Request AI đã gửi có thể vẫn hoàn tất.",
                      { disabled: !selected.disabled },
                    )
                  }
                >
                  {selected.disabled ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    prepare(
                      selected,
                      "Đặt lại mật khẩu",
                      "Mật khẩu cũ sẽ mất hiệu lực và tất cả phiên sẽ bị thu hồi.",
                      {},
                      true,
                    )
                  }
                >
                  Đặt lại mật khẩu
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    prepare(
                      selected,
                      "Thu hồi phiên đăng nhập",
                      "Tất cả thiết bị của tài khoản này phải đăng nhập lại.",
                      { revokeSessions: true },
                    )
                  }
                >
                  Thu hồi tất cả phiên
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <CreateAccount
        key={String(create)}
        open={create}
        close={() => setCreate(false)}
        onDone={resource.reload}
      />
      <ConfirmAction
        key={action?.title || "none"}
        action={action}
        close={() => setAction(null)}
        onDone={resource.reload}
      />
    </>
  );
}

function RunDetails({ run, close }: { run: AdminRun; close: () => void }) {
  const resource = useAdminResource<AdminStep[]>(`/admin/runs/${run.id}/steps`);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="admin-dialog admin-wide-dialog">
        <DialogHeader>
          <DialogTitle>Chi tiết công việc</DialogTitle>
          <DialogDescription>
            {run.productType} · {run.ownerEmail}
          </DialogDescription>
        </DialogHeader>
        <dl className="admin-definition">
          <div>
            <dt>Mã công việc</dt>
            <dd className="admin-mono">{run.id}</dd>
          </div>
          <div>
            <dt>Trạng thái</dt>
            <dd>
              <Badge value={run.state} />
            </dd>
          </div>
          <div>
            <dt>Model ảnh</dt>
            <dd>{run.imageModel || "Mặc định đã cấu hình"}</dd>
          </div>
        </dl>
        <ResourceState resource={resource}>
          <div className="admin-step-list">
            {resource.data?.map((step) => (
              <article key={step.id}>
                <div>
                  <strong>
                    {step.type === "plan"
                      ? "Lập kế hoạch"
                      : `Ảnh ${step.index + 1}`}
                  </strong>
                  <Badge value={step.state} />
                </div>
                {step.error && <p className="admin-error">{step.error}</p>}
                <small>
                  {step.errorCode || ""} · Request ID:{" "}
                  <span className="admin-mono">{step.requestId}</span>
                  {step.durationMs
                    ? ` · ${(step.durationMs / 1000).toFixed(1)}s`
                    : ""}
                </small>
              </article>
            ))}
            {!resource.data?.length && <p>Chưa có bước xử lý.</p>}
          </div>
        </ResourceState>
      </DialogContent>
    </Dialog>
  );
}
function Runs() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState("");
  const [selected, setSelected] = useState<AdminRun>();
  const [action, setAction] = useState<Action | null>(null);
  const resource = useAdminResource<PageResult<AdminRun>>(
    `/admin/runs?page=${page}&${filters}`,
  );
  return (
    <>
      <div className="admin-section-title">
        <div>
          <h2>Kiểm soát quy trình sáng tạo</h2>
          <p>
            Theo dõi công việc toàn công ty và đối chiếu lỗi theo request ID.
          </p>
        </div>
        <Refresh {...resource} />
      </div>
      <form
        className="admin-filters"
        onSubmit={(event) => {
          event.preventDefault();
          const f = new FormData(event.currentTarget);
          const params = new URLSearchParams();
          for (const [key, value] of f)
            if (value) params.set(key, String(value));
          setFilters(params.toString());
          setPage(1);
        }}
      >
        <label>
          Mã công việc
          <input
            name="search"
            type="search"
            placeholder="Nhập đầy đủ ID công việc"
            maxLength={254}
          />
        </label>
        <label>
          Trạng thái
          <StudioSelect name="state">
            <option value="">Tất cả trạng thái</option>
            {[
              "planning",
              "draft",
              "queued",
              "running",
              "review",
              "completed",
              "partial_failed",
              "failed",
              "cancelled",
            ].map((value) => (
              <option key={value} value={value}>
                {labels[value]}
              </option>
            ))}
          </StudioSelect>
        </label>
        <Button variant="outline" type="submit">
          Lọc công việc
        </Button>
      </form>
      <ResourceState resource={resource}>
        {resource.data && (
          <>
            <div
              className="admin-table-scroll"
              role="region"
              aria-label="Công việc toàn công ty"
              tabIndex={0}
            >
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Công việc</th>
                    <th>Người thực hiện</th>
                    <th>Trạng thái</th>
                    <th>Kết quả dự kiến</th>
                    <th>Cập nhật</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {resource.data.items.map((run) => (
                    <tr key={run.id}>
                      <td>
                        <strong>{run.productType}</strong>
                        <small className="admin-mono">{run.id}</small>
                        <small>{run.imageModel || run.operation}</small>
                      </td>
                      <td>{run.ownerEmail}</td>
                      <td>
                        <Badge value={run.state} />
                      </td>
                      <td>{run.count} ảnh</td>
                      <td>{date(run.updatedAt)}</td>
                      <td>
                        <div className="admin-row-actions">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelected(run)}
                          >
                            Chi tiết
                          </Button>
                          {[
                            "planning",
                            "draft",
                            "needs_input",
                            "queued",
                            "running",
                          ].includes(run.state) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setAction({
                                  title: "Dừng công việc",
                                  description:
                                    "Dừng các bước chưa gửi. Request đã đến provider có thể vẫn hoàn tất và được tính phí.",
                                  work: (reason) =>
                                    agentClient.post(
                                      `/admin/runs/${run.id}/cancel`,
                                      { reason },
                                    ),
                                })
                              }
                            >
                              Dừng
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!resource.data.items.length && (
                <p className="admin-empty">Chưa có công việc phù hợp.</p>
              )}
            </div>
            <Pagination
              {...resource.data}
              setPage={setPage}
              busy={resource.loading}
            />
          </>
        )}
      </ResourceState>
      {selected && (
        <RunDetails run={selected} close={() => setSelected(undefined)} />
      )}
      <ConfirmAction
        key={action?.title || "none"}
        action={action}
        close={() => setAction(null)}
        onDone={resource.reload}
      />
    </>
  );
}

function RequestLogDetails({
  selected,
  day,
  source,
}: {
  selected: Record<string, unknown>;
  day: string;
  source: string;
}) {
  const [cursor, setCursor] = useState(0);
  const requestId = String(selected.requestId || "");
  const resource = useAdminResource<RequestDiagnostics>(
    requestId
      ? `/admin/diagnostics/${encodeURIComponent(requestId)}?${new URLSearchParams({ day, source, cursor: String(cursor), limit: "50" })}`
      : null,
  );
  const data = resource.data;
  return (
    <div className="admin-request-detail">
      <dl className="admin-request-summary">
        {[
          ["Request ID", requestId || "Không có"],
          [
            "Nguồn / ngày UTC",
            `${source === "worker" ? "Worker" : "API"} · ${day}`,
          ],
          [
            "Đường dẫn",
            [selected.method, selected.path].filter(Boolean).join(" ") || "—",
          ],
          ["Người gửi", selected.actorEmail || "Không được ghi nhận"],
          [
            "Kết quả",
            selected.status || selected.code || selected.event || "—",
          ],
          [
            "Thời gian xử lý",
            selected.durationMs === undefined
              ? "Chưa ghi nhận"
              : `${selected.durationMs} ms`,
          ],
        ].map(([label, value]) => (
          <div key={String(label)}>
            <dt>{String(label)}</dt>
            <dd>{String(value)}</dd>
          </div>
        ))}
      </dl>
      <p className="admin-detail-note">
        Các sự kiện cùng request ID trong nguồn và ngày đã chọn. Tác vụ chạy qua
        nửa đêm cần tra thêm ngày kế tiếp; bước Agent có thể có request ID riêng
        trong Công việc.
      </p>
      {!requestId ? (
        <p role="status">Sự kiện cũ không có request ID để đối chiếu.</p>
      ) : (
        <>
          <div className="admin-inline-actions">
            <Refresh {...resource} />
            <Button
              variant="outline"
              size="sm"
              disabled={!data}
              onClick={() =>
                saveBlob(
                  new Blob([JSON.stringify(data, null, 2)], {
                    type: "application/json",
                  }),
                  `request-${requestId}-${day}-${cursor}.json`,
                )
              }
            >
              Xuất chi tiết JSON
            </Button>
          </div>
          <ResourceState resource={resource}>
            {data && (
              <>
                <ol
                  className="admin-event-list"
                  aria-label="Chuỗi sự kiện request"
                >
                  {data.items.map((event, index) => (
                    <li key={`${cursor}:${index}`}>
                      <h3>{event.event || "Sự kiện"}</h3>
                      <p>
                        {date(event.timestamp)} ·{" "}
                        {[
                          event.provider,
                          event.model || event.imageModel,
                          event.transport,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {event.truncated && (
                        <p role="status">
                          Nội dung dài đã được rút gọn trong bản xem này.
                        </p>
                      )}
                      {event.parts?.map((part, partIndex) => (
                        <section
                          className="admin-log-part"
                          key={partIndex}
                          aria-label={`Phần đầu vào ${part.index ?? partIndex}`}
                        >
                          <h4>
                            Phần {part.index ?? partIndex} ·{" "}
                            {part.type === "text"
                              ? "Prompt / văn bản"
                              : part.type === "image"
                                ? "Ảnh"
                                : part.type || "Dữ liệu"}
                          </h4>
                          {part.type === "text" && (
                            <pre className="admin-prompt" tabIndex={0}>
                              {part.text || "(Trống)"}
                            </pre>
                          )}
                          {part.type === "image" && (
                            <p>
                              {part.mimeType || "Ảnh"} · {bytes(part.bytes)}
                              {part.archiveUnavailable
                                ? " · Không có bản lưu ảnh"
                                : ""}
                            </p>
                          )}
                          {part.sha256 && (
                            <p className="admin-mono">SHA-256: {part.sha256}</p>
                          )}
                        </section>
                      ))}
                      <details
                        open={
                          !!event.error || /fail|error/i.test(event.event || "")
                        }
                      >
                        <summary>Thông số & phản hồi chi tiết</summary>
                        <pre className="admin-json" tabIndex={0}>
                          {JSON.stringify(
                            Object.fromEntries(
                              Object.entries(event).filter(
                                ([key]) => key !== "parts",
                              ),
                            ),
                            null,
                            2,
                          )}
                        </pre>
                      </details>
                    </li>
                  ))}
                </ol>
                {!data.items.length && (
                  <p role="status">
                    Chưa tìm thấy sự kiện trong phần log này. Có thể log đã hết
                    hạn lưu; bấm Đọc tiếp nếu còn dữ liệu.
                  </p>
                )}
                <div className="admin-pagination">
                  <span>
                    Đã quét {count(data.scanned)} dòng
                    {data.malformed
                      ? ` · ${data.malformed} dòng không đọc được`
                      : ""}
                  </span>
                  <div>
                    <Button
                      variant="outline"
                      disabled={!cursor}
                      onClick={() => setCursor(0)}
                    >
                      Về đầu chuỗi
                    </Button>
                    <Button
                      variant="outline"
                      disabled={data.nextCursor === null}
                      onClick={() => setCursor(data.nextCursor!)}
                    >
                      Đọc tiếp sự kiện
                    </Button>
                  </div>
                </div>
              </>
            )}
          </ResourceState>
        </>
      )}
    </div>
  );
}

function AuditLogs() {
  const [mode, setMode] = useState("actions");
  const [page, setPage] = useState(1);
  const [cursor, setCursor] = useState(0);
  const [filters, setFilters] = useState({
    day: new Date().toISOString().slice(0, 10),
    search: "",
    errorsOnly: false,
    source: "api",
  });
  const [selected, setSelected] = useState<Record<string, unknown>>();
  const url =
    mode === "actions"
      ? `/admin/audit?page=${page}&search=${encodeURIComponent(filters.search)}`
      : `/admin/diagnostics?${new URLSearchParams({ day: filters.day, source: filters.source, search: filters.search, errorsOnly: String(filters.errorsOnly), cursor: String(cursor) })}`;
  const resource = useAdminResource<PageResult<AdminAudit> | DiagnosticPage>(
    url,
  );
  const data = resource.data;
  const exportPage = () =>
    saveBlob(
      new Blob(
        [
          JSON.stringify(
            { exportedAt: new Date().toISOString(), mode, filters, ...data },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
      `lcg-audit-${mode}-${filters.day}.json`,
    );
  return (
    <>
      <div className="admin-section-title">
        <div>
          <h2>Mọi thay đổi đều có dấu vết</h2>
          <p>
            Tra cứu thao tác quản trị và request. Mở chi tiết để xem prompt,
            thông tin ảnh, phản hồi model và nguyên nhân lỗi.
          </p>
        </div>
        <div className="admin-inline-actions">
          <Refresh {...resource} />
          <Button
            size="sm"
            variant="outline"
            disabled={!data || resource.loading}
            onClick={exportPage}
          >
            <Download size={15} aria-hidden="true" />
            Xuất trang JSON
          </Button>
        </div>
      </div>
      <div className="admin-switcher" role="group" aria-label="Loại nhật ký">
        {[
          { value: "actions", label: "Lịch sử quản trị" },
          { value: "requests", label: "Request & lỗi hệ thống" },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={mode === option.value}
            onClick={() => {
              setMode(option.value);
              setFilters((current) => ({ ...current, search: "" }));
              setPage(1);
              setCursor(0);
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
      <form
        className="admin-filters"
        onSubmit={(event) => {
          event.preventDefault();
          const f = new FormData(event.currentTarget);
          setFilters({
            day: String(f.get("day") || filters.day),
            search: String(f.get("search") || ""),
            errorsOnly: f.get("errorsOnly") === "on",
            source: String(f.get("source") || filters.source),
          });
          setPage(1);
          setCursor(0);
        }}
      >
        <label>
          {mode === "actions" ? "Tìm thao tác" : "Tìm request ID / lỗi"}
          <input
            type="search"
            name="search"
            key={mode}
            maxLength={254}
            placeholder={
              mode === "actions"
                ? "Ví dụ: account.disabled"
                : "Request ID, mã lỗi hoặc đường dẫn"
            }
          />
        </label>
        {mode === "requests" && (
          <>
            <label htmlFor="admin-log-source">
              Nguồn log
              <StudioSelect
                id="admin-log-source"
                aria-label="Nguồn log"
                name="source"
                defaultValue={filters.source}
              >
                <option value="api">API</option>
                <option value="worker">Worker xử lý tác vụ</option>
              </StudioSelect>
            </label>
            <label>
              Ngày log (UTC)
              <input
                type="date"
                name="day"
                defaultValue={filters.day}
                required
              />
            </label>
            <label className="admin-checkbox">
              <input
                type="checkbox"
                name="errorsOnly"
                defaultChecked={filters.errorsOnly}
              />
              Chỉ lỗi & cảnh báo
            </label>
          </>
        )}
        <Button variant="outline" type="submit">
          Tìm nhật ký
        </Button>
      </form>
      <ResourceState resource={resource}>
        {data && (
          <>
            <div
              className="admin-table-scroll"
              role="region"
              aria-label="Nhật ký vận hành"
              tabIndex={0}
            >
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Sự kiện</th>
                    <th>
                      {mode === "actions" ? "Người thao tác" : "Request ID"}
                    </th>
                    <th>Kết quả</th>
                    <th>
                      <span className="sr-only">Chi tiết</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((raw, index) => {
                    const row = raw as unknown as Diagnostic;
                    return (
                      <tr key={String(row.id || index)}>
                        <td>
                          {date(String(row.createdAt || row.timestamp || ""))}
                        </td>
                        <td>
                          <strong>
                            {actions[String(row.action)] ||
                              row.action ||
                              row.event}
                          </strong>
                          <small>{String(row.target || row.path || "")}</small>
                        </td>
                        <td
                          className={
                            mode === "requests" ? "admin-mono" : undefined
                          }
                        >
                          {row.actorEmail || row.requestId || "—"}
                        </td>
                        <td>
                          {row.outcome ? (
                            <Badge value={String(row.outcome)} />
                          ) : (
                            <span>
                              {row.status || row.code || "—"}
                              {row.durationMs !== undefined
                                ? ` · ${row.durationMs}ms`
                                : ""}
                            </span>
                          )}
                        </td>
                        <td>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setSelected(
                                raw as unknown as Record<string, unknown>,
                              )
                            }
                          >
                            Chi tiết
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!data.items.length && (
                <p className="admin-empty">
                  Không có nhật ký phù hợp. Thử ngày khác hoặc bỏ bộ lọc.
                </p>
              )}
            </div>
            {"total" in data ? (
              <Pagination {...data} setPage={setPage} busy={resource.loading} />
            ) : (
              <div className="admin-pagination">
                <span>
                  Đã quét {count(data.scanned)} dòng
                  {data.malformed
                    ? ` · ${data.malformed} dòng không đọc được`
                    : ""}
                </span>
                <div>
                  <Button
                    variant="outline"
                    disabled={cursor === 0 || resource.loading}
                    onClick={() => setCursor(0)}
                  >
                    Về đầu
                  </Button>
                  <Button
                    variant="outline"
                    disabled={data.nextCursor === null || resource.loading}
                    onClick={() => setCursor(data.nextCursor!)}
                  >
                    Đọc tiếp
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </ResourceState>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(undefined);
        }}
      >
        <DialogContent className="admin-dialog admin-wide-dialog">
          <DialogHeader>
            <DialogTitle>Chi tiết nhật ký</DialogTitle>
            <DialogDescription>
              Metadata đã lọc để đối chiếu vận hành. Trạng thái chưa xác định
              cần kiểm tra dữ liệu thực tế trước khi làm lại.
            </DialogDescription>
          </DialogHeader>
          {mode === "requests" && selected ? (
            <RequestLogDetails
              key={`${filters.source}:${filters.day}:${selected.requestId}`}
              selected={selected}
              day={filters.day}
              source={filters.source}
            />
          ) : (
            <pre className="admin-json" tabIndex={0}>
              {JSON.stringify(selected, null, 2)}
            </pre>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function SettingsForm({
  data,
  reload,
}: {
  data: AdminSettings;
  reload: () => void;
}) {
  const [settings, setSettings] = useState<CompanySettings>(data.company);
  const [domains, setDomains] = useState(
    data.company.googleAllowedDomains.join("\n"),
  );
  const [action, setAction] = useState<Action | null>(null);
  return (
    <>
      <form
        className="admin-settings-grid"
        onSubmit={(event) => {
          event.preventDefault();
          const allowed = domains
            .split(/[\s,]+/)
            .map((domain) => domain.trim().toLowerCase())
            .filter(Boolean);
          setAction({
            title: "Lưu cấu hình vận hành",
            description:
              "Áp dụng trên toàn công ty. Domain Google mới được kiểm tra ở lần đăng nhập tiếp theo; phiên đã cấp vẫn còn hiệu lực đến khi hết hạn hoặc được thu hồi.",
            work: (reason) =>
              agentClient.patch("/admin/settings", {
                updatedAt: settings.updatedAt,
                name: settings.name,
                googleAllowedDomains: allowed,
                googleAutoProvision: settings.googleAutoProvision,
                queuePaused: settings.queuePaused,
                reason,
              }),
          });
        }}
      >
        <section className="admin-panel admin-form">
          <div className="admin-panel-heading">
            <div>
              <h3>Thông tin workspace</h3>
              <p>Cấu hình dùng chung trong công ty</p>
            </div>
            <Settings2 size={19} aria-hidden="true" />
          </div>
          <label>
            Tên công ty
            <input
              required
              minLength={2}
              maxLength={100}
              value={settings.name}
              onChange={(event) =>
                setSettings({ ...settings, name: event.target.value })
              }
            />
          </label>
          <hr />
          <h3>Đăng nhập & quyền truy cập</h3>
          <p className="admin-note">
            Google{" "}
            {data.runtime.googleConfigured
              ? "đã có Client ID"
              : "chưa được kết nối Client ID"}
            . Email công ty cần thuộc Google Workspace và khớp domain được phép.
          </p>
          <label>
            Domain được phép đăng nhập Google
            <textarea
              rows={5}
              aria-label="Domain được phép đăng nhập Google"
              aria-describedby="admin-google-domains-help"
              value={domains}
              onChange={(event) => setDomains(event.target.value)}
              placeholder="lcgmedia.uk"
            />
            <small id="admin-google-domains-help">
              Mỗi dòng một domain, không thêm @ hoặc wildcard. Để trống sẽ tắt
              đăng nhập Google. Danh sách này lưu trong MongoDB và có hiệu lực
              ngay cho lần đăng nhập tiếp theo, không cần sửa .env hay deploy
              lại.
            </small>
          </label>
          <label className="admin-checkbox">
            <input
              type="checkbox"
              checked={settings.googleAutoProvision}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  googleAutoProvision: event.target.checked,
                })
              }
            />
            Tự cấp tài khoản Designer khi email Google hợp lệ
          </label>
          <p className="admin-note">
            Tắt tùy chọn trên để chỉ các tài khoản đã được quản trị viên tạo mới
            có thể đăng nhập.
          </p>
        </section>
        <section className="admin-panel admin-form">
          <div className="admin-panel-heading">
            <div>
              <h3>Hàng đợi xử lý</h3>
              <p>Kiểm soát việc gửi tác vụ AI mới</p>
            </div>
            <Pause size={19} aria-hidden="true" />
          </div>
          <label className="admin-checkbox">
            <input
              type="checkbox"
              checked={settings.queuePaused}
              onChange={(event) =>
                setSettings({ ...settings, queuePaused: event.target.checked })
              }
            />
            Tạm dừng lấy tác vụ mới từ hàng đợi
          </label>
          <p className="admin-note">
            Áp dụng cho mọi worker dùng chung MongoDB. Request đã gửi đến
            provider vẫn có thể hoàn tất. Tắt tạm dừng để tiếp tục hàng đợi.
          </p>
          <dl className="admin-definition">
            <div>
              <dt>Worker được cấu hình</dt>
              <dd>{data.runtime.workerEnabled ? "Bật" : "Tắt"}</dd>
            </div>
            <div>
              <dt>Số tác vụ đồng thời tối đa</dt>
              <dd>{data.runtime.concurrency}</dd>
            </div>
            <div>
              <dt>Thời hạn phiên</dt>
              <dd>{data.runtime.sessionHours} giờ</dd>
            </div>
          </dl>
          <hr />
          <h3>Nhật ký & bảo vệ dữ liệu</h3>
          <dl className="admin-definition">
            <div>
              <dt>Giữ nhật ký request</dt>
              <dd>{data.runtime.logRetentionDays} ngày</dd>
            </div>
            <div>
              <dt>Giới hạn ảnh chẩn đoán / ngày</dt>
              <dd>{bytes(data.runtime.logImageLimitBytes)}</dd>
            </div>
            <div>
              <dt>Mã hóa tài sản Agent</dt>
              <dd>
                {data.runtime.assetEncryption ? "Đã cấu hình" : "Chưa cấu hình"}
              </dd>
            </div>
            <div>
              <dt>Thư mục lưu trữ</dt>
              <dd>{data.runtime.storagePrefix}</dd>
            </div>
          </dl>
          <p className="admin-note">
            Giới hạn worker, lưu log và khóa truy cập được quản lý trong cấu
            hình triển khai; không hiển thị bí mật trên trình duyệt.
          </p>
        </section>
        <section className="admin-panel admin-settings-span">
          <h3>Kết nối AI đã cấu hình</h3>
          <p className="admin-note">
            Trạng thái cấu hình, không phải kiểm tra uptime trực tiếp và không
            gửi request AI tính phí.
          </p>
          <div className="admin-provider-list">
            {data.runtime.providers.providers.map((provider) => (
              <div key={provider.id}>
                <strong>
                  {provider.id === "shopaikey"
                    ? "Provider 1"
                    : provider.id === "gemini"
                      ? "Provider 2"
                      : "Provider xử lý text"}
                </strong>
                <Badge value={provider.available ? "active" : "disabled"} />
                <span>{provider.capabilities.join(" · ")}</span>
              </div>
            ))}
          </div>
        </section>
        <div className="admin-settings-save">
          <span>Thay đổi chỉ được áp dụng sau khi xác nhận lưu.</span>
          <Button type="submit">Lưu thay đổi</Button>
        </div>
      </form>
      <ConfirmAction
        key={action?.title || "none"}
        action={action}
        close={() => setAction(null)}
        onDone={reload}
      />
    </>
  );
}
function Settings() {
  const resource = useAdminResource<AdminSettings>("/admin/settings");
  return (
    <>
      <div className="admin-section-title">
        <div>
          <h2>Vận hành theo cách của công ty</h2>
          <p>Quyền truy cập, hàng đợi và cấu hình bảo vệ dữ liệu.</p>
        </div>
        <Refresh {...resource} />
      </div>
      <ResourceState resource={resource}>
        {resource.data && (
          <SettingsForm
            key={resource.data.company.updatedAt}
            data={resource.data}
            reload={resource.reload}
          />
        )}
      </ResourceState>
      <BudgetPolicyPanel />
    </>
  );
}
export default function AdminPage({
  user,
  page,
  onNavigate,
}: {
  user: AgentUser;
  page: string;
  onNavigate: (page: string) => void;
}) {
  if (user.role !== "admin")
    return (
      <section className="admin-page">
        <div className="admin-placeholder">
          <LockKeyhole aria-hidden="true" />
          <h1>Bạn không có quyền quản trị</h1>
          <p>Liên hệ quản trị viên để được cấp quyền phù hợp.</p>
          <Button onClick={() => onNavigate("studio")}>Về Studio</Button>
        </div>
      </section>
    );
  return (
    <section className="admin-page">
      <header className="admin-hero">
        <div>
          <span className="admin-eyebrow">
            <ShieldCheck size={14} aria-hidden="true" />
            LCG MEDIA · ADMINISTRATION
          </span>
          <h1>Quản trị công ty</h1>
          <p>Tài khoản, ngân sách, nhật ký và thiết lập hệ thống.</p>
        </div>
        <div className="admin-access">
          <ShieldCheck size={17} aria-hidden="true" />
          <strong>Quyền quản trị</strong>
        </div>
      </header>
      <nav className="admin-tabs" aria-label="Điều hướng quản trị">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-current={page === id ? "page" : undefined}
            onClick={() => onNavigate(id)}
          >
            <Icon size={17} aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>
      <div className="admin-content">
        {page === "admin" && <Overview onNavigate={onNavigate} />}
        {page === "admin-users" && <Accounts user={user} />}
        {page === "admin-runs" && <Runs />}
        {page === "admin-audit" && <AuditLogs />}
        {page === "admin-settings" && <Settings />}
      </div>
    </section>
  );
}
