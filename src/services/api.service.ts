import Axios, { type AxiosResponse } from "axios";
import { expireAgentSession, readAgentToken } from "./agent.service";
import { maskAIProviderNames } from "../utils/ai-provider.util";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const axios = Axios.create({
  baseURL: BASE_URL,
  timeout: 20 * 60 * 1000,
});

axios.interceptors.request.use(config => {
  const token = readAgentToken();
  if (token) config.headers.set('Authorization', 'Bearer ' + token);
  if (config.method === 'post' && config.data instanceof FormData) {
    config.headers.set('Idempotency-Key', crypto.randomUUID());
    config.data.set('async', 'true');
  }
  return config;
});
axios.interceptors.response.use(response => response, (error: unknown) => {
  if (Axios.isAxiosError(error) && error.response?.status === 401) expireAgentSession();
  return Promise.reject(error);
});

export function getErrorMessage(error: unknown): string {
  if (Axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT")
      return "Yêu cầu mất quá nhiều thời gian. Hãy thử với ít ảnh hơn.";
    const raw: unknown = error.response?.data;
    const data =
      typeof raw === "object" && raw !== null
        ? (raw as Record<string, unknown>)
        : {};
    const message =
      typeof data.message === "string"
        ? data.message.trim()
        : Array.isArray(data.message)
          ? data.message
              .filter(
                (item): item is string =>
                  typeof item === "string" && !!item.trim(),
              )
              .join("; ")
          : typeof data.error === "string"
            ? data.error.trim()
            : "";
    const status = error.response?.status;
    const fallback =
      status === 413
        ? "Ảnh tải lên quá lớn. Mỗi ảnh tối đa 10MB."
        : status === 429
          ? "Quá nhiều yêu cầu hoặc đã hết quota. Vui lòng chờ rồi thử lại."
          : status && status >= 500
            ? `Máy chủ hoặc dịch vụ AI đang gặp lỗi (HTTP ${status}). Vui lòng thử lại sau.`
            : status
              ? `API từ chối yêu cầu (HTTP ${status}). Kiểm tra dữ liệu và thử lại.`
              : "";
    if (message || fallback) {
      const parts = [message || fallback];
      if (
        typeof data.reason === "string" &&
        data.reason.trim() &&
        !parts[0].includes(data.reason)
      )
        parts.push(`Nguyên nhân: ${data.reason.trim()}`);
      if (
        typeof data.suggestion === "string" &&
        data.suggestion.trim() &&
        !parts.join(" ").includes(data.suggestion)
      )
        parts.push(data.suggestion.trim());
      if (
        typeof data.requestId === "string" &&
        /^[\w-]{1,80}$/.test(data.requestId)
      )
        parts.push(`Mã yêu cầu: ${data.requestId}`);
      return maskAIProviderNames(parts.join("\n"));
    }
    return "Không kết nối được API. Vui lòng kiểm tra kết nối và thử lại.";
  }
  return error instanceof Error
    ? maskAIProviderNames(error.message)
    : "Đã có lỗi xảy ra. Vui lòng thử lại.";
}

type GenerateMockupsResponse = {
  total: number;
  results: {
    index: number;
    prompt: string;
    url: string;
    requestId?: string;
  }[];
};
export const manualGenerateMockups = async (
  file: File,
  prompts: string[],
  signal?: AbortSignal,
  provider?: string,
  imageModel?: string,
) => {
  const formData = new FormData();
  if (provider) formData.append("provider", provider);
  if (imageModel) formData.append("imageModel", imageModel);

  formData.append("image", file);
  formData.append("prompts", JSON.stringify(prompts));
  formData.append("async", "true");

  const response = await axios.post<
    GenerateMockupsResponse & BackgroundReplacement & { jobId?: string }
  >("/api/mockups/generate-mockups", formData, { signal });
  if (response.data.jobId) {
    const result = await readImageJob(response, "/api/mockups", signal);
    return {
      total: 1,
      results: [
        {
          index: 0,
          prompt: prompts[0],
          url: result.url,
          requestId: result.requestId,
        },
      ],
    };
  }
  return response.data;
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

  return readQueuedResult<string[]>(await axios.post<string[]>("/api/mockups/generate-prompts", formData, { signal }), "", signal);
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

  return readQueuedResult<ImageAnalysis>(await axios.post<ImageAnalysis>("/api/ideas/analyze-product", formData, { signal }), "", signal);
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
  imageModel?: string,
) => {
  const formData = new FormData();
  if (provider) formData.append("provider", provider);
  if (imageModel) formData.append("imageModel", imageModel);
  formData.append("image", file);
  formData.append("basePrompt", basePrompt);
  formData.append("count", String(count));

  return readQueuedResult<GenerateIdeaReturn[]>(await axios.post<GenerateIdeaReturn[]>("/api/ideas/generate-ideas", formData, { signal }), "", signal);
};

