import { useActivities } from "../utils/activity.util";
import {
  Wand2,
  Image,
  TrendingUp,
  Clock,
  Layers,
  Star,
  Zap,
} from "lucide-react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const activities = useActivities();
  const count = (kind: string) =>
    activities
      .filter((item) => item.kind === kind)
      .reduce((sum, item) => sum + item.count, 0);
  const stats = [
    {
      label: "Mockups Created",
      value: String(count("mockup")),
      icon: Wand2,
      color: "blue",
    },
    {
      label: "Images Processed",
      value: String(count("image") + count("background")),
      icon: Image,
      color: "purple",
    },
    {
      label: "Ý tưởng đã tạo",
      value: String(count("ideas")),
      icon: Clock,
      color: "green",
    },
    {
      label: "Tổng ảnh đã tạo",
      value: String(activities.reduce((sum, item) => sum + item.count, 0)),
      icon: TrendingUp,
      color: "orange",
    },
  ];

  const quickActions = [
    {
      id: "mockup-generator",
      title: "Create Mockup",
      description: "Generate professional mockups with AI",
      icon: Wand2,
      gradient: "from-blue-500 to-purple-600",
    },
    {
      id: "image-editor",
      title: "Edit Image",
      description: "Advanced image editing tools",
      icon: Image,
      gradient: "from-purple-500 to-pink-600",
    },
    {
      id: "background-studio",
      title: "Background Studio",
      description: "Một sản phẩm, nhiều background trong một lần tạo",
      icon: Layers,
      gradient: "from-blue-500 to-cyan-600",
      disabled: false,
    },
  ];

  const recentActivity = activities.slice(0, 8).map((item) => ({
    title: `Đã tạo ${item.count} ${item.kind === "ideas" ? "ảnh ý tưởng" : item.kind === "mockup" ? "mockup" : item.kind === "background" ? "ảnh background" : "ảnh tham chiếu"}`,
    time: new Date(item.date).toLocaleString("vi-VN"),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600 mt-2">
          Thống kê từ tối đa 500 hoạt động gần nhất trên trình duyệt này. Bắt
          đầu tạo nội dung ngay hôm nay!
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const colorMap = {
            blue: "bg-blue-100 text-blue-600",
            purple: "bg-purple-100 text-purple-600",
            green: "bg-green-100 text-green-600",
            orange: "bg-orange-100 text-orange-600",
          };

          return (
            <Card key={stat.label} className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {stat.value}
                  </p>
                </div>
                <div
                  className={`p-3 rounded-lg ${
                    colorMap[stat.color as keyof typeof colorMap]
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Card
                key={action.id}
                className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                  action.disabled ? "opacity-50 cursor-not-allowed" : ""
                }`}
                role="button"
                tabIndex={action.disabled ? -1 : 0}
                aria-disabled={action.disabled}
                onKeyDown={(e) => {
                  if (
                    !action.disabled &&
                    (e.key === "Enter" || e.key === " ")
                  ) {
                    e.preventDefault();
                    onNavigate(action.id);
                  }
                }}
                onClick={() => !action.disabled && onNavigate(action.id)}
              >
                <div
                  className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${action.gradient} mb-4`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  {action.title}
                </h4>
                <p className="text-sm text-gray-600">{action.description}</p>
                {action.disabled && (
                  <span className="inline-block mt-3 text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">
                    Coming Soon
                  </span>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Activity
          </h3>
          <div className="space-y-4">
            {!recentActivity.length && (
              <p className="text-sm text-gray-600">
                Chưa có hoạt động. Kết quả tạo ảnh sẽ được ghi lại trên trình
                duyệt này.
              </p>
            )}
            {recentActivity.map((activity, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"
              >
                <div className="w-2 h-2 rounded-full bg-blue-600 mt-2" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Getting Started */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              Getting Started
            </h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-semibold shrink-0">
                1
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Upload Your Image
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Start by uploading an image to work with
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-semibold shrink-0">
                2
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Choose Your Tool
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Select from our AI-powered features
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs font-semibold shrink-0">
                3
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Get Results</p>
                <p className="text-xs text-gray-600 mt-1">
                  Download your enhanced images
                </p>
              </div>
            </div>
          </div>
          <Button
            className="w-full mt-6"
            onClick={() => onNavigate("mockup-generator")}
          >
            Start Creating
          </Button>
        </Card>
      </div>

      {/* Tips Card */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <Zap className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">💡 Pro Tip</h3>
            <p className="text-sm text-gray-700">
              Để có kết quả tốt nhất, hãy sử dụng ảnh có độ phân giải cao và nền
              rõ ràng. Tool AI của chúng tôi sẽ tự động tối ưu hóa và tạo ra các
              mockup chuyên nghiệp.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
