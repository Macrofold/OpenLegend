import {
  competenceValue,
  initializePractice,
  setStartingPractice,
  validatePractice,
  validatePracticeProfile,
} from './practical-competence.js';
import { validateCoaching } from './coaching.js';
import { validNarrationTemplate } from '@open-legend/language';
import {
  narrationTemplate,
  renderNarration,
  subjectNarration,
  presentVerb,
  validateNarration,
} from './narration.js';
import { validName } from '@open-legend/language';
import { validatePlaces } from './places.js';
import { validateFamilyTree } from './worlds/base/family.js';
import { validateAppraisalPolicy, validateAppraisals, type AppraisalPolicy } from './appraisals.js';
import { BASE_APPRAISAL_POLICY } from './worlds/base/appraisals.js';
import { recordSemanticChange } from './dependencies.js';
import { validateNativeWork } from './native-work.js';
import { validateWorkState } from './work-budget.js';
import { validateParticipation } from './participation.js';
import { isDraft, original, freeze } from 'immer';
import { validateObserverIdentities } from './worlds/base/knowledge.js';
import { validateKnowledge } from './knowledge.js';
import { DEFAULT_ATTRIBUTES } from './worlds/base/attributes.js';
export { DEFAULT_ATTRIBUTES } from './worlds/base/attributes.js';
import { validateStatusEffects } from './status-effect-validation.js';
import { activeStatusEffects } from './status-capabilities.js';
import { strikeDefinition, validMelee, validateNativeStrikes } from './strikes.js';
import {
  conditionText,
  reconcileConditions,
  canNoticeInternalChange,
  validateConditionPolicy,
  validateConditionEpisodes,
  type ConditionPolicy,
} from './conditions.js';
import { validatePerceptionState } from './perception-frame.js';
import { DEFAULT_ACOUSTICS, validateAcoustics, type AcousticPolicy } from './acoustics.js';
import { validateSpatialWorld } from './spatial-state.js';
import { validateInventionAttribution } from './invention-attribution.js';
import { validateItemHandling } from './item-handling.js';
import { validateGatheringTools } from './gathering.js';
import { validateInventionPolicy } from './invention-policy.js';
import { validateActionExperience } from './action-experience.js';
import { validateActivityHostPins } from './activity-hosts.js';
import { activityHostForCommand } from './activity-hosts.js';
import { isDefinitionPin, sameDefinitionPin } from './state-owners.js';
import { isFuel } from './worlds/base/fire.js';
import { validateAgency } from './agency.js';
import { assertReservedStock, validateResourceReservations } from './resource-claims.js';
import { DEFAULT_SENSES, SENSE_IMPLEMENTATIONS, type SenseDefinition } from './perception.js';
import { bodyPolicy, validateBodyPolicy, type BodyPolicy } from './body-policy.js';
import { validateReincarnation } from './reincarnation.js';
import { validateTerritorialThreats } from './territorial-threat.js';
import { validateCognitionPolicy } from './cognition-policy.js';
import { BASE_RECIPE_FAMILIES } from './worlds/base/recipe-families.js';
import { validateInstalledRecipes, type RecipeFamilyDescriptor } from './invention-families.js';
import type { ActorComponent, Entity, ItemDefinition, WorldState, WorldEvent } from './types.js';
import { canonicalJson, contentLabel, emit } from './events.js';
import { hasRecordFields, isSafeRecordId } from './records.js';
import { validateEquipment } from './equipment.js';
import { validateContactDefense } from './contact-defense.js';
import { TIME_EPSILON } from './simulation-time.js';
import { BASE_TIME_POLICY } from './worlds/base/time.js';
import { validateOutings } from './outings.js';

export type AttributeValue = number | string;
/** Consequences of advanceReservoirs and kernel's native replenish action. These
 * describe the supported host, not a promise that a world supplies a charging source. */
export const RESERVOIR_CONSUMER_GUIDE = {
  drain: 'Drain continues during replenishment; work does not suspend it.',
  replenish:
    'Replenishment transfers from a nearby compatible finite supply, bounded by its stock, recipient capacity and remaining work time. Defining or attaching the reservoir creates no supply.',
  netChange:
    'Transferred amount is not net gain. Away from bounds and other effects, net rate is replenishPerSecond minus drainPerSecond; equal rates maintain the value while consuming supply.',
} as const;
export interface AttributeState {
  value: AttributeValue;
  revision: number;
  concernActive?: boolean;
}
export type AttributeCriticalPredicate =
  | {
      compare: {
        operator: 'lessThan' | 'lessThanOrEqual';
        value: number;
        rounding: 'none' | 'nearest-integer';
      };
    }
  | { concernActive: true };
