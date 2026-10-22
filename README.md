# Gemini Tools App

CI/CD và deploy lên server EziHubb: [hướng dẫn production](docs/deployment.md).

Frontend React + TypeScript cho Gemini Tools API: mockup, ý tưởng, chỉnh ảnh từ reference và áp hình in vào ảnh tham chiếu hàng loạt. Sidebar mặc định chọn Provider 1 (ShopAIKey), lưu lựa chọn trên trình duyệt và lấy khả năng từ GET /api/ai/providers. Gemini bị ẩn khỏi danh sách chọn; lựa chọn Gemini/VyceAI/mặc định hệ thống cũ được chuyển sang Provider 1. Provider chưa cấu hình bị khóa. Ảnh luôn dùng provider/model được chọn, không tự fallback. Text có định tuyến riêng VyceAI ưu tiên, ShopAIKey dự phòng khi bật AI_AUTO_TEXT_ROUTING. Credential và model mặc định chỉ nằm ở backend.

## Provider và model

Khi có tác vụ AI đang xử lý, provider, model và nút tải lại model bị khóa trên cả desktop/mobile, kể cả khi đổi tab. Các lựa chọn chỉ mở lại khi mọi tác vụ kết thúc, lỗi hoặc được hủy; hoàn tất một tác vụ không mở khóa nếu tác vụ khác vẫn đang chạy.

Khung **Model tạo / sửa ảnh** nằm ở đầu nội dung trên mọi trang, hiển thị trực tiếp trên cả desktop và mobile. Provider 1 tự tải danh sách model từ `GET /api/ai/providers/shopaikey/image-models`, nhóm theo **Google · Gemini**, **OpenAI · GPT Image** và **xAI · Grok Imagine**. Model được lưu trên trình duyệt và gửi dưới trường `imageModel` cho Mockup Generator, Idea Generator, Image Editor và Mockup Studio. Có nút tải lại; lỗi catalog/model đã gỡ sẽ ngăn tạo ảnh cho đến khi chọn hợp lệ. Một batch giữ lựa chọn lúc bắt đầu; retry dùng lựa chọn hiện tại. Backend gọi API phù hợp với model đã chọn. Grok nhận tối đa 5 ảnh gồm sản phẩm gốc; tài khoản chưa có kênh cho model sẽ nhận lỗi rõ ràng và không tự chuyển model.

Text có định tuyến tự động độc lập khi API trả `textRouting`: ưu tiên GPT rồi Claude từ VyceAI nội bộ, luôn kiểm tra health trước mỗi lần áp dụng; fallback ShopAIKey nếu không dùng được. VyceAI không xuất hiện trong dropdown ảnh. Phân tích ảnh vẫn dùng vision model của provider ảnh đã chọn.

## Mockup Studio

Tab **Mockup Studio** (`/#background-studio`) chuyển hình in/họa tiết từ một ảnh sản phẩm gốc lên sản phẩm tương ứng trong tối đa 10 ảnh tham chiếu. Ảnh tham chiếu là ảnh nền để chỉnh sửa tại chỗ: giữ nguyên người/chủ thể, cảnh, ánh sáng, bố cục, màu nền và cấu trúc sản phẩm đích. Giữ chi tiết, màu và tỷ lệ hình in so với sản phẩm gốc; chỉ thích ứng với phối cảnh, độ cong, nếp gấp và phần bị che khuất. Mặc định xử lý tất cả sản phẩm cùng loại trong ảnh, không giới hạn ở áo hay ảnh có người. Chọn/bỏ chọn ảnh, chọn 1–3 kết quả cho mỗi ảnh (tối đa 20 kết quả một bộ).

**Custom prompt** được điền sẵn đầy đủ prompt base từ `src/constants/background-studio-prompt.ts`, tối đa 12000 ký tự. Người dùng được sửa hoặc thay thế toàn bộ; có nút **Khôi phục prompt gốc**. Mỗi bộ gửi nguyên nội dung cuối cùng trong trường `instructions`, không trim, không ghép base phía API, không thêm quy tắc ẩn, nhãn text hay câu hướng dẫn biến thể. Prompt thiếu/trống bị chặn; ô nhập và nút khôi phục bị khóa khi đang tạo. Multipart trình duyệt có thể chuẩn hóa xuống dòng thành CRLF. Retry giữ prompt đã lưu của tác vụ; muốn dùng prompt mới cần tạo bộ mới. Prompt mặc định yêu cầu giữ nguyên cảnh và ánh sáng, người dùng có thể sửa yêu cầu này. Đây là chỉnh sửa bằng AI, cần đối chiếu kết quả vì chưa có mask hoặc kiểm định độ chính xác từng pixel.

Mỗi cặp ảnh được gửi riêng qua `POST /api/backgrounds/replace` với `productImage`, `backgroundImage`, `provider`, `variationIndex` và `instructions`, tối đa **3 request đồng thời**. Khi một ảnh xong, request tiếp theo bắt đầu ngay mà không chờ các ảnh còn lại; kết quả gắn đúng ảnh tham chiếu và giữ thứ tự hiển thị. Provider/model và prompt được giữ cố định cho cả lần tạo; lựa chọn chỉ mở lại khi mọi request của bộ đã kết thúc hoặc người dùng bấm dừng. Có thể thử lại một ảnh hoặc tiếp tục phần chưa xong bằng provider hiện tại. Lỗi thanh toán/xác thực/quota/rate limit/cấu hình hoặc R2 dừng gửi request mới và tạm dừng các ảnh chưa gửi; các request đang chạy vẫn hoàn tất và giữ kết quả. Bấm dừng hủy tất cả request đang chạy và không gửi thêm; phản hồi cũ không thay đổi bộ mới. API retry upload riêng để không tạo lại ảnh trong cùng request khi R2 lỗi.

