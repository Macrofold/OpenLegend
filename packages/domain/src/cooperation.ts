import { custodian } from './objects.js';
import { validAssemblyPhase } from './assemblies.js';
import { definitionPin } from './world-modules.js';
import { isDefinitionPin, sameDefinitionPin } from './definition-pins.js';
import { recipeMechanicalPin } from './invention-families.js';
import type { DefinitionPin } from './world-modules.js';
import type { SurfacePoint } from '@open-legend/spatial';
import type { WorldState } from './types.js';
import { entityGet } from './entity-collection.js';
import { hasRecordFields, isSafeRecordId } from './records.js';
import { canonicalJson } from './events.js';

/** The point is a received fixed-place description, never a moving person's location. */
export interface CooperationDestination {
  point: SurfacePoint;
  label: string;
  source: {
    subjectId: string;
    observedAt: number;
    episode: string | null;
    evidenceId?: string;
    placeRevision?: number;
  };
  entityId?: string;
  placement?: string;
  anchor?: { entityId: string; placement: string };
}
export type PreparationProposal = {
  kind: 'prepare';
  recipeId: string;
  outputPort: string;
  quantity: number;
};
export type ConstructionProposal = {
  kind: 'construction';
  plan: import('./assembly-types.js').AssemblyPlan;
};
export type CarryProposal = {
  kind: 'carry';
  offerId: string;
  offerRevision: number;
  destinationId: string;
};
export type CooperationProposal =
  | { cooperationKind: 'hunt'; quarryId: string; destinationId: string }
  | { cooperationKind: 'guide'; destinationId: string }
  | { cooperationKind: 'help'; task: PreparationProposal | CarryProposal | ConstructionProposal };
export type PreparationTask = {
  kind: 'prepare';
  helperId: string;
  recipe: DefinitionPin;
  recipeLabel: string;
  outputLabel: string;
  output: { port: string; definition: DefinitionPin };
  quantity: number;
  unit: 'item-count';
};
export type CarryTask = {
  kind: 'carry';
  helperId: string;
  offerId: string;
  offerRevision: number;
  itemId: string;
  itemRevision: number;
  definition: DefinitionPin;
  quantity: number;
  itemLabel: string;
  destination: CooperationDestination;
};
export interface ConstructionTask {
  kind: 'construction';
  helperId: string;
  phase: import('./assembly-types.js').AssemblyPhase;
  family: DefinitionPin;
  grant: { id: string; revision: number };
  label: string;
}
export type CooperationTerms =
  | {
      purpose: 'hunt';
      quarry: {
        id: string;
        life: number;
        labels: Record<string, string>;
        encounters: Record<string, string | null>;
      };
      meetingPlace: CooperationDestination;
    }
  | { purpose: 'guide'; destination: CooperationDestination }
  | { purpose: 'help'; task: PreparationTask | CarryTask | ConstructionTask };
export type CooperationEndCause =
  | 'declined'
  | 'withdrawn'
  | 'expired-unanswered'
  | 'deadline-reached'
  | 'task-completed'
  | 'concluded'
  | 'unavailable'
  | 'work-replaced';
