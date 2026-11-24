import type { GameView } from '@open-legend/protocol';
import { test, expect, type TestInfo } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { enterGame, blockExternalBrowserRequests } from '../fixtures/browser.js';
import { browserTabHeaders, rustBrowserGame } from '../fixtures/rust-browser.js';

async function recordJson(info: TestInfo, name: string, value: unknown) {
  const path = info.outputPath(`${name}.json`);
  await writeFile(path, JSON.stringify(value, null, 2));
  await info.attach(name, { path, contentType: 'application/json' });
}

test('WASD steers native movement with bounded renewals and stops on key release and editor focus', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const inputs: Array<{
    kind: string;
    movementInputToken?: string;
    movement?: { movementInputToken: string };
    direction?: { x: number; z: number };
  }> = [];
  const acknowledgements: Array<{
    ok: boolean;
    code: string;
    inputScope?: { movementInputToken: string };
  }> = [];
  const unavailableAcknowledgements: Array<{
    request: string | null;
    status: number;
    error: string;
  }> = [];
  const acknowledgementReads: Promise<void>[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/api/input')) inputs.push(request.postDataJSON());
  });
  page.on('response', (response) => {
    if (!response.url().endsWith('/api/input')) return;
    // Chromium can deliver headers without retaining a readable response body.
    // This optional trace must report that gap, not abort native behavior checks.
    acknowledgementReads.push(
      response.json().then(
        (body) => {
          acknowledgements.push(body);
        },
        (error: unknown) => {
          unavailableAcknowledgements.push({
            request: response.request().postData(),
            status: response.status(),
            error: String(error),
          });
        },
      ),
    );
  });
  await blockExternalBrowserRequests(page);
  const game = await rustBrowserGame();
  try {
    await page.goto(game.base);
    await enterGame(page);
    const headers = await browserTabHeaders(page);
    const state = async () => {
      const response = await page.request.get(game.base + '/api/state', { headers });
      try {
        expect(response.ok(), 'current signed game view').toBe(true);
        const view = (await response.json()) as GameView;
        expect(view.access?.controlling).toBe(true);
        return view;
      } finally {
        await response.dispose();
      }
    };
    if ((await state()).clock.paused) {
      await page.getByRole('button', { name: 'Game menu (Escape)', exact: true }).click();
      await page.getByRole('button', { name: 'Resume world', exact: true }).click();
      await page.getByRole('button', { name: 'Back to the world', exact: true }).click();
      await expect.poll(async () => (await state()).clock.paused).toBe(false);
    }
    await page.locator('#world').focus();
    await page.waitForTimeout(200);
    const idle = inputs.length;
    const initial = (await state()).player.position;
    const heldAt = performance.now();
    await page.keyboard.down('w');
    await page.keyboard.down('d');
    await expect
      .poll(
        () =>
          inputs.filter(
            (input) =>
              input.kind === 'steer' &&
              input.direction &&
              input.direction.x !== 0 &&
              input.direction.z !== 0,
          ).length,
      )
      .toBeGreaterThan(0);
    await expect
      .poll(async () => {
        const p = (await state()).player.position;
        return Math.hypot(p.x - initial.x, p.z - initial.z);
      })
      .toBeGreaterThan(0.1);
    await page.waitForTimeout(350);
    await page.keyboard.up('w');
    await page.keyboard.up('d');
    const heldMs = performance.now() - heldAt;
    // Expiry may already have stopped this lane before keyup. Both outcomes
    // must stop actual motion; neither may revive the old held keys.
    await page.waitForTimeout(500);
    const stopped = await state();
    const stoppedAt = stopped.player.position;
    await page.waitForTimeout(250);
    const afterRelease = await state();
    const afterStop = afterRelease.player.position;
    expect(afterRelease.clock.seconds).toBeGreaterThan(stopped.clock.seconds);
    expect(Math.hypot(afterStop.x - stoppedAt.x, afterStop.z - stoppedAt.z)).toBeLessThan(0.001);
    const moving = inputs.slice(idle);
    const renewals = moving.filter((input) => input.kind === 'renew' && input.movement);
    expect(renewals.length).toBeGreaterThan(0);
    for (const input of moving.filter((input) => input.kind === 'steer' && input.direction)) {
      const size = Math.hypot(input.direction!.x, input.direction!.z);
      expect(size === 0 || Math.abs(size - 1) < 1e-9).toBe(true);
    }
    expect(moving.length).toBeLessThanOrEqual(Math.ceil(heldMs / 100) * 2 + 8);
    const firstToken = inputs.find((input) => input.movementInputToken)?.movementInputToken;
    await Promise.all(acknowledgementReads);
    await page.getByRole('button', { name: 'Game menu (Escape)', exact: true }).click();
    await page.getByRole('button', { name: 'Controls', exact: true }).click();
    const forward = page.getByLabel('Forward', { exact: true });
    await forward.focus();
    await expect(forward).toBeFocused();
    await page.waitForTimeout(150);
    const beforeEditorKey = inputs.length;
    await page.keyboard.press('w');
    await page.waitForTimeout(250);
    expect(inputs).toHaveLength(beforeEditorKey);
    await page.getByRole('button', { name: 'Hide Settings & help panel', exact: true }).click();
    await page.locator('#world').focus();
    await page.keyboard.press('Shift+S');
    const speech = page.getByRole('textbox', { name: 'Words to say out loud', exact: true });
    await expect(speech).toBeFocused();
    const beforeTextKey = inputs.length;
    await page.keyboard.press('w');
    await expect(speech).toHaveValue('w');
    await page.waitForTimeout(250);
    expect(inputs).toHaveLength(beforeTextKey);
    await page.getByRole('button', { name: 'Close text bar', exact: true }).click();
    const afterEditor = (await state()).player.position;
    expect(Math.hypot(afterEditor.x - afterStop.x, afterEditor.z - afterStop.z)).toBeLessThan(
      0.001,
    );
    await recordJson(info, 'movement-input', {
      heldMs,
      inputs,
      acknowledgements,
      unavailableAcknowledgements,
      scopeRotated: acknowledgements.some(
        (result) => result.inputScope && result.inputScope.movementInputToken !== firstToken,
      ),
      movement: Math.hypot(afterStop.x - initial.x, afterStop.z - initial.z),
      afterRelease: Math.hypot(afterStop.x - stoppedAt.x, afterStop.z - stoppedAt.z),
      movingClockContinued: afterRelease.clock.seconds > stopped.clock.seconds,
      renewals: renewals.length,
      editorAddedInputs: inputs.length - beforeEditorKey,
      typedInSpeech: true,
    });
  } finally {
    await page.keyboard.up('w').catch(() => {});
    await page.keyboard.up('d').catch(() => {});
    await page.close();
    await game.close();
  }
});
