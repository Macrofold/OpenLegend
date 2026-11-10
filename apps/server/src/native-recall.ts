import { namePhrase, personalPronoun, type Named } from '@open-legend/language';
import {
  experienceEntryKey,
  experienceReading,
  subjectKey,
  selectedCapturedSubjectLabelReader,
  type ExperienceEntry,
  type PersonalSourceRef,
} from '@open-legend/domain';
import type { NativeNpcSubjectFact } from './native-npc-sources.js';
import type { CapturedExperienceContext } from './experience-context.js';
import { presentationSubjects } from './experience-context.js';
import type { NativeNpcCapture } from './native-npc-capture.js';
import type { NativeDefinitionCapture } from './native-definition-capture.js';
import { formatMemoryCandidate, groupMemoryCandidates } from './recall-memory.js';
import { gameTime, HARD_CONTEXT_LIMITS, summaryProjector } from './recall.js';
import {
  experienceEmbeddingText,
  experienceForModel,
  experienceModelBindings,
} from './perceived-context.js';
import { digest } from './content-digest.js';
import { retainNativeSources } from './native-consumer.js';
import { capturedAttributionReader } from './entity-references.js';

/** The current native read supplies current naming facts after selected-source
 * preparation. These tuples are presentation dependencies, never grants. */
export function nativePersonalAttributionReader(
  current: NativeNpcCapture,
  sourceOwner: NativeNpcCapture,
  sources: readonly NativePersonalSource[],
) {
  const identities = new Map(
    sources.flatMap((source) => Object.entries(source.attribution.attributionIdentities)),
  );
  for (const [id, values] of Object.entries(current.facts.referenceFacts.attributionIdentities))
    identities.set(id, values);
  return retainNativeSources(
    capturedAttributionReader(current.facts.self.worldId, current.facts.self.actorId, identities),
    current.facts,
    sourceOwner.facts,
  );
}

/** A selected native record keeps its actual payload and observer attribution.
 * These formatter inputs cannot become a response permission map. */
export interface NativePersonalSource {
  readonly selection: number;
  readonly reference: PersonalSourceRef;
  readonly value: unknown;
  readonly attribution: {
    readonly subjects: readonly NativeNpcSubjectFact[];
    readonly entitySubjects: readonly NativeNpcSubjectFact[];
    readonly presentationSubjects: readonly NativeNpcSubjectFact[];
    readonly permittedEntities: readonly string[];
    readonly boundEntityIds: readonly string[];
    readonly occurrenceRoles: readonly {
      readonly role: 'source' | 'subject';
      readonly entityId: string;
      readonly myself: boolean;
      readonly name: Readonly<Named>;
    }[];
    readonly namedOther: boolean;
    readonly attributionIdentities: Readonly<
      Record<string, readonly import('./entity-references.js').AttributionIdentity[]>
    >;
  };
}

/** Labels are a broader presentation selection than remembered identity
 * permissions. A label in a quoted observation grants no canonical reference. */
export function nativeSourcePresentation(
  sources: readonly NativePersonalSource[],
  capture: NativeNpcCapture,
  definitions: NativeDefinitionCapture,
  initial: { readonly presentation: CapturedExperienceContext },
): CapturedExperienceContext {
  const facts = capture.facts,
    installed = definitions.facts;
  const labels = new Map(
    sources.flatMap((source) =>
      source.attribution.presentationSubjects.map(
        (fact) => [subjectKey(fact.subject), fact.label] as const,
      ),
    ),
  );
  const myself = { kind: 'entity' as const, entityId: facts.self.actorId };
  if (!labels.has(subjectKey(myself)))
    labels.set(subjectKey(myself), initial.presentation.subjectLabel(myself));
  for (const subject of presentationSubjects(sources.map((source) => source.value)))
    if (!labels.has(subjectKey(subject)))
      throw new Error('Selected native history has no admitted presentation label.');
  return retainNativeSources(
    {
      ...initial.presentation,
      subjectLabel: selectedCapturedSubjectLabelReader(installed.definitions, labels),
    },
    facts,
    installed,
    initial,
  );
}

