import {
  prepareAppraisalIndex,
  indexAppraisal,
  activeAppraisalIds,
  nextDueAppraisal,
} from './appraisal-index.js';
import { canonicalJson, contentLabel, emit, finish, outcome } from './events.js';
import { draftWorld } from './draft.js';
import { hasMemory } from './living.js';
import { getOwn, hasRecordFields, isSafeRecordId } from './records.js';
import {
  readState,
  isStateAddress,
  isDefinitionPin,
  sameDefinitionPin,
  type StateAddress,
} from './state-owners.js';
import { recordSemanticChange } from './dependencies.js';
import {
  admitWork,
  advanceWorkInterval,
  chargeInvocation,
  chargeWork,
  releaseWork,
  WorkBudgetError,
} from './work-budget.js';
import type { DefinitionPin } from './world-modules.js';
import type { WorldState, WorldEvent, Outcome, Transition } from './types.js';
import { completeAppraisalHistory } from './appraisal-residency.js';

export type AppraisalCauseKind =
  | 'perceived-event'
  | 'remembered'
  | 'condition'
  | 'disposition'
  | 'authored';
export interface AppraisalDefinition {
  id: string;
  version: number;
  implementation: 'appraisal-v1';
  label: string;
  causes: AppraisalCauseKind[];
  stacking: 'cause' | 'target';
  value: { kind: 'qualitative' } | { kind: 'scaled'; min: number; max: number };
  lifetime:
    | { kind: 'persistent' }
    | { kind: 'expires'; seconds: number }
    | { kind: 'decays'; perHour: number; bands: number[] }
    | { kind: 'condition-sustained' };
  reflection: boolean;
}
export interface AppraisalPolicy {
  definitions: AppraisalDefinition[];
}
/** Source bodies are bound by a trusted owner after a scoped repository read, never
 * inferred from a raw event ID supplied by a client/model. Versions fence publication;
 * the existing erasure owner invalidates retained dependencies on correction/forgetting. */
export interface AppraisalEvidence {
  kind: 'perceived-event' | 'remembered';
  actorId: string;
  sourceId: string;
  sourceVersion: string;
  occurrenceId: string;
  coverage: string;
  subjectIds: string[];
  recallEpisodeId?: string;
}
export interface AuthoredAppraisalCause {
  kind: 'authored';
  actorId: string;
  authorizationReceipt: string;
  sourceVersion: string;
  sourceRefs: AppraisalEvidence[];
}
export type AppraisalCause =
  | AuthoredAppraisalCause
  | AppraisalEvidence
  | {
      kind: 'condition';
      actorId: string;
      processId: string;
      episodeId: string;
      address: StateAddress;
      sourceVersion: string;
    }
  | {
      kind: 'disposition';
      actorId: string;
      processId: string;
      opportunityId: string;
      sourceVersion: string;
    };
export type AppraisalValue = { kind: 'qualitative' } | { kind: 'scaled'; value: number };
export type AppraisalLifetime =
  | { kind: 'persistent' }
  | { kind: 'expires'; at: number }
  | { kind: 'decays'; anchorTime: number; anchorValue: number }
  | { kind: 'condition-sustained'; processId: string; episodeId: string };
export interface Appraisal {
  id: string;
  actorId: string;
  revision: number;
  definitionPin: DefinitionPin;
  targetId: string | null;
  stackKey: string;
  state: 'active' | 'resolved' | 'invalidated';
  cause: AppraisalCause | null;
  /** Reframing adds current provenance without replacing the original occurrence. */
  interpretationSource?: AppraisalEvidence;
  value: AppraisalValue;
  lifetime: AppraisalLifetime;
  createdAt: number;
  changedAt: number;
  nextAt?: number;
  lastOperation: { id: string; body: string };
  creationOperation: { id: string; body: string };
  /** A later genuine opportunity links history; it does not resurrect a resolved ID. */
  predecessorId?: string;
}
export interface AppraisalProcess {
  id: string;
  actorId: string;
  definitionPin: DefinitionPin;
  kind: 'condition' | 'disposition';
  intervalSeconds: number;
  nextAt: number;
  opportunity: number;
  activeId: string | null;
  condition?: { address: StateAddress; below: number };
}
export type AppraisalChange =
  | {
      kind: 'create';
      definitionPin: DefinitionPin;
      targetId: string | null;
      source: AppraisalEvidence;
      value: AppraisalValue;
    }
  | {
      kind: 'reframe';
      id: string;
      expectedRevision: number;
      source: AppraisalEvidence;
      value: AppraisalValue;
    }
  | { kind: 'resolve'; id: string; expectedRevision: number };
export interface AppraisalBindings {
  sources: readonly AppraisalEvidence[];
  subjects: readonly string[];
  reflection?: boolean;
  /** Exact scoped repository outcomes, checked in the current publication lane. */
  completeCreates?: readonly string[];
  priorOutcomes?: Readonly<Record<string, Appraisal>>;
}
export function appraisalCreationIdentity(
  actorId: string,
  pin: DefinitionPin,
  targetId: string | null,
  episode: string,
  stacking: AppraisalDefinition['stacking'],
) {
  const stackKey = canonicalJson([actorId, pin, targetId, stacking === 'target' ? null : episode]);
  return { stackKey, id: `appraisal-${contentLabel(stackKey)}-${contentLabel(episode)}` };
}

