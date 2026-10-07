export const DEFAULT_AI_PROVIDER = "gemini";

export function isAIProviderEnabled(id: string): boolean {
  return id !== "vyceai";
}
