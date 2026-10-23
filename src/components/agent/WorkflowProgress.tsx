import { useRef, useState } from "react";
import { agentClient, type Run, type WorkflowExecution } from "../../services/agent.service";
import { Button } from "../ui/button";

export function WorkflowProgress({ execution, run, busy, act, onRun, approvalMode }: {
  execution: WorkflowExecution; run?: Run; busy: boolean; act: (work: () => Promise<unknown>) => void; onRun: (id: string) => void; approvalMode?: Run['approvalMode'];
}) {
  const [answer, setAnswer] = useState("");
  const replanId = useRef<string | null>(null);
  const last = execution.stage === execution.workflow.steps.length - 1;
  return <section className="workflow-progress" aria-label={`Tiến độ ${execution.workflow.name}`}>
    <strong>{execution.workflow.name}</strong><small> · v{execution.workflow.revision}</small>
    <ol>{execution.workflow.steps.map((step, index) => <li key={index} aria-current={execution.stage === index ? "step" : undefined}>{index + 1}. {step.name}</li>)}</ol>
    {!run ? <Button size="sm" variant="outline" disabled={busy} onClick={() => onRun(execution.runIds[execution.stage])}>Mở bước hiện tại</Button>
      : last && run.state === "completed" ? <p>Workflow đã hoàn tất. Kết quả nằm trong thư viện và có thể xuất ZIP.</p>
      : <><p className="context-help">Duyệt kết quả bước hiện tại trước khi chuyển bước. Mỗi bước tiếp theo sẽ tạo kế hoạch để bạn duyệt prompt.</p>
        {!last && <Button size="sm" disabled={busy || run.state !== "completed"} onClick={() => act(async () => {
          const { data } = await agentClient.post<{ run: Run }>(`/workflow-executions/${execution.id}/stages/${execution.stage + 1}`, { approvalMode: approvalMode ?? "manual" });
          onRun(data.run.id);
        })}>Lập kế hoạch bước {execution.stage + 2}</Button>}
        {run.state === "failed" && <form onSubmit={event => { event.preventDefault(); act(async () => {
          replanId.current ??= crypto.randomUUID();
          const { data } = await agentClient.post<{ run: Run }>(`/workflow-executions/${execution.id}/replan`, { id: replanId.current, answer });
          replanId.current = null; setAnswer(""); onRun(data.run.id);
        }); }}>
          <label className="context-label">Bổ sung cho bước hiện tại<textarea className="agent-field" required minLength={3} maxLength={2000} rows={3} value={answer} disabled={busy} onChange={event => { setAnswer(event.target.value); replanId.current = null; }} /></label>
          <Button type="submit" size="sm" disabled={busy || answer.trim().length < 3}>Lập lại kế hoạch bước này</Button>
        </form>}
      </>}
  </section>;
}
