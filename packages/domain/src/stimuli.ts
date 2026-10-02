import { episodeStartedAt } from './encounter-cache.js';
import { readOnlyDraftView } from './draft.js';
import { outwardStates } from './perception-frame.js';
import type { Entity, WorldState } from './types.js';

/** A world's policy for ongoing perceived conditions (EPR06). Ordering and review hints only:
 * it never records a new experience, grants knowledge or forces a model call. */
export interface StimulusPolicy {
  /** Physical salience of a coarse outward state (see `outwardStates`); others are 0. */
  salience: Readonly<Record<string, number>>;
  /** A source is novel while its current exposure episode is younger than this. */
  noveltySeconds: number;
  /** Optional simulation-clock review of an ongoing salient stimulus. Absent: none due. */
  reviewSeconds?: number;
  /** Cues kept per observer; the rest are only counted. */
  limit: number;
}
/** One currently perceived salient source. Novelty, relevance and urgency stay separate
 * dimensions; story significance is the story selector's own policy. */
export interface ActiveStimulus {
  sourceId: string;
  /** Coarse outward states only, never private or authored-hidden facts. */
  states: string[];
  salience: number;
  novel: boolean;
  /** When this source's current salient period began for the observer (simulation seconds):
   * its exposure onset, or a later observed outward change such as a fire being lit. */
  since: number;
  /** Next due review on the simulation clock, when the policy defines one. */
  reviewAt?: number;
  /** Completed review periods; changes exactly when a review falls due. */
  reviews: number;
}

/** Physical salience of one source under a policy: the strongest salient outward state. */
export function stimulusSalience(entity: Entity, policy: StimulusPolicy): number {
  let salience = 0;
  for (const state of outwardStates(entity))
    if (state) salience = Math.max(salience, policy.salience[state] ?? 0);
  return salience;
}

/** Ongoing salient conditions an observer currently perceives, derived from its live exposure
 * rather than stored per tick. Deterministic order: salience, then novelty, then earlier onset,
 * then source ID; at most `policy.limit`, with the remainder counted in `omitted`. A source
 * that stops being salient or leaves view simply disappears from the next derivation.
 * docs/events-perception-and-reactions.md#8-ongoing-salience-relevance-and-reminders */
export function activeStimuli(
  world: WorldState,
  observerId: string,
  policy: StimulusPolicy,
): { stimuli: ActiveStimulus[]; omitted: number } {
  const episodes = world.perceptionEpisodes?.[observerId] ?? {};
  const salient: Array<{ sourceId: string; states: string[]; salience: number; seen: number }> = [];
  for (const sourceId of [
    ...(world.visiblePeople?.[observerId] ?? []),
    ...(world.visibleObjects?.[observerId] ?? []),
  ]) {
    const source = world.entities[sourceId];
    if (!source) continue;
    const salience = stimulusSalience(source, policy);
    if (salience <= 0) continue;
    const seen = episodeStartedAt(episodes[sourceId]) ?? world.simTime;
    salient.push({ sourceId, states: outwardStates(source).filter(Boolean), salience, seen });
  }
  // A source that became salient while already in view (a fire lit) starts its period at the
  // observer's latest private outward-change record for it, not at first exposure. Only
  // resident records are read; a missing one falls back to exposure onset.
  const changedAt = new Map<string, number>();
  if (salient.length) {
    const wanted = new Set(salient.map((entry) => entry.sourceId));
    const earliest = Math.min(...salient.map((entry) => entry.seen));
    const awareness = world.experience ? readOnlyDraftView(world.experience.awareness) : undefined;
    const entries = readOnlyDraftView(awareness?.[observerId] ?? []);
    for (let i = entries.length - 1; i >= 0 && changedAt.size < wanted.size; i--) {
      const entry = entries[i]!;
      if (entry.at < earliest) break;
      if (
        entry.eventType === 'encounter' &&
        entry.change === 'detail' &&
        entry.targetId &&
        wanted.has(entry.targetId) &&
        !changedAt.has(entry.targetId)
      )
        changedAt.set(entry.targetId, entry.at);
    }
  }
  const stimuli: ActiveStimulus[] = [];
  for (const { sourceId, states, salience, seen } of salient) {
    const since = Math.max(seen, changedAt.get(sourceId) ?? seen);
    const age = Math.max(0, world.simTime - since);
    const reviews = policy.reviewSeconds ? Math.floor(age / policy.reviewSeconds) : 0;
    stimuli.push({
      sourceId,
      states,
      salience,
      novel: age < policy.noveltySeconds,
      since,
      reviews,
      ...(policy.reviewSeconds ? { reviewAt: since + (reviews + 1) * policy.reviewSeconds } : {}),
    });
  }
  stimuli.sort(
    (a, b) =>
      b.salience - a.salience ||
      Number(b.novel) - Number(a.novel) ||
      a.since - b.since ||
      (a.sourceId < b.sourceId ? -1 : a.sourceId > b.sourceId ? 1 : 0),
  );
  const limit = Math.max(0, Math.floor(policy.limit));
  return { stimuli: stimuli.slice(0, limit), omitted: Math.max(0, stimuli.length - limit) };
}
