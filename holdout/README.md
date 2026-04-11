# holdout/

Acceptance criteria for generating agents. **Never shown to generating agents.**

Structure:
  holdout/<feature>/scenarios.md   ← LLM evaluation criteria (natural language)
  holdout/<feature>/tests/         ← traditional executable test suite

At least one of `scenarios.md` or `tests/` must be present per feature.
Both may coexist — traditional tests run on every task, LLM scenarios run when compute is available.

Agent worktrees are configured with sparse checkout that excludes this directory.
Files here do not exist on disk in agent working trees.

## Cross-reference convention

Each holdout feature corresponds to a spec in `specs/<feature>/spec.md`.
The spec must declare its holdout feature name in YAML frontmatter:

```yaml
---
holdout: <feature>
---
```

The `<feature>` value must match the directory name under `holdout/`. Example:
- `specs/firewall-rules/spec.md` has `holdout: firewall-rules`
- `holdout/firewall-rules/` contains the acceptance criteria

## Adding holdout criteria for a new feature

1. Create `holdout/<feature>/scenarios.md` with natural language scenarios (see format below)
2. Optionally create `holdout/<feature>/tests/` with an executable test suite
3. Add `holdout: <feature>` frontmatter to `specs/<feature>/spec.md`

## Configuring TEST_CMD

`evaluate.sh` runs `TEST_CMD` from inside the evaluation worktree via `pushd`. This means:

- **TEST_CMD must be an absolute path** — relative paths silently break after `pushd`
- The test script runs with the evaluation worktree as the working directory
- `holdout/` is present in the evaluation worktree (full checkout)

Example:
```bash
TEST_CMD="/absolute/path/to/project/holdout/my-feature/tests/run.sh" \
  bash scripts/evaluate.sh my-feature
```

In CI, set `TEST_CMD` as a repository variable (`vars.TEST_CMD`) or hardcode it in the workflow.

## scenarios.md format

```markdown
---
feature: <feature-name>
threshold: 90
---

## Scenario: <name>
<Natural language statement of what must be true.
One scenario per heading. No step definitions. No code.
The LLM evaluator reads the implementation and judges each independently.>
```