export interface CooperationEpisode {
  id: string;
  revision: number;
  kind: 'cooperate';
  proposerId: string;
  recipientId: string;
  definition: { id: string; version: number };
  lives: Record<string, number>;
  terms: CooperationTerms;
  status: 'pending' | 'accepted';
  createdAt: number;
  expiresAt: number;
  acceptedAt?: number;
  acceptedRevision?: number;
  endAt?: number;
  pendingAmendment?: {
    revision: number;
    proposedBy: string;
    terms: CooperationTerms;
    createdAt: number;
    expiresAt: number;
  };
  ownedWork: Record<string, { planId?: string; activityId?: string }>;
  arrived: string[];
  constructionResult?: { actorId: string; occurrenceId: string };
  carried?: { itemId: string; revision: number; at: number; eventId: string; placed?: true };
  prepared?: number;
  /** Last quantity personally reported by the native output owner, not another yield ledger. */
  reportedPrepared?: number;
}
export function cooperationTermsCurrent(world: WorldState, terms: CooperationTerms): boolean {
  if (terms.purpose === 'hunt') {
    const quarry = entityGet(world.entities, terms.quarry.id);
    return (
      !!quarry?.animal &&
      !!quarry.actor?.alive &&
      (quarry.actor.physicalLife ?? 0) === terms.quarry.life &&
      cooperationDestinationCurrent(world, terms.meetingPlace)
    );
  }
  if (terms.purpose === 'help') {
    const task = terms.task;
    if (task.kind === 'construction') {
      const family = world.assemblyFamilies?.[task.family.id];
      return !!family && sameDefinitionPin(definitionPin(family), task.family);
    }
    if (task.kind === 'carry') return cooperationDestinationCurrent(world, task.destination);
    const recipe = world.recipes[task.recipe.id];
    return (
      !!recipe &&
      sameDefinitionPin(recipeMechanicalPin(recipe), task.recipe) &&
      recipe.outputs.some(
        (output) =>
          output.port === task.output.port &&
          sameDefinitionPin(output.definition, task.output.definition),
      )
    );
  }
  return cooperationDestinationCurrent(world, terms.destination);
}
function cooperationDestinationCurrent(
  world: WorldState,
  destination: CooperationDestination,
): boolean {
  if (destination.source.placeRevision !== undefined)
    return (
      world.places?.[destination.source.subjectId]?.revision === destination.source.placeRevision
    );
  if (!destination.entityId) return true;
  const entity = entityGet(world.entities, destination.entityId);
  const anchor = destination.anchor && entityGet(world.entities, destination.anchor.entityId);
  return (
    !!entity &&
    !entity.actor &&
    !entity.retirement &&
    canonicalJson(entity.placement) === destination.placement &&
    (!destination.anchor ||
      (!!anchor &&
        !anchor.actor &&
        !anchor.retirement &&
        custodian(world, entity.id) === anchor.id &&
        canonicalJson(anchor.placement) === destination.anchor.placement))
  );
}
export function validateCooperationTerms(value: unknown): asserts value is CooperationTerms {
  if (hasRecordFields(value, ['purpose', 'quarry', 'meetingPlace']) && value.purpose === 'hunt') {
    const quarry = value.quarry;
    if (
      !hasRecordFields(quarry, ['id', 'life', 'labels', 'encounters']) ||
      !isSafeRecordId(quarry.id) ||
      !Number.isSafeInteger(quarry.life) ||
      Number(quarry.life) < 0 ||
      !quarry.labels ||
      typeof quarry.labels !== 'object' ||
      Array.isArray(quarry.labels) ||
      Object.keys(quarry.labels).length < 1 ||
      Object.keys(quarry.labels).length > 2 ||
      !quarry.encounters ||
      typeof quarry.encounters !== 'object' ||
      Array.isArray(quarry.encounters) ||
      Object.keys(quarry.encounters).some((id) => !Object.hasOwn(quarry.labels as object, id)) ||
      Object.values(quarry.encounters).some((id) => id !== null && !isSafeRecordId(id)) ||
      Object.values(quarry.labels).some((v) => typeof v !== 'string' || !v.trim() || v.length > 500)
    )
      throw new Error('Invalid personally identified quarry.');
    validateCooperationTerms({ purpose: 'guide', destination: value.meetingPlace });
    return;
  }
  if (hasRecordFields(value, ['purpose', 'task']) && value.purpose === 'help') {
    const task = value.task;
    if (
      hasRecordFields(task, ['kind', 'helperId', 'phase', 'family', 'grant', 'label']) &&
      task.kind === 'construction'
    ) {
      if (
        !isSafeRecordId(task.helperId) ||
        !isDefinitionPin(task.family) ||
        !task.phase ||
        !validAssemblyPhase(task.phase as import('./assembly-types.js').AssemblyPhase) ||
        !hasRecordFields(task.grant, ['id', 'revision']) ||
        !isSafeRecordId(task.grant.id) ||
        !Number.isSafeInteger(task.grant.revision) ||
        Number(task.grant.revision) < 1 ||
        typeof task.label !== 'string' ||
        !task.label.trim() ||
        task.label.length > 500
      )
        throw new Error('Invalid reviewed construction help terms.');
      return;
    }

    if (
      hasRecordFields(task, [
        'kind',
        'helperId',
        'offerId',
        'offerRevision',
        'itemId',
        'itemRevision',
        'definition',
        'quantity',
        'itemLabel',
        'destination',
      ]) &&
      task.kind === 'carry'
    ) {
      if (
        !isSafeRecordId(task.helperId) ||
        !isSafeRecordId(task.offerId) ||
        !Number.isSafeInteger(task.offerRevision) ||
        Number(task.offerRevision) < 1 ||
        !isSafeRecordId(task.itemId) ||
        !Number.isSafeInteger(task.itemRevision) ||
        Number(task.itemRevision) < 0 ||
        !isDefinitionPin(task.definition) ||
        !Number.isSafeInteger(task.quantity) ||
        Number(task.quantity) < 1 ||
        typeof task.itemLabel !== 'string' ||
        !task.itemLabel.trim() ||
        task.itemLabel.length > 500
      )
        throw new Error('Invalid carrying help terms.');
      validateCooperationTerms({ purpose: 'guide', destination: task.destination });
      return;
    }
    if (
      !hasRecordFields(task, [
        'kind',
        'helperId',
        'recipe',
        'recipeLabel',
        'outputLabel',
        'output',
        'quantity',
        'unit',
      ]) ||
      task.kind !== 'prepare' ||
      typeof task.recipeLabel !== 'string' ||
      !task.recipeLabel.trim() ||
      task.recipeLabel.length > 500 ||
      typeof task.outputLabel !== 'string' ||
      !task.outputLabel.trim() ||
      task.outputLabel.length > 500 ||
      !isSafeRecordId(task.helperId) ||
      !isDefinitionPin(task.recipe) ||
      !hasRecordFields(task.output, ['port', 'definition']) ||
      !isSafeRecordId(task.output.port) ||
      !isDefinitionPin(task.output.definition) ||
      !Number.isSafeInteger(task.quantity) ||
      Number(task.quantity) < 1 ||
      task.unit !== 'item-count'
    )
      throw new Error('Invalid preparation help terms.');
    return;
  }
  if (!hasRecordFields(value, ['purpose', 'destination']) || value.purpose !== 'guide')
    throw new Error('Invalid cooperative terms.');
  const d = value.destination;
  if (
    !hasRecordFields(d, ['point', 'label', 'source'], ['entityId', 'placement', 'anchor']) ||
    typeof d.label !== 'string' ||
    !d.label.trim() ||
    d.label.length > 500 ||
    !hasRecordFields(d.point, ['x', 'y', 'z', 'surfaceId']) ||
    ![d.point.x, d.point.y, d.point.z].every((v) => typeof v === 'number' && Number.isFinite(v)) ||
    !isSafeRecordId(d.point.surfaceId) ||
    !hasRecordFields(
      d.source,
      ['subjectId', 'observedAt', 'episode'],
      ['evidenceId', 'placeRevision'],
    ) ||
    !isSafeRecordId(d.source.subjectId) ||
    typeof d.source.observedAt !== 'number' ||
    !Number.isFinite(d.source.observedAt) ||
    d.source.observedAt < 0 ||
    (d.source.episode !== null && !isSafeRecordId(d.source.episode)) ||
    (d.source.placeRevision !== undefined &&
      (!Number.isSafeInteger(d.source.placeRevision) ||
        Number(d.source.placeRevision) < 1 ||
        !isSafeRecordId(d.source.evidenceId))) ||
    (d.source.evidenceId !== undefined && d.source.placeRevision === undefined) ||
    (d.anchor !== undefined &&
      (!hasRecordFields(d.anchor, ['entityId', 'placement']) ||
        !isSafeRecordId(d.anchor.entityId) ||
        typeof d.anchor.placement !== 'string' ||
        d.entityId === undefined)) ||
    (d.entityId === undefined
      ? d.placement !== undefined
      : !isSafeRecordId(d.entityId) || typeof d.placement !== 'string')
  )
    throw new Error('Invalid received cooperative destination.');
}
export function cooperationDestination(
  trip: CooperationEpisode,
): CooperationDestination | undefined {
  return trip.terms.purpose === 'hunt'
    ? trip.terms.meetingPlace
    : trip.terms.purpose === 'guide'
      ? trip.terms.destination
      : trip.terms.task.kind === 'carry'
        ? trip.terms.task.destination
        : undefined;
}

