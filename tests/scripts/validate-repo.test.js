import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { validateRepo } from '../../scripts/repo-validate.js';

function makeRepo() {
  const root = mkdtempSync(join(tmpdir(), 'dark-factory-validate-'));
  mkdirSync(join(root, 'specs'), { recursive: true });
  mkdirSync(join(root, 'holdout'), { recursive: true });
  return root;
}

function writeSpec(root, name, frontmatter, body = '# Feature\n') {
  const dir = join(root, 'specs', name);
  mkdirSync(dir, { recursive: true });
  if (frontmatter === null) {
    writeFileSync(join(dir, 'spec.md'), body);
    return;
  }
  const lines = Object.entries(frontmatter).map(([key, value]) => `${key}: ${value}`);
  writeFileSync(join(dir, 'spec.md'), `---\n${lines.join('\n')}\n---\n\n${body}`);
}

function writeHoldout(root, name, options = {}) {
  const dir = join(root, 'holdout', name);
  mkdirSync(dir, { recursive: true });
  if (options.scenarios !== false) {
    writeFileSync(join(dir, 'scenarios.md'), '---\nfeature: test\nthreshold: 90\n---\n');
  }
  if (options.tests) {
    mkdirSync(join(dir, 'tests'), { recursive: true });
    const testFile = join(dir, 'tests', 'run.sh');
    writeFileSync(testFile, '#!/usr/bin/env bash\necho ok\n');
    chmodSync(testFile, 0o755);
  }
}

test('validateRepo passes on valid draft spec without holdout', () => {
  const root = makeRepo();
  writeSpec(root, 'feature-a', {
    holdout: 'feature-a',
    status: 'draft',
    issue: '""',
  });

  const result = validateRepo(root);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test('validateRepo passes on valid non-draft spec with holdout', () => {
  const root = makeRepo();
  writeSpec(root, 'feature-a', {
    holdout: 'feature-a',
    status: 'ready',
    issue: '""',
  });
  writeHoldout(root, 'feature-a');

  const result = validateRepo(root);
  assert.equal(result.valid, true);
});

test('fails when spec is missing frontmatter', () => {
  const root = makeRepo();
  writeSpec(root, 'feature-a', null, '# No frontmatter\n');

  const result = validateRepo(root);
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /missing YAML frontmatter/);
});

test('fails when required frontmatter keys are missing', () => {
  const root = makeRepo();
  writeSpec(root, 'feature-a', {
    status: 'draft',
  });

  const result = validateRepo(root);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.includes("missing required frontmatter key 'holdout'")));
  assert.ok(result.errors.some(error => error.includes("missing required frontmatter key 'issue'")));
});

test('fails on invalid status', () => {
  const root = makeRepo();
  writeSpec(root, 'feature-a', {
    holdout: 'feature-a',
    status: 'queued',
    issue: '""',
  });

  const result = validateRepo(root);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.includes("invalid status 'queued'")));
});

test('fails on holdout mismatch', () => {
  const root = makeRepo();
  writeSpec(root, 'feature-a', {
    holdout: 'feature-b',
    status: 'draft',
    issue: '""',
  });

  const result = validateRepo(root);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.includes("must match spec directory name 'feature-a'")));
});

test('fails when non-draft spec is missing holdout directory', () => {
  const root = makeRepo();
  writeSpec(root, 'feature-a', {
    holdout: 'feature-a',
    status: 'ready',
    issue: '""',
  });

  const result = validateRepo(root);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.includes('non-draft spec requires holdout directory holdout/feature-a')));
});

test('fails when holdout has neither scenarios nor tests', () => {
  const root = makeRepo();
  writeSpec(root, 'feature-a', {
    holdout: 'feature-a',
    status: 'ready',
    issue: '""',
  });
  const dir = join(root, 'holdout', 'feature-a');
  mkdirSync(dir, { recursive: true });

  const result = validateRepo(root);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.includes('must contain scenarios.md or tests/')));
});

test('fails when holdout is unreferenced', () => {
  const root = makeRepo();
  writeHoldout(root, 'feature-a');

  const result = validateRepo(root);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.includes('is not referenced by any spec')));
});

test('fails when holdout is referenced by multiple specs', () => {
  const root = makeRepo();
  writeSpec(root, 'feature-a', {
    holdout: 'shared-holdout',
    status: 'draft',
    issue: '""',
  });
  writeSpec(root, 'feature-b', {
    holdout: 'shared-holdout',
    status: 'draft',
    issue: '""',
  });
  writeHoldout(root, 'shared-holdout');

  const result = validateRepo(root);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.includes('is referenced by multiple specs (2)')));
});

test('CLI exits 0 on valid repo and prints success summary', () => {
  const root = makeRepo();
  writeSpec(root, 'feature-a', {
    holdout: 'feature-a',
    status: 'ready',
    issue: '""',
  });
  writeHoldout(root, 'feature-a');

  const result = spawnSync('node', [join(process.cwd(), 'scripts/validate-repo.js'), '--root', root], {
    cwd: root,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /repository invariants valid/);
});

test('CLI exits non-zero on invalid repo and prints errors', () => {
  const root = makeRepo();
  writeSpec(root, 'feature-a', {
    holdout: 'feature-a',
    status: 'ready',
    issue: '""',
  });

  const result = spawnSync('node', [join(process.cwd(), 'scripts/validate-repo.js'), '--root', root], {
    cwd: root,
    encoding: 'utf8',
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /repository invariant violations found/);
  assert.match(result.stderr, /non-draft spec requires holdout directory/);
});
