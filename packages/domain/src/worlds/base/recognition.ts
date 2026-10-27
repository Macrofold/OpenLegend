import { cloneValue, readOnlyDraftView } from '../../draft.js';
import { entityGet, entityValues } from '../../entity-collection.js';
import {
  advanceKnowledgeRevision,
  allocateObserverIndividual,
  validObserverSubject,
  type ObserverSubject,
} from '../../knowledge.js';
import { readAttribute, definitionPin } from '../../world-modules.js';
import type { WorldEvent, WorldState } from '../../types.js';
import { commitObserverIdentity, type ObserverIdentity } from './knowledge.js';
import {
  isTemporalReceiptSource,
  setTemporalSupportRequired,
  releaseTemporalSupport,
  temporalReceiptForSource,
  captureTemporalObservation,
  retainTemporalSupport,
  temporalReceiptSource,
} from '../../temporal-evidence.js';
import { adjustRetainedKnowledgeAccounting } from '../../remembered-impressions.js';
import { BASE_ATTENTION_POLICY } from './attention.js';
import { normalSpeedSeconds } from '../../simulation-time.js';
import { isSafeRecordId } from '../../records.js';
import { validateEvidenceSource } from '../../perception-values.js';
import type { EvidenceSource, ObservationFactKey } from '../../perception-evidence.js';
import type { FamiliarityRoot, FamiliarityState } from '../../attention.js';

/** Selected fictional descriptors; never derived from an identity or rendering asset.
 * docs/worlds/base/perception-recognition.md#perceivable-signatures */
export const BASE_VOICE_FEATURE_FAMILY = { id: 'wilderness:voice-features', version: 1 } as const;
export const VOICE_DIMENSIONS = ['pitchRange', 'resonance', 'texture', 'rhythm'] as const;
export type VoiceDimension = (typeof VOICE_DIMENSIONS)[number];
export type VoiceFeatures = Record<VoiceDimension, number>;
export type RecognitionFeatures = Record<string, { min: number; max: number }>;
export type RecognitionModality = 'voice' | 'sight';
export interface RecognitionSample {
  key: string;
  sourceKey: string;
  at: number;
  order: number;
  encounter: string;
  features: RecognitionFeatures;
  quality: number;
  perception: number;
  policy: string;
  support: string[];
  contactEligible: boolean;
}
export interface AuthoredRecognition {
  source: string;
  installedAt: number;
  order: number;
  baseline: 'learned' | 'familiar';
  exemplars: { features: RecognitionFeatures; quality: number; ordinal: number }[];
}
export interface RecognitionKnowledge {
  samples: RecognitionSample[];
  authored?: AuthoredRecognition;
  lastCreditAt?: number;
  nextCreditAt?: number;
}
export interface IndividualRecognition {
  recognized: boolean;
  subject?: ObserverSubject;
  /** New learning is separate from the result computed from prior knowledge. */
  learnedSubject?: ObserverSubject;
  candidates: { individualId: string; distance: number }[];
  moreCandidates: boolean;
  quality: number;
  perception?: number;
  policy?: string;
  priorExemplarKey?: string;
  /** Immediate actual association dependency, independent of the received words. */
  learningSupport?: string[];
  seedCorrelation?: { sampleKey: string; individualId?: string };
  familiarity?: number;
}
export const BASE_PERCEPTION_POLICY = {
  id: 'wilderness:individual-recognition',
  version: 1,
  creditSeconds: 2,
  seedSeconds: 30,
  warningSeconds: 2,
  retainedCredits: 12,
  matchingExemplars: 4,
  familiarityRoots: 120,
  familiarityMatureSeconds: 1800,
} as const;

const rootOrder = (a: FamiliarityRoot, b: FamiliarityRoot) =>
  b.at - a.at || b.order - a.order || a.key.localeCompare(b.key);
export function individualFamiliarity(identity: ObserverIdentity): number {
  return Math.min(
    100,
    Math.max(
      identity.familiarity?.authored?.value ?? 0,
      identity.familiarity?.roots.filter((root) => root.credited).length ?? 0,
    ),
  );
}
export function subjectFamiliarity(
  world: WorldState,
  observerId: string,
  subject: ObserverSubject,
): number {
  const records = world.observerIdentities?.[observerId] ?? {};
  const identity =
    subject.kind === 'individual'
      ? records[subject.individualId]
      : Object.values(records).find(
          (record) => !record.seedOnly && record.canonicalId === subject.entityId,
        );
  return identity && !identity.seedOnly ? individualFamiliarity(identity) : 0;
}
export function subjectFamiliarityContactDue(
  world: WorldState,
  observerId: string,
  subject: ObserverSubject,
  at: number,
): boolean {
  const records = world.observerIdentities?.[observerId] ?? {};
  const identity =
    subject.kind === 'individual'
      ? records[subject.individualId]
      : Object.values(records).find(
          (record) => !record.seedOnly && record.canonicalId === subject.entityId,
        );
  return (
    !!identity &&
    !identity.seedOnly &&
    (identity.familiarity?.nextCreditAt === undefined || at >= identity.familiarity.nextCreditAt)
  );
}
/** A scheduled contact is an existing individual-owned deadline, not a new
 * sampling clock. A declined credit cannot keep an overdue receiver spinning. */
