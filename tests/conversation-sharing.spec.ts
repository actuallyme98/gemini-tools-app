import { test, expect, type Page } from "@playwright/test";
const conversationId = "10000000-0000-4000-a000-000000000001";
const version = "20000000-0000-4000-a000-000000000001";
const token = `${conversationId}.${"a".repeat(64)}`;
const assetId = "30000000-0000-4000-a000-000000000001";
const runId = "40000000-0000-4000-a000-000000000001";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==",
  "base64",
);

async function publicFixture(
  page: Page,
  options: { revoked?: boolean; images?: boolean; pages?: boolean } = {},
) {
  const requests: {
    path: string;
    auth?: string;
    token?: string;
    version?: string | null;
  }[] = [];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/**", (route) => {
    const req = route.request(),
      url = new URL(req.url());
    requests.push({
      path: url.pathname,
      auth: req.headers().authorization,
      token: req.headers()["x-share-token"],
      version: url.searchParams.get("version"),
    });
    if (!url.pathname.startsWith(`/api/agent/shared/${conversationId}`))
      return route.fulfill({
        status: 401,
        json: { message: "Unexpected private API request" },
      });
    if (options.revoked)
      return route.fulfill({
        status: 404,
        json: {
          code: "CONVERSATION_SHARE_UNAVAILABLE",
          message: "Link chia sẻ không tồn tại hoặc đã được thu hồi.",
        },
      });
    if (url.pathname.endsWith("/preview"))
      return route.fulfill({ contentType: "image/png", body: png });
    const after = Number(url.searchParams.get("after") || 0);
    return route.fulfill({
      json: {
        version,
        title: "Bộ mockup Christmas",
        sharedAt: "2026-10-24T00:00:00.000Z",
        includeImages: !!options.images,
        messages: [
          {
            id: after ? "message-41" : "message-1",
            role: after ? "assistant" : "user",
            text: after
              ? "Đã giữ nguyên thiết kế nguồn."
              : '<img src=x onerror="alert(1)"> Yêu cầu thay ornament',
            createdAt: "2026-10-24T00:00:00.000Z",
            runId,
            images:
              options.images && !after ? [{ id: assetId, role: "source" }] : [],
          },
        ],
        runs: [
          {
            id: runId,
            summary: "Giữ bối cảnh tham chiếu",
            state: "review",
            questions: [],
            items: [
              {
                title: "Final prompt",
                prompt: "Giữ tỉ lệ và màu sắc nguồn, không watermark.",
              },
            ],
            resultIds: [],
          },
        ],
        assets: options.images
          ? [
              {
                id: assetId,
                name: "source.png",
                kind: "reference",
                width: 1,
                height: 1,
              },
            ]
          : [],
        nextCursor: options.pages && !after ? 40 : null,
      },
    });
  });
  return { requests, errors };
}

test("a public link works without login and cannot execute actions or expose private shell", async ({
  page,
}) => {
  const fixture = await publicFixture(page, { pages: true });
  await page.goto(`/#share?token=${token}`);
  await expect(
    page.getByRole("heading", { name: "Bộ mockup Christmas", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Hội thoại được chia sẻ")).toContainText(
    '<img src=x onerror="alert(1)">',
  );
  await expect(page.locator(".shared-chat-message img")).toHaveCount(0);
  await expect(
    page.getByLabel("Giao việc hoặc yêu cầu chỉnh tiếp"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Đăng nhập", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: /chính/i })).toHaveCount(0);
  await page.getByText("Xem prompt (1)", { exact: true }).click();
  await expect(
    page.getByText("Giữ tỉ lệ và màu sắc nguồn, không watermark.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Xem thêm tin nhắn", exact: true })
    .click();
  await expect(
    page.getByText("Đã giữ nguyên thiết kế nguồn.", { exact: true }),
  ).toBeVisible();
  expect(
    fixture.requests.every(
      (req) =>
        req.path.startsWith("/api/agent/shared/") &&
        req.token === token &&
        !req.auth,
    ),
  ).toBe(true);
  expect(fixture.requests.some((req) => req.version === version)).toBe(true);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  expect(fixture.errors).toEqual([]);
});

test("public image requests use only the share header, even if the browser has an employee session", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("lcgmedia.agent.session", "b".repeat(64)),
  );
  const fixture = await publicFixture(page, { images: true });
  await page.goto(`/#share?token=${token}`);
  const image = page.getByRole("img", { name: "source.png", exact: true });
  await expect(image).toBeVisible();
  await expect(page.locator("figcaption")).toContainText("Ảnh nguồn");
  await expect
    .poll(() => image.evaluate((img) => (img as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  expect(fixture.requests.some((req) => req.path.endsWith("/preview"))).toBe(
    true,
  );
  expect(
    fixture.requests.every((req) => !req.auth && req.token === token),
  ).toBe(true);
  expect(fixture.errors).toEqual([]);
});

test("revoked links show a clear unavailable state and no conversation text", async ({
  page,
}) => {
  const fixture = await publicFixture(page, { revoked: true });
  await page.goto(`/#share?token=${token}`);
  await expect(
    page.getByRole("heading", { name: "Không mở được cuộc trò chuyện" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("đã được thu hồi");
  await expect(
    page.getByText("Bộ mockup Christmas", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Thử lại" })).toBeEnabled();
  expect(fixture.errors).toEqual([]);
});

test("revocation during pagination removes the previously displayed transcript", async ({
  page,
}) => {
  const options = { pages: true, revoked: false };
  await publicFixture(page, options);
  await page.goto(`/#share?token=${token}`);
  await expect(
    page.getByRole("heading", { name: "Bộ mockup Christmas", exact: true }),
  ).toBeVisible();
  options.revoked = true;
  await page
    .getByRole("button", { name: "Xem thêm tin nhắn", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Không mở được cuộc trò chuyện",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Hội thoại được chia sẻ")).toHaveCount(0);
});

test("malformed links do not request private endpoints and a changed share token reloads content", async ({
  page,
}) => {
  const fixture = await publicFixture(page);
  await page.goto("/#share?token=invalid");
  await expect(page.getByRole("alert")).toContainText("không hợp lệ");
  expect(fixture.requests).toEqual([]);
  await page.evaluate((value) => {
    location.hash = `share?token=${value}`;
  }, token);
  await expect(
    page.getByRole("heading", { name: "Bộ mockup Christmas", exact: true }),
  ).toBeVisible();
  expect(fixture.errors).toEqual([]);
});

for (const viewport of [
  { width: 375, height: 720 },
  { width: 812, height: 375 },
]) {
  test(`shared conversation stays readable at ${viewport.width}x${viewport.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    const fixture = await publicFixture(page, { images: true });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/#share?token=${token}`);
    await expect(
      page.getByRole("heading", { name: "Bộ mockup Christmas", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.querySelector(".shared-chat-page")!.scrollWidth <=
          innerWidth,
      ),
    ).toBe(true);
    await page.getByText("Xem prompt (1)", { exact: true }).click();
    await expect(
      page.getByText("Giữ tỉ lệ và màu sắc nguồn, không watermark.", {
        exact: true,
      }),
    ).toBeVisible();
    expect(fixture.errors).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath("shared-conversation.png"),
    });
  });
}
