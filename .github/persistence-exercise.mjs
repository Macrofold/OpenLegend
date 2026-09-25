import { createHash } from 'node:crypto';
import { cpus } from 'node:os';
import { writeFile } from 'node:fs/promises';
import { createWorld, advanceWorld, freezeWorld, appendedEventCount } from '../packages/domain/src/index.ts';
import { updateWorld } from '../packages/domain/src/draft.ts';
import { HistoryRepository } from '../apps/server/src/history.ts';
import { SqliteDatabase } from '../apps/server/src/sqlite-database.ts';
import { performanceSnapshot } from '../apps/server/src/performance.ts';
import { parseScenario, populateScenario } from '../scripts/performance/scenario.ts';

const output = process.argv[2];
if (!output) throw Error('Supply a new profiling output path');
const report = { scope: 'Ad hoc native execution and real SQLite transaction/history exercise; no unit/browser suites or paid providers.', node: process.version, cpu: cpus()[0]?.model, run: process.env.GITHUB_RUN_ID, paidModelCalls: 0, cases: [] };
const snapshotDigest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function historyDigest(db, worldId) {
  const result = {};
  for (const [table, order] of [['history_events', 'id'], ['history_audiences', 'event_id,actor_id'], ['history_perspectives', 'event_id,actor_id']]) {
    const rows = await db.prepare(`SELECT * FROM ${table} WHERE world_id=? ORDER BY ${order}`).all(worldId);
    result[table] = { rows: rows.length, digest: snapshotDigest(rows) };
  }
  return result;
}
for (const [name, people, objects] of [['small', 0, 0], ['dense', 100, 500]]) {
  console.error('persistence exercise:', name);
  const scenario = parseScenario({ seed: 73, people, animals: 0, layout: 'crowded', warmup: 0, objects: objects ? [{ count: objects, name: 'Profiling gem', properties: ['rigid'] }] : [] });
  const before = freezeWorld(populateScenario(undefined, scenario));
  const start = performance.now();
  const advanced = advanceWorld(before, 1);
  const after = freezeWorld(advanced.world);
  const nativeMs = performance.now() - start;
  const row = { name, nativeMs, worldDigest: snapshotDigest(after), entities: Object.keys(after.entities).length, events: after.events.length, awareness: Object.values(after.experience?.awareness ?? {}).reduce((n, rows) => n + rows.length, 0), commits: [] };
  for (let iteration = 0; iteration < 2; iteration++) {
    const db = new SqliteDatabase(':memory:');
    const history = new HistoryRepository(db);
    try {
      await history.initialize();
      await db.transaction(() => history.project(undefined, before));
      const at = performance.now();
      await db.transaction(() => history.project(before, after, appendedEventCount(before.events, after.events)));
      row.commits.push(performance.now() - at);
      if (iteration === 0) row.history = await historyDigest(db, after.id);
      if (name === 'small' && iteration === 0) {
        const actorId = Object.keys(after.experience.awareness).find(id => after.experience.awareness[id]?.length);
        const eventId = after.experience.awareness[actorId][0].eventId;
        const changed = freezeWorld(updateWorld(after, world => {
          const entry = world.experience.awareness[actorId].find(a => a.eventId === eventId);
          entry.text = 'A corrected observer-private description.';
          entry.content = entry.text;
        }));
        const originalRows = await historyDigest(db, after.id);
        try {
          await db.transaction(async () => { await history.project(after, changed, 0); throw Error('deliberate-rollback'); });
        } catch (error) { if (error.message !== 'deliberate-rollback') throw error; }
        row.rollbackPreserved = snapshotDigest(await historyDigest(db, after.id)) === snapshotDigest(originalRows);
        await db.transaction(() => history.project(after, changed, 0));
        const perspective = await db.prepare('SELECT payload FROM history_perspectives WHERE world_id=? AND event_id=? AND actor_id=?').get(after.id, eventId, actorId);
        row.editApplied = JSON.parse(perspective.payload).text === 'A corrected observer-private description.';
        const forgotten = freezeWorld(updateWorld(changed, world => { (world.experience.forgotten[actorId] ??= []).push(eventId); }));
        await db.transaction(() => history.project(changed, forgotten, 0));
        row.forgottenAudienceRemoved = !(await db.prepare('SELECT actor_id FROM history_audiences WHERE world_id=? AND event_id=? AND actor_id=?').get(after.id, eventId, actorId));
        row.forgottenPerspectiveRemoved = !(await db.prepare('SELECT actor_id FROM history_perspectives WHERE world_id=? AND event_id=? AND actor_id=?').get(after.id, eventId, actorId));
        row.sourceRetained = !!(await db.prepare('SELECT id FROM history_events WHERE world_id=? AND id=?').get(after.id, eventId));
        if (![row.rollbackPreserved, row.editApplied, row.forgottenAudienceRemoved, row.forgottenPerspectiveRemoved, row.sourceRetained].every(Boolean)) throw Error('Transactional history invariant failed');
      }
    } finally { await db.close(); }
  }
  report.cases.push(row);
}
report.metrics = performanceSnapshot();
report.heapUsedBytes = process.memoryUsage().heapUsed;
await writeFile(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify(report));
