import { Check, ArrowUpRight, Users, Store, Layers3 } from "lucide-react";
import { Link } from "react-router";
import type { StudioBootstrap } from "../../services/studio.service";
export function StudioSetup({
  data,
  admin,
}: {
  data: StudioBootstrap;
  admin: boolean;
}) {
  if (data.stores.length) return null;
  if (!admin)
    return (
      <section className="studio-setup studio-setup-employee">
        <Users size={26} aria-hidden="true" />
        <div>
          <h2>Chờ cấp không gian làm việc</h2>
          <p>
            Nhờ quản trị viên hoặc Leader thêm bạn vào nhóm và cấp cửa hàng để
            bắt đầu.
          </p>
        </div>
      </section>
    );
  const steps = [
    {
      name: "Tạo nhóm",
      description: "Thêm nhân viên và Leader.",
      path: "/manage/teams",
      icon: Users,
      done: data.teams.length > 0,
    },
    {
      name: "Thêm sản phẩm",
      description: "Khai báo sản phẩm nhóm sẽ làm.",
      path: "/manage/library?type=product",
      icon: Layers3,
      done: data.resources.some(
        (r) => r.type === "product" && r.status === "approved",
      ),
    },
    {
      name: "Tạo cửa hàng",
      description: "Gán nhóm, nhân viên và sản phẩm.",
      path: "/manage/stores",
      icon: Store,
      done: false,
    },
  ];
  return (
    <section className="studio-setup" aria-label="Thiết lập ban đầu">
      <header>
        <div>
          <span className="studio-eyebrow">BẮT ĐẦU TẠI ĐÂY</span>
          <h2>Thiết lập không gian sáng tạo</h2>
          <p>Hoàn tất ba bước để nhóm có thể tạo ý tưởng và mockup.</p>
        </div>
        <span className="studio-setup-count">
          {steps.filter((s) => s.done).length}/3 bước
        </span>
      </header>
      <div className="studio-setup-steps">
        {steps.map(({ name, description, path, icon: Icon, done }, index) => (
          <Link key={path} to={path} className={done ? "is-complete" : ""}>
            <span className="studio-setup-icon">
              {done ? <Check size={20} /> : <Icon size={20} />}
            </span>
            <div>
              <strong>
                {index + 1}. {name}
              </strong>
              <small>{description}</small>
            </div>
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}
