import { useState } from "react";
import { Check, FileArchive, Loader2, Plus, Settings2 } from "lucide-react";
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
import { StudioImage } from "./StudioImage";
import { Button } from "../ui/button";
import { SkillVersionCard } from "./SkillVersionCard";
import { TeamBudgetPanel } from "./TeamBudgetPanel";
import { StudioOperations } from "./StudioOperations";
import { ResourceBrowser } from "./ResourceBrowser";
import { ResourceVersions } from "./ResourceVersions";

export function StudioManagement({
  data,
  onRefresh,
}: {
  data: StudioBootstrap;
  onRefresh: () => void;
}) {
  const [tab, setTab] = useState("teams");
  const [busy, setBusy] = useState(false);
  const [team, setTeam] = useState<StudioTeam | undefined>();
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState<StudioTeam["members"]>([]);
  const [shop, setShop] = useState<StudioStore>();
  const [shopName, setShopName] = useState("");
  const [teamId, setTeamId] = useState(data.teams[0]?.id ?? "");
  const [sellerIds, setSellerIds] = useState<string[]>([]);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [type, setType] = useState<StudioResource["type"]>("product");
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
      toast.success("Đã lưu cấu hình.");
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
      <select
        value={teamId}
        required
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
      </select>
    </label>
  );
  return (
    <div>
      <header className="studio-page-heading">
        <div>
          <span className="studio-eyebrow">
            CẤU HÌNH MỘT LẦN, CẢ NHÓM CÙNG DÙNG
          </span>
          <h1>Quản lý không gian sáng tạo</h1>
          <p>Cấp đúng cửa hàng, sản phẩm và bộ hướng dẫn cho từng nhóm.</p>
        </div>
        <a className="studio-link-button" href="#admin">
          <Settings2 size={17} />
          Tài khoản, hạn mức & nhật ký
        </a>
      </header>
      <div className="studio-tabs" role="group" aria-label="Mục quản lý">
        {[
          ["teams", "Nhân sự & nhóm"],
          ["stores", "Cửa hàng"],
          ["library", "Thư viện"],
          ["budget", "Ngân sách Team"],
          ["operations", "Vận hành lịch"],
        ].map(([id, label]) => (
          <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "budget" && <TeamBudgetPanel teams={data.teams} />}
      {tab === "operations" && (
        <StudioOperations teams={data.teams} onScheduleChanged={onRefresh} />
      )}
      {tab === "teams" && (
        <div className="studio-management-grid">
          <section className="studio-card">
            <h2>Nhóm đang hoạt động</h2>
            {!data.teams.length && (
              <p>Tạo nhóm đầu tiên, sau đó thêm sản phẩm và cửa hàng.</p>
            )}
            {data.teams.map((item) => (
              <button
                className="studio-list-row"
                key={item.id}
                onClick={() => {
                  setTeam(item);
                  setTeamName(item.name);
                  setMembers(item.members);
                }}
              >
                <strong>{item.name}</strong>
                <span>{item.members.length} thành viên · chỉnh sửa</span>
              </button>
            ))}
          </section>
          <form
            className="studio-card studio-form-grid"
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
              });
            }}
          >
            <h2>{team ? "Chỉnh sửa nhóm" : "Tạo nhóm"}</h2>
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
              <legend>Thành viên và vai trò</legend>
              {data.users
                .filter((account) => !account.disabled)
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
                      </label>
                      {member && (
                        <select
                          aria-label={`Vai trò của ${account.email}`}
                          value={member.role}
                          onChange={(event) =>
                            setMembers(
                              members.map((value) =>
                                value.userId === account.id
                                  ? {
                                      ...value,
                                      role: event.target.value as
                                        | "leader"
                                        | "seller",
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
                        </select>
                      )}
                    </div>
                  );
                })}
            </fieldset>
            <div className="studio-action-row">
              <Button disabled={busy || !teamName.trim()}>
                {busy ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Check size={16} />
                )}
                Lưu nhóm
              </Button>
              {team && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setTeam(undefined);
                    setTeamName("");
                    setMembers([]);
                  }}
                >
                  Tạo nhóm khác
                </Button>
              )}
            </div>
          </form>
        </div>
      )}
      {tab === "stores" && (
        <div className="studio-management-grid">
          <section className="studio-card">
            <h2>Cửa hàng</h2>
            {data.stores.map((item) => (
              <button
                className="studio-list-row"
                key={item.id}
                onClick={() => {
                  setShop(item);
                  setShopName(item.name);
                  setTeamId(item.teamId);
                  setSellerIds(item.sellerIds);
                  setProductIds(item.productIds);
                }}
              >
                <strong>{item.name}</strong>
                <span>
                  {data.teams.find((value) => value.id === item.teamId)?.name} ·{" "}
                  {item.productIds.length} sản phẩm
                </span>
              </button>
            ))}
          </section>
          <form
            className="studio-card studio-form-grid"
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
              });
            }}
          >
            <h2>{shop ? "Chỉnh sửa cửa hàng" : "Tạo cửa hàng"}</h2>
            <label>
              Tên cửa hàng
              <input
                type="text"
                required
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
                  {data.users.find((account) => account.id === member.userId)
                    ?.email ?? member.userId}
                </label>
              ))}
              <small>Leader được xem và duyệt các cửa hàng trong nhóm.</small>
            </fieldset>
            <fieldset>
              <legend>Sản phẩm được phép dùng</legend>
              {data.resources
                .filter(
                  (item) =>
                    item.teamId === teamId &&
                    item.type === "product" &&
                    item.status === "approved",
                )
                .map((item) => (
                  <label key={item.id} className="studio-check">
                    <input
                      type="checkbox"
                      checked={productIds.includes(item.id)}
                      onChange={(event) =>
                        setProductIds(
                          changeSet(productIds, item.id, event.target.checked),
                        )
                      }
                    />
                    {item.code} · {item.name}
                  </label>
                ))}
            </fieldset>
            <div className="studio-action-row">
              <Button disabled={busy || !teamId || !shopName.trim()}>
                Lưu cửa hàng
              </Button>
              {shop && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShop(undefined);
                    setShopName("");
                    setSellerIds([]);
                    setProductIds([]);
                  }}
                >
                  Tạo cửa hàng khác
                </Button>
              )}
            </div>
          </form>
        </div>
      )}
      {tab === "library" && (
        <>
          <section className="studio-card">
            <h2>Thêm vào thư viện</h2>
            <p>
              Bản mới không ghi đè nội dung đã được dùng trong lượt chạy cũ.
            </p>
            <form
              id="studio-library-form"
              className="studio-form-grid"
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
                });
              }}
            >
              {teamPicker}
              <label>
                Loại nội dung
                <select
                  value={type}
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
                  <option value="scene">Mẫu bối cảnh</option>
                </select>
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
                        <select
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
                        </select>
                      </label>
                      <p className="studio-note">
                        Nhập theo quy chuẩn nhà in, tối đa 32 megapixel.
                        Metadata DPI không đảm bảo độ nét hoặc chất lượng thiết
                        kế.
                      </p>
                    </div>
                  )}
                </fieldset>
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
                  maxLength={80}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="Ví dụ: P01, SK02, M01"
                />
              </label>
              {type === "skill" ? (
                <div className="studio-span-full">
                  <label>
                    Phiên bản trước (nếu cập nhật)
                    <select
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
                    </select>
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
                  <label className="studio-span-full">
                    Mô tả / quy tắc sản phẩm
                    <textarea
                      rows={3}
                      value={instructions}
                      maxLength={40000}
                      onChange={(event) => setInstructions(event.target.value)}
                    />
                  </label>
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
                </>
              )}
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
            </form>
          </section>
          <ResourceBrowser teams={data.teams} refreshToken={data.resources}>
            {(items) => (
              <div className="studio-resource-grid">
                {items.map((item) => (
                  <article key={item.id} className="studio-card">
                    {item.assetId && (
                      <StudioImage id={item.assetId} name={item.name} />
                    )}
                    <span className="studio-eyebrow">
                      {item.type} · {item.code}
                    </span>
                    <h3>{item.name}</h3>
                    <p>
                      {
                        data.teams.find((value) => value.id === item.teamId)
                          ?.name
                      }{" "}
                      ·{" "}
                      {item.status === "approved"
                        ? "Đã duyệt"
                        : item.status === "pending"
                          ? "Cần kiểm tra"
                          : "Đã lưu trữ"}
                    </p>
                    {item.issues.map((issue) => (
                      <p key={issue} className="studio-error">
                        {issue}
                      </p>
                    ))}
                    {item.type !== "skill" && (
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          setTeamId(item.teamId);
                          setType(item.type);
                          setName(item.name);
                          setCode(item.code);
                          setInstructions(item.instructions);
                          setPreviousId(item.id);
                          setFile(undefined);
                          setPrintEnabled(!!item.printSpec);
                          setPrintWidth(
                            item.printSpec ? String(item.printSpec.width) : "",
                          );
                          setPrintHeight(
                            item.printSpec ? String(item.printSpec.height) : "",
                          );
                          setPrintDpi(String(item.printSpec?.dpi ?? 300));
                          setPrintBackground(
                            item.printSpec?.background ?? "white",
                          );
                          document
                            .getElementById("studio-library-form")
                            ?.scrollIntoView({ block: "start" });
                        }}
                      >
                        Chỉnh sửa bằng phiên bản mới
                      </Button>
                    )}
                    {item.printSpec && (
                      <p>
                        {item.printSpec.width} × {item.printSpec.height} pixel ·{" "}
                        {item.printSpec.dpi} DPI · nền{" "}
                        {item.printSpec.background === "transparent"
                          ? "trong suốt"
                          : "trắng"}
                      </p>
                    )}
                    {item.type !== "skill" && (
                      <ResourceVersions resource={item} />
                    )}
                    {item.files && (
                      <details>
                        <summary>
                          {item.files.length} file trong bộ hướng dẫn
                        </summary>
                        <ul>
                          {item.files.map((file) => (
                            <li key={file.path}>{file.path}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                    {item.type === "skill" && (
                      <SkillVersionCard
                        resource={item}
                        busy={busy}
                        act={act}
                        upgrade={(resource) => {
                          setTeamId(resource.teamId);
                          setType("skill");
                          setPreviousId(resource.id);
                          setName(resource.name);
                          setCode(resource.code);
                          setZip(undefined);
                          document
                            .getElementById("studio-library-form")
                            ?.scrollIntoView({ block: "start" });
                        }}
                      />
                    )}
                    {item.status === "pending" && (
                      <Button
                        disabled={
                          busy ||
                          !!item.issues.length ||
                          (!!item.importState && item.importState !== "ready")
                        }
                        onClick={() =>
                          void act(() =>
                            studioClient.post(`/resources/${item.id}/review`, {
                              revision: item.revision,
                              status: "approved",
                            }),
                          )
                        }
                      >
                        Duyệt để sử dụng
                      </Button>
                    )}
                    {item.status === "approved" && (
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          void act(() =>
                            studioClient.post(`/resources/${item.id}/review`, {
                              revision: item.revision,
                              status: "archived",
                            }),
                          )
                        }
                      >
                        Ngừng sử dụng
                      </Button>
                    )}
                  </article>
                ))}
              </div>
            )}
          </ResourceBrowser>
        </>
      )}
    </div>
  );
}
