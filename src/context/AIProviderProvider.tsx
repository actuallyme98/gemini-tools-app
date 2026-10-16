import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AIProviderContext } from "./ai-provider-context";
import {
  DEFAULT_AI_PROVIDER,
  normalizeSavedAIProvider,
} from "../utils/ai-provider.util";
import {
  getAIProviders,
  getErrorMessage,
  type AIProviderCatalog,
  type AIImageModelCatalog,
  getAIImageModels,
} from "../services/api.service";

const STORAGE_KEY = "creative-studio.ai-provider";
const MODEL_STORAGE_KEY = "creative-studio.ai-image-model.shopaikey";
function readSelection() {
  try {
    return normalizeSavedAIProvider(localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_AI_PROVIDER;
  }
}

export function AIProviderProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState(readSelection);
  const [catalog, setCatalog] = useState<AIProviderCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [modelSelection, setModelSelection] = useState<string | null>(() => {
    try {
      return localStorage.getItem(MODEL_STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });
  const [imageModels, setImageModels] = useState<AIImageModelCatalog | null>(
    null,
  );
  const [imageModelsLoading, setImageModelsLoading] = useState(true);
  const [imageModelsError, setImageModelsError] = useState<string | null>(null);
  const [modelRevision, setModelRevision] = useState(0);
  const activeRequests = useRef(new Set<symbol>());
  const [requestCount, setRequestCount] = useState(0);
  const beginRequest = useCallback(() => {
    const token = Symbol("ai-request");
    activeRequests.current.add(token);
    setRequestCount(activeRequests.current.size);
    return () => {
      if (activeRequests.current.delete(token))
        setRequestCount(activeRequests.current.size);
    };
  }, []);

  useEffect(() => {
    if (modelSelection === null) return;
    try {
      localStorage.setItem(MODEL_STORAGE_KEY, modelSelection);
    } catch {
      /* Works without browser storage. */
    }
  }, [modelSelection]);

  useEffect(() => {
    if (selection !== "shopaikey") return;
    const controller = new AbortController();
    getAIImageModels(selection, controller.signal, modelRevision > 0).then(
      (data) => {
        if (controller.signal.aborted) return;
        setImageModels(data);
        setImageModelsLoading(false);
        setImageModelsError(null);
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setImageModelsLoading(false);
        setImageModelsError(getErrorMessage(error));
      },
    );
    return () => controller.abort();
  }, [selection, modelRevision]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, selection);
    } catch {
      // Selection still works when browser storage is unavailable.
    }
  }, [selection]);

  useEffect(() => {
    const controller = new AbortController();
    getAIProviders(controller.signal).then(
      (data) => {
        if (controller.signal.aborted) return;
        setCatalog(data);
        setLoading(false);
        setError(null);
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setLoading(false);
        setError(getErrorMessage(error));
      },
    );
    return () => controller.abort();
  }, [revision]);

  // Never substitute another provider for an explicit user selection.
  const provider = selection;

  const selectProvider = (id: string) => {
    if (
      activeRequests.current.size > 0 ||
      !id ||
      !catalog?.providers.some((entry) => entry.id === id && entry.available)
    )
      return;
    if (id === "shopaikey" && selection !== id) {
      setImageModelsLoading(true);
      setImageModelsError(null);
    }
    setSelection(id);
  };
  const imageModel =
    provider === "shopaikey"
      ? (modelSelection ?? imageModels?.defaultModel ?? undefined)
      : undefined;
  const imageModelReady =
    provider !== "shopaikey" ||
    (!imageModelsLoading &&
      !imageModelsError &&
      !!imageModel &&
      !!imageModels?.models.some((model) => model.id === imageModel));

  return (
    <AIProviderContext.Provider
      value={{
        catalog,
        provider,
        savedProviderUnavailable:
          !!catalog &&
          !!selection &&
          !catalog.providers.some(
            (entry) => entry.id === selection && entry.available,
          ),
        loading,
        error,
        selectProvider,
        imageModel,
        imageModels,
        imageModelsLoading,
        imageModelsError,
        imageModelReady,
        isProcessingRequest: requestCount > 0,
        beginRequest,
        selectImageModel: (id) => {
          if (activeRequests.current.size > 0) return;
          if (imageModels?.models.some((model) => model.id === id))
            setModelSelection(id);
        },
        refreshImageModels: () => {
          if (activeRequests.current.size > 0) return;
          setImageModelsLoading(true);
          setImageModelsError(null);
          setModelRevision((value) => value + 1);
        },
        retry: () => {
          if (activeRequests.current.size > 0) return;
          setLoading(true);
          setError(null);
          setRevision((value) => value + 1);
        },
      }}
    >
      {children}
    </AIProviderContext.Provider>
  );
}
