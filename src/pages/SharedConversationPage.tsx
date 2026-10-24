import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Bot, Globe, Loader2, LockKeyhole } from "lucide-react";
import { getErrorMessage } from "../services/api.service";
import {
  readSharedConversation,
  sharedImageBlob,
  type SharedAsset,
  type SharedConversation,
} from "../services/conversation-sharing.service";
import { Button } from "../components/ui/button";
import { HistoryLoader } from "../components/agent/HistoryLoader";
import { jobStates } from "../components/agent/job-states";
import "../styles/conversation-sharing.css";

function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}
function currentToken() {
  return (
    new URLSearchParams(location.hash.split("?")[1] || "").get("token") || ""
  );
}
function SharedImage({
  token,
  asset,
  label,
}: {
  token: string;
  asset: SharedAsset;
  label: string;
}) {
  const [image, setImage] = useState<{
    token: string;
    id: string;
    url?: string;
  }>();
  useEffect(() => {
    const controller = new AbortController();
    let url: string | undefined;
    sharedImageBlob(token, asset.id, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(blob);
        setImage({ token, id: asset.id, url });
      })
      .catch(() => {
        if (!controller.signal.aborted) setImage({ token, id: asset.id });
      });
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [token, asset.id]);
  const current =
    image?.token === token && image.id === asset.id ? image : undefined;
  return (
    <figure className="shared-chat-image">
      {current?.url ? (
        <img
          src={current.url}
          alt={asset.name}
          width={512}
          height={512}
          loading="lazy"
          onError={() => setImage({ token, id: asset.id })}
        />
      ) : (
        <div>{current ? "Không tải được ảnh" : "Đang tải ảnh…"}</div>
      )}
      <figcaption>
        {label} · {asset.name}
      </figcaption>
    </figure>
  );
}

