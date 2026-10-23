import { test, expect, type Page } from "@playwright/test";
import JSZip from "jszip";
import { sampleBudget } from "./budget-fixture";
import { readFile } from "node:fs/promises";
import {
  BACKGROUND_STUDIO_BASE_PROMPT,
  MAX_BACKGROUND_PROMPT_LENGTH,
  MAX_BACKGROUND_INSTRUCTIONS_LENGTH,
  buildBackgroundPrompt,
} from "../src/constants/background-studio-prompt";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==",
  "base64",
);
const image = (name: string) => ({ name, mimeType: "image/png", buffer: png });
const analysis = (name: string) => ({
  productCategory: "test",
  productType: name,
  displayMode: "product_only",
  primaryColors: ["red"],
  pattern: "",
  styleKeywords: ["minimal"],
  mood: "",
  audience: "",
  material: {
    main: "cotton",
    details: "",
    texture: "",
    weightOrThickness: "",
    flexibility: "",
    breathability: "",
    seasonSuitability: [],
  },
});
const providerCatalog = {
  defaults: { text: "shopaikey", vision: "shopaikey", image: "shopaikey" },
  providers: [
    {
      id: "gemini",
      name: "Gemini",
      available: true,
      capabilities: ["text", "vision", "image"],
      routing: { text: "gemini", vision: "gemini", image: "gemini" },
    },
    {
      id: "shopaikey",
      name: "ShopAIKey",
      available: true,
      capabilities: ["text", "vision", "image"],
      routing: { text: "shopaikey", vision: "shopaikey", image: "shopaikey" },
    },
    {
      id: "offline",
      name: "Offline",
      available: false,
      capabilities: [],
      routing: { text: null, vision: null, image: null },
    },
  ],
};
const imageModelCatalog = {
  provider: "shopaikey",
  defaultModel: "gemini-3.1-flash-image-preview",
  models: [
    { id: "gemini-3.1-flash-image-preview", name: "Gemini Flash Image" },
    { id: "gemini-3-pro-image-preview", name: "Gemini Pro Image" },
    { id: "gemini-nano-banana-2.1", name: "Gemini Nano Banana 2.1" },
    { id: "gpt-image-1.5-all", name: "gpt-image-1.5-all" },
    { id: "grok-imagine-image-2.0", name: "grok-imagine-image-2.0" },
  ],
};
const runtimeErrors = new WeakMap<Page, string[]>();
test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page)).toEqual([]);
});
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/**", (route) =>
    route.fulfill({
      status: 400,
      json: { message: "Unexpected mock API request" },
    }),
  );
  await page.route("**/api/ai/providers", (route) =>
    route.fulfill({ json: providerCatalog }),
  );
  await page.addInitScript(() =>
    sessionStorage.setItem("lcgmedia.agent.session", "test-session"),
  );
  await page.route("**/api/agent/auth/status", (route) =>
    route.fulfill({ json: { enabled: true, setupRequired: false } }),
  );
  await page.route("**/api/agent/auth/me", (route) =>
    route.fulfill({
      json: {
        id: "employee-test",
        email: "employee@example.com",
        role: "designer",
      },
    }),
  );
  for (const path of ["assets", "templates", "workflows", "runs"]) {
    await page.route(`**/api/agent/${path}`, (route) =>
      route.fulfill({ json: [] }),
    );
  }
  await page.route("**/api/agent/history", (route) =>
    route.fulfill({ json: { items: [], hasMore: false, nextCursor: null } }),
  );
  await page.route("**/api/image-jobs", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/agent/usage", (route) =>
    route.fulfill({ json: sampleBudget("employee-test") }),
  );
  await page.route("**/api/ai/providers/shopaikey/image-models*", (route) =>
    route.fulfill({ json: imageModelCatalog }),
  );
  await page.route("https://cdn.example/**", (route) =>
    route.fulfill({
      status: route.request().url().includes("bad") ? 404 : 200,
      contentType: "image/png",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: png,
    }),
  );
});
test("mobile menu, deep links and back navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const hash of [
    "home",
    "mockup-generator",
    "background-studio",
    "idea-generator",
    "image-editor",
  ]) {
    await page.goto("/#" + hash);
    if (hash === "background-studio") {
      await expect(page.getByLabel("Custom prompt")).toBeVisible();
    }
    expect(
      await page.locator("main").evaluate((el) => el.scrollWidth),
    ).toBeLessThanOrEqual(390);
    await expect(
      page.locator("main .agent-tool-page > section:visible"),
    ).toHaveCount(1);
    expect(
      await page
        .locator("main")
        .evaluate((el) => el.getBoundingClientRect().width),
    ).toBe(390);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(390);
  }
  await page.getByRole("button", { name: "Mở menu" }).click();
  await expect(page.locator(".tool-navigation:visible")).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: /^(Mockup Generator|Mockup Studio|Idea Generator|Image Editor|Tất cả công cụ)$/,
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Trợ lý AI", exact: true }).click();
  await expect(page).toHaveURL(/#agent$/);
  await page.goBack();
  await expect(page).toHaveURL(/#image-editor$/);
  await page.setViewportSize({ width: 1440, height: 850 });
  await expect(page.locator(".tool-navigation")).toHaveCount(0);
  await expect(
    page.locator(".desktop-sidebar .workspace-navigation"),
  ).not.toContainText("Công cụ");
});

test("default provider loads image models without opening the mobile menu", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/#background-studio");
  const panel = page.getByRole("region", { name: "Cấu hình model ảnh" });
  const model = panel.getByRole("combobox", { name: "Model tạo / sửa ảnh" });
  await expect(model).toBeVisible();
  await expect(model).toBeEnabled();
  expect((await model.boundingBox())!.y).toBeLessThan(600);
  await expect(model).toHaveValue("gemini-3.1-flash-image-preview");
  await model.selectOption("gemini-nano-banana-2.1");
  await expect(model).toHaveValue("gemini-nano-banana-2.1");
  await expect(panel).toContainText(
    "Chỉ hiển thị model hỗ trợ tạo và chỉnh sửa ảnh",
  );
  await model.selectOption("gemini-3-pro-image-preview");
  for (const hash of [
    "mockup-generator",
    "idea-generator",
    "image-editor",
    "home",
  ]) {
    await page.goto("/#" + hash);
    await expect(model).toBeVisible();
    await expect(model).toHaveValue("gemini-3-pro-image-preview");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(375);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(model).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Model tạo / sửa ảnh" }),
  ).toHaveCount(1);
  await expect(page.getByRole("combobox", { name: "Provider AI" })).toHaveValue(
    "shopaikey",
  );
});

async function setupBackgrounds(
  page: Page,
  names = ["studio.png", "garden.png"],
) {
  await page.goto("/#background-studio");
  await page
    .getByRole("combobox", { name: "Provider AI" })
    .selectOption("shopaikey");
  const studio = page.getByRole("region", {
    name: "Mockup Studio",
    exact: true,
  });
  await studio
    .getByLabel("Tải Ảnh sản phẩm gốc", { exact: true })
    .setInputFiles(image("product.png"));
  await studio
    .getByLabel("Thêm ảnh tham chiếu", { exact: true })
    .setInputFiles(names.map(image));
  return studio;
}

