import {
  EXPERIENCE_LIMITS,
  experienceEntryKey,
  experienceReading,
  headingFrame,
  selectedCapturedSubjectLabelReader,
  subjectKey,
  type ActorMind,
  type MindFiles,
  type ObserverSubject,
  type Position,
} from '@open-legend/domain';
import { boundSummarySchema } from './cognition-contracts.js';
import type {
  MaintenanceHost,
  MaintenanceInterpretation,
  PreparedMaintenanceConsolidation,
} from './maintenance-host.js';
import { NativeMaintenanceRead } from './native-maintenance-read.js';
import type { NativeWorldService } from './native-world-service.js';
import type { NativeNpcSourceInventory, NativeNpcSubjectFact } from './native-npc-sources.js';
import { nativeExperienceEntry } from './native-recall.js';
import {
  decodeNativeProduct,
  freezeNativeProduct,
  retainNativeSources,
  releaseNativeProduct,
  withNativeJsonInput,
} from './native-consumer.js';
import { consolidationRequestsFromRead } from './memory-consolidation.js';
import { personalEntityHandle } from './entity-references.js';
import { retainedMemorySubjects, type CapturedExperienceContext } from './experience-context.js';
import { offerInterpretationRecordsFromRead } from './reflection-records.js';

interface ConsolidationPacket {
  readonly actorId: string;
  readonly innerRevision: number | null;
  readonly files: MindFiles;
  readonly sources: NativeNpcSourceInventory;
  readonly presentation: {
    readonly worldId: string;
    readonly generation: string;
    readonly actorId: string;
    readonly acceptedCut: number;
    readonly position: Position;
    readonly heading: number;
    readonly supportSurfaceId: string | null;
    readonly referenceAttribution: string | number;
    readonly forgotten: readonly string[];
    readonly corrected: readonly string[];
  };
}
interface InterpretationRead {
  readonly records: ActorMind['records'];
  readonly documents: readonly Pick<ActorMind['documents'][number], 'id' | 'revision'>[];
  readonly subjects: readonly (NativeNpcSubjectFact | null)[];
  readonly lastDreamEpisode: string | null;
}

/** Shared chronological/model formatting consumes admitted personal accounts.
 * Only the sealed native batch resolves dream aliases and retires sources. */