export function individualFamiliarityContactAt(
  world: WorldState,
  observerId: string,
  individualId: string,
  confirmedThrough: number,
): number | undefined {
  const identity = world.observerIdentities?.[observerId]?.[individualId];
  const at = identity?.familiarity?.nextCreditAt;
  return identity && !identity.seedOnly && at !== undefined && at > confirmedThrough
    ? at
    : undefined;
}
function retainFamiliarity(roots: FamiliarityRoot[]): FamiliarityRoot[] {
  const required = roots.filter((root) => root.required).sort(rootOrder);
  const optional = roots.filter((root) => !root.required).sort(rootOrder);
  return [...required, ...optional].slice(0, BASE_PERCEPTION_POLICY.familiarityRoots);
}
/** Called only by actual received contact/interaction, never context projection or time polling. */
export function creditSubjectFamiliarity(
  world: WorldState,
  observerId: string,
  subject: ObserverSubject,
  input: { key: string; sourceKey: string; at: number; order: number; support: readonly string[] },
): boolean {
  const records = world.observerIdentities?.[observerId] ?? {};
  const previous =
    subject.kind === 'individual'
      ? records[subject.individualId]
      : Object.values(records).find(
          (record) => !record.seedOnly && record.canonicalId === subject.entityId,
        );
  if (!previous?.individualId || previous.seedOnly) return false;
  if (
    !validRecognitionSupportKey(input.sourceKey) ||
    !recognitionSupportSources([input.sourceKey]).length ||
    input.support.some((key) => !validRecognitionSupportKey(key)) ||
    !Number.isFinite(input.at) ||
    input.at < 0 ||
    input.at > world.simTime ||
    !Number.isSafeInteger(input.order) ||
    input.order < 0 ||
    input.key !== JSON.stringify(['contact', input.sourceKey, input.at])
  )
    throw new Error('Invalid received familiarity contact.');
  if (
    (previous.familiarity?.nextCreditAt !== undefined &&
      input.at < previous.familiarity.nextCreditAt) ||
    previous.familiarity?.roots.some((root) => root.key === input.key)
  )
    return false;
  const identity = cloneValue(previous);
  const state: FamiliarityState = (identity.familiarity ??= { roots: [], fastCredits: 0 });
  const root: FamiliarityRoot = {
    key: input.key,
    sourceKey: input.sourceKey,
    at: input.at,
    order: input.order,
    support: [...new Set([input.sourceKey, ...input.support])],
    required: false,
    credited: true,
  };
  state.roots = retainFamiliarity([...state.roots, root]);
  state.fastCredits = Math.min(6, state.fastCredits + 1);
  state.lastCreditAt = input.at;
  state.nextCreditAt =
    input.at +
    (state.fastCredits < 6
      ? normalSpeedSeconds(world, BASE_PERCEPTION_POLICY.creditSeconds)
      : BASE_PERCEPTION_POLICY.familiarityMatureSeconds);
  return commitObserverIdentity(world, observerId, previous.individualId, identity);
}
function familiaritySupport(
  world: WorldState,
  observerId: string,
  identity: ObserverIdentity,
): string[] | undefined {
  const candidate = cloneValue(identity),
    state = candidate.familiarity;
  if (!state) return [];
  if ((state.authored?.value ?? 0) >= Math.min(6, individualFamiliarity(identity)))
    return state.authored ? [state.authored.source] : [];
  const selected = [...state.roots]
    .filter((root) => root.credited)
    .sort(
      (a, b) =>
        Number(b.required) - Number(a.required) ||
        a.at - b.at ||
        a.order - b.order ||
        a.key.localeCompare(b.key),
    )
    .slice(0, Math.min(6, state.roots.length));
  const promoted: string[] = [];
  for (const source of recognitionSupportSources(selected.flatMap((root) => root.support))) {
    const supports = world.experience?.temporal?.actors[observerId]?.supports ?? {};
    const capsule =
      'family' in source && isTemporalReceiptSource(source)
        ? supports[source.id]
        : !('family' in source)
          ? Object.values(supports).find((value) => value.receipt.sourceIds.includes(source.id))
          : undefined;
    if (!capsule) continue;
    const id = capsule.receipt.id;
    if (promoted.includes(id)) continue;
    if (capsule?.required) continue;
    if (
      !setTemporalSupportRequired(
        world,
        observerId,
        id,
        true,
        BASE_ATTENTION_POLICY.retention.required,
      )
    ) {
      for (const id of promoted)
        setTemporalSupportRequired(
          world,
          observerId,
          id,
          false,
          BASE_ATTENTION_POLICY.retention.optional,
        );
      return undefined;
    }
    promoted.push(id);
  }
  for (const root of selected) root.required = true;
  if (
    candidate.individualId &&
    !commitObserverIdentity(world, observerId, candidate.individualId, candidate)
  ) {
    for (const id of promoted)
      setTemporalSupportRequired(
        world,
        observerId,
        id,
        false,
        BASE_ATTENTION_POLICY.retention.optional,
      );
    return undefined;
  }
  return [...new Set(selected.flatMap((root) => root.support))];
}
/** A received body/voice association can reconcile two previously separate local
 * accounts. Every transferred point keeps that exact association as revocable
 * support. Simultaneous modalities never manufacture extra contact credit. */
export function associateIndividualFamiliarity(
  world: WorldState,
  from: ObserverIdentity,
  to: ObserverIdentity,
  associationSupport: string,
): void {
  if (from === to || !from.familiarity || !validRecognitionSupportKey(associationSupport)) return;
  const target = (to.familiarity ??= { roots: [], fastCredits: 0 });
  const pool = new Map(target.roots.map((root) => [root.key, root]));
  for (const root of from.familiarity.roots) {
    if (pool.has(root.key)) continue;
    const support = [...new Set([...root.support, associationSupport])];
    if (support.length > 10) continue; // Optional proof cannot exceed its admitted bounded capsule.
    pool.set(root.key, { ...cloneValue(root), support, required: false });
  }
  const chronological = [...pool.values()].sort(
    (a, b) =>
      a.at - b.at ||
      Number(b.required) - Number(a.required) ||
      a.order - b.order ||
      a.key.localeCompare(b.key),
  );
  let count = 0,
    last: number | undefined;
  // Previously protected points already support actual recognition results.
  // Reconcile new optional contacts around those points; an overlapping earlier
  // local account cannot displace them and demand another protected six.
  for (const root of [
    ...chronological.filter((value) => value.required),
    ...chronological.filter((value) => !value.required),
  ]) {
    const quantum =
      count < 6
        ? normalSpeedSeconds(world, BASE_PERCEPTION_POLICY.creditSeconds)
        : BASE_PERCEPTION_POLICY.familiarityMatureSeconds;
    root.credited = last === undefined || root.at >= last + quantum;
    if (root.credited) {
      last = root.at;
      count++;
    }
  }
  target.roots = retainFamiliarity(chronological);
  target.fastCredits = Math.max(
    target.fastCredits,
    from.familiarity.fastCredits,
    Math.min(6, count),
  );
  const lastCredit = Math.max(
    target.lastCreditAt ?? -Infinity,
    from.familiarity.lastCreditAt ?? -Infinity,
    last ?? -Infinity,
  );
  if (Number.isFinite(lastCredit)) target.lastCreditAt = lastCredit;
  const nextCredit = Math.max(
    target.nextCreditAt ?? -Infinity,
    from.familiarity.nextCreditAt ?? -Infinity,
    last === undefined
      ? -Infinity
      : last +
          (target.fastCredits < 6
            ? normalSpeedSeconds(world, BASE_PERCEPTION_POLICY.creditSeconds)
            : BASE_PERCEPTION_POLICY.familiarityMatureSeconds),
  );
  if (Number.isFinite(nextCredit)) target.nextCreditAt = nextCredit;
}
function creditContactSample(
  world: WorldState,
  observerId: string,
  identity: ObserverIdentity,
  sample: RecognitionSample,
): void {
  if (!identity.individualId || !sample.contactEligible) return;
  // The immutable personal acquisition already owns its recognition dependencies.
  // Do not recursively flatten the entire predecessor graph into each contact.
  creditSubjectFamiliarity(
    world,
    observerId,
    { kind: 'individual', individualId: identity.individualId },
    {
      key: JSON.stringify(['contact', sample.sourceKey, sample.at]),
      sourceKey: sample.sourceKey,
      at: sample.at,
      order: sample.order,
      support: [sample.sourceKey],
    },
  );
}
const usable = (features: RecognitionFeatures) =>
  Object.keys(features).filter((dimension) => {
    const interval = features[dimension];
    return interval && interval.max - interval.min <= 400;
  });