Xem ảnh mở so sánh sản phẩm–ảnh tham chiếu–kết quả. Tải riêng hoặc ZIP toàn bộ ảnh đã xong, tên file theo ảnh tham chiếu/biến thể và giữ đuôi PNG/JPEG/WebP thực tế. Reload trang xóa file/kết quả đang có; chuyển tab vẫn giữ dữ liệu. Dừng không bảo đảm provider ngừng xử lý request đã gửi. Endpoint và tên trường `backgroundImage` được giữ để tương thích; trường này chứa ảnh mẫu cần chỉnh sửa, không chỉ chứa background.

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

Playwright tự mở Vite tại cổng 5183 và dùng API giả lập, không gọi provider AI hay R2. Test bao gồm menu mobile/deep link, hủy phân tích cũ, giới hạn upload, số ảnh đầu ra, tải ZIP thiếu ảnh, giữ trạng thái và dashboard. Mockup Studio kiểm tra gửi đúng từng cặp ảnh, chọn ảnh tham chiếu/số kết quả, giữ provider trong hàng đợi, dừng/tiếp tục, retry phần chưa xong, lỗi provider/R2 và tên file ZIP.

## Production

Dockerfile build bằng Node 22 và phục vụ file tĩnh bằng Nginx trên cổng 80.
API_UPSTREAM mặc định api:5177; đổi biến này nếu backend dùng địa chỉ khác. Nginx chuyển tiếp /api, hỗ trợ request tạo ảnh dài và upload nhiều ảnh.

Có thể chạy cả hai dự án bằng compose.yaml trong thư mục API:

```powershell
docker compose up --build
```

Truy cập http://localhost:5173. Nếu dùng hai host riêng, cấu hình VITE_API_BASE_URL thành origin của API (không thêm /api) trước khi build; Docker hỗ trợ build arg cùng tên.

Production dùng **https://tools.lcgmedia.uk** cho app và **https://api.lcgmedia.uk** cho API. Workflow publish truyền `VITE_API_BASE_URL=https://api.lcgmedia.uk` vào Docker build; endpoint vẫn giữ prefix `/api`. Cấu hình CORS của API và R2 cho origin `https://tools.lcgmedia.uk`. Cấu hình host Nginx/SSL nằm trong repo API tại `deploy/nginx-lcgmedia.conf`.

Ảnh đầu ra nằm trên R2. Để tải ảnh/ZIP trong trình duyệt, cấu hình bucket/public domain cho phép CORS GET từ origin frontend. Lỗi tải ảnh sẽ hiển thị; ZIP báo chính xác số ảnh tải thành công.

Giới hạn: ảnh PNG/JPEG/WebP tối đa 10MB; 10 ảnh reference; 12 prompt tự động/ý tưởng; 20 prompt thủ công; 1–10 biến thể reference. Số lượng ý tưởng được gửi riêng qua trường count. Mỗi biến thể reference cần một lần tạo ảnh AI.

Điều hướng dùng URL hash, hỗ trợ Back/Forward. Chuyển giữa công cụ giữ nguyên dữ liệu đang làm; reload trang sẽ xóa các file upload và kết quả trong bộ nhớ. Dashboard lưu tối đa 500 hoạt động thành công trên trình duyệt này, không có lịch sử dùng chung giữa thiết bị.

Hủy yêu cầu ngăn phản hồi cũ cập nhật giao diện. Backend dừng các bước còn lại khi client ngắt kết nối; lời gọi đã đến provider có thể vẫn được xử lý.

## API errors

Tên provider trên giao diện dùng nhãn cố định: **Provider 1** cho ShopAIKey, được chọn mặc định và đứng đầu danh sách. Gemini được ẩn khỏi ô chọn; các lựa chọn Gemini/VyceAI đã lưu trước đây chuyển sang Provider 1. Các trạng thái và thông báo lỗi dùng nhãn trung lập; định tuyến text tự động hiển thị trung lập. ID gửi API và lựa chọn đã lưu vẫn dùng ID nội bộ.

Failed requests display the API's message, sanitized provider reason, recovery suggestion, and request ID. Error notifications remain visible for 15 seconds with a dismiss button. Provider catalog failures show their error beside the selector. HTTP failures with non-JSON bodies (such as proxy 502 pages) are distinguished from network failures; validation message arrays remain readable.

Mockup Studio hiển thị **Mã yêu cầu** trên từng ảnh thành công hoặc thất bại. Gửi mã này khi cần kiểm tra prompt, ảnh đầu vào, model thực tế và kết quả trong log riêng của API. Mỗi lần thử lại có mã mới; các ảnh đã xong giữ mã cũ. Hướng dẫn tra cứu và thời hạn lưu nằm trong `docs/audit-logs.md` của repository API. Không có dữ liệu hồi tố cho các request trước khi tính năng log được triển khai.
