import {
  experienceEntryKey,
  experienceSourceReference,
  experienceSourceKey,
  experienceSourceCoverage,
  validExperienceSummary,
} from './experience-sources.js';
import { PERSONAL_EVIDENCE_PREPARATION } from './experience-source.js';
import { recognitionSupportSources } from './worlds/base/recognition.js';
import { entityGet, entityHas, entityValues } from './entity-collection.js';
import { revokePracticeSupport } from './practical-competence.js';
import { revokeCombatEvidence } from './combat-encounters.js';
import { revokeActivityEvidence } from './activity-learning.js';
import { revokeInventoryInspection } from './inventory-inspection.js';
import {
  invalidateAppraisals,
  changeAppraisal,
  type AppraisalChange,
  type AppraisalBindings,
} from './appraisals.js';
import {
  editKnowledge,
  knowledgeDocument,
  advanceKnowledgeRevision,
  subjectKey,
  validObserverSubject,
  revokeLearnedRecipeSupport,
  type ObserverSubject,
  type KnowledgeEdit,
} from './knowledge.js';
import {
  assignSubjectName,
  canRememberSubject,
  rememberSubject,
  revokeRecognitionEvidence,
  observerIndividual,
  type SubjectNameEdit,
} from './worlds/base/knowledge.js';
import {
  experienceManifest,
  manifestDependsOn,
  observationLearningSources,
  ownedObservationSources,
  personalFactAlias,
  summaryMemory,
  type PersonalSourceRef,
  type PreparedExperience,
  type ExperienceManifest,
} from './experience-manifest.js';
import {
  acquireKnownPlaceEvidence,
  invalidateKnownPlaceEvidence,
  installKnownPlaceEvidence,
  prepareKnownPlaceEvidence,
} from './known-place-evidence.js';
import { dreamStatus, dreamPolicy } from './cognition-policy.js';
import { current, isDraft } from 'immer';
import { changeGoal, type GoalChange } from './agency.js';
import { initializeIdentity } from './identity.js';
import { hasMemory } from './living.js';
import {
  draftWorld,
  finishWorld,
  cloneValue,
  trackDetachedRecord,
  trackRecordArray,
  appendSnapshot,
  isAppendBuffer,
  sealAppends,
  readOnlyDraftView,
} from './draft.js';
import { byteCount, mindFor, wordCount } from './mind.js';
import { canonicalJson, finish, outcome } from './events.js';
import { personalText } from './narration.js';
import type { ExperienceEntry, MemoryRecord, Transition, WorldState, WorldEvent } from './types.js';
import {
  selectedRecordingReason,
  selectedTemporalPolicy,
  selectedRetainRecognitionEvidence,
} from './world-composition.js';
import {
  appendTemporalReceipt,
  captureTemporalObservation,
  invalidateTemporalEvidence,
  invalidateTemporalFacets,
  retainTemporalSupport,
  temporalFacetEligible,
  temporalReceiptSource,
  temporalReceiptId,
  temporalReceiptAliases,
  temporalAccountAliasClosure,
  temporalSupportAliases,
  splitTemporalValue,
  type TemporalReceipt,
  type TemporalValue,
} from './temporal-evidence.js';
import {
  adjustExperienceAccounting,
  ensureExperienceAccounting,
  impressionFits,
  adjustRetainedKnowledgeAccounting,
  createRememberedImpression,
  reinforceImpression,
  encodedExperienceBytes,
} from './remembered-impressions.js';
import { revokeReceivedGeometryEvidence } from './received-geometry.js';
import { revokeAttentionEvidence } from './attention.js';

export const EXPERIENCE_LIMITS = {
  rawHours: 6,
  recallRaw: 512,
  conversationSpeech: 512,
  protectedImportance: 8,
  consolidationPressure: 8192,
  summaryBytes: 1200,
  historyDays: 30,
} as const;
export interface Awareness {
  retentionClass: 'memory' | 'sensory';
  expiresAt?: number;
  sourceReceipt?: import('./temporal-evidence.js').TemporalReceiptLocator;
  retention?: import('./remembered-impressions.js').ExperienceRetention;
  observation?: import('./perception-evidence.js').ObservationContribution;
  observations?: import('./perception-evidence.js').ObservationContribution[];
  sourceSubject?: import('./knowledge.js').ObserverSubject;
  /** Names and identities admitted at this occurrence; later knowledge cannot rewrite them. */
  references?: Array<{ id: string; label: string; role: 'actor' | 'target' | 'participant' }>;
  /** Non-speech payload permitted at occurrence time; never rebuilt from raw history. */
  eventData?: NonNullable<WorldEvent['data']>;
  /** Exact observable facts learned at encounter/inspection time, not generated prose. */
  exposure?: import('./places.js').EncounterExposure;
  entityEpisodes?: Record<string, string>;
  speech?: import('./speech.js').PerceivedSpeech;
  sound?: import('./sound.js').PerceivedSound;
  eventId: string;
  actorId: string;
  text: string;
  at: number;
  sequence: number;
  modality: 'heard' | 'observed' | 'felt' | 'internal';
  recognized: boolean;
  intelligible: boolean;
  entityIds: string[];
  importance: number;
  /** How quickly this experience should interrupt an in-flight response, from 0–10. */
  urgency?: number;
  /** Stable event-time trigger semantics survive rotation of the bounded world-event feed. */
  eventType?: string;
  sourceId?: string;
  /** Speech body correspondence at acquisition; never inferred from a learned voice. */
  sourceBody?: { entityId: string; physicalLife: number; leaseId: string | null };
  recognition?: import('./worlds/base/recognition.js').IndividualRecognition;
  receivedFeatures?: {
    modality: 'sight' | 'hearing';
    family: { id: string; version: number };
    features: import('./worlds/base/recognition.js').RecognitionFeatures;
    quality: number;
  };
  targetId?: string;
  triggerKind?:
    | 'addressed_speech'
    | 'overheard_speech'
    | 'self_event'
    | 'directed_action'
    | 'observed_event';
  content?: string;
  /** Observer-private sighting record kind (EPR03): arrival, outward change or departure. */
  change?: 'onset' | 'detail' | 'end';
}
export interface ExperienceSummary {
  retention?: import('./remembered-impressions.js').ExperienceRetention;
  id: string;
  text: string;
  from: number;
  to: number;
  sources: PersonalSourceRef[];
  manifest: ExperienceManifest;
  entityIds: string[];
  importance: number;
  sequence?: number;
  revision?: number;
}
export interface ExperienceState {
  version: 1;
  /** Explicit privacy edits fence earlier captured decisions without lifetime source aliases. */
  privacyRevisions?: Record<string, number>;
  temporal?: import('./temporal-evidence.js').TemporalEvidenceState;
  perspectiveVersion?: 1;
  corrections?: Record<string, Record<string, string>>;
  awareness: Record<string, Awareness[]>;
  summaries: Record<string, ExperienceSummary[]>;
  consolidatedAt: Record<string, number>;
  forgotten: Record<string, string[]>;
}
export interface InnerWorld {
  text: string;
  revision: number;
  files: { path: string; text: string }[];
  sourceSnapshot: string;
  publicationJobId: string;
  publicationBody?: string;
  evidenceIds: string[];
  reconsiderationRequired?: boolean;
}

export function experienceEntry(
  world: WorldState,
  actorId: string,
  key: string,
): ExperienceEntry | undefined {
  const separator = key.indexOf(':');
  const source = key.slice(0, separator);
  const id = key.slice(separator + 1);
  if (source === 'awareness') {
    const value = world.experience?.awareness[actorId]?.find((entry) => entry.eventId === id);
    return value && value.retentionClass !== 'sensory' ? { source, value } : undefined;
  }
  if (source === 'memory') {
    const value = world.memories[actorId]?.find((entry) => entry.id === id);
    return value && { source, value };
  }
  if (source === 'summary') {
    const value = world.experience?.summaries[actorId]?.find((entry) => entry.id === id);
    return value && { source, value };
  }
  return undefined;
}

export type ExperienceMutation =
  | { operation: 'add'; entry: ExperienceEntry }
  | { operation: 'update'; entryId: string; entry: ExperienceEntry }
  | { operation: 'delete'; entryId: string };

export function experienceEntries(
  world: WorldState,
  actorId: string,
): Map<string, ExperienceEntry> {
  const entries = new Map<string, ExperienceEntry>();
  for (const value of world.experience?.awareness[actorId] ?? [])
    if (value.retentionClass !== 'sensory')
      entries.set(`awareness:${value.eventId}`, { source: 'awareness', value });
  for (const value of world.memories[actorId] ?? [])
    entries.set(`memory:${value.id}`, { source: 'memory', value });
  for (const value of world.experience?.summaries[actorId] ?? [])
    entries.set(`summary:${value.id}`, { source: 'summary', value });
  return entries;
}

function stableExperienceUpdate(previous: ExperienceEntry, next: ExperienceEntry): boolean {
  if (previous.source !== next.source) return false;
  const editable =
    previous.source === 'awareness'
      ? new Set(
          previous.value.eventType === 'speech' || previous.value.speech
            ? ['importance']
            : ['text', 'content', 'importance'],
        )
      : previous.source === 'memory'
        ? new Set(['summary', 'importance'])
        : new Set(['text', 'importance']);
  const before = previous.value as unknown as Record<string, unknown>;
  const after = next.value as unknown as Record<string, unknown>;
  // Importance feeds wake and interruption priority; an edit cannot exceed the record scale.
  const importance = after['importance'];
  if (
    importance !== undefined &&
    (typeof importance !== 'number' || !(importance >= 0 && importance <= 10))
  )
    return false;
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].every(
    (key) => editable.has(key) || canonicalJson(before[key]) === canonicalJson(after[key]),
  );
}

type IdentifiedEntry = { id?: string; eventId?: string };
type IdentityField = 'id' | 'eventId';
const additionIndexes = new WeakMap<
  object,
  { length: number; field: IdentityField; ids: Set<string | undefined> }
>();
/** IDs cannot be edited and removals replace the array. Only this mutation owner's draft
 * additions reuse a membership index; unowned mutable builders always read their live array.
 * docs/performance.md#simulation-cpu-and-growing-history
 */
