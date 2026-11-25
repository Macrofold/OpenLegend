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
import { createItemLot } from '../../../packages/domain/src/objects.js';
import { worldPlacement } from '../../../packages/domain/src/spatial-state.js';
import { starterGroundAt } from '../../../packages/domain/src/worlds/base/landscape.js';
import { createBaseNativeProofWorld } from '../../../packages/domain/src/worlds/base/native-proof.js';
import { initializeCollisionRuntime } from '../../../packages/spatial/src/rapier.js';
import { createDisposableDatabase } from '../../../scripts/disposable-postgres.mjs';
import { writeOpeningRecords } from '../../../scripts/rust-opening-records.js';
import { launchWitnessServer, prepareWitnessRelease, witnessInputs } from './fixture.js';
import { startTypedProvider } from './provider.js';
import { createWitnessPlayer } from './signed-player.js';

const { executable, output, language, browser, adminUrl, revision } = witnessInputs(
  process.argv[2],
);
const hash = createHash('sha256');
for await (const chunk of createReadStream(executable)) hash.update(chunk);
const binaryDigest = hash.digest('hex');
await initializeCollisionRuntime();
await mkdir(output);
process.env.OPENLEGEND_FIXTURE_DATABASE_PREFIX = 'witness_gameplay_fish_';
const owned = await createDisposableDatabase(adminUrl);
const read = new PostgresDatabase(owned.url, true);
const worldId = 'signed-two-volunteers';
const hero = 'native-proof-player';
const helpers = ['native-proof-ground-observer', 'native-proof-deck-observer'];
let appealText: string | undefined;
const quietText =
  'Did my request for a cooked fish go unanswered? Speak only if nobody gave me one.';
const report = {
  source: revision,
  binary: binaryDigest,
  seed: 73,
  phases: [],
  providerSelections: [],
  judge: [],
};
const save = () => writeFile(join(output, 'result.json'), JSON.stringify(report, null, 2));
const terminal = new Set(['completed', 'failed', 'cancelled', 'stale', 'refused']);
const decisions = new Map<string, 'appeal' | 'quiet'>();
const waits: { gate: PromiseWithResolvers<void>; jobId: string }[] = [];
const decisionId = (requestId: string) => requestId.split(':attempt:')[0];
const fishOffer = /^Offer 1 Cooked river fish to /i;
const acceptedFish = 'accepted an exchange of 1 Cooked river fish.';
const people = {
  Alice: { position: [22.77, 14], id: helpers[0] },
  Beren: { position: [24, 12.77], id: helpers[1] },
};
const nameFor = (actorId: string) =>
  Object.entries(people).find(([, person]) => person.id === actorId)?.[0];
let provider: Awaited<ReturnType<typeof startTypedProvider>> | undefined;
let server: ReturnType<typeof launchWitnessServer> | undefined;
let signedPlayer: ReturnType<typeof createWitnessPlayer> | undefined;
let heartbeat: ReturnType<typeof setInterval> | undefined;
const poll = async (fn, test, title, ms = 16000) => {
  const stop = Date.now() + ms;
  let value;
  do {
    value = await fn();
    if (test(value)) return value;
    await delay(65);
  } while (Date.now() < stop);
  throw Error(title + ' ' + (JSON.stringify(value) ?? 'undefined').slice(0, 2000));
};

