import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { AuthorityRepository } from '../../../apps/server/src/authority.js';
import { prepareWorldForStartup } from '../../../apps/server/src/initial-world-preparation.js';
import { IntegrationValues } from '../../../apps/server/src/integration-values.js';
import { PostgresDatabase } from '../../../apps/server/src/postgres.js';
import { entityGet } from '../../../packages/domain/src/entity-collection.js';
import { initializePerception } from '../../../packages/domain/src/kernel.js';
import { bodyProfile, worldPlacement } from '../../../packages/domain/src/spatial-state.js';
import { isWalkable } from '../../../packages/domain/src/spatial.js';
import { commitObserverIdentity } from '../../../packages/domain/src/worlds/base/knowledge.js';
import { starterGroundAt } from '../../../packages/domain/src/worlds/base/landscape.js';
import { createBaseNativeProofWorld } from '../../../packages/domain/src/worlds/base/native-proof.js';
import { initializeCollisionRuntime } from '../../../packages/spatial/src/rapier.js';
import { createDisposableDatabase } from '../../../scripts/disposable-postgres.mjs';
import { writeOpeningRecords } from '../../../scripts/rust-opening-records.js';
import { launchWitnessServer, prepareWitnessRelease, witnessInputs } from './fixture.js';
import { startTypedProvider } from './provider.js';
import { createWitnessPlayer } from './signed-player.js';

const [outputArg, arm] = process.argv.slice(2);
assert(arm === 'visible' || arm === 'occluded', 'Choose visible or occluded.');
const inputs = witnessInputs(outputArg);
const { executable, output, adminUrl, revision } = inputs;
await initializeCollisionRuntime();
await mkdir(output);
const executableHash = createHash('sha256');
for await (const chunk of createReadStream(executable)) executableHash.update(chunk);
const result: Record<string, unknown> = {
  arm,
  revision,
  executableSha256: executableHash.digest('hex'),
};
let controlled: Awaited<ReturnType<typeof startTypedProvider>> | undefined;
let server: ReturnType<typeof launchWitnessServer> | undefined;
let signedPlayer: ReturnType<typeof createWitnessPlayer> | undefined;
let presenceTimer: ReturnType<typeof setInterval> | undefined;
const save = () =>
  writeFile(
    join(output, 'result.json'),
    JSON.stringify({ ...result, provider: controlled?.summary() }, null, 2),
  );
