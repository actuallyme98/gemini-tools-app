import { test, expect, type Page } from "@playwright/test";
import JSZip from "jszip";
import { readFile } from "node:fs/promises";
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
    "idea-generator",
    "image-editor",
  ]) {
    await page.goto("/#" + hash);
    expect(await page.locator("main").evaluate((el) => el.scrollWidth)).toBe(
      390,
    );
    await expect(page.locator("main section:visible")).toHaveCount(1);
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
  await page.getByRole("button", { name: "Mockup Generator" }).click();
  await expect(page).toHaveURL(/#mockup-generator$/);
  await page.goBack();
  await expect(page).toHaveURL(/#image-editor$/);
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
    expect(route.request().postData()).toMatch(/name="count"\r\n\r\n12\r\n/);
    await route.fulfill({
      json: Array.from({ length: 12 }, (_, i) => "prompt " + i),
    });
  });
  await page.goto("/#mockup-generator");
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
test("ZIP reports failed downloads, retains page results and updates dashboard", async ({
  page,
}) => {
  await page.route("**/api/mockups/generate-mockups", (route) =>
    route.fulfill({
      json: {
        total: 2,
        results: [
          { index: 0, prompt: "one", url: "https://cdn.example/good.png" },
          { index: 1, prompt: "two", url: "https://cdn.example/bad.png" },
        ],
      },
    }),
  );
  await page.goto("/#mockup-generator");
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
  await page.locator("nav").getByRole("button", { name: "Dashboard" }).click();
  await expect(
    page.getByText("Đã tạo 2 mockup", { exact: true }),
  ).toBeVisible();
  await page
    .locator("nav")
    .getByRole("button", { name: "Mockup Generator" })
    .click();
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
