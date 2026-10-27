import { personalAccountRevision } from './personal-accounts.js';
import {
  accountClass,
  encodedExperienceBytes,
  ensureExperienceAccounting,
  experienceRetentionDue,
  createRememberedImpression,
  weakenImpression,
  awarenessMemory,
  summaryMemory,
  selectedTemporalPolicy,
  updateWorld,
  expireExperience,
  observationDependencies,
  selectedRecognitionMaintenanceDue,
  selectedExpireRecognitionSeeds,
  type ImpressionDependency,
  type ExperienceEntry,
  type MemoryRecord,
  type WorldState,
} from '@open-legend/domain';
import type { SavedWorld, SqlDatabase } from './store.js';
import { historyKey, historyPositions } from './history-residency.js';
import { MemoryRetentionError, type PreparedMemoryRetention } from './temporal-storage.js';
import { releaseUnusedTemporalSupports } from './retention-cleanup.js';

const tables = {
  awareness: 'mind_awareness',
  memory: 'mind_memories',
  summary: 'mind_summaries',
} as const;
type Kind = keyof typeof tables;
const maximumPreparationBytes = 4 * 1024 * 1024;
interface Candidate {
  kind: Kind;
  id: string;
  recordId: string;
  at: number;
  bytes: number;
  category: 'optional' | 'required' | 'speech';
  position: number;
  due: number | null;
  active: boolean;
  rank: number;
  value?: ExperienceEntry;
}
const entryId = (entry: ExperienceEntry) =>
  entry.source === 'awareness' ? entry.value.eventId : entry.value.id;
const recordId = (actorId: string, kind: Kind, id: string) =>
  JSON.stringify(
    kind === 'memory'
      ? ['world', 'memories', actorId, id]
      : ['world', 'experience', kind === 'awareness' ? 'awareness' : 'summaries', actorId, id],
  );
const sourceEntries = (world: WorldState, actorId: string): ExperienceEntry[] => [
  ...(world.experience?.awareness[actorId] ?? []).map((value) => ({
    source: 'awareness' as const,
    value,
  })),
  ...(world.memories[actorId] ?? []).map((value) => ({ source: 'memory' as const, value })),
  ...(world.experience?.summaries[actorId] ?? []).map((value) => ({
    source: 'summary' as const,
    value,
  })),
];
const retentionRank = (reason: unknown) =>
  reason === 'deliberate' ? 2 : reason === 'consequence' || reason === 'learning' ? 1 : 0;
const active = (entry: ExperienceEntry) =>
  entry.source === 'memory' &&
  (entry.value.obligation?.status === 'active' ||
    (entry.value.kind === 'commitment' && !entry.value.resolved));

/** Lasting records use the same exact source tables and mutation owner. Retired
 * records are physically reclaimed by the encompassing world transaction. */
