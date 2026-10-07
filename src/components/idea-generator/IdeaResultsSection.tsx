import { downloadImage } from "../../utils/download.util";
import { getErrorMessage } from "../../services/api.service";
import { Download, Sparkles } from "lucide-react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { toast } from "sonner";

interface IdeaResultsSectionProps {
  ideas: {
    url: string;
    prompt: string;
  }[];
}

export function IdeaResultsSection({ ideas }: IdeaResultsSectionProps) {
  const handleDownload = async (url: string, index: number) => {
    try {
      await downloadImage(url, `idea-${index + 1}.png`);
      toast.success(`Đã tải xuống ý tưởng ${index + 1}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  if (ideas.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-purple-600" />
        <h3 className="font-semibold text-gray-900">
          {ideas.length} Ý Tưởng Đã Tạo
        </h3>
      </div>

      <div className="space-y-4">
        {ideas.map((idea, index) => (
          <Card key={index} className="overflow-hidden">
            {/* Image */}
            {
              <div className="relative aspect-square bg-gray-100">
                <img
                  src={idea.url}
                  alt={`Ý tưởng sản phẩm ${index + 1}`}
                  loading="lazy"
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-3 left-3">
                  <Badge className="bg-white/90 text-gray-900 backdrop-blur-sm">
                    #{index + 1}
                  </Badge>
                </div>
              </div>
            }

            {/* Prompt */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1 font-medium">Prompt:</p>
              <p className="text-xs text-gray-700 leading-relaxed break-words">
                {idea.prompt}
              </p>
            </div>

            <div className="p-4 space-y-3">
              <Button
                onClick={() => handleDownload(idea.url, index)}
                variant="outline"
                className="w-full"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Tải Xuống Ảnh
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
