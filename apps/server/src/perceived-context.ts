import { namePhrase } from '@open-legend/language';
import { memoryForModel } from './experience-context.js';
import { experienceReading, type ExperienceEntry } from '@open-legend/domain';
import {
  currentBodyObservation,
  currentObservedFacets,
  observerName,
  worldPosition,
  worldSupport,
  entityGet,
  headingFrame,
  type Entity,
  type Position,
  type ObservationFrame,
  type ObservedLocation,
  type WorldState,
} from '@open-legend/domain';
import { entityHandle } from './entity-references.js';
import type { AttentionCandidate } from './recall.js';
import { digest } from './content-digest.js';

/** One complete selected personal source, projected through the shared evidence owner.
 * The exact native key and revision remain in the request's server binding. */
export interface ExperienceModelBindings {
  source: string;
  owner: string;
  value: ReturnType<typeof memoryForModel>;
}
export interface SharedModelExperience {
  index: number;
  revision: string;
  experience: ReturnType<typeof experienceForModel>;
}
export function experienceModelBindings(
  world: WorldState,
  ownerId: string,
  entry: ExperienceEntry,
  source: string,
): ExperienceModelBindings {
  return {
    source,
    owner: entityHandle(world, ownerId, ownerId),
    value: memoryForModel(world, ownerId, experienceReading(entry, ownerId)),
  };
}
export function experienceForModel(entry: ExperienceEntry, bindings: ExperienceModelBindings) {
  return {
    source: entry.source,
    handle: bindings.source,
    owner: bindings.owner,
    timeUnit: 'game seconds',
    value: bindings.value,
  };
}
/** Retrieval ranks source-stable personal wording. Current body grants, later names
 * and the observer's current pose must never change an unchanged source's index. */
export function experienceEmbeddingText(entry: ExperienceEntry, ownerId: string): string {
  const reading = experienceReading(entry, ownerId);
  return JSON.stringify({
    kind: reading.kind,
    source: reading.source,
    eventType: reading.eventType,
    text: reading.summary,
  });
}

/** One owned frame per decision, shared by presentation and fixed-point movement.
 * Native evidence keeps its original world coordinates and acquisition frame. */
export interface ModelSpatialFrame {
  position: Position;
  axes: ReturnType<typeof headingFrame>;
  support: string | null;
}
export function captureModelSpatialFrame(world: WorldState, actorId: string): ModelSpatialFrame {
  const actor = entityGet(world.entities, actorId);
  if (!actor) throw new Error('A spatial presentation requires its observer.');
  return {
    position: { ...worldPosition(actor) },
    axes: headingFrame(actor.spatial.heading),
    support: worldSupport(actor),
  };
}
export function modelSpatialVector(frame: ModelSpatialFrame, vector: Position) {
  return {
    right: vector.x * frame.axes.right.x + vector.z * frame.axes.right.z,
    above: vector.y,
    forward: vector.x * frame.axes.forward.x + vector.z * frame.axes.forward.z,
  };
}
export function modelSpatialPoint(frame: ModelSpatialFrame, point: Position) {
  return modelSpatialVector(frame, {
    x: point.x - frame.position.x,
    y: point.y - frame.position.y,
    z: point.z - frame.position.z,
  });
}
export function worldPointFromModel(frame: ModelSpatialFrame, right: number, forward: number) {
  return {
    x: frame.position.x + right * frame.axes.right.x + forward * frame.axes.forward.x,
    z: frame.position.z + right * frame.axes.right.z + forward * frame.axes.forward.z,
  };
}
export function modelObservationFrame(frame: ModelSpatialFrame, observed: ObservationFrame) {
  return {
    observerAtAcquisition: modelSpatialPoint(frame, observed.positionAtObservation),
    ...(observed.forwardAtObservation !== undefined
      ? {
          facingAtAcquisition: modelSpatialVector(frame, {
            x: Math.sin(observed.forwardAtObservation),
            y: 0,
            z: Math.cos(observed.forwardAtObservation),
          }),
        }
      : {}),
  };
}
export function modelObservedLocation(frame: ModelSpatialFrame, location: ObservedLocation) {
  if (location.kind === 'point')
    return { ...location, point: modelSpatialPoint(frame, location.point) };
  if (location.kind === 'region')
    return { ...location, center: modelSpatialPoint(frame, location.center) };
  // The received bearing's sector is measured in the source's global X/Z plane.
  const direction = modelSpatialVector(frame, {
    x: Math.cos((location.sector * Math.PI) / 4),
    y: 0,
    z: Math.sin((location.sector * Math.PI) / 4),
  });
  return {
    kind: location.kind,
    from: modelSpatialPoint(frame, location.from),
    direction,
    elevation: location.elevation,
    spread: location.spread,
  };
}
export function modelSpatialBounds(
  frame: ModelSpatialFrame,
  bounds: { min: Position; max: Position },
) {
  const corners = [bounds.min.x, bounds.max.x].flatMap((x) =>
    [bounds.min.z, bounds.max.z].map((z) => modelSpatialPoint(frame, { x, y: bounds.min.y, z })),
  );
  return {
    right: [Math.min(...corners.map((p) => p.right)), Math.max(...corners.map((p) => p.right))],
    above: [bounds.min.y - frame.position.y, bounds.max.y - frame.position.y],
    forward: [
      Math.min(...corners.map((p) => p.forward)),
      Math.max(...corners.map((p) => p.forward)),
    ],
  };
}

