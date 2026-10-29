> Current URL, loading, select and schedule access details: [routing-and-controls.md](docs/routing-and-controls.md). Hash examples below are retained compatibility links and redirect to the corresponding paths. Automatic scheduling is now admin-only.

# LCG Creative Studio

Không gian sản xuất sáng tạo cho công ty: chuẩn bị và duyệt ý tưởng, Agent chạy nền, kiểm tra artwork/thumbnail, tạo mockup hàng loạt và xuất thành phẩm.

## Chạy local

```sh
npm ci
cp .env.example .env
npm run dev
```

API mặc định tại `http://localhost:5177`. Bật `AGENT_ENABLED` và `STUDIO_ENABLED` trong API, cấu hình MongoDB/Redis và đăng nhập bằng tài khoản được cấp. Các domain email được phép đăng nhập Google được quản lý phía API/trang quản trị; không đưa API key lên frontend.

## Màn hình

- `/#studio`: tổng quan bằng dữ liệu thật.
- `/#studio-ideas`, `/#studio-new`: Idea Board và form bốn bước.
- `/#studio-gallery`: chọn ý tưởng, xem và duyệt thiết kế.
- `/#studio-mockups`: chọn nguồn, bối cảnh/màu, gửi bộ mockup và theo dõi kết quả.
- `/#studio-outputs`: thành phẩm được duyệt, tải PNG/JPG/ZIP.
- `/#studio-manage`: Team, Store, sản phẩm, ZIP skill, thumbnail, bối cảnh, ngân sách Team và lịch chạy.
- `/#admin*`: tài khoản, hạn mức tuần, audit/request logs và cấu hình công ty; dùng chung layout Studio.
- `/#studio-guide`: hướng dẫn quy trình.

Chat Agent và các công cụ cũ đã được gỡ khỏi frontend. Các link cũ chuyển tới Studio; dữ liệu và API cũ không bị xóa.

## Kiểm tra và triển khai

```sh
npm run lint
npm run build
npm run test:e2e
```

Playwright dùng API giả lập, không gọi AI tính phí. CI kiểm tra và đóng gói Docker; quy trình triển khai ở [docs/deployment.md](docs/deployment.md). Lịch tự động là cấu hình độc lập phía server, không tự bật khi build frontend.

Chi tiết: [Studio V1](docs/studio-v1.md), [UI refactor](docs/studio-redesign.md).
