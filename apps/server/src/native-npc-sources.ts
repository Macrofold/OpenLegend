import type {
  ObserverSubject,
  PersonalSourceRef,
  TemporalReceiptLocator,
  TemporalReceiptPrefix,
  TemporalHistorySelection,
} from '@open-legend/domain';
import type { NativeGeometryQueries } from '@open-legend/native-simulation';
import type { Named } from '@open-legend/language';
import type { NativeActorReadCut } from './native-read-cut.js';
import type { LiveReadCuts } from './live-read-overlay.js';
import type { SqlDatabase } from './store.js';
import { nativeCurrentRow } from './native-current-sources.js';
import type { NativePersonalSource } from './native-recall.js';

export interface NativeNpcHistoricalScope {
  readonly worldId: string;
  readonly generation: string;
  readonly actorId: string;
  readonly readSerial: number;
  readonly acceptedCut: number;
  readonly identityThrough: number;
  readonly sequence: number;
  readonly at: number;
  readonly physicalLife: number;
  readonly privacyRevision: number;
  readonly maxAgeSeconds: number;
  readonly releasedThrough?: number;
  readonly frontier?: NativeActorReadCut['history']['cuts'][number]['frontier'];
  readonly receiptPrefix:
    | { readonly state: 'known'; readonly prefix: TemporalReceiptPrefix }
    | {
        readonly state: 'pending';
        readonly physicalLife: number;
        readonly epoch: string;
        readonly tailRevision: number;
      };
}
export interface NativeNpcSourceSelection {
  readonly receipts: readonly {
    readonly locator: TemporalReceiptLocator;
    readonly memberIndices?: readonly number[];
  }[];
  readonly personal: readonly PersonalSourceRef[];
}
export interface NativeNpcSourcesRequest {
  readonly binding: NativeGeometryQueries['binding'];
  readonly origin: NativeNpcHistoricalScope;
  readonly selection: NativeNpcSourceSelection;
  readonly maximumTransferBytes: number;
}
export interface NativeNpcSubjectFact {
  readonly subject: ObserverSubject;
  readonly canonicalId?: string;
  readonly label: string;
  readonly identityPresent: boolean;
  readonly currentCommunication: boolean;
  readonly preferredName?: string;
  readonly observerName?: Readonly<Named>;
  readonly nameRevision: number;
  readonly noteRevision: number;
  readonly noteCharacters: number;
  readonly seedOnly: boolean;
  readonly canAddressRemembered: boolean;
  readonly named: boolean;
}
export interface NativeNpcReferenceFacts {
  readonly myself: NativeNpcSubjectFact;
  readonly bodies: readonly { readonly ordinal: number; readonly subject?: NativeNpcSubjectFact; readonly subjects: readonly NativeNpcSubjectFact[] }[];
  readonly knowledge: readonly NativeNpcSubjectFact[];
  readonly attributionIdentities: Readonly<
    Record<
      string,
      readonly (readonly [string | null, string | null, string, string | null, boolean])[]
    >
  >;
}
export interface NativeNpcSourceInventory {
  readonly personal: readonly NativePersonalSource[];
  readonly receipts: readonly (TemporalHistorySelection['entries'][number] & {
    readonly selection: number;
  })[];
  readonly unavailablePersonal: readonly number[];
  readonly unavailableReceipts: readonly number[];
}

function integer(value: unknown): number {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0)
    throw new Error('Native source metadata has an invalid current ordinal.');
  return number;
}

/** SQL reads current immutable records at one actual accepted overlay. The
 * native origin applies its earlier time/prefix/frontier and current privacy
 * fences; unrelated accepted movement does not invalidate historical context. */
