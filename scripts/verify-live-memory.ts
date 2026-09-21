/** Explicit paid acceptance, never run by test/check or on startup.
 * node --env-file=.env --import tsx scripts/verify-live-memory.ts
 * Uses an isolated real simulation and separate saved database. Four mini-model
 * harness jobs, one warm sandbox allocation; all requests have durable IDs/caps.
 */
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { readConfig } from '../apps/server/src/config.js';
import { SqliteStore, digest } from '../apps/server/src/store.js';
import { WorldService } from '../apps/server/src/world-service.js';
import { MacrofoldBackend } from '../apps/server/src/macrofold.js';
import {
  cognitionContext,
  COGNITION_INSTRUCTIONS,
  proposalSchema,
  fullCognitionJsonSchema,
} from '../apps/server/src/cognition.js';
import { commitCognition, mindFor } from '@open-legend/domain';
const config = { ...readConfig(), databasePath: resolve('.data/live-memory-acceptance.sqlite') };
if (!config.macrofoldKey || config.budgetUsd <= 0 || config.macrofoldComputeUsd <= 0)
  throw new Error('Explicit backend credentials and caps required.');
let store = new SqliteStore(config.databasePath);
let service = new WorldService(store, config);
await service.ready;
await service.setPresence('live-acceptance', true, 1);
await service.control({ paused: false });
if (!service.world.id.startsWith('live-memory-'))
  await service.transition((world) => ({
    world: { ...world, id: `live-memory-${randomUUID()}` },
    events: [],
    outcome: { ok: true, code: 'verification-world', message: 'Isolated acceptance identity.' },
  }));
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
const sandboxes: string[] = [];
async function deliberate(
  backend: MacrofoldBackend,
  service: WorldService,
  instructions: string,
  purpose: 'thought' | 'reflection' | 'dream' = 'thought',
) {
  const id = randomUUID();
  const prepared = cognitionContext(service, service.defaultResidentEntityId, id, purpose, 'full');
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
  const lane = (await service.store.getIntegration(
    `macrofold:${digest(config.macrofoldUrl)}:${service.world.id}:lane:ada`,
  )) as { session?: string; sandbox?: string };
  if (!lane.session || !lane.sandbox) throw new Error('Missing execution identities.');
  sessions.push(lane.session);
  sandboxes.push(lane.sandbox);
  if (new Set(sessions).size !== sessions.length || new Set(sandboxes).size !== 1)
    throw new Error('Fresh conversation / warm compute acceptance failed.');
  return mindFor(service.world, service.defaultResidentEntityId);
}
try {
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
  store = new SqliteStore(config.databasePath);
  service = new WorldService(store, config);
  await service.ready;
  await service.setPresence('live-acceptance-restart', true, 1);
  await service.control({ paused: false });
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
  const rest = await service.command(
    `dream-rest-${id}`,
    { type: 'rest' },
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
      sandboxId: sandboxes[0],
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
      database: config.databasePath,
    }),
  );
} finally {
  await store.close();
}
