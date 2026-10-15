import { freeze, isDraft } from 'immer';
import { trustedActivityHosts } from './world-composition.js';
export { STOCK_ACTIVITY_HOST } from './stock-activity.js';
import { canonicalJson, contentLabel } from './events.js';
import { outcome } from './events.js';
import { isImmutableData } from './records.js';
import type { Outcome } from './types.js';
import type { Command, WorldState, Entity, ItemInstance } from './types.js';
import type { DefinitionPin } from './world-modules.js';

/** Installed trusted support for reusable commands and actor-scoped conditions.
 * Recipe-family installation grants neither of these capabilities.
 * docs/projects/parallel-batch-01-playable-week/camp-activities.md#predicates-deadlines-and-scheduling */
export interface ActivityHostDescriptor {
  definition: {
    id: string;
    version: number;
    interface: 'activity-host-v1';
    implementationVersion: number;
    commands: readonly Command['type'][];
    deadlineSafeCommands: readonly Command['type'][];
    /** Completion receipts report actual debit; safe cancellation alone grants no budget support. */
    spending?: {
      command: Command['type'];
      requiredArguments: Record<string, string | number | boolean>;
      maximumPerAttempt: number;
      unit: string;
    };
    condition?: {
      label: string;
      targetRequirement: string;
      /** Exact authored metadata participates in the pin; the engine does not interpret it. */
      rules: Record<string, string | number | boolean>;
      dependencies: readonly string[];
    };
    selection?: {
      examined: number;
      movedLots: number;
      quantity: 'exact-homogeneous';
      minimum: 'available-own-stock';
    };
    requests?: ActivityRequestDescriptor[];
    /** Authored meaning of this host's closed native commands; never installs an executor. */
    actions?: Partial<Record<Command['type'], ActivityActionMeaning>>;
  };
  /** Dependencies of the selected supported implementation, separate from possessions. */
  supportsCommand?: (world: WorldState, command: Command['type']) => boolean;
  /** Meaningful output identity from the exact selected command; no hypothetical lot. */
  outputDefinition?: (world: WorldState, command: Command) => string | undefined;
  evaluateCondition?: (
    world: WorldState,
    actorId: string,
    targetId: string,
  ) => { value: boolean | undefined; depends: string[]; nextBoundary?: number };
  acceptsTarget?: (world: WorldState, targetId: string) => boolean;
  compileRequest?: (
    world: WorldState,
    actorId: string,
    id: string,
    request: ActivityRequest,
    permittedEntityIds?: readonly string[],
  ) => Command | Outcome;
  /** Read-only, actor-permitted prerequisites after ordinary preview admission. */
  reviewRequest?: (world: WorldState, actorId: string, request: ActivityRequest) => string[];
  requestChoices?: (
    world: WorldState,
    actorId: string,
    observed?: ActivityRequestObservation,
  ) => { choices: ActivityRequestChoice[]; warnings: string[] };
  /** Trusted role predicate after the caller has proved permitted disclosure. */
  requestChoice?: (
    world: WorldState,
    actorId: string,
    requestId: string,
    fieldId: string,
    candidateId: string,
  ) => ActivityRequestChoice | undefined;
}
export interface ActivityActionMeaning {
  label: string;
  description: string;
  fallback?: { label: string; category: string; reason: string };
  singleItemReceipt?: boolean;
  itemOutputs?: boolean;
  unpausableWhileWorking?: boolean;
  toolFields?: readonly string[];
  unitPerCommand?: boolean;
}
/** A trusted command's meaning can also interpret historical records after uninstallation.
 * Execution/discovery must separately use nativeCommandSupported. */
export function nativeActionMeaning(command: Command['type']): ActivityActionMeaning | undefined {
  return implementations().meanings.get(command);
}
export function installedActionMeaning(world: WorldState, command: Command['type']) {
  const selected = selectedImplementations(world);
  const meaning = selected
    ? selected.meanings.get(command)
    : selectedDescriptors(world).find((host) => host.definition.actions?.[command])?.definition
        .actions?.[command];
  return meaning && command === 'hunt' && world.moduleManifest.rangedPolicy
    ? {
        ...meaning,
        label: world.moduleManifest.rangedPolicy.actionLabel,
        description: world.moduleManifest.rangedPolicy.description,
      }
    : meaning;
}
/** Reusable substrate operations remain available; fictional capabilities require installation.
 * Installation grants no equipment, materials, privacy or platform permission. */