function containsEntryId<T extends IdentifiedEntry>(
  entries: T[] | undefined,
  id: string,
  field: IdentityField,
): boolean {
  if (!entries) return false;
  const snapshot = isDraft(entries) ? current(entries) : entries;
  if (Object.isFrozen(snapshot)) {
    let index = additionIndexes.get(snapshot);
    if (!index || index.field !== field) {
      index = {
        length: snapshot.length,
        field,
        ids: new Set(snapshot.map((entry) => entry[field])),
      };
      additionIndexes.set(snapshot, index);
    }
    return index.ids.has(id);
  }
  if (!isDraft(entries) && !isAppendBuffer(entries))
    return entries.some((entry) => entry[field] === id);
  let index = additionIndexes.get(entries);
  if (!index || index.length !== entries.length || index.field !== field) {
    // Read retained history without creating one Immer proxy per old experience.
    index = { length: entries.length, field, ids: new Set(snapshot.map((e) => e[field])) };
    additionIndexes.set(entries, index);
  }
  return index.ids.has(id);
}
function appendEntries<T extends IdentifiedEntry>(
  world: WorldState,
  entries: T[],
  values: T[],
  field: IdentityField,
): T[] {
  const snapshot = isDraft(entries) ? current(entries) : entries;
  const appended = appendSnapshot(entries, values, world);
  if (appended) {
    const index = additionIndexes.get(snapshot);
    if (index?.field === field) {
      // Transfer, never share a mutable membership set with an old snapshot or fork.
      additionIndexes.delete(snapshot);
      for (const entry of values) index.ids.add(entry[field]);
      index.length = appended.length;
      additionIndexes.set(appended, index);
    }
    return appended;
  }
  const index = additionIndexes.get(entries),
    length = entries.length;
  entries.push(...values);
  if (index?.length === length && index.field === field) {
    for (const entry of values) index.ids.add(entry[field]);
    index.length = entries.length;
  } else additionIndexes.delete(entries);
  return entries;
}
function containsExperienceKey(world: WorldState, actorId: string, key: string): boolean {
  const separator = key.indexOf(':'),
    source = key.slice(0, separator),
    id = key.slice(separator + 1);
  if (source === 'awareness')
    return containsEntryId(world.experience?.awareness[actorId], id, 'eventId');
  if (source === 'memory') return containsEntryId(world.memories[actorId], id, 'id');
  if (source === 'summary') return containsEntryId(world.experience?.summaries[actorId], id, 'id');
  return false;
}
function canAddExperience(
  world: WorldState,
  actorId: string,
  entries: readonly ExperienceEntry[],
  replacing: ReadonlySet<string> = new Set(),
): boolean {
  const keys = entries.map((entry) =>
    entry.source === 'awareness'
      ? `awareness:${entry.value.eventId}`
      : `${entry.source}:${entry.value.id}`,
  );
  return (
    new Set(keys).size === keys.length &&
    !keys.some(
      (key) =>
        (containsExperienceKey(world, actorId, key) && !replacing.has(key)) ||
        world.experience?.forgotten[actorId]?.includes(key.slice(key.indexOf(':') + 1)),
    ) &&
    !entries.some(
      (entry) =>
        (entry.source === 'memory' &&
          entry.value.eventId &&
          world.experience?.forgotten[actorId]?.includes(entry.value.eventId)) ||
        ('actorId' in entry.value && entry.value.actorId !== actorId),
    )
  );
}
function reconcileExperienceAccounting(
  world: WorldState,
  actorId: string,
  before: ReadonlyMap<string, ExperienceEntry>,
): void {
  const after = experienceEntries(world, actorId);
  for (const [key, entry] of before) {
    const current = after.get(key);
    if (current?.value === entry.value) continue;
    adjustExperienceAccounting(world, actorId, entry, -1);
    if (current) adjustExperienceAccounting(world, actorId, current, 1);
  }
  for (const [key, entry] of after)
    if (!before.has(key)) adjustExperienceAccounting(world, actorId, entry, 1);
}

type ExperienceOperation =
  | ExperienceMutation
  | ExperienceMutation[]
  | {
      operation: 'consolidate';
      retiredSources: PersonalSourceRef[];
      summaries: ExperienceSummary[];
    }
  | { operation: 'correct'; sourceId: string; correctionEventId: string }
  | {
      operation: 'obligation';
      id: string;
      expectedRevision: number;
      obligation: NonNullable<MemoryRecord['obligation']>;
    };

/** Public/editor additions remain independent copies and share the native admission owner. */
export function mutateExperience(
  world: WorldState,
  actorId: string,
  mutation: ExperienceOperation,
): string[] | null {
  if (!world.experience) migrateCognition(world);
  if (!hasMemory(entityGet(world.entities, actorId))) return null;
  const changes = Array.isArray(mutation) ? mutation : [mutation];
  if (
    changes.some(
      (change) =>
        ('entry' in change &&
          change.entry.source === 'awareness' &&
          change.entry.value.retentionClass === 'sensory') ||
        ('entryId' in change &&
          world.experience?.awareness[actorId]?.some(
            (entry) =>
              entry.retentionClass === 'sensory' && change.entryId === `awareness:${entry.eventId}`,
          )),
    )
  )
    return null;
  return applyExperienceMutation(world, actorId, mutation, 'copy');
}
/** Transfer fresh event-time evidence through the existing admission owner.
 * Read only actual recipients: materializing current(world.entities) here copies the
 * entire changed population for every receiver-private acquisition in a sensing phase.
 * Duplicate/forgotten/ownership guards still run through the same mutation owner.
 * Never pass provider/editor-owned objects here. docs/hearing-and-speech.md#performance-and-invalidation
 */
const sensoryDeadlines = new WeakMap<object, number>();
function sensoryDeadline(entries: Awareness[]): number {
  const values = readOnlyDraftView(entries);
  const prior = Object.isFrozen(values) ? sensoryDeadlines.get(values) : undefined;
  if (prior !== undefined) return prior;
  let deadline = Infinity;
  for (const entry of values)
    if (entry.retentionClass === 'sensory') deadline = Math.min(deadline, entry.expiresAt!);
  if (Object.isFrozen(values)) sensoryDeadlines.set(values, deadline);
  return deadline;
}
export function nextSensoryExpiry(world: WorldState): number {
  let deadline = Infinity;
  for (const entries of Object.values(world.experience?.awareness ?? {}))
    deadline = Math.min(deadline, sensoryDeadline(entries));
  return deadline;
}
/** Expiry removes optional sensory evidence, never an admitted controller's cue. */
export function expireSensoryAwareness(world: WorldState): void {
  for (const [actorId, entries] of Object.entries(world.experience?.awareness ?? {})) {
    if (sensoryDeadline(entries) > world.simTime) continue;
    sealAppends(world);
    trackRecordArray(world, world.experience!.awareness, actorId);
    for (const entry of entries)
      if (entry.retentionClass === 'sensory' && entry.expiresAt! <= world.simTime)
        adjustExperienceAccounting(world, actorId, { source: 'awareness', value: entry }, -1);
    world.experience!.awareness[actorId] = entries.filter(
      (entry) => entry.retentionClass !== 'sensory' || entry.expiresAt! > world.simTime,
    );
  }
}

export function acquireEventAwareness(world: WorldState, entries: Awareness[]): void {
  if (!entries.length) return;
  if (!world.experience) migrateCognition(world);
  for (const entry of entries) {
    if (entry.retentionClass === 'sensory') {
      if (hasMemory(entityGet(world.entities, entry.actorId)))
        admitAutomaticExperience(world, entry.actorId, { source: 'awareness', value: entry });
      applyExperienceMutation(
        world,
        entry.actorId,
        { operation: 'add', entry: { source: 'awareness', value: entry } },
        'transfer',
      );
    } else if (hasMemory(entityGet(world.entities, entry.actorId)))
      admitAutomaticExperience(world, entry.actorId, { source: 'awareness', value: entry });
  }
}

/** Every native autobiographical writer enters here. Current reception and recent
 * attention are independent of this selected world's lasting-record decision. */
export function admitAutomaticExperience(
  world: WorldState,
  actorId: string,
  input: ExperienceEntry | readonly ExperienceEntry[],
): { retainedIds: string[]; invalidated: string[] } | null {
  if (!world.experience) migrateCognition(world);
  if (!hasMemory(entityGet(world.entities, actorId))) return null;
  const entries = Array.isArray(input) ? input : [input as ExperienceEntry];
  const admitted: ExperienceEntry[] = [];
  const decisions = entries.map((entry) => {
    const awareness = entry.source === 'awareness' ? entry.value : undefined;
    const memory = entry.source === 'memory' ? entry.value : undefined;
    const consequence = awareness
      ? awareness.triggerKind === 'self_event' || awareness.triggerKind === 'directed_action'
      : !!memory &&
        (!!memory.activityId ||
          !!memory.obligation ||
          memory.source === 'felt' ||
          memory.source === 'internal');
    const reason =
      awareness?.retentionClass === 'sensory'
        ? 'none'
        : selectedRecordingReason(world, {
            source: entry.source,
            eventType: awareness?.eventType ?? memory?.eventType,
            modality: awareness?.modality ?? memory?.source,
            triggerKind: awareness?.triggerKind,
            own:
              !!memory ||
              awareness?.sourceId === actorId ||
              awareness?.triggerKind === 'self_event',
            hasExposure: !!awareness?.exposure,
            ...(awareness?.exposure ? { exposureKind: awareness.exposure.kind } : {}),
            consequence,
          });
    let admittedEntry: ExperienceEntry =
      entry.source === 'awareness'
        ? { source: 'awareness', value: { ...entry.value } }
        : entry.source === 'memory'
          ? { source: 'memory', value: { ...entry.value } }
          : entry;
    if (reason !== 'none' && !(awareness?.speech || awareness?.sound)) {
      const retention: import('./remembered-impressions.js').ExperienceRetention = {
        reason: awareness?.exposure
          ? 'deliberate'
          : entry.source === 'summary' ||
              memory?.kind === 'reflection' ||
              memory?.source === 'inferred' ||
              memory?.source === 'self_thought'
            ? 'interpretation'
            : 'consequence',
        ...(reason === 'required' ? { required: true } : {}),
      };
      if (entry.source === 'awareness')
        admittedEntry = { source: 'awareness', value: { ...entry.value, retention } };
      else if (entry.source === 'memory')
        admittedEntry = { source: 'memory', value: { ...entry.value, retention } };
    }
    if (reason !== 'none') admitted.push(admittedEntry);
    return { entry: admittedEntry, reason };
  });
  if (!canAddExperience(world, actorId, admitted)) return null;
  const policy = selectedTemporalPolicy(world).recent;
  for (const { entry, reason } of decisions) {
    const awareness = entry.source === 'awareness' ? entry.value : undefined;
    const memory = entry.source === 'memory' ? entry.value : undefined;
    const observations = [
      ...(awareness?.observation ? [awareness.observation] : []),
      ...(awareness?.observations ?? []),
      ...(memory?.observation ? [memory.observation] : []),
      ...(memory?.observations ?? []),
    ];
    const attended = observations.some((observation) => observation.context?.attended === true);
    if (reason !== 'none' || attended) {
      const id = entry.source === 'awareness' ? entry.value.eventId : entry.value.id;
      let locator: import('./temporal-evidence.js').TemporalReceiptLocator | undefined;
      if (reason === 'required' || attended)
        for (const observation of observations) {
          const captured = captureTemporalObservation(
            world,
            actorId,
            observation,
            [id, observation.id],
            reason === 'required',
            policy,
            observation.context
              ? {
                  contextSubjects: observation.context.subjects.map((subject) => subject.episodeId),
                }
              : {},
          );
          locator ??= captured;
        }
      if (!locator && (awareness || memory)) {
        const at = awareness?.at ?? memory!.at;
        locator = appendTemporalReceipt(
          world,
          actorId,
          {
            subject: id,
            change: 'occurrence',
            required: reason === 'required',
            sourceIds: [id, ...(memory?.eventId ? [memory.eventId] : [])],
            ...(observations.some((observation) => observation.context?.subjects.length)
              ? {
                  contextSubjects: [
                    ...new Set(
                      observations.flatMap(
                        (observation) =>
                          observation.context?.subjects.map((subject) => subject.episodeId) ?? [],
                      ),
                    ),
                  ],
                }
              : {}),
            facets: [
              {
                role: 'direct',
                asOf: at,
                measuredFrom: at,
                measuredThrough: at,
                acquiredAt: world.simTime,
                value: {
                  kind: 'personal-account',
                  source: awareness ? 'awareness' : 'memory',
                  id,
                  text: awareness?.text ?? memory!.summary,
                  ...((awareness?.eventType ?? memory?.eventType)
                    ? { eventType: awareness?.eventType ?? memory?.eventType }
                    : {}),
                  ...(awareness?.content ? { content: awareness.content } : {}),
                  ...(awareness?.eventData ? { data: cloneValue(awareness.eventData) } : {}),
                },
              },
            ],
          },
          policy,
        );
      }
      if (locator && (awareness?.retention || memory?.retention)) {
        const retained = awareness ?? memory!;
        retained.retention = { ...retained.retention!, receipt: locator };
      }
      if (locator && entry.source !== 'summary') entry.value.sourceReceipt = locator;
      if (locator && awareness?.exposure?.kind === 'place') {
        const temporal = world.experience!.temporal!;
        const receipt = temporal.actors[actorId]!.chunks.flatMap((chunk) => chunk.receipts).find(
          (candidate) =>
            candidate.epoch === locator!.epoch && candidate.ordinal === locator!.ordinal,
        );
        if (receipt) {
          const ordinals = receipt.facets
            .filter((facet) => {
              const value = temporal.sources[facet.blockId]?.values[facet.valueOrdinal];
              return (
                value?.kind === 'location' ||
                (value?.kind === 'encounter-exposure' && value.exposure.kind === 'place')
              );
            })
            .map((facet) => facet.ordinal);
          retainTemporalSupport(world, locator, {
            facetOrdinals: ordinals,
            ...selectedTemporalPolicy(world).optional,
          });
        }
      }
    }
  }
  const invalidated = admitted.length
    ? applyExperienceMutation(
        world,
        actorId,
        admitted.map((entry) => ({ operation: 'add' as const, entry })),
        'transfer',
      )
    : [];
  if (invalidated === null) return null;
  for (const entry of admitted)
    if (entry.source === 'awareness') {
      acquireKnownPlaceEvidence(world, entry.value);
      if (entry.value.speech) selectedRetainRecognitionEvidence(world, entry.value);
    }
  return {
    retainedIds: admitted.map((entry) =>
      entry.source === 'awareness' ? entry.value.eventId : entry.value.id,
    ),
    invalidated,
  };
}
/** Final direct confirmations remain historical evidence after their live support ends.
 * This records no invented event and grants no current body permission. */
