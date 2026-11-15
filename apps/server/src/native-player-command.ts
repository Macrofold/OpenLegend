import type { SpeechTargetRole } from '@open-legend/domain';
import type { CommandInput } from '@open-legend/protocol';
import type { RequestScope } from './authority.js';
import type { NativePlayerCapture } from './native-player-capture.js';
import {
  communicationReference,
  ContactReferenceError,
  currentContactReferenceFor,
} from './public-contact-references.js';

export interface NativeContactSubject {
  readonly sourceId: string;
  readonly physicalLife?: number | null;
  readonly leaseId: string;
}

/** Compare the exact scoped token against one granted body or remembered ID.
 * The caller chooses the permitted list and keeps its native owner alive. */
export const matchesNativePlayerContact = (
  scope: RequestScope,
  reference: string,
  body: NativeContactSubject,
): boolean =>
  currentContactReferenceFor(scope, body.sourceId, body.physicalLife ?? 0, body.leaseId) ===
  reference;

export const matchesNativePlayerPerson = (
  scope: RequestScope,
  reference: string,
  id: string,
): boolean => communicationReference(scope, { id }) === reference;

/** Resolve only the selected plain command's actual target position. Literal
 * prose, definition IDs and destinations remain data; canonical entity IDs do
 * not grant access to another person's current or remembered body. */
export function nativePlayerCommandReferences(
  scope: RequestScope,
  input: CommandInput,
  read: NativePlayerCapture['facts'],
): CommandInput & { targetRole?: SpeechTargetRole } {
  if (
    read.self.actorId !== scope.actorId ||
    read.self.worldId !== scope.worldId ||
    read.perception.actorId !== scope.actorId
  )
    throw new ContactReferenceError();
  if (!input.targetId) return input;
  // Closed-empty item/assembly installation leaves exactly these body/person
  // roles. The native command owner still checks physical use after resolution.
  if (input.targetId === scope.actorId)
    return { ...input, ...(input.type === 'say' ? { targetRole: 'body' as const } : {}) };
  for (const body of read.perception.bodies)
    if (matchesNativePlayerContact(scope, input.targetId, body))
      return {
        ...input,
        targetId: body.sourceId,
        ...(input.type === 'say' ? { targetRole: 'body' as const } : {}),
      };
  if (input.type === 'say')
    for (const person of read.self.player.communicationSubjects)
      if (matchesNativePlayerPerson(scope, input.targetId, person.id))
        return { ...input, targetId: person.id, targetRole: 'remembered' };
  throw new ContactReferenceError();
}
