import { nativeText, temporalRecentAt, materializeReceivedEntry } from '@open-legend/domain';
import { hasMemory } from '@open-legend/domain';
import { entityGet } from '@open-legend/domain';
import type { NativeWorld, NativeWorldConsumer } from '@open-legend/native-simulation';
import {
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
  defaultStoryPolicy,
  selectStory,
  currentPlaceObservation,
  canAccessContainer,
  itemFor,
} from '@open-legend/domain';
import { createHash } from 'node:crypto';
import type { WorldState, WorldEvent, Awareness, TemporalReceipt } from '@open-legend/domain';
import { beginTiming, endTiming } from './performance.js';
import { temporalHistoryAccountAvailable, type HistoryAccountCut } from './history-preparation.js';
import {
  HistoryWriter,
  type NarratorVoice,
  type StoryJob,
  type StorySource,
} from './history-writer.js';
import type { RecordChanges } from './world-records.js';
import { MemoryPreparationError } from './memory-writer.js';
import {
  personalAccountKey,
  storyAccountAvailableSql,
  narrationSourceUnrevokedSql,
  personalAccountRevision,
  storyAccountSql,
  storySourceRow,
  storedStoryAccount,
  storyTemporalCut,
} from './personal-accounts.js';
import type {
  TranscriptPage,
  TranscriptItem,
  WorldEventSourceReference,
} from '@open-legend/protocol';
import { HISTORY_TABLES } from './history-storage-schema.js';
import type { LiveSqlDatabase } from './live-sql-database.js';
import {
  copyNativeProduct,
  releaseNativeProduct,
  retainNativeSources,
  withoutNativeConsumerScope,
} from './native-consumer.js';
import {
  fundNativeSourceWorkspace,
  parseSourceJson,
  withNativeSqlPreparation,
} from './native-source-preparation.js';

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
          if (entry.kind === 'occurrence') {
            const receipt = materializeReceivedEntry(batch, entry);
            if (receipt) receipts.set(receipt.id, receipt);
          }
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
  addHistoryAccountVersions(world.id, accounts, versions);
  validateHistoryEvidenceRows(history, world.id, (row) =>
    storedStoryAccount(String(row['payload']), world.id, String(row['actor_id']), accounts, {
      receipts,
      sources: world.receivedValues?.sources ?? {},
    }),
  );
}

/** Exact versions are common archive data for both runtime representations. */
export function addHistoryAccountVersions(
  worldId: string,
  accounts: Map<string, string>,
  versions: readonly Record<string, unknown>[],
): void {
  for (const row of versions) {
    const payload = String(row['payload']);
    if (row['world_id'] !== worldId || personalAccountRevision(payload) !== row['revision'])
      throw new Error('Invalid retained personal account version.');
    accounts.set(
      personalAccountKey(
        worldId,
        String(row['actor_id']),
        String(row['source_kind']),
        String(row['source_id']),
        String(row['revision']),
      ),
      payload,
    );
  }
}

/** Source and native archive readers resolve actual personal account bodies
 * through their own storage owner, then share the same scope/evidence checks. */
