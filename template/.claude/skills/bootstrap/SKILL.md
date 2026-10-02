---
name: bootstrap
description: One-time (or occasional refresh) setup of the project map for claude-smart — fills docs/ai/architecture.md, docs/ai/conventions.md, CLAUDE.md commands and the test/lint commands in .claude/smart.config.json. Run when the map is empty or stale.
disable-model-invocation: true
argument-hint: "[focus area, optional]"
---

Build the long-term project memory. Work read-only on source code; write only the files listed below.

## 1. Survey (delegate, keep context small)
- If the repo has more than ~200 source files and Node is available, run `npx repomix --compress --style xml --output .claude/cache/repomix.xml` (skip silently if it fails). Ensure `.claude/cache/` is in `.gitignore`.
- Launch `explorer` subagents in parallel (one per top-level area, max 4) to map: modules and their responsibilities, entry points, data flow, external systems, test setup, build/lint/format commands. $ARGUMENTS narrows the focus if given.

## 2. Write the memory files
- `docs/ai/architecture.md` — fill every section of the existing template. Map, not prose: paths, responsibilities, flows. ≤ 150 lines.
- `docs/ai/conventions.md` — describe what the code actually does (look at 3–5 representative files and the lint/format config). ≤ 100 lines.
- `CLAUDE.md` — fill the "Commands" and "Architecture in one screen" sections. Keep CLAUDE.md under ~80 lines; detail belongs in docs/ai/.
- If BMAD is installed (`_bmad/`), note in `docs/ai/architecture.md` where its planning artifacts live (`_bmad-output/…` or `docs/`) and link the PRD/architecture instead of duplicating them.
- If the repo has a web frontend and no `playwright.config.*`, list `/e2e-setup` as the recommended next step in your summary.
- For large modules with their own rules, create `.claude/rules/<module>.md` with `paths:` frontmatter (see `.claude/rules/_example.md`) so those rules load only when that code is touched.

## 3. Configure enforcement
`.claude/smart.config.json` is edit-protected. Set commands through the helper (the user approves it):
`node .claude/hooks/configure.mjs testCmd="<fast full test command>" lintCmd="<lint one file, use {file}>" formatCmd="<format one file, use {file}>"`
- Verify each command actually runs before setting it. Leave a value empty rather than guessing.
- testCmd should be the full suite if it runs in under ~3 minutes; otherwise the fastest meaningful subset, and say so in CLAUDE.md.

## 4. Finish
Update `docs/ai/PROGRESS.md` ("bootstrap done", next step), commit with `chore: bootstrap claude-smart project map`, and print a 10-line summary for the user with anything you could not determine.
