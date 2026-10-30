import type { DecisionTask } from './decision-task.js';
import type { PreparedReconsideration } from './decision-escalator.js';
import { publishQuestionAnswers } from './decision-publication.js';
import { digest } from './content-digest.js';
import type { WorldService } from './world-service.js';

export interface QuestionRead {
  questions: Record<
    string,
    Omit<DecisionTask, 'valueSchema'> & { kind: 'choice' | 'rating' | 'likelihood' | 'relevance' }
  >;
  /** Every supplied mutable value has an owning reader and exact revision. Required sources
   * are context here, never members of the optional relevance candidate set. */
  inputs: Record<string, { value: unknown; owner: string; revision: string }>;
  sourceTime: number;
  /** Batch light source/version checks; never rehydrate all historical bodies at publication. */
  currentRevisions(): Promise<Record<string, string>>;
}

/** A real data consumer for non-executable judgments. Its result is the root's typed answer
 * record; callers use that answer only in their own current, authorized reading operation. */
export function prepareQuestionRead(
  service: WorldService,
  read: QuestionRead,
): PreparedReconsideration {
  const expected = digest(
    Object.fromEntries(Object.entries(read.inputs).map(([key, input]) => [key, input.revision])),
  );
  const generation = service.generation;
  const current = async () =>
    generation === service.generation && expected === digest(await read.currentRevisions());
  return {
    dispose() {},
    tasks: read.questions,
    context: JSON.stringify({
      sourceTime: read.sourceTime,
      validity:
        'All supplied mutable evidence is exact; a changed source revision invalidates this judgment.',
      inputs: Object.fromEntries(
        Object.entries(read.inputs).map(([key, input]) => [key, input.value]),
      ),
    }),
    bindingDigest: digest({ questions: read.questions, revisions: expected }),
    sourceTime: read.sourceTime,
    current,
    publish: (answers, claim) => publishQuestionAnswers(service, claim, answers, current),
  };
}