test("model stays locked across tabs and concurrent requests, then unlocks after the last failure", async ({
  page,
}) => {
  let finishBackground!: () => void;
  let finishReference!: () => void;
  let backgroundCalls = 0;
  let referenceCalls = 0;
  await page.route("**/api/backgrounds/replace", async (route) => {
    backgroundCalls++;
    await new Promise<void>((resolve) => {
      finishBackground = resolve;
    });
    await route.fulfill({
      json: {
        url: "https://cdn.example/background.png",
        mimeType: "image/png",
      },
    });
  });
  await page.route(
    "**/api/ideas/generate-images-from-referal-images",
    async (route) => {
      referenceCalls++;
      await new Promise<void>((resolve) => {
        finishReference = resolve;
      });
      await route.fulfill({
        status: 422,
        json: { message: "Ảnh bị từ chối." },
      });
    },
  );
  const studio = await setupBackgrounds(page, ["scene.png"]);
  const provider = page.getByRole("combobox", { name: "Provider AI" });
  await provider.selectOption("shopaikey");
  const model = page.getByRole("combobox", { name: "Model tạo / sửa ảnh" });
  await model.selectOption("gemini-3-pro-image-preview");
  await studio.getByRole("button", { name: "Tạo 1 ảnh", exact: true }).click();
  await expect.poll(() => backgroundCalls).toBe(1);
  await page.evaluate(() => {
    location.hash = "image-editor";
  });
  await expect(model).toBeDisabled();
  await page
    .getByLabel("Tải Ảnh sản phẩm", { exact: true })
    .setInputFiles(image("product.png"));
  await page
    .getByLabel("Tải ảnh tham chiếu", { exact: true })
    .setInputFiles(image("ref.png"));
  await page.getByRole("button", { name: "Xử Lý Ảnh", exact: true }).click();
  await expect.poll(() => referenceCalls).toBe(1);
  finishBackground();
  await expect(
    page.locator('section[aria-label="Mockup Studio"]'),
  ).toContainText("1/1 ảnh hoàn tất");
  await expect(model).toBeDisabled();
  await expect(provider).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(model).toBeVisible();
  await expect(model).toBeDisabled();
  await page.getByRole("button", { name: "Mở menu" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(provider).toBeDisabled();
  finishReference();
  await expect(provider).toBeEnabled();
  await expect(model).toBeEnabled();
  await model.selectOption("gemini-3.1-flash-image-preview");
  await expect(model).toHaveValue("gemini-3.1-flash-image-preview");
});

test("cancelling unlocks model selection and an old response cannot unlock a new request", async ({
  page,
}) => {
  const releases: (() => void)[] = [];
  let oldResponseFinished = false;
  await page.route("**/api/backgrounds/replace", async (route) => {
    const index = releases.length;
    await new Promise<void>((resolve) => releases.push(resolve));
    await route
      .fulfill({
        json: { url: "https://cdn.example/result.png", mimeType: "image/png" },
      })
      .catch(() => {});
    if (index === 0) oldResponseFinished = true;
  });
  const studio = await setupBackgrounds(page, ["scene.png"]);
  await page
    .getByRole("combobox", { name: "Provider AI" })
    .selectOption("shopaikey");
  const model = page.getByRole("combobox", { name: "Model tạo / sửa ảnh" });
  await model.selectOption("gemini-3-pro-image-preview");
  await studio.getByRole("button", { name: "Tạo 1 ảnh", exact: true }).click();
  await expect.poll(() => releases.length).toBe(1);
  await expect(model).toBeDisabled();
  await studio.getByRole("button", { name: "Dừng tạo", exact: true }).click();
  await expect(model).toBeEnabled();
  await model.selectOption("gemini-3.1-flash-image-preview");
  await studio
    .getByRole("button", { name: "Tiếp tục 1 ảnh chưa xong", exact: true })
    .click();
  await expect.poll(() => releases.length).toBe(2);
  releases[0]();
  await expect.poll(() => oldResponseFinished).toBe(true);
  await expect(model).toBeDisabled();
  releases[1]();
  await expect(
    studio.getByRole("button", { name: "Tải 1 ảnh (ZIP)", exact: true }),
  ).toBeEnabled();
  await expect(model).toBeEnabled();
});

test("async image jobs survive long processing and retry status reads without repeating generation", async ({
  page,
}) => {
  const id = "a0123456-0000-4000-8000-012345678901";
  let posts = 0;
  let polls = 0;
  let done = false;
  await page.route("**/api/backgrounds/replace", (route) => {
    posts++;
    expect(route.request().postData()).toContain('name="async"\r\n\r\ntrue');
    return route.fulfill({
      status: 202,
      json: { jobId: id, requestId: id, state: "pending" },
    });
  });
  await page.route("**/api/backgrounds/jobs/*", (route) => {
    polls++;
    if (polls === 2)
      return route.fulfill({ status: 502, body: "Temporary proxy error" });
    return route.fulfill({
      json: done
        ? {
            state: "done",
            result: {
              url: "https://cdn.example/async.png",
              mimeType: "image/png",
              requestId: id,
            },
          }
        : { state: "pending" },
    });
  });
  const studio = await setupBackgrounds(page, ["scene.png"]);
  await studio
    .getByLabel("Custom prompt", { exact: true })
    .fill("Replace the ornaments in the reference with the source ornament.");
  await expect(
    studio.getByLabel("Final prompt", { exact: true }),
  ).toContainText("ĐẦU RA KHÔNG WATERMARK");
  await page.clock.install();
  await studio.getByRole("button", { name: "Tạo 1 ảnh", exact: true }).click();
  await expect.poll(() => polls).toBeGreaterThan(0);
  const model = page.getByRole("combobox", { name: "Model tạo / sửa ảnh" });
  await expect(model).toBeDisabled();
  await page.clock.fastForward(150000);
  await expect.poll(() => polls).toBeGreaterThan(1);
  await page.clock.fastForward(2000);
  await expect.poll(() => polls).toBeGreaterThan(2);
  await expect(model).toBeDisabled();
  expect(posts).toBe(1);
  done = true;
  await page.clock.fastForward(2000);
  await expect(
    studio.getByRole("button", { name: "Tải 1 ảnh (ZIP)", exact: true }),
  ).toBeEnabled();
  await expect(studio).toContainText(id);
  await expect(model).toBeEnabled();
  expect(posts).toBe(1);
});

test("failed async jobs expose the original request trace and stop polling without retrying AI", async ({
  page,
}) => {
  const id = "b0123456-0000-4000-8000-012345678901";
  let posts = 0;
  let polls = 0;
  await page.route("**/api/backgrounds/replace", (route) => {
    posts++;
    return route.fulfill({
      status: 202,
      json: { jobId: id, requestId: id, state: "pending" },
    });
  });
  await page.route("**/api/backgrounds/jobs/*", (route) => {
    polls++;
    return route.fulfill({
      json: {
        state: "failed",
        error: {
          statusCode: 429,
          code: "AI_RATE_LIMITED",
          message: "Provider 1: quá nhiều yêu cầu, vui lòng thử lại sau.",
          requestId: id,
          retryable: true,
        },
      },
    });
  });
  const studio = await setupBackgrounds(page, ["scene.png"]);
  await studio.getByRole("button", { name: "Tạo 1 ảnh", exact: true }).click();
  await expect(studio).toContainText("quá nhiều yêu cầu");
  await expect(studio).toContainText(id);
  await expect(
    page.getByRole("combobox", { name: "Model tạo / sửa ảnh" }),
  ).toBeEnabled();
  expect(posts).toBe(1);
  expect(polls).toBe(1);
});

test("image model selection locks during a batch and persists while Gemini stays hidden", async ({
  page,
}) => {
  const bodies: string[] = [];
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/backgrounds/replace", async (route) => {
    bodies.push(route.request().postDataBuffer()!.toString());
    const index = bodies.length;
    await gate;
    await route.fulfill({
      json: {
        url: `https://cdn.example/${index}.png`,
        mimeType: "image/png",
      },
    });
  });
  const studio = await setupBackgrounds(page);
  const provider = page.getByRole("combobox", { name: "Provider AI" });
  await expect(provider.locator('option[value="gemini"]')).toHaveCount(0);
  const model = page.getByRole("combobox", { name: "Model tạo / sửa ảnh" });
  await expect(model).toHaveValue("gemini-3.1-flash-image-preview");
  await model.selectOption("gemini-3-pro-image-preview");
  await studio.getByRole("button", { name: "Tạo 2 ảnh", exact: true }).click();
  await expect.poll(() => bodies.length).toBe(2);
  await expect(model).toBeDisabled();
  await expect(provider).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Tải lại danh sách model ảnh" }),
  ).toBeDisabled();
  release();
  await expect(
    studio.getByRole("button", { name: "Tải 2 ảnh (ZIP)", exact: true }),
  ).toBeEnabled();
  await expect(model).toBeEnabled();
  await expect(provider).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Tải lại danh sách model ảnh" }),
  ).toBeEnabled();
  for (const body of bodies)
    expect(body).toContain(
      'name="imageModel"\r\n\r\ngemini-3-pro-image-preview',
    );
  await provider.selectOption("shopaikey");
  await studio
    .getByRole("button", { name: "Tạo bộ mới (2 ảnh)", exact: true })
    .click();
  await expect.poll(() => bodies.length).toBe(4);
  expect(bodies[2]).toContain(
    'name="imageModel"\r\n\r\ngemini-3-pro-image-preview',
  );
  expect(bodies[3]).toContain(
    'name="imageModel"\r\n\r\ngemini-3-pro-image-preview',
  );
  await provider.selectOption("shopaikey");
  await model.selectOption("gemini-3-pro-image-preview");
  await page.reload();
  await expect(model).toHaveValue("gemini-3-pro-image-preview");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(model).toBeVisible();
  await expect(model).toHaveValue("gemini-3-pro-image-preview");
  await page.getByRole("button", { name: "Mở menu" }).click();
  await page.setViewportSize({ width: 390, height: 640 });
  const sidebar = page.getByRole("dialog").getByRole("complementary");
  expect(
    await sidebar.locator("nav").evaluate((element) => element.clientHeight),
  ).toBeGreaterThan(44);
  await expect(sidebar.locator(".tool-navigation")).toHaveCount(0);
  await sidebar.getByRole("button", { name: "Trợ lý AI", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("GPT and Grok image groups send the exact model and preserve selection when an account channel is unavailable", async ({
  page,
}) => {
  const bodies: string[] = [];
  await page.route("**/api/backgrounds/replace", async (route) => {
    const body = route.request().postDataBuffer()!.toString();
    bodies.push(body);
    if (body.includes('name="imageModel"\r\n\r\ngrok-imagine-image-2.0')) {
      await route.fulfill({
        status: 503,
        json: {
          code: "AI_MODEL_UNAVAILABLE",
          message:
            "ShopAIKey: model đã chọn chưa có kênh phục vụ trong nhóm tài khoản hiện tại.",
          reason:
            "No available channel for model grok-imagine-image-2.0 under group cheap",
          retryable: false,
        },
      });
    } else {
      await route.fulfill({
        json: {
          url: "https://cdn.example/gpt-output.png",
          mimeType: "image/png",
        },
      });
    }
  });
  const studio = await setupBackgrounds(page, ["scene.png"]);
  const model = page.getByRole("combobox", { name: "Model tạo / sửa ảnh" });
  await expect(model).toBeEnabled();
  await expect(
    model.locator('optgroup[label="Google · Gemini"] option'),
  ).toHaveCount(3);
  await expect(
    model.locator('optgroup[label="OpenAI · GPT Image"] option'),
  ).toHaveCount(1);
  await expect(
    model.locator('optgroup[label="xAI · Grok Imagine"] option'),
  ).toHaveCount(1);
  await model.selectOption("gpt-image-1.5-all");
  await studio.getByRole("button", { name: "Tạo 1 ảnh", exact: true }).click();
  await expect(
    studio.getByRole("button", { name: "Tải 1 ảnh (ZIP)", exact: true }),
  ).toBeEnabled();
  expect(bodies[0]).toContain('name="imageModel"\r\n\r\ngpt-image-1.5-all');
  await model.selectOption("grok-imagine-image-2.0");
  await expect(page.getByText(/Grok nhận tối đa 5 ảnh/)).toBeVisible();
  await studio
    .getByRole("button", { name: "Tạo bộ mới (1 ảnh)", exact: true })
    .click();
  await expect(studio).toContainText("chưa có kênh phục vụ");
  await expect(model).toBeEnabled();
  await expect(model).toHaveValue("grok-imagine-image-2.0");
  expect(bodies).toHaveLength(2);
  expect(bodies[1]).toContain('name="provider"\r\n\r\nshopaikey');
  expect(bodies[1]).toContain(
    'name="imageModel"\r\n\r\ngrok-imagine-image-2.0',
  );
});

test("model catalog failure preserves the saved model and blocks image generation until a valid selection", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "creative-studio.ai-image-model.shopaikey",
      "removed-image-model",
    );
  });
  let failing = true;
  await page.route("**/api/ai/providers/shopaikey/image-models*", (route) => {
    return failing
      ? route.fulfill({
          status: 503,
          json: { message: "Không tải được model ShopAIKey." },
        })
      : route.fulfill({ json: imageModelCatalog });
  });
  const studio = await setupBackgrounds(page);
  await page
    .getByRole("combobox", { name: "Provider AI" })
    .selectOption("shopaikey");
  const model = page.getByRole("combobox", { name: "Model tạo / sửa ảnh" });
  await expect(
    page.getByText("Không tải được model Provider 1.", { exact: true }),
  ).toBeVisible();
  await expect(model).toHaveValue("removed-image-model");
  await expect(
    studio.getByRole("button", { name: "Tạo 2 ảnh", exact: true }),
  ).toBeDisabled();
  failing = false;
  await page
    .getByRole("button", { name: "Tải lại danh sách model ảnh" })
    .click();
  await expect(
    page.getByText("Model đã lưu không còn khả dụng. Hãy chọn model khác.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(model).toHaveValue("removed-image-model");
  await model.selectOption("gemini-3-pro-image-preview");
  await expect(
    studio.getByRole("button", { name: "Tạo 2 ảnh", exact: true }),
  ).toBeEnabled();
});

