import {
  jsonText,
  nativeText,
  projectEventEvidence,
  selectStory,
  type EventEvidence,
  type StorySelection,
  type WorldEvent,
  type WorldState,
} from '@open-legend/domain';
import type { TranscriptItem } from '@open-legend/protocol';
import { createHash } from 'node:crypto';
import { HistoryAppendWriter, perspectiveColumns } from './history-append.js';
import { historyAccountAtCapturedCut, type HistoryProjection } from './history-preparation.js';
import { beginTiming, endTiming } from './performance.js';
import {
  encodeStoryAccount,
  personalEventEvidence as eventEvidence,
  revokeTemporalStoryAccounts,
  storyAccountSql,
  storySourceRow,
  storyTemporalCut,
} from './personal-accounts.js';
import type { ReceivedEventAccount } from './received-event-accounts.js';
import type { SqlDatabase } from './sql-database.js';
import type { SqlWriteBatch } from './sql-rows.js';
import type { RecordChanges } from './world-records.js';

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

/** Project canonical occurrence, perspective and story records inside a caller's
 * transaction. The stopped opening and live writer share these exact effects.
 */
export class HistoryWriter<Database extends SqlDatabase = SqlDatabase> {
  private readonly bindLocalPrincipal: boolean;

  constructor(
    protected readonly db: Database,
    protected principals: ReadonlyArray<{ ownerId: string; actorId: string }> = [],
  ) {
    this.bindLocalPrincipal = principals.length === 0;
  }

  // The stopped producer has no subscribed view or narrator queue.
  protected bannerChanged() {}
  protected storyQueued() {}

