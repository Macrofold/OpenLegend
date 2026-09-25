from pathlib import Path

def replace(path, old, new):
    p=Path(path);s=p.read_text()
    if s.count(old)!=1: raise RuntimeError(f'{path}: expected one match for {old[:100]!r}, found {s.count(old)}')
    p.write_text(s.replace(old,new))

Path('apps/server/src/history-preparation.ts').write_text('''import { appendedEventCount, type WorldState, type WorldEvent } from '@open-legend/domain';
import { timedSync } from './performance.js';

/** Derived indexes for one exact immutable candidate, not another history store.
 * Prepare before acquiring the database when readiness is already committed.
 * docs/performance.md#compact-transactional-persistence
 */
export function prepareHistory(previous: WorldState | undefined, world: WorldState, appendCount?: number) {
  return timedSync('history.prepare', () => {
    // Only the domain proof authorizes appending; an application hint is insufficient.
    const fastAppend = !!previous && appendCount !== undefined &&
      appendedEventCount(previous.events, world.events) === appendCount;
    const old = fastAppend ? undefined : new Map(previous?.events.map(event => [event.id, event]));
    const current = fastAppend ? undefined : new Set(world.events.map(event => event.id));
    const removed = old ? [...old.keys()].filter(id => !current!.has(id)) : [];
    const changed = fastAppend ? world.events.slice(previous!.events.length) :
      world.events.filter(event => old!.get(event.id) !== event);
    const previousIds = old ? new Set(old.keys()) : undefined;
    const audience = new Set<string>();
    for (const event of changed) for (const actorId of event.audience) audience.add(actorId);
    const awarenessIndexes = new Map<string, Map<string, string>>();
    const forgottenIndexes = new Map<string, Set<string>>();
    for (const actorId of audience) {
      const values = new Map<string, string>();
      for (const entry of world.experience?.awareness[actorId] ?? [])
        if (!values.has(entry.eventId)) values.set(entry.eventId, entry.text);
      awarenessIndexes.set(actorId, values);
      forgottenIndexes.set(actorId, new Set(world.experience?.forgotten[actorId] ?? []));
    }
    return {
      previous, world, fastAppend, changed, removed, previousIds,
      forgotten(actorId: string) {
        let ids = forgottenIndexes.get(actorId);
        if (!ids) {
          ids = new Set(world.experience?.forgotten[actorId] ?? []);
          forgottenIndexes.set(actorId, ids);
        }
        return ids;
      },
      perspectiveText(actorId: string, event: WorldEvent) {
        return awarenessIndexes.get(actorId)?.get(event.id) ?? event.text;
      },
    };
  });
}
''')

Path('apps/server/src/history-batch.ts').write_text('''import type { SqlDatabase } from './store.js';
import { gaugeMetric, timed } from './performance.js';

type Table = 'history_events' | 'history_audiences' | 'history_perspectives';
const TABLES: readonly Table[] = ['history_events', 'history_audiences', 'history_perspectives'];
const MAX_PARAMETER_BYTES = 262144;
const MAX_PARAMETERS = 900;

/** Bound construction, not just the eventual SQL. Flush source rows before their dependent
 * rows, inside the caller's existing transaction. An oversize singleton retains prior behavior.
 * docs/performance.md#compact-transactional-persistence
 */
export class HistoryBatch {
  private rows: Record<Table, unknown[][]> = { history_events: [], history_audiences: [], history_perspectives: [] };
  private parameters: Record<Table, number> = { history_events: 0, history_audiences: 0, history_perspectives: 0 };
  private bytes = 0;
  private peakBytes = 0;
  writeMilliseconds = 0;
  constructor(private readonly db: SqlDatabase) {}

  add(table: Table, row: unknown[]): Promise<void> | undefined {
    // Count encoded parameter bytes once; do not JSON-encode already encoded JSON again.
    const size = row.reduce<number>((n, value) => n +
      (typeof value === 'string' ? Buffer.byteLength(value) : 16), 0);
    const append = () => {
      this.rows[table].push(row);
      this.parameters[table] += row.length;
      this.bytes += size;
      this.peakBytes = Math.max(this.peakBytes, this.bytes);
    };
    if (this.bytes && (this.bytes + size > MAX_PARAMETER_BYTES ||
      this.parameters[table] + row.length > MAX_PARAMETERS))
      return this.flush().then(append);
    append();
  }

  async flush(): Promise<void> {
    if (!this.bytes) return;
    const started = performance.now();
    try {
      for (const table of TABLES) {
        const rows = this.rows[table];
        if (!rows.length) continue;
        await timed('history.write', () => this.db.prepare(
          `INSERT INTO ${table} VALUES ${rows.map(row => `(${row.map(() => '?').join(',')})`).join(',')}`,
        ).run(...rows.flat()));
        this.rows[table] = [];
        this.parameters[table] = 0;
      }
      this.bytes = 0;
      gaugeMetric('history.peakParameterBytes', this.peakBytes);
    } finally {
      this.writeMilliseconds += performance.now() - started;
    }
  }
}
''')
path='apps/server/src/history.ts';p=Path(path);s=p.read_text()
s=s.replace('  appendedEventCount,\n','')
s=s.replace("import { timed, timedSync } from './performance.js';", "import { recordDuration } from './performance.js';\nimport { prepareHistory } from './history-preparation.js';\nimport { HistoryBatch } from './history-batch.js';")
a=s.index('  private async insertRows(');b=s.index('  async initialize()',a);s=s[:a]+s[b:]
s=s.replace('  async project(previous: WorldState | undefined, world: WorldState, appendCount?: number) {', '''  async project(previous: WorldState | undefined, world: WorldState, appendCount?: number,
    prepared?: ReturnType<typeof prepareHistory>) {''')
