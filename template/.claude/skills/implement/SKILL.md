---
name: implement
description: Execute exactly ONE unchecked step of the active plan in docs/ai/plans/ — code, test, tick the checkbox, update PROGRESS, commit. Use repeatedly to work through a plan.
argument-hint: "[plan file or step number, optional]"
---

Arguments: $ARGUMENTS

1. **Locate the step.** Use the plan path/step from the arguments, otherwise the active plan from the session context (newest plan with unchecked `- [ ]`). Read the whole plan, then pick the first unchecked step. If no plan exists, stop and suggest `/plan-task`.
2. **Load only what the step needs**: the files it names, the relevant section of `docs/ai/conventions.md`. Do not wander.
3. **Test first** where practical: write or extend the test that proves the step, run it, see it fail for the right reason. For a UI step that test is a Playwright spec in the frontend's `e2e/` (see `.claude/rules/ui-e2e.md`); if Playwright is not set up, stop and suggest `/e2e-setup`.
4. **Implement** the minimum change to make it pass. Stay inside the files the plan lists; if another file must change, edit the plan first and say why.
5. **Verify**: run the step's test, then the full `testCmd` (use the `test-runner` subagent if output is long). Fix the code until green. Never weaken a test to pass. For UI steps, if the Playwright MCP is available, also open the page and look at it.
6. **Record**: tick the step `- [x]` in the plan, update `docs/ai/PROGRESS.md` (done / next step / blockers).
7. **Commit** code + test + plan + PROGRESS together: `<type>(<scope>): <step summary>` (the pre-commit hook re-runs the tests).
8. **Stop.** Report in ≤ 5 lines: what changed, test result, commit hash, the next step. Do not start the next step unless the user asked to run several (`/implement all` → loop, but run `/checkpoint` behaviour every 3 steps and stop if context is getting long).
