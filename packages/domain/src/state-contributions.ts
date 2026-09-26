import { admitStatusWork, chargeStatusWork } from './native-work.js';
import { releaseWork } from './work-budget.js';
import { completeContributionHistory } from './contribution-residency.js';
import { recordSemanticChange } from './dependencies.js';
import { objectAncestors } from './objects.js';
import { activelyParticipates } from './participation-state.js';
import { draftWorld } from './draft.js';
import { canonicalJson, contentLabel, finish, outcome } from './events.js';
import { getOwn, hasRecordFields, isSafeRecordId } from './records.js';
import {
  effectBindings,
  matchesStatusCondition,
  statusTransitionEvent,
  type StatusEffectDefinition,
} from './status-effects.js';
import { invalidateContributionIndex, statusDefinitions } from './status-capabilities.js';
import type { Entity, Transition, WorldEvent, WorldState } from './types.js';

/** Carried/attached sources use their root's participation without acquiring XYZ.
 * Source death is distinct from the custodian's death: a carried artifact remains physical. */
function sourceParticipates(world: WorldState, source: Entity): boolean {
  return (
    !source.retirement &&
    source.actor?.alive !== false &&
    activelyParticipates(objectAncestors(world, source.id).at(-1))
  );
}

export type ContributionLifetime =
  | { kind: 'explicit-removal' }
  | { kind: 'source-sustained' }
  | { kind: 'fixed'; expiresAt: number };

export function validContributionLifetime(value: ContributionLifetime, now: number): boolean {
  return (
    !!value &&
    typeof value === 'object' &&
    (value.kind === 'explicit-removal' || value.kind === 'source-sustained'
      ? Object.keys(value).length === 1
      : value.kind === 'fixed' &&
        Object.keys(value).length === 2 &&
        Number.isFinite(value.expiresAt) &&
        value.expiresAt >= now)
  );
}
export function capabilityContributionDefinition(definition: StatusEffectDefinition): boolean {
  // Independent capability predicates share the status owner. Native sleeping/rates
  // retain their existing singleton/action semantics.
  return (
    !definition.occupiesAction &&
    !definition.automaticActivation &&
    Array.isArray(definition.whileActive) &&
    definition.whileActive.length > 0 &&
    definition.whileActive.every(
      (op) => !!op && typeof op === 'object' && 'restrictCapabilities' in op,
    )
  );
}
function admittedLifetime(
  definition: StatusEffectDefinition,
  lifetime: ContributionLifetime,
  now: number,
): boolean {
  const policy = definition.contribution;
  return (
    !!policy &&
    lifetime.kind === policy.lifetime &&
    (policy.lifetime !== 'fixed' ||
      (lifetime.kind === 'fixed' && lifetime.expiresAt <= now + policy.seconds))
  );
}
export interface ContributionRequest {
  id: string;
  sourceId: string;
  targetId: string;
  definitionId: string;
  expectedPolicyRevision: number;
  lifetime: ContributionLifetime;
}

/** Attach is receipted; a new source cannot replace another cause by its label.
 * Ending never applies an inverse delta or restores a historical body snapshot.
 * docs/projects/shared-state-contributions-tech-design.md#6-active-effects-and-cancellation
 */