const appraisalPins = new WeakMap<AppraisalDefinition, DefinitionPin>();
export function appraisalPin(definition: AppraisalDefinition): DefinitionPin {
  const cached = Object.isFrozen(definition) ? appraisalPins.get(definition) : undefined;
  if (cached) return cached;
  const pin = {
    id: definition.id,
    version: definition.version,
    digest: contentLabel(canonicalJson(definition)),
  };
  if (Object.isFrozen(definition)) appraisalPins.set(definition, pin);
  return pin;
}
export function appraisalDefinition(
  world: WorldState,
  pin: DefinitionPin,
): AppraisalDefinition | undefined {
  if (!isDefinitionPin(pin)) return;
  const definition = world.moduleManifest.appraisals?.definitions.find(
    (entry) => entry.id === pin.id,
  );
  return definition && sameDefinitionPin(appraisalPin(definition), pin) ? definition : undefined;
}
export function validateAppraisalPolicy(policy: AppraisalPolicy | undefined): void {
  if (!policy) return;
  if (!hasRecordFields(policy, ['definitions']) || !Array.isArray(policy.definitions))
    throw new Error('Invalid appraisal policy.');
  const ids = new Set<string>();
  for (const definition of policy.definitions) {
    if (
      !hasRecordFields(definition, [
        'id',
        'version',
        'implementation',
        'label',
        'causes',
        'stacking',
        'value',
        'lifetime',
        'reflection',
      ]) ||
      !isSafeRecordId(definition.id) ||
      ids.has(definition.id) ||
      !Number.isSafeInteger(definition.version) ||
      definition.version < 1 ||
      definition.implementation !== 'appraisal-v1' ||
      typeof definition.label !== 'string' ||
      !definition.label.trim() ||
      definition.label.length > 80 ||
      !['cause', 'target'].includes(definition.stacking) ||
      typeof definition.reflection !== 'boolean' ||
      !Array.isArray(definition.causes) ||
      !definition.causes.length ||
      new Set(definition.causes).size !== definition.causes.length ||
      definition.causes.some(
        (kind) =>
          !['perceived-event', 'remembered', 'condition', 'disposition', 'authored'].includes(kind),
      )
    )
      throw new Error('Unsupported appraisal definition.');
    ids.add(definition.id);
    const value = definition.value,
      life = definition.lifetime;
    if (
      !(hasRecordFields(value, ['kind']) && value.kind === 'qualitative') &&
      !(
        hasRecordFields(value, ['kind', 'min', 'max']) &&
        value.kind === 'scaled' &&
        Number.isFinite(value.min) &&
        Number.isFinite(value.max) &&
        value.max > value.min
      )
    )
      throw new Error('Invalid appraisal scale.');
    if (life?.kind === 'persistent' || life?.kind === 'condition-sustained') {
      if (
        !hasRecordFields(life, ['kind']) ||
        (life.kind === 'condition-sustained' &&
          definition.causes.some((kind) => kind !== 'condition'))
      )
        throw new Error('Invalid appraisal lifetime.');
    } else if (life?.kind === 'expires') {
      if (
        !hasRecordFields(life, ['kind', 'seconds']) ||
        !Number.isFinite(life.seconds) ||
        life.seconds <= 0
      )
        throw new Error('Invalid appraisal expiry.');
    } else if (life?.kind === 'decays') {
      if (
        !hasRecordFields(life, ['kind', 'perHour', 'bands']) ||
        value.kind !== 'scaled' ||
        !Number.isFinite(life.perHour) ||
        life.perHour <= 0 ||
        !Array.isArray(life.bands) ||
        life.bands.length > 16 ||
        !life.bands.length ||
        life.bands.at(-1) !== value.min ||
        life.bands.some(
          (band, index) =>
            !Number.isFinite(band) ||
            band < value.min ||
            band >= value.max ||
            (index > 0 && band >= life.bands[index - 1]!),
        )
      )
        throw new Error('Invalid explicit appraisal decay.');
    } else throw new Error('Unsupported appraisal lifetime.');
    if (
      definition.reflection &&
      (definition.stacking !== 'cause' ||
        definition.causes.some((kind) => kind !== 'remembered' && kind !== 'perceived-event'))
    )
      throw new Error('Reflection cannot install internal native processes.');
  }
}
function valuesFor(world: WorldState, actorId: string): Record<string, Appraisal> {
  return world.appraisals?.[actorId] ?? {};
}
export function appraisalById(
  world: WorldState,
  actorId: string,
  id: string,
): Appraisal | undefined {
  return getOwn(valuesFor(world, actorId), id);
}
function changed(world: WorldState, actorId: string): void {
  recordSemanticChange(world, { kind: 'state', entityId: actorId, field: 'appraisal' });
}
function validValue(definition: AppraisalDefinition, value: AppraisalValue): boolean {
  return definition.value.kind === 'qualitative'
    ? hasRecordFields(value, ['kind']) && value.kind === 'qualitative'
    : hasRecordFields(value, ['kind', 'value']) &&
        value.kind === 'scaled' &&
        Number.isFinite(value.value) &&
        value.value >= definition.value.min &&
        value.value <= definition.value.max;
}
function sourceAllowed(
  world: WorldState,
  actorId: string,
  source: AppraisalEvidence,
  bindings: AppraisalBindings,
): boolean {
  return (
    validEvidence(source) &&
    source.actorId === actorId &&
    !(world.experience?.forgotten[actorId] ?? []).includes(source.sourceId) &&
    !(world.experience?.forgotten[actorId] ?? []).includes(source.occurrenceId) &&
    !world.experience?.corrections?.[actorId]?.[source.sourceId] &&
    !world.experience?.corrections?.[actorId]?.[source.occurrenceId] &&
    bindings.sources.some((allowed) => canonicalJson(allowed) === canonicalJson(source))
  );
}
function validEvidence(source: AppraisalEvidence): boolean {
  return (
    hasRecordFields(
      source,
      ['kind', 'actorId', 'sourceId', 'sourceVersion', 'occurrenceId', 'coverage', 'subjectIds'],
      ['recallEpisodeId'],
    ) &&
    isSafeRecordId(source.occurrenceId) &&
    typeof source.sourceVersion === 'string' &&
    source.sourceVersion.length <= 128 &&
    typeof source.coverage === 'string' &&
    source.coverage.length <= 200 &&
    Array.isArray(source.subjectIds) &&
    source.subjectIds.length <= 48 &&
    source.subjectIds.every(isSafeRecordId) &&
    (source.recallEpisodeId === undefined || isSafeRecordId(source.recallEpisodeId)) &&
    isSafeRecordId(source.actorId) &&
    !!source.sourceVersion &&
    isSafeRecordId(source.sourceId) &&
    ['remembered', 'perceived-event'].includes(source.kind)
  );
}
function currentValue(
  world: WorldState,
  record: Appraisal,
  definition: AppraisalDefinition,
): AppraisalValue {
  if (
    record.lifetime.kind !== 'decays' ||
    definition.lifetime.kind !== 'decays' ||
    definition.value.kind !== 'scaled'
  )
    return record.value;
  return {
    kind: 'scaled',
    value: Math.max(
      definition.value.min,
      record.lifetime.anchorValue -
        (Math.max(0, world.simTime - record.lifetime.anchorTime) / 3600) *
          definition.lifetime.perHour,
    ),
  };
}
function nextDeadline(
  record: Appraisal,
  definition: AppraisalDefinition,
  now: number,
): number | undefined {
  const life = record.lifetime;
  if (life.kind === 'expires') return life.at;
  if (life.kind !== 'decays' || definition.lifetime.kind !== 'decays') return;
  for (const band of definition.lifetime.bands) {
    const at = life.anchorTime + ((life.anchorValue - band) / definition.lifetime.perHour) * 3600;
    if (at > now) return at;
  }
}
function lifetime(
  definition: AppraisalDefinition,
  cause: AppraisalCause,
  value: AppraisalValue,
  now: number,
): AppraisalLifetime {
  switch (definition.lifetime.kind) {
    case 'persistent':
      return { kind: 'persistent' };
    case 'expires':
      return { kind: 'expires', at: now + definition.lifetime.seconds };
    case 'decays': {
      if (value.kind !== 'scaled') throw new Error('A decay requires an admitted scale.');
      return { kind: 'decays', anchorTime: now, anchorValue: value.value };
    }
    case 'condition-sustained': {
      if (cause.kind !== 'condition')
        throw new Error('A sustained appraisal needs an actual native condition.');
      return {
        kind: 'condition-sustained',
        processId: cause.processId,
        episodeId: cause.episodeId,
      };
    }
  }
}
function privateChange(
  world: WorldState,
  events: WorldEvent[],
  record: Appraisal,
  definition: AppraisalDefinition,
): void {
  emit(
    world,
    events,
    'appraisal-changed',
    record.state === 'active' ? `I feel ${definition.label}.` : `My ${definition.label} has ended.`,
    world.entities[record.actorId],
    undefined,
    {
      appraisalId: record.id,
      revision: record.revision,
      semanticTrigger: true,
      importance: 5,
      urgency: 0,
    },
    'private',
  );
}
function reserveRecord(world: WorldState, record: Appraisal): void {
  admitWork(world, {
    id: record.id,
    actorId: record.actorId,
    moduleId: record.definitionPin.id,
    definitionPin: record.definitionPin,
    limit: { effects: 32, tests: 64, depth: 1 },
    // Bound complete cause/payload size before admission; persistent records reserve
    // resident capacity but consume no periodic execution or provider allowance.
    allocation: { live: 1, retainedBytes: 8192, subscriptions: 1 },
  });
}
function install(
  world: WorldState,
  actorId: string,
  definition: AppraisalDefinition,
  cause: AppraisalCause,
  targetId: string | null,
  value: AppraisalValue,
  operationId: string,
  events: WorldEvent[],
  notify: boolean,
  predecessorId?: string,
  bindings?: AppraisalBindings,
): Outcome {
  if (
    !hasMemory(world.entities[actorId]) ||
    !world.entities[actorId]?.actor?.alive ||
    !validValue(definition, value) ||
    (definition.lifetime.kind === 'decays' &&
      value.kind === 'scaled' &&
      definition.value.kind === 'scaled' &&
      value.value <= definition.value.min) ||
    !definition.causes.includes(cause.kind)
  )
    return outcome(false, 'appraisal-rejected', 'The appraisal is not applicable.');
  const episode =
    cause.kind === 'condition'
      ? cause.episodeId
      : cause.kind === 'disposition'
        ? cause.opportunityId
        : cause.kind === 'authored'
          ? cause.authorizationReceipt
          : cause.occurrenceId;
  const { stackKey, id } = appraisalCreationIdentity(
    actorId,
    appraisalPin(definition),
    targetId,
    episode,
    definition.stacking,
  );
  const body = canonicalJson({ definition: appraisalPin(definition), cause, targetId, value });
  const prior = appraisalById(world, actorId, id) ?? bindings?.priorOutcomes?.[id];
  // Native damage and enrolled opportunities have newly committed occurrence IDs.
  // Recalled creation proposals need a complete scoped lookup when history is cold.
  if (
    bindings &&
    !prior &&
    !completeAppraisalHistory(world.appraisals?.[actorId]) &&
    !bindings.completeCreates?.includes(id)
  )
    return outcome(
      false,
      'appraisal-unavailable',
      'The prior cause outcome must be checked before creating an appraisal.',
    );
  if (prior)
    return prior.state !== 'invalidated' &&
      prior.stackKey === stackKey &&
      !!prior.cause &&
      (prior.cause.kind === 'condition'
        ? prior.cause.episodeId
        : prior.cause.kind === 'disposition'
          ? prior.cause.opportunityId
          : prior.cause.kind === 'authored'
            ? prior.cause.authorizationReceipt
            : prior.cause.occurrenceId) === episode &&
      (prior.state === 'active' || prior.creationOperation.id === operationId) &&
      (prior.creationOperation.id !== operationId || prior.creationOperation.body === body)
      ? outcome(true, 'duplicate', 'This cause already has an appraisal outcome.')
      : outcome(false, 'appraisal-conflict', 'The appraisal identity or cause was already used.');
  const record: Appraisal = {
    id,
    actorId,
    revision: 1,
    definitionPin: appraisalPin(definition),
    targetId,
    stackKey,
    state: 'active',
    cause,
    value,
    lifetime: lifetime(definition, cause, value, world.simTime),
    createdAt: world.simTime,
    changedAt: world.simTime,
    lastOperation: { id: operationId, body },
    creationOperation: { id: operationId, body },
    ...(predecessorId ? { predecessorId } : {}),
  };
  record.nextAt = nextDeadline(record, definition, world.simTime);
  if (JSON.stringify(record).length * 3 > 8192)
    return outcome(
      false,
      'appraisal-unavailable',
      'The permitted appraisal source exceeds its retained capacity.',
    );
  try {
    reserveRecord(world, record);
  } catch (error) {
    if (!(error instanceof WorkBudgetError)) throw error;
    return outcome(false, 'appraisal-unavailable', error.message);
  }
  prepareAppraisalIndex(world);
  const records = ((world.appraisals ??= {})[actorId] ??= {});
  // Target aggregation replaces only this family's prior active interpretation. Its
  // source outcome remains a tombstone, preventing an older cause from reappearing.
  if (definition.stacking === 'target')
    for (const prior of Object.values(records))
      if (prior.state === 'active' && prior.stackKey === stackKey)
        endAppraisal(world, prior, 'resolved');
  records[id] = record;
  indexAppraisal(world, record);
  changed(world, actorId);
  if (notify) privateChange(world, events, record, definition);
  return outcome(true, 'appraisal-created', 'Appraisal recorded.');
}
function endAppraisal(
  world: WorldState,
  record: Appraisal,
  state: 'resolved' | 'invalidated',
): void {
  if (record.state === state) return;
  prepareAppraisalIndex(world);
  record.state = state;
  record.revision++;
  record.changedAt = world.simTime;
  delete record.nextAt;
  releaseWork(world, record.id);
  indexAppraisal(world, record);
  changed(world, record.actorId);
}
/** One native mutation owner; the caller's transaction makes coupled reflection edits atomic. */
export function changeAppraisal(
  world: WorldState,
  actorId: string,
  change: AppraisalChange,
  operationId: string,
  bindings: AppraisalBindings,
  events: WorldEvent[],
): Outcome {
  if (!hasMemory(world.entities[actorId]) || !isSafeRecordId(operationId))
    return outcome(false, 'appraisal-rejected', 'Invalid appraisal owner or operation.');
  if (change.kind === 'create') {
    const definition = appraisalDefinition(world, change.definitionPin);
    if (
      !definition ||
      (bindings.reflection && !definition.reflection) ||
      !sourceAllowed(world, actorId, change.source, bindings) ||
      (change.targetId !== null &&
        (!bindings.subjects.includes(change.targetId) ||
          !change.source.subjectIds.includes(change.targetId)))
    )
      return outcome(
        false,
        'appraisal-rejected',
        'The definition, source or subject is unavailable.',
      );
    return install(
      world,
      actorId,
      definition,
      change.source,
      change.targetId,
      change.value,
      operationId,
      events,
      true,
      undefined,
      bindings,
    );
  }
  const record = appraisalById(world, actorId, change.id);
  const definition = record && appraisalDefinition(world, record.definitionPin);
  const body = canonicalJson(change);
  if (record?.lastOperation.id === operationId)
    return record.lastOperation.body === body
      ? outcome(true, 'duplicate', 'Appraisal operation already recorded.')
      : outcome(false, 'appraisal-conflict', 'An operation ID cannot have a different body.');
  if (
    !record ||
    !definition ||
    record.revision !== change.expectedRevision ||
    record.state !== 'active' ||
    (bindings.reflection && !definition.reflection)
  )
    return outcome(false, 'stale-appraisal', 'The appraisal changed or is unavailable.');
  if (change.kind === 'reframe') {
    if (
      !sourceAllowed(world, actorId, change.source, bindings) ||
      !definition.causes.includes(change.source.kind) ||
      !validValue(definition, change.value) ||
      // A fixed native decay curve cannot be restarted by an interpretation edit.
      (record.lifetime.kind === 'decays' &&
        canonicalJson(change.value) !== canonicalJson(record.value)) ||
      (record.targetId !== null && !change.source.subjectIds.includes(record.targetId))
    )
      return outcome(
        false,
        'appraisal-rejected',
        'The new interpretation has no permitted current source.',
      );
    if (
      JSON.stringify({
        ...record,
        interpretationSource: change.source,
        value: change.value,
        lastOperation: { id: operationId, body },
      }).length *
        3 >
      8192
    )
      return outcome(
        false,
        'appraisal-unavailable',
        'The interpretation exceeds its admitted retained capacity.',
      );
    record.interpretationSource = change.source;
    record.value = change.value;
    record.revision++;
    record.changedAt = world.simTime;
    // Reframing is not a free lifetime reset. A recurrence needs a new native opportunity.
  } else if (change.kind === 'resolve') endAppraisal(world, record, 'resolved');
  else return outcome(false, 'appraisal-rejected', 'Unsupported appraisal operation.');
  record.lastOperation = { id: operationId, body };
  changed(world, actorId);
  privateChange(world, events, record, definition);
  return outcome(true, 'appraisal-changed', 'Appraisal updated.');
}

