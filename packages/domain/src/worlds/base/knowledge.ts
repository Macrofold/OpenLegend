import { entityGet } from '../../entity-collection.js';
import type { WorldState, WorldEvent, Outcome } from '../../types.js';
import { namePhrase, type Named, type NameArticle } from '@open-legend/language';
import { outcome } from '../../events.js';
import { characterCount, advanceKnowledgeRevision, type KnowledgePolicy } from '../../knowledge.js';
import { isSafeRecordId } from '../../records.js';
import config from './config/knowledge.generated.json' with { type: 'json' };
import { learnRecipe, sameSubject, type ObserverSubject } from '../../knowledge.js';
import { installAuthoredVoice, validateRecognition, type VoiceKnowledge } from './recognition.js';
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
  individualId?: string;
  canonicalId?: string;
  seedOnly?: boolean;
  voice?: VoiceKnowledge;
  nameEvidenceIds?: string[];
  givenName: string;
  revision: number;
  encounterId: string | null;
  authored: boolean;
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
export function recognizesSubject(
  world: WorldState,
  observerId: string,
  subjectId: string,
): boolean {
  if (observerId === subjectId) return true;
  const identity = identityForEntity(world, observerId, subjectId);
  return (
    !!identity &&
    (identity.authored ||
      (!!identity.encounterId &&
        identity.encounterId === world.perceptionEpisodes?.[observerId]?.[subjectId]))
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
  return recognizesSubject(world, observerId, subjectId)
    ? identityForEntity(world, observerId, subjectId)?.givenName || undefined
    : undefined;
}
export function assignGivenName(
  world: WorldState,
  observerId: string,
  edit: GivenNameEdit,
  permittedSubjects: readonly string[],
  authored = false,
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
    !recognizesSubject(world, observerId, edit.subjectId) &&
    (!encounterId || current)
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
  let individualId = current?.individualId;
  if (!individualId) {
    let ordinal = 1;
    while (Object.hasOwn(identities, `individual-${ordinal}`)) ordinal++;
    individualId = `individual-${ordinal}`;
  }
  const assigned: ObserverIdentity = (identities[individualId] = {
    ...current,
    individualId,
    canonicalId: edit.subjectId,
    givenName: edit.givenName.trim(),
    revision: (current?.revision ?? 0) + 1,
    encounterId,
    authored: authored || current?.authored === true,
  });
  if (authored && !assigned.voice?.authored)
    installAuthoredVoice(world, observerId, assigned, edit.subjectId);
  advanceKnowledgeRevision(world, observerId);
  return outcome(true, 'given-name-edited', 'Observer-specific given name updated.');
}

export function canRememberSubject(
  world: WorldState,
  observerId: string,
  subjectId: string,
): boolean {
  return (
    recognizesSubject(world, observerId, subjectId) ||
    (!identityForEntity(world, observerId, subjectId) &&
      !!world.perceptionEpisodes?.[observerId]?.[subjectId])
  );
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
      existing.authored = true;
      existing.revision++;
      advanceKnowledgeRevision(world, observerId);
    }
    return;
  }
  const identities = ((world.observerIdentities ??= {})[observerId] ??= {});
  let ordinal = 1;
  while (Object.hasOwn(identities, `individual-${ordinal}`)) ordinal++;
  const individualId = `individual-${ordinal}`;
  identities[individualId] = {
    individualId,
    canonicalId: subjectId,
    givenName: '',
    revision: 0,
    encounterId: world.perceptionEpisodes?.[observerId]?.[subjectId] ?? null,
    authored,
  };
}

