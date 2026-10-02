---
name: spec
description: Write a short product spec for a new or large feature by interviewing the user — goal, users and permissions, flows, data rules, numbered acceptance criteria, errors and edge cases — saved to docs/ai/specs/<slug>.md. Use before /plan-task when a feature is new, user-facing or ambiguous. Does not write code.
disable-model-invocation: true
argument-hint: "<feature description>"
---

Feature: **$ARGUMENTS**

You are a product analyst. Goal: a spec the user agrees with, precise enough that every acceptance criterion
can become a test. Do not modify source code.

## 1. Don't duplicate existing planning
- If BMAD artifacts exist (`_bmad-output/**` — PRD/spec, architecture, `tickets.toml`; older: `docs/prd.md`,
  `docs/stories/**`) and already cover this feature, say so and suggest `/plan-task <ticket or PRD>` instead of
  writing a new spec.
- If `docs/ai/specs/` already has a spec for it, update that file instead of creating a new one.

## 2. Ground yourself (briefly, read-only)
Use one `explorer` subagent to find what already exists for this feature: related models/tables, endpoints,
pages, roles and permission checks, similar features to mirror. Read `docs/ai/architecture.md` and any task
checklist that mentions the feature. Keep only facts that shape the questions.

## 3. Interview the user
- Ask in rounds of at most 5 questions, maximum 3 rounds. Prefer the AskUserQuestion tool with concrete
  options and a recommended default, derived from what you found in the code ("Like the members page: only ADMIN
  can delete?").
- Cover, in this order, only what is still unknown: goal and success, who uses it and with which permissions,
  main flow, alternative flows, data rules and limits, errors and edge cases, what is explicitly out of scope.
- Don't ask what the code or existing docs already answer — state it as an assumption instead.
- If the user says "you decide", choose the simplest option consistent with the codebase and mark it as an
  assumption in the spec.

## 4. Write the spec
- File: `docs/ai/specs/<kebab-slug>.md`, following `docs/ai/specs/_TEMPLATE.md` exactly (all sections; write
  "None" rather than deleting one).
- Acceptance criteria: numbered `AC-1`, `AC-2`, … in Given / When / Then form; each one observable (UI text,
  HTTP status, stored data) and independently testable. Include at least: the happy path, a permission denial,
  validation failure, empty state, and an upstream/API error where relevant.
- Errors table: exact user-visible messages or status codes where the codebase has conventions.
- Mark assumptions with "(assumption)". Put unresolved decisions in "Open questions".
- Language: if `.claude/smart.config.json` sets `language`, write the spec in it; keep identifiers, paths,
  `AC-n` labels and the metadata lines `- Status:` / `- Plan:` / `- Created:` exactly as in the template (hooks read them).

## 5. Confirm and hand off
- Show the user a summary: goal in one line, the AC list, open questions. Ask: approve, or what to change.
- On approval set `Status: approved`, update `docs/ai/PROGRESS.md` ("Spec approved: <path>; next: /plan-task"),
  and commit `docs: spec <slug>`.
- Next step for the user: **`/plan-task docs/ai/specs/<slug>.md`**.
