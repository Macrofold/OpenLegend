// Temporary finite J46 continuation, adapted from the exact d1315ea alternate-world stage.
// Run from the repository root with --import tsx. Native effects and receipts remain real.
// Original six-minute outer, five-minute work and 5m45s hard bounds are retained.
// This segment returns a report even on failure; the caller must require report.passed.
// No invented items, relocated actors, changed world policies or model responses.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const { expect: baseExpect, chromium } = createRequire(resolve('package.json'))('@playwright/test');
const expect = baseExpect.configure({ timeout: 5000 });
const fromCheckout = (path) => import(pathToFileURL(resolve(path)).href);
const [
  { createGameServer },
  { testRepository, readConfig, closeTestDatabases },
  { enterGame },
  domain,
] = await Promise.all([
  fromCheckout('apps/server/src/http.ts'),
  fromCheckout('tests/fixtures/database.ts'),
  fromCheckout('tests/fixtures/browser.ts'),
  fromCheckout('packages/domain/src/index.ts'),
]);

// Filled from the actual checkout during preparation, before any runtime is authorized.
const preparedSourceSha256 = {
  'apps/client/src/design-system/layout.css':
    '4252708accf07af796f68da68a3483a3585aa9a73cad1e44aab356bdffa07619',
  'apps/client/src/main.tsx': 'fe9761baa102d82aaf54f8a505f24d9739e41a17ca8f02fb24cc91145c55bf44',
  'apps/client/src/ui/camp-activity.tsx':
    '6938d36c405fa393c8275e6bfb170e40b3f09a2b8322e6c83c315a4e3585cecf',
  'apps/client/src/ui/camp-activity.css':
    '6df069a1a6b312ab60f6d7d5ea1dd714eb008668e38db318e8138cd918d56422',
  'apps/client/src/ui/activity-object-field.tsx':
    'f3d04b26b7f2665e282bb9834550bb923e9d2f608a7696c90cfed2cd2530a3f8',
  'apps/client/src/ui/inventory.tsx':
    'b2b15b2f46dc7c1884142988d104afb13af425c6e1a76dd594c5c6e2631fc09e',
  'apps/client/src/ui/inventory-collection.tsx':
    'd02b6a9e619f38f3095c6f4910365de4e753f4b3e822c64b9b8856d898d72a77',
  'apps/client/src/ui/panels.tsx':
    '4d88b1d6725b9af725dfddd9633afcf7211a884be4553b7b974823b6fc87541f',
  'apps/client/src/design-system/components.tsx':
    '6b4467102fc219e1857d58011c813fd41565d5af710186887a6470c79230b2dc',
  'apps/server/src/http.ts': 'a9d1250b85eca350e29ae63468a164adb394808fb27f9141c28fbbd589ecb7cf',
  'apps/server/src/config.ts': 'aab34d4101d845046b0049f68742ae3f60bacd19a93aa8034aa94b72d59b06ce',
  'apps/server/src/world-service.ts':
    'b6f71fb68d46f780299cf910e3a85a30145f16fc32a5f2c7337649382c450cce',
  'apps/server/src/activity-requests.ts':
    '4a97ccf680dccfb4ec3461d637eb8f3ddebfc4a5e4a64481b7b16effb3f8856a',
  'apps/server/src/inventory-view.ts':
    '96209f97645f1ea52e4f816b6bae2b0fd7ba96155cdb3e8180baf6759018e337',
  'apps/server/src/view.ts': '2e7adf59d54f158b37ec4069b4bb21ba7d7a8c13ffc5502f6432df6d580299a9',
  'apps/server/src/authority.ts':
    'e4f419ebb7459e197f8e147aa7ebd556639524a933993f2a5012c390b76aaf81',
  'apps/server/src/store.ts': 'd76ef52977f65dbf8cfa3faea2fc64113c5d508c962e99518d5c36b1db2ac4d1',
  'packages/domain/src/world-presets.ts':
    'ca43ef4b4d52eabddc30c14a8ce27ab107cd57a0f51cfc01ecee39eabbf2ec51',
  'packages/domain/src/worlds/base/world.ts':
    '286a0e8509ea935ff19c8241dd0cdc09401c66692428ad2b5708c7991eba361b',
  'packages/domain/src/worlds/base/items.ts':
    'd97f11707a7b23676c1c4e5dac16c4ea192dc66cf633210b7b06a8229c202b76',
  'packages/domain/src/worlds/base/landscape.ts':
    'e05d4debcabc7923c25fdbea9430342b5b574e77ef761beba53f1ea10b26f901',
  'packages/domain/src/worlds/base/first-threat.ts':
    '5ef52b92aa2008d1e6e22bcca67adc51b549272a2282c60acc4c955e022d31bc',
  'packages/domain/src/worlds/reservoir-demo/activity.ts':
    '766eb5f63ee82179b2c303a7c8573af6cbdaf09dff5d3175b8f9f3ca024706d8',
  'packages/domain/src/world-modules.ts':
    '7ceb8bb4f1dd67e4859b1c92f9965ac0be18425a174b96ad4c806693fdd8e7b0',
  'packages/domain/src/kernel.ts':
    '8c1c6fa3dd6fc0422687ddc2307440a9e3ecf6a25280c4766fc3a9504761e02d',
  'packages/domain/src/activity-execution.ts':
    '5c05040ce17f602d697106c0789caf4addd9df0f80d13b1320e8bb7a2c6c3dd1',
  'packages/domain/src/perception.ts':
    'ad95773b4a14fa01eaaa3db7b914d269bd939416f7ce97bf20a47b76422eb047',
  'packages/domain/src/objects.ts':
    '229cca8b5d5dda514bcb38843832c1fab30c42e38feea8a0d08456c4ae2a328b',
  'apps/client/src/retained-request.ts':
    '9beb246ccd69e61f784223803f43aea00576e0bc000cc0c627a59886287f11ea',
  'apps/client/src/api.ts': 'ef9334618576ca899c1b2b52e20aab028e5309a43c5e9a4d33eeda8d607ec2a1',
  'apps/client/src/command-request.ts':
    'd5a0dd481e2d69596a198c688409b7d0e4d8c05f786b40913278fb514cc74829',
  'packages/domain/src/worlds/base/spatial-definitions.ts':
    '9e8bfa41d8f402e2a65838619833de39482b6117be1d60514dcff35133ab852e',
  'apps/server/src/command-receipts.ts':
    '1b072686ab4e4ae440aa4214cda09ebd98903cb7d095cf1c4fa8828edaa7f175',
};
const sourcePaths = Object.keys(preparedSourceSha256);
const hashFile = async (path) =>
  createHash('sha256')
    .update(await readFile(path))
    .digest('hex');
