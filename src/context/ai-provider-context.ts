import { createContext } from "react";
import type {
  AIProviderCatalog,
  AIImageModelCatalog,
} from "../services/api.service";

export const AIProviderContext = createContext<{
  catalog: AIProviderCatalog | null;
  provider: string;
  savedProviderUnavailable: boolean;
  loading: boolean;
  error: string | null;
  selectProvider: (id: string) => void;
  retry: () => void;
  imageModel: string | undefined;
  imageModels: AIImageModelCatalog | null;
  imageModelsLoading: boolean;
  imageModelsError: string | null;
  imageModelReady: boolean;
  selectImageModel: (id: string) => void;
  refreshImageModels: () => void;
  isProcessingRequest: boolean;
  beginRequest: () => () => void;
} | null>(null);
