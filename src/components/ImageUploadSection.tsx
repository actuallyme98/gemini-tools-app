import { Upload, X } from "lucide-react";
import { useId } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { toast } from "sonner";
import { IMAGE_ACCEPT, validateImage } from "../utils/upload.util";
interface ImageUploadSectionProps {
  image: File | null;
  preview: string | null;
  onImageChange: (file: File | null) => void;
  title: string;
  description: string;
  resetState: () => void;
  disabled?: boolean;
}
export function ImageUploadSection({
  image,
  preview,
  onImageChange,
  title,
  description,
  resetState,
  disabled = false,
}: ImageUploadSectionProps) {
  const id = useId();
  const selectFile = (file: File) => {
    if (disabled) return;
    const error = validateImage(file);
    if (error) {
      toast.error(error);
      return;
    }
    resetState();
    onImageChange(file);
  };
  return (
    <div
      className="space-y-2"
      tabIndex={0}
      aria-label={title}
      onPaste={(e) => {
        const file = Array.from(e.clipboardData.items)
          .find((item) => item.type.startsWith("image/"))
          ?.getAsFile();
        if (file) {
          e.preventDefault();
          selectFile(file);
        }
      }}
    >
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
      <input
        id={id}
        type="file"
        disabled={disabled}
        accept={IMAGE_ACCEPT}
        aria-label={`Tải ${title}`}
        className="sr-only peer"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) selectFile(file);
          e.target.value = "";
        }}
      />
      {!preview ? (
        <label
          htmlFor={id}
          className="block cursor-pointer peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 rounded-lg"
        >
          <Card className="border-2 border-dashed border-gray-300 hover:border-gray-400">
            <div className="p-6 flex flex-col items-center justify-center gap-2">
              <Upload className="w-10 h-10 text-gray-400" aria-hidden="true" />
              <p className="text-sm text-gray-600">
                Chọn ảnh hoặc Ctrl + V để dán ảnh
              </p>
              <p className="text-xs text-gray-500">
                PNG, JPEG, WebP · tối đa 10MB
              </p>
            </div>
          </Card>
        </label>
      ) : (
        <Card className="relative overflow-hidden">
          <div className="p-4">
            <img
              src={preview}
              alt={image?.name || "Ảnh sản phẩm"}
              className="w-full h-48 object-contain rounded"
            />
            <Button
              aria-label="Xóa ảnh"
              disabled={disabled}
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2 min-h-10 min-w-10"
              onClick={() => {
                resetState();
                onImageChange(null);
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="px-4 pb-4 flex items-center justify-between gap-2">
            <p className="text-xs text-gray-500 truncate">{image?.name}</p>
            <label
              htmlFor={id}
              className="text-sm text-blue-700 cursor-pointer underline shrink-0"
            >
              Đổi ảnh
            </label>
          </div>
        </Card>
      )}
    </div>
  );
}
