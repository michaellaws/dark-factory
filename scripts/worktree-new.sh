#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: scripts/worktree-new.sh <task-name>" >&2
  exit 1
fi

TASK="$1"
ROOT="$(git rev-parse --show-toplevel)"
WORKTREE="$ROOT/.worktrees/$TASK"

if [ -d "$WORKTREE" ]; then
  echo "Error: worktree already exists at $WORKTREE" >&2
  exit 1
fi

# Create worktree on a new branch
git worktree add "$WORKTREE" -b "task/$TASK"

# Non-cone mode required — cone mode does not support negation patterns
# '/*' includes everything; '!holdout/' excludes the holdout directory
git -C "$WORKTREE" sparse-checkout init
git -C "$WORKTREE" sparse-checkout set --no-cone '/*' '!holdout/'

echo "Worktree ready: $WORKTREE"
echo "Branch: task/$TASK"
