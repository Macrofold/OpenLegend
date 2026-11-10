import { jsonByteLength } from '@open-legend/domain';
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
import type { RetrievedMemory } from './memory-repository.js';
import { experienceSourceReference } from '@open-legend/domain';
import { personalAccountRevision } from './personal-accounts.js';

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
  readonly consolidationJob?: string;
  readonly receipts: readonly {
    readonly locator: TemporalReceiptLocator;
    readonly memberIndices?: readonly number[];
  }[];
  readonly personal: readonly {
    readonly reference: PersonalSourceRef;
    /** A real current summary's exact coverage, never a model parent claim. */
    readonly through?: PersonalSourceRef;
  }[];
}
export function nativeNpcPersonalSelection(
  source: RetrievedMemory,
): NativeNpcSourceSelection['personal'][number] {
  return {
    reference: experienceSourceReference(source.entry),
    ...(source.through ? { through: { kind: 'summary' as const, ...source.through } } : {}),
  };
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
  readonly referenceAttribution?: string | number;
  readonly nameRevision: number;
  readonly noteRevision: number;
  readonly noteCharacters: number;
  readonly seedOnly: boolean;
  readonly canAddressRemembered: boolean;
  readonly named: boolean;
}
export interface NativeNpcReferenceFacts {
  readonly myself: NativeNpcSubjectFact;
  readonly bodies: readonly {
    readonly ordinal: number;
    readonly entity: NativeNpcSubjectFact;
    readonly subject?: NativeNpcSubjectFact;
    readonly subjects: readonly NativeNpcSubjectFact[];
  }[];
  readonly knowledge: readonly NativeNpcSubjectFact[];
  readonly social: readonly NativeNpcSubjectFact[];
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
  /** Present only for a genuine job-prefix duplicate query. */
  readonly duplicateSummary?: boolean;
}

/** Every number addresses a row owned by the originating native handle. An
 * alias supplies spelling only; it cannot supply a command, ID or grant. */
export interface NativeNpcAliasOrdinal {
  readonly alias: string;
  readonly ordinal: number;
}
export type NativeNpcEntityOrdinal =
  | { readonly kind: 'myself' }
  | { readonly kind: 'body' | 'received-body' | 'knowledge' | 'social'; readonly ordinal: number }
  | {
      readonly kind: 'personal';
      readonly inventory: number;
      readonly ordinal: number;
      readonly entity: number;
    };
export type NativeNpcSubjectOrdinal =
  | { readonly kind: 'myself' }
  | {
      readonly kind:
        | 'body'
        | 'body-entity'
        | 'received-body'
        | 'received-body-entity'
        | 'knowledge'
        | 'social'
        | 'mind-record';
      readonly ordinal: number;
    }
  | {
      readonly kind: 'body-subject' | 'received-body-subject';
      readonly ordinal: number;
      readonly subject: number;
    }
  | {
      readonly kind: 'personal';
      readonly inventory: number;
      readonly ordinal: number;
      readonly subject: number;
    };
