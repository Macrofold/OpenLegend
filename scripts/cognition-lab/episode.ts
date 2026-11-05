import { mkdir, mkdtemp, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadJobExecutionClient, type AiReceipt } from '@open-legend/ai';
import type { CognitionLabPolicy, CognitionLabStage } from '@open-legend/protocol';
import { readConfig } from '../../apps/server/src/config.js';
import { PostgresDatabase } from '../../apps/server/src/postgres.js';
import { SqlGameRepository } from '../../apps/server/src/store.js';
import { WorldService } from '../../apps/server/src/world-service.js';
import { createGameServer } from '../../apps/server/src/http.js';
import type { CreationHostRuntime } from '../../apps/server/src/creation-host.js';
import { LabCampaignClient, saveJson } from './client.js';
import {
  hash,
  parseEpisodeSpec,
  episodeAutonomousActors,
  type EpisodeSpec,
  type NativeStep,
} from './contracts.js';
import { NativeSteps, EpisodeBlocked, object } from './native-steps.js';
import { prepareEpisode, validateOrigin } from './preparation.js';
import {
  observeSingleAttack,
  observeMovement,
  observeNativeOutcome,
  acceptObservedOffer,
  recordAdmission,
} from './native-observations.js';
import {
  PhaseDecisions,
  resolvePhasePolicy,
  SimulationAllowanceReached,
} from './phase-boundary.js';
import { runGameEpisode } from './game-episode.js';

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
type CapturedStage = CognitionLabStage & { nativeAttemptId?: string };
interface StageObservation {
  runId: string;
  stageId: string;
  nativeAttemptId?: string;
  kind: string;
  purpose: string;
  requestSha256?: string;
  continuedAt?: string;
  status?: string;
  receipt?: AiReceipt;
}
export interface EpisodeResult {
  id: string;
  scope: string;
  runtimeTarget: 'lab' | 'game';
  conditionId: string;
  modelId: string;
  mode: 'prepare' | 'execute';
  status: string;
  reason?: string;
  sourceRevision: string;
  originSha256: string;
  specSha256: string;
  randomization: EpisodeSpec['randomization'];
  runIds: string[];
  stages: StageObservation[];
  timings: { preparationMs: number; workMs: number; collectionMs: number; cleanupMs: number };
  cost: {
    /** Captured native total with provider costs preferred over explicit estimates. */
    labReportedKnownUsd: number;
    providerReportedUsd: number;
    estimatedUsd: number;
    missingReceipts: number;
    uncertainAttempts: number;
    unknownCostAttempts: number;
    authority: 'shared-execution';
  };
  exports: unknown[];
  provenance: Record<string, unknown>;
  preparation?: unknown;
  protocol?: unknown;
}

function options(args: string[]) {
  const values = new Map<string, string>();
  let recover = false;
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (key === '--recover') {
      recover = true;
      continue;
    }
    if (!['--input', '--output', '--mode'].includes(key ?? '') || !args[i + 1] || values.has(key!))
      throw new Error(
        'Use episode.ts --input SPEC.json --output DIRECTORY --mode prepare|execute [--recover].',
      );
    values.set(key!, args[++i]!);
  }
  const mode = values.get('--mode') ?? 'prepare';
  if (!['prepare', 'execute'].includes(mode))
    throw new Error('Episode mode is prepare or execute.');
  if (!values.get('--input') || !values.get('--output'))
    throw new Error('Declare the episode input and output.');
  return {
    input: resolve(values.get('--input')!),
    output: resolve(values.get('--output')!),
    mode: mode as 'prepare' | 'execute',
    recover,
  };
}
async function databaseAliases() {
  const path = process.env['OPENLEGEND_JOB_DATABASES'];
  if (!path) throw new Error('The managed job must supply game and lab database aliases.');
  const value: unknown = JSON.parse(await readFile(path, 'utf8'));
  if (
    !value ||
    typeof value !== 'object' ||
    !('game' in value) ||
    !('lab' in value) ||
    typeof value.game !== 'string' ||
    typeof value.lab !== 'string'
  )
    throw new Error('Declare both game and lab database aliases.');
  const urls = [new URL(value.game), new URL(value.lab)];
  for (const u of urls)
    if (
      !['postgres:', 'postgresql:'].includes(u.protocol) ||
      !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) ||
      u.pathname.length < 2
    )
      throw new Error('Episode databases must be worker-local PostgreSQL databases.');
  if (urls[0]!.pathname === urls[1]!.pathname && urls[0]!.port === urls[1]!.port)
    throw new Error('Game and Lab need distinct databases.');
  for (const connectionString of [value.game, value.lab]) {
    const client = new PostgresDatabase(connectionString, true);
    try {
      const row = await client
        .prepare(
          "SELECT 1 FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') LIMIT 1",
        )
        .get();
      if (row)
        throw new Error(
          'Episode database already contains work. Recover the original campaign instead of resetting or resubmitting it.',
        );
    } finally {
      await client.close();
    }
  }
  return { game: value.game, lab: value.lab };
}
async function inspectHeld(
  api: LabCampaignClient,
  current: Awaited<ReturnType<LabCampaignClient['refresh']>>,
) {
  const held = current.run?.prepared;
  if (!held || !current.run) throw new EpisodeBlocked('No exact held native request is available.');
  const detail = await api.json<CapturedStage>(
    `/runs/${current.run.id}/stages/${held.stageId}?section=input`,
  );
  let input: unknown = held.request;
  if (input === undefined) {
    const artifact = detail.artifacts.find((value) => value.kind === 'input');
    if (artifact) {
      const chunks = [];
      let offset = 0;
      for (;;) {
        const chunk = await api.json<import('@open-legend/protocol').CognitionLabArtifact>(
          `/artifacts/${artifact.id}?offset=${offset}`,
        );
        chunks.push(chunk.text);
        if (chunk.nextOffset === undefined) break;
        offset = chunk.nextOffset;
      }
      input = JSON.parse(chunks.join(''));
    }
  }
  if (input === undefined) throw new EpisodeBlocked('The exact prepared input was not captured.');
  return { held, detail, input };
}

