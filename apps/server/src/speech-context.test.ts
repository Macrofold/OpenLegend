import { enterLocalWorld } from '../../../tests/fixtures/service.js';
import { expect, it } from 'vitest';
import { readConfig } from './config.js';
import { SqlGameRepository } from './store.js';
import { WorldService } from './world-service.js';
import { IntelligenceLog } from './intelligence-log.js';
import { RecallService } from './recall.js';
import { prepareDecision } from './decision-context.js';

async function fixture() {
  const config = readConfig({ AI_BUDGET_USD: '0' });
  const store = new SqlGameRepository(':memory:');
  const service = new WorldService(store, config);
  await enterLocalWorld(service);
  await service.setConnection('speech-fixture', true);
  await service.setPresence('speech-fixture', true);
  await service.control({ paused: false });
  return {
    store,
    service,
    actor: service.defaultResidentEntityId,
    player: service.controlledEntityId,
  };
}

it('keeps conversation turns after the original trigger and beyond 32 turns during relevance failure', async () => {
  const { store, service, actor, player } = await fixture();
  const log = new IntelligenceLog(store);
  const recall = new RecallService(service, log);
  try {
    expect((await service.say('fixture-first', player, 'First question', actor)).ok).toBe(true);
    const first = service.world.events.find((event) => event.data?.['text'] === 'First question')!;
    for (let i = 0; i < 34; i++)
      expect(
        (await service.say(`fixture-turn-${i}`, actor, `My reply number ${i}`, player)).ok,
      ).toBe(true);
    const decision = await prepareDecision(
      service,
      recall,
      actor,
      'fixture-decision',
      'Reconsider',
      [first.id],
      async () => {
        throw new Error('Fixture relevance outage');
      },
      new AbortController().signal,
    );
    const history = decision.context['conversation'] as string[];
    expect(history).toHaveLength(34);
    expect(history[0]).toContain('My reply number 0');
    expect(history.at(-1)).toContain('My reply number 33');
  } finally {
    await recall.close();
    await log.close();
    await store.close();
  }
});