export function retainObservationConfirmation(
  world: WorldState,
  actorId: string,
  observation: import('./perception-evidence.js').ObservationContribution,
  text: string,
  importance: number,
): void {
  if (!world.experience) migrateCognition(world);
  if (!hasMemory(entityGet(world.entities, actorId))) return;
  // A final sample has no intrinsic autobiographical significance. Necessary
  // support is retained by its consumer; recent attention captures it separately.
  if (
    selectedRecordingReason(world, {
      source: 'confirmation',
      own: false,
      hasExposure: false,
      consequence: false,
    }) === 'none'
  )
    return;
  // This newly constructed native account owns its immutable contribution. Reusing
  // it avoids copying every nested original; editor/provider writes keep copy admission.
  applyExperienceMutation(
    world,
    actorId,
    {
      operation: 'add',
      entry: {
        source: 'memory',
        value: {
          id: observation.id,
          actorId,
          kind: 'episode',
          source:
            observation.modality === 'sight'
              ? 'observed'
              : observation.modality === 'hearing'
                ? 'heard'
                : 'felt',
          summary: text,
          at: observation.acquiredAt,
          sequence: world.sequence,
          entityIds: [],
          importance,
          observation,
        },
      },
    },
    'transfer',
  );
}
function applyExperienceMutation(
  world: WorldState,
  actorId: string,
  mutation: ExperienceOperation,
  ownership: 'copy' | 'transfer',
): string[] | null {
  const additionsOnly = Array.isArray(mutation)
    ? mutation.every((change) => change.operation === 'add')
    : mutation.operation === 'add';
  if (!additionsOnly) sealAppends(world);
  if (!additionsOnly)
    for (const entries of [
      world.experience!.awareness[actorId],
      world.memories[actorId],
      world.experience!.summaries[actorId],
    ])
      if (entries) additionIndexes.delete(entries);
  if (!Array.isArray(mutation) && mutation.operation === 'consolidate') {
    const used = new Set(mutation.retiredSources.map(experienceSourceKey));
    for (const source of mutation.retiredSources) {
      const current = experienceEntry(world, actorId, `${source.kind}:${source.id}`);
      if (!current || canonicalJson(experienceSourceReference(current)) !== canonicalJson(source))
        return null;
    }
    if (
      (world.memories[actorId] ?? []).some(
        (m) =>
          m.kind === 'commitment' &&
          !m.resolved &&
          used.has(experienceSourceKey({ kind: 'memory', id: m.id })),
      )
    )
      return null;
    if (
      mutation.summaries.some((s) =>
        s.manifest.coverage.some((ref) => world.experience!.forgotten[actorId]?.includes(ref.id)),
      )
    )
      return null;
    ensureExperienceAccounting(world, actorId);
    const accounting = experienceEntries(world, actorId);
    const state = world.experience!;
    state.summaries[actorId] = cloneValue(mutation.summaries);
    state.awareness[actorId] = (state.awareness[actorId] ?? []).filter(
      (a) => !used.has(experienceSourceKey({ kind: 'awareness', id: a.eventId })),
    );
    world.memories[actorId] = (world.memories[actorId] ?? []).filter(
      (m) => !used.has(experienceSourceKey({ kind: 'memory', id: m.id })),
    );
    state.consolidatedAt[actorId] = world.simTime;
    invalidateKnownPlaceEvidence(world, actorId);
    reconcileExperienceAccounting(world, actorId, accounting);
    return mutation.retiredSources.map((source) => source.id);
  }
  if (!Array.isArray(mutation) && mutation.operation === 'correct') {
    if (
      !world.experience!.awareness[actorId]?.some(
        (a) => a.eventId === mutation.correctionEventId,
      ) ||
      mutation.sourceId === mutation.correctionEventId
    )
      return null;
    const aliases = temporalAccountAliasClosure(world, actorId, [mutation.sourceId]);
    const invalidated = invalidateExperience(
      world,
      actorId,
      [mutation.sourceId],
      false,
      mutation.correctionEventId,
    );
    const corrections = ((world.experience!.corrections ??= {})[actorId] ??= {});
    for (const alias of aliases) corrections[alias] = mutation.correctionEventId;
    return invalidated;
  }
  if (!Array.isArray(mutation) && mutation.operation === 'obligation') {
    const memory = world.memories[actorId]?.find(
      (m) => m.id === mutation.id && m.kind === 'commitment',
    );
    if (
      !memory?.obligation ||
      memory.resolved ||
      memory.obligation.revision !== mutation.expectedRevision ||
      mutation.obligation.revision !== mutation.expectedRevision + 1 ||
      mutation.obligation.evidenceId !== memory.obligation.evidenceId
    )
      return null;
    const replacement = {
      ...memory,
      obligation: cloneValue(mutation.obligation),
      resolved: ['fulfilled', 'cancelled'].includes(mutation.obligation.status),
    };
    adjustExperienceAccounting(world, actorId, { source: 'memory', value: memory }, -1);
    adjustExperienceAccounting(world, actorId, { source: 'memory', value: replacement }, 1);
    world.memories[actorId] = world.memories[actorId]!.map((entry) =>
      entry === memory ? replacement : entry,
    );
    const inner = world.innerWorlds?.[actorId];
    if (inner) inner.reconsiderationRequired = true;
    return [memory.id];
  }
  const mutations = Array.isArray(mutation) ? mutation : [mutation];
  if (!mutations.length) return [];
  if (mutations.some((change) => change.operation === 'add')) {
    if (mutations.some((change) => change.operation !== 'add')) {
      const candidate = draftWorld(world);
      const updates = mutateExperience(
        candidate,
        actorId,
        mutations.filter((change) => change.operation !== 'add'),
      );
      if (!updates) return null;
      const additions = mutateExperience(
        candidate,
        actorId,
        mutations.filter((change) => change.operation === 'add'),
      );
      if (!additions) return null;
      const committed = finishWorld(candidate);
      world.experience = committed.experience;
      world.memories = committed.memories;
      world.minds = committed.minds;
      world.innerWorlds = committed.innerWorlds;
      world.actorKnowledge = committed.actorKnowledge;
      world.observerIdentities = committed.observerIdentities;
      world.actionExperience = committed.actionExperience;
      world.appraisals = committed.appraisals;
      world.knowledgeRevisions = committed.knowledgeRevisions;
      return [...new Set([...updates, ...additions])];
    }
    const additions = mutations.map((change) => {
      if (change.operation !== 'add') throw new Error('Mixed experience mutation batch.');
      return ownership === 'transfer' ? change.entry : cloneValue(change.entry);
    });
    if (!canAddExperience(world, actorId, additions)) return null;
    const awareness: Awareness[] = [],
      memories: MemoryRecord[] = [],
      summaries: ExperienceSummary[] = [];
    for (const entry of additions) {
      adjustExperienceAccounting(world, actorId, entry, 1);
      trackDetachedRecord(world, entry.value);
      if (entry.source === 'awareness') awareness.push(entry.value);
      else if (entry.source === 'memory') memories.push(entry.value);
      else summaries.push(entry.value);
    }
    if (awareness.length) trackRecordArray(world, world.experience!.awareness, actorId);
    if (memories.length) trackRecordArray(world, world.memories, actorId);
    if (summaries.length) trackRecordArray(world, world.experience!.summaries, actorId);
    if (awareness.length)
      world.experience!.awareness[actorId] = appendEntries(
        world,
        world.experience!.awareness[actorId] ?? [],
        awareness,
        'eventId',
      );
    if (memories.length)
      world.memories[actorId] = appendEntries(world, world.memories[actorId] ?? [], memories, 'id');
    if (summaries.length)
      world.experience!.summaries[actorId] = appendEntries(
        world,
        world.experience!.summaries[actorId] ?? [],
        summaries,
        'id',
      );
    return [];
  }

  if (
    new Set(mutations.map((change) => (change.operation === 'add' ? '' : change.entryId))).size !==
    mutations.length
  )
    return null;
  const entries = experienceEntries(world, actorId);
  const resolved = mutations.map((change) => ({
    change,
    previous: change.operation === 'add' ? undefined : entries.get(change.entryId),
  }));
  if (resolved.some(({ previous }) => !previous)) return null;
  const replacements = new Map<ExperienceEntry, ExperienceEntry['value']>();
  for (const { change, previous } of resolved) {
    if (!previous || change.operation !== 'update') continue;
    if (!stableExperienceUpdate(previous, change.entry)) return null;
    const replacement = cloneValue(change.entry.value);
    if ('actorId' in replacement && replacement.actorId !== actorId) return null;
    replacements.set(previous, replacement);
  }
  const removed = new Set(
    resolved
      .filter(({ change }) => change.operation === 'delete')
      .map(({ previous }) =>
        previous!.source === 'awareness' ? previous!.value.eventId : previous!.value.id,
      ),
  );
  if (
    (world.memories[actorId] ?? []).some(
      (memory) =>
        memory.kind === 'commitment' &&
        !memory.resolved &&
        [memory.id, memory.eventId, memory.obligation?.evidenceId].some(
          (id) => !!id && removed.has(id),
        ),
    )
  )
    return null;
  const updatedSources: string[] = [];
  const updatedValues = new Map<ExperienceEntry['value'], ExperienceEntry['value']>();
  const rankingSources: string[] = [];
  const deletedSources: string[] = [];
  for (const { change, previous } of resolved) {
    if (!previous || change.operation === 'add') return null;
    const sourceId = previous.source === 'awareness' ? previous.value.eventId : previous.value.id;
    if (change.operation === 'update') {
      const awarenessTextChanged =
        previous.source === 'awareness' &&
        change.entry.source === 'awareness' &&
        previous.value.text !== change.entry.value.text;
      const awarenessContentChanged =
        previous.source === 'awareness' &&
        change.entry.source === 'awareness' &&
        previous.value.content !== change.entry.value.content;
      const replacement = replacements.get(previous)!;
      const proseChanged =
        previous.source === 'awareness'
          ? awarenessTextChanged || awarenessContentChanged
          : previous.source === 'memory'
            ? previous.value.summary !== (replacement as MemoryRecord).summary
            : previous.value.text !== (replacement as ExperienceSummary).text;
      if (previous.source === 'awareness' && awarenessTextChanged && !awarenessContentChanged)
        (replacement as Awareness).content = (replacement as Awareness).text;
      if (previous.source === 'summary')
        (replacement as ExperienceSummary).revision = (previous.value.revision ?? 0) + 1;
      updatedValues.set(previous.value, replacement);
      // Ranking edits refresh retrieval without erasing accepted prose or its dependencies.
      // See docs/architecture.md#public-updates-and-owner-editors.
      (proseChanged ? updatedSources : rankingSources).push(sourceId);
    } else {
      deletedSources.push(sourceId);
      if (previous.source === 'memory' && previous.value.eventId)
        deletedSources.push(previous.value.eventId);
    }
  }
  // Append ownership freezes source records; replace edited rows rather than mutating
  // those records in the same turn. Unchanged rows keep identity and order.
  // docs/hearing-and-speech.md#performance-and-invalidation
  if (updatedValues.size) {
    for (const { previous } of resolved) {
      const replacement = previous && updatedValues.get(previous.value);
      if (!previous || !replacement) continue;
      adjustExperienceAccounting(world, actorId, previous, -1);
      adjustExperienceAccounting(
        world,
        actorId,
        { source: previous.source, value: replacement } as ExperienceEntry,
        1,
      );
    }
    const replace = <T extends ExperienceEntry['value']>(rows: T[]) =>
      rows.map((entry) => (updatedValues.get(entry) as T | undefined) ?? entry);
    const state = world.experience!;
    if (resolved.some(({ previous }) => previous?.source === 'awareness'))
      state.awareness[actorId] = replace(state.awareness[actorId] ?? []);
    if (resolved.some(({ previous }) => previous?.source === 'memory'))
      world.memories[actorId] = replace(world.memories[actorId] ?? []);
    if (resolved.some(({ previous }) => previous?.source === 'summary'))
      state.summaries[actorId] = replace(state.summaries[actorId] ?? []);
  }
  const invalidated = new Set<string>(rankingSources);
  if (updatedSources.length)
    for (const id of invalidateExperience(world, actorId, updatedSources)) invalidated.add(id);
  if (deletedSources.length)
    for (const id of invalidateExperience(world, actorId, deletedSources, true))
      invalidated.add(id);
  return [...invalidated];
}
export function flattenFiles(files: InnerWorld['files']): string {
  const paths = new Set<string>();
  if (!files.length || files.length > 10) throw new Error('The inner world requires 1–10 files.');
  for (const file of files) {
    if (!/^[\p{L}\p{N}_ -]{1,64}\.md$/u.test(file.path) || paths.has(file.path))
      throw new Error('Invalid or duplicate inner-world filename.');
    if (
      wordCount(file.path + ' ' + file.text) > 500 ||
      byteCount(file.path + '\n' + file.text) > 8000
    )
      throw new Error('Inner-world file quota exceeded; content was not truncated.');
    paths.add(file.path);
  }
  return [...files]
    .sort((a, b) => a.path.localeCompare(b.path, 'en'))
    .map((f) => `# ${f.path}\n${f.text}`)
    .join('\n\n');
}
/** Historical name retained for callers; only initialize newly capable actors.
 * Never fill absent roles from raw events: absence can mean an unidentified voice.
 * docs/hearing-and-speech.md#5-one-occurrence-listener-specific-evidence */
