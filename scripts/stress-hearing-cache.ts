import { createHash } from 'node:crypto';
import { createWorld, freezeWorld } from '../packages/domain/src/index.js';
import { seesEntity, speechExposure } from '../packages/domain/src/perception.js';

// Synthetic stationary query workload, not collision/spawn, persistence or capacity acceptance.
// No database, network, provider credentials or live save are opened.
const populations = process.argv.slice(2).map(Number);
if (!populations.length) populations.push(96, 300, 600);
if (
  populations.length > 8 ||
  populations.some((n) => !Number.isSafeInteger(n) || n < 1 || n > 2000)
)
  throw new Error('Supply up to eight listener populations between 1 and 2000.');
const reports = [];
for (const population of populations) {
  const world = createWorld(73);
  const template = Object.values(world.entities).find((entity) => entity.actor)!;
  const speaker = structuredClone(template);
  speaker.id = 'cache-source';
  speaker.position = { x: 20, y: 0, z: 20 };
  world.entities[speaker.id] = speaker;
  const listenerIds: string[] = [];
  for (let i = 0; i < population; i++) {
    const listener = structuredClone(template);
    listener.id = `cache-listener-${i}`;
    const angle = (2 * Math.PI * i) / population;
    const radius = 8 + (i % 7) * 2;
    listener.position = {
      x: 20 + Math.cos(angle) * radius,
      y: 0,
      z: 20 + Math.sin(angle) * radius,
    };
    world.entities[listener.id] = listener;
    listenerIds.push(listener.id);
  }
  const input = freezeWorld(world);
  const query = (id: string) => {
    const listener = input.entities[id]!;
    return {
      id,
      hearing: speechExposure(input, listener, speaker, 'normal'),
      seen: seesEntity(input, listener, speaker),
    };
  };
  const sample = () => {
    const start = performance.now();
    for (const id of listenerIds) query(id);
    return performance.now() - start;
  };
  const coldMs = sample();
  for (let i = 0; i < 5; i++) sample();
  const warm = Array.from({ length: 60 }, sample).sort((a, b) => a - b);
  // Compare complete results outside the timed path; no hash/string work per measured query.
  const resultDigest = createHash('sha256')
    .update(JSON.stringify(listenerIds.map(query)))
    .digest('hex');
  reports.push({
    population,
    queriesPerPass: population * 2,
    warmPasses: warm.length,
    coldMs,
    medianMs: warm[Math.floor(warm.length * 0.5)],
    p95Ms: warm[Math.ceil(warm.length * 0.95) - 1],
    maximumMs: warm.at(-1),
    resultDigest,
  });
}
console.log(JSON.stringify({ node: process.version, seed: 73, reports }, null, 2));