export async function prepareNativeConsolidation(input: {
  service: NativeWorldService;
  input: Parameters<MaintenanceHost['prepareConsolidation']>[0];
  body: NativeMaintenanceRead;
}): Promise<PreparedMaintenanceConsolidation> {
  const { service, body, input: request } = input;
  const { actorId, batch, admission, signal } = request;
  const ticket = await service.prepareConsolidation(
    body.native,
    actorId,
    Buffer.from(
      JSON.stringify({
        jobId: request.job.id,
        selection: {
          receipts: [],
          personal: batch.prepared.map(({ ref }) => ({ reference: ref })),
        },
        protectedImportance: EXPERIENCE_LIMITS.protectedImportance,
        summaryBytes: EXPERIENCE_LIMITS.summaryBytes,
        requiresBody: admission.requiresBody,
        ...(admission.dreamEpisode === undefined ? {} : { dreamEpisode: admission.dreamEpisode }),
      }),
    ),
    signal,
  );
  type Dream = Awaited<ReturnType<typeof service.world.bindConsolidationDream>>;
  const dreams = new Set<Dream>();
  const interpretations = new Map<object, { owner: Dream; value: MaintenanceInterpretation }>();
  const reports = new Set<Awaited<ReturnType<NativeWorldService['publishMaintenance']>>>();
  try {
    const packet = freezeNativeProduct(
      decodeNativeProduct<ConsolidationPacket>(await ticket.packet()),
    );
    if (packet.actorId !== actorId || packet.presentation.generation !== admission.generation)
      throw new Error('Consolidation belongs to another actor or generation.');
    if (packet.sources.unavailablePersonal.length || packet.sources.unavailableReceipts.length)
      throw new Error('Selected consolidation sources changed.');
    const sources = packet.sources.personal;
    const entries = sources.map(nativeExperienceEntry);
    const byKey = new Map(entries.map((entry) => [experienceEntryKey(entry), entry]));
    const labels = new Map(
      sources
        .flatMap((source) => source.attribution.presentationSubjects)
        .map((fact) => [subjectKey(fact.subject), fact.label] as const),
    );
    const frame = packet.presentation;
    const presentation: CapturedExperienceContext = retainNativeSources(
      {
        kind: 'captured-experience',
        id: frame.worldId,
        actorId,
        frame: {
          position: frame.position,
          axes: headingFrame(frame.heading),
          support: frame.supportSurfaceId,
        },
        ownerHandle: personalEntityHandle(
          { id: frame.worldId },
          actorId,
          actorId,
          frame.referenceAttribution,
        ),
        subjectLabel: selectedCapturedSubjectLabelReader(
          service.definitions.facts.definitions,
          labels,
        ),
        forgotten: new Set(frame.forgotten),
        corrected: new Set(frame.corrected),
      },
      packet,
      service.definitions.facts,
    );
    const actualBatch = {
      ...batch,
      sources: entries,
      routine: (packet.sources.duplicateSummary ? [] : batch.routine).map((entry) => {
        const actual = byKey.get(experienceEntryKey(entry));
        if (!actual) throw new Error('Consolidation has no admitted routine source.');
        return actual;
      }),
    };
    const clock = service.definitions.facts.definitions.statusEffectPolicy;
    const requests = consolidationRequestsFromRead(actualBatch, actorId, presentation, {
      clockOffsetHours: clock.clockOffsetHours,
      dayLabel: service.definitions.facts.definitions.presentation?.calendar?.dayLabel,
    });
    for (const request of requests) retainNativeSources(request.context, packet, presentation);
    return {
      requests,
      async request(index, context, handles) {
        return service.publishRecall(async () => {
          signal.throwIfAborted();
          const offered = requests[index];
          if (!offered || offered.handles !== handles)
            throw new Error('Consolidation request has no admitted batch.');
          const view =
            batch.mode === 'daily' && index === 0
              ? freezeNativeProduct(
                  decodeNativeProduct<InterpretationRead>(await ticket.interpretation()),
                )
              : undefined;
          const interpreting =
            view !== undefined && admission.dreamEpisode !== view.lastDreamEpisode;
          const evidenceAliases = [...handles].map(([alias, entry]) => {
            const ordinal = sources.findIndex(
              (source) =>
                experienceEntryKey(nativeExperienceEntry(source)) === experienceEntryKey(entry),
            );
            if (ordinal < 0) throw new Error('Dream evidence has no admitted source.');
            return { alias, ordinal };
          });
          const bindings = {
            evidenceReferences: Object.fromEntries(
              [...handles].map(([alias, entry]) => [alias, experienceReading(entry, actorId).id]),
            ),
            identityReferences: {} as Record<string, ObserverSubject>,
          };
          const supplied = { ...context };
          let dream: Dream | undefined;
          if (interpreting) {
            supplied['mindFiles'] = packet.files;
            const subjectFacts = new Map(
              sources
                .flatMap((source) => source.attribution.subjects)
                .map((fact) => [subjectKey(fact.subject), fact] as const),
            );
            for (const fact of view.subjects)
              if (fact) subjectFacts.set(subjectKey(fact.subject), fact);
            offerInterpretationRecordsFromRead(
              {
                scope: { id: frame.worldId },
                actorId,
                records: view.records,
                documents: view.documents,
                physicalSubjects: {},
                subjects: [...handles.values()].flatMap((entry) =>
                  retainedMemorySubjects(experienceReading(entry, actorId)),
                ),
                label(subject) {
                  const fact = subjectFacts.get(subjectKey(subject));
                  if (!fact) throw new Error('Dream subject has no admitted label.');
                  return fact.label;
                },
              },
              supplied,
              bindings,
            );
            const identities = Object.entries(bindings.identityReferences).map(
              ([alias, subject]) => {
                const key = subjectKey(subject);
                const record = view.records.findIndex(
                  (record) => record.subjectId && subjectKey(record.subjectId) === key,
                );
                if (record >= 0)
                  return { alias, source: { kind: 'mind-record' as const, ordinal: record } };
                for (let ordinal = 0; ordinal < sources.length; ordinal++) {
                  const selected = sources[ordinal]!.attribution.subjects.findIndex(
                    (fact) => subjectKey(fact.subject) === key,
                  );
                  if (selected >= 0)
                    return {
                      alias,
                      source: { kind: 'personal' as const, ordinal, subject: selected },
                    };
                }
                throw new Error('Dream subject has no native interpretation witness.');
              },
            );
            dream = await service.world.bindConsolidationDream(
              ticket,
              Buffer.from(JSON.stringify({ evidenceAliases, identities })),
            );
            dreams.add(dream);
          }
          if (view) retainNativeSources(supplied, packet, view);
          else retainNativeSources(supplied, packet);
          return {
            context: supplied,
            interpreting,
            schema: boundSummarySchema(
              Object.keys(bindings.identityReferences),
              Object.keys(bindings.evidenceReferences),
            ),
            publication: <T>(start: () => T) =>
              service.publishRecall(async () => {
                signal.throwIfAborted();
                const publication = await service.world.consolidationPublication(ticket);
                try {
                  if (!publication?.isCurrent())
                    throw new Error('Consolidation sources changed before dispatch.');
                  return { result: start() };
                } finally {
                  publication?.release();
                }
              }),
            interpretation(value: MaintenanceInterpretation) {
              if (!dream) throw new Error('Dream interpretation was not offered.');
              const token = {};
              interpretations.set(token, { owner: dream, value });
              return token;
            },
          };
        });
      },
      async publish(groups, token) {
        const interpretation =
          token === undefined
            ? undefined
            : token !== null && typeof token === 'object'
              ? interpretations.get(token)
              : undefined;
        if (token !== undefined && !interpretation)
          throw new Error('Dream interpretation has no native preparation.');
        const submitted = packet.sources.duplicateSummary
          ? entries.map((entry) => ({
              sourceKeys: [experienceEntryKey(entry)],
              text: experienceReading(entry, actorId).summary,
            }))
          : groups;
        const result = await service.publishMaintenance(
          'consolidation',
          actorId,
          () =>
            withNativeJsonInput(service.world, { groups: submitted }, (bytes) =>
              interpretation
                ? withNativeJsonInput(service.world, interpretation.value, (value) =>
                    service.world.beginConsolidation(ticket, bytes, interpretation.owner, value),
                  )
                : service.world.beginConsolidation(ticket, bytes),
            ),
          signal,
          async () => {
            if (!ticket.isCurrent()) throw new Error('Consolidation sources changed.');
          },
        );
        reports.add(result);
        return result;
      },
      dispose() {
        for (const report of reports) releaseNativeProduct(report);
        reports.clear();
        interpretations.clear();
        for (const dream of dreams) dream.release();
        dreams.clear();
        ticket.release();
      },
    };
  } catch (error) {
    for (const dream of dreams) dream.release();
    ticket.release();
    throw error;
  }
}
