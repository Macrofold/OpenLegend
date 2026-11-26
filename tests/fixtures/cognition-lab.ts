import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { expect, type Page } from '@playwright/test';
import type { GameView } from '@open-legend/protocol';
import { rustBrowserGame } from './rust-browser.js';
import { startTypedProvider } from './witness/provider.js';

export const replyText = 'Yes, let us talk.';
export const overrideNote = 'A note for this one browser request.';

/** Serve Rust with two owned databases and a TLS listener that can only issue zero-cost receipts. */
export async function startCognitionLabFixture(page: Page) {
  const overrides: string[] = [];
  const config: Parameters<typeof startTypedProvider>[0]['config'] = {
    judge(request) {
      if (typeof request.state === 'string' && request.state.includes(overrideNote))
        overrides.push(request.requestId);
      return { choices: { route: 'level2', reflection: 'no' } };
    },
  };
  const provider = await startTypedProvider({
    caseName: 'Signed Rust Cognition Lab',
    config,
    responses: {
      npc_response({ schema }) {
        const items = schema.properties.operations.items;
        const operation =
          items.anyOf?.find((item) => item.properties.talk?.type === 'object') ?? items;
        assert(operation.required, 'The current release must offer speech to this NPC.');
        const blank = (keys: string[]) => Object.fromEntries(keys.map((key) => [key, null]));
        return {
          ...blank(schema.required),
          operations: [
            {
              ...blank(operation.required),
              localId: 'speak',
              requiresAccepted: [],
              talk: {
                text: replyText,
                volume: 'normal',
                addresseeEntityId: null,
                selfIntroduction: null,
              },
            },
          ],
        };
      },
    },
  });
  let host: Awaited<ReturnType<typeof rustBrowserGame>> | undefined;
  async function close() {
    try {
      await host?.close();
    } finally {
      await provider.close();
    }
  }
  try {
    assert(config.macrofoldUrl && config.macrofoldKey);
    host = await rustBrowserGame({
      godMode: true,
      lab: {
        budgetUsd: 1,
        loopbackProvider: {
          url: config.macrofoldUrl,
          key: config.macrofoldKey,
          certificate: provider.certPath,
        },
      },
    });
    const base = host.base;
    const prefix = '/api/cognition-lab';
    let client: string | undefined;
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith(prefix))
        client = request.headers()['x-ol-client'] ?? client;
    });
    await page.goto(base + '/auth/login?returnTo=/cognition');
    await page.getByLabel('Starting point').selectOption('game');
    await page.getByRole('button', { name: 'Prepare Lab', exact: true }).click();
    await page.getByRole('button', { name: 'Take Lab control', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Release Lab control' })).toBeEnabled();
    const gameClient = randomUUID();
    async function view(lab = true): Promise<GameView> {
      assert(client);
      const result = await page.request.get(base + (lab ? prefix : '') + '/api/state', {
        headers: { 'X-OL-Client': lab ? client : gameClient },
      });
      assert(result.ok(), 'Current signed state is required.');
      return result.json();
    }
    async function request(path: string, body?: unknown) {
      const state = await view();
      const generation = state.historyEpoch?.split(':')[0];
      assert(client && state.access?.scope && generation);
      const headers = {
        Origin: base,
        'X-OL-Client': client,
        'X-OL-Scope': state.access.scope,
        'X-OL-Generation': generation,
      };
      return page.request.fetch(base + prefix + path, {
        method: body === undefined ? 'GET' : 'POST',
        headers,
        data: body,
      });
    }
    async function submit(words: string, held: boolean) {
      await page.getByLabel('Hold before the next model call').setChecked(held);
      const resume = page.getByRole('button', { name: 'Resume time', exact: true });
      if (await resume.isVisible()) await resume.click();
      const composer = page.getByRole('region', { name: 'Speak out loud' });
      await composer.getByPlaceholder('Say something…').fill(words);
      const receipt = page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname === prefix + '/api/chat' && r.request().method() === 'POST',
      );
      await composer.getByRole('button', { name: 'Say', exact: true }).click();
      const { jobId } = await (await receipt).json();
      assert(typeof jobId === 'string');
      return jobId;
    }
    return { base, close, submit, view, request, overrides, evidence: provider.summary };
  } catch (error) {
    await close();
    throw error;
  }
}