a=s.index('    // Re-prove the prefix here:');b=s.index('    for (const event of changed)',a)
s=s[:a]+'''    // Prepared data is reusable only for its exact frozen snapshots; mutable callers use live preparation.
    const inputs = prepared?.world === world && prepared.previous === previous &&
      Object.isFrozen(world) && (!previous || Object.isFrozen(previous)) ? prepared :
      prepareHistory(previous, world, appendCount);
    const { fastAppend, changed, removed, previousIds, forgotten, perspectiveText } = inputs;
    for (const id of removed) await this.removeEvent(world.id, id);
    const candidates: {
      event: WorldEvent;
      position: number;
      principal: { ownerId: string; actorId: string };
      selection: Extract<StorySelection, { kind: 'candidate' }>;
    }[] = [];
    const policy = world.storyPolicy ?? defaultStoryPolicy();
    const batch = new HistoryBatch(this.db);
    const buildStarted = performance.now();
'''+s[b:]
s=s.replace('      eventRows.push([world.id, event.id, event.conversationId ?? null, position, encoded]);', '''      const eventFlush = batch.add('history_events', [world.id, event.id, event.conversationId ?? null, position, encoded]);
      if (eventFlush) await eventFlush;''')
s=s.replace('        audienceRows.push([world.id, event.id, actorId]);', '''        const audienceFlush = batch.add('history_audiences', [world.id, event.id, actorId]);
        if (audienceFlush) await audienceFlush;''')
s=s.replace('        perspectiveRows.push([world.id, event.id, actorId, JSON.stringify(source)]);', '''        const perspectiveFlush = batch.add('history_perspectives', [world.id, event.id, actorId, JSON.stringify(source)]);
        if (perspectiveFlush) await perspectiveFlush;''')
s=s.replace("    await this.insertRows('history_events', eventRows);\n    await this.insertRows('history_audiences', audienceRows);\n    await this.insertRows('history_perspectives', perspectiveRows);", "    await batch.flush();\n    recordDuration('history.sourceBuild', Math.max(0, performance.now() - buildStarted - batch.writeMilliseconds));")
p.write_text(s)

path='apps/server/src/store.ts'
replace(path,"import { HistoryRepository } from './history.js';", "import { HistoryRepository } from './history.js';\nimport { prepareHistory } from './history-preparation.js';")
replace(path,"    const revision = await timed('persistence.transaction', () =>", """    const historyBefore = historyProjection?.before ?? this.acceptedState?.world;
    const historyAfter = historyProjection?.after ?? state.world;
    // The world writer owns this immutable candidate. Do not eagerly encode a second full burst;
    // prepare lookup inputs here, then stream bounded rows within the atomic transaction.
    const preparedHistory = this.readyHistoryWorlds.has(state.world.id) &&
      !historyProjection?.restore && Object.isFrozen(historyAfter) &&
      (!historyBefore || Object.isFrozen(historyBefore))
      ? prepareHistory(historyBefore, historyAfter, historyBefore
          ? provenAppendCount(historyBefore.events, historyAfter.events) : undefined)
      : undefined;
    const revision = await timed('persistence.transaction', () =>""")
