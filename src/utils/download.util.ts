import JSZip from "jszip";
import { fetchWithRetry } from "./image.util";
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function downloadImage(url: string, filename: string) {
  saveBlob(await fetchWithRetry(url, 1), filename);
}
export async function downloadZip(urls: string[], prefix: string) {
  return downloadZipEntries(
    urls.map((url, index) => ({ url, filename: `${prefix}-${index + 1}.png` })),
    prefix,
  );
}

export async function downloadZipEntries(
  entries: { url: string; filename: string }[],
  prefix: string,
) {
  const zip = new JSZip();
  let downloaded = 0;
  await Promise.all(
    entries.map(async ({ url, filename }) => {
      try {
        zip.file(filename, await fetchWithRetry(url));
        downloaded++;
      } catch {
        /* Report each failed file in the final count. */
      }
    }),
  );
  if (!downloaded)
    throw new Error(
      "Không tải được ảnh nào. Kiểm tra kết nối hoặc cấu hình CORS của kho ảnh.",
    );
  saveBlob(
    await zip.generateAsync({ type: "blob" }),
    `${prefix}-${Date.now()}.zip`,
  );
  return { downloaded, failed: entries.length - downloaded };
}
