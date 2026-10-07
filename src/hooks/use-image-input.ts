import { useCallback, useEffect, useState } from "react";
export function useImageInput() {
  const [image, setImage] = useState<{ file: File; preview: string } | null>(
    null,
  );
  useEffect(
    () => () => {
      if (image) URL.revokeObjectURL(image.preview);
    },
    [image],
  );
  const setFile = useCallback((file: File | null) => {
    setImage(file ? { file, preview: URL.createObjectURL(file) } : null);
  }, []);
  return {
    file: image?.file ?? null,
    preview: image?.preview ?? null,
    setFile,
  };
}
