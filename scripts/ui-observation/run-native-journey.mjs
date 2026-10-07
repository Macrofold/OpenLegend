import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

// One actual App/server/PostgreSQL journey. No generated events, mocked state,
// provider replies, database writes, or extra gameplay actions prepare this run.
const repository = resolve(process.env.OPENLEGEND_OBSERVATION_ROOT ?? process.cwd());
assert.ok(
  process.argv[2] && process.argv[3],
  'Provide the prepared setup JSON and a new output directory.',
);
const setupPath = resolve(process.argv[2]);
const manifest = JSON.parse(await readFile(setupPath, 'utf8'));
assert.equal(
  manifest.executionReady,
  true,
  'Prepare and freeze the current built setup before a run.',
);
assert.equal(
  manifest.repositoryPath,
  repository,
  'Use only the source checkout recorded by setup.',
);
const output = resolve(process.argv[3]);
assert.ok(
  output !== repository && !output.startsWith(repository + sep),
  'Keep raw observations outside the repository.',
);
await mkdir(output, { recursive: false });
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const started = Date.now();
const report = {
  source: manifest.source,
  scope: manifest.scope,
  started: new Date(started).toISOString(),
  setup: {
    seededEvents: 0,
    tick: false,
    providerBudgetUsd: 0,
    viewport: manifest.desktop,
  },
  steps: [],
  gameplayRequests: [],
  controls: [],
  eventReads: [],
  captures: [],
  pageErrors: [],
  guardFailures: [],
  blockedRequests: [],
  cleanup: {},
  status: 'incomplete',
};
const checkpoint = async () =>
  writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2));
function record(name, details = {}) {
  const entry = { name, elapsedMs: Date.now() - started, ...details };
  report.steps.push(entry);
  console.log(JSON.stringify(entry));
}

let browser;
let context;
let page;
let game;
let closeTestDatabases;
let faultArmed = false;
let faultCount = 0;
let interactionStarted = false;
let cancelled = false;
let phase = 'source preflight';
const pendingResponses = new Set();
let controllingAppAccess;
let observedAppHeaders;
let appHeaders;