test("text routing policy is shown independently of image provider and model", async ({
  page,
}) => {
  await page.route("**/api/ai/providers", (route) =>
    route.fulfill({
      json: {
        ...providerCatalog,
        textRouting: {
          primary: "vyceai",
          fallback: "shopaikey",
          healthRequired: true,
        },
      },
    }),
  );
  await page.goto("/#home");
  await expect(
    page.getByText("Văn bản: Tự động (có dự phòng)", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Provider AI" })
    .selectOption("shopaikey");
  await expect(
    page.getByRole("combobox", { name: "Model tạo / sửa ảnh" }),
  ).toBeEnabled();
  await expect(
    page.getByText("Văn bản: Tự động (có dự phòng)", {
      exact: true,
    }),
  ).toBeVisible();
});

test("background batch sends one product and one selected reference per result, retaining its provider across the queue", async ({
  page,
}) => {
  const bodies: string[] = [];
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/backgrounds/replace", async (route) => {
    bodies.push(route.request().postDataBuffer()!.toString());
    const index = bodies.length;
    await gate;
    await route.fulfill({
      json: {
        url: `https://cdn.example/background-${index}.png`,
        mimeType: "image/png",
      },
    });
  });
  const studio = await setupBackgrounds(page, [
    "studio.png",
    "garden.png",
    "unused.png",
  ]);
  await studio.getByText("unused.png", { exact: true }).click();
  await expect(
    studio.getByLabel("Chọn ảnh tham chiếu unused.png", { exact: true }),
  ).not.toBeChecked();
  await studio.getByLabel("Kết quả cho mỗi ảnh tham chiếu").selectOption("2");
  const customPrompt = studio.getByLabel("Custom prompt");
  await expect(customPrompt).toBeVisible();
  await expect(customPrompt).toHaveValue(BACKGROUND_STUDIO_BASE_PROMPT);
  expect(BACKGROUND_STUDIO_BASE_PROMPT.length).toBeGreaterThan(2000);
  expect(BACKGROUND_STUDIO_BASE_PROMPT.length).toBeLessThanOrEqual(
    MAX_BACKGROUND_PROMPT_LENGTH,
  );
  await expect(customPrompt).toHaveAttribute(
    "maxlength",
    String(MAX_BACKGROUND_INSTRUCTIONS_LENGTH),
  );
  await expect(
    studio.getByRole("heading", { name: "Ảnh tham chiếu", exact: true }),
  ).toBeVisible();
  await expect(
    studio.getByText(/Giữ nguyên người, kiểu dáng sản phẩm/),
  ).toBeVisible();
  await expect(studio.getByText(/Prompt gốc đã được điền sẵn/)).toBeVisible();
  const instructions = "Only edit the product on the left";
  await customPrompt.fill(instructions);
  await expect(
    studio.getByText(
      `${buildBackgroundPrompt(instructions).replace(/\r?\n/g, "\r\n").length}/12000 ký tự`,
      { exact: true },
    ),
  ).toBeVisible();
  await studio.getByRole("button", { name: "Tạo 4 ảnh", exact: true }).click();
  await expect.poll(() => bodies.length).toBe(3);
  await expect(studio.getByLabel("Thêm ảnh tham chiếu")).toBeDisabled();
  await expect(customPrompt).toBeDisabled();
  await expect(
    studio.getByRole("button", { name: "Khôi phục prompt gốc", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("combobox", { name: "Model tạo / sửa ảnh" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("combobox", { name: "Provider AI" }),
  ).toBeDisabled();
  release();
  await expect(
    studio.getByRole("button", { name: "Tải 4 ảnh (ZIP)", exact: true }),
  ).toBeEnabled();
  await expect(customPrompt).toBeEnabled();
  await expect(customPrompt).toHaveValue(instructions);
  await page
    .getByRole("combobox", { name: "Provider AI" })
    .selectOption("shopaikey");
  expect(bodies).toHaveLength(4);
  await expect(
    studio.getByRole("progressbar", { name: "Tiến độ áp hình in" }),
  ).toHaveAttribute("aria-valuenow", "100");
  for (const body of bodies) {
    expect(body).toContain('name="provider"\r\n\r\nshopaikey');
    expect(body).toContain('name="productImage"; filename="product.png"');
    expect(body.match(/name="backgroundImage"/g)).toHaveLength(1);
    expect(body).not.toContain("unused.png");
    expect(body).toContain(instructions);
    expect(body.match(/name="instructions"\r\n\r\n([\s\S]*?)\r\n--/)?.[1]).toBe(
      buildBackgroundPrompt(instructions).replace(/\n/g, "\r\n"),
    );
    expect(body).not.toContain("Additional user preferences");
  }
  expect(
    bodies.filter((body) => body.includes('filename="studio.png"')),
  ).toHaveLength(2);
  expect(
    bodies.filter((body) => body.includes('filename="garden.png"')),
  ).toHaveLength(2);
  expect(
    bodies.filter((body) => body.includes('name="variationIndex"\r\n\r\n2')),
  ).toHaveLength(2);
  await studio
    .getByRole("button", { name: "Xem kết quả 1", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Xem kết quả áp hình in" }),
  ).toBeVisible();
  await expect(dialog.getByRole("img")).toHaveCount(3);
  await page.keyboard.press("Escape");
  await expect(
    studio.getByRole("button", { name: "Xem kết quả 1", exact: true }),
  ).toBeFocused();
  const downloading = page.waitForEvent("download");
  await studio
    .getByRole("button", { name: "Tải 4 ảnh (ZIP)", exact: true })
    .click();
  const file = await downloading;
  const archive = await JSZip.loadAsync(await readFile((await file.path())!));
  expect(Object.keys(archive.files).sort()).toEqual(
    [
      "product__studio__1-v1.png",
      "product__studio__2-v2.png",
      "product__garden__3-v1.png",
      "product__garden__4-v2.png",
    ].sort(),
  );
  await page.evaluate(() => {
    location.hash = "home";
  });
  await expect(
    page.getByText("Đã tạo 1 ảnh áp hình in", { exact: true }),
  ).toHaveCount(4);
});

test("background prompt is fully editable, required, restorable and sent in full", async ({
  page,
}) => {
  const bodies: string[] = [];
  await page.route("**/api/backgrounds/replace", async (route) => {
    bodies.push(route.request().postDataBuffer()!.toString());
    await route.fulfill({
      json: { url: "https://cdn.example/edited.png", mimeType: "image/png" },
    });
  });
  const studio = await setupBackgrounds(page, ["scene.png"]);
  const prompt = studio.getByLabel("Custom prompt", { exact: true });
  const create = studio.getByRole("button", { name: "Tạo 1 ảnh", exact: true });
  await expect(prompt).toHaveValue(BACKGROUND_STUDIO_BASE_PROMPT);
  await prompt.fill("   ");
  await expect(prompt).toHaveAttribute("aria-invalid", "true");
  await expect(
    studio.getByText(/Nhập nội dung prompt trước khi tạo ảnh/),
  ).toBeVisible();
  await expect(create).toBeDisabled();
  expect(bodies).toHaveLength(0);
  await studio
    .getByRole("button", { name: "Khôi phục prompt gốc", exact: true })
    .click();
  await expect(prompt).toHaveValue(BACKGROUND_STUDIO_BASE_PROMPT);
  await expect(create).toBeEnabled();
  const finalPrompt =
    "  My complete edited prompt.\n" +
    "Preserve the reference scene. ".repeat(120) +
    "  ";
  await prompt.fill(finalPrompt);
  await create.click();
  await expect(
    studio.getByRole("button", { name: "Tải 1 ảnh (ZIP)", exact: true }),
  ).toBeEnabled();
  expect(bodies).toHaveLength(1);
  expect(
    bodies[0].match(/name="instructions"\r\n\r\n([\s\S]*?)\r\n--/)?.[1],
  ).toBe(buildBackgroundPrompt(finalPrompt).replace(/\n/g, "\r\n"));
  await expect(studio.getByLabel("Final prompt", { exact: true })).toHaveText(
    buildBackgroundPrompt(finalPrompt),
  );
  expect(buildBackgroundPrompt(finalPrompt)).toContain(
    "ĐẦU RA KHÔNG WATERMARK",
  );
  expect(bodies[0]).not.toContain("Edit IMAGE 2 in place");
  await page.evaluate(() => {
    location.hash = "image-editor";
  });
  await expect(page).toHaveURL(/#image-editor$/);
  await page.evaluate(() => {
    location.hash = "background-studio";
  });
  await expect(prompt).toHaveValue(finalPrompt);
});

test("mockup request IDs stay with their image and refresh after retry", async ({
  page,
}) => {
  const successId = "51c03c04-346d-47da-a2a1-227043a17e65";
  const errorId = "c8c799be-a055-4bc8-9dd4-b8299b0a026a";
  const retryId = "99f9baf5-6093-44f7-b47b-dbd7172d315e";
  let retried = false;
  await page.route("**/api/backgrounds/replace", async (route) => {
    const isGarden = route
      .request()
      .postDataBuffer()!
      .includes(Buffer.from('filename="garden.png"'));
    if (isGarden && !retried) {
      retried = true;
      return route.fulfill({
        status: 422,
        json: {
          message: "Ảnh bị từ chối.",
          code: "AI_CONTENT_BLOCKED",
          requestId: errorId,
        },
      });
    }
    return route.fulfill({
      headers: isGarden ? { "X-Request-Id": retryId } : {},
      json: {
        url: "https://cdn.example/good.png",
        mimeType: "image/png",
        ...(isGarden ? {} : { requestId: successId }),
      },
    });
  });
  const studio = await setupBackgrounds(page);
  await studio.getByRole("button", { name: "Tạo 2 ảnh", exact: true }).click();
  const results = studio.locator(
    'section[aria-labelledby="background-results-title"]',
  );
  const first = results.locator("li").filter({ hasText: "studio.png" });
  const second = results.locator("li").filter({ hasText: "garden.png" });
  await expect(first.getByText(successId, { exact: true })).toBeVisible();
  await expect(second.getByText(errorId, { exact: true })).toBeVisible();
  await expect(first.getByText(errorId, { exact: true })).toHaveCount(0);
  await second
    .getByRole("button", {
      name: "Thử lại ảnh tham chiếu garden.png, ảnh 1",
      exact: true,
    })
    .click();
  await expect(second.getByText(retryId, { exact: true })).toBeVisible();
  await expect(second.getByText(errorId, { exact: true })).toHaveCount(0);
  await expect(first.getByText(successId, { exact: true })).toBeVisible();
});

test("background failures preserve successes and retry only unfinished references with the current provider", async ({
  page,
}) => {
  const bodies: string[] = [];
  await page.route("**/api/backgrounds/replace", async (route) => {
    bodies.push(route.request().postDataBuffer()!.toString());
    if (bodies.length === 2)
      return route.fulfill({
        status: 422,
        json: {
          code: "AI_CONTENT_BLOCKED",
          message: "Background này bị từ chối.",
          suggestion: "Dùng ảnh tham chiếu khác.",
          requestId: "background-error",
        },
      });
    await route.fulfill({
      json: {
        url: `https://cdn.example/${bodies.length}.png`,
        mimeType: "image/png",
      },
    });
  });
  const studio = await setupBackgrounds(page);
  await studio
    .getByLabel("Custom prompt")
    .fill("Only edit the product on the left");
  await studio.getByRole("button", { name: "Tạo 2 ảnh", exact: true }).click();
  await expect(
    studio.getByRole("button", {
      name: "Thử lại ảnh tham chiếu garden.png, ảnh 1",
      exact: true,
    }),
  ).toBeEnabled();
  await studio.getByText("Chi tiết lỗi", { exact: true }).click();
  await expect(studio.getByText(/Background này bị từ chối/)).toBeVisible();
  await expect(studio.getByText(/background-error/)).toBeVisible();
  await expect(
    studio.getByRole("button", { name: "Xem kết quả 1", exact: true }),
  ).toBeVisible();
  await studio
    .getByLabel("Custom prompt")
    .fill("Only edit the product on the right");
  await page
    .getByRole("combobox", { name: "Provider AI" })
    .selectOption("shopaikey");
  await studio
    .getByRole("button", { name: "Tiếp tục 1 ảnh chưa xong", exact: true })
    .click();
  await expect(
    studio.getByRole("button", { name: "Tải 2 ảnh (ZIP)", exact: true }),
  ).toBeEnabled();
  expect(bodies).toHaveLength(3);
  expect(bodies[2]).toContain('filename="garden.png"');
  expect(bodies[2]).not.toContain('filename="studio.png"');
  expect(bodies[2]).toContain('name="provider"\r\n\r\nshopaikey');
  expect(bodies[2]).toContain("Only edit the product on the left");
  expect(bodies[2]).not.toContain("Only edit the product on the right");
});

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(
    "Mockup Studio loading keeps spinning while pending with motion=" +
      reducedMotion,
    async ({ page }) => {
      await page.emulateMedia({ reducedMotion });
      const pending: (() => void)[] = [];
      await page.route("**/api/backgrounds/replace", async (route) => {
        const index = pending.length;
        await new Promise<void>((resolve) => pending.push(resolve));
        await route
          .fulfill({
            json: {
              url: "https://cdn.example/spinner-" + index + ".png",
              mimeType: "image/png",
            },
          })
          .catch(() => {});
      });
      const studio = await setupBackgrounds(page);
      await studio
        .getByRole("button", { name: "Tạo 2 ảnh", exact: true })
        .click();
      await expect.poll(() => pending.length).toBe(2);
      const indicators = studio.locator("svg.studio-loading-spinner");
      await expect(indicators).toHaveCount(3);
      const progressIndicator = studio
        .getByRole("status")
        .locator("svg.studio-loading-spinner");
      const animation = await progressIndicator.evaluateHandle(
        (element) => element.getAnimations()[0],
      );
      // Observe a complete revolution with real pending requests, not just a CSS class.
      await expect
        .poll(() =>
          indicators.evaluateAll((elements) =>
            elements.every((element) => {
              const animation = element.getAnimations()[0];
              if (!animation?.effect) return false;
              const timing = animation.effect.getComputedTiming();
              return (
                animation.playState === "running" &&
                timing.iterations === Infinity &&
                typeof timing.duration === "number" &&
                timing.duration >= 1000 &&
                typeof animation.currentTime === "number" &&
                animation.currentTime > timing.duration
              );
            }),
          ),
        )
        .toBe(true);
      pending[1]();
      await expect(
        studio.getByRole("button", { name: "Tải 1 ảnh (ZIP)", exact: true }),
      ).toBeEnabled();
      await expect(indicators).toHaveCount(2);
      expect(
        await progressIndicator.evaluate(
          (element, previous) => element.getAnimations()[0] === previous,
          animation,
        ),
      ).toBe(true);
      await studio
        .getByRole("button", { name: "Dừng tạo", exact: true })
        .click();
      await expect(indicators).toHaveCount(0);
      pending[0]();
      await animation.dispose();
    },
  );
}

test("Mockup Studio keeps three requests active, refills slots immediately and maps out-of-order results correctly", async ({
  page,
}) => {
  const pending: { name: string; body: string; finish: () => void }[] = [];
  let active = 0;
  let peak = 0;
  await page.route("**/api/backgrounds/replace", async (route) => {
    const body = route.request().postDataBuffer()!.toString();
    const name = body.match(/name="backgroundImage"; filename="([^"]+)"/)![1];
    active++;
    peak = Math.max(peak, active);
    await new Promise<void>((finish) => pending.push({ name, body, finish }));
    active--;
    await route.fulfill({
      json: { url: "https://cdn.example/" + name, mimeType: "image/png" },
    });
  });
  const names = [
    "one.png",
    "two.png",
    "three.png",
    "four.png",
    "five.png",
    "six.png",
    "seven.png",
  ];
  const studio = await setupBackgrounds(page, names);
  const provider = page.getByRole("combobox", { name: "Provider AI" });
  await provider.selectOption("shopaikey");
  const model = page.getByRole("combobox", { name: "Model tạo / sửa ảnh" });
  await model.selectOption("gemini-3-pro-image-preview");
  const prompt = studio.getByLabel("Custom prompt", { exact: true });
  await prompt.fill("Apply this same final prompt to each reference.");
  await studio.getByRole("button", { name: "Tạo 7 ảnh", exact: true }).click();
  await expect.poll(() => pending.length).toBe(3);
  expect(active).toBe(3);
  await expect(studio.getByText("Đang tạo", { exact: true })).toHaveCount(3);
  await expect(studio.getByText("Đang chờ", { exact: true })).toHaveCount(4);
  const second = pending[1];
  second.finish();
  await expect.poll(() => pending.length).toBe(4);
  await expect(
    studio.getByRole("img", {
      name: "Kết quả áp hình in vào " + second.name + ", ảnh 1",
      exact: true,
    }),
  ).toHaveAttribute("src", "https://cdn.example/" + second.name);
  pending[0].finish();
  await expect.poll(() => pending.length).toBe(5);
  pending[2].finish();
  await expect.poll(() => pending.length).toBe(6);
  pending[3].finish();
  await expect.poll(() => pending.length).toBe(7);
  pending[6].finish();
  pending[5].finish();
  await expect(
    studio.getByRole("button", { name: "Tải 6 ảnh (ZIP)", exact: true }),
  ).toBeEnabled();
  await expect(model).toBeDisabled();
  await expect(provider).toBeDisabled();
  await expect(prompt).toBeDisabled();
  await expect(
    studio.getByRole("button", { name: "Khôi phục prompt gốc", exact: true }),
  ).toBeDisabled();
  pending[4].finish();
  await expect(
    studio.getByRole("button", { name: "Tải 7 ảnh (ZIP)", exact: true }),
  ).toBeEnabled();
  await expect(model).toBeEnabled();
  await expect(provider).toBeEnabled();
  await expect(prompt).toBeEnabled();
  expect(peak).toBe(3);
  expect(pending.map((item) => item.name).sort()).toEqual([...names].sort());
  for (const item of pending) {
    expect(item.body).toContain(
      'name="imageModel"\r\n\r\ngemini-3-pro-image-preview',
    );
    expect(item.body).toContain(
      buildBackgroundPrompt(
        "Apply this same final prompt to each reference.",
      ).replace(/\n/g, "\r\n"),
    );
    await expect(
      studio.getByRole("img", {
        name: "Kết quả áp hình in vào " + item.name + ", ảnh 1",
        exact: true,
      }),
    ).toHaveAttribute("src", "https://cdn.example/" + item.name);
  }
});

for (const failure of [
  {
    code: "AI_BILLING_BLOCKED",
    status: 503,
    message: "Thanh toán ShopAIKey bị chặn.",
  },
  {
    code: "STORAGE_ACCESS_DENIED",
    status: 502,
    message: "Không có quyền ghi R2.",
  },
  {
    code: "AI_RATE_LIMITED",
    status: 429,
    message: "Provider giới hạn số request.",
  },
]) {
  test(
    failure.code +
      " pauses unsent jobs, retains in-flight results and retries only unfinished jobs",
    async ({ page }) => {
      const pending: (() => void)[] = [];
      const bodies: string[] = [];
      await page.route("**/api/backgrounds/replace", async (route) => {
        const index = bodies.length;
        bodies.push(route.request().postDataBuffer()!.toString());
        if (index < 3)
          await new Promise<void>((resolve) => pending.push(resolve));
        if (index === 0)
          return route.fulfill({
            status: failure.status,
            json: {
              code: failure.code,
              message: failure.message,
              retryable: false,
            },
          });
        return route.fulfill({
          json: {
            url: "https://cdn.example/result-" + index + ".png",
            mimeType: "image/png",
          },
        });
      });
      const studio = await setupBackgrounds(page, [
        "one.png",
        "two.png",
        "three.png",
        "four.png",
        "five.png",
        "six.png",
      ]);
      const provider = page.getByRole("combobox", { name: "Provider AI" });
      await studio
        .getByRole("button", { name: "Tạo 6 ảnh", exact: true })
        .click();
      await expect.poll(() => pending.length).toBe(3);
      pending[0]();
      await expect(
        page.locator("[data-sonner-toast][data-type=error]"),
      ).toContainText(failure.message.replace("ShopAIKey", "Provider 1"));
      await expect(studio.getByText("Chưa chạy", { exact: true })).toHaveCount(
        3,
      );
      await expect(studio.getByText("Đang tạo", { exact: true })).toHaveCount(
        2,
      );
      await expect(provider).toBeDisabled();
      await expect(
        studio.getByLabel("Custom prompt", { exact: true }),
      ).toBeDisabled();
      expect(bodies).toHaveLength(3);
      pending[1]();
      pending[2]();
      await expect(
        studio.getByRole("button", {
          name: "Tiếp tục 4 ảnh chưa xong",
          exact: true,
        }),
      ).toBeEnabled();
      await expect(
        studio.getByRole("button", { name: "Tải 2 ảnh (ZIP)", exact: true }),
      ).toBeEnabled();
      expect(bodies).toHaveLength(3);
      await provider.selectOption("shopaikey");
      await studio
        .getByRole("button", { name: "Tiếp tục 4 ảnh chưa xong", exact: true })
        .click();
      await expect(
        studio.getByRole("button", { name: "Tải 6 ảnh (ZIP)", exact: true }),
      ).toBeEnabled();
      expect(bodies).toHaveLength(7);
      for (const body of bodies.slice(3))
        expect(body).toContain('name="provider"\r\n\r\nshopaikey');
      await expect(
        page.locator("[data-sonner-toast][data-type=error]"),
      ).toHaveCount(0);
    },
  );
}

test("stopping a parallel batch preserves completed images and late responses cannot alter or unlock its retry", async ({
  page,
}) => {
  const pending: (() => void)[] = [];
  await page.route("**/api/backgrounds/replace", async (route) => {
    const index = pending.length;
    await new Promise<void>((resolve) => pending.push(resolve));
    await route
      .fulfill({
        json: {
          url: "https://cdn.example/result-" + index + ".png",
          mimeType: "image/png",
        },
      })
      .catch(() => {});
  });
  const studio = await setupBackgrounds(page, [
    "one.png",
    "two.png",
    "three.png",
    "four.png",
    "five.png",
  ]);
  const provider = page.getByRole("combobox", { name: "Provider AI" });
  const prompt = studio.getByLabel("Custom prompt", { exact: true });
  await studio.getByRole("button", { name: "Tạo 5 ảnh", exact: true }).click();
  await expect.poll(() => pending.length).toBe(3);
  pending[0]();
  await expect.poll(() => pending.length).toBe(4);
  await expect(
    studio.getByRole("button", { name: "Tải 1 ảnh (ZIP)", exact: true }),
  ).toBeEnabled();
  await studio.getByRole("button", { name: "Dừng tạo", exact: true }).click();
  await expect(studio.getByText("Đã dừng", { exact: true })).toHaveCount(4);
  await expect(provider).toBeEnabled();
  await expect(prompt).toBeEnabled();
  expect(pending).toHaveLength(4);
  await studio
    .getByRole("button", { name: "Tiếp tục 4 ảnh chưa xong", exact: true })
    .click();
  await expect.poll(() => pending.length).toBe(7);
  for (const finish of pending.slice(1, 4)) finish();
  await expect(provider).toBeDisabled();
  await expect(prompt).toBeDisabled();
  await expect(studio.getByText("Đang tạo", { exact: true })).toHaveCount(3);
  expect(pending).toHaveLength(7);
  pending[4]();
  await expect.poll(() => pending.length).toBe(8);
  for (const finish of pending.slice(5)) finish();
  await expect(
    studio.getByRole("button", { name: "Tải 5 ảnh (ZIP)", exact: true }),
  ).toBeEnabled();
  await expect(provider).toBeEnabled();
  await expect(prompt).toBeEnabled();
  expect(pending).toHaveLength(8);
  const results = studio.locator(
    'section[aria-labelledby="background-results-title"]',
  );
  for (const index of [1, 2, 3])
    await expect(
      results.locator(
        'img[src="https://cdn.example/result-' + index + '.png"]',
      ),
    ).toHaveCount(0);
  await expect(
    results.locator('img[src="https://cdn.example/result-0.png"]'),
  ).toHaveCount(1);
});

test("background uploads enforce limits and selected output totals on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // Provider 1 is selected by default; its selector is in the closed mobile menu.
  await page.goto("/#background-studio");
  const studio = page.getByRole("region", {
    name: "Mockup Studio",
    exact: true,
  });
  await studio
    .getByLabel("Tải Ảnh sản phẩm gốc", { exact: true })
    .setInputFiles(image("product.png"));
  await studio.getByLabel("Kết quả cho mỗi ảnh tham chiếu").selectOption("3");
  await studio
    .getByLabel("Thêm ảnh tham chiếu")
    .setInputFiles(
      Array.from({ length: 11 }, (_, index) => image(`scene-${index}.png`)),
    );
  await expect(studio.getByRole("checkbox")).toHaveCount(10);
  await expect(
    page.locator("[data-sonner-toast][data-type=warning]"),
  ).toBeVisible();
  await expect(
    studio.getByRole("button", { name: "Tạo 30 ảnh", exact: true }),
  ).toBeDisabled();
  await studio.getByLabel("Kết quả cho mỗi ảnh tham chiếu").selectOption("2");
  await expect(
    studio.getByRole("button", { name: "Tạo 20 ảnh", exact: true }),
  ).toBeEnabled();
  await studio
    .getByRole("button", { name: "Bỏ chọn tất cả", exact: true })
    .click();
  await expect(
    studio.getByRole("button", { name: "Tạo 0 ảnh", exact: true }),
  ).toBeDisabled();
  const firstBackground = studio.getByLabel("Chọn ảnh tham chiếu scene-0.png", {
    exact: true,
  });
  await firstBackground.focus();
  await firstBackground.press("Space");
  await expect(firstBackground).toBeChecked();
  await expect(
    studio.getByRole("button", { name: "Tạo 2 ảnh", exact: true }),
  ).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await studio
    .getByRole("button", {
      name: "Xóa ảnh tham chiếu scene-0.png",
      exact: true,
    })
    .click();
  await expect(studio.getByRole("checkbox")).toHaveCount(9);
});

test("saved Gemini selection migrates to Provider 1 and stays hidden on desktop and mobile", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("provider-migration-test")) {
      localStorage.setItem("creative-studio.ai-provider", "gemini");
      sessionStorage.setItem("provider-migration-test", "1");
    }
  });
  await page.goto("/#home");
  const select = page.getByRole("combobox", { name: "Provider AI" });
  await expect(select).toHaveValue("shopaikey");
  await expect(select.locator('option[value="vyceai"]')).toHaveCount(0);
  await expect(select.locator('option[value="shopaikey"]')).toBeEnabled();
  await expect(select.locator('option[value="shopaikey"]')).toHaveText(
    "Provider 1 (mặc định)",
  );
  await expect(select.locator('option[value="gemini"]')).toHaveCount(0);
  await expect(select.locator("option").first()).toHaveAttribute(
    "value",
    "shopaikey",
  );
  await expect(
    select.getByRole("option", { name: "Mặc định hệ thống", exact: true }),
  ).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("creative-studio.ai-provider")),
    )
    .toBe("shopaikey");
  await expect(select.locator('option[value="offline"]')).toBeDisabled();
  await select.selectOption("shopaikey");
  await expect(
    page.getByText("Văn bản: Provider 1", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Tạo / sửa ảnh: Provider 1", { exact: true }),
  ).toBeVisible();
  await select.selectOption("shopaikey");
  await page.reload();
  await expect(select).toHaveValue("shopaikey");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Mở menu" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  const mobileSelect = page.getByRole("combobox", { name: "Provider AI" });
  await expect(mobileSelect).toHaveValue("shopaikey");
  await expect(mobileSelect.locator('option[value="shopaikey"]')).toHaveText(
    "Provider 1 (mặc định)",
  );
  await expect(mobileSelect.locator('option[value="gemini"]')).toHaveCount(0);
  await expect(mobileSelect.locator("option").first()).toHaveAttribute(
    "value",
    "shopaikey",
  );
  await mobileSelect.selectOption("shopaikey");
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(select).toHaveValue("shopaikey");
  await select.selectOption("shopaikey");
  await page.reload();
  await expect(select).toHaveValue("shopaikey");
});

