import { nativeChangesComplete, takeNativeChanges } from './native-change-feed.js';
import { readOnlyDraftView } from './draft.js';
import { entityGet } from './entity-collection.js';
import { activelyParticipates } from './participation-state.js';
import { isStatusDefinitionActive, statusDefinitions } from './status-capabilities.js';
import { statusDefinitionConditions, visitStatusCondition } from './status-condition-references.js';
import { countDomainWork } from './diagnostic-counters.js';
import { isImmutableData } from './records.js';
import { prepareAttributeForecast, readAttribute } from './world-modules.js';
import {
  statusAttributeRates,
  statusBoundary,
  TIME_EPSILON,
  type AttributeRates,
} from './simulation-time.js';
import {
  effectBindings,
  prepareStatusRates,
  reconcileStatusEffects,
  statusFieldValue,
  type EntityReference,
  type StatusCondition,
  type StatusEffectDefinition,
  type StatusRateInterval,
} from './status-effects.js';
import type { Entity, WorldState, WorldEvent } from './types.js';

type Field = Extract<StatusCondition, { field: unknown }>['field']['name'];
type Input = { definition: string; target: EntityReference } & (
  | { kind: 'attribute'; id: string }
  | { kind: 'field'; field: Field }
  | { kind: 'status'; id: string }
);
const compiled = new WeakMap<StatusEffectDefinition[], readonly Input[]>();
function inputs(definitions: StatusEffectDefinition[]): readonly Input[] {
  const retained = compiled.get(definitions);
  if (retained) return retained;
  const result = new Map<string, Input>();
  for (const definition of definitions) {
    const add = (input: Input) =>
      result.set(
        JSON.stringify({
          ...input,
          definition: input.target === '$subject' ? '' : input.definition,
        }),
        input,
      );
    for (const { condition, sourcePath } of statusDefinitionConditions(definition))
      visitStatusCondition(condition, sourcePath, (part) => {
        if ('compare' in part || 'hasAttribute' in part) {
          const leaf = 'compare' in part ? part.compare : part.hasAttribute;
          add({
            definition: definition.id,
            target: leaf.target,
            kind: 'attribute',
            id: leaf.attribute,
          });
        } else if ('field' in part)
          add({
            definition: definition.id,
            target: part.field.target,
            kind: 'field',
            field: part.field.name,
          });
        else if ('statusActive' in part)
          add({
            definition: definition.id,
            target: part.statusActive.target,
            kind: 'status',
            id: part.statusActive.definitionId,
          });
      });
    for (const operation of definition.whileActive) {
      const change =
        'changeRate' in operation
          ? operation.changeRate
          : 'changeEvery' in operation
            ? operation.changeEvery
            : undefined;
      if (change)
        add({
          definition: definition.id,
          target: change.target,
          kind: 'attribute',
          id: change.attribute,
        });
    }
  }
  const value = [...result.values()];
  if (isImmutableData(definitions)) compiled.set(definitions, value);
  return value;
}
function currentStatusDeadline(world: WorldState, entity: Entity, rates: AttributeRates): number {
  let absolute = Infinity;
  const seconds = statusBoundary(
    world,
    [entity.id],
    rates,
    prepareAttributeForecast(world).byId,
    (at) => {
      if (at > world.simTime) absolute = Math.min(absolute, at);
    },
  );
  return Math.min(absolute, world.simTime + Math.max(TIME_EPSILON, seconds));
}
type Entry = {
  definitions: StatusEffectDefinition[];
  manifest: object;
  signature: readonly unknown[];
  from: number;
  until: number;
  rates: StatusRateInterval[];
  attributeRates: ReadonlyMap<string, number>;
  reconciled: boolean;
};
function sameRates(
  local: ReadonlyMap<string, number>,
  current: ReadonlyMap<string, number> | undefined,
): boolean {
  if (local.size !== (current?.size ?? 0)) return false;
  for (const [id, rate] of local) if (rate !== current?.get(id)) return false;
  return true;
}
/** One native continuation's derived rule/rate preparation. Absolute subject deadlines
 * survive another body's arrival. No mutable entity, draft or world is retained.
 * docs/projects/performance-overhaul/animal-execution.md#41-retained-preparation-and-invalidation */
export class NativeStatusPreparation {
  private entries: Map<string, Entry>;
  private checks = new WeakMap<WorldState, Map<string, { entry: Entry; valid: boolean }>>();
  constructor(previous?: NativeStatusPreparation) {
    this.entries = new Map(previous?.entries);
  }

