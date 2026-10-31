import { afterEach, expect, it, vi } from 'vitest';
import {
  NPC_ID,
  PLAYER_ID,
  WorkBudgetError,
  createItemLot,
  entityGet,
  experienceSourceKey,
  experienceSourceReference,
  speechAttribution,
  recognizesSubject,
  type WorkDemand,
} from '@open-legend/domain';
import { readConfig, testRepository } from '../../../tests/fixtures/database.js';
import { editWorld, enterLocalWorld, useNearCampSight } from '../../../tests/fixtures/service.js';
import { stockedCamp } from '../../../tests/fixtures/world.js';
import { bindDecisionAppraisals, captureDecisionAppraisalContext } from './appraisal-context.js';
import { buildConversationContext } from './conversation-context.js';
import { prepareDecision } from './decision-context.js';
import { IntelligenceLog } from './intelligence-log.js';
import { conversationCompactionKey } from './memory-repository.js';
import { RecallService } from './recall.js';
import { WorldService } from './world-service.js';
import { DecisionPreparationWork } from './decision-context-selection.js';
import { CONTEXT_BYTE_LIMIT } from './context.js';
import { entityHandles, experienceEntityReferences } from './entity-references.js';
import { appendMemory } from '../../../packages/domain/src/events.js';
import { experienceForModel, experienceModelBindings } from './perceived-context.js';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0)) await close();
  vi.unstubAllGlobals();
});

async function fixture(initialWorld = stockedCamp()) {
  vi.stubGlobal('fetch', async () => {
    throw new Error('External network blocked.');
  });
  const store = await testRepository(undefined, initialWorld);
  const service = new WorldService(store, readConfig({ AI_BUDGET_USD: '0' }));
  const log = new IntelligenceLog(store);
  const recall = new RecallService(service, log);
  cleanup.push(async () => {
    await recall.close();
    await log.close();
    service.releaseHostWork();
    await store.close();
  });
  await enterLocalWorld(service);
  await service.setConnection('conversation-sharing', true);
  await service.setPresence('conversation-sharing', true);
  await useNearCampSight(service);
  expect((await service.control({ paused: false })).ok).toBe(true);
  let turn = 0;
  return {
    service,
    store,
    async say(text: string) {
      text = text.trim();
      expect((await service.say(`sharing-${turn++}`, PLAYER_ID, text, NPC_ID)).ok).toBe(true);
      return service.world.events.find((event) => event.data?.['text'] === text)!.id;
    },
    prepare(requiredIds: string[] = []) {
      return prepareDecision(
        service,
        recall,
        NPC_ID,
        'conversation-sharing-decision',
        'Consider the personally heard conversation.',
        requiredIds,
        async () => {
          throw new Error('Paid attention is outside this fixture.');
        },
        new AbortController().signal,
        0,
        true,
        0,
        requiredIds[0],
        undefined,
        'native-only',
      );
    },
  };
}

it('preserves literal heard tags and already-bound speakers when native IDs overlap model handles', async () => {
  const h = await fixture();
  const text = `The book literally says (ID:${PLAYER_ID}) and (ID:unlisted-book-entry).`;
  const sourceId = await h.say(text);
  const speaker = entityHandles(h.service.world, NPC_ID).get(PLAYER_ID)!;
  expect(speaker).toMatch(/^[a-f0-9]{4}$/);
  await editWorld(h.service, (world) => {
    createItemLot(world, NPC_ID, 'berries', 1, speaker);
    const agency = entityGet(world.entities, NPC_ID)!.actor!.agency;
    agency.revision++;
    agency.goals.push({
      id: 'fixture-reference-goal',
      revision: 1,
      objective: `Ask the speaker (ID:${PLAYER_ID}) about the book.`,
      status: 'active',
      parentId: null,
      author: 'actor',
      // This is the goal's source identity, not an entity field despite its spelling.
      sourceId: speaker,
      completion: null,
    });
  });
  expect(entityHandles(h.service.world, NPC_ID).get(PLAYER_ID)).toBe(speaker);
  const item = entityHandles(h.service.world, NPC_ID).get(speaker)!;
  expect(item).not.toBe(speaker);
  const prepared = await h.prepare([sourceId]);
  const entry = prepared.sharedExperiences.get(
    experienceSourceKey({ kind: 'awareness', id: sourceId }),
  )!.experience;
  expect.soft(entry.value['sourceId']).toBe(speaker);
  expect.soft(JSON.stringify(entry)).toContain(text);
  const references = (prepared.context['references'] as string[]).map(
    (row) => JSON.parse(row) as { entityId: string; label: string },
  );
  expect
    .soft(references.find((reference) => reference.entityId === speaker)?.label)
    .toContain(`(ID:${speaker})`);
  expect(prepared.entityReferences[speaker]).toBe(PLAYER_ID);
  expect(prepared.entityReferences[item]).toBe(speaker);
  expect(prepared.entityReferences).not.toHaveProperty('unlisted-book-entry');
  expect(prepared.context['agency']).toMatchObject({
    goals: expect.arrayContaining([
      {
        id: 'fixture-reference-goal',
        revision: 1,
        objective: `Ask the speaker (ID:${speaker}) about the book.`,
        status: 'active',
        parentId: null,
        author: 'actor',
        sourceId: speaker,
        completion: null,
      },
    ]),
  });
});

