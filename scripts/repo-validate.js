import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseSpecFrontmatter } from './spec-parse.js';

export const ALLOWED_SPEC_STATUSES = new Set([
  'draft',
  'ready',
  'dispatched',
  'in_progress',
  'complete',
]);

function isDirectory(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function listChildDirectories(path) {
  try {
    return readdirSync(path).filter(name => isDirectory(join(path, name)));
  } catch {
    return [];
  }
}

function hasFrontmatterBlock(content) {
  return /^---\n[\s\S]*?\n---/.test(content);
}

function readSpecRecord(rootDir, featureName) {
  const specPath = join(rootDir, 'specs', featureName, 'spec.md');
  let content = '';
  try {
    content = readFileSync(specPath, 'utf8');
  } catch {
    return {
      featureName,
      specPath,
      exists: false,
      hasFrontmatter: false,
      frontmatter: {},
    };
  }

  return {
    featureName,
    specPath,
    exists: true,
    hasFrontmatter: hasFrontmatterBlock(content),
    frontmatter: parseSpecFrontmatter(content),
  };
}

function validateSpecRecord(record) {
  const errors = [];
  const { featureName, specPath, hasFrontmatter, frontmatter } = record;
  const holdoutName = frontmatter.holdout;
  const status = frontmatter.status;

  if (!hasFrontmatter) {
    errors.push(`${specPath}: missing YAML frontmatter`);
    return errors;
  }

  for (const key of ['holdout', 'status', 'issue']) {
    if (!(key in frontmatter)) {
      errors.push(`${specPath}: missing required frontmatter key '${key}'`);
    }
  }

  if ('holdout' in frontmatter && holdoutName !== featureName) {
    errors.push(`${specPath}: holdout '${holdoutName}' must match spec directory name '${featureName}'`);
  }

  if ('status' in frontmatter && !ALLOWED_SPEC_STATUSES.has(status)) {
    errors.push(
      `${specPath}: invalid status '${status}' (allowed: ${Array.from(ALLOWED_SPEC_STATUSES).join(', ')})`
    );
  }

  const holdoutDir = join(record.specPath, '..', '..', '..', 'holdout', holdoutName ?? featureName);
  if ('status' in frontmatter && status !== 'draft' && 'holdout' in frontmatter && !isDirectory(holdoutDir)) {
    errors.push(`${specPath}: non-draft spec requires holdout directory holdout/${holdoutName}`);
  }

  return errors;
}

function validateHoldoutDirectory(rootDir, holdoutName, referenceCount) {
  const errors = [];
  const holdoutDir = join(rootDir, 'holdout', holdoutName);
  const scenariosPath = join(holdoutDir, 'scenarios.md');
  const testsPath = join(holdoutDir, 'tests');

  if (!existsSync(scenariosPath) && !isDirectory(testsPath)) {
    errors.push(`${holdoutDir}: must contain scenarios.md or tests/`);
  }

  if (referenceCount === 0) {
    errors.push(`${holdoutDir}: is not referenced by any spec`);
  }

  if (referenceCount > 1) {
    errors.push(`${holdoutDir}: is referenced by multiple specs (${referenceCount})`);
  }

  return errors;
}

export function validateRepo(rootDir) {
  const specsDir = join(rootDir, 'specs');
  const holdoutDir = join(rootDir, 'holdout');
  const specNames = listChildDirectories(specsDir);
  const holdoutNames = listChildDirectories(holdoutDir);

  const errors = [];
  const warnings = [];
  const holdoutReferences = new Map();

  const specs = specNames.map(name => readSpecRecord(rootDir, name));
  for (const spec of specs) {
    errors.push(...validateSpecRecord(spec));
    if (spec.frontmatter.holdout) {
      holdoutReferences.set(
        spec.frontmatter.holdout,
        (holdoutReferences.get(spec.frontmatter.holdout) ?? 0) + 1
      );
    }
  }

  for (const name of holdoutNames) {
    errors.push(...validateHoldoutDirectory(rootDir, name, holdoutReferences.get(name) ?? 0));
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      specs: specNames.length,
      holdouts: holdoutNames.length,
    },
  };
}
