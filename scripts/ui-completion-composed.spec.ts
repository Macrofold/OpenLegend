// Temporary continuation of the October 14 composed UI observations. Native PX02/PX04
// settlement, replay, travel and reopening evidence remains separate from these UI checks.
import { randomUUID } from 'node:crypto';
import { test, expect, type Locator, type Page, type TestInfo } from '@playwright/test';
import { enterGame } from '../tests/fixtures/browser.js';
import { testRepository, closeTestDatabases, readConfig } from '../tests/fixtures/database.js';
import { createGameServer } from '../apps/server/src/http.js';
import { inventoryFor, offersBetween, worldPosition } from '../packages/domain/src/index.js';
import type {
  ActivityChoicePage,
  ApiResult,
  CommandInput,
  CommandReceiptResult,
  GameView,
  InventoryDestinationPage,
} from '../packages/protocol/src/index.js';

type Game = Awaited<ReturnType<typeof createGameServer>>;
type Envelope = { commandId: string; commandEpoch: string; command: CommandInput };
type SavedDraft = { draft: unknown; reviewed: Record<string, number> };
type Observation = {
  suppliedChoices: { label: string; actorId: string; input: CommandInput; result: ApiResult }[];
  browserCommands: Envelope[];
  readings: unknown[];
};

test.setTimeout(60_000);
async function play(
  page: Page,
  info: TestInfo,
  body: (game: Game, read: () => Promise<GameView>, observation: Observation) => Promise<void>,
) {
  const game = await createGameServer({
    config: readConfig({ AI_BUDGET_USD: '0' }),
    store: await testRepository(),
    production: true,
    tick: false,
    now: () => 1_792_037_000_000,
  });
  const observation: Observation = { suppliedChoices: [], browserCommands: [], readings: [] };
  const errors: string[] = [],
    forbidden: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (path === '/api/command') observation.browserCommands.push(request.postDataJSON());
    if (
      request.method() === 'POST' &&
      /^\/api\/(?:chat|invent|world-agent\/messages)(?:\/|$)/.test(path)
    )
      forbidden.push(path);
  });
  try {
    await new Promise<void>((resolve) => game.server.listen(0, '127.0.0.1', resolve));
    const address = game.server.address();
    if (!address || typeof address === 'string') throw new Error('Missing listener');
    const base = `http://127.0.0.1:${address.port}`;
    await page.goto(base);
    await enterGame(page);
    await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true');
    const read = async () => {
      const client = await page.evaluate(() => sessionStorage.getItem('open-legend:tab-id'));
      expect(client).not.toBeNull();
      const response = await page.request.get(base + '/api/state', {
        headers: { 'X-OL-Client': client! },
      });
      expect(response.ok()).toBe(true);
      return (await response.json()) as GameView;
    };
    await body(game, read, observation);
    expect(errors).toEqual([]);
    expect(forbidden).toEqual([]);
    const usage = (await game.service.store.usage(0)).usage;
    expect(usage.llmCalls + usage.jevCalls).toBe(0);
    const finalView = await read();
    expect(finalView.ai.budget.spentUsd + finalView.ai.budget.reservedUsd).toBe(0);
    expect(await game.service.store.recentJobs()).toEqual([]);
  } finally {
    await info.attach('composed-observation', {
      body: JSON.stringify({ ...observation, errors, forbidden, providerCostUsd: 0 }, null, 2),
      contentType: 'application/json',
    });
    await page.close();
    await game.close();
  }
}
async function supplied(
  game: Game,
  observation: Observation,
  label: string,
  actorId: string,
  input: CommandInput,
) {
  // This is an explicitly supplied character choice through the real native command
  // owner. No generated preference or browser authorization for that actor is claimed.
  const result = await game.service.command(randomUUID(), input, actorId);
  observation.suppliedChoices.push({ label, actorId, input, result });
  expect(result.ok, JSON.stringify(result)).toBe(true);
  return result;
}
async function openPanel(page: Page, id: string, label: string) {
  const panel = page.locator(`#${id}Panel`);
  if (!(await panel.isVisible())) {
    const retained = page
      .getByRole('toolbar', { name: 'Open panels', exact: true })
      .getByRole('button', { name: label, exact: true });
    if (await retained.isVisible()) await retained.click();
    else await page.locator('.ol-rail').getByRole('button', { name: label, exact: true }).click();
  }
  await expect(panel).toBeVisible();
  return panel;
}
async function person(page: Page, id: string) {
  const panel = await openPanel(page, 'nearby', 'In view');
  const row = panel.locator(`[data-entity="${id}"] button`);
  if (await row.isVisible()) await row.click();
  await expect(panel.locator('.ol-item-trade')).toBeVisible();
  return panel;
}
async function fit(page: Page, area: Locator, info: TestInfo, name: string) {
  await expect(area).toBeVisible();
  await expect
    .poll(async () => {
      const box = await area.boundingBox(),
        viewport = page.viewportSize()!;
      return (
        !!box &&
        box.x >= -1 &&
        box.y >= -1 &&
        box.x + box.width <= viewport.width + 1 &&
        box.y + box.height <= viewport.height + 1
      );
    })
    .toBe(true);
  await page.screenshot({ path: info.outputPath(name + '.png'), timeout: 10_000 });
}
async function keyboardControl(control: Locator) {
  // A native preview may still be completing. Disabled controls cannot take focus.
  await expect(control).toBeEnabled();
  await control.focus();
  await expect(control).toBeFocused();
  await expect(control).toBeInViewport();
}
async function draft(page: Page, key: string): Promise<SavedDraft> {
  return page.evaluate((key) => JSON.parse(sessionStorage.getItem(key) ?? 'null'), key);
}
function holdings(game: Game, ids: string[]) {
  return ids.map((id) => ({
    actorId: id,
    items: inventoryFor(game.service.world, id).map((item) => ({
      id: item.id,
      quantity: item.quantity,
    })),
    position: worldPosition(game.service.world.entities[id]!),
  }));
}
async function reply(page: Page, control: Locator, operation: string) {
  const response = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/command' &&
      [
        response.request().postDataJSON()?.command?.handoverOperation,
        response.request().postDataJSON()?.command?.outingOperation,
      ].includes(operation),
  );
  await keyboardControl(control);
  await control.press('Enter');
  const received = await response;
  return (await received.json()) as ApiResult;
}

