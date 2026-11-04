import type { WorldState } from './types.js';
import type {
  EvidenceSource,
  ObservationFactKey,
  ObservationFrame,
} from './perception-evidence.js';
import type { ReceivedValueLookup } from './received-values.js';
import type {
  TemporalPage,
  TemporalReceipt,
  TemporalReceiptLocator,
  TemporalFacetReference,
  TemporalValue,
  TemporalFieldDependencies,
} from './temporal-evidence.js';
import {
  temporalFacetValueReferences,
  temporalReceiptAliases,
  temporalReceiptIndividualIds,
  temporalReceiptChangeCount,
  materializeTemporalValue,
  temporalReceiptId,
} from './temporal-evidence.js';
import { evidenceSourceWithIdentity } from './perception-values.js';
import { receivedValueAt } from './received-values.js';
import { immutableDataSnapshot, jsonByteLength } from './records.js';
import { appendSnapshot, readOnlyDraftView } from './draft.js';
import type { ObserverSubject } from './knowledge.js';

/** Logical members survive packing, expiry clipping and page replacement. */
export interface TemporalCheckMember {
  locator: TemporalReceiptLocator;
  memberOrdinal: number;
  original: ObservationFactKey;
  role: TemporalFacetReference['role'];
  part?: 'detail' | 'pose' | 'value';
  confirmationIdentity?: Omit<EvidenceSource, 'revision'>;
  revisionFloor?: number;
}
export interface TemporalCheckSeed {
  member: number;
  part?: 'detail' | 'pose' | 'value';
  receivedAt: number;
  order: number;
  support: NonNullable<TemporalFacetReference['support']>;
  measuredFrom: number;
  measuredThrough: number;
  acquiredAt: number;
  receivedFrom?: EvidenceSource;
  reception?: TemporalFacetReference['reception'];
  poseFrame?: ObservationFrame;
}
export interface TemporalCheckDeclaration {
  id: number;
  subject: string;
  members: readonly TemporalCheckMember[];
  seeds: readonly TemporalCheckSeed[];
}
export interface TemporalCheckStamp {
  declaration: number;
  confirmation: EvidenceSource;
  confirmedFrom: number;
  confirmedThrough: number;
  measurement?: {
    measuredFrom: number;
    measuredThrough: number;
    acquiredAt: number;
    receivedFrom: EvidenceSource;
  };
  frame?: ObservationFrame;
}
export type TemporalHistoryInput =
  | {
      ordinal: number;
      kind: 'span';
      receipt: TemporalReceipt;
      terminal: readonly TemporalCheckSeed[];
      closedAt: number;
      closedOrder: number;
      reason: TemporalReceipt['change'];
    }
  | { ordinal: number; kind: 'occurrence'; receipt: TemporalReceipt }
  | {
      ordinal: number;
      kind: 'check';
      at: number;
      order: number;
      acquisition: number;
      stamps: readonly TemporalCheckStamp[];
    };
export type TemporalHistoryOperation = TemporalHistoryInput & {
  charge: { bytes: number; count: number };
};
/** Checkpoints are selected read products, never saved rollover baselines. */
export interface TemporalCheckpointAvailability {
  reason: 'unavailable' | 'unchecked' | 'released';
  at: number;
  fields: number[];
}
export interface TemporalCheckpoint {
  pageId: string;
  actorId: string;
  physicalLife: number;
  epoch: string;
  ordinal: number;
  acquisition: number;
  at: number;
  order: number;
  subject: string;
  subjectIdentity?: ObserverSubject;
  sourceIds: [];
  facets: TemporalFacetReference[];
  availability?: TemporalCheckpointAvailability[];
}
export type TemporalWriteHeader = Omit<
  TemporalReceipt,
  'id' | 'actorId' | 'physicalLife' | 'epoch' | 'facets'
>;

/** A span appends when it closes; its receipt keeps the earlier opening order.
 * Received transitions are synchronous, so this allocation order cannot straddle
 * a published/durable world cut. */
