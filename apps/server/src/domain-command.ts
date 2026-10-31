import type { Command } from '@open-legend/domain';
import { validContributionTerms } from '@open-legend/domain';
import { compactCommandInput, cooperationProposalInput } from './cooperation-input.js';
import type { CommandInput } from '@open-legend/protocol';

export function domainCommand(input: CommandInput, actorId: string, id: string): Command {
  const base = {
    actorId,
    id,
    ...(input.purpose ? { purpose: input.purpose } : {}),
    ...(input.autoEquip ? { autoEquip: true } : {}),
    ...(input.combatHelpId ? { combatHelpId: input.combatHelpId } : {}),
    ...(input.cooperation ? { cooperation: input.cooperation } : {}),
  };
  switch (input.type) {
    case 'release-strike':
      throw new Error('Manual execution requires a current player choice.');
    case 'construction':
    case 'repeat-work':
    case 'construction-rest':
    case 'activity-request':
    case 'encounter-preference':
      throw new Error(
        'Requested activity parameters require the scoped world binder, not a prebuilt action candidate.',
      );
    case 'impact-boundary':
      if (!input.boundaryImpact)
        throw new Error('An exact structural part and qualified tool are required.');
      return { ...base, type: 'impact-boundary', ...input.boundaryImpact };
    case 'operate-gate':
      if (!input.gateUse) throw new Error('An exact selected gate and operation are required.');
      return { ...base, type: 'operate-gate', ...input.gateUse };
    case 'place-hearth':
      if (!input.hearthPlan)
        throw new Error('A selected construction definition and site are required.');
      return {
        ...base,
        type: 'place-hearth',
        definitionId: input.hearthPlan.definition.id,
        definitionVersion: input.hearthPlan.definition.version,
        definitionDigest: input.hearthPlan.definition.digest,
        destination: input.hearthPlan.site,
      };
    case 'activity':
      return {
        ...base,
        type: 'activity',
        methodId: input.methodId!,
        bindings: input.bindings!,
        ...(input.resume ? { resume: true } : {}),
      };
    case 'say':
      return {
        ...base,
        type: 'say',
        text: input.text!,
        ...(input.targetId ? { targetId: input.targetId } : {}),
      };
    case 'pickup':
      return {
        ...base,
        type: 'pickup',
        targetId: input.targetId!,
        ...(input.itemId ? { itemId: input.itemId } : {}),
        ...(input.itemId && input.quantity ? { quantity: input.quantity } : {}),
      };
    case 'drop':
      return { ...base, type: 'drop', itemId: input.itemId!, quantity: input.quantity! };
    case 'transfer-item':
    case 'split-item':
    case 'merge-item':
      return {
        ...base,
        type: input.type,
        itemId: input.itemId!,
        targetId: input.targetId!,
        quantity: input.quantity!,
        expectedRevision: input.expectedRevision!,
        placementRevision: input.placementRevision!,
        targetRevision: input.targetRevision!,
      };
    case 'evade':
    case 'move':
      return { ...base, type: input.type, destination: input.position! };
    case 'confirm-attempt':
    case 'withdraw-attempt':
      return { ...base, type: input.type, attemptId: input.attemptId! };
    case 'follow':
      return {
        ...base,
        type: 'follow',
        targetId: input.targetId!,
        ...(input.distance !== undefined ? { distance: input.distance } : {}),
        ...(input.completeFollow ? { complete: true as const } : {}),
        ...(input.followUntil !== undefined ? { until: input.followUntil } : {}),
      };
    case 'gather':
      return {
        ...base,
        type: 'gather',
        targetId: input.targetId!,
        ...(input.itemId ? { itemId: input.itemId } : {}),
      };
    case 'harvest':
      return { ...base, type: input.type, targetId: input.targetId! };
    case 'cancel':
      return { ...base, type: 'cancel', expectedActionId: input.expectedActionId };
    case 'recover':
    case 'respawn':
      return { ...base, type: input.type };
    case 'resume-work':
      return {
        ...base,
        type: 'resume-work',
        planId: input.planId!,
        expectedRevision: input.expectedRevision!,
      };
    case 'treat-scar':
      return { ...base, type: 'treat-scar', targetId: input.targetId!, scarId: input.scarId! };
    case 'unequip':
      return {
        ...base,
        type: input.type,
        itemId: input.itemId!,
        expectedRevision: input.expectedRevision!,
        placementRevision: input.placementRevision!,
      };
    case 'replenish':
      return {
        ...base,
        type: 'replenish',
        targetId: input.targetId!,
        attributeId: input.attributeId!,
      };
    case 'craft':
      return {
        ...base,
        type: 'craft',
        recipeId: input.recipeId!,
        ...(input.tools ? { tools: input.tools } : {}),
      };
    case 'guard':
      return {
        ...base,
        type: 'guard',
        itemId: input.itemId!,
        ...(input.targetId ? { targetId: input.targetId } : { facing: input.facing! }),
      };
    case 'eat':
    case 'equip':
      return { ...base, type: input.type, itemId: input.itemId! };
    case 'inspect-inventory':
      return {
        ...base,
        type: 'inspect-inventory',
        containerId: input.containerId,
        after: input.after,
        expectedRevision: input.expectedRevision,
        expectedScope: input.expectedScope,
      };
    case 'inspect-activities':
      return {
        ...base,
        type: 'inspect-activities',
        after: input.historyAfter ?? -1,
        methodAfter: input.methodAfter ?? 0,
      };
    case 'strike':
      return {
        ...base,
        type: 'strike',
        targetId: input.targetId!,
        definitionId: input.definitionId!,
        ...(input.itemId ? { weaponItemId: input.itemId } : {}),
      };
    case 'status-effect':
      return {
        ...base,
        type: 'status-effect',
        targetId: input.targetId!,
        definitionId: input.definitionId!,
        operation: input.effectOperation!,
      };
    case 'release-shot':
      return { ...base, type: 'release-shot', aimId: input.aimId! };
    case 'practice-shot':
    case 'aim':
    case 'shoot-once':
    case 'hunt':
      return {
        ...base,
        type: input.type,
        targetId: input.targetId!,
        ...(input.itemId ? { weaponItemId: input.itemId } : {}),
        ...(input.ammunitionId ? { ammoItemId: input.ammunitionId } : {}),
      };
    case 'coaching':
      return {
        ...base,
        type: 'coaching',
        targetId: input.targetId!,
        attributeId: input.attributeId!,
        operation: input.coachingOperation!,
        ...(input.episodeId ? { episodeId: input.episodeId } : {}),
      };
    case 'cook':
      return {
        ...base,
        type: 'cook',
        preparationId: input.preparationId!,
        preparationVersion: input.preparationVersion!,
        preparationDigest: input.preparationDigest!,
        inputs: input.inputs!,
        heatId: input.targetId!,
      };
    case 'fish':
      return { ...base, type: 'fish', targetId: input.targetId!, itemId: input.itemId! };
    case 'outing':
      if (compactCommandInput(input)) return { ...base, ...compactCommandInput(input)! };
      if (input.outingOperation === 'work')
        return {
          ...base,
          type: 'outing',
          operation: 'work',
          outingId: input.outingId!,
          expectedRevision: input.expectedRevision!,
          mode: input.outingMode!,
        };
      if (input.outingOperation === 'propose' || input.outingOperation === 'revise') {
        const proposal = cooperationProposalInput(input);
        if (!proposal) throw new Error('Missing reviewed cooperative terms.');
        return input.outingOperation === 'propose'
          ? {
              ...base,
              type: 'outing',
              operation: 'propose',
              recipientId: input.targetId!,
              ...proposal,
            }
          : {
              ...base,
              type: 'outing',
              operation: 'revise',
              outingId: input.outingId!,
              expectedRevision: input.expectedRevision!,
              ...proposal,
            };
      }
      if (input.outingOperation === 'help')
        return {
          ...base,
          type: 'outing',
          operation: 'help',
          recipientId: input.targetId!,
          opponentId: input.opponentId!,
        };
      return input.outingOperation === 'invite'
        ? {
            ...base,
            type: 'outing',
            operation: 'invite',
            recipientId: input.targetId!,
            destinationId: input.destinationId,
            destination: input.position,
            mode: input.outingMode!,
            purpose: input.purpose,
          }
        : {
            ...base,
            type: 'outing',
            operation: input.outingOperation as
              | 'accept'
              | 'decline'
              | 'leave'
              | 'withdraw'
              | 'conclude',
            outingId: input.outingId!,
            expectedRevision: input.expectedRevision!,
            mode: input.outingMode,
            amendmentRevision: input.amendmentRevision,
          };
    case 'handover':
      if (input.constructionUse && !validContributionTerms(input.constructionUse))
        throw new Error('Invalid construction-use candidate.');
      if (input.handoverOperation === 'withdraw-use')
        return {
          ...base,
          type: 'handover',
          operation: 'withdraw-use',
          targetId: input.targetId!,
          permissionId: input.contributionPermissionId!,
          expectedRevision: input.expectedRevision!,
        };
      return input.handoverOperation === 'offer' || input.handoverOperation === 'counter'
        ? {
            ...base,
            type: 'handover',
            operation: input.handoverOperation,
            targetId: input.targetId!,
            offered: input.offeredItems ?? [],
            requested: input.requestedItems ?? [],
            ...(input.constructionUse ? { constructionUse: input.constructionUse } : {}),
            ...(input.offerId ? { offerId: input.offerId } : {}),
            ...(input.expectedOfferRevision !== undefined
              ? { expectedOfferRevision: input.expectedOfferRevision }
              : {}),
          }
        : {
            ...base,
            type: 'handover',
            operation: input.handoverOperation!,
            targetId: input.targetId!,
            offerId: input.offerId!,
            expectedOfferRevision: input.expectedOfferRevision!,
          };
    case 'tend-fire':
      return {
        ...base,
        type: 'tend-fire',
        operation: input.fireOperation!,
        targetId: input.targetId!,
        ...(input.itemId ? { itemId: input.itemId } : {}),
      };
    case 'learn-record':
      if (
        !input.itemId ||
        input.expectedRevision === undefined ||
        input.placementRevision === undefined ||
        !input.recordPin
      )
        throw new Error('A current exact recipe record is required.');
      return {
        ...base,
        type: 'learn-record',
        itemId: input.itemId,
        expectedRevision: input.expectedRevision,
        placementRevision: input.placementRevision,
        recordPin: input.recordPin,
      };
    case 'teach':
      return { ...base, type: 'teach', targetId: input.targetId!, recipeId: input.recipeId! };
  }
}