const deadline = async (read, test, detail, ms = 20000) => {
  const stop = Date.now() + ms;
  let received;
  do {
    received = await read();
    if (test(received)) return received;
    await delay(70);
  } while (Date.now() < stop);
  throw Error(detail + ' ' + JSON.stringify(received ?? null).slice(0, 2400));
};
process.env.OPENLEGEND_FIXTURE_DATABASE_PREFIX = 'witness_follow_';
const owned = await createDisposableDatabase(adminUrl);
const proof = new PostgresDatabase(owned.url, true);
try {
  const world = createBaseNativeProofWorld(
    { creatorAccountIds: ['local-player'], playerAccountId: 'local-player' },
    'rgs-witness-queued-follow',
  );
  const player = 'native-proof-player';
  const resident = 'native-proof-ground-observer';
  const otherResident = 'native-proof-deck-observer';
  const layout = world.map.spatial;
  assert(layout);
  const floor = (x: number, z: number) => starterGroundAt(layout, x, z);
  const point = (id: string, x: number, z: number, heading: number) => {
    const actor = entityGet(world.entities, id);
    assert(actor && actor.spatial);
    const ground = floor(x, z);
    actor.placement = worldPlacement(ground, ground.surfaceId);
    actor.spatial.heading = heading;
    assert(
      isWalkable(world, ground, ground.surfaceId, bodyProfile(actor)),
      JSON.stringify({ id, ground }),
    );
    return ground;
  };
  const playerStart = point(player, 21.7, 15.2, Math.PI);
  const residentStart = point(resident, 22, 14, -Math.PI / 2);
  const approachPoint = point(otherResident, 14.5, 14, Math.PI / 2);
  const playerEnd = arm === 'visible' ? floor(19, 15.2) : floor(21.9, 18.1);
  layout.blockers.push({
    id: 'disposable-witness-route-screen',
    bounds: { min: { x: 16, y: 0, z: 16.4 }, max: { x: 21.1, y: 3, z: 16.65 } },
    movement: true,
    sight: true,
    acousticTransmission: 0.4,
    material: 'wood',
    nonWalkable: true,
  });
  layout.revision++;
  const playerBody = entityGet(world.entities, player);
  assert(playerBody);
  assert(isWalkable(world, playerEnd, playerEnd.surfaceId, bodyProfile(playerBody)));
  initializePerception(world, []);
  const otherEpisode = world.perceptionEpisodes?.[resident]?.[otherResident];
  assert(otherEpisode, 'Witness can see the known third resident before the journey starts.');
  assert(
    commitObserverIdentity(world, resident, 'fixture-known-route-companion', {
      individualId: 'fixture-known-route-companion',
      canonicalId: otherResident,
      givenName: 'Greeter',
      encounterId: otherEpisode,
      authored: true,
      revision: 0,
    }),
  );
  result.opening = {
    speed: 0.06,
    playerStart,
    playerEnd,
    residentStart,
    approachPoint,
    screen: layout.blockers.at(-1),
  };
  const seed = new PostgresDatabase(owned.url);
  try {
    const initial = prepareWorldForStartup(
      { world, speed: 0.06, manuallyPaused: true },
      new Map([['native-proof-player', 'local-player']]),
      [],
      true,
      [],
    );
    await writeOpeningRecords(seed, initial);
    await seed.transaction(async () => {
      await new AuthorityRepository(seed).provision(world.id, {
        issuer: 'https://local.openlegend.invalid',
        subject: 'local-player',
        accountId: 'local-player',
        actorId: 'native-proof-player',
        capabilities: ['play', 'create', 'inspect', 'manage-access', 'save'],
      });
      await new IntegrationValues(seed).put(
        'world-timeline:' + world.id,
        'eb0b4512-1bb7-431c-85ab-18065251efcd',
      );
    });
  } finally {
    await seed.close();
  }
  const release = await prepareWitnessRelease({ ...inputs, world, databaseUrl: owned.url });
  const cue = 'Will you walk over there and then follow me?';
  const approachDistance = Math.hypot(
    residentStart.x - approachPoint.x,
    residentStart.z - approachPoint.z,
  ).toFixed(1);
  const playerDistance = Math.hypot(
    residentStart.x - playerStart.x,
    residentStart.z - playerStart.z,
  ).toFixed(1);

  // Match the two offered actions by their distinct distances in this scene.
  // The prompt may describe both people without a known name.
  const isApproach = (description: string) =>
    description.startsWith('Move near the currently observed position of ') &&
    description.includes(`currently ${approachDistance} m away.`);
  const isFollow = (description: string) =>
    description.startsWith('Follow ') &&
    description.includes(' while visible;') &&
    description.includes(`Distance to the observed position: ${playerDistance} m.`);
  const ratedApproaches = new Map<string, Set<string>>();
  const queuePlans: {
    requestId: string;
    stepAliases: string[];
    offeredDescriptions: string[];
  }[] = [];
  result.selectedPlans = queuePlans;
  const config: Parameters<typeof startTypedProvider>[0]['config'] & {
    macrofoldKey: string;
    macrofoldUrl: string;
  } = {
    macrofoldKey: '',
    macrofoldUrl: '',
    judge({ requestId, state, questions }) {
      const possible = questions.possibleAction;
      const choices =
        possible?.type === 'choice' && 'yes' in possible.criteria
          ? { possibleAction: 'yes' }
          : undefined;
      const suffix = ':action-attention';
      if (!requestId.startsWith('human:') || !requestId.endsWith(suffix)) {
        return { choices };
      }
      const decision = requestId.slice(0, -suffix.length);
      const approaches = new Set<string>();
      ratedApproaches.set(decision, approaches);
      const candidates =
        state && typeof state === 'object' && 'candidates' in state ? state.candidates : undefined;
      return {
        choices,
        noul(alias, question) {
          const option = question.instructions?.match(/\bOption \d+\b/)?.[0];
          const description =
            option && candidates && typeof candidates === 'object'
              ? (candidates as Record<string, unknown>)[option]
              : undefined;
          if (typeof description !== 'string') return 0.1;
          if (isFollow(description)) return 0.99;
          if (!isApproach(description)) return 0.1;
          approaches.add(alias);
          return 0.97;
        },
      };
    },
  };
  controlled = await startTypedProvider({
    caseName: 'Witness queues a Follow behind a finite walk',
    config,
    responses: {
      npc_response({ requestId, schema, context }) {
        assert(requestId.startsWith('human:'), 'Expected the directed conversation.');
        const decision = requestId.slice(0, requestId.lastIndexOf(':'));
        const rated = ratedApproaches.get(decision);
        const offers = [...context.matchAll(/^- (a[0-9]+): ([^\r\n]+)$/gm)].map(
          ([, alias, description]) => ({ alias, description }),
        );
        const approaches = offers.filter(
          ({ alias, description }) => isApproach(description) && rated?.has(alias),
        );
        const follows = offers.filter(({ description }) => isFollow(description));
        assert.equal(approaches.length, 1, JSON.stringify({ offers, rated: [...(rated ?? [])] }));
        assert.equal(follows.length, 1, JSON.stringify({ offers }));
        const selected = [approaches[0], follows[0]];
        queuePlans.push({
          requestId,
          stepAliases: selected.map(({ alias }) => alias),
          offeredDescriptions: selected.map(({ description }) => description),
        });
        return {
          operations: [
            {
              localId: 'queued_follow',
              requiresAccepted: [],
              talk: null,
              act: null,
              think: null,
              goal: null,
              plan: {
                mode: 'replace',
                expectedRevision: 0,
                goalId: null,
                steps: selected.map(({ alias }) => ({
                  actionId: alias,
                  itemFromStep: null,
                  useItemAs: null,
                })),
              },
              observe: null,
              remember: null,
              note: null,
              name: null,
              appraise: null,
            },
          ],
          ...Object.fromEntries(
            schema.required
              .filter((key) => key !== 'operations')
              .map((key) => {
                assert(
                  key === 'queries' || key === 'invention',
                  'Uncovered response field: ' + key,
                );
                return [key, null];
              }),
          ),
        };
      },
    },
  });
  server = launchWitnessServer({
    executable,
    release,
    output,
    label: 'warm',
    databaseUrl: owned.url,
    provider: {
      url: config.macrofoldUrl,
      key: config.macrofoldKey,
      certPath: controlled.certPath,
    },
  });
  const tab = 'witness-warm';
  const playerSession = (signedPlayer = createWitnessPlayer(await server.ready, tab));
  let view;
  const state = async () => {
    view = await playerSession.state();
    assert(view, 'Expected a current signed player view.');
    return view;
  };
  const post = playerSession.post;
  const authorize = async () => {
    await playerSession.login();
    const before = await state();
    assert(
      (
        await post('/api/embodiment', {
          id: 'control-warm',
          operation: 'replace',
          expectedGeneration: before.access.controlGeneration,
        })
      ).ok,
    );
    await state();
    let presence = 1;
    assert(
      (
        await post('/api/presence', {
          clientId: tab,
          visible: true,
          sequence: presence,
        })
      ).ok,
    );
    await state();
    if (view.clock.paused) {
      assert((await post('/api/control', { paused: false })).ok);
      await state();
    }
    assert(view.access.controlling && !view.clock.paused);
    presenceTimer = setInterval(
      () =>
        post('/api/presence', {
          clientId: tab,
          visible: true,
          sequence: ++presence,
        }).catch((error) => {
          result.presenceFailure = String(error);
        }),
      4000,
    ).unref();
  };
  await authorize();
  await state();

  const isResident = (entity) =>
    entity.talkRequiresAi &&
    entity.position &&
    Math.hypot(entity.position.x - residentStart.x, entity.position.z - residentStart.z) < 0.4;
  await deadline(
    state,
    (next) => next.entities.some(isResident),
    'The player should first acquire the real conversation contact',
  );
  const nearby = view.entities.filter((entity) => entity.talkRequiresAi);
  result.playerNearby = nearby.map(({ id, name, position, kind }) => ({
    id,
    name,
    position,
    kind,
  }));
  const contact = nearby.find(isResident);
  const send = {
    requestId: 'queued-follow-' + arm,
    npcId: contact.id,
    text: cue,
    volume: 'normal',
  };
  const timeline = view.saveTimeline;
  const chat = await post('/api/chat', send);
  result.chat = chat;
  assert(chat.ok && chat.jobId, JSON.stringify(chat));
  const jobId = chat.jobId;
  const frontier = async () =>
    (
      await proof
        .prepare(
          'SELECT payload FROM sim_plan_steps WHERE world_id=? AND parent_id=? ORDER BY position,id',
        )
        .all(world.id, JSON.stringify(['world', 'entities', resident, 'actor', 'agency', 'plan']))
    ).map((row) => JSON.parse(row.payload));
  const job = async () => {
    const row = await proof.prepare('SELECT payload FROM jobs WHERE id=?').get(jobId);
    return row && JSON.parse(row.payload);
  };
  const placement = async (actor) => {
    const row = await proof
      .prepare('SELECT payload FROM sim_placements WHERE world_id=? AND parent_id=?')
      .get(world.id, JSON.stringify(['world', 'entities', actor]));
    return row && JSON.parse(row.payload);
  };
  const currentAction = async () => {
    const row = await proof
      .prepare('SELECT payload FROM sim_processes WHERE world_id=? AND parent_id=?')
      .get(world.id, JSON.stringify(['world', 'entities', resident, 'actor']));
    return row && JSON.parse(row.payload);
  };
  const received = async () =>
    (
      await proof
        .prepare(
          'SELECT slot,payload FROM mind_perception_current WHERE world_id=? AND parent_id=? AND slot=?',
        )
        .all(world.id, JSON.stringify(['world', 'perceptionEvidence', resident]), player)
    ).map((row) => ({ slot: row.slot, body: JSON.parse(row.payload) }));
  const episode = async () => {
    const row = await proof
      .prepare('SELECT payload FROM mind_exposure WHERE world_id=? AND parent_id=? AND slot=?')
      .get(world.id, JSON.stringify(['world', 'perceptionEpisodes', resident]), player);
    return row && JSON.parse(row.payload);
  };
  const accounts = async () =>
    (
      await proof
        .prepare(
          "SELECT payload FROM mind_awareness WHERE world_id=? AND actor_id=? AND payload::jsonb->>'eventType'='speech' AND payload LIKE ?",
        )
        .all(world.id, resident, '%' + cue + '%')
    ).map((row) => JSON.parse(row.payload));
  const occurrences = async () =>
    (
      await proof
        .prepare(
          "SELECT payload FROM activity_occurrences WHERE world_id=? AND actor_id=? AND payload::jsonb #>> '{command,type}'='follow'",
        )
        .all(world.id, resident)
    ).map((row) => JSON.parse(row.payload));
  const isQueued = (steps) =>
    steps.length === 2 && steps[0].status === 'running' && steps[1].status === 'queued';
  const pending = await deadline(
    () =>
      proof.readTransaction(async () => ({
        steps: await frontier(),
        job: await job(),
      })),
    (data) =>
      isQueued(data.steps) ||
      ['failed', 'stale', 'cancelled'].includes(data.job?.status) ||
      (data.job?.status === 'completed' && queuePlans.length === 0),
    'A finite approach should run while the offered Follow is still queued',
    20000,
  );
  result.pending = pending;
  const speechAccounts = await accounts();
  result.witnessSpeech = speechAccounts;
  assert(
    speechAccounts.some(
      ({ speech }) =>
        speech?.intelligibility === 'clear' &&
        speech.addressing === 'directed' &&
        speech.segments.some((segment) => segment.kind === 'heard' && segment.text === cue),
    ),
    'Ada must have heard the directed request clearly.',
  );
  assert(isQueued(pending.steps), JSON.stringify(pending));
  assert.equal(queuePlans.length, 1);
  assert(
    queuePlans[0].requestId.startsWith(`${jobId}:`),
    'The offered plan must belong to this conversation.',
  );
  assert(pending.steps.every((step) => step.command.id.startsWith(`${jobId}:queued_follow:`)));
  assert.equal(pending.steps[0]?.command.type, 'move', JSON.stringify(pending));
  const queuedFollow = pending.steps[1];
  assert.equal(queuedFollow.command.type, 'follow', JSON.stringify(pending));
  assert.equal(queuedFollow.command.targetId, player, JSON.stringify(pending));
  const targetEpisode = queuedFollow.targetEpisodes?.[player];
  assert(targetEpisode, JSON.stringify(pending));
  assert.equal((await occurrences()).length, 0);

  // Read saved movement, Follow and sight together so a background save cannot split the evidence.
  const savedTargetAtQueue = () =>
    proof.readTransaction(async () => ({
      steps: await frontier(),
      playerPosition: (await placement(player))?.position,
      received: await received(),
      episode: await episode(),
    }));
  const hasSight = (sample) =>
    sample.received.some((row) =>
      row.body.content.groups.some((group) => group.received?.grant.modality === 'sight'),
    );
  const near = (position, expected) =>
    position && Math.hypot(position.x - expected.x, position.z - expected.z) < 0.15;
  const beforeMovement = await savedTargetAtQueue();
  result.beforeMovement = beforeMovement;
  assert(isQueued(beforeMovement.steps));
  assert(near(beforeMovement.playerPosition, playerStart));
  assert.equal(beforeMovement.episode, targetEpisode);
  assert(hasSight(beforeMovement), 'Ada must see the player before the walk.');
  await state();
  const move = await post('/api/command', {
    commandId: 'move-target-' + arm,
    commandEpoch: view.commandEpoch,
    command: { type: 'move', position: playerEnd },
  });
  result.playerWalk = move;
  assert(move.ok, JSON.stringify(move));
  const afterMovement = await deadline(
    savedTargetAtQueue,
    (sample) =>
      !isQueued(sample.steps) ||
      (near(sample.playerPosition, playerEnd) &&
        (arm === 'visible'
          ? sample.episode === targetEpisode && hasSight(sample)
          : sample.episode === undefined && !hasSight(sample))),
    'The signed target must move and change what Ada sees before Follow starts',
  );
  result.afterMovement = afterMovement;
  assert(
    isQueued(afterMovement.steps),
    'The target must finish moving while the original walk runs and Follow is still queued.',
  );
  assert.equal(afterMovement.steps[1].command.id, queuedFollow.command.id);
  const reachedDecision = (steps) =>
    steps[0]?.status === 'completed' &&
    ['running', 'completed', 'blocked'].includes(steps[1]?.status);
  const resolved = await deadline(
    () =>
      proof.readTransaction(async () => {
        const steps = await frontier();
        if (!reachedDecision(steps)) return { steps };
        return {
          steps,
          active: await currentAction(),
          resident: await placement(resident),
          target: await placement(player),
          received: await received(),
          episode: await episode(),
          occurrences: await occurrences(),
        };
      }),
    (data) => reachedDecision(data.steps),
    'Queued Follow should be started or explicitly refused after the finite approach',
    28000,
  );
  result.resolved = resolved;
  await state();
  const receipt = await post('/api/chat/receipt', { requestId: send.requestId, timeline });
  result.chatReceipt = receipt;
  assert.equal(receipt.status, 'resolved');
  assert.equal(receipt.result?.jobId, jobId);
  assert.equal(receipt.result?.jobStatus, 'completed');
  assert.equal(resolved.steps[1].command.id, queuedFollow.command.id);
  if (arm === 'visible') {
    assert.equal(resolved.steps[1].status, 'running');
    assert.equal(resolved.active?.type, 'follow');
    assert.equal(resolved.active.id, resolved.steps[1].actionId);
    assert.equal(resolved.active.targetId, player);
    assert.equal(resolved.episode, targetEpisode);
    assert(hasSight(resolved));
    assert(near(resolved.active.follow?.lastSeen?.point, playerEnd));
    assert.equal(resolved.occurrences.length, 1);
    assert.equal(resolved.occurrences[0].commandId, queuedFollow.command.id);
  } else {
    assert.equal(resolved.steps[1].status, 'blocked');
    assert.equal(resolved.steps[1].outcome?.code, 'stale-encounter');
    assert.equal(resolved.episode, undefined);
    assert(!hasSight(resolved));
    assert.notEqual(resolved.active?.type, 'follow');
    assert.equal(resolved.occurrences.length, 0);
  }
  assert.deepEqual(controlled.summary().problems, []);
  result.verified = true;
} catch (error) {
  result.verified = false;
  result.failure = { message: String(error), stack: error.stack };
  throw error;
} finally {
  clearInterval(presenceTimer);
  try {
    try {
      try {
        await signedPlayer?.close();
      } finally {
        if (server) {
          await server.stop();
          result.gracefullyStoppedAndReleased = true;
        }
      }
    } finally {
      const cleanup = await Promise.allSettled([controlled?.close(), proof.close()]);
      await owned.close();
      result.databaseDropped = true;
      const failed = cleanup.find((settled) => settled.status === 'rejected');
      if (failed) throw failed.reason;
    }
  } catch (error) {
    result.verified = false;
    result.cleanupFailure = String(error);
    throw error;
  } finally {
    await save();
  }
}
