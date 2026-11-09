import type { SpeechTargetRole } from '@open-legend/domain';
import type { CommandInput } from '@open-legend/protocol';
import type { RequestScope } from './authority.js';
import type { NativePlayerCapture } from './native-player-capture.js';
import {
  communicationReference,
  ContactReferenceError,
  currentContactReferenceFor,
} from './public-contact-references.js';

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
    if (
      currentContactReferenceFor(
        scope,
        body.sourceId,
        body.physicalLife ?? 0,
        body.leaseId,
      ) === input.targetId
    )
      return {
        ...input,
        targetId: body.sourceId,
        ...(input.type === 'say' ? { targetRole: 'body' as const } : {}),
      };
  if (input.type === 'say')
    for (const person of read.self.player.communicationSubjects)
      if (communicationReference(scope, person) === input.targetId)
        return { ...input, targetId: person.id, targetRole: 'remembered' };
  throw new ContactReferenceError();
}
