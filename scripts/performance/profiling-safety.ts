/** Focused, opt-in correctness replay for profiling changes. This is never part
 * of a timed opening or a test-suite import. The caller owns the disposable
 * database, capture selection and complete close/reopen lifecycle. */
import type {
  AiClient,
  AiReceipt,
  AiResult,
  GenerateRequest,
  JudgeRequest,
  JudgeValue,
} from '@open-legend/ai';
import type { WorldService } from '../../apps/server/src/world-service.js';
import type { Command, WorldState } from '../../packages/domain/src/types.js';
import type { AiDirector } from '../../apps/server/src/ai-director.js';
import {
  bodyProfile,
  entityGet,
  entityValues,
  executeCommand,
  initializePerception,
  spatialMap,
  spawnWorldEntity,
  worldPosition,
  worldSupport,
} from '../../packages/domain/src/index.js';
import {
  currentReceivedObservations,
  captureEvidenceCut,
  evidenceCutEligible,
} from '../../packages/domain/src/perception-evidence.js';
import {
  currentBodySubject,
  observerName,
} from '../../packages/domain/src/worlds/base/knowledge.js';
import { canStand, canWalkSegment, type SurfacePoint } from '@open-legend/spatial';
import { editWorld } from '../../tests/fixtures/service.js';
import { decisionFixtureResult } from '../../tests/fixtures/actor-response.js';
import { canonicalReplay } from './profiling-qualification.js';

export interface SafetyCheck {
  name: string;
  passed: boolean;
  detail?: unknown;
}
export interface SafetyResult {
  checks: SafetyCheck[];
  replay: unknown;
  rawReplay?: unknown;
  referenceWitness?: unknown;
}
function check(checks: SafetyCheck[], name: string, passed: boolean, detail?: unknown): void {
  checks.push({ name, passed, ...(detail === undefined ? {} : { detail }) });
  if (!passed)
    throw new Error(
      `Profiler safety failed: ${name}${detail === undefined ? '' : ` (${JSON.stringify(detail)})`}`,
    );
}

/** These real functions are exact source-patcher bindings in the correctness
 * capture only. No hand-written alternate measurement wrapper hides a bug in
 * the generated probes. */
