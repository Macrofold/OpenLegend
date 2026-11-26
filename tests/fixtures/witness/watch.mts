import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import '../../../packages/domain/src/index.js';
import { AuthorityRepository } from '../../../apps/server/src/authority.js';
import { prepareWorldForStartup } from '../../../apps/server/src/initial-world-preparation.js';
import { IntegrationValues } from '../../../apps/server/src/integration-values.js';
import { PostgresDatabase } from '../../../apps/server/src/postgres.js';
import { entityGet, entitySet } from '../../../packages/domain/src/entity-collection.js';
import { initializePerception } from '../../../packages/domain/src/kernel.js';
import { worldPlacement } from '../../../packages/domain/src/spatial-state.js';
import {
  BASE_OPENING_IDENTITY_KEYS,
  createBaseOpeningCandidate,
  buildBaseInitialWorld,
} from '../../../packages/domain/src/worlds/base/initial-opening.js';
import { starterGroundAt } from '../../../packages/domain/src/worlds/base/landscape.js';
import { initializeCollisionRuntime } from '../../../packages/spatial/src/rapier.js';
import { createDisposableDatabase } from '../../../scripts/disposable-postgres.mjs';
import { writeOpeningRecords } from '../../../scripts/rust-opening-records.js';
import { createWitnessPlayer } from './signed-player.js';
import { witnessInputs, prepareWitnessRelease, launchWitnessServer } from './fixture.js';
import { reserveEntityId } from '../../../packages/domain/src/data.js';
import { commitObserverIdentity } from '../../../packages/domain/src/worlds/base/knowledge.js';
import { baseSpatial } from '../../../packages/domain/src/worlds/base/spatial-definitions.js';
import { createActor } from '../../../packages/domain/src/worlds/base/world.js';

const [outputArg] = process.argv.slice(2);
const { executable, output: dir, language, browser, adminUrl, revision } = witnessInputs(outputArg);
await mkdir(dir);
await initializeCollisionRuntime();
const id = {
  worldId: 'witness-watch-proof',
  playerId: 'watch-proof-player',
  residentId: 'watch-proof-resident',
  objects: Object.fromEntries(
    BASE_OPENING_IDENTITY_KEYS.map((key: string) => [key, `watch-proof-${key}`]),
  ),
};

const candidate = createBaseOpeningCandidate(id, 'inhabited', 73);
const coat = 'study:kest-travel-coat';
candidate.resident!.appearance = coat;
const accounts = {
  creatorAccountIds: ['local-player'],
  playerAccountId: 'local-player',
};
const { world } = buildBaseInitialWorld(candidate, accounts);
const moverAccount = 'watch-measured-mover';
const moverIdentity = {
  issuer: 'https://fixture.openlegend.invalid',
  subject: moverAccount,
};
const observed = entityGet(world.entities, id.residentId);
observed.kind = 'player';
observed.actor = createActor(world, 'player', 76, {}, 76);
const floor = (x: number, z: number) => {
  const point = starterGroundAt(world.map.spatial, x, z);
  assert(point, 'The fixture route has ground support');
  return point;
};

const travelerAt = floor(13.5, 11);
const residentAt = floor(11, 11);
const markerAt = floor(residentAt.x + 1.2, 11.25);
const observation = 'watch-proof-place';
const landmark = 'watch-proof-landmark';
for (const [personId, position, heading] of [
  [id.playerId, travelerAt, -Math.PI / 2],
  [id.residentId, residentAt, Math.PI / 2],
] as const) {
  const target = entityGet(world.entities, personId);
  target.placement = worldPlacement(position, position.surfaceId);
  target.spatial.heading = heading;
}
reserveEntityId(world, landmark);
entitySet(world.entities, landmark, {
  id: landmark,
  name: 'Watch post',
  kind: 'marker',
  spatial: baseSpatial('object'),
  placement: worldPlacement(markerAt, markerAt.surfaceId),
});
world.places[observation] = {
  id: observation,
  label: 'Watch post',
  description: 'A post beside the path.',
  revision: 1,
  point: markerAt,
  landmarkId: landmark,
  exposure: { kind: 'arrive-and-see', radius: 6, importance: 5 },
};
initializePerception(world, []);
// A seeded current-format encounter supplies names already learned in this
// same sight episode. Native must still acquire/confirm actual visual facts.
for (const [observer, subject, givenName] of [
  [id.playerId, id.residentId, 'Ada'],
  [id.residentId, id.playerId, 'Newcomer'],
] as const) {
  const encounterId = world.perceptionEpisodes?.[observer]?.[subject];
  assert(encounterId, `Fixture opening lacks its supported sight episode for ${givenName}`);
  const individualId = `fixture-known-${givenName.toLowerCase()}`;
  assert(
    commitObserverIdentity(world, observer, individualId, {
      individualId,
      canonicalId: subject,
      givenName,
      encounterId,
      authored: false,
      revision: 0,
    }),
  );
}
const prepared = prepareWorldForStartup(
  { world, speed: 1, manuallyPaused: true },
  new Map([
    [id.playerId, 'local-player'],
    [id.residentId, moverAccount],
  ]),
  [],
  false,
  [],
);
let release: string;