/** Creator authorization is bound by the current server mutation lane. This is an
 * explicitly authored fictional cause, never a fabricated perceived occurrence. */
export function authorAppraisal(
  world: WorldState,
  actorId: string,
  pin: DefinitionPin,
  targetId: string | null,
  value: AppraisalValue,
  cause: AuthoredAppraisalCause,
  bindings: AppraisalBindings & { authorizationReceipt: string },
  events: WorldEvent[],
): Outcome {
  const definition = appraisalDefinition(world, pin);
  if (
    !definition ||
    !definition.causes.includes('authored') ||
    cause.authorizationReceipt !== bindings.authorizationReceipt ||
    !validAuthoredCause(world, actorId, cause, bindings) ||
    (targetId !== null && !bindings.subjects.includes(targetId))
  )
    return outcome(false, 'appraisal-rejected', 'The authored cause or subject is unavailable.');
  return install(
    world,
    actorId,
    definition,
    cause,
    targetId,
    value,
    cause.authorizationReceipt,
    events,
    true,
    undefined,
    bindings,
  );
}
function validAuthoredCause(
  world: WorldState,
  actorId: string,
  cause: AuthoredAppraisalCause,
  bindings: AppraisalBindings,
): boolean {
  return (
    hasRecordFields(cause, [
      'kind',
      'actorId',
      'authorizationReceipt',
      'sourceVersion',
      'sourceRefs',
    ]) &&
    cause.kind === 'authored' &&
    cause.actorId === actorId &&
    isSafeRecordId(cause.authorizationReceipt) &&
    typeof cause.sourceVersion === 'string' &&
    !!cause.sourceVersion &&
    cause.sourceVersion.length <= 128 &&
    Array.isArray(cause.sourceRefs) &&
    cause.sourceRefs.length <= 8 &&
    cause.sourceRefs.every((source) => sourceAllowed(world, actorId, source, bindings))
  );
}

