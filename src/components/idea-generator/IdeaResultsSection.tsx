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
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `idea-${index + 1}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success(`Đã tải xuống ý tưởng ${index + 1}`);
    } catch (error) {
      toast.error("Không thể tải xuống ảnh");
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
                <img src={idea.url} className="w-full h-full object-cover" />
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
              <p className="text-xs text-gray-700 leading-relaxed">
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
