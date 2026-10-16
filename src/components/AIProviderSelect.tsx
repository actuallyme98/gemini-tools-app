import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { useAIProvider } from "../hooks/use-ai-provider";
import { DEFAULT_AI_PROVIDER } from "../utils/ai-provider.util";

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
  const routing = catalog?.providers.find(
    (entry) => entry.id === provider,
  )?.routing;
  const name = (id: string | null) =>
    id
      ? catalog?.providers.find((entry) => entry.id === id)?.name || id
      : "Chưa hỗ trợ / cấu hình";

  return (
    <div className="p-4 border-b border-gray-200 space-y-2 shrink-0 max-h-[60dvh] overflow-y-auto">
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
          className="h-11 w-full appearance-none rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 pl-3 pr-9 text-base md:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
        >
          {provider &&
            !catalog?.providers.some((entry) => entry.id === provider) && (
              <option value={provider} disabled>
                {provider === DEFAULT_AI_PROVIDER ? "Gemini" : provider} (chưa
                xác minh)
              </option>
            )}
          {catalog?.providers.map((entry) => (
            <option key={entry.id} value={entry.id} disabled={!entry.available}>
              {entry.name}
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
            <p className="text-red-700 whitespace-pre-line break-words">
              {error}
            </p>
          </>
        ) : (
          <>
            {savedProviderUnavailable && (
              <p>Provider đã lưu không khả dụng. Hãy chọn provider khác.</p>
            )}
            {routing && (
              <>
                <p>
                  Văn bản:{" "}
                  {catalog?.textRouting
                    ? "VyceAI (GPT / Claude) → ShopAIKey"
                    : name(routing.text)}
                </p>
                <p>Phân tích ảnh: {name(routing.vision)}</p>
                <p>Tạo / sửa ảnh: {name(routing.image)}</p>
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
          ? "Text kiểm tra health trước khi dùng VyceAI; tự chuyển sang ShopAIKey khi cần. Ảnh dùng provider và model bạn chọn."
          : "Mọi tác vụ dùng provider đã chọn. Tác vụ chưa hỗ trợ sẽ báo lỗi; không tự chuyển provider."}
      </p>
    </div>
  );
}
