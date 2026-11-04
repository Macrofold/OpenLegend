import { nativeText, jsonText, temporalRecentAt } from '@open-legend/domain';
import { hasMemory } from '@open-legend/domain';
import { entityGet } from '@open-legend/domain';
import {
  initializePerceivedEventIndexes,
  readPerceivedEvents,
  readPerceivedEventSources,
  perspectiveField,
  historicalEntityReference,
  projectPerceivedSpeech,
  type PerceivedEventOptions,
} from './perceived-events.js';
import {
  projectEventEvidence,
  validateEventEvidence,
  type EventEvidence,
  type EventPresentationPolicy,
} from '@open-legend/domain';
import {
  appendedEventCount,
  appendedRecordCount,
  defaultStoryPolicy,
  selectStory,
  personalText,
  type StorySelection,
  currentPlaceObservation,
  canAccessContainer,
  itemFor,
} from '@open-legend/domain';
import { createHash } from 'node:crypto';
import type { WorldState, WorldEvent, Awareness, TemporalReceipt } from '@open-legend/domain';
import { beginTiming, endTiming } from './performance.js';
import {
  prepareHistory,
  captureHistoryAccountCut,
  historyAccountAtCapturedCut,
  temporalHistoryAccountAvailable,
  type HistoryAccountCut,
} from './history-preparation.js';
import { HistoryAppendWriter, perspectiveColumns } from './history-append.js';
import type { SqlWriteBatch } from './sql-rows.js';
import type { RecordChanges } from './world-records.js';
import { MemoryPreparationError } from './memory-repository.js';
import {
  encodeStoryAccount,
  personalAccountKey,
  storyAccountAvailableSql,
  narrationSourceUnrevokedSql,
  personalAccountRevision,
  personalEventEvidence as eventEvidence,
  storyAccountSql,
  storySourceRow,
  storedStoryAccount,
  storyTemporalCut,
  revokeTemporalStoryAccounts,
} from './personal-accounts.js';
import type { ReceivedEventAccount } from './received-event-accounts.js';
import type {
  TranscriptPage,
  TranscriptItem,
  WorldEventSourceReference,
} from '@open-legend/protocol';
import type { SqlDatabase } from './store.js';

export const HISTORY_TABLES = [
  'story_banners',
  'story_delivery',
  'history_perspectives',
  'story_jobs',
  'story_context_sources',
  'story_milestones',
  'history_events',
  'story_narrations',
  'story_event_sources',
  'history_totals',
] as const;
/** Restore admission already has complete history rows; validate without another SQL scan. */
export function validateHistoryEvidence(
  history: Record<(typeof HISTORY_TABLES)[number], Record<string, unknown>[]>,
  world: WorldState,
  versions: readonly Record<string, unknown>[],
) {
  const accounts = new Map<string, string>();
  const temporal = world.experience?.temporal;
  const receipts = new Map<string, TemporalReceipt>();
  for (const actor of Object.values(temporal?.actors ?? {}))
    for (const chunk of actor.pages)
      for (const batch of chunk.batches)
        for (const entry of batch.entries)
          if (entry.kind === 'occurrence' && entry.receipt)
            receipts.set(entry.receipt.id, entry.receipt);
  for (const [actor, entries] of Object.entries(world.experience?.awareness ?? {}))
    for (const entry of entries) {
      const payload = JSON.stringify(entry);
      accounts.set(
        personalAccountKey(
          world.id,
          actor,
          'awareness',
          entry.eventId,
          personalAccountRevision(payload),
        ),
        payload,
      );
    }
  for (const row of versions) {
    const payload = String(row['payload']);
    if (row['world_id'] !== world.id || personalAccountRevision(payload) !== row['revision'])
      throw new Error('Invalid retained personal account version.');
    accounts.set(
      personalAccountKey(
        world.id,
        String(row['actor_id']),
        String(row['source_kind']),
        String(row['source_id']),
        String(row['revision']),
      ),
      payload,
    );
  }
  for (const row of history.history_perspectives) {
    const source = storedStoryAccount(
      String(row['payload']),
      world.id,
      String(row['actor_id']),
      accounts,
      { receipts, sources: world.receivedValues?.sources ?? {} },
    );
    if (
      row['world_id'] !== world.id ||
      source.id !== row['event_id'] ||
      source.evidence.actorId !== row['actor_id']
    )
      throw new Error('Historical personal account scope disagrees with its owner.');
    validateEventEvidence(source.evidence);
    if (source.type !== source.evidence.eventType)
      throw new Error('History event type disagrees with observer facts.');
  }
  for (const row of history.story_jobs) {
    const job = JSON.parse(String(row['payload'])) as StoryJob;
    if (!Array.isArray(job.sources)) throw new Error('Invalid retained story evidence.');
    for (const source of job.sources) validateEventEvidence(source.evidence);
  }
}
export type NarratorVoice = 'restrained' | 'lyrical' | 'wry';
export interface StorySource {
  evidence: EventEvidence;
  id: string;
  text: import('@open-legend/domain').NativeText;
  revision: string;
  time: number;
  order: number;
  type: string;
  /** Optional permitted utterance; absence is not permission to join raw event text. */
  content?: import('@open-legend/domain').NativeText;
}
export interface StoryJob {
  id: string;
  ownerId: string;
  actorId: string;
  item: TranscriptItem;
  sources: StorySource[];
  voice: NarratorVoice;
  createdAt: number;
  state: 'queued' | 'running' | 'completed' | 'failed' | 'fallback' | 'uncertain' | 'cancelled';
  reason?: string;
  receipt?: unknown;
  previousItem?: TranscriptItem;
  selection?: { mechanism: string; version: number; policyRevision: number; policyDigest: string };
}
const revisionOf = (text: string) => createHash('sha256').update(text).digest('hex');
const narrationFailed = 'Narration failed.';
/** Older failures retain their source evidence in storage, never substitute prose in the UI. */
function projectNarration(item: TranscriptItem): TranscriptItem {
  // Authored source-free narration has not failed a source-based generation.
  // docs/narration-and-conversations.md#9-triggers-ordering-and-transcript-reconstruction
  return item.status === 'failed' ||
    (item.status === 'fallback' && item.sourceIds.length > 0 && !item.authoredFallback)
    ? { ...item, status: 'failed', text: narrationFailed }
    : item;
}
function publicTranscriptItem(
  item: TranscriptItem,
  worldId: string,
  actorId: string,
): TranscriptItem {
  const { speakerId, ...retained } = item;
  return {
    ...retained,
    ...(speakerId === actorId ? { speakerId } : {}),
    impacts: item.impacts.map((impact) => ({
      ...impact,
      entityId:
        impact.entityId === actorId
          ? actorId
          : historicalEntityReference(
              JSON.stringify([worldId, actorId]),
              impact.sourceId,
              impact.entityId,
              'impact',
            ),
    })),
  };
}
/** Scoped durable history repository. Only the application binds owner and perspective. */
export class HistoryRepository {
  constructor(
    private db: SqlDatabase,
    private principals: ReadonlyArray<{ ownerId: string; actorId: string }> = [],
  ) {
    this.bindLocalPrincipal = principals.length === 0;
  }
  private sourceAccess = (_worldId: string, _actorId: string) => true;
  private sourceAccessRevision = (_worldId: string, _actorId: string): unknown => 0;
  private sourceCut = (_worldId: string, _actorId: string): HistoryAccountCut | undefined =>
    undefined;
  setSourceAccess(
    allowed: (worldId: string, actorId: string) => boolean,
    revision: (worldId: string, actorId: string) => unknown,
    cut?: (worldId: string, actorId: string) => HistoryAccountCut | undefined,
  ): void {
    this.sourceAccess = allowed;
    this.sourceAccessRevision = revision;
    if (cut) this.sourceCut = cut;
  }
  private sourceAtCurrentCut(worldId: string, actorId: string, payload: string): boolean {
    const temporal = storyTemporalCut(payload);
    if (!temporal) return true;
    const cut = this.sourceCut(worldId, actorId);
    return !!cut && temporalHistoryAccountAvailable(cut, temporal);
  }
  /** A corrected original remains readable history, but cannot support new
   * unqualified narrator prose. Keep that restriction out of ordinary recall. */
  private narrationSourceAtCurrentCut(worldId: string, actorId: string, sourceId: string): boolean {
    const cut = this.sourceCut(worldId, actorId);
    return !cut || (!cut.forgotten.has(sourceId) && !cut.corrected.has(sourceId));
  }
  private async readForActor<T>(
    worldId: string,
    actorId: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    if (!this.sourceAccess(worldId, actorId)) throw new MemoryPreparationError();
    const privacy = this.sourceAccessRevision(worldId, actorId);
    const eligibility = `${this.narrationRevision}:${this.bannerSourceEpochs.get(actorId) ?? 0}`;
    const read = () =>
      this.db.readTransaction ? this.db.readTransaction(operation) : this.db.transaction(operation);
    const value = await (this.db.readForActor
      ? this.db.readForActor(worldId, actorId, read)
      : read());
    if (
      !this.sourceAccess(worldId, actorId) ||
      privacy !== this.sourceAccessRevision(worldId, actorId) ||
      eligibility !== `${this.narrationRevision}:${this.bannerSourceEpochs.get(actorId) ?? 0}`
    )
      throw new MemoryPreparationError();
    return value;
  }
  private readonly bindLocalPrincipal: boolean;
  private readonly listeners = new Set<() => void>();
  private queuedRevision = 0;
  private notifiedRevision = 0;
  private narrationRevision = 0;
  private readonly bannerSourceEpochs = new Map<string, number>();
  private readonly narrationReads = new Map<
    string,
    {
      revision: number;
      privacy: unknown;
      eligibility: number | undefined;
      result?: TranscriptItem | null;
      oldestTemporalAt?: number;
      value: Promise<{ status: 'current'; item: TranscriptItem | null } | { status: 'stale' }>;
    }
  >();
  /** Expire only this principal's cached positive at its source deadline. The
   * player's view memo must observe this before reusing a banner; ordinary clock
   * changes never create SQL, cache scans or a global invalidation. */
  bannerRevisionAt(
    worldId: string,
    ownerId: string,
    timing: { at: number; maxAgeSeconds: number },
  ): string {
    const actorId = this.principals.find((p) => p.ownerId === ownerId)?.actorId;
    if (!actorId) return `${this.narrationRevision}:0`;
    const key = JSON.stringify([worldId, ownerId, actorId]),
      entry = this.narrationReads.get(key);
    if (
      entry &&
      entry.result !== null &&
      (!this.sourceAccess(worldId, actorId) ||
        entry.privacy !== this.sourceAccessRevision(worldId, actorId) ||
        (entry.oldestTemporalAt !== undefined &&
          !temporalRecentAt(entry.oldestTemporalAt, timing.at, timing.maxAgeSeconds)))
    ) {
      this.narrationReads.delete(key);
      this.bannerSourceEpochs.set(actorId, (this.bannerSourceEpochs.get(actorId) ?? 0) + 1);
    }
    return `${this.narrationRevision}:${this.bannerSourceEpochs.get(actorId) ?? 0}`;
  }
  private bannerChanged() {
    // One scalar stays bounded across replaced worlds. Only committed banner
    // changes expire views; ordinary movement and unrelated telemetry do not.
    const publish = () => {
      this.narrationRevision++;
      this.narrationReads.clear();
      this.bannerSourceEpochs.clear();
    };
    if (this.db.afterCommit) this.db.afterCommit(publish);
    else publish();
  }
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  /** Only called after commit; durable jobs recover a lost notification on restart. */
  committed(_changes?: RecordChanges) {
    if (this.notifiedRevision === this.queuedRevision) return;
    this.notifiedRevision = this.queuedRevision;
    for (const listener of this.listeners) listener();
  }

