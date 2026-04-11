import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeResults } from '../../scripts/evaluate-merge.js';

test('traditional only: merge_eligible true when pass rate meets threshold', () => {
  const result = mergeResults({
    task: 'feature-a',
    traditional: { passed: 9, failed: 1 },
    llm: {},
    threshold: '90',
  });
  assert.equal(result.merge_eligible, true);
  assert.equal(result.composite_pass_rate, 0.9);
  assert.equal(result.traditional.pass_rate, 0.9);
});

test('traditional only: merge_eligible false when pass rate below threshold', () => {
  const result = mergeResults({
    task: 'feature-a',
    traditional: { passed: 8, failed: 2 },
    llm: {},
    threshold: '90',
  });
  assert.equal(result.merge_eligible, false);
});

test('with LLM: composite is average of both layers', () => {
  const result = mergeResults({
    task: 'feature-a',
    traditional: { passed: 10, failed: 0 },
    llm: { passed: 8, failed: 2 },
    threshold: '90',
  });
  // traditional: 1.0, llm: 0.8, composite: 0.9
  assert.equal(result.composite_pass_rate, 0.9);
  assert.equal(result.merge_eligible, true);
  assert.ok(result.llm);
  assert.equal(result.llm.pass_rate, 0.8);
});

test('with LLM: merge_eligible false when composite below threshold', () => {
  const result = mergeResults({
    task: 'feature-a',
    traditional: { passed: 9, failed: 1 },
    llm: { passed: 7, failed: 3 },
    threshold: '90',
  });
  // traditional: 0.9, llm: 0.7, composite: 0.8
  assert.equal(result.composite_pass_rate, 0.8);
  assert.equal(result.merge_eligible, false);
});

test('no llm key in output when llm input is empty', () => {
  const result = mergeResults({
    task: 'feature-a',
    traditional: { passed: 10, failed: 0 },
    llm: {},
    threshold: '90',
  });
  assert.equal('llm' in result, false);
});

test('result includes task name and threshold', () => {
  const result = mergeResults({
    task: 'my-feature',
    traditional: { passed: 5, failed: 5 },
    llm: {},
    threshold: '80',
  });
  assert.equal(result.task, 'my-feature');
  assert.equal(result.threshold, 80);
});
