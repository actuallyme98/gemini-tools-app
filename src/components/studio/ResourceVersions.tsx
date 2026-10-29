import { useState } from "react";
import {
  studioClient,
  type StudioResource,
} from "../../services/studio.service";
import { getErrorMessage } from "../../services/api.service";
import { Button } from "../ui/button";
export function ResourceVersions({ resource }: { resource: StudioResource }) {
  const [items, setItems] = useState<StudioResource[]>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function load() {
    setBusy(true);
    try {
      setItems(
        await studioClient.get<StudioResource[]>(
          `/resources/${resource.id}/versions`,
        ),
      );
      setError("");
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <details>
      <summary>Lịch sử phiên bản</summary>
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => void load()}
      >
        {busy ? "Đang tải…" : "Xem các phiên bản"}
      </Button>
      {error && (
        <p className="studio-error" role="alert">
          {error}
        </p>
      )}
      <ul>
        {items?.map((item) => (
          <li key={item.id}>
            <strong>
              {item.name} · v{item.versionNumber ?? 1}
            </strong>{" "}
            ·{" "}
            {item.status === "approved"
              ? "Đang được phép dùng"
              : item.status === "archived"
                ? "Đã lưu trữ"
                : "Chờ duyệt"}
            {item.printSpec &&
              ` · ${item.printSpec.width}×${item.printSpec.height}px / ${item.printSpec.dpi} DPI`}
          </li>
        ))}
      </ul>
    </details>
  );
}
