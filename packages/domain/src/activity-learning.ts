import { canonicalJson, contentLabel } from './events.js';
import { cloneValue } from './draft.js';
import { isActivityCommand } from './agency.js';
import {
  ACTIVITY_LIMITS,
  validateActivityNode,
  renderActivity,
  type ActivityMethod,
  type ActivityAcquisition,
  type ActivityNode,
  type ActivityOccurrence,
  type ActivityBinding,
} from './action-experience.js';
import { definitionPin } from './world-modules.js';
import {
  activityHostForCommand,
  activityHostPin,
  installedActivityHost,
} from './activity-hosts.js';
import { accessiblePossession } from './object-access.js';
import { inspectedContainer } from './inventory-inspection.js';
import { seesEntity } from './perception.js';
import { isSafeRecordId } from './records.js';
import { isDefinitionPin } from './state-owners.js';
import { STOCK_TRANSFER_LIMITS } from './stock-transfer.js';
import { sharedNativeActivityName } from './worlds/base/action-views.js';
import { finitePoint } from '@open-legend/spatial';
import type { WorldState } from './types.js';

export interface ActivityCandidate {
  signature: string;
  method: ActivityMethod;
  occurrenceIds: string[];
  description: string;
  bindings: Record<string, ActivityBinding>;
  otherEvidence?: string[];
  /** Discovery annotations only. Execution keeps each original step once, even
   * when two compatible known spans overlap. Never shown as another's knowledge. */
  matches?: { methodId: string; occurrenceIds: string[] }[];
  matchingDeferred?: boolean;
}
const roleFields = new Set([
  'targetId',
  'intendedRecipientId',
  'itemId',
  'weaponItemId',
  'ammoItemId',
  'heatId',
  'sourceId',
  'destinationId',
]);
/** One current binding check shared by the native chooser and prepared offers.
 * Seeing a basket does not disclose its contents or authorize fresh stock selection.
 * docs/projects/parallel-batch-01-playable-week/camp-activities.md#actual-outputs-and-learning */
export function activityRoleCompatible(
  world: WorldState,
  actorId: string,
  requirement: ActivityMethod['roles'][string],
  value: ActivityBinding | undefined,
): boolean {
  if (requirement.kind === 'self') return value === actorId && !!world.entities[actorId]?.actor;
  if (requirement.kind === 'text')
    return typeof value === 'string' && !!value.trim() && value.length <= 1500;
  if (requirement.kind === 'place')
    return (
      !!value && typeof value === 'object' && finitePoint(value) && isSafeRecordId(value.surfaceId)
    );
  const entity = typeof value === 'string' ? world.entities[value] : undefined;
  const actor = world.entities[actorId];
  if (!entity || entity.retirement || !actor?.actor) return false;
  const carried = accessiblePossession(world, actorId, entity.id);
  const stockContainer = requirement.commandFields.some((field) =>
    ['sourceId', 'destinationId'].includes(field),
  );
  const inspected = stockContainer ? inspectedContainer(world, actorId) : undefined;
  if (
    entity.id !== actorId &&
    !carried &&
    inspected?.id !== entity.id &&
    !seesEntity(world, actor, entity)
  )
    return false;
  if (
    (requirement.definitionId &&
      (entity.item?.definitionPin.id !== requirement.definitionId ||
        entity.item.definitionPin.version !== requirement.definitionVersion ||
        entity.item.definitionPin.digest !== requirement.definitionDigest)) ||
    (requirement.entityKind && entity.kind !== requirement.entityKind) ||
    (requirement.maximumHealth !== undefined &&
      (entity.actor?.health ?? Infinity) > requirement.maximumHealth)
  )
    return false;
  if (stockContainer) {
    if (!(entity.container || entity.kind === 'item-pile')) return false;
    if (!carried && inspected?.id !== entity.id) return false;
  }
  const material = requirement.gatheredDefinition;
  if (material) {
    const definition = world.itemDefinitions[material.id];
    if (
      !definition ||
      entity.resource?.definitionId !== material.id ||
      canonicalJson(definitionPin(definition)) !== canonicalJson(material)
    )
      return false;
  }
  if (
    requirement.targetHost &&
    !installedActivityHost(world, requirement.targetHost)?.acceptsTarget?.(world, entity.id)
  )
    return false;
  return true;
}

