import { actionReadiness, canonicalJson, type compilePreparedResponses } from '@open-legend/domain';
import type { CandidateAction } from './context.js';
import type { WorldService } from './world-service.js';
import type { RequiredDecisionChoices } from './decision-context.js';
import { orderedDecisionContext } from './perceived-context.js';

const nativePreparations = new WeakMap<
  object,
  NonNullable<RequiredDecisionChoices['nativePreparation']>
>();

/** Recheck the final compiled operations, sharing unchanged physical preparation.
 * World compilers may change transitions/parameters; inherited readiness cannot
 * certify the composed operation. No additional prerequisite authority lives here. */
export function prepareResponseReadiness(
  service: WorldService,
  catalogue: NonNullable<ReturnType<typeof compilePreparedResponses>>,
) {
  const options = catalogue.purposes.flatMap((purpose) => purpose.options);
  const native = options.flatMap((option) =>
    option.invocation ? [{ invocation: option.invocation, transition: option.transition }] : [],
  );
  const prepared = service.prepareNativeCommandChoices(native);
  let index = 0;
  const result = {
    ...catalogue,
    purposes: catalogue.purposes.map((purpose) => ({
      ...purpose,
      options: purpose.options.map((option) => ({
        ...option,
        readiness: option.invocation
          ? actionReadiness(prepared.choices[index++]!, service.world.simTime)
          : { kind: 'ready' as const, at: service.world.simTime },
      })),
    })),
  };
  nativePreparations.set(result, {
    current: prepared.current,
    physicalPreparations: prepared.physicalPreparations,
  });
  return result;
}

/** Closed supplied choices cannot emit freeform operations. Project their actual
 * input before admission as well as dispatch; unused generation forms must not
 * make a complete native choice refuse its context budget. */
export function preparedResponseDecisionContext(context: Record<string, unknown>) {
  return orderedDecisionContext(
    Object.fromEntries(
      Object.entries(context).filter(
        ([key]) =>
          !['knowledgeInstructions', 'navigation', 'planOffers', 'activityRequests'].includes(key),
      ),
    ),
  );
}

/** Describe shared physical means once without collapsing different purposes or
 * changing their bound invocations. These tables are included intact in both
 * semantic stages, under the existing complete-context allowance. */
export function preparedResponseChoices(
  catalogue: NonNullable<ReturnType<typeof compilePreparedResponses>>,
  instructions: string,
  subjectLabels: ReadonlyMap<string, string>,
): RequiredDecisionChoices {
  const methods = new Map<
    string,
    {
      id: string;
      description: string;
      workHandling: string;
      readiness: import('@open-legend/domain').ActionReadiness;
    }
  >();
  const purposes: Array<{
    id: string;
    description: string;
    firstActionIds: string[];
    blockedActionIds: string[];
  }> = [];
  const candidates: CandidateAction[] = [];
  for (const [index, purpose] of catalogue.purposes.entries()) {
    const purposeHandle = `p${index}`;
    const people = Object.entries(purpose.purpose.roles).map(
      ([role, id]) => `${role}: ${subjectLabels.get(id) ?? purpose.roleDescriptions[role]}`,
    );
    // Only the captured permitted observation supplies current labels. Historical
    // people retain their original wording without revealing a hidden body.
    // These opaque handles never enter the stored native purpose or invocation.
    const participants = people.length ? ` (${people.join('; ')})` : '';
    // Keep the full purpose meaning once in its shared row. Each independent
    // question still names the complete short purpose and its exact people.
    const purposeDescription = `${purpose.label}${participants}`;
    const purposeMeaning = `${purposeDescription}. ${purpose.meaning}`;
    const purposeRow = {
      id: purposeHandle,
      description: purposeMeaning,
      firstActionIds: [] as string[],
      blockedActionIds: [] as string[],
    };
    purposes.push(purposeRow);
    const firstActionIds = new Set<string>();
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
      const targetIds =
        control?.kind === 'finite'
          ? Object.entries(control.subjects)
              .filter(([, subject]) => !subject.observationOnly)
              .map(([id]) => id)
          : option.invocation && 'targetId' in option.invocation && option.invocation.targetId
            ? [option.invocation.targetId]
            : [];
      const targets = targetIds.flatMap((id) => {
        const label = subjectLabels.get(id);
        return label ? [label] : [];
      });
      const targetDescription = targets.length ? ` Target: ${targets.join('; ')}` : '';
      if (!option.readiness) throw new Error('The compiled response has no native readiness.');
      const key = canonicalJson([
        physical,
        option.transition,
        option.description,
        option.readiness,
      ]);
      let method = methods.get(key);
      if (!method) {
        method = {
          id: `m${methods.size}`,
          description: `${option.description}${targetDescription}`,
          workHandling: option.transition,
          readiness: option.readiness,
        };
        methods.set(key, method);
      }
      if (!firstActionIds.has(method.id)) {
        firstActionIds.add(method.id);
        (option.readiness.kind === 'ready'
          ? purposeRow.firstActionIds
          : purposeRow.blockedActionIds
        ).push(method.id);
      }
      if (option.readiness.kind === 'blocked') continue;
      candidates.push({
        id: `${purposeHandle}:${method.id}`,
        description: `Choose purpose ${purposeHandle} with first action ${method.id}.`,
        command: null,
        ...(option.invocation ? { nativeInvocation: option.invocation } : {}),
        purpose: option.purpose,
        purposeDescription,
        purposeMeaning,
        purposeHandle,
        firstActionDescription: `${option.firstActionDescription ?? option.description}${targetDescription}`,
        transition: option.transition,
        readiness: option.readiness,
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
    nativePreparation: nativePreparations.get(catalogue),
    facts: {
      instructions,
      reading:
        'Each purpose lists its immediately startable firstActionIds and informational blockedActionIds from the shared methods table. Blocked methods cannot be selected now; their native reasons and recheck times describe current limits, not permanent impossibility. Judge only those bound combinations, including exact people, work handling and stopping conditions. A shared method does not merge its different purposes. Selected visible people remain personally bound observations: losing a passive person prompts reconsideration but stops physical work only when that work requires them. Work handling refers to the current and paused work and consequences supplied in this same context.',
      purposes,
      methods: [...methods.values()],
      unavailable: catalogue.unavailable.map(({ purposeId, roles, description, reason }) => ({
        purposeId,
        description,
        participants: Object.fromEntries(
          Object.entries(roles).flatMap(([role, id]) => {
            const label = subjectLabels.get(id);
            return label ? [[role, label]] : [];
          }),
        ),
        reason,
      })),
    },
    feelings: [],
  };
}
