import { useSyncExternalStore } from "react";
type Activity = {
  kind: "mockup" | "ideas" | "image" | "background";
  count: number;
  date: string;
};
const key = "creative-studio-activity";
function snapshot() {
  try {
    return localStorage.getItem(key) ?? "[]";
  } catch {
    return "[]";
  }
}
function parse(raw: string): Activity[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value)
      ? value.filter(
          (item): item is Activity =>
            typeof item === "object" &&
            item !== null &&
            ["mockup", "ideas", "image", "background"].includes(item.kind) &&
            Number.isInteger(item.count) &&
            item.count > 0 &&
            typeof item.date === "string",
        )
      : [];
  } catch {
    return [];
  }
}
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("activity-updated", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("activity-updated", callback);
  };
}
export function recordActivity(kind: Activity["kind"], count: number) {
  if (count <= 0) return;
  try {
    localStorage.setItem(
      key,
      JSON.stringify(
        [
          { kind, count, date: new Date().toISOString() },
          ...parse(snapshot()),
        ].slice(0, 500),
      ),
    );
    window.dispatchEvent(new Event("activity-updated"));
  } catch {
    /* Storage may be disabled. */
  }
}
export function useActivities() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "[]");
  return parse(raw);
}
