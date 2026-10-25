import { canonicalJson } from './events.js';
import { cloneValue } from './draft.js';
import { entityGet } from './entity-collection.js';
import { nextId } from './data.js';
import { chargeWork } from './work-budget.js';
import { selectedDetectionSupportPolicy } from './world-composition.js';
import {
  acquireObservation,
  perceptionEvidenceOwner,
  validateObservationContribution,
} from './perception-evidence.js';
import { sensesFor } from './perception.js';
import { capabilityBlocked } from './status-capabilities.js';
import { activelyParticipates } from './participation-state.js';
import { validateEvidenceSource, validateObservedLocation } from './perception-values.js';
import type { Entity, WorldState } from './types.js';
import type {
  EvidenceSource,
  ObservationContribution,
  ObservationExposure,
  ObservationFrame,
  ObservedLocation,
} from './perception-evidence.js';

/** A physical family owns each root's ordered sample ordinals and lifetime. Root IDs
 * deduplicate delivery only: they are never a producer-identity correlation proof. */
export interface DetectionSupportInput {
  source: EvidenceSource;
  sample: number;
  modality: ObservationContribution['modality'];
  detector: ObservationContribution['detector'];
  from: number;
  through: number;
  support: { kind: 'rate'; fraction: number } | { kind: 'impulse'; fraction: number };
  location?: { value: ObservedLocation; frame: ObservationFrame; measuredAt: number };
  continuity?: ObservationExposure;
  ambiguous?: boolean;
  contradictory?: boolean;
}
interface SupportReceipt {
  sample: number;
  body: string;
  through: number;
  patternId: string;
  observation?: ObservationContribution;
}
interface SupportPattern {
  id: string;
  detector: ObservationContribution['detector'];
  modality: ObservationContribution['modality'];
  beganAt: number;
  through: number;
  lastSupportedAt: number;
  progress: number;
  continuity?: string;
  envelope?: ObservedLocation;
  ambiguous: boolean;
  active?: { key: string; input: DetectionSupportInput };
  observation?: ObservationContribution;
}
export interface DetectionSupportState {
  policy: { id: string; version: number };
  /** Only live physical roots; their native source owner explicitly retires receipts. */
  sources: Record<string, SupportReceipt>;
  patterns: Record<string, SupportPattern>;
}
const same = (a: unknown, b: unknown) => canonicalJson(a) === canonicalJson(b);
const life = (observer: Entity) => ({
  actorId: observer.id,
  physicalLife: observer.actor?.physicalLife ?? 0,
});
const sourceKey = (input: DetectionSupportInput) => canonicalJson(input.source);
const supportOwners = new WeakMap<WorldState, readonly string[]>();
function observerIds(world: WorldState): readonly string[] {
  let ids = supportOwners.get(world);
  if (!ids) {
    ids = Object.entries(world.perceptionEvidence ?? {})
      .filter(([, owner]) => !!owner.support)
      .map(([id]) => id);
    supportOwners.set(world, ids);
  }
  return ids;
}
function state(world: WorldState, observer: Entity): DetectionSupportState {
  const policy = selectedDetectionSupportPolicy(world);
  const owner = perceptionEvidenceOwner(world, observer);
  if (!owner.support) supportOwners.delete(world);
  return (owner.support ??= {
    policy: { id: policy.id, version: policy.version },
    sources: {},
    patterns: {},
  });
}
const eligible = (
  world: WorldState,
  observer: Entity,
  detector: ObservationContribution['detector'],
) =>
  !!observer.actor?.alive &&
  activelyParticipates(observer) &&
  !capabilityBlocked(world, observer, 'perception') &&
  sensesFor(world, observer).some(
    (sense) => sense.id === detector.id && sense.version === detector.version,
  );
/** A conservative common sphere is contained in every accepted estimate. This does
 * not transitively join a chain of merely adjacent source regions. Changed bearing
 * origins require an explicit supplied continuity proof or remain separate. */
