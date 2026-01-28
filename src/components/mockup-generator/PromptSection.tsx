import { Sparkles, Loader2, Plus, X } from "lucide-react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Card } from "../ui/card";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Input } from "../ui/input";

interface PromptSectionProps {
  prompts: string[];
  autoGenerate: boolean;
  isGenerating: boolean;
  mockupCount: number;
  onPromptsChange: (value: string[]) => void;
  onAutoGenerateChange: (value: boolean) => void;
  onMockupCountChange: (value: number) => void;
  onGeneratePrompts: () => void;
  disabled?: boolean;
}

const PRESET_COUNTS = [1, 3, 5, 10];

export function PromptSection({
  prompts,
  autoGenerate,
  isGenerating,
  mockupCount,
  onPromptsChange,
  onAutoGenerateChange,
  onMockupCountChange,
  onGeneratePrompts,
  disabled = false,
}: PromptSectionProps) {
  const handlePromptChange = (index: number, value: string) => {
    const newPrompts = [...prompts];
    newPrompts[index] = value;
    onPromptsChange(newPrompts);
  };

  const handleAddPrompt = () => {
    onPromptsChange([...prompts, ""]);
  };

  const handleRemovePrompt = (index: number) => {
    const newPrompts = prompts.filter((_, i) => i !== index);
    onPromptsChange(newPrompts.length === 0 ? [""] : newPrompts);
  };

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0 && value <= 50) {
      onMockupCountChange(value);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Prompts</h3>
        <div className="flex items-center space-x-2">
          <Switch
            id="auto-generate"
            checked={autoGenerate}
            onCheckedChange={onAutoGenerateChange}
            disabled={disabled}
          />
          <Label htmlFor="auto-generate" className="cursor-pointer">
            Tự động tạo prompts
          </Label>
        </div>
      </div>

      {autoGenerate ? (
        <div className="space-y-4">
          <div>
            <Label className="text-sm mb-2 block">Số lượng mockup</Label>
            <div className="flex flex-wrap gap-2 mb-3">
              {PRESET_COUNTS.map((count) => (
                <Button
                  key={count}
                  variant={mockupCount === count ? "default" : "outline"}
                  size="sm"
                  onClick={() => onMockupCountChange(count)}
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
                value={mockupCount}
                onChange={handleCountChange}
                disabled={disabled}
                className="w-20 h-9"
                placeholder="Khác"
              />
            </div>
            <p className="text-xs text-gray-400">
              Tool sẽ tạo {mockupCount} prompts khác nhau dựa trên ảnh mẫu
            </p>
          </div>

          <Button
            onClick={onGeneratePrompts}
            disabled={disabled || isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang tạo {mockupCount} prompts...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Tạo {mockupCount} Prompts Tự Động
              </>
            )}
          </Button>

          {prompts.length > 0 && prompts[0] && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <p className="text-sm font-medium text-gray-700">
                {prompts.length} prompts đã được tạo:
              </p>
              {prompts.map((prompt, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600"
                >
                  <span className="font-medium text-blue-600">
                    #{index + 1}:
                  </span>{" "}
                  {prompt}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            {prompts.map((prompt, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`prompt-${index}`} className="text-sm">
                    Prompt #{index + 1}
                  </Label>
                  {prompts.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePrompt(index)}
                      disabled={disabled}
                      className="h-6 w-6 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                <Textarea
                  id={`prompt-${index}`}
                  placeholder="VD: A modern minimalist product mockup with soft lighting..."
                  value={prompt}
                  onChange={(e) => handlePromptChange(index, e.target.value)}
                  disabled={disabled}
                  rows={3}
                  className="resize-none"
                />
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={handleAddPrompt}
            disabled={disabled || prompts.length >= 20}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Thêm Prompt (tối đa 20)
          </Button>

          <p className="text-xs text-gray-400">
            Nhập nhiều prompts để tạo các mockup khác nhau
          </p>
        </div>
      )}
    </Card>
  );
}
