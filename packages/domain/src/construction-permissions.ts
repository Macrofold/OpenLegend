import { freeze } from 'immer';
import { isImmutableData } from './records.js';
import { nextId } from './data.js';
import {
  deriveContributionPermission,
  type ConstructionContributionFact,
} from './construction-contributions.js';
import type { ConstructionPermission } from './assembly-types.js';
import type { MaterialAcquisitionFact, Outcome, Transition, WorldState } from './types.js';
import type { DefinitionPin } from './world-modules.js';
import { sameDefinitionPin } from './state-owners.js';
import { chargeWork } from './work-budget.js';
import {
  publishedGatePermission,
  publishedStructuralPermission,
  type CampAssetPermission,
  type CampAssetPublication,
} from './camp-asset-permissions.js';
import { canonicalJson } from './events.js';

/** Operational grants supplied by the application at current admission. They are
 * never part of a saved activity, model proposal or gameplay checkpoint. */
export interface NativeExecutionPermissions {
  constructionPermissions?: readonly ConstructionPermission[];
  campAssetPermissions?: readonly CampAssetPermission[];
}

/** Closed native authorization vocabulary; authored policies select a subset. */
export const CONSTRUCTION_OPERATIONS = [
  'post',
  'cover',
  'lower',
  'reclaim-post',
  'reclaim-lowered',
  'place-hearth',
  'boundary-panel',
  'boundary-gate',
  'remove-boundary-panel',
  'remove-boundary-gate',
  'repair-boundary',
] as const;
/** Operational input bound, not a material or fictional world law. */
export const CONSTRUCTION_PERMISSION_LIMITS = { materialOrigins: 2048 } as const;
export interface MaterialPermissionBinding {
  definition: DefinitionPin;
  grants: Array<{ id: string; revision: number }>;
}
export type ConstructionPermissionEffect =
  | {
      kind: 'contribution-ended';
      permissionId: string;
      permissionRevision: number;
      actionId: string;
      at: number;
      reason: 'expired' | 'withdrawn';
      actorId?: string;
    }
  | {
      kind: 'material-contributed';
      permissionId: string;
      contribution: ConstructionContributionFact;
    }
  | { kind: 'material'; permissionId: string; acquisition: MaterialAcquisitionFact }
  | {
      kind: 'hearth-created';
      permissionId: string;
      permissionRevision: number;
      actorId: string;
      actionId: string;
      physicalLife: number;
      hearthId: string;
      definition: DefinitionPin;
      originIds: string[];
      site: ConstructionPermission['site'];
    }
  | {
      kind: 'gate-published';
      permissionId: string;
      permissionRevision: number;
      actorId: string;
      actionId: string;
      publication: CampAssetPublication;
    }
  | {
      kind: 'structure-exposed';
      permissionId: string;
      permissionRevision: number;
      actorId: string;
      actionId: string;
      publications: CampAssetPublication[];
    }
  | {
      kind: 'assembly-created' | 'assembly-retired';
      permissionId: string;
      permissionRevision: number;
      actorId: string;
      actionId: string;
      assemblyId: string;
    };
export interface ConstructionPermissionChanges {
  effects: readonly ConstructionPermissionEffect[];
  updates: readonly ConstructionPermissionUpdate[];
  creations?: readonly ConstructionPermission[];
}
export interface ConstructionPermissionUpdate {
  before: ConstructionPermission;
  after: ConstructionPermission;
}
interface PreparedPermission {
  index: number;
  sources?: Map<string, DefinitionPin>;
}
export interface ConstructionPermissionPreparation {
  worldId: string;
  byActor: Map<string, PreparedPermission[]>;
  byId: Map<string, PreparedPermission>;
  contributionsByParticipant: Map<string, PreparedPermission[]>;
  contributionDeadlines: readonly { id: string; at: number }[];
}
export interface ConstructionPermissionBatch {
  worldId: string;
  permissions: readonly ConstructionPermission[];
  campAssets: readonly CampAssetPermission[];
  materialAcquisitions: MaterialAcquisitionFact[];
  effects: ConstructionPermissionEffect[];
  updates: Map<string, ConstructionPermissionUpdate>;
  preparation?: ConstructionPermissionPreparation;
  ownsPermissions: boolean;
  creations: Map<string, ConstructionPermission>;
  contributionDeadlineCursor: number;
}

const permissionPreparations = new WeakMap<
  readonly ConstructionPermission[],
  ConstructionPermissionPreparation
