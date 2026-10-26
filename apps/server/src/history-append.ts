import { createHash } from 'node:crypto';
import type { Awareness, EventEvidence, WorldEvent } from '@open-legend/domain';
import type { StorySource } from './history.js';
import { HistoryBatch } from './history-batch.js';
import { encodeStoryAccount } from './personal-accounts.js';
import type { SqlDatabase } from './store.js';

export interface AppendHistoryInput {
  event: WorldEvent;
  accounts: [actorId: string, awareness: Awareness][];
}

/** Only observer-permitted identities enter participant indexes. */
export function perspectiveColumns(source: StorySource, actorId: string): unknown[] {
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

/** Shared exact append-row owner. It consumes permitted accounts, never selects a
 * story or reconstructs a world. The ordinary history projector also uses it. */
export class HistoryAppendWriter extends HistoryBatch {
  private accountRevision?: number;
  constructor(
    private readonly database: SqlDatabase,
    private readonly worldId: string,
  ) {
    super(database);
    this.accountRevision = database.projectionRevision;
  }
  event(event: WorldEvent, encoded: string) {
    const position = event.order ?? (Number(event.id.split('-').at(-1)) || event.sequence);
    const pending = this.add('history_events', [
      this.worldId,
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
    return { position, pending };
  }
  perspective(
    event: WorldEvent,
    actorId: string,
    evidence: EventEvidence,
    awareness: Awareness | undefined,
    position: number,
    eventRevision: string,
  ) {
    const source: StorySource = {
      id: event.id,
      text: evidence.text,
      evidence,
      revision: createHash('sha256')
        .update(eventRevision + JSON.stringify(evidence))
        .digest('hex'),
      time: event.at,
      order: position,
      type: evidence.eventType!,
      ...(evidence.content !== undefined ? { content: evidence.content } : {}),
    };
    const account = encodeStoryAccount(source, awareness);
    const append = () =>
      this.add('history_perspectives', [
        this.worldId,
        event.id,
        actorId,
        account.payload,
        ...perspectiveColumns(source, actorId),
        event.data?.['responseId'] != null || event.data?.['conversationRelevant'] === true,
      ]);
    const body=account.body;
    const pending =
      body === undefined
        ? append()
        : (async () => {
            if (this.accountRevision === undefined) {
              const head = await this.database
                .prepare('SELECT revision FROM world_head WHERE world_id=?')
                .get(this.worldId);
              if (!head) throw new Error('Personal account has no durable world owner.');
              this.accountRevision = Number(head['revision']);
            }
            const retained = this.add('mind_source_versions', [
              this.worldId,
              actorId,
              account.account.kind,
              event.id,
              account.account.revision,
              body,
              this.accountRevision,
              'external-story',
              Buffer.byteLength(body),
            ]);
            if (retained) await retained;
            await append();
          })();
    return { source, pending };
  }
}