export function migrateCognition(world: WorldState): void {
  initializeIdentity(world);
  world.experience ??= {
    version: 1,
    awareness: {},
    summaries: {},
    consolidatedAt: {},
    forgotten: {},
  };
  world.innerWorlds ??= {};
  for (const entity of entityValues(world.entities)) {
    if (!hasMemory(entity)) continue;
    if (!Object.hasOwn(world.experience.awareness, entity.id)) {
      world.experience.awareness[entity.id] = [];
      installKnownPlaceEvidence(world, entity.id, prepareKnownPlaceEvidence([]));
    }
    if (world.innerWorlds[entity.id]) continue;
    const mind = ((world.minds ??= {})[entity.id] ??= mindFor(world, entity.id));
    const files = mind.documents.map((doc) => ({
      path: `${doc.id}.md`,
      text: `${doc.title}\n\n${doc.text}`,
    }));
    world.innerWorlds[entity.id] = {
      text: [...files]
        .sort((a, b) => a.path.localeCompare(b.path, 'en'))
        .map((file) => `# ${file.path}\n${file.text}`)
        .join('\n\n'),
      files,
      revision: mind.revision,
      sourceSnapshot: 'actor-initialization',
      publicationJobId: 'actor-initialization',
      evidenceIds: mind.documents.flatMap((d) => d.evidence.map((e) => e.id)),
    };
  }
}
/** One projection for recall and derived speech indexing; never consult the raw world event. */
export function awarenessMemory(entry: Awareness): MemoryRecord {
  return {
    id: entry.eventId,
    eventId: entry.eventId,
    actorId: entry.actorId,
    at: entry.at,
    sequence: entry.sequence,
    kind: 'episode',
    source: entry.modality,
    summary: entry.text,
    entityIds: entry.entityIds,
    importance: entry.importance,
    eventType: entry.eventType,
    speakerId: entry.sourceId,
    evidence: entry,
    ...(entry.retention ? { retention: entry.retention } : {}),
    ...(entry.sourceReceipt ? { sourceReceipt: entry.sourceReceipt } : {}),
    observation: entry.observation,
    observations: entry.observations,
  };
}
export function experiences(
  world: WorldState,
  actorId: string,
  includeBacklog = false,
): MemoryRecord[] {
  // Public query IDs never resolve inherited Object prototype members.
  if (!entityHas(world.entities, actorId) || !entityGet(world.entities, actorId)?.actor) return [];
  const state = world.experience;
  const forgotten = new Set(state?.forgotten[actorId] ?? []);
  const invalidated = new Set([...forgotten, ...Object.keys(state?.corrections?.[actorId] ?? {})]);
  const aware = (state?.awareness[actorId] ?? []).filter(
    (entry) => entry.retentionClass !== 'sensory',
  );
  const eventIds = new Set(aware.map((a) => a.eventId));
  const personal = (world.memories[actorId] ?? []).filter(
    (m) =>
      !forgotten.has(m.id) &&
      !forgotten.has(m.eventId ?? '') &&
      !(m.eventId && eventIds.has(m.eventId) && m.kind === 'episode') &&
      (m.kind === 'commitment' ||
        (m.kind === 'episode' && m.source !== 'inferred') ||
        (m.kind === 'impression' && !!m.impression && !experienceDependsOn(m, invalidated))),
  );
  const events: MemoryRecord[] = aware
    .filter((a) => !forgotten.has(a.eventId))
    .map(awarenessMemory);
  const summaries: MemoryRecord[] = (state?.summaries[actorId] ?? [])
    .filter(
      (s) =>
        !s.manifest.coverage.some(
          (ref) => forgotten.has(ref.id) || !!state?.corrections?.[actorId]?.[ref.id],
        ),
    )
    .map((s) => summaryMemory(s, actorId));
  const raw = [...personal.filter((m) => m.kind !== 'commitment'), ...events];
  // Age makes a source eligible for consolidation, not ineligible for remembering.
  // Bound initial context candidates while retaining the full backlog for maintenance.
  const eligible = includeBacklog
    ? raw
    : raw
        .sort(
          (a, b) =>
            Number(b.importance >= EXPERIENCE_LIMITS.protectedImportance) -
              Number(a.importance >= EXPERIENCE_LIMITS.protectedImportance) ||
            b.at - a.at ||
            b.importance - a.importance,
        )
        .slice(0, EXPERIENCE_LIMITS.recallRaw);
  return [...personal.filter((m) => m.kind === 'commitment'), ...eligible, ...summaries];
}

/** Immediate summaries and original received leaves are distinct dependencies: a later
 * summary can retire its source summary without retaining that source's text or identity
 * in leaf coverage. Keep both relationships when editing personal history. */
