import type { ObserverSubject } from './knowledge.js';
import { validObserverSubject } from './knowledge.js';
import { isSafeRecordId } from './records.js';
import type { ExperienceEntry, MemoryRecord, WorldState } from './types.js';
import { selectedTemporalPolicy } from './world-composition.js';
import { temporalActorHistory } from './temporal-evidence.js';

export type ExperienceAccountClass = 'optional' | 'required' | 'speech';

export function accountClass(entry: ExperienceEntry): ExperienceAccountClass {
  const speech = entry.source === 'awareness' ? entry.value.speech :
    entry.source === 'memory' ? entry.value.evidence?.speech : undefined;
  if (speech && speech.perception !== 'seen' && speech.segments.some((segment) => segment.kind === 'heard')) return 'speech';
  if ((entry.source === 'memory' && (entry.value.obligation?.status === 'active' ||
      (entry.value.kind === 'commitment' && !entry.value.resolved))) || entry.value.retention?.required) return 'required';
  return 'optional';
}

export function encodedExperienceBytes(entry: ExperienceEntry): number {
  return encoder.encode(JSON.stringify(entry.value)).byteLength;
}

/** Bootstrap authored resident accounts once, before the first source mutation.
 * A cold repository load installs complete totals before trimming resident tails. */
export function ensureExperienceAccounting(world: WorldState, actorId: string): void {
  const actor = temporalActorHistory(world, actorId);
  if (!actor || actor.accounts) return;
  actor.accounts = { nextDue: null, optional: { bytes: 0, count: 0 }, required: { bytes: 0, count: 0 }, speech: { bytes: 0, count: 0 } };
  const add = (entry: ExperienceEntry) => {
    const account = actor.accounts![accountClass(entry)];
    account.bytes += encodedExperienceBytes(entry); account.count++;
    const due = experienceRetentionDue(world,entry);
    if (due !== null) actor.accounts!.nextDue = Math.min(actor.accounts!.nextDue ?? Infinity,due);
  };
  for (const value of world.experience?.awareness[actorId] ?? []) add({ source: 'awareness', value });
  for (const value of world.memories[actorId] ?? []) add({ source: 'memory', value });
  for (const value of world.experience?.summaries[actorId] ?? []) add({ source: 'summary', value });
  for (const capsule of Object.values(actor.supports ?? {})) {
    const account=actor.accounts[capsule.required?'required':'optional'];account.bytes+=capsule.bytes;account.count++;
  }
}

export function adjustExperienceAccounting(world: WorldState, actorId: string, entry: ExperienceEntry, delta: 1 | -1): void {
  ensureExperienceAccounting(world, actorId);
  const accounts = world.experience?.temporal?.actors[actorId]?.accounts;
  if (!accounts) return;
  const account = accounts[accountClass(entry)];
  const bytes = account.bytes + delta * encodedExperienceBytes(entry), count = account.count + delta;
  if (bytes < 0 || count < 0) throw new Error('Personal account retention counters underflowed.');
  account.bytes = bytes; account.count = count;
  const due = delta === 1 ? experienceRetentionDue(world,entry) : null;
  if (due !== null) accounts.nextDue = Math.min(accounts.nextDue ?? Infinity,due);
}

export function experienceRetentionDue(world: WorldState, entry: ExperienceEntry): number | null {
  const policy = selectedTemporalPolicy(world);
  if (entry.source === 'memory' && entry.value.impression)
    return entry.value.impression.weakened ? entry.value.impression.expiresAt : Math.min(entry.value.impression.weakenAt,entry.value.impression.expiresAt);
  if (accountClass(entry) === 'speech' || (entry.source === 'memory' &&
    (entry.value.obligation?.status === 'active' || (entry.value.kind === 'commitment' && !entry.value.resolved)))) return null;
  const at = entry.source === 'summary' ? entry.value.to : entry.value.at;
  return at + (accountClass(entry) === 'required' ? policy.aftermathSeconds : policy.recent.maxAgeSeconds);
}

export interface ExperienceRetention {
  reason: 'consequence' | 'learning' | 'deliberate' | 'interpretation';
  required?: boolean;
  receipt?: import('./temporal-evidence.js').TemporalReceiptLocator;
}

/** A retained recollection is explicitly weaker than an original or exact summary.
 * docs/projects/attention-and-scenes-tech-design.md#56-one-recording-boundary-and-lasting-retention
 */
export interface ImpressionProvenanceSpan {
  actorId: string;
  physicalLife: number;
  epoch: string;
  family: 'temporal-receipt';
  from: number;
  through: number;
}
export type ImpressionClaim =
  | {
      kind: 'occurrence';
      eventType: string;
      role: 'direct' | 'testimony' | 'inference';
      subject?: ObserverSubject;
    }
  | { kind: 'interpretation'; text: string };
export interface RememberedImpression {
  version: 1;
  from: number;
  through: number;
  claims: ImpressionClaim[];
  provenance: ImpressionProvenanceSpan[];
  reason: 'deliberate' | 'consequence' | 'learning' | 'interpretation';
  createdAt: number;
  reinforcedAt: number;
  weakenAt: number;
  expiresAt: number;
  weakened: boolean;
}
export interface ImpressionLimits {
  maxBytes: number;
  maxClaims: number;
  maxSpans: number;
  weakenAfterSeconds: number;
  expireAfterSeconds: number;
  reinforceIntervalSeconds: number;
}

