import {
  exposureCrossings,
  incidentExposure,
  BoundsIndex,
  type CoverPanel,
  footprintMinimumHeight,
  coverFootprint,
  type ExposureFootprint,
  type SpatialMap,
} from '@open-legend/spatial';
import { assemblyShapes } from './assembly-geometry.js';
import { bodyProfile, spatialMap, worldPosition } from './spatial-state.js';
import { worldRootEntities } from './entity-index.js';
import { directChildIds } from './objects.js';
import { chargeWork } from './work-budget.js';
import { readState, stateAddress, writeState } from './state-owners.js';
import { attributeDefinition } from './world-modules.js';
import type { AssemblyFamily, FiniteRain } from './assembly-types.js';
import type { WorldState, WorldEvent } from './types.js';

const panelViews = new WeakMap<
  SpatialMap,
  { panels: CoverPanel[]; byId: Map<string, CoverPanel> }
>();
const panelIndexes = new WeakMap<readonly CoverPanel[], BoundsIndex<number>>();
const materialCandidates = new WeakMap<
  WorldState['objectState'],
  {
    definitions: WorldState['itemDefinitions'];
    families: WorldState['assemblyFamilies'];
    ids: string[];
  }
>();
/** Custody/quantity changes invalidate through the object owner; definition changes
 * invalidate through their installed records. Position and moisture are read live. */
function exposedMaterialIds(world: WorldState): readonly string[] {
  const immutable = Object.isFrozen(world);
  const cached = immutable ? materialCandidates.get(world.objectState) : undefined;
  if (cached?.definitions === world.itemDefinitions && cached.families === world.assemblyFamilies)
    return cached.ids;
  const ids: string[] = [];
  for (const root of worldRootEntities(world, true)) {
    if (!root.actor && root.kind !== 'item-pile' && !root.assembly) continue;
    for (const id of directChildIds(world, root.id)) {
      const lot = world.entities[id]?.item;
      const material = lot && world.itemDefinitions[lot.definitionPin.id]?.assemblyMaterial;
      if (material && ['cover', 'fiber'].includes(material.role)) ids.push(id);
    }
  }
  if (immutable)
    materialCandidates.set(world.objectState, {
      definitions: world.itemDefinitions,
      families: world.assemblyFamilies,
      ids,
    });
  return ids;
}
/** The spatial owner supplies a new map whenever actual shelter geometry changes.
 * Moisture updates can reuse the same finite panels and their immutable bounds tree. */
function materialPanelView(world: WorldState) {
  const map = spatialMap(world);
  const existing = panelViews.get(map);
  if (existing) return existing;
  const panels = worldRootEntities(world, true).flatMap((root) =>
    root.assembly ? assemblyShapes(world, root).panels : [],
  );
  const view = { panels, byId: new Map(panels.map((panel) => [panel.id, panel])) };
  panelViews.set(map, view);
  return view;
}
function materialPanels(world: WorldState): CoverPanel[] {
  return materialPanelView(world).panels;
}
/** Conservative swept bounds retain every possible overlap, including height
 * crossings. Exact area/layer tests still decide exposure; tree order never does. */
function nearbyPanels(
  panels: readonly CoverPanel[],
  from: ExposureFootprint,
  to = from,
): CoverPanel[] {
  if (!panels.length) return [];
  let index = panelIndexes.get(panels);
  if (!index) {
    index = new BoundsIndex(panels.map((panel, value) => ({ value, bounds: panel.bounds })));
    panelIndexes.set(panels, index);
  }
  const minX = Math.min(from.minX, to.minX),
    maxX = Math.max(from.maxX, to.maxX),
    minZ = Math.min(from.minZ, to.minZ),
    maxZ = Math.max(from.maxZ, to.maxZ),
    minY = Math.min(footprintMinimumHeight(from), footprintMinimumHeight(to));
  const found: number[] = [];
  index.visit(
    (bounds) => {
      chargeWork({ candidates: 1 });
      return (
        bounds.max.x > minX &&
        bounds.min.x < maxX &&
        bounds.max.z > minZ &&
        bounds.min.z < maxZ &&
        bounds.max.y >= minY
      );
    },
    (value) => {
      found.push(value);
      return false;
    },
  );
  return found.sort((a, b) => a - b).map((value) => panels[value]!);
}

