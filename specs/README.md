# specs/

Feature specifications — fully visible to generating agents.

Structure:
  specs/<feature>/spec.md   ← intent, requirements, visible acceptance criteria

Specs describe WHAT to build. Holdout criteria (in `holdout/`) describe HOW to
verify it was built correctly — and are never shown to generating agents.

---

## Frontmatter fields

Every spec.md must begin with a YAML frontmatter block:

```yaml
---
holdout: <feature>    # matches holdout/<feature>/ directory name — required
status: draft         # pipeline state — see lifecycle below
issue: ""             # GitHub Issue URL — written by CI, empty until dispatched
---
```

### Status lifecycle

| Status | Set by | Meaning |
|--------|--------|---------|
| `draft` | Human | Being written — not ready to implement |
| `ready` | Human | Push to trigger CI dispatch |
| `dispatched` | CI | GitHub Issue created, worktree command ready to run |
| `in_progress` | Agent | First commit in the agent worktree |
| `complete` | Agent | Last commit before requesting merge review |

CI detects the `ready → dispatched` transition automatically on push to `specs/**`.
Humans only ever set `draft` and `ready`. Everything else is automated.

---

## Creating a new spec

Use the scaffolding script — never copy-paste by hand:

```bash
scripts/spec-new.sh my-feature
```

This creates `specs/my-feature/spec.md` with the correct frontmatter template.

---

## spec.md template

After running `spec-new.sh`, you get:

```markdown
---
holdout: my-feature
status: draft
issue: ""
---

# my-feature

## Intent
<One paragraph: what problem this solves and why.>

## Requirements
1. <Concrete requirement.>

## Visible acceptance criteria
<What the agent can verify during implementation — unit tests, type checks,
observable behavior. Does NOT include holdout scenarios.>
```

The `holdout:` field must match the directory name under `holdout/`.
See `holdout/README.md` for the full cross-reference convention.

---

## Triggering dispatch

Set `status: ready` in the spec frontmatter and push to main:

```bash
# Edit specs/my-feature/spec.md — change status: draft to status: ready
git add specs/my-feature/spec.md
git commit -m "feat(specs): mark my-feature ready"
git push
```

CI will:
1. Detect the `status: ready` spec with no issue yet
2. Create a GitHub Issue with the spec contents pre-loaded
3. Write `status: dispatched` and `issue: <url>` back to the spec
4. Commit to main with `[skip ci]`

You'll receive a GitHub notification for the new issue.
# non-task guard test