const errorMessage = (error) => (error instanceof Error ? error.message : String(error));
const closeNumber = (actual, expected, label) =>
  assert.ok(Math.abs(actual - expected) < 1e-6, `${label}: ${actual} versus ${expected}`);
const installedIcons = JSON.parse(
  await readFile('apps/client/src/design-system/icons/icons.json', 'utf8'),
);

export async function runAlternateWorldStage({ browser, outputDirectory }) {
  const output = join(outputDirectory, 'alternate-world');
  await mkdir(output, { recursive: true });
  const report = {
    stage: 'alternate-world',
    startedAt: new Date().toISOString(),
    originalPreparationBase: '5afc190268370b6c95223433429a17555e28824d',
    runtimeSource: process.env.GITHUB_SHA ?? 'unrecorded-local-checkout',
    checkout: process.env.GITHUB_SHA ?? 'unrecorded-local-checkout',
    headRef: process.env.GITHUB_HEAD_REF ?? '',
    node: process.version,
    browser: browser.version(),
    executionBounds: {
      outerStepMs: 360000,
      workMs: 300000,
      hardMs: 345000,
      actionMs: 10000,
      assertionMs: 5000,
      navigationMs: 20000,
      captureMs: 10000,
    },
    fixture: {
      presets: ['reservoir-demo', 'touch-demo'],
      seed: 73,
      setup:
        'Fresh native presets, normal player sight and existing possessions/source/residents. No editWorld changes.',
      clock:
        'Automatic host ticking disabled; fixed wall clock and explicit native elapsed-time calls.',
      input:
        'Actual Chromium App clicks at 1440×960 and one 390×844 task/Stop view; browser-issued client identity and current native scope for read-only observations.',
      persistence:
        'Same named testRepository reopened after clean native shutdown; same browser context/login retained.',
      budgetUsd: 0,
    },
    limits: [
      'Two installed presets at one seed; desktop interaction plus one 390×844 task capture/Stop gesture, not arbitrary world-package or device qualification.',
      'Touch-demo player retains normal sight. Resident coarse-touch behavior is checked as a separate native observation, not player touch input.',
      'Real command acknowledgement loss, storage read/cleanup refusal and changed-login recovery are selected cases; no arbitrary grant/account matrix, manual checkpoint restore, provider, native IME or uncoached-human claim.',
    ],
    worlds: [],
    captures: [],
    cleanup: [],
    passed: false,
  };

  try {
    report.sourceSha256 = Object.fromEntries(
      await Promise.all(sourcePaths.map(async (path) => [path, await hashFile(path)])),
    );
    assert.deepEqual(
      report.sourceSha256,
      preparedSourceSha256,
      'Production owners changed after stage preparation; review the segment before running it',
    );
    const assets = (await readdir('dist/client/assets')).filter((name) => /\.(js|css)$/.test(name));
    report.assetSha256 = Object.fromEntries(
      await Promise.all(
        ['dist/client/index.html', ...assets.map((name) => 'dist/client/assets/' + name)].map(
          async (path) => [path, await hashFile(path)],
        ),
      ),
    );
    for (const preset of ['reservoir-demo', 'touch-demo']) {
      const directory = await mkdtemp(join(tmpdir(), 'openlegend-ui-' + preset + '-'));
      const observed = {
        preset,
        initialViewport: { width: 1440, height: 960 },
        commands: [],
        pageErrors: [],
        unexpectedRequests: [],
        passed: false,
      };
      report.worlds.push(observed);
      const fixedNow = Date.now();
      const config = readConfig({
        AI_BUDGET_USD: '0',
        OPEN_LEGEND_AUTH_MODE: 'local',
        OPEN_LEGEND_GOD_MODE: 'false',
        OPEN_LEGEND_WORLD_PRESET: preset,
        WORLD_SEED: '73',
      });
      assert.equal(config.budgetUsd, 0);
      assert.equal(config.godMode, false);
      assert.equal(
        Boolean(config.jevKey || config.llmKey || config.macrofoldKey || config.embeddingKey),
        false,
      );
      let game, repository, context, page, base, browserClient;
      let tracing = false;
      const commandRequests = [];
      let playerId, dropType, dropped;
      const acknowledged = [];
      observed.routeFailures = [];
      const sourceId = 'charge-bank';
      const familyId = 'reservoir-demo:recharge-session';

      async function startHost(reopened = false) {
        repository = await testRepository(directory);
        game = await createGameServer({
          config,
          store: repository,
          production: true,
          tick: false,
          now: () => fixedNow,
        });
        await new Promise((resolveListen, reject) => {
          game.server.once('error', reject);
          game.server.listen(0, '127.0.0.1', resolveListen);
        });
        const address = game.server.address();
        assert.ok(address && typeof address !== 'string');
        base = 'http://127.0.0.1:' + address.port;
        if (!context) {
          context = await browser.newContext({ viewport: observed.initialViewport });
          await context.addInitScript(() => {
            const get = Storage.prototype.getItem,
              remove = Storage.prototype.removeItem;
            Storage.prototype.getItem = function (key) {
              if (
                key.startsWith('open-legend:activity-command:') &&
                get.call(this, 'alternate:deny-read') === 'true'
              )
                throw new DOMException('Controlled task recovery read refusal', 'SecurityError');
              return get.call(this, key);
            };
            Storage.prototype.removeItem = function (key) {
              if (
                key.startsWith('open-legend:activity-command:') &&
                get.call(this, 'alternate:deny-cleanup') === 'true'
              )
                throw new DOMException('Controlled task recovery cleanup refusal', 'SecurityError');
              return remove.call(this, key);
            };
          });
          await context.tracing.start({
            screenshots: false,
            snapshots: true,
            sources: true,
          });
          tracing = true;
        }
        page = await context.newPage();
        page.setDefaultTimeout(10_000);
        page.setDefaultNavigationTimeout(20_000);
        browserClient = undefined;
        page.on('pageerror', (error) => observed.pageErrors.push(error.message));
        page.on('request', (request) => {
          const url = new URL(request.url());
          if (url.origin !== base && !['data:', 'blob:'].includes(url.protocol))
            observed.unexpectedRequests.push(url.origin + url.pathname);
          if (
            /^\/api\/(?:god(?:\/|$)|chat(?:\/|$)|invent(?:\/|$)|world-agent\/)/.test(url.pathname)
          )
            observed.unexpectedRequests.push(url.pathname);
          if (url.origin === base && url.pathname.startsWith('/api/')) {
            browserClient = request.headers()['x-ol-client'] ?? browserClient;
            if (url.pathname === '/api/command') commandRequests.push(request.postDataJSON());
          }
        });
        await page.route('**/api/command', async (route) => {
          const request = route.request().postDataJSON();
          if (!dropType || request.command.type !== dropType) return route.continue();
          dropType = undefined;
          try {
            const native = await route.fetch();
            const result = await native.json();
            assert.equal(native.status(), 200);
            assert.equal(result.ok, true, result.message);
            dropped = { request, result };
            await route.abort('failed');
          } catch (error) {
            observed.routeFailures.push(errorMessage(error));
            await route.abort('failed');
          }
        });
        // Cookies are retained on reopen. A new login would correctly invalidate receipt recovery.
        await page.goto(base + (reopened ? '/' : '/auth/login'));
        await enterGame(page);
        await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true');
        assert.equal(game.service.paused, false);
      }

      async function state() {
        assert.ok(browserClient, 'The actual App must establish its tab identity first');
        const response = await page.request.get(base + '/api/state', {
          headers: { 'X-OL-Client': browserClient },
        });
        assert.equal(response.status(), 200);
        const value = await response.json();
        assert.equal(value.access.controlling, true);
        assert.equal(value.worldId, preset + '-73');
        return value;
      }

      async function readOnly(path, body) {
        const view = await state();
        const response = await page.request.post(base + path, {
          headers: {
            Origin: base,
            'X-OL-Client': browserClient,
            'X-OL-Scope': view.access.scope,
          },
          data: body,
        });
        assert.equal(response.status(), 200, path);
        return response.json();
      }

      async function act(label, expected, gesture) {
        const before = commandRequests.length;
        const [response] = await Promise.all([
          page.waitForResponse((entry) => new URL(entry.url()).pathname === '/api/command'),
          gesture(),
        ]);
        assert.equal(response.status(), 200);
        const request = response.request().postDataJSON();
        const result = await response.json();
        assert.equal(commandRequests.length, before + 1, label + ' must issue one command');
        for (const [key, value] of Object.entries(expected))
          assert.deepEqual(request.command[key], value);
        assert.equal(result.ok, true, result.message);
        const receipt = await readOnly('/api/command/receipt', request);
        assert.equal(receipt.status, 'resolved');
        for (const key of ['ok', 'code', 'message', 'actionId'])
          assert.deepEqual(receipt.result[key], result[key]);
        acknowledged.push({ request, result });
        observed.commands.push({
          label,
          request,
          result,
          receiptStatus: receipt.status,
        });
        return { request, result };
      }

      async function openTask() {
        const nearby = page.locator('#nearbyPanel');
        if (!(await nearby.isVisible()))
          await page.getByRole('button', { name: 'In view', exact: true }).click();
        // Hiding the task retains the already inspected object. Return through
        // the real detail's Back control before selecting this exact list row.
        const back = nearby.getByRole('button', { name: 'Back to In view', exact: true });
        if (await back.isVisible()) await back.click();
        await nearby
          .locator('[data-entity="' + sourceId + '"]')
          .getByRole('button')
          .click();
        await nearby.getByRole('button', { name: /^Recharge from this supply/ }).click();
        await expect(page.locator('#activityPanel')).toBeVisible();
      }
      async function loseReply(type, gesture) {
        dropped = undefined;
        dropType = type;
        const before = commandRequests.length;
        await gesture();
        await expect.poll(() => dropped?.result.ok).toBe(true);
        assert.equal(commandRequests.length, before + 1);
        await expect(page.locator('#activityPanel .ol-task-recovery')).toBeVisible();
        observed.commands.push({
          label: 'Native command committed but acknowledgment withheld',
          request: dropped.request,
          result: dropped.result,
          acknowledgmentLost: true,
        });
        return dropped;
      }
      async function flag(name, enabled) {
        await page.evaluate(
          ({ name, enabled }) => {
            if (enabled) sessionStorage.setItem('alternate:' + name, 'true');
            else sessionStorage.removeItem('alternate:' + name);
          },
          { name, enabled },
        );
      }
      async function prepareAgain() {
        const task = page.locator('#activityPanel');
        const prepare = task.getByRole('button', { name: 'Prepare another task', exact: true });
        if (await prepare.isVisible()) await prepare.click();
        await expect(task.getByRole('button', { name: 'Start task', exact: true })).toBeVisible();
      }
      async function advanceGameSeconds(seconds) {
        // The real host's navigation coordinator settles technical waits. Do not replace it
        // with domain fixture routes, offer elapsed time twice, or call long ticks as suspension.
        await expect.poll(() => domain.navigationBlocked(game.service.world)).toBe(false);
        const target = game.service.world.simTime + seconds;
        await game.service.tick(seconds / (config.baseRatio * game.service.speed), 0);
        await expect
          .poll(async () => {
            await game.service.tick(0, 0);
            return Math.abs(game.service.world.simTime - target) < 1e-6;
          })
          .toBe(true);
        closeNumber(game.service.world.simTime, target, 'Native game time');
      }

      async function sharedPanels(captureName) {
        const view = await state();
        const inventory = await readOnly('/api/inventory', {
          containerId: playerId,
        });
        assert.equal(inventory.ok, true);
        assert.equal(inventory.container.id, playerId);
        assert.equal(inventory.next, undefined);
        assert.deepEqual(
          inventory.items.map((item) => item.id).sort(),
          domain
            .itemsForOwner(game.service.world, playerId)
            .map((item) => item.id)
            .sort(),
        );
        const inventoryPanel = page.locator('#inventoryPanel');
        await page.getByRole('button', { name: 'Inventory', exact: true }).click();
        await expect(inventoryPanel).toBeVisible();
        const own = inventoryPanel.locator('[data-side="belongings"]');
        await expect(own.locator('[data-item-id]')).toHaveCount(inventory.items.length);
        for (const item of inventory.items) {
          const cell = own.locator('[data-item-id="' + item.id + '"]');
          const authoredIcon = game.service.world.itemDefinitions[item.definitionId].icon;
          assert.equal(
            item.icon,
            authoredIcon,
            'Native projection preserves the exact optional authored icon',
          );
          await expect(cell).toBeVisible();
          await expect(cell.locator('.ol-inventory-cell-name')).toHaveText(item.name);
          await expect(cell.locator('.ol-icon-wrap')).toBeVisible();
          if (authoredIcon) {
            assert.ok(
              Object.hasOwn(installedIcons, authoredIcon),
              'The supplied authored item icon is installed',
            );
            await expect(cell.locator('svg.ol-icon')).toBeVisible();
            await expect(cell.locator('.ol-sigil')).toHaveCount(0);
          } else {
            // Shelter pieces legitimately omit icons. The shared production Icon
            // uses their initial as a visible sigil rather than inventing an icon.
            await expect(cell.locator('svg.ol-icon')).toHaveCount(0);
            await expect(cell.locator('.ol-sigil')).toBeVisible();
            await expect(cell.locator('.ol-sigil')).toHaveText(item.name.charAt(0).toUpperCase());
          }
        }
        if (captureName) {
          await page.screenshot({ path: join(output, captureName), timeout: 10000 });
          report.captures.push({
            file: 'alternate-world/' + captureName,
            preset,
            scene: 'Native shared inventory and condition HUD',
            viewport: page.viewportSize(),
          });
        }
        await inventoryPanel.getByRole('button', { name: /^Hide / }).click();
        await page.getByRole('button', { name: 'Character', exact: true }).click();
        const character = page.locator('#characterPanel');
        await expect(
          character.getByRole('tab', { name: 'Condition', exact: true }),
        ).toHaveAttribute('aria-selected', 'true');
        for (const name of ['Charge', 'Integrity']) {
          const attribute = view.player.attributes.find((entry) => entry.name === name);
          assert.ok(attribute);
          await expect(character.getByRole('meter', { name, exact: true })).toHaveAttribute(
            'aria-valuenow',
            String(attribute.value),
          );
        }
        await expect(character.getByRole('meter', { name: /^(Food|Energy)$/ })).toHaveCount(0);
        await expect(character.getByText('Disposition', { exact: true })).toBeVisible();
        assert.deepEqual(view.player.attributes.map((entry) => entry.id).sort(), [
          'clockwork:charge',
          'clockwork:disposition',
          'clockwork:integrity',
        ]);
        await character.getByRole('button', { name: /^Hide / }).click();
        return {
          items: inventory.items.map(({ id, name, quantity, icon }) => ({
            id,
            name,
            quantity,
            icon,
          })),
          attributes: view.player.attributes,
        };
      }

      function savedContents() {
        const world = game.service.world;
        return structuredClone({
          worldId: world.id,
          timeline: game.service.timelineId,
          simTime: world.simTime,
          playerId,
          playerName: world.entities[playerId].name,
          attributes: world.entities[playerId].actor.attributes,
          inventory: domain.itemsForOwner(world, playerId).sort((a, b) => a.id.localeCompare(b.id)),
          source: world.entities[sourceId],
          manifest: world.moduleManifest,
        });
      }

      async function shutdownHost(phase) {
        if (page && !page.isClosed()) await page.close();
        page = undefined;
        if (game) {
          const result = await game.shutdown();
          game = undefined;
          repository = undefined;
          report.cleanup.push({ preset, phase, server: result });
          assert.equal(result.saved, true, 'Native shutdown must confirm the final save');
          assert.deepEqual(result.problems, []);
        } else if (repository) {
          await repository.close();
          repository = undefined;
        }
      }

      try {
        await startHost();
        const initial = await state();
        playerId = initial.player.id;
        const world = game.service.world;
        const player = world.entities[playerId];
        const source = world.entities[sourceId];
        const definition = domain.attributeDefinition(world, source.replenisher.attributeId);
        assert.ok(definition?.reservoir && definition.schema.kind === 'number');
        assert.equal(domain.seesEntity(world, player, source), true);
        assert.equal(
          initial.entities.some((entity) => entity.id === sourceId),
          true,
        );
        assert.equal(initial.godMode, false);
        observed.initialPanels = await sharedPanels(preset + '-01-inventory.png');

        const offered = await readOnly('/api/activity-requests', {
          targetId: sourceId,
        });
        assert.deepEqual(
          offered.requests.map((request) => request.id),
          [familyId],
        );
        assert.deepEqual(
          offered.entries.map(({ familyId: family, targetId }) => [family, targetId]),
          [[familyId, sourceId]],
        );
        const selected = await readOnly('/api/activity-choices', {
          family: familyId,
          field: 'sourceId',
          selectedId: sourceId,
        });
        assert.equal(selected.selected?.id, sourceId);
        assert.equal(selected.selected.accessible, true);
        const incompatible = initial.entities.find(
          (entity) => !world.entities[entity.id].replenisher,
        );
        assert.ok(
          incompatible,
          'Use an actually perceived incompatible object for the negative choice read',
        );
        const refused = await readOnly('/api/activity-requests', {
          targetId: incompatible.id,
        });
        assert.deepEqual(refused.entries, []);
        observed.choices = {
          selected: selected.selected,
          incompatibleId: incompatible.id,
          incompatibleEntries: refused.entries,
        };
        if (preset === 'touch-demo') {
          const residentId = domain.defaultResidentEntityId(world);
          assert.deepEqual(world.entities[residentId].actor.senses, [domain.COARSE_TOUCH.id]);
          assert.equal(domain.seesEntity(world, world.entities[residentId], source), false);
          observed.touch = {
            residentId,
            playerSeesSupply: true,
            residentSeesSupply: false,
            senses: [domain.COARSE_TOUCH.id],
          };
        }

        await openTask();
        const nearby = page.locator('#nearbyPanel');
        let task = page.locator('#activityPanel');
        await expect(task).toContainText(source.name);
        await expect(task.locator('input, select, [role="combobox"]')).toHaveCount(0);
        await expect(task.getByRole('button', { name: 'Start task', exact: true })).toBeEnabled();
        assert.equal(
          commandRequests.length,
          0,
          'Inspection and automatic task preview must not act',
        );
        const before = {
          charge: domain.readAttribute(game.service.world.entities[playerId].actor, definition),
          supply: source.replenisher.remaining,
          simTime: game.service.world.simTime,
        };
        const started = await act(
          'Start installed recharge task',
          {
            type: 'activity-request',
            activityFamilyId: familyId,
            activityArguments: { sourceId, mode: 'enqueue' },
          },
          () => task.getByRole('button', { name: 'Start task', exact: true }).click(),
        );
        await expect(
          task.getByRole('button', { name: 'Prepare another task', exact: true }),
        ).toBeVisible();
        await expect(task.getByRole('button', { name: 'Start task', exact: true })).toBeHidden();
        await task.getByRole('button', { name: /^Hide / }).click();
        await openTask();
        await expect(
          task.getByRole('button', { name: 'Prepare another task', exact: true }),
        ).toBeVisible();
        assert.equal(commandRequests.length, 1, 'Hide/reopen must not restart recharge');
        await advanceGameSeconds(6);
        const activeWorld = game.service.world;
        const action = activeWorld.entities[playerId].actor.action;
        assert.equal(action?.type, 'replenish');
        assert.equal(action.targetId, sourceId);
        assert.ok(action.remainingSeconds > 0 && action.remainingSeconds < action.totalSeconds);
        assert.ok(action.transferred > 0);
        const transferred = Object.values(activeWorld.entities).flatMap((entity) =>
          entity.actor?.action?.type === 'replenish' && entity.actor.action.targetId === sourceId
            ? [
                {
                  actorId: entity.id,
                  amount: entity.actor.action.transferred ?? 0,
                },
              ]
            : [],
        );
        const supplyAfter = activeWorld.entities[sourceId].replenisher.remaining;
        const chargeAfter = domain.readAttribute(activeWorld.entities[playerId].actor, definition);
        assert.ok(supplyAfter >= 0 && supplyAfter < before.supply);
        // Residents keep their native behavior. All still-active source transfers count,
        // while the player's body continues its independently authored drain.
        closeNumber(
          before.supply - supplyAfter,
          transferred.reduce((sum, entry) => sum + entry.amount, 0),
          'Finite source debit across all actors',
        );
        closeNumber(
          chargeAfter,
          before.charge + action.transferred - definition.reservoir.drainPerSecond * 6,
          'Player transfer less continuous drain',
        );
        observed.partial = {
          before,
          chargeAfter,
          supplyAfter,
          playerAction: structuredClone(action),
          transfers: transferred,
        };
        const active = await state();
        assert.equal(active.player.hasWork, true);
        await expect(
          task.getByRole('button', { name: 'Stop all work', exact: true }),
        ).toBeEnabled();
        await expect(nearby).toContainText(Math.round(supplyAfter) + ' units of supply');
        if (preset === 'touch-demo') {
          await page.setViewportSize({ width: 390, height: 844 });
          await expect(page.locator('.ol-hud')).toHaveAttribute('data-narrow', 'true');
          await expect(task).toBeVisible();
          await task
            .getByRole('button', { name: 'Stop all work', exact: true })
            .scrollIntoViewIfNeeded();
          await expect(
            task.getByRole('button', { name: 'Stop all work', exact: true }),
          ).toBeInViewport();
          await expect(
            page.locator('.ol-survival').getByRole('meter', { name: 'Charge', exact: true }),
          ).toBeVisible();
        }
        const captureName = preset + '-02-partial-recharge.png';
        await page.screenshot({ path: join(output, captureName), timeout: 10000 });
        report.captures.push({
          file: 'alternate-world/' + captureName,
          preset,
          scene: 'Partial native recharge, source consumption and reachable Stop control',
          viewport: page.viewportSize(),
        });
        const stopped =
          preset === 'reservoir-demo'
            ? await loseReply('cancel', () =>
                task.getByRole('button', { name: 'Stop all work', exact: true }).click(),
              )
            : await act('Stop all recharge work', { type: 'cancel' }, () =>
                task.getByRole('button', { name: 'Stop all work', exact: true }).click(),
              );
        if (preset === 'reservoir-demo') acknowledged.push(stopped);
        assert.equal(game.service.world.entities[playerId].actor.action, null);
        const stoppedView = await state();
        assert.equal(stoppedView.player.hasWork, false);
        await expect(task.getByRole('button', { name: 'Stop all work', exact: true })).toHaveCount(
          0,
        );
        await advanceGameSeconds(1);
        closeNumber(
          domain.readAttribute(game.service.world.entities[playerId].actor, definition),
          chargeAfter - definition.reservoir.drainPerSecond,
          'Stopped player only drains',
        );
        assert.equal(game.service.world.entities[playerId].actor.action, null);
        if (preset === 'reservoir-demo') {
          const finished = await state();
          assert.equal(
            finished.player.hasWork,
            false,
            'The earlier work has ended before testing recovery guards',
          );
          const canStart = await readOnly('/api/activity-preview', started.request.command);
          assert.equal(
            canStart.ok,
            true,
            'Current native eligibility must not mask the recovery guard',
          );
          const expectedCommands = commandRequests.length;
          await flag('deny-read', true);
          await page.reload();
          await enterGame(page);
          await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true');
          await openTask();
          await prepareAgain();
          await expect(task).toContainText(
            'This browser could not read the original task request.',
          );
          await expect(
            task.getByRole('button', { name: 'Start task', exact: true }),
          ).toBeDisabled();
          assert.equal(commandRequests.length, expectedCommands);
          await flag('deny-read', false);
          await flag('deny-cleanup', true);
          const beforeRecovery = savedContents();
          await task.getByRole('button', { name: 'Read retained request', exact: true }).click();
          await expect(task).toContainText(
            'The original task result is known, but its recovery record could not be cleared.',
          );
          await expect(
            task.getByRole('button', { name: 'Start task', exact: true }),
          ).toBeDisabled();
          assert.deepEqual(
            savedContents(),
            beforeRecovery,
            'Receipt inspection cannot repeat work or advance game time',
          );
          assert.equal(commandRequests.length, expectedCommands);
          const captureName = 'reservoir-demo-03-recovery-storage-blocked.png';
          await page.screenshot({ path: join(output, captureName), timeout: 10000 });
          report.captures.push({
            file: 'alternate-world/' + captureName,
            preset,
            scene:
              'Known native Stop result retained while browser cleanup fails, after earlier work ended',
            viewport: page.viewportSize(),
          });
          await flag('deny-cleanup', false);
          await task.getByRole('button', { name: 'Check request result', exact: true }).click();
          await expect(task.locator('.ol-task-recovery')).toBeHidden();
          assert.equal(commandRequests.length, expectedCommands);
          await prepareAgain();
          await expect(task.getByRole('button', { name: 'Start task', exact: true })).toBeEnabled();
          const permitted = await act(
            'Deliberate new recharge after original cleanup',
            started.request.command,
            () => task.getByRole('button', { name: 'Start task', exact: true }).click(),
          );
          assert.notEqual(permitted.request.commandId, stopped.request.commandId);
          await act('Stop the later permitted recharge', { type: 'cancel' }, () =>
            task.getByRole('button', { name: 'Stop all work', exact: true }).click(),
          );
          assert.equal(game.service.world.entities[playerId].actor.action, null);
          observed.storageRecovery = {
            originalStopId: stopped.request.commandId,
            originalStopRecovered: true,
            earlierWorkHadEnded: true,
            unreadableBlocked: true,
            failedCleanupBlocked: true,
            noReplayCommands: expectedCommands,
            laterPermittedStartId: permitted.request.commandId,
          };
        }
        const retained = savedContents();
        observed.stopped = {
          charge: domain.readAttribute(game.service.world.entities[playerId].actor, definition),
          sourceRemaining: game.service.world.entities[sourceId].replenisher.remaining,
          hasWork: false,
        };
        await shutdownHost('before reopen');

        await startHost(true);
        // The restart creates a different Page; locators retain their original Page.
        task = page.locator('#activityPanel');
        assert.deepEqual(
          savedContents(),
          retained,
          'Same-owned PostgreSQL restart must retain identity, exact contents, source, attributes, time and installed manifest',
        );
        const reopened = await state();
        assert.equal(reopened.access.accountId, initial.access.accountId);
        assert.equal(reopened.access.commandRecoveryScope, stoppedView.access.commandRecoveryScope);
        assert.equal(reopened.player.hasWork, false);
        assert.equal(game.service.world.entities[playerId].actor.action, null);
        for (const original of acknowledged) {
          const receipt = await readOnly('/api/command/receipt', original.request);
          assert.equal(receipt.status, 'resolved');
          for (const key of ['ok', 'code', 'message', 'actionId'])
            assert.deepEqual(receipt.result[key], original.result[key]);
        }
        observed.reopenedPanels = await sharedPanels();
        const availableAgain = await readOnly('/api/activity-requests', {
          targetId: sourceId,
        });
        assert.deepEqual(
          availableAgain.entries.map((entry) => entry.familyId),
          [familyId],
        );
        assert.equal(
          commandRequests.length,
          preset === 'reservoir-demo' ? 4 : 2,
          'Restart and receipt inspection must not replay either command',
        );
        observed.recovery = {
          worldId: retained.worldId,
          playerId,
          timeline: retained.timeline,
          simTime: retained.simTime,
          exactContentsRetained: true,
          originalReceiptsResolved: acknowledged.length,
          commandReplay: false,
        };
        if (preset === 'reservoir-demo') {
          await openTask();
          await prepareAgain();
          const oldAccess = await state();
          const oldPending = await loseReply('activity-request', () =>
            task.getByRole('button', { name: 'Start task', exact: true }).click(),
          );
          const beforeNewLogin = commandRequests.length;
          const oldKey =
            'open-legend:activity-command:' +
            oldAccess.access.commandRecoveryScope +
            ':' +
            oldAccess.worldId +
            ':' +
            oldAccess.saveTimeline +
            ':' +
            playerId;
          const retainedOriginal = await page.evaluate(
            (key) => JSON.parse(sessionStorage.getItem(key)),
            oldKey,
          );
          assert.deepEqual(retainedOriginal.request, {
            commandId: oldPending.request.commandId,
            commandEpoch: oldPending.request.commandEpoch,
          });
          assert.deepEqual(retainedOriginal.action.command, oldPending.request.command);
          await page.getByRole('button', { name: 'Game', exact: true }).click();
          await expect(page.locator('.ol-game-menu')).toBeVisible();
          const loggedOutDocument = page.waitForEvent('domcontentloaded', { timeout: 20_000 });
          await page.getByRole('button', { name: 'Log Out', exact: true }).click();
          await loggedOutDocument;
          await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
          await page.getByRole('link', { name: 'Sign in', exact: true }).click();
          await enterGame(page);
          await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true');
          const fresh = await state();
          assert.notEqual(fresh.access.privateDraftScope, oldAccess.access.privateDraftScope);
          assert.notEqual(fresh.access.commandRecoveryScope, oldAccess.access.commandRecoveryScope);
          assert.equal(await page.evaluate((key) => sessionStorage.getItem(key), oldKey), null);
          await openTask();
          await expect(task.locator('.ol-task-recovery')).toBeHidden();
          const inaccessible = await readOnly('/api/command/receipt', oldPending.request);
          assert.equal(inaccessible.ok, false);
          assert.equal(inaccessible.status, 'unavailable');
          assert.equal(
            commandRequests.length,
            beforeNewLogin,
            'Changed-session return cannot replay the old command',
          );
          observed.changedSession = {
            previousPrivateRecordCleared: true,
            oldReceiptStatus: inaccessible.status,
            replayed: false,
            commandCount: beforeNewLogin,
          };
        }
        const usage = await game.service.store.usage(0);
        assert.equal(usage.usage.jevCalls, 0);
        assert.equal(usage.usage.llmCalls, 0);
        assert.equal(usage.budget.spentUsd, 0);
        assert.equal(usage.budget.reservedUsd, 0);
        observed.usage = usage;
        assert.deepEqual(observed.routeFailures, []);
        assert.deepEqual(observed.pageErrors, []);
        assert.deepEqual(observed.unexpectedRequests, []);
        observed.passed = true;
      } catch (error) {
        observed.failure = errorMessage(error);
      } finally {
        for (const [name, close] of [
          ['server', () => shutdownHost('final')],
          [
            'trace',
            async () => {
              if (tracing)
                await context.tracing.stop({
                  path: join(output, preset + '-trace.zip'),
                });
            },
          ],
          ['context', () => context?.close()],
          ['temporary directory', () => rm(directory, { recursive: true, force: true })],
        ]) {
          try {
            await close();
          } catch (error) {
            observed.passed = false;
            report.cleanup.push({ preset, name, failure: errorMessage(error) });
          }
        }
      }
      if (observed.pageErrors.length || observed.unexpectedRequests.length) {
        observed.passed = false;
        observed.failure ??= 'Unexpected page error or request, including during owned cleanup';
      }
      if (!observed.passed)
        throw new Error(preset + ': ' + (observed.failure ?? 'owned cleanup failed'));
    }
    assert.equal(report.captures.length, 5);
    report.passed = true;
  } catch (error) {
    report.failure = errorMessage(error);
  } finally {
    report.finishedAt = new Date().toISOString();
    await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  }
  return report;
}

