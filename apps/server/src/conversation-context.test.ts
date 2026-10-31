import { afterEach, expect, it, vi } from 'vitest';
import { NPC_ID, PLAYER_ID, experienceSourceKey } from '@open-legend/domain';
import { readConfig, testRepository } from '../../../tests/fixtures/database.js';
import { enterLocalWorld, useNearCampSight } from '../../../tests/fixtures/service.js';
import { stockedCamp } from '../../../tests/fixtures/world.js';
import { bindDecisionAppraisals } from './appraisal-context.js';
import { buildConversationContext } from './conversation-context.js';
import { prepareDecision } from './decision-context.js';
import { IntelligenceLog } from './intelligence-log.js';
import { conversationCompactionKey } from './memory-repository.js';
import { RecallService } from './recall.js';
import { WorldService } from './world-service.js';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0)) await close();
  vi.unstubAllGlobals();
});

async function fixture() {
  vi.stubGlobal('fetch', async () => {
    throw new Error('External network blocked.');
  });
  const store = await testRepository(undefined, stockedCamp());
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

it('reuses exact recent conversation causes while retaining changed projections and revisions', async () => {
  const h = await fixture();
  const earlier = await h.say('I heard a different account of the missing bag.');
  const latest = await h.say('What do you make of that account?');
  const prepared = await h.prepare([latest]);
  const key = experienceSourceKey({ kind: 'awareness', id: earlier });
  const shared = prepared.sharedExperiences.get(key)!;
  expect(shared).toBeDefined();
  expect(shared.experience).toEqual((prepared.context['experience'] as unknown[])[shared.index]);

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
  const cause = (bound: Awaited<ReturnType<typeof bind>>) =>
    bound.context.sources.find(
      (source) => bound.sources.get(source.handle)?.occurrenceId === earlier,
    )!;
  const bound = await bind();
  expect(cause(bound).experience).toEqual({ reference: `character.experience[${shared.index}]` });
  expect(await bound.current()).toBe(true);

  const changedProjection = new Map(prepared.sharedExperiences);
  const changed = structuredClone(shared);
  changed.experience.value['summary'] = 'A different observer projection.';
  changedProjection.set(key, changed);
  expect(cause(await bind(changedProjection)).experience).toHaveProperty('value');

  const changedRevision = new Map(prepared.sharedExperiences);
  changedRevision.set(key, { ...shared, revision: 'different-source-revision' });
  expect(cause(await bind(changedRevision)).experience).toHaveProperty('value');
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
  // Native selected experiences precede the summary and its exact suffix.
  expect(combined.index).toBeGreaterThan(exact[1].index);
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
