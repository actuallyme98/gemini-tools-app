import { useRef, useState } from "react";
import {
  Check,
  Download,
  Eye,
  ImageIcon,
  Loader2,
  RotateCcw,
  CircleAlert,
} from "lucide-react";
import { toast } from "sonner";
import type { BackgroundJob } from "../../hooks/use-background-studio";
import { downloadImage, downloadZipEntries } from "../../utils/download.util";
import { notifyApiError } from "../../utils/api-error-toast";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

const labels: Record<BackgroundJob["status"], string> = {
  queued: "Đang chờ",
  processing: "Đang tạo",
  done: "Hoàn tất",
  error: "Có lỗi",
  paused: "Chưa chạy",
  cancelled: "Đã dừng",
};
function filename(job: BackgroundJob, index: number) {
  const clean = (value: string) =>
    value
      .replace(/\.[^.]+$/, "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .slice(0, 60) || "image";
  const extension =
    job.mimeType === "image/jpeg"
      ? "jpg"
      : job.mimeType === "image/webp"
        ? "webp"
        : "png";
  return `${clean(job.product.name)}__${clean(job.file.name)}__${index + 1}-v${job.variation}.${extension}`;
}

export function BackgroundResults({
  jobs,
  productPreview,
  running,
  onRetry,
  canRetry,
}: {
  jobs: BackgroundJob[];
  productPreview: string | null;
  running: boolean;
  onRetry: (id?: string) => Promise<void>;
  canRetry: boolean;
}) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const preview = jobs.find((job) => job.id === previewId);
  const completed = jobs.filter((job) => job.status === "done" && job.url);
  const single = async (job: BackgroundJob) => {
    if (!job.url) return;
    try {
      await downloadImage(job.url, filename(job, jobs.indexOf(job)));
    } catch (error) {
      notifyApiError(error);
    }
  };
  const zip = async () => {
    setDownloading(true);
    try {
      const result = await downloadZipEntries(
        completed.map((job) => ({
          url: job.url!,
          filename: filename(job, jobs.indexOf(job)),
        })),
        "background-studio",
      );
      if (result.failed)
        toast.warning(
          `Đã tải ${result.downloaded}/${completed.length} ảnh; ${result.failed} ảnh tải lỗi.`,
        );
      else toast.success(`Đã tải ${result.downloaded} ảnh trong bộ ZIP.`);
    } catch (error) {
      notifyApiError(error);
    } finally {
      setDownloading(false);
    }
  };
  return (
    <section aria-labelledby="background-results-title" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3
            id="background-results-title"
            className="text-xl font-semibold text-gray-900"
          >
            Bộ kết quả{" "}
            <span className="text-sm font-normal text-gray-600">
              {completed.length}/{jobs.length} ảnh hoàn tất
            </span>
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Mỗi ảnh gắn với một background. Kết quả xuất hiện ngay khi tạo xong.
          </p>
        </div>
        <Button
          variant="outline"
          className="min-h-11"
          disabled={!completed.length || downloading}
          onClick={() => void zip()}
        >
          {downloading ? (
            <Loader2 aria-hidden="true" className="motion-safe:animate-spin" />
          ) : (
            <Download aria-hidden="true" />
          )}
          Tải {completed.length} ảnh (ZIP)
        </Button>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {jobs.map((job, index) => (
          <li key={job.id}>
            <Card className="h-full overflow-hidden gap-0 py-0">
              <div className="relative aspect-square bg-gray-100">
                {job.url ? (
                  <img
                    src={job.url}
                    alt={`Sản phẩm với background ${job.file.name}, ảnh ${job.variation}`}
                    loading="lazy"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                    {job.status === "processing" ? (
                      <Loader2
                        className="h-9 w-9 text-blue-600 motion-safe:animate-spin"
                        aria-hidden="true"
                      />
                    ) : job.status === "error" ? (
                      <CircleAlert
                        className="h-9 w-9 text-red-600"
                        aria-hidden="true"
                      />
                    ) : (
                      <ImageIcon
                        className="h-9 w-9 text-gray-400"
                        aria-hidden="true"
                      />
                    )}
                    <p className="font-medium text-gray-700">
                      {labels[job.status]}
                    </p>
                    <p className="text-xs text-gray-600">
                      {job.status === "paused"
                        ? "Đang chờ xử lý lỗi để tiếp tục."
                        : job.status === "cancelled"
                          ? "Có thể tiếp tục tạo khi bạn sẵn sàng."
                          : "Sản phẩm của bạn sẽ được đặt vào background này."}
                    </p>
                  </div>
                )}
                {job.status === "done" && (
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-green-800 shadow-sm">
                    <Check className="h-3 w-3" aria-hidden="true" />
                    Hoàn tất
                  </span>
                )}
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-center gap-3">
                  <img
                    src={job.preview}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-md object-cover"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 break-all">
                      {job.file.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      Kết quả #{index + 1} · ảnh {job.variation}
                    </p>
                  </div>
                </div>
                {job.error && (
                  <details className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    <summary className="min-h-11 cursor-pointer font-medium">
                      Chi tiết lỗi
                    </summary>
                    <p className="mt-2 whitespace-pre-line break-words text-xs">
                      {job.error}
                    </p>
                  </details>
                )}
                {job.status === "done" ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="min-h-11 flex-1"
                      aria-label={`Xem kết quả ${index + 1}`}
                      onClick={(event) => {
                        trigger.current = event.currentTarget;
                        setPreviewId(job.id);
                      }}
                    >
                      <Eye aria-hidden="true" />
                      Xem ảnh
                    </Button>
                    <Button
                      variant="outline"
                      className="min-h-11"
                      aria-label={`Tải kết quả ${index + 1}`}
                      onClick={() => void single(job)}
                    >
                      <Download aria-hidden="true" />
                      Tải
                    </Button>
                  </div>
                ) : ["error", "paused", "cancelled"].includes(job.status) ? (
                  <Button
                    variant="outline"
                    className="min-h-11 w-full"
                    disabled={running || !canRetry}
                    onClick={() => void onRetry(job.id)}
                    aria-label={`Thử lại background ${job.file.name}, ảnh ${job.variation}`}
                  >
                    <RotateCcw aria-hidden="true" />
                    Thử lại ảnh này
                  </Button>
                ) : (
                  <p className="flex min-h-11 items-center text-xs text-gray-600">
                    {job.status === "processing"
                      ? "Đang ghép background…"
                      : "Sẽ được xử lý lần lượt."}
                  </p>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>
      <Dialog
        open={!!preview}
        onOpenChange={(open) => {
          if (!open) setPreviewId(null);
        }}
      >
        <DialogContent
          className="sm:max-w-5xl max-h-[90dvh] overflow-y-auto [&>button]:h-11 [&>button]:w-11 [&>button]:flex [&>button]:items-center [&>button]:justify-center"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            trigger.current?.focus();
          }}
        >
          <DialogHeader className="pr-12">
            <DialogTitle>Xem kết quả thay background</DialogTitle>
            <DialogDescription className="break-all">
              {preview?.file.name} · ảnh {preview?.variation}
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Sản phẩm gốc", url: productPreview },
                { label: "Background tham chiếu", url: preview.preview },
                { label: "Kết quả", url: preview.url },
              ].map((item) => (
                <figure key={item.label} className="space-y-2">
                  <figcaption className="text-sm font-medium">
                    {item.label}
                  </figcaption>
                  {item.url && (
                    <img
                      src={item.url}
                      alt={item.label}
                      className="aspect-square w-full rounded-lg bg-gray-100 object-contain"
                    />
                  )}
                </figure>
              ))}
            </div>
          )}
          <div className="flex justify-end">
            <Button
              className="min-h-11"
              onClick={() => preview && void single(preview)}
            >
              <Download aria-hidden="true" />
              Tải ảnh kết quả
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