test("queued analysis and idea arrays preserve authentication and submit each paid operation once", async ({
  page,
}) => {
  const submits: string[] = [];
  const analysisId = "11111111-1111-4111-8111-111111111111";
  const ideasId = "22222222-2222-4222-8222-222222222222";
  for (const [path, id] of [
    ["analyze-product", analysisId],
    ["generate-ideas", ideasId],
  ]) {
    await page.route(`**/api/ideas/${path}`, (route) => {
      expect(route.request().headers().authorization).toBe(
        "Bearer test-session",
      );
      expect(route.request().headers()["idempotency-key"]).toMatch(
        /^[a-f0-9-]{36}$/,
      );
      expect(route.request().postData()).toContain('name="async"\r\n\r\ntrue');
      submits.push(path);
      return route.fulfill({
        status: 202,
        json: { jobId: id, requestId: "queued-request", state: "pending" },
      });
    });
  }
  let reads = 0;
  await page.route(`**/api/image-jobs/${analysisId}`, (route) =>
    route.fulfill({
      json:
        ++reads === 1
          ? { state: "pending" }
          : { state: "done", result: analysis("QUEUED PRODUCT") },
    }),
  );
  await page.route(`**/api/image-jobs/${ideasId}`, (route) =>
    route.fulfill({
      json: {
        state: "done",
        result: [{ url: "https://cdn.example/good.png", prompt: "summer" }],
      },
    }),
  );
  await page.goto("/#idea-generator");
  await page
    .getByLabel("Tải Ảnh Sản Phẩm", { exact: true })
    .setInputFiles(image("product.png"));
  await page
    .getByRole("button", { name: "Phân Tích Ảnh", exact: true })
    .click();
  await expect(page.getByText("QUEUED PRODUCT", { exact: true })).toBeVisible({
    timeout: 10000,
  });
  await page.getByRole("button", { name: /Tạo .* Ý Tưởng/ }).click();
  await expect(
    page.locator('img[src="https://cdn.example/good.png"]'),
  ).toBeVisible({ timeout: 10000 });
  expect(submits).toEqual(["analyze-product", "generate-ideas"]);
});

