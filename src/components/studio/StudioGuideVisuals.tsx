import { useId } from "react";
export function StudioGuideVisuals() {
  const id = useId();
  return (
    <section
      className="studio-guide-grid"
      aria-label="Hình minh họa quy trình Studio"
    >
      <figure className="studio-card">
        <svg role="img" aria-labelledby={`${id}-files`} viewBox="0 0 420 190">
          <title id={`${id}-files`}>
            Artwork là file phẳng riêng, thumbnail là ảnh trình bày sản phẩm
          </title>
          <rect
            x="20"
            y="15"
            width="130"
            height="135"
            rx="12"
            fill="#fff"
            stroke="#f58216"
            strokeWidth="2"
          />
          <path
            d="M45 115L73 50L95 105L125 65"
            fill="none"
            stroke="#f58216"
            strokeWidth="10"
            strokeLinejoin="round"
          />
          <text
            x="85"
            y="176"
            textAnchor="middle"
            fill="currentColor"
            fontSize="15"
          >
            Artwork gốc
          </text>
          <path
            d="M173 82h50m-12-10l12 10-12 10"
            fill="none"
            stroke="#a96a35"
            strokeWidth="3"
          />
          <rect
            x="245"
            y="15"
            width="155"
            height="135"
            rx="12"
            fill="#f4e8d8"
          />
          <path
            d="M259 124L291 90L383 99L355 134Z"
            fill="#fff"
            stroke="#b49b80"
          />
          <path
            d="M293 116L307 98L322 116L348 101"
            fill="none"
            stroke="#f58216"
            strokeWidth="5"
          />
          <circle cx="375" cy="36" r="12" fill="#fff" />
          <text
            x="323"
            y="176"
            textAnchor="middle"
            fill="currentColor"
            fontSize="15"
          >
            Ảnh sản phẩm
          </text>
        </svg>
        <figcaption>
          <strong>Hai file, hai mục đích</strong>
          <p>
            Artwork dùng để kiểm tra thiết kế và chuẩn bị in. Ảnh sản phẩm dùng
            trình bày trong bối cảnh. Khi tạo mockup tiếp, ưu tiên artwork gốc
            đã duyệt.
          </p>
        </figcaption>
      </figure>
      <figure className="studio-card">
        <svg role="img" aria-labelledby={`${id}-roles`} viewBox="0 0 420 190">
          <title id={`${id}-roles`}>
            Ảnh 1 là nguồn thiết kế; ảnh 2 là bối cảnh đích cần giữ
          </title>
          <rect
            x="15"
            y="20"
            width="115"
            height="125"
            rx="12"
            fill="#fff"
            stroke="#f58216"
          />
          <circle cx="73" cy="75" r="28" fill="#f58216" />
          <path d="M58 75h30m-15-15v30" stroke="#fff" strokeWidth="6" />
          <text x="155" y="88" fill="currentColor" fontSize="26">
            +
          </text>
          <rect
            x="195"
            y="20"
            width="205"
            height="125"
            rx="12"
            fill="#f4e8d8"
          />
          <path d="M205 125L250 70h135" stroke="#c5b09b" fill="none" />
          <rect
            x="270"
            y="58"
            width="70"
            height="55"
            rx="5"
            fill="#fff"
            stroke="#a68c70"
          />
          <circle cx="305" cy="84" r="18" fill="#f58216" />
          <path d="M294 84h22m-11-11v22" stroke="#fff" strokeWidth="4" />
          <text
            x="73"
            y="174"
            textAnchor="middle"
            fill="currentColor"
            fontSize="14"
          >
            Ảnh 1: nguồn
          </text>
          <text
            x="297"
            y="174"
            textAnchor="middle"
            fill="currentColor"
            fontSize="14"
          >
            Ảnh 2: bối cảnh đích
          </text>
        </svg>
        <figcaption>
          <strong>Giữ đúng vai trò ảnh</strong>
          <p>
            Thiết kế ở ảnh nguồn được đưa lên sản phẩm trong ảnh đích. Giữ bố
            cục, ánh sáng, góc chụp và người mẫu của ảnh đích; không ghép theo
            chiều ngược lại.
          </p>
        </figcaption>
      </figure>
      <figure className="studio-card studio-span-full">
        <h2>Đi từ yêu cầu đến bộ ảnh đã duyệt</h2>
        <ol className="studio-help-flow">
          {[
            "Nhân viên tạo ý tưởng",
            "Leader duyệt đầu vào",
            "Agent phân tích & lập brief",
            "Tạo artwork → ảnh sản phẩm",
            "Kiểm tra chữ / màu / nền",
            "Chọn mẫu → mockup → tải file",
          ].map((label, index) => (
            <li key={label}>
              <span>{index + 1}</span>
              {label}
            </li>
          ))}
        </ol>
        <figcaption>
          Sơ đồ minh họa quy trình. Chọn một lần chạy một lần; lịch hằng ngày
          không tự tạo lại các mẫu đã hoàn tất.
        </figcaption>
      </figure>
    </section>
  );
}
