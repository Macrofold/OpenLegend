// Temporary J06–J08 observation; run from repository cwd with node --import tsx.
// Usage: node --import tsx /path/observe-shared-inventory.mjs test-results/shared-inventory/evidence
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const expectedSource = {
  'apps/server/src/http.ts': '77ec66ebf3a78c9da940015149ec7b3ef185deb019b7de8715802e8c9a55ca23',
  'apps/server/src/world-service.ts':
    '5ad4f9e65d5d5f32a81d0d1b624f4646cb41372a77bd8450418d842fb23ec06c',
  'apps/server/src/authority.ts':
    '1ec633ddef35250b863d52e48bae91276a938aaabee7ed861c5914190efbadbb',
  'apps/server/src/inventory-view.ts':
    '23a5b2e6e02c3204cb0881101251b2004d282b89932344869c66d9f3299db455',
  'apps/client/src/main.tsx': '08c4e291889452e20d3d94ccd14f5ec66d3fb57322ee850039bc810bcbbd7e62',
  'apps/client/src/api.ts': 'eda3e86f6e17e0c48733de3254c6d0ffeef76c46bacaa5c6b66b6d64e59a011e',
  'apps/client/src/ui/inventory.tsx':
    'cc0c163576ab2dcae2fe73e95704961fde05c847c0ec78456582110105052e4d',
  'apps/client/src/ui/inventory-collection.tsx':
    'd02b6a9e619f38f3095c6f4910365de4e753f4b3e822c64b9b8856d898d72a77',
  'apps/client/src/ui/use-inventory-collection.ts':
    'bddeee69bd02e90d82269bdde2674401abc0453ee6a85ed713bbe1f59bf16b5e',
  'apps/client/src/ui/use-inventory-command.ts':
    '596930ac2c27c67d2e561bcede45099a8cc98a04117116403b7e1885ccdc480e',
  'apps/client/src/ui/container-opening.tsx':
    '4a56a299a9058dfd3ff1162f39c017ceea4600855e263e25aa3ce35795015684',
  'packages/domain/src/item-handling.ts':
    '4df86941dac3bca3abb9b764ce00048fe9cc3bd13892122a81a77cd422395c30',
  'packages/domain/src/objects.ts':
    'c6a926a563eb760a3a5633482fa2a5090a0b5d60c61c755f792e36de29a8fd70',
  'packages/domain/src/object-access.ts':
    'e0682565e85a0133ffcba034e471fed9d175df8d61acb17f87f7a118a1cdd5b6',
  'packages/domain/src/kernel.ts':
    '10582d414a42aa56cf8b795ae505a17e20b2a3c803ae111a26dc9dbbfaeb12bb',
  'tests/fixtures/database.ts': '3566c92c90fe0122e01da0177eefa3142836e1ed6c86b845526348c54c16ac92',
  'tests/fixtures/service.ts': 'e5322bfac774e1a952d3bced7569958389525adf271026a18d2512b1a73f21e7',
  'tests/fixtures/browser.ts': '61673a8e30aa3431bc91a4f1149778ef7da26c68cd827541048478b6c59f38b2',
};
const output = resolve(process.argv[2] ?? 'test-results/shared-inventory/evidence');
await mkdir(dirname(output), { recursive: true });
await mkdir(output); // Preserve evidence from every distinct invocation.
const report = {
  startedAt: new Date().toISOString(),
  checkout: process.env.GITHUB_SHA ?? 'unrecorded',
  scope:
    'Verify the corrected nested-container heading, search and accessible name during permitted reads and access withdrawal; retain the original two-account contest, receipt, late-read and final native checks.',
  captureScope:
    'One actual Inventory workspace locator screenshot after final access withdrawal. The world and animations remain enabled; the original 10-second capture allowance is unchanged.',
  preservedObservation: {
    commit: '0f449430a70f4c4d355bba28c602269b987c1b29',
    nativeCheckout: 'ee04c033c34c0525ad1e6f86b176683b04b33ddd',
    reportSha256: 'd01adf23ec89ad943844085f7a7c38ecac08f3061fae159021e2f92c810902e1',
    outcome:
      'Failed on the final full-page screenshot at 10 seconds; final native sweep not reached. No performance cause established.',
    missingCapture: '03-revoked-pane-after-old-response.png',
    reusedContestCaptures: [
      {
        file: 'docs/ui-ux/runtime/71-native-shared-contest-mike.png',
        sha256: 'dae2474f51bc807a1a2dfc4a0062337589eaf3632199f51f490fe026c8d77b3d',
      },
      {
        file: 'docs/ui-ux/runtime/72-native-shared-contest-ada.png',
        sha256: 'ae2f5dec33f88ac2f20b9dfded537ca4264f5e8e76fe228f661e818c1ce12708',
      },
    ],
  },
  limits: {
    workMs: 180000,
    hardMs: 210000,
    actionMs: 10000,
    assertionMs: 5000,
    navigationMs: 20000,
    captureMs: 10000,
  },
  limitations: [
    'The second identity is a supplied disposable fixture identity enrolled through native authority owners; this does not qualify OIDC login.',
    'A native bag, one branch, one marker and a reachable stance are fixture setup; this does not qualify gathering, walking or access-grant UI.',
    'Transport holds preserve real requests/responses. Browser cancellation is recorded as cancellation, not proof that an aborted response was consumed.',
    'No provider, native assistive-input or uncoached-human usability claim.',
  ],
  commands: [],
  observations: [],
  captures: [],
  pageErrors: [],
  unexpectedRequests: [],
  cleanup: {},
  passed: false,
  providerCostUsd: 0,
  cumulativeTaskProviderCostUsd: 0,
};
let browser,
  game,
  store,
  database,
  base,
  expired = false;
