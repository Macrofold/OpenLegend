import { nextId } from './data.js';
import { freeze } from 'immer';
import { cloneValue, readOnlyDraftView } from './draft.js';
import { entityGet } from './entity-collection.js';
import { hasMemory } from './living.js';
import { chargeWork } from './work-budget.js';
import { ensureExperienceAccounting } from './remembered-impressions.js';
import { personalFactAlias } from './experience-source.js';
import { selectedRecognitionSupportSourceIds } from './world-composition.js';
import type { WorldState } from './types.js';
import type { ObserverSubject } from './knowledge.js';
import type {
  EvidenceSource,
  LiveFacetSupport,
  ObservationContribution,
  ObservationFactKey,
  ObservedLocation,
  ObservationFrame,
  ObservationExposure,
  ObservationOrigin,
  SensoryFacet,
} from './perception-evidence.js';

/** An address proves neither reception nor access. Readers first select the actor's receipt. */
export interface TemporalReceiptLocator {
  actorId: string;
  physicalLife: number;
  epoch: string;
  ordinal: number;
}
export function temporalReceiptId(
  locator: Pick<TemporalReceiptLocator, 'epoch' | 'ordinal'>,
): string {
  return `temporal-receipt-${locator.epoch}-${locator.ordinal}`;
}
export interface TemporalValueReference {
  blockId: string;
  valueOrdinal: number;
}
export interface TemporalMotionSample {
  location: ObservedLocation;
  frame: ObservationFrame;
  measuredFrom: number;
  measuredThrough: number;
  acquiredAt: number;
  original: ObservationFactKey;
  confirmation: EvidenceSource;
}
export interface TemporalMotionValue {
  kind: 'received-motion';
  exposure: ObservationExposure;
  earlier: TemporalMotionSample;
  later: TemporalMotionSample;
  correspondence: 'unambiguous-received-continuity';
}
export type TemporalValue =
  | Exclude<SensoryFacet, { kind: 'observed-motion' }>
  | TemporalMotionValue
  | {
      kind: 'personal-account';
      source: 'awareness' | 'memory';
      id: string;
      text: string;
      eventType?: string;
      content?: string;
      data?: Record<string, unknown>;
    };
export interface TemporalSourceBlock {
  id: string;
  at: number;
  sequence: number;
  values: TemporalValue[];
  bytes: number;
}
export interface TemporalFacetReference extends TemporalValueReference {
  ordinal: number;
  role: 'direct' | 'inference' | 'testimony';
  asOf: number;
  measuredFrom: number;
  measuredThrough: number;
  acquiredAt: number;
  original?: ObservationFactKey;
  /** Exact live measurement revision; original is its acquired provenance root. */
  receivedFrom?: EvidenceSource;
}
export interface TemporalReceipt extends TemporalReceiptLocator {
  id: string;
  at: number;
  order: number;
  origin?: ObservationOrigin;
  /** Observer-local continuous exposure, not a canonical identity. */
  subject: string;
  subjectIdentity?: ObserverSubject;
  change: 'baseline' | 'change' | 'loss' | 'occurrence' | 'attention-exit';
  required: boolean;
  /** Original account aliases are needed for scoped correction, never for hidden hydration. */
  sourceIds: string[];
  facets: TemporalFacetReference[];
}
export interface TemporalChunk {
  id: string;
  actorId: string;
  physicalLife: number;
  epoch: string;
  fromOrdinal: number;
  throughOrdinal: number;
  fromAt: number;
  throughAt: number;
  subjects: string[];
  sourceIds: string[];
  individualIds: string[];
  sourceRefs: string[];
  bytes: number;
  count: number;
  receipts: TemporalReceipt[];
  boundary: string;
}
export interface TemporalActorHistory {
  physicalLife: number;
  epoch: string;
  nextOrdinal: number;
  /** Resident append/tail only. The repository owns cold chunks and indexed retirement. */
  chunks: TemporalChunk[];
  bytes: number;
  count: number;
  nextDue: number | null;
  maintenanceDue: boolean;
  /** Conservative unavailable-prefix coverage, not a ledger of fictional sensory losses. */
  releasedThrough?: number;
  /** Bounded live-capture watermarks; values remain in their immutable source owner. */
  captures: Record<string, TemporalValueReference>;
  /** Sparse exact qualifying contact support, not an autobiographical archive. */
  supports?: Record<string, TemporalSupportCapsule>;
  accounts?: {
    nextDue: number | null;
    optional: { bytes: number; count: number };
    required: { bytes: number; count: number };
    speech: { bytes: number; count: number };
    archives?: Record<'optional' | 'required' | 'speech', { bytes: number; count: number }>;
  };
}
export interface TemporalSupportCapsule {
  receipt: TemporalReceipt;
  /** Same order as retained facets. Their original ordinals are never renumbered. */
  values: TemporalValue[];
  bytes: number;
  required: boolean;
}
export interface TemporalEvidenceState {
  version: 1;
  /** Existing server timeline identity on restoration; native creation uses saved IDs. */
  namespace: string;
  sources: Record<string, TemporalSourceBlock>;
  actors: Record<string, TemporalActorHistory>;
  activeBoundary?: string;
  activeSource?: string;
}
export interface TemporalRetentionPolicy {
  maxAgeSeconds: number;
  maxBytes: number;
  maxChanges: number;
  chunkBytes: number;
}
export interface TemporalCaptureInput {
  subject: string;
  subjectIdentity?: ObserverSubject;
  change: TemporalReceipt['change'];
  required?: boolean;
  sourceIds?: string[];
  origin?: ObservationOrigin;
  facets: Array<{
    value: TemporalValue | Extract<SensoryFacet, { kind: 'observed-motion' }>;
    role: TemporalFacetReference['role'];
    asOf: number;
    measuredFrom: number;
    measuredThrough: number;
    acquiredAt: number;
    original?: ObservationFactKey;
    receivedFrom?: EvidenceSource;
    /** Private producer cache key; excluded from the retained received record. */
    sharedSourceId?: string;
  }>;
}

