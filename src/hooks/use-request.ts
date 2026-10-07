import { useCallback, useEffect, useRef } from "react";
export function useRequest() {
  const active = useRef<AbortController | null>(null);
  const cancel = useCallback(() => {
    active.current?.abort();
    active.current = null;
  }, []);
  useEffect(() => cancel, [cancel]);
  const start = useCallback(() => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    return controller;
  }, []);
  const isCurrent = useCallback(
    (controller: AbortController) =>
      active.current === controller && !controller.signal.aborted,
    [],
  );
  return { start, cancel, isCurrent };
}
