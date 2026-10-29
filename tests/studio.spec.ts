import { studioPath } from "../src/navigation";
import { chooseOption } from "./select-helper";
import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { sampleBudget } from "./budget-fixture";
import type {
  StudioResource,
  StudioPlanStep,
  StudioSlot,
  StudioReview,
} from "../src/services/studio.service";

const image = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==",
  "base64",
);
async function setup(
  page: Page,
  options: { login?: boolean; leader?: boolean; admin?: boolean } = {},
) {
  const user = {
    id: randomUUID(),
    email: "seller@example.test",
    role: options.admin ? "admin" : "designer",
  };
  const ids = {
    team: randomUUID(),
    store: randomUUID(),
    product: randomUUID(),
    skill: randomUUID(),
    master: randomUUID(),
    photo: randomUUID(),
    source: randomUUID(),
  };
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const resources: StudioResource[] = [
    {
      id: ids.product,
      teamId: ids.team,
      type: "product",
      name: "Thảm in",
      code: "P01",
      status: "approved",
      revision: 1,
      instructions: "Flat printed velvet",
      printSpec: { width: 256, height: 128, dpi: 300, background: "white" },
      issues: [],
    },
    {
      id: ids.skill,
      teamId: ids.team,
      type: "skill",
      name: "Phát triển ý tưởng",
      code: "SK02",
      status: "approved",
      revision: 1,
      instructions: "Standalone variations",
      issues: [],
    },
    {
      id: ids.master,
      teamId: ids.team,
      type: "thumbnail",
      name: "Thảm trước cửa",
      code: "M01",
      status: "approved",
      assetId: ids.photo,
      revision: 1,
      instructions: "Keep mat geometry",
      issues: [],
    },
  ];
  let idea: Record<string, unknown> | undefined;
  let submitted = false;
  let reviewed = false;
  let saveBody: Record<string, unknown> | undefined;
  let failSave = false;
  let plans: StudioPlanStep[] = [];
  let resultSlots: StudioSlot[] = [],
    artworks: StudioSlot[] = [],
    outputReviews: StudioReview[] = [];
  let libraryBody: Record<string, unknown> | undefined,
    libraryCreatedId = "";
  let limitBootstrap = false;
  let tickets: Record<string, unknown>[] = [];
  let importedPrevious: string | undefined;
  let continued = false;
  let budgetLimit = 10,
    budgetVersion = 1,
    failBudget = false;
  let budgetBody: Record<string, unknown> | undefined;
  const opsBatchId = `night-2026-10-29-${ids.team}`,
    opsTicketId = randomUUID();
  let opsState = "missed",
    resumedBudget = false,
    uncertainOps = false;
  let dailyTime = "22:00",
    scheduleRevision = 0,
    failSchedule = false;
  let scheduleBody: Record<string, unknown> | undefined;
  const schedule = () => ({
    dailyTime,
    revision: scheduleRevision,
    timezone: "Asia/Ho_Chi_Minh",
    nextRunAt: new Date(`2026-10-30T${dailyTime}:00+07:00`).toISOString(),
  });
  await page.addInitScript(
    ({ login }) => {
      if (login)
        sessionStorage.setItem("lcgmedia.agent.session", "a".repeat(64));
    },
    { login: options.login !== false },
  );
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname,
      method = route.request().method();
    if (path === "/api/ai/providers")
      return route.fulfill({
        json: {
          defaults: {
            image: "shopaikey",
            text: "shopaikey",
            vision: "shopaikey",
          },
          providers: [
            {
              id: "shopaikey",
              name: "Provider 1",
              available: true,
              capabilities: ["text", "vision", "image"],
              routing: {
                image: "shopaikey",
                text: "shopaikey",
                vision: "shopaikey",
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
          models: [{ id: "test-image", name: "Ảnh nhanh" }],
        },
      });
    if (path === "/api/agent/auth/status")
      return route.fulfill({ json: { enabled: true, setupRequired: false } });
    if (path === "/api/agent/auth/me") return route.fulfill({ json: user });
    if (path === "/api/agent/usage")
      return route.fulfill({ json: sampleBudget(user.id) });
    if (path === "/api/agent/studio/dashboard")
      return route.fulfill({
        json: {
          ideas: { draft: 2, pending: 3 },
          tickets: { scheduled: 4, queued: 1 },
          mockups: { running: 2, failed: 1 },
          outputs: { images: 9, artworks: 3 },
          reviews: { approved: 8 },
          storeCount: 1,
          generatedAt: new Date().toISOString(),
        },
      });
    if (path === "/api/agent/studio/resources" && method === "POST") {
      libraryBody = route.request().postDataJSON() as Record<string, unknown>;
      const resource = {
        ...libraryBody,
        id: randomUUID(),
        revision: 1,
        status: "approved",
        issues: [],
      } as StudioResource;
      libraryCreatedId = resource.id;
      resources.push(resource);
      return route.fulfill({ json: resource });
    }
    if (
      /^\/api\/agent\/studio\/resources\/[^/]+$/.test(path) &&
      method === "GET"
    )
      return route.fulfill({
        json: resources.find((r) => path.endsWith(r.id)),
      });
    if (path === "/api/agent/studio/resources" && method === "GET") {
      const params = new URL(route.request().url()).searchParams;
      const type = params.get("type"),
        q = (params.get("q") ?? "").toLowerCase(),
        pageNumber = Number(params.get("page") ?? 1);
      const filtered = resources.filter(
        (r) =>
          (!type || r.type === type) &&
          (!q || `${r.name} ${r.code}`.toLowerCase().includes(q)),
      );
      return route.fulfill({
        json: {
          items: filtered.slice((pageNumber - 1) * 24, pageNumber * 24),
          total: filtered.length,
          page: pageNumber,
          limit: 24,
        },
      });
    }
    if (path.includes("/studio/team-budgets/")) {
      if (method === "PATCH") {
        if (failBudget)
          return route.fulfill({
            status: 409,
            json: {
              message: "Hạn mức Team đã thay đổi ở tab khác",
              code: "BUDGET_CONFLICT",
            },
          });
        budgetBody = route.request().postDataJSON() as Record<string, unknown>;
        budgetLimit = budgetBody.dailyLimit as number;
        budgetVersion++;
        return route.fulfill({ json: {} });
      }
      return route.fulfill({
        json: {
          items: [
            {
              id: "usage-1",
              owner: user.id,
              requestId: "request-budget-test",
              personalPeriod: "2026-10-26",
              status: "unresolved",
              reservedMicro: 1000000,
              scope: "slot-test",
            },
          ],
          total: 1,
          page: 1,
          limit: 30,
          summary: {
            teamId: ids.team,
            currency: "CREDIT",
            key: "2026-10-29",
            end: "2026-10-29T17:00:00.000Z",
            policyVersion: budgetVersion,
            dailyLimit: budgetLimit,
            configuredDailyLimit: budgetLimit,
            spent: 2,
            reserved: 1,
            available: budgetLimit === null ? null : budgetLimit - 3,
            usedPercent: budgetLimit === null ? null : (3 * 100) / budgetLimit,
            unresolvedCount: 1,
          },
        },
      });
    }
    if (path === "/api/agent/studio/operations/schedule") {
      if (method === "PATCH") {
        if (failSchedule)
          return route.fulfill({
            status: 409,
            json: {
              message: "Giờ chạy đã thay đổi ở tab khác",
              code: "STUDIO_REVISION_CONFLICT",
            },
          });
        scheduleBody = route.request().postDataJSON() as Record<
          string,
          unknown
        >;
        dailyTime = scheduleBody.dailyTime as string;
        scheduleRevision++;
      }
      return route.fulfill({ json: schedule() });
    }
    if (path === "/api/agent/studio/operations/batches")
      return route.fulfill({
        json: {
          items: [
            {
              id: opsBatchId,
              teamId: ids.team,
              occurrenceId: "night-2026-10-29",
              day: "2026-10-29",
              dueAt: "2026-10-29T15:00:00.000Z",
              ticketCount: 1,
              states: { [opsState]: 1 },
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
          schedulerEnabled: false,
        },
      });
    const opsTicket = () => ({
      id: opsTicketId,
      owner: user.id,
      state: opsState,
      dueAt: "2026-10-29T15:00:00.000Z",
      ideaRevision: 3,
      snapshot: {
        hash: "snapshot",
        input: { title: "Ý tưởng chạy đêm", count: 7 },
      },
    });
    if (path.startsWith("/api/agent/studio/operations/batches/"))
      return route.fulfill({
        json: {
          batch: { id: opsBatchId, teamId: ids.team, day: "2026-10-29" },
          occurrence: {
            cutoffAt: "2026-10-29T15:00:00.000Z",
            windowEndsAt: "2026-10-29T15:05:00.000Z",
          },
          items: [opsTicket()],
          total: 1,
          page: 1,
          limit: 30,
        },
      });
    if (path.endsWith("/resume-budget")) {
      resumedBudget = true;
      opsState = "queued";
      return route.fulfill({ json: opsTicket() });
    }
    if (path.startsWith("/api/agent/studio/operations/tickets/"))
      return route.fulfill({
        json: {
          ticket: opsTicket(),
          plans: [
            {
              id: "analysis-step",
              ticketId: opsTicketId,
              phase: "analysis",
              requestId: "ops-request",
              state: uncertainOps ? "interrupted" : "failed",
              errorCode: uncertainOps
                ? "BUDGET_REQUEST_UNRESOLVED"
                : "TEAM_BUDGET_EXCEEDED",
              error: uncertainOps
                ? "Chưa rõ kết quả AI"
                : "Team hết ngân sách ngày",
            },
          ],
          slots: [],
        },
      });
    if (path.endsWith("/catch-up")) {
      opsState = "queued";
      return route.fulfill({ json: opsTicket() });
    }
    if (path === "/api/agent/studio/bootstrap")
      return route.fulfill({
        json: {
          teams: [
            {
              id: ids.team,
              name: "Creative",
              memberIds: [user.id],
              members: [
                { userId: user.id, role: options.leader ? "leader" : "seller" },
              ],
            },
          ],
          stores: [
            {
              id: ids.store,
              name: "Store A",
              teamId: ids.team,
              sellerIds: [user.id],
              productIds: [ids.product],
            },
          ],
          resources: limitBootstrap ? resources.slice(0, 3) : resources,
          users: [],
          nextNight: "2026-10-28T15:00:00.000Z",
          schedule: schedule(),
          schedulerEnabled: true,
        },
      });
    if (path === "/api/agent/assets" && method === "POST")
      return route.fulfill({ json: { id: ids.source, name: "idea.png" } });
    if (path.endsWith("/context") && method === "POST") {
      const input = route.request().postDataJSON() as {
        paths: string[];
        revision: number;
      };
      const resource = resources.find((item) => path.includes(item.id))!;
      resource.selectedContextPaths = input.paths;
      resource.revision++;
      return route.fulfill({ json: resource });
    }
    if (path.endsWith("/versions"))
      return route.fulfill({
        json: resources.filter((resource) => resource.type === "skill"),
      });
    if (path.endsWith("/bundle"))
      return route.fulfill({
        body: Buffer.from("original zip"),
        contentType: "application/zip",
      });
    if (path.endsWith("/skills/import")) {
      importedPrevious = route
        .request()
        .postDataBuffer()
        ?.toString()
        .match(/name="previousId"\r\n\r\n([^\r]+)/)?.[1];
      return route.fulfill({
        json: {
          resource: { ...resources[1], id: randomUUID(), versionNumber: 2 },
          masters: [],
        },
      });
    }
    if (path.endsWith("/review") && path.includes("/resources/")) {
      const resource = resources.find((item) => path.includes(item.id))!;
      resource.status = "approved";
      resource.revision++;
      return route.fulfill({ json: resource });
    }
    if (path.endsWith("/continue")) {
      continued = true;
      tickets[0] = { ...tickets[0], state: "queued", dispatchCount: 7 };
      return route.fulfill({ json: tickets[0] });
    }
    if (path.startsWith("/api/agent/studio/assets/"))
      return route.fulfill({ contentType: "image/png", body: image });
    if (path === "/api/agent/studio/ideas" && method === "GET")
      return route.fulfill({
        json: {
          items: idea ? [idea] : [],
          total: idea ? 1 : 0,
          page: 1,
          limit: 24,
        },
      });
    if (path === "/api/agent/studio/ideas" && method === "POST") {
      if (failSave)
        return route.fulfill({
          status: 409,
          json: {
            message: "Bản nháp đã thay đổi ở tab khác",
            code: "STUDIO_REVISION_CONFLICT",
          },
        });
      saveBody = route.request().postDataJSON() as Record<string, unknown>;
      idea = {
        id: randomUUID(),
        owner: user.id,
        teamId: ids.team,
        input: saveBody,
        revision: 1,
        state: "draft",
        reviewNote: "",
        updatedAt: new Date().toISOString(),
      };
      return route.fulfill({ json: idea });
    }
    if (path.endsWith("/submit")) {
      submitted = true;
      idea = { ...idea, state: "pending", revision: 2 };
      return route.fulfill({ json: idea });
    }
    if (path.endsWith("/reviews") && method === "POST") {
      const input = route.request().postDataJSON() as {
        assetId: string;
        decision: "approved" | "changes_requested";
        note: string;
      };
      outputReviews = outputReviews.filter((r) => r.assetId !== input.assetId);
      outputReviews.push({
        ...input,
        id: randomUUID(),
        ticketId: tickets[0].id as string,
      });
      return route.fulfill({ json: {} });
    }
    if (path.endsWith("/review")) {
      reviewed = true;
      idea = { ...idea, state: "approved", revision: 3 };
      return route.fulfill({ json: idea });
    }
    if (path.startsWith("/api/agent/studio/ideas/") && method === "PATCH") {
      if (failSave)
        return route.fulfill({
          status: 409,
          json: {
            message: "Bản nháp đã thay đổi ở tab khác",
            code: "STUDIO_REVISION_CONFLICT",
          },
        });
      const change = route.request().postDataJSON() as {
        input: Record<string, unknown>;
        revision: number;
      };
      saveBody = change.input;
      idea = {
        ...idea,
        input: change.input,
        revision: change.revision + 1,
        state: "draft",
      };
      return route.fulfill({ json: idea });
    }
    if (path.startsWith("/api/agent/studio/ideas/"))
      return route.fulfill({
        json: {
          idea,
          tickets,
          slots: resultSlots,
          artworks,
          reviews: outputReviews,
          assets: [],
          plans,
        },
      });
    if (path === "/api/agent/studio/mockups" && method === "GET")
      return route.fulfill({
        json: { items: [], page: 1, total: 0, limit: 20 },
      });
    if (path === "/api/agent/studio/outputs")
      return route.fulfill({
        json: { items: [], page: 1, total: 0, limit: 24 },
      });
    return route.fulfill({
      status: 404,
      json: { message: "Unmocked path " + path },
    });
  });
  return {
    user,
    ids,
    errors,
    catalogBeyondBootstrap: () => {
      limitBootstrap = true;
      for (let i = 0; i < 30; i++)
        resources.push({
          ...resources[2],
          id: randomUUID(),
          type: "scene",
          name: `Bối cảnh ngoài trang ${i}`,
          code: `OUT${i}`,
        });
    },
    libraryBody: () => libraryBody,
    libraryCreatedId: () => libraryCreatedId,
    expandCatalog: () => {
      for (let i = 0; i < 30; i++)
        resources.push({
          ...resources[2],
          type: "scene",
          id: randomUUID(),
          name: `Bối cảnh tùy chỉnh ${i}`,
          code: `SC${i}`,
        });
    },
    setArtwork: () => {
      const rawId = randomUUID(),
        thumbId = randomUUID(),
        ticketId = tickets[0].id as string;
      tickets[0] = { ...tickets[0], state: "review" };
      resultSlots = [
        {
          id: "thumb",
          ticketId,
          index: 0,
          role: "thumbnail",
          artworkId: rawId,
          state: "done",
          resultId: thumbId,
          prompt: "Use artwork in target",
          requestId: "thumb-request",
        },
      ];
      artworks = [
        {
          id: "raw",
          ticketId,
          index: 0,
          role: "artwork",
          state: "done",
          resultId: rawId,
          prompt: "Flat independent artwork",
          requestId: "raw-request",
        },
      ];
      outputReviews = [
        {
          id: "thumb-review",
          ticketId,
          assetId: thumbId,
          decision: "approved",
          note: "",
        },
      ];
      return { rawId, thumbId, ticketId };
    },
    scheduleBody: () => scheduleBody,
    failSchedule: () => {
      failSchedule = true;
    },
    addMockupScene: () => {
      const scene = {
        ...resources[2],
        id: randomUUID(),
        type: "scene" as const,
        name: "Phòng khách",
        code: "SC01",
      };
      resources.push(scene);
      return scene;
    },
    ideaId: () => idea?.id as string | undefined,
    payload: () => saveBody,
    submitted: () => submitted,
    reviewed: () => reviewed,
    failSave: () => {
      failSave = true;
    },
    enableSkillVersion: () => {
      Object.assign(resources[1], {
        status: "pending",
        importState: "ready",
        versionNumber: 1,
        declaredVersion: "2.2",
        bundleId: randomUUID(),
        contextImages: [
          { id: ids.photo, path: "cases/example.png", sha256: "hash" },
        ],
        selectedContextPaths: [],
        warnings: ["Link ngoài không tự đồng bộ"],
        files: [{ path: "SKILL.md", bytes: 42, sha256: "hash" }],
      });
    },
    importedPrevious: () => importedPrevious,
    setSampleReview: () => {
      tickets[0] = { ...tickets[0], state: "sample_review", dispatchCount: 2 };
    },
    continued: () => continued,
    budgetBody: () => budgetBody,
    failBudget: () => {
      failBudget = true;
    },
    blockOps: (uncertain = false) => {
      opsState = "blocked";
      uncertainOps = uncertain;
    },
    resumedBudget: () => resumedBudget,
    setPlan: (ideaId: string, interrupted = false) => {
      const ticketId = ideaId + "-r3";
      tickets = [
        {
          id: ticketId,
          owner: user.id,
          state: interrupted ? "blocked" : "running",
          dueAt: new Date().toISOString(),
          ideaRevision: 3,
          snapshot: { hash: "snapshot", input: { count: 7 } },
        },
      ];
      plans = [
        {
          id: ticketId + "-analysis",
          ticketId,
          phase: "analysis",
          requestId: randomUUID(),
          state: interrupted ? "interrupted" : "done",
          ...(interrupted
            ? {
                error:
                  "Phân tích bị gián đoạn. Cần đối soát, không tự gửi lại.",
              }
            : {
                analysis: {
                  summary:
                    "Ảnh gốc có chủ đề thú cưng; ảnh master quy định hình học thảm.",
                  invariants: ["Tinh thần thú cưng"],
                  editable: ["Khung và bố cục"],
                  sourceArtifacts: ["Không chuyển dây treo"],
                  risks: ["Chữ cần kiểm tra lại"],
                },
              }),
        },
        ...(!interrupted
          ? [
              {
                id: ticketId + "-briefs",
                ticketId,
                phase: "briefs" as const,
                requestId: randomUUID(),
                state: "done",
                briefs: [
                  {
                    title: "Khung mộc Giáng sinh",
                    direction: "Chủ thể tương tác khung",
                    composition: "Cân đối theo mẫu cửa hàng",
                    palette: "Nâu kem",
                    prompt: "Tạo một ảnh độc lập giữ hình học thảm",
                  },
                ],
              },
            ]
          : []),
      ];
    },
    setPending: () => {
      idea = {
        id: randomUUID(),
        owner: randomUUID(),
        teamId: ids.team,
        state: "pending",
        revision: 2,
        reviewNote: "",
        updatedAt: new Date().toISOString(),
        input: {
          title: "Bộ thảm thú cưng",
          sourceId: ids.source,
          storeId: ids.store,
          productId: ids.product,
          skillId: ids.skill,
          thumbnailId: ids.master,
          brief: "Phát triển thiết kế",
          count: 7,
          timing: "now",
          imageModel: "test-image",
        },
      };
      return idea.id as string;
    },
  };
}
async function wizard(page: Page) {
  await page.goto(studioPath("studio-new"));
  await page.getByLabel("Tên ý tưởng").fill("Bộ quà thú cưng");
  await chooseOption(page, page.getByRole("combobox", { name: /^Sản phẩm/ }), {
    label: "P01 · Thảm in",
  });
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "idea.png", mimeType: "image/png", buffer: image });
  await expect(page.getByText("idea.png", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await chooseOption(
    page,
    page.getByRole("combobox", { name: /^Bộ hướng dẫn/ }),
    { label: "SK02 · Phát triển ý tưởng" },
  );
  await chooseOption(
    page,
    page.getByRole("combobox", { name: /^Mẫu ảnh chính của cửa hàng/ }),
    { label: "M01 · Thảm trước cửa" },
  );
  await page
    .getByLabel("Mô tả cách phát triển")
    .fill("Redesign thành 7 mẫu riêng biệt theo bộ hướng dẫn");
  await page.getByRole("button", { name: "Tiếp tục" }).click();
}

test("routes survive reload and browser history without rechecking the session on each navigation", async ({
  page,
}) => {
  await setup(page, { admin: true });
  let authChecks = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/agent/auth/me") authChecks++;
  });
  await page.goto("/ideas");
  await expect(
    page.getByRole("heading", { name: "Ý tưởng của nhóm", exact: true }),
  ).toBeVisible();
  const initial = authChecks;
  await page
    .getByRole("button", { name: "Mockup Studio", exact: true })
    .click();
  await expect(page).toHaveURL(/\/mockups$/);
  await page
    .getByRole("button", { name: "Quản trị công ty", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Tạo mockup", exact: true }),
  ).toBeVisible();
  expect(authChecks).toBe(initial);
  await page.goto("/manage/stores");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Cửa hàng", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Thư viện", exact: true }).click();
  await expect(page).toHaveURL(/\/manage\/library$/);
});

