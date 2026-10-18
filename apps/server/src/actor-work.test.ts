import { describe, expect, it } from 'vitest';
import { createWorld, freezeWorld, NPC_ID, PLAYER_ID } from '@open-legend/domain';
import { ActorWork } from './actor-work.js';
import {
  installedThinkingToken,
  personalThoughtChanges,
  ThoughtIntakeInputs,
} from './interests.js';
import { entityGet } from '@open-legend/domain';
import { draftWorld, finishWorld } from '../../../packages/domain/src/draft.js';

describe('character work waits for its captured evidence to be saved', () => {
  it('narrows personal publications without retiring or creating unrelated character work', () => {
    const world = freezeWorld(createWorld(73));
    const draft = draftWorld(world);
    draft.innerWorlds![NPC_ID]!.revision++;
    draft.memories[PLAYER_ID] = [...draft.memories[PLAYER_ID]!];
    draft.memories['not-a-thinking-person'] = [];
    const changed = freezeWorld(finishWorld(draft));
    expect(personalThoughtChanges(world, changed)).toEqual(new Set([NPC_ID, PLAYER_ID]));
    expect(personalThoughtChanges(changed, changed)).toEqual(new Set());
    const work = new ActorWork('fixture', () => 100);
    const reads: string[] = [];
    work.refresh(world, (id, snapshot) => {
      reads.push(id);
      return [snapshot.innerWorlds?.[id], snapshot.memories[id]];
    });
    reads.length = 0;
    work.refreshAffected(changed, personalThoughtChanges(world, changed)!);
    expect(new Set(reads)).toEqual(new Set([NPC_ID, PLAYER_ID]));
    expect(work.generation('not-a-thinking-person')).toBeUndefined();
  });

  it('tracks accepted minds and private history owners, but fully refreshes changed populations', () => {
    const world = freezeWorld(createWorld(73));
    const draft = draftWorld(world);
    draft.minds![NPC_ID]!.revision++;
    draft.experience!.summaries[PLAYER_ID] = [];
    draft.experience!.corrections = { [NPC_ID]: { corrected: 'Current wording' } };
    const changed = freezeWorld(finishWorld(draft));
    expect(personalThoughtChanges(world, changed)).toEqual(new Set([NPC_ID, PLAYER_ID]));
    const removed = draftWorld(changed);
    delete removed.minds![NPC_ID];
    expect(personalThoughtChanges(changed, freezeWorld(finishWorld(removed)))).toBeUndefined();
    const added = draftWorld(changed);
    added.minds!.another = added.minds![NPC_ID]!;
    expect(personalThoughtChanges(changed, freezeWorld(finishWorld(added)))).toBeUndefined();
  });

  it('keeps unknown, mutable, physical and clock changes on complete reconciliation', () => {
    const world = freezeWorld(createWorld(73));
    for (const changed of [
      freezeWorld({ ...world, simTime: world.simTime + 1 }),
      freezeWorld({ ...world, cognitionPolicy: { ...world.cognitionPolicy } }),
      freezeWorld({ ...world, entities: { ...world.entities } }),
      freezeWorld({ ...world, map: { ...world.map } }),
      freezeWorld(Object.assign({ ...world }, { futureThoughtInput: 1 })),
      freezeWorld({
        ...world,
        experience: Object.assign({ ...world.experience! }, { futureHistoryInput: 1 }),
      }),
      { ...world },
      Object.freeze({ ...world, memories: { ...world.memories } }),
    ])
      expect(personalThoughtChanges(world, changed)).toBeUndefined();
  });

  it('refreshes edited sight geometry and reads current resource kinds without another sight query', () => {
    const world = freezeWorld(createWorld(73));
    const intake = new ThoughtIntakeInputs();
    intake.reset('fixture');
    const before = intake.read(world, NPC_ID);
    expect(intake.visible(NPC_ID)).toContain('reeds');
    const queries = intake.visibilityQueries;
    const edit = draftWorld(world);
    entityGet(edit.entities, 'reeds')!.resource!.definitionId = 'wood';
    const changed = freezeWorld(finishWorld(edit));
    const after = intake.read(changed, NPC_ID);
    expect(after.values[12]).not.toBe(before.values[12]);
    expect(intake.visibilityQueries).toBe(queries);
    const geometry = draftWorld(changed);
    geometry.map.spatial.revision++;
    intake.read(freezeWorld(finishWorld(geometry)), NPC_ID);
    expect(intake.visibilityQueries).toBe(queries + 1);
  });
  it('does not cache mutable installed pins merely because their outer manifest is frozen', () => {
    const world = createWorld(73);
    const manifest = structuredClone(world.moduleManifest);
    const changed = { ...world, moduleManifest: Object.freeze(manifest) };
    const before = installedThinkingToken(changed);
    manifest.pins[0]!.version++;
    expect(installedThinkingToken(changed)).not.toBe(before);
  });
  it('preserves unrelated tickets during subset refresh and replaces wall deadlines exactly', () => {
    const world = freezeWorld(createWorld(73));
    let now = 100,
      value = 1;
    const work = new ActorWork('fixture', () => now);
    work.refresh(world, (id) => [id === NPC_ID ? value : 1], 'timeline', [NPC_ID, PLAYER_ID]);
    value++;
    work.refreshAffected(world, [NPC_ID]);
    expect(work.ready(now, 0)).toEqual([NPC_ID, PLAYER_ID]);
    work.defer(NPC_ID, 1000);
    work.defer(NPC_ID, 2000);
    now = 1000;
    expect(work.ready(now, 0)).toEqual([PLAYER_ID]);
    now = 2000;
    expect(work.ready(now, 0)).toEqual([NPC_ID, PLAYER_ID]);
  });

  it('starts an overdue review age only when eligibility and durability permit it', () => {
    const world = freezeWorld(createWorld(73));
    let now = 100,
      durable = true;
    const work = new ActorWork('fixture', () => now, { capture: () => 1, current: () => durable });
    work.refresh(world, () => [1], 'timeline', [NPC_ID, PLAYER_ID]);
    expect(work.inspected(NPC_ID, 10, work.capture(world, NPC_ID), world, 'timeline')).toBe(true);
    now = 20_000;
    expect(work.ready(now, 20, (id) => id !== NPC_ID)).toEqual([PLAYER_ID]);
    expect(work.pending(NPC_ID)?.since).toBeUndefined();
    durable = false;
    expect(work.ready(now, 20)).toEqual([]);
    expect(work.pending(NPC_ID)?.since).toBeUndefined();
    durable = true;
    now++;
    expect(work.ready(now, 20)).toEqual([PLAYER_ID, NPC_ID]);
    expect(work.pending(NPC_ID)?.since).toBe(now);
    expect(work.pending(NPC_ID)?.reasons).toContain('reminder');
  });

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