const report: Record<string, unknown> = {
  source: revision,
  arm: 'watch-expiry',
  world: id.worldId,
  parties: [id.playerId, id.residentId],
  startingExposure: {
    player: world.perceptionEpisodes?.[id.playerId]?.[id.residentId],
    resident: world.perceptionEpisodes?.[id.residentId]?.[id.playerId],
  },
};
const sha = createHash('sha256');
for await (const chunk of createReadStream(executable)) sha.update(chunk);
report.binarySha256 = sha.digest('hex');
process.env.OPENLEGEND_FIXTURE_DATABASE_PREFIX ??= 'witness_watch_';
const owned = await createDisposableDatabase(adminUrl);
const sql = new PostgresDatabase(owned.url, true);
let runtime: ReturnType<typeof launchWitnessServer> | undefined;
let player: ReturnType<typeof createWitnessPlayer>;
let moverSession = '';
let mover: ReturnType<typeof createWitnessPlayer> | undefined;
let moverPresence: ReturnType<typeof setInterval> | undefined;

let presenceTimer: ReturnType<typeof setInterval> | undefined;
const tabScope = 'watch-proof-signed-tab';
const moverTab = 'watch-expiry-mover-tab';
const timeline = 'eb0b4512-1bb7-431c-85ab-18065251efcd';
async function seed() {
  const rows = new PostgresDatabase(owned.url);
  try {
    await writeOpeningRecords(rows, prepared);
    await rows.transaction(async () => {
      const authority = new AuthorityRepository(rows);
      await authority.provision(id.worldId, {
        issuer: 'https://local.openlegend.invalid',
        subject: 'local-player',
        accountId: 'local-player',
        actorId: id.playerId,
        capabilities: ['play', 'create', 'inspect', 'manage-access', 'save'],
      });
      await authority.provision(id.worldId, {
        ...moverIdentity,
        accountId: moverAccount,
        actorId: id.residentId,
        capabilities: ['play'],
      });
      moverSession = (await authority.login(moverIdentity, Date.now(), 600_000)).token;
      await new IntegrationValues(rows).put('world-timeline:' + id.worldId, timeline);
    });
  } finally {
    await rows.close();
  }
  release = await prepareWitnessRelease({
    output: dir,
    databaseUrl: owned.url,
    world: prepared.world,
    language,
    browser,
  });
  report.storageSha256 = createHash('sha256')
    .update(await readFile(join(release, 'storage.json')))
    .digest('hex');
}
async function open(label: string) {
  runtime = launchWitnessServer({
    executable,
    release,
    output: dir,
    databaseUrl: owned.url,
    label,
  });
  const base = await runtime.ready;
  const tab = `${tabScope}-${label}`;
  player = createWitnessPlayer(base, tab);
  const watcherCookie = await player.login();
  const cookieName = watcherCookie.split('=', 1)[0];
  assert(cookieName && moverSession, 'Both players must have a signed session.');
  mover = createWitnessPlayer(base, moverTab, `${cookieName}=${moverSession}`);
  const current = await wait(state, Boolean, 'signed watcher state');
  const control = await post('/api/embodiment', {
    id: `watch-control-${label}`,
    operation: 'replace',
    expectedGeneration: current.access.controlGeneration,
  });
  assert.equal(control.ok, true, JSON.stringify(control));
  await wait(state, (next) => next.access.controlling, 'signed watcher control');
  const presence = await post('/api/presence', {
    clientId: tab,
    visible: true,
    sequence: 1,
  });
  assert.equal(presence.ok, true, JSON.stringify(presence));
  let sequence = 1;
  presenceTimer = setInterval(() => {
    void post('/api/presence', {
      clientId: tab,
      visible: true,
      sequence: ++sequence,
    }).catch((error) => {
      report.watcherPresenceFailure = String(error);
    });
  }, 2000);
}
const state = () => player.state();
const post = (path: string, body: object) => player.post(path, body);
async function wait<T>(
  read: () => Promise<T>,
  good: (v: NonNullable<T>) => unknown,
  label: string,
  timeout = 16000,
) {
  const end = Date.now() + timeout;
  let result: T | undefined;
  do {
    result = await read();
    if (result != null && good(result)) return result;
    await delay(150);
  } while (Date.now() < end);
  await writeFile(join(dir, 'last-checked.json'), JSON.stringify(result ?? null));
  throw Error(`${label} remained unconfirmed. ${JSON.stringify(result)?.slice(0, 500)}`);
}
function personPosition(current: any) {
  return current?.player?.position;
}
function stop() {
  clearInterval(presenceTimer);
  clearInterval(moverPresence);
}

