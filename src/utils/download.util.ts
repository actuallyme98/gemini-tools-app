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
  const zip = new JSZip();
  let downloaded = 0;
  await Promise.all(
    urls.map(async (url, index) => {
      try {
        zip.file(`${prefix}-${index + 1}.png`, await fetchWithRetry(url));
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
  return { downloaded, failed: urls.length - downloaded };
}
