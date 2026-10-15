// Temporary finite ownership follow-through for UIUX12/UIUX13. Supplied account
// enrollment uses native authority; it does not qualify the external login provider.
import { test, expect, type Page, type Request } from '@playwright/test';
import { enterGame } from '../tests/fixtures/browser.js';
import { testRepository, closeTestDatabases, readConfig } from '../tests/fixtures/database.js';
import { createGameServer } from '../apps/server/src/http.js';
import { digest } from '../apps/server/src/store.js';
import { NPC_ID } from '../packages/domain/src/index.js';
import type {
  ApiResult,
  GameView,
  KnownPlaceInspection,
  KnownPlacesPage,
  RequestRecoveryResult,
} from '../packages/protocol/src/index.js';

test.setTimeout(60_000);
test.use({ actionTimeout: 10_000, navigationTimeout: 20_000 });

async function actions(page: Page) {
  if (!(await page.locator('.ol-character').isVisible()))
    await page.getByRole('button', { name: 'Character', exact: true }).click();
  await page.getByRole('tab', { name: 'Capabilities', exact: true }).click();
  if (!(await page.getByRole('textbox', { name: 'Action intention', exact: true }).isVisible()))
    await page.getByRole('button', { name: 'Describe an action', exact: true }).click();
  return page.locator('.ol-character-actions');
}

