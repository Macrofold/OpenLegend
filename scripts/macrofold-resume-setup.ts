/** Explicit reconciliation of one interrupted sandbox admission, never a model retry.
 * node --env-file=.env --import tsx scripts/macrofold-resume-setup.ts <database> <actor-id>
 * Requires an existing durable reservation and identical request fingerprint. Reuses
 * the original Idempotency-Key; cannot allocate a second sandbox for this operation.
 */
import { MacrofoldTransport } from '@open-legend/ai';
import { readConfig } from '../apps/server/src/config.js';
import { SqliteStore, digest } from '../apps/server/src/store.js';
const database = process.argv[2],
  actorId = process.argv[3];
if (!database || !actorId) throw new Error('Provide the saved database and actor ID.');
const config = readConfig();
if (!config.macrofoldKey || config.budgetUsd <= 0 || config.macrofoldComputeUsd <= 0)
  throw new Error('Configured credentials and nonzero caps required.');
const store = new SqliteStore(database);
try {
  const world = (await store.load())?.state.world;
  if (!world?.entities[actorId]?.actor) throw new Error('No saved actor.');
  const prefix = `macrofold:${digest(config.macrofoldUrl)}:${world.id}:`;
  const lane = (await store.getIntegration(prefix + `lane:${actorId}`)) as
    | { worktree?: string; sandbox?: string }
    | undefined;
  const key = prefix + `operation:sandbox:${actorId}`;
  const previous = (await store.getIntegration(key)) as
    | { fingerprint: string; response?: Record<string, unknown> }
    | undefined;
  if (!previous || !lane?.worktree || !(await store.getIntegration(prefix + `compute:${actorId}`)))
    throw new Error('No reserved interrupted setup to reconcile.');
  if (previous.response || lane.sandbox)
    throw new Error('Setup already has a result; inspect its sandbox instead.');
  const path = '/v1/sandboxes';
  const body = {
    worktree_id: lane.worktree,
    long_running: true,
    max_cost_micro_usd: String(Math.ceil(config.macrofoldComputeUsd * 1e6)),
  };
  if (previous.fingerprint !== digest({ path, body }))
    throw new Error(
      'Configuration differs from the original operation. Restore its original cap first.',
    );
  const api = new MacrofoldTransport(config.macrofoldUrl, config.macrofoldKey);
  const response = (await api.request(path, body, digest(prefix + `sandbox:${actorId}`))) as Record<
    string,
    unknown
  >;
  if (typeof response.id !== 'string')
    throw new Error('Missing sandbox identity; admission remains uncertain.');
  await store.putIntegration(key, { ...previous, response });
  await store.putIntegration(prefix + `lane:${actorId}`, { ...lane, sandbox: response.id });
  console.log(JSON.stringify({ actorId, sandboxId: response.id, status: response.status }));
} finally {
  await store.close();
}