/** Exposure is a material form at its actual custody/attachment, never another placement. */
export function materialFootprint(world: WorldState, id: string): ExposureFootprint | undefined {
  const item = world.entities[id],
    lot = item?.item,
    definition = lot && world.itemDefinitions[lot.definitionPin.id];
  const descriptor = definition?.assemblyMaterial,
    family = descriptor && world.assemblyFamilies?.[descriptor.familyId];
  if (
    !family ||
    !descriptor ||
    !['cover', 'fiber'].includes(descriptor.role) ||
    !item?.placement ||
    item.retirement
  )
    return;
  const placement = item.placement;
  if (placement.mode === 'attached' && placement.portId === 'assembly') {
    // Installed material reads the spatial owner's existing finite shape, rather
    // than preparing another prism at both ends of every moisture interval.
    const cover = materialPanelView(world).byId.get(id);
    return cover && coverFootprint(cover);
  }
  if (placement.mode === 'world') return;
  const parent = world.entities[placement.parentEntityId];
  if (
    !parent ||
    parent.placement?.mode !== 'world' ||
    (!parent.actor && parent.kind !== 'item-pile')
  )
    return;
  const point = worldPosition(parent),
    profile = bodyProfile(parent);
  const worn = descriptor.role === 'cover' && placement.mode === 'attached';
  const form = worn
    ? family.exposure.worn
    : descriptor.role === 'fiber'
      ? family.exposure.fiber
      : family.exposure.folded;
  const y =
    point.y +
    (parent.actor
      ? worn
        ? profile.height
        : profile.interactionHeight
      : 'height' in form
        ? Number(form.height)
        : 0);
  return {
    minX: point.x - form.width / 2,
    maxX: point.x + form.width / 2,
    minZ: point.z - form.length / 2,
    maxZ: point.z + form.length / 2,
    y,
  };
}
interface MaterialSample {
  id: string;
  family: AssemblyFamily;
  footprint: ExposureFootprint;
}
export interface MaterialExposureInterval {
  at: number;
  panels: CoverPanel[];
  rain?: FiniteRain;
  materials: MaterialSample[];
}
/** Captured once per native motion slice; changes at its endpoint affect only future time. */
export function captureMaterialExposure(world: WorldState): MaterialExposureInterval {
  const materials: MaterialSample[] = [];
  const rain = world.finiteRain;
  const raining =
    !!rain &&
    world.simTime >= rain.startsAt - 1e-8 &&
    world.simTime < rain.endsAt - 1e-8 &&
    rain.intensity > 0;
  for (const id of exposedMaterialIds(world)) {
    const item = world.entities[id]!;
    if (!item.item) continue;
    chargeWork({ candidates: 1 });
    const descriptor = world.itemDefinitions[item.item.definitionPin.id]?.assemblyMaterial;
    const family = descriptor && world.assemblyFamilies?.[descriptor.familyId];
    const moisture = family && item.attributes?.[family.moistureAttribute];
    // The native weather boundary ends this interval before any future rain starts.
    // A dry material has no drying work; movement cannot make it wetter without rain.
    if (!family || !moisture || (!raining && moisture.value === 0)) continue;
    const footprint = materialFootprint(world, item.id);
    if (footprint) materials.push({ id: item.id, family, footprint });
  }
  return {
    at: world.simTime,
    panels: raining && materials.length ? materialPanels(world) : [],
    rain,
    materials,
  };
}
export function weatherBoundary(world: WorldState, maximum: number): number {
  const rain = world.finiteRain;
  if (!rain) return maximum;
  for (const at of [rain.startsAt, rain.endsAt])
    if (at > world.simTime + 1e-8) maximum = Math.min(maximum, at - world.simTime);
  return maximum;
}
const between = (a: ExposureFootprint, b: ExposureFootprint, t: number): ExposureFootprint => ({
  minX: a.minX + (b.minX - a.minX) * t,
  maxX: a.maxX + (b.maxX - a.maxX) * t,
  minZ: a.minZ + (b.minZ - a.minZ) * t,
  maxZ: a.maxZ + (b.maxZ - a.maxZ) * t,
  y: a.y + (b.y - a.y) * t,
  ...(a.heightPlane ? { heightPlane: a.heightPlane } : {}),
  ...(a.ownPanelId ? { ownPanelId: a.ownPanelId } : {}),
});
export function* integrateMaterialExposure(
  world: WorldState,
  interval: MaterialExposureInterval,
  seconds: number,
  events: WorldEvent[],
): Generator<void> {
  if (!(seconds > 0)) return;
  const rain = interval.rain;
  const raining =
    !!rain &&
    interval.at >= rain.startsAt - 1e-8 &&
    interval.at < rain.endsAt - 1e-8 &&
    rain.intensity > 0;
  for (const sample of interval.materials) {
    yield;
    const to = materialFootprint(world, sample.id),
      definition = attributeDefinition(world, sample.family.moistureAttribute);
    if (!to || !definition) continue;
    const state = readState(world, stateAddress(sample.id, definition), 'owner');
    if (state.status !== 'known' || typeof state.value !== 'number') continue;
    let value = state.value;
    const panels = raining ? nearbyPanels(interval.panels, sample.footprint, to) : [];
    const exposure = (t: number, layerHeight: number) => {
      const result = incidentExposure(
        { ...between(sample.footprint, to, t), orderingY: layerHeight },
        panels,
        rain,
      );
      chargeWork({ candidates: panels.length + result.clips });
      return result.fraction;
    };
    const crossings = raining ? exposureCrossings(sample.footprint, to, panels, rain) : [0, 1];
    chargeWork({ candidates: crossings.length });
    for (let n = 1; n < crossings.length; n++) {
      const a = crossings[n - 1]!,
        b = crossings[n]!,
        duration = seconds * (b - a);
      // Height crossings change which layers are above the material discontinuously.
      // Use this segment's ordering at both endpoints; a boundary line has zero duration.
      // docs/projects/editable-shelters-tech-design.md#42-rain-coverage-calculation
      const layerHeight = sample.footprint.y + ((to.y - sample.footprint.y) * (a + b)) / 2;
      const mid = raining ? exposure((a + b) / 2, layerHeight) : 0;
      if (mid > 0)
        value = Math.min(
          1,
          value +
            (((duration * (exposure(a, layerHeight) + 4 * mid + exposure(b, layerHeight))) / 6) *
              rain!.intensity) /
              sample.family.wettingSeconds,
        );
      else value = Math.max(0, value - duration / sample.family.dryingSeconds);
    }
    if (value !== state.value)
      writeState(
        world,
        stateAddress(sample.id, definition),
        state.revision,
        { kind: 'replace', value },
        events,
        'material exposure',
        'transition',
      );
  }
}
export function materialExposureView(
  world: WorldState,
  id: string,
): { label: string; process: 'wetting' | 'drying'; coveredFraction: number } | undefined {
  const item = world.entities[id],
    descriptor = item?.item && world.itemDefinitions[item.item.definitionPin.id]?.assemblyMaterial,
    family = descriptor && world.assemblyFamilies?.[descriptor.familyId];
  const footprint = materialFootprint(world, id),
    value = family && item?.attributes?.[family.moistureAttribute]?.value;
  if (!family || !footprint || typeof value !== 'number') return;
  const panels = nearbyPanels(materialPanels(world), footprint);
  const incident = incidentExposure(footprint, panels, world.finiteRain);
  const rain = world.finiteRain,
    raining =
      !!rain && rain.startsAt <= world.simTime && rain.endsAt > world.simTime && rain.intensity > 0;
  const labels = family.moistureLabels;
  return {
    label:
      value >= 1
        ? labels.saturated
        : value >= labels.wetMinimum
          ? labels.wet
          : value > labels.dryMaximum
            ? labels.damp
            : labels.dry,
    process: raining && incident.fraction > 0 ? 'wetting' : 'drying',
    coveredFraction:
      incident.coveredArea /
      ((footprint.maxX - footprint.minX) * (footprint.maxZ - footprint.minZ)),
  };
}