export function nativeExperienceEntry(source: NativePersonalSource): ExperienceEntry {
  // Native admission validated the exact current-format body and this tag.
  return { source: source.reference.kind, value: source.value } as ExperienceEntry;
}

export function nativeMemoryCandidate(
  source: NativePersonalSource,
  capture: NativeNpcCapture,
  definitions: NativeDefinitionCapture,
  presentation: CapturedExperienceContext,
  requiredIds: ReadonlySet<string>,
  automaticIds: ReadonlySet<string>,
  conversationIds: ReadonlySet<string>,
) {
  const facts = capture.facts,
    installed = definitions.facts,
    entry = nativeExperienceEntry(source),
    memory = experienceReading(entry, facts.self.actorId),
    corrections = facts.self.npc.corrections ?? {};
  return retainNativeSources(
    formatMemoryCandidate(
      memory,
      {
        actorId: facts.self.actorId,
        permittedEntities: new Set(source.attribution.permittedEntities),
        occurrenceLabels: source.attribution.occurrenceRoles.map(
          (role) =>
            ` Occurrence ${role.role}: ${role.myself ? personalPronoun('object') : namePhrase(role.name, 'indefinite')}.`,
        ),
        experience: experienceForModel(
          entry,
          experienceModelBindings(
            presentation,
            facts.self.actorId,
            entry,
            `source:${entry.source}:${digest([entry.source, memory.id]).slice(0, 12)}`,
          ),
        ),
        embeddingText: experienceEmbeddingText(entry, facts.self.actorId),
        time: (at) =>
          gameTime(
            at,
            installed.definitions.statusEffectPolicy.clockOffsetHours,
            installed.definitions.presentation?.calendar?.dayLabel,
          ),
      },
      requiredIds,
      automaticIds,
      conversationIds,
      corrections,
      new Set(Object.values(corrections)),
      entry,
    ),
    facts,
    installed,
    presentation,
  );
}

/** Recent baseline and grouping are the ordinary Source algorithm over these
 * admitted records. Required current entities remain separate candidates. */
export function nativeMemoryCandidates(
  sources: readonly NativePersonalSource[],
  capture: NativeNpcCapture,
  definitions: NativeDefinitionCapture,
  presentation: CapturedExperienceContext,
  requiredIds: readonly string[],
  automaticIds: readonly string[] = [],
  conversationIds: readonly string[] = [],
) {
  const required = new Set(requiredIds),
    automatic = new Set(automaticIds),
    conversation = new Set(conversationIds),
    installed = definitions.facts;
  const memories = sources.map((source) =>
    nativeMemoryCandidate(
      source,
      capture,
      definitions,
      presentation,
      required,
      automatic,
      conversation,
    ),
  );
  const named = new Set(
    sources
      .filter((source) => source.attribution.namedOther)
      .map((source) => experienceEntryKey(nativeExperienceEntry(source))),
  );
  return retainNativeSources(
    groupMemoryCandidates(
      memories,
      named,
      (at) =>
        gameTime(
          at,
          installed.definitions.statusEffectPolicy.clockOffsetHours,
          installed.definitions.presentation?.calendar?.dayLabel,
        ),
      HARD_CONTEXT_LIMITS.memories,
    ),
    capture.facts,
    installed,
    presentation,
    ...memories,
  );
}

export function nativeSummaryProjector(
  sources: readonly NativePersonalSource[],
  capture: NativeNpcCapture,
  definitions: NativeDefinitionCapture,
  presentation: CapturedExperienceContext,
) {
  const installed = definitions.facts,
    facts = capture.facts;
  const subjects = new Map(
    sources.flatMap((source) =>
      source.attribution.subjects.flatMap((fact) =>
        fact.canonicalId ? [[subjectKey(fact.subject), fact.canonicalId] as const] : [],
      ),
    ),
  );
  const project = summaryProjector(
    facts.self.actorId,
    presentation,
    installed.definitions.statusEffectPolicy.clockOffsetHours,
    installed.definitions.presentation?.calendar?.dayLabel,
    subjects,
  );
  return retainNativeSources(project, facts, installed, presentation);
}
