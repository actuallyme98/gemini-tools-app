import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";

async function setup(page: Page, role: "admin" | "designer" = "admin") {
  const rootId = randomUUID();
  const staffId = randomUUID();
  const now = new Date().toISOString();
  const profile = {
    id: role === "admin" ? rootId : staffId,
    email: role === "admin" ? "root@lcgmedia.uk" : "staff@lcgmedia.uk",
    role,
  };
  let users = Array.from({ length: 26 }, (_, index) => ({
    id: index === 0 ? rootId : index === 1 ? staffId : randomUUID(),
    email:
      index === 0
        ? "root@lcgmedia.uk"
        : index === 1
          ? "staff@lcgmedia.uk"
          : `designer${index}@lcgmedia.uk`,
    role: index === 0 ? "admin" : "designer",
    disabled: false,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
    hasPassword: true,
    googleLinked: index === 1,
    usage: {
      run: { count: index, bytes: 0 },
      asset: { count: index + 1, bytes: 2048 },
      session: { count: 1, bytes: 0 },
    },
  }));
  let company = {
    id: "company",
    protectedAdminId: rootId,
    name: "LCG Media",
    googleAllowedDomains: ["lcgmedia.uk"],
    googleAutoProvision: true,
    queuePaused: false,
    updatedAt: now,
  };
  const run = {
    id: randomUUID(),
    owner: staffId,
    ownerEmail: "staff@lcgmedia.uk",
    conversationId: randomUUID(),
    state: "queued",
    operation: "mockup_ai",
    count: 3,
    provider: "shopaikey",
    imageModel: "gemini-image-test",
    productType: "Ornament",
    createdAt: now,
    updatedAt: now,
    requestId: randomUUID(),
  };
  const audit = [
    {
      id: randomUUID(),
      actorEmail: "root@lcgmedia.uk",
      action: "account.disabled",
      target: staffId,
      createdAt: now,
      outcome: "success",
      details: { reason: "Employee access changed" },
    },
  ];
  const writes: { path: string; body: Record<string, unknown> }[] = [];
  const adminReads: string[] = [];
  const errors: string[] = [];
  const unexpected: string[] = [];
  let userFailure = false;
  let overviewFailure = false;
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace("/api/agent", "");
    const method = req.method();
    const json = (data: unknown, status = 200) =>
      route.fulfill({ status, json: data });
    if (url.pathname === "/api/ai/providers")
      return json({
        defaults: {
          text: "shopaikey",
          vision: "shopaikey",
          image: "shopaikey",
        },
        providers: [
          {
            id: "shopaikey",
            name: "ShopAIKey",
            available: true,
            capabilities: ["text", "vision", "image"],
            routing: {
              text: "shopaikey",
              vision: "shopaikey",
              image: "shopaikey",
            },
          },
        ],
      });
    if (url.pathname.includes("/image-models"))
      return json({
        provider: "shopaikey",
        defaultModel: "gemini-image-test",
        models: [{ id: "gemini-image-test", name: "Gemini Image" }],
      });
    if (path === "/auth/status")
      return json({ enabled: true, setupRequired: false });
    if (path === "/auth/login")
      return json({ token: "a".repeat(64), user: profile });
    if (path === "/auth/me") return json(profile);
    if (url.pathname === "/api/image-jobs") return json([]);
    if (path === "/history") return json({ items: [], nextCursor: null, hasMore: false });
    if (path === "/workflows") return json([]);
    if (["/conversations", "/assets", "/templates", "/runs"].includes(path))
      return json([]);
    if (path.startsWith("/admin/") && method === "GET") adminReads.push(path);
    if (path === "/admin/overview") {
      if (overviewFailure)
        return json({ message: "Không truy cập được dữ liệu Agent." }, 503);
      return json({
        totals: [
          { _id: "user", count: users.length },
          { _id: "asset", count: 320 },
          { _id: "template", count: 6 },
        ],
        runs: [
          { _id: "running", count: 4 },
          { _id: "review", count: 5 },
          { _id: "failed", count: 3 },
        ],
        steps: [],
        storage: [{ count: 320, bytes: 12345678, backups: 2 }],
        daily: [{ _id: now.slice(0, 10), count: 10 }],
        sessions: [{ count: 12 }],
        generatedAt: now,
        queuePaused: company.queuePaused,
      });
    }
    if (path === "/admin/users" && method === "GET") {
      const search = url.searchParams.get("search") || "";
      const roleFilter = url.searchParams.get("role");
      const disabled = url.searchParams.get("disabled");
      const current = Number(url.searchParams.get("page") || 1);
      const filtered = users.filter(
        (user) =>
          user.email.toLowerCase().includes(search.toLowerCase()) &&
          (!roleFilter || user.role === roleFilter) &&
          (disabled === null ||
            disabled === "" ||
            String(user.disabled) === disabled),
      );
      return json({
        items: filtered.slice((current - 1) * 25, current * 25),
        total: filtered.length,
        page: current,
        limit: 25,
        protectedAdminId: rootId,
      });
    }
    if (path === "/admin/settings" && method === "GET")
      return json({
        company,
        runtime: {
          agentEnabled: true,
          workerEnabled: true,
          concurrency: 3,
          sessionHours: 24,
          googleConfigured: false,
          logRetentionDays: 7,
          logImageLimitBytes: 536870912,
          assetEncryption: true,
          storagePrefix: "gemini-tools",
          providers: {
            providers: [
              {
                id: "shopaikey",
                available: true,
                capabilities: ["image", "vision"],
              },
            ],
          },
        },
      });
    if (path === "/admin/runs" && method === "GET")
      return json({ items: [run], total: 1, page: 1, limit: 25 });
    if (path.endsWith("/steps"))
      return json([
        {
          id: randomUUID(),
          index: 0,
          type: "image",
          state: "failed",
          error: "Không tải được ảnh từ kho lưu trữ.",
          errorCode: "STORAGE_ERROR",
          requestId: "request-storage-error",
          durationMs: 1200,
        },
      ]);
    if (path === "/admin/audit")
      return json({ items: audit, total: audit.length, page: 1, limit: 25 });
    if (path === "/admin/diagnostics")
      return json({
        items: [
          {
            timestamp: now,
            event: "http_completed",
            status: 500,
            path: "/api/image",
            requestId: "request-storage-error",
            message: "Không tải được ảnh.",
            code: "STORAGE_ERROR",
          },
        ],
        nextCursor: null,
        scanned: 120,
        malformed: 0,
      });
    if (path.startsWith("/admin/") && method !== "GET") {
      const body = req.postDataJSON() as Record<string, unknown>;
      writes.push({ path, body });
      if (path === "/admin/users" && method === "POST") {
        users = [
          ...users,
          {
            ...users[1],
            id: randomUUID(),
            email: String(body.email),
            role: String(body.role),
          },
        ];
        return json({ id: users.at(-1)!.id }, 201);
      }
      if (path.startsWith("/admin/users/") && method === "PATCH") {
        if (userFailure)
          return json(
            {
              code: "ADMIN_RECORD_CHANGED",
              message: "Tài khoản đã thay đổi. Hãy tải lại trước khi tiếp tục.",
            },
            409,
          );
        const user = users.find((user) => user.id === path.split("/").at(-1))!;
        if (typeof body.disabled === "boolean") user.disabled = body.disabled;
        if (typeof body.role === "string") user.role = body.role;
        user.updatedAt = new Date().toISOString();
        return json(user);
      }
      if (path === "/admin/settings") {
        company = {
          ...company,
          name: String(body.name),
          queuePaused: Boolean(body.queuePaused),
          googleAutoProvision: Boolean(body.googleAutoProvision),
          googleAllowedDomains: body.googleAllowedDomains as string[],
          updatedAt: new Date().toISOString(),
        };
        return json(company);
      }
      if (path.endsWith("/cancel")) {
        run.state = "cancelled";
        return json({ id: run.id, state: run.state });
      }
    }
    unexpected.push(`${method} ${path}`);
    return json({ message: "Unexpected mock request" }, 400);
  });
  await page.goto("/");
  await page.getByLabel("Email", { exact: true }).fill(profile.email);
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill("private-test-password-123");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /Một ý tưởng.*Cả quy trình/ }),
  ).toBeVisible();
  return {
    rootId,
    staffId,
    writes,
    adminReads,
    errors,
    unexpected,
    get company() {
      return company;
    },
    failUsers() {
      userFailure = true;
    },
    failOverview(value: boolean) {
      overviewFailure = value;
    },
  };
}

