#!/usr/bin/env node
// scripts/spec-dispatch.js
// Run by CI: finds ready specs, creates GitHub Issues, writes back dispatched status.
// Requires: GH_TOKEN env var, gh CLI installed.
import { findReadySpecs, updateSpecFrontmatter } from './spec-parse.js';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const specsDir = join(__dirname, '..', 'specs');

const specs = findReadySpecs(specsDir);
console.log(`Found ${specs.length} ready spec(s)`);

for (const spec of specs) {
  const content = readFileSync(spec.path, 'utf8');
  const taskName = spec.name;

  const issueBody = [
    `## Spec ready for implementation: \`${taskName}\``,
    ``,
    `**Spec file:** \`specs/${taskName}/spec.md\``,
    ``,
    `To start work:`,
    `\`\`\`bash`,
    `scripts/worktree-new.sh ${taskName}`,
    `# Open Claude Code in .worktrees/${taskName}`,
    `# Use this issue number in your PR: Closes #<N>`,
    `\`\`\``,
    ``,
    `---`,
    ``,
    content,
  ].join('\n');

  // Write body to a temp file — avoids all shell quoting issues with URLs/special chars
  const tmpFile = join(tmpdir(), `spec-issue-${taskName}.md`);
  writeFileSync(tmpFile, issueBody);

  const result = spawnSync(
    'gh',
    ['issue', 'create', '--title', `Implement: ${taskName}`, '--body-file', tmpFile],
    { encoding: 'utf8' }
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`gh issue create failed: ${result.stderr}`);
  const issueUrl = result.stdout.trim();

  console.log(`Created issue: ${issueUrl}`);

  const updated = updateSpecFrontmatter(content, {
    status: 'dispatched',
    issue: `"${issueUrl}"`,
  });
  writeFileSync(spec.path, updated);
  console.log(`Updated spec: ${spec.path}`);
}

if (specs.length === 0) {
  console.log('Nothing to dispatch.');
}
