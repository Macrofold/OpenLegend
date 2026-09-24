import type { WorldState, WorldEvent, Outcome } from '../../types.js';
import { outcome } from '../../events.js';
import { characterCount, advanceKnowledgeRevision, type KnowledgePolicy } from '../../knowledge.js';
import { isSafeRecordId } from '../../records.js';
import { seesEntity } from '../../perception.js';
import config from './config/knowledge.generated.json' with { type: 'json' };

export const BASE_KNOWLEDGE_POLICY: KnowledgePolicy = config.knowledge;
export interface ObserverIdentity {
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
export function recognizesSubject(
  world: WorldState,
  observerId: string,
  subjectId: string,
): boolean {
  if (observerId === subjectId) return true;
  const identity = world.observerIdentities?.[observerId]?.[subjectId];
  return (
    !!identity &&
    (identity.authored ||
      (!!identity.encounterId &&
        identity.encounterId === world.perceptionEpisodes?.[observerId]?.[subjectId]))
  );
}
export function observerGivenName(
  world: WorldState,
  observerId: string,
  subjectId: string,
): string | undefined {
  if (observerId === subjectId) return world.entities[subjectId]?.name;
  return recognizesSubject(world, observerId, subjectId)
    ? world.observerIdentities?.[observerId]?.[subjectId]?.givenName || undefined
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
    !world.entities[observerId]?.actor ||
    !world.entities[edit.subjectId] ||
    !isSafeRecordId(edit.subjectId) ||
    !permittedSubjects.includes(edit.subjectId)
  )
    return outcome(false, 'unpermitted-subject', 'The identity subject was not supplied.');
  if (observerId === edit.subjectId)
    return outcome(false, 'self-identity', 'Self-name comes from authored character identity.');
  const current = world.observerIdentities?.[observerId]?.[edit.subjectId];
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
  ((world.observerIdentities ??= {})[observerId] ??= {})[edit.subjectId] = {
    givenName: edit.givenName.trim(),
    revision: (current?.revision ?? 0) + 1,
    encounterId,
    authored: authored || current?.authored === true,
  };
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
    (!world.observerIdentities?.[observerId]?.[subjectId] &&
      !!world.perceptionEpisodes?.[observerId]?.[subjectId])
  );
}
export function rememberSubject(
  world: WorldState,
  observerId: string,
  subjectId: string,
  authored = false,
): void {
  const existing = world.observerIdentities?.[observerId]?.[subjectId];
  if (existing) {
    if (authored && !existing.authored) {
      existing.authored = true;
      existing.revision++;
      advanceKnowledgeRevision(world, observerId);
    }
    return;
  }
  ((world.observerIdentities ??= {})[observerId] ??= {})[subjectId] = {
    givenName: '',
    revision: 0,
    encounterId: world.perceptionEpisodes?.[observerId]?.[subjectId] ?? null,
    authored,
  };
}

export function observerDescription(
  world: WorldState,
  observerId: string,
  subjectId: string,
): string {
  const known = observerGivenName(world, observerId, subjectId);
  if (known) return known;
  const entity = world.entities[subjectId];
  if (!entity?.actor) return entity?.name ?? 'an unidentified object';
  const species = entity.actor.species;
  const noun = !species || species === 'human' ? 'person' : species;
  return `${/^[aeiou]/i.test(noun) ? 'an' : 'a'} ${noun}`;
}

/** A heard self-introduction is a name claim, not a global rename or proof of recognition.
 * docs/worlds/base/knowledge.md#spoken-introductions
 */
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
    // Invalid optional metadata cannot discard otherwise valid speech.
    delete event.data!['selfIntroduction'];
    return;
  }
  const source = world.entities[event.actorId];
  if (!source?.actor) return;
  event.data!['selfIntroduction'] = proposed.trim();
  for (const observerId of event.audience) {
    const observer = world.entities[observerId];
    if (observerId === source.id || !observer?.actor || !seesEntity(world, observer, source))
      continue;
    const evidence = world.experience?.awareness[observerId]?.at(-1);
    if (evidence?.eventId !== event.id || !evidence.speech ||
        evidence.speech.perception !== 'heard' ||
        !evidence.speech.segments.some((part) => part.kind === 'heard' && part.text.includes(proposed.trim())))
      continue;
    assignGivenName(
      world,
      observerId,
      {
        subjectId: source.id,
        expectedRevision: world.observerIdentities?.[observerId]?.[source.id]?.revision ?? 0,
        givenName: proposed.trim(),
      },
      [source.id],
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
  for (const [actorId, identities] of Object.entries(world.observerIdentities ?? {})) {
    if (!world.entities[actorId]?.actor) throw new Error('Observer identity owner is unavailable.');
    for (const [subjectId, identity] of Object.entries(identities))
      if (
        !isSafeRecordId(subjectId) ||
        !identity ||
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
    if (!world.entities[actorId]?.actor)
      throw new Error('Perception episode owner is unavailable.');
    for (const [subjectId, episode] of Object.entries(episodes))
      if (!isSafeRecordId(subjectId) || typeof episode !== 'string' || !episode)
        throw new Error('Invalid perception episode.');
  }
}