/** A reviewed world family binds a real perceived occurrence. Core owns identity,
 * private source eligibility and lifetime; the bundled world chooses its vocabulary. */
export function appraisePerceivedEvent(
  world: WorldState,
  event: WorldEvent,
  actorId: string,
  targetId: string,
  pin: DefinitionPin,
  value: AppraisalValue,
): void {
  if (!event.audience.includes(actorId) || !hasMemory(world.entities[actorId])) return;
  const definition = appraisalDefinition(world, pin);
  if (!definition) return;
  const cause: AppraisalEvidence = {
    kind: 'perceived-event',
    actorId,
    sourceId: event.id,
    occurrenceId: event.id,
    sourceVersion: contentLabel(canonicalJson(event)),
    coverage: 'personally experienced',
    subjectIds: [targetId],
  };
  // Optional interpretation cannot reject native injury. On capacity exhaustion,
  // its existing EPR evidence remains available for later admitted interpretation.
  install(world, actorId, definition, cause, targetId, value, event.id, [], false);
}

export interface AppraisalView {
  id: string;
  revision: number;
  feeling: string;
  targetId: string | null;
  value: AppraisalValue;
  lifetime: AppraisalLifetime['kind'];
  coverage: string;
  definitionPin: DefinitionPin;
}
export function appraisalPage(
  world: WorldState,
  actorId: string,
  after = '',
  limit = 24,
): { values: AppraisalView[]; next: string | null } {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
    throw new Error('Invalid appraisal page size.');
  const values: AppraisalView[] = [];
  let cursor = after,
    scanned = 0,
    more = false;
  for (const id of activeAppraisalIds(world, actorId, after)) {
    if (values.length >= limit || scanned >= 200) {
      more = true;
      break;
    }
    scanned++;
    cursor = id;
    const record = appraisalById(world, actorId, id)!;
    const definition = appraisalDefinition(world, record.definitionPin);
    if (!definition) throw new Error('An appraisal definition is unavailable.');
    const value = currentValue(world, record, definition);
    if (
      (record.lifetime.kind === 'expires' && record.lifetime.at <= world.simTime) ||
      (value.kind === 'scaled' &&
        definition.value.kind === 'scaled' &&
        value.value <= definition.value.min)
    )
      continue;
    values.push({
      id: record.id,
      revision: record.revision,
      feeling: definition.label,
      targetId: record.targetId,
      value,
      lifetime: record.lifetime.kind,
      definitionPin: record.definitionPin,
      coverage:
        record.interpretationSource?.coverage ??
        (record.cause && 'coverage' in record.cause
          ? record.cause.coverage
          : (record.cause?.kind ?? 'unavailable')),
    });
  }
  chargeWork({ candidates: scanned, outputBytes: JSON.stringify(values).length * 3 });
  return { values, next: more ? cursor : null };
}
/** Hot cognition is explicitly bounded; paging does not evict durable feelings. */
export function activeAppraisals(world: WorldState, actorId: string): AppraisalView[] {
  return appraisalPage(world, actorId).values;
}