export async function runEpisode(
  input: string,
  output: string,
  mode: 'prepare' | 'execute',
): Promise<EpisodeResult> {
  const bytes = await readFile(input),
    spec = parseEpisodeSpec(JSON.parse(bytes.toString('utf8')));
  const origin = await validateOrigin(input, spec);
  await mkdir(output, { recursive: true });
  const marker = join(output, 'episode.json'),
    lock = join(output, 'active-episode.lock');
  try {
    await stat(marker);
    throw new Error(
      'This episode already has an outcome. Resume/collect the original campaign; do not resubmit it.',
    );
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
  }
  await writeFile(
    lock,
    JSON.stringify({ id: spec.id, pid: process.pid, startedAt: new Date().toISOString() }),
    { mode: 0o600, flag: 'wx' },
  );
  const result: EpisodeResult = {
    id: spec.id,
    scope: spec.scope,
    runtimeTarget: spec.runtimeTarget,
    conditionId: spec.conditionId,
    modelId: spec.model.id,
    mode,
    status: 'preparing',
    sourceRevision: spec.sourceRevision,
    originSha256: origin.sha256,
    specSha256: hash(bytes),
    randomization: spec.randomization,
    runIds: [],
    stages: [],
    timings: { preparationMs: 0, workMs: 0, collectionMs: 0, cleanupMs: 0 },
    cost: {
      labReportedKnownUsd: 0,
      providerReportedUsd: 0,
      estimatedUsd: 0,
      missingReceipts: 0,
      uncertainAttempts: 0,
      unknownCostAttempts: 0,
      authority: 'shared-execution',
    },
    exports: [],
    provenance: { startedAt: new Date().toISOString(), providerCredentialsOnWorker: false },
  };
  let shared: Awaited<ReturnType<typeof loadJobExecutionClient>> | undefined;
  let host: CreationHostRuntime | undefined,
    store: SqlGameRepository | undefined,
    api: LabCampaignClient | undefined;
  let runtimeStorage: { directory: string; retained: boolean } | undefined;
  let admission: ReturnType<typeof recordAdmission>;
  const started = performance.now();
  let workStarted: number | undefined,
    continued = 0;
  const controller = new AbortController();
  const cancel = () => {
    controller.abort(new Error('Episode cancellation requested.'));
    void api?.operation({ kind: 'controlRun', action: 'stop' }).catch(() => undefined);
  };
  process.once('SIGTERM', cancel);
  process.once('SIGINT', cancel);
  try {
    await saveJson(marker, result, true);
    const databases = await databaseAliases();
    shared =
      mode === 'execute'
        ? await loadJobExecutionClient(undefined, {
            judge: spec.judgmentModel,
            ...(spec.embeddingMode === 'normal'
              ? { embed: spec.embeddingModel ?? 'text-embedding-3-small' }
              : {}),
          })
        : undefined;
    const allowance =
      mode === 'execute' ? Number(process.env['OPEN_LEGEND_LAB_BUDGET_USD'] ?? 0) : 0;
    if (mode === 'execute' && (!Number.isFinite(allowance) || allowance <= 0 || allowance > 100))
      throw new EpisodeBlocked(
        'Declare a positive native Lab allowance within the authorized shared execution grant.',
      );
    if (shared) {
      for (const [kind, model] of [
        ['judge', spec.judgmentModel],
        ['generate', spec.model.model],
      ] as const)
        if (!shared.lanes.some((lane) => lane.kind === kind && lane.model === model))
          throw new EpisodeBlocked('The selected model has no matching shared execution lane.');
      if (
        spec.embeddingMode === 'normal' &&
        !shared.lanes.some(
          (lane) =>
            lane.kind === 'embed' &&
            lane.model === (spec.embeddingModel ?? 'text-embedding-3-small'),
        )
      )
        throw new EpisodeBlocked('Normal embeddings require a granted embedding lane.');
    }
    // The supervisor gives each case its own writable home outside collected
    // results. Native snapshot blobs belong there; the Run bundles below own
    // the portable checkpoints, requests and receipts collected as evidence.
    const home = process.env['HOME'];
    if (!home) throw new Error('The episode requires its managed job home directory.');
    runtimeStorage = {
      directory: await mkdtemp(join(home, 'cognition-runtime-')),
      retained: true,
    };
    result.provenance['runtimeStorage'] = runtimeStorage;
    const config = readConfig({
      OPEN_LEGEND_DATABASE_URL: databases.game,
      OPEN_LEGEND_LAB_DATABASE_URL: databases.lab,
      OPEN_LEGEND_DATA_DIR: join(runtimeStorage.directory, 'game'),
      OPEN_LEGEND_LAB_DATA_DIR: join(runtimeStorage.directory, 'lab'),
      OPEN_LEGEND_GOD_MODE: 'true',
      AI_BUDGET_USD: String(allowance),
      OPEN_LEGEND_LAB_BUDGET_USD: String(allowance),
      COGNITION_MINI_MODEL: spec.model.model,
      COGNITION_COMPLEX_MODEL: spec.model.model,
      HIGHER_DECISION_MODEL: spec.model.model,
      // Zero-budget preparation needs identities and native inputs, not a
      // fabricated quote for a provider request that cannot be dispatched.
      OPENAI_MODEL: mode === 'execute' ? spec.model.model : undefined,
      JEV_MODEL: mode === 'execute' ? spec.judgmentModel : undefined,
      JEV_INPUT_USD_PER_MILLION: process.env['JEV_INPUT_USD_PER_MILLION'],
      LLM_INPUT_USD_PER_MILLION: process.env['LLM_INPUT_USD_PER_MILLION'],
      LLM_OUTPUT_USD_PER_MILLION: process.env['LLM_OUTPUT_USD_PER_MILLION'],
      LLM_CACHED_INPUT_USD_PER_MILLION: process.env['LLM_CACHED_INPUT_USD_PER_MILLION'],
      LLM_CACHE_WRITE_USD_PER_MILLION: process.env['LLM_CACHE_WRITE_USD_PER_MILLION'],
      MACROFOLD_JEV_MODEL: spec.judgmentModel,
      OPENAI_MODEL_PRICES_JSON: process.env['OPENAI_MODEL_PRICES_JSON'],
      OPENLEGEND_MODEL_TARGETS_JSON: process.env['OPENLEGEND_MODEL_TARGETS_JSON'],
      EMBEDDING_MODEL: spec.embeddingModel ?? 'text-embedding-3-small',
      EMBEDDING_DIMENSIONS: String(spec.embeddingDimensions ?? 512),
    });
    if (mode === 'prepare') config.jevModel = spec.judgmentModel;
    config.higherDecisionModel = spec.model.model;
    config.sharedExecution = shared?.lanes.filter(
      (lane) => lane.kind !== 'embed' || spec.embeddingMode === 'normal',
    );
    result.provenance['executionCapabilities'] = {
      typedModelCalls: !!shared,
      normalEmbeddings: !!shared && spec.embeddingMode === 'normal',
      fullDeliberationHarness: false,
      reflectionHarness: false,
    };
    const workerManifest = process.env['OPENLEGEND_VERIFICATION_MANIFEST'];
    if (workerManifest) {
      const manifest: unknown = JSON.parse(await readFile(workerManifest, 'utf8'));
      if (
        !manifest ||
        typeof manifest !== 'object' ||
        !('commit' in manifest) ||
        manifest.commit !== spec.sourceRevision
      )
        throw new EpisodeBlocked('Worker source revision differs from the frozen episode.');
      result.provenance['workerSource'] = manifest;
    }
    store = new SqlGameRepository(config.dataDirectory, new PostgresDatabase(databases.game));
    // The renderer-free startup uses the ordinary complete initializer. It does
    // not create a fake artwork catalog or grant access to another world’s assets.
    const native = new WorldService(store, config);
    await native.ready;
    await native.flush();
    await native.settleBackgroundSaves();
    native.releaseHostWork();
    host = await createGameServer({
      store,
      config,
      production: true,
      tick: false,
      aiClient: shared,
      embeddingClient: spec.embeddingMode === 'normal' ? shared : undefined,
      executionSource: shared ? 'live-model' : undefined,
    });
    await new Promise<void>((resolve, reject) => {
      host!.server.once('error', reject);
      host!.server.listen(0, '127.0.0.1', () => resolve());
    });
    const address = host.server.address();
    if (!address || typeof address === 'string')
      throw new Error('The isolated Lab did not open a loopback port.');
    api = new LabCampaignClient(`http://127.0.0.1:${address.port}`, output);
    await saveJson(join(output, 'connection.json'), {
      base: api.base,
      episodeId: spec.id,
      pid: process.pid,
      databases: { game: new URL(databases.game).pathname, lab: new URL(databases.lab).pathname },
    });
    result.preparation = await prepareEpisode(host, api, spec, origin.path);
    result.timings.preparationMs = performance.now() - started;
    if (spec.runtimeTarget === 'lab')
      admission = recordAdmission(
        host.cognitionLab!.runtime.director,
        spec.outputs.admissionTraceBytes,
      );
    workStarted = performance.now();
    if (spec.runtimeTarget === 'game') {
      await runGameEpisode(
        host,
        api,
        spec,
        output,
        result,
        controller.signal,
        shared,
        spec.embeddingMode === 'normal' ? shared : undefined,
        mode === 'prepare',
      );
    } else if (mode === 'prepare') {
      result.status = 'prepared';
      result.protocol = {
        prelude: spec.protocol.prelude ?? null,
        nativeActionTypes: spec.protocol.nativeActionTypes ?? {},
        modelInvocations: 0,
      };
    } else {
      const focal = spec.origin.actorIds['focal']!,
        nativeSteps = new NativeSteps(api, spec);
      let startSim = (await api.refresh()).gameTime;
      const activeStarted = workStarted;
      const nativeCallCount = () => api!.nativeCallCount();
      const policy = async (): Promise<CognitionLabPolicy> => {
        controller.signal.throwIfAborted();
        const remaining =
            spec.limits.simulationSeconds - ((await api!.refresh()).gameTime - startSim),
          wall = spec.limits.activeWallSeconds - (performance.now() - activeStarted) / 1000,
          calls = spec.limits.maximumCalls - (await nativeCallCount());
        if (remaining <= 0)
          throw new SimulationAllowanceReached(
            `The original simulation allowance is exhausted (${(spec.limits.simulationSeconds - remaining).toFixed(3)} of ${spec.limits.simulationSeconds} seconds).`,
          );
        if (wall <= 0)
          throw new EpisodeBlocked(
            `The original active wall allowance is exhausted (${(spec.limits.activeWallSeconds - wall).toFixed(3)} of ${spec.limits.activeWallSeconds} seconds).`,
          );
        if (calls <= 0)
          throw new EpisodeBlocked(
            `The original native model-call allowance is exhausted (${spec.limits.maximumCalls - calls} of ${spec.limits.maximumCalls} calls).`,
          );
        return {
          mode: 'oneResponse',
          focalActorId: focal,
          autonomousActorIds: episodeAutonomousActors(spec),
          durationSeconds: remaining,
          maximumCalls: calls,
          activeWallSeconds: wall,
          stopCondition: { kind: 'nextStage' },
        };
      };
      const phases: Record<string, unknown>[] = [];
      const phase = async (label: string, step?: NativeStep, until?: () => Promise<boolean>) => {
        const before = await api!.refresh();
        const decisions = await PhaseDecisions.begin(api!, focal);
        const observation: Record<string, unknown> = {
          label,
          step: step ?? null,
          startedSim: before.gameTime,
          startedAt: new Date().toISOString(),
        };
        phases.push(observation);
        const attack =
          step?.kind === 'attack'
            ? await observeSingleAttack(
                nativeSteps,
                nativeSteps.actor(step.actor),
                nativeSteps.actor(step.target ?? 'focal'),
                before.gameTime,
              )
            : undefined;
        const confirmedContact =
          !!attack &&
          step?.kind === 'attack' &&
          step.requireInjury &&
          step.completeBeforeResponse !== false;
        if (confirmedContact) {
          const passive = nativeSteps.passive(focal),
            setupStarted = performance.now(),
            setupCalls = await nativeCallCount();
          await api!.operation({ kind: 'applySettings', settings: { policy: passive } });
          const submitted = await nativeSteps.perform(step, passive);
          if (submitted.receipt)
            observation['stimulusSource'] = decisions.expect(submitted.receipt);
          await attack.captureAction();
          await api!.operation({ kind: 'controlRun', action: 'hold' });
          let participantWaitingAt: number | undefined;
          for (;;) {
            controller.signal.throwIfAborted();
            const current = await api!.refresh();
            if (current.run?.prepared || (await nativeCallCount()) !== setupCalls)
              throw new EpisodeBlocked('Passive native attack unexpectedly admitted model work.');
            const evidence = await attack.read();
            observation['attack'] = evidence;
            if (evidence.completedAttempt) {
              if (!evidence.injuryObserved || !evidence.participantIncluded)
                throw new EpisodeBlocked(
                  'The single native strike did not establish the required participant-observed injury. It was not repeated.',
                );
              break;
            }
            if (performance.now() - setupStarted > spec.limits.observationWallSeconds * 1000)
              throw new EpisodeBlocked(
                'Native strike did not finish within its original observation allowance.',
              );
            if (evidence.afterHealth < evidence.beforeHealth) {
              participantWaitingAt ??= performance.now();
              if (performance.now() - participantWaitingAt >= 5000)
                throw new EpisodeBlocked(
                  'Native damage committed but its participant evidence did not become ready while held.',
                );
              await sleep(100);
              continue;
            }
            const remaining = 60 - (current.gameTime - before.gameTime);
            if (remaining <= 0)
              throw new EpisodeBlocked(
                'The single native strike did not complete within its bounded setup.',
              );
            await nativeSteps.advance(Math.min(5, remaining));
            await api!.waitBoundary(Math.min(30_000, spec.limits.observationWallSeconds * 1000));
          }
          const current = await api!.refresh();
          startSim += current.gameTime - before.gameTime;
          observation['nativeSetup'] = {
            simulationSeconds: current.gameTime - before.gameTime,
            wallMs: performance.now() - setupStarted,
            inferenceCalls: 0,
          };
        }
        const phasePolicy = async () => {
          const p = await resolvePhasePolicy(policy, until);
          if (!p) return undefined;
          if (step?.kind === 'wait' && step.seconds > 0) {
            const remainingWait =
              step.seconds - ((await api!.refresh()).gameTime - before.gameTime);
            if (remainingWait > p.durationSeconds + 1e-6)
              throw new EpisodeBlocked(
                'The declared wait exceeds the original remaining simulation allowance.',
              );
            p.mode = 'forDuration';
            p.durationSeconds = Math.min(remainingWait, p.durationSeconds);
          } else if (until || (step && 'completion' in step && step.completion === 'arrived')) {
            p.mode = 'untilCondition';
            p.durationSeconds = Math.min(5, p.durationSeconds);
          }
          return p;
        };
        const p = await phasePolicy();
        if (!p) {
          observation['endedSim'] = (await api!.refresh()).gameTime;
          observation['endedAt'] = new Date().toISOString();
          await saveJson(join(output, 'phases.json'), phases);
          return;
        }
        await api!.operation({ kind: 'applySettings', settings: { policy: p } });
        let movement: Awaited<ReturnType<NativeSteps['perform']>> | undefined;
        try {
          movement = step && !confirmedContact ? await nativeSteps.perform(step, p) : undefined;
          if (step?.kind !== 'wait' && movement?.receipt)
            observation['stimulusSource'] = decisions.expect(movement.receipt);
        } catch (error) {
          if (step?.kind === 'wait') {
            try {
              const current = await api!.refresh();
              observation['wait'] = {
                requestedSeconds: step.seconds,
                elapsedSeconds: current.gameTime - before.gameTime,
                operationConfirmed: false,
                reason: error instanceof Error ? error.message : String(error),
              };
              await saveJson(join(output, 'phases.json'), phases);
            } catch (inspectionError) {
              result.provenance['phaseObservationFailure'] =
                inspectionError instanceof Error
                  ? inspectionError.message
                  : String(inspectionError);
            }
          }
          throw error;
        }
        if (!step || confirmedContact)
          await api!.operation({ kind: 'controlRun', action: 'continue' });
        if (attack && !confirmedContact) await attack.captureAction();
        for (;;) {
          controller.signal.throwIfAborted();
          if (performance.now() - activeStarted > spec.limits.observationWallSeconds * 1000)
            throw new EpisodeBlocked('Original outer observation window elapsed.');
          const current = await api!.waitBoundary(
            Math.max(
              1,
              spec.limits.observationWallSeconds * 1000 - (performance.now() - activeStarted),
            ),
          );
          const terminal = await decisions.completed();
          const requiresArrival =
            !!movement?.movement && step && 'completion' in step && step.completion === 'arrived';
          const waitElapsed = current.gameTime - before.gameTime;
          let complete = until
            ? await until()
            : step?.kind === 'wait'
              ? waitElapsed + 1e-6 >= step.seconds
              : requiresArrival
                ? true
                : !!terminal;
          // A duration observation need not create a character decision. Preserve
          // elapsed native work, including a held interval that stopped too early.
          if (step?.kind === 'wait') {
            observation['wait'] = {
              requestedSeconds: step.seconds,
              elapsedSeconds: waitElapsed,
              complete,
            };
            await saveJson(join(output, 'phases.json'), phases);
          }
          if (movement?.movement && step && 'completion' in step && step.completion === 'arrived') {
            const evidence = await observeMovement(nativeSteps, movement.movement);
            observation['movement'] = evidence;
            complete = complete && evidence.complete;
          }
          if (attack && step?.kind === 'attack') {
            const evidence = await attack.read();
            observation['attack'] = evidence;
            if (
              step.requireInjury &&
              evidence.completedAttempt &&
              (!evidence.injuryObserved || !evidence.participantIncluded)
            )
              throw new EpisodeBlocked(
                'The single native attack did not produce the required participant-observed injury.',
              );
            complete =
              complete &&
              ((step.completeBeforeResponse === false && !step.requireInjury) ||
                evidence.completedAttempt);
          }
          if (complete) {
            observation['terminalDecision'] = terminal ?? null;
            if (current.run?.prepared)
              observation['uninvokedPrepared'] = {
                id: current.run.prepared.id,
                stageId: current.run.prepared.stageId,
                kind: current.run.prepared.kind,
                purpose: current.run.prepared.purpose,
                reason: 'Declared phase completion observed before auxiliary continuation.',
              };
            await api!.operation({ kind: 'controlRun', action: 'hold' });
            break;
          }
          if (current.run?.prepared) {
            if ((await nativeCallCount()) >= spec.limits.maximumCalls)
              throw new EpisodeBlocked('The original total-call allowance is exhausted.');
            const observed = await inspectHeld(api!, current);
            const stage: StageObservation = {
              runId: current.run.id,
              stageId: observed.detail.id,
              nativeAttemptId: observed.detail.nativeAttemptId,
              kind: observed.held.kind,
              purpose: observed.held.purpose,
              requestSha256: hash(JSON.stringify(observed.input)),
              continuedAt: new Date().toISOString(),
            };
            result.stages.push(stage);
            continued++;
            await saveJson(join(output, 'prepared', `${continued}.json`), {
              phase: label,
              ...stage,
              input: observed.input,
            });
            await saveJson(marker, result);
            controller.signal.throwIfAborted();
            await api!.operation(
              { kind: 'continueOriginal', handleId: observed.held.id },
              current,
              controller.signal,
            );
            continue;
          }
          if (!until && !movement?.movement && !attack && !current.run?.prepared)
            throw new EpisodeBlocked(
              step?.kind === 'wait'
                ? `The native wait held after ${waitElapsed.toFixed(3)} of ${step.seconds} requested seconds.`
                : 'The native interval held without a new terminal focal decision.',
            );
          const renewed = await phasePolicy();
          if (!renewed) break;
          await api!.operation({ kind: 'applySettings', settings: { policy: renewed } });
          await api!.operation({ kind: 'controlRun', action: 'continue' });
        }
        observation['endedSim'] = (await api!.refresh()).gameTime;
        observation['endedAt'] = new Date().toISOString();
        await saveJson(join(output, 'phases.json'), phases);
      };
      const prelude = spec.protocol.prelude;
      if (prelude) {
        await phase('independent-work', undefined, async () => {
          const work = await nativeSteps.work(focal);
          return (
            object(work) &&
            work['type'] === (prelude.actionType ?? nativeSteps.type('independentWork')) &&
            typeof work['totalSeconds'] === 'number' &&
            work['totalSeconds'] > 0
          );
        });
        const work = await nativeSteps.work(focal);
        if (!object(work)) throw new EpisodeBlocked('Required independent work was not chosen.');
        const workId = work['id'];
        if (prelude.partialProgressRequired)
          await phase('independent-progress', undefined, async () => {
            const current = await nativeSteps.work(focal);
            return (
              object(current) &&
              current['id'] === workId &&
              typeof current['totalSeconds'] === 'number' &&
              typeof current['remainingSeconds'] === 'number' &&
              current['remainingSeconds'] < current['totalSeconds']
            );
          });
        if (prelude.kind === 'requiredCompletedIndependentWork') {
          const before = new Set((await api.fields(focal, 'history')).map((field) => field.id));
          const startedSim = (await api.refresh()).gameTime;
          await phase('independent-completion', undefined, async () => {
            const current = await nativeSteps.work(focal);
            if (object(current) && current['id'] === workId) return false;
            return !!(await observeNativeOutcome(nativeSteps, {
              actorId: focal,
              type: prelude.completedEventType ?? nativeSteps.type('independentWorkOutcome'),
              startedSim,
              priorHistoryIds: before,
            }));
          });
        }
      }
      await phase('opening', spec.protocol.opening);
      for (const [index, step] of spec.protocol.changes.entries())
        await phase(`change-${index + 1}`, step);
      if ((await api.refresh()).gameTime < startSim + spec.limits.simulationSeconds)
        await phase(
          'native-continuation',
          undefined,
          async () => (await api!.refresh()).gameTime >= startSim + spec.limits.simulationSeconds,
        );
      result.status = 'observed';
      result.protocol = {
        mechanismControl: spec.protocol.mechanismControl,
        continuedCalls: continued,
        nativeCalls: await nativeCallCount(),
        qualityEvaluated: false,
        phases,
      };
      // Keep the primary native/model outcome frozen before an optional recipient
      // follow-up. Acceptance uses an actually offered command and no inference.
      await saveJson(join(output, 'primary-outcome.json'), {
        capturedAt: new Date().toISOString(),
        workspace: await api.refresh(),
        phases,
        stages: result.stages,
      });
      if (spec.protocol.postlude) {
        const postlude = spec.protocol.postlude;
        result.protocol = {
          ...(result.protocol as Record<string, unknown>),
          postlude: await acceptObservedOffer(
            nativeSteps,
            postlude.actor,
            postlude.maximumNativeWallSeconds,
          ),
        };
      }
    }
  } catch (error) {
    result.status = controller.signal.aborted
      ? 'cancelled'
      : error instanceof EpisodeBlocked || error instanceof SimulationAllowanceReached
        ? 'blocked'
        : 'failed';
    result.reason = error instanceof Error ? error.message : String(error);
  } finally {
    if (spec.runtimeTarget === 'lab' || workStarted === undefined) {
      if (workStarted === undefined) result.timings.preparationMs = performance.now() - started;
      else result.timings.workMs = performance.now() - workStarted;
    }
    const collected = performance.now();
    if (admission) await saveJson(join(output, 'admission.json'), admission.stop());
    if (spec.runtimeTarget === 'lab' && api && host) {
      try {
        try {
          await api.operation({ kind: 'controlRun', action: 'stop' });
        } catch (error) {
          result.provenance['stopFailure'] = error instanceof Error ? error.message : String(error);
        }
        // The held clock can leave accepted native events in memory; persist their
        // existing personal accounts before collection and the isolated runtime closes.
        const labRuntime = host.cognitionLab?.runtime;
        if (!labRuntime) throw new Error('The Lab runtime is unavailable for durable collection.');
        await labRuntime.service.whenDurable();
        result.runIds = [...api.runIds];
        // Captures can finish without operator continuation (embeddings, auxiliary
        // work or failed admission). Include every native call owner, not only held calls.
        const byId = new Map(result.stages.map((stage) => [stage.stageId, stage]));
        for (const runId of result.runIds) {
          for (const header of await api.stages(runId)) {
            const detail = await api.json<CapturedStage>(
              `/runs/${runId}/stages/${header.id}?section=input`,
            );
            let observation = byId.get(detail.id);
            if (!observation) {
              observation = {
                runId,
                stageId: detail.id,
                kind: detail.kind,
                purpose: detail.purpose,
              };
              result.stages.push(observation);
              byId.set(detail.id, observation);
            }
            observation.nativeAttemptId = detail.nativeAttemptId;
            observation.status = detail.status;
            if (observation.nativeAttemptId) {
              const receipt = await host.cognitionLab?.runtime.service.store.attemptReceipt(
                observation.nativeAttemptId,
              );
              if (receipt) observation.receipt = receipt;
            }
          }
        }
        result.exports = await api.exportRuns(host.config.cognitionLab.storageAllowanceBytes);
      } catch (error) {
        result.provenance['collectionFailure'] =
          error instanceof Error ? error.message : String(error);
        if (result.status === 'observed' || result.status === 'prepared')
          result.status = 'collection-failed';
      }
    }
    const accounted = new Set<string>();
    for (const observation of result.stages) {
      const receipt = observation.receipt;
      if (!receipt) {
        if (observation.nativeAttemptId) result.cost.missingReceipts++;
        continue;
      }
      if (accounted.has(receipt.requestId)) continue;
      accounted.add(receipt.requestId);
      if (receipt.completionUncertain) result.cost.uncertainAttempts++;
      if (receipt.providerReportedCostUsd !== undefined)
        result.cost.providerReportedUsd += receipt.providerReportedCostUsd;
      else if (receipt.estimatedCostUsd !== undefined)
        result.cost.estimatedUsd += receipt.estimatedCostUsd;
      const cost = receipt.providerReportedCostUsd ?? receipt.estimatedCostUsd;
      if (cost !== undefined) result.cost.labReportedKnownUsd += cost;
      else if (receipt.dispatched) result.cost.unknownCostAttempts++;
    }
    result.timings.collectionMs += performance.now() - collected;
    const cleanup = performance.now();
    const cleanupFailures = (result.provenance['cleanupFailures'] as string[] | undefined) ?? [];
    const close = async (operation: () => Promise<unknown>) => {
      try {
        await operation();
      } catch (error) {
        cleanupFailures.push(error instanceof Error ? error.message : String(error));
      }
    };
    await close(async () => api?.close());
    await close(async () => (host ? host.close() : store?.close()));
    await close(async () => shared?.dispose());
    // Keep native files available for fenced recovery if collection or closure
    // failed. Never replace an incomplete export with a successful cleanup.
    const capturedRuntime = runtimeStorage;
    if (
      capturedRuntime &&
      cleanupFailures.length === 0 &&
      !result.provenance['collectionFailure'] &&
      !result.provenance['stopFailure']
    ) {
      await close(async () => {
        await rm(capturedRuntime.directory, { recursive: true, force: true });
        capturedRuntime.retained = false;
      });
    }
    if (cleanupFailures.length) {
      result.provenance['cleanupFailures'] = cleanupFailures;
      result.status = 'cleanup-failed';
    }
    result.timings.cleanupMs += performance.now() - cleanup;
    result.provenance['finishedAt'] = new Date().toISOString();
    result.provenance['allDispatchedCalls'] = result.stages.filter(
      (stage) => stage.receipt?.dispatched,
    ).length;
    result.provenance['candidateInvocations'] = result.stages.filter(
      (stage) => stage.receipt?.dispatched && stage.receipt.requestedModel === spec.model.model,
    ).length;
    await saveJson(marker, result);
    await rm(lock, { force: true });
    process.removeListener('SIGTERM', cancel);
    process.removeListener('SIGINT', cancel);
  }
  return result;
}