test("tool requests with an expired session return the whole UI to login", async ({
  page,
}) => {
  await page.route("**/api/ideas/analyze-product", (route) =>
    route.fulfill({
      status: 401,
      json: { message: "Phiên đăng nhập đã hết hạn." },
    }),
  );
  await page.goto("/#idea-generator");
  await page
    .getByLabel("Tải Ảnh Sản Phẩm", { exact: true })
    .setInputFiles(image("product.png"));
  await page
    .getByRole("button", { name: "Phân Tích Ảnh", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".desktop-sidebar, .agent-tool-page")).toHaveCount(
    0,
  );
  await expect(
    page.locator("[data-sonner-toast][data-type=error]"),
  ).toContainText("Phiên đăng nhập đã hết hạn");
});

test("selected provider is captured per request for analysis and idea generation", async ({
  page,
}) => {
  let selectedAnalysis = "";
  let selectedIdeas = "";
  let release: () => void = () => {};
  await page.route("**/api/ideas/analyze-product", async (route) => {
    selectedAnalysis = route.request().postData() || "";
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route.fulfill({ json: analysis("PRODUCT") });
  });
  await page.route("**/api/ideas/generate-ideas", async (route) => {
    selectedIdeas = route.request().postData() || "";
    await route.fulfill({
      json: [{ url: "https://cdn.example/good.png", prompt: "summer" }],
    });
  });
  await page.goto("/#idea-generator");
  const select = page.getByRole("combobox", { name: "Provider AI" });
  await select.selectOption("shopaikey");
  await page
    .getByLabel("Tải Ảnh Sản Phẩm", { exact: true })
    .setInputFiles(image("product.png"));
  await page
    .getByRole("button", { name: "Phân Tích Ảnh", exact: true })
    .click();
  await expect
    .poll(() => selectedAnalysis)
    .toMatch(/name="provider"\r\n\r\nshopaikey\r\n/);
  await expect(select).toBeDisabled();
  release();
  await expect(page.getByText("PRODUCT", { exact: true })).toBeVisible();
  await expect(select).toBeEnabled();
  await select.selectOption("shopaikey");
  await page.getByRole("button", { name: /Tạo .* Ý Tưởng/ }).click();
  await expect
    .poll(() => selectedIdeas)
    .toMatch(/name="provider"\r\n\r\nshopaikey\r\n/);
});

