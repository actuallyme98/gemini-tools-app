import { toast } from "sonner";
import { getErrorMessage } from "../services/api.service";

export function notifyApiError(error: unknown, options?: { id: string }) {
  toast.error(getErrorMessage(error), {
    duration: 15000,
    closeButton: true,
    style: { whiteSpace: "pre-line", overflowWrap: "anywhere" },
    ...options,
  });
}
