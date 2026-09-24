import { expect, it } from 'vitest';
import type { AiClient, JudgeRequest, JudgeValue } from '@open-legend/ai';
import { readConfig } from './config.js';
import { SqliteStore } from './store.js';
import { WorldService } from './world-service.js';
import { IntelligenceLog } from './intelligence-log.js';
import { RecallService } from './recall.js';
import { prepareDecision } from './decision-context.js';
import { AiDirector } from './ai-director.js';

async function fixture() {
  const config = { ...readConfig({}), jevKey: 'fixture', llmKey: 'fixture', budgetUsd: 1 };
  const store = new SqliteStore(':memory:');
  const service = new WorldService(store, config);
  await service.ready;
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

it('uses durable completed reply records to exclude handled speech while preserving a newer trigger', async () => {
  const { store, service, actor, player } = await fixture();
  const requests: JudgeRequest[] = [];
  // Explicit local provider fixture; no network or paid inference.
  const client: AiClient = {
    async judge(request) {
      requests.push(request);
      const answers: JudgeValue['answers'] = {};
      for (const [id, q] of Object.entries(request.questions)) {
        if (q.type !== 'choice') throw new Error('Expected choice fixture');
        const choice = Object.hasOwn(q.criteria, 'native') ? 'native' : 'no';
        answers[id] = {
          type: 'choice',
          choice,
          confidence: 1,
          probabilities: Object.fromEntries(
            Object.keys(q.criteria).map((key) => [key, Number(key === choice)]),
          ),
        };
      }
      return {
        outcome: 'value',
        value: { answers },
        receipt: {
          requestId: request.requestId,
          provider: 'jev',
          requestedModel: 'fixture',
          model: 'fixture',
          modelVersionStatus: 'unavailable',
          contextDigest: 'fixture',
          startedAt: new Date(0).toISOString(),
          completedAt: new Date(0).toISOString(),
          latencyMs: 0,
          dispatched: false,
          completionUncertain: false,
          estimatedCostUsd: 0,
        },
      };
    },
    async generate() {
      throw new Error('Unexpected fixture generation');
    },
  };
  let director: AiDirector | undefined;
  try {
    await service.say('fixture-unrelated', player, 'Earlier unanswered question', actor);
    await service.say('fixture-old', player, 'Already answered question', actor);
    const old = service.world.events.find(
      (event) => event.data?.['text'] === 'Already answered question',
    )!;
    await store.putJob({
      id: 'fixture-completed-chat',
      kind: 'chat',
      status: 'completed',
      fingerprint: 'fixture',
      createdAt: 1,
      message: 'Fixture completed reply',
      request: { text: 'Already answered question', npcId: actor },
      playerSpeechEventId: old.id,
    });
    await service.say('fixture-new', player, 'New unanswered question', actor);
    // A new director has no in-memory history of the completed chat.
    director = new AiDirector(service, client);
    await director.considerThought();
    await director.idle();
    const routed = requests.find((request) => request.questions['route']);
    expect(routed).toBeDefined();
    const trigger = String(routed!.state).split('## Trigger\n')[1]!.split('\n## Task')[0]!;
    expect(trigger).toContain('Earlier unanswered question');
    expect(trigger).toContain('New unanswered question');
    expect(trigger).not.toContain('Already answered question');
    // History remains available: suppressing a wakeup is not forgetting speech.
    expect(String(routed!.state)).toContain('Already answered question');
  } finally {
    await director?.close();
    await store.close();
  }
});
