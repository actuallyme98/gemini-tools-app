import { StudioSkeleton } from "./StudioSkeleton";
import { useStudioNavigate } from "../../navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  Clock3,
  Download,
  Loader2,
  Pencil,
  Square,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { AgentUser } from "../../services/agent.service";
import {
  exportStudioImages,
  studioClient,
  studioLabels,
  type StudioBootstrap,
  type StudioDetail,
  type StudioReview,
} from "../../services/studio.service";
import { notifyApiError } from "../../utils/api-error-toast";
import { getErrorMessage } from "../../services/api.service";
import { StudioImage } from "./StudioImage";
import { CreativePlan } from "./CreativePlan";
import { ArtworkResult } from "./ArtworkResult";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";

export function IdeaDetail({
  id,
  data,
  user,
}: {
  id: string;
  data: StudioBootstrap;
  user: AgentUser;
}) {
  const studioNavigate = useStudioNavigate();
  const [detail, setDetail] = useState<StudioDetail>();
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    const load = () => {
      void studioClient
        .get<StudioDetail>(`/ideas/${id}`, controller.signal)
        .then((result) => {
          if (!controller.signal.aborted) {
            setDetail(result);
            setError("");
          }
        })
        .catch((cause) => {
          if (!controller.signal.aborted) setError(getErrorMessage(cause));
        });
    };
    load();
    const timer = setInterval(load, 5000);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [id, revision]);
  async function act(path: string, body: unknown, message: string) {
    if (busy) return;
    setBusy(true);
    try {
      await studioClient.post(path, body);
      toast.success(message);
      setRevision((value) => value + 1);
    } catch (cause) {
      notifyApiError(cause);
    } finally {
      setBusy(false);
    }
  }
  async function download() {
    if (!detail) return;
    setBusy(true);
    try {
      const reviews = detail.reviews.filter(
        (review) =>
          selected.includes(review.assetId) && review.decision === "approved",
      );
      if (reviews.length !== selected.length)
        throw new Error(
          "Chỉ xuất các ảnh đã được duyệt chất lượng. Hãy kiểm tra lại lựa chọn.",
        );
      await exportStudioImages(reviews, "png");
      toast.success("Đã chuẩn bị bộ ảnh tải xuống.");
    } catch (cause) {
      notifyApiError(cause);
    } finally {
      setBusy(false);
    }
  }
  if (error)
    return (
      <section className="studio-card studio-error" role="alert">
        <h1>Không tải được ý tưởng</h1>
        <p>{error}</p>
        <Button onClick={() => setRevision((value) => value + 1)}>
          Thử lại
        </Button>
      </section>
    );
  if (!detail)
    return <StudioSkeleton variant="gallery" label="Đang tải ý tưởng…" />;
  const { idea, slots, tickets, reviews } = detail;
  const team = data.teams.find((item) => item.id === idea.teamId);
  const leader =
    user.role === "admin" ||
    (idea.input.timing !== "night" &&
      team?.members.some(
        (member) => member.userId === user.id && member.role === "leader",
      ));
  const resourceName = (resourceId: string) =>
    data.resources.find((item) => item.id === resourceId)?.name ?? "Bản đã lưu";
  const latest = tickets[0];
  const review = (
    ticketId: string,
    assetId: string,
    decision: StudioReview["decision"],
  ) =>
    void act(
      `/tickets/${ticketId}/reviews`,
      { assetId, decision, note: "" },
      decision === "approved" ? "Đã duyệt ảnh." : "Đã đánh dấu cần sửa.",
    );
  return (
    <div>
      <button
        className="studio-back"
        onClick={() => studioNavigate("studio-ideas")}
      >
        <ArrowLeft size={16} />
        Tất cả ý tưởng
      </button>
      <header className="studio-page-heading">
        <div>
          <span className="studio-eyebrow">
            HỒ SƠ Ý TƯỞNG · PHIÊN BẢN {idea.revision}
          </span>
          <h1>{idea.input.title}</h1>
          <p>
            {data.stores.find((shop) => shop.id === idea.input.storeId)?.name} ·{" "}
            {resourceName(idea.input.productId)}
          </p>
        </div>
        <span className={`studio-status state-${idea.state}`}>
          {studioLabels[idea.state]}
        </span>
      </header>
      <div className="studio-detail-grid">
        <section className="studio-card">
          <h2>Đầu vào đã lưu</h2>
          <div className="studio-confirm-images">
            <figure>
              <StudioImage id={idea.input.sourceId} name="Ảnh ý tưởng" />
              <figcaption>Ảnh ý tưởng tham khảo</figcaption>
            </figure>
            <figure>
              {data.resources.find((item) => item.id === idea.input.thumbnailId)
                ?.assetId && (
                <StudioImage
                  id={
                    data.resources.find(
                      (item) => item.id === idea.input.thumbnailId,
                    )!.assetId!
                  }
                  name="Mẫu ảnh chính"
                />
              )}
              <figcaption>Mẫu ảnh chính</figcaption>
            </figure>
          </div>
          <p className="studio-prewrap">{idea.input.brief}</p>
          <dl className="studio-summary">
            <div>
              <dt>Bộ hướng dẫn</dt>
              <dd>{resourceName(idea.input.skillId)}</dd>
            </div>
            <div>
              <dt>Số mẫu</dt>
              <dd>{idea.input.count} ảnh riêng biệt</dd>
            </div>
            <div>
              <dt>Model đã chọn</dt>
              <dd>{idea.input.imageModel}</dd>
            </div>
          </dl>
          {idea.owner === user.id && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => studioNavigate("studio-new", idea.id)}
            >
              <Pencil size={16} />
              Chỉnh sửa & tạo bản duyệt mới
            </Button>
          )}
        </section>
        <section className="studio-card">
          <h2>Bước tiếp theo</h2>
          {idea.reviewNote && (
            <p className="studio-note">Leader yêu cầu: {idea.reviewNote}</p>
          )}
          {["draft", "changes_requested"].includes(idea.state) &&
            idea.owner === user.id && (
              <>
                <p>Kiểm tra nội dung rồi gửi Leader duyệt trước khi chạy.</p>
                <Button
                  disabled={busy}
                  onClick={() =>
                    void act(
                      `/ideas/${idea.id}/submit`,
                      { revision: idea.revision },
                      "Đã gửi duyệt.",
                    )
                  }
                >
                  Gửi Leader duyệt
                </Button>
              </>
            )}
          {idea.state === "pending" &&
            (leader ? (
              <>
                <p>
                  Duyệt sẽ chốt ảnh, bộ hướng dẫn, model và số kết quả cho lượt
                  chạy này.
                </p>
                <label htmlFor="studio-review-note">
                  Ghi chú / nội dung cần bổ sung
                  <textarea
                    id="studio-review-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={3}
                    maxLength={2000}
                  />
                </label>
                <div className="studio-action-row">
                  <Button
                    disabled={busy}
                    onClick={() =>
                      void act(
                        `/ideas/${idea.id}/review`,
                        {
                          revision: idea.revision,
                          decision: "approved",
                          note: "",
                        },
                        "Đã duyệt. Lượt chạy được lưu trên máy chủ.",
                      )
                    }
                  >
                    <Check size={17} />
                    {idea.input.timing === "night"
                      ? `Duyệt để chạy lúc ${data.schedule?.dailyTime ?? "22:00"}`
                      : "Duyệt & chạy"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy || !note.trim()}
                    onClick={() =>
                      void act(
                        `/ideas/${idea.id}/review`,
                        {
                          revision: idea.revision,
                          decision: "changes_requested",
                          note,
                        },
                        "Đã gửi yêu cầu bổ sung.",
                      )
                    }
                  >
                    Yêu cầu bổ sung
                  </Button>
                </div>
              </>
            ) : (
              <p>Đã gửi Leader. Bạn có thể đóng trang và quay lại sau.</p>
            ))}
          {latest && (
            <>
              <div className={`studio-status state-${latest.state}`}>
                <Clock3 size={16} aria-hidden="true" />
                {studioLabels[latest.state] ?? latest.state}
              </div>
              <p>
                {latest.state === "scheduled"
                  ? `Thời điểm bắt đầu: ${new Date(latest.dueAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} · UTC+7. Đây không phải giờ hoàn thành.`
                  : "Mỗi kết quả xuất hiện độc lập khi xử lý xong."}
              </p>
              <progress
                max={latest.snapshot.input.count}
                value={
                  slots.filter(
                    (slot) =>
                      slot.ticketId === latest.id && slot.state === "done",
                  ).length
                }
                aria-label="Số ảnh đã hoàn thành"
              />
              <p>
                {
                  slots.filter(
                    (slot) =>
                      slot.ticketId === latest.id && slot.state === "done",
                  ).length
                }
                /{latest.snapshot.input.count} ảnh đã có · bản ý tưởng{" "}
                {latest.ideaRevision}
              </p>
              {latest.error && (
                <p className="studio-error" role="alert">
                  {latest.error}
                </p>
              )}
              {latest.state === "sample_review" &&
                (idea.owner === user.id || leader) && (
                  <>
                    <p className="studio-note">
                      Đã hoàn tất nhóm mẫu thử. Tạo phần còn lại có thể phát
                      sinh thêm phí AI; các ảnh và brief đã có sẽ được giữ
                      nguyên.
                    </p>
                    <Button
                      disabled={busy}
                      onClick={() =>
                        void act(
                          `/tickets/${latest.id}/continue`,
                          {},
                          "Đã tiếp nhận phần còn lại. Không tạo lại mẫu đã hoàn tất.",
                        )
                      }
                    >
                      Tạo thêm{" "}
                      {latest.snapshot.input.count -
                        (latest.dispatchCount ??
                          latest.snapshot.input.count)}{" "}
                      mẫu còn lại
                    </Button>
                  </>
                )}
              {["scheduled", "queued", "running"].includes(latest.state) &&
                (idea.owner === user.id || leader) && (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void act(
                        `/tickets/${latest.id}/cancel`,
                        {},
                        "Đã gửi lệnh dừng. Request đã tới AI có thể vẫn bị tính phí.",
                      )
                    }
                  >
                    <Square size={15} />
                    Dừng phần chưa gửi
                  </Button>
                )}
              {latest.state === "missed" && user.role === "admin" && (
                <Button
                  disabled={busy}
                  onClick={() =>
                    void act(
                      `/tickets/${latest.id}/catch-up`,
                      {},
                      "Đã đưa lô lỡ lịch vào hàng đợi.",
                    )
                  }
                >
                  Chạy bù lô này
                </Button>
              )}
              <small className="studio-muted">
                Lượt chạy giữ nguyên đầu vào đã được duyệt. Sửa ý tưởng không
                làm thay đổi request đang chạy.
              </small>
            </>
          )}
          {busy && (
            <p role="status">
              <Loader2 className="animate-spin" size={16} />
              Đang xử lý…
            </p>
          )}
        </section>
      </div>
      {latest && (
        <CreativePlan ticketId={latest.id} steps={detail.plans ?? []} />
      )}
      <section className="studio-gallery-section">
        <header className="studio-page-heading">
          <div>
            <h2>Bộ thiết kế</h2>
            <p>
              Kiểm tra nội dung, chữ, tỉ lệ và watermark trước khi duyệt từng
              ảnh.
            </p>
          </div>
          {selected.length > 0 && (
            <div className="studio-action-row">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  try {
                    const sources = selected.map((id) => {
                      const sourceSlot = slots.find((s) => s.resultId === id);
                      const artwork = detail.artworks?.find(
                        (s) =>
                          s.ticketId === sourceSlot?.ticketId &&
                          s.index === sourceSlot?.index,
                      );
                      if (!artwork) return id;
                      if (
                        !artwork.resultId ||
                        !reviews.some(
                          (r) =>
                            r.assetId === artwork.resultId &&
                            r.decision === "approved",
                        )
                      )
                        throw new Error(
                          "Hãy kiểm tra và duyệt artwork gốc trước khi dùng để tạo mockup.",
                        );
                      return artwork.resultId;
                    });
                    studioNavigate(
                      `studio-mockups?from=${encodeURIComponent(idea.id)}&selected=${sources.join(",")}`,
                    );
                  } catch (cause) {
                    notifyApiError(cause);
                  }
                }}
              >
                Tạo mockup từ {selected.length} thiết kế
              </Button>
              <Button disabled={busy} onClick={() => void download()}>
                <Download size={16} />
                Tải {selected.length} ảnh đã duyệt
              </Button>
            </div>
          )}
        </header>
        {slots.length === 0 ? (
          <div className="studio-empty studio-card">
            <Clock3 size={30} aria-hidden="true" />
            <h3>Ảnh sẽ xuất hiện tại đây</h3>
            <p>Lượt chạy bắt đầu sau khi được duyệt. Không cần giữ tab mở.</p>
          </div>
        ) : (
          <div className="studio-gallery">
            {slots.map((slot) => {
              const artwork = detail.artworks?.find(
                (s) => s.ticketId === slot.ticketId && s.index === slot.index,
              );
              const checked = reviews.find(
                (item) => item.assetId === slot.resultId,
              );
              return (
                <article className="studio-card studio-result" key={slot.id}>
                  {artwork && (
                    <ArtworkResult
                      slot={artwork}
                      review={reviews.find(
                        (r) => r.assetId === artwork.resultId,
                      )}
                      busy={busy}
                      onReview={(decision) =>
                        review(artwork.ticketId, artwork.resultId!, decision)
                      }
                      onDownload={() =>
                        void (async () => {
                          setBusy(true);
                          try {
                            await exportStudioImages(
                              [
                                {
                                  assetId: artwork.resultId!,
                                  ticketId: artwork.ticketId,
                                },
                              ],
                              "png",
                            );
                          } catch (cause) {
                            notifyApiError(cause);
                          } finally {
                            setBusy(false);
                          }
                        })()
                      }
                    />
                  )}
                  {slot.resultId ? (
                    <>
                      <Dialog>
                        <DialogTrigger asChild>
                          <button
                            className="studio-image-open"
                            aria-label={`Xem ảnh ${slot.index + 1}`}
                          >
                            <StudioImage
                              id={slot.resultId}
                              name={`Mẫu ${slot.index + 1}`}
                            />
                          </button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogTitle>Mẫu {slot.index + 1}</DialogTitle>
                          <DialogDescription>
                            Kiểm tra ảnh trước khi dùng cho sản xuất hoặc đăng
                            bán.
                          </DialogDescription>
                          <StudioImage
                            id={slot.resultId}
                            name={`Mẫu ${slot.index + 1}`}
                          />
                        </DialogContent>
                      </Dialog>
                      <div className="studio-result-body">
                        <strong>Mẫu {slot.index + 1}</strong>
                        <span
                          className={`studio-status state-${checked?.decision ?? "review"}`}
                        >
                          {checked
                            ? studioLabels[checked.decision]
                            : "Chờ kiểm tra"}
                        </span>
                        <div className="studio-action-row">
                          <Button
                            size="sm"
                            variant={
                              checked?.decision === "approved"
                                ? "default"
                                : "outline"
                            }
                            disabled={busy}
                            onClick={() =>
                              review(slot.ticketId, slot.resultId!, "approved")
                            }
                          >
                            <Check size={15} />
                            Đạt
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() =>
                              review(
                                slot.ticketId,
                                slot.resultId!,
                                "changes_requested",
                              )
                            }
                          >
                            <X size={15} />
                            Cần sửa
                          </Button>
                        </div>
                        {checked?.decision === "approved" && (
                          <label className="studio-check">
                            <input
                              type="checkbox"
                              checked={selected.includes(slot.resultId!)}
                              onChange={(event) =>
                                setSelected((current) =>
                                  event.target.checked
                                    ? [...current, slot.resultId!]
                                    : current.filter(
                                        (value) => value !== slot.resultId,
                                      ),
                                )
                              }
                            />
                            Chọn để tải xuống
                          </label>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="studio-pending-image">
                      <Loader2
                        className={
                          ["submitted", "preparing"].includes(slot.state)
                            ? "animate-spin"
                            : ""
                        }
                        size={25}
                      />
                      <strong>Mẫu {slot.index + 1}</strong>
                      <span>{studioLabels[slot.state]}</span>
                      {slot.error && <p role="alert">{slot.error}</p>}
                    </div>
                  )}
                  {user.role === "admin" && (
                    <details className="studio-prompt-details">
                      <summary>Prompt và mã request</summary>
                      <code>{slot.requestId}</code>
                      <p className="studio-prewrap">{slot.prompt}</p>
                    </details>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
