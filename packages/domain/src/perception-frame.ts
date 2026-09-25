import { capabilityBlocked } from './status-capabilities.js';
import { current, isDraft } from 'immer';
import { hasMemory } from './living.js';
import { visionQuery, visionRadius } from './perception.js';
import { bodyProfile, spatialMap } from './spatial-state.js';
import { spatialCandidates } from './spatial.js';
import { isSafeRecordId } from './records.js';
import type { Entity, Position, WorldState } from './types.js';

interface Source {
  id: string;
  position: Position;
  height: number;
  eyeHeight: number;
  bodyRadius: number;
  radius: number;
  alive: boolean;
  memory: boolean;
  sleeping: boolean;
  object: boolean;
  feature: string;
  detail: string;
}
interface Exposure {
  people: string[];
  objects: string[];
}
interface Frame {
  geometry: object;
  senses: object;
  sources: Map<string, Source>;
  exposures: Map<string, Exposure>;
  stats: { reused: number; queried: number; candidates: number };
}
const frames = new WeakMap<WorldState, Frame>();
const plain = <T extends object>(value: T): T => (isDraft(value) ? current(value) : value);
const samePosition = (a: Position, b: Position) => a.x === b.x && a.y === b.y && a.z === b.z;
const sameSource = (a: Source | undefined, b: Source) =>
  !!a &&
  samePosition(a.position, b.position) &&
  a.height === b.height &&
  a.alive === b.alive &&
  a.object === b.object;
const nearby = (observer: Source, target: Source) =>
  Math.hypot(observer.position.x - target.position.x, observer.position.z - target.position.z) <=
  observer.radius + 2;

/** Only current coarse outward facts, not physiology, private traits or intentions.
 * Add supported detail here when a real sensory consumer exists, not by hashing the whole entity.
 * docs/architecture.md#change-driven-exposure-and-reaction-intake
 */
function visibleFeature(entity: Entity): { feature: string; detail: string } {
  const facts = [
    entity.actor ? '' : entity.name,
    entity.kind,
    entity.appearance ?? 'sprite',
    entity.actor
      ? entity.actor.alive
        ? entity.actor.incapacitated
          ? 'incapacitated'
          : 'alive'
        : 'dead'
      : '',
    entity.heat ? (entity.heat.lit ? 'burning' : 'unlit') : '',
    entity.resource ? (entity.resource.quantity > 0 ? 'material present' : 'depleted') : '',
    entity.remains ? (entity.remains.harvested ? 'harvested' : 'unharvested') : '',
  ];
  return { feature: JSON.stringify(facts), detail: facts.filter(Boolean).join(', ') };
}

const inertSources = new WeakMap<Entity, Source>();
function captureSource(world: WorldState, value: Entity): Source {
  const entity = value.actor ? value : plain(value);
  const immutable = !entity.actor && Object.isFrozen(entity);
  const cached = immutable ? inertSources.get(entity) : undefined;
  if (cached) return cached;
  const body = bodyProfile(entity);
  const source: Source = {
    id: entity.id,
    position: plain(entity.position),
    height: body.height,
    eyeHeight: body.eyeHeight,
    bodyRadius: body.radius,
    radius: entity.actor ? visionRadius(world, entity) : 0,
    alive: !!entity.actor?.alive,
    memory: hasMemory(entity),
    sleeping: capabilityBlocked(world, entity, 'perception'),
    object: !entity.actor && !entity.animal,
    ...visibleFeature(entity),
  };

  if (immutable) inertSources.set(entity, source);
  return source;
}

/** Derived fixed-phase visibility reuse. Cache entries contain scalar snapshots, never drafts.
 * Source motion invalidates nearby stationary observers; geometry/senses invalidate all.
 * Queries retain existing exact vision and spatial-candidate ordering.
 */
