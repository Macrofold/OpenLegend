import { test, expect, type Page, type Route } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';
import { fileURLToPath } from 'node:url';
import type {
  CognitionLabActor,
  CognitionLabEvent,
  CognitionLabCategory,
  CognitionLabField,
  CognitionLabOperation,
  CognitionLabReceipt,
  CognitionLabRun,
  CognitionLabSaved,
  CognitionLabSource,
  CognitionLabStage,
  CognitionLabWorkspace,
} from '@open-legend/protocol';

// Protocol checks exercise the real React app with controlled responses. The final
// journey starts real native routes and disposable databases with a deterministic provider.
let vite: ViteDevServer;
let origin = '';
test.beforeAll(async () => {
  vite = await createServer({
    configFile: fileURLToPath(new URL('../../apps/client/vite.config.ts', import.meta.url)),
    server: { host: '127.0.0.1', port: 0, strictPort: false },
  });
  await vite.listen();
  const address = vite.httpServer?.address();
  if (!address || typeof address === 'string') throw new Error('No lab fixture listener.');
  origin = `http://127.0.0.1:${address.port}`;
});
test.afterAll(async () => {
  await vite?.close();
});

const actors: CognitionLabActor[] = [
  { id: 'player', name: 'Mike', kind: 'person', controlled: true, canAuthor: true },
  { id: 'ada', name: 'Ada', kind: 'person', controlled: false, canAuthor: true },
  { id: 'bob', name: 'Bob', kind: 'person', controlled: false, canAuthor: true },
];
const categories: CognitionLabCategory[] = [
  'overview',
  'person',
  'body',
  'feelings',
  'relations',
  'work',
  'possessions',
  'surroundings',
  'memories',
  'history',
  'custom',
];
function run(): CognitionLabRun {
  return {
    id: 'run-old',
    name: 'Earlier quiet invitation',
    state: 'held',
    status: 'completed',
    startedAt: 1792886400000,
    originId: 'origin-old',
    worldId: 'world-lab',
    timeline: 'timeline-lab',
    focalActorId: 'ada',
    latestRootId: 'root-old',
    policy: {
      mode: 'oneResponse',
      focalActorId: 'ada',
      autonomousActorIds: ['ada', 'bob'],
      durationSeconds: 60,
      maximumCalls: 20,
      activeWallSeconds: 180,
    },
    counts: { intervals: 1, roots: 1, stages: 1, annotations: 0, calls: 1 },
    accounting: { knownCostUsd: 0, uncertainAttempts: 0, capturedBytes: 1024 },
    completeness: 'complete',
    retained: true,
  };
}
function workspace(): CognitionLabWorkspace {
  return {
    ok: true,
    workspaceId: 'lab-workspace',
    worldId: 'world-lab',
    timeline: 'timeline-lab',
    nativeRevision: 1,
    runtimeGeneration: 'generation-lab',
    scenarioRevision: 1,
    disclosureRevision: 'disclosure-1',
    privateDraftScope: 'private-lab-fixture',
    operationOwnerScope: 'operation-owner-fixture',
    cursor: '1',
    name: 'Ordinary starting scene',
    state: 'held',
    nativePaused: false,
    participantActorIds: ['player'],
    gameTime: 15,
    run: run(),
    settings: {
      policy: run().policy,
      models: { response: 'configured-fixture' },
      storageAllowanceBytes: 2 * 1024 ** 3,
      runCaptureAllowanceBytes: 64 * 1024 ** 2,
    },
    defaults: { inspectedActorId: 'ada', actorId: 'player', targetId: 'ada', volume: 'ordinary' },
    speechVolumes: [{ id: 'ordinary', label: 'Ordinary' }],
    categories: categories.map((id) => ({
      id,
      label: id.charAt(0).toUpperCase() + id.slice(1),
      available: true,
    })),
    capabilities: [],
    provider: { available: true },
    modelChoices: { response: ['configured-fixture'] },
    effortChoices: ['none', 'low', 'medium', 'high'],
    storage: { usedBytes: 1024, reservedBytes: 0, allowanceBytes: 2 * 1024 ** 3 },
  };
}
function stage(id: string): CognitionLabStage {
  const root = id.startsWith('root');
  return {
    id,
    runId: 'run-old',
    rootId: root ? undefined : 'root-old',
    primaryStageId: root ? 'stage-old' : undefined,
    actorId: 'ada',
    actorName: 'Ada',
    gameTime: 10,
    purpose: root ? 'Earlier invitation' : 'Actual response call',
    kind: root ? 'root' : 'generate',
    status: 'completed',
    summary: 'Ada accepted the earlier invitation.',
    resultText: root ? 'I remember that very crooked kettle. Let us use it.' : undefined,
    recordedAt: 1792886400000,
    completeness: 'complete',
    sections: [
      { id: 'input', label: 'Inputs', available: true },
      { id: 'questions', label: 'Choices', available: true },
      { id: 'memories', label: 'Memories', available: true },
      { id: 'changes', label: 'Changes', available: true },
    ],
    artifacts: [
      { id: 'request-old', kind: 'request', length: 48, contentType: 'application/json' },
    ],
    rerunAvailable: true,
    configuration: {
      model: 'captured-call-model',
      effort: 'low',
      maxOutputTokens: 321,
      customInputCount: 2,
      heldValueCount: 1,
      requestOverride: true,
      policy: run().policy,
    },
    timing: { captureMs: 12.5, operatorHoldMs: 37, providerMs: 88 },
    items: {
      items: [
        {
          id: 'captured-backstory',
          label: 'Captured backstory',
          datatype: 'text',
          meaning: 'native',
          value: 'Historical Ada remembers the crooked kettle.',
          editable: false,
        },
      ],
    },
  };
}
interface Fixture {
  workspace: CognitionLabWorkspace;
  operations: CognitionLabOperation[];
  receipts: Map<string, CognitionLabReceipt>;
  onOperation?: (operation: CognitionLabOperation, route: Route) => Promise<boolean>;
  fields?: CognitionLabField[];
  creates?: CognitionLabField[];
  choices?: { id: string; label: string }[];
  sources?: Record<string, CognitionLabSource>;
  workspaceReads: number;
  failChanges?: boolean;
  invalidEvent?: boolean;
  events?: CognitionLabEvent[];
  saved?: CognitionLabSaved[];
  savedDelayMs?: number;
  savedPageSize?: number;
  savedSparsePages?: boolean;
  stageDelayMs?: number;
}
async function fixture(
  page: Page,
  options?: Pick<Fixture, 'stageDelayMs' | 'events'>,
): Promise<Fixture> {
  const state: Fixture = {
    workspace: workspace(),
    operations: [],
    receipts: new Map(),
    workspaceReads: 0,
    ...options,
  };
  const fixtureActors = actors.map((actor) => ({ ...actor }));
  const reply = (route: Route, body: unknown) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  await page.route('**/api/cognition-lab/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/api/cognition-lab', '');
    if (path === '/workspace') {
      state.workspaceReads++;
      return reply(route, state.workspace);
    }
    if (path === '/changes') {
      if (state.failChanges) return route.abort('failed');
      await new Promise((resolve) => setTimeout(resolve, 100));
      const changed = url.searchParams.get('cursor') !== state.workspace.cursor;
      return reply(route, {
        ok: true,
        changed,
        cursor: state.workspace.cursor,
        ...(changed ? { workspace: state.workspace } : {}),
      }).catch(() => {});
    }
    if (path === '/actors') {
      const id = url.searchParams.get('id');
      const query = url.searchParams.get('query')?.toLowerCase() ?? '';
      return reply(route, {
        items: fixtureActors.filter((actor) =>
          id ? actor.id === id : actor.name.toLowerCase().includes(query),
        ),
      });
    }
    if (path.startsWith('/current/') && path.includes('/choices/')) {
      const query = url.searchParams.get('query')?.toLowerCase() ?? '';
      return reply(route, {
        items: (state.choices ?? []).filter((item) => item.label.toLowerCase().includes(query)),
      });
    }
    if (path.startsWith('/current/')) {
      const actorId = path.split('/')[2] ?? '';
      const category = url.searchParams.get('category') ?? 'overview';
      const actor = fixtureActors.find((item) => item.id === actorId);
      return reply(route, {
        ok: true,
        workspaceId: state.workspace.workspaceId,
        worldId: state.workspace.worldId,
        timeline: state.workspace.timeline,
        runtimeGeneration: state.workspace.runtimeGeneration,
        scenarioRevision: state.workspace.scenarioRevision,
        nativeRevision: state.workspace.nativeRevision,
        actorId,
        category,
        create: state.creates,
        fields: {
          items: state.fields?.slice(0, 50) ?? [
            {
              id: 'person.name',
              label: 'Name',
              datatype: 'text',
              meaning: 'native',
              value: actor?.name ?? actorId,
              editable: true,
              owner: 'person',
              token: { generation: 'fixture' },
            },
            {
              id: 'person.backstory',
              label: 'Backstory',
              datatype: 'text',
              meaning: 'native',
              value: `Current ${actor?.name ?? actorId} has a different life.`,
              editable: true,
              owner: 'person',
              multiline: true,
              token: { generation: 'fixture' },
            },
          ],
          ...(state.fields ? { total: state.fields.length } : {}),
        },
      });
    }
    if (path.startsWith('/sources/'))
      return reply(
        route,
        state.sources?.[path.slice('/sources/'.length)] ?? {
          id: 'missing',
          label: 'Unavailable source',
          scope: 'captured',
          content: null,
        },
      );
    if (path === '/runs') return reply(route, { items: [state.workspace.run ?? run()] });
    if (path === '/runs/run-old') return reply(route, state.workspace.run ?? run());
    if (path === '/runs/run-old/records')
      return reply(route, {
        items: [stage(url.searchParams.get('kind') === 'root' ? 'root-old' : 'stage-old')],
      });
    if (path.startsWith('/runs/run-old/stages/')) {
      if (state.stageDelayMs)
        await new Promise((resolve) => setTimeout(resolve, state.stageDelayMs));
      return reply(route, stage(path.split('/').at(-1) ?? 'stage-old'));
    }
    if (path === '/events')
      return reply(route, {
        items: state.events ?? [
          {
            id: 'event-old',
            runId: 'run-old',
            rootId: 'root-old',
            stageId: 'stage-old',
            actorId: 'ada',
            actorName: 'Ada',
            gameTime: 10,
            recordedAt: 1792886400000,
            kind: 'speech',
            status: state.invalidEvent ? undefined : 'completed',
            text: 'Earlier words remain in their captured history.',
          },
        ],
      });
    if (path.startsWith('/artifacts/'))
      return reply(route, {
        id: 'request-old',
        contentType: 'application/json',
        length: 48,
        offset: 0,
        text: '{"context":"Historical request, not current state"}',
        downloadUrl: '/api/cognition-lab/exports/run/run-old',
      });
    if (path === '/scenarios') {
      if (state.savedDelayMs)
        await new Promise((resolve) => setTimeout(resolve, state.savedDelayMs));
      const id = url.searchParams.get('id');
      const query = url.searchParams.get('query')?.toLowerCase() ?? '';
      const kind = url.searchParams.get('kind');
      const saved = (
        state.saved ?? [
          {
            id: 'checkpoint-fixture',
            kind: 'checkpoint',
            name: 'A retained native checkpoint',
            createdAt: 1792886400000,
            worldId: 'world-lab',
            timeline: 'timeline-lab',
            gameTime: 15,
            completeness: 'complete',
            compatible: true,
            bytes: 1024,
          },
        ]
      ).filter(
        (item) =>
          (!id || item.id === id) &&
          (!kind ||
            item.kind === kind ||
            (kind === 'origin' && (item.kind === 'scenario' || item.kind === 'checkpoint'))),
      );
      const matched =
        state.savedSparsePages || id
          ? saved
          : saved.filter((item) => item.name.toLowerCase().includes(query));
      const offset = Number(url.searchParams.get('cursor') ?? 0);
      const limit = state.savedPageSize ?? 50;
      return reply(route, {
        items: (id ? matched : matched.slice(offset, offset + limit)).filter(
          (item) => id || item.name.toLowerCase().includes(query),
        ),
        ...(!id && matched.length > offset + limit ? { nextCursor: String(offset + limit) } : {}),
      });
    }
    if (path === '/recipes' || path === '/actions') return reply(route, { items: [] });
    if (path === '/operations') {
      const operation = route.request().postDataJSON() as CognitionLabOperation;
      state.operations.push(operation);
      if (state.onOperation && (await state.onOperation(operation, route))) return;
      const previous = state.receipts.get(operation.commandId);
      if (previous) return reply(route, previous);
      state.workspace = {
        ...state.workspace,
        nativeRevision: state.workspace.nativeRevision + 1,
        cursor: String(state.workspace.nativeRevision + 1),
      };
      if (operation.kind === 'applyEdits') {
        state.workspace.scenarioRevision++;
        for (const edit of operation.edits)
          if (edit.fieldId === 'person.name') {
            const actor = fixtureActors.find((item) => item.id === edit.actorId);
            if (actor && typeof edit.value === 'string') actor.name = edit.value;
          }
      }
      if (operation.kind === 'setParticipants')
        state.workspace.participantActorIds = [
          ...state.workspace.participantActorIds.filter(
            (id) => id !== state.workspace.defaults.actorId,
          ),
          ...operation.actorIds,
        ];
      const receipt: CognitionLabReceipt = {
        ok: true,
        commandId: operation.commandId,
        message: 'The native fixture accepted this operation.',
        workspace: state.workspace,
        ...(operation.kind === 'submitStimulus' || operation.kind === 'prepareAndHold'
          ? { sourceAccepted: true, sourceId: 'accepted-source', runId: 'run-old' }
          : {}),
      };
      state.receipts.set(operation.commandId, receipt);
      return reply(route, receipt);
    }
    return route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ message: `Unsupported fixture read ${path}` }),
    });
  });
  await page.goto(`${origin}/cognition`);
  await expect(page.getByRole('heading', { name: 'Cognition Lab', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Inspect person', exact: true })).toHaveValue(
    'Ada',
  );
  return state;
}

test('receipt refresh requires a confirmation and never dispatches a model operation', async ({
  page,
}) => {
  const state = await fixture(page);
  let requests = 0;
  await page.route('**/runs/run-old/stages/stage-old/receipt', async (route) => {
    requests++;
    expect(route.request().method()).toBe('POST');
    expect(route.request().headers()['x-ol-lab-owner']).toBe(state.workspace.operationOwnerScope);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body:
        requests === 1
          ? 'unreadable confirmation'
          : JSON.stringify({ message: 'Provider completion remains unconfirmed.' }),
    });
  });
  const inspector = page.getByRole('region', { name: 'Recorded decisions', exact: true });
  await inspector.getByRole('button', { name: 'Timing/cost', exact: true }).click();
  const refresh = inspector.getByRole('button', { name: 'Refresh receipt', exact: true });
  await refresh.click();
  await expect(inspector).toContainText('The receipt check returned no confirmation.');
  await expect(inspector).not.toContainText('Receipt checked');
  await refresh.click();
  await expect(inspector).toContainText('Provider completion remains unconfirmed.');
  await expect(inspector).not.toContainText('The receipt check returned no confirmation.');
  expect(requests).toBe(2);
  expect(state.operations).toHaveLength(0);
});