/** Only the committed custody owner supplies reusable meaning. Its exact lots and
 * revisions prove this attempt; they must never become future transaction authority. */
function supportedStockOccurrence(entry: ActivityOccurrence): boolean {
  if (entry.command.type !== 'transfer-stock') return true;
  const command = entry.command,
    resolution = entry.stockResolution;
  return (
    !!resolution &&
    isDefinitionPin(resolution.definition) &&
    resolution.sourceId === command.sourceId &&
    resolution.destinationId === command.destinationId &&
    resolution.definition.id === command.definitionId &&
    resolution.definition.version === command.definitionVersion &&
    resolution.definition.digest === command.definitionDigest &&
    resolution.quantity === command.quantity &&
    resolution.minimumHeld === command.minimumHeld &&
    Number.isSafeInteger(resolution.destinationRevision) &&
    resolution.destinationRevision >= 0 &&
    Array.isArray(resolution.lots) &&
    resolution.lots.length > 0 &&
    resolution.lots.length <= STOCK_TRANSFER_LIMITS.movedLots &&
    resolution.lots.every(
      (lot) =>
        !!lot &&
        isSafeRecordId(lot.itemId) &&
        Number.isSafeInteger(lot.quantity) &&
        lot.quantity > 0 &&
        Number.isSafeInteger(lot.revision) &&
        lot.revision >= 0 &&
        Number.isSafeInteger(lot.placementRevision) &&
        lot.placementRevision >= 0,
    ) &&
    new Set(resolution.lots.map((lot) => lot.itemId)).size === resolution.lots.length &&
    resolution.lots.reduce((sum, lot) => sum + lot.quantity, 0) === command.quantity &&
    entry.outputs.length > 0 &&
    entry.outputs.every(
      (output) =>
        output.definitionId === command.definitionId &&
        isSafeRecordId(output.itemId) &&
        Number.isSafeInteger(output.quantity) &&
        output.quantity > 0,
    ) &&
    new Set(entry.outputs.map((output) => output.itemId)).size === entry.outputs.length &&
    entry.outputs.reduce((sum, output) => sum + output.quantity, 0) === command.quantity
  );
}
/** Generalize only actual native object bindings. Definitions and demonstrated
 * quantities remain fixed; prose and adjacency never prove equivalence. */
