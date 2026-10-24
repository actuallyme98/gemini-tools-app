import { useCallback, useEffect, useState } from "react";
import { agentClient } from "../../services/agent.service";
import { getErrorMessage } from "../../services/api.service";
export function useWorkspaceData<T>(path: string) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{
    path: string;
    data?: T;
    error?: string;
  }>({ path });
  useEffect(() => {
    const controller = new AbortController();
    void agentClient
      .get<T>(path, { signal: controller.signal })
      .then((r) => {
        if (!controller.signal.aborted) setState({ path, data: r.data });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ path, error: getErrorMessage(error) });
      });
    return () => controller.abort();
  }, [path, revision]);
  const reload = useCallback(() => setRevision((v) => v + 1), []);
  return { ...(state.path === path ? state : {}), reload };
}
export type Project = {
  id: string;
  owner: string;
  name: string;
  description: string;
  archived: boolean;
  updatedAt: string;
  members: {
    id: string;
    email: string;
    role: "viewer" | "editor" | "reviewer" | "manager";
  }[];
};
export type Knowledge = {
  id: string;
  owner: string;
  title: string;
  content: string;
  tags: string[];
  visibility: "private" | "company" | "project";
  projectId?: string;
  revision: number;
  archived: boolean;
  updatedAt: string;
};
