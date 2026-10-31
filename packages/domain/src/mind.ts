import { entityGet } from './entity-collection.js';
import { cloneValue } from './draft.js';
import { experiences } from './experience.js';
import { validObserverSubject, subjectKey, type ObserverSubject } from './knowledge.js';
import type { MemoryRecord, WorldState } from './types.js';
import type { ActionChoice } from './action-capabilities.js';

export const MIND_LIMITS = {
  documents: 10,
  words: 500,
  documentBytes: 8000,
  proposalBytes: 100000,
  records: 80,
  thoughts: 100,
} as const;
export type EvidenceLink = {
  id: string;
  relation: 'supports' | 'contradicts' | 'derived-from' | 'supersedes';
};
export interface MindDocument {
  id: string;
  title: string;
  text: string;
  revision: number;
  evidence: EvidenceLink[];
  protected: boolean;
}
/** Authored prose lives only in a quota-counted document; typed facets link to it. */
export interface InnerRecord {
  id: string;
  revision: number;
  documentId: string;
  kind:
    | 'relationship'
    | 'belief'
    | 'appraisal'
    | 'goal'
    | 'concern'
    | 'commitment'
    | 'reflection'
    | 'dream'
    | 'identity';
  subjectId: ObserverSubject | null;
  source: 'inferred' | 'imagined' | 'authored';
  confidence: number;
  trust: number | null;
  status: 'active' | 'resolved';
  evidence: EvidenceLink[];
}
export type InnerRecordChange =
  | { operation: 'remove'; id: string; expectedRevision: number }
  | ({ operation: 'upsert'; expectedRevision: number } & Omit<InnerRecord, 'revision'>);
/** One atomic record editor shared by live reflection and native admission. Prose
 * is owned by documents; facets grant no native relationship or action effects. */
export function applyInnerRecordChanges(
  mind: ActorMind,
  changes: readonly InnerRecordChange[],
  allowedEvidence: ReadonlySet<string>,
  permittedSubjects: readonly ObserverSubject[],
  actorId: string,
  dream = false,
): string | undefined {
  if (
    changes.length > MIND_LIMITS.records * 2 ||
    new Set(changes.map((change) => change.id)).size !== changes.length
  )
    return 'Too many or duplicate record operations.';
  const knownSubjects = new Set(permittedSubjects.map(subjectKey));
  const known = (subject: ObserverSubject) => knownSubjects.has(subjectKey(subject));
  const records = new Map(mind.records.map((record) => [record.id, record]));
  for (const change of changes) {
    const prior = records.get(change.id);
    if (
      !/^[a-zA-Z0-9_-]{1,64}$/.test(change.id) ||
      ['__proto__', 'constructor', 'prototype'].includes(change.id) ||
      !Number.isSafeInteger(change.expectedRevision) ||
      (prior?.revision ?? 0) !== change.expectedRevision
    )
      return 'Invalid or stale record identity.';
    if (prior?.kind === 'identity' || (prior?.kind === 'commitment' && prior.status === 'active'))
      return 'Protected records cannot be changed.';
    if (change.operation === 'remove') {
      if (!prior) return 'Record to remove is missing.';
      records.delete(change.id);
      continue;
    }
    if (
      change.source === 'authored' ||
      change.kind === 'identity' ||
      !mind.documents.some((document) => document.id === change.documentId) ||
      !Number.isFinite(change.confidence) ||
      change.confidence < 0 ||
      change.confidence > 1 ||
      (change.trust !== null &&
        (!Number.isFinite(change.trust) || change.trust < -1 || change.trust > 1)) ||
      change.evidence.length > 16 ||
      change.evidence.some(
        (link) =>
          !allowedEvidence.has(link.id) ||
          !['supports', 'contradicts', 'derived-from', 'supersedes'].includes(link.relation),
      ) ||
      (change.subjectId && (!validObserverSubject(change.subjectId) || !known(change.subjectId)))
    )
      return 'Invalid record values or unoffered support.';
    if (
      change.kind === 'relationship' &&
      (!change.subjectId ||
        (change.subjectId.kind === 'entity' && change.subjectId.entityId === actorId))
    )
      return 'A relationship requires another known subject.';
    if ((dream || change.kind === 'dream') && change.source !== 'imagined')
      return 'Dream interpretations must remain imagined.';
    if (!dream && change.kind !== 'dream' && !change.evidence.length)
      return 'A lasting interpretation requires supported evidence.';
    const { operation: _operation, expectedRevision, ...record } = change;
    records.set(record.id, { ...cloneValue(record), revision: expectedRevision + 1 });
  }
  if (
    records.size > MIND_LIMITS.records ||
    [...records.values()].some(
      (record) => !mind.documents.some((document) => document.id === record.documentId),
    )
  )
    return 'Mind capacity or document reference is invalid.';
  mind.records = [...records.values()];
}
export interface PrivateThought {
  decisionId: string;
  at: number;
  text: string;
  kind: 'thought' | 'reflection' | 'dream';
  source: 'inferred' | 'imagined';
}
export interface ActorMind {
  revision: number;
  documents: MindDocument[];
  records: InnerRecord[];
  thoughts: PrivateThought[];
  lastReflectionAt: number;
  lastDreamEpisode: string | null;
}
export interface CognitionBinding {
  /** Model callers bind opaque references; native callers can already supply owned IDs. */
  evidenceReferences?: Record<string, string>;
  physicalEntityReferences?: Record<string, string>;
  /** Exact current body support, distinct from retained recognition/communication. */
  entityLeases?: Record<string, string>;
  knowledgeReferences?: Record<string, import('./knowledge.js').ObserverSubject>;
  /** Learned people may be labeled without gaining a current body/action reference. */
  identityReferences?: Record<string, import('./knowledge.js').ObserverSubject>;
  actorId: string;
  decisionId: string;
  evidenceIds: string[];
  entityIds: string[];
  expectedPlan: number;
  entityEpisodes?: Record<string, string>;
  actions: Record<string, ActionChoice>;
}
export const wordCount = (text: string): number =>
  text.normalize('NFKC').trim().split(/\s+/u).filter(Boolean).length;
