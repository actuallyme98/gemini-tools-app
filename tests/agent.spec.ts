import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==",
  "base64",
);
const image = (name: string) => ({ name, mimeType: "image/png", buffer: png });

async function setup(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const user = {
    id: randomUUID(),
    email: "designer@example.com",
    role: "designer",
  };
  const assets: Record<string, unknown>[] = [];
  const templates: Record<string, unknown>[] = [];
  let conversation: Record<string, unknown> | undefined;
  let run: Record<string, unknown> | undefined;
  let message: Record<string, unknown> | undefined;
  let steps: Record<string, unknown>[] = [];
  let results: Record<string, unknown>[] = [];
  let savedPrompt = "",
    started = false,
    templatePayload: Record<string, unknown> | undefined;
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url()),
      path = url.pathname,
      method = route.request().method();
    const body = () =>
      route.request().postDataJSON() as Record<string, unknown>;
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
        },
      });
    if (path.includes("/image-models"))
      return route.fulfill({
        json: {
          provider: "shopaikey",
          defaultModel: "gemini-3.1-flash-image-preview",
          models: [
            {
              id: "gemini-3.1-flash-image-preview",
              name: "Gemini Flash Image",
            },
            { id: "gpt-image-1.5-all", name: "GPT Image" },
          ],
        },
      });
    if (path.endsWith("/auth/status"))
      return route.fulfill({ json: { enabled: true, setupRequired: false } });
    if (path.endsWith("/auth/login"))
      return route.fulfill({ json: { token: "a".repeat(64), user } });
    if (path.endsWith("/auth/me")) return route.fulfill({ json: user });
    if (path.endsWith("/auth/logout")) return route.fulfill({ status: 204 });
    if (path.endsWith("/content") || path.endsWith("/preview"))
      return route.fulfill({ contentType: "image/png", body: png });
    if (path === "/api/agent/assets") {
      if (method === "GET") return route.fulfill({ json: assets });
      const data = route.request().postData() || "";
      const kind = data.match(/name="kind"\r\n\r\n([^\r]+)/)?.[1] || "source";
      const asset = {
        id: randomUUID(),
        name: data.match(/filename="([^"]+)"/)?.[1] || "image.png",
        kind,
        category: "Ornament",
        width: 100,
        height: 100,
        mimeType: "image/png",
        revision: 1,
        review: "draft",
        createdAt: new Date().toISOString(),
      };
      assets.push(asset);
      return route.fulfill({ status: 201, json: asset });
    }
    if (path === "/api/agent/templates") {
      if (method === "GET") return route.fulfill({ json: templates });
      templatePayload = body();
      const template = { ...templatePayload, id: randomUUID(), revision: 1 };
      templates.push(template);
      return route.fulfill({ status: 201, json: template });
    }
    if (path === "/api/agent/conversations") {
      if (method === "GET")
        return route.fulfill({ json: conversation ? [conversation] : [] });
      conversation = {
        id: randomUUID(),
        title: body().title,
        messages: [],
        updatedAt: new Date().toISOString(),
      };
      return route.fulfill({ status: 201, json: conversation });
    }
    if (path.endsWith("/messages")) {
      message = body();
      savedPrompt =
        "QUY TẮC BẮT BUỘC:\nẢNH 1 là ảnh đích, ẢNH 2 là nguồn. Không tạo watermark.\nThay ornament theo yêu cầu.";
      run = {
        ...message,
        conversationId: conversation!.id,
        operation: "mockup_ai",
        state: "draft",
        summary: "Thay sản phẩm và giữ cảnh đích.",
        questions: [],
        count: 1,
        brief: message.text,
        requestId: randomUUID(),
        updatedAt: new Date().toISOString(),
        items: [
          {
            title: "Ornament mới",
            prompt: savedPrompt,
            sourceId: (message.sourceIds as string[])[0],
            targetId: (message.targetIds as string[])[0],
          },
        ],
      };
      conversation!.messages = [
        { id: randomUUID(), role: "user", text: message.text },
      ];
      return route.fulfill({ status: 202, json: run });
    }
    if (path.endsWith("/plan")) {
      const data = body();
      run = { ...run, items: data.items, updatedAt: new Date().toISOString() };
      savedPrompt = (data.items as { prompt: string }[])[0].prompt;
      return route.fulfill({ json: run });
    }
    if (path.endsWith("/start")) {
      started = true;
      run!.state = "running";
      steps = [
        {
          id: `${run!.id}:image:0`,
          runId: run!.id,
          type: "image",
          state: "running",
          index: 0,
          requestId: randomUUID(),
        },
      ];
      return route.fulfill({ status: 202, json: run });
    }
    if (path.endsWith("/cancel")) {
      run!.state = "cancelled";
      return route.fulfill({ json: run });
    }
    if (path.endsWith("/review")) {
      results[0].review = body().review;
      return route.fulfill({ json: results[0] });
    }
    if (path === "/api/agent/runs")
      return route.fulfill({ json: run ? [run] : [] });
    if (/\/conversations\/[^/]+$/.test(path))
      return route.fulfill({
        json: { conversation, runs: run ? [run] : [], steps, results },
      });
    return route.fulfill({
      status: 400,
      json: { message: `Unexpected request: ${path}` },
    });
  });
  await page.goto("/#agent");
  await page.getByLabel("Email", { exact: true }).fill("designer@example.com");
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill("test-password-at-least-12");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByLabel("Quy trình", { exact: true })).toBeVisible();
  return {
    errors,
    get message() {
      return message;
    },
    get prompt() {
      return savedPrompt;
    },
    get started() {
      return started;
    },
    get template() {
      return templatePayload;
    },
    complete() {
      const asset = {
        id: randomUUID(),
        name: "result.png",
        category: "Ornament",
        kind: "result",
        runId: run!.id,
        width: 100,
        height: 100,
        mimeType: "image/png",
        revision: 2,
        review: "draft",
        checks: {
          technical: true,
          visual: "review",
          notes: ["Kiểm tra lại kích thước sản phẩm."],
        },
      };
      results = [asset];
      assets.push(asset);
      run!.state = "review";
      steps[0].state = "done";
      steps[0].resultId = asset.id;
    },
  };
}

