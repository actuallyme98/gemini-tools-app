import { createContext } from "react";
import type { AIProviderCatalog } from "../services/api.service";

export const AIProviderContext = createContext<{
  catalog: AIProviderCatalog | null;
  provider: string;
  savedProviderUnavailable: boolean;
  loading: boolean;
  error: boolean;
  selectProvider: (id: string) => void;
  retry: () => void;
} | null>(null);