export function temporalOperationAppendOrder(operation: TemporalHistoryOperation): number {
  return operation.kind === 'span'
    ? operation.closedOrder
    : operation.kind === 'check'
      ? operation.order
      : operation.receipt.order;
}
export function temporalPageOperations(page: TemporalPage): readonly TemporalHistoryOperation[] {
  return readOnlyDraftView(page.operations);
}
export function temporalPageReceipts(page: TemporalPage): TemporalReceipt[] {
  return temporalPageOperations(page).flatMap((op) => (op.kind === 'check' ? [] : [op.receipt]));
}
export function temporalPageReceipt(
  page: TemporalPage,
  ordinal: number,
): TemporalReceipt | undefined {
  for (const op of temporalPageOperations(page))
    if (op.kind !== 'check' && op.receipt.ordinal === ordinal) return op.receipt;
  return undefined;
}
export function temporalOperationHeader(
  page: TemporalPage,
  op: TemporalHistoryOperation,
): Omit<TemporalReceipt, 'facets'> {
  if (op.kind !== 'check') return op.receipt;
  return {
    actorId: page.actorId,
    physicalLife: page.physicalLife,
    epoch: page.epoch,
    id: temporalReceiptId({ epoch: page.epoch, ordinal: op.ordinal }),
    ordinal: op.ordinal,
    at: op.at,
    order: op.order,
    acquisition: op.acquisition,
    subject: JSON.stringify(['receiver', page.physicalLife]),
    change: 'receiver-frame',
    required: false,
    sourceIds: [],
    contextSubjects: [
      ...new Set(
        op.stamps
          .map((stamp) => page.declarations.find((d) => d.id === stamp.declaration)?.subject)
          .filter((s): s is string => s !== undefined),
      ),
    ],
  };
}
export function temporalOperationFacet(
  _page: TemporalPage,
  op: Exclude<TemporalHistoryOperation, { kind: 'check' }>,
  position: number,
): TemporalFacetReference {
  return op.receipt.facets[position]!;
}
export function temporalReceiptValues(
  receipt: TemporalReceipt,
  sources: ReceivedValueLookup,
): TemporalValue[] {
  return receipt.facets.flatMap((field) => {
    const value = receivedValueAt(sources, field);
    const full = value && materializeTemporalValue(field, value, sources);
    return full ? [full] : [];
  });
}
function clockValueReferences(seed: TemporalCheckSeed): string[] {
  const pose = seed.reception?.kind === 'body' ? seed.reception.poseRef : undefined;
  return typeof pose === 'string' ? [pose] : [];
}
export function temporalPageReferences(page: TemporalPage): ReadonlySet<string> {
  const references = new Set<string>();
  for (const operation of temporalPageOperations(page)) {
    if (operation.kind === 'check') continue;
    for (const field of operation.receipt.facets)
      for (const reference of temporalFacetValueReferences(field)) references.add(reference);
    // A closing span may carry a newer independently received pose proof than
    // its admitted baseline, so its terminal clock closure is also a real owner.
    if (operation.kind === 'span')
      for (const seed of operation.terminal)
        for (const reference of clockValueReferences(seed)) references.add(reference);
  }
  for (const declaration of page.declarations)
    for (const seed of declaration.seeds)
      for (const reference of clockValueReferences(seed)) references.add(reference);
  return references;
}

