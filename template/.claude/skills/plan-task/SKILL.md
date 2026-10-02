---
name: plan-task
description: Create a step-by-step implementation plan file for a task in docs/ai/plans/ — explore first, write the plan, change no source code. Accepts a task description, a spec (docs/ai/specs/*.md) or a BMAD story/PRD file. Use before any non-trivial feature, refactor or bug fix.
argument-hint: "<task description | spec file | BMAD ticket>"
---

Task: **$ARGUMENTS**

You are planning only. Do not modify source code in this turn.

1. **Find the source of truth.**
   - If the argument is a file or a BMAD ticket reference (a spec in `docs/ai/specs/`; BMAD artifacts under
     `_bmad-output/` — PRD, spec, architecture, an epic's `tickets.toml` entry such as "epic media, ticket 3", a
     `backlog/` story; older BMAD: `docs/prd.md`, `docs/stories/*.md`), read it fully together with the PRD/spec and
     architecture it cites — it defines *what* to build; the plan defines *how*.
   - Otherwise look for a matching spec in `docs/ai/specs/` or BMAD ticket/story; use it if it clearly matches.
   - A spec with `Status: draft`, or a BMAD ticket/story that is not ready: ask the user whether to proceed or finish it first.
   - No spec and the task is a new, user-facing or ambiguous feature: suggest `/spec` first (the user may decline).
   - Otherwise, if the task is ambiguous in a way that changes the design, ask the user (max 3 questions).
2. Explore with `explorer` subagents (parallel, one per angle). Read `docs/ai/architecture.md` and any matching `.claude/rules/` first.
   If the task touches an external library/SDK API, a new dependency or a version bump, look it up with **Context7**
   now (see `docs/ai/TOOLS.md`) for the version the project uses, and pass the findings to the planner — plans built
   on guessed APIs are the most common cause of rework.
3. Hand the findings **and the source file path** to the `planner` subagent to write `docs/ai/plans/YYYY-MM-DD-<slug>.md`.
4. Read the plan it produced and fix anything wrong or vague. Each step: one commit, keeps tests green, has a concrete test (UI steps: a named Playwright spec).
   With a source spec/story: every acceptance criterion appears in the plan's coverage table with the step and test that prove it — none missing.
5. If the source is a claude-smart spec, write the plan path into its `Plan:` line.
6. Update `docs/ai/PROGRESS.md`: "Active plan: <path>", "Current step: 1".
7. Commit the plan, PROGRESS (and spec) (`docs: plan <slug>`).
8. Tell the user: the plan path, the steps in one line each, open questions, and next: **review the plan, then `/clear` and `/implement`**.