export async function main(args = process.argv.slice(2)) {
  const o = options(args);
  if (o.recover) {
    const original = JSON.parse(
      await readFile(join(o.output, 'episode.json'), 'utf8'),
    ) as EpisodeResult;
    const spec = parseEpisodeSpec(JSON.parse(await readFile(o.input, 'utf8')));
    if (original.id !== spec.id || original.specSha256 !== hash(await readFile(o.input)))
      throw new Error('Recovery requires the original frozen episode.');
    const client = await loadJobExecutionClient(undefined, {
      judge: spec.judgmentModel,
      ...(spec.embeddingMode === 'normal'
        ? { embed: spec.embeddingModel ?? 'text-embedding-3-small' }
        : {}),
    });
    const observations = [];
    try {
      for (const stage of original.stages)
        if (stage.nativeAttemptId)
          observations.push({
            nativeAttemptId: stage.nativeAttemptId,
            receipt: await client.observe(stage.nativeAttemptId),
          });
      await saveJson(join(o.output, 'recovery.json'), {
        observedAt: new Date().toISOString(),
        episodeId: original.id,
        originalStatus: original.status,
        observations,
        newModelSubmissions: 0,
      });
    } finally {
      await client.dispose();
    }
    console.log(
      JSON.stringify({
        id: original.id,
        status: 'observed-original-receipts',
        newModelSubmissions: 0,
      }),
    );
    return;
  }
  const result = await runEpisode(o.input, o.output, o.mode);
  console.log(
    JSON.stringify({
      id: result.id,
      status: result.status,
      timings: result.timings,
      cost: result.cost,
    }),
  );
  if (!['prepared', 'observed'].includes(result.status)) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  await main();