  private signature(
    world: WorldState,
    entity: Entity,
    definitions: StatusEffectDefinition[],
  ): unknown[] | undefined {
    const current = readOnlyDraftView(entity),
      actor = current.actor && readOnlyDraftView(current.actor),
      states = current.statusEffects && readOnlyDraftView(current.statusEffects);
    // Foreign sustained contributions retain their existing lifetime/custody owner.
    if (states && Object.values(states).some((state) => readOnlyDraftView(state).contribution))
      return;
    const result: unknown[] = [
      activelyParticipates(current),
      actor?.alive,
      actor?.incapacitated,
      readOnlyDraftView(world.statusEffectPolicy).clockOffsetHours,
    ];
    const bindings = new Map<string, ReturnType<typeof effectBindings>>();
    const body = actor?.body && readOnlyDraftView(actor.body);
    result.push(body?.maxHealth);
    for (const definition of definitions) {
      const stored = states?.[definition.id],
        state = stored && readOnlyDraftView(stored);
      result.push(
        state?.active,
        state?.episode,
        state?.automaticAfter,
        state?.sourceId,
        state?.actionTargetId,
      );
    }
    for (const input of inputs(definitions)) {
      let target: Entity | undefined = current;
      if (input.target !== '$subject') {
        let binding = bindings.get(input.definition);
        if (!binding) {
          const stored = states?.[input.definition],
            state = stored && readOnlyDraftView(stored);
          bindings.set(
            input.definition,
            (binding = effectBindings(world, current, state?.active ? state : undefined)),
          );
        }
        target = input.target === '$source' ? binding.source : binding.actionTarget;
      }
      // Cross-body fields/statuses need the same conservative treatment as
      // foreign meters. The local change cursor cannot certify their inputs.
      if (!target || target.id !== entity.id) return;
      const value = readOnlyDraftView(target);
      result.push(value.id);
      if (input.kind === 'field') result.push(statusFieldValue(value, input.field));
      else if (input.kind === 'status') {
        result.push(isStatusDefinitionActive(value, input.id, world));
      } else {
        const table = value.actor ? readOnlyDraftView(value.actor).attributes : value.attributes,
          stored = table && readOnlyDraftView(table)[input.id],
          anchor = stored && readOnlyDraftView(stored);
        if (anchor?.value && typeof anchor.value === 'object') return;
        const definition = prepareAttributeForecast(world).byId.get(input.id);
        result.push(
          anchor?.value,
          anchor?.revision,
          definition?.implementation === 'native-health-v1'
            ? readAttribute(world, value, definition)
            : undefined,
        );
        const window = readOnlyDraftView(world).pendingNativeIntegration,
          view = window && readOnlyDraftView(window),
          subject = view && readOnlyDraftView(view.byEntity)[value.id],
          episode = subject && readOnlyDraftView(subject)[input.id],
          storedBinding = episode && view ? readOnlyDraftView(view.bindings)[episode] : undefined,
          arithmetic = storedBinding && readOnlyDraftView(storedBinding),
          operation = arithmetic && readOnlyDraftView(arithmetic.attributes)[input.id];
        result.push(episode, arithmetic?.from);
        if (operation) result.push(...readOnlyDraftView(readOnlyDraftView(operation).rates));
      }
    }
    return result;
  }
  private valid(world: WorldState, entity: Entity): Entry | undefined {
    const entry = this.entries.get(entity.id);
    if (
      !entry ||
      world.simTime < entry.from ||
      world.simTime >= entry.until ||
      readOnlyDraftView(world.moduleManifest) !== entry.manifest ||
      statusDefinitions(world) !== entry.definitions
    )
      return;
    const reusable = nativeChangesComplete(world);
    let checks = reusable ? this.checks.get(world) : undefined;
    if (reusable) {
      const changed = takeNativeChanges(world, this);
      if (!changed) this.checks.set(world, (checks = new Map()));
      else for (const id of changed) checks?.delete(id);
    }
    // Retained signatures are subject-local; foreign inputs do not qualify.
    // Their owned deadline above handles elapsed time. An unrelated body's move
    // must not reconstruct every subject's unchanged rule inputs.
    const cached = checks?.get(entity.id);
    if (cached?.entry === entry) return cached.valid ? entry : undefined;
    const signature = this.signature(world, entity, entry.definitions),
      valid =
        !!signature &&
        signature.length === entry.signature.length &&
        signature.every((value, i) => value === entry.signature[i]);
    if (reusable) {
      if (!checks) this.checks.set(world, (checks = new Map()));
      checks.set(entity.id, { entry, valid });
    }
    return valid ? entry : undefined;
  }
  private retain(
    world: WorldState,
    entity: Entity,
    rates: StatusRateInterval[],
    reconciled: boolean,
  ): void {
    const definitions = statusDefinitions(world);
    if (!isImmutableData(definitions) || !isImmutableData(readOnlyDraftView(world.moduleManifest)))
      return;
    const signature = this.signature(world, entity, definitions);
    if (!signature) {
      this.entries.delete(entity.id);
      return;
    }
    const attributeRates = statusAttributeRates(rates);
    this.entries.set(entity.id, {
      definitions,
      manifest: readOnlyDraftView(world.moduleManifest),
      signature,
      from: world.simTime,
      until: currentStatusDeadline(world, entity, attributeRates),
      rates,
      attributeRates: attributeRates.get(entity.id) ?? new Map(),
      reconciled,
    });
  }
  retainParticipants(ids: readonly string[]): void {
    const current = new Set(ids);
    for (const id of this.entries.keys()) if (!current.has(id)) this.entries.delete(id);
  }
  deadline(world: WorldState, entity: Entity, rates: AttributeRates): number {
    const entry = this.valid(world, entity);
    // A local predicate can depend on a meter changed by another body or by a
    // native drain/replenishment. Reuse only when the complete forecast agrees
    // with the local rates that established this deadline.
    if (entry && sameRates(entry.attributeRates, rates.get(entity.id))) return entry.until;
    return currentStatusDeadline(world, entity, rates);
  }
  reconcile(world: WorldState, entity: Entity, events: WorldEvent[]): void {
    if (this.valid(world, entity)?.reconciled) {
      countDomainWork('nativeStatusReconciliationsAvoided');
      return;
    }
    reconcileStatusEffects(world, entity, events);
    const rates = prepareStatusRates(world, entity, this.entries.get(entity.id)?.rates);
    this.retain(world, entity, rates, true);
  }
  rates(world: WorldState, entity: Entity): StatusRateInterval[] {
    const entry = this.valid(world, entity);
    if (entry) {
      countDomainWork('nativeStatusParticipantsReused');
      return entry.rates;
    }
    const rates = prepareStatusRates(world, entity, this.entries.get(entity.id)?.rates);
    this.retain(world, entity, rates, false);
    return rates;
  }
}
