import { useId } from "react";
import { useAIProvider } from "../hooks/use-ai-provider";
import { AIImageModelSelect } from "./AIImageModelSelect";
import { getAIProviderLabel } from "../utils/ai-provider.util";

export function AIImageModelPanel() {
  const id = useId();
  const { catalog, provider, loading, selectProvider, isProcessingRequest } =
    useAIProvider();
  const providerName = getAIProviderLabel(provider);
  const shopAvailable = catalog?.providers.some(
    (entry) =>
      entry.id === "shopaikey" &&
      entry.available &&
      entry.capabilities.includes("image"),
  );

  return (
    <div
      role="region"
      aria-label="Cấu hình model ảnh"
      className="mb-6 rounded-xl border border-blue-200 bg-white p-4 sm:p-5"
    >
      {provider === "shopaikey" ? (
        <>
          <p className="mb-2 text-sm text-blue-700">
            Provider ảnh: {providerName}
          </p>
          <AIImageModelSelect />
        </>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Model tạo / sửa ảnh
            </h2>
            <p id={`${id}-help`} className="mt-1 text-sm text-gray-600">
              {providerName} đang dùng model cấu hình sẵn. Chọn Provider 1 để
              tải danh sách và tự chọn model ảnh.
            </p>
            {loading && (
              <p role="status" className="mt-1 text-sm text-gray-600">
                Đang tải provider…
              </p>
            )}
            {!loading && catalog && !shopAvailable && (
              <p className="mt-1 text-sm text-amber-800">
                Provider 1 chưa sẵn sàng cho tác vụ ảnh.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => selectProvider("shopaikey")}
            disabled={loading || isProcessingRequest || !shopAvailable}
            aria-describedby={`${id}-help`}
            className="min-h-11 shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Chọn model Provider 1
          </button>
        </div>
      )}
    </div>
  );
}
