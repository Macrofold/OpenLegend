import { draftWorld, cloneValue } from './draft.js';
import { experiences } from './experience.js';
import type { Command, MemoryRecord, Transition, WorldState } from './types.js';
import { canonicalJson, finish, outcome } from './events.js';
import { executeCommand } from './kernel.js';

export const MIND_POLICY = 'mind-v1';
export const MIND_LIMITS = {
  documents: 10,
  words: 500,
  documentBytes: 8000,
  proposalBytes: 100000,
  records: 80,
  experiences: 300,
  experienceBytes: 400000,
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
  subjectId: string | null;
  source: 'inferred' | 'imagined' | 'authored';
  confidence: number;
  trust: number | null;
  status: 'active' | 'resolved';
  evidence: EvidenceLink[];
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
  processedWatermark: number;
  lastReflectionAt: number;
  lastDreamEpisode: string | null;
  receipts: Record<string, string>;
}
export interface MindProposal {
  policy: string;
  decisionId: string;
  expectedRevision: number;
  thought: string;
  actionId: string | null;
  documents: Array<{
    id: string;
    expectedRevision: number;
    title: string;
    text: string;
    evidence: EvidenceLink[];
  }>;
  removeDocuments: Array<{ id: string; expectedRevision: number }>;
  records: Array<Omit<InnerRecord, 'revision'> & { expectedRevision: number }>;
  removeRecords: Array<{ id: string; expectedRevision: number }>;
}
export interface CognitionBinding {
  actorId: string;
  decisionId: string;
  policy: string;
  tier: 'fast' | 'complex' | 'full';
  purpose: 'thought' | 'reflection' | 'dream';
  watermark: number;
  evidenceIds: string[];
  entityIds: string[];
  expectedPlan: number;
  actions: Record<string, Command | null>;
  restEpisode: string | null;
}
export const wordCount = (text: string): number =>
  text.normalize('NFKC').trim().split(/\s+/u).filter(Boolean).length;
export const byteCount = (value: unknown): number =>
  new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(value)).length;
