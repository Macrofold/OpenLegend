import { TIME_EPSILON } from './simulation-time.js';
import { itemFor } from './objects.js';
import { subjectNarration } from './narration.js';
import { entityGet } from './entity-collection.js';
import { canAccessContainer, containerAccessPermitted } from './object-access.js';
import { canReachEntity } from './spatial.js';
import { seesEntity } from './perception.js';
import { availableItemQuantity, applyResourceGroup, type ResourceRef } from './resource-claims.js';
import { attributeDefinition, definitionPin } from './world-modules.js';
import { readState, writeState, sameDefinitionPin, isDefinitionPin } from './state-owners.js';
import { foragingProfile } from './native-foraging.js';
import { canonicalJson, emit } from './events.js';
import { remainingYieldDigest, consumeRemainingYield } from './remains.js';
import { hasRecordFields, isSafeRecordId } from './records.js';
import { readOnlyDraftView } from './draft.js';
import type { DefinitionPin } from './world-modules.js';
import type { Action, Entity, WorldEvent, WorldState } from './types.js';

export interface NativeFeedingBinding {
  profile: DefinitionPin;
  food: DefinitionPin;
  source:
    | { kind: 'resource'; revision: number }
    | { kind: 'item'; itemId: string; revision: number }
    | { kind: 'remains'; digest: string };
}
/** Supported source shapes only, not food knowledge or permission. Keep this
 * conservative selector shared with foraging when adding a feeding source family. */
export function nativeFoodSourceCandidate(entity: Entity): boolean {
  const target = readOnlyDraftView(entity);
  return !!target.resource || target.kind === 'item-pile' || target.remains?.phase === 'fresh';
}
/** Exact exposed stock only. A pile's direct loose contents are exposed; another
 * animal's inventory and a bag's interior never become food candidates here. */
export function prepareNativeFeeding(
  world: WorldState,
  actor: Entity,
  targetId: string,
  itemId?: string,
): { binding: NativeFeedingBinding; seconds: number } | undefined {
  const profile = foragingProfile(world, actor),
    target = entityGet(world.entities, targetId);
  if (
    !profile ||
    !target ||
    target.retirement ||
    !nativeFoodSourceCandidate(target) ||
    !seesEntity(world, actor, target)
  )
    return;
  let definitionId: string | undefined, source: NativeFeedingBinding['source'] | undefined;
  if (itemId) {
    const item = itemFor(world, itemId);
    if (
      target.kind !== 'item-pile' ||
      !item ||
      item.ownerId !== target.id ||
      !containerAccessPermitted(world, actor.id, target.id) ||
      availableItemQuantity(world, item.id) < 1
    )
      return;
    definitionId = item.definitionId;
    source = { kind: 'item', itemId, revision: item.revision ?? 0 };
  } else if (target.resource && target.resource.quantity > 0) {
    definitionId = target.resource.definitionId;
    source = { kind: 'resource', revision: target.resource.revision ?? 0 };
  } else if (
    target.remains?.phase === 'fresh' &&
    !target.remains.harvested &&
    containerAccessPermitted(world, actor.id, target.id)
  ) {
    definitionId = profile.diet.find(
      (row) =>
        row.sources.includes('remains') &&
        target.remains!.yields.some(
          (yielded) => yielded.definitionId === row.definitionId && yielded.quantity > 0,
        ),
    )?.definitionId;
    source = { kind: 'remains', digest: remainingYieldDigest(target) };
  }
  const definition = definitionId && world.itemDefinitions[definitionId],
    diet =
      definition &&
      source &&
      profile.diet.find(
        (row) => row.definitionId === definition.id && row.sources.includes(source.kind),
      );
  if (!definition || !(definition.nutrition! > 0) || !diet || !source) return;
  return {
    binding: { profile: definitionPin(profile), food: definitionPin(definition), source },
    seconds: diet.workSeconds,
  };
}
export function nativeFeedingProblem(
  world: WorldState,
  actor: Entity,
  action: Action,
): string | undefined {
  const binding = action.feeding,
    target = entityGet(world.entities, action.targetId ?? '');
  if (!binding || !target || !canReachEntity(world, actor, target, world.itemHandling.reach))
    return 'the food is no longer within reach.';
  if (binding.source.kind === 'item' || binding.source.kind === 'remains') {
    if (!canAccessContainer(world, actor.id, target.id))
      return 'the selected food is no longer accessible.';
  }
  const prepared = prepareNativeFeeding(
    world,
    actor,
    target.id,
    binding.source.kind === 'item' ? binding.source.itemId : undefined,
  );
  if (!prepared || canonicalJson(prepared.binding) !== canonicalJson(binding))
    return 'the selected food or its access is no longer available.';
}
/** The existing stock transaction and attribute writer commit in the same native
 * transition. Corpse yields have exactly one debit owner, shared with harvesting. */
