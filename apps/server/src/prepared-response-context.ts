import { canonicalJson, type compilePreparedResponses } from '@open-legend/domain';
import type { CandidateAction } from './context.js';
import type { RequiredDecisionChoices } from './decision-context.js';

/** Describe shared physical means once without collapsing different purposes or
 * changing their bound invocations. These tables are included intact in both
 * semantic stages, under the existing complete-context allowance. */
export function preparedResponseChoices(
  catalogue: NonNullable<ReturnType<typeof compilePreparedResponses>>,
  instructions: string,
): RequiredDecisionChoices {
  const methods = new Map<string, { id: string; description: string; workHandling: string }>();
  const purposes: Array<{ id: string; description: string; sourceIds: string[] }> = [];
  const candidates: CandidateAction[] = [];
  for (const [index, purpose] of catalogue.purposes.entries()) {
    const purposeHandle = `p${index}`;
    purposes.push({
      id: purposeHandle,
      description: purpose.description,
      sourceIds: purpose.purpose.sourceIds,
    });
    for (const option of purpose.options) {
      const {
        id: _id,
        purpose: _label,
        chosenPurpose: _meaning,
        ...invocation
      } = option.invocation ?? {};
      // A requested activity's personal name is retained in its exact binding,
      // but is not another physical method or another copy of its instructions.
      let physical =
        'type' in invocation && invocation.type === 'compose'
          ? (({ name: _name, ...method }) => method)(invocation)
          : invocation;
      const control = option.invocation?.type === 'compose' ? option.invocation.control : undefined;
      if (control?.kind === 'finite') {
        // Passive people belong to the purpose, not a different physical method.
        // Keep every candidate's exact native invocation below; only share its
        // repeated explanatory row when hard execution requirements agree.
        physical = {
          ...physical,
          control: {
            ...control,
            subjects: Object.fromEntries(
              Object.entries(control.subjects).filter(([, subject]) => !subject.observationOnly),
            ),
          },
        };
      }
      const key = canonicalJson([physical, option.transition, option.description]);
      let method = methods.get(key);
      if (!method) {
        method = {
          id: `m${methods.size}`,
          description: option.description,
          workHandling: option.transition,
        };
        methods.set(key, method);
      }
      candidates.push({
        id: `${purposeHandle}:${method.id}`,
        description: `Choose purpose ${purposeHandle} with first action ${method.id}.`,
        command: null,
        ...(option.invocation ? { nativeInvocation: option.invocation } : {}),
        purpose: option.purpose,
        purposeHandle,
        firstActionDescription: option.firstActionDescription ?? option.description,
        transition: option.transition,
      });
    }
  }
  candidates.push({
    id: 'continue',
    description: 'Deliberately choose no new intervention; keep any currently admitted conduct.',
    command: null,
    transition: 'continue',
  });
  return {
    candidates,
    facts: {
      instructions,
      reading:
        'Each offered choice names one fully described purpose and one first action below. Judge that entire bound combination, including its exact people, work handling and stopping conditions. A shared method does not merge its different purposes. Selected visible people remain personally bound observations: losing a passive person prompts reconsideration but stops physical work only when that work requires them. Work handling refers to the current and paused work and consequences supplied in this same context.',
      purposes,
      methods: [...methods.values()],
      unavailable: catalogue.unavailable,
    },
    feelings: [],
  };
}
