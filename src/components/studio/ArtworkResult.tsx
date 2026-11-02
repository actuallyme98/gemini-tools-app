import { StudioImage } from "./StudioImage";
import { Button } from "../ui/button";
import {
  studioLabels,
  type StudioSlot,
  type StudioReview,
} from "../../services/studio.service";
export function ArtworkResult({
  slot,
  review,
  busy,
  onReview,
  onDownload,
}: {
  slot: StudioSlot;
  review?: StudioReview;
  busy: boolean;
  onReview: (decision: "approved" | "changes_requested") => void;
  onDownload: () => void;
}) {
  return (
    <section className="studio-artwork-result">
      <h4>Artwork gốc · Mẫu {slot.index + 1}</h4>
      {slot.resultId ? (
        <StudioImage
          id={slot.resultId}
          name={`Artwork gốc mẫu ${slot.index + 1}`}
        />
      ) : (
        <p>{studioLabels[slot.state]}</p>
      )}
      {slot.error && (
        <p className="studio-error" role="alert">
          {slot.error}
        </p>
      )}
      {slot.resultId && (
        <>
          <p>
            {review
              ? studioLabels[review.decision]
              : "Cần kiểm tra riêng chữ, kích thước, nền và watermark."}
          </p>
          <p className="studio-muted">
            Chỉ duyệt thiết kế in phẳng: đúng chữ và motif, không có hình sản
            phẩm, đường may, bóng đổ hoặc lề trắng ngoài thiết kế. Kiểm tra
            riêng kích thước, nền và watermark; pixel/DPI đúng chưa đảm bảo
            chất lượng in.
          </p>
          <div className="studio-action-row">
            <Button
              size="sm"
              variant={review?.decision === "approved" ? "default" : "outline"}
              disabled={busy}
              onClick={() => onReview("approved")}
            >
              Duyệt artwork
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onReview("changes_requested")}
            >
              Artwork cần sửa
            </Button>
            {review?.decision === "approved" && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={onDownload}
              >
                Tải artwork PNG
              </Button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
