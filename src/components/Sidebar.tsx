import {
  Wand2,
  Image,
  Layout,
  Settings,
  Home,
  FileImage,
  Sparkles,
  Lightbulb,
} from "lucide-react";
import { cn } from "./ui/utils";

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const menuItems = [
  {
    id: "home",
    label: "Dashboard",
    icon: Home,
    description: "Tổng quan hệ thống",
  },
  {
    id: "mockup-generator",
    label: "Mockup Generator",
    icon: Wand2,
    description: "Tạo mockup tự động",
  },
  {
    id: "idea-generator",
    label: "Idea Generator",
    icon: Lightbulb,
    description: "Tạo ý tưởng sản phẩm",
  },
  {
    id: "image-editor",
    label: "Image Editor",
    icon: Image,
    description: "Chỉnh sửa ảnh",
  },
  {
    id: "batch-processing",
    label: "Batch Processing",
    icon: FileImage,
    description: "Xử lý hàng loạt",
    disabled: true,
  },
  {
    id: "ai-enhance",
    label: "AI Enhance",
    icon: Sparkles,
    description: "Nâng cao chất lượng",
    disabled: true,
  },
  {
    id: "templates",
    label: "Templates",
    icon: Layout,
    description: "Quản lý mẫu",
    disabled: true,
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    description: "Cài đặt",
    disabled: true,
  },
];

export function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <Wand2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-gray-900">Creative Studio</h1>
            <p className="text-xs text-gray-500">AI-Powered Tools</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            const isDisabled = item.disabled;

            return (
              <button
                key={item.id}
                onClick={() => !isDisabled && onPageChange(item.id)}
                disabled={isDisabled}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all",
                  isActive &&
                    "bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200",
                  !isActive && !isDisabled && "hover:bg-gray-50",
                  isDisabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5",
                    isActive ? "text-blue-600" : "text-gray-400"
                  )}
                />
                <div className="flex-1">
                  <div
                    className={cn(
                      "text-sm font-medium",
                      isActive ? "text-blue-900" : "text-gray-700"
                    )}
                  >
                    {item.label}
                  </div>
                  {isActive && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      {item.description}
                    </div>
                  )}
                </div>
                {isDisabled && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                    Soon
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Upgrade to Pro
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                Unlock unlimited features
              </p>
              <button className="mt-2 text-xs font-medium text-purple-600 hover:text-purple-700">
                Learn more →
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
