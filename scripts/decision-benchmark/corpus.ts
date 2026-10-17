import { createHash } from 'node:crypto';
import { validateQuestions } from '../../packages/ai/src/index.js';
import { actionScenes } from './corpus-actions.js';
import { memoryScenes } from './corpus-memory.js';
import { worldScenes } from './corpus-worlds.js';
import { complexScenes } from './complex-scenes.js';
import { choiceBindings } from './options.js';
import { selectedReactionScenes } from './selected-reactions.js';
import { frontierScenes } from './frontier-scenes.js';
import { moodScenes } from './mood-scenes.js';
import { permittedReaction } from './reaction-policy.js';
import type { BenchmarkScene } from './types.js';

export const baselineScenes: BenchmarkScene[] = [...actionScenes, ...memoryScenes, ...worldScenes];
export const scenes: BenchmarkScene[] = [
  ...baselineScenes,
  ...complexScenes,
  ...selectedReactionScenes,
  ...frontierScenes,
  ...moodScenes,
];
export const corpusVersion = 'openlegend-decisions-4000-2026-10-16';
export const sha256 = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function validateCorpus(corpus: BenchmarkScene[] = scenes): void {
  const ids = new Set<string>();
  for (const scene of corpus) {
    for (const item of [scene, ...scene.cases]) {
      if (!/^[a-z][a-z0-9-]+$/.test(item.id) || ids.has(item.id))
        throw new Error(`Duplicate or invalid corpus identity: ${item.id}`);
      ids.add(item.id);
    }
    if (!scene.cases.length || !scene.sources.length || !scene.title || !scene.family)
      throw new Error(`Incomplete scene: ${scene.id}`);
    const text = JSON.stringify(scene.state);
    if (text.length < 600 || text.length > 400_000)
      throw new Error(`Scene context outside the reviewed corpus envelope: ${scene.id}`);
    for (const test of scene.cases) {
      validateQuestions({ [test.id]: test.question });
      if (!test.rationale || test.gold.type !== test.question.type)
        throw new Error(`Missing rationale or mismatched answer type: ${test.id}`);
      if (test.gold.type === 'choice' && test.question.type === 'choice') {
        const criteria = test.question.criteria;
        if (!test.gold.accepted.length || test.gold.accepted.some((key) => !(key in criteria)))
          throw new Error(`Unoffered expected choice: ${test.id}`);
      } else if (test.gold.type !== 'choice') {
        const max = test.question.type === 'score' ? test.question.criteria.length - 1 : 1;
        if (
          !Number.isFinite(test.gold.min) ||
          !Number.isFinite(test.gold.max) ||
          test.gold.min < 0 ||
          test.gold.max > max ||
          test.gold.min > test.gold.max
        )
          throw new Error(`Invalid expected interval: ${test.id}`);
      }
      const output = scene.outputs?.[test.id];
      if (
        output &&
        (test.question.type !== 'choice' ||
          Object.keys(test.question.criteria).some((k) => !(k in output)))
      )
        throw new Error(`Incomplete structured output bindings: ${test.id}`);
      if (test.tags.includes('structured-reaction') && test.gold.type === 'choice') {
        const encounter = scene.state.encounter as
          | { newPersonallyPerceivedCause?: boolean }
          | undefined;
        if (
          test.gold.accepted.some(
            (k) =>
              !permittedReaction(
                scene.state.feelingPolicy,
                output?.[k],
                encounter?.newPersonallyPerceivedCause === true,
              ),
          )
        )
          throw new Error(`Illegal accepted reaction: ${test.id}`);
      }
    }
    if (Buffer.byteLength(JSON.stringify(modelInput(scene))) > 480_000)
      throw new Error(`Input exceeds reviewed transport envelope: ${scene.id}`);
  }
}

/** Opaque option handles randomize position even when the HTTP serializer sorts keys. */
export function modelInput(scene: BenchmarkScene) {
  return {
    state: scene.state,
    questions: Object.fromEntries(
      scene.cases.map((test) => [
        test.id,
        test.question.type === 'choice'
          ? {
              ...test.question,
              criteria: Object.fromEntries(
                [...choiceBindings(scene, test)].map(([wire, semantic]) => [
                  wire,
                  `${scene.group ? '' : `[${semantic}] `}${test.question.type === 'choice' ? test.question.criteria[semantic] : ''}`,
                ]),
              ),
            }
          : test.question,
      ]),
    ),
  };
}