const encoder = new TextEncoder();
const byteLength = (value: unknown) => encoder.encode(JSON.stringify(value)).byteLength;
const boundary = (world: WorldState) => `${world.sequence}:${world.simTime}`;
const blockIndexes = new WeakMap<
  object,
  { id: string; length: number; index: Map<string, number> }
>();
const sourceValues = new WeakMap<object, Map<string, TemporalValueReference>>();
const motionValues = new WeakMap<object, TemporalMotionValue>();
const equalValue = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);
function temporalValue(value: TemporalCaptureInput['facets'][number]['value']): TemporalValue {
  if (value.kind !== 'observed-motion') return value;
  const original = readOnlyDraftView(value);
  const held = motionValues.get(original);
  if (held) return held;
  const sample = (input: typeof value.earlier): TemporalMotionSample => ({
    location: cloneValue(input.value.location),
    frame: cloneValue(input.value.frame),
    measuredFrom: input.valueMeasuredFrom,
    measuredThrough: input.valueMeasuredThrough,
    acquiredAt: input.valueAcquiredAt,
    original: {
      source: {
        family: 'native-exposure',
        id: input.original.id,
        revision: input.original.revision,
        observer: { ...input.observer },
      },
      ordinal: input.originalOrdinal,
    },
    confirmation: cloneValue(input.confirmation),
  });
  const result: TemporalMotionValue = {
    kind: 'received-motion',
    exposure: cloneValue(value.exposure),
    earlier: sample(value.earlier),
    later: sample(value.later),
    correspondence: value.correspondence,
  };
  motionValues.set(original, result);
  return result;
}
function initialBytes(value: { bytes: number }): number {
  for (let attempt = 0; attempt < 4; attempt++) {
    const bytes = byteLength(value);
    if (bytes === value.bytes) break;
    value.bytes = bytes;
  }
  return value.bytes;
}
function adjustHeaderBytes<T extends { bytes: number }>(
  value: T,
  previousHeader: number,
  header: () => number,
): number {
  let change = 0;
  for (let attempt = 0; attempt < 4; attempt++) {
    const next = header();
    const delta = next - previousHeader;
    if (!delta) break;
    value.bytes += delta;
    change += delta;
    previousHeader = next;
  }
  return change;
}

function state(world: WorldState): TemporalEvidenceState | undefined {
  if (!world.experience) return;
  return (world.experience.temporal ??= {
    version: 1,
    namespace: nextId(world, 'receipt-timeline'),
    sources: {},
    actors: {},
  });
}
function actorHistory(
  world: WorldState,
  actorId: string,
): { state: TemporalEvidenceState; actor: TemporalActorHistory } | undefined {
  const entity = entityGet(world.entities, actorId);
  if (!entity?.actor || !hasMemory(entity)) return;
  const temporal = state(world);
  if (!temporal) return;
  const life = entity.actor.physicalLife ?? 0;
  let actor = temporal.actors[actorId];
  if (!actor) {
    actor = temporal.actors[actorId] = {
      physicalLife: life,
      epoch: `${temporal.namespace}-${nextId(world, 'receipt-epoch')}`,
      nextOrdinal: 0,
      chunks: [],
      bytes: 0,
      count: 0,
      nextDue: null,
      maintenanceDue: false,
      captures: {},
    };
  } else if (actor.physicalLife !== life) {
    actor.physicalLife = life;
    actor.epoch = `${temporal.namespace}-${nextId(world, 'receipt-epoch')}`;
    actor.nextOrdinal = 0;
    actor.captures = {};
  }
  return { state: temporal, actor };
}
export function temporalActorHistory(
  world: WorldState,
  actorId: string,
): TemporalActorHistory | undefined {
  return actorHistory(world, actorId)?.actor;
}
/** Restore starts a new append address space without replaying any perception. */
export function beginTemporalReceiptEpoch(world: WorldState, namespace: string): void {
  const temporal = world.experience?.temporal;
  if (!temporal) return;
  if (!namespace.trim() || namespace.length > 64)
    throw new Error('A receipt timeline requires its admitted namespace.');
  temporal.namespace = namespace;
  for (const actor of Object.values(temporal.actors)) {
    actor.epoch = `${temporal.namespace}-${nextId(world, 'receipt-epoch')}`;
    actor.nextOrdinal = 0;
    actor.captures = {};
  }
  delete temporal.activeBoundary;
  delete temporal.activeSource;
}
function retainValue(
  world: WorldState,
  temporal: TemporalEvidenceState,
  value: TemporalValue,
  maxBytes: number,
  sharedSourceId?: string,
) {
  const entity = sharedSourceId && entityGet(world.entities, sharedSourceId);
  const source = entity && readOnlyDraftView(entity);
  const previous = source && sourceValues.get(source)?.get(value.kind);
  const existing = previous && temporal.sources[previous.blockId]?.values[previous.valueOrdinal];
  // Reuse never reads a hidden value into evidence: the actual receiver supplied
  // the complete value first, and equality is checked against that received body.
  if (previous && existing && equalValue(existing, value))
    return { reference: previous, addedBytes: 0 };
  const atBoundary = boundary(world);
  let block = temporal.activeSource && temporal.sources[temporal.activeSource];
  let addedBytes = 0;
  const key = JSON.stringify(value);
  const valueBytes = encoder.encode(key).byteLength;
  if (
    !block ||
    temporal.activeBoundary !== atBoundary ||
    (block.values.length > 0 && block.bytes + valueBytes + 1 > maxBytes)
  ) {
    block = {
      id: nextId(world, 'temporal-source'),
      at: world.simTime,
      sequence: world.sequence,
      values: [],
      bytes: 0,
    };
    initialBytes(block);
    addedBytes += block.bytes;
    temporal.sources[block.id] = block;
    temporal.activeBoundary = atBoundary;
    temporal.activeSource = block.id;
  }
  let prepared = blockIndexes.get(world);
  if (!prepared || prepared.id !== block.id || prepared.length !== block.values.length) {
    prepared = {
      id: block.id,
      length: block.values.length,
      index: new Map(
        readOnlyDraftView(block).values.map((entry, ordinal) => [JSON.stringify(entry), ordinal]),
      ),
    };
    blockIndexes.set(world, prepared);
  }
  const index = prepared.index;
  let ordinal = index.get(key);
  if (ordinal === undefined) {
    const before = block.bytes;
    ordinal = block.values.length;
    const copy = freeze(cloneValue(readOnlyDraftView(value)), true);
    const previousHeader = byteLength({ ...block, values: [] });
    block.values.push(copy);
    block.bytes += valueBytes + (block.values.length > 1 ? 1 : 0);
    adjustHeaderBytes(block, previousHeader, () => byteLength({ ...block, values: [] }));
    addedBytes += block.bytes - before;
    index.set(key, ordinal);
    prepared.length = block.values.length;
  }
  const reference = { blockId: block.id, valueOrdinal: ordinal };
  if (source) {
    let values = sourceValues.get(source);
    if (!values) sourceValues.set(source, (values = new Map()));
    values.set(value.kind, reference);
  }
  return { reference, addedBytes };
}

