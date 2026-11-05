import { testRepository } from '../../../tests/fixtures/database.js';
import { editWorld, enterLocalWorld } from '../../../tests/fixtures/service.js';
import { expect, it, vi } from 'vitest';
import { readConfig } from '../../../tests/fixtures/database.js';
import { WorldService } from './world-service.js';
import { IntelligenceLog } from './intelligence-log.js';
import { RecallService } from './recall.js';
import { prepareDecision, selectDecisionActions } from './decision-context.js';
import {
  compactActivityRequests,
  responseTrigger,
  type ModelActivityRequests,
} from './response-context.js';
import { appendMemory } from '../../../packages/domain/src/events.js';
import {
  currentGoal,
  entityGet,
  visionRadius,
  worldPosition,
  worldSupport,
} from '@open-legend/domain';
import { projectEntityMarkers } from './entity-references.js';
import { recallQueries } from './recall-query.js';
import { digest } from './store.js';

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
    await editWorld(service, (world) => {
      const person = entityGet(world.entities, actor)!;
      const origin = worldPosition(person);
      const radius = visionRadius(world, person);
      const nearby = world.map.spatial.surfaces.find(
        (surface) => surface.id === worldSupport(person),
      )!;
      const distant = world.map.spatial.surfaces.find(
        (surface) =>
          surface.minX > origin.x + radius ||
          surface.maxX < origin.x - radius ||
          surface.minZ > origin.z + radius ||
          surface.maxZ < origin.z - radius,
      );
      expect(distant, 'Main has distant public geometry').toBeDefined();
      world.map.spatial.revision++;
      nearby.name = 'Nearby fixture support';
      distant!.name = 'Distant fixture support';
    });
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
    expect(JSON.stringify(decision.context['publicSurfaces'])).toContain('Nearby fixture support');
    expect(JSON.stringify(decision.context)).not.toContain('Distant fixture support');
    const actions = await selectDecisionActions(decision, async (request) => {
      // Selection keeps evidence and planning capabilities, without output instructions.
      const { knowledgeInstructions, navigation, ...evidenceContext } = decision.context;
      expect((request.state as { character: unknown }).character).toMatchObject({
        ...evidenceContext,
        activityRequests: compactActivityRequests(
          evidenceContext['activityRequests'] as ModelActivityRequests,
        ),
      });
      expect(JSON.stringify(request.state)).not.toContain('Return {"operations":[]}');
      return {
        answers: Object.fromEntries(
          Object.keys(request.questions).map((id) => [id, { type: 'noul' as const, noul: 0.9 }]),
        ),
      };
    });
    expect(actions.offered.length).toBeGreaterThan(0);
    const evidence = JSON.stringify(decision.context['experience']);
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
      store.db
        .prepare(
          "SELECT current_setting('enable_nestloop') AS nested,current_setting('enable_mergejoin') AS merged",
        )
        .get();
    const previous = await setting();
    await store.memories.select(scope, 10, { text: 'camp' });
    expect(await setting()).toEqual(previous);
    // Observe restoration before the outer transaction ends: COMMIT alone
    // would conceal a leaked LOCAL setting from subsequent reads in that turn.
    await store.db.readTransaction!(async () => {
      for (const nested of ['on', 'off'])
        for (const merged of ['on', 'off']) {
          await store.db
            .prepare(
              "SELECT set_config('enable_nestloop',?,true),set_config('enable_mergejoin',?,true)",
            )
            .get(nested, merged);
          for (const text of ['camp', ['camp', 'river']]) {
            await store.memories.select(scope, 10, { text });
            expect(await setting()).toEqual({ nested, merged });
          }
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
      await expect(store.memories.select(scope, 10, { text: ['camp', 'river'] })).rejects.toThrow(
        '22012',
      );
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

it.each(['unavailable-index', 'ready-vector'] as const)(
  'finds an old native speech cue through %s and actual follow-up discourse without crossing memory permissions',
  async (indexMode) => {
    const store = await testRepository();
    const service = new WorldService(
      store,
      readConfig({ OPEN_LEGEND_GOD_MODE: 'true', EMBEDDING_DIMENSIONS: '64' }),
    );
    await enterLocalWorld(service);
    const log = new IntelligenceLog(store);
    const recall = new RecallService(service, log);
    const network = vi.fn(async () => {
      throw new Error('No external calls in native recall fixture.');
    });
    vi.stubGlobal('fetch', network);
    const candidates = recall.candidates.bind(recall);
    const discoveryQueries: string[] = [];
    const discoveryReports: unknown[] = [];
    const candidatesSpy = vi.spyOn(recall, 'candidates').mockImplementation(async (...args) => {
      const [world, actor] = args;
      const query = recallQueries({
        stimulus: args[6],
        goal: projectEntityMarkers(
          currentGoal(entityGet(world.entities, actor)!.actor!),
          world,
          actor,
        ),
        aboutMe: world.innerWorlds?.[actor]?.text,
        discovery: args[12],
      });
      discoveryQueries.push(query.semantic!);
      if (indexMode === 'ready-vector') {
        const head = (await store.records.head())!;
        // Deterministic precomputed query embedding: this verifies the actual pgvector
        // retrieval path, not the semantic quality of a real embedding model.
        await store.putIntegration(`memory-query:${world.id}:${actor}`, {
          key: digest({ query: query.semantic, generation: head.generation }),
          model: service.config.embeddingModel,
          dimensions: service.config.embeddingDimensions,
          query: Array.from({ length: service.config.embeddingDimensions }, (_, i) =>
            Number(i === (query.semantic!.includes('cedar bird') ? 0 : 1)),
          ),
        });
      }
      const result = await candidates(...args);
      const target = result.find((candidate) => candidate.text.includes('silver thimble'));
      discoveryReports.push({
        request: args[7],
        count: result.length,
        target: target && { id: target.id, score: target.score },
      });
      return result;
    });
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
      await service.flushMemorySources(actor);
      const head = (await store.records.head())!;
      const scope = { worldId: service.world.id, actorId: actor, generation: head.generation };
      const model = {
        model: service.config.embeddingModel,
        dimensions: service.config.embeddingDimensions,
      };
      if (indexMode === 'ready-vector') {
        const sources = await store.memories.select(scope, 600);
        expect(sources.length).toBeGreaterThan(400);
        await store.memories.putVectors(
          scope,
          model,
          sources.map((source) => ({
            id: source.memory.id,
            revision: source.revision,
            vector: Array.from({ length: model.dimensions }, (_, i) =>
              Number(i === (source.memory.id === old ? 0 : 1)),
            ),
          })),
        );
      }
      const coverage = await store.memories.coverage(scope, model);
      expect(coverage.eligible).toBeGreaterThan(400);
      expect(coverage.indexed).toBe(indexMode === 'ready-vector' ? coverage.eligible : 0);
      const retrieval = vi.spyOn(store.memories, 'select');
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
            const state = request.state as { character: Record<string, unknown> };
            expect(state.character['aboutMe']).toBe(service.world.innerWorlds?.[actor]?.text);
            expect(state.character).toHaveProperty('feelings');
            expect(state).not.toHaveProperty('innerWorldExcerpt');
            judged = JSON.stringify(request.state);
            return {
              answers: Object.fromEntries(
                Object.keys(request.questions).map((key) => [
                  key,
                  {
                    type: 'noul' as const,
                    noul: JSON.stringify(
                      (request.state as { candidates: Record<string, unknown> }).candidates[key],
                    ).includes('silver thimble')
                      ? 1
                      : 0.2,
                  },
                ]),
              ),
            };
          },
          new AbortController().signal,
          0,
          false,
          0,
          event.id,
        );
        expect(judged).not.toContain('private emerald');
        expect(JSON.stringify(decision.context)).not.toContain('private emerald');
        return {
          decision,
          eventId: event.id,
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
      expect(relevant.judged.includes('silver thimble'), JSON.stringify(discoveryReports)).toBe(
        true,
      );
      expect(
        relevant.context.includes('silver thimble'),
        JSON.stringify(relevant.decision.diagnostics.projectedBudget),
      ).toBe(true);
      expect(relevant.evidenceIds).toContain(old);
      const implicit = await prepare('implicit-follow-up', 'And what was hidden inside it?');
      expect(implicit.context).toContain('silver thimble');
      expect(implicit.evidenceIds).toContain(old);
      expect(discoveryQueries.at(-1)).toContain('Who carved your cedar bird? Was it your sister?');
      expect(discoveryQueries.at(-1)).toContain('And what was hidden inside it?');
      expect(
        retrieval.mock.calls.some(([, , query]) =>
          indexMode === 'ready-vector' ? !!query && 'query' in query : !!query && 'text' in query,
        ),
      ).toBe(true);
      candidatesSpy.mockRejectedValueOnce(new Error('Fixture optional discovery unavailable.'));
      const baseline = await prepare(
        'optional-discovery-failure',
        'Please listen to this current request.',
      );
      expect(baseline.context).toContain('Please listen to this current request.');
      expect(baseline.decision.context['identity']).toBeDefined();
      expect(baseline.decision.diagnostics).toMatchObject({
        discovery: { coverage: 'unavailable' },
      });
      await expect(baseline.decision.validateConversation()).resolves.toBeUndefined();
      expect((await service.forgetMemory(actor, baseline.eventId)).ok).toBe(true);
      await expect(baseline.decision.validateConversation()).rejects.toThrow(
        /changed|unavailable|source/i,
      );
      expect((await service.forgetMemory(actor, old)).ok).toBe(true);
      await expect(implicit.decision.validateConversation()).rejects.toThrow(
        /changed|unavailable|source/i,
      );
      const forgotten = await prepare('forgotten-cue', 'Tell me about that cedar bird again.');
      expect(forgotten.judged).not.toContain('silver thimble');
      expect(forgotten.context).not.toContain('silver thimble');
      expect(forgotten.evidenceIds).not.toContain(old);
      expect(forgotten.context).toContain('Tell me about that cedar bird again.');
      expect(network).not.toHaveBeenCalled();
    } finally {
      candidatesSpy.mockRestore();
      await recall.close();
      await log.close();
      service.releaseHostWork();
      await store.close();
      vi.unstubAllGlobals();
    }
  },
  90000,
);