test("idea generation uses the selected image model while analysis omits that field", async ({
  page,
}) => {
  let analyzed = "";
  let generated = "";
  await page.route("**/api/ideas/analyze-product", (route) => {
    analyzed = route.request().postData() || "";
    return route.fulfill({ json: analysis("SHOP PRODUCT") });
  });
  await page.route("**/api/ideas/generate-ideas", (route) => {
    generated = route.request().postData() || "";
    return route.fulfill({
      json: [{ url: "https://cdn.example/good.png", prompt: "studio" }],
    });
  });
  await page.goto("/#idea-generator");
  await page
    .getByRole("combobox", { name: "Provider AI" })
    .selectOption("shopaikey");
  await page
    .getByRole("combobox", { name: "Model tạo / sửa ảnh" })
    .selectOption("gemini-3-pro-image-preview");
  await page
    .getByLabel("Tải Ảnh Sản Phẩm", { exact: true })
    .setInputFiles(image("product.png"));
  await page
    .getByRole("button", { name: "Phân Tích Ảnh", exact: true })
    .click();
  await expect(page.getByText("SHOP PRODUCT", { exact: true })).toBeVisible();
  expect(analyzed).not.toContain('name="imageModel"');
  await page.getByRole("button", { name: /Tạo .* Ý Tưởng/ }).click();
  await expect
    .poll(() => generated)
    .toContain('name="imageModel"\r\n\r\ngemini-3-pro-image-preview');
});

test("provider errors keep the selected provider without a default retry", async ({
  page,
}) => {
  let requests = 0;
  const message =
    "ShopAIKey từ chối yêu cầu do project hoặc tài khoản thanh toán bị chặn.";
  const reason = "Lightning dunning decision is deny";
  const suggestion = "Quản trị viên cần kiểm tra project và Billing.";
  await page.route("**/api/ideas/analyze-product", async (route) => {
    requests++;
    expect(route.request().postData()).toMatch(
      /name="provider"\r\n\r\nshopaikey\r\n/,
    );
    await route.fulfill({
      status: 503,
      json: {
        statusCode: 503,
        code: "AI_BILLING_BLOCKED",
        message,
        reason,
        suggestion,
        requestId: "test-billing-request",
        retryable: false,
      },
    });
  });
  await page.goto("/#idea-generator");
  const select = page.getByRole("combobox", { name: "Provider AI" });
  await select.selectOption("shopaikey");
  await page
    .getByLabel("Tải Ảnh Sản Phẩm", { exact: true })
    .setInputFiles(image("product.png"));
  await page
    .getByRole("button", { name: "Phân Tích Ảnh", exact: true })
    .click();
  const toast = page.locator('[data-sonner-toast][data-type="error"]');
  await expect(toast).toContainText(
    "Provider 1 từ chối yêu cầu do project hoặc tài khoản thanh toán bị chặn.",
  );
  await expect(toast).toContainText(reason);
  await expect(toast).toContainText(suggestion);
  await expect(toast).toContainText("Mã yêu cầu: test-billing-request");
  await expect(select).toHaveValue("shopaikey");
  expect(requests).toBe(1);
});