export default function SharedConversationPage() {
  const token = useSyncExternalStore(subscribe, currentToken, () => "");
  return <SharedConversation key={token} token={token} />;
}
function SharedConversation({ token }: { token: string }) {
  const validToken = /^[a-f0-9-]{36}\.[a-f0-9]{64}$/.test(token);
  const [data, setData] = useState<SharedConversation>();
  const [error, setError] = useState(
    validToken ? "" : "Link chia sẻ không hợp lệ hoặc đã được thu hồi.",
  );
  const [loading, setLoading] = useState(validToken);
  const [retry, setRetry] = useState(0);
  const pending = useRef(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex, nofollow, noarchive";
    const referrer = document.createElement("meta");
    referrer.name = "referrer";
    referrer.content = "no-referrer";
    document.head.append(robots, referrer);
    return () => {
      robots.remove();
      referrer.remove();
      request.current?.abort();
    };
  }, []);
  const load = useCallback(
    (after: number, version?: string) => {
      if (pending.current || !validToken) return;
      pending.current = true;
      const controller = new AbortController();
      request.current = controller;
      readSharedConversation(token, after, controller.signal, version)
        .then((next) => {
          if (controller.signal.aborted) return;
          setError("");
          setData((previous) =>
            !previous || after === 0
              ? next
              : {
                  ...next,
                  messages: [
                    ...new Map(
                      [...previous.messages, ...next.messages].map((item) => [
                        item.id,
                        item,
                      ]),
                    ).values(),
                  ],
                  runs: [
                    ...new Map(
                      [...previous.runs, ...next.runs].map((item) => [
                        item.id,
                        item,
                      ]),
                    ).values(),
                  ],
                  assets: [
                    ...new Map(
                      [...previous.assets, ...next.assets].map((item) => [
                        item.id,
                        item,
                      ]),
                    ).values(),
                  ],
                },
          );
        })
        .catch((cause) => {
          if (controller.signal.aborted) return;
          setData(undefined);
          setError(getErrorMessage(cause));
        })
        .finally(() => {
          if (request.current === controller) {
            pending.current = false;
            if (!controller.signal.aborted) setLoading(false);
          }
        });
    },
    [token, validToken],
  );
  useEffect(() => {
    load(0);
    return () => {
      request.current?.abort();
      pending.current = false;
    };
  }, [load, retry]);
  const more = useCallback(() => {
    if (data?.nextCursor != null && !pending.current) {
      setLoading(true);
      load(data.nextCursor, data.version);
    }
  }, [data, load]);
  const images = (ids: string[], label: string) =>
    ids.flatMap((id) => {
      const asset = data?.assets.find((asset) => asset.id === id);
      return asset
        ? [
            <SharedImage
              key={`${id}:${label}`}
              token={token}
              asset={asset}
              label={label}
            />,
          ]
        : [];
    });

  return (
    <div className="shared-chat-page" data-history-scroll>
      <header className="shared-chat-header">
        <a href="#agent" className="shared-chat-brand">
          <Bot aria-hidden="true" />
          LCG Agent
        </a>
        <span>
          <LockKeyhole size={15} aria-hidden="true" />
          Chỉ xem
        </span>
      </header>
      <main className="shared-chat-content" id="shared-conversation">
        {data ? (
          <>
            <p className="shared-chat-kicker">
              <Globe size={15} aria-hidden="true" />
              CUỘC TRÒ CHUYỆN ĐƯỢC CHIA SẺ
            </p>
            <h1>{data.title}</h1>
            <p className="shared-chat-description">
              Bản lưu lúc {new Date(data.sharedAt).toLocaleString("vi-VN")}. Nội
              dung sau thời điểm này không tự xuất hiện. Phản hồi của AI có thể
              chưa chính xác.
            </p>
            {!data.includeImages && (
              <p className="share-access-note">
                Chủ hội thoại đã chia sẻ nội dung không kèm ảnh.
              </p>
            )}
            <section aria-label="Hội thoại được chia sẻ">
              {data.messages.map((message) => {
                const run =
                  message.runId &&
                  data.runs.find((run) => run.id === message.runId);
                const showRun =
                  run &&
                  data.messages.filter((item) => item.runId === run.id).at(-1)
                    ?.id === message.id;
                return (
                  <article
                    className={`shared-chat-message shared-chat-${message.role}`}
                    key={message.id}
                  >
                    <h2>
                      {message.role === "user" ? "Người dùng" : "LCG Agent"}
                    </h2>
                    <p>{message.text}</p>
                    {message.images.length > 0 && (
                      <div className="shared-chat-images">
                        {message.images.flatMap((image) =>
                          images(
                            [image.id],
                            image.role === "reference"
                              ? "Ảnh tham chiếu"
                              : image.role === "template"
                                ? "Template"
                                : "Ảnh nguồn",
                          ),
                        )}
                      </div>
                    )}
                    {showRun && (
                      <section
                        className="shared-chat-run"
                        aria-label="Kế hoạch và kết quả"
                      >
                        <p>
                          <strong>Công việc:</strong>{" "}
                          {jobStates[run.state] || run.state}
                        </p>
                        {run.summary && run.summary !== message.text && (
                          <p>{run.summary}</p>
                        )}
                        {run.questions.length > 0 && (
                          <ul>
                            {run.questions.map((question, index) => (
                              <li key={index}>{question}</li>
                            ))}
                          </ul>
                        )}
                        {run.items.length > 0 && (
                          <details>
                            <summary>Xem prompt ({run.items.length})</summary>
                            {run.items.map((item, index) => (
                              <div key={index}>
                                <h3>{item.title}</h3>
                                <p>{item.prompt}</p>
                              </div>
                            ))}
                          </details>
                        )}
                        {run.resultIds.length > 0 && (
                          <>
                            <h3>Ảnh kết quả</h3>
                            <div className="shared-chat-images">
                              {images(run.resultIds, "Kết quả")}
                            </div>
                          </>
                        )}
                      </section>
                    )}
                  </article>
                );
              })}
            </section>
            {data.nextCursor !== null && (
              <HistoryLoader
                loading={loading}
                onLoad={more}
                label="Xem thêm tin nhắn"
              />
            )}
          </>
        ) : error ? (
          <section className="shared-chat-unavailable" role="alert">
            <LockKeyhole size={32} aria-hidden="true" />
            <h1>Không mở được cuộc trò chuyện</h1>
            <p>{error}</p>
            {validToken && (
              <Button
                variant="outline"
                onClick={() => {
                  setLoading(true);
                  setError("");
                  setRetry((value) => value + 1);
                }}
              >
                Thử lại
              </Button>
            )}
          </section>
        ) : (
          <p role="status">
            <Loader2
              className="studio-loading-spinner"
              size={20}
              aria-hidden="true"
            />{" "}
            Đang tải cuộc trò chuyện…
          </p>
        )}
        <footer className="shared-chat-footer">
          Link chỉ cho phép đọc bản được chia sẻ. Người xem không thể sửa, tiếp
          tục công việc hoặc sử dụng ngân sách của chủ hội thoại.
        </footer>
      </main>
    </div>
  );
}