const resolution = (features: RecognitionFeatures, dimensions = usable(features)) =>
  dimensions.length
    ? dimensions.reduce((sum, dimension) => {
        const interval = features[dimension]!;
        return sum + 1 - (interval.max - interval.min) / 1000;
      }, 0) / dimensions.length
    : 0;
export function validVoiceFeatures(value: unknown): value is VoiceFeatures {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === VOICE_DIMENSIONS.length &&
    VOICE_DIMENSIONS.every((dimension) => {
      const feature = (value as VoiceFeatures)[dimension];
      return Number.isInteger(feature) && feature >= 0 && feature <= 1000;
    })
  );
}
export function validRecognitionFeatures(value: unknown): value is RecognitionFeatures {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).every((dimension) => /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(dimension)) &&
    Object.values(value).every(
      (interval: { min?: number; max?: number }) =>
        interval &&
        Number.isFinite(interval.min) &&
        Number.isFinite(interval.max) &&
        interval.min! >= 0 &&
        interval.max! <= 1000 &&
        interval.min! <= interval.max!,
    )
  );
}
/** Direct-path speech currently preserves supported timbre. Other physical sound
 * transformations must supply their surviving intervals, never the clean profile. */
export function receivedVoiceFeatures(profile: VoiceFeatures): RecognitionFeatures {
  return Object.fromEntries(
    VOICE_DIMENSIONS.map((dimension) => [
      dimension,
      { min: profile[dimension], max: profile[dimension] },
    ]),
  );
}
export function effectivePerception(world: WorldState, observerId: string): number | undefined {
  const observer = entityGet(world.entities, observerId);
  const attributeId = observer?.actor?.individualRecognition?.attributeId;
  if (!observer || !attributeId) return undefined;
  const definition = world.moduleManifest.definitions.find((value) => value.id === attributeId);
  const value = definition && readAttribute(world, observer, definition);
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100)
    throw new Error('Installed individual recognition requires current Perception in 0–100.');
  return value;
}
const sampleRank = (a: RecognitionSample, b: RecognitionSample) =>
  b.quality - a.quality ||
  usable(b.features).length - usable(a.features).length ||
  a.at - b.at ||
  a.order - b.order ||
  a.key.localeCompare(b.key);
function retainSamples(samples: RecognitionSample[]): RecognitionSample[] {
  const ranked = [...samples].sort(sampleRank),
    result: RecognitionSample[] = [],
    encounters = new Set<string>();
  for (const sample of ranked) {
    if (encounters.has(sample.encounter)) continue;
    result.push(sample);
    encounters.add(sample.encounter);
    if (result.length === BASE_PERCEPTION_POLICY.retainedCredits) return result;
  }
  for (const sample of ranked) {
    if (result.includes(sample)) continue;
    result.push(sample);
    if (result.length === BASE_PERCEPTION_POLICY.retainedCredits) break;
  }
  return result;
}
interface Exemplar {
  features: RecognitionFeatures;
  quality: number;
  at: number;
  order: number;
  key: string;
  authored: boolean;
  sourceKey: string;
}
function exemplars(voice: RecognitionKnowledge): Exemplar[] {
  const pool: Exemplar[] = [
    ...(voice.authored?.exemplars.map((sample) => ({
      ...sample,
      at: voice.authored!.installedAt,
      order: sample.ordinal,
      key: voice.authored!.source,
      sourceKey: voice.authored!.source,
      authored: true,
    })) ?? []),
    ...voice.samples.map((sample) => ({ ...sample, authored: false })),
  ];
  const result: Exemplar[] = [],
    covered = new Set<string>();
  while (pool.length && result.length < BASE_PERCEPTION_POLICY.matchingExemplars) {
    const added = (sample: Exemplar) =>
      usable(sample.features).filter((dimension) => !covered.has(dimension)).length;
    pool.sort(
      (a, b) =>
        added(b) - added(a) ||
        b.quality - a.quality ||
        usable(b.features).length - usable(a.features).length ||
        a.at - b.at ||
        Number(b.authored) - Number(a.authored) ||
        a.order - b.order ||
        a.key.localeCompare(b.key),
    );
    const selected = pool.shift()!;
    result.push(selected);
    usable(selected.features).forEach((dimension) => covered.add(dimension));
  }
  return result;
}
function compare(current: RecognitionSample, remembered: Exemplar) {
  const dimensions = usable(current.features).filter((dimension) =>
    usable(remembered.features).includes(dimension),
  );
  const distance = dimensions.length
    ? dimensions.reduce((sum, dimension) => {
        const a = current.features[dimension]!,
          b = remembered.features[dimension]!;
        return sum + Math.abs((a.min + a.max - b.min - b.max) / 2) / 1000;
      }, 0) / dimensions.length
    : Infinity;
  return {
    distance,
    dimensions: dimensions.length,
    quality: Math.min(
      current.quality,
      remembered.quality,
      resolution(current.features, dimensions),
      resolution(remembered.features, dimensions),
    ),
  };
}
const localSubject = (identity: ObserverIdentity): ObserverSubject => ({
  kind: 'individual',
  individualId: identity.individualId!,
});
function addCredit(
  world: WorldState,
  voice: RecognitionKnowledge,
  sample: RecognitionSample,
): boolean {
  if (
    voice.samples.some((prior) => prior.key === sample.key) ||
    (voice.nextCreditAt !== undefined && sample.at < voice.nextCreditAt)
  )
    return false;
  voice.samples = retainSamples([...voice.samples, cloneValue(sample)]);
  voice.lastCreditAt = sample.at;
  voice.nextCreditAt = sample.at + normalSpeedSeconds(world, BASE_PERCEPTION_POLICY.creditSeconds);
  return true;
}
/** Called only while the actual utterance is committed. The full observer-owned
 * bounded exemplar set is examined before asserting an unambiguous match. */
