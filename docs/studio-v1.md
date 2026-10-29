# Creative Studio frontend

Implementation status and remaining gates: `../gemini-tools-api/docs/studio-v1-progress.md` (sibling repository).

Routes: `/#studio`, `/#studio-ideas`, `/#studio-new`, `/#studio-ideas?id=<idea-id>`, `/#studio-mockups`, `/#studio-outputs`, `/#studio-manage`, `/#studio-guide`. `/#studio-new?id=<idea-id>` reopens an existing draft. Private legacy history stays at `/#agent`.

`VITE_STUDIO_ENABLED=true` makes Studio the default entry page. It is off by default for gradual rollout; the API also requires `STUDIO_ENABLED=true`. Night dispatch has a separate server-side flag. Do not enable it just to show the interface.

Docker accepts the `VITE_STUDIO_ENABLED` build argument; publishing maps the repository variable `STUDIO_ENABLED` to it, defaulting to false. Changing only the Nginx runtime environment does not change a prebuilt Vite bundle.

Studio is split into its own shell, API client, idea wizard, detail/review gallery, management and authenticated image components. It reuses company sessions, toast, budget UI, existing UI primitives and provider catalog. It does not mount the legacy chat component behind Studio screens.

The four-step wizard saves incomplete drafts after 1.2 seconds once name/store are set. Saves are serialized and compare revisions. Submit waits for persistence and sends the latest saved revision. New snapshots are approved by a real Team Leader/admin; the UI never manufactures an approval or completed image.

The mockup route creates persistent Team sets from approved Gallery designs or uploaded originals. Scenes come from approved Team resources. Users apply scenes/colors to all sources or override each source, see the exact request count, then submit an immutable set. Each result shows provenance, review and known-failure continuation. Completed/uncertain calls are never automatically regenerated. Export includes PNG/JPG files and source/scene/color manifest. Gallery handoff uses authorized route IDs and fetches current approval; private image bytes are not cached in localStorage. Workflow/template builder navigation is not reintroduced.

Admin management includes Team daily budgets (credit/USD follows company policy), reasoned limit edits with conflict handling, spent/held/available totals and hold details. Schedule operations show persisted Team batches and original occurrence cutoffs, missed-run catch-up and explicit continuation of known pre-provider budget failures. Personal weekly limits remain in force. Unlimited Team caps are displayed explicitly, not as zero.

Schedule operations also contains a daily HH:mm time setting (default 22:00, UTC+7). Only admins edit it, using a reason and revision guard. The setting refreshes bootstrap labels after saving/navigation. Previously approved jobs keep their original dueAt; the batch detail displays that saved cutoff rather than the current default. Changing the time does not switch on an otherwise disabled scheduler.

G2 adds a skill-version card with original ZIP download, version history, upgrade form and up to four explicit example images selected before version approval. Hidden example lists do not load image previews until opened. Pending/failed imports cannot be approved.

Idea detail now shows persisted visual analysis, risks and per-design creative briefs. Preparation errors remain visible instead of silently falling through to generic image generation. Optional daytime samples pause before the remaining images; the explicit continue action displays a cost notice. Nightly runs always use the full approved count.

Artwork-first mode is on by default for new wizard drafts and can be disabled for the legacy flattened-image path. Admin defines each product's print dimensions, DPI and white/transparent background; there is no fixed list or count of products. The mode makes two image calls per design (artwork then thumbnail), plus preparation, and the UI discloses this before approval. Artwork has its own preview/review/download. Thumbnail-to-mockup handoff selects the approved original artwork; it does not reverse-extract a design from the rendered thumbnail.

The library and resource selectors use server search/pagination by Team/type/name/code. Saved choices outside the current page are resolved by ID. Resource editing creates a new version so earlier job snapshots keep their originals. The dashboard displays server aggregates and does not infer all counts from a loaded page. The guide contains vector illustrations and a step-by-step flow.

Browser validation: `npm run test:e2e -- studio.spec.ts` (23 cases at this checkpoint). Uses API fixtures with no paid AI requests. Layout previews are written to ignored `test-results/studio-desktop.png`, `studio-mobile.png`, `studio-operations-mobile.png`, `studio-mockup-mobile.png` and `studio-guide-mobile.png`.
