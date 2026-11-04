import { temporalPageRecordId, decodeTemporalPagePayload } from './temporal-page-storage.js';
import {
  canonicalJson,
  materializeTemporalValue,
  temporalReceiptForRead,
  selectReceivedReceiptMembers,
  selectReceivedState,
  receivedPositionEligible,
  receivedStateEligible,
  receivedValueAt,
  temporalFacetEligible,
  temporalRecentAt,
  type ReceivedAddress,
  type ReceivedFrontier,
  type TemporalPage,
  type TemporalHistorySelection,
  type TemporalSupportCapsule,
  type TemporalReceipt,
} from '@open-legend/domain';
import type { RecordChanges } from './world-records.js';
import type { TemporalHistoryReadContext } from './temporal-storage.js';

type Selection = TemporalHistorySelection['entries'][number];
export interface TemporalRowWitness {
  eligibility?: true;
  header?: ReadonlyMap<string, string>;
  selections?: Map<string, Selection>;
  supports?: Map<string, Selection>;
  states?: Map<string, TemporalStateWitness>;
}
export interface TemporalStateWitness {
  carrier: ReceivedAddress;
  binding: number;
  subject: string;
  asOf: number;
  selection: Selection;
}
interface PendingRow {
  table: string;
  id: string;
  payload?: string;
}
/** Request-owned proof only. The repository's existing canonical-source registry
 * owns its lifetime; this contains no world, scheduler or persistent authority. */
export interface TemporalSourceWatch {
  rows: Map<string, Map<string, TemporalRowWitness>>;
  ancestors: Set<string>;
  pending: PendingRow[];
  nativePending: Array<
    NonNullable<RecordChanges['temporal']> extends Map<string, infer T> ? T : never
  >;
  pendingBytes: number;
  collecting: boolean;
  deadline: number;
  clock?: () => number;
  currentState?: () => boolean;
}
export const newTemporalSourceWatch = (): TemporalSourceWatch => ({
  rows: new Map(),
  ancestors: new Set(),
  pending: [],
  nativePending: [],
  pendingBytes: 0,
  collecting: false,
  deadline: Infinity,
});

export function sameSupportedSelection(
  support: TemporalSupportCapsule,
  expected: Selection,
): boolean {
  const current = temporalReceiptForRead(support.receipt);
  const { facets, sourceIds: _aliases, ...header } = current;
  const { facets: selected, sourceIds: _selectedAliases, ...selectedHeader } = expected.receipt;
  return (
    canonicalJson(header) === canonicalJson(selectedHeader) &&
    selected.every((facet, index) => {
      const position = facets.findIndex((owned) => canonicalJson(owned) === canonicalJson(facet));
      if (position < 0) return false;
      const value = materializeTemporalValue(
        support.receipt.facets[position]!,
        support.values[position]!,
        {},
      );
      return value !== undefined && canonicalJson(value) === canonicalJson(expected.values[index]);
    })
  );
}
/** Current knowledge owns its seed independently of aged raw history. It still
 * proves the exact selected state, pressure boundary and requested historical cut. */
export function currentTemporalStateMatches(
  context: TemporalHistoryReadContext,
  state: TemporalStateWitness,
): boolean {
  if (
    !receivedStateEligible(state.carrier, state.asOf, context.frontier) ||
    !temporalRecentAt(state.asOf, context.at, context.maxAgeSeconds)
  )
    return false;
  return context.currentSeeds.some(
    (seed) =>
      seed.binding === state.binding &&
      seed.receipt.subject === state.subject &&
      seed.receipt.actorId === state.carrier.actorId &&
      seed.receipt.physicalLife === state.carrier.physicalLife &&
      seed.receipt.epoch === state.carrier.epoch &&
      seed.receipt.at <= state.asOf &&
      stateReceiptMatches(context, state, seed.receipt),
  );
}
function stateReceiptMatches(
  context: TemporalHistoryReadContext,
  state: TemporalStateWitness,
  receipt: TemporalReceipt,
): boolean {
  return state.selection.receipt.facets.every((expected, index) => {
    const facet = receipt.facets.find(
      (facet) =>
        facet.memberIndex === expected.memberIndex &&
        canonicalJson(temporalReceiptForRead({ ...receipt, facets: [facet] }).facets[0]) ===
          canonicalJson(expected),
    );
    if (!facet) return false;
    const fragment = receivedValueAt(context.sources, facet),
      value = fragment && materializeTemporalValue(facet, fragment, context.sources);
    return (
      !!value &&
      canonicalJson(value) === canonicalJson(state.selection.values[index]) &&
      temporalFacetEligible(context.disclosure, context.actorId, facet, value)
    );
  });
}
/** The next reception freezes the previous current seed. Follow that exact
 * proof into the existing logical watch instead of cancelling a pending answer
 * merely because an unchanged check advanced the live confirmation clock. */
