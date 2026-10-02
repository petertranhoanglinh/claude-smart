---
paths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.vue"
  - "**/*.svelte"
  - "**/e2e/**"
---

# UI changes are verified with Playwright (claude-smart rule)

- Every UI change — new page, form, flow, conditional rendering, permission-based hiding — MUST add or
  update a Playwright spec in the frontend's `e2e/` folder **in the same commit**. A UI step is not done
  until its spec passes.
- If the project has no Playwright yet (no `playwright.config.*`), stop and suggest `/e2e-setup` instead of
  skipping the test.
- Mock the backend per test (`mockApi(page, { "GET /path": { body } })` from `e2e/fixtures.ts`); never hit a
  real backend or database from e2e. Every test asserts `api.unmocked` and `pageErrors` are empty.
- Selectors: `getByRole`, `getByLabel`, `getByText` — never CSS classes or nth-child. Test what the user
  sees (text, URL, enabled/disabled), not implementation details.
- Cover the happy path plus the states that break most: empty list, API error message, loading → loaded,
  role without permission.
- If the Playwright MCP server is available, also open the page yourself after the change: check layout,
  console errors, and take a screenshot when the user asked for visual work.
- Never weaken or delete an e2e assertion to make it pass; fix the UI, or ask.