export function attachCapabilityContribution(
  input: WorldState,
  request: ContributionRequest,
): Transition {
  const reject = (code: string, message: string): Transition => ({
    world: input,
    events: [],
    outcome: outcome(false, code, message),
  });
  if (
    !hasRecordFields(request, [
      'id',
      'sourceId',
      'targetId',
      'definitionId',
      'expectedPolicyRevision',
      'lifetime',
    ]) ||
    ![request.id, request.sourceId, request.targetId, request.definitionId].every(isSafeRecordId) ||
    !validContributionLifetime(request.lifetime, 0)
  )
    return reject('invalid-contribution', 'Invalid contribution binding or lifetime.');
  const digest = canonicalJson(request);
  const previous = getOwn(input.commandReceipts, request.id);
  if (previous)
    return previous.digest === digest
      ? { world: input, events: [], outcome: previous.outcome }
      : reject('conflict', 'Contribution identity already used.');
  if (!validContributionLifetime(request.lifetime, input.simTime))
    return reject('invalid-contribution', 'The contribution lifetime has already expired.');
  const source = getOwn(input.entities, request.sourceId);
  const target = getOwn(input.entities, request.targetId);
  if (!completeContributionHistory(target?.statusEffects))
    return reject(
      'history-unavailable',
      'Materialize contribution history before assigning an identity.',
    );
  const definition = statusDefinitions(input).find((value) => value.id === request.definitionId);
  if (
    !source ||
    source.retirement ||
    !target?.actor ||
    !definition ||
    !definition.enabled ||
    !admittedLifetime(definition, request.lifetime, input.simTime) ||
    (request.lifetime.kind === 'source-sustained' && !sourceParticipates(input, source)) ||
    input.statusEffectPolicy.revision !== request.expectedPolicyRevision ||
    getOwn(target.statusEffects ?? {}, request.id) ||
    !capabilityContributionDefinition(definition) ||
    !matchesStatusCondition(
      input,
      { subject: target, source, actionTarget: target },
      definition.requires,
    ) ||
    (definition.activationCondition &&
      !matchesStatusCondition(
        input,
        { subject: target, source, actionTarget: target },
        definition.activationCondition,
      ))
  )
    return reject('unavailable', 'The supported contribution is unavailable or changed.');
  const world = draftWorld(input);
  const entity = world.entities[target.id]!;
  admitStatusWork(world, entity, definition, request.id);
  recordSemanticChange(world, { kind: 'state', entityId: entity.id, field: 'contribution' });
  (entity.statusEffects ??= {})[request.id] = {
    active: true,
    episode: request.id,
    elapsedSeconds: 0,
    automaticAfter: 0,
    sourceId: source.id,
    actionTargetId: target.id,
    contribution: {
      definitionId: definition.id,
      definitionDigest: contentLabel(canonicalJson(definition)),
      revision: 1,
      lifetime: structuredClone(request.lifetime),
    },
  };
  invalidateContributionIndex(entity, world);
  const result = outcome(true, 'contribution-attached', 'Capability contribution applied.');
  world.commandReceipts[request.id] = { digest, outcome: result };
  return finish(world, [], result);
}

export function endCapabilityContribution(
  input: WorldState,
  request: {
    id: string;
    contributionId: string;
    sourceId: string;
    targetId: string;
    expectedRevision: number;
  },
): Transition {
  const reject = (): Transition => ({
    world: input,
    events: [],
    outcome: outcome(false, 'stale-contribution', 'The contribution is unavailable or changed.'),
  });
  if (
    !hasRecordFields(request, [
      'id',
      'contributionId',
      'sourceId',
      'targetId',
      'expectedRevision',
    ]) ||
    ![request.id, request.contributionId, request.sourceId, request.targetId].every(isSafeRecordId)
  )
    return reject();
  const digest = canonicalJson(request);
  const previous = getOwn(input.commandReceipts, request.id);
  if (previous)
    return previous.digest === digest
      ? { world: input, events: [], outcome: previous.outcome }
      : reject();
  const state = getOwn(
    getOwn(input.entities, request.targetId)?.statusEffects ?? {},
    request.contributionId,
  );
  if (
    !state?.contribution ||
    state.sourceId !== request.sourceId ||
    state.contribution.revision !== request.expectedRevision ||
    !Number.isSafeInteger(request.expectedRevision + 1)
  )
    return reject();
  const world = draftWorld(input);
  const current = world.entities[request.targetId]!.statusEffects![request.contributionId]!;
  if (current.active) {
    releaseWork(world, current.episode);
    recordSemanticChange(world, {
      kind: 'state',
      entityId: request.targetId,
      field: 'contribution',
    });
    current.active = false;
    current.contribution!.revision++;
  }
  const result = outcome(true, 'contribution-ended', 'Capability contribution ended.');
  world.commandReceipts[request.id] = { digest, outcome: result };
  return finish(world, [], result);
}

/** Refresh retains the admitted cause and policy, and cannot resurrect an ended
 * instance. A new episode needs a new admission and identity. */