export function normalizeActivity(
  world: WorldState,
  actorId: string,
  entries: ActivityOccurrence[],
  incomplete = false,
): ActivityCandidate | undefined {
  if (
    entries.length < 2 ||
    entries.length > ACTIVITY_LIMITS.nodes ||
    entries.some(
      (entry) =>
        entry.actorId !== actorId ||
        entry.revoked ||
        entry.noLearningControl ||
        !supportedStockOccurrence(entry) ||
        (entry.command.type === 'tend-fire' && entry.command.onlyWhenLow === true) ||
        (entry.status !== 'completed' && !entry.outputs.length) ||
        !isActivityCommand(entry.command),
    )
  )
    return;
  const roles: ActivityMethod['roles'] = {};
  const bindings: Record<string, ActivityBinding> = {};
  const identities = new Map<string, string>();
  const outputs = new Map<string, { step: string; port: string; quantity: number }>();
  const children: ActivityNode[] = [];
  for (const [index, entry] of entries.entries()) {
    const args: Extract<ActivityNode, { kind: 'invoke' }>['args'] = {};
    for (const [field, value] of Object.entries(entry.command)) {
      if (['id', 'actorId', 'type', 'purpose'].includes(field) || value === undefined) continue;
      // An absolute deadline belongs to one occasion, not a reusable method.
      if (entry.command.type === 'follow' && field === 'until') return;
      if (typeof value === 'string' && roleFields.has(field)) {
        const produced = outputs.get(value);
        if (produced && field === 'itemId') {
          args[field] = { output: produced.step, port: produced.port, quantity: 1 };
          continue;
        }
        const self = ['sourceId', 'destinationId'].includes(field) && value === actorId;
        const identity = self ? `self:${value}` : value;
        let role = identities.get(identity);
        if (!role) {
          role = `object${identities.size + 1}`;
          identities.set(identity, role);
          const object = entry.objects[value];
          const definitionId = object?.definitionId;
          if (
            !self &&
            (!object ||
              (['sourceId', 'destinationId'].includes(field) &&
                !definitionId &&
                object.kind !== 'item-pile'))
          )
            return;
          roles[role] = {
            commandFields: [],
            kind: self ? 'self' : 'object',
            ...(!self && definitionId
              ? {
                  definitionId,
                  definitionVersion: object?.definitionVersion,
                  definitionDigest: object?.definitionDigest,
                }
              : !self
                ? { entityKind: object?.kind }
                : {}),
          };
          const entryHealth = entry.view.facts.find(
            (fact) => fact.name === 'health before the attempt' || fact.name === 'health',
          );
          if (
            field === 'targetId' &&
            entryHealth &&
            typeof entryHealth.value === 'string' &&
            ['strike', 'hunt'].includes(entry.command.type)
          ) {
            const health = Number(entryHealth.value.split('/')[0]);
            if (Number.isFinite(health)) roles[role]!.maximumHealth = health;
          }
          bindings[role] = value;
        }
        if (!roles[role]!.commandFields.includes(field)) roles[role]!.commandFields.push(field);
        if (entry.command.type === 'gather' && field === 'targetId') {
          const materials = new Set(entry.outputs.map((output) => output.definitionId));
          if (materials.size !== 1) return;
          const definition = world.itemDefinitions[entry.outputs[0]!.definitionId];
          if (!definition) return;
          const pin = definitionPin(definition);
          if (
            roles[role]!.gatheredDefinition &&
            canonicalJson(roles[role]!.gatheredDefinition) !== canonicalJson(pin)
          )
            return;
          roles[role]!.gatheredDefinition = pin;
        }
        const host = activityHostForCommand(world, entry.command.type);
        if (host?.acceptsTarget && ['targetId', 'heatId'].includes(field)) {
          const pin = activityHostPin(host);
          if (
            roles[role]!.targetHost &&
            canonicalJson(roles[role]!.targetHost) !== canonicalJson(pin)
          )
            return;
          roles[role]!.targetHost = pin;
        }
        args[field] = { role };
      } else if (entry.command.type === 'say' && field === 'text' && typeof value === 'string') {
        // Personal words remain in personal acquisition bindings, never in the
        // shared definition. Reproducing a shape does not reveal another speaker.
        const role = `words${index + 1}`;
        roles[role] = { commandFields: [field], kind: 'text' };
        bindings[role] = value;
        args[field] = { role };
      } else if (['string', 'number', 'boolean'].includes(typeof value)) {
        args[field] = { literal: value as string | number | boolean };
      } else if (
        field === 'destination' &&
        value &&
        typeof value === 'object' &&
        finitePoint(value) &&
        'surfaceId' in value &&
        typeof value.surfaceId === 'string'
      ) {
        const role = `place${identities.size + 1}`;
        identities.set(canonicalJson(value), role);
        roles[role] = { commandFields: [field], kind: 'place' };
        bindings[role] = { x: value.x, y: value.y, z: value.z, surfaceId: value.surfaceId };
        args[field] = { role };
      } else return;
    }
    const key = `step${index + 1}`;
    const safeName = sharedNativeActivityName(world, entry.command);
    children.push({
      kind: 'invoke',
      key,
      name: safeName,
      command: entry.command.type,
      args,
      ...(entry.outputs.length
        ? { outputs: entry.outputs.map(({ itemId: _itemId, ...output }) => output) }
        : {}),
    });
    for (const output of entry.outputs) outputs.set(output.itemId, { step: key, ...output });
  }
  const name = children
    .map((node) => node.name)
    .join(', then ')
    .slice(0, ACTIVITY_LIMITS.text);
  const root: ActivityNode = { kind: 'sequence', name, children };
  try {
    validateActivityNode(root);
  } catch {
    return;
  }
  const manifest = canonicalJson(world.moduleManifest);
  const executable =
    !incomplete && entries.every((entry) => entry.status === 'completed' && !entry.incomplete);
  const signature = canonicalJson({ root, roles, manifest, executable });
  let description: string;
  try {
    // A chosen purpose helps assess non-material methods such as social actions.
    // It belongs only to this actor's evidence, never the shared definition/key.
    const purpose = entries[0]?.parentName;
    const commonPurpose =
      purpose &&
      entries.every(
        (entry) => entry.parentId === entries[0]!.parentId && entry.parentName === purpose,
      );
    const children = entries.map((entry) =>
      !commonPurpose && entry.parentName && entry.parentName !== entry.view.name
        ? { name: entry.parentName, facts: [], children: [entry.view] }
        : entry.view,
    );
    description = `${renderActivity({ name: commonPurpose ? purpose : name, facts: [], children }, 'What happened')}. These attempts are evidence, not a guarantee of future success.${incomplete ? ' Some required supporting history is unavailable; this idea cannot be executed.' : ''}`;
  } catch {
    return;
  } // Optional derived work cannot pause physical simulation on overflow.
  const candidate = {
    signature,
    method: {
      executable,
      id: `activity-${contentLabel(signature)}`,
      signature,
      manifest,
      name,
      root,
      roles,
    },
    occurrenceIds: entries.map((entry) => entry.id),
    bindings,
    description,
  };
  if (
    new TextEncoder().encode(JSON.stringify(candidate.method)).length > ACTIVITY_LIMITS.recordBytes
  )
    return;
  return candidate;
}

