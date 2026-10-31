import { StudioSelect } from "../ui/StudioSelect";
import { useEffect, useId, useState } from "react";
import {
  studioClient,
  type StudioPage,
  type StudioResource,
} from "../../services/studio.service";
import { getErrorMessage } from "../../services/api.service";
import { Button } from "../ui/button";
export function CatalogSelect({
  teamId,
  storeId,
  type,
  value,
  label,
  onChange,
  onResolve,
  readOnly = false,
  controlId,
}: {
  teamId: string;
  controlId?: string;
  storeId?: string;
  type: StudioResource["type"];
  value: string;
  label: string;
  onChange: (id: string) => void;
  onResolve: (resource: StudioResource) => void;
  readOnly?: boolean;
}) {
  const generatedId = useId();
  const id = controlId ?? generatedId,
    [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [retry, setRetry] = useState(0);
  const [items, setItems] = useState<StudioResource[]>([]),
    [total, setTotal] = useState(0),
    [chosen, setChosen] = useState<StudioResource>(),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!teamId) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams({
        teamId,
        type,
        page: String(page),
        q: query,
        status: "approved",
      });
      if (storeId) params.set("storeId", storeId);
      void studioClient
        .get<StudioPage<StudioResource>>(
          `/resources?${params}`,
          controller.signal,
        )
        .then(async (data) => {
          if (controller.signal.aborted) return;
          setItems(data.items);
          setTotal(data.total);
          setError("");
          if (value) {
            const current =
              data.items.find((r) => r.id === value) ??
              (await studioClient.get<StudioResource>(
                `/resources/${value}`,
                controller.signal,
              ));
            if (controller.signal.aborted) return;
            if (
              current.teamId === teamId &&
              current.type === type &&
              current.status === "approved"
            ) {
              setChosen(current);
              onResolve(current);
            }
          }
        })
        .catch((cause) => {
          if (!controller.signal.aborted) setError(getErrorMessage(cause));
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [teamId, storeId, type, query, page, value, retry, onResolve]);
  const options =
    chosen?.id === value && !items.some((r) => r.id === value)
      ? [chosen, ...items]
      : items;
  return (
    <div className="studio-catalog-select">
      <label htmlFor={id}>
        {label}
        <StudioSelect
          kind={
            type === "thumbnail"
              ? "thumbnail"
              : type === "scene"
                ? "scene"
                : type
          }
          id={id}
          value={value}
          required
          disabled={readOnly || !teamId || loading}
          onChange={(e) => {
            const item = options.find((r) => r.id === e.target.value);
            if (item) {
              setChosen(item);
              onResolve(item);
            }
            onChange(e.target.value);
          }}
        >
          <option value="">Chọn {label.toLowerCase()}</option>
          {options.map((r) => (
            <option key={r.id} value={r.id}>
              {r.code} · {r.name}
              {r.versionNumber ? ` · v${r.versionNumber}` : ""}
            </option>
          ))}
        </StudioSelect>
      </label>
      {!teamId && (
        <small className="studio-field-help">
          Chọn cửa hàng để tải danh mục.
        </small>
      )}
      {teamId && !loading && !options.length && !error && (
        <small className="studio-field-help">
          Chưa có mục phù hợp. Nhờ quản trị kiểm tra thư viện và quyền cửa hàng.
        </small>
      )}
      {!readOnly && teamId && (
        <details>
          <summary>Tìm trong thư viện</summary>
          <label htmlFor={`${id}-search`}>
            Tìm {label.toLowerCase()} theo tên hoặc mã
            <input
              id={`${id}-search`}
              value={query}
              maxLength={100}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <div className="studio-action-row">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page === 1 || loading}
              onClick={() => setPage((v) => v - 1)}
            >
              Trước
            </Button>
            <small>
              Trang {page} · {total} mục
            </small>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page * 24 >= total || loading}
              onClick={() => setPage((v) => v + 1)}
            >
              Sau
            </Button>
          </div>
        </details>
      )}
      {error && (
        <p className="studio-error" role="alert">
          {error}
          <Button
            type="button"
            variant="outline"
            onClick={() => setRetry((v) => v + 1)}
          >
            Tải lại lựa chọn
          </Button>
        </p>
      )}
    </div>
  );
}
