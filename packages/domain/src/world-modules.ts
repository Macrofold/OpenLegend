import { isDraft, original } from 'immer';
import { validateObserverIdentities } from './worlds/base/knowledge.js';
import { validateKnowledge } from './knowledge.js';
import { DEFAULT_ATTRIBUTES } from './worlds/base/attributes.js';
export { DEFAULT_ATTRIBUTES } from './worlds/base/attributes.js';
import { validateStatusEffects } from './status-effect-validation.js';
import { activeStatusEffects } from './status-capabilities.js';
import { strikeDefinition } from './strikes.js';
import { validateExperienceOrder } from './experience.js';
import { validatePerceptionState } from './perception-frame.js';
import { validateSpatialWorld } from './spatial-state.js';
import { validateInventionAttribution } from './invention-attribution.js';
import { validateItemHandling } from './item-handling.js';
import { validateGatheringTools } from './gathering.js';
import { validateInventionPolicy } from './invention-policy.js';
import { validateAgency } from './agency.js';
import { DEFAULT_SENSES, SENSE_IMPLEMENTATIONS, type SenseDefinition } from './perception.js';
import { hasWildernessNeeds } from './worlds/base/needs.js';
import type { ActorComponent, Entity, WorldState, WorldEvent } from './types.js';
import { canonicalJson, contentLabel, emit } from './events.js';

export type AttributeValue = number | string;
export interface AttributeState {
  value: AttributeValue;
  revision: number;
  concernActive?: boolean;
}
export interface AttributeDefinition {
  id: string;
  version: number;
  implementation:
    | 'native-health-v1'
    | 'native-fullness-v1'
    | 'native-energy-v1'
    | 'reservoir-v1'
    | 'category-v1';
  name: string;
  disclosure: 'public' | 'owner';
  presentation: 'health' | 'food' | 'energy' | 'neutral';
  schema:
    | { kind: 'number'; min: number; max: number; initial: number; unit: string }
    | { kind: 'category'; choices: string[]; initial: string };
  concern?: { below: number; text: string };
  reservoir?: {
    drainPerSecond: number;
    replenishPerSecond: number;
    workSeconds: number;
    actionLabel: string;
  };
}
export interface DefinitionPin {
  id: string;
  version: number;
  digest: string;
}
export interface WorldModuleManifest {
  revision: number;
  interface: 'world-modules-v1';
  physiology: 'wilderness-v1';
  definitions: AttributeDefinition[];
  pins: DefinitionPin[];
  senses: SenseDefinition[];
  defaultSenses: string[];
  sensePins: DefinitionPin[];
}
export interface AttributeView {
  id: string;
  version: number;
  name: string;
  display: 'meter' | 'category';
  presentation: 'health' | 'food' | 'energy' | 'neutral';
  value: AttributeValue | null;
  status: 'known' | 'unknown';
  min?: number;
  max?: number;
  unit?: string;
  concern?: string;
  critical?: boolean;
  revision: number;
}

