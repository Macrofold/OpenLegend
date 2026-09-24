import type { WorldState, Outcome } from '../../types.js';
import { outcome } from '../../events.js';
import { characterCount, advanceKnowledgeRevision, type KnowledgePolicy } from '../../knowledge.js';
import { isSafeRecordId } from '../../records.js';
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
export function recognizesSubject(world: WorldState, observerId: string, subjectId: string): boolean {
  if (observerId === subjectId) return true;
  const identity = world.observerIdentities?.[observerId]?.[subjectId];
  return !!identity && (identity.authored || !!identity.encounterId &&
    identity.encounterId === world.perceptionEpisodes?.[observerId]?.[subjectId]);
}
export function observerGivenName(world: WorldState, observerId: string, subjectId: string): string | undefined {
  if (observerId === subjectId) return world.entities[subjectId]?.name;
  return recognizesSubject(world, observerId, subjectId)
    ? world.observerIdentities?.[observerId]?.[subjectId]?.givenName || undefined : undefined;
}
export function assignGivenName(
  world: WorldState, observerId: string, edit: GivenNameEdit,
  permittedSubjects: readonly string[], authored = false,
): Outcome {
  if (!world.entities[observerId]?.actor || !world.entities[edit.subjectId] ||
      !isSafeRecordId(edit.subjectId) || !permittedSubjects.includes(edit.subjectId))
    return outcome(false, 'unpermitted-subject', 'The identity subject was not supplied.');
  const current = world.observerIdentities?.[observerId]?.[edit.subjectId];
  if (!Number.isSafeInteger(edit.expectedRevision) || edit.expectedRevision < 0 ||
      edit.expectedRevision !== (current?.revision ?? 0))
    return outcome(false, 'stale-identity', 'The preferred name changed.');
  const encounterId = world.perceptionEpisodes?.[observerId]?.[edit.subjectId] ?? null;
  if (!authored && (!encounterId || current && !recognizesSubject(world, observerId, edit.subjectId)))
    return outcome(false, 'recognition-unavailable', 'No supported continuous encounter binds this individual; existing knowledge was retained.');
  if (typeof edit.givenName !== 'string' || !edit.givenName.trim() || characterCount(edit.givenName) > 120)
    return outcome(false, 'invalid-given-name', 'A preferred name must contain 1–120 characters.');
  ((world.observerIdentities ??= {})[observerId] ??= {})[edit.subjectId] = {
    givenName: edit.givenName.trim(), revision: (current?.revision ?? 0) + 1,
    encounterId, authored: authored || current?.authored === true,
  };
  advanceKnowledgeRevision(world, observerId);
  return outcome(true, 'given-name-edited', 'Observer-specific given name updated.');
}

export function canRememberSubject(world: WorldState, observerId: string, subjectId: string): boolean {
  return recognizesSubject(world, observerId, subjectId) ||
    !world.observerIdentities?.[observerId]?.[subjectId] && !!world.perceptionEpisodes?.[observerId]?.[subjectId];
}
export function rememberSubject(world: WorldState, observerId: string, subjectId: string, authored = false): void {
  const existing = world.observerIdentities?.[observerId]?.[subjectId];
  if (existing) {
    if (authored && !existing.authored) {existing.authored = true; existing.revision++;}
    return;
  }
  ((world.observerIdentities ??= {})[observerId] ??= {})[subjectId] = {
    givenName: '', revision: 0, encounterId: world.perceptionEpisodes?.[observerId]?.[subjectId] ?? null, authored,
  };
}

export function observerDescription(world: WorldState, observerId: string, subjectId: string): string {
  const known = observerGivenName(world, observerId, subjectId);
  if (known) return known;
  const entity = world.entities[subjectId];
  if (!entity?.actor) return entity?.name ?? 'an unidentified object';
  const species = entity.actor.species;
  const noun = !species || species === 'human' ? 'person' : species;
  return `${/^[aeiou]/i.test(noun) ? 'an' : 'a'} ${noun}`;
}
