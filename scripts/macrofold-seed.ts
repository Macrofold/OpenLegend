/** Reproducible, idempotent workspace-only provisioning. No model or compute calls.
 * Run: node --env-file=.env --import tsx scripts/macrofold-seed.ts
 * Creates /v1/workspaces once per saved NPC, with no presets or tool permissions.
 * Durable operation IDs/results live beside the world in SQLite; uncertain attempts
 * stop for reconciliation instead of creating duplicates. Never prints credentials.
 */
import { readConfig } from '../apps/server/src/config.js';
import { SqliteStore } from '../apps/server/src/store.js';
import { MacrofoldProvisioner } from '../apps/server/src/macrofold-provisioning.js';
const config = readConfig();
const store = new SqliteStore(config.databasePath);
try {
  const saved = store.load();
  if (!saved) throw new Error('Start Open Legend once to create a local world first.');
  const provisioner = new MacrofoldProvisioner(config, store, saved.state.world.id);
  for (const entity of Object.values(saved.state.world.entities).filter(
    (e) => e.actor?.controller === 'npc',
  )) {
    const result = await provisioner.ensure(entity.id, entity.name);
    console.log(JSON.stringify({ actorId: entity.id, ...result }));
  }
} finally {
  store.close();
}