>();
/** Authority publishes one immutable operational view after commit. Native indexes
 * can then reuse exact grant membership without rescanning it every clock slice. */
export function immutableConstructionPermissions(
  permissions: readonly ConstructionPermission[],
): readonly ConstructionPermission[] {
  return freeze(permissions, true);
}
/** One synchronous permission view/read or unpublished native batch. Nothing
 * here writes operational authority or survives as world continuation state. */
export function prepareConstructionPermissions(
  worldId: string,
  permissions: readonly ConstructionPermission[],
): ConstructionPermissionPreparation {
  const cached = permissionPreparations.get(permissions);
  if (cached?.worldId === worldId) return cached;
  const contributionDeadlines: Array<{ id: string; at: number }> = [];
  const contributionsByParticipant = new Map<string, PreparedPermission[]>();
  const byActor = new Map<string, PreparedPermission[]>(),
    byId = new Map<string, PreparedPermission>();
  for (let index = 0; index < permissions.length; index++) {
    const permission = permissions[index]!;
    chargeWork({ candidates: 1 });
    if (permission.worldId !== worldId) continue;
    const prepared: PreparedPermission = { index };
    byId.set(permission.id, prepared);
    if (!permission.revoked && permission.contribution)
      contributionDeadlines.push({ id: permission.id, at: permission.contribution.expiresAt });
    if (permission.contribution && !permission.revoked)
      for (const id of [permission.actorId, permission.contribution.donorId]) {
        const entries = contributionsByParticipant.get(id) ?? [];
        entries.push(prepared);
        contributionsByParticipant.set(id, entries);
      }
    const actor = byActor.get(permission.actorId) ?? [];
    actor.push(prepared);
    byActor.set(permission.actorId, actor);
  }
  contributionDeadlines.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  const result = { worldId, byActor, byId, contributionDeadlines, contributionsByParticipant };
  if (isImmutableData(permissions)) permissionPreparations.set(permissions, result);
  return result;
}
export function constructionPermissionBatch(
  worldId: string,
  permissions: readonly ConstructionPermission[],
  campAssets: readonly CampAssetPermission[] = [],
): ConstructionPermissionBatch {
  return {
    worldId,
    permissions,
    campAssets,
    materialAcquisitions: [],
    effects: [],
    updates: new Map(),
    ownsPermissions: false,
    creations: new Map(),
    contributionDeadlineCursor: 0,
  };
}
function preparation(batch: ConstructionPermissionBatch) {
  return (batch.preparation ??= prepareConstructionPermissions(batch.worldId, batch.permissions));
}
function sourceDefinitions(entry: PreparedPermission, permission: ConstructionPermission) {
  if (!entry.sources) {
    const sources = permission.acquisition?.sources ?? [];
    chargeWork({ candidates: sources.length });
    entry.sources = new Map(sources.map((source) => [source.entityId, source.definition]));
  }
  return entry.sources;
}
function containsOrigin(permission: ConstructionPermission, id: string): boolean {
  for (const origin of permission.materialIds) {
    chargeWork({ tests: 1 });
    if (origin === id) return true;
  }
  return false;
}
function eligible(
  worldId: string,
  permissions: readonly ConstructionPermission[],
  prepared: ConstructionPermissionPreparation,
  actorId: string,
  sourceId: string,
  definition: DefinitionPin,
): PreparedPermission[] {
  return (prepared.byActor.get(actorId) ?? []).filter((entry) => {
    chargeWork({ tests: 1 });
    const permission = permissions[entry.index]!;
    if (permission.revoked || permission.worldId !== worldId) return false;
    const pin = sourceDefinitions(entry, permission).get(sourceId);
    return !!pin && sameDefinitionPin(pin, definition);
  });
}
const capacityRefusal = (): Outcome => ({
  ok: false,
  code: 'construction-material-limit',
  message: 'Current construction permission cannot include another independent material origin.',
});

/** Source creation gives a tracked gather one new origin, regardless of quantity.
 * Current exact fences are captured in the action before travel/work. */
