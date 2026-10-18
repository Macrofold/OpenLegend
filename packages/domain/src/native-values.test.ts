import { describe, expect, it } from 'vitest';
import { createWorld, PLAYER_ID } from './data.js';
import { entityGet } from './entity-collection.js';
import { draftWorld, finishWorld, freezeWorld } from './draft.js';
import { reconcileConditions } from './conditions.js';
import {
  deactivateStatusEffect,
  integrateStatusRates,
  prepareStatusRates,
  reconcileStatusEffects,
} from './status-effects.js';
import {
  currentAttributeState,
  currentStatusInstance,
  currentWorkInvocation,
  materializeNativeValues,
  NATIVE_VALUE_SEGMENTS,
} from './native-values.js';
import {
  attributeDefinition,
  definitionPin,
  projectAttributes,
  readAttribute,
  setAttribute,
  validateWorldModules,
} from './world-modules.js';
import { readState } from './state-owners.js';
import type { WorldEvent, WorldState } from './types.js';
import { advanceWorld, executeCommand } from './kernel.js';
import { observeDomainCounters, type DomainCounters } from './diagnostic-counters.js';

const attributeId = 'wilderness:fullness';
const statusId = 'wilderness:metabolism';
function base(value = 76): WorldState {
  const world = createWorld(),
    entity = entityGet(world.entities, PLAYER_ID)!;
  world.paused = false;
  entity.actor!.attributes![attributeId]!.value = value;
  reconcileStatusEffects(world, entity, []);
  reconcileConditions(world, entity, []);
  return freezeWorld(world);
}
function step(
  original: WorldState,
  seconds: number,
  retain: boolean,
  events: WorldEvent[] = [],
  allStatuses = false,
) {
  const world = draftWorld(original, { retainNativeValues: true });
  if (allStatuses) reconcileStatusEffects(world, entityGet(world.entities, PLAYER_ID)!, events);
  const intervals = prepareStatusRates(world, entityGet(world.entities, PLAYER_ID)!).filter(
    (interval) => allStatuses || interval.definition.id === statusId,
  );
  if (!allStatuses) expect(intervals).toHaveLength(1);
  world.simTime += seconds;
  integrateStatusRates(world, intervals, seconds, events, [], false, undefined, retain);
  return freezeWorld(finishWorld(world));
}

