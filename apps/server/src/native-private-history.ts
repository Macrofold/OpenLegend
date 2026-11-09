import type { Awareness, ExperiencePrivacy } from '@open-legend/domain';
import type { HistoryProjection } from './history-preparation.js';
import { replacedHistoryAwareness } from './history-preparation.js';
import { nativeAppendHistoryProjection } from './native-history.js';
import type { NativePublication } from './native-operation.js';
import type { LiveReadCuts } from './live-read-overlay.js';
import type { SqlDatabase } from './store.js';
import { nativeRecordChanges } from './native-records.js';
import { RECORD_NODES } from './world-record-schema.js';
import { retainNativeSources } from './native-consumer.js';

/** Private edits supply actual before-records and complete actor privacy facts.
 * Only the history writer's finite replacement delta is assembled here; this
 * never reconstructs personal collections or reads unrelated memory prose. */
export async function nativePrivateHistory(
  publication: NativePublication,
  beforePrivacy: ExperiencePrivacy,
  privacy: ExperiencePrivacy,
  db: SqlDatabase,
  beforeCut: LiveReadCuts,
): Promise<HistoryProjection> {
  const projection = nativeAppendHistoryProjection(publication.history);
  const change = publication.privacyChange;
  if (!change) return retainNativeSources(projection, publication);
  const actor = change.actorId;
  const forgottenBefore = new Set(beforePrivacy.forgotten[actor] ?? []);
  const forgottenChanges = new Map([
    [actor, change.forgotten.filter((id) => !forgottenBefore.has(id))],
  ]);
  const previous = new Map<string, Awareness>();
  for (const row of publication.personalPredecessors)
    if (row.table === 'mind_awareness' && row.actorId === actor) {
      const account = JSON.parse(row.payload) as Awareness;
      previous.set(account.eventId, account);
    }
  const changes = nativeRecordChanges(publication.records);
  const after = (changes.writes.get('mind_awareness') ?? []).flatMap((row) => {
    const account = JSON.parse(row.payload) as Awareness;
    return account.actorId === actor ? [account] : [];
  });
  const awarenessChanges = new Map([[actor, replacedHistoryAwareness(previous, after)]]);
  const oldCorrections = beforePrivacy.corrections[actor] ?? {};
  const changed = Object.entries(privacy.corrections[actor] ?? {}).flatMap(([id, evidence]) =>
    oldCorrections[id] === evidence ? [] : [id],
  );
  const eventIds = new Map<string, string>();
  if (changed.length) {
    if (!db.readAtCut || !db.readTransaction)
      throw new Error('Native correction history requires the exact preceding SQL cut.');
    const rows = await db.readAtCut(beforeCut, () =>
      db.readTransaction!(() =>
        db
          .prepare(
            'SELECT id,source_id,event_id FROM mind_memories WHERE world_id=? AND actor_id=? AND source_id=ANY(?::text[])',
          )
          .all(publication.progress.worldId, actor, changed),
      ),
    );
    const removed = new Set(changes.deletes.get('mind_memories'));
    for (const row of rows)
      if (!removed.has(String(row['id'])))
        eventIds.set(String(row['source_id']), String(row['event_id'] ?? row['source_id']));
    const columns = Object.keys(RECORD_NODES.get('mind_memories')!.columns!);
    for (const row of changes.writes.get('mind_memories') ?? []) {
      if (row.extra[columns.indexOf('actor_id')] !== actor) continue;
      const id = String(row.extra[columns.indexOf('source_id')]);
      const event = row.extra[columns.indexOf('event_id')];
      eventIds.set(id, event === null ? id : String(event));
    }
  }
  return retainNativeSources(
    {
      ...projection,
      fastAppend: false,
      forgottenChanges,
      awarenessChanges,
      correctedEvents: new Map([[actor, changed.map((id) => eventIds.get(id) ?? id)]]),
    },
    publication,
  );
}