/** Select permitted identity before applying presentation grammar. */
export function observerName(world: WorldState, observerId: string, subjectId: string): Named {
  const remains = entityGet(world.entities, subjectId)?.remains;
  if (remains && remains.sourceId !== subjectId)
    return observerName(world, observerId, remains.sourceId);
  const known = observerGivenName(world, observerId, subjectId);
  if (known) return { name: known, nameForm: 'proper', indefiniteArticle: undefined };
  const entity = entityGet(world.entities, subjectId);
  if (!entity?.actor)
    return entity
      ? {
          name: entity.name,
          nameForm: entity.nameForm,
          indefiniteArticle: entity.indefiniteArticle,
        }
      : { name: 'unidentified object', nameForm: 'count', indefiniteArticle: undefined };
  const species = entity.actor.species;
  const noun = !species || species === 'human' ? 'person' : species;
  // A permitted label replaces all grammar of the hidden authored name, including overrides.
  return { name: noun, nameForm: 'count', indefiniteArticle: undefined };
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
    return assignGivenName(world, observerId, { ...edit, subjectId: edit.subjectId.entityId }, [
      edit.subjectId.entityId,
    ]);
  const identity = observerIndividual(world, observerId, edit.subjectId);
  if (
    !identity?.individualId ||
    identity.seedOnly ||
    (!identity.authored &&
      !(
        identity.canonicalId &&
        identity.encounterId &&
        identity.encounterId === world.perceptionEpisodes?.[observerId]?.[identity.canonicalId]
      ) &&
      (!identity.voice || (!identity.voice.authored && identity.voice.samples.length < 2)))
  )
    return outcome(false, 'recognition-unavailable', 'No learned individual supports this name.');
  if (!Number.isSafeInteger(edit.expectedRevision) || edit.expectedRevision !== identity.revision)
    return outcome(false, 'stale-identity', 'The preferred name changed.');
  if (!edit.givenName.trim() || characterCount(edit.givenName) > 120)
    return outcome(false, 'invalid-given-name', 'A preferred name must contain 1–120 characters.');
  identity.givenName = edit.givenName.trim();
  identity.revision++;
  identity.nameEvidenceIds = [...evidenceIds];
  advanceKnowledgeRevision(world, observerId);
  return outcome(true, 'given-name-edited', 'Observer-specific given name updated.');
}
export function subjectLabel(
  world: WorldState,
  observerId: string,
  subject: ObserverSubject,
): string {
  return subject.kind === 'entity'
    ? observerDescription(world, observerId, subject.entityId)
    : observerIndividual(world, observerId, subject)?.givenName || 'unidentified voice';
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
export function learnSpeechIntroduction(world: WorldState, event: WorldEvent): void {
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
    const evidence = world.experience?.awareness[observerId]?.at(-1);
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
        seed.givenName = proposed.trim();
        seed.nameEvidenceIds = [`awareness:${event.id}`];
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
  return `Knowledge: note={"subjectId":null,"expectedRevision":0,"text":"replacement text"}. Null subject is general knowledge (${policy.maxCharacters.general} characters); a supplied entity token selects its subject pad (${policy.maxCharacters.subject}). A supplied note- reference selects an existing remembered pad, even without current recognition. Note references are valid only in note.subjectId; they never identify a visible body, speech recipient or action target. Count Unicode code points including whitespace. Copy the current revision, or 0 for a missing pad. Rewrite, summarize or shorten the complete pad to fit; never truncate facts mechanically. Use empty text to clear. These are editable beliefs, not events or capabilities. Do not repeat About me, inventory or operational goals. Useful uncertainty matters. Notes are optional; do not edit just to fill the schema.
Given name: name={"subjectId":"supplied entity token","expectedRevision":0,"givenName":"preferred individual label"}. Deliberately individuate a currently observed subject or update a recognized individual's preferred name. Observation alone does not assign a name. Accepting an introduction can update it; no global renaming occurs. Use a separate operation before the note with requiresAccepted if the edit depends on naming. Re-identification after losing sight needs supported recognition; do not guess from the server reference.
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
        typeof identity.givenName !== 'string' ||
        characterCount(identity.givenName) > 120 ||
        !Number.isSafeInteger(identity.revision) ||
        identity.revision < 0 ||
        typeof identity.authored !== 'boolean' ||
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
