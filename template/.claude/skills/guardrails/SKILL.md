---
name: guardrails
description: Turn the architecture rules in docs/ai/architecture.md into executable checks (ArchUnit, dependency-cruiser, import-linter, Biome/ESLint rules) wired into testCmd/lintCmd, so violations fail fast and Claude self-corrects. Run after /bootstrap or when module boundaries change.
disable-model-invocation: true
argument-hint: "[rule to add, optional]"
---

Goal: architecture rules that a machine enforces, not prose Claude might forget. $ARGUMENTS (optional) is a specific rule to add.

1. **Collect rules.** Read `docs/ai/architecture.md`, `docs/ai/conventions.md` and existing lint config. Propose 3–8 concrete, checkable rules, e.g.:
   - layering: controller → service → repository only; no repository access from controllers
   - module isolation: `billing/**` must not import `inventory/internal/**`
   - no cycles between top-level modules
   - framework rules: every `@PostMapping` handler parameter annotated `@RequestBody` must be `@Valid`
   Show them to the user and wait for approval before installing anything.

2. **Pick the tool for the stack** (prefer what the repo already uses):
   | Stack | Boundaries / layering | Style & code rules |
   |---|---|---|
   | Java / Kotlin | ArchUnit tests (JUnit) | SpotBugs / Checkstyle / detekt |
   | JS / TS | dependency-cruiser (`.dependency-cruiser.cjs`) or ESLint `import/no-restricted-paths` | Biome or ESLint |
   | Python | import-linter (`.importlinter` contracts) | Ruff |
   | Go | `depguard` via golangci-lint | golangci-lint |
   | Any | ast-grep rules (`sgconfig.yml` + `rules/*.yml`, run `ast-grep scan`) for pattern rules no linter covers |

3. **Install** as a dev dependency (ask before adding dependencies), write the rule files, and start with the rules passing on the current code: if existing code violates a rule, record the violations as a known-baseline / allow-list and list them in PROGRESS.md as follow-ups — do not mass-refactor now.

4. **Wire into enforcement** so hooks run them automatically:
   - boundary checks into the test run (ArchUnit is already a test; for the others add a script like `npm run check:arch` and chain it into `testCmd`),
   - per-file rules into `lintCmd`.
   Use `node .claude/hooks/configure.mjs testCmd="..." lintCmd="..."` (the user approves).

5. **Prove it works**: add a deliberate violation in a scratch change, show the check fails with a clear message, revert it.

6. Add a "Guardrails" section to `docs/ai/conventions.md` listing each rule and its tool, update PROGRESS.md, commit `chore: add architecture guardrails`.