type PresentedSpatialFact = { reference?: unknown; value?: unknown };
type ReceivedMeasurement = {
  status: string;
  at?: number;
  asOf?: number;
  lower?: number;
  upper?: number;
  decreaseLower?: number;
  dropLower?: number;
  endpointChange?: { from: number; through: number; decreaseLower: number };
};

/** Labels come only from facts included in this read, never a live identity lookup. */
export function presentedSpatialSubject(facts: readonly PresentedSpatialFact[]) {
  let label = 'this observed body';
  const support: string[] = [];
  for (const fact of facts) {
    const value = fact.value as
      | { kind: 'body'; body: { label?: Parameters<typeof namePhrase>[0] } }
      | { kind: 'association'; strength: string; subject: { label: string } }
      | { kind: string };
    if (!value) continue;
    if (['body', 'location', 'observed-motion'].includes(value.kind)) {
      if (typeof fact.reference === 'string') support.push(fact.reference);
      if (value.kind === 'body' && 'body' in value && value.body.label)
        label = namePhrase(value.body.label, 'indefinite') || label;
    }
  }
  const association = facts.find((fact) => {
    const value = fact.value as { kind?: string; strength?: string } | undefined;
    return value?.kind === 'association' && value.strength === 'supported';
  });
  if (association) {
    const value = association.value as { subject: { label: string } };
    label = value.subject.label;
    if (typeof association.reference === 'string') support.push(association.reference);
  }
  return { label, support };
}

/** Human-readable rendering of native measurements, not another spatial/meaning rule.
 * Round intervals outwards and guaranteed minima down; exact numbers remain alongside it. */
export function receivedMeasurementDescription(
  anchor: string,
  measurement: ReceivedMeasurement,
  other?: string,
): string | undefined {
  if (
    measurement.status !== 'complete' ||
    measurement.lower === undefined ||
    measurement.upper === undefined
  )
    return;
  const lower = (value: number) => Math.floor(value * 100) / 100;
  const upper = (value: number) => Math.ceil(value * 100) / 100;
  const time = measurement.asOf ?? measurement.at;
  if (time === undefined) return;
  const text = [
    `At simulation second ${time}, measured ${other ? `body separation between ${anchor} and ${other}` : `clearance from ${anchor} to an observed physical edge`} is ${lower(measurement.lower)}–${upper(measurement.upper)} metres.`,
  ];
  const change = measurement.endpointChange;
  const decrease = change?.decreaseLower ?? measurement.decreaseLower;
  if (decrease !== undefined && decrease > 0)
    text.push(
      `${other ? 'Separation' : 'Clearance'} decreased ${lower(decrease) > 0 ? `by at least ${lower(decrease)} metres ` : ''}between received endpoints${change ? ` at simulation seconds ${change.from} and ${change.through}` : ''}.`,
    );
  if (measurement.dropLower !== undefined && measurement.dropLower > 0)
    text.push(`The received far surface is at least ${lower(measurement.dropLower)} metres lower.`);
  return text.join(' ');
}

