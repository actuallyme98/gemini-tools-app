import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import { studioBlob } from "../../services/studio.service";

export function StudioImage({
  id,
  name,
  className = "",
}: {
  id: string;
  name: string;
  className?: string;
}) {
  const [result, setResult] = useState<{
    id: string;
    url?: string;
    error?: boolean;
  }>();
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    let url: string | undefined;
    void studioBlob(id, true, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(blob);
        setResult({ id, url });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ id, error: true });
      });
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);
  return (
    <div className={`studio-image ${className}`}>
      {result?.id === id && result.url ? (
        <img
          src={result.url}
          alt={name}
          width={512}
          height={512}
          loading="lazy"
        />
      ) : (
        <span>
          <ImageIcon aria-hidden="true" size={24} />
          {result?.id === id && result.error
            ? "Không tải được ảnh"
            : id
              ? "Đang tải ảnh…"
              : "Chưa có ảnh"}
        </span>
      )}
    </div>
  );
}
