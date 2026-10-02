---
name: e2e-setup
description: Set up Playwright end-to-end tests for this project's frontend — config, backend-mock fixtures, first specs for the main flows, npm scripts, and wiring into claude-smart's testCmd so UI regressions block commits. Run once per frontend.
disable-model-invocation: true
argument-hint: "[frontend dir, optional]"
---

Goal: UI changes are proven by Playwright specs that run automatically from the hooks, fast and without a
real backend. Reference files that already work in a real project are in `${CLAUDE_SKILL_DIR}/reference/*.example` (suffix keeps them out of the project's tsc/lint) —
adapt them, do not copy blindly.

## 1. Understand the frontend (read-only)
Frontend dir: $ARGUMENTS, else detect (the `package.json` with next/react/vue/svelte/angular/vite).
Find, and note `path:line` for each:
- dev command and a free port for tests (avoid the dev port the user already uses, e.g. use 3100)
- how the app calls the backend (base URL env var such as `NEXT_PUBLIC_API_URL` / `VITE_API_URL`, the fetch wrapper)
- how auth is stored (localStorage key, cookie) and what the app decodes from a token (JWT claims?)
- the 3–5 most important user flows (login, main list page, main form) and their visible texts/labels
- response shapes the pages expect (from the `*-api.ts` / services files)
If backend calls go through Next.js server components or route handlers (server-side fetch), browser
mocking cannot intercept them — say so and plan a stub server instead (ask the user).

## 2. Install
Ask before adding dependencies, then in the frontend dir:
`npm install -D @playwright/test` (or the project's package manager) and `npx playwright install chromium`.

## 3. Write the harness (adapt from reference/)
- `playwright.config.ts` — `webServer` starts the dev server on the test port with the API base URL env
  pointed at an unused address (e.g. `http://127.0.0.1:18080`), `reuseExistingServer: !CI`, chromium only,
  `trace: retain-on-failure`.
- `e2e/fixtures.ts` — `mockApi(page, routes)` (CORS + OPTIONS handled, unmocked requests recorded and
  answered with an error), auth helper (`loginAs`) seeding storage exactly like the app does, `pageErrors`
  fixture. Fixture callbacks must not be named `use` if the project lints with react-hooks rules.
- `e2e/<flow>.spec.ts` — one file per flow found in step 1: happy path, empty state, API error message,
  redirect when not logged in. Every test asserts `api.unmocked` and `pageErrors` are empty.
- `package.json` scripts: `"test:e2e": "playwright test"`, `"test:e2e:ui": "playwright test --ui"`.
- `.gitignore`: `test-results/`, `playwright-report/`.
- Make sure `tsc --noEmit` and the linter pass on the new files.

## 4. Wire into enforcement
- Create `scripts/claude-smart/test.mjs` from `reference/test.mjs.example`: runs only the parts affected by the
  current git changes (backend tests when backend changed; typecheck + Playwright when the frontend changed).
  Adjust the directory names and commands to this repo.
- `node .claude/hooks/configure.mjs testCmd="node scripts/claude-smart/test.mjs"` and add the `e2e/**` glob
  to `fileGlobs` (the user approves).
- Suggest adding the browser MCP: `node <claude-smart>/install.mjs . --mcp-only --mcp=playwright`.

## 5. Prove it
Run the full suite twice (cold and warm dev server) and report timings. Break one assertion on purpose,
show the failure message, revert. Then update the frontend's `.claude/rules/*.md` (testing section) and
`docs/ai/conventions.md` with how to write and run e2e tests, update PROGRESS.md, and commit
`test: add Playwright e2e harness`.
