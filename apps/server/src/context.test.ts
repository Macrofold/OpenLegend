import { entityGet } from '@open-legend/domain';
import { testRepository } from '../../../tests/fixtures/database.js';
import { editWorld, enterLocalWorld } from '../../../tests/fixtures/service.js';
import { NPC_ID } from '@open-legend/domain';
import { afterEach, describe, expect, it } from 'vitest';
import {
  advanceWorld,
  executeCommand,
  inventoryFor,
  navigationBlocked,
  quantityOf,
  createItemLot,
  installNativeResponseProfile,
  nativeResponseProfile,
  setAttentionFocus,
  initializePerception,
  currentBodyObservation,
  currentBodyAssociation,
  currentBodyLocalSubject,
  currentBodySubject,
  currentBodySubjects,
  createWorld,
  PLAYER_ID,
  setSpatialPosition,
  worldSupport,
  editKnowledge,
  assignSubjectName,
  observerIndividual,
  observerGivenName,
  sameSubject,
  type DeclarationDraft,
} from '@open-legend/domain';
import { subjectKnowledgeCandidates } from './knowledge-context.js';
import { responseReferences } from './response-context.js';
import { entityHandle } from './entity-references.js';
import { continuitySubjects } from './continuity-view.js';
import { readConfig } from '../../../tests/fixtures/database.js';
import {
  buildContext,
  CONTEXT_BYTE_LIMIT,
  ContextBudgetError,
  npcCandidates,
  type CandidateAction,
} from './context.js';
import { SqlGameRepository } from './store.js';
import { WorldService } from './world-service.js';
import { domainCommand } from './cognition.js';

const stores: SqlGameRepository[] = [];
async function setup(): Promise<WorldService> {
  const store = await testRepository();
  stores.push(store);
  const service = new WorldService(
    store,
    readConfig({ WORLD_SEED: '73' }),
    () => 1_800_000_000_000,
  );
  await enterLocalWorld(service);
  await service.setPresence('test', true);
  return service;
}
function select(
  service: WorldService,
  type: string,
  predicate: (candidate: CandidateAction) => boolean = () => true,
): CandidateAction {
  const candidate = npcCandidates(service).find(
    (action) => action.command?.type === type && predicate(action),
  );
  expect(candidate, `Expected feasible ${type} candidate`).toBeDefined();
  return candidate!;
}
async function perform(service: WorldService, candidate: CandidateAction): Promise<void> {
  // These are the NPC's own candidates, so use its native command binder rather
  // than the human command endpoint that requires a lethal-attack confirmation.
  const result = await service.transition((world) =>
    executeCommand(
      world,
      domainCommand(candidate.command!, NPC_ID, `test:${world.sequence}:${candidate.id}`),
    ),
  );
  expect(result.ok, result.message).toBe(true);
}
afterEach(async () => {
  for (const store of stores.splice(0)) await store.close();
});

