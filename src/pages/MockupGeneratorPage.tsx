import { useAIProvider } from "../hooks/use-ai-provider";
import { useImageInput } from "../hooks/use-image-input";
import { useRequest } from "../hooks/use-request";
import { notifyApiError } from "../utils/api-error-toast";
import { recordActivity } from "../utils/activity.util";
import { useState, useCallback } from "react";
import { Wand2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { ImageUploadSection } from "../components/ImageUploadSection";
import { PromptSection } from "../components/mockup-generator/PromptSection";
import { ResultSection } from "../components/mockup-generator/ResultSection";

import {
  manualGenerateMockups,
  autoGeneratePrompts,
  getErrorMessage,
  getApiErrorCode,
  blockingErrors,
} from "../services/api.service";

type MockupJob = {
  id: string;
  index: number;
  prompt: string;
  file: File;
  status: "queued" | "processing" | "done" | "error" | "paused" | "cancelled";
  url?: string;
  error?: string;
  requestId?: string;
};

export function MockupGeneratorPage() {
  const { provider, imageModel, imageModelReady } = useAIProvider();
  const {
    file: sampleImage,
    preview: samplePreview,
    setFile: setSampleImage,
  } = useImageInput();
  const [prompts, setPrompts] = useState<string[]>([""]);
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [mockupCount, setMockupCount] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [jobs, setJobs] = useState<MockupJob[]>([]);
  const results = jobs.flatMap((job) =>
    job.status === "done" && job.url
      ? [{ index: job.index, url: job.url }]
      : [],
  );
  const resultUrls = results.map((result) => result.url);
  const { start, cancel, isCurrent, finish } = useRequest();
  const resetState = useCallback(() => {
    cancel();
    setPrompts([""]);
    setAutoGenerate(false);
    setMockupCount(3);
    setIsGenerating(false);
    setIsProcessing(false);
    setJobs([]);
  }, [cancel]);
  const handleGeneratePrompts = async () => {
    if (!sampleImage || isGenerating || isProcessing) return;
    const task = start();
    setIsGenerating(true);
    try {
      const generatedPrompts = await autoGeneratePrompts(
        sampleImage,
        String(mockupCount),
        task.signal,
        provider || undefined,
      );
      if (!isCurrent(task)) return;
      setPrompts(generatedPrompts);
      toast.success(`Đã tạo ${generatedPrompts.length} prompts thành công!`);
    } catch (error) {
      if (isCurrent(task)) notifyApiError(error);
    } finally {
      if (isCurrent(task)) setIsGenerating(false);
      finish(task);
    }
  };
  const runJobs = async (queue: MockupJob[]) => {
    if (isProcessing || isGenerating || !imageModelReady || !queue.length)
      return;
    const task = start();
    const chosenProvider = provider;
    const chosenModel = imageModel;
    setIsProcessing(true);
    const pendingIds = new Set(queue.map((job) => job.id));
    setJobs((items) =>
      items.map((job) =>
        pendingIds.has(job.id)
          ? { ...job, status: "queued", error: undefined, requestId: undefined }
          : job,
      ),
    );
    const patch = (id: string, value: Partial<MockupJob>) =>
      setJobs((items) =>
        items.map((job) => (job.id === id ? { ...job, ...value } : job)),
      );
    let next = 0;
    let halted = false;
    let successes = 0;
    const worker = async () => {
      while (isCurrent(task) && !halted && next < queue.length) {
        const job = queue[next++];
        patch(job.id, {
          status: "processing",
          error: undefined,
          requestId: undefined,
        });
        try {
          const { results } = await manualGenerateMockups(
            job.file,
            [job.prompt],
            task.signal,
            chosenProvider || undefined,
            chosenModel,
          );
          if (!isCurrent(task)) return;
          const result = results[0];
          if (!result?.url) throw new Error("API không trả ảnh kết quả.");
          patch(job.id, {
            status: "done",
            url: result.url,
            requestId: result.requestId,
          });
          recordActivity("mockup", 1);
          successes++;
        } catch (error) {
          if (!isCurrent(task)) return;
          patch(job.id, { status: "error", error: getErrorMessage(error) });
          if (blockingErrors.has(getApiErrorCode(error) || "")) {
            halted = true;
            const unsent = new Set(queue.slice(next).map((item) => item.id));
            setJobs((items) =>
              items.map((item) =>
                unsent.has(item.id) ? { ...item, status: "paused" } : item,
              ),
            );
          }
        }
      }
    };
    try {
      await Promise.all(
        Array.from({ length: Math.min(3, queue.length) }, worker),
      );
      if (isCurrent(task) && successes)
        toast.success(
          `Đã tạo ${successes} mockup. Kết quả thành công được giữ lại.`,
        );
    } finally {
      if (isCurrent(task)) setIsProcessing(false);
      finish(task);
    }
  };
  const stop = () => {
    cancel();
    setIsProcessing(false);
    setJobs((items) =>
      items.map((job) =>
        ["queued", "processing"].includes(job.status)
          ? { ...job, status: "cancelled" }
          : job,
      ),
    );
  };
  const handleGenerateImages = async () => {
    const validPrompts = prompts.map((p) => p.trim()).filter(Boolean);
    if (
      !sampleImage ||
      !validPrompts.length ||
      isProcessing ||
      isGenerating ||
      !imageModelReady
    )
      return;
    if (validPrompts.some((p) => p.length > 4000)) {
      toast.error("Mỗi prompt tối đa 4000 ký tự.");
      return;
    }
    const queue: MockupJob[] = validPrompts.map((prompt, index) => ({
      id: crypto.randomUUID(),
      index,
      prompt,
      file: sampleImage,
      status: "queued",
    }));
    setJobs(queue);
    await runJobs(queue);
  };
  const canGenerate =
    sampleImage &&
    prompts.some((p) => p.trim()) &&
    !isProcessing &&
    !isGenerating &&
    imageModelReady;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Mockup Generator</h2>
        <p className="text-gray-600 mt-2">
          Tạo mockup chuyên nghiệp tự động với AI. Upload ảnh và để công cụ làm
          phần còn lại.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column - Input */}
        <div className="space-y-6">
          <Card className="p-6">
            <ImageUploadSection
              image={sampleImage}
              preview={samplePreview}
              onImageChange={setSampleImage}
              resetState={resetState}
              title="Ảnh Mẫu"
              description="Tải ảnh sản phẩm hoặc thiết kế của bạn lên"
              disabled={isGenerating || isProcessing}
            />
          </Card>

          <PromptSection
            prompts={prompts}
            autoGenerate={autoGenerate}
            isGenerating={isGenerating}
            mockupCount={mockupCount}
            onPromptsChange={setPrompts}
            onAutoGenerateChange={setAutoGenerate}
            onMockupCountChange={setMockupCount}
            onGeneratePrompts={handleGeneratePrompts}
            disabled={!sampleImage || isGenerating || isProcessing}
          />

          <Button
            onClick={handleGenerateImages}
            disabled={!canGenerate}
            className="w-full h-12 text-base bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2
                  aria-hidden="true"
                  className="w-5 h-5 mr-2 studio-loading-spinner"
                />
                Đang xử lý...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5 mr-2" />
                Tạo {prompts.filter((p) => p.trim() !== "").length} Mockup
              </>
            )}
          </Button>
          {isProcessing && (
            <Button
              variant="outline"
              className="min-h-11 w-full"
              onClick={stop}
            >
              Dừng tạo mockup
            </Button>
          )}
        </div>

        {/* Right Column - Output */}
        <div className="space-y-6">
          {/* Instructions */}
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-3">
              Hướng Dẫn Sử Dụng
            </h3>
            <ol className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2">
                <span className="font-semibold text-blue-600">1.</span>
                <span>Tải ảnh mẫu (sản phẩm/thiết kế) của bạn lên</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-blue-600">2.</span>
                <span>
                  Chọn nhập prompts thủ công hoặc để AI tự động tạo nhiều
                  prompts
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-blue-600">3.</span>
                <span>Nhấn "Tạo Mockup" để xử lý</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-blue-600">4.</span>
                <span>Tải xuống từng ảnh hoặc tất cả ảnh dưới dạng ZIP</span>
              </li>
            </ol>
          </Card>

          {/* Result Section */}
          {!!jobs.length && (
            <Card
              role="region"
              className="p-5 space-y-3"
              aria-label="Tiến độ tạo mockup"
            >
              <p role="status">
                Hoàn tất{" "}
                {
                  jobs.filter((job) => ["done", "error"].includes(job.status))
                    .length
                }
                /{jobs.length} ảnh · {resultUrls.length} thành công
              </p>
              <p className="text-sm text-gray-600">
                Mỗi ảnh xử lý độc lập, tối đa 3 ảnh song song. Thử lại giữ
                prompt của bộ hiện tại và chỉ tạo lại ảnh lỗi.
              </p>
              <ul className="space-y-3">
                {jobs.map((job) => (
                  <li
                    key={job.id}
                    className="rounded-lg border border-gray-200 p-3 text-sm"
                  >
                    <p className="flex items-center gap-2 font-medium">
                      {job.status === "processing" && (
                        <Loader2
                          aria-hidden="true"
                          className="h-4 w-4 studio-loading-spinner"
                        />
                      )}
                      Ảnh {job.index + 1}:{" "}
                      {
                        {
                          queued: "Đang chờ",
                          processing: "Đang xử lý",
                          done: "Thành công",
                          error: "Lỗi",
                          paused: "Tạm dừng",
                          cancelled: "Đã dừng",
                        }[job.status]
                      }
                    </p>
                    {job.error && (
                      <p
                        role="alert"
                        className="mt-2 whitespace-pre-wrap break-words text-red-800"
                      >
                        {job.error}
                      </p>
                    )}
                    {job.requestId && (
                      <p className="mt-1 break-all text-xs text-gray-600">
                        Mã yêu cầu: {job.requestId}
                      </p>
                    )}
                    {["error", "paused", "cancelled"].includes(job.status) && (
                      <Button
                        variant="outline"
                        className="mt-2 min-h-11"
                        disabled={
                          isProcessing || isGenerating || !imageModelReady
                        }
                        onClick={() => runJobs([job])}
                      >
                        Thử lại ảnh {job.index + 1}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
              {jobs.some((job) =>
                ["error", "paused", "cancelled"].includes(job.status),
              ) && (
                <Button
                  variant="outline"
                  className="min-h-11"
                  disabled={isProcessing || isGenerating || !imageModelReady}
                  onClick={() =>
                    runJobs(
                      jobs.filter((job) =>
                        ["error", "paused", "cancelled"].includes(job.status),
                      ),
                    )
                  }
                >
                  Thử lại ảnh chưa hoàn tất
                </Button>
              )}
            </Card>
          )}
          <div id="result-section">
            <ResultSection results={results} />
          </div>

          {/* Features */}
          {!resultUrls.length && (
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Tính Năng Nổi Bật
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Wand2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-gray-900">
                      AI Tự Động
                    </h4>
                    <p className="text-xs text-gray-600">
                      Tạo prompts thông minh từ ảnh của bạn
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                    <Wand2 className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-gray-900">
                      Chất Lượng Cao
                    </h4>
                    <p className="text-xs text-gray-600">
                      Mockup chuyên nghiệp với độ phân giải cao
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <Wand2 className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-gray-900">
                      Nhanh Chóng
                    </h4>
                    <p className="text-xs text-gray-600">
                      Xử lý và tạo kết quả trong vài chục giây
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
