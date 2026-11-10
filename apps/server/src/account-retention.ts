import type { SourceVersionPlan } from './source-version-retention.js';
import { personalAccountRevision, personalAccountRecordId } from './personal-accounts.js';
import {
  accountClass,
  encodedExperienceBytes,
  ensureExperienceAccounting,
  experienceRetentionDue,
  experienceMaintenanceTarget,
  experienceMaintenancePressure,
  markRequiredExperienceMaintenance,
  createRememberedImpression,
  weakenImpression,
  awarenessMemory,
  summaryMemory,
  selectedTemporalPolicy,
  selectedAccountRetentionSelection,
  updateWorld,
  expireExperience,
  hasMemory,
  entityGet,
  observationDependencies,
  selectedExpireRecognitionSeeds,
  maintainRecognitionKnowledge,
  releaseTemporalSupport,
  settleTemporalSupportCleanup,
  temporalSupportAliases,
  invalidateKnownPlaceEvidence,
  knownPlaceEvidenceRevision,
  type ImpressionDependency,
  type ExperienceEntry,
  type MemoryRecord,
  type TemporalActorHistory,
  type WorldState,
} from '@open-legend/domain';
import type { SavedWorld, SqlDatabase } from './store.js';
import { historyKey, historyPositions } from './history-residency.js';
import { MemoryRetentionError, type PreparedMemoryRetention } from './temporal-storage.js';
import {
  releaseUnusedTemporalSupports,
  unusedSupportCandidates,
  unreferencedSupports,
  locallyHeldSupportAliases,
  supportLocallyRequired,
  type ReadSupportMembership,
} from './retention-cleanup.js';
import type { RetentionMetadataView } from './retention-metadata.js';
import type { RetainedSourceChanges } from './retention-record-metadata.js';
import { sqlRowBatches } from './sql-rows.js';

const tables = {
  awareness: 'mind_awareness',
  memory: 'mind_memories',
  summary: 'mind_summaries',
} as const;
type Kind = keyof typeof tables;
export const ACCOUNT_RETENTION_PREPARATION = Object.freeze({
  rows: 64,
  bytes: 4 * 1024 * 1024,
  metadataRows: 8192,
});
const maximumPreparationBytes = ACCOUNT_RETENTION_PREPARATION.bytes;
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

/** Lasting records use the same exact source tables and mutation owner. Retired
 * records are physically reclaimed by the encompassing world transaction. */
