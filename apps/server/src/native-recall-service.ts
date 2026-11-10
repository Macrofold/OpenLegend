import { acceptedMindDocumentText, experienceEntryKey } from '@open-legend/domain';
import type { JudgeRequest, JudgeValue, EmbeddingRequest, AiResult } from '@open-legend/ai';
import type { NativeWorldService } from './native-world-service.js';
import type { NativeNpcCapture } from './native-npc-capture.js';
import type { MemoryScope, MemoryReadCache } from './memory-repository.js';
import { memorySourceProof } from './memory-repository.js';
import type { RecallSelectionRuntime } from './recall-selection.js';
import { selectRecall } from './recall-selection.js';
import { retrieveRecall } from './recall-retrieval.js';
import { nativeMemoryCandidates, nativeSourcePresentation } from './native-recall.js';
import { nativeKnowledgeCandidates } from './native-knowledge-context.js';
import type { AttentionCandidate } from './recall.js';
import { retainNativeSources } from './native-consumer.js';
import {
  projectEntityMarkersFromRead,
  personalEntityHandle,
  personalEntityHandleInputBytes,
} from './entity-references.js';
import { nativeNpcPersonalSelection } from './native-npc-sources.js';
import type { NativeNpcSubjectFact } from './native-npc-sources.js';

export function nativeEntityMarkerFactCount(capture: NativeNpcCapture): number {
  const metadata = capture.facts.referenceFacts;
  let count = 1 + metadata.knowledge.length + metadata.social.length;
  for (const body of metadata.bodies) count += body.subjects.length + 1;
  for (const source of capture.sources())
    for (const record of source.personal)
      count += record.attribution.entitySubjects.length + record.attribution.subjects.length;
  return count;
}

/** The existing presentation reader, in the same first-match fact order.
 * Its caller admits the actual fact vector before constructing it. */
export function nativeEntityMarkerReader(capture: NativeNpcCapture) {
  const { self, referenceFacts } = capture.facts;
  const facts = new Array<NativeNpcSubjectFact>(nativeEntityMarkerFactCount(capture));
  let at = 0;
  facts[at++] = referenceFacts.myself;
  for (const fact of referenceFacts.knowledge) facts[at++] = fact;
  for (const fact of referenceFacts.social) facts[at++] = fact;
  for (const body of referenceFacts.bodies) {
    for (const fact of body.subjects) facts[at++] = fact;
    facts[at++] = body.entity;
  }
  for (const source of capture.sources())
    for (const record of source.personal) {
      for (const fact of record.attribution.entitySubjects) facts[at++] = fact;
      for (const fact of record.attribution.subjects) facts[at++] = fact;
    }
  return {
    hashInputBytes() {
      let bytes = 0;
      for (const fact of facts)
        if (
          fact.subject.kind === 'entity' &&
          fact.canAddressRemembered &&
          fact.referenceAttribution !== undefined
        )
          bytes = Math.max(
            bytes,
            personalEntityHandleInputBytes(
              { id: self.worldId },
              self.actorId,
              fact.subject.entityId,
              fact.referenceAttribution,
            ),
          );
      return bytes;
    },
    reference(id: string) {
      const fact = facts.find(
        (fact) => fact.subject.kind === 'entity' && fact.subject.entityId === id,
      );
      return fact?.canAddressRemembered && fact.referenceAttribution !== undefined
        ? personalEntityHandle({ id: self.worldId }, self.actorId, id, fact.referenceAttribution)
        : undefined;
    },
  };
}

/** Projection uses acquired associations, never an ID found in prose. */
export function nativeProjectEntityMarkers(text: string, capture: NativeNpcCapture): string {
  return projectEntityMarkersFromRead(text, nativeEntityMarkerReader(capture).reference);
}

export type NativeRecallRuntime = Omit<
  RecallSelectionRuntime,
  'current' | 'retrieval' | 'noteCoverage' | 'embed'
> & {
  embed(
    request: EmbeddingRequest,
    current: () => boolean | Promise<boolean>,
    publish: <T>(start: () => T) => Promise<{ result: T }>,
  ): Promise<AiResult<number[][]>>;
};

/** The ordinary indexed retrieval and attention algorithms run on admitted
 * native facts. Each repository operation acquires its own actual SQL/pending
 * cut; no database transaction or native publication gate spans a model wait. */
