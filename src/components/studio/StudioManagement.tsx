import { StudioSelect } from "../ui/StudioSelect";
import { useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock3,
  FolderOpen,
  FileArchive,
  Layers3,
  Loader2,
  Pencil,
  Plus,
  Search,
  Settings2,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import { ManagementDialog } from "./ManagementDialog";
import { StoreProductPicker } from "./StoreProductPicker";
import "../../styles/management.css";
import { toast } from "sonner";
import { agentUpload } from "../../services/agent.service";
import {
  studioClient,
  type StudioBootstrap,
  type StudioResource,
  type StudioTeam,
  type StudioStore,
} from "../../services/studio.service";
import { notifyApiError } from "../../utils/api-error-toast";
import { ManagementResourceCard } from "./ManagementResourceCard";
import { Button } from "../ui/button";
import { TeamBudgetPanel } from "./TeamBudgetPanel";
import { StudioOperations } from "./StudioOperations";
import { ResourceBrowser } from "./ResourceBrowser";
import { Link } from "react-router";
import { useStudioNavigate } from "../../navigation";

export function StudioManagement({
  data,
  onRefresh,
  initialTab = "teams",
  initialType,
}: {
  data: StudioBootstrap;
  onRefresh: () => void;
  initialTab?: string;
  initialType?: StudioResource["type"];
}) {
  const tab = initialTab;
  const studioNavigate = useStudioNavigate();
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState<"team" | "store" | "resource">();
  const trigger = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  function openEditor(kind: "team" | "store" | "resource") {
    trigger.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setEditor(kind);
  }
  function newResource(selectedTeam: string, selectedType: string) {
    setTeamId(selectedTeam);
    setType((selectedType || "product") as StudioResource["type"]);
    setName("");
    setCode("");
    setInstructions("");
    setPreviousId("");
    setFile(undefined);
    setZip(undefined);
    setPrintEnabled(false);
    setPrintWidth("");
    setPrintHeight("");
    setPrintDpi("300");
    setPrintBackground("white");
    openEditor("resource");
  }
  const [team, setTeam] = useState<StudioTeam | undefined>();
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState<StudioTeam["members"]>([]);
  const [shop, setShop] = useState<StudioStore>();
  const [shopName, setShopName] = useState("");
  const [teamId, setTeamId] = useState(data.teams[0]?.id ?? "");
  const [sellerIds, setSellerIds] = useState<string[]>([]);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [type, setType] = useState<StudioResource["type"]>(
    initialType ?? "product",
  );
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [instructions, setInstructions] = useState("");
  const [printEnabled, setPrintEnabled] = useState(false);
  const [printWidth, setPrintWidth] = useState(""),
    [printHeight, setPrintHeight] = useState(""),
    [printDpi, setPrintDpi] = useState("300");
  const [printBackground, setPrintBackground] = useState<
    "transparent" | "white"
  >("white");
  const [file, setFile] = useState<File>();
  const [zip, setZip] = useState<File>();
  const [previousId, setPreviousId] = useState("");
  const chosenTeam = data.teams.find((item) => item.id === teamId);
  const changeSet = (list: string[], id: string, checked: boolean) =>
    checked ? [...list, id] : list.filter((value) => value !== id);
  async function act(work: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    try {
      await work();
      toast.success("Đã hoàn tất.");
      onRefresh();
    } catch (error) {
      notifyApiError(error);
    } finally {
      setBusy(false);
    }
  }
  const teamPicker = (
    <label>
      Nhóm
      <StudioSelect
        value={teamId}
        required
        disabled={busy || !!previousId || !!shop}
        onChange={(event) => {
          setTeamId(event.target.value);
          setSellerIds([]);
          setProductIds([]);
          setPreviousId("");
        }}
      >
        <option value="">Chọn nhóm</option>
        {data.teams.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </StudioSelect>
    </label>
  );
  return (
    <div className="management-workspace">
      <header className="management-heading">
        <div>
          <span className="studio-eyebrow">KHÔNG GIAN LÀM VIỆC</span>
          <h1>Thư viện & nhóm</h1>
          <p>Quản lý người tham gia, cửa hàng và tài nguyên dùng chung.</p>
        </div>
        <Link className="studio-link-button" to="/admin">
          <Settings2 size={16} />
          Quản trị công ty
          <ArrowUpRight size={14} />
        </Link>
      </header>
      <nav className="management-navigation" aria-label="Mục quản lý">
        {[
          { id: "teams", label: "Nhân sự & nhóm", icon: Users },
          { id: "stores", label: "Cửa hàng", icon: Store },
          { id: "library", label: "Thư viện", icon: FolderOpen },
          { id: "budget", label: "Ngân sách Team", icon: Wallet },
          { id: "operations", label: "Vận hành lịch", icon: Clock3 },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            aria-pressed={tab === id}
            aria-current={tab === id ? "page" : undefined}
            onClick={() => studioNavigate(`studio-manage?tab=${id}`)}
          >
            <Icon size={17} aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>
      {tab === "budget" && <TeamBudgetPanel teams={data.teams} />}
      {tab === "operations" && (
        <StudioOperations teams={data.teams} onScheduleChanged={onRefresh} />
      )}
      {tab === "teams" && (
        <section className="management-section">
          <header className="management-toolbar">
            <div>
              <h2>
                Nhân sự & nhóm{" "}
                <span className="management-count">{data.teams.length}</span>
              </h2>
              <p>Phân công thành viên và Leader cho từng nhóm.</p>
            </div>
            <Button
              onClick={() => {
                setTeam(undefined);
                setTeamName("");
                setMembers([]);
                setMemberQuery("");
                openEditor("team");
              }}
            >
              <Plus size={16} />
              Tạo nhóm
            </Button>
          </header>
          <label className="management-search" htmlFor="management-team-search">
            <Search size={17} aria-hidden="true" />
            <input
              id="management-team-search"
              value={query}
              placeholder="Tìm nhóm theo tên…"
              aria-label="Tìm nhóm"
              maxLength={100}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="management-entity-grid">
            {data.teams
              .filter((item) =>
                item.name
                  .toLocaleLowerCase()
                  .includes(query.trim().toLocaleLowerCase()),
              )
              .map((item) => (
                <article className="management-entity-card" key={item.id}>
                  <div className="management-entity-top">
                    <span className="management-entity-icon">
                      <Users size={22} />
                    </span>
                    <span className="management-status">
                      <CheckCircle2 size={13} />
                      Đang hoạt động
                    </span>
                  </div>
                  <h3>{item.name}</h3>
                  <p>
                    {item.members.length} thành viên ·{" "}
                    {item.members.filter((m) => m.role === "leader").length}{" "}
                    Leader
                  </p>
                  <div
                    className="management-avatars"
                    aria-label={`${item.members.length} thành viên`}
                  >
                    {item.members.slice(0, 4).map((member) => (
                      <span
                        key={member.userId}
                        title={
                          data.users.find((u) => u.id === member.userId)
                            ?.email ?? "Thành viên"
                        }
                      >
                        {(data.users.find((u) => u.id === member.userId)
                          ?.email ?? "N")[0].toUpperCase()}
                      </span>
                    ))}
                    <small>
                      {
                        data.stores.filter((store) => store.teamId === item.id)
                          .length
                      }{" "}
                      cửa hàng
                    </small>
                  </div>
                  <Button
                    variant="outline"
                    aria-label={`Chỉnh sửa nhóm ${item.name}`}
                    onClick={() => {
                      setTeam(item);
                      setTeamName(item.name);
                      setMembers(item.members);
                      setMemberQuery("");
                      openEditor("team");
                    }}
                  >
                    <Pencil size={15} />
                    Chỉnh sửa nhóm
                  </Button>
                </article>
              ))}
          </div>
          {!data.teams.some((item) =>
            item.name
              .toLocaleLowerCase()
              .includes(query.trim().toLocaleLowerCase()),
          ) && (
            <div className="management-empty">
              <Users size={32} />
              <h3>
                {data.teams.length
                  ? "Không tìm thấy nhóm"
                  : "Bắt đầu với nhóm đầu tiên"}
              </h3>
              <p>
                {data.teams.length
                  ? "Thử một tên khác hoặc xóa từ khóa tìm kiếm."
                  : "Tạo nhóm, chọn thành viên và chỉ định Leader để bắt đầu."}
              </p>
            </div>
          )}
          <ManagementDialog
            open={editor === "team"}
            title={team ? "Chỉnh sửa nhóm" : "Tạo nhóm"}
            description="Chọn người tham gia và phân công vai trò trong nhóm."
            busy={busy}
            onClose={() => setEditor(undefined)}
            trigger={trigger}
          >
            <form
              className="management-form"
              onSubmit={(event) => {
                event.preventDefault();
                void act(async () => {
                  const input = { name: teamName, members, archived: false };
                  await (team
                    ? studioClient.patch(`/teams/${team.id}`, {
                        ...input,
                        revision: team.revision,
                      })
                    : studioClient.post("/teams", input));
                  setTeam(undefined);
                  setTeamName("");
                  setMembers([]);
                  setEditor(undefined);
                });
              }}
            >
              <fieldset
                disabled={busy}
                className="management-form-body studio-form-grid"
              >
                <label>
                  Tên nhóm
                  <input
                    type="text"
                    required
                    maxLength={160}
                    value={teamName}
                    onChange={(event) => setTeamName(event.target.value)}
                  />
                </label>
                <fieldset className="studio-member-list">
                  <legend>
                    Thành viên và vai trò · {members.length} đã chọn
                  </legend>
                  <label htmlFor="management-member-search">
                    Tìm nhân viên
                    <input
                      id="management-member-search"
                      value={memberQuery}
                      maxLength={100}
                      placeholder="Tìm theo email…"
                      onChange={(e) => setMemberQuery(e.target.value)}
                    />
                  </label>
                  {!data.users.length && (
                    <small>
                      Chưa có tài khoản nhân viên. Thêm tài khoản ở Quản trị
                      công ty.
                    </small>
                  )}
                  {data.users
                    .filter(
                      (account) =>
                        (!account.disabled ||
                          members.some((m) => m.userId === account.id)) &&
                        account.email
                          .toLocaleLowerCase()
                          .includes(memberQuery.trim().toLocaleLowerCase()),
                    )
                    .map((account) => {
                      const member = members.find(
                        (value) => value.userId === account.id,
                      );
                      return (
                        <div key={account.id}>
                          <label className="studio-check">
                            <input
                              type="checkbox"
                              checked={!!member}
                              onChange={(event) =>
                                setMembers(
                                  event.target.checked
                                    ? [
                                        ...members,
                                        { userId: account.id, role: "seller" },
                                      ]
                                    : members.filter(
                                        (value) => value.userId !== account.id,
                                      ),
                                )
                              }
                            />
                            {account.email}
                            {account.disabled && (
                              <small>Đã khóa · bỏ khỏi nhóm để lưu</small>
                            )}
                          </label>
                          {member && (
                            <StudioSelect
                              aria-label={`Vai trò của ${account.email}`}
                              kind="role"
                              value={member.role}
                              onChange={(event) =>
                                setMembers(
                                  members.map((value) =>
                                    value.userId === account.id
                                      ? {
                                          ...value,
                                          role: event.target.value as
                                            "leader" | "seller",
                                        }
                                      : value,
                                  ),
                                )
                              }
                            >
                              <option value="seller">Nhân viên</option>
                              <option value="leader">
                                Leader · có quyền duyệt
                              </option>
                            </StudioSelect>
                          )}
                        </div>
                      );
                    })}
                </fieldset>
              </fieldset>
              <div className="management-form-footer">
                <Button disabled={busy || !teamName.trim()}>
                  {busy ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Check size={16} />
                  )}
                  Lưu nhóm
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setEditor(undefined)}
                >
                  Hủy
                </Button>
              </div>
            </form>
          </ManagementDialog>
        </section>
      )}
      {tab === "stores" && (
        <section className="management-section">
          <header className="management-toolbar">
            <div>
              <h2>
                Cửa hàng{" "}
                <span className="management-count">{data.stores.length}</span>
              </h2>
              <p>Gắn cửa hàng với nhóm, nhân viên và các sản phẩm được dùng.</p>
            </div>
            <Button
              disabled={!data.teams.length}
              onClick={() => {
                setShop(undefined);
                setShopName("");
                setTeamId(data.teams[0]?.id ?? "");
                setSellerIds([]);
                setProductIds([]);
                openEditor("store");
              }}
            >
              <Plus size={16} />
              Tạo cửa hàng
            </Button>
          </header>
          <label
            className="management-search"
            htmlFor="management-store-search"
          >
            <Search size={17} aria-hidden="true" />
            <input
              id="management-store-search"
              value={query}
              placeholder="Tìm cửa hàng hoặc nhóm…"
              aria-label="Tìm cửa hàng"
              maxLength={100}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="management-entity-grid">
            {data.stores
              .filter((item) =>
                (
                  item.name +
                  " " +
                  (data.teams.find((t) => t.id === item.teamId)?.name ?? "")
                )
                  .toLocaleLowerCase()
                  .includes(query.trim().toLocaleLowerCase()),
              )
              .map((item) => (
                <article className="management-entity-card" key={item.id}>
                  <div className="management-entity-top">
                    <span className="management-entity-icon">
                      <Store size={22} />
                    </span>
                    <span className="management-status">
                      <CheckCircle2 size={13} />
                      Đang hoạt động
                    </span>
                  </div>
                  <h3>{item.name}</h3>
                  <p>{data.teams.find((t) => t.id === item.teamId)?.name}</p>
                  <div className="management-card-facts">
                    <span>
                      <Users size={15} />
                      {item.sellerIds.length} nhân viên
                    </span>
                    <span>
                      <Layers3 size={15} />
                      {item.productIds.length} sản phẩm
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    aria-label={`Chỉnh sửa cửa hàng ${item.name}`}
                    onClick={() => {
                      setShop(item);
                      setShopName(item.name);
                      setTeamId(item.teamId);
                      setSellerIds(item.sellerIds);
                      setProductIds(item.productIds);
                      openEditor("store");
                    }}
                  >
                    <Pencil size={15} />
                    Chỉnh sửa cửa hàng
                  </Button>
                </article>
              ))}
          </div>
          {!data.stores.length && (
            <div className="management-empty">
              <Store size={32} />
              <h3>Chưa có cửa hàng</h3>
              <p>
                {data.teams.length
                  ? "Thêm cửa hàng để nhân viên bắt đầu tạo ý tưởng và mockup."
                  : "Tạo một nhóm trước khi thêm cửa hàng."}
              </p>
            </div>
          )}
          {!!data.stores.length &&
            !data.stores.some((item) =>
              (
                item.name +
                " " +
                (data.teams.find((t) => t.id === item.teamId)?.name ?? "")
              )
                .toLocaleLowerCase()
                .includes(query.trim().toLocaleLowerCase()),
            ) && (
              <div className="management-empty">
                <Search size={32} />
                <h3>Không tìm thấy cửa hàng</h3>
                <p>Thử tên cửa hàng hoặc nhóm khác.</p>
              </div>
            )}
          <ManagementDialog
            open={editor === "store"}
            title={shop ? "Chỉnh sửa cửa hàng" : "Tạo cửa hàng"}
            description="Cấu hình quyền truy cập và sản phẩm cho cửa hàng."
            busy={busy}
            onClose={() => setEditor(undefined)}
            trigger={trigger}
          >
            <form
              className="management-form"
              onSubmit={(event) => {
                event.preventDefault();
                void act(async () => {
                  const input = {
                    name: shopName,
                    teamId,
                    sellerIds,
                    productIds,
                    archived: false,
                  };
                  await (shop
                    ? studioClient.patch(`/stores/${shop.id}`, {
                        ...input,
                        revision: shop.revision,
                      })
                    : studioClient.post("/stores", input));
                  setShop(undefined);
                  setShopName("");
                  setSellerIds([]);
                  setProductIds([]);
                  setEditor(undefined);
                });
              }}
            >
              <fieldset
                disabled={busy}
                className="management-form-body studio-form-grid"
              >
                <label>
                  Tên cửa hàng
                  <input
                    type="text"
                    required
                    maxLength={160}
                    value={shopName}
                    onChange={(event) => setShopName(event.target.value)}
                  />
                </label>
                {teamPicker}
                <fieldset>
                  <legend>Nhân viên được truy cập</legend>
                  {chosenTeam?.members.map((member) => (
                    <label className="studio-check" key={member.userId}>
                      <input
                        type="checkbox"
                        checked={sellerIds.includes(member.userId)}
                        onChange={(event) =>
                          setSellerIds(
                            changeSet(
                              sellerIds,
                              member.userId,
                              event.target.checked,
                            ),
                          )
                        }
                      />
                      {data.users.find(
                        (account) => account.id === member.userId,
                      )?.email ?? member.userId}
                    </label>
                  ))}
                  <small>
                    Leader được xem và duyệt các cửa hàng trong nhóm.
                  </small>
                </fieldset>
                <fieldset>
                  <legend>Sản phẩm được phép dùng</legend>
                  <StoreProductPicker
                    key={teamId}
                    teamId={teamId}
                    value={productIds}
                    onChange={setProductIds}
                  />
                </fieldset>
              </fieldset>
              <div className="management-form-footer">
                <Button disabled={busy || !teamId || !shopName.trim()}>
                  Lưu cửa hàng
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setEditor(undefined)}
                >
                  Hủy
                </Button>
              </div>
            </form>
          </ManagementDialog>
        </section>
      )}
      {tab === "library" && (
        <>
          <ManagementDialog
            open={editor === "resource"}
            title={previousId ? "Tạo phiên bản mới" : "Thêm tài nguyên"}
            description="Tài nguyên được chia sẻ trong nhóm. Phiên bản mới không thay đổi công việc cũ."
            busy={busy}
            onClose={() => setEditor(undefined)}
            trigger={trigger}
          >
            <form
              id="studio-library-form"
              className="management-form"
              onSubmit={(event) => {
                event.preventDefault();
                void act(async () => {
                  if (type === "skill" && zip) {
                    const form = new FormData();
                    form.append("teamId", teamId);
                    form.append("name", name);
                    form.append("code", code);
                    form.append("file", zip);
                    if (previousId) form.append("previousId", previousId);
                    await studioClient.post("/skills/import", form);
                  } else {
                    const asset = file
                      ? await agentUpload(file, "template", code)
                      : undefined;
                    await studioClient.post("/resources", {
                      teamId,
                      name,
                      code,
                      type,
                      instructions,
                      ...(asset ? { assetId: asset.id } : {}),
                      ...(previousId ? { previousId } : {}),
                      ...(type === "product" && printEnabled
                        ? {
                            printSpec: {
                              width: Number(printWidth),
                              height: Number(printHeight),
                              dpi: Number(printDpi),
                              background: printBackground,
                            },
                          }
                        : {}),
                    });
                  }
                  setName("");
                  setCode("");
                  setInstructions("");
                  setFile(undefined);
                  setZip(undefined);
                  setPreviousId("");
                  setEditor(undefined);
                });
              }}
            >
              <fieldset
                disabled={busy}
                className="management-form-body studio-form-grid"
              >
                {teamPicker}
                <label>
                  Loại nội dung
                  <StudioSelect
                    value={type}
                    disabled={!!previousId}
                    onChange={(event) => {
                      setType(event.target.value as StudioResource["type"]);
                      setPreviousId("");
                      setFile(undefined);
                      setZip(undefined);
                    }}
                  >
                    <option value="product">Sản phẩm</option>
                    <option value="skill">Bộ hướng dẫn (ZIP)</option>
                    <option value="thumbnail">Mẫu ảnh chính</option>
                    <option value="scene">
                      Mẫu mockup Etsy (ảnh tham chiếu)
                    </option>
                  </StudioSelect>
                </label>
                {type === "scene" && (
                  <p className="studio-note studio-span-full">
                    Upload ảnh mockup mẫu bạn đã có từ Etsy Library. Mỗi ảnh
                    được lưu thành một mẫu; duyệt mẫu để nhân viên có thể chọn
                    nhiều ảnh làm bộ bối cảnh trong Mockup Studio. Ảnh này là
                    ảnh đích cần ghép sản phẩm nguồn vào.
                  </p>
                )}
                <label>
                  Tên hiển thị
                  <input
                    type="text"
                    required
                    value={name}
                    maxLength={160}
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>
                <label>
                  Mã nhận diện
                  <input
                    type="text"
                    required
                    value={code}
                    disabled={!!previousId}
                    maxLength={80}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="Ví dụ: P01, SK02, M01"
                  />
                </label>
                {type === "product" && (
                  <fieldset className="studio-span-full">
                    <legend>Quy chuẩn artwork của sản phẩm</legend>
                    <label className="studio-check">
                      <input
                        type="checkbox"
                        checked={printEnabled}
                        onChange={(e) => setPrintEnabled(e.target.checked)}
                      />
                      Khai báo kích thước file in
                    </label>
                    {printEnabled && (
                      <div className="studio-form-grid">
                        <label htmlFor="studio-print-width">
                          Chiều rộng (pixel)
                          <input
                            id="studio-print-width"
                            type="number"
                            min={64}
                            max={8192}
                            required
                            value={printWidth}
                            onChange={(e) => setPrintWidth(e.target.value)}
                          />
                        </label>
                        <label htmlFor="studio-print-height">
                          Chiều cao (pixel)
                          <input
                            id="studio-print-height"
                            type="number"
                            min={64}
                            max={8192}
                            required
                            value={printHeight}
                            onChange={(e) => setPrintHeight(e.target.value)}
                          />
                        </label>
                        <label htmlFor="studio-print-dpi">
                          DPI
                          <input
                            id="studio-print-dpi"
                            type="number"
                            min={72}
                            max={600}
                            required
                            value={printDpi}
                            onChange={(e) => setPrintDpi(e.target.value)}
                          />
                        </label>
                        <label htmlFor="studio-print-background">
                          Nền artwork
                          <StudioSelect
                            id="studio-print-background"
                            value={printBackground}
                            onChange={(e) =>
                              setPrintBackground(
                                e.target.value as "transparent" | "white",
                              )
                            }
                          >
                            <option value="white">Trắng</option>
                            <option value="transparent">Trong suốt</option>
                          </StudioSelect>
                        </label>
                        <p className="studio-note">
                          Nhập theo quy chuẩn nhà in, tối đa 32 megapixel.
                          Metadata DPI không đảm bảo độ nét hoặc chất lượng
                          thiết kế.
                        </p>
                      </div>
                    )}
                  </fieldset>
                )}
                {type === "skill" ? (
                  <div className="studio-span-full">
                    <label>
                      Phiên bản trước (nếu cập nhật)
                      <StudioSelect
                        value={previousId}
                        onChange={(event) => {
                          const previous = data.resources.find(
                            (item) => item.id === event.target.value,
                          );
                          setPreviousId(event.target.value);
                          if (previous) {
                            setCode(previous.code);
                            setName(previous.name);
                          }
                        }}
                      >
                        <option value="">Bộ hướng dẫn mới</option>
                        {data.resources
                          .filter(
                            (item) =>
                              item.type === "skill" && item.teamId === teamId,
                          )
                          .map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.code} · v{item.versionNumber ?? 1} ·{" "}
                              {item.name}
                            </option>
                          ))}
                      </StudioSelect>
                    </label>
                    <label className="studio-upload">
                      <FileArchive aria-hidden="true" />
                      <strong>Chọn ZIP có SKILL.md</strong>
                      <input
                        key={`zip-${code ? "selected" : "empty"}`}
                        type="file"
                        accept=".zip"
                        required
                        onChange={(event) => setZip(event.target.files?.[0])}
                      />
                      <small>
                        Tối đa 50 MB. Chỉ đọc tài liệu và tài nguyên; không chạy
                        script từ ZIP.
                      </small>
                    </label>
                  </div>
                ) : (
                  <>
                    {["thumbnail", "scene"].includes(type) && (
                      <label>
                        Ảnh mẫu
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          required={!previousId}
                          onChange={(event) => setFile(event.target.files?.[0])}
                        />
                      </label>
                    )}
                    <label className="studio-span-full">
                      Mô tả / quy tắc sản phẩm
                      <textarea
                        rows={3}
                        value={instructions}
                        maxLength={40000}
                        onChange={(event) =>
                          setInstructions(event.target.value)
                        }
                      />
                    </label>

                  </>
                )}
              </fieldset>
              <div className="management-form-footer">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setEditor(undefined)}
                >
                  Hủy
                </Button>
                <Button
                  disabled={
                    busy ||
                    !teamId ||
                    !name ||
                    !code ||
                    (type === "skill" && !zip)
                  }
                >
                  {busy ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Plus size={16} />
                  )}
                  {previousId && type !== "skill"
                    ? "Lưu phiên bản mới"
                    : `Thêm ${type === "skill" ? "& kiểm tra ZIP" : "vào thư viện"}`}
                </Button>
              </div>
            </form>
          </ManagementDialog>
          <ResourceBrowser
            teams={data.teams}
            refreshToken={data.resources}
            onCreate={newResource}
          >
            {(items) => (
              <div className="studio-resource-grid">
                {items.map((item) => (
                  <ManagementResourceCard
                    key={item.id}
                    resource={item}
                    teamName={
                      data.teams.find((t) => t.id === item.teamId)?.name ?? ""
                    }
                    busy={busy}
                    act={act}
                    onEdit={() => {
                      setTeamId(item.teamId);
                      setType(item.type);
                      setName(item.name);
                      setCode(item.code);
                      setInstructions(item.instructions);
                      setPreviousId(item.id);
                      setFile(undefined);
                      setZip(undefined);
                      setPrintEnabled(!!item.printSpec);
                      setPrintWidth(
                        item.printSpec ? String(item.printSpec.width) : "",
                      );
                      setPrintHeight(
                        item.printSpec ? String(item.printSpec.height) : "",
                      );
                      setPrintDpi(String(item.printSpec?.dpi ?? 300));
                      setPrintBackground(item.printSpec?.background ?? "white");
                      openEditor("resource");
                    }}
                  />
                ))}
              </div>
            )}
          </ResourceBrowser>
        </>
      )}
    </div>
  );
}