export interface TemporalPageMetadata {
  subjects: string[];
  sourceIds: string[];
  individualIds: string[];
  sourceRefs: string[];
  references: string[];
  members: string[];
  spanRanges: TemporalSpanRange[];
  occurrenceSourceIds: string[];
  occurrenceIndividualIds: string[];
  ordinals: number[];
  changes: number;
  firstAt?: number;
  lastAt?: number;
  firstOrder?: number;
  lastOrder?: number;
  firstMeasured?: number;
  lastSupported?: number;
  lastReceivedAt?: number;
  spatialContext: boolean;
}
export function temporalClockSourceIds(seed: TemporalCheckSeed): string[] {
  return [
    ...new Set([
      seed.support.original.source.id,
      seed.support.confirmation.id,
      ...(seed.support.aliases ?? []),
      ...(seed.receivedFrom ? [seed.receivedFrom.id] : []),
    ]),
  ];
}
export function temporalDeclarationSourceIds(declaration: TemporalCheckDeclaration): string[] {
  return [
    ...new Set([
      ...declaration.seeds.flatMap(temporalClockSourceIds),
      ...declaration.members.flatMap((member) => [
        member.original.source.id,
        ...(member.confirmationIdentity ? [member.confirmationIdentity.id] : []),
      ]),
    ]),
  ];
}
/** A closure bounds the recorded interval; it is not a fresh sensory receipt. */
export function temporalOperationLastReceivedAt(operation: TemporalHistoryOperation): number {
  if (operation.kind === 'check') return operation.at;
  let received = operation.receipt.at;
  if (operation.kind === 'span')
    for (const seed of operation.terminal) received = Math.max(received, seed.receivedAt);
  return received;
}
export function temporalPageLastReceivedAt(page: TemporalPage): number {
  let received = 0;
  for (const operation of temporalPageOperations(page))
    received = Math.max(received, temporalOperationLastReceivedAt(operation));
  return received;
}
export function temporalPageMetadata(
  page: TemporalPage,
  options: { sources?: ReceivedValueLookup; world: WorldState },
): TemporalPageMetadata {
  const sources = options.sources ?? {},
    ops = temporalPageOperations(page),
    receipts = temporalPageReceipts(page),
    refs = temporalPageReferences(page);
  const subjects = new Set<string>(),
    aliases = new Set<string>(),
    individuals = new Set<string>(),
    members = new Set<string>(),
    spanRanges: TemporalSpanRange[] = [];
  const declarations = new Map(
      page.declarations.map((declaration) => [declaration.id, declaration]),
    ),
    usedDeclarations = new Set<number>();
  let firstMeasured = Infinity,
    lastSupported = -Infinity,
    firstAt = Infinity,
    lastAt = -Infinity,
    firstOrder = Infinity,
    lastOrder = -Infinity,
    spatialContext = false;
  for (const op of ops) {
    const header = temporalOperationHeader(page, op);
    firstAt = Math.min(firstAt, header.at);
    lastAt = Math.max(lastAt, header.at, op.kind === 'span' ? op.closedAt : -Infinity);
    firstOrder = Math.min(firstOrder, header.order);
    lastOrder = Math.max(lastOrder, header.order);
    if (op.kind === 'check') {
      for (const stamp of op.stamps) {
        if (!declarations.has(stamp.declaration))
          throw new Error('Temporal check has no declaration.');
        usedDeclarations.add(stamp.declaration);
        aliases.add(stamp.confirmation.id);
        lastSupported = Math.max(lastSupported, stamp.confirmedThrough);
      }
      continue;
    }
    const receipt = op.receipt;
    subjects.add(receipt.subject);
    for (const subject of receipt.contextSubjects ?? []) subjects.add(subject);
    for (const alias of temporalReceiptAliases(receipt, sources, options.world)) aliases.add(alias);
    for (const id of temporalReceiptIndividualIds(receipt, sources)) individuals.add(id);
    spatialContext ||= receipt.spatialContext === true;
    for (const field of receipt.facets) {
      firstMeasured = Math.min(firstMeasured, field.measuredFrom);
      lastSupported = Math.max(lastSupported, field.confirmedThrough ?? field.measuredThrough);
      const member = temporalMemberKey(receipt, field.ordinal);
      members.add(member);
      if (op.kind === 'span')
        spanRanges.push({
          actorId: page.actorId,
          physicalLife: page.physicalLife,
          epoch: page.epoch,
          trackId:
            field.track ??
            JSON.stringify([receipt.subject, field.original?.ordinal ?? field.ordinal]),
          subject: receipt.subject,
          channel: field.original?.source.family ?? '',
          member,
          firstAt: receipt.at,
          lastAt: op.closedAt,
          firstOrder: receipt.order,
          lastOrder: op.closedOrder,
        });
    }
    if (op.kind === 'span')
      for (const seed of op.terminal) {
        for (const alias of temporalClockSourceIds(seed)) aliases.add(alias);
        lastSupported = Math.max(lastSupported, seed.support.confirmedThrough);
      }
  }
  // Membership/provenance discovery follows declarations once, not stamps × fields.
  for (const id of usedDeclarations) {
    const declaration = declarations.get(id)!;
    subjects.add(declaration.subject);
    for (const alias of temporalDeclarationSourceIds(declaration)) aliases.add(alias);
    for (const member of declaration.members)
      members.add(temporalMemberKey(member.locator, member.memberOrdinal));
  }
  const occurrence = receipts.filter((receipt) => receipt.change === 'occurrence');
  return {
    members: [...members],
    spanRanges: mergeSpanRanges(spanRanges),
    occurrenceSourceIds: [
      ...new Set(
        occurrence.flatMap((receipt) => temporalReceiptAliases(receipt, sources, options.world)),
      ),
    ],
    occurrenceIndividualIds: [
      ...new Set(occurrence.flatMap((receipt) => temporalReceiptIndividualIds(receipt, sources))),
    ],
    subjects: [...subjects],
    sourceIds: [...aliases],
    individualIds: [...individuals],
    sourceRefs: [...refs],
    references: [...refs],
    ordinals: receipts.map((receipt) => receipt.ordinal),
    changes: ops.reduce((sum, operation) => sum + operation.charge.count, 0),
    ...(Number.isFinite(firstAt) ? { firstAt, lastAt, firstOrder, lastOrder } : {}),
    lastReceivedAt: temporalPageLastReceivedAt(page),
    ...(Number.isFinite(firstMeasured) ? { firstMeasured } : {}),
    ...(Number.isFinite(lastSupported) ? { lastSupported } : {}),
    spatialContext,
  };
}
/** Sparse edits keep exact logical identities and remove only their check members. */
export function replaceTemporalPageReceipts(
  page: TemporalPage,
  receipts: readonly TemporalReceipt[],
  _world?: WorldState,
): void {
  const selected = new Map(receipts.map((receipt) => [receipt.ordinal, receipt]));
  const removed = new Set<string>();
  for (const receipt of temporalPageReceipts(page))
    for (const field of receipt.facets)
      if (!selected.get(receipt.ordinal)?.facets.some((next) => next.ordinal === field.ordinal))
        removed.add(temporalMemberKey(receipt, field.ordinal));
  page.operations = temporalPageOperations(page).flatMap<TemporalHistoryOperation>((op) => {
    if (op.kind === 'check') return [op];
    const receipt = selected.get(op.receipt.ordinal);
    return receipt ? [{ ...op, receipt }] : [];
  });
  if (removed.size) {
    page.declarations = page.declarations
      .map((declaration) => {
        const retained = declaration.members.flatMap((member, index) =>
          removed.has(temporalMemberKey(member.locator, member.memberOrdinal))
            ? []
            : [{ member, index }],
        );
        return {
          ...declaration,
          members: retained.map((item) => item.member),
          seeds: retained.flatMap((item, member) => {
            const seed = declaration.seeds.find((seed) => seed.member === item.index);
            return seed ? [{ ...seed, member }] : [];
          }),
        };
      })
      .filter((declaration) => declaration.members.length);
    const ids = new Set(page.declarations.map((declaration) => declaration.id));
    page.operations = page.operations.flatMap<TemporalHistoryOperation>((op) => {
      if (op.kind !== 'check') return [op];
      const stamps = op.stamps.filter((stamp) => ids.has(stamp.declaration));
      return stamps.length ? [{ ...op, stamps }] : [];
    });
  }
  page.operations = page.operations.map((operation) => ({
    ...operation,
    charge: {
      bytes: temporalOperationLogicalBytes(operation, _world?.receivedValues?.sources ?? {}),
      count: temporalOperationLogicalCount(operation, page.declarations),
    },
  }));
  markTemporalPageEdited(page);
}
export function appendTemporalPageOperation(
  page: TemporalPage,
  operation: TemporalHistoryOperation,
  world: WorldState,
): void {
  const held = readOnlyDraftView(page.operations),
    next = immutableDataSnapshot(operation, readOnlyDraftView);
  page.operations = appendSnapshot(held, [next], world) ?? [...held, next];
}

