import pointGrammar from './typed-point.json' with { type: 'json' };
import stopGrammar from './typed-stop.json' with { type: 'json' };
import relativeFormat from './typed-relative-format.json' with { type: 'json' };
import { selectedTypedRequestVocabulary } from './world-composition.js';
import type { WorldState } from './types.js';
import type { ActivityDefinitionScope } from './activity-hosts.js';

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
export function typedRequestVocabulary(
  world: ActivityDefinitionScope & Pick<WorldState, 'profile'>,
): TypedRequestVocabulary {
  return selectedTypedRequestVocabulary(world);
}

/** `undefined` means other wording, `null` means stop the current work, and a name
 * requires the matching activity. The stand-alone host reads the same grammar. */
export function typedStop(text: string): keyof typeof stopGrammar.activities | null | undefined {
  const split = text.indexOf(' ');
  const verb = split < 0 ? text : text.slice(0, split);
  if (!stopGrammar.verbs.includes(verb)) return undefined;
  const phrase = split < 0 ? '' : text.slice(split + 1);
  if (stopGrammar.unnamed.includes(phrase)) return null;
  return Object.hasOwn(stopGrammar.activities, phrase)
    ? (phrase as keyof typeof stopGrammar.activities)
    : undefined;
}

export function typedStopMatches(activity: keyof typeof stopGrammar.activities, kind: string) {
  return stopGrammar.activities[activity] === kind;
}

/** Neutral coordinate phrases shared by the normalized Source and Rust readers. */
export const typedPointGrammar = pointGrammar;
export const typedRelativeFormat = relativeFormat;
