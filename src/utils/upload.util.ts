export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_REFERENCES = 10;
export const MAX_AI_COUNT = 12;
export const MAX_PROMPTS = 20;
export const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";
export function validateImage(file: File): string | undefined {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    return "Chỉ hỗ trợ ảnh PNG, JPEG và WebP.";
  if (file.size === 0) return "Ảnh không được rỗng.";
  if (file.size > MAX_IMAGE_BYTES)
    return "Mỗi ảnh phải nhỏ hơn hoặc bằng 10MB.";
}
