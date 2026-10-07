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
const providerCatalog = {
  defaults: { text: "gemini", vision: "gemini", image: "gemini" },
  providers: [
    {
      id: "gemini",
      name: "Gemini",
      available: true,
      capabilities: ["text", "vision", "image"],
      routing: { text: "gemini", vision: "gemini", image: "gemini" },
    },
    {
      id: "vyceai",
      name: "VyceAI",
      available: true,
      capabilities: ["text"],
      routing: { text: "vyceai", vision: null, image: null },
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

async function setupBackgrounds(
  page: Page,
  names = ["studio.png", "garden.png"],
) {
  await page.goto("/#background-studio");
  await page
    .getByRole("combobox", { name: "Provider AI" })
    .selectOption("gemini");
  const studio = page.getByRole("region", {
    name: "Background Studio",
    exact: true,
  });
  await studio
    .getByLabel("Tải Ảnh sản phẩm gốc", { exact: true })
    .setInputFiles(image("product.png"));
  await studio
    .getByLabel("Thêm ảnh background", { exact: true })
    .setInputFiles(names.map(image));
  return studio;
}

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
    if (bodies.length === 1) await gate;
    await route.fulfill({
      json: {
        url: `https://cdn.example/background-${bodies.length}.png`,
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
    studio.getByLabel("Chọn background unused.png", { exact: true }),
  ).not.toBeChecked();
  await studio.getByLabel("Kết quả cho mỗi background").selectOption("2");
  await studio
    .getByText("Ghi chú về ánh sáng & vị trí (tùy chọn)", { exact: true })
    .click();
  await studio
    .getByLabel("Áp dụng cho cả bộ; sản phẩm vẫn được giữ nguyên.")
    .fill("soft shadows");
  await studio.getByRole("button", { name: "Tạo 4 ảnh", exact: true }).click();
  await expect.poll(() => bodies.length).toBe(1);
  await expect(studio.getByLabel("Thêm ảnh background")).toBeDisabled();
  await page
    .getByRole("combobox", { name: "Provider AI" })
    .selectOption("shopaikey");
  release();
  await expect(
    studio.getByRole("button", { name: "Tải 4 ảnh (ZIP)", exact: true }),
  ).toBeEnabled();
  expect(bodies).toHaveLength(4);
  await expect(
    studio.getByRole("progressbar", { name: "Tiến độ thay background" }),
  ).toHaveAttribute("aria-valuenow", "100");
  for (const body of bodies) {
    expect(body).toContain('name="provider"\r\n\r\ngemini');
    expect(body).toContain('name="productImage"; filename="product.png"');
    expect(body.match(/name="backgroundImage"/g)).toHaveLength(1);
    expect(body).not.toContain("unused.png");
    expect(body).toContain("soft shadows");
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
    dialog.getByRole("heading", { name: "Xem kết quả thay background" }),
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
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await expect(
    page.getByText("Đã tạo 1 ảnh background", { exact: true }),
  ).toHaveCount(4);
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
  await studio.getByRole("button", { name: "Tạo 2 ảnh", exact: true }).click();
  await expect(
    studio.getByRole("button", {
      name: "Thử lại background garden.png, ảnh 1",
      exact: true,
    }),
  ).toBeEnabled();
  await studio.getByText("Chi tiết lỗi", { exact: true }).click();
  await expect(studio.getByText(/Background này bị từ chối/)).toBeVisible();
  await expect(studio.getByText(/background-error/)).toBeVisible();
  await expect(
    studio.getByRole("button", { name: "Xem kết quả 1", exact: true }),
  ).toBeVisible();
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
});

test("a billing failure pauses the background queue and can resume on another provider", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/backgrounds/replace", (route) => {
    calls++;
    if (calls === 1)
      return route.fulfill({
        status: 503,
        json: {
          code: "AI_BILLING_BLOCKED",
          message: "Thanh toán Gemini bị chặn.",
          reason: "Billing denied",
          retryable: false,
        },
      });
    return route.fulfill({
      json: { url: `https://cdn.example/${calls}.png`, mimeType: "image/png" },
    });
  });
  const studio = await setupBackgrounds(page, [
    "one.png",
    "two.png",
    "three.png",
  ]);
  await studio.getByRole("button", { name: "Tạo 3 ảnh", exact: true }).click();
  await expect(
    studio.getByRole("button", {
      name: "Tiếp tục 3 ảnh chưa xong",
      exact: true,
    }),
  ).toBeEnabled();
  await expect(studio.getByRole("alert")).toContainText(
    "Thanh toán Gemini bị chặn.",
  );
  await expect(studio.getByText("Chưa chạy", { exact: true })).toHaveCount(2);
  expect(calls).toBe(1);
  await page
    .getByRole("combobox", { name: "Provider AI" })
    .selectOption("shopaikey");
  await studio
    .getByRole("button", { name: "Tiếp tục 3 ảnh chưa xong", exact: true })
    .click();
  await expect(
    studio.getByRole("button", { name: "Tải 3 ảnh (ZIP)", exact: true }),
  ).toBeEnabled();
  expect(calls).toBe(4);
  await expect(studio.getByRole("alert")).toHaveCount(0);
});

test("storage failures pause remaining background work instead of generating more paid images", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/backgrounds/replace", (route) => {
    calls++;
    return route.fulfill({
      status: 502,
      json: {
        code: "STORAGE_ACCESS_DENIED",
        message: "Không có quyền ghi R2.",
        retryable: false,
      },
    });
  });
  const studio = await setupBackgrounds(page);
  await studio.getByRole("button", { name: "Tạo 2 ảnh", exact: true }).click();
  await expect(
    studio.getByRole("button", {
      name: "Tiếp tục 2 ảnh chưa xong",
      exact: true,
    }),
  ).toBeEnabled();
  await expect(studio.getByRole("alert")).toContainText(
    "Không có quyền ghi R2.",
  );
  await expect(studio.getByText("Chưa chạy", { exact: true })).toHaveCount(1);
  expect(calls).toBe(1);
});

