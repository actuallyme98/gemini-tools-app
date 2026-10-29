import { useState } from "react";
import { Download, History, Upload, Check, Loader2 } from "lucide-react";
import { agentClient } from "../../services/agent.service";
import {
  studioClient,
  type StudioResource,
} from "../../services/studio.service";
import { saveBlob } from "../../utils/download.util";
import { notifyApiError } from "../../utils/api-error-toast";
import { StudioImage } from "./StudioImage";
import { Button } from "../ui/button";

export function SkillVersionCard({
  resource,
  busy,
  act,
  upgrade,
}: {
  resource: StudioResource;
  busy: boolean;
  act: (work: () => Promise<unknown>) => Promise<void>;
  upgrade: (resource: StudioResource) => void;
}) {
  const [versions, setVersions] = useState<StudioResource[]>();
  const [loading, setLoading] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  async function history() {
    setLoading(true);
    try {
      setVersions(
        await studioClient.get<StudioResource[]>(
          `/skills/${resource.id}/versions`,
        ),
      );
    } catch (error) {
      notifyApiError(error);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="studio-skill-version">
      <p>
        <strong>Phiên bản {resource.versionNumber ?? 1}</strong>
        {resource.declaredVersion
          ? ` · Khai báo: ${resource.declaredVersion}`
          : ""}
      </p>
      {resource.importState && resource.importState !== "ready" && (
        <p className="studio-error" role="alert">
          {resource.importState === "preparing"
            ? "Đang lưu tài nguyên; chưa thể duyệt."
            : "Nhập ZIP chưa hoàn tất. Cần tải lại thành phiên bản mới."}
        </p>
      )}
      <div className="studio-action-row">
        <Button
          variant="outline"
          size="sm"
          disabled={busy || loading}
          onClick={() => upgrade(resource)}
        >
          <Upload size={15} />
          Nâng phiên bản
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={busy || loading}
          onClick={() => void history()}
        >
          {loading ? (
            <Loader2 className="animate-spin" size={15} />
          ) : (
            <History size={15} />
          )}
          Lịch sử
        </Button>
        {resource.bundleId && resource.importState === "ready" && (
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() =>
              void act(async () => {
                const result = await agentClient.get<Blob>(
                  `/studio/skills/${resource.id}/bundle`,
                  { responseType: "blob" },
                );
                saveBlob(
                  result.data,
                  `${resource.code}_v${resource.versionNumber ?? 1}.zip`,
                );
              })
            }
          >
            <Download size={15} />
            ZIP gốc
          </Button>
        )}
      </div>
      {versions && (
        <ul
          className="studio-version-history"
          aria-label={`Lịch sử ${resource.code}`}
        >
          {versions.map((version) => (
            <li key={version.id}>
              v{version.versionNumber ?? 1} ·{" "}
              {version.declaredVersion ?? version.name} ·{" "}
              {version.status === "approved"
                ? "Đã duyệt"
                : version.status === "pending"
                  ? "Chờ kiểm tra"
                  : "Ngừng sử dụng"}
              {version.id === resource.id && " (đang xem)"}
            </li>
          ))}
        </ul>
      )}
      {!!resource.warnings?.length && (
        <details>
          <summary>{resource.warnings.length} lưu ý tương thích</summary>
          {resource.warnings.map((warning) => (
            <p key={warning} className="studio-note">
              {warning}
            </p>
          ))}
        </details>
      )}
      {!!resource.contextImages?.length && (
        <details
          onToggle={(event) => setShowExamples(event.currentTarget.open)}
        >
          <summary>
            Ảnh ví dụ làm ngữ cảnh ({resource.selectedContextPaths?.length ?? 0}
            /4)
          </summary>
          <p>
            Chọn tối đa 4 ảnh để Agent đọc cùng ảnh nguồn và ảnh mẫu. Thay đổi
            chỉ thực hiện trước khi duyệt phiên bản.
          </p>
          <div className="studio-skill-examples">
            {showExamples &&
              resource.contextImages.map((image) => {
                const selected =
                  resource.selectedContextPaths?.includes(image.path) ?? false;
                return (
                  <div key={image.path}>
                    <StudioImage
                      id={image.id}
                      name={image.path.split("/").at(-1) ?? "Ảnh ví dụ"}
                    />
                    <label className="studio-check">
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={
                          busy ||
                          resource.status !== "pending" ||
                          resource.importState !== "ready" ||
                          (!selected &&
                            (resource.selectedContextPaths?.length ?? 0) >= 4)
                        }
                        onChange={() =>
                          void act(() =>
                            studioClient.post(
                              `/skills/${resource.id}/context`,
                              {
                                revision: resource.revision,
                                paths: selected
                                  ? resource.selectedContextPaths!.filter(
                                      (path) => path !== image.path,
                                    )
                                  : [
                                      ...(resource.selectedContextPaths ?? []),
                                      image.path,
                                    ],
                              },
                            ),
                          )
                        }
                      />
                      {selected && <Check size={13} aria-hidden="true" />}
                      {image.path.split("/").at(-1)}
                    </label>
                  </div>
                );
              })}
          </div>
        </details>
      )}
      <small>
        ZIP và các ảnh đã dùng giữ nguyên theo phiên bản; nâng phiên bản không
        thay đổi job cũ.
      </small>
    </div>
  );
}
