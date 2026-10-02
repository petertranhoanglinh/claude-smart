---
name: plan-task
description: Create a step-by-step implementation plan file for a task in docs/ai/plans/ — explore first, write the plan, change no source code. Use before any non-trivial feature, refactor or bug fix.
argument-hint: "<task description>"
---

Task: **$ARGUMENTS**

You are planning only. Do not modify source code in this turn.

1. If the task is ambiguous in a way that changes the design, ask the user (max 3 questions) before going further.
2. Explore with `explorer` subagents (parallel, one per angle). Read `docs/ai/architecture.md` and any matching `.claude/rules/` first.
3. Hand the findings to the `planner` subagent to write `docs/ai/plans/YYYY-MM-DD-<slug>.md`.
4. Read the plan it produced and fix anything wrong or vague. Each step: one commit, keeps tests green, has a concrete test.
5. Update `docs/ai/PROGRESS.md`: "Active plan: <path>", "Current step: 1".
6. Commit the plan and PROGRESS (`docs: plan <slug>`).
7. Tell the user: the plan path, the steps in one line each, open questions, and next: **review the plan, then `/clear` and `/implement`**.
