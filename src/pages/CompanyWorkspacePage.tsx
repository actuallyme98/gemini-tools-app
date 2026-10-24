import { useState } from "react";
import { toast } from "sonner";
import {
  agentClient,
  type AgentUser,
  type Asset,
} from "../services/agent.service";
import { notifyApiError } from "../utils/api-error-toast";
import { Button } from "../components/ui/button";
import { WorkspaceHeading } from "../components/agent/AgentWorkspaceViews";
import {
  useWorkspaceData,
  type Project,
  type Knowledge,
} from "../components/agent/workspace-data";
import { ProductionPanels } from "../components/agent/ProductionPanels";
import "../styles/company-workspace.css";

export function CompanyWorkspacePage({
  user,
  assets,
  onResearch,
  onOpen,
  onAssetsChanged,
}: {
  user: AgentUser;
  assets: Asset[];
  onResearch: (
    text: string,
    sources: { title: string; url: string; retrievedAt: string }[],
  ) => void;
  onOpen: (id: string) => void;
  onAssetsChanged: () => Promise<void>;
}) {
  const [tab, setTab] = useState("projects");
  return (
    <div className="workspace-page company-workspace">
      <WorkspaceHeading
        eyebrow="KHÔNG GIAN LÀM VIỆC"
        title="Phối hợp để tạo ra sản phẩm tốt hơn."
        description="Dự án, kiến thức và các bước chuẩn bị sản xuất của công ty."
      />
      <div
        className="filter-pills company-tabs"
        aria-label="Chức năng không gian nhóm"
      >
        {[
          ["projects", "Dự án"],
          ["knowledge", "Kiến thức"],
          ["research", "Nghiên cứu"],
          ["batch", "Batch CSV"],
          ["composite", "Ghép chính xác"],
          ["export", "Xuất file"],
          ["evaluations", "Đánh giá"],
          ["notifications", "Thông báo"],
          ...(user.role === "admin" ? [["operations", "Giám sát"]] : []),
        ].map(([v, l]) => (
          <button
            type="button"
            aria-pressed={tab === v}
            key={v}
            onClick={() => setTab(v)}
          >
            {l}
          </button>
        ))}
      </div>
      {tab === "projects" ? (
        <ProjectPanel user={user} />
      ) : tab === "knowledge" ? (
        <KnowledgePanel user={user} />
      ) : (
        <ProductionPanels
          onAssetsChanged={onAssetsChanged}
          tab={tab}
          user={user}
          assets={assets}
          onResearch={onResearch}
          onOpen={onOpen}
        />
      )}
    </div>
  );
}
function ProjectPanel({ user }: { user: AgentUser }) {
  const resource = useWorkspaceData<Project[]>("/workspace/projects");
  const [editing, setEditing] = useState<Project>();
  const [name, setName] = useState(""),
    [description, setDescription] = useState(""),
    [members, setMembers] = useState(""),
    [archived, setArchived] = useState(false),
    [busy, setBusy] = useState(false);
  const clear = () => {
    setEditing(undefined);
    setName("");
    setDescription("");
    setMembers("");
    setArchived(false);
  };
  return (
    <section>
      <h2>Dự án & thành viên</h2>
      <p>
        Viewer xem công việc; editor trao đổi và tạo công việc; reviewer duyệt
        ảnh; manager quản lý thành viên và phân công. Chỉ chia sẻ dữ liệu khi
        đưa công việc vào dự án.
      </p>
      {resource.error && <p role="alert">{resource.error}</p>}
      <div className="company-grid">
        {resource.data?.map((p) => (
          <article className="company-card" key={p.id}>
            <h3>
              {p.name}
              {p.archived ? " · Đã lưu trữ" : ""}
            </h3>
            <p>{p.description}</p>
            <p>{p.members.length + 1} thành viên (gồm chủ dự án)</p>
            <ul>
              {p.members.map((m) => (
                <li key={m.id}>
                  {m.email} · {m.role}
                </li>
              ))}
            </ul>
            {(p.owner === user.id || user.role === "admin") && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(p);
                  setName(p.name);
                  setDescription(p.description);
                  setMembers(
                    p.members.map((m) => `${m.email},${m.role}`).join("\n"),
                  );
                  setArchived(p.archived);
                }}
              >
                Sửa dự án
              </Button>
            )}
          </article>
        ))}
      </div>
      <form
        className="company-card"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          const input = {
            name,
            description,
            archived,
            members: members
              .split("\n")
              .map((v) => v.trim())
              .filter(Boolean)
              .map((line) => {
                const [email, role = "editor"] = line
                  .split(",")
                  .map((v) => v.trim());
                return { email, role };
              }),
            ...(editing ? { updatedAt: editing.updatedAt } : {}),
          };
          void (
            editing
              ? agentClient.patch(`/workspace/projects/${editing.id}`, input)
              : agentClient.post("/workspace/projects", input)
          )
            .then(() => {
              toast.success("Đã lưu dự án.");
              clear();
              resource.reload();
            })
            .catch(notifyApiError)
            .finally(() => setBusy(false));
        }}
      >
        <h3>{editing ? "Sửa dự án" : "Tạo dự án"}</h3>
        <fieldset disabled={busy}>
          <label>
            Tên dự án
            <input
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Mô tả
            <textarea
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label>
            Thành viên: mỗi dòng email,quyền
            <textarea
              value={members}
              onChange={(e) => setMembers(e.target.value)}
              placeholder="designer@company.com,editor"
            />
          </label>
          <p>
            Quyền hợp lệ: viewer, editor, reviewer, manager. Tài khoản phải được
            admin tạo trước.
          </p>
          <label className="company-check">
            <input
              type="checkbox"
              checked={archived}
              onChange={(e) => setArchived(e.target.checked)}
            />
            Lưu trữ dự án
          </label>
          <div className="company-actions">
            <Button type="submit">{busy ? "Đang lưu…" : "Lưu dự án"}</Button>
            {editing && (
              <Button type="button" variant="ghost" onClick={clear}>
                Hủy sửa
              </Button>
            )}
          </div>
        </fieldset>
      </form>
    </section>
  );
}
function KnowledgePanel({ user }: { user: AgentUser }) {
  const resource = useWorkspaceData<Knowledge[]>("/workspace/knowledge"),
    projects = useWorkspaceData<Project[]>("/workspace/projects");
  const [editing, setEditing] = useState<Knowledge>();
  const [title, setTitle] = useState(""),
    [content, setContent] = useState(""),
    [tags, setTags] = useState(""),
    [visibility, setVisibility] = useState("private"),
    [projectId, setProjectId] = useState(""),
    [busy, setBusy] = useState(false),
    [archived, setArchived] = useState(false),
    [query, setQuery] = useState("");
  const clear = () => {
    setEditing(undefined);
    setTitle("");
    setContent("");
    setTags("");
    setVisibility("private");
    setProjectId("");
    setArchived(false);
  };
  return (
    <section>
      <h2>Kho kiến thức</h2>
      <p>
        Lưu quy chuẩn thương hiệu, POD và nội dung đã duyệt. Agent tìm phần liên
        quan theo từ khóa và quyền; không gửi toàn bộ kho vào mỗi câu chat. Tài
        liệu là dữ liệu tham khảo, không phải lệnh hệ thống.
      </p>
      <label>
        Tìm tài liệu
        <input value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      {resource.error && <p role="alert">{resource.error}</p>}
      {resource.data
        ?.filter((k) =>
          (k.title + " " + k.tags.join(" "))
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .map((k) => (
          <details key={k.id} className="company-card">
            <summary>
              {k.title} · v{k.revision} · {k.visibility}
            </summary>
            <p className="company-text">{k.content}</p>
            <p>{k.tags.join(", ")}</p>
            {(k.owner === user.id || user.role === "admin") && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(k);
                  setTitle(k.title);
                  setContent(k.content);
                  setTags(k.tags.join(", "));
                  setVisibility(k.visibility);
                  setProjectId(k.projectId ?? "");
                }}
              >
                Sửa tài liệu
              </Button>
            )}
          </details>
        ))}
      <form
        className="company-card"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          const input = {
            title,
            content,
            tags: tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
            visibility,
            ...(visibility === "project" ? { projectId } : {}),
            archived,
            ...(editing ? { updatedAt: editing.updatedAt } : {}),
          };
          void (
            editing
              ? agentClient.patch(`/workspace/knowledge/${editing.id}`, input)
              : agentClient.post("/workspace/knowledge", input)
          )
            .then(() => {
              toast.success("Đã lưu kiến thức.");
              clear();
              resource.reload();
            })
            .catch(notifyApiError)
            .finally(() => setBusy(false));
        }}
      >
        <h3>{editing ? "Sửa tài liệu" : "Thêm kiến thức"}</h3>
        <fieldset disabled={busy}>
          <label>
            Tiêu đề
            <input
              required
              maxLength={160}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            Nội dung
            <textarea
              required
              maxLength={50000}
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </label>
          <label>
            Từ khóa (cách nhau dấu phẩy)
            <input value={tags} onChange={(e) => setTags(e.target.value)} />
          </label>
          <label>
            Chia sẻ
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
            >
              <option value="private">Riêng tôi</option>
              <option value="project">Trong dự án</option>
              {user.role === "admin" && (
                <option value="company">Toàn công ty</option>
              )}
            </select>
          </label>
          {visibility === "project" && (
            <label>
              Dự án
              <select
                required
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">Chọn dự án</option>
                {projects.data
                  ?.filter((p) => !p.archived)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
          {editing && (
            <label className="company-check">
              <input
                type="checkbox"
                checked={archived}
                onChange={(e) => setArchived(e.target.checked)}
              />
              Lưu trữ tài liệu
            </label>
          )}
          <div className="company-actions">
            <Button type="submit">{busy ? "Đang lưu…" : "Lưu tài liệu"}</Button>
            {editing && (
              <Button variant="ghost" type="button" onClick={clear}>
                Hủy sửa
              </Button>
            )}
          </div>
        </fieldset>
      </form>
    </section>
  );
}
