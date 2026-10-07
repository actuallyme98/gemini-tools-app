import { useId, useState } from "react";
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
} from "../hooks/use-background-studio";
import { IMAGE_ACCEPT, MAX_REFERENCES } from "../utils/upload.util";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { ImageUploadSection } from "../components/ImageUploadSection";
import { BackgroundResults } from "../components/background-studio/BackgroundResults";

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
  const ready =
    !!studio.product.file &&
    !!studio.selected.length &&
    !overLimit &&
    studio.providerReady;

  return (
    <div className="space-y-6 pb-4">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            <Layers aria-hidden="true" className="h-6 w-6" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Background Studio
          </h2>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800">
            Tạo cả bộ trong một lần
          </span>
        </div>
        <p className="max-w-2xl text-gray-600">
          Giữ nguyên sản phẩm, thay background theo từng ảnh tham chiếu. Tải một
          ảnh gốc và chọn những bối cảnh bạn muốn sử dụng.
        </p>
        <ol
          className="flex flex-wrap items-center gap-3 text-sm text-gray-700"
          aria-label="Các bước thay background"
        >
          {["Sản phẩm gốc", "Chọn background", "Tạo & tải bộ ảnh"].map(
            (step, index) => (
              <li key={step} className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-800">
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
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
            <Package aria-hidden="true" className="h-4 w-4" />
            Một sản phẩm dùng cho cả bộ
          </div>
          <ImageUploadSection
            image={studio.product.file}
            preview={studio.product.preview}
            onImageChange={studio.changeProduct}
            title="Ảnh sản phẩm gốc"
            description="Giữ nguyên hình dáng, màu sắc, họa tiết và logo của ảnh này."
            resetState={() => {}}
            disabled={studio.running}
          />
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-relaxed text-blue-900">
            <p className="font-medium">Chọn ảnh sản phẩm rõ nét</p>
            <p className="mt-1">
              Ưu tiên ảnh thấy đầy đủ sản phẩm. Mỗi background sẽ tạo thành một
              kết quả riêng.
            </p>
          </div>
        </Card>
        <Card className="min-w-0 gap-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Background tham chiếu
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Chọn nhiều ảnh cùng lúc, hoặc thêm dần vào bộ.
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
              aria-label="Thêm ảnh background"
              className="sr-only peer"
              onChange={(event) => {
                studio.addBackgrounds(Array.from(event.target.files || []));
                event.target.value = "";
              }}
            />
            <label
              htmlFor={`${id}-backgrounds`}
              className={`flex min-h-36 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-blue-600 ${studio.running ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-blue-400 hover:bg-blue-50/50"} ${dragging ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50"}`}
            >
              <ImagePlus className="h-7 w-7 text-blue-600" aria-hidden="true" />
              <span className="font-medium text-gray-900">
                Kéo ảnh vào đây hoặc chọn background
              </span>
              <span className="text-xs text-gray-600">
                PNG, JPEG, WebP · tối đa 10MB/ảnh · {MAX_REFERENCES} background
              </span>
            </label>
          </div>
          {studio.uploadError && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 break-words"
            >
              {studio.uploadError}
            </p>
          )}
          {!!studio.backgrounds.length && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-700">
                  Đã chọn {studio.selected.length} background
                </p>
                <Button
                  variant="ghost"
                  className="min-h-11 text-blue-700"
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
                        aria-label={`Chọn background ${source.file.name}`}
                        className="sr-only peer"
                        onChange={() => studio.toggleBackground(source.id)}
                      />
                      <div
                        className={`overflow-hidden rounded-xl border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-blue-600 peer-focus-visible:ring-offset-2 ${source.selected ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"} ${studio.running ? "opacity-70" : ""}`}
                      >
                        <div className="relative aspect-[4/3]">
                          <img
                            src={source.preview}
                            alt={`Background ${index + 1}: ${source.file.name}`}
                            className="h-full w-full object-cover"
                          />
                          <span
                            aria-hidden="true"
                            className={`absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 shadow-sm ${source.selected ? "border-blue-600 bg-blue-600 text-white" : "border-white bg-white/90"}`}
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
                      aria-label={`Xóa background ${source.file.name}`}
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
                Kết quả cho mỗi background
              </label>
              <select
                id={`${id}-variations`}
                value={studio.variations}
                disabled={studio.running}
                onChange={(event) =>
                  studio.setVariations(Number(event.target.value))
                }
                className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 text-base focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                {[1, 2, 3].map((count) => (
                  <option
                    key={count}
                    value={count}
                    disabled={
                      studio.selected.length * count > MAX_BACKGROUND_RESULTS
                    }
                  >
                    {count} ảnh / background
                  </option>
                ))}
              </select>
            </div>
            <details className="rounded-lg bg-gray-50 p-3">
              <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-gray-800">
                Ghi chú về ánh sáng & vị trí (tùy chọn)
              </summary>
              <label
                htmlFor={`${id}-instructions`}
                className="mt-3 block text-xs text-gray-600"
              >
                Áp dụng cho cả bộ; sản phẩm vẫn được giữ nguyên.
              </label>
              <textarea
                id={`${id}-instructions`}
                value={studio.instructions}
                maxLength={2000}
                disabled={studio.running}
                onChange={(event) => studio.setInstructions(event.target.value)}
                rows={3}
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 text-base focus-visible:ring-2 focus-visible:ring-blue-600"
                placeholder="Ví dụ: đặt sản phẩm ở giữa, ánh sáng tự nhiên, bóng đổ nhẹ."
              />
            </details>
            {overLimit && (
              <p role="alert" className="text-sm text-red-700">
                Tối đa {MAX_BACKGROUND_RESULTS} ảnh mỗi bộ. Giảm số background
                hoặc số kết quả cho mỗi background.
              </p>
            )}
          </div>
        </Card>
      </div>
      <Card className="gap-3 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-gray-900">
              {studio.selected.length} background × {studio.variations} ảnh ={" "}
              {studio.total} kết quả
            </p>
            <p className="mt-1 text-sm text-gray-600">
              {studio.running
                ? `Đang tạo bằng ${studio.runningProvider}.`
                : !studio.product.file || !studio.selected.length
                  ? "Thêm sản phẩm gốc và chọn ít nhất một background để bắt đầu."
                  : !studio.providerReady
                    ? `${studio.providerName} chưa sẵn sàng cho tác vụ ảnh. Hãy kiểm tra hoặc chọn provider khác.`
                    : "Mỗi background dùng riêng với cùng một sản phẩm gốc."}
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
                  className="min-h-11 bg-blue-600 text-white hover:bg-blue-700"
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
                    className="h-4 w-4 motion-safe:animate-spin"
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
              className="bg-blue-100 [&_[data-slot=progress-indicator]]:bg-blue-600"
              value={
                studio.jobs.length ? (finished / studio.jobs.length) * 100 : 0
              }
              aria-label="Tiến độ thay background"
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
        {studio.batchError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-white p-3 text-sm text-red-800 whitespace-pre-line break-words"
          >
            {studio.batchError}
          </div>
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
            Xem sản phẩm gốc, background tham chiếu và kết quả cạnh nhau. Tải
            từng ảnh hoặc gom tất cả vào một file ZIP.
          </p>
        </Card>
      )}
    </div>
  );
}
