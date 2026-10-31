import type { ReactNode } from "react";
import { Info } from "lucide-react";
export function StudioNotice({
  id,
  children,
  actions,
}: {
  id?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div id={id} className="studio-context-notice">
      <Info size={17} aria-hidden="true" />
      <div>
        <p>{children}</p>
        {actions && <div className="studio-context-actions">{actions}</div>}
      </div>
    </div>
  );
}
