import { StudioSkeleton } from "./StudioSkeleton";
import { StudioSelect } from "../ui/StudioSelect";
import { useStudioNavigate } from "../../navigation";
import { useCallback, useContext, useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  Download,
  ImagePlus,
  Loader2,
  Plus,
  Square,
  Sparkles,
  Images,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AIProviderContext } from "../../context/ai-provider-context";
import { agentUpload } from "../../services/agent.service";
import { getErrorMessage } from "../../services/api.service";
import {
  studioClient,
  studioLabels,
  exportStudioImages,
  type StudioBootstrap,
  type StudioDetail,
  type StudioReview,
  type StudioPage,
  type StudioResource,
} from "../../services/studio.service";
import { notifyApiError } from "../../utils/api-error-toast";
import { StudioImage } from "./StudioImage";
import { Button } from "../ui/button";
import { CatalogSelect } from "./CatalogSelect";
import { EtsyMockupPicker } from "./EtsyMockupPicker";
import { MockupBackgrounds, type MockupBackground } from "./MockupBackgrounds";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
type Source = {
  assetId: string;
  name: string;
  ticketId?: string;
  sceneIds: string[];
  colors: string[];
};
type Job = {
  id: string;
  title: string;
  state: string;
  count: number;
  storeId: string;
  error?: string;
  product: { name: string };
  sources: { image: { id: string }; ticketId?: string }[];
  scenes: {
    id: string;
    name: string;
    kind?: "template" | "background";
    image?: { id: string };
  }[];
};
type Slot = {
  id: string;
  index: number;
  sourceIndex: number;
  sceneId: string;
  color: string;
  state: string;
  error?: string;
  errorCode?: string;
  resultId?: string;
  prompt: string;
  requestId: string;
};
type Detail = { job: Job; slots: Slot[]; reviews: StudioReview[] };
const safeCodes = [
  "TEAM_BUDGET_EXCEEDED",
  "USER_BUDGET_EXCEEDED",
  "BUDGET_PRICING_UNAVAILABLE",
  "TEAM_BUDGET_ACCESS_REVOKED",
  "STUDIO_ACCESS_REVOKED",
];
const parseColors = (value: string) => [
  ...new Set(
    value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
  ),
];

