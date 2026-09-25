import { DatabaseSync } from 'node:sqlite';
import { parentPort, workerData } from 'node:worker_threads';

if (!parentPort || typeof workerData?.path !== 'string')
  throw Error('SQLite worker requires a database path.');
const db = new DatabaseSync(workerData.path);
const statements = new Map();
const MAX_STATEMENTS = 128;
let lastMemoryReport = 0;

// Bounded exact-SQL cache; parameters are never cached or logged.
function prepare(sql) {
  let statement = statements.get(sql);
  if (statement) statements.delete(sql);
  else statement = db.prepare(sql);
  statements.set(sql, statement);
  if (statements.size > MAX_STATEMENTS) statements.delete(statements.keys().next().value);
  return statement;
}
parentPort.on('message', ({ id, operation, sql, params }) => {
  const started = performance.now();
  let value, error;
  try {
    switch (operation) {
      case 'exec':
        // DDL/PRAGMA can change preparation behavior. Transaction boundaries cannot.
        if (!['BEGIN IMMEDIATE', 'COMMIT', 'ROLLBACK'].includes(sql)) statements.clear();
        db.exec(sql);
        break;
      case 'get':
        value = prepare(sql).get(...params);
        break;
      case 'all':
        value = prepare(sql).all(...params);
        break;
      case 'run':
        value = prepare(sql).run(...params);
        break;
      case 'close':
        statements.clear();
        db.close();
        break;
      default:
        throw Error('Unknown SQLite worker operation.');
    }
  } catch (cause) {
    error = {
      message: cause instanceof Error ? cause.message : String(cause),
      ...(typeof cause?.code === 'string' ? { code: cause.code } : {}),
      ...(typeof cause?.errcode === 'number' ? { errcode: cause.errcode } : {}),
      ...(typeof cause?.errstr === 'string' ? { errstr: cause.errstr } : {}),
    };
  }
  const now = performance.now();
  const memory = now - lastMemoryReport >= 1000;
  if (memory) lastMemoryReport = now;
  parentPort.postMessage({
    kind: 'result',
    id,
    value,
    error,
    elapsedMs: now - started,
    ...(memory ? { heapUsedBytes: process.memoryUsage().heapUsed } : {}),
  });
  if (operation === 'close') parentPort.close();
});
parentPort.postMessage({ kind: 'ready' });
