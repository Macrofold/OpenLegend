import { currentFacetValues } from '../../perception-current.js';
import { currentFacetGet } from '../../perception-current.js';
import { entityGet } from '../../entity-collection.js';
import { hasMemory } from '../../living.js';
import { accessiblePossession } from '../../object-access.js';
import { inspectedItemName } from '../../inventory-inspection.js';
import type { Entity, WorldState, WorldEvent, Outcome } from '../../types.js';
import {
  currentBodyAssociation,
  currentBodyLocalSubject,
  currentBodyGrant,
  currentBodyLabel,
  receivedFacetValue,
  observationFactKey,
  currentFacetOriginal,
} from '../../perception-evidence.js';
import { namePhrase, type Named, type NameArticle } from '@open-legend/language';
import { outcome } from '../../events.js';
import {
  characterCount,
  advanceKnowledgeRevision,
  allocateObserverIndividual,
  knowledgeDocument,
  type KnowledgePolicy,
} from '../../knowledge.js';
import { isImmutableData, isSafeRecordId } from '../../records.js';
import { cloneValue, readOnlyDraftView } from '../../draft.js';
import { adjustRetainedKnowledgeAccounting } from '../../remembered-impressions.js';
import {
  captureTemporalObservation,
  retainTemporalSupport,
  releaseTemporalSupport,
  temporalReceiptForSource,
  temporalReceiptSource,
} from '../../temporal-evidence.js';
import { BASE_ATTENTION_POLICY } from './attention.js';
import config from './config/knowledge.generated.json' with { type: 'json' };
import { learnRecipe, sameSubject, subjectKey, type ObserverSubject } from '../../knowledge.js';
import {
  installAuthoredVoice,
  associateIndividualFamiliarity,
  revokeRecognitionEvidence,
  recognitionSeedDeadline,
  validateRecognition,
  type RecognitionKnowledge,
} from './recognition.js';
export { revokeRecognitionEvidence } from './recognition.js';

export function startingRecipeKnowledge(
  world: WorldState,
  actorId: string,
  shieldRecipeId: string,
): void {
  if (!entityGet(world.entities, actorId)?.actor?.body?.equipmentPorts.length) return;
  learnRecipe(world, actorId, shieldRecipeId, 'authored', 'base:known-shield');
}

export const BASE_KNOWLEDGE_POLICY: KnowledgePolicy = config.knowledge;

export interface ObserverIdentity {
  /** Current body-only local roles need no lasting allocation. */
  retained?: true;
  familiarity?: import('../../attention.js').FamiliarityState;
  individualId?: string;
  canonicalId?: string;
  seedOnly?: boolean;
  voice?: RecognitionKnowledge;
  sight?: RecognitionKnowledge;
  nameEvidenceIds?: string[];
  givenName: string;
  /** Private observer-chosen label; introductions never replace it. */
  nickname?: string;
  revision: number;
  encounterId: string | null;
  authored: boolean;
}
/** The existing identity owner installs lasting learning only after its complete
 * encoded record fits the same personal-knowledge pool as notes and accounts. */
export function commitObserverIdentity(
  world: WorldState,
  actorId: string,
  key: string,
  candidate: ObserverIdentity,
): boolean {
  const records = ((world.observerIdentities ??= {})[actorId] ??= {});
  const previous = records[key];
  const next: ObserverIdentity = candidate.authored ? candidate : { ...candidate, retained: true };
  if (
    !adjustRetainedKnowledgeAccounting(
      world,
      actorId,
      previous?.retained && !previous.authored ? previous : undefined,
      next.authored ? undefined : next,
    )
  )
    return false;
  records[key] = next;
  const due = recognitionSeedDeadline(world, next),
    accounts = world.experience?.temporal?.actors[actorId]?.accounts;
  if (due !== null && accounts) accounts.nextDue = Math.min(accounts.nextDue ?? Infinity, due);
  if (previous && accounts) {
    const nextRoots = new Set(next.familiarity?.roots.map((root) => root.key));
    const dropped =
      (previous.familiarity?.roots.some((root) => !nextRoots.has(root.key)) ?? false) ||
      (previous.nameEvidenceIds?.some((id) => !next.nameEvidenceIds?.includes(id)) ?? false) ||
      (['voice', 'sight'] as const).some((modality) => {
        const retained = new Set(next[modality]?.samples.map((sample) => sample.key));
        return previous[modality]?.samples.some((sample) => !retained.has(sample.key));
      });
    // The common retention owner checks the complete name/note/place/work closure;
    // one identity alone cannot safely delete a capsule another owner still needs.
    if (dropped) accounts.nextDue = Math.min(accounts.nextDue ?? Infinity, world.simTime);
  }
  return true;
}
/** A name learned from actual words keeps those exact words and their permitted
 * participant proof, rather than pinning the whole speech log indefinitely. */
