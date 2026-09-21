import { createHash } from 'node:crypto';
import type { WorldState, WorldEvent, ConversationTransition } from '@open-legend/domain';
import type { TranscriptPage, TranscriptItem } from '@open-legend/protocol';
import type { SqlDatabase } from './store.js';

export const HISTORY_TABLES = [
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
}
const revisionOf = (text: string) => createHash('sha256').update(text).digest('hex');
/** Scoped durable history repository. Only the application binds owner and perspective. */
export class HistoryRepository {
  constructor(
    private db: SqlDatabase,
    private principals: ReadonlyArray<{ ownerId: string; actorId: string }> = [
      { ownerId: 'local-player', actorId: 'player' },
    ],
  ) {}
  async initialize() {
    await this.db.exec(`
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
    let changed: WorldEvent[];
    if (
      previous &&
      appendCount !== undefined &&
      world.events.length === previous.events.length + appendCount
    )
      changed = world.events.slice(previous.events.length);
    else {
      const old = new Map(previous?.events.map((event) => [event.id, event]));
      const current = new Set(world.events.map((event) => event.id));
      for (const id of old.keys()) if (!current.has(id)) await this.removeEvent(world.id, id);
      changed = world.events.filter((event) => old.get(event.id) !== event);
    }
    for (const event of changed) {
      const retained = await this.db
        .prepare('SELECT payload FROM history_events WHERE world_id=? AND id=?')
        .get(world.id, event.id);
      if (retained?.['payload'] === JSON.stringify(event)) continue;
      await this.removeEvent(world.id, event.id);
      const position = event.order ?? (Number(event.id.split('-').at(-1)) || event.sequence);
      await this.db
        .prepare('INSERT INTO history_events VALUES (?,?,?,?,?)')
        .run(world.id, event.id, event.conversationId ?? null, position, JSON.stringify(event));
      for (const actorId of event.audience) {
        if (world.experience?.forgotten[actorId]?.includes(event.id)) continue;
        await this.db
          .prepare('INSERT INTO history_audiences VALUES (?,?,?) ON CONFLICT DO NOTHING')
          .run(world.id, event.id, actorId);
      }
      for (const actorId of event.audience) {
        if (world.experience?.forgotten[actorId]?.includes(event.id)) continue;
        const awareness = world.experience?.awareness[actorId]?.find((a) => a.eventId === event.id);
        const text = awareness?.text ?? event.text;
        const source: StorySource = {
          id: event.id,
          text,
          revision: revisionOf(JSON.stringify(event) + text),
          time: event.at,
          order: position,
          type: event.type,
        };
        await this.db
          .prepare('INSERT INTO history_perspectives VALUES (?,?,?,?)')
          .run(world.id, event.id, actorId, JSON.stringify(source));
      }
      for (const principal of this.principals)
        if (
          event.audience.includes(principal.actorId) &&
          !world.experience?.forgotten[principal.actorId]?.includes(event.id) &&
          event.type !== 'speech' &&
          ([
            'expression',
            'body-effect',
            'death',
            'god-revived',
            'encounter',
            'entered-place',
          ].includes(event.type) ||
            (event.importance ?? 0) >= 6)
        ) {
          const milestone = ['encounter', 'entered-place'].includes(event.type)
            ? `${event.type}:${event.targetId ?? event.data?.['placeId'] ?? event.actorId}`
            : undefined;
          if (milestone) {
            const prior = await this.db
              .prepare(
                'SELECT event_id FROM story_milestones WHERE world_id=? AND owner_id=? AND milestone=?',
              )
              .get(world.id, principal.ownerId, milestone);
            if (prior) continue;
            await this.db
              .prepare('INSERT INTO story_milestones VALUES (?,?,?,?)')
              .run(world.id, principal.ownerId, milestone, event.id);
          }
          await this.schedule(world, event, position, !!previous, principal);
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
    position: number,
    generate: boolean,
    { ownerId, actorId }: { ownerId: string; actorId: string },
  ) {
    // Bind environmental events to the player's group at event time, never at dispatch.
    const conversationId = event.conversationId ?? world.conversations?.active[actorId];
    const cause =
      typeof event.data?.['responseId'] === 'string'
        ? event.data['responseId']
        : String(event.sequence);
    const base = `story:${ownerId}:${conversationId ?? 'world'}:${cause}`;
    const priorRow = await this.db
      .prepare('SELECT payload FROM story_jobs WHERE world_id=? AND id=? AND owner_id=?')
      .get(world.id, base, ownerId);
    const prior = priorRow ? (JSON.parse(String(priorRow['payload'])) as StoryJob) : undefined;
    const combine = prior?.state === 'queued' && prior.sources.length < 16;
    const id = !prior || combine ? base : `${base}:${event.id}`;
    const row = await this.db
      .prepare(
        'SELECT payload FROM history_perspectives WHERE world_id=? AND event_id=? AND actor_id=?',
      )
      .get(world.id, event.id, actorId);
    if (!row) return;
    const source = JSON.parse(String(row['payload'])) as StorySource;
    const sources = combine ? [...prior.sources, source] : [source];
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
            entityName: world.entities[event.targetId ?? event.actorId!]?.name,
            field: field.replace('Delta', ''),
            delta,
            sourceId: event.id,
          });
      }
    const item: TranscriptItem = {
      id,
      kind: 'narration',
      text: sources.map((s) => s.text).join(' '),
      time: event.at,
      order: position,
      conversationId,
      sourceIds: sources.map((s) => s.id),
      impacts,
      status: generate ? 'pending' : 'fallback',
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
      state: generate ? 'queued' : 'fallback',
    };
    await this.saveStory(world.id, job);
    for (const source of sources)
      await this.db
        .prepare('INSERT INTO story_event_sources VALUES (?,?,?,?) ON CONFLICT DO NOTHING')
        .run(world.id, id, ownerId, source.id);
  }
  private async saveStory(worldId: string, job: StoryJob) {
    await this.db
      .prepare(
        'INSERT INTO story_jobs VALUES (?,?,?,?,?,?) ON CONFLICT(world_id,id,owner_id) DO UPDATE SET state=excluded.state,payload=excluded.payload',
      )
      .run(worldId, job.id, job.ownerId, job.state, job.createdAt, JSON.stringify(job));
    await this.db
      .prepare(
        'INSERT INTO story_narrations VALUES (?,?,?,?,?,?,?) ON CONFLICT(world_id,id,owner_id) DO UPDATE SET position=excluded.position,revision=excluded.revision,payload=excluded.payload',
      )
      .run(
        worldId,
        job.id,
        job.ownerId,
        job.item.conversationId ?? null,
        job.item.order,
        job.item.revision ?? 1,
        JSON.stringify(job.item),
      );
  }
  /** Claim is persisted before any paid reservation; restarted claims never redispatch. */
  async claim(worldId: string, before: number): Promise<StoryJob | null> {
    return this.db.transaction(async () => {
      const row = await this.db
        .prepare(
          "SELECT payload FROM story_jobs WHERE world_id=? AND state='queued' AND created_at<=? ORDER BY created_at,id LIMIT 1",
        )
        .get(worldId, before);
      if (!row) return null;
      const job = JSON.parse(String(row['payload'])) as StoryJob;
      job.state = 'running';
      await this.saveStory(worldId, job);
      return job;
    });
  }
  async recover(worldId: string) {
    await this.db.transaction(async () => {
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
      if (row?.['state'] !== 'running') return false;
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
    return this.db.transaction(async () => {
      const key = `story-regeneration:${worldId}:${ownerId}:${requestId}`;
      const prior = await this.db.prepare('SELECT value FROM meta WHERE key=?').get(key);
      if (prior) return prior['value'] === id;
      const row = await this.db
        .prepare('SELECT payload FROM story_jobs WHERE world_id=? AND id=? AND owner_id=?')
        .get(worldId, id, ownerId);
      if (!row) return false;
      const job = JSON.parse(String(row['payload'])) as StoryJob;
      if (
        ['queued', 'running', 'uncertain'].includes(job.state) ||
        !(await this.sourcesCurrent(worldId, job))
      )
        return false;
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
        'SELECT payload FROM story_narrations WHERE world_id=? AND owner_id=? AND conversation_id IS NULL ORDER BY position DESC,id DESC LIMIT 1',
      )
      .get(worldId, ownerId);
    return row ? (JSON.parse(String(row['payload'])) as TranscriptItem) : null;
  }
  async transcript(
    worldId: string,
    ownerId: string,
    actorId: string,
    options: { conversationId?: string; before?: number; watermark?: number; limit?: number } = {},
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
    const filter = options.conversationId ? ' AND e.conversation_id=?' : '';
    const storyFilter = options.conversationId ? ' AND conversation_id=?' : '';
    const args = options.conversationId ? [options.conversationId] : [];
    const events = await this.db
      .prepare(
        `SELECT e.position,e.payload,p.payload AS perspective FROM history_events e LEFT JOIN history_perspectives p ON p.world_id=e.world_id AND p.event_id=e.id AND p.actor_id=? JOIN history_audiences a ON a.world_id=e.world_id AND a.event_id=e.id WHERE e.world_id=? AND a.actor_id=? AND e.position<?${filter} AND NOT EXISTS (SELECT 1 FROM story_event_sources s JOIN story_narrations n ON n.world_id=s.world_id AND n.id=s.narration_id AND n.owner_id=s.owner_id WHERE s.world_id=e.world_id AND s.event_id=e.id AND s.owner_id=?) ORDER BY e.position DESC,e.id DESC LIMIT ?`,
      )
      .all(actorId, worldId, actorId, boundary, ...args, ownerId, limit + 1);
    const stories = await this.db
      .prepare(
        `SELECT payload FROM story_narrations WHERE world_id=? AND owner_id=? AND position<?${storyFilter} ORDER BY position DESC,id DESC LIMIT ?`,
      )
      .all(worldId, ownerId, boundary, ...args, limit + 1);
    const items: TranscriptItem[] = events.map((row) => {
      const event = JSON.parse(String(row['payload'])) as WorldEvent;
      return {
        id: event.id,
        kind: event.type === 'speech' ? 'speech' : 'event',
        text: row['perspective']
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