export function nativeCommandSupported(world: WorldState, command: Command['type']): boolean {
  if (implementations().commands.has(command)) {
    const host = activityHostForCommand(world, command);
    return !!host && (host.supportsCommand?.(world, command) ?? true);
  }
  return true;
}
export function itemOutputFamilies(world: WorldState, namedPorts = false): string[] {
  const result = new Set<string>(['pickup']);
  for (const [command, meaning] of installedActionMeanings(world))
    if (namedPorts ? meaning.itemOutputs : meaning.singleItemReceipt) result.add(command);
  return [...result];
}
/** Native prepared perception can be reused; this is never a client-supplied grant. */
export interface ActivityRequestObservation {
  actor: Entity;
  visibleEntities: Entity[];
  inventory: ItemInstance[];
  inspectedContainer?: ReturnType<typeof import('./inventory-inspection.js').inspectedContainer>;
}
export interface ActivityRequestChoice {
  id: string;
  label: string;
  kind: 'entity' | 'definition';
  roles: string[];
  requestIds?: string[];
  distance?: number;
  accessible: boolean;
  reason?: string;
}
export interface ActivityRequest {
  family: string;
  arguments: Record<string, string | number | boolean>;
}
/** Trusted task presentations bind world-authored roles, never arbitrary form schemas.
 * docs/projects/game-interaction-redesign-tech-design.md#replace-generic-activity-forms-with-semantic-presentations */
export type ActivityRequestPresentation = {
  target: string;
  workMode: string;
} & (
  | { kind: 'replenish-session' }
  | { kind: 'outing-invitation'; destination: string }
  | {
      kind: 'resource-care';
      supply: string;
      stop: string;
      budget: string;
      material: string;
      reserve: string;
    }
  | {
      kind: 'gather-store-use';
      source: string;
      destination: string;
      quantity: string;
      material: string;
      reserve: string;
    }
);
export interface ActivityRequestDescriptor {
  /** Exact native operations this composition needs; no equipment/material grant. */
  requires?: readonly Command['type'][];
  purposeLabel?: string;
  submitLabel?: string;
  id: string;
  label: string;
  description: string;
  presentation?: ActivityRequestPresentation;
  fields: Record<
    string,
    {
      type: 'entity' | 'definition' | 'integer' | 'time' | 'mode';
      modeLabels?: Record<'enqueue' | 'replace' | 'interrupt', string>;
      label: string;
      minimum?: number;
      maximum?: number;
      /** Bounds for duration selection; a future exact/named deadline can be nearer. */
      minimumDuration?: number;
      maximumDuration?: number;
      required: true;
      discovery?: {
        source: 'spatial' | 'storage' | 'materials';
        /** Materials from this selected source require current character evidence. */
        sourceField?: string;
      };
    }
  >;
}
export function activityRequestDescriptors(world: WorldState): ActivityRequestDescriptor[] {
  return selectedDescriptors(world)
    .flatMap((host) => host.definition.requests ?? [])
    .filter(
      (request) =>
        request.requires?.every((command) => nativeCommandSupported(world, command)) !== false,
    );
}
export function activityRequestHost(world: WorldState, requestId: string) {
  for (const host of selectedDescriptors(world)) {
    if (
      host.definition.requests?.some(
        (request) =>
          request.id === requestId &&
          request.requires?.every((command) => nativeCommandSupported(world, command)) !== false,
      )
    )
      return host;
  }
}
export function activityRequestChoices(
  world: WorldState,
  actorId: string,
  observed?: ActivityRequestObservation,
) {
  const supported = new Set(activityRequestDescriptors(world).map((request) => request.id));
  const results = selectedDescriptors(world).flatMap((host) => {
    return host.requestChoices && host.definition.requests?.some((entry) => supported.has(entry.id))
      ? [host.requestChoices(world, actorId, observed)]
      : [];
  });
  return {
    choices: results.flatMap((result) =>
      result.choices.flatMap((choice) => {
        if (!choice.requestIds) return [choice];
        const requestIds = choice.requestIds.filter((id) => supported.has(id));
        return requestIds.length ? [{ ...choice, requestIds }] : [];
      }),
    ),
    warnings: results.flatMap((result) => result.warnings),
  };
}
/** This binds selected parameters to the existing composition; it grants no effect. */
export function bindActivityRequest(
  world: WorldState,
  actorId: string,
  id: string,
  request: ActivityRequest,
  permittedEntityIds?: readonly string[],
): Command | Outcome {
  for (const host of selectedDescriptors(world)) {
    if (
      host.definition.requests?.some(
        (descriptor) =>
          descriptor.id === request.family &&
          descriptor.requires?.every((command) => nativeCommandSupported(world, command)) !== false,
      ) &&
      host.compileRequest
    )
      return host.compileRequest(world, actorId, id, request, permittedEntityIds);
  }
  return outcome(
    false,
    'unsupported-activity',
    'This world does not support that requested activity.',
  );
}
export function reviewActivityRequest(
  world: WorldState,
  actorId: string,
  request: ActivityRequest,
): string[] {
  for (const host of selectedDescriptors(world)) {
    if (
      host.definition.requests?.some(
        (entry) =>
          entry.id === request.family &&
          entry.requires?.every((command) => nativeCommandSupported(world, command)) !== false,
      )
    ) {
      const bound = host.compileRequest?.(world, actorId, 'review', request);
      if (!bound || 'ok' in bound) return [];
      return host.reviewRequest?.(world, actorId, request) ?? [];
    }
  }
  return [];
}
/** A budget consumer must publish actual `spent` receipts and a conservative debit.
 * Deadline-safe stock movement is deliberately separate from this contract. */
