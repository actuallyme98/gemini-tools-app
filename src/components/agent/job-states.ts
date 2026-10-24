export const jobStates: Record<string, string> = {
  planning: "Đang lập kế hoạch",
  needs_input: "Cần thông tin",
  draft: "Chờ duyệt prompt",
  queued: "Trong hàng đợi",
  running: "Đang xử lý",
  review: "Chờ duyệt ảnh",
  completed: "Hoàn tất",
  partial_failed: "Lỗi một phần",
  failed: "Lỗi",
  cancelled: "Đã dừng",
};
