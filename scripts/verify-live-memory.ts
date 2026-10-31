import { writeOperationalBackup } from '../apps/server/src/operational-backup.js';
import { createDisposableDatabase } from './disposable-postgres.mjs';
import { PostgresDatabase } from '../apps/server/src/postgres.js';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  entityGet,
  updateWorld,
  dreamPolicy,
  dreamStatus,
  acceptedMindFiles,
  commitActorResponse,
  correctExperience,
  currentBodySubject,
  currentBodyGrant,
  publishInnerWorld,
  temporalAccountAliasClosure,
} from '../packages/domain/src/index.js';
/** Explicit paid acceptance, never run by test/check or on startup.
 * node --env-file=.env --import tsx scripts/verify-live-memory.ts
 * Uses an isolated real simulation and separate saved database. Four configured-model
 * harness jobs on an explicitly selected Worker; all requests have durable IDs/caps.
 * Worker compute is separately funded/limited by its owner and is never destroyed here.
 */
import { randomInt, randomUUID } from 'node:crypto';
import { readConfig } from '../apps/server/src/config.js';
import { SqlGameRepository, digest } from '../apps/server/src/store.js';
import { WorldService } from '../apps/server/src/world-service.js';
import { MacrofoldBackend } from '../apps/server/src/macrofold.js';
import { mindFor } from '@open-legend/domain';
import { prepareDecision } from '../apps/server/src/decision-context.js';
import { RecallService } from '../apps/server/src/recall.js';
import { IntelligenceLog } from '../apps/server/src/intelligence-log.js';
import { offerInterpretationRecords } from '../apps/server/src/reflection-records.js';
import { prepareReflectionPublication } from '../apps/server/src/reflection-publication.js';
import {
  bindDecisionAppraisals,
  bindReflectionAppraisals,
} from '../apps/server/src/appraisal-context.js';
import {
  responseSchema,
  boundReflectionJsonSchema,
  boundResponseJsonSchema,
  REFLECTION_WORKSPACE_INSTRUCTIONS,
  RESPONSE_INSTRUCTIONS,
  LEVEL_LIMITS,
} from '../apps/server/src/cognition-contracts.js';
import { resolveResponseEntities } from '../apps/server/src/entity-references.js';
const config = readConfig({
  ...process.env,
  // Workspace provisioning is world/actor-scoped, independent of this database
  // and timeline. Do not inherit a game's seed; isolate before creating authority.
  WORLD_SEED: String(randomInt(1, 0x7fffffff)),
  OPEN_LEGEND_DATABASE_URL: process.env['OPENLEGEND_TEST_DATABASE_URL'],
  // The disposable scenario acquires local control; browser Auth0 is verified separately.
  OPEN_LEGEND_AUTH_MODE: 'local',
});
if (!config.macrofoldKey || config.budgetUsd <= 0 || !config.macrofoldWorkerId)
  throw new Error('Explicit backend credentials, Run caps and MACROFOLD_WORKER_ID required.');