async function bounded(name, operation, milliseconds) {
  let timer;
  const work = Promise.resolve().then(operation);
  // Closing a browser may settle an assertion after the journey deadline.
  work.catch(() => {});
  try {
    return await Promise.race([
      work,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${name} exceeded ${milliseconds}ms`)),
          milliseconds,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

try {
  for (const file of manifest.files) {
    const bytes = await readFile(join(repository, file.path));
    assert.equal(digest(bytes), file.sha256, `Source changed: ${file.path}`);
  }
  assert.ok(
    process.env.OPENLEGEND_TEST_DATABASE_URL,
    'An explicit disposable PostgreSQL URL is required.',
  );
  const [{ chromium, expect }, server, fixtures, entry, domain] = await Promise.all([
    import(pathToFileURL(join(repository, 'node_modules/@playwright/test/index.mjs')).href),
    import(pathToFileURL(join(repository, 'apps/server/src/http.ts')).href),
    import(pathToFileURL(join(repository, 'tests/fixtures/database.ts')).href),
    import(pathToFileURL(join(repository, 'tests/fixtures/browser.ts')).href),
    import(pathToFileURL(join(repository, 'packages/domain/src/index.ts')).href),
  ]);
  closeTestDatabases = fixtures.closeTestDatabases;
  report.sourceFilesChecked = manifest.files.length;
  report.runnerSha256 = digest(await readFile(new URL(import.meta.url)));
  report.setupSha256 = digest(await readFile(setupPath));
  report.tooling = manifest.tooling;

  const scenario = async () => {
    phase = 'native startup';
    const fixtureNow = Date.now();
    game = await server.createGameServer({
      config: fixtures.readConfig({
        AI_BUDGET_USD: '0',
        OPEN_LEGEND_GOD_MODE: 'false',
      }),
      store: await fixtures.testRepository(),
      production: true,
      tick: false,
      now: () => fixtureNow,
    });
    if (cancelled) {
      await game.shutdown(30_000);
      throw new Error('Journey deadline passed during native startup.');
    }
    await new Promise((done, reject) => {
      game.server.once('error', reject);
      game.server.listen(0, '127.0.0.1', done);
    });
    const address = game.server.address();
    assert.ok(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}`;
    browser = await chromium.launch({
      headless: true,
      timeout: 15_000,
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    });
    if (cancelled) {
      await browser.close();
      throw new Error('Journey deadline passed during browser startup.');
    }
    report.browser = browser.version();
    context = await browser.newContext({ viewport: manifest.desktop });
    await context.tracing.start({
      screenshots: true,
      snapshots: true,
      sources: false,
    });
    await context.route('**/*', async (route) => {
      try {
        if (cancelled) {
          await route.abort('aborted');
          return;
        }
        const request = route.request();
        const url = new URL(request.url());
        const local = url.origin === base;
        const headers = request.headers();
        if (local && headers['x-ol-client'] && headers['x-ol-scope']) {
          const observed = {
            'x-ol-client': headers['x-ol-client'],
            'x-ol-scope': headers['x-ol-scope'],
          };
          if (appHeaders)
            assert.deepEqual(
              observed,
              appHeaders,
              "The App's request authority changed during the fixed journey.",
            );
          observedAppHeaders = observed;
        }
        const paidPath =
          /^\/api\/(?:chat(?:\/|$)|invent(?:\/|$)|inventions\/submit|action-attempt|world-agent\/(?:messages|continue))/;
        if (!local || paidPath.test(url.pathname)) {
          report.blockedRequests.push({
            origin: url.origin,
            path: url.pathname,
            method: request.method(),
          });
          await route.abort('blockedbyclient');
          return;
        }
        if (request.method() === 'POST' && url.pathname === '/api/command') {
          const body = request.postDataJSON();
          const expected = report.gameplayRequests.length === 0 ? 'gather' : 'cancel';
          assert.ok(
            report.gameplayRequests.length < 2,
            'Only one Gather and one Stop are permitted.',
          );
          assert.equal(body.command?.type, expected, 'Unexpected gameplay action.');
          report.gameplayRequests.push({
            body,
            elapsedMs: Date.now() - started,
          });
        }
        if (interactionStarted && request.method() === 'POST' && url.pathname === '/api/control') {
          const body = request.postDataJSON();
          assert.ok(
            report.controls.length < 2,
            'Only one deliberate pause/resume pair is permitted.',
          );
          assert.equal(body.paused, report.controls.length === 0, 'Unexpected clock operation.');
          report.controls.push({
            paused: body.paused,
            elapsedMs: Date.now() - started,
          });
        }
        if (request.method() === 'GET' && url.pathname === '/api/world-events' && faultArmed) {
          faultArmed = false;
          faultCount++;
          assert.equal(faultCount, 1);
          // The real native scoped read runs. Only this successful read's delivery
          // is replaced by a clear failure, so Retry still uses the same real owner.
          const response = await route.fetch({ timeout: manifest.interactionTimeoutMs });
          assert.equal(
            response.status(),
            200,
            'The native history read itself must succeed before delivery failure.',
          );
          const body = await response.json();
          report.injectedFailure = {
            query: url.search,
            nativeStatus: response.status(),
            nativeEventIds: body.events.map((event) => event.id),
            elapsedMs: Date.now() - started,
          };
          await route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({
              message: 'This history read did not finish. Retry reading the same events.',
            }),
          });
          return;
        }
        await route.continue();
      } catch (error) {
        report.guardFailures.push({ phase, message: String(error) });
        await route.abort('blockedbyclient').catch(() => {});
      }
    });
    page = await context.newPage();
    page.setDefaultTimeout(manifest.interactionTimeoutMs);
    page.setDefaultNavigationTimeout(30_000);
    page.on('pageerror', (error) => report.pageErrors.push(error.message));
    page.on('response', (response) => {
      const url = new URL(response.url());
      if (!['/api/state', '/api/world-events', '/api/command'].includes(url.pathname)) return;
      const work = (async () => {
        const body = await response.json();
        if (url.pathname === '/api/state') {
          if (response.status() === 200 && body.access?.controlling)
            controllingAppAccess = {
              ...body.access,
              clientId: response.request().headers()['x-ol-client'],
            };
        } else if (url.pathname === '/api/world-events') {
          report.eventReads.push({
            query: url.search,
            status: response.status(),
            eventIds: body.events?.map((event) => event.id),
            scanLimited: body.scanLimited,
            hasOlderPage: !!body.nextCursor,
            elapsedMs: Date.now() - started,
          });
        } else {
          const request = response.request().postDataJSON();
          const observation = report.gameplayRequests.find(
            (item) => item.body.commandId === request.commandId,
          );
          if (observation) observation.result = { status: response.status(), ...body };
        }
      })();
      pendingResponses.add(work);
      work.catch((error) => report.pageErrors.push(`Response observation: ${error.message}`));
      work.finally(() => pendingResponses.delete(work)).catch(() => {});
    });
    const nativeRead = async (path) => {
      assert.ok(appHeaders, "First capture the controlling App's actual request headers.");
      const response = await page.request.get(`${base}${path}`, {
        headers: appHeaders,
        timeout: manifest.interactionTimeoutMs,
      });
      assert.equal(response.status(), 200);
      return response.json();
    };
    const currentView = async () => {
      const view = await nativeRead('/api/state');
      assert.equal(view.access?.scope, appHeaders['x-ol-scope']);
      assert.equal(
        view.access.controlling,
        true,
        "The read must use this App's controlling projection.",
      );
      assert.equal(view.access.actorId, controllingAppAccess.actorId);
      assert.equal(view.access.accountId, controllingAppAccess.accountId);
      assert.equal(view.access.controlGeneration, controllingAppAccess.controlGeneration);
      assert.equal(view.player.id, controllingAppAccess.actorId);
      return view;
    };
    const capture = async (name) => {
      const filename = `${String(report.captures.length + 1).padStart(2, '0')}-${name}.png`;
      const bytes = await page.screenshot({
        path: join(output, filename),
        timeout: manifest.captureTimeoutMs,
      });
      report.captures.push({
        file: filename,
        sha256: digest(bytes),
        bytes: bytes.length,
        viewport: page.viewportSize(),
      });
      await checkpoint();
    };
    const press = async (locator) => {
      await locator.focus();
      await locator.press('Enter');
    };
    const hide = async (id, name) =>
      press(
        page
          .locator(`#${id}Panel`)
          .getByRole('button', { name: `Hide ${name} panel`, exact: true }),
      );
    const events = page.locator('#eventsPanel');
    const log = events.getByRole('log', {
      name: 'Perceived world events',
      exact: true,
    });
    const rows = log.locator('[data-conversation-entry]');
    const search = events.getByRole('searchbox', {
      name: 'Search perceived events',
      exact: true,
    });
    const geometry = async () =>
      log.evaluate((element) => ({
        top: element.scrollTop,
        height: element.scrollHeight,
        client: element.clientHeight,
        x: element.getBoundingClientRect().x,
        y: element.getBoundingClientRect().y,
      }));

    await page.goto(`${base}/auth/login`);
    await entry.enterGame(page);
    await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true');
    await expect.poll(() => game.service.paused).toBe(false);
    // Entry acquires the real tab's control and then reads its fresh projection.
    // Wait for an actual scoped App request (for example native presence), not
    // the pre-acquisition embodiment scope, before freezing read comparisons.
    await expect
      .poll(
        () =>
          !!controllingAppAccess?.clientId &&
          observedAppHeaders?.['x-ol-client'] === controllingAppAccess.clientId &&
          observedAppHeaders?.['x-ol-scope'] === controllingAppAccess.scope,
      )
      .toBe(true);
    appHeaders = { ...observedAppHeaders };
    assert.notEqual(appHeaders['x-ol-client'], 'local-internal');
    report.connection = { ...controllingAppAccess };
    interactionStarted = true;
    const initial = await currentView();
    const possessions = () =>
      domain
        .inventoryFor(game.service.world, initial.player.id)
        .map((item) => ({ id: item.id, definitionId: item.definitionId, quantity: item.quantity }))
        .sort((left, right) => left.id.localeCompare(right.id));
    report.initial = {
      actorId: initial.player.id,
      name: initial.player.name,
      worldId: initial.worldId,
      simTime: game.service.world.simTime,
      position: initial.player.position,
      possessions: possessions(),
      equipped: initial.player.inventory
        .filter((item) => item.equipped)
        .map((item) => ({ id: item.id, name: item.name })),
    };
    assert.equal(initial.player.hasWork, false, 'Fresh character must not already have work.');

    phase = 'Character and Journal entry';
    await press(
      page
        .locator('.ol-survival-name')
        .getByRole('button', { name: initial.player.name, exact: true }),
    );
    const character = page.locator('#characterPanel');
    await expect(character.getByRole('tab', { name: 'Condition', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await press(character.getByRole('tab', { name: 'Equipped', exact: true }));
    if (report.initial.equipped.length)
      await expect(character).toContainText(report.initial.equipped[0].name);
    else await expect(character).toContainText('No item is equipped.');
    await hide('character', 'Character');
    await press(page.locator('.ol-rail').getByRole('button', { name: 'Journal', exact: true }));
    const journal = page.locator('#journalPanel');
    const beginnings = journal.getByRole('radio', {
      name: 'Beginnings',
      exact: true,
    });
    await beginnings.focus();
    await beginnings.press('Space');
    await expect(
      journal.getByRole('heading', {
        name: 'Possible beginnings',
        exact: true,
      }),
    ).toBeVisible();
    await press(
      journal.getByRole('button', {
        name: 'World Events · what you perceived',
        exact: true,
      }),
    );
    await hide('journal', 'Journal');
    const initialHistory = await nativeRead('/api/world-events?type=all');
    report.initial.history = {
      count: initialHistory.events.length,
      eventIds: initialHistory.events.map((event) => event.id),
      eventTypes: [...new Set(initialHistory.events.map((event) => event.type))],
      hasOlderPage: !!initialHistory.nextCursor,
    };
    assert.ok(
      initialHistory.events.length >= 1,
      'SETUP LIMIT: fresh native history has no retained record; no seeded history is substituted.',
    );
    await expect(rows).toHaveCount(initialHistory.events.length);
    await expect(rows.first()).toBeVisible();
    report.initial.history.geometry = await geometry();
    report.initial.history.qualification =
      'Retained loaded rows and query only. Fresh social sightings do not establish a scrollable history; native older-scroll anchoring remains unverified.';
    record(
      'Native Character, Beginnings and existing perceived history opened',
      report.initial.history,
    );

    phase = 'shortcut selection and paused refusal';
    await press(
      page.getByRole('button', {
        name: 'Configure quick action 1',
        exact: true,
      }),
    );
    const chooser = page.getByRole('dialog', {
      name: 'Configure shortcut 1',
      exact: true,
    });
    const field = chooser.getByRole('combobox', {
      name: 'Shortcut 1',
      exact: true,
    });
    await expect(field).toBeFocused();
    await field.fill('');
    await expect(page.getByRole('listbox')).toBeVisible();
    const candidates = initial.entities.flatMap((entity) =>
      entity.actions.flatMap((action) =>
        action.enabled && action.command.type === 'gather' && action.shortcut
          ? [
              {
                entityId: entity.id,
                label: `${action.shortcut.label} · ${entity.name}`,
                action,
              },
            ]
          : [],
      ),
    );
    let selected;
    for (const candidate of candidates) {
      // A name shared by two current sources cannot establish which command the
      // grouped shortcut selected. Use an unambiguous current source or stop.
      if (candidates.filter((other) => other.label === candidate.label).length !== 1) continue;
      const option = page
        .getByRole('option')
        .filter({ has: page.getByText(candidate.label, { exact: true }) });
      if (await option.count()) {
        selected = candidate;
        break;
      }
    }
    assert.ok(selected, 'SETUP LIMIT: no current native Gather shortcut is offered.');
    await field.fill(selected.label);
    const option = page
      .getByRole('option')
      .filter({ has: page.getByText(selected.label, { exact: true }) });
    await expect(option).toHaveCount(1);
    await field.press('ArrowDown');
    await field.press('Enter');
    await expect(chooser).toBeHidden();
    const pin = page
      .locator('.ol-qabar [data-kind="shortcut"]')
      .filter({ has: page.locator('.ol-qa-key').filter({ hasText: /^1$/ }) });
    await expect(pin).toHaveAttribute('aria-label', selected.label);
    await expect(pin).toBeFocused();
    report.selectedShortcut = {
      id: selected.action.shortcut.id,
      label: selected.label,
      command: selected.action.command,
      withinReach: domain.canReachEntity(
        game.service.world,
        game.service.world.entities[initial.player.id],
        game.service.world.entities[selected.entityId],
        domain.SIMULATION_RULES.interactionRadius,
      ),
      sourceQuantity: game.service.world.entities[selected.entityId].resource.quantity,
    };
    assert.equal(
      report.selectedShortcut.withinReach,
      false,
      'This fixed fresh-world journey expects native Gather admission in its approaching stage.',
    );
    await search.focus();
    await search.press('1');
    await expect(search).toHaveValue('1');
    assert.equal(report.gameplayRequests.length, 0);
    await search.fill('gather');
    await pin.focus();
    await page.keyboard.press('1');
    const target = page.getByRole('dialog', {
      name: 'Shortcut target',
      exact: true,
    });
    await expect(target).toContainText(selected.label);
    await expect(target).toBeFocused();
    assert.equal(report.gameplayRequests.length, 0);
    await press(page.getByRole('button', { name: 'Pause world', exact: true }));
    await expect.poll(() => game.service.paused).toBe(true);
    const commit = target.getByRole('button', {
      name: selected.action.shortcut.label,
      exact: true,
    });
    await expect(commit).toBeDisabled();
    await expect(target).toContainText('Resume the world to act.');
    await expect(target).toContainText(selected.label);
    await press(target.getByRole('button', { name: 'Cancel', exact: true }));
    await expect(target).toBeHidden();
    await expect(pin).toBeFocused();
    await press(page.getByRole('button', { name: 'Resume world', exact: true }));
    await expect.poll(() => game.service.paused).toBe(false);
    await expect(pin).not.toHaveAttribute('aria-disabled', 'true');
    assert.equal(report.gameplayRequests.length, 0);
    assert.deepEqual(
      report.controls.map((item) => item.paused),
      [true, false],
    );
    record(
      'Exact native shortcut retained through text entry, source review and paused refusal',
      report.selectedShortcut,
    );

    phase = 'native Gather admission, retained rows and Stop';
    const beforeRows = await rows.allTextContents();
    await pin.focus();
    await page.keyboard.press('1');
    await expect(target).toBeVisible();
    await expect(target).toContainText(selected.label);
    await press(
      target.getByRole('button', {
        name: selected.action.shortcut.label,
        exact: true,
      }),
    );
    await expect.poll(() => report.gameplayRequests.length).toBe(1);
    assert.deepEqual(report.gameplayRequests[0].body.command, selected.action.command);
    await expect
      .poll(() => game.service.world.entities[initial.player.id].actor.action?.type)
      .toBe('gather');
    await expect
      .poll(() => game.service.world.entities[initial.player.id].actor.action?.targetId)
      .toBe(selected.entityId);
    await expect
      .poll(() => game.service.world.entities[initial.player.id].actor.action?.stage)
      .toBe('approaching');
    await expect(
      page.getByRole('button', { name: 'Review current work', exact: true }),
    ).toBeVisible();
    await expect(
      events.getByRole('button', { name: 'New events — refresh', exact: true }),
    ).toBeVisible();
    await expect(pin).toBeFocused();
    assert.deepEqual(await rows.allTextContents(), beforeRows);
    await press(page.getByRole('button', { name: 'Review current work', exact: true }));
    await expect(character.getByRole('tab', { name: 'Capabilities', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(
      character.getByRole('button', { name: 'Stop all work', exact: true }),
    ).toBeEnabled();
    await expect(character).toContainText('Stopping also discards work paused for later.');
    report.running = {
      action: structuredClone(game.service.world.entities[initial.player.id].actor.action),
      retainedReading: await geometry(),
      qualification:
        'Gather was admitted with its real approaching stage. No movement, elapsed game time, completed gathering or new materials is exercised.',
    };
    await capture('native-admitted-work-and-retained-rows');
    await press(character.getByRole('button', { name: 'Stop all work', exact: true }));
    await expect.poll(() => report.gameplayRequests.length).toBe(2);
    await expect.poll(() => game.service.world.entities[initial.player.id].actor.action).toBeNull();
    await expect(
      page.getByRole('button', { name: 'Review current work', exact: true }),
    ).toBeHidden();
    await expect(character).toContainText(
      'Stopped. Materials already used in work remain consumed.',
    );
    await hide('character', 'Character');
    await expect(events).toBeVisible();
    assert.deepEqual(await rows.allTextContents(), beforeRows);
    // Stop records its native receipt and ends work. It does not promise a public
    // stop event, so this reader must prove only the native Gather-start record.
    await press(events.getByRole('button', { name: 'New events — refresh', exact: true }));
    const refreshedHistory = await nativeRead('/api/world-events?type=all');
    const startEvent = refreshedHistory.events.find(
      (event) =>
        event.type === 'action-started' &&
        event.actorId === initial.player.id &&
        event.targetId === selected.entityId &&
        !initialHistory.events.some((prior) => prior.id === event.id),
    );
    assert.ok(
      startEvent,
      'Actual Gather-start event must be present in the native perceived history.',
    );
    await expect(log).toContainText(startEvent.text);
    report.newEvent = startEvent;
    record(
      'One native Gather admission in approaching stage and Stop; loaded rows stayed until deliberate refresh',
      {
        startEventId: startEvent.id,
        commandCount: report.gameplayRequests.length,
      },
    );

    phase = 'same-read failure, help and narrow return';
    await expect(search).toHaveValue('gather');
    await press(events.getByRole('button', { name: 'Search', exact: true }));
    await expect(events).toContainText(/\d+ match(?:es)? for “gather”/);
    await expect(log).toContainText(startEvent.text);
    const filteredRows = await rows.allTextContents();
    assert.ok(filteredRows.length);
    faultArmed = true;
    await press(events.getByRole('button', { name: 'Refresh', exact: true }));
    await expect(events.getByRole('alert')).toBeVisible();
    await expect(events).toContainText(
      'Reading did not finish. Any entries already loaded are kept below.',
    );
    await expect(search).toHaveValue('gather');
    assert.deepEqual(await rows.allTextContents(), filteredRows);
    await expect(
      events.getByRole('button', { name: 'Retry reading events', exact: true }),
    ).toBeEnabled();
    assert.equal(faultCount, 1);
    await capture('native-record-read-failure');

    await page.setViewportSize(manifest.narrow);
    await expect(events).toBeVisible();
    await expect(search).toHaveValue('gather');
    await press(page.getByRole('button', { name: 'Settings and help', exact: true }));
    const help = page.locator('#helpPanel');
    await press(help.getByRole('tab', { name: 'Controls & help', exact: true }));
    const keyboard = help.getByRole('heading', {
      name: 'Keyboard shortcuts',
      exact: true,
    });
    await keyboard.scrollIntoViewIfNeeded();
    await expect(keyboard).toBeInViewport();
    await expect(help).toContainText('Pinned shortcuts');
    await hide('help', 'Settings & help');
    await expect(events).toBeVisible();
    await expect(search).toHaveValue('gather');
    await expect(events.getByRole('alert')).toBeVisible();
    assert.deepEqual(await rows.allTextContents(), filteredRows);
    await Promise.all([...pendingResponses]);
    const beforeRetry = report.eventReads.length;
    await press(events.getByRole('button', { name: 'Retry reading events', exact: true }));
    await expect(events.getByRole('alert')).toHaveCount(0);
    await expect(log).toContainText(startEvent.text);
    await expect(search).toHaveValue('gather');
    await Promise.all([...pendingResponses]);
    const retried = report.eventReads.slice(beforeRetry).find((item) => item.status === 200);
    assert.ok(retried, 'An explicit successful retry must be observed.');
    assert.equal(
      retried.query,
      report.injectedFailure.query,
      'Retry changed the requested history.',
    );
    const narrowBounds = await events.boundingBox();
    assert.ok(
      narrowBounds &&
        narrowBounds.x >= -1 &&
        narrowBounds.x + narrowBounds.width <= manifest.narrow.width + 1,
    );
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      true,
    );
    await capture('native-history-after-help-and-retry');
    await hide('events', 'World Events');
    await press(page.locator('.ol-rail').getByRole('button', { name: 'Journal', exact: true }));
    await expect(journal.getByRole('radio', { name: 'Beginnings', exact: true })).toBeChecked();
    record(
      'Failed native read retained rows/query through help and narrow adaptation; same read recovered without gameplay replay',
      { retryQuery: retried.query, narrowBounds },
    );

    await Promise.all([...pendingResponses]);
    const final = await currentView();
    report.final = {
      simTime: game.service.world.simTime,
      hasWork: final.player.hasWork,
      position: final.player.position,
      possessions: possessions(),
      sourceQuantity: game.service.world.entities[selected.entityId].resource.quantity,
    };
    assert.deepEqual(
      report.gameplayRequests.map((item) => item.body.command.type),
      ['gather', 'cancel'],
    );
    assert.ok(
      report.gameplayRequests.every((item) => item.result?.ok === true),
      'Both native original command results must pass.',
    );
    assert.equal(new Set(report.gameplayRequests.map((item) => item.body.commandId)).size, 2);
    assert.equal(final.player.hasWork, false);
    assert.equal(report.final.simTime, report.initial.simTime);
    assert.deepEqual(final.player.position, initial.player.position);
    assert.deepEqual(report.final.possessions, report.initial.possessions);
    assert.equal(report.final.sourceQuantity, report.selectedShortcut.sourceQuantity);
    assert.equal(faultCount, 1);
    assert.equal(faultArmed, false);
    assert.equal(report.captures.length, 3);
    assert.deepEqual(report.pageErrors, []);
    assert.deepEqual(report.guardFailures, []);
    assert.deepEqual(report.blockedRequests, []);
    const usage = await game.service.store.usage(0);
    report.usage = usage.usage;
    assert.equal(usage.usage.llmCalls, 0);
    assert.equal(usage.usage.jevCalls, 0);
    report.status = 'passed';
  };
  await bounded('Complete native journey', scenario, manifest.journeyDeadlineMs);
} catch (error) {
  cancelled = true;
  report.status = String(error).includes('SETUP LIMIT:') ? 'setup-limited' : 'failed';
  report.failure = { phase, message: String(error), stack: error?.stack };
  process.exitCode = 1;
} finally {
  cancelled = true;
  const clean = async (name, operation, milliseconds) => {
    try {
      const result = await bounded(name, operation, milliseconds);
      report.cleanup[name] = result ?? true;
    } catch (error) {
      report.cleanup[name] = { error: String(error) };
      report.status = 'failed';
      process.exitCode = 1;
    }
  };
  if (context)
    await clean('trace', () => context.tracing.stop({ path: join(output, 'trace.zip') }), 15_000);
  if (context) await clean('context', () => context.close(), 15_000);
  if (browser) await clean('browser', () => browser.close(), 15_000);
  if (game)
    await clean(
      'server',
      async () => {
        const result = await game.shutdown(30_000);
        assert.equal(result.saved, true, 'Final native save must complete.');
        assert.deepEqual(result.problems, []);
        return result;
      },
      35_000,
    );
  if (closeTestDatabases) await clean('database', closeTestDatabases, 35_000);
  report.finished = new Date().toISOString();
  report.elapsedMs = Date.now() - started;
  report.additionalJevCostUsd = 0;
  report.cumulativeTaskJevCostUsd = 0;
  await checkpoint();
  console.log(
    JSON.stringify({
      status: report.status,
      phase,
      elapsedMs: report.elapsedMs,
      commands: report.gameplayRequests.length,
      captures: report.captures.length,
      cleanup: report.cleanup,
    }),
  );
}
