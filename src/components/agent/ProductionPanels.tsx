import { useContext, useState } from "react";
import JSZip from "jszip";
import { toast } from "sonner";
import {
  agentClient,
  agentUpload,
  assetBlob,
  type AgentUser,
  type Asset,
  type Point,
} from "../../services/agent.service";
import { AIProviderContext } from "../../context/ai-provider-context";
import { notifyApiError } from "../../utils/api-error-toast";
import { saveBlob } from "../../utils/download.util";
import { Button } from "../ui/button";
import { AgentImage } from "./AgentImage";
import { useWorkspaceData, type Project } from "./workspace-data";
import { jobStates } from "./job-states";
import { usd } from "../../services/budget.service";
type Props = {
  tab: string;
  user: AgentUser;
  assets: Asset[];
  onResearch: (
    text: string,
    sources: { title: string; url: string; retrievedAt: string }[],
  ) => void;
  onOpen: (id: string) => void;
  onAssetsChanged: () => Promise<void>;
};
export function ProductionPanels(props: Props) {
  switch (props.tab) {
    case "research":
      return <ResearchPanel onResearch={props.onResearch} />;
    case "batch":
      return <BatchPanel onOpen={props.onOpen} />;
    case "composite":
      return (
        <CompositePanel
          assets={props.assets}
          onAssetsChanged={props.onAssetsChanged}
        />
      );
    case "export":
      return (
        <ExportPanel
          assets={props.assets}
          onAssetsChanged={props.onAssetsChanged}
        />
      );
    case "evaluations":
      return <EvaluationPanel assets={props.assets} />;
    case "notifications":
      return <Notifications />;
    case "operations":
      return props.user.role === "admin" ? <Operations /> : null;
    default:
      return null;
  }
}
type Research = {
  id: string;
  keyword: string;
  createdAt: string;
  sources: {
    title: string;
    url: string;
    retrievedAt: string;
    content: string;
    snippet: string;
    status: string;
  }[];
};
function ResearchPanel({ onResearch }: Pick<Props, "onResearch">) {
  const resource = useWorkspaceData<Research[]>("/production/research");
  const [keyword, setKeyword] = useState(""),
    [urls, setUrls] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section>
      <h2>Nghiên cứu keyword có nguồn</h2>
      <p>
        Tìm và đọc tối đa 5 nguồn công khai. Không cung cấp số lượt tìm kiếm,
        doanh số hay độ cạnh tranh khi không có dữ liệu xác minh. Trang chặn
        truy cập chỉ có trích đoạn tìm kiếm.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          void agentClient
            .post("/production/research", {
              keyword,
              urls: urls
                .split("\n")
                .map((v) => v.trim())
                .filter(Boolean),
            })
            .then(() => {
              toast.success("Đã thu thập nguồn.");
              resource.reload();
            })
            .catch(notifyApiError)
            .finally(() => setBusy(false));
        }}
      >
        <fieldset disabled={busy}>
          <label>
            Keyword / nhóm sản phẩm
            <input
              required
              minLength={2}
              maxLength={200}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </label>
          <label>
            Link HTTPS cụ thể (tùy chọn, mỗi dòng một link)
            <textarea value={urls} onChange={(e) => setUrls(e.target.value)} />
          </label>
          <Button type="submit">
            {busy ? "Đang tìm và đọc nguồn…" : "Thu thập nghiên cứu"}
          </Button>
        </fieldset>
      </form>
      {resource.error && <p role="alert">{resource.error}</p>}
      {resource.data?.map((r) => (
        <article className="company-card" key={r.id}>
          <h3>{r.keyword}</h3>
          {r.sources.map((s) => (
            <details key={s.url}>
              <summary>
                {s.title} ·{" "}
                {s.status === "read" ? "Đã đọc" : "Chỉ có trích đoạn"}
              </summary>
              <a href={s.url} target="_blank" rel="noreferrer">
                Mở nguồn
              </a>
              <p>{new Date(s.retrievedAt).toLocaleString("vi-VN")}</p>
              <p className="company-text">
                {s.content || s.snippet || "Không đọc được nội dung."}
              </p>
            </details>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              onResearch(
                JSON.stringify({
                  keyword: r.keyword,
                  metricsAvailable: false,
                  sources: r.sources.map((s) => ({
                    ...s,
                    content: s.content.slice(0, 2400),
                    snippet: s.snippet.slice(0, 300),
                  })),
                }),
                r.sources,
              )
            }
          >
            Dùng nghiên cứu trong chat
          </Button>
        </article>
      ))}
    </section>
  );
}
type Batch = {
  id: string;
  name: string;
  conversationId: string;
  rows: {
    sku: string;
    sourceId: string;
    targetId: string;
    prompt: string;
    runId: string;
  }[];
};
function BatchPanel({ onOpen }: Pick<Props, "onOpen">) {
  const ai = useContext(AIProviderContext)!;
  const resource = useWorkspaceData<Batch[]>("/production/batches"),
    projects = useWorkspaceData<Project[]>("/workspace/projects");
  const [name, setName] = useState(""),
    [csv, setCsv] = useState(""),
    [mapping, setMapping] = useState({
      sku: "sku",
      sourceId: "sourceId",
      targetId: "targetId",
      prompt: "prompt",
    }),
    [preview, setPreview] = useState<Batch["rows"]>(),
    [busy, setBusy] = useState(false),
    [projectId, setProjectId] = useState("");
  const columns =
    csv
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)[0]
      ?.split(",")
      .map((v) => v.replace(/^"|"$/g, "").trim()) ?? [];
  return (
    <section>
      <h2>Batch sản xuất từ CSV</h2>
      <p>
        Mỗi dòng là một cặp nguồn–tham chiếu và một prompt. Dùng ID ảnh trong
        thư viện; tối đa 500 dòng, chia lô tối đa 20 kết quả. Chỉ gửi lô chưa có
        run, duyệt prompt trong hội thoại trước khi tạo ảnh.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          void agentClient
            .post<Batch["rows"]>("/production/batches/preview", {
              csv,
              mapping,
            })
            .then((r) => setPreview(r.data))
            .catch(notifyApiError)
            .finally(() => setBusy(false));
        }}
      >
        <fieldset disabled={busy}>
          <label>
            Tên batch
            <input
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Tải CSV UTF-8
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.size > 1000000) {
                    toast.error("CSV tối đa 1 MB.");
                    return;
                  }
                  void file.text().then((text) => {
                    setCsv(text);
                    setPreview(undefined);
                  });
                }
              }}
            />
          </label>
          <label>
            Nội dung CSV
            <textarea
              required
              rows={5}
              value={csv}
              onChange={(e) => {
                setCsv(e.target.value);
                setPreview(undefined);
              }}
              placeholder={
                "sku,sourceId,targetId,prompt\nSKU-001,uuid-nguon,uuid-tham-chieu,Thay sản phẩm trong ảnh tham chiếu"
              }
            />
          </label>
          <div className="company-grid">
            {Object.entries(mapping).map(([key, value]) => (
              <label key={key}>
                Cột {key}
                <select
                  value={value}
                  onChange={(e) => {
                    setMapping({ ...mapping, [key]: e.target.value });
                    setPreview(undefined);
                  }}
                >
                  {[...new Set([value, ...columns])].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <label>
            Dự án
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">Riêng tôi</option>
              {projects.data
                ?.filter((p) => !p.archived)
                .map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
          <Button type="submit">
            {busy ? "Đang kiểm tra…" : "Kiểm tra & xem trước"}
          </Button>
        </fieldset>
      </form>
      {preview && (
        <div className="company-card">
          <h3>{preview.length} dòng hợp lệ</h3>
          <div className="company-table">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Ảnh nguồn</th>
                  <th>Ảnh đích</th>
                  <th>Yêu cầu</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 20).map((r) => (
                  <tr key={r.sku}>
                    <td>{r.sku}</td>
                    <td>
                      <div style={{ width: 80 }}>
                        <AgentImage id={r.sourceId} name={`Nguồn ${r.sku}`} />
                      </div>
                      {r.sourceId.slice(0, 8)}
                    </td>
                    <td>
                      <div style={{ width: 80 }}>
                        <AgentImage
                          id={r.targetId}
                          name={`Tham chiếu ${r.sku}`}
                        />
                      </div>
                      {r.targetId.slice(0, 8)}
                    </td>
                    <td>{r.prompt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Hiển thị 20 dòng đầu. Provider/model dùng cấu hình đang chọn khi tạo
            batch.
          </p>
          <Button
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void agentClient
                .post("/production/batches", {
                  name,
                  csv,
                  mapping,
                  provider: ai.provider,
                  ...(ai.imageModel ? { imageModel: ai.imageModel } : {}),
                  ...(projectId ? { projectId } : {}),
                })
                .then(() => {
                  toast.success("Đã lưu batch.");
                  setPreview(undefined);
                  setCsv("");
                  resource.reload();
                })
                .catch(notifyApiError)
                .finally(() => setBusy(false));
            }}
          >
            Lưu batch
          </Button>
        </div>
      )}
      {resource.error && <p role="alert">{resource.error}</p>}
      {resource.data?.map((batch) => (
        <BatchStatus key={batch.id} batch={batch} onOpen={onOpen} />
      ))}
    </section>
  );
}
function BatchStatus({
  batch,
  onOpen,
}: {
  batch: Batch;
  onOpen: Props["onOpen"];
}) {
  const resource = useWorkspaceData<{ runs: { id: string; state: string }[] }>(
    `/production/batches/${batch.id}`,
  );
  const [busy, setBusy] = useState(false);
  const total = new Set(batch.rows.map((r) => r.runId)).size;
  return (
    <article className="company-card">
      <h3>
        {batch.name} · {batch.rows.length} dòng
      </h3>
      <p>
        {resource.data?.runs.length ?? 0}/{total} lô đã gửi
      </p>
      {resource.data?.runs.map((r) => (
        <p key={r.id}>
          #{r.id.slice(0, 8)} · {jobStates[r.state]}
        </p>
      ))}
      {resource.error && <p role="alert">{resource.error}</p>}
      <div className="company-actions">
        <Button
          disabled={busy || resource.data?.runs.length === total}
          onClick={() => {
            setBusy(true);
            void agentClient
              .post(`/production/batches/${batch.id}/submit`)
              .then(() => {
                toast.success("Đã gửi lô kế tiếp để lập kế hoạch.");
                resource.reload();
              })
              .catch(notifyApiError)
              .finally(() => setBusy(false));
          }}
        >
          {busy ? "Đang gửi…" : "Gửi lô chưa chạy tiếp theo"}
        </Button>
        <Button variant="outline" onClick={() => onOpen(batch.conversationId)}>
          Mở hội thoại để duyệt & xem kết quả
        </Button>
        <Button variant="ghost" onClick={resource.reload}>
          Cập nhật
        </Button>
      </div>
      <p>
        Lỗi/timeout không tự tạo lại ảnh; kiểm tra công việc và đối soát trước
        khi dùng thao tác tạo lại có phí.
      </p>
    </article>
  );
}
function AssetSelect({
  assets,
  value,
  onChange,
  label,
  optional = false,
}: {
  assets: Asset[];
  value: string;
  onChange: (v: string) => void;
  label: string;
  optional?: boolean;
}) {
  return (
    <label>
      {label}
      <select
        required={!optional}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{optional ? "Không sử dụng" : "Chọn ảnh"}</option>
        {assets.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name} · {a.id.slice(0, 8)}
          </option>
        ))}
      </select>
    </label>
  );
}
function CompositePanel({
  assets,
  onAssetsChanged,
}: Pick<Props, "assets" | "onAssetsChanged">) {
  const [sourceId, setSourceId] = useState(""),
    [targetId, setTargetId] = useState(""),
    [mask, setMask] = useState(""),
    [overlay, setOverlay] = useState(""),
    [opacity, setOpacity] = useState(1),
    [blend, setBlend] = useState("over"),
    [corners, setCorners] = useState<Point[]>([
      { x: 0.2, y: 0.2 },
      { x: 0.8, y: 0.2 },
      { x: 0.8, y: 0.8 },
      { x: 0.2, y: 0.8 },
    ]),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<Asset>(),
    [extra, setExtra] = useState<Asset[]>([]);
  const all = [
    ...new Map([...assets, ...extra].map((a) => [a.id, a])).values(),
  ];
  const target = all.find((a) => a.id === targetId);
  return (
    <section>
      <h2>Ghép file thiết kế giữ nguyên hình in</h2>
      <p>
        Dùng ảnh thiết kế đã tách nền để đặt vào vùng in. Đây là phép biến đổi
        phối cảnh, không có AI vẽ lại. Dùng mask trắng cho vùng được ghép, đen
        cho vùng giữ nguyên; overlay là lớp phủ phía trước.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          void agentClient
            .post<Asset>("/production/composite", {
              sourceId,
              template: {
                name: "Ghep-chinh-xac",
                category: "POD",
                assetId: targetId,
                corners,
                opacity,
                blend,
                ...(mask ? { maskAssetId: mask } : {}),
                ...(overlay ? { overlayAssetId: overlay } : {}),
              },
            })
            .then((r) => {
              setResult(r.data);
              void onAssetsChanged().catch(notifyApiError);
              toast.success("Đã ghép ảnh, hãy kiểm tra vùng in.");
            })
            .catch(notifyApiError)
            .finally(() => setBusy(false));
        }}
      >
        <fieldset disabled={busy}>
          <div className="company-grid">
            <AssetSelect
              label="File thiết kế nguồn"
              assets={all}
              value={sourceId}
              onChange={setSourceId}
            />
            <AssetSelect
              label="Ảnh đích"
              assets={all}
              value={targetId}
              onChange={setTargetId}
            />
          </div>
          <label>
            Tải thêm ảnh / mask / overlay
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setBusy(true);
                void agentUpload(file, "reference", "POD")
                  .then((a) => setExtra((v) => [...v, a]))
                  .catch(notifyApiError)
                  .finally(() => setBusy(false));
                e.target.value = "";
              }}
            />
          </label>
          {target && (
            <div
              style={{
                position: "relative",
                maxWidth: 600,
                aspectRatio: `${target.width}/${target.height}`,
              }}
            >
              <AgentImage
                id={targetId}
                name={target.name}
                className="!aspect-auto h-full w-full"
              />
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                }}
                role="img"
                aria-label="Vùng ghép trên ảnh đích"
              >
                <polygon
                  points={corners
                    .map((p) => `${p.x * 100},${p.y * 100}`)
                    .join(" ")}
                  fill="rgba(248,128,24,.15)"
                  stroke="#b84900"
                  strokeWidth=".6"
                />
                {corners.map((p, i) => (
                  <text
                    key={i}
                    x={p.x * 100}
                    y={p.y * 100}
                    fill="#8a2c00"
                    fontSize="5"
                  >
                    {i + 1}
                  </text>
                ))}
              </svg>
            </div>
          )}
          <div className="company-grid">
            {corners.map((p, i) => (
              <fieldset key={i}>
                <legend>
                  {i + 1}.{" "}
                  {["Trên trái", "Trên phải", "Dưới phải", "Dưới trái"][i]}
                </legend>
                {(["x", "y"] as const).map((axis) => (
                  <label key={axis}>
                    {axis.toUpperCase()} (0–1)
                    <input
                      type="number"
                      required
                      min={0}
                      max={1}
                      step={0.01}
                      value={p[axis]}
                      onChange={(e) =>
                        setCorners((v) =>
                          v.map((q, j) =>
                            j === i
                              ? { ...q, [axis]: Number(e.target.value) }
                              : q,
                          ),
                        )
                      }
                    />
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
          <div className="company-grid">
            <AssetSelect
              optional
              label="Mask vùng in"
              assets={all}
              value={mask}
              onChange={setMask}
            />
            <AssetSelect
              optional
              label="Overlay"
              assets={all}
              value={overlay}
              onChange={setOverlay}
            />
            <label>
              Độ đậm
              <input
                type="number"
                min={0.05}
                max={1}
                step={0.05}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
              />
            </label>
            <label>
              Hòa trộn
              <select value={blend} onChange={(e) => setBlend(e.target.value)}>
                <option value="over">Bình thường</option>
                <option value="multiply">Multiply</option>
              </select>
            </label>
          </div>
          <Button type="submit">
            {busy ? "Đang ghép…" : "Ghép thiết kế (không gọi AI)"}
          </Button>
        </fieldset>
      </form>
      {result && (
        <div className="company-card">
          <h3>Kết quả ghép</h3>
          <AgentImage id={result.id} name={result.name} />
          <p>Đã lưu vào thư viện. Cần kiểm tra vị trí, tỉ lệ và duyệt ảnh.</p>
        </div>
      )}
    </section>
  );
}
type Preset = {
  id?: string;
  name: string;
  width: number;
  height: number;
  dpi: number;
  safeMargin: number;
  transparent: boolean;
  approvedOnly: boolean;
};
function ExportPanel({
  assets,
  onAssetsChanged,
}: Pick<Props, "assets" | "onAssetsChanged">) {
  const resource = useWorkspaceData<Preset[]>("/production/presets");
  const [preset, setPreset] = useState<Preset>({
      name: "POD-4500x5400",
      width: 4500,
      height: 5400,
      dpi: 300,
      safeMargin: 0,
      transparent: false,
      approvedOnly: true,
    }),
    [assetId, setAssetId] = useState(""),
    [sku, setSku] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section>
      <h2>Chuẩn hóa file xuất</h2>
      <p>
        Kiểm tra chuẩn thực tế của nhà in trước khi dùng preset. Nền trong suốt
        yêu cầu ảnh đã tách nền. Vùng an toàn là khoảng đệm bên trong; ảnh được
        giữ tỉ lệ. Upscale không tăng chi tiết gốc.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          void agentClient
            .post<{ asset: Asset; manifest: Record<string, unknown> }>(
              "/production/exports",
              { assetId, sku, preset },
            )
            .then(async (r) => {
              void onAssetsChanged().catch(notifyApiError);
              const blob = await assetBlob(r.data.asset.id);
              const zip = new JSZip();
              zip.file(`${sku}/${r.data.asset.name}`, blob);
              zip.file(
                `${sku}/manifest.json`,
                JSON.stringify(r.data.manifest, null, 2),
              );
              saveBlob(await zip.generateAsync({ type: "blob" }), `${sku}.zip`);
              toast.success("Đã xuất ảnh và manifest.");
            })
            .catch(notifyApiError)
            .finally(() => setBusy(false));
        }}
      >
        <fieldset disabled={busy}>
          <label>
            Preset đã lưu
            <select
              value=""
              onChange={(e) => {
                const found = resource.data?.find(
                  (p) => p.id === e.target.value,
                );
                if (found) {
                  const { id: _, ...fields } = found;
                  void _;
                  setPreset(fields);
                }
              }}
            >
              <option value="">Chọn preset</option>
              {resource.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <AssetSelect
            assets={assets}
            value={assetId}
            onChange={setAssetId}
            label="Ảnh xuất"
          />
          <label>
            SKU
            <input
              required
              pattern="[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />
          </label>
          <label>
            Tên preset
            <input
              required
              maxLength={60}
              value={preset.name}
              onChange={(e) => setPreset({ ...preset, name: e.target.value })}
            />
          </label>
          <div className="company-grid">
            {(
              [
                ["width", "Chiều rộng (px)"],
                ["height", "Chiều cao (px)"],
                ["dpi", "DPI"],
                ["safeMargin", "Đệm an toàn (px)"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  type="number"
                  required
                  min={key === "safeMargin" ? 0 : key === "dpi" ? 72 : 32}
                  max={key === "safeMargin" ? 2000 : key === "dpi" ? 600 : 8000}
                  value={preset[key]}
                  onChange={(e) =>
                    setPreset({ ...preset, [key]: Number(e.target.value) })
                  }
                />
              </label>
            ))}
          </div>
          <p>Tối đa 32 megapixel.</p>
          {(
            [
              ["transparent", "Yêu cầu nền trong suốt"],
              ["approvedOnly", "Chỉ xuất ảnh đã duyệt"],
            ] as const
          ).map(([key, label]) => (
            <label className="company-check" key={key}>
              <input
                type="checkbox"
                checked={preset[key]}
                onChange={(e) =>
                  setPreset({ ...preset, [key]: e.target.checked })
                }
              />
              {label}
            </label>
          ))}
          <div className="company-actions">
            <Button type="submit">
              {busy ? "Đang xử lý…" : "Xuất ZIP + manifest"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setBusy(true);
                void agentClient
                  .post("/production/presets", preset)
                  .then(() => {
                    resource.reload();
                    toast.success("Đã lưu preset.");
                  })
                  .catch(notifyApiError)
                  .finally(() => setBusy(false));
              }}
            >
              Lưu preset
            </Button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
type Evaluation = {
  cases: {
    id: string;
    name: string;
    sourceId: string;
    targetId?: string;
    requirements: string;
    expectedCount: number;
  }[];
  results: {
    id: string;
    caseId: string;
    model: string;
    promptHash: string;
    score: number;
    notes: string;
    costUsd: number;
    currency?: "USD" | "CREDIT";
    unresolved: number;
    durationMs: number;
    runId: string;
  }[];
};
function EvaluationPanel({ assets }: Pick<Props, "assets">) {
  const resource = useWorkspaceData<Evaluation>("/production/evaluations");
  const [name, setName] = useState(""),
    [sourceId, setSourceId] = useState(""),
    [targetId, setTargetId] = useState(""),
    [requirements, setRequirements] = useState(""),
    [expectedCount, setExpectedCount] = useState(1),
    [busy, setBusy] = useState(false),
    [caseId, setCaseId] = useState(""),
    [runId, setRunId] = useState(""),
    [score, setScore] = useState(0),
    [notes, setNotes] = useState("");
  return (
    <section>
      <h2>Bộ ca đánh giá Agent</h2>
      <p>
        Lưu các trường hợp từng lỗi, dùng cùng bộ ảnh khi đổi model/prompt. Ghi
        điểm sau khi kiểm tra thật. Không tự chạy lại hoặc phát sinh request AI
        từ màn hình này.
      </p>
      <form
        className="company-card"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          void agentClient
            .post("/production/evaluations", {
              name,
              sourceId,
              ...(targetId ? { targetId } : {}),
              requirements,
              expectedCount,
            })
            .then(() => {
              resource.reload();
              toast.success("Đã lưu ca kiểm thử.");
            })
            .catch(notifyApiError)
            .finally(() => setBusy(false));
        }}
      >
        <fieldset disabled={busy}>
          <h3>Tạo ca chuẩn</h3>
          <label>
            Tên ca
            <input
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <div className="company-grid">
            <AssetSelect
              assets={assets}
              value={sourceId}
              onChange={setSourceId}
              label="Ảnh nguồn chuẩn"
            />
            <AssetSelect
              optional
              assets={assets}
              value={targetId}
              onChange={setTargetId}
              label="Ảnh đích chuẩn"
            />
          </div>
          <label>
            Tiêu chí / kết quả mong đợi
            <textarea
              required
              minLength={3}
              maxLength={8000}
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
            />
          </label>
          <label>
            Số sản phẩm phải có
            <input
              type="number"
              min={1}
              max={100}
              value={expectedCount}
              onChange={(e) => setExpectedCount(Number(e.target.value))}
            />
          </label>
          <Button type="submit">Lưu ca chuẩn</Button>
        </fieldset>
      </form>
      <form
        className="company-card"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          void agentClient
            .post(`/production/evaluations/${caseId}/results`, {
              runId,
              score,
              notes,
            })
            .then(() => {
              resource.reload();
              toast.success("Đã ghi kết quả đánh giá.");
            })
            .catch(notifyApiError)
            .finally(() => setBusy(false));
        }}
      >
        <fieldset disabled={busy}>
          <h3>Ghi kết quả từ công việc đã chạy</h3>
          <label>
            Ca đánh giá
            <select
              required
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
            >
              <option value="">Chọn ca</option>
              {resource.data?.cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · cần {c.expectedCount} sản phẩm
                </option>
              ))}
            </select>
          </label>
          <p>
            {resource.data?.cases.find((c) => c.id === caseId)?.requirements}
          </p>
          <label>
            ID công việc
            <input
              required
              value={runId}
              onChange={(e) => setRunId(e.target.value)}
            />
          </label>
          <label>
            Điểm người duyệt (0–100)
            <input
              type="number"
              min={0}
              max={100}
              required
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
            />
          </label>
          <label>
            Nhận xét có bằng chứng
            <textarea
              required
              minLength={3}
              maxLength={4000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <Button type="submit">Ghi đánh giá</Button>
        </fieldset>
      </form>
      {resource.error && <p role="alert">{resource.error}</p>}
      <div className="company-table">
        <table>
          <caption>
            Kết quả so sánh (chi phí chưa chốt được đánh dấu riêng)
          </caption>
          <thead>
            <tr>
              <th>Ca</th>
              <th>Model / prompt</th>
              <th>Điểm</th>
              <th>Chi phí</th>
              <th>Thời gian bước</th>
              <th>Nhận xét</th>
            </tr>
          </thead>
          <tbody>
            {resource.data?.results.map((r) => (
              <tr key={r.id}>
                <td>
                  {resource.data?.cases.find((c) => c.id === r.caseId)?.name}
                </td>
                <td>
                  {r.model}
                  <br />
                  {r.promptHash.slice(0, 12)}
                </td>
                <td>{r.score}/100</td>
                <td>
                  {usd(r.costUsd, r.currency)}
                  {r.unresolved ? ` · ${r.unresolved} chờ đối soát` : ""}
                </td>
                <td>{(r.durationMs / 1000).toFixed(1)}s</td>
                <td>{r.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function Notifications() {
  const resource = useWorkspaceData<
    {
      id: string;
      title: string;
      state: string;
      read: boolean;
      conversationId: string;
      runId: string;
      createdAt: string;
    }[]
  >("/notifications");
  return (
    <section>
      <h2>Thông báo công việc</h2>
      <Button variant="outline" onClick={resource.reload}>
        Cập nhật thông báo
      </Button>
      {resource.error && <p role="alert">{resource.error}</p>}
      {resource.data?.map((n) => (
        <article className="company-card" key={n.id}>
          <h3>
            {n.read ? "" : "Chưa đọc · "}
            {jobStates[n.state]}
          </h3>
          <p>{n.title}</p>
          <small>{new Date(n.createdAt).toLocaleString("vi-VN")}</small>
          <div className="company-actions">
            <Button
              variant="outline"
              onClick={() => {
                location.hash = `jobs?run=${encodeURIComponent(n.runId)}`;
              }}
            >
              Xem công việc
            </Button>
            {!n.read && (
              <Button
                variant="ghost"
                onClick={() => {
                  void agentClient
                    .patch(`/notifications/${n.id}/read`)
                    .then(resource.reload)
                    .catch(notifyApiError);
                }}
              >
                Đánh dấu đã đọc
              </Button>
            )}
          </div>
        </article>
      ))}
      {resource.data?.length === 0 && (
        <p>
          Chưa có thông báo. Các thay đổi công việc mới sẽ hiển thị tại đây.
        </p>
      )}
    </section>
  );
}
function Operations() {
  const resource = useWorkspaceData<{
    generatedAt: string;
    alerts: {
      severity: string;
      code: string;
      target: string;
      message: string;
    }[];
    disk: { freeBytes: number; totalBytes: number } | null;
  }>("/admin/operations");
  return (
    <section>
      <h2>Giám sát vận hành</h2>
      <p>
        Cảnh báo hàng đợi chờ lâu, tác vụ lỗi, provider, ngân sách và ổ lưu trữ
        ứng dụng. Không tự gửi lại tác vụ trả phí.
      </p>
      <Button variant="outline" onClick={resource.reload}>
        Kiểm tra hiện tại
      </Button>
      {resource.error && <p role="alert">{resource.error}</p>}
      {resource.data && (
        <>
          <p>
            Cập nhật:{" "}
            {new Date(resource.data.generatedAt).toLocaleString("vi-VN")}
          </p>
          {resource.data.disk && (
            <div className="company-card">
              <p>
                Ổ lưu trữ ứng dụng còn{" "}
                {(resource.data.disk.freeBytes / 1024 ** 3).toFixed(1)} /{" "}
                {(resource.data.disk.totalBytes / 1024 ** 3).toFixed(1)} GB
              </p>
              <progress
                aria-label="Dung lượng đã sử dụng"
                max={resource.data.disk.totalBytes}
                value={
                  resource.data.disk.totalBytes - resource.data.disk.freeBytes
                }
              />
            </div>
          )}
          {!resource.data.alerts.length && (
            <p>Chưa phát hiện cảnh báo theo các ngưỡng hiện tại.</p>
          )}
          {resource.data.alerts.map((a, i) => (
            <article
              className="company-card"
              key={`${a.code}:${a.target}:${i}`}
            >
              <strong>
                {a.severity === "error" ? "Cần xử lý" : "Cảnh báo"} · {a.code}
              </strong>
              <p>{a.message}</p>
              <small>{a.target}</small>
            </article>
          ))}
        </>
      )}
    </section>
  );
}