p=Path(path);s=p.read_text();a=s.index("        await timed('history.project',");b=s.index('        if (!historyReady)',a)
section=s[a:b]
needle='            : undefined,\n'
if section.count(needle)!=1: raise RuntimeError('History projection parameter anchor changed: '+section)
section=section.replace(needle,needle+'          preparedHistory,\n')
p.write_text(s[:a]+section+s[b:])

path='packages/domain/src/events.ts'
replace(path,"    const event = recordEvent(\n      world,\n      events,\n      'encounter',\n      detail\n        ? `${source.name} noticed ${observerDescription(world, source.id, targetId)}: ${detail}.`\n        : `${source.name} saw ${observerDescription(world, source.id, targetId)}.`,", """    const subject = observerDescription(world, source.id, targetId);
    const observed = detail ? `noticed ${subject}: ${detail}.` : `saw ${subject}.`;
    const event = recordEvent(
      world,
      events,
      'encounter',
      `${source.name} ${observed}`,""")
replace(path,"      'private',\n      pending,\n    );", "      'private',\n      pending,\n      `I ${observed}`,\n    );")
replace(path,'  awarenessBatch?: ExperienceMutation[],\n): WorldEvent {','  awarenessBatch?: ExperienceMutation[],\n  privatePerspective?: string,\n): WorldEvent {')
replace(path,"      const perspective = memoryPerspective(world, actorId, text, type === 'speech', source?.id);", """      // Native private acquisition already has an exact first-person template. Avoid parsing
      // its freshly constructed third-person sentence again; all semantic hooks remain shared.
      // docs/architecture.md#private-perception-and-evidence-batches
      const perspective = privatePerspective !== undefined && scope === 'private' && actorId === source?.id
        ? privatePerspective : memoryPerspective(world, actorId, text, type === 'speech', source?.id);""")

p=Path('docs/performance.md');s=p.read_text();needle='Prepare payloads before opening the transaction.'
s=s.replace(needle, '''Prepare immutable lookup/delta inputs before opening the transaction when committed readiness is known. For dense history bursts, do not retain a second full set of prepared payloads: encode each source once into a bounded row buffer, flushing sources before their dependent rows within the same transaction. This deliberately keeps bounded encoding in the transaction rather than trading shorter lock time for unbounded temporary memory. Buffer limits count UTF-8 SQL parameter bytes and portable parameter counts; a single oversized record retains the existing one-record behavior. Preparation never authorizes a different or mutable snapshot. Prepare other bounded payloads before opening the transaction.''')
p.write_text(s)
p=Path('docs/architecture.md');p.write_text(p.read_text().rstrip()+'''\n\n## Bounded history preparation\n\n`prepareHistory` derives affected event identities, actor-scoped awareness indexes and forgetting sets from one exact candidate. The store prepares these inputs before the transaction when history readiness is already committed; initial/backfill/restore paths prepare at their existing validated boundary. Changed source edits, correction and revocation remain inside the same repository and transaction. `HistoryBatch` encodes each event once and bounds temporary row construction by 262,144 UTF-8 parameter bytes and 900 parameters per table, with the existing oversized-singleton exception. Event rows flush before audience/perspective rows; story selection waits until all required sources are stored. There is no second evidence store, deferred authoritative projection, or early command acknowledgement. Native acquisition supplies its exact private first-person template to the shared event owner rather than reparsing a freshly generated sentence.\n''')
p=Path('docs/maintainers/performance.md');s=p.read_text().replace('- [ ] DP02 —','- [x] DP02 —').replace('- [ ] DP03 — Measure and remove remaining redundant native acquisition construction, retaining every required identity, observation, ordering and independent mutable-return boundary.', '- [x] DP03 — Remove redundant parsing of the native private acquisition template through the shared event owner. Retain independent transition-return copies; further allocation/state representation changes remain measured PF03/PF08 work.');p.write_text(s)
p=Path('docs/maintainers/TODO.md');p.write_text(p.read_text().rstrip()+'''\n- [ ] DP-R04 — Cover candidate preparation reuse versus different/mutable snapshots, initial history/backfill, restore, interleaved source edits, exact audience/recognition text and strict duplicate IDs. Verify no prepared state survives as authority after failed CAS/COMMIT.\n- [ ] DP-R05 — Compare native acquisition perspective for quoted/punctuation/duplicate actor names, native object descriptions and outward feature changes; preserve event ordering and private recipients. Direct native templates must not become a generic user-supplied narration/effect shortcut.\n''')
