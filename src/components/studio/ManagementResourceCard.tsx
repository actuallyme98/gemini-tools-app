import {
  Archive,
  CheckCircle2,
  Clock3,
  FileArchive,
  Image,
  Layers3,
  Pencil,
} from "lucide-react";
import {
  studioClient,
  type StudioResource,
} from "../../services/studio.service";
import { Button } from "../ui/button";
import { StudioImage } from "./StudioImage";
import { ResourceVersions } from "./ResourceVersions";
import { SkillVersionCard } from "./SkillVersionCard";
const names = {
  product: "Sản phẩm",
  skill: "Bộ hướng dẫn",
  thumbnail: "Mẫu ảnh chính",
  scene: "Mockup Etsy",
};
const icons = {
  product: Layers3,
  skill: FileArchive,
  thumbnail: Image,
  scene: Image,
};
export function ManagementResourceCard({
  resource: item,
  teamName,
  busy,
  act,
  onEdit,
}: {
  resource: StudioResource;
  teamName: string;
  busy: boolean;
  onEdit: () => void;
  act: (work: () => Promise<unknown>) => Promise<void>;
}) {
  const Icon = icons[item.type];
  return (
    <article className="management-resource-card">
      <header>
        <span className="management-resource-kind">
          <Icon size={16} aria-hidden="true" />
          {names[item.type]}
        </span>
        <span className={`management-status status-${item.status}`}>
          {item.status === "approved" ? (
            <CheckCircle2 size={13} />
          ) : item.status === "pending" ? (
            <Clock3 size={13} />
          ) : (
            <Archive size={13} />
          )}
          {item.status === "approved"
            ? "Đã duyệt"
            : item.status === "pending"
              ? "Chờ duyệt"
              : "Đã lưu trữ"}
        </span>
      </header>
      {item.assetId && <StudioImage id={item.assetId} name={item.name} />}
      <span className="studio-eyebrow">
        {item.code} · v{item.versionNumber ?? 1}
      </span>
      <h3>{item.name}</h3>
      <p className="management-resource-team">{teamName}</p>
      {item.issues.map((issue) => (
        <p key={issue} className="studio-error">
          {issue}
        </p>
      ))}
      {item.printSpec && (
        <p className="management-print-summary">
          {item.printSpec.width} × {item.printSpec.height} px ·{" "}
          {item.printSpec.dpi} DPI ·{" "}
          {item.printSpec.background === "transparent"
            ? "Nền trong suốt"
            : "Nền trắng"}
        </p>
      )}
      <details className="management-resource-details">
        <summary>Thông tin & phiên bản</summary>
        {item.instructions && (
          <details>
            <summary>Mô tả / quy tắc</summary>
            <p className="studio-prewrap management-instructions">
              {item.instructions}
            </p>
          </details>
        )}
        {item.type !== "skill" && <ResourceVersions resource={item} />}
        {!!item.files?.length && (
          <details>
            <summary>{item.files.length} file trong bộ hướng dẫn</summary>
            <ul>
              {item.files.map((file) => (
                <li key={file.path}>{file.path}</li>
              ))}
            </ul>
          </details>
        )}
        {item.type === "skill" && (
          <SkillVersionCard
            resource={item}
            busy={busy}
            act={act}
            upgrade={onEdit}
          />
        )}
      </details>
      <div className="management-resource-actions">
        {item.type !== "skill" && (
          <Button variant="outline" disabled={busy} onClick={onEdit}>
            <Pencil size={14} />
            Chỉnh sửa bằng phiên bản mới
          </Button>
        )}
        {item.status === "pending" && (
          <Button
            disabled={
              busy ||
              !!item.issues.length ||
              (!!item.importState && item.importState !== "ready")
            }
            onClick={() =>
              void act(() =>
                studioClient.post(`/resources/${item.id}/review`, {
                  revision: item.revision,
                  status: "approved",
                }),
              )
            }
          >
            <CheckCircle2 size={14} />
            Duyệt để sử dụng
          </Button>
        )}
        {item.status === "approved" && (
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() =>
              void act(() =>
                studioClient.post(`/resources/${item.id}/review`, {
                  revision: item.revision,
                  status: "archived",
                }),
              )
            }
          >
            <Archive size={14} />
            Ngừng sử dụng
          </Button>
        )}
      </div>
    </article>
  );
}
