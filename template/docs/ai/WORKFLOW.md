# AI Workflow (claude-smart)

These rules apply to every task in this repo. They exist to keep context small and memory on disk.

## Memory lives in files, not in chat
- `docs/ai/PROGRESS.md` — current state. Read it at the start of work; update it before stopping.
- `docs/ai/plans/` — one plan file per task. The active plan is the newest file with unchecked steps.
- `docs/ai/architecture.md`, `docs/ai/conventions.md` — read the section relevant to the module you touch, not the whole repo.
- `docs/ai/decisions/` — record non-obvious decisions (ADR) so they are not re-litigated.

## The loop: (Spec) → Explore → Plan → Clear → Implement
0. **Spec** — for a new, user-facing or ambiguous feature, define *what* first: `/spec` writes `docs/ai/specs/<slug>.md` with numbered acceptance criteria, or use BMAD planning artifacts (`_bmad-output/`, `docs/stories/`). Plans implement a spec/story; every acceptance criterion needs a test.
1. **Explore** (read-only). Delegate broad searches to the `explorer` subagent; keep only its summary.
2. **Plan**. Write `docs/ai/plans/YYYY-MM-DD-<slug>.md` from `_TEMPLATE.md`. Do not edit code while planning.
3. **Clear**. The user runs `/clear`. The SessionStart hook reloads PROGRESS and the active plan.
4. **Implement one step at a time**: do exactly one unchecked step → write/adjust tests → run tests → tick the checkbox → commit. Never batch several steps in one commit.

## Hard rules
- BMAD (if installed in `_bmad/`) is for planning only: analyst / PM / architect / scrum-master workflows produce PRD, architecture and stories. Implementation always goes through `/plan-task <story>` → `/implement`, never BMAD's dev-story workflow, so claude-smart hooks and plans stay in control.
- If `.claude/smart.config.json` sets `language`, everything the user reads (replies, plans, PROGRESS, ADRs, reviews) is written in that language. Code stays as is.
- Do not start coding a non-trivial change without a plan file.
- Touch only files the plan names; if another file must change, update the plan first.
- Tests must pass before commit (enforced by hooks). Never weaken or delete a test to make it pass — fix the code, or ask.
- Secrets: by default (`envAccess: keys`) you cannot read or edit `.env` values. See variable names with `node .claude/hooks/env.mjs list`, add a missing one with `node .claude/hooks/env.mjs set KEY [value] [--file path]`, and keep `.env.example` in sync. Never edit lockfiles by hand or `.git/` (enforced by hooks).
- Use subagents for: wide searches (`explorer`), running noisy test suites (`test-runner`), reviewing diffs (`reviewer`).
- When context is getting long, run `/checkpoint` and ask the user to `/clear`.
- If unsure about intent, ask. If unsure about code, read it — do not guess file names or APIs.