export function activitySpendCeiling(
  world: WorldState,
  command: Command,
  requireInstalled = true,
): number | undefined {
  const rule = (
    requireInstalled
      ? activityHostForCommand(world, command.type)
      : trustedActivityHostForCommand(command.type)
  )?.definition.spending;
  if (
    !rule ||
    rule.command !== command.type ||
    Object.entries(rule.requiredArguments).some(
      ([key, value]) => (command as unknown as Record<string, unknown>)[key] !== value,
    )
  )
    return;
  return rule.maximumPerAttempt;
}
const hostPins = new WeakMap<ActivityHostDescriptor['definition'], DefinitionPin>();
export function activityHostPin(host: ActivityHostDescriptor): DefinitionPin {
  // Exact trusted metadata is immutable; compute it once before repeated menu/plan reads.
  // Mutable world installation pins are still checked on every resolution.
  freeze(host.definition, true);
  let pin = hostPins.get(host.definition);
  if (!pin) {
    pin = Object.freeze({
      id: host.definition.id,
      version: host.definition.version,
      digest: contentLabel(canonicalJson(host.definition)),
    });
    hostPins.set(host.definition, pin);
  }
  return pin;
}
function exactActivityHostPin(pin: DefinitionPin, expected: DefinitionPin): boolean {
  return (
    !!pin &&
    Object.keys(pin).length === 3 &&
    pin.id === expected.id &&
    pin.version === expected.version &&
    pin.digest === expected.digest
  );
}
interface ActivityImplementations {
  hosts: ActivityHostDescriptor[];
  byId: Map<string, ActivityHostDescriptor>;
  commands: Map<Command['type'], ActivityHostDescriptor>;
  meanings: Map<Command['type'], ActivityActionMeaning>;
}
function describeImplementations(
  hosts: readonly ActivityHostDescriptor[],
): ActivityImplementations {
  const result: ActivityImplementations = {
    hosts: [...hosts],
    byId: new Map(),
    commands: new Map(),
    meanings: new Map(),
  };
  for (const host of hosts) {
    // Linked code supplies these descriptors; seal the consumed authored metadata
    // before retaining its derived lookups. Effects and current support are not cached.
    activityHostPin(host);
    result.byId.set(host.definition.id, host);
    for (const command of host.definition.commands)
      if (!result.commands.has(command)) result.commands.set(command, host);
    for (const [command, meaning] of Object.entries(host.definition.actions ?? {}))
      if (meaning && !result.meanings.has(command as Command['type']))
        result.meanings.set(command as Command['type'], meaning);
  }
  return result;
}
let linkedImplementations: ActivityImplementations | undefined;
function implementations(): ActivityImplementations {
  return (linkedImplementations ??= describeImplementations(trustedActivityHosts()));
}
/** Exact trusted metadata can interpret finished records without installing execution. */
export function trustedActivityHost(pin: DefinitionPin): ActivityHostDescriptor | undefined {
  const host = implementations().byId.get(pin?.id);
  return host && exactActivityHostPin(pin, activityHostPin(host)) ? host : undefined;
}
export function trustedActivityHostForCommand(command: Command['type']) {
  return implementations().commands.get(command);
}
const selectedHosts = new WeakMap<readonly DefinitionPin[], ActivityImplementations>();
function selectedImplementations(world: WorldState): ActivityImplementations | undefined {
  const pins = world.moduleManifest.activityHosts;
  const cached = selectedHosts.get(pins);
  if (cached) return cached;
  if (isDraft(pins) || !isImmutableData(pins)) return;
  const result = describeImplementations(
    pins.flatMap((pin) => {
      const host = trustedActivityHost(pin);
      return host ? [host] : [];
    }),
  );
  // Frozen containers with mutable pins or accessors can still change consumed values.
  // Builders and drafts resolve live; weak retention follows the installation owner.
  selectedHosts.set(pins, result);
  return result;
}
function selectedDescriptors(world: WorldState): readonly ActivityHostDescriptor[] {
  return (
    selectedImplementations(world)?.hosts ??
    world.moduleManifest.activityHosts.flatMap((pin) => {
      const host = trustedActivityHost(pin);
      return host ? [host] : [];
    })
  );
}
export function activityHostPins(): DefinitionPin[] {
  return trustedActivityHosts().map(activityHostPin);
}
export function validateActivityHostPins(pins: readonly DefinitionPin[]): void {
  if (!Array.isArray(pins) || pins.length > trustedActivityHosts().length)
    throw new Error('Invalid installed activity support.');
  const seen = new Set<string>();
  for (const pin of pins) {
    const host = trustedActivityHost(pin);
    if (
      !host ||
      seen.has(pin.id) ||
      Object.keys(pin).sort().join(',') !== 'digest,id,version' ||
      !exactActivityHostPin(pin, activityHostPin(host))
    )
      throw new Error('Missing or incompatible trusted activity host.');
    seen.add(pin.id);
  }
}
export function installedActivityHost(
  world: WorldState,
  pin: DefinitionPin,
): ActivityHostDescriptor | undefined {
  const selected = selectedImplementations(world);
  if (selected) {
    const host = selected.byId.get(pin?.id);
    return host && exactActivityHostPin(pin, activityHostPin(host)) ? host : undefined;
  }
  const host = trustedActivityHost(pin);
  return host &&
    world.moduleManifest.activityHosts.some((installed) => exactActivityHostPin(installed, pin))
    ? host
    : undefined;
}
export function activityCommandSupported(world: WorldState, command: Command['type']): boolean {
  return !!activityHostForCommand(world, command);
}
export function activityHostForCommand(
  world: WorldState,
  command: Command['type'],
): ActivityHostDescriptor | undefined {
  const selected = selectedImplementations(world);
  if (selected) return selected.commands.get(command);
  for (const pin of world.moduleManifest.activityHosts) {
    const host = trustedActivityHost(pin);
    if (host?.definition.commands.includes(command)) return host;
  }
}

export function installedActionMeanings(
  world: WorldState,
): [Command['type'], ActivityActionMeaning][] {
  const selected =
    selectedImplementations(world) ?? describeImplementations(selectedDescriptors(world));
  return [...selected.meanings.keys()].flatMap((command) => {
    const meaning = installedActionMeaning(world, command);
    return meaning && nativeCommandSupported(world, command)
      ? [[command, meaning] as [Command['type'], ActivityActionMeaning]]
      : [];
  });
}
