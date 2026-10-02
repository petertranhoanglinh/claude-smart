# AI Workflow (claude-smart)

These rules apply to every task in this repo. They exist to keep context small and memory on disk.

## Memory lives in files, not in chat
- `docs/ai/PROGRESS.md` — current state. Read it at the start of work; update it before stopping.
- `docs/ai/plans/` — one plan file per task. The active plan is the newest file with unchecked steps.
- `docs/ai/architecture.md`, `docs/ai/conventions.md` — read the section relevant to the module you touch, not the whole repo.
- `docs/ai/decisions/` — record non-obvious decisions (ADR) so they are not re-litigated.

## The loop: Explore → Plan → Clear → Implement
1. **Explore** (read-only). Delegate broad searches to the `explorer` subagent; keep only its summary.
2. **Plan**. Write `docs/ai/plans/YYYY-MM-DD-<slug>.md` from `_TEMPLATE.md`. Do not edit code while planning.
3. **Clear**. The user runs `/clear`. The SessionStart hook reloads PROGRESS and the active plan.
4. **Implement one step at a time**: do exactly one unchecked step → write/adjust tests → run tests → tick the checkbox → commit. Never batch several steps in one commit.

## Hard rules
- Do not start coding a non-trivial change without a plan file.
- Touch only files the plan names; if another file must change, update the plan first.
- Tests must pass before commit (enforced by hooks). Never weaken or delete a test to make it pass — fix the code, or ask.
- Never edit secrets (`.env*`), lockfiles by hand, or `.git/` (enforced by hooks).
- Use subagents for: wide searches (`explorer`), running noisy test suites (`test-runner`), reviewing diffs (`reviewer`).
- When context is getting long, run `/checkpoint` and ask the user to `/clear`.
- If unsure about intent, ask. If unsure about code, read it — do not guess file names or APIs.
