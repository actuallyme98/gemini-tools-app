import { useEffect, useId } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { useAIProvider } from "../hooks/use-ai-provider";

export function AIImageModelSelect() {
  const id = useId();
  const {
    imageModel,
    imageModels,
    imageModelsLoading,
    imageModelsError,
    selectImageModel,
    refreshImageModels,
    isProcessingRequest,
  } = useAIProvider();
  const missing =
    !!imageModel &&
    !imageModels?.models.some((model) => model.id === imageModel);
  useEffect(() => {
    if (!imageModelsLoading && imageModels && missing)
      toast.warning("Model đã lưu không còn khả dụng. Hãy chọn model khác.", {
        id: "saved-image-model-unavailable",
      });
    else toast.dismiss("saved-image-model-unavailable");
  }, [imageModelsLoading, imageModels, missing]);
  const modelGroups = [
    {
      label: "Google · Gemini",
      matches: (id: string) => id.startsWith("gemini-"),
    },
    {
      label: "OpenAI · GPT Image",
      matches: (id: string) => id.startsWith("gpt-image-"),
    },
    {
      label: "xAI · Grok Imagine",
      matches: (id: string) => id.startsWith("grok-imagine-image"),
    },
    {
      label: "Model khác",
      matches: (id: string) =>
        !/^(gemini-|gpt-image-|grok-imagine-image)/.test(id),
    },
  ];
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-gray-900">
          Model tạo / sửa ảnh
        </label>
        <button
          type="button"
          onClick={refreshImageModels}
          disabled={imageModelsLoading || isProcessingRequest}
          aria-label="Tải lại danh sách model ảnh"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50"
        >
          <RefreshCw
            aria-hidden="true"
            className={`h-4 w-4 ${imageModelsLoading ? "motion-safe:animate-spin" : ""}`}
          />
        </button>
      </div>
      <select
        id={id}
        value={imageModel || ""}
        onChange={(event) => selectImageModel(event.target.value)}
        disabled={
          imageModelsLoading ||
          !imageModels?.models.length ||
          isProcessingRequest
        }
        aria-describedby={`${id}-help ${id}-status`}
        className="min-h-11 w-full min-w-0 rounded-lg border border-brand-200 bg-white pl-2 pr-8 text-base md:text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60"
      >
        <option value="" disabled>
          {imageModelsLoading ? "Đang tải model…" : "Chọn model ảnh"}
        </option>
        {missing && (
          <option value={imageModel} disabled>
            {imageModel} ({imageModels ? "không khả dụng" : "chưa xác minh"})
          </option>
        )}
        {modelGroups.map((group) => {
          const models = imageModels?.models.filter((model) =>
            group.matches(model.id),
          );
          return models?.length ? (
            <optgroup key={group.label} label={group.label}>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                  {model.id === imageModels?.defaultModel ? " (mặc định)" : ""}
                </option>
              ))}
            </optgroup>
          ) : null;
        })}
      </select>
      <div
        id={`${id}-status`}
        role="status"
        aria-live="polite"
        className="text-xs text-gray-600 break-words"
      >
        {imageModelsLoading ? (
          <p>Đang lấy danh sách từ Provider 1…</p>
        ) : imageModelsError ? (
          <p>Chưa tải được danh sách model. Bấm tải lại để thử lại.</p>
        ) : missing ? null : !imageModels?.models.length ? (
          <p>Chưa có model tạo/chỉnh ảnh tương thích.</p>
        ) : imageModel ? (
          <p className="break-all">Đang chọn: {imageModel}</p>
        ) : (
          <p>Chọn một model để bắt đầu tạo ảnh.</p>
        )}
      </div>
      <p id={`${id}-help`} className="text-xs text-gray-500">
        Chỉ hiển thị model hỗ trợ tạo và chỉnh sửa ảnh. Agent dùng model phân
        tích riêng để đọc ảnh và lập kế hoạch.
        {imageModel?.startsWith("grok-imagine-image") &&
          " Grok nhận tối đa 5 ảnh, gồm sản phẩm gốc và 4 ảnh tham chiếu."}
      </p>
    </div>
  );
}
