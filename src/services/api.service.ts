import Axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const axios = Axios.create({
  baseURL: BASE_URL,
  timeout: 20 * 60 * 1000,
});

export function getErrorMessage(error: unknown): string {
  if (Axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED")
      return "Yêu cầu mất quá nhiều thời gian. Hãy thử với ít ảnh hơn.";
    const data = error.response?.data as { message?: unknown } | undefined;
    const message = data?.message;
    if (typeof message === "string") return message;
    if (Array.isArray(message))
      return message
        .filter((item): item is string => typeof item === "string")
        .join("; ");
    return "Không kết nối được API. Vui lòng kiểm tra kết nối và thử lại.";
  }
  return error instanceof Error
    ? error.message
    : "Đã có lỗi xảy ra. Vui lòng thử lại.";
}

type GenerateMockupsResponse = {
  total: number;
  results: {
    index: number;
    prompt: string;
    url: string;
  }[];
};
export const manualGenerateMockups = async (
  file: File,
  prompts: string[],
  signal?: AbortSignal,
  provider?: string,
) => {
  const formData = new FormData();
  if (provider) formData.append("provider", provider);

  formData.append("image", file);
  formData.append("prompts", JSON.stringify(prompts));

  return (
    await axios.post<GenerateMockupsResponse>(
      "/api/mockups/generate-mockups",
      formData,
      { signal },
    )
  ).data;
};

export const autoGeneratePrompts = async (
  file: File,
  count: string,
  signal?: AbortSignal,
  provider?: string,
) => {
  const formData = new FormData();
  if (provider) formData.append("provider", provider);

  formData.append("image", file);
  formData.append("count", count);

  return (
    await axios.post<string[]>("/api/mockups/generate-prompts", formData, {
      signal,
    })
  ).data;
};

export type ImageAnalysis = {
  productCategory: string;
  productType: string;
  displayMode: string;
  primaryColors: string[];
  pattern: string;
  styleKeywords: string[];
  mood: string;
  audience: string;
  inspiredBy?: {
    source: string;
    theme: string;
    setting: string;
    styleReference: string;
  };
  characters?: {
    hasCharacters: boolean;
    characterNames: string[];
    characterType: string[];
    numberOfCharacters: number;
    relationship: string;
    visualDescription: string;
  };
  material: {
    main: string;
    details: string;
    texture: string;
    weightOrThickness: string;
    flexibility: string;
    breathability: string;
    seasonSuitability: string[];
  };
};
export const analyzeProductFromImage = async (
  file: File,
  signal?: AbortSignal,
  provider?: string,
) => {
  const formData = new FormData();
  if (provider) formData.append("provider", provider);
  formData.append("image", file);

  return (
    await axios.post<ImageAnalysis>("/api/ideas/analyze-product", formData, {
      signal,
    })
  ).data;
};

export type GenerateIdeaReturn = {
  url: string;
  prompt: string;
};

export const generateProductIdeas = async (
  file: File,
  basePrompt: string,
  count: number,
  signal?: AbortSignal,
  provider?: string,
) => {
  const formData = new FormData();
  if (provider) formData.append("provider", provider);
  formData.append("image", file);
  formData.append("basePrompt", basePrompt);
  formData.append("count", String(count));

  return (
    await axios.post<GenerateIdeaReturn[]>(
      "/api/ideas/generate-ideas",
      formData,
      { signal },
    )
  ).data;
};

export const generateImagesFromReferalImages = async (params: {
  productImage: File;
  referenceImages?: File[];
  variations?: number;
  signal?: AbortSignal;
  provider?: string;
}) => {
  const { productImage, referenceImages, variations, signal, provider } =
    params;

  const formData = new FormData();
  if (provider) formData.append("provider", provider);

  formData.append("productImage", productImage);

  if (referenceImages?.length) {
    for (const file of referenceImages) {
      formData.append("referenceImages", file);
    }
  }

  if (typeof variations === "number") {
    formData.append("variations", variations.toString());
  }

  return (
    await axios.post<string[]>(
      "/api/ideas/generate-images-from-referal-images",
      formData,
      { signal },
    )
  ).data;
};

export type AICapability = "text" | "vision" | "image";
export type AIProviderCatalog = {
  defaults: Record<AICapability, string>;
  providers: {
    id: string;
    name: string;
    available: boolean;
    capabilities: AICapability[];
    routing: Record<AICapability, string | null>;
  }[];
};
export async function getAIProviders(
  signal?: AbortSignal,
): Promise<AIProviderCatalog> {
  return (
    await axios.get<AIProviderCatalog>("/api/ai/providers", {
      signal,
      timeout: 15000,
    })
  ).data;
}