export function mindFor(world: WorldState, actorId: string): ActorMind {
  const existing = world.minds?.[actorId];
  if (existing) return cloneValue(existing);
  const actor = world.entities[actorId];
  const component = actor?.actor;
  const identity = [
    `I am ${actor?.name ?? actorId}.`,
    component?.personality,
    component?.backstory,
    component?.initialGoals?.length
      ? `My starting goals are: ${component.initialGoals.join('; ')}.`
      : (component?.goal ?? 'I am learning to survive.'),
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
        subjectId: actorId,
        source: 'authored',
        confidence: 1,
        trust: null,
        status: 'active',
        evidence: [],
      },
    ],
    thoughts: [],
    processedWatermark: 0,
    lastReflectionAt: -86400,
    lastDreamEpisode: null,
    receipts: {},
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
/** Atomic admission against latest world: observations arriving during cognition are retained. */
export function commitCognition(
  input: WorldState,
  binding: CognitionBinding,
  proposal: MindProposal,
): Transition {
  const reject = (message: string) => ({
    world: input,
    events: [],
    outcome: outcome(false, 'mind-rejected', message),
  });
  const actor = input.entities[binding.actorId]?.actor;
  if (!actor?.alive || actor.incapacitated || input.paused)
    return reject('Actor cannot deliberate now.');
  const mind = mindFor(input, binding.actorId);
  const fingerprint = canonicalJson({ binding, proposal });
  if (Object.hasOwn(mind.receipts, binding.decisionId))
    return mind.receipts[binding.decisionId] === fingerprint
      ? { world: input, events: [], outcome: outcome(true, 'duplicate', 'Already committed.') }
      : reject('Decision identity conflict.');
  if (
    byteCount(proposal) > MIND_LIMITS.proposalBytes ||
    proposal.decisionId !== binding.decisionId ||
    proposal.policy !== MIND_POLICY ||
    binding.policy !== MIND_POLICY ||
    proposal.expectedRevision !== mind.revision
  )
    return reject('Stale policy, mind revision or oversized proposal.');
  const writing =
    proposal.documents.length +
      proposal.removeDocuments.length +
      proposal.records.length +
      proposal.removeRecords.length >
    0;
  if (binding.tier !== 'full' && writing)
    return reject('This thinking tier cannot change the lasting mind.');
  if (proposal.thought.length > 2000 || wordCount(proposal.thought) > 250)
    return reject('Thought exceeds its presentation limit.');
  if (
    binding.purpose !== 'thought' &&
    (actor.fullness < 30 ||
      (actor.energy < 15 && actor.action?.type !== 'rest') ||
      actor.health < 0.4 * (actor.body?.maxHealth ?? 100) ||
      (actor.action && actor.action.type !== 'rest'))
  )
    return reject('Urgency or active work superseded consolidation.');
  if (
    binding.purpose === 'dream' &&
    (actor.action?.type !== 'rest' || actor.action.id !== binding.restEpisode)
  )
    return reject('Rest episode changed.');
  // Ordinary perceived events live in actor-scoped awareness after the cognition
  // migration. Native commitments still live in memories, and experiences()
  // intentionally presents both stores through one evidence boundary.
  const currentExperiences = experiences(input, binding.actorId, true);
  const currentEvidence = new Set(currentExperiences.map((memory) => memory.id));
  const allowed = new Set(binding.evidenceIds);
  const checkEvidence = (links: EvidenceLink[]) =>
    links.length <= 16 &&
    links.every((link) => allowed.has(link.id) && currentEvidence.has(link.id));
  const identifier = (id: string) =>
    /^[a-zA-Z0-9_-]{1,64}$/.test(id) && !['__proto__', 'constructor', 'prototype'].includes(id);
  const changed = [...proposal.documents, ...proposal.removeDocuments];
  if (new Set(changed.map((d) => d.id)).size !== changed.length)
    return reject('Duplicate document operations.');
  for (const removal of proposal.removeDocuments) {
    const doc = mind.documents.find((d) => d.id === removal.id);
    if (!doc || doc.revision !== removal.expectedRevision || doc.protected)
      return reject('Cannot remove protected or stale document.');
    mind.documents = mind.documents.filter((d) => d.id !== doc.id);
  }
  for (const patch of proposal.documents) {
    const prior = mind.documents.find((d) => d.id === patch.id);
    if (
      !identifier(patch.id) ||
      (prior?.revision ?? 0) !== patch.expectedRevision ||
      !checkEvidence(patch.evidence) ||
      wordCount(patch.title + ' ' + patch.text) > MIND_LIMITS.words ||
      byteCount(patch.title + ' ' + patch.text) > MIND_LIMITS.documentBytes ||
      patch.title.length > 120 ||
      !patch.text.trim()
    )
      return reject('Document quota, evidence or revision invalid.');
    if (
      (prior?.protected ||
        mind.records.some(
          (r) => r.documentId === patch.id && r.kind === 'commitment' && r.status === 'active',
        )) &&
      (patch.text !== prior?.text || patch.title !== prior?.title)
    )
      return reject('Essential identity is protected.');
    const next = {
      id: patch.id,
      title: patch.title,
      text: patch.text,
      revision: (prior?.revision ?? 0) + 1,
      evidence: patch.evidence,
      protected: prior?.protected ?? false,
    };
    mind.documents = mind.documents.filter((d) => d.id !== patch.id);
    mind.documents.push(next);
  }
  const recordChanges = [...proposal.records, ...proposal.removeRecords];
  if (new Set(recordChanges.map((r) => r.id)).size !== recordChanges.length)
    return reject('Duplicate record operations.');
  for (const removal of proposal.removeRecords) {
    const prior = mind.records.find((r) => r.id === removal.id);
    if (
      !prior ||
      prior.revision !== removal.expectedRevision ||
      prior.kind === 'identity' ||
      (prior.kind === 'commitment' && prior.status === 'active')
    )
      return reject('Protected or stale record removal.');
    mind.records = mind.records.filter((r) => r.id !== removal.id);
  }
  for (const patch of proposal.records) {
    const prior = mind.records.find((r) => r.id === patch.id);
    if (
      !identifier(patch.id) ||
      (prior?.revision ?? 0) !== patch.expectedRevision ||
      !checkEvidence(patch.evidence) ||
      !mind.documents.some((d) => d.id === patch.documentId) ||
      patch.confidence < 0 ||
      patch.confidence > 1 ||
      !Number.isFinite(patch.confidence) ||
      (patch.trust !== null &&
        (!Number.isFinite(patch.trust) || patch.trust < -1 || patch.trust > 1))
    )
      return reject('Invalid record envelope.');
    if (patch.source === 'authored' || patch.kind === 'identity' || prior?.kind === 'identity')
      return reject(
        "Generated memories cannot change a character's fixed identity or claim to be part of their authored starting history.",
      );
    if (patch.subjectId && !binding.entityIds.includes(patch.subjectId))
      return reject('Unknown relationship subject.');
    if (patch.kind === 'relationship' && (!patch.subjectId || patch.subjectId === binding.actorId))
      return reject('Relationship requires another known subject.');
    if ((patch.kind === 'dream' || binding.purpose === 'dream') && patch.source !== 'imagined')
      return reject('Dream proposals must remain imagined.');
    if (patch.kind !== 'dream' && patch.evidence.length === 0)
      return reject('Lasting interpretations require accessible evidence.');
    // A model cannot invent a debt or dismiss an active obligation. Native speech
    // commitment records are the only source of mechanically protected promises.
    if (patch.kind === 'commitment' && !prior) {
      const promised = patch.evidence.some((link) =>
        currentExperiences.some(
          (memory) =>
            memory.id === link.id &&
            memory.eventType === 'speech' &&
            memory.speakerId === binding.actorId &&
            /\bI (?:will|promise|agree to)\b/i.test(memory.summary),
        ),
      );
      if (!promised || patch.source !== 'inferred' || patch.status !== 'active')
        return reject('A commitment requires the actor’s actual attributed promise.');
    }
    if (prior?.kind === 'commitment' && prior.status === 'active')
      return reject('Active obligation cannot be rewritten.');
    const { expectedRevision, ...rest } = patch;
    mind.records = mind.records.filter((r) => r.id !== patch.id);
    mind.records.push({ ...rest, revision: expectedRevision + 1 });
  }
  if (
    mind.documents.length > MIND_LIMITS.documents ||
    mind.records.length > MIND_LIMITS.records ||
    mind.records.some((r) => !mind.documents.some((d) => d.id === r.documentId))
  )
    return reject('Mind capacity or document reference invalid.');
  let world = draftWorld(input);
  let events: Transition['events'] = [];
  if (proposal.actionId !== null) {
    if (
      !Object.hasOwn(binding.actions, proposal.actionId) ||
      actor.planGeneration !== binding.expectedPlan
    )
      return reject('Action candidate or plan is stale.');
    const command = binding.actions[proposal.actionId];
    if (command) {
      const transition = executeCommand(world, {
        ...command,
        id: `${binding.decisionId}:action`,
        actorId: binding.actorId,
      });
      if (!transition.outcome.ok) return reject(transition.outcome.message);
      world = draftWorld(transition.world);
      events = transition.events;
    }
  }
  mind.revision++;
  if (proposal.thought.trim())
    mind.thoughts.push({
      decisionId: binding.decisionId,
      at: world.simTime,
      text: proposal.thought,
      kind: binding.purpose,
      source: binding.purpose === 'dream' ? 'imagined' : 'inferred',
    });
  mind.thoughts = mind.thoughts.slice(-MIND_LIMITS.thoughts);
  if (binding.tier === 'full') {
    mind.processedWatermark = Math.max(mind.processedWatermark, binding.watermark);
    mind.lastReflectionAt = world.simTime;
    if (binding.purpose === 'dream') mind.lastDreamEpisode = binding.restEpisode;
  }
  mind.receipts[binding.decisionId] = fingerprint;
  // Canonical state receipts are bounded; backend durable jobs prevent replay of
  // older decisions after they fall out of this recent idempotency window.
  for (const key of Object.keys(mind.receipts).slice(0, -300)) delete mind.receipts[key];
  (world.minds ??= {})[binding.actorId] = mind;
  return finish(world, events, outcome(true, 'cognition-committed', 'Cognition accepted.'));
}

/** Legacy model-authored notes remain in saved audit data, never an extra mind store.
 * Native commitments retain their separate protected allowance for old saves. */
export function isRecallableExperience(memory: MemoryRecord): boolean {
  return (
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
