import { validateBodyPolicy } from './body-policy.js';
import { completeContributionHistory } from './contribution-residency.js';
import { canonicalJson } from './events.js';
import {
  bodyPolicyConditions,
  statusDefinitionConditions,
  visitStatusCondition,
  type StatusDefinitionReference,
} from './status-condition-references.js';
import { validateStatusEffectPolicy } from './status-effect-validation.js';
import type { StatusEffectDefinition, StatusEffectPolicy } from './status-effects.js';
import type { WorldState } from './types.js';
import type { WorkInvocation } from './work-budget.js';

export interface StatusEffectRemovalDefinition {
  id: string;
  label: string;
  selectedRoot: boolean;
  reason: {
    kind: 'root' | 'dependent';
    viaDefinitionId?: string;
    sourcePath?: string;
    witness: string[];
  };
}
export interface StatusEffectRemovalOptionalDefinition {
  id: string;
  label: string;
  selected: boolean;
  required: boolean;
  referencedBy: string[];
  sourcePaths: string[];
}
export type StatusEffectRemovalWork = Pick<
  WorkInvocation,
  'id' | 'rootId' | 'parentId' | 'actorId' | 'moduleId' | 'definitionPin' | 'allocation'
>;
export interface StatusEffectRemovalInstance {
  entityId: string;
  entityLabel: string;
  definitionId: string;
  definitionLabel: string;
  recordId: string;
  episode: string;
  active: boolean;
  sourceId: string;
  actionTargetId: string;
  /** An expressly edited surviving definition ends its active episode but keeps its record. */
  disposition: 'remove' | 'end';
  action?: { id: string; type: string; label: string; workInvocationId?: string };
  work?: StatusEffectRemovalWork;
}
export interface StatusEffectRemovalBlocker {
  kind:
    | 'body-policy'
    | 'dream-policy'
    | 'contribution-pin'
    | 'history-unavailable'
    | 'candidate-invalid'
    | 'unsupported-root'
    | 'unsupported-optional';
  definitionId?: string;
  sourcePath?: string;
  entityId?: string;
  recordId?: string;
  message: string;
}
export interface StatusEffectRemovalAnalysis {
  status: 'complete' | 'blocked' | 'incomplete';
  rootIds: string[];
  optionalIds: string[];
  requiredDefinitions: StatusEffectRemovalDefinition[];
  optionalDefinitions: StatusEffectRemovalOptionalDefinition[];
  instances: StatusEffectRemovalInstance[];
  blockers: StatusEffectRemovalBlocker[];
  candidatePolicy: StatusEffectPolicy;
  /** Complete canonical facts. The server may digest these through its exact-review
   * owner; a non-security domain content label alone cannot bind authorization. */
  binding: string;
  work: {
    definitions: number;
    conditionNodes: number;
    references: number;
    /** Actual predicate visits for relationship preparation; source counts above include reuse. */
    topologyNodesVisited: number;
    entities: number;
    instanceRecords: number;
    contributionRecords: number;
  };
}

export class StatusEffectRemovalCapacityError extends Error {
  constructor() {
    super('The complete removal exceeds the retained review allowance.');
    this.name = 'StatusEffectRemovalCapacityError';
  }
}