it('keeps a guessed stored goal annotation independent of hidden world membership', async () => {
  const h = await fixture();
  const guessedId = 'unrecognized-goal-subject';
  await editWorld(h.service, (world) => {
    const agency = entityGet(world.entities, NPC_ID)!.actor!.agency;
    agency.revision++;
    agency.goals.push({
      id: 'fixture-unknown-goal',
      revision: 1,
      objective: `Find the subject (ID:${guessedId}).`,
      status: 'active',
      parentId: null,
      author: 'actor',
      sourceId: 'fixture-goal-source',
      completion: null,
    });
  });
  const absent = await h.prepare();
  await editWorld(h.service, (world) => {
    // Another person's uninspected possession is not the observer's knowledge.
    createItemLot(world, PLAYER_ID, 'berries', 1, guessedId);
  });
  const hidden = await h.prepare();
  expect(hidden.entityReferences).not.toHaveProperty(guessedId);
  expect(Object.values(hidden.entityReferences)).not.toContain(guessedId);
  expect(hidden.prompt).toBe(absent.prompt);
  expect(hidden.context['goal']).toBe('Find the subject (unrecognized identity).');
});

it.each([false, true])(
  'keeps evidence reference guards current during attention (recognition changed=%s)',
  async (changed) => {
    const h = await fixture();
    const sourceId = await h.say('We should put the tools away before the rain.');
    await editWorld(h.service, (world) => {
      delete world.observerIdentities?.[NPC_ID]?.[PLAYER_ID];
    });
    expect(recognizesSubject(h.service.world, NPC_ID, PLAYER_ID)).toBe(false);
    const select = RecallService.prototype.select;
    const pending = vi
      .spyOn(RecallService.prototype, 'select')
      .mockImplementationOnce(async function (this: RecallService, ...args) {
        const selected = await select.apply(this, args);
        await editWorld(h.service, (world) => {
          if (changed)
            ((world.observerIdentities ??= {})[NPC_ID] ??= {})[PLAYER_ID] = {
              givenName: 'Rowan',
              revision: 1,
              encounterId: null,
              authored: true,
            };
        });
        return selected;
      });
    try {
      if (changed) {
        await expect(h.prepare([sourceId])).rejects.toThrow(
          'A personal evidence reference changed',
        );
        return;
      }
      const prepared = await h.prepare([sourceId]);
      const entry = prepared.sharedExperiences.get(
        experienceSourceKey({ kind: 'awareness', id: sourceId }),
      )!.experience;
      expect(prepared.entityReferences[String(entry.value['sourceId'])]).toBe(PLAYER_ID);
    } finally {
      pending.mockRestore();
    }
  },
);

