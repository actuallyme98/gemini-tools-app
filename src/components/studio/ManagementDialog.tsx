import type { ReactNode, RefObject } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
export function ManagementDialog({
  open,
  title,
  description,
  busy,
  onClose,
  trigger,
  children,
}: {
  open: boolean;
  title: string;
  description: string;
  busy: boolean;
  onClose: () => void;
  trigger: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onClose();
      }}
    >
      <DialogContent
        className="management-dialog"
        aria-busy={busy}
        onCloseAutoFocus={(event) => {
          if (trigger.current?.isConnected) {
            event.preventDefault();
            trigger.current.focus();
          }
        }}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
