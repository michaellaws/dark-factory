#!/usr/bin/env bash
set -euo pipefail

# Usage: scripts/evaluate.sh <task-name> [--llm]
#
# Environment variables:
#   EVAL_THRESHOLD  — pass rate 0-100, default 90
#   TEST_CMD        — test runner ABSOLUTE path + command, default: npm test
#                     Must be absolute — script runs from inside eval worktree via pushd
#   LLM_API_KEY     — required only with --llm
#   LLM_MODEL       — LLM model override

if [ $# -lt 1 ]; then
  echo "Usage: scripts/evaluate.sh <task-name> [--llm]" >&2
  exit 1
fi

TASK="$1"
LLM_EVAL=false
[[ "${2:-}" == "--llm" ]] && LLM_EVAL=true

THRESHOLD="${EVAL_THRESHOLD:-90}"
ROOT="$(git rev-parse --show-toplevel)"
EVAL_WORKTREE="$ROOT/.worktrees/eval-$TASK"
RESULTS="$ROOT/.worktrees/results-$TASK.json"

# Full-checkout evaluation worktree on the agent's branch — holdout/ is present
# Use --detach so we can check out the same commit as the agent worktree (which
# already has task/$TASK checked out) without git refusing a double checkout.
git worktree add --detach "$EVAL_WORKTREE" "task/$TASK"

cleanup() {
  git worktree remove "$EVAL_WORKTREE" --force 2>/dev/null || true
}
trap cleanup EXIT

# Layer 1: traditional tests (always runs)
# TEST_CMD must output JSON: { "passed": N, "failed": N }
TEST_CMD_BIN="${TEST_CMD:-npm test}"
pushd "$EVAL_WORKTREE" > /dev/null
read -ra TEST_CMD_ARR <<< "$TEST_CMD_BIN"
TEST_OUTPUT=$("${TEST_CMD_ARR[@]}" 2>&1) || true
popd > /dev/null

# Validate TEST_OUTPUT is parseable JSON; fall back to failure shape
if ! node -e "JSON.parse($(node -e "process.stdout.write(JSON.stringify(process.argv[1]))" -- "$TEST_OUTPUT"))" 2>/dev/null; then
  echo "Warning: TEST_CMD did not produce valid JSON — treating as total failure" >&2
  TEST_OUTPUT='{"passed":0,"failed":1}'
fi

# Layer 2: LLM evaluation (compute-gated)
LLM_OUTPUT="{}"
if [ "$LLM_EVAL" = true ]; then
  LLM_OUTPUT=$(bash "$ROOT/scripts/evaluate-llm.sh" "$TASK" "$EVAL_WORKTREE")
fi

# Merge results and write structured output
node "$ROOT/scripts/evaluate-merge.js" \
  --task "$TASK" \
  --traditional "$TEST_OUTPUT" \
  --llm "$LLM_OUTPUT" \
  --threshold "$THRESHOLD" \
  --out "$RESULTS"

echo "Results: $RESULTS"
cat "$RESULTS"

# Exit code drives CI merge gate
RESULTS="$RESULTS" node -e "
const r = JSON.parse(require('fs').readFileSync(process.env.RESULTS, 'utf8'));
process.exit(r.merge_eligible ? 0 : 1);
"
