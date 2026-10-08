// Run from the repository with AI_BUDGET_USD=0 and an explicit disposable-DB admin URL.
// node --import tsx /path/observe-inventory-admission.mjs /path/evidence
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = process.cwd(),
  output = resolve(process.argv[2] ?? 'test-results/inventory-admission');
await mkdir(output, { recursive: true });
const report = { source: {}, observations: [], providerCalls: 0, networkCalls: 0, passed: false };
const load = (path) => import(pathToFileURL(resolve(root, path)).href);
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => {
  report.networkCalls++;
  throw new Error('Network transport is blocked in this native scenario.');
};
let db, service, store, director;
const bounded = async (label, operation, ms = 5000) => {
  let timer;
  try {
    return await Promise.race([
      operation,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(label + ' exceeded ' + ms + 'ms')), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};
try {
  for (const [path, expected] of Object.entries({
    'apps/server/src/inventory-view.ts':
      '1473f127255a7e016d4e00090cce5b191af84ba2862ac096e76d6da29200a3fc',
    'apps/server/src/ai-director.ts':
      '01853c146bad9d0ada30523bfea581fbf9d50935dddff34856af035da1c35341',
  })) {
    const sha = createHash('sha256')
      .update(await readFile(resolve(root, path)))
      .digest('hex');
    assert.equal(sha, expected, path);
    report.source[path] = sha;
  }
  const [
    database,
    fixture,
    domain,
    handling,
    spatial,
    capabilities,
    projection,
    worldService,
    aiDirector,
  ] = await Promise.all([
    load('tests/fixtures/database.ts'),
    load('tests/fixtures/service.ts'),
    load('packages/domain/src/index.ts'),
    load('packages/domain/src/item-handling.ts'),
    load('packages/domain/src/spatial-state.ts'),
    load('packages/domain/src/action-capabilities.ts'),
    load('apps/server/src/inventory-view.ts'),
    load('apps/server/src/world-service.ts'),
    load('apps/server/src/ai-director.ts'),
  ]);
  db = database;
  const config = db.readConfig({
    WORLD_SEED: '73',
    AI_BUDGET_USD: '0',
    OPEN_LEGEND_GOD_MODE: 'false',
    OPEN_LEGEND_AUTH_MODE: 'local',
  });
  assert.equal(config.budgetUsd, 0);
  for (const key of ['jevKey', 'llmKey', 'embeddingKey', 'macrofoldKey'])
    assert.equal(config[key], '');
  store = await bounded('disposable repository creation', db.testRepository(), 15000);
  const now = Date.now();
  service = new worldService.WorldService(store, config, () => now);
  await bounded('native world/control initialization', fixture.enterLocalWorld(service), 30000);
  await bounded('native presence', service.setPresence('inventory-admission-fixture', true));
  await bounded('native resume', service.control({ paused: false }));
  const { PLAYER_ID, NPC_ID, createItemLot, itemFor, canAccessContainer, custodian } = domain;
  const identity = {
    issuer: 'https://fixture.openlegend.invalid',
    subject: 'inventory-admission-guest',
  };
  const accountId = await service.authenticationMutation(() =>
    store.authority.account(identity, 'inventory-admission-guest'),
  );
  const enrollment = await service.enrollCharacter(NPC_ID, accountId, () =>
    store.authority.insertGrant({
      worldId: service.world.id,
      accountId,
      actorId: NPC_ID,
      revision: 1,
      capabilities: ['play'],
    }),
  );
  assert.equal(enrollment.ok, true, enrollment.message);
  const login = await service.authenticationMutation(() =>
    store.authority.login(identity, now, config.authentication.sessionMs, config.capacity.sessions),
  );
  const session = await store.authority.authenticate(login.token, now);
  const guest = await store.authority.scope(
    session,
    service.world.id,
    service.timelineId,
    'inventory-admission-guest',
  );
  const bagId = 'review-disclosure-bag',
    itemId = 'review-disclosure-fiber';
  await fixture.editWorld(service, (world) => {
    createItemLot(world, PLAYER_ID, 'woven_bag', 1, bagId);
    createItemLot(world, bagId, 'prepared_fiber', 2, itemId);
    const person = world.entities[NPC_ID];
    const stance = capabilities.targetApproachPoint(
      world,
      person,
      world.entities[PLAYER_ID],
      world.itemHandling.reach,
    );
    assert.ok(stance, 'reachable guest stance');
    spatial.setSpatialPosition(world, person, stance, stance.surfaceId);
  });
  const access = async (actors) => {
    const result = await service.transition((world) =>
      handling.setContainerAccess(world, {
        id: crypto.randomUUID(),
        itemId: bagId,
        expectedRevision: world.entities[bagId].inventoryRevision ?? 0,
        actors,
      }),
    );
    assert.equal(result.ok, true, result.message);
  };
  await access([PLAYER_ID, NPC_ID]);
  assert.equal(custodian(service.world, itemId), PLAYER_ID);
  assert.equal(canAccessContainer(service.world, NPC_ID, bagId), true);
  const declare = async (disclosure, holderId) => {
    const result = await service.transition((world) =>
      handling.declareOwnership(world, {
        id: crypto.randomUUID(),
        itemId,
        expectedRevision: world.entities[itemId].declaredOwner?.revision ?? 0,
        holderId,
        disclosure,
      }),
    );
    assert.equal(result.ok, true, result.message);
  };
  const rows = (scope) => ({
    page: projection
      .containerPage(service, scope, { containerId: bagId })
      .items.find((item) => item.id === itemId),
    compact: projection.inventoryItemsView(service, scope, [itemFor(service.world, itemId)])[0],
  });
  await declare('custodian', NPC_ID);
  const privateGuest = rows(guest),
    privateCustodian = rows(service.localScope);
  for (const row of Object.values(privateGuest)) {
    assert.ok(row);
    assert.equal(Object.hasOwn(row, 'declaredOwner'), false);
  }
  for (const row of Object.values(privateCustodian))
    assert.ok(row.declaredOwner?.name && row.declaredOwner.revision === 1);
  report.observations.push({
    label: 'private declaration hidden from permitted guest, visible to physical custodian',
    guest: privateGuest,
    custodian: privateCustodian,
  });
  await declare('public', NPC_ID);
  const publicGuest = rows(guest),
    publicCustodian = rows(service.localScope);
  for (const row of Object.values(publicGuest))
    assert.ok(row.declaredOwner?.name && row.declaredOwner.revision === 2);
  for (const row of Object.values(publicCustodian)) assert.equal(row.declaredOwner.revision, 2);
  report.observations.push({
    label: 'public declaration visible through both projection routes',
    guest: publicGuest,
    custodian: publicCustodian,
  });
  await declare('custodian', null);
  for (const row of Object.values(rows(guest)))
    assert.equal(Object.hasOwn(row, 'declaredOwner'), false);
  for (const row of Object.values(rows(service.localScope)))
    assert.equal(row.declaredOwner.name, 'No declared owner');
  await access([PLAYER_ID]);
  assert.throws(
    () => projection.containerPage(service, guest, { containerId: bagId }),
    /unavailable/,
  );
  report.observations.push({
    label: 'null private declaration hidden; contents revocation still refuses the guest page',
  });
  const noProvider = async () => {
    report.providerCalls++;
    throw new Error('Provider dispatch is forbidden.');
  };
  director = new aiDirector.AiDirector(
    service,
    { judge: noProvider, generate: noProvider },
    () => now,
  );
  const visible = new Set(service.observe(PLAYER_ID).visibleEntities.map((entity) => entity.id));
  assert.equal(
    visible.has(PLAYER_ID),
    false,
    'self intentionally absent from other visible entities',
  );
  const hidden = Object.values(service.world.entities).find(
    (entity) => entity.id !== PLAYER_ID && !visible.has(entity.id) && !entity.item,
  );
  assert.ok(hidden, 'an actual unperceived entity is required');
  const before = JSON.stringify(service.world);
  const hiddenResult = await bounded(
    'hidden-target admission',
    director.submitAction('review-hidden-target', 'wait 1 minutes', 'replace', hidden.id),
  );
  assert.equal(hiddenResult.ok, false);
  assert.equal(hiddenResult.code, 'target');
  assert.equal(
    JSON.stringify(service.world),
    before,
    'rejected hidden target changes no native world state',
  );
  const selfResult = await bounded(
    'self-target native wait admission',
    director.submitAction('review-self-target', 'wait 1 minutes', 'replace', PLAYER_ID),
  );
  assert.equal(selfResult.ok, true, selfResult.message);
  assert.ok(selfResult.jobId);
  const job = await store.getJob(selfResult.jobId);
  assert.equal(job.kind, 'action');
  assert.equal(job.status, 'completed');
  assert.ok(
    service.world.responseReceipts[selfResult.jobId]?.components.action.ok,
    'native action receipt committed',
  );
  const afterSelf = JSON.stringify(service.world);
  const replay = await bounded(
    'same request identity replay',
    director.submitAction('review-self-target', 'wait 1 minutes', 'replace', PLAYER_ID),
  );
  assert.equal(replay.code, 'duplicate');
  assert.equal(JSON.stringify(service.world), afterSelf);
  report.observations.push({
    label:
      'exact self accepted by typed native wait; actual hidden entity refused; same ID replays without another change',
    hiddenTarget: hidden.id,
    hiddenResult,
    selfResult,
    replay,
  });
  report.usage = await store.usage(config.budgetUsd);
  assert.equal(report.usage.usage.jevCalls, 0);
  assert.equal(report.usage.usage.llmCalls, 0);
  assert.equal(report.providerCalls, 0);
  assert.equal(report.networkCalls, 0);
  report.passed = true;
} catch (error) {
  report.error = error instanceof Error ? error.stack : String(error);
  process.exitCode = 1;
} finally {
  try {
    await director?.close();
    service?.releaseHostWork();
    await db?.closeTestDatabases();
  } catch (error) {
    report.cleanupError = String(error);
    report.passed = false;
    process.exitCode = 1;
  }
  globalThis.fetch = originalFetch;
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(
    JSON.stringify({
      passed: report.passed,
      observations: report.observations.length,
      providerCalls: report.providerCalls,
      networkCalls: report.networkCalls,
      error: report.error,
      cleanupError: report.cleanupError,
    }),
  );
}
