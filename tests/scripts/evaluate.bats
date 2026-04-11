#!/usr/bin/env bats

setup() {
  TEST_REPO=$(mktemp -d)
  git init "$TEST_REPO"
  git -C "$TEST_REPO" config user.email "test@test.com"
  git -C "$TEST_REPO" config user.name "Test"
  git -C "$TEST_REPO" commit --allow-empty -m "initial"

  # Set up holdout with a passing test script
  mkdir -p "$TEST_REPO/holdout/feature-a/tests"
  cat > "$TEST_REPO/holdout/feature-a/tests/run.sh" << 'TESTEOF'
#!/usr/bin/env bash
echo '{"passed":5,"failed":0}'
exit 0
TESTEOF
  chmod +x "$TEST_REPO/holdout/feature-a/tests/run.sh"

  # Copy all scripts
  mkdir -p "$TEST_REPO/scripts"
  for f in worktree-new.sh worktree-teardown.sh evaluate.sh evaluate-llm.sh; do
    cp "$BATS_TEST_DIRNAME/../../scripts/$f" "$TEST_REPO/scripts/"
    chmod +x "$TEST_REPO/scripts/$f"
  done
  cp "$BATS_TEST_DIRNAME/../../scripts/evaluate-merge.js" "$TEST_REPO/scripts/"

  git -C "$TEST_REPO" add .
  git -C "$TEST_REPO" commit -m "setup"

  # Create the agent's task branch/worktree
  cd "$TEST_REPO"
  bash scripts/worktree-new.sh feature-a
}

teardown() {
  cd /
  rm -rf "$TEST_REPO"
}

@test "creates results JSON at .worktrees/results-<task>.json" {
  TEST_CMD="$TEST_REPO/holdout/feature-a/tests/run.sh" \
    bash scripts/evaluate.sh feature-a
  [ -f ".worktrees/results-feature-a.json" ]
}

@test "results JSON contains merge_eligible boolean" {
  TEST_CMD="$TEST_REPO/holdout/feature-a/tests/run.sh" \
    bash scripts/evaluate.sh feature-a
  TYPE=$(node -e "const r=JSON.parse(require('fs').readFileSync('.worktrees/results-feature-a.json','utf8')); console.log(typeof r.merge_eligible)")
  [ "$TYPE" = "boolean" ]
}

@test "exits 0 when merge eligible" {
  run env TEST_CMD="$TEST_REPO/holdout/feature-a/tests/run.sh" \
    bash scripts/evaluate.sh feature-a
  [ "$status" -eq 0 ]
}

@test "evaluation worktree is cleaned up after run" {
  TEST_CMD="$TEST_REPO/holdout/feature-a/tests/run.sh" \
    bash scripts/evaluate.sh feature-a
  [ ! -d ".worktrees/eval-feature-a" ]
}

@test "exits 1 when traditional tests fail threshold" {
  # Test script that reports below-threshold results
  cat > "$TEST_REPO/holdout/feature-a/tests/run.sh" << 'EOF'
#!/usr/bin/env bash
echo '{"passed":1,"failed":9}'
exit 0
EOF
  chmod +x "$TEST_REPO/holdout/feature-a/tests/run.sh"
  git -C "$TEST_REPO" add . && git -C "$TEST_REPO" commit -m "update test"

  run env TEST_CMD="$TEST_REPO/holdout/feature-a/tests/run.sh" \
    EVAL_THRESHOLD=90 \
    bash scripts/evaluate.sh feature-a
  [ "$status" -eq 1 ]
}
