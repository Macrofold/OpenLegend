import { parentPort, workerData } from 'node:worker_threads';
import { SqliteDatabase } from './sqlite-database.js';
import { PostgresDatabase } from './postgres.js';
import { writeCheckpoint } from './checkpoint.js';
import { SaveFiles } from './save-files.js';
import type { CheckpointSource, CheckpointRequest } from './checkpoint-worker-client.js';

const source = workerData as CheckpointSource;
const db =
  source.kind === 'sqlite'
    ? new SqliteDatabase(source.path, true)
    : new PostgresDatabase(source.url, true);
const port = parentPort;
if (!port) throw new Error('Checkpoint worker requires an owner.');
let busy = false;
port.on('message', async (request: CheckpointRequest) => {
  if (busy) {
    port.postMessage({ type: 'failed', error: 'Checkpoint worker is already occupied.' });
    return;
  }
  busy = true;
  try {
    await writeCheckpoint(
      db,
      new SaveFiles(request.directory),
      {
        id: request.id,
        worldId: request.worldId,
        label: request.label,
        format: request.format,
        kind: request.kind,
      },
      {
        expectedRevision: request.expectedRevision,
        captured: () => port.postMessage({ type: 'captured' }),
      },
    );
    port.postMessage({ type: 'complete' });
  } catch (error) {
    port.postMessage({
      type: 'failed',
      error: error instanceof Error ? error.message : 'Checkpoint worker failed.',
    });
  } finally {
    busy = false;
  }
});
// Establish the independent reader during startup, before a gameplay capture
// waits on it. Lazy PostgreSQL connection setup otherwise extends the first barrier.
await db.readTransaction(() => db.prepare('SELECT 1').get());
port.postMessage({ type: 'ready' });