/** Describe exact currently permitted values. Native menu preparation can retain
 * private admission records, but none of those records are character evidence. */
export function perceivedEntityText(
  world: WorldState,
  observerId: string,
  entityId: string,
): string | undefined {
  const body = currentBodyObservation(world, observerId, entityId);
  if (!body) return undefined;
  const facts = currentObservedFacets(world, observerId, entityId);
  const label = namePhrase(observerName(world, observerId, entityId), 'indefinite');
  const received = (facet: (typeof facts)[number]) =>
    `Measured at simulation second ${facet.valueMeasuredFrom}${facet.valueMeasuredThrough !== facet.valueMeasuredFrom ? `–${facet.valueMeasuredThrough}` : ''}; received at ${facet.valueAcquiredAt}.`;
  const text = [
    `I can see ${label} (ID:${entityHandle(world, observerId, entityId)}). ${received(body)}`,
  ];
  if (body.value.body.description)
    text.push(`Observed description: ${body.value.body.description}`);
  const outward = body.value.body.outward.filter(Boolean);
  if (outward.length) text.push(`Observed outward signs: ${outward.join(', ')}.`);
  for (const facet of facts) {
    if (facet.value.kind === 'carried')
      text.push(
        `Observed carried things: ${facet.value.items.map((item) => item.itemKindAsObserved).join('; ') || 'none observed'}. ${received(facet)}`,
      );
    if (facet.value.kind === 'pile-contents')
      text.push(
        `Observed pile contents: ${facet.value.items.map((item) => `${item.quantity} × ${item.name}`).join('; ') || 'none observed'}. ${received(facet)}`,
      );
  }
  return text.join(' ');
}

/** Relative geometry uses the frozen received position and the observer's own
 * present pose. It neither polls another body nor predicts a traversable route. */
export function relativeLocation(
  world: WorldState,
  observer: Entity,
  target: Entity,
): string | undefined {
  const received = currentBodyObservation(world, observer.id, target.id);
  if (!received) return undefined;
  const position = received.value.body.position;
  const here = worldPosition(observer);
  const dx = position.x - here.x,
    dz = position.z - here.z,
    dy = position.y - here.y;
  const horizontal = Math.hypot(dx, dz);
  const directions = [
    'ahead of me',
    'ahead and to my right',
    'to my right',
    'behind and to my right',
    'behind me',
    'behind and to my left',
    'to my left',
    'ahead and to my left',
  ];
  const bearing = observer.spatial.heading - Math.atan2(dx, dz);
  const direction = directions[((Math.round(bearing / (Math.PI / 4)) % 8) + 8) % 8];
  const height =
    Math.abs(dy) < 0.1
      ? 'at roughly my elevation'
      : `about ${Math.abs(dy).toFixed(1)} m ${dy > 0 ? 'above' : 'below'} me`;
  return `${horizontal < 0.1 ? 'At my horizontal position' : `About ${horizontal.toFixed(1)} m horizontally ${direction}`}, ${height}. Position measured at simulation second ${received.valueMeasuredFrom}; received at ${received.valueAcquiredAt}.`;
}

export { describePossession as possessionText } from '@open-legend/domain';

/** The same category names reach attention and the final actor context; metadata stays server-side. */
export function contextSections(candidates: AttentionCandidate[]): Record<string, unknown[]> {
  const names: Record<AttentionCandidate['kind'], string> = {
    conversation: 'conversation',
    memory: 'recall',
    entity: 'surroundings',
    possession: 'possessions',
    knowledge: 'knowledge',
    action: 'actions',
  };
  const sections: Record<string, unknown[]> = {};
  for (const candidate of candidates) {
    (sections[names[candidate.kind]] ??= []).push(candidate.text);
    if (candidate.experience) (sections['experience'] ??= []).push(...candidate.experience);
  }
  return sections;
}
