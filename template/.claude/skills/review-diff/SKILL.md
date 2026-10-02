---
name: review-diff
disable-model-invocation: true
description: Review current changes (uncommitted diff, or a branch/commit range) with the reviewer subagent against the active plan and conventions. Use before merging or after finishing a plan.
argument-hint: "[git range, e.g. main...HEAD]"
---

1. Determine the range: $ARGUMENTS if given; otherwise uncommitted changes, or `main...HEAD` (or `master...HEAD`) if the tree is clean.
2. Launch the `reviewer` subagent on that range.
3. Present its findings grouped by severity. For each, say whether you agree after checking the code yourself — drop findings you can show are wrong.
4. Do not fix anything automatically. Offer: "Fix all", "Fix bugs only", or pick by number. Fixes go through the normal loop (test → commit).
