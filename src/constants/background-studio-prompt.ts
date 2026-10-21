/** The visible final prompt is assembled on the client and submitted verbatim. */
export const MAX_BACKGROUND_PROMPT_LENGTH = 12000;

export const BACKGROUND_STUDIO_RULES = `QUY ƯỚC ẢNH: ẢNH 1 là ảnh tham chiếu và là ảnh đích cần chỉnh sửa. ẢNH 2 là ảnh sản phẩm gốc, chỉ dùng làm nguồn sản phẩm/thiết kế theo yêu cầu bên dưới. Kết quả phải là phiên bản đã chỉnh sửa của ẢNH 1, giữ nguyên cảnh, bố cục, chủ thể và ánh sáng ngoài vùng cần thay. Không chỉnh sửa ẢNH 2 rồi trả về làm kết quả. Không đảo chiều nguồn và đích.

ĐẦU RA KHÔNG WATERMARK: không thêm watermark, chữ ký, dấu bản quyền, URL, logo nền tảng, tên model hoặc nhãn AI lên ảnh. Không sao chép watermark của ảnh nguồn. Giữ nguyên chữ, tên và logo thuộc thiết kế sản phẩm được yêu cầu; không coi chúng là watermark.`;

export const buildBackgroundPrompt = (instructions: string) =>
  `${BACKGROUND_STUDIO_RULES}\n\nYÊU CẦU CHỈNH SỬA:\n${instructions}`;

export const MAX_BACKGROUND_INSTRUCTIONS_LENGTH =
  MAX_BACKGROUND_PROMPT_LENGTH -
  buildBackgroundPrompt("").replace(/\r?\n/g, "\r\n").length;

export const BACKGROUND_STUDIO_BASE_PROMPT = `Chỉnh sửa trực tiếp ẢNH 1 bằng cách chuyển CHỈ hình in/họa tiết trên bề mặt sản phẩm trong ẢNH 2 lên sản phẩm hoặc các sản phẩm tương ứng đã có trong ẢNH 1. Trả về MỘT phiên bản đã chỉnh sửa của ẢNH 1.

ẢNH 2 — NGUỒN HÌNH IN: lấy chính xác hình in, hình đồ họa, họa tiết, logo và chữ nhìn thấy trên sản phẩm làm thiết kế gốc. Giữ nguyên mọi chi tiết, màu sắc gốc, tỷ lệ giữa các thành phần, hướng và bố cục của thiết kế. Không vẽ lại, diễn giải lại, đổi màu, cách điệu, lật gương, cắt xén, tự sáng tạo hoặc thêm chi tiết. Không sao chép background, người, hình dáng, màu nền hay cấu trúc sản phẩm từ ẢNH 2 sang ẢNH 1.

ẢNH 1 — ẢNH THAM CHIẾU CẦN CHỈNH SỬA: giữ nguyên toàn bộ cảnh, tất cả người và chủ thể, khuôn mặt, cơ thể, tư thế, bàn tay, phụ kiện, các đồ vật khác, background, góc chụp, khung hình, tỷ lệ ảnh, ánh sáng, bóng đổ, phản chiếu và độ sâu trường ảnh. Không xóa hoặc thay người/chủ thể, di chuyển sản phẩm, thay background, cắt ảnh, phóng to/thu nhỏ khung hình, đổi bố cục hoặc thay ánh sáng. Giữ nguyên tối đa mọi vùng ngoài khu vực hình in cần thay.

SẢN PHẨM ĐÍCH: xác định đúng loại sản phẩm tương ứng và bề mặt có thể in đang nhìn thấy trong ẢNH 1. Áp dụng cho mọi sản phẩm phù hợp như quần áo, túi, cốc/bình, vỏ điện thoại, bao bì và các đồ vật có hình in khác; không mặc định một loại sản phẩm, người sử dụng, giới tính hay số lượng chủ thể cụ thể. Mặc định áp cùng thiết kế gốc lên tất cả sản phẩm tương ứng trong ảnh, kể cả nhiều sản phẩm đang được mặc, sử dụng hoặc trưng bày. Không chỉnh sửa sản phẩm không liên quan. Nếu không thấy bề mặt sản phẩm tương ứng, giữ nguyên ẢNH 1; không tự thêm sản phẩm hoặc thay đổi cảnh.

CHỈ THAY HÌNH IN TẠI VÙNG CẦN CHỈNH: chỉ xóa hình in/họa tiết hiện có trong vùng in trên sản phẩm đích rồi thay bằng thiết kế từ ẢNH 2. Giữ nguyên màu nền, chất liệu, hình dáng, cấu trúc, kiểu cắt, đường may, quai/tay cầm, đường nét bên ngoài và kích thước thực của từng sản phẩm đích. Không thiết kế lại sản phẩm hoặc thay toàn bộ sản phẩm bằng vật thể trong ẢNH 2.

KÍCH THƯỚC VÀ VỊ TRÍ HÌNH IN: giữ đúng chiều rộng và chiều cao của hình in tương đối với bề mặt tương ứng trên sản phẩm gốc, tỷ lệ rộng/cao và vị trí tương đối trên bề mặt đó. Áp cùng các tỷ lệ này lên từng sản phẩm đích; không tự phóng to hoặc thu nhỏ chỉ để lấp đầy vùng trống. Không dùng cùng kích thước pixel tuyệt đối cho các sản phẩm xuất hiện ở tỷ lệ lớn nhỏ khác nhau trong ảnh. Chỉ cho phép biến đổi hình học cần thiết theo phối cảnh, độ cong, nếp gấp và các phần đang bị che khuất của sản phẩm đích. Giữ nguyên màu sắc và chi tiết vốn có của thiết kế gốc; chỉ cho phép ánh sáng, bóng đổ trên vải/bề mặt và phản chiếu sẵn có trong cảnh tác động để hình in hòa vào ảnh tự nhiên. Không vẽ đè lên bàn tay, tóc, dây đeo hoặc vật thể đang che phía trước; không tự làm lộ vùng sản phẩm bị khuất.

NHIỀU KẾT QUẢ: mỗi kết quả là một lần xử lý độc lập với cùng thiết kế gốc và ảnh tham chiếu. Giữ nguyên cảnh, chủ thể, ánh sáng, hình dáng sản phẩm, kích thước tương đối và vị trí hình in; không tự tạo biến thể bối cảnh hoặc vị trí để làm các kết quả khác nhau.

ĐẦU RA: chỉ trả về ảnh tham chiếu đã chỉnh sửa; không ghép collage, thêm sản phẩm, chú thích hoặc watermark mới.`;