describe('exact current native values', () => {
  it('retains both meters and accounting through conditional work rates, sleep and waking', () => {
    const initial = base();
    let lazy = initial,
      eager = initial;
    for (const duration of [0.17, 0.61]) {
      lazy = step(lazy, duration, true, [], true);
      eager = step(eager, duration, false, [], true);
    }
    expect(entityGet(lazy.entities, PLAYER_ID)).toBe(entityGet(initial.entities, PLAYER_ID));
    expect(lazy.pendingNativeIntegration!.byEntity[PLAYER_ID]!['wilderness:energy']).toBeDefined();
    expect(materializeNativeValues(lazy)).toEqual(eager);
    for (const body of [
      { type: 'gather', targetId: 'branches' },
      { type: 'cancel' },
      {
        type: 'status-effect',
        definitionId: 'wilderness:restorative-rest',
        operation: 'activate',
        targetId: PLAYER_ID,
      },
      {
        type: 'status-effect',
        definitionId: 'wilderness:restorative-rest',
        operation: 'deactivate',
        targetId: PLAYER_ID,
      },
    ] as const) {
      const command = { ...body, id: `current-values-${lazy.sequence}`, actorId: PLAYER_ID };
      const left = executeCommand(lazy, command),
        right = executeCommand(eager, command);
      expect(left.outcome.ok, left.outcome.message).toBe(true);
      expect(left).toEqual(right);
      lazy = step(left.world, 0.43, true, [], true);
      eager = step(right.world, 0.43, false, [], true);
      expect(
        lazy.pendingNativeIntegration!.byEntity[PLAYER_ID]!['wilderness:energy'],
      ).toBeDefined();
      // Sleep/wake reconciliation changes status membership once. The person's
      // unchanged body, meters and action remain shared through that boundary.
      expect(entityGet(lazy.entities, PLAYER_ID)!.actor).toBe(
        entityGet(left.world.entities, PLAYER_ID)!.actor,
      );
      expect(materializeNativeValues(lazy)).toEqual(eager);
    }
  });

  it('keeps concern-latch crossings eager with current revisions and identical notices', () => {
    const source = createWorld(),
      entity = entityGet(source.entities, PLAYER_ID)!;
    source.paused = false;
    const energy = attributeDefinition(source, 'wilderness:energy')!;
    energy.concern = {
      below: 25,
      mode: 'latched',
      recoveryMargin: 2,
      notify: true,
      text: '{subject.subject} {subject.verb:be} exhausted.',
      reconsider: false,
    };
    source.moduleManifest.pins = source.moduleManifest.pins.map((pin) =>
      pin.id === energy.id ? definitionPin(energy) : pin,
    );
    entity.actor!.attributes![energy.id] = { value: 25.0001, revision: 0, concernActive: false };
    reconcileStatusEffects(source, entity, []);
    reconcileConditions(source, entity, []);
    const initial = freezeWorld(source),
      leftEvents: WorldEvent[] = [],
      rightEvents: WorldEvent[] = [];
    const lazy = step(initial, 1, true, leftEvents, true),
      eager = step(initial, 1, false, rightEvents, true);
    expect(lazy.pendingNativeIntegration?.byEntity[PLAYER_ID]?.[energy.id]).toBeUndefined();
    expect(leftEvents.some((event) => event.type === 'attribute-concern')).toBe(true);
    expect(leftEvents).toEqual(rightEvents);
    expect(entityGet(lazy.entities, PLAYER_ID)!.actor!.attributes![energy.id]!.concernActive).toBe(
      true,
    );
    expect(materializeNativeValues(lazy)).toEqual(eager);
  });

  it('retains actual fullness operations through ordinary native publications', () => {
    const initial = base();
    const first = advanceWorld(initial, 0.17).world;
    const second = advanceWorld(first, 0.83).world;
    const current = entityGet(second.entities, PLAYER_ID)!;
    expect(second.pendingNativeIntegration?.byEntity[PLAYER_ID]?.[attributeId]).toBeDefined();
    expect(
      second.pendingNativeIntegration?.byEntity[PLAYER_ID]?.['wilderness:energy'],
    ).toBeDefined();
    const definition = attributeDefinition(second, attributeId)!;
    // Native movement may split either request further. Ordered eager equality is
    // checked below with explicit captured segments; this checks real clock progress.
    expect(readAttribute(second, current, definition)).toBeCloseTo(76 - 0.003, 12);
    const saved = materializeNativeValues(second);
    expect(entityGet(saved.entities, PLAYER_ID)!.actor!.attributes![attributeId]!.value).toBe(
      readAttribute(second, current, definition),
    );
    expect(second.simTime).toBe(initial.simTime + 1);
  });
  it('keeps the real metabolism family shared while exposing exact values, revisions, elapsed and work', () => {
    const initial = base();
    let lazy = initial,
      eager = initial;
    const anchor = entityGet(initial.entities, PLAYER_ID)!;
    const episode = anchor.statusEffects![statusId]!.episode;
    for (const duration of [0.13, 0.7, 1.91, 0.03]) {
      lazy = step(lazy, duration, true);
      eager = step(eager, duration, false);
    }
    expect(lazy.pendingNativeIntegration?.segments).toHaveLength(4);
    expect(entityGet(lazy.entities, PLAYER_ID)).toBe(anchor);
    expect(lazy.workState!.invocations[episode]).toBe(initial.workState!.invocations[episode]);
    const current = entityGet(lazy.entities, PLAYER_ID)!,
      direct = entityGet(eager.entities, PLAYER_ID)!;
    expect(currentAttributeState(lazy, current, attributeId)).toEqual(
      direct.actor!.attributes![attributeId],
    );
    const counters: DomainCounters = {};
    observeDomainCounters(counters);
    try {
      for (let index = 0; index < 100; index++)
        expect(currentAttributeState(lazy, current, attributeId)).toEqual(
          direct.actor!.attributes![attributeId],
        );
    } finally {
      observeDomainCounters();
    }
    expect(counters.nativeValueReadCacheHits).toBe(100);
    expect(counters.nativeValueOperationsReplayed ?? 0).toBe(0);
    expect(currentStatusInstance(lazy, current, statusId)).toEqual(direct.statusEffects![statusId]);
    expect(currentWorkInvocation(lazy, episode)).toEqual(eager.workState!.invocations[episode]);
    const definition = attributeDefinition(lazy, attributeId)!;
    expect(
      readState(lazy, { entityId: PLAYER_ID, definition: definitionPin(definition) }, 'owner'),
    ).toEqual(
      readState(eager, { entityId: PLAYER_ID, definition: definitionPin(definition) }, 'owner'),
    );
    expect(projectAttributes(lazy, current, 'owner')).toEqual(
      projectAttributes(eager, direct, 'owner'),
    );
    expect(readAttribute(lazy, current, definition)).toBe(
      direct.actor!.attributes![attributeId]!.value,
    );
    const saved = materializeNativeValues(lazy);
    expect(saved).toEqual(eager);
    expect(saved.pendingNativeIntegration).toBeUndefined();
    expect(materializeNativeValues(saved)).toBe(saved);
    expect(lazy.pendingNativeIntegration?.segments).toHaveLength(4);
    expect(() => validateWorldModules(lazy)).not.toThrow();
    const restored = JSON.parse(JSON.stringify(saved)) as WorldState;
    expect(step(restored, 0.77, true)).toEqual(step(saved, 0.77, true));
  });

  it('compacts at the finite segment bound without changing ordered arithmetic or older forks', () => {
    const initial = base();
    let lazy = initial,
      eager = initial;
    let older = initial;
    for (let i = 0; i < NATIVE_VALUE_SEGMENTS + 3; i++) {
      const duration = i % 2 ? 0.013 : 0.731;
      lazy = step(lazy, duration, true);
      eager = step(eager, duration, false);
      if (i === 2) older = lazy;
      expect(lazy.pendingNativeIntegration!.segments.length).toBeLessThanOrEqual(
        NATIVE_VALUE_SEGMENTS,
      );
    }
    expect(lazy.pendingNativeIntegration!.segments).toHaveLength(3);
    expect(materializeNativeValues(lazy)).toEqual(eager);
    const once = materializeNativeValues(older);
    const first = step(older, 0.31, true),
      second = step(older, 1.11, true);
    expect(materializeNativeValues(older)).toEqual(once);
    expect(materializeNativeValues(first)).toEqual(step(once, 0.31, false));
    expect(materializeNativeValues(second)).toEqual(step(once, 1.11, false));
  });

  it('materializes once before ordinary command drafts, attribute writes and cancellation', () => {
    const initial = base(),
      lazy = step(step(initial, 0.17, true), 1.37, true);
    const eager = materializeNativeValues(lazy);
    const command = draftWorld(lazy),
      commandEntity = entityGet(command.entities, PLAYER_ID)!;
    expect(command.pendingNativeIntegration).toBeUndefined();
    expect(commandEntity.actor!.attributes![attributeId]).toEqual(
      entityGet(eager.entities, PLAYER_ID)!.actor!.attributes![attributeId],
    );
    const same = draftWorld(lazy, { retainNativeValues: true });
    const direct = draftWorld(eager),
      sameEntity = entityGet(same.entities, PLAYER_ID)!;
    const definition = attributeDefinition(same, attributeId)!;
    const value = Number(currentAttributeState(same, sameEntity, attributeId)!.value) + 5;
    const leftEvents: WorldEvent[] = [],
      rightEvents: WorldEvent[] = [];
    setAttribute(same, sameEntity, definition, value, leftEvents);
    setAttribute(direct, entityGet(direct.entities, PLAYER_ID)!, definition, value, rightEvents);
    expect(leftEvents).toEqual(rightEvents);
    expect(finishWorld(same)).toEqual(finishWorld(direct));
    const canceled = draftWorld(lazy, { retainNativeValues: true });
    const reference = draftWorld(eager);
    const status = canceled.statusEffectPolicy.definitions.find((d) => d.id === statusId)!;
    deactivateStatusEffect(
      canceled,
      entityGet(canceled.entities, PLAYER_ID)!,
      status,
      [],
      'interrupted',
    );
    deactivateStatusEffect(
      reference,
      entityGet(reference.entities, PLAYER_ID)!,
      status,
      [],
      'interrupted',
    );
    expect(canceled.pendingNativeIntegration).toBeUndefined();
    expect(finishWorld(canceled)).toEqual(finishWorld(reference));
  });

  it('uses eager threshold transitions and keeps their exact history at the original endpoint', () => {
    const initial = base(40.003);
    const leftEvents: WorldEvent[] = [],
      rightEvents: WorldEvent[] = [];
    const lazy = step(initial, 2, true, leftEvents),
      eager = step(initial, 2, false, rightEvents);
    expect(lazy.pendingNativeIntegration).toBeUndefined();
    expect(leftEvents.length).toBeGreaterThan(0);
    expect(leftEvents).toEqual(rightEvents);
    expect(lazy).toEqual(eager);
  });
});
