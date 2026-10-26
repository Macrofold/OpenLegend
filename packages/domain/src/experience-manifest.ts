import {
  recognitionSupportSources,
  type RecognitionSupportSource,
} from './worlds/base/recognition.js';
import { validSpeechLabel, validatePerceivedSpeech } from './speech.js';
import { validObserverSubject } from './knowledge.js';
import { validPersonalSourceRef, type PersonalSourceRef } from './experience-source.js';
export {
  PERSONAL_EVIDENCE_PREPARATION,
  personalFactAlias,
  validPersonalSourceRef,
  type PersonalSourceRef,
} from './experience-source.js';
import { canonicalJson } from './events.js';
import type { Awareness, ExperienceSummary } from './experience.js';
import type { ExperienceEntry, MemoryRecord } from './types.js';
import { validateObservationContribution } from './perception-evidence.js';
import type {
  EvidenceSource,
  SensoryFacet,
  ObservationContribution,
} from './perception-evidence.js';

export interface PreparedExperience {
  entry: ExperienceEntry;
  ref: PersonalSourceRef;
}
export interface SpeechAttributionGroup {
  supportKey: string;
  sources: PersonalSourceRef[];
  speakerId?: string;
  targetId?: string;
  sourceSubject?: Awareness['sourceSubject'];
  speaker: NonNullable<Awareness['speech']>['speaker'];
  addressee: NonNullable<Awareness['speech']>['addressee'];
  addressing: NonNullable<Awareness['speech']>['addressing'];
  observerRelation: 'self' | 'addressed' | 'overheard' | 'ambient' | 'seen';
  acquisition: NonNullable<Awareness['speech']>['perception'];
  intelligibility: NonNullable<Awareness['speech']>['intelligibility'];
  firstAt: number;
  lastAt: number;
  sourceCount: number;
  /** Self speech without a sensory contribution still retains its exact original payload. */
  utterances: Array<{
    source: PersonalSourceRef;
    at: number;
    speech: NonNullable<Awareness['speech']>;
  }>;
}
export interface ExperienceManifest {
  version: 1;
  coverageKey: string;
  coverage: PersonalSourceRef[];
  observations: ObservationContribution[];
  speech: SpeechAttributionGroup[];
  receipts?: import('./temporal-evidence.js').TemporalReceiptLocator[];
}
const refKey = (ref: PersonalSourceRef) => canonicalJson([ref.kind, ref.id, ref.revision]);
export function manifestCoverageKey(refs: readonly PersonalSourceRef[]): string {
  return canonicalJson(refs.map(refKey).sort());
}
/** Structured meaning is native-derived, independent of a model's paraphrase.
 * Child manifests carry complete exact source closure; never replay lifetime history.
 * docs/projects/speech-and-social-perception-tech-design.md#structural-attribution-in-every-selected-summary */
