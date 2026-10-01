import { BASE_TYPED_REQUESTS } from './worlds/base/typed-requests.js';
import type { WorldState } from './types.js';

/** A world's words for typed requests: what its things and creatures are called, requests it
 * recognizes but cannot perform (with its own reason), faithful near-substitutes, and
 * examples. The engine's typed front end reads only this; grammar and native families stay
 * generic. docs/engine-and-world-boundaries.md#intentional-v1-specificity
 */
export interface TypedRequestVocabulary {
  /** Words that name any visible heat source ("fire"). */
  heatSources: readonly string[];
  /** Words that name a living being of this world ("deer", "person"). */
  beings: readonly string[];
  /** Requests this world recognizes but has no action for, refused with its own reason. */
  unsupported: readonly { verbs: readonly string[]; reason: string }[];
  /** "VERB the HEAT [STATE] until TIME" offered as staying by the heat source instead. */
  revisions: readonly {
    verbs: readonly string[];
    states: readonly string[];
    becomes: 'stay-by-heat';
    omitted: { requirement: string; reason: string };
    /** Refusal when no stopping time was given. */
    withoutTime: string;
  }[];
  /** Example requests shown to players. */
  examples: readonly string[];
  placeholder: string;
}

/** Composition point: the bundled world supplies the vocabulary today. An installed world
 * package would supply its own here once external packages exist (EWF); there is no loader. */
export function typedRequestVocabulary(_world: WorldState): TypedRequestVocabulary {
  return BASE_TYPED_REQUESTS;
}