function retainNameEvidence(
  world: WorldState,
  observerId: string,
  evidenceIds: readonly string[],
  actual?: import('../../experience.js').Awareness,
): { ids: string[]; created: string[] } | undefined {
  const ids = [...evidenceIds],
    created: string[] = [];
  for (const reference of evidenceIds) {
    if (!reference.startsWith('awareness:')) continue;
    const eventId = reference.slice('awareness:'.length);
    const supports = world.experience?.temporal?.actors[observerId]?.supports ?? {};
    const prior = Object.values(supports).find((value) =>
      value.receipt.sourceIds.includes(eventId),
    );
    const awareness =
      actual?.eventId === eventId
        ? actual
        : world.experience?.awareness[observerId]?.find((entry) => entry.eventId === eventId);
    let receipt = prior?.receipt ?? temporalReceiptForSource(world, observerId, eventId);
    if (!receipt && awareness?.observation)
      receipt = captureTemporalObservation(
        world,
        observerId,
        awareness.observation,
        [eventId],
        true,
        BASE_ATTENTION_POLICY.retention.recent,
      );
    const held =
      receipt && retainTemporalSupport(world, receipt, BASE_ATTENTION_POLICY.retention.optional);
    if (!held) {
      for (const id of created) releaseTemporalSupport(world, observerId, id);
      return;
    }
    if (!prior) created.push(held.receipt.id);
    ids.push(JSON.stringify(temporalReceiptSource(held.receipt)));
  }
  return { ids: [...new Set(ids)], created };
}
export interface GivenNameEdit {
  subjectId: string;
  expectedRevision: number;
  givenName: string;
}

const canonicalIndividuals = new WeakMap<
  Record<string, ObserverIdentity>,
  Map<string, ObserverIdentity[]>
>();
/** A pure scoped read. Preserve matching-record order and distinct local accounts;
 * mutable authoring/working maps always inspect their actual current values. */
export function identitiesForEntity(
  world: WorldState,
  observerId: string,
  subjectId: string,
): readonly ObserverIdentity[] {
  const owners = readOnlyDraftView(world).observerIdentities;
  const owned = owners && readOnlyDraftView(owners)[observerId];
  const records = owned && readOnlyDraftView(owned);
  if (!records) return [];
  const immutable = isImmutableData(records);
  let indexed = immutable ? canonicalIndividuals.get(records) : undefined;
  if (!indexed && immutable) {
    indexed = new Map();
    for (const record of Object.values(records)) {
      if (record.seedOnly || !record.canonicalId) continue;
      const matches = indexed.get(record.canonicalId) ?? [];
      matches.push(record);
      indexed.set(record.canonicalId, matches);
    }
    for (const matches of indexed.values()) Object.freeze(matches);
    canonicalIndividuals.set(records, indexed);
  }
  return (
    indexed?.get(subjectId) ??
    (indexed
      ? []
      : Object.values(records)
          .map(readOnlyDraftView)
          .filter((identity) => !identity.seedOnly && identity.canonicalId === subjectId))
  );
}

/** Identity assignment is world policy, not a universal property of engine documents.
 * docs/worlds/base/knowledge.md#identity-and-recognition
 */
export function identityForEntity(
  world: WorldState,
  observerId: string,
  subjectId: string,
): ObserverIdentity | undefined {
  const records = identitiesForEntity(world, observerId, subjectId);
  return (
    records.find(
      (identity) =>
        identity.authored ||
        (!!identity.encounterId &&
          identity.encounterId === world.perceptionEpisodes?.[observerId]?.[subjectId]),
    ) ?? records[0]
  );
}
export function observerIndividual(
  world: WorldState,
  observerId: string,
  subject: ObserverSubject,
): ObserverIdentity | undefined {
  return subject.kind === 'individual'
    ? world.observerIdentities?.[observerId]?.[subject.individualId]
    : identityForEntity(world, observerId, subject.entityId);
}
/** Incidental contact does not become its own everlasting proof owner. Ordinary
 * recent receipts can support its first familiarity points until they retire;
 * only independently useful personal knowledge retains sparse proof afterwards. */
export function retainedIndividualEvidenceKeys(world: WorldState, actorId: string): string[] {
  const pinned = new Set<string>();
  for (const document of Object.values(world.actorKnowledge?.[actorId] ?? {}))
    if (document.subjectId?.kind === 'individual' && document.text.trim())
      pinned.add(document.subjectId.individualId);
  for (const record of world.minds?.[actorId]?.records ?? [])
    if (record.subjectId?.kind === 'individual') pinned.add(record.subjectId.individualId);
  const workEpisodes = new Set(
    entityGet(world.entities, actorId)
      ?.actor?.agency.plan?.steps.flatMap((step) =>
        step.status === 'running' || step.status === 'queued'
          ? Object.values(step.targetEpisodes ?? {})
          : [],
      )
      .filter((id): id is string => typeof id === 'string'),
  );
  const keys: string[] = [];
  for (const [key, identity] of Object.entries(world.observerIdentities?.[actorId] ?? {})) {
    keys.push(...(identity.nameEvidenceIds ?? []));
    for (const profile of [identity.voice, identity.sight])
      for (const sample of profile?.samples ?? []) keys.push(sample.sourceKey, ...sample.support);
    const meaningful =
      identity.authored ||
      identity.nickname ||
      identity.givenName ||
      identity.voice?.authored ||
      identity.sight?.authored ||
      (identity.voice?.samples.length ?? 0) >= 2 ||
      (identity.sight?.samples.length ?? 0) >= 1 ||
      pinned.has(key) ||
      (!!identity.encounterId && workEpisodes.has(identity.encounterId));
    for (const root of identity.familiarity?.roots ?? [])
      if (meaningful || root.required) keys.push(root.sourceKey, ...root.support);
  }
  return keys;
}
/** Only the already acquired association for this exact current body authorizes
 * reconciling its old local contact history with a separately learned voice. */
