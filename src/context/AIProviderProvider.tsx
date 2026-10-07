import { useEffect, useState, type ReactNode } from "react";
import { AIProviderContext } from "./ai-provider-context";
import {
  getAIProviders,
  type AIProviderCatalog,
} from "../services/api.service";

const STORAGE_KEY = "creative-studio.ai-provider";
function readSelection() {
  try {
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function AIProviderProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState(readSelection);
  const [catalog, setCatalog] = useState<AIProviderCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getAIProviders(controller.signal).then(
      (data) => {
        if (controller.signal.aborted) return;
        setCatalog(data);
        setLoading(false);
        setError(false);
      },
      () => {
        if (controller.signal.aborted) return;
        setLoading(false);
        setError(true);
      },
    );
    return () => controller.abort();
  }, [revision]);

  const provider =
    !error &&
    catalog?.providers.some(
      (entry) => entry.id === selection && entry.available,
    )
      ? selection
      : "";

  const selectProvider = (id: string) => {
    if (
      id &&
      !catalog?.providers.some((entry) => entry.id === id && entry.available)
    )
      return;
    setSelection(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Provider selection still works when browser storage is unavailable.
    }
  };

  return (
    <AIProviderContext.Provider
      value={{
        catalog,
        provider,
        savedProviderUnavailable: !!catalog && !!selection && !provider,
        loading,
        error,
        selectProvider,
        retry: () => {
          setLoading(true);
          setError(false);
          setRevision((value) => value + 1);
        },
      }}
    >
      {children}
    </AIProviderContext.Provider>
  );
}
