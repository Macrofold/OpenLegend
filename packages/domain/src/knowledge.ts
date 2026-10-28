import { entityGet } from './entity-collection.js';
import type { Outcome, WorldState } from './types.js';
import { recordSemanticChange } from './dependencies.js';
import { getOwn, isSafeRecordId } from './records.js';
import { nextId } from './data.js';
import { outcome } from './events.js';
import {
  adjustRetainedKnowledgeAccounting,
  validatePersonalReceiptLocator,
} from './remembered-impressions.js';
import {
  appendTemporalReceipt,
  retainTemporalSupport,
  releaseTemporalSupport,
  temporalReceiptId,
} from './temporal-evidence.js';
import { selectedTemporalPolicy } from './world-composition.js';
import { updateWorld, cloneValue } from './draft.js';
import type { KnowledgeRecord } from './types.js';

export type ObserverSubject =
  | { kind: 'entity'; entityId: string }
  | { kind: 'individual'; individualId: string };
export const subjectKey = (subject: ObserverSubject): string =>
  JSON.stringify([
    subject.kind,
    subject.kind === 'entity' ? subject.entityId : subject.individualId,
  ]);
export const sameSubject = (a: ObserverSubject, b: ObserverSubject): boolean =>
  subjectKey(a) === subjectKey(b);
export function validObserverSubject(subject: unknown): subject is ObserverSubject {
  if (
    !subject ||
    typeof subject !== 'object' ||
    Array.isArray(subject) ||
    Object.keys(subject).length !== 2
  )
    return false;
  const value = subject as Partial<ObserverSubject> & {
    entityId?: unknown;
    individualId?: unknown;
  };
  return value.kind === 'entity'
    ? typeof value.entityId === 'string' && isSafeRecordId(value.entityId)
    : value.kind === 'individual' &&
        typeof value.individualId === 'string' &&
        isSafeRecordId(value.individualId);
}
/** Document namespaces do not widen the subjects permitted by recognition or targeting. */
export type KnowledgeSubject =
  | ObserverSubject
  | { kind: 'place'; placeId: string }
  | { kind: 'map-marker'; markerId: string };
export function validKnowledgeSubject(subject: unknown): subject is KnowledgeSubject {
  if (validObserverSubject(subject)) return true;
  if (
    !subject ||
    typeof subject !== 'object' ||
    Array.isArray(subject) ||
    Object.keys(subject).length !== 2
  )
    return false;
  const value = subject as { kind?: unknown; placeId?: unknown; markerId?: unknown };
  return value.kind === 'place'
    ? typeof value.placeId === 'string' && isSafeRecordId(value.placeId)
    : value.kind === 'map-marker' &&
        typeof value.markerId === 'string' &&
        isSafeRecordId(value.markerId);
}
export interface KnowledgeDocument {
  /** Source of the current complete text, never inferred from revision or evidence absence.
   * Observed facts and testimony keep their distinct sources on the referenced evidence.
   * docs/knowledge.md#documents-and-authority */
  origin: 'authored-starting' | 'actor-edit';
  subjectId: KnowledgeSubject | null;
  text: string;
  revision: number;
  evidenceIds: string[];
}
export interface KnowledgeEdit {
  subjectId: KnowledgeSubject | null;
  expectedRevision: number;
  text: string;
}
export interface KnowledgePolicy {
  maxCharacters: { general: number; subject: number };
}
export type ActorKnowledge = Record<string, KnowledgeDocument>;
/** Identity allocation is a mechanism; the selected world decides what evidence
 * establishes an individual. Reuse the saved sequence instead of searching from
 * one for each new record, while checking this observer's actual namespace. */
export function allocateObserverIndividual(world: WorldState, observerId: string): string {
  const records = world.observerIdentities?.[observerId];
  let id = nextId(world, 'individual');
  while (records && Object.hasOwn(records, id)) id = nextId(world, 'individual');
  return id;
}
/** One exact admission proof supports a learned capability independently of routine
 * autobiographical expiry. Re-reading a known method never creates another grant. */