test("stopping a background batch prevents further requests and keeps completed results", async ({
  page,
}) => {
  let calls = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/backgrounds/replace", async (route) => {
    calls++;
    if (calls === 2) await gate;
    await route
      .fulfill({
        json: {
          url: `https://cdn.example/${calls}.png`,
          mimeType: "image/png",
        },
      })
      .catch(() => {});
  });
  const studio = await setupBackgrounds(page, [
    "one.png",
    "two.png",
    "three.png",
  ]);
  await studio.getByRole("button", { name: "Tạo 3 ảnh", exact: true }).click();
  await expect.poll(() => calls).toBe(2);
  await studio.getByRole("button", { name: "Dừng tạo", exact: true }).click();
  await expect(studio.getByText("Đã dừng", { exact: true })).toHaveCount(2);
  await expect(
    studio.getByRole("button", { name: "Tải 1 ảnh (ZIP)", exact: true }),
  ).toBeEnabled();
  release();
  await studio
    .getByRole("button", { name: "Tiếp tục 2 ảnh chưa xong", exact: true })
    .click();
  await expect(
    studio.getByRole("button", { name: "Tải 3 ảnh (ZIP)", exact: true }),
  ).toBeEnabled();
  expect(calls).toBe(4);
});

test("background uploads enforce limits and selected output totals on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // The provider already defaults to Gemini; its selector is in the closed mobile menu.
  await page.goto("/#background-studio");
  const studio = page.getByRole("region", {
    name: "Background Studio",
    exact: true,
  });
  await studio
    .getByLabel("Tải Ảnh sản phẩm gốc", { exact: true })
    .setInputFiles(image("product.png"));
  await studio.getByLabel("Kết quả cho mỗi background").selectOption("3");
  await studio
    .getByLabel("Thêm ảnh background")
    .setInputFiles(
      Array.from({ length: 11 }, (_, index) => image(`scene-${index}.png`)),
    );
  await expect(studio.getByRole("checkbox")).toHaveCount(10);
  await expect(
    studio.getByText("Tối đa 20 ảnh mỗi bộ.", { exact: false }),
  ).toBeVisible();
  await expect(
    studio.getByRole("button", { name: "Tạo 30 ảnh", exact: true }),
  ).toBeDisabled();
  await studio.getByLabel("Kết quả cho mỗi background").selectOption("2");
  await expect(
    studio.getByRole("button", { name: "Tạo 20 ảnh", exact: true }),
  ).toBeEnabled();
  await studio
    .getByRole("button", { name: "Bỏ chọn tất cả", exact: true })
    .click();
  await expect(
    studio.getByRole("button", { name: "Tạo 0 ảnh", exact: true }),
  ).toBeDisabled();
  const firstBackground = studio.getByLabel("Chọn background scene-0.png", {
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
    .getByRole("button", { name: "Xóa background scene-0.png", exact: true })
    .click();
  await expect(studio.getByRole("checkbox")).toHaveCount(9);
});

test("disabled VyceAI selection migrates to Gemini and shares selection with mobile", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("provider-migration-test")) {
      localStorage.setItem("creative-studio.ai-provider", "vyceai");
      sessionStorage.setItem("provider-migration-test", "1");
    }
  });
  await page.goto("/#home");
  const select = page.getByRole("combobox", { name: "Provider AI" });
  await expect(select).toHaveValue("gemini");
  await expect(select.locator('option[value="vyceai"]')).toBeDisabled();
  await expect(
    select.getByRole("option", { name: "Mặc định hệ thống", exact: true }),
  ).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("creative-studio.ai-provider")),
    )
    .toBe("gemini");
  await expect(select.locator('option[value="offline"]')).toBeDisabled();
  await select.selectOption("gemini");
  await expect(
    page.getByText("Văn bản: Gemini", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Tạo / sửa ảnh: Gemini", { exact: true }),
  ).toBeVisible();
  await select.selectOption("shopaikey");
  await page.reload();
  await expect(select).toHaveValue("shopaikey");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Mở menu" }).click();
  const mobileSelect = page
    .getByRole("dialog")
    .getByRole("combobox", { name: "Provider AI" });
  await expect(mobileSelect).toHaveValue("shopaikey");
  await mobileSelect.selectOption("gemini");
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(select).toHaveValue("gemini");
  await select.selectOption("gemini");
  await page.reload();
  await expect(select).toHaveValue("gemini");
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
  await select.selectOption("gemini");
  release();
  await expect(page.getByText("PRODUCT", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Tạo .* Ý Tưởng/ }).click();
  await expect
    .poll(() => selectedIdeas)
    .toMatch(/name="provider"\r\n\r\ngemini\r\n/);
});