console.log(JSON.stringify({ verificationSeed: config.seed }));
const disposable = await createDisposableDatabase(config.databaseUrl);
config.databaseUrl = disposable.url;
let store: SqlGameRepository | undefined;
let ownedService: WorldService | undefined;
let releaseReaders: (() => Promise<void>) | undefined;
try {
  config.dataDirectory = await mkdtemp(join(tmpdir(), 'openlegend-memory-'));
  store = new SqlGameRepository(
    config.dataDirectory,
    new PostgresDatabase(config.databaseUrl, false, config.sqlWriteGroups),
  );
  let service = new WorldService(store, config);
  ownedService = service;
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
    await service.setPresence('live-acceptance', true, 1);
    const resumed = await service.control({ paused: false });
    if (!resumed.ok) throw new Error(resumed.message);
  }
  // Keep the startup-selected world identity; changing it now would invalidate grants.
  await enter(service);
  // Complete a real sensory opportunity before asking for a relationship; a
  // just-resumed world otherwise offers only an unidentified speech source.
  await service.tick(1, 0, { drain: true });
  if (
    !currentBodySubject(service.world, service.defaultResidentEntityId, service.controlledEntityId)
  )
    throw new Error('The encounter needs an acquired local person before paid interpretation.');
  const backend = new MacrofoldBackend(service);
  const id = randomUUID();
  const speech = await service.say(
    `encounter-${id}`,
    service.controlledEntityId,
    'I would like us to help each other survive. I have noticed you working here. What do you make of me?',
    service.defaultResidentEntityId,
  );
  if (!speech.ok) throw new Error(speech.message);
  const originalSpeechId = [...service.world.events]
    .reverse()
    .find((event) => event.type === 'speech')!.id;
  const sessions: string[] = [];
  const worktrees: string[] = [];
  async function deliberate(
    backend: MacrofoldBackend,
    service: WorldService,
    instructions: string,
    purpose: 'thought' | 'reflection' | 'dream' = 'thought',
  ) {
    const id = randomUUID();
    const actorId = service.defaultResidentEntityId;
    const log = new IntelligenceLog(service.store);
    const recall = new RecallService(service, log);
    let releasePrepared = () => {};
    releaseReaders = async () => {
      releasePrepared();
      await recall.close();
      await log.close();
    };
    const evidence = [...service.world.events].reverse().find((event) => event.type === 'speech');
    const prepared = await prepareDecision(
      service,
      recall,
      actorId,
      id,
      instructions,
      evidence ? [evidence.id] : [],
      async () => {
        throw new Error('Verifier preparation is native-only.');
      },
      new AbortController().signal,
      0,
      false,
      0,
      evidence?.id,
      undefined,
      'native-only',
    );
    releasePrepared = prepared.dispose;
    const appraisals = await bindReflectionAppraisals(
      service,
      actorId,
      id,
      prepared.binding.evidenceIds,
      prepared.entityReferences,
      { sharedExperiences: prepared.sharedExperiences, frame: prepared.situation.frame },
    );
    prepared.context['feelings'] = appraisals.context;
    offerInterpretationRecords(service.world, actorId, prepared.context, prepared.binding);
    console.log(
      JSON.stringify({
        requestId: id,
        purpose,
        stage: 'prepared',
        simTime: service.world.simTime,
        encounterBodyReceived: !!currentBodyGrant(
          service.world,
          actorId,
          service.controlledEntityId,
        ),
        encounterSubject: currentBodySubject(service.world, actorId, service.controlledEntityId),
        interpretationSubjects: prepared.context['interpretationSubjects'],
        evidenceHandles: Object.keys(prepared.binding.evidenceReferences ?? {}),
      }),
    );
    const feelings = await bindDecisionAppraisals(
      service,
      actorId,
      id,
      prepared.binding.evidenceIds,
      prepared.entityReferences,
      undefined,
      { sharedExperiences: prepared.sharedExperiences, frame: prepared.situation.frame },
    );
    if (purpose === 'thought') prepared.context['feelings'] = feelings.context;
    const revision = service.world.innerWorlds![actorId]!.revision;
    const episode =
      purpose === 'dream'
        ? dreamStatus(
            service.world,
            (await import('@open-legend/domain')).entityGet(service.world.entities, actorId),
          )?.episode
        : null;
    await prepared.validateConversation();
    if (!(await service.store.reserve(id, 'openai', config.macrofoldRunUsd, config.budgetUsd)))
      throw new Error('Acceptance run budget exhausted.');
    const request = {
      requestId: id,
      actorScope: actorId,
      execution: 'full' as const,
      task: 'background_reflection' as const,
      reasoningEffort: purpose === 'thought' ? LEVEL_LIMITS[2].effort : LEVEL_LIMITS[5].effort,
      instructions:
        (purpose === 'thought' ? RESPONSE_INSTRUCTIONS : REFLECTION_WORKSPACE_INSTRUCTIONS) +
        ' ' +
        instructions,
      context: prepared.context,
      schema:
        purpose === 'thought'
          ? boundResponseJsonSchema(
              Object.keys(prepared.entityReferences),
              Object.keys(prepared.binding.actions),
              { speech: false, expressions: false, proposals: false },
              [],
              [],
              [],
              feelings.schema,
              Object.keys(prepared.binding.identityReferences ?? {}),
              Object.keys(prepared.binding.physicalEntityReferences ?? {}),
            )
          : boundReflectionJsonSchema(
              Object.keys(prepared.binding.identityReferences ?? {}),
              Object.keys(prepared.binding.evidenceReferences ?? {}),
            ),
    };
    const result =
      purpose === 'thought'
        ? await backend.generate<unknown>(request)
        : await backend.reflect(request, acceptedMindFiles(service.world, actorId));
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
    const validateSources = async () => {
      await prepared.validateConversation(false);
      return purpose === 'thought' ? feelings.current() : appraisals.current();
    };
    const committed =
      purpose === 'thought'
        ? await service.transition(
            (world) => {
              if (!prepared.temporalSourcesCurrent() || !prepared.situation.valid(world))
                throw new Error('Prepared decision evidence changed.');
              const parsed = responseSchema.parse(result.value);
              const resolvedFeelings = feelings.resolveDecision(
                parsed.operations.flatMap((op) => (op.appraise ? [op.appraise] : [])),
              );
              let feelingIndex = 0;
              const reply = {
                operations: parsed.operations.map((op) => ({
                  ...op,
                  appraise: op.appraise ? resolvedFeelings[feelingIndex++]! : null,
                })),
              };
              const nativeReply = resolveResponseEntities(
                reply,
                prepared.entityReferences,
                prepared.intentionReferences,
                prepared.binding.knowledgeReferences,
                [],
                prepared.binding.identityReferences,
                prepared.binding.physicalEntityReferences,
              );
              return commitActorResponse(
                world,
                id,
                actorId,
                nativeReply,
                prepared.binding.actions,
                prepared.binding.entityIds,
                prepared.binding.expectedPlan,
                [],
                prepared.binding.entityEpisodes,
                prepared.binding.evidenceIds,
                prepared.binding.knowledgeReferences,
                feelings.bindings,
                prepared.binding.identityReferences,
                prepared.binding.entityLeases,
              );
            },
            undefined,
            undefined,
            validateSources,
          )
        : await service.transition(
            prepareReflectionPublication(
              prepared,
              appraisals,
              result.value as Extract<
                Awaited<ReturnType<MacrofoldBackend['reflect']>>,
                { outcome: 'value' }
              >['value'],
              actorId,
              id,
              revision,
              episode ?? null,
            ),
            undefined,
            undefined,
            validateSources,
          );
    await releaseReaders();
    releaseReaders = undefined;
    if (!committed.ok) throw new Error(committed.message);
    const prefix = `macrofold:${digest(config.macrofoldUrl)}:${service.world.id}:${service.timelineId}:`;
    const completed = (await service.store.getIntegration(
      `${prefix}result:${result.receipt.providerRequestId}`,
    )) as
      | { status?: { id?: string; worker_id?: string; session_id?: string; worktree_id?: string } }
      | undefined;
    // The verified Run owns execution identities for every purpose; private
    // thought/reflection lane layouts are not the acceptance contract.
    const execution = completed?.status;
    if (
      !execution ||
      execution.id !== result.receipt.providerRequestId ||
      !execution.session_id ||
      !execution.worktree_id ||
      execution.worker_id !== config.macrofoldWorkerId
    )
      throw new Error('Missing or unexpected execution identities.');
    sessions.push(execution.session_id);
    worktrees.push(execution.worktree_id);
    if (new Set(sessions).size !== sessions.length || new Set(worktrees).size !== 1)
      throw new Error('Fresh Session / retained Worktree acceptance failed.');
    return mindFor(service.world, service.defaultResidentEntityId);
  }
  const first = await deliberate(
    backend,
    service,
    'For this acceptance encounter, assess the other person directionally and form a tentative belief from actual speech. Include relationship and belief recordChanges bound to the supplied subjects and evidence. No physical action.',
    'reflection',
  );
  if (
    !first.records.some((r) => r.kind === 'relationship') ||
    !first.records.some((r) => r.kind === 'belief')
  )
    throw new Error('Encounter did not produce the required relationship and belief.');
  const belief = first.records.find((record) => record.kind === 'belief')!;
  const relationship = first.records.find((record) => record.kind === 'relationship')!;
  const revision = first.revision;
  service.releaseHostWork();
  await store.close();
  store = new SqlGameRepository(
    config.dataDirectory,
    new PostgresDatabase(config.databaseUrl, false, config.sqlWriteGroups),
  );
  service = new WorldService(store, config);
  ownedService = service;
  await service.ready;
  await enter(service);
  if (mindFor(service.world, service.defaultResidentEntityId).revision !== revision)
    throw new Error('Mind did not survive restart.');
  const continued = new MacrofoldBackend(service);
  const second = await deliberate(
    continued,
    service,
    'Consider your next decision using your accepted relationship and belief from the encounter. Explain their influence in your short private thought. Return only private think operations or an empty operations list; no physical action.',
  );
  const contrary = await service.say(
    `reflect-evidence-${id}`,
    service.controlledEntityId,
    'I have changed my mind. I will not work together or share supplies with you.',
    service.defaultResidentEntityId,
  );
  if (!contrary.ok) throw new Error(contrary.message);
  const contraryId = [...service.world.events]
    .reverse()
    .find((event) => event.type === 'speech')!.id;
  const contrarySources = new Set(
    temporalAccountAliasClosure(service.world, service.defaultResidentEntityId, [contraryId]),
  );
  const revised = await deliberate(
    continued,
    service,
    `Reconsider your earlier helpfulness belief using the new refusal. Revise belief ${belief.id} with its current revision and a contradicts evidence link to that refusal. Explicitly remove unprotected relationship record ${relationship.id} with its current revision. Keep all protected files and reconcile remaining prose with the changed interpretations. No physical action.`,
    'reflection',
  );
  const changedBelief = revised.records.find((record) => record.id === belief.id);
  if (
    !changedBelief ||
    changedBelief.revision <= belief.revision ||
    !changedBelief.evidence.some(
      (link) => link.relation === 'contradicts' && contrarySources.has(link.id),
    ) ||
    revised.records.some((record) => record.id === relationship.id)
  )
    throw new Error(
      'Contradictory belief revision and explicit relationship removal were not demonstrated.',
    );

  // Native protection and delayed-source guards need no fifth model job.
  const actorId = service.defaultResidentEntityId;
  const protectedDocument = mindFor(service.world, actorId).documents.find(
    (document) => document.protected,
  );
  if (!protectedDocument) throw new Error('No protected identity was available to qualify.');
  const protectedInput = service.world;
  const protectedResult = publishInnerWorld(
    protectedInput,
    actorId,
    protectedInput.innerWorlds![actorId]!.revision,
    `protected-${id}`,
    'native-acceptance',
    acceptedMindFiles(protectedInput, actorId).map((file) =>
      file.path === `${protectedDocument.id}.md`
        ? { ...file, text: `${file.text}\nI have a different identity.` }
        : file,
    ),
    ['I am reconsidering the encounter.'],
    [],
    null,
  );
  if (
    protectedResult.outcome.ok ||
    protectedResult.world !== protectedInput ||
    protectedResult.outcome.message !== 'Essential identity must be preserved.'
  )
    throw new Error('Protected identity rewriting was not refused atomically.');

  const log = new IntelligenceLog(service.store);
  const recall = new RecallService(service, log);
  let releasePrepared = () => {};
  releaseReaders = async () => {
    releasePrepared();
    await recall.close();
    await log.close();
  };
  const pending = await prepareDecision(
    service,
    recall,
    actorId,
    `delayed-${id}`,
    'Reconsider the original conversation.',
    [originalSpeechId],
    async () => {
      throw new Error('Native-only correction check.');
    },
    new AbortController().signal,
    0,
    false,
    0,
    originalSpeechId,
    undefined,
    'native-only',
  );
  releasePrepared = pending.dispose;
  await pending.validateConversation();
  const appraisals = await bindReflectionAppraisals(
    service,
    actorId,
    `delayed-${id}`,
    pending.binding.evidenceIds,
    pending.entityReferences,
    { sharedExperiences: pending.sharedExperiences, frame: pending.situation.frame },
  );
  const delayed = prepareReflectionPublication(
    pending,
    appraisals,
    {
      revision: 'native-acceptance',
      files: acceptedMindFiles(service.world, actorId),
      thoughts: ['The earlier offer needs reconsideration.'],
      appraisalChanges: [],
      recordChanges: [],
      goalChanges: [],
      knowledgeChanges: [],
      nameChanges: [],
    },
    actorId,
    `delayed-${id}`,
    service.world.innerWorlds![actorId]!.revision,
  );
  const correction = await service.say(
    `correction-evidence-${id}`,
    service.controlledEntityId,
    'My original offer was mistaken. Please treat it as withdrawn.',
    actorId,
  );
  if (!correction.ok) throw new Error(correction.message);
  const correctionId = [...service.world.events]
    .reverse()
    .find((event) => event.type === 'speech')!.id;
  const corrected = await service.transition((world) =>
    correctExperience(world, actorId, originalSpeechId, correctionId),
  );
  if (!corrected.ok) throw new Error(corrected.message);
  let publicationCalled = false;
  let refused = false;
  try {
    const result = await service.transition(
      (world) => {
        publicationCalled = true;
        return delayed(world);
      },
      undefined,
      undefined,
      async () => {
        // Match maintenance: validate speech/recall as well as temporal history
        // inside the publication lane, before invoking the domain mutation.
        await pending.validateConversation(false);
        return appraisals.current();
      },
    );
    refused = !result.ok;
  } catch (error) {
    if (!(error instanceof Error) || error.message !== 'Personal speech disclosure changed.')
      throw error;
    refused = true;
  }
  if (!refused || publicationCalled)
    throw new Error('A delayed reflection reached publication with corrected evidence.');
  await releaseReaders();
  releaseReaders = undefined;
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
  // Advance only the owned acceptance world to the installed dream threshold.
  // This qualifies current native dream admission, not the daily scheduler's natural timing.
  await service.transition((world) => ({
    world: updateWorld(world, (draft) => {
      draft.simTime += configuredDream.afterSeconds;
      entityGet(draft.entities, service.defaultResidentEntityId)!.statusEffects![
        configuredDream.statusEffectId
      ]!.elapsedSeconds = configuredDream.afterSeconds;
    }),
    events: [],
    outcome: { ok: true, code: 'acceptance-time', message: 'Owned scenario advanced.' },
  }));
  const dreamed = await deliberate(
    continued,
    service,
    'Retain a brief imagined dream in thoughts and optional recordChanges using source imagined. Never treat it as observed evidence. Preserve existing files and records; no physical action.',
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
  try {
    if (releaseReaders) await releaseReaders();
  } finally {
    ownedService?.releaseHostWork();
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
}