function experienceDependsOn(
  entry: MemoryRecord | ExperienceSummary,
  affected: ReadonlySet<string>,
): boolean {
  return (
    affected.has(entry.id) ||
    ('eventId' in entry && !!entry.eventId && affected.has(entry.eventId)) ||
    ('sourceReceipt' in entry &&
      !!entry.sourceReceipt &&
      affected.has(temporalReceiptId(entry.sourceReceipt))) ||
    ('observation' in entry && !!entry.observation && affected.has(entry.observation.id)) ||
    ('sources' in entry && entry.sources.some((source) => affected.has(source.id))) ||
    (!!entry.manifest && manifestDependsOn(entry.manifest, affected)) ||
    ('impression' in entry &&
      !!entry.impression &&
      entry.impression.dependencies.some((dependency) =>
        'source' in dependency
          ? affected.has(dependency.source.id) || dependency.aliases.some((id) => affected.has(id))
          : affected.has(dependency.id),
      ))
  );
}

/** Canonical accounts remain editable even when a correction excludes them from recall.
 * A retired original stays editable while an eligible account depends on it. Cold
 * callers prepare these bodies through the existing history-edit dependency closure. */
export function retainedExperienceSource(
  world: WorldState,
  actorId: string,
  sourceId: string,
): boolean {
  if (
    ['awareness', 'memory', 'summary'].some((kind) =>
      experienceEntry(world, actorId, `${kind}:${sourceId}`),
    )
  )
    return true;
  const affected = new Set([sourceId]);
  if (
    Object.values(world.experience?.temporal?.actors[actorId]?.supports ?? {}).some(
      (support) =>
        support.receipt.id === sourceId ||
        temporalSupportAliases(support, world).includes(sourceId),
    )
  )
    return true;
  if (
    world.experience?.temporal?.actors[actorId]?.chunks.some((chunk) =>
      chunk.receipts.some(
        (receipt) =>
          receipt.id === sourceId ||
          temporalReceiptAliases(receipt, world.experience!.temporal!.sources, world).includes(
            sourceId,
          ),
      ),
    )
  )
    return true;
  const retained = experiences(world, actorId, true);
  if (retained.some((entry) => experienceDependsOn(entry, affected))) return true;
  // Memory projections carry original coverage. Read immediate typed summary sources
  // from their actual owner rather than copying a second lineage into those projections.
  const retainedIds = new Set(retained.map((entry) => entry.id));
  return (world.experience?.summaries[actorId] ?? []).some(
    (summary) => retainedIds.has(summary.id) && experienceDependsOn(summary, affected),
  );
}
/** Trigger selection reads only records newer than a character's considered-evidence
 * watermark. Same visibility rules as `experiences` (forgotten sources, corrected summaries,
 * awareness superseding its episode copy) without materializing or sorting retained history.
 * At most `limit` records: protected-importance records, then caller-preferred records, then
 * newest. `maxSequence` covers every visible resident record, so only records the caller
 * would not act on can be passed beyond `limit`.
 * docs/maintainers/events-perception-and-reactions.md#epr05--change-fed-actorwork-and-one-reaction-intake */
export function unseenExperiences(
  world: WorldState,
  actorId: string,
  afterSequence: number,
  limit = 256,
  /** Records the caller would act on (for example trigger evidence); kept before truncation. */
  prefer: (record: MemoryRecord) => boolean = () => false,
): { records: MemoryRecord[]; maxSequence: number } {
  if (!entityHas(world.entities, actorId) || !entityGet(world.entities, actorId)?.actor)
    return { records: [], maxSequence: afterSequence };
  const state = world.experience;
  const forgotten = new Set(state?.forgotten[actorId] ?? []);
  const aware = (state?.awareness[actorId] ?? []).filter(
    (entry) => entry.retentionClass !== 'sensory',
  );
  let maxSequence = afterSequence;
  const records: MemoryRecord[] = [];
  for (const entry of aware) {
    if (forgotten.has(entry.eventId)) continue;
    maxSequence = Math.max(maxSequence, entry.sequence);
    if (entry.sequence > afterSequence) records.push(awarenessMemory(entry));
  }
  let awareEvents: Set<string> | undefined;
  for (const memory of world.memories[actorId] ?? []) {
    if (
      forgotten.has(memory.id) ||
      forgotten.has(memory.eventId ?? '') ||
      !(memory.kind === 'commitment' || (memory.kind === 'episode' && memory.source !== 'inferred'))
    )
      continue;
    if (memory.kind === 'episode' && memory.eventId) {
      awareEvents ??= new Set(aware.map((entry) => entry.eventId));
      if (awareEvents.has(memory.eventId)) continue;
    }
    maxSequence = Math.max(maxSequence, memory.sequence ?? 0);
    if ((memory.sequence ?? 0) > afterSequence) records.push(memory);
  }
  for (const s of state?.summaries[actorId] ?? []) {
    if (
      s.manifest.coverage.some(
        (ref) => forgotten.has(ref.id) || !!state?.corrections?.[actorId]?.[ref.id],
      )
    )
      continue;
    maxSequence = Math.max(maxSequence, s.sequence ?? 0);
    if ((s.sequence ?? 0) > afterSequence) records.push(summaryMemory(s, actorId));
  }
  // Truncation keeps important and caller-preferred records first, so a cursor that passes a
  // long routine backlog never skips unread evidence its caller would have acted on.
  const rank = (record: MemoryRecord) =>
    record.importance >= EXPERIENCE_LIMITS.protectedImportance ? 2 : prefer(record) ? 1 : 0;
  records.sort((a, b) => rank(b) - rank(a) || (b.sequence ?? 0) - (a.sequence ?? 0));
  return { records: records.slice(0, limit), maxSequence };
}
export interface MemoryGroup {
  sourceKeys: string[];
  text: string;
}
/** The reading view is derived; every maintenance/model caller retains its complete entry. */
export function experienceReading(entry: ExperienceEntry, actorId: string): MemoryRecord {
  if (entry.source === 'awareness') return awarenessMemory(entry.value);
  if (entry.source === 'memory') return entry.value;
  return summaryMemory(entry.value, actorId);
}
/** Complete sources, exact kind/key/revision and an explicit partition precede retirement.
 * Protected originals stay unchanged, including their structured evidence. */
export function acceptConsolidation(
  input: WorldState,
  actorId: string,
  id: string,
  sources: ExperienceEntry[],
  groups: MemoryGroup[],
  prepared: PreparedExperience[],
): Transition {
  const reject = (message: string): Transition => ({
    world: input,
    events: [],
    outcome: outcome(false, 'consolidation-rejected', message),
  });
  if (!input.experience || !sources.length || !groups.length)
    return reject('Invalid memory groups.');
  if (
    sources.length > PERSONAL_EVIDENCE_PREPARATION.rows ||
    sources.reduce((bytes, entry) => bytes + byteCount(JSON.stringify(entry.value)), 0) >
      PERSONAL_EVIDENCE_PREPARATION.bytes
  )
    return reject(
      'Complete consolidation sources exceed preparation capacity; originals retained.',
    );
  if (input.experience.summaries[actorId]?.some((s) => s.id.startsWith(`${id}:`)))
    return {
      world: input,
      events: [],
      outcome: outcome(true, 'duplicate', 'Memory groups already accepted.'),
    };
  const current = experienceEntries(input, actorId);
  const expected = new Map(sources.map((entry) => [experienceEntryKey(entry), entry]));
  const inputs = new Map(prepared.map((source) => [experienceEntryKey(source.entry), source]));
  if (
    inputs.size !== sources.length ||
    sources.some((entry) => {
      const bound = inputs.get(experienceEntryKey(entry));
      return (
        !bound ||
        canonicalJson(bound.entry) !== canonicalJson(entry) ||
        canonicalJson(bound.ref) !== canonicalJson(experienceSourceReference(entry))
      );
    })
  )
    return reject('Exact captured source coverage changed.');
  if (
    expected.size !== sources.length ||
    sources.some((entry) => {
      const key = experienceEntryKey(entry),
        reference = experienceSourceReference(entry);
      const actual = current.get(`${reference.kind}:${reference.id}`);
      const reading = experienceReading(entry, actorId);
      return (
        !['episode', 'reflection'].includes(reading.kind) ||
        !actual ||
        JSON.stringify(actual) !== JSON.stringify(entry) ||
        !expected.has(key)
      );
    })
  )
    return reject('Source coverage changed.');
  const used = new Set<string>();
  const positions = new Map(sources.map((entry, index) => [experienceEntryKey(entry), index]));
  let previousPosition = -1;
  for (const group of groups) {
    if (
      !group.sourceKeys.length ||
      !group.text.trim() ||
      byteCount(group.text) > EXPERIENCE_LIMITS.summaryBytes
    )
      return reject('Invalid memory group.');
    for (const key of group.sourceKeys) {
      if (!expected.has(key) || used.has(key)) return reject('Unknown or repeated source.');
      used.add(key);
    }
    const groupPositions = group.sourceKeys.map((key) => positions.get(key)!);
    if (
      groupPositions.some(
        (position, index) =>
          position <= previousPosition ||
          (index > 0 && position !== groupPositions[index - 1]! + 1),
      )
    )
      return reject('Memory groups cross an intervening source or change chronological order.');
    previousPosition = groupPositions.at(-1)!;
    const important = group.sourceKeys
      .map((key) => experienceReading(expected.get(key)!, actorId))
      .filter((source) => source.importance >= EXPERIENCE_LIMITS.protectedImportance);
    if (important.length && (group.sourceKeys.length !== 1 || group.text !== important[0]!.summary))
      return reject('Important incidents must remain separate and unchanged.');
  }
  if (used.size !== sources.length)
    return reject('Every supplied source requires explicit coverage.');
  const previous = input.experience.summaries[actorId] ?? [];
  const retired = sources.filter(
    (entry) => entry.value.importance < EXPERIENCE_LIMITS.protectedImportance,
  );
  const retiredKeys = new Set(retired.map(experienceEntryKey));
  const retained = previous.filter(
    (summary) => !retiredKeys.has(experienceEntryKey({ source: 'summary', value: summary })),
  );
  let replacements: ExperienceSummary[];
  try {
    replacements = groups
      .filter((group) => group.sourceKeys.some((key) => retiredKeys.has(key)))
      .map((group, i) => {
        const entries = group.sourceKeys.map((key) => expected.get(key)!);
        const readings = entries.map((entry) => experienceReading(entry, actorId));
        const existing = entries.flatMap((entry) =>
          entry.source === 'summary' ? [entry.value] : [],
        );
        return {
          id: existing[0]?.id ?? `${id}:${i}`,
          revision: Math.max(0, ...existing.map((summary) => summary.revision ?? 0)) + 1,
          text: personalText(input, actorId, group.text),
          from: Math.min(
            ...entries.map((entry, index) =>
              entry.source === 'summary' ? entry.value.from : readings[index]!.at,
            ),
          ),
          to: Math.max(...readings.map((source) => source.at)),
          sources: experienceSourceCoverage(entries),
          manifest: experienceManifest(
            entries.map((entry) => inputs.get(experienceEntryKey(entry))!),
          ),
          ...(() => {
            const reasons = entries.flatMap((entry) =>
              entry.value.retention ? [entry.value.retention] : [],
            );
            const retention = reasons.find((reason) => reason.required) ?? reasons[0];
            return retention ? { retention: cloneValue(retention) } : {};
          })(),
          entityIds: [...new Set(entries.flatMap((entry) => entry.value.entityIds))],
          importance: Math.max(...readings.map((source) => source.importance)),
          sequence: Math.max(0, ...readings.map((source) => source.sequence ?? 0)),
        };
      });
  } catch (error) {
    return reject(error instanceof Error ? error.message : 'Invalid summary attribution.');
  }
  if (replacements.some((summary) => !validExperienceSummary(summary, actorId)))
    return reject(
      'Complete summary attribution exceeds preparation capacity or is invalid; originals retained.',
    );
  const world = draftWorld(input);
  const invalidated = mutateExperience(world, actorId, {
    operation: 'consolidate',
    retiredSources: retired.map(experienceSourceReference),
    summaries: [...retained, ...replacements].sort(
      (a, b) => a.to - b.to || a.id.localeCompare(b.id),
    ),
  });
  if (!invalidated) return reject('Protected or forgotten sources changed.');
  const result = finish(
    world,
    [],
    outcome(
      true,
      'consolidated',
      'Explicit memory groups accepted; covered routine sources retired.',
    ),
  );
  return { ...result, invalidatedMemoryIds: { [actorId]: invalidated } };
}
/** Forget derivatives conservatively; original evidence of other observers is untouched. */
export function forgetExperience(input: WorldState, actorId: string, sourceId: string): Transition {
  const aliases = new Set(temporalAccountAliasClosure(input, actorId, [sourceId]));
  if (
    (input.memories[actorId] ?? []).some(
      (memory) =>
        memory.kind === 'commitment' &&
        !memory.resolved &&
        [memory.id, memory.eventId, memory.obligation?.evidenceId].some(
          (id) => !!id && aliases.has(id),
        ),
    )
  )
    return {
      world: input,
      events: [],
      outcome: outcome(
        false,
        'commitment',
        'Resolve protected obligations before forgetting their evidence.',
      ),
    };
  const world = draftWorld(input);
  migrateCognition(world);
  const key = world.experience!.awareness[actorId]?.some((entry) => entry.eventId === sourceId)
    ? `awareness:${sourceId}`
    : world.memories[actorId]?.some((entry) => entry.id === sourceId)
      ? `memory:${sourceId}`
      : world.experience!.summaries[actorId]?.some((entry) => entry.id === sourceId)
        ? `summary:${sourceId}`
        : null;
  const invalidated = key
    ? mutateExperience(world, actorId, { operation: 'delete', entryId: key })!
    : invalidateExperience(world, actorId, [sourceId], true);
  if (!invalidated)
    return {
      world: input,
      events: [],
      outcome: outcome(
        false,
        'commitment',
        'Resolve protected obligations before forgetting their evidence.',
      ),
    };
  return {
    ...finish(world, [], outcome(true, 'forgotten', 'Recall and derived inner world invalidated.')),
    invalidatedMemoryIds: { [actorId]: invalidated },
  };
}

