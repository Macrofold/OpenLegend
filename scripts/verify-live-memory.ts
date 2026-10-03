import { writeOperationalBackup } from '../apps/server/src/operational-backup.js';
import { createDisposableDatabase } from './disposable-postgres.mjs';
import { PostgresDatabase } from '../apps/server/src/postgres.js';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dreamPolicy } from '../packages/domain/src/index.js';
/** Explicit paid acceptance, never run by test/check or on startup.
 * node --env-file=.env --import tsx scripts/verify-live-memory.ts
 * Uses an isolated real simulation and separate saved database. Four mini-model
 * harness jobs on an explicitly selected Worker; all requests have durable IDs/caps.
 * Worker compute is separately funded/limited by its owner and is never destroyed here.
 */
import { randomUUID } from 'node:crypto';
import { readConfig } from '../apps/server/src/config.js';
import { SqlGameRepository, digest } from '../apps/server/src/store.js';
import { WorldService } from '../apps/server/src/world-service.js';
import { MacrofoldBackend } from '../apps/server/src/macrofold.js';
import {
  cognitionContext,
  COGNITION_INSTRUCTIONS,
  proposalSchema,
  fullCognitionJsonSchema,
} from '../apps/server/src/cognition.js';
import { commitCognition, mindFor } from '@open-legend/domain';
const config = readConfig({
  ...process.env,
  OPEN_LEGEND_DATABASE_URL: process.env['OPENLEGEND_TEST_DATABASE_URL'],
  // The disposable scenario acquires local control; browser Auth0 is verified separately.
  OPEN_LEGEND_AUTH_MODE: 'local',
});
if (!config.macrofoldKey || config.budgetUsd <= 0 || !config.macrofoldWorkerId)
  throw new Error('Explicit backend credentials, Run caps and MACROFOLD_WORKER_ID required.');
