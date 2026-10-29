import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { studioClient } from "../../services/studio.service";
import { notifyApiError } from "../../utils/api-error-toast";
import { Button } from "../ui/button";
import { StudioSelect } from "../ui/StudioSelect";
export type MockupBackground = { id: string; name: string; prompt: string };
export function MockupBackgrounds({
  storeId,
  productId,
  sources,
  values,
  onChange,
  selected,
  onToggle,
  busy,
  onBusy,
}: {
  storeId: string;
  productId: string;
  sources: { assetId: string; ticketId?: string; name: string }[];
  values: MockupBackground[];
  onChange: (values: MockupBackground[]) => void;
  selected: string[];
  onToggle: (id: string, checked: boolean) => void;
  busy: boolean;
  onBusy: (busy: boolean) => void;
}) {
  const [sourceId, setSource] = useState("");
  const [directions, setDirections] = useState("");
  const [count, setCount] = useState(3);
  const [generating, setGenerating] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const source = sources.find((s) => s.assetId === sourceId) ?? sources[0];
  async function generate() {
    if (!source || busy || values.length + count > 12) return;
    const abort = new AbortController();
    controller.current = abort;
    setGenerating(true);
    onBusy(true);
    try {
      const result = await studioClient.post<{
        suggestions: { title: string; prompt: string }[];
      }>(
        "/mockups/background-suggestions",
        {
          storeId,
          productId,
          source: {
            assetId: source.assetId,
            ...(source.ticketId ? { ticketId: source.ticketId } : {}),
          },
          count,
          directions,
        },
        abort.signal,
      );
      if (abort.signal.aborted) return;
      onChange([
        ...values,
        ...result.suggestions.map((s) => ({
          id: crypto.randomUUID(),
          name: s.title,
          prompt: s.prompt,
        })),
      ]);
      toast.success("Đã gợi ý nền. Sửa và tích chọn các prompt muốn tạo ảnh.");
    } catch (error) {
      if (!abort.signal.aborted) notifyApiError(error);
    } finally {
      if (!abort.signal.aborted) {
        setGenerating(false);
        onBusy(false);
      }
    }
  }
  return (
    <div className="studio-background-editor">
      <p className="studio-muted">
        Tạo nền mới từ ảnh nguồn, không cần ảnh tham chiếu. Giữ nguyên sản phẩm
        và thiết kế.
      </p>
      {sources.length > 1 && (
        <label htmlFor="background-analysis-source">
          Ảnh để AI phân tích
          <StudioSelect
            id="background-analysis-source"
            value={source?.assetId ?? ""}
            onChange={(e) => setSource(e.target.value)}
          >
            {sources.map((s) => (
              <option key={s.assetId} value={s.assetId}>
                {s.name}
              </option>
            ))}
          </StudioSelect>
        </label>
      )}
      <label htmlFor="background-directions">
        Mong muốn về nền <span className="studio-muted">(tùy chọn)</span>
        <textarea
          id="background-directions"
          rows={2}
          maxLength={2000}
          placeholder="Ví dụ: không gian Giáng sinh ấm áp, ánh sáng tự nhiên…"
          value={directions}
          onChange={(e) => setDirections(e.target.value)}
        />
      </label>
      <div className="studio-background-generate">
        <label htmlFor="background-count">
          Số gợi ý
          <StudioSelect
            id="background-count"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} nền
              </option>
            ))}
          </StudioSelect>
        </label>
        <Button
          variant="outline"
          onClick={() => void generate()}
          disabled={busy || !source || !productId || values.length + count > 12}
        >
          {generating ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <Sparkles size={16} />
          )}{" "}
          {generating ? "Đang gợi ý…" : "AI gợi ý nền"}
        </Button>
      </div>
      {!sources.length && (
        <small>Thêm ảnh nguồn ở bước 1 để AI gợi ý nền phù hợp.</small>
      )}
      <small className="studio-muted">
        Phân tích ảnh và gợi ý prompt có sử dụng hạn mức AI; chưa tạo ảnh.
      </small>
      <div className="studio-background-list">
        {values.map((value, index) => (
          <article className="studio-background-card" key={value.id}>
            <div className="studio-action-row">
              <label className="studio-check">
                <input
                  type="checkbox"
                  aria-label={`Chọn nền ${index + 1}`}
                  checked={selected.includes(value.id)}
                  onChange={(e) => onToggle(value.id, e.target.checked)}
                />
                Nền {index + 1}
              </label>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Xóa nền ${index + 1}`}
                onClick={() => {
                  onToggle(value.id, false);
                  onChange(values.filter((v) => v.id !== value.id));
                }}
              >
                <Trash2 size={15} />
              </Button>
            </div>
            <label htmlFor={`bg-name-${value.id}`}>
              Tên nền
              <input
                id={`bg-name-${value.id}`}
                maxLength={160}
                value={value.name}
                onChange={(e) =>
                  onChange(
                    values.map((v) =>
                      v.id === value.id ? { ...v, name: e.target.value } : v,
                    ),
                  )
                }
              />
            </label>
            <label htmlFor={`bg-prompt-${value.id}`}>
              Prompt nền
              <textarea
                id={`bg-prompt-${value.id}`}
                rows={4}
                maxLength={4000}
                value={value.prompt}
                onChange={(e) =>
                  onChange(
                    values.map((v) =>
                      v.id === value.id ? { ...v, prompt: e.target.value } : v,
                    ),
                  )
                }
              />
            </label>
          </article>
        ))}
      </div>
      <Button
        variant="ghost"
        disabled={busy || values.length >= 12}
        onClick={() =>
          onChange([
            ...values,
            {
              id: crypto.randomUUID(),
              name: `Nền tự viết ${values.length + 1}`,
              prompt: "",
            },
          ])
        }
      >
        <ImagePlus size={16} />
        Thêm nền tự viết
      </Button>
    </div>
  );
}