export function findTemporalStateCarrier(
  context: TemporalHistoryReadContext,
  state: TemporalStateWitness,
  contains: (address: ReceivedAddress, memberIndex: number) => boolean,
): { page: TemporalPage; state: TemporalStateWitness } | undefined {
  if (
    !receivedStateEligible(state.carrier, state.asOf, context.frontier) ||
    !temporalRecentAt(state.asOf, context.at, context.maxAgeSeconds)
  )
    return;
  const members = new Set(state.selection.receipt.facets.map((facet) => facet.memberIndex));
  for (const page of context.pages) {
    if (
      page.actorId !== state.carrier.actorId ||
      page.physicalLife !== state.carrier.physicalLife ||
      page.epoch !== state.carrier.epoch
    )
      continue;
    for (const batch of page.batches) {
      if (
        !batch.bindings.some(
          (binding) => binding.id === state.binding && binding.subject === state.subject,
        )
      )
        continue;
      for (const entry of batch.entries) {
        if (entry.receivedAt <= state.asOf) continue;
        for (const coverage of entry.coverage) {
          if (coverage.binding !== state.binding) continue;
          for (const member of coverage.members) {
            const carrier = {
              actorId: batch.actorId,
              physicalLife: batch.physicalLife,
              epoch: batch.epoch,
              batchOrder: batch.batchOrder,
              entryIndex: entry.entryIndex,
              memberIndex: member.memberIndex,
            };
            if (
              !contains(carrier, carrier.memberIndex) ||
              !receivedPositionEligible(carrier, entry.receivedAt, context.frontier)
            )
              continue;
            const selected = selectReceivedState(page, carrier, {
              binding: state.binding,
              subject: state.subject,
              asOf: state.asOf,
              members,
            });
            if (selected && stateReceiptMatches(context, state, selected.receipt))
              return { page, state: { ...state, carrier } };
          }
        }
      }
    }
  }
}
function rowMatches(
  witness: TemporalRowWitness,
  payload: string,
  rows: TemporalSourceWatch['rows'],
): boolean {
  try {
    const row = JSON.parse(payload) as Record<string, unknown>;
    if (witness.eligibility) {
      const frontier = row['frontier'] as ReceivedFrontier | undefined;
      for (const logical of rows.get('temporal_logical')?.values() ?? []) {
        for (const selected of logical.selections?.values() ?? [])
          if (
            selected.receipt.facets.some(
              (facet) =>
                !receivedPositionEligible(
                  { ...selected.receipt, memberIndex: facet.memberIndex },
                  selected.receipt.at,
                  frontier,
                ),
            )
          )
            return false;
        for (const state of logical.states?.values() ?? [])
          if (!receivedStateEligible(state.carrier, state.asOf, frontier)) return false;
      }
    }
    if (
      witness.header &&
      [...witness.header].some(([field, value]) => canonicalJson(row[field]) !== value)
    )
      return false;
    if (
      witness.supports &&
      [...witness.supports.values()].some(
        (expected) => !sameSupportedSelection(row as unknown as TemporalSupportCapsule, expected),
      )
    )
      return false;
    return true;
  } catch {
    return false;
  }
}
/** Packing may choose a different first binding for a physical slice. Its
 * shared display defaults are not the causal identity of a selected fact. */
export function temporalSelectionHeader(receipt: Selection['receipt']): unknown {
  return [
    receipt.actorId,
    receipt.physicalLife,
    receipt.epoch,
    receipt.batchOrder,
    receipt.entryIndex,
    receipt.at,
    receipt.order,
    receipt.change,
    receipt.required,
    receipt.origin ?? null,
  ];
}
function logicalProjection(page: TemporalPage, expected: Selection): unknown[] {
  const actual = selectReceivedReceiptMembers(
    page,
    expected.receipt,
    new Set(expected.receipt.facets.map((facet) => facet.memberIndex)),
    new Set([expected.receipt.subject, ...(expected.receipt.contextSubjects ?? [])]),
  );
  if (!actual) return [];
  return actual.facets.map((facet) => ({ header: temporalSelectionHeader(actual), facet }));
}
function stateProjection(page: TemporalPage, expected: TemporalStateWitness): unknown[] {
  const state = selectReceivedState(page, expected.carrier, {
    binding: expected.binding,
    subject: expected.subject,
    asOf: expected.asOf,
    members: new Set(expected.selection.receipt.facets.map((facet) => facet.memberIndex)),
  });
  return (
    state?.receipt.facets.map((facet) => ({
      binding: expected.binding,
      subject: expected.subject,
      asOf: expected.asOf,
      facet,
    })) ?? []
  );
}

