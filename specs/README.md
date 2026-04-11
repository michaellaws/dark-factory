# specs/

Feature specifications — fully visible to generating agents.

Structure:
  specs/<feature>/spec.md   ← intent, requirements, visible acceptance criteria

Specs describe WHAT to build. Holdout criteria (in `holdout/`) describe HOW to
verify it was built correctly — and are never shown to generating agents.

## spec.md template

```markdown
---
holdout: <feature>
---

# <Feature Name>

## Intent
<One paragraph: what problem this solves and why.>

## Requirements
<Numbered list of concrete requirements.>

## Visible acceptance criteria
<What the agent can verify during implementation — unit tests, type checks,
observable behavior. Does NOT include holdout scenarios.>
```

The `holdout:` frontmatter field must match the directory name under `holdout/`.
See `holdout/README.md` for the full cross-reference convention.
