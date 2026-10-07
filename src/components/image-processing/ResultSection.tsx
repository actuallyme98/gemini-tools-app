import { downloadImage, downloadZip } from "../../utils/download.util";
import { getErrorMessage } from "../../services/api.service";
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

import { toast } from "sonner";

interface ResultSectionProps {
  imageUrls: string[];
}

export function ResultSection({ imageUrls }: ResultSectionProps) {
  const [downloading, setDownloading] = useState(false);

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
    <Card className="bg-gradient-to-br from-green-50 to-cyan-50">
      <CardHeader>
        <div className="flex flex-wrap gap-2 items-center justify-between">
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
                    className="w-full h-48 object-contain rounded-lg"
                  />
                </div>
                <div className="absolute top-5 left-5 bg-black/60 text-white text-sm px-2 py-1 rounded">
                  #{index + 1}
                </div>
                <button
                  onClick={() => handleDownloadSingle(url, index)}
                  className="absolute top-5 right-5 bg-green-600 text-white p-2 rounded-full hover:bg-green-700 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 shadow-lg"
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
