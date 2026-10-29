import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import {
  ArrowRight,
  Check,
  Clock3,
  Download,
  FolderHeart,
  Lightbulb,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  agentClient,
  authorizeAgent,
  readAgentToken,
  setAgentToken,
  type AgentAuthStatus,
  type AgentLogin,
  type AgentUser,
} from "../services/agent.service";
import {
  studioClient,
  studioLabels,
  studioNavigate,
  exportStudioImages,
  type StudioBootstrap,
  type StudioIdea,
  type StudioPage as PageResult,
  type StudioReview,
} from "../services/studio.service";
import { getErrorMessage } from "../services/api.service";
import { notifyApiError } from "../utils/api-error-toast";
import { StudioShell } from "../components/studio/StudioShell";
import { StudioImage } from "../components/studio/StudioImage";
import { IdeaWizard } from "../components/studio/IdeaWizard";
import { IdeaDetail } from "../components/studio/IdeaDetail";
import { MockupStudio } from "../components/studio/MockupStudio";
import { StudioManagement } from "../components/studio/StudioManagement";
import { StudioDashboard } from "../components/studio/StudioDashboard";
import { StudioGuideVisuals } from "../components/studio/StudioGuideVisuals";
import { GoogleSignIn } from "../components/agent/GoogleSignIn";
import { Button } from "../components/ui/button";
import "../styles/studio.css";

const subscribeHash = (listener: () => void) => {
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
};
const currentHash = () => window.location.hash;