const viewers = [],
  releases = [],
  activeRoutes = [];
const errorText = (error) =>
  error instanceof Error ? (error.stack ?? error.message) : String(error);
const fail = (error) => {
  report.failure ??= errorText(error);
  report.passed = false;
};
const workTimer = setTimeout(() => {
  expired = true;
  fail(new Error('Original 180-second observation work bound expired.'));
  for (const release of releases) release();
  void browser?.close().catch(fail);
}, report.limits.workMs);
const hardTimer = setTimeout(() => {
  fail(new Error('Original 210-second hard bound expired; cleanup is incomplete.'));
  report.cleanup.forcedTermination = true;
  writeFileSync(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  process.exit(1);
}, report.limits.hardMs);
const nativeImport = (path) => import(pathToFileURL(resolve(path)).href);
const sha = async (path) =>
  createHash('sha256')
    .update(await readFile(path))
    .digest('hex');
function gate() {
  let release;
  const wait = new Promise((resolve) => {
    release = resolve;
  });
  releases.push(release);
  return { wait, release };
}
function routeWork(action) {
  return (route) => {
    const pending = action(route).catch(async (error) => {
      fail(error);
      await route.abort().catch(() => {});
    });
    activeRoutes.push(pending);
    return pending;
  };
}
try {
  for (const [path, expected] of Object.entries(expectedSource))
    assert.equal(await sha(path), expected, 'Source pin: ' + path);
  report.sourceSha256 = expectedSource;
  report.runnerSha256 = await sha(new URL(import.meta.url));
  report.builtEntrySha256 = await sha('dist/client/index.html');
  const { chromium, expect: baseExpect } = createRequire(resolve('package.json'))(
    '@playwright/test',
  );
  const expect = baseExpect.configure({ timeout: report.limits.assertionMs });
  const [http, db, fixture, entry, domain, handling, spatialState, spatial, capability] =
    await Promise.all([
      nativeImport('apps/server/src/http.ts'),
      nativeImport('tests/fixtures/database.ts'),
      nativeImport('tests/fixtures/service.ts'),
      nativeImport('tests/fixtures/browser.ts'),
      nativeImport('packages/domain/src/index.ts'),
      nativeImport('packages/domain/src/item-handling.ts'),
      nativeImport('packages/domain/src/spatial-state.ts'),
      nativeImport('packages/spatial/src/index.ts'),
      nativeImport('packages/domain/src/action-capabilities.ts'),
    ]);
  database = db;
  const { PLAYER_ID, NPC_ID, createItemLot, itemFor, itemsForOwner, canAccessContainer } = domain;
  const config = db.readConfig({
    WORLD_SEED: '73',
    AI_BUDGET_USD: '0',
    OPEN_LEGEND_GOD_MODE: 'false',
    OPEN_LEGEND_AUTH_MODE: 'local',
  });
  assert.equal(config.budgetUsd, 0);
  assert.equal(config.godMode, false);
  for (const key of [
    'jevKey',
    'llmKey',
    'embeddingKey',
    'macrofoldKey',
    'macrofoldProviderConnectionId',
    'macrofoldJevConnectionId',
    'macrofoldWorldConnectionId',
  ])
    assert.equal(config[key], '');
  store = await db.testRepository();
  const fixedNow = Date.now();
  game = await http.createGameServer({
    config,
    store,
    production: true,
    tick: false,
    now: () => fixedNow,
  });
  await new Promise((resolve, reject) => {
    game.server.once('error', reject);
    game.server.listen(0, '127.0.0.1', resolve);
  });
  base = 'http://127.0.0.1:' + game.server.address().port;
  // Supply an identity through the existing durable enrollment/session owners; never replace HTTP authentication.
  const identity = {
    issuer: 'https://fixture.openlegend.invalid',
    subject: 'shared-inventory-b',
  };
  const accountId = await game.service.authenticationMutation(() =>
    store.authority.account(identity, 'fixture-shared-inventory-b'),
  );
  const enrolled = await game.service.enrollCharacter(NPC_ID, accountId, () =>
    store.authority.insertGrant({
      worldId: game.service.world.id,
      accountId,
      actorId: NPC_ID,
      revision: 1,
      capabilities: ['play'],
    }),
  );
  assert.equal(enrolled.ok, true, enrolled.message);
  const login = await game.service.authenticationMutation(() =>
    store.authority.login(
      identity,
      fixedNow,
      config.authentication.sessionMs,
      config.capacity.sessions,
    ),
  );
  browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  report.browser = browser.version();
  async function nativeRead(viewer, path, body, status = 200) {
    assert.equal(expired, false);
    assert.ok(viewer.headers, 'Use authority observed from this actual App.');
    const options = { headers: viewer.headers, timeout: 10000 };
    const response =
      body === undefined
        ? await viewer.page.request.get(base + path, options)
        : await viewer.page.request.post(base + path, {
            ...options,
            data: body,
          });
    assert.equal(response.status(), status, path);
    return response.json();
  }
  for (const [actorId, account, token] of [
    [PLAYER_ID, 'local-player', undefined],
    [NPC_ID, accountId, login.token],
  ]) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 960 },
    });
    const viewer = { context, actorId, accountId: account, commands: [], inventoryReads: [] };
    viewers.push(viewer);
    if (token)
      await context.addCookies([
        {
          name: 'ol_session',
          value: token,
          url: base,
          httpOnly: true,
          sameSite: 'Lax',
        },
      ]);
    await context.tracing.start({
      screenshots: false,
      snapshots: true,
      sources: true,
    });
    viewer.tracing = true;
    const page = await context.newPage();
    viewer.page = page;
    page.setDefaultTimeout(report.limits.actionMs);
    page.setDefaultNavigationTimeout(report.limits.navigationMs);
    page.on('pageerror', (error) => report.pageErrors.push({ actorId, message: error.message }));
    page.on('request', (request) => {
      const url = new URL(request.url()),
        headers = request.headers();
      if (url.origin !== base && !['data:', 'blob:'].includes(url.protocol))
        report.unexpectedRequests.push(url.origin + url.pathname);
      if (
        /^\/api\/(?:god|chat|invent|inventions|world-agent)(?:\/|$)/.test(url.pathname) &&
        request.method() === 'POST'
      )
        report.unexpectedRequests.push(url.pathname);
      if (url.pathname === '/api/command') viewer.commands.push(request.postDataJSON());
      if (url.pathname === '/api/inventory') viewer.inventoryReads.push(request.postDataJSON());
      if (headers['x-ol-client'] && headers['x-ol-scope'])
        viewer.headers = {
          Origin: base,
          'X-OL-Client': headers['x-ol-client'],
          'X-OL-Scope': headers['x-ol-scope'],
        };
    });
    await page.goto(base + (token ? '/' : '/auth/login'));
    await entry.enterGame(page);
    await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true');
    assert.equal((await nativeRead(viewer, '/api/session')).accountId, account);
    const state = await nativeRead(viewer, '/api/state');
    assert.equal(state.player.id, actorId);
    assert.equal(state.access.controlling, true);
    assert.equal(state.clock.paused, false);
    viewer.scope = state.access.scope;
    viewer.left = page.locator('.ol-inventory-collection[data-side="belongings"]');
    viewer.right = page.locator('.ol-inventory-collection[data-side="container"]');
  }
  assert.notEqual(viewers[0].scope, viewers[1].scope);
  assert.notEqual(viewers[0].headers['X-OL-Client'], viewers[1].headers['X-OL-Client']);
  const bagId = 'uiux08-shared-bag',
    branchId = 'uiux08-last-branch',
    markerId = 'uiux08-private-marker';
  async function collectionTitle(viewer, label, expectedName) {
    await expect(viewer.right).toHaveAccessibleName(expectedName);
    await expect(viewer.right.getByRole('heading', { level: 3 })).toHaveText(expectedName);
    await expect(
      viewer.right.getByRole('textbox', { name: 'Search ' + expectedName, exact: true }),
    ).toBeVisible();
    const currentRead = viewer.inventoryReads
      .filter((read) => read.containerId !== viewer.actorId)
      .at(-1);
    assert.equal(
      currentRead?.containerId,
      bagId,
      'The displayed right collection still reads the exact selected bag.',
    );
    assert.notEqual(expectedName, 'Items on the ground');
    report.observations.push({
      label,
      actorId: viewer.actorId,
      expectedName,
      selectedContainerId: currentRead.containerId,
      visibleHeading: await viewer.right.getByRole('heading', { level: 3 }).innerText(),
      accessibleName: await viewer.right.getAttribute('aria-label'),
    });
  }
  const quantity = (owner, definition) =>
    itemsForOwner(game.service.world, owner)
      .filter((item) => item.definitionId === definition)
      .reduce((sum, item) => sum + item.quantity, 0);
  const baseline = viewers.map((viewer) => quantity(viewer.actorId, 'wood'));
  report.fixture = await fixture.editWorld(game.service, (world) => {
    createItemLot(world, PLAYER_ID, 'woven_bag', 1, bagId);
    createItemLot(world, bagId, 'wood', 1, branchId);
    createItemLot(world, bagId, 'prepared_fiber', 1, markerId);
    const events = [];
    assert.equal(handling.dropItems(world, world.entities[PLAYER_ID], bagId, 1, events), null);
    const pileId = itemFor(world, bagId).ownerId,
      person = world.entities[NPC_ID],
      pile = world.entities[pileId];
    const before = spatialState.worldPosition(person),
      stance = capability.targetApproachPoint(world, person, pile, world.itemHandling.reach);
    assert.ok(stance);
    assert.equal(
      spatial.canStand(
        spatialState.spatialMap(world),
        stance,
        spatial.BODY_PROFILES[person.spatial.bodyProfileId],
      ),
      true,
    );
    spatialState.setSpatialPosition(world, person, stance, stance.surfaceId);
    for (const viewer of viewers)
      assert.equal(canAccessContainer(world, viewer.actorId, bagId), true);
    return {
      bagId,
      branchId,
      markerId,
      pileId,
      secondActorBefore: before,
      secondActorStance: stance,
      nativeStartingBranches: baseline,
    };
  });
  async function access(label, actors) {
    const result = await game.service.transition((world) =>
      handling.setContainerAccess(world, {
        id: 'uiux08-' + label,
        itemId: bagId,
        expectedRevision: world.entities[bagId].inventoryRevision ?? 0,
        actors,
      }),
    );
    assert.equal(result.ok, true, result.message);
    report.observations.push({ label, result });
  }
  await access('initial-shared-access', [PLAYER_ID, NPC_ID]);
  for (const viewer of viewers) {
    const { page, right, left } = viewer;
    await page.getByRole('button', { name: 'In view', exact: true }).click();
    const nearby = page.locator('#nearbyPanel');
    await nearby
      .locator('[data-entity="' + report.fixture.pileId + '"]')
      .getByRole('button')
      .click();
    await nearby.getByRole('button', { name: 'Open Items on the ground', exact: true }).click();
    await right.locator('[data-item-id="' + bagId + '"]').click();
    await page
      .getByRole('dialog', {
        name: 'Woven bag actions and details',
        exact: true,
      })
      .getByRole('button', { name: /^Open / })
      .click();
    await expect(right.locator('[data-item-id="' + branchId + '"]')).toHaveAttribute(
      'aria-label',
      'Supple branch, 1',
    );
    await expect(right.locator('[data-item-id="' + markerId + '"]')).toBeVisible();
    await collectionTitle(viewer, 'permitted-nested-bag-title', 'Woven bag');
    await expect(left).toHaveAttribute('aria-busy', 'false');
    assert.equal(viewer.commands.length, 0);
  }
  async function capture(viewer, name) {
    assert.equal(report.captures.length, 0);
    const started = Date.now();
    report.captureInProgress = name;
    const subject = viewer.page.locator('.ol-inventory-workspace');
    const bounds = await subject.boundingBox();
    await subject.screenshot({
      path: join(output, name),
      timeout: report.limits.captureMs,
    });
    report.captures.push({
      name,
      actorId: viewer.actorId,
      scope: 'Actual Inventory workspace; locator .ol-inventory-workspace',
      bounds,
      elapsedMs: Date.now() - started,
      sha256: await sha(join(output, name)),
    });
    delete report.captureInProgress;
  }
  // Hold each actual Shift+Enter request before dispatch; both still refer to the same last unit.
  const contests = viewers.map(() => ({
    gate: gate(),
    entered: false,
    done: false,
  }));
  for (const [index, viewer] of viewers.entries())
    await viewer.page.route(
      '**/api/command',
      routeWork(async (route) => {
        const contest = contests[index];
        assert.equal(contest.entered, false);
        contest.entered = true;
        contest.request = route.request().postDataJSON();
        await contest.gate.wait;
        const response = await route.fetch({ timeout: 10000, maxRetries: 0 });
        assert.equal(response.status(), 200);
        contest.result = await response.json();
        await route.fulfill({ response });
        contest.done = true;
      }),
    );
  await Promise.all(
    viewers.map((viewer) =>
      viewer.right.locator('[data-item-id="' + branchId + '"]').press('Shift+Enter'),
    ),
  );
  await expect.poll(() => contests.every((contest) => contest.entered)).toBe(true);
  assert.equal(quantity(bagId, 'wood'), 1);
  for (const contest of contests) contest.gate.release();
  await expect.poll(() => contests.every((contest) => contest.done)).toBe(true);
  assert.equal(contests.filter((contest) => contest.result.ok).length, 1);
  assert.notEqual(contests[0].request.commandId, contests[1].request.commandId);
  for (const [index, viewer] of viewers.entries()) {
    const { request, result } = contests[index];
    assert.equal(viewer.commands.length, 1);
    assert.equal(request.command.type, 'transfer-item');
    assert.equal(request.command.itemId, branchId);
    assert.equal(request.command.targetId, viewer.actorId);
    assert.equal(request.command.quantity, 1);
    const receipt = await nativeRead(viewer, '/api/command/receipt', request);
    assert.equal(receipt.status, 'resolved');
    assert.deepEqual(receipt.result, result);
    assert.equal(quantity(viewer.actorId, 'wood'), baseline[index] + (result.ok ? 1 : 0));
    await expect(viewer.right.locator('[data-item-id="' + branchId + '"]')).toHaveCount(0);
    await expect(viewer.right.locator('[data-item-id="' + markerId + '"]')).toBeVisible();
    await expect(viewer.page.locator('.ol-inventory-feedback')).toContainText(result.message);
    const ownedBranch = itemsForOwner(game.service.world, viewer.actorId).find(
      (item) => item.definitionId === 'wood',
    );
    await expect(viewer.left.locator('[data-item-id="' + ownedBranch.id + '"]')).toHaveAttribute(
      'aria-label',
      'Supple branch, ' + ownedBranch.quantity,
    );
    report.commands.push({
      actorId: viewer.actorId,
      accountId: viewer.accountId,
      scope: viewer.scope,
      input: 'Shift+Enter',
      request,
      result,
      receipt,
      displayedBranchQuantity: ownedBranch.quantity,
    });
    await viewer.page.unroute('**/api/command');
    await collectionTitle(viewer, 'refreshed-contest-bag-title', 'Woven bag');
  }
  assert.equal(quantity(bagId, 'wood'), 0);
  assert.equal(quantity(bagId, 'prepared_fiber'), 1);
  const [revoked, retained] = viewers;
  async function denied(label) {
    assert.equal(canAccessContainer(game.service.world, revoked.actorId, bagId), false);
    await expect(revoked.right.getByRole('alert')).toHaveText('This container is unavailable.');
    await expect(revoked.right.locator('[data-item-id]')).toHaveCount(0);
    const current = await nativeRead(revoked, '/api/state');
    assert.equal(current.player.id, revoked.actorId);
    const currentName =
      current.entities.find((entity) => entity.id === bagId)?.name ??
      current.player.inventory.find((item) => item.id === bagId)?.name ??
      'Container';
    await collectionTitle(revoked, label + '-exact-current-title', currentName);
    const refusal = await nativeRead(revoked, '/api/inventory', { containerId: bagId }, 400);
    assert.equal(refusal.ok, false);
    assert.equal(refusal.items, undefined);
    const readable = await nativeRead(retained, '/api/inventory', {
      containerId: bagId,
    });
    assert.deepEqual(
      readable.items.map((item) => item.id),
      [markerId],
    );
    await expect(retained.right.locator('[data-item-id="' + markerId + '"]')).toBeVisible();
    report.observations.push({
      label,
      freshNativeRefusal: refusal,
      visibleRevokedPane: await revoked.right.innerText(),
      retainedMarkerId: markerId,
    });
  }
  await access('visible-revoke', [retained.actorId]);
  await denied('visible-row-withdrawal');
  await access('restore-for-held-read', [PLAYER_ID, NPC_ID]);
  await expect(revoked.right.locator('[data-item-id="' + markerId + '"]')).toBeVisible();
  await collectionTitle(revoked, 'restored-nested-bag-title', 'Woven bag');
  // Fetch one genuinely permitted native response first; then hold only its browser delivery.
  const late = {
    gate: gate(),
    entered: false,
    fetched: false,
    finished: false,
    fulfilled: false,
    aborted: false,
  };
  revoked.page.on('requestfailed', (request) => {
    if (request === late.request) {
      late.aborted = true;
      late.abortReason = request.failure()?.errorText;
    }
  });
  await revoked.page.route(
    '**/api/inventory',
    routeWork(async (route) => {
      if (late.entered || route.request().postDataJSON().containerId !== bagId)
        return route.continue();
      late.entered = true;
      late.request = route.request();
      const response = await route.fetch({ timeout: 10000, maxRetries: 0 });
      assert.equal(response.status(), 200);
      late.body = await response.json();
      assert.deepEqual(
        late.body.items.map((item) => item.id),
        [markerId],
      );
      late.fetched = true;
      await late.gate.wait;
      try {
        await route.fulfill({ response });
        late.fulfilled = true;
      } catch (error) {
        if (!late.aborted || late.abortReason !== 'net::ERR_ABORTED') throw error;
        late.fulfillmentError = errorText(error);
      }
      late.finished = true;
    }),
  );
  await revoked.right.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect.poll(() => late.fetched).toBe(true);
  await access('held-read-revoke', [retained.actorId]);
  await denied('current-denial-before-old-delivery');
  late.gate.release();
  await expect.poll(() => late.finished).toBe(true);
  await denied('current-denial-after-old-response-release');
  report.lateRead = {
    nativePermittedItemIds: late.body.items.map((item) => item.id),
    fulfilled: late.fulfilled,
    browserAborted: late.aborted,
    abortReason: late.abortReason,
    fulfillmentError: late.fulfillmentError,
    visibleRowsAfterRelease: await revoked.right.locator('[data-item-id]').count(),
  };
  await revoked.page.unroute('**/api/inventory');
  await capture(revoked, '01-revoked-inventory-workspace-after-old-response.png');
  for (const [index, viewer] of viewers.entries()) {
    assert.equal(viewer.commands.length, 1);
    assert.equal(
      quantity(viewer.actorId, 'wood'),
      baseline[index] + (contests[index].result.ok ? 1 : 0),
    );
    const state = await nativeRead(viewer, '/api/state');
    assert.equal(state.player.id, viewer.actorId);
    assert.equal(state.access.controlling, true);
    assert.equal(state.ai.budget.spentUsd, 0);
    assert.equal(state.ai.budget.reservedUsd, 0);
    assert.equal(state.ai.usage.llmCalls + state.ai.usage.jevCalls, 0);
  }
  assert.equal(quantity(bagId, 'wood'), 0);
  assert.equal(quantity(bagId, 'prepared_fiber'), 1);
  assert.deepEqual(report.pageErrors, []);
  assert.deepEqual(report.unexpectedRequests, []);
  assert.deepEqual(await store.recentJobs(), []);
  assert.equal(expired, false);
  assert.equal(report.failure, undefined);
  report.final = {
    branches: viewers.map((viewer) => ({
      actorId: viewer.actorId,
      quantity: quantity(viewer.actorId, 'wood'),
      commands: viewer.commands.length,
    })),
    bagBranches: quantity(bagId, 'wood'),
    bagMarker: quantity(bagId, 'prepared_fiber'),
    nativeControlsAndProviderUsageChecked: true,
    noPaidJobs: true,
    simTime: game.service.world.simTime,
  };
  report.passed = true;
} catch (error) {
  fail(error);
} finally {
  clearTimeout(workTimer);
  for (const release of releases) release();
  async function cleanup(name, action) {
    try {
      await action();
      report.cleanup[name] = true;
    } catch (error) {
      report.cleanup[name] = errorText(error);
      fail(error);
    }
  }
  await cleanup('heldRoutesSettled', () => Promise.all(activeRoutes));
  for (const viewer of viewers) {
    if (viewer.tracing)
      await cleanup('trace-' + viewer.actorId, () =>
        viewer.context.tracing.stop({
          path: join(output, 'trace-' + viewer.actorId + '.zip'),
        }),
      );
    await cleanup('context-' + viewer.actorId, () => viewer.context.close());
  }
  if (game)
    await cleanup('nativeShutdown', async () => {
      const result = await game.shutdown();
      report.cleanup.shutdown = result;
      assert.equal(result.saved, true);
      assert.deepEqual(result.problems, []);
    });
  if (store) await cleanup('repositoryClosed', () => store.close());
  if (browser) await cleanup('browserClosed', () => browser.close());
  if (database) await cleanup('disposableDatabasesDropped', () => database.closeTestDatabases());
  report.finishedAt = new Date().toISOString();
  report.elapsedMs = Date.parse(report.finishedAt) - Date.parse(report.startedAt);
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  hardTimer.unref(); // Do not keep a clean process alive; fail if an owned handle prevents exit.
}
console.log(
  JSON.stringify({
    passed: report.passed,
    output,
    failure: report.failure,
    elapsedMs: report.elapsedMs,
  }),
);
process.exitCode = report.passed ? 0 : 1;
