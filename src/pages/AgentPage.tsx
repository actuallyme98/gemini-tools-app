import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Bot, Loader2, LogOut, MessageSquarePlus, Send } from "lucide-react";
import { AIProviderContext } from "../context/ai-provider-context";
import {
  agentClient,
  agentUpload,
  authorizeAgent,
  readAgentToken,
  setAgentToken,
  activeRun,
  type AgentUser,
  type Asset,
  type Conversation,
  type Detail,
  type MockupTemplate,
  type Operation,
  type Run,
} from "../services/agent.service";
import { getErrorMessage } from "../services/api.service";
import { Button } from "../components/ui/button";
import { AgentRunCard } from "../components/agent/AgentRunCard";
import { TemplateEditor } from "../components/agent/TemplateEditor";
import { AgentImage } from "../components/agent/AgentImage";

const field =
  "mt-1 w-full min-w-0 rounded-md border bg-white p-2 text-sm disabled:bg-gray-100";
export function AgentPage() {
  const ai = useContext(AIProviderContext)!;
  const [status, setStatus] = useState<{
    enabled: boolean;
    setupRequired: boolean;
  }>();
  const [user, setUser] = useState<AgentUser>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [conversations, setConversations] = useState<Conversation[]>([]);
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
  const reload = useCallback(async () => {
    setRevision((value) => value + 1);
  }, []);
  const processing = busy || allRuns.some(activeRun);
  const clearSession = useCallback(() => {
    authorizeAgent(null);
    setAgentToken(null);
    setUser(undefined);
    setConversations([]);
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
    agentClient
      .get<{ enabled: boolean; setupRequired: boolean }>("/auth/status", {
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
          authorizeAgent(null);
          setAgentToken(null);
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    Promise.all([
      agentClient.get<Conversation[]>("/conversations", {
        signal: controller.signal,
      }),
      agentClient.get<Asset[]>("/assets", { signal: controller.signal }),
      agentClient.get<MockupTemplate[]>("/templates", {
        signal: controller.signal,
      }),
    ])
      .then(([c, a, t]) => {
        if (controller.signal.aborted) return;
        setConversations(c.data);
        setAssets(a.data);
        setTemplates(t.data);
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
        if (conversation) setDetail(conversation.data);
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
  const selectedActive = current?.runs.some(activeRun);

  if (!user)
    return (
      <div className="mx-auto max-w-lg space-y-5 py-8">
        <div className="flex items-center gap-3">
          <Bot className="size-8 text-blue-600" aria-hidden="true" />
          <div>
            <h2 className="text-2xl font-bold">POD Agent</h2>
            <p className="text-sm text-gray-600">
              Giao việc qua chat. Theo dõi toàn bộ quy trình.
            </p>
          </div>
        </div>
        {error && (
          <p
            role="alert"
            className="whitespace-pre-wrap rounded-lg bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}
        {!status ? (
          <p role="status">Đang kết nối Agent…</p>
        ) : !status.enabled || status.setupRequired ? (
          <div className="rounded-xl border bg-white p-5">
            <p>
              {!status.enabled
                ? "Agent chưa được bật trên máy chủ."
                : "Quản trị viên cần tạo tài khoản đầu tiên trước khi sử dụng Agent."}
            </p>
            <p className="mt-2 text-sm text-gray-600">
              Các công cụ hiện tại vẫn dùng được trong menu.
            </p>
          </div>
        ) : (
          <form
            className="space-y-4 rounded-xl border bg-white p-5"
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
            <h3 className="font-semibold">Đăng nhập không gian làm việc</h3>
            <label className="block text-sm">
              Email
              <input
                className={field}
                type="email"
                autoComplete="username"
                required
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Mật khẩu
              <input
                className={field}
                type="password"
                autoComplete="current-password"
                minLength={12}
                maxLength={128}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <Button type="submit" disabled={busy}>
              {busy ? "Đang đăng nhập…" : "Đăng nhập"}
            </Button>
          </form>
        )}
      </div>
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Bot aria-hidden="true" className="text-blue-600" />
            POD Agent
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Mockup và ý tưởng thiết kế · {user.email}
          </p>
        </div>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() =>
            act(async () => {
              try {
                await agentClient.post("/auth/logout");
              } finally {
                clearSession();
              }
            })
          }
        >
          <LogOut aria-hidden="true" />
          Đăng xuất
        </Button>
      </div>
      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-2 rounded-lg border border-red-200 bg-red-50 p-3"
        >
          <p className="min-w-0 whitespace-pre-wrap break-words text-sm text-red-800">
            {error}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setError("");
              void reload();
            }}
          >
            Tải lại
          </Button>
        </div>
      )}
      <div className="grid min-w-0 gap-5 xl:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-3">
          <Button
            className="w-full"
            variant="outline"
            disabled={busy}
            onClick={() => {
              setSelectedId("");
              setDetail(undefined);
              messageId.current = null;
            }}
          >
            <MessageSquarePlus aria-hidden="true" />
            Công việc mới
          </Button>
          <nav
            aria-label="Lịch sử công việc"
            className="flex max-h-64 gap-2 overflow-auto xl:max-h-[65vh] xl:flex-col"
          >
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                aria-current={
                  selectedId === conversation.id ? "page" : undefined
                }
                className={`min-w-40 rounded-lg border p-3 text-left text-sm xl:min-w-0 ${selectedId === conversation.id ? "border-blue-300 bg-blue-50 text-blue-900" : "bg-white hover:bg-gray-50"}`}
                onClick={() => {
                  setSelectedId(conversation.id);
                  setDetail(undefined);
                  messageId.current = null;
                  setFocusedRun(undefined);
                }}
              >
                <span className="line-clamp-2 break-words font-medium">
                  {conversation.title}
                </span>
                <span className="mt-1 block text-xs text-gray-500">
                  {new Date(conversation.updatedAt).toLocaleString("vi-VN")}
                </span>
              </button>
            ))}
          </nav>
        </aside>
        <div className="min-w-0 space-y-5">
          <section
            className="space-y-4 rounded-xl border bg-white p-4 sm:p-5"
            aria-label="Giao việc cho Agent"
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm">
                Quy trình
                <select
                  aria-label="Quy trình"
                  className={field}
                  value={operation}
                  disabled={busy || selectedActive}
                  onChange={(e) => setOperation(e.target.value as Operation)}
                >
                  <option value="auto">Agent tự chọn quy trình</option>
                  <option value="mockup_ai">Mockup từ ảnh tham chiếu</option>
                  <option value="mockup_template">
                    Ghép thiết kế lên template
                  </option>
                  <option value="design">Ý tưởng và Design</option>
                </select>
              </label>
              <label className="text-sm">
                Nhóm sản phẩm
                <input
                  className={field}
                  list="pod-categories"
                  value={category}
                  required
                  maxLength={100}
                  disabled={busy || selectedActive}
                  onChange={(e) => setCategory(e.target.value)}
                />
                <datalist id="pod-categories">
                  {["T-shirt", "Sweatshirt", "Ornament", "Doormat"].map(
                    (value) => (
                      <option key={value} value={value} />
                    ),
                  )}
                </datalist>
              </label>
              {(operation === "design" || operation === "auto") && (
                <label className="text-sm">
                  Số ý tưởng/biến thể
                  <input
                    className={field}
                    type="number"
                    min={1}
                    max={20}
                    value={count}
                    disabled={busy || selectedActive}
                    onChange={(e) => setCount(Number(e.target.value))}
                  />
                </label>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                {operation === "mockup_template"
                  ? "File thiết kế nguồn (nên dùng PNG trong suốt)"
                  : "Ảnh sản phẩm/thiết kế nguồn"}
                <input
                  className={field}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple={operation !== "design"}
                  disabled={busy || selectedActive}
                  onChange={(e) => {
                    upload(e.target.files, "source");
                    e.target.value = "";
                  }}
                />
              </label>
              {(operation === "mockup_ai" || operation === "auto") && (
                <label className="block text-sm font-medium">
                  Ảnh tham chiếu — cảnh cần giữ
                  <input
                    className={field}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    disabled={busy || selectedActive}
                    onChange={(e) => {
                      upload(e.target.files, "reference");
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
            {operation === "design" && (
              <p className="text-xs text-gray-600">
                Không cần ảnh nguồn nếu tạo thiết kế mới. Chọn một ảnh nguồn nếu
                cần tạo biến thể.
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              {[
                ...sourceIds.map((id) => ({
                  id,
                  role: "Nguồn",
                  remove: () =>
                    setSourceIds((current) =>
                      current.filter((value) => value !== id),
                    ),
                })),
                ...targetIds.map((id) => ({
                  id,
                  role: "Tham chiếu",
                  remove: () =>
                    setTargetIds((current) =>
                      current.filter((value) => value !== id),
                    ),
                })),
              ].map(({ id, role, remove }) => {
                const asset =
                  assets.find((value) => value.id === id) ??
                  current?.results.find((value) => value.id === id);
                return (
                  <div key={`${role}:${id}`} className="w-28 min-w-0 space-y-1">
                    <AgentImage id={id} name={asset?.name ?? role} />
                    <p className="text-xs font-medium">{role}</p>
                    <p className="truncate text-xs text-gray-600">
                      {asset?.name}
                    </p>
                    <button
                      type="button"
                      className="min-h-6 text-xs text-red-700 underline"
                      disabled={busy || selectedActive}
                      onClick={remove}
                    >
                      Bỏ chọn
                    </button>
                  </div>
                );
              })}
            </div>
            <details className="rounded-lg border p-3">
              <summary className="cursor-pointer text-sm font-medium">
                Chọn ảnh từ thư viện ({assets.length})
              </summary>
              <div className="mt-3 grid max-h-64 gap-2 overflow-auto sm:grid-cols-2">
                {assets
                  .filter((asset) => asset.kind !== "template")
                  .map((asset) => (
                    <div
                      key={asset.id}
                      className="min-w-0 rounded border p-2 text-xs"
                    >
                      <p className="truncate" title={asset.name}>
                        {asset.name} · v{asset.revision} ·{" "}
                        {asset.review === "approved"
                          ? "Đã duyệt"
                          : "Chưa duyệt"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-3">
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={sourceIds.includes(asset.id)}
                            disabled={
                              busy ||
                              selectedActive ||
                              targetIds.includes(asset.id)
                            }
                            onChange={() =>
                              choose(asset.id, sourceIds, setSourceIds)
                            }
                          />
                          Nguồn
                        </label>
                        {(operation === "mockup_ai" ||
                          operation === "auto") && (
                          <label className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={targetIds.includes(asset.id)}
                              disabled={
                                busy ||
                                selectedActive ||
                                sourceIds.includes(asset.id)
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
              </div>
            </details>
            {(operation === "mockup_template" || operation === "auto") && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Templates đã chuẩn hóa</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {templates.map((template) => (
                    <div key={template.id} className="rounded-lg border p-3">
                      <label className="flex gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={templateIds.includes(template.id)}
                          disabled={busy || selectedActive}
                          onChange={() =>
                            choose(template.id, templateIds, setTemplateIds)
                          }
                        />
                        <span>
                          {template.name} · {template.category}
                        </span>
                      </label>
                      <button
                        type="button"
                        className="mt-2 text-xs text-blue-700 underline"
                        disabled={busy || selectedActive}
                        onClick={() => setTemplateEditor(template)}
                      >
                        Mở cấu hình / tạo bản mới
                      </button>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  disabled={busy || selectedActive}
                  onClick={() =>
                    setTemplateEditor(templateEditor ? null : "new")
                  }
                >
                  {templateEditor ? "Đóng cấu hình" : "Thêm template"}
                </Button>
                {templateEditor && (
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
                )}
              </div>
            )}
            {(operation === "design" || operation === "auto") && (
              <details className="space-y-3 rounded-lg border p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  Keyword và dữ liệu nghiên cứu
                </summary>
                <p className="mt-3 text-xs text-gray-600">
                  Agent dùng dữ liệu bạn cung cấp. Chưa tự thu thập số liệu thị
                  trường hoặc kiểm chứng nội dung các URL.
                </p>
                <label className="block text-sm">
                  Dữ liệu keyword / brief nghiên cứu
                  <textarea
                    className={`${field} min-h-24`}
                    maxLength={20000}
                    value={research}
                    onChange={(e) => setResearch(e.target.value)}
                    disabled={busy || selectedActive}
                  />
                </label>
                <label className="block text-sm">
                  Nguồn tham khảo — mỗi dòng một URL
                  <textarea
                    className={field}
                    value={sources}
                    onChange={(e) => setSources(e.target.value)}
                    disabled={busy || selectedActive}
                  />
                </label>
              </details>
            )}
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                act(async () => {
                  const researchSources = sources
                    .split("\n")
                    .map((value) => value.trim())
                    .filter(Boolean)
                    .map((url) => {
                      const parsed = new URL(url);
                      if (!["http:", "https:"].includes(parsed.protocol))
                        throw new Error(
                          "Nguồn tham khảo phải là URL HTTP/HTTPS.",
                        );
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
                  await agentClient.post(`/conversations/${id}/messages`, {
                    id: messageId.current,
                    text: brief,
                    operation,
                    sourceIds,
                    targetIds:
                      operation === "mockup_ai" || operation === "auto"
                        ? targetIds
                        : [],
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
              }}
            >
              <label className="block text-sm font-medium">
                Giao việc hoặc yêu cầu chỉnh tiếp
                <textarea
                  className={`${field} min-h-28`}
                  placeholder="Ví dụ: Thay ornament trong các ảnh tham chiếu bằng sản phẩm nguồn. Giữ cảnh và ánh sáng; không đổi thiết kế sản phẩm."
                  required
                  minLength={3}
                  maxLength={12000}
                  value={brief}
                  onChange={(e) => {
                    setBrief(e.target.value);
                    messageId.current = null;
                  }}
                  disabled={busy || selectedActive}
                />
              </label>
              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={validateVisually}
                  disabled={busy || selectedActive}
                  onChange={(e) => setValidateVisually(e.target.checked)}
                />
                <span>
                  Kiểm tra kết quả bằng AI — có thể thêm một request phân tích
                  cho mỗi ảnh; vẫn cần duyệt thủ công.
                </span>
              </label>
              <Button
                type="submit"
                disabled={
                  busy ||
                  selectedActive ||
                  !brief.trim() ||
                  (operation !== "mockup_template" && !ai.imageModelReady)
                }
              >
                {busy || selectedActive ? (
                  <Loader2
                    aria-hidden="true"
                    className="animate-spin motion-reduce:animate-none"
                  />
                ) : (
                  <Send aria-hidden="true" />
                )}
                Lập kế hoạch
              </Button>
              <p className="text-xs text-gray-500">
                Bước này có thể gọi model phân tích và text. Ảnh chỉ được tạo
                sau khi bạn kiểm tra kế hoạch và bấm bắt đầu.
              </p>
            </form>
          </section>
          {selectedId && !current && (
            <p role="status" className="text-sm text-gray-600">
              Đang tải công việc…
            </p>
          )}
          {current && (
            <>
              <section aria-label="Hội thoại" className="space-y-3">
                {current.conversation.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-xl p-4 text-sm whitespace-pre-wrap break-words ${message.role === "user" ? "ml-4 bg-blue-50 text-blue-950" : "mr-4 border bg-white text-gray-800"}`}
                  >
                    <p className="mb-1 text-xs font-semibold">
                      {message.role === "user" ? "Bạn" : "POD Agent"}
                    </p>
                    {message.text}
                    {message.runId && (
                      <button
                        type="button"
                        className="mt-2 block min-h-8 text-xs font-medium text-blue-700 underline"
                        onClick={() =>
                          setFocusedRun({
                            conversationId: selectedId,
                            runId: message.runId!,
                          })
                        }
                      >
                        Xem công việc này
                      </button>
                    )}
                  </div>
                ))}
              </section>
              <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="sr-only"
              >
                {current.runs.filter(activeRun).length} công việc đang xử lý.
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
                    }}
                  />
                ) : (
                  <Button
                    key={run.id}
                    variant="outline"
                    className="h-auto w-full justify-start whitespace-normal p-3 text-left"
                    onClick={() =>
                      setExpandedRuns((current) => [...current, run.id])
                    }
                  >
                    Mở lần chạy trước: {run.brief}
                  </Button>
                ),
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