export function MockupStudio({
  data,
  id,
  from,
  selection,
}: {
  data: StudioBootstrap;
  id?: string;
  from?: string;
  selection?: string;
}) {
  const studioNavigate = useStudioNavigate();
  const ai = useContext(AIProviderContext)!;
  const [requestKey] = useState(() => crypto.randomUUID());
  const [sources, setSources] = useState<Source[]>([]);
  const [storeId, setStore] = useState(data.stores[0]?.id ?? "");
  const [productId, setProduct] = useState("");
  const [title, setTitle] = useState("Bộ ảnh mockup");
  const [sceneIds, setScenes] = useState<string[]>([]);
  const [colors, setColors] = useState("");
  const [backgrounds, setBackgrounds] = useState<MockupBackground[]>([]);
  const [sceneMode, setSceneMode] = useState<"template" | "background">(
    "template",
  );
  const [instructions, setInstructions] = useState("");
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<Detail>();
  const [recent, setRecent] = useState<StudioPage<Job>>();
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [format, setFormat] = useState<"png" | "jpg">("png");
  const [resolved, setResolved] = useState<Record<string, StudioResource>>({});
  const resolveResource = useCallback(
    (resource: StudioResource) =>
      setResolved((current) => ({ ...current, [resource.id]: resource })),
    [],
  );
  const resources = [
    ...new Map(
      [...data.resources, ...Object.values(resolved)].map((r) => [r.id, r]),
    ).values(),
  ];
  const shop = data.stores.find((s) => s.id === storeId);
  const products = resources.filter(
    (r) =>
      r.type === "product" &&
      r.status === "approved" &&
      shop?.productIds.includes(r.id),
  );
  const scenes = resources.filter(
    (r) =>
      r.type === "scene" &&
      r.status === "approved" &&
      r.teamId === shop?.teamId,
  );
  const choices = [
    ...scenes.map((s) => ({ id: s.id, name: s.name })),
    ...backgrounds,
  ];
  const invalidBackground = backgrounds.some(
    (b) =>
      sources.some((s) => s.sceneIds.includes(b.id)) &&
      (!b.name.trim() || b.prompt.trim().length < 10),
  );
  function toggleScene(id: string, checked: boolean) {
    if (checked && !sceneIds.includes(id) && sceneIds.length >= 12) {
      toast.error("Mỗi nguồn tối đa 12 bối cảnh.");
      return;
    }
    setScenes((current) =>
      checked
        ? [...new Set([...current, id])]
        : current.filter((v) => v !== id),
    );
  }
  function updateBackgrounds(next: MockupBackground[]) {
    const removed = backgrounds
      .filter((b) => !next.some((n) => n.id === b.id))
      .map((b) => b.id);
    if (removed.length) {
      setScenes((current) => current.filter((id) => !removed.includes(id)));
      setSources((current) =>
        current.map((s) => ({
          ...s,
          sceneIds: s.sceneIds.filter((id) => !removed.includes(id)),
        })),
      );
    }
    setBackgrounds(next);
  }
  const count = sources.reduce(
    (n, s) => n + s.sceneIds.length * s.colors.length,
    0,
  );
  useEffect(() => {
    const controller = new AbortController();
    const load = () => {
      if (id)
        void studioClient
          .get<Detail>(`/mockups/${id}`, controller.signal)
          .then((value) => {
            if (!controller.signal.aborted) {
              setDetail(value);
              setError("");
            }
          })
          .catch((cause) => {
            if (!controller.signal.aborted) setError(getErrorMessage(cause));
          });
      else
        void studioClient
          .get<StudioPage<Job>>(`/mockups?page=${page}`, controller.signal)
          .then((value) => {
            if (!controller.signal.aborted) {
              setRecent(value);
              setError("");
            }
          })
          .catch((cause) => {
            if (!controller.signal.aborted) setError(getErrorMessage(cause));
          });
    };
    load();
    const timer = id ? setInterval(load, 5000) : undefined;
    return () => {
      controller.abort();
      if (timer) clearInterval(timer);
    };
  }, [id, page, retry]);
  useEffect(() => {
    if (!from || id) return;
    const controller = new AbortController();
    void studioClient
      .get<StudioDetail>(`/ideas/${from}`, controller.signal)
      .then((value) => {
        if (controller.signal.aborted) return;
        const wanted = new Set((selection ?? "").split(","));
        const approved = value.reviews.filter(
          (r) => r.decision === "approved" && wanted.has(r.assetId),
        );
        if (approved.length !== wanted.size)
          throw new Error(
            "Một thiết kế đã đổi trạng thái duyệt. Hãy chọn lại trong Gallery.",
          );
        setStore(value.idea.input.storeId);
        setProduct(value.idea.input.productId);
        setSources(
          approved.map((r, index) => ({
            assetId: r.assetId,
            ticketId: r.ticketId,
            name: `Thiết kế ${index + 1}`,
            sceneIds: [],
            colors: [""],
          })),
        );
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(getErrorMessage(cause));
      });
    return () => controller.abort();
  }, [id, from, selection]);
  async function upload(files: FileList | null) {
    if (!files) return;
    if (files.length + sources.length > 12) {
      toast.error("Mỗi bộ tối đa 12 ảnh nguồn.");
      return;
    }
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const asset = await agentUpload(
          file,
          "source",
          products.find((p) => p.id === productId)?.name ?? "POD",
        );
        setSources((current) => [
          ...current,
          {
            assetId: asset.id,
            name: asset.name,
            sceneIds: [...sceneIds],
            colors: parseColors(colors).length ? parseColors(colors) : [""],
          },
        ]);
      }
    } catch (cause) {
      notifyApiError(cause);
    } finally {
      setBusy(false);
    }
  }
  function applyAll() {
    const values = parseColors(colors);
    setSources((current) =>
      current.map((s) => ({
        ...s,
        sceneIds: [...sceneIds],
        colors: values.length ? values : [""],
      })),
    );
    toast.success("Đã áp dụng bối cảnh và màu cho tất cả ảnh nguồn.");
  }
  async function create() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const job = await studioClient.post<Job>("/mockups", {
        requestKey,
        title,
        storeId,
        productId,
        sources: sources.map(({ assetId, ticketId, sceneIds, colors }) => ({
          assetId,
          ...(ticketId ? { ticketId } : {}),
          sceneIds,
          colors,
        })),
        provider: ai.provider,
        imageModel: model || ai.imageModel,
        instructions,
        ...(backgrounds.some((b) =>
          sources.some((s) => s.sceneIds.includes(b.id)),
        )
          ? {
              backgrounds: backgrounds.filter((b) =>
                sources.some((s) => s.sceneIds.includes(b.id)),
              ),
            }
          : {}),
      });
      studioNavigate("studio-mockups", job.id);
      toast.success("Đã lưu bộ mockup. Bạn có thể đóng tab.");
    } catch (cause) {
      setError(getErrorMessage(cause));
      notifyApiError(cause);
    } finally {
      setBusy(false);
    }
  }
  async function act(path: string, body: unknown = {}) {
    if (busy) return;
    setBusy(true);
    try {
      await studioClient.post(`/mockups/${id}/${path}`, body);
      setRetry((v) => v + 1);
      toast.success("Đã cập nhật bộ mockup.");
    } catch (cause) {
      notifyApiError(cause);
    } finally {
      setBusy(false);
    }
  }
  async function download() {
    if (!detail) return;
    setBusy(true);
    try {
      const items = detail.reviews.filter(
        (r) => r.decision === "approved" && selected.includes(r.assetId),
      );
      if (items.length !== selected.length)
        throw new Error("Lựa chọn đã thay đổi; chỉ tải ảnh đã duyệt.");
      await exportStudioImages(
        items.map((item) => {
          const slot = detail.slots.find((s) => s.resultId === item.assetId)!;
          return {
            ...item,
            sourceId: detail.job.sources[slot.sourceIndex].image.id,
            sceneId: slot.sceneId,
            color: slot.color,
            fileName: `source_${slot.sourceIndex + 1}_scene_${slot.sceneId.slice(0, 8)}_${slot.color || "original"}_${slot.index + 1}`,
          };
        }),
        format,
      );
      toast.success("Đã chuẩn bị bộ ảnh.");
    } catch (cause) {
      notifyApiError(cause);
    } finally {
      setBusy(false);
    }
  }
  if (id)
    return (
      <div className="studio-mockup">
        <button
          className="studio-back"
          onClick={() => studioNavigate("studio-mockups")}
        >
          <ArrowLeft size={16} /> Các bộ mockup
        </button>
        {error && (
          <p className="studio-error" role="alert">
            {error}
            <Button onClick={() => setRetry((v) => v + 1)}>Thử lại</Button>
          </p>
        )}
        {!detail ? (
          <StudioSkeleton variant="gallery" />
        ) : (
          <>
            <header className="studio-page-heading">
              <div>
                <span className="studio-eyebrow">MOCKUP THEO TEAM</span>
                <h1>{detail.job.title}</h1>
                <p>
                  {detail.job.product.name} · {detail.job.count} tổ hợp ·{" "}
                  {studioLabels[detail.job.state]}
                </p>
              </div>
              <div className="studio-action-row">
                {[
                  "queued",
                  "running",
                  "blocked",
                  "failed",
                  "partial_failed",
                ].includes(detail.job.state) && (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => void act("cancel")}
                  >
                    <Square size={16} /> Dừng phần chưa gửi
                  </Button>
                )}
                {["blocked", "failed", "partial_failed"].includes(
                  detail.job.state,
                ) &&
                  !detail.slots.some((s) =>
                    ["preparing", "submitted", "interrupted"].includes(s.state),
                  ) &&
                  (detail.job.state === "blocked" ||
                    detail.slots.some(
                      (s) =>
                        s.state === "queued" ||
                        (s.state === "failed" &&
                          safeCodes.includes(s.errorCode ?? "")),
                    )) && (
                    <Button
                      disabled={busy}
                      onClick={() => void act("continue")}
                    >
                      Tiếp tục phần chưa gửi
                    </Button>
                  )}
              </div>
            </header>
            <progress
              max={detail.job.count}
              value={detail.slots.filter((s) => s.state === "done").length}
              aria-label="Số ảnh mockup đã hoàn thành"
            />
            <p className="studio-note">
              Đầu vào đã chốt khi tạo bộ. Chỉ tạo tổ hợp còn thiếu; ảnh đã xong
              được giữ lại. Request chưa rõ kết quả cần quản trị viên đối soát.
              Ảnh cần được kiểm tra trước khi sử dụng.
            </p>
            {detail.job.error && (
              <p className="studio-error" role="alert">
                {detail.job.error}
              </p>
            )}
            {selected.length > 0 && (
              <div className="studio-action-row">
                <label htmlFor="mockup-format">
                  Định dạng
                  <StudioSelect
                    id="mockup-format"
                    value={format}
                    onChange={(e) => setFormat(e.target.value as "png" | "jpg")}
                  >
                    <option value="png">PNG</option>
                    <option value="jpg">JPG</option>
                  </StudioSelect>
                </label>
                <Button disabled={busy} onClick={() => void download()}>
                  <Download size={16} />
                  Tải {selected.length} ảnh đã duyệt
                </Button>
              </div>
            )}
            <div className="studio-gallery">
              {detail.slots.map((slot) => {
                const review = detail.reviews.find(
                  (r) => r.assetId === slot.resultId,
                );
                return (
                  <article className="studio-card studio-result" key={slot.id}>
                    {slot.resultId ? (
                      <StudioImage
                        id={slot.resultId}
                        name={`Kết quả mockup ${slot.index + 1}`}
                      />
                    ) : (
                      <div className="studio-pending-image">
                        <Loader2
                          className={
                            ["preparing", "submitted"].includes(slot.state)
                              ? "animate-spin"
                              : ""
                          }
                        />
                        <span>{studioLabels[slot.state]}</span>
                        {slot.error && (
                          <p className="studio-error" role="alert">
                            {slot.error}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="studio-result-body">
                      <strong>
                        Ảnh {slot.index + 1} ·{" "}
                        {
                          detail.job.scenes.find((s) => s.id === slot.sceneId)
                            ?.name
                        }
                      </strong>
                      <small>
                        Nguồn {slot.sourceIndex + 1} · {slot.color || "Màu gốc"}
                      </small>
                      <details>
                        <summary>Xem ảnh nguồn & bối cảnh</summary>
                        <div className="studio-input-pair">
                          <StudioImage
                            id={detail.job.sources[slot.sourceIndex].image.id}
                            name="Ảnh sản phẩm nguồn"
                          />
                          {detail.job.scenes.find((s) => s.id === slot.sceneId)
                            ?.kind !== "background" && (
                            <StudioImage
                              id={
                                detail.job.scenes.find(
                                  (s) => s.id === slot.sceneId,
                                )?.image?.id ?? ""
                              }
                              name="Bối cảnh đích"
                            />
                          )}
                        </div>
                        <p className="studio-prewrap">{slot.prompt}</p>
                        <small>Mã request: {slot.requestId}</small>
                      </details>
                      {slot.resultId && (
                        <>
                          <span className="studio-status">
                            {review
                              ? studioLabels[review.decision]
                              : "Chờ kiểm tra"}
                          </span>
                          <div className="studio-action-row">
                            <Button
                              size="sm"
                              variant={
                                review?.decision === "approved"
                                  ? "default"
                                  : "outline"
                              }
                              disabled={busy}
                              onClick={() =>
                                void act("review", {
                                  assetId: slot.resultId,
                                  decision: "approved",
                                  note: "",
                                })
                              }
                            >
                              <Check size={15} />
                              Đạt
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() =>
                                void act("review", {
                                  assetId: slot.resultId,
                                  decision: "changes_requested",
                                  note: "",
                                })
                              }
                            >
                              Cần sửa
                            </Button>
                          </div>
                          {review?.decision === "approved" && (
                            <label className="studio-check">
                              <input
                                type="checkbox"
                                checked={selected.includes(slot.resultId)}
                                onChange={(e) =>
                                  setSelected((current) =>
                                    e.target.checked
                                      ? [...current, slot.resultId!]
                                      : current.filter(
                                          (v) => v !== slot.resultId,
                                        ),
                                  )
                                }
                              />
                              Chọn để tải
                            </label>
                          )}
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  return (
    <div className="studio-mockup studio-mockup-workspace">
      <header className="studio-page-heading">
        <div>
          <span className="studio-eyebrow">TỪ THIẾT KẾ ĐẾN BỘ ẢNH</span>
          <h1>Tạo mockup</h1>
          <p>Ảnh nguồn → bối cảnh → bộ ảnh. Giữ nguyên thiết kế sản phẩm.</p>
        </div>
        <Button variant="outline" onClick={() => setHistoryOpen(true)}>
          Bộ ảnh đã lưu {recent ? `(${recent.total})` : ""}
        </Button>
      </header>
      {error && (
        <p className="studio-error" role="alert">
          {error}
        </p>
      )}
      <fieldset disabled={busy} className="studio-mockup-form">
        <section
          className="studio-card studio-form-grid studio-mockup-config"
          aria-label="Thông tin bộ mockup"
        >
          <label htmlFor="mockup-title">
            Tên bộ ảnh
            <input
              id="mockup-title"
              maxLength={160}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label htmlFor="mockup-store">
            Cửa hàng
            <StudioSelect
              id="mockup-store"
              kind="store"
              value={storeId}
              disabled={!!from || sources.length > 0}
              onChange={(e) => {
                setStore(e.target.value);
                setProduct("");
                setScenes([]);
              }}
            >
              <option value="">Chọn cửa hàng</option>
              {data.stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </StudioSelect>
          </label>
          <CatalogSelect
            teamId={shop?.teamId ?? ""}
            storeId={shop?.id}
            type="product"
            value={productId}
            label="Sản phẩm"
            onChange={setProduct}
            onResolve={resolveResource}
            readOnly={!!from}
          />
        </section>
        <div className="studio-mockup-columns">
          <section className="studio-card studio-mockup-source">
            <h2>1. Ảnh sản phẩm / thiết kế nguồn</h2>
            <p>Từ Gallery hoặc upload · tối đa 12 ảnh.</p>
            <div className="studio-action-row">
              <Button
                variant="outline"
                onClick={() => studioNavigate("studio-gallery")}
              >
                Chọn thiết kế trong Gallery
              </Button>
              <label className="studio-upload">
                <ImagePlus size={22} />
                Tải ảnh có sẵn
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  aria-label="Tải ảnh nguồn mockup"
                  className="sr-only"
                  onChange={(e) => {
                    void upload(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <div className="studio-gallery">
              {sources.map((source, index) => (
                <article className="studio-card" key={source.assetId}>
                  <StudioImage id={source.assetId} name={source.name} />
                  <strong>{source.name}</strong>
                  <p>
                    {source.sceneIds.length} bối cảnh × {source.colors.length}{" "}
                    màu
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setSources((current) =>
                        current.filter((_, i) => i !== index),
                      )
                    }
                  >
                    <X size={15} />
                    Bỏ nguồn này
                  </Button>
                  <details>
                    <summary>Chỉnh riêng nguồn {index + 1}</summary>
                    {choices.map((scene) => (
                      <label className="studio-check" key={scene.id}>
                        <input
                          type="checkbox"
                          checked={source.sceneIds.includes(scene.id)}
                          disabled={
                            !source.sceneIds.includes(scene.id) &&
                            source.sceneIds.length >= 12
                          }
                          onChange={(e) =>
                            setSources((current) =>
                              current.map((s, i) =>
                                i !== index
                                  ? s
                                  : {
                                      ...s,
                                      sceneIds: e.target.checked
                                        ? [...s.sceneIds, scene.id]
                                        : s.sceneIds.filter(
                                            (id) => id !== scene.id,
                                          ),
                                    },
                              ),
                            )
                          }
                        />
                        {scene.name}
                      </label>
                    ))}
                    <label htmlFor={`mockup-colors-${index}`}>
                      Màu riêng (phân cách dấu phẩy)
                      <input
                        id={`mockup-colors-${index}`}
                        value={source.colors.join(", ")}
                        onChange={(e) => {
                          const value = e.target.value
                            .split(",")
                            .map((v) => v.trim());
                          setSources((current) =>
                            current.map((s, i) =>
                              i !== index ? s : { ...s, colors: value },
                            ),
                          );
                        }}
                      />
                    </label>
                  </details>
                </article>
              ))}
            </div>
          </section>
          <section className="studio-card studio-mockup-scenes">
            <h2>2. Bối cảnh & màu</h2>
            <div
              className="studio-scene-mode"
              role="group"
              aria-label="Cách chọn bối cảnh"
            >
              <Button
                variant="outline"
                aria-pressed={sceneMode === "template"}
                onClick={() => setSceneMode("template")}
              >
                <Images size={16} />
                Mẫu Etsy
              </Button>
              <Button
                variant="outline"
                aria-pressed={sceneMode === "background"}
                onClick={() => setSceneMode("background")}
              >
                <Sparkles size={16} />
                AI đổi nền
              </Button>
            </div>
            {sceneMode === "template" ? (
              <>
                <p>
                  Giữ cảnh, người mẫu và ánh sáng của ảnh mẫu; thay sản
                  phẩm/thiết kế bằng ảnh nguồn.
                </p>
                <EtsyMockupPicker
                  teamId={shop?.teamId ?? ""}
                  selected={sceneIds}
                  onToggle={toggleScene}
                  onResolve={resolveResource}
                />
                <div className="studio-gallery">
                  {scenes
                    .filter(
                      (scene, index) =>
                        sceneIds.includes(scene.id) || index < 4,
                    )
                    .map((scene) => (
                      <label
                        className="studio-card studio-scene-choice"
                        key={scene.id}
                      >
                        <StudioImage
                          id={scene.assetId ?? ""}
                          name={scene.name}
                        />
                        <span className="studio-check">
                          <input
                            type="checkbox"
                            aria-label={scene.name}
                            checked={sceneIds.includes(scene.id)}
                            onChange={(e) =>
                              toggleScene(scene.id, e.target.checked)
                            }
                          />
                          {scene.name}
                        </span>
                      </label>
                    ))}
                </div>
                {!scenes.length && (
                  <p className="studio-note">
                    Chọn mẫu từ Etsy Library. Nếu thư viện còn trống, admin cần
                    upload và duyệt ảnh mẫu trước.
                  </p>
                )}
              </>
            ) : (
              <MockupBackgrounds
                storeId={storeId}
                productId={productId}
                sources={sources}
                values={backgrounds}
                onChange={updateBackgrounds}
                selected={sceneIds}
                onToggle={toggleScene}
                busy={busy}
                onBusy={setBusy}
              />
            )}
            <p className="studio-muted">
              Đã chọn {sceneIds.length} bối cảnh · Có thể kết hợp ảnh mẫu và nền
              AI trong cùng bộ. Bấm áp dụng để cập nhật các ảnh nguồn.
            </p>
            <label htmlFor="mockup-colors">
              Màu vật liệu sản phẩm (tùy chọn)
              <input
                id="mockup-colors"
                placeholder="Ví dụ: trắng, đen. Để trống giữ màu gốc."
                value={colors}
                onChange={(e) => setColors(e.target.value)}
              />
            </label>
            <Button
              variant="outline"
              onClick={applyAll}
              disabled={!sources.length || !sceneIds.length}
            >
              Áp dụng cho tất cả nguồn
            </Button>
          </section>
          <section className="studio-card studio-mockup-submit">
            <h2>3. Kiểm tra & tạo bộ ảnh</h2>
            <label htmlFor="mockup-instructions">
              Yêu cầu bổ sung
              <textarea
                id="mockup-instructions"
                maxLength={8000}
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </label>
            <details>
              <summary>Tùy chọn AI</summary>
              <label htmlFor="mockup-model">
                Model cho bộ ảnh
                <StudioSelect
                  id="mockup-model"
                  kind="model"
                  value={model || ai.imageModel || ""}
                  onChange={(e) => setModel(e.target.value)}
                >
                  <option value="">Chọn model</option>
                  {ai.imageModels?.models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </StudioSelect>
              </label>
            </details>
            <p>
              <strong>{count} ảnh sẽ được tạo</strong> từ {sources.length}{" "}
              nguồn. Tối đa 100 ảnh mỗi bộ.
            </p>
            <details>
              <summary>Chi phí & kiểm tra ảnh</summary>
              <p className="studio-note">
                Mỗi tổ hợp là một request tính phí, trong hạn mức cá nhân/Team.
                Kiểm tra thiết kế, chữ và watermark trước khi duyệt.
              </p>
            </details>
            {invalidBackground && (
              <p className="studio-note">
                Nhập tên và prompt ít nhất 10 ký tự cho các nền đang dùng.
              </p>
            )}
            <Button
              disabled={
                !title.trim() ||
                !productId ||
                !sources.length ||
                sources.some((s) => !s.sceneIds.length) ||
                invalidBackground ||
                count < 1 ||
                count > 100 ||
                !(model || ai.imageModel) ||
                ai.imageModelsLoading
              }
              onClick={() => void create()}
            >
              <Plus size={18} />
              Tạo {count} ảnh mockup
            </Button>
          </section>
        </div>
      </fieldset>
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="studio-history-dialog">
          <DialogHeader>
            <DialogTitle>Bộ ảnh mockup đã lưu</DialogTitle>
            <DialogDescription>
              Mở bộ ảnh để xem tiến độ, duyệt và tải kết quả.
            </DialogDescription>
          </DialogHeader>
          <section className="studio-gallery-section">
            <h2>Các bộ mockup đã lưu</h2>
            {recent?.items.map((job) => (
              <button
                className="studio-list-item studio-card"
                key={job.id}
                onClick={() => studioNavigate("studio-mockups", job.id)}
              >
                <strong>{job.title}</strong>
                <span>
                  {job.count} ảnh · {studioLabels[job.state]}
                </span>
              </button>
            ))}
            {recent && !recent.total && (
              <p>Chưa có bộ mockup trong phạm vi bạn được xem.</p>
            )}
            <div className="studio-action-row">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((v) => v - 1)}
              >
                Trang trước
              </Button>
              <span>Trang {page}</span>
              <Button
                variant="outline"
                disabled={!recent || page * recent.limit >= recent.total}
                onClick={() => setPage((v) => v + 1)}
              >
                Trang sau
              </Button>
            </div>
          </section>
        </DialogContent>
      </Dialog>
      {busy && (
        <p role="status">
          <Loader2 className="animate-spin" size={18} />
          Đang lưu…
        </p>
      )}
    </div>
  );
}
