import { downloadImage, downloadZip } from "../../utils/download.util";
import { getErrorMessage } from "../../services/api.service";
import { Download, Copy, Check, Package } from "lucide-react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { useState } from "react";

import { toast } from "sonner";

interface ResultSectionProps {
  imageUrls: string[];
}

export function ResultSection({ imageUrls }: ResultSectionProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);

  const handleCopyUrl = async (url: string, index: number) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      toast.error("Không thể copy đường dẫn.");
      return;
    }
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleDownloadSingle = async (url: string, index: number) => {
    try {
      await downloadImage(url, `mockup-${index + 1}.png`);
      toast.success(`Đã tải xuống mockup ${index + 1}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleDownloadAll = async () => {
    if (imageUrls.length === 0) return;

    setDownloading(true);
    try {
      const { downloaded, failed } = await downloadZip(imageUrls, "mockups");
      if (failed)
        toast.warning(
          `Đã tải ${downloaded}/${imageUrls.length} ảnh; ${failed} ảnh bị lỗi.`,
        );
      else toast.success(`Đã tải xuống ${downloaded} ảnh`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDownloading(false);
    }
  };

  if (imageUrls.length === 0) return null;

  return (
    <Card className="p-6 space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <h3 className="font-medium">
          Kết Quả ({imageUrls.length} mockup{imageUrls.length > 1 ? "s" : ""})
        </h3>
        {imageUrls.length > 1 && (
          <Button
            onClick={handleDownloadAll}
            disabled={downloading}
            size="sm"
            variant="outline"
          >
            {downloading ? (
              <>
                <Package className="w-4 h-4 mr-2 animate-pulse" />
                Đang tải...
              </>
            ) : (
              <>
                <Package className="w-4 h-4 mr-2" />
                Tải Tất Cả (ZIP)
              </>
            )}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {imageUrls.map((url, index) => (
          <div key={index} className="space-y-3 border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Mockup #{index + 1}
              </span>
            </div>

            <div className="relative rounded-lg overflow-hidden bg-gray-50">
              <img
                src={url}
                alt={`Result ${index + 1}`}
                className="w-full h-auto"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  aria-label={`Đường dẫn ảnh ${index + 1}`}
                  type="text"
                  value={url}
                  readOnly
                  className="min-w-0 flex-1 px-3 py-2 text-xs border border-gray-300 rounded-md bg-gray-50"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyUrl(url, index)}
                  className="shrink-0"
                >
                  {copiedIndex === index ? (
                    <>
                      <Check className="w-3 h-3 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>

              <Button
                onClick={() => handleDownloadSingle(url, index)}
                variant="default"
                size="sm"
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Tải Xuống
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