function intersection(
  first: ObservedLocation,
  second: ObservedLocation,
): ObservedLocation | undefined {
  if (first.kind === 'bearing' || second.kind === 'bearing')
    return same(first, second) ? cloneValue(first) : undefined;
  const a = first.kind === 'point' ? first.point : first.center,
    b = second.kind === 'point' ? second.point : second.center;
  const ar = first.kind === 'point' ? first.errorRadius : first.radius,
    br = second.kind === 'point' ? second.errorRadius : second.radius;
  const distance = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  if (distance > ar + br) return;
  if (distance + ar <= br) return cloneValue(first);
  if (distance + br <= ar) return cloneValue(second);
  const radius = (ar + br - distance) / 2,
    fraction = distance ? (ar - radius) / distance : 0;
  return {
    kind: 'region',
    center: {
      x: a.x + (b.x - a.x) * fraction,
      y: a.y + (b.y - a.y) * fraction,
      z: a.z + (b.z - a.z) * fraction,
    },
    radius,
  };
}
function validateInput(world: WorldState, observer: Entity, input: DetectionSupportInput): void {
  validateEvidenceSource(input.source);
  if (
    !same(input.source.observer, life(observer)) ||
    !['native-exposure', 'native-response'].includes(input.source.family) ||
    !Number.isSafeInteger(input.sample) ||
    input.sample < 0 ||
    !['sight', 'hearing', 'touch'].includes(input.modality) ||
    !input.detector?.id ||
    !Number.isSafeInteger(input.detector.version) ||
    input.detector.version < 1 ||
    ![input.from, input.through, input.support?.fraction].every(Number.isFinite) ||
    input.from > world.simTime ||
    input.through < input.from ||
    input.support.fraction < 0 ||
    input.support.fraction > 1 ||
    !['rate', 'impulse'].includes(input.support.kind) ||
    (input.ambiguous !== undefined && typeof input.ambiguous !== 'boolean') ||
    (input.contradictory !== undefined && typeof input.contradictory !== 'boolean') ||
    (input.support.kind === 'impulse' && input.from !== input.through) ||
    (input.continuity &&
      (!same(input.continuity.observer, life(observer)) ||
        typeof input.continuity.episodeId !== 'string' ||
        !input.continuity.episodeId))
  )
    throw new Error('Invalid supplied detection support.');
  if (input.location) {
    validateObservedLocation(input.location.value);
    if (
      !Number.isFinite(input.location.measuredAt) ||
      input.location.measuredAt > input.from ||
      (input.location.frame?.forwardAtObservation !== undefined &&
        !Number.isFinite(input.location.frame.forwardAtObservation)) ||
      ![
        input.location.frame?.positionAtObservation?.x,
        input.location.frame?.positionAtObservation?.y,
        input.location.frame?.positionAtObservation?.z,
      ].every(Number.isFinite)
    )
      throw new Error('Invalid support observation frame.');
  }
}
function detect(
  world: WorldState,
  observer: Entity,
  pattern: SupportPattern,
  input: DetectionSupportInput,
): ObservationContribution {
  if (pattern.observation) return pattern.observation;
  const facets: Parameters<typeof acquireObservation>[2]['facets'] = [
    {
      role: 'direct',
      asOf: world.simTime,
      measuredFrom: pattern.beganAt,
      measuredThrough: world.simTime,
      value: {
        kind: 'detected',
        detected: input.modality === 'touch' ? 'impact' : 'signal',
        limits: [...(pattern.ambiguous ? ['producer-count-unresolved'] : [])],
      },
    },
  ];
  if (input.location)
    facets.push({
      role: 'direct',
      asOf: input.location.measuredAt,
      measuredFrom: input.location.measuredAt,
      measuredThrough: input.location.measuredAt,
      value: {
        kind: 'location',
        location: cloneValue(input.location.value),
        frame: cloneValue(input.location.frame),
      },
    });
  // Immediate strong producers and a completed weak crossing share this exact
  // received-evidence receipt. No autobiography, name or body is invented here.
  const observation = acquireObservation(world, observer, {
    origin: {
      kind: 'exposure',
      episodeId: pattern.id,
      detectorId: input.detector.id,
      measuredFrom: pattern.beganAt,
      measuredThrough: world.simTime,
      source: cloneValue(input.source),
    },
    modality: input.modality,
    detector: input.detector,
    facets,
  });
  pattern.observation = observation;
  return observation;
}
function settlePattern(
  world: WorldState,
  observer: Entity,
  owner: DetectionSupportState,
  pattern: SupportPattern,
  until = world.simTime,
  suppliedGap = false,
): void {
  const policy = selectedDetectionSupportPolicy(world),
    active = pattern.active;
  let through = pattern.through;
  if (active && !eligible(world, observer, active.input.detector)) delete pattern.active;
  else if (active) {
    const input = active.input,
      from = Math.max(through, input.from),
      to = Math.min(until, input.through);
    if (from > through)
      pattern.progress = Math.max(
        0,
        pattern.progress - (from - through) * policy.decayPerGameSecond,
      );
    if (to > from) {
      const rate = input.support.fraction * policy.fullRatePerGameSecond;
      if (rate > 0) {
        const crossing = from + (policy.threshold - pattern.progress) / rate;
        if (!pattern.observation && crossing <= to) {
          if (Math.abs(world.simTime - crossing) > Number.EPSILON * 16 * Math.max(1, world.simTime))
            throw new Error('Detection support crossed before its required native boundary.');
          detect(world, observer, pattern, input);
        }
        pattern.progress = Math.min(policy.maximum, pattern.progress + (to - from) * rate);
        pattern.lastSupportedAt = to;
      } else
        pattern.progress = Math.max(0, pattern.progress - (to - from) * policy.decayPerGameSecond);
      through = to;
      const receipt = owner.sources[active.key];
      if (receipt) {
        receipt.through = to;
        if (pattern.observation) receipt.observation = pattern.observation;
      }
    }
    if (input.through <= until) delete pattern.active;
  }
  if (suppliedGap && until > through) {
    pattern.progress = Math.max(
      0,
      pattern.progress - (until - through) * policy.decayPerGameSecond,
    );
    delete pattern.observation;
    through = until;
  }
  if (active && active.input.support.fraction === 0 && until > pattern.through)
    delete pattern.observation;
  pattern.through = through;
}
/** Supply the physical family's completed/held span at its actual native boundary.
 * A source revision/sample cannot change its admitted body on redelivery. */
