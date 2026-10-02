# Tools (details: docs/ai/tools-reference.md — read it only when you need specifics)
- Code-shape search: `ast-grep run -l <lang> -p '<pattern>'` (never `-U`); plain text: Grep.
- MCP serena (read-only): find symbols/references instead of reading whole files.
- MCP context7: **required** before using an external SDK/library API in a new way, adding/bumping a dependency, or version-specific framework behaviour; cite `library@version — topic` in the plan/reply.
- UI changes: Playwright spec in `e2e/` (`.claude/rules/ui-e2e.md`); MCP playwright to look at the page.
- DB MCPs: local/dev, read-only. GitHub MCP: read; never merge/release unasked.