function nativeMatches(
  rows: TemporalSourceWatch['rows'],
  intent: NonNullable<RecordChanges['temporal']> extends Map<string, infer T> ? T : never,
): boolean {
  if (!intent.before || (!intent.replacement && !intent.deleted)) return true;
  for (const witness of rows.get('temporal_logical')?.values() ?? [])
    for (const selection of witness.selections?.values() ?? []) {
      const before = logicalProjection(intent.before, selection);
      if (
        before.length &&
        (intent.deleted ||
          canonicalJson(before) !== canonicalJson(logicalProjection(intent.after, selection)))
      )
        return false;
    }
  for (const witness of rows.get('temporal_logical')?.values() ?? [])
    for (const expected of witness.states?.values() ?? []) {
      const before = stateProjection(intent.before, expected);
      if (
        before.length &&
        (intent.deleted ||
          canonicalJson(before) !== canonicalJson(stateProjection(intent.after, expected)))
      )
        return false;
    }
  return true;
}
/** A logical selection can gain a physical placement after capture. Following
 * that placement is bookkeeping only; moving an open interval does not revoke it. */
export function addTemporalPhysicalWitness(
  rows: TemporalSourceWatch['rows'],
  page: TemporalPage,
): void {
  if (page.appendClosed !== true) return;
  addTemporalWitness(rows, 'mind_temporal_pages', temporalPageRecordId(page.actorId, page.id), {
    header: new Map(
      (['id', 'actorId', 'physicalLife', 'epoch'] as const).map((field) => [
        field,
        canonicalJson(page[field]),
      ]),
    ),
  });
}
function trackTemporalPhysicalPage(
  watch: TemporalSourceWatch,
  page: TemporalPage,
  maximumBytes: number,
): boolean {
  const id = temporalPageRecordId(page.actorId, page.id);
  if (watch.rows.get('mind_temporal_pages')?.has(id)) return true;
  let selected = false;
  for (const witness of watch.rows.get('temporal_logical')?.values() ?? [])
    for (const selection of witness.selections?.values() ?? [])
      if (selection.receipt.actorId === page.actorId && logicalProjection(page, selection).length) {
        selected = true;
        break;
      }
  if (!selected)
    for (const witness of watch.rows.get('temporal_logical')?.values() ?? [])
      for (const state of witness.states?.values() ?? [])
        if (state.carrier.actorId === page.actorId && stateProjection(page, state).length) {
          selected = true;
          break;
        }
  if (!selected) return true;
  watch.pendingBytes += Buffer.byteLength(id) + 256;
  if (watch.pendingBytes > maximumBytes) return false;
  addTemporalPhysicalWitness(watch.rows, page);
  return true;
}
const SOURCE_CAPTURE_TABLES = new Set([
  'experience_state',
  'mind_temporal_state',
  'mind_temporal_actors',
  'mind_temporal_pages',
  'mind_temporal_supports',
  'mind_perception_value_state',
  'mind_perception_values',
]);
function relevantDuringCapture(table: string, id: string, actorId: string): boolean {
  if (
    table === 'experience_state' ||
    table === 'mind_temporal_state' ||
    table === 'mind_perception_value_state' ||
    table === 'mind_perception_values'
  )
    return true;
  if (!['mind_temporal_actors', 'mind_temporal_pages', 'mind_temporal_supports'].includes(table))
    return false;
  return (JSON.parse(id) as string[])[4] === actorId;
}
/** Synchronous accepted writes inspect only selected rows/slots. An unrelated
 * append or sibling tombstone cannot revoke an unchanged received fact. */
