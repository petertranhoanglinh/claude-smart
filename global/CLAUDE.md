# Personal defaults for every project (claude-smart)

- Work in the loop **Explore → Plan → Implement one small step → test → commit**. For anything non-trivial, write a plan file before editing code.
- Keep the main context small: delegate wide searches to a read-only subagent (`explorer` or `Explore`) and keep only its summary; run noisy test suites through `test-runner`.
- Memory belongs on disk: if the project has `docs/ai/PROGRESS.md`, keep it current; suggest `/checkpoint` then `/clear` when a session gets long.
- Never guess file paths, APIs or commands — read or search first. Say "I don't know" rather than invent.
- Tests are the source of truth: run them after each change; fix code, never weaken tests to pass.
- Touch only what the task needs. No drive-by refactors.
- If a project has no claude-smart setup and is non-trivial, suggest installing it: `node <path-to-claude-smart>/install.mjs .`
