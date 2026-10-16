import { useCallback, useEffect, useRef } from "react";
import { useAIProvider } from "./use-ai-provider";
export function useRequest() {
  const { beginRequest } = useAIProvider();
  const active = useRef<AbortController | null>(null);
  const release = useRef<(() => void) | null>(null);
  const cancel = useCallback(() => {
    active.current?.abort();
    active.current = null;
    release.current?.();
    release.current = null;
  }, []);
  useEffect(() => cancel, [cancel]);
  const start = useCallback(() => {
    cancel();
    const controller = new AbortController();
    active.current = controller;
    release.current = beginRequest();
    return controller;
  }, [beginRequest, cancel]);
  const finish = useCallback((controller: AbortController) => {
    if (active.current !== controller) return;
    release.current?.();
    release.current = null;
  }, []);
  const isCurrent = useCallback(
    (controller: AbortController) =>
      active.current === controller && !controller.signal.aborted,
    [],
  );
  return { start, cancel, isCurrent, finish };
}