export function safetySync<T>(value: T, failure?: Error): T {
  if (failure) throw failure;
  return value;
}
export async function safetyAsync(
  order: string[],
  failure?: Error,
  returned?: Promise<string[]>,
): Promise<string[]> {
  order.push('entered');
  try {
    await Promise.resolve();
    order.push('resumed');
    if (failure) await Promise.reject(failure);
    async function* values() {
      try {
        yield 1;
        yield 2;
      } finally {
        order.push('iterator-closed');
      }
    }
    for await (const value of values()) {
      order.push(`value:${value}`);
      break;
    }
    return returned ?? order;
  } finally {
    order.push('finally');
  }
}
export function* safetyDelegated(order: string[]): Generator<number, number, unknown> {
  try {
    order.push('delegate-entered');
    yield 2;
    return 4;
  } finally {
    order.push('delegate-closed');
  }
}
export function* safetyGenerator(order: string[]): Generator<number, number, unknown> {
  try {
    const received = yield 1;
    order.push(`next:${String(received)}`);
    const result = yield* safetyDelegated(order);
    order.push(`delegate-result:${result}`);
    return 3;
  } finally {
    order.push('closing');
    yield 9;
    order.push('closed');
  }
}
export async function runMeasurementSafetySpecimens(): Promise<SafetyResult> {
  const checks: SafetyCheck[] = [],
    value = { identity: 'same-object' },
    failure = new Error('same-error');
  check(checks, 'synchronous return identity', safetySync(value) === value);
  let caught: unknown;
  try {
    safetySync(value, failure);
  } catch (error) {
    caught = error;
  }
  check(checks, 'synchronous throw identity', caught === failure);
  const normal: string[] = [],
    promise = safetyAsync(normal);
  // Compare the caller's actual continuation against a fixed microtask chain.
  // An extra async wrapper can leave the function's own order unchanged while
  // moving its caller later; the complete replay must expose that distinction.
  let competing = Promise.resolve();
  for (let index = 0; index < 16; index++)
    competing = competing.then(() => {
      normal.push(`competing-microtask:${index}`);
    });
  const result = await promise;
  normal.push('caller-resumed');
  await competing;
  check(
    checks,
    'async return and for-await close',
    result === normal &&
      normal.includes('iterator-closed') &&
      normal.indexOf('finally') < normal.indexOf('caller-resumed'),
  );
  const returned: string[] = [],
    returnedValue: string[] = ['returned-promise-value'];
  check(
    checks,
    'async returned native promise preserves result identity',
    (await safetyAsync(returned, undefined, Promise.resolve(returnedValue))) === returnedValue,
  );
  const rejected: string[] = [];
  caught = undefined;
  try {
    await safetyAsync(rejected, failure);
  } catch (error) {
    caught = error;
  }
  check(checks, 'async rejection and finally', caught === failure && rejected.at(-1) === 'finally');
  const completed: string[] = [],
    iterator = safetyGenerator(completed);
  const steps = [iterator.next(), iterator.next('sent'), iterator.next(), iterator.next()];
  check(
    checks,
    'delegated generator chronology',
    JSON.stringify(steps) ===
      JSON.stringify([
        { value: 1, done: false },
        { value: 2, done: false },
        { value: 9, done: false },
        { value: 3, done: true },
      ]) &&
      completed.includes('next:sent') &&
      completed.includes('delegate-result:4'),
  );
  const cancelled: string[] = [],
    cancel = safetyGenerator(cancelled);
  const cancelSteps = [cancel.next(), cancel.next('sent'), cancel.return(7), cancel.next()];
  check(
    checks,
    'return forwards through yielding finally',
    JSON.stringify(cancelSteps) ===
      JSON.stringify([
        { value: 1, done: false },
        { value: 2, done: false },
        { value: 9, done: false },
        { value: 7, done: true },
      ]) && cancelled.at(-1) === 'closed',
  );
  const thrown: string[] = [],
    abrupt = safetyGenerator(thrown);
  const throwSteps = [abrupt.next(), abrupt.next('sent'), abrupt.throw(failure)];
  caught = undefined;
  try {
    abrupt.next();
  } catch (error) {
    caught = error;
  }
  check(
    checks,
    'throw forwards through yielding finally',
    caught === failure && thrown.at(-1) === 'closed' && throwSteps[2]?.value === 9,
  );
  return {
    checks,
    replay: {
      normal,
      returned,
      returnedValue,
      rejected,
      steps,
      completed,
      cancelSteps,
      cancelled,
      throwSteps,
      thrown,
    },
  };
}

