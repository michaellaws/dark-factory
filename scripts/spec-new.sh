#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: scripts/spec-new.sh <feature-name>" >&2
  exit 1
fi

NAME="$1"
ROOT="$(git rev-parse --show-toplevel)"
SPEC_DIR="$ROOT/specs/$NAME"
SPEC_FILE="$SPEC_DIR/spec.md"

if [ -d "$SPEC_DIR" ]; then
  echo "Error: spec already exists at $SPEC_DIR" >&2
  exit 1
fi

mkdir -p "$SPEC_DIR"
cat > "$SPEC_FILE" << 'TEMPLATE'
---
holdout: FEATURE_NAME
status: draft
issue: ""
---

# FEATURE_NAME

## Intent
<One paragraph: what problem this solves and why.>

## Requirements
1. <Concrete requirement.>

## Visible acceptance criteria
<What the agent can verify during implementation — unit tests, type checks,
observable behavior. Does NOT include holdout scenarios.>
TEMPLATE

sed -i "s/FEATURE_NAME/$NAME/g" "$SPEC_FILE"

echo "Spec created: $SPEC_FILE"
echo "Edit it, then set status: ready to trigger dispatch."