function perceiveIndividual(
  world: WorldState,
  observerId: string,
  event: Pick<WorldEvent, 'id' | 'at' | 'order' | 'sequence'> & { targetId?: string },
  features: RecognitionFeatures,
  quality: number,
  modality: RecognitionModality,
  visibleSourceId?: string,
  bodySupport?: import('../../perception-evidence.js').ObservationFactKey,
): IndividualRecognition {
  const perception = effectivePerception(world, observerId);
  quality = Math.min(quality, resolution(features));
  const result: IndividualRecognition = {
    recognized: false,
    candidates: [],
    moreCandidates: false,
    quality,
  };
  if (perception === undefined) return result;
  expireRecognitionSeeds(world, observerId);
  const records = ((world.observerIdentities ??= {})[observerId] ??= {});
  const sample: RecognitionSample = {
    key: JSON.stringify([modality, event.id]),
    sourceKey:
      modality === 'sight' && bodySupport
        ? JSON.stringify(bodySupport.source)
        : `awareness:${event.id}`,
    at: event.at,
    order: event.order ?? event.sequence,
    encounter:
      (visibleSourceId && world.perceptionEpisodes?.[observerId]?.[visibleSourceId]) ||
      `utterance:${event.id}`,
    features: cloneValue(features),
    quality,
    perception,
    policy: JSON.stringify([
      BASE_PERCEPTION_POLICY.id,
      BASE_PERCEPTION_POLICY.version,
      definitionPin(
        world.moduleManifest.definitions.find(
          (definition) =>
            definition.id ===
            entityGet(world.entities, observerId)!.actor!.individualRecognition!.attributeId,
        )!,
      ),
    ]),
    support: [
      ...(modality === 'voice' ? [`awareness:${event.id}`] : []),
      ...(bodySupport ? [JSON.stringify(bodySupport)] : []),
    ],
    contactEligible:
      event.targetId === observerId ||
      !!(
        visibleSourceId &&
        world.perceptionEvidence?.[observerId]?.attention?.entries.some(
          (entry) => entry.sourceId === visibleSourceId,
        )
      ),
  };
  result.perception = perception;
  result.policy = sample.policy;
  if (bodySupport) result.learningSupport = [JSON.stringify(bodySupport)];
  const p = perception / 100;
  const candidates: {
    identity: ObserverIdentity;
    distance: number;
    quality: number;
    exemplarKey: string;
    sourceKey: string;
  }[] = [];
  const recognized: typeof candidates = [];
  for (const identity of Object.values(records)) {
    const voice = identity[modality];
    if (!identity.individualId || identity.seedOnly || !voice) continue;
    const minimum = modality === 'sight' ? 1 : 2;
    const equivalent = voice.authored ? (voice.authored.baseline === 'familiar' ? 6 : minimum) : 0;
    const learned = Math.max(equivalent, voice.samples.length) >= minimum;
    const familiarity = Math.min(1, individualFamiliarity(identity) / 6);
    if (!learned) continue;
    let candidate: (typeof candidates)[number] | undefined,
      reliable: (typeof candidates)[number] | undefined;
    for (const exemplar of exemplars(voice)) {
      const match = compare(sample, exemplar);
      if (match.dimensions < 2 || match.quality < 0.2 || match.distance > 0.3) continue;
      const entry = {
        identity,
        distance: match.distance,
        quality: match.quality,
        exemplarKey: exemplar.key,
        sourceKey: exemplar.sourceKey,
      };
      if (!candidate || entry.distance < candidate.distance) candidate = entry;
      if (
        learned &&
        match.dimensions >= 3 &&
        match.quality >= 0.7 - 0.2 * p - 0.15 * familiarity &&
        match.distance <= 0.08 + 0.04 * p + 0.04 * familiarity &&
        (!reliable ||
          entry.distance < reliable.distance ||
          (entry.distance === reliable.distance && entry.quality > reliable.quality))
      )
        reliable = entry;
    }
    if (candidate) candidates.push(candidate);
    if (reliable) recognized.push(reliable);
  }
  const rank = (a: (typeof candidates)[number], b: (typeof candidates)[number]) =>
    a.distance - b.distance ||
    b.quality - a.quality ||
    a.identity.individualId!.localeCompare(b.identity.individualId!);
  candidates.sort(rank);
  recognized.sort(rank);
  result.candidates = candidates
    .slice(0, 2)
    .map((entry) => ({ individualId: entry.identity.individualId!, distance: entry.distance }));
  result.moreCandidates = candidates.length > 2;
  const winner = recognized[0];
  if (
    winner &&
    candidates.every(
      (entry) => entry.identity === winner.identity || entry.distance - winner.distance >= 0.08,
    )
  ) {
    const proof = familiaritySupport(world, observerId, winner.identity);
    if (
      proof !== undefined ||
      (winner.quality >= 0.7 - 0.2 * p && winner.distance <= 0.08 + 0.04 * p)
    ) {
      result.recognized = true;
      result.subject = localSubject(winner.identity);
      result.priorExemplarKey = winner.exemplarKey;
      result.familiarity = proof === undefined ? 0 : individualFamiliarity(winner.identity);
      result.learningSupport = [
        ...new Set([
          winner.sourceKey,
          ...(bodySupport ? [JSON.stringify(bodySupport)] : []),
          ...(proof ?? []),
        ]),
      ];
      sample.support.push(...result.learningSupport);
    }
  }
  // Only real, qualifying original samples can change familiarity. Prior evidence
  // remains available through the existing personal-history source owner.
  if (quality < 0.55 || usable(features).length < 3) return result;
  if (
    Object.values(records).some((identity) =>
      identity[modality]?.samples.some((prior) => prior.key === sample.key),
    )
  )
    return result;
  let associated =
    result.subject?.kind === 'individual' ? records[result.subject.individualId] : undefined;
  if (!associated && visibleSourceId) {
    associated = Object.values(records).find(
      (identity) =>
        !identity.seedOnly &&
        !identity.authored &&
        !!identity.encounterId &&
        identity.encounterId === world.perceptionEpisodes?.[observerId]?.[visibleSourceId],
    );
    if (!associated) {
      const individualId = allocateObserverIndividual(world, observerId);
      associated = records[individualId] = {
        individualId,
        givenName: '',
        revision: 1,
        encounterId: world.perceptionEpisodes?.[observerId]?.[visibleSourceId] ?? null,
        authored: false,
      };
    }
  }
  if (associated) {
    const candidate = cloneValue(associated);
    const voice = (candidate[modality] ??= { samples: [] });
    if (addCredit(world, voice, sample)) {
      candidate.revision++;
      if (
        candidate.individualId &&
        !commitObserverIdentity(world, observerId, candidate.individualId, candidate)
      )
        return result;
    }
    creditContactSample(world, observerId, associated, sample);
    // A visible body legitimately supports this voice sample; one sample alone
    // does not turn the voice into a learned modality.
    result.learnedSubject = localSubject(associated);
    return result;
  }
  if (modality === 'sight') return result;
  const seeds = Object.values(records).filter(
    (identity) =>
      (identity.seedOnly || (!identity.voice?.authored && identity.voice?.samples.length === 1)) &&
      identity.voice?.samples.some(
        (prior) =>
          prior.at > sample.at - normalSpeedSeconds(world, BASE_PERCEPTION_POLICY.seedSeconds),
      ),
  );
  const seedMatches = seeds
    .flatMap((identity) => {
      const matches = identity
        .voice!.samples.map((prior) => ({
          prior,
          ...compare(sample, { ...prior, authored: false }),
        }))
        .filter((match) => match.dimensions >= 3 && match.quality >= 0.55 && match.distance <= 0.3)
        .sort((a, b) => a.distance - b.distance || a.prior.at - b.prior.at);
      return matches[0] ? [{ identity, ...matches[0] }] : [];
    })
    .sort((a, b) => a.distance - b.distance || a.prior.key.localeCompare(b.prior.key));
  const seed = seedMatches[0];
  const unique =
    seed &&
    seed.distance <= 0.1 &&
    seedMatches.every(
      (other) => other.identity === seed.identity || other.distance - seed.distance >= 0.08,
    ) &&
    candidates.every(
      (other) => other.identity === seed.identity || other.distance - seed.distance >= 0.08,
    );
  if (unique)
    result.seedCorrelation = {
      sampleKey: seed.prior.key,
      ...(seed.identity.individualId ? { individualId: seed.identity.individualId } : {}),
    };
  if (
    unique &&
    sample.at - seed.prior.at >= normalSpeedSeconds(world, BASE_PERCEPTION_POLICY.creditSeconds)
  ) {
    result.learningSupport = [seed.prior.sourceKey];
    sample.support.push(seed.prior.sourceKey);
    const individualId =
      seed.identity.individualId ?? allocateObserverIndividual(world, observerId);
    const identity: ObserverIdentity = seed.identity.individualId
      ? cloneValue(seed.identity)
      : {
          individualId,
          givenName: seed.identity.givenName,
          nameEvidenceIds: [...(seed.identity.nameEvidenceIds ?? [])],
          revision: 1,
          encounterId: null,
          authored: false,
          voice: { samples: [] },
        };
    if (!identity.voice!.samples.length) addCredit(world, identity.voice!, seed.prior);
    addCredit(world, identity.voice!, sample);
    if (!commitObserverIdentity(world, observerId, individualId, identity)) return result;
    creditContactSample(world, observerId, identity, seed.prior);
    creditContactSample(world, observerId, identity, sample);
    if (seed.identity.seedOnly)
      for (const [key, prior] of Object.entries(records))
        if (prior === seed.identity) {
          if (prior.retained && !prior.authored)
            adjustRetainedKnowledgeAccounting(world, observerId, prior, undefined);
          delete records[key];
        }
    result.learnedSubject = localSubject(identity);
    advanceKnowledgeRevision(world, observerId);
  } else if (!unique) {
    // Never fuse seed groups merely because hidden producers happen to be equal.
    commitObserverIdentity(world, observerId, `voice-seed-${event.id}`, {
      givenName: '',
      revision: 0,
      encounterId: null,
      authored: false,
      seedOnly: true,
      voice: { samples: [sample] },
    });
  }
  return result;
}
export function recognitionMaintenanceDue(world: WorldState, observerId: string): number | null {
  let due = Infinity;
  for (const identity of Object.values(world.observerIdentities?.[observerId] ?? {}))
    due = Math.min(due, recognitionSeedDeadline(world, identity) ?? Infinity);
  return Number.isFinite(due) ? due : null;
}
export function recognitionSeedDeadline(
  world: WorldState,
  identity: ObserverIdentity,
): number | null {
  return identity.seedOnly && identity.voice?.samples.length
    ? Math.max(...identity.voice.samples.map((sample) => sample.at)) +
        normalSpeedSeconds(world, BASE_PERCEPTION_POLICY.seedSeconds)
    : null;
}
export function expireRecognitionSeeds(world: WorldState, observerId: string): number {
  let removed = 0;
  const duration = normalSpeedSeconds(world, BASE_PERCEPTION_POLICY.seedSeconds);
  for (const [key, identity] of Object.entries(world.observerIdentities?.[observerId] ?? {}))
    if (
      identity.seedOnly &&
      identity.voice?.samples.every((sample) => sample.at + duration <= world.simTime)
    ) {
      retireRecognitionIdentity(world, observerId, key, identity);
      removed++;
    }
  return removed;
}
export function retireRecognitionIdentity(
  world: WorldState,
  observerId: string,
  key: string,
  identity: ObserverIdentity,
): void {
  if (identity.retained && !identity.authored)
    adjustRetainedKnowledgeAccounting(world, observerId, identity, undefined);
  delete world.observerIdentities![observerId]![key];
  for (const source of recognitionSupportSources(identity.nameEvidenceIds ?? []))
    if ('family' in source && isTemporalReceiptSource(source))
      releaseTemporalSupport(world, observerId, source.id);
}
/** Source accounting follows actual delivery: provisional matching may happen
 * before the common speech receipt exists, but lasting profiles keep only the
 * received features and association proof from that same observation. */