export function receiveDetectionSupport(
  world: WorldState,
  observerId: string,
  input: DetectionSupportInput,
): {
  status: 'pending' | 'detected' | 'replay' | 'ambiguous';
  observation?: ObservationContribution;
  nextAt?: number;
  patternId: string;
} {
  const observer = entityGet(world.entities, observerId);
  if (!observer?.actor) throw new Error('Detection support requires an observer.');
  validateInput(world, observer, input);
  if (input.support.kind === 'impulse' && input.from !== world.simTime)
    throw new Error('A weak impulse requires its actual native reception boundary.');
  if (!eligible(world, observer, input.detector))
    throw new Error('The supplied detector is not available to this observer.');
  const owner = state(world, observer),
    key = sourceKey(input),
    body = canonicalJson(input),
    prior = owner.sources[key];
  if (prior && input.sample <= prior.sample) {
    if (input.sample === prior.sample && prior.body !== body)
      throw new Error('A detection support sample changed on replay.');
    const pattern = owner.patterns[prior.patternId];
    if (pattern) settlePattern(world, observer, owner, pattern);
    return {
      status: 'replay',
      patternId: prior.patternId,
      ...(input.sample === prior.sample && prior.observation
        ? { observation: cloneValue(prior.observation) }
        : {}),
    };
  }
  const policy = selectedDetectionSupportPolicy(world),
    continuity = input.continuity && canonicalJson(input.continuity);
  if (input.contradictory && continuity)
    for (const pattern of Object.values(owner.patterns))
      if (pattern.continuity === continuity) {
        settlePattern(world, observer, owner, pattern, Math.max(pattern.through, input.from), true);
        pattern.progress = 0;
        delete pattern.active;
        delete pattern.observation;
      }
  const candidates = input.contradictory
    ? []
    : Object.values(owner.patterns).filter(
        (pattern) =>
          pattern.modality === input.modality &&
          same(pattern.detector, input.detector) &&
          input.from - pattern.lastSupportedAt <= policy.graceSeconds &&
          (!pattern.active || pattern.active.key === key) &&
          ((continuity && pattern.continuity === continuity) ||
            (!continuity &&
              !pattern.continuity &&
              !!input.location &&
              !!pattern.envelope &&
              !!intersection(pattern.envelope, input.location.value))),
      );
  const ambiguous = !!input.ambiguous || candidates.length > 1;
  const broad = candidates.filter((pattern) => pattern.ambiguous);
  let pattern = ambiguous
    ? broad.length === 1
      ? broad[0]
      : undefined
    : candidates.length === 1
      ? candidates[0]
      : undefined;
  if (!pattern) {
    const id = nextId(world, 'perception-pattern');
    pattern = owner.patterns[id] = {
      id,
      detector: cloneValue(input.detector),
      modality: input.modality,
      beganAt: Math.max(input.from, prior?.through ?? input.from),
      through: Math.max(input.from, prior?.through ?? input.from),
      lastSupportedAt: input.from,
      progress: 0,
      ambiguous,
      ...(continuity ? { continuity } : {}),
      ...(input.location ? { envelope: cloneValue(input.location.value) } : {}),
    };
  } else if (input.location && pattern.envelope) {
    const common = intersection(pattern.envelope, input.location.value);
    if (common) pattern.envelope = common;
  }
  // Completed spans may arrive at their endpoint. Settle the preceding source or
  // an actual unsupported gap only to this span's start, then consume its uncovered
  // prefix. A past crossing is an explicit preparation failure, never backdated.
  if (pattern.through < input.from)
    settlePattern(world, observer, owner, pattern, input.from, true);
  pattern.through = Math.max(pattern.through, prior?.through ?? pattern.through);
  const receipt: SupportReceipt = (owner.sources[key] = {
    sample: input.sample,
    body,
    through: pattern.through,
    patternId: pattern.id,
  });
  if (
    prior &&
    prior.patternId !== pattern.id &&
    !Object.values(owner.sources).some((source) => source.patternId === prior.patternId)
  )
    delete owner.patterns[prior.patternId];
  if (input.support.kind === 'impulse') {
    if (pattern.through < world.simTime)
      settlePattern(world, observer, owner, pattern, world.simTime, true);
    pattern.progress = Math.min(policy.maximum, pattern.progress + input.support.fraction);
    pattern.lastSupportedAt = world.simTime;
    pattern.through = world.simTime;
    receipt.through = world.simTime;
    if (pattern.progress >= policy.threshold)
      receipt.observation = detect(world, observer, pattern, input);
  } else {
    pattern.active = { key, input: cloneValue(input) };
    settlePattern(world, observer, owner, pattern);
  }
  if (pattern.observation) receipt.observation = pattern.observation;
  chargeWork({ tests: candidates.length + 1, effects: 1 });
  const nextAt = patternBoundary(world, pattern);
  return {
    status: pattern.observation ? 'detected' : ambiguous ? 'ambiguous' : 'pending',
    patternId: pattern.id,
    ...(pattern.observation ? { observation: cloneValue(pattern.observation) } : {}),
    ...(nextAt !== undefined ? { nextAt } : {}),
  };
}
function patternBoundary(world: WorldState, pattern: SupportPattern): number | undefined {
  const active = pattern.active;
  if (!active) return;
  const policy = selectedDetectionSupportPolicy(world),
    rate = active.input.support.fraction * policy.fullRatePerGameSecond;
  const crossing =
    !pattern.observation && rate > 0
      ? pattern.through + (policy.threshold - pattern.progress) / rate
      : Infinity;
  const next = Math.min(active.input.through, crossing);
  return next > world.simTime ? next : undefined;
}
export function nextDetectionSupportBoundary(world: WorldState): number | undefined {
  let next = Infinity;
  for (const id of observerIds(world)) {
    const state = world.perceptionEvidence?.[id];
    for (const pattern of Object.values(state?.support?.patterns ?? {}))
      next = Math.min(next, patternBoundary(world, pattern) ?? Infinity);
  }
  return Number.isFinite(next) ? next : undefined;
}
export function settleDetectionSupport(world: WorldState, observerId?: string): void {
  for (const id of observerId ? [observerId] : observerIds(world)) {
    const state = world.perceptionEvidence?.[id];
    if (!state) continue;
    const observer = entityGet(world.entities, id);
    if (!observer?.actor || state.life !== (observer.actor.physicalLife ?? 0)) continue;
    for (const pattern of Object.values(state.support?.patterns ?? {}))
      settlePattern(world, observer, state.support!, pattern);
  }
}
/** The physical source owner calls this only after its root cannot be redelivered.
 * Retained acquired bodies already live in the ordinary personal/native source lineage. */
