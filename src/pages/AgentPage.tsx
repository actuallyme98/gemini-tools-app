import {
  lazy,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Bot,
  ImagePlus,
  Layers,
  Lightbulb,
  Loader2,
  Paperclip,
  Plus,
  ScanLine,
  Settings2,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { AIProviderContext } from "../context/ai-provider-context";
import {
  agentClient,
  agentUpload,
  authorizeAgent,
  readAgentToken,
  setAgentToken,
  activeRun,
  type AgentUser,
  type AgentAuthStatus,
  type AgentLogin,
  type Asset,
  type Conversation,
  type Detail,
  type MockupTemplate,
  type Operation,
  type Run,
  type CustomWorkflow,
  type HistoryPage,
} from "../services/agent.service";
import { getErrorMessage } from "../services/api.service";
import { Button } from "../components/ui/button";
import { AgentRunCard } from "../components/agent/AgentRunCard";
import { TemplateEditor } from "../components/agent/TemplateEditor";
import { AgentImage } from "../components/agent/AgentImage";
import { AgentShell } from "../components/agent/AgentShell";
import {
  AgentJobs,
  AgentLibrary,
  AgentTemplates,
  WorkspaceHeading,
} from "../components/agent/AgentWorkspaceViews";
import { AIProviderSelect } from "../components/AIProviderSelect";
import { AIImageModelPanel } from "../components/AIImageModelPanel";
import { GoogleSignIn } from "../components/agent/GoogleSignIn";
import { WorkflowProgress } from "../components/agent/WorkflowProgress";
import { ToolJobs } from "../components/agent/ToolJobs";
import { WorkflowLibrary } from "../components/agent/WorkflowLibrary";
import { ConversationContext } from "../components/agent/ConversationContext";
import { HistoryLoader } from "../components/agent/HistoryLoader";
const AdminPage = lazy(() => import("./AdminPage"));

const field = "agent-field";
function mergeMessages(
  previous: Detail | undefined,
  next: Detail,
  older = false,
): Detail {
  if (previous?.conversation.id !== next.conversation.id) return next;
  const messages = [
    ...new Map(
      [...previous.conversation.messages, ...next.conversation.messages].map(
        (message) => [message.id, message],
      ),
    ).values(),
  ];
  messages.sort(
    (a, b) =>
      (a.createdAt ?? "").localeCompare(b.createdAt ?? "") ||
      a.id.localeCompare(b.id),
  );
  return {
    ...next,
    conversation: { ...next.conversation, messages },
    messagePage:
      older || !previous.conversation.messages.length
        ? next.messagePage
        : previous.messagePage,
    ...(older
      ? {
          runs: previous.runs,
          steps: previous.steps,
          results: previous.results,
        }
      : {}),
  };
}
export function AgentPage({
  page,
  onNavigate,
  children,
}: {
  page: string;
  onNavigate: (page: string) => void;
  children: ReactNode;
}) {
  const ai = useContext(AIProviderContext)!;
  const [status, setStatus] = useState<AgentAuthStatus>();
  const [authChecking, setAuthChecking] = useState(true);
  const [connectionKey, setConnectionKey] = useState(0);
  const [user, setUser] = useState<AgentUser>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const historyBusy = useRef(false);
  const historyInitialized = useRef(false);
  const sessionEpoch = useRef(0);
  const [workflows, setWorkflows] = useState<CustomWorkflow[]>([]);
  const [workflowId, setWorkflowId] = useState("");
  const [messagesLoading, setMessagesLoading] = useState(false);
  const messagesBusy = useRef(false);
  const olderRequest = useRef<AbortController | null>(null);
  const scrollRestore = useRef<{ height: number; top: number } | null>(null);
  const openedThread = useRef("");
  const messageEnd = useRef<HTMLDivElement>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [templates, setTemplates] = useState<MockupTemplate[]>([]);
  const [allRuns, setAllRuns] = useState<Run[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [focusedRun, setFocusedRun] = useState<{
    conversationId: string;
    runId: string;
  }>();
  const [expandedRuns, setExpandedRuns] = useState<string[]>([]);
  const [detail, setDetail] = useState<Detail>();
  const [operation, setOperation] = useState<Operation>("auto");
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [targetIds, setTargetIds] = useState<string[]>([]);
  const [templateIds, setTemplateIds] = useState<string[]>([]);
  const [brief, setBrief] = useState("");
  const [category, setCategory] = useState("Sản phẩm POD");
  const [count, setCount] = useState(3);
  const [research, setResearch] = useState("");
  const [sources, setSources] = useState("");
  const [validateVisually, setValidateVisually] = useState(true);
  const [templateEditor, setTemplateEditor] = useState<
    MockupTemplate | "new" | null
  >(null);
  const messageId = useRef<string | null>(null);
  useEffect(() => {
    messageId.current = null;
  }, [
    workflowId,
    sourceIds,
    targetIds,
    templateIds,
    category,
    count,
    operation,
    research,
    sources,
    validateVisually,
    ai.provider,
    ai.imageModel,
  ]);
  const restoredConversation = useRef("");
  const reload = useCallback(async () => {
    setRevision((value) => value + 1);
  }, []);
  const processing =
    busy ||
    (!!detail &&
      detail.conversation.id === selectedId &&
      detail.runs.some(activeRun));
  const clearSession = useCallback(() => {
    authorizeAgent(null);
    setAgentToken(null);
    setUser(undefined);
    setConversations([]);
    sessionEpoch.current += 1;
    historyInitialized.current = false;
    setHistoryCursor(null);
    setWorkflows([]);
    setWorkflowId("");
    openedThread.current = "";
    setAssets([]);
    setAllRuns([]);
    setDetail(undefined);
    setSelectedId("");
    setSourceIds([]);
    setTargetIds([]);
    setTemplateIds([]);
    setTemplates([]);
    setTemplateEditor(null);
    setBrief("");
    setResearch("");
    setSources("");
    setCategory("Sản phẩm POD");
    setCount(3);
    setOperation("auto");
    setValidateVisually(true);
    restoredConversation.current = "";
  }, []);
  useEffect(() => {
    const expire = () => {
      clearSession();
      setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    };
    window.addEventListener("agent-session-expired", expire);
    return () => window.removeEventListener("agent-session-expired", expire);
  }, [clearSession]);
  const beginRequest = ai.beginRequest;
  useEffect(
    () => (processing ? beginRequest() : undefined),
    [processing, beginRequest],
  );

  useEffect(() => {
    const controller = new AbortController();
    setAuthChecking(true);
    agentClient
      .get<AgentAuthStatus>("/auth/status", {
        signal: controller.signal,
      })
      .then((response) => {
        if (controller.signal.aborted) return;
        setStatus(response.data);
        if (readAgentToken())
          return agentClient
            .get<AgentUser>("/auth/me", { signal: controller.signal })
            .then((result) => {
              if (!controller.signal.aborted) setUser(result.data);
            });
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setError(getErrorMessage(cause));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setAuthChecking(false);
      });
    return () => controller.abort();
  }, [connectionKey]);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    Promise.all([
      agentClient.get<HistoryPage>("/history", {
        signal: controller.signal,
      }),
      agentClient.get<Asset[]>("/assets", { signal: controller.signal }),
      agentClient.get<MockupTemplate[]>("/templates", {
        signal: controller.signal,
      }),
      agentClient.get<CustomWorkflow[]>("/workflows", {
        signal: controller.signal,
      }),
    ])
      .then(([c, a, t, w]) => {
        if (controller.signal.aborted) return;
        setConversations((previous) => [
          ...new Map(
            [...c.data.items, ...previous].map((conversation) => [
              conversation.id,
              conversation,
            ]),
          ).values(),
        ]);
        if (!historyInitialized.current) {
          setHistoryCursor(c.data.nextCursor);
          historyInitialized.current = true;
        }
        setAssets(a.data);
        setTemplates(t.data);
        setWorkflows(w.data);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(getErrorMessage(cause));
      });
    return () => controller.abort();
  }, [user, revision]);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const [runs, conversation] = await Promise.all([
          agentClient.get<Run[]>("/runs", { signal: controller.signal }),
          selectedId
            ? agentClient.get<Detail>(`/conversations/${selectedId}`, {
                signal: controller.signal,
                params:
                  focusedRun?.conversationId === selectedId
                    ? { runId: focusedRun.runId }
                    : undefined,
              })
            : Promise.resolve(null),
        ]);
        if (controller.signal.aborted) return;
        setAllRuns(runs.data);
        if (conversation)
          setDetail((previous) => mergeMessages(previous, conversation.data));
      } catch (cause) {
        if (!controller.signal.aborted) setError(getErrorMessage(cause));
      } finally {
        if (!controller.signal.aborted)
          timer = setTimeout(() => void poll(), 2500);
      }
    };
    void poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [user, selectedId, revision, focusedRun]);

  const act = (work: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    void work()
      .then(reload)
      .catch((cause) => setError(getErrorMessage(cause)))
      .finally(() => setBusy(false));
  };
  const upload = (files: FileList | null, kind: "source" | "reference") => {
    if (!files?.length) return;
    const list = Array.from(files);
    act(async () => {
      if (
        list.length +
          (kind === "source" ? sourceIds.length : targetIds.length) >
        20
      )
        throw new Error("Mỗi nhóm tối đa 20 ảnh.");
      for (const file of list) {
        const asset = await agentUpload(
          file,
          kind === "source" && operation === "mockup_template"
            ? "design"
            : kind,
          category,
        );
        setAssets((current) => [asset, ...current]);
        if (kind === "source")
          setSourceIds((current) => [...current, asset.id]);
        else setTargetIds((current) => [...current, asset.id]);
      }
    });
  };
  const choose = (id: string, list: string[], set: (ids: string[]) => void) =>
    set(
      list.includes(id) ? list.filter((value) => value !== id) : [...list, id],
    );
  const current = detail?.conversation.id === selectedId ? detail : undefined;
  useEffect(
    () => () => olderRequest.current?.abort(),
    [selectedId, page, user?.id],
  );
  useLayoutEffect(() => {
    const main = document.getElementById("main-content");
    if (scrollRestore.current && main) {
      main.scrollTop =
        scrollRestore.current.top +
        main.scrollHeight -
        scrollRestore.current.height;
      scrollRestore.current = null;
    } else if (
      current &&
      openedThread.current !== current.conversation.id &&
      page === "agent"
    ) {
      openedThread.current = current.conversation.id;
      if (current.messagePage?.hasMore)
        messageEnd.current?.scrollIntoView({ block: "start" });
    }
  }, [current, page]);
  const loadMoreHistory = useCallback(() => {
    if (historyBusy.current || !historyCursor || !user) return;
    historyBusy.current = true;
    setHistoryLoading(true);
    const epoch = sessionEpoch.current;
    void agentClient
      .get<HistoryPage>("/history", { params: { before: historyCursor } })
      .then(({ data }) => {
        if (epoch !== sessionEpoch.current) return;
        setConversations((previous) => [
          ...new Map(
            [...previous, ...data.items].map((conversation) => [
              conversation.id,
              conversation,
            ]),
          ).values(),
        ]);
        setHistoryCursor(data.nextCursor);
      })
      .catch((cause) => setError(getErrorMessage(cause)))
      .finally(() => {
        historyBusy.current = false;
        setHistoryLoading(false);
      });
  }, [historyCursor, user]);
  const loadOlderMessages = useCallback(() => {
    if (messagesBusy.current || !current?.messagePage?.nextCursor) return;
    messagesBusy.current = true;
    setMessagesLoading(true);
    const controller = new AbortController();
    olderRequest.current = controller;
    const id = current.conversation.id;
    const epoch = sessionEpoch.current;
    void agentClient
      .get<Detail>(`/conversations/${id}`, {
        signal: controller.signal,
        params: { before: current.messagePage.nextCursor },
      })
      .then(({ data }) => {
        if (controller.signal.aborted || epoch !== sessionEpoch.current) return;
        const main = document.getElementById("main-content");
        if (main)
          scrollRestore.current = {
            height: main.scrollHeight,
            top: main.scrollTop,
          };
        setDetail((previous) =>
          previous?.conversation.id === id
            ? mergeMessages(previous, data, true)
            : previous,
        );
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(getErrorMessage(cause));
      })
      .finally(() => {
        messagesBusy.current = false;
        setMessagesLoading(false);
      });
  }, [current]);
  const selectedActive =
    current?.runs.some(activeRun) || Boolean(selectedId && !current);
  useEffect(() => {
    if (!current || restoredConversation.current === selectedId) return;
    restoredConversation.current = selectedId;
    const run = current.runs.at(-1);
    if (!run) return;
    setSourceIds(run.sourceIds || []);
    setTargetIds(run.targetIds || []);
    setTemplateIds(run.templateIds || []);
    setOperation(run.operation || "auto");
    setCategory(run.productType || "Sản phẩm POD");
  }, [current, selectedId]);

  const activeCount = allRuns.filter(activeRun).length;
  const agentView =
    ["agent", "jobs", "library", "templates", "workflows", "settings"].includes(
      page,
    ) || page.startsWith("admin");
  const [contextOpen, setContextOpen] = useState(
    () => window.matchMedia("(min-width: 1101px)").matches,
  );
  const newConversation = () => {
    if (busy) return;
    restoredConversation.current = "";
    setSelectedId("");
    setDetail(undefined);
    setFocusedRun(undefined);
    setExpandedRuns([]);
    setSourceIds([]);
    setTargetIds([]);
    setTemplateIds([]);
    setBrief("");
    setResearch("");
    setSources("");
    setOperation("auto");
    setWorkflowId("");
    messageId.current = null;
    onNavigate("agent");
  };
  const openConversation = (id: string) => {
    if (busy) return;
    if (selectedId !== id) {
      restoredConversation.current = "";
      setSourceIds([]);
      setTargetIds([]);
      setTemplateIds([]);
      setResearch("");
      setSources("");
      setDetail(undefined);
      setFocusedRun(undefined);
      setExpandedRuns([]);
      setBrief("");
      setWorkflowId("");
      messageId.current = null;
    }
    setSelectedId(id);
    onNavigate("agent");
  };
  const logout = () =>
    act(async () => {
      await agentClient.post("/auth/logout");
      clearSession();
    });
  const sendBrief = () => {
    if (busy || selectedActive || brief.trim().length < 3) return;
    act(async () => {
      const researchSources = sources
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean)
        .map((url) => {
          const parsed = new URL(url);
          if (!["http:", "https:"].includes(parsed.protocol))
            throw new Error("Nguồn tham khảo phải là URL HTTP/HTTPS.");
          return {
            title: parsed.hostname,
            url: parsed.href,
            retrievedAt: new Date().toISOString(),
          };
        });
      let id = selectedId;
      if (!id) {
        id = (
          await agentClient.post<Conversation>("/conversations", {
            title: brief.slice(0, 120),
          })
        ).data.id;
        setSelectedId(id);
      }
      messageId.current ??= crypto.randomUUID();
      if (workflowId)
        await agentClient.post(`/workflows/${workflowId}/launch`, {
          id: messageId.current,
          conversationId: id,
          brief,
          sourceIds,
          targetIds,
          templateIds,
          productType: category,
          provider: ai.provider,
          ...(ai.imageModel ? { imageModel: ai.imageModel } : {}),
          research,
          researchSources,
          validateVisually,
        });
      else
        await agentClient.post(`/conversations/${id}/messages`, {
          id: messageId.current,
          text: brief,
          operation,
          sourceIds,
          targetIds:
            operation === "mockup_ai" || operation === "auto" ? targetIds : [],
          templateIds:
            operation === "mockup_template" || operation === "auto"
              ? templateIds
              : [],
          count,
          provider: ai.provider,
          ...(ai.imageModel ? { imageModel: ai.imageModel } : {}),
          productType: category,
          research,
          researchSources,
          validateVisually,
        });
      messageId.current = null;
      setBrief("");
      setFocusedRun(undefined);
    });
  };
  const selectLibraryAsset = (id: string, role: "source" | "reference") => {
    newConversation();
    if (role === "source") setSourceIds([id]);
    else setTargetIds([id]);
    setContextOpen(true);
  };
  const selectTemplate = (template: MockupTemplate) => {
    newConversation();
    setOperation("mockup_template");
    setTemplateIds([template.id]);
    setCategory(template.category);
    setContextOpen(true);
  };
  const pickedAssets = [
    ...sourceIds.map((id) => ({
      id,
      role: "Nguồn",
      remove: () => setSourceIds((ids) => ids.filter((value) => value !== id)),
    })),
    ...targetIds.map((id) => ({
      id,
      role: "Tham chiếu",
      remove: () => setTargetIds((ids) => ids.filter((value) => value !== id)),
    })),
  ];
  const modelSettings = (
    <div className="workspace-model-settings">
      <AIImageModelPanel />
      <details
        className="provider-connection"
        open={page !== "agent" || undefined}
      >
        <summary>Kết nối AI</summary>
        <AIProviderSelect />
      </details>
    </div>
  );
  const notice = error && (
    <div role="alert" className="workspace-alert">
      <AlertCircle size={18} aria-hidden="true" />
      <p>{error}</p>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setError("");
          if (user) void reload();
          else setConnectionKey((value) => value + 1);
        }}
      >
        Tải lại
      </Button>
    </div>
  );

  if (!user) {
    return (
      <main className="agent-auth-root" aria-label="LCG Agent">
        <div className="agent-login-layout">
          <section className="login-story">
            <span className="login-wordmark">
              <Bot size={25} aria-hidden="true" /> LCG Agent
            </span>
            <span className="login-story-label">YOUR CREATIVE PARTNER</span>
            <h1>
              Bạn có ý tưởng.
              <br />
              Agent có kế hoạch.
            </h1>
            <p>
              Một không gian để biến yêu cầu thành mockup và thiết kế sản phẩm.
              Bạn định hướng, Agent xử lý, bạn duyệt kết quả.
            </p>
            <ol>
              <li>
                <span>01</span>
                <div>
                  <strong>Giao việc qua chat</strong>
                  <p>Thêm ảnh, mô tả ý tưởng và điều bạn muốn giữ nguyên.</p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <strong>Thống nhất kế hoạch</strong>
                  <p>Kiểm tra và chỉnh sửa prompt trước khi tạo ảnh.</p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <strong>Duyệt và sẵn sàng sử dụng</strong>
                  <p>Lưu phiên bản, kiểm tra kết quả và tải cả bộ.</p>
                </div>
              </li>
            </ol>
            <span className="login-story-footer">BUILT FOR POD CREATORS</span>
          </section>
          <section className="login-form-panel">
            <div className="login-form-content">
              <p className="eyebrow">KHÔNG GIAN CỦA BẠN</p>
              <h2>Chào mừng trở lại.</h2>
              <p className="login-description">
                Đăng nhập để tiếp tục những ý tưởng còn dang dở.
              </p>
              {notice}
              {authChecking || !status ? (
                <div role="status" className="connection-status">
                  <Loader2
                    className="studio-loading-spinner"
                    size={20}
                    aria-hidden="true"
                  />
                  Đang kết nối Agent…
                  {error && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setError("");
                        setConnectionKey((value) => value + 1);
                      }}
                    >
                      Kết nối lại
                    </Button>
                  )}
                </div>
              ) : !status.enabled ||
                (status.setupRequired && !status.google?.enabled) ? (
                <div className="workspace-setup">
                  <Bot size={28} aria-hidden="true" />
                  <h3>Workspace đang được chuẩn bị</h3>
                  <p>
                    {!status.enabled
                      ? "Agent chưa được bật trên máy chủ."
                      : "Quản trị viên cần tạo tài khoản đầu tiên trước khi sử dụng Agent."}
                  </p>
                </div>
              ) : (
                <>
                  {status.google?.enabled && status.google.clientId && (
                    <GoogleSignIn
                      clientId={status.google.clientId}
                      allowedDomains={status.google.allowedDomains}
                      busy={busy}
                      onCredential={async (credential, nonce) => {
                        if (busy) return;
                        setBusy(true);
                        setError("");
                        try {
                          const { data } = await agentClient.post<AgentLogin>(
                            "/auth/google",
                            { credential, nonce },
                          );
                          authorizeAgent(data.token);
                          setAgentToken(data.token);
                          setUser(data.user);
                          setPassword("");
                        } finally {
                          setBusy(false);
                        }
                      }}
                    />
                  )}
                  <form
                    className="agent-login-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      act(async () => {
                        const response = await agentClient.post<{
                          token: string;
                          user: AgentUser;
                        }>("/auth/login", { email, password });
                        authorizeAgent(response.data.token);
                        setAgentToken(response.data.token);
                        setUser(response.data.user);
                        setPassword("");
                      });
                    }}
                  >
                    <label>
                      Email
                      <input
                        className={field}
                        type="email"
                        autoComplete="username"
                        required
                        maxLength={254}
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@company.com"
                      />
                    </label>
                    <label>
                      Mật khẩu
                      <input
                        className={field}
                        type="password"
                        autoComplete="current-password"
                        required
                        minLength={12}
                        maxLength={128}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Nhập mật khẩu của bạn"
                      />
                    </label>
                    <Button type="submit" disabled={busy}>
                      {busy ? (
                        <Loader2
                          aria-hidden="true"
                          className="studio-loading-spinner"
                        />
                      ) : (
                        <ArrowRight aria-hidden="true" />
                      )}
                      {busy ? "Đang đăng nhập…" : "Đăng nhập"}
                    </Button>
                  </form>
                </>
              )}
              <p className="login-privacy">
                <ShieldCheck size={16} aria-hidden="true" />
                Ảnh và lịch sử nằm trong tài khoản của bạn.
              </p>
            </div>
            <p className="login-footer">
              LCG Media · Không gian sáng tạo với AI
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <AgentShell
      currentPage={page}
      onPageChange={onNavigate}
      user={user}
      conversations={conversations}
      selectedId={selectedId}
      onConversation={openConversation}
      onNew={newConversation}
      onLogout={logout}
      activeCount={activeCount}
      busy={busy}
      historyHasMore={!!historyCursor}
      historyLoading={historyLoading}
      onMoreHistory={loadMoreHistory}
    >
      <div hidden={!agentView}>
        <>
          {notice}
          {page === "workflows" && (
            <WorkflowLibrary
              workflows={workflows}
              busy={busy}
              act={act}
              onUse={(workflow) => {
                newConversation();
                setWorkflowId(workflow.id);
                setOperation("auto");
                setContextOpen(true);
                document.getElementById("agent-brief")?.focus();
              }}
            />
          )}
          {page.startsWith("admin") && (
            <Suspense
              fallback={
                <p role="status" className="admin-placeholder">
                  Đang tải trang quản trị…
                </p>
              }
            >
              <AdminPage user={user} page={page} onNavigate={onNavigate} />
            </Suspense>
          )}
          <section
            hidden={page !== "agent"}
            className="agent-chat-workspace"
            aria-label="Trợ lý AI"
          >
            <div className="agent-chat-column">
              {!selectedId && (
                <div className="agent-welcome">
                  <span className="welcome-kicker">
                    <span className="tiny-agent-mark">
                      <Bot size={17} aria-hidden="true" />
                    </span>{" "}
                    CỘNG SỰ SÁNG TẠO CỦA BẠN
                  </span>
                  <h1>
                    Một ý tưởng.
                    <br />
                    <span>Cả quy trình.</span>
                  </h1>
                  <p>
                    Chia sẻ điều bạn muốn tạo. Agent sẽ lên kế hoạch,
                    <br className="hidden sm:block" /> xử lý và mang kết quả về
                    để bạn duyệt.
                  </p>
                </div>
              )}
              {selectedId && (
                <div className="conversation-heading">
                  <div>
                    <p className="eyebrow">CUỘC TRÒ CHUYỆN</p>
                    <h1>
                      {current?.conversation.title || "Đang mở công việc…"}
                    </h1>
                  </div>
                  <Button variant="outline" size="sm" onClick={newConversation}>
                    <Plus aria-hidden="true" />
                    Mới
                  </Button>
                </div>
              )}
              {selectedId && !current && (
                <p role="status" className="connection-status">
                  <Loader2
                    className="studio-loading-spinner"
                    size={18}
                    aria-hidden="true"
                  />
                  Đang tải công việc…
                </p>
              )}
              {current && (
                <div className="conversation-thread">
                  <section aria-label="Hội thoại" className="chat-messages">
                    {current.messagePage?.hasMore && (
                      <HistoryLoader
                        loading={messagesLoading}
                        onLoad={loadOlderMessages}
                        label="Tải tin nhắn trước đó"
                      />
                    )}
                    {current.conversation.messages.map((message) => (
                      <div
                        className={`chat-message ${message.role === "user" ? "chat-message-user" : "chat-message-agent"}`}
                        key={message.id}
                      >
                        <span className="message-avatar">
                          {message.role === "user" ? (
                            user.email.slice(0, 1).toUpperCase()
                          ) : (
                            <Bot size={17} aria-hidden="true" />
                          )}
                        </span>
                        <div>
                          <p className="message-author">
                            {message.role === "user" ? "Bạn" : "LCG Agent"}
                          </p>
                          <p className="message-text">{message.text}</p>
                          {message.createdAt && (
                            <time
                              className="message-time"
                              dateTime={message.createdAt}
                            >
                              {new Date(message.createdAt).toLocaleString(
                                "vi-VN",
                              )}
                            </time>
                          )}
                          {message.runId && (
                            <button
                              type="button"
                              className="text-action"
                              onClick={() =>
                                setFocusedRun({
                                  conversationId: selectedId,
                                  runId: message.runId!,
                                })
                              }
                            >
                              Xem công việc này{" "}
                              <ArrowRight size={14} aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={messageEnd} />
                  </section>
                  {current.workflowExecutions?.map((execution) => (
                    <WorkflowProgress
                      key={execution.id}
                      execution={execution}
                      run={current.runs.find(
                        (run) => run.id === execution.runIds[execution.stage],
                      )}
                      busy={busy}
                      act={act}
                      onRun={(runId) =>
                        setFocusedRun({ conversationId: selectedId, runId })
                      }
                    />
                  ))}
                  <div
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                    className="sr-only"
                  >
                    {current.runs.filter(activeRun).length} công việc đang xử
                    lý.
                  </div>
                  {focusedRun?.conversationId === selectedId && (
                    <Button
                      variant="outline"
                      onClick={() => setFocusedRun(undefined)}
                    >
                      Xem các lần chạy gần đây
                    </Button>
                  )}
                  {current.runs.map((run, index) =>
                    index === current.runs.length - 1 ||
                    activeRun(run) ||
                    expandedRuns.includes(run.id) ? (
                      <AgentRunCard
                        key={`${run.id}:${run.updatedAt}`}
                        run={run}
                        steps={current.steps.filter(
                          (step) => step.runId === run.id,
                        )}
                        results={current.results}
                        assets={assets}
                        busy={busy}
                        act={act}
                        onSource={(id) => {
                          setSourceIds([id]);
                          setTargetIds([]);
                          setOperation("design");
                          setBrief("Tạo biến thể từ ảnh nguồn này: ");
                          setContextOpen(true);
                        }}
                      />
                    ) : (
                      <Button
                        key={run.id}
                        variant="outline"
                        className="h-auto w-full justify-start whitespace-normal p-3 text-left"
                        onClick={() =>
                          setExpandedRuns((ids) => [...ids, run.id])
                        }
                      >
                        Mở lần chạy trước: {run.brief}
                      </Button>
                    ),
                  )}
                </div>
              )}
              <form
                className="agent-composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  sendBrief();
                }}
              >
                <label className="sr-only" htmlFor="agent-brief">
                  Giao việc hoặc yêu cầu chỉnh tiếp
                </label>
                <textarea
                  id="agent-brief"
                  placeholder="Bạn muốn Agent giúp gì hôm nay?"
                  required
                  minLength={3}
                  maxLength={12000}
                  value={brief}
                  onChange={(event) => {
                    setBrief(event.target.value);
                    messageId.current = null;
                  }}
                  disabled={busy || selectedActive}
                />
                {!!pickedAssets.length && (
                  <div className="composer-attachments">
                    {pickedAssets.map(({ id, role, remove }) => (
                      <div className="attachment-chip" key={`${role}:${id}`}>
                        <AgentImage
                          id={id}
                          name={
                            assets.find((asset) => asset.id === id)?.name ||
                            role
                          }
                        />
                        <div>
                          <strong>
                            {assets.find((asset) => asset.id === id)?.name ||
                              role}
                          </strong>
                          <small>{role}</small>
                        </div>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`Bỏ chọn ${role} ${assets.find((asset) => asset.id === id)?.name || "ảnh"}`}
                          disabled={busy || selectedActive}
                          onClick={remove}
                        >
                          <X size={14} aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="composer-actions">
                  <button
                    type="button"
                    className="composer-context-toggle"
                    aria-expanded={contextOpen}
                    aria-controls="agent-context"
                    onClick={() => setContextOpen((value) => !value)}
                  >
                    <Paperclip size={17} aria-hidden="true" />
                    <span>Ngữ cảnh & tệp</span>
                    {pickedAssets.length > 0 && (
                      <span className="nav-count">{pickedAssets.length}</span>
                    )}
                  </button>
                  <span className="composer-mode">
                    <Sparkles size={14} aria-hidden="true" />
                    {operation === "auto"
                      ? "Agent tự chọn"
                      : operation === "design"
                        ? "Ý tưởng & thiết kế"
                        : "Mockup"}
                  </span>
                  <Button
                    type="submit"
                    disabled={
                      busy ||
                      selectedActive ||
                      brief.trim().length < 3 ||
                      (operation !== "mockup_template" &&
                        !ai.imageModelReady &&
                        !(
                          workflowId &&
                          workflows
                            .find((workflow) => workflow.id === workflowId)
                            ?.steps.every(
                              (step) => step.operation === "mockup_template",
                            )
                        ))
                    }
                  >
                    {busy || selectedActive ? (
                      <Loader2
                        aria-hidden="true"
                        className="studio-loading-spinner"
                      />
                    ) : (
                      <ArrowUp size={18} aria-hidden="true" />
                    )}
                    <span>Lập kế hoạch</span>
                  </Button>
                </div>
              </form>
              <p className="composer-footnote">
                <ShieldCheck size={13} aria-hidden="true" />
                Bạn duyệt prompt trước khi Agent tạo ảnh. Bước lập kế hoạch có
                thể gọi model phân tích.
              </p>
              {!selectedId && (
                <>
                  <div className="starter-heading">
                    <span>BẠN CÓ THỂ BẮT ĐẦU VỚI</span>
                    <span aria-hidden="true">↘</span>
                  </div>
                  <div className="agent-starters">
                    {[
                      {
                        icon: Layers,
                        title: "Tạo mockup sản phẩm",
                        text: "Giữ sản phẩm, thay bối cảnh",
                        operation: "mockup_ai",
                        brief:
                          "Thay sản phẩm trong các ảnh tham chiếu bằng sản phẩm nguồn. Giữ nguyên thiết kế sản phẩm và bối cảnh ảnh tham chiếu.",
                      },
                      {
                        icon: Lightbulb,
                        title: "Phát triển ý tưởng",
                        text: "Từ keyword đến bộ thiết kế",
                        operation: "design",
                        brief: "Đề xuất 3 ý tưởng thiết kế POD từ chủ đề: ",
                      },
                      {
                        icon: ScanLine,
                        title: "Ghép lên template",
                        text: "Một mẫu chuẩn, nhiều thiết kế",
                        operation: "mockup_template",
                        brief:
                          "Ghép các thiết kế nguồn lên template đã chọn. Giữ đúng tỉ lệ và màu sắc thiết kế.",
                      },
                    ].map(
                      ({
                        icon: Icon,
                        title,
                        text,
                        operation: mode,
                        brief: value,
                      }) => (
                        <button
                          type="button"
                          key={mode}
                          disabled={busy}
                          className={`agent-starter starter-${mode}`}
                          onClick={() => {
                            setOperation(mode as Operation);
                            setBrief(value);
                            setContextOpen(true);
                            document.getElementById("agent-brief")?.focus();
                          }}
                        >
                          <Icon size={21} aria-hidden="true" />
                          <strong>{title}</strong>
                          <span>{text}</span>
                          <ArrowUpRight size={15} aria-hidden="true" />
                        </button>
                      ),
                    )}
                  </div>
                  <div className="agent-process-note">
                    <span>01&nbsp; Giao việc</span>
                    <ArrowRight size={14} aria-hidden="true" />
                    <span>02&nbsp; Duyệt kế hoạch</span>
                    <ArrowRight size={14} aria-hidden="true" />
                    <span>03&nbsp; Nhận kết quả</span>
                  </div>
                </>
              )}
            </div>
            <aside
              id="agent-context"
              className={`agent-context ${contextOpen ? "context-open" : ""}`}
              aria-label="Ngữ cảnh công việc"
            >
              <div className="context-heading">
                <div>
                  <h2>Ngữ cảnh công việc</h2>
                  <p>Để Agent hiểu đúng ý bạn.</p>
                </div>
                <button
                  type="button"
                  className="icon-button context-close"
                  aria-label="Đóng ngữ cảnh"
                  onClick={() => setContextOpen(false)}
                >
                  <X size={17} aria-hidden="true" />
                </button>
              </div>
              <div className="context-section context-models">
                <div className="section-label">
                  <span>MODEL XỬ LÝ</span>
                  <Settings2 size={14} aria-hidden="true" />
                </div>
                {page === "agent" && modelSettings}
              </div>
              <div className="context-section">
                <label className="context-label">
                  Custom workflow
                  <select
                    aria-label="Custom workflow"
                    className={field}
                    value={workflowId}
                    disabled={busy || selectedActive}
                    onChange={(event) => {
                      setWorkflowId(event.target.value);
                      if (event.target.value) setOperation("auto");
                      messageId.current = null;
                    }}
                  >
                    <option value="">Không dùng workflow riêng</option>
                    {workflows
                      .filter((workflow) => !workflow.archived)
                      .map((workflow) => (
                        <option value={workflow.id} key={workflow.id}>
                          {workflow.name} · {workflow.steps.length} bước
                        </option>
                      ))}
                  </select>
                </label>
                {workflowId && (
                  <p className="context-help">
                    Chọn đủ ảnh đầu vào, ảnh tham chiếu và template cho các
                    bước. Tác vụ và số biến thể lấy từ workflow.
                  </p>
                )}
                <label className="context-label">
                  Quy trình
                  <select
                    aria-label="Quy trình"
                    className={field}
                    value={operation}
                    disabled={busy || selectedActive || !!workflowId}
                    onChange={(event) =>
                      setOperation(event.target.value as Operation)
                    }
                  >
                    <option value="auto">Agent tự chọn quy trình</option>
                    <option value="mockup_ai">Mockup từ ảnh tham chiếu</option>
                    <option value="mockup_template">
                      Ghép thiết kế lên template
                    </option>
                    <option value="design">Ý tưởng và Design</option>
                  </select>
                </label>
                <div className="context-field-grid">
                  <label className="context-label">
                    Nhóm sản phẩm
                    <input
                      className={field}
                      list="pod-categories"
                      maxLength={100}
                      value={category}
                      disabled={busy || selectedActive}
                      onChange={(event) => setCategory(event.target.value)}
                    />
                    <datalist id="pod-categories">
                      {["T-shirt", "Sweatshirt", "Ornament", "Doormat"].map(
                        (value) => (
                          <option key={value} value={value} />
                        ),
                      )}
                    </datalist>
                  </label>
                  {!workflowId &&
                    (operation === "auto" || operation === "design") && (
                      <label className="context-label">
                        Số ý tưởng/biến thể
                        <input
                          className={field}
                          type="number"
                          min={1}
                          max={20}
                          value={count}
                          disabled={busy || selectedActive}
                          onChange={(event) =>
                            setCount(Number(event.target.value))
                          }
                        />
                      </label>
                    )}
                </div>
              </div>
              {current && (
                <div className="context-section">
                  <ConversationContext
                    key={`${current.conversation.id}:${(current.conversation.pinnedRequirements ?? []).join("\n")}`}
                    detail={current}
                    busy={busy || selectedActive}
                    act={act}
                  />
                </div>
              )}
              <div className="context-section">
                <div className="section-label">
                  <span>ẢNH ĐẦU VÀO</span>
                  <span>{pickedAssets.length}/40</span>
                </div>
                <label className="context-upload">
                  <ImagePlus size={20} aria-hidden="true" />
                  <strong>
                    {operation === "mockup_template"
                      ? "Thiết kế nguồn"
                      : "Sản phẩm / thiết kế nguồn"}
                  </strong>
                  <span>
                    {sourceIds.length
                      ? `${sourceIds.length} ảnh đã chọn · thêm ảnh`
                      : "PNG, JPG, WebP · tối đa 16 MB/ảnh"}
                  </span>
                  <input
                    type="file"
                    aria-label={
                      operation === "mockup_template"
                        ? "File thiết kế nguồn (nên dùng PNG trong suốt)"
                        : "Ảnh sản phẩm/thiết kế nguồn"
                    }
                    accept="image/png,image/jpeg,image/webp"
                    multiple={operation !== "design"}
                    disabled={busy || selectedActive}
                    onChange={(event) => {
                      upload(event.target.files, "source");
                      event.target.value = "";
                    }}
                  />
                </label>
                {(operation === "auto" || operation === "mockup_ai") && (
                  <label className="context-upload context-upload-reference">
                    <ScanLine size={20} aria-hidden="true" />
                    <strong>Ảnh tham chiếu</strong>
                    <span>
                      {targetIds.length
                        ? `${targetIds.length} ảnh đã chọn · thêm ảnh`
                        : "Bối cảnh cần giữ trong kết quả"}
                    </span>
                    <input
                      type="file"
                      aria-label="Ảnh tham chiếu — cảnh cần giữ"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      disabled={busy || selectedActive}
                      onChange={(event) => {
                        upload(event.target.files, "reference");
                        event.target.value = "";
                      }}
                    />
                  </label>
                )}
                {operation === "design" && (
                  <p className="context-help">
                    Không cần ảnh nguồn khi tạo thiết kế mới. Thêm một ảnh để
                    tạo biến thể.
                  </p>
                )}
                <details className="context-details">
                  <summary>Chọn ảnh từ thư viện ({assets.length})</summary>
                  <div className="context-asset-picker">
                    {assets
                      .filter((asset) => asset.kind !== "template")
                      .map((asset) => (
                        <div key={asset.id}>
                          <p title={asset.name}>
                            {asset.name} · v{asset.revision}
                          </p>
                          <div>
                            <label>
                              <input
                                type="checkbox"
                                checked={sourceIds.includes(asset.id)}
                                disabled={
                                  busy ||
                                  selectedActive ||
                                  targetIds.includes(asset.id) ||
                                  (!sourceIds.includes(asset.id) &&
                                    sourceIds.length >= 20)
                                }
                                onChange={() =>
                                  choose(asset.id, sourceIds, setSourceIds)
                                }
                              />
                              Nguồn
                            </label>
                            {(operation === "auto" ||
                              operation === "mockup_ai") && (
                              <label>
                                <input
                                  type="checkbox"
                                  checked={targetIds.includes(asset.id)}
                                  disabled={
                                    busy ||
                                    selectedActive ||
                                    sourceIds.includes(asset.id) ||
                                    (!targetIds.includes(asset.id) &&
                                      targetIds.length >= 20)
                                  }
                                  onChange={() =>
                                    choose(asset.id, targetIds, setTargetIds)
                                  }
                                />
                                Tham chiếu
                              </label>
                            )}
                          </div>
                        </div>
                      ))}
                    {!assets.length && (
                      <p>
                        Thư viện sẽ hiển thị ảnh bạn tải lên và ảnh Agent đã
                        tạo.
                      </p>
                    )}
                  </div>
                </details>
              </div>
              {(operation === "auto" || operation === "mockup_template") && (
                <div className="context-section">
                  <div className="section-label">
                    <span>TEMPLATES</span>
                    <button
                      type="button"
                      className="text-action"
                      disabled={busy || selectedActive}
                      onClick={() => {
                        setTemplateEditor("new");
                        onNavigate("templates");
                      }}
                    >
                      Thêm template <Plus size={13} aria-hidden="true" />
                    </button>
                  </div>
                  {templates.length ? (
                    templates.map((template) => (
                      <label key={template.id} className="context-template">
                        <input
                          type="checkbox"
                          checked={templateIds.includes(template.id)}
                          disabled={busy || selectedActive}
                          onChange={() =>
                            choose(template.id, templateIds, setTemplateIds)
                          }
                        />
                        <span>
                          {template.name}
                          <small>{template.category}</small>
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className="context-help">
                      Tạo mẫu chuẩn để dùng lại vị trí và phối cảnh cho nhiều
                      thiết kế.
                    </p>
                  )}
                </div>
              )}
              <div className="context-section">
                <label className="context-check">
                  <input
                    type="checkbox"
                    checked={validateVisually}
                    disabled={busy || selectedActive}
                    onChange={(event) =>
                      setValidateVisually(event.target.checked)
                    }
                  />
                  <span>
                    Kiểm tra kết quả bằng AI
                    <small>
                      Thêm một lần phân tích cho mỗi ảnh. Vẫn cần bạn duyệt kết
                      quả.
                    </small>
                  </span>
                </label>
              </div>
              {(operation === "auto" || operation === "design") && (
                <details className="context-details context-section">
                  <summary>Keyword & dữ liệu nghiên cứu</summary>
                  <p className="context-help">
                    Agent dùng dữ liệu bạn cung cấp. Chưa tự thu thập số liệu
                    thị trường hoặc kiểm chứng URL.
                  </p>
                  <label className="context-label">
                    Dữ liệu keyword / brief nghiên cứu
                    <textarea
                      className={field}
                      maxLength={20000}
                      value={research}
                      disabled={busy || selectedActive}
                      onChange={(event) => setResearch(event.target.value)}
                    />
                  </label>
                  <label className="context-label">
                    Nguồn tham khảo — mỗi dòng một URL
                    <textarea
                      className={field}
                      value={sources}
                      disabled={busy || selectedActive}
                      onChange={(event) => setSources(event.target.value)}
                    />
                  </label>
                </details>
              )}
            </aside>
          </section>
          {page === "jobs" && <ToolJobs />}
          {page === "jobs" && (
            <AgentJobs
              conversations={conversations}
              runs={allRuns}
              onOpen={openConversation}
              onNew={newConversation}
            />
          )}
          {page === "library" && (
            <AgentLibrary
              key={user.id}
              assets={assets}
              busy={busy}
              act={act}
              onUpload={(files) => {
                if (!files?.length) return;
                const list = Array.from(files);
                act(async () => {
                  if (list.length > 20)
                    throw new Error("Mỗi lần tải tối đa 20 ảnh.");
                  for (const file of list) {
                    const asset = await agentUpload(file, "source", category);
                    setAssets((value) => [asset, ...value]);
                  }
                });
              }}
              onSource={(id) => selectLibraryAsset(id, "source")}
              onReference={(id) => selectLibraryAsset(id, "reference")}
            />
          )}
          {page === "templates" && (
            <>
              <AgentTemplates
                templates={templates}
                busy={busy || !!selectedActive}
                onNew={() => setTemplateEditor("new")}
                onEdit={setTemplateEditor}
                onUse={selectTemplate}
              />
              {templateEditor && (
                <section
                  className="workspace-template-editor"
                  aria-label="Cấu hình template"
                >
                  <div className="context-heading">
                    <h2>
                      {typeof templateEditor === "string"
                        ? "Tạo template"
                        : "Tạo phiên bản template mới"}
                    </h2>
                    <Button
                      variant="ghost"
                      onClick={() => setTemplateEditor(null)}
                    >
                      Đóng cấu hình
                    </Button>
                  </div>
                  <TemplateEditor
                    key={
                      typeof templateEditor === "string"
                        ? "new"
                        : templateEditor.id
                    }
                    assets={assets}
                    initial={
                      typeof templateEditor === "string"
                        ? undefined
                        : templateEditor
                    }
                    onSaved={reload}
                  />
                </section>
              )}
            </>
          )}
          {page === "settings" && (
            <div className="workspace-page">
              <WorkspaceHeading
                eyebrow="AGENT CỦA BẠN"
                title="Một cấu hình, mọi công việc."
                description="Chọn model cho ảnh đầu ra và hiểu cách Agent xử lý yêu cầu."
              />
              <div className="settings-grid">
                <section className="settings-card">
                  <h2>Model & kết nối AI</h2>
                  <p>
                    Model được giữ nguyên trong mỗi công việc. Các lựa chọn sẽ
                    khóa khi đang có yêu cầu xử lý.
                  </p>
                  {modelSettings}
                </section>
                <section className="settings-card">
                  <ShieldCheck size={25} aria-hidden="true" />
                  <h2>Bạn luôn kiểm soát bước tạo ảnh</h2>
                  <p>
                    Agent phân tích yêu cầu và đề xuất kế hoạch. Bạn xem đầy đủ
                    final prompt, lưu chỉnh sửa và bấm bắt đầu.
                  </p>
                  <ul>
                    <li>Không tự gửi lại tác vụ ảnh chưa rõ kết quả.</li>
                    <li>Hủy sẽ dừng những yêu cầu chưa gửi đến model.</li>
                    <li>Ảnh và lịch sử gắn với tài khoản đăng nhập.</li>
                  </ul>
                  <div className="account-settings">
                    <strong>{user.email}</strong>
                    <span>
                      {user.role === "admin" ? "Quản trị viên" : "Designer"}
                    </span>
                  </div>
                </section>
              </div>
            </div>
          )}
        </>
      </div>
      <div hidden={agentView} className="agent-tool-page">
        <div className="tool-context-strip">
          <div>
            <p className="eyebrow">CÔNG CỤ BỔ TRỢ</p>
            <p>Một bước xử lý riêng cho quy trình sáng tạo của bạn.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate("agent")}
          >
            <Bot aria-hidden="true" />
            Giao việc cho Agent
          </Button>
        </div>
        {!agentView && (
          <div className="tool-model-controls">{modelSettings}</div>
        )}
        {children}
      </div>
    </AgentShell>
  );
}