export async function prepareAccountRetention(
  db: SqlDatabase,
  state: SavedWorld,
  complete = false,
  pendingDeletes?: ReadonlyMap<string, readonly string[]>,
  retainedMetadata?: RetentionMetadataView,
  actorIds: readonly string[] = Object.keys(state.world.experience?.temporal?.actors ?? {}),
): Promise<PreparedMemoryRetention> {
  if (!retainedMetadata)
    throw new MemoryRetentionError('Complete personal retention metadata is unavailable.');
  const policy = selectedTemporalPolicy(state.world),
    now = state.world.simTime;
  const rows = new Map<string, string[]>(),
    positions = new Map<string, Map<string, number>>(),
    previous = new Map<string, Map<string, unknown>>();
  let world = state.world;
  const bodyReads: Array<{ actorId: string; candidate: Candidate }> = [];
  const applications: Array<{ actorId: string; apply: () => Promise<void> }> = [];
  const priorSupports = new Map(
    (complete ? actorIds : []).map((actorId) => [
      actorId,
      Object.keys(world.experience?.temporal?.actors[actorId]?.supports ?? {}),
    ]),
  );
  if (complete)
    world = updateWorld(
      world,
      (draft) => {
        for (const actorId of actorIds)
          if (draft.experience?.temporal?.actors[actorId]?.accounts)
            maintainRecognitionKnowledge(draft, actorId);
          else selectedExpireRecognitionSeeds(draft, actorId);
      },
      { retainNativeValues: true },
    );
  const prepareActor = async (actorId: string) => {
    let accounts = world.experience!.temporal!.actors[actorId]!.accounts;
    if (!accounts) {
      world = updateWorld(
        world,
        (draft) => {
          ensureExperienceAccounting(draft, actorId);
          const value = draft.experience!.temporal!.actors[actorId]!.accounts!;
          value.nextDue = 0;
        },
        { retainNativeValues: true },
      );
      accounts = world.experience!.temporal!.actors[actorId]!.accounts!;
    }
    if (
      (accounts.nextDue === null || accounts.nextDue > now) &&
      (['optional', 'required', 'speech'] as const).every(
        (key) => !experienceMaintenancePressure(world, key, accounts![key], 'start'),
      )
    )
      return;
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
    if (metadata.length > ACCOUNT_RETENTION_PREPARATION.metadataRows)
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
        rank: Number(row['policy_priority']),
        active: Number(row['active_or_protected']) === 1,
        due: row['next_due_at'] === null ? null : Number(row['next_due_at']),
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
        recordId: personalAccountRecordId(actorId, kind, id),
        at:
          kind === 'summary'
            ? (entry as Extract<ExperienceEntry, { source: 'summary' }>).value.to
            : (entry as Exclude<ExperienceEntry, { source: 'summary' }>).value.at,
        bytes: encodedExperienceBytes(entry),
        category: accountClass(entry),
        position: old?.position ?? Number.MAX_SAFE_INTEGER,
        due: experienceRetentionDue(world, entry),
        rank: selectedAccountRetentionSelection(world, entry).priority,
        active: selectedAccountRetentionSelection(world, entry).protected,
        value: entry,
      });
    }
    const projected = structuredClone(accounts),
      selectedCandidates: Candidate[] = [];
    const ordered = [...candidates.values()].sort(
      (a, b) =>
        a.rank - b.rank ||
        a.at - b.at ||
        (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0) ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );
    let nextDue: number | null = null;
    const savedDeadline = retainedMetadata.accountDeadline(actorId);
    if (savedDeadline !== null) nextDue = Math.min(nextDue ?? Infinity, savedDeadline);
    let moreCandidates = false,
      selectedBytes = 0;
    for (const candidate of ordered) {
      const budget = experienceMaintenanceTarget(world, candidate.category, 'stop'),
        pressure =
          projected[candidate.category].bytes > budget.maxBytes ||
          projected[candidate.category].count > budget.maxRecords;
      if (candidate.active) continue;
      if (pressure || (candidate.due !== null && candidate.due <= now)) {
        if (candidate.bytes > maximumPreparationBytes)
          throw new MemoryRetentionError('One personal memory exceeds bounded preparation.');
        if (
          selectedCandidates.length === ACCOUNT_RETENTION_PREPARATION.rows ||
          selectedBytes + candidate.bytes > maximumPreparationBytes
        ) {
          moreCandidates = true;
          break;
        }
        selectedCandidates.push(candidate);
        selectedBytes += candidate.bytes;
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
      moreCandidates = true;
    if (
      retainedMetadata.moreAccountCandidates(actorId) &&
      ((accounts.nextDue !== null && accounts.nextDue <= now) ||
        (['optional', 'required', 'speech'] as const).some(
          (pool) =>
            projected[pool].bytes > experienceMaintenanceTarget(world, pool, 'stop').maxBytes ||
            projected[pool].count > experienceMaintenanceTarget(world, pool, 'stop').maxRecords,
        ))
    )
      moreCandidates = true;
    for (const candidate of selectedCandidates)
      if (!candidate.value) bodyReads.push({ actorId, candidate });
    applications.push({
      actorId,
      apply: async () => {
        const totals = structuredClone(accounts);
        if (selectedCandidates.length) {
          // Selection already applies the single per-actor account/byte allowance;
          // table-batched hydration does not multiply it by retention class.
          const batch = selectedCandidates;
          const canRecall = hasMemory(entityGet(world.entities, actorId));
          const expired: ExperienceEntry[] = [],
            replacements: MemoryRecord[] = [];
          for (const candidate of batch) {
            const entry = candidate.value;
            if (!entry)
              throw new MemoryRetentionError(
                'Selected personal memory disappeared before retention.',
              );
            const category = accountClass(entry);
            let replacement: MemoryRecord | undefined;
            if (canRecall && entry.source === 'memory' && entry.value.impression)
              replacement = weakenImpression(entry.value, now);
            else if (
              canRecall &&
              entry.value.retention?.afterRelease === 'impression' &&
              entry.value.retention.receipt
            ) {
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
                  from: { batchOrder: number; entryIndex: number };
                  through: { batchOrder: number; entryIndex: number };
                }
              >();
              for (const receipt of locators) {
                const key = JSON.stringify([receipt.actorId, receipt.physicalLife, receipt.epoch]),
                  prior = spans.get(key);
                if (prior) {
                  const position = {
                    batchOrder: receipt.batchOrder,
                    entryIndex: receipt.entryIndex,
                  };
                  if (
                    position.batchOrder < prior.from.batchOrder ||
                    (position.batchOrder === prior.from.batchOrder &&
                      position.entryIndex < prior.from.entryIndex)
                  )
                    prior.from = position;
                  if (
                    position.batchOrder > prior.through.batchOrder ||
                    (position.batchOrder === prior.through.batchOrder &&
                      position.entryIndex > prior.through.entryIndex)
                  )
                    prior.through = position;
                } else
                  spans.set(key, {
                    actorId,
                    physicalLife: receipt.physicalLife,
                    epoch: receipt.epoch,
                    family: 'temporal-receipt',
                    from: { batchOrder: receipt.batchOrder, entryIndex: receipt.entryIndex },
                    through: { batchOrder: receipt.batchOrder, entryIndex: receipt.entryIndex },
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
                [
                  ...new Map(
                    dependencies.map((source) => [JSON.stringify(source), source]),
                  ).values(),
                ],
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
                const next = experienceRetentionDue(world, {
                  source: 'memory',
                  value: replacement,
                });
                if (next !== null) nextDue = Math.min(nextDue ?? Infinity, next);
              }
            }
            expired.push(entry);
            const table = tables[entry.source];
            let originals = previous.get(table);
            if (!originals) previous.set(table, (originals = new Map()));
            originals.set(candidate.recordId, entry.value);
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
                  (a, b) =>
                    (positions.get(historyKey(a)) ?? 0) - (positions.get(historyKey(b)) ?? 0),
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
        }
        world = updateWorld(
          world,
          (draft) => {
            draft.experience!.temporal!.actors[actorId]!.accounts!.nextDue = moreCandidates
              ? now
              : nextDue;
          },
          { retainNativeValues: true },
        );
      },
    });
  };
  for (const actorId of actorIds) {
    const operation = () => prepareActor(actorId);
    if (db.readForActor) await db.readForActor(world.id, actorId, operation);
    else await operation();
  }
  // Candidate metadata and pending overrides already selected exact cold keys.
  // Hydrate them together by table, rather than opening one read per actor/kind.
  const hydrate = async () => {
    for (const kind of Object.keys(tables) as Kind[]) {
      const requested = bodyReads.filter((read) => read.candidate.kind === kind);
      if (!requested.length) continue;
      const selected = new Map(requested.map((read) => [read.candidate.recordId, read.candidate]));
      for (const batch of sqlRowBatches(
        requested.map((read) => [{ actor_id: read.actorId, id: read.candidate.recordId }]),
      ))
        for (const row of await db
          .prepare(
            `SELECT t.id,t.payload FROM jsonb_to_recordset(?::jsonb) q(actor_id TEXT,id TEXT)
          JOIN ${tables[kind]} t ON t.world_id=? AND t.actor_id=q.actor_id AND t.id=q.id`,
          )
          .all(JSON.stringify(batch.map(([request]) => request)), world.id)) {
          const candidate = selected.get(String(row['id']))!;
          candidate.value = {
            source: kind,
            value: JSON.parse(String(row['payload'])),
          } as ExperienceEntry;
        }
    }
  };
  if (bodyReads.length) {
    if (db.readMetadataBaseline) await db.readMetadataBaseline(actorIds, hydrate);
    else await hydrate();
  }
  for (const application of applications)
    if (db.readForActor) await db.readForActor(world.id, application.actorId, application.apply);
    else await application.apply();
  const finalSupports = complete
    ? await releaseUnusedTemporalSupports(
        { ...state, world },
        actorIds,
        retainedMetadata,
        db,
        Object.values(tables).flatMap((table) => rows.get(table) ?? []),
      )
    : { state: { ...state, world }, ids: [] };
  world = finalSupports.state.world;
  const removedSupports = new Set([
    ...(rows.get('mind_temporal_supports') ?? []),
    ...finalSupports.ids,
  ]);
  for (const [actorId, ids] of priorSupports)
    for (const id of ids)
      if (!world.experience?.temporal?.actors[actorId]?.supports?.[id])
        removedSupports.add(
          JSON.stringify(['world', 'experience', 'temporal', 'actors', actorId, 'supports', id]),
        );
  if (removedSupports.size) rows.set('mind_temporal_supports', [...removedSupports]);
  return { state: world === state.world ? state : { ...state, world }, rows, positions, previous };
}

export { nextAccountRetentionAt } from './retention-deadlines.js';

type Identity = NonNullable<WorldState['observerIdentities']>[string][string];
type Support = TemporalActorHistory['supports'];
type Accounts = NonNullable<TemporalActorHistory['accounts']>;
interface OwnedChange<T> {
  id: string;
  before: T | undefined;
  after: T | undefined;
}
interface AccountActorPlan {
  actorId: string;
  epoch: string;
  life: number;
  privacy: number;
  writes: ExperienceEntry[];
  deletes: Map<Kind, Set<string>>;
  identities: OwnedChange<Identity>[];
  supports: OwnedChange<NonNullable<Support>[string]>[];
  delta: Record<'optional' | 'required' | 'speech', { bytes: number; count: number }>;
  nextDue: number | null;
  accountsBefore?: Accounts;
  accountsAfter: Accounts;
  knownPlacesChanged: boolean;
  /** A whole support-set proof; this plan does not age or rewrite accounts. */
  supportRevision?: number;
}
export interface AccountRetentionPlan {
  worldId: string;
  actors: AccountActorPlan[];
  rows: Map<string, string[]>;
  positions?: Map<string, Map<string, number>>;
  versions?: SourceVersionPlan;
}
function changedOwnedEntries<T>(
  before: Readonly<Record<string, T>> | undefined,
  after: Readonly<Record<string, T>> | undefined,
): OwnedChange<T>[] {
  const ids = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  return [...ids].flatMap((id) =>
    before?.[id] === after?.[id] ? [] : [{ id, before: before?.[id], after: after?.[id] }],
  );
}

/** Support ownership is a separate dirty reason from account aging. The read
 * callback owns a captured database cut, and is never opened for an empty set. */
export async function prepareSupportRetentionPlan(
  state: SavedWorld,
  actorIds: readonly string[],
  readMembership: ReadSupportMembership,
): Promise<AccountRetentionPlan> {
  const captured = actorIds.flatMap((actorId) => {
    const actor = state.world.experience?.temporal?.actors[actorId],
      accounts = actor?.accounts;
    return actor && accounts && accounts.supportDirtyRevision !== accounts.supportSettledRevision
      ? [{ actorId, actor, accounts }]
      : [];
  });
  const groups = await unreferencedSupports(
    unusedSupportCandidates(
      state.world,
      captured.map(({ actorId }) => actorId),
    ),
    readMembership,
  );
  const selected = new Map(groups.map((group) => [group.actorId, group.candidates]));
  const actors: AccountActorPlan[] = [];
  for (const { actorId, actor, accounts } of captured) {
    actors.push({
      actorId,
      epoch: actor.epoch,
      life: actor.physicalLife,
      privacy: state.world.experience?.privacyRevisions?.[actorId] ?? 0,
      writes: [],
      deletes: new Map(),
      identities: [],
      supports: (selected.get(actorId) ?? []).map(({ capsule }) => ({
        id: capsule.receipt.id,
        before: capsule,
        after: undefined,
      })),
      delta: {
        optional: { bytes: 0, count: 0 },
        required: { bytes: 0, count: 0 },
        speech: { bytes: 0, count: 0 },
      },
      nextDue: accounts.nextDue,
      accountsBefore: accounts,
      accountsAfter: accounts,
      knownPlacesChanged: false,
      supportRevision: accounts.supportDirtyRevision,
    });
  }
  return { worldId: state.world.id, actors, rows: new Map() };
}

/** Existing account retirement prepares its exact effects outside mutation. The
 * finite plan holds selected records, not another writable knowledge model. */
export async function prepareAccountRetentionPlan(
  db: SqlDatabase,
  state: SavedWorld,
  metadata: RetentionMetadataView,
  actorIds: readonly string[],
  pendingDeletes?: ReadonlyMap<string, readonly string[]>,
  prepareVersions?: (
    prepared: PreparedMemoryRetention,
  ) => Promise<{ state: SavedWorld; plan: SourceVersionPlan }>,
): Promise<AccountRetentionPlan> {
  const prepared = await prepareAccountRetention(
    db,
    state,
    false,
    pendingDeletes,
    metadata,
    actorIds,
  );
  const versions = prepareVersions ? await prepareVersions(prepared) : undefined;
  if (versions) prepared.state = versions.state;
  const result: AccountRetentionPlan = {
    worldId: state.world.id,
    actors: [],
    rows: prepared.rows,
    ...(versions ? { versions: versions.plan } : {}),
    ...(prepared.positions ? { positions: prepared.positions } : {}),
  };
  for (const actorId of actorIds) {
    const after = prepared.state.world.experience!.temporal!.actors[actorId]!;
    const before = state.world.experience?.temporal?.actors[actorId];
    if (!before || !after.accounts) continue;
    const writes: ExperienceEntry[] = [];
    const deletes = new Map<Kind, Set<string>>();
    for (const kind of Object.keys(tables) as Kind[]) {
      const values = (world: WorldState) =>
        kind === 'memory'
          ? (world.memories[actorId] ?? [])
          : kind === 'awareness'
            ? (world.experience?.awareness[actorId] ?? [])
            : (world.experience?.summaries[actorId] ?? []);
      const old = new Map(values(state.world).map((value) => [historyKey(value), value]));
      for (const value of values(prepared.state.world))
        if (old.get(historyKey(value)) !== value)
          writes.push({ source: kind, value } as ExperienceEntry);
      deletes.set(
        kind,
        new Set(
          (prepared.rows.get(tables[kind]) ?? [])
            .filter((id) => (JSON.parse(id) as string[])[kind === 'memory' ? 2 : 3] === actorId)
            .map((id) => (JSON.parse(id) as string[]).at(-1)!),
        ),
      );
    }
    const identities = changedOwnedEntries(
      state.world.observerIdentities?.[actorId],
      prepared.state.world.observerIdentities?.[actorId],
    );
    const supports = changedOwnedEntries(before.supports, after.supports);
    const delta = Object.fromEntries(
      (['optional', 'required', 'speech'] as const).map((pool) => [
        pool,
        {
          bytes: after.accounts![pool].bytes - (before.accounts?.[pool].bytes ?? 0),
          count: after.accounts![pool].count - (before.accounts?.[pool].count ?? 0),
        },
      ]),
    ) as AccountActorPlan['delta'];
    const knownPlacesChanged =
      knownPlaceEvidenceRevision(state.world, actorId) !==
      knownPlaceEvidenceRevision(prepared.state.world, actorId);
    if (
      before.accounts &&
      !writes.length &&
      ![...deletes.values()].some((ids) => ids.size) &&
      !identities.length &&
      !supports.length &&
      before.accounts.nextDue === after.accounts.nextDue &&
      !Object.values(delta).some((value) => value.bytes || value.count) &&
      !knownPlacesChanged
    )
      continue;
    result.actors.push({
      actorId,
      epoch: before.epoch,
      life: before.physicalLife,
      privacy: state.world.experience?.privacyRevisions?.[actorId] ?? 0,
      writes,
      deletes,
      identities,
      supports,
      delta,
      nextDue: after.accounts.nextDue,
      accountsBefore: before.accounts,
      accountsAfter: after.accounts,
      knownPlacesChanged,
    });
  }
  return result;
}

/** Apply source-specific effects to the latest accepted state. New unrelated
 * account suffixes and received chronology survive; selected edits invalidate
 * only their actor's plan. All installed changes were prepared by this owner. */
export function applyAccountRetentionPlan(
  state: SavedWorld,
  plan: AccountRetentionPlan,
  changesSinceCapture: RetainedSourceChanges,
): PreparedMemoryRetention & { stale: boolean } {
  const rows = new Map<string, string[]>(),
    positions = new Map<string, Map<string, number>>();
  if (state.world.id !== plan.worldId) return { state, rows, stale: true };
  let stale = false;
  const ready: AccountActorPlan[] = [];
  const changedRequiredAccounts = new Set<string>();
  for (const actorPlan of plan.actors) {
    const { actorId } = actorPlan,
      actor = state.world.experience?.temporal?.actors[actorId];
    const selected = new Set(
      [...actorPlan.deletes].flatMap(([kind, ids]) =>
        [...ids].map((id) => personalAccountRecordId(actorId, kind, id)),
      ),
    );
    for (const entry of actorPlan.writes)
      selected.add(personalAccountRecordId(actorId, entry.source, entryId(entry)));
    const sourceChanges = changesSinceCapture.get(actorId);
    const supportAliases =
      actorPlan.supportRevision !== undefined &&
      (sourceChanges?.accounts.size || sourceChanges?.supportAliases?.size)
        ? new Set(
            actorPlan.supports.flatMap((change) =>
              change.before ? temporalSupportAliases(change.before, state.world) : [],
            ),
          )
        : undefined;
    const changed =
      !sourceChanges ||
      sourceChanges.invalidated ||
      (actorPlan.supportRevision !== undefined
        ? !sourceChanges.supportAliases ||
          (supportAliases !== undefined &&
            ([...sourceChanges.supportAliases].some((id) => supportAliases.has(id)) ||
              [...sourceChanges.accounts].some((id) =>
                supportAliases.has((JSON.parse(id) as string[]).at(-1)!),
              )))
        : [...sourceChanges.dependentAccounts].some((id) => !selected.has(id)) ||
          [...sourceChanges.accounts].some((id) => selected.has(id)));
    if (
      !actor ||
      actor.epoch !== actorPlan.epoch ||
      actor.physicalLife !== actorPlan.life ||
      changed ||
      (state.world.experience?.privacyRevisions?.[actorId] ?? 0) !== actorPlan.privacy ||
      actorPlan.identities.some(
        (change) => state.world.observerIdentities?.[actorId]?.[change.id] !== change.before,
      ) ||
      actorPlan.supports.some((change) => actor.supports?.[change.id] !== change.before) ||
      (actorPlan.accountsBefore
        ? !actor.accounts || actor.accounts.archives !== actorPlan.accountsBefore.archives
        : actor.accounts !== undefined)
    ) {
      stale = true;
      continue;
    }
    if (
      actorPlan.supportRevision === undefined &&
      actor.accounts?.required !== actorPlan.accountsBefore?.required
    )
      changedRequiredAccounts.add(actorId);
    ready.push(actorPlan);
  }
  if (!ready.length) return { state, rows, stale };
  const placements = new Map(
    ready
      .filter((actor) => actor.supportRevision === undefined)
      .flatMap(({ actorId }) =>
        (Object.keys(tables) as Kind[]).map((kind) => {
          const values =
            kind === 'memory'
              ? state.world.memories[actorId]
              : kind === 'awareness'
                ? state.world.experience?.awareness[actorId]
                : state.world.experience?.summaries[actorId];
          return [
            JSON.stringify([actorId, kind]),
            values ? historyPositions.get(values) : undefined,
          ] as const;
        }),
      ),
  );
  const world = updateWorld(
    state.world,
    (draft) => {
      for (const actorPlan of ready) {
        const { actorId } = actorPlan,
          actor = draft.experience!.temporal!.actors[actorId]!;
        if (actorPlan.supportRevision !== undefined) {
          const held = actorPlan.supports.length
            ? locallyHeldSupportAliases(draft, actorId)
            : new Set<string>();
          for (const change of actorPlan.supports) {
            const capsule = actor.supports?.[change.id];
            if (
              !capsule ||
              supportLocallyRequired(capsule, temporalSupportAliases(capsule, draft), held)
            )
              continue;
            releaseTemporalSupport(draft, actorId, change.id);
            const id = JSON.stringify([
              'world',
              'experience',
              'temporal',
              'actors',
              actorId,
              'supports',
              change.id,
            ]);
            let removed = rows.get('mind_temporal_supports');
            if (!removed) rows.set('mind_temporal_supports', (removed = []));
            removed.push(id);
          }
          settleTemporalSupportCleanup(draft, actorId, actorPlan.supportRevision);
          continue;
        }
        for (const kind of Object.keys(tables) as Kind[]) {
          const current =
            kind === 'memory'
              ? (draft.memories[actorId] ?? [])
              : kind === 'awareness'
                ? (draft.experience!.awareness[actorId] ?? [])
                : (draft.experience!.summaries[actorId] ?? []);
          const placement = placements.get(JSON.stringify([actorId, kind])),
            values = new Map(current.map((value) => [historyKey(value), value]));
          const removed = actorPlan.deletes.get(kind)!;
          for (const id of removed) values.delete(id);
          for (const entry of actorPlan.writes)
            if (entry.source === kind)
              values.set(entryId(entry), entry.value as (typeof current)[number]);
          const next = [...values.values()];
          if (placement) historyPositions.set(next, placement);
          if (kind === 'memory') draft.memories[actorId] = next as (typeof draft.memories)[string];
          else if (kind === 'awareness')
            draft.experience!.awareness[actorId] = next as NonNullable<
              typeof draft.experience
            >['awareness'][string];
          else
            draft.experience!.summaries[actorId] = next as NonNullable<
              typeof draft.experience
            >['summaries'][string];
          const selectedRows = (plan.rows.get(tables[kind]) ?? []).filter(
            (id) => (JSON.parse(id) as string[])[kind === 'memory' ? 2 : 3] === actorId,
          );
          if (selectedRows.length)
            rows.set(tables[kind], [...(rows.get(tables[kind]) ?? []), ...selectedRows]);
          const selectedPositions = plan.positions?.get(tables[kind]);
          if (selectedPositions)
            for (const id of selectedRows) {
              const position = selectedPositions.get(id);
              if (position !== undefined) {
                let owner = positions.get(tables[kind]);
                if (!owner) positions.set(tables[kind], (owner = new Map()));
                owner.set(id, position);
              }
            }
        }
        for (const change of actorPlan.identities) {
          const identities = ((draft.observerIdentities ??= {})[actorId] ??= {});
          if (change.after) identities[change.id] = change.after;
          else delete identities[change.id];
        }
        for (const change of actorPlan.supports) {
          const supports = (actor.supports ??= {});
          if (change.after) supports[change.id] = change.after;
          else delete supports[change.id];
        }
        if (!actorPlan.accountsBefore)
          // A temporal-only actor can have no accounting yet. Install the complete
          // prepared canonical totals once, never a resident-tail approximation.
          actor.accounts = structuredClone(actorPlan.accountsAfter);
        else
          for (const pool of ['optional', 'required', 'speech'] as const) {
            actor.accounts![pool].bytes += actorPlan.delta[pool].bytes;
            actor.accounts![pool].count += actorPlan.delta[pool].count;
            if (actor.accounts![pool].bytes < 0 || actor.accounts![pool].count < 0)
              throw new MemoryRetentionError(
                'Account retention counters changed before installation.',
              );
          }
        if (actorPlan.accountsBefore)
          actor.accounts!.supportDirtyRevision +=
            actorPlan.accountsAfter.supportDirtyRevision -
            actorPlan.accountsBefore.supportDirtyRevision;
        let nextDue = actorPlan.nextDue;
        for (const entry of sourceEntries(draft, actorId)) {
          const due = experienceRetentionDue(draft, entry);
          if (due !== null) nextDue = Math.min(nextDue ?? Infinity, due);
        }
        actor.accounts!.nextDue = nextDue;
        actor.accounts!.archives = actorPlan.accountsAfter.archives;
        // A newer native suffix may have crossed the early required-pool target
        // while this read was pending. Do not overwrite its due marker with the
        // prepared deadline. With no concurrent account change, protected owners
        // above that target do not keep scheduling an otherwise empty slice.
        if (changedRequiredAccounts.has(actorId)) markRequiredExperienceMaintenance(draft, actorId);
        // Preparation already inspected the exact selected source bodies. A
        // movement-account/deadline change cannot discard unrelated place proof.
        if (actorPlan.knownPlacesChanged) invalidateKnownPlaceEvidence(draft, actorId);
        for (const id of plan.rows.get('mind_temporal_supports') ?? [])
          if ((JSON.parse(id) as string[])[4] === actorId)
            rows.set('mind_temporal_supports', [...(rows.get('mind_temporal_supports') ?? []), id]);
      }
    },
    { retainNativeValues: true },
  );
  const acceptedActors = new Set(ready.map((actor) => actor.actorId));
  const versions = plan.versions && {
    changes: plan.versions.changes.filter((version) => acceptedActors.has(version.actorId)),
  };
  return {
    state: { ...state, world },
    rows,
    ...(positions.size ? { positions } : {}),
    ...(versions ? { versions } : {}),
    stale,
  };
}
