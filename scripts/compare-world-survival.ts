import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import type { Command, WorldState, WorldEvent } from '../packages/domain/src/types.js';

/** Requested run-on-demand comparison, not an automated test or save converter.
 * Native baseline loading is only for comparison of authored outcomes.
 * Usage: AI_BUDGET_USD=0 node --import tsx scripts/compare-world-survival.ts
 *   [--baseline-root /tmp/source-of-recorded-baseline] [--baseline-commit COMMIT]
 */
if (process.env['AI_BUDGET_USD'] !== '0')
  throw new Error('Set AI_BUDGET_USD=0. No provider calls are made.');
const args = process.argv.slice(2);
const option = (name: string) => {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
};
type Domain = typeof import('../packages/domain/src/index.js');
async function load(root: string): Promise<Domain> {
  const spatial = await import(pathToFileURL(resolve(root, 'packages/spatial/src/rapier.ts')).href);
  await spatial.initializeCollisionRuntime();
  return import(pathToFileURL(resolve(root, 'packages/domain/src/index.ts')).href);
}
const current = await load(resolve(import.meta.dirname, '..'));
const baselineRoot = option('--baseline-root');
const baseline = baselineRoot ? await load(baselineRoot) : undefined;
const actorIds = ['entity-0001', 'entity-0002', 'peacock-mercenary', 'bird-1'];
function meter(world: WorldState, actorId: string, id: string): number | undefined {
  const actor = world.entities[actorId]?.actor;
  if (!actor) return;
  const sparse = actor.attributes?.[id]?.value;
  const field = id === 'wilderness:fullness' ? 'fullness' : 'energy';
  const value = sparse ?? Reflect.get(actor, field);
  return typeof value === 'number' ? value : undefined;
}
function setMeter(world: WorldState, actorId: string, id: string, value: number): void {
  const actor = world.entities[actorId]!.actor!;
  const sparse = actor.attributes?.[id];
  if (sparse) sparse.value = value;
  else Reflect.set(actor, id === 'wilderness:fullness' ? 'fullness' : 'energy', value);
}
function command(
  domain: Domain,
  world: WorldState,
  body: Omit<Command, 'actorId' | 'id'> | Record<string, unknown>,
  actorId = 'entity-0001',
): WorldState {
  const result = domain.executeCommand(world, {
    ...body,
    actorId,
    id: `comparison-${world.sequence}-${body['type']}`,
  } as Command);
  assert.equal(result.outcome.ok, true, result.outcome.message);
  return result.world;
}
interface Scenario {
  name: string;
  seconds: number;
  setup: (domain: Domain, world: WorldState) => WorldState;
}
const scenarios: Scenario[] = [
  {
    name: 'exhausted-player',
    seconds: 40,
    setup: (_d, w) => {
      w.entities['entity-0001']!.actor!.health = 0.09;
      setMeter(w, 'entity-0001', 'wilderness:energy', 0);
      return w;
    },
  },
  {
    name: 'simultaneous-deaths',
    seconds: 40,
    setup: (_d, w) => {
      for (const id of ['entity-0002', 'peacock-mercenary']) {
        w.entities[id]!.actor!.health = 0.09;
        setMeter(w, id, 'wilderness:fullness', 0);
      }
      return w;
    },
  },
  {
    name: 'empties-mid-interval',
    seconds: 120,
    setup: (_d, w) => {
      setMeter(w, 'entity-0001', 'wilderness:fullness', 0.09);
      return w;
    },
  },
  {
    name: 'sleep-while-starving',
    seconds: 140,
    setup: (d, w) => {
      w.entities['entity-0002']!.actor!.health = 1;
      setMeter(w, 'entity-0002', 'wilderness:fullness', 0);
      setMeter(w, 'entity-0002', 'wilderness:energy', 30);
      return command(
        d,
        w,
        {
          type: 'status-effect',
          definitionId: 'wilderness:restorative-rest',
          targetId: 'entity-0002',
          operation: 'activate',
        },
        'entity-0002',
      );
    },
  },
  {
    name: 'fatal-blow-while-starving',
    seconds: 60,
    setup: (d, w) => {
      const p = w.entities['entity-0001']!,
        v = w.entities['entity-0002']!;
      v.actor!.health = 1;
      setMeter(w, v.id, 'wilderness:fullness', 0);
      d.setSpatialPosition(
        w,
        p,
        { ...d.worldPosition(v), x: d.worldPosition(v).x + 0.5 },
        d.worldSupport(v),
      );
      return command(d, w, { type: 'strike', targetId: v.id, definitionId: 'punch' });
    },
  },
  {
    name: 'fatal-blow-food-interval',
    seconds: 60,
    setup: (d, w) => {
      const p = w.entities['entity-0001']!,
        v = w.entities['entity-0002']!;
      v.actor!.health = 1;
      setMeter(w, v.id, 'wilderness:fullness', 35);
      d.setSpatialPosition(
        w,
        p,
        { ...d.worldPosition(v), x: d.worldPosition(v).x + 0.5 },
        d.worldSupport(v),
      );
      return command(d, w, { type: 'strike', targetId: v.id, definitionId: 'punch' });
    },
  },
  {
    name: 'animal-zero-energy-flight',
    seconds: 240,
    setup: (_d, w) => {
      setMeter(w, 'bird-1', 'wilderness:energy', 0);
      w.entities['bird-1']!.spatial.flight!.waitSeconds = 0;
      return w;
    },
  },
  {
    name: 'eating-while-starving',
    seconds: 120,
    setup: (d, w) => {
      setMeter(w, 'entity-0001', 'wilderness:fullness', 0);
      d.createItemLot(w, 'entity-0001', 'berries', 1, 'comparison-food');
      const item = d
        .inventoryFor(w, 'entity-0001')
        .find((item) => item.definitionId === 'berries')!;
      return command(d, w, { type: 'eat', itemId: item.id });
    },
  },
  {
    name: 'camp-recovery',
    seconds: 120,
    setup: (d, w) => {
      w.entities['entity-0001']!.actor!.health = 29;
      setMeter(w, 'entity-0001', 'wilderness:fullness', 19);
      setMeter(w, 'entity-0001', 'wilderness:energy', 10);
      return command(d, w, { type: 'recover' });
    },
  },
];
function eventContent(event: WorldEvent): unknown {
  // Added internal status episodes consume identities; compare player-visible semantics,
  // exact occurrence order, clock, actor/target, cause, disclosure and event payload.
  const { id: _id, sequence: _sequence, order: _order, ...content } = event;
  const data = { ...content.data };
  for (const key of ['actionId', 'activityId', 'effectId', 'episode']) delete data[key];
  return { ...content, data };
}
function capture(world: WorldState) {
  return {
    time: world.simTime,
    rng: world.rngState,
    actors: actorIds.map((id) => {
      const entity = world.entities[id],
        actor = entity?.actor;
      return {
        id,
        health: actor?.health,
        food: actor?.controller === 'native' ? undefined : meter(world, id, 'wilderness:fullness'),
        energy: meter(world, id, 'wilderness:energy'),
        alive: actor?.alive,
        incapacitated: actor?.incapacitated,
        bodyRevision: actor?.body?.revision,
        position: entity && current.worldPosition(entity),
        remains: entity?.remains,
      };
    }),
    events: world.events.map(eventContent),
  };
}
async function run(domain: Domain, scenario: Scenario, callSeconds: number) {
  let world = scenario.setup(domain, domain.createWorld(73));
  const end = world.simTime + scenario.seconds;
  while (world.simTime < end) {
    const result = domain.advanceWorld(world, Math.min(callSeconds, end - world.simTime));
    assert.equal(result.outcome.ok, true, result.outcome.message);
    assert.ok(result.world.simTime > world.simTime, 'Native advance must make progress');
    world = result.world;
  }
  domain.validateWorldModules(world);
  return capture(world);
}
const reports = [];
let unexpected = 0;
for (const scenario of scenarios)
  for (const callSeconds of [30, 1, scenario.seconds]) {
    const actual = await run(current, scenario, callSeconds);
    if (!baseline) {
      reports.push({ scenario: scenario.name, callSeconds, actual });
      continue;
    }
    const before = await run(baseline, scenario, callSeconds);
    try {
      assert.deepEqual(actual, before);
      reports.push({ scenario: scenario.name, callSeconds, result: 'matched' });
    } catch {
      // The accepted fatal-blow food interval now receives its final metabolism interval.
      const a = structuredClone(actual),
        b = structuredClone(before);
      if (scenario.name === 'fatal-blow-food-interval') {
        for (const report of [a, b]) {
          const victim = report.actors.find((actor) => actor.id === 'entity-0002')!;
          delete victim.food;
        }
      }
      try {
        assert.deepEqual(a, b);
        reports.push({
          scenario: scenario.name,
          callSeconds,
          result: 'accepted-final-food-interval',
          beforeFood: before.actors.find((a) => a.id === 'entity-0002')?.food,
          afterFood: actual.actors.find((a) => a.id === 'entity-0002')?.food,
        });
      } catch {
        unexpected++;
        reports.push({
          scenario: scenario.name,
          callSeconds,
          result: 'unexpected-difference',
          before,
          actual,
        });
      }
    }
  }
console.log(
  JSON.stringify(
    {
      baseline: option('--baseline-commit') ?? null,
      baselineRoot: baselineRoot ?? null,
      compared: !!baseline,
      unexpected,
      reports,
    },
    null,
    2,
  ),
);
if (unexpected) process.exitCode = 1;
