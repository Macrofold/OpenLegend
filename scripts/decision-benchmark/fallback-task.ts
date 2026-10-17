import {
  compileDecisionTask,
  prepareDecisionTask,
  type DecisionTask,
} from '../../apps/server/src/decision-task.js';
import type { JudgmentAnswer } from '../../packages/ai/src/index.js';
import { modelInput } from './corpus.js';
import type { BenchmarkTaskAdapter } from './run.js';

/** Reuse production wording and typed decoding. Large retained contexts are allowed
 * only by this offline study; transport and financial admission remain bounded. */
export function fallbackTaskAdapter(
  referenceReport: NonNullable<BenchmarkTaskAdapter['referenceReport']>,
  largeContextStudy = false,
): BenchmarkTaskAdapter {
  const preparations = new Map<string, ReturnType<typeof compileDecisionTask>>();
  return {
    referenceReport,
    prepare(scene) {
      const input = modelInput(scene);
      const tasks = Object.fromEntries(
        Object.values(input.questions).map((question, index): [string, DecisionTask] => [
          `q${index}`,
          question.type === 'choice'
            ? {
                kind: 'choice',
                question: question.instructions,
                choices: Object.fromEntries(
                  Object.entries(question.criteria).map(([key, value]) => [key, value ?? key]),
                ),
              }
            : question.type === 'score'
              ? {
                  kind: 'rating',
                  question: question.instructions,
                  categories: Object.fromEntries(question.criteria.map((text, i) => [i, text])),
                }
              : {
                  kind: 'likelihood',
                  question:
                    question.instructions +
                    (question.criteria
                      ? `\nTruth criteria: ${JSON.stringify(question.criteria)}`
                      : ''),
                },
        ]),
      );
      const prepared = (largeContextStudy ? compileDecisionTask : prepareDecisionTask)(
        tasks,
        JSON.stringify(input.state),
      );
      preparations.set(scene.id, prepared);
      return {
        id: scene.id,
        input,
        generation: {
          instructions: prepared.instructions,
          schema: prepared.schema,
          state: prepared.context,
          exactInstructions: true,
        },
      };
    },
    decode(task, execution) {
      if (execution.result.outcome !== 'value' || execution.generation === undefined) return;
      try {
        const decoded = preparations.get(task.id)!.decode(execution.generation);
        const answers: Record<string, JudgmentAnswer> = {};
        Object.entries(task.input.questions).forEach(([id, question], index) => {
          const answer = decoded[`q${index}`]!;
          if (answer.status !== 'answered') return;
          const value = answer.value;
          if ('choice' in value)
            answers[id] = { type: 'choice', choice: value.choice, probabilities: {} };
          else if ('probability' in value) answers[id] = { type: 'noul', noul: value.probability };
          else if ('category' in value && question.type === 'score')
            answers[id] = {
              type: 'score',
              score: value.category,
              legend: Object.fromEntries(question.criteria.map((text, i) => [i, text])),
              probabilities: {},
            };
        });
        execution.result.value = { answers };
      } catch {
        execution.result = {
          outcome: 'invalid',
          reason: 'fallback_answer_invalid',
          receipt: execution.result.receipt,
        };
      }
    },
  };
}
