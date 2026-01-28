import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface PromptTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: string;
  onTemplateChange: (template: string) => void;
}

export function PromptTemplateDialog({
  open,
  onOpenChange,
  template,
  onTemplateChange,
}: PromptTemplateDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(template);
    setCopied(true);
    toast.success("Đã copy prompt");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Prompt Template</DialogTitle>
          <DialogDescription>
            Xem và chỉnh sửa prompt mẫu sẽ được gửi đến AI. Các tùy chỉnh của
            bạn đã được thêm vào.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Textarea
            value={template}
            onChange={(e) => onTemplateChange(e.target.value)}
            className="min-h-[400px] font-mono text-xs resize-none"
            placeholder="Prompt template sẽ hiển thị ở đây..."
          />
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleCopy} className="flex-1">
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Đã copy
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Prompt
              </>
            )}
          </Button>
          <Button onClick={() => onOpenChange(false)} className="flex-1">
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
