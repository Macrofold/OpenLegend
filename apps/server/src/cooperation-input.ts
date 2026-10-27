import type { CooperationProposal } from '@open-legend/domain';
import type { CommandInput } from '@open-legend/protocol';
import type { CompactCommand } from '@open-legend/domain';
export function compactCommandInput(input: CommandInput): CompactCommand | undefined {
  const operation = input.outingOperation;
  if (operation === 'compact-propose' && input.targetId && input.compactKind)
    return {
      type: 'outing',
      operation,
      recipientId: input.targetId,
      compactKind: input.compactKind,
    };
  if (
    (operation === 'compact-revise' ||
      operation === 'compact-accept' ||
      operation === 'compact-decline' ||
      operation === 'compact-withdraw' ||
      operation === 'compact-leave') &&
    input.compactId &&
    input.expectedRevision !== undefined
  )
    return {
      type: 'outing',
      operation,
      compactId: input.compactId,
      expectedRevision: input.expectedRevision,
    };
}
/** One wire-to-native shape binding for ordinary player and reviewed character commands. */
export function cooperationProposalInput(input: CommandInput): CooperationProposal | undefined {
  if (input.cooperationKind === 'hunt' && input.quarryId && input.destinationId)
    return {
      cooperationKind: 'hunt',
      quarryId: input.quarryId,
      destinationId: input.destinationId,
    };
  if (input.cooperationKind === 'guide' && input.destinationId)
    return { cooperationKind: 'guide', destinationId: input.destinationId };
  if (input.cooperationKind === 'help' && input.cooperationTask)
    return { cooperationKind: 'help', task: input.cooperationTask };
}
