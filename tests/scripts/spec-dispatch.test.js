import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  chmodSync,
  copyFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

function makeRepo() {
  const root = mkdtempSync(join(tmpdir(), 'dark-factory-dispatch-'));
  mkdirSync(join(root, 'scripts'), { recursive: true });
  mkdirSync(join(root, 'specs'), { recursive: true });
  mkdirSync(join(root, 'holdout'), { recursive: true });
  writeFileSync(join(root, 'package.json'), '{"type":"module"}\n');

  for (const file of ['spec-parse.js', 'repo-validate.js', 'spec-dispatch.js']) {
    copyFileSync(join(process.cwd(), 'scripts', file), join(root, 'scripts', file));
  }

  return root;
}

function writeSpec(root, name, { holdout, status, issue = '""' }) {
  const dir = join(root, 'specs', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'spec.md'),
    `---\nholdout: ${holdout}\nstatus: ${status}\nissue: ${issue}\n---\n\n# ${name}\n`
  );
}

function writeHoldout(root, name) {
  const dir = join(root, 'holdout', name);
  mkdirSync(join(dir, 'tests'), { recursive: true });
  writeFileSync(join(dir, 'tests', 'run.js'), 'console.log(JSON.stringify({passed:1,failed:0}))\n');
}

function writeFakeGh(root, mode = 'success') {
  const binDir = join(root, 'bin');
  const logFile = join(root, 'gh.log');
  mkdirSync(binDir, { recursive: true });
  const script = mode === 'success'
    ? `#!/usr/bin/env bash\nprintf '%s\n' "$*" >> "${logFile}"\necho "https://github.com/example/repo/issues/123"\n`
    : `#!/usr/bin/env bash\nprintf '%s\n' "$*" >> "${logFile}"\nexit 1\n`;
  const ghPath = join(binDir, 'gh');
  writeFileSync(ghPath, script);
  chmodSync(ghPath, 0o755);
  return { binDir, logFile };
}

test('dispatch updates ready spec to dispatched on valid repo', () => {
  const root = makeRepo();
  writeSpec(root, 'feature-a', { holdout: 'feature-a', status: 'ready' });
  writeHoldout(root, 'feature-a');
  const { binDir, logFile } = writeFakeGh(root);

  const result = spawnSync('node', ['scripts/spec-dispatch.js'], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      GH_TOKEN: 'fake-token',
    },
  });

  assert.equal(result.status, 0);
  assert.equal(existsSync(logFile), true);
  const updatedSpec = readFileSync(join(root, 'specs', 'feature-a', 'spec.md'), 'utf8');
  assert.match(updatedSpec, /status: dispatched/);
  assert.match(updatedSpec, /issue: "https:\/\/github.com\/example\/repo\/issues\/123"/);
});

test('dispatch fails before gh issue creation when repo invariants are invalid', () => {
  const root = makeRepo();
  writeSpec(root, 'feature-a', { holdout: 'feature-a', status: 'ready' });
  const { binDir, logFile } = writeFakeGh(root);

  const result = spawnSync('node', ['scripts/spec-dispatch.js'], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      GH_TOKEN: 'fake-token',
    },
  });

  assert.equal(result.status, 1);
  assert.equal(existsSync(logFile), false);
  assert.match(result.stderr, /repository invariant violations found before dispatch/);
  const spec = readFileSync(join(root, 'specs', 'feature-a', 'spec.md'), 'utf8');
  assert.match(spec, /status: ready/);
});