export function learnRecipe(
  world: WorldState,
  actorId: string,
  recipeId: string,
  source: KnowledgeRecord['source'],
  evidenceId: string,
): 'acquired' | 'already-known' | 'capacity' {
  if (world.knowledge[actorId]?.some((record) => record.recipeId === recipeId))
    return 'already-known';
  let record: KnowledgeRecord = { recipeId, source, evidenceId, learnedAt: world.simTime };
  if (source !== 'authored') {
    const recipe = getOwn(world.recipes, recipeId);
    if (!recipe) return 'capacity';
    let accepted = false;
    // This rare grant boundary reserves both proof and knowledge before installing either.
    // A failed reservation must not leave an invented receipt or spend a saved identity.
    const prepared = updateWorld(world, (draft) => {
      const policy = selectedTemporalPolicy(draft);
      const locator = appendTemporalReceipt(
        draft,
        actorId,
        {
          subject: `method:${recipeId}`,
          change: 'occurrence',
          required: true,
          sourceIds: [evidenceId],
          facets: [
            {
              role: 'direct',
              asOf: draft.simTime,
              measuredFrom: draft.simTime,
              measuredThrough: draft.simTime,
              acquiredAt: draft.simTime,
              value: {
                kind: 'personal-account',
                source: 'memory',
                id: evidenceId,
                text: 'I acquired a validated method.',
                eventType: 'method-learned',
                data: {
                  recipeId,
                  methodVersion: recipe.version,
                  methodDigest: recipe.digest,
                  provenance: source,
                },
              },
            },
          ],
        },
        policy.recent,
      );
      if (
        !locator ||
        !retainTemporalSupport(draft, locator, {
          required: true,
          maxBytes: policy.required.maxBytes,
          maxRecords: policy.required.maxRecords,
        })
      )
        return;
      record = { ...record, sourceReceipt: locator };
      accepted = adjustRetainedKnowledgeAccounting(draft, actorId, undefined, record, {
        required: true,
      });
    });
    if (!accepted) return 'capacity';
    const received = prepared.experience!.temporal!;
    const temporal = world.experience!.temporal;
    if (!temporal) world.experience!.temporal = cloneValue(received);
    else {
      // Re-enter the caller's mutable owner; a finalized nested draft is frozen.
      // Only this actor and the one new value fragment belong to this admission.
      temporal.actors[actorId] = cloneValue(received.actors[actorId]!);
      const capsule =
        received.actors[actorId]!.supports![temporalReceiptId(record.sourceReceipt!)]!;
      for (const facet of capsule.receipt.facets)
        temporal.sources[facet.blockId] = cloneValue(received.sources[facet.blockId]!);
      temporal.activeSource = received.activeSource;
      temporal.activeBoundary = received.activeBoundary;
    }
    world.nextId = prepared.nextId;
  }
  (world.knowledge[actorId] ??= []).push(record);
  advanceKnowledgeRevision(world, actorId);
  return 'acquired';
}

/** Explicitly removing the sole learned support suppresses that capability;
 * authored starting capabilities do not depend on a character's later memories. */
export function revokeLearnedRecipeSupport(
  world: WorldState,
  actorId: string,
  affected: ReadonlySet<string>,
): void {
  const records = world.knowledge[actorId];
  if (!records) return;
  const removed = records.filter(
    (record) =>
      record.source !== 'authored' &&
      (affected.has(record.evidenceId) ||
        (record.sourceReceipt && affected.has(temporalReceiptId(record.sourceReceipt)))),
  );
  if (!removed.length) return;
  for (const record of removed) {
    adjustRetainedKnowledgeAccounting(world, actorId, record, undefined, {
      required: true,
      revocation: true,
    });
    if (record.sourceReceipt)
      releaseTemporalSupport(world, actorId, temporalReceiptId(record.sourceReceipt));
  }
  const ids = new Set(removed.map((record) => record.recipeId));
  world.knowledge[actorId] = records.filter((record) => !ids.has(record.recipeId));
  advanceKnowledgeRevision(world, actorId);
}
export function advanceKnowledgeRevision(world: WorldState, actorId: string): void {
  if (!Number.isSafeInteger((world.knowledgeRevisions?.[actorId] ?? 0) + 1))
    throw new Error('Knowledge revision exhausted.');
  (world.knowledgeRevisions ??= {})[actorId] = (world.knowledgeRevisions?.[actorId] ?? 0) + 1;
  recordSemanticChange(world, { kind: 'knowledge', actorId });
}
export const characterCount = (text: string): number => Array.from(text).length;
export const knowledgeKey = (subjectId: KnowledgeSubject | null): string =>
  subjectId === null
    ? 'general'
    : subjectId.kind === 'place'
      ? `place:${subjectId.placeId}`
      : subjectId.kind === 'map-marker'
        ? `map-marker:${subjectId.markerId}`
        : `subject:${subjectKey(subjectId)}`;