/** Explicit opt-in native enrollment. No trait text, kinship or memory-page read calls this. */
export function configureAppraisalProcess(
  input: WorldState,
  request: Omit<AppraisalProcess, 'nextAt' | 'opportunity' | 'activeId'>,
): Transition {
  const reject = (message: string): Transition => ({
    world: input,
    events: [],
    outcome: outcome(false, 'appraisal-process-rejected', message),
  });
  const definition = appraisalDefinition(input, request.definitionPin);
  if (
    !hasRecordFields(
      request,
      ['id', 'actorId', 'definitionPin', 'kind', 'intervalSeconds'],
      ['condition'],
    ) ||
    !['condition', 'disposition'].includes(request.kind) ||
    JSON.stringify(request).length * 3 > 1800 ||
    !definition ||
    !hasMemory(input.entities[request.actorId]) ||
    !isSafeRecordId(request.id) ||
    !definition.causes.includes(request.kind) ||
    !Number.isFinite(request.intervalSeconds) ||
    request.intervalSeconds < 1 ||
    request.intervalSeconds > 86400 ||
    (request.kind === 'condition' &&
      (!request.condition ||
        request.condition.address.entityId !== request.actorId ||
        !Number.isFinite(request.condition.below) ||
        readState(input, request.condition.address, 'owner').status !== 'known')) ||
    (request.kind === 'disposition' && request.condition)
  )
    return reject('Unsupported internal appraisal enrollment.');
  const previous = getOwn(input.appraisalProcesses ?? {}, request.id);
  if (previous) {
    const { nextAt: _next, opportunity: _opportunity, activeId: _active, ...prior } = previous;
    return canonicalJson(prior) === canonicalJson(request)
      ? {
          world: input,
          events: [],
          outcome: outcome(true, 'duplicate', 'Internal source is already enrolled.'),
        }
      : reject('An internal source identity cannot be rebound.');
  }
  const world = draftWorld(input);
  try {
    admitWork(world, {
      id: request.id,
      actorId: request.actorId,
      moduleId: request.definitionPin.id,
      definitionPin: request.definitionPin,
      limit: { tests: 16, effects: 8, depth: 1 },
      allocation: { live: 1, retainedBytes: 2048, subscriptions: 1 },
      recurrence: { intervalSeconds: request.intervalSeconds, burst: 1 },
    });
  } catch (error) {
    if (!(error instanceof WorkBudgetError)) throw error;
    return reject(error.message);
  }
  (world.appraisalProcesses ??= {})[request.id] = {
    ...request,
    nextAt: world.simTime + request.intervalSeconds,
    opportunity: 0,
    activeId: null,
  };
  changed(world, request.actorId);
  return finish(
    world,
    [],
    outcome(true, 'appraisal-process-enrolled', 'Internal source enrolled.'),
  );
}