export function retainRecognitionEvidence(
  world: WorldState,
  evidence: import('../../experience.js').Awareness,
): void {
  if (!evidence.observation || !evidence.recognition) return;
  const observerId = evidence.actorId,
    records = world.observerIdentities?.[observerId];
  if (!records) return;
  const subjects = [evidence.recognition.subject, evidence.recognition.learnedSubject];
  const ids = new Set(
    subjects.flatMap((subject) => (subject?.kind === 'individual' ? [subject.individualId] : [])),
  );
  const seedKey = `voice-seed-${evidence.eventId}`;
  if (records[seedKey]) ids.add(seedKey);
  for (const key of ids) {
    const prior = records[key];
    if (!prior) continue;
    const modalities = (['voice', 'sight'] as const).filter((modality) =>
      prior[modality]?.samples.some(
        (sample) => sample.sourceKey === `awareness:${evidence.eventId}`,
      ),
    );
    if (!modalities.length) continue;
    let receipt = temporalReceiptForSource(world, observerId, evidence.eventId);
    if (!receipt)
      receipt = captureTemporalObservation(
        world,
        observerId,
        evidence.observation,
        [evidence.eventId],
        false,
        BASE_ATTENTION_POLICY.retention.recent,
      );
    const ordinals = evidence.observation.facets
      .filter(
        (facet) => facet.value.kind === 'perceived-feature' || facet.value.kind === 'association',
      )
      .map((facet) => facet.ordinal);
    const held =
      receipt &&
      retainTemporalSupport(world, receipt, {
        facetOrdinals: ordinals,
        ...BASE_ATTENTION_POLICY.retention.optional,
      });
    if (held) continue;
    const candidate = cloneValue(prior);
    for (const modality of modalities)
      candidate[modality]!.samples = candidate[modality]!.samples.filter(
        (sample) => sample.sourceKey !== `awareness:${evidence.eventId}`,
      );
    if (candidate.individualId) commitObserverIdentity(world, observerId, key, candidate);
    else retireRecognitionIdentity(world, observerId, key, prior);
  }
}
/** Current direct-path voice adapter; physical hearing supplies the actual margin. */
export function perceiveVoice(
  world: WorldState,
  observerId: string,
  event: WorldEvent,
  features: RecognitionFeatures,
  clarityMarginDb: number,
  visibleSourceId?: string,
  bodySupport?: ObservationFactKey,
): IndividualRecognition {
  return perceiveIndividual(
    world,
    observerId,
    event,
    features,
    Math.max(0, Math.min(1, (clarityMarginDb - 3) / 12)),
    'voice',
    visibleSourceId,
    bodySupport,
  );
}
/** Vision's future physical provider must supply received dimensions and the exact
 * already acquired body proof. Seeing an entity alone never supplies these values. */