export function createRememberedImpression(
  record: MemoryRecord,
  provenance: ImpressionProvenanceSpan[],
  now: number,
  limits: ImpressionLimits,
): MemoryRecord | undefined {
  if (!record.retention || !provenance.length || record.kind === 'commitment' || record.kind === 'impression') return;
  const claims: ImpressionClaim[] = [
    ...(record.eventType ? [{ kind: 'occurrence' as const, eventType: record.eventType,
      role: record.source === 'inferred' || record.source === 'self_thought' ? 'inference' as const : 'direct' as const }] : []),
    ...(record.summary.trim() ? [{ kind: 'interpretation' as const, text: record.summary }] : []),
  ];
  if (!claims.length) return;
  const impression: RememberedImpression = {
    version: 1, from: record.at, through: record.at, claims, provenance,
    reason: record.retention.reason, createdAt: now, reinforcedAt: now,
    weakenAt: now + limits.weakenAfterSeconds, expiresAt: now + limits.expireAfterSeconds,
    weakened: false,
  };
  const result: MemoryRecord = {
    id: record.id, actorId: record.actorId, kind: 'impression', source: 'inferred',
    summary: record.summary, at: record.at, entityIds: [...record.entityIds], importance: record.importance,
    impression,
  };
  validateRememberedImpression(impression, record.actorId, now);
  return impressionFits(result, limits) ? result : undefined;
}
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const ordinal = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const fields = (value: object, allowed: readonly string[]) =>
  Object.keys(value).every((key) => allowed.includes(key));

export function validImpressionSpan(value: unknown): value is ImpressionProvenanceSpan {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const span = value as ImpressionProvenanceSpan;
  return fields(span, ['actorId', 'physicalLife', 'epoch', 'family', 'from', 'through']) &&
    isSafeRecordId(span.actorId) && ordinal(span.physicalLife) && text(span.epoch) &&
    span.family === 'temporal-receipt' && ordinal(span.from) && ordinal(span.through) && span.from <= span.through;
}

export function validateRememberedImpression(value: unknown, actorId: string, now: number): asserts value is RememberedImpression {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid remembered impression.');
  const impression = value as RememberedImpression;
  if (!fields(impression, ['version', 'from', 'through', 'claims', 'provenance', 'reason', 'createdAt', 'reinforcedAt', 'weakenAt', 'expiresAt', 'weakened']) ||
    impression.version !== 1 || !finite(impression.from) || !finite(impression.through) ||
    impression.from < 0 || impression.from > impression.through || impression.through > now ||
    !finite(impression.createdAt) || !finite(impression.reinforcedAt) ||
    !finite(impression.weakenAt) || !finite(impression.expiresAt) ||
    impression.createdAt < impression.through || impression.createdAt > impression.reinforcedAt ||
    impression.reinforcedAt > now || impression.weakenAt < impression.reinforcedAt ||
    impression.expiresAt < impression.weakenAt || typeof impression.weakened !== 'boolean' ||
    !['deliberate', 'consequence', 'learning', 'interpretation'].includes(impression.reason) ||
    !Array.isArray(impression.claims) || !impression.claims.length ||
    !Array.isArray(impression.provenance) || !impression.provenance.length ||
    impression.provenance.some((span) => !validImpressionSpan(span) || span.actorId !== actorId))
    throw new Error('Invalid remembered impression.');
  for (const claim of impression.claims) {
    if (!claim || typeof claim !== 'object' || Array.isArray(claim)) throw new Error('Invalid recollection claim.');
    if (claim.kind === 'occurrence') {
      if (!fields(claim, ['kind', 'eventType', 'role', 'subject']) || !text(claim.eventType) ||
        !['direct', 'testimony', 'inference'].includes(claim.role) ||
        (claim.subject !== undefined && !validObserverSubject(claim.subject))) throw new Error('Invalid recollection occurrence.');
    } else if (claim.kind !== 'interpretation' || !fields(claim, ['kind', 'text']) || !text(claim.text)) {
      throw new Error('Invalid recollection interpretation.');
    }
  }
}

/** Full UTF-8 encoded record bytes are charged, including provenance and presentation. */
const encoder = new TextEncoder();
export const impressionBytes = (record: MemoryRecord): number => encoder.encode(JSON.stringify(record)).byteLength;

export function impressionFits(record: MemoryRecord, limits: ImpressionLimits): boolean {
  return record.kind === 'impression' && !!record.impression &&
    record.impression.claims.length <= limits.maxClaims &&
    record.impression.provenance.length <= limits.maxSpans && impressionBytes(record) <= limits.maxBytes;
}

export function impressionAffected(impression: RememberedImpression, source: ImpressionProvenanceSpan): boolean {
  return impression.provenance.some((span) => span.actorId === source.actorId &&
    span.physicalLife === source.physicalLife && span.epoch === source.epoch &&
    span.family === source.family && span.from <= source.through && source.from <= span.through);
}

/** Fading removes arbitrary prose whole. Surviving native occurrence claims assert
 * only the qualitative event, never a recovered quote, coordinate or action grant. */
export function weakenImpression(record: MemoryRecord, now: number): MemoryRecord | undefined {
  const value = record.impression;
  if (record.kind !== 'impression' || !value || value.expiresAt <= now) return undefined;
  if (value.weakened || value.weakenAt > now) return record;
  const claims = value.claims.filter((claim) => claim.kind === 'occurrence');
  if (!claims.length) return undefined;
  return { ...record, summary: '', impression: { ...value, claims, weakened: true } };
}

export function reinforceImpression(record: MemoryRecord, now: number, limits: ImpressionLimits): MemoryRecord {
  const value = record.impression;
  if (record.kind !== 'impression' || !value || value.expiresAt <= now ||
    now - value.reinforcedAt < limits.reinforceIntervalSeconds) return record;
  return { ...record, impression: { ...value, reinforcedAt: now,
    weakenAt: value.weakened ? now : now + limits.weakenAfterSeconds,
    expiresAt: now + limits.expireAfterSeconds } };
}