/** Called only with already received values. Admission never reads a hidden source entity. */
export function appendTemporalReceipt(
  world: WorldState,
  actorId: string,
  input: TemporalCaptureInput,
  policy: TemporalRetentionPolicy,
): TemporalReceiptLocator | undefined {
  if (!input.facets.length) return;
  const owned = actorHistory(world, actorId);
  if (!owned) return;
  const { actor, state: temporal } = owned;
  let addedSourceBytes = 0;
  const ordinal = actor.nextOrdinal++;
  const receipt: TemporalReceipt = {
    id: temporalReceiptId({ epoch: actor.epoch, ordinal }),
    actorId,
    physicalLife: actor.physicalLife,
    epoch: actor.epoch,
    ordinal,
    at: world.simTime,
    order: world.nextId,
    ...(input.origin ? { origin: cloneValue(input.origin) } : {}),
    subject: input.subject,
    ...(input.subjectIdentity ? { subjectIdentity: cloneValue(input.subjectIdentity) } : {}),
    change: input.change,
    required: input.required === true,
    sourceIds: [...new Set(input.sourceIds ?? [])],
    facets: input.facets.map(({ value, sharedSourceId, ...metadata }, ordinal) => {
      const retained = retainValue(
        world,
        temporal,
        temporalValue(value),
        policy.chunkBytes,
        sharedSourceId,
      );
      addedSourceBytes += retained.addedBytes;
      return { ...cloneValue(metadata), ...retained.reference, ordinal };
    }),
  };
  const sourceBytes = input.facets.reduce(
    (sum, facet) => sum + byteLength(temporalValue(facet.value)),
    0,
  );
  // Logical accounting charges each observer's full support even when storage shares it.
  const bytes = byteLength(receipt) + sourceBytes;
  const atBoundary = boundary(world);
  let chunk = actor.chunks.at(-1);
  if (
    !chunk ||
    chunk.boundary !== atBoundary ||
    chunk.epoch !== actor.epoch ||
    chunk.bytes + bytes > policy.chunkBytes
  ) {
    chunk = {
      id: nextId(world, 'temporal-chunk'),
      actorId,
      physicalLife: actor.physicalLife,
      epoch: actor.epoch,
      fromOrdinal: receipt.ordinal,
      throughOrdinal: receipt.ordinal,
      fromAt: receipt.at,
      throughAt: receipt.at,
      subjects: [],
      sourceIds: [],
      individualIds: [],
      sourceRefs: [],
      bytes: 0,
      count: 0,
      receipts: [],
      boundary: atBoundary,
    };
    initialBytes(chunk);
    actor.bytes += chunk.bytes;
    actor.chunks.push(chunk);
  }
  const previousHeader = byteLength({ ...chunk, receipts: [] });
  chunk.receipts.push(receipt);
  chunk.count++;
  chunk.bytes += bytes + (chunk.receipts.length > 1 ? 1 : 0);
  chunk.throughAt = receipt.at;
  chunk.throughOrdinal = receipt.ordinal;
  if (!chunk.subjects.includes(receipt.subject)) chunk.subjects.push(receipt.subject);
  for (const id of receipt.sourceIds) if (!chunk.sourceIds.includes(id)) chunk.sourceIds.push(id);
  for (const id of temporalReceiptIndividualIds(receipt, temporal.sources))
    if (!chunk.individualIds.includes(id)) chunk.individualIds.push(id);
  for (const id of temporalReceiptAliases(receipt, temporal.sources, world))
    if (!chunk.sourceIds.includes(id)) chunk.sourceIds.push(id);
  for (const facet of receipt.facets)
    if (!chunk.sourceRefs.includes(facet.blockId)) chunk.sourceRefs.push(facet.blockId);
  const headerChange = adjustHeaderBytes(chunk, previousHeader, () =>
    byteLength({ ...chunk, receipts: [] }),
  );
  actor.bytes += bytes + (chunk.receipts.length > 1 ? 1 : 0) + headerChange;
  actor.count++;
  const due = chunk.fromAt + policy.maxAgeSeconds;
  actor.nextDue = actor.nextDue === null ? due : Math.min(actor.nextDue, due);
  actor.maintenanceDue =
    actor.bytes > policy.maxBytes ||
    actor.count > policy.maxChanges ||
    (actor.nextDue !== null && actor.nextDue <= world.simTime);
  chargeWork({
    effects: 1,
    tests: input.facets.length,
    outputBytes: byteLength(receipt) + addedSourceBytes,
  });
  return {
    actorId,
    physicalLife: receipt.physicalLife,
    epoch: receipt.epoch,
    ordinal: receipt.ordinal,
  };
}

