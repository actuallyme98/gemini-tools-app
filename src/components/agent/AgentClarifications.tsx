import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { PlanQuestion, Run } from "../../services/agent.service";
import { Button } from "../ui/button";

export function AgentClarifications({
  run,
  disabled,
  inputs,
  onInputs,
  onAnswer,
  selectionKey,
}: {
  run: Run;
  disabled: boolean;
  inputs: { source: number; reference: number; template: number };
  onInputs: () => void;
  onAnswer: (answer: string, id: string) => Promise<boolean>;
  selectionKey: string;
}) {
  const questions: PlanQuestion[] = run.clarifications?.length
    ? run.clarifications
    : run.questions.map((question) => ({ question, options: [] }));
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [custom, setCustom] = useState<Record<number, string>>({});
  const [sending, setSending] = useState(false);
  const requestId = useRef<string | null>(null);
  useEffect(() => {
    requestId.current = null;
  }, [selectionKey]);
  const ready = (index: number) => {
    const input = questions[index].input;
    return input
      ? input === "single_source"
        ? inputs.source <= 1
        : inputs[input] > 0
      : !!(answers[index] === "custom"
          ? custom[index]?.trim()
          : answers[index]);
  };
  const update = (index: number, value: string, freeText = false) => {
    requestId.current = null;
    (freeText ? setCustom : setAnswers)((previous) => ({
      ...previous,
      [index]: value,
    }));
  };
  return (
    <form
      className="agent-clarifications"
      aria-label="Bổ sung thông tin cho Agent"
      onSubmit={(event) => {
        event.preventDefault();
        if (disabled || sending || !questions.every((_, i) => ready(i))) return;
        requestId.current ??= crypto.randomUUID();
        const answer = questions
          .map(
            (question, i) =>
              `${i + 1}. ${question.question}\nTrả lời: ${question.input ? "Đã cập nhật ảnh/template trong ngữ cảnh; sử dụng các tệp đang chọn." : answers[i] === "custom" ? custom[i].trim() : answers[i]}`,
          )
          .join("\n\n");
        setSending(true);
        void onAnswer(answer, requestId.current).finally(() =>
          setSending(false),
        );
      }}
    >
      <div>
        <strong>Agent cần bạn xác nhận</strong>
        <p>
          Chọn câu trả lời cho từng câu hỏi rồi gửi. Kế hoạch mới vẫn cần bạn
          duyệt trước khi tạo ảnh.
        </p>
      </div>
      {questions.map((question, index) => (
        <fieldset key={index} disabled={disabled || sending}>
          <legend>
            {index + 1}. {question.question}
          </legend>
          {question.input ? (
            <div className="clarification-input">
              <p>
                {ready(index)
                  ? "Đã có tệp phù hợp trong ngữ cảnh."
                  : "Hãy bổ sung hoặc đổi tệp trong Ngữ cảnh & tệp."}
              </p>
              <Button type="button" variant="outline" onClick={onInputs}>
                Chọn ảnh / template
              </Button>
            </div>
          ) : (
            <>
              {(question.options.length
                ? question.options
                : [
                    {
                      label: "Giữ yêu cầu gốc và dùng thiết lập hiện tại",
                      description:
                        "Agent tiếp tục bằng các công cụ đã tích hợp.",
                    },
                  ]
              ).map((option, i) => (
                <label className="clarification-option" key={i}>
                  <input
                    type="radio"
                    name={`${run.id}-question-${index}`}
                    value={option.label}
                    checked={answers[index] === option.label}
                    onChange={() => update(index, option.label)}
                  />
                  <span>
                    <span>
                      {option.label} {i === 0 && <small>Đề xuất</small>}
                    </span>
                    {option.description && (
                      <span className="option-description">
                        {option.description}
                      </span>
                    )}
                  </span>
                </label>
              ))}
              <label className="clarification-option">
                <input
                  type="radio"
                  name={`${run.id}-question-${index}`}
                  checked={answers[index] === "custom"}
                  onChange={() => update(index, "custom")}
                />
                <span>Ý khác</span>
              </label>
              {answers[index] === "custom" && (
                <label className="context-label">
                  Câu trả lời khác cho câu {index + 1}
                  <textarea
                    className="agent-field"
                    required
                    maxLength={1000}
                    rows={3}
                    value={custom[index] ?? ""}
                    onChange={(event) =>
                      update(index, event.target.value, true)
                    }
                  />
                </label>
              )}
            </>
          )}
        </fieldset>
      ))}
      <Button
        type="submit"
        disabled={disabled || sending || !questions.every((_, i) => ready(i))}
      >
        {sending && (
          <Loader2 className="studio-loading-spinner" aria-hidden="true" />
        )}
        {sending ? "Đang gửi câu trả lời…" : "Gửi câu trả lời"}
      </Button>
    </form>
  );
}
