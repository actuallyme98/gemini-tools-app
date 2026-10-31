import { Link } from "react-router";
import {
  ArrowUpRight,
  Images,
  Lightbulb,
  BookOpen,
  FolderOpen,
} from "lucide-react";
export function StudioHomeActions({ admin }: { admin: boolean }) {
  const items = [
    {
      to: "/ideas/new",
      icon: Lightbulb,
      title: "Phát triển ý tưởng",
      text: "Từ ảnh tham khảo đến bộ thiết kế mới.",
      tone: "orange",
    },
    {
      to: "/mockups",
      icon: Images,
      title: "Tạo bộ mockup",
      text: "Một thiết kế, nhiều cách trình bày.",
      tone: "sage",
    },
    admin
      ? {
          to: "/manage/library",
          icon: FolderOpen,
          title: "Thư viện của nhóm",
          text: "Chuẩn bị sản phẩm, skill và ảnh mẫu.",
          tone: "sand",
        }
      : {
          to: "/guide",
          icon: BookOpen,
          title: "Hướng dẫn từng bước",
          text: "Làm quen quy trình trong vài phút.",
          tone: "sand",
        },
  ];
  return (
    <section className="studio-home-actions" aria-label="Bắt đầu công việc">
      {items.map(({ to, icon: Icon, title, text, tone }) => (
        <Link key={to} to={to} className={`studio-home-action tone-${tone}`}>
          <span>
            <Icon size={23} aria-hidden="true" />
          </span>
          <div>
            <strong>{title}</strong>
            <p>{text}</p>
          </div>
          <ArrowUpRight size={19} aria-hidden="true" />
        </Link>
      ))}
    </section>
  );
}