/** Bounded pairs, endpoint backward slices and explicit-purpose spans. The caller
 * supplies a scoped history page; missing support stays incomplete. */
export function discoverActivities(
  world: WorldState,
  actorId: string,
  supplied: ActivityOccurrence[],
): {
  candidates: ActivityCandidate[];
  visited: number;
  incomplete: boolean;
  examined: string[];
  more: boolean;
  matchWork: number;
} {
  const entries = supplied.slice(-ACTIVITY_LIMITS.visits);
  const byId = new Map(
    entries
      .filter((entry) => entry.actorId === actorId && !entry.revoked)
      .map((entry) => [entry.id, entry]),
  );
  const assessed = new Set(world.actionExperience.learning[actorId]?.assessed ?? []);
  const owned = world.actionExperience.acquisitions[actorId] ?? {};
  const candidates: ActivityCandidate[] = [];
  const priorExamined = new Set(world.actionExperience.learning[actorId]?.examined ?? []);
  const examined: string[] = [];
  let more = false;
  let visited = 0,
    incomplete = supplied.length > entries.length;
  const incompleteSlices = new WeakSet<Set<string>>();
  const emit = (ids: Set<string>): void => {
    if (candidates.length >= ACTIVITY_LIMITS.candidates) {
      incomplete = true;
      return;
    }
    const candidate = normalizeActivity(
      world,
      actorId,
      entries.filter((entry) => ids.has(entry.id)),
      incompleteSlices.has(ids),
    );
    const known =
      candidate &&
      Object.values(world.actionExperience.methods).find(
        (method) => method.signature === candidate.signature,
      );
    const acquisition = known && owned[known.id];
    if (
      !candidate ||
      (assessed.has(candidate.signature) && !acquisition) ||
      acquisition?.supports.some(
        (support) =>
          !support.revoked &&
          canonicalJson(support.occurrenceIds) === canonicalJson(candidate.occurrenceIds),
      ) ||
      candidates.some((other) => other.signature === candidate.signature)
    )
      return;
    const targets = new Set(
      entries
        .filter((entry) => ids.has(entry.id))
        .flatMap((entry) => ('targetId' in entry.command ? [entry.command.targetId] : [])),
    );
    const failures = entries
      .filter(
        (entry) =>
          !entry.revoked &&
          entry.actorId === actorId &&
          !ids.has(entry.id) &&
          (entry.outcome?.ok === false || entry.outcome?.code === 'miss') &&
          'targetId' in entry.command &&
          targets.has(entry.command.targetId),
      )
      .slice(-8);
    if (failures.length) {
      candidate.otherEvidence = failures.map((entry) => entry.id);
      candidate.description += ` Other observed attempts, not required steps: ${failures.map((entry) => renderActivity(entry.view)).join('; ')}.`;
    }
    candidates.push(candidate);
  };
  const closure = (seed: string[], material: boolean): Set<string> => {
    const selected = new Set<string>(),
      pending = [...seed];
    while (
      pending.length &&
      visited < ACTIVITY_LIMITS.visits &&
      selected.size < ACTIVITY_LIMITS.nodes
    ) {
      const id = pending.pop()!;
      if (selected.has(id)) continue;
      visited++;
      const entry = byId.get(id);
      if (!entry) {
        incomplete = true;
        incompleteSlices.add(selected);
        continue;
      }
      selected.add(id);
      for (const connection of entry.connections)
        if (material || connection.relation === 'support' || connection.relation === 'state')
          pending.push(connection.from);
    }
    if (pending.length) {
      incomplete = true;
      incompleteSlices.add(selected);
    }
    return selected;
  };
  const endpoints = [...entries]
    .reverse()
    .filter(
      (entry) =>
        entry.status === 'completed' &&
        entry.connections.length &&
        !entry.revoked &&
        !priorExamined.has(entry.id),
    );
  for (const endpoint of endpoints) {
    if (candidates.length || visited >= ACTIVITY_LIMITS.visits / 2) {
      more = true;
      break;
    }
    examined.push(endpoint.id);
    const component = closure([endpoint.id], true);
    const edges = entries
      .filter((entry) => component.has(entry.id))
      .flatMap((entry) =>
        entry.connections
          .filter((link) => link.relation === 'material' || link.relation === 'state')
          .map((connection) => ({ entry, connection })),
      )
      .sort(
        (a, b) =>
          Number(a.connection.relation !== 'material') -
          Number(b.connection.relation !== 'material'),
      );
    for (const { entry, connection } of edges) {
      if (!byId.has(connection.from)) {
        incomplete = true;
        continue;
      }
      emit(closure([connection.from, entry.id], false));
      if (candidates.length >= ACTIVITY_LIMITS.candidates - 1) break;
    }
    emit(component);
  }
  if (candidates.length < ACTIVITY_LIMITS.candidates) {
    const purposes = new Map<string, Set<string>>();
    for (const entry of entries)
      if (entry.parentId && entry.status === 'completed' && !entry.revoked) {
        const span = purposes.get(entry.parentId) ?? new Set<string>();
        span.add(entry.id);
        purposes.set(entry.parentId, span);
      }
    for (const span of purposes.values()) {
      emit(span);
      if (candidates.length >= ACTIVITY_LIMITS.candidates) break;
    }
  }
  let matchWork = 0;
  const definitions = new Map(
    Object.values(world.actionExperience.methods).map((method) => [method.signature, method]),
  );
  const lengths = [
    ...new Set(
      [...definitions.values()]
        .filter(
          (method) =>
            method.root.kind === 'sequence' &&
            method.root.children.every((node) => node.kind === 'invoke'),
        )
        .map((method) => (method.root.kind === 'sequence' ? method.root.children.length : 0)),
    ),
  ].filter((length) => length >= 2);
  for (const candidate of candidates) {
    const trace = candidate.occurrenceIds.map((id) => byId.get(id)!);
    candidate.matches = [];
    for (const length of lengths)
      for (let start = 0; start + length <= trace.length; start++) {
        if (matchWork + length > ACTIVITY_LIMITS.visits) {
          candidate.matchingDeferred = true;
          break;
        }
        matchWork += length;
        const span = normalizeActivity(world, actorId, trace.slice(start, start + length));
        const definition = span && definitions.get(span.signature);
        if (definition)
          candidate.matches.push({ methodId: definition.id, occurrenceIds: span!.occurrenceIds });
      }
  }
  return { candidates, visited, incomplete, examined, more, matchWork };
}

