#!/usr/bin/env node
// Aggregates traditional test output and optional LLM evaluation into a results JSON.
// Usage: node scripts/evaluate-merge.js --task NAME --traditional '{"passed":9,"failed":1}' --llm '{}' --threshold 90 --out results.json

import { parseArgs } from 'node:util';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * @param {{ task: string, traditional: object|string, llm: object|string, threshold: string|number }} opts
 * @returns {{ task: string, traditional: object, llm?: object, composite_pass_rate: number, threshold: number, merge_eligible: boolean }}
 */
export function mergeResults({ task, traditional, llm, threshold }) {
  const trad = typeof traditional === 'string' ? JSON.parse(traditional) : traditional;
  const llmData = typeof llm === 'string' ? JSON.parse(llm) : llm;
  const thresh = Number(threshold) / 100;

  const tradTotal = (trad.passed ?? 0) + (trad.failed ?? 0);
  const tradRate = tradTotal > 0 ? (trad.passed ?? 0) / tradTotal : 1;

  const hasLlm = llmData && Object.keys(llmData).length > 0 &&
    ('passed' in llmData || 'failed' in llmData);

  let compositeRate = tradRate;
  let llmResult;

  if (hasLlm) {
    const llmTotal = (llmData.passed ?? 0) + (llmData.failed ?? 0);
    const llmRate = llmTotal > 0 ? (llmData.passed ?? 0) / llmTotal : 1;
    llmResult = {
      passed: llmData.passed ?? 0,
      failed: llmData.failed ?? 0,
      pass_rate: Math.round(llmRate * 1000) / 1000,
    };
    compositeRate = (tradRate + llmRate) / 2;
  }

  return {
    task,
    traditional: {
      passed: trad.passed ?? 0,
      failed: trad.failed ?? 0,
      pass_rate: Math.round(tradRate * 1000) / 1000,
    },
    ...(llmResult ? { llm: llmResult } : {}),
    composite_pass_rate: Math.round(compositeRate * 1000) / 1000,
    threshold: Number(threshold),
    merge_eligible: compositeRate >= thresh,
  };
}

// CLI entrypoint — only runs when executed directly
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const { values } = parseArgs({
    options: {
      task:        { type: 'string' },
      traditional: { type: 'string', default: '{}' },
      llm:         { type: 'string', default: '{}' },
      threshold:   { type: 'string', default: '90' },
      out:         { type: 'string' },
    },
  });

  const result = mergeResults(values);
  const json = JSON.stringify(result, null, 2);

  if (values.out) {
    writeFileSync(values.out, json);
    console.error(`Results written to ${values.out}`);
  } else {
    console.log(json);
  }

  process.exit(result.merge_eligible ? 0 : 1);
}
