#!/usr/bin/env bats

setup() {
  TEST_REPO=$(mktemp -d)
  git init "$TEST_REPO"
  git -C "$TEST_REPO" config user.email "test@test.com"
  git -C "$TEST_REPO" config user.name "Test"
  git -C "$TEST_REPO" commit --allow-empty -m "initial"
  mkdir -p "$TEST_REPO/scripts"
  cp "$BATS_TEST_DIRNAME/../../scripts/spec-new.sh" "$TEST_REPO/scripts/"
  chmod +x "$TEST_REPO/scripts/spec-new.sh"
  cd "$TEST_REPO"
}

teardown() {
  cd /
  rm -rf "$TEST_REPO"
}

@test "creates specs/<name>/spec.md" {
  bash scripts/spec-new.sh my-feature
  [ -f "specs/my-feature/spec.md" ]
}

@test "frontmatter contains holdout: my-feature" {
  bash scripts/spec-new.sh my-feature
  grep -q "^holdout: my-feature$" specs/my-feature/spec.md
}

@test "frontmatter contains status: draft" {
  bash scripts/spec-new.sh my-feature
  grep -q "^status: draft$" specs/my-feature/spec.md
}

@test "frontmatter contains issue: empty string" {
  bash scripts/spec-new.sh my-feature
  grep -q '^issue: ""$' specs/my-feature/spec.md
}

@test "no FEATURE_NAME placeholder remains in output" {
  bash scripts/spec-new.sh my-feature
  run grep "FEATURE_NAME" specs/my-feature/spec.md
  [ "$status" -ne 0 ]
}

@test "fails without argument" {
  run bash scripts/spec-new.sh
  [ "$status" -ne 0 ]
}

@test "fails if spec already exists" {
  bash scripts/spec-new.sh my-feature
  run bash scripts/spec-new.sh my-feature
  [ "$status" -ne 0 ]
}