it('reuses exact recent conversation causes while retaining changed projections and revisions', async () => {
  const h = await fixture();
  const earlier = await h.say('I heard a different account of the missing bag.');
  const latest = await h.say('What do you make of that account?');
  const prepared = await h.prepare([latest]);
  const key = experienceSourceKey({ kind: 'awareness', id: earlier });
  const shared = prepared.sharedExperiences.get(key)!;
  expect(shared).toBeDefined();
  expect(shared.experience).toEqual((prepared.context['experience'] as unknown[])[shared.index]);
  const triggering = prepared.sharedExperiences.get(
    experienceSourceKey({ kind: 'awareness', id: latest }),
  )!;
  expect(prepared.context['triggerFacts']).toMatchObject({
    experience: `character.experience[${triggering.index}]`,
  });
  expect(prepared.context['conversation']).toContain(`character.experience[${shared.index}]`);
  expect(
    (prepared.context['conversation'] as string[]).every((line) =>
      /^character\.experience\[\d+\]$/.test(line),
    ),
  ).toBe(true);
  expect(prepared.context['stimulus']).not.toContain('What do you make of that account?');
  const unitKeys = new Set(prepared.manifest.units.map((unit) => unit.key));
  for (const key of prepared.manifest.requiredRoots) expect(unitKeys.has(key)).toBe(true);
  for (const unit of prepared.manifest.units) {
    if (unit.requiredReasons.length) expect(prepared.manifest.requiredRoots).toContain(unit.key);
    for (const dependency of unit.dependencies) expect(unitKeys.has(dependency)).toBe(true);
  }
  for (const key of prepared.manifest.sourceKeys)
    expect(prepared.manifest.units.some((unit) => unit.source.id === key)).toBe(true);

  const bind = (sharedExperiences = prepared.sharedExperiences) =>
    bindDecisionAppraisals(
      h.service,
      NPC_ID,
      'conversation-sharing-appraisal',
      [earlier],
      prepared.entityReferences,
      latest,
      { sharedExperiences },
    );
  const capturedAppraisal = captureDecisionAppraisalContext(h.service.world, NPC_ID);
  const measuredAppraisal = capturedAppraisal.project({
    evidenceIds: [earlier],
    sharedExperiences: prepared.sharedExperiences,
    entityReferences: prepared.entityReferences,
    triggerEvidenceId: latest,
  });
  expect((await bind()).context).toEqual(measuredAppraisal);
  const laterClock = structuredClone(h.service.world);
  laterClock.simTime += 60;
  expect(capturedAppraisal.current(laterClock)).toBe(true);
  const cause = (bound: Awaited<ReturnType<typeof bind>>) =>
    bound.context.sources.find(
      (source) => bound.sources.get(source.handle)?.occurrenceId === earlier,
    )!;
  const bound = await bind();
  expect(cause(bound).experience).toEqual({ reference: `character.experience[${shared.index}]` });
  expect(await bound.current()).toBe(true);
  const defaultContext = structuredClone(bound.context);
  const nativeSources = structuredClone([...bound.sources]);
  const projectedCause = (context: typeof bound.context) =>
    context.sources.find((source) => source.handle === cause(bound).handle)!;
  const supplied = bound.projectContext(prepared.sharedExperiences, 'decisionContext.experience');
  expect(projectedCause(supplied).experience).toEqual({
    reference: `decisionContext.experience[${shared.index}]`,
  });
  expect(supplied.sourceReferences).toContain('decisionContext.experience[index]');
  expect(supplied.sources.map((source) => source.handle)).toEqual(
    bound.context.sources.map((source) => source.handle),
  );
  expect(bound.projectContext(prepared.sharedExperiences)).toEqual(defaultContext);
  expect(bound.context).toEqual(defaultContext);
  expect([...bound.sources]).toEqual(nativeSources);

  const changedProjection = new Map(prepared.sharedExperiences);
  const changed = structuredClone(shared);
  changed.experience.value['summary'] = 'A different observer projection.';
  changedProjection.set(key, changed);
  const changedBound = await bind(changedProjection);
  expect(cause(changedBound).experience).toHaveProperty('value');
  expect(
    projectedCause(bound.projectContext(changedProjection, 'decisionContext.experience'))
      .experience,
  ).toEqual(cause(changedBound).experience);

  const changedRevision = new Map(prepared.sharedExperiences);
  changedRevision.set(key, { ...shared, revision: 'different-source-revision' });
  const revisedBound = await bind(changedRevision);
  expect(cause(revisedBound).experience).toHaveProperty('value');
  expect(
    projectedCause(bound.projectContext(changedRevision, 'decisionContext.experience')).experience,
  ).toEqual(cause(revisedBound).experience);
  expect([...bound.sources]).toEqual(nativeSources);
});

