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
import { entityGet, entityValues } from '../../../packages/domain/src/entity-collection.js';
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
import { startTypedProvider } from './provider.js';

const [outputArg] = process.argv.slice(2);
const { executable, output: dir, language, browser, adminUrl, revision } = witnessInputs(outputArg);
await mkdir(dir);
const arm = 'free-text childhood association';
await initializeCollisionRuntime();
const id = {
  worldId: 'witness-free-text-proof',
  playerId: 'watch-proof-player',
  residentId: 'watch-proof-resident',
  objects: Object.fromEntries(
    BASE_OPENING_IDENTITY_KEYS.map((key: string) => [key, `watch-proof-${key}`]),
  ),
};
const candidate = createBaseOpeningCandidate(id, 'inhabited', 73);
const coat = 'study:kest-travel-coat';
const history =
  'When I was a child, I was frightened by a traveler in a brightly patterned coat at a winter fair.';
const question = 'What, if anything, does the coat I am wearing remind you of?';
const scriptedReply =
  'I remember a traveler in a patterned coat at a winter fair when I was a child.';
candidate.player.appearance = coat;
candidate.resident!.backstory = history;
assert(!candidate.resident!.sensitivityAppearance);
const accounts = {
  creatorAccountIds: ['local-player'],
  playerAccountId: 'local-player',
};
const opening = buildBaseInitialWorld(candidate, accounts);
const world = opening.world;
const floor = (x: number, z: number) => {
  const point = starterGroundAt(world.map.spatial, x, z);
  assert(point, 'The fixture route has ground support');
  return point;
};
const travelerAt = floor(16, 11);
const residentAt = floor(11, 11);
world.map.spatial.blockers.push({
  id: 'witness-proof-screen',
  bounds: {
    min: { x: 14.65, y: 0, z: 10.25 },
    max: { x: 14.85, y: 2.6, z: 11.75 },
  },
  movement: true,
  sight: true,
  acousticTransmission: 0.4,
  material: 'wood',
  nonWalkable: true,
});
world.map.spatial.revision++;
for (const [personId, position, heading] of [
  [id.playerId, travelerAt, Math.PI / 2],
  [id.residentId, residentAt, Math.PI / 2],
] as const) {
  const target = entityGet(world.entities, personId);
  target.placement = worldPlacement(position, position.surfaceId);
  target.spatial.heading = heading;
}
initializePerception(world, []);
const prepared = prepareWorldForStartup(
  { world, speed: 1, manuallyPaused: true },
  new Map([[id.playerId, 'local-player']]),
  [],
  false,
  [],
);
let release: string;
const population = {
  players: [...entityValues(world.entities)].filter((entity) => entity.kind === 'player').length,
  residents: [...entityValues(world.entities)].filter((entity) => entity.kind === 'npc').length,
  animals: [...entityValues(world.entities)].filter((entity) => entity.kind === 'animal').length,
  scenery: world.map.spatial.scenery?.length ?? 0,
};
const report: Record<string, unknown> = {
  source: revision,
  arm,
  world: id.worldId,
  population,
  parties: [id.playerId, id.residentId],
  checks: [],
};
const sha = createHash('sha256');
for await (const chunk of createReadStream(executable)) sha.update(chunk);
report.binarySha256 = sha.digest('hex');
const checks = report.checks as string[];
process.env.OPENLEGEND_FIXTURE_DATABASE_PREFIX ??= 'witness_free_text_';
const owned = await createDisposableDatabase(adminUrl);
const sql = new PostgresDatabase(owned.url, true);
let runtime: ReturnType<typeof launchWitnessServer> | undefined;
let player: ReturnType<typeof createWitnessPlayer>;

let presenceTimer: ReturnType<typeof setInterval> | undefined;
const tabScope = 'watch-proof-signed-tab';
const timeline = 'eb0b4512-1bb7-431c-85ab-18065251efcd';
const config: any = {};
let controlled: any;
function respond({ schema, context, requestId }: any) {
  const prompt = typeof context === 'string' ? context : JSON.stringify(context);
  const extras = Object.fromEntries(
    schema.required.filter((key: string) => key !== 'operations').map((key: string) => [key, null]),
  );
  if (!requestId.startsWith('human:') || !prompt.includes(question))
    return { operations: [], ...extras };
  const evidence = prompt
    .split('\n')
    .filter((line: string) => /winter fair|coat|appearance|newcomer/i.test(line));
  report.questionContext = {
    requestId,
    historyPresent: prompt.includes(history),
    evidence: evidence.slice(0, 16),
  };
  const operation = {
    localId: 'coat_recollection',
    requiresAccepted: [],
    talk: {
      text: scriptedReply,
      addresseeEntityId: null,
      selfIntroduction: null,
      volume: 'normal',
    },
    act: null,
    think: null,
    goal: null,
    plan: null,
    observe: null,
    remember: null,
    note: null,
    name: null,
    appraise: null,
  };
  return { operations: prompt.includes(history) ? [operation] : [], ...extras };
}