/** An accepted interpretation remains a fallible account. The captured actor receipts
 * establish its provenance, never an exact knowledge or execution grant. */
export function rememberInterpretation(
  world: WorldState,
  actorId: string,
  id: string,
  text: string,
  received: readonly { receipt: TemporalReceipt; values: readonly TemporalValue[] }[],
): boolean {
  if (
    !world.experience ||
    !hasMemory(entityGet(world.entities, actorId)) ||
    !text.trim() ||
    text.length > 1200 ||
    !received.length ||
    received.length > 8
  )
    return false;
  const forgotten = new Set(world.experience.forgotten[actorId] ?? []);
  const corrections = world.experience.corrections?.[actorId] ?? {};
  const allowed = (sourceId: string) =>
    !forgotten.has(sourceId) && !Object.hasOwn(corrections, sourceId);
  const dependencies = new Map<
    string,
    import('./remembered-impressions.js').ImpressionDependency
  >();
  const provenance: import('./remembered-impressions.js').ImpressionProvenanceSpan[] = [];
  const receipts = new Set<string>();
  for (const { receipt, values } of received) {
    if (
      receipt.actorId !== actorId ||
      receipt.at > world.simTime ||
      receipt.facets.length !== values.length ||
      !receipt.sourceIds.every(allowed) ||
      receipt.facets.some(
        (reference, index) => !temporalFacetEligible(world, actorId, reference, values[index]!),
      )
    )
      return false;
    if (receipts.has(receipt.id)) continue;
    receipts.add(receipt.id);
    const sources: import('./temporal-evidence.js').TemporalEvidenceState['sources'] = {};
    const storedFacets = receipt.facets.map((reference, index) => {
      const { value, reception } = splitTemporalValue(values[index]!);
      const block = (sources[reference.blockId] ??= {
        id: reference.blockId,
        at: receipt.at,
        sequence: 0,
        bytes: 0,
        values: [],
      });
      block.values[reference.valueOrdinal] = value;
      return { ...reference, ...(reception ? { reception } : {}) };
    });
    const source = temporalReceiptSource(receipt);
    dependencies.set(canonicalJson(source), {
      source,
      ordinal: null,
      aliases: temporalReceiptAliases({ ...receipt, facets: storedFacets }, sources, world),
    });
    provenance.push({
      actorId,
      physicalLife: receipt.physicalLife,
      epoch: receipt.epoch,
      family: 'temporal-receipt',
      from: receipt.ordinal,
      through: receipt.ordinal,
    });
  }
  const policy = selectedTemporalPolicy(world);
  const from = Math.min(...received.map(({ receipt }) => receipt.at));
  const through = Math.max(...received.map(({ receipt }) => receipt.at));
  const entry = createRememberedImpression(
    {
      id,
      actorId,
      kind: 'reflection',
      source: 'inferred',
      summary: text.trim(),
      at: through,
      entityIds: [],
      importance: 5,
      retention: { reason: 'deliberate' },
    },
    provenance,
    world.simTime,
    policy.impression,
    [...dependencies.values()],
  );
  if (!entry?.impression) return false;
  entry.impression.from = from;
  if (!impressionFits(entry, policy.impression)) return false;
  ensureExperienceAccounting(world, actorId);
  const account = world.experience.temporal!.actors[actorId]!.accounts!.optional;
  if (
    account.count + 1 > policy.optional.maxRecords ||
    account.bytes + encodedExperienceBytes({ source: 'memory', value: entry }) >
      policy.optional.maxBytes
  )
    return false;
  return (
    applyExperienceMutation(
      world,
      actorId,
      { operation: 'add', entry: { source: 'memory', value: entry } },
      'transfer',
    ) !== null
  );
}

/** Only accepted semantic use reinforces the exact selected impressions. Reads,
 * indexing and prompt construction never call this mutation owner. */
export function reinforceExperience(
  world: WorldState,
  actorId: string,
  sourceIds: readonly string[],
): void {
  if (!sourceIds.length) return;
  const selected = new Set(sourceIds);
  const memories = world.memories[actorId];
  if (!memories) return;
  const policy = selectedTemporalPolicy(world);
  for (let index = 0; index < memories.length; index++) {
    const prior = memories[index]!;
    if (!selected.has(prior.id) || prior.kind !== 'impression') continue;
    const next = reinforceImpression(prior, world.simTime, policy.impression);
    if (next === prior) continue;
    ensureExperienceAccounting(world, actorId);
    const account = world.experience!.temporal!.actors[actorId]!.accounts!.optional;
    const delta =
      encodedExperienceBytes({ source: 'memory', value: next }) -
      encodedExperienceBytes({ source: 'memory', value: prior });
    if (delta > 0 && account.bytes + delta > policy.optional.maxBytes) continue;
    adjustExperienceAccounting(world, actorId, { source: 'memory', value: prior }, -1);
    adjustExperienceAccounting(world, actorId, { source: 'memory', value: next }, 1);
    trackDetachedRecord(world, next);
    trackRecordArray(world, world.memories, actorId);
    memories[index] = next;
  }
}

/** Apply a repository-prepared expiry/weakening batch. Expiry releases access; it
 * is neither a fictional correction nor a permanent privacy-forgetting ledger. */
export function expireExperience(
  world: WorldState,
  actorId: string,
  entries: readonly ExperienceEntry[],
  replacements: readonly MemoryRecord[],
): boolean {
  // Capability loss stops new autobiographical accounts, not retirement of
  // already stored exact sources under the ordinary retention owner.
  if (!world.experience || (replacements.length && !hasMemory(entityGet(world.entities, actorId))))
    return false;
  const selected = new Set<string>();
  for (const entry of entries) {
    const id = entry.source === 'awareness' ? entry.value.eventId : entry.value.id;
    const key = `${entry.source}:${id}`;
    if (selected.has(key)) return false;
    const current = experienceEntry(world, actorId, key);
    if (
      !current ||
      canonicalJson(current) !== canonicalJson(entry) ||
      (entry.source === 'memory' && entry.value.kind === 'commitment' && !entry.value.resolved)
    )
      return false;
    selected.add(key);
  }
  const limits = selectedTemporalPolicy(world).impression;
  const additions: ExperienceEntry[] = replacements.map((value) => ({ source: 'memory', value }));
  if (
    replacements.some((value) => value.actorId !== actorId || !impressionFits(value, limits)) ||
    !canAddExperience(world, actorId, additions, selected)
  )
    return false;
  ensureExperienceAccounting(world, actorId);
  for (const entry of entries) adjustExperienceAccounting(world, actorId, entry, -1);
  const state = world.experience;
  state.awareness[actorId] = (state.awareness[actorId] ?? []).filter(
    (entry) => !selected.has(`awareness:${entry.eventId}`),
  );
  world.memories[actorId] = (world.memories[actorId] ?? []).filter(
    (entry) => !selected.has(`memory:${entry.id}`),
  );
  state.summaries[actorId] = (state.summaries[actorId] ?? []).filter(
    (entry) => !selected.has(`summary:${entry.id}`),
  );
  invalidateKnownPlaceEvidence(world, actorId);
  if (
    additions.length &&
    applyExperienceMutation(
      world,
      actorId,
      additions.map((entry) => ({ operation: 'add' as const, entry })),
      'transfer',
    ) === null
  )
    throw new Error('Prepared experience expiry could not publish its recollection.');
  return true;
}