export function knowledgeDocument(
  world: WorldState,
  actorId: string,
  subjectId: KnowledgeSubject | null,
) {
  return getOwn(world.actorKnowledge?.[actorId] ?? {}, knowledgeKey(subjectId));
}
const orderedDocuments = new WeakMap<ActorKnowledge, readonly string[]>();
/** Directional social text is this exact document revision, never a second writable
 * relationship record. Only a cold index build visits all of an actor's documents. */
export function knowledgePage(world: WorldState, actorId: string, after = '', limit = 40) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
    throw new Error('Invalid knowledge page size.');
  const documents = world.actorKnowledge?.[actorId] ?? {};
  let keys = Object.isFrozen(documents) ? orderedDocuments.get(documents) : undefined;
  if (!keys) {
    keys = Object.keys(documents).sort();
    if (Object.isFrozen(documents)) orderedDocuments.set(documents, keys);
  }
  let low = 0,
    high = keys.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (keys[mid]! <= after) low = mid + 1;
    else high = mid;
  }
  const page = keys.slice(low, low + limit);
  return {
    values: page.map((key) => documents[key]!),
    next: low + limit < keys.length ? page.at(-1)! : null,
  };
}

/** The caller supplies a permitted subject binding; prose never grants world capabilities.
 * docs/knowledge.md#mutation-and-limits
 */
export function editKnowledge(
  world: WorldState,
  actorId: string,
  edit: KnowledgeEdit,
  permittedSubjects: readonly KnowledgeSubject[],
  evidenceIds: readonly string[] = [],
): Outcome {
  const policy = world.knowledgePolicy;
  if (!policy || !entityGet(world.entities, actorId)?.actor || !isSafeRecordId(actorId))
    return outcome(false, 'knowledge-unavailable', 'Knowledge is unavailable for this actor.');
  const current = knowledgeDocument(world, actorId, edit.subjectId);
  if (
    edit.subjectId !== null &&
    (!validKnowledgeSubject(edit.subjectId) ||
      !permittedSubjects.some(
        (subject) => knowledgeKey(subject) === knowledgeKey(edit.subjectId),
      ) ||
      (edit.subjectId.kind === 'place'
        ? false // Exact retained place is admitted by the caller.
        : edit.subjectId.kind === 'map-marker'
          ? !world.mapMarkers?.[actorId]?.[edit.subjectId.markerId] && !current
          : edit.subjectId.kind === 'entity'
            ? !entityGet(world.entities, edit.subjectId.entityId) && !current
            : world.observerIdentities?.[actorId]?.[edit.subjectId.individualId]?.individualId !==
              edit.subjectId.individualId))
  )
    return outcome(false, 'unpermitted-subject', 'The knowledge subject was not supplied.');
  if (
    !Number.isSafeInteger(edit.expectedRevision) ||
    edit.expectedRevision < 0 ||
    edit.expectedRevision !== (current?.revision ?? 0)
  )
    return outcome(
      false,
      'stale-knowledge',
      'The knowledge document changed; read its current revision.',
    );
  const limit = policy.maxCharacters[edit.subjectId === null ? 'general' : 'subject'];
  if (typeof edit.text !== 'string' || characterCount(edit.text) > limit)
    return outcome(
      false,
      'knowledge-overflow',
      `Rewrite the complete notepad within ${limit} characters; the previous text was retained.`,
    );
  const forgotten = new Set(world.experience?.forgotten[actorId] ?? []);
  if (evidenceIds.some((id) => forgotten.has(id)))
    return outcome(false, 'forgotten-evidence', 'Knowledge cannot retain forgotten evidence.');
  if (current?.text === edit.text)
    return outcome(true, 'knowledge-unchanged', 'Knowledge is already current.');
  if (
    !Number.isSafeInteger((current?.revision ?? 0) + 1) ||
    !Number.isSafeInteger((world.knowledgeRevisions?.[actorId] ?? 0) + 1)
  )
    return outcome(
      false,
      'knowledge-revision-exhausted',
      'The knowledge document cannot accept another revision; its previous text was retained.',
    );
  const documents = ((world.actorKnowledge ??= {})[actorId] ??= {});
  // Keep empty documents as revisioned tombstones: an old create cannot undo a later deletion.
  const next: KnowledgeDocument = {
    origin: 'actor-edit',
    subjectId: edit.subjectId,
    text: edit.text,
    revision: (current?.revision ?? 0) + 1,
    // Current publication evidence stays bounded by admitted context; prior provenance remains in committed history.
    evidenceIds: edit.text
      ? [...new Set(evidenceIds.length ? evidenceIds : (current?.evidenceIds ?? []))]
      : [],
  };
  if (
    !adjustRetainedKnowledgeAccounting(
      world,
      actorId,
      current?.origin === 'actor-edit' ? current : undefined,
      next,
    )
  )
    return outcome(
      false,
      'knowledge-capacity',
      'Personal knowledge is full; the previous document was retained.',
    );
  documents[knowledgeKey(edit.subjectId)] = next;
  advanceKnowledgeRevision(world, actorId);
  return outcome(true, 'knowledge-edited', 'Knowledge updated.');
}