test("provider errors keep the selected provider without a default retry", async ({
  page,
}) => {
  let requests = 0;
  const message =
    "Gemini từ chối yêu cầu do project hoặc tài khoản thanh toán bị chặn.";
  const reason = "Lightning dunning decision is deny";
  const suggestion = "Quản trị viên cần kiểm tra project và Billing.";
  await page.route("**/api/ideas/analyze-product", async (route) => {
    requests++;
    expect(route.request().postData()).toMatch(
      /name="provider"\r\n\r\ngemini\r\n/,
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
  await select.selectOption("gemini");
  await page
    .getByLabel("Tải Ảnh Sản Phẩm", { exact: true })
    .setInputFiles(image("product.png"));
  await page
    .getByRole("button", { name: "Phân Tích Ảnh", exact: true })
    .click();
  const toast = page.locator('[data-sonner-toast][data-type="error"]');
  await expect(toast).toContainText(message);
  await expect(toast).toContainText(reason);
  await expect(toast).toContainText(suggestion);
  await expect(toast).toContainText("Mã yêu cầu: test-billing-request");
  await expect(select).toHaveValue("gemini");
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
      /name="provider"\r\n\r\ngemini\r\n/,
    );
    expect(route.request().postData()).toMatch(/name="count"\r\n\r\n12\r\n/);
    await route.fulfill({
      json: Array.from({ length: 12 }, (_, i) => "prompt " + i),
    });
  });
  await page.goto("/#mockup-generator");
  await page
    .getByRole("combobox", { name: "Provider AI" })
    .selectOption("gemini");
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
    .getByRole("combobox", { name: "Provider AI" })
    .selectOption("gemini");
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
  await page.route("**/api/mockups/generate-mockups", (route) => {
    expect(route.request().postData()).toMatch(
      /name="provider"\r\n\r\ngemini\r\n/,
    );
    return route.fulfill({
      json: {
        total: 2,
        results: [
          { index: 0, prompt: "one", url: "https://cdn.example/good.png" },
          { index: 1, prompt: "two", url: "https://cdn.example/bad.png" },
        ],
      },
    });
  });
  await page.goto("/#mockup-generator");
  await page
    .getByRole("combobox", { name: "Provider AI" })
    .selectOption("gemini");
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