const disposable = await createDisposableDatabase(config.databaseUrl);
config.databaseUrl = disposable.url;
let store: SqlGameRepository | undefined;
try {
  config.dataDirectory = await mkdtemp(join(tmpdir(), 'openlegend-memory-'));
  store = new SqlGameRepository(config.dataDirectory, new PostgresDatabase(config.databaseUrl));
  let service = new WorldService(store, config);
  await service.ready;
  async function enter(service: WorldService) {
    const scope = service.localScope;
    const control = await service.changeEmbodiment(scope, {
      id: randomUUID(),
      expectedGeneration: scope.controlGeneration,
      operation: 'replace',
    });
    if (!control.ok) throw new Error(control.message);
    // Native harness waits can exceed heartbeat expiry. An open background connection
    // keeps this bounded scenario present without a timer racing database teardown.
    await service.setPreferences({ pauseWhenHidden: false });
    await service.setConnection('live-acceptance', true);
    const resumed = await service.control({ paused: false });
    if (!resumed.ok) throw new Error(resumed.message);
  }
  // The disposable database and fresh timeline isolate provider context; changing
  // the world's ID here would invalidate its already-provisioned authority grants.
  await enter(service);
  const backend = new MacrofoldBackend(service);
  const id = randomUUID();
  const speech = await service.say(
    `encounter-${id}`,
    service.controlledEntityId,
    'I would like us to help each other survive. I have noticed you working here. What do you make of me?',
    service.defaultResidentEntityId,
  );
  if (!speech.ok) throw new Error(speech.message);
  const sessions: string[] = [];
  const worktrees: string[] = [];
  async function deliberate(
    backend: MacrofoldBackend,
    service: WorldService,
    instructions: string,
    purpose: 'thought' | 'reflection' | 'dream' = 'thought',
  ) {
    const id = randomUUID();
    const prepared = cognitionContext(
      service,
      service.defaultResidentEntityId,
      id,
      purpose,
      'full',
    );
    if (!(await service.store.reserve(id, 'openai', config.macrofoldRunUsd, config.budgetUsd)))
      throw new Error('Acceptance run budget exhausted.');
    const result = await backend.generate<unknown>({
      requestId: id,
      actorScope: service.defaultResidentEntityId,
      execution: 'full',
      task: 'npc_cognition',
      instructions: COGNITION_INSTRUCTIONS + ' ' + instructions,
      context: prepared.context,
      schema: fullCognitionJsonSchema,
    });
    await service.store.settle(id, result.receipt);
    console.log(
      JSON.stringify({
        requestId: id,
        outcome: result.outcome,
        runId: result.receipt.providerRequestId,
        latencyMs: result.receipt.latencyMs,
        costUsd: result.receipt.estimatedCostUsd,
        ...(result.outcome !== 'value' ? { reason: result.reason } : {}),
      }),
    );
    if (result.outcome !== 'value')
      throw new Error('Live harness did not return a valid proposal. No retry.');
    const proposal = proposalSchema.parse(result.value);
    const committed = await service.transition((world) =>
      commitCognition(world, prepared.binding, proposal),
    );
    if (!committed.ok) throw new Error(committed.message);
    const prefix = `macrofold:${digest(config.macrofoldUrl)}:${service.world.id}:${service.timelineId}:`;
    const lane = (await service.store.getIntegration(
      `${prefix}lane:${service.defaultResidentEntityId}`,
    )) as { session?: string; worktree?: string } | undefined;
    const completed = (await service.store.getIntegration(
      `${prefix}result:${result.receipt.providerRequestId}`,
    )) as { status?: { worker_id?: string } } | undefined;
    if (
      !lane?.session ||
      !lane.worktree ||
      completed?.status?.worker_id !== config.macrofoldWorkerId
    )
      throw new Error('Missing or unexpected execution identities.');
    sessions.push(lane.session);
    worktrees.push(lane.worktree);
    if (new Set(sessions).size !== sessions.length || new Set(worktrees).size !== 1)
      throw new Error('Fresh Session / retained Worktree acceptance failed.');
    return mindFor(service.world, service.defaultResidentEntityId);
  }
  const first = await deliberate(
    backend,
    service,
    'For this acceptance encounter, assess the player directionally and form a tentative belief from the actual speech evidence. Use your own prose and choose a sensible document organization. Include relationship and belief records, and no physical action.',
  );
  if (
    !first.records.some((r) => r.kind === 'relationship') ||
    !first.records.some((r) => r.kind === 'belief')
  )
    throw new Error('Encounter did not produce the required relationship and belief.');
  const revision = first.revision;
  await store.close();
  store = new SqlGameRepository(config.dataDirectory, new PostgresDatabase(config.databaseUrl));
  service = new WorldService(store, config);
  await service.ready;
  await enter(service);
  if (mindFor(service.world, service.defaultResidentEntityId).revision !== revision)
    throw new Error('Mind did not survive restart.');
  const continued = new MacrofoldBackend(service);
  const second = await deliberate(
    continued,
    service,
    'Consider your next decision using your accepted relationship and belief from the encounter. Explain their influence in your short private thought. You may leave documents unchanged and use actionId null.',
  );
  await service.say(
    `reflect-evidence-${id}`,
    service.controlledEntityId,
    'I am still here and interested in working together.',
    service.defaultResidentEntityId,
  );
  await deliberate(
    continued,
    service,
    'Use this safe downtime to reconsider the conversation. You may leave the mind unchanged. Do not start a physical action.',
    'reflection',
  );
  await service.say(
    `dream-evidence-${id}`,
    service.controlledEntityId,
    'Rest well. We can continue later.',
    service.defaultResidentEntityId,
  );
  const configuredDream = dreamPolicy(service.world);
  if (!configuredDream)
    throw new Error(
      'This installed world has no dream policy; dream qualification is not applicable.',
    );
  const rest = await service.command(
    `dream-rest-${id}`,
    {
      type: 'status-effect',
      definitionId: configuredDream.statusEffectId,
      targetId: service.defaultResidentEntityId,
      effectOperation: 'activate',
    },
    service.defaultResidentEntityId,
  );
  if (!rest.ok) throw new Error(rest.message);
  const dreamed = await deliberate(
    continued,
    service,
    'Consolidate the recent exchange while resting. A brief imagined dream is welcome; never treat it as observed evidence. Do not start another physical action.',
    'dream',
  );
  if (!dreamed.lastDreamEpisode) throw new Error('Dream episode was not consolidated.');
  console.log(
    JSON.stringify({
      sessions,
      workerId: config.macrofoldWorkerId,
      worktreeId: worktrees[0],
      reflectionAt: dreamed.lastReflectionAt,
      dreamEpisode: dreamed.lastDreamEpisode,
    }),
  );
  console.log(
    JSON.stringify({
      acceptance: 'encounter-restart-later-decision',
      mindRevision: second.revision,
      relationshipCount: second.records.filter((r) => r.kind === 'relationship').length,
      beliefCount: second.records.filter((r) => r.kind === 'belief').length,
      database: config.dataDirectory,
    }),
  );
} finally {
  // Keep paid-attempt/accounting evidence before removing the disposable database.
  // A failed backup leaves that owned database intact for explicit recovery.
  if (store) {
    try {
      await writeOperationalBackup(
        store.db,
        config.dataDirectory,
        join(config.dataDirectory, 'backup'),
      );
    } finally {
      await store.close();
    }
  }
  await disposable.close();
}
