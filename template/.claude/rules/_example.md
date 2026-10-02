---
paths:
  - "src/example-module/**"
---

# Example module rules (template — copy, rename, edit `paths`)

These lines load into context only when Claude works on files matching `paths`.
Keep each rules file short (≤ 30 lines) and specific to its module:

- Where things go in this module and naming patterns
- Invariants that must never break (e.g. "all money values are integer cents")
- How to test this module (command for just this module)
- Known gotchas