for (const status of [401, 403])
  test(`receipt refresh clears protected views immediately on ${status}`, async ({ page }) => {
    const state = await fixture(page);
    let staleRead: Route | undefined;
    await page.route('**/api/cognition-lab/changes?*', async (route) => {
      staleRead = route;
    });
    await expect.poll(() => !!staleRead).toBe(true);
    await page.route('**/runs/run-old/stages/stage-old/receipt', (route) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Lab access was revoked.' }),
      }),
    );
    const inspector = page.getByRole('region', { name: 'Recorded decisions', exact: true });
    await inspector.getByRole('button', { name: 'Timing/cost', exact: true }).click();
    await inspector.getByRole('button', { name: 'Refresh receipt', exact: true }).click();
    await expect(page.getByText('Lab access was revoked.', { exact: true })).toBeVisible();
    await expect(inspector).toBeHidden();
    await staleRead!
      .fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          changed: true,
          cursor: 'stale',
          workspace: state.workspace,
        }),
      })
      .catch(() => {});
    await expect(page.getByRole('region', { name: 'Current character', exact: true })).toBeHidden();
    await expect(
      status === 401
        ? page.getByRole('link', { name: 'Sign in', exact: true })
        : page.getByRole('button', { name: 'Refresh lab access', exact: true }),
    ).toBeVisible();
    expect(state.operations).toHaveLength(0);
  });

for (const status of [404, 410])
  test(`receipt refresh clears only unavailable inspection on ${status}`, async ({ page }) => {
    const state = await fixture(page);
    const words = page.getByRole('textbox', { name: 'Words to say', exact: true });
    await words.fill('Keep this unsent intention.');
    await page.route('**/runs/run-old/stages/stage-old/receipt', (route) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'This captured model stage is unavailable.' }),
      }),
    );
    const inspector = page.getByRole('region', { name: 'Recorded decisions', exact: true });
    await inspector.getByRole('button', { name: 'Timing/cost', exact: true }).click();
    await inspector.getByRole('button', { name: 'Refresh receipt', exact: true }).click();
    await expect(inspector).toContainText('This captured model stage is unavailable.');
    await expect(inspector.getByRole('button', { name: /Earlier quiet invitation/ })).toBeVisible();
    await expect(inspector.getByRole('button', { name: 'Refresh receipt' })).toBeHidden();
    await expect(words).toHaveValue('Keep this unsent intention.');
    await expect(
      page.getByRole('region', { name: 'Current character', exact: true }),
    ).toBeVisible();
    expect(state.operations).toHaveLength(0);
  });

test('receipt refresh ignores late access failure after its inspection closes', async ({
  page,
}) => {
  const state = await fixture(page);
  let receiptRead: Route | undefined;
  let requests = 0;
  await page.route('**/runs/run-old/stages/stage-old/receipt', async (route) => {
    requests++;
    receiptRead = route;
  });
  const inspector = page.getByRole('region', { name: 'Recorded decisions', exact: true });
  await inspector.getByRole('button', { name: 'Timing/cost', exact: true }).click();
  const refresh = inspector.getByRole('button', { name: 'Refresh receipt', exact: true });
  await refresh.click();
  await expect(refresh).toBeDisabled();
  await refresh.evaluate((element) => (element as HTMLButtonElement).click());
  await expect.poll(() => !!receiptRead).toBe(true);
  await inspector.getByRole('button', { name: 'Back to recorded runs', exact: true }).click();
  await receiptRead!
    .fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Obsolete permission refusal.' }),
    })
    .catch(() => {});
  await expect(inspector.getByRole('button', { name: /Earlier quiet invitation/ })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Current character', exact: true })).toBeVisible();
  await expect(page.getByText('Obsolete permission refusal.', { exact: true })).toBeHidden();
  expect(requests).toBe(1);
  expect(state.operations).toHaveLength(0);
});

test('following latest keeps newest-first overflow visible and preserves deliberate reading on refresh', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const events: CognitionLabEvent[] = Array.from({ length: 50 }, (_, index) => ({
    id: `overflow-${50 - index}`,
    actorId: 'ada',
    actorName: 'Ada',
    gameTime: 50 - index,
    recordedAt: 50 - index,
    kind: 'speech',
    status: 'committed',
    text: `Latest-first event ${50 - index}`,
  }));
  const state = await fixture(page, { events });
  const timeline = page.locator('[data-pane="timeline"]');
  const body = timeline.locator('.cl-pane-body').first();
  await expect(timeline.getByText('Latest-first event 50', { exact: true })).toBeInViewport();
  expect(await body.evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(true);
  await timeline.getByRole('button', { name: 'Following latest events', exact: true }).click();
  await body.evaluate((node) => {
    node.scrollTop = node.scrollHeight;
  });
  const reading = await body.evaluate((node) => node.scrollTop);
  expect(reading).toBeGreaterThan(0);
  state.events = events.map((event, index) =>
    index ? event : { ...event, text: 'Updated latest-first event 50' },
  );
  state.workspace.nativeRevision++;
  state.workspace.cursor = String(state.workspace.nativeRevision);
  await expect(timeline.getByText('Updated latest-first event 50', { exact: true })).toHaveCount(1);
  await expect.poll(() => body.evaluate((node) => node.scrollTop)).toBe(reading);
  await timeline.getByRole('button', { name: 'Jump to latest events', exact: true }).click();
  await expect(
    timeline.getByText('Updated latest-first event 50', { exact: true }),
  ).toBeInViewport();
  await expect.poll(() => body.evaluate((node) => node.scrollTop)).toBe(0);
  await timeline.getByRole('button', { name: 'Following latest events', exact: true }).click();
  await body.evaluate((node) => {
    node.scrollTop = 200;
  });
  const beforeDetails = await body.evaluate((node) => node.scrollTop);
  await page.getByRole('button', { name: 'Edit full speech draft', exact: true }).click();
  await page.getByRole('button', { name: 'Back to timeline', exact: true }).click();
  await expect.poll(() => body.evaluate((node) => node.scrollTop)).toBe(beforeDetails);
  expect(state.operations).toHaveLength(0);
});

test('current editors, historical captures and speech identities remain independent', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const state = await fixture(page);
  await expect(
    page.getByText('I remember that very crooked kettle. Let us use it.', { exact: true }),
  ).toBeVisible();
  const current = page.getByRole('region', { name: 'Current character', exact: true });
  const inspector = page.getByRole('region', { name: 'Recorded decisions', exact: true });
  const person = page.getByRole('combobox', { name: 'Inspect person', exact: true });
  await person.fill('Bob');
  await page.getByRole('option', { name: 'Bob', exact: true }).click();
  await expect(current.getByLabel('Name', { exact: true })).toHaveValue('Bob');
  await expect(page.getByRole('combobox', { name: 'Speaker or actor', exact: true })).toHaveValue(
    'Mike',
  );
  await expect(page.getByRole('combobox', { name: 'Addressee', exact: true })).toHaveValue('Ada');
  await expect(
    inspector.getByText('Historical Ada remembers the crooked kettle.', { exact: true }),
  ).toBeVisible();
  await current.getByLabel('Name', { exact: true }).fill('Robert');
  const words = page.getByRole('textbox', { name: 'Words to say', exact: true });
  await words.fill('Would you inspect the kettle?');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  const review = page.getByRole('dialog', { name: 'Review unapplied edits', exact: true });
  await expect(review).toBeVisible();
  expect(state.operations).toHaveLength(0);
  await review.getByRole('button', { name: 'Use applied values', exact: true }).click();
  await expect.poll(() => state.operations.length).toBe(1);
  const submission = state.operations[0];
  expect(submission?.kind).toBe('submitStimulus');
  if (submission?.kind !== 'submitStimulus') throw new Error('No submitted stimulus.');
  expect(submission.stimulus).toEqual({
    kind: 'say',
    actorId: 'player',
    targetId: 'ada',
    text: 'Would you inspect the kettle?',
    volume: 'ordinary',
  });
  await expect(words).toHaveValue('');
  await expect(current.getByLabel('Name', { exact: true })).toHaveValue('Robert');
  await current.getByRole('button', { name: 'Apply person (1)', exact: true }).click();
  await expect.poll(() => state.operations.length).toBe(2);
  const edit = state.operations[1];
  expect(edit?.kind).toBe('applyEdits');
  if (edit?.kind === 'applyEdits')
    expect(edit.edits[0]).toMatchObject({
      actorId: 'bob',
      fieldId: 'person.name',
      baseValue: 'Bob',
      value: 'Robert',
      owner: 'person',
    });
  await expect(
    current.getByText('Applied values · no changes here', { exact: true }),
  ).toBeVisible();
});

