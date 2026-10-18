import { entityGet } from '@open-legend/domain';
import {
  activeAppraisals,
  scopedAppraisals,
  renderNarration,
  subjectNarration,
  person,
  presentVerb,
  appraisalById,
  appraisalDefinition,
  appraisalPin,
  appraisalCreationIdentity,
  type AppraisalBindings,
  type AppraisalChange,
  type AppraisalEvidence,
  type WorldState,
  type AppraisalScope,
} from '@open-legend/domain';
import type { WorldService } from './world-service.js';
import type { DecisionAppraisalProposal, AppraisalProposal } from './cognition-contracts.js';
import { decisionAppraisalSchema } from './cognition-contracts.js';
import { z } from 'zod';

interface AppraisalPreparation {
  requiredFeelings?: readonly AppraisalScope[];
  completeSources?: boolean;
  /** Only a closed supplied strategy may restrict its possible writes this way. */
  guard?: 'all' | 'required';
}

/** Feelings are the actor's interpretation, not knowledge of somebody else's mind.
 * A missing target does not mean that the accepted feeling has an unknown cause.
 * docs/projects/parallel-batch-03-personal-game-tech-design.md#representation-choices */
function selectedFeelings(world: WorldState, actorId: string, required: readonly AppraisalScope[]) {
  return [
    ...new Map(
      [
        ...activeAppraisals(world, actorId),
        ...(required.length ? scopedAppraisals(world, actorId, required) : []),
      ].map((value) => [value.id, value]),
    ).values(),
  ];
}
export function decisionFeelings(
  world: WorldState,
  actorId: string,
  required: readonly AppraisalScope[] = [],
): string {
  return selectedFeelings(world, actorId, required)
    .map((value) => {
      return renderNarration(
        world,
        subjectNarration(actorId, [
          presentVerb(actorId, 'feel'),
          ` ${value.feeling}`,
          ...(value.targetId && entityGet(world.entities, value.targetId)
            ? [
                ' concerning ',
                person(value.targetId, value.targetId === actorId ? 'reflexive' : 'object'),
              ]
            : []),
          (() => {
            const definition = appraisalDefinition(world, value.definitionPin);
            if (!definition) throw new Error('An appraisal definition is unavailable.');
            const amount =
              value.value.kind === 'scaled' && definition.value.kind === 'scaled'
                ? `; current intensity ${value.value.value} on the installed ${definition.value.min}–${definition.value.max} scale`
                : '';
            const duration =
              definition.lifetime.kind === 'decays'
                ? `decays by ${definition.lifetime.perHour} per game hour without a new interpretation`
                : value.lifetime;
            return `${amount}. Source: ${value.coverage}; lifetime: ${duration}.`;
          })(),
        ]),
        actorId,
      );
    })
    .join(' ');
}

/** One request's source/subject/appraisal capabilities. Generated output can select
 * supplied handles, never fabricate canonical sources, pins or another actor's state. */
