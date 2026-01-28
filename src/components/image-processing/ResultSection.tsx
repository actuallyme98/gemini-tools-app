import { Download, ImageIcon } from "lucide-react";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { useState } from "react";
import JSZip from "jszip";
import { toast } from "sonner";

import { fetchWithRetry } from "../../utils/image.util";

interface ResultSectionProps {
  imageUrls: string[];
}

export function ResultSection({ imageUrls }: ResultSectionProps) {
  const [downloading, setDownloading] = useState(false);

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
    <Card className="bg-gradient-to-br from-green-50 to-cyan-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-green-600" />
              Kết Quả ({imageUrls.length} images)
            </CardTitle>
            <CardDescription>Ảnh đã được xử lý thành công</CardDescription>
          </div>
          {imageUrls.length > 1 && (
            <Button
              onClick={handleDownloadAll}
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={downloading}
            >
              <Download className="w-4 h-4 mr-2" />
              {downloading ? "Đang tải xuống..." : "Tải xuống tất cả"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {imageUrls.map((url, index) => (
              <div key={index} className="relative group">
                <div className="bg-white rounded-lg p-3 border-2 border-green-200">
                  <img
                    src={url}
                    alt={`Result ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
                <div className="absolute top-5 left-5 bg-black/60 text-white text-sm px-2 py-1 rounded">
                  #{index + 1}
                </div>
                <button
                  onClick={() => handleDownloadSingle(url, index)}
                  className="absolute top-5 right-5 bg-green-600 text-white p-2 rounded-full hover:bg-green-700 transition-all opacity-0 group-hover:opacity-100 shadow-lg"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