export function associateBodyFamiliarity(
  world: WorldState,
  observerId: string,
  sourceId: string,
): void {
  const owner = world.perceptionEvidence?.[observerId];
  const body = currentFacetGet(owner, `${sourceId}:body`);
  const association = currentFacetGet(owner, `${sourceId}:association`);
  const local = currentBodyLocalSubject(world, observerId, sourceId);
  const matched = currentBodyAssociation(world, observerId, sourceId);
  if (!owner || !body || !association || association.bodyLeaseId !== body.id || !local || !matched)
    return;
  const from = observerIndividual(world, observerId, local),
    to = observerIndividual(world, observerId, matched);
  if (!from || !to) return;
  const candidate = cloneValue(to);
  associateIndividualFamiliarity(
    world,
    from,
    candidate,
    JSON.stringify(
      observationFactKey(
        world,
        currentFacetOriginal(owner, association),
        association.originalOrdinal,
      ),
    ),
  );
  if (candidate.individualId)
    commitObserverIdentity(world, observerId, candidate.individualId, candidate);
}
/** Retention calls once for an actual retirement batch; native loss can supply
 * only its exact old local IDs. Ordinary unseen people do not become a lifetime
 * identity catalogue merely because the observer once received their bodies. */
export function pruneObserverIndividuals(
  world: WorldState,
  actorId: string,
  input: {
    releasedSourceIds: readonly string[];
    retainedIndividualIds?: ReadonlySet<string>;
    candidates?: readonly string[];
  },
): number {
  const identities = world.observerIdentities?.[actorId];
  if (!identities) return 0;
  if (input.releasedSourceIds.length)
    revokeRecognitionEvidence(world, actorId, new Set(input.releasedSourceIds));
  const retainedPins = new Set(input.retainedIndividualIds);
  for (const document of Object.values(world.actorKnowledge?.[actorId] ?? {}))
    if (document.subjectId?.kind === 'individual' && document.text.trim())
      retainedPins.add(document.subjectId.individualId);
  for (const record of world.minds?.[actorId]?.records ?? [])
    if (record.subjectId?.kind === 'individual') retainedPins.add(record.subjectId.individualId);
  const pinned = new Set(retainedPins);
  for (const lease of currentFacetValues(world.perceptionEvidence?.[actorId])) {
    if (lease.localSubject?.kind === 'individual') pinned.add(lease.localSubject.individualId);
    const association =
      lease.value.kind === 'association' && receivedFacetValue(world, lease.value);
    if (
      association &&
      association.kind === 'association' &&
      association.subject.kind === 'individual'
    )
      pinned.add(association.subject.individualId);
  }
  let removed = 0;
  for (const key of input.candidates ?? Object.keys(identities)) {
    const identity = identities[key];
    const learned =
      identity &&
      (identity.authored ||
        identity.nickname ||
        identity.givenName ||
        identity.voice?.authored ||
        identity.sight?.authored ||
        identity.familiarity?.authored ||
        identity.voice?.samples.length ||
        identity.sight?.samples.length ||
        identity.familiarity?.roots.length);
    // A complete retirement batch can leave an otherwise empty identity alive
    // solely for its current body. Return it to current-only ownership so later
    // body loss does not mistake the obsolete retained flag for personal memory.
    if (
      !input.candidates &&
      identity?.retained &&
      !learned &&
      !retainedPins.has(key) &&
      pinned.has(key)
    ) {
      if (!adjustRetainedKnowledgeAccounting(world, actorId, identity, undefined))
        throw new Error('Retired identity accounting was not released.');
      const currentOnly = cloneValue(identity);
      delete currentOnly.retained;
      identities[key] = currentOnly;
      continue;
    }
    if (
      !identity ||
      identity.authored ||
      pinned.has(key) ||
      (input.candidates && identity.retained) ||
      identity.nickname ||
      identity.givenName ||
      identity.voice?.authored ||
      identity.sight?.authored ||
      identity.familiarity?.authored ||
      identity.voice?.samples.length ||
      identity.sight?.samples.length ||
      identity.familiarity?.roots.length
    )
      continue;
    if (
      identity.retained &&
      !adjustRetainedKnowledgeAccounting(world, actorId, identity, undefined)
    )
      throw new Error('Retired identity accounting was not released.');
    delete identities[key];
    removed++;
  }
  return removed;
}
/** The current body must itself supply the association. Authored voice familiarity
 * alone never identifies a body that has only been seen. A private name assigned
 * during this uninterrupted encounter remains an independent body association. */
function currentBodyIdentity(
  world: WorldState,
  observerId: string,
  subjectId: string,
): ObserverIdentity | undefined {
  const local = currentBodyLocalSubject(world, observerId, subjectId);
  const localIdentity = local && observerIndividual(world, observerId, local);
  if (localIdentity?.nickname || localIdentity?.givenName) return localIdentity;
  const association = currentBodyAssociation(world, observerId, subjectId);
  if (association) return observerIndividual(world, observerId, association);
  if (localIdentity) return localIdentity;
  const encounterId = world.perceptionEpisodes?.[observerId]?.[subjectId];
  if (!encounterId || !currentBodyGrant(world, observerId, subjectId)) return undefined;
  return Object.values(world.observerIdentities?.[observerId] ?? {}).find(
    (identity) => !identity.seedOnly && !identity.authored && identity.encounterId === encounterId,
  );
}
/** Both an uninterrupted local account and a received recognition can describe
 * this body. Keep conflicting notes separate instead of silently merging them. */
