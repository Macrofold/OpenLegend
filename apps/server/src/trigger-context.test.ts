import { expect, it } from 'vitest';
import { readConfig } from './config.js';
import { SqliteStore } from './store.js';
import { WorldService } from './world-service.js';
import { IntelligenceLog } from './intelligence-log.js';
import { RecallService } from './recall.js';
import { prepareDecision, selectDecisionActions } from './decision-context.js';
import { responseTrigger } from './response-context.js';

it('keeps coalesced evidence in context without adding it to the literal trigger', async () => {
  // Local world and failing relevance fixture: no provider or network requests.
  const store = new SqliteStore(':memory:');
  const service = new WorldService(store, readConfig({}));
  await service.ready;
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
      expect(request.state).toHaveProperty('decisionContext', decision.context);
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
