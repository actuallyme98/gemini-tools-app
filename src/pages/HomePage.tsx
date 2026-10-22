import { ArrowRight, Bot, Image, Layers, Lightbulb, Wand2 } from "lucide-react";
import { useActivities } from "../utils/activity.util";
import { WorkspaceHeading } from "../components/agent/AgentWorkspaceViews";
import { Button } from "../components/ui/button";

const tools = [
  {
    id: "mockup-generator",
    title: "Mockup Generator",
    icon: Wand2,
    description: "Tạo nhiều mockup từ ảnh sản phẩm và bộ prompt của bạn.",
  },
  {
    id: "background-studio",
    title: "Mockup Studio",
    icon: Layers,
    description:
      "Đưa sản phẩm nguồn vào nhiều ảnh tham chiếu, giữ bối cảnh và ánh sáng.",
  },
  {
    id: "idea-generator",
    title: "Idea Generator",
    icon: Lightbulb,
    description:
      "Phát triển ý tưởng và tạo hình ảnh từ chủ đề hoặc sản phẩm mẫu.",
  },
  {
    id: "image-editor",
    title: "Image Editor",
    icon: Image,
    description:
      "Chỉnh sửa ảnh theo yêu cầu với ảnh tham chiếu và hướng dẫn cụ thể.",
  },
];

export function HomePage({
  onNavigate,
}: {
  onNavigate: (page: string) => void;
}) {
  const activities = useActivities();
  return (
    <div className="tool-hub">
      <WorkspaceHeading
        eyebrow="BỘ CÔNG CỤ SÁNG TẠO"
        title="Tập trung vào một bước cụ thể."
        description="Dùng từng công cụ khi bạn đã biết rõ thao tác cần làm. Hoặc giao toàn bộ yêu cầu cho Agent để được hướng dẫn qua từng bước."
      >
        <Button onClick={() => onNavigate("agent")}>
          <Bot aria-hidden="true" />
          Trò chuyện với Agent
        </Button>
      </WorkspaceHeading>
      <div className="tool-hub-grid">
        {tools.map(({ id, title, icon: Icon, description }) => (
          <button
            type="button"
            className="tool-hub-card"
            key={id}
            onClick={() => onNavigate(id)}
          >
            <Icon size={25} aria-hidden="true" />
            <h2>{title}</h2>
            <p>{description}</p>
            <span className="text-action">
              Mở công cụ <ArrowRight size={15} aria-hidden="true" />
            </span>
          </button>
        ))}
      </div>
      <section className="tool-local-activity" aria-label="Hoạt động công cụ">
        <h2>Hoạt động công cụ gần đây</h2>
        <p>
          Lịch sử trên trình duyệt này. Công việc của Agent được lưu riêng trong
          tài khoản.
        </p>
        {activities.length ? (
          <ul>
            {activities.slice(0, 8).map((item, index) => (
              <li key={`${item.date}:${index}`}>
                <span>
                  Đã tạo {item.count}{" "}
                  {item.kind === "ideas"
                    ? "ảnh ý tưởng"
                    : item.kind === "mockup"
                      ? "mockup"
                      : item.kind === "background"
                        ? "ảnh áp hình in"
                        : "ảnh tham chiếu"}
                </span>
                <time dateTime={item.date}>
                  {new Date(item.date).toLocaleString("vi-VN")}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p>Chưa có hoạt động công cụ trên trình duyệt này.</p>
        )}
      </section>
    </div>
  );
}
