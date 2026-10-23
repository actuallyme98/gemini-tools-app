import { useState } from "react";
import {
  ArrowRight,
  Check,
  Download,
  FolderOpen,
  ImagePlus,
  Layers,
  MessageSquare,
  Plus,
  Search,
} from "lucide-react";
import {
  activeRun,
  agentClient,
  assetBlob,
  assetFilename,
  exportAssets,
  type Asset,
  type Conversation,
  type MockupTemplate,
  type Run,
} from "../../services/agent.service";
import { saveBlob } from "../../utils/download.util";
import { AgentImage } from "./AgentImage";
import { Button } from "../ui/button";
import { agentResourceCreationEnabled } from "./agent-features";

const stateLabels: Record<string, string> = {
  planning: "Đang lập kế hoạch",
  needs_input: "Cần thông tin",
  draft: "Chờ duyệt kế hoạch",
  queued: "Đang chờ",
  running: "Đang xử lý",
  review: "Chờ duyệt ảnh",
  completed: "Hoàn tất",
  partial_failed: "Hoàn tất một phần",
  failed: "Cần kiểm tra lỗi",
  cancelled: "Đã dừng",
};

export function WorkspaceHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="workspace-page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}

export function AgentJobs({
  conversations,
  runs,
  onOpen,
  onNew,
}: {
  conversations: Conversation[];
  runs: Run[];
  onOpen: (id: string) => void;
  onNew: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const filtered = conversations.filter(
    (conversation) =>
      conversation.title
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()) &&
      (filter === "all" ||
        runs.some(
          (run) =>
            run.conversationId === conversation.id &&
            (filter === "active"
              ? activeRun(run)
              : ["draft", "review", "needs_input"].includes(run.state)),
        )),
  );
  return (
    <div className="workspace-page">
      <WorkspaceHeading
        eyebrow="TỪ YÊU CẦU ĐẾN KẾT QUẢ"
        title="Mọi công việc, cùng một nơi."
        description="Theo dõi kế hoạch, tiến trình và những kết quả đang chờ bạn duyệt."
      >
        <Button onClick={onNew}>
          <Plus aria-hidden="true" />
          Giao việc mới
        </Button>
      </WorkspaceHeading>
      <div className="collection-toolbar">
        <div className="filter-pills" aria-label="Lọc công việc">
          {[
            ["all", "Tất cả"],
            ["active", "Đang xử lý"],
            ["review", "Cần bạn duyệt"],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="collection-search">
          <Search size={17} aria-hidden="true" />
          <input
            aria-label="Tìm công việc"
            placeholder="Tìm cuộc trò chuyện…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>
      <div className="job-list">
        {filtered.map((conversation) => {
          const work = runs.filter(
            (run) => run.conversationId === conversation.id,
          );
          const state = work[0]?.state;
          return (
            <button
              type="button"
              className="job-list-item"
              key={conversation.id}
              onClick={() => onOpen(conversation.id)}
            >
              <span className="job-symbol">
                <MessageSquare size={20} aria-hidden="true" />
              </span>
              <span className="job-list-title">
                <strong>{conversation.title}</strong>
                <small>
                  {new Date(conversation.updatedAt).toLocaleString("vi-VN")} ·{" "}
                  {work.length} lần chạy
                </small>
              </span>
              <span
                className={`status-pill ${state && ["failed", "partial_failed"].includes(state) ? "status-warning" : ""}`}
              >
                {stateLabels[state] || "Cuộc trò chuyện"}
              </span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          );
        })}
      </div>
      {!filtered.length && (
        <div className="workspace-empty">
          <MessageSquare size={32} aria-hidden="true" />
          <h2>
            {query || filter !== "all"
              ? "Chưa có công việc phù hợp"
              : "Công việc tiếp theo bắt đầu từ bạn"}
          </h2>
          <p>
            Gửi một ý tưởng hoặc ảnh sản phẩm. Agent sẽ đề xuất kế hoạch để bạn
            duyệt.
          </p>
          <Button variant="outline" onClick={onNew}>
            Bắt đầu cuộc trò chuyện
          </Button>
        </div>
      )}
    </div>
  );
}

export function AgentLibrary({
  assets,
  busy,
  act,
  onSource,
  onReference,
  onUpload,
}: {
  assets: Asset[];
  busy: boolean;
  act: (work: () => Promise<unknown>) => void;
  onSource: (id: string) => void;
  onReference: (id: string) => void;
  onUpload: (files: FileList | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(24);
  const filtered = assets.filter(
    (asset) =>
      asset.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()) &&
      (filter === "all" ||
        (filter === "result"
          ? asset.kind === "result"
          : asset.kind !== "result")),
  );
  return (
    <div className="workspace-page">
      <WorkspaceHeading
        eyebrow="TÀI SẢN SÁNG TẠO"
        title="Ý tưởng của bạn, được lưu giữ."
        description="Ảnh nguồn, bản thiết kế và kết quả của Agent. Sẵn sàng cho vòng sáng tạo tiếp theo."
      >
        <label className="upload-library">
          <ImagePlus size={17} aria-hidden="true" />
          Tải ảnh lên
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            disabled={busy}
            aria-label="Tải ảnh vào thư viện"
            onChange={(event) => {
              onUpload(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
      </WorkspaceHeading>
      <div className="collection-toolbar">
        <div className="filter-pills" aria-label="Lọc thư viện">
          {[
            ["all", "Tất cả"],
            ["source", "Ảnh đầu vào"],
            ["result", "Kết quả"],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="collection-search">
          <Search size={17} aria-hidden="true" />
          <input
            aria-label="Tìm ảnh trong thư viện"
            placeholder="Tìm tên ảnh…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>
      {!!selected.length && (
        <div className="selection-toolbar">
          <span>Đã chọn {selected.length} ảnh</span>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              act(() =>
                exportAssets(
                  assets.filter((asset) => selected.includes(asset.id)),
                  "thu-vien",
                ),
              )
            }
          >
            <Download aria-hidden="true" />
            Tải bộ ảnh ZIP
          </Button>
          <Button variant="ghost" onClick={() => setSelected([])}>
            Bỏ chọn tất cả
          </Button>
        </div>
      )}
      <div className="asset-gallery">
        {filtered.slice(0, visibleCount).map((asset) => (
          <article className="asset-gallery-card" key={asset.id}>
            <div className="asset-gallery-image">
              <AgentImage id={asset.id} name={asset.name} />
              <label className="asset-select">
                <input
                  type="checkbox"
                  aria-label={`Chọn ${asset.name}`}
                  checked={selected.includes(asset.id)}
                  onChange={() =>
                    setSelected((value) =>
                      value.includes(asset.id)
                        ? value.filter((id) => id !== asset.id)
                        : [...value, asset.id],
                    )
                  }
                />
              </label>
              <span className="asset-kind">
                {asset.kind === "result"
                  ? "Kết quả"
                  : asset.kind === "reference"
                    ? "Tham chiếu"
                    : asset.kind === "template"
                      ? "Template"
                      : "Ảnh nguồn"}
              </span>
            </div>
            <div className="asset-gallery-content">
              <h2 title={asset.name}>{asset.name}</h2>
              <p>
                {asset.width} × {asset.height} · Phiên bản {asset.revision}
              </p>
              <label className="asset-review-label">
                Duyệt ảnh
                <select
                  aria-label={`Duyệt ${asset.name}`}
                  value={asset.review}
                  disabled={busy}
                  onChange={(event) =>
                    act(() =>
                      agentClient.patch(`/assets/${asset.id}/review`, {
                        review: event.target.value,
                      }),
                    )
                  }
                >
                  <option value="draft">Chưa duyệt</option>
                  <option value="approved">Đã duyệt</option>
                  <option value="changes_requested">Cần chỉnh sửa</option>
                </select>
              </label>
              <div className="asset-actions">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => onSource(asset.id)}
                >
                  Làm nguồn
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => onReference(asset.id)}
                >
                  Tham chiếu
                </Button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Tải ${asset.name}`}
                  disabled={busy}
                  onClick={() =>
                    act(async () =>
                      saveBlob(await assetBlob(asset.id), assetFilename(asset)),
                    )
                  }
                >
                  <Download size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {filtered.length > visibleCount && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            onClick={() => setVisibleCount((value) => value + 24)}
          >
            Hiển thị thêm ảnh ({filtered.length - visibleCount})
          </Button>
        </div>
      )}
      {!filtered.length && (
        <div className="workspace-empty">
          <FolderOpen size={32} aria-hidden="true" />
          <h2>
            {assets.length
              ? "Không tìm thấy ảnh phù hợp"
              : "Một thư viện cho mọi sáng tạo"}
          </h2>
          <p>
            Tải ảnh sản phẩm lên, hoặc bắt đầu một công việc. Ảnh và kết quả sẽ
            được lưu tại đây.
          </p>
        </div>
      )}
    </div>
  );
}

export function AgentTemplates({
  templates,
  busy,
  onNew,
  onEdit,
  onUse,
}: {
  templates: MockupTemplate[];
  busy: boolean;
  onNew: () => void;
  onEdit: (template: MockupTemplate) => void;
  onUse: (template: MockupTemplate) => void;
}) {
  return (
    <div className="workspace-page">
      <WorkspaceHeading
        eyebrow="THIẾT LẬP MỘT LẦN, DÙNG NHIỀU LẦN"
        title="Mẫu chuẩn cho từng sản phẩm."
        description="Chuẩn hóa vị trí, tỉ lệ và phối cảnh để ghép thiết kế lên ảnh mẫu."
      >
        {agentResourceCreationEnabled && (
          <Button disabled={busy} onClick={onNew}>
            <Plus aria-hidden="true" />
            Thêm template
          </Button>
        )}
      </WorkspaceHeading>
      <div className="asset-gallery">
        {templates.map((template) => (
          <article className="asset-gallery-card" key={template.id}>
            <div className="asset-gallery-image">
              <AgentImage id={template.assetId} name={template.name} />
            </div>
            <div className="asset-gallery-content">
              <h2>
                {template.name} · {template.category}
              </h2>
              <p>
                Phiên bản {template.revision} ·{" "}
                {template.blend === "multiply"
                  ? "Hòa trộn nền"
                  : "Giữ màu thiết kế"}
              </p>
              <div className="asset-actions">
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => onUse(template)}
                >
                  <Check aria-hidden="true" />
                  Dùng template
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => onEdit(template)}
                >
                  Chỉnh bản mới
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!templates.length && (
        <div className="workspace-empty">
          <Layers size={32} aria-hidden="true" />
          <h2>
            {agentResourceCreationEnabled
              ? "Bắt đầu từ ảnh mẫu của bạn"
              : "Chưa có template"}
          </h2>
          <p>
            {agentResourceCreationEnabled
              ? "Thêm ảnh nền và xác định bốn góc vùng đặt thiết kế. Agent sẽ giữ tỉ lệ khi xử lý hàng loạt."
              : "Tính năng tạo template mới đang tạm ẩn. Bạn vẫn có thể tạo mockup từ ảnh tham chiếu trong Trợ lý AI."}
          </p>
          {agentResourceCreationEnabled && (
            <Button variant="outline" disabled={busy} onClick={onNew}>
              Tạo template đầu tiên
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
