import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { agentClient } from "../../services/agent.service";
import { getErrorMessage } from "../../services/api.service";
import { Button } from "../ui/button";

type GoogleIdentity = {
  initialize: (options: {
    client_id: string;
    nonce: string;
    callback: (response: { credential: string }) => void;
    auto_select: boolean;
    ux_mode: "popup";
  }) => void;
  renderButton: (
    element: HTMLElement,
    options: {
      type: "standard";
      theme: "outline";
      size: "large";
      text: "continue_with";
      width: number;
      locale: string;
    },
  ) => void;
};
const identity = () =>
  (
    window as Window & {
      google?: { accounts: { id: GoogleIdentity } };
    }
  ).google?.accounts.id;
let loader: Promise<GoogleIdentity> | undefined;
function loadIdentity() {
  const ready = identity();
  if (ready) return Promise.resolve(ready);
  if (!loader)
    loader = new Promise<GoogleIdentity>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      const fail = () => {
        clearTimeout(timer);
        script.remove();
        loader = undefined;
        reject(
          new Error(
            "Không tải được đăng nhập Google. Kiểm tra kết nối và thử lại.",
          ),
        );
      };
      const timer = window.setTimeout(fail, 15000);
      script.onerror = fail;
      script.onload = () => {
        clearTimeout(timer);
        const api = identity();
        if (api) resolve(api);
        else fail();
      };
      document.head.appendChild(script);
    });
  return loader;
}

export function GoogleSignIn({
  clientId,
  allowedDomains,
  busy,
  onCredential,
}: {
  clientId: string;
  allowedDomains: string[];
  busy: boolean;
  onCredential: (credential: string, nonce: string) => Promise<void>;
}) {
  const container = useRef<HTMLDivElement>(null);
  const handler = useRef(onCredential);
  const pending = useRef(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    handler.current = onCredential;
  }, [onCredential]);
  useEffect(() => {
    const controller = new AbortController();
    const element = container.current!;
    let expiry: ReturnType<typeof setTimeout>;
    void Promise.all([
      loadIdentity(),
      agentClient.post<{ nonce: string; expiresAt: number }>(
        "/auth/google/challenge",
        {},
        { signal: controller.signal },
      ),
    ])
      .then(([api, response]) => {
        if (controller.signal.aborted) return;
        const { nonce, expiresAt } = response.data;
        api.initialize({
          client_id: clientId,
          nonce,
          auto_select: false,
          ux_mode: "popup",
          callback: ({ credential }) => {
            if (controller.signal.aborted || pending.current) return;
            pending.current = true;
            setError("");
            void handler
              .current(credential, nonce)
              .catch((cause) => {
                if (!controller.signal.aborted) {
                  setReady(false);
                  element.replaceChildren();
                  setError(getErrorMessage(cause));
                }
              })
              .finally(() => {
                pending.current = false;
              });
          },
        });
        api.renderButton(element, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          width: Math.min(400, element.clientWidth || 280),
          locale: "vi",
        });
        setReady(true);
        expiry = setTimeout(
          () => {
            if (!pending.current) {
              setReady(false);
              element.replaceChildren();
              setError("Lượt đăng nhập Google đã hết hạn. Vui lòng thử lại.");
            }
          },
          Math.max(0, expiresAt - Date.now()),
        );
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(getErrorMessage(cause));
      });
    return () => {
      controller.abort();
      clearTimeout(expiry);
      element.replaceChildren();
    };
  }, [clientId, retry]);
  return (
    <section aria-label="Đăng nhập Google" className="mb-6 grid min-w-0 gap-3">
      <div
        ref={container}
        inert={busy}
        aria-busy={busy}
        className="min-h-11 max-w-full overflow-hidden"
      />
      {(!ready || busy) && !error && (
        <p role="status" className="flex items-center gap-2 text-sm">
          <Loader2
            size={16}
            className="studio-loading-spinner"
            aria-hidden="true"
          />
          {busy ? "Đang đăng nhập…" : "Đang tải đăng nhập Google…"}
        </p>
      )}
      {error && (
        <div className="grid gap-2">
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              setError("");
              setReady(false);
              setRetry((value) => value + 1);
            }}
          >
            Thử lại Google
          </Button>
        </div>
      )}
      <p className="text-sm text-slate-600 [overflow-wrap:anywhere]">
        Dùng email thuộc:{" "}
        {allowedDomains.map((domain) => `@${domain}`).join(", ")}.
      </p>
      <p className="text-center text-sm text-slate-500">
        hoặc đăng nhập bằng mật khẩu
      </p>
    </section>
  );
}
