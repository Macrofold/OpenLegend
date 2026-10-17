import { join } from 'node:path';
import { modelInput } from './corpus.js';
import { summarize } from './evaluate.js';
import { readQualityRecords } from './quality-records.js';
import type { BenchmarkScene } from './types.js';

/** Keep original positions: memory-order variants deliberately share option bindings. */
export function selectQuestions(scene: BenchmarkScene, wanted: Set<string>): BenchmarkScene {
  return {
    ...scene,
    questionOrder: scene.questionOrder ?? scene.cases.map((test) => test.id),
    cases: scene.cases.filter((test) => wanted.has(test.id)),
  };
}

/** References select an offline study, never a runtime trigger or model-visible hint. */
export async function recordedJevMisses(
  source: string,
  original: BenchmarkScene[],
  reviewed: readonly BenchmarkScene[],
) {
  const { records, recordsFileDigest } = await readQualityRecords(
    join(source, 'comparison-records.json'),
    original,
  );
  const grade = summarize(
    [...reviewed],
    records.filter((record) => record.model === 'typesafe/jev-1.13'),
    ['typesafe/jev-1.13'],
  ).models[0]!;
  if (!grade.cases.length || grade.cases.some((test) => !test.answered))
    throw new Error('The source Jev comparison must answer the complete reviewed corpus.');
  const misses = grade.cases.filter((test) => !test.pass);
  if (!misses.length) throw new Error('No recorded Jev misses.');
  const wanted = new Set(misses.map((test) => test.id));
  const selected = reviewed
    .map((scene) => selectQuestions(scene, wanted))
    .filter((scene) => scene.cases.length);
  // Question filtering must never change the choices seen in the source study.
  const originalById = new Map(reviewed.map((scene) => [scene.id, scene]));
  for (const scene of selected) {
    const before = modelInput(originalById.get(scene.id)!).questions;
    for (const [id, question] of Object.entries(modelInput(scene).questions))
      if (JSON.stringify(question) !== JSON.stringify(before[id]))
        throw new Error(`Filtered question changed its original offered choices: ${id}`);
  }
  return {
    selected,
    source: {
      recordsFileDigest,
      originalQuestions: grade.cases.length,
      originalMisses: misses.length,
      originalScenarios: selected.length,
      originalPredictions: misses,
    },
  };
}