export function temporalFacetInput(
  lease: LiveFacetSupport,
): TemporalCaptureInput['facets'][number] {
  return {
    value: readOnlyDraftView(lease.value),
    role: lease.original.facets[lease.originalOrdinal]?.role ?? 'direct',
    asOf: lease.valueMeasuredThrough,
    measuredFrom: lease.valueMeasuredFrom,
    measuredThrough: lease.valueMeasuredThrough,
    acquiredAt: lease.valueAcquiredAt,
    original: {
      source: {
        family: 'native-exposure',
        id: lease.original.id,
        revision: lease.original.revision,
        observer: { ...lease.observer },
      },
      ordinal: lease.originalOrdinal,
    },
    receivedFrom: {
      family: 'native-exposure',
      id: lease.id,
      revision: lease.revision,
      observer: { ...lease.observer },
    },
    sharedSourceId: lease.subjectId,
  };
}

/** Watermarks hold references only; they do not become another writable current-fact graph. */
export function captureTemporalCurrent(
  world: WorldState,
  actorId: string,
  leases: readonly LiveFacetSupport[],
  newlySelected: ReadonlySet<string>,
  policy: TemporalRetentionPolicy,
  endingSelection: ReadonlySet<string> = new Set(),
  contactSubjects: ReadonlySet<string> = new Set(),
  changedSubjects?: ReadonlySet<string>,
): Array<{ subjectId: string; receipt: TemporalReceipt; body?: LiveFacetSupport }> {
  const owned = actorHistory(world, actorId);
  if (!owned) return [];
  const captured: Array<{ subjectId: string; receipt: TemporalReceipt; body?: LiveFacetSupport }> =
    [];
  const keep = new Set<string>();
  const grouped = new Map<string, LiveFacetSupport[]>();
  for (const lease of leases) {
    keep.add(lease.id);
    if (
      changedSubjects &&
      !changedSubjects.has(lease.subjectId) &&
      !newlySelected.has(lease.subjectId) &&
      !endingSelection.has(lease.subjectId) &&
      !(lease.value.kind === 'body' && contactSubjects.has(lease.subjectId))
    )
      continue;
    const reference = owned.actor.captures[lease.id];
    const previous =
      reference && owned.state.sources[reference.blockId]?.values[reference.valueOrdinal];
    if (
      !newlySelected.has(lease.subjectId) &&
      !endingSelection.has(lease.subjectId) &&
      !(lease.value.kind === 'body' && contactSubjects.has(lease.subjectId)) &&
      previous &&
      equalValue(previous, temporalValue(readOnlyDraftView(lease.value)))
    )
      continue;
    const group = grouped.get(lease.subjectId) ?? [];
    group.push(lease);
    grouped.set(lease.subjectId, group);
  }
  for (const group of grouped.values()) {
    const supported = leases.find(
      (lease) =>
        lease.subjectId === group[0]!.subjectId &&
        lease.value.kind === 'association' &&
        lease.value.strength === 'supported',
    )?.value;
    const identity =
      supported?.kind === 'association'
        ? supported.subject
        : leases.find(
            (lease) => lease.subjectId === group[0]!.subjectId && lease.value.kind === 'body',
          )?.localSubject;
    appendTemporalReceipt(
      world,
      actorId,
      {
        subject: group[0]!.exposure.episodeId,
        ...(identity ? { subjectIdentity: identity } : {}),
        change: endingSelection.has(group[0]!.subjectId)
          ? 'attention-exit'
          : newlySelected.has(group[0]!.subjectId)
            ? 'baseline'
            : 'change',
        sourceIds: [...new Set(group.map((lease) => lease.original.id))],
        facets: group.map(temporalFacetInput),
      },
      policy,
    );
    const receipt = owned.actor.chunks.at(-1)?.receipts.at(-1);
    if (receipt) {
      captured.push({
        subjectId: group[0]!.subjectId,
        receipt,
        body: group.find((lease) => lease.value.kind === 'body'),
      });
      group.forEach((lease, index) => {
        const facet = receipt.facets[index]!;
        owned.actor.captures[lease.id] = {
          blockId: facet.blockId,
          valueOrdinal: facet.valueOrdinal,
        };
      });
    }
  }
  for (const id of Object.keys(owned.actor.captures))
    if (!keep.has(id)) delete owned.actor.captures[id];
  return captured;
}

