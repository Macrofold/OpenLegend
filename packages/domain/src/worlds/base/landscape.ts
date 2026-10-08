import {
  surfaceContains,
  surfaceHeight,
  type SceneryInstance,
  type SpatialLayout,
  type Terrain,
} from '@open-legend/spatial';
import { worldPlacement } from '../../spatial-state.js';
import { nativeActor } from './bodies.js';
import type { Entity, WorldState } from '../../types.js';

/** Authored new-world composition; no live save is reseeded. */
export const STARTER_EXTENT = { width: 62, depth: 54 } as const;
/** Shared authored sites keep seeded terrain clear beneath the installed encounter. */
export const FIRST_THREAT_LOCATIONS = {
  home: [32, 28],
  refuge: [38, 31],
  cache: [36.8, 26],
  tracks: [28, 24],
  brush: [30, 24],
  screen: [29.5, 28],
} as const;
const firstThreatLocations = Object.values(FIRST_THREAT_LOCATIONS);
const WOODLAND_ANIMALS: Array<['hare' | 'deer' | 'wolf' | 'bear', number, number]> = [
  ['hare', 30, 19],
  ['hare', 27, 33],
  ['hare', 17, 36],
  ['hare', 46, 17],
  ['hare', 40, 43],
  ['deer', 35, 19],
  ['deer', 26, 37],
  ['deer', 43, 31],
  ['deer', 22, 45],
  ['deer', 51, 25],
  ['wolf', 48, 39],
  ['wolf', 51, 41],
  ['wolf', 54, 35],
  ['bear', 53, 47],
  ['bear', 37, 47],
];
const WOODLAND_PATCHES: Array<[string, string, number, number, number, number]> = [
  ['berries', 'Berry thicket', 28, 29, 24, 30],
  ['berries', 'Berry bush', 37, 17, 18, 30],
  ['berries', 'Berry thicket', 19, 35, 28, 30],
  ['berries', 'Berry bush', 44, 44, 22, 30],
  ['wood', 'Fallen branches', 33, 31, 40, 42],
  ['wood', 'Fallen branches', 49, 20, 32, 42],
  ['wood', 'Fallen branches', 24, 46, 34, 42],
  ['stone', 'Loose stones', 38, 25, 36, 24],
  ['stone', 'Loose stones', 51, 45, 42, 24],
  ['raw_fiber', 'Dry grass fibers', 30, 23, 36, 36],
  ['raw_fiber', 'Dry grass fibers', 46, 35, 30, 36],
  ['raw_fiber', 'River reeds', 10, 40, 42, 36],
];
const noise = (seed: number, x: number, z: number): number => {
  let n =
    Math.imul(seed ^ Math.imul(x + 317, 374761393), 668265263) ^ Math.imul(z + 911, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};
export function starterTiles(seed: number, width: number, depth: number): Terrain[][] {
  const tiles: Terrain[][] = [];
  for (let z = 0; z < depth; z++) {
    const river = z <= 23 ? 2 : 2 + (z - 23) * 0.24 + Math.sin((z - 23) * 0.28) * 1.5;
    tiles.push(
      Array.from({ length: width }, (_, x) => {
        if (z >= 11 && z <= 12 && x <= 4) return 'grass'; // Existing shallow ford.
        if (x < river + 0.6) return 'water';
        if (x < river + 1.6) return 'sand';
        return 'grass';
      }),
    );
  }
  // Keep the camp's established rock formations; more lie in the outer meadows.
  const formations = [
    [17, 6],
    [17, 7],
    [17, 8],
    [18, 8],
    [7, 18],
    [8, 18],
    [21, 17],
    [22, 17],
    [34, 15],
    [35, 15],
    [35, 16],
    [41, 23],
    [42, 23],
    [43, 23],
    [48, 33],
    [49, 33],
    [29, 38],
    [30, 38],
    [30, 39],
    [19, 43],
    [20, 43],
    [53, 46],
    [54, 46],
    [54, 47],
  ];
  for (const [x, z] of formations) if (tiles[z!]?.[x!] !== undefined) tiles[z!]![x!] = 'rock';
  // Stable speckling selects appearance variants without consuming the world's action randomness.
  for (let z = 25; z < depth - 4; z++)
    for (let x = 12; x < width - 4; x++)
      if (
        tiles[z]![x] === 'grass' &&
        noise(seed + 29, x, z) < 0.009 &&
        !WOODLAND_ANIMALS.some(([, ax, az]) => Math.hypot(x - ax, z - az) < 1.5) &&
        !WOODLAND_PATCHES.some(([, , px, pz]) => Math.hypot(x - px, z - pz) < 1.5) &&
        !firstThreatLocations.some(([px, pz]) => Math.hypot(x - px, z - pz) < 1.5)
      )
        tiles[z]![x] = 'rock';
  return tiles;
}
export function starterGroundAt(layout: SpatialLayout, x: number, z: number) {
  const surface = layout.surfaces.find(
    (s) => s.material === 'ground' && surfaceContains(s, { x, z }),
  );
  if (!surface) throw new Error('Starting content needs supported ground.');
  return { x, y: surfaceHeight(surface, x, z), z, surfaceId: surface.id };
}
export function starterScenery(
  seed: number,
  width: number,
  depth: number,
  tiles: Terrain[][],
  layout: SpatialLayout,
): SceneryInstance[] {
  const result: SceneryInstance[] = [];
  const ground = (x: number, z: number) =>
    starterGroundAt(
      layout,
      Math.max(0, Math.min(width - 1, x)),
      Math.max(0, Math.min(depth - 1, z)),
    ).y;
  const add = (
    appearance: string,
    x: number,
    z: number,
    w: number,
    h: number,
    castShadows: boolean,
    variant: number,
  ) => {
    result.push({
      id: `scenery-${result.length}`,
      appearance,
      seed: seed + variant * 19,
      position: { x, y: ground(x, z), z },
      width: w,
      height: h,
      castShadows,
    });
  };
  for (let row = 0, z = -6; z < depth + 6; row++, z += 3.1)
    for (let col = 0, x = -6; x < width + 6; col++, x += 3.1) {
      const n = noise(seed, col, row),
        px = x + (n - 0.5) * 1.8,
        pz = z + (noise(seed + 3, col, row) - 0.5) * 1.8;
      const edge = Math.min(px, pz, width - 1 - px, depth - 1 - pz);
      const perimeter = 6 + Math.sin(px * 0.25) * 2 + Math.cos(pz * 0.31) * 1.8;
      const outside = px < 0 || pz < 0 || px > width - 1 || pz > depth - 1;
      if (!outside && tiles[Math.round(pz)]?.[Math.round(px)] !== 'grass') continue;
      // The original camp and lookout keep their working space, flight corridor and sightlines.
      if (Math.hypot(px - 11, pz - 12) < 5.5 || (px > 17 && px < 26 && pz > 3 && pz < 14)) continue;
      if (edge > perimeter && (n > 0.075 || (px < 27 && pz < 23))) continue;
      const shape = noise(seed + 7, col, row),
        h = shape < 0.35 ? 6.2 + n * 3.2 : 4.5 + n * 3.5;
      add(
        shape < 0.35 ? 'tree-conifer' : shape < 0.65 ? 'tree-birch' : 'tree-broadleaf',
        px,
        pz,
        h * (shape < 0.35 ? 0.52 : 0.8),
        h,
        true,
        Math.floor(n * 4),
      );
    }
  // Subordinate ground detail is batched by appearance, not one scene node per blade.
  for (let i = 0; i < 1000; i++) {
    const x = noise(seed + 11, i, 1) * (width - 1),
      z = noise(seed + 13, i, 2) * (depth - 1);
    if (tiles[Math.round(z)]?.[Math.round(x)] !== 'grass') continue;
    const h = 0.16 + noise(seed + 17, i, 3) * 0.28;
    add('meadow-grass', x, z, h * 1.5, h, false, 0);
  }
  for (let i = 0; i < 50; i++) {
    const x = 8 + noise(seed + 23, i, 1) * (width - 12),
      z = 3 + noise(seed + 31, i, 2) * (depth - 7);
    if (tiles[Math.round(z)]?.[Math.round(x)] !== 'grass' || Math.hypot(x - 11, z - 12) < 4)
      continue;
    const h = 0.45 + noise(seed + 37, i, 3) * 0.6;
    add('woodland-shrub', x, z, h * 1.6, h, false, i % 3);
  }
  return result;
}
export function populateOuterWilderness(world: WorldState): void {
  const layout = world.map.spatial;
  if (!layout) throw new Error('Starting wildlife needs a spatial layout.');
  const energy = world.moduleManifest.definitions.filter((d) => d.id === 'wilderness:energy');
  for (const [index, [species, x, z]] of WOODLAND_ANIMALS.entries()) {
    const p = starterGroundAt(layout, x, z),
      id = `woodland-${species}-${index}`;
    const entity: Entity = {
      id,
      name: species[0]!.toUpperCase() + species.slice(1),
      kind: 'animal',
      ...(species === 'wolf' || species === 'bear' ? { appearance: `${species}-sprite` } : {}),
      spatial: { bodyProfileId: species === 'hare' ? 'hare' : 'deer', heading: 0 },
      placement: worldPlacement(p, p.surfaceId),
      actor: nativeActor(species, world.simTime, energy),
      animal: {
        threatPosition: null,
        threatId: null,
        escapeHeading: null,
        calmRate: 0,
        reviewAt: 0,
        danger: 0,
        wanderSeconds: 120 + index * 7,
      },
    };
    world.entities[id] = entity;
  }
  for (const [
    index,
    [definitionId, name, x, z, quantity, workSeconds],
  ] of WOODLAND_PATCHES.entries()) {
    const p = starterGroundAt(layout, x, z),
      id = `woodland-patch-${index}`;
    world.entities[id] = {
      id,
      name,
      ...(definitionId === 'berries' ? {} : { nameForm: 'plural' as const }),
      kind: 'resource',
      spatial: { bodyProfileId: 'object', heading: 0 },
      placement: worldPlacement(p, p.surfaceId),
      resource: { definitionId, quantity, workSeconds },
    };
  }
}
