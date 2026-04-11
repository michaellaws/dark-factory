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
  cp "$BATS_TEST_DIRNAME/../../scripts/worktree-teardown.sh" "$TEST_REPO/scripts/"
  chmod +x "$TEST_REPO/scripts/worktree-new.sh"
  chmod +x "$TEST_REPO/scripts/worktree-teardown.sh"
  cd "$TEST_REPO"
  bash scripts/worktree-new.sh test-task
}

teardown() {
  cd /
  rm -rf "$TEST_REPO"
}

@test "removes worktree directory" {
  bash scripts/worktree-teardown.sh test-task
  [ ! -d ".worktrees/test-task" ]
}

@test "removes task branch" {
  bash scripts/worktree-teardown.sh test-task
  run git branch --list "task/test-task"
  [ -z "$output" ]
}

@test "fails without task name argument" {
  run bash scripts/worktree-teardown.sh
  [ "$status" -ne 0 ]
}

@test "fails if worktree does not exist" {
  run bash scripts/worktree-teardown.sh nonexistent-task
  [ "$status" -ne 0 ]
}