export function temporalWatchChanges(
  watch: TemporalSourceWatch,
  actorId: string,
  changes: RecordChanges,
  maximumBytes: number,
): boolean {
  const inspect = (table: string, id: string, payload?: string): boolean => {
    const witness = watch.rows.get(table)?.get(id);
    if (payload === undefined && (witness || watch.ancestors.has(id))) return false;
    if (witness && payload !== undefined && !rowMatches(witness, payload, watch.rows)) return false;
    if (watch.collecting && relevantDuringCapture(table, id, actorId)) {
      watch.pendingBytes += Buffer.byteLength(payload ?? id) + 64;
      if (watch.pendingBytes > maximumBytes) return false;
      watch.pending.push({ table, id, ...(payload === undefined ? {} : { payload }) });
    }
    return true;
  };
  for (const intent of [...(changes.temporal?.values() ?? []), ...(changes.temporalEdits ?? [])]) {
    if (!nativeMatches(watch.rows, intent)) return false;
    if (watch.collecting && intent.replacement && intent.after.actorId === actorId) {
      watch.pendingBytes += intent.reservedBytes;
      if (watch.pendingBytes > maximumBytes) return false;
      watch.nativePending.push(intent);
    }
  }
  for (const [table, rows] of changes.writes) {
    if (
      !watch.rows.has(table) &&
      table !== 'mind_temporal_pages' &&
      (!watch.collecting || !SOURCE_CAPTURE_TABLES.has(table))
    )
      continue;
    for (const row of rows) {
      if (
        table === 'mind_temporal_pages' &&
        watch.rows.get('temporal_logical')?.size &&
        (JSON.parse(row.id) as string[])[4] === actorId &&
        !trackTemporalPhysicalPage(watch, decodeTemporalPagePayload(row.payload), maximumBytes)
      )
        return false;
      if (!inspect(table, row.id, row.payload)) return false;
    }
  }
  for (const [table, ids] of changes.deletes)
    for (const id of ids) if (!inspect(table, id)) return false;
  return true;
}
export function addTemporalWitness(
  rows: TemporalSourceWatch['rows'],
  table: string,
  id: string,
  witness: TemporalRowWitness,
): void {
  let tableRows = rows.get(table);
  if (!tableRows) rows.set(table, (tableRows = new Map()));
  const previous = tableRows.get(id);
  if (!previous) {
    tableRows.set(id, witness);
    return;
  }
  if (witness.header) previous.header = witness.header;
  if (witness.eligibility) previous.eligibility = true;
  if (witness.selections) {
    previous.selections ??= new Map();
    for (const entry of witness.selections) previous.selections.set(...entry);
  }
  if (witness.states) {
    previous.states ??= new Map();
    for (const entry of witness.states) previous.states.set(...entry);
  }
  if (witness.supports) {
    previous.supports ??= new Map();
    for (const entry of witness.supports) previous.supports.set(...entry);
  }
}
export function installTemporalWitnesses(
  watch: TemporalSourceWatch,
  rows: TemporalSourceWatch['rows'],
  maximumBytes: number,
): boolean {
  const ancestors = new Set<string>();
  for (const tableRows of rows.values())
    for (const id of tableRows.keys()) {
      const path = JSON.parse(id) as string[];
      for (let end = 1; end < path.length; end++) ancestors.add(JSON.stringify(path.slice(0, end)));
    }
  for (const intent of watch.nativePending) if (!nativeMatches(rows, intent)) return false;
  for (const row of watch.pending) {
    const witness = rows.get(row.table)?.get(row.id);
    if (
      row.payload === undefined
        ? witness || ancestors.has(row.id)
        : witness && !rowMatches(witness, row.payload, rows)
    )
      return false;
  }
  watch.rows = rows;
  watch.ancestors = ancestors;
  for (const pending of watch.pending)
    if (
      pending.table === 'mind_temporal_pages' &&
      pending.payload &&
      !trackTemporalPhysicalPage(watch, decodeTemporalPagePayload(pending.payload), maximumBytes)
    )
      return false;
  let bytes = 0;
  for (const [table, tableRows] of watch.rows)
    for (const [id, witness] of tableRows) {
      bytes += Buffer.byteLength(table) + Buffer.byteLength(id);
      for (const value of witness.header?.values() ?? []) bytes += Buffer.byteLength(value);
      for (const value of witness.selections?.values() ?? [])
        bytes += Buffer.byteLength(JSON.stringify(value));
      for (const value of witness.supports?.values() ?? [])
        bytes += Buffer.byteLength(JSON.stringify(value));
      for (const value of witness.states?.values() ?? [])
        bytes += Buffer.byteLength(JSON.stringify(value));
      if (bytes > maximumBytes) return false;
    }
  return true;
}
