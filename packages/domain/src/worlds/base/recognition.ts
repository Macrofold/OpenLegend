import { entityGet, entityValues } from '../../entity-collection.js';
import { advanceKnowledgeRevision, type ObserverSubject } from '../../knowledge.js';
import { readAttribute, definitionPin } from '../../world-modules.js';
import type { WorldEvent, WorldState } from '../../types.js';
import type { ObserverIdentity } from './knowledge.js';
import { normalSpeedSeconds } from '../../simulation-time.js';

/** Selected fictional descriptors; never derived from an identity or rendering asset.
 * docs/worlds/base/perception-recognition.md#perceivable-signatures */
export const VOICE_DIMENSIONS = ['pitchRange', 'resonance', 'texture', 'rhythm'] as const;
export type VoiceDimension = (typeof VOICE_DIMENSIONS)[number];
export type VoiceFeatures = Record<VoiceDimension, number>;
export type RecognitionFeatures = Partial<Record<VoiceDimension, { min: number; max: number }>>;
export interface VoiceSample {
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
}
export interface AuthoredVoice {
  source: string;
  installedAt: number;
  order: number;
  baseline: 'learned' | 'familiar';
  exemplars: { features: RecognitionFeatures; quality: number; ordinal: number }[];
}
export interface VoiceKnowledge {
  samples: VoiceSample[];
  authored?: AuthoredVoice;
  lastCreditAt?: number;
  nextCreditAt?: number;
}
export interface VoiceRecognition {
  recognized: boolean;
  subject?: ObserverSubject;
  /** New learning is separate from the result computed from prior knowledge. */
  learnedSubject?: ObserverSubject;
  candidates: { individualId: string; distance: number }[];
  moreCandidates: boolean;
  quality: number;
}
export const BASE_PERCEPTION_POLICY = {
  id: 'wilderness:individual-recognition',
  version: 1,
  creditSeconds: 2,
  seedSeconds: 30,
  warningSeconds: 2,
  retainedCredits: 12,
  matchingExemplars: 4,
} as const;
const usable = (features: RecognitionFeatures) =>
  VOICE_DIMENSIONS.filter((dimension) => {
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
    Object.keys(value).every((dimension) =>
      VOICE_DIMENSIONS.includes(dimension as VoiceDimension),
    ) &&
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
const sampleRank = (a: VoiceSample, b: VoiceSample) =>
  b.quality - a.quality ||
  usable(b.features).length - usable(a.features).length ||
  a.at - b.at ||
  a.order - b.order ||
  a.key.localeCompare(b.key);
function retainSamples(samples: VoiceSample[]): VoiceSample[] {
  const ranked = [...samples].sort(sampleRank),
    result: VoiceSample[] = [],
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
}
function exemplars(voice: VoiceKnowledge): Exemplar[] {
  const pool: Exemplar[] = [
    ...(voice.authored?.exemplars.map((sample) => ({
      ...sample,
      at: voice.authored!.installedAt,
      order: sample.ordinal,
      key: voice.authored!.source,
      authored: true,
    })) ?? []),
    ...voice.samples.map((sample) => ({ ...sample, authored: false })),
  ];
  const result: Exemplar[] = [],
    covered = new Set<VoiceDimension>();
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
function compare(current: VoiceSample, remembered: Exemplar) {
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
function allocateIndividual(records: Record<string, ObserverIdentity>): string {
  let ordinal = 1;
  while (Object.hasOwn(records, `individual-${ordinal}`)) ordinal++;
  return `individual-${ordinal}`;
}
function addCredit(world: WorldState, voice: VoiceKnowledge, sample: VoiceSample): boolean {
  if (
    voice.samples.some((prior) => prior.key === sample.key) ||
    (voice.nextCreditAt !== undefined && sample.at < voice.nextCreditAt)
  )
    return false;
  voice.samples = retainSamples([...voice.samples, structuredClone(sample)]);
  voice.lastCreditAt = sample.at;
  voice.nextCreditAt = sample.at + normalSpeedSeconds(world, BASE_PERCEPTION_POLICY.creditSeconds);
  return true;
}
/** Called only while the actual utterance is committed. The full observer-owned
 * bounded exemplar set is examined before asserting an unambiguous match. */
export function perceiveVoice(
  world: WorldState,
  observerId: string,
  event: WorldEvent,
  features: RecognitionFeatures,
  clarityMarginDb: number,
  visibleSourceId?: string,
): VoiceRecognition {
  const perception = effectivePerception(world, observerId);
  const quality = Math.min(
    Math.max(0, Math.min(1, (clarityMarginDb - 3) / 12)),
    resolution(features),
  );
  const result: VoiceRecognition = {
    recognized: false,
    candidates: [],
    moreCandidates: false,
    quality,
  };
  if (perception === undefined) return result;
  const records = ((world.observerIdentities ??= {})[observerId] ??= {});
  const sample: VoiceSample = {
    key: JSON.stringify(['voice', event.id]),
    sourceKey: `awareness:${event.id}`,
    at: event.at,
    order: event.order ?? event.sequence,
    encounter:
      (visibleSourceId && world.perceptionEpisodes?.[observerId]?.[visibleSourceId]) ||
      `utterance:${event.id}`,
    features: structuredClone(features),
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
    support: [`awareness:${event.id}`],
  };
  const p = perception / 100;
  const candidates: { identity: ObserverIdentity; distance: number; quality: number }[] = [];
  const recognized: typeof candidates = [];
  for (const identity of Object.values(records)) {
    const voice = identity.voice;
    if (!identity.individualId || identity.seedOnly || !voice) continue;
    const equivalent = voice.authored ? (voice.authored.baseline === 'familiar' ? 6 : 2) : 0;
    const learned = Math.max(equivalent, voice.samples.length) >= 2;
    const familiarity = Math.min(1, Math.max(equivalent, voice.samples.length) / 6);
    let candidate: (typeof candidates)[number] | undefined,
      reliable: (typeof candidates)[number] | undefined;
    for (const exemplar of exemplars(voice)) {
      const match = compare(sample, exemplar);
      if (match.dimensions < 2 || match.quality < 0.2 || match.distance > 0.3) continue;
      const entry = { identity, distance: match.distance, quality: match.quality };
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
    result.recognized = true;
    result.subject = localSubject(winner.identity);
  }
  // Only real, qualifying original samples can change familiarity. Prior evidence
  // remains available through the existing personal-history source owner.
  if (quality < 0.55 || usable(features).length < 3) return result;
  if (
    Object.values(records).some((identity) =>
      identity.voice?.samples.some((prior) => prior.key === sample.key),
    )
  )
    return result;
  let associated =
    result.subject?.kind === 'individual' ? records[result.subject.individualId] : undefined;
  if (!associated && visibleSourceId) {
    associated = Object.values(records).find(
      (identity) =>
        !identity.seedOnly &&
        identity.canonicalId === visibleSourceId &&
        (identity.authored ||
          identity.encounterId === world.perceptionEpisodes?.[observerId]?.[visibleSourceId]),
    );
    if (!associated) {
      const individualId = allocateIndividual(records);
      associated = records[individualId] = {
        individualId,
        canonicalId: visibleSourceId,
        givenName: '',
        revision: 1,
        encounterId: world.perceptionEpisodes?.[observerId]?.[visibleSourceId] ?? null,
        authored: false,
      };
    }
  }
  if (associated) {
    const voice = (associated.voice ??= { samples: [] });
    if (addCredit(world, voice, sample)) {
      associated.revision++;
      advanceKnowledgeRevision(world, observerId);
    }
    // A visible body legitimately supports this voice sample; one sample alone
    // does not turn the voice into a learned modality.
    result.learnedSubject = localSubject(associated);
    return result;
  }
  const seeds = Object.values(records).filter(
    (identity) =>
      identity.seedOnly &&
      identity.voice?.samples.some(
        (prior) =>
          prior.at >= sample.at - normalSpeedSeconds(world, BASE_PERCEPTION_POLICY.seedSeconds),
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
    candidates.every((other) => other.distance - seed.distance >= 0.08);
  if (
    unique &&
    sample.at - seed.prior.at >= normalSpeedSeconds(world, BASE_PERCEPTION_POLICY.creditSeconds)
  ) {
    const individualId = allocateIndividual(records);
    const identity: ObserverIdentity = {
      individualId,
      givenName: seed.identity.givenName,
      revision: 1,
      encounterId: null,
      authored: false,
      voice: { samples: [] },
    };
    addCredit(world, identity.voice!, seed.prior);
    addCredit(world, identity.voice!, sample);
    records[individualId] = identity;
    for (const [key, prior] of Object.entries(records))
      if (prior === seed.identity) delete records[key];
    result.learnedSubject = localSubject(identity);
    advanceKnowledgeRevision(world, observerId);
  } else if (!unique) {
    // Never fuse seed groups merely because hidden producers happen to be equal.
    records[`voice-seed-${event.id}`] = {
      givenName: '',
      revision: 0,
      encounterId: null,
      authored: false,
      seedOnly: true,
      voice: { samples: [sample] },
    };
  }
  // Expired seed history is not resurrected by a subsequent memory query.
  for (const [key, identity] of Object.entries(records))
    if (
      identity.seedOnly &&
      identity.voice!.samples.every(
        (prior) =>
          prior.at < sample.at - normalSpeedSeconds(world, BASE_PERCEPTION_POLICY.seedSeconds),
      )
    )
      delete records[key];
  return result;
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
}
/** Conservative selected fallback: remove derived learning when exact sources are
 * corrected or forgotten. This cannot silently replace them from today's body. */
export function revokeRecognitionEvidence(
  world: WorldState,
  actorId: string,
  affected: Set<string>,
): void {
  let changed = false;
  for (const identity of Object.values(world.observerIdentities?.[actorId] ?? {})) {
    if (!identity.voice?.samples.some((sample) => sample.support.some((key) => affected.has(key))))
      continue;
    identity.voice.samples = [];
    // Keep the admitted credit deadline even when its sufficient supports retire.
    if (!identity.authored) {
      identity.givenName = '';
      identity.canonicalId = undefined;
    }
    identity.revision++;
    changed = true;
  }
  if (changed) advanceKnowledgeRevision(world, actorId);
}
export function validateRecognition(world: WorldState): void {
  for (const entity of entityValues(world.entities)) {
    if (!entity?.actor) continue;
    if (entity.actor.voiceProfile && !validVoiceFeatures(entity.actor.voiceProfile))
      throw new Error('Invalid authored voice features.');
    if (entity.actor.individualRecognition) effectivePerception(world, entity.id);
  }
  for (const identities of Object.values(world.observerIdentities ?? {}))
    for (const identity of Object.values(identities)) {
      if (identity.individualId !== undefined && typeof identity.individualId !== 'string')
        throw new Error('Invalid local individual.');
      const voice = identity.voice;
      if (!voice) continue;
      if (
        !Array.isArray(voice.samples) ||
        voice.samples.length > BASE_PERCEPTION_POLICY.retainedCredits ||
        new Set(voice.samples.map((sample) => sample.key)).size !== voice.samples.length ||
        voice.samples.some(
          (sample) =>
            !validRecognitionFeatures(sample.features) ||
            typeof sample.key !== 'string' ||
            typeof sample.sourceKey !== 'string' ||
            !Array.isArray(sample.support) ||
            sample.support.some((key) => typeof key !== 'string') ||
            !Number.isFinite(sample.at) ||
            !Number.isFinite(sample.order) ||
            !Number.isFinite(sample.quality) ||
            sample.quality < 0 ||
            sample.quality > 1 ||
            sample.quality > resolution(sample.features) ||
            !Number.isFinite(sample.perception) ||
            sample.perception < 0 ||
            sample.perception > 100,
        ) ||
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
