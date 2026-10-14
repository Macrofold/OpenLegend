import { distance3D, type SurfacePoint, type WorldPoint } from '@open-legend/spatial';
import { hasLineOfSight, interactionAnchor, isWalkable } from './spatial.js';
import { bodyProfile, worldPosition, worldSupport } from './spatial-state.js';
import { itemFor } from './objects.js';
import { accessiblePossession } from './object-access.js';
import { definitionPin, type DefinitionPin } from './world-modules.js';
import { availableItemQuantity, itemDefinitionPin } from './resource-claims.js';
import { isDefinitionPin, sameDefinitionPin } from './state-owners.js';
import { getOwn, hasRecordFields, isSafeRecordId } from './records.js';
import type { Entity, WorldState } from './types.js';

/** A finite authored source and one probabilistic extraction, not animal ecology.
 * docs/food-preparation.md#finite-source-attempts */
export interface CastDefinition {
  id: string;
  version: number;
  toolKind: string;
  name: string;
  description: string;
  actionLabel: string;
  availableText: string;
  toolRequiredText: string;
  supplyUnknownText: string;
  workSeconds: number;
  chance: number;
  maximumLineMetres: number;
  stanceTolerance: number;
  caughtText: string;
  emptyText: string;
  exhaustedText: string;
}
export interface CastSource {
  definitionId: string;
  stance: SurfacePoint;
  endpoint: WorldPoint;
  water: { minX: number; maxX: number; minZ: number; maxZ: number };
}
export interface CastBinding {
  definition: DefinitionPin;
  source: DefinitionPin;
  tool: DefinitionPin;
  output: DefinitionPin;
}
export function castSourcePin(source: Entity): DefinitionPin {
  const meaning = {
    id: source.id,
    version: 1,
    cast: source.resource!.cast,
    definitionId: source.resource!.definitionId,
    placement: source.placement,
  };
  return definitionPin(meaning);
}
export function castDefinition(
  world: WorldState,
  source: Entity | undefined,
): CastDefinition | undefined {
  return source?.resource?.cast && getOwn(world.castDefinitions, source.resource.cast.definitionId);
}
export function castGeometryProblem(
  world: WorldState,
  actor: Entity,
  source: Entity,
  atStance: boolean,
  origin = worldPosition(actor),
): string | undefined {
  const cast = source.resource?.cast;
  const definition = castDefinition(world, source);
  if (!cast || !definition) return 'The selected source no longer supports this cast.';
  const { stance, endpoint, water } = cast;
  if (
    !isWalkable(world, stance, stance.surfaceId, bodyProfile(actor)) ||
    endpoint.x < water.minX ||
    endpoint.x > water.maxX ||
    endpoint.z < water.minZ ||
    endpoint.z > water.maxZ ||
    distance3D(stance, endpoint) > definition.maximumLineMetres ||
    !hasLineOfSight(world, interactionAnchor(actor, stance), endpoint)
  )
    return 'The selected stance or line to the declared endpoint is blocked.';
  if (
    atStance &&
    (worldSupport(actor) !== stance.surfaceId ||
      distance3D(origin, stance) > definition.stanceTolerance)
  )
    return 'The chosen stance is no longer within reach.';
}
export function castBindingProblem(
  world: WorldState,
  actor: Entity,
  source: Entity | undefined,
  itemId: string,
  binding?: CastBinding,
): string | undefined {
  const definition = castDefinition(world, source);
  const item = itemFor(world, itemId);
  const tool = item && world.itemDefinitions[item.definitionId];
  if (!source?.resource?.cast || !definition)
    return 'The selected source no longer supports this cast.';
  if (
    !item ||
    !accessiblePossession(world, actor.id, itemId) ||
    tool?.fishingTool?.kind !== definition.toolKind ||
    availableItemQuantity(world, itemId) < 1
  )
    return definition.toolRequiredText;
  if (
    binding &&
    (!sameDefinitionPin(binding.definition, definitionPin(definition)) ||
      !sameDefinitionPin(binding.source, castSourcePin(source)) ||
      !sameDefinitionPin(binding.tool, itemDefinitionPin(tool)) ||
      binding.output.id !== source.resource.definitionId ||
      !world.itemDefinitions[binding.output.id] ||
      !sameDefinitionPin(
        binding.output,
        itemDefinitionPin(world.itemDefinitions[binding.output.id]!),
      ))
  )
    return 'The selected source, tool or catch definition changed.';
}
export function validateFiniteCasts(world: WorldState): void {
  if (
    !world.castDefinitions ||
    typeof world.castDefinitions !== 'object' ||
    Array.isArray(world.castDefinitions)
  )
    throw new Error('Incompatible development cast definitions. Existing saves were not replaced.');
  for (const [id, definition] of Object.entries(world.castDefinitions))
    if (
      !hasRecordFields(definition, [
        'id',
        'version',
        'toolKind',
        'name',
        'description',
        'actionLabel',
        'availableText',
        'toolRequiredText',
        'supplyUnknownText',
        'workSeconds',
        'chance',
        'maximumLineMetres',
        'stanceTolerance',
        'caughtText',
        'emptyText',
        'exhaustedText',
      ]) ||
      id !== definition.id ||
      !isSafeRecordId(id) ||
      !Number.isSafeInteger(definition.version) ||
      definition.version < 1 ||
      !isSafeRecordId(definition.toolKind) ||
      [
        definition.name,
        definition.description,
        definition.actionLabel,
        definition.availableText,
        definition.toolRequiredText,
        definition.supplyUnknownText,
        definition.caughtText,
        definition.emptyText,
        definition.exhaustedText,
      ].some((text) => typeof text !== 'string' || !text.trim()) ||
      !Number.isFinite(definition.workSeconds) ||
      definition.workSeconds <= 0 ||
      !Number.isFinite(definition.chance) ||
      definition.chance < 0 ||
      definition.chance > 1 ||
      !Number.isFinite(definition.maximumLineMetres) ||
      definition.maximumLineMetres <= 0 ||
      !Number.isFinite(definition.stanceTolerance) ||
      definition.stanceTolerance <= 0
    )
      throw new Error('Invalid installed cast definition.');
  for (const entity of Object.values(world.entities)) {
    const source = entity.resource?.cast;
    if (source) {
      if (
        !hasRecordFields(source, ['definitionId', 'stance', 'endpoint', 'water']) ||
        !hasRecordFields(source.stance, ['x', 'y', 'z', 'surfaceId']) ||
        !hasRecordFields(source.endpoint, ['x', 'y', 'z']) ||
        !hasRecordFields(source.water, ['minX', 'maxX', 'minZ', 'maxZ'])
      )
        throw new Error('Invalid saved finite cast geometry.');
      const values = [
        ...Object.values(source.water ?? {}),
        source.stance?.x,
        source.stance?.y,
        source.stance?.z,
        source.endpoint?.x,
        source.endpoint?.y,
        source.endpoint?.z,
      ];
      if (
        !castDefinition(world, entity) ||
        !world.itemDefinitions[entity.resource!.definitionId] ||
        !Number.isSafeInteger(entity.resource!.quantity) ||
        entity.resource!.quantity < 0 ||
        !Number.isSafeInteger(entity.resource!.revision ?? 0) ||
        !isSafeRecordId(source.stance?.surfaceId) ||
        values.length !== 10 ||
        values.some((value) => !Number.isFinite(value)) ||
        source.water.minX >= source.water.maxX ||
        source.water.minZ >= source.water.maxZ
      )
        throw new Error('Invalid saved finite cast source.');
    }
    const action = entity.actor?.action;
    const activeDefinition =
      action?.type === 'fish'
        ? castDefinition(world, world.entities[action.targetId ?? ''])
        : undefined;
    if (
      action?.type === 'fish' &&
      (!action.fishing ||
        !activeDefinition ||
        action.totalSeconds !== activeDefinition.workSeconds ||
        !Number.isFinite(action.remainingSeconds) ||
        action.remainingSeconds <= 0 ||
        action.remainingSeconds > action.totalSeconds ||
        !['approaching', 'working'].includes(action.stage) ||
        !Array.isArray(action.consumed) ||
        action.consumed.length !== 0 ||
        ![
          action.fishing.definition,
          action.fishing.source,
          action.fishing.tool,
          action.fishing.output,
        ].every(isDefinitionPin) ||
        !action.itemId ||
        !action.targetId ||
        castBindingProblem(
          world,
          entity,
          world.entities[action.targetId],
          action.itemId,
          action.fishing,
        ))
    )
      throw new Error('Invalid saved cast binding.');
  }
}