export function currentBodySubjects(
  world: WorldState,
  observerId: string,
  subjectId: string,
): ObserverSubject[] {
  const local = currentBodyLocalSubject(world, observerId, subjectId);
  const association = currentBodyAssociation(world, observerId, subjectId);
  if (local || association)
    return [
      ...(local ? [local] : []),
      ...(association && (!local || !sameSubject(local, association)) ? [association] : []),
    ];
  const identity = currentBodyIdentity(world, observerId, subjectId);
  return identity?.individualId
    ? [{ kind: 'individual', individualId: identity.individualId }]
    : [];
}
/** An unannotated returning body edits the person actually recognized. A chosen
 * local name or note keeps its existing subject; recognition never overwrites it.
 * docs/worlds/base/knowledge.md#current-delivered-binding */
export function currentBodySubject(
  world: WorldState,
  observerId: string,
  subjectId: string,
): ObserverSubject | undefined {
  const subjects = currentBodySubjects(world, observerId, subjectId),
    local = subjects[0];
  if (
    local &&
    (observerIndividual(world, observerId, local)?.nickname ||
      observerIndividual(world, observerId, local)?.givenName ||
      knowledgeDocument(world, observerId, local)?.text.trim())
  )
    return local;
  return subjects.at(-1);
}
/** Called only by actual body observation after its lease has been installed.
 * Seeing an unfamiliar body permits a continuous local subject, never a face profile
 * or a join to an authored acquaintance with the same private physical route. */
export function ensureBodyIndividual(
  world: WorldState,
  observerId: string,
  subjectId: string,
): ObserverSubject | undefined {
  const observer = entityGet(world.entities, observerId);
  if (
    !observer ||
    !hasMemory(observer) ||
    !entityGet(world.entities, subjectId)?.actor ||
    observerId === subjectId ||
    !currentBodyGrant(world, observerId, subjectId)
  )
    return undefined;
  const existing = currentBodySubject(world, observerId, subjectId);
  if (existing) return existing;
  const encounterId = world.perceptionEpisodes?.[observerId]?.[subjectId];
  if (!encounterId) return undefined;
  const identities = ((world.observerIdentities ??= {})[observerId] ??= {});
  const individualId = allocateObserverIndividual(world, observerId);
  identities[individualId] = {
    individualId,
    givenName: '',
    revision: 0,
    encounterId,
    authored: false,
  };
  return { kind: 'individual', individualId };
}
/** Only an actually received recognition can connect this body to a remembered
 * canonical addressee. A newly individuated current stranger has no such link. */
export function currentCommunicationSubject(
  world: WorldState,
  observerId: string,
  subjectId: string,
): string | undefined {
  const association = currentBodyAssociation(world, observerId, subjectId);
  return association ? observerIndividual(world, observerId, association)?.canonicalId : undefined;
}
export function recognizesSubject(
  world: WorldState,
  observerId: string,
  subjectId: string,
): boolean {
  return observerId === subjectId || !!currentBodyIdentity(world, observerId, subjectId);
}
/** A remembered intended addressee is an acquired person association. It survives
 * sensory loss; no name, anonymous seed or candidate creates this permission. */
export function canAddressRememberedSubject(
  world: WorldState,
  observerId: string,
  subjectId: string,
): boolean {
  if (!entityGet(world.entities, subjectId)?.actor) return false;
  if (observerId === subjectId) return true;
  return identitiesForEntity(world, observerId, subjectId).some(
    (identity) => !!identity.individualId,
  );
}
/** Prepare the remembered addressees once per caller. Resolving each person by
 * rescanning every identity turns a complete chooser into quadratic history work. */
export function rememberedCommunicationSubjects(
  world: WorldState,
  observerId: string,
): { id: string; label: string }[] {
  const selected = new Map<
    string,
    { identity: ObserverIdentity; preferred: boolean; permitted: boolean }
  >();
  for (const identity of Object.values(world.observerIdentities?.[observerId] ?? {})) {
    const id = identity.canonicalId;
    if (!id || identity.seedOnly) continue;
    const prior = selected.get(id);
    const preferred =
      identity.authored ||
      (!!identity.encounterId &&
        identity.encounterId === world.perceptionEpisodes?.[observerId]?.[id]);
    selected.set(id, {
      identity: !prior || (!prior.preferred && preferred) ? identity : prior.identity,
      preferred: prior?.preferred || preferred,
      permitted: prior?.permitted || !!identity.individualId,
    });
  }
  return [...selected].flatMap(([id, { identity, permitted }]) =>
    permitted && entityGet(world.entities, id)?.actor
      ? [
          {
            id,
            label:
              identity.nickname || identity.givenName || observerDescription(world, observerId, id),
          },
        ]
      : [],
  );
}
/** Recognition associates a person, while current physical exposure remains separate.
 * docs/worlds/base/knowledge.md#identity-and-recognition
 */
