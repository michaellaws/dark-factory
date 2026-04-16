# dark-factory

> *"A pipeline where no human writes code, no human reviews code, and no human manually tests code. Humans write specs and acceptance criteria. That's it."*

A toolkit for building software with fully autonomous coding agents. Inspired by the [Dark Factory Pattern](https://hackernoon.com/the-dark-factory-pattern-moving-from-ai-assisted-to-fully-autonomous-coding) and [OpenAI's harness engineering](https://openai.com/index/harness-engineering/).

---

## What this is

Most teams plateau at **Level 2** — AI writes code, humans review everything. Getting to **Level 3.5+** requires rethinking the quality architecture, not just the tooling.

This repo is the infrastructure layer that makes autonomous coding trustworthy:

| Level | Description |
|-------|-------------|
| 1 | AI assists; humans do everything else |
| 2 | AI writes functions/files; humans review all changes |
| 3 | AI generates from specs; holdout scenarios gate quality |
| **3.5** | **Auto-merge on select services** ← this toolkit targets here |
| 4 | Full dark factory — specs in, tested merged code out |

---

## The critical insight: train/test separation

A generating agent that can see its own acceptance criteria will optimize for passing them — not for satisfying the intent. The wall between **code generation** and **validation** is what makes autonomous merge trustworthy.

```
Humans write specs + holdout criteria
        ↓
Generating agent works in sparse-checkout worktree
  (holdout/ does not exist on disk)
        ↓
Independent evaluation runs holdout against generated code
        ↓
Auto-merge if metrics exceed threshold
```

The agent never sees `holdout/`. Not by convention — by the filesystem.

---

## What's included

### Scripts

| Script | Purpose |
|--------|---------|
| `scripts/worktree-new.sh` | Provision a sparse-checkout agent worktree (excludes `holdout/`) |
| `scripts/worktree-teardown.sh` | Remove worktree + branch |
| `scripts/evaluate.sh` | Hybrid evaluation runner (traditional tests always, LLM gated) |
| `scripts/evaluate-llm.sh` | Provider-agnostic LLM evaluation layer |
| `scripts/evaluate-merge.js` | Aggregate results → structured JSON |
| `scripts/spec-new.sh` | Scaffold a new spec with validated name and correct frontmatter |
| `scripts/spec-parse.js` | Parse/update spec frontmatter, find specs ready for dispatch |
| `scripts/spec-dispatch.js` | CI runner — creates GitHub Issues for ready specs, writes back status |

### CI Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `holdout-integrity.yml` | PR to main from `task/*` | Fails if agent modified `holdout/` |
| `holdout-evaluation.yml` | PR to main from `task/*` | Gates merge on ≥90% traditional test pass rate |
| `auto-merge.yml` | Evaluation passes | Arms `gh pr merge --auto --squash` on task PRs |
| `spec-dispatch.yml` | Push to `specs/**` | Creates GitHub Issue when spec status is `ready` |
| `llm-evaluation.yml` | Nightly + manual | LLM qualitative check, opens issue on failure |

### Directory structure

```
holdout/          ← acceptance criteria — NEVER visible to generating agents
  <feature>/
    scenarios.md  ← LLM evaluation criteria (natural language)
    tests/        ← traditional executable test suite
specs/            ← feature specs — fully visible to generating agents
  <feature>/
    spec.md       ← intent, requirements, visible acceptance criteria
                     frontmatter: holdout, status, issue
scripts/          ← evaluation + spec infrastructure
tests/scripts/    ← tests for the infrastructure itself
.github/
  workflows/      ← CI enforcement
```

---

## Adopting this toolkit

### As a GitHub template

```bash
gh repo create myproject --template michaellaws/dark-factory --public
```

### Manually

Copy `scripts/`, `.github/workflows/`, `holdout/`, `specs/` into your project. Add `.worktrees/` to `.gitignore`.

### Configuration

Set `vars.TEST_CMD` as a GitHub repository variable pointing to your test runner:

```bash
gh variable set TEST_CMD --body "node holdout/<feature>/tests/run.js"
```

`TEST_CMD` runs from inside the evaluation worktree (a full checkout including `holdout/`). Commands in `PATH` work, and paths relative to the repo root work. The runner must output JSON: `{ "passed": N, "failed": N }`.

```bash
# Example: minimal always-passing runner (holdout/smoke-tests/run.js)
echo '{"passed":1,"failed":0}'

# Example: wrapping an existing test suite
node --test 2>&1 | node scripts/format-results.js
```

### Auto-merge (Step 3)

Enable GitHub's native auto-merge so evaluation-passing PRs merge without human intervention:

1. **Repo settings → General → Pull Requests → Allow auto-merge** — must be checked. This is separate from branch protection and is required for `gh pr merge --auto` to work.

2. **Branch protection on `main`** — add required status checks:
   - `Verify holdout/ not modified by agent` (from `holdout-integrity.yml`)
   - `Run holdout test suite` (from `holdout-evaluation.yml`)

   Auto-merge only fires when ALL required checks pass. Without branch protection, the merge gate has no teeth.

> **Note:** `auto-merge.yml` always runs the version on `main`, not the PR branch. This is intentional — a task branch cannot modify its own merge gate. Changes to `auto-merge.yml` must land on `main` before they take effect.

### LLM evaluation (optional)

Set `LLM_API_KEY` as a repository secret. Override model with `LLM_MODEL` env var (default: `claude-haiku-4-5-20251001`). To use a different provider, set `LLM_BASE_URL` to any OpenAI-compatible endpoint.

---

## Workflow

### For every agent task

```bash
# 0. Create a spec (visible to agents; status starts as draft)
scripts/spec-new.sh <task-name>
# Edit specs/<task-name>/spec.md, set status: ready, push
# → spec-dispatch.yml creates a GitHub Issue automatically

# 1. Human kicks off agent (intentional gate — guards prompt injection)
#    Agent reads the Issue, sets status: in_progress, provisions worktree:
scripts/worktree-new.sh <task-name>   # holdout/ excluded from agent view

# 2. Agent works in .worktrees/<task-name> — opens PR from task/<task-name>
#    Agent sets status: complete and adds Closes #<issue> to PR body

# 3. CI gates the PR automatically
#    holdout-integrity.yml  → agent didn't touch holdout/
#    holdout-evaluation.yml → tests pass at ≥90%

# 4. Auto-merge fires (no human action required)
#    auto-merge.yml arms GitHub native auto-merge when evaluation passes.
#    The PR merges once all required branch protection checks clear.
#    If the PR shows "Auto-merge enabled" but remains open, there is a
#    merge conflict — rebase the task branch onto main and push to re-trigger.

# 5. Teardown
scripts/worktree-teardown.sh <task-name>
```

### Adding acceptance criteria for a new feature

```bash
# 1. Write the spec (visible to agents)
mkdir -p specs/my-feature
cat > specs/my-feature/spec.md << 'EOF'
---
holdout: my-feature
---
# My Feature
## Intent
...
EOF

# 2. Write holdout criteria (never visible to agents)
mkdir -p holdout/my-feature/tests
cat > holdout/my-feature/scenarios.md << 'EOF'
---
feature: my-feature
threshold: 90
---
## Scenario: <name>
<Natural language description of what must be true.>
EOF
```

---

## Principles

This toolkit embodies two axes from `agent-first-engineering`:

**Operate (how agents behave):** Default state is execution. Corrections are cheap; waiting is expensive. Escalate only when genuine human judgment is required.

**Build (how environments are designed):** Repository is the agent's world. Mechanical enforcement over human convention. Validation isolated from generation. Entropy managed continuously.

---

## Status

This is a living toolkit. As the dark factory pattern evolves — spec infrastructure, auto-merge pipelines, mechanical enforcement, observability — new capabilities will land here.

Current: **Step 3 of 7** — Auto-merge pipeline complete.

Roadmap:
- [x] Spec infrastructure (YAML frontmatter pipeline, spec-to-task orchestrator)
- [x] Auto-merge pipeline (metrics-based merge gates)
- [ ] Mechanical enforcement layer (architecture linters, CI invariants)
- [ ] Ephemeral per-worktree environments
- [ ] Agent-accessible observability (LogQL, PromQL, Chrome DevTools)
- [ ] Recurring maintenance agents (entropy management)