async function bindAppraisals(
  service: WorldService,
  actorId: string,
  jobId: string,
  evidenceIds: string[],
  subjects: Record<string, string>,
  purpose: 'reflection' | 'decision',
  triggerEvidenceId?: string,
  preparation: AppraisalPreparation = {},
) {
  const { requiredFeelings = [], completeSources = false, guard = 'all' } = preparation;
  await service.flush();
  const world = service.world,
    generation = service.generation;
  const head = await service.store.records?.head();
  const scope = head && { worldId: world.id, actorId, generation: head.generation };
  const repository = service.store.memories;
  const requested = [...new Set(evidenceIds)];
  if (completeSources && requested.length > 48)
    throw new Error('The complete appraisal source set exceeds its admitted work limit.');
  const selected =
    scope && repository
      ? await repository.appraisalSources(
          scope,
          completeSources ? requested : requested.slice(0, 48),
        )
      : [];
  if (
    completeSources &&
    requested.some(
      (id) => !selected.some((entry) => entry.memory.id === id || entry.memory.eventId === id),
    )
  )
    throw new Error('A required personal appraisal source is unavailable.');
  const sources = new Map<string, AppraisalEvidence>(
    selected.map((entry, index) => [
      `cause${index + 1}`,
      {
        kind:
          purpose === 'decision' && entry.awareness && entry.memory.eventId === triggerEvidenceId
            ? 'perceived-event'
            : 'remembered',
        actorId,
        sourceId: entry.memory.id,
        sourceVersion: entry.revision,
        occurrenceId: entry.memory.eventId ?? entry.memory.id,
        coverage: entry.memory.source,
        subjectIds: entry.memory.entityIds,
        recallEpisodeId: jobId,
      },
    ]),
  );
  const worldId = world.id;
  const appraisalState = world.appraisals?.[actorId];
  const requiredRevisions =
    guard === 'required'
      ? new Map(
          scopedAppraisals(world, actorId, requiredFeelings).map(({ id, revision }) => [
            id,
            revision,
          ]),
        )
      : undefined;
  const installed = world.moduleManifest.appraisals;
  const knowledgeRevision = world.knowledgeRevisions?.[actorId];
  const ownerAccount = world.authorship.playerAccountIds[actorId];
  const permitted = (definition: NonNullable<typeof installed>['definitions'][number]) =>
    purpose === 'decision' ? definition.decision : definition.reflection;
  const records = new Map(
    selectedFeelings(world, actorId, requiredFeelings).map((value, index) => [
      `feeling${index + 1}`,
      value,
    ]),
  );
  const recordDefinitions = new Map(
    [...records].map(([handle, record]) => [
      handle,
      appraisalDefinition(world, record.definitionPin),
    ]),
  );
  const definitions = new Map(
    (world.moduleManifest.appraisals?.definitions ?? [])
      .filter(permitted)
      .map((definition, index) => [`policy${index + 1}`, definition]),
  );
  const proof = selected.map((entry) => ({
    id: entry.memory.id,
    sourceKind: entry.sourceKind,
    revision: entry.revision,
  }));
  const sourceCurrent = async () =>
    generation === service.generation &&
    worldId === service.world.id &&
    [...definitions.values()].every(
      (definition) => appraisalDefinition(service.world, appraisalPin(definition)) === definition,
    ) &&
    knowledgeRevision === service.world.knowledgeRevisions?.[actorId] &&
    ownerAccount === service.world.authorship.playerAccountIds[actorId] &&
    (!scope || !repository || (await repository.current(scope, proof)));
  const feelingsCurrent = () => {
    if (appraisalState === service.world.appraisals?.[actorId]) return true;
    if (!requiredRevisions) return false;
    // New bodily discomfort is not a changed interpretation of fear or anger.
    // Preserve actual subscribed revisions, including absence and native decay;
    // the native writer still validates every exact proposed operation.
    const current = scopedAppraisals(service.world, actorId, requiredFeelings);
    return (
      current.length === requiredRevisions.size &&
      current.every(({ id, revision }) => requiredRevisions.get(id) === revision)
    );
  };
  const sourcesCurrent = async () =>
    feelingsCurrent() &&
    installed === service.world.moduleManifest.appraisals &&
    (await sourceCurrent());
  if (!(await sourcesCurrent()))
    throw new Error('Appraisal sources changed during context preparation.');
  const subjectRef = (id: string | null) =>
    id === null ? null : (Object.keys(subjects).find((key) => subjects[key] === id) ?? null);
  const bindings: AppraisalBindings = {
    sources: [...sources.values()],
    subjects: Object.values(subjects),
    ...(purpose === 'decision' ? { decision: true } : { reflection: true }),
  };
  let createIds: string[] = [];
  const current = async () => {
    if (!(await sourcesCurrent())) return false;
    if (createIds.length) {
      if (!service.store.records) return false;
      bindings.priorOutcomes = await service.store.records.appraisalOutcomes(
        worldId,
        actorId,
        createIds,
      );
      bindings.completeCreates = createIds;
    }
    return sourcesCurrent();
  };
  return {
    current,
    sourceCurrent,
    sources,
    definitions,
    records,
    bindings,
    valueSchema(handle: string) {
      const definition = definitions.get(handle) ?? recordDefinitions.get(handle);
      if (!definition) throw new Error('The supplied appraisal definition is unavailable.');
      const variants = decisionAppraisalSchema.options[0].shape.value.options;
      // Match each installed feeling's kind and scale before asking the model.
      // Native admission still owns whether the proposal is warranted and current.
      return definition.value.kind === 'scaled'
        ? variants[1].extend({
            value: z.number().finite().min(definition.value.min).max(definition.value.max),
          })
        : variants[0];
    },
    context: {
      feelings: [...records].map(([handle, record]) => ({
        handle,
        revision: record.revision,
        label: record.feeling,
        subject: subjectRef(record.targetId),
        value: record.value,
        lifetime: record.lifetime,
        coverage: record.coverage,
        editable: (() => {
          const definition = recordDefinitions.get(handle);
          return !!definition && permitted(definition);
        })(),
      })),
      policies: [...definitions].map(([handle, definition]) => ({
        handle,
        label: definition.label,
        value: definition.value,
        lifetime: definition.lifetime.kind,
      })),
      sources: [...sources].map(([handle, source]) => ({
        handle,
        evidence: source.sourceId,
        coverage: source.coverage,
        subjects: source.subjectIds.flatMap((id) => (subjectRef(id) ? [subjectRef(id)] : [])),
      })),
    },
    resolve(proposals: AppraisalProposal[]): AppraisalChange[] {
      const changes: AppraisalChange[] = proposals.map((proposal) => {
        const existing = proposal.appraisal ? records.get(proposal.appraisal) : undefined;
        const record = existing && appraisalById(service.world, actorId, existing.id);
        if (proposal.kind === 'resolve') {
          if (
            !record ||
            proposal.expectedRevision !== record.revision ||
            proposal.policy !== null ||
            proposal.source !== null ||
            proposal.subject !== null ||
            proposal.value !== null
          )
            throw new Error('Invalid supplied appraisal resolution.');
          return { kind: 'resolve', id: record.id, expectedRevision: record.revision };
        }
        const source = proposal.source ? sources.get(proposal.source) : undefined;
        const definition =
          proposal.kind === 'create'
            ? proposal.policy && definitions.get(proposal.policy)
            : record && appraisalDefinition(service.world, record.definitionPin);
        if (!source || !definition || !permitted(definition))
          throw new Error('The appraisal source or policy was not supplied.');
        const value =
          definition.value.kind === 'qualitative'
            ? { kind: 'qualitative' as const }
            : { kind: 'scaled' as const, value: proposal.value! };
        if ((definition.value.kind === 'qualitative') !== (proposal.value === null))
          throw new Error('Unsupported appraisal scale.');
        if (proposal.kind === 'create') {
          if (
            proposal.appraisal !== null ||
            proposal.expectedRevision !== null ||
            (proposal.subject !== null && !Object.hasOwn(subjects, proposal.subject))
          )
            throw new Error('Invalid appraisal creation binding.');
          return {
            kind: 'create',
            definitionPin: appraisalPin(definition),
            source,
            targetId: proposal.subject === null ? null : subjects[proposal.subject]!,
            value,
          };
        }
        if (
          !record ||
          proposal.expectedRevision !== record.revision ||
          proposal.policy !== null ||
          proposal.subject !== null
        )
          throw new Error('Invalid supplied appraisal reframe.');
        return { kind: 'reframe', id: record.id, expectedRevision: record.revision, source, value };
      });
      createIds = changes.flatMap((change) => {
        if (change.kind !== 'create') return [];
        const definition = appraisalDefinition(service.world, change.definitionPin)!;
        return [
          appraisalCreationIdentity(
            actorId,
            change.definitionPin,
            change.targetId,
            change.source.occurrenceId,
            definition.stacking,
          ).id,
        ];
      });
      return changes;
    },
  };
}

