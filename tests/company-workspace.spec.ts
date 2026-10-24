import { test, expect, type Page } from "@playwright/test";
import { sampleBudget } from "./budget-fixture";
const owner = "10000000-0000-4000-a000-000000000001",
  runId = "20000000-0000-4000-a000-000000000001",
  projectId = "30000000-0000-4000-a000-000000000001";
async function setup(page: Page) {
  const user = { id: owner, email: "employee@example.com", role: "designer" };
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const project = {
    id: projectId,
    owner,
    name: "Christmas",
    description: "POD launch",
    members: [],
    updatedAt: new Date().toISOString(),
    archived: false,
  };
  const run = {
    id: runId,
    owner,
    conversationId: "40000000-0000-4000-a000-000000000001",
    brief: "Thay sản phẩm trong ảnh tham chiếu",
    state: "review",
    count: 2,
    completed: 1,
    progress: 50,
    updatedAt: new Date().toISOString(),
    sourceIds: [],
    targetIds: [],
    items: [
      {
        title: "Ornament",
        prompt: "Giữ nguyên cảnh đích, thay sản phẩm nguồn.",
      },
    ],
  };
  const requests: { path: string; body: Record<string, unknown> }[] = [];
  const sourceId = "50000000-0000-4000-a000-000000000001",
    targetId = "60000000-0000-4000-a000-000000000001";
  let savedBatch: Record<string, unknown> | undefined;
  await page.route("**/api/**", (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname;
    if (req.method() !== "GET")
      requests.push({
        path,
        body: req.postData()
          ? (req.postDataJSON() as Record<string, unknown>)
          : {},
      });
    if (path.endsWith("/auth/status"))
      return route.fulfill({ json: { enabled: true, setupRequired: false } });
    if (path.endsWith("/auth/login"))
      return route.fulfill({ json: { token: "b".repeat(64), user } });
    if (path.endsWith("/auth/me")) return route.fulfill({ json: user });
    if (path === "/api/agent/usage")
      return route.fulfill({ json: sampleBudget(owner) });
    if (path === "/api/ai/providers")
      return route.fulfill({
        json: {
          defaults: {
            text: "shopaikey",
            vision: "shopaikey",
            image: "shopaikey",
          },
          providers: [
            {
              id: "shopaikey",
              name: "Provider 1",
              available: true,
              capabilities: ["text", "vision", "image"],
              routing: {
                text: "shopaikey",
                vision: "shopaikey",
                image: "shopaikey",
              },
            },
          ],
        },
      });
    if (path.includes("/image-models"))
      return route.fulfill({
        json: {
          provider: "shopaikey",
          defaultModel: "test-image",
          models: [{ id: "test-image", name: "Image model" }],
        },
      });
    if (path.endsWith("/history"))
      return route.fulfill({
        json: { items: [], nextCursor: null, hasMore: false },
      });
    if (path === "/api/agent/workspace/projects")
      return route.fulfill({
        status: req.method() === "POST" ? 201 : 200,
        json: req.method() === "POST" ? project : [project],
      });
    if (path === "/api/agent/workspace/jobs")
      return route.fulfill({
        json: { items: [run], total: 1, hasMore: false },
      });
    if (path === `/api/agent/workspace/jobs/${runId}`)
      return route.fulfill({
        json: {
          run,
          steps: [],
          assets: [],
          comments: [
            {
              id: "comment",
              authorEmail: "reviewer@example.com",
              text: "Cần kiểm tra màu sắc",
              action: "comment",
              createdAt: new Date().toISOString(),
            },
          ],
          cost: {
            currency: "CREDIT",
            costUsd: 0.42,
            reservedUsd: 0.1,
            unresolved: 1,
          },
        },
      });
    if (path.endsWith("/comments"))
      return route.fulfill({ status: 201, json: { id: "saved" } });
    if (/^\/api\/agent\/assets\/[^/]+\/(preview|content)$/.test(path))
      return route.fulfill({
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==",
          "base64",
        ),
      });
    if (path.endsWith("/batches/preview"))
      return route.fulfill({
        json: [{ sku: "SKU-1", sourceId, targetId, prompt: "Thay sản phẩm" }],
      });
    if (path === "/api/agent/production/batches") {
      if (req.method() === "POST") {
        savedBatch = {
          id: "batch-test",
          name: req.postDataJSON().name,
          conversationId: run.conversationId,
          rows: [
            {
              sku: "SKU-1",
              sourceId,
              targetId,
              prompt: "Thay sản phẩm",
              runId,
            },
          ],
        };
        return route.fulfill({ status: 201, json: savedBatch });
      }
      return route.fulfill({ json: savedBatch ? [savedBatch] : [] });
    }
    if (path === "/api/agent/production/batches/batch-test")
      return route.fulfill({ json: { batch: savedBatch, runs: [] } });
    if (path.endsWith("/batches/batch-test/submit"))
      return route.fulfill({ json: { done: false, run } });
    if (path === "/api/agent/production/research")
      return route.fulfill({
        json: [
          {
            id: "research",
            keyword: "Christmas ornament",
            createdAt: new Date().toISOString(),
            sources: [
              {
                title: "Source",
                url: "https://example.com/ornament",
                retrievedAt: "2026-10-23T08:00:00.000Z",
                content: "Verified source text",
                snippet: "Snippet",
                status: "read",
              },
            ],
          },
        ],
      });
    if (path === "/api/agent/production/evaluations")
      return route.fulfill({ json: { cases: [], results: [] } });
    return route.fulfill({ json: [] });
  });
  await page.goto("/#jobs");
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill("workspace-test-password");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.locator(".workspace-header")).toBeVisible();
  return { errors, requests };
}
test("jobs show independent runs, cost, review messages and actual submit", async ({
  page,
}) => {
  const state = await setup(page);
  await page
    .getByRole("button", { name: /Thay sản phẩm trong ảnh tham chiếu/ })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/Đã chốt: 0,42 credit/)).toBeVisible();
  await expect(dialog.getByText(/Giữ chỗ: 0,10 credit/)).toBeVisible();
  await expect(dialog.getByText("Cần kiểm tra màu sắc")).toBeVisible();
  await dialog
    .getByLabel("Trao đổi / yêu cầu sửa")
    .fill("Kiểm tra lại đúng số sản phẩm");
  await dialog
    .getByRole("button", { name: "Gửi nhận xét", exact: true })
    .click();
  await expect
    .poll(
      () => state.requests.find((r) => r.path.endsWith("/comments"))?.body.text,
    )
    .toBe("Kiểm tra lại đúng số sản phẩm");
  await page.keyboard.press("Escape");
  expect(state.errors).toEqual([]);
});
test("CSV preview saves the verified mapping and submits one pending lot", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/#workspace");
  await page
    .getByLabel("Chức năng không gian nhóm")
    .getByRole("button", { name: "Batch CSV", exact: true })
    .click();
  await page.getByLabel("Tên batch", { exact: true }).fill("Ornament batch");
  await page
    .getByLabel("Nội dung CSV", { exact: true })
    .fill(
      "sku,sourceId,targetId,prompt\nSKU-1,50000000-0000-4000-a000-000000000001,60000000-0000-4000-a000-000000000001,Thay sản phẩm",
    );
  await page
    .getByRole("button", { name: "Kiểm tra & xem trước", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "1 dòng hợp lệ" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lưu batch", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Ornament batch · 1 dòng" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Gửi lô chưa chạy tiếp theo", exact: true })
    .click();
  await expect
    .poll(() => state.requests.filter((r) => r.path.endsWith("/submit")).length)
    .toBe(1);
  expect(
    state.requests.find((r) => r.path.endsWith("/batches/preview"))?.body
      .mapping,
  ).toEqual({
    sku: "sku",
    sourceId: "sourceId",
    targetId: "targetId",
    prompt: "prompt",
  });
  expect(state.errors).toEqual([]);
});
for (const width of [390, 1440])
  test(`company workspace is usable at ${width}px and keeps hidden tabs hidden`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const state = await setup(page);
    await page.goto("/#workspace");
    await expect(
      page.getByRole("heading", { name: "Dự án & thành viên", exact: true }),
    ).toBeVisible();
    await page.getByLabel("Tên dự án", { exact: true }).fill("Summer POD");
    await page.getByRole("button", { name: "Lưu dự án", exact: true }).click();
    await expect
      .poll(
        () =>
          state.requests.find((r) => r.path === "/api/agent/workspace/projects")
            ?.body.name,
      )
      .toBe("Summer POD");
    const tabs = page.getByLabel("Chức năng không gian nhóm");
    await tabs.getByRole("button", { name: "Nghiên cứu", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Nghiên cứu keyword có nguồn" }),
    ).toBeVisible();
    await expect(
      page.getByText("Christmas ornament", { exact: true }),
    ).toBeVisible();
    await tabs.getByRole("button", { name: "Batch CSV", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Batch sản xuất từ CSV" }),
    ).toBeVisible();
    await tabs
      .getByRole("button", { name: "Ghép chính xác", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Ghép file thiết kế giữ nguyên hình in",
      }),
    ).toBeVisible();
    await expect(page.locator(".workspace-main")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const nav = page.locator(".desktop-sidebar .workspace-navigation");
    await expect(
      nav.getByRole("button", { name: "Templates", exact: true }),
    ).toHaveCount(0);
    await expect(
      nav.getByRole("button", { name: "Workflows", exact: true }),
    ).toHaveCount(0);
    expect(state.errors).toEqual([]);
    await page.screenshot({
      path: `test-results/company-workspace-${width}.png`,
      fullPage: true,
    });
  });
