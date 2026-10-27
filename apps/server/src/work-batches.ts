import { formatDisplayNumber } from '@open-legend/language';
import { z } from 'zod';
import {
  compileWorkBatch,
  reviewMeal,
  carriedGatheringChoices,
  seesEntity,
  prospectiveWork,
  resourcesAfterEnding,
  ACTIVITY_LIMITS,
  MANUFACTURE_LIMITS,
  entityGet,
  isSafeRecordId,
  itemFor,
  type Command,
} from '@open-legend/domain';
import type { WorkBatchPreview, WorkBatchRequest } from '@open-legend/protocol';
import type { RequestScope } from './authority.js';
import type { WorldService } from './world-service.js';
import { digest } from './store.js';
const id = z.string().refine(isSafeRecordId);
const pin = z
  .object({ id, version: z.number().int().positive().safe(), digest: z.string().min(1).max(180) })
  .strict();
export const workBatchRequestSchema = z
  .object({
    selection: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('meal'), sourceId: id, food: pin }).strict(),
      z
        .object({
          kind: z.literal('gather'),
          targetId: id,
          itemId: id.optional(),
          gatheringMode: z.literal('bare-hands').optional(),
        })
        .strict()
        .refine((selection) => !selection.gatheringMode || !selection.itemId),
      z
        .object({
          kind: z.literal('craft'),
          recipe: pin,
          tools: z
            .record(id, id)
            .refine((value) => Object.keys(value).length <= MANUFACTURE_LIMITS.retainedToolRoles)
            .optional(),
        })
        .strict(),
    ]),
    batches: z.number().int().min(1).max(ACTIVITY_LIMITS.iterations),
    mode: z.enum(['enqueue', 'replace', 'interrupt']),
  })
  .strict();
/** An exact preview witness, never permission. Native admission rechecks all
 * physical/resource facts. IDs assigned to this request are deliberately absent. */