export interface TemporalSpanRange {
  actorId: string;
  physicalLife: number;
  epoch: string;
  trackId: string;
  subject: string;
  channel: string;
  member: string;
  firstAt: number;
  lastAt: number;
  firstOrder: number;
  lastOrder: number;
}
export function temporalMemberKey(locator: TemporalReceiptLocator, memberOrdinal: number): string {
  return JSON.stringify([
    locator.actorId,
    locator.physicalLife,
    locator.epoch,
    locator.ordinal,
    memberOrdinal,
  ]);
}
const temporalSelections = new WeakMap<
  readonly TemporalHistoryOperation[],
  { source: TemporalPage; declarations: TemporalPage['declarations'] }
>();
/** Only this semantic selection owner can certify regrouped declarations and
 * predecessor seeds. The caller must still verify exact ordered operations. */
export function temporalPageSelectionSource(page: TemporalPage): TemporalPage | undefined {
  const proof = temporalSelections.get(page.operations);
  return proof?.declarations === page.declarations ? proof.source : undefined;
}
/** A physical suffix borrows only declarations it actually uses. Its seeds are
 * advanced through preceding native checks, never through a newer current view. */
export function temporalPageSelection(
  page: TemporalPage,
  operations: readonly TemporalHistoryOperation[],
  id: string = page.id,
): TemporalPage {
  const first = operations[0];
  if (!first) throw new Error('An empty temporal page has no saved meaning.');
  const ids = new Set(
    operations.flatMap((op) =>
      op.kind === 'check' ? op.stamps.map((stamp) => stamp.declaration) : [],
    ),
  );
  type Prior = {
    support?: {
      op: Extract<TemporalHistoryOperation, { kind: 'check' }>;
      stamp: TemporalCheckStamp;
    };
    measurement?: {
      op: Extract<TemporalHistoryOperation, { kind: 'check' }>;
      stamp: TemporalCheckStamp;
    };
    frame?: { op: Extract<TemporalHistoryOperation, { kind: 'check' }>; stamp: TemporalCheckStamp };
  };
  const predecessors = new Map<number, Prior>();
  // One compact header pass, independent of declaration/member cardinality.
  for (const op of temporalPageOperations(page)) {
    if (op.ordinal >= first.ordinal) break;
    if (op.kind !== 'check') continue;
    for (const stamp of op.stamps) {
      if (!ids.has(stamp.declaration)) continue;
      const prior = predecessors.get(stamp.declaration) ?? {};
      prior.support = { op, stamp };
      if (stamp.measurement) prior.measurement = { op, stamp };
      if (stamp.frame) prior.frame = { op, stamp };
      predecessors.set(stamp.declaration, prior);
    }
  }
  const declarations = page.declarations
    .filter((d) => ids.has(d.id))
    .map((declaration) => {
      const prior = predecessors.get(declaration.id);
      const seeds = declaration.seeds.map((seed) => {
        const member = declaration.members[seed.member];
        if (!member) throw new Error('Temporal seed has no member.');
        let next = seed;
        if (prior?.measurement) {
          const { op, stamp } = prior.measurement;
          next = temporalAdvanceSeed(next, member, stamp, op.at, op.order);
        }
        if (prior?.frame) {
          const { op, stamp } = prior.frame,
            { measurement: _measurement, ...frameStamp } = stamp;
          next = temporalAdvanceSeed(next, member, frameStamp, op.at, op.order);
        }
        if (prior?.support) {
          const { op, stamp } = prior.support,
            { measurement: _measurement, frame: _frame, ...supportStamp } = stamp;
          next = temporalAdvanceSeed(next, member, supportStamp, op.at, op.order);
        }
        return next;
      });
      return { ...declaration, seeds };
    });
  // A read-only cut keeps conservative candidate directories. Consumers inspect
  // only selected operations; canonical encoding always rebuilds directories with the world.
  const selected = {
    ...page,
    id,
    operations: immutableDataSnapshot([...operations]),
    declarations: immutableDataSnapshot(declarations),
    fromOrdinal: operations[0]!.ordinal,
    throughOrdinal: operations.at(-1)!.ordinal,
    count: operations.reduce((sum, op) => sum + op.charge.count, 0),
    bytes: operations.reduce((sum, op) => sum + op.charge.bytes, 0),
  };
  temporalSelections.set(selected.operations, {
    source: page,
    declarations: selected.declarations,
  });
  return selected;
}
export function selectTemporalPageOperations(
  page: TemporalPage,
  operations: readonly TemporalHistoryOperation[],
  id: string,
  world: WorldState,
): TemporalPage {
  const selected = temporalPageSelection(page, operations, id),
    metadata = temporalPageMetadata(selected, {
      world,
      sources: world.receivedValues?.sources ?? {},
    });
  return {
    ...selected,
    fromAt: metadata.firstAt!,
    throughAt: metadata.lastAt!,
    subjects: metadata.subjects,
    sourceIds: metadata.sourceIds,
    individualIds: metadata.individualIds,
    sourceRefs: metadata.sourceRefs,
  };
}