export function perceiveVisualFeatures(
  world: WorldState,
  observerId: string,
  observation: import('../../perception-evidence.js').ObservationContribution,
  visibleSourceId: string,
  bodySupport: import('../../perception-evidence.js').ObservationFactKey,
  featureSupport: import('../../perception-evidence.js').ObservationFactKey,
): IndividualRecognition {
  const owns = (key: import('../../perception-evidence.js').ObservationFactKey) =>
    key.source.family === 'native-exposure' &&
    key.source.observer.actorId === observerId &&
    key.source.observer.physicalLife === observation.observer.physicalLife &&
    key.source.id === observation.id &&
    key.source.revision === observation.revision;
  const features = observation.facets.find((facet) => facet.ordinal === featureSupport.ordinal);
  if (
    observation.modality !== 'sight' ||
    observation.observer.actorId !== observerId ||
    !owns(bodySupport) ||
    !owns(featureSupport) ||
    !observation.facets.some(
      (facet) => facet.ordinal === bodySupport.ordinal && facet.value.kind === 'body',
    ) ||
    features?.value.kind !== 'perceived-feature' ||
    features.value.sample.modality !== 'sight'
  )
    throw new Error(
      'Visual learning requires its exact acquired body and received feature support.',
    );
  return perceiveIndividual(
    world,
    observerId,
    {
      id: observation.id,
      at: features.acquiredAt,
      sequence:
        observation.origin.kind === 'occurrence'
          ? observation.origin.order
          : featureSupport.ordinal,
    },
    features.value.sample.features,
    features.value.sample.quality,
    'sight',
    visibleSourceId,
    bodySupport,
  );
}
/** Authored acquaintance is explicit starting knowledge, never a forged observation. */
export function installAuthoredVoice(
  world: WorldState,
  observerId: string,
  identity: ObserverIdentity,
  sourceId: string,
): void {
  const profile = entityGet(world.entities, sourceId)?.actor?.voiceProfile;
  if (!profile) return;
  identity.voice = {
    samples: [],
    authored: {
      source: JSON.stringify([
        'authored-acquaintance',
        sourceId,
        BASE_PERCEPTION_POLICY.id,
        BASE_PERCEPTION_POLICY.version,
      ]),
      installedAt: world.simTime,
      order: Object.keys(world.observerIdentities?.[observerId] ?? {}).length,
      baseline: 'familiar',
      exemplars: [{ features: receivedVoiceFeatures(profile), quality: 1, ordinal: 0 }],
    },
  };
  identity.familiarity = {
    roots: [],
    fastCredits: 0,
    authored: { source: identity.voice.authored!.source, value: 100 },
  };
}
/** Current persisted roots must identify a supported real source or the selected
 * authored installation; arbitrary strings cannot silently evade revocation. */
export function validRecognitionSupportKey(key: unknown): key is string {
  if (typeof key !== 'string' || !key) return false;
  const personal = /^(awareness|memory|summary):(.+)$/su.exec(key);
  if (personal) return isSafeRecordId(personal[2]);
  try {
    const value = JSON.parse(key);
    if (Array.isArray(value))
      return (
        value.length === 4 &&
        value[0] === 'authored-acquaintance' &&
        isSafeRecordId(value[1]) &&
        value[2] === BASE_PERCEPTION_POLICY.id &&
        value[3] === BASE_PERCEPTION_POLICY.version
      );
    if (!value || typeof value !== 'object') return false;
    const fact = 'source' in value;
    if (
      fact &&
      (Object.keys(value).length !== 2 || !Number.isSafeInteger(value.ordinal) || value.ordinal < 0)
    )
      return false;
    const source = fact ? value.source : value;
    validateEvidenceSource(source);
    return source.family === 'native-exposure' || source.family === 'native-response';
  } catch {
    return false;
  }
}
export type RecognitionSupportSource =
  | { kind: 'awareness' | 'memory' | 'summary'; id: string }
  | EvidenceSource;
/** Original immediate roots live on their exact source interpretation. This parser
 * shares those roots with the existing personal-history reverse dependency index. */
export function recognitionSupportSources(keys: readonly string[]): RecognitionSupportSource[] {
  return keys.flatMap((key): RecognitionSupportSource[] => {
    const personal = /^(awareness|memory|summary):(.+)$/su.exec(key);
    if (personal)
      return [{ kind: personal[1] as 'awareness' | 'memory' | 'summary', id: personal[2]! }];
    try {
      const value = JSON.parse(key);
      const source =
        value && typeof value === 'object' && !Array.isArray(value) && 'source' in value
          ? value.source
          : value;
      if (!source || typeof source !== 'object' || Array.isArray(source)) return [];
      validateEvidenceSource(source);
      return [source];
    } catch {
      return [];
    }
  });
}
export const recognitionSupportSourceIds = (keys: readonly string[]): string[] =>
  recognitionSupportSources(keys).map((source) => source.id);

