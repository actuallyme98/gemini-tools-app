import { useState } from "react";
import {
  agentClient,
  agentUpload,
  type Asset,
  type MockupTemplate,
  type Point,
} from "../../services/agent.service";
import { notifyApiError } from "../../utils/api-error-toast";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { AgentImage } from "./AgentImage";

const positions = ["Trên trái", "Trên phải", "Dưới phải", "Dưới trái"];
const field = "w-full min-w-0 rounded-md border bg-white p-2 text-sm";
export function TemplateEditor({
  assets,
  onSaved,
  initial,
}: {
  assets: Asset[];
  onSaved: () => Promise<void>;
  initial?: MockupTemplate;
}) {
  const [assetId, setAssetId] = useState(initial?.assetId ?? "");
  const [uploaded, setUploaded] = useState<Asset>();
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "T-shirt");
  const [corners, setCorners] = useState<Point[]>(
    initial?.corners ?? [
      { x: 0.25, y: 0.25 },
      { x: 0.75, y: 0.25 },
      { x: 0.75, y: 0.75 },
      { x: 0.25, y: 0.75 },
    ],
  );
  const [corner, setCorner] = useState<number | null>(null);
  const [opacity, setOpacity] = useState(initial?.opacity ?? 1);
  const [blend, setBlend] = useState(initial?.blend ?? "over");
  const [mask, setMask] = useState(initial?.maskAssetId ?? "");
  const [overlay, setOverlay] = useState(initial?.overlayAssetId ?? "");
  const [busy, setBusy] = useState(false);
  const base =
    uploaded?.id === assetId
      ? uploaded
      : assets.find((asset) => asset.id === assetId);
  const upload = async (
    file: File | undefined,
    kind: "base" | "mask" | "overlay",
  ) => {
    if (!file) return;
    setBusy(true);
    try {
      const asset = await agentUpload(file, "template", category);
      if (kind === "base") {
        setUploaded(asset);
        setAssetId(asset.id);
      } else if (kind === "mask") setMask(asset.id);
      else setOverlay(asset.id);
      await onSaved();
    } catch (cause) {
      notifyApiError(cause);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      className="space-y-4 rounded-xl border bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        void agentClient
          .post("/templates", {
            name,
            category,
            assetId,
            corners,
            opacity,
            blend,
            ...(mask ? { maskAssetId: mask } : {}),
            ...(overlay ? { overlayAssetId: overlay } : {}),
          })
          .then(async () => {
            await onSaved();
            toast.success("Đã lưu template.");
          })
          .catch((cause) => notifyApiError(cause))
          .finally(() => setBusy(false));
      }}
    >
      <h3 className="font-semibold">
        {initial ? "Lưu cấu hình thành template mới" : "Tạo template mockup"}
      </h3>
      <p className="text-sm text-gray-600">
        Vùng in dùng để ghép file thiết kế, giữ tỉ lệ và nội dung gốc. Mỗi lần
        lưu tạo một cấu hình riêng; tác vụ đã chạy giữ cấu hình cũ.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Tên template
          <input
            className={field}
            required
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
          />
        </label>
        <label className="text-sm">
          Nhóm sản phẩm
          <input
            className={field}
            required
            maxLength={100}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={busy}
          />
        </label>
        <label className="text-sm">
          Ảnh template có sẵn
          <select
            className={field}
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            disabled={busy}
          >
            <option value="">Chọn ảnh</option>
            {assets
              .filter(
                (asset) =>
                  asset.kind === "template" || asset.kind === "reference",
              )
              .map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                </option>
              ))}
            {uploaded && !assets.some((asset) => asset.id === uploaded.id) && (
              <option value={uploaded.id}>{uploaded.name}</option>
            )}
          </select>
        </label>
        <label className="text-sm">
          Hoặc tải template (tối đa 4 MP)
          <input
            className={field}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={busy}
            onChange={(e) => {
              void upload(e.target.files?.[0], "base");
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {base && (
        <div>
          <p className="mb-2 text-sm text-gray-600">
            Chọn một góc bên dưới rồi bấm vị trí trên ảnh, hoặc nhập tọa độ phần
            trăm.
          </p>
          <div
            className="relative mx-auto max-w-lg overflow-hidden rounded-lg border"
            style={{ aspectRatio: `${base.width}/${base.height}` }}
          >
            <AgentImage
              id={base.id}
              name={base.name}
              className="h-full w-full"
            />
            <button
              type="button"
              className={`absolute inset-0 h-full w-full ${corner !== null ? "cursor-crosshair" : ""}`}
              aria-label={
                corner === null
                  ? "Ảnh xem trước vùng in"
                  : `Đặt góc ${positions[corner]}`
              }
              disabled={corner === null || busy}
              onClick={(event) => {
                if (corner === null) return;
                const rect = event.currentTarget.getBoundingClientRect();
                const point = {
                  x: Math.max(
                    0,
                    Math.min(1, (event.clientX - rect.left) / rect.width),
                  ),
                  y: Math.max(
                    0,
                    Math.min(1, (event.clientY - rect.top) / rect.height),
                  ),
                };
                setCorners((current) =>
                  current.map((value, index) =>
                    index === corner ? point : value,
                  ),
                );
                setCorner(corner < 3 ? corner + 1 : null);
              }}
            >
              <svg
                viewBox="0 0 1000 1000"
                preserveAspectRatio="none"
                className="h-full w-full"
                aria-hidden="true"
              >
                <polygon
                  points={corners
                    .map((p) => `${p.x * 1000},${p.y * 1000}`)
                    .join(" ")}
                  fill="#2563eb33"
                  stroke="#2563eb"
                  strokeWidth="5"
                />
                {corners.map((p, index) => (
                  <circle
                    key={index}
                    cx={p.x * 1000}
                    cy={p.y * 1000}
                    r="12"
                    fill={corner === index ? "#f97316" : "#2563eb"}
                  />
                ))}
              </svg>
            </button>
          </div>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {corners.map((p, index) => (
          <fieldset key={index} className="min-w-0 rounded-lg border p-2">
            <legend className="text-sm">{positions[index]}</legend>
            <Button
              type="button"
              variant={corner === index ? "secondary" : "outline"}
              size="sm"
              onClick={() => setCorner(corner === index ? null : index)}
              disabled={busy}
            >
              Đặt góc {index + 1} trên ảnh
            </Button>
            <div className="mt-2 flex gap-2">
              {(["x", "y"] as const).map((axis) => (
                <label key={axis} className="min-w-0 text-xs">
                  {axis.toUpperCase()} (%)
                  <input
                    className={field}
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                    value={Math.round(p[axis] * 1000) / 10}
                    disabled={busy}
                    onChange={(e) =>
                      setCorners((current) =>
                        current.map((value, i) =>
                          i === index
                            ? { ...value, [axis]: Number(e.target.value) / 100 }
                            : value,
                        ),
                      )
                    }
                  />
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Độ đậm thiết kế (%)
          <input
            className={field}
            type="number"
            min="5"
            max="100"
            value={Math.round(opacity * 100)}
            onChange={(e) => setOpacity(Number(e.target.value) / 100)}
            disabled={busy}
          />
        </label>
        <label className="text-sm">
          Cách hòa trộn
          <select
            className={field}
            value={blend}
            onChange={(e) => setBlend(e.target.value as "over" | "multiply")}
            disabled={busy}
          >
            <option value="over">Giữ màu thiết kế</option>
            <option value="multiply">Hòa ánh sáng với nền</option>
          </select>
        </label>
        <label className="text-sm">
          Mask vùng in: trắng hiện, đen ẩn
          <input
            className={field}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={busy}
            onChange={(e) => {
              void upload(e.target.files?.[0], "mask");
              e.target.value = "";
            }}
          />
          {mask && (
            <span>
              Đã chọn mask{" "}
              <button
                type="button"
                className="underline"
                onClick={() => setMask("")}
              >
                Bỏ mask
              </button>
            </span>
          )}
        </label>
        <label className="text-sm">
          Lớp phủ phía trước (PNG trong suốt)
          <input
            className={field}
            type="file"
            accept="image/png"
            disabled={busy}
            onChange={(e) => {
              void upload(e.target.files?.[0], "overlay");
              e.target.value = "";
            }}
          />
          {overlay && (
            <span>
              Đã chọn lớp phủ{" "}
              <button
                type="button"
                className="underline"
                onClick={() => setOverlay("")}
              >
                Bỏ lớp phủ
              </button>
            </span>
          )}
        </label>
      </div>
      <Button type="submit" disabled={busy || !assetId || !name.trim()}>
        {busy ? "Đang lưu…" : "Lưu template"}
      </Button>
    </form>
  );
}