export function captureTemporalObservation(
  world: WorldState,
  actorId: string,
  observation: ObservationContribution,
  sourceIds: string[],
  required: boolean,
  policy: TemporalRetentionPolicy,
  options: { subject?: string; ordinals?: ReadonlySet<number> } = {},
): TemporalReceiptLocator | undefined {
  return appendTemporalReceipt(
    world,
    actorId,
    {
      subject:
        options.subject ??
        (observation.origin.kind === 'exposure'
          ? observation.origin.episodeId
          : observation.origin.eventId),
      change: 'occurrence',
      required,
      sourceIds,
      origin: cloneValue(observation.origin),
      facets: observation.facets
        .filter((facet) => !options.ordinals || options.ordinals.has(facet.ordinal))
        .map((facet) => ({
          ...facet,
          original: {
            source: {
              family: 'native-exposure',
              id: observation.id,
              revision: observation.revision,
              observer: { ...observation.observer },
            },
            ordinal: facet.ordinal,
          },
        })),
    },
    policy,
  );
}

/** A deduplication watermark grants no retention of a mixed shared source block.
 * The repository calls this only after proving no retained receipt owns the block. */
export function clearTemporalCaptureReferences(
  world: WorldState,
  blockIds: ReadonlySet<string>,
): void {
  if (!blockIds.size) return;
  for (const actor of Object.values(world.experience?.temporal?.actors ?? {}))
    for (const [key, reference] of Object.entries(actor.captures))
      if (blockIds.has(reference.blockId)) delete actor.captures[key];
}

/** Server-selected cold retirement totals are applied by this same native semantic owner. */
export function retireTemporalChunks(
  world: WorldState,
  actorId: string,
  ids: readonly string[],
  totals: { bytes: number; count: number },
  nextDue: number | null,
  releasedThrough?: number,
): void {
  const actor = world.experience?.temporal?.actors[actorId];
  if (!actor) return;
  const removed = new Set(ids);
  actor.chunks = actor.chunks.filter((chunk) => !removed.has(chunk.id));
  actor.bytes = Math.max(0, actor.bytes - totals.bytes);
  actor.count = Math.max(0, actor.count - totals.count);
  actor.nextDue = nextDue;
  if (releasedThrough !== undefined)
    actor.releasedThrough = Math.max(actor.releasedThrough ?? 0, releasedThrough);
  actor.maintenanceDue = false;
}

export interface TemporalHistorySelection {
  entries: Array<{ receipt: TemporalReceipt; values: TemporalValue[] }>;
  incomplete: boolean;
  hasMore?: boolean;
}
export interface TemporalHistoryQuery {
  from?: number;
  through?: number;
  subject?: string;
  subjects?: readonly string[];
  physicalLife?: number;
  epoch?: string;
  before?: { epoch: string; ordinal: number; at: number; order: number };
  limit?: number;
  bytes?: number;
}
/** Cold callers supply only already actor-scoped selected chunks and their exact blocks. */
export function selectTemporalHistory(
  temporal: TemporalEvidenceState | undefined,
  actorId: string,
  query: TemporalHistoryQuery = {},
): TemporalHistorySelection {
  const actor = temporal?.actors[actorId];
  if (!temporal || !actor) return { entries: [], incomplete: true };
  const limit = query.limit ?? 128,
    maxBytes = query.bytes ?? 8192;
  const entries: TemporalHistorySelection['entries'] = [];
  let bytes = 0,
    hasMore = false,
    incomplete =
      actor.releasedThrough !== undefined &&
      (query.from === undefined || query.from <= actor.releasedThrough);
  const subjects = query.subjects ?? (query.subject ? [query.subject] : []);
  const receipts = actor.chunks
    .flatMap((chunk) => (chunk.actorId === actorId ? chunk.receipts : []))
    .filter(
      (receipt) =>
        receipt.actorId === actorId &&
        (query.from === undefined || receipt.at >= query.from) &&
        (query.through === undefined || receipt.at <= query.through) &&
        (!subjects.length || subjects.includes(receipt.subject)) &&
        (query.physicalLife === undefined || query.physicalLife === receipt.physicalLife) &&
        (query.epoch === undefined || query.epoch === receipt.epoch) &&
        (!query.before ||
          receipt.at < query.before.at ||
          (receipt.at === query.before.at &&
            (receipt.order < query.before.order ||
              (receipt.order === query.before.order &&
                (receipt.epoch < query.before.epoch ||
                  (receipt.epoch === query.before.epoch &&
                    receipt.ordinal < query.before.ordinal)))))),
    )
    .sort(
      (left, right) =>
        right.at - left.at ||
        right.order - left.order ||
        right.epoch.localeCompare(left.epoch) ||
        right.ordinal - left.ordinal,
    );
  for (const receipt of receipts) {
    const values: TemporalValue[] = [];
    for (const reference of receipt.facets) {
      const value = temporal.sources[reference.blockId]?.values[reference.valueOrdinal];
      if (!value) {
        incomplete = true;
        continue;
      }
      values.push(value);
    }
    const size = byteLength({ receipt, values });
    if (entries.length >= limit || bytes + size > maxBytes) {
      incomplete = true;
      hasMore = true;
      break;
    }
    if (values.length !== receipt.facets.length) continue;
    if (receipt.change === 'loss' || receipt.change === 'attention-exit') incomplete = true;
    bytes += size;
    entries.push({ receipt: cloneValue(receipt), values: cloneValue(values) });
  }
  return { entries: entries.reverse(), incomplete: incomplete || entries.length === 0, hasMore };
}

