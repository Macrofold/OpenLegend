import { compileSchema, type JsonValue } from '../../packages/ai/src/index.js';
import { acceptedPlans, complexScenes, episodes, reactionFor } from './complex-scenes.js';
import type { ComplexEpisode } from './complex-types.js';
import { permittedReaction } from './reaction-policy.js';

const nullableString = { type: ['string', 'null'] };
/** Separate capability lane: these are generated fields, not native Choice/Score answers. */
export const generationSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['plan', 'reaction', 'expression', 'speech', 'thought'],
  properties: {
    plan: { type: 'string', enum: ['a', 'b', 'c', 'd', 'defer'] },
    reaction: {
      type: 'object',
      additionalProperties: false,
      required: ['kind', 'policy', 'source', 'target', 'intensity', 'lifetimeGameMinutes'],
      properties: {
        kind: { type: 'string', enum: ['none', 'create'] },
        policy: nullableString,
        source: nullableString,
        target: nullableString,
        intensity: { type: ['number', 'null'], minimum: 0, maximum: 1 },
        lifetimeGameMinutes: { type: ['integer', 'null'], minimum: 0, maximum: 240 },
      },
    },
    expression: { type: 'string', enum: ['warm', 'firm', 'reserved', 'irritated'] },
    speech: { type: ['string', 'null'], maxLength: 800 },
    thought: { type: ['string', 'null'], maxLength: 800 },
  },
};
const validates = compileSchema(generationSchema);
export interface GeneratedValue {
  plan: string;
  reaction: {
    kind: 'none' | 'create';
    policy: string | null;
    source: string | null;
    target: string | null;
    intensity: number | null;
    lifetimeGameMinutes: number | null;
  };
  expression: string;
  speech: string | null;
  thought: string | null;
}
export const generationCases = episodes.map((episode) => ({
  id: `generate-${episode.id}`,
  episodeId: episode.id,
  input: {
    state: complexScenes.find((s) => s.group?.episodeId === episode.id && s.group.view === 'dense')!
      .state,
    instructions:
      'Return one JSON object matching the supplied schema. Select a qualifying plan, a permitted personally plausible feeling proposal, and a plausible observable tone. For kind none, all five other reaction fields must be null. For create, use the supplied policy/source/target, one offered positive absolute intensity and the exact lifetime. Speech and thought may be null; if supplied they must stay in this character’s perspective and use only their evidence. They receive separate human review, never exact-string grading.',
    schema: generationSchema,
  },
}));
export const nativeCapabilities = {
  'typesafe/jev-1.13': {
    nativeDecisions: true,
    structuredSelection: true,
    arbitraryJsonGeneration: false,
    freeText: false,
  },
  'microsoft/microsoft-decision-1': {
    nativeDecisions: true,
    structuredSelection: true,
    arbitraryJsonGeneration: false,
    freeText: false,
  },
  'openai/gpt-6-luna:decisions': {
    nativeDecisions: true,
    structuredSelection: true,
    arbitraryJsonGeneration: false,
    freeText: false,
  },
};
export interface GenerationSubmission {
  caseId: string;
  model: string;
  inputDigest: string;
  capability: 'supported' | 'unsupported';
  output?: unknown;
}
export function gradeGenerated(episode: ComplexEpisode, output: unknown) {
  if (!validates(output))
    return {
      schemaValid: false,
      planValid: false,
      reactionLegal: false,
      referenceFeeling: false,
      referenceExpression: false,
      proseReview: 'not-applicable',
    };
  const value = output as GeneratedValue;
  const r = value.reaction;
  const noChange =
    r.kind === 'none' &&
    r.policy === null &&
    r.source === null &&
    r.target === null &&
    r.intensity === null &&
    r.lifetimeGameMinutes === null;
  const scene = complexScenes.find(
    (s) => s.group?.episodeId === episode.id && s.group.view === 'dense',
  )!;
  const legal = permittedReaction(scene.state.feelingPolicy, r, true);
  return {
    schemaValid: true,
    planValid: acceptedPlans(episode).includes(value.plan),
    reactionLegal: legal,
    referenceFeeling:
      legal &&
      (noChange ||
        (episode.acceptableFeelings ?? [episode.feeling]).some((kind) => kind === r.policy)) &&
      episode.acceptableIntensities.includes(noChange ? 0 : r.intensity!),
    referenceExpression: episode.acceptableStyles.some((s) => s === value.expression),
    proseReview: value.speech || value.thought ? 'required' : 'not-supplied',
  };
}
/** Explicit fixture for exercising the grader; never reported as a model prediction. */
export function generationFixture(episode: ComplexEpisode): GeneratedValue {
  const r = reactionFor(episode, episode.acceptableIntensities[0]!);
  return {
    plan: acceptedPlans(episode)[0]!,
    reaction: {
      kind: r.kind,
      policy: r.policy ?? null,
      source: r.source ?? null,
      target: r.target ?? null,
      intensity: r.intensity ?? null,
      lifetimeGameMinutes: r.lifetimeGameMinutes ?? null,
    },
    expression: episode.acceptableStyles[0]!,
    speech: null,
    thought: null,
  };
}
export function selectedOutput(
  scene: { outputs?: Record<string, Record<string, JsonValue>> },
  questionId: string,
  semanticChoice: string,
) {
  return scene.outputs?.[questionId]?.[semanticChoice];
}
