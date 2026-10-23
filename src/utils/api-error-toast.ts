import { toast } from "sonner";
import Axios from "axios";
import { getErrorMessage } from "../services/api.service";

export function notifyApiError(error: unknown, options?: { id: string }) {
  const expiredSession =
    Axios.isAxiosError(error) &&
    error.response?.status === 401 &&
    !/\/auth(?:\/|$)/.test(error.config?.url || "");
  toast.error(getErrorMessage(error), {
    duration: 15000,
    closeButton: true,
    style: { whiteSpace: "pre-line", overflowWrap: "anywhere" },
    ...options,
    ...(expiredSession ? { id: "agent-error" } : {}),
  });
}
