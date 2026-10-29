import { Check, Loader2, ScanEye, Lightbulb } from "lucide-react";
import {
  studioLabels,
  type StudioPlanStep,
} from "../../services/studio.service";

export function CreativePlan({
  steps,
  ticketId,
}: {
  steps: StudioPlanStep[];
  ticketId: string;
}) {
  const plans = steps.filter((step) => step.ticketId === ticketId);
  if (!plans.length) return null;
  const analysis = plans.find((step) => step.phase === "analysis");
  const briefs = plans.find((step) => step.phase === "briefs");
  return (
    <section className="studio-card studio-creative-plan">
      <h2>Chuẩn bị sáng tạo</h2>
      <p>
        Agent phân tích ảnh trước, lập brief cho từng mẫu, sau đó mới tạo ảnh.
        Nhận xét của AI cần được con người kiểm tra.
      </p>
      <ol className="studio-plan-progress">
        {[
          { step: analysis, title: "Phân tích ảnh", Symbol: ScanEye },
          { step: briefs, title: "Lập brief từng mẫu", Symbol: Lightbulb },
        ].map(({ step, title, Symbol }) => {
          return (
            <li key={title}>
              {step?.state === "done" ? (
                <Check size={17} aria-hidden="true" />
              ) : step && ["preparing", "submitted"].includes(step.state) ? (
                <Loader2
                  className="animate-spin"
                  size={17}
                  aria-hidden="true"
                />
              ) : (
                <Symbol size={17} aria-hidden="true" />
              )}
              <strong>{title}</strong>
              <span>
                {step
                  ? step.state === "done"
                    ? step.phase === "analysis"
                      ? "Đã phân tích"
                      : "Đã lập brief"
                    : (studioLabels[step.state] ?? step.state)
                  : "Chờ phân tích ảnh"}
              </span>
            </li>
          );
        })}
      </ol>
      {plans
        .filter((step) => step.error)
        .map((step) => (
          <p key={step.id} className="studio-error" role="alert">
            {step.error} Chưa tạo ảnh nếu bước chuẩn bị chưa hoàn tất.
          </p>
        ))}
      {analysis?.analysis && (
        <details open>
          <summary>Nhận xét từ ảnh đầu vào</summary>
          <p className="studio-prewrap">{analysis.analysis.summary}</p>
          <dl className="studio-summary">
            <div>
              <dt>Giữ lại</dt>
              <dd>{analysis.analysis.invariants.join("; ") || "Không nêu"}</dd>
            </div>
            <div>
              <dt>Có thể thay đổi</dt>
              <dd>{analysis.analysis.editable.join("; ") || "Không nêu"}</dd>
            </div>
            <div>
              <dt>Không chuyển theo</dt>
              <dd>
                {analysis.analysis.sourceArtifacts.join("; ") || "Không nêu"}
              </dd>
            </div>
          </dl>
          {!!analysis.analysis.risks.length && (
            <p className="studio-note">
              Cần kiểm tra: {analysis.analysis.risks.join("; ")}
            </p>
          )}
        </details>
      )}
      {briefs?.briefs && (
        <div className="studio-brief-grid">
          {briefs.briefs.map((brief, index) => (
            <details key={`${index}-${brief.title}`}>
              <summary>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {brief.title}
              </summary>
              <p>{brief.direction}</p>
              <dl>
                <dt>Bố cục</dt>
                <dd>{brief.composition}</dd>
                <dt>Màu sắc</dt>
                <dd>{brief.palette}</dd>
              </dl>
              <details>
                <summary>Xem chỉ dẫn tạo ảnh của mẫu này</summary>
                <p className="studio-prewrap">{brief.prompt}</p>
              </details>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
