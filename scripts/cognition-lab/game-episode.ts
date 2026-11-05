import { entityGet, canonicalJson } from '@open-legend/domain';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { setTimeout as sleep } from 'node:timers/promises';
import { join } from 'node:path';
import type { AiClient, EmbeddingClient } from '@open-legend/ai';
import type {
  CognitionLabAction,
  CognitionLabCategory,
  CognitionLabEvent,
  CognitionLabJson,
  CognitionLabReceipt,
  CognitionLabWorkspace,
} from '@open-legend/protocol';
import type { CreationHostRuntime } from '../../apps/server/src/creation-host.js';
import { createWorldRuntime, type WorldRuntime } from '../../apps/server/src/world-runtime.js';
import { CognitionLabAuthoring } from '../../apps/server/src/cognition-lab-authoring.js';
import { operatorActionCataloguePage } from '../../apps/server/src/action-catalogue.js';
import { commandInputSchema } from '../../apps/server/src/command-input-schema.js';
import { labJson } from '../../apps/server/src/cognition-lab-records.js';
import { LabCampaignClient, saveJson } from './client.js';
import { NativeSteps, EpisodeBlocked, object } from './native-steps.js';
import { PhaseDecisions } from './phase-boundary.js';
import {
  acceptObservedOffer,
  recordAdmission,
  observeSingleAttack,
  observeMovement,
  observeNativeOutcome,
} from './native-observations.js';
import type { EpisodeSpec } from './contracts.js';
import type { EpisodeResult } from './episode.js';

/** The native step vocabulary is shared with Lab episodes. Only transport/control
 * differs: observation never holds this normal runtime for a model or export. */
