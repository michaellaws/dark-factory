#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { validateRepo } from './repo-validate.js';

export function runValidation(rootDir) {
  const result = validateRepo(rootDir);

  if (result.valid) {
    console.log(
      `OK: repository invariants valid (${result.stats.specs} specs, ${result.stats.holdouts} holdouts)`
    );
    return result;
  }

  console.error('FAIL: repository invariant violations found');
  for (const error of result.errors) {
    console.error(`- ${error}`);
  }
  for (const warning of result.warnings) {
    console.error(`! ${warning}`);
  }
  return result;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const { values } = parseArgs({
    options: {
      root: { type: 'string' },
    },
  });
  const rootDir = values.root ? resolve(values.root) : join(__dirname, '..');
  const result = runValidation(rootDir);
  process.exit(result.valid ? 0 : 1);
}