export function experienceManifest(
  inputs: readonly PreparedExperience[],
  children: readonly ExperienceManifest[] = [],
): ExperienceManifest {
  const coverage = new Map<string, PersonalSourceRef>();
  const observations = new Map<string, ObservationContribution>();
  const speech = new Map<string, SpeechAttributionGroup>();
  const receipts = new Map<string, import('./temporal-evidence.js').TemporalReceiptLocator>();
  const addReceipt = (receipt: import('./temporal-evidence.js').TemporalReceiptLocator) => receipts.set(canonicalJson(receipt), receipt);
  const addObservation = (value: ObservationContribution) => {
    const key = canonicalJson([value.observer, value.id, value.revision]);
    const prior = observations.get(key);
    if (prior && canonicalJson(prior) !== canonicalJson(value))
      throw new Error('Conflicting original observation revision; original evidence retained.');
    observations.set(key, value);
  };
  const addGroup = (group: SpeechAttributionGroup) => {
    const {
      supportKey: _key,
      sources: _sources,
      firstAt: _first,
      lastAt: _last,
      sourceCount: _count,
      utterances: _utterances,
      ...roles
    } = group;
    // An unresolved contact is scoped to its actual original contribution; equal labels
    // never establish that two unknown voices belong to the same person.
    const key = canonicalJson([
      roles,
      group.sourceSubject || group.speakerId ? null : group.sources,
    ]);
    const prior = speech.get(key);
    const sources = [
      ...new Map(
        [...(prior?.sources ?? []), ...group.sources].map((ref) => [refKey(ref), ref]),
      ).values(),
    ];
    const utterances = new Map(
      (prior?.utterances ?? []).map((utterance) => [refKey(utterance.source), utterance]),
    );
    for (const utterance of group.utterances) {
      const previous = utterances.get(refKey(utterance.source));
      if (previous && canonicalJson(previous) !== canonicalJson(utterance))
        throw new Error('Conflicting original utterance revision; original evidence retained.');
      utterances.set(refKey(utterance.source), utterance);
    }
    speech.set(key, {
      ...roles,
      sources,
      supportKey: manifestCoverageKey(sources),
      firstAt: Math.min(prior?.firstAt ?? Infinity, group.firstAt),
      lastAt: Math.max(prior?.lastAt ?? -Infinity, group.lastAt),
      sourceCount: sources.length,
      utterances: [...utterances.values()],
    });
  };
  for (const child of children) {
    validateExperienceManifest(child);
    for (const source of child.coverage) coverage.set(refKey(source), source);
    for (const observation of child.observations) addObservation(observation);
    for (const group of child.speech) addGroup(group);
    for (const receipt of child.receipts ?? []) addReceipt(receipt);
  }
  for (const { entry, ref } of inputs) {
    if (
      !validPersonalSourceRef(ref) ||
      entry.source !== ref.kind ||
      (entry.source === 'awareness' ? entry.value.eventId : entry.value.id) !== ref.id
    )
      throw new Error(
        'Memory source binding is missing or mismatched; original evidence retained.',
      );
    const child =
      entry.source === 'summary'
        ? entry.value.manifest
        : entry.source === 'memory'
          ? entry.value.manifest
          : undefined;
    if (child) validateExperienceManifest(child);
    if (entry.source !== 'summary' && entry.value.sourceReceipt) addReceipt(entry.value.sourceReceipt);
    for (const receipt of child?.receipts ?? []) addReceipt(receipt);
    // Keep the supplied intermediate account as well as its original leaves. After
    // another consolidation retires that account, its exact reference must still
    // revoke every dependent summary without replaying archived source bodies.
    coverage.set(refKey(ref), ref);
    for (const original of child?.coverage ?? []) coverage.set(refKey(original), original);
    const originals =
      entry.source === 'summary'
        ? []
        : [
            ...(entry.value.observation ? [entry.value.observation] : []),
            ...(entry.value.observations ?? []),
            ...(entry.source === 'memory' && entry.value.evidence?.observation
              ? [entry.value.evidence.observation]
              : []),
            ...(entry.source === 'memory' ? (entry.value.evidence?.observations ?? []) : []),
          ];
    for (const value of child?.observations ?? originals) addObservation(value);
    for (const group of child?.speech ?? []) addGroup(group);
    const awareness =
      entry.source === 'awareness'
        ? entry.value
        : entry.source === 'memory' && entry.value.evidence
          ? { ...entry.value.evidence, at: entry.value.at }
          : undefined;
    const heard = awareness?.speech;
    if (awareness && heard)
      addGroup({
        supportKey: manifestCoverageKey([ref]),
        sources: [ref],
        ...(awareness.sourceId ? { speakerId: awareness.sourceId } : {}),
        ...(awareness.targetId ? { targetId: awareness.targetId } : {}),
        ...(awareness.sourceSubject ? { sourceSubject: awareness.sourceSubject } : {}),
        speaker: heard.speaker,
        addressee: heard.addressee,
        addressing: heard.addressing,
        observerRelation:
          heard.perception === 'self'
            ? 'self'
            : heard.perception === 'seen'
              ? 'seen'
              : awareness.targetId === awareness.actorId
                ? 'addressed'
                : heard.addressing === 'ambient'
                  ? 'ambient'
                  : 'overheard',
        acquisition: heard.perception,
        intelligibility: heard.intelligibility,
        firstAt: awareness.at,
        lastAt: awareness.at,
        sourceCount: 1,
        utterances: originals.some((observation) =>
          observation.facets.some(
            (facet) =>
              facet.value.kind === 'speech' &&
              canonicalJson(facet.value.speech) === canonicalJson(heard),
          ),
        )
          ? []
          : [{ source: ref, at: awareness.at, speech: heard }],
      });
  }
  const refs = [...coverage.values()].sort((a, b) => refKey(a).localeCompare(refKey(b)));
  return {
    version: 1,
    coverageKey: manifestCoverageKey(refs),
    coverage: refs,
    observations: [...observations.values()],
    speech: [...speech.values()],
    ...(receipts.size ? { receipts: [...receipts.values()] } : {}),
  };
}
export function validateExperienceManifest(
  value: unknown,
  originals?: Map<string, string>,
): asserts value is ExperienceManifest {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Missing structured memory coverage.');
  const manifest = value as ExperienceManifest;
  if (
    manifest.version !== 1 ||
    !Array.isArray(manifest.coverage) ||
    manifest.coverage.some((ref) => !validPersonalSourceRef(ref)) ||
    new Set(manifest.coverage.map(refKey)).size !== manifest.coverage.length ||
    manifest.coverageKey !== manifestCoverageKey(manifest.coverage) ||
    !Array.isArray(manifest.observations) ||
    !Array.isArray(manifest.speech)
  )
    throw new Error('Invalid structured memory coverage.');
  if (manifest.receipts !== undefined && (!Array.isArray(manifest.receipts) ||
    manifest.receipts.some((receipt) => !receipt || typeof receipt.actorId !== 'string' || !receipt.actorId ||
      !Number.isSafeInteger(receipt.physicalLife) || receipt.physicalLife < 0 ||
      typeof receipt.epoch !== 'string' || !receipt.epoch || !Number.isSafeInteger(receipt.ordinal) || receipt.ordinal < 0) ||
    new Set(manifest.receipts.map((receipt) => canonicalJson(receipt))).size !== manifest.receipts.length))
    throw new Error('Invalid memory receipt coverage.');
  for (const observation of manifest.observations)
    validateObservationContribution(observation, originals);
  const coverage = new Set(manifest.coverage.map(refKey));
  for (const group of manifest.speech)
    if (
      !group ||
      !Array.isArray(group.sources) ||
      !Array.isArray(group.utterances) ||
      group.utterances.some(
        (utterance) =>
          !utterance ||
          !validPersonalSourceRef(utterance.source) ||
          !group.sources.some((source) => refKey(source) === refKey(utterance.source)) ||
          !Number.isFinite(utterance.at) ||
          utterance.at < group.firstAt ||
          utterance.at > group.lastAt,
      ) ||
      new Set(group.utterances.map((utterance) => refKey(utterance.source))).size !==
        group.utterances.length ||
      !group.sources.length ||
      group.sources.some((ref) => !validPersonalSourceRef(ref) || !coverage.has(refKey(ref))) ||
      new Set(group.sources.map(refKey)).size !== group.sources.length ||
      group.sourceCount !== group.sources.length ||
      group.supportKey !== manifestCoverageKey(group.sources) ||
      !Number.isFinite(group.firstAt) ||
      !Number.isFinite(group.lastAt) ||
      group.firstAt > group.lastAt ||
      !validSpeechLabel(group.speaker) ||
      !validSpeechLabel(group.addressee) ||
      !['ambient', 'directed', null].includes(group.addressing) ||
      (group.acquisition === 'seen' ? group.addressing !== null : group.addressing === null) ||
      (group.sourceSubject !== undefined && !validObserverSubject(group.sourceSubject)) ||
      (group.speakerId !== undefined && typeof group.speakerId !== 'string') ||
      (group.targetId !== undefined && typeof group.targetId !== 'string') ||
      !['self', 'addressed', 'overheard', 'ambient', 'seen'].includes(group.observerRelation) ||
      !['self', 'heard', 'seen'].includes(group.acquisition) ||
      !['none', 'partial', 'clear'].includes(group.intelligibility)
    )
      throw new Error('Invalid remembered speech attribution.');
  const utterances = new Map<string, string>();
  for (const group of manifest.speech)
    for (const utterance of group.utterances) {
      validatePerceivedSpeech(utterance.speech);
      const key = refKey(utterance.source),
        body = canonicalJson(utterance),
        prior = utterances.get(key);
      if (prior !== undefined && prior !== body)
        throw new Error('Conflicting original utterance revision.');
      utterances.set(key, body);
    }
}
/** Exact native dependencies and explicit personal aliases share the existing reverse
 * source index. Aliases route correction only; they never replace source revisions. */