test("page skeleton holds the layout during loading and respects reduced motion", async ({
  page,
}) => {
  await setup(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/agent/studio/bootstrap", async (route) => {
    await gate;
    await route.fallback();
  });
  try {
    await page.goto("/ideas");
    const skeleton = page.locator(
      ".studio-main .studio-skeleton[aria-busy=true]",
    );
    await expect(skeleton).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Ý tưởng của nhóm", exact: true }),
    ).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(
      await skeleton
        .locator("i")
        .first()
        .evaluate((el) => getComputedStyle(el).animationName),
    ).toBe("none");
    await page.screenshot({
      path: "test-results/studio-route-skeleton.png",
      fullPage: true,
    });
    release();
    await expect(
      page.getByRole("heading", { name: "Ý tưởng của nhóm", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".studio-skeleton")).toHaveCount(0);
  } finally {
    release();
  }
});

test("status select uses icons, keyboard selection and returns focus after Escape", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/ideas");
  const control = page.getByRole("combobox", {
    name: "Lọc trạng thái ý tưởng",
    exact: true,
  });
  await expect(control).toBeVisible();
  await control.focus();
  await control.press("ArrowDown");
  await expect(page.getByRole("listbox")).toBeVisible();
  await expect(
    page
      .getByRole("option", { name: "Chờ Leader duyệt", exact: true })
      .locator("svg")
      .first(),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/studio-status-select.png",
    fullPage: true,
  });
  await page.keyboard.press("End");
  await expect(
    page.getByRole("option", { name: "Đã duyệt", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(control).toHaveAttribute("data-value", "approved");
  await control.click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(control).toBeFocused();
});

test("custom select preserves required form validation and focuses the missing choice", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/ideas/new");
  await page.getByLabel("Tên ý tưởng").fill("Thiếu sản phẩm");
  const product = page.getByRole("combobox", { name: /^Sản phẩm/ });
  await expect(product).toBeEnabled();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await expect(product).toHaveAttribute("aria-invalid", "true");
  await expect(product).toBeFocused();
  await expect(page.getByRole("alert")).toContainText("Vui lòng chọn một mục.");
  await chooseOption(page, product, { label: "P01 · Thảm in" });
  await expect(product).not.toHaveAttribute("aria-invalid", "true");
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Ảnh ý tưởng", exact: true }),
  ).toBeVisible();
});