test("admin dashboard shows real metrics, accessible tabs and works at mobile width", async ({
  page,
}) => {
  const fixture = await setup(page);
  await page
    .getByRole("button", { name: "Quản trị công ty", exact: true })
    .click();
  await expect(page).toHaveURL(/#admin$/);
  await expect(
    page.getByRole("heading", { name: "Nhịp vận hành hôm nay" }),
  ).toBeVisible();
  await expect(page.locator(".admin-stat").first()).toContainText("26");
  await expect(page.getByRole("img", { name: /công việc/ })).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("admin-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("admin-mobile.png"),
    fullPage: true,
  });
  await page
    .getByRole("navigation", { name: "Điều hướng quản trị" })
    .getByRole("button", { name: "Tài khoản", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Danh sách tài khoản" }),
  ).toBeVisible();
  const layout = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
    elements: Array.from(
      document.querySelectorAll(
        ".admin-page,.admin-content,.admin-table-scroll,.admin-filters,.workspace-main,.admin-pagination",
      ),
    ).map((el) => ({
      name: el.className,
      left: el.getBoundingClientRect().left,
      width: el.getBoundingClientRect().width,
      scroll: el.scrollWidth,
    })),
  }));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    JSON.stringify(layout),
  ).toBe(true);
  const region = page.getByRole("region", { name: "Danh sách tài khoản" });
  await region.focus();
  await region.press("ArrowRight");
  expect(fixture.errors).toEqual([]);
  expect(fixture.unexpected).toEqual([]);
});