/** Revocation removes this actor's access; a shared body may remain owned by other witnesses. */
export function invalidateTemporalEvidence(
  world: WorldState,
  actorId: string,
  sourceIds: ReadonlySet<string>,
): void {
  const actor = world.experience?.temporal?.actors[actorId];
  if (!actor) return;
  for (const [id, support] of Object.entries(actor.supports ?? {}))
    if (sourceIds.has(id) || support.receipt.sourceIds.some((source) => sourceIds.has(source)))
      releaseTemporalSupport(world, actorId, id);
  for (const chunk of actor.chunks) {
    const removed = chunk.receipts.filter(
      (receipt) =>
        sourceIds.has(receipt.id) ||
        receipt.sourceIds.some((id) => sourceIds.has(id)) ||
        receipt.facets.some((facet) => facet.original && sourceIds.has(facet.original.source.id)),
    );
    if (!removed.length) continue;
    actor.releasedThrough = Math.max(
      actor.releasedThrough ?? 0,
      ...removed.map((receipt) => receipt.at),
    );
    const deleted = new Set(removed.map((receipt) => receipt.ordinal));
    chunk.receipts = chunk.receipts.filter((receipt) => !deleted.has(receipt.ordinal));
    actor.count -= removed.length;
    chunk.count = chunk.receipts.length;
    // Exact stored byte totals are recomputed only for touched resident chunks; cold rows use repository retirement.
    const previousBytes = chunk.bytes;
    refreshChunk(chunk, world.experience!.temporal!, world);
    actor.bytes -= previousBytes - chunk.bytes;
  }
  actor.chunks = actor.chunks.filter((chunk) => chunk.count > 0);
  actor.captures = {};
}

function refreshChunk(
  chunk: TemporalChunk,
  temporal: TemporalEvidenceState,
  world: WorldState,
): void {
  chunk.subjects = [...new Set(chunk.receipts.map((receipt) => receipt.subject))];
  chunk.sourceIds = [...new Set(chunk.receipts.flatMap((receipt) => receipt.sourceIds))];
  chunk.sourceIds = [
    ...new Set(
      chunk.receipts.flatMap((receipt) => temporalReceiptAliases(receipt, temporal.sources, world)),
    ),
  ];
  chunk.individualIds = [
    ...new Set(
      chunk.receipts.flatMap((receipt) => temporalReceiptIndividualIds(receipt, temporal.sources)),
    ),
  ];
  chunk.sourceRefs = [
    ...new Set(chunk.receipts.flatMap((receipt) => receipt.facets.map((facet) => facet.blockId))),
  ];
  chunk.count = chunk.receipts.length;
  if (chunk.receipts.length) {
    chunk.fromOrdinal = chunk.receipts[0]!.ordinal;
    chunk.throughOrdinal = chunk.receipts.at(-1)!.ordinal;
    chunk.fromAt = chunk.receipts[0]!.at;
    chunk.throughAt = chunk.receipts.at(-1)!.at;
  }
  const supportBytes = chunk.receipts.reduce(
    (sum, receipt) =>
      sum +
      receipt.facets.reduce((n, reference) => {
        const value = temporal.sources[reference.blockId]?.values[reference.valueOrdinal];
        if (!value) throw new Error('Temporal retirement requires its selected source blocks.');
        return n + byteLength(value);
      }, 0),
    0,
  );
  for (let attempt = 0; attempt < 4; attempt++) {
    const bytes = byteLength(chunk) + supportBytes;
    if (bytes === chunk.bytes) break;
    chunk.bytes = bytes;
  }
}

/** Remove a revoked interpretation while preserving independent direct words and measurements. */
export function invalidateTemporalFacets(
  world: WorldState,
  actorId: string,
  revoked: (value: TemporalValue, reference: TemporalFacetReference) => boolean,
): void {
  const temporal = world.experience?.temporal;
  const actor = temporal?.actors[actorId];
  if (!temporal || !actor) return;
  for (const chunk of actor.chunks) {
    const previousBytes = chunk.bytes,
      previousCount = chunk.count;
    let changed = false;
    for (const receipt of chunk.receipts) {
      const facets = receipt.facets.filter((reference) => {
        const value = temporal.sources[reference.blockId]?.values[reference.valueOrdinal];
        if (!value || !revoked(value, reference)) return true;
        changed = true;
        return false;
      });
      if (facets.length !== receipt.facets.length) {
        actor.releasedThrough = Math.max(actor.releasedThrough ?? 0, receipt.at);
        receipt.facets = facets;
      }
    }
    if (!changed) continue;
    chunk.receipts = chunk.receipts.filter((receipt) => receipt.facets.length > 0);
    refreshChunk(chunk, temporal, world);
    actor.bytes -= previousBytes - chunk.bytes;
    actor.count -= previousCount - chunk.count;
  }
  actor.chunks = actor.chunks.filter((chunk) => chunk.count > 0);
  actor.captures = {};
}

export function temporalSourceIds(receipt: TemporalReceipt): EvidenceSource[] {
  return receipt.facets.flatMap((facet) => (facet.original ? [facet.original.source] : []));
}

export function temporalReceiptAliases(
  receipt: TemporalReceipt,
  sources: TemporalEvidenceState['sources'],
  world: WorldState,
): string[] {
  const aliases = new Set([...receipt.sourceIds, receipt.id]);
  const fact = (key: ObservationFactKey) => {
    aliases.add(key.source.id);
    aliases.add(personalFactAlias(key.source.id, key.ordinal));
  };
  for (const reference of receipt.facets) {
    aliases.add(personalFactAlias(receipt.id, reference.ordinal));
    if (reference.original) fact(reference.original);
    if (reference.receivedFrom) aliases.add(reference.receivedFrom.id);
    const value = sources[reference.blockId]?.values[reference.valueOrdinal];
    if (value?.kind === 'association')
      for (const id of selectedRecognitionSupportSourceIds(world, value.learningSupport ?? []))
        aliases.add(id);
    if (value?.kind === 'claim') {
      for (const key of value.support) fact(key);
      for (const alias of value.supportAliases ?? []) aliases.add(alias.id);
    }
    if (value?.kind === 'received-motion')
      for (const sample of [value.earlier, value.later]) {
        fact(sample.original);
        aliases.add(sample.confirmation.id);
      }
    if (value?.kind === 'physical-boundary') {
      for (const key of [value.boundary.nearSurface?.support, value.boundary.farSurface?.support])
        if (key) fact(key);
    }
  }
  return [...aliases];
}

