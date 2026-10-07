export async function fetchWithRetry(
  url: string,
  retries = 3,
  delay = 1000,
): Promise<Blob> {
  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok)
        throw new Error(`Không tải được ảnh (HTTP ${response.status}).`);
      const blob = await response.blob();
      if (!blob.type.startsWith("image/") || blob.size === 0)
        throw new Error("Đường dẫn không trả về ảnh hợp lệ.");
      return blob;
    } catch (error) {
      lastError = error;
      if (attempt < retries - 1)
        await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}