export async function retrieveNativeRecall(input: {
  service: NativeWorldService;
  original: NativeNpcCapture;
  runtime: NativeRecallRuntime;
  scope: MemoryScope;
  requiredIds: string[];
  automaticIds: string[];
  conversationIds: string[];
  conversationSourceIds: string[];
  stimulus: string;
  requestId: string;
  signal: AbortSignal;
  budgetCeiling: number;
  bodies: MemoryReadCache;
  mode: 'ordinary' | 'native-only';
  current(): Promise<boolean>;
}) {
  const { service, original, scope, runtime } = input;
  const repository = service.store.memories;
  if (!repository) throw new Error('Native recall requires the actor-scoped memory repository.');
  const actorId = scope.actorId;
  const sql = <T>(operation: () => Promise<T>) => service.withActorMemoryRead(actorId, operation);
  let noteCapture: NativeNpcCapture | undefined;
  try {
    const recalled = await retrieveRecall({
      ...input,
      runtime: {
        ...runtime,
        store: service.store,
        current: input.current,
        embed: (request, current) =>
          runtime.embed(request, current, (start) => service.publishNpcHistory(original, start)),
      },
      repository: {
        coverage: (...args) => sql(() => repository.coverage(...args)),
        required: (...args) => sql(() => repository.required(...args)),
        select: (...args) => sql(() => repository.select(...args)),
        knowledgeCandidates: (...args) => sql(() => repository.knowledgeCandidates(...args)),
      },
      worldId: scope.worldId,
      actorId,
      query: `${input.stimulus}\nMy current goal: ${nativeProjectEntityMarkers(original.firstPersonContext().goal, original)}\n${acceptedMindDocumentText(original.facts.self.mind.documents) ?? ''}`,
      currentNoteIds: async (rows) => {
        if (!rows.length) return [];
        // Notes can change during indexed/embedding work. This is a genuine
        // current capture, not a current-world facade or a global-cut veto.
        noteCapture = (await service.captureNpc(actorId, [])).capture;
        const notes = noteCapture.facts.self.knowledge ?? {};
        return rows.flatMap((row) => (notes[row.id]?.revision === row.revision ? [row.id] : []));
      },
      formatCandidates: async (records, noteIds) => {
        const sources = await service.prepareNpcSources(
          original,
          {
            receipts: [],
            personal: records.map(nativeNpcPersonalSelection),
          },
          input.signal,
        );
        if (sources.unavailablePersonal.length)
          throw new Error('Selected recall was withdrawn during native admission.');
        const presentation = await service.prepareNpcExperiencePresentation(
          original,
          sources.personal.map((source) => source.value),
        );
        const context = nativeSourcePresentation(sources.personal, original, service.definitions, {
          presentation,
        });
        const candidates = [
          ...nativeMemoryCandidates(
            sources.personal,
            original,
            service.definitions,
            context,
            input.requiredIds,
            input.automaticIds,
            input.conversationIds,
          ),
          ...original.recallEntities(),
        ];
        const involved = new Set(
          candidates
            .filter((candidate) => candidate.required || candidate.automatic)
            .flatMap((candidate) => candidate.entityIds),
        );
        for (const body of original.candidates().bodyOrdinals)
          involved.add(original.facts.perception.bodies[body]!.sourceId);
        if (noteIds.length) {
          if (!noteCapture) throw new Error('Native recall has no current note capture.');
          candidates.push(
            ...nativeKnowledgeCandidates(noteCapture, service.definitions, involved, noteIds),
          );
        }
        return retainNativeSources(
          candidates,
          original.facts,
          original.sources(),
          service.definitions.facts,
          ...(noteCapture ? [noteCapture.facts] : []),
        );
      },
    });
    const scores = new Map(
      recalled.sources.map((source) => [experienceEntryKey(source.entry), source.score]),
    );
    for (const candidate of recalled.candidates)
      if (scores.get(candidate.id) !== undefined) candidate.score = scores.get(candidate.id);
    const proofs = new Map(
      recalled.sources.map((source) => [
        experienceEntryKey(source.entry),
        memorySourceProof(source),
      ]),
    );
    return {
      candidates: recalled.candidates,
      retrieval: recalled.retrieval,
      noteCoverage: recalled.noteCoverage,
      selectedSources(selected: readonly AttentionCandidate[]) {
        const keys = new Set(
          selected.flatMap((candidate) => candidate.sourceKeys ?? [candidate.id]),
        );
        return [...keys].flatMap((key) => (proofs.has(key) ? [proofs.get(key)!] : []));
      },
    };
  } finally {
    noteCapture?.release();
  }
}

export function selectNativeRecall(input: {
  service: NativeWorldService;
  original: NativeNpcCapture;
  runtime: NativeRecallRuntime &
    Pick<RecallSelectionRuntime, 'current' | 'retrieval' | 'noteCoverage'>;
  stimulus: string;
  jobId: string;
  candidates: AttentionCandidate[];
  judge(request: Omit<JudgeRequest, 'requestId' | 'signal'>): Promise<JudgeValue>;
  signal: AbortSignal;
  budgetCeiling: number;
  optionalByteBudget: number;
  immediateContext: Record<string, unknown>;
  mode: 'ordinary' | 'native-only';
}) {
  const { original } = input;
  const { self, perception } = original.facts;
  return selectRecall(
    {
      ...input.runtime,
      embed: (request, current) =>
        input.runtime.embed(request, current, (start) =>
          input.service.publishNpcHistory(original, start),
        ),
    },
    {
      worldId: self.worldId,
      inner: self.innerWorld
        ? {
            text: acceptedMindDocumentText(self.mind.documents),
            revision: self.innerWorld.revision,
          }
        : undefined,
      records: self.mind.records,
      people: original.candidates().bodyOrdinals.flatMap((ordinal) => {
        const body = perception.bodies[ordinal]!;
        return body.actor ? [body.sourceId] : [];
      }),
      goal: nativeProjectEntityMarkers(original.firstPersonContext().goal, original),
      forgotten: [...(self.npc.forgotten ?? [])],
    },
    self.actorId,
    input.stimulus,
    input.jobId,
    input.candidates,
    input.judge,
    input.signal,
    input.budgetCeiling,
    input.optionalByteBudget,
    input.immediateContext,
    input.mode,
  );
}
