import { entityGet } from '../../entity-collection.js';
import { hasMemory } from '../../living.js';
import { accessiblePossession } from '../../object-access.js';
import { inspectedItemName } from '../../inventory-inspection.js';
import type { Entity, WorldState, WorldEvent, Outcome } from '../../types.js';
import {
  currentBodyAssociation,
  currentBodyLocalSubject,
  currentBodyGrant,
  currentBodyObservation,
} from '../../perception-evidence.js';
import { namePhrase, type Named, type NameArticle } from '@open-legend/language';
import { outcome } from '../../events.js';
import {
  characterCount,
  advanceKnowledgeRevision,
  allocateObserverIndividual,
  type KnowledgePolicy,
} from '../../knowledge.js';
import { isSafeRecordId } from '../../records.js';
import { cloneValue } from '../../draft.js';
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
import { learnRecipe, sameSubject, type ObserverSubject } from '../../knowledge.js';
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
  if(previous&&accounts){
    const nextRoots=new Set(next.familiarity?.roots.map((root)=>root.key));
    const dropped=(previous.familiarity?.roots.some((root)=>!nextRoots.has(root.key))??false)||
      (previous.nameEvidenceIds?.some((id)=>!next.nameEvidenceIds?.includes(id))??false)||
      (['voice','sight']as const).some((modality)=>{
        const retained=new Set(next[modality]?.samples.map((sample)=>sample.key));
        return previous[modality]?.samples.some((sample)=>!retained.has(sample.key));
      });
    // The common retention owner checks the complete name/note/place/work closure;
    // one identity alone cannot safely delete a capsule another owner still needs.
    if(dropped)accounts.nextDue=Math.min(accounts.nextDue??Infinity,world.simTime);
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

/** Identity assignment is world policy, not a universal property of engine documents.
 * docs/worlds/base/knowledge.md#identity-and-recognition
 */
export function identityForEntity(
  world: WorldState,
  observerId: string,
  subjectId: string,
): ObserverIdentity | undefined {
  const records = Object.values(world.observerIdentities?.[observerId] ?? {}).filter(
    (identity) => !identity.seedOnly && identity.canonicalId === subjectId,
  );
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
/** Only the already acquired association for this exact current body authorizes
 * reconciling its old local contact history with a separately learned voice. */
export function associateBodyFamiliarity(
  world: WorldState,
  observerId: string,
  sourceId: string,
): void {
  const body = world.perceptionEvidence?.[observerId]?.current[`${sourceId}:body`];
  const association = world.perceptionEvidence?.[observerId]?.current[`${sourceId}:association`];
  const local = currentBodyLocalSubject(world, observerId, sourceId);
  const matched = currentBodyAssociation(world, observerId, sourceId);
  if (!body || !association || association.bodyLeaseId !== body.id || !local || !matched) return;
  const from = observerIndividual(world, observerId, local),
    to = observerIndividual(world, observerId, matched);
  if (!from || !to) return;
  const candidate = cloneValue(to);
  associateIndividualFamiliarity(
    world,
    from,
    candidate,
    JSON.stringify({
      source: {
        family: 'native-exposure',
        observer: association.original.observer,
        id: association.original.id,
        revision: association.original.revision,
      },
      ordinal: association.originalOrdinal,
    }),
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
  const pinned = new Set(input.retainedIndividualIds);
  for (const lease of Object.values(world.perceptionEvidence?.[actorId]?.current ?? {})) {
    if (lease.localSubject?.kind === 'individual') pinned.add(lease.localSubject.individualId);
    if (lease.value.kind === 'association' && lease.value.subject.kind === 'individual')
      pinned.add(lease.value.subject.individualId);
  }
  for (const document of Object.values(world.actorKnowledge?.[actorId] ?? {}))
    if (document.subjectId?.kind === 'individual' && document.text.trim())
      pinned.add(document.subjectId.individualId);
  for(const record of world.minds[actorId]?.records??[])
    if(record.subjectId?.kind==='individual')pinned.add(record.subjectId.individualId);
  let removed = 0;
  for (const key of input.candidates ?? Object.keys(identities)) {
    const identity = identities[key];
    if (
      !identity ||
      identity.authored ||
      pinned.has(key) ||
      (input.candidates && identity.retained) ||
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
  if (localIdentity?.givenName) return localIdentity;
  const association = currentBodyAssociation(world, observerId, subjectId);
  if (association) return observerIndividual(world, observerId, association);
  if (localIdentity) return localIdentity;
  const encounterId = world.perceptionEpisodes?.[observerId]?.[subjectId];
  if (!encounterId || !currentBodyGrant(world, observerId, subjectId)) return undefined;
  return Object.values(world.observerIdentities?.[observerId] ?? {}).find(
    (identity) => !identity.seedOnly && !identity.authored && identity.encounterId === encounterId,
  );
}
/** Local subject for this exact current body, separate from remembered people. */
export function currentBodySubject(
  world: WorldState,
  observerId: string,
  subjectId: string,
): ObserverSubject | undefined {
  const local = currentBodyLocalSubject(world, observerId, subjectId);
  if (local) return local;
  const association = currentBodyAssociation(world, observerId, subjectId);
  if (association) return association;
  const identity = currentBodyIdentity(world, observerId, subjectId);
  return identity?.individualId
    ? { kind: 'individual', individualId: identity.individualId }
    : undefined;
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
  return Object.values(world.observerIdentities?.[observerId] ?? {}).some(
    (identity) =>
      !!identity.individualId && !identity.seedOnly && identity.canonicalId === subjectId,
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
      ? [{ id, label: identity.givenName || observerDescription(world, observerId, id) }]
      : [],
  );
}
/** Existing creator-authored acquaintances persist across encounters; other identities do not.
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
  return currentBodyIdentity(world, observerId, subjectId)?.givenName || undefined;
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
  const received = currentBodyObservation(world, observerId, subjectId);
  if (received?.value.body.label) return received.value.body.label;
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
    const name = identityForEntity(world, observerId, subjectId)?.givenName;
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
  return subject.kind === 'entity'
    ? identityForEntity(world, observerId, subject.entityId)?.givenName ||
        observerDescription(world, observerId, subject.entityId)
    : observerIndividual(world, observerId, subject)?.givenName ||
        (observerIndividual(world, observerId, subject)?.voice
          ? 'unidentified voice'
          : 'unidentified individual');
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
