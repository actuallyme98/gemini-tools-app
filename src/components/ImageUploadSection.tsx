import { Upload, X } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { useCallback } from "react";

interface ImageUploadSectionProps {
  image: File | null;
  preview: string | null;
  onImageChange: (file: File | null) => void;
  title: string;
  description: string;
  resetState: () => void;
}

export function ImageUploadSection({
  image,
  preview,
  onImageChange,
  title,
  description,
  resetState,
}: ImageUploadSectionProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    resetState();
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      onImageChange(file);
    }
  };

  const handleRemove = () => {
    onImageChange(null);
    resetState();
  };

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      const items = e.clipboardData.items;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            resetState();
            onImageChange(file);
          }
          break;
        }
      }
    },
    [onImageChange, resetState]
  );

  return (
    <div className="space-y-2" onPaste={handlePaste} tabIndex={0}>
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>

      {!preview ? (
        <label className="block">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <Card className="border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors cursor-pointer">
            <div className="p-8 flex flex-col items-center justify-center gap-2">
              <Upload className="w-10 h-10 text-gray-400" />
              <p className="text-sm text-gray-600">
                Nhấp hoặc <span className="font-medium">Ctrl + V</span> để dán
                ảnh
              </p>
              <p className="text-xs text-gray-400">
                PNG, JPG, WEBP (tối đa 10MB)
              </p>
            </div>
          </Card>
        </label>
      ) : (
        <Card className="relative overflow-hidden">
          <div className="p-4">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-48 object-contain rounded"
            />
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={handleRemove}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="px-4 pb-4">
            <p className="text-xs text-gray-500 truncate">{image?.name}</p>
          </div>
        </Card>
      )}
    </div>
  );
}
