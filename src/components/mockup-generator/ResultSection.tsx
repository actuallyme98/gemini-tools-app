import { Download, Copy, Check, Package } from "lucide-react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { useState } from "react";
import JSZip from "jszip";
import { toast } from "sonner";

import { fetchWithRetry } from "../../utils/image.util";

interface ResultSectionProps {
  imageUrls: string[];
}

export function ResultSection({ imageUrls }: ResultSectionProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);

  const handleCopyUrl = async (url: string, index: number) => {
    await navigator.clipboard.writeText(url);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleDownloadSingle = async (url: string, index: number) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `mockup-${index + 1}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success(`Đã tải xuống mockup ${index + 1}`);
    } catch (error) {
      toast.error("Không thể tải xuống ảnh");
    }
  };

  const handleDownloadAll = async () => {
    if (imageUrls.length === 0) return;

    setDownloading(true);
    try {
      const zip = new JSZip();

      const imagePromises = imageUrls.map(async (url, index) => {
        try {
          const blob = await fetchWithRetry(url, 5, 1000);
          zip.file(`mockup-${index + 1}.png`, blob);
        } catch (error) {
          console.error(`Failed after retry image ${index + 1}:`, error);
        }
      });

      await Promise.all(imagePromises);

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(zipBlob);
      link.download = `mockups-${Date.now()}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast.success(`Đã tải xuống ${imageUrls.length} mockup`);
    } catch (error) {
      toast.error("Không thể tải xuống tất cả ảnh");
    } finally {
      setDownloading(false);
    }
  };

  if (imageUrls.length === 0) return null;

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
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
                  type="text"
                  value={url}
                  readOnly
                  className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-md bg-gray-50"
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