test("agent preserves edited prompt, locks the image model while running, restores history and exports results", async ({
  page,
}) => {
  const fixture = await setup(page);
  await page
    .getByLabel("Ảnh sản phẩm/thiết kế nguồn", { exact: true })
    .setInputFiles(image("product.png"));
  await expect(page.getByText("product.png", { exact: true })).toBeVisible();
  await page
    .getByLabel("Ảnh tham chiếu — cảnh cần giữ", { exact: true })
    .setInputFiles(image("reference.png"));
  await expect(page.getByText("reference.png", { exact: true })).toBeVisible();
  await page
    .getByLabel("Giao việc hoặc yêu cầu chỉnh tiếp")
    .fill("Thay ornament trong ảnh tham chiếu bằng sản phẩm nguồn.");
  await page.getByRole("button", { name: "Lập kế hoạch", exact: true }).click();
  const prompt = page.getByLabel("Final prompt 1", { exact: true });
  await expect(prompt).toBeVisible();
  expect(fixture.started).toBe(false);
  await prompt.fill(
    (await prompt.inputValue()) + "\nGiữ nguyên hai vị trí treo.",
  );
  await expect(
    page.getByRole("button", { name: "Bắt đầu xử lý 1 ảnh" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Lưu final prompt" }).click();
  await expect(
    page.getByRole("button", { name: "Bắt đầu xử lý 1 ảnh" }),
  ).toBeEnabled();
  expect(fixture.prompt).toContain("Giữ nguyên hai vị trí treo.");
  expect(fixture.message?.operation).toBe("auto");
  expect(fixture.message?.sourceIds).toHaveLength(1);
  expect(fixture.message?.targetIds).toHaveLength(1);
  await page.getByRole("button", { name: "Bắt đầu xử lý 1 ảnh" }).click();
  await expect(
    page.getByLabel("Model tạo / sửa ảnh", { exact: true }),
  ).toBeDisabled();
  fixture.complete();
  await expect(page.getByLabel("Duyệt ảnh 1", { exact: true })).toBeVisible();
  await expect(
    page.getByLabel("Model tạo / sửa ảnh", { exact: true }),
  ).toBeEnabled();
  await page
    .getByLabel("Duyệt ảnh 1", { exact: true })
    .selectOption("approved");
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất bộ ảnh ZIP" }).click();
  expect((await downloaded).suggestedFilename()).toMatch(/^POD_.*\.zip$/);
  await page.reload();
  await expect(page.getByLabel("Quy trình", { exact: true })).toBeVisible();
  await page
    .getByRole("navigation", { name: "Lịch sử công việc" })
    .getByRole("button")
    .first()
    .click();
  await expect(page.getByLabel("Duyệt ảnh 1", { exact: true })).toHaveValue(
    "approved",
  );
  expect(fixture.errors).toEqual([]);
  await page.screenshot({
    path: test.info().outputPath("agent-desktop.png"),
    fullPage: true,
  });
});

test("agent template editor supports keyboard coordinates and has no horizontal overflow on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const fixture = await setup(page);
  await page
    .getByLabel("Quy trình", { exact: true })
    .selectOption("mockup_template");
  await page
    .getByRole("button", { name: "Thêm template", exact: true })
    .click();
  await page
    .getByLabel("Tên template", { exact: true })
    .fill("Ornament template");
  await page
    .getByLabel("Hoặc tải template (tối đa 4 MP)", { exact: true })
    .setInputFiles(image("scene.png"));
  await expect(
    page.getByRole("button", { name: "Lưu template", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("group", { name: "Trên trái", exact: true })
    .getByLabel("X (%)", { exact: true })
    .fill("20");
  await page.getByRole("button", { name: "Lưu template", exact: true }).click();
  await expect(page.getByText("Ornament template · T-shirt")).toBeVisible();
  expect((fixture.template?.corners as { x: number }[])[0].x).toBe(0.2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  expect(fixture.errors).toEqual([]);
  await page.screenshot({
    path: test.info().outputPath("agent-mobile.png"),
    fullPage: true,
  });
});
