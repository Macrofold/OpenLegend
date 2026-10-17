import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { armById } from './arms.js';
import { sha256 } from './corpus.js';
import { preparedArmInput } from './execute.js';
import type { RunRecord } from './evaluate.js';
import { assertBenchmarkRecord } from './journal.js';
import { prepareBenchmarkTasks } from './run.js';
import type { BenchmarkScene } from './types.js';

/** Offline cohort admission reuses journal result validation. It authenticates
 * neither billing nor recovery: those still require the original full journals.
 */
export async function readQualityRecords(path: string, scenes: BenchmarkScene[]) {
  const text = await readFile(path, 'utf8');
  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error('Comparison records must be an array.');
  const { taskById } = prepareBenchmarkTasks(scenes, true);
  const seen = new Set<string>();
  const records: RunRecord[] = [];
  for (const raw of parsed as unknown[]) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
      throw new Error('Invalid comparison record.');
    const row = raw as Record<string, unknown>;
    const arm = typeof row.model === 'string' ? armById.get(row.model) : undefined;
    const task = typeof row.sceneId === 'string' ? taskById.get(row.sceneId) : undefined;
    const key = JSON.stringify([row.model, row.sceneId]);
    if (!arm || !task || typeof row.requestId !== 'string' || !row.requestId || seen.has(key))
      throw new Error('Unknown or duplicate comparison model/task.');
    const result = row.result as { receipt?: { providerRequestId?: string } } | undefined;
    assertBenchmarkRecord(
      raw,
      `${arm.id}:${task.id}`,
      row.requestId,
      sha256({ arm, input: preparedArmInput(arm, task) }),
      result?.receipt?.providerRequestId,
    );
    seen.add(key);
    records.push(raw);
  }
  return { records, recordsFileDigest: createHash('sha256').update(text).digest('hex') };
}
