import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { useAIProvider } from "../hooks/use-ai-provider";

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
  } = useAIProvider();
  const routing =
    catalog?.providers.find((entry) => entry.id === provider)?.routing ||
    catalog?.defaults;
  const name = (id: string) =>
    catalog?.providers.find((entry) => entry.id === id)?.name || id;

  return (
    <div className="p-4 border-b border-gray-200 space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-gray-900">
        Provider AI
      </label>
      <div className="relative">
        <select
          id={id}
          value={provider}
          onChange={(event) => selectProvider(event.target.value)}
          disabled={loading}
          aria-describedby={`${id}-status ${id}-help`}
          className="h-11 w-full appearance-none rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 pl-3 pr-9 text-base md:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
        >
          <option value="">Mặc định hệ thống</option>
          {catalog?.providers.map((entry) => (
            <option key={entry.id} value={entry.id} disabled={!entry.available}>
              {entry.name}
              {entry.available ? "" : " (chưa cấu hình)"}
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
        {loading ? (
          <p>Đang tải provider…</p>
        ) : error ? (
          <p>Không tải được danh sách. Đang dùng mặc định hệ thống.</p>
        ) : (
          routing && (
            <>
              {savedProviderUnavailable && (
                <p>
                  Provider đã lưu không khả dụng. Đang dùng mặc định hệ thống.
                </p>
              )}
              <p>Văn bản: {name(routing.text)}</p>
              <p>Phân tích ảnh: {name(routing.vision)}</p>
              <p>Tạo / sửa ảnh: {name(routing.image)}</p>
            </>
          )
        )}
      </div>
      {error && (
        <button
          type="button"
          onClick={retry}
          className="min-h-11 text-sm text-blue-700 underline rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Tải lại provider
        </button>
      )}
      <p id={`${id}-help`} className="text-xs text-gray-500">
        Áp dụng cho yêu cầu tiếp theo. Tác vụ chưa được hỗ trợ dùng provider mặc
        định.
      </p>
    </div>
  );
}
