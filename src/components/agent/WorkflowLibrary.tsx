import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Workflow, X } from "lucide-react";
import { agentClient, type CustomWorkflow, type WorkflowStep } from "../../services/agent.service";
import { Button } from "../ui/button";
import { WorkspaceHeading } from "./AgentWorkspaceViews";
import "../../styles/workflows.css";

const names = { design: "Ý tưởng & thiết kế", mockup_ai: "Mockup bằng AI", mockup_template: "Ghép lên template" };
const newStep = (): WorkflowStep => ({ name: "Tạo thiết kế", operation: "design", instructions: "Tạo thiết kế phù hợp với yêu cầu và nhóm sản phẩm.", source: "initial", count: 1 });

export function WorkflowLibrary({ workflows, busy, act, onUse }: {
  workflows: CustomWorkflow[]; busy: boolean; act: (work: () => Promise<unknown>) => void; onUse: (workflow: CustomWorkflow) => void;
}) {
  const [editing, setEditing] = useState<CustomWorkflow | null>();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<WorkflowStep[]>([newStep()]);
  const open = (workflow?: CustomWorkflow) => { setEditing(workflow ?? null); setName(workflow?.name ?? ""); setDescription(workflow?.description ?? ""); setSteps(workflow?.steps.map(step => ({ ...step })) ?? [newStep()]); };
  const change = (index: number, values: Partial<WorkflowStep>) => setSteps(previous => previous.map((step, i) => i === index ? { ...step, ...values } : step));
  const move = (index: number, direction: number) => setSteps(previous => {
    const next = [...previous]; [next[index], next[index + direction]] = [next[index + direction], next[index]];
    return next.map((step, i) => i === 0 ? { ...step, source: "initial" } : step);
  });
  return <section className="workflow-workspace">
    <WorkspaceHeading eyebrow="QUY TRÌNH CỦA BẠN" title="Custom workflows" description="Biến cách làm quen thuộc thành quy trình có thể dùng lại. Mỗi bước đều có duyệt prompt và kết quả." />
    <div className="workflow-toolbar"><p>{workflows.filter(workflow => !workflow.archived).length} workflow đang sử dụng</p><Button disabled={busy || editing !== undefined} onClick={() => open()}><Plus aria-hidden="true" />Tạo workflow</Button></div>
    {editing !== undefined && <form className="workflow-editor" onSubmit={event => {
      event.preventDefault(); act(async () => {
        const input = { name, description, steps, archived: false };
        if (editing) await agentClient.patch(`/workflows/${editing.id}`, { ...input, updatedAt: editing.updatedAt });
        else await agentClient.post("/workflows", input);
        setEditing(undefined);
      });
    }}>
      <div className="workflow-editor-heading"><div><p className="eyebrow">THIẾT KẾ QUY TRÌNH</p><h2>{editing ? "Chỉnh sửa workflow" : "Workflow mới"}</h2></div><Button variant="ghost" type="button" disabled={busy} onClick={() => setEditing(undefined)}>Đóng</Button></div>
      <label className="context-label">Tên workflow<input className="agent-field" required minLength={3} maxLength={120} value={name} disabled={busy} onChange={event => setName(event.target.value)} /></label>
      <label className="context-label">Mô tả<textarea className="agent-field" maxLength={1000} value={description} disabled={busy} onChange={event => setDescription(event.target.value)} /></label>
      <ol className="workflow-steps">{steps.map((step, index) => <li key={index} className="workflow-step">
        <div className="workflow-step-heading"><span className="workflow-number">{String(index + 1).padStart(2, "0")}</span><strong>Bước {index + 1}</strong><div>
          <Button type="button" size="icon" variant="ghost" aria-label={`Đưa bước ${index + 1} lên`} disabled={busy || index === 0} onClick={() => move(index, -1)}><ArrowUp size={16} aria-hidden="true" /></Button>
          <Button type="button" size="icon" variant="ghost" aria-label={`Đưa bước ${index + 1} xuống`} disabled={busy || index === steps.length - 1} onClick={() => move(index, 1)}><ArrowDown size={16} aria-hidden="true" /></Button>
          <Button type="button" size="icon" variant="ghost" aria-label={`Xóa bước ${index + 1}`} disabled={busy || steps.length === 1} onClick={() => setSteps(previous => previous.filter((_, i) => i !== index).map((value, i) => i === 0 ? { ...value, source: "initial" } : value))}><X size={16} aria-hidden="true" /></Button>
        </div></div>
        <div className="workflow-grid"><label className="context-label">Tên bước<input className="agent-field" required maxLength={100} value={step.name} disabled={busy} onChange={event => change(index, { name: event.target.value })} /></label>
        <label className="context-label">Tác vụ<select aria-label="Tác vụ" className="agent-field" value={step.operation} disabled={busy} onChange={event => change(index, { operation: event.target.value as WorkflowStep["operation"] })}>{Object.entries(names).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="context-label">Ảnh nguồn<select aria-label="Ảnh nguồn" className="agent-field" value={step.source} disabled={busy || index === 0} onChange={event => change(index, { source: event.target.value as WorkflowStep["source"] })}><option value="initial">Đầu vào ban đầu</option>{index > 0 && <option value="previous">Kết quả đã duyệt của bước trước</option>}</select></label>
        {step.operation === "design" && <label className="context-label">Số biến thể / mỗi ảnh nguồn<input className="agent-field" required type="number" min={1} max={20} value={step.count} disabled={busy} onChange={event => change(index, { count: Number(event.target.value) })} /></label>}</div>
        <label className="context-label">Hướng dẫn xử lý<textarea aria-label="Hướng dẫn xử lý" className="agent-field" required minLength={3} maxLength={6000} rows={3} value={step.instructions} disabled={busy} onChange={event => change(index, { instructions: event.target.value })} /></label>
        <p className="context-help">{step.operation === "design" ? "Dùng ảnh nguồn để tạo biến thể; bỏ trống đầu vào để tạo thiết kế mới." : "Ảnh tham chiếu / template được chọn lúc giao việc. Mỗi cặp ảnh tạo một kết quả."}</p>
      </li>)}</ol>
      <div className="workflow-toolbar"><Button variant="outline" type="button" disabled={busy || steps.length >= 8} onClick={() => setSteps(previous => [...previous, { ...newStep(), source: "previous" }])}><Plus aria-hidden="true" />Thêm bước</Button><Button type="submit" disabled={busy}>Lưu workflow</Button></div>
      <p className="context-help">Tối đa 8 bước, 20 kết quả mỗi bước. Phiên chạy giữ bản chụp workflow; chỉnh sửa không ảnh hưởng công việc đã tạo.</p>
    </form>}
    <div className="workflow-cards">{workflows.map(workflow => <article key={workflow.id} className={`workflow-card ${workflow.archived ? "workflow-archived" : ""}`}>
      <div className="workflow-card-icon"><Workflow size={22} aria-hidden="true" /></div><small>PHIÊN BẢN {workflow.revision}{workflow.archived ? " · ĐÃ LƯU TRỮ" : ""}</small><h2>{workflow.name}</h2><p>{workflow.description || "Quy trình cá nhân"}</p>
      <ol>{workflow.steps.map((step, index) => <li key={index}><span>{index + 1}</span><div><strong>{step.name}</strong><small>{names[step.operation]} · {step.source === "previous" ? "Nhận kết quả bước trước" : "Đầu vào ban đầu"}</small></div></li>)}</ol>
      <div className="workflow-card-actions"><Button disabled={busy || workflow.archived} onClick={() => onUse(workflow)}>Sử dụng</Button><Button variant="outline" disabled={busy || editing !== undefined} onClick={() => open(workflow)}>Sửa</Button><Button variant="ghost" disabled={busy} onClick={() => act(async () => { await agentClient.patch(`/workflows/${workflow.id}`, { name: workflow.name, description: workflow.description, steps: workflow.steps, archived: !workflow.archived, updatedAt: workflow.updatedAt }); })}>{workflow.archived ? "Khôi phục" : "Lưu trữ"}</Button></div>
    </article>)}</div>
    {!workflows.length && editing === undefined && <div className="workflow-empty"><Workflow size={32} aria-hidden="true" /><h2>Tạo quy trình đầu tiên</h2><p>Ví dụ: tạo thiết kế → ghép lên template → duyệt và xuất bộ ảnh.</p></div>}
  </section>;
}
