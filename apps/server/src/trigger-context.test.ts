import { testRepository } from '../../../tests/fixtures/database.js';
import { editWorld, enterLocalWorld } from '../../../tests/fixtures/service.js';
import { expect, it, vi } from 'vitest';
import { readConfig } from '../../../tests/fixtures/database.js';
import { WorldService } from './world-service.js';
import { IntelligenceLog } from './intelligence-log.js';
import { RecallService } from './recall.js';
import { prepareDecision, selectDecisionActions } from './decision-context.js';
import { responseTrigger } from './response-context.js';
import { appendMemory } from '../../../packages/domain/src/events.js';

it('keeps coalesced evidence in context without adding it to the literal trigger', async () => {
  // Local world and failing relevance fixture: no provider or network requests.
  const store = await testRepository();
  const service = new WorldService(store, readConfig({}));
  await enterLocalWorld(service);
  const log = new IntelligenceLog(store);
  const recall = new RecallService(service, log);
  try {
    await service.setConnection('trigger-fixture', true);
    await service.setPresence('trigger-fixture', true);
    await service.control({ paused: false });
    const actor = service.defaultResidentEntityId;
    const player = service.controlledEntityId;
    await service.say('earlier', player, 'Earlier background evidence.', actor);
    await service.say('latest', player, 'The immediate cause.', actor);
    const earlier = service.world.events.find(
      (event) => event.data?.['text'] === 'Earlier background evidence.',
    )!;
    const latest = service.world.events.find(
      (event) => event.data?.['text'] === 'The immediate cause.',
    )!;
    const stimulus = responseTrigger(service, actor, latest.id, 'State changed.');
    expect(stimulus).toContain('The immediate cause.');
    expect(stimulus).not.toContain('Earlier background evidence.');
    const decision = await prepareDecision(
      service,
      recall,
      actor,
      'fixture-decision',
      stimulus,
      [latest.id, earlier.id],
      async () => {
        throw new Error('Fixture relevance unavailable');
      },
      new AbortController().signal,
    );
    expect(decision.context['stimulus']).toBe(stimulus);
    const actions = await selectDecisionActions(decision, async (request) => {
      // Selection keeps evidence but omits generative instructions and duplicate offers.
      const { knowledgeInstructions, navigation, planOffers, ...evidenceContext } =
        decision.context;
      expect(request.state).toHaveProperty('decisionContext', evidenceContext);
      expect(JSON.stringify(request.state)).not.toContain('Return {"operations":[]}');
      return {
        answers: Object.fromEntries(
          Object.keys(request.questions).map((id) => [id, { type: 'noul' as const, noul: 0.9 }]),
        ),
      };
    });
    expect(actions.offered.length).toBeGreaterThan(0);
    const evidence = JSON.stringify({
      recall: decision.context['recall'],
      conversation: decision.context['conversation'],
    });
    expect(evidence).toContain('Earlier background evidence.');
    expect(responseTrigger(service, actor, undefined, 'My goal changed.')).toBe(
      'Situation change: My goal changed.',
    );
  } finally {
    await recall.close();
    await log.close();
    await store.close();
  }
});

it('restores the caller’s query planner setting after lexical success and SQL failure', async () => {
  const store = await testRepository();
  const service = new WorldService(store, readConfig({}));
  await enterLocalWorld(service);
  try {
    const head = (await store.records.head())!;
    const scope = {
      worldId: service.world.id,
      actorId: service.defaultResidentEntityId,
      generation: head.generation,
    };
    const setting = () =>
      store.db.prepare("SELECT current_setting('enable_nestloop') AS value").get();
    const previous = await setting();
    await store.memories.select(scope, 10, { text: 'camp' });
    expect(await setting()).toEqual(previous);
    // Observe restoration before the outer transaction ends: COMMIT alone
    // would conceal a leaked LOCAL setting from subsequent reads in that turn.
    await store.db.readTransaction!(async () => {
      for (const value of ['on', 'off']) {
        await store.db.prepare("SELECT set_config('enable_nestloop',?,true)").get(value);
        await store.memories.select(scope, 10, { text: 'camp' });
        expect((await setting())?.['value']).toBe(value);
      }
    });
    const prepare = store.db.prepare.bind(store.db);
    const spy = vi.spyOn(store.db, 'prepare').mockImplementation((sql) => {
      const statement = prepare(sql);
      if (!sql.includes('ts_rank(')) return statement;
      return {
        ...statement,
        all: async (...args) => {
          await statement.all(...args);
          // An actual PostgreSQL error aborts the read snapshot. Restoration
          // must retain the original error; rollback resets LOCAL settings.
          return prepare('SELECT 1 / 0').all();
        },
      };
    });
    try {
      await expect(store.memories.select(scope, 10, { text: 'camp' })).rejects.toThrow('22012');
    } finally {
      spy.mockRestore();
    }
    expect(await setting()).toEqual(previous);
    await store.memories.select(scope, 10, { text: 'camp' });
  } finally {
    service.releaseHostWork();
    await store.close();
  }
});

