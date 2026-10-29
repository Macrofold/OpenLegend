import {
  canonicalJson,
  materializeTemporalValue,
  temporalReceiptForRead,
  type TemporalHistorySelection,
  type TemporalSupportCapsule,
} from '@open-legend/domain';
import type { RecordChanges } from './world-records.js';

type Selection = TemporalHistorySelection['entries'][number];
export interface TemporalRowWitness {
  header?: ReadonlyMap<string, string>;
  slots?: Map<number, string>;
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
  pendingBytes: number;
  collecting: boolean;
}
export const newTemporalSourceWatch = (): TemporalSourceWatch => ({
  rows: new Map(), ancestors: new Set(), pending: [], pendingBytes: 0, collecting: false,
});

export function sameSupportedSelection(support: TemporalSupportCapsule, expected: Selection): boolean {
  const current = temporalReceiptForRead(support.receipt);
  const { facets, sourceIds: _aliases, ...header } = current;
  const { facets: selected, sourceIds: _selectedAliases, ...selectedHeader } = expected.receipt;
  return canonicalJson(header) === canonicalJson(selectedHeader) && selected.every((facet, index) => {
    const position = facets.findIndex(owned => canonicalJson(owned) === canonicalJson(facet));
    if (position < 0) return false;
    const value = materializeTemporalValue(support.receipt.facets[position]!, support.values[position]!, {});
    return value !== undefined && canonicalJson(value) === canonicalJson(expected.values[index]);
  });
}
function rowMatches(witness: TemporalRowWitness, payload: string): boolean {
  try {
    const row = JSON.parse(payload) as Record<string, unknown>;
    if (witness.header && [...witness.header].some(([field, value]) => canonicalJson(row[field]) !== value)) return false;
    if (witness.slots) {
      const values = row['values'];
      if (!Array.isArray(values) || !Number.isSafeInteger(row['start'])) return false;
      for (const [ordinal, value] of witness.slots)
        if (canonicalJson(values[ordinal - Number(row['start'])]) !== value) return false;
    }
    if (witness.supports && [...witness.supports.values()].some(expected =>
      !sameSupportedSelection(row as unknown as TemporalSupportCapsule, expected))) return false;
    return true;
  } catch { return false; }
}
function relevantDuringCapture(table: string, id: string, actorId: string): boolean {
  if (table === 'experience_state' || table === 'mind_temporal_state' ||
      table === 'mind_perception_value_state' || table === 'mind_perception_values' ||
      table === 'mind_perception_segments') return true;
  if (!['mind_temporal_actors', 'mind_temporal_chunks', 'mind_temporal_segments', 'mind_temporal_supports'].includes(table)) return false;
  return (JSON.parse(id) as string[])[4] === actorId;
}
/** Synchronous accepted writes inspect only selected rows/slots. An unrelated
 * append or sibling tombstone cannot revoke an unchanged received fact. */
export function temporalWatchChanges(
  watch: TemporalSourceWatch, actorId: string, changes: RecordChanges, maximumBytes: number,
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
  for (const [table, rows] of changes.writes)
    for (const row of rows) if (!inspect(table, row.id, row.payload)) return false;
  for (const [table, ids] of changes.deletes)
    for (const id of ids) if (!inspect(table, id)) return false;
  return true;
}
export function addTemporalWitness(
  rows: TemporalSourceWatch['rows'], table: string, id: string, witness: TemporalRowWitness,
): void {
  let tableRows = rows.get(table);
  if (!tableRows) rows.set(table, tableRows = new Map());
  const previous = tableRows.get(id);
  if (!previous) { tableRows.set(id, witness); return; }
  if (witness.header) previous.header = witness.header;
  if (witness.slots) {
    previous.slots ??= new Map();
    for (const entry of witness.slots) previous.slots.set(...entry);
  }
  if (witness.supports) {
    previous.supports ??= new Map();
    for (const entry of witness.supports) previous.supports.set(...entry);
  }
}
export function installTemporalWitnesses(watch: TemporalSourceWatch, rows: TemporalSourceWatch['rows']): boolean {
  const ancestors = new Set<string>();
  for (const tableRows of rows.values()) for (const id of tableRows.keys()) {
    const path = JSON.parse(id) as string[];
    for (let end = 1; end < path.length; end++) ancestors.add(JSON.stringify(path.slice(0, end)));
  }
  for (const row of watch.pending) {
    const witness = rows.get(row.table)?.get(row.id);
    if (row.payload === undefined ? witness || ancestors.has(row.id) : witness && !rowMatches(witness, row.payload)) return false;
  }
  for (const [table, tableRows] of rows)
    for (const [id, witness] of tableRows) addTemporalWitness(watch.rows, table, id, witness);
  for (const id of ancestors) watch.ancestors.add(id);
  return true;
}