function checkedConfirmation(
  member: TemporalCheckMember,
  stamp: TemporalCheckStamp,
): EvidenceSource {
  return evidenceSourceWithIdentity(
    stamp.confirmation,
    member.confirmationIdentity,
    member.revisionFloor,
  );
}
/** Advance a predecessor using the same proof, clock and frame rules as selected reads. */
export function temporalAdvanceSeed(
  seed: TemporalCheckSeed,
  member: TemporalCheckMember,
  stamp: TemporalCheckStamp,
  receivedAt: number,
  order: number,
): TemporalCheckSeed {
  return {
    ...seed,
    part: member.part ?? seed.part,
    receivedAt,
    order,
    support: {
      original: member.original,
      confirmation: checkedConfirmation(member, stamp),
      confirmedFrom: stamp.confirmedFrom,
      confirmedThrough: stamp.confirmedThrough,
    },
    ...(stamp.measurement
      ? {
          measuredFrom: stamp.measurement.measuredFrom,
          measuredThrough: stamp.measurement.measuredThrough,
          acquiredAt: stamp.measurement.acquiredAt,
          receivedFrom: evidenceSourceWithIdentity(
            stamp.measurement.receivedFrom,
            member.confirmationIdentity,
          ),
        }
      : {}),
    ...(stamp.frame && seed.reception?.kind === 'location'
      ? { reception: { kind: 'location' as const, frame: stamp.frame } }
      : {}),
    ...(stamp.frame && (member.part ?? seed.part) === 'pose' && seed.poseFrame
      ? { poseFrame: stamp.frame }
      : {}),
  };
}
/** One projection rule for native/cold reads and current-source revalidation. */
export function temporalCheckedFacet(
  base: TemporalFacetReference,
  member: TemporalCheckMember,
  seed: TemporalCheckSeed | undefined,
  stamp: TemporalCheckStamp,
): TemporalFacetReference {
  const prior = seed ? temporalSeedFacet(base, { ...seed, part: member.part ?? seed.part }) : base,
    support = {
      original: member.original,
      confirmation: checkedConfirmation(member, stamp),
      confirmedFrom: stamp.confirmedFrom,
      confirmedThrough: stamp.confirmedThrough,
    };
  if (member.part === 'detail' && prior.detailSupport) {
    return {
      ...prior,
      detailSupport: {
        ...prior.detailSupport,
        proof: support,
        ...(stamp.measurement
          ? {
              from: stamp.measurement.measuredFrom,
              through: stamp.measurement.measuredThrough,
              acquiredAt: stamp.measurement.acquiredAt,
            }
          : {}),
      },
    };
  }
  return {
    ...prior,
    confirmedThrough: stamp.confirmedThrough,
    support,
    ...(stamp.measurement
      ? {
          measuredFrom: stamp.measurement.measuredFrom,
          measuredThrough: stamp.measurement.measuredThrough,
          asOf: stamp.measurement.measuredThrough,
          acquiredAt: stamp.measurement.acquiredAt,
          receivedFrom: evidenceSourceWithIdentity(
            stamp.measurement.receivedFrom,
            member.confirmationIdentity,
          ),
        }
      : {}),
    ...(stamp.frame && prior.reception?.kind === 'location'
      ? { reception: { kind: 'location' as const, frame: stamp.frame } }
      : {}),
    ...(stamp.frame && member.part === 'pose' && prior.poseFrame ? { poseFrame: stamp.frame } : {}),
  };
}