/** Mutates a domain draft; callers commit cache invalidation with the resulting world. */
export function invalidateExperience(
  world: WorldState,
  actorId: string,
  sourceIds: string[],
  forget = false,
  correctionEventId?: string,
): string[] {
  const state = world.experience!;
  // Natural expiry uses expireExperience and does not manufacture a privacy revision.
  if (sourceIds.length)
    (state.privacyRevisions ??= {})[actorId] = (state.privacyRevisions?.[actorId] ?? 0) + 1;
  ensureExperienceAccounting(world, actorId);
  const accounting = experienceEntries(world, actorId);
  invalidateKnownPlaceEvidence(world, actorId);
  const roots = new Set(temporalAccountAliasClosure(world, actorId, sourceIds));
  const affected = new Set(roots);
  let expanded = true;
  const include = (id: string | undefined) => {
    if (id && !affected.has(id)) {
      affected.add(id);
      expanded = true;
    }
  };
  while (expanded) {
    expanded = false;
    // A direct account alias revokes the account. Embedded fact dependencies
    // instead revoke their selected facets; promoting those to the receipt ID
    // would erase independently received siblings in the resident account.
    for (const alias of temporalAccountAliasClosure(world, actorId, affected)) include(alias);
    // Personal source IDs and native contributions are aliases of one received account.
    // Revoke descendants before pruning any body, including required native support that
    // is independent of the small resident autobiographical tail.
    for (const entry of state.awareness[actorId] ?? []) {
      const observations = [
        ...(entry.observation ? [entry.observation] : []),
        ...(entry.observations ?? []),
      ];
      if (
        affected.has(entry.eventId) ||
        (entry.sourceReceipt && affected.has(temporalReceiptId(entry.sourceReceipt))) ||
        (entry.observation && affected.has(entry.observation.id))
      ) {
        include(entry.eventId);
        for (const observation of observations) include(observation.id);
      }
    }
    for (const memory of world.memories[actorId] ?? []) {
      const observations = [
        ...(memory.observation ? [memory.observation] : []),
        ...(memory.observations ?? []),
        ...(memory.manifest?.observations ?? []),
      ];
      if (experienceDependsOn(memory, affected)) {
        include(memory.id);
        for (const observation of observations) include(observation.id);
      }
    }
    for (const observation of world.perceptionEvidence?.[actorId]?.received ?? []) {
      if (
        (observation.origin.kind === 'occurrence' && affected.has(observation.origin.eventId)) ||
        observation.facets.some(
          (facet) =>
            facet.value.kind === 'claim' &&
            (facet.value.support.some((key) => affected.has(key.source.id)) ||
              facet.value.supportAliases?.some((alias) => affected.has(alias.id))),
        )
      )
        include(observation.id);
    }
    // A native action and its experienced result are two views of the same source.
    // Forgetting either must not let the other reintroduce that private experience.
    for (const memory of world.memories[actorId] ?? []) {
      if (
        (memory.eventId && affected.has(memory.eventId)) ||
        (memory.sourceReceipt && affected.has(temporalReceiptId(memory.sourceReceipt))) ||
        (memory.activityId && affected.has(memory.activityId))
      )
        include(memory.id);
      if (affected.has(memory.id)) {
        include(memory.activityId);
        include(memory.eventId);
      }
    }
    for (const occurrence of world.actionExperience.occurrences[actorId] ?? []) {
      if (affected.has(occurrence.id)) include(occurrence.resultMemoryId);
      if (occurrence.resultMemoryId && affected.has(occurrence.resultMemoryId))
        include(occurrence.id);
    }
    for (const [source, correction] of Object.entries(state.corrections?.[actorId] ?? {}))
      if (affected.has(correction) && !affected.has(source)) {
        affected.add(source);
        expanded = true;
      }
    for (const summary of state.summaries[actorId] ?? [])
      if (!affected.has(summary.id) && experienceDependsOn(summary, affected)) {
        affected.add(summary.id);
        expanded = true;
      }
  }
  revokeLearnedRecipeSupport(world, actorId, affected);
  invalidateTemporalEvidence(world, actorId, affected);
  revokeReceivedGeometryEvidence(world, actorId, affected);
  revokeAttentionEvidence(world, actorId, affected);
  revokeInventoryInspection(world, actorId, affected);
  // Learning depends on the actual selected earlier exemplar. Follow immediate
  // edges supplied by cold preparation without erasing later witnessed utterances.
  const recognitionAffected = new Set(affected);
  const recognitionEntries = [
    ...(state.awareness[actorId] ?? []).map((entry) => ({
      id: entry.eventId,
      recognition: entry.recognition,
      originals: [...(entry.observation ? [entry.observation] : []), ...(entry.observations ?? [])],
    })),
    ...(world.memories[actorId] ?? []).map((entry) => ({
      id: entry.id,
      recognition: entry.evidence?.recognition,
      originals: [
        ...(entry.observation ? [entry.observation] : []),
        ...(entry.observations ?? []),
        ...(entry.evidence?.observation ? [entry.evidence.observation] : []),
        ...(entry.evidence?.observations ?? []),
      ],
    })),
  ];
  const learningEdges = new Map<string, Set<string>>();
  const learningEdge = (from: string, to: string) => {
    const targets = learningEdges.get(from) ?? new Set<string>();
    targets.add(to);
    learningEdges.set(from, targets);
  };
  for (const entry of recognitionEntries) {
    for (const source of ownedObservationSources(entry.originals)) {
      learningEdge(entry.id, source.id);
      learningEdge(source.id, entry.id);
    }
    for (const source of [
      ...recognitionSupportSources(entry.recognition?.learningSupport ?? []),
      ...observationLearningSources(entry.originals),
    ])
      learningEdge(source.id, entry.id);
  }
  for (const observation of world.perceptionEvidence?.[actorId]?.received ?? [])
    for (const source of observationLearningSources([observation]))
      learningEdge(source.id, observation.id);
  const learningQueue = [...recognitionAffected];
  for (let position = 0; position < learningQueue.length; position++)
    for (const next of learningEdges.get(learningQueue[position]!) ?? [])
      if (!recognitionAffected.has(next)) {
        recognitionAffected.add(next);
        learningQueue.push(next);
      }
  for (const summary of state.summaries[actorId] ?? [])
    if (experienceDependsOn(summary, recognitionAffected)) affected.add(summary.id);
  const revokedFacts = new Set<string>();
  const markAssociationFacts = (
    observation: import('./perception-evidence.js').ObservationContribution,
  ) => {
    for (const facet of observation.facets) {
      if (
        facet.value.kind === 'association' &&
        (recognitionAffected.has(observation.id) ||
          recognitionSupportSources(facet.value.learningSupport ?? []).some((source) =>
            recognitionAffected.has(source.id),
          ))
      )
        revokedFacts.add(personalFactAlias(observation.id, facet.ordinal));
      if (facet.value.kind === 'confirmation') markAssociationFacts(facet.value.snapshot.original);
      if (facet.value.kind === 'observed-motion')
        for (const sample of [facet.value.earlier, facet.value.later])
          markAssociationFacts(sample.original);
    }
  };
  for (const entry of recognitionEntries)
    for (const observation of entry.originals) markAssociationFacts(observation);
  for (const summary of state.summaries[actorId] ?? [])
    for (const observation of summary.manifest.observations) markAssociationFacts(observation);
  for (const observation of world.perceptionEvidence?.[actorId]?.received ?? [])
    markAssociationFacts(observation);
  invalidateTemporalFacets(
    world,
    actorId,
    (value, reference) =>
      value.kind === 'association' &&
      ((!!reference.original &&
        (recognitionAffected.has(reference.original.source.id) ||
          revokedFacts.has(
            personalFactAlias(reference.original.source.id, reference.original.ordinal),
          ))) ||
        recognitionSupportSources(value.learningSupport ?? []).some((source) =>
          recognitionAffected.has(source.id),
        )),
  );
  if (correctionEventId) {
    const corrections = ((state.corrections ??= {})[actorId] ??= {});
    for (const alias of revokedFacts) corrections[alias] = correctionEventId;
  } else if (revokedFacts.size) {
    state.forgotten[actorId] = [...new Set([...(state.forgotten[actorId] ?? []), ...revokedFacts])];
  }
  const retainedDirect = new Set<string>();
  if (forget) {
    // Losing the correction does not turn its earlier direct observation back into
    // established information. Keep that occurrence and its explicit disputed marker.
    for (const [source, correction] of Object.entries(state.corrections?.[actorId] ?? {}))
      if (affected.has(correction) && !roots.has(source)) retainedDirect.add(source);
    for (const entry of state.awareness[actorId] ?? [])
      if (retainedDirect.has(entry.eventId))
        for (const observation of [
          ...(entry.observation ? [entry.observation] : []),
          ...(entry.observations ?? []),
        ])
          retainedDirect.add(observation.id);
    for (const memory of world.memories[actorId] ?? [])
      if (retainedDirect.has(memory.eventId ?? '') || retainedDirect.has(memory.id)) {
        retainedDirect.add(memory.id);
        for (const observation of [
          ...(memory.observation ? [memory.observation] : []),
          ...(memory.observations ?? []),
        ])
          retainedDirect.add(observation.id);
      }
  }
  const native = world.perceptionEvidence?.[actorId];
  if (native) {
    const remap = new Map<number, number>();
    native.received = native.received.filter((value, index) => {
      if (affected.has(value.id)) return false;
      remap.set(index, remap.size);
      return true;
    });
    native.receipts = Object.fromEntries(
      Object.entries(native.receipts).flatMap(([key, index]) => {
        const position = remap.get(index);
        return position === undefined ? [] : [[key, position]];
      }),
    );
    for (const [id, lease] of Object.entries(native.current))
      if (
        affected.has(lease.original.id) ||
        (lease.original.origin.kind === 'occurrence' &&
          affected.has(lease.original.origin.eventId)) ||
        (lease.value.kind === 'association' &&
          (recognitionAffected.has(lease.original.id) ||
            recognitionSupportSources(lease.value.learningSupport ?? []).some((source) =>
              recognitionAffected.has(source.id),
            )))
      )
        delete native.current[id];
  }
  revokeRecognitionEvidence(
    world,
    actorId,
    new Set(
      [...recognitionAffected].flatMap((id) => [
        id,
        `awareness:${id}`,
        `memory:${id}`,
        `summary:${id}`,
      ]),
    ),
  );
  revokeActivityEvidence(world, actorId, [...affected]);
  revokePracticeSupport(world, actorId, affected);
  revokeCombatEvidence(world, actorId, affected);
  if (forget) {
    state.forgotten[actorId] = [
      ...new Set([
        ...(state.forgotten[actorId] ?? []),
        ...[...affected].filter((id) => !retainedDirect.has(id)),
      ]),
    ];
    state.awareness[actorId] = (state.awareness[actorId] ?? []).filter(
      (a) => !affected.has(a.eventId) || retainedDirect.has(a.eventId),
    );
    world.memories[actorId] = (world.memories[actorId] ?? []).filter(
      (m) =>
        (m.kind === 'commitment' && !m.resolved) || !affected.has(m.id) || retainedDirect.has(m.id),
    );
    const corrections = state.corrections?.[actorId];
    if (corrections)
      for (const [id, evidence] of Object.entries(corrections))
        if (!retainedDirect.has(id) && (affected.has(id) || affected.has(evidence)))
          delete corrections[id];
  }
  // Privacy invalidation must also reach accepted canvases and observer identity associations.
  // docs/knowledge.md#privacy-and-correction
  advanceKnowledgeRevision(world, actorId);
  invalidateAppraisals(world, actorId);
  if (world.actorKnowledge?.[actorId]) {
    for (const [key, document] of Object.entries(world.actorKnowledge[actorId]!)) {
      const next = { ...document, text: '', evidenceIds: [], revision: document.revision + 1 };
      if (
        document.origin === 'actor-edit' &&
        !adjustRetainedKnowledgeAccounting(world, actorId, document, next, { revocation: true })
      )
        throw new Error('Retained knowledge could not release revoked support.');
      world.actorKnowledge[actorId]![key] = next;
    }
  }
  const summaries = state.summaries[actorId] ?? [];
  const retained = summaries.filter((s) => !affected.has(s.id) || (!forget && roots.has(s.id)));
  if (retained.length !== summaries.length) state.summaries[actorId] = retained;
  const inner = world.innerWorlds?.[actorId];
  const mind = mindFor(world, actorId);
  const identity = mind.documents.filter((d) => d.protected);
  mind.documents = identity;
  mind.records = mind.records.filter((r) => identity.some((d) => d.id === r.documentId));
  mind.thoughts = [];
  mind.revision++;
  (world.minds ??= {})[actorId] = mind;
  if (inner) {
    inner.files = identity.map((d) => ({ path: `${d.id}.md`, text: `${d.title}\n${d.text}` }));
    inner.text = flattenFiles(inner.files);
    inner.revision++;
    inner.evidenceIds = [];
    delete inner.publicationBody;
    inner.reconsiderationRequired = true;
    mind.revision = inner.revision;
  }
  reconcileExperienceAccounting(world, actorId, accounting);
  return [...affected];
}