export function bindReflectionAppraisals(
  service: WorldService,
  actorId: string,
  jobId: string,
  evidenceIds: string[],
  subjects: Record<string, string>,
) {
  return bindAppraisals(service, actorId, jobId, evidenceIds, subjects, 'reflection');
}

export async function bindDecisionAppraisals(
  service: WorldService,
  actorId: string,
  jobId: string,
  evidenceIds: string[],
  subjects: Record<string, string>,
  triggerEvidenceId?: string,
  preparation: AppraisalPreparation = {},
) {
  const ids = [...new Set([...(triggerEvidenceId ? [triggerEvidenceId] : []), ...evidenceIds])];
  const bound = await bindAppraisals(
    service,
    actorId,
    jobId,
    ids,
    subjects,
    'decision',
    triggerEvidenceId,
    preparation,
  );
  return {
    ...bound,
    schema: (() => {
      const policies = bound.context.policies.map((policy) => policy.handle);
      const causes = bound.context.sources.map((source) => source.handle);
      const feelings = bound.context.feelings
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
              value: bound.valueSchema(policy),
            }),
          );
        for (const feeling of feelings)
          variants.push(
            decisionAppraisalSchema.options[1].extend({
              appraisal: z.literal(feeling),
              source: z.enum(causes),
              value: bound.valueSchema(feeling),
            }),
          );
      }
      if (feelings.length)
        variants.push(decisionAppraisalSchema.options[2].extend({ appraisal: z.enum(feelings) }));
      return variants.length ? z.union(variants) : undefined;
    })(),
    resolveDecision(proposals: DecisionAppraisalProposal[]) {
      return bound.resolve(
        proposals.map((proposal) => {
          const existing =
            'appraisal' in proposal
              ? bound.context.feelings.find((feeling) => feeling.handle === proposal.appraisal)
              : undefined;
          return {
            kind: proposal.kind,
            appraisal: 'appraisal' in proposal ? proposal.appraisal : null,
            expectedRevision: existing?.revision ?? null,
            policy: proposal.kind === 'create' ? proposal.definition : null,
            source: 'source' in proposal ? proposal.source : null,
            subject: proposal.kind === 'create' ? proposal.target : null,
            value:
              'value' in proposal && proposal.value.kind === 'scaled' ? proposal.value.value : null,
          };
        }),
      );
    },
  };
}