export interface ManifestEvidenceDependency {
  source: EvidenceSource;
  ordinal: number | null;
  aliases: string[];
}
export function observationDependencies(
  observations: readonly ObservationContribution[],
): ManifestEvidenceDependency[] {
  const dependencies = new Map<string, ManifestEvidenceDependency>();
  const add = (source: EvidenceSource, ordinal: number | null, aliases: readonly string[]) => {
    const key = canonicalJson([source, ordinal]);
    const prior = dependencies.get(key);
    dependencies.set(key, {
      source,
      ordinal,
      aliases: [...new Set([...(prior?.aliases ?? []), ...aliases])],
    });
  };
  const facet = (value: SensoryFacet) => {
    if (value.kind === 'claim') {
      const aliases = (value.supportAliases ?? []).map((alias) => alias.id);
      for (const support of value.support) add(support.source, support.ordinal, aliases);
    } else if (value.kind === 'confirmation') {
      visit(value.snapshot.original);
      add(value.snapshot.confirmation, value.snapshot.originalOrdinal, []);
      facet(value.snapshot.value);
    } else if (value.kind === 'observed-motion') {
      for (const sample of [value.earlier, value.later]) {
        visit(sample.original);
        add(sample.confirmation, sample.originalOrdinal, []);
      }
    }
  };
  const visit = (observation: ObservationContribution) => {
    add(
      {
        family: 'native-exposure',
        observer: observation.observer,
        id: observation.id,
        revision: observation.revision,
      },
      null,
      observation.origin.kind === 'occurrence' ? [observation.origin.eventId] : [],
    );
    for (const item of observation.facets) facet(item.value);
  };
  for (const observation of observations) visit(observation);
  return [...dependencies.values()];
}
export function observationLearningSources(
  observations: readonly ObservationContribution[],
): RecognitionSupportSource[] {
  const sources = new Map<string, RecognitionSupportSource>();
  const facet = (value: SensoryFacet) => {
    if (value.kind === 'association')
      for (const source of recognitionSupportSources(value.learningSupport ?? []))
        sources.set(canonicalJson(source), source);
    if (value.kind === 'confirmation') {
      visit(value.snapshot.original);
      facet(value.snapshot.value);
    }
    if (value.kind === 'observed-motion')
      for (const sample of [value.earlier, value.later]) visit(sample.original);
  };
  const visit = (observation: ObservationContribution) => {
    for (const item of observation.facets) facet(item.value);
  };
  for (const observation of observations) visit(observation);
  return [...sources.values()];
}
/** Owned original copies are aliases of this personal source, not dependencies on an
 * unrelated witness or motion sample. Used only for exact cold invalidation routing. */