export interface ProfilerSafetyHost {
  referenceWitness: import('./profiling-reference-witness.js').ReferenceWitness;
  service: WorldService;
  /** Settle and close every owner, reopen the same current-format database,
   * reacquire the same local control, and return the actual new service. */
  reopen(): Promise<WorldService>;
  /** Rebind the composition root's one injected transport, never construct a
   * second director or fall back to an external provider. */
  installClient(client: AiClient): AiDirector;
  now?: () => number;
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function receipt(requestId: string, provider: AiReceipt['provider']): AiReceipt {
  return {
    requestId,
    provider,
    requestedModel: 'profiler-supplied-response',
    model: 'profiler-supplied-response',
    modelVersionStatus: 'reported',
    contextDigest: 'controlled-profiler-correctness',
    startedAt: new Date(0).toISOString(),
    completedAt: new Date(0).toISOString(),
    latencyMs: 0,
    dispatched: false,
    completionUncertain: false,
    estimatedCostUsd: 0,
  };
}
function supplied<T>(requestId: string, provider: AiReceipt['provider'], value: T): AiResult<T> {
  return { outcome: 'value', value, receipt: receipt(requestId, provider) };
}
function judgment(request: JudgeRequest): AiResult<JudgeValue> {
  const answers: JudgeValue['answers'] = {};
  for (const [id, question] of Object.entries(request.questions)) {
    if (question.type === 'noul') {
      answers[id] = { type: 'noul', noul: 0.1 };
      continue;
    }
    if (question.type !== 'choice')
      throw new Error('Profiler safety received an unsupported judgment kind.');
    const preferred: Record<string, string> = {
      route: 'level2',
      reflection: 'no',
      possibleAction: 'no',
      admissibility: 'supported',
    };
    const choice =
      preferred[id] ??
      (Object.hasOwn(question.criteria, 'no') ? 'no' : Object.keys(question.criteria)[0]);
    if (!choice || !Object.hasOwn(question.criteria, choice))
      throw new Error(`Profiler supplied choice is not offered: ${id}`);
    answers[id] = {
      type: 'choice',
      choice,
      confidence: 1,
      probabilities: Object.fromEntries(
        Object.keys(question.criteria).map((key) => [key, Number(key === choice)]),
      ),
    };
  }
  return supplied(request.requestId, 'jev', { answers });
}
function spoken(text: string) {
  return {
    queries: null,
    operations: [
      {
        localId: 'reply',
        requiresAccepted: [],
        note: null,
        name: null,
        appraise: null,
        observe: null,
        remember: null,
        talk: { text, addresseeEntityId: null, selfIntroduction: null, volume: 'normal' },
        act: null,
        goal: null,
        plan: null,
        think: null,
      },
    ],
  };
}
function requestContent(request: JudgeRequest | GenerateRequest) {
  const { signal: _signal, deadlineMs: _deadline, ...content } = request;
  if ('onProgress' in content) delete content.onProgress;
  return canonicalReplay(content);
}
function received(world: WorldState, actorId: string) {
  return { actorId, at: world.simTime, ...currentReceivedObservations(world, actorId) };
}
/** Preparation only. Search actual installed geometry rather than assume a
 * tile, height or coordinate is walkable in the selected world. */
function nearbyPoints(world: WorldState, actorId: string): SurfacePoint[] {
  const actor = entityGet(world.entities, actorId)!,
    origin = worldPosition(actor),
    surfaceId = worldSupport(actor);
  if (!surfaceId) throw new Error('Profiler safety needs a supported controlled actor.');
  const result: SurfacePoint[] = [],
    bodies = entityValues(world.entities)
      .filter((entity) => entity.placement?.mode === 'world')
      .map((entity) => worldPosition(entity));
  for (const radius of [2, 3, 4, 5, 6, 7, 8])
    for (let turn = 0; turn < 8; turn++) {
      const point = {
        x: origin.x + Math.cos((turn * Math.PI) / 4) * radius,
        y: origin.y,
        z: origin.z + Math.sin((turn * Math.PI) / 4) * radius,
        surfaceId,
      };
      if (
        !canStand(spatialMap(world), point, bodyProfile(actor)) ||
        !canWalkSegment(spatialMap(world), { ...origin, surfaceId }, point, bodyProfile(actor)) ||
        bodies.some((other) => Math.hypot(point.x - other.x, point.z - other.z) < 0.9) ||
        result.some((other) => Math.hypot(point.x - other.x, point.z - other.z) < 1)
      )
        continue;
      result.push(point);
      if (result.length === 3) return result;
    }
  throw new Error('Profiler safety could not prepare three nearby supported points.');
}

/** Compare full content only outside speed measurement. This deliberately
 * supplied response proves pipeline preservation, never autonomous model quality.
 * The host must remain tick:false: all progression below is explicit. */
export async function runProfilerSafety(host: ProfilerSafetyHost): Promise<SafetyResult> {
  let service = host.service;
  await service.ready;
  const checks: SafetyCheck[] = [],
    inputs: unknown[] = [],
    requests: Array<{ kind: 'judge' | 'generate'; content: unknown }> = [],
    effects: unknown[] = [],
    cuts: unknown[] = [],
    unplannedCalls: string[] = [];
  const actorId = service.localScope.actorId;
  if (!actorId) throw new Error('Profiler safety requires actual acquired local control.');
  const config = service.config;
  const previous = {
    budgetUsd: config.budgetUsd,
    jevKey: config.jevKey,
    llmKey: config.llmKey,
    macrofoldKey: config.macrofoldKey,
    embeddingKey: config.embeddingKey,
    jevOnly: config.jevOnly,
    decisionEscalation: config.decisionEscalation,
  };
  // Synthetic admission is scoped to this injected-client replay. No adapter is
  // constructed from these keys, and embeddings/escalation remain unavailable.
  Object.assign(config, {
    budgetUsd: 1,
    jevKey: 'profiler-fixture-only',
    llmKey: 'profiler-fixture-only',
    macrofoldKey: '',
    embeddingKey: '',
    jevOnly: false,
    decisionEscalation: { ...config.decisionEscalation, mode: 'off', origins: [], reasons: [] },
  });
  let director: AiDirector | undefined;
  let pending: ReturnType<typeof deferred<GenerateRequest>> | undefined;
  let release: ReturnType<typeof deferred<AiResult<unknown>>> | undefined;
  const generationAllowance = { remaining: 0 };
  const execute = async (command: Command) => {
    inputs.push(command);
    const outcome = await service.transition((world) => executeCommand(world, command));
    check(checks, `native command ${command.id}`, outcome.ok, { code: outcome.code });
    effects.push({ command: command.id, code: outcome.code, at: service.world.simTime });
    return outcome;
  };
  const advance = async (destination: SurfacePoint) => {
    const deadline = performance.now() + 10000;
    // Offer one fixed 30-game-second prefix, then only drain that debt while
    // the real navigation owner completes. Waiting never admits extra time.
    await service.tick(30 / service.config.baseRatio, 0, { drain: true });
    while (
      (entityGet(service.world.entities, actorId)?.actor?.action ||
        service.pendingSimSeconds >= 1e-6) &&
      performance.now() < deadline
    ) {
      await new Promise<void>((done) => setTimeout(done, 10));
      await service.tick(0, 0, { drain: true });
    }
    check(
      checks,
      'movement completes through native progression',
      !entityGet(service.world.entities, actorId)?.actor?.action &&
        service.pendingSimSeconds < 1e-6,
    );
    const position = worldPosition(entityGet(service.world.entities, actorId)!);
    check(
      checks,
      'movement reaches the supported destination',
      Math.hypot(
        position.x - destination.x,
        position.y - destination.y,
        position.z - destination.z,
      ) < 0.5,
    );
  };
  try {
    await service.control({ paused: false });
    const points = nearbyPoints(service.world, actorId);
    const created = await service.transition((world) =>
      spawnWorldEntity(world, {
        id: 'profiler-safety-observer',
        type: 'person',
        position: points[0]!,
        person: {
          name: 'Mira',
          personality: 'Observant and reserved.',
          backstory: 'PRIVATE_OBSERVER_HISTORY',
          traitIds: [],
          initialGoals: [],
        },
      }),
    );
    check(
      checks,
      'unknown witness created through native admission',
      created.ok && typeof created.entityId === 'string',
    );
    const observerId = String(created.entityId),
      hiddenName = 'PRIVATE_UNLEARNED_NAME',
      hiddenHistory = 'PRIVATE_OTHER_HISTORY';
    const client: AiClient = {
      async judge(request) {
        requests.push({ kind: 'judge', content: requestContent(request) });
        return judgment(request);
      },
      async generate<T>(request: GenerateRequest): Promise<AiResult<T>> {
        requests.push({ kind: 'generate', content: requestContent(request) });
        if (request.task !== 'npc_response' || generationAllowance.remaining !== 1) {
          unplannedCalls.push(request.task);
          throw new Error(`Unplanned profiler safety generation: ${request.task}`);
        }
        generationAllowance.remaining = 0;
        check(
          checks,
          'permitted cognition excludes another person private history',
          !JSON.stringify(request.context).includes(hiddenHistory) &&
            !JSON.stringify(request.context).includes(hiddenName),
        );
        const result = release
          ? (pending!.resolve(request), await release.promise)
          : supplied(request.requestId, 'openai', spoken('I heard you.'));
        return decisionFixtureResult(request, result as AiResult<T>);
      },
    };
    director = host.installClient(client);
    check(
      checks,
      'the sole director uses supplied execution',
      director.executionSource === 'test-fixture',
    );
    const startPending = async (id: string, text = 'Please wait.') => {
      pending = deferred<GenerateRequest>();
      release = deferred<AiResult<unknown>>();
      generationAllowance.remaining = 1;
      const accepted = await director!.submit('chat', id, text, observerId);
      check(checks, `pending controlled response ${id} admitted`, accepted.ok && !!accepted.jobId, {
        code: accepted.code,
      });
      const request = await Promise.race([
        pending.promise,
        director!.idle().then(async () => {
          const job = await service.store.getJob(accepted.jobId!);
          throw new Error(
            `Profiler pending response ended before generation: ${job?.status ?? 'missing'}; ${job?.message ?? 'no saved reason'}`,
          );
        }),
      ]);
      return { jobId: accepted.jobId!, request };
    };
    const finishRevoked = async (held: Awaited<ReturnType<typeof startPending>>, cause: string) => {
      release!.resolve(
        supplied(held.request.requestId, 'openai', spoken('This reply must be discarded.')),
      );
      await director!.idle();
      const job = await service.store.getJob(held.jobId);
      check(
        checks,
        `${cause} rejects the actual pending supplied response`,
        job?.status === 'stale' &&
          !service.world.responseReceipts?.[held.jobId] &&
          !service.world.events.some(
            (event) => event.data?.['text'] === 'This reply must be discarded.',
          ),
        { status: job?.status },
      );
      effects.push({ phase: cause, status: job?.status });
      pending = undefined;
      release = undefined;
    };
    await editWorld(service, (world) => {
      const player = entityGet(world.entities, actorId)!;
      player.name = hiddenName;
      player.actor!.backstory = hiddenHistory;
      initializePerception(world, []);
    });
    await service.control({ paused: false });
    const subject = currentBodySubject(service.world, observerId, actorId);
    check(checks, 'unknown person receives a local subject', subject?.kind === 'individual');
    check(
      checks,
      'unknown identity does not disclose authored name',
      observerName(service.world, observerId, actorId).name !== hiddenName,
    );
    const before = received(service.world, observerId);
    check(checks, 'actual current sensory evidence exists', before.observations.length > 0);
    cuts.push({ phase: 'first', observer: before, player: received(service.world, actorId) });
    await execute({ id: 'profiler-safety-move-1', actorId, type: 'move', destination: points[1]! });
    await advance(points[1]!);
    await execute({ id: 'profiler-safety-move-2', actorId, type: 'move', destination: points[2]! });
    await advance(points[2]!);
    cuts.push({
      phase: 'moved',
      observer: received(service.world, observerId),
      player: received(service.world, actorId),
    });
    // The edited evidence is this request's actual heard trigger, so stale
    // rejection cannot pass merely by checking an unrelated synthetic cut.
    const beforeCorrection = await startPending(
      'profiler-safety-pending-correction',
      'The gate is open.',
    );
    const first = [...(service.world.experience?.awareness[observerId] ?? [])]
      .reverse()
      .find((entry) => entry.eventType === 'speech' && entry.content === 'The gate is open.');
    check(
      checks,
      'speech acquired through the listener owner',
      !!first && first.eventType === 'speech',
    );
    const acquired = [
      ...(first?.observation ? [first.observation] : []),
      ...(first?.observations ?? []),
    ];
    check(checks, 'speech cut contains actual received content', acquired.length > 0);
    const correctedCut = captureEvidenceCut(service.world, observerId, { acquired });
    check(
      checks,
      'pending evidence starts eligible',
      evidenceCutEligible(service.world, correctedCut),
    );
    await execute({
      id: 'profiler-safety-correction',
      actorId,
      type: 'say',
      targetId: observerId,
      text: 'The gate is closed.',
      volume: 'normal',
    });
    const correction = [...(service.world.experience?.awareness[observerId] ?? [])]
      .reverse()
      .find((entry) => entry.eventType === 'speech' && entry.content === 'The gate is closed.');
    check(
      checks,
      'correction receives independent evidence',
      !!correction && correction.eventId !== first!.eventId,
    );
    // The server owner also fences prepared database reads while changing the
    // domain account. A bare domain transition cannot exercise that guarantee.
    const corrected = await service.correctMemory(observerId, first!.eventId, correction!.eventId);
    check(checks, 'correction accepted by semantic owner', corrected.ok, { code: corrected.code });
    check(
      checks,
      'correction revokes the pending evidence cut',
      !evidenceCutEligible(service.world, correctedCut),
    );
    await finishRevoked(beforeCorrection, 'correction');
    const beforeForgetting = await startPending(
      'profiler-safety-pending-forgetting',
      'The gate is closed.',
    );
    const forgottenEvidence = [...(service.world.experience?.awareness[observerId] ?? [])]
      .reverse()
      .find((entry) => entry.eventType === 'speech' && entry.content === 'The gate is closed.');
    check(
      checks,
      'forgetting targets the pending response heard trigger',
      !!forgottenEvidence && forgottenEvidence.eventId !== correction!.eventId,
    );
    const remaining = [
      ...(forgottenEvidence?.observation ? [forgottenEvidence.observation] : []),
      ...(forgottenEvidence?.observations ?? []),
    ];
    const forgottenCut = captureEvidenceCut(service.world, observerId, { acquired: remaining });
    check(
      checks,
      'pending corrective evidence starts eligible',
      remaining.length > 0 && evidenceCutEligible(service.world, forgottenCut),
    );
    const forgotten = await service.forgetMemory(observerId, forgottenEvidence!.eventId);
    check(checks, 'forgetting accepted by semantic owner', forgotten.ok, { code: forgotten.code });
    check(
      checks,
      'forgetting revokes the pending evidence cut',
      !evidenceCutEligible(service.world, forgottenCut),
    );
    await finishRevoked(beforeForgetting, 'forgetting');
    cuts.push({
      phase: 'edited',
      correctedCut,
      forgottenCut,
      eligible: [
        evidenceCutEligible(service.world, correctedCut),
        evidenceCutEligible(service.world, forgottenCut),
      ],
    });
    generationAllowance.remaining = 1;
    const accepted = await director.submit(
      'chat',
      'profiler-safety-response',
      'Hello.',
      observerId,
    );
    check(checks, 'controlled response admitted', accepted.ok && !!accepted.jobId, {
      code: accepted.code,
    });
    await director.idle();
    const job = await service.store.getJob(accepted.jobId!);
    check(
      checks,
      'actual context and supplied response pipeline ran',
      requests.some((request) => JSON.stringify(request).includes('npc_response')) &&
        job?.status === 'completed',
      { status: job?.status },
    );
    const response = service.world.responseReceipts?.[accepted.jobId!];
    check(
      checks,
      'supplied response produces a native publication',
      response?.outcome.ok === true &&
        service.world.events.some((event) => event.data?.['text'] === 'I heard you.'),
      response?.outcome,
    );
    effects.push({
      phase: 'response',
      outcome: response?.outcome,
      components: response?.components,
    });
    const cancelled = await startPending('profiler-safety-cancel');
    const cancelledResult = await director.cancel(cancelled.jobId);
    check(checks, 'cancellation accepted', cancelledResult.ok);
    release!.resolve(
      supplied(cancelled.request.requestId, 'openai', spoken('This reply must be discarded.')),
    );
    await director.idle();
    const cancelledJob = await service.store.getJob(cancelled.jobId);
    check(
      checks,
      'late cancelled value has no native effects',
      cancelledJob?.status === 'cancelled' &&
        !service.world.responseReceipts?.[cancelled.jobId] &&
        !service.world.events.some(
          (event) => event.data?.['text'] === 'This reply must be discarded.',
        ),
    );
    effects.push({ phase: 'cancel', status: cancelledJob?.status });
    await director.idle();
    director = undefined;
    await service.whenDurable();
    const memoryBefore = await service.memoryContext(observerId, null, 100);
    const stateBefore = {
      simTime: service.world.simTime,
      rngState: service.world.rngState,
      position: worldPosition(entityGet(service.world.entities, actorId)!),
      observer: received(service.world, observerId),
      memory: memoryBefore,
      forgotten: service.world.experience?.forgotten[observerId],
      corrections: service.world.experience?.corrections?.[observerId],
    };
    service = await host.reopen();
    await service.ready;
    const stateAfter = {
      simTime: service.world.simTime,
      rngState: service.world.rngState,
      position: worldPosition(entityGet(service.world.entities, actorId)!),
      observer: received(service.world, observerId),
      memory: await service.memoryContext(observerId, null, 100),
      forgotten: service.world.experience?.forgotten[observerId],
      corrections: service.world.experience?.corrections?.[observerId],
    };
    check(
      checks,
      'cold restoration preserves native and personal state',
      JSON.stringify(canonicalReplay(stateBefore)) === JSON.stringify(canonicalReplay(stateAfter)),
    );
    check(
      checks,
      'cold restoration does not revive corrected/forgotten evidence',
      !evidenceCutEligible(service.world, correctedCut) &&
        !evidenceCutEligible(service.world, forgottenCut),
    );
    check(
      checks,
      'supplied transport receives exactly the planned generations',
      unplannedCalls.length === 0 &&
        generationAllowance.remaining === 0 &&
        requests.filter((request) => request.kind === 'generate').length === 4,
    );
    await service.whenDurable();
    const replay = {
      inputs,
      requests,
      effects,
      cuts,
      restored: canonicalReplay(stateAfter),
      externalCalls: 0,
      externalCostUsd: 0,
    };
    return {
      checks,
      replay: host.referenceWitness.canonicalize(replay),
      rawReplay: replay,
      referenceWitness: host.referenceWitness.snapshot(),
    };
  } finally {
    if (release)
      release.resolve({
        outcome: 'cancelled',
        reason: 'profiler_cleanup',
        receipt: receipt('profiler-cleanup', 'openai'),
      });
    try {
      await director?.idle();
    } finally {
      Object.assign(config, previous);
    }
  }
}
