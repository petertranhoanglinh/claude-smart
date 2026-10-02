# Power tools — reference (read when you need the details; not loaded every session)

Check availability once per session (`ast-grep --version`, the MCP tool list); fall back silently if missing.

## Structural search: ast-grep (before grep for code patterns)
Use `ast-grep` when the question is about code *shape*, not text: calls, annotations, missing arguments, imports.
- `ast-grep run -l ts -p 'console.log($$$ARGS)' src/`
- `ast-grep run -l java -p '@PostMapping $$$ public $T $M($$$P)'` → then check which lack `@Valid`
- `ast-grep run -l py -p 'def $F($$$): $$$' app/`
Never pass `-U`/`--update-all` (rewrites files) unless the plan step says so and the diff is reviewed.
Keep using Grep for plain text, config keys, log messages.

## Semantic navigation (MCP, if configured in .mcp.json)
- **serena** — `find_symbol`, `find_referencing_symbols`, `find_implementations`, `get_symbols_overview`: locate code by symbol instead of reading whole files (biggest token saver on large repos). Read-only here: its editing/memory tools are denied so every edit goes through Edit/Write and the claude-smart hooks; project memory stays in docs/ai/.
- **claude-context** — natural-language search over the indexed codebase ("where is price-change handling?"). Use it to pick 3–5 candidate files, then verify by reading.
- **context7** — current, version-specific docs for third-party libraries. **Mandatory** (when the server is available) before writing or changing code that:
  - uses an external SDK/library API not already used the same way in this repo (cloud SDKs such as aws-sdk-go-v2 / S3 / R2, payment, auth, Facebook/TikTok APIs…),
  - adds a dependency or bumps its version (check breaking changes for the exact version in the lockfile / go.mod / package.json),
  - relies on framework behaviour that changes between major versions (Next.js, React, Playwright, ORM, router…).
  How: `resolve-library-id` → `query-docs` with a narrow topic (e.g. "presigned PUT content length"). Match the version the project actually uses. In the plan or your reply, cite what you checked (library + version + topic) in one line. Skip it for code that only follows patterns already in this repo.

## Verify in the real world (MCP)
- **playwright** (MCP) — after UI changes: open the page, exercise the flow, take a screenshot, check layout and console errors.
- **Playwright Test** (`e2e/*.spec.ts`, `npm run test:e2e`) — the automated, committed proof of UI behaviour, run by `testCmd`. Every UI change needs a spec; rules in `.claude/rules/ui-e2e.md`; set up with `/e2e-setup`.
- **postgres / mongodb** — read-only on local/dev databases: check real schema before writing queries or migrations. Never point at production.
- **github** — read issues/PR comments for requirements; do not merge, release or tag without the user asking.

## Guardrails
Architecture rules live in executable form (ArchUnit, dependency-cruiser, import-linter, Biome/ESLint rules) and run in `testCmd`/`lintCmd`. When one fails, fix the code to respect the boundary — never loosen the rule without asking. Run `/guardrails` to create them.

## BMAD (only if `_bmad/` exists)
Planning only: `bmad-brainstorming`, `bmad-forge-idea`, `bmad-product-brief`, `bmad-prd`/`bmad-spec`, `bmad-ux`, `bmad-architecture`, `bmad-ticket`. Implementation always via `/plan-task <ticket>` → `/implement`, never `bmad-build` / `bmad-build-auto` / `dev-story`.

## Secrets (`envAccess`)
Default `keys`: no reading/editing `.env` values. `node .claude/hooks/env.mjs list` shows variable names; `node .claude/hooks/env.mjs set KEY [value] [--file path]` adds a missing one (user approves); keep `.env.example` in sync.