function IdeaList({
  data,
  dashboard = false,
}: {
  data: StudioBootstrap;
  dashboard?: boolean;
}) {
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PageResult<StudioIdea>>();
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void studioClient
      .get<PageResult<StudioIdea>>(
        `/ideas?page=${page}${filter ? `&state=${filter}` : ""}`,
        controller.signal,
      )
      .then((value) => {
        setResult(value);
        setError("");
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(getErrorMessage(cause));
      });
    return () => controller.abort();
  }, [page, filter, retry]);
  const ready = result?.page === page;
  return (
    <div>
      {dashboard ? (
        <>
          <header className="studio-welcome">
            <span className="studio-eyebrow">
              TỪ Ý TƯỞNG ĐẾN BỘ ẢNH SẢN PHẨM
            </span>
            <h1>
              Một nơi cho cả
              <br />
              <em>quy trình sáng tạo.</em>
            </h1>
            <p>
              Bạn chọn hướng đi. Cùng Leader chốt đầu vào.
              <br />
              Agent xử lý nền, cả nhóm kiểm tra và sử dụng kết quả.
            </p>
            <Button onClick={() => studioNavigate("studio-new")}>
              <Plus size={18} />
              Tạo ý tưởng đầu tiên của bạn
            </Button>
            <div className="studio-welcome-decoration" aria-hidden="true">
              <div>
                <Sparkles size={54} />
              </div>
              <span>IDEA → DESIGN → MOCKUP</span>
            </div>
          </header>
          <article className="studio-note">
            <Clock3 size={23} aria-hidden="true" />
            <strong>
              {data.schedulerEnabled
                ? `Lịch tự động lúc ${data.schedule?.dailyTime ?? "22:00"}`
                : "Lịch tự động chưa bật"}
            </strong>
            <p>
              {data.schedulerEnabled
                ? "Một lần chọn chỉ chạy một lần. Các ảnh đã hoàn tất được giữ lại."
                : "Quản trị cần bật và kiểm chứng lịch trước khi nhận lô chạy đêm."}
            </p>
            <span>Giờ Việt Nam · UTC+7</span>
          </article>
          <StudioDashboard
            onPending={() => {
              setFilter("pending");
              setPage(1);
            }}
          />
        </>
      ) : (
        <header className="studio-page-heading">
          <div>
            <span className="studio-eyebrow">IDEA BOARD</span>
            <h1>Ý tưởng của nhóm</h1>
            <p>Chuẩn bị, duyệt và theo dõi bộ thiết kế trong cùng một hồ sơ.</p>
          </div>
          <Button onClick={() => studioNavigate("studio-new")}>
            <Plus size={17} />
            Tạo ý tưởng
          </Button>
        </header>
      )}
      <section>
        <header className="studio-list-heading">
          <h2>{dashboard ? "Công việc gần đây" : "Danh sách ý tưởng"}</h2>
          <div className="studio-action-row">
            <label className="sr-only" htmlFor="idea-state-filter">
              Lọc trạng thái ý tưởng
            </label>
            <select
              id="idea-state-filter"
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả trạng thái</option>
              {["draft", "pending", "changes_requested", "approved"].map(
                (state) => (
                  <option key={state} value={state}>
                    {studioLabels[state]}
                  </option>
                ),
              )}
            </select>
            <Button
              variant="outline"
              size="icon"
              aria-label="Tải lại ý tưởng"
              onClick={() => setRetry((value) => value + 1)}
            >
              <RefreshCw size={17} />
            </Button>
          </div>
        </header>
        {error ? (
          <div className="studio-card studio-error" role="alert">
            <p>{error}</p>
            <Button onClick={() => setRetry((value) => value + 1)}>
              Thử lại
            </Button>
          </div>
        ) : !ready ? (
          <p role="status">Đang tải danh sách…</p>
        ) : result.items.length === 0 ? (
          <div className="studio-card studio-empty">
            <Lightbulb size={34} aria-hidden="true" />
            <h3>
              {filter
                ? "Chưa có ý tưởng ở trạng thái này"
                : "Ý tưởng mới bắt đầu từ đây"}
            </h3>
            <p>
              Thêm ảnh tham khảo và yêu cầu phát triển, sau đó gửi Leader duyệt.
            </p>
            {!filter && (
              <Button onClick={() => studioNavigate("studio-new")}>
                Tạo ý tưởng
              </Button>
            )}
          </div>
        ) : (
          <div className="studio-idea-grid">
            {result.items.map((idea) => (
              <button
                className="studio-card studio-idea-card"
                key={idea.id}
                onClick={() => studioNavigate("studio-ideas", idea.id)}
              >
                <StudioImage id={idea.input.sourceId} name={idea.input.title} />
                <div>
                  <span className={`studio-status state-${idea.state}`}>
                    {studioLabels[idea.state]}
                  </span>
                  <h3>{idea.input.title}</h3>
                  <p>
                    {
                      data.stores.find((shop) => shop.id === idea.input.storeId)
                        ?.name
                    }{" "}
                    · {idea.input.count} mẫu
                  </p>
                  <small>
                    Cập nhật{" "}
                    {new Date(idea.updatedAt).toLocaleDateString("vi-VN", {
                      timeZone: "Asia/Ho_Chi_Minh",
                    })}
                  </small>
                </div>
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
        <footer className="studio-pagination">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Trang trước
          </Button>
          <span>
            Trang {page}
            {result ? ` · ${result.total} ý tưởng` : ""}
          </span>
          <Button
            variant="outline"
            disabled={!result || page * result.limit >= result.total}
            onClick={() => setPage(page + 1)}
          >
            Trang sau
          </Button>
        </footer>
      </section>
    </div>
  );
}
function Outputs() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PageResult<StudioReview>>();
  const [selected, setSelected] = useState<string[]>([]);
  const [format, setFormat] = useState<"png" | "jpg">("png");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void studioClient
      .get<PageResult<StudioReview>>(`/outputs?page=${page}`, controller.signal)
      .then(setData)
      .catch((cause) => {
        if (!controller.signal.aborted) setError(getErrorMessage(cause));
      });
    return () => controller.abort();
  }, [page]);
  return (
    <div>
      <header className="studio-page-heading">
        <div>
          <span className="studio-eyebrow">SẴN SÀNG ĐỂ SỬ DỤNG</span>
          <h1>Thành phẩm đã duyệt</h1>
          <p>
            Chỉ những ảnh được kiểm tra và đánh dấu đạt mới xuất hiện tại đây.
          </p>
        </div>
        <div className="studio-action-row">
          <label className="sr-only" htmlFor="studio-export-format">
            Định dạng tải ảnh
          </label>
          <select
            id="studio-export-format"
            value={format}
            onChange={(event) => setFormat(event.target.value as "png" | "jpg")}
          >
            <option value="png">PNG</option>
            <option value="jpg">JPG</option>
          </select>
          <Button
            disabled={busy || !selected.length}
            onClick={() => {
              setBusy(true);
              void exportStudioImages(
                (data?.items ?? []).filter((item) =>
                  selected.includes(item.id),
                ),
                format,
              )
                .then(() => toast.success("Đã chuẩn bị bộ ảnh tải xuống."))
                .catch(notifyApiError)
                .finally(() => setBusy(false));
            }}
          >
            <Download size={17} />
            Tải {selected.length || ""} ảnh
          </Button>
        </div>
      </header>
      {error && (
        <p className="studio-error" role="alert">
          {error}
        </p>
      )}
      {!data ? (
        <p role="status">Đang tải thành phẩm…</p>
      ) : !data.items.length ? (
        <div className="studio-card studio-empty">
          <FolderHeart size={34} />
          <h2>Chưa có ảnh đã duyệt</h2>
          <p>
            Mở một ý tưởng đã tạo ảnh, kiểm tra và chọn “Đạt” để đưa vào thành
            phẩm.
          </p>
        </div>
      ) : (
        <div className="studio-gallery">
          {data.items.map((item) => (
            <article className="studio-card studio-result" key={item.id}>
              <StudioImage id={item.assetId} name="Thành phẩm đã duyệt" />
              <label className="studio-check">
                <input
                  type="checkbox"
                  checked={selected.includes(item.id)}
                  onChange={(event) =>
                    setSelected((current) =>
                      event.target.checked
                        ? [...current, item.id]
                        : current.filter((id) => id !== item.id),
                    )
                  }
                />
                <Check size={16} aria-hidden="true" />
                Ảnh đã duyệt
              </label>
            </article>
          ))}
        </div>
      )}
      <footer className="studio-pagination">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => {
            setSelected([]);
            setPage(page - 1);
          }}
        >
          Trang trước
        </Button>
        <span>Trang {page}</span>
        <Button
          variant="outline"
          disabled={!data || data.total <= page * data.limit}
          onClick={() => {
            setSelected([]);
            setPage(page + 1);
          }}
        >
          Trang sau
        </Button>
      </footer>
    </div>
  );
}
function StudioGuide() {
  return (
    <div>
      <header className="studio-page-heading">
        <div>
          <span className="studio-eyebrow">LÀM QUEN TRONG VÀI PHÚT</span>
          <h1>Từ ảnh tham khảo đến bộ thành phẩm</h1>
          <p>Bạn không cần viết câu lệnh kỹ thuật để bắt đầu.</p>
        </div>
      </header>
      <StudioGuideVisuals />
      <div className="studio-guide-grid">
        {[
          [
            "01",
            "Chuẩn bị không gian",
            "Quản trị tạo nhóm, thêm Leader và nhân viên; khai báo sản phẩm, quy chuẩn pixel/DPI/nền theo nhà in, bộ hướng dẫn đã duyệt và mẫu ảnh chính; cấp cửa hàng cho nhân viên. Dữ liệu không tự chia sẻ sang nhóm khác.",
          ],
          [
            "02",
            "Tạo và gửi ý tưởng",
            "Vào Ý tưởng → Tạo ý tưởng. Chọn cửa hàng và sản phẩm, thêm ảnh tham khảo, chọn bộ hướng dẫn và mẫu ảnh chính, nhập yêu cầu. Kiểm tra bốn bước rồi gửi Leader duyệt.",
          ],
          [
            "03",
            "Duyệt và chạy nền",
            "Leader duyệt hoặc yêu cầu bổ sung. Agent phân tích ảnh, lưu nhận xét và lập brief riêng từng mẫu trước khi tạo ảnh. Có thể tạo thử vài mẫu rồi xác nhận phần còn lại; ảnh và brief đã có không chạy lại. Lượt theo lịch tự tạo đủ tổng đã duyệt. Admin đổi giờ ở Quản lý → Vận hành lịch (mặc định 22:00 UTC+7); lượt đã lên lịch giữ giờ đã chốt.",
          ],
          [
            "04",
            "Tạo bộ mockup phụ",
            "Trong Gallery, chọn ảnh đã Đạt → Tạo mockup từ các thiết kế. Hoặc vào Tạo mockup và tải ảnh ngoài. Chọn bối cảnh, nhập màu vật liệu nếu cần rồi Áp dụng cho tất cả nguồn; có thể chỉnh riêng từng nguồn. Kiểm tra tổng số ảnh trước khi tạo. Bộ ảnh lưu trên server, không cần giữ tab mở.",
          ],
          [
            "05",
            "Kiểm tra, chọn và tải",
            "Kết quả xuất hiện riêng từng mẫu. Nếu bật artwork riêng, kiểm tra và duyệt artwork độc lập với ảnh sản phẩm. Artwork thiếu nền trong suốt hoặc sai quy chuẩn sẽ bị chặn duyệt. Kiểm tra chữ, tỉ lệ, màu và watermark; chọn Đạt hoặc Cần sửa. File đã duyệt nằm trong Thành phẩm; tải PNG/JPG trong ZIP kèm thông tin nguồn. DPI không tự đảm bảo chất lượng in.",
          ],
        ].map(([index, title, text]) => (
          <section className="studio-card" key={index}>
            <span className="studio-guide-number">{index}</span>
            <h2>{title}</h2>
            <p>{text}</p>
          </section>
        ))}
      </div>
      <section className="studio-card">
        <h2>Phân biệt ba loại ảnh</h2>
        <dl className="studio-summary">
          <div>
            <dt>Ảnh ý tưởng tham khảo</dt>
            <dd>Nội dung đầu vào để Agent phát triển thiết kế.</dd>
          </div>
          <div>
            <dt>Mẫu ảnh chính</dt>
            <dd>
              Hình học và cách trình bày sản phẩm của cửa hàng, áp dụng theo bộ
              hướng dẫn.
            </dd>
          </div>
          <div>
            <dt>Ảnh mockup phụ</dt>
            <dd>
              Bối cảnh bổ sung dùng để giới thiệu sản phẩm sau khi đã chọn thiết
              kế.
            </dd>
          </div>
        </dl>
        <h3>Khi có lỗi</h3>
        <p>
          Lỗi của từng ảnh được giữ ngay trên công việc. “Cần đối soát” nghĩa là
          request có thể đã được gửi và tính phí: không tạo lại liên tục, hãy
          liên hệ quản trị kiểm tra. Lỡ lịch chỉ được quản trị chạy bù. Dừng chỉ
          ngăn phần chưa gửi đến AI.
        </p>
        <p>
          Hội thoại và công việc cũ được giữ trong “Lịch sử & trợ lý cũ”. Chưa
          tự chuyển dữ liệu cá nhân cũ thành dữ liệu dùng chung của nhóm.
        </p>
      </section>
    </div>
  );
}
export default function StudioPage({ page }: { page: string }) {
  const hash = useSyncExternalStore(subscribeHash, currentHash);
  const ideaId = new URLSearchParams(hash.split("?")[1] ?? "").get("id") ?? "";
  const [user, setUser] = useState<AgentUser>();
  const [status, setStatus] = useState<AgentAuthStatus>();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<StudioBootstrap>();
  const [retry, setRetry] = useState(0);
  const [editing, setEditing] = useState<StudioIdea>();
  useEffect(() => {
    const controller = new AbortController();
    void agentClient
      .get<AgentAuthStatus>("/auth/status", { signal: controller.signal })
      .then(async ({ data: config }) => {
        setStatus(config);
        if (readAgentToken()) {
          const result = await agentClient.get<AgentUser>("/auth/me", {
            signal: controller.signal,
          });
          setUser(result.data);
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted && cause?.response?.status !== 401)
          setError(getErrorMessage(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setChecking(false);
      });
    const expire = () => {
      setUser(undefined);
      setData(undefined);
      setEditing(undefined);
      setPassword("");
    };
    window.addEventListener("agent-session-expired", expire);
    return () => {
      controller.abort();
      window.removeEventListener("agent-session-expired", expire);
    };
  }, []);
  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    void studioClient
      .get<StudioBootstrap>("/bootstrap", controller.signal)
      .then((result) => {
        setData(result);
        setError("");
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(getErrorMessage(cause));
      });
    return () => controller.abort();
  }, [user, retry, page]);
  useEffect(() => {
    if (page !== "studio-new" || !ideaId || !user) return;
    const controller = new AbortController();
    void studioClient
      .get<{ idea: StudioIdea }>(`/ideas/${ideaId}`, controller.signal)
      .then(({ idea }) => setEditing(idea))
      .catch((cause) => {
        if (!controller.signal.aborted) notifyApiError(cause);
      });
    return () => controller.abort();
  }, [page, ideaId, user]);
  async function login(path: string, input: unknown) {
    setBusy(true);
    try {
      const result = (await agentClient.post<AgentLogin>(path, input)).data;
      setAgentToken(result.token);
      authorizeAgent(result.token);
      setUser(result.user);
      setPassword("");
      setError("");
    } catch (cause) {
      setError(getErrorMessage(cause));
      notifyApiError(cause);
    } finally {
      setBusy(false);
    }
  }
  function logout() {
    void agentClient.post("/auth/logout").catch(() => undefined);
    setAgentToken(null);
    authorizeAgent(null);
    setUser(undefined);
    setData(undefined);
    setEditing(undefined);
    setPassword("");
  }
  if (checking)
    return (
      <main className="studio-login-root">
        <p role="status">
          <Loader2 className="animate-spin" size={22} />
          Đang kiểm tra phiên đăng nhập…
        </p>
      </main>
    );
  if (!user)
    return (
      <main className="studio-login-root">
        <div className="studio-login-story">
          <span className="studio-eyebrow">LCG CREATIVE STUDIO</span>
          <Sparkles size={42} aria-hidden="true" />
          <h1>
            Ý tưởng của bạn.
            <br />
            <em>Thành phẩm của cả nhóm.</em>
          </h1>
          <p>
            Một không gian để chuẩn bị ý tưởng, duyệt công việc và để Agent xử
            lý nền.
          </p>
          <ol>
            <li>Chọn ảnh và cách phát triển</li>
            <li>Cùng Leader duyệt đầu vào</li>
            <li>Kiểm tra và nhận bộ ảnh</li>
          </ol>
        </div>
        <form
          className="studio-login-form studio-card"
          onSubmit={(event) => {
            event.preventDefault();
            void login("/auth/login", { email, password });
          }}
        >
          <span className="studio-eyebrow">CHÀO MỪNG TRỞ LẠI</span>
          <h2>Đăng nhập không gian làm việc</h2>
          <p>Dùng tài khoản công ty đã được quản trị cấp.</p>
          {status?.enabled && !status.setupRequired ? (
            <>
              <label htmlFor="studio-email">
                Email
                <input
                  id="studio-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="username"
                  required
                />
              </label>
              <label htmlFor="studio-password">
                Mật khẩu
                <input
                  id="studio-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </label>
              <Button disabled={busy}>
                {busy && <Loader2 className="animate-spin" size={17} />}Đăng
                nhập
              </Button>
              {status.google?.enabled && status.google.clientId && (
                <GoogleSignIn
                  clientId={status.google.clientId}
                  allowedDomains={status.google.allowedDomains}
                  busy={busy}
                  onCredential={(credential, nonce) =>
                    login("/auth/google", { credential, nonce })
                  }
                />
              )}
            </>
          ) : (
            <p role="alert">
              {status?.setupRequired
                ? "Quản trị viên cần tạo tài khoản đầu tiên trên máy chủ."
                : "Không gian làm việc chưa sẵn sàng. Liên hệ quản trị viên."}
            </p>
          )}
          {error && (
            <p className="studio-error" role="alert">
              {error}
            </p>
          )}
        </form>
      </main>
    );
  return (
    <StudioShell user={user} page={page} onLogout={logout}>
      {error ? (
        <section className="studio-card studio-error" role="alert">
          <h1>Chưa tải được Studio</h1>
          <p>{error}</p>
          <Button onClick={() => setRetry((value) => value + 1)}>
            Thử lại
          </Button>
          <a href="#agent">Mở dữ liệu & lịch sử cũ</a>
        </section>
      ) : !data ? (
        <p role="status">Đang tải không gian làm việc…</p>
      ) : (
        <Suspense fallback={<p role="status">Đang tải…</p>}>
          {page === "studio-new" ? (
            !data.stores.length ? (
              <section className="studio-card studio-empty">
                <h1>Chưa có cửa hàng được cấp</h1>
                <p>
                  {user.role === "admin"
                    ? "Tạo nhóm, sản phẩm, bộ hướng dẫn và cửa hàng trong mục Quản lý trước khi tạo ý tưởng."
                    : "Liên hệ Leader hoặc quản trị viên để được cấp cửa hàng."}
                </p>
                {user.role === "admin" && (
                  <Button onClick={() => studioNavigate("studio-manage")}>
                    Thiết lập không gian
                  </Button>
                )}
              </section>
            ) : ideaId && editing?.id !== ideaId ? (
              <p role="status">Đang mở bản nháp…</p>
            ) : (
              <IdeaWizard
                key={ideaId || "new"}
                data={data}
                user={user}
                existing={ideaId ? editing : undefined}
              />
            )
          ) : page === "studio-ideas" ? (
            ideaId ? (
              <IdeaDetail key={ideaId} id={ideaId} data={data} user={user} />
            ) : (
              <IdeaList data={data} />
            )
          ) : page === "studio-mockups" ? (
            <MockupStudio
              key={hash}
              data={data}
              id={ideaId || undefined}
              from={
                new URLSearchParams(hash.split("?")[1]).get("from") || undefined
              }
              selection={
                new URLSearchParams(hash.split("?")[1]).get("selected") ||
                undefined
              }
            />
          ) : page === "studio-outputs" ? (
            <Outputs />
          ) : page === "studio-manage" ? (
            user.role === "admin" ? (
              <StudioManagement
                data={data}
                onRefresh={() => setRetry((value) => value + 1)}
              />
            ) : (
              <section className="studio-card">
                <h1>Khu vực quản trị</h1>
                <p>Bạn chưa được cấp quyền quản trị.</p>
              </section>
            )
          ) : page === "studio-guide" ? (
            <StudioGuide />
          ) : (
            <IdeaList data={data} dashboard />
          )}
        </Suspense>
      )}
    </StudioShell>
  );
}
