import "../../styles/skeleton.css";

export function StudioSkeleton({
  variant = "list",
  label = "Đang tải nội dung…",
}: {
  variant?: "list" | "dashboard" | "form" | "gallery" | "table" | "login";
  label?: string;
}) {
  return (
    <div
      className={`studio-skeleton skeleton-${variant}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">
        <div className="skeleton-heading">
          <i />
          <i />
        </div>
        {variant === "dashboard" && (
          <div className="skeleton-metrics">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i}>
                <i />
                <i />
              </div>
            ))}
          </div>
        )}
        <div className="skeleton-body">
          {Array.from(
            { length: variant === "login" ? 3 : variant === "form" ? 6 : 4 },
            (_, i) => (
              <div className="skeleton-row" key={i}>
                {["gallery", "list"].includes(variant) && (
                  <i className="skeleton-image" />
                )}
                <div>
                  <i />
                  <i />
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
