import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==",
  "base64",
);
const image = (name: string) => ({ name, mimeType: "image/png", buffer: png });

async function setup(page: Page, options: { skipLogin?: boolean } = {}) {
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
  let failMessage = false;
  let execution: Record<string, unknown> | undefined;
  let replanBody: Record<string, unknown> | undefined;
  const messageIds: unknown[] = [];
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
    if (path === "/api/image-jobs") return route.fulfill({ json: [] });
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
    if (path === "/api/agent/history")
      return route.fulfill({
        json: {
          items: conversation ? [conversation] : [],
          nextCursor: null,
          hasMore: false,
        },
      });
    if (path === "/api/agent/workflows") return route.fulfill({ json: [] });
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
      messageIds.push(body().id);
      if (failMessage) {
        failMessage = false;
        return route.fulfill({
          status: 503,
          json: { message: "Không gửi được câu trả lời. Hãy thử lại." },
        });
      }
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
    if (path.endsWith("/replan")) {
      replanBody = body();
      run = {
        ...run,
        ...replanBody,
        brief: `${run!.brief}\n${replanBody.answer}`,
        state: "draft",
        questions: [],
        clarifications: [],
        pendingInputs: undefined,
        updatedAt: new Date().toISOString(),
      };
      execution!.runIds = [run.id];
      return route.fulfill({ status: 201, json: { run, execution } });
    }
    if (path.endsWith("/inputs")) {
      const input = body();
      const pendingInputs = {
        sourceIds: input.sourceIds,
        targetIds: input.targetIds,
        templateIds: input.templateIds,
      };
      run = {
        ...run,
        pendingInputs,
        updatedAt: new Date(Date.now() + 1).toISOString(),
      };
      return route.fulfill({ json: run });
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
        json: {
          conversation,
          runs: run ? [run] : [],
          steps,
          results,
          workflowExecutions: execution ? [execution] : [],
        },
      });
    return route.fulfill({
      status: 400,
      json: { message: `Unexpected request: ${path}` },
    });
  });
  await page.goto("/");
  if (!options.skipLogin) {
    await page
      .getByLabel("Email", { exact: true })
      .fill("designer@example.com");
    await page
      .getByLabel("Mật khẩu", { exact: true })
      .fill("test-password-at-least-12");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    if ((page.viewportSize()?.width ?? 1280) <= 1100)
      await page.getByRole("button", { name: /Ngữ cảnh & tệp/ }).click();
    await expect(page.getByLabel("Quy trình", { exact: true })).toBeVisible();
  }
  return {
    errors,
    messageIds,
    failNextMessage() {
      failMessage = true;
    },
    get replan() {
      return replanBody;
    },
    get run() {
      return run;
    },
    designStage() {
      run = {
        ...run,
        operation: "design",
        summary: "Bước tạo thiết kế mới",
        targetIds: [],
        templateIds: [],
        updatedAt: new Date(Date.now() + 1).toISOString(),
      };
    },
    changeInOtherTab() {
      run = {
        ...run,
        pendingInputs: {
          sourceIds: run!.targetIds,
          targetIds: run!.sourceIds,
          templateIds: [],
        },
        updatedAt: new Date(Date.now() + 1).toISOString(),
      };
    },
    ask({ workflow = false, legacy = false, missingReference = false } = {}) {
      const clarifications = missingReference
        ? [
            {
              question: "Hãy chọn ảnh tham chiếu cần chỉnh sửa.",
              options: [],
              input: "reference",
            },
          ]
        : [
            {
              question: "Thao tác cần thực hiện?",
              options: [
                {
                  label: "Thay toàn bộ sản phẩm",
                  description: "Giữ bối cảnh ảnh tham chiếu.",
                },
                { label: "Chỉ chuyển hình in" },
              ],
            },
            {
              question: "Chi tiết cần giữ?",
              options: [
                { label: "Giữ toàn bộ thiết kế nguồn" },
                { label: "Chỉ giữ hình minh họa" },
              ],
            },
          ];
      run = {
        ...run,
        state: "needs_input",
        questions: clarifications.map((value) => value.question),
        ...(legacy ? {} : { clarifications }),
        updatedAt: new Date().toISOString(),
      };
      if (workflow) {
        execution = {
          id: randomUUID(),
          stage: 0,
          runIds: [run.id],
          workflow: {
            name: "Workflow kiểm thử",
            revision: 1,
            steps: [{ name: "Mockup", operation: "mockup_ai", count: 1 }],
          },
        };
        run.workflow = {
          executionId: execution.id,
          name: "Workflow kiểm thử",
          revision: 1,
          stage: 0,
          total: 1,
        };
      }
    },
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

async function prepareMockup(page: Page) {
  const fixture = await setup(page);
  await page.getByLabel("Quy trình", { exact: true }).selectOption("mockup_ai");
  await page
    .getByLabel("Ảnh sản phẩm/thiết kế nguồn", { exact: true })
    .setInputFiles(image("source.png"));
  await expect(
    page.locator(".agent-composer").getByText("source.png", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Ảnh tham chiếu — cảnh cần giữ", { exact: true })
    .setInputFiles(image("reference.png"));
  await expect(
    page.locator(".agent-composer").getByText("reference.png", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Giao việc hoặc yêu cầu chỉnh tiếp")
    .fill("Thay sản phẩm trong ảnh tham chiếu bằng sản phẩm nguồn.");
  await page.getByRole("button", { name: "Gửi yêu cầu", exact: true }).click();
  await expect(
    page.getByText("Chờ kiểm tra final prompt", { exact: true }),
  ).toBeVisible();
  return fixture;
}

for (const workflow of [false, true])
  test(`changed images invalidate the ${workflow ? "workflow" : "chat"} plan and reanalysis uses the new photos`, async ({
    page,
  }) => {
    const fixture = await prepareMockup(page);
    if (workflow) {
      fixture.ask({ workflow: true });
      await expect(
        page.getByRole("form", { name: "Bổ sung thông tin cho Agent" }),
      ).toBeVisible();
      await page
        .getByRole("button", {
          name: "Chế độ duyệt: Manual approval",
          exact: true,
        })
        .click();
      await page.getByRole("menuitemradio", { name: /Auto approval/ }).click();
      await expect(
        page.getByText("Chờ kiểm tra final prompt", { exact: true }),
      ).toBeVisible();
    }
    const oldSources = fixture.message?.sourceIds;
    await page
      .getByLabel("Đổi ảnh nguồn source.png", { exact: true })
      .setInputFiles(image("new-product.png"));
    const stale = page.getByRole("region", {
      name: "Ảnh đầu vào đã thay đổi",
      exact: true,
    });
    await expect(stale).toBeVisible();
    await expect(
      page
        .locator(".agent-composer")
        .getByText("new-product.png", { exact: true }),
    ).toBeVisible();
    if (!workflow)
      await expect(
        page.getByRole("button", { name: "Bắt đầu xử lý 1 ảnh", exact: true }),
      ).toBeDisabled();
    expect(fixture.run?.pendingInputs).toBeTruthy();
    expect(fixture.run?.sourceIds).toEqual(oldSources);
    await page
      .getByLabel("Đổi ảnh tham chiếu reference.png", { exact: true })
      .setInputFiles(image("new-scene.png"));
    await page
      .getByLabel("Giao việc hoặc yêu cầu chỉnh tiếp")
      .fill("Yêu cầu đang nhập dở");
    await stale
      .getByRole("button", { name: "Phân tích lại ảnh mới", exact: true })
      .click();
    await expect(
      page.getByText("Chờ kiểm tra final prompt", { exact: true }),
    ).toBeVisible();
    const payload = workflow ? fixture.replan : fixture.message;
    expect(payload?.approvalMode).toBe(workflow ? "auto" : "manual");
    expect(payload?.sourceIds).not.toEqual(oldSources);
    expect(payload?.sourceIds).toEqual(fixture.run?.sourceIds);
    expect(payload?.targetIds).toEqual(fixture.run?.targetIds);
    expect(fixture.run?.pendingInputs).toBeUndefined();
    expect(fixture.started).toBe(false);
    await expect(
      page.getByLabel("Giao việc hoặc yêu cầu chỉnh tiếp"),
    ).toHaveValue("Yêu cầu đang nhập dở");
    await expect(
      page.getByRole("button", { name: "Bắt đầu xử lý 1 ảnh", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "Bắt đầu xử lý 1 ảnh", exact: true })
      .click();
    await expect(
      page.getByText("Đang xử lý", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByLabel("Đổi ảnh nguồn new-product.png", { exact: true }),
    ).toBeDisabled();
    expect(fixture.started).toBe(true);
    expect(fixture.errors).toEqual([]);
  });

test("pending images survive reload and an update from another tab blocks start until its photos are loaded", async ({
  page,
}) => {
  const fixture = await prepareMockup(page);
  await page
    .getByLabel("Đổi ảnh nguồn source.png", { exact: true })
    .setInputFiles(image("new-product.png"));
  await expect(
    page.getByRole("region", { name: "Ảnh đầu vào đã thay đổi", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("navigation", { name: "Lịch sử công việc" })
    .getByRole("button")
    .first()
    .click();
  await expect(
    page
      .locator(".agent-composer")
      .getByText("new-product.png", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Bắt đầu xử lý 1 ảnh", exact: true }),
  ).toBeDisabled();
  fixture.changeInOtherTab();
  const load = page.getByRole("button", {
    name: "Nạp ảnh đã cập nhật",
    exact: true,
  });
  await expect(load).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Phân tích lại ảnh mới", exact: true }),
  ).toBeDisabled();
  await load.click();
  await expect(
    page.getByRole("button", { name: "Phân tích lại ảnh mới", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Bắt đầu xử lý 1 ảnh", exact: true }),
  ).toBeDisabled();
  expect(fixture.started).toBe(false);
  expect(fixture.errors).toEqual([]);
});

test("future reference selections do not invalidate a design stage but replacing its source does", async ({
  page,
}) => {
  const fixture = await prepareMockup(page);
  fixture.designStage();
  await expect(
    page.getByText("Bước tạo thiết kế mới", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Bắt đầu xử lý 1 ảnh", exact: true }),
  ).toBeEnabled();
  await page
    .getByLabel("Đổi ảnh nguồn source.png", { exact: true })
    .setInputFiles(image("new-design.png"));
  await expect(
    page.getByRole("region", { name: "Ảnh đầu vào đã thay đổi", exact: true }),
  ).toBeVisible();
  expect(fixture.run?.pendingInputs).toEqual({
    sourceIds: expect.any(Array),
    targetIds: [],
    templateIds: [],
  });
  await expect(
    page.getByRole("button", { name: "Phân tích lại ảnh mới", exact: true }),
  ).toBeEnabled();
  expect(fixture.started).toBe(false);
});

test("image update errors keep the original selection and show a toast", async ({
  page,
}) => {
  const fixture = await prepareMockup(page);
  await page.route("**/api/agent/runs/*/inputs", (route) =>
    route.fulfill({
      status: 409,
      json: { message: "Kế hoạch hoặc bộ ảnh vừa thay đổi. Hãy tải lại." },
    }),
  );
  await page
    .getByLabel("Đổi ảnh nguồn source.png", { exact: true })
    .setInputFiles(image("new-product.png"));
  await expect(
    page.locator("[data-sonner-toast][data-type=error]"),
  ).toContainText("Kế hoạch hoặc bộ ảnh vừa thay đổi");
  await expect(
    page.locator(".agent-composer").getByText("source.png", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator(".agent-composer")
      .getByText("new-product.png", { exact: true }),
  ).toHaveCount(0);
  expect(fixture.started).toBe(false);
  expect(fixture.errors).toEqual([]);
});

test("approval mode defaults to manual, is sent with requests, restores from history and resets for a new conversation", async ({
  page,
}) => {
  const fixture = await setup(page);
  await page
    .getByRole("button", { name: "Chế độ duyệt: Manual approval", exact: true })
    .click();
  await expect(
    page.getByRole("menuitemradio", { name: /Manual approval/ }),
  ).toBeChecked();
  await page.getByRole("menuitemradio", { name: /Auto approval/ }).click();
  await expect(
    page.getByRole("button", {
      name: "Chế độ duyệt: Auto approval",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Giao việc hoặc yêu cầu chỉnh tiếp")
    .fill("Tạo bộ ý tưởng cho sản phẩm mùa đông");
  await page.getByRole("button", { name: "Gửi yêu cầu", exact: true }).click();
  await expect(
    page.getByText("Chờ kiểm tra final prompt", { exact: true }),
  ).toBeVisible();
  expect(fixture.message?.approvalMode).toBe("auto");
  expect(fixture.started).toBe(false);
  await page.reload();
  await page
    .getByRole("navigation", { name: "Lịch sử công việc" })
    .getByRole("button")
    .first()
    .click();
  await expect(
    page.getByRole("button", {
      name: "Chế độ duyệt: Auto approval",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Trò chuyện mới", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Chế độ duyệt: Manual approval",
      exact: true,
    }),
  ).toBeVisible();
  expect(fixture.errors).toEqual([]);
});

for (const workflow of [false, true])
  test(`switching to auto approval continues waiting ${workflow ? "workflow" : "chat"} with the first recommendations`, async ({
    page,
  }) => {
    const fixture = await prepareMockup(page);
    expect(fixture.message?.approvalMode).toBe("manual");
    fixture.ask({ workflow });
    await expect(
      page.getByRole("form", { name: "Bổ sung thông tin cho Agent" }),
    ).toBeVisible();
    await page
      .getByLabel("Giao việc hoặc yêu cầu chỉnh tiếp")
      .fill("Bản nháp chưa gửi");
    await page
      .getByRole("button", {
        name: "Chế độ duyệt: Manual approval",
        exact: true,
      })
      .click();
    await page.getByRole("menuitemradio", { name: /Auto approval/ }).click();
    await expect(
      page.getByText("Chờ kiểm tra final prompt", { exact: true }),
    ).toBeVisible();
    const payload = workflow ? fixture.replan : fixture.message;
    expect(payload?.approvalMode).toBe("auto");
    const answer = workflow ? payload?.answer : payload?.text;
    expect(answer).toContain("Thay toàn bộ sản phẩm");
    expect(answer).toContain("Giữ toàn bộ thiết kế nguồn");
    expect(answer).not.toContain("Chỉ chuyển hình in");
    expect(fixture.started).toBe(false);
    await expect(
      page.getByLabel("Giao việc hoặc yêu cầu chỉnh tiếp"),
    ).toHaveValue("Bản nháp chưa gửi");
    expect(fixture.errors).toEqual([]);
  });

test("auto approval keeps missing attachments manual and its menu fits small screens with keyboard support", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const fixture = await prepareMockup(page);
  fixture.ask({ missingReference: true });
  const form = page.getByRole("form", { name: "Bổ sung thông tin cho Agent" });
  await expect(form).toBeVisible();
  const trigger = page.getByRole("button", {
    name: "Chế độ duyệt: Manual approval",
    exact: true,
  });
  await trigger.focus();
  await trigger.press("Enter");
  const menu = page.getByRole("menu");
  await expect(menu).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.screenshot({
    path: test.info().outputPath("approval-menu-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("menuitemradio", { name: /Auto approval/ }).click();
  await expect(form).toBeVisible();
  expect(fixture.messageIds).toHaveLength(1);
  expect(fixture.started).toBe(false);
  expect(fixture.errors).toEqual([]);
});

test("sidebar previews share image selection and replacement with the composer", async ({
  page,
}) => {
  const fixture = await setup(page);
  await page
    .getByLabel("Ảnh sản phẩm/thiết kế nguồn", { exact: true })
    .setInputFiles(image("source.png"));
  const source = page.getByRole("list", {
    name: "Ảnh nguồn đã chọn",
    exact: true,
  });
  await expect(
    source.getByRole("img", { name: "Xem trước nguồn: source.png" }),
  ).toBeVisible();
  await page
    .getByLabel("Đổi ảnh nguồn source.png", { exact: true })
    .setInputFiles(image("replacement.png"));
  await expect(
    source.getByRole("img", { name: "Xem trước nguồn: replacement.png" }),
  ).toBeVisible();
  await expect(
    page.locator(".agent-composer").getByText("source.png", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page
      .locator(".agent-composer")
      .getByText("replacement.png", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Ảnh tham chiếu — cảnh cần giữ", { exact: true })
    .setInputFiles(image("reference.png"));
  await expect(
    page.getByRole("list", { name: "Ảnh tham chiếu đã chọn" }).getByRole("img"),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Bỏ ảnh tham chiếu reference.png",
      exact: true,
    })
    .click();
  await expect(
    page.locator(".agent-composer").getByText("reference.png", { exact: true }),
  ).toHaveCount(0);
  expect(fixture.errors).toEqual([]);
});

test("clarifications require explicit choices, retain answers on failure and retry without duplication", async ({
  page,
}) => {
  const fixture = await prepareMockup(page);
  fixture.ask();
  const form = page.getByRole("form", { name: "Bổ sung thông tin cho Agent" });
  await expect(form).toBeVisible();
  await expect(
    form.getByRole("radio", { name: /Thay toàn bộ sản phẩm/ }),
  ).not.toBeChecked();
  const send = form.getByRole("button", {
    name: "Gửi câu trả lời",
    exact: true,
  });
  await expect(send).toBeDisabled();
  await form.getByRole("radio", { name: /Thay toàn bộ sản phẩm/ }).check();
  await form
    .getByRole("group", { name: "2. Chi tiết cần giữ?" })
    .getByRole("radio", { name: "Ý khác", exact: true })
    .check();
  await form
    .getByLabel("Câu trả lời khác cho câu 2")
    .fill("Giữ chữ Oliver và màu sắc nguyên bản.");
  await page
    .getByLabel("Giao việc hoặc yêu cầu chỉnh tiếp")
    .fill("Bản nháp chưa gửi của tôi");
  fixture.failNextMessage();
  await send.click();
  await expect(
    page.locator("[data-sonner-toast][data-type=error]"),
  ).toContainText("Không gửi được câu trả lời");
  await expect(
    form.getByRole("radio", { name: /Thay toàn bộ sản phẩm/ }),
  ).toBeChecked();
  await send.click();
  await expect(
    page.getByText("Chờ kiểm tra final prompt", { exact: true }),
  ).toBeVisible();
  expect(fixture.messageIds.at(-1)).toBe(fixture.messageIds.at(-2));
  expect(fixture.message?.text).toContain(
    "Thay sản phẩm trong ảnh tham chiếu bằng sản phẩm nguồn.",
  );
  expect(fixture.message?.text).toContain("Thay toàn bộ sản phẩm");
  expect(fixture.message?.text).toContain("Giữ chữ Oliver");
  await expect(
    page.getByLabel("Giao việc hoặc yêu cầu chỉnh tiếp"),
  ).toHaveValue("Bản nháp chưa gửi của tôi");
  await expect(
    page.locator("[data-sonner-toast][data-type=success]").last(),
  ).toBeVisible();
  expect(fixture.started).toBe(false);
  expect(fixture.errors).toEqual([]);
  await page.screenshot({
    path: test.info().outputPath("clarification-resumed.png"),
    fullPage: true,
  });
});

test("missing-image clarification requires reanalysis after a new attachment is added", async ({
  page,
}) => {
  const fixture = await setup(page);
  await page
    .getByLabel("Ảnh sản phẩm/thiết kế nguồn", { exact: true })
    .setInputFiles(image("source.png"));
  await page
    .getByLabel("Giao việc hoặc yêu cầu chỉnh tiếp")
    .fill("Tạo mockup từ ảnh tham chiếu");
  await page.getByRole("button", { name: "Gửi yêu cầu", exact: true }).click();
  await expect(
    page.getByText("Chờ kiểm tra final prompt", { exact: true }),
  ).toBeVisible();
  const oldTargets = fixture.message?.targetIds;
  fixture.ask({ missingReference: true });
  const form = page.getByRole("form", { name: "Bổ sung thông tin cho Agent" });
  await expect(form).toBeVisible();
  await expect(
    form.getByRole("button", { name: "Gửi câu trả lời", exact: true }),
  ).toBeDisabled();
  await form
    .getByRole("button", { name: "Chọn ảnh / template", exact: true })
    .click();
  await page
    .getByLabel("Ảnh tham chiếu — cảnh cần giữ", { exact: true })
    .setInputFiles(image("new-reference.png"));
  await expect(
    page.getByRole("region", { name: "Ảnh đầu vào đã thay đổi", exact: true }),
  ).toBeVisible();
  await expect(form).toHaveCount(0);
  await page
    .getByRole("button", { name: "Phân tích lại ảnh mới", exact: true })
    .click();
  await expect(
    page.getByText("Chờ kiểm tra final prompt", { exact: true }),
  ).toBeVisible();
  expect(fixture.message?.targetIds).not.toEqual(oldTargets);
  expect(fixture.started).toBe(false);
});

test("unavailable saved model is reported as a warning toast and clears after selection", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "creative-studio.ai-image-model.shopaikey",
      "retired-image-model",
    ),
  );
  await setup(page);
  await expect(
    page.locator("[data-sonner-toast][data-type=warning]"),
  ).toContainText("Model đã lưu không còn khả dụng");
  await page
    .getByRole("combobox", { name: "Model tạo / sửa ảnh", exact: true })
    .selectOption("gemini-3.1-flash-image-preview");
  await expect(
    page.locator("[data-sonner-toast][data-type=warning]"),
  ).toHaveCount(0);
});

test("free text answers keep the original task and resume its workflow stage", async ({
  page,
}) => {
  const fixture = await prepareMockup(page);
  fixture.ask({ workflow: true, legacy: true });
  await expect(
    page.getByRole("form", { name: "Bổ sung thông tin cho Agent" }),
  ).toBeVisible();
  await page
    .getByLabel("Giao việc hoặc yêu cầu chỉnh tiếp")
    .fill("1. Giữ toàn bộ thiết kế. 2. Dùng thiết lập hiện tại.");
  await page.getByRole("button", { name: "Gửi yêu cầu", exact: true }).click();
  await expect(
    page.getByText("Chờ kiểm tra final prompt", { exact: true }),
  ).toBeVisible();
  expect(fixture.replan?.answer).toContain("Giữ toàn bộ thiết kế");
  expect(fixture.replan?.sourceIds).toEqual(fixture.message?.sourceIds);
  expect(fixture.replan?.targetIds).toEqual(fixture.message?.targetIds);
  await expect(
    page.getByLabel("Giao việc hoặc yêu cầu chỉnh tiếp"),
  ).toHaveValue("");
  expect(fixture.started).toBe(false);
  expect(fixture.errors).toEqual([]);
});

for (const width of [1440, 390])
  test(`chat width and one page scroll work at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 850 });
    const fixture = await prepareMockup(page);
    fixture.ask();
    await expect(
      page.getByRole("form", { name: "Bổ sung thông tin cho Agent" }),
    ).toBeVisible();
    const layout = await page.evaluate(() => {
      const main = document.getElementById("main-content")!;
      const thread = document
        .querySelector(".conversation-thread")!
        .getBoundingClientRect();
      const composer = document
        .querySelector(".agent-composer")!
        .getBoundingClientRect();
      main.scrollTop = main.scrollHeight;
      return {
        threadWidth: thread.width,
        composerWidth: composer.width,
        left: thread.left - composer.left,
        documentHeight: document.documentElement.scrollHeight,
        viewport: innerHeight,
        documentWidth: document.documentElement.scrollWidth,
        width: innerWidth,
        mainScrolled: main.scrollTop,
        contextOverflow: getComputedStyle(
          document.querySelector(".agent-context")!,
        ).overflowY,
        boxes: [
          ...document.querySelectorAll(
            "#root, body, .agent-application, .workspace-body, .workspace-header, .workspace-main",
          ),
        ].map((element) => ({
          name: element.tagName + "." + element.className,
          top: element.getBoundingClientRect().top,
          height: element.getBoundingClientRect().height,
          overflow: getComputedStyle(element).overflowY,
        })),
      };
    });
    expect(Math.abs(layout.threadWidth - layout.composerWidth)).toBeLessThan(2);
    expect(Math.abs(layout.left)).toBeLessThan(2);
    expect(layout.documentHeight, JSON.stringify(layout)).toBeLessThanOrEqual(
      layout.viewport,
    );
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.width);
    expect(layout.mainScrolled).toBeGreaterThan(0);
    expect(layout.contextOverflow).toBe("visible");
    await expect(page.locator(".workspace-header")).toBeInViewport();
    await expect(
      page.getByRole("button", { name: "Gửi yêu cầu", exact: true }),
    ).toBeInViewport();
    await page.screenshot({
      path: test.info().outputPath(`chat-layout-${width}.png`),
      fullPage: true,
    });
    expect(fixture.errors).toEqual([]);
  });

test("employee builds a reusable workflow and launches it with selected references", async ({
  page,
}) => {
  const fixture = await setup(page);
  const workflows: Record<string, unknown>[] = [];
  let launched: Record<string, unknown> | undefined;
  await page.route("**/api/agent/workflows**", async (route) => {
    if (route.request().url().endsWith("/launch")) {
      launched = route.request().postDataJSON() as Record<string, unknown>;
      return route.fulfill({ status: 201, json: { execution: {}, run: {} } });
    }
    if (route.request().method() === "POST") {
      const input = route.request().postDataJSON() as Record<string, unknown>;
      const workflow = {
        ...input,
        id: randomUUID(),
        revision: 1,
        updatedAt: new Date().toISOString(),
      };
      workflows.push(workflow);
      return route.fulfill({ status: 201, json: workflow });
    }
    return route.fulfill({ json: workflows });
  });
  await page.getByRole("button", { name: "Workflows", exact: true }).click();
  await page.getByRole("button", { name: "Tạo workflow", exact: true }).click();
  await page
    .getByLabel("Tên workflow", { exact: true })
    .fill("Bộ thiết kế camping");
  await page
    .getByLabel("Mô tả", { exact: true })
    .fill("Tạo thiết kế rồi đưa vào cảnh tham chiếu");
  await page.getByRole("button", { name: "Thêm bước", exact: true }).click();
  await page.getByLabel("Tên bước", { exact: true }).nth(1).fill("Tạo mockup");
  await page
    .getByLabel("Tác vụ", { exact: true })
    .nth(1)
    .selectOption("mockup_ai");
  await page
    .getByLabel("Hướng dẫn xử lý", { exact: true })
    .nth(1)
    .fill("Giữ cảnh tham chiếu và áp thiết kế đã duyệt.");
  await page.screenshot({
    path: test.info().outputPath("guide-workflow.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Lưu workflow", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Bộ thiết kế camping", exact: true }),
  ).toBeVisible();
  expect(
    (workflows[0].steps as { source: string }[]).map((step) => step.source),
  ).toEqual(["initial", "previous"]);
  await page.screenshot({
    path: test.info().outputPath("workflow-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Sử dụng", exact: true }).click();
  await expect(page.getByLabel("Custom workflow", { exact: true })).toHaveValue(
    String(workflows[0].id),
  );
  await expect(page.getByLabel("Quy trình", { exact: true })).toBeDisabled();
  await page
    .getByLabel("Ảnh tham chiếu — cảnh cần giữ")
    .setInputFiles(image("scene.png"));
  await page
    .getByLabel("Giao việc hoặc yêu cầu chỉnh tiếp")
    .fill("Tạo bộ thiết kế camping với cảnh này");
  await page.getByRole("button", { name: "Gửi yêu cầu", exact: true }).click();
  await expect.poll(() => launched).toBeTruthy();
  expect(launched?.targetIds).toHaveLength(1);
  expect(launched?.sourceIds).toEqual([]);
  expect(launched?.provider).toBe("shopaikey");
  expect(fixture.errors).toEqual([]);
});

test("full conversation and sidebar history load on scroll and survive polling without duplicates", async ({
  page,
}) => {
  const fixture = await setup(page);
  const conversationId = randomUUID();
  const messages = Array.from({ length: 120 }, (_, index) => ({
    id: `m-${String(index + 1).padStart(3, "0")}`,
    role: index % 2 ? "assistant" : "user",
    text: `Nội dung lịch sử ${index + 1}`,
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
  }));
  const conversations = Array.from({ length: 65 }, (_, index) => ({
    id: index === 0 ? conversationId : randomUUID(),
    title: `Hội thoại ${index + 1}`,
    updatedAt: new Date().toISOString(),
  }));
  let savedPins: string[] = [];
  await page.route("**/api/agent/history*", (route) => {
    const before = new URL(route.request().url()).searchParams.get("before");
    const offset = Number(before || 0);
    return route.fulfill({
      json: {
        items: conversations.slice(offset, offset + 30),
        hasMore: offset + 30 < conversations.length,
        nextCursor:
          offset + 30 < conversations.length ? String(offset + 30) : null,
      },
    });
  });
  await page.route(
    `**/api/agent/conversations/${conversationId}**`,
    (route) => {
      if (route.request().method() === "PATCH") {
        savedPins = (
          route.request().postDataJSON() as { pinnedRequirements: string[] }
        ).pinnedRequirements;
        return route.fulfill({ json: {} });
      }
      const end = Number(
        new URL(route.request().url()).searchParams.get("before") || 120,
      );
      return route.fulfill({
        json: {
          conversation: {
            ...conversations[0],
            pinnedRequirements: savedPins,
            messages: messages.slice(Math.max(end - 40, 0), end),
          },
          runs: [],
          steps: [],
          results: [],
          messagePage: {
            hasMore: end > 40,
            nextCursor: end > 40 ? String(end - 40) : null,
          },
          memory: {
            summary: "Giữ màu sắc và thiết kế gốc.",
            messageCount: 100,
            updatedAt: new Date().toISOString(),
          },
        },
      });
    },
  );
  await page.reload();
  await page.getByRole("button", { name: "Hội thoại 1", exact: true }).click();
  await expect(
    page.getByText("Nội dung lịch sử 120", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Nội dung lịch sử 1", { exact: true }),
  ).toHaveCount(0);
  const main = page.locator("#main-content");
  await main.evaluate((element) => {
    element.scrollTop = 0;
  });
  await expect(
    page.getByText("Nội dung lịch sử 41", { exact: true }),
  ).toHaveCount(1);
  await main.evaluate((element) => {
    element.scrollTop = 0;
  });
  await expect(
    page.getByText("Nội dung lịch sử 1", { exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Tải tin nhắn trước đó" }),
  ).toHaveCount(0);
  await expect.poll(() => page.locator(".chat-message").count()).toBe(120);
  const sidebar = page.getByRole("navigation", { name: "Lịch sử công việc" });
  await expect(sidebar).toHaveCSS("overflow-y", "visible");
  await expect(sidebar.locator("..")).toHaveCSS("overflow-y", "visible");
  await expect(page.locator(".desktop-sidebar .workspace-sidebar")).toHaveCSS(
    "overflow-y",
    "auto",
  );
  await sidebar.evaluate((element) => {
    const scroll = element.closest("[data-history-scroll]")!;
    scroll.scrollTop = scroll.scrollHeight;
  });
  await expect(
    sidebar.getByRole("button", { name: "Hội thoại 31", exact: true }),
  ).toHaveCount(1);
  await sidebar.evaluate((element) => {
    const scroll = element.closest("[data-history-scroll]")!;
    scroll.scrollTop = scroll.scrollHeight;
  });
  await expect(
    sidebar.getByRole("button", { name: "Hội thoại 65", exact: true }),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Làm mới hội thoại", exact: true })
    .click();
  await expect(
    sidebar.getByRole("button", { name: "Hội thoại 65", exact: true }),
  ).toHaveCount(1);
  await expect(
    sidebar.getByRole("button", { name: "Tải thêm hội thoại", exact: true }),
  ).toHaveCount(0);
  await page.getByText("Bộ nhớ & yêu cầu ghim", { exact: false }).click();
  await page
    .getByLabel("Yêu cầu luôn áp dụng (mỗi dòng một yêu cầu)")
    .fill("Giữ nguyên chữ trên sản phẩm");
  await page
    .getByRole("button", { name: "Lưu yêu cầu ghim", exact: true })
    .click();
  await expect.poll(() => savedPins).toEqual(["Giữ nguyên chữ trên sản phẩm"]);
  await page.waitForTimeout(2800);
  await expect(page.locator(".chat-message")).toHaveCount(120);
  expect(fixture.errors).toEqual([]);
});

test("recent conversations refresh independently of library errors and open real saved messages", async ({
  page,
}) => {
  const fixture = await setup(page);
  const conversation = {
    id: randomUUID(),
    title: "Hội thoại được lưu từ tab khác",
    messages: [
      {
        id: "saved-message",
        role: "user",
        text: "Nội dung hội thoại đã lưu",
        createdAt: new Date().toISOString(),
      },
    ],
    updatedAt: new Date().toISOString(),
  };
  let unavailable = false;
  let items: (typeof conversation)[] = [];
  await page.route("**/api/agent/history*", (route) =>
    route.fulfill(
      unavailable
        ? { status: 503, json: { message: "Không kết nối được lịch sử." } }
        : { json: { items, nextCursor: null, hasMore: false } },
    ),
  );
  await page.route("**/api/agent/assets", (route) =>
    route.fulfill({
      status: 503,
      json: { message: "Thư viện tạm thời không sẵn sàng." },
    }),
  );
  await page.route(`**/api/agent/conversations/${conversation.id}`, (route) =>
    route.fulfill({
      json: {
        conversation,
        runs: [],
        steps: [],
        results: [],
        messagePage: { hasMore: false, nextCursor: null },
      },
    }),
  );
  await page.reload();
  const recent = page.getByRole("region", {
    name: "Trò chuyện gần đây",
    exact: true,
  });
  await expect(recent).toContainText("Chưa có hội thoại đã lưu");
  items = [conversation];
  await expect(
    recent.getByRole("button", { name: conversation.title, exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await recent
    .getByRole("button", { name: conversation.title, exact: true })
    .click();
  await expect(
    page.getByText("Nội dung hội thoại đã lưu", { exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/#agent$/);
  conversation.title = "Tên hội thoại cập nhật";
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(
    recent.getByRole("button", { name: conversation.title, exact: true }),
  ).toHaveCount(1);
  await expect(
    recent.getByRole("button", {
      name: "Hội thoại được lưu từ tab khác",
      exact: true,
    }),
  ).toHaveCount(0);
  unavailable = true;
  await recent
    .getByRole("button", { name: "Làm mới hội thoại", exact: true })
    .click();
  await expect(
    page
      .locator("[data-sonner-toast][data-type=error]")
      .filter({ hasText: "Không kết nối được lịch sử" }),
  ).toContainText("Không kết nối được lịch sử");
  await expect(
    recent.getByRole("button", { name: conversation.title, exact: true }),
  ).toBeVisible();
  unavailable = false;
  await recent
    .getByRole("button", { name: "Làm mới hội thoại", exact: true })
    .click();
  await expect(
    page
      .locator("[data-sonner-toast][data-type=error]")
      .filter({ hasText: "Không kết nối được lịch sử" }),
  ).toHaveCount(0);
  await page.reload();
  await recent
    .getByRole("button", { name: conversation.title, exact: true })
    .click();
  await expect(
    page.getByText("Nội dung hội thoại đã lưu", { exact: true }),
  ).toBeVisible();
  expect(fixture.errors).toEqual([]);
});

test("new saved conversations remain in history if submitting the first task fails", async ({
  page,
}) => {
  const fixture = await setup(page);
  await page.route("**/api/agent/conversations/*/messages", (route) =>
    route.fulfill({
      status: 503,
      json: { message: "Hàng đợi tạm thời không sẵn sàng." },
    }),
  );
  await page
    .getByLabel("Giao việc hoặc yêu cầu chỉnh tiếp")
    .fill("Yêu cầu mới đã lưu hội thoại");
  await page.getByRole("button", { name: "Gửi yêu cầu", exact: true }).click();
  const recent = page.getByRole("region", {
    name: "Trò chuyện gần đây",
    exact: true,
  });
  await expect(
    recent.getByRole("button", {
      name: "Yêu cầu mới đã lưu hội thoại",
      exact: true,
    }),
  ).toHaveCount(1);
  await expect(
    page.locator("[data-sonner-toast][data-type=error]"),
  ).toContainText("Hàng đợi tạm thời không sẵn sàng");
  await page.reload();
  await expect(
    recent.getByRole("button", {
      name: "Yêu cầu mới đã lưu hội thoại",
      exact: true,
    }),
  ).toHaveCount(1);
  expect(fixture.errors).toEqual([]);
});

test("workflow editor stays usable on a small screen and supports keyboard reordering", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await setup(page);
  await page.goto("/#workflows");
  await page.getByRole("button", { name: "Tạo workflow", exact: true }).click();
  await page.getByRole("button", { name: "Thêm bước", exact: true }).click();
  await page
    .getByLabel("Tên bước", { exact: true })
    .nth(1)
    .fill("Mockup bước hai");
  const up = page.getByRole("button", { name: "Đưa bước 2 lên", exact: true });
  await up.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByLabel("Tên bước", { exact: true }).first(),
  ).toHaveValue("Mockup bước hai");
  await expect(
    page.getByLabel("Ảnh nguồn", { exact: true }).first(),
  ).toHaveValue("initial");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    375,
  );
  await page.screenshot({
    path: test.info().outputPath("workflow-mobile.png"),
    fullPage: true,
  });
});

test("root authentication hides navigation and tools on every direct link until login", async ({
  page,
}) => {
  const fixture = await setup(page, { skipLogin: true });
  const privateReads: string[] = [];
  page.on("request", (req) => {
    if (
      /\/api\/(?:image-jobs|agent\/(?:admin|history|assets|templates|workflows|runs))/.test(
        req.url(),
      )
    )
      privateReads.push(req.url());
  });
  for (const hash of [
    "agent",
    "home",
    "background-studio",
    "mockup-generator",
    "idea-generator",
    "image-editor",
    "jobs",
    "library",
    "workflows",
    "guide",
    "admin-users",
  ]) {
    await page.goto("/#" + hash);
    await expect(
      page.getByRole("button", { name: "Đăng nhập", exact: true }),
    ).toBeVisible();
    await expect(
      page.locator(".desktop-sidebar, .workspace-header, .agent-tool-page"),
    ).toHaveCount(0);
    await expect(
      page.locator(".agent-chat-workspace, .admin-page"),
    ).toHaveCount(0);
  }
  expect(privateReads).toEqual([]);
  await page.goto("/#background-studio");
  await page.getByLabel("Email", { exact: true }).fill("designer@example.com");
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill("test-password-at-least-12");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.locator(".workspace-header")).toBeVisible();
  await expect(page).toHaveURL(/#background-studio$/);
  await expect(
    page.getByRole("region", { name: "Mockup Studio", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".desktop-sidebar, .agent-tool-page")).toHaveCount(
    0,
  );
  expect(fixture.errors).toEqual([]);
});

test("session restoration blocks the entire workspace and handles expired or unavailable sessions", async ({
  page,
}) => {
  await setup(page);
  let finish: (() => void) | undefined;
  let checking: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const started = new Promise<void>((resolve) => {
    checking = resolve;
  });
  await page.route("**/api/agent/auth/me", async (route) => {
    checking?.();
    await pending;
    await route.fulfill({
      status: 401,
      json: { message: "Phiên đăng nhập đã hết hạn." },
    });
  });
  await page.goto("/#admin-users");
  await page.reload();
  await started;
  await expect(page.locator(".desktop-sidebar, .admin-page")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Đăng nhập", exact: true }),
  ).toHaveCount(0);
  finish?.();
  await expect(
    page.getByRole("button", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => sessionStorage.getItem("lcgmedia.agent.session")),
  ).toBeNull();
  await page.route("**/api/agent/auth/status", (route) =>
    route.fulfill({
      status: 503,
      json: { message: "Không kết nối được máy chủ." },
    }),
  );
  await page.reload();
  await expect(
    page.locator("[data-sonner-toast][data-type=error]"),
  ).toContainText("Không kết nối được máy chủ.");
  await expect(page.locator(".desktop-sidebar, .agent-tool-page")).toHaveCount(
    0,
  );
});

test("tool job history survives reload, shows results and cancels only queued work", async ({
  page,
}) => {
  await setup(page);
  const queued = {
    id: randomUUID(),
    requestId: "request-from-another-tab",
    state: "queued",
    createdAt: new Date().toISOString(),
  };
  const completed = {
    id: randomUUID(),
    requestId: "completed-request",
    state: "done",
    createdAt: new Date().toISOString(),
    result: { url: "https://cdn.example/result.png" },
  };
  await page.route("**/api/image-jobs", (route) =>
    route.fulfill({ json: [queued, completed] }),
  );
  let cancellations = 0;
  await page.route(`**/api/image-jobs/${queued.id}/cancel`, (route) => {
    cancellations++;
    queued.state = "cancelled";
    return route.fulfill({ json: { state: "failed", phase: "cancelled" } });
  });
  await page.goto("/#jobs");
  const region = page.getByRole("region", {
    name: "Tác vụ công cụ",
    exact: true,
  });
  await expect(region).toContainText("request-from-another-tab");
  await expect(
    region.getByRole("link", { name: "Mở kết quả 1" }),
  ).toHaveAttribute("href", "https://cdn.example/result.png");
  await page.reload();
  await expect(region).toContainText("request-from-another-tab");
  await region.getByRole("button", { name: "Hủy tác vụ", exact: true }).click();
  await expect(region).toContainText("Đã hủy");
  expect(cancellations).toBe(1);
  await expect(
    region.getByRole("button", { name: "Hủy tác vụ", exact: true }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    375,
  );
});

test("mobile login has no workspace menu and no horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await setup(page, { skipLogin: true });
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Mở menu", exact: true }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    375,
  );
});

const googleSdk = `
window.google = { accounts: { id: {
  initialize(options) { window.googleTestOptions = options; },
  renderButton(element) {
    const button = document.createElement('button');
    button.textContent = 'Continue with Google (test)';
    button.onclick = () => window.googleTestOptions.callback({credential: 'google-id-token-test'});
    element.append(button);
  }
} } };
`;
async function googleSetup(page: Page, failFirstSdk = false) {
  const fixture = await setup(page, { skipLogin: true });
  let sequence = 0;
  const nonces: string[] = [];
  await page.route("**/api/agent/auth/status", (route) =>
    route.fulfill({
      json: {
        enabled: true,
        setupRequired: false,
        google: {
          enabled: true,
          clientId: "test.apps.googleusercontent.com",
          allowedDomains: ["lcgmedia.uk", "second.example"],
        },
      },
    }),
  );
  await page.route("**/api/agent/auth/google/challenge", (route) => {
    const nonce = (++sequence).toString(16).padStart(64, "0");
    nonces.push(nonce);
    return route.fulfill({ json: { nonce, expiresAt: Date.now() + 600000 } });
  });
  let sdkAttempts = 0;
  await page.route("https://accounts.google.com/gsi/client", (route) =>
    failFirstSdk && ++sdkAttempts === 1
      ? route.abort("failed")
      : route.fulfill({
          contentType: "application/javascript",
          body: googleSdk,
        }),
  );
  return { ...fixture, nonces };
}

test("Google login sends the credential and challenge, locks pending login, and restores its session", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const fixture = await googleSetup(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let body: unknown;
  await page.route("**/api/agent/auth/google", async (route) => {
    body = route.request().postDataJSON();
    await gate;
    await route.fulfill({
      json: {
        token: "b".repeat(64),
        user: {
          id: randomUUID(),
          email: "staff@lcgmedia.uk",
          role: "designer",
        },
        expiresAt: Date.now() + 86400000,
      },
    });
  });
  await page.reload();
  await expect(
    page.getByText("Dùng email thuộc:", { exact: false }),
  ).toContainText("@lcgmedia.uk, @second.example");
  const googleButton = page.getByRole("button", {
    name: "Continue with Google (test)",
  });
  await expect(googleButton).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("google-login-mobile.png"),
    fullPage: true,
  });
  await googleButton.focus();
  await googleButton.press("Enter");
  await expect(
    page.getByRole("button", { name: "Đang đăng nhập…", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("status").filter({ hasText: "Đang đăng nhập…" }),
  ).toBeVisible();
  expect(body).toEqual({
    credential: "google-id-token-test",
    nonce: fixture.nonces.at(-1),
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  release();
  await expect(
    page.getByRole("heading", { name: /Một ý tưởng.*Cả quy trình/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => sessionStorage.getItem("lcgmedia.agent.session")),
  ).toBe("b".repeat(64));
  expect(
    await page.evaluate(() => JSON.stringify(sessionStorage)),
  ).not.toContain("google-id-token-test");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /Một ý tưởng.*Cả quy trình/ }),
  ).toBeVisible();
  expect(fixture.errors).toEqual([]);
});

for (const status of [401, 403]) {
  test(`Google ${status} errors stay visible and retry obtains a new challenge`, async ({
    page,
  }) => {
    const fixture = await googleSetup(page);
    await page.route("**/api/agent/auth/google", (route) =>
      route.fulfill({
        status,
        json: {
          code: "AGENT_GOOGLE_DOMAIN_DENIED",
          message: "Email không thuộc domain được phép.",
        },
      }),
    );
    await page.reload();
    await page
      .getByRole("button", { name: "Continue with Google (test)" })
      .click();
    await expect(
      page.locator("[data-sonner-toast][data-type=error]"),
    ).toContainText("Email không thuộc domain được phép.");
    await expect(
      page.getByText("Phiên đăng nhập đã hết hạn", { exact: false }),
    ).toHaveCount(0);
    const previousNonce = fixture.nonces.at(-1);
    await page.getByRole("button", { name: "Thử lại Google" }).click();
    await expect(
      page.getByRole("button", { name: "Continue with Google (test)" }),
    ).toBeVisible();
    expect(fixture.nonces.at(-1)).not.toBe(previousNonce);
    await page
      .getByLabel("Email", { exact: true })
      .fill("designer@example.com");
    await page
      .getByLabel("Mật khẩu", { exact: true })
      .fill("test-password-at-least-12");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: /Một ý tưởng.*Cả quy trình/ }),
    ).toBeVisible();
    expect(fixture.errors).toEqual([]);
  });
}

test("Google SDK failure has a retry and keeps password login available", async ({
  page,
}) => {
  const fixture = await googleSetup(page, true);
  await page.reload();
  await expect(
    page.locator("[data-sonner-toast][data-type=error]"),
  ).toContainText("Không tải được đăng nhập Google");
  await expect(
    page.getByRole("button", { name: "Đăng nhập", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Thử lại Google" }).click();
  await expect(
    page.getByRole("button", { name: "Continue with Google (test)" }),
  ).toBeVisible();
  expect(fixture.errors).toEqual([]);
});

test("unconfigured Google login does not load a third-party SDK", async ({
  page,
}) => {
  const scripts: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("accounts.google.com"))
      scripts.push(request.url());
  });
  await setup(page, { skipLogin: true });
  await expect(
    page.getByRole("button", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Đăng nhập Google" }),
  ).toHaveCount(0);
  expect(scripts).toEqual([]);
});

test("agent workspace is the default and supports navigation, asset reuse and export", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const fixture = await setup(page);
  await expect(page).toHaveTitle(/LCG Agent/);
  await expect(
    page.getByRole("heading", { name: /Một ý tưởng.*Cả quy trình/ }),
  ).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("agent-welcome-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: /Phát triển ý tưởng/ }).click();
  await expect(page.getByLabel("Quy trình", { exact: true })).toHaveValue(
    "design",
  );
  await expect(
    page.getByLabel("Giao việc hoặc yêu cầu chỉnh tiếp"),
  ).toHaveValue(/Đề xuất 3 ý tưởng/);
  expect(fixture.message).toBeUndefined();
  await page.getByRole("button", { name: "Thư viện", exact: true }).click();
  await expect(page.getByText("Một thư viện cho mọi sáng tạo")).toBeVisible();
  await page
    .getByLabel("Tải ảnh vào thư viện")
    .setInputFiles(image("library.png"));
  await expect(
    page.getByRole("heading", { name: "library.png", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Chọn library.png", { exact: true }).check();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Tải bộ ảnh ZIP", exact: true })
    .click();
  expect((await download).suggestedFilename()).toMatch(/\.zip$/);
  await page.getByRole("button", { name: "Tham chiếu", exact: true }).click();
  await expect(page).toHaveURL(/#agent$/);
  await expect(
    page.getByLabel("Giao việc hoặc yêu cầu chỉnh tiếp"),
  ).toHaveValue("");
  await expect(page.locator(".attachment-chip")).toContainText("library.png");
  await expect(page.locator(".attachment-chip")).toContainText("Tham chiếu");
  await page.getByRole("button", { name: "Công việc", exact: true }).click();
  await expect(
    page.getByText("Công việc tiếp theo bắt đầu từ bạn"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Trợ lý AI", exact: true }).click();
  await page
    .getByLabel("Model tạo / sửa ảnh", { exact: true })
    .selectOption("gpt-image-1.5-all");
  await page.getByRole("button", { name: "Trợ lý AI", exact: true }).click();
  await expect(
    page.getByLabel("Model tạo / sửa ảnh", { exact: true }),
  ).toHaveValue("gpt-image-1.5-all");
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Đóng ngữ cảnh", exact: true })
    .click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.screenshot({
    path: test.info().outputPath("agent-welcome-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  await page.getByRole("button", { name: "Thư viện", exact: true }).click();
  await expect(page).toHaveURL(/#library$/);
  await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  expect(fixture.errors).toEqual([]);
});

test("agent preserves edited prompt, locks the image model while running, restores history and exports results", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const fixture = await setup(page);
  // Illustrative mock assets; no model request is made by this browser test.
  let uploadedIds: string[] = [];
  page.on("response", async (response) => {
    if (
      response.url().endsWith("/api/agent/assets") &&
      response.request().method() === "POST"
    ) {
      const asset = (await response.json()) as { id: string };
      uploadedIds = [...uploadedIds, asset.id];
    }
  });
  await page.route(
    /\/api\/agent\/assets\/[^/]+\/(content|preview)/,
    (route) => {
      const id = route.request().url().split("/").at(-2);
      const kind =
        id === uploadedIds[0]
          ? "source"
          : id === uploadedIds[1]
            ? "reference"
            : "result";
      const ornament = (x: number, color: string, label: string) =>
        `<path d="M${x},20v40" stroke="#d6ae62" stroke-width="3"/><circle cx="${x}" cy="70" r="8" fill="none" stroke="#d6ae62" stroke-width="4"/><circle cx="${x}" cy="130" r="55" fill="${color}" stroke="#e9cc8d" stroke-width="4"/><path d="M${x - 26},148l26,-52 26,52z" fill="#2b6850"/><text x="${x}" y="169" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#564731">${label}</text>`;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="240" viewBox="0 0 360 240"><rect width="360" height="240" rx="18" fill="${kind === "source" ? "#f5eee1" : "#173c2e"}"/>${kind === "source" ? ornament(180, "#fff5dc", "CAMPING") : ornament(100, kind === "result" ? "#fff5dc" : "#c6856a", kind === "result" ? "CAMPING" : "OLD") + ornament(260, kind === "result" ? "#fff5dc" : "#99babb", kind === "result" ? "CAMPING" : "OLD")}</svg>`;
      return route.fulfill({ contentType: "image/svg+xml", body: svg });
    },
  );
  await page
    .getByLabel("Ảnh sản phẩm/thiết kế nguồn", { exact: true })
    .setInputFiles(image("product.png"));
  await expect(
    page.locator(".agent-composer").getByText("product.png", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Ảnh tham chiếu — cảnh cần giữ", { exact: true })
    .setInputFiles(image("reference.png"));
  await expect(
    page.locator(".agent-composer").getByText("reference.png", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Giao việc hoặc yêu cầu chỉnh tiếp")
    .fill("Thay ornament trong ảnh tham chiếu bằng sản phẩm nguồn.");
  await page.screenshot({
    path: test.info().outputPath("guide-inputs.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Gửi yêu cầu", exact: true }).click();
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
  await page.screenshot({
    path: test.info().outputPath("guide-approval.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Bắt đầu xử lý 1 ảnh" }).click();
  await expect(
    page.getByLabel("Model tạo / sửa ảnh", { exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: /^Công việc/ }).click();
  await page.getByRole("button", { name: "Trợ lý AI", exact: true }).click();
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
  await page.screenshot({
    path: test.info().outputPath("guide-results.png"),
    fullPage: true,
  });
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
  await expect(page.locator(".attachment-chip")).toHaveCount(2);
  expect(fixture.errors).toEqual([]);
  await page.screenshot({
    path: test.info().outputPath("agent-desktop.png"),
    fullPage: true,
  });
});

test("AI navigation preserves the conversation and draft; only New conversation clears the composer", async ({
  page,
}) => {
  const fixture = await setup(page);
  const composer = page.getByLabel("Giao việc hoặc yêu cầu chỉnh tiếp");
  await composer.fill("Một công việc cần tiếp tục trong cùng hội thoại");
  await page.getByRole("button", { name: "Gửi yêu cầu", exact: true }).click();
  await expect(
    page.getByLabel("Final prompt 1", { exact: true }),
  ).toBeVisible();
  await composer.fill("Giữ lại yêu cầu đang nhập dở");
  await page.getByRole("button", { name: "Công việc", exact: true }).click();
  await page.getByRole("button", { name: "Trợ lý AI", exact: true }).click();
  await expect(
    page.getByLabel("Final prompt 1", { exact: true }),
  ).toBeVisible();
  await expect(composer).toHaveValue("Giữ lại yêu cầu đang nhập dở");
  await expect(
    page.getByRole("button", { name: "Cấu hình Agent", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Trò chuyện mới", exact: true })
    .click();
  await expect(composer).toHaveValue("");
  await expect(page.getByLabel("Final prompt 1", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page
      .getByRole("navigation", { name: "Lịch sử công việc" })
      .getByRole("button"),
  ).toHaveCount(1);
  expect(fixture.started).toBe(false);
  expect(fixture.errors).toEqual([]);
});

test("legacy settings link opens the single model panel on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const fixture = await setup(page);
  await page.goto("/#settings");
  await expect(page).toHaveURL(/#agent$/);
  await expect(
    page.getByLabel("Model tạo / sửa ảnh", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Model tạo / sửa ảnh", { exact: true }),
  ).toHaveCount(1);
  expect(fixture.errors).toEqual([]);
});

test("usage guide covers the full flow with images, works on mobile and preserves the chat draft", async ({
  page,
}) => {
  const fixture = await setup(page);
  await page
    .getByLabel("Giao việc hoặc yêu cầu chỉnh tiếp")
    .fill("Bản nháp trước khi đọc hướng dẫn");
  await page
    .getByRole("button", { name: "Hướng dẫn sử dụng?", exact: true })
    .click();
  await expect(page).toHaveURL(/#guide$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Từ yêu cầu đầu tiên đến bộ ảnh hoàn chỉnh.",
  );
  const chapters = page
    .getByRole("navigation", { name: "Mục lục hướng dẫn" })
    .getByRole("button");
  await expect(chapters).toHaveCount(8);
  await chapters.nth(3).click();
  await expect(page.locator("#guide-heading-approve")).toBeFocused();
  for (const img of await page.locator(".guide-figure img").all()) {
    await img.scrollIntoViewIfNeeded();
    await expect
      .poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
  }
  await expect(
    page.getByRole("heading", { name: "Dành cho quản trị viên" }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await chapters.nth(0).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.screenshot({
    path: test.info().outputPath("guide-mobile.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Đi tới Trợ lý AI", exact: true })
    .click();
  await expect(
    page.getByLabel("Giao việc hoặc yêu cầu chỉnh tiếp"),
  ).toHaveValue("Bản nháp trước khi đọc hướng dẫn");
  expect(fixture.message).toBeUndefined();
  expect(fixture.errors).toEqual([]);
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