/** Existing saved-world transaction publishes the immutable definition and private
 * acquisition together. Declining never creates an orphan catalogue entry. */
export function retainActivity(
  world: WorldState,
  actorId: string,
  candidate: ActivityCandidate,
): string | undefined {
  validateActivityNode(candidate.method.root);
  if (candidate.method.manifest !== canonicalJson(world.moduleManifest)) return;
  const entries = world.actionExperience.occurrences[actorId] ?? [];
  const sources = candidate.occurrenceIds.map((id) => entries.find((entry) => entry.id === id));
  if (
    sources.some(
      (entry) => !entry || entry.revoked || (entry.status !== 'completed' && !entry.outputs.length),
    )
  )
    return;
  const verified = normalizeActivity(
    world,
    actorId,
    sources as ActivityOccurrence[],
    !candidate.method.executable,
  );
  if (!verified || verified.signature !== candidate.signature) return;
  const state = world.actionExperience;
  const owned = (state.acquisitions[actorId] ??= {});
  let method = Object.values(state.methods).find(
    (entry) => entry.signature === candidate.signature,
  );
  if (!method && Object.keys(state.methods).length >= ACTIVITY_LIMITS.definitions) return;
  if (!method) {
    let id = candidate.method.id,
      suffix = 0;
    while (state.methods[id]) id = `${candidate.method.id}-${++suffix}`;
    method = { ...cloneValue(candidate.method), id };
  }
  if (!owned[method.id] && Object.keys(owned).length >= ACTIVITY_LIMITS.acquisitions) return;
  const acquisition = cloneValue<ActivityAcquisition>(
    owned[method.id] ?? {
      id: method.id,
      methodId: method.id,
      actorId,
      at: world.simTime,
      supports: [],
      status: 'tentative',
      bindings: cloneValue(candidate.bindings),
    },
  );
  if (
    !acquisition.supports.some(
      (support) => canonicalJson(support.occurrenceIds) === canonicalJson(candidate.occurrenceIds),
    ) &&
    acquisition.supports.length < ACTIVITY_LIMITS.links
  )
    acquisition.supports.push({
      occurrenceIds: [...candidate.occurrenceIds],
      evidenceIds: [
        ...new Set([
          ...sources.flatMap((entry) => entry!.evidenceIds),
          ...(candidate.otherEvidence ?? []),
          ...entries
            .filter((entry) => candidate.otherEvidence?.includes(entry.id))
            .flatMap((entry) => entry.evidenceIds),
        ]),
      ],
      revoked: false,
    });
  if (
    new TextEncoder().encode(JSON.stringify(acquisition)).length > ACTIVITY_LIMITS.acquisitionBytes
  )
    return;
  state.methods[method.id] = method;
  owned[method.id] = acquisition;
  return method.id;
}
export function revokeActivityEvidence(world: WorldState, actorId: string, ids: string[]): void {
  const selected = new Set(ids);
  for (const entry of world.actionExperience.occurrences[actorId] ?? [])
    if (selected.has(entry.id) || entry.evidenceIds.some((id) => selected.has(id)))
      entry.revoked = true;
  for (const acquisition of Object.values(world.actionExperience.acquisitions[actorId] ?? {}))
    for (const support of acquisition.supports)
      if (
        support.occurrenceIds.some((id) => selected.has(id)) ||
        support.evidenceIds.some((id) => selected.has(id))
      )
        support.revoked = true;
}
export function acquiredActivities(world: WorldState, actorId: string): ActivityMethod[] {
  const manifest = canonicalJson(world.moduleManifest);
  return Object.values(world.actionExperience.acquisitions[actorId] ?? {})
    .filter((acquisition) => acquisition.supports.some((support) => !support.revoked))
    .map((acquisition) => world.actionExperience.methods[acquisition.methodId]!)
    .filter(
      (method) =>
        method &&
        method.manifest === manifest &&
        Object.values(method.roles).every((role) => {
          if (role.targetHost && !installedActivityHost(world, role.targetHost)) return false;
          return [
            ...(role.definitionId
              ? [
                  {
                    id: role.definitionId,
                    version: role.definitionVersion,
                    digest: role.definitionDigest,
                  },
                ]
              : []),
            ...(role.gatheredDefinition ? [role.gatheredDefinition] : []),
          ].every((required) => {
            const definition = world.itemDefinitions[required.id];
            return (
              !!definition && canonicalJson(definitionPin(definition)) === canonicalJson(required)
            );
          });
        }),
    );
}