test('reciprocal barter retains exact terms through entry changes, revision review, refusal and disconnect', async ({
  page,
}, info) => {
  await play(page, info, async (game, read, observation) => {
    const actorId = game.service.controlledEntityId,
      companionId = 'mara';
    let view = await read();
    const initial = view.entities.find((entity) => entity.id === companionId)?.trade;
    expect(initial).toBeDefined();
    const labels = initial!.labels;
    const fiber = inventoryFor(game.service.world, actorId).find(
      (item) => item.definitionId === 'prepared_fiber',
    );
    const knife = inventoryFor(game.service.world, companionId).find(
      (item) => item.definitionId === 'knife',
    );
    expect(fiber && fiber.quantity >= 3).toBe(true);
    expect(knife).toBeDefined();
    const fiberName = game.service.world.itemDefinitions[fiber!.definitionId]!.name;
    const starting = holdings(game, [actorId, companionId]);
    // Mara initially knows no private player lot. Her gift discloses only her knife;
    // the player's later deliberate counteroffer discloses the exact fiber lot to her.
    await supplied(
      game,
      observation,
      'Mara offers her existing knife without requesting an undisclosed item',
      companionId,
      {
        type: 'handover',
        handoverOperation: 'offer',
        targetId: actorId,
        itemId: knife!.id,
        quantity: 1,
      },
    );
    expect(holdings(game, [actorId, companionId])).toEqual(starting);
    const nearby = await person(page, companionId),
      trade = nearby.locator('.ol-item-trade');
    const offer = trade.locator('.ol-trade-offer');
    await expect(offer).toContainText(labels.incoming);
    await trade.getByRole('button', { name: labels.counter, exact: true }).click();
    const amount = trade.getByRole('textbox', { name: labels.giveQuantity, exact: true });
    await expect(trade.locator('.ol-trade-draft select').nth(1)).toHaveValue(knife!.id);
    await expect(
      trade.getByRole('textbox', { name: labels.receiveQuantity, exact: true }),
    ).toHaveValue('1');

    const inspections: Envelope[] = [];
    async function inventoryDraft(expectedQuantity: number) {
      const inventory = await openPanel(page, 'inventory', 'Inventory');
      const contents = inventory.locator('.ol-inventory-collection[data-side="belongings"]');
      await contents.getByRole('textbox', { name: /^Search / }).fill(fiberName);
      const expectedRevision = game.service.world.entities[actorId]!.inventoryRevision;
      const inspected = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === '/api/command' &&
          response.request().postDataJSON()?.command?.type === 'inspect-inventory',
      );
      await contents.locator(`[data-item-id="${fiber!.id}"]`).click();
      const inspectedResponse = await inspected;
      expect((await inspectedResponse.json()) as ApiResult).toMatchObject({ ok: true });
      const inspection = inspectedResponse.request().postDataJSON() as Envelope;
      expect(inspection.command).toEqual({
        type: 'inspect-inventory',
        itemId: fiber!.id,
        containerId: actorId,
        expectedRevision,
      });
      expect(inspection.commandEpoch).toBe(view.commandEpoch);
      expect(inspection.commandId).toMatch(/^[0-9a-f-]{36}$/);
      inspections.push(inspection);
      expect(new Set(inspections.map((request) => request.commandId)).size).toBe(
        inspections.length,
      );
      expect(observation.browserCommands).toEqual(inspections);
      const detail = page.locator('.ol-inventory-detail');
      await expect(detail).toContainText(`${expectedQuantity} units`);
      const recipientRead = page.waitForResponse(
        (response) => new URL(response.url()).pathname === '/api/inventory/destinations',
      );
      await detail.getByRole('button', { name: 'Offer to a person…', exact: true }).click();
      const recipients = (await (await recipientRead).json()) as InventoryDestinationPage;
      const index = recipients.destinations
        .filter((entry) => entry.kind === 'recipient')
        .findIndex((entry) => entry.id === companionId);
      expect(index).toBeGreaterThanOrEqual(0);
      await detail
        .getByRole('button', { name: /^Trade with / })
        .nth(index)
        .click();
      return { detail, trade: detail.locator('.ol-item-trade') };
    }
    // The person panel deliberately offers only six carried lots. Select this
    // other exact lot through Inventory, which adds it without expanding that list.
    const { detail, trade: inventoryTrade } = await inventoryDraft(fiber!.quantity);
    await expect(
      inventoryTrade.locator(`.ol-trade-draft select option[value="${fiber!.id}"]`),
    ).toHaveCount(1);
    await inventoryTrade.locator('.ol-trade-draft select').first().selectOption(fiber!.id);
    await inventoryTrade.getByRole('textbox', { name: labels.giveQuantity, exact: true }).fill('3');
    await expect(
      inventoryTrade.getByRole('textbox', { name: labels.giveQuantity, exact: true }),
    ).toHaveValue('3');
    await expect(inventoryTrade.locator('.ol-trade-draft select').nth(1)).toHaveValue(knife!.id);
    await page.setViewportSize({ width: 390, height: 844 });
    await fit(
      page,
      page.locator('.ol-inventory-popover'),
      info,
      'barter-inventory-exact-draft-narrow',
    );
    await detail.getByRole('button', { name: 'Close', exact: true }).click();
    await openPanel(page, 'nearby', 'In view');
    await nearby.getByRole('button', { name: /^Hide / }).click();
    await person(page, companionId);
    await expect(trade.locator('.ol-trade-draft select').first()).toHaveValue(fiber!.id);
    await expect(amount).toHaveValue('3');
    // Inspection records what the player saw; preparation must issue nothing else.
    expect(observation.browserCommands).toEqual(inspections);
    expect(holdings(game, [actorId, companionId])).toEqual(starting);

    // A real native quantity change supplies a smaller current maximum. Reviewing
    // items must retain the typed three, rather than clamp it or submit a new amount.
    await supplied(
      game,
      observation,
      'Controlled fixture drops surplus fiber, leaving two carried units',
      actorId,
      {
        type: 'drop',
        itemId: fiber!.id,
        quantity: fiber!.quantity - 2,
      },
    );
    expect(
      inventoryFor(game.service.world, actorId).find((item) => item.id === fiber!.id)?.quantity,
    ).toBe(2);
    const current = await inventoryDraft(2);
    await current.trade.getByRole('button', { name: labels.refresh, exact: true }).click();
    const currentAmount = current.trade.getByRole('textbox', {
      name: labels.giveQuantity,
      exact: true,
    });
    await expect(currentAmount).toHaveValue('3');
    await expect(
      currentAmount.locator('xpath=ancestor::div[@class="ol-inventory-quantity"]'),
    ).toContainText('2 available whole units.');
    await expect(
      current.trade
        .locator('.ol-trade-draft')
        .getByRole('button', { name: labels.counter, exact: true }),
    ).toBeDisabled();
    await currentAmount.fill('2');
    await current.detail.getByRole('button', { name: 'Close', exact: true }).click();
    await person(page, companionId);
    await expect(amount).toHaveValue('2');
    const unchanged = holdings(game, [actorId, companionId]);
    expect(
      (
        await reply(
          page,
          trade
            .locator('.ol-trade-draft')
            .getByRole('button', { name: labels.counter, exact: true }),
          'counter',
        )
      ).ok,
    ).toBe(true);
    expect(holdings(game, [actorId, companionId])).toEqual(unchanged);
    let prior = offersBetween(game.service.world, actorId, companionId).outgoing[0]!;
    expect(prior).toBeDefined();
    await supplied(
      game,
      observation,
      'Mara counters the disclosed two-fiber proposal with one fiber for her same knife',
      companionId,
      {
        type: 'handover',
        handoverOperation: 'counter',
        targetId: actorId,
        offerId: prior.id,
        expectedOfferRevision: prior.revision,
        itemId: knife!.id,
        quantity: 1,
        requestedItem: { itemId: fiber!.id, quantity: 1 },
      },
    );
    prior = offersBetween(game.service.world, actorId, companionId).incoming[0]!;
    const accept = offer.getByRole('button', { name: labels.accept, exact: true });
    await expect(offer).toContainText(labels.changed);
    await expect(accept).toBeDisabled();
    await expect(amount).toHaveValue('2');
    view = await read();
    const key =
      'open-legend:action-draft:trade:' +
      view.entities.find((entity) => entity.id === companionId)!.trade!.scope;
    const beforeDisconnect = await draft(page, key);
    const review = trade.getByRole('button', { name: labels.review, exact: true });
    await expect(review).toBeEnabled();
    // The native stream error deliberately schedules a fresh state read after six
    // seconds. Observe that real reconnect before the ordinary five-second UI check.
    const reconnected = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/state' && response.ok(),
      { timeout: 10_000 },
    );
    const address = game.server.address();
    if (!address || typeof address === 'string') throw new Error('Missing listener');
    game.server.closeAllConnections();
    await new Promise<void>((resolve) => game.server.close(() => resolve()));
    try {
      await expect(page.locator('#connection')).toContainText('Connection interrupted.');
      await expect(review).toBeDisabled();
      const disconnected = await draft(page, key);
      expect(disconnected.draft).toEqual(beforeDisconnect.draft);
      expect(disconnected.reviewed).toEqual(beforeDisconnect.reviewed);
    } finally {
      await new Promise<void>((resolve) => game.server.listen(address.port, '127.0.0.1', resolve));
    }
    await reconnected;
    await enterGame(page);
    await expect(review).toBeEnabled();
    expect((await draft(page, key)).draft).toEqual(beforeDisconnect.draft);
    await expect(accept).toBeDisabled();
    expect(observation.browserCommands.slice(0, 2)).toEqual(inspections);
    expect(observation.browserCommands).toHaveLength(3);
    const currentTerms = (await read()).entities
      .find((entity) => entity.id === companionId)!
      .trade!.offers.find((item) => item.id === prior.id)!;
    expect(currentTerms.give).toMatchObject({ id: fiber!.id, quantity: 1 });
    expect(currentTerms.receive).toMatchObject({ id: knife!.id, quantity: 1 });
    // Read each exact rendered side through its real panel scroller. Narrow/short
    // captures retain those reading positions; an in-bounds parent alone is not
    // evidence that either side's terms were actually visible.
    for (const height of [844, 420]) {
      await page.setViewportSize({ width: 390, height });
      for (const [index, lot] of [currentTerms.give!, currentTerms.receive!].entries()) {
        const side = offer.locator('.ol-trade-terms > div').nth(index);
        const heading = side.locator('strong');
        await heading.scrollIntoViewIfNeeded();
        await expect(heading).toBeInViewport();
        const line = side.locator('p').first();
        await expect(line).toHaveText(`${lot.quantity} × ${lot.label}`);
        await line.scrollIntoViewIfNeeded();
        await expect(line).toBeInViewport();
        observation.readings.push({
          viewport: { width: 390, height },
          side: index === 0 ? 'give' : 'receive',
          text: await line.innerText(),
          bounds: await line.boundingBox(),
        });
        await fit(
          page,
          nearby,
          info,
          `barter-current-${index === 0 ? 'give' : 'receive'}-${height}`,
        );
      }
    }
    await keyboardControl(trade.getByRole('button', { name: labels.review, exact: true }));
    await fit(page, nearby, info, 'barter-review-control-short');
    await trade.getByRole('button', { name: labels.review, exact: true }).press('Enter');
    await expect(accept).toBeEnabled();
    const retained = (await draft(page, key)).draft;
    let intervened = false;
    await page.route('**/api/command', async (route) => {
      if (route.request().postDataJSON()?.command?.handoverOperation === 'accept' && !intervened) {
        intervened = true;
        await supplied(
          game,
          observation,
          'Mara withdraws the exact current proposal while the player acceptance is in flight',
          companionId,
          {
            type: 'handover',
            handoverOperation: 'withdraw',
            targetId: actorId,
            offerId: prior.id,
            expectedOfferRevision: prior.revision,
          },
        );
      }
      await route.continue();
    });
    const refused = await reply(page, accept, 'accept');
    expect(intervened).toBe(true);
    expect(refused.ok).toBe(false);
    expect(refused.code).toBe('no-offer');
    expect((await draft(page, key)).draft).toEqual(retained);
    expect(holdings(game, [actorId, companionId])).toEqual(unchanged);
    await page.unroute('**/api/command');
    await supplied(
      game,
      observation,
      'Mara supplies a fresh exact reciprocal proposal for the player to decline',
      companionId,
      {
        type: 'handover',
        handoverOperation: 'offer',
        targetId: actorId,
        itemId: knife!.id,
        quantity: 1,
        requestedItem: { itemId: fiber!.id, quantity: 2 },
      },
    );
    await expect(offer.locator('.ol-trade-terms > div').first().locator('p').first()).toHaveText(
      /^2 × /,
    );
    const decline = offer.getByRole('button', { name: labels.decline, exact: true });
    await expect(decline).toBeEnabled();
    await keyboardControl(decline);
    await fit(page, nearby, info, 'barter-native-refusal-and-reply-controls-short');
    expect((await reply(page, decline, 'decline')).ok).toBe(true);
    expect((await draft(page, key)).draft).toEqual(retained);
    expect(holdings(game, [actorId, companionId])).toEqual(unchanged);
    expect(observation.browserCommands.slice(0, 2)).toEqual(inspections);
    expect(
      observation.browserCommands.map(
        (request) => request.command.handoverOperation ?? request.command.type,
      ),
    ).toEqual(['inspect-inventory', 'inspect-inventory', 'counter', 'accept', 'decline']);
    observation.readings.push({
      initialQuantity: 3,
      refreshedMaximum: 2,
      retainedDraft: retained,
      refused,
    });
  });
});

