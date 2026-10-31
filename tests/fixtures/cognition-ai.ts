import type {
  AiClient,
  AiReceipt,
  AiResult,
  GenerateRequest,
  JudgeRequest,
  JudgeValue,
  JudgmentAnswer,
} from '@open-legend/ai';

/** Resolve the current source index in either native decision facts or rendered input. */
export function fixtureTriggerExperience(context: unknown): { value: Record<string, unknown> } {
  const native =
    context && typeof context === 'object' && 'nativeContext' in context
      ? context.nativeContext
      : context;
  const structured =
    typeof native === 'string'
      ? {
          triggerFacts: JSON.parse(native.match(/## Trigger facts\n([^\n]+)/)?.[1] ?? 'null'),
          experience: JSON.parse(
            native.match(/## Complete personal evidence\n([^\n]+)/)?.[1] ?? '[]',
          ),
        }
      : (native as {
          triggerFacts?: { experience?: string };
          experience?: Array<{ value: Record<string, unknown> }>;
        } | null);
  const index = structured?.triggerFacts?.experience?.match(
    /^character\.experience\[(\d+)\]$/,
  )?.[1];
  const experience = index === undefined ? undefined : structured?.experience?.[Number(index)];
  if (!experience?.value) throw new Error('Fixture context has no supplied triggering experience.');
  return experience;
}

/** Native pipeline fixture, not evidence about model quality. It never makes a provider call. */
export function fixtureCognitionAi() {
  const calls: Array<JudgeRequest | GenerateRequest> = [];
  const receipt = (requestId: string, provider: 'jev' | 'openai'): AiReceipt => ({
    requestId,
    provider,
    requestedModel: 'fixture',
    model: 'fixture',
    modelVersionStatus: 'reported',
    contextDigest: 'fixture',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    latencyMs: 0,
    dispatched: true,
    completionUncertain: false,
    estimatedCostUsd: 0,
  });
  const client: AiClient = {
    async judge(request): Promise<AiResult<JudgeValue>> {
      calls.push(request);
      const answers: Record<string, JudgmentAnswer> = {};
      for (const [id, question] of Object.entries(request.questions)) {
        if (question.type === 'choice') {
          const keys = Object.keys(question.criteria);
          const selected = id === 'route' && keys.includes('level2') ? 'level2' : keys[0]!;
          answers[id] = {
            type: 'choice',
            choice: selected,
            probabilities: Object.fromEntries(keys.map((key) => [key, Number(key === selected)])),
          };
        } else if (question.type === 'noul') answers[id] = { type: 'noul', noul: 0.9 };
        else answers[id] = { type: 'score', score: 0.9, legend: {}, probabilities: {} };
      }
      return { outcome: 'value', value: { answers }, receipt: receipt(request.requestId, 'jev') };
    },
    async generate<T>(request: GenerateRequest): Promise<AiResult<T>> {
      calls.push(request);
      let value: unknown = { operations: [] };
      if (request.task === 'npc_response') {
        const addressee = fixtureTriggerExperience(request.context).value['sourceId'];
        if (typeof addressee !== 'string' || !addressee)
          throw new Error('Fixture generation has no permitted triggering speaker handle.');
        value = {
          operations: [
            {
              localId: 'fixture_reply',
              requiresAccepted: [],
              talk: {
                text: 'Yes, let us talk.',
                addresseeEntityId: addressee,
                selfIntroduction: null,
                volume: 'normal',
              },
            },
          ],
        };
      }
      return {
        outcome: 'value',
        value: value as T,
        receipt: receipt(request.requestId, 'openai'),
      };
    },
  };
  return { client, calls };
}