// Reviewed service bindings, not dynamically imported functions. Definitions cannot
// grant new effects: archive/07-technical-architecture/world-module-runtime.md#2-two-catalogs-with-different-authority.
export const HOST_IMPLEMENTATIONS = Object.freeze({
  'native-health-v1': {
    interface: 'attribute-number-v1',
    owner: 'body',
    execution: 'native',
    storage: 'health',
  },
  'native-fullness-v1': {
    interface: 'attribute-number-v1',
    owner: 'wilderness-needs',
    execution: 'native',
    storage: 'fullness',
  },
  'native-energy-v1': {
    interface: 'attribute-number-v1',
    owner: 'wilderness-needs',
    execution: 'native',
    storage: 'energy',
  },
  'reservoir-v1': {
    interface: 'attribute-number-v1',
    owner: 'reservoir',
    execution: 'native',
    storage: 'attributes',
  },
  'category-v1': {
    interface: 'attribute-category-v1',
    owner: 'category',
    execution: 'passive',
    storage: 'attributes',
  },
} as const);
export function definitionPin(definition: AttributeDefinition | SenseDefinition): DefinitionPin {
  return {
    id: definition.id,
    version: definition.version,
    digest: contentLabel(canonicalJson(definition)),
  };
}
export function createModuleManifest(
  definitions = DEFAULT_ATTRIBUTES,
  senses = DEFAULT_SENSES,
): WorldModuleManifest {
  const manifest: WorldModuleManifest = {
    revision: 1,
    interface: 'world-modules-v1',
    physiology: 'wilderness-v1',
    definitions: structuredClone(definitions),
    pins: definitions.map(definitionPin),
    senses: structuredClone(senses),
    defaultSenses: DEFAULT_SENSES.map((s) => s.id),
    sensePins: senses.map(definitionPin),
  };
  validateModuleManifest(manifest);
  return manifest;
}
const namespace = /^[a-z][a-z0-9-]{0,39}:[a-z][a-z0-9-]{0,59}$/;
function object(value: unknown, keys: string[]): asserts value is Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((k) => !keys.includes(k))
  )
    throw new Error('Invalid module fields.');
}
function boundedText(value: unknown, max: number): boolean {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}
function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
// Validate supported definitions and their dependencies, not a small collection-count quota.
// docs/architecture.md#content-counts-and-request-limits
export function validateModuleManifest(manifest: WorldModuleManifest): void {
  object(manifest, [
    'revision',
    'interface',
    'physiology',
    'definitions',
    'pins',
    'senses',
    'defaultSenses',
    'sensePins',
  ]);
  if (
    manifest.interface !== 'world-modules-v1' ||
    manifest.physiology !== 'wilderness-v1' ||
    !Number.isSafeInteger(manifest.revision) ||
    manifest.revision < 1 ||
    !Array.isArray(manifest.definitions) ||
    !Array.isArray(manifest.pins) ||
    manifest.pins.length !== manifest.definitions.length
  )
    throw new Error('Unsupported world module manifest.');
  if (
    !Array.isArray(manifest.senses) ||
    !Array.isArray(manifest.sensePins) ||
    manifest.sensePins.length !== manifest.senses.length ||
    !Array.isArray(manifest.defaultSenses) ||
    new Set(manifest.defaultSenses).size !== manifest.defaultSenses.length
  )
    throw new Error('Invalid sense bindings.');
  const senseIds = new Set<string>(),
    detectors = new Set<string>();
  for (const sense of manifest.senses) {
    object(sense, ['id', 'version', 'implementation', 'radius']);
    if (
      !namespace.test(sense.id) ||
      senseIds.has(sense.id) ||
      sense.version !== 1 ||
      !SENSE_IMPLEMENTATIONS.includes(sense.implementation) ||
      !finite(sense.radius) ||
      (sense.implementation === 'body-contact-v1'
        ? sense.radius !== 0
        : sense.radius <= 0 || sense.radius > 32)
    )
      throw new Error('Unsupported sense definition.');
    if (detectors.has(sense.implementation)) throw new Error('Duplicate sense detector owner.');
    detectors.add(sense.implementation);
    senseIds.add(sense.id);
    const pin = manifest.sensePins.find((p) => p.id === sense.id);
    if (canonicalJson(pin) !== canonicalJson(definitionPin(sense)))
      throw new Error('Missing exact sense dependency.');
  }
  if (manifest.defaultSenses.some((id) => !senseIds.has(id)))
    throw new Error('Missing default sense.');
  const ids = new Set<string>(),
    owners = new Set<string>();
  for (const d of manifest.definitions) {
    object(d, [
      'id',
      'version',
      'implementation',
      'name',
      'disclosure',
      'presentation',
      'schema',
      'concern',
      'reservoir',
    ]);
    if (
      !namespace.test(d.id) ||
      ids.has(d.id) ||
      !Number.isSafeInteger(d.version) ||
      d.version < 1 ||
      !Object.hasOwn(HOST_IMPLEMENTATIONS, d.implementation) ||
      !boundedText(d.name, 64) ||
      !['public', 'owner'].includes(d.disclosure) ||
      !['health', 'food', 'energy', 'neutral'].includes(d.presentation)
    )
      throw new Error('Invalid attribute identity or host implementation.');
    ids.add(d.id);
    const host = HOST_IMPLEMENTATIONS[d.implementation];
    const owner = host.storage === 'attributes' ? d.id : host.storage;
    if (owners.has(owner)) throw new Error('Duplicate attribute state owner.');
    owners.add(owner);
    object(
      d.schema,
      d.implementation === 'category-v1'
        ? ['kind', 'choices', 'initial']
        : ['kind', 'min', 'max', 'initial', 'unit'],
    );
    if (d.schema.kind === 'number') {
      const s = d.schema;
      if (
        d.implementation === 'category-v1' ||
        ![s.min, s.max, s.initial].every(finite) ||
        s.min >= s.max ||
        Math.abs(s.min) > 1e9 ||
        Math.abs(s.max) > 1e9 ||
        s.initial < s.min ||
        s.initial > s.max ||
        !boundedText(s.unit, 24)
      )
        throw new Error('Invalid attribute range or units.');
    } else if (
      d.schema.kind !== 'category' ||
      d.implementation !== 'category-v1' ||
      !Array.isArray(d.schema.choices) ||
      d.schema.choices.length < 1 ||
      d.schema.choices.some((c) => !boundedText(c, 64)) ||
      new Set(d.schema.choices).size !== d.schema.choices.length ||
      !d.schema.choices.includes(d.schema.initial)
    )
      throw new Error('Invalid categorical attribute.');
    if (d.concern) {
      object(d.concern, ['below', 'text']);
      if (
        d.schema.kind !== 'number' ||
        !finite(d.concern.below) ||
        d.concern.below < d.schema.min ||
        d.concern.below > d.schema.max ||
        !boundedText(d.concern.text, 160)
      )
        throw new Error('Invalid concern projection.');
    }
    if (d.reservoir) {
      object(d.reservoir, ['drainPerSecond', 'replenishPerSecond', 'workSeconds', 'actionLabel']);
      if (
        d.implementation !== 'reservoir-v1' ||
        d.schema.kind !== 'number' ||
        !finite(d.reservoir.drainPerSecond) ||
        d.reservoir.drainPerSecond < 0 ||
        d.reservoir.drainPerSecond > 100 ||
        !finite(d.reservoir.replenishPerSecond) ||
        d.reservoir.replenishPerSecond <= 0 ||
        d.reservoir.replenishPerSecond > 100 ||
        !finite(d.reservoir.workSeconds) ||
        d.reservoir.workSeconds <= 0 ||
        d.reservoir.workSeconds > 3600 ||
        !boundedText(d.reservoir.actionLabel, 64)
      )
        throw new Error('Invalid reservoir work limits.');
    }
    // Native body semantics remain fixed until their owning family supports revision.
    const native = DEFAULT_ATTRIBUTES.find((a) => a.implementation === d.implementation);
    if (native && canonicalJson(native) !== canonicalJson(d))
      throw new Error('Native wilderness bindings require their exact reviewed definition.');
    const pin = manifest.pins.find((p) => p.id === d.id);
    if (!pin || canonicalJson(pin) !== canonicalJson(definitionPin(d)))
      throw new Error('Missing or changed exact definition pin.');
  }
  for (const native of DEFAULT_ATTRIBUTES)
    if (!ids.has(native.id)) throw new Error('Missing required wilderness body/need binding.');
}
export function attributeDefinition(
  world: WorldState,
  id: string,
): AttributeDefinition | undefined {
  // Definitions are replaced at admission, never edited during a native step.
  // docs/performance.md#simulation-cpu-and-growing-history
  const manifest = world.moduleManifest;
  return (isDraft(manifest) ? original(manifest)! : manifest)?.definitions.find((d) => d.id === id);
}
export function readAttribute(
  actor: ActorComponent,
  definition: AttributeDefinition,
): AttributeValue | undefined {
  const storage = HOST_IMPLEMENTATIONS[definition.implementation].storage;
  if (storage === 'attributes') return actor.attributes?.[definition.id]?.value;
  // The native adapter projects body-relative percent without copying authoritative health.
  if (storage === 'health') return (actor.health / (actor.body?.maxHealth ?? 100)) * 100;
  if (storage === 'energy') return actor.energy;
  if (!hasWildernessNeeds(actor)) return undefined;
  return actor[storage];
}
export function applicableAttributes(
  world: WorldState,
  actor: ActorComponent,
): AttributeDefinition[] {
  return world.moduleManifest.definitions.filter((d) => readAttribute(actor, d) !== undefined);
}
export function validateAttributeValue(
  d: AttributeDefinition,
  value: unknown,
): asserts value is AttributeValue {
  if (
    d.schema.kind === 'number'
      ? !finite(value) || value < d.schema.min || value > d.schema.max
      : typeof value !== 'string' || !d.schema.choices.includes(value)
  )
    throw new Error(`Invalid value for ${d.id}.`);
}
// Sole sparse-state writer. Semantic commands authorize the cause before reaching
// this owner: archive/07-technical-architecture/world-module-runtime.md#4-typed-state-and-attributes.
export function setAttribute(
  world: WorldState,
  entity: Entity,
  d: AttributeDefinition,
  value: AttributeValue,
  events: WorldEvent[],
): boolean {
  validateAttributeValue(d, value);
  const storage = HOST_IMPLEMENTATIONS[d.implementation].storage;
  if (storage !== 'attributes')
    throw new Error('Native state must use its owning body/need operation.');
  const prior = (entity.actor?.attributes ?? entity.attributes)?.[d.id];
  if (!prior) throw new Error('Attribute is not applicable to this entity.');
  if (prior.value === value) return false;
  const wasConcerned =
    prior.concernActive ??
    (d.concern && typeof prior.value === 'number' ? prior.value < d.concern.below : false);
  prior.value = value;
  prior.revision++;
  if (d.concern && d.schema.kind === 'number' && typeof value === 'number') {
    // A small dead band prevents drain/transfer in one step from creating repeated novelty.
    const recovery = Math.min(d.schema.max, d.concern.below + (d.schema.max - d.schema.min) * 0.05);
    const concerned = wasConcerned ? value < recovery : value < d.concern.below;
    prior.concernActive = concerned;
    if (concerned !== wasConcerned)
      emit(
        world,
        events,
        'attribute-concern',
        concerned ? d.concern.text : `${d.name} is no longer low.`,
        entity,
        undefined,
        {
          attributeId: d.id,
          definitionVersion: d.version,
          attributeRevision: prior.revision,
          semanticTrigger: true,
          importance: 6,
          urgency: concerned ? 4 : 1,
        },
        'private',
      );
  }
  return true;
}
export function initializeAttributes(
  actor: ActorComponent,
  definitions: AttributeDefinition[],
): void {
  for (const d of definitions) {
    if (HOST_IMPLEMENTATIONS[d.implementation].storage !== 'attributes')
      throw new Error('Cannot initialize a second native state owner.');
    if (actor.attributes?.[d.id]) throw new Error('Attribute already initialized.');
    (actor.attributes ??= {})[d.id] = {
      value: d.schema.initial,
      revision: 0,
      ...(d.concern && typeof d.schema.initial === 'number'
        ? { concernActive: d.schema.initial < d.concern.below }
        : {}),
    };
  }
}
export function projectAttributes(
  world: WorldState,
  entity: Entity,
  audience: 'owner' | 'public',
): AttributeView[] {
  if (!entity.actor) return [];
  return applicableAttributes(world, entity.actor)
    .filter((d) => audience === 'owner' || d.disclosure === 'public')
    .map((d) => {
      const value = readAttribute(entity.actor!, d);
      const max = d.schema.kind === 'number' ? d.schema.max : undefined;
      const threshold = d.concern?.below;
      return {
        id: d.id,
        version: d.version,
        name: d.name,
        display: d.schema.kind === 'number' ? 'meter' : 'category',
        presentation: d.presentation,
        value: value ?? null,
        status: value === undefined ? 'unknown' : 'known',
        critical:
          typeof value === 'number' &&
          (d.reservoir
            ? !!entity.actor!.attributes?.[d.id]?.concernActive
            : Math.round(value) <= (max ?? 100) * 0.2),
        revision: entity.actor!.attributes?.[d.id]?.revision ?? entity.actor!.body?.revision ?? 0,
        ...(d.schema.kind === 'number' ? { min: d.schema.min, max, unit: d.schema.unit } : {}),
        ...(audience === 'owner' &&
        (entity.actor!.attributes?.[d.id]?.concernActive ??
          (threshold !== undefined && typeof value === 'number' && value < threshold))
          ? { concern: d.concern!.text }
          : {}),
      };
    });
}
export function bodyContext(world: WorldState, entity: Entity): string {
  const actor = entity.actor!;
  return [
    // Qualitative concerns supplement measurements; they must not replace them.
    // docs/memory-architecture.md#3-one-compact-model-facing-context
    ...projectAttributes(world, entity, 'owner').flatMap((v) => {
      const fullness = attributeDefinition(world, v.id)?.implementation === 'native-fullness-v1';
      const name = fullness ? `${v.name} (fullness; lower means hungrier)` : v.name;
      const measurement =
        v.status === 'unknown'
          ? `${name}: unknown.`
          : v.display === 'meter'
            ? `${name}: ${typeof v.value === 'number' ? Number(v.value.toFixed(1)) : v.value}${v.unit ? ` ${v.unit}` : ''} (range ${v.min}–${v.max}${v.unit ? ` ${v.unit}` : ''}).`
            : `${name}: ${v.value}.`;
      return v.concern ? [measurement, v.concern] : [measurement];
    }),
    ...activeStatusEffects(world, entity)
      .filter((d) => d.actions)
      .map((d) => `I am ${d.label.toLowerCase()}.`),
    `Current activity: ${actor.action?.type ?? 'idle'}.`,
  ].join(' ');
}
export function advanceReservoirs(
  world: WorldState,
  entity: Entity,
  seconds: number,
  events: WorldEvent[],
): void {
  const actor = entity.actor!;
  if (!actor.attributes) return;
  for (const [id, state] of Object.entries(actor.attributes)) {
    const d = attributeDefinition(world, id)!;
    if (d.reservoir && d.schema.kind === 'number')
      setAttribute(
        world,
        entity,
        d,
        Math.max(d.schema.min, (state.value as number) - d.reservoir.drainPerSecond * seconds),
        events,
      );
  }
}
export function validateWorldModules(world: WorldState): void {
  validateKnowledge(world);
  validateObserverIdentities(world);
  // Disposable development saves use current-state validation, not per-feature version gates.
  // docs/save-and-load.md#active-development-policy
  if (!world.moduleManifest) throw new Error('World module manifest is missing.');
  validateStatusEffects(world);
  validateSpatialWorld(world);
  validatePerceptionState(world);
  validateInventionPolicy(world.inventionPolicy);
  validateInventionAttribution(world);
  validateGatheringTools(world);
  validateItemHandling(world);
  for (const recipe of Object.values(world.recipes)) {
    const authority = recipe.provenance?.authority;
    if (
      !authority ||
      !['player', 'agent'].includes(authority.origin) ||
      !Number.isSafeInteger(authority.policyRevision) ||
      authority.policyRevision < 1 ||
      authority.policyRevision > world.inventionPolicy.revision
    )
      throw new Error('Missing or invalid saved invention origin.');
  }
  validateAgency(world);
  validateExperienceOrder(world);
  validateModuleManifest(world.moduleManifest);
  for (const e of Object.values(world.entities)) {
    if (e.actor)
      for (const definition of world.moduleManifest.definitions) {
        const value = readAttribute(e.actor, definition);
        if (value !== undefined) validateAttributeValue(definition, value);
      }
    if (
      e.actor?.capabilities?.needs !== false &&
      e.actor &&
      (!Number.isFinite(e.actor.fullness) || !Number.isFinite(e.actor.energy))
    )
      throw new Error('Missing required wilderness needs.');
    if (
      e.actor?.senses &&
      (new Set(e.actor.senses).size !== e.actor.senses.length ||
        e.actor.senses.some((id) => !world.moduleManifest!.senses.some((s) => s.id === id)))
    )
      throw new Error('Missing actor sense binding.');
    for (const contact of Object.values(e.actor?.contacts ?? {})) {
      object(contact, ['id', 'senseId', 'detail', 'enteredAt', 'changedAt']);
      if (
        !boundedText(contact.id, 100) ||
        !world.moduleManifest.senses.some(
          (s) => s.id === contact.senseId && s.implementation === 'body-contact-v1',
        ) ||
        !['present', 'moving'].includes(contact.detail) ||
        !finite(contact.enteredAt) ||
        !finite(contact.changedAt)
      )
        throw new Error('Invalid saved contact episode.');
    }
    for (const [id, state] of Object.entries(e.actor?.attributes ?? {})) {
      const d = attributeDefinition(world, id);
      if (!d || HOST_IMPLEMENTATIONS[d.implementation].storage !== 'attributes')
        throw new Error('Missing attribute definition or duplicate native value.');
      object(state, ['value', 'revision', 'concernActive']);
      if (d.concern ? typeof state.concernActive !== 'boolean' : state.concernActive !== undefined)
        throw new Error('Invalid concern episode.');
      validateAttributeValue(d, state.value);
      if (!Number.isSafeInteger(state.revision) || state.revision < 0)
        throw new Error('Invalid attribute revision.');
    }
    if (e.replenisher) {
      object(e.replenisher, ['attributeId', 'remaining']);
      if (
        !attributeDefinition(world, e.replenisher.attributeId)?.reservoir ||
        !finite(e.replenisher.remaining) ||
        e.replenisher.remaining < 0 ||
        e.replenisher.remaining > 1e9
      )
        throw new Error('Invalid replenishment source.');
    }
    if (
      e.actor?.action?.type === 'strike' &&
      (!strikeDefinition(e.actor.action.definitionId) ||
        strikeDefinition(e.actor.action.definitionId)?.version !== e.actor.action.definitionVersion)
    )
      throw new Error('Missing active strike definition.');
    if (
      e.actor?.action?.type === 'replenish' &&
      (!attributeDefinition(world, e.actor.action.attributeId ?? '')?.reservoir ||
        attributeDefinition(world, e.actor.action.attributeId ?? '')?.version !==
          e.actor.action.definitionVersion)
    )
      throw new Error('Missing active action definition.');
  }
}