export async function readNativeNpcSources(
  db: SqlDatabase,
  request: NativeNpcSourcesRequest,
  cut: LiveReadCuts,
) {
  const { origin, binding, selection } = request;
  if (
    !db.readAtCut ||
    !db.readTransaction ||
    origin.worldId !== cut.worldId ||
    origin.generation !== cut.generation ||
    binding.baseCut !== cut.sequence ||
    origin.receiptPrefix.state !== 'known'
  )
    throw new Error('Native source preparation has no matching accepted SQL overlay.');
  return db.readAtCut(cut, () =>
    db.readTransaction!(async () => {
      const head = await db.prepare('SELECT world_id,generation FROM world_head WHERE id=1').get();
      if (head?.['world_id'] !== cut.worldId || head['generation'] !== cut.storageGeneration)
        throw new Error('Native source preparation lost its durable world witness.');
      let transfer = Buffer.byteLength(
        JSON.stringify({
          binding,
          readSerial: origin.readSerial,
          rows: { pages: [], values: [], personal: [] },
        }),
      );
      async function admit(sql: string, parameters: readonly unknown[]) {
        const size = await db
          .prepare(
            `SELECT COALESCE(sum(octet_length(row_to_json(t)::text)),0) AS bytes FROM (${sql}) t`,
          )
          .get(...parameters);
        // SQL includes every named indexed cell and the exact payload. Six
        // escaped bytes per code unit bound its smaller current-row envelope.
        transfer += integer(size?.['bytes']) * 6;
        if (!Number.isSafeInteger(transfer) || transfer > request.maximumTransferBytes)
          throw new Error('Native source witnesses exceed their admitted transfer allowance.');
      }
      const coordinates = JSON.stringify(
        selection.receipts.map(({ locator }) => ({
          life: locator.physicalLife,
          epoch: locator.epoch,
          batch: locator.batchOrder,
          entry: locator.entryIndex,
        })),
      );
      // Seek the immediate physical predecessor through the existing actor /
      // first-batch index, then test its actual closed range. A missing locator
      // does not scan that actor's entire historical page population.
      const metadata = selection.receipts.length
        ? await db
            .prepare(
              `
      SELECT DISTINCT p.id FROM jsonb_to_recordset(?::jsonb)
      AS selected(life bigint,epoch text,batch bigint,entry bigint)
      JOIN LATERAL (
        SELECT id,physical_life,receipt_epoch,last_batch_order,last_entry
        FROM mind_temporal_pages WHERE world_id=? AND actor_id=?
          AND (first_batch_order,first_entry)<=(selected.batch,selected.entry)
        ORDER BY first_batch_order DESC,first_entry DESC,first_member DESC,id DESC LIMIT 1
      ) p ON p.physical_life=selected.life AND p.receipt_epoch=selected.epoch
        AND (p.last_batch_order,p.last_entry)>=(selected.batch,selected.entry)
    `,
            )
            .all(coordinates, cut.worldId, origin.actorId)
        : [];
      const ids = metadata.map((row) => String(row['id']));
      const pageSql = 'SELECT * FROM mind_temporal_pages WHERE world_id=? AND id=ANY(?::text[])';
      const pageParameters = [cut.worldId, ids];
      const wanted = `WITH wanted AS MATERIALIZED (
      SELECT DISTINCT unnest(value_refs) AS source_id FROM mind_temporal_pages
      WHERE world_id=? AND id=ANY(?::text[])
    )`;
      const valueSql = `${wanted} SELECT v.* FROM wanted w JOIN mind_perception_values v
      ON v.world_id=? AND v.source_id=w.source_id`;
      const valueParameters = [cut.worldId, ids, cut.worldId];
      const count = ids.length
        ? await db
            .prepare(
              `${wanted}
      SELECT count(*) AS wanted,count(v.source_id) AS found FROM wanted w
      LEFT JOIN mind_perception_values v ON v.world_id=? AND v.source_id=w.source_id
    `,
            )
            .get(...valueParameters)
        : { wanted: 0, found: 0 };
      if (integer(count?.['wanted']) !== integer(count?.['found']))
        throw new Error('Native selected receipts have missing immutable value witnesses.');
      if (ids.length) {
        await admit(pageSql, pageParameters);
        await admit(valueSql, valueParameters);
      }
      const pages = ids.length
        ? (await db.prepare(pageSql + ' ORDER BY position,id').all(...pageParameters)).map((row) =>
            nativeCurrentRow('mind_temporal_pages', row),
          )
        : [];
      const values = ids.length
        ? (await db.prepare(valueSql + ' ORDER BY v.position,v.id').all(...valueParameters)).map(
            (row) => nativeCurrentRow('mind_perception_values', row),
          )
        : [];
      const personal: {
        kind: PersonalSourceRef['kind'];
        row: ReturnType<typeof nativeCurrentRow>;
      }[] = [];
      for (const [kind, table, owner] of [
        ['awareness', 'mind_awareness', ['world', 'experience', 'awareness', origin.actorId]],
        ['memory', 'mind_memories', ['world', 'memories', origin.actorId]],
        ['summary', 'mind_summaries', ['world', 'experience', 'summaries', origin.actorId]],
      ] as const) {
        const selected = selection.personal.filter((source) => source.kind === kind);
        if (!selected.length) continue;
        const sourceIds = selected.map((source) => JSON.stringify([...owner, source.id]));
        const sql = `SELECT * FROM ${table} WHERE world_id=? AND actor_id=? AND id=ANY(?::text[])`;
        const parameters = [cut.worldId, origin.actorId, sourceIds];
        await admit(sql, parameters);
        for (const row of await db.prepare(sql + ' ORDER BY position,id').all(...parameters))
          personal.push({ kind, row: nativeCurrentRow(table, row) });
      }
      const result = { binding, readSerial: origin.readSerial, rows: { pages, values, personal } };
      if (Buffer.byteLength(JSON.stringify(result)) > request.maximumTransferBytes)
        throw new Error('Native source witnesses exceed their admitted transfer allowance.');
      return result;
    }),
  );
}
