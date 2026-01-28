export const formatToBulletLines = (input?: string) => {
  if (!input) return "";

  const lines = input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return "";

  return lines.map((l) => `- ${l}`).join("\n");
};