it('measures mixed appraisal sources with exact namespaces, ordering and the native source cap', async () => {
  const h = await fixture();
  const trigger = await h.say('What did we learn from the storm?');
  const ids: string[] = [];
  await editWorld(h.service, (world) => {
    for (let i = 0; i < 50; i++) {
      const id = appendMemory(world, NPC_ID, {
        kind: 'episode',
        source: 'observed',
        summary: `I checked shelter beam ${i}.`,
        entityIds: [NPC_ID],
        importance: 7,
      })!;
      const memory = world.memories[NPC_ID]!.find((entry) => entry.id === id)!;
      // Equal IDs in distinct native source namespaces remain distinct records.
      if (i === 0) memory.id = trigger;
      ids.push(memory.id);
    }
    const memory = world.memories[NPC_ID]!.find((entry) => entry.id === ids[1])!;
    const entry = { source: 'memory' as const, value: memory };
    (world.experience!.summaries[NPC_ID] ??= []).push({
      id: 'appraisal-summary',
      text: 'I checked the shelter beams.',
      from: memory.at,
      to: memory.at,
      sources: [experienceSourceReference(entry)],
      attribution: speechAttribution([entry], NPC_ID),
      entityIds: [NPC_ID],
      importance: 7,
    });
    ids.unshift('appraisal-summary');
  });
  await h.service.flushMemorySources(NPC_ID);
  const head = (await h.store.records.head())!;
  const requested = [...new Set([trigger, ...ids])].slice(0, 48);
  const sources = await h.store.memories.appraisalSources(
    { worldId: h.service.world.id, actorId: NPC_ID, generation: head.generation },
    requested,
  );
  const shared = new Map(
    sources.map((source, index) => [
      experienceSourceKey({ kind: source.sourceKind, id: source.memory.id }),
      {
        index,
        revision: source.revision,
        experience: experienceForModel(
          source.entry,
          experienceModelBindings(h.service.world, NPC_ID, source.entry, `source-${index}`),
        ),
      },
    ]),
  );
  const references = Object.fromEntries(
    [...experienceEntityReferences(h.service.world, NPC_ID, [NPC_ID, PLAYER_ID])].map(
      ([id, handle]) => [handle, id],
    ),
  );
  const snapshot = captureDecisionAppraisalContext(h.service.world, NPC_ID);
  const predicted = snapshot.project({
    evidenceIds: ids,
    sharedExperiences: shared,
    entityReferences: references,
    triggerEvidenceId: trigger,
  });
  const bound = await bindDecisionAppraisals(
    h.service,
    NPC_ID,
    'mixed-appraisals',
    ids,
    references,
    trigger,
    { sharedExperiences: shared, contextSnapshot: snapshot },
  );
  expect(bound.context).toEqual(predicted);
  expect(new Set([...bound.sources.values()].map((source) => source.sourceKind))).toEqual(
    new Set(['awareness', 'memory', 'summary']),
  );
  expect([...bound.sources.values()].filter((source) => source.sourceId === trigger)).toHaveLength(
    2,
  );
  expect([...bound.sources.values()].some((source) => source.sourceId === ids.at(-1))).toBe(false);
  expect(await bound.current()).toBe(true);
});

