export const DEFAULT_AI_PROVIDER = "gemini";

export function normalizeSavedAIProvider(id: string | null): string {
  // Migrate selections saved before the system default and VyceAI were removed.
  return !id || id === "default" || id === "vyceai" ? DEFAULT_AI_PROVIDER : id;
}
