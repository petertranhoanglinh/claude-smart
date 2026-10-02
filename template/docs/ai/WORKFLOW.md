# Workflow (claude-smart) — keep context small, memory on disk

Memory: `docs/ai/PROGRESS.md` (state; auto-loaded), `docs/ai/plans/` (one per task; active = newest with `- [ ]`), `docs/ai/specs/`, `docs/ai/decisions/` (ADR), `docs/ai/architecture.md` + `conventions.md` (read only the relevant section).

Loop: (`/spec` for new/ambiguous features) → explore via `explorer` subagent → plan file → user `/clear` → one step at a time: test → code → tests green → tick → update PROGRESS → commit.

Rules:
- Non-trivial change ⇒ plan file first; touch only files the plan names (update the plan otherwise).
- Every acceptance criterion of a spec/ticket needs a test. Never weaken or delete a test to pass — fix the code or ask.
- Hooks enforce tests before commit/stop and block secrets, lockfiles, `.git/`, destructive commands; when blocked, follow the hook's message, never work around it.
- Delegate wide searches (`explorer`), noisy test runs (`test-runner`), diff reviews (`reviewer`).
- PROGRESS.md ≤ 25 lines: current state only; history lives in git.
- Context getting long ⇒ `/checkpoint`, ask the user to `/clear`.
- Unsure about intent ⇒ ask. Unsure about code ⇒ read it; never guess paths or APIs.