  private storySelection(
    subjects: HistoryProjection['subjects'],
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
                source: subjects.get(perceived.actorId ?? ''),
                target: subjects.get(perceived.targetId ?? ''),
              },
              policy,
            ),
    };
  }
  protected async revokeStories(worldId: string, id: string, ownerId?: string) {
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
    inputs: HistoryProjection,
    sharedWrites?: SqlWriteBatch,
    sourceChanges?: RecordChanges,
  ) {
    // A save can replace rows without passing through saveStory/revokeStories.
    if (inputs.initial || inputs.restore) this.bannerChanged();
    // Stored history perspectives follow explicit account attribution. Current access is checked separately at the request boundary.
    if (this.bindLocalPrincipal) {
      this.principals = inputs.principals.map((principal) => ({ ...principal }));
    }
    if (inputs.policyChanged) {
      for (const row of await this.db
        .prepare(
          "SELECT payload FROM story_jobs WHERE world_id=? AND state IN ('queued','running')",
        )
        .all(inputs.worldId)) {
        const job = JSON.parse(String(row['payload'])) as StoryJob;
        job.state = 'cancelled';
        job.reason = 'Story policy changed.';
        await this.saveStory(inputs.worldId, job);
      }
    }
    // The mutation owner captured exact effects against the durable privacy
    // baseline. Re-diffing a resident feed here would turn eviction into deletion.
    const { fastAppend, changed, removed } = inputs;
    const forgotten = (actorId: string) => inputs.forgotten.get(actorId) ?? new Set<string>();
    const perspective = (actorId: string, eventId: string) =>
      inputs.accounts.get(eventId)?.get(actorId);
    let removedEvents = 0;
    for (const id of removed) removedEvents += await this.removeEvent(inputs.worldId, id);
    const candidates: {
      event: WorldEvent;
      position: number;
      principal: { ownerId: string; actorId: string };
      selection: Extract<StorySelection, { kind: 'candidate' }>;
      source: StorySource;
    }[] = [];
    const policy = inputs.policy;
    const batch = new HistoryAppendWriter(this.db, inputs.worldId);
    const rewrittenSources = new Map<string, Map<string, StorySource>>();
    const buildStarted = beginTiming();
    for (const event of changed) {
      const encoded = jsonText(event);
      const eventRevision = revisionOf(encoded);
      const retainedPerspectives = new Map<string, StorySource>();
      const retainedTemporal = new Map<string, NonNullable<ReceivedEventAccount['temporal']>>();
      if (!fastAppend) {
        const retained = await this.db
          .prepare('SELECT payload FROM history_events WHERE world_id=? AND id=?')
          .get(inputs.worldId, event.id);
        if (retained?.['payload'] === encoded) continue;
        if (retained)
          for (const row of await this.db
            .prepare(
              `SELECT p.actor_id,p.payload,${storyAccountSql()} AS account_payload FROM history_perspectives p WHERE p.world_id=? AND p.event_id=?`,
            )
            .all(inputs.worldId, event.id)) {
            const actorId = String(row['actor_id']),
              payload = String(row['payload']);
            retainedPerspectives.set(actorId, storySourceRow(row));
            const temporalCut = storyTemporalCut(payload);
            if (temporalCut) retainedTemporal.set(actorId, temporalCut);
          }
        // A missing canonical predecessor needs no story/perspective cleanup.
        // Resident absence alone is insufficient; this SQL read proved absence.
        if (retained) removedEvents += await this.removeEvent(inputs.worldId, event.id);
      }
      const perspectives = new Map<string, StorySource>();
      const { position, pending: eventFlush } = batch.event(event, encoded);
      if (eventFlush) await eventFlush;
      for (const actorId of new Set(event.audience)) {
        if (forgotten(actorId).has(event.id)) continue;
        const capturedAccount = perspective(actorId, event.id);
        const accountCut = inputs.accountCuts.get(actorId);
        if (!accountCut) throw new Error('Captured history account eligibility is unavailable.');
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
          if (event.type === 'speech' || retained.evidence.eventType === 'activity-observed')
            evidence = retained.evidence;
          else {
            const text = inputs.personalText.get(event.id)?.get(actorId);
            if (text === undefined)
              throw new Error('Captured personal event wording is unavailable.');
            evidence = {
              ...retained.evidence,
              text,
              content: typeof event.data?.['text'] === 'string' ? event.data['text'] : event.text,
            };
          }
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
      if (inputs.newEventIds.has(event.id))
        for (const principal of this.principals) {
          if (forgotten(principal.actorId).has(event.id)) continue;
          const source = perspectives.get(principal.actorId);
          if (!source) continue;
          const { event: perceived, selection } = this.storySelection(
            inputs.subjects,
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
    if (inputs.initial)
      await this.db
        .prepare(
          'INSERT INTO history_totals(world_id,event_count) VALUES (?,0) ON CONFLICT DO NOTHING',
        )
        .run(inputs.worldId);
    await batch.flush({ worldId: inputs.worldId, removedEvents }, sharedWrites);
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
          .get(inputs.worldId, principal.ownerId, selection.milestoneKey))
      )
        continue;
      if (await this.schedule(inputs, event, principal, selection, source)) {
        if (selection.milestoneKey)
          await this.db
            .prepare('INSERT INTO story_milestones VALUES (?,?,?,?) ON CONFLICT DO NOTHING')
            .run(inputs.worldId, principal.ownerId, selection.milestoneKey, event.id);
      }
    }
    for (const [actorId, ids] of inputs.forgottenChanges)
      for (const id of ids) {
        await sharedWrites?.flush();
        await this.db
          .prepare(
            'DELETE FROM history_perspectives WHERE world_id=? AND event_id=? AND actor_id=?',
          )
          .run(inputs.worldId, id, actorId);
        for (const principal of this.principals.filter((p) => p.actorId === actorId))
          await this.revokeStories(inputs.worldId, id, principal.ownerId);
      }
    // Editing awareness changes this actor's source capsule; consolidation alone does not revoke historical access.
    for (const [actorId, entries] of inputs.awarenessChanges)
      for (const entry of entries) {
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
            .get(inputs.worldId, entry.eventId, actorId);
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
          .run(
            account.payload,
            ...perspectiveColumns(source),
            inputs.worldId,
            entry.eventId,
            actorId,
          );
        for (const principal of this.principals.filter((p) => p.actorId === actorId))
          await this.revokeStories(inputs.worldId, entry.eventId, principal.ownerId);
      }
    for (const [actorId, eventIds] of inputs.correctedEvents)
      for (const eventId of eventIds)
        for (const principal of this.principals.filter((p) => p.actorId === actorId)) {
          await sharedWrites?.flush();
          await this.revokeStories(inputs.worldId, eventId, principal.ownerId);
        }
  }
  private async schedule(
    inputs: Pick<HistoryProjection, 'worldId' | 'policy' | 'policyRevision'>,
    event: WorldEvent,
    { ownerId, actorId }: { ownerId: string; actorId: string },
    selection: Extract<StorySelection, { kind: 'candidate' }>,
    source: StorySource,
  ) {
    const policy = inputs.policy;
    // Narration keeps its own principal/source grouping, independent of speaking.
    const base = `story:${ownerId}:${selection.groupKey}`;
    const priorRow = await this.db
      .prepare('SELECT payload FROM story_jobs WHERE world_id=? AND id=? AND owner_id=?')
      .get(inputs.worldId, base, ownerId);
    const prior = priorRow ? (JSON.parse(String(priorRow['payload'])) as StoryJob) : undefined;
    const combine =
      prior?.state === 'queued' &&
      prior.sources.length < policy.delivery.maximumSources &&
      prior.selection?.policyRevision === inputs.policyRevision;
    if (prior && (!combine || prior.sources.some((source) => source.id === event.id))) return false;
    if (!combine) {
      const delivery = await this.db
        .prepare('SELECT game_time FROM story_delivery WHERE world_id=? AND owner_id=?')
        .get(inputs.worldId, ownerId);
      const waiting = await this.db
        .prepare(
          "SELECT id FROM story_jobs WHERE world_id=? AND owner_id=? AND state IN ('queued','running') LIMIT 1",
        )
        .get(inputs.worldId, ownerId);
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
        policyRevision: inputs.policyRevision,
        policyDigest: revisionOf(JSON.stringify(policy)),
      },
    };
    await this.saveStory(inputs.worldId, job);
    if (!combine)
      await this.db
        .prepare(
          'INSERT INTO story_delivery VALUES (?,?,?) ON CONFLICT(world_id,owner_id) DO UPDATE SET game_time=excluded.game_time',
        )
        .run(inputs.worldId, ownerId, event.at);
    for (const source of sources)
      await this.db
        .prepare('INSERT INTO story_event_sources VALUES (?,?,?,?) ON CONFLICT DO NOTHING')
        .run(inputs.worldId, id, ownerId, source.id);
    return true;
  }
  protected async saveStory(worldId: string, job: StoryJob) {
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
    if (job.state === 'queued') this.storyQueued();
    await this.db
      .prepare(
        `INSERT INTO story_jobs (world_id,id,owner_id,state,created_at,payload,actor_id)
        VALUES (?,?,?,?,?,?,?) ON CONFLICT(world_id,id,owner_id)
        DO UPDATE SET state=excluded.state,payload=excluded.payload,actor_id=excluded.actor_id`,
      )
      .run(
        worldId,
        job.id,
        job.ownerId,
        job.state,
        job.createdAt,
        JSON.stringify(job),
        job.actorId,
      );
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
}