export function retireDetectionSupportSource(
  world: WorldState,
  observerId: string,
  source: EvidenceSource,
): void {
  settleDetectionSupport(world, observerId);
  const owner = world.perceptionEvidence?.[observerId]?.support;
  if (!owner) return;
  const key = canonicalJson(source),
    receipt = owner.sources[key];
  if (!receipt) return;
  delete owner.sources[key];
  const pattern = owner.patterns[receipt.patternId];
  if (pattern?.active?.key === key) delete pattern.active;
  if (!Object.values(owner.sources).some((value) => value.patternId === receipt.patternId))
    delete owner.patterns[receipt.patternId];
  if (!Object.keys(owner.sources).length) {
    delete world.perceptionEvidence![observerId]!.support;
    supportOwners.delete(world);
  }
}
export function validateDetectionSupportState(
  world: WorldState,
  observerId: string,
  value: DetectionSupportState,
  originals = new Map<string, string>(),
): void {
  const observer = entityGet(world.entities, observerId);
  if (
    !observer?.actor ||
    !value ||
    typeof value.sources !== 'object' ||
    typeof value.patterns !== 'object'
  )
    throw new Error('Invalid native detection support.');
  const policy = selectedDetectionSupportPolicy(world);
  if (!same(value.policy, { id: policy.id, version: policy.version }))
    throw new Error('Invalid detection support policy.');
  for (const [key, receipt] of Object.entries(value.sources)) {
    if (
      !Number.isSafeInteger(receipt.sample) ||
      receipt.sample < 0 ||
      typeof receipt.body !== 'string' ||
      !Number.isFinite(receipt.through) ||
      receipt.through > world.simTime ||
      typeof receipt.patternId !== 'string' ||
      !value.patterns[receipt.patternId]
    )
      throw new Error('Invalid detection source receipt.');
    const input = JSON.parse(receipt.body) as DetectionSupportInput;
    validateInput(world, observer, input);
    const pattern = value.patterns[receipt.patternId]!;
    if ((input.continuity ? canonicalJson(input.continuity) : undefined) !== pattern.continuity)
      throw new Error('Conflicting detection continuity.');
    if (
      sourceKey(input) !== key ||
      input.sample !== receipt.sample ||
      !same(pattern.detector, input.detector) ||
      pattern.modality !== input.modality
    )
      throw new Error('Conflicting detection source receipt.');
    if (receipt.observation) {
      validateObservationContribution(receipt.observation, originals);
      if (!same(receipt.observation.observer, life(observer)))
        throw new Error('Foreign detection receipt.');
    }
  }
  for (const [id, pattern] of Object.entries(value.patterns)) {
    if (
      pattern.id !== id ||
      !id.startsWith('perception-pattern-') ||
      ![pattern.beganAt, pattern.through, pattern.lastSupportedAt, pattern.progress].every(
        Number.isFinite,
      ) ||
      pattern.through > world.simTime ||
      pattern.progress < 0 ||
      pattern.progress > policy.maximum ||
      pattern.beganAt > pattern.through ||
      pattern.lastSupportedAt > pattern.through ||
      !Object.values(value.sources).some((source) => source.patternId === id) ||
      typeof pattern.ambiguous !== 'boolean'
    )
      throw new Error('Invalid detection support reduction.');
    if (pattern.envelope) validateObservedLocation(pattern.envelope);
    if (pattern.observation) {
      validateObservationContribution(pattern.observation, originals);
      if (!same(pattern.observation.observer, life(observer)))
        throw new Error('Foreign detected pattern.');
    }
    if (pattern.active) {
      validateInput(world, observer, pattern.active.input);
      if (
        !value.sources[pattern.active.key] ||
        pattern.active.input.support.kind !== 'rate' ||
        value.sources[pattern.active.key]!.body !== canonicalJson(pattern.active.input)
      )
        throw new Error('Invalid held detection support.');
    }
  }
}
