import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { executeCommand } from '../packages/domain/src/index.js';
import { WorldService } from '../apps/server/src/world-service.js';
import { SqliteStore } from '../apps/server/src/store.js';
import { readConfig } from '../apps/server/src/config.js';
import { projectView } from '../apps/server/src/view.js';
import { performanceSnapshot } from '../apps/server/src/performance.js';
import { parseScenario, populateScenario } from './performance/scenario.js';

const [destination, durationArgument = '60', peopleArgument = '10', rateArgument = '8', ...extra] =
  process.argv.slice(2);
function integer(value: string, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < min || n > max)
    throw new Error(`Expected an integer from ${min} to ${max}.`);
  return n;
}
if (!destination || extra.length)
  throw new Error(
    'Usage: node --import tsx scripts/stress-hearing.ts NEW_OUTPUT_DIRECTORY [SECONDS=60] [PEOPLE=10] [SPEECH_PER_SECOND=8]',
  );
const seconds = integer(durationArgument, 1, 120);
const people = integer(peopleArgument, 0, 100);
const rate = integer(rateArgument, 0, 20);
const directory = resolve(destination);
// Never open an existing/live world. This run owns one disposable zero-provider database.
await mkdir(directory, { mode: 0o700 });
const config = readConfig({
  AI_BUDGET_USD: '0',
  WORLD_SEED: '73',
  OPEN_LEGEND_DATA_DIR: directory,
});
const store = new SqliteStore(config.databasePath);
const service = new WorldService(store, config);
let heartbeat: ReturnType<typeof setInterval> | undefined;
let heartbeatWork: Promise<unknown> | undefined;
let failure: unknown;
let stopping = false;
let speechTimer: ReturnType<typeof setTimeout> | undefined;
let speechWork: Promise<void> | undefined;
const speechMs: number[] = [],
  tickMs: number[] = [],
  projectionMs: number[] = [],
  speechLatenessMs: number[] = [];
const summarize = (values: number[]) => {
  values.sort((a, b) => a - b);
  return {
    count: values.length,
    totalMs: values.reduce((sum, value) => sum + value, 0),
    medianMs: values.length ? values[Math.floor(values.length * 0.5)] : null,
    p95Ms: values.length ? values[Math.ceil(values.length * 0.95) - 1] : null,
    maximumMs: values.at(-1) ?? null,
  };
};
try {
  await service.ready;
  await service.control({ paused: false, speed: 8, clientId: 'hearing-profile' });
  const scenario = parseScenario({
    seed: 73,
    people,
    animals: 20,
    layout: 'scattered',
    objects: [{ count: 300, name: 'Observation object', properties: ['rigid'] }],
  });
  const setup = await service.transition((input) => {
    const world = populateScenario(structuredClone(input), scenario);
    return {
      world,
      events: world.events.slice(input.events.length),
      outcome: { ok: true, code: 'populated', message: 'Disposable profiling population.' },
    };
  });
  if (!setup.ok) throw new Error(setup.message);
  const speakers = Object.values(service.world.entities)
    .filter((entity) => entity.actor?.controller === 'npc' && entity.actor.capabilities?.speech)
    .map((entity) => entity.id);
  if (rate && !speakers.length) throw new Error('The scenario has no native speakers.');
  heartbeat = setInterval(() => {
    if (heartbeatWork) return;
    heartbeatWork = service
      .setPresence('hearing-profile', true)
      .catch((error: unknown) => {
        failure = error;
      })
      .finally(() => {
        heartbeatWork = undefined;
      });
  }, 2000);
  const start = performance.now(),
    initialTime = service.world.simTime;
  const deadline = start + seconds * 1000;
  const scheduledUtterances = seconds * rate;
  let previous = start,
    accepted = 0,
    attempted = 0,
    views = 0,
    encodedBytes = 0;
  // A separate producer may enqueue speech while tick() drains already-due native work.
  // Keep one request in flight, report unmet demand, and never hide overload with a lower rate.
  const scheduleSpeech = () => {
    if (stopping || !rate || failure || attempted >= scheduledUtterances || performance.now() >= deadline)
      return;
    const due = start + (attempted * 1000) / rate;
    speechTimer = setTimeout(
      () => {
        speechTimer = undefined;
        if (performance.now() >= deadline) return;
        const index = attempted++;
        const at = performance.now();
        speechLatenessMs.push(Math.max(0, at - due));
        speechWork = service
          .transition((world) =>
            executeCommand(world, {
              id: `hearing-profile-${index}`,
              type: 'say',
              actorId: speakers[index % speakers.length]!,
              text: `Observation ${index}: We can meet near the trees after dinner and decide where to build our shelter together.`,
              volume: (['whisper', 'normal', 'shout'] as const)[index % 3],
            }),
          )
          .then((result) => {
            if (!result.ok) throw new Error(result.message);
            speechMs.push(performance.now() - at);
            accepted++;
          })
          .catch((error: unknown) => {
            failure = error;
          })
          .finally(() => {
            speechWork = undefined;
            scheduleSpeech();
          });
      },
      Math.max(0, due - performance.now()),
    );
  };
  scheduleSpeech();
  console.error('hearing profile: native simulation, disk commits and full public views');
  while (performance.now() < deadline) {
    if (failure) throw failure;
    const turn = performance.now();
    const tickAt = performance.now();
    await service.tick((tickAt - previous) / 1000, 0);
    previous = tickAt;
    tickMs.push(performance.now() - tickAt);
    const viewAt = performance.now();
    encodedBytes += Buffer.byteLength(JSON.stringify(await projectView(service)));
    projectionMs.push(performance.now() - viewAt);
    views++;
    if (service.storageError) throw new Error(service.storageError);
    const remaining = 50 - (performance.now() - turn);
    if (remaining > 0) await new Promise((done) => setTimeout(done, remaining));
  }
  stopping = true;
  if (speechTimer) clearTimeout(speechTimer);
  await speechWork;
  // Account the final admitted interval; include the drain/flush in measured wall time.
  await service.tick((performance.now() - previous) / 1000, 0);
  await service.flush();
  if (failure) throw failure;
  const wallMs = performance.now() - start;
  const simulatedSeconds = service.world.simTime - initialTime;
  const report = {
    node: process.version,
    seconds,
    people,
    entities: Object.keys(service.world.entities).length,
    speakers: speakers.length,
    requestedSpeed: 8,
    scheduledUtterances,
    attemptedUtterances: attempted,
    unattemptedUtterances: scheduledUtterances - attempted,
    acceptedUtterances: accepted,
    wallMs,
    simulatedSeconds,
    effectiveSpeed: (simulatedSeconds * 1000) / wallMs / config.baseRatio,
    views,
    encodedBytes,
    speech: summarize(speechMs),
    speechLateness: summarize(speechLatenessMs),
    ticks: summarize(tickMs),
    projection: summarize(projectionMs),
    heapBytes: process.memoryUsage().heapUsed,
    storageError: service.storageError,
    metrics: performanceSnapshot(),
  };
  await writeFile(resolve(directory, 'report.json'), JSON.stringify(report, null, 2), {
    flag: 'wx',
    mode: 0o600,
  });
  console.log(JSON.stringify(report, null, 2));
} finally {
  // Stop producers before draining their last admitted operation and closing the owned store.
  if (speechTimer) clearTimeout(speechTimer);
  stopping = true;
  await speechWork;
  if (heartbeat) clearInterval(heartbeat);
  await heartbeatWork;
  await store.close();
}
