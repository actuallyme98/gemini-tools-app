import {
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ImagePlus,
  Loader2,
  Save,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { AIProviderContext } from "../../context/ai-provider-context";
import { agentUpload, type AgentUser } from "../../services/agent.service";
import {
  studioClient,
  studioNavigate,
  type IdeaInput,
  type StudioBootstrap,
  type StudioIdea,
  type StudioResource,
} from "../../services/studio.service";
import { notifyApiError } from "../../utils/api-error-toast";
import { StudioImage } from "./StudioImage";
import { Button } from "../ui/button";
import { CatalogSelect } from "./CatalogSelect";

const steps = [
  "Cửa hàng & sản phẩm",
  "Ảnh ý tưởng",
  "Cách phát triển",
  "Kiểm tra & gửi",
];
export function IdeaWizard({
  data,
  user,
  existing,
}: {
  data: StudioBootstrap;
  user: AgentUser;
  existing?: StudioIdea;
}) {
  const ai = useContext(AIProviderContext)!;
  const id = useId();
  const [resolved, setResolved] = useState<Record<string, StudioResource>>({});
  const resolveResource = useCallback(
    (resource: StudioResource) =>
      setResolved((current) => ({ ...current, [resource.id]: resource })),
    [],
  );
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const savedDraft = useRef(existing);
  const savedFingerprint = useRef(
    existing ? JSON.stringify(existing.input) : "",
  );
  const saveChain = useRef<Promise<StudioIdea | undefined>>(
    Promise.resolve(existing),
  );
  const [saveStatus, setSaveStatus] = useState("");
  const [savedContent, setSavedContent] = useState(
    existing ? JSON.stringify(existing.input) : "",
  );
  const [input, setInput] = useState<IdeaInput>(
    existing?.input ?? {
      title: "",
      storeId: data.stores.length === 1 ? data.stores[0].id : "",
      productId: "",
      skillId: "",
      thumbnailId: "",
      sourceId: "",
      sourceUrl: "",
      brief: "",
      count: 7,
      artworkFirst: true,
      timing: "now",
      provider: "shopaikey",
      imageModel: ai.imageModel ?? "",
    },
  );
  const [imageName, setImageName] = useState(
    existing ? "Ảnh ý tưởng đã lưu" : "",
  );
  const persist = useCallback((snapshot: IdeaInput) => {
    const fingerprint = JSON.stringify(snapshot);
    const result = saveChain.current
      .catch(() => undefined)
      .then(async () => {
        if (savedDraft.current && savedFingerprint.current === fingerprint)
          return savedDraft.current;
        const idea = savedDraft.current
          ? await studioClient.patch<StudioIdea>(
              `/ideas/${savedDraft.current.id}`,
              { revision: savedDraft.current.revision, input: snapshot },
            )
          : await studioClient.post<StudioIdea>("/ideas", snapshot);
        savedDraft.current = idea;
        savedFingerprint.current = fingerprint;
        return idea;
      });
    saveChain.current = result;
    return result;
  }, []);
  useEffect(() => {
    if (!input.title.trim() || !input.storeId || busy) return;
    const timer = setTimeout(() => {
      setSaveStatus("Đang lưu…");
      void persist({
        ...input,
        imageModel: input.imageModel || ai.imageModel || "",
      })
        .then((idea) => {
          if (idea) setSavedContent(JSON.stringify(idea.input));
          setSaveStatus("Đã lưu lên máy chủ");
        })
        .catch(() =>
          setSaveStatus(
            "Chưa lưu được — thử lưu lại hoặc tải bản mới nếu có xung đột",
          ),
        );
    }, 1200);
    return () => clearTimeout(timer);
  }, [input, ai.imageModel, busy, persist]);
  const shop = data.stores.find((item) => item.id === input.storeId);
  const change = <K extends keyof IdeaInput>(key: K, value: IdeaInput[K]) =>
    setInput((current) => ({ ...current, [key]: value }));
  const selected = (resourceId: string) =>
    resolved[resourceId] ??
    data.resources.find((item) => item.id === resourceId);
  const validateStep = () => {
    const error =
      step === 0 && (!input.title.trim() || !shop || !input.productId)
        ? "Điền tên ý tưởng, chọn cửa hàng và sản phẩm."
        : step === 1 && !input.sourceId
          ? "Thêm ảnh ý tưởng tham khảo."
          : step === 2 &&
              (!input.skillId ||
                !input.thumbnailId ||
                !input.brief.trim() ||
                !(input.imageModel || ai.imageModel))
            ? "Chọn bộ hướng dẫn, mẫu ảnh chính và nhập yêu cầu phát triển."
            : "";
    if (error) toast.warning(error);
    return !error;
  };
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const asset = await agentUpload(
        file,
        "source",
        selected(input.productId)?.name ?? "POD",
      );
      change("sourceId", asset.id);
      setImageName(asset.name);
    } catch (error) {
      notifyApiError(error);
    } finally {
      setBusy(false);
    }
  }
  async function save(submit: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      const final = {
        ...input,
        imageModel: input.imageModel || ai.imageModel || "",
      };
      const idea = await persist(final);
      if (!idea) throw new Error("Chưa lưu được ý tưởng.");
      if (submit)
        await studioClient.post(`/ideas/${idea.id}/submit`, {
          revision: idea.revision,
        });
      toast.success(
        submit
          ? "Đã gửi Leader duyệt. Chưa gửi yêu cầu tạo ảnh đến AI."
          : "Đã lưu bản nháp.",
      );
      studioNavigate("studio-ideas", idea.id);
    } catch (error) {
      notifyApiError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="studio-wizard">
      <header className="studio-page-heading">
        <div>
          <span className="studio-eyebrow">BẮT ĐẦU TỪ MỘT Ý TƯỞNG</span>
          <h1>
            {existing ? "Chỉnh sửa ý tưởng" : "Bạn muốn phát triển điều gì?"}
          </h1>
          <p>
            Thêm ảnh, chọn cách phát triển. Agent sẽ làm việc sau khi Leader
            duyệt.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => studioNavigate("studio-ideas")}
          disabled={busy}
        >
          Về danh sách
        </Button>
      </header>
      <ol className="studio-stepper" aria-label="Các bước tạo ý tưởng">
        {steps.map((label, index) => (
          <li key={label} aria-current={step === index ? "step" : undefined}>
            <span>
              {step > index ? (
                <Check size={17} aria-hidden="true" />
              ) : (
                index + 1
              )}
            </span>
            <strong>{label}</strong>
          </li>
        ))}
      </ol>
      <form
        className="studio-card studio-wizard-body"
        onSubmit={(event) => {
          event.preventDefault();
          if (step < 3) {
            if (validateStep()) setStep(step + 1);
          } else void save(true);
        }}
      >
        <div className="studio-section-label">BƯỚC {step + 1} / 4</div>
        <h2>{steps[step]}</h2>
        <fieldset disabled={busy} className="studio-wizard-inputs">
          {step === 0 && (
            <div className="studio-form-grid">
              <label htmlFor={`${id}-title`}>
                Tên ý tưởng
                <input
                  type="text"
                  id={`${id}-title`}
                  value={input.title}
                  maxLength={160}
                  onChange={(e) => change("title", e.target.value)}
                  placeholder="Ví dụ: Bộ quà Giáng sinh cho người yêu thú cưng"
                  required
                />
              </label>
              <label htmlFor={`${id}-shop`}>
                Cửa hàng
                <select
                  id={`${id}-shop`}
                  value={input.storeId}
                  onChange={(e) =>
                    setInput((current) => ({
                      ...current,
                      storeId: e.target.value,
                      productId: "",
                      skillId: "",
                      thumbnailId: "",
                    }))
                  }
                  required
                >
                  <option value="">Chọn cửa hàng</option>
                  {data.stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name} ·{" "}
                      {
                        data.teams.find((team) => team.id === store.teamId)
                          ?.name
                      }
                    </option>
                  ))}
                </select>
              </label>
              <CatalogSelect
                key={shop?.id ?? "product"}
                teamId={shop?.teamId ?? ""}
                storeId={shop?.id}
                type="product"
                value={input.productId}
                label="Sản phẩm"
                onChange={(value) => change("productId", value)}
                onResolve={resolveResource}
              />
              <aside className="studio-note">
                Chỉ hiển thị cửa hàng và sản phẩm bạn được cấp quyền. Thiếu mục
                cần dùng? Liên hệ Leader hoặc quản trị viên.
              </aside>
            </div>
          )}
          {step === 1 && (
            <div className="studio-upload-layout">
              <label className="studio-upload" htmlFor={`${id}-image`}>
                <ImagePlus size={30} aria-hidden="true" />
                <strong>
                  {input.sourceId
                    ? "Đổi ảnh ý tưởng"
                    : "Chọn ảnh ý tưởng tham khảo"}
                </strong>
                <span>PNG, JPG hoặc WebP · tối đa 16 MB</span>
                <input
                  id={`${id}-image`}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={busy}
                  onChange={(e) => void upload(e.target.files?.[0])}
                />
              </label>
              {input.sourceId && (
                <figure>
                  <StudioImage
                    id={input.sourceId}
                    name="Ảnh ý tưởng tham khảo"
                  />
                  <figcaption>{imageName}</figcaption>
                </figure>
              )}
              <label htmlFor={`${id}-url`}>
                Link nguồn tham khảo <small>(không bắt buộc)</small>
                <input
                  id={`${id}-url`}
                  type="url"
                  value={input.sourceUrl}
                  onChange={(e) => change("sourceUrl", e.target.value)}
                  placeholder="https://…"
                />
                <small>
                  Link dùng để ghi nguồn, hệ thống không tự lấy ảnh từ link.
                </small>
              </label>
            </div>
          )}
          {step === 2 && (
            <div className="studio-form-grid">
              <CatalogSelect
                teamId={shop?.teamId ?? ""}
                type="skill"
                value={input.skillId}
                label="Bộ hướng dẫn"
                onChange={(value) => change("skillId", value)}
                onResolve={resolveResource}
              />
              <CatalogSelect
                teamId={shop?.teamId ?? ""}
                type="thumbnail"
                value={input.thumbnailId}
                label="Mẫu ảnh chính của cửa hàng"
                onChange={(value) => change("thumbnailId", value)}
                onResolve={resolveResource}
              />
              {selected(input.thumbnailId)?.assetId && (
                <div className="studio-master-preview">
                  <StudioImage
                    id={selected(input.thumbnailId)!.assetId!}
                    name="Mẫu ảnh chính"
                  />
                  <p>
                    Ảnh này quy định cách trình bày sản phẩm theo bộ hướng dẫn,
                    khác với ảnh ý tưởng.
                  </p>
                </div>
              )}
              <label className="studio-span-full" htmlFor={`${id}-brief`}>
                Mô tả cách phát triển
                <textarea
                  id={`${id}-brief`}
                  rows={4}
                  value={input.brief}
                  maxLength={8000}
                  onChange={(e) => change("brief", e.target.value)}
                  placeholder="Ví dụ: Redesign thành các mẫu riêng biệt, giữ tinh thần của ý tưởng và đa dạng bố cục."
                  required
                />
              </label>
              <label htmlFor={`${id}-count`}>
                Số mẫu riêng biệt
                <input
                  id={`${id}-count`}
                  type="number"
                  min={1}
                  max={12}
                  value={input.count}
                  onChange={(e) => {
                    const count = Number(e.target.value);
                    setInput((current) => ({
                      ...current,
                      count,
                      ...(current.sampleCount
                        ? { sampleCount: Math.min(current.sampleCount, count) }
                        : {}),
                    }));
                  }}
                  required
                />
              </label>
              <label htmlFor={`${id}-timing`}>
                Khi nào thực hiện?
                <select
                  id={`${id}-timing`}
                  value={input.timing}
                  onChange={(e) =>
                    change("timing", e.target.value as "now" | "night")
                  }
                >
                  <option value="now">Chạy sau khi Leader duyệt</option>
                  <option value="night" disabled={!data.schedulerEnabled}>
                    Lên lịch {data.schedule?.dailyTime ?? "22:00"}{" "}
                    {data.schedulerEnabled
                      ? "hằng ngày (UTC+7)"
                      : "— quản trị chưa bật"}
                  </option>
                </select>
              </label>
              <label className="studio-check studio-span-full">
                <input
                  type="checkbox"
                  checked={!!input.artworkFirst}
                  onChange={(e) => change("artworkFirst", e.target.checked)}
                />
                Tạo artwork riêng trước, sau đó tạo ảnh sản phẩm
              </label>
              {input.artworkFirst && (
                <p className="studio-note studio-span-full">
                  Mỗi thiết kế gồm 2 request ảnh: artwork phẳng và ảnh sản phẩm.
                  Sản phẩm cần có quy chuẩn pixel/DPI do Admin cấu hình. Cả hai
                  file cần kiểm tra; không tự xác nhận sẵn sàng in.
                </p>
              )}
              <details className="studio-span-full">
                <summary>Chạy thử trước khi tạo toàn bộ</summary>
                <label>
                  Số mẫu tạo trước
                  <select
                    value={
                      input.timing === "night"
                        ? input.count
                        : (input.sampleCount ?? input.count)
                    }
                    disabled={input.timing === "night"}
                    onChange={(event) =>
                      change("sampleCount", Number(event.target.value))
                    }
                  >
                    <option value={input.count}>
                      Tạo đủ {input.count} mẫu
                    </option>
                    {Array.from(
                      { length: Math.max(0, Math.min(11, input.count - 1)) },
                      (_, index) => (
                        <option key={index} value={index + 1}>
                          Tạo thử {index + 1} mẫu, chờ xác nhận phần còn lại
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <small>
                  Lượt chạy ngay có thể tạm dừng sau nhóm mẫu thử. Lượt theo
                  lịch tự tạo đủ tổng đã duyệt, không cần xác nhận giữa đêm.
                </small>
              </details>
              <details className="studio-span-full">
                <summary>Tùy chọn AI nâng cao</summary>
                <label htmlFor={`${id}-model`}>
                  Model cho lượt chạy này
                  <select
                    id={`${id}-model`}
                    value={input.imageModel || ai.imageModel || ""}
                    onChange={(e) => change("imageModel", e.target.value)}
                  >
                    <option value="">Chọn model</option>
                    {ai.imageModels?.models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </label>
                <small>
                  Model sẽ được chốt khi gửi duyệt. Chi phí được kiểm tra theo
                  tài khoản trước khi gửi từng request.
                </small>
                {ai.imageModelsError && (
                  <p className="studio-error" role="alert">
                    {ai.imageModelsError}
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  disabled={ai.imageModelsLoading || busy}
                  onClick={ai.refreshImageModels}
                >
                  Tải lại danh sách model
                </Button>
              </details>
            </div>
          )}
          {step === 3 && (
            <>
              <div className="studio-confirm-images">
                <figure>
                  <StudioImage
                    id={input.sourceId}
                    name="Ảnh ý tưởng tham khảo"
                  />
                  <figcaption>Ảnh ý tưởng tham khảo</figcaption>
                </figure>
                <figure>
                  {selected(input.thumbnailId)?.assetId && (
                    <StudioImage
                      id={selected(input.thumbnailId)!.assetId!}
                      name="Mẫu ảnh chính"
                    />
                  )}
                  <figcaption>Mẫu ảnh chính cửa hàng</figcaption>
                </figure>
              </div>
              <dl className="studio-summary">
                <div>
                  <dt>Ý tưởng</dt>
                  <dd>{input.title}</dd>
                </div>
                <div>
                  <dt>Cửa hàng / sản phẩm</dt>
                  <dd>
                    {shop?.name} · {selected(input.productId)?.name}
                  </dd>
                </div>
                <div>
                  <dt>Bộ hướng dẫn</dt>
                  <dd>{selected(input.skillId)?.name}</dd>
                </div>
                <div>
                  <dt>Kết quả dự kiến</dt>
                  <dd>{input.count} ảnh riêng biệt</dd>
                </div>
                <div>
                  <dt>Cách chạy</dt>
                  <dd>
                    {input.timing === "now" &&
                    input.sampleCount &&
                    input.sampleCount < input.count
                      ? `Tạo trước ${input.sampleCount} mẫu, chờ xác nhận để tạo ${input.count - input.sampleCount} mẫu còn lại`
                      : "Tạo đủ số mẫu sau khi được duyệt"}
                  </dd>
                </div>
                <div>
                  <dt>Thời điểm</dt>
                  <dd>
                    {input.timing === "night"
                      ? `Kỳ ${data.schedule?.dailyTime ?? "22:00"} kế tiếp sau khi được duyệt · UTC+7`
                      : "Sau khi Leader duyệt"}
                  </dd>
                </div>
                <div>
                  <dt>Yêu cầu</dt>
                  <dd className="studio-prewrap">{input.brief}</dd>
                </div>
              </dl>
              <p className="studio-note">
                Gửi duyệt chưa phát sinh phí AI. Khi chạy, hệ thống kiểm tra
                bảng giá và hạn mức từng request; số tiền thực tế phụ thuộc
                model. Sửa nội dung sau đó phải gửi duyệt lại.
              </p>
            </>
          )}
        </fieldset>
        <p className="studio-save-status" role="status">
          {input.title.trim() &&
          input.storeId &&
          savedContent !==
            JSON.stringify({
              ...input,
              imageModel: input.imageModel || ai.imageModel || "",
            }) &&
          !saveStatus.startsWith("Chưa lưu")
            ? "Có thay đổi — đang tự lưu…"
            : saveStatus || "Nháp tự lưu sau khi có tên ý tưởng và cửa hàng."}
        </p>
        <footer className="studio-wizard-actions">
          <Button
            type="button"
            variant="outline"
            disabled={step === 0 || busy}
            onClick={() => setStep(step - 1)}
          >
            <ArrowLeft size={17} />
            Quay lại
          </Button>
          <span>{busy ? "Đang xử lý…" : `Tài khoản: ${user.email}`}</span>
          {step === 3 && (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void save(false)}
            >
              <Save size={17} />
              Lưu bản nháp
            </Button>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? (
              <Loader2 className="animate-spin" size={17} />
            ) : step === 3 ? (
              <Send size={17} />
            ) : (
              <ArrowRight size={17} />
            )}
            {step === 3 ? "Gửi Leader duyệt" : "Tiếp tục"}
          </Button>
        </footer>
      </form>
    </div>
  );
}
