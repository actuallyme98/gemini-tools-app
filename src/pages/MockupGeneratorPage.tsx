import { useAIProvider } from "../hooks/use-ai-provider";
import { useImageInput } from "../hooks/use-image-input";
import { useRequest } from "../hooks/use-request";
import { getErrorMessage } from "../services/api.service";
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
} from "../services/api.service";

export function MockupGeneratorPage() {
  const { provider } = useAIProvider();
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
  const [resultUrls, setResultUrls] = useState<string[]>([]);
  const { start, cancel, isCurrent } = useRequest();
  const resetState = useCallback(() => {
    cancel();
    setPrompts([""]);
    setAutoGenerate(false);
    setMockupCount(3);
    setIsGenerating(false);
    setIsProcessing(false);
    setResultUrls([]);
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
      if (isCurrent(task)) toast.error(getErrorMessage(error));
    } finally {
      if (isCurrent(task)) setIsGenerating(false);
    }
  };
  const handleGenerateImages = async () => {
    const validPrompts = prompts.map((p) => p.trim()).filter(Boolean);
    if (!sampleImage || !validPrompts.length || isProcessing || isGenerating)
      return;
    if (validPrompts.some((p) => p.length > 4000)) {
      toast.error("Mỗi prompt tối đa 4000 ký tự.");
      return;
    }
    const task = start();
    setIsProcessing(true);
    setResultUrls([]);
    try {
      const { results } = await manualGenerateMockups(
        sampleImage,
        validPrompts,
        task.signal,
        provider || undefined,
      );
      if (!isCurrent(task)) return;
      setResultUrls(results.map((r) => r.url));
      recordActivity("mockup", results.length);
      toast.success(`Đã tạo ${results.length} mockup thành công!`);
    } catch (error) {
      if (isCurrent(task)) toast.error(getErrorMessage(error));
    } finally {
      if (isCurrent(task)) setIsProcessing(false);
    }
  };
  const canGenerate =
    sampleImage &&
    prompts.some((p) => p.trim()) &&
    !isProcessing &&
    !isGenerating;

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
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5 mr-2" />
                Tạo {prompts.filter((p) => p.trim() !== "").length} Mockup
              </>
            )}
          </Button>
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
          <div id="result-section">
            <ResultSection imageUrls={resultUrls} />
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
