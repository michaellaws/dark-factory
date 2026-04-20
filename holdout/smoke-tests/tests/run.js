#!/usr/bin/env node
// Smoke test runner for dark-factory template CI verification.
// Outputs the JSON format evaluate.sh expects: { passed, failed }
// These tests verify the evaluation pipeline itself works end-to-end.

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const results = { passed: 0, failed: 0 };

function test(name, fn) {
  try {
    fn();
    results.passed++;
  } catch (e) {
    results.failed++;
    process.stderr.write(`FAIL: ${name}: ${e.message}\n`);
  }
}

test('smoke: node is available', () => {
  if (!process.version) throw new Error('no process.version');
});

test('smoke: working directory is a git worktree', () => {
  execSync('git rev-parse --git-dir', { stdio: 'pipe' });
});

test('smoke: holdout/ is present (full checkout)', () => {
  if (!existsSync('holdout')) throw new Error('holdout/ not found');
});

process.stdout.write(JSON.stringify(results) + '\n');
