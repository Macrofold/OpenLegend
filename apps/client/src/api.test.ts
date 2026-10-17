import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

it('sends a stable page identity and increasing presence order with Resume', async () => {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ ok: true, code: 'control', message: 'Resumed.' }),
  });
  vi.stubGlobal('fetch', fetch);
  const { setWorldPaused } = await import('./api.js');
  await setWorldPaused(false);
  await setWorldPaused(true);
  await setWorldPaused(false);
  const requests = fetch.mock.calls.map(([, init]) => JSON.parse(init.body));
  expect(requests[0]).toMatchObject({ paused: false, presenceSequence: 1 });
  expect(requests[0].clientId).toEqual(expect.any(String));
  expect(requests[1]).toEqual({ paused: true });
  expect(requests[2]).toMatchObject({
    paused: false,
    clientId: requests[0].clientId,
    presenceSequence: 2,
  });
});

it('uses the same identity and ordering for heartbeats, hiding and explicit Resume', async () => {
  const send = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  const beacons = vi.fn().mockReturnValue(true);
  const events = new Map<string, () => void>();
  const page = {
    visibilityState: 'visible',
    hasFocus: () => true,
    addEventListener: (name: string, fn: () => void) => events.set(name, fn),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal('fetch', send);
  vi.stubGlobal('navigator', { sendBeacon: beacons });
  vi.stubGlobal('document', page);
  vi.stubGlobal('window', {
    setInterval: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  const { acceptAccess, setWorldPaused, startPresence } = await import('./api.js');
  const initial = publicView();
  if (!initial.access) throw new Error('Missing fixture access');
  acceptAccess(initial);
  const stop = startPresence(initial.access.scope);
  acceptAccess({ ...initial, access: { ...initial.access, scope: 'scope:2' } });
  page.visibilityState = 'hidden';
  events.get('visibilitychange')!();
  await setWorldPaused(false);
  const heartbeat = JSON.parse(send.mock.calls[0]![1].body);
  const hidden = JSON.parse(await (beacons.mock.calls[0]![1] as Blob).text());
  const resumed = JSON.parse(send.mock.calls[1]![1].body);
  expect(heartbeat).toMatchObject({ visible: true, sequence: 1 });
  expect(send.mock.calls[0]![1].headers['X-OL-Scope']).toBe('scope:1');
  expect(beacons.mock.calls[0]![0]).toContain('scope=scope:1');
  expect(hidden).toEqual({ clientId: heartbeat.clientId, visible: false, sequence: 2 });
  expect(resumed).toEqual({ paused: false, clientId: heartbeat.clientId, presenceSequence: 3 });
  stop();
  expect(beacons.mock.calls.at(-1)![0]).toContain('scope=scope:1');
});

it('reports lost window focus immediately and does not let a visible-tab heartbeat override it', async () => {
  const send = vi.fn().mockResolvedValue({ ok: true });
  const beacons = vi.fn().mockReturnValue(true);
  const events = new Map<string, () => void>();
  const addEventListener = (name: string, callback: () => void) => events.set(name, callback);
  let heartbeat: () => void = () => undefined;
  vi.stubGlobal('fetch', send);
  vi.stubGlobal('navigator', { sendBeacon: beacons });
  vi.stubGlobal('document', {
    visibilityState: 'visible',
    hasFocus: () => true,
    addEventListener,
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal('window', {
    addEventListener,
    removeEventListener: vi.fn(),
    setInterval: (callback: () => void) => {
      heartbeat = callback;
    },
  });
  const stop = (await import('./api.js')).startPresence('scope:1');
  events.get('blur')!();
  expect(JSON.parse(await (beacons.mock.calls[0]![1] as Blob).text())).toMatchObject({
    visible: false,
  });
  heartbeat();
  expect(JSON.parse(send.mock.calls.at(-1)![1].body)).toMatchObject({ visible: false });
  events.get('focus')!();
  expect(JSON.parse(send.mock.calls.at(-1)![1].body)).toMatchObject({ visible: true });
  stop();
});

// A small public projection exercises transport semantics without authored world fixtures.
function publicView(): import('@open-legend/protocol').GameView {
  return {
    schemaVersion: 2,
    revision: 1,
    worldId: 'world:a',
    saveTimeline: 'timeline:1',
    presentation: { worldName: 'Fixture world', locationName: 'Fixture place', timeLabel: 'Time' },
    access: {
      scope: 'scope:1',
      privateDraftScope: 'owner:1',
      commandRecoveryScope: 'recovery:1',
      accountId: 'account:1',
      actorId: 'person:1',
      controlGeneration: 1,
      controlling: true,
      controlledElsewhere: false,
      canManageSaves: false,
      mode: 'local',
    },
    inventionPolicy: { revision: 1, playerLocked: false, agentLocked: false },
    profile: {
      id: 'profile:1',
      revision: 1,
      preferences: { showUnavailableActions: true, pauseWhenHidden: true },
    },
    vision: { radius: 1, enabled: true, eyeHeight: 1, targetHeights: [1] },
    hearing: {
      referenceRadius: 1,
      partialRadius: 1,
      detectionRadius: 1,
      enabled: true,
      earHeight: 1,
    },
    map: {
      width: 0,
      height: 0,
      seed: 1,
      tiles: [],
      terrain: {},
      spatial: {
        version: 1,
        revision: 1,
        disclosure: 'public',
        surfaces: [],
        blockers: [],
        levels: [],
      },
    },
    clock: {
      seconds: 0,
      day: 1,
      hour: 0,
      speed: 1,
      baseRatio: 1,
      paused: false,
      pauseReason: null,
      namedTimes: [],
      offsetHours: 0,
    },
    player: {
      id: 'person:1',
      name: 'Person',
      position: { x: 0, y: 0, z: 0 },
      supportSurfaceId: null,
      heading: 0,
      alive: true,
      attributes: [],
      practice: [],
      suggestedActionIds: [],
      action: null,
      hasWork: false,
      inventory: [],
      inventoryRevision: 1,
      canUseInventory: true,
      actionAttempts: [],
      outings: [],
      actions: [],
    },
    entities: [],
    recipes: [],
    events: [],
    conversation: [],
    milestones: [],
    ai: {
      mode: 'unconfigured',
      jevConfigured: false,
      llmConfigured: false,
      message: '',
      jobs: [],
      budget: { limitUsd: 0, spentUsd: 0, reservedUsd: 0, estimated: false },
      usage: { jevCalls: 0, llmCalls: 0, inputTokens: 0, outputTokens: 0, lastLatencyMs: 0 },
    },
    persistence: { status: 'saved', message: '' },
  };
}

it('roundtrips optional-field removal through the actual JSON patch producer and consumer', async () => {
  const { projectPatch } = await import('../../server/src/view.js');
  const { applyGamePatch } = await import('./api.js');
  const previous = publicView();
  previous.player.activity = { name: 'A selected activity', status: 'active' };
  previous.player.bodyState = 'dead';
  previous.player.actionAnimation = {
    id: 'animation',
    kind: 'punch',
    progress: 0,
    direction: { x: 1, z: 0 },
  };
  previous.player.scars = [{ id: 'scar', name: 'Scar', description: '', treatmentsRemaining: 1 }];
  previous.clock.preparingNavigation = true;
  previous.commandEpoch = 'command:1';
  previous.historyEpoch = 'history:1';
  previous.worldEventsRevision = 'events:1';
  previous.ai.budget.accounts = { one: { spentUsd: 0, reservedUsd: 0 } };
  const before = structuredClone(previous);
  const next = structuredClone(previous);
  next.revision++;
  next.player.activity = undefined;
  delete next.player.bodyState;
  next.player.actionAnimation = null;
  next.player.scars = [];
  delete next.clock.preparingNavigation;
  delete next.commandEpoch;
  delete next.historyEpoch;
  next.worldEventsRevision = '';
  delete next.ai.budget.accounts;
  const patch = projectPatch(previous, next);
  expect(patch).not.toBeNull();
  const wire: import('@open-legend/protocol').GamePatch = JSON.parse(JSON.stringify(patch));
  const received = applyGamePatch(previous, wire);
  expect(received).toEqual(JSON.parse(JSON.stringify(next)));
  expect(Object.hasOwn(received.player, 'activity')).toBe(false);
  expect(received.player.actionAnimation).toBeNull();
  expect(previous).toEqual(before);
  expect(received.map).toBe(previous.map);
});

it('retains entity removal/order and refuses an update for a different audience or base revision', async () => {
  const { projectPatch } = await import('../../server/src/view.js');
  const { applyGamePatch } = await import('./api.js');
  const previous = publicView();
  const entity = (id: string): import('@open-legend/protocol').EntityView => ({
    id,
    name: id,
    kind: 'actor',
    subtype: '',
    position: { x: 0, y: 0, z: 0 },
    supportSurfaceId: null,
    heading: 0,
    appearance: '',
    radius: 1,
    status: '',
    actions: [],
  });
  previous.entities = [entity('one'), entity('two'), entity('three')];
  const next = { ...previous, revision: 2, entities: [entity('three'), entity('four')] };
  const patch = projectPatch(previous, next);
  expect(patch).not.toBeNull();
  const wire: import('@open-legend/protocol').GamePatch = JSON.parse(JSON.stringify(patch));
  expect(applyGamePatch(previous, wire)).toEqual(next);
  expect(() => applyGamePatch(previous, { ...wire, scope: 'different' })).toThrow();
  expect(() => applyGamePatch(previous, { ...wire, baseRevision: 0 })).toThrow();
  expect(
    projectPatch(previous, { ...next, access: { ...previous.access!, scope: 'different' } }),
  ).toBeNull();
  expect(
    projectPatch(previous, { ...next, vision: { ...next.vision, enabled: false } }),
  ).toBeNull();
});

it('clears private drafts on logout or ownership replacement, but preserves ordinary Resume', async () => {
  const data: Record<string, string> = {};
  const storage = {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
      Object.defineProperty(storage, key, { value, enumerable: true, configurable: true });
    },
    removeItem: (key: string) => {
      delete data[key];
      Reflect.deleteProperty(storage, key);
    },
  };
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('sessionStorage', storage);
  vi.stubGlobal('window', { sessionStorage: storage });
  const { acceptAccess, clearAccess } = await import('./api.js');
  const { composerDraftKey, composerDraftScope, emptyDraft, readDraft, saveDraft } = await import(
    './draft.js'
  );
  const view = publicView();
  acceptAccess(view);
  const draft = { text: 'Unfinished private text', revision: 'edit-1' };
  const key = composerDraftKey(composerDraftScope(view), 'act', null);
  saveDraft(key, draft);
  const resumed = { ...view, access: { ...view.access!, scope: 'scope:2', controlGeneration: 2 } };
  acceptAccess(resumed);
  expect(readDraft(key)).toEqual(draft);
  for (const replace of [
    () => clearAccess(),
    () =>
      acceptAccess({
        ...view,
        access: {
          ...view.access!,
          scope: 'scope:3',
          privateDraftScope: 'owner:2',
          accountId: 'account:2',
        },
      }),
    () => acceptAccess({ ...view, historyEpoch: 'new:1', saveTimeline: 'timeline:2' }),
  ]) {
    saveDraft(key, draft);
    replace();
    expect(readDraft(key)).toEqual(emptyDraft());
    expect(storage.getItem(key!)).toBeNull();
  }
});