export interface AttributeDefinition {
  practice?: import('./practical-competence.js').PracticeProfile;
  meaning?: string;
  condition?: ConditionPolicy;
  id: string;
  version: number;
  implementation:
    | 'native-health-v1'
    | 'number-v1'
    | 'reservoir-v1'
    | 'category-v1'
    | 'finite-practice-v1';
  name: string;
  disclosure: 'public' | 'owner';
  presentation: { icon: string; color: string };
  schema:
    | { kind: 'number'; min: number; max: number; initial: number; unit: string }
    | { kind: 'category'; choices: string[]; initial: string };
  concern?: {
    below: number;
    text: string;
    mode: 'instant' | 'latched';
    notify: boolean;
    reconsider: boolean;
    recoveryMargin?: number;
  };
  critical?: AttributeCriticalPredicate;
  editorCritical?: AttributeCriticalPredicate;
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
  appraisals?: AppraisalPolicy;
  revision: number;
  interface: 'world-modules-v1';
  bodyPolicy: BodyPolicy | null;
  bodyPolicyPin: DefinitionPin | null;
  definitions: AttributeDefinition[];
  pins: DefinitionPin[];
  senses: SenseDefinition[];
  defaultSenses: string[];
  sensePins: DefinitionPin[];
  acoustics: AcousticPolicy;
  acousticsPin: DefinitionPin;
  activityHosts: DefinitionPin[];
  recipeFamilies: DefinitionPin[];
}
export interface AttributeView {
  bodyHealth?: boolean;
  meaning?: string;
  condition?: string;
  id: string;
  version: number;
  name: string;
  display: 'meter' | 'category';
  presentation: { icon: string; color: string };
  value: AttributeValue | null;
  status: 'known' | 'unknown';
  min?: number;
  max?: number;
  unit?: string;
  concern?: string;
  critical?: boolean;
  editorCritical?: boolean;
  editorCriticalComparison?: Extract<AttributeCriticalPredicate, { compare: unknown }>['compare'];
  revision: number;
}