test("employees and Team Leaders cannot choose an automatic schedule", async ({
  page,
}) => {
  await setup(page, { leader: true });
  await wizard(page);
  await page.getByRole("button", { name: "Quay lại", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Khi nào thực hiện?", exact: true })
    .click();
  await expect(page.getByRole("option", { name: /Lên lịch/ })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Vận hành lịch", exact: true }),
  ).toHaveCount(0);
  await page.goto("/manage/schedule");
  await expect(
    page.getByRole("heading", { name: "Khu vực quản trị", exact: true }),
  ).toBeVisible();
});

test("new shell owns admin routes and retired links never mount the chat workspace", async ({
  page,
}) => {
  const fixture = await setup(page, { admin: true });
  await page.goto(studioPath("agent"));
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: "Tổng quan công việc" }),
  ).toBeVisible();
  await expect(
    page.locator(".agent-application,.workspace-shell,.agent-composer"),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Thumbnail Library", exact: true })
    .click();
  await expect(page).toHaveURL(/\/manage\/library\?type=thumbnail$/);
  await expect(
    page.getByRole("combobox", { name: "Loại nội dung", exact: true }),
  ).toHaveAttribute("data-value", "thumbnail");
  expect(fixture.errors).toEqual([]);
});

test("idea workbench keeps previews and submit inside the desktop viewport through all four steps", async ({
  page,
}) => {
  const fixture = await setup(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await wizard(page);
  await expect(
    page.locator(".studio-wizard-preview .studio-image"),
  ).toHaveCount(2);
  const action = page.getByRole("button", {
    name: "Gửi Leader duyệt",
    exact: true,
  });
  const bounds = await action.boundingBox();
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(900);
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight),
  ).toBeLessThanOrEqual(900);
  await page.screenshot({
    path: "test-results/studio-redesign-idea.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1366, height: 768 });
  const compactBounds = await action.boundingBox();
  expect(compactBounds!.y + compactBounds!.height).toBeLessThanOrEqual(768);
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight),
  ).toBeLessThanOrEqual(768);
  expect(fixture.errors).toEqual([]);
});

