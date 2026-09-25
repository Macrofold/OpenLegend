import {
  controlledEntityId,
  appendedEventCount,
  defaultStoryPolicy,
  selectStory,
  type StorySelection,
} from '@open-legend/domain';
import { createHash } from 'node:crypto';
import { timed, timedSync } from './performance.js';
import type { WorldState, WorldEvent, ConversationTransition } from '@open-legend/domain';
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
  'history_audiences',
  'story_narrations',
  'story_event_sources',
  'story_transition_sources',
] as const;
export type NarratorVoice = 'restrained' | 'lyrical' | 'wry';
export interface StorySource {
  id: string;
  text: string;
  revision: string;
  time: number;
  order: number;
  type: string;
}
export interface StoryJob {
  id: string;
  ownerId: string;
  actorId: string;
  item: TranscriptItem;
  sources: StorySource[];
  voice: NarratorVoice;
  createdAt: number;
  state: 'queued' | 'running' | 'completed' | 'fallback' | 'uncertain' | 'cancelled';
  reason?: string;
  receipt?: unknown;
  previousItem?: TranscriptItem;
  selection?: { mechanism: string; version: number; policyRevision: number; policyDigest: string };
}
const revisionOf = (text: string) => createHash('sha256').update(text).digest('hex');
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
  /** Rare owner edits require the complete dependency graph, including cold references. */
  async allEvents(worldId: string): Promise<WorldEvent[]> {
    const rows = await this.db
      .prepare('SELECT payload FROM history_events WHERE world_id=? ORDER BY position,id')
      .all(worldId);
    return rows.map((row) => JSON.parse(String(row['payload'])) as WorldEvent);
  }
  async hasResponse(worldId: string, responseId: string): Promise<boolean> {
    return !!(await this.db
      .prepare(
        "SELECT id FROM history_events WHERE world_id=? AND json_extract(payload, '$.data.responseId')=? LIMIT 1",
      )
      .get(worldId, responseId));
  }
  private async insertRows(
    table: 'history_events' | 'history_audiences' | 'history_perspectives',
    rows: unknown[][],
  ) {
    // Stay below SQLite's portable parameter limit and bound encoded statement payloads.
    for (let offset = 0; offset < rows.length; ) {
      let bytes = 0,
        count = 0,
        parameters = 0;
      for (let index = offset; index < rows.length; index++) {
        const row = rows[index]!;
        const size = Buffer.byteLength(JSON.stringify(row));
        if (count && (bytes + size > 262144 || parameters + row.length > 900)) break;
        bytes += size;
        parameters += row.length;
        count++;
      }
      const chunk = rows.slice(offset, offset + count);
      offset += count;
      await timed('history.write', () =>
        this.db
          .prepare(
            `INSERT INTO ${table} VALUES ${chunk.map((row) => `(${row.map(() => '?').join(',')})`).join(',')}`,
          )
          .run(...chunk.flat()),
      );
    }
  }
  async initialize() {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS story_banners (
        world_id TEXT NOT NULL, owner_id TEXT NOT NULL, id TEXT NOT NULL, position BIGINT NOT NULL, payload TEXT NOT NULL,
        PRIMARY KEY(world_id,owner_id,id));
      CREATE INDEX IF NOT EXISTS story_banner_order ON story_banners(world_id,owner_id,position,id);
      CREATE TABLE IF NOT EXISTS story_delivery (
        world_id TEXT NOT NULL, owner_id TEXT NOT NULL, game_time DOUBLE PRECISION NOT NULL,
        PRIMARY KEY(world_id,owner_id));
      CREATE TABLE IF NOT EXISTS history_perspectives (
        world_id TEXT NOT NULL,event_id TEXT NOT NULL,actor_id TEXT NOT NULL,payload TEXT NOT NULL,
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
        payload TEXT NOT NULL, PRIMARY KEY(world_id,id));
      CREATE INDEX IF NOT EXISTS history_events_order ON history_events(world_id,position,id);
      CREATE INDEX IF NOT EXISTS history_events_conversation ON history_events(world_id,conversation_id,position,id);
      CREATE TABLE IF NOT EXISTS history_audiences (
        world_id TEXT NOT NULL, event_id TEXT NOT NULL, actor_id TEXT NOT NULL,
        PRIMARY KEY(world_id,event_id,actor_id));
      CREATE INDEX IF NOT EXISTS history_actor ON history_audiences(world_id,actor_id,event_id);
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
    await this.db
      .prepare(
        'DELETE FROM story_narrations WHERE world_id=? AND id IN (SELECT narration_id FROM story_event_sources WHERE world_id=? AND event_id=?)',
      )
      .run(worldId, worldId, id);
    await this.db
      .prepare('DELETE FROM story_event_sources WHERE world_id=? AND event_id=?')
      .run(worldId, id);
    await this.db
      .prepare('DELETE FROM history_audiences WHERE world_id=? AND event_id=?')
      .run(worldId, id);
    await this.db.prepare('DELETE FROM history_events WHERE world_id=? AND id=?').run(worldId, id);
  }
  /** Runs inside the authoritative commit transaction. No paid work and no imagined legacy sources. */
  async project(previous: WorldState | undefined, world: WorldState, appendCount?: number) {
    // The current host has one principal; resolve its perspective from the saved binding.
    if (this.bindLocalPrincipal) {
      this.principals = [{ ownerId: 'local-player', actorId: controlledEntityId(world) }];
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
    // Re-prove the prefix here: a caller hint never authorizes overwriting history.
    const fastAppend =
      previous &&
      appendCount !== undefined &&
      appendedEventCount(previous.events, world.events) === appendCount;
    let changed: WorldEvent[];
    if (fastAppend) changed = world.events.slice(previous!.events.length);
    else {
      const old = new Map(previous?.events.map((event) => [event.id, event]));
      const current = new Set(world.events.map((event) => event.id));
      for (const id of old.keys()) if (!current.has(id)) await this.removeEvent(world.id, id);
      changed = world.events.filter((event) => old.get(event.id) !== event);
    }
    const previousIds = !fastAppend
      ? new Set(previous?.events.map((event) => event.id))
      : undefined;
    const candidates: {
      event: WorldEvent;
      position: number;
      principal: { ownerId: string; actorId: string };
      selection: Extract<StorySelection, { kind: 'candidate' }>;
    }[] = [];
    const policy = world.storyPolicy ?? defaultStoryPolicy();
    // Commit-local indexes preserve first-match semantics without searching a retained array
    // for every witness. No cache survives correction, rollback or a different world snapshot.
    // docs/performance.md#compact-transactional-persistence
    const awarenessIndexes = new Map<string, Map<string, string>>();
    const forgottenIndexes = new Map<string, Set<string>>();
    const forgotten = (actorId: string) => {
      let ids = forgottenIndexes.get(actorId);
      if (!ids) {
        ids = new Set(world.experience?.forgotten[actorId] ?? []);
        forgottenIndexes.set(actorId, ids);
      }
      return ids;
    };
    const perspectiveText = (actorId: string, event: WorldEvent) => {
      let index = awarenessIndexes.get(actorId);
      if (!index) {
        index = timedSync('history.awarenessIndex', () => {
          const values = new Map<string, string>();
          for (const entry of world.experience?.awareness[actorId] ?? [])
            if (!values.has(entry.eventId)) values.set(entry.eventId, entry.text);
          return values;
        });
        awarenessIndexes.set(actorId, index);
      }
      return index.get(event.id) ?? event.text;
    };
    const eventRows: unknown[][] = [],
      audienceRows: unknown[][] = [],
      perspectiveRows: unknown[][] = [];
    for (const event of changed) {
      const encoded = JSON.stringify(event);
      if (!fastAppend) {
        const retained = await this.db
          .prepare('SELECT payload FROM history_events WHERE world_id=? AND id=?')
          .get(world.id, event.id);
        if (retained?.['payload'] === encoded) continue;
        await this.removeEvent(world.id, event.id);
      }
      const perspectives = new Map<string, StorySource>();
      const position = event.order ?? (Number(event.id.split('-').at(-1)) || event.sequence);
      eventRows.push([world.id, event.id, event.conversationId ?? null, position, encoded]);
      for (const actorId of new Set(event.audience)) {
        if (forgotten(actorId).has(event.id)) continue;
        audienceRows.push([world.id, event.id, actorId]);
        const text = perspectiveText(actorId, event);
        const source: StorySource = {
          id: event.id,
          text,
          revision: revisionOf(encoded + text),
          time: event.at,
          order: position,
          type: event.type,
        };
        perspectives.set(actorId, source);
        perspectiveRows.push([world.id, event.id, actorId, JSON.stringify(source)]);
      }
      // Only newly committed evidence can trigger a story; startup never replays history.
      if (previous && !previousIds?.has(event.id))
        for (const principal of this.principals) {
          if (forgotten(principal.actorId).has(event.id)) continue;
          const source = perspectives.get(principal.actorId);
          if (!source) continue;
          const selection = selectStory(
            {
              viewerId: principal.actorId,
              event,
              sourceText: source.text,
              source: world.entities[event.actorId ?? ''],
              target: world.entities[event.targetId ?? ''],
            },
            policy,
          );
          if (selection.kind === 'candidate')
            candidates.push({ event, position, principal, selection });
        }
    }
    // Persist sources before scheduling; selection follows docs/narration-and-conversations.md#replaceable-story-selection.
    await this.insertRows('history_events', eventRows);
    await this.insertRows('history_audiences', audienceRows);
    await this.insertRows('history_perspectives', perspectiveRows);
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
      if (ids === previous?.experience?.forgotten[actorId]) continue;
      const old = new Set(previous?.experience?.forgotten[actorId]);
      for (const id of ids)
        if (!old.has(id)) {
          await this.db
            .prepare('DELETE FROM history_audiences WHERE world_id=? AND event_id=? AND actor_id=?')
            .run(world.id, id, actorId);
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
        const old = new Map(previous.experience?.awareness[actorId]?.map((a) => [a.eventId, a]));
        for (const entry of entries) {
          const prior = old.get(entry.eventId);
          if (!prior || (prior.text === entry.text && prior.content === entry.content)) continue;
          const row = await this.db
            .prepare(
              'SELECT payload FROM history_perspectives WHERE world_id=? AND event_id=? AND actor_id=?',
            )
            .get(world.id, entry.eventId, actorId);
          if (!row) continue;
          const source = JSON.parse(String(row['payload'])) as StorySource;
          source.text = entry.text;
          source.revision = revisionOf(JSON.stringify(entry));
          await this.db
            .prepare(
              'UPDATE history_perspectives SET payload=? WHERE world_id=? AND event_id=? AND actor_id=?',
            )
            .run(JSON.stringify(source), world.id, entry.eventId, actorId);
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
      ['completed', 'fallback', 'uncertain'].includes(job.state)
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
      const event = JSON.parse(String(row['payload'])) as WorldEvent;
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
          job.previousItem = { ...job.item, status: 'fallback' };
          job.state = 'cancelled';
          job.item.status = 'fallback';
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
        job.item.status = 'fallback';
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
        'SELECT p.payload FROM history_perspectives p JOIN history_events e ON e.world_id=p.world_id AND e.id=p.event_id WHERE p.world_id=? AND p.actor_id=? AND e.position<=? ORDER BY e.position DESC LIMIT 12',
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
      job.state = text ? 'completed' : 'fallback';
      job.item = {
        ...job.item,
        text: text ?? job.item.text,
        status: text ? 'completed' : 'fallback',
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
      status: 'fallback',
      revision: 1,
    };
    await this.db
      .prepare('INSERT INTO story_narrations VALUES (?,?,?,?,?,?,?) ON CONFLICT DO NOTHING')
      .run(worldId, id, ownerId, record.sourceId ?? null, record.order, 1, JSON.stringify(item));
    await this.db
      .prepare('INSERT INTO story_transition_sources VALUES (?,?,?,?) ON CONFLICT DO NOTHING')
      .run(worldId, id, ownerId, record.id);
  }
  async eventPage(worldId: string, before = Number.MAX_SAFE_INTEGER) {
    const rows = await this.db
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
    return row ? (JSON.parse(String(row['payload'])) as TranscriptItem) : null;
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
    const maximum = await this.db
      .prepare(
        'SELECT MAX(position) AS position FROM (SELECT position FROM history_events WHERE world_id=? UNION ALL SELECT position FROM story_narrations WHERE world_id=? AND owner_id=?) AS positions',
      )
      .get(worldId, worldId, ownerId);
    const watermark = Math.min(
      options.watermark ?? Number(maximum?.['position'] ?? 0),
      Number(maximum?.['position'] ?? 0),
    );
    const boundary = Math.min(options.before ?? watermark + 1, watermark + 1);
    let filter = options.conversationId ? ' AND e.conversation_id=?' : '';
    const storyFilter = options.conversationId ? ' AND conversation_id=?' : '';
    const args = options.conversationId ? [options.conversationId] : [];
    // Filter before pagination so journal activity cannot crowd speech out of the page.
    const field = (key: string) =>
      this.db.dialect === 'postgres'
        ? `(e.payload::jsonb->>'${key}')`
        : `json_extract(e.payload, '$.${key}')`;
    const responseId =
      this.db.dialect === 'postgres'
        ? `(e.payload::jsonb #>> '{data,responseId}')`
        : `json_extract(e.payload, '$.data.responseId')`;
    const relevant =
      this.db.dialect === 'postgres'
        ? `(e.payload::jsonb #>> '{data,conversationRelevant}')='true'`
        : `json_extract(e.payload, '$.data.conversationRelevant')=1`;
    if (options.participantId) {
      const speechParticipants = `((${field('actorId')}=? AND ${field('targetId')}=?) OR (${field('actorId')}=? AND (${field('targetId')}=? OR ${field('targetId')} IS NULL)))`;
      if (options.responseActions) {
        filter += ` AND ((${field('type')}='speech' AND ${speechParticipants}) OR ((${responseId} IS NOT NULL OR ${relevant}) AND ${field('actorId')}=?))`;
        args.push(
          actorId,
          options.participantId,
          options.participantId,
          actorId,
          options.participantId,
        );
      } else {
        filter += ` AND ${field('type')}='speech' AND ${speechParticipants}`;
        args.push(actorId, options.participantId, options.participantId, actorId);
      }
    } else if (options.speechOnly) {
      filter += options.responseActions
        ? ` AND (${field('type')}='speech' OR ${responseId} IS NOT NULL OR ${relevant})`
        : ` AND ${field('type')}='speech'`;
    }
    const events = await this.db
      .prepare(
        `SELECT e.position,e.payload,p.payload AS perspective FROM history_events e LEFT JOIN history_perspectives p ON p.world_id=e.world_id AND p.event_id=e.id AND p.actor_id=? JOIN history_audiences a ON a.world_id=e.world_id AND a.event_id=e.id WHERE e.world_id=? AND a.actor_id=? AND e.position<?${filter} AND (?=1 OR NOT EXISTS (SELECT 1 FROM story_event_sources s JOIN story_narrations n ON n.world_id=s.world_id AND n.id=s.narration_id AND n.owner_id=s.owner_id WHERE s.world_id=e.world_id AND s.event_id=e.id AND s.owner_id=?)) ORDER BY e.position DESC,e.id DESC LIMIT ?`,
      )
      .all(
        actorId,
        worldId,
        actorId,
        boundary,
        ...args,
        options.speechOnly || options.participantId ? 1 : 0,
        ownerId,
        limit + 1,
      );
    const stories =
      options.speechOnly || options.participantId
        ? []
        : await this.db
            .prepare(
              `SELECT payload FROM story_narrations WHERE world_id=? AND owner_id=? AND position<?${storyFilter} ORDER BY position DESC,id DESC LIMIT ?`,
            )
            .all(worldId, ownerId, boundary, ...args, limit + 1);
    const items: TranscriptItem[] = events.map((row) => {
      const event = JSON.parse(String(row['payload'])) as WorldEvent;
      return {
        id: event.id,
        kind: event.type === 'speech' ? 'speech' : 'event',
        text:
          (options.speechOnly || options.participantId) && typeof event.data?.['text'] === 'string'
            ? event.data['text']
            : row['perspective']
              ? (JSON.parse(String(row['perspective'])) as StorySource).text
              : event.text,
        time: event.at,
        order: Number(row['position']),
        conversationId: event.conversationId,
        speakerId: event.actorId,
        sourceIds: [event.id],
        impacts: [],
        legacy: !event.conversationId && event.type === 'speech',
      };
    });
    items.push(...stories.map((row) => JSON.parse(String(row['payload'])) as TranscriptItem));
    items.sort((a, b) => b.order - a.order || b.id.localeCompare(a.id));
    const page = items.slice(0, limit);
    return {
      items: page.reverse(),
      watermark,
      ...(items.length > limit ? { before: page[0]!.order } : {}),
    };
  }
}
