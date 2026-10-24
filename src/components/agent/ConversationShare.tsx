import { useEffect, useState } from "react";
import { Copy, Globe, Loader2, Share2, Unlink } from "lucide-react";
import { toast } from "sonner";
import { agentClient } from "../../services/agent.service";
import {
  sharedConversationUrl,
  type ShareStatus,
} from "../../services/conversation-sharing.service";
import { notifyApiError } from "../../utils/api-error-toast";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import "../../styles/conversation-sharing.css";

export function ConversationShare({
  conversationId,
}: {
  conversationId: string;
}) {
  const [open, setOpen] = useState(false);
  const [share, setShare] = useState<ShareStatus | null>(null);
  const [includeImages, setIncludeImages] = useState(true);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const path = `/conversations/${conversationId}/share`;

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    agentClient
      .get<{ share: ShareStatus | null }>(path, { signal: controller.signal })
      .then(({ data: { share: data } }) => {
        if (controller.signal.aborted) return;
        setShare(data);
        setIncludeImages(data?.includeImages ?? true);
        setFailed(false);
      })
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setFailed(true);
        notifyApiError(cause);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [open, path, revision]);

  const publish = async () => {
    setBusy(true);
    try {
      const { data } = await agentClient.post<ShareStatus>(path, {
        includeImages,
      });
      setShare(data);
      toast.success(
        share ? "Đã cập nhật nội dung link chia sẻ." : "Đã tạo link chia sẻ.",
      );
    } catch (cause) {
      notifyApiError(cause);
    } finally {
      setBusy(false);
    }
  };
  const revoke = async () => {
    setBusy(true);
    try {
      await agentClient.delete(path);
      setShare(null);
      toast.success("Đã thu hồi link chia sẻ.");
    } catch (cause) {
      notifyApiError(cause);
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    if (!share) return;
    try {
      await navigator.clipboard.writeText(sharedConversationUrl(share.token));
      toast.success("Đã sao chép link chia sẻ.");
    } catch {
      toast.error(
        "Chưa sao chép được. Hãy chọn và sao chép link trong ô bên dưới.",
      );
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setLoading(true);
          setFailed(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 aria-hidden="true" />
          Chia sẻ
        </Button>
      </DialogTrigger>
      <DialogContent className="conversation-share-dialog">
        <DialogHeader>
          <DialogTitle>Chia sẻ cuộc trò chuyện</DialogTitle>
          <DialogDescription>
            Tạo bản chỉ xem của toàn bộ tin nhắn và kế hoạch/prompt tại thời
            điểm chia sẻ. Tin nhắn mới không tự cập nhật vào link.
          </DialogDescription>
        </DialogHeader>
        <div className="share-access-note">
          <Globe size={20} aria-hidden="true" />
          <p>
            <strong>Bất kỳ ai có link đều có thể xem</strong>, không cần đăng
            nhập. Kiểm tra thông tin nhạy cảm trước khi tạo link. Không kèm cấu
            hình tài khoản, bộ nhớ nội bộ hoặc sổ chi phí; nội dung trong tin
            nhắn/prompt vẫn được giữ.
          </p>
        </div>
        {loading ? (
          <p role="status">
            <Loader2
              className="studio-loading-spinner"
              size={17}
              aria-hidden="true"
            />{" "}
            Đang kiểm tra link…
          </p>
        ) : failed ? (
          <Button
            variant="outline"
            onClick={() => {
              setLoading(true);
              setRevision((value) => value + 1);
            }}
          >
            Tải lại trạng thái link
          </Button>
        ) : (
          <>
            <label className="share-images-choice">
              <input
                type="checkbox"
                checked={includeImages}
                disabled={busy}
                onChange={(event) => setIncludeImages(event.target.checked)}
              />
              Bao gồm ảnh đính kèm và ảnh kết quả (bản xem trước)
            </label>
            {share && (
              <>
                <p className="share-snapshot-info">
                  Đã chia sẻ {share.messageCount} tin nhắn · cập nhật{" "}
                  {new Date(share.sharedAt).toLocaleString("vi-VN")}.{" "}
                  {share.includeImages
                    ? "Có kèm ảnh xem trước."
                    : "Không kèm ảnh."}
                </p>
                <label htmlFor="conversation-share-url">Link chia sẻ</label>
                <div className="share-link-row">
                  <input
                    id="conversation-share-url"
                    value={sharedConversationUrl(share.token)}
                    readOnly
                    onFocus={(event) => event.target.select()}
                  />
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => void copy()}
                  >
                    <Copy size={16} aria-hidden="true" />
                    Sao chép
                  </Button>
                </div>
              </>
            )}
            <div className="share-dialog-actions">
              {share && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => void revoke()}
                >
                  <Unlink size={16} aria-hidden="true" />
                  Thu hồi link
                </Button>
              )}
              <Button disabled={busy} onClick={() => void publish()}>
                {busy && (
                  <Loader2
                    className="studio-loading-spinner"
                    size={16}
                    aria-hidden="true"
                  />
                )}
                {share ? "Cập nhật nội dung" : "Tạo link chia sẻ"}
              </Button>
            </div>
            <p className="share-snapshot-info">
              Cập nhật giữ nguyên link. Thu hồi chặn lần truy cập tiếp theo;
              không xóa được nội dung người nhận đã lưu. Tạo lại sau khi thu hồi
              sẽ có link mới.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
