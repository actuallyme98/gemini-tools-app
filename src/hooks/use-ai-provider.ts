import { useContext } from "react";
import { AIProviderContext } from "../context/ai-provider-context";

export function useAIProvider() {
  const context = useContext(AIProviderContext);
  if (!context) throw new Error("AI provider context is missing");
  return context;
}