export function completeNativeFeeding(
  world: WorldState,
  actor: Entity,
  action: Action,
  events: WorldEvent[],
): string | undefined {
  const problem = nativeFeedingProblem(world, actor, action);
  if (problem) return problem;
  const binding = action.feeding!,
    profile = foragingProfile(world, actor)!,
    target = entityGet(world.entities, action.targetId!)!,
    attribute = attributeDefinition(world, profile.fullness.attributeId)!,
    address = { entityId: actor.id, definition: definitionPin(attribute) },
    before = readState(world, address, 'owner');
  if (
    before.status !== 'known' ||
    typeof before.value !== 'number' ||
    attribute.schema.kind !== 'number'
  )
    return 'the body can no longer consume this food.';
  if (binding.source.kind === 'remains') {
    if (!consumeRemainingYield(target, binding.food.id, 1, binding.source.digest))
      return 'the remaining food was consumed first.';
  } else {
    const source: ResourceRef =
      binding.source.kind === 'resource'
        ? { kind: 'gathering', entityId: target.id, definition: binding.food }
        : { kind: 'item', itemId: binding.source.itemId, definition: binding.food };
    if (
      applyResourceGroup(
        world,
        {
          invocationId: action.id,
          fulfillment: 'all-or-nothing',
          operations: [{ source, sourceRevision: binding.source.revision, amount: 1 }],
        },
        events,
      ).status !== 'applied'
    )
      return 'the remaining food was consumed first.';
  }
  const value = Math.min(
    attribute.schema.max,
    before.value + world.itemDefinitions[binding.food.id]!.nutrition!,
  );
  const written = writeState(
    world,
    address,
    before.revision,
    { kind: 'replace', value },
    events,
    'consumption',
    'transition',
  );
  if (written.status !== 'applied' && written.status !== 'unchanged')
    throw new Error('A prepared native meal lost its same-transition attribute write.');
  emit(
    world,
    events,
    'fed',
    subjectNarration(actor, `ate some ${world.itemDefinitions[binding.food.id]!.name}.`),
    actor,
    target.id,
    { actionId: action.id, definitionId: binding.food.id, quantity: 1 },
  );
}
export function validateNativeFeeding(world: WorldState, actor: Entity): void {
  const action = actor.actor?.action,
    binding = action?.feeding;
  if (!binding && action?.type !== 'feed') return;
  if (
    !action ||
    action.type !== 'feed' ||
    !binding ||
    !hasRecordFields(binding, ['profile', 'food', 'source']) ||
    !isDefinitionPin(binding.profile) ||
    !isDefinitionPin(binding.food) ||
    !isSafeRecordId(action.targetId) ||
    !foragingProfile(world, actor) ||
    !sameDefinitionPin(binding.profile, actor.animal!.foraging!.profile)
  )
    throw new Error('Invalid saved native feeding.');
  const source = binding.source;
  if (
    !source ||
    (source.kind === 'remains'
      ? !hasRecordFields(source, ['kind', 'digest']) ||
        typeof source.digest !== 'string' ||
        !source.digest.length
      : !['resource', 'item'].includes(source.kind) ||
        !hasRecordFields(
          source,
          source.kind === 'item' ? ['kind', 'itemId', 'revision'] : ['kind', 'revision'],
        ) ||
        !Number.isSafeInteger(source.revision) ||
        source.revision < 0 ||
        (source.kind === 'item' && !isSafeRecordId(source.itemId)))
  )
    throw new Error('Invalid saved native food source.');
  const profile = foragingProfile(world, actor)!,
    food = world.itemDefinitions[binding.food.id],
    diet = profile.diet.find(
      (row) => row.definitionId === binding.food.id && row.sources.includes(source.kind),
    );
  // A saved meal may have lost its live source while paused, but its admitted
  // definition and finite work must still describe the installed diet.
  if (
    !food ||
    !sameDefinitionPin(binding.food, definitionPin(food)) ||
    !diet ||
    action.totalSeconds !== diet.workSeconds ||
    !Number.isFinite(action.remainingSeconds) ||
    action.remainingSeconds < 0 ||
    action.remainingSeconds > diet.workSeconds + TIME_EPSILON
  )
    throw new Error('Invalid saved native feeding.');
}
