# POD Agent UI

Open `/#agent`. Existing tools remain available in the sidebar. Fulfillment is outside this release.

The Agent requires `AGENT_ENABLED=true`, MongoDB, an R2 image encryption key and an account on the API. See the API repository's `docs/pod-agent.md` for setup and account creation. The frontend uses the existing `VITE_API_BASE_URL`; there is no new browser API key.

1. Sign in. Sessions live in this browser tab's session storage; passwords are never stored by the app.
2. Use **Agent tự chọn quy trình**, or explicitly choose reference mockup, template composition or ideas/design.
3. Assign source and reference roles. Choose uploaded files or saved assets. Templates have four-corner placement, aspect-preserving artwork, opacity, blend and optional mask/foreground.
4. Describe the work in chat. The planning stage can call text/vision models; no images are generated yet. Missing information produces questions.
5. Inspect every final prompt, source/reference assignment and template configuration. Save edits before starting. The saved prompt includes visible mandatory image-role/no-watermark instructions.
6. Start. Model selection remains locked while Agent jobs are active, including when navigating to another existing tab. Independent images run concurrently on the server. Refreshing the page retains jobs/history.
7. Review each result. AI checks are advisory; approve or request changes. Download individual results or a ZIP organized by category/review status with a manifest. Selected completed/failed/interrupted images can become a new draft; the next paid request requires another explicit start.

Research accepts keywords, supplied data and source URLs. It does not fetch live market statistics or verify the URLs. Source timestamps record when the user supplied the source, not when the agent fetched the page.

Cancel only prevents unsent work. Already-submitted requests may complete and incur charges. Unknown outcomes are shown rather than silently retried.

Verify with `npm run build`, `npm run lint`, and `npm run test:e2e`. Agent browser tests mock the API, while the API repository's integration suite uses a real temporary MongoDB process with mocked AI/R2.
