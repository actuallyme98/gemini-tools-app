import Axios from "axios";
import JSZip from "jszip";
import { saveBlob } from "../utils/download.util";

export type AgentUser = {
  id: string;
  email: string;
  role: "admin" | "designer";
};
export type AgentAuthStatus = {
  enabled: boolean;
  setupRequired: boolean;
  google?: { enabled: boolean; clientId?: string; allowedDomains: string[] };
};
export type AgentLogin = { token: string; user: AgentUser; expiresAt: number };
export type Asset = {
  id: string;
  name: string;
  kind: "source" | "reference" | "design" | "template" | "result";
  category: string;
  width: number;
  height: number;
  mimeType: string;
  revision: number;
  parentId?: string;
  review: "draft" | "approved" | "changes_requested";
  checks?: {
    technical: boolean;
    visual: "pass" | "review" | "not_checked";
    notes: string[];
    criteria?: {
      criterion: string;
      status: "pass" | "review" | "fail";
      confidence: number;
      evidence: string;
    }[];
  };
  createdAt: string;
  runId?: string;
};
export type Point = { x: number; y: number };
export type MockupTemplate = {
  id: string;
  name: string;
  category: string;
  assetId: string;
  corners: [Point, Point, Point, Point];
  opacity: number;
  blend: "over" | "multiply";
  maskAssetId?: string;
  overlayAssetId?: string;
  revision: number;
};
export type Operation = "auto" | "mockup_ai" | "mockup_template" | "design";
export type ApprovalMode = "manual" | "auto";
export type InputSelection = {
  sourceIds: string[];
  targetIds: string[];
  templateIds: string[];
};
export type PlanQuestion = {
  question: string;
  options: { label: string; description?: string }[];
  input?: "source" | "reference" | "template" | "single_source";
};
export type Run = {
  research?: string;
  projectId?: string;
  knowledgeSources?: {
    id: string;
    title: string;
    revision: number;
    excerpt: string;
  }[];
  pendingInputs?: InputSelection;
  approvalMode?: ApprovalMode;
  autoAnswers?: { question: string; answer: string }[];
  workflow?: {
    executionId: string;
    name: string;
    revision: number;
    stage: number;
    total: number;
  };
  context?: {
    estimatedTokens: number;
    budget: number;
    recentMessages: number;
    summarizedMessages: number;
    compactedAt?: string;
  };
  activeStepCount?: number;
  id: string;
  conversationId: string;
  operation: Operation;
  state:
    | "planning"
    | "needs_input"
    | "draft"
    | "queued"
    | "running"
    | "review"
    | "completed"
    | "partial_failed"
    | "failed"
    | "cancelled";
  brief: string;
  summary: string;
  questions: string[];
  clarifications?: PlanQuestion[];
  count: number;
  provider: string;
  imageModel?: string;
  updatedAt: string;
  items: {
    title: string;
    prompt: string;
    sourceId?: string;
    targetId?: string;
    templateId?: string;
  }[];
  sourceIds: string[];
  targetIds: string[];
  templateIds: string[];
  productType: string;
  requestId: string;
  researchSources: { title: string; url: string; retrievedAt: string }[];
};
export type Step = {
  id: string;
  runId: string;
  type: "plan" | "image";
  state: "queued" | "running" | "done" | "failed" | "interrupted" | "cancelled";
  index: number;
  resultId?: string;
  error?: string;
  errorCode?: string;
  requestId: string;
  durationMs?: number;
};
export type Conversation = {
  id: string;
  title: string;
  updatedAt: string;
  pinnedRequirements?: string[];
  messages: {
    id: string;
    role: "user" | "assistant";
    text: string;
    createdAt?: string;
    attachments?: {
      sourceIds: string[];
      targetIds: string[];
      templateIds: string[];
    };
    runId?: string;
  }[];
};
export type Detail = {
  conversation: Conversation;
  runs: Run[];
  steps: Step[];
  results: Asset[];
  messagePage?: { hasMore: boolean; nextCursor: string | null };
  memory?: { summary: string; messageCount: number; updatedAt: string };
  workflowExecutions?: WorkflowExecution[];
};
export type WorkflowStep = {
  name: string;
  operation: Exclude<Operation, "auto">;
  instructions: string;
  source: "initial" | "previous";
  count: number;
};
export type CustomWorkflow = {
  id: string;
  name: string;
  description: string;
  revision: number;
  steps: WorkflowStep[];
  archived: boolean;
  updatedAt: string;
};
export type WorkflowExecution = {
  id: string;
  workflow: CustomWorkflow;
  runIds: string[];
  stage: number;
};
export type HistoryPage = {
  items: Conversation[];
  hasMore: boolean;
  nextCursor: string | null;
};
export const activeRun = (run: Pick<Run, "state" | "activeStepCount">) =>
  ["planning", "queued", "running"].includes(run.state) ||
  (run.activeStepCount ?? 0) > 0;
const key = "lcgmedia.agent.session";
export function readAgentToken() {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
export function setAgentToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(key, token);
    else sessionStorage.removeItem(key);
  } catch {
    /* The session still works in this tab. */
  }
}
export const agentClient = Axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL || ""}/api/agent`,
  timeout: 120000,
});
export function authorizeAgent(token: string | null) {
  if (token)
    agentClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete agentClient.defaults.headers.common.Authorization;
}
authorizeAgent(readAgentToken());
export function expireAgentSession() {
  authorizeAgent(null);
  setAgentToken(null);
  window.dispatchEvent(new Event("agent-session-expired"));
}
agentClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      Axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !["/auth/login", "/auth/google", "/auth/google/challenge"].includes(
        error.config?.url || "",
      )
    ) {
      expireAgentSession();
    }
    return Promise.reject(error);
  },
);
export async function agentUpload(
  file: File,
  kind: "source" | "reference" | "design" | "template",
  category: string,
  parentId?: string,
) {
  if (file.size > 16 * 1024 * 1024)
    throw new Error("Ảnh tải lên tối đa 16 MB.");
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error("Chỉ hỗ trợ PNG, JPEG và WebP.");
  const form = new FormData();
  form.append("image", file);
  form.append("kind", kind);
  form.append("category", category);
  if (parentId) form.append("parentId", parentId);
  return (await agentClient.post<Asset>("/assets", form)).data;
}
export async function assetBlob(
  id: string,
  signal?: AbortSignal,
  preview = false,
) {
  return (
    await agentClient.get<Blob>(
      `/assets/${encodeURIComponent(id)}/${preview ? "preview" : "content"}`,
      {
        responseType: "blob",
        signal,
      },
    )
  ).data;
}
export function assetFilename(asset: Asset) {
  return `${asset.name.replace(/\.[^.]+$/, "")}_v${asset.revision}.${asset.mimeType === "image/jpeg" ? "jpg" : asset.mimeType === "image/webp" ? "webp" : "png"}`;
}
export async function exportAssets(assets: Asset[], conversation: string) {
  const zip = new JSZip();
  // A failed download aborts the export rather than silently creating an incomplete set.
  for (const asset of assets)
    zip.file(
      `${asset.category.replace(/[^\p{L}\p{N}_-]/gu, "_")}/${asset.review}/${asset.id.slice(0, 8)}_${assetFilename(asset)}`,
      await assetBlob(asset.id),
    );
  zip.file(
    "manifest.json",
    JSON.stringify(
      { conversation, exportedAt: new Date().toISOString(), assets },
      null,
      2,
    ),
  );
  saveBlob(
    await zip.generateAsync({ type: "blob" }),
    `POD_${conversation.slice(0, 8)}.zip`,
  );
}
