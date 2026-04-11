#!/usr/bin/env bats

setup() {
  TEST_REPO=$(mktemp -d)
  git init "$TEST_REPO"
  git -C "$TEST_REPO" config user.email "test@test.com"
  git -C "$TEST_REPO" config user.name "Test"
  git -C "$TEST_REPO" commit --allow-empty -m "initial"
  mkdir -p "$TEST_REPO/holdout/feature-a"
  echo "secret" > "$TEST_REPO/holdout/feature-a/scenarios.md"
  mkdir -p "$TEST_REPO/specs"
  echo "spec" > "$TEST_REPO/specs/README.md"
  git -C "$TEST_REPO" add .
  git -C "$TEST_REPO" commit -m "add structure"
  mkdir -p "$TEST_REPO/scripts"
  cp "$BATS_TEST_DIRNAME/../../scripts/worktree-new.sh" "$TEST_REPO/scripts/"
  chmod +x "$TEST_REPO/scripts/worktree-new.sh"
  cd "$TEST_REPO"
}

teardown() {
  cd /
  rm -rf "$TEST_REPO"
}

@test "creates branch named task/<task-name>" {
  run bash scripts/worktree-new.sh my-task
  [ "$status" -eq 0 ]
  run git branch --list "task/my-task"
  [ -n "$output" ]
}

@test "creates worktree directory at .worktrees/<task-name>" {
  bash scripts/worktree-new.sh my-task
  [ -d ".worktrees/my-task" ]
}

@test "holdout/ does not exist in agent worktree" {
  bash scripts/worktree-new.sh my-task
  [ ! -d ".worktrees/my-task/holdout" ]
}

@test "source files are present in agent worktree" {
  bash scripts/worktree-new.sh my-task
  [ -f ".worktrees/my-task/specs/README.md" ]
}

@test "fails without task name argument" {
  run bash scripts/worktree-new.sh
  [ "$status" -ne 0 ]
}

@test "fails if worktree already exists" {
  bash scripts/worktree-new.sh my-task
  run bash scripts/worktree-new.sh my-task
  [ "$status" -ne 0 ]
}
