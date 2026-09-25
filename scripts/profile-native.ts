import { initializeCollisionRuntime } from '../packages/spatial/src/rapier.js';
import { populateScenario, type Scenario } from './performance/scenario.js';
import { readFile, writeFile } from 'node:fs/promises';
import { Session } from 'node:inspector/promises';
import { createHash } from 'node:crypto';
import { advanceWorld, freezeWorld, type WorldState } from '../packages/domain/src/index.js';

const [input, output, stepArgument = '180', experiment, scenarioArgument] = process.argv.slice(2);
const steps = Number(stepArgument);
if (
  !input ||
  !output ||
  !Number.isInteger(steps) ||
  steps < 1 ||
  steps > 100000 ||
  (experiment !== undefined && experiment !== '--mutable-snapshots' && experiment !== '--scenario')
)
  throw new Error(
    'Usage: pnpm exec tsx scripts/profile-native.ts SAVED_WORLD_OR_BACKUP OUTPUT.cpuprofile [STEPS=180] [--mutable-snapshots]',
  );
const scenario: Scenario | undefined =
  experiment === '--scenario' ? JSON.parse(scenarioArgument ?? 'null') : undefined;
const mutable = experiment === '--mutable-snapshots';
await initializeCollisionRuntime();
console.error('profile stage: loading/setup');
const setupAt = performance.now();
const parsed = input === '-' && scenario ? {} : JSON.parse(await readFile(input, 'utf8'));
const saved = parsed.tables?.world?.[0]?.payload;
let world: WorldState = (saved ? JSON.parse(saved) : parsed).world;
if (scenario) world = populateScenario(world, scenario);
if (!world || !Number.isFinite(world.simTime) || !world.entities || !Array.isArray(world.events))
  throw new Error('Expected a SavedWorld or backup-world.ts backup containing a world snapshot.');
world.paused = false;
const initial = {
  simTime: world.simTime,
  entities: Object.keys(world.entities).length,
  events: world.events.length,
};
// Match the server ownership boundary; the optional baseline leaves snapshots mutable.
const freezeStarted = performance.now();
if (!mutable) freezeWorld(world);
const initialFreezeMs = performance.now() - freezeStarted;
const step = () => {
  // One bounded prefix makes interval cost visible; throughput uses actual progressed time.
  world = advanceWorld(world, scenario?.intervalSeconds ?? 1, { maxIntervals: 1 }).world;
  if (!mutable) freezeWorld(world);
};
const setupMs = performance.now() - setupAt;
const warmupSteps = scenario?.warmup ?? 30;
console.error('profile stage: warmup');
for (let index = 0; index < warmupSteps; index++) {
  const before = world.simTime;
  step();
  if (world.simTime === before) break;
}
console.error('profile stage: measured steps');
const session = new Session();
session.connect();
try {
  await session.post('Profiler.enable');
  await session.post('Profiler.start');
  const durations: number[] = [];
  const simulationStartedAt = world.simTime;
  let completedSteps = 0;
  const cpuAt = process.cpuUsage();
  const started = performance.now();
  for (let index = 0; index < steps; index++) {
    const at = performance.now();
    const before = world.simTime;
    step();
    durations.push(performance.now() - at);
    // A pending Recast request advances no game time. Never report rejected/no-op
    // iterations as throughput: docs/maintainers/performance-profiling.md.
    if (world.simTime === before) break;
    completedSteps++;
  }
  const simulatedSeconds = world.simTime - simulationStartedAt;
  const totalMs = performance.now() - started;
  const cpu = process.cpuUsage(cpuAt);
  console.error('profile stage: writing results');
  const { profile } = await session.post('Profiler.stop');
  // Profiles can contain local paths. Keep them private, outside tracked evidence.
  await writeFile(output, JSON.stringify(profile), { mode: 0o600, flag: 'wx' });
  const nodes = new Map(profile.nodes.map((node) => [node.id, node.callFrame]));
  const self = new Map<string, number>();
  for (const [index, id] of (profile.samples ?? []).entries()) {
    const frame = nodes.get(id);
    if (!frame) continue;
    const name = `${frame.functionName || '(anonymous)'} ${frame.url.split('/').slice(-2).join('/')}:${frame.lineNumber + 1}`;
    self.set(name, (self.get(name) ?? 0) + (profile.timeDeltas?.[index] ?? 0) / 1000);
  }
  durations.sort((a, b) => a - b);
  console.log(
    JSON.stringify(
      {
        node: process.version,
        status: completedSteps === steps ? 'completed' : 'blocked',
        simulatedSeconds,
        offeredGameSecondsPerCall: scenario?.intervalSeconds ?? 1,
        integration: 'boundary-limited-prefix',
        completedSteps,
        attemptedSteps: durations.length,
        initial,
        frozenSnapshots: !mutable,
        initialFreezeMs,
        warmupSteps,
        scenario,
        setupMs,
        cpuMs: (cpu.user + cpu.system) / 1000,
        heapUsedBytes: process.memoryUsage().heapUsed,
        nativeHeadroomAtRequestedSpeed:
          (simulatedSeconds * 1000) / totalMs / (60 * (scenario?.speed ?? 1)),
        finalCounts: {
          entities: Object.keys(world.entities).length,
          events: world.events.length,
          awareness: Object.values(world.experience?.awareness ?? {}).reduce(
            (n, rows) => n + rows.length,
            0,
          ),
        },
        steps,
        totalMs,
        p50Ms: durations[Math.ceil(durations.length * 0.5) - 1],
        p95Ms: durations[Math.ceil(durations.length * 0.95) - 1],
        maxStepMs: durations.at(-1),
        nativeSecondsPerWallSecond: (simulatedSeconds * 1000) / totalMs,
        finalWorldDigest: createHash('sha256').update(JSON.stringify(world)).digest('hex'),
        hottestSelfMs: [...self].sort((a, b) => b[1] - a[1]).slice(0, 12),
      },
      null,
      2,
    ),
  );
} finally {
  session.disconnect();
}