test("accounts support filters, pagination, creation and audited confirmation for locking", async ({
  page,
}) => {
  const fixture = await setup(page);
  await page.goto("/#admin-users");
  await expect(
    page.getByRole("region", { name: "Danh sách tài khoản" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sau", exact: true }).click();
  await expect(page.locator(".admin-pagination")).toContainText("Trang 2 / 2");
  await page
    .getByRole("button", { name: "Thêm tài khoản", exact: true })
    .click();
  const create = page.getByRole("dialog");
  await expect(create).toHaveAccessibleName("Cấp tài khoản nhân viên");
  await expect(create).toHaveAttribute("aria-modal", "true");
  await expect(
    create.getByLabel("Mật khẩu ban đầu", { exact: true }),
  ).toHaveAttribute("autocomplete", "new-password");
  for (let index = 0; index < 8; index++) {
    await page.keyboard.press("Tab");
    expect(
      await create.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await create
    .getByLabel("Email nhân viên", { exact: true })
    .fill("new@lcgmedia.uk");
  await create
    .getByLabel("Mật khẩu ban đầu", { exact: true })
    .fill("initial-password-123");
  await create
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByLabel("Tìm email", { exact: true }).fill("staff@");
  await page.getByRole("button", { name: "Lọc tài khoản" }).click();
  await expect(page.locator(".admin-pagination")).toContainText("1 bản ghi");
  await page
    .getByRole("button", { name: "Quản lý staff@lcgmedia.uk", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Khóa tài khoản", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Khóa tài khoản" }),
  ).toBeVisible();
  expect(
    fixture.writes.filter((write) => write.path.endsWith(fixture.staffId)),
  ).toHaveLength(0);
  await dialog
    .getByLabel("Lý do thao tác", { exact: true })
    .fill("Employee offboarding");
  await dialog.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Danh sách tài khoản" }),
  ).toContainText("Đã khóa");
  expect(
    fixture.writes.find((write) => write.path.endsWith(fixture.staffId))?.body,
  ).toMatchObject({ disabled: true, reason: "Employee offboarding" });
  expect(fixture.errors).toEqual([]);
  expect(fixture.unexpected).toEqual([]);
});

test("root controls are protected and server conflicts stay inside the confirmation dialog", async ({
  page,
}) => {
  const fixture = await setup(page);
  await page.goto("/#admin-users");
  await page
    .getByRole("button", { name: "Quản lý root@lcgmedia.uk", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Khóa tài khoản", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Chuyển thành Designer", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Quản lý root@lcgmedia.uk", exact: true }),
  ).toBeFocused();
  fixture.failUsers();
  await page
    .getByRole("button", { name: "Quản lý staff@lcgmedia.uk", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Đặt lại mật khẩu", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Mật khẩu mới", { exact: true })
    .fill("updated-password-456");
  await dialog
    .getByLabel("Lý do thao tác", { exact: true })
    .fill("Security request");
  await dialog.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Tài khoản đã thay đổi",
  );
  await expect(
    dialog.getByLabel("Lý do thao tác", { exact: true }),
  ).toHaveValue("Security request");
  expect(fixture.errors).toEqual([]);
});

test("work monitoring shows errors and requires confirmation before cancel", async ({
  page,
}) => {
  const fixture = await setup(page);
  await page.goto("/#admin-runs");
  await page.getByRole("button", { name: "Chi tiết", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("STORAGE_ERROR");
  await expect(page.getByRole("dialog")).toContainText("request-storage-error");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Dừng", exact: true }).click();
  expect(fixture.writes).toHaveLength(0);
  await page
    .getByLabel("Lý do thao tác", { exact: true })
    .fill("Manager requested stop");
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Công việc toàn công ty" }),
  ).toContainText("Đã dừng");
  expect(fixture.writes).toHaveLength(1);
  expect(fixture.errors).toEqual([]);
});

test("audit logs support details, JSON export and request error search", async ({
  page,
}) => {
  const fixture = await setup(page);
  await page.goto("/#admin-audit");
  await page.getByRole("button", { name: "Chi tiết", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Employee access changed",
  );
  await page.keyboard.press("Escape");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất trang JSON" }).click();
  const download = await pending;
  const contents = JSON.parse(
    await fs.readFile((await download.path())!, "utf8"),
  ) as { mode: string; items: unknown[] };
  expect(contents.mode).toBe("actions");
  expect(contents.items).toHaveLength(1);
  await page
    .getByRole("button", { name: "Request & lỗi hệ thống", exact: true })
    .click();
  await page
    .getByLabel("Tìm request ID / lỗi", { exact: true })
    .fill("request-storage-error");
  await page.getByLabel("Chỉ lỗi & cảnh báo", { exact: true }).check();
  await page.getByRole("button", { name: "Tìm nhật ký", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Nhật ký vận hành" }),
  ).toContainText("request-storage-error");
  expect(fixture.errors).toEqual([]);
  expect(fixture.unexpected).toEqual([]);
});

test("operating policy is persisted only after confirmation and can pause the queue", async ({
  page,
}) => {
  const fixture = await setup(page);
  await page.goto("/#admin-settings");
  await page.getByLabel("Tên công ty", { exact: true }).fill("LCG Creative");
  await page
    .getByLabel("Domain được phép đăng nhập Google", { exact: true })
    .fill("lcgmedia.uk\nsecond.example");
  await page
    .getByLabel("Tự cấp tài khoản Designer khi email Google hợp lệ", {
      exact: true,
    })
    .uncheck();
  await page
    .getByLabel("Tạm dừng lấy tác vụ mới từ hàng đợi", { exact: true })
    .check();
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  expect(fixture.writes).toHaveLength(0);
  await page
    .getByLabel("Lý do thao tác", { exact: true })
    .fill("Scheduled maintenance");
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(fixture.company).toMatchObject({
    name: "LCG Creative",
    queuePaused: true,
    googleAutoProvision: false,
    googleAllowedDomains: ["lcgmedia.uk", "second.example"],
  });
  await page
    .getByRole("navigation", { name: "Điều hướng quản trị" })
    .getByRole("button", { name: "Tổng quan", exact: true })
    .click();
  await expect(
    page.getByText("Hàng đợi đang tạm dừng.", { exact: false }),
  ).toBeVisible();
  expect(fixture.errors).toEqual([]);
  expect(fixture.unexpected).toEqual([]);
});

test("designer cannot see admin navigation or fetch admin data through direct links", async ({
  page,
}) => {
  const fixture = await setup(page, "designer");
  await expect(
    page.getByRole("button", { name: "Quản trị công ty", exact: true }),
  ).toHaveCount(0);
  await page.goto("/#admin-users");
  await expect(
    page.getByRole("heading", { name: "Bạn không có quyền quản trị" }),
  ).toBeVisible();
  expect(fixture.adminReads).toHaveLength(0);
  expect(fixture.writes).toHaveLength(0);
  expect(fixture.errors).toEqual([]);
});

test("dashboard failures offer retry without showing stale metrics", async ({
  page,
}) => {
  const fixture = await setup(page);
  fixture.failOverview(true);
  await page.goto("/#admin");
  await expect(page.getByRole("alert")).toContainText(
    "Không truy cập được dữ liệu Agent.",
  );
  await expect(page.locator(".admin-stat")).toHaveCount(0);
  fixture.failOverview(false);
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.locator(".admin-stat")).toHaveCount(4);
  expect(fixture.errors).toEqual([]);
});
