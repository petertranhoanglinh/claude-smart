---
name: checkpoint
disable-model-invocation: true
description: Save working memory to disk before clearing context — update PROGRESS.md and the active plan, record decisions, commit. Use when context is long, before /clear, or at the end of a session.
---

Write down everything the next session needs, because the chat is about to be cleared.

1. Update `docs/ai/PROGRESS.md` (keep it under 25 lines; overwrite stale content — history lives in git, so drop old "Recently done" entries):
   - Now: active plan path, current step, what is half-done and exactly where.
   - Recently done: last few completed items with commit hashes.
   - Next up: the concrete next action.
   - Blockers / open questions.
2. Make sure the active plan's checkboxes match reality; add any newly discovered steps.
3. If a non-obvious decision was made this session, add an ADR in `docs/ai/decisions/` from `_TEMPLATE.md`.
4. If you learned something durable about the codebase (a gotcha, a module rule), add one line to `docs/ai/architecture.md` or the matching `.claude/rules/` file.
5. Commit docs (and any finished, green code) — `chore: checkpoint`. Do not commit failing code; describe it in PROGRESS instead.
6. Tell the user: "Checkpoint saved — run `/clear`, then `/implement` to continue."