export function subjectReferenceCurrent(
  world: WorldState,
  observerId: string,
  subjectId: string,
  expectedEncounter: string | null | undefined,
): boolean {
  return (
    observerId === subjectId ||
    identityForEntity(world, observerId, subjectId)?.authored === true ||
    (expectedEncounter !== undefined &&
      expectedEncounter === (world.perceptionEpisodes?.[observerId]?.[subjectId] ?? null))
  );
}

export function observerGivenName(
  world: WorldState,
  observerId: string,
  subjectId: string,
): string | undefined {
  if (observerId === subjectId) return entityGet(world.entities, subjectId)?.name;
  const identity = currentBodyIdentity(world, observerId, subjectId);
  return identity?.nickname || identity?.givenName || undefined;
}
export function assignGivenName(
  world: WorldState,
  observerId: string,
  edit: GivenNameEdit,
  permittedSubjects: readonly string[],
  authored = false,
  evidenceIds: readonly string[] = [],
): Outcome {
  if (
    !entityGet(world.entities, observerId)?.actor ||
    !entityGet(world.entities, edit.subjectId) ||
    !isSafeRecordId(edit.subjectId) ||
    !permittedSubjects.includes(edit.subjectId)
  )
    return outcome(false, 'unpermitted-subject', 'The identity subject was not supplied.');
  if (observerId === edit.subjectId)
    return outcome(false, 'self-identity', 'Self-name comes from authored character identity.');
  const current = identityForEntity(world, observerId, edit.subjectId);
  if (
    !Number.isSafeInteger(edit.expectedRevision) ||
    edit.expectedRevision < 0 ||
    edit.expectedRevision !== (current?.revision ?? 0)
  )
    return outcome(false, 'stale-identity', 'The preferred name changed.');
  const encounterId = world.perceptionEpisodes?.[observerId]?.[edit.subjectId] ?? null;
  if (
    !authored &&
    !canRememberSubject(world, observerId, edit.subjectId) &&
    !canAddressRememberedSubject(world, observerId, edit.subjectId)
  )
    return outcome(
      false,
      'recognition-unavailable',
      'No supported continuous encounter binds this individual; existing knowledge was retained.',
    );
  if (
    typeof edit.givenName !== 'string' ||
    !edit.givenName.trim() ||
    characterCount(edit.givenName) > 120
  )
    return outcome(false, 'invalid-given-name', 'A preferred name must contain 1–120 characters.');
  if (current?.givenName === edit.givenName.trim() && (!authored || current.authored))
    return outcome(true, 'given-name-unchanged', 'Preferred name is already current.');
  const identities = ((world.observerIdentities ??= {})[observerId] ??= {});
  const individualId = current?.individualId ?? allocateObserverIndividual(world, observerId);
  const held = retainNameEvidence(world, observerId, evidenceIds);
  if (!held)
    return outcome(
      false,
      'knowledge-capacity',
      'The exact introduction could not be retained; the previous name was retained.',
    );
  const assigned: ObserverIdentity = {
    ...current,
    individualId,
    canonicalId: edit.subjectId,
    givenName: edit.givenName.trim(),
    revision: (current?.revision ?? 0) + 1,
    encounterId,
    authored: authored || current?.authored === true,
    nameEvidenceIds: held.ids,
  };
  if (authored && !assigned.voice?.authored)
    installAuthoredVoice(world, observerId, assigned, edit.subjectId);
  if (!commitObserverIdentity(world, observerId, individualId, assigned)) {
    for (const id of held.created) releaseTemporalSupport(world, observerId, id);
    return outcome(
      false,
      'knowledge-capacity',
      'Personal knowledge is full; the previous name was retained.',
    );
  }
  advanceKnowledgeRevision(world, observerId);
  return outcome(true, 'given-name-edited', 'Observer-specific given name updated.');
}

const NICKNAME_CHARACTERS = 40;
/** A private label changes only this observer's presentation, never the person's claim. */
export function assignNickname(
  world: WorldState,
  observerId: string,
  edit: { subjectId: ObserverSubject; expectedRevision: number; nickname: string },
  permittedSubjects: readonly ObserverSubject[],
): Outcome {
  if (
    !permittedSubjects.some((subject) => sameSubject(subject, edit.subjectId)) ||
    !entityGet(world.entities, observerId)?.actor ||
    (edit.subjectId.kind === 'entity' && observerId === edit.subjectId.entityId)
  )
    return outcome(false, 'unpermitted-subject', 'This person is unavailable.');
  const current = observerIndividual(world, observerId, edit.subjectId);
  if (
    !current &&
    (edit.subjectId.kind !== 'entity' ||
      !canRememberSubject(world, observerId, edit.subjectId.entityId))
  )
    return outcome(false, 'recognition-unavailable', 'This person is no longer recognized.');
  if (current?.seedOnly)
    return outcome(false, 'recognition-unavailable', 'This person is no longer recognized.');
  if (
    !Number.isSafeInteger(edit.expectedRevision) ||
    edit.expectedRevision !== (current?.revision ?? 0)
  )
    return outcome(false, 'stale-identity', 'The name changed. Read it again before editing.');
  if (
    typeof edit.nickname !== 'string' ||
    characterCount(edit.nickname.trim()) > NICKNAME_CHARACTERS
  )
    return outcome(
      false,
      'invalid-nickname',
      `Keep the nickname within ${NICKNAME_CHARACTERS} characters.`,
    );
  const nickname = edit.nickname.trim();
  if ((current?.nickname ?? '') === nickname)
    return outcome(true, 'nickname-unchanged', 'Your nickname is already current.');
  if (
    !Number.isSafeInteger((current?.revision ?? 0) + 1) ||
    !Number.isSafeInteger((world.knowledgeRevisions?.[observerId] ?? 0) + 1)
  )
    return outcome(false, 'identity-exhausted', 'This name cannot be edited further.');
  const individualId = current?.individualId ?? allocateObserverIndividual(world, observerId);
  const candidate: ObserverIdentity = {
    ...current,
    individualId,
    ...(edit.subjectId.kind === 'entity' ? { canonicalId: edit.subjectId.entityId } : {}),
    givenName: current?.givenName ?? '',
    revision: (current?.revision ?? 0) + 1,
    encounterId:
      current?.encounterId ??
      (edit.subjectId.kind === 'entity'
        ? (world.perceptionEpisodes?.[observerId]?.[edit.subjectId.entityId] ?? null)
        : null),
    authored: current?.authored ?? false,
  };
  if (nickname) candidate.nickname = nickname;
  else delete candidate.nickname;
  if (!commitObserverIdentity(world, observerId, individualId, candidate))
    return outcome(
      false,
      'knowledge-capacity',
      'Personal knowledge is full; the previous name was retained.',
    );
  advanceKnowledgeRevision(world, observerId);
  return outcome(
    true,
    'nickname-edited',
    nickname ? 'Your nickname was saved.' : 'Your nickname was cleared.',
  );
}

