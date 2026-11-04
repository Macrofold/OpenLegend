import { temporalPageRecordId } from './temporal-page-storage.js';
import {
  canonicalJson,
  materializeTemporalValue,
  temporalReceiptForRead,
  temporalPageOperations,
  temporalCheckedFacet,
  type TemporalPage,
  type TemporalHistorySelection,
  type TemporalSupportCapsule,
} from '@open-legend/domain';
import type { RecordChanges } from './world-records.js';

type Selection = TemporalHistorySelection['entries'][number];
export interface TemporalRowWitness {
  header?: ReadonlyMap<string, string>;
  selections?: Map<string, Selection>;
  supports?: Map<string, Selection>;
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
function rowMatches(witness: TemporalRowWitness, payload: string): boolean {
  try {
    const row = JSON.parse(payload) as Record<string, unknown>;
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
function logicalProjection(page: TemporalPage, expected: Selection): unknown[] {
  const selected = new Set(expected.receipt.facets.map((field) => field.ordinal));
  const same = (receipt: Selection['receipt']) =>
    receipt.actorId === expected.receipt.actorId &&
    receipt.physicalLife === expected.receipt.physicalLife &&
    receipt.epoch === expected.receipt.epoch &&
    receipt.ordinal === expected.receipt.ordinal;
  const values: unknown[] = [];
  for (const op of temporalPageOperations(page)) {
    if (op.kind !== 'check') {
      if (same(op.receipt)) {
        const { facets, sourceIds: _sourceIds, ...header } = op.receipt;
        const fields = facets.filter((field) => selected.has(field.ordinal));
        if (fields.length) values.push({ header, facets: fields });
      }
      continue;
    }
    for (const stamp of op.stamps) {
      const declaration = page.declarations.find((value) => value.id === stamp.declaration);
      if (!declaration) continue;
      const members = declaration.members.flatMap((member, index) => {
        if (
          !same({ ...expected.receipt, ...member.locator }) ||
          !selected.has(member.memberOrdinal)
        )
          return [];
        const expectedField = expected.receipt.facets.find(
          (field) => field.ordinal === member.memberOrdinal,
        );
        if (!expectedField) return [];
        const expectedSupport = expectedField.detailSupport?.proof ?? expectedField.support;
        const projected = temporalCheckedFacet(expectedField, member, undefined, stamp);
        const currentSupport = projected.detailSupport?.proof ?? projected.support;
        // Compare the actual per-member proof selected at the captured cut;
        // the shared check header is not necessarily that member's source ID.
        if (
          expectedSupport?.confirmation.id !== currentSupport?.confirmation.id ||
          expectedSupport?.confirmation.revision !== currentSupport?.confirmation.revision
        )
          return [];
        return [{ member, seed: declaration.seeds.find((seed) => seed.member === index) }];
      });
      if (members.length)
        values.push({
          at: op.at,
          order: op.order,
          stamp: { ...stamp, declaration: undefined },
          members,
        });
    }
  }
  return values;
}
function nativeMatches(
  rows: TemporalSourceWatch['rows'],
  intent: NonNullable<RecordChanges['temporal']> extends Map<string, infer T> ? T : never,
): boolean {
  if (!intent.before || !intent.replacement) return true;
  for (const witness of rows.get('temporal_logical')?.values() ?? [])
    for (const selection of witness.selections?.values() ?? []) {
      const before = logicalProjection(intent.before, selection);
      if (
        before.length &&
        canonicalJson(before) !== canonicalJson(logicalProjection(intent.after, selection))
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
    if (witness && payload !== undefined && !rowMatches(witness, payload)) return false;
    if (watch.collecting && relevantDuringCapture(table, id, actorId)) {
      watch.pendingBytes += Buffer.byteLength(payload ?? id) + 64;
      if (watch.pendingBytes > maximumBytes) return false;
      watch.pending.push({ table, id, ...(payload === undefined ? {} : { payload }) });
    }
    return true;
  };
  for (const intent of changes.temporal?.values() ?? []) {
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
        !trackTemporalPhysicalPage(watch, JSON.parse(row.payload) as TemporalPage, maximumBytes)
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
  if (witness.selections) {
    previous.selections ??= new Map();
    for (const entry of witness.selections) previous.selections.set(...entry);
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
        : witness && !rowMatches(witness, row.payload)
    )
      return false;
  }
  watch.rows = rows;
  watch.ancestors = ancestors;
  for (const pending of watch.pending)
    if (
      pending.table === 'mind_temporal_pages' &&
      pending.payload &&
      !trackTemporalPhysicalPage(watch, JSON.parse(pending.payload) as TemporalPage, maximumBytes)
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
      if (bytes > maximumBytes) return false;
    }
  return true;
}
