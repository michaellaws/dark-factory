// scripts/spec-parse.js
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Parse YAML frontmatter from a spec.md content string.
 * Supports simple key: value pairs only (no nested YAML).
 * Double-quoted values have their quotes stripped.
 * Returns {} if no frontmatter block found.
 */
export function parseSpecFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const frontmatter = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim().replace(/^"(.*)"$/, '$1');
    frontmatter[key] = value;
  }
  return frontmatter;
}

/**
 * Update frontmatter fields in a spec.md content string.
 * Replaces existing keys in-place. Appends new keys.
 * Throws if the content has no frontmatter block.
 */
export function updateSpecFrontmatter(content, updates) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error('No frontmatter found in content');

  let fm = match[1];
  for (const [key, value] of Object.entries(updates)) {
    if (new RegExp(`^${key}:`, 'm').test(fm)) {
      fm = fm.replace(new RegExp(`^${key}:.*$`, 'm'), `${key}: ${value}`);
    } else {
      fm += `\n${key}: ${value}`;
    }
  }
  return content.replace(/^---\n([\s\S]*?)\n---/, `---\n${fm}\n---`);
}

/**
 * Find all specs in specsDir that have status: ready and no issue set.
 * Returns array of { name, path, frontmatter }.
 * Returns [] if specsDir does not exist.
 */
export function findReadySpecs(specsDir) {
  const results = [];
  let entries;
  try {
    entries = readdirSync(specsDir);
  } catch {
    return results;
  }
  for (const entry of entries) {
    const specFile = join(specsDir, entry, 'spec.md');
    try {
      const content = readFileSync(specFile, 'utf8');
      const fm = parseSpecFrontmatter(content);
      if (fm.status === 'ready' && (fm.issue === '' || fm.issue === undefined)) {
        results.push({ name: entry, path: specFile, frontmatter: fm });
      }
    } catch {
      // no spec.md or unreadable — skip silently
    }
  }
  return results;
}
