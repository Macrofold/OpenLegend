import { SqliteDatabase } from '../apps/server/src/sqlite-database.ts';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const output = process.argv[2];
if (!output) throw Error('Supply a new report path');
const report = { scope: 'Actual disposable SQLite execution, transaction isolation, worker interruption and reopen; ad hoc runtime exercise, not an automated suite.', paidModelCalls: 0, checks: [] };
const dir = await mkdtemp(join(tmpdir(), 'ol-sqlite-worker-'));
let db = new SqliteDatabase(join(dir, 'world.sqlite'));
const check = (name, passed, details = {}) => { report.checks.push({ name, passed, ...details }); if (!passed) throw Error(name); };
try {
  await db.exec('CREATE TABLE records(id INTEGER PRIMARY KEY, value TEXT)');
  let entered, release;
  const reached = new Promise(resolve => { entered = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  const writer = db.transaction(async () => {
    await db.prepare('INSERT INTO records VALUES (?,?)').run(1, 'committed');
    await db.transaction(async () => { const own = await db.prepare('SELECT value FROM records WHERE id=1').get(); if (own.value !== 'committed') throw Error('Nested transaction lost ownership'); });
    entered(); await gate;
  });
  await reached;
  let sawResult = false;
  const outsider = db.prepare('SELECT value FROM records WHERE id=1').get().then(row => { sawResult = true; return row; });
  await delay(20);
  check('unrelated-reader-waits-for-commit', !sawResult);
  release(); await writer;
  check('reader-observes-complete-commit', (await outsider).value === 'committed');
  try {
    await db.transaction(async () => { await db.prepare('INSERT INTO records VALUES (?,?)').run(2, 'rolled back'); throw Error('deliberate'); });
  } catch (error) { if (error.message !== 'deliberate') throw error; }
  check('rollback-removes-partial-writes', !(await db.prepare('SELECT value FROM records WHERE id=2').get()));
  await db.prepare('SELECT * FROM records').all();
  await db.exec('ALTER TABLE records ADD COLUMN version INTEGER DEFAULT 7');
  check('cached-statement-schema-invalidation', (await db.prepare('SELECT * FROM records').get()).version === 7);
  let beats = 0;
  const pulse = setInterval(() => { beats++; }, 1);
  const at = performance.now();
  const sum = await db.prepare('WITH RECURSIVE counter(n) AS (VALUES(1) UNION ALL SELECT n+1 FROM counter WHERE n<1000000) SELECT sum(n) AS value FROM counter').get();
  const elapsedMs = performance.now() - at;
  clearInterval(pulse);
  check('main-loop-runs-during-sql', sum.value === 500000500000 && beats > 0, { beats, elapsedMs });
  let interrupted = false;
  try {
    await db.transaction(async () => {
      await db.prepare('INSERT INTO records(id,value) VALUES (?,?)').run(3, 'uncommitted');
      await db.worker.terminate(); // Exercise an actual thread failure, not a production test hook.
    });
  } catch { interrupted = true; }
  check('worker-exit-rejects-inflight-transaction', interrupted);
  await db.close().catch(() => undefined);
  db = new SqliteDatabase(join(dir, 'world.sqlite'));
  const rows = await db.prepare('SELECT id,value FROM records ORDER BY id').all();
  check('reopen-retains-only-committed-data', rows.length === 1 && rows[0].id === 1 && rows[0].value === 'committed');
  await db.close();
  await db.close();
  let closedRejected = false;
  try { await db.prepare('SELECT 1').get(); } catch { closedRejected = true; }
  check('closed-connection-rejects-new-work', closedRejected);
  const bad = new SqliteDatabase(join(dir, 'missing', 'world.sqlite'));
  let startupRejected = false;
  try { await bad.exec('SELECT 1'); } catch { startupRejected = true; }
  await bad.close().catch(() => undefined);
  check('startup-error-is-reported', startupRejected);
} finally {
  await db.close().catch(() => undefined);
  await rm(dir, { recursive: true, force: true });
  await writeFile(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
}
console.log(JSON.stringify(report));