/** Remove only support revoked through the personal-history dependency closure.
 * Exact prior-source edges survive in original accounts after exemplar eviction. */
export function revokeRecognitionEvidence(
  world: WorldState,
  actorId: string,
  affected: Set<string>,
): void {
  const recordMap = world.observerIdentities?.[actorId];
  const entries = Object.entries(recordMap ? readOnlyDraftView(recordMap) : {}).map(
    ([key, identity]) => [key, readOnlyDraftView(identity)] as const,
  );
  const keyByIdentity = new Map(entries.map(([key, identity]) => [identity, key]));
  const records = entries.map(([, identity]) => identity);
  const revoked = (keys: readonly string[]) =>
    keys.some((key) => affected.has(key)) ||
    recognitionSupportSourceIds(keys).some(
      (id) =>
        affected.has(id) ||
        affected.has(`awareness:${id}`) ||
        affected.has(`memory:${id}`) ||
        affected.has(`summary:${id}`),
    );
  // Resident samples provide the same immediate edges. Cold predecessors are
  // supplied by the existing source dependency preparation before this mutation.
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const identity of records)
      for (const root of identity.familiarity?.roots ?? [])
        if (revoked(root.support) && !affected.has(root.sourceKey)) {
          affected.add(root.sourceKey);
          for (const id of recognitionSupportSourceIds([root.sourceKey])) affected.add(id);
          expanded = true;
        }
    for (const identity of records)
      for (const modality of ['voice', 'sight'] as const)
        for (const sample of identity[modality]?.samples ?? [])
          if (revoked(sample.support) && !affected.has(sample.sourceKey)) {
            affected.add(sample.sourceKey);
            for (const id of recognitionSupportSourceIds([sample.sourceKey])) affected.add(id);
            expanded = true;
          }
  }
  let changed = false;
  for (const original of records) {
    const hasAffected =
      original.familiarity?.roots.some((root) => revoked(root.support)) ||
      (original.familiarity?.authored && revoked([original.familiarity.authored.source])) ||
      (original.nameEvidenceIds && revoked(original.nameEvidenceIds)) ||
      (['voice', 'sight'] as const).some(
        (modality) =>
          original[modality]?.samples.some((sample) => revoked(sample.support)) ||
          (original[modality]?.authored && affected.has(original[modality]!.authored!.source)),
      );
    if (!hasAffected) continue;
    const identity = cloneValue(original);
    let identityChanged = false;
    if (identity.familiarity) {
      const remaining = identity.familiarity.roots.filter((root) => !revoked(root.support));
      if (remaining.length !== identity.familiarity.roots.length) {
        identity.familiarity.roots = remaining;
        identityChanged = true;
      }
      if (identity.familiarity.authored && revoked([identity.familiarity.authored.source])) {
        identity.familiarity.authored = undefined;
        identityChanged = true;
      }
    }
    for (const modality of ['voice', 'sight'] as const) {
      const knowledge = identity[modality];
      if (!knowledge) continue;
      const remaining = knowledge.samples.filter((sample) => !revoked(sample.support));
      const revokedAuthored = knowledge.authored && affected.has(knowledge.authored.source);
      if (remaining.length === knowledge.samples.length && !revokedAuthored) continue;
      knowledge.samples = retainSamples(remaining);
      if (revokedAuthored) knowledge.authored = undefined;
      // An invalidated sample never resets its admitted last-credit/deadline.
      identityChanged = true;
    }
    if (identity.nameEvidenceIds && revoked(identity.nameEvidenceIds)) {
      identity.givenName = '';
      identity.nameEvidenceIds = [];
      identityChanged = true;
    }
    if (!identityChanged) continue;
    if (identity.authored && !identity.voice?.authored && !identity.sight?.authored) {
      identity.authored = false;
      identity.canonicalId = undefined;
    }
    identity.revision++;
    const key = identity.individualId ?? keyByIdentity.get(original);
    if (key && identity.retained && !commitObserverIdentity(world, actorId, key, identity))
      throw new Error('Revoked recognition did not fit its prior personal allocation.');
    else if (key && !identity.retained) recordMap![key] = identity;
    changed = true;
  }
  if (changed) advanceKnowledgeRevision(world, actorId);
}
export function validateRecognition(world: WorldState): void {
  for (const entity of entityValues(world.entities)) {
    if (!entity?.actor) continue;
    if (
      entity.actor.capabilities?.comprehendsSpeech !== undefined &&
      typeof entity.actor.capabilities.comprehendsSpeech !== 'boolean'
    )
      throw new Error('Invalid installed linguistic comprehension capability.');
    if (entity.actor.voiceProfile && !validVoiceFeatures(entity.actor.voiceProfile))
      throw new Error('Invalid authored voice features.');
    if (entity.actor.individualRecognition) effectivePerception(world, entity.id);
  }
  for (const identities of Object.values(world.observerIdentities ?? {}))
    for (const identity of Object.values(identities)) {
      if (identity.individualId !== undefined && typeof identity.individualId !== 'string')
        throw new Error('Invalid local individual.');
      if (identity.familiarity !== undefined) {
        validateFamiliarityState(identity.familiarity);
        if (
          identity.familiarity.roots.some((root) => root.at > world.simTime) ||
          (identity.familiarity.lastCreditAt ?? 0) > world.simTime
        )
          throw new Error('Familiarity contact occurs after the saved world time.');
      }
      for (const modality of ['voice', 'sight'] as const) {
        const voice = identity[modality];
        if (!voice) continue;
        if (
          !Array.isArray(voice.samples) ||
          voice.samples.length > BASE_PERCEPTION_POLICY.retainedCredits ||
          new Set(voice.samples.map((sample) => sample.key)).size !== voice.samples.length ||
          voice.samples.some(
            (sample) =>
              !validRecognitionFeatures(sample.features) ||
              typeof sample.key !== 'string' ||
              !sample.key ||
              typeof sample.encounter !== 'string' ||
              !sample.encounter ||
              typeof sample.policy !== 'string' ||
              !sample.policy ||
              !validRecognitionSupportKey(sample.sourceKey) ||
              !recognitionSupportSources([sample.sourceKey]).length ||
              usable(sample.features).length < 3 ||
              !Array.isArray(sample.support) ||
              !sample.support.length ||
              sample.support.length > 64 ||
              sample.support.some((key) => !validRecognitionSupportKey(key)) ||
              typeof sample.contactEligible !== 'boolean' ||
              !Number.isFinite(sample.at) ||
              !Number.isFinite(sample.order) ||
              !Number.isFinite(sample.quality) ||
              sample.quality < 0.55 ||
              sample.quality > 1 ||
              sample.quality > resolution(sample.features) ||
              !Number.isFinite(sample.perception) ||
              sample.perception < 0 ||
              sample.perception > 100,
          ) ||
          (voice.lastCreditAt !== undefined &&
            (!Number.isFinite(voice.lastCreditAt) || voice.lastCreditAt < 0)) ||
          (voice.nextCreditAt !== undefined &&
            (!Number.isFinite(voice.nextCreditAt) ||
              voice.lastCreditAt === undefined ||
              voice.nextCreditAt < voice.lastCreditAt))
        )
          throw new Error('Invalid retained recognition samples.');
        if (
          voice.authored &&
          (!['learned', 'familiar'].includes(voice.authored.baseline) ||
            !Number.isFinite(voice.authored.installedAt) ||
            !Number.isSafeInteger(voice.authored.order) ||
            typeof voice.authored.source !== 'string' ||
            !voice.authored.source ||
            !voice.authored.exemplars.length ||
            voice.authored.exemplars.length > 4 ||
            voice.authored.exemplars.some(
              (sample) =>
                !validRecognitionFeatures(sample.features) ||
                !Number.isFinite(sample.quality) ||
                sample.quality < 0 ||
                sample.quality > resolution(sample.features),
            ) ||
            !voice.authored.exemplars.some(
              (sample) => usable(sample.features).length >= 3 && sample.quality >= 0.55,
            ))
        )
          throw new Error('Invalid authored recognition knowledge.');
      }
    }
}

