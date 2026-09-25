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
const speechMs: number[] = [],
  tickMs: number[] = [],
  projectionMs: number[] = [];
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
  let previous = start,
    nextSpeech = start,
    accepted = 0,
    views = 0,
    encodedBytes = 0;
  console.error('hearing profile: native simulation, disk commits and full public views');
  while (performance.now() - start < seconds * 1000) {
    if (failure) throw failure;
    const turn = performance.now();
    if (rate && turn >= nextSpeech) {
      const at = performance.now();
      const result = await service.transition((world) =>
        executeCommand(world, {
          id: `hearing-profile-${accepted}`,
          type: 'say',
          actorId: speakers[accepted % speakers.length]!,
          text: `Observation ${accepted}: We can meet near the trees after dinner and decide where to build our shelter together.`,
          volume: (['whisper', 'normal', 'shout'] as const)[accepted % 3],
        }),
      );
      if (!result.ok) throw new Error(result.message);
      speechMs.push(performance.now() - at);
      accepted++;
      nextSpeech += 1000 / rate;
    }
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
    scheduledUtterances: seconds * rate,
    acceptedUtterances: accepted,
    wallMs,
    simulatedSeconds,
    effectiveSpeed: (simulatedSeconds * 1000) / wallMs / config.baseRatio,
    views,
    encodedBytes,
    speech: summarize(speechMs),
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
  if (heartbeat) clearInterval(heartbeat);
  await heartbeatWork;
  await store.close();
}
