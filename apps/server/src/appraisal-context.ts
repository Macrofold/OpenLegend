import {
  activeAppraisals,
  appraisalById,
  appraisalDefinition,
  appraisalPin,
  appraisalCreationIdentity,
  type AppraisalBindings,
  type AppraisalChange,
  type AppraisalEvidence,
} from '@open-legend/domain';
import type { WorldService } from './world-service.js';
import type { AppraisalProposal } from './cognition-contracts.js';

/** One request's source/subject/appraisal capabilities. Generated output can select
 * supplied handles, never fabricate canonical sources, pins or another actor's state. */
export async function bindReflectionAppraisals(
  service: WorldService,
  actorId: string,
  jobId: string,
  evidenceIds: string[],
  subjects: Record<string, string>,
) {
  await service.flush();
  const world = service.world,
    generation = service.generation;
  const head = await service.store.records?.head();
  const scope = head && { worldId: world.id, actorId, generation: head.generation };
  const repository = service.store.memories;
  const selected =
    scope && repository ? await repository.appraisalSources(scope, evidenceIds.slice(0, 48)) : [];
  const sources = new Map<string, AppraisalEvidence>(
    selected.map((entry, index) => [
      `cause${index + 1}`,
      {
        kind: 'remembered',
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
  const records = new Map(
    activeAppraisals(world, actorId).map((value, index) => [`feeling${index + 1}`, value]),
  );
  const definitions = new Map(
    (world.moduleManifest.appraisals?.definitions ?? [])
      .filter((definition) => definition.reflection)
      .map((definition, index) => [`policy${index + 1}`, definition]),
  );
  const proof = selected.map((entry) => ({ id: entry.memory.id, revision: entry.revision }));
  const sourcesCurrent = async () =>
    generation === service.generation &&
    world.id === service.world.id &&
    world.appraisals?.[actorId] === service.world.appraisals?.[actorId] &&
    world.moduleManifest.appraisals === service.world.moduleManifest.appraisals &&
    world.knowledgeRevisions?.[actorId] === service.world.knowledgeRevisions?.[actorId] &&
    world.authorship.playerAccountIds[actorId] ===
      service.world.authorship.playerAccountIds[actorId] &&
    (!scope || !repository || (await repository.current(scope, proof)));
  if (!(await sourcesCurrent()))
    throw new Error('Appraisal sources changed during context preparation.');
  const subjectRef = (id: string | null) =>
    id === null ? null : (Object.keys(subjects).find((key) => subjects[key] === id) ?? null);
  const bindings: AppraisalBindings = {
    sources: [...sources.values()],
    subjects: Object.values(subjects),
    reflection: true,
  };
  let createIds: string[] = [];
  const current = async () => {
    if (!(await sourcesCurrent())) return false;
    if (createIds.length) {
      if (!service.store.records) return false;
      bindings.priorOutcomes = await service.store.records.appraisalOutcomes(
        world.id,
        actorId,
        createIds,
      );
      bindings.completeCreates = createIds;
    }
    return sourcesCurrent();
  };
  return {
    current,
    bindings,
    context: {
      feelings: [...records].map(([handle, record]) => ({
        handle,
        revision: record.revision,
        label: record.feeling,
        subject: subjectRef(record.targetId),
        value: record.value,
        lifetime: record.lifetime,
        coverage: record.coverage,
        editable: !!appraisalDefinition(world, record.definitionPin)?.reflection,
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
        const record = existing && appraisalById(world, actorId, existing.id);
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
            : record && appraisalDefinition(world, record.definitionPin);
        if (!source || !definition || !definition.reflection)
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
        const definition = appraisalDefinition(world, change.definitionPin)!;
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
