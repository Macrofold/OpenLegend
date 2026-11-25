import { join } from 'node:path';
import { jsonFile, object, opening, writeJson } from './contract.js';
import type { CasePlan } from './contract.js';

type RecordValue = Record<string, unknown>;
function record(value: unknown): RecordValue {
  return value === undefined || value === null ? {} : object(value);
}
function records(value: unknown): RecordValue[] {
  return Array.isArray(value) ? value.map((item) => object(item)) : [];
}
function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
function milliseconds(value: unknown) {
  const seconds = finite(value);
  return seconds === null ? null : seconds * 1000;
}
function latency(rows: RecordValue[], began: string, ended: string) {
  const samples = rows
    .flatMap((row) => {
      const left = finite(row[began]);
      const right = finite(row[ended]);
      return left === null || right === null || right < left ? [] : [right - left];
    })
    .sort((a, b) => a - b);
  const count = samples.length;
  const middle = Math.floor(count / 2);
  return {
    count,
    omitted: rows.length - count,
    medianMs: count ? (samples[middle]! + samples[Math.floor((count - 1) / 2)]!) / 2 : null,
    meanMs: count ? samples.reduce((sum, time) => sum + time, 0) / count : null,
    p95Ms: count ? samples[Math.ceil(count * 0.95) - 1]! : null,
  };
}
function maxSample(samples: RecordValue[], field: string) {
  let peak: number | null = null;
  for (const sample of samples) {
    const value = finite(sample[field]);
    if (value !== null && (peak === null || value > peak)) peak = value;
  }
  return peak;
}
function safeCounter(value: unknown) {
  if (typeof value === 'string' && /^\d+$/.test(value)) value = Number(value);
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}
function delta(
  before: RecordValue,
  after: RecordValue,
  fields = Object.keys(before).filter((key) => key !== 'at'),
): Record<string, number | null> {
  return Object.fromEntries(
    fields.map((key) => {
      const first = safeCounter(before[key]);
      const last = safeCounter(after[key]);
      return [key, first === null || last === null || last < first ? null : last - first];
    }),
  );
}

// Scalar totals emitted by the pinned PostgreSQL wire observer. Unlike these
// totals, partialFrames is the number of frames in progress at a single cut.
const wireCounters = [
  'clientBytes',
  'serverBytes',
  'parseMessages',
  'bindMessages',
  'bindFrameBytes',
  'executeMessages',
  'simpleQueryMessages',
  'completedStatements',
  'errorResponses',
  'selectRows',
  'insertRows',
  'updateRows',
  'deleteRows',
  'transferRows',
  'dataRowPayloadBytes',
  'otherCommandCompletions',
  'startupPackets',
  'failures',
  'connections',
];

function sqlWireEvidence(start: RecordValue, end: RecordValue) {
  const startAt = finite(start.at);
  const endAt = finite(end.at);
  const durationMs = startAt !== null && endAt !== null && endAt > startAt ? endAt - startAt : null;
  const startPartialFrames = safeCounter(start.partialFrames);
  const endPartialFrames = safeCounter(end.partialFrames);
  const totals = delta(start, end, wireCounters);
  let reason: string | undefined;
  if (durationMs === null) reason = 'missing-or-unordered-wire-boundaries';
  else if (Object.values(totals).includes(null)) reason = 'missing-or-reset-wire-counters';
  else if (safeCounter(start.failures) !== 0 || safeCounter(end.failures) !== 0)
    reason = 'wire-observer-failure';
  else if (startPartialFrames !== 0 || endPartialFrames !== 0)
    reason = 'unknown-or-partial-wire-boundary';
  else if (!totals.clientBytes || !totals.serverBytes || !totals.completedStatements)
    reason = 'no-observed-wire-work';
  return {
    status: reason ? 'unavailable' : 'measured',
    reason,
    method: 'Application-only loopback frame scalars. Use the unrelayed control for latency.',
    startAt,
    endAt,
    durationMs,
    startPartialFrames,
    endPartialFrames,
    ...totals,
    queryCategoryAttribution: null,
  };
}