export function workBatchDigest(command: Extract<Command, { type: 'compose' }>) {
  return digest({
    root: command.root,
    bindings: command.bindings,
    mode: command.mode,
    selectionQuantity: command.selectionQuantity,
  });
}
export function previewWorkBatch(
  service: WorldService,
  request: WorkBatchRequest,
  scope: RequestScope,
): WorkBatchPreview {
  service.assertScope(scope, 'play', true);
  const work = prospectiveWork(service.world, scope.actorId, request.mode),
    availability =
      !('ok' in work) && work.outcome.ok
        ? resourcesAfterEnding(service.world, work.releasedInvocations)
        : undefined;
  const world = service.world,
    policy = world.workBatchPolicy,
    meal =
      request.selection.kind === 'meal'
        ? reviewMeal(world, scope.actorId, request.selection, availability)
        : undefined,
    mealReview = meal && !('ok' in meal) ? meal : undefined;
  const common: Omit<WorkBatchPreview, 'result'> = {
    ok: true,
    revision: service.version,
    facts: [],
    ...(policy
      ? {
          policy: {
            maximumBatches: policy.maximumBatches,
            onceLabel: policy.onceLabel,
            repeatLabel: policy.repeatLabel,
            countLabel: policy.countLabel,
            startLabel: policy.startLabel,
            help: policy.help,
          },
        }
      : {}),
  };
  if (request.selection.kind === 'gather' && policy) {
    const source = entityGet(world.entities, request.selection.targetId),
      actor = entityGet(world.entities, scope.actorId);
    if (source?.resource && !source.resource.cast && actor && seesEntity(world, actor, source))
      common.gatheringChoices = {
        label: policy.toolLabel,
        automaticLabel: policy.automaticToolLabel,
        handsLabel: policy.handsLabel,
        tools: carriedGatheringChoices(
          world,
          scope.actorId,
          source.resource.definitionId,
          availability,
        ).map(({ item, definition, quantity }) => ({
          itemId: item.id,
          label: `${definition.name} (up to ${quantity} per batch)`,
        })),
      };
  }
  if (request.selection.kind === 'meal') {
    common.policy = mealReview
      ? {
          maximumBatches: mealReview.policy.maximumUnits,
          onceLabel: mealReview.policy.oneLabel,
          repeatLabel: mealReview.policy.mealLabel,
          countLabel: mealReview.policy.countLabel,
          startLabel: mealReview.policy.startLabel,
          help: mealReview.policy.help,
        }
      : undefined;
    if (mealReview) {
      const units = Math.min(
          request.batches,
          Math.ceil(Math.max(0, mealReview.maximum - mealReview.current) / mealReview.nutrition),
          mealReview.available,
        ),
        total = units * mealReview.nutrition,
        after = Math.min(mealReview.maximum, mealReview.current + total),
        meterAmount = (value: number) =>
          formatDisplayNumber(value, {
            integer: !!mealReview.meter.nativeHealth || mealReview.maximum >= 100,
          });
      common.suggestedCount = mealReview.suggested;
      common.meterId = mealReview.meter.id;
      common.facts = [
        [
          'Nutrition',
          `${formatDisplayNumber(mealReview.nutrition)} ${mealReview.meter.name} per unit.`,
        ],
        [
          'At review',
          `${meterAmount(mealReview.current)} / ${meterAmount(mealReview.maximum)} ${mealReview.meter.name}`,
        ],
        [
          'Chosen quantity',
          `${request.batches} selected; up to ${units} eaten with current stock and fullness.`,
        ],
        [
          'Potential result',
          `${meterAmount(after)} / ${meterAmount(mealReview.maximum)} ${mealReview.meter.name}; ${formatDisplayNumber(Math.max(0, total - (after - mealReview.current)))} excess.`,
        ],
        [
          'Available',
          `${mealReview.atLeast ? 'At least ' : ''}${mealReview.available} units ${request.selection.sourceId === scope.actorId ? 'directly carried' : `in ${entityGet(world.entities, request.selection.sourceId)!.name}`}${mealReview.incomplete ? '; stock examination incomplete.' : '.'}`,
        ],
      ];
    }
  }
  const compiled = compileWorkBatch(world, scope.actorId, 'work-batch-preview', request);
  if ('ok' in compiled) return { ...common, result: compiled };
  if (compiled.type !== 'compose')
    throw new Error('The finite-work compiler returned an unsupported command.');
  const checked = service.prepareNativeCommandChoice(compiled, request.mode),
    result = 'outcome' in checked ? checked.outcome : checked;
  const facts: WorkBatchPreview['facts'] = [];
  if (request.selection.kind === 'gather') {
    const source = entityGet(world.entities, request.selection.targetId)!;
    const node = compiled.root.kind === 'sequence' ? compiled.root.children[0] : undefined;
    const quantity = node?.kind === 'invoke' ? (node.outputs?.[0]?.quantity ?? 0) : 0;
    facts.push([
      'Collection',
      `Up to ${Math.min(source.resource!.quantity, quantity * request.batches)} ${world.itemDefinitions[source.resource!.definitionId]!.name}; ${request.batches} chosen batches at up to ${quantity} per batch. Supply and competition can stop it earlier.`,
    ]);
    facts.push([
      'Work',
      `${source.resource!.workSeconds * request.batches} game seconds for all batches, plus walking. The walking route is prepared when work starts.`,
    ]);
    const toolId = compiled.bindings.tool,
      tool = typeof toolId === 'string' ? itemFor(world, toolId) : undefined;
    facts.push([
      'Chosen tool',
      tool ? world.itemDefinitions[tool.definitionId]!.name : 'Bare hands',
    ]);
  } else if (request.selection.kind === 'craft') {
    const recipe = world.recipes[request.selection.recipe.id]!;
    facts.push([
      'Materials',
      recipe.inputs
        .map(
          (input) =>
            `${input.quantity * request.batches} ${world.itemDefinitions[input.definitionId]!.name}`,
        )
        .join(', '),
    ]);
    facts.push([
      'Makes',
      recipe.outputs
        .map(
          (output) =>
            `${output.quantity * request.batches} ${world.itemDefinitions[output.definition.id]!.name}`,
        )
        .join(', '),
    ]);
    facts.push(['Work', `${recipe.workSeconds * request.batches} game seconds for all batches.`]);
    if (recipe.retainedTools.length)
      facts.push([
        'Kept tools',
        recipe.retainedTools
          .map((role, index) => {
            const item = itemFor(world, String(compiled.bindings[`tool-${index}`]))!;
            return `${role.quantity} ${world.itemDefinitions[item.definitionId]!.name}, held only during each current batch`;
          })
          .join('; '),
      ]);
  }
  return {
    ...common,
    name: compiled.name,
    facts: request.selection.kind === 'meal' ? common.facts : facts,
    digest: workBatchDigest(compiled),
    result: service.paused
      ? { ok: false, code: 'paused', message: 'Resume the world before starting selected work.' }
      : result,
  };
}