export interface NativeNpcBindingSelection {
  readonly consumer: 'chat' | 'thought' | 'reflection';
  readonly purpose: 'decision' | 'reflection';
  /** The admitted director route; never selected from model response JSON. */
  readonly validity: 'decision' | 'prepared-response' | 'source';
  readonly actions: readonly (NativeNpcAliasOrdinal & {
    readonly source: 'original' | 'current';
  })[];
  readonly prototypeSource: 'original' | 'current';
  /** Ordinals in the admitted trigger's native unresolved-cause roster. */
  readonly semanticCauses: readonly number[];
  /** Exact selected conversation perspective dependencies, including empty identities. */
  readonly perspectives: readonly { readonly snapshot: number; readonly entity: number }[];
  /** Ordinals address the refreshed native read's actual pending intent list. */
  readonly intents: readonly NativeNpcAliasOrdinal[];
  /** Sources actually included in the compact request, in presentation order. */
  readonly evidence: readonly { readonly inventory: number; readonly ordinal: number }[];
  readonly entities: readonly {
    readonly alias: string;
    readonly source: NativeNpcEntityOrdinal;
  }[];
  readonly identities: readonly {
    readonly alias: string;
    readonly source: NativeNpcSubjectOrdinal;
  }[];
  readonly knowledge: readonly {
    readonly alias: string;
    readonly source: NativeNpcSubjectOrdinal;
  }[];
  readonly observations: readonly {
    readonly alias: string;
    readonly source:
      | { readonly kind: 'acquired'; readonly ordinal: number }
      | {
          readonly kind: 'personal';
          readonly inventory: number;
          readonly ordinal: number;
          readonly observation: number;
        };
  }[];
  readonly current: readonly NativeNpcAliasOrdinal[];
  readonly receipts: readonly {
    readonly alias: string;
    readonly inventory: number;
    readonly ordinal: number;
  }[];
  readonly attention: readonly NativeNpcAliasOrdinal[];
  readonly presented: readonly number[];
  readonly appraisals: {
    readonly purpose: 'decision' | 'reflection';
    readonly guard: 'all' | 'required';
    /** Ordinals address the full installed appraisal definition order. Native
     * verifies each selected policy actually permits decision writes. */
    readonly policies: readonly NativeNpcAliasOrdinal[];
    readonly records: readonly NativeNpcAliasOrdinal[];
    readonly sources: readonly {
      readonly alias: string;
      readonly inventory: number;
      readonly ordinal: number;
    }[];
    readonly trigger: { readonly inventory: number; readonly ordinal: number } | null;
  } | null;
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
    (selection.receipts.length > 0 && origin.receiptPrefix.state !== 'known')
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
          rows: { pages: [], values: [], personal: [], parents: [] },
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
      type CurrentRow = ReturnType<typeof nativeCurrentRow>;
      const personal: (
        | { storage: 'current'; kind: PersonalSourceRef['kind']; row: CurrentRow }
        | {
            storage: 'archive';
            archive: {
              worldId: string;
              actorId: string;
              sourceKind: PersonalSourceRef['kind'];
              sourceId: string;
              revision: string;
              payload: string;
            };
            current: CurrentRow | null;
          }
      )[] = [];
      const parents: CurrentRow[] = [];
      const parentIds = [
        ...new Set(
          selection.personal.flatMap(({ through }) =>
            through
              ? [JSON.stringify(['world', 'experience', 'summaries', origin.actorId, through.id])]
              : [],
          ),
        ),
      ];
      if (parentIds.length) {
        const sql =
          'SELECT * FROM mind_summaries WHERE world_id=? AND actor_id=? AND id=ANY(?::text[])';
        const parameters = [cut.worldId, origin.actorId, parentIds];
        await admit(sql, parameters);
        for (const row of await db.prepare(sql + ' ORDER BY position,id').all(...parameters))
          parents.push(nativeCurrentRow('mind_summaries', row));
      }
      for (const [kind, table, owner] of [
        ['awareness', 'mind_awareness', ['world', 'experience', 'awareness', origin.actorId]],
        ['memory', 'mind_memories', ['world', 'memories', origin.actorId]],
        ['summary', 'mind_summaries', ['world', 'experience', 'summaries', origin.actorId]],
      ] as const) {
        const selected = selection.personal.filter((source) => source.reference.kind === kind);
        if (!selected.length) continue;
        const sourceIds = selected.map((source) => JSON.stringify([...owner, source.reference.id]));
        const sql = `SELECT * FROM ${table} WHERE world_id=? AND actor_id=? AND id=ANY(?::text[])`;
        const parameters = [cut.worldId, origin.actorId, sourceIds];
        await admit(sql, parameters);
        const current = new Map(
          (await db.prepare(sql + ' ORDER BY position,id').all(...parameters)).map((row) => [
            String(row['id']),
            row,
          ]),
        );
        const missing = selected.filter(({ reference }) => {
          const row = current.get(JSON.stringify([...owner, reference.id]));
          return !row || personalAccountRevision(String(row['payload'])) !== reference.revision;
        });
        const archiveSql = `SELECT v.* FROM mind_source_versions v
          JOIN jsonb_to_recordset(?::jsonb) AS q(id text,revision text)
          ON v.source_id=q.id AND v.revision=q.revision
          WHERE v.world_id=? AND v.actor_id=? AND v.source_kind=?`;
        const archiveParameters = [
          JSON.stringify(
            missing.map(({ reference }) => ({ id: reference.id, revision: reference.revision })),
          ),
          cut.worldId,
          origin.actorId,
          kind,
        ];
        const archives = new Map<string, Record<string, unknown>>();
        if (missing.length) {
          await admit(archiveSql, archiveParameters);
          for (const row of await db.prepare(archiveSql).all(...archiveParameters))
            archives.set(JSON.stringify([row['source_id'], row['revision']]), row);
        }
        for (const { reference } of selected) {
          const row = current.get(JSON.stringify([...owner, reference.id]));
          if (row && personalAccountRevision(String(row['payload'])) === reference.revision)
            personal.push({ storage: 'current', kind, row: nativeCurrentRow(table, row) });
          else {
            const archived = archives.get(JSON.stringify([reference.id, reference.revision]));
            if (!archived) continue;
            personal.push({
              storage: 'archive',
              archive: {
                worldId: String(archived['world_id']),
                actorId: String(archived['actor_id']),
                sourceKind: kind,
                sourceId: String(archived['source_id']),
                revision: String(archived['revision']),
                payload: String(archived['payload']),
              },
              current: row ? nativeCurrentRow(table, row) : null,
            });
          }
        }
      }
      const duplicate =
        selection.consolidationJob === undefined
          ? undefined
          : (
              await db
                .prepare(
                  'SELECT EXISTS(SELECT 1 FROM mind_summaries WHERE world_id=? AND actor_id=? AND left(source_id,length(?))=?) AS present',
                )
                .get(
                  cut.worldId,
                  origin.actorId,
                  `${selection.consolidationJob}:`,
                  `${selection.consolidationJob}:`,
                )
            )?.['present'];
      if (selection.consolidationJob !== undefined && typeof duplicate !== 'boolean')
        throw new Error('Consolidation has no exact current summary witness.');
      const result = {
        binding,
        readSerial: origin.readSerial,
        rows: {
          pages,
          values,
          personal,
          parents,
          ...(selection.consolidationJob === undefined ? {} : { duplicateSummary: duplicate }),
        },
      };
      if (jsonByteLength(result, { cache: false }) > request.maximumTransferBytes)
        throw new Error('Native source witnesses exceed their admitted transfer allowance.');
      return result;
    }),
  );
}