  accepted(changes: RecordChanges): void {
    const actors = new Set<string>();
    const mark = (id: string) => {
      const path = JSON.parse(id) as string[];
      const actor = path[path[1] === 'experience' ? (path[2] === 'temporal' ? 4 : 3) : 2];
      if (actor) actors.add(actor);
    };
    for (const table of [
      'mind_temporal_pages',
      'mind_awareness',
      'mind_memories',
      'mind_summaries',
      'mind_forgotten',
      'mind_corrections',
    ]) {
      for (const id of [
        ...(changes.deletes.get(table) ?? []),
        ...(changes.expired?.get(table) ?? []),
      ])
        mark(id);
      for (const row of changes.writes.get(table) ?? [])
        if (
          table === 'mind_forgotten' ||
          table === 'mind_corrections' ||
          (!row.create && row.logicalRemoval !== false && table === 'mind_temporal_pages')
        )
          mark(row.id);
    }
    for (const intent of changes.temporal?.values() ?? [])
      if (intent.replacement) actors.add(intent.after.actorId);
    for (const actorId of actors)
      this.bannerSourceEpochs.set(actorId, (this.bannerSourceEpochs.get(actorId) ?? 0) + 1);
    for (const [key, entry] of this.narrationReads) {
      const [, , actorId] = JSON.parse(key) as string[];
      if (
        !actorId ||
        !actors.has(actorId) ||
        entry.result === null ||
        entry.result?.sourceIds.length === 0
      )
        continue;
      // Known absence cannot become a banner through removing a source. Preserve
      // it while expiring only positive/in-flight results for the affected actor.
      this.narrationReads.delete(key);
    }
  }

