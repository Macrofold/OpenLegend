import {
  contributionFactKey,
  headingFrame,
  selectedCapturedSubjectLabelReader,
  subjectKey,
  type ObserverSubject,
} from '@open-legend/domain';
import type { NativeNpcCapture } from './native-npc-capture.js';
import type { NativeInstalledDefinitions } from './native-definition-capture.js';
import { nativeCurrentSources, nativeReceivedScene } from './native-current-capture.js';
import { personalEntityHandle } from './entity-references.js';
import { presentationSubjects, type CapturedExperienceContext } from './experience-context.js';
import type { ModelSpatialFrame } from './perceived-context.js';
import type { SituationRead } from './situation-context.js';

type Facts = NativeNpcCapture['facts'];
export interface NativePresentationLabels {
  readonly worldId: string;
  readonly generation: string;
  readonly actorId: string;
  readonly baseCut: number;
  readonly labels: readonly {
    readonly subject: ObserverSubject;
    readonly label: string;
  }[];
}

/** This constructs only the formatter's finite read interface. Received facts,
 * naming, attention and receipt coordinates keep their native semantic owners. */
export function nativeSituationSources(
  facts: Facts,
  definitions: NativeInstalledDefinitions,
  jobId: string,
): Omit<SituationRead, 'presentation'> {
  const { self, perception } = facts;
  const seed = perception.npcCurrent;
  if (!seed.receiptPrefix)
    throw new Error('The native history tail must be resolved before NPC context preparation.');
  const scene = nativeReceivedScene(seed);
  const { candidates, entries, cues, presentations } = seed.attention;
  const current = nativeCurrentSources(self, seed, facts.history, {
    sourceIds: new Set([
      ...scene.bodies.keys(),
      ...Object.values(candidates).map((candidate) => candidate.sourceId),
    ]),
  });
  const handles = new Map(seed.handleAttributions);
  const entityHandle = (id: string): string => {
    const attribution = handles.get(id);
    if (attribution === undefined)
      throw new Error('The situation requested an uncaptured personal reference.');
    return personalEntityHandle({ id: self.worldId }, self.actorId, id, attribution);
  };
  const bodyBindings = new Map(
    seed.sceneBindings.map(({ sourceId, ...binding }) => [
      sourceId,
      { handle: entityHandle(sourceId), ...binding },
    ]),
  );
  const geometry = perception.geometry;
  if (!geometry) throw new Error('The native NPC read has no acquired geometry cut.');
  const frame: ModelSpatialFrame = {
    position: self.position,
    axes: headingFrame(self.heading),
    support: self.supportSurfaceId,
  };
  const presented = new Map(presentations.map((value) => [value.key, value]));
  return {
    worldId: self.worldId,
    at: self.at,
    actorId: self.actorId,
    jobId,
    policy: definitions.nativePolicies.attention.scene,
    scene,
    frame,
    geometry: {
      observations: perception.cut.acquired.slice(geometry.first, geometry.first + geometry.count),
      complete: geometry.complete,
      visited: geometry.visited,
      supportedThrough: geometry.supportedThrough,
    },
    entries,
    candidates,
    current,
    phaseCut: perception.cut,
    bodyBindings,
    activeCues: cues,
    relationBodyClear: definitions.nativePolicies.attention.relation.body.clear,
    receiptPrefix: seed.receiptPrefix,
    historyMaxAgeSeconds: definitions.nativePolicies.attention.retention.recent.maxAgeSeconds,
    privacyRevision: seed.privacyRevision,
    entityHandle,
    // Acquired DTOs carry their actual observer directly. The shared key
    // constructor grants no missing original/header or later evidence.
    observationKey: contributionFactKey,
    attentionPresentation: (keys) =>
      (keys ?? entries.map((entry) => entry.key)).flatMap((key) => presented.get(key) ?? []),
  };
}

export function nativeExperiencePresentation(
  facts: Facts,
  definitions: NativeInstalledDefinitions,
  frame: ModelSpatialFrame,
  captured: NativePresentationLabels,
  values: readonly unknown[],
): CapturedExperienceContext {
  const { self } = facts;
  if (
    captured.worldId !== self.worldId ||
    captured.generation !== self.generation ||
    captured.actorId !== self.actorId ||
    captured.baseCut !== self.acceptedCut
  )
    throw new Error('Personal labels belong to a different native NPC capture.');
  const labels = new Map(captured.labels.map(({ subject, label }) => [subjectKey(subject), label]));
  const requested = [
    { kind: 'entity' as const, entityId: self.actorId },
    ...presentationSubjects(values),
  ];
  const selected = new Map<string, string>();
  for (const subject of requested) {
    const key = subjectKey(subject),
      label = labels.get(key);
    if (label === undefined) throw new Error('A selected personal label has not been captured.');
    selected.set(key, label);
  }
  const privacy = facts.history.cuts[0];
  if (!privacy) throw new Error('The native NPC read has no personal history cut.');
  return {
    kind: 'captured-experience',
    id: self.worldId,
    actorId: self.actorId,
    frame,
    ownerHandle: personalEntityHandle(
      { id: self.worldId },
      self.actorId,
      self.actorId,
      self.referenceAttribution,
    ),
    subjectLabel: selectedCapturedSubjectLabelReader(definitions.definitions, selected),
    forgotten: new Set(privacy.forgotten),
    corrected: new Set(privacy.corrected),
  };
}