export const generateImagesFromReferalImages = async (params: {
  imageModel?: string;
  productImage: File;
  referenceImages?: File[];
  variations?: number;
  signal?: AbortSignal;
  provider?: string;
}) => {
  const {
    productImage,
    referenceImages,
    variations,
    signal,
    provider,
    imageModel,
  } = params;

  const formData = new FormData();
  if (provider) formData.append("provider", provider);
  if (imageModel) formData.append("imageModel", imageModel);

  formData.append("productImage", productImage);

  if (referenceImages?.length) {
    for (const file of referenceImages) {
      formData.append("referenceImages", file);
    }
  }

  if (typeof variations === "number") {
    formData.append("variations", variations.toString());
  }

  return readQueuedResult<string[]>(await axios.post<string[]>("/api/ideas/generate-images-from-referal-images", formData, { signal }), "", signal);
};

export type AICapability = "text" | "vision" | "image";
export type AIProviderCatalog = {
  textRouting?: { primary: string; fallback: string; healthRequired: true };
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

export type BackgroundReplacement = {
  url: string;
  mimeType: string;
  requestId?: string;
};
export async function replaceProductBackground(params: {
  imageModel?: string;
  productImage: File;
  backgroundImage: File;
  provider: string;
  instructions: string;
  variationIndex: number;
  signal?: AbortSignal;
}): Promise<BackgroundReplacement> {
  const body = new FormData();
  body.append("productImage", params.productImage);
  body.append("backgroundImage", params.backgroundImage);
  body.append("provider", params.provider);
  if (params.imageModel) body.append("imageModel", params.imageModel);
  body.append("variationIndex", String(params.variationIndex));
  body.append("instructions", params.instructions);
  body.append("async", "true");
  const response = await axios.post<BackgroundReplacement>(
    "/api/backgrounds/replace",
    body,
    {
      signal: params.signal,
    },
  );
  if (response.data && "jobId" in response.data)
    return readImageJob(response, "/api/backgrounds", params.signal);
  const requestId = response.data.requestId || response.headers["x-request-id"];
  return {
    ...response.data,
    ...(typeof requestId === "string" && /^[a-f0-9-]{36}$/i.test(requestId)
      ? { requestId }
      : {}),
  };
}

export function getApiRequestId(error: unknown): string | undefined {
  if (!Axios.isAxiosError(error)) return;
  const data: unknown = error.response?.data;
  const id =
    typeof data === "object" && data !== null && "requestId" in data
      ? data.requestId
      : undefined;
  return typeof id === "string" && /^[a-f0-9-]{36}$/i.test(id) ? id : undefined;
}

export function getApiErrorCode(error: unknown): string | undefined {
  if (!Axios.isAxiosError(error)) return;
  const data: unknown = error.response?.data;
  if (
    typeof data === "object" &&
    data !== null &&
    "code" in data &&
    typeof data.code === "string"
  )
    return data.code;
}

export type AIImageModelCatalog = {
  provider: string;
  defaultModel: string | null;
  models: { id: string; name: string }[];
};
export async function getAIImageModels(
  provider: string,
  signal?: AbortSignal,
  refresh = false,
): Promise<AIImageModelCatalog> {
  return (
    await axios.get<AIImageModelCatalog>(
      `/api/ai/providers/${encodeURIComponent(provider)}/image-models`,
      {
        signal,
        timeout: 70000,
        params: refresh ? { refresh: true } : undefined,
      },
    )
  ).data;
}

async function readImageJob(response: AxiosResponse<BackgroundReplacement>, basePath: string, signal?: AbortSignal): Promise<BackgroundReplacement> {
  return readQueuedResult<BackgroundReplacement>(response, basePath, signal);
}

async function readQueuedResult<T>(
  response: AxiosResponse<T>,
  basePath: string,
  signal?: AbortSignal,
): Promise<T> {
  const accepted = response.data as { jobId?: string; requestId?: string };
  if (accepted.jobId) {
    type JobStatus = {
      state: "pending" | "done" | "failed";
      result?: T;
      error?: {
        statusCode: number;
        code: string;
        message: string;
        requestId: string;
      };
    };
    const deadline = Date.now() + 20 * 60 * 1000;
    while (Date.now() < deadline) {
      signal?.throwIfAborted();
      let poll: AxiosResponse<JobStatus> | undefined;
      try {
        poll = await axios.get<JobStatus>(
          basePath ? `${basePath}/jobs/${encodeURIComponent(accepted.jobId)}` : `/api/image-jobs/${encodeURIComponent(accepted.jobId)}`,
          {
            signal: signal,
            timeout: 15000,
          },
        );
      } catch (error) {
        // Retry reads only; a temporary polling failure must never start another paid image request.
        if (
          !Axios.isAxiosError(error) ||
          Axios.isCancel(error) ||
          (error.response &&
            ![429, 500, 502, 503, 504, 520, 522, 524].includes(
              error.response.status,
            ))
        )
          throw error;
      }
      if (poll?.data.state === "done" && poll.data.result !== undefined)
        return poll.data.result;
      if (poll?.data.state === "failed" && poll.data.error)
        throw new Axios.AxiosError(
          poll.data.error.message,
          poll.data.error.code,
          poll.config,
          undefined,
          {
            ...poll,
            data: poll.data.error,
            status: poll.data.error.statusCode,
          },
        );
      await new Promise<void>((resolve, reject) => {
        const abort = () => {
          clearTimeout(timer);
          signal?.removeEventListener("abort", abort);
          reject(new Axios.CanceledError());
        };
        const timer = setTimeout(() => {
          signal?.removeEventListener("abort", abort);
          resolve();
        }, 2000);
        if (signal?.aborted) abort();
        else signal?.addEventListener("abort", abort, { once: true });
      });
    }
    throw new Axios.AxiosError(
      "Tác vụ chưa hoàn tất sau 20 phút. Liên hệ quản trị viên kèm mã yêu cầu.",
      "BACKGROUND_JOB_TIMEOUT",
      response.config,
      undefined,
      {
        ...response,
        data: {
          message: "Tác vụ chưa hoàn tất sau 20 phút.",
          requestId: accepted.requestId,
        },
        status: 504,
      },
    );
  }
  return response.data;
}

export const blockingErrors = new Set([
  "BACKGROUND_BUSY",
  "AI_IMAGE_URL_UNTRUSTED",
  "AI_IMAGE_DOWNLOAD_FAILED",
  "AI_BILLING_BLOCKED",
  "AI_AUTHENTICATION_FAILED",
  "AI_PERMISSION_DENIED",
  "AI_MODEL_UNAVAILABLE",
  "AI_CONFIGURATION_ERROR",
  "AI_QUOTA_EXCEEDED",
  "AI_RATE_LIMITED",
  "AI_PROVIDER_INVALID",
  "AI_PROVIDER_NOT_CONFIGURED",
  "AI_CAPABILITY_UNAVAILABLE",
  "AI_IMAGE_MODEL_INVALID",
  "AI_IMAGE_MODEL_UNSUPPORTED",
  "STORAGE_ACCESS_DENIED",
  "STORAGE_BUCKET_NOT_FOUND",
  "STORAGE_UNAVAILABLE",
]);