export interface CooperationPurposeBinding {
  id: string;
  revision: number;
}
export interface PerceivedCooperation {
  id: string;
  revision: number;
  proposerId: string;
  recipientId: string;
  terms: CooperationTerms;
  status: 'pending' | 'accepted' | 'ended';
  expiresAt: number;
  endAt?: number;
  acceptedRevision?: number;
  cause?: CooperationEndCause;
  amendment?: CooperationEpisode['pendingAmendment'];
}
/** Read the person's retained occurrence-time account, never absence from live consent.
 * Forgetting removes a remembered agreement; it cannot reveal an unseen withdrawal. */
export function perceivedCooperation(world: WorldState, actorId: string): PerceivedCooperation[] {
  const entries = world.experience?.awareness[actorId] ?? [];
  const forgotten = world.experience?.forgotten[actorId],
    corrections = world.experience?.corrections?.[actorId];
  const cached = Object.isFrozen(entries) ? perceivedByEntries.get(entries) : undefined;
  if (cached && cached.forgotten === forgotten && cached.corrections === corrections)
    return cached.value;
  const excluded = new Set(forgotten ?? []);
  const known = new Map<string, PerceivedCooperation>();
  for (const entry of entries) {
    if (
      entry.retentionClass !== 'memory' ||
      entry.eventType !== 'cooperation' ||
      excluded.has(entry.eventId) ||
      corrections?.[entry.eventId]
    )
      continue;
    const body = entry.eventData?.agreement;
    if (typeof body !== 'string') continue;
    const value: unknown = JSON.parse(body);
    validatePerceivedCooperation(value, actorId);
    known.set(value.id, value);
  }
  const result = [...known.values()];
  if (Object.isFrozen(entries))
    perceivedByEntries.set(entries, { forgotten, corrections, value: result });
  return result;
}
const perceivedByEntries = new WeakMap<
  object,
  { forgotten: string[] | undefined; corrections: unknown; value: PerceivedCooperation[] }