/** Only scheduled lifetimes and explicitly enrolled processes participate. Persistent
 * inert records have no per-tick rewrite, wake, RNG draw or paid work. */
export function advanceAppraisals(world: WorldState, events: WorldEvent[]): void {
  for (let entry = nextDueAppraisal(world); entry; entry = nextDueAppraisal(world)) {
    const record = appraisalById(world, entry.actorId, entry.id);
    if (
      !record ||
      record.state !== 'active' ||
      record.nextAt === undefined ||
      record.nextAt > world.simTime
    )
      throw new Error('Invalid derived appraisal deadline.');
    const definition = appraisalDefinition(world, record.definitionPin)!;
    chargeWork({ tests: 1, effects: 1 });
    chargeInvocation(world, record.id, { tests: 1, effects: 1 });
    const next = nextDeadline(record, definition, world.simTime);
    if (next === undefined || record.lifetime.kind === 'expires')
      endAppraisal(world, record, 'resolved');
    else {
      record.nextAt = next;
      record.revision++;
      record.changedAt = world.simTime;
      changed(world, record.actorId);
    }
    indexAppraisal(world, record);
    privateChange(world, events, record, definition);
  }
  for (const process of Object.values(world.appraisalProcesses ?? {})) {
    if (process.nextAt > world.simTime) continue;
    chargeWork({ tests: 1 });
    advanceWorkInterval(world, process.id);
    chargeInvocation(world, process.id, { tests: 1 });
    process.nextAt = world.simTime + process.intervalSeconds;
    const actor = world.entities[process.actorId];
    if (!actor?.actor?.alive || !hasMemory(actor)) continue;
    const definition = appraisalDefinition(world, process.definitionPin)!;
    const previous = process.activeId
      ? appraisalById(world, process.actorId, process.activeId)
      : undefined;
    const source = process.condition
      ? readState(world, process.condition.address, 'owner')
      : undefined;
    const eligible =
      !process.condition ||
      (source?.status === 'known' &&
        typeof source.value === 'number' &&
        source.value < process.condition.below);
    if (!eligible) {
      if (previous?.state === 'active') {
        endAppraisal(world, previous, 'resolved');
        privateChange(world, events, previous, definition);
      }
      continue;
    }
    if (previous?.state === 'active') continue;
    const opportunity = `${process.id}:${process.opportunity + 1}`;
    const cause: AppraisalCause = process.condition
      ? {
          kind: 'condition',
          actorId: process.actorId,
          processId: process.id,
          episodeId: opportunity,
          address: process.condition.address,
          sourceVersion: canonicalJson(source),
        }
      : {
          kind: 'disposition',
          actorId: process.actorId,
          processId: process.id,
          opportunityId: opportunity,
          sourceVersion: canonicalJson(process.definitionPin),
        };
    const value: AppraisalValue =
      definition.value.kind === 'qualitative'
        ? { kind: 'qualitative' }
        : { kind: 'scaled', value: definition.value.max };
    const result = install(
      world,
      process.actorId,
      definition,
      cause,
      null,
      value,
      opportunity,
      events,
      true,
      previous?.id ?? process.activeId ?? undefined,
    );
    if (result.ok) {
      process.opportunity++;
      const stack = canonicalJson([
        process.actorId,
        appraisalPin(definition),
        null,
        definition.stacking === 'target' ? null : opportunity,
      ]);
      process.activeId = `appraisal-${contentLabel(stack)}-${contentLabel(opportunity)}`;
    }
  }
}

