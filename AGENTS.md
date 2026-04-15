# dark-factory — Agent Map

This file is your entry point. Read it first, then follow pointers to what you need.

## What this repository is

Infrastructure for autonomous agent-driven software development. This is not an application — it is the scaffolding that makes agent pipelines trustworthy at Level 3.5+.

**Core constraint:** Generating agents never see acceptance criteria. The validation layer is physically isolated from code generation via sparse-checkout worktrees.

---

## Repository map

| Path | Purpose |
|------|---------|
| `specs/` | Feature specs — read these to understand what to build |
| `holdout/` | **You cannot see this.** It is excluded from your worktree. |
| `scripts/` | Evaluation infrastructure — do not modify without a spec |
| `tests/scripts/` | Tests for the scripts — run these to verify your work |
| `.github/workflows/` | CI enforcement — do not modify without a spec |

---

## How you operate here

You are working in a sparse-checkout worktree. `holdout/` does not exist in your working tree — this is intentional and correct. Do not attempt to create or access it.

Your task is described in a spec under `specs/<feature>/spec.md`. Read it before writing any code. The spec's `holdout:` frontmatter field names the feature being validated.

When your work is complete, open a PR from your `task/<name>` branch. CI will run automatically:
- `holdout-integrity` — verifies you did not touch `holdout/`
- `holdout-evaluation` — runs acceptance tests against your implementation

---

## Working from a spec

Your task has a spec at `specs/<your-task-name>/spec.md`. The task name is the
name of the directory your worktree is in (`.worktrees/my-feature` → `my-feature`).

**Protocol — follow this order:**

1. **Read the spec first.** `specs/<task-name>/spec.md` before writing any code.
   The spec's `issue:` field contains the GitHub Issue URL — you'll need the
   issue number for your PR description.

2. **Mark in_progress as your first commit.** Update the spec frontmatter:
   ```
   status: in_progress
   ```
   Commit: `chore: mark <task-name> in_progress`

3. **Implement.** Work inside your worktree. Open a PR with:
   ```
   Closes #<issue-number>
   ```
   in the PR description. This links the PR to the issue and will close the
   issue automatically on merge.

4. **Mark complete as your last commit before requesting review.** Update the
   spec frontmatter:
   ```
   status: complete
   ```
   Commit: `chore: mark <task-name> complete`

Do not open the PR until step 4 is done. The `complete` commit must be on the
branch before CI runs evaluation.

---

## Scripts reference

```
scripts/worktree-new.sh <task>       provision a new agent worktree
scripts/worktree-teardown.sh <task>  remove worktree and branch
scripts/evaluate.sh <task> [--llm]   run evaluation pipeline
scripts/evaluate-llm.sh <task> <path> LLM evaluation layer
scripts/evaluate-merge.js            aggregate results → JSON
```

Environment variables for `evaluate.sh`:
- `EVAL_THRESHOLD` — pass rate 0–100, default 90
- `TEST_CMD` — absolute path to test runner (required, must be absolute)
- `LLM_API_KEY` — required only with `--llm`
- `LLM_MODEL` — default: `claude-haiku-4-5-20251001`

---

## Running the test suite

```bash
bats tests/scripts/worktree-new.bats
bats tests/scripts/worktree-teardown.bats
node --test tests/scripts/evaluate-merge.test.js
bats tests/scripts/evaluate.bats
```

All suites must pass before opening a PR.

---

## Key constraints

- Do not modify `holdout/` — it is managed by humans, not agents
- Do not modify `.github/workflows/` without an explicit spec authorizing it
- `TEST_CMD` must be an absolute path — see `holdout/README.md`
- Commits must follow conventional format: `feat:`, `fix:`, `ci:`, `docs:`, `chore:`

---

## Further reading

- `holdout/README.md` — how to add acceptance criteria for a new feature
- `specs/README.md` — how to write a feature spec
- `README.md` — full project overview and adoption guide
