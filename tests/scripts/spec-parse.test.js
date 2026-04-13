import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  parseSpecFrontmatter,
  updateSpecFrontmatter,
  findReadySpecs,
} from '../../scripts/spec-parse.js';

// --- parseSpecFrontmatter ---

test('extracts holdout, status, and issue fields', () => {
  const content = `---\nholdout: my-feature\nstatus: draft\nissue: ""\n---\n\n# My Feature\n`;
  const fm = parseSpecFrontmatter(content);
  assert.equal(fm.holdout, 'my-feature');
  assert.equal(fm.status, 'draft');
  assert.equal(fm.issue, '');
});

test('strips double quotes from values', () => {
  const content = `---\nissue: "https://github.com/org/repo/issues/1"\n---\n`;
  const fm = parseSpecFrontmatter(content);
  assert.equal(fm.issue, 'https://github.com/org/repo/issues/1');
});

test('returns empty object when no frontmatter present', () => {
  const content = '# Just a heading\nNo frontmatter here.';
  const fm = parseSpecFrontmatter(content);
  assert.deepEqual(fm, {});
});

// --- updateSpecFrontmatter ---

test('updates an existing key in frontmatter', () => {
  const content = `---\nholdout: my-feature\nstatus: ready\nissue: ""\n---\n\n# Body\n`;
  const updated = updateSpecFrontmatter(content, { status: 'dispatched' });
  assert.ok(updated.includes('status: dispatched'));
  assert.ok(!updated.includes('status: ready'));
});

test('adds a new key if it does not exist', () => {
  const content = `---\nholdout: my-feature\nstatus: ready\n---\n\n# Body\n`;
  const updated = updateSpecFrontmatter(content, { issue: '"https://example.com"' });
  assert.ok(updated.includes('issue: "https://example.com"'));
});

test('preserves body content outside frontmatter', () => {
  const content = `---\nstatus: ready\nissue: ""\n---\n\n# My Feature\n\nSome body content here.\n`;
  const updated = updateSpecFrontmatter(content, { status: 'dispatched' });
  assert.ok(updated.includes('# My Feature'));
  assert.ok(updated.includes('Some body content here.'));
});

test('throws if content has no frontmatter', () => {
  assert.throws(
    () => updateSpecFrontmatter('No frontmatter', { status: 'dispatched' }),
    /No frontmatter/
  );
});

// --- findReadySpecs ---

function makeTmpSpecs() {
  return mkdtempSync(join(tmpdir(), 'specs-'));
}

function writeSpec(specsDir, name, content) {
  const specDir = join(specsDir, name);
  mkdirSync(specDir, { recursive: true });
  writeFileSync(join(specDir, 'spec.md'), content);
}

test('returns specs with status: ready and empty issue', () => {
  const specsDir = makeTmpSpecs();
  writeSpec(specsDir, 'feat-a', `---\nstatus: ready\nissue: ""\n---\n`);
  const results = findReadySpecs(specsDir);
  assert.equal(results.length, 1);
  assert.equal(results[0].name, 'feat-a');
});

test('skips spec with status: dispatched', () => {
  const specsDir = makeTmpSpecs();
  writeSpec(specsDir, 'feat-a', `---\nstatus: dispatched\nissue: "https://x"\n---\n`);
  const results = findReadySpecs(specsDir);
  assert.equal(results.length, 0);
});

test('skips spec with status: ready but issue already set', () => {
  const specsDir = makeTmpSpecs();
  writeSpec(specsDir, 'feat-a', `---\nstatus: ready\nissue: "https://github.com/org/repo/issues/1"\n---\n`);
  const results = findReadySpecs(specsDir);
  assert.equal(results.length, 0);
});

test('returns empty array for non-existent directory', () => {
  const results = findReadySpecs('/tmp/does-not-exist-12345');
  assert.deepEqual(results, []);
});

test('returns multiple ready specs when present', () => {
  const specsDir = makeTmpSpecs();
  writeSpec(specsDir, 'feat-a', `---\nstatus: ready\nissue: ""\n---\n`);
  writeSpec(specsDir, 'feat-b', `---\nstatus: ready\nissue: ""\n---\n`);
  writeSpec(specsDir, 'feat-c', `---\nstatus: draft\nissue: ""\n---\n`);
  const results = findReadySpecs(specsDir);
  assert.equal(results.length, 2);
  const names = results.map(r => r.name).sort();
  assert.deepEqual(names, ['feat-a', 'feat-b']);
});
