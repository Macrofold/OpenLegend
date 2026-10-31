import { memorySourceProof } from './memory-repository.js';
import { entityGet } from '@open-legend/domain';
import {
  activeAppraisals,
  canonicalJson,
  experienceEntryKey,
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
  type ExperienceSourceReference,
} from '@open-legend/domain';
import type { WorldService } from './world-service.js';
import type { DecisionAppraisalProposal, AppraisalProposal } from './cognition-contracts.js';
import { decisionAppraisalSchema } from './cognition-contracts.js';
import { z } from 'zod';
import {
  experienceForModel,
  experienceModelBindings,
  type SharedModelExperience,
} from './perceived-context.js';

interface AppraisalPreparation {
  requiredFeelings?: readonly AppraisalScope[];
  completeSources?: boolean;
  /** Only a closed supplied strategy may restrict its possible writes this way. */
  guard?: 'all' | 'required';
  /** The caller includes the exact complete character.experience array. */
  sharedExperiences?: ReadonlyMap<string, SharedModelExperience>;
  /** Fixed feeling/policy wording already measured at the decision's source time. */
  contextSnapshot?: ReturnType<typeof captureDecisionAppraisalContext>;
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

function appraisalContextState(
  world: WorldState,
  actorId: string,
  purpose: 'decision' | 'reflection',
  required: readonly AppraisalScope[] = [],
) {
  const permitted = (
    definition: NonNullable<WorldState['moduleManifest']['appraisals']>['definitions'][number],
  ) => (purpose === 'decision' ? definition.decision : definition.reflection);
  const records = new Map(
    selectedFeelings(world, actorId, required).map((value, index) => [
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
  return { records, recordDefinitions, definitions, permitted };
}

type AppraisalContextSource = {
  handle: string;
  experience: ReturnType<typeof experienceForModel> | { reference: string };
  coverage: AppraisalEvidence['coverage'];
  subjects: string[];
};

const appraisalSourceOrder = (a: { id: string; kind: string }, b: { id: string; kind: string }) =>
  a.id < b.id ? -1 : a.id > b.id ? 1 : a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0;

function renderAppraisalContext(
  state: ReturnType<typeof appraisalContextState>,
  subjects: Record<string, string>,
  sources: AppraisalContextSource[],
  shared: boolean,
) {
  const byId = new Map(Object.entries(subjects).map(([handle, id]) => [id, handle]));
  return {
    ...(shared
      ? {
          sourceReferences:
            'An experience.reference names the exact complete record at character.experience[index] in this same request. Read that record for the cause; each cause handle keeps its own native binding.',
        }
      : {}),
    feelings: [...state.records].map(([handle, record]) => ({
      handle,
      revision: record.revision,
      label: record.feeling,
      subject: record.targetId === null ? null : (byId.get(record.targetId) ?? null),
      value: record.value,
      lifetime: record.lifetime,
      coverage: record.coverage,
      editable: (() => {
        const definition = state.recordDefinitions.get(handle);
        return !!definition && state.permitted(definition);
      })(),
    })),
    policies: [...state.definitions].map(([handle, definition]) => ({
      handle,
      label: definition.label,
      value: definition.value,
      lifetime: definition.lifetime.kind,
    })),
    sources,
  };
}

/** Capture fixed interpretation capabilities once. Optional fitting projects only
 * already-selected complete sources; it performs no reads or native effects. */
export function captureDecisionAppraisalContext(world: WorldState, actorId: string) {
  const original = appraisalContextState(world, actorId, 'decision');
  const state = {
    ...original,
    records: structuredClone(original.records),
    definitions: structuredClone(original.definitions),
    recordDefinitions: structuredClone(original.recordDefinitions),
  };
  const capturedState = canonicalJson(world.appraisals?.[actorId] ?? {});
  const capturedPolicies = canonicalJson(world.moduleManifest.appraisals ?? null);
  const project = (input: {
    evidenceIds: readonly string[];
    sharedExperiences: ReadonlyMap<string, SharedModelExperience>;
    entityReferences: Record<string, string>;
    triggerEvidenceId?: string;
  }) => {
    const ids = new Set(
      [
        ...new Set([
          ...(input.triggerEvidenceId ? [input.triggerEvidenceId] : []),
          ...input.evidenceIds,
        ]),
      ].slice(0, 48),
    );
    const selected = [...input.sharedExperiences]
      .map(([key, shared]) => {
        const [kind, id] = JSON.parse(key) as [string, string];
        return { kind, id, shared };
      })
      .filter(({ id }) => ids.has(id))
      .sort(appraisalSourceOrder);
    const sources: AppraisalContextSource[] = selected.map(({ shared }, index) => {
      const experience = shared.experience;
      const coverage =
        experience.source === 'awareness'
          ? experience.value['modality']
          : experience.source === 'memory'
            ? experience.value['source']
            : 'inferred';
      if (typeof coverage !== 'string')
        throw new Error('A selected appraisal source has no acquisition coverage.');
      return {
        handle: `cause${index + 1}`,
        experience: { reference: `character.experience[${shared.index}]` },
        coverage,
        subjects: (experience.value['entityIds'] as string[]).filter((handle) =>
          Object.hasOwn(input.entityReferences, handle),
        ),
      };
    });
    return renderAppraisalContext(
      state,
      input.entityReferences,
      sources,
      input.sharedExperiences.size > 0,
    );
  };
  return {
    project,
    render: (
      subjects: Record<string, string>,
      sources: AppraisalContextSource[],
      shared: boolean,
    ) => renderAppraisalContext(state, subjects, sources, shared),
    current: (current: WorldState) =>
      capturedState === canonicalJson(current.appraisals?.[actorId] ?? {}) &&
      capturedPolicies === canonicalJson(current.moduleManifest.appraisals ?? null),
  };
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
  const requestedIds = completeSources ? requested : requested.slice(0, 48);
  const exactSources = preparation.contextSnapshot
    ? [...(preparation.sharedExperiences ?? [])].flatMap(([key, source]) => {
        const [kind, id] = JSON.parse(key) as [ExperienceSourceReference['kind'], string];
        return requestedIds.includes(id) ? [{ kind, id, revision: source.revision }] : [];
      })
    : undefined;
  const resolved =
    scope && repository ? await repository.appraisalSources(scope, requestedIds, exactSources) : [];
  // A measured ordinary request grants exact selected sources, not additional
  // records which happen to alias the same event ID. Keep source kinds distinct.
  const selected = resolved.sort((a, b) =>
    appraisalSourceOrder(
      { id: a.memory.id, kind: a.sourceKind },
      { id: b.memory.id, kind: b.sourceKind },
    ),
  );
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
        sourceKind: entry.entry.source,
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
  const contextState = appraisalContextState(world, actorId, purpose, requiredFeelings);
  const { permitted, records, recordDefinitions, definitions } = contextState;
  const proof = selected.map(memorySourceProof);
  const sourceCurrent = async () =>
    generation === service.generation &&
    worldId === service.world.id &&
    knowledgeRevision === service.world.knowledgeRevisions?.[actorId] &&
    ownerAccount === service.world.authorship.playerAccountIds[actorId] &&
    (!scope || !repository || (await repository.current(scope, proof)));
  const feelingsCurrent = () => {
    if (appraisalState === service.world.appraisals?.[actorId]) return true;
    // An unrelated publication may copy the same records. Exact contents, not
    // allocation identity, determine whether this person's interpretation changed.
    if (!requiredRevisions)
      return (
        canonicalJson(appraisalState ?? {}) ===
        canonicalJson(service.world.appraisals?.[actorId] ?? {})
      );
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
    (!preparation.contextSnapshot || preparation.contextSnapshot.current(service.world)) &&
    (installed === service.world.moduleManifest.appraisals ||
      canonicalJson(installed ?? null) ===
        canonicalJson(service.world.moduleManifest.appraisals ?? null)) &&
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
    context: (
      preparation.contextSnapshot?.render ??
      ((subjects, sources, shared) =>
        renderAppraisalContext(contextState, subjects, sources, shared))
    )(
      subjects,
      [...sources].map(([handle, source], index) => {
        const entry = selected[index]!,
          experience = experienceForModel(
            entry.entry,
            experienceModelBindings(world, actorId, entry.entry, handle),
          ),
          shared = preparation.sharedExperiences?.get(experienceEntryKey(entry.entry));
        // Exact private identity and revision are necessary but not enough: a
        // changed observer projection must retain its own complete wording.
        const same =
          shared?.revision === entry.revision &&
          canonicalJson({ ...shared.experience, handle: null }) ===
            canonicalJson({ ...experience, handle: null });
        return {
          handle,
          experience: same ? { reference: `character.experience[${shared.index}]` } : experience,
          coverage: source.coverage,
          subjects: source.subjectIds.flatMap((id) => {
            const reference = subjectRef(id);
            return reference ? [reference] : [];
          }),
        };
      }),
      !!preparation.sharedExperiences?.size,
    ),
    resolve(proposals: AppraisalProposal[]): AppraisalChange[] {
      const changes: AppraisalChange[] = proposals.map((proposal) => {
        const existing = 'appraisal' in proposal ? records.get(proposal.appraisal) : undefined;
        const record = existing && appraisalById(service.world, actorId, existing.id);
        if (proposal.kind === 'resolve') {
          if (!record || proposal.expectedRevision !== record.revision)
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
          if (proposal.subject !== null && !Object.hasOwn(subjects, proposal.subject))
            throw new Error('Invalid appraisal creation binding.');
          return {
            kind: 'create',
            definitionPin: appraisalPin(definition),
            source,
            targetId: proposal.subject === null ? null : subjects[proposal.subject]!,
            value,
          };
        }
        if (!record || proposal.expectedRevision !== record.revision)
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
          const value =
            'value' in proposal && proposal.value.kind === 'scaled' ? proposal.value.value : null;
          if (proposal.kind === 'create')
            return {
              kind: proposal.kind,
              policy: proposal.definition,
              source: proposal.source,
              subject: proposal.target,
              value,
            };
          if (!existing) throw new Error('The supplied appraisal is unavailable.');
          const current = {
            appraisal: proposal.appraisal,
            expectedRevision: existing.revision,
          };
          return proposal.kind === 'resolve'
            ? { kind: proposal.kind, ...current }
            : { kind: proposal.kind, ...current, source: proposal.source, value };
        }),
      );
    },
  };
}
