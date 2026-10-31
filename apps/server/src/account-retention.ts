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
  hasMemory,
  entityGet,
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
import type { RetentionMetadataView } from './retention-metadata.js';

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
  ...(world.experience?.awareness[actorId] ?? [])
    .filter((value) => value.retentionClass !== 'sensory')
    .map((value) => ({
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
  retainedMetadata?: RetentionMetadataView,
): Promise<PreparedMemoryRetention> {
  if (!retainedMetadata)
    throw new MemoryRetentionError('Complete personal retention metadata is unavailable.');
  const policy = selectedTemporalPolicy(state.world),
    now = state.world.simTime;
  const rows = new Map<string, string[]>(),
    positions = new Map<string, Map<string, number>>();
  let world = state.world;
  for (const actorId of Object.keys(world.experience?.temporal?.actors ?? {})) {
    let accounts = world.experience!.temporal!.actors[actorId]!.accounts;
    if (!accounts) {
      const totals = new Map<string, { bytes: number; count: number }>();
      if (retainedMetadata)
        for (const table of Object.values(tables))
          for (const row of retainedMetadata.rows(table, actorId)) {
            const category = String(row.columns['retention_class']);
            if (category === 'sensory') continue;
            const total = totals.get(category) ?? { bytes: 0, count: 0 };
            total.bytes += Number(row.columns['logical_bytes']);
            total.count++;
            totals.set(category, total);
          }
      world = updateWorld(
        world,
        (draft) => {
          ensureExperienceAccounting(draft, actorId);
          const value = draft.experience!.temporal!.actors[actorId]!.accounts!;
          if (retainedMetadata) {
            for (const entry of sourceEntries(world, actorId)) {
              const total = value[accountClass(entry)];
              total.bytes -= encodedExperienceBytes(entry);
              total.count--;
            }
            for (const category of ['optional', 'required', 'speech'] as const) {
              const total = totals.get(category);
              value[category].bytes += total?.bytes ?? 0;
              value[category].count += total?.count ?? 0;
            }
            const archives = {
              optional: { bytes: 0, count: 0 },
              required: { bytes: 0, count: 0 },
              speech: { bytes: 0, count: 0 },
            };
            for (const version of retainedMetadata.sourceVersions(actorId)) {
              archives[version.category].bytes += version.bytes;
              archives[version.category].count++;
              value[version.category].bytes += version.bytes;
              value[version.category].count++;
            }
            value.archives = archives;
          }
          value.nextDue = 0;
        },
        { retainNativeValues: true },
      );
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
    world = updateWorld(
      world,
      (draft) => {
        selectedExpireRecognitionSeeds(draft, actorId);
      },
      { retainNativeValues: true },
    );
    const released = releaseUnusedTemporalSupports({ ...state, world }, actorId, retainedMetadata);
    world = released.state.world;
    if (released.ids.length)
      rows.set('mind_temporal_supports', [
        ...(rows.get('mind_temporal_supports') ?? []),
        ...released.ids,
      ]);
    accounts = world.experience!.temporal!.actors[actorId]!.accounts!;
    const metadata = complete
      ? []
      : retainedMetadata
        ? Object.entries(tables).flatMap(([kind, table]) =>
            [
              ...retainedMetadata.rows(
                table as 'mind_awareness' | 'mind_memories' | 'mind_summaries',
                actorId,
              ),
            ]
              .filter((row) => row.columns['retention_class'] !== 'sensory')
              .map<Record<string, unknown>>((row) => ({
                expires_at: null,
                weaken_at: null,
                unresolved: 0,
                ...row.columns,
                id: row.id,
                position: row.position,
                source_kind: kind,
              })),
          )
        : [];
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
        active: Number(row['unresolved']) === 1,
        due:
          row['expires_at'] !== null
            ? Math.min(Number(row['weaken_at'] ?? Infinity), Number(row['expires_at']))
            : row['retention_class'] === 'speech' || Number(row['unresolved']) === 1
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
        preparationBytes += needed.reduce((bytes, candidate) => bytes + candidate.bytes, 0);
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
      const canRecall = hasMemory(entityGet(world.entities, actorId));
      const expired: ExperienceEntry[] = [],
        replacements: MemoryRecord[] = [];
      for (const candidate of batch) {
        const entry = candidate.value;
        if (!entry)
          throw new MemoryRetentionError('Selected personal memory disappeared before retention.');
        const category = accountClass(entry);
        let replacement: MemoryRecord | undefined;
        if (canRecall && entry.source === 'memory' && entry.value.impression)
          replacement = weakenImpression(entry.value, now);
        else if (canRecall && entry.value.retention?.receipt) {
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
      world = updateWorld(
        world,
        (draft) => {
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
            throw new MemoryRetentionError(
              'Personal memory changed before retention installation.',
            );
        },
        { retainNativeValues: true },
      );
      for (const candidate of hydrated) delete candidate.value;
    }
    world = updateWorld(
      world,
      (draft) => {
        draft.experience!.temporal!.actors[actorId]!.accounts!.nextDue = nextDue;
      },
      { retainNativeValues: true },
    );
    const finalSupports = releaseUnusedTemporalSupports(
      { ...state, world },
      actorId,
      retainedMetadata,
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
