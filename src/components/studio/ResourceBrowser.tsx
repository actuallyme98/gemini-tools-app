import { StudioSkeleton } from "./StudioSkeleton";
import { StudioSelect } from "../ui/StudioSelect";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import { StudioNotice } from "./StudioNotice";
import {
  FileArchive,
  FolderOpen,
  Image,
  Layers3,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import {
  studioClient,
  type StudioTeam,
  type StudioResource,
  type StudioPage,
} from "../../services/studio.service";
import { getErrorMessage } from "../../services/api.service";
import { Button } from "../ui/button";
const categories = [
  { id: "", label: "Tất cả", icon: FolderOpen },
  { id: "product", label: "Sản phẩm", icon: Layers3 },
  { id: "skill", label: "Bộ hướng dẫn", icon: FileArchive },
  { id: "thumbnail", label: "Mẫu ảnh chính", icon: Image },
  { id: "scene", label: "Mockup Etsy", icon: Image },
];
export function ResourceBrowser({
  teams,
  refreshToken,
  onCreate,
  children,
}: {
  teams: StudioTeam[];
  refreshToken: unknown;
  onCreate: (teamId: string, type: string) => void;
  children: (items: StudioResource[]) => ReactNode;
}) {
  const [params, setParams] = useSearchParams();
  const teamId = teams.some((t) => t.id === params.get("team"))
    ? params.get("team")!
    : (teams[0]?.id ?? "");
  const type = categories.some((c) => c.id === params.get("type"))
    ? params.get("type")!
    : "";
  const status = ["approved", "pending", "archived"].includes(
    params.get("status") ?? "",
  )
    ? params.get("status")!
    : "";
  const query = (params.get("q") ?? "").slice(0, 100);
  const number = Number(params.get("page") ?? 1),
    page =
      Number.isInteger(number) && number >= 1 && number <= 100000 ? number : 1;
  const [retry, setRetry] = useState(0),
    [loading, setLoading] = useState(false);
  const key = JSON.stringify([teamId, type, status, query.trim(), page]);
  const [result, setResult] = useState<{
    key: string;
    data: StudioPage<StudioResource>;
  }>();
  const [error, setError] = useState<{ key: string; message: string }>();
  function change(fields: Record<string, string>, replace = false) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries({
      ...fields,
      page: fields.page ?? "",
    }))
      if (value) next.set(key, value);
      else next.delete(key);
    setParams(next, { replace });
  }
  useEffect(() => {
    if (!teamId) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      const request = new URLSearchParams({
        teamId,
        page: String(page),
        q: query.trim(),
      });
      if (type) request.set("type", type);
      if (status) request.set("status", status);
      void studioClient
        .get<StudioPage<StudioResource>>(
          `/resources?${request}`,
          controller.signal,
        )
        .then((data) => {
          if (!controller.signal.aborted) {
            setResult({ key, data });
            setError(undefined);
          }
        })
        .catch((cause) => {
          if (!controller.signal.aborted)
            setError({ key, message: getErrorMessage(cause) });
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [teamId, type, status, query, page, key, retry, refreshToken]);
  const current = result?.key === key ? result.data : undefined,
    message = error?.key === key ? error.message : undefined;
  return (
    <section className="management-library">
      <header className="management-toolbar">
        <div>
          <h2>Thư viện tài nguyên</h2>
          <p>Những tài nguyên dùng chung để tạo ý tưởng và mockup.</p>
        </div>
        <Button
          disabled={!teamId}
          aria-describedby={!teamId ? "library-create-reason" : undefined}
          onClick={() => onCreate(teamId, type)}
        >
          <Plus size={16} />
          Thêm tài nguyên
        </Button>
      </header>
      {!teamId && (
        <StudioNotice
          id="library-create-reason"
          actions={
            <Link to="/manage/teams" className="studio-inline-link">
              Tạo nhóm đầu tiên →
            </Link>
          }
        >
          Tài nguyên cần thuộc một nhóm. Tạo nhóm để bật chức năng thêm vào thư
          viện.
        </StudioNotice>
      )}
      <div
        className="management-library-categories"
        role="group"
        aria-label="Loại tài nguyên"
      >
        {categories.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            aria-pressed={type === id}
            onClick={() => change({ type: id })}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className="management-library-toolbar">
        <label htmlFor="library-query" className="management-search">
          <Search size={17} aria-hidden="true" />
          <input
            id="library-query"
            aria-label="Tìm theo tên hoặc mã"
            value={query}
            placeholder="Tìm theo tên hoặc mã…"
            maxLength={100}
            onChange={(e) => change({ q: e.target.value }, true)}
          />
        </label>
        <label htmlFor="library-team">
          <span>Nhóm trong thư viện</span>
          <StudioSelect
            id="library-team"
            value={teamId}
            disabled={!teams.length}
            onChange={(e) => change({ team: e.target.value })}
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </StudioSelect>
        </label>
        <label htmlFor="library-status">
          <span>Trạng thái</span>
          <StudioSelect
            id="library-status"
            kind="status"
            value={status}
            onChange={(e) => change({ status: e.target.value })}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="archived">Đã lưu trữ</option>
          </StudioSelect>
        </label>
        <Button
          variant="outline"
          aria-label="Làm mới thư viện"
          disabled={loading}
          onClick={() => setRetry((v) => v + 1)}
        >
          <RefreshCw
            size={17}
            className={loading ? "animate-spin" : undefined}
          />
        </Button>
      </div>
      <div className="management-library-caption">
        <span>
          {!teamId
            ? "Chưa có nhóm"
            : message
              ? "Không tải được thư viện"
              : current
                ? `${current.total} tài nguyên`
                : "Đang tải thư viện…"}
          {loading && current ? " · Đang cập nhật…" : ""}
        </span>
        {(query || status) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => change({ q: "", status: "" })}
          >
            <X size={14} />
            Xóa bộ lọc
          </Button>
        )}
      </div>
      {message ? (
        <div className="management-empty" role="alert">
          <p>{message}</p>
          <Button variant="outline" onClick={() => setRetry((v) => v + 1)}>
            Tải lại thư viện
          </Button>
        </div>
      ) : !teamId ? (
        <div className="management-empty">
          <FolderOpen size={32} />
          <h3>Chưa có nhóm để lưu tài nguyên</h3>
          <p>Tạo nhóm trong Nhân sự & nhóm để bắt đầu.</p>
          <Link to="/manage/teams" className="studio-link-button">
            Tạo nhóm
          </Link>
        </div>
      ) : !current ? (
        <StudioSkeleton variant="gallery" label="Đang tải tài nguyên…" />
      ) : current.items.length ? (
        children(current.items)
      ) : (
        <div className="management-empty">
          <FolderOpen size={32} />
          <h3>
            {query || status
              ? "Không tìm thấy tài nguyên"
              : "Thư viện đang trống"}
          </h3>
          <p>
            {query || status
              ? "Thử tên, mã hoặc trạng thái khác."
              : "Thêm sản phẩm, bộ hướng dẫn hoặc ảnh mẫu để nhóm bắt đầu sáng tạo."}
          </p>
        </div>
      )}
      {current && !message && (
        <footer className="studio-pagination">
          <Button
            variant="outline"
            disabled={page === 1 || loading}
            onClick={() => change({ page: String(page - 1) })}
          >
            Trang thư viện trước
          </Button>
          <span>
            Trang {page} · {current.total} mục
          </span>
          <Button
            variant="outline"
            disabled={page * current.limit >= current.total || loading}
            onClick={() => change({ page: String(page + 1) })}
          >
            Trang thư viện sau
          </Button>
        </footer>
      )}
    </section>
  );
}
