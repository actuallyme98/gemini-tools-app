import { useState, useEffect, useCallback } from "react";
import {
  Lightbulb,
  Loader2,
  Eye,
  Upload,
  Sparkles,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { ImageUploadSection } from "../components/ImageUploadSection";
import { ImageAnalysisDisplay } from "../components/idea-generator/ImageAnalysisDisplay";
import { PromptCustomization } from "../components/idea-generator/PromptCustomization";
import { IdeaResultsSection } from "../components/idea-generator/IdeaResultsSection";
import { PromptTemplateDialog } from "../components/idea-generator/PromptTemplateDialog";
import { toast } from "sonner";

import { toGenerateNewIdeaPrompt } from "../utils/prompt.util";

import {
  analyzeProductFromImage,
  generateProductIdeas,
  type ImageAnalysis,
  type GenerateIdeaReturn,
} from "../services/api.service";

export interface PromptOptions {
  globalRules?: string;
  themeRequirement?: string;
  forEachIdea?: string;
  additionalRules?: string;
  important?: string;
}

export function IdeaGeneratorPage() {
  const [sampleImage, setSampleImage] = useState<File | null>(null);
  const [samplePreview, setSamplePreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ImageAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ideaCount, setIdeaCount] = useState(3);
  const [promptOptions, setPromptOptions] = useState<PromptOptions>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [ideas, setIdeas] = useState<GenerateIdeaReturn[]>([]);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [promptTemplate, setPromptTemplate] = useState("");
  const [currentStep, setCurrentStep] = useState(1);

  // Update preview when image changes
  useEffect(() => {
    if (sampleImage) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSamplePreview(reader.result as string);
      };
      reader.readAsDataURL(sampleImage);
      setCurrentStep(1);
      setAnalysis(null);
      setIdeas([]);
    } else {
      setSamplePreview(null);
      setCurrentStep(1);
    }
  }, [sampleImage]);

  useEffect(() => {
    if (!analysis) {
      setPromptTemplate("");
      return;
    }

    const template = generatePromptTemplate(analysis, promptOptions);
    setPromptTemplate(template);
  }, [analysis, ideaCount, promptOptions]);

  const resetState = useCallback(() => {
    setAnalysis(null);
    setIsAnalyzing(false);
    setIdeaCount(3);
    setPromptOptions({});
    setIsGenerating(false);
    setIdeas([]);
    setShowTemplateDialog(false);
    setPromptTemplate("");
    setCurrentStep(1);
  }, []);

  // Mock function to analyze image
  const handleAnalyzeImage = async () => {
    if (!sampleImage) {
      toast.error("Vui lòng tải ảnh lên trước");
      return;
    }

    try {
      setIsAnalyzing(true);
      const imageAnalysis = await analyzeProductFromImage(sampleImage);
      setAnalysis(imageAnalysis);
      setIsAnalyzing(false);
      setCurrentStep(2);
      toast.success("Đã phân tích ảnh thành công!");
    } catch (error) {
      setIsAnalyzing(false);
      toast.error("Phân tích ảnh thất bại. Vui lòng thử lại.");
    }
  };

  // Generate default prompt template
  const generatePromptTemplate = useCallback(
    (analysis: ImageAnalysis, options: PromptOptions) => {
      return toGenerateNewIdeaPrompt(analysis, options, ideaCount);
    },
    [ideaCount]
  );

  // Handle generate ideas
  const handleGenerateIdeas = async () => {
    if (!analysis || !sampleImage) {
      toast.error("Vui lòng phân tích ảnh trước");
      return;
    }

    try {
      setIsGenerating(true);

      const results = await generateProductIdeas(sampleImage, promptTemplate);
      setIdeas((prev) => [...prev, ...results]);

      setIsGenerating(false);
      setCurrentStep(3);
      toast.success(`Đã tạo ${ideaCount} ý tưởng thành công!`);
    } catch (error) {
      setIsGenerating(false);
      toast.error("Tạo ý tưởng thất bại. Vui lòng thử lại.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">
          Tạo Ý Tưởng Sản Phẩm
        </h2>
        <p className="text-gray-600 mt-2">
          Upload ảnh sản phẩm, phân tích và tạo ra những ý tưởng mới sáng tạo
          với AI.
        </p>
      </div>

      {/* Progress Steps */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          {[
            { step: 1, label: "Upload & Phân tích", icon: Upload },
            { step: 2, label: "Tùy chỉnh Prompt", icon: Sparkles },
            { step: 3, label: "Kết quả", icon: ImageIcon },
          ].map((item, index) => {
            const Icon = item.icon;
            const isActive = currentStep === item.step;
            const isCompleted = currentStep > item.step;

            return (
              <div key={item.step} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isCompleted
                        ? "bg-green-500 text-white"
                        : isActive
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {isCompleted ? "✓" : <Icon className="w-5 h-5" />}
                  </div>
                  <span
                    className={`text-sm mt-2 ${
                      isActive ? "text-blue-900 font-semibold" : "text-gray-600"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
                {index < 2 && (
                  <div
                    className={`h-1 flex-1 mx-2 ${
                      currentStep > item.step ? "bg-green-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Step 1: Upload Image */}
          <Card className="p-6">
            <ImageUploadSection
              image={sampleImage}
              preview={samplePreview}
              onImageChange={setSampleImage}
              resetState={resetState}
              title="Ảnh Sản Phẩm"
              description="Tải ảnh sản phẩm cần tạo ý tưởng"
            />

            {sampleImage && !analysis && (
              <Button
                onClick={handleAnalyzeImage}
                disabled={isAnalyzing}
                className="w-full mt-4"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang phân tích...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Phân Tích Ảnh
                  </>
                )}
              </Button>
            )}
          </Card>

          {/* Step 2: Analysis Result */}
          {analysis && <ImageAnalysisDisplay analysis={analysis} />}

          {/* Step 3: Prompt Customization */}
          {analysis && (
            <PromptCustomization
              ideaCount={ideaCount}
              onIdeaCountChange={setIdeaCount}
              promptOptions={promptOptions}
              onPromptOptionsChange={setPromptOptions}
              onViewTemplate={() => {
                setPromptTemplate(
                  generatePromptTemplate(analysis, promptOptions)
                );
                setShowTemplateDialog(true);
              }}
              disabled={isGenerating}
            />
          )}

          {/* Generate Button */}
          {analysis && (
            <Button
              onClick={handleGenerateIdeas}
              disabled={isGenerating}
              className="w-full h-12 text-base bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Đang tạo {ideaCount} ý tưởng...
                </>
              ) : (
                <>
                  <Lightbulb className="w-5 h-5 mr-2" />
                  Tạo {ideaCount} Ý Tưởng
                </>
              )}
            </Button>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Instructions */}
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-3">
              Hướng Dẫn Sử Dụng
            </h3>
            <ol className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2">
                <span className="font-semibold text-blue-600">1.</span>
                <span>Tải ảnh sản phẩm lên và bấm "Phân Tích Ảnh"</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-blue-600">2.</span>
                <span>Xem kết quả phân tích chi tiết về sản phẩm</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-blue-600">3.</span>
                <span>
                  Chọn số lượng ý tưởng và tùy chỉnh prompt (tùy chọn)
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-blue-600">4.</span>
                <span>Bấm "Tạo Ý Tưởng" và tải xuống kết quả</span>
              </li>
            </ol>
          </Card>

          {/* Results */}
          {ideas.length > 0 && <IdeaResultsSection ideas={ideas} />}

          {/* Features when no results */}
          {!ideas.length && (
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Tính Năng</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-gray-900">
                      Phân Tích Thông Minh
                    </h4>
                    <p className="text-xs text-gray-600">
                      AI phân tích chi tiết sản phẩm của bạn
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                    <Lightbulb className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-gray-900">
                      Ý Tưởng Đa Dạng
                    </h4>
                    <p className="text-xs text-gray-600">
                      Tạo nhiều concept khác nhau từ một sản phẩm
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <Eye className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-gray-900">
                      Tùy Chỉnh Linh Hoạt
                    </h4>
                    <p className="text-xs text-gray-600">
                      Điều chỉnh prompt theo ý muốn
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Prompt Template Dialog */}
      <PromptTemplateDialog
        open={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
        template={promptTemplate}
        onTemplateChange={setPromptTemplate}
      />
    </div>
  );
}
