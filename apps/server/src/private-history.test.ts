import { afterEach, describe, expect, it, vi } from 'vitest';
import { NPC_ID, PLAYER_ID } from '@open-legend/domain';
import { appendMemory, emit } from '../../../packages/domain/src/events.js';
import { readConfig, testRepository } from '../../../tests/fixtures/database.js';
import { editWorld, enterLocalWorld } from '../../../tests/fixtures/service.js';
import { memoryRef } from './evidence-relationships.js';
import { WorldService } from './world-service.js';
import { WorldToolService } from './world-tools.js';

function barrier() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0)) await close();
});

async function setup() {
  const store = await testRepository();
  const service = new WorldService(store, readConfig({ OPEN_LEGEND_GOD_MODE: 'true' }));
  cleanup.push(async () => {
    service.releaseHostWork();
    await store.close();
  });
  await enterLocalWorld(service);
  await service.setPresence('private-history-fixture', true);
  await service.control({ paused: false });
  const id = await editWorld(
    service,
    (world) =>
      appendMemory(world, NPC_ID, {
        kind: 'episode',
        source: 'observed',
        summary: 'Private fixture observation.',
        entityIds: [],
        importance: 6,
      })!,
  );
  const scope = service.localScope;
  const grant = { worldId: service.world.id, principal: scope.accountId, scope };
  const tools = new WorldToolService(service);
  const record = service.world.memories[NPC_ID]!.find((entry) => entry.id === id)!;
  const ref = memoryRef(NPC_ID, record);
  return { store, service, id, scope, tools, grant, ref };
}

type Surface = 'inspect' | 'graph' | 'evidence' | 'editor' | 'json';
async function read(h: Awaited<ReturnType<typeof setup>>, surface: Surface) {
  switch (surface) {
    case 'inspect':
      return h.tools.execute('ol_inspect', h.ref, h.grant);
    case 'graph':
      return h.tools.execute('ol_graph', { root: h.ref }, h.grant);
    case 'evidence':
      return h.tools.execute('ol_evidence', { actorId: NPC_ID }, h.grant);
    case 'editor':
      return h.service.personEditor(NPC_ID, undefined, h.scope);
    case 'json':
      return h.service.personMemoryJson(NPC_ID, `memory:${h.id}`, h.scope);
  }
}

/** Hold a real PostgreSQL read's result before its caller can disclose it. */
function hold(h: Awaited<ReturnType<typeof setup>>, surface: Surface) {
  const acquired = barrier(),
    release = barrier();
  if (surface === 'evidence' || surface === 'editor') {
    const original = h.store.memories.page.bind(h.store.memories);
    vi.spyOn(h.store.memories, 'page').mockImplementationOnce(async (...args) => {
      const result = await original(...args);
      acquired.resolve();
      await release.promise;
      return result;
    });
  } else {
    const original = h.store.memories.entry.bind(h.store.memories);
    vi.spyOn(h.store.memories, 'entry').mockImplementationOnce(async (...args) => {
      const result = await original(...args);
      acquired.resolve();
      await release.promise;
      return result;
    });
  }
  return { acquired, release };
}

describe('private history disclosure after storage waits', () => {
  it.each<Surface>(['inspect', 'graph', 'evidence', 'editor', 'json'])(
    '%s rejects text forgotten by a committed edit during retrieval',
    async (surface) => {
      const h = await setup();
      const before = await read(h, surface);
      expect(JSON.stringify(before)).toContain('Private fixture observation.');
      const pending = hold(h, surface);
      const reading = read(h, surface);
      await pending.acquired.promise;
      try {
        expect((await h.service.forgetMemory(NPC_ID, h.id, h.scope)).ok).toBe(true);
      } finally {
        pending.release.resolve();
      }
      const result = await reading;
      expect(result).toMatchObject(
        'status' in result ? { status: 'stale' } : { ok: false, code: 'stale' },
      );
      expect(JSON.stringify(result)).not.toContain('Private fixture observation.');
    },
  );

  it.each<Surface>(['inspect', 'evidence'])(
    '%s rejects another human’s newly bound character while the requester remains authorized',
    async (surface) => {
      const h = await setup();
      const previousActor = Object.values(h.service.world.entities).find(
        (entry) => entry.actor && entry.id !== NPC_ID && entry.id !== PLAYER_ID,
      )!;
      await h.store.authority.provision(h.service.world.id, {
        issuer: 'https://fixture.invalid',
        subject: 'other-person',
        accountId: 'fixture-other',
        actorId: previousActor.id,
        capabilities: ['play'],
      });
      const pending = hold(h, surface);
      const reading = read(h, surface);
      await pending.acquired.promise;
      try {
        expect(
          (
            await h.service.rebindAccount(h.scope, {
              id: 'fixture-rebind',
              accountId: 'fixture-other',
              actorId: NPC_ID,
              expectedRevision: 1,
            })
          ).ok,
        ).toBe(true);
        expect(h.service.currentScope(h.scope, 'inspect')).toBe(true);
        expect(h.service.mayInspectPrivate(NPC_ID, h.scope)).toBe(false);
      } finally {
        pending.release.resolve();
      }
      expect(await reading).toMatchObject({ status: 'stale' });
    },
  );

  it('rejects a memory body corrected by newly perceived evidence during retrieval', async () => {
    const h = await setup();
    const correctionId = await editWorld(h.service, (world) => {
      const events: import('@open-legend/domain').WorldEvent[] = [];
      emit(
        world,
        events,
        'thought',
        'New correcting evidence.',
        world.entities[NPC_ID],
        undefined,
        undefined,
        'private',
      );
      return events[0]!.id;
    });
    const pending = hold(h, 'inspect');
    const reading = read(h, 'inspect');
    await pending.acquired.promise;
    try {
      expect((await h.service.correctMemory(NPC_ID, h.id, correctionId, h.scope)).ok).toBe(true);
    } finally {
      pending.release.resolve();
    }
    const result = await reading;
    expect(result).toMatchObject({ status: 'stale' });
    expect(JSON.stringify(result)).not.toContain('Private fixture observation.');
  });

  it('keeps a pending authorized read when only another character’s evidence changes', async () => {
    const h = await setup();
    const pending = hold(h, 'inspect');
    const reading = read(h, 'inspect');
    await pending.acquired.promise;
    try {
      await editWorld(h.service, (world) =>
        appendMemory(world, PLAYER_ID, {
          kind: 'episode',
          source: 'observed',
          summary: 'Unrelated observation.',
          entityIds: [],
          importance: 3,
        }),
      );
    } finally {
      pending.release.resolve();
    }
    expect(await reading).toMatchObject({ status: 'ok' });
  });
});