export function canRememberSubject(
  world: WorldState,
  observerId: string,
  subjectId: string,
): boolean {
  if (entityGet(world.entities, subjectId)?.actor)
    return (
      canAddressRememberedSubject(world, observerId, subjectId) ||
      currentCommunicationSubject(world, observerId, subjectId) === subjectId
    );
  return !!currentBodyGrant(world, observerId, subjectId);
}
export function rememberSubject(
  world: WorldState,
  observerId: string,
  subjectId: string,
  authored = false,
): void {
  const prior = identityForEntity(world, observerId, subjectId);
  const existing =
    prior &&
    (authored ||
      prior.authored ||
      (!!prior.encounterId &&
        prior.encounterId === world.perceptionEpisodes?.[observerId]?.[subjectId]))
      ? prior
      : undefined;
  if (existing) {
    if (authored && !existing.authored) {
      if (
        !existing.individualId ||
        !commitObserverIdentity(world, observerId, existing.individualId, {
          ...existing,
          authored: true,
          revision: existing.revision + 1,
        })
      )
        return;
      advanceKnowledgeRevision(world, observerId);
    }
    return;
  }
  // A subject pad already owns its typed remembered reference. Writing one does
  // not manufacture an identification/profile from a private body routing ID.
  if (!authored) return;
  const individualId = allocateObserverIndividual(world, observerId);
  commitObserverIdentity(world, observerId, individualId, {
    individualId,
    canonicalId: subjectId,
    givenName: '',
    revision: 0,
    encounterId: world.perceptionEpisodes?.[observerId]?.[subjectId] ?? null,
    authored,
  });
}

/** Snapshot the selected world's outward category only when the body is measured.
 * This does not identify an individual or inherit a hidden authored actor name. */
export function outwardBodyName(_world: WorldState, entity: Entity): Named {
  if (!entity.actor)
    return {
      name: entity.name,
      nameForm: entity.nameForm,
      indefiniteArticle: entity.indefiniteArticle,
    };
  const species = entity.actor.species;
  const noun = !species || species === 'human' ? 'person' : species;
  return { name: noun, nameForm: 'count', indefiniteArticle: undefined };
}

/** Select permitted identity before applying presentation grammar. */
export function observerName(world: WorldState, observerId: string, subjectId: string): Named {
  const known = observerGivenName(world, observerId, subjectId);
  if (known) return { name: known, nameForm: 'proper', indefiniteArticle: undefined };
  const received = currentBodyLabel(world, observerId, subjectId);
  if (received) return received;
  const inspected = inspectedItemName(world, observerId, subjectId);
  if (inspected) return inspected;
  const entity = entityGet(world.entities, subjectId);
  if (entity && accessiblePossession(world, observerId, subjectId))
    return outwardBodyName(world, entity);
  return {
    name: 'unidentified subject',
    nameForm: 'count',
    indefiniteArticle: undefined,
  };
}

/** Keep the speaker's selected remembered person distinct from an unknown body,
 * even when their private routing IDs happen to coincide. */
export function intendedAddresseeName(
  world: WorldState,
  observerId: string,
  subjectId: string,
  role: import('../../speech.js').SpeechTargetRole,
): Named {
  if (role === 'remembered' && canAddressRememberedSubject(world, observerId, subjectId)) {
    const identity = identityForEntity(world, observerId, subjectId);
    const name = identity?.nickname || identity?.givenName;
    if (name) return { name, nameForm: 'proper' };
  }
  return observerName(world, observerId, subjectId);
}

export function observerDescription(
  world: WorldState,
  observerId: string,
  subjectId: string,
  article: NameArticle = 'none',
): string {
  return namePhrase(observerName(world, observerId, subjectId), article);
}

export interface SubjectNameEdit {
  subjectId: ObserverSubject;
  expectedRevision: number;
  givenName: string;
}
/** A private name labels an already supported individual. It creates neither a
 * physical body reference nor new familiarity. */
