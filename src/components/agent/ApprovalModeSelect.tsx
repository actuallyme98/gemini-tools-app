import { ChevronDown, ShieldCheck, Zap } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import type { ApprovalMode } from "../../services/agent.service";

export function ApprovalModeSelect({
  value,
  disabled,
  onChange,
}: {
  value: ApprovalMode;
  disabled: boolean;
  onChange: (value: ApprovalMode) => void;
}) {
  const Icon = value === "auto" ? Zap : ShieldCheck;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`approval-mode-trigger${value === "auto" ? " is-auto" : ""}`}
          disabled={disabled}
          aria-label={`Chế độ duyệt: ${value === "auto" ? "Auto approval" : "Manual approval"}`}
        >
          <Icon size={16} aria-hidden="true" />
          <span>{value === "auto" ? "Auto approval" : "Manual approval"}</span>
          <ChevronDown size={13} aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="top"
        className="approval-mode-menu"
        collisionPadding={16}
      >
        <DropdownMenuLabel>Chế độ trả lời Agent</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(value) => {
            if (value === "manual" || value === "auto") onChange(value);
          }}
        >
          <DropdownMenuRadioItem value="auto">
            <Zap aria-hidden="true" />
            <span>
              <strong>Auto approval</strong>
              <small>
                Tự chọn gợi ý đầu tiên của Agent và tiếp tục lập kế hoạch.
              </small>
            </span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="manual">
            <ShieldCheck aria-hidden="true" />
            <span>
              <strong>Manual approval</strong>
              <small>
                Bạn chọn gợi ý hoặc nhập câu trả lời trước khi tiếp tục.
              </small>
            </span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <p>
          Vẫn duyệt final prompt trước khi tạo ảnh. Thiếu tệp hoặc chưa có gợi ý
          cụ thể sẽ chờ bạn bổ sung.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
