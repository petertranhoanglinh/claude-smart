# Project guide for Claude

> Keep this file under ~80 lines. It is loaded every session. Detail lives in docs/ai/ and .claude/rules/.

## Commands
<!-- Filled by /bootstrap. Keep the exact commands. -->
- Install:
- Build:
- Test (all):
- Test (single file):
- Lint / format:
- Run locally:

## Architecture in one screen
<!-- Filled by /bootstrap: 5–15 lines, top-level dirs and what they own. Full map: docs/ai/architecture.md -->

## Where to look
- Project map and data flow: docs/ai/architecture.md (read the relevant section only)
- Code conventions: docs/ai/conventions.md
- Current state of work: docs/ai/PROGRESS.md (auto-loaded at session start)
- Plans: docs/ai/plans/ · Decisions: docs/ai/decisions/
- Module-specific rules: .claude/rules/ (auto-loaded when touching matching files)

## Workflow
@docs/ai/WORKFLOW.md

## Tools
@docs/ai/TOOLS.md

## Slash commands
- `/bootstrap` — build/refresh the project map (first run)
- `/explore <topic>` — read-only investigation via subagents
- `/spec <feature>` — interview → spec with acceptance criteria (new or large features)
- `/plan-task <task | spec | story>` — write a plan file, no code changes
- `/implement` — do exactly one plan step, test, commit
- `/checkpoint` — save state to disk before `/clear`
- `/review-diff` — review the diff before merging
- `/guardrails` — turn architecture rules into executable lint/test checks
- `/e2e-setup` — set up Playwright e2e tests for the frontend (backend mocked)