test('uncertain source acceptance preserves newer drafts and historical selection', async ({
  page,
}) => {
  const state = await fixture(page);
  let accepted: CognitionLabReceipt | undefined;
  state.onOperation = async (operation, route) => {
    if (operation.kind !== 'submitStimulus') return false;
    if (!accepted) {
      accepted = {
        ok: true,
        commandId: operation.commandId,
        message: 'The original speech was accepted.',
        sourceAccepted: true,
        sourceId: 'one-source',
        runId: 'run-old',
        workspace: state.workspace,
      };
      await route.abort('failed');
      return true;
    }
    expect(operation.commandId).toBe(accepted.commandId);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(accepted),
    });
    return true;
  };
  const words = page.getByRole('textbox', { name: 'Words to say', exact: true });
  await words.fill('One original utterance.');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  const results = page.getByRole('dialog', { name: 'Operation results', exact: true });
  await expect(
    results.getByRole('button', { name: 'Check same operation', exact: true }),
  ).toBeVisible();
  await results.getByRole('button', { name: 'Close', exact: true }).click();
  await words.fill('A newer unsent draft.');
  const inspector = page.getByRole('region', { name: 'Recorded decisions', exact: true });
  await inspector.getByRole('button', { name: 'Back to recorded runs', exact: true }).click();
  await expect(inspector.getByRole('button', { name: /Earlier quiet invitation/ })).toBeVisible();
  await page.getByRole('button', { name: '1 unconfirmed operation', exact: true }).click();
  await page.getByRole('button', { name: 'Check same operation', exact: true }).click();
  await expect.poll(() => state.operations.length).toBe(2);
  await page
    .getByRole('dialog', { name: 'Operation results', exact: true })
    .getByRole('button', { name: 'Close', exact: true })
    .click();
  await expect(words).toHaveValue('A newer unsent draft.');
  await expect(inspector.getByRole('button', { name: /Earlier quiet invitation/ })).toBeVisible();
  await expect(
    inspector.getByRole('button', { name: 'Follow latest results', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false');
  expect(state.operations[0]?.commandId).toBe(state.operations[1]?.commandId);
  expect(state.operations.filter((operation) => operation.kind === 'submitStimulus')).toHaveLength(
    2,
  );
});

test('a replaced runtime receipt settles without redirecting inspection or opening old preparation', async ({
  page,
}) => {
  const state = await fixture(page);
  const original = structuredClone(state.workspace);
  let releaseReceipt!: () => void;
  const pendingReceipt = new Promise<void>((resolve) => {
    releaseReceipt = resolve;
  });
  state.onOperation = async (operation, route) => {
    if (operation.kind !== 'prepareAndHold') return false;
    await pendingReceipt;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        commandId: operation.commandId,
        message: 'The original preparation was accepted.',
        sourceAccepted: true,
        sourceId: 'original-source',
        runId: original.run!.id,
        workspace: original,
      } satisfies CognitionLabReceipt),
    });
    return true;
  };
  await page.route('**/api/cognition-lab/runs/**', (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/api/cognition-lab/runs/', '');
    const replacement = path.startsWith('run-replacement');
    const selectedRun = replacement ? state.workspace.run! : original.run!;
    const selectedStage = (id: string) => ({
      ...stage(id),
      runId: selectedRun.id,
      ...(replacement
        ? {
            rootId: id.startsWith('root') ? undefined : 'root-replacement',
            primaryStageId: id.startsWith('root') ? 'stage-replacement' : undefined,
            purpose: 'Replacement source',
          }
        : {}),
    });
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        path.includes('/stages/')
          ? selectedStage(path.split('/').at(-1)!)
          : path.endsWith('/records')
            ? {
                items: [
                  selectedStage(
                    url.searchParams.get('kind') === 'root'
                      ? selectedRun.latestRootId!
                      : replacement
                        ? 'stage-replacement'
                        : 'stage-old',
                  ),
                ],
              }
            : selectedRun,
      ),
    });
  });
  try {
    await page.getByRole('textbox', { name: 'Words to say', exact: true }).fill('Original source.');
    await page.getByRole('button', { name: 'Edit next model input', exact: true }).click();
    const preparation = page.getByRole('dialog', {
      name: 'Prepare one real model call',
      exact: true,
    });
    await preparation.getByRole('button', { name: 'Prepare and hold', exact: true }).click();
    await expect.poll(() => state.operations.length).toBe(1);
    await preparation.getByRole('button', { name: 'Cancel', exact: true }).click();
    state.workspace = {
      ...state.workspace,
      runtimeGeneration: 'generation-replacement',
      worldId: 'world-replacement',
      timeline: 'timeline-replacement',
      disclosureRevision: 'disclosure-replacement',
      nativeRevision: 2,
      cursor: '2',
      name: 'Replacement scene',
      run: {
        ...run(),
        id: 'run-replacement',
        worldId: 'world-replacement',
        timeline: 'timeline-replacement',
        latestRootId: 'root-replacement',
      },
    };
    const inspector = page.getByRole('region', { name: 'Recorded decisions', exact: true });
    const source = inspector.getByRole('combobox', { name: 'Recorded source', exact: true });
    await expect(source).toHaveValue('Replacement source');
    await expect(page.getByText('Replacement scene', { exact: true })).toBeVisible();
    releaseReceipt();
    await expect(
      page.getByRole('button', { name: '1 pending operation', exact: true }),
    ).toHaveCount(0);
    await expect(source).toHaveValue('Replacement source');
    await expect(
      page.getByRole('dialog', { name: 'Waiting for the selected call', exact: true }),
    ).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: /^Held live call/ })).toHaveCount(0);
    await expect(
      inspector.getByRole('button', { name: 'Following latest results', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(state.operations).toHaveLength(1);
  } finally {
    releaseReceipt();
  }
});

test('reconciling an accepted action preserves the next draft’s exact installed binding', async ({
  page,
}) => {
  const state = await fixture(page);
  const actions = [
    { id: 'first', label: 'First installed action', available: true, command: { fixture: 'A' } },
    { id: 'next', label: 'Next installed action', available: true, command: { fixture: 'B' } },
  ];
  await page.route('**/api/cognition-lab/actions?*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: actions }),
    }),
  );
  let accepted: CognitionLabReceipt | undefined;
  state.onOperation = async (operation, route) => {
    if (operation.kind !== 'submitStimulus') return false;
    if (!accepted) {
      accepted = {
        ok: true,
        commandId: operation.commandId,
        message: 'The original installed action was accepted.',
        sourceAccepted: true,
        sourceId: 'accepted-action',
        runId: 'run-old',
        workspace: state.workspace,
      };
      await route.abort('failed');
      return true;
    }
    if (operation.commandId !== accepted.commandId) return false;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(accepted),
    });
    return true;
  };
  await page.getByRole('button', { name: 'Act', exact: true }).click();
  await page.getByRole('button', { name: 'Choose installed action', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Installed actions', exact: true })
    .getByRole('button', { name: 'First installed action', exact: true })
    .click();
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  const results = page.getByRole('dialog', { name: 'Operation results', exact: true });
  await expect(
    results.getByRole('button', { name: 'Check same operation', exact: true }),
  ).toBeVisible();
  await results.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'First installed action', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Installed actions', exact: true })
    .getByRole('button', { name: 'Next installed action', exact: true })
    .click();
  await page.getByRole('textbox', { name: 'Action request', exact: true }).fill('The next draft.');
  await page.getByRole('button', { name: '1 unconfirmed operation', exact: true }).click();
  await results.getByRole('button', { name: 'Check same operation', exact: true }).click();
  await expect.poll(() => state.operations.length).toBe(2);
  await results.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Next installed action', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect.poll(() => state.operations.length).toBe(3);
  expect(state.operations[0]).toMatchObject({
    kind: 'submitStimulus',
    stimulus: { kind: 'act', command: actions[0]!.command },
  });
  expect(state.operations[1]?.commandId).toBe(state.operations[0]?.commandId);
  expect(state.operations[2]).toMatchObject({
    kind: 'submitStimulus',
    stimulus: { kind: 'act', text: 'The next draft.', command: actions[1]!.command },
  });
});

test('prepared input closes without dispatch, reopens the same handle, and submits once', async ({
  page,
}) => {
  const state = await fixture(page);
  state.workspace.run = {
    ...run(),
    prepared: {
      id: 'prepared-one',
      stageId: 'stage-held',
      actorId: 'ada',
      purpose: 'Response generation',
      kind: 'generate',
      editable: true,
      status: 'held',
      request: { task: 'response', context: 'Original scenario input' },
    },
  };
  state.workspace.nativeRevision++;
  state.workspace.cursor = String(state.workspace.nativeRevision);
  await expect(page.getByRole('button', { name: 'Edit held input', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit held input', exact: true }).click();
  const dialog = page.getByRole('dialog', {
    name: 'Held live call · Response generation',
    exact: true,
  });
  await dialog
    .getByRole('textbox', { name: 'Model-facing request', exact: true })
    .fill('{"task":"response","context":"One edited call"}');
  await dialog.getByRole('button', { name: 'Close editor', exact: true }).click();
  expect(state.operations).toHaveLength(0);
  await page.getByRole('button', { name: 'Edit held input', exact: true }).click();
  await expect(
    dialog.getByRole('textbox', { name: 'Model-facing request', exact: true }),
  ).toHaveValue(/Original scenario input/);
  await dialog
    .getByRole('textbox', { name: 'Model-facing request', exact: true })
    .fill('{"task":"response","context":"One edited call"}');
  await dialog.getByRole('button', { name: 'Submit this input once', exact: true }).click();
  await expect.poll(() => state.operations.length).toBe(1);
  expect(state.operations[0]).toMatchObject({
    kind: 'submitPrepared',
    handleId: 'prepared-one',
    request: { task: 'response', context: 'One edited call' },
  });
  await expect(dialog).toBeHidden();
});

test('desktop panes reserve controls and focus mode preserves a dirty field', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const state = await fixture(page);
  const current = page.getByRole('region', { name: 'Current character', exact: true });
  await current
    .getByLabel('Name', { exact: true })
    .fill('Ada with an unusually long retained draft name');
  state.fields = [
    {
      id: 'person.name',
      label: 'Name',
      datatype: 'text',
      meaning: 'native',
      value: 'Ada',
      editable: true,
      owner: 'person',
    },
    ...Array.from(
      { length: 999 },
      (_, index): CognitionLabField => ({
        id: `concern-${index}`,
        label: `Current concern ${index + 1}`,
        datatype: 'text',
        meaning: 'derived',
        value: `A long particular concern about remembered events, actual work and relationships. ${'This is readable native evidence. '.repeat(12)}`,
        editable: false,
      }),
    ),
  ];
  state.workspace.nativeRevision++;
  state.workspace.cursor = String(state.workspace.nativeRevision);
  await expect(current.locator('.cl-section')).toHaveCount(50);
  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 2560, height: 1440 },
  ]) {
    await page.setViewportSize(viewport);
    const boxes = await page.locator('.cl-columns > .cl-column').evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      }),
    );
    expect(boxes).toHaveLength(3);
    expect(Math.round(boxes[0]?.width ?? 0)).toBe(viewport.width === 1920 ? 420 : 480);
    for (const locator of [
      page.getByRole('button', { name: 'Submit', exact: true }),
      page.getByRole('button', { name: 'Apply person (1)', exact: true }),
      page.getByRole('button', { name: 'Stop', exact: true }),
    ]) {
      const bounds = await locator.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds?.x ?? -1).toBeGreaterThanOrEqual(0);
      expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(viewport.width);
      expect((bounds?.y ?? 0) + (bounds?.height ?? 0)).toBeLessThanOrEqual(viewport.height);
    }
    await page.screenshot({ path: info.outputPath(`cognition-${viewport.width}.png`) });
  }
  await page.getByRole('button', { name: 'Focus current character', exact: true }).click();
  await expect(current.getByLabel('Name', { exact: true })).toHaveValue(
    'Ada with an unusually long retained draft name',
  );
  await page.getByRole('button', { name: 'Return to three panes', exact: true }).click();
  await expect(current.getByLabel('Name', { exact: true })).toHaveValue(
    'Ada with an unusually long retained draft name',
  );
});

