import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  agentClient,
  type AgentUser,
  type Asset,
  type Run,
  type Step,
} from "../../services/agent.service";
import { notifyApiError } from "../../utils/api-error-toast";
import { Button } from "../ui/button";
import { AgentImage } from "./AgentImage";
import { useWorkspaceData, type Project } from "./workspace-data";
import { WorkspaceHeading } from "./AgentWorkspaceViews";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { jobStates } from "./job-states";
import { usd } from "../../services/budget.service";
import "../../styles/company-workspace.css";
type Job = {
  id: string;
  owner: string;
  conversationId: string;
  brief: string;
  state: string;
  operation: string;
  count: number;
  completed: number;
  progress: number;
  projectId?: string;
  updatedAt: string;
};
type JobDetail = {
  run: Run & {
    owner: string;
    projectId?: string;
    assigneeId?: string;
    reviewerId?: string;
  };
  steps: Step[];
  assets: Asset[];
  comments: {
    id: string;
    authorEmail: string;
    text: string;
    action: string;
    createdAt: string;
  }[];
  cost: {
    currency?: "USD" | "CREDIT";
    costUsd: number;
    reservedUsd: number;
    unresolved: number;
  };
};
export function JobBoard({
  user,
  onOpen,
  onNew,
}: {
  user: AgentUser;
  onOpen: (id: string) => void;
  onNew: () => void;
}) {
  const [page, setPage] = useState(1),
    [filter, setFilter] = useState(""),
    [project, setProject] = useState(""),
    [selected, setSelected] = useState(
      () => new URLSearchParams(location.hash.split("?")[1]).get("run") ?? "",
    );
  const resource = useWorkspaceData<{
    items: Job[];
    total: number;
    hasMore: boolean;
  }>(
    `/workspace/jobs?page=${page}${filter ? `&state=${filter}` : ""}${project ? `&projectId=${project}` : ""}`,
  );
  const projects = useWorkspaceData<Project[]>("/workspace/projects");
  useEffect(() => {
    const timer = window.setInterval(resource.reload, 10000);
    return () => window.clearInterval(timer);
  }, [resource.reload]);
  return (
    <div className="workspace-page company-workspace">
      <WorkspaceHeading
        eyebrow="CÔNG VIỆC"
        title="Theo dõi từng yêu cầu."
        description="Mỗi lần chạy có mã, đầu vào, tiến độ, kết quả và chi phí riêng."
      >
        <Button onClick={onNew}>Giao việc mới</Button>
      </WorkspaceHeading>
      <div className="company-grid">
        <label>
          Trạng thái
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả</option>
            {Object.entries(jobStates).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          Dự án
          <select
            value={project}
            onChange={(e) => {
              setProject(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Của tôi & được chia sẻ</option>
            {projects.data?.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {resource.error ? (
        <p role="alert">
          {resource.error} <Button onClick={resource.reload}>Thử lại</Button>
        </p>
      ) : !resource.data ? (
        <p role="status">Đang tải công việc…</p>
      ) : (
        <>
          <p>{resource.data.total} công việc</p>
          <div className="job-list">
            {resource.data.items.map((job) => (
              <button
                type="button"
                className="job-list-item"
                key={job.id}
                onClick={() => setSelected(job.id)}
              >
                <span className="job-list-title">
                  <strong>{job.brief.slice(0, 150)}</strong>
                  <small>
                    #{job.id.slice(0, 8)} · {job.completed}/{job.count} ảnh ·{" "}
                    {new Date(job.updatedAt).toLocaleString("vi-VN")}
                  </small>
                  <progress
                    value={job.progress}
                    max={100}
                    aria-label={`Tiến độ ${job.id.slice(0, 8)}`}
                  />
                </span>
                <span className="status-pill">{jobStates[job.state]}</span>
              </button>
            ))}
          </div>
          {!resource.data.items.length && (
            <div className="workspace-empty">
              <h2>
                {filter || project
                  ? "Chưa có công việc phù hợp"
                  : "Công việc tiếp theo bắt đầu từ bạn"}
              </h2>
              <p>
                Gửi một yêu cầu để tạo công việc; mỗi lần chạy sẽ có dòng riêng
                tại đây.
              </p>
              <Button variant="outline" onClick={onNew}>
                Bắt đầu cuộc trò chuyện
              </Button>
            </div>
          )}
          <div className="company-actions">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Trang trước
            </Button>
            <span>Trang {page}</span>
            <Button
              variant="outline"
              disabled={!resource.data.hasMore}
              onClick={() => setPage((p) => p + 1)}
            >
              Trang sau
            </Button>
          </div>
        </>
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected("");
        }}
      >
        <DialogContent className="company-job-dialog">
          <DialogTitle>Chi tiết công việc #{selected.slice(0, 8)}</DialogTitle>
          <DialogDescription>
            Ảnh, prompt, chi phí và trao đổi theo từng công việc.
          </DialogDescription>
          {selected && (
            <JobDetailPanel
              key={selected}
              id={selected}
              user={user}
              projects={projects.data ?? []}
              onOpen={onOpen}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
function JobDetailPanel({
  id,
  user,
  projects,
  onOpen,
}: {
  id: string;
  user: AgentUser;
  projects: Project[];
  onOpen: (id: string) => void;
}) {
  const resource = useWorkspaceData<JobDetail>(`/workspace/jobs/${id}`);
  const [text, setText] = useState(""),
    [action, setAction] = useState("comment"),
    [assetId, setAssetId] = useState(""),
    [busy, setBusy] = useState(false);
  const [assignment, setAssignment] = useState<{
    projectId: string;
    assigneeId: string;
    reviewerId: string;
  }>();
  useEffect(() => {
    const timer = window.setInterval(resource.reload, 10000);
    return () => window.clearInterval(timer);
  }, [resource.reload]);
  const data = resource.data;
  if (resource.error) return <p role="alert">{resource.error}</p>;
  if (!data) return <p role="status">Đang tải chi tiết…</p>;
  const current = assignment ?? {
    projectId: data.run.projectId ?? "",
    assigneeId: data.run.assigneeId ?? "",
    reviewerId: data.run.reviewerId ?? "",
  };
  const project = projects.find((p) => p.id === current.projectId);
  const results = data.assets.filter((a) => a.runId === id);
  const act = async (work: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await work();
      toast.success("Đã lưu.");
      resource.reload();
    } catch (e) {
      notifyApiError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="company-workspace">
      <p>
        Mã công việc: <code className="break-all select-all">{id}</code>
      </p>
      <p>
        {jobStates[data.run.state]} · {data.run.brief}
      </p>
      <p>
        Đã chốt: {usd(data.cost.costUsd, data.cost.currency)} · Giữ chỗ:{" "}
        {usd(data.cost.reservedUsd, data.cost.currency)} ·{" "}
        {data.cost.unresolved} khoản chờ đối soát.
      </p>
      <small>
        Chi phí từ các lượt có trong sổ; dữ liệu cũ chưa ghi sổ không được coi
        là miễn phí.
      </small>
      {data.run.owner === user.id && (
        <Button
          variant="outline"
          onClick={() => onOpen(data.run.conversationId)}
        >
          Mở hội thoại để duyệt prompt / tiếp tục
        </Button>
      )}
      <details>
        <summary>Ảnh đầu vào & prompt đã duyệt</summary>
        <div className="company-gallery">
          {data.assets
            .filter(
              (a) =>
                data.run.sourceIds.includes(a.id) ||
                data.run.targetIds.includes(a.id),
            )
            .map((a) => (
              <figure key={a.id}>
                <AgentImage id={a.id} runId={id} name={a.name} />
                <figcaption>
                  {data.run.sourceIds.includes(a.id) ? "Nguồn" : "Ảnh đích"} ·{" "}
                  {a.name}
                </figcaption>
              </figure>
            ))}
        </div>
        {data.run.items.map((item, i) => (
          <details key={i}>
            <summary>{item.title || `Ảnh ${i + 1}`}</summary>
            <pre className="company-text">{item.prompt}</pre>
          </details>
        ))}
      </details>
      <div className="company-gallery">
        {results.map((a) => (
          <figure key={a.id}>
            <AgentImage id={a.id} runId={id} name={a.name} />
            <figcaption>
              {a.name} · {a.review}
            </figcaption>
            <ul>{a.checks?.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
            {a.checks?.criteria?.map((c) => (
              <p key={c.criterion}>
                {c.criterion}: {c.status} ({Math.round(c.confidence * 100)}%) ·{" "}
                {c.evidence}
              </p>
            ))}
          </figure>
        ))}
      </div>
      {data.steps
        .filter((s) => s.error)
        .map((s) => (
          <p role="status" key={s.id}>
            {s.errorCode}: {s.error}
          </p>
        ))}
      <details>
        <summary>Chia sẻ & phân công</summary>
        <p>
          Chia sẻ công việc sẽ cho thành viên dự án xem đầu vào, prompt, kết quả
          và chi phí. Hội thoại đầy đủ vẫn riêng tư.
        </p>
        <fieldset disabled={busy}>
          <label>
            Dự án
            <select
              value={current.projectId}
              onChange={(e) =>
                setAssignment({
                  projectId: e.target.value,
                  assigneeId: "",
                  reviewerId: "",
                })
              }
            >
              <option value="">Riêng tư</option>
              {projects
                .filter((p) => !p.archived)
                .map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
          {(["assigneeId", "reviewerId"] as const).map((key) => (
            <label key={key}>
              {key === "assigneeId" ? "Người phụ trách" : "Người duyệt"}
              <select
                value={current[key]}
                onChange={(e) =>
                  setAssignment({ ...current, [key]: e.target.value })
                }
              >
                <option value="">Chưa chỉ định</option>
                {project &&
                  [
                    ...new Map(
                      [
                        {
                          id: project.owner,
                          email: "Chủ dự án",
                          role: "manager",
                        },
                        ...project.members,
                      ].map((m) => [m.id, m]),
                    ).values(),
                  ]
                    .filter(
                      (m) =>
                        key !== "reviewerId" ||
                        ["manager", "reviewer"].includes(m.role),
                    )
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.email}
                      </option>
                    ))}
              </select>
            </label>
          ))}
          <Button
            onClick={() =>
              void act(() =>
                agentClient.patch(`/workspace/jobs/${id}/assignment`, {
                  ...(current.projectId
                    ? { projectId: current.projectId }
                    : {}),
                  ...(current.assigneeId
                    ? { assigneeId: current.assigneeId }
                    : {}),
                  ...(current.reviewerId
                    ? { reviewerId: current.reviewerId }
                    : {}),
                  updatedAt: data.run.updatedAt,
                }),
              )
            }
          >
            Lưu phân công
          </Button>
        </fieldset>
      </details>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void act(async () => {
            await agentClient.post(`/workspace/jobs/${id}/comments`, {
              text,
              action,
              ...(assetId ? { assetId } : {}),
            });
            setText("");
          });
        }}
      >
        <fieldset disabled={busy}>
          <label>
            Trao đổi / yêu cầu sửa
            <textarea
              required
              minLength={1}
              maxLength={4000}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <div className="company-grid">
            <label>
              Thao tác
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
              >
                <option value="comment">Nhận xét</option>
                <option value="approved">Duyệt ảnh</option>
                <option value="changes_requested">Yêu cầu sửa ảnh</option>
              </select>
            </label>
            {action !== "comment" && (
              <label>
                Ảnh cần duyệt
                <select
                  required
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                >
                  <option value="">Chọn ảnh</option>
                  {results.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <Button type="submit">{busy ? "Đang gửi…" : "Gửi nhận xét"}</Button>
        </fieldset>
      </form>
      {data.comments.map((c) => (
        <article key={c.id} className="company-card">
          <strong>
            {c.authorEmail} · {c.action}
          </strong>
          <p className="company-text">{c.text}</p>
          <small>{new Date(c.createdAt).toLocaleString("vi-VN")}</small>
        </article>
      ))}
    </div>
  );
}