it('finds an old native speech cue before the context cutoff without crossing memory permissions', async () => {
  const store = await testRepository();
  const service = new WorldService(store, readConfig({ OPEN_LEGEND_GOD_MODE: 'true' }));
  await enterLocalWorld(service);
  const log = new IntelligenceLog(store);
  const recall = new RecallService(service, log);
  try {
    await service.setConnection('old-cue-fixture', true);
    await service.setPresence('old-cue-fixture', true);
    await service.control({ paused: false });
    const actor = service.defaultResidentEntityId;
    const player = service.controlledEntityId;
    const old = await editWorld(service, (world) => {
      world.simTime = 366 * 86400;
      const add = (owner: string, summary: string, at: number) => {
        const id = appendMemory(world, owner, {
          kind: 'episode',
          source: 'observed',
          summary,
          entityIds: [],
          importance: 9,
        })!;
        world.memories[owner]!.find((memory) => memory.id === id)!.at = at;
        return id;
      };
      const id = add(
        actor,
        'My sister carved a cedar bird. Tallis hid a silver thimble inside its hollow base as a surprise.',
        86400,
      );
      add(player, 'My cedar bird contains another observer’s private emerald.', 86400);
      // Exceed the bounded importance fallback so this tests indexed cue retrieval,
      // rather than assuming an unrelated permitted memory can never be considered.
      for (let index = 0; index < 400; index++)
        add(
          actor,
          `Market visit ${index}: I checked the grain sacks beside the loading platform. The cart wheels needed oil, the merchant weighed each bundle, and the porters stacked the baskets against the dry wall. The afternoon passed with counting, carrying, sweeping, and ordinary errands.`,
          (2 + (index * 363) / 400) * 86400,
        );
      return id;
    });
    const prepare = async (id: string, text: string) => {
      expect((await service.say(id, player, text, actor)).ok).toBe(true);
      const event = service.world.events.find((event) => event.data?.['text'] === text)!;
      expect(event).toBeDefined();
      let judged = '';
      const decision = await prepareDecision(
        service,
        recall,
        actor,
        `decision-${id}`,
        responseTrigger(service, actor, event.id, 'State changed.'),
        [event.id],
        async (request) => {
          const state = request.state as { includedContext: Record<string, unknown> };
          expect(state.includedContext['aboutMe']).toBe(service.world.innerWorlds?.[actor]?.text);
          expect(state.includedContext).toHaveProperty('feelings');
          expect(state).not.toHaveProperty('innerWorldExcerpt');
          judged = JSON.stringify(request.state);
          return {
            answers: Object.fromEntries(
              Object.keys(request.questions).map((key) => [
                key,
                { type: 'noul' as const, noul: 0.9 },
              ]),
            ),
          };
        },
        new AbortController().signal,
      );
      expect(judged).not.toContain('private emerald');
      return {
        judged,
        context: JSON.stringify(decision.context),
        evidenceIds: decision.binding.evidenceIds,
      };
    };
    const unrelated = await prepare('unrelated-cue', 'How are the grain sacks at the market?');
    expect(unrelated.judged).not.toContain('silver thimble');
    expect(unrelated.context).not.toContain('silver thimble');
    expect(unrelated.evidenceIds).not.toContain(old);
    const relevant = await prepare(
      'relevant-cue',
      'Who carved your cedar bird? Was it your sister?',
    );
    expect(relevant.judged).toContain('silver thimble');
    expect(relevant.context).toContain('silver thimble');
    expect(relevant.evidenceIds).toContain(old);
    expect((await service.forgetMemory(actor, old)).ok).toBe(true);
    const forgotten = await prepare('forgotten-cue', 'Tell me about that cedar bird again.');
    expect(forgotten.judged).not.toContain('silver thimble');
    expect(forgotten.context).not.toContain('silver thimble');
    expect(forgotten.evidenceIds).not.toContain(old);
    expect(forgotten.context).toContain('Tell me about that cedar bird again.');
  } finally {
    await recall.close();
    await log.close();
    await store.close();
  }
}, 30000);
