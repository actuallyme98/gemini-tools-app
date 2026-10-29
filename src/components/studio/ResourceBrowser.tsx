import { StudioSkeleton } from "./StudioSkeleton";
import { StudioSelect } from "../ui/StudioSelect";
import { useEffect, useState, type ReactNode } from "react";
import {
  studioClient,
  type StudioTeam,
  type StudioResource,
  type StudioPage,
} from "../../services/studio.service";
import { getErrorMessage } from "../../services/api.service";
import { Button } from "../ui/button";
export function ResourceBrowser({
  teams,
  refreshToken,
  children,
}: {
  teams: StudioTeam[];
  refreshToken: unknown;
  children: (items: StudioResource[]) => ReactNode;
}) {
  const [teamId, setTeam] = useState(teams[0]?.id ?? ""),
    [type, setType] = useState(""),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [retry, setRetry] = useState(0);
  const [result, setResult] = useState<StudioPage<StudioResource>>(),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!teamId) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      teamId,
      page: String(page),
      q: query.trim(),
    });
    if (type) params.set("type", type);
    const timer = setTimeout(() => {
      setLoading(true);
      void studioClient
        .get<StudioPage<StudioResource>>(
          `/resources?${params}`,
          controller.signal,
        )
        .then((value) => {
          if (!controller.signal.aborted) {
            setResult(value);
            setError("");
          }
        })
        .catch((cause) => {
          if (!controller.signal.aborted) setError(getErrorMessage(cause));
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [teamId, type, query, page, retry, refreshToken]);
  return (
    <section className="studio-gallery-section">
      <h2>Thư viện đã lưu</h2>
      <div className="studio-form-grid">
        <label htmlFor="library-team">
          Nhóm trong thư viện
          <StudioSelect
            id="library-team"
            value={teamId}
            onChange={(e) => {
              setTeam(e.target.value);
              setPage(1);
            }}
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </StudioSelect>
        </label>
        <label htmlFor="library-type">
          Lọc loại nội dung
          <StudioSelect
            id="library-type"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả</option>
            <option value="product">Sản phẩm</option>
            <option value="skill">Bộ hướng dẫn</option>
            <option value="thumbnail">Mẫu ảnh chính</option>
            <option value="scene">Bối cảnh</option>
          </StudioSelect>
        </label>
        <label htmlFor="library-query">
          Tìm theo tên hoặc mã
          <input
            id="library-query"
            value={query}
            maxLength={100}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </label>
      </div>
      {error && (
        <p className="studio-error" role="alert">
          {error}
          <Button variant="outline" onClick={() => setRetry((v) => v + 1)}>
            Tải lại thư viện
          </Button>
        </p>
      )}
      {loading && !result && (
        <StudioSkeleton variant="gallery" label="Đang tìm trong thư viện…" />
      )}
      {result
        ? children(result.items)
        : !loading && <p>Chọn nhóm để xem thư viện.</p>}
      {result && !loading && (
        <footer className="studio-pagination">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage((v) => v - 1)}
          >
            Trang thư viện trước
          </Button>
          <span>
            Trang {page} · {result.total} mục
          </span>
          <Button
            variant="outline"
            disabled={page * result.limit >= result.total}
            onClick={() => setPage((v) => v + 1)}
          >
            Trang thư viện sau
          </Button>
        </footer>
      )}
    </section>
  );
}
