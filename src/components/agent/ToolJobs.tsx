import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { agentClient } from "../../services/agent.service";
import { getErrorMessage } from "../../services/api.service";
import { Button } from "../ui/button";

type ToolJob = { id: string; requestId: string; state: string; createdAt: string; result?: unknown; error?: { message?: string } };
const labels: Record<string, string> = { preparing: "Đang lưu đầu vào", queued: "Đang chờ", running: "Đang xử lý", done: "Hoàn tất", failed: "Thất bại", interrupted: "Cần kiểm tra", cancelled: "Đã hủy" };
function urls(result: unknown): string[] {
  if (typeof result === "string") return /^https?:\/\//.test(result) ? [result] : [];
  if (Array.isArray(result)) return result.flatMap(urls);
  if (result && typeof result === "object") return ["url", "results"].flatMap(key => urls((result as Record<string, unknown>)[key]));
  return [];
}
export function ToolJobs() {
  const [jobs, setJobs] = useState<ToolJob[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState("");
  useEffect(() => {
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const response = await agentClient.get<ToolJob[]>("../image-jobs", { signal: controller.signal });
        if (!controller.signal.aborted) { setJobs(response.data); setError(""); }
      } catch (cause) { if (!controller.signal.aborted) setError(getErrorMessage(cause)); }
      finally { if (!controller.signal.aborted) { setLoading(false); timer = setTimeout(() => void poll(), 5000); } }
    };
    void poll(); return () => { controller.abort(); clearTimeout(timer); };
  }, [revision]);
  return <section className="workspace-page tool-job-history" aria-label="Tác vụ công cụ">
    <div className="workflow-toolbar"><div><h2 className="text-xl font-semibold">Tác vụ công cụ</h2><p>100 công việc gần nhất của bạn, dùng chung giữa các tab. Đóng tab không xóa việc đã tiếp nhận.</p></div>
      <Button variant="outline" size="sm" onClick={() => setRevision(value => value + 1)}><RefreshCw size={15} aria-hidden="true" />Làm mới tác vụ</Button></div>
    {loading && <p role="status"><Loader2 className="studio-loading-spinner inline" size={16} aria-hidden="true" /> Đang tải…</p>}
    {error && <p role="alert" className="workspace-alert">{error}</p>}
    {!loading && !error && !jobs.length && <p className="context-help">Chưa có tác vụ từ Mockup Studio, Mockup Generator hoặc Idea Generator.</p>}
    <div className="job-list">{jobs.map(job => <article className="job-list-item flex-wrap" key={job.id}>
      <div className="job-list-title"><strong>Tác vụ {job.id.slice(0, 8)}</strong><small>{new Date(job.createdAt).toLocaleString("vi-VN")} · Mã yêu cầu: {job.requestId}</small>
        {job.error?.message && <p className="text-sm text-red-700">{job.error.message}</p>}</div>
      <span className="status-pill">{labels[job.state] || job.state}</span>
      {urls(job.result).map((url, index) => <a className="text-action" key={`${url}:${index}`} href={url} target="_blank" rel="noopener noreferrer">Mở kết quả {index + 1}</a>)}
      {["preparing", "queued"].includes(job.state) && <Button size="sm" variant="outline" disabled={!!busy} onClick={() => {
        setBusy(job.id); void agentClient.post(`../image-jobs/${job.id}/cancel`).then(() => setRevision(value => value + 1)).catch(cause => setError(getErrorMessage(cause))).finally(() => setBusy(""));
      }}>{busy === job.id ? "Đang hủy…" : "Hủy tác vụ"}</Button>}
    </article>)}</div>
  </section>;
}
