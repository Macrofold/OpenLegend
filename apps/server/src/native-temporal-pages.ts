import type { LiveReadCuts } from './live-read-overlay.js';
import { nativeCurrentRow } from './native-current-sources.js';
import type { SqlDatabase } from './store.js';
import {
  maximumTemporalPreparationBytes,
  maximumTemporalPreparationRows,
} from './temporal-storage.js';
import { RECORD_NODES } from './world-record-schema.js';

export interface NativeTemporalPageReadRequest {
  readonly binding: {
    readonly worldId: string;
    readonly generation: string;
    readonly acceptedCut: number;
    readonly identityThrough: number;
    readonly candidateId: number;
    readonly candidateGeneration: number;
    readonly requestSerial: number;
  };
  readonly actorId: string;
}

/** A privacy preparation reads the existing packed live projection. The host
 * retains this exact cut and its save-prefix custody under its preparing fence;
 * this read neither acknowledges a save nor invents a physical page identity. */
export async function readNativeTemporalPages(
  db: SqlDatabase,
  request: NativeTemporalPageReadRequest,
  cut: LiveReadCuts,
) {
  const { binding, actorId } = request;
  if (
    !db.readAtCut ||
    !db.readTransaction ||
    !actorId ||
    binding.worldId !== cut.worldId ||
    binding.generation !== cut.generation ||
    binding.acceptedCut !== cut.sequence ||
    [
      binding.identityThrough,
      binding.candidateId,
      binding.candidateGeneration,
      binding.requestSerial,
    ].some((value) => !Number.isSafeInteger(value) || value < 0)
  )
    throw new Error('Native temporal preparation requires its exact accepted live cut.');
  return db.readAtCut(cut, () =>
    db.readTransaction!(async () => {
      const head = await db
        .prepare('SELECT world_id,generation,revision FROM world_head WHERE id=1')
        .get();
      if (!head || head['world_id'] !== cut.worldId || head['generation'] !== cut.storageGeneration)
        throw new Error('Native temporal preparation lost its durable read witness.');
      const world = await db
        .prepare('SELECT payload FROM world_settings WHERE world_id=? AND id=?')
        .get(cut.worldId, '["world"]');
      const header =
        world && (JSON.parse(String(world['payload'])) as { id?: unknown; nextId?: unknown });
      if (header?.id !== binding.worldId || header.nextId !== binding.identityThrough)
        throw new Error('Native temporal projection differs from its accepted identity highwater.');
      const owner = JSON.stringify(['world', 'experience', 'temporal', 'actors', actorId]);
      const actor = await db
        .prepare('SELECT payload FROM mind_temporal_actors WHERE world_id=? AND id=?')
        .get(cut.worldId, owner);
      const marker = actor && (JSON.parse(String(actor['payload'])) as { pages?: unknown });
      if (!Array.isArray(marker?.pages) || marker.pages.length)
        throw new Error('Native temporal preparation has no current canonical page owner.');
      const size = await db
        .prepare(
          'SELECT count(*) AS count,COALESCE(sum(octet_length(payload)),0) AS bytes FROM mind_temporal_pages WHERE world_id=? AND actor_id=?',
        )
        .get(cut.worldId, actorId);
      // Rich bodies can be cold after a successful save. Select their exact
      // current page references inside this same live projection; consulting
      // the resident native pool would resurrect an older/deleted overlay row.
      const valueSelection = `WITH wanted AS MATERIALIZED (
        SELECT DISTINCT unnest(value_refs) AS source_id FROM mind_temporal_pages
        WHERE world_id=? AND actor_id=?
      )`;
      const valueSize = await db
        .prepare(
          `${valueSelection}
        SELECT count(*) AS wanted,count(v.source_id) AS found,
          COALESCE(sum(octet_length((v.payload::json->'value')::text)),0) AS bytes
        FROM wanted w LEFT JOIN mind_perception_values v
          ON v.world_id=? AND v.source_id=w.source_id`,
        )
        .get(cut.worldId, actorId, cut.worldId);
      if (
        !size ||
        !valueSize ||
        Number(valueSize['wanted']) !== Number(valueSize['found']) ||
        Number(size['count']) > maximumTemporalPreparationRows ||
        Number(valueSize['wanted']) > maximumTemporalPreparationRows ||
        Number(size['bytes']) + Number(valueSize['bytes']) > maximumTemporalPreparationBytes
      )
        throw new Error('Native temporal preparation exceeds the existing history read allowance.');
      const columns = Object.keys(RECORD_NODES.get('mind_temporal_pages')!.columns!);
      const rows = await db
        .prepare(
          `SELECT id,parent_id,slot,position,payload,${columns.join(',')} FROM mind_temporal_pages WHERE world_id=? AND actor_id=? ORDER BY position,id`,
        )
        .all(cut.worldId, actorId);
      const valueColumns = Object.keys(RECORD_NODES.get('mind_perception_values')!.columns!);
      const receivedValues = await db
        .prepare(
          `${valueSelection}
        SELECT v.id,v.parent_id,v.slot,v.position,v.payload,${valueColumns.map((name) => `v.${name}`).join(',')}
        FROM wanted w JOIN mind_perception_values v
          ON v.world_id=? AND v.source_id=w.source_id ORDER BY v.parent_id,v.position,v.id`,
        )
        .all(cut.worldId, actorId, cut.worldId);
      if (receivedValues.length !== Number(valueSize['wanted']))
        throw new Error('Native temporal preparation lost its exact shared-value closure.');
      return {
        binding,
        durableRevision: Number(head['revision']),
        coverage: {
          table: 'mind_temporal_pages',
          owner,
          complete: true,
          nextOrdinal: binding.identityThrough,
          parentPresent: true,
        },
        rows: rows.map((row) => nativeCurrentRow('mind_temporal_pages', row)),
        receivedValues: receivedValues.map((row) =>
          nativeCurrentRow('mind_perception_values', row),
        ),
      };
    }),
  );
}