/** Match only complete actually understood clauses. A gap cannot discard a
 * negation and turn part of an utterance into a positive danger warning. */
export function ordinaryWarningPlace(
  segments: readonly import('../../speech.js').SpeechSegment[],
): string | undefined {
  if (!segments.length || segments.some((segment) => segment.kind !== 'heard')) return undefined;
  const text = segments
    .map((segment) => (segment.kind === 'heard' ? segment.text : ''))
    .join(' ')
    .trim();
  const clauses = text
    .split(/[.!?;]+/u)
    .map((clause) => clause.trim())
    .filter(Boolean);
  if (clauses.length !== 1) return undefined;
  const match = /^(?:look out|watch out|danger) at (.+) now$/iu.exec(clauses[0]!);
  return match?.[1]?.trim() || undefined;
}

export function ordinaryWarningDurationSeconds(world: WorldState): number {
  return normalSpeedSeconds(world, BASE_PERCEPTION_POLICY.warningSeconds);
}

export function validateIndividualRecognition(
  value: unknown,
): asserts value is IndividualRecognition {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid recognition interpretation.');
  const result = value as IndividualRecognition;
  if (
    typeof result.recognized !== 'boolean' ||
    typeof result.moreCandidates !== 'boolean' ||
    !Number.isFinite(result.quality) ||
    result.quality < 0 ||
    result.quality > 1 ||
    !Array.isArray(result.candidates) ||
    result.candidates.length > 2 ||
    result.candidates.some(
      (candidate) =>
        !candidate ||
        typeof candidate.individualId !== 'string' ||
        !candidate.individualId ||
        !Number.isFinite(candidate.distance) ||
        candidate.distance < 0 ||
        candidate.distance > 1,
    ) ||
    (result.subject !== undefined && !validObserverSubject(result.subject)) ||
    (result.learnedSubject !== undefined && !validObserverSubject(result.learnedSubject)) ||
    (result.recognized && !result.subject) ||
    (result.perception !== undefined &&
      (!Number.isFinite(result.perception) || result.perception < 0 || result.perception > 100)) ||
    (result.policy !== undefined && typeof result.policy !== 'string') ||
    (result.priorExemplarKey !== undefined && typeof result.priorExemplarKey !== 'string') ||
    (result.learningSupport !== undefined &&
      (!Array.isArray(result.learningSupport) ||
        result.learningSupport.length > 62 ||
        result.learningSupport.some((key) => !validRecognitionSupportKey(key)))) ||
    (result.familiarity !== undefined &&
      (!Number.isInteger(result.familiarity) ||
        result.familiarity < 0 ||
        result.familiarity > 100)) ||
    (result.seedCorrelation !== undefined &&
      (!result.seedCorrelation ||
        typeof result.seedCorrelation.sampleKey !== 'string' ||
        (result.seedCorrelation.individualId !== undefined &&
          typeof result.seedCorrelation.individualId !== 'string')))
  )
    throw new Error('Invalid recognition interpretation.');
}

export function validateFamiliarityState(value: unknown): asserts value is FamiliarityState {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid subject familiarity.');
  const state = value as FamiliarityState;
  if (
    !Array.isArray(state.roots) ||
    state.roots.length > BASE_PERCEPTION_POLICY.familiarityRoots ||
    new Set(state.roots.map((root) => root.key)).size !== state.roots.length ||
    state.roots.filter((root) => root.required).length > 6 ||
    !Number.isSafeInteger(state.fastCredits) ||
    state.fastCredits < 0 ||
    state.fastCredits > 6 ||
    (state.lastCreditAt !== undefined &&
      (!Number.isFinite(state.lastCreditAt) || state.lastCreditAt < 0)) ||
    (state.nextCreditAt !== undefined &&
      (!Number.isFinite(state.nextCreditAt) ||
        state.lastCreditAt === undefined ||
        state.nextCreditAt < state.lastCreditAt)) ||
    (state.authored !== undefined &&
      (!validRecognitionSupportKey(state.authored.source) ||
        !Number.isInteger(state.authored.value) ||
        state.authored.value < 0 ||
        state.authored.value > 100))
  )
    throw new Error('Invalid subject familiarity.');
  for (const root of state.roots)
    if (
      !root ||
      !validRecognitionSupportKey(root.sourceKey) ||
      !recognitionSupportSources([root.sourceKey]).length ||
      !Number.isFinite(root.at) ||
      root.at < 0 ||
      root.key !== JSON.stringify(['contact', root.sourceKey, root.at]) ||
      !Number.isSafeInteger(root.order) ||
      root.order < 0 ||
      typeof root.required !== 'boolean' ||
      typeof root.credited !== 'boolean' ||
      (root.required && !root.credited) ||
      !Array.isArray(root.support) ||
      !root.support.includes(root.sourceKey) ||
      root.support.length > 10 ||
      root.support.some((key) => !validRecognitionSupportKey(key))
    )
      throw new Error('Invalid subject familiarity contact.');
}
