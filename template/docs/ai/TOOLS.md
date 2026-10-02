# Power tools — prefer these when available

Check availability once per session (`ast-grep --version`, the MCP tool list); fall back silently if missing.

## Structural search: ast-grep (before grep for code patterns)
Use `ast-grep` when the question is about code *shape*, not text: calls, annotations, missing arguments, imports.
- `ast-grep run -l ts -p 'console.log($$$ARGS)' src/`
- `ast-grep run -l java -p '@PostMapping $$$ public $T $M($$$P)'` → then check which lack `@Valid`
- `ast-grep run -l py -p 'def $F($$$): $$$' app/`
Never pass `-U`/`--update-all` (rewrites files) unless the plan step says so and the diff is reviewed.
Keep using Grep for plain text, config keys, log messages.

## Semantic navigation (MCP, if configured in .mcp.json)
- **serena** — find a symbol, its references, a file's symbol overview. Prefer it over reading whole files.
- **claude-context** — natural-language search over the indexed codebase ("where is price-change handling?"). Use it to pick 3–5 candidate files, then verify by reading.
- **context7** — current docs for a library/framework version. Use before using an API you are not certain about.

## Verify in the real world (MCP)
- **playwright** (MCP) — after UI changes: open the page, exercise the flow, take a screenshot, check layout and console errors.
- **Playwright Test** (`e2e/*.spec.ts`, `npm run test:e2e`) — the automated, committed proof of UI behaviour, run by `testCmd`. Every UI change needs a spec; rules in `.claude/rules/ui-e2e.md`; set up with `/e2e-setup`.
- **postgres / mongodb** — read-only on local/dev databases: check real schema before writing queries or migrations. Never point at production.
- **github** — read issues/PR comments for requirements; do not merge, release or tag without the user asking.

## Guardrails
Architecture rules live in executable form (ArchUnit, dependency-cruiser, import-linter, Biome/ESLint rules) and run in `testCmd`/`lintCmd`. When one fails, fix the code to respect the boundary — never loosen the rule without asking. Run `/guardrails` to create them.
