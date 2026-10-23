import type { Asset } from "../../services/agent.service";
import { AgentImage } from "./AgentImage";
import { Button } from "../ui/button";

export function SelectedImages({
  ids,
  assets,
  role,
  disabled,
  onReplace,
  onRemove,
}: {
  ids: string[];
  assets: Asset[];
  role: string;
  disabled: boolean;
  onReplace: (files: FileList | null, id: string) => void;
  onRemove: (id: string) => void;
}) {
  if (!ids.length) return null;
  return (
    <ul className="context-selected-images" aria-label={`Ảnh ${role} đã chọn`}>
      {ids.map((id) => {
        const asset = assets.find((asset) => asset.id === id);
        const name = asset?.name ?? id;
        return (
          <li key={id}>
            <AgentImage id={id} name={`Xem trước ${role}: ${name}`} />
            <div>
              <p title={name}>{name}</p>
              <div className="selected-image-actions">
                <label
                  className={`replace-selected-image${disabled ? " is-disabled" : ""}`}
                >
                  Đổi ảnh
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    aria-label={`Đổi ảnh ${role} ${name}`}
                    disabled={disabled}
                    onChange={(event) => {
                      onReplace(event.target.files, id);
                      event.target.value = "";
                    }}
                  />
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  aria-label={`Bỏ ảnh ${role} ${name}`}
                  onClick={() => onRemove(id)}
                >
                  Bỏ chọn
                </Button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