export function gatherMaterialPermission(
  worldId: string,
  permissions: readonly ConstructionPermission[],
  actorId: string,
  sourceId: string,
  definition: DefinitionPin,
  prepared = prepareConstructionPermissions(worldId, permissions),
): MaterialPermissionBinding | Outcome | undefined {
  const grants = eligible(worldId, permissions, prepared, actorId, sourceId, definition);
  if (!grants.length) return;
  if (
    grants.some(
      (entry) =>
        permissions[entry.index]!.materialIds.length >=
        CONSTRUCTION_PERMISSION_LIMITS.materialOrigins,
    )
  )
    return capacityRefusal();
  return {
    definition: { ...definition },
    grants: grants.map((entry) => {
      const permission = permissions[entry.index]!;
      return { id: permission.id, revision: permission.revision };
    }),
  };
}
export function currentGatherMaterialPermission(
  batch: ConstructionPermissionBatch,
  actorId: string,
  sourceId: string,
  definition: DefinitionPin,
  binding: MaterialPermissionBinding | undefined,
): Outcome | undefined {
  const prepared = preparation(batch);
  if (
    binding &&
    (!sameDefinitionPin(binding.definition, definition) ||
      binding.grants.some((fence) => {
        const entry = prepared.byId.get(fence.id),
          permission = entry && batch.permissions[entry.index];
        return (
          !permission ||
          permission.revoked ||
          permission.worldId !== batch.worldId ||
          permission.actorId !== actorId ||
          permission.revision !== fence.revision ||
          !entry ||
          !sourceDefinitions(entry, permission).get(sourceId) ||
          !sameDefinitionPin(sourceDefinitions(entry, permission).get(sourceId)!, definition)
        );
      }))
  )
    return {
      ok: false,
      code: 'construction-permission',
      message: 'The material-use permission or selected source changed during gathering.',
    };
  const current = gatherMaterialPermission(
    batch.worldId,
    batch.permissions,
    actorId,
    sourceId,
    definition,
    prepared,
  );
  return current && 'ok' in current ? current : undefined;
}

function editable(batch: ConstructionPermissionBatch, entry: PreparedPermission) {
  const permission = batch.permissions[entry.index]!;
  if (batch.creations.has(permission.id)) return permission;
  const existing = batch.updates.get(permission.id);
  if (existing) return existing.after;
  chargeWork({
    candidates: permission.materialIds.length + (permission.acquisition?.assemblyIds.length ?? 0),
  });
  const after: ConstructionPermission = {
    ...permission,
    materialIds: [...permission.materialIds],
    ...(permission.acquisition
      ? {
          acquisition: {
            ...permission.acquisition,
            assemblyIds: [...permission.acquisition.assemblyIds],
          },
        }
      : {}),
  };
  if (!batch.ownsPermissions) {
    batch.permissions = [...batch.permissions];
    batch.ownsPermissions = true;
  }
  (batch.permissions as ConstructionPermission[])[entry.index] = after;
  batch.updates.set(permission.id, { before: permission, after });
  return after;
}
/** Native-only proposal calculation. The AuthorityService must rederive/check
 * these changes and commit them with the original physical effects/receipts. */