/** Existing conservative erasure boundary owns this operation. Keep only identifiers,
 * revision and a non-disclosing tombstone; never retain source text/targets in receipts. */
export function invalidateAppraisals(world: WorldState, actorId: string): void {
  for (const record of Object.values(valuesFor(world, actorId))) {
    endAppraisal(world, record, 'invalidated');
    record.cause = null;
    delete record.interpretationSource;
    record.targetId = null;
    record.stackKey = '';
    record.value = { kind: 'qualitative' };
    record.lifetime = { kind: 'persistent' };
    record.lastOperation = { id: record.id, body: '' };
    record.creationOperation = { id: record.id, body: '' };
    delete record.predecessorId;
  }
  for (const process of Object.values(world.appraisalProcesses ?? {}))
    if (process.actorId === actorId) {
      // Future independent condition opportunities use a new identity. They retain no
      // forgotten predecessor or purported recollection, and cannot run at this time.
      process.activeId = null;
      process.opportunity++;
      process.nextAt = Math.max(process.nextAt, world.simTime + process.intervalSeconds);
    }
  changed(world, actorId);
}

export function initializeAppraisalWork(world: WorldState): void {
  for (const entries of Object.values(world.appraisals ?? {}))
    for (const record of Object.values(entries))
      if (record.state === 'active') reserveRecord(world, record);
}
export function ownsAppraisalWork(
  world: WorldState,
  id: string,
  actorId: string,
  pin: DefinitionPin,
): boolean {
  const record = appraisalById(world, actorId, id),
    process = world.appraisalProcesses?.[id];
  return (
    !!appraisalDefinition(world, pin) &&
    !!(
      (record?.state === 'active' && sameDefinitionPin(record.definitionPin, pin)) ||
      (process?.actorId === actorId && sameDefinitionPin(process.definitionPin, pin))
    )
  );
}

