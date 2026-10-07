import { useAIProvider } from "../hooks/use-ai-provider";
import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, Wand2, X } from "lucide-react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
import { ImageUploadSection } from "../components/ImageUploadSection";
import { ResultSection } from "../components/image-processing/ResultSection";
import { toast } from "sonner";
import { generateImagesFromReferalImages } from "../services/api.service";
import { notifyApiError } from "../utils/api-error-toast";
import { useImageInput } from "../hooks/use-image-input";
import { useRequest } from "../hooks/use-request";
import {
  IMAGE_ACCEPT,
  MAX_REFERENCES,
  validateImage,
} from "../utils/upload.util";
import { recordActivity } from "../utils/activity.util";

export function ImageProcessingPage() {
  const { provider } = useAIProvider();
  const {
    file: productFile,
    preview: productImage,
    setFile: setProductFile,
  } = useImageInput();
  const [references, setReferences] = useState<{ file: File; url: string }[]>(
    [],
  );
  const urls = useRef(new Set<string>());
  useEffect(() => {
    const current = urls.current;
    return () => {
      current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);
  const [resultImages, setResultImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [enableMultipleOutput, setEnableMultipleOutput] = useState(false);
  const [variations, setVariations] = useState(3);
  const { start, cancel, isCurrent } = useRequest();
  const invalidate = useCallback(() => {
    cancel();
    setIsProcessing(false);
    setResultImages([]);
    toast.dismiss("processing");
  }, [cancel]);
  const addReferences = (files: File[]) => {
    if (!files.length) return;
    if (references.length + files.length > MAX_REFERENCES) {
      toast.error("Tối đa 10 ảnh tham chiếu.");
      return;
    }
    const error = files.map(validateImage).find(Boolean);
    if (error) {
      toast.error(error);
      return;
    }
    invalidate();
    const entries = files.map((file) => {
      const url = URL.createObjectURL(file);
      urls.current.add(url);
      return { file, url };
    });
    setReferences((prev) => [...prev, ...entries]);
  };
  const removeReference = (index: number) => {
    invalidate();
    URL.revokeObjectURL(references[index].url);
    urls.current.delete(references[index].url);
    setReferences((prev) => prev.filter((_, i) => i !== index));
  };
  const reset = () => {
    invalidate();
    setProductFile(null);
    urls.current.forEach((url) => URL.revokeObjectURL(url));
    urls.current.clear();
    setReferences([]);
    setVariations(3);
    setEnableMultipleOutput(false);
  };
  const submit = async () => {
    if (!productFile || !references.length || isProcessing) return;
    const task = start();
    setIsProcessing(true);
    setResultImages([]);
    toast.loading("Đang xử lý ảnh...", { id: "processing" });
    try {
      const result = await generateImagesFromReferalImages({
        productImage: productFile,
        referenceImages: references.map((ref) => ref.file),
        variations: enableMultipleOutput ? variations : 1,
        signal: task.signal,
        provider: provider || undefined,
      });
      if (!isCurrent(task)) return;
      setResultImages(result);
      recordActivity("image", result.length);
      toast.success(`Đã tạo ${result.length} ảnh thành công!`, {
        id: "processing",
      });
    } catch (error) {
      if (isCurrent(task)) notifyApiError(error, { id: "processing" });
    } finally {
      if (isCurrent(task)) setIsProcessing(false);
    }
  };
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Image Processing</h2>
        <p className="text-gray-600 mt-2">
          Tạo thiết kế trên sản phẩm từ ảnh tham chiếu, giữ cấu trúc và chất
          liệu sản phẩm gốc.
        </p>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-4 sm:p-6">
          <ImageUploadSection
            image={productFile}
            preview={productImage}
            onImageChange={setProductFile}
            resetState={invalidate}
            title="Ảnh sản phẩm"
            description="Tải ảnh sản phẩm gốc cần chỉnh sửa"
          />
        </Card>
        <Card
          className="p-4 sm:p-6 space-y-4"
          tabIndex={0}
          aria-label="Ảnh tham chiếu"
          onPaste={(e) => {
            const files = Array.from(e.clipboardData.items)
              .map((item) => item.getAsFile())
              .filter((file): file is File => file !== null);
            if (files.length) {
              e.preventDefault();
              addReferences(files);
            }
          }}
        >
          <h3 className="font-semibold">
            Ảnh tham chiếu ({references.length}/10)
          </h3>
          <p className="text-sm text-gray-600">
            PNG, JPEG, WebP · tối đa 10MB mỗi ảnh. Có thể Ctrl + V để dán.
          </p>
          <input
            type="file"
            id="reference-upload"
            accept={IMAGE_ACCEPT}
            multiple
            className="sr-only peer"
            aria-label="Tải ảnh tham chiếu"
            onChange={(e) => {
              addReferences(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
          <label
            htmlFor="reference-upload"
            className="flex items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer peer-focus-visible:ring-2"
          >
            <Upload className="w-5 h-5" />
            Chọn ảnh tham chiếu
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {references.map((ref, index) => (
              <div
                key={ref.url}
                className="relative rounded-lg border p-2 min-w-0"
              >
                <img
                  src={ref.url}
                  alt={`Ảnh tham chiếu ${index + 1}: ${ref.file.name}`}
                  className="w-full h-32 object-contain"
                />
                <Button
                  aria-label={`Xóa ảnh tham chiếu ${index + 1}`}
                  variant="destructive"
                  size="sm"
                  className="absolute top-1 right-1 h-10 w-10 p-0"
                  onClick={() => removeReference(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
                <p className="text-xs truncate mt-2">{ref.file.name}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="multiple-output">Tạo nhiều ảnh đầu ra</Label>
          <Switch
            id="multiple-output"
            checked={enableMultipleOutput}
            onCheckedChange={setEnableMultipleOutput}
            disabled={isProcessing}
          />
        </div>
        {enableMultipleOutput && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Số lượng ảnh</p>
            <div className="flex flex-wrap gap-2">
              {[1, 3, 5, 10].map((count) => (
                <Button
                  key={count}
                  aria-pressed={variations === count}
                  variant={variations === count ? "default" : "outline"}
                  onClick={() => setVariations(count)}
                  disabled={isProcessing}
                >
                  {count}
                </Button>
              ))}
            </div>
            <p className="text-sm text-gray-600">
              Sẽ tạo {variations} ảnh. Mỗi ảnh cần một lần xử lý AI riêng.
            </p>
          </div>
        )}
      </Card>
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={submit}
          disabled={!productFile || !references.length || isProcessing}
          className="min-h-12"
        >
          <Wand2 className="w-5 h-5 mr-2" />
          {isProcessing ? "Đang Xử Lý..." : "Xử Lý Ảnh"}
        </Button>
        <Button onClick={reset} variant="outline" className="min-h-12">
          Reset
        </Button>
      </div>
      {resultImages.length > 0 && <ResultSection imageUrls={resultImages} />}
    </div>
  );
}