export function validateHistoryEvidenceRows(
  history: Record<(typeof HISTORY_TABLES)[number], Record<string, unknown>[]>,
  worldId: string,
  resolve: (row: Record<string, unknown>) => StorySource,
  perspectives: Iterable<Record<string, unknown>> = history.history_perspectives,
): void {
  for (const row of history.history_events) {
    const event = JSON.parse(String(row['payload'])) as WorldEvent;
    const utterance =
      typeof event.data?.['utteranceId'] === 'string' ? event.data['utteranceId'] : null;
    if (row['world_id'] !== worldId || row['id'] !== event.id || row['utterance_id'] !== utterance)
      throw new Error('Historical utterance projection disagrees with its original event.');
  }
  for (const row of perspectives) {
    const source = resolve(row);
    if (
      row['world_id'] !== worldId ||
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

type NarrationRead = { status: 'current'; item: TranscriptItem | null } | { status: 'stale' };
type NarrationCapacity = Pick<NativeWorld, 'reserveConsumerBytes' | 'reserveConsumerJson'>;
interface NarrationReadEntry {
  revision: number;
  privacy: unknown;
  eligibility: number | undefined;
  result?: TranscriptItem | null;
  oldestTemporalAt?: number;
  value: Promise<NarrationRead>;
  native?: {
    capacity: NarrationCapacity;
    allocation: NativeWorldConsumer;
    pending: boolean;
    retired: boolean;
    borrowers: number;
    result?: NarrationRead;
  };
}

function fundNativeBanner(item: TranscriptItem, worldId: string, actorId: string): void {
  let workspace = 6 * 256;
  for (const key in item) if (Object.hasOwn(item, key)) workspace += 3 * 64;
  let aliasUnits = 0;
  for (const impact of item.impacts) {
    workspace += 256 + 2 * 64;
    for (const key in impact) if (Object.hasOwn(impact, key)) workspace += 64;
    if (impact.entityId !== actorId) {
      workspace += 2 * 64;
      // The observer tuple is JSON-encoded twice. A lone UTF-16 unit can
      // become a six-character escape on the first pass, then escape its slash.
      aliasUnits = Math.max(
        aliasUnits,
        7 * (worldId.length + actorId.length) +
          6 * (impact.sourceId.length + impact.entityId.length),
      );
    }
  }
  // Impact aliases are generated serially. Retain their final hex separately
  // above, and admit the largest live tuple, HMAC input and temporary digest.
  fundNativeSourceWorkspace(workspace + 8 * (aliasUnits + 64));
}

/** Scoped durable history repository. Only the application binds owner and perspective. */
export class HistoryRepository extends HistoryWriter<LiveSqlDatabase> {
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
  private readonly listeners = new Set<() => void>();
  private queuedRevision = 0;
  private notifiedRevision = 0;
  private narrationRevision = 0;
  private readonly bannerSourceEpochs = new Map<string, number>();
  private readonly narrationReads = new Map<string, NarrationReadEntry>();
  private finishNarrationRead(entry: NarrationReadEntry): void {
    const native = entry.native;
    if (!native || !native.retired || native.pending || native.borrowers) return;
    if (native.result) releaseNativeProduct(native.result);
    native.result = undefined;
    native.allocation.release();
  }
  private removeNarrationRead(key: string): void {
    const entry = this.narrationReads.get(key);
    this.narrationReads.delete(key);
    this.retireNarrationRead(entry);
  }
  private retireNarrationRead(entry: NarrationReadEntry | undefined): void {
    if (entry?.native) {
      entry.native.retired = true;
      this.finishNarrationRead(entry);
    }
  }
  clearNativeNarrationReads(): void {
    for (const [key, entry] of this.narrationReads) if (entry.native) this.removeNarrationRead(key);
  }
  private async borrowNativeNarration(entry: NarrationReadEntry): Promise<NarrationRead> {
    const native = entry.native!;
    native.borrowers++;
    try {
      const value = await entry.value;
      return value.status === 'current' && value.item
        ? retainNativeSources({ ...value }, value)
        : value;
    } finally {
      native.borrowers--;
      this.finishNarrationRead(entry);
    }
  }
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
      this.removeNarrationRead(key);
      this.bannerSourceEpochs.set(actorId, (this.bannerSourceEpochs.get(actorId) ?? 0) + 1);
    }
    return `${this.narrationRevision}:${this.bannerSourceEpochs.get(actorId) ?? 0}`;
  }
  protected override storyQueued() {
    this.queuedRevision++;
  }
  protected override bannerChanged() {
    // One scalar stays bounded across replaced worlds. Only committed banner
    // changes expire views; ordinary movement and unrelated telemetry do not.
    const publish = () => {
      this.narrationRevision++;
      for (const key of this.narrationReads.keys()) this.removeNarrationRead(key);
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
      this.removeNarrationRead(key);
    }
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
  /** Exact operational recovery of an already accepted utterance. The safe ID
   * projection avoids parsing unrelated quoted UTF-16 text inside PostgreSQL. */
  async utteranceEvent(worldId: string, utteranceId: string): Promise<WorldEvent | undefined> {
    const rows = await this.db
      .prepare(
        'SELECT payload FROM history_events WHERE world_id=? AND utterance_id=? ORDER BY position,id LIMIT 2',
      )
      .all(worldId, utteranceId);
    if (rows.length > 1) throw new Error('Utterance identity has more than one original event.');
    if (!rows.length) return;
    const event = JSON.parse(String(rows[0]!['payload'])) as WorldEvent;
    if (event.data?.['utteranceId'] !== utteranceId)
      throw new Error('Utterance projection disagrees with its original event.');
    return event;
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
         AND e.utterance_id=? AND ${storyAccountAvailableSql()} ORDER BY e.position,e.id LIMIT 16`,
        )
        .all(worldId, responseId, actorId, npcId, `${responseId}:${localId}`);
      return rows
        .filter((row) => this.sourceAtCurrentCut(worldId, actorId, String(row['payload'])))
        .map((row) => String(row['id']));
    });
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
    capacity?: NarrationCapacity,
  ): Promise<NarrationRead> {
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
      cached.native?.capacity === capacity &&
      (cached.oldestTemporalAt === undefined || !!timing) &&
      (cached.result === null || (cached.privacy === privacy && cached.eligibility === eligibility))
    )
      return cached.native ? this.borrowNativeNarration(cached) : cached.value;
    let oldestTemporalAt: number | undefined;
    const readValue = async (): Promise<NarrationRead> => {
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
      if (
        !row ||
        row['available'] !== true ||
        (oldestTemporalAt !== undefined &&
          timing &&
          !temporalRecentAt(oldestTemporalAt, timing.at, timing.maxAgeSeconds))
      )
        return { status: 'current', item: null };
      const item = parseSourceJson<TranscriptItem>(String(row['payload']));
      if (capacity) fundNativeBanner(item, worldId, principal.actorId);
      return {
        status: 'current',
        item: publicTranscriptItem(projectNarration(item), worldId, principal.actorId),
      };
    };
    const native: NarrationReadEntry['native'] = capacity && {
      capacity,
      allocation: capacity.reserveConsumerBytes(12 * 256 + 2 * key.length),
      pending: true,
      retired: !cacheable,
      borrowers: 0,
    };
    const value = native
      ? withoutNativeConsumerScope(() =>
          withNativeSqlPreparation(native.capacity, this.db, async () => {
            const selected = await readValue();
            return selected.status === 'current' && selected.item
              ? copyNativeProduct(native.capacity, selected)
              : selected;
          }),
        )
      : readValue();
    if (!cacheable && !native) return value;
    const entry: NarrationReadEntry = { revision, privacy, eligibility, value, native };
    if (cacheable) {
      if (this.narrationReads.size >= 256)
        this.removeNarrationRead(this.narrationReads.keys().next().value!);
      this.retireNarrationRead(this.narrationReads.get(key));
      this.narrationReads.set(key, entry);
    }
    // A transient storage failure must not poison a reusable absent-banner result.
    void value.then(
      (result) => {
        if (result.status === 'current') {
          entry.result = result.item;
          entry.oldestTemporalAt = oldestTemporalAt;
        }
        if (native) {
          native.result = result;
          native.pending = false;
          this.finishNarrationRead(entry);
        }
      },
      () => {
        if (native) native.pending = false;
        if (this.narrationReads.get(key) === entry) this.removeNarrationRead(key);
        else this.finishNarrationRead(entry);
      },
    );
    return native ? this.borrowNativeNarration(entry) : value;
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
