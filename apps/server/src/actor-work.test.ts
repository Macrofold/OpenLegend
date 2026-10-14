import { describe, expect, it } from 'vitest';
import { createWorld, freezeWorld, NPC_ID } from '@open-legend/domain';
import { ActorWork } from './actor-work.js';

describe('character work waits for its captured evidence to be saved', () => {
  it('does not move the required save forward on unchanged polls or unrelated progress', () => {
    const world = freezeWorld(createWorld(73));
    let required = 2,
      saved = 1;
    const work = new ActorWork('fixture', () => 100, {
      capture: () => required,
      current: (ticket) => ticket <= saved,
    });
    work.refresh(world, () => [1], 'timeline', [NPC_ID]);
    expect(work.ready(100, 0)).toEqual([]);
    required = 3;
    work.refresh(world, () => [1], 'timeline', [NPC_ID]);
    saved = 2;
    expect(work.ready(100, 0)).toEqual([NPC_ID]);
    expect(work.ready(100, 0)).toEqual([NPC_ID]); // Repeated readiness checks do not acknowledge work.
    expect(work.inspected(NPC_ID, Infinity, work.capture(world, NPC_ID), world, 'timeline')).toBe(
      true,
    );
    expect(work.ready(100, 0)).toEqual([]);
  });

  it('does not acknowledge a newer wake with an older completion', () => {
    const world = freezeWorld(createWorld(73));
    let required = 1,
      saved = 1;
    const work = new ActorWork('fixture', () => 100, {
      capture: () => required,
      current: (ticket) => ticket <= saved,
    });
    work.refresh(world, () => [1], 'timeline', [NPC_ID]);
    const earlier = work.capture(world, NPC_ID);
    required = 2;
    work.wake(NPC_ID, { reason: 'evidence', urgency: 8 });
    expect(work.inspected(NPC_ID, Infinity, earlier, world, 'timeline')).toBe(false);
    expect(work.ready(100, 0)).toEqual([]);
    saved = 2;
    expect(work.ready(100, 0)).toEqual([NPC_ID]);
  });

  it('reconstructs readiness on a new timeline and rejects the abandoned capture', () => {
    const world = freezeWorld(createWorld(73));
    let required = 2,
      saved = 1;
    const work = new ActorWork('fixture', () => 100, {
      capture: () => required,
      current: (ticket) => ticket <= saved,
    });
    work.refresh(world, () => [1], 'old', [NPC_ID]);
    const earlier = work.capture(world, NPC_ID);
    required = saved = 3;
    work.refresh(world, () => [1], 'restored', [NPC_ID]);
    expect(work.inspected(NPC_ID, Infinity, earlier, world, 'restored')).toBe(false);
    expect(work.ready(100, 0)).toEqual([NPC_ID]);
  });
});
