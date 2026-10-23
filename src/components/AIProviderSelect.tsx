import { useEffect, useId } from "react";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { useAIProvider } from "../hooks/use-ai-provider";
import {
  DEFAULT_AI_PROVIDER,
  getAIProviderLabel,
  isVisibleAIProvider,
} from "../utils/ai-provider.util";

export function AIProviderSelect() {
  const id = useId();
  const {
    catalog,
    provider,
    selectProvider,
    loading,
    error,
    retry,
    savedProviderUnavailable,
    isProcessingRequest,
  } = useAIProvider();
  useEffect(() => {
    if (savedProviderUnavailable)
      toast.warning("Provider đã lưu không khả dụng. Hãy chọn provider khác.", {
        id: "saved-provider-unavailable",
      });
    else toast.dismiss("saved-provider-unavailable");
  }, [savedProviderUnavailable]);
  const routing = catalog?.providers.find(
    (entry) => entry.id === provider,
  )?.routing;
  const visibleProviders = (catalog?.providers ?? [])
    .filter((entry) => isVisibleAIProvider(entry.id))
    .sort(
      (a, b) =>
        Number(b.id === DEFAULT_AI_PROVIDER) -
        Number(a.id === DEFAULT_AI_PROVIDER),
    );

  return (
    <div className="provider-select space-y-2 min-w-0">
      <label htmlFor={id} className="block text-sm font-medium text-gray-900">
        Provider AI
      </label>
      <div className="relative">
        <select
          id={id}
          value={provider}
          onChange={(event) => selectProvider(event.target.value)}
          disabled={loading || isProcessingRequest}
          aria-describedby={`${id}-status ${id}-help`}
          className="h-11 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-9 text-base md:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
        >
          {provider &&
            isVisibleAIProvider(provider) &&
            !visibleProviders.some((entry) => entry.id === provider) && (
              <option value={provider} disabled>
                {getAIProviderLabel(provider)} (chưa xác minh)
              </option>
            )}
          {visibleProviders.map((entry) => (
            <option key={entry.id} value={entry.id} disabled={!entry.available}>
              {getAIProviderLabel(entry.id)}
              {!entry.available
                ? " (chưa cấu hình)"
                : entry.id === DEFAULT_AI_PROVIDER
                  ? " (mặc định)"
                  : ""}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-3 h-5 w-5 text-blue-600"
        />
      </div>
      <div
        id={`${id}-status`}
        role="status"
        aria-live="polite"
        className="text-xs text-gray-600 space-y-1"
      >
        {isProcessingRequest && (
          <p className="text-blue-700">
            Đang xử lý yêu cầu. Provider và model tạm khóa.
          </p>
        )}
        {loading ? (
          <p>Đang tải provider…</p>
        ) : error ? (
          <>
            <p>Không tải được danh sách. Lựa chọn hiện tại được giữ nguyên.</p>
          </>
        ) : (
          <>
            {routing && (
              <>
                <p>
                  Văn bản:{" "}
                  {catalog?.textRouting
                    ? "Tự động (có dự phòng)"
                    : getAIProviderLabel(routing.text)}
                </p>
                <p>Phân tích ảnh: {getAIProviderLabel(routing.vision)}</p>
                <p>Tạo / sửa ảnh: {getAIProviderLabel(routing.image)}</p>
              </>
            )}
          </>
        )}
      </div>
      {error && (
        <button
          type="button"
          onClick={retry}
          disabled={isProcessingRequest}
          className="min-h-11 text-sm text-blue-700 underline rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Tải lại provider
        </button>
      )}
      <p id={`${id}-help`} className="text-xs text-gray-500">
        {catalog?.textRouting
          ? "Văn bản được xử lý tự động với dịch vụ dự phòng. Ảnh dùng provider và model bạn chọn."
          : "Mọi tác vụ dùng provider đã chọn. Tác vụ chưa hỗ trợ sẽ báo lỗi; không tự chuyển provider."}
      </p>
    </div>
  );
}