export function validateAppraisals(world: WorldState): void {
  validateAppraisalPolicy(world.moduleManifest.appraisals);
  const ids = new Set<string>();
  for (const [actorId, records] of Object.entries(world.appraisals ?? {})) {
    if (!hasMemory(world.entities[actorId]) || Array.isArray(records))
      throw new Error('Invalid appraisal owner or unmigrated records.');
    for (const [id, record] of Object.entries(records)) {
      if (
        !hasRecordFields(
          record,
          [
            'id',
            'actorId',
            'revision',
            'definitionPin',
            'targetId',
            'stackKey',
            'state',
            'cause',
            'value',
            'lifetime',
            'createdAt',
            'changedAt',
            'lastOperation',
            'creationOperation',
          ],
          ['nextAt', 'predecessorId', 'interpretationSource'],
        )
      )
        throw new Error('Invalid saved appraisal shape.');
      const definition = appraisalDefinition(world, record.definitionPin);
      if (
        id !== record.id ||
        ids.has(id) ||
        !isSafeRecordId(id) ||
        record.actorId !== actorId ||
        !definition ||
        !Number.isSafeInteger(record.revision) ||
        record.revision < 1 ||
        !['active', 'resolved', 'invalidated'].includes(record.state) ||
        !Number.isFinite(record.createdAt) ||
        record.createdAt < 0 ||
        !Number.isFinite(record.changedAt) ||
        record.changedAt < record.createdAt ||
        record.changedAt > world.simTime ||
        JSON.stringify(record).length * 3 > 8192 ||
        !hasRecordFields(record.lastOperation, ['id', 'body']) ||
        !hasRecordFields(record.creationOperation, ['id', 'body']) ||
        (record.predecessorId !== undefined &&
          (!isSafeRecordId(record.predecessorId) || record.predecessorId === id)) ||
        !isSafeRecordId(record.creationOperation.id) ||
        typeof record.creationOperation.body !== 'string' ||
        typeof record.lastOperation.body !== 'string' ||
        !isSafeRecordId(record.lastOperation.id) ||
        (record.targetId !== null && !isSafeRecordId(record.targetId))
      )
        throw new Error('Invalid saved appraisal identity or policy.');
      ids.add(id);
      if (record.state === 'invalidated') {
        if (
          record.cause !== null ||
          record.targetId !== null ||
          record.stackKey ||
          record.lastOperation.body ||
          record.creationOperation.body ||
          record.nextAt !== undefined ||
          record.predecessorId !== undefined ||
          record.interpretationSource !== undefined ||
          !hasRecordFields(record.value, ['kind']) ||
          record.value.kind !== 'qualitative' ||
          !hasRecordFields(record.lifetime, ['kind']) ||
          record.lifetime.kind !== 'persistent' ||
          world.workState?.invocations[id]
        )
          throw new Error('An erased appraisal retains private content.');
        continue;
      }
      if (
        !record.cause ||
        record.cause.actorId !== actorId ||
        !record.cause.sourceVersion ||
        !definition.causes.includes(record.cause.kind) ||
        !validValue(definition, record.value) ||
        definition.lifetime.kind !== record.lifetime.kind ||
        typeof record.stackKey !== 'string' ||
        !record.stackKey
      )
        throw new Error('Invalid saved appraisal source or value.');
      const cause = record.cause;
      if (cause.kind === 'perceived-event' || cause.kind === 'remembered') {
        if (
          !validEvidence(cause) ||
          !sourceAllowed(world, actorId, cause, { sources: [cause], subjects: [] }) ||
          (record.targetId !== null && !cause.subjectIds.includes(record.targetId))
        )
          throw new Error('Invalid saved appraisal evidence.');
      } else if (cause.kind === 'authored') {
        if (!validAuthoredCause(world, actorId, cause, { sources: cause.sourceRefs, subjects: [] }))
          throw new Error('Invalid saved authored appraisal source.');
      } else if (
        !hasRecordFields(
          cause,
          cause.kind === 'condition'
            ? ['kind', 'actorId', 'processId', 'episodeId', 'address', 'sourceVersion']
            : ['kind', 'actorId', 'processId', 'opportunityId', 'sourceVersion'],
        ) ||
        !isSafeRecordId(cause.processId) ||
        typeof cause.sourceVersion !== 'string' ||
        cause.sourceVersion.length > 2048 ||
        (cause.kind === 'condition'
          ? !isSafeRecordId(cause.episodeId) ||
            !isStateAddress(cause.address) ||
            cause.address.entityId !== actorId
          : !isSafeRecordId(cause.opportunityId))
      )
        throw new Error('Invalid saved internal appraisal source.');
      if (
        record.interpretationSource &&
        (!sourceAllowed(world, actorId, record.interpretationSource, {
          sources: [record.interpretationSource],
          subjects: [],
        }) ||
          !definition.causes.includes(record.interpretationSource.kind) ||
          (record.targetId !== null &&
            !record.interpretationSource.subjectIds.includes(record.targetId)))
      )
        throw new Error('Invalid saved appraisal interpretation source.');
      const life = record.lifetime;
      if (
        (life.kind === 'persistent' && !hasRecordFields(life, ['kind'])) ||
        (life.kind === 'expires' &&
          (!hasRecordFields(life, ['kind', 'at']) ||
            !Number.isFinite(life.at) ||
            life.at < record.createdAt ||
            (definition.lifetime.kind === 'expires' &&
              life.at !== record.createdAt + definition.lifetime.seconds))) ||
        (life.kind === 'decays' &&
          (!hasRecordFields(life, ['kind', 'anchorTime', 'anchorValue']) ||
            !Number.isFinite(life.anchorTime) ||
            life.anchorTime < 0 ||
            life.anchorTime > world.simTime ||
            !validValue(definition, { kind: 'scaled', value: life.anchorValue }))) ||
        (life.kind === 'condition-sustained' &&
          (!hasRecordFields(life, ['kind', 'processId', 'episodeId']) ||
            cause.kind !== 'condition' ||
            life.processId !== cause.processId ||
            life.episodeId !== cause.episodeId ||
            world.appraisalProcesses?.[life.processId]?.actorId !== actorId))
      )
        throw new Error('Invalid saved appraisal lifetime.');
      const work = world.workState?.invocations[id];
      if (
        record.state === 'active' &&
        (!work ||
          work.actorId !== actorId ||
          !sameDefinitionPin(work.definitionPin, record.definitionPin) ||
          work.allocation.live !== 1 ||
          work.allocation.retainedBytes < 8192 ||
          work.allocation.subscriptions < 1 ||
          record.nextAt !== nextDeadline(record, definition, record.changedAt))
      )
        throw new Error('Active appraisal has no admitted retained capacity.');
      if (record.state !== 'active' && work)
        throw new Error('Terminal appraisal retains active work.');
      if (
        record.nextAt !== undefined &&
        (!Number.isFinite(record.nextAt) ||
          record.nextAt < record.createdAt ||
          record.state !== 'active')
      )
        throw new Error('Invalid saved appraisal deadline.');
    }
  }
  for (const [id, process] of Object.entries(world.appraisalProcesses ?? {})) {
    if (
      !hasRecordFields(
        process,
        [
          'id',
          'actorId',
          'definitionPin',
          'kind',
          'intervalSeconds',
          'nextAt',
          'opportunity',
          'activeId',
        ],
        ['condition'],
      )
    )
      throw new Error('Invalid saved internal appraisal process shape.');
    const definition = appraisalDefinition(world, process.definitionPin);
    const work = world.workState?.invocations[id];
    if (
      id !== process.id ||
      ids.has(id) ||
      !isSafeRecordId(id) ||
      !hasMemory(world.entities[process.actorId]) ||
      !definition ||
      !['condition', 'disposition'].includes(process.kind) ||
      JSON.stringify(process).length * 3 > 2048 ||
      !definition.causes.includes(process.kind) ||
      !Number.isFinite(process.intervalSeconds) ||
      process.intervalSeconds < 1 ||
      process.intervalSeconds > 86400 ||
      (process.activeId !== null && !isSafeRecordId(process.activeId)) ||
      !Number.isFinite(process.nextAt) ||
      process.nextAt < 0 ||
      !Number.isSafeInteger(process.opportunity) ||
      process.opportunity < 0 ||
      !work ||
      work.actorId !== process.actorId ||
      !sameDefinitionPin(work.definitionPin, process.definitionPin) ||
      work.allocation.live !== 1 ||
      work.allocation.retainedBytes < 2048 ||
      work.allocation.subscriptions < 1 ||
      work.recurrence?.intervalSeconds !== process.intervalSeconds ||
      work.recurrence?.burst !== 1 ||
      (process.kind === 'condition' &&
        (!process.condition ||
          !hasRecordFields(process.condition, ['address', 'below']) ||
          !isStateAddress(process.condition.address) ||
          process.condition.address.entityId !== process.actorId ||
          readState(world, process.condition.address, 'owner').status !== 'known' ||
          !Number.isFinite(process.condition.below))) ||
      (process.kind === 'disposition' && process.condition)
    )
      throw new Error('Invalid saved internal appraisal process.');
  }
}
