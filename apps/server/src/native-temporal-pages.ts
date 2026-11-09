import type { LiveReadCuts } from './live-read-overlay.js';
import { nativeCurrentRow } from './native-current-sources.js';
import type { SqlDatabase } from './store.js';
import { RECORD_NODES } from './world-record-schema.js';
import {
  correctionCandidates,
  correctionDependencyQuery,
  correctionPageBytes,
  correctionPageRows,
  correctionSourceBytes,
  readCorrectionDependencies,
  readCorrectionPageMetadata,
} from './temporal-correction-selection.js';

interface SourceAddress {
  readonly actorId: string;
  readonly sourceId: string;
}
interface PreparationTotals {
  readonly pages: number;
  readonly pageBytes: number;
  readonly sourceBytes: number;
}
export interface NativeHistoryEditReadRequest {
  readonly actorId: string;
  readonly binding: {
    readonly worldId: string;
    readonly generation: string;
    readonly acceptedCut: number;
    readonly identityThrough: number;
    readonly candidateId: number;
    readonly candidateGeneration: number;
    readonly requestSerial: number;
  };
  readonly phase: 'closure' | 'records' | 'verify';
  readonly sources: readonly SourceAddress[];
  readonly residentPages: readonly string[];
  readonly residentValues: readonly string[];
  readonly at: number;
  readonly maxAgeSeconds: number;
  readonly totals: PreparationTotals;
  /** Operational response admission from the actual awaiting native allowance. */
  readonly maximumTransferBytes: number;
  readonly predecessors: readonly { readonly id: string; readonly revision: number }[];
}
function integer(value: unknown): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0) throw new Error('Invalid current history metadata.');
  return n;
}

/** An explicit edit alternates indexed dependency closure and native account
 * aliases. It reads only affected pages, under the same limits as Source
 * prepareHistoryEdit; neither an actor's lifetime nor its shared pool is loaded.
 * The native owner keeps the accepted live projection and candidate fence. */
