import { useState } from "react";
import { agentClient } from "../../services/agent.service";
import { notifyApiError } from "../../utils/api-error-toast";
import { Button } from "../ui/button";
type Catalog = {
  source: string;
  checkedAt: string;
  version: string;
  warning: string;
  rows: {
    group: string;
    model: string;
    quotaType: number;
    input?: number;
    output?: number;
    price?: number;
  }[];
};
export function PricingCatalog() {
  const [data, setData] = useState<Catalog>();
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("");
  const [readiness, setReadiness] = useState<{
    configured: number;
    ready: boolean;
    message: string;
    unpriced: { provider: string; model: string; operation: string }[];
  }>();
  const rows =
    data?.rows.filter(
      (r) =>
        (!group || r.group === group) &&
        r.model.toLowerCase().includes(query.toLowerCase()),
    ) ?? [];
  return (
    <details className="budget-price-rule">
      <summary>Tra cứu bảng giá công khai của Provider 1</summary>
      <p>
        Giá tham khảo theo nhóm; bạn cần xác minh nhóm của API key và đơn vị
        tính trước khi điền quy tắc theo đơn vị chính sách bên dưới. Tra cứu
        không thay đổi chính sách đang áp dụng.
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void agentClient
            .get<Catalog>("/admin/pricing-catalog")
            .then((r) => setData(r.data))
            .catch(notifyApiError)
            .finally(() => setBusy(false));
        }}
      >
        {busy ? "Đang tải…" : "Lấy bảng giá mới nhất"}
      </Button>
      {data && (
        <>
          <p>{data.warning}</p>
          <p>
            Nguồn:{" "}
            <a href={data.source} target="_blank" rel="noreferrer">
              Bảng giá provider
            </a>{" "}
            · {new Date(data.checkedAt).toLocaleString("vi-VN")} · phiên bản{" "}
            {data.version}
          </p>
          <label>
            Nhóm giá
            <select value={group} onChange={(e) => setGroup(e.target.value)}>
              <option value="">Tất cả nhóm</option>
              {[...new Set(data.rows.map((r) => r.group))].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>
          <label>
            Tìm model
            <input value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <p>
            {rows.length} dòng. Hiển thị tối đa 100, dùng bộ lọc để tìm chính
            xác.
          </p>
          <div style={{ overflowX: "auto" }}>
            <table>
              <caption>Đơn vị giữ nguyên như provider công bố</caption>
              <thead>
                <tr>
                  <th>Nhóm</th>
                  <th>Model</th>
                  <th>Loại tính</th>
                  <th>Input</th>
                  <th>Output</th>
                  <th>Giá / lượt</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map((r) => (
                  <tr key={`${r.group}:${r.model}`}>
                    <td>{r.group}</td>
                    <td>{r.model}</td>
                    <td>{r.quotaType === 1 ? "Cố định" : "Token"}</td>
                    <td>{r.input ?? "—"}</td>
                    <td>{r.output ?? "—"}</td>
                    <td>{r.price ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void agentClient
            .get<NonNullable<typeof readiness>>("/admin/pricing-readiness")
            .then((response) => setReadiness(response.data))
            .catch(notifyApiError)
            .finally(() => setBusy(false));
        }}
      >
        Kiểm tra cấu hình giá đang áp dụng
      </Button>
      {readiness && (
        <div role="status">
          <p>
            {readiness.configured} quy tắc giá. {readiness.message}
          </p>
          {readiness.unpriced.map((rule) => (
            <p key={`${rule.provider}:${rule.model}:${rule.operation}`}>
              {rule.model} · {rule.operation}: chưa đủ giá để tự chốt chi phí.
            </p>
          ))}
          <p>
            Đây là kiểm tra quy tắc nội bộ, chưa xác nhận giá bằng hóa đơn hay
            kiểm thử AI thật.
          </p>
        </div>
      )}
    </details>
  );
}