test('full native source content and its exact edit token replace a placeholder preview', async ({
  page,
}) => {
  const state = await fixture(page);
  const original = {
    id: 'memory-native',
    kind: 'observed',
    text: 'An attributed original memory.',
    time: 10,
  };
  state.fields = [
    {
      id: 'memory-field',
      label: 'Remembered observation',
      datatype: 'json',
      meaning: 'native',
      value: null,
      preview: 'A short preview only.',
      editable: true,
      owner: 'memory',
      token: { entryId: 'experience:memory-native', generation: 'generation-lab' },
      detail: { kind: 'source', id: 'memory-source' },
    },
  ];
  state.sources = {
    'memory-source': {
      id: 'memory-source',
      label: 'Full native memory',
      scope: 'current',
      actorId: 'ada',
      content: {
        entry: original,
        hash: 'exact-native-hash',
        entryId: 'experience:memory-native',
        generation: 'generation-lab',
      },
    },
  };
  state.workspace.nativeRevision++;
  state.workspace.cursor = String(state.workspace.nativeRevision);
  const current = page.getByRole('region', { name: 'Current character', exact: true });
  await current.getByRole('button', { name: 'Edit full structured value', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Remembered observation', exact: true });
  const editor = modal.getByRole('textbox', { name: 'Remembered observation', exact: true });
  await expect(editor).toHaveValue(JSON.stringify(original, null, 2));
  await editor.fill(
    JSON.stringify({ ...original, text: 'A deliberately corrected attributed memory.' }),
  );
  await modal.getByRole('button', { name: 'Stage edit', exact: true }).click();
  await current.getByRole('button', { name: 'Apply memory (1)', exact: true }).click();
  await expect.poll(() => state.operations.length).toBe(1);
  const operation = state.operations[0];
  expect(operation?.kind).toBe('applyEdits');
  if (operation?.kind !== 'applyEdits') throw new Error('No native memory edit.');
  expect(operation.edits[0]).toMatchObject({
    baseValue: original,
    value: { ...original, text: 'A deliberately corrected attributed memory.' },
    token: {
      hash: 'exact-native-hash',
      entryId: 'experience:memory-native',
      generation: 'generation-lab',
    },
  });
});

test('retained comparison preserves current editors and the unsent ordinary composer', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const state = await fixture(page);
  state.workspace.run!.comparison = {
    comparisonId: 'comparison-native',
    originId: 'shared-comparison-origin',
    variantName: 'Native baseline',
  };
  const current = page.getByRole('region', { name: 'Current character', exact: true });
  await current.getByLabel('Name', { exact: true }).fill('An unapplied current Ada');
  const words = page.getByRole('textbox', { name: 'Words to say', exact: true });
  await words.fill('A retained unsent sentence.');
  await page.getByRole('button', { name: 'Compare', exact: true }).click();
  const a = page.getByRole('region', { name: 'Variant A · captured run', exact: true });
  const b = page.getByRole('region', { name: 'Variant B · captured run', exact: true });
  await expect(
    a.getByText('Historical Ada remembers the crooked kettle.', { exact: true }),
  ).toBeVisible();
  await expect(a.locator('.cl-comparison-context')).toContainText('captured-call-model');
  await expect(a.locator('.cl-comparison-context')).toContainText(
    'Comparison origin shared-comparison-origin · Native baseline',
  );
  await expect(a.locator('.cl-comparison-context')).toContainText('Replay checkpoint origin-old');
  await expect(a.locator('.cl-comparison-context')).not.toContainText('configured-fixture');
  await b.getByRole('button', { name: /Earlier quiet invitation/ }).click();
  await expect(
    b.getByText('Historical Ada remembers the crooked kettle.', { exact: true }),
  ).toBeVisible();
  await expect(current.getByLabel('Name', { exact: true })).toHaveValue('An unapplied current Ada');
  expect(state.operations).toHaveLength(0);
  await page.getByRole('button', { name: 'Return to experiment', exact: true }).click();
  await expect(words).toHaveValue('A retained unsent sentence.');
  await expect(current.getByLabel('Name', { exact: true })).toHaveValue('An unapplied current Ada');
});

test('physical presence is explicit and independent of inspection, speech and autonomy', async ({
  page,
}) => {
  const state = await fixture(page);
  state.workspace = {
    ...state.workspace,
    name: 'Two physical participants',
    participantActorIds: ['player', 'another-player'],
    cursor: 'participants-changed',
  };
  await expect(page.locator('.cl-scenario-name')).toHaveText('Two physical participants');
  await page.getByRole('button', { name: 'Lab settings', exact: true }).click();
  await page.getByRole('button', { name: 'Physical presence', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Lab settings', exact: true });
  await expect(dialog).not.toContainText('another-player');
  await dialog.getByRole('checkbox', { name: /Mike/ }).uncheck();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Lab settings', exact: true }).click();
  await expect(dialog.getByRole('checkbox', { name: /Mike/ })).not.toBeChecked();
  expect(state.operations).toHaveLength(0);
  await dialog.getByRole('button', { name: 'Apply physical presence', exact: true }).click();
  await expect.poll(() => state.operations.length).toBe(1);
  expect(state.operations[0]).toMatchObject({ kind: 'setParticipants', actorIds: [] });
  expect(state.workspace.participantActorIds).toEqual(['another-player']);
  expect(state.workspace.settings.policy.autonomousActorIds).toEqual(['ada', 'bob']);
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Inspect person', exact: true })).toHaveValue(
    'Ada',
  );
  await expect(page.getByRole('combobox', { name: 'Speaker or actor', exact: true })).toHaveValue(
    'Mike',
  );
});

test('character creation uses installed descriptors, keeps draft text, and waits for explicit creation', async ({
  page,
}) => {
  const state = await fixture(page);
  state.workspace.characterCreation = {
    available: true,
    fields: [
      { id: 'name', label: 'Name', datatype: 'text', meaning: 'native', value: '', editable: true },
      {
        id: 'position',
        label: 'Position',
        datatype: 'json',
        meaning: 'native',
        value: { x: 2, y: 0, z: 0 },
        editable: true,
      },
    ],
  };
  state.workspace.nativeRevision++;
  state.workspace.cursor = String(state.workspace.nativeRevision);
  await page.getByRole('button', { name: 'Add character', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Add character', exact: true });
  await dialog.getByRole('button', { name: 'Edit Name', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Name', exact: true });
  await editor.getByRole('textbox', { name: 'Name', exact: true }).fill('A new native person');
  await editor.getByRole('button', { name: 'Stage edit', exact: true }).click();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Add character', exact: true }).click();
  await expect(dialog).toContainText('A new native person');
  expect(state.operations).toHaveLength(0);
  await dialog.getByRole('button', { name: 'Create character', exact: true }).click();
  await expect.poll(() => state.operations.length).toBe(1);
  expect(state.operations[0]).toMatchObject({
    kind: 'createCharacter',
    values: { name: 'A new native person', position: { x: 2, y: 0, z: 0 } },
  });
});

test('confirmed native replacement resubscribes read-only updates without replaying the operation', async ({
  page,
}) => {
  const state = await fixture(page);
  state.onOperation = async (operation, route) => {
    if (operation.kind !== 'newScenario') return false;
    state.workspace = {
      ...state.workspace,
      runtimeGeneration: 'generation-replaced',
      nativeRevision: 0,
      cursor: 'replacement',
      scenarioRevision: 0,
      name: 'Confirmed replacement',
    };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        commandId: operation.commandId,
        message: 'Replacement accepted.',
        workspace: state.workspace,
      }),
    });
    return true;
  };
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await page.getByRole('button', { name: 'Create fresh scene', exact: true }).click();
  await expect(page.locator('.cl-scenario-name')).toHaveText('Confirmed replacement');
  await expect.poll(() => state.workspaceReads).toBe(2);
  await expect(page.getByRole('button', { name: 'Reconnect', exact: true })).toHaveCount(0);
  expect(state.operations).toHaveLength(1);
});

test('full-storage recovery applies only the selected larger allowance', async ({ page }) => {
  const state = await fixture(page);
  await page.getByRole('button', { name: 'Lab settings', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Lab settings', exact: true });
  await dialog.getByRole('button', { name: 'Retained storage', exact: true }).click();
  await dialog
    .getByRole('spinbutton', { name: 'Lab data allowance', exact: true })
    .fill(String(3 * 1024 ** 3));
  await dialog
    .getByRole('spinbutton', { name: 'Evidence allowance per run', exact: true })
    .fill('-');
  await dialog
    .getByRole('button', { name: 'Increase storage allowance only', exact: true })
    .click();
  await expect.poll(() => state.operations.length).toBe(1);
  expect(state.operations[0]).toMatchObject({
    kind: 'applySettings',
    settings: { storageAllowanceBytes: 3 * 1024 ** 3 },
  });
  expect(
    Object.keys(state.operations[0]!.kind === 'applySettings' ? state.operations[0]!.settings : {}),
  ).toEqual(['storageAllowanceBytes']);
  await expect(
    dialog.getByRole('spinbutton', { name: 'Evidence allowance per run', exact: true }),
  ).toHaveValue('-');
});

test('reconnect revalidates reads and keeps unsent text without automatic submission', async ({
  page,
}) => {
  const state = await fixture(page);
  const words = page.getByRole('textbox', { name: 'Words to say', exact: true });
  await words.fill('Still an unsent sentence.');
  state.failChanges = true;
  await expect(page.getByRole('button', { name: 'Reconnect', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit', exact: true })).toBeDisabled();
  await words.press('Control+Enter');
  expect(state.operations).toHaveLength(0);
  state.failChanges = false;
  await page.getByRole('button', { name: 'Reconnect', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Submit', exact: true })).toBeEnabled();
  await expect(words).toHaveValue('Still an unsent sentence.');
  expect(state.operations).toHaveLength(0);
});

test('a malformed current event exposes its missing metadata without losing the composer', async ({
  page,
}) => {
  const state = await fixture(page);
  const words = page.getByRole('textbox', { name: 'Words to say', exact: true });
  await words.fill('Kept while one record is unavailable.');
  state.invalidEvent = true;
  state.workspace.nativeRevision++;
  state.workspace.cursor = String(state.workspace.nativeRevision);
  await expect(
    page.getByText(
      'This recorded event has no captured type or status. Refresh its record before using it.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(words).toHaveValue('Kept while one record is unavailable.');
  await expect(page.getByRole('button', { name: 'Submit', exact: true })).toBeEnabled();
  expect(state.operations).toHaveLength(0);
});

test('ordinary values stay visible while advanced native fields open explicitly or through search', async ({
  page,
}) => {
  const state = await fixture(page);
  state.fields = [
    {
      id: 'definition',
      label: 'Installed native definition',
      datatype: 'json',
      meaning: 'native',
      value: { id: 'installed-definition', version: 1 },
      editable: true,
      owner: 'attribute',
      advanced: true,
    },
    {
      id: 'value',
      label: 'Ordinary native value',
      datatype: 'number',
      meaning: 'native',
      value: 40,
      editable: true,
      owner: 'attribute',
    },
  ];
  state.workspace.nativeRevision++;
  state.workspace.cursor = String(state.workspace.nativeRevision);
  const current = page.getByRole('region', { name: 'Current character', exact: true });
  await expect(
    current.getByRole('spinbutton', { name: 'Ordinary native value', exact: true }),
  ).toHaveValue('40');
  await expect(
    current.getByRole('button', { name: 'Edit full structured value', exact: true }),
  ).toBeHidden();
  await current.getByText('Advanced native fields · 1', { exact: true }).click();
  await expect(
    current.getByRole('button', { name: 'Edit full structured value', exact: true }),
  ).toBeVisible();
  await current.getByRole('searchbox', { name: 'Search overview', exact: true }).fill('Installed');
  await expect(
    current.getByRole('button', { name: 'Edit full structured value', exact: true }),
  ).toBeVisible();
  expect(state.operations).toHaveLength(0);
});

test('new recorded sources offer a fixed jump while deliberate historical inspection stays put', async ({
  page,
}) => {
  const state = await fixture(page);
  await page.getByRole('button', { name: /Ada speech · completed 10 Earlier words/ }).click();
  state.workspace.run = { ...run(), latestRootId: 'root-latest' };
  state.workspace.nativeRevision++;
  state.workspace.cursor = String(state.workspace.nativeRevision);
  const jump = page.getByRole('button', { name: 'Latest recorded source', exact: true });
  await expect(jump).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Follow latest results', exact: true }),
  ).toBeVisible();
  expect(state.operations).toHaveLength(0);
  await jump.click();
  await expect(jump).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Following latest results', exact: true }),
  ).toBeVisible();
});

test('uncaptured provider exchange stays unavailable while exact captured requests remain searchable', async ({
  page,
}) => {
  await fixture(page);
  const inspector = page.getByRole('region', { name: 'Recorded decisions', exact: true });
  await expect(
    inspector.getByRole('button', { name: 'Provider exchange', exact: true }).first(),
  ).toBeDisabled();
  await inspector.getByRole('button', { name: 'Provider exchange', exact: true }).last().click();
  await expect(
    inspector.getByText('No actual provider exchange was captured for this call.', { exact: true }),
  ).toBeVisible();
  await inspector.getByRole('button', { name: 'Full request', exact: true }).click();
  const dialog = page.getByRole('dialog', {
    name: 'Actual response call · Full request',
    exact: true,
  });
  const content = dialog.getByRole('textbox', { name: 'Exact captured content', exact: true });
  await expect(content).toHaveValue(/Historical request/);
  await dialog
    .getByRole('searchbox', { name: 'Find in exact captured content', exact: true })
    .fill('Historical');
  await content.press('Control+Home');
  await dialog.getByRole('button', { name: 'Find previous', exact: true }).click();
  await expect
    .poll(() =>
      content.evaluate((element) => {
        const text = element as HTMLTextAreaElement;
        return text.value.slice(text.selectionStart, text.selectionEnd);
      }),
    )
    .toBe('Historical');
});

test('exact historical actions wait for the selected call header instead of reporting missing capture', async ({
  page,
}) => {
  await fixture(page, { stageDelayMs: 750 });
  const inspector = page.getByRole('region', { name: 'Recorded decisions', exact: true });
  const request = inspector.getByRole('button', { name: 'Full request', exact: true });
  await expect(request).toBeDisabled();
  await request.click();
  await expect(
    page.getByRole('textbox', { name: 'Exact captured content', exact: true }),
  ).toHaveValue('{"context":"Historical request, not current state"}');
  await expect(inspector).not.toContainText('complete request was not captured');
});

test('serial comparison declares one selected atomic factor without applying current drafts first', async ({
  page,
}) => {
  const state = await fixture(page);
  state.fields = [
    {
      id: 'native-meter',
      label: 'Native numeric factor',
      datatype: 'number',
      meaning: 'native',
      value: 10,
      editable: true,
      owner: 'attribute',
      token: { generation: 'factor-token' },
      applyGroup: 'native-values',
    },
    {
      id: 'person.name',
      label: 'Name',
      datatype: 'text',
      meaning: 'native',
      value: 'Ada',
      editable: true,
      owner: 'person',
      token: { generation: 'person-token' },
    },
  ];
  state.workspace.nativeRevision++;
  state.workspace.cursor = String(state.workspace.nativeRevision);
  const current = page.getByRole('region', { name: 'Current character', exact: true });
  await current.getByRole('spinbutton', { name: 'Native numeric factor', exact: true }).fill('25');
  await current.getByRole('textbox', { name: 'Name', exact: true }).fill('Unrelated unsent name');
  await page.getByRole('button', { name: 'Compare', exact: true }).click();
  await page.getByRole('button', { name: 'Run variants…', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Serial matched comparison', exact: true });
  await dialog
    .getByRole('combobox', { name: 'Starting scenario or checkpoint', exact: true })
    .click();
  await page.getByRole('option', { name: 'A retained native checkpoint', exact: true }).click();
  await dialog
    .getByRole('textbox', { name: 'Same sentence in both variants', exact: true })
    .fill('A matched native experiment.');
  await dialog
    .getByRole('combobox', { name: 'Native field factor', exact: true })
    .nth(1)
    .selectOption({ label: 'Ada · Native numeric factor' });
  await dialog.getByRole('button', { name: 'Run variants serially', exact: true }).click();
  await expect.poll(() => state.operations.length).toBe(1);
  const operation = state.operations[0];
  expect(operation?.kind).toBe('runComparison');
  if (operation?.kind !== 'runComparison') throw new Error('Expected native comparison intention.');
  expect(operation.variants[0]?.edits).toBeUndefined();
  expect(operation.variants[1]?.edits).toEqual([
    {
      actorId: 'ada',
      fieldId: 'native-meter',
      owner: 'attribute',
      value: 25,
      baseValue: 10,
      token: { generation: 'factor-token' },
    },
  ]);
  expect(state.operations.some((operation) => operation.kind === 'applyEdits')).toBe(false);
});

test('incomplete numeric drafts survive navigation and cannot silently apply a prior number', async ({
  page,
}) => {
  const state = await fixture(page);
  state.fields = [
    {
      id: 'body.reserve',
      category: 'body',
      label: 'Native reserve',
      datatype: 'meter',
      meaning: 'native',
      value: 50,
      minimum: 0,
      maximum: 100,
      editable: true,
      owner: 'attribute',
      holdUnavailableReason: 'This fixture exposes no native hold owner.',
    },
  ];
  state.workspace.nativeRevision++;
  state.workspace.cursor = String(state.workspace.nativeRevision);
  const current = page.getByRole('region', { name: 'Current character', exact: true });
  const value = current.getByRole('spinbutton', { name: 'Native reserve', exact: true });
  await value.fill('-');
  await current.getByRole('button', { name: 'Body', exact: true }).click();
  await expect(value).toHaveValue('-');
  await current.getByRole('button', { name: 'Apply attribute (1)', exact: true }).click();
  expect(state.operations).toHaveLength(0);
  await expect(value).toHaveValue('-');
  await page
    .getByRole('dialog', { name: 'Operation results', exact: true })
    .getByRole('button', { name: 'Close', exact: true })
    .click();
  await current.getByRole('button', { name: 'Reset draft', exact: true }).click();
  await expect(value).toHaveValue('50');
  await value.fill('42');
  await value.press('ArrowUp');
  await expect(value).toHaveValue('43');
  await current.getByRole('button', { name: 'Apply attribute (1)', exact: true }).click();
  await expect.poll(() => state.operations.length).toBe(1);
  expect(state.operations[0]).toMatchObject({
    kind: 'applyEdits',
    edits: [{ fieldId: 'body.reserve', value: 43 }],
  });
  await page.getByRole('button', { name: 'Lab settings', exact: true }).click();
  let modal = page.getByRole('dialog', { name: 'Lab settings', exact: true });
  await modal
    .getByRole('spinbutton', { name: 'Simulation duration / guard', exact: true })
    .fill('-');
  await modal.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Lab settings · unapplied draft', exact: true }).click();
  modal = page.getByRole('dialog', { name: 'Lab settings', exact: true });
  await expect(
    modal.getByRole('spinbutton', { name: 'Simulation duration / guard', exact: true }),
  ).toHaveValue('-');
  await modal.getByRole('button', { name: 'Apply settings', exact: true }).click();
  expect(state.operations).toHaveLength(1);
  await expect(modal).toBeVisible();
  await page
    .getByRole('dialog', { name: 'Operation results', exact: true })
    .getByRole('button', { name: 'Close', exact: true })
    .click();
  await modal
    .getByRole('spinbutton', { name: 'Simulation duration / guard', exact: true })
    .fill('0.5');
  await modal.getByRole('button', { name: 'Apply settings', exact: true }).click();
  await expect.poll(() => state.operations.length).toBe(2);
  expect(state.operations[1]).toMatchObject({
    kind: 'applySettings',
    settings: { policy: { durationSeconds: 0.5 } },
  });
});

test('a claimed operation without a native outcome stays blocked under its original identity', async ({
  page,
}) => {
  const state = await fixture(page);
  let checks = 0;
  state.onOperation = async (operation, route) => {
    if (operation.kind !== 'submitStimulus') return false;
    checks++;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        checks < 3
          ? {
              ok: false,
              unconfirmed: true,
              commandId: operation.commandId,
              code: 'interrupted',
              message: 'The original native outcome is still unconfirmed.',
            }
          : {
              ok: true,
              commandId: operation.commandId,
              message: 'The original source is confirmed.',
              sourceAccepted: true,
              sourceId: 'once-only',
              runId: 'run-old',
            },
      ),
    });
    return true;
  };
  const words = page.getByRole('textbox', { name: 'Words to say', exact: true });
  await words.fill('Keep the same source identity.');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  const results = page.getByRole('dialog', { name: 'Operation results', exact: true });
  await expect(
    results.getByText('The original native outcome is still unconfirmed.', { exact: true }).first(),
  ).toBeVisible();
  await results.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(words).toHaveValue('Keep the same source identity.');
  await expect(page.getByRole('button', { name: 'Submit', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '1 unconfirmed operation', exact: true }).click();
  await results.getByRole('button', { name: 'Check same operation', exact: true }).click();
  await expect.poll(() => checks).toBe(2);
  await expect(
    results.getByRole('button', { name: 'Check same operation', exact: true }),
  ).toBeVisible();
  await results.getByRole('button', { name: 'Check same operation', exact: true }).click();
  await expect.poll(() => checks).toBe(3);
  await results.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(words).toHaveValue('');
  expect(new Set(state.operations.map((operation) => operation.commandId)).size).toBe(1);
});

test('composer IME confirmation and ordinary Enter do not dispatch an experiment', async ({
  page,
}) => {
  const state = await fixture(page);
  const words = page.getByRole('textbox', { name: 'Words to say', exact: true });
  await words.fill('An unfinished composition');
  await words.dispatchEvent('keydown', {
    key: 'Enter',
    code: 'Enter',
    ctrlKey: true,
    isComposing: true,
    bubbles: true,
  });
  await words.press('Enter');
  expect(state.operations).toHaveLength(0);
  await expect(words).toHaveValue('An unfinished composition\n');
  await words.press('Control+Enter');
  await expect.poll(() => state.operations.length).toBe(1);
});

test('source disclosure changes clear protected editors and source drafts while preserving other work', async ({
  page,
}) => {
  const state = await fixture(page);
  const sourceEntry = {
    id: 'protected-memory',
    kind: 'observed',
    text: 'A source that must disappear after forgetting.',
  };
  const nameField: CognitionLabField = {
    id: 'person.name',
    label: 'Name',
    datatype: 'text',
    meaning: 'native',
    value: 'Ada',
    editable: true,
    owner: 'person',
  };
  state.fields = [
    nameField,
    {
      id: 'protected-field',
      label: 'Protected memory',
      datatype: 'json',
      meaning: 'native',
      value: null,
      preview: 'A permitted memory preview.',
      editable: true,
      owner: 'memory',
      detail: { kind: 'source', id: 'protected-source' },
    },
  ];
  state.sources = {
    'protected-source': {
      id: 'protected-source',
      label: 'Protected source',
      scope: 'current',
      actorId: 'ada',
      content: {
        entry: sourceEntry,
        hash: 'original-source-hash',
        entryId: 'experience:protected-memory',
        generation: 'generation-lab',
      },
    },
  };
  state.workspace.nativeRevision++;
  state.workspace.cursor = String(state.workspace.nativeRevision);
  const current = page.getByRole('region', { name: 'Current character', exact: true });
  await current.getByRole('button', { name: 'Edit full structured value', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Protected memory', exact: true });
  await expect(editor.getByRole('textbox', { name: 'Protected memory', exact: true })).toHaveValue(
    JSON.stringify(sourceEntry, null, 2),
  );
  await editor
    .getByRole('textbox', { name: 'Protected memory', exact: true })
    .fill(JSON.stringify({ ...sourceEntry, text: 'An uncommitted source-backed correction.' }));
  await editor.getByRole('button', { name: 'Stage edit', exact: true }).click();
  await current.getByLabel('Name', { exact: true }).fill('A separate retained name draft');
  const words = page.getByRole('textbox', { name: 'Words to say', exact: true });
  await words.fill('A separate retained unsent sentence.');
  await current.getByRole('button', { name: 'Read Protected memory', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Protected source', exact: true })).toBeVisible();
  state.fields = [nameField];
  state.workspace.disclosureRevision = 'disclosure-after-source-forgetting';
  state.workspace.nativeRevision++;
  state.workspace.cursor = String(state.workspace.nativeRevision);
  await expect(
    page.getByRole('dialog', { name: 'Protected source', exact: true }),
  ).not.toBeVisible();
  await expect(current.getByRole('button', { name: 'Apply memory (1)', exact: true })).toHaveCount(
    0,
  );
  await expect(current.getByLabel('Name', { exact: true })).toHaveValue(
    'A separate retained name draft',
  );
  await expect(words).toHaveValue('A separate retained unsent sentence.');
  expect(state.operations).toHaveLength(0);
});

test('pane resize preferences persist and reset without submitting or losing a draft', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const state = await fixture(page);
  const current = page.getByRole('region', { name: 'Current character', exact: true });
  await current.getByLabel('Name', { exact: true }).fill('A draft retained through resizing');
  await page
    .getByRole('separator', { name: 'Resize current character pane', exact: true })
    .press('ArrowRight');
  await expect
    .poll(async () =>
      Math.round((await page.locator('[data-pane="current"]').boundingBox())?.width ?? 0),
    )
    .toBe(436);
  await expect(current.getByLabel('Name', { exact: true })).toHaveValue(
    'A draft retained through resizing',
  );
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Cognition Lab', exact: true })).toBeVisible();
  await expect
    .poll(async () =>
      Math.round((await page.locator('[data-pane="current"]').boundingBox())?.width ?? 0),
    )
    .toBe(436);
  await page.getByRole('button', { name: 'Reset pane layout', exact: true }).click();
  await expect
    .poll(async () =>
      Math.round((await page.locator('[data-pane="current"]').boundingBox())?.width ?? 0),
    )
    .toBe(420);
  expect(state.operations).toHaveLength(0);
});

test('long stimulus editing replaces the timeline body and returns without dispatch', async ({
  page,
}) => {
  const state = await fixture(page);
  const words = page.getByRole('textbox', { name: 'Words to say', exact: true });
  await words.fill('A long draft to edit in place.');
  await page.getByRole('button', { name: 'Edit full speech draft', exact: true }).click();
  const full = page.getByRole('textbox', { name: 'Full speech draft', exact: true });
  await expect(full).toHaveValue('A long draft to edit in place.');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await full.fill('The full edited draft remains unsent.');
  await page.getByRole('button', { name: 'Back to timeline', exact: true }).click();
  await expect(words).toHaveValue('The full edited draft remains unsent.');
  expect(state.operations).toHaveLength(0);
});

test('native creation edits the owner template and applies a nonexistent base through its own group', async ({
  page,
}) => {
  const state = await fixture(page);
  const initial = {
    kind: 'memory',
    actorId: 'ada',
    memory: {
      kind: 'episode',
      source: 'internal',
      summary: '',
      at: 15,
      importance: 5,
      entityIds: [],
    },
  };
  state.fields = [];
  state.creates = [
    {
      id: 'create.memory',
      category: 'memories',
      label: 'Add personal memory',
      datatype: 'json',
      meaning: 'narrative',
      value: null,
      initialValue: initial,
      editable: true,
      owner: 'memory',
      applyGroup: 'memory.insert',
      token: { generation: 'generation-lab', insert: true },
    },
  ];
  state.workspace.nativeRevision++;
  state.workspace.cursor = String(state.workspace.nativeRevision);
  const current = page.getByRole('region', { name: 'Current character', exact: true });
  await current.getByRole('button', { name: 'Memories', exact: true }).click();
  await current.getByRole('button', { name: 'Add personal memory', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Add personal memory', exact: true });
  await expect(
    modal.getByRole('textbox', { name: 'Add personal memory', exact: true }),
  ).toHaveValue(JSON.stringify(initial, null, 2));
  expect(state.operations).toHaveLength(0);
  const changed = {
    ...initial,
    memory: { ...initial.memory, summary: 'An explicitly authored private premise.' },
  };
  await modal
    .getByRole('textbox', { name: 'Add personal memory', exact: true })
    .fill(JSON.stringify(changed));
  await modal.getByRole('button', { name: 'Stage edit', exact: true }).click();
  await expect(current.getByText('Applied: Not created', { exact: true })).toBeVisible();
  await current.getByRole('button', { name: 'Apply Add personal memory (1)', exact: true }).click();
  await expect.poll(() => state.operations.length).toBe(1);
  expect(state.operations[0]).toMatchObject({
    kind: 'applyEdits',
    edits: [
      {
        actorId: 'ada',
        fieldId: 'create.memory',
        owner: 'memory',
        baseValue: null,
        value: changed,
        token: { generation: 'generation-lab', insert: true },
      },
    ],
  });
});

test('remote field choices retain labels and stay dismissed until another user interaction', async ({
  page,
}) => {
  const state = await fixture(page);
  state.fields = [];
  state.choices = [
    { id: 'entity-ada', label: 'Ada' },
    { id: 'entity-bob', label: 'Bob' },
  ];
  state.creates = [
    {
      id: 'create.recognition',
      category: 'relations',
      label: 'Add authored acquaintance',
      datatype: 'reference',
      meaning: 'narrative',
      value: null,
      initialValue: '',
      editable: true,
      owner: 'person',
      choiceSource: 'recognition',
      applyGroup: 'recognition.insert',
      token: { generation: 'generation-lab', expectedRevision: 0 },
    },
  ];
  state.workspace.nativeRevision++;
  state.workspace.cursor = String(state.workspace.nativeRevision);
  const current = page.getByRole('region', { name: 'Current character', exact: true });
  await current.getByRole('button', { name: 'Relations', exact: true }).click();
  await current.getByRole('button', { name: 'Add authored acquaintance', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Add authored acquaintance', exact: true });
  const choice = modal.getByRole('combobox', { name: 'Add authored acquaintance', exact: true });
  await choice.click();
  await page.getByRole('option', { name: 'Ada', exact: true }).click();
  await expect(choice).toHaveValue('Ada');
  await expect(choice).toHaveAttribute('aria-expanded', 'false');
  await expect(choice).toBeFocused();
  // The popup hides sibling buttons from the accessibility tree while open.
  const toggle = modal.locator('.ol-select-toggle');
  await toggle.click();
  await expect(choice).toHaveAttribute('aria-expanded', 'true');
  await toggle.click();
  await expect(choice).toHaveAttribute('aria-expanded', 'false');
  await choice.fill('Bo');
  await expect(page.getByRole('option', { name: 'Bob', exact: true })).toBeVisible();
  await choice.press('Escape');
  await expect(choice).toHaveAttribute('aria-expanded', 'false');
  await expect(choice).toHaveValue('Ada');
  await expect(modal).toBeVisible();
  await choice.fill('Bob');
  await expect(page.getByRole('option', { name: 'Bob', exact: true })).toBeVisible();
  await choice.press('ArrowDown');
  await choice.press('End');
  await choice.press('Enter');
  await expect(choice).toHaveValue('Bob');
  await expect(choice).toHaveAttribute('aria-expanded', 'false');
  expect(state.operations).toHaveLength(0);
  await modal.getByRole('button', { name: 'Stage edit', exact: true }).click();
  await expect(current.getByText('1 draft field', { exact: true })).toBeVisible();
  expect(state.operations).toHaveLength(0);
  await current.getByRole('button', { name: 'Apply Add authored acquaintance (1)' }).click();
  await expect.poll(() => state.operations.length).toBe(1);
  expect(state.operations[0]).toMatchObject({
    kind: 'applyEdits',
    edits: [{ actorId: 'ada', fieldId: 'create.recognition', value: 'entity-bob' }],
  });
});

test('Library loads restore saved model settings unless the operator explicitly keeps current settings', async ({
  page,
}) => {
  const state = await fixture(page);
  state.saved = [
    {
      id: 'reusable-scenario',
      kind: 'scenario',
      name: 'Reusable model origin',
      createdAt: 1792886400000,
      completeness: 'complete',
      compatible: true,
    },
    {
      id: 'reusable-checkpoint',
      kind: 'checkpoint',
      name: 'Reusable model checkpoint',
      createdAt: 1792886400000,
      completeness: 'complete',
      compatible: true,
    },
  ];
  for (const [kind, name, operationKind] of [
    ['scenario', 'Reusable model origin', 'loadScenario'],
    ['checkpoint', 'Reusable model checkpoint', 'restoreCheckpoint'],
  ] as const) {
    await page.getByRole('button', { name: 'Library', exact: true }).click();
    const library = page.getByRole('dialog', { name: 'Library', exact: true });
    if (kind === 'checkpoint')
      await library.getByRole('button', { name: 'Checkpoints', exact: true }).click();
    await library.getByRole('button', { name: new RegExp(`${name} ${kind}`) }).click();
    await library.getByRole('button', { name: `Load ${kind}`, exact: true }).click();
    const confirmation = page.getByRole('dialog', { name: `Load ${name}`, exact: true });
    await expect(
      confirmation.getByRole('checkbox', { name: 'Keep current model settings', exact: true }),
    ).not.toBeChecked();
    await confirmation.getByRole('button', { name: 'Replace lab scenario', exact: true }).click();
    await expect(library).toBeHidden();
    expect(state.operations.at(-1)).toMatchObject({
      kind: operationKind,
      keepCurrentModels: false,
    });
  }
});

test('Library current-model choice stays on the original load command through acknowledgement recovery', async ({
  page,
}) => {
  const state = await fixture(page);
  let accepted: CognitionLabReceipt | undefined;
  state.onOperation = async (operation, route) => {
    if (operation.kind !== 'restoreCheckpoint') return false;
    if (!accepted) {
      accepted = {
        ok: true,
        commandId: operation.commandId,
        savedId: operation.savedId,
        message: 'Checkpoint loaded with the explicitly selected current models.',
        workspace: state.workspace,
      };
      await route.abort('failed');
    } else {
      expect(operation.commandId).toBe(accepted.commandId);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(accepted),
      });
    }
    return true;
  };
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  const library = page.getByRole('dialog', { name: 'Library', exact: true });
  await library.getByRole('button', { name: 'Checkpoints', exact: true }).click();
  await library.getByRole('button', { name: /A retained native checkpoint checkpoint/ }).click();
  await library.getByRole('button', { name: 'Load checkpoint', exact: true }).click();
  const confirmation = page.getByRole('dialog', {
    name: 'Load A retained native checkpoint',
    exact: true,
  });
  const choice = confirmation.getByRole('checkbox', {
    name: 'Keep current model settings',
    exact: true,
  });
  await expect(choice).not.toBeChecked();
  await choice.check();
  await confirmation.getByRole('button', { name: 'Replace lab scenario', exact: true }).click();
  const results = page.getByRole('dialog', { name: 'Operation results', exact: true });
  await results.getByRole('button', { name: 'Check same operation', exact: true }).click();
  await expect.poll(() => state.operations.length).toBe(2);
  expect(state.operations[0]).toMatchObject({ kind: 'restoreCheckpoint', keepCurrentModels: true });
  expect(state.operations[1]).toEqual(state.operations[0]);
});

test('saved comparison groups expose results and removable references without loading or exporting a scene', async ({
  page,
}) => {
  const state = await fixture(page);
  state.saved = [
    {
      id: 'comparison-group',
      kind: 'comparison',
      name: 'A retained partial comparison',
      createdAt: 1792886400000,
      worldId: 'world-lab',
      timeline: 'timeline-lab',
      gameTime: 15,
      completeness: 'partial',
      compatible: true,
      comparisonRunIds: ['run-old'],
    },
  ];
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  let dialog = page.getByRole('dialog', {
    name: 'Library',
    exact: true,
  });
  await dialog.getByRole('button', { name: 'Comparisons', exact: true }).click();
  await dialog.getByRole('button', { name: /A retained partial comparison comparison/ }).click();
  await expect(dialog).toContainText('Size not captured');
  await expect(dialog).toContainText('Removing the group keeps its child runs saved');
  await expect(dialog.getByRole('link', { name: 'Export', exact: true })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: /Load / })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Inspect results', exact: true }).click();
  await expect(
    page.getByRole('region', { name: 'Variant A · captured run', exact: true }),
  ).toContainText('Earlier quiet invitation');
  expect(state.operations).toHaveLength(0);
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  dialog = page.getByRole('dialog', {
    name: 'Library',
    exact: true,
  });
  await dialog.getByRole('button', { name: 'Comparisons', exact: true }).click();
  await dialog.getByRole('button', { name: /A retained partial comparison comparison/ }).click();
  await dialog.getByRole('button', { name: 'Remove', exact: true }).click();
  const confirmation = page.getByRole('dialog', {
    name: 'Remove A retained partial comparison',
    exact: true,
  });
  await expect(confirmation).toContainText('Its child runs remain saved.');
  await confirmation.getByRole('button', { name: 'Remove saved comparison', exact: true }).click();
  await expect.poll(() => state.operations.length).toBe(1);
  expect(state.operations[0]).toMatchObject({
    kind: 'removeSaved',
    savedIds: ['comparison-group'],
  });
});

test('paged saved checkpoint search keeps fast typing through delayed results and loads later pages', async ({
  page,
}) => {
  const state = await fixture(page);
  state.savedDelayMs = 300;
  state.savedPageSize = 1;
  state.saved = [1, 2, 3].map((number) => ({
    id: `checkpoint-${number}`,
    kind: 'checkpoint',
    name: `Matched checkpoint ${number}`,
    createdAt: 1792886400000,
    completeness: 'complete',
    compatible: true,
  }));
  const searches: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname.endsWith('/scenarios')) searches.push(url.search);
  });
  await page.getByRole('button', { name: 'Compare', exact: true }).click();
  await page.getByRole('button', { name: 'Run variants…', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Serial matched comparison', exact: true });
  const checkpoint = dialog.getByRole('combobox', {
    name: 'Starting scenario or checkpoint',
    exact: true,
  });
  await checkpoint.fill('Matched checkpoint');
  await expect(checkpoint).toHaveValue('Matched checkpoint');
  await expect(
    page.getByRole('option', { name: 'Matched checkpoint 1', exact: true }),
  ).toBeVisible();
  await expect(checkpoint).toHaveValue('Matched checkpoint');
  await expect(
    page.getByRole('option', { name: 'Matched checkpoint 3', exact: true }),
  ).toBeVisible();
  await page.getByRole('option', { name: 'Matched checkpoint 3', exact: true }).click();
  await expect(checkpoint).toHaveValue('Matched checkpoint 3');
  await expect.poll(() => searches.some((query) => query.includes('cursor=2'))).toBe(true);
  await expect.poll(() => searches.some((query) => query.includes('id=checkpoint-3'))).toBe(true);
});

test('sparse saved search keeps explicit and automatic paging through empty matched pages', async ({
  page,
}) => {
  const state = await fixture(page);
  state.savedPageSize = 1;
  state.savedSparsePages = true;
  state.saved = [1, 2, 3].map((number) => ({
    id: `sparse-checkpoint-${number}`,
    kind: 'checkpoint',
    name: number === 3 ? 'Desired retained checkpoint' : `Unrelated checkpoint ${number}`,
    createdAt: 1792886400000,
    completeness: 'complete',
    compatible: true,
  }));
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  const saved = page.getByRole('dialog', {
    name: 'Library',
    exact: true,
  });
  await saved.getByRole('button', { name: 'Checkpoints', exact: true }).click();
  await saved.getByRole('searchbox', { name: 'Search library', exact: true }).fill('Desired');
  await expect(saved.getByRole('button', { name: 'More saved work', exact: true })).toBeVisible();
  await expect(saved).not.toContainText('No matching library items.');
  await saved.getByRole('button', { name: 'More saved work', exact: true }).click();
  await expect(saved.getByRole('button', { name: 'More saved work', exact: true })).toBeVisible();
  await saved.getByRole('button', { name: 'More saved work', exact: true }).click();
  await expect(
    saved.getByRole('button', { name: /Desired retained checkpoint checkpoint/ }),
  ).toBeVisible();
  await saved.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Compare', exact: true }).click();
  await page.getByRole('button', { name: 'Run variants…', exact: true }).click();
  const compare = page.getByRole('dialog', { name: 'Serial matched comparison', exact: true });
  await compare
    .getByRole('combobox', { name: 'Starting scenario or checkpoint', exact: true })
    .fill('Desired');
  await page.getByRole('option', { name: 'Desired retained checkpoint', exact: true }).click();
  await expect(
    compare.getByRole('combobox', { name: 'Starting scenario or checkpoint', exact: true }),
  ).toHaveValue('Desired retained checkpoint');
});

test('withheld saved records expose removal without reading or exporting their contents', async ({
  page,
}) => {
  const state = await fixture(page);
  const withheld: CognitionLabSaved = {
    id: 'restricted-checkpoint',
    kind: 'checkpoint',
    name: 'Unavailable saved checkpoint',
    createdAt: 1792886400000,
    completeness: 'unavailable',
    compatible: false,
    withheld: true,
  };
  state.saved = [
    { ...withheld, name: 'Formerly readable private scene', compatible: true, withheld: undefined },
  ];
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  const dialog = page.getByRole('dialog', {
    name: 'Library',
    exact: true,
  });
  await dialog.getByRole('button', { name: 'Checkpoints', exact: true }).click();
  await dialog.getByRole('button', { name: /Formerly readable private scene checkpoint/ }).click();
  await expect(dialog.getByRole('button', { name: 'Load checkpoint', exact: true })).toBeEnabled();
  state.saved = [withheld];
  state.workspace = {
    ...state.workspace,
    disclosureRevision: 'changed-disclosure',
    cursor: 'changed-disclosure',
  };
  await expect(dialog).not.toContainText('Formerly readable private scene');
  await dialog.getByRole('button', { name: /Unavailable saved checkpoint checkpoint/ }).click();
  await expect(dialog).toContainText('Game time unavailable');
  await expect(dialog.getByRole('link', { name: 'Export', exact: true })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: /Load |Inspect / })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Remove', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Remove Unavailable saved checkpoint', exact: true })
    .getByRole('button', { name: 'Remove saved checkpoint', exact: true })
    .click();
  await expect.poll(() => state.operations.length).toBe(1);
  expect(state.operations[0]).toMatchObject({
    kind: 'removeSaved',
    savedIds: ['restricted-checkpoint'],
  });
});

test('saved-work modal keeps its actions fixed at the bottom of a short collection', async ({
  page,
}) => {
  await fixture(page);
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  const modal = page.getByRole('dialog', {
    name: 'Library',
    exact: true,
  });
  await modal.getByRole('button', { name: 'Checkpoints', exact: true }).click();
  await expect(modal.getByRole('button', { name: /A retained native checkpoint/ })).toBeVisible();
  const dialogBounds = await modal.boundingBox();
  const closeBounds = await modal.getByRole('button', { name: 'Close', exact: true }).boundingBox();
  expect(dialogBounds).not.toBeNull();
  expect(closeBounds).not.toBeNull();
  expect(
    dialogBounds!.y + dialogBounds!.height - (closeBounds!.y + closeBounds!.height),
  ).toBeLessThan(18);
});

test('native routes complete the default response and preserve an edited held checkpoint without loading the game', async ({
  page,
}, info) => {
  test.setTimeout(360_000);
  page.setDefaultTimeout(15_000);
  const { startCognitionLabFixture } = await import('../fixtures/cognition-lab.js');
  const native = await startCognitionLabFixture({ withAi: true, production: true });
  const requests: string[] = [];
  const pageErrors: string[] = [];
  page.on('request', (request) => requests.push(new URL(request.url()).pathname));
  page.on('pageerror', (error) => pageErrors.push(error.message));
  const networkSnapshot = () =>
    page.evaluate(async () => {
      const path = '/assets/network-tools.js';
      const diagnostics = await import(path);
      return diagnostics.browserNetworkSnapshot() as Array<{
        role: string;
        capacity: number;
        occupied: number;
        quarantined: number;
      }>;
    });
  const gameSequence = native.game.service.world.sequence;
  try {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`${native.base}/cognition`);
    await expect(
      page.getByRole('button', { name: 'One response · Wait for Ada', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Speaker or actor', exact: true })).toHaveValue(
      'Mike',
    );
    const words = page.getByRole('textbox', { name: 'Words to say', exact: true });
    await words.fill('Ada, shall we share the berries while we talk?');
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    const timeline = page.getByRole('region', { name: 'Events and experiments', exact: true });
    await expect(timeline.getByText('Ada: Yes, let us talk.', { exact: true })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.locator('.cl-state > strong')).toHaveText('held');
    await expect(words).toHaveValue('');
    expect(native.calls.some((call) => 'task' in call && call.task === 'npc_response')).toBe(true);
    const inspector = page.getByRole('region', { name: 'Recorded decisions', exact: true });
    await expect(inspector.getByText('Ada: Yes, let us talk.', { exact: true })).toBeVisible();
    await expect(
      inspector.getByText('No additional evidence was captured for this section.'),
    ).toBeHidden();
    await inspector.getByRole('button', { name: 'Full request', exact: true }).click();
    let artifact = page
      .getByRole('dialog')
      .filter({ has: page.getByRole('textbox', { name: 'Exact captured content', exact: true }) });
    const capturedContent = artifact.getByRole('textbox', {
      name: 'Exact captured content',
      exact: true,
    });
    await expect(capturedContent).not.toHaveValue('');
    const original = await capturedContent.inputValue();
    await artifact.getByRole('button', { name: 'Close', exact: true }).click();
    const current = page.getByRole('region', { name: 'Current character', exact: true });
    await current.getByRole('button', { name: 'Body', exact: true }).click();
    const food = current.getByRole('spinbutton', { name: 'Food', exact: true });
    const hold = current
      .locator('.cl-field')
      .filter({ has: page.getByRole('spinbutton', { name: 'Food', exact: true }) })
      .getByRole('checkbox', { name: 'Hold during this experiment', exact: true });
    await food.fill('25');
    await hold.check();
    await current.getByRole('button', { name: 'Apply attribute (1)', exact: true }).click();
    await expect(
      current.getByText('Applied values · no changes here', { exact: true }),
    ).toBeVisible();
    await expect(food).toHaveValue('25');
    await expect(hold).toBeChecked();
    await expect(inspector.getByText('Ada: Yes, let us talk.', { exact: true })).toBeVisible();
    await inspector.getByRole('button', { name: 'Full request', exact: true }).click();
    artifact = page
      .getByRole('dialog')
      .filter({ has: page.getByRole('textbox', { name: 'Exact captured content', exact: true }) });
    await expect(
      artifact.getByRole('textbox', { name: 'Exact captured content', exact: true }),
    ).toHaveValue(original);
    await artifact.getByRole('button', { name: 'Close', exact: true }).click();
    await page
      .getByRole('combobox', { name: 'Save lab work', exact: true })
      .selectOption('checkpoint');
    const save = page.getByRole('dialog', { name: 'Save checkpoint', exact: true });
    await save
      .getByRole('textbox', { name: 'Name', exact: true })
      .fill('Native browser held origin');
    await save.getByRole('button', { name: 'Save checkpoint', exact: true }).click();
    await expect(save).toBeHidden({ timeout: 30_000 });
    await food.fill('60');
    await current.getByRole('button', { name: 'Apply attribute (1)', exact: true }).click();
    await expect(
      current.getByText('Applied values · no changes here', { exact: true }),
    ).toBeVisible();
    await expect(food).toHaveValue('60');
    await page.getByRole('button', { name: 'Library', exact: true }).click();
    await page.getByRole('button', { name: 'Checkpoints', exact: true }).click();
    await page.getByRole('button', { name: /Native browser held origin checkpoint/ }).click();
    await page.getByRole('button', { name: 'Load checkpoint', exact: true }).click();
    await page.getByRole('button', { name: 'Replace lab scenario', exact: true }).click();
    await expect(page.locator('.cl-scenario-name')).toHaveText('Native browser held origin', {
      timeout: 30_000,
    });
    await expect(page.getByRole('button', { name: 'Submit', exact: true })).toBeEnabled({
      timeout: 30_000,
    });
    await expect(page.getByRole('button', { name: 'Reconnect', exact: true })).toHaveCount(0);
    await current.getByRole('button', { name: 'Body', exact: true }).click();
    await expect(food).toHaveValue('25');
    await expect(hold).toBeChecked();
    for (const viewport of [
      { width: 1920, height: 1080 },
      { width: 2560, height: 1440 },
    ]) {
      await page.setViewportSize(viewport);
      const widths = await page
        .locator('.cl-columns > .cl-column')
        .evaluateAll((elements) =>
          elements.map((element) => Math.round(element.getBoundingClientRect().width)),
        );
      expect(widths).toEqual(viewport.width === 1920 ? [420, 734, 734] : [480, 1024, 1024]);
      await page.screenshot({ path: info.outputPath(`native-cognition-${viewport.width}.png`) });
    }
    await food.fill('60');
    await page.getByRole('button', { name: 'Compare', exact: true }).click();
    await page.getByRole('button', { name: 'Run variants…', exact: true }).click();
    const compare = page.getByRole('dialog', { name: 'Serial matched comparison', exact: true });
    await compare
      .getByRole('combobox', { name: 'Starting scenario or checkpoint', exact: true })
      .fill('Native browser held origin');
    await page.getByRole('option', { name: 'Native browser held origin', exact: true }).click();
    await compare
      .getByRole('textbox', { name: 'Same sentence in both variants', exact: true })
      .fill('Ada, shall we share the berries while we talk?');
    await compare
      .getByRole('combobox', { name: 'Native field factor', exact: true })
      .nth(1)
      .selectOption({ label: 'Ada · Food' });
    await compare.getByRole('button', { name: 'Run variants serially', exact: true }).click();
    await expect(compare).toBeHidden({ timeout: 90_000 });
    const variantA = page.getByRole('region', { name: 'Variant A · captured run', exact: true });
    const variantB = page.getByRole('region', { name: 'Variant B · captured run', exact: true });
    await expect(variantA.locator('.cl-comparison-context')).toContainText('· Baseline');
    await expect(variantB.locator('.cl-comparison-context')).toContainText('· Changed factor');
    const originA = await variantA.locator('.cl-comparison-context > div').first().innerText();
    const originB = await variantB.locator('.cl-comparison-context > div').first().innerText();
    expect(originA).not.toContain('Not captured');
    expect(originA.split(' · ')[0]).toBe(originB.split(' · ')[0]);
    for (const [variant, value] of [
      [variantA, 25],
      [variantB, 60],
    ] as const) {
      await variant.getByRole('button', { name: 'Full request', exact: true }).click();
      const exact = page.getByRole('textbox', { name: 'Exact captured content', exact: true });
      await expect(exact).toHaveValue(new RegExp(`Food: ${value} \\(`));
      await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
    }
    await expect(food).toHaveValue('60');
    expect(native.game.service.world.sequence).toBe(gameSequence);
    expect(pageErrors).toEqual([]);
    expect(
      requests.filter((path) =>
        ['/api/state', '/api/presence', '/api/control', '/api/world-events'].includes(path),
      ),
    ).toEqual([]);
    await expect(
      page.getByText('Earlier server requests are still finishing. Wait before continuing.', {
        exact: true,
      }),
    ).toHaveCount(0);
    await expect
      .poll(async () => (await networkSnapshot()).every((owner) => owner.quarantined === 0))
      .toBe(true);
    const network = await networkSnapshot();
    expect(network.find((owner) => owner.role === 'browser-api-reads')).toMatchObject({
      capacity: 16,
      quarantined: 0,
    });
    expect(network.find((owner) => owner.role === 'browser-presence')).toMatchObject({
      occupied: 0,
    });
    expect(network.find((owner) => owner.role === 'browser-subscriptions')).toMatchObject({
      occupied: 0,
    });
    await info.attach('native-network-owner-state', {
      body: JSON.stringify(network, null, 2),
      contentType: 'application/json',
    });
    expect(
      requests.filter((path) =>
        // Vite calls the tiny shared page selector "game"; main is the actual
        // ordinary-game entry that imports the renderer and presence owner.
        /playcanvas|\/src\/main\.tsx|\/src\/renderer\/|\/assets\/main-[^/]+\.js$/i.test(path),
      ),
    ).toEqual([]);
    await info.attach('native-request-paths', {
      body: JSON.stringify([...new Set(requests)].sort(), null, 2),
      contentType: 'application/json',
    });
  } catch (error) {
    const network = await networkSnapshot();
    await info.attach('native-network-owner-state', {
      body: JSON.stringify(network, null, 2),
      contentType: 'application/json',
    });
    throw error;
  } finally {
    await page.close();
    await native.close();
  }
});

test('native prepared requests retain one handle, apply one override and reject it after native editing', async ({
  page,
}, info) => {
  test.setTimeout(240_000);
  page.setDefaultTimeout(15_000);
  const { startCognitionLabFixture } = await import('../fixtures/cognition-lab.js');
  const native = await startCognitionLabFixture({ withAi: true, production: true });
  const operations: CognitionLabOperation[] = [];
  let client = '';
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (!path.startsWith('/api/cognition-lab/')) return;
    client = request.headers()['x-ol-client'] ?? client;
    if (path.endsWith('/operations')) operations.push(request.postDataJSON());
  });
  const request = (path: string, operation?: CognitionLabOperation) =>
    page.evaluate(
      async ({ path, body, client }) => {
        const modulePath = '/assets/network-tools.js';
        const { browserRequest } = await import(modulePath);
        const operation = body ? JSON.parse(body) : undefined;
        const workspace = operation
          ? await browserRequest('/api/cognition-lab/workspace', {
              credentials: 'same-origin',
              headers: { 'X-OL-Client': client },
            })
          : undefined;
        return browserRequest(
          `/api/cognition-lab${path}`,
          {
            credentials: 'same-origin',
            headers: {
              'X-OL-Client': client,
              ...(operation
                ? {
                    'X-OL-Lab-Owner': (workspace!.body as CognitionLabWorkspace)
                      .operationOwnerScope,
                  }
                : {}),
              ...(operation ? { 'Content-Type': 'application/json' } : {}),
            },
            ...(body ? { method: 'POST', body } : {}),
          },
          operation,
        );
      },
      { path, body: operation ? JSON.stringify(operation) : undefined, client },
    );
  const current = async () => (await request('/workspace')).body as CognitionLabWorkspace;
  const prepare = async (text: string) => {
    await page.getByRole('textbox', { name: 'Words to say', exact: true }).fill(text);
    await page.getByRole('button', { name: 'Edit next model input', exact: true }).click();
    const sheet = page.getByRole('dialog', { name: 'Prepare one real model call', exact: true });
    await expect(sheet.getByRole('combobox', { name: 'Stage purpose', exact: true })).toHaveValue(
      'nextDecision',
    );
    await sheet.getByRole('button', { name: 'Prepare and hold', exact: true }).click();
    const editor = page.getByRole('dialog', { name: /^Held live call ·/ });
    await expect(editor).toBeVisible({ timeout: 60_000 });
    await editor
      .getByRole('button', { name: 'Load complete original request for editing', exact: true })
      .click();
    await expect(
      editor.getByRole('textbox', { name: 'Model-facing request', exact: true }),
    ).not.toHaveValue('');
    return editor;
  };
  try {
    await page.goto(`${native.base}/cognition`);
    await expect(
      page.getByRole('button', { name: 'One response · Wait for Ada', exact: true }),
    ).toBeVisible();
    let editor = await prepare('Ada, what should we do next?');
    const original = await editor
      .getByRole('textbox', { name: 'Model-facing request', exact: true })
      .inputValue();
    const handle = (await current()).run?.prepared?.id;
    expect(handle).toBeTruthy();
    const callsBeforeClosing = native.calls.length;
    await editor.getByRole('button', { name: 'Close editor', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Edit held input', exact: true })).toBeVisible();
    expect(native.calls).toHaveLength(callsBeforeClosing);
    await page.getByRole('button', { name: 'Edit held input', exact: true }).click();
    editor = page.getByRole('dialog', { name: /^Held live call ·/ });
    expect((await current()).run?.prepared?.id).toBe(handle);
    await editor
      .getByRole('button', { name: 'Load complete original request for editing', exact: true })
      .click();
    const input = editor.getByRole('textbox', { name: 'Model-facing request', exact: true });
    await expect(input).toHaveValue(original);
    const edited = JSON.parse(original);
    expect(edited.kind).toBe('judge');
    const note = 'Native browser one-shot experimental note.';
    edited.request.state =
      typeof edited.request.state === 'object' && edited.request.state !== null
        ? { ...edited.request.state, experimentalNote: note }
        : { suppliedState: edited.request.state, experimentalNote: note };
    await input.fill(JSON.stringify(edited));
    await editor.getByRole('button', { name: 'Submit this input once', exact: true }).click();
    await expect(editor).toBeHidden({ timeout: 60_000 });
    await expect(page.locator('.cl-state > strong')).toHaveText('held', { timeout: 60_000 });
    expect(native.calls.some((call) => JSON.stringify(call).includes(note))).toBe(true);
    const submitted = operations.find((operation) => operation.kind === 'submitPrepared');
    expect(submitted).toBeTruthy();
    const callsAfterOverride = native.calls.length;
    const replay = (await request('/operations', submitted)).body as CognitionLabReceipt;
    expect(replay).toMatchObject({ ok: true, commandId: submitted!.commandId });
    expect(native.calls).toHaveLength(callsAfterOverride);
    editor = await prepare('Ada, shall we share the berries while we talk?');
    const staleRequest = JSON.parse(
      await editor.getByRole('textbox', { name: 'Model-facing request', exact: true }).inputValue(),
    );
    const staleHandle = (await current()).run?.prepared?.id;
    await editor.getByRole('button', { name: 'Close editor', exact: true }).click();
    const beforeEdit = native.calls.length;
    const character = page.getByRole('region', { name: 'Current character', exact: true });
    await character.getByRole('button', { name: 'Body', exact: true }).click();
    await character.getByRole('spinbutton', { name: 'Food', exact: true }).fill('55');
    await character.getByRole('button', { name: 'Apply attribute (1)', exact: true }).click();
    await expect(
      character.getByText('Applied values · no changes here', { exact: true }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'Edit held input', exact: true })).toHaveCount(0);
    const afterEdit = await current();
    const refused = (
      await request('/operations', {
        kind: 'submitPrepared',
        commandId: crypto.randomUUID(),
        expected: {
          runtimeGeneration: afterEdit.runtimeGeneration,
          scenarioRevision: afterEdit.scenarioRevision,
        },
        handleId: staleHandle!,
        request: staleRequest,
      })
    ).body as CognitionLabReceipt;
    expect(refused.ok).toBe(false);
    expect(native.calls).toHaveLength(beforeEdit);
  } catch (error) {
    await info.attach('native-prepared-failure-state', {
      body: JSON.stringify(
        {
          workspace: await current().catch(() => undefined),
          errors: await page.locator('.cl-error').allTextContents(),
          operations: operations.map((operation) => ({
            commandId: operation.commandId,
            kind: operation.kind,
          })),
        },
        null,
        2,
      ),
      contentType: 'application/json',
    });
    throw error;
  } finally {
    await page.close();
    await native.close();
  }
});
