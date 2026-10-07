# Gemini Tools App

CI/CD và deploy lên server EziHubb: [hướng dẫn production](docs/deployment.md).

Frontend React + TypeScript cho Gemini Tools API. Các luồng hiện có: mockup, ý tưởng sản phẩm và chỉnh ảnh từ reference. Chọn provider AI tại sidebar; lựa chọn được lưu trên trình duyệt và gửi qua trường provider cho yêu cầu tiếp theo. Danh sách và khả năng được lấy từ GET /api/ai/providers. Provider chưa cấu hình bị khóa. Mọi bước AI trong request dùng provider được chọn; tác vụ chưa hỗ trợ/cấu hình báo lỗi trước khi chạy AI, không tự chuyển provider. Giao diện ghi rõ tác vụ nào chưa khả dụng. Lựa chọn đã lưu cũng được giữ khi tải danh sách thất bại hoặc provider không khả dụng. Gemini là lựa chọn mặc định; client luôn gửi provider cụ thể. VyceAI tạm ngưng trong dropdown. Lựa chọn VyceAI hoặc mặc định hệ thống đã lưu trước đây được chuyển sang Gemini. Khóa AI và model vẫn được cấu hình ở backend.

## Background Studio

Tab **Background Studio** (`/#background-studio`) nhận một ảnh sản phẩm gốc và tối đa 10 background tham chiếu. Chọn/bỏ chọn background, chọn 1–3 ảnh cho mỗi background (tối đa 20 kết quả một bộ), thêm ghi chú ánh sáng/vị trí rồi tạo cả bộ. Model giữ thiết kế sản phẩm và tái tạo môi trường từ ảnh tham chiếu; cần kiểm tra chi tiết sản phẩm trong kết quả vì đây là xử lý bằng AI.

Mỗi cặp ảnh được gửi tuần tự qua `POST /api/backgrounds/replace` với `productImage`, `backgroundImage`, `provider`, `variationIndex` và `instructions`. Provider được giữ cố định cho cả lần tạo; ảnh thành công hiện ngay và được giữ khi ảnh khác lỗi. Có thể dừng, thử lại một ảnh hoặc tiếp tục phần chưa xong bằng provider hiện tại. Lỗi thanh toán/xác thực/quota/cấu hình hoặc R2 sẽ tạm dừng phần còn lại. API retry upload riêng để không tạo lại ảnh trong cùng request khi R2 lỗi.

Xem ảnh mở so sánh sản phẩm–background–kết quả. Tải riêng hoặc ZIP toàn bộ ảnh đã xong, tên file theo background/biến thể và giữ đuôi PNG/JPEG/WebP thực tế. Reload trang xóa file/kết quả đang có; chuyển tab vẫn giữ dữ liệu. Dừng không bảo đảm provider ngừng xử lý request đã gửi.

## Chạy local

Dùng Node 22.12+ hoặc Node 20.19+.

```powershell
npm.cmd ci
Copy-Item .env.example .env.local
npm.cmd run dev
```

Frontend mặc định chạy tại http://localhost:5173, proxy /api tới http://localhost:5177. Khởi động API ở thư mục gemini-tools-api và điền credential của backend. VITE_API_PROXY_TARGET được đọc từ .env.local hoặc môi trường của tiến trình.

## Kiểm tra

```powershell
npm.cmd run build
npm.cmd run lint
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

Playwright tự mở Vite tại cổng 5183 và dùng API giả lập, không gọi provider AI hay R2. Test bao gồm menu mobile/deep link, hủy phân tích cũ, giới hạn upload, số ảnh đầu ra, tải ZIP thiếu ảnh, giữ trạng thái và dashboard. Background Studio kiểm tra gửi đúng từng cặp ảnh, chọn background/biến thể, giữ provider trong hàng đợi, dừng/tiếp tục, retry phần chưa xong, lỗi provider/R2 và tên file ZIP.

## Production

Dockerfile build bằng Node 22 và phục vụ file tĩnh bằng Nginx trên cổng 80.
API_UPSTREAM mặc định api:5177; đổi biến này nếu backend dùng địa chỉ khác. Nginx chuyển tiếp /api, hỗ trợ request tạo ảnh dài và upload nhiều ảnh.

Có thể chạy cả hai dự án bằng compose.yaml trong thư mục API:

```powershell
docker compose up --build
```

Truy cập http://localhost:5173. Nếu dùng hai host riêng, cấu hình VITE_API_BASE_URL thành origin của API (không thêm /api) trước khi build; Docker hỗ trợ build arg cùng tên.

Ảnh đầu ra nằm trên R2. Để tải ảnh/ZIP trong trình duyệt, cấu hình bucket/public domain cho phép CORS GET từ origin frontend. Lỗi tải ảnh sẽ hiển thị; ZIP báo chính xác số ảnh tải thành công.

Giới hạn: ảnh PNG/JPEG/WebP tối đa 10MB; 10 ảnh reference; 12 prompt tự động/ý tưởng; 20 prompt thủ công; 1–10 biến thể reference. Số lượng ý tưởng được gửi riêng qua trường count. Mỗi biến thể reference cần một lần tạo ảnh AI.

Điều hướng dùng URL hash, hỗ trợ Back/Forward. Chuyển giữa công cụ giữ nguyên dữ liệu đang làm; reload trang sẽ xóa các file upload và kết quả trong bộ nhớ. Dashboard lưu tối đa 500 hoạt động thành công trên trình duyệt này, không có lịch sử dùng chung giữa thiết bị.

Hủy yêu cầu ngăn phản hồi cũ cập nhật giao diện. Backend dừng các bước còn lại khi client ngắt kết nối; lời gọi đã đến provider có thể vẫn được xử lý.

## API errors

Failed requests display the API's message, sanitized provider reason, recovery suggestion, and request ID. Error notifications remain visible for 15 seconds with a dismiss button. Provider catalog failures show their error beside the selector. HTTP failures with non-JSON bodies (such as proxy 502 pages) are distinguished from network failures; validation message arrays remain readable.