function mergeSpanRanges(ranges: readonly TemporalSpanRange[]): TemporalSpanRange[] {
  const groups = new Map<string, TemporalSpanRange>();
  for (const range of ranges) {
    const prior = groups.get(range.trackId);
    if (!prior) groups.set(range.trackId, { ...range });
    else {
      prior.firstAt = Math.min(prior.firstAt, range.firstAt);
      prior.lastAt = Math.max(prior.lastAt, range.lastAt);
      prior.firstOrder = Math.min(prior.firstOrder, range.firstOrder);
      prior.lastOrder = Math.max(prior.lastOrder, range.lastOrder);
    }
  }
  return [...groups.values()];
}
const editedPages = new WeakSet<object>();
export function temporalPageMutation(page: TemporalPage): 'append' | 'edit' {
  return editedPages.has(readOnlyDraftView(page.operations)) ? 'edit' : 'append';
}
export function markTemporalPageEdited(page: TemporalPage): void {
  page.operations = immutableDataSnapshot(page.operations, readOnlyDraftView);
  editedPages.add(readOnlyDraftView(page.operations));
}

export function temporalSeedFacet(
  base: TemporalFacetReference,
  seed: TemporalCheckSeed,
): TemporalFacetReference {
  if (seed.part === 'detail' && base.detailSupport)
    return {
      ...base,
      detailSupport: {
        ...base.detailSupport,
        proof: seed.support,
        from: seed.measuredFrom,
        through: seed.measuredThrough,
        acquiredAt: seed.acquiredAt,
      },
    };
  return {
    ...base,
    measuredFrom: seed.measuredFrom,
    measuredThrough: seed.measuredThrough,
    asOf: seed.measuredThrough,
    acquiredAt: seed.acquiredAt,
    receivedFrom: seed.receivedFrom,
    support: seed.support,
    confirmedThrough: seed.support.confirmedThrough,
    ...(seed.reception && base.reception?.kind === 'location' ? { reception: seed.reception } : {}),
    ...(seed.poseFrame ? { poseFrame: seed.poseFrame } : {}),
  };
}

export function temporalOperationLogicalCount(
  operation: TemporalHistoryInput,
  declarations: readonly TemporalCheckDeclaration[],
): number {
  if (operation.kind !== 'check') return temporalReceiptChangeCount(operation.receipt);
  let count = 0;
  for (const stamp of operation.stamps) {
    const declaration = declarations.find((d) => d.id === stamp.declaration);
    if (!declaration) throw new Error('An exact check has no declaration.');
    count += new Set(
      declaration.members.map((member) =>
        JSON.stringify([member.locator.epoch, member.locator.ordinal, member.memberOrdinal]),
      ),
    ).size;
  }
  return count;
}

export function temporalOperationLogicalBytes(
  operation: TemporalHistoryInput | TemporalHistoryOperation,
  sources: ReceivedValueLookup,
): number {
  const { charge: _charge, ...input } = operation as TemporalHistoryOperation;
  if (input.kind === 'check') return jsonByteLength(input);
  let bytes = jsonByteLength(input);
  for (const reference of new Set(input.receipt.facets.flatMap(temporalFacetValueReferences))) {
    const value = receivedValueAt(sources, reference);
    if (!value) throw new Error('A received interval has no owned value.');
    bytes += jsonByteLength(value);
  }
  return bytes;
}