export function createPerceptionFrame(world: WorldState, previous: WorldState) {
  const old = Object.isFrozen(previous) ? frames.get(previous) : undefined;
  // Reading scalar fields avoids materializing every changed action/status/agency subtree.
  // Keep live draft values so same-step movement and capability changes remain visible.
  const samples = Object.keys(world.entities).map((id) =>
    captureSource(world, world.entities[id]!),
  );
  const next: Frame = {
    geometry: spatialMap(world),
    senses: plain(world.moduleManifest),
    sources: new Map(samples.map((source) => [source.id, source])),
    exposures: new Map(),
    stats: { reused: 0, queried: 0, candidates: 0 },
  };
  const compatible = old?.geometry === next.geometry && old?.senses === next.senses;
  const changed = compatible
    ? samples.filter((source) => !sameSource(old!.sources.get(source.id), source))
    : samples;
  const removed = compatible
    ? [...old!.sources.values()].filter((source) => !next.sources.has(source.id))
    : [];
  let living: ReturnType<typeof spatialCandidates<Source>> | undefined;
  let objects: ReturnType<typeof spatialCandidates<Source>> | undefined;
  return {
    sources: samples,
    source(id: string) {
      return next.sources.get(id);
    },
    changedFeatures: new Set(
      samples
        .filter(
          (source) =>
            previous.perceptionFeatures[source.id] !== undefined &&
            previous.perceptionFeatures[source.id] !== source.feature,
        )
        .map((source) => source.id),
    ),
    *query(observer: Source): Generator<void, Exposure, void> {
      const prior = old?.sources.get(observer.id),
        exposed = old?.exposures.get(observer.id);
      const stableObserver =
        compatible &&
        exposed &&
        prior &&
        sameSource(prior, observer) &&
        prior.radius === observer.radius &&
        prior.eyeHeight === observer.eyeHeight &&
        prior.sleeping === observer.sleeping &&
        prior.memory === observer.memory;
      // A moving person does not invalidate static object geometry. Classification changes
      // check both the old and new source so death/removal cannot leave stale exposures.
      const canReuse = (kind: 'alive' | 'object') =>
        stableObserver &&
        !changed.some((source) => {
          const before = old!.sources.get(source.id);
          return (
            (source[kind] && nearby(observer, source)) ||
            (!!before?.[kind] && nearby(observer, before))
          );
        }) &&
        !removed.some((source) => source[kind] && nearby(observer, source));
      const reusePeople = canReuse('alive'),
        reuseObjects = canReuse('object');
      if (reusePeople && reuseObjects) {
        next.stats.reused++;
        next.exposures.set(observer.id, exposed!);
        return exposed!;
      }
      const sees = visionQuery(world, world.entities[observer.id]!);
      const result: Exposure = {
        people: reusePeople ? exposed!.people : [],
        objects: reuseObjects ? exposed!.objects : [],
      };
      let examined = 0;
      next.stats.queried++;
      if (!reusePeople) {
        living ??= spatialCandidates(samples.filter((source) => source.alive));
        const candidates = living(observer.position, observer.radius + 2);
        next.stats.candidates += candidates.length;
        for (const source of candidates) {
          if (source.id !== observer.id && sees(source)) result.people.push(source.id);
          if (++examined % 64 === 0) yield;
        }
      }
      if (!reuseObjects) {
        objects ??= spatialCandidates(samples.filter((source) => source.object));
        const candidates = objects(observer.position, observer.radius);
        next.stats.candidates += candidates.length;
        for (const source of candidates) {
          if (sees(source)) result.objects.push(source.id);
          if (++examined % 64 === 0) yield;
        }
      }
      // Preserve committed identities when a geometry recheck finds no membership change.
      const retain = (ids: string[], before: string[] | undefined) =>
        before && ids.length === before.length && ids.every((id, i) => id === before[i])
          ? before
          : ids;
      result.people = retain(result.people, previous.visiblePeople?.[observer.id]);
      result.objects = retain(result.objects, previous.visibleObjects?.[observer.id]);
      next.exposures.set(observer.id, result);
      return result;
    },
    finish() {
      if (
        samples.length !== Object.keys(previous.perceptionFeatures).length ||
        samples.some((source) => previous.perceptionFeatures[source.id] !== source.feature)
      )
        world.perceptionFeatures = Object.fromEntries(
          samples.map((source) => [source.id, source.feature]),
        );
    },
    retain(committed: WorldState) {
      frames.set(committed, next);
    },
  };
}
export function perceptionFrameStats(world: WorldState) {
  const stats = frames.get(world)?.stats;
  return stats ? { ...stats } : undefined;
}
export function validatePerceptionState(world: WorldState): void {
  const values = world.perceptionFeatures;
  if (
    !values ||
    typeof values !== 'object' ||
    Array.isArray(values) ||
    Object.entries(values).some(
      ([id, value]) => !isSafeRecordId(id) || typeof value !== 'string' || value.length > 2048,
    )
  )
    throw new Error('Invalid saved perception feature baseline.');
}