// Reviewed service bindings, not dynamically imported functions. Definitions cannot
// grant new effects: archive/07-technical-architecture/world-module-runtime.md#2-two-catalogs-with-different-authority.
export const HOST_IMPLEMENTATIONS = Object.freeze({
  'finite-practice-v1': {
    interface: 'attribute-number-v1',
    owner: 'practice',
    execution: 'native',
    storage: 'practice',
  },
  'native-health-v1': {
    interface: 'attribute-number-v1',
    owner: 'body',
    execution: 'native',
    storage: 'health',
  },
  'number-v1': {
    interface: 'attribute-number-v1',
    owner: 'number',
    execution: 'passive',
    storage: 'attributes',
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
const definitionPins = new WeakMap<object, DefinitionPin>();
export function definitionPin<T extends { id: string; version: number }>(
  definition: T,
): DefinitionPin {
  const cached = definitionPins.get(definition);
  if (cached) return cached;
  const pin = {
    id: definition.id,
    version: definition.version,
    digest: contentLabel(canonicalJson(definition)),
  };
  if (!isDraft(definition) && Object.isFrozen(definition)) definitionPins.set(definition, pin);
  return pin;
}
export function createModuleManifest(
  definitions: AttributeDefinition[],
  senses: SenseDefinition[],
  bodyPolicy: BodyPolicy | null,
  recipeFamilies: readonly DefinitionPin[],
  activityHosts: readonly DefinitionPin[] = [],
): WorldModuleManifest {
  const manifest: WorldModuleManifest = {
    appraisals: structuredClone(BASE_APPRAISAL_POLICY),
    revision: 1,
    interface: 'world-modules-v1',
    bodyPolicy: bodyPolicy && structuredClone(bodyPolicy),
    bodyPolicyPin: bodyPolicy && definitionPin(bodyPolicy),
    definitions: structuredClone(definitions),
    pins: definitions.map(definitionPin),
    senses: structuredClone(senses),
    defaultSenses: senses.map((s) => s.id),
    sensePins: senses.map(definitionPin),
    acoustics: structuredClone(DEFAULT_ACOUSTICS),
    acousticsPin: definitionPin(DEFAULT_ACOUSTICS),
    recipeFamilies: recipeFamilies.map((pin) => ({ ...pin })),
    activityHosts: activityHosts.map((pin) => ({ ...pin })),
  };
  validateModuleManifest(manifest);
  return manifest;
}

// Trusted definitions are immutable host content. Keep their pins once, while checking
// every live manifest pin; caching mutable world manifests could admit changed meaning.
const trustedRecipeFamilies = new Map(
  BASE_RECIPE_FAMILIES.map((family) => {
    freeze(family.definition, true);
    return [
      family.definition.id,
      { family, pin: Object.freeze(definitionPin(family.definition)) },
    ] as const;
  }),
);
function exactRecipeFamily(pin: DefinitionPin): RecipeFamilyDescriptor | undefined {
  const trusted = trustedRecipeFamilies.get(pin.id);
  return trusted &&
    Object.keys(pin).length === 3 &&
    pin.id === trusted.pin.id &&
    pin.version === trusted.pin.version &&
    pin.digest === trusted.pin.digest
    ? trusted.family
    : undefined;
}
/** Resolve only exact trusted capabilities selected by this world's existing manifest. */
export function recipeFamily(world: WorldState, id: string): RecipeFamilyDescriptor | undefined {
  if (!Array.isArray(world.moduleManifest.recipeFamilies)) return undefined;
  const pin = world.moduleManifest.recipeFamilies.find((pin) => pin.id === id);
  if (!pin) return undefined;
  return exactRecipeFamily(pin);
}
export function installedRecipeFamilies(world: WorldState): RecipeFamilyDescriptor[] {
  return world.moduleManifest.recipeFamilies.map((pin) => {
    const family = exactRecipeFamily(pin);
    if (!family) throw new Error('Missing exact recipe family dependency.');
    return family;
  });
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
    'bodyPolicy',
    'bodyPolicyPin',
    'definitions',
    'pins',
    'senses',
    'defaultSenses',
    'sensePins',
    'appraisals',
    'acoustics',
    'acousticsPin',
    'activityHosts',
    'recipeFamilies',
  ]);
  validateAppraisalPolicy(manifest.appraisals);
  validateActivityHostPins(manifest.activityHosts);
  if (
    manifest.interface !== 'world-modules-v1' ||
    !Number.isSafeInteger(manifest.revision) ||
    manifest.revision < 1 ||
    !Array.isArray(manifest.definitions) ||
    !Array.isArray(manifest.pins) ||
    manifest.pins.length !== manifest.definitions.length
  )
    throw new Error('Unsupported world module manifest.');
  if (!Array.isArray(manifest.recipeFamilies))
    throw new Error('Recipe family manifest is missing.');
  const familyIds = new Set<string>();
  for (const pin of manifest.recipeFamilies) {
    object(pin, ['id', 'version', 'digest']);
    if (!namespace.test(pin.id) || familyIds.has(pin.id) || !exactRecipeFamily(pin))
      throw new Error('Missing, duplicate or incompatible exact recipe family dependency.');
    familyIds.add(pin.id);
  }
  if (
    !Array.isArray(manifest.senses) ||
    !Array.isArray(manifest.sensePins) ||
    manifest.sensePins.length !== manifest.senses.length ||
    !Array.isArray(manifest.defaultSenses) ||
    new Set(manifest.defaultSenses).size !== manifest.defaultSenses.length
  )
    throw new Error('Invalid sense bindings.');
  validateAcoustics(manifest.acoustics);
  if (canonicalJson(manifest.acousticsPin) !== canonicalJson(definitionPin(manifest.acoustics)))
    throw new Error('Missing exact acoustic policy dependency.');
  const senseIds = new Set<string>(),
    detectors = new Set<string>();
  for (const sense of manifest.senses) {
    object(
      sense,
      sense.implementation === 'hearing-db-v1'
        ? ['id', 'version', 'implementation', 'hearingFloorDbSpl']
        : ['id', 'version', 'implementation', 'radius'],
    );
    if (
      !namespace.test(sense.id) ||
      senseIds.has(sense.id) ||
      sense.version !== 1 ||
      !SENSE_IMPLEMENTATIONS.includes(sense.implementation) ||
      (sense.implementation === 'hearing-db-v1'
        ? !finite(sense.hearingFloorDbSpl) ||
          sense.hearingFloorDbSpl < -120 ||
          sense.hearingFloorDbSpl > 200
        : !finite(sense.radius) ||
          (sense.implementation === 'body-contact-v1'
            ? sense.radius !== 0
            : sense.radius <= 0 || sense.radius > 32))
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
      'meaning',
      'condition',
      'critical',
      'editorCritical',
      'practice',
    ]);
    if (
      !namespace.test(d.id) ||
      ids.has(d.id) ||
      !Number.isSafeInteger(d.version) ||
      d.version < 1 ||
      !Object.hasOwn(HOST_IMPLEMENTATIONS, d.implementation) ||
      !boundedText(d.name, 64) ||
      !['public', 'owner'].includes(d.disclosure)
    )
      throw new Error('Invalid attribute identity or host implementation.');
    object(d.presentation, ['icon', 'color']);
    if (
      ![d.presentation.icon, d.presentation.color].every(
        (symbol) => typeof symbol === 'string' && /^[a-z][a-z0-9.-]{0,63}$/.test(symbol),
      )
    )
      throw new Error('Invalid attribute presentation symbols.');
    ids.add(d.id);
    const host = HOST_IMPLEMENTATIONS[d.implementation];
    const owner =
      host.storage === 'attributes' || host.storage === 'practice' ? d.id : host.storage;
    if (d.implementation === 'finite-practice-v1') {
      validatePracticeProfile(d);
      const familyOwner = `practice:${d.practice!.family.id}`;
      if (owners.has(familyOwner))
        throw new Error('Duplicate accuracy contribution for one mechanism.');
      owners.add(familyOwner);
      if (
        !manifest.recipeFamilies.some(
          (pin) => canonicalJson(pin) === canonicalJson(d.practice!.family),
        )
      )
        throw new Error('Competence requires its exact installed mechanism.');
    } else if (d.practice) throw new Error('Practice requires its supported state owner.');
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
    validateConditionPolicy(d);
    if (d.concern) {
      object(d.concern, ['below', 'text', 'mode', 'notify', 'reconsider', 'recoveryMargin']);
      if (
        d.schema.kind !== 'number' ||
        !finite(d.concern.below) ||
        d.concern.below < d.schema.min ||
        d.concern.below > d.schema.max ||
        !boundedText(d.concern.text, 160) ||
        !validNarrationTemplate(d.concern.text, ['subject']) ||
        !['instant', 'latched'].includes(d.concern.mode) ||
        typeof d.concern.notify !== 'boolean' ||
        typeof d.concern.reconsider !== 'boolean' ||
        (d.concern.mode === 'latched'
          ? !finite(d.concern.recoveryMargin) || d.concern.recoveryMargin < 0
          : d.concern.recoveryMargin !== undefined)
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
    for (const predicate of [d.critical, d.editorCritical]) {
      if (!predicate) continue;
      object(predicate, ['compare', 'concernActive']);
      if ('concernActive' in predicate) {
        if (Object.keys(predicate).length !== 1 || predicate.concernActive !== true || !d.concern)
          throw new Error('Invalid concern decoration.');
      } else {
        object(predicate.compare, ['operator', 'value', 'rounding']);
        const c = predicate.compare;
        if (
          Object.keys(predicate).length !== 1 ||
          d.schema.kind !== 'number' ||
          !finite(c.value) ||
          c.value < d.schema.min ||
          c.value > d.schema.max ||
          !['lessThan', 'lessThanOrEqual'].includes(c.operator) ||
          !['none', 'nearest-integer'].includes(c.rounding)
        )
          throw new Error('Invalid numeric decoration.');
      }
    }
    const pin = manifest.pins.find((p) => p.id === d.id);
    if (!pin || canonicalJson(pin) !== canonicalJson(definitionPin(d)))
      throw new Error('Missing or changed exact definition pin.');
  }
  validateBodyPolicy(manifest.bodyPolicy, manifest.definitions);
  if (
    canonicalJson(manifest.bodyPolicyPin) !==
    canonicalJson(manifest.bodyPolicy ? definitionPin(manifest.bodyPolicy) : null)
  )
    throw new Error('Missing exact body policy dependency.');
}
export function attributeDefinition(
  world: { moduleManifest: Pick<WorldModuleManifest, 'definitions'> },
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
  if (storage === 'practice') return competenceValue(actor, definition);
  // Body health remains raw authoritative points; definition units are only a projection.
  if (
    storage === 'health' &&
    definition.schema.kind === 'number' &&
    actor.body &&
    Number.isFinite(actor.body.maxHealth) &&
    actor.body.maxHealth > 0
  ) {
    const range = definition.schema.max - definition.schema.min;
    // Keep equal-unit reads exact, and avoid introducing rounding at proportional thresholds.
    return (
      definition.schema.min +
      (range === actor.body.maxHealth
        ? actor.health
        : (actor.health / actor.body.maxHealth) * range)
    );
  }
  return undefined;
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
  conditionTiming: 'now' | 'transition' = 'now',
): boolean {
  validateAttributeValue(d, value);
  const storage = HOST_IMPLEMENTATIONS[d.implementation].storage;
  if (storage === 'practice') return setStartingPractice(world, entity, d, value);
  if (storage !== 'attributes')
    throw new Error('Native state must use its owning body/need operation.');
  const prior = (entity.actor?.attributes ?? entity.attributes)?.[d.id];
  if (!prior) throw new Error('Attribute is not applicable to this entity.');
  if (prior.value === value) return false;
  if (
    world.resourceReservations &&
    d.reservoir &&
    d.schema.kind === 'number' &&
    typeof value === 'number'
  )
    assertReservedStock(
      world,
      { kind: 'attribute', entityId: entity.id, definition: definitionPin(d) },
      value,
      d.schema.min,
    );
  if (!Number.isSafeInteger(prior.revision + 1)) throw new Error('Attribute revision exhausted.');
  const wasConcerned =
    prior.concernActive ??
    (d.concern && typeof prior.value === 'number' ? prior.value < d.concern.below : false);
  prior.value = value;
  prior.revision++;
  recordSemanticChange(world, { kind: 'state', entityId: entity.id, field: 'attribute' });
  if (d.concern?.mode === 'latched' && d.schema.kind === 'number' && typeof value === 'number') {
    // A small dead band prevents drain/transfer in one step from creating repeated novelty.
    const recovery = Math.min(d.schema.max, d.concern.below + d.concern.recoveryMargin!);
    const concerned = wasConcerned ? value < recovery : value < d.concern.below;
    prior.concernActive = concerned;
    // The latch is physical state; only a character able to notice gains a private record.
    // A sleeping character's current concern still reaches its next context via projection.
    if (d.concern.notify && concerned !== wasConcerned && canNoticeInternalChange(world, entity))
      emit(
        world,
        events,
        'attribute-concern',
        {
          parts: [
            ...narrationTemplate(concerned ? d.concern.text : `${d.name} is no longer low.`, {
              subject: entity,
            }).parts,
            ` ${d.name}: ${value}${d.schema.unit}.`,
          ],
        },
        entity,
        undefined,
        {
          attributeId: d.id,
          definitionVersion: d.version,
          attributeRevision: prior.revision,
          value,
          unit: d.schema.unit,
          semanticTrigger: true,
          importance: 6,
          urgency: concerned ? 4 : 1,
        },
        'private',
      );
  }
  if (conditionTiming === 'now') reconcileConditions(world, entity, events);
  return true;
}
export function initializeAttributes(
  actor: ActorComponent,
  definitions: AttributeDefinition[],
  initialValues: Record<string, AttributeValue> = {},
): void {
  for (const d of definitions) {
    if (d.implementation === 'finite-practice-v1') {
      initializePractice(actor, d, initialValues[d.id] ?? d.schema.initial);
      continue;
    }
    if (HOST_IMPLEMENTATIONS[d.implementation].storage !== 'attributes')
      throw new Error('Cannot initialize a second native state owner.');
    if (actor.attributes?.[d.id]) throw new Error('Attribute already initialized.');
    const value = Object.hasOwn(initialValues, d.id) ? initialValues[d.id]! : d.schema.initial;
    validateAttributeValue(d, value);
    (actor.attributes ??= {})[d.id] = {
      value,
      revision: 0,
      ...(d.concern?.mode === 'latched' && typeof value === 'number'
        ? { concernActive: value < d.concern.below }
        : {}),
    };
  }
}
export function attributeConcernActive(
  entity: Entity,
  d: AttributeDefinition,
  value: unknown,
): boolean {
  if (!d.concern || typeof value !== 'number') return false;
  return d.concern.mode === 'latched'
    ? !!(entity.actor?.attributes ?? entity.attributes)?.[d.id]?.concernActive
    : value < d.concern.below;
}
function attributeCritical(
  entity: Entity,
  d: AttributeDefinition,
  value: unknown,
  predicate: AttributeCriticalPredicate | undefined,
): boolean {
  if (!predicate) return false;
  if ('concernActive' in predicate) return attributeConcernActive(entity, d, value);
  if (typeof value !== 'number') return false;
  const c = predicate.compare,
    compared = c.rounding === 'nearest-integer' ? Math.round(value) : value;
  return c.operator === 'lessThan' ? compared < c.value : compared <= c.value;
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
        ...(d.implementation === 'native-health-v1' ? { bodyHealth: true } : {}),
        value: value ?? null,
        status: value === undefined ? 'unknown' : 'known',
        critical: attributeCritical(entity, d, value, d.critical),
        editorCritical: attributeCritical(entity, d, value, d.editorCritical),
        ...(audience === 'owner' && d.editorCritical && 'compare' in d.editorCritical
          ? { editorCriticalComparison: { ...d.editorCritical.compare } }
          : {}),
        revision:
          entity.actor!.practice?.[d.id]?.revision ??
          entity.actor!.attributes?.[d.id]?.revision ??
          entity.actor!.body?.revision ??
          0,
        ...(d.schema.kind === 'number' ? { min: d.schema.min, max, unit: d.schema.unit } : {}),
        ...(audience === 'owner' && d.meaning ? { meaning: d.meaning } : {}),
        ...(audience === 'owner' && d.condition
          ? { condition: conditionText(world, entity, d, value) }
          : {}),
        ...(audience === 'owner' && attributeConcernActive(entity, d, value)
          ? {
              concern: renderNarration(
                world,
                narrationTemplate(d.concern!.text, { subject: entity }),
                entity.id,
              ),
            }
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
      const name = v.name;
      const measurement =
        v.status === 'unknown'
          ? `${name}: unknown.`
          : v.display === 'meter'
            ? `${name}: ${v.value}${v.unit ? ` ${v.unit}` : ''} (range ${v.min}–${v.max}${v.unit ? ` ${v.unit}` : ''}).`
            : `${name}: ${v.value}.`;
      return [measurement, v.condition ?? v.concern, v.meaning].filter(Boolean);
    }),
    ...activeStatusEffects(world, entity)
      .filter((d) => d.actions)
      .map((d) =>
        renderNarration(
          world,
          subjectNarration(entity, [presentVerb(entity, 'be'), ` ${d.label.toLowerCase()}.`]),
          entity.id,
        ),
      ),
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
  for (const event of world.events)
    if (event.narration !== undefined) validateNarration(event.narration);
  const interval = world.nativeInterval;
  if (
    interval !== undefined &&
    (!hasRecordFields(interval, ['remainingSeconds'], ['endsAt']) ||
      !Number.isFinite(interval.remainingSeconds) ||
      interval.remainingSeconds <= TIME_EPSILON ||
      interval.remainingSeconds > BASE_TIME_POLICY.idleHorizonSeconds ||
      (interval.endsAt !== undefined &&
        (!Number.isFinite(interval.endsAt) ||
          Math.abs(interval.endsAt - world.simTime - interval.remainingSeconds) > TIME_EPSILON)))
  )
    throw new Error('Invalid saved native interval progress.');
  validateWorkState(world);
  validateAppraisals(world);
  validateFamilyTree(world);
  validateResourceReservations(world);
  validateParticipation(world);
  validateKnowledge(world);
  validateObserverIdentities(world);
  // Disposable development saves use current-state validation, not per-feature version gates.
  // docs/save-and-load.md#active-development-policy
  if (!world.moduleManifest) throw new Error('World module manifest is missing.');
  validateStatusEffects(world);
  validateNativeWork(world);
  validateSpatialWorld(world);
  validatePerceptionState(world);
  validatePlaces(world);
  validateInventionPolicy(world.inventionPolicy);
  validateInventionAttribution(world);
  validateInstalledRecipes(world);
  validateGatheringTools(world);
  validateEquipment(world);
  validateContactDefense(world);
  for (const definition of Object.values(world.itemDefinitions)) {
    if (!validName(definition)) throw new Error('Invalid canonical item name or name grammar.');
    if (definition.melee && !validMelee(definition.melee))
      throw new Error('Invalid melee definition.');
    if (
      definition.recipeRecord &&
      (definition.recipeRecord.disclosure !== 'method' ||
        !isDefinitionPin(definition.recipeRecord.method))
    )
      throw new Error('Invalid recipe-record capability.');
  }
  validateItemHandling(world);
  for (const recipe of Object.values(world.recipes)) {
    if (recipe.provenance.source === 'authored-world') continue;
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
  validateOutings(world);
  validateActionExperience(world);
  validatePractice(world);
  validateCoaching(world);
  validateModuleManifest(world.moduleManifest);
  validateBodyPolicy(
    world.moduleManifest.bodyPolicy,
    world.moduleManifest.definitions,
    new Set(world.statusEffectPolicy.definitions.map((d) => d.id)),
    world.itemDefinitions,
  );
  validateCognitionPolicy(world, world.cognitionPolicy);
  validateReincarnation(world);
  validateNativeStrikes(world);
  validateTerritorialThreats(world);
  for (const e of Object.values(world.entities)) {
    if (!validName(e)) throw new Error('Invalid canonical entity name or name grammar.');
    if (
      e.actor &&
      (['fullness', 'energy', 'fullnessRevision', 'energyRevision'].some((key) =>
        Object.hasOwn(e.actor!, key),
      ) ||
        (e.actor.capabilities && Object.hasOwn(e.actor.capabilities, 'needs')))
    )
      throw new Error('Incompatible native meter aliases.');
    if (
      e.resource &&
      (!Number.isSafeInteger(e.resource.quantity) ||
        e.resource.quantity < 0 ||
        (e.resource.revision !== undefined &&
          (!Number.isSafeInteger(e.resource.revision) || e.resource.revision < 0)))
    )
      throw new Error('Invalid gathering stock or revision.');
    if (e.actor)
      for (const definition of world.moduleManifest.definitions) {
        const value = readAttribute(e.actor, definition);
        if (value !== undefined) validateAttributeValue(definition, value);
      }
    if (e.actor?.body && (!Number.isFinite(e.actor.body.maxHealth) || e.actor.body.maxHealth <= 0))
      throw new Error('Invalid body maximum.');
    if (
      e.actor?.body &&
      (!Number.isFinite(e.actor.health) ||
        e.actor.health < 0 ||
        e.actor.health > e.actor.body.maxHealth)
    )
      throw new Error('Invalid authoritative body health.');
    if (e.actor?.body && !world.moduleManifest.bodyPolicy)
      throw new Error('Living bodies require an installed body policy.');
    if (e.animal) {
      const animal = e.animal;
      if (
        !Number.isFinite(animal.reviewAt) ||
        animal.reviewAt < 0 ||
        !Number.isFinite(animal.danger) ||
        animal.danger < 0 ||
        animal.danger > 1 ||
        !Number.isFinite(animal.calmRate) ||
        animal.calmRate < 0 ||
        !Number.isFinite(animal.wanderSeconds) ||
        (animal.escapeHeading !== null && !Number.isFinite(animal.escapeHeading)) ||
        (animal.threatPosition !== null &&
          ![animal.threatPosition?.x, animal.threatPosition?.y, animal.threatPosition?.z].every(
            Number.isFinite,
          )) ||
        (animal.threatId !== null && (typeof animal.threatId !== 'string' || !animal.threatId)) ||
        (animal.danger > 0 && animal.threatPosition === null)
      )
        throw new Error('Invalid saved animal threat memory.');
    }
    if (e.actor?.body && !e.actor.alive && !e.remains && !e.actor.pendingDeath)
      throw new Error('Dead bodies require saved remains.');
    if (e.remains) {
      const remains = e.remains;
      if (
        !e.actor?.body ||
        e.actor.alive ||
        (remains.sourceId !== e.id &&
          !(
            e.kind === 'remains' &&
            world.entities[remains.sourceId]?.actor?.controller === 'player' &&
            world.entities[remains.sourceId]?.kind !== 'remains' &&
            !world.entities[remains.sourceId]?.remains
          )) ||
        !Number.isFinite(remains.diedAt) ||
        remains.diedAt < 0 ||
        remains.diedAt > world.simTime ||
        !['fresh', 'rotting', 'removed'].includes(remains.phase) ||
        (remains.rotAt !== null &&
          (!Number.isFinite(remains.rotAt) || remains.rotAt <= remains.diedAt)) ||
        (remains.removeAt !== null &&
          (remains.rotAt === null ||
            !Number.isFinite(remains.removeAt) ||
            remains.removeAt <= remains.rotAt)) ||
        typeof remains.harvested !== 'boolean' ||
        !Array.isArray(remains.yields) ||
        remains.yields.some(
          (yielded) =>
            !world.itemDefinitions[yielded.definitionId] ||
            !Number.isSafeInteger(yielded.quantity) ||
            yielded.quantity < 1,
        ) ||
        (remains.phase !== 'fresh' && remains.yields.length)
      )
        throw new Error('Invalid saved remains lifecycle.');
    }
    if (
      e.actor?.senses &&
      (new Set(e.actor.senses).size !== e.actor.senses.length ||
        e.actor.senses.some((id) => !world.moduleManifest!.senses.some((s) => s.id === id)))
    )
      throw new Error('Missing actor sense binding.');
    validateConditionEpisodes(world, e);
    const inspection = e.actor?.inventoryInspection;
    if (
      inspection &&
      (!Number.isSafeInteger(inspection.revision) ||
        inspection.revision < 0 ||
        typeof inspection.scope !== 'string' ||
        inspection.scope.length > 16000 ||
        (inspection.containerId !== undefined &&
          (typeof inspection.containerId !== 'string' ||
            !inspection.containerId ||
            inspection.containerId.length > 120)) ||
        typeof inspection.after !== 'string' ||
        inspection.after.length > 120 ||
        typeof inspection.more !== 'boolean' ||
        !Array.isArray(inspection.itemIds) ||
        inspection.itemIds.length > 16 ||
        new Set(inspection.itemIds).size !== inspection.itemIds.length ||
        inspection.itemIds.some((id) => typeof id !== 'string' || !id || id.length > 120))
    )
      throw new Error('Invalid saved inventory inspection.');
    if (
      e.actor?.combatReadyAt !== undefined &&
      (!finite(e.actor.combatReadyAt) || e.actor.combatReadyAt < 0)
    )
      throw new Error('Invalid attack recovery deadline.');
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
      if (
        d.concern?.mode === 'latched'
          ? typeof state.concernActive !== 'boolean'
          : state.concernActive !== undefined
      )
        throw new Error('Invalid concern episode.');
      validateAttributeValue(d, state.value);
      if (!Number.isSafeInteger(state.revision) || state.revision < 0)
        throw new Error('Invalid attribute revision.');
    }
    if (e.replenisher) {
      object(e.replenisher, ['attributeId', 'remaining', 'revision']);
      if (
        !attributeDefinition(world, e.replenisher.attributeId)?.reservoir ||
        !finite(e.replenisher.remaining) ||
        e.replenisher.remaining < 0 ||
        e.replenisher.remaining > 1e9 ||
        (e.replenisher.revision !== undefined &&
          (!Number.isSafeInteger(e.replenisher.revision) || e.replenisher.revision < 0))
      )
        throw new Error('Invalid replenishment source.');
    }
    const fireAction = e.actor?.action;
    if (fireAction?.fireGuard !== undefined) {
      const guard = fireAction.fireGuard;
      if (
        !guard ||
        Object.keys(guard).sort().join(',') !== 'definition,minimumHeld,onlyWhenLow' ||
        fireAction.type !== 'tend-fire' ||
        fireAction.fireOperation !== 'fuel' ||
        !isDefinitionPin(guard.definition) ||
        !Number.isSafeInteger(guard.minimumHeld) ||
        guard.minimumHeld < 0 ||
        typeof guard.onlyWhenLow !== 'boolean' ||
        !activityHostForCommand(world, 'tend-fire') ||
        !world.itemDefinitions[guard.definition.id] ||
        !isFuel(world.itemDefinitions[guard.definition.id]!) ||
        !sameDefinitionPin(
          guard.definition,
          definitionPin(world.itemDefinitions[guard.definition.id]!),
        ) ||
        !fireAction.itemId ||
        !world.entities[fireAction.itemId]?.item ||
        !sameDefinitionPin(world.entities[fireAction.itemId]!.item!.definitionPin, guard.definition)
      )
        throw new Error('Invalid saved guarded fuel action.');
    }
    const activeAction = e.actor?.action;
    if (
      activeAction?.targetLife !== undefined &&
      (!['strike', 'hunt'].includes(activeAction.type) ||
        !Number.isSafeInteger(activeAction.targetLife) ||
        activeAction.targetLife < 0)
    )
      throw new Error('Invalid saved attack life.');
    if (activeAction?.lethalPermission) {
      const permission = activeAction.lethalPermission;
      if (
        !['strike', 'hunt'].includes(activeAction.type) ||
        permission.actorId !== e.id ||
        permission.sourceLife !== (e.actor!.physicalLife ?? 0) ||
        permission.targetId !== activeAction.targetId ||
        permission.targetLife !== activeAction.targetLife ||
        typeof permission.attackDigest !== 'string' ||
        !permission.attackDigest
      )
        throw new Error('Invalid saved lethal permission.');
    }
    if (
      activeAction?.requiresLethalReview !== undefined &&
      (!['strike', 'hunt'].includes(activeAction.type) ||
        typeof activeAction.requiresLethalReview !== 'boolean')
    )
      throw new Error('Invalid saved attack origin.');
    if (
      activeAction?.type === 'treat-scar' &&
      (!bodyPolicy(world)?.reincarnation?.scars.some((scar) => scar.id === activeAction.scarId) ||
        !activeAction.targetId)
    )
      throw new Error('Invalid saved scar treatment.');
    if (
      e.actor?.action?.type === 'strike' &&
      (!strikeDefinition(e.actor.action.definitionId, world, e.actor.action.weaponItemId) ||
        strikeDefinition(e.actor.action.definitionId, world, e.actor.action.weaponItemId)
          ?.version !== e.actor.action.definitionVersion)
    )
      throw new Error('Missing active strike definition.');
    if (
      e.actor?.action?.type === 'strike' &&
      e.actor.action.strikePhase &&
      (!['windup', 'recovery'].includes(e.actor.action.strikePhase ?? '') ||
        (e.actor.action.strikePhase === 'windup' && e.actor.action.strikeOutcome !== undefined) ||
        (e.actor.action.strikePhase === 'recovery' &&
          (!['hit', 'miss'].includes(e.actor.action.strikeOutcome ?? '') ||
            e.actor.combatReadyAt === undefined)))
    )
      throw new Error('Invalid saved melee phase.');
    if (
      e.actor?.action?.type === 'replenish' &&
      (!attributeDefinition(world, e.actor.action.attributeId ?? '')?.reservoir ||
        attributeDefinition(world, e.actor.action.attributeId ?? '')?.version !==
          e.actor.action.definitionVersion ||
        canonicalJson(e.actor.action.resourceDefinition) !==
          canonicalJson(
            definitionPin(attributeDefinition(world, e.actor.action.attributeId ?? '')!),
          ))
    )
      throw new Error('Missing active action definition.');
  }
}