export async function readRaw(directory: string): Promise<RecordValue> {
  try {
    return object(await jsonFile(directory, 'result.json', 64 * 1024 ** 2));
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
    return {};
  }
}

/** Reduces retained real-caller evidence. Missing observations stay null;
 * results from the HTTP stream client do not imply rendered frames.
 */
export async function writeCaseEvidence(directory: string, plan: CasePlan, raw: RecordValue) {
  const expected = plan.expectedWork;
  const config = record(raw.configuration);
  const world = record(config.world);
  const client = record(raw.client);
  const admittedInput = records(client.input).filter((input) => input.ok === true);
  const providerProblems = record(raw.provider).problems;
  const progress = record(raw.progress);
  const commands = records(raw.commandLatencyWitnesses);
  const steadyCommands = commands.filter((command) => command.window === 'steady');
  const offered = records(client.commands).length;
  const completed = commands.filter((command) => command.ok === true).length;
  const chats = records(raw.chats);
  const conversationsCompleted = chats.filter((chat) => !!chat.persisted && !chat.failure).length;
  const heldSteeringCompleted = records(client.steeringGestures).filter((gesture) => {
    const offers = admittedInput.filter((input) => input.slot === gesture.slot);
    return ['start', 'renew', 'neutral'].every((role) =>
      offers.some((offer) => offer.role === role),
    );
  }).length;
  const cold = record(raw.coldContinuation);
  const checks = {
    fixtureCompleted: raw.completedEquivalentWork === true,
    measuredInWorker: raw.measuring === true,
    cohort:
      world.player === expected.players &&
      world.humanNpcs === expected.humanNpcs &&
      world.deer === expected.deer &&
      world.hares === expected.hares &&
      world.scenery === expected.scenery &&
      world.seed === opening.worldSeed &&
      config.nativeWorkers === 1 &&
      config.warmupSeconds === plan.warmupSeconds &&
      config.seconds === plan.measureSeconds &&
      config.saveIntervalMs === 1000 &&
      config.intentionGameSecondsPerSecond === opening.gameSecondsPerRealSecond,
    commands: offered === expected.walks && completed === expected.walks,
    streamReceivedMovement:
      commands.length === expected.walks &&
      commands.every((row) => finite(row.firstVisible) !== null),
    heldSteering: heldSteeringCompleted === expected.heldSteering,
    reactions: !!client.animalChange,
    privateEvidence: !!client.privateEvidence && !client.crossPocket,
    authorizedNpcInputs:
      conversationsCompleted === expected.conversations &&
      chats.every(
        (chat) =>
          record(chat.availability).available === true && record(chat.job).status === 'completed',
      ) &&
      Array.isArray(providerProblems) &&
      providerProblems.length === 0,
    repliesPersistedExactlyOnce:
      conversationsCompleted === expected.conversations &&
      new Set(chats.map((chat) => record(chat.persisted).id)).size === expected.conversations,
    durableCommands: raw.durableMovementReceipts === expected.walks,
    coldContinuation: cold.verified === true,
    cleanServerExit: JSON.stringify(raw.serverExit) === '[0,null]',
  };
  const actorActivity = records(raw.actorActivity);
  const internalWork = actorActivity.length
    ? Object.fromEntries(
        ['placementRevisions', 'occurrences', 'completedJobs'].flatMap((field) => {
          const values = actorActivity.map((actor) => finite(actor[field]));
          return values.every((value): value is number => value !== null)
            ? [[field, values.reduce((sum, value) => sum + value, 0)]]
            : [];
        }),
      )
    : undefined;
  const reply = latency(steadyCommands, 'at', 'completedAt');
  const stream = latency(steadyCommands, 'at', 'firstVisible');
  const durable = latency(steadyCommands, 'at', 'durableObservedAt');
  const start = record(record(raw.steady).start);
  const end = record(record(raw.steady).end);
  const sqlStart = record(start.sql);
  const sqlEnd = record(end.sql);
  const wal = (value: unknown): bigint | null => {
    if (typeof value !== 'string' || !/^[a-fA-F0-9]{1,8}\/[a-fA-F0-9]{1,8}$/.test(value))
      return null;
    const [high, low] = value.split('/');
    return (BigInt('0x' + high) << 32n) | BigInt('0x' + low);
  };
  const walStart = wal(sqlStart.wal_insert_lsn);
  const walEnd = wal(sqlEnd.wal_insert_lsn);
  const walBytes =
    walStart === null ||
    walEnd === null ||
    walEnd < walStart ||
    walEnd - walStart > BigInt(Number.MAX_SAFE_INTEGER)
      ? null
      : Number(walEnd - walStart);
  const workload = {
    completedGameSeconds: finite(progress.completedGameSeconds),
    offeredGameSeconds: finite(progress.offeredGameSeconds),
    gameProgressSource: progress.gameProgressSource ?? null,
    clockSampleLagMs: progress.clockSampleLagMs ?? null,
    achievedPercentOfIntended: finite(progress.achievedPercentOfIntended),
    worldSeed: finite(world.seed),
    ownerDebt: progress.ownerDebt ?? null,
    commandP95Ms: reply.omitted ? null : reply.p95Ms,
    commandsOffered: Array.isArray(client.commands) ? offered : null,
    commandsCompleted: Array.isArray(raw.commandLatencyWitnesses) ? completed : null,
    conversationsCompleted: Array.isArray(raw.chats) ? conversationsCompleted : null,
    heldSteeringCompleted: Array.isArray(client.steeringGestures) ? heldSteeringCompleted : null,
    checks,
    internalWork,
    latency: {
      commandReply: reply,
      firstStreamReceipt: stream,
      firstBrowserDisplay: null,
      firstDurableObservation: durable,
      coldOpen: finite(cold.wallMs),
    },
  };
  await writeJson(join(directory, 'workload.json'), workload);
  const sizeStart = safeCounter(sqlStart.database_bytes);
  const sizeEnd = safeCounter(sqlEnd.database_bytes);
  const database = {
    growthBytes: sizeStart === null || sizeEnd === null ? null : sizeEnd - sizeStart,
    boundaries: { startAt: start.observedAt ?? null, endAt: end.observedAt ?? null },
    ...delta(sqlStart, sqlEnd),
    walBytes,
    queryCategories: null,
  };
  const memorySamples = records(raw.samples);
  await writeJson(join(directory, 'resources.json'), {
    serverCpuMs: milliseconds(progress.serverCpuSeconds),
    postgresCpuMs: milliseconds(progress.postgresCpuSeconds),
    clientCpuMs: milliseconds(progress.clientCpuSeconds),
    driverCpuMs: milliseconds(progress.harnessCpuSeconds),
    launcherCpuMs: milliseconds(progress.launcherCpuSeconds),
    samplerCpuMs: null,
    wallMs: milliseconds(progress.actualSeconds),
    memory: {
      sampleCount: memorySamples.length,
      concurrentServerPostgresPeakBytes: maxSample(memorySamples, 'concurrentServerPostgresBytes'),
      concurrentAllPeakBytes: maxSample(memorySamples, 'concurrentAllBytes'),
      custody: raw.nativeCustody ?? null,
      allocationSites: {
        status: 'unsupported',
        reason: 'No independently qualified allocator sampler.',
      },
    },
    database,
  });
  await writeJson(join(directory, 'timeline.json'), {
    setup: raw.setup ?? null,
    warmup: raw.warm ?? null,
    steady: {
      startAt: start.boundaryAt ?? null,
      endAt: end.boundaryAt ?? null,
      startResourceAt: record(start.resource).at ?? null,
      endResourceAt: record(end.resource).at ?? null,
    },
    drain: record(raw.ordinaryDrain).at ?? null,
    reconnect: null,
    coldRecovery: raw.coldContinuation ?? null,
    captureWindow: raw.captureWindow ?? null,
    captured: raw.captureStop ?? null,
    serverExit: raw.serverExit ?? null,
  });
  if (plan.mode === 'sql') {
    await writeJson(
      join(directory, 'sql.json'),
      sqlWireEvidence(record(start.wire), record(end.wire)),
    );
  }
  return workload;
}