try {
  const world = createBaseNativeProofWorld(
    { creatorAccountIds: ['local-player'], playerAccountId: 'local-player' },
    worldId,
  );
  const moveAtOpening = (id, x, z, heading) => {
    const point = starterGroundAt(world.map.spatial, x, z);
    const person = entityGet(world.entities, id);
    assert(person, `Fixture actor is missing: ${id}`);
    person.placement = worldPlacement(point, point.surfaceId);
    person.spatial.heading = heading;
    return person;
  };
  moveAtOpening(hero, 24, 14, -2.35);
  moveAtOpening(helpers[0], 22.77, 14, Math.PI / 2).name = 'Alice';
  moveAtOpening(helpers[1], 24, 12.77, 0).name = 'Beren';
  for (const id of helpers) {
    assert(createItemLot(world, id, 'cooked_river_fish', 1, 'fixture-fish-' + id));
  }
  const seed = new PostgresDatabase(owned.url);
  try {
    const initial = prepareWorldForStartup(
      { world, speed: 0.1, manuallyPaused: true },
      new Map([[hero, 'local-player']]),
      [],
      true,
      [],
    );
    await writeOpeningRecords(seed, initial);
    await seed.transaction(async () => {
      await new AuthorityRepository(seed).provision(worldId, {
        issuer: 'https://local.openlegend.invalid',
        subject: 'local-player',
        accountId: 'local-player',
        actorId: hero,
        capabilities: ['play', 'create', 'inspect', 'save'],
      });
      await new IntegrationValues(seed).put(
        'world-timeline:' + worldId,
        'eb0b4512-1bb7-431c-85ab-18065251efcd',
      );
    });
  } finally {
    await seed.close();
  }
  const release = await prepareWitnessRelease({
    output,
    databaseUrl: owned.url,
    world,
    language,
    browser,
  });

  const config: Parameters<typeof startTypedProvider>[0]['config'] = {
    judge({ requestId, state, questions }) {
      const id = decisionId(requestId);
      if (requestId.endsWith(':attempt:0:route') && typeof state === 'string') {
        const lines = state.split('\n');
        if (
          appealText &&
          lines.some((line) => line.startsWith('Nearby speech: ' + appealText + ' ('))
        ) {
          decisions.set(id, 'appeal');
        } else if (
          lines.some((line) => line.startsWith('Addressed speech (to me): ' + quietText + ' ('))
        ) {
          decisions.set(id, 'quiet');
        }
      }
      if (!decisions.has(id)) return;
      report.judge.push({
        requestId,
        decision: decisions.get(id),
        questions: Object.keys(questions),
      });
      return {
        choices: Object.fromEntries(
          Object.entries({
            route: 'level2',
            possibleAction: 'yes',
            reflection: 'no',
          }).filter(([id, value]) => questions[id]?.criteria?.[value] !== undefined),
        ),
        noul(id, q) {
          if (!requestId.endsWith(':action-attention')) return 0.95;
          const label = q.instructions?.match(/\bOption \d+\b/)?.[0];
          const text = state?.candidates?.[label];
          return typeof text === 'string' && fishOffer.test(text) ? 0.99 : 0.1;
        },
      };
    },
  };
  const op = (localId, actionId) => ({
    localId,
    requiresAccepted: [],
    act: {
      kind: 'known',
      mode: 'enqueue',
      actionId,
      invocation: null,
      slots: null,
      verb: null,
      targetEntityId: null,
      description: null,
    },
    talk: null,
    think: null,
    goal: null,
    plan: null,
    observe: null,
    remember: null,
    note: null,
    name: null,
    appraise: null,
  });
  provider = await startTypedProvider({
    caseName: 'signed two fish volunteers',
    config,
    responses: {
      async npc_response({ requestId, schema, context }) {
        const prompt = typeof context === 'string' ? context : JSON.stringify(context);
        const result = (operations) => ({
          operations,
          ...Object.fromEntries(
            schema.required.filter((k) => k !== 'operations').map((k) => [k, null]),
          ),
        });
        const id = decisionId(requestId);
        const kind = decisions.get(id);
        if (!kind) return result([]);
        if (kind === 'quiet') {
          const personalAcceptance = prompt
            .split('\n')
            .find((line) => line.startsWith('- ') && line.includes(acceptedFish));
          assert(
            personalAcceptance,
            'The directed follow-up lacks the giver’s exact acceptance evidence',
          );
          report.providerSelections.push({
            requestId,
            intent: 'deliberate silence',
            personalAcceptance,
          });
          return result([]);
        }
        const choice = [...prompt.matchAll(/^- (a[0-9]+): ([^\r\n]+)$/gm)].find(
          ([, , description]) => fishOffer.test(description),
        );
        assert(choice, 'An admitted volunteer was offered no reachable cooked fish gift');
        report.providerSelections.push({ requestId, chosen: choice[2] });
        const gate = Promise.withResolvers<void>();
        waits.push({ gate, jobId: id });
        await gate.promise;
        return result([op('volunteer_fish', choice[1])]);
      },
    },
  });
  assert(config.macrofoldUrl && config.macrofoldKey);
  server = launchWitnessServer({
    executable,
    release,
    output,
    label: 'server',
    databaseUrl: owned.url,
    provider: { url: config.macrofoldUrl, key: config.macrofoldKey, certPath: provider.certPath },
  });
  const tab = 'witness-fish';
  const playerSession = (signedPlayer = createWitnessPlayer(await server.ready, tab));
  await playerSession.login();
  const call = playerSession.post;
  let view;
  const state = async () => {
    view = await playerSession.state();
    assert(view, 'Expected a current signed player view.');
    return view;
  };
  const command = async (commandId, command) => {
    await state();
    return call('/api/command', {
      commandId,
      commandEpoch: view.commandEpoch,
      command,
    });
  };
  await state();
  assert(
    (
      await call('/api/embodiment', {
        id: 'claim',
        operation: 'replace',
        expectedGeneration: view.access.controlGeneration,
      })
    ).ok,
  );
  await state();
  let sequence = 0;
  const presence = () =>
    call('/api/presence', {
      clientId: tab,
      visible: true,
      sequence: ++sequence,
    });
  assert((await presence()).ok);
  await state();
  if (view.clock.paused) assert((await call('/api/control', { paused: false })).ok);
  await state();
  heartbeat = setInterval(
    () =>
      presence().catch((error) => {
        report.presenceFailure = String(error);
      }),
    3000,
  ).unref();
  const contact = async (name) => {
    await state();
    const [x, z] = people[name].position;
    return view.entities.find(
      (e) =>
        e.position && e.talkRequiresAi && Math.hypot(e.position.x - x, e.position.z - z) < 0.15,
    );
  };
  const seen = await poll(
    async () => [await contact('Alice'), await contact('Beren')],
    (rows) => rows.every(Boolean),
    'Both helpers visible to requester',
  );
  report.phases.push({
    phase: 'start',
    positions: seen.map((e) => e.position),
    clock: view.clock.seconds,
  });
  const trade = async (name) => {
    const who = await contact(name);
    assert(who, 'Helper contact no longer visible: ' + name);
    return (await call('/api/trade', { personId: who.id })).trade;
  };
  const fishCount = (tradeView, itemName) =>
    tradeView.ownLots
      .filter((lot) => lot.name === itemName)
      .reduce((count, lot) => count + lot.quantity, 0);
  const decode = (rows) =>
    rows.map((row) => ({
      ...JSON.parse(row.payload),
      id: row.id,
      position: row.position,
    }));
  const eventRead = (predicate: string) =>
    read.prepare(
      'SELECT id, position, payload FROM history_events WHERE world_id=? AND ' +
        predicate +
        ' ORDER BY position',
    );
  const newest = await read
    .prepare('SELECT position FROM history_events WHERE world_id=? ORDER BY position DESC LIMIT 1')
    .get(worldId);
  const cut = newest?.position ?? 0;
  const availability = await playerSession.get('/api/player-interaction/availability?mode=speak');
  assert.equal(availability.status, 200);
  const offers = JSON.parse(availability.text);
  const appeal = offers.publicAppeals.find((o) => o.id === 'ask-for-cooked-fish');
  assert(appeal?.text, 'The selected world did not offer its cooked fish appeal');
  appealText = appeal.text;
  const accepted = await command('ask-two-helpers', {
    type: 'say',
    text: appealText,
    volume: 'shout',
    publicAppeal: appeal.id,
  });
  assert(accepted.ok, JSON.stringify(accepted));

  const byAppeal = eventRead(
    "position>? AND payload::jsonb->>'actorId'=? AND payload::jsonb#>>'{data,publicAppeal}'=?",
  );
  const [event] = await poll(
    async () => decode(await byAppeal.all(worldId, cut, hero, appeal.id)),
    (rows) => rows.length === 1,
    'Durable signed appeal',
  );
  const awarenessRead = read.prepare(
    'SELECT actor_id,payload FROM mind_awareness WHERE world_id=? AND source_id=? ORDER BY actor_id',
  );
  const awareness = async (eventId: string) =>
    (await awarenessRead.all(worldId, eventId))
      .filter((row) => helpers.includes(row.actor_id) || row.actor_id === hero)
      .map((row) => ({ actor: row.actor_id, ...JSON.parse(row.payload) }));
  const jobRead = read.prepare('SELECT payload FROM jobs WHERE id=?');
  const jobFor = async (id: string) => {
    const row = await jobRead.get(id);
    return row && JSON.parse(row.payload);
  };
  const settle = (id: string) =>
    poll(
      () => jobFor(id),
      (j) => j && terminal.has(j.status),
      'Decision did not settle: ' + id,
    );
  const assertCompleted = (job, condition: string) => {
    assert.equal(job.status, 'completed', JSON.stringify(job.outcome));
    const { stage, dispatched, received, applied } = job.outcome;
    assert.deepEqual([stage, dispatched, received, applied], ['apply', true, true, true]);
    assert.equal(job.outcome.condition, condition);
  };
  const byDecision = eventRead('response_id=?');
  report.appeal = {
    id: event.id,
    testimony: await poll(
      () => awareness(event.id),
      (rows) =>
        helpers.every((actor) =>
          rows.some(
            (r) =>
              r.actor === actor &&
              r.speech?.intelligibility === 'clear' &&
              r.eventData?.speechChoice === appeal.id,
          ),
        ),
      'Both helpers heard the full appeal and qualified',
    ),
  };
  await save();

  await poll(
    async () => waits.length,
    (count) => count === 2,
    'Both independent volunteer decisions reached a held gift choice',
    23000,
  );
  const [firstGate, secondGate] = waits;
  const volunteer = (gate) =>
    poll(() => jobFor(gate.jobId), Boolean, 'Held volunteer decision was not saved');
  const [firstJob, secondJob] = await Promise.all([volunteer(firstGate), volunteer(secondGate)]);
  const firstActor = firstJob.request.npcId;
  const secondActor = secondJob.request.npcId;
  assert.deepEqual([firstActor, secondActor].sort(), [...helpers].sort());
  for (const job of [firstJob, secondJob]) assert(job.request.text.includes(appealText));
  const firstName = nameFor(firstActor);
  const secondName = nameFor(secondActor);
  assert(firstName && secondName);
  assert(
    (await trade(secondName)).offers.every((offer) => !offer.incoming),
    'Second volunteer already made an offer',
  );
  const offerFrom = async (name: string) => {
    const tradeView = await poll(
      () => trade(name),
      (data) => data?.offers?.some((offer) => offer.incoming),
      name + ' did not offer the fish',
    );
    const offer = tradeView.offers.find((offer) => offer.incoming);
    assert.deepEqual(
      offer.receive.map((lot) => [lot.name, lot.quantity]),
      [['Cooked river fish', 1]],
    );
    return { tradeView, offer };
  };
  const firstReply = (offer, operation) =>
    offer.actions.find((action) => action.enabled && action.command.handoverOperation === operation)
      .command;
  const byDisposition = eventRead(`position>? AND payload::jsonb->>'actorId'=?
    AND payload::jsonb->>'targetId'=? AND payload::jsonb->>'type'=?
    AND payload::jsonb#>>'{data,offerId}'=? AND payload::jsonb->>'scope'='private'`);
  const notices = (name: string, target: string, type: string, offerId: string) =>
    poll(
      async () =>
        decode(await byDisposition.all(worldId, event.position, hero, target, type, offerId)),
      (rows) =>
        rows.some((row) => row.audience.includes(target)) &&
        rows.some((row) => row.audience.includes(hero)),
      name + ' did not get both exact transaction notices',
    );

  firstGate.gate.resolve();
  const { tradeView: beforeAccept, offer: firstOffer } = await offerFrom(firstName);
  assert.equal(fishCount(beforeAccept, 'Cooked river fish'), 0);
  assert((await command('accept-first-fish', firstReply(firstOffer, 'accept'))).ok);
  const exactAcceptances = await notices(firstName, firstActor, 'offer-accepted', firstOffer.id);
  const firstAcceptance = exactAcceptances.find((row) => row.audience.includes(firstActor));
  assert(
    exactAcceptances.every((row) => !row.audience.includes(secondActor)),
    'Other volunteer received the exact accepted terms',
  );
  const firstReceived = await poll(
    () => awareness(firstAcceptance.id),
    (rows) => rows.some((a) => a.actor === firstActor && a.text.includes(acceptedFish)),
    'Giver did not record the exact accepted fish',
  );
  const publicAcceptance = eventRead(`position>? AND payload::jsonb->>'actorId'=?
    AND payload::jsonb->>'targetId'=? AND payload::jsonb->>'type'='offer-accepted'
    AND payload::jsonb->>'scope'='external' AND (payload::jsonb->>'at')::double precision=?`);
  const observedAcceptance = decode(
    await publicAcceptance.all(worldId, event.position, hero, firstActor, firstAcceptance.at),
  );
  assert.equal(observedAcceptance.length, 1);
  const acceptanceAccounts = (
    await Promise.all([...exactAcceptances, ...observedAcceptance].map((row) => awareness(row.id)))
  ).flat();
  const secondReceived = acceptanceAccounts.filter((row) => row.actor === secondActor);
  assert(
    secondReceived.every((row) => !row.text.includes(acceptedFish) && !row.eventData?.agreement),
    'Other volunteer’s personal account includes the first gift’s private terms',
  );
  assert.equal(fishCount(await trade(firstName), 'Cooked river fish'), 1);
  assert(
    (await trade(secondName)).offers.every((offer) => !offer.incoming),
    'Second volunteer already made an offer',
  );
  report.phases.push({
    phase: 'accepted first gift',
    firstName,
    secondName,
    terms: firstOffer.receive,
    acceptanceEvents: exactAcceptances.map(({ id, at, audience }) => ({
      id,
      at,
      audience,
    })),
    firstReceived: firstReceived.map(({ actor, text }) => ({ actor, text })),
    secondReceived: secondReceived.map(({ actor, text }) => ({ actor, text })),
  });

  secondGate.gate.resolve();
  const { offer: secondOffer } = await offerFrom(secondName);
  assert((await command('decline-second-fish', firstReply(secondOffer, 'decline'))).ok);
  const exactDeclines = await notices(secondName, secondActor, 'offer-declined', secondOffer.id);
  assert.equal(fishCount(await trade(firstName), 'Cooked river fish'), 1);
  const giftDecisions = await Promise.all([settle(firstGate.jobId), settle(secondGate.jobId)]);
  giftDecisions.forEach((job) => assertCompleted(job, 'responded'));
  for (const [gate, offer, actor] of [
    [firstGate, firstOffer, firstActor],
    [secondGate, secondOffer, secondActor],
  ]) {
    const offered = decode(await byDecision.all(worldId, gate.jobId)).filter(
      (e) =>
        e.type === 'item-offered' &&
        e.actorId === actor &&
        e.targetId === hero &&
        e.scope === 'private',
    );
    assert(offered.some((e) => e.data.offerId === offer.id));
    assert(offered.every((e) => e.data.offerId === offer.id));
  }
  report.phases.push({
    phase: 'other helper offered separately and player declined',
    secondName,
    terms: secondOffer.receive,
    declineEvents: exactDeclines.map((e) => e.id),
  });

  const quietContact = await contact(firstName);
  assert(quietContact);
  const ask = await call('/api/chat', {
    requestId: 'ask-resolved-helper',
    npcId: quietContact.id,
    text: quietText,
    volume: 'normal',
  });
  assert(ask.ok && ask.jobId, JSON.stringify(ask));
  const quiet = await settle(ask.jobId);
  assertCompleted(quiet, 'response-empty');
  assert.equal(quiet.request.npcId, firstActor);
  assert(
    report.providerSelections.some(
      (row) =>
        row.requestId === ask.jobId + ':attempt:0:generate' && row.intent === 'deliberate silence',
    ),
  );
  assert(
    !decode(await byDecision.all(worldId, ask.jobId)).some((e) => e.type === 'speech'),
    'Quiet decision wrote a spoken reply',
  );
  report.phases.push({
    phase: 'direct follow-up with witness who supplied fish',
    result: quiet.outcome,
  });
  report.jobs = [...giftDecisions, quiet].map(({ id, request, outcome }) => ({
    id,
    actor: request.npcId,
    outcome,
  }));
  report.provider = provider.summary();
  assert.deepEqual(report.provider.problems, []);
} catch (error) {
  report.failure = String(error?.stack ?? error);
  report.provider = provider?.summary();
  throw error;
} finally {
  clearInterval(heartbeat);
  for (const { gate } of waits) gate.resolve();
  const cleanup = [];
  try {
    await signedPlayer?.close();
  } catch (error) {
    cleanup.push(error);
  }
  try {
    await server?.stop();
  } catch (error) {
    cleanup.push(error);
  }
  const closed = await Promise.allSettled([provider?.close(), read.close()]);
  for (const result of closed) if (result.status === 'rejected') cleanup.push(result.reason);
  try {
    await owned.close();
    report.databaseDropped = true;
  } catch (error) {
    cleanup.push(error);
  }
  report.cleanupFailures = cleanup.map(String);
  report.verified = !report.failure && cleanup.length === 0;
  await save();
  if (!report.failure && cleanup.length)
    throw new AggregateError(cleanup, 'Fixture cleanup failed');
}