class GameCampaignClient extends LabCampaignClient {
  readonly authoring: CognitionLabAuthoring;
  private measuring = true;
  async finishMeasurement() {
    this.runtime.clock.stop();
    await this.runtime.clock.idle();
    await this.runtime.director.idle();
    this.measuring = false;
  }
  override async nativeCallCount() {
    const jobs = await this.runtime.service.store.recentJobs(1000);
    return (
      await Promise.all(jobs.map((job) => this.runtime.service.store.decisionAttempts(job.id)))
    ).flat().length;
  }
  override async waitBoundary(_milliseconds = 30000) {
    if (this.measuring)
      throw new EpisodeBlocked('Ordinary-game observation cannot request a Lab boundary.');
    return this.refresh();
  }
  constructor(
    readonly runtime: WorldRuntime,
    readonly template: CognitionLabWorkspace,
    readonly spec: EpisodeSpec,
    readonly host: CreationHostRuntime,
    output: string,
    readonly current: () => void,
    readonly menuBindings: ReadonlyMap<string, CognitionLabAction[]>,
  ) {
    super('http://127.0.0.1', output);
    this.authoring = new CognitionLabAuthoring(runtime.service, host.cognitionLab!.records, () => ({
      workspaceId: spec.id,
      runtimeGeneration: runtime.service.generation,
      scenarioRevision: 0,
    }));
  }
  override async refresh(): Promise<CognitionLabWorkspace> {
    const service = this.runtime.service;
    return {
      ...this.template,
      run: undefined,
      worldId: service.world.id,
      timeline: service.timelineId,
      runtimeGeneration: service.generation,
      nativeRevision: service.durable.revision,
      nativePaused: service.paused,
      participantActorIds: [service.localScope.actorId],
      gameTime: service.world.simTime,
    };
  }
  override async json<T>(path: string): Promise<T> {
    const url = new URL(path, 'http://127.0.0.1');
    const service = this.runtime.service;
    if (url.pathname.startsWith('/current/'))
      return (await this.authoring.current(
        decodeURIComponent(url.pathname.slice('/current/'.length)),
        (url.searchParams.get('category') ?? 'person') as CognitionLabCategory,
        {
          limit: 100,
          ...(url.searchParams.get('cursor') ? { cursor: url.searchParams.get('cursor')! } : {}),
          ...(url.searchParams.get('query') ? { query: url.searchParams.get('query')! } : {}),
          ...(url.searchParams.get('fieldIds')
            ? { fieldIds: JSON.parse(url.searchParams.get('fieldIds')!) as string[] }
            : {}),
        },
        service.localScope,
      )) as T;
    if (url.pathname.startsWith('/sources/'))
      return (await this.authoring.readSource(
        decodeURIComponent(url.pathname.slice('/sources/'.length)),
        service.localScope,
      )) as T;
    throw new EpisodeBlocked(`Unsupported ordinary-runtime observation ${url.pathname}.`);
  }
  override async actions(actorId: string, type: string, targetId?: string) {
    const service = this.runtime.service;
    if (this.measuring) {
      const prepared = this.menuBindings.get(JSON.stringify([actorId, type, targetId ?? null]));
      if (!prepared)
        throw new EpisodeBlocked(
          'This live menu binding was not prepared; declare an explicit native command for an option that appears later.',
        );
      // These are captured intentions, not permissions. Revalidate each exact
      // command now without holding native time or scanning a moving catalogue.
      return prepared.filter(
        (choice) =>
          service.previewOperatorCommand(
            commandInputSchema.parse(choice.command),
            actorId,
            service.localScope,
          ).ok,
      );
    }
    const values: import('@open-legend/protocol').CognitionLabAction[] = [];
    let cursor: string | undefined;
    do {
      const page = await operatorActionCataloguePage(
        service,
        { catalogue: true, ...(targetId ? { targetId } : {}) },
        actorId,
        service.localScope,
        {
          query: JSON.stringify({ type }).slice(1, -1),
          available: true,
          limit: 100,
          ...(cursor ? { cursor } : {}),
        },
      );
      for (const action of page.items)
        if (
          action.enabled &&
          action.intent.kind === 'command' &&
          action.intent.command.type === type
        )
          values.push({
            id: action.id,
            label: action.label,
            description: action.description,
            available: true,
            command: labJson(action.intent.command),
          });
      cursor = page.nextCursor;
    } while (cursor);
    return values;
  }
  override async events(kind?: string): Promise<CognitionLabEvent[]> {
    const service = this.runtime.service;
    service.assertScope(service.localScope, 'inspect');
    if (kind === 'technical') {
      const jobs = await service.store.recentJobs(1000);
      return jobs
        .filter((job) => job.kind === 'thought' || job.kind === 'chat')
        .map((job) => {
          const sourceIds = [
            ...new Set(
              [
                job.playerSpeechEventId,
                job.triggerEvidenceId,
                ...(job.stimulusEvidenceIds ?? []),
              ].filter((id): id is string => !!id),
            ),
          ];
          return {
            id: job.id,
            sourceId: job.id,
            actorId: job.request.npcId,
            sourceIds,
            actionIds: sourceIds.flatMap((id) => {
              const actionId = service.worldEvent(id)?.data?.actionId;
              return typeof actionId === 'string' ? [actionId] : [];
            }),
            kind: 'decision',
            status: job.status,
            text: job.message,
            recordedAt: job.createdAt,
            gameTime: service.world.simTime,
          };
        });
    }
    return service.world.events.map((event) => ({
      id: event.id,
      sourceId: event.id,
      actorId: event.actorId,
      gameTime: event.at,
      recordedAt: event.at,
      kind: event.type,
      status: 'committed',
      text: event.text,
      actionIds: typeof event.data?.['actionId'] === 'string' ? [event.data['actionId']] : [],
    }));
  }
  override async operation(
    value: Record<string, unknown>,
    _observed?: CognitionLabWorkspace,
    signal?: AbortSignal,
  ): Promise<CognitionLabReceipt> {
    const commandId = randomUUID(),
      service = this.runtime.service;
    await saveJson(join(this.directory, 'operations', `${commandId}.request.json`), value, true);
    signal?.throwIfAborted();
    let receipt: CognitionLabReceipt;
    if (value['kind'] === 'applySettings' && !this.measuring) {
      // Existing native acceptance runs outside primary collection, with no new
      // model allowance. Do not install a Lab clock policy in the normal runtime.
      this.runtime.service.config.budgetUsd = 0;
      receipt = { ok: true, commandId, message: 'Native-only postlude selected.' };
    } else if (value['kind'] === 'controlRun' && value['action'] === 'advanceTime') {
      const end = service.world.simTime + Number(value['durationSeconds']);
      if (!Number.isFinite(end))
        throw new EpisodeBlocked('The ordinary wait needs a finite duration.');
      while (service.world.simTime < end) {
        this.current();
        signal?.throwIfAborted();
        await sleep(25, undefined, { signal });
      }
      receipt = { ok: true, commandId, message: 'Observed native time progression.' };
    } else if (
      value['kind'] === 'submitStimulus' &&
      object(value['stimulus'] as CognitionLabJson)
    ) {
      const stimulus = value['stimulus'] as Record<string, unknown>;
      const actorId = String(stimulus['actorId']);
      const command = commandInputSchema.parse(
        stimulus['kind'] === 'say'
          ? {
              type: 'say',
              text: stimulus['text'],
              targetId: stimulus['targetId'],
              volume: stimulus['volume'],
            }
          : stimulus['command'],
      );
      const outcome: import('@open-legend/protocol').ApiResult & { sourceIds?: string[] } =
        stimulus['kind'] === 'say' &&
        actorId === service.localScope.actorId &&
        typeof stimulus['targetId'] === 'string'
          ? await this.runtime.director.submitInteractive(
              'chat',
              commandId,
              String(stimulus['text']),
              stimulus['targetId'],
              undefined,
              undefined,
              undefined,
              service.localScope,
              command.type === 'say' ? command.volume : undefined,
            )
          : await service.operatorCommand(commandId, actorId, command);
      const job = outcome.jobId ? await service.store.getJob(outcome.jobId) : undefined;
      const sourceIds = [
        ...new Set([
          ...(outcome.sourceIds ?? []),
          ...(job?.playerSpeechEventId ? [job.playerSpeechEventId] : []),
        ]),
      ];
      receipt = {
        ...outcome,
        commandId,
        actorId,
        sourceIds,
        ...(sourceIds[0] ? { sourceId: sourceIds[0] } : {}),
      };
    } else throw new EpisodeBlocked('An ordinary-game episode cannot use Lab processing controls.');
    await saveJson(join(this.directory, 'operations', `${commandId}.receipt.json`), receipt);
    if (!receipt.ok) throw new EpisodeBlocked(receipt.message);
    return receipt;
  }
}