async function verifyExpiry() {
  assert(mover);
  let sequence = 1;
  const { state: moverState, post: moverPost } = mover;
  const current = await wait(moverState, Boolean, 'signed mover state');
  const control = await moverPost('/api/embodiment', {
    id: 'watch-expiry-mover-control',
    operation: 'replace',
    expectedGeneration: current.access.controlGeneration,
  });
  report.moverControl = control;
  assert(control.ok, JSON.stringify(control));
  await moverState();
  const presence = await moverPost('/api/presence', {
    clientId: moverTab,
    visible: true,
    sequence,
  });
  report.moverPresence = presence;
  assert(presence.ok, JSON.stringify(presence));
  await wait(moverState, (next) => next.access.controlling, 'second controller is current', 10000);
  moverPresence = setInterval(() => {
    void moverPost('/api/presence', {
      clientId: moverTab,
      visible: true,
      sequence: ++sequence,
    })
      .then((receipt) => {
        report.lastMoverHeartbeat = receipt;
      })
      .catch((error) => {
        report.moverPresenceFailure = String(error);
      });
  }, 1500);

  assert.equal((await post('/api/control', { paused: false })).ok, true);
  const targetInView = (current: any) =>
    current?.entities?.find((body: any) => body.appearance === coat);
  const start = await wait(state, targetInView, 'warm permitted observer view');
  const initialTarget = targetInView(start);
  const deadline = start.clock.seconds + 900;
  const original = {
    requestId: 'expiry-watch',
    text: 'walk to 12.7, 11',
    mode: 'replace',
    slots: {
      watch: {
        subjectId: initialTarget.id,
        placeId: observation,
        trigger: { kind: 'presence', initial: 'changes-only' },
        until: deadline,
      },
    },
  };
  const accepted = await post('/api/action-attempt', original);
  assert(accepted.ok && accepted.code === 'watching' && accepted.planId, JSON.stringify(accepted));
  const startPosition = personPosition(start);
  report.expiryAdmission = {
    deadline,
    clock: start.clock.seconds,
    receipt: accepted,
    observer: startPosition,
    target: initialTarget.position,
  };

  const moveOther = async (to: number, commandId: string) => {
    await moverState();
    const here = await moverPost('/api/presence', {
      clientId: moverTab,
      visible: true,
      sequence: ++sequence,
    });
    assert(here.ok, JSON.stringify(here));
    const current = await wait(moverState, Boolean, 'signed mover state');
    const receipt = await moverPost('/api/command', {
      commandId,
      commandEpoch: current.commandEpoch,
      command: { type: 'move', position: floor(to, residentAt.z) },
    });
    report[commandId] = {
      receipt,
      from: personPosition(current),
      controlling: current.access.controlling,
      at: current.clock.seconds,
    };
    assert(receipt.ok, JSON.stringify(receipt));
    return wait(
      state,
      (next) => Math.abs((targetInView(next)?.position?.x ?? Infinity) - to) < 0.15,
      'watcher directly observes the other player at the waypoint',
    );
  };
  const stepQuery = sql.prepare('SELECT payload FROM sim_plan_steps WHERE world_id=? AND id=?');
  const readStepForPlan = (planId: string) => {
    const key = JSON.stringify([
      'world',
      'entities',
      id.playerId,
      'actor',
      'agency',
      'plan',
      'steps',
      `${planId}:walk`,
    ]);
    return async () => {
      const row = await stepQuery.get(id.worldId, key);
      return row && JSON.parse(row.payload);
    };
  };
  const originalStep = readStepForPlan(accepted.planId);

  const outside = await moveOther(4, 'clearance-outside');
  const queued = await wait(
    originalStep,
    (step) => step?.watch?.lastComplete === false,
    'direct observation of the target outside reset the watch baseline',
  );
  assert.equal(queued.status, 'queued');
  assert(!queued.watch.matched);
  assert.equal(queued.watch.deadline, deadline);
  assert.deepEqual(personPosition(outside), startPosition);
  assert(outside.clock.seconds < deadline, 'Outside sighting must precede expiry');
  report.outsideBeforeDeadline = {
    at: outside.clock.seconds,
    observer: personPosition(outside),
    target: targetInView(outside).position,
    step: {
      id: queued.id,
      status: queued.status,
      baseline: queued.watch.lastComplete,
      matched: queued.watch.matched,
      deadline: queued.watch.deadline,
    },
  };

  const blocked = await wait(
    originalStep,
    (step) => step?.outcome?.code === 'watch-expired',
    'the same watch durably expired without a match',
    35000,
  );
  assert.equal(blocked.status, 'blocked');
  assert(!blocked.watch && !blocked.actionId, JSON.stringify(blocked));
  const atExpiry = await wait(
    state,
    (next) => next?.clock?.seconds >= deadline,
    'clock passed the deadline',
  );
  assert.deepEqual(personPosition(atExpiry), startPosition);
  report.expiry = {
    at: atExpiry.clock.seconds,
    observer: personPosition(atExpiry),
    status: blocked.status,
    outcome: blocked.outcome,
    actionId: blocked.actionId,
  };

  await moveOther(residentAt.x, 'expiry-late-return');
  const later = await wait(
    state,
    (next) =>
      next?.clock?.seconds > deadline + 120 &&
      Math.abs((targetInView(next)?.position?.x ?? Infinity) - residentAt.x) < 0.15,
    'observer receives the same target visibly inside after the watch expired',
  );
  assert.deepEqual(personPosition(later), startPosition);
  assert.deepEqual(await originalStep(), blocked);
  const laterContact = targetInView(later);
  report.lateSighting = {
    at: later.clock.seconds,
    observer: personPosition(later),
    target: laterContact.position,
    expiredStepRemainedBlocked: true,
  };

  const fresh = await post('/api/action-attempt', {
    requestId: 'expiry-positive-control',
    text: 'walk to 12.7, 11',
    mode: 'replace',
    slots: {
      watch: {
        subjectId: laterContact.id,
        placeId: observation,
        trigger: { kind: 'presence', initial: 'report-current' },
      },
    },
  });
  assert(fresh.ok && fresh.code === 'watching' && fresh.planId, JSON.stringify(fresh));
  assert.notEqual(fresh.planId, accepted.planId);
  const moved = await wait(
    state,
    (next) => Math.abs((personPosition(next)?.x ?? Infinity) - 12.7) < 0.15,
    'a new watch for the same recognized person and place released its own walk',
  );
  const done = await wait(
    readStepForPlan(fresh.planId),
    (step) => step?.status === 'completed',
    'the fresh watch walk was durably completed',
  );
  assert.equal(done.outcome?.ok, true, JSON.stringify(done));
  assert(!done.watch);
  report.positiveControl = {
    at: moved.clock.seconds,
    observer: personPosition(moved),
    receipt: fresh,
    outcome: done.outcome,
  };
  report.checks = [
    'No qualifying return before the deadline. The original watch ended without movement.',
    'The watcher saw the late return. The original step stayed blocked and a freshly chosen walk completed.',
  ];
}

try {
  await seed();
  await open('warm');
  await verifyExpiry();
} catch (error) {
  report.failure = String(error);
  throw error;
} finally {
  const cleanupErrors: unknown[] = [];
  for (const cleanup of [
    stop,
    () => player?.close(),
    () => mover?.close(),
    () => runtime?.stop(),
    () => sql.close(),
    async () => {
      await owned.close();
      report.databaseDropped = true;
    },
  ]) {
    try {
      await cleanup();
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (cleanupErrors.length) report.cleanupFailures = cleanupErrors.map(String);
  await writeFile(join(dir, 'result.json'), JSON.stringify(report, null, 2));
  if (cleanupErrors.length && !report.failure)
    throw new AggregateError(cleanupErrors, 'Watch replay cleanup failed');
}
