import { validateStatusInstallation } from './native-work.js';
import { isSafeRecordId } from './records.js';
import { canonicalJson, contentLabel } from './events.js';
import {
  validContributionLifetime,
  capabilityContributionDefinition,
} from './state-contributions.js';
import { attributeDefinition, validateAttributeValue } from './world-modules.js';
import type {
  StatusEffectPolicy,
  StatusEffectDefinition,
  StatusCondition,
  EntityReference,
} from './status-effects.js';
import type { WorldState } from './types.js';
const refs: EntityReference[] = ['$subject', '$source', '$actionTarget'];
function fail(message: string): never {
  throw new Error(`Invalid status effect: ${message}`);
}
function object(
  value: unknown,
  required: string[],
  optional: string[] = [],
): asserts value is Record<string, any> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    required.some((k) => !Object.hasOwn(value, k)) ||
    Object.keys(value).some((k) => !required.includes(k) && !optional.includes(k))
  )
    fail('unknown or missing fields.');
}
function number(value: unknown, min = -Infinity, max = Infinity): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
    fail('numeric value out of range.');
}
function text(value: unknown, max = 256): void {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail('invalid text.');
}
function reference(value: unknown): void {
  if (!refs.includes(value as EntityReference)) fail('unbound target reference.');
}
function attribute(world: WorldState, id: unknown, writable: boolean): void {
  const d = typeof id === 'string' ? attributeDefinition(world, id) : undefined;
  if (
    !d ||
    d.schema.kind !== 'number' ||
    (writable &&
      !['native-energy-v1', 'native-fullness-v1', 'reservoir-v1'].includes(d.implementation))
  )
    fail('attribute missing, nonnumeric or not writable by this operation.');
}
function condition(
  world: WorldState,
  value: unknown,
  ids: Set<string>,
  depth = 0,
  budget = { remaining: 128 },
): asserts value is StatusCondition {
  if (depth > 12 || --budget.remaining < 0) fail('condition exceeds evaluation complexity limit.');
  object(value, [], ['all', 'any', 'compare', 'field', 'dailyWindow', 'statusActive']);
  if (Object.keys(value).length !== 1) fail('condition must contain one operator.');
  if ('all' in value || 'any' in value) {
    const children = value.all ?? value.any;
    if (!Array.isArray(children) || !children.length) fail('empty condition group.');
    for (const child of children) condition(world, child, ids, depth + 1, budget);
  } else if ('compare' in value) {
    const c = value.compare;
    object(c, ['target', 'attribute', 'operator', 'value']);
    reference(c.target);
    attribute(world, c.attribute, false);
    number(c.value);
    if (
      !['equal', 'notEqual', 'lessThan', 'lessThanOrEqual', 'greaterThanOrEqual'].includes(
        c.operator,
      )
    )
      fail('unsupported comparison.');
  } else if ('field' in value) {
    const c = value.field;
    object(c, ['target', 'name', 'operator', 'value']);
    reference(c.target);
    if (
      !['controller', 'alive', 'incapacitated', 'grounded', 'activeWork', 'kind'].includes(
        c.name,
      ) ||
      !['equal', 'notEqual'].includes(c.operator)
    )
      fail('unsupported field.');
    if (
      ['controller', 'kind'].includes(c.name)
        ? typeof c.value !== 'string'
        : typeof c.value !== 'boolean'
    )
      fail('field value type.');
  } else if ('dailyWindow' in value) {
    const c = value.dailyWindow;
    object(c, ['target', 'clock', 'start', 'end']);
    number(c.start, 0, 23.999999);
    number(c.end, 0, 23.999999);
    if (c.target !== '$world' || c.clock !== 'localTime' || c.start === c.end)
      fail('invalid clock/window.');
  } else {
    const c = value.statusActive;
    object(c, ['target', 'definitionId', 'value']);
    reference(c.target);
    if (!ids.has(c.definitionId) || typeof c.value !== 'boolean') fail('unknown status reference.');
  }
}
export function validateStatusEffectPolicy(
  world: WorldState,
  value: unknown,
): asserts value is StatusEffectPolicy {
  object(value, ['revision', 'clockOffsetHours', 'definitions']);
  if (!Number.isSafeInteger(value.revision) || value.revision < 1) fail('revision.');
  number(value.clockOffsetHours, 0, 23.999999);
  if (!Array.isArray(value.definitions)) fail('definition budget exceeded.');
  const ids = new Set<string>();
  for (const d of value.definitions) {
    if (!d || !isSafeRecordId(d.id) || ids.has(d.id)) fail('invalid or duplicate ID.');
    ids.add(d.id);
  }
  for (const d of value.definitions) {
    object(
      d,
      [
        'id',
        'type',
        'target',
        'label',
        'enabled',
        'requires',
        'reactivationDelaySeconds',
        'occupiesAction',
        'interruptOn',
        'whileActive',
      ],
      [
        'activationCondition',
        'automaticActivation',
        'automaticDeactivation',
        'presentation',
        'onActivate',
        'onDeactivate',
        'actions',
        'contribution',
      ],
    );
    if (
      d.type !== 'statusEffect' ||
      d.target !== '$subject' ||
      typeof d.enabled !== 'boolean' ||
      typeof d.occupiesAction !== 'boolean'
    )
      fail('definition type or target.');
    if (d.contribution) {
      object(d.contribution, ['disclosure', 'lifetime'], ['seconds']);
      if (
        !capabilityContributionDefinition(d as unknown as StatusEffectDefinition) ||
        !['public', 'owner'].includes(d.contribution.disclosure) ||
        !['explicit-removal', 'source-sustained', 'fixed'].includes(d.contribution.lifetime) ||
        (d.contribution.lifetime === 'fixed'
          ? !Number.isFinite(d.contribution.seconds) || d.contribution.seconds <= 0
          : d.contribution.seconds !== undefined)
      )
        fail('unsupported contribution family or lifetime.');
    }
    text(d.label);
    number(d.reactivationDelaySeconds, 0, 86400);
    if (!Array.isArray(d.interruptOn) || d.interruptOn.length > 32) fail('interrupt reasons.');
    d.interruptOn.forEach((s: unknown) => text(s, 64));
    condition(world, d.requires, ids);
    for (const key of ['activationCondition', 'automaticActivation', 'automaticDeactivation'])
      if (d[key] !== undefined) condition(world, d[key], ids);
    if (!Array.isArray(d.whileActive) || !d.whileActive.length || d.whileActive.length > 32)
      fail('operation budget.');
    for (const op of d.whileActive) {
      object(op, [], ['changeRate', 'when', 'restrictCapabilities']);
      if ('changeRate' in op && !('restrictCapabilities' in op)) {
        const c = op.changeRate;
        object(c, ['target', 'attribute', 'amount', 'per']);
        reference(c.target);
        attribute(world, c.attribute, true);
        number(c.amount, -1000000, 1000000);
        if (c.per !== 'gameSecond') fail('rate unit.');
        if (op.when !== undefined) condition(world, op.when, ids);
      } else if ('restrictCapabilities' in op && !('changeRate' in op) && !('when' in op)) {
        const c = op.restrictCapabilities;
        object(c, ['target', 'capabilities']);
        if (
          c.target !== '$subject' ||
          !Array.isArray(c.capabilities) ||
          !c.capabilities.length ||
          c.capabilities.some(
            (s: unknown) =>
              !['actions', 'locomotion', 'speech', 'perception'].includes(s as string),
          )
        )
          fail('capability restriction.');
      } else fail('unsupported operation.');
    }
    if (d.presentation !== undefined) {
      object(d.presentation, [], ['pose', 'particle']);
      if (d.presentation.pose !== undefined && d.presentation.pose !== 'horizontal') fail('pose.');
      if (d.presentation.particle !== undefined) {
        const c = d.presentation.particle;
        object(c, ['text', 'anchor', 'motion']);
        text(c.text, 32);
        if (c.anchor !== 'head' || c.motion !== 'floatAway') fail('particle.');
      }
    }
    if (d.actions !== undefined) {
      object(d.actions, ['activate', 'deactivate', 'allowOther', 'activateOther']);
      text(d.actions.activate);
      text(d.actions.deactivate);
      if (typeof d.actions.allowOther !== 'boolean' || typeof d.actions.activateOther !== 'boolean')
        fail('action scope.');
    }
    for (const key of ['onActivate', 'onDeactivate'])
      if (d[key] !== undefined) {
        object(d[key], ['emit']);
        const c = d[key].emit;
        object(c, ['target', 'type', 'narration']);
        reference(c.target);
        text(c.narration, 512);
        if (
          c.type !== 'stateChanged' ||
          /\{(?!subject\.name\}|source\.name\}|actionTarget\.name\})/.test(c.narration)
        )
          fail('event template.');
      }
  }
  validateStatusInstallation(world, value as unknown as StatusEffectPolicy);
}
export function validateStatusEffects(world: WorldState): void {
  validateStatusEffectPolicy(world, world.statusEffectPolicy);
  for (const entity of Object.values(world.entities)) {
    if (entity.actor && entity.attributes) fail('duplicate attribute owner.');
    for (const [id, state] of Object.entries(entity.attributes ?? {})) {
      const d = attributeDefinition(world, id);
      if (!d || !['reservoir-v1', 'category-v1'].includes(d.implementation))
        fail('object attribute binding.');
      validateAttributeValue(d, state.value);
      if (!Number.isSafeInteger(state.revision) || state.revision < 0) fail('attribute revision.');
    }
    for (const [id, state] of Object.entries(entity.statusEffects ?? {})) {
      const d = world.statusEffectPolicy.definitions.find(
        (d) => d.id === (state.contribution?.definitionId ?? id),
      );
      if (!d) fail('unknown saved definition.');
      if (state.active && !entity.actor && entity.placement?.mode !== 'world')
        fail('contained processing requires an admitted continuation.');
      object(
        state,
        ['active', 'episode', 'elapsedSeconds', 'automaticAfter', 'sourceId', 'actionTargetId'],
        ['contribution'],
      );
      if (state.contribution) {
        const contribution = state.contribution;
        object(contribution, ['definitionId', 'definitionDigest', 'revision', 'lifetime']);
        if (
          !entity.actor ||
          !capabilityContributionDefinition(d) ||
          !d.contribution ||
          contribution.lifetime.kind !== d.contribution.lifetime ||
          id !== state.episode ||
          !Number.isSafeInteger(contribution.revision) ||
          contribution.revision < 1 ||
          contribution.definitionDigest !== contentLabel(canonicalJson(d)) ||
          !validContributionLifetime(contribution.lifetime, 0)
        )
          fail('invalid contribution.');
      }
      if (
        typeof state.active !== 'boolean' ||
        !isSafeRecordId(state.episode) ||
        !isSafeRecordId(state.sourceId) ||
        !isSafeRecordId(state.actionTargetId)
      )
        fail('invalid saved instance.');
      number(state.elapsedSeconds, 0);
      number(state.automaticAfter, 0);
      if (
        state.active &&
        d.occupiesAction &&
        (!entity.actor?.alive ||
          entity.actor.incapacitated ||
          entity.actor.action?.id !== state.episode ||
          entity.actor.action.definitionId !== id)
      )
        fail('instance/action mismatch.');
    }
    const action = entity.actor?.action;
    if (
      action?.type === 'status-effect' &&
      (!entity.statusEffects?.[action.definitionId!]?.active ||
        entity.statusEffects[action.definitionId!]!.episode !== action.id)
    )
      fail('action/instance mismatch.');
  }
}