test('invitation description search and composed consent controls retain exact people and terms', async ({
  page,
}, info) => {
  await play(page, info, async (game, read, observation) => {
    const actorId = game.service.controlledEntityId,
      companionId = 'mara';
    const initial = await read(),
      companion = initial.entities.find((entity) => entity.id === companionId)!;
    expect(companion).toBeDefined();
    const before = holdings(game, [actorId, companionId]);
    const nearby = await openPanel(page, 'nearby', 'In view');
    await nearby.locator(`[data-entity="${companionId}"] button`).click({ button: 'right' });
    const menu = page.locator('#contextMenu'),
      search = menu.getByRole('searchbox', { name: 'Find an action', exact: true });
    await search.fill('known destination');
    const route = menu.locator(`[data-catalogue-action="invite-travel:${companionId}"]`);
    await expect(route).toBeVisible();
    await expect(route).toHaveCount(1);
    const unavailableVisibility = menu.getByRole('button', {
      name: /^(Show|Hide) Unavailable Actions$/,
    });
    await unavailableVisibility.click();
    await expect(route).toHaveCount(1);
    await unavailableVisibility.click();
    await expect(route).toHaveCount(1);
    await expect(menu.locator('.ol-task-entries [data-picker-row]')).toHaveCount(0);
    await expect(menu.getByRole('button', { name: /^Invent / })).toHaveCount(0);
    await route.click();
    const task = page.locator('#activityPanel');
    await expect(task.locator('.ol-task-bound-target')).toContainText(companion.name);
    await expect(task).toContainText('Sending an invitation moves nobody.');
    const destination = task.locator('.ol-camp-object').getByRole('button').first();
    const choicesRead = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/activity-choices' &&
        response.request().postDataJSON()?.field === 'destinationId' &&
        !response.request().postDataJSON()?.selectedId,
    );
    await destination.click();
    const choices = (await (await choicesRead).json()) as ActivityChoicePage;
    const target = choices.choices.find((choice) => choice.id === 'campfire');
    expect(target).toBeDefined();
    const picker = page.locator('.ol-activity-picker-overlay');
    await picker.getByRole('button', { name: `Choose ${target!.label}`, exact: true }).click();
    await expect(picker).toBeHidden();
    await destination.click();
    await picker.locator('input').press('Escape');
    await expect(picker).toBeHidden();
    await expect(destination).toBeFocused();
    await expect(destination).toContainText(target!.label);
    const purpose = task.getByRole('textbox', { name: 'Stated purpose (optional)', exact: true });
    await task.locator('.ol-task-overview details summary').click();
    const intendedPurpose = 'Visit the fire together; decide about gathering separately.';
    await purpose.fill(intendedPurpose);
    const modes = [
      'Start only if I am still idle',
      'Replace the work I have now',
      'Pause the work I have now, then resume it',
    ];
    for (const label of modes) await task.getByRole('button', { name: label, exact: true }).click();
    await task.getByRole('button', { name: modes[0], exact: true }).click();
    await expect(task.getByRole('button', { name: 'After current work', exact: true })).toHaveCount(
      0,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(purpose).toHaveValue(intendedPurpose);
    await expect(destination).toContainText(target!.label);
    const send = task.getByRole('button', { name: 'Send invitation', exact: true });
    await keyboardControl(send);
    await fit(page, task, info, 'invitation-exact-terms-and-modes-narrow');
    expect(observation.browserCommands).toEqual([]);
    expect(holdings(game, [actorId, companionId])).toEqual(before);
    const sendEvidence: { original?: Envelope; result?: ApiResult } = {};
    // Deliver the real invitation once; lose only its reply to this browser.
    await page.route('**/api/command', async (route) => {
      const original = route.request().postDataJSON() as Envelope;
      if (original.command.type !== 'activity-request') return route.continue();
      expect(sendEvidence.original).toBeUndefined();
      sendEvidence.original = original;
      const response = await route.fetch();
      sendEvidence.result = (await response.json()) as ApiResult;
      await route.abort('failed');
    });
    await send.press('Enter');
    const recovery = task.locator('.ol-task-recovery');
    await expect(recovery).toContainText('Awaiting the exact result of ');
    await expect(task.getByRole('alert')).toContainText('Delivery is uncertain.');
    expect(sendEvidence.result).toMatchObject({ ok: true });
    const original = sendEvidence.original!;
    expect(original.command).toMatchObject({
      activityFamilyId: 'base:outing-invite',
      purpose: intendedPurpose,
      activityArguments: { recipientId: companionId, destinationId: 'campfire', mode: 'enqueue' },
    });
    await page.unroute('**/api/command');
    const pendingKey = `open-legend:activity-command:${initial.access!.commandRecoveryScope}:${initial.worldId}:${initial.saveTimeline}:${actorId}`;
    const originalBytes = await page.evaluate((key) => sessionStorage.getItem(key), pendingKey);
    expect(originalBytes).not.toBeNull();
    expect(JSON.parse(originalBytes!)).toMatchObject({
      request: { commandId: original.commandId, commandEpoch: original.commandEpoch },
      action: { command: original.command },
    });
    expect((await read()).player.outings).toHaveLength(1);
    // The committed pending agreement removes a new invitation from offered tasks.
    // Recovery still names its exact original request; Withdraw is separate consent.
    await expect(send).toHaveCount(0);
    expect(holdings(game, [actorId, companionId])).toEqual(before);
    const withdraw = task.getByRole('button', { name: /^Withdraw invitation to / });
    await expect(withdraw).toBeEnabled();
    await keyboardControl(withdraw);
    await fit(page, task, info, 'invitation-pending-withdraw-narrow');
    expect((await reply(page, withdraw, 'leave')).ok).toBe(true);
    await expect(withdraw).toHaveCount(0);
    expect((await read()).player.outings).toEqual([]);
    expect(await page.evaluate((key) => sessionStorage.getItem(key), pendingKey)).toBe(
      originalBytes,
    );
    await expect(recovery).toContainText('Awaiting the exact result of ');
    // Reread this same task after the agreement ends. Its earlier eligibility
    // refusal must not mask the still-retained original request's send guard.
    await openPanel(page, 'character', 'Character');
    await openPanel(page, 'activity', 'Current task');
    await expect(send).toBeDisabled();
    await expect(task.locator('.ol-task-submit')).toHaveAttribute('data-unresolved', 'true');
    expect(holdings(game, [actorId, companionId])).toEqual(before);
    expect(observation.browserCommands).toHaveLength(2);
    const receiptRequest = page.waitForRequest(
      (request) => new URL(request.url()).pathname === '/api/command/receipt',
    );
    const receiptResponse = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/command/receipt',
    );
    const check = recovery.getByRole('button', { name: 'Check request result', exact: true });
    await keyboardControl(check);
    await check.press('Enter');
    expect((await receiptRequest).postDataJSON()).toEqual(original);
    const receipt = (await (await receiptResponse).json()) as CommandReceiptResult;
    expect(receipt).toMatchObject({ status: 'resolved', result: sendEvidence.result });
    await expect(recovery).toHaveCount(0);
    expect(await page.evaluate((key) => sessionStorage.getItem(key), pendingKey)).toBeNull();
    expect(observation.browserCommands).toHaveLength(2);
    expect(holdings(game, [actorId, companionId])).toEqual(before);
    expect((await read()).player.outings).toEqual([]);
    await task.getByRole('button', { name: 'Prepare another task', exact: true }).click();
    await expect(send).toBeEnabled();
    await task.locator('.ol-task-overview details summary').click();
    await expect(purpose).toHaveValue(intendedPurpose);
    expect(observation.browserCommands).toHaveLength(2);
    observation.readings.push({
      originalSend: original,
      retainedOriginalBytes: originalBytes,
      receipt,
    });

    const invite = {
      type: 'outing',
      outingOperation: 'invite',
      targetId: actorId,
      destinationId: 'campfire',
      outingMode: 'enqueue',
    } as const;
    await supplied(
      game,
      observation,
      'Mara supplies a native invitation for the player to decline',
      companionId,
      invite,
    );
    let incoming = (await read()).player.outings[0]!;
    expect(incoming.status).toBe('pending');
    const character = await openPanel(page, 'character', 'Character');
    await character.getByRole('tab', { name: 'Capabilities', exact: true }).click();
    await page.setViewportSize({ width: 390, height: 420 });
    const decline = character.getByRole('button', { name: /^Decline travel to / });
    await keyboardControl(decline);
    await fit(page, character, info, 'invitation-incoming-decline-character-short');
    expect((await reply(page, decline, 'decline')).ok).toBe(true);
    await expect(decline).toHaveCount(0);
    expect(holdings(game, [actorId, companionId])).toEqual(before);
    await supplied(
      game,
      observation,
      'Mara supplies another native invitation for deliberate player acceptance',
      companionId,
      invite,
    );
    incoming = (await read()).player.outings[0]!;
    const activeTask = await openPanel(page, 'activity', 'Current task');
    const accept = activeTask.getByRole('button', { name: /^Accept travel to / });
    await expect(accept).toContainText(incoming.destination);
    await keyboardControl(accept);
    await fit(page, activeTask, info, 'invitation-incoming-accept-task-short');
    expect(holdings(game, [actorId, companionId])).toEqual(before);
    expect((await reply(page, accept, 'accept')).ok).toBe(true);
    // Do not advance native time: PX04 owns actual travel/arrival/restart. This
    // check qualifies the newly composed accepted/Leave controls, not that suite.
    const accepted = (await read()).player.outings[0]!;
    expect(accepted.status).not.toBe('pending');
    await openPanel(page, 'character', 'Character');
    await character.getByRole('tab', { name: 'Capabilities', exact: true }).click();
    const leave = character.getByRole('button', { name: 'Leave outing', exact: true });
    await keyboardControl(leave);
    await fit(page, character, info, 'invitation-accepted-leave-character-short');
    expect((await reply(page, leave, 'leave')).ok).toBe(true);
    expect((await read()).player.outings).toEqual([]);
    expect(holdings(game, [actorId, companionId])).toEqual(before);
    expect(
      observation.browserCommands.map(
        (request) => request.command.outingOperation ?? request.command.type,
      ),
    ).toEqual(['activity-request', 'leave', 'decline', 'accept', 'leave']);
    observation.readings.push({
      descriptionQuery: 'known destination',
      companionId,
      destinationId: target!.id,
      purpose: intendedPurpose,
      modes,
      accepted,
      noNativeTimeAdvanced: game.service.world.simTime === 0,
    });
    expect(game.service.world.simTime).toBe(0);
  });
});

test.afterAll(closeTestDatabases);