interface StatusRemovalTopology {
  definitions: Map<string, StatusEffectDefinition>;
  signatures: Map<string, string>;
  references: Map<string, StatusDefinitionReference[]>;
  incoming: Map<string, Array<{ id: string; reference: StatusDefinitionReference }>>;
  conditionNodes: number;
  referenceCount: number;
}
const installedTopologies = new WeakMap<StatusEffectPolicy, StatusRemovalTopology>();
function deeplyFrozen(value: object) {
  const pending: object[] = [value];
  const seen = new Set<object>();
  for (let index = 0; index < pending.length; index++) {
    const current = pending[index]!;
    if (seen.has(current)) continue;
    seen.add(current);
    if (!Object.isFrozen(current)) return false;
    for (const child of Object.values(current))
      if (child && typeof child === 'object') pending.push(child);
  }
  return true;
}
function removalTopology(
  policy: StatusEffectPolicy,
  supplied: Map<string, StatusEffectDefinition>,
) {
  const cached = installedTopologies.get(policy);
  const definitions = cached?.definitions ?? new Map(policy.definitions.map((d) => [d.id, d]));
  const signatures =
    cached?.signatures ?? new Map(policy.definitions.map((d) => [d.id, canonicalJson(d)]));
  const build = (effective: Map<string, StatusEffectDefinition>): StatusRemovalTopology => {
    const references: StatusRemovalTopology['references'] = new Map();
    const incoming: StatusRemovalTopology['incoming'] = new Map();
    let conditionNodes = 0;
    let referenceCount = 0;
    for (const definition of policy.definitions) {
      const outgoing: StatusDefinitionReference[] = [];
      for (const { condition, sourcePath } of statusDefinitionConditions(
        effective.get(definition.id) ?? definition,
      ))
        conditionNodes += visitStatusCondition(condition, sourcePath, (predicate, path) => {
          if (!('statusActive' in predicate)) return;
          const reference = { ...predicate.statusActive, sourcePath: `${path}.statusActive` };
          outgoing.push(reference);
          const dependents = incoming.get(reference.definitionId) ?? [];
          dependents.push({ id: definition.id, reference });
          incoming.set(reference.definitionId, dependents);
          referenceCount++;
        });
      references.set(definition.id, outgoing);
    }
    return { definitions, signatures, references, incoming, conditionNodes, referenceCount };
  };
  const installed = cached ?? build(new Map());
  // Published definitions can be reused across clock/episode changes. Certify the
  // entire policy once; shallow freezing or a mutable builder cannot authorize reuse.
  if (!cached && deeplyFrozen(policy)) installedTopologies.set(policy, installed);
  const edited = [...supplied].some(
    ([id, definition]) => signatures.has(id) && signatures.get(id) !== canonicalJson(definition),
  );
  // Express mixed survivor edits determine dependency meaning. Never cache a
  // mutable candidate or silently restore its installed relationships.
  const topology = edited ? build(supplied) : installed;
  return {
    ...topology,
    topologyNodesVisited:
      (cached ? 0 : installed.conditionNodes) + (edited ? topology.conditionNodes : 0),
  };
}

/** Read-only finite analysis for the installed native status family. Complete cold
 * contribution history must come from its storage owner before this function runs.
 * This prepares a candidate; only admitStatusEffectPolicy may mutate the world.
 * docs/projects/completed/parallel-batch-09-reviewed-content-removal-tech-design.md#rd01--complete-finite-dependency-and-live-impact-analysis */
