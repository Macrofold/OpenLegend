import { readFile, writeFile } from 'node:fs/promises';
import { Session } from 'node:inspector/promises';
import { createHash } from 'node:crypto';
import { advanceWorld, freezeWorld, type WorldState } from '../packages/domain/src/index.js';

const [input, output, stepArgument = '180', experiment] = process.argv.slice(2);
const steps = Number(stepArgument);
if (
  !input ||
  !output ||
  !Number.isInteger(steps) ||
  steps < 1 ||
  steps > 10000 ||
  (experiment !== undefined && experiment !== '--mutable-snapshots')
)
  throw new Error(
    'Usage: pnpm exec tsx scripts/profile-native.ts SAVED_WORLD_OR_BACKUP OUTPUT.cpuprofile [STEPS=180] [--mutable-snapshots]',
  );
const parsed = JSON.parse(await readFile(input, 'utf8'));
const saved = parsed.tables?.world?.[0]?.payload;
let world: WorldState = (saved ? JSON.parse(saved) : parsed).world;
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
if (!experiment) freezeWorld(world);
const initialFreezeMs = performance.now() - freezeStarted;
const step = () => {
  world = advanceWorld(world, 1).world;
  if (!experiment) freezeWorld(world);
};
for (let index = 0; index < 30; index++) step();
const session = new Session();
session.connect();
try {
  await session.post('Profiler.enable');
  await session.post('Profiler.start');
  const durations: number[] = [];
  const started = performance.now();
  for (let index = 0; index < steps; index++) {
    const at = performance.now();
    step();
    durations.push(performance.now() - at);
  }
  const totalMs = performance.now() - started;
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
        initial,
        frozenSnapshots: !experiment,
        initialFreezeMs,
        warmupSteps: 30,
        steps,
        totalMs,
        p50Ms: durations[Math.ceil(steps * 0.5) - 1],
        p95Ms: durations[Math.ceil(steps * 0.95) - 1],
        nativeSecondsPerWallSecond: (steps * 1000) / totalMs,
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