export function refreshCapabilityContribution(
  input: WorldState,
  request: {
    id: string;
    contributionId: string;
    sourceId: string;
    targetId: string;
    expectedRevision: number;
    lifetime: ContributionLifetime;
  },
): Transition {
  const reject = (): Transition => ({
    world: input,
    events: [],
    outcome: outcome(false, 'stale-contribution', 'The contribution is unavailable or changed.'),
  });
  if (
    !hasRecordFields(request, [
      'id',
      'contributionId',
      'sourceId',
      'targetId',
      'expectedRevision',
      'lifetime',
    ]) ||
    ![request.id, request.contributionId, request.sourceId, request.targetId].every(
      isSafeRecordId,
    ) ||
    !validContributionLifetime(request.lifetime, 0)
  )
    return reject();
  const digest = canonicalJson(request);
  const previous = getOwn(input.commandReceipts, request.id);
  if (previous)
    return previous.digest === digest
      ? { world: input, events: [], outcome: previous.outcome }
      : reject();
  if (!validContributionLifetime(request.lifetime, input.simTime)) return reject();
  const state = getOwn(
    getOwn(input.entities, request.targetId)?.statusEffects ?? {},
    request.contributionId,
  );
  if (
    !state?.active ||
    !state.contribution ||
    state.sourceId !== request.sourceId ||
    state.contribution.revision !== request.expectedRevision ||
    !Number.isSafeInteger(request.expectedRevision + 1) ||
    state.contribution.lifetime.kind !== request.lifetime.kind ||
    (state.contribution.lifetime.kind === 'fixed' &&
      input.simTime >= state.contribution.lifetime.expiresAt)
  )
    return reject();
  const definition = statusDefinitions(input).find(
    (d) => d.id === state.contribution!.definitionId,
  );
  const target = input.entities[request.targetId]!;
  if (
    !definition?.enabled ||
    !admittedLifetime(definition, request.lifetime, input.simTime) ||
    (request.lifetime.kind === 'source-sustained' &&
      (!input.entities[request.sourceId] ||
        !sourceParticipates(input, input.entities[request.sourceId]!))) ||
    !matchesStatusCondition(input, effectBindings(input, target, state), definition.requires)
  )
    return reject();
  const world = draftWorld(input);
  const contribution =
    world.entities[request.targetId]!.statusEffects![request.contributionId]!.contribution!;
  if (canonicalJson(contribution.lifetime) !== canonicalJson(request.lifetime)) {
    contribution.lifetime = structuredClone(request.lifetime);
    contribution.revision++;
  }
  const result = outcome(true, 'contribution-refreshed', 'Capability contribution refreshed.');
  world.commandReceipts[request.id] = { digest, outcome: result };
  return finish(world, [], result);
}

export function advanceCapabilityContributions(
  world: WorldState,
  entity: Entity,
  events: WorldEvent[],
): void {
  if (!entity.statusEffects) return;
  for (const id in entity.statusEffects) {
    const state = entity.statusEffects[id]!;
    const contribution = state.contribution;
    if (!state.active || !contribution) continue;
    const definition = statusDefinitions(world).find(
      (value) => value.id === contribution.definitionId,
    );
    if (definition) chargeStatusWork(world, entity, definition, state);
    const source = world.entities[state.sourceId];
    if (
      !definition ||
      !definition.enabled ||
      (contribution.lifetime.kind === 'fixed' &&
        world.simTime >= contribution.lifetime.expiresAt) ||
      (contribution.lifetime.kind === 'source-sustained' &&
        (!source || !sourceParticipates(world, source))) ||
      !matchesStatusCondition(world, effectBindings(world, entity, state), definition.requires) ||
      (definition.automaticDeactivation &&
        matchesStatusCondition(
          world,
          effectBindings(world, entity, state),
          definition.automaticDeactivation,
        ))
    ) {
      releaseWork(world, state.episode);
      recordSemanticChange(world, { kind: 'state', entityId: entity.id, field: 'contribution' });
      state.active = false;
      contribution.revision++;
      if (definition)
        statusTransitionEvent(
          world,
          definition,
          effectBindings(world, entity, state),
          events,
          false,
          'contribution-ended',
        );
    }
  }
}
