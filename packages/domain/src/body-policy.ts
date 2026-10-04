import { renderNameTemplate, validNameTemplate, type Named } from '@open-legend/language';
import { canonicalJson } from './events.js';
import type { Entity, WorldState, MaterialProperty, ItemDefinition } from './types.js';
import type { AttributeDefinition } from './world-modules.js';
import { attributeDefinition, readAttribute } from './world-modules.js';
import { matchesStatusCondition, type StatusCondition } from './status-effects.js';
import { validateStatusCondition } from './status-effect-validation.js';
import { isWalkable } from './spatial.js';
import { bodyProfile } from './spatial-state.js';

/** Finite installed body services. Policy chooses existing outcomes, never authority.
 * docs/projects/next-playable-week/survival.md#installed-body-policy */
export interface BodyPolicy {
  id: string;
  version: number;
  zeroHealth: {
    player: 'incapacitate' | 'die';
    npc: 'incapacitate' | 'die';
    native: 'incapacitate' | 'die';
    incapacitateNarration: string;
    deathNarration: string;
  };
  recovery: null | {
    controllers: Array<'player' | 'npc' | 'native'>;
    when: StatusCondition;
    anchor: 'safeReturnAnchor';
    floors: Array<{ attributeId: string; value: number }>;
    label: string;
    narration: string;
    successText: string;
    refusalText: string;
  };
  revival: { fillToMaximum: string[] };
  consumption: null | {
    attributeId: string;
    quantityProperty: 'nutrition';
    refusals: Array<{ itemType: string; reason: string }>;
    label: string;
    narration: string;
    successText: string;
    unavailableText: string;
    suggestWhen: StatusCondition;
  };
  carryingConcern: null | { attributeId: string; itemProperty: MaterialProperty; text: string };
  backgroundThinking: {
    maintenanceBlockedWhen: StatusCondition | null;
    commitBlockedWhen: StatusCondition | null;
    reflectionBlockedWhen: StatusCondition | null;
    /** The director historically reconsidered at one boundary; intake also watches another. */
    reconsiderationInputs: Array<{ key: string; when: StatusCondition; director: boolean }>;
  };
}
function fields(value: unknown, required: string[]): asserts value is Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    required.some((key) => !Object.hasOwn(value, key)) ||
    Object.keys(value).some((key) => !required.includes(key))
  )
    throw new Error('Invalid body policy fields.');
}
function text(value: unknown, template = false): asserts value is string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > 512 ||
    (template && !validNameTemplate(value, ['subject', 'item']))
  )
    throw new Error('Invalid body policy text.');
}
export function validateBodyPolicy(
  policy: BodyPolicy | null,
  definitions: AttributeDefinition[],
  statusIds?: Set<string>,
  itemDefinitions?: Record<string, ItemDefinition>,
): void {
  if (policy === null) return;
  fields(policy, [
    'id',
    'version',
    'zeroHealth',
    'recovery',
    'revival',
    'consumption',
    'carryingConcern',
    'backgroundThinking',
  ]);
  if (
    typeof policy.id !== 'string' ||
    !/^[a-z][a-z0-9-]{0,39}:[a-z][a-z0-9-]{0,59}$/.test(policy.id) ||
    !Number.isSafeInteger(policy.version) ||
    policy.version < 1
  )
    throw new Error('Invalid body policy identity.');
  const world = { moduleManifest: { definitions } };
  const numeric = (
    id: unknown,
  ): AttributeDefinition & {
    schema: Extract<AttributeDefinition['schema'], { kind: 'number' }>;
  } => {
    const definition = definitions.find((d) => d.id === id);
    if (!definition || definition.schema.kind !== 'number')
      throw new Error('Body policy requires an installed numeric attribute.');
    return definition as AttributeDefinition & {
      schema: Extract<AttributeDefinition['schema'], { kind: 'number' }>;
    };
  };
  const condition = (value: unknown) => validateStatusCondition(world, value, statusIds);
  fields(policy.zeroHealth, ['player', 'npc', 'native', 'incapacitateNarration', 'deathNarration']);
  for (const controller of ['player', 'npc', 'native'] as const)
    if (!['incapacitate', 'die'].includes(policy.zeroHealth[controller]))
      throw new Error('Unsupported zero-health outcome.');
  text(policy.zeroHealth.incapacitateNarration, true);
  text(policy.zeroHealth.deathNarration, true);
  if (policy.recovery !== null) {
    const recovery = policy.recovery;
    fields(recovery, [
      'controllers',
      'when',
      'anchor',
      'floors',
      'label',
      'narration',
      'successText',
      'refusalText',
    ]);
    if (
      !Array.isArray(recovery.controllers) ||
      !recovery.controllers.length ||
      new Set(recovery.controllers).size !== recovery.controllers.length ||
      recovery.controllers.some((c) => !['player', 'npc', 'native'].includes(c)) ||
      recovery.anchor !== 'safeReturnAnchor' ||
      !Array.isArray(recovery.floors)
    )
      throw new Error('Invalid recovery service.');
    condition(recovery.when);
    if (new Set(recovery.floors.map((f) => f.attributeId)).size !== recovery.floors.length)
      throw new Error('Duplicate recovery floor.');
    for (const floor of recovery.floors) {
      fields(floor, ['attributeId', 'value']);
      const definition = numeric(floor.attributeId);
      if (
        !Number.isFinite(floor.value) ||
        floor.value < definition.schema.min ||
        floor.value > definition.schema.max
      )
        throw new Error('Invalid recovery floor.');
    }
    text(recovery.label);
    text(recovery.narration, true);
    text(recovery.successText);
    text(recovery.refusalText);
  }
  fields(policy.revival, ['fillToMaximum']);
  if (
    !Array.isArray(policy.revival.fillToMaximum) ||
    new Set(policy.revival.fillToMaximum).size !== policy.revival.fillToMaximum.length
  )
    throw new Error('Invalid revival meters.');
  policy.revival.fillToMaximum.forEach(numeric);
  if (policy.consumption !== null) {
    const consumption = policy.consumption;
    fields(consumption, [
      'attributeId',
      'quantityProperty',
      'refusals',
      'label',
      'narration',
      'successText',
      'unavailableText',
      'suggestWhen',
    ]);
    numeric(consumption.attributeId);
    if (consumption.quantityProperty !== 'nutrition' || !Array.isArray(consumption.refusals))
      throw new Error('Unsupported consumption service.');
    if (new Set(consumption.refusals.map((r) => r.itemType)).size !== consumption.refusals.length)
      throw new Error('Duplicate consumption refusal.');
    for (const refusal of consumption.refusals) {
      fields(refusal, ['itemType', 'reason']);
      text(refusal.itemType);
      text(refusal.reason);
      if (itemDefinitions && !Object.hasOwn(itemDefinitions, refusal.itemType))
        throw new Error('Missing consumption refusal item definition.');
    }
    text(consumption.label);
    text(consumption.narration, true);
    text(consumption.successText);
    text(consumption.unavailableText);
    condition(consumption.suggestWhen);
  }
  if (policy.carryingConcern !== null) {
    fields(policy.carryingConcern, ['attributeId', 'itemProperty', 'text']);
    numeric(policy.carryingConcern.attributeId);
    text(policy.carryingConcern.itemProperty);
    text(policy.carryingConcern.text);
    if (
      itemDefinitions &&
      !Object.values(itemDefinitions).some((definition) =>
        definition.properties.includes(policy.carryingConcern!.itemProperty),
      )
    )
      throw new Error('Unknown carrying concern item property.');
  }
  const thinking = policy.backgroundThinking;
  fields(thinking, [
    'maintenanceBlockedWhen',
    'commitBlockedWhen',
    'reflectionBlockedWhen',
    'reconsiderationInputs',
  ]);
  for (const predicate of [
    thinking.maintenanceBlockedWhen,
    thinking.commitBlockedWhen,
    thinking.reflectionBlockedWhen,
  ])
    if (predicate !== null) condition(predicate);
  if (
    !Array.isArray(thinking.reconsiderationInputs) ||
    new Set(thinking.reconsiderationInputs.map((v) => v.key)).size !==
      thinking.reconsiderationInputs.length
  )
    throw new Error('Invalid body reconsideration inputs.');
  for (const input of thinking.reconsiderationInputs) {
    fields(input, ['key', 'when', 'director']);
    text(input.key);
    if (typeof input.director !== 'boolean') throw new Error('Invalid reconsideration consumer.');
    condition(input.when);
  }
}
export function bodyPolicy(world: WorldState): BodyPolicy | null {
  return world.moduleManifest.bodyPolicy;
}
export function bodyThinkingBlocked(
  world: WorldState,
  entity: Entity,
  purpose: 'maintenance' | 'commit' | 'reflection',
): boolean {
  const condition = bodyPolicy(world)?.backgroundThinking[`${purpose}BlockedWhen`];
  return (
    !!condition &&
    matchesStatusCondition(
      world,
      { subject: entity, source: entity, actionTarget: entity },
      condition,
    )
  );
}
export function bodyReconsiderationInputs(
  world: WorldState,
  entity: Entity,
  consumer: 'intake' | 'director' = 'intake',
): Array<{ key: string; value: boolean }> {
  return (bodyPolicy(world)?.backgroundThinking.reconsiderationInputs ?? [])
    .filter((input) => consumer === 'intake' || input.director)
    .map((input) => ({
      key: input.key,
      value: matchesStatusCondition(
        world,
        { subject: entity, source: entity, actionTarget: entity },
        input.when,
      ),
    }));
}
export function canRecoverAtCamp(world: WorldState, entity: Entity): boolean {
  const recovery = bodyPolicy(world)?.recovery,
    actor = entity.actor;
  const anchor = world.participationPolicy?.safeReturnAnchor;
  return (
    !!recovery &&
    !!actor?.alive &&
    !!anchor &&
    isWalkable(world, anchor, anchor.surfaceId, bodyProfile(entity)) &&
    recovery.controllers.includes(actor.controller) &&
    !!actor.body &&
    Number.isSafeInteger(actor.body.revision + 1) &&
    recovery.floors.every((floor) => {
      const definition = attributeDefinition(world, floor.attributeId);
      if (!definition || definition.schema.kind !== 'number') return false;
      const value = readAttribute(actor, definition);
      return (
        typeof value === 'number' &&
        (value >= floor.value ||
          definition.implementation === 'native-health-v1' ||
          Number.isSafeInteger((actor.attributes?.[definition.id]?.revision ?? NaN) + 1))
      );
    }) &&
    matchesStatusCondition(
      world,
      { subject: entity, source: entity, actionTarget: entity },
      recovery.when,
    )
  );
}
export function applicableConsumption(
  world: WorldState,
  entity: Entity,
): BodyPolicy['consumption'] {
  const consumption = bodyPolicy(world)?.consumption,
    definition = consumption && attributeDefinition(world, consumption.attributeId);
  return consumption &&
    definition &&
    entity.actor &&
    typeof readAttribute(entity.actor, definition) === 'number'
    ? consumption
    : null;
}
export function bodyNarration(template: string, subject: Entity, item?: Named): string {
  return renderNameTemplate(template, { subject, item });
}

/** Exact eligibility inputs captured before background work; numeric meter drift is rechecked separately. */
export function bodyEligibilityRevision(world: WorldState, entity: Entity): string {
  return canonicalJson({
    manifest: world.moduleManifest.revision,
    bodyPolicy: world.moduleManifest.bodyPolicyPin,
    attributes: world.moduleManifest.pins,
    status: world.statusEffectPolicy.revision,
    cognition: world.cognitionPolicy,
    body: entity.actor?.body,
  });
}
