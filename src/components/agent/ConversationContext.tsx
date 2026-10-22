import { useState } from "react";
import { agentClient, type Detail } from "../../services/agent.service";
import { Button } from "../ui/button";

export function ConversationContext({ detail, busy, act }: { detail: Detail; busy: boolean; act: (work: () => Promise<unknown>) => void }) {
  const [pins, setPins] = useState((detail.conversation.pinnedRequirements ?? []).join("\n"));
  const [dirty, setDirty] = useState(false);
  const context = detail.runs.at(-1)?.context;
  return <details className="context-details conversation-memory">
    <summary>Bộ nhớ & yêu cầu ghim {detail.memory ? "· Đã compact" : "· Hội thoại mới"}</summary>
    <p className="context-help">Lịch sử gốc được lưu đầy đủ. Model nhận yêu cầu ghim, bản tóm tắt và tin nhắn gần nhất.</p>
    {context && <p className="context-help">~{context.estimatedTokens.toLocaleString()} / {context.budget.toLocaleString()} token ước tính · {context.summarizedMessages} tin đã tóm tắt. Đây không phải số token tính phí.</p>}
    <label className="context-label" htmlFor="conversation-pins">Yêu cầu luôn áp dụng (mỗi dòng một yêu cầu)</label>
    <textarea id="conversation-pins" className="agent-field" rows={4} value={pins} maxLength={20000} disabled={busy}
      onChange={event => { setPins(event.target.value); setDirty(true); }} />
    <Button size="sm" disabled={busy || !dirty} onClick={() => act(async () => {
      await agentClient.patch(`/conversations/${detail.conversation.id}/context`, {
        pinnedRequirements: pins.split("\n").map(line => line.trim()).filter(Boolean), updatedAt: detail.conversation.updatedAt,
      }); setDirty(false);
    })}>Lưu yêu cầu ghim</Button>
    {detail.memory && <><h3>Bản tóm tắt đang dùng</h3><p className="message-text">{detail.memory.summary}</p>
      <small>{detail.memory.messageCount} tin nhắn · {new Date(detail.memory.updatedAt).toLocaleString("vi-VN")}</small></>}
    <p className="context-help">Thay đổi yêu cầu ghim áp dụng khi lập kế hoạch tiếp theo; prompt đã duyệt không tự thay đổi.</p>
  </details>;
}