export function temporalReceiptIndividualIds(
  receipt: TemporalReceipt,
  sources: TemporalEvidenceState['sources'],
): string[] {
  const ids = new Set<string>();
  if (receipt.subjectIdentity?.kind === 'individual') ids.add(receipt.subjectIdentity.individualId);
  for (const reference of receipt.facets) {
    const value = sources[reference.blockId]?.values[reference.valueOrdinal];
    if (value?.kind === 'association' && value.subject.kind === 'individual')
      ids.add(value.subject.individualId);
  }
  return [...ids];
}

export function temporalReceiptForSource(
  world: WorldState,
  actorId: string,
  sourceId: string,
): TemporalReceiptLocator | undefined {
  const chunks = world.experience?.temporal?.actors[actorId]?.chunks ?? [];
  for (let index = chunks.length - 1; index >= 0; index--)
    for (const receipt of chunks[index]!.receipts)
      if (receipt.sourceIds.includes(sourceId))
        return {
          actorId,
          physicalLife: receipt.physicalLife,
          epoch: receipt.epoch,
          ordinal: receipt.ordinal,
        };
  return undefined;
}

/** The same source overlay fences hot and cold exact facts after correction. */
export function temporalFacetEligible(
  world: WorldState,
  actorId: string,
  reference: TemporalFacetReference,
  value: TemporalValue,
): boolean {
  const forgotten = world.experience?.forgotten[actorId] ?? [];
  const corrections = world.experience?.corrections?.[actorId] ?? {};
  const allowed = (id: string) => !forgotten.includes(id) && !Object.hasOwn(corrections, id);
  const factAllowed = (fact: ObservationFactKey) =>
    fact.source.observer.actorId === actorId &&
    allowed(fact.source.id) &&
    allowed(personalFactAlias(fact.source.id, fact.ordinal));
  if (
    (reference.original && !factAllowed(reference.original)) ||
    (reference.receivedFrom &&
      (reference.receivedFrom.observer.actorId !== actorId || !allowed(reference.receivedFrom.id)))
  )
    return false;
  if (value.kind === 'association')
    return selectedRecognitionSupportSourceIds(world, value.learningSupport ?? []).every(allowed);
  if (value.kind === 'claim')
    return (
      value.support.every(factAllowed) &&
      (value.supportAliases ?? []).every((alias) => allowed(alias.id))
    );
  if (value.kind === 'received-motion')
    return [value.earlier, value.later].every(
      (sample) =>
        factAllowed(sample.original) &&
        sample.confirmation.observer.actorId === actorId &&
        allowed(sample.confirmation.id),
    );
  if (value.kind === 'confirmation') {
    const snapshot = value.snapshot;
    return temporalFacetEligible(
      world,
      actorId,
      {
        ...reference,
        original: {
          source: {
            family: 'native-exposure',
            observer: snapshot.observer,
            id: snapshot.original.id,
            revision: snapshot.original.revision,
          },
          ordinal: snapshot.originalOrdinal,
        },
        receivedFrom: snapshot.confirmation,
      },
      temporalValue(snapshot.value),
    );
  }
  return true;
}

/** Resolve an already owned receipt. Cold callers supply their separately scoped
 * captured body at the server admission boundary instead of expanding all history. */
export function retainedTemporalReceipt(
  world: WorldState,
  locator: TemporalReceiptLocator,
): { receipt: TemporalReceipt; values: TemporalValue[] } | undefined {
  const temporal = world.experience?.temporal;
  const actor = temporal?.actors[locator.actorId];
  if (!temporal || !actor) return;
  const matches = (receipt: TemporalReceipt) =>
    receipt.actorId === locator.actorId &&
    receipt.physicalLife === locator.physicalLife &&
    receipt.epoch === locator.epoch &&
    receipt.ordinal === locator.ordinal;
  const support = actor.supports?.[temporalReceiptId(locator)];
  const receipt = actor.chunks.flatMap((chunk) => chunk.receipts).find(matches);
  if (!receipt)
    return support && matches(support.receipt)
      ? { receipt: cloneValue(support.receipt), values: cloneValue(support.values) }
      : undefined;
  const values = receipt.facets.map(
    (reference) => temporal.sources[reference.blockId]?.values[reference.valueOrdinal],
  );
  if (values.some((value) => !value)) return;
  return { receipt: cloneValue(receipt), values: cloneValue(values as TemporalValue[]) };
}

export function temporalReceiptSource(receipt: TemporalReceipt): EvidenceSource {
  return {
    family: 'native-exposure',
    id: receipt.id,
    revision: 1,
    observer: { actorId: receipt.actorId, physicalLife: receipt.physicalLife },
  };
}
export function isTemporalReceiptSource(source: EvidenceSource): boolean {
  return (
    source.family === 'native-exposure' &&
    source.revision === 1 &&
    /^temporal-receipt-.+-receipt-epoch-\d+-\d+$/u.test(source.id)
  );
}