export function publishInnerWorld(
  input: WorldState,
  actorId: string,
  expectedRevision: number,
  jobId: string,
  snapshot: string,
  files: InnerWorld['files'],
  thoughts: string[],
  evidenceIds: string[],
  dreamEpisode: string | null,
  _processedThrough = 0,
  goalChanges: GoalChange[] = [],
  knowledgeChanges: KnowledgeEdit[] = [],
  nameChanges: SubjectNameEdit[] = [],
  permittedSubjects: ObserverSubject[] = [],
  expectedEncounters?: Record<string, string>,
  knowledgeReferences: Record<string, ObserverSubject> = {},
  appraisalChanges: AppraisalChange[] = [],
  appraisalBindings: AppraisalBindings = { sources: [], subjects: [], reflection: true },
): Transition {
  const reject = (message: string) => ({
    world: input,
    events: [],
    outcome: outcome(false, 'publication-rejected', message),
  });
  const prior = input.innerWorlds?.[actorId];
  const actor = entityGet(input.entities, actorId)?.actor;
  const publicationBody = canonicalJson({
    actorId,
    expectedRevision,
    snapshot,
    files,
    thoughts,
    evidenceIds,
    dreamEpisode,
    goalChanges,
    knowledgeChanges,
    nameChanges,
    appraisalChanges,
  });
  if (prior?.publicationJobId === jobId)
    return prior.publicationBody === publicationBody
      ? {
          world: input,
          events: [],
          outcome: outcome(true, 'duplicate', 'Snapshot already published.'),
        }
      : reject('The publication identity was already used or its source was erased.');
  if (
    !prior ||
    prior.revision !== expectedRevision ||
    !actor?.alive ||
    !hasMemory(entityGet(input.entities, actorId)) ||
    actor.capabilities?.innerWorld === false ||
    actor.incapacitated ||
    input.paused
  )
    return reject('Actor or accepted revision changed.');
  if (
    dreamEpisode &&
    (dreamStatus(input, entityGet(input.entities, actorId))?.episode !== dreamEpisode ||
      dreamStatus(input, entityGet(input.entities, actorId))!.elapsedSeconds <
        (dreamPolicy(input)?.afterSeconds ?? Infinity))
  )
    return reject('Dream interrupted.');
  if (
    !thoughts.length ||
    thoughts.length > 3 ||
    thoughts.some((t) => wordCount(t) > 20 || !t.trim())
  )
    return reject('Invalid presentation thoughts.');
  let text: string;
  try {
    text = flattenFiles(files);
  } catch (error) {
    return reject(error instanceof Error ? error.message : 'Invalid files.');
  }
  const mind = mindFor(input, actorId);
  for (const document of mind.documents.filter((d) => d.protected)) {
    const old = prior.files.find((f) => f.path === `${document.id}.md`);
    if (old && !files.some((f) => f.path === old.path && f.text === old.text))
      return reject('Essential identity must be preserved.');
  }
  const forgotten = new Set(input.experience?.forgotten[actorId] ?? []);
  if (evidenceIds.some((id) => forgotten.has(id))) return reject('Evidence was forgotten.');
  const world = draftWorld(input);
  const appraisalEvents: WorldEvent[] = [];
  if (appraisalChanges.length > 8) return reject('Too many appraisal changes.');
  for (const [index, change] of appraisalChanges.entries()) {
    const result = changeAppraisal(
      world,
      actorId,
      change,
      `${jobId}:appraisal:${index}`,
      appraisalBindings,
      appraisalEvents,
    );
    if (!result.ok) return reject(result.message);
  }
  if (knowledgeChanges.length > 16 || nameChanges.length > 16)
    return reject('Too many knowledge changes.');
  if (
    expectedEncounters &&
    (nameChanges.some(
      (edit) =>
        edit.subjectId.kind === 'entity' &&
        expectedEncounters[edit.subjectId.entityId] !==
          world.perceptionEpisodes?.[actorId]?.[edit.subjectId.entityId],
    ) ||
      knowledgeChanges.some(
        (edit) =>
          edit.subjectId?.kind === 'entity' &&
          !Object.hasOwn(knowledgeReferences, subjectKey(edit.subjectId)) &&
          expectedEncounters[edit.subjectId.entityId] !==
            world.perceptionEpisodes?.[actorId]?.[edit.subjectId.entityId],
      ))
  )
    return reject('A knowledge subject encounter changed during reflection.');
  for (const edit of nameChanges) {
    const result = assignSubjectName(world, actorId, edit, permittedSubjects, evidenceIds);
    if (!result.ok) return reject(result.message);
  }
  for (const edit of knowledgeChanges) {
    // Map annotations are read-only model context, never an offered note-edit role.
    if (edit.subjectId !== null && !validObserverSubject(edit.subjectId))
      return reject('Knowledge subject is not editable in this response.');
    const rememberedSubject =
      edit.subjectId && Object.hasOwn(knowledgeReferences, subjectKey(edit.subjectId))
        ? knowledgeReferences[subjectKey(edit.subjectId)]
        : undefined;
    const subjectId = rememberedSubject ?? edit.subjectId;
    if (
      subjectId !== null &&
      (rememberedSubject
        ? !knowledgeDocument(world, actorId, subjectId)
        : !(subjectId.kind === 'entity'
            ? canRememberSubject(world, actorId, subjectId.entityId)
            : observerIndividual(world, actorId, subjectId)))
    )
      return reject('Knowledge subject is not recognized.');
    const result = editKnowledge(
      world,
      actorId,
      { ...edit, subjectId },
      rememberedSubject ? [rememberedSubject] : permittedSubjects,
      evidenceIds,
    );
    if (!result.ok) return reject(result.message);
    if (subjectId?.kind === 'entity' && !rememberedSubject)
      rememberSubject(world, actorId, subjectId.entityId);
  }
  if (goalChanges.length > 8 || (actor.controller === 'player' && goalChanges.length))
    return reject('Reflection cannot replace player intentions or exceed eight goal changes.');
  for (const [index, change] of goalChanges.entries()) {
    const result = changeGoal(
      entityGet(world.entities, actorId)!.actor!,
      change,
      `${jobId}:goal:${index}`,
      'actor',
    );
    if (!result.ok) return reject(result.message);
  }
  world.innerWorlds![actorId] = {
    text,
    files: cloneValue(files),
    revision: prior.revision + 1,
    sourceSnapshot: snapshot,
    publicationJobId: jobId,
    publicationBody,
    evidenceIds,
  };
  mind.revision++;
  mind.documents = files.map((f) => ({
    id: f.path.slice(0, -3),
    title: f.path.slice(0, -3),
    text: f.text,
    revision: mind.revision,
    protected: mind.documents.some((d) => d.protected && `${d.id}.md` === f.path),
    evidence: [],
  }));
  mind.records = mind.records.filter(
    (r) =>
      ['identity', 'commitment', 'appraisal'].includes(r.kind) &&
      mind.documents.some((d) => d.id === r.documentId),
  );
  mind.thoughts.push(
    ...thoughts.map((text) => ({
      decisionId: jobId,
      at: world.simTime,
      text,
      kind: dreamEpisode ? ('dream' as const) : ('reflection' as const),
      source: dreamEpisode ? ('imagined' as const) : ('inferred' as const),
    })),
  );
  mind.thoughts = mind.thoughts.slice(-100);
  mind.lastReflectionAt = world.simTime;
  // Reflection revisits memories; the legacy watermark is deliberately not advanced.
  if (dreamEpisode) mind.lastDreamEpisode = dreamEpisode;
  (world.minds ??= {})[actorId] = mind;
  return finish(
    world,
    appraisalEvents,
    outcome(true, 'snapshot-published', 'Inner world published atomically.'),
  );
}

export function correctExperience(
  input: WorldState,
  actorId: string,
  sourceId: string,
  correctionEventId: string,
): Transition {
  const aware = input.experience?.awareness[actorId]?.find((a) => a.eventId === correctionEventId);
  const retainedSource = retainedExperienceSource(input, actorId, sourceId);
  // Native receipts and their personal event are aliases of the same acquired account,
  // not independent correcting evidence merely because their IDs differ.
  const sameAccount =
    aware &&
    (temporalAccountAliasClosure(input, actorId, [sourceId]).includes(aware.eventId) ||
      ownedObservationSources([
        ...(aware.observation ? [aware.observation] : []),
        ...(aware.observations ?? []),
      ]).some((source) => source.id === sourceId));
  if (!aware || !retainedSource || sameAccount)
    return {
      world: input,
      events: [],
      outcome: outcome(
        false,
        'correction-rejected',
        'Correction requires newly perceived evidence and a retained source.',
      ),
    };
  const world = draftWorld(input);
  const invalidated = mutateExperience(world, actorId, {
    operation: 'correct',
    sourceId,
    correctionEventId,
  })!;
  return {
    ...finish(
      world,
      [],
      outcome(
        true,
        'corrected',
        'Correction linked; affected summaries invalidated and beliefs flagged for reconsideration.',
      ),
    ),
    invalidatedMemoryIds: { [actorId]: invalidated },
  };
}