/** Preparation uses the existing imported current-format native state. The Lab
 * runtime releases its writer before the ordinary runtime claims that same store.
 * No Lab control, actor whitelist, synthetic liveness or provider credential is passed. */
export async function runGameEpisode(
  host: CreationHostRuntime,
  api: LabCampaignClient,
  spec: EpisodeSpec,
  output: string,
  result: EpisodeResult,
  signal: AbortSignal,
  aiClient?: AiClient,
  embeddingClient?: EmbeddingClient,
  prepareOnly = false,
) {
  const preparing = performance.now();
  const lab = host.cognitionLab!;
  const template = await api.refresh();
  const selectors = new NativeSteps(api, spec);
  const menuBindings = new Map<string, CognitionLabAction[]>();
  for (const step of [spec.protocol.opening, ...spec.protocol.changes]) {
    const request = selectors.selectionRequest(step);
    if (!request || request.type === spec.protocol.nativeActionTypes?.['inspect']) continue;
    const targetId =
      typeof request.match['targetId'] === 'string' ? request.match['targetId'] : undefined;
    const key = JSON.stringify([request.actorId, request.type, targetId ?? null]);
    const selected = await selectors.choose(
      request.actorId,
      request.type,
      request.query,
      request.match,
    );
    const bindings = menuBindings.get(key) ?? [];
    if (
      !bindings.some((choice) => canonicalJson(choice.command) === canonicalJson(selected.command))
    )
      bindings.push(selected);
    menuBindings.set(key, bindings);
  }
  const previous = lab.runtime;
  await previous.service.whenDurable();
  await previous.close();
  const runtime = await createWorldRuntime({
    store: previous.service.store,
    config: previous.service.config,
    aiClient,
    embeddingClient,
    executionSource: previous.director.executionSource,
  });
  let measuredAt: number | undefined;
  let startSim = runtime.service.world.simTime;
  let preparedAt: number | undefined;
  const current = () => {
    signal.throwIfAborted();
    if (runtime.service.storageError) throw new EpisodeBlocked(runtime.service.storageError);
    if (
      measuredAt !== undefined &&
      (performance.now() - measuredAt >= spec.limits.activeWallSeconds * 1000 ||
        runtime.service.world.simTime - startSim >= spec.limits.simulationSeconds)
    )
      throw new EpisodeBlocked('The original ordinary-runtime observation allowance elapsed.');
  };
  let client: GameCampaignClient | undefined;
  let oldJobs: Set<string> | undefined;
  const phases: unknown[] = [];
  let admission: ReturnType<typeof recordAdmission>;
  let primaryCaptured = false;
  const capturePrimary = async () => {
    if (prepareOnly || measuredAt === undefined || primaryCaptured) return;
    runtime.clock.stop();
    await runtime.clock.idle();
    const primary = runtime.service.world;
    await saveJson(join(output, 'primary-outcome.json'), {
      simTime: primary.simTime,
      endedAt: new Date().toISOString(),
      phases,
      actors: Object.fromEntries(
        [...new Set(Object.values(spec.origin.actorIds))].map((id) => [
          id,
          entityGet(primary.entities, id),
        ]),
      ),
    });
    primaryCaptured = true;
  };
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  try {
    client = new GameCampaignClient(runtime, template, spec, host, output, current, menuBindings);
    const native = new NativeSteps(client, spec);
    oldJobs = new Set((await runtime.service.store.recentJobs(1000)).map((job) => job.id));
    admission = recordAdmission(runtime.director, spec.outputs.admissionTraceBytes);
    if (runtime.service.cognitionControl)
      throw new Error('Ordinary runtime unexpectedly has Lab control.');
    if (runtime.service.localScope.actorId !== spec.origin.actorIds['visitor'])
      throw new EpisodeBlocked(
        'The declared visitor must own the ordinary current player control.',
      );
    const scope = runtime.service.localScope;
    const acquired = await runtime.service.changeEmbodiment(scope, {
      id: randomUUID(),
      expectedGeneration: scope.controlGeneration,
      operation: 'acquire',
    });
    if (!acquired.ok) throw new EpisodeBlocked(acquired.message);
    await runtime.service.setConnection(runtime.service.localScope.connectionId, true);
    await runtime.service.setPresence(runtime.service.localScope.connectionId, true);
    await runtime.service.control({ paused: false });
    const population = Object.keys(runtime.service.world.minds ?? {})
      .filter((id) => {
        const actor = entityGet(runtime.service.world.entities, id)?.actor;
        return actor?.controller === 'npc' && actor.alive;
      })
      .sort();
    result.provenance['autonomousPopulation'] = population;
    if (
      spec.autonomousActorIds &&
      JSON.stringify([...new Set(spec.autonomousActorIds)].sort()) !== JSON.stringify(population)
    )
      throw new EpisodeBlocked(
        'The declared comparison population differs from the ordinary game origin.',
      );
    result.provenance['runtimeTarget'] = 'game';
    result.provenance['participants'] = [runtime.service.localScope.actorId];
    result.provenance['ordinaryClock'] = {
      baseRatio: runtime.service.config.baseRatio,
      speed: runtime.service.speed,
      processingHolds: false,
    };
    // Bind already-running prelude work before opening ordinary time. A short
    // action may finish between clock start and the observer's first paged read.
    const preparedPreludeWork = spec.protocol.prelude
      ? await native.work(native.actor('focal'))
      : undefined;
    const preludeHistory = new Set(
      spec.protocol.prelude
        ? (await client.fields(native.actor('focal'), 'history')).map((field) => field.id)
        : [],
    );
    preparedAt = performance.now();
    result.timings.preparationMs += preparedAt - preparing;
    if (prepareOnly) {
      result.status = 'prepared';
      return;
    }
    const start = runtime.service.world.simTime,
      started = performance.now();
    startSim = start;
    measuredAt = started;
    // Both timers are task-owned. A failed observer still stops the owned clock;
    // provider uncertainty stays with the existing shared execution ledger.
    const guard = setTimeout(() => runtime.clock.stop(), spec.limits.activeWallSeconds * 1000);
    heartbeat = setInterval(() => {
      void runtime.service
        .setPresence(runtime.service.localScope.connectionId, true)
        .catch(() => undefined);
    }, 10000);
    const bounded = async () => {
      signal.throwIfAborted();
      if (performance.now() - started >= spec.limits.activeWallSeconds * 1000)
        throw new EpisodeBlocked('The original active wall allowance elapsed.');
      if (runtime.service.world.simTime - start >= spec.limits.simulationSeconds)
        throw new EpisodeBlocked('The original simulation allowance elapsed.');
      // The shared worker grant enforces maxCalls before paid dispatch, across
      // focal and incidental calls. Observation does not duplicate that counter.
    };
    try {
      runtime.clock.start();
      if (spec.protocol.prelude) {
        const prelude = spec.protocol.prelude;
        let work = preparedPreludeWork;
        while (
          !object(work) ||
          work['type'] !== (prelude.actionType ?? native.type('independentWork'))
        ) {
          await bounded();
          await sleep(50, undefined, { signal });
          work = await native.work(native.actor('focal'));
        }
        const id = work['id'];
        const completed = async () => {
          const current = await native.work(native.actor('focal'));
          return (
            (!object(current) || current['id'] !== id) &&
            !!(await observeNativeOutcome(native, {
              actorId: native.actor('focal'),
              type: prelude.completedEventType ?? native.type('independentWorkOutcome'),
              startedSim: startSim,
              priorHistoryIds: preludeHistory,
            }))
          );
        };
        if (prelude.partialProgressRequired) {
          for (;;) {
            const current = await native.work(native.actor('focal'));
            if (
              object(current) &&
              current['id'] === id &&
              typeof current['remainingSeconds'] === 'number' &&
              typeof current['totalSeconds'] === 'number' &&
              current['remainingSeconds'] < current['totalSeconds']
            )
              break;
            if (!object(current) || current['id'] !== id) {
              if (prelude.kind === 'requiredCompletedIndependentWork' && (await completed())) break;
              throw new EpisodeBlocked(
                'The required ongoing work ended before its partial progress could be observed.',
              );
            }
            await bounded();
            await sleep(50, undefined, { signal });
          }
        }
        if (prelude.kind === 'requiredCompletedIndependentWork') {
          for (;;) {
            if (await completed()) break;
            await bounded();
            await sleep(50, undefined, { signal });
          }
        }
        phases.push({ prelude, workId: id, at: runtime.service.world.simTime });
      }
      for (const [index, step] of [spec.protocol.opening, ...spec.protocol.changes].entries()) {
        await bounded();
        if (step.kind === 'attack' && step.completeBeforeResponse)
          throw new EpisodeBlocked(
            'A forced completed-contact setup must be prepared in the native origin, outside ordinary live timing.',
          );
        const decisions = await PhaseDecisions.begin(client, spec.origin.actorIds['focal']!);
        const policy = {
          mode: 'oneResponse' as const,
          focalActorId: native.actor('focal'),
          autonomousActorIds: [native.actor('focal')],
          durationSeconds: spec.limits.simulationSeconds,
          maximumCalls: spec.limits.maximumCalls,
          activeWallSeconds: spec.limits.activeWallSeconds,
        };
        const attack =
          step.kind === 'attack'
            ? await observeSingleAttack(
                native,
                native.actor(step.actor),
                native.actor(step.target ?? 'focal'),
                runtime.service.world.simTime,
              )
            : undefined;
        // Keep the started phase even when its observation allowance ends before
        // completion. The original stimulus remains attributable in failure exports.
        const phase: Record<string, unknown> = {
          index,
          step,
          startedAt: runtime.service.world.simTime,
        };
        phases.push(phase);
        const movement = await native.perform(step, policy);
        phase['stimulus'] = movement?.receipt;
        await attack?.captureAction();
        if (movement?.receipt) decisions.expect(movement.receipt);
        let terminal: CognitionLabEvent | undefined;
        let arrival: Awaited<ReturnType<typeof observeMovement>> | undefined;
        if (movement?.movement && 'completion' in step && step.completion === 'arrived') {
          for (;;) {
            arrival = await observeMovement(native, movement.movement);
            phase['movement'] = arrival;
            if (arrival.complete) break;
            await bounded();
            await sleep(50, undefined, { signal });
          }
          terminal = await decisions.completed();
        } else if (step.kind !== 'wait')
          while (!(terminal = await decisions.completed())) {
            await bounded();
            await sleep(50, undefined, { signal });
          }
        const attackOutcome = await attack?.read();
        if (step.kind === 'attack' && step.requireInjury && !attackOutcome?.injuryObserved)
          throw new EpisodeBlocked(
            'The declared injury was not observed; do not repeat the attack to force it.',
          );
        Object.assign(phase, {
          terminal,
          attackOutcome,
          ...(arrival ? { movement: arrival } : {}),
          at: runtime.service.world.simTime,
        });
        await saveJson(join(output, 'phases.json'), phases);
      }
      while (runtime.service.world.simTime - start < spec.limits.simulationSeconds) {
        signal.throwIfAborted();
        if (runtime.service.storageError) throw new EpisodeBlocked(runtime.service.storageError);
        if (performance.now() - started >= spec.limits.activeWallSeconds * 1000)
          throw new EpisodeBlocked(
            'The original active wall allowance elapsed during native continuation.',
          );
        await sleep(50, undefined, { signal });
      }
      result.status = 'observed';
      result.protocol = { phases, qualityEvaluated: false, processingHolds: false };
    } finally {
      clearTimeout(guard);
      runtime.clock.stop();
    }
  } finally {
    const collecting = performance.now();
    if (preparedAt === undefined) result.timings.preparationMs += collecting - preparing;
    else if (measuredAt !== undefined) result.timings.workMs += collecting - measuredAt;
    if (heartbeat) clearInterval(heartbeat);
    runtime.clock.stop();
    try {
      // A setup failure still closes the newly claimed runtime, but cannot be
      // reported as a complete export without its original job baseline.
      const baselineJobs = oldJobs;
      if (client && baselineJobs) {
        await capturePrimary();
        await saveJson(join(output, 'phases.json'), phases);
        if (admission) await saveJson(join(output, 'admission.json'), admission.stop());
        // Settle the original admitted identities before native database export.
        // Cancellation aborts through the director; ordinary interval expiry does
        // not purchase replacement work or discard a request already in flight.
        if (signal.aborted) await runtime.director.close();
        else await client.finishMeasurement();
        if (result.status === 'observed' && !signal.aborted && spec.protocol.postlude)
          result.protocol = {
            ...(result.protocol as object),
            postlude: await acceptObservedOffer(
              new NativeSteps(client, spec),
              spec.protocol.postlude.actor,
              spec.protocol.postlude.maximumNativeWallSeconds,
            ),
          };
        await runtime.service.whenDurable();
        const jobs = (await runtime.service.store.recentJobs(1000)).filter(
          (job) => !baselineJobs.has(job.id),
        );
        const attempts = (
          await Promise.all(jobs.map((job) => runtime.service.store.decisionAttempts(job.id)))
        ).flat();
        // Retain original attempts before optional participant/export work can fail.
        for (const attempt of attempts)
          result.stages.push({
            runId: attempt.rootJobId,
            stageId: attempt.stage,
            nativeAttemptId: attempt.attemptId,
            kind: attempt.category,
            purpose: attempt.stage,
            receipt: attempt.receipt,
          });
        result.runIds = jobs.map((job) => job.id);
        const diagnostics = await runtime.service.store.diagnosticStages(
          jobs.map((job) => job.id),
          true,
        );
        await saveJson(join(output, 'game-native.json'), {
          provenance: result.provenance,
          phases,
          jobs,
          attempts,
          diagnostics,
          participants: [runtime.service.localScope.actorId],
        });
        for (const actorId of new Set(Object.values(spec.origin.actorIds))) {
          await saveJson(
            join(output, `participant-${actorId.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`),
            {
              actorId,
              body: await client.fields(actorId, 'body'),
              work: await client.fields(actorId, 'work'),
              history: await client.fields(actorId, 'history'),
            },
          );
        }
        const checkpointId = randomUUID();
        await runtime.service.createSave('Ordinary-game experiment outcome', checkpointId);
        const saves = runtime.service.store.saves;
        if (!saves) throw new EpisodeBlocked('The normal checkpoint export owner is unavailable.');
        await pipeline(
          Readable.from(saves.exportLines(runtime.service.world.id, checkpointId)),
          createWriteStream(join(output, 'game-outcome.ndjson'), { flags: 'wx', mode: 0o600 }),
        );
        result.exports.push({
          path: 'game-native.json',
          checkpoint: 'game-outcome.ndjson',
          runtimeTarget: 'game',
        });
      }
    } catch (error) {
      result.provenance['collectionFailure'] =
        error instanceof Error ? error.message : String(error);
      if (result.status === 'prepared' || result.status === 'observed')
        result.status = 'collection-failed';
    } finally {
      result.timings.collectionMs += performance.now() - collecting;
      const cleanup = performance.now();
      const closed = await Promise.allSettled([client?.close(), runtime.close()]);
      const failures = closed.flatMap((item) =>
        item.status === 'rejected' ? [String(item.reason)] : [],
      );
      if (failures.length) result.provenance['cleanupFailures'] = failures;
      result.timings.cleanupMs += performance.now() - cleanup;
    }
  }
}
