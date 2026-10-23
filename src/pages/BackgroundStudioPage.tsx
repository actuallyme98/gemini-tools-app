import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { notifyApiError } from "../utils/api-error-toast";
import {
  ArrowRight,
  Check,
  ImagePlus,
  Images,
  Layers,
  Loader2,
  Package,
  RotateCcw,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import {
  useBackgroundStudio,
  MAX_BACKGROUND_RESULTS,
  MAX_CONCURRENT_BACKGROUND_REQUESTS,
} from "../hooks/use-background-studio";
import { IMAGE_ACCEPT, MAX_REFERENCES } from "../utils/upload.util";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { ImageUploadSection } from "../components/ImageUploadSection";
import { BackgroundResults } from "../components/background-studio/BackgroundResults";
import {
  MAX_BACKGROUND_PROMPT_LENGTH,
  MAX_BACKGROUND_INSTRUCTIONS_LENGTH,
} from "../constants/background-studio-prompt";

export function BackgroundStudioPage() {
  const studio = useBackgroundStudio();
  const id = useId();
  const [dragging, setDragging] = useState(false);
  const finished = studio.jobs.filter(
    (job) => job.status === "done" || job.status === "error",
  ).length;
  const successes = studio.jobs.filter((job) => job.status === "done").length;
  const failures = studio.jobs.filter((job) => job.status === "error").length;
  const overLimit = studio.total > MAX_BACKGROUND_RESULTS;
  useEffect(() => {
    if (studio.uploadError)
      notifyApiError(new Error(studio.uploadError), {
        id: "studio-upload-error",
      });
    else toast.dismiss("studio-upload-error");
  }, [studio.uploadError]);
  useEffect(() => {
    if (overLimit)
      toast.warning(
        `Tối đa ${MAX_BACKGROUND_RESULTS} ảnh mỗi bộ. Giảm số ảnh tham chiếu hoặc số kết quả cho mỗi ảnh.`,
        { id: "studio-batch-limit" },
      );
    else toast.dismiss("studio-batch-limit");
  }, [overLimit]);
  const ready =
    !!studio.product.file &&
    !!studio.selected.length &&
    !overLimit &&
    studio.promptValid &&
    studio.providerReady;

  return (
    <div className="space-y-6 pb-4">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-white">
            <Layers aria-hidden="true" className="h-6 w-6" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Mockup Studio
          </h2>
          <span className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-800">
            Tạo cả bộ trong một lần
          </span>
        </div>
        <p className="max-w-2xl text-gray-600">
          Áp hình in hoặc họa tiết từ sản phẩm gốc lên sản phẩm trong ảnh tham
          chiếu. Giữ nguyên người, kiểu dáng sản phẩm, bố cục, ánh sáng và
          background của từng ảnh mẫu.
        </p>
        <ol
          className="flex flex-wrap items-center gap-3 text-sm text-gray-700"
          aria-label="Các bước áp hình in vào ảnh tham chiếu"
        >
          {["Sản phẩm gốc", "Ảnh tham chiếu", "Tạo & tải bộ ảnh"].map(
            (step, index) => (
              <li key={step} className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800">
                  {index + 1}
                </span>
                {step}
                {index < 2 && (
                  <ArrowRight
                    className="ml-1 h-4 w-4 text-gray-400"
                    aria-hidden="true"
                  />
                )}
              </li>
            ),
          )}
        </ol>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-5 items-start">
        <Card
          className="gap-4 p-5 lg:sticky lg:top-4"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (!studio.running && event.dataTransfer.files[0])
              studio.changeProduct(event.dataTransfer.files[0]);
          }}
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-brand-800">
            <Package aria-hidden="true" className="h-4 w-4" />
            Một thiết kế dùng cho cả bộ
          </div>
          <ImageUploadSection
            image={studio.product.file}
            preview={studio.product.preview}
            onImageChange={studio.changeProduct}
            title="Ảnh sản phẩm gốc"
            description="Nguồn hình in/họa tiết cần áp dụng. Giữ đúng chi tiết, màu sắc và tỷ lệ hình in so với sản phẩm."
            resetState={() => {}}
            disabled={studio.running}
          />
          <div className="rounded-lg border border-brand-100 bg-brand-50 p-3 text-xs leading-relaxed text-brand-900">
            <p className="font-medium">Chọn ảnh thấy rõ hình in và sản phẩm</p>
            <p className="mt-1">
              Ưu tiên ảnh thấy đầy đủ sản phẩm để xác định đúng kích thước và vị
              trí tương đối của hình in. Dùng được cho áo, túi, cốc, bao bì và
              các sản phẩm có bề mặt in phù hợp.
            </p>
          </div>
        </Card>
        <Card className="min-w-0 gap-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Ảnh tham chiếu
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Ảnh mẫu có sản phẩm cần thay hình in. Nếu có nhiều sản phẩm cùng
                loại, thiết kế sẽ được áp dụng lên tất cả; giữ nguyên cảnh và
                ánh sáng. Chọn nhiều ảnh cùng lúc hoặc thêm dần vào bộ.
              </p>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              {studio.backgrounds.length}/{MAX_REFERENCES} ảnh
            </span>
          </div>
          <div
            onDragOver={(event) => {
              event.preventDefault();
              if (!studio.running) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              studio.addBackgrounds(Array.from(event.dataTransfer.files));
            }}
          >
            <input
              id={`${id}-backgrounds`}
              type="file"
              multiple
              accept={IMAGE_ACCEPT}
              disabled={studio.running}
              aria-label="Thêm ảnh tham chiếu"
              className="sr-only peer"
              onChange={(event) => {
                studio.addBackgrounds(Array.from(event.target.files || []));
                event.target.value = "";
              }}
            />
            <label
              htmlFor={`${id}-backgrounds`}
              className={`flex min-h-36 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand-600 ${studio.running ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-brand-400 hover:bg-brand-50/50"} ${dragging ? "border-brand-500 bg-brand-50" : "border-gray-300 bg-gray-50"}`}
            >
              <ImagePlus className="h-7 w-7 text-brand-600" aria-hidden="true" />
              <span className="font-medium text-gray-900">
                Kéo ảnh vào đây hoặc chọn ảnh tham chiếu
              </span>
              <span className="text-xs text-gray-600">
                PNG, JPEG, WebP · tối đa 10MB/ảnh · {MAX_REFERENCES} ảnh tham
                chiếu
              </span>
            </label>
          </div>
          {!!studio.backgrounds.length && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-700">
                  Đã chọn {studio.selected.length} ảnh tham chiếu
                </p>
                <Button
                  variant="ghost"
                  className="min-h-11 text-brand-700"
                  disabled={studio.running}
                  onClick={() =>
                    studio.selectAll(
                      studio.selected.length !== studio.backgrounds.length,
                    )
                  }
                >
                  {studio.selected.length === studio.backgrounds.length
                    ? "Bỏ chọn tất cả"
                    : "Chọn tất cả"}
                </Button>
              </div>
              <ul className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {studio.backgrounds.map((source, index) => (
                  <li key={source.id} className="relative">
                    <label
                      className="block cursor-pointer"
                      htmlFor={`${id}-${source.id}`}
                    >
                      <input
                        id={`${id}-${source.id}`}
                        type="checkbox"
                        checked={source.selected}
                        disabled={studio.running}
                        aria-label={`Chọn ảnh tham chiếu ${source.file.name}`}
                        className="sr-only peer"
                        onChange={() => studio.toggleBackground(source.id)}
                      />
                      <div
                        className={`overflow-hidden rounded-xl border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand-600 peer-focus-visible:ring-offset-2 ${source.selected ? "border-brand-500 bg-brand-50" : "border-gray-200 bg-white"} ${studio.running ? "opacity-70" : ""}`}
                      >
                        <div className="relative aspect-[4/3]">
                          <img
                            src={source.preview}
                            alt={`Ảnh tham chiếu ${index + 1}: ${source.file.name}`}
                            className="h-full w-full object-cover"
                          />
                          <span
                            aria-hidden="true"
                            className={`absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 shadow-sm ${source.selected ? "border-brand-600 bg-brand-600 text-white" : "border-white bg-white/90"}`}
                          >
                            {source.selected && <Check className="h-4 w-4" />}
                          </span>
                        </div>
                        <div className="space-y-1 p-3">
                          <p className="break-all text-xs font-medium text-gray-900">
                            {source.file.name}
                          </p>
                          <p className="text-xs text-gray-600">
                            {source.selected
                              ? `${studio.variations} ảnh sẽ tạo`
                              : "Chưa chọn"}
                          </p>
                        </div>
                      </div>
                    </label>
                    <Button
                      variant="secondary"
                      className="absolute right-1 top-1 min-h-11 min-w-11 bg-white/95 p-2 shadow-sm"
                      disabled={studio.running}
                      onClick={() => studio.removeBackground(source.id)}
                      aria-label={`Xóa ảnh tham chiếu ${source.file.name}`}
                    >
                      <X aria-hidden="true" className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="border-t border-gray-200 pt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label
                htmlFor={`${id}-variations`}
                className="text-sm font-medium text-gray-900"
              >
                Kết quả cho mỗi ảnh tham chiếu
              </label>
              <select
                id={`${id}-variations`}
                value={studio.variations}
                disabled={studio.running}
                onChange={(event) =>
                  studio.setVariations(Number(event.target.value))
                }
                className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 text-base focus-visible:ring-2 focus-visible:ring-brand-600"
              >
                {[1, 2, 3].map((count) => (
                  <option
                    key={count}
                    value={count}
                    disabled={
                      studio.selected.length * count > MAX_BACKGROUND_RESULTS
                    }
                  >
                    {count} kết quả / ảnh tham chiếu
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor={`${id}-instructions`}
                  className="block text-sm font-medium text-gray-900"
                >
                  Custom prompt
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-11 text-brand-700"
                  disabled={studio.running}
                  onClick={studio.resetInstructions}
                >
                  <RotateCcw aria-hidden="true" />
                  Khôi phục prompt gốc
                </Button>
              </div>
              <p
                id={`${id}-instructions-help`}
                className="mt-1 text-sm text-gray-600"
              >
                Prompt gốc đã được điền sẵn. Bạn có thể sửa hoặc thay thế toàn
                bộ nội dung. Quy ước ảnh đích/ảnh nguồn và không thêm watermark
                luôn được ghép vào final prompt hiển thị bên dưới. ẢNH 1 là ảnh
                tham chiếu cần chỉnh sửa; ẢNH 2 là sản phẩm gốc để lấy thiết kế.
              </p>
              <textarea
                id={`${id}-instructions`}
                aria-describedby={`${id}-instructions-help ${id}-instructions-count${!studio.promptValid ? ` ${id}-instructions-error` : ""}`}
                aria-invalid={!studio.promptValid}
                value={studio.instructions}
                maxLength={MAX_BACKGROUND_INSTRUCTIONS_LENGTH}
                disabled={studio.running}
                onChange={(event) => studio.setInstructions(event.target.value)}
                rows={14}
                className="mt-3 w-full resize-y rounded-lg border border-gray-300 bg-white p-3 text-base leading-relaxed focus-visible:ring-2 focus-visible:ring-brand-600 disabled:cursor-not-allowed disabled:bg-gray-100"
                placeholder="Nhập prompt đầy đủ để xử lý ảnh."
              />
              <p
                id={`${id}-instructions-count`}
                className="mt-1 text-right text-xs text-gray-600"
              >
                {studio.finalPromptLength}/{MAX_BACKGROUND_PROMPT_LENGTH} ký tự
              </p>
              <details
                className="mt-3 rounded-lg border border-gray-200 bg-white p-3"
                open
              >
                <summary className="cursor-pointer text-sm font-medium text-gray-900">
                  Final prompt gửi tới model
                </summary>
                <pre
                  className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-sm text-gray-700"
                  aria-label="Final prompt"
                >
                  {studio.finalPrompt}
                </pre>
              </details>
              {!studio.promptValid && (
                <p
                  id={`${id}-instructions-error`}
                  role="alert"
                  className="mt-2 text-sm text-red-700"
                >
                  Nhập nội dung prompt trước khi tạo ảnh (tối đa{" "}
                  {MAX_BACKGROUND_PROMPT_LENGTH} ký tự).
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>
      <Card className="gap-3 border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-gray-900">
              {studio.selected.length} ảnh tham chiếu × {studio.variations} ảnh
              = {studio.total} kết quả
            </p>
            <p className="mt-1 text-sm text-gray-600">
              {studio.running
                ? `Đang tạo bằng ${studio.runningProvider}. Xử lý tối đa ${MAX_CONCURRENT_BACKGROUND_REQUESTS} ảnh đồng thời.`
                : !studio.product.file || !studio.selected.length
                  ? "Thêm sản phẩm gốc và chọn ít nhất một ảnh tham chiếu để bắt đầu."
                  : !studio.providerReady
                    ? `${studio.providerName} chưa sẵn sàng cho tác vụ ảnh. Hãy kiểm tra hoặc chọn provider khác.`
                    : `Xử lý tối đa ${MAX_CONCURRENT_BACKGROUND_REQUESTS} ảnh đồng thời. Mỗi kết quả giữ nguyên ảnh mẫu, chỉ thay hình in/họa tiết trên sản phẩm tương ứng.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {studio.running ? (
              <Button
                variant="outline"
                className="min-h-11"
                onClick={studio.stop}
              >
                <Square aria-hidden="true" />
                Dừng tạo
              </Button>
            ) : (
              <>
                <Button
                  className="min-h-11 bg-brand-600 text-white hover:bg-brand-700"
                  disabled={!ready}
                  onClick={() => void studio.generate()}
                >
                  <Sparkles aria-hidden="true" />
                  {studio.jobs.length
                    ? `Tạo bộ mới (${studio.total} ảnh)`
                    : `Tạo ${studio.total} ảnh`}
                </Button>
                {!!studio.unfinished.length && (
                  <Button
                    variant="outline"
                    className="min-h-11"
                    disabled={!studio.providerReady}
                    onClick={() => void studio.retry()}
                  >
                    <RotateCcw aria-hidden="true" />
                    Tiếp tục {studio.unfinished.length} ảnh chưa xong
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
        {!!studio.jobs.length && (
          <>
            <div
              className="flex flex-wrap justify-between gap-2 text-xs text-gray-700"
              role="status"
              aria-live="polite"
            >
              <span className="flex items-center gap-2">
                {studio.running && (
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 studio-loading-spinner"
                  />
                )}
                {studio.running ? "Đang xử lý" : "Đã xử lý"} {finished}/
                {studio.jobs.length} ảnh
              </span>
              <span>
                {successes} thành công{failures ? ` · ${failures} có lỗi` : ""}
                {studio.unfinished.length
                  ? ` · ${studio.unfinished.length} chưa hoàn tất`
                  : ""}
              </span>
            </div>
            <Progress
              className="bg-brand-100 [&_[data-slot=progress-indicator]]:bg-brand-600"
              value={
                studio.jobs.length ? (finished / studio.jobs.length) * 100 : 0
              }
              aria-label="Tiến độ áp hình in"
              aria-valuetext={`${finished}/${studio.jobs.length} ảnh đã xử lý`}
            />
          </>
        )}
        {studio.running && (
          <p className="text-xs text-gray-600">
            Dừng sẽ giữ ảnh đã hoàn tất. Tác vụ đang chạy có thể vẫn được
            provider xử lý.
          </p>
        )}
      </Card>
      {studio.jobs.length ? (
        <BackgroundResults
          jobs={studio.jobs}
          productPreview={studio.product.preview}
          running={studio.running}
          onRetry={studio.retry}
          canRetry={studio.providerReady}
        />
      ) : (
        <Card className="items-center gap-3 border-dashed bg-white p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
            <Images className="h-7 w-7 text-gray-400" aria-hidden="true" />
          </div>
          <h3 className="font-semibold text-gray-800">
            Bộ ảnh mới sẽ xuất hiện tại đây
          </h3>
          <p className="max-w-md text-sm text-gray-600">
            Xem sản phẩm gốc, ảnh tham chiếu và kết quả cạnh nhau. Tải từng ảnh
            hoặc gom tất cả vào một file ZIP.
          </p>
        </Card>
      )}
    </div>
  );
}
