import {
  experienceEntryKey,
  type AppraisalDefinition,
  type AppraisalEvidence,
  type AppraisalView,
  type ExperienceEntry,
} from '@open-legend/domain';
import { z } from 'zod';
import { decisionAppraisalSchema, type DecisionAppraisalProposal } from './cognition-contracts.js';
import {
  experienceForModel,
  experienceModelBindings,
  type ModelSpatialFrame,
  type SharedModelExperience,
} from './perceived-context.js';
import type { ExperiencePresentation } from './experience-context.js';

export interface AppraisalContextRead {
  readonly actorId: string;
  readonly subjects: Readonly<Record<string, string>>;
  readonly records: ReadonlyMap<string, AppraisalView>;
  readonly recordDefinitions: ReadonlyMap<string, AppraisalDefinition | undefined>;
  readonly definitions: ReadonlyMap<string, AppraisalDefinition>;
  readonly sources: ReadonlyMap<string, Pick<AppraisalEvidence, 'coverage' | 'subjectIds'>>;
  readonly selected: readonly { readonly entry: ExperienceEntry; readonly revision: string }[];
  readonly presentation: ExperiencePresentation;
  readonly purpose: 'reflection' | 'decision';
}

/** One model-facing meaning is shared by Source and Native. The caller owns
 * permitted source selection, exact personal versions and current-state proof. */
export function appraisalContextFromRead(
  read: AppraisalContextRead,
  frame?: ModelSpatialFrame,
  sharedExperiences?: ReadonlyMap<string, SharedModelExperience>,
) {
  const subjectRef = (id: string | null) =>
    id === null
      ? null
      : (Object.keys(read.subjects).find((key) => read.subjects[key] === id) ?? null);
  return {
    ...(sharedExperiences?.size
      ? {
          sourceReferences:
            'An experience.reference is the handle of an exact complete experience record in this same request. Read that record for the cause; each cause handle keeps its own native binding.',
        }
      : {}),
    feelings: [...read.records].map(([handle, record]) => ({
      handle,
      revision: record.revision,
      label: record.feeling,
      subject: subjectRef(record.targetId),
      value: record.value,
      lifetime: record.lifetime,
      coverage: record.coverage,
      editable: (() => {
        const definition = read.recordDefinitions.get(handle);
        return (
          !!definition &&
          (read.purpose === 'decision' ? definition.decision : definition.reflection)
        );
      })(),
    })),
    policies: [...read.definitions].map(([handle, definition]) => ({
      handle,
      label: definition.label,
      value: definition.value,
      lifetime: definition.lifetime.kind,
    })),
    sources: [...read.sources].map(([handle, source], index) => {
      const entry = read.selected[index]!,
        shared = sharedExperiences?.get(experienceEntryKey(entry.entry));
      return {
        handle,
        experience:
          shared?.revision === entry.revision
            ? { reference: shared.experience.handle }
            : experienceForModel(
                entry.entry,
                experienceModelBindings(
                  read.presentation,
                  read.actorId,
                  entry.entry,
                  handle,
                  frame,
                ),
              ),
        coverage: source.coverage,
        subjects: source.subjectIds.flatMap((id) => (subjectRef(id) ? [subjectRef(id)] : [])),
      };
    }),
  };
}

export function appraisalValueSchema(definition: AppraisalDefinition | undefined) {
  if (!definition) throw new Error('The supplied appraisal definition is unavailable.');
  const variants = decisionAppraisalSchema.options[0].shape.value.options;
  return definition.value.kind === 'scaled'
    ? variants[1].extend({
        value: z.number().finite().min(definition.value.min).max(definition.value.max),
      })
    : variants[0];
}

export function appraisalDecisionSchema(
  context: ReturnType<typeof appraisalContextFromRead>,
  subjects: Readonly<Record<string, string>>,
  valueSchema: (handle: string) => ReturnType<typeof appraisalValueSchema>,
) {
  const policies = context.policies.map((policy) => policy.handle),
    causes = context.sources.map((source) => source.handle),
    feelings = context.feelings
      .filter((feeling) => feeling.editable)
      .map((feeling) => feeling.handle);
  const variants: z.ZodType<DecisionAppraisalProposal>[] = [];
  if (causes.length) {
    for (const policy of policies)
      variants.push(
        decisionAppraisalSchema.options[0].extend({
          definition: z.literal(policy),
          source: z.enum(causes),
          target: z.enum(Object.keys(subjects)).nullable(),
          value: valueSchema(policy),
        }),
      );
    for (const feeling of feelings)
      variants.push(
        decisionAppraisalSchema.options[1].extend({
          appraisal: z.literal(feeling),
          source: z.enum(causes),
          value: valueSchema(feeling),
        }),
      );
  }
  if (feelings.length)
    variants.push(decisionAppraisalSchema.options[2].extend({ appraisal: z.enum(feelings) }));
  return variants.length ? z.union(variants) : undefined;
}