describe('bounded actor context', () => {
  it('reconnects recognized returning people to their notes while preserving local labels and conflicting notes', async () => {
    const service = await setup();
    let world = createWorld(167, undefined, {
      worldId: service.world.id,
      playerId: PLAYER_ID,
      residentId: NPC_ID,
    });
    world.observerIdentities![PLAYER_ID] = {};
    for (const [id, x] of [
      [PLAYER_ID, 1],
      [NPC_ID, 3],
    ] as const) {
      const entity = entityGet(world.entities, id)!;
      setSpatialPosition(world, entity, { x, y: 0, z: 2 }, worldSupport(entity));
    }
    initializePerception(world, []);
    const say = (id: string, at: number, introduction?: string) => {
      world = structuredClone(world);
      world.simTime = at;
      const result = executeCommand(world, {
        id,
        actorId: NPC_ID,
        type: 'say',
        targetId: PLAYER_ID,
        text: introduction ? `My name is ${introduction}.` : 'I am still nearby.',
        ...(introduction ? { selfIntroduction: introduction } : {}),
      });
      expect(result.outcome.ok).toBe(true);
      world = result.world;
    };
    say('returning-introduction', 0, 'Tavin');
    const introduced = currentBodySubject(world, PLAYER_ID, NPC_ID)!;
    const beforeRepeatedName = structuredClone(observerIndividual(world, PLAYER_ID, introduced)!);
    say('repeated-returning-introduction', 1, 'Tavin');
    expect(observerIndividual(world, PLAYER_ID, introduced)!.revision).toBe(
      beforeRepeatedName.revision,
    );
    expect(observerIndividual(world, PLAYER_ID, introduced)!.nameEvidenceIds).toEqual(
      beforeRepeatedName.nameEvidenceIds,
    );
    say('returning-contact', 120);
    const learned = currentBodySubject(world, PLAYER_ID, NPC_ID)!;
    world = structuredClone(world);
    expect(
      editKnowledge(
        world,
        PLAYER_ID,
        {
          subjectId: learned,
          expectedRevision: 0,
          text: 'Tavin offered to share his food.',
        },
        [learned],
      ).ok,
    ).toBe(true);
    const blocker = {
      id: 'returning-person-occluder',
      bounds: { min: { x: 1.9, y: 0, z: 1 }, max: { x: 2.1, y: 3, z: 3 } },
      movement: false,
      sight: true,
      acousticTransmission: 1,
      material: 'cloth',
    };
    world.map.spatial.blockers.push(blocker);
    world.map.spatial.revision++;
    world.simTime = 240;
    initializePerception(world, []);
    expect(currentBodyObservation(world, PLAYER_ID, NPC_ID)).toBeUndefined();
    world.map.spatial.blockers = world.map.spatial.blockers.filter(
      (entry) => entry.id !== blocker.id,
    );
    world.map.spatial.revision++;
    world.simTime = 360;
    initializePerception(world, []);
    const local = currentBodyLocalSubject(world, PLAYER_ID, NPC_ID)!;
    expect(sameSubject(local, learned)).toBe(false);
    expect(currentBodyAssociation(world, PLAYER_ID, NPC_ID)).toBeUndefined();
    const requiredNotes = () =>
      subjectKnowledgeCandidates(world, PLAYER_ID, new Set([NPC_ID])).filter(
        (entry) => entry.required,
      );
    expect(requiredNotes()).toHaveLength(0);
    say('returning-recognition', 480);
    expect(currentBodyAssociation(world, PLAYER_ID, NPC_ID)).toEqual(learned);
    expect(observerGivenName(world, PLAYER_ID, NPC_ID)).toBe('Tavin');
    expect(currentBodySubject(world, PLAYER_ID, NPC_ID)).toEqual(learned);
    expect(requiredNotes()).toHaveLength(1);
    expect(
      responseReferences(world, PLAYER_ID, [NPC_ID], []).identityReferences[
        entityHandle(world, PLAYER_ID, NPC_ID)
      ],
    ).toEqual(learned);
    world = structuredClone(world);
    expect(
      assignSubjectName(
        world,
        PLAYER_ID,
        {
          subjectId: currentBodySubject(world, PLAYER_ID, NPC_ID)!,
          expectedRevision: observerIndividual(world, PLAYER_ID, learned)!.revision,
          givenName: 'Tav',
        },
        [learned],
      ).ok,
    ).toBe(true);
    expect(observerIndividual(world, PLAYER_ID, learned)!.givenName).toBe('Tav');
    expect(
      editKnowledge(
        world,
        PLAYER_ID,
        {
          subjectId: local,
          expectedRevision: 0,
          text: 'This person seemed wary before speaking.',
        },
        [local],
      ).ok,
    ).toBe(true);
    expect(currentBodySubject(world, PLAYER_ID, NPC_ID)).toEqual(local);
    expect(requiredNotes()).toHaveLength(2);
    expect(
      assignSubjectName(
        world,
        PLAYER_ID,
        {
          subjectId: local,
          expectedRevision: observerIndividual(world, PLAYER_ID, local)!.revision,
          givenName: 'Blue coat',
        },
        [local],
      ).ok,
    ).toBe(true);
    expect(observerGivenName(world, PLAYER_ID, NPC_ID)).toBe('Blue coat');
    expect(observerIndividual(world, PLAYER_ID, learned)!.givenName).toBe('Tav');
    expect(currentBodySubjects(world, PLAYER_ID, NPC_ID)).toEqual([local, learned]);
    expect(requiredNotes()).toHaveLength(2);
    await editWorld(service, (draft) => Object.assign(draft, structuredClone(world)));
    for (const [subject, label, text] of [
      [local, 'Blue coat', 'This person seemed wary before speaking.'],
      [learned, 'Tav', 'Tavin offered to share his food.'],
    ] as const) {
      const selected = continuitySubjects(service, PLAYER_ID, service.localScope, {
        subjectId: subject,
      }).selected;
      expect(selected?.subject.label).toBe(label);
      expect(selected?.subject.status).toBe('in-view');
      expect(selected?.notepad?.text).toBe(text);
    }
  });
  it('preserves complete context and trimming order with exact UTF-8 accounting', async () => {
    const service = await setup();
    const base = buildContext(service, NPC_ID, '');
    const reference = (query: string) => {
      const context = structuredClone(base);
      context.request = query;
      const bytes = () => {
        context.coverage.knownRecipeSupplied = context.knownRecipes.length;
        context.coverage.memorySupplied = context.memories.length;
        context.coverage.recentEventSupplied = context.recentEvents.length;
        context.coverage.nearbySupplied = context.nearby.length;
        return Buffer.byteLength(JSON.stringify(context));
      };
      while (bytes() > CONTEXT_BYTE_LIMIT && context.knownRecipes.length > 8)
        context.knownRecipes.pop();
      while (bytes() > CONTEXT_BYTE_LIMIT && context.recentEvents.length > 4)
        context.recentEvents.shift();
      while (bytes() > CONTEXT_BYTE_LIMIT && context.memories.length > 4) context.memories.pop();
      while (bytes() > CONTEXT_BYTE_LIMIT && context.knownRecipes.length > 1)
        context.knownRecipes.pop();
      while (bytes() > CONTEXT_BYTE_LIMIT && context.nearby.length) context.nearby.pop();
      while (bytes() > CONTEXT_BYTE_LIMIT && context.recentEvents.length > 1)
        context.recentEvents.shift();
      while (bytes() > CONTEXT_BYTE_LIMIT && context.memories.length > 1) context.memories.pop();
      if (bytes() > CONTEXT_BYTE_LIMIT)
        for (const material of context.materials) material.name = '';
      if (bytes() > CONTEXT_BYTE_LIMIT) return undefined;
      return context;
    };
    // Punctuation has no recipe-search terms. Include escaping and multibyte text
    // at exact fit and progressively deeper trim boundaries through the real builder.
    const prefix = '🙂\\\"\n';
    const emptySize = Buffer.byteLength(JSON.stringify(base));
    const prefixBytes = Buffer.byteLength(JSON.stringify(prefix)) - 2;
    for (const extra of [-1, 0, 1, 250, 1000, 5000]) {
      const query =
        prefix + '.'.repeat(Math.max(0, CONTEXT_BYTE_LIMIT - emptySize - prefixBytes + extra));
      const expected = reference(query);
      if (expected) expect(buildContext(service, NPC_ID, query)).toEqual(expected);
      else expect(() => buildContext(service, NPC_ID, query)).toThrow(ContextBudgetError);
    }
  });

  it('fails honestly when mandatory request data cannot fit instead of truncating it', async () => {
    const service = await setup();
    expect(() => buildContext(service, NPC_ID, 'x'.repeat(CONTEXT_BYTE_LIMIT + 1))).toThrow(
      ContextBudgetError,
    );
  });
});

