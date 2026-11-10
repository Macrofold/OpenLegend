import type {
  MemoryRepository,
  MemoryScope,
  ConversationSource,
  CurrentMemorySource,
} from './memory-repository.js';
import type { CapturedExperienceContext } from './experience-context.js';
import type { NativeNpcCapture } from './native-npc-capture.js';
import type { NativeDefinitionCapture } from './native-definition-capture.js';
import {
  readConversationCompaction,
  selectConversation,
  type ConversationGenerate,
  type ConversationSelectionValidity,
} from './conversation-context.js';
import {
  nativeExperienceEntry,
  nativeMemoryCandidate,
  nativePersonalAttributionReader,
  nativeSummaryProjector,
  type NativePersonalSource,
} from './native-recall.js';
import { retainNativeSources } from './native-consumer.js';

/** The actual request owner supplies live source/disclosure checks; no cache,
 * copied record or formatting callback can declare itself still permitted. */
export async function buildNativeConversationContext(input: {
  current: NativeNpcCapture;
  original: NativeNpcCapture;
  definitions: NativeDefinitionCapture;
  repository: MemoryRepository;
  scope: MemoryScope;
  sources: readonly NativePersonalSource[];
  presentation: CapturedExperienceContext;
  snapshot: { sequence: number; sources: ConversationSource[]; more: boolean };
  saved: unknown;
  requiredIds: string[];
  maxBytes: number;
  signal: AbortSignal;
  attempt: number;
  model: string;
  generate?: ConversationGenerate;
  check(flush?: boolean, additionalSources?: CurrentMemorySource[]): Promise<void>;
  assertCurrent(): void;
  validity: ConversationSelectionValidity;
}) {
  const { current, original, definitions, repository, scope, sources, presentation } = input;
  const self = current.facts.self;
  if (
    self.worldId !== scope.worldId ||
    self.actorId !== scope.actorId ||
    self.generation !== scope.generation
  )
    throw new Error('Native conversation belongs to a different actor/source scope.');
  const attribution = nativePersonalAttributionReader(current, original, sources);
  const cached = await readConversationCompaction(
    input.saved,
    self.actorId,
    scope.generation,
    attribution,
    (refs) => repository.currentCompactionSources(scope, refs),
  );
  input.assertCurrent();
  const selected = input.snapshot.sources.filter(
    (source) => source.sequence > (cached?.through ?? -1),
  );
  const byId = new Map(
    sources
      .filter((source) => source.reference.kind === 'awareness')
      .map((source) => [source.reference.id, source]),
  );
  const none = new Set<string>();
  const turns = selected.map((source) => {
    const record = byId.get(source.id);
    if (!record || record.reference.revision !== source.revision)
      throw new Error('Selected personal speech changed during native preparation.');
    const entry = nativeExperienceEntry(record);
    if (entry.source !== 'awareness')
      throw new Error('Native conversation has no admitted awareness body.');
    const candidate = nativeMemoryCandidate(
      record,
      original,
      definitions,
      presentation,
      none,
      none,
      none,
    );
    return {
      ...source,
      entry,
      text: candidate.text,
      experience: candidate.experience ?? [],
      references: candidate.entityIds,
    };
  });
  const result = await selectConversation({
    worldId: self.worldId,
    actorId: self.actorId,
    snapshot: input.snapshot,
    turns,
    requiredIds: input.requiredIds,
    maxBytes: input.maxBytes,
    cached,
    saved: input.saved,
    scope,
    projectSummary: nativeSummaryProjector(sources, original, definitions, presentation),
    attribution,
    validity: input.validity,
    check: input.check,
    assertCurrent: input.assertCurrent,
    signal: input.signal,
    attempt: input.attempt,
    model: input.model,
    ...(input.generate ? { generate: input.generate } : {}),
    publishCompaction: (bound, refs, prior, next, check) =>
      repository.publishConversationCompaction(scope, bound, refs, prior, next, check),
  });
  return retainNativeSources(
    result,
    current.facts,
    original.facts,
    definitions.facts,
    presentation,
    attribution,
  );
}