export function assignSubjectName(
  world: WorldState,
  observerId: string,
  edit: SubjectNameEdit,
  permittedSubjects: readonly ObserverSubject[],
  evidenceIds: readonly string[] = [],
): Outcome {
  if (!permittedSubjects.some((subject) => sameSubject(subject, edit.subjectId)))
    return outcome(false, 'unpermitted-subject', 'The identity subject was not supplied.');
  if (edit.subjectId.kind === 'entity')
    return assignGivenName(
      world,
      observerId,
      { ...edit, subjectId: edit.subjectId.entityId },
      [edit.subjectId.entityId],
      false,
      evidenceIds,
    );
  const identity = observerIndividual(world, observerId, edit.subjectId);
  const currentBody =
    identity?.encounterId &&
    Object.entries(world.perceptionEpisodes?.[observerId] ?? {}).some(
      ([id, episode]) =>
        episode === identity.encounterId && !!currentBodyGrant(world, observerId, id),
    );
  if (
    !identity?.individualId ||
    identity.seedOnly ||
    (!identity.authored &&
      !currentBody &&
      !(
        identity.canonicalId &&
        ((identity.voice?.samples.length ?? 0) >= 1 ||
          (identity.sight?.samples.length ?? 0) >= 1 ||
          (!!identity.encounterId &&
            identity.encounterId ===
              world.perceptionEpisodes?.[observerId]?.[identity.canonicalId]))
      ) &&
      (!identity.voice || (!identity.voice.authored && identity.voice.samples.length < 2)) &&
      (!identity.sight || (!identity.sight.authored && identity.sight.samples.length < 1)))
  )
    return outcome(false, 'recognition-unavailable', 'No learned individual supports this name.');
  if (!Number.isSafeInteger(edit.expectedRevision) || edit.expectedRevision !== identity.revision)
    return outcome(false, 'stale-identity', 'The preferred name changed.');
  if (!edit.givenName.trim() || characterCount(edit.givenName) > 120)
    return outcome(false, 'invalid-given-name', 'A preferred name must contain 1–120 characters.');
  if (identity.givenName === edit.givenName.trim())
    return outcome(true, 'given-name-unchanged', 'Preferred name is already current.');
  const held = retainNameEvidence(world, observerId, evidenceIds);
  if (!held)
    return outcome(
      false,
      'knowledge-capacity',
      'The exact introduction could not be retained; the previous name was retained.',
    );
  const candidate = {
    ...identity,
    givenName: edit.givenName.trim(),
    revision: identity.revision + 1,
    nameEvidenceIds: held.ids,
  };
  if (!commitObserverIdentity(world, observerId, identity.individualId, candidate)) {
    for (const id of held.created) releaseTemporalSupport(world, observerId, id);
    return outcome(
      false,
      'knowledge-capacity',
      'Personal knowledge is full; the previous name was retained.',
    );
  }
  advanceKnowledgeRevision(world, observerId);
  return outcome(true, 'given-name-edited', 'Observer-specific given name updated.');
}
export function subjectLabel(
  world: WorldState,
  observerId: string,
  subject: ObserverSubject,
): string {
  const identity = observerIndividual(world, observerId, subject);
  return (
    identity?.nickname ||
    identity?.givenName ||
    (subject.kind === 'entity'
      ? observerDescription(world, observerId, subject.entityId)
      : identity?.voice
        ? 'unidentified voice'
        : 'unidentified individual')
  );
}

function capturedSubjectLabels(labels: ReadonlyMap<string, string>) {
  return (subject: ObserverSubject): string =>
    labels.get(subjectKey(subject)) ??
    (subject.kind === 'individual' ? 'unidentified individual' : 'unidentified subject');
}

/** Labels are a request's acquired perspective, not a later lookup of the same
 * private body ID. The returned reader retains strings only, never its world. */
export function captureSubjectLabelReader(
  world: WorldState,
  observerId: string,
  additional: Iterable<ObserverSubject> = [],
): (subject: ObserverSubject) => string {
  const subjects = new Map<string, ObserverSubject>();
  for (const subject of additional) subjects.set(subjectKey(subject), subject);
  return capturedSubjectLabels(
    new Map([...subjects].map(([key, subject]) => [key, subjectLabel(world, observerId, subject)])),
  );
}

const introductionWords = new Intl.Segmenter('und', { granularity: 'word' });
function containsNameWords(text: string, name: string[]): boolean {
  const words = [...introductionWords.segment(text)].filter((word) => word.isWordLike);
  return (
    !!name.length &&
    words.some((_, start) => name.every((word, i) => words[start + i]?.segment === word))
  );
}
/** An introduction uses only the listener's actually understood name and supported
 * local individual. A canonical speaker or a current visible body is unnecessary. */
