#!/usr/bin/env bash
set -euo pipefail

# Usage: scripts/evaluate-llm.sh <task-name> <eval-worktree-path>
#
# Environment variables:
#   LLM_API_KEY    — required
#   LLM_BASE_URL   — default: https://api.anthropic.com/v1/messages
#   LLM_MODEL      — default: claude-haiku-4-5-20251001
#
# Output: JSON { "passed": N, "failed": N, "verdicts": [...] }
# If no scenarios.md found, outputs {} and exits 0 (no LLM gate applied)

if [ $# -lt 2 ]; then
  echo "Usage: scripts/evaluate-llm.sh <task-name> <eval-worktree-path>" >&2
  exit 1
fi

TASK="$1"
EVAL_WORKTREE="$2"
SCENARIOS="$EVAL_WORKTREE/holdout/$TASK/scenarios.md"

# No scenarios file — return empty result, no LLM gate applied
if [ ! -f "$SCENARIOS" ]; then
  echo "{}"
  exit 0
fi

if [ -z "${LLM_API_KEY:-}" ]; then
  echo "Error: LLM_API_KEY is not set" >&2
  exit 1
fi

SCENARIOS_CONTENT=$(cat "$SCENARIOS")

# Gather implementation context: up to 20KB of source files
IMPL_FILES=$(find "$EVAL_WORKTREE/src" \
  \( -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.go" -o -name "*.rs" \) \
  ! -path "*/node_modules/*" \
  ! -path "*/.worktrees/*" \
  2>/dev/null | head -20)

IMPL_CONTEXT=""
if [ -n "$IMPL_FILES" ]; then
  IMPL_CONTEXT=$(echo "$IMPL_FILES" | xargs head -c 20000 2>/dev/null || true)
fi

PROMPT="You are an acceptance criteria evaluator for software.

Evaluate whether the implementation satisfies each scenario below.
Output ONLY valid JSON — no other text, no markdown fences:

{
  \"passed\": <integer count of passed scenarios>,
  \"failed\": <integer count of failed scenarios>,
  \"verdicts\": [
    { \"scenario\": \"<scenario name>\", \"passed\": true, \"reason\": \"<one sentence>\" }
  ]
}

SCENARIOS:
$SCENARIOS_CONTENT

IMPLEMENTATION:
${IMPL_CONTEXT:-No source files found in src/}"

RESPONSE=$(curl -sf \
  "${LLM_BASE_URL:-https://api.anthropic.com/v1/messages}" \
  -H "x-api-key: ${LLM_API_KEY}" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d "{
    \"model\": \"${LLM_MODEL:-claude-haiku-4-5-20251001}\",
    \"max_tokens\": 1024,
    \"messages\": [{\"role\": \"user\", \"content\": $(printf '%s' "$PROMPT" | jq -Rs .)}]
  }")

# Extract and validate LLM response
LLM_TEXT=$(echo "$RESPONSE" | jq -r '.content[0].text' 2>/dev/null || echo "")

# Validate output is parseable JSON before returning
if ! echo "$LLM_TEXT" | jq . > /dev/null 2>&1; then
  echo "Warning: LLM response was not valid JSON — returning empty result" >&2
  echo "{}"
  exit 0
fi

echo "$LLM_TEXT"