async function seed() {
  const rows = new PostgresDatabase(owned.url);
  try {
    await writeOpeningRecords(rows, prepared);
    await rows.transaction(async () => {
      await new AuthorityRepository(rows).provision(id.worldId, {
        issuer: 'https://local.openlegend.invalid',
        subject: 'local-player',
        accountId: 'local-player',
        actorId: id.playerId,
        capabilities: ['play', 'create', 'inspect', 'manage-access', 'save'],
      });
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
    provider: {
      url: config.macrofoldUrl,
      key: config.macrofoldKey,
      certPath: controlled.certPath,
    },
  });
  const base = await runtime.ready;
  const tab = `${tabScope}-${label}`;
  player = createWitnessPlayer(base, tab);
  await player.login();
  const current = await wait(state, Boolean, 'signed player state');
  const control = await post('/api/embodiment', {
    id: `watch-control-${label}`,
    operation: 'replace',
    expectedGeneration: current.access.controlGeneration,
  });
  assert.equal(control.ok, true, JSON.stringify(control));
  await wait(state, (next) => next.access.controlling, 'signed player control');
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
      report.presenceFailure = String(error);
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
async function move(destination: any, cmd: string) {
  const current = await wait(state, Boolean, 'signed state');
  const answer = await post('/api/command', {
    commandId: cmd,
    commandEpoch: current.commandEpoch,
    command: { type: 'move', position: destination },
  });
  assert.equal(answer.ok, true, JSON.stringify(answer));
  return wait(
    state,
    (current) =>
      Math.abs((personPosition(current)?.x ?? Infinity) - destination.x) < 0.2 &&
      Math.abs((personPosition(current)?.z ?? Infinity) - destination.z) < 0.2,
    'displayed movement',
  );
}
function stop() {
  clearInterval(presenceTimer);
}
const job = async (jobId: string) => {
  const row = await sql.prepare('SELECT payload FROM jobs WHERE id=?').get(jobId);
  return row && JSON.parse(row.payload);
};
const jobs = async () =>
  (
    await sql
      .prepare("SELECT payload FROM jobs WHERE payload::jsonb#>>'{request,npcId}'=? ORDER BY id")
      .all(id.residentId)
  ).map((row: any) => JSON.parse(row.payload));
const contact = async () => {
  const row = await sql
    .prepare('SELECT payload,metadata FROM mind_perception_current WHERE world_id=? AND id=?')
    .get(
      id.worldId,
      JSON.stringify(['world', 'perceptionEvidence', id.residentId, 'current', id.playerId]),
    );
  if (!row) return null;
  const record = JSON.parse(row.payload).content;
  const body = record.groups
    .map((group: any) => group.received)
    .find((member: any) => member.grant.modality === 'sight' && member.fields.body);
  if (!body) return null;
  const value = await sql
    .prepare('SELECT payload FROM mind_perception_values WHERE world_id=? AND source_id=?')
    .get(id.worldId, body.fields.body.value.reference);
  return {
    body,
    metadata: JSON.parse(row.metadata),
    value: value && JSON.parse(value.payload),
    sampleAt: record.originals[body.grant.original]?.origin?.measuredFrom,
  };
};
const appraisals = async () =>
  (
    await sql
      .prepare('SELECT payload FROM mind_appraisals WHERE world_id=? AND parent_id=?')
      .all(id.worldId, JSON.stringify(['world', 'appraisals', id.residentId]))
  ).map((r: any) => JSON.parse(r.payload));
const flinches = async () =>
  (
    await sql
      .prepare(
        `SELECT id,payload FROM history_events WHERE world_id=?
    AND payload::jsonb->>'type'='expression' AND payload::jsonb->>'actorId'=?
    AND payload::jsonb->>'text' LIKE '%flinch%' ORDER BY position`,
      )
      .all(id.worldId, id.residentId)
  ).map((row: any) => ({ id: row.id, ...JSON.parse(row.payload) }));
const clockRow = sql.prepare('SELECT payload FROM world_settings WHERE world_id=? AND id=?');
const savedTime = async () => {
  const row = await clockRow.get(id.worldId, '["world"]');
  return row ? Number(JSON.parse(row.payload).simTime) : -Infinity;
};
const mark = async (minimumSeconds: number, label: string) => {
  await wait(savedTime, (seconds) => seconds >= minimumSeconds, label);
  return sql.readTransaction(async () => {
    const seconds = await savedTime();
    assert(seconds >= minimumSeconds, label);
    const state = await sql
      .prepare('SELECT payload FROM mind_state WHERE world_id=? AND id=?')
      .get(id.worldId, JSON.stringify(['world', 'minds', id.residentId]));
    return {
      seconds,
      contact: await contact(),
      jobs: (await jobs()).map((j: any) => ({
        status: j.status,
        request: j.request,
      })),
      fear: (await appraisals()).filter((a: any) =>
        JSON.stringify(a).includes('recognized-appearance-fear'),
      ),
      flinches: await flinches(),
      sensitivities: (state && JSON.parse(state.payload).sensitivities) || null,
    };
  });
};

try {
  await seed();
  controlled = await startTypedProvider({
    caseName: 'Free-text coat association',
    config,
    responses: { npc_response: respond },
  });
  await open('warm');
  assert.equal((await post('/api/control', { paused: false })).ok, true);
  report.hidden = await mark(35, 'saved hidden sight sample');
  assert.equal(
    (report.hidden as any).contact,
    null,
    'The screen should prevent the witness seeing the wearer',
  );
  const moved = await move(floor(13.5, 11), 'emerge-from-behind-screen');
  const seen = await wait(
    contact,
    (value) => value?.body?.fields?.body,
    'resident saves actual visual evidence',
  );
  const minimumSeconds = Math.max(moved.clock.seconds, seen.sampleAt ?? 0) + 75;
  report.beforeQuestion = {
    ...(await mark(minimumSeconds, 'saved observation after two broad sight samples')),
    playerPosition: personPosition(moved),
  };
  assert.equal((report.beforeQuestion as any).sensitivities, null);
  assert(
    JSON.stringify((report.beforeQuestion as any).contact.value).includes(coat),
    'Saved visual body contains exact coat appearance',
  );
  assert.deepEqual((report.beforeQuestion as any).fear, []);
  assert.deepEqual((report.beforeQuestion as any).flinches, []);
  const appearanceOnly = (report.beforeQuestion as any).jobs.filter((j: any) =>
    /winter fair|study:kest-travel-coat|patterned coat|appearance/i.test(j.request?.text ?? ''),
  );
  assert.deepEqual(appearanceOnly, [], 'No automatic choice expressly about the appearance');
  checks.push(
    'The witness saw the wearer and coat. During the observed interval she had no structured sensitivity, fear appraisal, flinch, or recorded decision explicitly about the appearance.',
  );
  const ready = await wait(
    state,
    (current) =>
      current?.entities?.some(
        (body: any) =>
          body.talkRequiresAi &&
          body.position &&
          Math.hypot(body.position.x - 11, body.position.z - 11) < 0.4,
      ),
    'signed player can speak to the resident',
  );
  const target = ready.entities.find(
    (body: any) =>
      body.talkRequiresAi &&
      body.position &&
      Math.hypot(body.position.x - 11, body.position.z - 11) < 0.4,
  );
  const sent = await post('/api/chat', {
    requestId: 'ask-about-visible-coat',
    npcId: target.id,
    text: question,
    volume: 'normal',
  });
  report.sent = sent;
  assert(sent.ok && sent.jobId, JSON.stringify(sent));
  const finished = await wait(
    () => job(sent.jobId),
    (value) => value && ['completed', 'failed', 'cancelled', 'stale'].includes(value.status),
    'directed question reaches terminal job',
  );
  report.finished = finished;
  assert.equal(finished.status, 'completed', JSON.stringify(finished.outcome));
  assert.equal(finished.outcome?.applied, true, JSON.stringify(finished.outcome));
  const questionContext = report.questionContext as
    | { requestId: string; historyPresent: boolean }
    | undefined;
  assert(
    questionContext?.historyPresent && questionContext.requestId.startsWith(sent.jobId + ':'),
    'The accepted question must supply the authored history to its own decision',
  );
  const responseSpeech = sql.prepare(
    `SELECT e.id,e.payload,a.payload AS received
     FROM history_events e
     LEFT JOIN mind_awareness a ON a.world_id=e.world_id AND a.source_id=e.id AND a.actor_id=?
     WHERE e.world_id=? AND e.response_id=? AND e.payload::jsonb->>'type'='speech'
     ORDER BY e.position`,
  );
  const speechRows = await wait(
    () => responseSpeech.all(id.playerId, id.worldId, sent.jobId),
    (rows) => rows.length > 0,
    'speech from the accepted decision is durably saved',
  );
  assert.equal(
    speechRows.length,
    1,
    'The accepted decision must durably say the scripted reply once',
  );
  const [row] = speechRows;
  const spoken = JSON.parse(row.payload);
  assert.equal(spoken.actorId, id.residentId);
  assert.equal(spoken.data?.text, scriptedReply);
  assert(spoken.audience.includes(id.playerId), 'The occurrence includes the signed player');
  assert(row.received, 'The signed player must receive a personal record of the reply');
  const received = JSON.parse(row.received);
  assert.equal(received.speech?.perception, 'heard');
  assert.equal(received.speech?.intelligibility, 'clear');
  assert.equal(received.content, scriptedReply);
  report.reply = [{ ...spoken, id: row.id }];
  report.playerHearing = {
    eventId: row.id,
    perception: received.speech.perception,
    intelligibility: received.speech.intelligibility,
    text: received.content,
  };
  checks.push(
    'The question supplied the written association to its own decision. Ada spoke one saved reply that the player heard clearly.',
  );
} catch (error) {
  report.failure = String(error?.stack ?? error);
  throw error;
} finally {
  report.provider = controlled?.summary();
  const cleanupErrors: unknown[] = [];
  for (const cleanup of [
    stop,
    () => player?.close(),
    () => runtime?.stop(),
    () => controlled?.close(),
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
    throw new AggregateError(cleanupErrors, 'Coat replay cleanup failed');
}
