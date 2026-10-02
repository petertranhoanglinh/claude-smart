---
name: explore
description: Read-only investigation of how something works in this codebase (a feature, flow, bug area) using explorer subagents, without loading files into the main context. Use before planning or when asked "where/how does X work".
argument-hint: "<topic or question>"
---

Investigate: **$ARGUMENTS**

1. Do not edit any file.
2. Split the question into 1–3 independent angles (e.g. entry point, data layer, tests) and launch one `explorer` subagent per angle in parallel.
3. Merge their answers into one compact report: Answer, Key locations (`path:line`), Flow, Gotchas, Unknowns.
4. If you found something non-obvious about the architecture that is missing from `docs/ai/architecture.md`, say so and propose the one-line addition (do not write it unless asked).
