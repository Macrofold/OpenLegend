import {
  appraisalCreationIdentity,
  appraisalPin,
  RESPONSE_LIMITS,
  type AppraisalChange,
  type AppraisalScope,
  type PreparedResponseProfile,
  type compilePreparedResponses,
} from '@open-legend/domain';
import { decodeJudge, type JudgeValue, type TypedQuestionMap } from '@open-legend/ai';
import { bindDecisionAppraisals } from './appraisal-context.js';
import type { DecisionAppraisalProposal } from './cognition-contracts.js';
import type { WorldService } from './world-service.js';

/** One exact newest cause per feeling/subject. Earlier causes remain in the supplied
 * situation; neither native eligibility nor an amount option chooses an interpretation.
 * docs/projects/combat-and-threat-responses-tech-design.md#stage-one-situation-relevance-and-independent-appraisals */
export async function prepareResponseAppraisals(
  service: WorldService,
  actorId: string,
  jobId: string,
  catalogue: NonNullable<ReturnType<typeof compilePreparedResponses>>,
  profile: PreparedResponseProfile,
  subjects: Record<string, string>,
  triggerEvidenceId?: string,
) {
  const newest = new Map<string | null, (typeof catalogue.appraisalOccurrences)[number]>();
  for (const occurrence of catalogue.appraisalOccurrences) {
    const prior = newest.get(occurrence.subjectId);
    if (!prior || prior.sequence < occurrence.sequence)
      newest.set(occurrence.subjectId, occurrence);
  }
  const scopes: AppraisalScope[] = [];
  const relevantSubjects = new Set<string | null>([
    null,
    ...newest.keys(),
    ...catalogue.purposes.flatMap((purpose) => Object.values(purpose.purpose.roles)),
  ]);
  for (const policy of profile.appraisals) {
    const definition = service.world.moduleManifest.appraisals?.definitions.find(
      (value) => value.id === policy.definitionId && value.decision,
    );
    if (!definition || definition.stacking !== 'target' || definition.value.kind !== 'scaled')
      continue;
    for (const targetId of relevantSubjects)
      scopes.push({ definitionPin: appraisalPin(definition), targetId });
  }
  const bound = await bindDecisionAppraisals(
    service,
    actorId,
    jobId,
    [...new Set([...newest.values()].map((entry) => entry.eventId))],
    subjects,
    triggerEvidenceId,
    scopes,
    true,
  );
  const questions: TypedQuestionMap = {};
  const options = new Map<string, Map<string, DecisionAppraisalProposal | null>>();
  const context: Array<Record<string, unknown>> = [];
  const proposed: Array<{ question: string; handle: string; id: string }> = [];
  const targetHandles = new Map(Object.entries(subjects).map(([handle, id]) => [id, handle]));
  for (const [policyHandle, definition] of bound.definitions) {
    const policy = profile.appraisals.find((value) => value.definitionId === definition.id);
    if (!policy || definition.stacking !== 'target' || definition.value.kind !== 'scaled') continue;
    // Existing exact-scope feelings are included even when there is no fresh cause.
    const targets = new Set<string | null>([
      ...newest.keys(),
      ...[...bound.records.values()]
        .filter(
          (record) =>
            record.definitionPin.id === definition.id &&
            record.definitionPin.version === definition.version,
        )
        .map((record) => record.targetId),
    ]);
    for (const targetId of targets) {
      const target = targetId === null ? null : targetHandles.get(targetId);
      if (target === undefined) continue;
      const handle = `feeling_${options.size}`;
      const choices = new Map<string, DecisionAppraisalProposal | null>([['a_unchanged', null]]);
      const criteria: Record<string, string> = {
        a_unchanged:
          'Keep my present feeling unchanged. New information need not change my interpretation.',
      };
      const current = [...bound.records].find(
        ([, record]) =>
          record.definitionPin.id === definition.id &&
          record.definitionPin.version === definition.version &&
          record.targetId === targetId,
      );
      if (current) {
        choices.set('b_resolve', { kind: 'resolve', appraisal: current[0] });
        criteria.b_resolve =
          'End this current interpretation because it no longer applies to what I personally know. This does not erase its cause or history.';
      }
      const occurrence = newest.get(targetId);
      const source =
        occurrence &&
        [...bound.sources].find(
          ([, value]) =>
            value.occurrenceId === occurrence.eventId &&
            (targetId === null || value.subjectIds.includes(targetId)),
        );
      if (source && definition.causes.includes(source[1].kind)) {
        const identity = appraisalCreationIdentity(
          actorId,
          appraisalPin(definition),
          targetId,
          source[1].occurrenceId,
          definition.stacking,
        );
        for (const [index, amount] of policy.amounts.entries()) {
          if (amount <= definition.value.min || amount > definition.value.max) continue;
          const choice = `c_amount_${index}`;
          choices.set(choice, {
            kind: 'create',
            definition: policyHandle,
            source: source[0],
            target,
            value: { kind: 'scaled', value: amount },
          });
          criteria[choice] =
            `Interpret the supplied new personal occurrence as ${definition.label} at intensity ${amount} on the installed ${definition.value.min}–${definition.value.max} scale. ${policy.meaning}`;
          proposed.push({ question: handle, handle: choice, id: identity.id });
        }
      }
      options.set(handle, choices);
      questions[handle] = {
        type: 'choice',
        instructions: `What interpretation of ${definition.label} concerning ${targetId === null ? 'no identified person' : `${catalogue.subjectDescriptions[targetId]} (${target})`} fits me now? Judge independently of any proposed action or purpose. ${policy.meaning}`,
        criteria,
      };
      context.push({
        question: handle,
        definition: policyHandle,
        subject: target,
        cause: source?.[0] ?? null,
        current: current?.[0] ?? null,
      });
    }
  }
  if (options.size > RESPONSE_LIMITS.operations)
    throw new Error(
      'The complete appraisal question set exceeds native response operation capacity.',
    );
  // Check cold outcomes before offering a creation. Reading an old occurrence must
  // never offer a fresh curve merely because its resolved record is no longer hot.
  if (proposed.length) {
    if (!service.store.records) throw new Error('Prior appraisal outcomes are unavailable.');
    const prior = await service.store.records.appraisalOutcomes(service.world.id, actorId, [
      ...new Set(proposed.map((value) => value.id)),
    ]);
    for (const value of proposed)
      if (prior[value.id]) {
        options.get(value.question)!.delete(value.handle);
        const question = questions[value.question]!;
        if (question.type === 'choice') delete question.criteria[value.handle];
      }
  }
  if (!(await bound.current()))
    throw new Error('Personal appraisal sources changed before judgment.');
  return {
    bound,
    scopes,
    questions,
    context: {
      ...bound.context,
      subjects: Object.entries(subjects).map(([handle, id]) => ({
        handle,
        description: catalogue.subjectDescriptions[id],
      })),
      questions: context,
    },
    resolve(value: JudgeValue): {
      changes: AppraisalChange[];
      refused: Array<{ question: string; reason: string }>;
    } {
      const proposals: DecisionAppraisalProposal[] = [];
      const refused: Array<{ question: string; reason: string }> = [];
      for (const [handle, choices] of options) {
        try {
          const answer = decodeJudge(value, { [handle]: questions[handle]! }).answers[handle];
          if (answer?.type !== 'choice' || !choices.has(answer.choice))
            throw new Error('The supplied interpretation is unavailable.');
          const proposal = choices.get(answer.choice);
          if (proposal) proposals.push(proposal);
        } catch (error) {
          refused.push({
            question: handle,
            reason: error instanceof Error ? error.message : 'Invalid interpretation.',
          });
        }
      }
      return { changes: bound.resolveDecision(proposals), refused };
    },
  };
}