export const byteCount = (value: unknown): number =>
  new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(value)).length;
export function mindFor(world: WorldState, actorId: string): ActorMind {
  const existing = world.minds?.[actorId];
  if (existing) return cloneValue(existing);
  const actor = entityGet(world.entities, actorId);
  const component = actor?.actor;
  const identity = [
    `I am ${actor?.name ?? actorId}.`,
    component?.description,
    component?.personality,
    component?.backstory,
    component?.initialGoals?.length
      ? `My starting goals are: ${component.initialGoals.join('; ')}.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');
  return {
    revision: 0,
    documents: [
      {
        id: 'identity',
        title: 'My beginnings',
        text: identity,
        revision: 1,
        evidence: [],
        protected: true,
      },
    ],
    records: [
      {
        id: 'identity',
        revision: 1,
        documentId: 'identity',
        kind: 'identity',
        subjectId: { kind: 'entity', entityId: actorId },
        source: 'authored',
        confidence: 1,
        trust: null,
        status: 'active',
        evidence: [],
      },
    ],
    thoughts: [],
    lastReflectionAt: -86400,
    lastDreamEpisode: null,
  };
}
export function quotaUsage(mind: ActorMind) {
  return {
    limits: MIND_LIMITS,
    used: mind.documents.length,
    documents: mind.documents.map((doc) => ({
      id: doc.id,
      words: wordCount(doc.title + ' ' + doc.text),
      bytes: byteCount(doc.title + ' ' + doc.text),
      protected: doc.protected,
    })),
  };
}
/** Fallible impressions are eligible optional recollections, never exact grant support. */
export function isRecallableExperience(memory: MemoryRecord): boolean {
  return (
    memory.kind === 'impression' ||
    (memory.kind === 'episode' && memory.source !== 'inferred') ||
    (memory.kind === 'commitment' && memory.source !== 'inferred')
  );
}
export interface RecallQuery {
  situation?: string;
  intent?: string;
  entityIds?: string[];
  from?: number;
  to?: number;
  kinds?: MemoryRecord['kind'][];
  limit?: number;
  maxBytes?: number;
  requiredIds?: string[];
  strategy?: 'recent' | 'relevant' | 'mixed';
}
export interface RecallStrategy {
  score(memory: MemoryRecord, query: RecallQuery): number;
}
export const lexicalRecall: RecallStrategy = {
  score(memory, query) {
    const words =
      ((query.situation ?? '') + ' ' + (query.intent ?? ''))
        .normalize('NFKC')
        .toLowerCase()
        .match(/[\p{L}\p{N}]+/gu) ?? [];
    return (
      (memory.kind === 'commitment' && !memory.resolved ? 100 : 0) +
      (query.entityIds?.some((id) => memory.entityIds.includes(id)) ? 30 : 0) +
      words.reduce((sum, w) => sum + (memory.summary.toLowerCase().includes(w) ? 2 : 0), 0) +
      memory.importance
    );
  },
};
/** Scope is supplied by the caller's authenticated actor binding, never model data. */
export function get_memories(
  world: WorldState,
  actorId: string,
  query: RecallQuery = {},
  strategy: RecallStrategy = lexicalRecall,
) {
  const all = world.experience
    ? experiences(world, actorId)
    : (world.memories[actorId] ?? []).filter(isRecallableExperience);
  const required = new Set([
    ...(query.requiredIds ?? []),
    ...all.filter((m) => m.kind === 'commitment' && !m.resolved).map((m) => m.id),
  ]);
  const eligible = all.filter(
    (m) =>
      required.has(m.id) ||
      ((!query.kinds || query.kinds.includes(m.kind)) &&
        (query.from === undefined || m.at >= query.from) &&
        (query.to === undefined || m.at <= query.to)),
  );
  const ranked = eligible
    .map((memory, index) => ({
      memory,
      index,
      score: required.has(memory.id)
        ? 1e6
        : query.strategy === 'recent'
          ? 0
          : strategy.score(memory, query),
    }))
    .sort((a, b) => b.score - a.score || b.memory.at - a.memory.at || b.index - a.index);
  const entries: MemoryRecord[] = [];
  let bytes = 2;
  const limit = Math.min(300, Math.max(0, query.limit ?? 30));
  const budget = Math.min(400000, Math.max(0, query.maxBytes ?? 30000));
  for (const { memory } of ranked) {
    const size = byteCount(memory) + 1;
    if (entries.length < limit && bytes + size <= budget) {
      entries.push(cloneValue(memory));
      bytes += size;
    }
  }
  return {
    entries,
    observationWatermark: Math.max(
      0,
      ...all.map((m) => m.sequence ?? (Number(m.id.split('-').at(-1)) || 0)),
    ),
    mindRevision: mindFor(world, actorId).revision,
    retrievalPolicyVersion: 'lexical-v1',
    coverage: {
      retained: all.length,
      eligible: eligible.length,
      returned: entries.length,
      omitted: eligible.length - entries.length,
      requiredMissing: [...required].filter((id) => !entries.some((m) => m.id === id)),
      bytes,
    },
  };
}