export function validateKnowledge(world: WorldState): void {
  for (const [actorId, records] of Object.entries(world.knowledge)) {
    if (!entityGet(world.entities, actorId)?.actor || !Array.isArray(records))
      throw new Error('Invalid learned capability owner.');
    const seen = new Set<string>();
    for (const record of records) {
      if (
        !record ||
        typeof record !== 'object' ||
        Array.isArray(record) ||
        !isSafeRecordId(record.recipeId)
      )
        throw new Error('Invalid learned capability.');
      const recipe = getOwn(world.recipes, record.recipeId);
      if (
        !recipe ||
        seen.has(record.recipeId) ||
        !isSafeRecordId(record.evidenceId) ||
        !['authored', 'record', 'taught', 'invented', 'practiced'].includes(record.source) ||
        !Number.isFinite(record.learnedAt) ||
        record.learnedAt < 0 ||
        record.learnedAt > world.simTime ||
        Object.keys(record).some(
          (key) =>
            !['recipeId', 'source', 'evidenceId', 'learnedAt', 'sourceReceipt'].includes(key),
        )
      )
        throw new Error('Invalid learned capability.');
      seen.add(record.recipeId);
      if (record.source === 'authored') {
        if (record.sourceReceipt)
          throw new Error('Authored knowledge cannot claim a sensory receipt.');
        continue;
      }
      validatePersonalReceiptLocator(record.sourceReceipt, actorId);
      const capsule =
        world.experience?.temporal?.actors[actorId]?.supports?.[
          temporalReceiptId(record.sourceReceipt!)
        ];
      if (
        !capsule?.required ||
        !capsule.receipt.sourceIds.includes(record.evidenceId) ||
        capsule.receipt.at !== record.learnedAt ||
        !capsule.values.some(
          (value) =>
            value.kind === 'personal-account' &&
            value.id === record.evidenceId &&
            value.eventType === 'method-learned' &&
            value.data?.['recipeId'] === record.recipeId &&
            value.data?.['methodVersion'] === recipe.version &&
            value.data?.['methodDigest'] === recipe.digest &&
            value.data?.['provenance'] === record.source,
        )
      )
        throw new Error('Learned capability has no exact retained admission proof.');
    }
  }

  if (!world.knowledgePolicy && !world.actorKnowledge) return;
  for (const limit of [
    world.knowledgePolicy?.maxCharacters?.general,
    world.knowledgePolicy?.maxCharacters?.subject,
  ])
    if (!Number.isSafeInteger(limit) || limit! < 1)
      throw new Error('Invalid admitted knowledge character limit.');
  if (!world.knowledgePolicy) throw new Error('Knowledge has no admitted policy.');
  for (const [actorId, documents] of Object.entries(world.actorKnowledge ?? {})) {
    if (!entityGet(world.entities, actorId)?.actor)
      throw new Error('Knowledge owner is unavailable.');
    for (const [id, document] of Object.entries(documents)) {
      if (
        !['authored-starting', 'actor-edit'].includes(document.origin) ||
        id !== knowledgeKey(document.subjectId) ||
        (document.subjectId !== null &&
          (!validKnowledgeSubject(document.subjectId) ||
            (document.subjectId.kind === 'individual' &&
              world.observerIdentities?.[actorId]?.[document.subjectId.individualId]
                ?.individualId !== document.subjectId.individualId))) ||
        !Number.isSafeInteger(document.revision) ||
        document.revision < 1 ||
        typeof document.text !== 'string' ||
        !Array.isArray(document.evidenceIds) ||
        document.evidenceIds.some((id) => typeof id !== 'string') ||
        characterCount(document.text) >
          world.knowledgePolicy.maxCharacters[document.subjectId === null ? 'general' : 'subject']
      )
        throw new Error(`Invalid knowledge document for ${actorId}: ${id}.`);
    }
  }
}
