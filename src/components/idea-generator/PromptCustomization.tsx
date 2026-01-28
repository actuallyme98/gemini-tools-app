import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Eye, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { PromptOptions } from "../../pages/IdeaGeneratorPage";

interface PromptCustomizationProps {
  ideaCount: number;
  onIdeaCountChange: (count: number) => void;
  promptOptions: PromptOptions;
  onPromptOptionsChange: (options: PromptOptions) => void;
  onViewTemplate: () => void;
  disabled?: boolean;
}

const PRESET_COUNTS = [1, 3, 5, 10];

const OPTION_SECTIONS = [
  {
    key: "globalRules" as keyof PromptOptions,
    label: "Global Rules",
    description: "Thêm quy tắc toàn cục cho tất cả ý tưởng",
    placeholder: "VD: Sử dụng ánh sáng tự nhiên, không có logo...",
  },
  {
    key: "themeRequirement" as keyof PromptOptions,
    label: "Theme Requirement",
    description: "Thêm yêu cầu về chủ đề",
    placeholder: "VD: Mỗi chủ đề phải phù hợp với mùa đông...",
  },
  {
    key: "forEachIdea" as keyof PromptOptions,
    label: "For Each Product Idea",
    description: "Thêm yêu cầu cho từng ý tưởng",
    placeholder: "VD: Phải có người mặc sản phẩm...",
  },
  {
    key: "additionalRules" as keyof PromptOptions,
    label: "Additional Rules",
    description: "Các quy tắc bổ sung khác",
    placeholder: "VD: Ưu tiên background ngoài trời...",
  },
  {
    key: "important" as keyof PromptOptions,
    label: "Important",
    description: "Lưu ý quan trọng đặc biệt",
    placeholder: "VD: Tránh sử dụng màu đỏ...",
  },
];

export function PromptCustomization({
  ideaCount,
  onIdeaCountChange,
  promptOptions,
  onPromptOptionsChange,
  onViewTemplate,
  disabled = false,
}: PromptCustomizationProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0 && value <= 50) {
      onIdeaCountChange(value);
    }
  };

  const handleOptionChange = (key: keyof PromptOptions, value: string) => {
    onPromptOptionsChange({
      ...promptOptions,
      [key]: value,
    });
  };

  const toggleSection = (key: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Tùy Chỉnh Prompt</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onViewTemplate}
          disabled={disabled}
        >
          <Eye className="w-4 h-4 mr-2" />
          Xem Prompt Mẫu
        </Button>
      </div>

      {/* Idea Count Selection */}
      <div>
        <Label className="text-sm mb-2 block">Số lượng ý tưởng</Label>
        <div className="flex flex-wrap gap-2 mb-3">
          {PRESET_COUNTS.map((count) => (
            <Button
              key={count}
              variant={ideaCount === count ? "default" : "outline"}
              size="sm"
              onClick={() => onIdeaCountChange(count)}
              disabled={disabled}
              className="min-w-12"
            >
              {count}
            </Button>
          ))}
          <Input
            type="number"
            min="1"
            max="50"
            value={ideaCount}
            onChange={handleCountChange}
            disabled={disabled}
            className="w-20 h-9"
            placeholder="Khác"
          />
        </div>
      </div>

      {/* Optional Sections */}
      <div className="space-y-2">
        <Label className="text-sm text-gray-700 block">
          Tùy chỉnh prompt (tùy chọn)
        </Label>
        <p className="text-xs text-gray-500 mb-3">
          Thêm các quy tắc tùy chỉnh để điều chỉnh kết quả theo ý muốn
        </p>

        <div className="space-y-2">
          {OPTION_SECTIONS.map((section) => {
            const isExpanded = expandedSections.has(section.key);
            const hasValue = promptOptions[section.key]?.trim();

            return (
              <div
                key={section.key}
                className="border rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleSection(section.key)}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                  disabled={disabled}
                >
                  <div className="flex items-center gap-2 flex-1 text-left">
                    <span className="text-sm font-medium text-gray-900">
                      {section.label}
                    </span>
                    {hasValue && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        Đã thêm
                      </span>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </button>

                {isExpanded && (
                  <div className="p-3 border-t bg-gray-50">
                    <p className="text-xs text-gray-600 mb-2">
                      {section.description}
                    </p>
                    <Textarea
                      value={promptOptions[section.key] || ""}
                      onChange={(e) =>
                        handleOptionChange(section.key, e.target.value)
                      }
                      placeholder={section.placeholder}
                      disabled={disabled}
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Các tùy chỉnh sẽ được thêm vào prompt mẫu để tạo kết quả phù hợp hơn
      </p>
    </Card>
  );
}