export async function prepareAccountRetention(
  db: SqlDatabase,
  state: SavedWorld,
  complete = false,
  pendingDeletes?: ReadonlyMap<string, readonly string[]>,
): Promise<PreparedMemoryRetention> {
  const policy = selectedTemporalPolicy(state.world),
    now = state.world.simTime;
  const rows = new Map<string, string[]>(),
    positions = new Map<string, Map<string, number>>();
  let world = state.world;
  for (const actorId of Object.keys(world.experience?.temporal?.actors ?? {})) {
    let accounts = world.experience!.temporal!.actors[actorId]!.accounts;
    if (!accounts) {
      const totals = complete
        ? []
        : await db
            .prepare(
              `SELECT category,SUM(bytes) AS bytes,SUM(count) AS count FROM (
        ${Object.values(tables)
          .map(
            (table) =>
              `SELECT retention_class AS category,SUM(logical_bytes) AS bytes,COUNT(*) AS count FROM ${table} WHERE world_id=? AND actor_id=? GROUP BY retention_class`,
          )
          .join(' UNION ALL ')}
        UNION ALL SELECT CASE WHEN required=1 THEN 'required' ELSE 'optional' END AS category,SUM(logical_bytes) AS bytes,COUNT(*) AS count FROM mind_temporal_supports WHERE world_id=? AND actor_id=? GROUP BY required
        UNION ALL SELECT 'required' AS category,SUM(octet_length(payload)) AS bytes,COUNT(*) AS count FROM mind_learned_capabilities WHERE world_id=? AND actor_id=? AND payload::jsonb->>'source'<>'authored'
        UNION ALL SELECT 'optional' AS category,SUM(octet_length(payload)) AS bytes,COUNT(*) AS count FROM mind_knowledge_documents WHERE world_id=? AND actor_id=? AND payload::jsonb->>'origin'='actor-edit'
        UNION ALL SELECT 'optional' AS category,SUM(octet_length(payload)) AS bytes,COUNT(*) AS count FROM mind_recognition WHERE world_id=? AND parent_id=? AND payload::jsonb->>'retained'='true' AND COALESCE(payload::jsonb->>'authored','false')<>'true'
        UNION ALL SELECT retention_class AS category,SUM(logical_bytes) AS bytes,COUNT(*) AS count FROM mind_source_versions WHERE world_id=? AND source_kind IN ('awareness','memory','summary') AND actor_id=? GROUP BY retention_class
      ) totals GROUP BY category`,
            )
            .all(
              ...Object.values(tables).flatMap(() => [world.id, actorId]),
              world.id,
              actorId,
              world.id,
              actorId,
              world.id,
              actorId,
              world.id,
              JSON.stringify(['world', 'observerIdentities', actorId]),
              world.id,
              actorId,
            );
      world = updateWorld(world, (draft) => {
        ensureExperienceAccounting(draft, actorId);
        const value = draft.experience!.temporal!.actors[actorId]!.accounts!;
        if (totals.length)
          for (const category of ['optional', 'required', 'speech'] as const) {
            const found = totals.find((row) => row['category'] === category);
            value[category] = {
              bytes: Number(found?.['bytes'] ?? 0),
              count: Number(found?.['count'] ?? 0),
            };
          }
        value.nextDue = 0;
      });
      accounts = world.experience!.temporal!.actors[actorId]!.accounts!;
    }
    if (
      (accounts.nextDue === null || accounts.nextDue > now) &&
      (['optional', 'required', 'speech'] as const).every(
        (key) =>
          accounts![key].bytes <= policy[key].maxBytes &&
          accounts![key].count <= policy[key].maxRecords,
      )
    )
      continue;
    const priorSupportIds = Object.keys(
      world.experience!.temporal!.actors[actorId]!.supports ?? {},
    );
    world = updateWorld(world, (draft) => {
      selectedExpireRecognitionSeeds(draft, actorId);
    });
    const released = await releaseUnusedTemporalSupports(
      db,
      { ...state, world },
      actorId,
      complete,
    );
    world = released.state.world;
    if (released.ids.length)
      rows.set('mind_temporal_supports', [
        ...(rows.get('mind_temporal_supports') ?? []),
        ...released.ids,
      ]);
    accounts = world.experience!.temporal!.actors[actorId]!.accounts!;
    const metadata = complete
      ? []
      : await db
          .prepare(
            `SELECT * FROM (
      ${Object.entries(tables)
        .map(
          ([kind, table]) =>
            `SELECT '${kind}' AS source_kind,id,source_id,at,logical_bytes,retention_class,retention_reason,position,${kind === 'memory' ? 'expires_at,weaken_at,unresolved' : 'NULL::double precision AS expires_at,NULL::double precision AS weaken_at,0::bigint AS unresolved'} FROM ${table} WHERE world_id=? AND actor_id=?`,
        )
        .join(' UNION ALL ')}
      ) candidates ORDER BY at,source_kind,source_id LIMIT 8193`,
          )
          .all(...Object.values(tables).flatMap(() => [world.id, actorId]));
    if (metadata.length > 8192)
      throw new MemoryRetentionError(
        'Personal memory maintenance exceeds its complete preparation allowance.',
      );
    const candidates = new Map<string, Candidate>();
    for (const row of metadata) {
      const kind = row['source_kind'] as Kind,
        id = String(row['source_id']);
      if (pendingDeletes?.get(tables[kind])?.includes(String(row['id']))) continue;
      candidates.set(JSON.stringify([kind, id]), {
        kind,
        id,
        recordId: String(row['id']),
        at: Number(row['at']),
        bytes: Number(row['logical_bytes']),
        category: row['retention_class'] as Candidate['category'],
        position: Number(row['position']),
        rank: retentionRank(row['retention_reason']),
        active: row['unresolved'] === 1,
        due:
          row['expires_at'] !== null
            ? Math.min(Number(row['weaken_at'] ?? Infinity), Number(row['expires_at']))
            : row['retention_class'] === 'speech' || row['unresolved'] === 1
              ? null
              : Number(row['at']) +
                (row['retention_class'] === 'required'
                  ? policy.aftermathSeconds
                  : policy.recent.maxAgeSeconds),
      });
    }
    for (const entry of sourceEntries(world, actorId)) {
      const kind = entry.source,
        id = entryId(entry),
        key = JSON.stringify([kind, id]);
      const old = candidates.get(key);
      candidates.set(key, {
        kind,
        id,
        recordId: recordId(actorId, kind, id),
        at:
          kind === 'summary'
            ? (entry as Extract<ExperienceEntry, { source: 'summary' }>).value.to
            : (entry as Exclude<ExperienceEntry, { source: 'summary' }>).value.at,
        bytes: encodedExperienceBytes(entry),
        category: accountClass(entry),
        position: old?.position ?? Number.MAX_SAFE_INTEGER,
        due: experienceRetentionDue(world, entry),
        rank: retentionRank(
          entry.source === 'memory'
            ? (entry.value.impression?.reason ?? entry.value.retention?.reason)
            : entry.value.retention?.reason,
        ),
        active: active(entry),
        value: entry,
      });
    }
    const projected = structuredClone(accounts),
      selectedCandidates: Candidate[] = [];
    const ordered = [...candidates.values()].sort(
      (a, b) =>
        a.rank - b.rank || a.at - b.at || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id),
    );
    let nextDue: number | null = selectedRecognitionMaintenanceDue(world, actorId);
    for (const candidate of ordered) {
      const budget = policy[candidate.category],
        pressure =
          projected[candidate.category].bytes > budget.maxBytes ||
          projected[candidate.category].count > budget.maxRecords;
      if (candidate.active) continue;
      if (pressure || (candidate.due !== null && candidate.due <= now)) {
        selectedCandidates.push(candidate);
        projected[candidate.category].bytes -= candidate.bytes;
        projected[candidate.category].count--;
      } else if (candidate.due !== null) nextDue = Math.min(nextDue ?? Infinity, candidate.due);
    }
    if (
      (['optional', 'required', 'speech'] as const).some(
        (key) =>
          projected[key].bytes > policy[key].maxBytes ||
          projected[key].count > policy[key].maxRecords,
      )
    )
      throw new MemoryRetentionError('Active personal support exceeds reserved durable capacity.');
    const totals = structuredClone(accounts);
    for (let offset = 0; offset < selectedCandidates.length; ) {
      const batch: Candidate[] = [];
      let coldBytes = 0;
      while (offset < selectedCandidates.length) {
        const candidate = selectedCandidates[offset]!;
        const bytes = candidate.value ? 0 : candidate.bytes;
        if (batch.length && coldBytes + bytes > maximumPreparationBytes) break;
        if (bytes > maximumPreparationBytes)
          throw new MemoryRetentionError('One personal memory exceeds bounded preparation.');
        batch.push(candidate);
        coldBytes += bytes;
        offset++;
      }
      // Independent retained pools can together exceed one bounded read. Retire
      // their selected bodies a batch at a time in this same prepared world; only
      // the encompassing world transaction publishes their combined effects.
      let preparationBytes = 0;
      const hydrated: Candidate[] = [];
      for (const kind of Object.keys(tables) as Kind[]) {
        const needed = batch.filter((candidate) => candidate.kind === kind && !candidate.value);
        const ids = needed.map((candidate) => candidate.recordId);
        if (!ids.length) continue;
        const size = await db
          .prepare(
            `SELECT SUM(octet_length(payload)) AS bytes FROM ${tables[kind]} WHERE world_id=? AND id=ANY(?::text[])`,
          )
          .get(world.id, ids);
        preparationBytes += Number(size?.['bytes'] ?? 0);
        if (preparationBytes > maximumPreparationBytes)
          throw new MemoryRetentionError('Personal memory retention exceeds bounded preparation.');
        for (const row of await db
          .prepare(
            `SELECT source_id,payload FROM ${tables[kind]} WHERE world_id=? AND actor_id=? AND id=ANY(?::text[])`,
          )
          .all(world.id, actorId, ids)) {
          const candidate = candidates.get(JSON.stringify([kind, String(row['source_id'])]));
          if (candidate) {
            candidate.value = {
              source: kind,
              value: JSON.parse(String(row['payload'])),
            } as ExperienceEntry;
            hydrated.push(candidate);
          }
        }
      }
      const expired: ExperienceEntry[] = [],
        replacements: MemoryRecord[] = [];
      for (const candidate of batch) {
        const entry = candidate.value;
        if (!entry)
          throw new MemoryRetentionError('Selected personal memory disappeared before retention.');
        const category = accountClass(entry);
        let replacement: MemoryRecord | undefined;
        if (entry.source === 'memory' && entry.value.impression)
          replacement = weakenImpression(entry.value, now);
        else if (entry.value.retention?.receipt) {
          const locator = entry.value.retention.receipt;
          const record =
            entry.source === 'awareness'
              ? awarenessMemory(entry.value)
              : entry.source === 'summary'
                ? summaryMemory(entry.value, actorId)
                : entry.value;
          const locators =
            entry.source === 'summary'
              ? (entry.value.manifest.receipts ?? [])
              : entry.source === 'memory' && entry.value.manifest
                ? (entry.value.manifest.receipts ?? [])
                : [locator];
          const spans = new Map<
            string,
            {
              actorId: string;
              physicalLife: number;
              epoch: string;
              family: 'temporal-receipt';
              from: number;
              through: number;
            }
          >();
          for (const receipt of locators) {
            const key = JSON.stringify([receipt.actorId, receipt.physicalLife, receipt.epoch]),
              prior = spans.get(key);
            if (prior) {
              prior.from = Math.min(prior.from, receipt.ordinal);
              prior.through = Math.max(prior.through, receipt.ordinal);
            } else
              spans.set(key, {
                actorId,
                physicalLife: receipt.physicalLife,
                epoch: receipt.epoch,
                family: 'temporal-receipt',
                from: receipt.ordinal,
                through: receipt.ordinal,
              });
          }
          const personal = {
            kind: entry.source,
            id: entryId(entry),
            revision: personalAccountRevision(JSON.stringify(entry.value)),
          };
          const observations =
            entry.source === 'awareness'
              ? [
                  ...(entry.value.observation ? [entry.value.observation] : []),
                  ...(entry.value.observations ?? []),
                ]
              : (record.manifest?.observations ?? [
                  ...(record.observation ? [record.observation] : []),
                  ...(record.observations ?? []),
                  ...(record.evidence?.observation ? [record.evidence.observation] : []),
                  ...(record.evidence?.observations ?? []),
                ]);
          const dependencies: ImpressionDependency[] = [
            personal,
            ...(record.manifest?.coverage ?? []),
            ...(entry.source === 'summary' ? entry.value.sources : []),
            ...observationDependencies(observations),
          ];
          replacement = createRememberedImpression(
            record,
            [...spans.values()],
            now,
            policy.impression,
            [...new Map(dependencies.map((source) => [JSON.stringify(source), source])).values()],
          );
        }
        // Pressure may discard a preferred recollection. It never creates a second
        // quota or keeps a larger exact record behind a short rendered account.
        totals[category].bytes -= candidate.bytes;
        totals[category].count--;
        if (replacement) {
          const bytes = encodedExperienceBytes({ source: 'memory', value: replacement });
          if (
            totals.optional.bytes + bytes <= policy.optional.maxBytes &&
            totals.optional.count + 1 <= policy.optional.maxRecords
          ) {
            replacements.push(replacement);
            totals.optional.bytes += bytes;
            totals.optional.count++;
            const next = experienceRetentionDue(world, { source: 'memory', value: replacement });
            if (next !== null) nextDue = Math.min(nextDue ?? Infinity, next);
          }
        }
        expired.push(entry);
        const table = tables[entry.source];
        let retired = rows.get(table);
        if (!retired) rows.set(table, (retired = []));
        retired.push(candidate.recordId);
        if (candidate.position !== Number.MAX_SAFE_INTEGER) {
          const selected = positions.get(table) ?? new Map<string, number>();
          selected.set(candidate.recordId, candidate.position);
          positions.set(table, selected);
        }
      }
      world = updateWorld(world, (draft) => {
        // Residency is preparation only: preserve exact SQL positions on the selected
        // old bodies so removing them cannot renumber untouched cold history.
        for (const kind of Object.keys(tables) as Kind[]) {
          const old =
            kind === 'memory'
              ? (draft.memories[actorId] ?? [])
              : kind === 'awareness'
                ? (draft.experience!.awareness[actorId] ?? [])
                : (draft.experience!.summaries[actorId] ?? []);
          const placement = historyPositions.get(old),
            positions = new Map(
              placement?.positions ?? old.map((value, index) => [historyKey(value), index]),
            );
          const merged = new Map(old.map((value) => [historyKey(value), value]));
          for (const candidate of batch)
            if (candidate.kind === kind && candidate.value) {
              merged.set(candidate.id, candidate.value.value);
              positions.set(candidate.id, candidate.position);
            }
          const values = [...merged.values()].sort(
            (a, b) => (positions.get(historyKey(a)) ?? 0) - (positions.get(historyKey(b)) ?? 0),
          );
          historyPositions.set(values, {
            positions,
            next:
              placement?.next ??
              Math.max(
                0,
                ...metadata
                  .filter((row) => row['source_kind'] === kind)
                  .map((row) => Number(row['position']) + 1),
              ),
            complete: placement?.complete,
          });
          if (kind === 'memory')
            draft.memories[actorId] = values as (typeof draft.memories)[string];
          else if (kind === 'awareness')
            draft.experience!.awareness[actorId] = values as NonNullable<
              typeof draft.experience
            >['awareness'][string];
          else
            draft.experience!.summaries[actorId] = values as NonNullable<
              typeof draft.experience
            >['summaries'][string];
        }
        if (!expireExperience(draft, actorId, expired, replacements))
          throw new MemoryRetentionError('Personal memory changed before retention installation.');
      });
      for (const candidate of hydrated) delete candidate.value;
    }
    world = updateWorld(world, (draft) => {
      draft.experience!.temporal!.actors[actorId]!.accounts!.nextDue = nextDue;
    });
    const finalSupports = await releaseUnusedTemporalSupports(
      db,
      { ...state, world },
      actorId,
      complete,
      Object.values(tables).flatMap((table) => rows.get(table) ?? []),
    );
    world = finalSupports.state.world;
    const remaining = world.experience!.temporal!.actors[actorId]!.supports ?? {};
    const removed = priorSupportIds
      .filter((id) => !remaining[id])
      .map((id) =>
        JSON.stringify(['world', 'experience', 'temporal', 'actors', actorId, 'supports', id]),
      );
    if (removed.length)
      rows.set('mind_temporal_supports', [
        ...new Set([
          ...(rows.get('mind_temporal_supports') ?? []),
          ...removed,
          ...finalSupports.ids,
        ]),
      ]);
  }
  return { state: world === state.world ? state : { ...state, world }, rows, positions };
}
