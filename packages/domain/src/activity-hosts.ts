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
  /** Trusted data projection from this world's installed policy; it grants no executor. */
  requestDescriptors?: (world: WorldState, actorId?: string) => ActivityRequestDescriptor[];
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
    query?: ActivityRequestChoiceQuery,
    /** Restrict full-form discovery before preparing role domains. Exact field
     * queries already name their family and do not use this optional filter. */
    families?: readonly string[],
  ) => { choices: ActivityRequestChoice[]; warnings: string[] };
  /** Permitted entity-role identities before dependent arguments are chosen.
   * This is a reference closure, not parameter choices or execution authority. */
  requestRoleEntityIds?: (
    world: WorldState,
    actorId: string,
    requestId: string,
    observed?: ActivityRequestObservation,
  ) => Iterable<string>;
  /** Trusted role predicate after the caller has proved permitted disclosure. */
  requestChoice?: (
    world: WorldState,
    actorId: string,
    requestId: string,
    fieldId: string,
    candidateId: string,
    arguments_?: Readonly<Record<string, string | number | boolean>>,
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
  /** Trusted stationary executor only; arbitrary authored effects do not qualify. */
  coarseWork?: 'consumed-stationary-craft';
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
/** Core physical work can stop through its ordinary cancellation owner. Optional
 * installed families must separately declare that their committed effects survive it. */
export function deadlineSafeActivityCommand(
  world: WorldState,
  command: Command['type'],
  requireInstalled = true,
): boolean {
  if (['move', 'follow', 'strike', 'guard', 'evade', 'pickup'].includes(command)) return true;
  const host = requireInstalled
    ? activityHostForCommand(world, command)
    : trustedActivityHostForCommand(command);
  return host?.definition.deadlineSafeCommands.includes(command) ?? false;
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
  kind: 'entity' | 'definition' | 'choice';
  roles: string[];
  requestIds?: string[];
  distance?: number;
  accessible: boolean;
  reason?: string;
  /** Permitted parent associations, not authority to use another reference. */
  requires?: Readonly<Record<string, string | number | boolean>>;
}
export interface ActivityRequestChoiceQuery {
  family: string;
  field: string;
  arguments: Readonly<Record<string, string | number | boolean>>;
}
export interface ActivityRequest {
  family: string;
  arguments: Record<string, string | number | boolean>;
}
/** Trusted task presentations bind world-authored roles, never arbitrary form schemas.
 * docs/projects/game-interaction-redesign-tech-design.md#replace-generic-activity-forms-with-semantic-presentations */
export type ActivityRequestPresentation = {
  target: string;
  workMode?: string;
} & (
  | { kind: 'replenish-session' }
  | { kind: 'outing-invitation'; destination: string }
  | {
      kind: 'cooperation-proposal';
      destination?: string;
      quarry?: string;
      method?: string;
      output?: string;
      quantity?: string;
      agreement?: string;
      offer?: string;
      opponent?: string;
    }
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
export type ActivityRequestField = {
  modeLabels?: Record<'enqueue' | 'replace' | 'interrupt', string>;
  label: string;
  minimum?: number;
  maximum?: number;
  /** Bounds for duration selection; a future exact/named deadline can be nearer. */
  minimumDuration?: number;
  maximumDuration?: number;
  required: true;
  /** Resolve these fields before querying this role; changing one invalidates dependents. */
  dependencies?: readonly string[];
  discovery?: {
    source:
      | 'spatial'
      | 'storage'
      | 'materials'
      | 'known-places'
      | 'definitions'
      | 'outputs'
      | 'choices';
    /** Materials from this selected source require current character evidence. */
    sourceField?: string;
  };
} & (
  | { type: 'definition'; definitionKind: 'item' | 'recipe' }
  | { type: 'choice'; choices: readonly { value: string; label: string }[]; definitionKind?: never }
  | { type: 'entity' | 'integer' | 'time' | 'mode'; definitionKind?: never }
);
export interface ActivityRequestDescriptor {
  /** Complete direct meanings supplied by this form. This prunes optional
   * concrete preparation only; it grants no permission or required-set omission. */
  covers?: readonly {
    type: Command['type'];
    equals?: Readonly<Record<string, string | number | boolean>>;
  }[];
  /** Exact native operations this composition needs; no equipment/material grant. */
  requires?: readonly Command['type'][];
  purposeLabel?: string;
  submitLabel?: string;
  id: string;
  label: string;
  description: string;
  presentation?: ActivityRequestPresentation;
  fields: Record<string, ActivityRequestField>;
}
/** Prepare once for the actor's optional catalogue. A compound request's
 * prerequisites do not imply complete coverage of those primitive meanings. */
export function prepareActivityRequestCoverage(requests: readonly ActivityRequestDescriptor[]) {
  const byType = new Map<Command['type'], Array<Array<[string, string | number | boolean]>>>();
  for (const request of requests)
    for (const coverage of request.covers ?? []) {
      const predicates = byType.get(coverage.type) ?? [];
      predicates.push(Object.entries(coverage.equals ?? {}));
      byType.set(coverage.type, predicates);
    }
  return <C extends Pick<Command, 'type'>>(command: C) =>
    byType
      .get(command.type)
      ?.some((equals) =>
        equals.every(
          ([field, value]) => (command as unknown as Record<string, unknown>)[field] === value,
        ),
      ) ?? false;
}

export function activityRequestFieldDependencies(field: ActivityRequestField): readonly string[] {
  return [
    ...new Set([
      ...(field.dependencies ?? []),
      ...(field.discovery?.sourceField ? [field.discovery.sourceField] : []),
    ]),
  ];
}
/** Only a field with the declared work-mode meaning controls outer work handling.
 * An unrelated literal parameter named "mode" keeps its own family semantics. */
export function activityRequestWorkModeField(
  request: ActivityRequestDescriptor,
): string | undefined {
  return Object.entries(request.fields).find(([, field]) => field.type === 'mode')?.[0];
}
export function activityHostRequests(
  world: WorldState,
  host: ActivityHostDescriptor,
  actorId?: string,
): readonly ActivityRequestDescriptor[] {
  return host.requestDescriptors
    ? host.requestDescriptors(world, actorId)
    : (host.definition.requests ?? []);
}
export function validateInstalledActivityRequests(world: WorldState): void {
  const seen = new Set<string>();
  for (const host of selectedDescriptors(world))
    for (const request of activityHostRequests(world, host)) {
      if (seen.has(request.id))
        throw new Error('Two installed hosts cannot own the same activity request.');
      seen.add(request.id);
      if (Object.values(request.fields).filter((field) => field.type === 'mode').length > 1)
        throw new Error('An activity request must identify at most one work-mode field.');
      const visiting = new Set<string>(),
        visited = new Set<string>();
      const visit = (name: string): void => {
        if (visited.has(name)) return;
        if (visiting.has(name) || !Object.hasOwn(request.fields, name))
          throw new Error(
            'Activity request dependencies must name an acyclic set of declared fields.',
          );
        visiting.add(name);
        for (const dependency of activityRequestFieldDependencies(request.fields[name]!))
          visit(dependency);
        visiting.delete(name);
        visited.add(name);
      };
      for (const name of Object.keys(request.fields)) visit(name);
    }
}
export function activityRequestDescriptors(
  world: WorldState,
  actorId?: string,
): ActivityRequestDescriptor[] {
  return selectedDescriptors(world)
    .flatMap((host) => activityHostRequests(world, host, actorId))
    .filter(
      (request) =>
        request.requires?.every((command) => nativeCommandSupported(world, command)) !== false,
    );
}
function activityRequestOwner(world: WorldState, requestId: string, actorId?: string) {
  for (const host of selectedDescriptors(world)) {
    const descriptor = activityHostRequests(world, host, actorId).find(
      (request) =>
        request.id === requestId &&
        request.requires?.every((command) => nativeCommandSupported(world, command)) !== false,
    );
    if (descriptor) return { host, descriptor };
  }
}
export function activityRequestHost(world: WorldState, requestId: string, actorId?: string) {
  return activityRequestOwner(world, requestId, actorId)?.host;
}
/** Selected-family preparation binds its potential role identities without
 * hydrating every target/parameter tuple in the installed catalogue. */
export function activityRequestRoleEntityIds(
  world: WorldState,
  actorId: string,
  requestId: string,
  observed?: ActivityRequestObservation,
): string[] {
  const selected = activityRequestOwner(world, requestId, actorId);
  if (!selected) throw new Error('The selected activity family is unavailable.');
  const { host, descriptor } = selected;
  if (!Object.values(descriptor.fields).some((field) => field.type === 'entity')) return [];
  if (host.requestRoleEntityIds)
    return [...new Set(host.requestRoleEntityIds(world, actorId, requestId, observed))];
  if (!host.requestChoices)
    throw new Error('The selected activity does not provide a complete role-reference closure.');
  // Simple hosts already own bounded, independent field reads. Compound native
  // hosts supply metadata above when dependent roles need a broader candidate
  // namespace than their presently selectable parameters.
  const ids = new Set<string>();
  for (const [field, meaning] of Object.entries(descriptor.fields)) {
    if (meaning.type !== 'entity') continue;
    const selected = host.requestChoices(world, actorId, observed, {
      family: requestId,
      field,
      arguments: {},
    });
    for (const choice of selected.choices)
      if (
        choice.kind === 'entity' &&
        choice.roles.includes(field) &&
        (!choice.requestIds || choice.requestIds.includes(requestId))
      )
        ids.add(choice.id);
  }
  return [...ids];
}
export function activityRequestChoices(
  world: WorldState,
  actorId: string,
  observed?: ActivityRequestObservation,
  query?: ActivityRequestChoiceQuery,
  families?: readonly string[],
) {
  // A dependent-field read needs only its actual actor-scoped owner. Enumerating
  // every installed descriptor here repeats unrelated knowledge/form preparation
  // for each parameter and can disagree with actor-specific availability.
  const selected = query ? activityRequestOwner(world, query.family, actorId) : undefined;
  const supported = new Set(
    query
      ? selected
        ? [query.family]
        : []
      : (families ?? activityRequestDescriptors(world, actorId).map((request) => request.id)),
  );
  const hosts = query
    ? selected
      ? [selected.host]
      : []
    : families
      ? [
          ...new Set(
            families.flatMap((family) => {
              const owner = activityRequestOwner(world, family, actorId);
              return owner ? [owner.host] : [];
            }),
          ),
        ]
      : selectedDescriptors(world);
  const results = hosts.flatMap((host) => {
    return host.requestChoices &&
      (query || activityHostRequests(world, host, actorId).some((entry) => supported.has(entry.id)))
      ? [host.requestChoices(world, actorId, observed, query, query ? undefined : families)]
      : [];
  });
  return {
    choices: results.flatMap((result) =>
      result.choices.flatMap((choice) => {
        if (
          query &&
          (!choice.roles.includes(query.field) ||
            (choice.requestIds && !choice.requestIds.includes(query.family)) ||
            Object.entries(choice.requires ?? {}).some(
              ([key, value]) => query.arguments[key] !== value,
            ))
        )
          return [];
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
  const selected = activityRequestOwner(world, request.family, actorId);
  if (selected?.host.compileRequest)
    return selected.host.compileRequest(world, actorId, id, request, permittedEntityIds);
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
  const selected = activityRequestOwner(world, request.family, actorId);
  if (!selected) return [];
  const bound = selected.host.compileRequest?.(world, actorId, 'review', request);
  return !bound || 'ok' in bound
    ? []
    : (selected.host.reviewRequest?.(world, actorId, request) ?? []);
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
  const seen = new Set<string>(),
    requests = new Set<string>();
  for (const pin of pins) {
    const host = trustedActivityHost(pin);
    if (
      !host ||
      seen.has(pin.id) ||
      Object.keys(pin).sort().join(',') !== 'digest,id,version' ||
      !exactActivityHostPin(pin, activityHostPin(host))
    )
      throw new Error('Missing or incompatible trusted activity host.');
    for (const request of host.definition.requests ?? []) {
      if (requests.has(request.id))
        throw new Error('Two installed hosts cannot own the same activity request.');
      requests.add(request.id);
    }
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