export function ownedObservationSources(
  observations: readonly ObservationContribution[],
): EvidenceSource[] {
  const sources = new Map<string, EvidenceSource>();
  const visit = (observation: ObservationContribution) => {
    const source: EvidenceSource = {
      family: 'native-exposure',
      observer: observation.observer,
      id: observation.id,
      revision: observation.revision,
    };
    sources.set(canonicalJson(source), source);
    for (const item of observation.facets)
      if (item.value.kind === 'confirmation') visit(item.value.snapshot.original);
  };
  for (const observation of observations) visit(observation);
  return [...sources.values()];
}
export function manifestDependsOn(
  manifest: ExperienceManifest,
  affected: ReadonlySet<string>,
): boolean {
  return (
    observationLearningSources(manifest.observations).some((source) => affected.has(source.id)) ||
    manifest.coverage.some((ref) => affected.has(ref.id)) ||
    observationDependencies(manifest.observations).some(
      ({ source, aliases }) => affected.has(source.id) || aliases.some((id) => affected.has(id)),
    )
  );
}
export function summaryMemory(summary: ExperienceSummary, actorId: string): MemoryRecord {
  validateExperienceManifest(summary.manifest);
  return {
    id: summary.id,
    actorId,
    at: summary.to,
    kind: 'reflection',
    source: 'inferred',
    summary: `Summary of remembered experience: ${summary.text}`,
    entityIds: summary.entityIds,
    importance: summary.importance,
    sequence: summary.sequence,
    manifest: summary.manifest,
    ...(summary.retention ? { retention: summary.retention } : {}),
  };
}