describe('actor-scoped native decision candidates', () => {
  it('executes a learned tool and food loop through scoped feasible candidates', async () => {
    const service = await setup();
    // This case checks a learned tool's command/food consumers, not whether a
    // roaming animal can escape an aiming hunter. Its test-only movement profile
    // remains native but very slow; avoidance has independent gameplay checks.
    await editWorld(service, (world) => {
      const specimen = entityGet(world.entities, 'hare-1')!;
      const original = nativeResponseProfile(world, specimen.animal!.profile)!;
      specimen.animal!.profile = installNativeResponseProfile(world, {
        ...structuredClone(original),
        id: 'fixture:slow-target',
        locomotion: Object.fromEntries(
          Object.keys(original.locomotion).map((kind) => [
            kind,
            { travel: 0.000001, escape: 0.000001 },
          ]),
        ),
      });
      specimen.animal!.wander = { remainingSeconds: 1000000 };
      delete specimen.animal!.episode;
      specimen.actor!.action = null;
      // The loop explicitly supplies its harvesting prerequisite; starter
      // characters are not a permanent fixture equipment contract.
      if (!quantityOf(world, NPC_ID, 'knife'))
        createItemLot(world, NPC_ID, 'knife', 1, 'loop-harvesting-tool');
    });
    const draft: DeclarationDraft = {
      family: { id: 'base:swing', version: 1 },
      name: 'Fixture sling',
      description: 'Test-only learned composition.',
      inputs: [
        { definitionId: 'cord', quantity: 1, role: 'binding' },
        { definitionId: 'prepared_fiber', quantity: 2, role: 'pouch' },
      ],
      output: { name: 'Fixture sling', description: 'Test only.' },
      parameters: { workSeconds: 60, damage: 18, range: 7, accuracy: 0.9 },
    };
    const admitted = await service.admit(draft, {
      actorId: NPC_ID,
      requestId: 'learned-fixture',
      source: 'test-fixture',
      authority: { origin: 'player', policyRevision: 1 },
    });
    expect(admitted.ok, admitted.message).toBe(true);
    expect(admitted.recipeId).toBeDefined();
    const recipe = service.world.recipes[admitted.recipeId!]!;
    await perform(
      service,
      select(service, 'craft', (action) => action.command?.recipeId === recipe.id),
    );
    await service.transition((world) => advanceWorld(world, 60));
    const tool = inventoryFor(service.world, NPC_ID).find(
      (item) => item.definitionId === recipe.outputDefinitionId,
    );
    expect(tool).toBeDefined();
    await perform(
      service,
      select(service, 'equip', (action) => action.command?.itemId === tool!.id),
    );
    // Steadiness0.9 can legitimately miss. Follow the actual native outcome;
    // the fixed-seed fixture has a finite retry envelope, not guaranteed contact.
    for (
      let shot = 0;
      shot < 5 && entityGet(service.world.entities, 'hare-1')!.actor!.alive;
      shot++
    ) {
      await perform(
        service,
        select(
          service,
          'hunt',
          (action) => action.command?.targetId === 'hare-1' && action.command.itemId === tool!.id,
        ),
      );
      const shotStart = service.world.simTime;
      const advancedShot = await service.transition((world) => advanceWorld(world, 18));
      expect(
        service.world.events.some(
          (event) =>
            event.type === 'shot-released' &&
            event.actorId === NPC_ID &&
            event.targetId === 'hare-1',
        ),
        JSON.stringify({
          advancedShot,
          shotStart,
          at: service.world.simTime,
          action: entityGet(service.world.entities, NPC_ID)!.actor!.action,
          events: service.world.events.slice(-8),
        }),
      ).toBe(true);
      // Releasing the shot does not resolve its flight or guarantee an impact.
      expect(entityGet(service.world.entities, 'hare-1')!.actor!.alive).toBe(true);
      const flight = Object.values(service.world.projectiles ?? {}).find(
        (projectile) => projectile.sourceId === NPC_ID && projectile.targetId === 'hare-1',
      );
      expect(flight).toBeDefined();
      const before = service.world.simTime;
      const result = await service.transition((world) =>
        advanceWorld(world, flight!.remainingRange / flight!.speed),
      );
      const evidence = JSON.stringify({
        result,
        before,
        after: service.world.simTime,
        navigationBlocked: navigationBlocked(service.world),
        projectiles: service.world.projectiles,
      });
      expect(result.ok, evidence).toBe(true);
      expect(service.world.simTime, evidence).toBeGreaterThan(before);
    }
    expect(
      entityGet(service.world.entities, 'hare-1')!.actor!.alive,
      JSON.stringify(service.world.events.slice(-10)),
    ).toBe(false);
    await editWorld(service, (world) => {
      initializePerception(world, []);
      const keys = Object.entries(world.perceptionEvidence![NPC_ID]!.attention!.candidates)
        .filter(
          ([, candidate]) =>
            candidate.sourceId === 'hare-1' || entityGet(world.entities, candidate.sourceId)?.heat,
        )
        .map(([key]) => key);
      expect(setAttentionFocus(world, NPC_ID, keys)).toBe(true);
    });
    expect(currentBodyObservation(service.world, NPC_ID, 'hare-1')).toBeDefined();
    await perform(
      service,
      select(service, 'harvest', (action) => action.command?.targetId === 'hare-1'),
    );
    await service.transition((world) => advanceWorld(world, 120));
    expect(quantityOf(service.world, NPC_ID, 'raw_meat')).toBe(2);
    await perform(service, select(service, 'cook'));
    await service.transition((world) => advanceWorld(world, 200));
    const cooked = inventoryFor(service.world, NPC_ID).find(
      (item) => item.definitionId === 'cooked_meat',
    )!;
    await perform(
      service,
      select(service, 'eat', (action) => action.command?.itemId === cooked.id),
    );
    expect(quantityOf(service.world, NPC_ID, 'cooked_meat')).toBe(0);
    expect(
      service.world.events.some(
        (event) =>
          event.type === 'ate' &&
          event.actorId === NPC_ID &&
          event.data?.definitionId === 'cooked_meat',
      ),
    ).toBe(true);
    expect(new Set(npcCandidates(service).map((action) => action.id)).size).toBe(
      npcCandidates(service).length,
    );
    // Spending this method's inputs cannot prohibit unrelated starter recipes.
    expect(
      npcCandidates(service).some(
        (action) => action.command?.type === 'craft' && action.command.recipeId === recipe.id,
      ),
    ).toBe(false);
  });
});
