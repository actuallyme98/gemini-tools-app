export const DEFAULT_AI_PROVIDER = "shopaikey";

export function isVisibleAIProvider(id: string): boolean {
  return id !== "gemini" && id !== "vyceai";
}

export function getAIProviderLabel(id: string | null | undefined): string {
  if (id === "shopaikey") return "Provider 1";
  if (id === "gemini") return "Provider 2";
  return id ? "Provider khác" : "Chưa hỗ trợ / cấu hình";
}

export function maskAIProviderNames(text: string): string {
  return text
    .replace(
      /\b(?:SHOPAIKEY|GEMINI|VYCEAI)_[A-Z0-9_]+\b/gi,
      "cấu hình dịch vụ AI",
    )
    .replace(/\bshopaikey\b/gi, "Provider 1")
    .replace(/\bgemini\b/gi, "Provider 2")
    .replace(/\bvyceai\b/gi, "dịch vụ văn bản");
}

export function normalizeSavedAIProvider(id: string | null): string {
  // Migrate previously saved defaults and providers hidden from the client.
  return !id || id === "default" || !isVisibleAIProvider(id)
    ? DEFAULT_AI_PROVIDER
    : id;
}