>();

export function validatePerceivedCooperation(
  value: unknown,
  actorId: string,
): asserts value is PerceivedCooperation {
  if (
    !hasRecordFields(
      value,
      ['id', 'revision', 'proposerId', 'recipientId', 'terms', 'status', 'expiresAt'],
      ['endAt', 'acceptedRevision', 'cause', 'amendment'],
    ) ||
    !isSafeRecordId(value.id) ||
    !isSafeRecordId(value.proposerId) ||
    !isSafeRecordId(value.recipientId) ||
    value.proposerId === value.recipientId ||
    ![value.proposerId, value.recipientId].includes(actorId) ||
    !Number.isSafeInteger(value.revision) ||
    Number(value.revision) < 1 ||
    !['pending', 'accepted', 'ended'].includes(String(value.status)) ||
    typeof value.expiresAt !== 'number' ||
    !Number.isFinite(value.expiresAt) ||
    value.expiresAt < 0 ||
    (value.acceptedRevision !== undefined &&
      (!Number.isSafeInteger(value.acceptedRevision) ||
        Number(value.acceptedRevision) < 2 ||
        Number(value.acceptedRevision) > Number(value.revision))) ||
    (value.endAt !== undefined &&
      (typeof value.endAt !== 'number' || !Number.isFinite(value.endAt) || value.endAt < 0)) ||
    (value.status === 'accepted' &&
      (value.acceptedRevision === undefined || value.endAt === undefined)) ||
    (value.cause !== undefined &&
      ![
        'declined',
        'withdrawn',
        'expired-unanswered',
        'deadline-reached',
        'task-completed',
        'concluded',
        'unavailable',
        'work-replaced',
      ].includes(String(value.cause)))
  )
    throw new Error('Invalid personally perceived cooperative agreement.');
  validatePersonalCooperationTerms(value.terms, actorId);
  if (value.amendment !== undefined) {
    const a = value.amendment;
    if (
      !hasRecordFields(a, ['revision', 'proposedBy', 'terms', 'createdAt', 'expiresAt']) ||
      a.revision !== value.revision ||
      !isSafeRecordId(a.proposedBy) ||
      ![value.proposerId, value.recipientId].includes(a.proposedBy) ||
      typeof a.createdAt !== 'number' ||
      !Number.isFinite(a.createdAt) ||
      a.createdAt < 0 ||
      typeof a.expiresAt !== 'number' ||
      !Number.isFinite(a.expiresAt) ||
      a.expiresAt <= a.createdAt
    )
      throw new Error('Invalid personally perceived cooperative amendment.');
    validatePersonalCooperationTerms(a.terms, actorId);
  }
}
export function validateCooperationExperience(world: WorldState): void {
  for (const [actorId, entries] of Object.entries(world.experience?.awareness ?? {}))
    for (const entry of entries) {
      if (entry.eventType !== 'cooperation') continue;
      if (typeof entry.eventData?.agreement !== 'string')
        throw new Error('Missing perceived cooperative terms.');
      validatePerceivedCooperation(JSON.parse(entry.eventData.agreement), actorId);
    }
}

