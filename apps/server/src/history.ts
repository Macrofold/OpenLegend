import {
  initializePerceivedEventIndexes,
  readPerceivedEvents,
  perspectiveField,
} from './perceived-events.js';
import { projectEventEvidence, type EventEvidence } from '@open-legend/domain';
import {
  appendedEventCount,
  appendedRecordCount,
  defaultStoryPolicy,
  selectStory,
  memoryPerspective,
  type StorySelection,
} from '@open-legend/domain';
import { createHash } from 'node:crypto';
import type {
  WorldState,
  WorldEvent,
  ConversationTransition,
  Awareness,
} from '@open-legend/domain';
import { recordDuration } from './performance.js';
import { prepareHistory } from './history-preparation.js';
import { HistoryBatch } from './history-batch.js';
import type { TranscriptPage, TranscriptItem } from '@open-legend/protocol';
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
  'story_transition_sources',
  'history_totals',
] as const;
export type NarratorVoice = 'restrained' | 'lyrical' | 'wry';
export interface StorySource {
  evidence: EventEvidence;
  id: string;
  text: string;
  revision: string;
  time: number;
  order: number;
  type: string;
  /** Optional permitted utterance; absence is not permission to join raw event text. */
  content?: string;
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
function eventEvidence(awareness: EventEvidence): EventEvidence {
  const {
    actorId,
    text,
    content,
    modality,
    sourceId,
    targetId,
    intendedRecipientId,
    speech,
    importance,
    urgency,
  } = awareness;
  return {
    actorId,
    text,
    content,
    modality,
    sourceId,
    targetId,
    intendedRecipientId,
    speech,
    importance,
    urgency,
  };
}
/** Only observer-permitted identities enter participant indexes. */
function perspectiveColumns(source: StorySource, actorId: string): unknown[] {
  const { sourceId, targetId } = source.evidence;
  const peer =
    source.type !== 'speech'
      ? null
      : sourceId === actorId && targetId
        ? targetId
        : targetId === actorId || targetId == null
          ? (sourceId ?? null)
          : null;
  return [source.order, source.type, sourceId ?? null, targetId ?? null, peer];
}

const narrationFailed = 'Narration failed.';
/** Older failures retain their source evidence in storage, never substitute prose in the UI. */
function projectNarration(item: TranscriptItem): TranscriptItem {
  // Native merge notices have no event sources and did not attempt generation.
  // docs/narration-and-conversations.md#9-triggers-ordering-and-transcript-reconstruction
  return item.status === 'failed' || (item.status === 'fallback' && item.sourceIds.length > 0)
    ? { ...item, status: 'failed', text: narrationFailed }
    : item;
}
/** Scoped durable history repository. Only the application binds owner and perspective. */
export class HistoryRepository {
  constructor(
    private db: SqlDatabase,
    private principals: ReadonlyArray<{ ownerId: string; actorId: string }> = [],
  ) {
    this.bindLocalPrincipal = principals.length === 0;
  }
  private readonly bindLocalPrincipal: boolean;
  private readonly listeners = new Set<() => void>();
  private queuedRevision = 0;
  private notifiedRevision = 0;
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  /** Only called after commit; durable jobs recover a lost notification on restart. */
  committed() {
    if (this.notifiedRevision === this.queuedRevision) return;
    this.notifiedRevision = this.queuedRevision;
    for (const listener of this.listeners) listener();
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
    const rows = await this.db
      .prepare(
        `SELECT e.id FROM history_events e JOIN history_perspectives p
         ON p.world_id=e.world_id AND p.event_id=e.id
         WHERE e.world_id=? AND e.response_id=? AND p.actor_id=?
         AND p.event_type='speech' AND p.speech_peer_id=?
         AND e.payload::jsonb #>> '{data,utteranceId}'=? ORDER BY e.position,e.id LIMIT 16`,
      )
      .all(worldId, responseId, actorId, npcId, `${responseId}:${localId}`);
    return rows.map((row) => String(row['id']));
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
        PRIMARY KEY(world_id,event_id,actor_id));
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
        world_id TEXT NOT NULL, id TEXT NOT NULL, conversation_id TEXT, position BIGINT NOT NULL,
        payload TEXT NOT NULL,response_id TEXT,data_references TEXT[] NOT NULL,
        PRIMARY KEY(world_id,id));
      CREATE INDEX IF NOT EXISTS history_events_response ON history_events(world_id,response_id) WHERE response_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS history_events_references ON history_events USING GIN(data_references);
      CREATE INDEX IF NOT EXISTS history_events_order ON history_events(world_id,position,id);
      CREATE INDEX IF NOT EXISTS history_events_conversation ON history_events(world_id,conversation_id,position,id);
      CREATE TABLE IF NOT EXISTS story_narrations (
        world_id TEXT NOT NULL, id TEXT NOT NULL, owner_id TEXT NOT NULL, conversation_id TEXT,
        position BIGINT NOT NULL, revision BIGINT NOT NULL, payload TEXT NOT NULL,
        PRIMARY KEY(world_id,id,owner_id));
      CREATE INDEX IF NOT EXISTS story_owner_order ON story_narrations(world_id,owner_id,position,id);
      CREATE TABLE IF NOT EXISTS story_event_sources (
        world_id TEXT NOT NULL, narration_id TEXT NOT NULL, owner_id TEXT NOT NULL, event_id TEXT NOT NULL,
        PRIMARY KEY(world_id,narration_id,owner_id,event_id));
      CREATE INDEX IF NOT EXISTS story_event_reverse ON story_event_sources(world_id,event_id);
      CREATE TABLE IF NOT EXISTS story_transition_sources (
        world_id TEXT NOT NULL, narration_id TEXT NOT NULL, owner_id TEXT NOT NULL, transition_id TEXT NOT NULL,
        PRIMARY KEY(world_id,narration_id,owner_id,transition_id));
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
      await this.db
        .prepare('DELETE FROM story_banners WHERE world_id=? AND id=? AND owner_id=?')
        .run(worldId, story, owner);
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
  ) {
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
    let removedEvents = 0;
    for (const id of removed) removedEvents += await this.removeEvent(world.id, id);
    const candidates: {
      event: WorldEvent;
      position: number;
      principal: { ownerId: string; actorId: string };
      selection: Extract<StorySelection, { kind: 'candidate' }>;
    }[] = [];
    const policy = world.storyPolicy ?? defaultStoryPolicy();
    const batch = new HistoryBatch(this.db);
    const buildStarted = performance.now();
    for (const event of changed) {
      const encoded = JSON.stringify(event);
      const eventRevision = revisionOf(encoded);
      const retainedPerspectives = new Map<string, StorySource>();
      if (!fastAppend) {
        const retained = await this.db
          .prepare('SELECT payload FROM history_events WHERE world_id=? AND id=?')
          .get(world.id, event.id);
        if (retained?.['payload'] === encoded) continue;
        if (retained)
          for (const row of await this.db
            .prepare(
              'SELECT actor_id,payload FROM history_perspectives WHERE world_id=? AND event_id=?',
            )
            .all(world.id, event.id))
            retainedPerspectives.set(
              String(row['actor_id']),
              JSON.parse(String(row['payload'])) as StorySource,
            );
        removedEvents += await this.removeEvent(world.id, event.id);
      }
      const perspectives = new Map<string, StorySource>();
      const position = event.order ?? (Number(event.id.split('-').at(-1)) || event.sequence);
      const eventFlush = batch.add('history_events', [
        world.id,
        event.id,
        event.conversationId ?? null,
        position,
        encoded,
        typeof event.data?.['responseId'] === 'string' ? event.data['responseId'] : null,
        [
          ...new Set(
            Object.values(event.data ?? {}).filter(
              (value): value is string => typeof value === 'string' && value !== event.id,
            ),
          ),
        ],
      ]);
      if (eventFlush) await eventFlush;
      for (const actorId of new Set(event.audience)) {
        if (forgotten(actorId).has(event.id)) continue;
        const awareness = perspective(actorId, event.id);
        let evidence = awareness ? eventEvidence(awareness) : undefined;
        const retained = retainedPerspectives.get(actorId);
        if (!evidence && retained) {
          // Consolidation removes hot recall, not durable authorization. Reuse that perspective;
          // the domain forbids speech rewrites, so this path only rephrases non-speech edits.
          evidence =
            event.type === 'speech'
              ? retained.evidence
              : {
                  ...retained.evidence,
                  text: memoryPerspective(
                    world,
                    actorId,
                    event.text,
                    false,
                    retained.evidence.sourceId,
                  ),
                  content:
                    typeof event.data?.['text'] === 'string' ? event.data['text'] : event.text,
                };
        }
        if (!evidence) throw new Error('Committed event audience is missing its perspective.');
        const source: StorySource = {
          id: event.id,
          text: evidence.text,
          evidence,
          revision: revisionOf(eventRevision + JSON.stringify(evidence)),
          time: event.at,
          order: position,
          type: event.type,
          ...(evidence.content !== undefined ? { content: evidence.content } : {}),
        };
        perspectives.set(actorId, source);
        const perspectiveFlush = batch.add('history_perspectives', [
          world.id,
          event.id,
          actorId,
          JSON.stringify(source),
          ...perspectiveColumns(source, actorId),
          event.data?.['responseId'] != null || event.data?.['conversationRelevant'] === true,
        ]);
        if (perspectiveFlush) await perspectiveFlush;
      }
      // Only newly committed evidence can trigger a story; startup never replays history.
      if (previous && !previousIds?.has(event.id))
        for (const principal of this.principals) {
          if (forgotten(principal.actorId).has(event.id)) continue;
          const source = perspectives.get(principal.actorId);
          if (!source) continue;
          const perceived = projectEventEvidence(event, source.evidence);
          const selection = selectStory(
            {
              viewerId: principal.actorId,
              event: perceived,
              sourceText: source.text,
              source: world.entities[perceived.actorId ?? ''],
              target: world.entities[perceived.targetId ?? ''],
            },
            policy,
          );
          if (selection.kind === 'candidate')
            candidates.push({ event: perceived, position, principal, selection });
        }
    }
    // Persist sources before scheduling; selection follows docs/narration-and-conversations.md#replaceable-story-selection.
    await batch.flush();
    if (!previous)
      await this.db
        .prepare(
          'INSERT INTO history_totals(world_id,event_count) VALUES (?,0) ON CONFLICT DO NOTHING',
        )
        .run(world.id);
    if (batch.insertedEvents !== removedEvents) {
      const total = await this.db
        .prepare(
          'UPDATE history_totals SET event_count=event_count+? WHERE world_id=? RETURNING event_count',
        )
        .get(batch.insertedEvents - removedEvents, world.id);
      if (!total) throw new Error('Retained history count is missing; commit refused.');
    }
    recordDuration(
      'history.sourceBuild',
      Math.max(0, performance.now() - buildStarted - batch.writeMilliseconds),
    );
    candidates.sort(
      (a, b) =>
        b.selection.significance - a.selection.significance ||
        a.position - b.position ||
        a.event.id.localeCompare(b.event.id),
    );
    for (const { event, principal, selection } of candidates) {
      if (
        selection.milestoneKey &&
        (await this.db
          .prepare(
            'SELECT event_id FROM story_milestones WHERE world_id=? AND owner_id=? AND milestone=?',
          )
          .get(world.id, principal.ownerId, selection.milestoneKey))
      )
        continue;
      if (await this.schedule(world, event, principal, selection)) {
        if (selection.milestoneKey)
          await this.db
            .prepare('INSERT INTO story_milestones VALUES (?,?,?,?) ON CONFLICT DO NOTHING')
            .run(world.id, principal.ownerId, selection.milestoneKey, event.id);
      }
    }
    for (const [actorId, ids] of Object.entries(world.experience?.forgotten ?? {})) {
      // Installing a save also replaces historical permissions. Even an unchanged
      // present-day ledger must revoke access restored by that older snapshot.
      // docs/save-and-load.md#external-work-privacy-and-shared-authority
      if (!reapplyForgetting && ids === previous?.experience?.forgotten[actorId]) continue;
      const old = new Set(reapplyForgetting ? [] : previous?.experience?.forgotten[actorId]);
      for (const id of ids)
        if (!old.has(id)) {
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
    if (previous)
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
          const row = await this.db
            .prepare(
              'SELECT payload FROM history_perspectives WHERE world_id=? AND event_id=? AND actor_id=?',
            )
            .get(world.id, entry.eventId, actorId);
          if (!row) continue;
          const source = JSON.parse(String(row['payload'])) as StorySource;
          source.text = entry.text;
          source.evidence = eventEvidence(entry);
          if (entry.content !== undefined) source.content = entry.content;
          else delete source.content;
          source.revision = revisionOf(JSON.stringify(entry));
          await this.db
            .prepare(
              'UPDATE history_perspectives SET payload=?,position=?,event_type=?,source_id=?,target_id=?,speech_peer_id=? WHERE world_id=? AND event_id=? AND actor_id=?',
            )
            .run(
              JSON.stringify(source),
              ...perspectiveColumns(source, actorId),
              world.id,
              entry.eventId,
              actorId,
            );
          for (const principal of this.principals.filter((p) => p.actorId === actorId))
            await this.revokeStories(world.id, entry.eventId, principal.ownerId);
        }
      }
    for (const [actorId, corrections] of Object.entries(world.experience?.corrections ?? {})) {
      if (corrections === previous?.experience?.corrections?.[actorId]) continue;
      for (const [id, evidence] of Object.entries(corrections)) {
        if (previous?.experience?.corrections?.[actorId]?.[id] === evidence) continue;
        const eventId = world.memories[actorId]?.find((m) => m.id === id)?.eventId ?? id;
        for (const principal of this.principals.filter((p) => p.actorId === actorId))
          await this.revokeStories(world.id, eventId, principal.ownerId);
      }
    }
    const transitions = world.conversations?.transitions ?? {};
    if (transitions !== previous?.conversations?.transitions)
      for (const record of Object.values(transitions))
        if (
          !previous?.conversations?.transitions[record.id] &&
          record.kind === 'merge' &&
          this.principals.some((p) => record.actorIds.includes(p.actorId))
        )
          for (const principal of this.principals.filter((p) =>
            record.actorIds.includes(p.actorId),
          ))
            await this.mergeNotice(world.id, record, principal.ownerId);
    if (transitions !== previous?.conversations?.transitions)
      for (const record of Object.values(previous?.conversations?.transitions ?? {}))
        if (!transitions[record.id]) {
          await this.db
            .prepare('DELETE FROM story_narrations WHERE world_id=? AND id=?')
            .run(world.id, `story:${record.id}`);
          await this.db
            .prepare('DELETE FROM story_transition_sources WHERE world_id=? AND transition_id=?')
            .run(world.id, record.id);
        }
  }
  private async schedule(
    world: WorldState,
    event: WorldEvent,
    { ownerId, actorId }: { ownerId: string; actorId: string },
    selection: Extract<StorySelection, { kind: 'candidate' }>,
  ) {
    const policy = world.storyPolicy ?? defaultStoryPolicy();
    // Bind environmental events to the player's group at event time, never at dispatch.
    const conversationId = event.conversationId ?? world.conversations?.active[actorId];
    const base = `story:${ownerId}:${conversationId ?? 'world'}:${selection.groupKey}`;
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
    const row = await this.db
      .prepare(
        'SELECT payload FROM history_perspectives WHERE world_id=? AND event_id=? AND actor_id=?',
      )
      .get(world.id, event.id, actorId);
    if (!row) return false;
    const source = JSON.parse(String(row['payload'])) as StorySource;
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
      for (const field of ['healthDelta', 'injuryDelta', 'wetnessDelta', 'burningDelta']) {
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
      text: sources.map((s) => s.text).join(' '),
      time: anchor.time,
      order: anchor.order,
      conversationId,
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
    if (
      job.selection &&
      !job.item.conversationId &&
      ['completed', 'failed', 'fallback', 'uncertain'].includes(job.state)
    )
      await this.db
        .prepare(
          'INSERT INTO story_banners VALUES (?,?,?,?,?) ON CONFLICT(world_id,owner_id,id) DO UPDATE SET position=excluded.position,payload=excluded.payload',
        )
        .run(worldId, job.ownerId, job.id, job.item.order, JSON.stringify(job.item));
    else
      await this.db
        .prepare('DELETE FROM story_banners WHERE world_id=? AND owner_id=? AND id=?')
        .run(worldId, job.ownerId, job.id);
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
        'INSERT INTO story_narrations VALUES (?,?,?,?,?,?,?) ON CONFLICT(world_id,id,owner_id) DO UPDATE SET position=excluded.position,revision=excluded.revision,payload=excluded.payload',
      )
      .run(
        worldId,
        job.id,
        job.ownerId,
        item.conversationId ?? null,
        item.order,
        item.revision ?? 1,
        JSON.stringify(item),
      );
  }
  /** Claim is persisted before any paid reservation; restarted claims never redispatch. */
  async claim(worldId: string, before: number, world?: WorldState): Promise<StoryJob | null> {
    return this.db.transaction(async () => {
      const row = await this.db
        .prepare(
          "SELECT payload FROM story_jobs WHERE world_id=? AND state='queued' AND created_at<=? ORDER BY created_at,id LIMIT 1",
        )
        .get(worldId, before);
      if (!row) return null;
      const job = JSON.parse(String(row['payload'])) as StoryJob;
      if (!world || !(await this.selectionCurrent(world, job))) {
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
  async selectionCurrent(world: WorldState, job: StoryJob): Promise<boolean> {
    const policy = world.storyPolicy ?? defaultStoryPolicy();
    const row = await this.db
      .prepare('SELECT state FROM story_jobs WHERE world_id=? AND owner_id=? AND id=?')
      .get(world.id, job.ownerId, job.id);
    if (!row || !['queued', 'running'].includes(String(row['state']))) return false;
    if (
      !job.selection ||
      !policy.enabled ||
      job.selection.policyRevision !== (world.storyPolicyRevision ?? 0) ||
      job.selection.policyDigest !== revisionOf(JSON.stringify(policy)) ||
      world.simTime - job.item.time > policy.delivery.maximumAge
    )
      return false;
    if (!(await this.sourcesCurrent(world.id, job))) return false;
    for (const id of job.item.sourceIds) {
      const row = await this.db
        .prepare('SELECT payload FROM history_events WHERE world_id=? AND id=?')
        .get(world.id, id);
      if (!row) return false;
      const evidence = job.sources.find((source) => source.id === id)?.evidence;
      if (!evidence) return false;
      const event = projectEventEvidence(
        JSON.parse(String(row['payload'])) as WorldEvent,
        evidence,
      );
      if (
        selectStory(
          {
            viewerId: job.actorId,
            event,
            sourceText: job.sources.find((s) => s.id === id)?.text ?? '',
            source: world.entities[event.actorId ?? ''],
            target: world.entities[event.targetId ?? ''],
          },
          policy,
        ).kind !== 'candidate'
      )
        return false;
    }
    return true;
  }
  async cancel(worldId: string, job: StoryJob) {
    await this.db.transaction(async () => {
      const row = await this.db
        .prepare('SELECT state FROM story_jobs WHERE world_id=? AND owner_id=? AND id=?')
        .get(worldId, job.ownerId, job.id);
      if (!row || !['queued', 'running'].includes(String(row['state']))) return;
      job.state = 'cancelled';
      job.reason = 'Story selection no longer valid before dispatch.';
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
    for (const source of job.sources) {
      const row = await this.db
        .prepare(
          'SELECT payload FROM history_perspectives WHERE world_id=? AND event_id=? AND actor_id=?',
        )
        .get(worldId, source.id, job.actorId);
      if (!row || (JSON.parse(String(row['payload'])) as StorySource).revision !== source.revision)
        return false;
    }
    return true;
  }
  async optionalSources(worldId: string, job: StoryJob): Promise<StorySource[]> {
    const rows = await this.db
      .prepare(
        'SELECT payload FROM history_perspectives WHERE world_id=? AND actor_id=? AND position<=? ORDER BY position DESC,event_id DESC LIMIT 12',
      )
      .all(worldId, job.actorId, job.item.order);
    return rows
      .map((row) => JSON.parse(String(row['payload'])) as StorySource)
      .filter((s) => !job.sources.some((m) => m.id === s.id))
      .slice(0, 8);
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
      job.state = text ? 'completed' : 'failed';
      job.item = {
        ...job.item,
        text: text || narrationFailed,
        status: text ? 'completed' : 'failed',
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

  private async mergeNotice(worldId: string, record: ConversationTransition, ownerId: string) {
    const id = `story:${record.id}`;
    const item: TranscriptItem = {
      id,
      kind: 'narration',
      text: `Joined conversation ${record.conversationId}.`,
      time: record.at,
      order: record.order,
      conversationId: record.sourceId,
      sourceIds: [],
      impacts: [],
      status: 'completed',
      revision: 1,
    };
    await this.db
      .prepare('INSERT INTO story_narrations VALUES (?,?,?,?,?,?,?) ON CONFLICT DO NOTHING')
      .run(worldId, id, ownerId, record.sourceId ?? null, record.order, 1, JSON.stringify(item));
    await this.db
      .prepare('INSERT INTO story_transition_sources VALUES (?,?,?,?) ON CONFLICT DO NOTHING')
      .run(worldId, id, ownerId, record.id);
  }
  async eventPage(worldId: string, before = Number.MAX_SAFE_INTEGER, actorId?: string) {
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
  async latestNarration(worldId: string, ownerId: string): Promise<TranscriptItem | null> {
    if (!this.principals.some((p) => p.ownerId === ownerId))
      throw new Error('Unsupported history principal.');
    const row = await this.db
      .prepare(
        'SELECT payload FROM story_banners WHERE world_id=? AND owner_id=? ORDER BY position DESC,id DESC LIMIT 1',
      )
      .get(worldId, ownerId);
    return row ? projectNarration(JSON.parse(String(row['payload'])) as TranscriptItem) : null;
  }
  async perceivedEvents(
    worldId: string,
    ownerId: string,
    actorId: string,
    epoch: string,
    options: { type?: string; cursor?: string; limit?: number; q?: string } = {},
  ) {
    if (!this.principals.some((p) => p.ownerId === ownerId && p.actorId === actorId))
      throw new Error('Unsupported history principal.');
    return readPerceivedEvents(
      this.db,
      worldId,
      actorId,
      JSON.stringify([worldId, ownerId, actorId, epoch]),
      options,
    );
  }
  async transcript(
    worldId: string,
    ownerId: string,
    actorId: string,
    options: {
      conversationId?: string;
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
    const storyFilter = options.conversationId ? ' AND conversation_id=?' : '';
    const args = options.conversationId ? [options.conversationId] : [];
    const select = (
      filter: string,
    ) => `SELECT p.position,p.event_id,e.payload,p.payload AS perspective
      FROM history_perspectives p JOIN history_events e ON e.world_id=p.world_id AND e.id=p.event_id
      WHERE p.world_id=? AND p.actor_id=? AND p.position<?${options.conversationId ? ' AND e.conversation_id=?' : ''}${filter}
      ORDER BY p.position DESC,p.event_id DESC LIMIT ?`;
    const params = [worldId, actorId, boundary, ...args];
    let events: Record<string, unknown>[];
    if (options.participantId) {
      // Seek two indexed streams before merging: permitted dialogue with this person,
      // and that person's conversation-related actions. UNION removes their overlap.
      // docs/performance.md#compact-transactional-persistence
      const speech = select(' AND p.speech_peer_id=?');
      events = options.responseActions
        ? await this.db
            .prepare(
              `(${speech}) UNION (${select(' AND p.source_id=? AND p.response_action')}) ORDER BY position DESC,event_id DESC LIMIT ?`,
            )
            .all(
              ...params,
              options.participantId,
              limit + 1,
              ...params,
              options.participantId,
              limit + 1,
              limit + 1,
            )
        : await this.db.prepare(speech).all(...params, options.participantId, limit + 1);
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
              `SELECT payload FROM story_narrations WHERE world_id=? AND owner_id=? AND position<?${storyFilter} ORDER BY position DESC,id DESC LIMIT ?`,
            )
            .all(worldId, ownerId, boundary, ...args, limit + 1);
    const items: TranscriptItem[] = events.map((row) => {
      const perspective = JSON.parse(String(row['perspective'])) as StorySource;
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
            : event.text,
        speech: event.speech,
        time: event.at,
        order: Number(row['position']),
        conversationId: event.conversationId,
        speakerId: event.actorId,
        sourceIds: [event.id],
        impacts: [],
        legacy: !event.conversationId && event.type === 'speech',
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
      items: page.reverse(),
      watermark,
      ...(items.length > limit ? { before: page[0]!.order } : {}),
    };
  }
}