it('accounts for a summary prefix without treating its covered sources as original records', async () => {
  const h = await fixture();
  for (let turn = 0; turn < 20; turn++)
    await h.say(`Personally heard turn ${turn}: ${'The account remains uncertain. '.repeat(8)}`);
  let compactions = 0;
  const conversation = await buildConversationContext({
    service: h.service,
    actorId: NPC_ID,
    requiredIds: [],
    includeConversation: true,
    maxBytes: 16_000,
    signal: new AbortController().signal,
    attempt: 0,
    generate: async () => {
      compactions++;
      return { summary: 'The speaker offered uncertain accounts during the earlier conversation.' };
    },
  });
  expect(compactions).toBeGreaterThan(0);
  expect(conversation.diagnostics.mode).toBe('compacted');
  expect(conversation.experience[0]!.source).toBe('summary');
  expect(conversation.sharedExperiences.size).toBeGreaterThan(0);
  for (const shared of conversation.sharedExperiences.values()) {
    expect(shared.index).toBeGreaterThan(0);
    expect(conversation.experience[shared.index]).toEqual(shared.experience);
    expect(shared.experience.source).toBe('awareness');
  }
  const cached = (await h.store.getIntegration(
    conversationCompactionKey(h.service.world.id, NPC_ID),
  )) as { value: { sources: Array<{ kind: 'awareness'; id: string; revision: string }> } };
  expect(cached.value.sources.length).toBeGreaterThan(0);
  for (const source of cached.value.sources)
    expect(conversation.sharedExperiences.has(experienceSourceKey(source))).toBe(false);

  const prepared = await h.prepare();
  const exact = [...conversation.sharedExperiences].find(([key]) =>
    prepared.sharedExperiences.has(key),
  )!;
  const combined = prepared.sharedExperiences.get(exact[0])!;
  // An index belongs to the final selected array, not the temporary conversation
  // projection. No ordering assumption may alias a summary to its source turns.
  expect(combined.experience.source).toBe('awareness');
  expect((prepared.context['experience'] as unknown[])[combined.index]).toEqual(
    combined.experience,
  );
  const rawId = conversation.evidenceIds.find(
    (id) => experienceSourceKey({ kind: 'awareness', id }) === exact[0],
  )!;
  const exactCause = await bindDecisionAppraisals(
    h.service,
    NPC_ID,
    'conversation-exact-suffix-appraisal',
    [rawId],
    prepared.entityReferences,
    undefined,
    { sharedExperiences: prepared.sharedExperiences },
  );
  expect(exactCause.context.sources[0]!.experience).toEqual({
    reference: `character.experience[${combined.index}]`,
  });
  const covered = cached.value.sources[0]!;
  const bound = await bindDecisionAppraisals(
    h.service,
    NPC_ID,
    'conversation-summary-appraisal',
    [covered.id],
    prepared.entityReferences,
    undefined,
    { sharedExperiences: conversation.sharedExperiences },
  );
  expect(bound.context.sources[0]!.experience).toHaveProperty('value');
  await expect(conversation.validate()).resolves.toBeUndefined();
});

it('retains paused stock and a truthful required manifest when optional finalization cannot be reserved', async () => {
  const world = stockedCamp();
  for (let index = 0; index < 40; index++)
    createItemLot(world, NPC_ID, 'wood', 1, `optional-stock-${String(index).padStart(2, '0')}`);
  const food = Object.values(world.itemDefinitions).find(
    (definition) => (definition.nutrition ?? 0) > 0,
  )!;
  const paused = createItemLot(world, NPC_ID, food.id, 1, 'zz-paused-required-stock');
  entityGet(world.entities, NPC_ID)!.actor!.agency.suspended = {
    id: 'required-stock-plan',
    revision: 1,
    goalId: null,
    status: 'active',
    steps: [
      {
        id: 'required-stock-step',
        status: 'queued',
        command: { id: 'required-stock-step', actorId: NPC_ID, type: 'eat', itemId: paused },
      },
    ],
  };
  const h = await fixture(world);
  expect((await h.service.control({ paused: true })).ok).toBe(true);
  const reserve = DecisionPreparationWork.prototype.reserveCompletion;
  let baselineBytes: number | undefined;
  let refusedOptional = false;
  vi.spyOn(DecisionPreparationWork.prototype, 'reserveCompletion').mockImplementation(function (
    this: DecisionPreparationWork,
    demand: WorkDemand,
  ) {
    if (
      baselineBytes !== undefined &&
      Number(demand.outputBytes) > baselineBytes &&
      !refusedOptional
    ) {
      refusedOptional = true;
      throw new WorkBudgetError('work-unavailable', 'outputBytes');
    }
    reserve.call(this, demand);
    if (demand.outputBytes !== undefined && demand.outputBytes !== CONTEXT_BYTE_LIMIT)
      baselineBytes = demand.outputBytes;
  });
  const prepared = await h.prepare();
  expect(refusedOptional).toBe(true);
  expect(Object.values(prepared.entityReferences)).toContain(paused);
  expect(
    prepared.manifest.units.some(
      (unit) => unit.source.id === `candidate:item:${paused}` && unit.requiredReasons.length > 0,
    ),
  ).toBe(true);
  expect(
    prepared.manifest.units
      .filter((unit) => unit.source.id.startsWith('candidate:'))
      .every((unit) => unit.requiredReasons.length > 0),
  ).toBe(true);
  expect(prepared.diagnostics.preparation.optionalCoverage).toBe('unavailable');
  const keys = new Set(prepared.manifest.units.map((unit) => unit.key));
  for (const key of prepared.manifest.requiredRoots) expect(keys.has(key)).toBe(true);
  for (const unit of prepared.manifest.units)
    for (const dependency of unit.dependencies) expect(keys.has(dependency)).toBe(true);
});