  private storySelection(
    world: WorldState,
    event: WorldEvent,
    actorId: string,
    source: Pick<StorySource, 'evidence' | 'text'>,
    policy: NonNullable<WorldState['storyPolicy']>,
  ) {
    const perceived = projectEventEvidence(event, source.evidence);
    return {
      event: perceived,
      selection:
        source.evidence.retentionClass === 'sensory'
          ? {
              kind: 'silent' as const,
              reason: 'Sensory evidence is not autobiographical narration.',
            }
          : selectStory(
              {
                viewerId: actorId,
                exposure: source.evidence.exposure,
                event: perceived,
                get sourceText() {
                  return nativeText(source.text);
                },
                source: entityGet(world.entities, perceived.actorId ?? ''),
                target: entityGet(world.entities, perceived.targetId ?? ''),
              },
              policy,
            ),
    };
  }
  async nextDue(worldId: string): Promise<number | null> {
    const row = await this.db
      .prepare("SELECT MIN(created_at) AS due FROM story_jobs WHERE world_id=? AND state='queued'")
      .get(worldId);
    return row?.['due'] == null ? null : Number(row['due']);
  }
  async event(worldId: string, id: string): Promise<WorldEvent | undefined> {
    const row = await this.db
      .prepare('SELECT payload FROM history_events WHERE world_id=? AND id=?')
      .get(worldId, id);
    return row ? (JSON.parse(String(row['payload'])) as WorldEvent) : undefined;
  }
  async eventCount(worldId: string): Promise<number> {
    const row = await this.db
      .prepare('SELECT COUNT(*) AS count FROM history_events WHERE world_id=?')
      .get(worldId);
    return Number(row?.['count'] ?? 0);
  }
  /** Native utterance identity resolves only to existing permitted Talk entries.
   * The response index bounds this read; no raw event text leaves the repository.
   */
  async replySpeechIds(
    worldId: string,
    ownerId: string,
    actorId: string,
    npcId: string,
    responseId: string,
    localId: string,
  ): Promise<string[]> {
    if (!this.principals.some((p) => p.ownerId === ownerId && p.actorId === actorId))
      throw new Error('Unsupported history principal.');
    return this.readForActor(worldId, actorId, async () => {
      const rows = await this.db
        .prepare(
          `SELECT e.id,p.payload FROM history_events e JOIN history_perspectives p
         ON p.world_id=e.world_id AND p.event_id=e.id
         WHERE e.world_id=? AND e.response_id=? AND p.actor_id=?
         AND p.event_type='speech' AND p.source_id=? AND p.target_id=p.actor_id
         AND e.payload::jsonb #>> '{data,utteranceId}'=? AND ${storyAccountAvailableSql()} ORDER BY e.position,e.id LIMIT 16`,
        )
        .all(worldId, responseId, actorId, npcId, `${responseId}:${localId}`);
      return rows
        .filter((row) => this.sourceAtCurrentCut(worldId, actorId, String(row['payload'])))
        .map((row) => String(row['id']));
    });
  }
  async retainedEventCount(worldId: string): Promise<number> {
    const row = await this.db
      .prepare('SELECT event_count FROM history_totals WHERE world_id=?')
      .get(worldId);
    if (!row) throw new Error('Retained history count is missing; recovery refused.');
    return Number(row['event_count']);
  }
  /** Explicit physical audit: checkpoint capture/recovery already visits all retained data.
   * Normal startup uses the transactionally maintained count instead of a lifetime scan.
   * docs/save-and-load.md#current-history-capture-boundary */
  async auditEventCount(worldId: string): Promise<number> {
    const actual = await this.eventCount(worldId);
    if (actual !== (await this.retainedEventCount(worldId)))
      throw new Error('Retained history count disagrees with physical records; recovery refused.');
    return actual;
  }
  /** Full reconstruction is reserved for explicit offline recovery. */
  async allEvents(worldId: string): Promise<WorldEvent[]> {
    const rows = await this.db
      .prepare('SELECT payload FROM history_events WHERE world_id=? ORDER BY position,id')
      .all(worldId);
    return rows.map((row) => JSON.parse(String(row['payload'])) as WorldEvent);
  }
  async hasResponse(worldId: string, responseId: string): Promise<boolean> {
    return !!(await this.db
      .prepare('SELECT id FROM history_events WHERE world_id=? AND response_id=? LIMIT 1')
      .get(worldId, responseId));
  }
  async initialize() {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS history_totals (
        world_id TEXT PRIMARY KEY, event_count BIGINT NOT NULL CHECK(event_count>=0));
      CREATE TABLE IF NOT EXISTS story_banners (
        world_id TEXT NOT NULL, owner_id TEXT NOT NULL, id TEXT NOT NULL, position BIGINT NOT NULL, payload TEXT NOT NULL,
        PRIMARY KEY(world_id,owner_id,id));
      CREATE INDEX IF NOT EXISTS story_banner_order ON story_banners(world_id,owner_id,position,id);
      CREATE TABLE IF NOT EXISTS story_delivery (
        world_id TEXT NOT NULL, owner_id TEXT NOT NULL, game_time DOUBLE PRECISION NOT NULL,
        PRIMARY KEY(world_id,owner_id));
      CREATE TABLE IF NOT EXISTS history_perspectives (
        world_id TEXT NOT NULL,event_id TEXT NOT NULL,actor_id TEXT NOT NULL,payload TEXT NOT NULL,
        position BIGINT NOT NULL,event_type TEXT NOT NULL,source_id TEXT,target_id TEXT,
        speech_peer_id TEXT,response_action BOOLEAN NOT NULL,
        temporal_life BIGINT,temporal_epoch TEXT,temporal_batch_order BIGINT,temporal_entry_index BIGINT,
        PRIMARY KEY(world_id,event_id,actor_id));
      CREATE INDEX IF NOT EXISTS history_perspective_temporal ON history_perspectives
        (world_id,actor_id,temporal_life,temporal_epoch,temporal_batch_order,temporal_entry_index) WHERE temporal_batch_order IS NOT NULL;
      CREATE TABLE IF NOT EXISTS story_context_sources (
        world_id TEXT NOT NULL,narration_id TEXT NOT NULL,owner_id TEXT NOT NULL,event_id TEXT NOT NULL,
        PRIMARY KEY(world_id,narration_id,owner_id,event_id));
      CREATE INDEX IF NOT EXISTS story_context_reverse ON story_context_sources(world_id,event_id);
      CREATE TABLE IF NOT EXISTS story_jobs (
        world_id TEXT NOT NULL,id TEXT NOT NULL,owner_id TEXT NOT NULL,state TEXT NOT NULL,
        created_at BIGINT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(world_id,id,owner_id));
      CREATE INDEX IF NOT EXISTS story_queue ON story_jobs(world_id,state,created_at,id);
      CREATE INDEX IF NOT EXISTS story_owner_queue ON story_jobs(world_id,owner_id,state);
      CREATE TABLE IF NOT EXISTS story_milestones (
        world_id TEXT NOT NULL,owner_id TEXT NOT NULL,milestone TEXT NOT NULL,event_id TEXT NOT NULL,
        PRIMARY KEY(world_id,owner_id,milestone));
      CREATE TABLE IF NOT EXISTS history_events (
        world_id TEXT NOT NULL, id TEXT NOT NULL, position BIGINT NOT NULL,
        payload TEXT NOT NULL,response_id TEXT,data_references TEXT[] NOT NULL,
        PRIMARY KEY(world_id,id));
      CREATE INDEX IF NOT EXISTS history_events_response ON history_events(world_id,response_id) WHERE response_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS history_events_references ON history_events USING GIN(data_references);
      CREATE INDEX IF NOT EXISTS history_events_order ON history_events(world_id,position,id);
      CREATE TABLE IF NOT EXISTS story_narrations (
        world_id TEXT NOT NULL, id TEXT NOT NULL, owner_id TEXT NOT NULL,
        position BIGINT NOT NULL, revision BIGINT NOT NULL, payload TEXT NOT NULL,
        PRIMARY KEY(world_id,id,owner_id));
      CREATE INDEX IF NOT EXISTS story_owner_order ON story_narrations(world_id,owner_id,position,id);
      CREATE TABLE IF NOT EXISTS story_event_sources (
        world_id TEXT NOT NULL, narration_id TEXT NOT NULL, owner_id TEXT NOT NULL, event_id TEXT NOT NULL,
        PRIMARY KEY(world_id,narration_id,owner_id,event_id));
      CREATE INDEX IF NOT EXISTS story_event_reverse ON story_event_sources(world_id,event_id);
    `);
    await initializePerceivedEventIndexes(this.db);
  }
  private async revokeStories(worldId: string, id: string, ownerId?: string) {
    const rows = await this.db
      .prepare(
        `SELECT DISTINCT narration_id,owner_id FROM (SELECT * FROM story_event_sources UNION ALL SELECT * FROM story_context_sources) AS refs WHERE world_id=? AND event_id=?${ownerId ? ' AND owner_id=?' : ''}`,
      )
      .all(worldId, id, ...(ownerId ? [ownerId] : []));
    for (const row of rows) {
      const story = String(row['narration_id']),
        owner = String(row['owner_id']);
      const removedBanner = await this.db
        .prepare('DELETE FROM story_banners WHERE world_id=? AND id=? AND owner_id=? RETURNING id')
        .get(worldId, story, owner);
      if (removedBanner) this.bannerChanged();
      await this.db
        .prepare('DELETE FROM story_narrations WHERE world_id=? AND id=? AND owner_id=?')
        .run(worldId, story, owner);
      // Erase capsules as well as visible derived prose on semantic revocation.
      await this.db
        .prepare('DELETE FROM story_jobs WHERE world_id=? AND id=? AND owner_id=?')
        .run(worldId, story, owner);
      await this.db
        .prepare(
          'DELETE FROM story_event_sources WHERE world_id=? AND narration_id=? AND owner_id=?',
        )
        .run(worldId, story, owner);
      await this.db
        .prepare(
          'DELETE FROM story_context_sources WHERE world_id=? AND narration_id=? AND owner_id=?',
        )
        .run(worldId, story, owner);
    }
  }
  /** Canonical pages must already reflect the accepted change. Expiring a raw
   * account removes its grant, not an already delivered story. Semantic source
   * revocation separately removes derived stories in project/removeEvent.
   * docs/narration-and-conversations.md#7-proposed-persistence-and-indexes */
  async revokeTemporalAccounts(worldId: string, changes: RecordChanges): Promise<void> {
    await revokeTemporalStoryAccounts(this.db, worldId, changes);
  }
  private async removeEvent(worldId: string, id: string) {
    await this.revokeStories(worldId, id);
    await this.db
      .prepare('DELETE FROM history_perspectives WHERE world_id=? AND event_id=?')
      .run(worldId, id);
    return (await this.db
      .prepare('DELETE FROM history_events WHERE world_id=? AND id=? RETURNING id')
      .get(worldId, id))
      ? 1
      : 0;
  }
  /** Runs inside the authoritative commit transaction. No paid work and no imagined legacy sources. */
  async project(
    previous: WorldState | undefined,
    world: WorldState,
    appendCount?: number,
    reapplyForgetting = false,
    prepared?: ReturnType<typeof prepareHistory>,
    sharedWrites?: SqlWriteBatch,
    sourceChanges?: RecordChanges,
  ) {
    // A save can replace rows without passing through saveStory/revokeStories.
    if (!previous || reapplyForgetting) this.bannerChanged();
    // Stored history perspectives follow explicit account attribution. Current access is checked separately at the request boundary.
    if (this.bindLocalPrincipal) {
      this.principals = Object.entries(world.authorship.playerAccountIds).map(
        ([actorId, ownerId]) => ({ actorId, ownerId }),
      );
    }
    if (previous && previous.storyPolicyRevision !== world.storyPolicyRevision) {
      for (const row of await this.db
        .prepare(
          "SELECT payload FROM story_jobs WHERE world_id=? AND state IN ('queued','running')",
        )
        .all(world.id)) {
        const job = JSON.parse(String(row['payload'])) as StoryJob;
        job.state = 'cancelled';
        job.reason = 'Story policy changed.';
        await this.saveStory(world.id, job);
      }
    }
    // Prepared data is reusable only for its exact frozen snapshots; mutable callers use live preparation.
    const inputs =
      prepared?.world === world &&
      prepared.previous === previous &&
      Object.isFrozen(world) &&
      (!previous || Object.isFrozen(previous))
        ? prepared
        : prepareHistory(previous, world, appendCount);
    const { fastAppend, changed, removed, previousIds, forgotten, perspective } = inputs;
    // Exact canonical changes, rather than event append status, prove that no old
    // personal account/privacy relationship needs the edit/revocation path below.
    const appendSources =
      !!sourceChanges &&
      !reapplyForgetting &&
      !sourceChanges.deletes.has('experience_state') &&
      !sourceChanges.deletes.has('mind_awareness_owners') &&
      !sourceChanges.deletes.has('mind_awareness') &&
      !(sourceChanges.writes.get('mind_awareness') ?? []).some((row) => !row.create) &&
      [
        'mind_forgotten',
        'mind_corrections',
        'mind_forgotten_owners',
        'mind_corrections_owners',
      ].every((table) => !sourceChanges.writes.has(table) && !sourceChanges.deletes.has(table));
    let removedEvents = 0;
    for (const id of removed) removedEvents += await this.removeEvent(world.id, id);
    const candidates: {
      event: WorldEvent;
      position: number;
      principal: { ownerId: string; actorId: string };
      selection: Extract<StorySelection, { kind: 'candidate' }>;
      source: StorySource;
    }[] = [];
    const policy = world.storyPolicy ?? defaultStoryPolicy();
    const batch = new HistoryAppendWriter(this.db, world.id);
    const rewrittenSources = new Map<string, Map<string, StorySource>>();
    const buildStarted = beginTiming();
    const accountCuts = new Map<string, HistoryAccountCut>();
    for (const event of changed) {
      const encoded = jsonText(event);
      const eventRevision = revisionOf(encoded);
      const retainedPerspectives = new Map<string, StorySource>();
      const retainedTemporal = new Map<string, NonNullable<ReceivedEventAccount['temporal']>>();
      if (!fastAppend) {
        const retained = await this.db
          .prepare('SELECT payload FROM history_events WHERE world_id=? AND id=?')
          .get(world.id, event.id);
        if (retained?.['payload'] === encoded) continue;
        if (retained)
          for (const row of await this.db
            .prepare(
              `SELECT p.actor_id,p.payload,${storyAccountSql()} AS account_payload FROM history_perspectives p WHERE p.world_id=? AND p.event_id=?`,
            )
            .all(world.id, event.id)) {
            const actorId = String(row['actor_id']),
              payload = String(row['payload']);
            retainedPerspectives.set(actorId, storySourceRow(row));
            const temporalCut = storyTemporalCut(payload);
            if (temporalCut) retainedTemporal.set(actorId, temporalCut);
          }
        removedEvents += await this.removeEvent(world.id, event.id);
      }
      const perspectives = new Map<string, StorySource>();
      const { position, pending: eventFlush } = batch.event(event, encoded);
      if (eventFlush) await eventFlush;
      for (const actorId of new Set(event.audience)) {
        if (forgotten(actorId).has(event.id)) continue;
        const capturedAccount = perspective(actorId, event.id);
        let accountCut = accountCuts.get(actorId);
        if (!accountCut)
          accountCuts.set(actorId, (accountCut = captureHistoryAccountCut(world, actorId)));
        const account = historyAccountAtCapturedCut(
          accountCut,
          sourceChanges,
          event.id,
          capturedAccount,
        );
        if (capturedAccount && !account) continue;
        const awareness = account?.awareness;
        let evidence = account?.evidence;
        const retained = retainedPerspectives.get(actorId);
        if (!evidence && retained) {
          // Consolidation removes hot recall, not durable authorization. Reuse that perspective;
          // the domain forbids speech rewrites, so this path only rephrases non-speech edits.
          evidence =
            event.type === 'speech' || retained.evidence.eventType === 'activity-observed'
              ? retained.evidence
              : {
                  ...retained.evidence,
                  text: personalText(world, actorId, event.narration ?? event.text),
                  content:
                    typeof event.data?.['text'] === 'string' ? event.data['text'] : event.text,
                };
        }
        // Physical reception does not force a permanent autobiographical account.
        // A missing retained personal source grants no historical perspective.
        if (!evidence) continue;
        const { source, pending: perspectiveFlush } = batch.perspective(
          event,
          actorId,
          evidence,
          awareness,
          position,
          eventRevision,
          account?.temporal ?? retainedTemporal.get(actorId),
        );
        perspectives.set(actorId, source);
        if (!fastAppend) {
          const sources = rewrittenSources.get(actorId) ?? new Map<string, StorySource>();
          sources.set(event.id, source);
          rewrittenSources.set(actorId, sources);
        }
        if (perspectiveFlush) await perspectiveFlush;
      }
      // Only newly committed evidence can trigger a story; startup never replays history.
      if (previous && !previousIds?.has(event.id))
        for (const principal of this.principals) {
          if (forgotten(principal.actorId).has(event.id)) continue;
          const source = perspectives.get(principal.actorId);
          if (!source) continue;
          const { event: perceived, selection } = this.storySelection(
            world,
            event,
            principal.actorId,
            source,
            policy,
          );
          if (selection.kind === 'candidate')
            candidates.push({ event: perceived, position, principal, selection, source });
        }
    }
    // Persist sources before scheduling; selection follows docs/narration-and-conversations.md#replaceable-story-selection.
    if (!previous)
      await this.db
        .prepare(
          'INSERT INTO history_totals(world_id,event_count) VALUES (?,0) ON CONFLICT DO NOTHING',
        )
        .run(world.id);
    await batch.flush({ worldId: world.id, removedEvents }, sharedWrites);
    endTiming('history.sourceBuild', buildStarted, batch.writeMilliseconds);
    candidates.sort(
      (a, b) =>
        b.selection.significance - a.selection.significance ||
        a.position - b.position ||
        a.event.id.localeCompare(b.event.id),
    );
    // Append-only history can share its final transport with canonical records.
    // Every following reader/effect must first see those exact history rows.
    if (candidates.length) await sharedWrites?.flush();
    for (const { event, principal, selection, source } of candidates) {
      if (
        selection.milestoneKey &&
        (await this.db
          .prepare(
            'SELECT event_id FROM story_milestones WHERE world_id=? AND owner_id=? AND milestone=?',
          )
          .get(world.id, principal.ownerId, selection.milestoneKey))
      )
        continue;
      if (await this.schedule(world, event, principal, selection, source)) {
        if (selection.milestoneKey)
          await this.db
            .prepare('INSERT INTO story_milestones VALUES (?,?,?,?) ON CONFLICT DO NOTHING')
            .run(world.id, principal.ownerId, selection.milestoneKey, event.id);
      }
    }
    for (const [actorId, ids] of appendSources
      ? []
      : Object.entries(world.experience?.forgotten ?? {})) {
      // Installing a save also replaces historical permissions. Even an unchanged
      // present-day ledger must revoke access restored by that older snapshot.
      // docs/save-and-load.md#external-work-privacy-and-shared-authority
      if (!reapplyForgetting && ids === previous?.experience?.forgotten[actorId]) continue;
      const old = new Set(reapplyForgetting ? [] : previous?.experience?.forgotten[actorId]);
      for (const id of ids)
        if (!old.has(id)) {
          await sharedWrites?.flush();
          await this.db
            .prepare(
              'DELETE FROM history_perspectives WHERE world_id=? AND event_id=? AND actor_id=?',
            )
            .run(world.id, id, actorId);
          for (const principal of this.principals.filter((p) => p.actorId === actorId))
            await this.revokeStories(world.id, id, principal.ownerId);
        }
    }
    // Editing awareness changes this actor's source capsule; consolidation alone does not revoke historical access.
    if (previous && !appendSources)
      for (const [actorId, entries] of Object.entries(world.experience?.awareness ?? {})) {
        if (entries === previous.experience?.awareness[actorId]) continue;
        const before = previous.experience?.awareness[actorId] ?? [];
        if (appendedRecordCount(before, entries) !== undefined) continue;
        let prefix = 0;
        while (prefix < before.length && entries[prefix] === before[prefix]) prefix++;
        if (prefix === before.length) continue; // Unchanged or append-only, no edited old sources.
        const old = new Map(before.slice(prefix).map((entry) => [entry.eventId, entry]));
        for (const entry of entries.slice(prefix)) {
          const prior = old.get(entry.eventId);
          if (
            !prior ||
            prior === entry ||
            JSON.stringify(eventEvidence(prior)) === JSON.stringify(eventEvidence(entry))
          )
            continue;
          await sharedWrites?.flush();
          // A global-event edit can already have replaced this perspective in the
          // current transaction, before its new canonical awareness body is written.
          // Retain that exact owned preparation instead of reading its future reference.
          let source = rewrittenSources.get(actorId)?.get(entry.eventId);
          if (!source) {
            const row = await this.db
              .prepare(
                `SELECT p.payload,${storyAccountSql()} AS account_payload FROM history_perspectives p WHERE p.world_id=? AND p.event_id=? AND p.actor_id=?`,
              )
              .get(world.id, entry.eventId, actorId);
            if (!row) continue;
            source = storySourceRow(row);
          }
          source.text = entry.text;
          source.evidence = eventEvidence(entry);
          if (entry.content !== undefined) source.content = entry.content;
          else delete source.content;
          source.revision = revisionOf(JSON.stringify(entry));
          const account = encodeStoryAccount(source, entry);
          await this.db
            .prepare(
              'UPDATE history_perspectives SET payload=?,position=?,event_type=?,source_id=?,target_id=?,speech_peer_id=?,temporal_life=NULL,temporal_epoch=NULL,temporal_batch_order=NULL,temporal_entry_index=NULL WHERE world_id=? AND event_id=? AND actor_id=?',
            )
            .run(account.payload, ...perspectiveColumns(source), world.id, entry.eventId, actorId);
          for (const principal of this.principals.filter((p) => p.actorId === actorId))
            await this.revokeStories(world.id, entry.eventId, principal.ownerId);
        }
      }
    for (const [actorId, corrections] of Object.entries(world.experience?.corrections ?? {})) {
      if (corrections === previous?.experience?.corrections?.[actorId]) continue;
      for (const [id, evidence] of Object.entries(corrections)) {
        if (previous?.experience?.corrections?.[actorId]?.[id] === evidence) continue;
        const eventId = world.memories[actorId]?.find((m) => m.id === id)?.eventId ?? id;
        for (const principal of this.principals.filter((p) => p.actorId === actorId)) {
          await sharedWrites?.flush();
          await this.revokeStories(world.id, eventId, principal.ownerId);
        }
      }
    }
  }
  private async schedule(
    world: WorldState,
    event: WorldEvent,
    { ownerId, actorId }: { ownerId: string; actorId: string },
    selection: Extract<StorySelection, { kind: 'candidate' }>,
    source: StorySource,
  ) {
    const policy = world.storyPolicy ?? defaultStoryPolicy();
    // Narration keeps its own principal/source grouping, independent of speaking.
    const base = `story:${ownerId}:${selection.groupKey}`;
    const priorRow = await this.db
      .prepare('SELECT payload FROM story_jobs WHERE world_id=? AND id=? AND owner_id=?')
      .get(world.id, base, ownerId);
    const prior = priorRow ? (JSON.parse(String(priorRow['payload'])) as StoryJob) : undefined;
    const combine =
      prior?.state === 'queued' &&
      prior.sources.length < policy.delivery.maximumSources &&
      prior.selection?.policyRevision === (world.storyPolicyRevision ?? 0);
    if (prior && (!combine || prior.sources.some((source) => source.id === event.id))) return false;
    if (!combine) {
      const delivery = await this.db
        .prepare('SELECT game_time FROM story_delivery WHERE world_id=? AND owner_id=?')
        .get(world.id, ownerId);
      const waiting = await this.db
        .prepare(
          "SELECT id FROM story_jobs WHERE world_id=? AND owner_id=? AND state IN ('queued','running') LIMIT 1",
        )
        .get(world.id, ownerId);
      if (
        waiting ||
        (delivery && event.at - Number(delivery['game_time']) < policy.delivery.minimumInterval)
      )
        return false;
    }
    const id = base;
    const sources = (combine ? [...prior.sources, source] : [source]).sort(
      (a, b) => a.order - b.order || a.id.localeCompare(b.id),
    );
    const anchor = sources.at(-1)!;
    const voiceRow = await this.db
      .prepare('SELECT value FROM meta WHERE key=?')
      .get(`integration:narrator-voice:${ownerId}`);
    const voice = (
      voiceRow ? JSON.parse(String(voiceRow['value'])) : 'restrained'
    ) as NarratorVoice;
    const impacts: TranscriptItem['impacts'] = combine ? [...prior.item.impacts] : [];
    if (event.type === 'body-effect')
      for (const field of ['healthDelta', 'wetnessDelta', 'burningDelta']) {
        const delta = event.data?.[field];
        if (typeof delta === 'number' && delta !== 0)
          impacts.push({
            entityId: event.targetId ?? event.actorId!,
            // The permitted source capsule supplies names; current world state is not evidence.
            field: field.replace('Delta', ''),
            delta,
            sourceId: event.id,
          });
      }
    const item: TranscriptItem = {
      id,
      kind: 'narration',
      text: sources.map((s) => nativeText(s.text)).join(' '),
      time: anchor.time,
      order: anchor.order,
      sourceIds: sources.map((s) => s.id),
      impacts,
      status: 'pending',
      revision: combine ? prior.item.revision : 1,
      voice,
    };
    const job: StoryJob = {
      id,
      ownerId,
      actorId,
      item,
      sources,
      voice,
      createdAt: combine ? prior.createdAt : Date.now(),
      state: 'queued',
      selection: {
        mechanism: policy.id,
        version: policy.version,
        policyRevision: world.storyPolicyRevision ?? 0,
        policyDigest: revisionOf(JSON.stringify(policy)),
      },
    };
    await this.saveStory(world.id, job);
    if (!combine)
      await this.db
        .prepare(
          'INSERT INTO story_delivery VALUES (?,?,?) ON CONFLICT(world_id,owner_id) DO UPDATE SET game_time=excluded.game_time',
        )
        .run(world.id, ownerId, event.at);
    for (const source of sources)
      await this.db
        .prepare('INSERT INTO story_event_sources VALUES (?,?,?,?) ON CONFLICT DO NOTHING')
        .run(world.id, id, ownerId, source.id);
    return true;
  }
  private async saveStory(worldId: string, job: StoryJob) {
    let changedBanner: Record<string, unknown> | undefined;
    if (job.selection && ['completed', 'failed', 'fallback', 'uncertain'].includes(job.state))
      changedBanner = await this.db
        .prepare(
          `INSERT INTO story_banners VALUES (?,?,?,?,?) ON CONFLICT(world_id,owner_id,id)
          DO UPDATE SET position=excluded.position,payload=excluded.payload
          WHERE (story_banners.position,story_banners.payload) IS DISTINCT FROM (excluded.position,excluded.payload)
          RETURNING id`,
        )
        .get(worldId, job.ownerId, job.id, job.item.order, JSON.stringify(job.item));
    else
      changedBanner = await this.db
        .prepare('DELETE FROM story_banners WHERE world_id=? AND owner_id=? AND id=? RETURNING id')
        .get(worldId, job.ownerId, job.id);
    if (changedBanner) this.bannerChanged();
    if (job.state === 'queued') this.queuedRevision++;
    await this.db
      .prepare(
        'INSERT INTO story_jobs VALUES (?,?,?,?,?,?) ON CONFLICT(world_id,id,owner_id) DO UPDATE SET state=excluded.state,payload=excluded.payload',
      )
      .run(worldId, job.id, job.ownerId, job.state, job.createdAt, JSON.stringify(job));
    if (job.state === 'cancelled' && !job.previousItem) {
      await this.db
        .prepare('DELETE FROM story_narrations WHERE world_id=? AND owner_id=? AND id=?')
        .run(worldId, job.ownerId, job.id);
      return;
    }
    const item = job.state === 'cancelled' ? job.previousItem! : job.item;
    await this.db
      .prepare(
        'INSERT INTO story_narrations VALUES (?,?,?,?,?,?) ON CONFLICT(world_id,id,owner_id) DO UPDATE SET position=excluded.position,revision=excluded.revision,payload=excluded.payload',
      )
      .run(worldId, job.id, job.ownerId, item.order, item.revision ?? 1, JSON.stringify(item));
  }
  /** Claim is persisted before any paid reservation; restarted claims never redispatch. */
  async claim(
    worldId: string,
    before: number,
    currentWorld: () => WorldState,
  ): Promise<StoryJob | null> {
    return this.db.transaction(async () => {
      const row = await this.db
        .prepare(
          "SELECT payload FROM story_jobs WHERE world_id=? AND state='queued' AND created_at<=? ORDER BY created_at,id LIMIT 1",
        )
        .get(worldId, before);
      if (!row) return null;
      const job = JSON.parse(String(row['payload'])) as StoryJob;
      if (!(await this.selectionCurrent(currentWorld, job))) {
        job.state = 'cancelled';
        job.reason = 'Story selection revoked or expired.';
        await this.saveStory(worldId, job);
        return null;
      }
      job.state = 'running';
      await this.saveStory(worldId, job);
      return job;
    });
  }
  async selectionCurrent(currentWorld: () => WorldState, job: StoryJob): Promise<boolean> {
    const worldId = currentWorld().id;
    const row = await this.db
      .prepare('SELECT state FROM story_jobs WHERE world_id=? AND owner_id=? AND id=?')
      .get(worldId, job.ownerId, job.id);
    if (!row || !['queued', 'running'].includes(String(row['state']))) return false;
    if (!(await this.sourcesCurrent(worldId, job))) return false;
    const eventRows = job.item.sourceIds.length
      ? await this.db
          .prepare(
            `SELECT id,payload FROM history_events WHERE world_id=? AND id IN (${job.item.sourceIds.map(() => '?').join(',')})`,
          )
          .all(worldId, ...job.item.sourceIds)
      : [];
    const events = new Map(eventRows.map((row) => [String(row['id']), row]));
    // Storage reads may outlive a permission or definition change. Check the latest
    // world after those awaits, immediately before dispatch/publication admission.
    const world = currentWorld();
    const policy = world.storyPolicy ?? defaultStoryPolicy();
    if (
      world.id !== worldId ||
      !job.selection ||
      !policy.enabled ||
      job.selection.policyRevision !== (world.storyPolicyRevision ?? 0) ||
      job.selection.policyDigest !== revisionOf(JSON.stringify(policy)) ||
      world.simTime - job.item.time > policy.delivery.maximumAge
    )
      return false;
    // A forget/correction may commit after the SQL source check but before the
    // final world read. Its authoritative ledger fences dispatch without scanning
    // retained event bodies or treating ordinary new observations as revocations.
    const forgotten = world.experience?.forgotten[job.actorId],
      corrections = world.experience?.corrections?.[job.actorId];
    if (job.sources.some((source) => forgotten?.includes(source.id) || corrections?.[source.id]))
      return false;
    for (const id of job.item.sourceIds) {
      const row = events.get(id);
      if (!row) return false;
      const evidence = job.sources.find((source) => source.id === id)?.evidence;
      if (!evidence) return false;
      const exposure = evidence.exposure;
      if (exposure?.kind === 'place' && !currentPlaceObservation(world, exposure)) return false;
      if (exposure?.kind === 'inventory-item') {
        const item = itemFor(world, exposure.id);
        if (
          !item ||
          item.definitionId !== exposure.definition.id ||
          world.itemDefinitions[item.definitionId]?.version !== exposure.definition.version ||
          !canAccessContainer(world, job.actorId, item.ownerId)
        )
          return false;
      }
      const event = projectEventEvidence(
        JSON.parse(String(row['payload'])) as WorldEvent,
        evidence,
      );
      if (
        selectStory(
          {
            viewerId: job.actorId,
            exposure: evidence.exposure,
            event,
            sourceText: nativeText(job.sources.find((s) => s.id === id)?.text ?? ''),
            source: entityGet(world.entities, event.actorId ?? ''),
            target: entityGet(world.entities, event.targetId ?? ''),
          },
          policy,
        ).kind !== 'candidate'
      )
        return false;
    }
    return true;
  }
  async cancel(worldId: string, job: StoryJob, receipt?: unknown) {
    await this.db.transaction(async () => {
      const row = await this.db
        .prepare('SELECT state FROM story_jobs WHERE world_id=? AND owner_id=? AND id=?')
        .get(worldId, job.ownerId, job.id);
      if (!row || !['queued', 'running'].includes(String(row['state']))) return;
      job.state = 'cancelled';
      job.reason = 'Story selection or permitted evidence no longer current.';
      if (receipt) job.receipt = receipt;
      await this.saveStory(worldId, job);
    });
  }
  async recover(worldId: string) {
    await this.db.transaction(async () => {
      // Legacy rows remain private history. They never populate the new banner projection.
      for (const row of await this.db
        .prepare("SELECT payload FROM story_jobs WHERE world_id=? AND state='queued'")
        .all(worldId)) {
        const job = JSON.parse(String(row['payload'])) as StoryJob;
        if (!job.selection) {
          job.previousItem = { ...job.item, status: 'failed', text: narrationFailed };
          job.state = 'cancelled';
          job.item = job.previousItem;
          job.reason = 'Legacy broad narration policy retired.';
          await this.saveStory(worldId, job);
        }
      }
      for (const row of await this.db
        .prepare("SELECT payload FROM story_jobs WHERE world_id=? AND state='running'")
        .all(worldId)) {
        const job = JSON.parse(String(row['payload'])) as StoryJob;
        job.state = 'uncertain';
        job.reason = 'Interrupted generation was not repeated.';
        job.item = { ...job.item, status: 'failed', text: narrationFailed };
        await this.saveStory(worldId, job);
      }
    });
  }
  async sourcesCurrent(worldId: string, job: StoryJob): Promise<boolean> {
    if (!job.sources.length) return true;
    if (!this.sourceAccess(worldId, job.actorId)) return false;
    const privacy = this.sourceAccessRevision(worldId, job.actorId);
    const eligibility = `${this.narrationRevision}:${this.bannerSourceEpochs.get(job.actorId) ?? 0}`;
    const read = () =>
      this.db
        .prepare(
          `SELECT p.event_id,p.payload FROM history_perspectives p
        WHERE p.world_id=? AND p.actor_id=? AND p.event_id IN (${job.sources.map(() => '?').join(',')})
          AND ${storyAccountAvailableSql()}`,
        )
        .all(worldId, job.actorId, ...job.sources.map((source) => source.id));
    const rows = await (this.db.readForActor
      ? this.db.readForActor(worldId, job.actorId, read)
      : read());
    if (
      !this.sourceAccess(worldId, job.actorId) ||
      privacy !== this.sourceAccessRevision(worldId, job.actorId) ||
      eligibility !== `${this.narrationRevision}:${this.bannerSourceEpochs.get(job.actorId) ?? 0}`
    )
      return false;
    const current = new Map(rows.map((row) => [String(row['event_id']), String(row['payload'])]));
    return job.sources.every((source) => {
      const payload = current.get(source.id);
      return (
        payload !== undefined &&
        this.narrationSourceAtCurrentCut(worldId, job.actorId, source.id) &&
        this.sourceAtCurrentCut(worldId, job.actorId, payload) &&
        (JSON.parse(payload) as { revision: string }).revision === source.revision
      );
    });
  }
  async optionalSources(worldId: string, job: StoryJob): Promise<StorySource[]> {
    return this.readForActor(worldId, job.actorId, async () => {
      const rows = await this.db
        .prepare(
          `SELECT p.payload,${storyAccountSql()} AS account_payload FROM history_perspectives p WHERE p.world_id=? AND p.actor_id=? AND p.position<=?
          AND ${storyAccountAvailableSql()} ORDER BY p.position DESC,p.event_id DESC LIMIT 12`,
        )
        .all(worldId, job.actorId, job.item.order);
      return rows
        .filter((row) => this.sourceAtCurrentCut(worldId, job.actorId, String(row['payload'])))
        .map((row) => storySourceRow(row))
        .filter((source) => this.narrationSourceAtCurrentCut(worldId, job.actorId, source.id))
        .filter((s) => !job.sources.some((m) => m.id === s.id))
        .slice(0, 8);
    });
  }
  async publish(
    worldId: string,
    job: StoryJob,
    text: string | null,
    reason?: string,
    receipt?: unknown,
  ): Promise<boolean> {
    return this.db.transaction(async () => {
      const row = await this.db
        .prepare('SELECT state,payload FROM story_jobs WHERE world_id=? AND id=? AND owner_id=?')
        .get(worldId, job.id, job.ownerId);
      if (row?.['state'] !== 'running') {
        if (row && receipt) {
          const cancelled = JSON.parse(String(row['payload'])) as StoryJob;
          cancelled.receipt = receipt;
          await this.db
            .prepare('UPDATE story_jobs SET payload=? WHERE world_id=? AND owner_id=? AND id=?')
            .run(JSON.stringify(cancelled), worldId, job.ownerId, job.id);
        }
        return false;
      }
      if (!(await this.sourcesCurrent(worldId, job))) {
        const original = JSON.parse(String(row['payload'])) as StoryJob;
        if (await this.sourcesCurrent(worldId, original)) {
          original.state = 'cancelled';
          original.item.status = 'fallback';
          original.reason = 'Context changed before publication.';
          original.receipt = receipt;
          await this.saveStory(worldId, original);
        } else await this.revokeStories(worldId, original.sources[0]!.id, original.ownerId);
        return false;
      }
      delete job.previousItem;
      const fallback =
        !text && job.sources.some((source) => source.evidence.exposure)
          ? job.sources
              .filter((source) => job.item.sourceIds.includes(source.id))
              .map((source) => nativeText(source.text))
              .join(' ')
          : null;
      job.state = text ? 'completed' : fallback ? 'fallback' : 'failed';
      job.item = {
        ...job.item,
        text: text || fallback || narrationFailed,
        status: text ? 'completed' : fallback ? 'fallback' : 'failed',
        authoredFallback: !!fallback,
        revision: (job.item.revision ?? 1) + 1,
      };
      job.reason = reason;
      job.receipt = receipt;
      await this.saveStory(worldId, job);
      for (const source of job.sources) {
        const table = job.item.sourceIds.includes(source.id)
          ? 'story_event_sources'
          : 'story_context_sources';
        await this.db
          .prepare(`INSERT INTO ${table} VALUES (?,?,?,?) ON CONFLICT DO NOTHING`)
          .run(worldId, job.id, job.ownerId, source.id);
      }
      return true;
    });
  }
  async regenerate(
    worldId: string,
    ownerId: string,
    id: string,
    requestId: string,
  ): Promise<boolean> {
    const result = await this.db.transaction(async () => {
      const key = `story-regeneration:${worldId}:${ownerId}:${requestId}`;
      const prior = await this.db.prepare('SELECT value FROM meta WHERE key=?').get(key);
      if (prior) return prior['value'] === id;
      const row = await this.db
        .prepare('SELECT payload FROM story_jobs WHERE world_id=? AND id=? AND owner_id=?')
        .get(worldId, id, ownerId);
      if (!row) return false;
      const job = JSON.parse(String(row['payload'])) as StoryJob;
      if (
        !job.selection ||
        ['queued', 'running', 'uncertain', 'cancelled'].includes(job.state) ||
        !(await this.sourcesCurrent(worldId, job))
      )
        return false;
      job.previousItem = structuredClone(job.item);
      job.state = 'queued';
      job.item.revision = (job.item.revision ?? 1) + 1;
      job.item.status = 'pending';
      const voice = await this.db
        .prepare('SELECT value FROM meta WHERE key=?')
        .get(`integration:narrator-voice:${ownerId}`);
      if (voice) job.voice = JSON.parse(String(voice['value'])) as NarratorVoice;
      job.item.voice = job.voice;
      await this.saveStory(worldId, job);
      await this.db.prepare('INSERT INTO meta VALUES (?,?)').run(key, id);
      return true;
    });
    this.committed();
    return result;
  }

  async eventPage(worldId: string, before = Number.MAX_SAFE_INTEGER, actorId?: string) {
    return actorId
      ? this.readForActor(worldId, actorId, () => this.readEventPage(worldId, before, actorId))
      : this.readEventPage(worldId, before);
  }
  private async readEventPage(worldId: string, before: number, actorId?: string) {
    const rows = actorId
      ? await this.db
          .prepare(
            `SELECT e.payload,p.position FROM history_perspectives p
          JOIN history_events e ON e.world_id=p.world_id AND e.id=p.event_id
          WHERE p.world_id=? AND p.actor_id=? AND p.position<? ORDER BY p.position DESC,p.event_id DESC LIMIT 101`,
          )
          .all(worldId, actorId, before)
      : await this.db
          .prepare(
            'SELECT payload,position FROM history_events WHERE world_id=? AND position<? ORDER BY position DESC,id DESC LIMIT 101',
          )
          .all(worldId, before);
    const page = rows.slice(0, 100);
    return {
      events: page.map((row) => JSON.parse(String(row['payload'])) as WorldEvent),
      before: rows.length > 100 ? Number(page.at(-1)!['position']) : undefined,
    };
  }
  async latestNarration(
    worldId: string,
    ownerId: string,
    timing?: { at: number; maxAgeSeconds: number },
  ): Promise<{ status: 'current'; item: TranscriptItem | null } | { status: 'stale' }> {
    const principal = this.principals.find((p) => p.ownerId === ownerId);
    if (!principal) throw new Error('Unsupported history principal.');
    if (timing) this.bannerRevisionAt(worldId, ownerId, timing);
    if (!this.sourceAccess(worldId, principal.actorId)) return { status: 'stale' };
    const revision = this.narrationRevision,
      privacy = this.sourceAccessRevision(worldId, principal.actorId),
      eligibility = this.bannerSourceEpochs.get(principal.actorId);
    const key = JSON.stringify([worldId, ownerId, principal.actorId]);
    const cacheable = this.db.transactionActive === false;
    const cached = cacheable ? this.narrationReads.get(key) : undefined;
    if (
      cached?.revision === revision &&
      (cached.oldestTemporalAt === undefined || !!timing) &&
      (cached.result === null || (cached.privacy === privacy && cached.eligibility === eligibility))
    )
      return cached.value;
    let oldestTemporalAt: number | undefined;
    const value = (async (): Promise<
      { status: 'current'; item: TranscriptItem | null } | { status: 'stale' }
    > => {
      const read = () =>
        this.db
          .prepare(
            `SELECT b.payload,NOT EXISTS (
        SELECT 1 FROM story_event_sources source WHERE source.world_id=b.world_id AND source.owner_id=b.owner_id AND source.narration_id=b.id
          AND NOT EXISTS (SELECT 1 FROM history_perspectives p WHERE p.world_id=source.world_id AND p.actor_id=? AND p.event_id=source.event_id AND ${storyAccountAvailableSql()})) AS available,
        (SELECT min((p.payload::jsonb#>>'{account,receivedAt}')::double precision)
          FROM story_event_sources source JOIN history_perspectives p ON p.world_id=source.world_id AND p.actor_id=? AND p.event_id=source.event_id
          WHERE source.world_id=b.world_id AND source.owner_id=b.owner_id AND source.narration_id=b.id AND p.payload::jsonb#>>'{account,kind}'='temporal') AS oldest_temporal_at
        FROM story_banners b WHERE b.world_id=? AND b.owner_id=? ORDER BY b.position DESC,b.id DESC LIMIT 1`,
          )
          .get(principal.actorId, principal.actorId, worldId, ownerId);
      const row = await (this.db.readForActor
        ? this.db.readForActor(worldId, principal.actorId, read)
        : read());
      if (typeof row?.['oldest_temporal_at'] === 'number')
        oldestTemporalAt = row['oldest_temporal_at'];
      if (
        revision !== this.narrationRevision ||
        !this.sourceAccess(worldId, principal.actorId) ||
        privacy !== this.sourceAccessRevision(worldId, principal.actorId) ||
        eligibility !== this.bannerSourceEpochs.get(principal.actorId)
      )
        return { status: 'stale' };
      return {
        status: 'current',
        item:
          row &&
          row['available'] === true &&
          (oldestTemporalAt === undefined ||
            !timing ||
            temporalRecentAt(oldestTemporalAt, timing.at, timing.maxAgeSeconds))
            ? publicTranscriptItem(
                projectNarration(JSON.parse(String(row['payload'])) as TranscriptItem),
                worldId,
                principal.actorId,
              )
            : null,
      };
    })();
    if (cacheable) {
      if (this.narrationReads.size >= 256)
        this.narrationReads.delete(this.narrationReads.keys().next().value!);
      const entry: {
        revision: number;
        privacy: unknown;
        eligibility: number | undefined;
        result?: TranscriptItem | null;
        oldestTemporalAt?: number;
        value: typeof value;
      } = { revision, privacy, eligibility, value };
      this.narrationReads.set(key, entry);
      // A transient storage failure must not poison a reusable absent-banner result.
      void value.then(
        (result) => {
          if (result.status === 'current') {
            entry.result = result.item;
            entry.oldestTemporalAt = oldestTemporalAt;
          }
        },
        () => {
          if (this.narrationReads.get(key) === entry) this.narrationReads.delete(key);
        },
      );
    }
    return value;
  }

  async perceivedEvents(
    worldId: string,
    ownerId: string,
    actorId: string,
    epoch: string,
    options: PerceivedEventOptions = {},
    sourceEpoch = epoch,
    corrections?: Record<string, string>,
    presentation?: EventPresentationPolicy,
    currentRoles?: import('./perceived-events.js').PublicEventRoleProjection,
  ) {
    if (!this.principals.some((p) => p.ownerId === ownerId && p.actorId === actorId))
      throw new Error('Unsupported history principal.');
    return this.readForActor(worldId, actorId, () =>
      readPerceivedEvents(
        this.db,
        worldId,
        actorId,
        JSON.stringify([worldId, ownerId, actorId, epoch]),
        options,
        JSON.stringify([worldId, ownerId, actorId, sourceEpoch]),
        corrections,
        presentation,
        currentRoles,
      ),
    );
  }
  async perceivedEventSources(
    worldId: string,
    ownerId: string,
    actorId: string,
    sourceEpoch: string,
    references: readonly WorldEventSourceReference[],
    state?: { corrections?: Record<string, string>; forgotten?: readonly string[] },
  ) {
    if (!this.principals.some((p) => p.ownerId === ownerId && p.actorId === actorId))
      throw new Error('Unsupported history principal.');
    return this.readForActor(worldId, actorId, () =>
      readPerceivedEventSources(
        this.db,
        worldId,
        actorId,
        JSON.stringify([worldId, ownerId, actorId, sourceEpoch]),
        references,
        state,
      ),
    );
  }
  async transcript(
    worldId: string,
    ownerId: string,
    actorId: string,
    options: {
      participantId?: string;
      speechOnly?: boolean;
      responseActions?: boolean;
      before?: number;
      watermark?: number;
      limit?: number;
    } = {},
  ): Promise<TranscriptPage> {
    return this.readForActor(worldId, actorId, () =>
      this.readTranscript(worldId, ownerId, actorId, options),
    );
  }
  private async readTranscript(
    worldId: string,
    ownerId: string,
    actorId: string,
    options: {
      participantId?: string;
      speechOnly?: boolean;
      responseActions?: boolean;
      before?: number;
      watermark?: number;
      limit?: number;
    } = {},
  ): Promise<TranscriptPage> {
    // This application currently has exactly one authenticated player principal.
    if (!this.principals.some((p) => p.ownerId === ownerId && p.actorId === actorId))
      throw new Error('Unsupported history principal.');
    const limit = Math.max(1, Math.min(100, options.limit ?? 40));
    const position = perspectiveField('order', 'p');
    // Talk and Journal share the actor-scoped index; unseen global history must not
    // turn each message-page read into a world-size scan.
    const maximum = await this.db
      .prepare(
        `SELECT MAX(position) AS position FROM (SELECT MAX(${position}) AS position FROM history_perspectives p WHERE p.world_id=? AND p.actor_id=? UNION ALL SELECT MAX(position) FROM story_narrations WHERE world_id=? AND owner_id=?) AS positions`,
      )
      .get(worldId, actorId, worldId, ownerId);
    const watermark = Math.min(
      options.watermark ?? Number(maximum?.['position'] ?? 0),
      Number(maximum?.['position'] ?? 0),
    );
    const boundary = Math.min(options.before ?? watermark + 1, watermark + 1);
    const select = (
      filter: string,
    ) => `SELECT p.position,p.event_id,e.payload,p.payload AS perspective,${storyAccountSql()} AS account_payload
      FROM history_perspectives p JOIN history_events e ON e.world_id=p.world_id AND e.id=p.event_id
      WHERE p.world_id=? AND p.actor_id=? AND p.position<?${filter}
      ORDER BY p.position DESC,p.event_id DESC LIMIT ?`;
    const params = [worldId, actorId, boundary];
    let events: Record<string, unknown>[];
    if (options.participantId) {
      // Seek each observer-owned role index before merging. An explicitly
      // requested outward response can be an action or sound, not only language.
      // Names in quotations and undisclosed raw targets never supply a participant.
      const filters = [
        " AND p.event_type='speech' AND p.source_id=?",
        " AND p.event_type='speech' AND p.target_id=?",
        ...(options.responseActions ? [' AND p.source_id=? AND p.response_action'] : []),
      ];
      events = await this.db
        .prepare(
          `${filters.map((filter) => `(${select(filter)})`).join(' UNION ')}
         ORDER BY position DESC,event_id DESC LIMIT ?`,
        )
        .all(...filters.flatMap(() => [...params, options.participantId, limit + 1]), limit + 1);
    } else if (options.speechOnly && options.responseActions) {
      events = await this.db
        .prepare(
          `(${select(" AND p.event_type='speech'")}) UNION (${select(' AND p.response_action')}) ORDER BY position DESC,event_id DESC LIMIT ?`,
        )
        .all(...params, limit + 1, ...params, limit + 1, limit + 1);
    } else {
      events = await this.db
        .prepare(
          select(
            options.speechOnly
              ? " AND p.event_type='speech'"
              : ' AND NOT EXISTS (SELECT 1 FROM story_event_sources s JOIN story_narrations n ON n.world_id=s.world_id AND n.id=s.narration_id AND n.owner_id=s.owner_id WHERE s.world_id=e.world_id AND s.event_id=e.id AND s.owner_id=?)',
          ),
        )
        .all(...params, ...(options.speechOnly ? [] : [ownerId]), limit + 1);
    }
    const stories =
      options.speechOnly || options.participantId
        ? []
        : await this.db
            .prepare(
              `SELECT payload FROM story_narrations WHERE world_id=? AND owner_id=? AND position<? ORDER BY position DESC,id DESC LIMIT ?`,
            )
            .all(worldId, ownerId, boundary, limit + 1);
    const items: TranscriptItem[] = events.map((row) => {
      const perspective = storySourceRow(row, 'perspective');
      const event = projectEventEvidence(
        JSON.parse(String(row['payload'])) as WorldEvent,
        perspective.evidence,
      );
      return {
        id: event.id,
        kind: event.type === 'speech' ? 'speech' : 'event',
        text:
          event.speech?.intelligibility !== 'none' &&
          (options.speechOnly || options.participantId) &&
          typeof event.data?.['text'] === 'string'
            ? event.data['text']
            : nativeText(event.text),
        ...(event.speech ? { speech: projectPerceivedSpeech(event.speech) } : {}),
        time: event.at,
        order: Number(row['position']),
        speakerId: event.actorId,
        speaker:
          event.speech?.speaker?.nameAtTime ??
          event.references?.find((reference) => reference.role === 'actor')?.label,
        sourceIds: [event.id],
        impacts: [],
      };
    });
    items.push(
      ...stories.map((row) =>
        projectNarration(JSON.parse(String(row['payload'])) as TranscriptItem),
      ),
    );
    items.sort((a, b) => b.order - a.order || b.id.localeCompare(a.id));
    const page = items.slice(0, limit);
    return {
      items: page.reverse().map((item) => publicTranscriptItem(item, worldId, actorId)),
      watermark,
      ...(items.length > limit ? { before: page[0]!.order } : {}),
    };
  }
}