for (const failure of [
  {
    name: "validation",
    status: 400,
    body: {
      message: [
        "count must not be greater than 12",
        "provider must be a string",
      ],
    },
    expected: "count must not be greater than 12; provider must be a string",
  },
  {
    name: "gateway HTML",
    status: 502,
    body: "<html>Bad Gateway</html>",
    expected: "Máy chủ hoặc dịch vụ AI đang gặp lỗi (HTTP 502)",
  },
  {
    name: "rate limit without JSON",
    status: 429,
    body: {},
    expected: "Quá nhiều yêu cầu hoặc đã hết quota",
  },
  {
    name: "network failure",
    status: 0,
    body: {},
    expected: "Không kết nối được API",
  },
]) {
  test(`API error shows a useful message for ${failure.name}`, async ({
    page,
  }) => {
    await page.route("**/api/ideas/analyze-product", (route) =>
      failure.status === 0
        ? route.abort("failed")
        : typeof failure.body === "string"
          ? route.fulfill({
              status: failure.status,
              contentType: "text/html",
              body: failure.body,
            })
          : route.fulfill({ status: failure.status, json: failure.body }),
    );
    await page.goto("/#idea-generator");
    await page
      .getByLabel("Tải Ảnh Sản Phẩm", { exact: true })
      .setInputFiles(image("product.png"));
    await page
      .getByRole("button", { name: "Phân Tích Ảnh", exact: true })
      .click();
    await expect(
      page.locator('[data-sonner-toast][data-type="error"]'),
    ).toContainText(failure.expected);
  });
}

