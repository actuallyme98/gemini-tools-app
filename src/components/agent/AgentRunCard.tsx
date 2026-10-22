import { useState } from "react";
import { Check, Download, Loader2, RotateCcw, Square } from "lucide-react";
import {
  agentClient,
  assetBlob,
  assetFilename,
  exportAssets,
  activeRun,
  type Asset,
  type Run,
  type Step,
} from "../../services/agent.service";
import { saveBlob } from "../../utils/download.util";
import { Button } from "../ui/button";
import { AgentImage } from "./AgentImage";

const labels: Record<Run["state"], string> = {
  planning: "Đang phân tích và lập kế hoạch",
  needs_input: "Cần bổ sung thông tin",
  draft: "Chờ kiểm tra final prompt",
  queued: "Đang chờ xử lý",
  running: "Đang xử lý",
  review: "Chờ duyệt kết quả",
  completed: "Đã duyệt",
  partial_failed: "Hoàn thành một phần",
  failed: "Có lỗi",
  cancelled: "Đã dừng tác vụ chưa gửi",
};
const stepLabels: Record<Step["state"], string> = {
  queued: "Đang chờ",
  running: "Đang xử lý",
  done: "Xong",
  failed: "Lỗi",
  interrupted: "Gián đoạn — chưa rõ kết quả",
  cancelled: "Đã dừng",
};
export function AgentRunCard({
  run,
  steps,
  results,
  assets,
  busy,
  act,
  onSource,
}: {
  run: Run;
  steps: Step[];
  results: Asset[];
  assets: Asset[];
  busy: boolean;
  act: (work: () => Promise<unknown>) => void;
  onSource: (id: string) => void;
}) {
  const [drafts, setDrafts] = useState(
    run.items.map(({ title, prompt }) => ({ title, prompt })),
  );
  const [selected, setSelected] = useState<string[]>([]);
  const dirty =
    JSON.stringify(drafts) !==
    JSON.stringify(run.items.map(({ title, prompt }) => ({ title, prompt })));
  const imageSteps = steps.filter((step) => step.type === "image");
  const done = imageSteps.filter((step) => step.state === "done").length;
  const runResults = results.filter((result) => result.runId === run.id);
  const findAsset = (id?: string) =>
    assets.find((asset) => asset.id === id) ??
    results.find((asset) => asset.id === id);
  return (
    <article
      className="min-w-0 space-y-4 rounded-xl border bg-white p-4 sm:p-5"
      aria-label={`Công việc ${run.brief.slice(0, 60)}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-semibold">
            {activeRun(run) && (
              <Loader2
                aria-hidden="true"
                className="size-4 animate-spin motion-reduce:animate-none"
              />
            )}
            {labels[run.state]}
          </p>
          <p className="mt-1 break-words text-sm text-gray-600">
            {run.summary || run.brief}
          </p>
          <p className="mt-1 break-all text-xs text-gray-500">
            Mã công việc: {run.id}
          </p>
        </div>
        {(activeRun(run) ||
          run.state === "draft" ||
          run.state === "needs_input") && (
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() =>
              act(() => agentClient.post(`/runs/${run.id}/cancel`))
            }
          >
            <Square aria-hidden="true" />
            Dừng
          </Button>
        )}
      </div>
      {!!run.questions.length && (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
          <p className="font-medium">Trả lời trong chat để lập kế hoạch mới:</p>
          <ul className="mt-2 list-disc pl-5">
            {run.questions.map((question, i) => (
              <li key={i}>{question}</li>
            ))}
          </ul>
        </div>
      )}
      {!!run.researchSources?.length && (
        <details className="text-sm">
          <summary className="cursor-pointer">
            Nguồn nghiên cứu được cung cấp
          </summary>
          <ul className="mt-2 space-y-1">
            {run.researchSources.map((source, index) => (
              <li key={index}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-blue-700 underline"
                >
                  {source.title}
                </a>{" "}
                — {new Date(source.retrievedAt).toLocaleDateString("vi-VN")}
              </li>
            ))}
          </ul>
        </details>
      )}
      {run.state !== "planning" &&
        run.state !== "needs_input" &&
        run.items.map((item, index) => (
          <details
            key={index}
            open={run.state === "draft"}
            className="min-w-0 rounded-lg border p-3"
          >
            <summary className="cursor-pointer break-words text-sm font-medium">
              {index + 1}. {item.title || "Kết quả"} — Final prompt
            </summary>
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["Ảnh nguồn", item.sourceId],
                    ["Ảnh đích", item.targetId],
                  ] as const
                ).map(([label, id]) => {
                  const asset = findAsset(id);
                  return asset ? (
                    <div key={label}>
                      <p className="mb-1 text-xs font-medium">
                        {label}: {asset.name}
                      </p>
                      <AgentImage
                        id={asset.id}
                        name={`${label}: ${asset.name}`}
                        className="max-h-40"
                      />
                    </div>
                  ) : null;
                })}
              </div>
              {run.operation === "mockup_template" && (
                <p className="text-sm text-blue-800">
                  Ghép theo vùng in đã cấu hình; prompt mô tả công việc và không
                  điều khiển phép ghép.
                </p>
              )}
              <label className="block text-sm">
                Tên kết quả {index + 1}
                <input
                  className="mt-1 w-full rounded-md border p-2"
                  value={drafts[index]?.title ?? ""}
                  maxLength={200}
                  disabled={run.state !== "draft" || busy}
                  onChange={(event) =>
                    setDrafts((current) =>
                      current.map((draft, i) =>
                        i === index
                          ? { ...draft, title: event.target.value }
                          : draft,
                      ),
                    )
                  }
                />
              </label>
              <label className="block text-sm">
                Final prompt {index + 1}
                <textarea
                  aria-label={`Final prompt ${index + 1}`}
                  className="mt-1 min-h-48 w-full rounded-md border p-3 text-sm leading-relaxed"
                  value={drafts[index]?.prompt ?? ""}
                  maxLength={22000}
                  readOnly={run.state !== "draft" || busy}
                  onChange={(event) =>
                    setDrafts((current) =>
                      current.map((draft, i) =>
                        i === index
                          ? { ...draft, prompt: event.target.value }
                          : draft,
                      ),
                    )
                  }
                />
              </label>
            </div>
          </details>
        ))}
      {run.state === "draft" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            {run.count} kết quả ·{" "}
            {run.operation === "mockup_template"
              ? "Ghép template không gọi model tạo ảnh."
              : `Dùng model ${run.imageModel || "đã cấu hình"}. Mỗi lần tạo ảnh có thể phát sinh phí.`}{" "}
            Quy tắc vai trò ảnh và không tạo watermark luôn được hiển thị trong
            final prompt đã lưu.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={
                busy ||
                !dirty ||
                drafts.some((item) => !item.prompt.trim() || !item.title.trim())
              }
              onClick={() =>
                act(() =>
                  agentClient.patch(`/runs/${run.id}/plan`, {
                    updatedAt: run.updatedAt,
                    items: drafts,
                  }),
                )
              }
            >
              Lưu final prompt
            </Button>
            <Button
              disabled={busy || dirty}
              onClick={() =>
                act(() =>
                  agentClient.post(`/runs/${run.id}/start`, {
                    updatedAt: run.updatedAt,
                  }),
                )
              }
            >
              Bắt đầu xử lý {run.count} ảnh
            </Button>
          </div>
          {dirty && (
            <p className="text-sm text-amber-800">
              Lưu chỉnh sửa và kiểm tra final prompt trước khi bắt đầu.
            </p>
          )}
        </div>
      )}
      {!!imageSteps.length && (
        <div>
          <p className="mb-2 text-sm">
            Tiến độ: {done}/{run.count} kết quả
          </p>
          <progress
            className="h-2 w-full"
            value={done}
            max={run.count}
            aria-label="Tiến độ tạo ảnh"
          />
        </div>
      )}
      {steps
        .filter((step) => ["failed", "interrupted"].includes(step.state))
        .map((step) => (
          <div
            key={step.id}
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"
          >
            <p>
              {step.type === "plan" ? "Lập kế hoạch" : `Ảnh ${step.index + 1}`}:{" "}
              {step.error}
            </p>
            <p className="mt-1 break-all text-xs">
              {step.errorCode} · Mã yêu cầu: {step.requestId}
            </p>
          </div>
        ))}
      <div className="grid gap-4 sm:grid-cols-2">
        {imageSteps.map((step) => {
          const asset = results.find((result) => result.id === step.resultId);
          return (
            <div
              key={step.id}
              className="min-w-0 space-y-2 rounded-lg border p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  Ảnh {step.index + 1} · {stepLabels[step.state]}
                </p>
                {["done", "failed", "interrupted", "cancelled"].includes(
                  step.state,
                ) && (
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={selected.includes(step.id)}
                      onChange={(event) =>
                        setSelected((current) =>
                          event.target.checked
                            ? [...current, step.id]
                            : current.filter((id) => id !== step.id),
                        )
                      }
                    />
                    Chọn làm lại
                  </label>
                )}
              </div>
              {asset && (
                <>
                  <AgentImage id={asset.id} name={asset.name} />
                  <p className="break-words text-xs text-gray-600">
                    {asset.width} × {asset.height} · Phiên bản {asset.revision}
                  </p>
                  <p className="text-xs text-gray-700">
                    {asset.checks?.visual === "pass"
                      ? "AI chưa phát hiện sai lệch rõ ràng."
                      : asset.checks?.visual === "review"
                        ? "Cần kiểm tra kết quả."
                        : "Chưa kiểm tra bằng AI."}{" "}
                    Vẫn cần duyệt thủ công.
                  </p>
                  {!!asset.checks?.notes.length && (
                    <ul className="list-disc pl-4 text-xs text-gray-600">
                      {asset.checks.notes.map((note, i) => (
                        <li key={i}>{note}</li>
                      ))}
                    </ul>
                  )}
                  <label className="block text-sm">
                    Duyệt ảnh {step.index + 1}
                    <select
                      aria-label={`Duyệt ảnh ${step.index + 1}`}
                      className="mt-1 w-full rounded-md border p-2"
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
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        act(async () =>
                          saveBlob(
                            await assetBlob(asset.id),
                            assetFilename(asset),
                          ),
                        )
                      }
                    >
                      <Download aria-hidden="true" />
                      Tải ảnh
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy || activeRun(run)}
                      onClick={() => onSource(asset.id)}
                    >
                      Dùng làm nguồn
                    </Button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        {!!selected.length && !activeRun(run) && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              act(async () => {
                await agentClient.post(`/runs/${run.id}/retry`, {
                  id: crypto.randomUUID(),
                  stepIds: selected,
                });
                setSelected([]);
              })
            }
          >
            <RotateCcw aria-hidden="true" />
            Tạo bản nháp từ {selected.length} ảnh đã chọn
          </Button>
        )}
        {!!runResults.length && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              act(() => exportAssets(runResults, run.conversationId))
            }
          >
            <Download aria-hidden="true" />
            Xuất bộ ảnh ZIP
          </Button>
        )}
        {run.state === "completed" && (
          <span className="inline-flex items-center gap-1 text-sm text-green-800">
            <Check aria-hidden="true" className="size-4" />
            Đã duyệt toàn bộ
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500">
        Dừng chỉ chặn tác vụ chưa gửi. Request đã tới model có thể vẫn chạy; hệ
        thống không tự tạo lại ảnh khi chưa rõ kết quả.
      </p>
    </article>
  );
}