export function retainTemporalSupport(
  world: WorldState,
  locator: TemporalReceiptLocator,
  options: {
    facetOrdinals?: readonly number[];
    required?: boolean;
    maxBytes: number;
    maxRecords: number;
  },
): TemporalSupportCapsule | undefined {
  const temporal = world.experience?.temporal;
  const actor = temporal?.actors[locator.actorId];
  if (!temporal || !actor) return;
  const id = temporalReceiptId(locator);
  const prior = actor.supports?.[id];
  if (
    prior &&
    options.facetOrdinals?.every((ordinal) =>
      prior.receipt.facets.some((facet) => facet.ordinal === ordinal),
    )
  ) {
    if (
      options.required &&
      !prior.required &&
      !setTemporalSupportRequired(world, locator.actorId, id, true, options)
    )
      return;
    return actor.supports![id];
  }
  const receipt = actor.chunks
    .flatMap((chunk) => chunk.receipts)
    .find(
      (candidate) =>
        candidate.actorId === locator.actorId &&
        candidate.physicalLife === locator.physicalLife &&
        candidate.epoch === locator.epoch &&
        candidate.ordinal === locator.ordinal,
    );
  if (!receipt) return;
  const selected =
    options.facetOrdinals &&
    new Set([
      ...options.facetOrdinals,
      ...(prior?.receipt.facets.map((facet) => facet.ordinal) ?? []),
    ]);
  if (
    options.facetOrdinals?.some(
      (ordinal) => !receipt.facets.some((facet) => facet.ordinal === ordinal),
    )
  )
    return;
  const facets = receipt.facets.filter((facet) => !selected || selected.has(facet.ordinal));
  if (!facets.length) return;
  const values: TemporalValue[] = [];
  for (const reference of facets) {
    const value = temporal.sources[reference.blockId]?.values[reference.valueOrdinal];
    if (!value) return;
    values.push(cloneValue(readOnlyDraftView(value)));
  }
  const capsule: TemporalSupportCapsule = {
    receipt: {
      ...cloneValue(receipt),
      facets: cloneValue(facets),
      sourceIds: [
        ...new Set([
          ...receipt.sourceIds.filter(
            (id) => !receipt.facets.some((facet) => facet.original?.source.id === id),
          ),
          ...facets.flatMap((facet) => [
            personalFactAlias(receipt.id, facet.ordinal),
            ...(facet.original
              ? [
                  facet.original.source.id,
                  personalFactAlias(facet.original.source.id, facet.original.ordinal),
                ]
              : []),
          ]),
        ]),
      ],
    },
    values,
    bytes: 0,
    required: prior?.required === true || options.required === true,
  };
  initialBytes(capsule);
  ensureExperienceAccounting(world, locator.actorId);
  const account = actor.accounts?.[capsule.required ? 'required' : 'optional'];
  const previousAccount = prior && actor.accounts?.[prior.required ? 'required' : 'optional'];
  const oldBytes = previousAccount === account ? (prior?.bytes ?? 0) : 0;
  const oldCount = previousAccount === account && prior ? 1 : 0;
  if (
    !account ||
    account.count + 1 - oldCount > options.maxRecords ||
    account.bytes + capsule.bytes - oldBytes > options.maxBytes
  )
    return;
  if (prior && previousAccount) {
    previousAccount.bytes -= prior.bytes;
    previousAccount.count--;
  }
  (actor.supports ??= {})[id] = capsule;
  account.bytes += capsule.bytes;
  account.count++;
  chargeWork({ effects: 1, outputBytes: Math.max(0, capsule.bytes - (prior?.bytes ?? 0)) });
  return capsule;
}

export function releaseTemporalSupport(
  world: WorldState,
  actorId: string,
  receiptId: string,
): void {
  const actor = world.experience?.temporal?.actors[actorId];
  const capsule = actor?.supports?.[receiptId];
  if (!actor || !capsule) return;
  ensureExperienceAccounting(world, actorId);
  const account = actor.accounts![capsule.required ? 'required' : 'optional'];
  if (account.bytes < capsule.bytes || account.count < 1)
    throw new Error('Temporal support counters underflowed.');
  account.bytes -= capsule.bytes;
  account.count--;
  delete actor.supports![receiptId];
}

export function setTemporalSupportRequired(
  world: WorldState,
  actorId: string,
  receiptId: string,
  required: boolean,
  limits: { maxBytes: number; maxRecords: number },
): boolean {
  const actor = world.experience?.temporal?.actors[actorId];
  const capsule = actor?.supports?.[receiptId];
  if (!actor || !capsule) return false;
  if (capsule.required === required) return true;
  ensureExperienceAccounting(world, actorId);
  const before = actor.accounts![capsule.required ? 'required' : 'optional'];
  const after = actor.accounts![required ? 'required' : 'optional'];
  const replacement = { ...readOnlyDraftView(capsule), required };
  initialBytes(replacement);
  if (after.count >= limits.maxRecords || after.bytes + replacement.bytes > limits.maxBytes)
    return false;
  if (before.bytes < capsule.bytes || before.count < 1)
    throw new Error('Temporal support counters underflowed.');
  before.bytes -= capsule.bytes;
  before.count--;
  after.bytes += replacement.bytes;
  after.count++;
  actor.supports![receiptId] = replacement;
  return true;
}

export function retainedTemporalSupport(
  temporal: TemporalEvidenceState | undefined,
  actorId: string,
  source: EvidenceSource,
): TemporalSupportCapsule | undefined {
  if (
    source.observer.actorId !== actorId ||
    source.family !== 'native-exposure' ||
    source.revision !== 1
  )
    return;
  const capsule = temporal?.actors[actorId]?.supports?.[source.id];
  return capsule && capsule.receipt.physicalLife === source.observer.physicalLife
    ? capsule
    : undefined;
}
