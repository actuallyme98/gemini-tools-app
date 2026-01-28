import { useState, useRef } from "react";
import { Upload, Wand2, Image as ImageIcon, X, Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
import { ResultSection } from "../components/image-processing/ResultSection";
import { toast } from "sonner";

import { generateImagesFromReferalImages } from "../services/api.service";

const variationOptions = [1, 3, 5, 10];

export function ImageProcessingPage() {
  const [productFile, setProductFile] = useState<File | null>(null);
  const [productImage, setProductImage] = useState<string | null>(null);

  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);

  const [resultImages, setResultImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const [enableMultipleOutput, setEnableMultipleOutput] = useState(false);
  const [variations, setVariations] = useState<number>(0);

  const productInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (file: File, type: "product" | "reference") => {
    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file ảnh hợp lệ");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;

      if (type === "product") {
        setProductFile(file);
        setProductImage(result);
      } else {
        setReferenceFiles((prev) => [...prev, file]);
        setReferenceImages((prev) => [...prev, result]);
      }
    };

    reader.readAsDataURL(file);
  };

  const handleMultipleImageUpload = (files: FileList) => {
    const validFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/")
    );

    if (validFiles.length === 0) {
      toast.error("Vui lòng chọn file ảnh hợp lệ");
      return;
    }

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setReferenceFiles((prev) => [...prev, file]);
        setReferenceImages((prev) => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });

    toast.success(`Đã thêm ${validFiles.length} ảnh tham chiếu`);
  };

  const removeReferenceImage = (index: number) => {
    setReferenceImages((prev) => prev.filter((_, i) => i !== index));
    setReferenceFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!productFile || referenceFiles.length === 0) {
      toast.error("Vui lòng upload ảnh sản phẩm và ít nhất 1 ảnh tham chiếu");
      return;
    }

    setIsProcessing(true);
    toast.loading("Đang xử lý ảnh...", { id: "processing" });

    try {
      const urls = await generateImagesFromReferalImages({
        productImage: productFile,
        referenceImages: referenceFiles,
        variations: enableMultipleOutput ? variations : undefined,
      });

      setResultImages(urls);
      toast.success("Xử lý ảnh thành công!", { id: "processing" });
    } catch (error) {
      console.error(error);
      toast.error("Có lỗi xảy ra khi xử lý ảnh", { id: "processing" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setProductFile(null);
    setProductImage(null);
    setReferenceFiles([]);
    setReferenceImages([]);
    setResultImages([]);
    setIsProcessing(false);
    setEnableMultipleOutput(false);
    setVariations(3);

    if (productInputRef.current) {
      productInputRef.current.value = "";
    }
    if (referenceInputRef.current) {
      referenceInputRef.current.value = "";
    }
  };

  const handlePasteImage = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData.items;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (item.type.startsWith("image")) {
        const file = item.getAsFile();
        if (!file) continue;

        // Cleanup preview cũ
        if (productImage) {
          URL.revokeObjectURL(productImage);
        }

        setProductFile(file);
        setProductImage(URL.createObjectURL(file));
        e.preventDefault();
        break; // chỉ lấy 1 ảnh
      }
    }
  };

  const handlePasteImages = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData.items;
    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image")) {
        const file = item.getAsFile();
        if (file) {
          newFiles.push(file);
          newPreviews.push(URL.createObjectURL(file));
        }
      }
    }

    if (newFiles.length > 0) {
      setReferenceFiles((prev) => [...prev, ...newFiles]);
      setReferenceImages((prev) => [...prev, ...newPreviews]);
      e.preventDefault();
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Image Processing</h1>
        <p className="text-gray-600">
          Upload ảnh sản phẩm và nhiều ảnh tham chiếu để tạo mockup độc đáo với
          AI
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Product Image Upload */}
        <Card onPaste={handlePasteImage}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Ảnh Sản Phẩm Gốc
            </CardTitle>
            <CardDescription>
              Upload/Paste ảnh sản phẩm mà bạn muốn xử lý
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                onClick={() => productInputRef.current?.click()}
              >
                {productImage ? (
                  <div className="relative">
                    <img
                      src={productImage}
                      alt="Product"
                      className="max-h-64 mx-auto rounded-lg"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setProductImage(null);
                        if (productInputRef.current)
                          productInputRef.current.value = "";
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-center">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <Upload className="w-8 h-8 text-blue-600" />
                      </div>
                    </div>
                    <div>
                      <p className="font-medium">
                        Click để upload ảnh sản phẩm
                      </p>
                      <p className="text-sm text-gray-500">
                        PNG, JPG, JPEG (Max 10MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <input
                ref={productInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file, "product");
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Reference Images Upload */}
        <Card onPaste={handlePasteImages}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              Ảnh Tham Chiếu/Ý Tưởng
            </CardTitle>
            <CardDescription>
              Upload/Paste nhiều ảnh tham chiếu hoặc ý tưởng mockup (
              {referenceImages.length} ảnh)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Grid hiển thị ảnh tham chiếu đã upload */}
              {referenceImages.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {referenceImages.map((img, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={img}
                        alt={`Reference ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                      />
                      <button
                        onClick={() => removeReferenceImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                        #{index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Nút upload thêm ảnh */}
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors cursor-pointer"
                onClick={() => referenceInputRef.current?.click()}
              >
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                      {referenceImages.length > 0 ? (
                        <Plus className="w-8 h-8 text-purple-600" />
                      ) : (
                        <Upload className="w-8 h-8 text-purple-600" />
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium">
                      {referenceImages.length > 0
                        ? "Click để thêm ảnh tham chiếu"
                        : "Click để upload ảnh tham chiếu"}
                    </p>
                    <p className="text-sm text-gray-500">
                      PNG, JPG, JPEG (Max 10MB mỗi file)
                    </p>
                    <p className="text-xs text-purple-600 mt-1">
                      Có thể chọn nhiều ảnh cùng lúc
                    </p>
                  </div>
                </div>
              </div>
              <input
                ref={referenceInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    handleMultipleImageUpload(files);
                  }
                  e.target.value = "";
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Multiple Mockup Option */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Tùy chọn tạo nhiều ảnh</CardTitle>
              <CardDescription>
                Chọn số lượng ảnh muốn tạo ra từ ảnh tham chiếu
              </CardDescription>
            </div>
            <Switch
              checked={enableMultipleOutput}
              onCheckedChange={setEnableMultipleOutput}
              id="multiple-output"
            />
          </div>
        </CardHeader>
        {enableMultipleOutput && (
          <CardContent>
            <div className="space-y-3">
              <Label className="text-sm font-medium">Số lượng ảnh</Label>
              <div className="flex gap-3 items-center flex-wrap">
                {variationOptions.map((count) => (
                  <button
                    key={count}
                    onClick={() => {
                      setVariations(count);
                    }}
                    className="px-6 py-3 rounded-lg font-medium transition-all"
                  >
                    {count}
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Sẽ tạo ra {variations} phiên bản ảnh khác nhau dựa trên các ảnh
                tham chiếu
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 mb-6">
        <Button
          onClick={handleSubmit}
          disabled={
            !productImage || referenceImages.length === 0 || isProcessing
          }
          className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-8 py-6 text-lg"
        >
          <Wand2 className="w-5 h-5 mr-2" />
          {isProcessing ? "Đang Xử Lý..." : "Xử Lý Ảnh"}
        </Button>

        <Button
          onClick={handleReset}
          variant="outline"
          className="px-8 py-6 text-lg"
        >
          <X className="w-5 h-5 mr-2" />
          Reset
        </Button>
      </div>

      {/* Result */}
      {resultImages.length > 0 && <ResultSection imageUrls={resultImages} />}

      {/* Instructions */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg">Hướng Dẫn Sử Dụng</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>
              Upload <strong>ảnh sản phẩm gốc</strong> của bạn ở ô bên trái
            </li>
            <li>
              Upload <strong>một hoặc nhiều ảnh tham chiếu/ý tưởng</strong> (ví
              dụ: mockup mẫu, nền, phong cách) ở ô bên phải
            </li>
            <li>
              Bạn có thể upload nhiều ảnh tham chiếu cùng lúc hoặc thêm dần từng
              ảnh
            </li>
            <li>
              Click nút <strong>"Xử Lý Ảnh"</strong> để AI kết hợp và tạo mockup
              mới
            </li>
            <li>
              Sau khi xử lý xong, click <strong>"Tải Xuống Ảnh"</strong> để lưu
              kết quả về máy
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
