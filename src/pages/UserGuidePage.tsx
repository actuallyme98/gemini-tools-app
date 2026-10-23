import type { ReactNode } from "react";
import { ArrowRight, BookOpen } from "lucide-react";
import { Button } from "../components/ui/button";
import "../styles/guide.css";

const chapters = [
  ["start", "1. Đăng nhập & không gian làm việc"],
  ["prepare", "2. Chọn quy trình, model và tệp"],
  ["request", "3. Viết và gửi yêu cầu"],
  ["approve", "4. Duyệt kế hoạch & final prompt"],
  ["results", "5. Xử lý, duyệt ảnh & xuất file"],
  ["workflows", "6. Tạo workflow dùng lại"],
  ["history", "7. Hội thoại, bộ nhớ & thư viện"],
  ["troubleshooting", "8. Xử lý tình huống thường gặp"],
];

function Chapter({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={`guide-${id}`}
      className="guide-chapter"
      aria-labelledby={`guide-heading-${id}`}
    >
      <h2 id={`guide-heading-${id}`}>{title}</h2>
      {children}
    </section>
  );
}
function Illustration({
  name,
  alt,
  caption,
}: {
  name: string;
  alt: string;
  caption: string;
}) {
  return (
    <figure className="guide-figure">
      <a
        href={`/guide/${name}.webp`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Mở ảnh lớn: ${alt}`}
      >
        <img
          src={`/guide/${name}.webp`}
          width={1200}
          height={850}
          loading="lazy"
          decoding="async"
          alt={alt}
        />
      </a>
      <figcaption>
        {caption} Bấm ảnh để xem lớn. Giao diện minh họa dùng dữ liệu mẫu.
      </figcaption>
    </figure>
  );
}

export default function UserGuidePage({
  onNavigate,
  isAdmin,
}: {
  onNavigate: (page: string) => void;
  isAdmin: boolean;
}) {
  return (
    <article className="user-guide workspace-page">
      <header className="guide-intro">
        <p className="eyebrow">
          <BookOpen size={16} aria-hidden="true" /> CẨM NANG LCG AGENT
        </p>
        <h1>Từ yêu cầu đầu tiên đến bộ ảnh hoàn chỉnh.</h1>
        <p>
          Hướng dẫn làm việc với trợ lý AI cho sản phẩm POD: phát triển ý tưởng,
          tạo thiết kế, ghép mockup và thực hiện quy trình nhiều bước. Bạn giao
          việc bằng hội thoại, kiểm tra kế hoạch và duyệt trước khi tạo ảnh.
        </p>
        <Button onClick={() => onNavigate("agent")}>
          Đi tới Trợ lý AI <ArrowRight size={16} aria-hidden="true" />
        </Button>
      </header>
      <nav aria-label="Mục lục hướng dẫn" className="guide-toc">
        {chapters.map(([id, label]) => (
          <button
            type="button"
            key={id}
            onClick={() => {
              const chapter = document.getElementById(`guide-heading-${id}`);
              chapter?.setAttribute("tabindex", "-1");
              chapter?.focus({ preventScroll: true });
              chapter?.scrollIntoView({ block: "start" });
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      <ol className="guide-flow" aria-label="Quy trình từ đầu đến cuối">
        {[
          "Chuẩn bị tệp",
          "Gửi yêu cầu",
          "Duyệt prompt",
          "Chạy tác vụ",
          "Duyệt & tải ảnh",
        ].map((step, i) => (
          <li key={step}>
            <span>{i + 1}</span>
            {step}
          </li>
        ))}
      </ol>

      <Chapter id="start" title={chapters[0][1]}>
        <ol>
          <li>
            Mở workspace và đăng nhập bằng email, mật khẩu được cấp. Nếu màn
            hình có nút Google, bạn có thể đăng nhập bằng tài khoản Google đã
            được công ty cho phép. Domain hợp lệ do quản trị viên thiết lập.
          </li>
          <li>
            Chọn <strong>Trợ lý AI</strong> để mở khu vực hội thoại. Mục này
            quay lại hội thoại bạn đang xem; không xóa nội dung đang nhập.
          </li>
          <li>
            Bấm <strong>Trò chuyện mới</strong> khi bắt đầu công việc độc lập.
            Nút này mở phiên trống; hội thoại được lưu sau khi gửi yêu cầu đầu
            tiên. Hội thoại cũ vẫn nằm trong <strong>Trò chuyện gần đây</strong>
            .
          </li>
          <li>
            Trên điện thoại, bấm biểu tượng menu ở đầu trang để mở điều hướng.
            Bấm <strong>Ngữ cảnh & tệp</strong> trong khung soạn để mở phần cấu
            hình.
          </li>
        </ol>
        <Illustration
          name="workspace"
          alt="Trang Trợ lý AI với điều hướng, khung giao việc và bảng Ngữ cảnh công việc"
          caption="Tổng quan: điều hướng bên trái, hội thoại ở giữa, cấu hình và tệp bên phải."
        />
      </Chapter>

      <Chapter id="prepare" title={chapters[1][1]}>
        <p>
          Mở <strong>Ngữ cảnh & tệp</strong>. Cấu hình ở đây áp dụng cho yêu cầu
          bạn sắp gửi; không cần tìm một trang Cấu hình Agent riêng.
        </p>
        <p>
          Ô nhập luôn ở đáy màn hình; chỉ phần hội thoại phía trên cuộn. Bảng
          ngữ cảnh ưu tiên ảnh nguồn, ảnh tham chiếu và model. Mở “Tùy chọn nâng
          cao” để đổi nhóm sản phẩm, số biến thể hoặc bật kiểm tra kết quả. Trên
          màn hình nhỏ, đóng bảng ngữ cảnh để xem lại hội thoại; nội dung đang
          nhập và ảnh đã chọn vẫn được giữ.
        </p>
        <div
          className="guide-table-scroll"
          role="region"
          aria-label="Các quy trình Agent"
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                <th>Quy trình</th>
                <th>Dùng khi nào?</th>
                <th>Chuẩn bị</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Agent tự chọn quy trình</td>
                <td>Để Agent đề xuất tác vụ từ mô tả.</td>
                <td>Yêu cầu cụ thể; ảnh hoặc template nếu có.</td>
              </tr>
              <tr>
                <td>Ý tưởng và Design</td>
                <td>Nghiên cứu ý tưởng, xây dựng prompt và tạo biến thể.</td>
                <td>
                  Nhóm sản phẩm, đối tượng, chủ đề, số biến thể; ảnh nguồn nếu
                  muốn phát triển từ thiết kế có sẵn.
                </td>
              </tr>
              <tr>
                <td>Mockup từ ảnh tham chiếu</td>
                <td>Đưa sản phẩm hoặc thiết kế nguồn vào cảnh tham chiếu.</td>
                <td>
                  Ảnh nguồn và ảnh tham chiếu. Nêu rõ phần cần thay và phần phải
                  giữ.
                </td>
              </tr>
              <tr>
                <td>Ghép thiết kế lên template</td>
                <td>
                  Ghép thiết kế vào vùng in đã định nghĩa, dùng lại cùng bố cục.
                </td>
                <td>Thiết kế nguồn và template đã lưu với vùng in phù hợp.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul>
          <li>
            <strong>Model tạo / sửa ảnh:</strong> chọn model trước khi gửi yêu
            cầu. Danh sách phụ thuộc kết nối và các model hiện có. Khi yêu cầu
            đang gửi hoặc công việc đang xử lý, lựa chọn bị khóa để giữ nhất
            quán.
          </li>
          <li>
            <strong>Ảnh sản phẩm/thiết kế nguồn:</strong> sản phẩm hoặc artwork
            bạn muốn sử dụng. Ưu tiên ảnh rõ nét, đầy đủ thiết kế; chọn đúng
            nhóm sản phẩm.
          </li>
          <li>
            <strong>Ảnh tham chiếu — cảnh cần giữ:</strong> bố cục, người mẫu,
            ánh sáng, background và vị trí sản phẩm mà kết quả cần dựa theo. Đây
            là ảnh đích, không phải thiết kế mới.
          </li>
          <li>
            Có thể tải nhiều tệp hoặc chọn từ thư viện. Kiểm tra tên và nhãn{" "}
            <strong>Nguồn</strong>/<strong>Tham chiếu</strong> trong các tệp đã
            chọn; bỏ tệp chọn nhầm trước khi gửi.
          </li>
          <li>
            Với batch, kiểm tra từng cặp ảnh trong kế hoạch trước khi chạy. Mỗi
            cặp nguồn/tham chiếu hoặc nguồn/template có thể tạo một kết quả; số
            lượng thực tế hiển thị ở bước duyệt.
          </li>
        </ul>
        <Illustration
          name="inputs"
          alt="Khung giao việc đã chọn ảnh nguồn, ảnh tham chiếu, model và quy trình"
          caption="Chuẩn bị đầu vào: phân biệt ảnh nguồn với cảnh tham chiếu trước khi gửi."
        />
      </Chapter>

      <Chapter id="request" title={chapters[2][1]}>
        <p>
          Trong ô giao việc, mô tả{" "}
          <strong>
            mục tiêu → đầu vào → thay đổi → điều phải giữ → số kết quả
          </strong>
          . Bấm <strong>Gửi yêu cầu</strong> để Agent phân tích và đề xuất kế
          hoạch. Bước phân tích có thể gọi model AI; chưa bắt đầu tạo ảnh cho
          đến khi bạn duyệt và bấm chạy.
        </p>
        <h3>Ví dụ: thay ornament trong ảnh tham chiếu</h3>
        <blockquote>
          Thay tất cả ornament trong từng ảnh tham chiếu bằng ornament trong ảnh
          nguồn. Dùng ảnh tham chiếu làm ảnh đích; giữ nguyên background, ánh
          sáng, bàn tay, bố cục và các vị trí treo. Giữ nguyên thiết kế, hình
          dáng, chữ và màu của ornament nguồn; chỉ điều chỉnh kích thước tổng
          thể, góc nhìn và phối cảnh để phù hợp từng vị trí. Không mang
          background ảnh nguồn sang ảnh đích và không thêm watermark.
        </blockquote>
        <h3>Ví dụ: tạo ý tưởng và biến thể</h3>
        <blockquote>
          Đề xuất 3 hướng thiết kế áo thun cho người yêu camping, phong cách
          vintage, bảng màu giới hạn và dễ đọc khi in. Mỗi hướng cần ý tưởng, mô
          tả bố cục và prompt tạo ảnh. Tránh dùng nhân vật hoặc logo có sẵn. Tôi
          muốn duyệt từng prompt trước khi tạo ảnh.
        </blockquote>
        <p>
          Nếu bạn cần giữ chính xác vị trí, tỉ lệ và hình in theo một vùng cố
          định, hãy cân nhắc quy trình <strong>Ghép lên template</strong>. Với
          mockup AI, cần kiểm tra lại chi tiết sản phẩm vì model có thể vẽ lại
          chữ hoặc họa tiết.
        </p>
        <p>
          Trong ô chat, “Manual approval” (mặc định) để bạn tự trả lời; “Auto
          approval” tự chọn gợi ý đầu tiên của Agent. Chế độ được lưu theo công
          việc và áp dụng cho các bước workflow. Auto vẫn chờ bạn nếu thiếu ảnh
          hoặc Agent cần làm rõ sau hai lượt tự chọn. Final prompt vẫn cần bạn
          duyệt trước khi tạo ảnh. Khi Agent hỏi thêm, chọn câu trả lời trong
          thẻ “Agent cần bạn xác nhận”. Lựa chọn đầu tiên được đánh dấu “Đề
          xuất”; bạn cũng có thể chọn “Ý khác” để tự nhập. Bấm “Gửi câu trả lời”
          để cập nhật kế hoạch. Bạn vẫn cần duyệt final prompt trước khi tạo
          ảnh. Có thể gõ câu trả lời trong ô chat của cùng hội thoại; hệ thống
          sẽ nối câu trả lời với công việc đang chờ.
        </p>
        <p>
          Nếu đổi, thêm hoặc bỏ ảnh nguồn, ảnh tham chiếu hay template khi đang
          chờ duyệt, kế hoạch cũ sẽ bị khóa. Bấm “Phân tích lại ảnh mới”, kiểm
          tra final prompt mới rồi bắt đầu tạo ảnh. Quy tắc này áp dụng cho cả
          Auto và Manual approval. Bộ ảnh mới được lưu để tiếp tục sau khi tải
          lại trang; nếu thay đổi từ tab khác, bấm “Nạp ảnh đã cập nhật” trước.
        </p>
      </Chapter>

      <Chapter id="approve" title={chapters[3][1]}>
        <ol>
          <li>
            Đọc tóm tắt và câu hỏi của Agent. Kiểm tra quy trình, số ảnh và đúng
            cặp <strong>Ảnh nguồn</strong>/<strong>Ảnh đích</strong>.
          </li>
          <li>
            Mở <strong>Final prompt</strong> của từng kết quả. Đây là nội dung
            cần đối chiếu trước khi chạy; kiểm tra vai trò ảnh, phần cần giữ,
            phần cần thay và yêu cầu không tạo watermark.
          </li>
          <li>
            Chỉnh prompt nếu cần, sau đó bấm <strong>Lưu final prompt</strong>.
            Khi còn chỉnh sửa chưa lưu, nút bắt đầu bị khóa.
          </li>
          <li>
            Chỉ khi đã kiểm tra xong, bấm <strong>Bắt đầu xử lý … ảnh</strong>.
            Thao tác này đưa các tác vụ tạo ảnh vào hàng đợi và có thể phát sinh
            chi phí model.
          </li>
        </ol>
        <Illustration
          name="approval"
          alt="Kế hoạch với final prompt có thể chỉnh sửa, nút lưu và nút bắt đầu xử lý ảnh"
          caption="Bước duyệt: đối chiếu ảnh và lưu final prompt trước khi bắt đầu."
        />
      </Chapter>

      <Chapter id="results" title={chapters[4][1]}>
        <p>
          Công việc đi qua trạng thái chờ, đang xử lý và chờ duyệt/hoàn tất.
          Nhiều nhân viên và nhiều tab dùng chung hàng đợi; một yêu cầu đã tiếp
          nhận có thể cần chờ lượt. Mở <strong>Công việc</strong> để theo dõi
          hoặc mở lại hội thoại từ lịch sử.
        </p>
        <ol>
          <li>
            Xem từng ảnh đầu ra. So với ảnh nguồn và cảnh đích: đúng sản phẩm,
            số lượng, chữ, màu, tỉ lệ, vị trí, ánh sáng và không có watermark
            mới.
          </li>
          <li>
            Đọc ghi chú kiểm tra nếu có. Kiểm tra kỹ thuật hoặc phân tích tự
            động hỗ trợ bạn; quyết định duyệt vẫn do người dùng.
          </li>
          <li>
            Dùng lựa chọn <strong>Duyệt ảnh</strong> để ghi nhận ảnh được duyệt
            hoặc cần làm lại. Nếu cần thay đổi, mô tả rõ vấn đề trong hội thoại;
            việc tạo lại phải được duyệt như một lần xử lý mới.
          </li>
          <li>
            Tải ảnh cần dùng hoặc bấm <strong>Xuất bộ ảnh ZIP</strong>. Kiểm tra
            bộ file tải về trước khi bàn giao; ảnh và kết quả vẫn có thể tìm lại
            trong thư viện và hội thoại.
          </li>
        </ol>
        <Illustration
          name="results"
          alt="Kết quả công việc với ảnh, ghi chú kiểm tra, lựa chọn duyệt ảnh và xuất ZIP"
          caption="Kết quả: kiểm tra nội dung, ghi nhận duyệt ảnh rồi tải bộ file."
        />
        <p>
          <strong>Dừng tác vụ:</strong> nút Dừng ngăn các bước chưa gửi tiếp tục
          chạy. Request đã gửi tới model có thể vẫn hoàn tất; dừng không đồng
          nghĩa hoàn lại chi phí.
        </p>
      </Chapter>

      <Chapter id="workflows" title={chapters[5][1]}>
        <p>
          Workflow phù hợp với công việc lặp lại, ví dụ{" "}
          <strong>
            tạo thiết kế → duyệt thiết kế → đưa vào mockup → duyệt kết quả
          </strong>
          .
        </p>
        <ol>
          <li>
            Vào <strong>Workflows → Tạo workflow</strong>, nhập tên dễ tìm và mô
            tả mục đích.
          </li>
          <li>
            Với mỗi bước, đặt tên, chọn tác vụ, viết hướng dẫn và số biến thể
            nếu là bước thiết kế. Dùng nút đưa lên/xuống để đổi thứ tự.
          </li>
          <li>
            Bước đầu dùng <strong>Đầu vào ban đầu</strong>. Ở bước sau, chọn đầu
            vào ban đầu hoặc <strong>Kết quả đã duyệt của bước trước</strong>{" "}
            theo mục đích.
          </li>
          <li>
            Lưu workflow, chọn dùng workflow đó; bổ sung ảnh nguồn, tham chiếu
            hoặc template khi giao việc. Kiểm tra mục{" "}
            <strong>Custom workflow</strong> trước khi gửi.
          </li>
          <li>
            Duyệt prompt và kết quả ở từng bước. Khi bước tiếp theo cần kết quả
            trước, hãy duyệt ảnh phù hợp rồi tiếp tục theo tiến trình workflow.
          </li>
        </ol>
        <p>
          Mỗi workflow tối đa 8 bước và 20 kết quả mỗi bước. Công việc đã tạo
          giữ phiên bản workflow tại thời điểm chạy; sửa workflow không tự thay
          đổi công việc đang có.
        </p>
        <Illustration
          name="workflow"
          alt="Trình tạo workflow có bước thiết kế và bước mockup dùng kết quả đã duyệt"
          caption="Workflow mẫu: tạo thiết kế rồi dùng kết quả đã duyệt làm nguồn cho mockup."
        />
      </Chapter>

      <Chapter id="history" title={chapters[6][1]}>
        <ul>
          <li>
            <strong>Trò chuyện gần đây:</strong> bấm tên để mở hội thoại đã lưu;
            tải thêm để xem cũ hơn. Lịch sử tự làm mới và có nút làm mới thủ
            công nếu chưa thấy hội thoại vừa tạo.
          </li>
          <li>
            <strong>Lịch sử hội thoại:</strong> các tin nhắn được lưu đầy đủ.
            Khi xem hội thoại dài, dùng tải thêm tin nhắn cũ; bạn không phải gửi
            lại toàn bộ yêu cầu từ đầu.
          </li>
          <li>
            <strong>Bộ nhớ & yêu cầu ghim:</strong> model nhận yêu cầu ghim, bản
            tóm tắt và phần hội thoại gần nhất để vừa giới hạn ngữ cảnh. Compact
            tạo bản tóm tắt phục vụ model, không xóa hội thoại gốc.
          </li>
          <li>
            Ghim những yêu cầu cần giữ xuyên suốt, ví dụ “Giữ nguyên chữ và màu
            thiết kế nguồn”, rồi bấm <strong>Lưu yêu cầu ghim</strong>. Thay đổi
            áp dụng ở lần lập kế hoạch tiếp theo; prompt đã duyệt không tự thay
            đổi.
          </li>
          <li>
            <strong>Thư viện:</strong> quản lý ảnh nguồn, ảnh tham chiếu và kết
            quả; chọn tệp để dùng trong công việc tiếp theo hoặc tải bộ ảnh.
          </li>
          <li>
            <strong>Templates:</strong> lưu ảnh mockup và vùng in để ghép thiết
            kế theo bố cục cố định. Tạo template, chọn vùng in chính xác, lưu
            rồi chọn template khi giao việc.
          </li>
          <li>
            <strong>Công cụ:</strong> các màn hình xử lý riêng vẫn có trong công
            cụ bổ trợ. Tác vụ từ công cụ được theo dõi trong Công việc; không
            phải mọi tác vụ công cụ đều là một hội thoại Agent.
          </li>
        </ul>
      </Chapter>

      <Chapter id="troubleshooting" title={chapters[7][1]}>
        <details open>
          <summary>
            Không bấm được Gửi yêu cầu hoặc không đổi được model?
          </summary>
          <p>
            Nhập mô tả đủ rõ, chọn model sẵn sàng cho quy trình cần ảnh và kiểm
            tra công việc đang xử lý. Model bị khóa trong lúc gửi/xử lý. Đợi tác
            vụ kết thúc hoặc mở công việc để xem trạng thái.
          </p>
        </details>
        <details>
          <summary>Ảnh bị ghép ngược hoặc sai sản phẩm?</summary>
          <p>
            Kiểm tra nhãn Nguồn và Tham chiếu, sau đó đối chiếu Ảnh nguồn/Ảnh
            đích và final prompt trong kế hoạch. Nêu rõ ảnh nào là cảnh phải
            giữ, ảnh nào chỉ cung cấp sản phẩm. Gửi yêu cầu chỉnh lại trong cùng
            hội thoại và duyệt prompt mới trước khi chạy.
          </p>
        </details>
        <details>
          <summary>Request lỗi, hết hạn mức hoặc bị gián đoạn?</summary>
          <p>
            Đọc thông báo, mã lỗi và request ID ở công việc. Lưu mã này để gửi
            quản trị viên kiểm tra. Với lỗi chưa rõ kết quả, kiểm tra công việc
            và ảnh đã có trước khi chạy lại để tránh tạo ảnh trùng hoặc tính phí
            thêm.
          </p>
        </details>
        <details>
          <summary>Google báo email không được phép?</summary>
          <p>
            Nhờ quản trị viên kiểm tra danh sách domain đăng nhập, trạng thái
            tài khoản và chính sách cấp tài khoản. Dùng email được công ty cấp
            quyền; không tự đổi cấu hình trình duyệt để vượt kiểm tra.
          </p>
        </details>
        <details>
          <summary>Không thấy hội thoại hoặc kết quả vừa tạo?</summary>
          <p>
            Kiểm tra đang đăng nhập đúng tài khoản, bấm làm mới hội thoại và mở
            Công việc. Nếu tác vụ đến từ công cụ bổ trợ, tìm ở Công việc. Nếu có
            thông báo lỗi lịch sử, bấm làm mới để thử lại.
          </p>
        </details>
      </Chapter>

      {isAdmin && (
        <section
          className="guide-chapter"
          aria-labelledby="guide-admin-heading"
        >
          <h2 id="guide-admin-heading">Dành cho quản trị viên</h2>
          <p>
            Vào <strong>Quản trị công ty</strong> để quản lý tài khoản, công
            việc và vận hành. Trong <strong>Vận hành</strong>, đặt domain Google
            được phép và chính sách tự cấp tài khoản; tạm dừng hàng đợi khi cần
            bảo trì. Bước worker đã nhận có thể vẫn tiếp tục.
          </p>
          <p>
            Để chẩn đoán: mở{" "}
            <strong>Audit logs → Request & lỗi hệ thống</strong>, chọn ngày UTC,
            chọn <strong>API</strong> hoặc <strong>Worker xử lý tác vụ</strong>,
            tìm request ID/mã lỗi rồi mở <strong>Chi tiết</strong>. Kiểm tra
            chuỗi sự kiện, prompt thực tế, thông tin ảnh và lỗi upstream.
            Request log chi tiết chỉ dành cho quản trị viên.
          </p>
          <Button variant="outline" onClick={() => onNavigate("admin-audit")}>
            Mở Audit logs <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </section>
      )}
    </article>
  );
}
