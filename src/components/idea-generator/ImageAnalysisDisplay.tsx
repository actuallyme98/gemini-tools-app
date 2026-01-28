import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  CheckCircle2,
  Palette,
  Tag,
  Heart,
  Users,
  Sparkles,
} from "lucide-react";
import type { ImageAnalysis } from "../../services/api.service";

interface ImageAnalysisDisplayProps {
  analysis: ImageAnalysis;
}

export function ImageAnalysisDisplay({ analysis }: ImageAnalysisDisplayProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 className="w-5 h-5 text-green-600" />
        <h3 className="font-semibold text-gray-900">Kết Quả Phân Tích</h3>
      </div>

      <div className="space-y-4">
        {/* Product Info */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-blue-600" />
            <h4 className="text-sm font-semibold text-gray-900">
              Thông tin sản phẩm
            </h4>
          </div>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-sm text-gray-600 min-w-28">Danh mục:</span>
              <span className="text-sm font-medium text-gray-900">
                {analysis.productCategory}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-sm text-gray-600 min-w-28">
                Loại sản phẩm:
              </span>
              <span className="text-sm font-medium text-gray-900">
                {analysis.productType}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-sm text-gray-600 min-w-28">
                Chế độ hiển thị:
              </span>
              <span className="text-sm font-medium text-gray-900">
                {analysis.displayMode}
              </span>
            </div>
          </div>
        </div>

        {/* Inspired By / Theme */}
        {analysis.inspiredBy && (
          <div className="border-l-4 border-purple-400 bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <h4 className="text-sm font-semibold text-gray-900">
                Chủ đề & Nguồn cảm hứng
              </h4>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-sm text-gray-600 min-w-28">Nguồn:</span>
                <span className="text-sm font-medium text-gray-900">
                  {analysis.inspiredBy.source}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sm text-gray-600 min-w-28">Chủ đề:</span>
                <span className="text-sm font-medium text-gray-900">
                  {analysis.inspiredBy.theme}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sm text-gray-600 min-w-28">
                  Bối cảnh:
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {analysis.inspiredBy.setting}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sm text-gray-600 min-w-28">
                  Phong cách:
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {analysis.inspiredBy.styleReference}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Characters */}
        {analysis.characters && analysis.characters.hasCharacters && (
          <div className="border-l-4 border-green-400 bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-green-600" />
              <h4 className="text-sm font-semibold text-gray-900">Nhân vật</h4>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-sm text-gray-600 min-w-28">
                  Số lượng:
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {analysis.characters.numberOfCharacters}
                </span>
              </div>
              {analysis.characters.characterNames &&
                analysis.characters.characterNames.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-gray-600 min-w-28">
                      Tên nhân vật:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {analysis.characters.characterNames.map((name, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="bg-white"
                        >
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              {analysis.characters.characterType &&
                analysis.characters.characterType.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-gray-600 min-w-28">
                      Loại:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {analysis.characters.characterType.map((type, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs"
                        >
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              {analysis.characters.relationship && (
                <div className="flex items-start gap-2">
                  <span className="text-sm text-gray-600 min-w-28">
                    Mối quan hệ:
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {analysis.characters.relationship}
                  </span>
                </div>
              )}
              {analysis.characters.visualDescription && (
                <div className="flex items-start gap-2">
                  <span className="text-sm text-gray-600 min-w-28">Mô tả:</span>
                  <span className="text-sm text-gray-900">
                    {analysis.characters.visualDescription}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Colors */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Palette className="w-4 h-4 text-gray-600" />
            <label className="text-sm font-medium text-gray-700">
              Màu sắc chủ đạo
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.primaryColors && analysis.primaryColors.length > 0 ? (
              analysis.primaryColors.map((color, index) => (
                <Badge key={index} variant="secondary">
                  {color}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-gray-500">Không có thông tin</span>
            )}
          </div>
        </div>

        {/* Pattern */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">
            Họa tiết
          </label>
          <p className="text-sm text-gray-900">
            {analysis.pattern || "Không có thông tin"}
          </p>
        </div>

        {/* Style Keywords */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">
            Phong cách
          </label>
          <div className="flex flex-wrap gap-2">
            {analysis.styleKeywords && analysis.styleKeywords.length > 0 ? (
              analysis.styleKeywords.map((keyword, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200"
                >
                  {keyword}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-gray-500">Không có thông tin</span>
            )}
          </div>
        </div>

        {/* Mood & Audience */}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-gray-600" />
              <label className="text-sm font-medium text-gray-700">
                Tâm trạng/Cảm xúc
              </label>
            </div>
            <p className="text-sm text-gray-900">
              {analysis.mood || "Không có thông tin"}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Đối tượng khách hàng
            </label>
            <p className="text-sm text-gray-900">
              {analysis.audience || "Không có thông tin"}
            </p>
          </div>
        </div>

        {/* Material Details */}
        {analysis.material && (
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-3">
              Chất liệu & Đặc điểm
            </label>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Chất liệu chính:</span>
                  <p className="text-gray-900 font-medium mt-1">
                    {analysis.material.main || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Chi tiết:</span>
                  <p className="text-gray-900 font-medium mt-1">
                    {analysis.material.details || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Kết cấu:</span>
                  <p className="text-gray-900 font-medium mt-1">
                    {analysis.material.texture || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Trọng lượng:</span>
                  <p className="text-gray-900 font-medium mt-1">
                    {analysis.material.weightOrThickness || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Độ co giãn:</span>
                  <p className="text-gray-900 font-medium mt-1">
                    {analysis.material.flexibility || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Thoáng khí:</span>
                  <p className="text-gray-900 font-medium mt-1">
                    {analysis.material.breathability || "N/A"}
                  </p>
                </div>
              </div>
              {analysis.material.seasonSuitability &&
                analysis.material.seasonSuitability.length > 0 && (
                  <div className="pt-2 border-t border-gray-200">
                    <span className="text-xs text-gray-500">Phù hợp mùa:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {analysis.material.seasonSuitability.map(
                        (season, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="text-xs"
                          >
                            {season}
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