export function recordMaterialAcquisition(
  batch: ConstructionPermissionBatch,
  fact: MaterialAcquisitionFact,
): void {
  batch.materialAcquisitions.push(fact);
  // Made material inherits spent origins. Making alone cannot authorize them.
  if (fact.operation !== 'gather' || !fact.sourceId) return;
  const prepared = preparation(batch);
  for (const output of fact.outputs)
    for (const entry of eligible(
      batch.worldId,
      batch.permissions,
      prepared,
      fact.actorId,
      fact.sourceId,
      output.definition,
    ))
      applyConstructionPermissionEffect(batch, {
        kind: 'material',
        permissionId: batch.permissions[entry.index]!.id,
        acquisition: fact,
      });
}
export function applyConstructionPermissionEffect(
  batch: ConstructionPermissionBatch,
  effect: ConstructionPermissionEffect,
): void {
  if (effect.kind === 'contribution-ended') {
    const entry = preparation(batch).byId.get(effect.permissionId),
      permission = entry && batch.permissions[entry.index];
    if (
      !entry ||
      !permission?.contribution ||
      permission.revoked ||
      permission.revision !== effect.permissionRevision ||
      !Number.isFinite(effect.at) ||
      effect.at < 0 ||
      (effect.reason === 'expired'
        ? effect.at < permission.contribution.expiresAt || effect.actorId !== undefined
        : !effect.actorId ||
          ![permission.actorId, permission.contribution.donorId].includes(effect.actorId))
    )
      throw new Error('The contribution ending has no matching current permission.');
    // Later complete permissions retain the accepted consents they combine. Ending
    // one consent ends its dependent unfinished uses without revoking older ones.
    for (const candidate of preparation(batch).byActor.get(permission.actorId) ?? []) {
      const dependent = batch.permissions[candidate.index]!;
      if (
        dependent.revoked ||
        !dependent.contribution?.priorContributionIds.includes(permission.id)
      )
        continue;
      const changed = editable(batch, candidate);
      changed.revoked = true;
      changed.revision++;
    }
    const changed = editable(batch, entry);
    changed.revoked = true;
    changed.revision++;
    batch.effects.push(effect);
    return;
  }
  if (effect.kind === 'material-contributed') {
    if (effect.permissionId !== effect.contribution.consent.recipientGrant.id)
      throw new Error('Invalid contribution authority source.');
    const permission = deriveContributionPermission(
      batch.worldId,
      batch.permissions,
      effect.contribution,
    );
    batch.permissions = [...batch.permissions, permission];
    batch.ownsPermissions = true;
    batch.creations.set(permission.id, permission);
    batch.preparation = undefined;
    batch.contributionDeadlineCursor = 0;
    batch.effects.push(effect);
    return;
  }
  if (effect.kind === 'gate-published' || effect.kind === 'structure-exposed') {
    const publications =
      effect.kind === 'gate-published' ? [effect.publication] : effect.publications;
    if (!publications.length || publications.length > 3)
      throw new Error('Invalid finite asset publication.');
    for (const publication of publications) {
      const entry = preparation(batch).byId.get(effect.permissionId),
        source = entry && batch.permissions[entry.index],
        { before, after } = publication,
        current = batch.campAssets.find((permission) => permission.id === after.id),
        expected =
          source &&
          after.assets.length === 1 &&
          (effect.kind === 'gate-published'
            ? publishedGatePermission
            : publishedStructuralPermission)(source, after.assemblyId, after.assets[0]!, before);
      if (
        !source ||
        source.worldId !== batch.worldId ||
        source.actorId !== effect.actorId ||
        source.revision !== effect.permissionRevision ||
        after.assets.length !== 1 ||
        canonicalJson(current) !== canonicalJson(before) ||
        !expected ||
        canonicalJson(expected) !== canonicalJson(after)
      )
        throw new Error('The completed gate has no matching exact publication permission.');
      batch.campAssets = [
        ...batch.campAssets.filter((permission) => permission.id !== after.id),
        after,
      ];
    }
    batch.effects.push(effect);
    return;
  }
  if (effect.kind === 'hearth-created') {
    const entry = preparation(batch).byId.get(effect.permissionId);
    const permission = entry && batch.permissions[entry.index];
    if (
      !permission ||
      permission.worldId !== batch.worldId ||
      permission.actorId !== effect.actorId ||
      permission.revoked ||
      permission.revision !== effect.permissionRevision ||
      !permission.operations.includes('place-hearth') ||
      permission.site.surfaceId !== effect.site.surfaceId ||
      permission.site.minX > effect.site.minX ||
      permission.site.maxX < effect.site.maxX ||
      permission.site.minZ > effect.site.minZ ||
      permission.site.maxZ < effect.site.maxZ ||
      !effect.originIds.length ||
      effect.originIds.some((origin) => !containsOrigin(permission, origin))
    )
      throw new Error('The completed placed fire has no matching complete permission.');
    batch.effects.push(effect);
    return;
  }
  if (effect.kind !== 'material') {
    recordAssemblyPermissionEffect(batch, effect);
    return;
  }
  const fact = effect.acquisition,
    prepared = preparation(batch),
    entry = prepared.byId.get(effect.permissionId),
    current = entry && batch.permissions[entry.index];
  if (
    !entry ||
    !current ||
    current.revoked ||
    current.worldId !== batch.worldId ||
    current.actorId !== fact.actorId ||
    fact.operation !== 'gather' ||
    !fact.sourceId
  )
    throw new Error('A material permission proposal has no current source authority.');
  const source = sourceDefinitions(entry, current).get(fact.sourceId);
  const added = new Set<string>();
  for (const output of fact.outputs) {
    if (!source || !sameDefinitionPin(source, output.definition))
      throw new Error('A material permission proposal changed its exact source definition.');
    if (output.originIds.length !== 1 || output.originIds[0] !== output.itemId)
      throw new Error('Independent gathering requires its own actual material origin.');
    for (const id of output.originIds) if (!containsOrigin(current, id)) added.add(id);
  }
  if (!added.size) return;
  if (current.materialIds.length + added.size > CONSTRUCTION_PERMISSION_LIMITS.materialOrigins)
    throw new Error('A material acquisition exceeded its preflight permission bound.');
  const permission = editable(batch, entry);
  permission.materialIds.push(...added);
  permission.revision++;
  batch.effects.push(effect);
}

