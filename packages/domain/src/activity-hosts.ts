import { BASE_CANOPY_ACTIVITY_HOST } from './worlds/base/canopies.js';
import { canonicalJson, contentLabel } from './events.js';
import { BASE_FIRE_ACTIVITY_HOST } from './worlds/base/fire-activity.js';
import { BASE_CAMP_ACTIVITY_HOST } from './worlds/base/camp-activity.js';
import { outcome } from './events.js';
import type { Outcome } from './types.js';
import type { Command, WorldState, Entity, ItemInstance } from './types.js';
import type { DefinitionPin } from './world-modules.js';
import { BASE_OUTING_HOST } from './worlds/base/outing.js';

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
  };
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
export interface ActivityRequestDescriptor {
  purposeLabel?: string;
  submitLabel?: string;
  id: string;
  label: string;
  description: string;
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
export const STOCK_ACTIVITY_HOST: ActivityHostDescriptor = {
  definition: {
    id: 'engine:stock-transfer',
    version: 1,
    interface: 'activity-host-v1',
    implementationVersion: 1,
    commands: ['transfer-stock'],
    deadlineSafeCommands: ['transfer-stock'],
    selection: {
      examined: 200,
      movedLots: 16,
      quantity: 'exact-homogeneous',
      minimum: 'available-own-stock',
    },
  },
};
const trustedHosts = [
  STOCK_ACTIVITY_HOST,
  BASE_FIRE_ACTIVITY_HOST,
  BASE_CAMP_ACTIVITY_HOST,
  BASE_OUTING_HOST,
  BASE_CANOPY_ACTIVITY_HOST,
];
export function activityRequestDescriptors(world: WorldState): ActivityRequestDescriptor[] {
  return world.moduleManifest.activityHosts.flatMap(
    (pin) => installedActivityHost(world, pin)?.definition.requests ?? [],
  );
}
export function activityRequestHost(world: WorldState, requestId: string) {
  for (const pin of world.moduleManifest.activityHosts) {
    const host = installedActivityHost(world, pin);
    if (host?.definition.requests?.some((request) => request.id === requestId)) return host;
  }
}
export function activityRequestChoices(
  world: WorldState,
  actorId: string,
  observed?: ActivityRequestObservation,
) {
  const results = world.moduleManifest.activityHosts.flatMap((pin) => {
    const host = installedActivityHost(world, pin);
    return host?.requestChoices ? [host.requestChoices(world, actorId, observed)] : [];
  });
  return {
    choices: results.flatMap((result) => result.choices),
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
  for (const pin of world.moduleManifest.activityHosts) {
    const host = installedActivityHost(world, pin);
    if (
      host?.definition.requests?.some((descriptor) => descriptor.id === request.family) &&
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
  for (const pin of world.moduleManifest.activityHosts) {
    const host = installedActivityHost(world, pin);
    if (host?.definition.requests?.some((entry) => entry.id === request.family)) {
      const bound = host.compileRequest?.(world, actorId, 'review', request);
      if (!bound || 'ok' in bound) return [];
      return host.reviewRequest?.(world, actorId, request) ?? [];
    }
  }
  return [];
}
/** A budget consumer must publish actual `spent` receipts and a conservative debit.
 * Deadline-safe stock movement is deliberately separate from this contract. */
export function activitySpendCeiling(world: WorldState, command: Command): number | undefined {
  const rule = activityHostForCommand(world, command.type)?.definition.spending;
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
export function activityHostPin(host: ActivityHostDescriptor): DefinitionPin {
  return {
    id: host.definition.id,
    version: host.definition.version,
    digest: contentLabel(canonicalJson(host.definition)),
  };
}
export function activityHostPins(): DefinitionPin[] {
  return trustedHosts.map(activityHostPin);
}
export function validateActivityHostPins(pins: readonly DefinitionPin[]): void {
  if (!Array.isArray(pins) || pins.length > trustedHosts.length)
    throw new Error('Invalid installed activity support.');
  const seen = new Set<string>();
  for (const pin of pins) {
    const host = trustedHosts.find((host) => host.definition.id === pin?.id);
    if (
      !host ||
      seen.has(pin.id) ||
      Object.keys(pin).sort().join(',') !== 'digest,id,version' ||
      canonicalJson(pin) !== canonicalJson(activityHostPin(host))
    )
      throw new Error('Missing or incompatible trusted activity host.');
    seen.add(pin.id);
  }
}
export function installedActivityHost(
  world: WorldState,
  pin: DefinitionPin,
): ActivityHostDescriptor | undefined {
  const host = trustedHosts.find((host) => host.definition.id === pin.id);
  return host &&
    canonicalJson(activityHostPin(host)) === canonicalJson(pin) &&
    world.moduleManifest.activityHosts.some(
      (installed) => canonicalJson(installed) === canonicalJson(pin),
    )
    ? host
    : undefined;
}
export function activityCommandSupported(world: WorldState, command: Command['type']): boolean {
  return world.moduleManifest.activityHosts.some((pin) =>
    installedActivityHost(world, pin)?.definition.commands.includes(command),
  );
}
export function activityHostForCommand(
  world: WorldState,
  command: Command['type'],
): ActivityHostDescriptor | undefined {
  for (const pin of world.moduleManifest.activityHosts) {
    const host = installedActivityHost(world, pin);
    if (host?.definition.commands.includes(command)) return host;
  }
}
