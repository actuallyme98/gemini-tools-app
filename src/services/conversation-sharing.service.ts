import Axios from "axios";
import { agentClient } from "./agent.service";

export type ShareStatus = {
  token: string;
  title: string;
  sharedAt: string;
  includeImages: boolean;
  messageCount: number;
};
export type SharedAsset = {
  id: string;
  name: string;
  width: number;
  height: number;
  kind: string;
};
export type SharedConversation = {
  version: string;
  title: string;
  sharedAt: string;
  includeImages: boolean;
  messages: {
    id: string;
    role: "user" | "assistant";
    text: string;
    createdAt: string;
    runId?: string;
    images: { id: string; role: "source" | "reference" | "template" }[];
  }[];
  runs: {
    id: string;
    summary: string;
    state: string;
    questions: string[];
    items: { title: string; prompt: string }[];
    resultIds: string[];
  }[];
  assets: SharedAsset[];
  nextCursor: number | null;
};

export function sharedConversationUrl(token: string) {
  const url = new URL(location.href);
  url.search = "";
  url.hash = `share?token=${encodeURIComponent(token)}`;
  return url.href;
}

// Public reads never inherit a signed-in employee's authorization header.
const publicClient = Axios.create({
  baseURL: `${agentClient.defaults.baseURL}/shared`,
  timeout: 30000,
  withCredentials: false,
});
export async function readSharedConversation(
  token: string,
  after: number,
  signal?: AbortSignal,
  version?: string,
) {
  return (
    await publicClient.get<SharedConversation>(`/${token.slice(0, 36)}`, {
      headers: { "X-Share-Token": token },
      params: { after, version },
      signal,
    })
  ).data;
}
export async function sharedImageBlob(
  token: string,
  id: string,
  signal: AbortSignal,
) {
  return (
    await publicClient.get<Blob>(
      `/${token.slice(0, 36)}/assets/${encodeURIComponent(id)}/preview`,
      {
        headers: { "X-Share-Token": token },
        responseType: "blob",
        signal,
      },
    )
  ).data;
}
