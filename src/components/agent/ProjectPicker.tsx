import { useWorkspaceData, type Project } from "./workspace-data";
export function ProjectPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const resource = useWorkspaceData<Project[]>("/workspace/projects");
  return (
    <label className="context-label">
      Dự án cho yêu cầu mới
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Riêng tư</option>
        {resource.data
          ?.filter((p) => !p.archived)
          .map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
      </select>
      <small>
        Kiến thức của dự án được tìm khi lập kế hoạch; công việc được chia sẻ
        với các thành viên.
      </small>
      {resource.error && (
        <small role="status">Chưa tải được danh sách dự án.</small>
      )}
    </label>
  );
}
