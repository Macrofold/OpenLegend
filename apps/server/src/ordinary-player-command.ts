import type { Command, Outcome, SpeechTargetRole } from '@open-legend/domain';
import type { CommandInput } from '@open-legend/protocol';

/** Plain player syntax after the owning scope has resolved current references.
 * Physical admission remains with the command owner. Keeping this factory
 * shared also preserves the operation property order consumed by learning. */
export function ordinaryPlayerCommand(
  input: CommandInput & { targetRole?: SpeechTargetRole },
  envelope: Pick<Command, 'id' | 'actorId'> & {
    readonly humanInitiated?: true;
    readonly purpose?: string;
    readonly autoEquip?: boolean;
    readonly combatHelpId?: string;
    readonly cooperation?: Command['cooperation'];
  },
): Command | Outcome | undefined {
  switch (input.type) {
    case 'say':
      if (!input.text?.trim())
        return { ok: false, code: 'speech', message: 'Enter something to say.' };
      return {
        ...envelope,
        type: 'say',
        text: input.text,
        ...(input.volume ? { volume: input.volume } : {}),
        ...(input.targetId
          ? { targetId: input.targetId, targetRole: input.targetRole ?? 'body' }
          : {}),
      };
    case 'evade':
    case 'move':
      if (!input.position) return { ok: false, code: 'position', message: 'Choose a destination.' };
      return { ...envelope, type: input.type, destination: input.position };
    case 'cancel':
      return { ...envelope, type: 'cancel', expectedActionId: input.expectedActionId };
    case 'status-effect':
      if (!input.targetId || !input.definitionId || !input.effectOperation)
        return {
          ok: false,
          code: 'binding',
          message: 'Choose a status effect, operation and target.',
        };
      return {
        ...envelope,
        type: 'status-effect',
        targetId: input.targetId,
        definitionId: input.definitionId,
        operation: input.effectOperation,
      };
  }
}
