import { useEffect, useState } from "react";
import { assetBlob } from "../../services/agent.service";

export function AgentImage({
  id,
  name,
  className = "",
}: {
  id: string;
  name: string;
  className?: string;
}) {
  const [image, setImage] = useState<{
    id: string;
    url?: string;
    failed?: boolean;
  }>();
  useEffect(() => {
    const controller = new AbortController();
    let url: string | undefined;
    assetBlob(id, controller.signal, true)
      .then((blob) => {
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(blob);
        setImage({ id, url });
      })
      .catch(() => {
        if (!controller.signal.aborted) setImage({ id, failed: true });
      });
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);
  return (
    <div
      className={`aspect-square overflow-hidden rounded-lg bg-gray-100 flex items-center justify-center ${className}`}
    >
      {image?.id === id && image.url ? (
        <img
          src={image.url}
          alt={name}
          width={512}
          height={512}
          loading="lazy"
          className="h-full w-full object-contain"
        />
      ) : (
        <span className="p-3 text-xs text-gray-600">
          {image?.id === id && image.failed
            ? "Không tải được ảnh"
            : "Đang tải ảnh…"}
        </span>
      )}
    </div>
  );
}
