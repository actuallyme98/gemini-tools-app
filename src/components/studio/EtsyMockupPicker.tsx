import { useEffect, useState } from "react";
import { Search, Images } from "lucide-react";
import {
  studioClient,
  type StudioPage,
  type StudioResource,
} from "../../services/studio.service";
import { getErrorMessage } from "../../services/api.service";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "../ui/dialog";
import { StudioImage } from "./StudioImage";
import { StudioSkeleton } from "./StudioSkeleton";
export function EtsyMockupPicker({
  teamId,
  selected,
  onToggle,
  onResolve,
}: {
  teamId: string;
  selected: string[];
  onToggle: (id: string, checked: boolean) => void;
  onResolve: (resource: StudioResource) => void;
}) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [retry, setRetry] = useState(0);
  const [result, setResult] = useState<StudioPage<StudioResource>>(),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (!open || !teamId) return;
    const abort = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({
        teamId,
        type: "scene",
        status: "approved",
        page: String(page),
        q: query.trim(),
      });
      void studioClient
        .get<StudioPage<StudioResource>>(`/resources?${params}`, abort.signal)
        .then((value) => {
          if (!abort.signal.aborted) setResult(value);
        })
        .catch((cause) => {
          if (!abort.signal.aborted) setError(getErrorMessage(cause));
        })
        .finally(() => {
          if (!abort.signal.aborted) setLoading(false);
        });
    }, 150);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [open, teamId, query, page, retry]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={!teamId}>
          <Images size={17} />
          Chọn ảnh mẫu từ Etsy Library
        </Button>
      </DialogTrigger>
      <DialogContent className="studio-etsy-dialog">
        <DialogHeader>
          <DialogTitle>Etsy Library · Mẫu mockup</DialogTitle>
          <DialogDescription>
            Chọn nhiều ảnh mẫu đã được quản trị viên upload và duyệt. Mỗi mẫu là
            một ảnh tham chiếu để ghép sản phẩm nguồn vào; không lấy ảnh trực
            tiếp từ Etsy.
          </DialogDescription>
        </DialogHeader>
        <label htmlFor="etsy-search" className="studio-etsy-search">
          <Search size={16} aria-hidden="true" />
          Tìm ảnh mẫu
          <input
            id="etsy-search"
            value={query}
            maxLength={100}
            placeholder="Tên hoặc mã bộ mẫu…"
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
              setResult(undefined);
            }}
          />
        </label>
        <div className="studio-etsy-results">
          {error ? (
            <p className="studio-error" role="alert">
              {error}
              <Button variant="outline" onClick={() => setRetry((v) => v + 1)}>
                Thử lại
              </Button>
            </p>
          ) : loading || !result ? (
            <StudioSkeleton variant="gallery" label="Đang tải mẫu mockup…" />
          ) : result.items.length ? (
            <div className="studio-etsy-grid">
              {result.items.map((item) => (
                <label
                  key={item.id}
                  className="studio-scene-choice studio-card"
                >
                  <StudioImage id={item.assetId ?? ""} name={item.name} />
                  <span className="studio-check">
                    <input
                      type="checkbox"
                      aria-label={item.name}
                      checked={selected.includes(item.id)}
                      onChange={(e) => {
                        onResolve(item);
                        onToggle(item.id, e.target.checked);
                      }}
                    />
                    {item.name}
                  </span>
                  <small>{item.code}</small>
                </label>
              ))}
            </div>
          ) : (
            <div className="studio-empty">
              <Images size={28} />
              <strong>Chưa có ảnh mẫu phù hợp</strong>
              <p>
                Admin thêm ảnh mockup mẫu tại Quản lý → Thư viện → Mẫu mockup
                Etsy, sau đó duyệt để nhân viên sử dụng.
              </p>
            </div>
          )}
        </div>
        <footer className="studio-action-row">
          <Button
            variant="outline"
            disabled={page === 1 || loading}
            onClick={() => {
              setPage((v) => v - 1);
              setResult(undefined);
            }}
          >
            Trang trước
          </Button>
          <small>
            Trang {page} · {result?.total ?? 0} mẫu
          </small>
          <Button
            variant="outline"
            disabled={loading || !result || page * result.limit >= result.total}
            onClick={() => {
              setPage((v) => v + 1);
              setResult(undefined);
            }}
          >
            Trang sau
          </Button>
          <Button onClick={() => setOpen(false)}>Xong</Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