test("mockup workbench separates controls into three panels without an outer desktop scroll", async ({
  page,
}) => {
  const fixture = await setup(page);
  fixture.addMockupScene();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(studioPath("studio-mockups"));
  await expect(page.getByLabel("Tên bộ ảnh", { exact: true })).toBeVisible();
  await expect(page.locator(".studio-mockup-columns>.studio-card")).toHaveCount(
    3,
  );
  const controls = await page
    .locator(".studio-mockup-config")
    .evaluate((el) => {
      const boxes = [
        ...el.querySelectorAll(
          "#mockup-title, #mockup-store, .studio-catalog-select > label > [role=combobox]",
        ),
      ]
        .map((e) => e.getBoundingClientRect())
        .filter((b) => b.width > 0);
      return (
        boxes.length === 3 &&
        boxes.slice(1).every((b, i) => b.left >= boxes[i].right + 12)
      );
    });
  expect(controls).toBe(true);
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight),
  ).toBeLessThanOrEqual(900);
  await page.getByRole("button", { name: /Bộ ảnh đã lưu/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "Bộ ảnh mockup đã lưu" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.screenshot({
    path: "test-results/studio-redesign-mockup.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1366, height: 768 });
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight),
  ).toBeLessThanOrEqual(768);
  const submitBounds = await page
    .getByRole("button", { name: /^Tạo \d+ ảnh mockup$/ })
    .boundingBox();
  expect(submitBounds!.y + submitBounds!.height).toBeLessThanOrEqual(768);
  expect(fixture.errors).toEqual([]);
});
test("Design Gallery keeps the idea rail and loads the selected design without opening a legacy page", async ({
  page,
}) => {
  const fixture = await setup(page);
  await wizard(page);
  await page
    .getByRole("button", { name: "Gửi Leader duyệt", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Bộ quà thú cưng", exact: true }),
  ).toBeVisible();
  await page.goto(studioPath("studio-gallery"));
  const rail = page.getByRole("complementary", {
    name: "Ý tưởng trong Gallery",
  });
  await expect(rail).toBeVisible();
  await rail.getByRole("button", { name: /Bộ quà thú cưng/ }).click();
  await expect(page).toHaveURL(/\/gallery\//);
  await expect(
    page
      .getByRole("region", { name: "Thiết kế của ý tưởng" })
      .getByRole("heading", { name: "Bộ quà thú cưng", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".agent-application")).toHaveCount(0);
  expect(fixture.errors).toEqual([]);
});

test("Studio is protected at the root and does not expose navigation before login", async ({
  page,
}) => {
  const fixture = await setup(page, { login: false });
  await page.goto(studioPath("studio"));
  await expect(
    page.getByRole("heading", { name: "Đăng nhập không gian làm việc" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Điều hướng Studio" }),
  ).toHaveCount(0);
  expect(fixture.errors).toEqual([]);
});
test("employee completes the four-step idea flow with distinct source/master and sees approval state", async ({
  page,
}) => {
  const fixture = await setup(page);
  await wizard(page);
  await expect(
    page
      .locator(".studio-wizard-preview")
      .getByRole("img", { name: "Ảnh ý tưởng tham khảo", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Gửi Leader duyệt" }).click();
  await expect(
    page.getByRole("heading", { name: "Bộ quà thú cưng" }),
  ).toBeVisible();
  expect(fixture.submitted()).toBe(true);
  expect(fixture.payload()).toMatchObject({
    sourceId: fixture.ids.source,
    thumbnailId: fixture.ids.master,
    skillId: fixture.ids.skill,
    count: 7,
    imageModel: "test-image",
  });
  await expect(
    page.getByRole("button", { name: "Duyệt & chạy", exact: true }),
  ).toHaveCount(0);
  expect(fixture.errors).toEqual([]);
});
test("Leader can approve; revisions are sent explicitly", async ({ page }) => {
  const fixture = await setup(page, { leader: true });
  const id = fixture.setPending();
  await page.goto(studioPath(`studio-ideas?id=${id}`));
  await page.getByRole("button", { name: "Duyệt & chạy", exact: true }).click();
  await expect(
    page.getByText("Đã duyệt", { exact: true }).first(),
  ).toBeVisible();
  expect(fixture.reviewed()).toBe(true);
  expect(fixture.errors).toEqual([]);
});
test("failed save is visible and never advances to a success detail", async ({
  page,
}) => {
  const fixture = await setup(page);
  fixture.failSave();
  await wizard(page);
  await page.getByRole("button", { name: "Gửi Leader duyệt" }).click();
  await expect(page.getByText("Bản nháp đã thay đổi ở tab khác")).toBeVisible();
  expect(fixture.submitted()).toBe(false);
  await expect(page).toHaveURL(/\/ideas\/new$/);
  expect(fixture.errors).toEqual([]);
});
test("mobile dashboard and menu have no horizontal overflow", async ({
  page,
}) => {
  const fixture = await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(studioPath("studio"));
  await expect(
    page.getByRole("heading", { name: /Tổng quan công việc/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Mở menu" }).click();
  await page.getByRole("button", { name: "Idea Board", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Ý tưởng của nhóm", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(fixture.errors).toEqual([]);
  await page.screenshot({
    path: "test-results/studio-mobile.png",
    fullPage: true,
  });
});
test("incomplete drafts autosave on the server and restore after reload", async ({
  page,
}) => {
  const fixture = await setup(page);
  await page.goto(studioPath("studio-new"));
  await page.getByLabel("Tên ý tưởng").fill("Nháp đang chuẩn bị");
  await expect(
    page.getByText("Đã lưu lên máy chủ", { exact: true }),
  ).toBeVisible();
  expect(fixture.payload()).toMatchObject({
    title: "Nháp đang chuẩn bị",
    sourceId: "",
    skillId: "",
  });
  await page.goto(studioPath(`studio-new?id=${fixture.ideaId()}`));
  await expect(page.getByLabel("Tên ý tưởng")).toHaveValue(
    "Nháp đang chuẩn bị",
  );
  expect(fixture.submitted()).toBe(false);
  expect(fixture.errors).toEqual([]);
});
test("desktop Studio has a readable dashboard and one main page scroll", async ({
  page,
}) => {
  const fixture = await setup(page);
  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.goto(studioPath("studio"));
  await expect(
    page.getByRole("heading", { name: /Tổng quan công việc/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Điều hướng Studio" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/studio-desktop.png",
    fullPage: true,
  });
  expect(fixture.errors).toEqual([]);
});
test("admin reviews skill case context, downloads original ZIP, sees history and upgrades immutably", async ({
  page,
}) => {
  const fixture = await setup(page, { admin: true });
  fixture.enableSkillVersion();
  await page.goto(studioPath("studio-manage"));
  await page.getByRole("button", { name: "Thư viện", exact: true }).click();
  await expect(page.getByText("Phiên bản 1", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Lịch sử", exact: true }).click();
  await expect(page.getByRole("list", { name: "Lịch sử SK02" })).toBeVisible();
  await page.getByText("Ảnh ví dụ làm ngữ cảnh (0/4)", { exact: true }).click();
  await page.getByRole("checkbox", { name: "example.png" }).click();
  await expect(
    page.getByText("Ảnh ví dụ làm ngữ cảnh (1/4)", { exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "ZIP gốc", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("SK02_v1.zip");
  await page
    .getByRole("button", { name: "Duyệt để sử dụng", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "example.png" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Nâng phiên bản", exact: true })
    .click();
  await expect(
    page.getByLabel("Phiên bản trước (nếu cập nhật)"),
  ).toHaveAttribute("data-value", fixture.ids.skill);
  await page.locator('input[accept=".zip"]').setInputFiles({
    name: "skill.zip",
    mimeType: "application/zip",
    buffer: Buffer.from("zip fixture"),
  });
  await page.getByRole("button", { name: "Thêm & kiểm tra ZIP" }).click();
  await expect.poll(fixture.importedPrevious).toBe(fixture.ids.skill);
  expect(fixture.errors).toEqual([]);
});
test("creative preparation displays observed image roles, risks and each planned brief on mobile", async ({
  page,
}) => {
  const fixture = await setup(page);
  const id = fixture.setPending();
  fixture.setPlan(id);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(studioPath(`studio-ideas?id=${id}`));
  await expect(
    page.getByRole("heading", { name: "Chuẩn bị sáng tạo" }),
  ).toBeVisible();
  await expect(
    page.getByText("Tinh thần thú cưng", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Không chuyển dây treo", { exact: true }),
  ).toBeVisible();
  await page
    .locator("summary")
    .filter({ hasText: "Khung mộc Giáng sinh" })
    .click();
  await expect(
    page.getByText("Chủ thể tương tác khung", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/studio-creative-plan-mobile.png",
    fullPage: true,
  });
  expect(fixture.errors).toEqual([]);
});
test("uncertain planning remains visible as a persistent error without a misleading success", async ({
  page,
}) => {
  const fixture = await setup(page);
  const id = fixture.setPending();
  fixture.setPlan(id, true);
  await page.goto(studioPath(`studio-ideas?id=${id}`));
  await expect(
    page.getByRole("alert").filter({ hasText: "Phân tích bị gián đoạn" }),
  ).toBeVisible();
  await expect(
    page.getByRole("alert").filter({ hasText: "Chưa tạo ảnh" }),
  ).toBeVisible();
  expect(fixture.errors).toEqual([]);
});
test("daytime sample configuration is visible in confirmation and nightly runs stay automatic", async ({
  page,
}) => {
  const fixture = await setup(page);
  await wizard(page);
  await page.getByRole("button", { name: "Quay lại", exact: true }).click();
  await page
    .getByText("Chạy thử trước khi tạo toàn bộ", { exact: true })
    .click();
  await chooseOption(
    page,
    page.getByRole("combobox", { name: /^Số mẫu tạo trước/ }),
    "2",
  );
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await expect(
    page.getByText("Tạo trước 2 mẫu, chờ xác nhận để tạo 5 mẫu còn lại", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Gửi Leader duyệt", exact: true })
    .click();
  expect(fixture.payload()).toMatchObject({
    sampleCount: 2,
    count: 7,
    timing: "now",
  });
});
test("Leader explicitly continues remaining samples with a cost notice", async ({
  page,
}) => {
  const fixture = await setup(page, { leader: true });
  const id = fixture.setPending();
  fixture.setPlan(id);
  fixture.setSampleReview();
  await page.goto(studioPath(`studio-ideas?id=${id}`));
  await expect(
    page.getByText(/Tạo phần còn lại có thể phát sinh thêm phí AI/),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Tạo thêm 5 mẫu còn lại", exact: true })
    .click();
  await expect.poll(fixture.continued).toBe(true);
  await expect(
    page.getByText(
      "Đã tiếp nhận phần còn lại. Không tạo lại mẫu đã hoàn tất.",
      { exact: true },
    ),
  ).toBeVisible();
  expect(fixture.errors).toEqual([]);
});
test("admin sees credit Team usage, changes the daily cap and retains conflicts without false success", async ({
  page,
}) => {
  const fixture = await setup(page, { admin: true });
  await page.goto(studioPath("studio-manage"));
  await page
    .getByRole("button", { name: "Ngân sách Team", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "7 credit khả dụng", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("progressbar", { name: "Usage Team đã dùng và giữ chỗ" }),
  ).toHaveAttribute("value", "30");
  await page.getByLabel("Hạn mức Team mỗi ngày (credit)").fill("20");
  await page.getByLabel("Lý do thay đổi").fill("Tăng hạn mức cho chiến dịch");
  await page
    .getByRole("button", { name: "Lưu hạn mức Team", exact: true })
    .click();
  await expect
    .poll(fixture.budgetBody)
    .toMatchObject({ dailyLimit: 20, policyVersion: 1 });
  await expect(
    page.getByRole("heading", { name: "17 credit khả dụng", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/studio-team-budget-desktop.png",
    fullPage: true,
  });
  await page.getByText("Cần đối soát · 1 credit", { exact: true }).click();
  await expect(
    page.getByText("request-budget-test", { exact: true }),
  ).toBeVisible();
  fixture.failBudget();
  await page.getByLabel("Hạn mức Team mỗi ngày (credit)").fill("30");
  await page.getByLabel("Lý do thay đổi").fill("Sửa sau tab khác");
  await page
    .getByRole("button", { name: "Lưu hạn mức Team", exact: true })
    .click();
  await expect(
    page.getByText("Hạn mức Team đã thay đổi ở tab khác", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "17 credit khả dụng", exact: true }),
  ).toBeVisible();
  expect(fixture.errors).toEqual([]);
});
test("operations keeps missed batch history, supports catch-up and only resumes known budget rejections", async ({
  page,
}) => {
  const fixture = await setup(page, { admin: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(studioPath("studio-manage"));
  await page
    .getByRole("button", { name: "Vận hành lịch", exact: true })
    .click();
  await expect(
    page.getByText(/Lịch tự động chưa bật trên máy chủ/),
  ).toBeVisible();
  await page.getByRole("button", { name: /Creative · 2026-10-29/ }).click();
  await page
    .getByRole("button", { name: "Chạy bù lô bị lỡ", exact: true })
    .click();
  await expect(
    page.getByText(
      "Đã tiếp nhận chạy bù. Dùng lại lượt và các kết quả hiện có.",
      { exact: true },
    ),
  ).toBeVisible();
  fixture.blockOps();
  await page
    .getByRole("button", { name: "Cập nhật lô chạy", exact: true })
    .click();
  await page.getByRole("button", { name: /Ý tưởng chạy đêm/ }).click();
  await page
    .getByLabel("Lý do tiếp tục sau khi xử lý hạn mức/giá/quyền")
    .fill("Đã tăng hạn mức Team");
  await page
    .getByRole("button", { name: "Tiếp tục phần chưa gửi AI", exact: true })
    .click();
  await expect.poll(fixture.resumedBudget).toBe(true);
  fixture.blockOps(true);
  await page
    .getByRole("button", { name: "Cập nhật lô chạy", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Tiếp tục phần chưa gửi AI",
      exact: true,
    }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/studio-operations-mobile.png",
    fullPage: true,
  });
  expect(fixture.errors).toEqual([]);
});

test("mockup creates a persisted Team set with exact scene/color inputs and resumes only the missing combination", async ({
  page,
}) => {
  const fixture = await setup(page);
  const scene = fixture.addMockupScene();
  const jobId = "mockup-test",
    output = randomUUID();
  let body: Record<string, unknown> | undefined,
    approved = false,
    continued = false;
  await page.route("**/api/agent/studio/mockups**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/review")) {
      approved = true;
      return route.fulfill({ json: {} });
    }
    if (path.endsWith("/continue")) {
      continued = true;
      return route.fulfill({ json: {} });
    }
    if (route.request().method() === "POST") {
      body = route.request().postDataJSON() as Record<string, unknown>;
      return route.fulfill({ json: { id: jobId } });
    }
    if (path.endsWith("/mockups"))
      return route.fulfill({
        json: { items: [], page: 1, total: 0, limit: 20 },
      });
    return route.fulfill({
      json: {
        job: {
          id: jobId,
          title: "Bộ ảnh mockup",
          state: continued ? "queued" : "partial_failed",
          count: 2,
          storeId: fixture.ids.store,
          product: { name: "Thảm in" },
          sources: [{ image: { id: fixture.ids.source } }],
          scenes: [
            { id: scene.id, name: scene.name, image: { id: scene.assetId } },
          ],
        },
        slots: [
          {
            id: "slot1",
            index: 0,
            sourceIndex: 0,
            sceneId: scene.id,
            color: "trắng",
            state: "done",
            resultId: output,
            prompt: "ẢNH 1 nguồn; ẢNH 2 đích. Không tạo watermark.",
            requestId: "r1",
          },
          {
            id: "slot2",
            index: 1,
            sourceIndex: 0,
            sceneId: scene.id,
            color: "đen",
            state: continued ? "queued" : "failed",
            error: "Team hết hạn mức",
            errorCode: "TEAM_BUDGET_EXCEEDED",
            requestId: "r2",
            prompt: "Mockup màu đen",
          },
        ],
        reviews: approved
          ? [
              {
                id: "review",
                assetId: output,
                ticketId: jobId,
                decision: "approved",
                note: "",
              },
            ]
          : [],
      },
    });
  });
  await page.goto(studioPath("studio-mockups"));
  await chooseOption(
    page,
    page.getByRole("combobox", { name: "Sản phẩm", exact: true }),
    fixture.ids.product,
  );
  await page.getByLabel("Tải ảnh nguồn mockup").setInputFiles({
    name: "design.png",
    mimeType: "image/png",
    buffer: image,
  });
  await page
    .getByRole("checkbox", { name: scene.name, exact: true })
    .last()
    .check();
  await page.getByLabel("Màu vật liệu sản phẩm (tùy chọn)").fill("trắng, đen");
  await page.getByRole("button", { name: "Áp dụng cho tất cả nguồn" }).click();
  await expect(
    page.getByText("2 ảnh sẽ được tạo", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Tạo 2 ảnh mockup", exact: true })
    .click();
  await expect(page).toHaveURL(/\/mockups\/mockup-test$/);
  await expect(page.locator(".studio-main-workbench")).toHaveCount(0);
  expect(body).toMatchObject({
    storeId: fixture.ids.store,
    productId: fixture.ids.product,
    provider: "shopaikey",
    imageModel: "test-image",
    sources: [
      {
        assetId: fixture.ids.source,
        sceneIds: [scene.id],
        colors: ["trắng", "đen"],
      },
    ],
  });
  await expect(
    page.getByRole("progressbar", { name: "Số ảnh mockup đã hoàn thành" }),
  ).toHaveAttribute("value", "1");
  await page.getByRole("button", { name: "Đạt", exact: true }).click();
  await page.getByRole("checkbox", { name: "Chọn để tải" }).check();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Tải 1 ảnh đã duyệt" }).click();
  expect((await download).suggestedFilename()).toBe("LCG_Thanh_pham.zip");
  await page
    .getByRole("button", { name: "Tiếp tục phần chưa gửi", exact: true })
    .click();
  await expect.poll(() => continued).toBe(true);
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "1");
  expect(fixture.errors).toEqual([]);
});

test("Gallery handoff verifies approved images and fills the source store/product without a private local cache", async ({
  page,
}) => {
  const fixture = await setup(page);
  fixture.addMockupScene();
  const idea = fixture.setPending(),
    result = randomUUID();
  await page.route(`**/api/agent/studio/ideas/${idea}`, (route) =>
    route.fulfill({
      json: {
        idea: {
          id: idea,
          input: { storeId: fixture.ids.store, productId: fixture.ids.product },
        },
        reviews: [
          {
            assetId: result,
            ticketId: "ticket-original",
            decision: "approved",
          },
        ],
      },
    }),
  );
  await page.route("**/api/agent/studio/mockups?*", (route) =>
    route.fulfill({ json: { items: [], page: 1, total: 0, limit: 20 } }),
  );
  await page.goto(studioPath(`studio-mockups?from=${idea}&selected=${result}`));
  await expect(
    page.getByRole("combobox", { name: "Sản phẩm", exact: true }),
  ).toHaveAttribute("data-value", fixture.ids.product);
  await expect(
    page.getByRole("combobox", { name: "Cửa hàng", exact: true }),
  ).toBeDisabled();
  await expect(page.getByText("Thiết kế 1", { exact: true })).toBeVisible();
  await expect(page.getByText("0 bối cảnh × 1 màu")).toBeVisible();
  expect(fixture.errors).toEqual([]);
});

test("mobile mockup retains uncertain errors with no unsafe resume and fits a single page scroll", async ({
  page,
}) => {
  const fixture = await setup(page);
  const scene = fixture.addMockupScene();
  await page.route("**/api/agent/studio/mockups/mockup-unknown", (route) =>
    route.fulfill({
      json: {
        job: {
          id: "mockup-unknown",
          title: "Bộ ảnh cần đối soát",
          state: "failed",
          count: 1,
          product: { name: "Thảm in" },
          sources: [{ image: { id: fixture.ids.source } }],
          scenes: [
            { id: scene.id, name: scene.name, image: { id: scene.assetId } },
          ],
        },
        slots: [
          {
            id: "unknown",
            index: 0,
            sourceIndex: 0,
            sceneId: scene.id,
            color: "",
            state: "interrupted",
            error: "Chưa rõ kết quả; cần đối soát. Không tự gửi lại.",
            requestId: "unknown-request",
            prompt: "Preserve source",
          },
        ],
        reviews: [],
      },
    }),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(studioPath("studio-mockups?id=mockup-unknown"));
  await expect(
    page.getByRole("heading", { name: "Bộ ảnh cần đối soát" }),
  ).toBeVisible();
  await expect(
    page.getByText("Chưa rõ kết quả; cần đối soát. Không tự gửi lại.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Tiếp tục phần chưa gửi", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/studio-mockup-mobile.png",
    fullPage: true,
  });
  expect(fixture.errors).toEqual([]);
});

test("admin changes the daily time while preserving batch history, conflicts and current schedule labels", async ({
  page,
}) => {
  const fixture = await setup(page, { admin: true });
  await page.goto(studioPath("studio-manage"));
  await page
    .getByRole("button", { name: "Vận hành lịch", exact: true })
    .click();
  await expect(page.getByLabel("Giờ chạy hằng ngày")).toHaveValue("22:00");
  await page.getByLabel("Giờ chạy hằng ngày").fill("20:30");
  await page
    .getByLabel("Lý do thay đổi giờ chạy")
    .fill("Chạy sớm để nhóm kiểm tra");
  await page
    .getByRole("button", { name: "Lưu giờ chạy tự động", exact: true })
    .click();
  await expect
    .poll(fixture.scheduleBody)
    .toMatchObject({ dailyTime: "20:30", revision: 0 });
  await expect(page.getByText("20:30 · UTC+7", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Creative · 2026-10-29/ }).click();
  await expect(page.getByText(/Kỳ .*22:00:00/)).toBeVisible();
  fixture.failSchedule();
  await page.getByLabel("Giờ chạy hằng ngày").fill("21:00");
  await page.getByLabel("Lý do thay đổi giờ chạy").fill("Thử từ tab cũ");
  await page
    .getByRole("button", { name: "Lưu giờ chạy tự động", exact: true })
    .click();
  await expect(
    page.getByText("Giờ chạy đã thay đổi ở tab khác", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("20:30 · UTC+7", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Tổng quan", exact: true }).click();
  await expect(
    page.getByText("Lịch tự động lúc 20:30", { exact: true }),
  ).toBeVisible();
  await wizard(page);
  await page.getByRole("button", { name: "Quay lại", exact: true }).click();
  await chooseOption(
    page,
    page.getByRole("combobox", { name: "Khi nào thực hiện?", exact: true }),
    "night",
  );
  await expect(
    page.getByRole("combobox", { name: "Khi nào thực hiện?", exact: true }),
  ).toContainText("Lên lịch 20:30 hằng ngày (UTC+7)");
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await expect(
    page.getByText("Kỳ 20:30 kế tiếp sau khi được duyệt · UTC+7", {
      exact: true,
    }),
  ).toBeVisible();
  expect(fixture.errors).toEqual([]);
});

test("dashboard shows server counts and the guide illustrates independent artwork, inputs and approvals on mobile", async ({
  page,
}) => {
  const fixture = await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(studioPath("studio"));
  const stats = page.getByRole("region", { name: "Số liệu vận hành Studio" });
  await expect(
    stats.getByRole("button", { name: /Ảnh và artwork đã tạo/ }),
  ).toContainText("12");
  await expect(
    stats.getByRole("button", { name: /Lượt đã lên lịch/ }),
  ).toContainText("4");
  await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  await page
    .getByRole("button", { name: "Hướng dẫn sử dụng", exact: true })
    .click();
  await expect(
    page.getByRole("img", {
      name: "Artwork là file phẳng riêng, thumbnail là ảnh trình bày sản phẩm",
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/studio-guide-mobile.png",
    fullPage: true,
  });
  expect(fixture.errors).toEqual([]);
});

test("admin searches and paginates arbitrary catalog entries without relying on the bootstrap slice", async ({
  page,
}) => {
  const fixture = await setup(page, { admin: true });
  fixture.expandCatalog();
  await page.goto(studioPath("studio-manage"));
  await page.getByRole("button", { name: "Thư viện", exact: true }).click();
  await page
    .getByRole("button", { name: "Trang thư viện sau", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Bối cảnh tùy chỉnh 29", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Tìm theo tên hoặc mã", { exact: true }).fill("SC29");
  await expect(
    page.getByText("Trang 1 · 1 mục", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Bối cảnh tùy chỉnh 29", exact: true }),
  ).toBeVisible();
  expect(fixture.errors).toEqual([]);
});

test("admin defines an arbitrary product and edits through a new version with its own print specification", async ({
  page,
}) => {
  const fixture = await setup(page, { admin: true });
  await page.goto(studioPath("studio-manage"));
  await page.getByRole("button", { name: "Thư viện", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Tên hiển thị", exact: true })
    .fill("Ốp lưng tùy chỉnh");
  await page
    .getByRole("textbox", { name: "Mã nhận diện", exact: true })
    .fill("CUSTOM-COVER");
  await page
    .getByRole("checkbox", { name: "Khai báo kích thước file in", exact: true })
    .check();
  await page.getByLabel("Chiều rộng (pixel)", { exact: true }).fill("500");
  await page.getByLabel("Chiều cao (pixel)", { exact: true }).fill("800");
  await page
    .getByRole("button", { name: "Thêm vào thư viện", exact: true })
    .click();
  await expect.poll(fixture.libraryBody).toMatchObject({
    name: "Ốp lưng tùy chỉnh",
    code: "CUSTOM-COVER",
    type: "product",
    printSpec: { width: 500, height: 800, dpi: 300, background: "white" },
  });
  const original = fixture.libraryCreatedId();
  const card = page.getByRole("article").filter({
    has: page.getByRole("heading", {
      name: "Ốp lưng tùy chỉnh",
      exact: true,
    }),
  });
  await card
    .getByRole("button", { name: "Chỉnh sửa bằng phiên bản mới", exact: true })
    .click();
  await page.getByLabel("Chiều rộng (pixel)", { exact: true }).fill("600");
  await page
    .getByRole("button", { name: "Lưu phiên bản mới", exact: true })
    .click();
  await expect.poll(fixture.libraryBody).toMatchObject({
    previousId: original,
    printSpec: { width: 600, height: 800, dpi: 300 },
  });
  expect(fixture.errors).toEqual([]);
});

test("Gallery requires a separate artwork review and passes the original artwork to the mockup flow", async ({
  page,
}) => {
  const fixture = await setup(page, { leader: true });
  const id = fixture.setPending();
  fixture.setPlan(id);
  const { rawId } = fixture.setArtwork();
  await page.goto(studioPath(`studio-ideas?id=${id}`));
  await expect(
    page.getByRole("heading", { name: "Artwork gốc · Mẫu 1" }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: "Chọn để tải xuống" }).check();
  await page
    .getByRole("button", { name: "Tạo mockup từ 1 thiết kế", exact: true })
    .click();
  await expect(
    page.getByText(
      "Hãy kiểm tra và duyệt artwork gốc trước khi dùng để tạo mockup.",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Duyệt artwork", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Tải artwork PNG", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Tạo mockup từ 1 thiết kế", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`selected=${rawId}`));
  await expect(page.getByText("Thiết kế 1", { exact: true })).toBeVisible();
  expect(fixture.errors).toEqual([]);
});

test("mockup finds approved scenes beyond the bootstrap catalog and adds their authenticated previews", async ({
  page,
}) => {
  const fixture = await setup(page);
  fixture.catalogBeyondBootstrap();
  await page.goto(studioPath("studio-mockups"));
  await page.getByText("Tìm trong thư viện", { exact: true }).last().click();
  await page
    .getByLabel("Tìm thêm bối cảnh từ thư viện theo tên hoặc mã", {
      exact: true,
    })
    .fill("OUT29");
  await chooseOption(
    page,
    page.getByRole("combobox", {
      name: "Thêm bối cảnh từ thư viện",
      exact: true,
    }),
    { label: "OUT29 · Bối cảnh ngoài trang 29" },
  );
  await expect(
    page.getByRole("checkbox", {
      name: "Bối cảnh ngoài trang 29",
      exact: true,
    }),
  ).toBeChecked();
  await expect(
    page.getByRole("img", { name: "Bối cảnh ngoài trang 29", exact: true }),
  ).toBeVisible();
  expect(fixture.errors).toEqual([]);
});