export function cooperationTermsLabel(world: WorldState, terms: CooperationTerms): string {
  if (terms.purpose === 'guide') return terms.destination.label;
  const labels = world.socialOfferPolicy!.cooperation!.labels;
  if (terms.purpose === 'hunt')
    return labels.huntTerms
      .replaceAll('{quarry}', Object.values(terms.quarry.labels)[0]!)
      .replaceAll('{place}', terms.meetingPlace.label);
  if (terms.task.kind === 'construction') return terms.task.label;
  if (terms.task.kind === 'carry')
    return labels.carryTerms
      .replaceAll('{item}', terms.task.itemLabel)
      .replaceAll('{place}', terms.task.destination.label);
  return `${terms.task.quantity} ${terms.task.outputLabel} using ${terms.task.recipeLabel}`;
}

export function validateCooperationMethods(world: WorldState): void {
  const seen = new Set<string>();
  for (const pin of world.socialOfferPolicy?.cooperation?.helpMethods ?? []) {
    const recipe = world.recipes[pin.id];
    if (!recipe || seen.has(pin.id) || !sameDefinitionPin(pin, recipeMechanicalPin(recipe)))
      throw new Error('Invalid installed cooperative method reference.');
    seen.add(pin.id);
  }
}

/** Each participant retains only their own acquired quarry identity, never their
 * companion's private name or encounter history. */
export function personalCooperationTerms(
  terms: CooperationTerms,
  actorId: string,
): CooperationTerms {
  return terms.purpose === 'hunt'
    ? {
        ...terms,
        quarry: {
          ...terms.quarry,
          labels: { [actorId]: terms.quarry.labels[actorId]! },
          encounters: { [actorId]: terms.quarry.encounters[actorId] ?? null },
        },
      }
    : terms;
}

function validatePersonalCooperationTerms(
  value: unknown,
  actorId: string,
): asserts value is CooperationTerms {
  validateCooperationTerms(value);
  if (
    value.purpose === 'hunt' &&
    (Object.keys(value.quarry.labels).length !== 1 ||
      !Object.hasOwn(value.quarry.labels, actorId) ||
      Object.keys(value.quarry.encounters).length !== 1 ||
      !Object.hasOwn(value.quarry.encounters, actorId))
  )
    throw new Error('Foreign quarry observation in a personal agreement.');
}
