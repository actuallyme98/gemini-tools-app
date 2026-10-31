# LCG Studio interface redesign

The interface uses the LCG orange accent, warm neutral surfaces, dark ink, consistent spacing and a compact light sidebar. Navigation separates production, configuration and company administration without duplicate library shortcuts. Existing URLs, permissions, budgets, persisted jobs and approval rules remain authoritative.

The initial setup is visible on the overview and on creation screens with no assigned Store: create a Team, add products, then assign a Store. Employees see a contact-Lead/Admin explanation. Disabled paid actions explain the missing input beside the action and provide a way to focus the relevant control. Uploading an original before selecting its Store must not lock the Store picker. Changing Store clears incompatible scene assignments; Gallery handoffs remain fixed to their authorized Store.

Shared visual rules cover login, dashboard, Idea Board, the four-step wizard, Gallery/detail/review, Mockup Studio, output downloads, library/Teams, budget/schedule operations and company administration. Responsive layouts use a single page scroll on narrow displays, preserved desktop workbenches, visible form action bars, keyboard focus and reduced-motion support. No new AI requests or production data changes are needed to preview the interface.

Validation: the full 55-test Playwright suite passed against mocked APIs. The login screen was additionally checked at desktop and 390px mobile widths after the contrast adjustment. These checks cover UI behavior and permissions, not live provider generation or production deployment.