export function recordAssemblyPermissionEffect(
  batch: ConstructionPermissionBatch,
  effect: Extract<ConstructionPermissionEffect, { kind: 'assembly-created' | 'assembly-retired' }>,
): void {
  const prepared = preparation(batch),
    admitted = prepared.byId.get(effect.permissionId),
    permission = admitted && batch.permissions[admitted.index];
  if (
    !permission ||
    permission.revoked ||
    permission.worldId !== batch.worldId ||
    permission.actorId !== effect.actorId ||
    permission.revision !== effect.permissionRevision
  )
    throw new Error('The completed assembly has no matching current admission.');
  const entries =
    effect.kind === 'assembly-created'
      ? (prepared.byActor.get(effect.actorId) ?? []).filter(
          (entry) =>
            !batch.permissions[entry.index]!.revoked &&
            !!batch.permissions[entry.index]!.acquisition,
        )
      : [...prepared.byId.values()].filter((entry) =>
          batch.permissions[entry.index]!.acquisition?.assemblyIds.includes(effect.assemblyId),
        );
  let changed = false;
  for (const entry of entries) {
    const contains = batch.permissions[entry.index]!.acquisition!.assemblyIds.includes(
      effect.assemblyId,
    );
    if ((effect.kind === 'assembly-created') === contains) continue;
    const target = editable(batch, entry);
    if (effect.kind === 'assembly-created') {
      target.acquisition!.assemblyIds.push(effect.assemblyId);
    } else {
      target.acquisition!.assemblyIds = target.acquisition!.assemblyIds.filter(
        (id) => id !== effect.assemblyId,
      );
    }
    target.revision++;
    changed = true;
  }
  if (changed) batch.effects.push(effect);
}

/** Deadlines are derived from the same operational grant view, never saved timers. */
export function nextContributionDeadline(batch: ConstructionPermissionBatch): number {
  const prepared = preparation(batch);
  while (batch.contributionDeadlineCursor < prepared.contributionDeadlines.length) {
    const deadline = prepared.contributionDeadlines[batch.contributionDeadlineCursor]!,
      entry = prepared.byId.get(deadline.id),
      grant = entry && batch.permissions[entry.index];
    if (grant && !grant.revoked) return deadline.at;
    batch.contributionDeadlineCursor++;
  }
  return Infinity;
}
export function expireConstructionContributions(
  world: WorldState,
  batch: ConstructionPermissionBatch,
): boolean {
  let changed = false;
  while (nextContributionDeadline(batch) <= world.simTime) {
    const prepared = preparation(batch),
      deadline = prepared.contributionDeadlines[batch.contributionDeadlineCursor]!,
      grant = batch.permissions[prepared.byId.get(deadline.id)!.index]!;
    applyConstructionPermissionEffect(batch, {
      kind: 'contribution-ended',
      permissionId: grant.id,
      permissionRevision: grant.revision,
      actionId: nextId(world, 'contribution-expiry'),
      at: world.simTime,
      reason: 'expired',
    });
    batch.contributionDeadlineCursor++;
    changed = true;
  }
  return changed;
}
/** A nested native command owns its candidate too. Replay only its proposed
 * authority calculations into this enclosing unpublished permission view. */
export function absorbConstructionPermissionBatch(
  batch: ConstructionPermissionBatch,
  transition: Transition,
): void {
  if (transition.materialAcquisitions)
    batch.materialAcquisitions.push(...transition.materialAcquisitions);
  for (const effect of transition.constructionEffects ?? [])
    applyConstructionPermissionEffect(batch, effect);
}
export function finishConstructionPermissionBatch(
  transition: Transition,
  batch: ConstructionPermissionBatch,
): Transition {
  if (batch.materialAcquisitions.length)
    transition.materialAcquisitions = batch.materialAcquisitions;
  if (batch.effects.length) {
    transition.constructionEffects = batch.effects;
    transition.constructionUpdates = [...batch.updates.values()];
    if (batch.creations.size) transition.constructionCreations = [...batch.creations.values()];
  }
  return transition;
}
