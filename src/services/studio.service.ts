import JSZip from "jszip";
import { agentClient } from "./agent.service";
import { saveBlob } from "../utils/download.util";

export type StudioTeam = {
  id: string;
  name: string;
  revision: number;
  archived: boolean;
  members: { userId: string; role: "seller" | "leader" }[];
  memberIds: string[];
};
export type StudioStore = {
  id: string;
  name: string;
  teamId: string;
  sellerIds: string[];
  productIds: string[];
  revision: number;
  archived: boolean;
};
export type StudioResource = {
  printSpec?: {
    width: number;
    height: number;
    dpi: number;
    background: "transparent" | "white";
  };
  id: string;
  teamId: string;
  type: "product" | "skill" | "thumbnail" | "scene";
  name: string;
  code: string;
  instructions: string;
  assetId?: string;
  status: "pending" | "approved" | "archived";
  revision: number;
  issues: string[];
  bundleHash?: string;
  bundleId?: string;
  seriesId?: string;
  versionNumber?: number;
  declaredVersion?: string;
  importState?: "preparing" | "ready" | "failed";
  warnings?: string[];
  previousId?: string;
  contextImages?: { id: string; path: string; sha256: string }[];
  selectedContextPaths?: string[];
  files?: { path: string; bytes: number; sha256: string }[];
};
export type StudioSchedule = {
  dailyTime: string;
  revision: number;
  timezone: "Asia/Ho_Chi_Minh";
  nextRunAt: string;
};
export type StudioBootstrap = {
  schedule?: StudioSchedule;
  teams: StudioTeam[];
  stores: StudioStore[];
  resources: StudioResource[];
  users: { id: string; email: string; disabled: boolean }[];
  nextNight: string;
  schedulerEnabled: boolean;
};
export type IdeaInput = {
  artworkFirst?: boolean;
  title: string;
  storeId: string;
  productId: string;
  skillId: string;
  thumbnailId: string;
  sourceId: string;
  sourceUrl: string;
  brief: string;
  count: number;
  sampleCount?: number;
  timing: "now" | "night";
  provider: "shopaikey" | "gemini";
  imageModel: string;
};
export type StudioIdea = {
  id: string;
  owner: string;
  teamId: string;
  input: IdeaInput;
  state: "draft" | "pending" | "approved" | "changes_requested";
  revision: number;
  reviewNote: string;
  updatedAt: string;
  ticketId?: string;
};
export type StudioTicket = {
  dispatchCount?: number;
  id: string;
  owner: string;
  state: string;
  dueAt: string;
  ideaRevision: number;
  error?: string;
  snapshot: { hash: string; input: IdeaInput };
};
export type StudioSlot = {
  role?: "artwork" | "thumbnail";
  artworkId?: string;
  dependsOn?: string;
  errorCode?: string;
  id: string;
  ticketId: string;
  index: number;
  state: string;
  prompt: string;
  resultId?: string;
  error?: string;
  requestId: string;
};
export type StudioReview = {
  id: string;
  assetId: string;
  ticketId: string;
  decision: "approved" | "changes_requested";
  note: string;
};
export type StudioDetail = {
  artworks?: StudioSlot[];
  idea: StudioIdea;
  tickets: StudioTicket[];
  slots: StudioSlot[];
  reviews: StudioReview[];
  assets: { id: string; name: string; mimeType: string }[];
  plans?: StudioPlanStep[];
};
export type StudioPlanStep = {
  errorCode?: string;
  requestId: string;
  id: string;
  ticketId: string;
  phase: "analysis" | "briefs";
  state: string;
  error?: string;
  analysis?: {
    summary: string;
    invariants: string[];
    editable: string[];
    sourceArtifacts: string[];
    risks: string[];
  };
  briefs?: {
    title: string;
    direction: string;
    composition: string;
    palette: string;
    prompt: string;
  }[];
};
export type StudioPage<T> = {
  items: T[];
  page: number;
  total: number;
  limit: number;
};
export const studioClient = {
  get: async <T>(path: string, signal?: AbortSignal) =>
    (await agentClient.get<T>(`/studio${path}`, { signal })).data,
  post: async <T>(path: string, body: unknown = {}) =>
    (await agentClient.post<T>(`/studio${path}`, body)).data,
  patch: async <T>(path: string, body: unknown) =>
    (await agentClient.patch<T>(`/studio${path}`, body)).data,
};
export async function studioBlob(
  id: string,
  preview = false,
  signal?: AbortSignal,
  format?: "png" | "jpg",
) {
  return (
    await agentClient.get<Blob>(`/studio/assets/${encodeURIComponent(id)}`, {
      responseType: "blob",
      signal,
      params: {
        ...(preview ? { preview: "1" } : {}),
        ...(format ? { format } : {}),
      },
    })
  ).data;
}
export async function exportStudioImages(
  items: {
    assetId: string;
    ticketId: string;
    fileName?: string;
    sourceId?: string;
    sceneId?: string;
    color?: string;
  }[],
  format: "png" | "jpg",
) {
  const zip = new JSZip();
  for (const [index, item] of items.entries())
    zip.file(
      `${item.ticketId}/${(item.fileName || `${String(index + 1).padStart(2, "0")}_${item.assetId.slice(0, 8)}`).replace(/[^\p{L}\p{N}_-]/gu, "_").slice(0, 120)}.${format}`,
      await studioBlob(item.assetId, false, undefined, format),
    );
  zip.file(
    "manifest.json",
    JSON.stringify(
      { exportedAt: new Date().toISOString(), format, items },
      null,
      2,
    ),
  );
  saveBlob(await zip.generateAsync({ type: "blob" }), "LCG_Thanh_pham.zip");
}
export const studioLabels: Record<string, string> = {
  draft: "Bản nháp",
  pending: "Chờ Leader duyệt",
  approved: "Đã duyệt",
  changes_requested: "Cần bổ sung",
  scheduled: "Đã lên lịch",
  queued: "Đang chờ xử lý",
  running: "Đang tạo ảnh",
  preparing: "Chuẩn bị",
  submitted: "Đang chờ AI",
  review: "Cần kiểm tra kết quả",
  sample_review: "Đã có mẫu thử — chờ tạo phần còn lại",
  partial_failed: "Một phần chưa hoàn tất",
  failed: "Không hoàn tất",
  missed: "Lỡ lịch — cần chạy bù",
  blocked: "Cần kiểm tra quyền/dữ liệu",
  cancelled: "Đã dừng",
  done: "Đã có ảnh",
  interrupted: "Cần đối soát",
};