export function analyzeStatusEffectRemoval(
  world: WorldState,
  request: {
    rootIds: string[];
    optionalIds?: string[];
    candidatePolicy?: StatusEffectPolicy;
    /** UTF-16 witness JSON length is a lower bound on retained UTF-8 review bytes. */
    maxExplanationCharacters?: number;
  },
): StatusEffectRemovalAnalysis {
  const policy = world.statusEffectPolicy;
  const work: StatusEffectRemovalAnalysis['work'] = {
    definitions: policy.definitions.length,
    conditionNodes: 0,
    references: 0,
    topologyNodesVisited: 0,
    entities: 0,
    instanceRecords: 0,
    contributionRecords: 0,
  };
  const blockers: StatusEffectRemovalBlocker[] = [];
  let suppliedPolicy: StatusEffectPolicy | undefined;
  if (request.candidatePolicy) {
    try {
      validateStatusEffectPolicy(world, request.candidatePolicy);
      suppliedPolicy = request.candidatePolicy;
    } catch (error) {
      blockers.push({
        kind: 'candidate-invalid',
        message:
          error instanceof Error ? error.message : 'The supplied condition policy is invalid.',
      });
    }
  }
  const suppliedDefinitions = new Map(
    suppliedPolicy?.definitions.map((definition) => [definition.id, definition]) ?? [],
  );
  const topology = removalTopology(policy, suppliedDefinitions);
  const { definitions, references, incoming } = topology;
  work.conditionNodes = topology.conditionNodes;
  work.references = topology.referenceCount;
  work.topologyNodesVisited = topology.topologyNodesVisited;
  const rootIds = [...new Set(request.rootIds)];
  const optionalIds = [...new Set(request.optionalIds ?? [])];
  const optionalSet = new Set(optionalIds);
  const reasons = new Map<string, StatusEffectRemovalDefinition['reason']>();
  const explanationLengths = new Map<string, number>();
  let explanationCharacters = 0;
  // Stop before allocating paths already too large for the caller's existing review
  // envelope. Admitted reviews retain their exact witnesses and approval binding.
  const accountExplanation = (id: string, characters: number) => {
    const total = explanationCharacters - (explanationLengths.get(id) ?? 0) + characters;
    if (request.maxExplanationCharacters !== undefined && total > request.maxExplanationCharacters)
      throw new StatusEffectRemovalCapacityError();
    explanationLengths.set(id, characters);
    explanationCharacters = total;
  };
  const pending: string[] = [];
  const addRoot = (id: string) => {
    if (reasons.has(id)) return;
    accountExplanation(id, JSON.stringify(id).length + 2);
    reasons.set(id, { kind: 'root', witness: [id] });
    pending.push(id);
  };
  for (const id of rootIds) {
    if (definitions.has(id)) addRoot(id);
    else
      blockers.push({
        kind: 'unsupported-root',
        definitionId: id,
        message: 'Reviewed removal requires an exact installed condition definition.',
      });
  }
  if (!rootIds.length)
    blockers.push({
      kind: 'unsupported-root',
      message: 'Select an installed condition to remove.',
    });
  // A previously selected support remains a root when another support is
  // unchecked: removing it may make that other condition a required dependent.
  for (const id of optionalIds) if (definitions.has(id)) addRoot(id);
  let cursor = 0;
  const close = () => {
    for (; cursor < pending.length; cursor++) {
      const id = pending[cursor]!;
      for (const dependent of incoming.get(id) ?? []) {
        if (reasons.has(dependent.id)) continue;
        accountExplanation(
          dependent.id,
          explanationLengths.get(id)! + JSON.stringify(dependent.id).length + 1,
        );
        reasons.set(dependent.id, {
          kind: 'dependent',
          viaDefinitionId: id,
          sourcePath: dependent.reference.sourcePath,
          witness: [...reasons.get(id)!.witness, dependent.id],
        });
        pending.push(dependent.id);
      }
    }
  };
  close();
  // Prove every supplied support is connected to the requested removals through
  // the final removed set. A shared supporting definition that remains installed
  // cannot turn an unrelated client-supplied ID into an optional removal.
  const connected = new Set(rootIds.filter((id) => reasons.has(id)));
  const connectedQueue = [...connected];
  for (let index = 0; index < connectedQueue.length; index++) {
    const id = connectedQueue[index]!;
    const neighbours = [
      ...(references.get(id) ?? []).map((reference) => reference.definitionId),
      ...(incoming.get(id) ?? []).map((dependent) => dependent.id),
    ];
    for (const neighbour of neighbours)
      if (reasons.has(neighbour) && !connected.has(neighbour)) {
        connected.add(neighbour);
        connectedQueue.push(neighbour);
      }
  }
  for (const id of optionalIds.filter((id) => !connected.has(id)))
    blockers.push({
      kind: 'unsupported-optional',
      definitionId: id,
      message:
        'An optional removal must be an installed condition explicitly connected to this removal set.',
    });
  const removedIds = new Set(reasons.keys());
  const candidatePolicy = suppliedPolicy ?? {
    ...policy,
    revision: policy.revision + 1,
    definitions: policy.definitions.filter((definition) => !removedIds.has(definition.id)),
  };
  const retained = new Set(candidatePolicy.definitions.map((definition) => definition.id));
  if (suppliedPolicy) {
    for (const id of removedIds)
      if (retained.has(id))
        blockers.push({
          kind: 'candidate-invalid',
          definitionId: id,
          message:
            'The supplied policy keeps a condition that depends on a removed definition; correct and review the exact candidate.',
        });
    for (const definition of policy.definitions)
      if (!retained.has(definition.id) && !removedIds.has(definition.id))
        blockers.push({
          kind: 'candidate-invalid',
          definitionId: definition.id,
          message:
            'The supplied policy removes an additional condition outside the selected removal operation.',
        });
  }
  const requestedRoots = new Set(rootIds);
  const rootSet = new Set([...rootIds, ...optionalIds]);
  // At most two distinct roots per node prove whether an optional root is also
  // mandatory from another choice. This avoids enumerating cyclic paths or doing
  // a whole-graph traversal separately for every selected optional definition.
  if (optionalIds.length) {
    type Origin = {
      id: string;
      root: string;
      characters: number;
      previous?: Origin;
      sourcePath?: string;
    };
    const origins = new Map<string, Origin[]>();
    const originQueue: Origin[] = [];
    const offer = (origin: Origin) => {
      const current = origins.get(origin.id) ?? [];
      if (current.length === 2 || current.some((entry) => entry.root === origin.root)) return;
      current.push(origin);
      origins.set(origin.id, current);
      originQueue.push(origin);
    };
    for (const id of rootSet)
      if (removedIds.has(id)) offer({ id, root: id, characters: JSON.stringify(id).length + 2 });
    for (let index = 0; index < originQueue.length; index++) {
      const origin = originQueue[index]!;
      for (const dependent of incoming.get(origin.id) ?? [])
        offer({
          id: dependent.id,
          root: origin.root,
          characters: origin.characters + JSON.stringify(dependent.id).length + 1,
          previous: origin,
          sourcePath: dependent.reference.sourcePath,
        });
    }
    for (const id of optionalIds) {
      if (requestedRoots.has(id)) continue;
      const origin = origins.get(id)?.find((entry) => entry.root !== id);
      if (!origin?.previous) continue;
      accountExplanation(id, origin.characters);
      const witness: string[] = [];
      for (let step: Origin | undefined = origin; step; step = step.previous) witness.push(step.id);
      reasons.set(id, {
        kind: 'dependent',
        viaDefinitionId: origin.previous.id,
        sourcePath: origin.sourcePath,
        witness: witness.reverse(),
      });
    }
  }
  const requiredDefinitions = policy.definitions
    .filter((definition) => removedIds.has(definition.id))
    .map((definition) => ({
      id: definition.id,
      label: definition.label,
      selectedRoot: rootSet.has(definition.id) && reasons.get(definition.id)!.kind === 'root',
      reason: reasons.get(definition.id)!,
    }));
  const supporting = new Map<string, { referencedBy: Set<string>; sourcePaths: Set<string> }>();
  for (const id of pending)
    for (const reference of references.get(id) ?? []) {
      if (
        requestedRoots.has(reference.definitionId) ||
        (removedIds.has(reference.definitionId) && !optionalSet.has(reference.definitionId))
      )
        continue;
      const support = supporting.get(reference.definitionId) ?? {
        referencedBy: new Set<string>(),
        sourcePaths: new Set<string>(),
      };
      support.referencedBy.add(id);
      support.sourcePaths.add(reference.sourcePath);
      supporting.set(reference.definitionId, support);
    }
  const optionalDefinitions = policy.definitions
    .filter((definition) => supporting.has(definition.id))
    .map((definition) => {
      const support = supporting.get(definition.id)!;
      return {
        id: definition.id,
        label: definition.label,
        selected: optionalSet.has(definition.id),
        required: reasons.get(definition.id)?.kind === 'dependent',
        referencedBy: [...support.referencedBy],
        sourcePaths: [...support.sourcePaths],
      };
    });
  for (const { condition, sourcePath } of bodyPolicyConditions(world.moduleManifest.bodyPolicy))
    work.conditionNodes += visitStatusCondition(condition, sourcePath, (predicate, path) => {
      if ('statusActive' in predicate && !retained.has(predicate.statusActive.definitionId))
        blockers.push({
          kind: 'body-policy',
          definitionId: predicate.statusActive.definitionId,
          sourcePath: `${path}.statusActive`,
          message: 'The installed body rules require this condition definition.',
        });
    });
  const dream = world.cognitionPolicy.dream;
  if (dream && !retained.has(dream.statusEffectId))
    blockers.push({
      kind: 'dream-policy',
      definitionId: dream.statusEffectId,
      sourcePath: 'cognitionPolicy.dream.statusEffectId',
      message: 'The installed dreaming rules require this condition definition.',
    });
  const proposedDefinitions = new Map(
    candidatePolicy.definitions.map((definition) => [definition.id, definition]),
  );
  const changedIds = new Set(
    policy.definitions
      .filter(
        (definition) =>
          topology.signatures.get(definition.id) !==
          canonicalJson(proposedDefinitions.get(definition.id) ?? null),
      )
      .map((definition) => definition.id),
  );
  const instances: StatusEffectRemovalInstance[] = [];
  const contributionFacts: unknown[] = [];
  for (const entity of Object.values(world.entities)) {
    work.entities++;
    if (!completeContributionHistory(entity.statusEffects))
      blockers.push({
        kind: 'history-unavailable',
        entityId: entity.id,
        message: 'Complete retained condition history has not been prepared.',
      });
    for (const [recordId, instance] of Object.entries(entity.statusEffects ?? {})) {
      work.instanceRecords++;
      if (instance.contribution) {
        work.contributionRecords++;
        if (changedIds.has(instance.contribution.definitionId)) {
          blockers.push({
            kind: 'contribution-pin',
            definitionId: instance.contribution.definitionId,
            entityId: entity.id,
            recordId,
            message:
              'A retained independent condition contribution requires its exact installed definition.',
          });
          contributionFacts.push([
            entity.id,
            recordId,
            instance.episode,
            instance.active,
            instance.sourceId,
            instance.actionTargetId,
            instance.contribution,
          ]);
        }
        continue;
      }
      if (!changedIds.has(recordId) || (retained.has(recordId) && !instance.active)) continue;
      const definition = definitions.get(recordId)!;
      const invocation = world.workState?.invocations[instance.episode];
      const activity =
        entity.actor?.action?.id === instance.episode ? entity.actor.action : undefined;
      const workFact = invocation && {
        id: invocation.id,
        rootId: invocation.rootId,
        ...(invocation.parentId ? { parentId: invocation.parentId } : {}),
        actorId: invocation.actorId,
        moduleId: invocation.moduleId,
        definitionPin: invocation.definitionPin,
        allocation: invocation.allocation,
      };
      instances.push({
        entityId: entity.id,
        entityLabel: entity.name,
        definitionId: recordId,
        definitionLabel: definition.label,
        recordId,
        episode: instance.episode,
        active: instance.active,
        sourceId: instance.sourceId,
        actionTargetId: instance.actionTargetId,
        disposition: retained.has(recordId) ? 'end' : 'remove',
        ...(activity
          ? {
              action: {
                id: activity.id,
                type: activity.type,
                label: definition.label,
                ...(invocation ? { workInvocationId: invocation.id } : {}),
              },
            }
          : {}),
        ...(workFact ? { work: workFact } : {}),
      });
    }
  }
  // Retain the native owners' full validity contract, including installed work.
  // Their refusal never turns an incomplete or mixed candidate into an auto-fix.
  try {
    // A supplied candidate was validated before reading its predicate language.
    if (!suppliedPolicy) validateStatusEffectPolicy(world, candidatePolicy);
    validateBodyPolicy(
      world.moduleManifest.bodyPolicy,
      world.moduleManifest.definitions,
      retained,
      world.itemDefinitions,
    );
  } catch (error) {
    if (
      !blockers.some(
        (blocker) => blocker.kind === 'body-policy' || blocker.kind === 'candidate-invalid',
      )
    )
      blockers.push({
        kind: 'candidate-invalid',
        message:
          error instanceof Error
            ? error.message
            : 'The complete candidate cannot be admitted by the native condition owner.',
      });
  }
  if (candidatePolicy.revision !== policy.revision + 1)
    blockers.push({
      kind: 'candidate-invalid',
      message: 'The supplied policy revision does not follow the current installed policy.',
    });
  const exactCandidatePolicy = request.candidatePolicy ?? candidatePolicy;
  const binding = canonicalJson({
    policy,
    candidatePolicy: exactCandidatePolicy,
    bodyPolicy: world.moduleManifest.bodyPolicy,
    bodyPolicyPin: world.moduleManifest.bodyPolicyPin,
    dream,
    rootIds,
    optionalIds,
    requiredDefinitions,
    optionalDefinitions,
    instances,
    contributionFacts,
    blockers,
  });
  return {
    status: blockers.some((blocker) => blocker.kind === 'history-unavailable')
      ? 'incomplete'
      : blockers.length
        ? 'blocked'
        : 'complete',
    rootIds,
    optionalIds,
    requiredDefinitions,
    optionalDefinitions,
    instances,
    blockers,
    candidatePolicy: exactCandidatePolicy,
    binding,
    work,
  };
}