export function learnSpeechIntroduction(
  world: WorldState,
  event: WorldEvent,
  acquired: readonly import('../../experience.js').Awareness[],
): void {
  if (event.type !== 'speech' || !event.actorId) return;
  const proposed = event.data?.['selfIntroduction'];
  const text = event.data?.['text'];
  if (proposed === undefined) return;
  if (
    typeof proposed !== 'string' ||
    !proposed.trim() ||
    characterCount(proposed) > 120 ||
    typeof text !== 'string' ||
    !text.includes(proposed.trim())
  ) {
    delete event.data!['selfIntroduction'];
    return;
  }
  event.data!['selfIntroduction'] = proposed.trim();
  const nameWords = [...introductionWords.segment(proposed.trim())]
    .filter((word) => word.isWordLike)
    .map((word) => word.segment);
  for (const observerId of event.audience) {
    if (observerId === event.actorId) continue;
    const evidence = acquired.find((entry) => entry.actorId === observerId);
    if (
      evidence?.eventId !== event.id ||
      evidence.speech?.perception !== 'heard' ||
      !evidence.speech.segments.some(
        (part) => part.kind === 'heard' && containsNameWords(part.text, nameWords),
      )
    )
      continue;
    const subject =
      evidence.sourceSubject ??
      (evidence.sourceId ? { kind: 'entity' as const, entityId: evidence.sourceId } : undefined);
    if (!subject) {
      const seed = world.observerIdentities?.[observerId]?.[`voice-seed-${event.id}`];
      if (seed?.seedOnly) {
        const held = retainNameEvidence(world, observerId, [`awareness:${event.id}`], evidence);
        if (!held) continue;
        if (
          !commitObserverIdentity(world, observerId, `voice-seed-${event.id}`, {
            ...seed,
            givenName: proposed.trim(),
            nameEvidenceIds: held.ids,
          })
        )
          for (const id of held.created) releaseTemporalSupport(world, observerId, id);
      }
      continue;
    }
    const identity = observerIndividual(world, observerId, subject);
    assignSubjectName(
      world,
      observerId,
      { subjectId: subject, expectedRevision: identity?.revision ?? 0, givenName: proposed.trim() },
      [subject],
      [`awareness:${event.id}`],
    );
  }
}

/** Bundled cognition policy text; the engine response envelope only carries typed proposals. */
export function knowledgePolicyInstructions(policy: KnowledgePolicy): string {
  return `Knowledge: note={"subjectId":null,"expectedRevision":0,"text":"replacement text"}. Null subject is general knowledge (${policy.maxCharacters.general} characters); a supplied current-body, remembered-person or learned-individual token selects its admitted subject pad (${policy.maxCharacters.subject}). A supplied note- reference selects an existing remembered pad, even without current recognition. Note references are valid only in note.subjectId; they never identify a visible body, speech recipient or action target. Count Unicode code points including whitespace. Copy the current revision, or 0 for a missing pad. Rewrite, summarize or shorten the complete pad to fit; never truncate facts mechanically. Use empty text to clear. These are editable beliefs, not events or capabilities. Do not repeat About me, inventory or operational goals. Useful uncertainty matters. Notes are optional; do not edit just to fill the schema.
Given name: name={"subjectId":"supplied subject token","expectedRevision":0,"givenName":"preferred individual label"}. Deliberately individuate a currently observed subject or update an independently remembered individual's preferred name. Observation alone does not assign a name. Accepting an introduction can update it; no global renaming occurs. Use a separate operation before the note with requiresAccepted if the edit depends on naming. Re-identification after losing sight needs supported recognition; do not guess from the server reference.
Spoken introductions: when your speech introduces your own name or preferred label, put that exact spoken name in talk.selfIntroduction (up to 120 characters); otherwise use null. This tells listeners what you just called yourself. It does not change your own name. Quoted names, names of other people, and ordinary descriptions of yourself are not introductions. Do not emit a private name operation to introduce yourself.`;
}

export function validateObserverIdentities(world: WorldState): void {
  validateRecognition(world);
  for (const [actorId, identities] of Object.entries(world.observerIdentities ?? {})) {
    if (!entityGet(world.entities, actorId)?.actor)
      throw new Error('Observer identity owner is unavailable.');
    for (const [subjectId, identity] of Object.entries(identities))
      if (
        !isSafeRecordId(subjectId) ||
        !identity ||
        (identity.individualId !== undefined && identity.individualId !== subjectId) ||
        (identity.canonicalId !== undefined && !isSafeRecordId(identity.canonicalId)) ||
        (identity.nameEvidenceIds !== undefined &&
          (!Array.isArray(identity.nameEvidenceIds) ||
            identity.nameEvidenceIds.some((source) => typeof source !== 'string' || !source))) ||
        typeof identity.givenName !== 'string' ||
        (identity.nickname !== undefined &&
          (typeof identity.nickname !== 'string' ||
            !identity.nickname.trim() ||
            characterCount(identity.nickname) > NICKNAME_CHARACTERS)) ||
        characterCount(identity.givenName) > 120 ||
        !Number.isSafeInteger(identity.revision) ||
        identity.revision < 0 ||
        typeof identity.authored !== 'boolean' ||
        (identity.retained !== undefined && identity.retained !== true) ||
        !(identity.encounterId === null || typeof identity.encounterId === 'string')
      )
        throw new Error('Invalid observer identity binding.');
  }
  for (const [actorId, episodes] of Object.entries(world.perceptionEpisodes ?? {})) {
    if (!entityGet(world.entities, actorId)?.actor)
      throw new Error('Perception episode owner is unavailable.');
    for (const [subjectId, episode] of Object.entries(episodes))
      if (!isSafeRecordId(subjectId) || typeof episode !== 'string' || !episode)
        throw new Error('Invalid perception episode.');
  }
}
