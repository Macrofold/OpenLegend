import { testRepository } from '../../../tests/fixtures/database.js';
import { enterLocalWorld } from '../../../tests/fixtures/service.js';
import { beforeAll, expect, it } from 'vitest';
import { readConfig } from '../../../tests/fixtures/database.js';
import { WorldService } from './world-service.js';
import { IntelligenceLog } from './intelligence-log.js';
import { RecallService } from './recall.js';
import { prepareDecision } from './decision-context.js';
import { canonicalJson, experienceSourceKey } from '@open-legend/domain';

async function fixture() {
  const config = readConfig({ AI_BUDGET_USD: '0' });
  const store = await testRepository();
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

let ready: Awaited<ReturnType<typeof fixture>>;
// Disposable database initialization is outside the gameplay path's 15-second
// assertion budget. Its measured startup SQL wait can exceed that budget alone.
beforeAll(async () => {
  ready = await fixture();
}, 60_000);

it('keeps required causes and a complete bounded recent suffix after the trigger during relevance failure', async () => {
  const { store, service, actor, player } = ready;
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
    expect(history.length).toBeGreaterThan(0);
    expect(history.length).toBeLessThan(34);
    const numbers = history.flatMap((line) => {
      const match = /My reply number (\d+)/.exec(line);
      return match ? [Number(match[1])] : [];
    });
    expect(history[0]).toContain('First question');
    expect(numbers.length).toBeGreaterThan(0);
    expect(
      numbers.every((number, index) => index === 0 || number === numbers[index - 1]! + 1),
    ).toBe(true);
    // Required speech remains chronological dialogue. Its complete typed source
    // is supplied once in the shared experience pool, alongside the exact suffix.
    expect(numbers.at(-1)).toBe(33);
    expect(decision.prompt).toContain('My reply number 33');
    expect(decision.prompt).toContain('First question');
    expect(decision.awarenessSequence).toBe(
      Math.max(...service.world.experience!.awareness[actor]!.map((entry) => entry.sequence)),
    );
    expect(decision.diagnostics.conversation.more).toBe(true);
    expect(decision.diagnostics.conversation.projectionBytes).toBeLessThanOrEqual(24000);
    expect((decision.context['experience'] as unknown[]).length).toBeGreaterThanOrEqual(
      history.length,
    );
    const latest = service.world.events.find(
      (event) => event.data?.['text'] === 'My reply number 33',
    )!;
    for (const id of [first.id, latest.id]) {
      const source = decision.sharedExperiences.get(experienceSourceKey({ kind: 'awareness', id }));
      expect(source).toBeDefined();
      expect(
        (decision.context['experience'] as unknown[]).filter(
          (value) => canonicalJson(value) === canonicalJson(source!.experience),
        ),
      ).toHaveLength(1);
    }
    await expect(decision.validateConversation()).resolves.toBeUndefined();
  } finally {
    await recall.close();
    await log.close();
    await store.close();
  }
});