// Standalone wrapper retains the original stage's outer bounds and disposes only its own resources.
const outputDirectory = resolve(process.argv[2] ?? 'test-results/ui-completion-alternate');
await mkdir(outputDirectory, { recursive: true });
let ownedBrowser, finalReport;
const outerCleanup = [];
const workTimer = setTimeout(() => {
  void ownedBrowser?.close();
}, 300000);
const hardTimer = setTimeout(() => {
  writeFileSync(
    join(outputDirectory, 'forced-termination.json'),
    JSON.stringify({
      passed: false,
      cleanupUnconfirmed: true,
      reason: 'Original 345-second hard bound expired.',
    }) + '\n',
  );
  process.exit(1);
}, 345000);
try {
  assert.equal(process.env.AI_BUDGET_USD, '0');
  const databaseUrl = new URL(process.env.OPENLEGEND_TEST_DATABASE_URL);
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(databaseUrl.hostname));
  ownedBrowser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  finalReport = await runAlternateWorldStage({ browser: ownedBrowser, outputDirectory });
} finally {
  clearTimeout(workTimer);
  for (const [name, close] of [
    ['owned browser', () => ownedBrowser?.close()],
    ['owned test databases', () => closeTestDatabases()],
  ]) {
    try {
      await close();
      outerCleanup.push({ name, closed: true });
    } catch (error) {
      outerCleanup.push({ name, failure: errorMessage(error) });
      if (finalReport) {
        finalReport.passed = false;
        finalReport.failure ??= 'Owned outer cleanup failed';
      }
    }
  }
  await writeFile(
    join(outputDirectory, 'outer-cleanup.json'),
    JSON.stringify({ cleanup: outerCleanup }, null, 2) + '\n',
  );
  if (finalReport)
    await writeFile(
      join(outputDirectory, 'alternate-world', 'report.json'),
      JSON.stringify(finalReport, null, 2) + '\n',
    );
  hardTimer.unref();
}
console.log(
  JSON.stringify({
    passed: finalReport?.passed === true,
    outputDirectory,
    failure: finalReport?.failure,
    providerCostUsd: 0,
  }),
);
process.exitCode = finalReport?.passed ? 0 : 1;
