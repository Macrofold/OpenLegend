import { operatorActionCatalogue } from './action-catalogue.js';
import { afterAll, describe, expect, it, vi } from 'vitest';
import {
  createWorld,
  NPC_ID,
  PLAYER_ID,
  entityGet,
  worldPosition,
  worldSupport,
  setSpatialPosition,
  compilePreparedResponses,
  preparedResponseProfile,
  currentWorkIdentity,
  nativeValueHoldSupported,
  definitionPin,
  readAttribute,
  attributeDefinitions,
} from '@open-legend/domain';
import { testRepository, readConfig } from '../../../tests/fixtures/database.js';
import { enterLocalWorld, editWorld } from '../../../tests/fixtures/service.js';
import { WorldService } from './world-service.js';
import { AiDirector } from './ai-director.js';
import { fixtureCognitionAi } from '../../../tests/fixtures/cognition-ai.js';
import { npcCandidates, candidateChoice } from './context.js';
import { decisionObservation } from './decision-observation.js';
import { prepareResponseReadiness, preparedResponseChoices } from './prepared-response-context.js';

function barrier() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('captured durability through the native service/writer', () => {
  let service: WorldService | undefined;
  afterAll(async () => {
    await service?.settleBackgroundSaves();
    service?.releaseHostWork();
  });
  it('reuses a covering write without chasing unrelated progress, retaining latest-state callers', async () => {
    const store = await testRepository(undefined, createWorld(73));
    let now = 10000;
    service = new WorldService(store, readConfig({ OPEN_LEGEND_GOD_MODE: 'true' }), () => now);
    await enterLocalWorld(service);
    await service.setPresence('isolated-barrier', true);
    await service.control({ paused: false });
    await service.whenDurable();
    await service.tick(0.01);
    const target = { generation: service.generation, sequence: service.durabilityTicket() };
    const started = barrier(),
      release = barrier();
    const original = store.commit.bind(store);
    const commit = vi.spyOn(store, 'commit').mockImplementationOnce(async (...args) => {
      started.resolve();
      await release.promise;
      return original(...args);
    });
    const saving = service.whenDurable(target);
    let same: ReturnType<WorldService['whenDurable']> | undefined;
    try {
      await started.promise;
      now += 10;
      await service.tick(0.01);
      expect(service.durabilityTicket()).toBeGreaterThan(target.sequence);
      same = service.whenDurable(target);
    } finally {
      release.resolve();
    }
    expect((await saving).sequence).toBeGreaterThanOrEqual(target.sequence);
    expect((await same)!.sequence).toBeGreaterThanOrEqual(target.sequence);
    expect(commit).toHaveBeenCalledTimes(1);
    await service.whenDurable();
    expect(commit.mock.calls.length).toBeGreaterThan(1);
    await expect(
      service.whenDurable({ generation: 'discarded', sequence: target.sequence }),
    ).rejects.toThrow('timeline');
    await expect(
      service.whenDurable({
        generation: service.generation,
        sequence: service.durabilityTicket() + 1,
      }),
    ).rejects.toThrow('future');
  }, 30000);
  it('retains a real body cooldown after Stop without offering a blocked immediate action', async () => {
    if (!service) throw new Error('The shared native service was not initialized.');
    await editWorld(service, (world) => {
      const actor = entityGet(world.entities, NPC_ID)!;
      const point = worldPosition(actor);
      setSpatialPosition(
        world,
        entityGet(world.entities, PLAYER_ID)!,
        { ...point, x: point.x + 1 },
        worldSupport(actor),
      );
    });
    const attack = operatorActionCatalogue(service, { targetId: NPC_ID }, PLAYER_ID).actions.find(
      (a) => a.enabled && a.intent.kind === 'command' && a.intent.command.type === 'strike',
    );
    if (!attack || attack.intent.kind !== 'command')
      throw new Error('The opening has no native strike.');
    expect(
      (await service.operatorCommand('isolated-warning', PLAYER_ID, attack.intent.command)).ok,
    ).toBe(true);
    await service.tick(0.05);
    const observed = decisionObservation(service.world, NPC_ID)!;
    const evade = npcCandidates(service, NPC_ID, observed, 'complete-physical').find(
      (c) => c.command?.type === 'evade' && c.readiness?.kind === 'ready',
    );
    if (!evade?.command) throw new Error('This native opening has no executable evasion.');
    const started = await service.operatorCommand('isolated-evade', NPC_ID, evade.command);
    expect(started.ok).toBe(true);
    const blocked = npcCandidates(service, NPC_ID, undefined, 'complete-physical').find(
      (c) => c.command?.type === 'evade' && c.readiness?.kind === 'blocked',
    );
    expect(blocked?.readiness?.kind).toBe('blocked');
    expect((await service.operatorCommand('isolated-stop', NPC_ID, { type: 'cancel' })).ok).toBe(
      true,
    );
    const afterStop = npcCandidates(service, NPC_ID, undefined, 'complete-physical').find(
      (c) => c.command?.type === 'evade',
    );
    expect(afterStop?.readiness?.kind).toBe('blocked');
    const profile = preparedResponseProfile(service.world.cognitionPolicy.preparedResponses)!;
    const definition = profile.purposes[0]!;
    const compiled = compilePreparedResponses(service.world, {
      actorId: NPC_ID,
      causeIds: [],
      evidence: [],
      visible: [],
      methods: [],
    });
    if (!compiled || !afterStop) throw new Error('The native response profile is unavailable.');
    const choice = candidateChoice(
      afterStop,
      NPC_ID,
      'isolated-choice',
      currentWorkIdentity(service.world, NPC_ID),
    );
    const purpose = {
      definition: compiled.profile,
      id: definition.id,
      description: definition.label,
      roles: {},
      sourceIds: [],
    };
    const prepared = prepareResponseReadiness(service, {
      ...compiled,
      purposes: [
        {
          id: 'native-cooldown-control',
          purpose,
          label: definition.label,
          meaning: definition.meaning,
          roleDescriptions: {},
          options: [
            {
              id: afterStop.id,
              description: afterStop.description,
              invocation: choice.invocation,
              transition: choice.transition,
              purpose,
            },
          ],
        },
      ],
    });
    const request = preparedResponseChoices(prepared, profile.instructions, new Map());
    expect(request.candidates.map((c) => c.id)).toEqual(['continue']);
    expect(JSON.stringify(request.facts)).toContain('blockedActionIds');
    expect(JSON.stringify(request.facts)).toContain('evasion-recovery');
    const readyAt =
      afterStop.readiness?.kind === 'blocked' ? afterStop.readiness.nextAt : undefined;
    if (readyAt === undefined) throw new Error('The native cooldown has no recovery boundary.');
    const priorRecoveryObservations = new Set(
      service.world.events
        .filter((event) => event.type === 'response-observation' && event.actorId === NPC_ID)
        .map((event) => event.id),
    );
    await service.tick((readyAt - service.world.simTime) / service.config.baseRatio + 0.01, 0);
    expect(
      service.world.events.some(
        (event) =>
          event.type === 'response-observation' &&
          event.actorId === NPC_ID &&
          !priorRecoveryObservations.has(event.id),
      ),
    ).toBe(true);
    // The old encounter may have ended by recovery. Native capability returns;
    // that does not require a new contextual dodge offer or automatic action.
    const recovered = service.prepareCommandChoice(afterStop.command!, NPC_ID, 'replace');
    expect({
      at: service.world.simTime,
      readyAt,
      result: 'outcome' in recovered ? recovered.outcome : recovered,
    }).toMatchObject({ result: { ok: true } });
  }, 30000);
  it('prepares replacement through actual busy work without cancelling that work', async () => {
    if (!service) throw new Error('The native service is unavailable.');
    const gather = operatorActionCatalogue(service, { catalogue: true }, NPC_ID).actions.find(
      (a) => a.enabled && a.intent.kind === 'command' && a.intent.command.type === 'gather',
    );
    if (!gather || gather.intent.kind !== 'command')
      throw new Error('No native gathering intention.');
    expect(
      (await service.operatorCommand('isolation-work', NPC_ID, gather.intent.command)).ok,
    ).toBe(true);
    const actor = entityGet(service.world.entities, NPC_ID)!.actor!;
    const work = actor.action?.id;
    expect(work).toBeTruthy();
    const strike = {
      type: 'strike' as const,
      targetId: PLAYER_ID,
      definitionId: 'punch',
      autoEquip: true,
    };
    const replace = service.prepareCommandChoice(strike, NPC_ID, 'replace');
    expect('outcome' in replace ? replace.outcome.ok : replace.ok).toBe(true);
    const continued = service.prepareCommandChoice(strike, NPC_ID, 'continue');
    expect('outcome' in continued ? continued.outcome.ok : continued.ok).toBe(false);
    expect(entityGet(service.world.entities, NPC_ID)!.actor!.action?.id).toBe(work);
    await service.operatorCommand('isolation-work-stop', NPC_ID, { type: 'cancel' });
  }, 30000);

  it('requests the captured save through the actual director without holding admission for disk', async () => {
    if (!service) throw new Error('The native service is unavailable.');
    service.config.budgetUsd = 1;
    service.config.sharedExecution = [
      { id: 'fixture-judge', kind: 'judge', provider: 'jev', model: service.config.jevModel },
    ];
    const fixture = fixtureCognitionAi();
    const ready = vi.fn();
    const director = new AiDirector(
      service,
      fixture.client,
      undefined,
      'test-fixture',
      undefined,
      ready,
    );
    const durable = vi.spyOn(service, 'whenDurable');
    try {
      await service.tick(0.01, 0);
      const target = service.durabilityTicket();
      expect(service.isDurable(target)).toBe(false);
      await director.considerThought();
      expect(durable).toHaveBeenCalledWith({ generation: service.generation, sequence: target });
      await service.settleBackgroundSaves();
      await Promise.resolve();
      expect(ready).toHaveBeenCalledTimes(1);
      expect(service.isDurable(target)).toBe(true);
      expect(fixture.calls).toHaveLength(0);
    } finally {
      await director.close();
      durable.mockRestore();
      service.config.budgetUsd = 0;
      service.config.sharedExecution = undefined;
    }
  }, 30000);
  it('invalidates shared preparation when operational holds change without a world mutation', () => {
    if (!service) throw new Error('The native service is unavailable.');
    const world = service.world;
    const prepared = service.prepareNativeCommandChoices([]);
    expect(prepared.current()).toBe(true);
    const definition = attributeDefinitions(world).find((d) =>
      nativeValueHoldSupported(world, NPC_ID, d.id),
    );
    if (!definition) throw new Error('No supported numeric native attribute.');
    const actor = entityGet(world.entities, NPC_ID)!;
    try {
      service.setNativeValueHolds([
        {
          entityId: NPC_ID,
          definition: definitionPin(definition),
          physicalLife: actor.actor!.physicalLife ?? 0,
          value: readAttribute(world, actor, definition) as number,
        },
      ]);
      expect(service.world).toBe(world);
      expect(prepared.current()).toBe(false);
    } finally {
      service.setNativeValueHolds([]);
    }
  });
  it('rejects a captured consumer after a real failed PostgreSQL transaction', async () => {
    const store = await testRepository(undefined, createWorld(74));
    const failing = new WorldService(store, readConfig({ OPEN_LEGEND_GOD_MODE: 'true' }));
    try {
      await enterLocalWorld(failing);
      await failing.setPresence('isolated-failure', true);
      await failing.control({ paused: false });
      await failing.whenDurable();
      await failing.tick(0.01, 0);
      const target = { generation: failing.generation, sequence: failing.durabilityTicket() };
      vi.spyOn(store, 'commit').mockImplementationOnce(() =>
        store.db.transaction(async () => {
          await store.db.prepare('SELECT 1 / 0').get();
          return 0;
        }),
      );
      await expect(failing.whenDurable(target)).rejects.toThrow();
      expect(failing.storageError).not.toBeNull();
      expect(failing.isDurable(target.sequence)).toBe(false);
    } finally {
      await failing.settleBackgroundSaves();
      failing.releaseHostWork();
    }
  }, 30000);
});
