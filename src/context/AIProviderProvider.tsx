import { useEffect, useState, type ReactNode } from "react";
import { AIProviderContext } from "./ai-provider-context";
import {
  DEFAULT_AI_PROVIDER,
  isAIProviderEnabled,
} from "../utils/ai-provider.util";
import {
  getAIProviders,
  getErrorMessage,
  type AIProviderCatalog,
} from "../services/api.service";

const STORAGE_KEY = "creative-studio.ai-provider";
function readSelection() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return !saved || saved === "default" || !isAIProviderEnabled(saved)
      ? DEFAULT_AI_PROVIDER
      : saved;
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
      !id ||
      !isAIProviderEnabled(id) ||
      !catalog?.providers.some((entry) => entry.id === id && entry.available)
    )
      return;
    setSelection(id);
  };

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
        retry: () => {
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