test("unavailable saved provider and catalog failure never replace an explicit choice", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("creative-studio.ai-provider", "offline"),
  );
  let failing = true;
  await page.route("**/api/ai/providers", (route) =>
    route.fulfill(
      failing
        ? { status: 503, json: { message: "unavailable" } }
        : { json: providerCatalog },
    ),
  );
  await page.goto("/#idea-generator");
  const select = page.getByRole("combobox", { name: "Provider AI" });
  await expect(
    page.getByText(
      "Không tải được danh sách. Lựa chọn hiện tại được giữ nguyên.",
      {
        exact: true,
      },
    ),
  ).toBeVisible();
  await expect(select).toHaveValue("offline");
  await expect(page.getByText("unavailable", { exact: true })).toBeVisible();
  failing = false;
  await page.getByRole("button", { name: "Tải lại provider" }).click();
  await expect(
    page.getByText("Provider đã lưu không khả dụng. Hãy chọn provider khác.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(select).toHaveValue("offline");
  await page.route("**/api/ideas/analyze-product", async (route) => {
    expect(route.request().postData()).toMatch(
      /name="provider"\r\n\r\noffline\r\n/,
    );
    await route.fulfill({ json: analysis("DEFAULT") });
  });
  await page
    .getByLabel("Tải Ảnh Sản Phẩm", { exact: true })
    .setInputFiles(image("product.png"));
  await page
    .getByRole("button", { name: "Phân Tích Ảnh", exact: true })
    .click();
  await expect(page.getByText("DEFAULT", { exact: true })).toBeVisible();
});
test("changing an image cancels old analysis and preserves the new result", async ({
  page,
}) => {
  let release: () => void = () => {};
  let started = false;
  await page.route("**/api/ideas/analyze-product", async (route) => {
    const old = route
      .request()
      .postDataBuffer()
      ?.includes(Buffer.from('filename="A.png"'));
    if (old) {
      started = true;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    }
    await route
      .fulfill({ json: analysis(old ? "PRODUCT_A" : "PRODUCT_B") })
      .catch(() => {});
  });
  await page.goto("/#idea-generator");
  await page
    .getByLabel("Tải Ảnh Sản Phẩm", { exact: true })
    .setInputFiles(image("A.png"));
  await page
    .getByRole("button", { name: "Phân Tích Ảnh", exact: true })
    .click();
  await expect.poll(() => started).toBe(true);
  await page.getByRole("button", { name: "Xóa ảnh", exact: true }).click();
  await page
    .getByLabel("Tải Ảnh Sản Phẩm", { exact: true })
    .setInputFiles(image("B.png"));
  await page
    .getByRole("button", { name: "Phân Tích Ảnh", exact: true })
    .click();
  await expect(page.getByText("PRODUCT_B", { exact: true })).toBeVisible();
  release();
  await expect(page.getByText("PRODUCT_A", { exact: true })).toHaveCount(0);
});
test("upload limits reject files and auto prompts never exceed 12", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/mockups/generate-prompts", async (route) => {
    requests++;
    expect(route.request().postData()).toMatch(
      /name="provider"\r\n\r\nshopaikey\r\n/,
    );
    expect(route.request().postData()).toMatch(/name="count"\r\n\r\n12\r\n/);
    await route.fulfill({
      json: Array.from({ length: 12 }, (_, i) => "prompt " + i),
    });
  });
  await page.goto("/#mockup-generator");
  await page
    .getByRole("combobox", { name: "Provider AI" })
    .selectOption("shopaikey");
  const upload = page.getByLabel("Tải Ảnh Mẫu", { exact: true });
  await upload.setInputFiles({
    name: "large.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
  });
  await expect(
    page.getByText("Mỗi ảnh phải nhỏ hơn hoặc bằng 10MB.", { exact: true }),
  ).toBeVisible();
  await upload.setInputFiles(image("small.png"));
  await page.getByRole("switch").click();
  await page.getByLabel("Số lượng", { exact: true }).fill("12");
  await page
    .getByRole("button", { name: "Tạo 12 Prompts Tự Động", exact: true })
    .click();
  await expect.poll(() => requests).toBe(1);
  await expect(
    page.getByText("12 prompts đã được tạo:", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Số lượng", { exact: true }).fill("13");
  await expect(page.getByLabel("Số lượng", { exact: true })).toHaveValue("12");
});
test("references default to three variations and reject an eleventh image", async ({
  page,
}) => {
  let requests = 0;
  await page.route(
    "**/api/ideas/generate-images-from-referal-images",
    async (route) => {
      requests++;
      expect(route.request().postData()).toContain(
        'name="imageModel"\r\n\r\ngemini-3-pro-image-preview',
      );
      expect(route.request().postData()).toMatch(
        /name="variations"\r\n\r\n3\r\n/,
      );
      await route.fulfill({
        json: Array(3).fill("https://cdn.example/good.png"),
      });
    },
  );
  await page.goto("/#image-editor");
  await page
    .getByRole("combobox", { name: "Provider AI" })
    .selectOption("shopaikey");
  await page
    .getByRole("combobox", { name: "Model tạo / sửa ảnh" })
    .selectOption("gemini-3-pro-image-preview");
  await page
    .getByLabel("Tải Ảnh sản phẩm", { exact: true })
    .setInputFiles(image("product.png"));
  const refs = page.getByLabel("Tải ảnh tham chiếu", { exact: true });
  await refs.setInputFiles(
    Array.from({ length: 10 }, (_, i) => image("ref-" + i + ".png")),
  );
  await refs.setInputFiles(image("extra.png"));
  await expect(
    page.getByText("Tối đa 10 ảnh tham chiếu.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("switch").click();
  await expect(page.getByText("Sẽ tạo 3 ảnh.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Xử Lý Ảnh", exact: true }).click();
  await expect.poll(() => requests).toBe(1);
  await expect(
    page.getByText("Kết Quả (3 images)", { exact: true }),
  ).toBeVisible();
});
async function setupMockups(page: Page, prompts: string[]) {
  await page.goto("/#mockup-generator");
  await page
    .getByLabel("Tải Ảnh Mẫu", { exact: true })
    .setInputFiles(image("product.png"));
  for (const [index, prompt] of prompts.entries()) {
    if (index)
      await page
        .getByRole("button", { name: "Thêm Prompt", exact: false })
        .click();
    await page.getByLabel(`Prompt #${index + 1}`, { exact: true }).fill(prompt);
  }
  return page.getByRole("region", { name: "Mockup Generator", exact: true });
}

test("Mockup Generator runs three independent jobs, preserves out-of-order successes and retries only the failed prompt", async ({
  page,
}) => {
  const submissions: { prompt: string; model: string; id: string }[] = [];
  const states = new Map<string, "pending" | "done" | "failed">();
  let pollFailures = 0;
  await page.route("**/api/mockups/generate-mockups", (route) => {
    const body = route.request().postDataBuffer()!.toString();
    const prompts = JSON.parse(
      body.match(/name="prompts"\r\n\r\n([^\r]*)/)![1],
    ) as string[];
    expect(prompts).toHaveLength(1);
    expect(body).toContain('name="async"\r\n\r\ntrue');
    const model = body.match(/name="imageModel"\r\n\r\n([^\r]*)/)![1];
    const id = `a0000000-0000-4000-8000-${String(submissions.length + 1).padStart(12, "0")}`;
    submissions.push({ prompt: prompts[0], model, id });
    states.set(id, "pending");
    return route.fulfill({
      status: 202,
      json: { jobId: id, requestId: id, state: "pending" },
    });
  });
  await page.route("**/api/mockups/jobs/*", (route) => {
    const id = route.request().url().split("/").at(-1)!;
    if (!pollFailures++)
      return route.fulfill({ status: 502, body: "Temporary proxy failure" });
    const state = states.get(id);
    return route.fulfill({
      json: {
        state,
        ...(state === "done"
          ? {
              result: {
                url: `https://cdn.example/${id}.png`,
                mimeType: "image/png",
                requestId: id,
              },
            }
          : state === "failed"
            ? {
                error: {
                  statusCode: 502,
                  code: "AI_NO_IMAGE",
                  message: "Model không tạo ảnh.",
                  reason: "NO_IMAGE",
                  requestId: id,
                },
              }
            : {}),
      },
    });
  });
  const studio = await setupMockups(page, [
    "original one",
    "two",
    "three",
    "four",
  ]);
  const model = page.getByRole("combobox", { name: "Model tạo / sửa ảnh" });
  await model.selectOption("gemini-3-pro-image-preview");
  await page.clock.install();
  await studio
    .getByRole("button", { name: "Tạo 4 Mockup", exact: true })
    .click();
  await expect.poll(() => submissions.length).toBe(3);
  await expect(model).toBeDisabled();
  await expect(studio.getByLabel("Prompt #1", { exact: true })).toBeDisabled();
  await page.clock.fastForward(150000);
  states.set(submissions[1].id, "done");
  await page.clock.fastForward(2000);
  await expect(
    studio.getByRole("img", { name: "Result 2", exact: true }),
  ).toBeVisible();
  await expect.poll(() => submissions.length).toBe(4);
  states.set(submissions[0].id, "failed");
  states.set(submissions[3].id, "done");
  await page.clock.fastForward(2000);
  await expect(studio).toContainText("NO_IMAGE");
  await expect(studio).toContainText(submissions[0].id);
  await expect(model).toBeDisabled();
  states.set(submissions[2].id, "done");
  await page.clock.fastForward(2000);
  await expect(model).toBeEnabled();
  expect(
    submissions.every((job) => job.model === "gemini-3-pro-image-preview"),
  ).toBe(true);
  await expect(studio.getByRole("img", { name: /^Result / })).toHaveCount(3);
  await studio
    .getByLabel("Prompt #1", { exact: true })
    .fill("changed for a new batch");
  await model.selectOption("gpt-image-1.5-all");
  await studio
    .getByRole("button", { name: "Thử lại ảnh 1", exact: true })
    .click();
  await expect.poll(() => submissions.length).toBe(5);
  expect(submissions[4].prompt).toBe("original one");
  expect(submissions[4].model).toBe("gpt-image-1.5-all");
  states.set(submissions[4].id, "done");
  await page.clock.fastForward(2000);
  await expect(studio.getByRole("img", { name: /^Result / })).toHaveCount(4);
  await expect(model).toBeEnabled();
});

test("Mockup Generator pauses unsent work after billing errors and keeps completed images", async ({
  page,
}) => {
  const submitted: string[] = [];
  let complete = false;
  await page.route("**/api/mockups/generate-mockups", (route) => {
    const prompt = (
      JSON.parse(
        route
          .request()
          .postData()!
          .match(/name="prompts"\r\n\r\n([^\r]*)/)![1],
      ) as string[]
    )[0];
    submitted.push(prompt);
    return route.fulfill({
      status: 202,
      json: {
        jobId: prompt,
        requestId: `b0000000-0000-4000-8000-${String(submitted.length).padStart(12, "0")}`,
        state: "pending",
      },
    });
  });
  await page.route("**/api/mockups/jobs/*", (route) => {
    const id = route.request().url().split("/").at(-1)!;
    if (id === "one")
      return route.fulfill({
        json: {
          state: "failed",
          error: {
            statusCode: 403,
            code: "AI_BILLING_BLOCKED",
            message: "Tài khoản thanh toán bị chặn.",
            requestId: "b0000000-0000-4000-8000-000000000001",
          },
        },
      });
    return route.fulfill({
      json: complete
        ? {
            state: "done",
            result: {
              url: `https://cdn.example/${id}.png`,
              mimeType: "image/png",
            },
          }
        : { state: "pending" },
    });
  });
  const studio = await setupMockups(page, [
    "one",
    "two",
    "three",
    "four",
    "five",
  ]);
  await page.clock.install();
  await studio
    .getByRole("button", { name: "Tạo 5 Mockup", exact: true })
    .click();
  await expect.poll(() => submitted.length).toBe(3);
  await expect(studio).toContainText("Tài khoản thanh toán bị chặn.");
  await expect(studio).toContainText("Ảnh 4: Tạm dừng");
  complete = true;
  await page.clock.fastForward(2000);
  await expect(
    page.getByRole("combobox", { name: "Model tạo / sửa ảnh" }),
  ).toBeEnabled();
  await expect(studio.getByRole("img", { name: /^Result / })).toHaveCount(2);
  expect([...submitted].sort()).toEqual(["one", "two", "three"].sort());
  await studio
    .getByRole("button", { name: "Thử lại ảnh 4", exact: true })
    .click();
  await expect.poll(() => submitted.length).toBe(4);
  await expect(
    studio.getByRole("img", { name: "Result 4", exact: true }),
  ).toBeVisible();
  expect([...submitted].sort()).toEqual(["one", "two", "three", "four"].sort());
});

test("stopping a mockup job cancels polling and late results cannot change or unlock its retry", async ({
  page,
}) => {
  let posts = 0;
  const completed = new Set<string>();
  await page.route("**/api/mockups/generate-mockups", (route) => {
    const id = String(++posts);
    return route.fulfill({
      status: 202,
      json: {
        jobId: id,
        state: "pending",
        requestId: `c0000000-0000-4000-8000-${id.padStart(12, "0")}`,
      },
    });
  });
  await page.route("**/api/mockups/jobs/*", (route) => {
    const id = route.request().url().split("/").at(-1)!;
    return route.fulfill({
      json: completed.has(id)
        ? {
            state: "done",
            result: {
              url: `https://cdn.example/retry-${id}.png`,
              mimeType: "image/png",
            },
          }
        : { state: "pending" },
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const studio = await setupMockups(page, ["one"]);
  await page.clock.install();
  await studio
    .getByRole("button", { name: "Tạo 1 Mockup", exact: true })
    .click();
  await expect.poll(() => posts).toBe(1);
  await studio
    .getByRole("button", { name: "Dừng tạo mockup", exact: true })
    .click();
  const model = page.getByRole("combobox", { name: "Model tạo / sửa ảnh" });
  await expect(model).toBeEnabled();
  await studio
    .getByRole("button", { name: "Thử lại ảnh 1", exact: true })
    .click();
  await expect.poll(() => posts).toBe(2);
  completed.add("1");
  await page.clock.fastForward(2000);
  await expect(model).toBeDisabled();
  await expect(
    studio.getByRole("img", { name: "Result 1", exact: true }),
  ).toHaveCount(0);
  completed.add("2");
  await page.clock.fastForward(2000);
  await expect(
    studio.getByRole("img", { name: "Result 1", exact: true }),
  ).toHaveAttribute("src", "https://cdn.example/retry-2.png");
  await expect(model).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
});

test("ZIP reports failed downloads, retains page results and updates dashboard", async ({
  page,
}) => {
  await page.route("**/api/mockups/generate-mockups", (route) => {
    expect(route.request().postData()).toContain(
      'name="imageModel"\r\n\r\ngemini-3-pro-image-preview',
    );
    expect(route.request().postData()).toMatch(
      /name="provider"\r\n\r\nshopaikey\r\n/,
    );
    const second = route.request().postData()?.includes('["two"]');
    return route.fulfill({
      json: {
        total: 1,
        results: [
          {
            index: 0,
            prompt: second ? "two" : "one",
            url: second
              ? "https://cdn.example/bad.png"
              : "https://cdn.example/good.png",
          },
        ],
      },
    });
  });
  await page.goto("/#mockup-generator");
  await page
    .getByRole("combobox", { name: "Provider AI" })
    .selectOption("shopaikey");
  await page
    .getByRole("combobox", { name: "Model tạo / sửa ảnh" })
    .selectOption("gemini-3-pro-image-preview");
  await page
    .getByLabel("Tải Ảnh Mẫu", { exact: true })
    .setInputFiles(image("product.png"));
  await page.getByLabel("Prompt #1", { exact: true }).fill("one");
  await page.getByRole("button", { name: "Thêm Prompt", exact: false }).click();
  await page.getByLabel("Prompt #2", { exact: true }).fill("two");
  await page
    .getByRole("button", { name: "Tạo 2 Mockup", exact: false })
    .click();
  await expect(page.getByText("Mockup #1", { exact: true })).toBeVisible();
  await expect(page.getByText("Mockup #2", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    location.hash = "home";
  });
  await expect(page.getByText("Đã tạo 1 mockup", { exact: true })).toHaveCount(
    2,
  );
  await page.evaluate(() => {
    location.hash = "mockup-generator";
  });
  await expect(page.getByText("Mockup #1", { exact: true })).toBeVisible();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Tải Tất Cả (ZIP)", exact: true })
    .click();
  const file = await downloaded;
  const zip = await JSZip.loadAsync(await readFile((await file.path())!));
  expect(Object.keys(zip.files)).toHaveLength(1);
  await expect(
    page.getByText("Đã tải 1/2 ảnh; 1 ảnh bị lỗi.", { exact: true }),
  ).toBeVisible();
});
