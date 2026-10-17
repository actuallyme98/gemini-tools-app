import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  getApiErrorCode,
  getErrorMessage,
  replaceProductBackground,
} from "../services/api.service";
import { validateImage, MAX_REFERENCES } from "../utils/upload.util";
import { recordActivity } from "../utils/activity.util";
import { useAIProvider } from "./use-ai-provider";
import { useImageInput } from "./use-image-input";
import { useRequest } from "./use-request";
import {
  BACKGROUND_STUDIO_BASE_PROMPT,
  MAX_BACKGROUND_PROMPT_LENGTH,
} from "../constants/background-studio-prompt";

export type BackgroundSource = {
  id: string;
  file: File;
  preview: string;
  selected: boolean;
};
export type BackgroundJob = {
  id: string;
  backgroundId: string;
  file: File;
  preview: string;
  product: File;
  instructions: string;
  variation: number;
  status: "queued" | "processing" | "done" | "error" | "paused" | "cancelled";
  url?: string;
  mimeType?: string;
  error?: string;
};
const blockingErrors = new Set([
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
export const MAX_BACKGROUND_RESULTS = 20;
export const MAX_CONCURRENT_BACKGROUND_REQUESTS = 3;

export function useBackgroundStudio() {
  const product = useImageInput();
  const { provider, catalog, loading, imageModel, imageModelReady } =
    useAIProvider();
  const { start, cancel, isCurrent, finish } = useRequest();
  const [backgrounds, setBackgrounds] = useState<BackgroundSource[]>([]);
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [variations, setVariations] = useState(1);
  const [instructions, setInstructions] = useState(
    BACKGROUND_STUDIO_BASE_PROMPT,
  );
  const [running, setRunning] = useState(false);
  const [runningProvider, setRunningProvider] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);
  const urls = useRef(new Set<string>());
  const batchUrls = useRef(new Set<string>());
  useEffect(() => {
    const owned = urls.current;
    return () => owned.forEach((url) => URL.revokeObjectURL(url));
  }, []);
  const preview = (file: File) => {
    const url = URL.createObjectURL(file);
    urls.current.add(url);
    return url;
  };
  const release = (url: string) => {
    URL.revokeObjectURL(url);
    urls.current.delete(url);
  };
  const clearResults = () => {
    batchUrls.current.forEach(release);
    batchUrls.current.clear();
    setJobs([]);
    setBatchError(null);
  };
  const changeProduct = (file: File | null) => {
    if (running) return;
    const error = file ? validateImage(file) : undefined;
    if (error) {
      setUploadError(error);
      return;
    }
    clearResults();
    setUploadError(null);
    product.setFile(file);
  };
  const addBackgrounds = (files: File[]) => {
    if (running) return;
    const next = [...backgrounds];
    const errors: string[] = [];
    for (const file of files) {
      const error = validateImage(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
        continue;
      }
      if (
        next.some(
          (item) =>
            item.file.name === file.name &&
            item.file.size === file.size &&
            item.file.lastModified === file.lastModified,
        )
      )
        continue;
      if (next.length >= MAX_REFERENCES) {
        errors.push(`Tối đa ${MAX_REFERENCES} ảnh tham chiếu trong một bộ.`);
        break;
      }
      next.push({
        id: crypto.randomUUID(),
        file,
        preview: preview(file),
        selected: true,
      });
    }
    setBackgrounds(next);
    setUploadError(errors.length ? errors.join(" ") : null);
  };
  const removeBackground = (id: string) => {
    if (running) return;
    const source = backgrounds.find((item) => item.id === id);
    if (source) release(source.preview);
    setBackgrounds((items) => items.filter((item) => item.id !== id));
    setUploadError(null);
  };
  const toggleBackground = (id: string) => {
    if (!running)
      setBackgrounds((items) =>
        items.map((item) =>
          item.id === id ? { ...item, selected: !item.selected } : item,
        ),
      );
  };
  const selectAll = (selected: boolean) => {
    if (!running)
      setBackgrounds((items) => items.map((item) => ({ ...item, selected })));
  };
  const selected = backgrounds.filter((item) => item.selected);
  const total = selected.length * variations;
  const promptValid =
    !!instructions.trim() &&
    instructions.length <= MAX_BACKGROUND_PROMPT_LENGTH;
  const providerEntry = catalog?.providers.find((item) => item.id === provider);
  const providerReady =
    !loading &&
    imageModelReady &&
    !!providerEntry?.available &&
    providerEntry.capabilities.includes("image");
  const patchJob = (id: string, patch: Partial<BackgroundJob>) =>
    setJobs((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );

  const processQueue = async (queue: BackgroundJob[]) => {
    if (running || !queue.length || !providerReady) return;
    const task = start();
    const chosenProvider = provider;
    const chosenModel = imageModel;
    setRunning(true);
    setRunningProvider(
      `${providerEntry?.name || provider}${chosenModel ? ` · ${chosenModel}` : ""}`,
    );
    setBatchError(null);
    const ids = new Set(queue.map((job) => job.id));
    setJobs((items) =>
      items.map((job) =>
        ids.has(job.id) ? { ...job, status: "queued", error: undefined } : job,
      ),
    );
    let successes = 0;
    let nextIndex = 0;
    let halted = false;
    const worker = async () => {
      while (isCurrent(task) && !halted && nextIndex < queue.length) {
        // Claim a slot before awaiting so each job is sent exactly once.
        const job = queue[nextIndex++];
        patchJob(job.id, { status: "processing", error: undefined });
        try {
          const result = await replaceProductBackground({
            productImage: job.product,
            backgroundImage: job.file,
            provider: chosenProvider,
            imageModel: chosenModel,
            instructions: job.instructions,
            variationIndex: job.variation,
            signal: task.signal,
          });
          if (!isCurrent(task)) return;
          if (!result.url)
            throw new Error("Không nhận được ảnh kết quả từ API.");
          patchJob(job.id, {
            status: "done",
            url: result.url,
            mimeType: result.mimeType,
            error: undefined,
          });
          recordActivity("background", 1);
          successes++;
        } catch (error) {
          if (!isCurrent(task)) return;
          const message = getErrorMessage(error);
          patchJob(job.id, { status: "error", error: message });
          if (!halted && blockingErrors.has(getApiErrorCode(error) || "")) {
            // Do not launch more work; retain results from requests already sent.
            halted = true;
            setBatchError(message);
            const remaining = new Set(
              queue.slice(nextIndex).map((item) => item.id),
            );
            setJobs((items) =>
              items.map((item) =>
                remaining.has(item.id) ? { ...item, status: "paused" } : item,
              ),
            );
          }
        }
      }
    };
    try {
      await Promise.all(
        Array.from(
          {
            length: Math.min(MAX_CONCURRENT_BACKGROUND_REQUESTS, queue.length),
          },
          worker,
        ),
      );
      if (isCurrent(task) && successes)
        toast.success(
          `Đã tạo ${successes} ảnh áp hình in. Các kết quả đã hoàn tất được giữ lại.`,
        );
    } finally {
      if (isCurrent(task)) setRunning(false);
      finish(task);
    }
  };
  const generate = async () => {
    if (
      running ||
      !product.file ||
      !selected.length ||
      total > MAX_BACKGROUND_RESULTS ||
      !providerReady ||
      !promptValid
    )
      return;
    clearResults();
    const queue: BackgroundJob[] = [];
    for (const source of selected) {
      const snapshot = preview(source.file);
      batchUrls.current.add(snapshot);
      for (let variation = 1; variation <= variations; variation++)
        queue.push({
          id: crypto.randomUUID(),
          backgroundId: source.id,
          file: source.file,
          preview: snapshot,
          product: product.file,
          instructions,
          variation,
          status: "queued",
        });
    }
    setJobs(queue);
    await processQueue(queue);
  };
  const stop = () => {
    cancel();
    setRunning(false);
    setJobs((items) =>
      items.map((item) =>
        ["queued", "processing"].includes(item.status)
          ? { ...item, status: "cancelled" }
          : item,
      ),
    );
  };
  const unfinished = jobs.filter((item) =>
    ["error", "paused", "cancelled"].includes(item.status),
  );
  const retry = async (id?: string) => {
    await processQueue(
      id ? unfinished.filter((item) => item.id === id) : unfinished,
    );
  };
  return {
    product,
    changeProduct,
    backgrounds,
    addBackgrounds,
    removeBackground,
    toggleBackground,
    selectAll,
    selected,
    total,
    variations,
    setVariations,
    instructions,
    setInstructions,
    promptValid,
    resetInstructions: () => {
      if (!running) setInstructions(BACKGROUND_STUDIO_BASE_PROMPT);
    },
    jobs,
    running,
    runningProvider,
    providerReady,
    providerName: providerEntry?.name || provider,
    uploadError,
    batchError,
    generate,
    stop,
    retry,
    unfinished,
  };
}