test('a different admitted account and character cannot restore an original action or remembered-place detail', async ({
  page,
}, info) => {
  const store = await testRepository();
  const config = readConfig({ AI_BUDGET_USD: '0', OPEN_LEGEND_AUTH_MODE: 'local' });
  const now = Date.now();
  const game = await createGameServer({
    config,
    store,
    production: true,
    tick: false,
    now: () => now,
  });
  const errors: string[] = [],
    commands: unknown[] = [],
    submissions: unknown[] = [],
    forbidden: string[] = [];
  const evidence: Record<string, unknown> = {
    scope: 'One native account/character change, one original action, one held place inspection.',
    limitations: [
      'The second account/session is supplied through native enrollment and login, not external identity-provider UI.',
      'A cancelled inspection is recorded as cancelled, not as JavaScript consuming an obsolete reply.',
      'The action uses the existing exact typed wait form with no generated interpretation.',
    ],
    providerCostUsd: 0,
    cumulativeTaskProviderCostUsd: 0,
  };
  let releaseInspection = () => {};
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (path === '/api/command') commands.push(request.postDataJSON());
    if (path === '/api/action-attempt') submissions.push(request.postDataJSON());
    if (
      request.method() === 'POST' &&
      /^\/api\/(?:chat|invent|world-agent\/messages)(?:\/|$)/.test(path)
    )
      forbidden.push(path);
  });
  try {
    // Reuse the previously qualified shared-storage enrollment/session owner.
    // No client-supplied actor ID or fabricated GameView grants the second identity.
    const identity = { issuer: 'https://fixture.openlegend.invalid', subject: 'ui-ownership-b' };
    const accountId = await game.service.authenticationMutation(() =>
      store.authority.account(identity, 'fixture-ui-ownership-b'),
    );
    expect(game.service.world.entities[NPC_ID]?.actor).toBeDefined();
    const enrolled = await game.service.enrollCharacter(NPC_ID, accountId, () =>
      store.authority.insertGrant({
        worldId: game.service.world.id,
        accountId,
        actorId: NPC_ID,
        revision: 1,
        capabilities: ['play'],
      }),
    );
    expect(enrolled.ok, enrolled.message).toBe(true);
    const login = await game.service.authenticationMutation(() =>
      store.authority.login(
        identity,
        now,
        config.authentication.sessionMs,
        config.capacity.sessions,
      ),
    );
    await new Promise<void>((resolve) => game.server.listen(0, '127.0.0.1', resolve));
    const address = game.server.address();
    if (!address || typeof address === 'string') throw new Error('Missing listener');
    const base = `http://127.0.0.1:${address.port}`;
    const read = async () => {
      const client = await page.evaluate(() => sessionStorage.getItem('open-legend:tab-id'));
      expect(client).not.toBeNull();
      const response = await page.request.get(base + '/api/state', {
        headers: { 'X-OL-Client': client! },
        timeout: 10_000,
      });
      expect(response.status()).toBe(200);
      return (await response.json()) as GameView;
    };
    const headers = async (view: GameView) => ({
      Origin: base,
      'X-OL-Client': (await page.evaluate(() => sessionStorage.getItem('open-legend:tab-id')))!,
      'X-OL-Scope': view.access!.scope,
      'X-OL-Generation': view.historyEpoch!.split(':')[0]!,
    });
    const records = (prefix: string) =>
      page.evaluate(
        (prefix) =>
          Object.keys(sessionStorage)
            .filter((key) => key.startsWith(prefix))
            .map((key) => ({ key, value: sessionStorage.getItem(key) })),
        prefix,
      );

    await page.goto(base);
    await enterGame(page);
    await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true');
    const originalView = await read();
    expect(originalView.access?.controlling).toBe(true);
    expect(originalView.access?.accountId).not.toBe(accountId);
    expect(originalView.player.id).not.toBe(NPC_ID);
    const panel = await actions(page);
    const words = page.getByRole('textbox', { name: 'Action intention', exact: true });
    let original: Record<string, unknown> | undefined;
    let acknowledged: ApiResult | undefined;
    await page.route('**/api/action-attempt', async (route) => {
      expect(original).toBeUndefined();
      original = route.request().postDataJSON() as Record<string, unknown>;
      const response = await route.fetch({ timeout: 10_000 });
      acknowledged = (await response.json()) as ApiResult;
      await route.abort('failed');
    });
    await words.fill('wait 3 minutes');
    await panel.getByRole('button', { name: 'Attempt action', exact: true }).click();
    await expect(
      panel.getByText('Original action result not confirmed', { exact: true }),
    ).toBeVisible();
    expect(acknowledged).toMatchObject({ ok: true });
    expect(original).toMatchObject({ text: 'wait 3 minutes', mode: 'enqueue' });
    expect(acknowledged!.jobId).toBeTruthy();
    await page.unroute('**/api/action-attempt');
    await words.fill('wait 2 minutes');
    const retained = await records('open-legend:action-request:');
    expect(retained).toHaveLength(1);
    const originalReceiptBody = { ...original, timeline: originalView.saveTimeline };
    expect(JSON.parse(retained[0]!.value!)).toMatchObject(originalReceiptBody);
    await expect
      .poll(async () =>
        (await records('open-legend:action-draft:')).some(
          (record) => record.value === 'wait 2 minutes',
        ),
      )
      .toBe(true);
    const drafts = await records('open-legend:action-draft:');
    const positiveResponse = await page.request.post(base + '/api/action-attempt/receipt', {
      headers: await headers(originalView),
      data: originalReceiptBody,
      timeout: 10_000,
    });
    expect(positiveResponse.status()).toBe(200);
    const positive = (await positiveResponse.json()) as RequestRecoveryResult;
    expect(positive).toMatchObject({
      ok: true,
      status: 'resolved',
      result: { jobId: acknowledged!.jobId },
    });
    const originalJob = await store.getJob(acknowledged!.jobId!);
    expect(originalJob).toMatchObject({ kind: 'action', status: 'completed' });
    expect(submissions).toHaveLength(1);
    expect(commands).toEqual([]);

    await page.getByRole('button', { name: 'Journal', exact: true }).click();
    const journal = page.locator('#journalPanel');
    await journal.getByText('Places', { exact: true }).click();
    const inspected = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/known-places/inspect',
    );
    await journal
      .locator('.ol-known-place-list')
      .getByRole('button', { name: /^Inspect / })
      .first()
      .click();
    const selected = (await (await inspected).json()) as KnownPlaceInspection;
    expect(selected.ok).toBe(true);
    const detail = journal.locator('.ol-known-place-detail');
    await expect(detail.getByRole('heading')).toHaveText(selected.place.label);
    let heldRequest: Request | undefined;
    let fetched: KnownPlaceInspection | undefined;
    let finished = false,
      canceled = false;
    const held = new Promise<void>((resolve) => {
      releaseInspection = resolve;
    });
    page.once('close', () => releaseInspection());
    page.on('requestfailed', (request) => {
      if (request === heldRequest && request.failure()?.errorText === 'net::ERR_ABORTED')
        canceled = true;
    });
    await page.route('**/api/known-places/inspect', async (route) => {
      heldRequest = route.request();
      const native = await route.fetch({ timeout: 10_000 });
      fetched = (await native.json()) as KnownPlaceInspection;
      expect(fetched).toMatchObject({ ok: true, place: { sourceId: selected.place.sourceId } });
      await held;
      try {
        await route.fulfill({ response: native });
      } catch (error) {
        if (!canceled) throw error;
      } finally {
        finished = true;
      }
    });
    await detail.getByRole('button', { name: 'Recheck movement', exact: true }).click();
    await expect.poll(() => !!fetched).toBe(true);
    expect(await records('open-legend:action-request:')).toEqual(retained);

    // Adopt the real second session in this same tab. Reload retains tab storage,
    // while the native App must adopt a different actual account and character.
    await page
      .context()
      .addCookies([
        { name: 'ol_session', value: login.token, url: base, httpOnly: true, sameSite: 'Lax' },
      ]);
    await page.reload();
    await enterGame(page);
    const current = await read();
    expect(current.access).toMatchObject({ accountId, actorId: NPC_ID, controlling: true });
    expect(current.player.id).toBe(NPC_ID);
    expect(current.saveTimeline).toBe(originalView.saveTimeline);
    expect(current.access!.privateDraftScope).not.toBe(originalView.access!.privateDraftScope);
    expect(current.access!.scope).not.toBe(originalView.access!.scope);
    expect(current.commandEpoch).toBe(game.service.commandEpoch);
    await expect(page.locator('.ol-character-link')).toContainText(current.player.name);
    const sessionResponse = await page.request.get(base + '/api/session', { timeout: 10_000 });
    expect(await sessionResponse.json()).toMatchObject({
      accountId,
      worlds: [{ id: current.worldId, actorId: NPC_ID, capabilities: ['play'] }],
    });
    expect(await records('open-legend:action-request:')).toEqual([]);
    const currentDrafts = await records('open-legend:action-draft:');
    for (const old of drafts)
      expect(currentDrafts.some((record) => record.key === old.key)).toBe(false);
    const freshActions = await actions(page);
    await expect(words).toHaveValue('');
    await expect(
      freshActions.getByText('Original action result not confirmed', { exact: true }),
    ).toBeHidden();
    await expect(freshActions.locator('.ol-action-result')).toHaveCount(0);

    await page.getByRole('button', { name: 'Journal', exact: true }).click();
    const freshPlaces = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/known-places',
    );
    await journal.getByText('Places', { exact: true }).click();
    const known = (await (await freshPlaces).json()) as KnownPlacesPage;
    expect(known.ok).toBe(true);
    expect(known.entries.some((place) => place.sourceId === selected.place.sourceId)).toBe(false);
    await expect(detail).toHaveCount(0);
    releaseInspection();
    await expect.poll(() => finished).toBe(true);
    await expect(detail).toHaveCount(0);
    expect(await records('open-legend:action-request:')).toEqual([]);
    await page.unroute('**/api/known-places/inspect');

    // This identity is currently permitted and controlling; a missing play grant
    // cannot mask whether another account's original result would be disclosed.
    const before = digest(game.service.world);
    const beforeJobs = await store.recentJobs();
    const response = await page.request.post(base + '/api/action-attempt/receipt', {
      headers: await headers(current),
      data: originalReceiptBody,
      timeout: 10_000,
    });
    expect(response.status()).toBe(200);
    const result = (await response.json()) as RequestRecoveryResult;
    expect(result).toMatchObject({ ok: true, scope: current.access!.scope, status: 'unknown' });
    expect(result).not.toHaveProperty('result');
    expect(JSON.stringify(result)).not.toContain(acknowledged!.jobId!);
    expect(digest(game.service.world)).toBe(before);
    expect(await store.getJob(acknowledged!.jobId!)).toEqual(originalJob);
    expect(await store.recentJobs()).toEqual(beforeJobs);
    expect(submissions).toHaveLength(1);
    expect(commands).toEqual([]);
    expect(errors).toEqual([]);
    expect(forbidden).toEqual([]);
    const usage = (await store.usage(0)).usage;
    expect(usage.llmCalls + usage.jevCalls).toBe(0);
    expect(current.ai.budget.spentUsd + current.ai.budget.reservedUsd).toBe(0);
    evidence.original = {
      accountId: originalView.access!.accountId,
      actorId: originalView.player.id,
      retained,
      drafts,
      positive,
      jobId: acknowledged!.jobId,
    };
    evidence.current = {
      accountId,
      actorId: current.player.id,
      scope: current.access!.scope,
      timeline: current.saveTimeline,
      receipt: result,
    };
    evidence.inspection = {
      sourceId: selected.place.sourceId,
      fetched: !!fetched,
      finished,
      browserCanceled: canceled,
    };
    await page.screenshot({
      path: info.outputPath('new-owner-known-places-no-old-detail.png'),
      timeout: 10_000,
    });
  } finally {
    releaseInspection();
    await info.attach('ownership-observation', {
      body: JSON.stringify({ ...evidence, errors, commands, submissions, forbidden }, null, 2),
      contentType: 'application/json',
    });
    await page.close();
    await game.close();
  }
});

test.afterAll(closeTestDatabases);