export async function readNativeHistoryEdit(
  db: SqlDatabase,
  request: NativeHistoryEditReadRequest,
  cut: LiveReadCuts,
) {
  const { binding } = request;
  if (
    !db.readAtCut ||
    !db.readTransaction ||
    binding.worldId !== cut.worldId ||
    binding.generation !== cut.generation ||
    binding.acceptedCut !== cut.sequence ||
    typeof request.actorId !== 'string' ||
    !request.actorId ||
    !['closure', 'records', 'verify'].includes(request.phase) ||
    !Number.isFinite(request.at) ||
    request.at < 0 ||
    !Number.isFinite(request.maxAgeSeconds) ||
    request.maxAgeSeconds < 0 ||
    !Number.isSafeInteger(request.maximumTransferBytes) ||
    request.maximumTransferBytes <= 0 ||
    request.sources.some(
      (v) =>
        typeof v.actorId !== 'string' ||
        v.actorId !== request.actorId ||
        !v.actorId ||
        typeof v.sourceId !== 'string' ||
        !v.sourceId,
    ) ||
    request.predecessors.some(
      (v) =>
        typeof v.id !== 'string' || !v.id || !Number.isSafeInteger(v.revision) || v.revision < 0,
    ) ||
    (request.phase !== 'verify' && request.predecessors.length !== 0) ||
    [...request.residentPages, ...request.residentValues].some(
      (v) => typeof v !== 'string' || !v,
    ) ||
    [
      binding.identityThrough,
      binding.candidateId,
      binding.candidateGeneration,
      binding.requestSerial,
      request.totals.pages,
      request.totals.pageBytes,
      request.totals.sourceBytes,
    ].some((v) => !Number.isSafeInteger(v) || v < 0)
  )
    throw new Error('Native history edit requires its exact accepted live cut.');
  return db.readAtCut(cut, () =>
    db.readTransaction!(async () => {
      const head = await db
        .prepare('SELECT world_id,generation,revision FROM world_head WHERE id=1')
        .get();
      if (!head || head['world_id'] !== cut.worldId || head['generation'] !== cut.storageGeneration)
        throw new Error('Native history edit lost its durable read witness.');
      // Read one current root record; its children are separate SQL owners.
      // PostgreSQL JSON extraction rejects unrelated isolated UTF-16 units, so
      // only the JavaScript JSON owner reads these three finite scalar fields.
      const root = await db
        .prepare('SELECT payload FROM world_settings WHERE world_id=? AND id=?')
        .get(cut.worldId, '["world"]');
      const world =
        root &&
        (JSON.parse(String(root['payload'])) as {
          id?: unknown;
          nextId?: unknown;
          simTime?: unknown;
        });
      if (
        world?.id !== binding.worldId ||
        integer(world.nextId) !== binding.identityThrough ||
        Number(world.simTime) !== request.at
      )
        throw new Error('Native history projection differs from its accepted source cut.');
      if (request.phase === 'verify') {
        // This is the same exact immutable-page check Source performs after
        // asynchronous preparation. Read through the actual accepted overlay;
        // a changed/deleted page never becomes an adopted old predecessor.
        const response = {
          binding,
          durableRevision: integer(head['revision']),
          selection: [],
          tables: {},
          owners: [],
          predecessors: request.predecessors,
          totals: { pages: 0, pageBytes: 0, sourceBytes: 0 },
        };
        const wireBound = 1024 + request.predecessors.reduce((n, v) => n + 6 * v.id.length + 96, 0);
        if (!Number.isSafeInteger(wireBound) || wireBound > request.maximumTransferBytes)
          throw new Error('Native history response exceeds its admitted transfer allowance.');
        const expected = new Map(request.predecessors.map((v) => [v.id, v.revision]));
        if (expected.size !== request.predecessors.length)
          throw new Error('Native history predecessor identities are duplicated.');
        const ids = [...expected.keys()];
        let found = 0;
        for (let at = 0; at < ids.length; at += 256)
          for (const row of await db
            .prepare(
              'SELECT id,revision FROM mind_temporal_pages WHERE world_id=? AND id=ANY(?::text[])',
            )
            .all(cut.worldId, ids.slice(at, at + 256))) {
            if (expected.get(String(row['id'])) !== integer(row['revision']))
              throw new Error('Native history edit lost its selected immutable predecessor.');
            found++;
          }
        if (found !== expected.size)
          throw new Error('Native history edit lost its selected immutable predecessor.');
        return response;
      }
      const dependencyQuery = correctionDependencyQuery(
        cut.worldId,
        request.sources.map((v) => ({ actor_id: v.actorId, source_id: v.sourceId })),
      );
      const dependencySize = await db
        .prepare(
          `SELECT COALESCE(sum(octet_length(row_to_json(t)::text)),0) AS bytes
        FROM (${dependencyQuery.sql}) t`,
        )
        .get(...dependencyQuery.parameters);
      let transferBound = integer(dependencySize?.['bytes']) * 6;
      if (!Number.isSafeInteger(transferBound) || transferBound > request.maximumTransferBytes)
        throw new Error('Native history response exceeds its admitted transfer allowance.');
      const selected = await readCorrectionDependencies(
        db,
        cut.worldId,
        request.sources.map((v) => ({ actor_id: v.actorId, source_id: v.sourceId })),
      );
      const scope = JSON.stringify(selected);
      const actors = [request.actorId];
      const sourceTables = [
        'mind_awareness',
        'mind_memories',
        'mind_summaries',
        'activity_occurrences',
        'mind_appraisals',
      ] as const;
      const upperOwners = actors.flatMap((actor) =>
        sourceTables.map((table) => ({
          table,
          owner: JSON.stringify(
            table === 'mind_memories'
              ? ['world', 'memories', actor]
              : table === 'activity_occurrences'
                ? ['world', 'actionExperience', 'occurrences', actor]
                : table === 'mind_appraisals'
                  ? ['world', 'appraisals', actor]
                  : [
                      'world',
                      'experience',
                      table === 'mind_awareness' ? 'awareness' : 'summaries',
                      actor,
                    ],
          ),
          complete: false,
          nextOrdinal: Number.MAX_SAFE_INTEGER,
          parentPresent: false,
        })),
      );
      const frame = {
        binding,
        durableRevision: Number.MAX_SAFE_INTEGER,
        selection: [],
        tables: Object.fromEntries(
          (request.phase === 'closure'
            ? ['mind_temporal_pages', 'mind_perception_values']
            : sourceTables
          ).map((table) => [table, []]),
        ),
        owners: request.phase === 'records' ? upperOwners : [],
        predecessors: [],
        totals: {
          pages: Number.MAX_SAFE_INTEGER,
          pageBytes: Number.MAX_SAFE_INTEGER,
          sourceBytes: Number.MAX_SAFE_INTEGER,
        },
      };
      transferBound += Buffer.byteLength(JSON.stringify(frame));
      if (!Number.isSafeInteger(transferBound) || transferBound > request.maximumTransferBytes)
        throw new Error('Native history response exceeds its admitted transfer allowance.');
      async function admit(sql: string, parameters: readonly unknown[]) {
        const size = await db
          .prepare(
            `SELECT count(*) AS count,
        COALESCE(sum(octet_length(row_to_json(t)::text)),0) AS bytes FROM (${sql}) t`,
          )
          .get(...parameters);
        integer(size?.['count']);
        const bytes = integer(size?.['bytes']);
        // A code unit needs at most six escaped bytes. The full SQL row also
        // includes world/revision fields and named indexed columns, which bound
        // the smaller current-row envelope and its indexed-cell array. This is
        // a wire bound, separate from Source's semantic preparation limits.
        transferBound += bytes * 6;
        if (!Number.isSafeInteger(transferBound) || transferBound > request.maximumTransferBytes)
          throw new Error('Native history response exceeds its admitted transfer allowance.');
      }
      const tables: Record<string, ReturnType<typeof nativeCurrentRow>[]> = {};
      const owners: {
        table: string;
        owner: string;
        complete: boolean;
        nextOrdinal: number;
        parentPresent: boolean;
      }[] = [];
      const predecessors: { id: string; revision: number }[] = [];
      let totals = { ...request.totals };
      if (request.phase === 'closure') {
        const metadata = await readCorrectionPageMetadata(
          db,
          cut.worldId,
          correctionCandidates(selected),
          request.residentPages,
          request.at,
          request.maxAgeSeconds,
        );
        totals.pages += metadata.length;
        totals.pageBytes += metadata.reduce((n, v) => n + integer(v['bytes']), 0);
        if (totals.pages > correctionPageRows || totals.pageBytes > correctionPageBytes)
          throw new Error('Complete personal receipt correction exceeds bounded preparation.');
        const ids = metadata.map((v) => String(v['id']));
        transferBound += Buffer.byteLength(
          JSON.stringify(
            metadata.map((v) => ({ id: String(v['id']), revision: Number.MAX_SAFE_INTEGER })),
          ),
        );
        if (!Number.isSafeInteger(transferBound) || transferBound > request.maximumTransferBytes)
          throw new Error('Native history response exceeds its admitted transfer allowance.');
        const pageSql = 'SELECT * FROM mind_temporal_pages WHERE world_id=? AND id=ANY(?::text[])';
        const pageParameters = [cut.worldId, ids];
        const wanted = `WITH wanted AS MATERIALIZED (
        SELECT DISTINCT unnest(value_refs) AS source_id FROM mind_temporal_pages
        WHERE world_id=? AND id=ANY(?::text[])
      )`;
        const valueParameters = [cut.worldId, ids, cut.worldId, request.residentValues];
        const valueSql = `${wanted} SELECT v.* FROM wanted w JOIN mind_perception_values v
        ON v.world_id=? AND v.source_id=w.source_id WHERE NOT(v.source_id=ANY(?::text[]))`;
        const size = await db
          .prepare(
            `${wanted} SELECT count(*) AS wanted,count(v.source_id) AS found,
        COALESCE(sum(octet_length(v.payload)),0) AS bytes FROM wanted w
        LEFT JOIN mind_perception_values v ON v.world_id=? AND v.source_id=w.source_id
        WHERE NOT(w.source_id=ANY(?::text[]))`,
          )
          .get(...valueParameters);
        if (integer(size?.['wanted']) !== integer(size?.['found']))
          throw new Error('Personal receipt correction has missing source fragments.');
        totals.sourceBytes += integer(size?.['bytes']);
        if (totals.sourceBytes > correctionSourceBytes)
          throw new Error('Complete personal source correction exceeds bounded preparation.');
        await admit(pageSql, pageParameters);
        await admit(valueSql, valueParameters);
        const pages = ids.length
          ? await db.prepare(pageSql + ' ORDER BY actor_id,position,id').all(...pageParameters)
          : [];
        if (pages.length !== metadata.length)
          throw new Error('Native history edit lost its selected physical pages.');
        const values = await db
          .prepare(valueSql + ' ORDER BY v.parent_id,v.position,v.id')
          .all(...valueParameters);
        if (values.length !== integer(size?.['wanted']))
          throw new Error('Personal receipt correction has missing source fragments.');
        tables['mind_temporal_pages'] = pages.map((v) =>
          nativeCurrentRow('mind_temporal_pages', v),
        );
        tables['mind_perception_values'] = values.map((v) =>
          nativeCurrentRow('mind_perception_values', v),
        );
        predecessors.push(
          ...pages.map((v) => ({ id: String(v['id']), revision: integer(v['revision']) })),
        );
      } else {
        // Match Source's exact affected source rows. Their SQL ordinals remain
        // independent of the resident subset; no historical negative is inferred.
        for (const table of [
          'mind_awareness',
          'mind_memories',
          'mind_summaries',
          'activity_occurrences',
        ] as const) {
          const sql = `SELECT t.* FROM ${table} t JOIN jsonb_to_recordset(?::jsonb)
          a(actor_id text,source_id text) ON a.actor_id=t.actor_id AND a.source_id=t.source_id
          WHERE t.world_id=?`;
          const parameters = [scope, cut.worldId];
          await admit(sql, parameters);
          const rows = await db.prepare(sql + ' ORDER BY t.actor_id,t.position').all(...parameters);
          tables[table] = rows.map((v) => nativeCurrentRow(table, v));
        }
        // A privacy edit clears historical terminal appraisals too. Active-only
        // startup selection cannot certify that this private attribution is gone.
        const appraisalSql =
          'SELECT * FROM mind_appraisals WHERE world_id=? AND parent_id=ANY(?::text[])';
        const appraisalParents = actors.map((actor) =>
          JSON.stringify(['world', 'appraisals', actor]),
        );
        await admit(appraisalSql, [cut.worldId, appraisalParents]);
        tables['mind_appraisals'] = (
          await db
            .prepare(appraisalSql + ' ORDER BY parent_id,position')
            .all(cut.worldId, appraisalParents)
        ).map((v) => nativeCurrentRow('mind_appraisals', v));
        for (const table of [
          'mind_awareness',
          'mind_memories',
          'mind_summaries',
          'activity_occurrences',
          'mind_appraisals',
        ] as const) {
          const parentTable = table + '_owners';
          const rows = await db
            .prepare(
              `SELECT o.id,(SELECT position FROM ${table} t
          WHERE t.world_id=o.world_id AND t.parent_id=o.id ORDER BY position DESC LIMIT 1) AS last
          FROM ${parentTable} o WHERE o.world_id=? AND o.slot=ANY(?::text[])`,
            )
            .all(cut.worldId, actors);
          for (const row of rows)
            owners.push({
              table,
              owner: String(row['id']),
              complete: table === 'mind_appraisals',
              nextOrdinal: row['last'] == null ? 0 : integer(integer(row['last']) + 1),
              parentPresent: true,
            });
        }
      }
      return {
        binding,
        durableRevision: integer(head['revision']),
        selection: selected.map((v) => ({ actorId: v.actor_id, sourceId: v.source_id })),
        tables,
        owners,
        predecessors,
        totals,
      };
    }),
  );
}
