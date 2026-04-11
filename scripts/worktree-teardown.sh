#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: scripts/worktree-teardown.sh <task-name>" >&2
  exit 1
fi

TASK="$1"
ROOT="$(git rev-parse --show-toplevel)"
WORKTREE="$ROOT/.worktrees/$TASK"

if [ ! -d "$WORKTREE" ]; then
  echo "Error: worktree not found at $WORKTREE" >&2
  exit 1
fi

git worktree remove "$WORKTREE" --force
git branch -D "task/$TASK"

echo "Worktree removed: $WORKTREE"
echo "Branch deleted: task/$TASK"
