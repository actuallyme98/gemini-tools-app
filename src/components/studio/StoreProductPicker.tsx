import { useEffect, useState } from "react";
import {
  studioClient,
  type StudioPage,
  type StudioResource,
} from "../../services/studio.service";
import { getErrorMessage } from "../../services/api.service";
import { Button } from "../ui/button";
import { StudioSkeleton } from "./StudioSkeleton";
export function StoreProductPicker({
  teamId,
  value,
  onChange,
}: {
  teamId: string;
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [q, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [retry, setRetry] = useState(0);
  const key = JSON.stringify([teamId, q, page]);
  const [result, setResult] = useState<{
      key: string;
      data: StudioPage<StudioResource>;
    }>(),
    [error, setError] = useState<{ key: string; message: string }>();
  useEffect(() => {
    if (!teamId) return;
    const abort = new AbortController(),
      timer = setTimeout(() => {
        const params = new URLSearchParams({
          teamId,
          type: "product",
          status: "approved",
          q,
          page: String(page),
        });
        void studioClient
          .get<StudioPage<StudioResource>>(`/resources?${params}`, abort.signal)
          .then((data) => {
            if (!abort.signal.aborted) {
              setResult({ key, data });
              setError(undefined);
            }
          })
          .catch((cause) => {
            if (!abort.signal.aborted)
              setError({ key, message: getErrorMessage(cause) });
          });
      }, 150);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [teamId, q, page, key, retry]);
  const current = result?.key === key ? result.data : undefined,
    message = error?.key === key ? error.message : undefined;
  return (
    <div className="management-product-picker">
      <div className="management-selection-caption">
        <small>{value.length} sản phẩm đã chọn</small>
        {!!value.length && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange([])}
          >
            Bỏ chọn tất cả
          </Button>
        )}
      </div>
      <label htmlFor="store-product-search">
        Tìm sản phẩm
        <input
          id="store-product-search"
          value={q}
          placeholder="Tên hoặc mã sản phẩm…"
          maxLength={100}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
      </label>
      {message ? (
        <p className="studio-error" role="alert">
          {message}
          <Button
            type="button"
            variant="outline"
            onClick={() => setRetry((v) => v + 1)}
          >
            Thử lại
          </Button>
        </p>
      ) : !teamId ? (
        <small>Chọn nhóm trước khi thêm sản phẩm.</small>
      ) : !current ? (
        <StudioSkeleton variant="list" label="Đang tải sản phẩm…" />
      ) : current.items.length ? (
        current.items.map((item) => (
          <label className="studio-check" key={item.id}>
            <input
              type="checkbox"
              checked={value.includes(item.id)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...new Set([...value, item.id])]
                    : value.filter((id) => id !== item.id),
                )
              }
            />
            {item.code} · {item.name}
          </label>
        ))
      ) : (
        <small>Chưa có sản phẩm đã duyệt phù hợp.</small>
      )}
      {current && current.total > current.limit && (
        <div className="studio-action-row">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage((v) => v - 1)}
          >
            Sản phẩm trước
          </Button>
          <small>Trang {page}</small>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page * current.limit >= current.total}
            onClick={() => setPage((v) => v + 1)}
          >
            Sản phẩm sau
          </Button>
        </div>
      )}
    </div>
  );
}
