---
holdout: smoke-tests
status: draft
issue: ""
---

# smoke-tests

## Intent
Maintain a minimal visible spec for the template's internal smoke-test holdout so repository invariants remain satisfied while the evaluation pipeline is exercised end-to-end.

## Requirements
1. The repository must retain a `smoke-tests` spec that references the `holdout/smoke-tests/` acceptance criteria.

## Visible acceptance criteria
- Repository invariant validation passes.
- The smoke-test holdout remains available for evaluation examples and CI configuration.
