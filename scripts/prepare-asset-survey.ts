/**
 * Prepare the October 31, 2026 world asset survey (art-direction/studies/2026-10-31-world-asset-survey).
 *
 *   OPEN_LEGEND_ASSET_WORKSPACE=/absolute/workspace tsx scripts/prepare-asset-survey.ts \
 *     --sources /absolute/sources --catalog apps/client/src/props/art-survey/catalog.json
 *
 * `--sources` holds the study's fetched CC0/CC-BY downloads, one directory per pack with its files
 * (extracted when archived) and download.json provenance. Each selected model becomes one GLB in
 * the external workspace. Geometry, materials and textures are copied unchanged except that
 * external buffers and images are embedded, images larger than 1024 px are reduced to 1024 px
 * (macOS `sips`) so a lineup of MegaKit trim-sheet models fits in GPU memory, Kenney Nature Kit's
 * unlit flag is removed so every family is lit alike, OBJ-only packs are converted with their
 * material colours and textures, Fantasy Creatures' untextured models are given the coat material
 * their Godot scenes apply, and WildMesh's animals stand in the first frame of their standing idle.
 * Models keep their own units; the catalog records the scale that gives each its stated real size.
 * Whole buildings assembled from the Medieval Village MegaKit's modular parts are written the same
 * way, one metre-scale GLB per building.
 * docs/asset-workflow.md#edit-or-generate-art
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  align,
  concat,
  externalDirectory,
  holdPose,
  imageSize,
  measure,
  mime,
  parseGlb,
  writeGlb,
  type Gltf,
} from './model-files.js';

const repository = resolve(import.meta.dirname, '..');
const { values } = parseArgs({
  options: { sources: { type: 'string' }, catalog: { type: 'string' } },
});
if (!values.sources || !values.catalog) throw new Error('Pass --sources DIR and --catalog FILE.');
const sources = resolve(values.sources);
const workspace = externalDirectory(process.env['OPEN_LEGEND_ASSET_WORKSPACE']);
const outputRoot = 'apps/client/src/props/art-survey';

// ---------------------------------------------------------------------------------------------
// Survey plan: style families, subjects and the representative models chosen from each source.

type Family =
  | 'polyhaven'
  | 'megakit'
  | 'creatures'
  | 'wildmesh'
  | 'current'
  | 'kenney'
  | 'lowpoly'
  | 'kaykit'
  | 'engine';
type Axis = 'height' | 'length' | 'max';
interface PlannedItem {
  family: Family;
  /** Pack directory under --sources, or `study:<group>` for an already published study export. */
  pack: string;
  model: string;
  label: string;
  /** Real size in metres along the subject's axis; omitted for published metre-scale studies. */
  metres?: number;
  axis?: Axis;
  /** Shown as "in game now". */
  inGame?: boolean;
  kind?: 'model' | 'surface' | 'ground' | 'water' | 'house' | 'assembly';
  options?: Record<string, string>;
  /** Pieces of `pack` that an assembly places; it is written as one metre-scale model. */
  parts?: readonly PlannedPart[];
  /** File name of the Godot coat material that paints this untextured model (`paintCoat`). */
  coat?: string;
  /** Animation whose first frame the model is shown in instead of its stored pose (`holdPose`). */
  pose?: string;
}
/** One kit piece in an assembled building: metres from the building's ground centre and quarter
 * turns about the vertical axis, each turning the piece's outward face from +Z towards +X. */
interface PlannedPart {
  model: string;
  at: readonly [number, number, number];
  turn: number;
}
interface PlannedSubject {
  id: string;
  category: 'objects' | 'environment' | 'animals' | 'buildings';
  label: string;
  note: string;
  axis: Axis;
  items: PlannedItem[];
}

const families = [
  {
    id: 'polyhaven',
    label: 'Photo-scanned',
    source: 'Poly Haven (CC0), including OpenLegend’s simplified versions',
    status: 'direction',
    note: 'Scanned real objects with physically based textures. Poly Haven is the endorsed starting point for natural objects and materials.',
  },
  {
    id: 'megakit',
    label: 'Stylized textured',
    source: 'Quaternius MegaKits (CC0), including the canopy trees',
    status: 'direction',
    note: 'Painted-looking textures on softened, believable shapes. Mike liked these trees on October 31, 2026.',
  },
  {
    id: 'creatures',
    label: 'Fantasy Creatures',
    source: 'Fantasy Creatures by Daniel Gruginski (CC0), built by AI-written Blender scripts',
    status: 'candidate',
    note: 'Rigged animals with natural proportions and painted coats, each in its default coat. Found on November 3, 2026 as a free candidate for the direction’s animals.',
  },
  {
    id: 'wildmesh',
    label: 'WildMesh 3D',
    source: 'WildMesh 3D’s free animated animals on Sketchfab (CC BY 4.0)',
    status: 'candidate',
    note: 'Rigged wild animals with painted coats and no shine, as Sketchfab exports them, each standing in the first frame of its idle. Added on November 3, 2026 as a free candidate for the direction’s animals; their creator calls them older versions with known rigging problems.',
  },
  {
    id: 'current',
    label: 'Current game picks',
    source: 'Mixed community and generated sources curated by OpenLegend',
    status: 'current',
    note: 'Models the game uses now that do not belong to one of the other families.',
  },
  {
    id: 'kenney',
    label: 'Clean low-poly',
    source: 'Kenney (CC0)',
    status: 'outside',
    note: 'Flat colours and simple geometric forms. Outside the current direction, which rejects a visibly low-poly look.',
  },
  {
    id: 'lowpoly',
    label: 'Classic low-poly',
    source: 'Quaternius classic packs and community models (CC0)',
    status: 'outside',
    note: 'Faceted flat-shaded forms. Outside the current direction, which rejects a visibly low-poly look.',
  },
  {
    id: 'kaykit',
    label: 'Chunky toy',
    source: 'KayKit by Kay Lousberg (CC0)',
    status: 'rejected',
    note: 'Rounded toy-like forms on a shared gradient atlas. Mike rejected this style on October 16, 2026; shown only as a reference point.',
  },
  {
    id: 'engine',
    label: 'Engine-drawn',
    source: 'OpenLegend shaders and procedural ground',
    status: 'current',
    note: 'Surfaces the renderer draws itself rather than loading a model.',
  },
] as const;

const categories = [
  { id: 'objects', label: 'Objects' },
  { id: 'environment', label: 'Environment' },
  { id: 'animals', label: 'Animals' },
  { id: 'buildings', label: 'Buildings' },
] as const;

const ph = (model: string, label: string, metres: number, axis?: Axis): PlannedItem => ({
  family: 'polyhaven',
  pack: 'polyhaven/' + model,
  model: model + '_1k',
  label,
  metres,
  axis,
});
const pack =
  (family: Family, prefix: string) =>
  (name: string, model: string, label: string, metres: number, axis?: Axis): PlannedItem => ({
    family,
    pack: prefix + name,
    model,
    label,
    metres,
    axis,
  });
const mk = pack('megakit', 'quaternius-');
const kn = pack('kenney', 'kenney-');
const lp = pack('lowpoly', 'quaternius-');
const kk = pack('kaykit', 'kaykit-');
/** A Fantasy Creatures model in one of the coats its Godot scene chooses from; the survey shows
 * each creature's default, the first coat its scene lists. */
const fc = (
  model: string,
  coat: string,
  label: string,
  metres: number,
  axis?: Axis,
): PlannedItem => ({
  family: 'creatures',
  pack: 'algumacoisaqq-fantasy-creatures',
  model,
  label,
  metres,
  axis,
  coat: `M_${model}_${coat}.tres`,
});
/** One of WildMesh 3D's Sketchfab models; each is its own download, credited to its own page.
 * Their stored poses are frames of other clips (the bighorn's folds its legs under it and the
 * pronghorn's is mid-stride), so each is shown standing, as its creator's previews show it. */
const wm = (name: string, label: string, metres: number): PlannedItem => ({
  family: 'wildmesh',
  pack: `wildmesh-${name}`,
  model: `${name}_animated_cel_shading_3d_model`,
  label,
  metres,
  pose: 'Stand_Breathing_01',
});
const study = (
  family: Family,
  group: string,
  model: string,
  label: string,
  inGame = false,
): PlannedItem => ({ family, pack: 'study:' + group, model, label, inGame });
const surface = (model: string, label: string): PlannedItem => ({
  family: 'polyhaven',
  pack: 'polyhaven/' + model,
  model,
  label,
  kind: 'surface',
});

// Whole buildings assembled from the Medieval Village MegaKit, which ships only parts on a 2 m
// grid: walls 2 m wide in 3 m storeys with their outer face towards +Z, doors, windows and
// shutters placed from their wall's origin, and roofs and gable ends resting on the wall tops.
type Side = 'front' | 'right' | 'back' | 'left';
const sideTurns: Record<Side, number> = { front: 0, right: 1, back: 2, left: 3 };
/** A piece-local offset after quarter turns about +Y. */
const turned = ([x, y, z]: readonly number[], turn: number): [number, number, number] =>
  [
    [x!, y!, z!],
    [z!, y!, -x!],
    [-x!, y!, -z!],
    [-z!, y!, x!],
  ][((turn % 4) + 4) % 4] as [number, number, number];
/** Parts of a building `width` × `depth` grid cells (2 m each) across X and Z, front at +Z. */
function villageBuilding(width: number, depth: number) {
  const parts: PlannedPart[] = [];
  const put = (model: string, at: readonly [number, number, number], turn = 0) => {
    parts.push({ model, at, turn });
  };
  /** Centre and outward turn of a wall section, counted left to right as seen from outside. */
  const section = (side: Side, index: number, y: number) => {
    const turn = sideTurns[side];
    const along = [width, depth, width, depth][turn]! - 1 - 2 * index;
    const at: [number, number, number] = [
      [-along, y, depth],
      [width, y, along],
      [along, y, -depth],
      [-width, y, -along],
    ][turn] as [number, number, number];
    return { at, turn };
  };
  return {
    parts,
    put,
    /** One storey of wall sections, left to right from outside, and its corner posts; a post
     * that wraps the outside of its corner turns with it, starting at the front left. */
    storey(y: number, walls: Record<Side, readonly string[]>, corner: string) {
      for (const side of Object.keys(sideTurns) as Side[]) {
        // A short or long side would leave a gap or overlap the next side's sections.
        if (walls[side].length !== (sideTurns[side] % 2 ? depth : width))
          throw new Error(`The ${side} wall needs one section per grid cell.`);
        walls[side].forEach((model, index) => {
          const { at, turn } = section(side, index, y);
          put(model, at, turn);
        });
      }
      put(corner, [-width, y, depth], 0);
      put(corner, [width, y, depth], 1);
      put(corner, [width, y, -depth], 2);
      put(corner, [-width, y, -depth], 3);
    },
    /** A piece in a wall section's own frame, such as a door, window, shutters or balcony. */
    fit(side: Side, index: number, y: number, model: string, offset = [0, 0, 0], turn = 0) {
      const wall = section(side, index, y);
      const [x, up, z] = turned(offset, wall.turn);
      put(model, [wall.at[0] + x, wall.at[1] + up, wall.at[2] + z], wall.turn + turn);
    },
    floor(y: number, model: string) {
      for (let x = 0; x < width; x++)
        for (let z = 0; z < depth; z++) put(model, [-width + 1 + 2 * x, y, -depth + 1 + 2 * z]);
    },
  };
}
const villageKit = 'quaternius-medieval-village-megakit';
/** Places a door leaf, hinged at its own origin, in the middle of its wall opening. */
const doorOffset = [-0.53, 0, -0.1];
function villageBuildings(): PlannedItem[] {
  const assembled = (model: string, label: string, parts: readonly PlannedPart[]): PlannedItem => ({
    family: 'megakit',
    pack: villageKit,
    model,
    label,
    kind: 'assembly',
    parts,
  });

  const cottage = villageBuilding(2, 3);
  cottage.storey(
    0,
    {
      front: ['Wall_Plaster_Door_Round', 'Wall_Plaster_Window_Wide_Round'],
      right: ['Wall_Plaster_Straight', 'Wall_Plaster_Window_Wide_Flat', 'Wall_Plaster_Straight'],
      back: ['Wall_Plaster_Straight', 'Wall_Plaster_Straight'],
      left: ['Wall_Plaster_Straight', 'Wall_Plaster_Window_Wide_Flat', 'Wall_Plaster_Straight'],
    },
    'Corner_Exterior_Wood',
  );
  cottage.fit('front', 0, 0, 'Door_1_Round', doorOffset);
  // Open shutters are wider than a section; beside a corner they would stick out past its post.
  cottage.fit('front', 1, 0, 'Window_Wide_Round1');
  for (const side of ['right', 'left'] as const) {
    cottage.fit(side, 1, 0, 'Window_Wide_Flat1');
    cottage.fit(side, 1, 0, 'WindowShutters_Wide_Flat_Open');
  }
  cottage.floor(0.02, 'Floor_WoodDark');
  cottage.put('Roof_RoundTiles_4x6', [0, 3, 0]);
  cottage.put('Roof_Front_Brick4', [0, 3, 3]);
  cottage.put('Roof_Front_Brick4', [0, 3, -3], 2);
  cottage.put('Prop_Chimney2', [1, 4, -1.5]);

  const timbered = villageBuilding(2, 3);
  timbered.storey(
    0,
    {
      front: ['Wall_UnevenBrick_Door_Round', 'Wall_UnevenBrick_Window_Wide_Round'],
      right: [
        'Wall_UnevenBrick_Straight',
        'Wall_UnevenBrick_Window_Thin_Round',
        'Wall_UnevenBrick_Straight',
      ],
      back: ['Wall_UnevenBrick_Straight', 'Wall_UnevenBrick_Straight'],
      left: [
        'Wall_UnevenBrick_Straight',
        'Wall_UnevenBrick_Window_Thin_Round',
        'Wall_UnevenBrick_Straight',
      ],
    },
    'Corner_Exterior_Brick',
  );
  timbered.storey(
    3,
    {
      front: ['Wall_Plaster_Window_Wide_Flat2', 'Wall_Plaster_Window_Wide_Flat2'],
      right: ['Wall_Plaster_WoodGrid', 'Wall_Plaster_Window_Thin_Round', 'Wall_Plaster_WoodGrid'],
      back: ['Wall_Plaster_WoodGrid', 'Wall_Plaster_WoodGrid'],
      left: ['Wall_Plaster_WoodGrid', 'Wall_Plaster_Window_Thin_Round', 'Wall_Plaster_WoodGrid'],
    },
    'Corner_Exterior_Wood',
  );
  timbered.fit('front', 0, 0, 'Door_2_Round', doorOffset);
  timbered.fit('front', 1, 0, 'Window_Wide_Round1');
  timbered.fit('front', 1, 0, 'WindowShutters_Wide_Round_Closed');
  for (const side of ['right', 'left'] as const) {
    timbered.fit(side, 1, 0, 'Window_Thin_Round1');
    timbered.fit(side, 1, 3, 'Window_Thin_Round1');
    timbered.fit(side, 1, 3, 'WindowShutters_Thin_Round_Open');
  }
  timbered.fit('front', 0, 3, 'Window_Wide_Flat1');
  timbered.fit('front', 1, 3, 'Window_Wide_Flat1');
  timbered.floor(0.02, 'Floor_WoodDark');
  timbered.floor(3, 'Floor_WoodDark');
  timbered.put('Roof_RoundTiles_4x6', [0, 6, 0]);
  timbered.put('Roof_Front_Brick4', [0, 6, 3]);
  timbered.put('Roof_Front_Brick4', [0, 6, -3], 2);
  timbered.put('Prop_Chimney', [-1, 7, 1.5]);

  const townhouse = villageBuilding(3, 4);
  townhouse.storey(
    0,
    {
      front: [
        'Wall_Plaster_Window_Wide_Flat',
        'Wall_Plaster_Door_Flat',
        'Wall_Plaster_Window_Wide_Flat',
      ],
      right: [
        'Wall_Plaster_Straight',
        'Wall_Plaster_Window_Wide_Round',
        'Wall_Plaster_Window_Wide_Round',
        'Wall_Plaster_Straight',
      ],
      back: ['Wall_Plaster_Straight', 'Wall_Plaster_Door_Flat', 'Wall_Plaster_Straight'],
      left: [
        'Wall_Plaster_Straight',
        'Wall_Plaster_Window_Wide_Round',
        'Wall_Plaster_Window_Wide_Round',
        'Wall_Plaster_Straight',
      ],
    },
    'Corner_Exterior_Wood',
  );
  townhouse.storey(
    3,
    {
      front: ['Wall_Plaster_WoodGrid', 'Wall_Plaster_Door_Flat', 'Wall_Plaster_WoodGrid'],
      right: [
        'Wall_Plaster_WoodGrid',
        'Wall_Plaster_Window_Thin_Round',
        'Wall_Plaster_Window_Thin_Round',
        'Wall_Plaster_WoodGrid',
      ],
      back: ['Wall_Plaster_WoodGrid', 'Wall_Plaster_Window_Wide_Flat2', 'Wall_Plaster_WoodGrid'],
      left: [
        'Wall_Plaster_WoodGrid',
        'Wall_Plaster_Window_Thin_Round',
        'Wall_Plaster_Window_Thin_Round',
        'Wall_Plaster_WoodGrid',
      ],
    },
    'Corner_Exterior_Wood',
  );
  townhouse.fit('front', 1, 0, 'Door_4_Flat', doorOffset);
  townhouse.fit('back', 1, 0, 'Door_1_Flat', doorOffset);
  townhouse.fit('front', 1, 3, 'Door_1_Flat', doorOffset);
  for (const index of [0, 2]) {
    townhouse.fit('front', index, 0, 'Window_Wide_Flat1');
    townhouse.fit('front', index, 0, 'WindowShutters_Wide_Flat_Open');
  }
  townhouse.fit('back', 1, 3, 'Window_Wide_Flat1');
  for (const side of ['right', 'left'] as const)
    for (const index of [1, 2]) {
      townhouse.fit(side, index, 0, 'Window_Wide_Round1');
      townhouse.fit(side, index, 3, 'Window_Thin_Round1');
    }
  // A balcony one floor tile deep in front of the upper door, braced from the wall below.
  townhouse.fit('front', 1, 3, 'Floor_WoodDark', [0, 0, 1]);
  townhouse.fit('front', 1, 3, 'Balcony_Simple_Straight', [0, 0, 1]);
  townhouse.fit('front', 1, 3, 'Balcony_Simple_Straight', [0, 0, 1], 1);
  townhouse.fit('front', 1, 3, 'Balcony_Simple_Straight', [0, 0, 1], 3);
  townhouse.fit('front', 1, 0, 'Prop_Support', [-0.8, 0, 0]);
  townhouse.fit('front', 1, 0, 'Prop_Support', [0.8, 0, 0]);
  townhouse.floor(0.02, 'Floor_WoodDark');
  townhouse.floor(3, 'Floor_WoodDark');
  townhouse.put('Roof_RoundTiles_6x8', [0, 6, 0]);
  townhouse.put('Roof_Front_Brick6', [0, 6, 4]);
  townhouse.put('Roof_Front_Brick6', [0, 6, -4], 2);
  townhouse.put('Prop_Chimney', [-1.5, 7.5, -2]);

  const tower = villageBuilding(2, 2);
  const brick = 'Wall_UnevenBrick_Straight';
  const slit = 'Wall_UnevenBrick_Window_Thin_Round';
  tower.storey(
    0,
    {
      front: ['Wall_UnevenBrick_Door_Round', brick],
      right: [brick, brick],
      back: [brick, brick],
      left: [brick, brick],
    },
    'Corner_Exterior_Brick',
  );
  tower.storey(
    3,
    { front: [brick, slit], right: [slit, brick], back: [brick, slit], left: [slit, brick] },
    'Corner_Exterior_Brick',
  );
  tower.storey(
    6,
    { front: [slit, slit], right: [slit, slit], back: [slit, slit], left: [slit, slit] },
    'Corner_Exterior_Brick',
  );
  tower.fit('front', 0, 0, 'Door_8_Round', doorOffset);
  for (const [y, sections] of [
    [3, { front: [1], right: [0], back: [1], left: [0] }],
    [6, { front: [0, 1], right: [0, 1], back: [0, 1], left: [0, 1] }],
  ] as const)
    for (const side of Object.keys(sections) as Side[])
      for (const index of sections[side]) tower.fit(side, index, y, 'Window_Thin_Round1');
  tower.floor(0.02, 'Floor_WoodDark');
  tower.floor(3, 'Floor_WoodDark');
  tower.floor(6, 'Floor_WoodDark');
  tower.put('Roof_Tower_RoundTiles', [0, 9, 0]);

  return [
    assembled('assembled-plaster-cottage', 'Plaster cottage', cottage.parts),
    assembled('assembled-timbered-house', 'Timber-framed house', timbered.parts),
    assembled('assembled-townhouse', 'Townhouse with balcony', townhouse.parts),
    assembled('assembled-tower', 'Stone tower', tower.parts),
  ];
}

const subjects: PlannedSubject[] = [
  {
    id: 'blades',
    category: 'objects',
    label: 'Swords and knives',
    note: 'Blades at real length.',
    axis: 'max',
    items: [
      ph('antique_estoc', 'Estoc', 1.15),
      ph('ornate_medieval_dagger', 'Ornate dagger', 0.4),
      ph('machete', 'Machete', 0.65),
      ph('wooden_handle_saber', 'Saber', 0.95),
      study(
        'polyhaven',
        'source-natural-sword',
        'natural-sword-clear',
        'Sword (simplified scan)',
        true,
      ),
      study(
        'polyhaven',
        'source-natural-knife',
        'natural-knife-clear',
        'Knife (simplified scan)',
        true,
      ),
      mk('fantasy-props-megakit', 'Sword_Bronze', 'Bronze sword', 0.95),
      kn('mini-dungeon', 'weapon-sword', 'Sword', 0.95),
      lp('medieval-weapons', 'Sword', 'Sword', 0.95),
      lp('medieval-weapons', 'Claymore', 'Claymore', 1.3),
      lp('medieval-weapons', 'Dagger', 'Dagger', 0.4),
      study('lowpoly', 'source-equipment', 'sword-broad-tip', 'Broad-tip sword (repainted)'),
      kk('adventures', 'sword_1handed', 'One-handed sword', 0.9),
      kk('adventures', 'sword_2handed', 'Two-handed sword', 1.3),
      kk('adventures', 'dagger', 'Dagger', 0.4),
    ],
  },
  {
    id: 'axes',
    category: 'objects',
    label: 'Axes, hammers and maces',
    note: 'Hafted tools and weapons.',
    axis: 'max',
    items: [
      ph('wooden_axe', 'Felling axe', 0.8),
      ph('hatchet', 'Hatchet', 0.45),
      ph('ornate_medieval_mace', 'Mace', 0.8),
      ph('ornate_war_hammer', 'War hammer', 0.9),
      ph('sledgehammer_01', 'Sledgehammer', 0.9),
      ph('wooden_hammer_01', 'Mallet', 0.35),
      mk('fantasy-props-megakit', 'Axe_Bronze', 'Bronze axe', 0.8),
      kn('survival-kit', 'tool-axe', 'Axe', 0.75),
      kn('survival-kit', 'tool-hammer', 'Hammer', 0.35),
      lp('medieval-weapons', 'Axe', 'Axe', 0.8),
      lp('medieval-weapons', 'Axe_Double', 'Double axe', 1.0),
      lp('medieval-weapons', 'Hammer_Small', 'Hammer', 0.5),
      kk('adventures', 'axe_1handed', 'One-handed axe', 0.75),
      kk('adventures', 'axe_2handed', 'Two-handed axe', 1.1),
    ],
  },
  {
    id: 'ranged',
    category: 'objects',
    label: 'Bows, arrows, spears and staffs',
    note: 'Long weapons at real length.',
    axis: 'max',
    items: [
      study('current', 'source-natural-bow', 'natural-bow-clear', 'Bow (in game)', true),
      study('current', 'source-natural-arrow', 'natural-arrow-clear', 'Arrow (in game)', true),
      study('lowpoly', 'source-equipment', 'bow-curved-limbs', 'Curved bow (repainted)'),
      kn('mini-dungeon', 'weapon-spear', 'Spear', 1.9),
      lp('medieval-weapons', 'Bow_Wooden', 'Bow', 1.5),
      lp('medieval-weapons', 'Spear', 'Spear', 2.0),
      lp('medieval-weapons', 'Arrow', 'Arrow', 0.75),
      kk('adventures', 'crossbow_2handed', 'Crossbow', 0.9),
      kk('adventures', 'staff', 'Staff', 1.7),
      kk('adventures', 'quiver', 'Quiver', 0.6),
      kk('adventures', 'arrow_bundle', 'Arrow bundle', 0.75),
    ],
  },
  {
    id: 'shields',
    category: 'objects',
    label: 'Shields and armour',
    note: 'Shields upright; armour as a standing piece.',
    axis: 'max',
    items: [
      ph('kite_shield', 'Kite shield', 1.0),
      study(
        'polyhaven',
        'source-natural-shield',
        'natural-shield-clear',
        'Kite shield (simplified scan)',
        true,
      ),
      mk('fantasy-props-megakit', 'Shield_Wooden', 'Wooden shield', 0.75),
      kn('mini-dungeon', 'shield-round', 'Round shield', 0.7),
      kn('mini-dungeon', 'shield-rectangle', 'Tower shield', 0.9),
      lp('medieval-weapons', 'Shield_Round', 'Round shield', 0.75),
      lp('medieval-weapons', 'Shield_Heater', 'Heater shield', 0.85),
      study('lowpoly', 'source-equipment', 'shield-heater', 'Heater shield (repainted)'),
      lp('rpg-items', 'Armor_Leather', 'Leather armour', 0.7),
      lp('rpg-items', 'Armor_Metal', 'Plate armour', 0.7),
      kk('adventures', 'shield_round', 'Round shield', 0.75),
      kk('adventures', 'shield_badge', 'Badge shield', 0.8),
      kk('adventures', 'shield_square', 'Square shield', 0.85),
    ],
  },
  {
    id: 'tools',
    category: 'objects',
    label: 'Tools',
    note: 'Work tools for gathering, digging and building.',
    axis: 'max',
    items: [
      ph('rusted_spade_01', 'Spade', 1.1),
      ph('picke_dirty_01', 'Pickaxe', 0.9),
      ph('handsaw_wood', 'Handsaw', 0.6),
      ph('trowel_01', 'Trowel', 0.3),
      ph('wooden_broom', 'Broom', 1.4),
      ph('wooden_ladder', 'Ladder', 2.5),
      ph('watering_can_metal_01', 'Watering can', 0.45),
      mk('fantasy-props-megakit', 'Pickaxe_Bronze', 'Pickaxe', 0.9),
      mk('fantasy-props-megakit', 'Anvil', 'Anvil', 0.6, 'height'),
      mk('fantasy-props-megakit', 'Whetstone', 'Whetstone', 0.6),
      mk('fantasy-props-megakit', 'Bucket_Wooden_1', 'Bucket', 0.35, 'height'),
      study(
        'kenney',
        'source-small-equipment',
        'stone-tool-broad-flake',
        'Stone flake (repainted)',
        true,
      ),
      study(
        'current',
        'source-small-equipment',
        'cord-loose-coil',
        'Cord (OpenLegend authored)',
        true,
      ),
      kn('survival-kit', 'tool-pickaxe', 'Pickaxe', 0.9),
      kn('survival-kit', 'tool-shovel', 'Shovel', 1.1),
      kn('survival-kit', 'tool-hoe', 'Hoe', 1.3),
      kn('survival-kit', 'workbench-anvil', 'Anvil bench', 0.9, 'height'),
      lp('survival', 'Shovel', 'Shovel', 1.1),
      lp('medieval-weapons', 'Scythe', 'Scythe', 1.6),
      lp('survival', 'Pan', 'Pan', 0.45),
      kk('hexagon', 'wheelbarrow', 'Wheelbarrow', 1.4, 'length'),
      kk('hexagon', 'bucket_empty', 'Bucket', 0.35, 'height'),
    ],
  },
  {
    id: 'containers',
    category: 'objects',
    label: 'Crates, barrels, chests and sacks',
    note: 'Storage at real height.',
    axis: 'height',
    items: [
      ph('Barrel_01', 'Barrel', 0.9),
      ph('wooden_barrels_01', 'Barrels', 1.0),
      ph('wooden_crate_02', 'Crate', 0.6),
      ph('wooden_bucket_01', 'Bucket', 0.35),
      ph('wicker_basket_01', 'Wicker basket', 0.35),
      ph('ceramic_vase_01', 'Ceramic jar', 0.45),
      ph('jug_01', 'Jug', 0.3),
      ph('CheeseBox_01', 'Cheese box', 0.15),
      study(
        'polyhaven',
        'source-grounded-chest',
        'grounded-chest-clear',
        'Treasure chest (simplified scan)',
      ),
      mk('fantasy-props-megakit', 'Barrel', 'Barrel', 0.9),
      mk('fantasy-props-megakit', 'Crate_Wooden', 'Crate', 0.6),
      mk('fantasy-props-megakit', 'Chest_Wood', 'Chest', 0.55),
      mk('fantasy-props-megakit', 'Bag', 'Sack', 0.5),
      mk('fantasy-props-megakit', 'Pouch_Large', 'Pouch', 0.3),
      mk('fantasy-props-megakit', 'FarmCrate_Apple', 'Apple crate', 0.45),
      mk('fantasy-props-megakit', 'Vase_2', 'Vase', 0.5),
      study('current', 'source-chests', 'chest-carved-lid', 'Carved chest (game default)', true),
      study('kenney', 'source-chests', 'chest-banded-lid', 'Banded chest (repainted)'),
      study(
        'kenney',
        'source-resources',
        'supplies-stave-barrel',
        'Stave barrel (repainted)',
        true,
      ),
      study('kenney', 'source-resources', 'supplies-open-box', 'Open box (repainted)', true),
      kn('survival-kit', 'barrel', 'Barrel', 0.9),
      kn('survival-kit', 'box-large', 'Crate', 0.6),
      kn('survival-kit', 'chest', 'Chest', 0.55),
      kn('pirate-kit', 'crate', 'Crate', 0.6),
      lp('medieval-village-2020', 'Barrel', 'Barrel', 0.9),
      lp('medieval-village-2020', 'Crate', 'Crate', 0.6),
      lp('medieval-village-2020', 'Bag', 'Sack', 0.5),
      lp('rpg-items', 'Chest_Closed', 'Chest', 0.55),
      kk('dungeon', 'barrel_large', 'Barrel', 0.9),
      kk('dungeon', 'box_large', 'Crate', 0.6),
      kk('dungeon', 'chest', 'Chest', 0.55),
      kk('dungeon', 'trunk_medium_A', 'Trunk', 0.5),
    ],
  },
  {
    id: 'furniture',
    category: 'objects',
    label: 'Tables, chairs, beds and shelves',
    note: 'Furniture at real height.',
    axis: 'height',
    items: [
      ph('WoodenChair_01', 'Chair', 0.95),
      ph('wooden_stool_02', 'Stool', 0.5),
      ph('painted_wooden_bench', 'Bench', 0.5),
      ph('WoodenTable_01', 'Table', 0.75),
      ph('round_wooden_table_01', 'Round table', 0.75),
      ph('GothicBed_01', 'Bed', 1.2),
      ph('painted_wooden_shelves', 'Shelves', 1.8),
      ph('GothicCabinet_01', 'Cabinet', 1.6),
      mk('fantasy-props-megakit', 'Table_Large', 'Table', 0.8),
      mk('fantasy-props-megakit', 'Chair_1', 'Chair', 0.95),
      mk('fantasy-props-megakit', 'Stool', 'Stool', 0.5),
      mk('fantasy-props-megakit', 'Bench', 'Bench', 0.5),
      mk('fantasy-props-megakit', 'Bed_Twin1', 'Bed', 1.0),
      mk('fantasy-props-megakit', 'Bookcase_2', 'Bookcase', 2.0),
      mk('fantasy-props-megakit', 'Cabinet', 'Cabinet', 1.6),
      mk('fantasy-props-megakit', 'Workbench', 'Workbench', 0.9),
      study('kenney', 'source-resources', 'workbench-open-bench', 'Workbench (repainted)', true),
      study('kenney', 'source-resources', 'bundle-open-bedroll', 'Bedroll (repainted)', true),
      kn('mini-dungeon', 'table', 'Table', 0.75),
      kn('mini-dungeon', 'chair', 'Chair', 0.95),
      kn('survival-kit', 'workbench', 'Workbench', 0.9),
      lp('modular-dungeon', 'Table_Big', 'Table', 0.8),
      lp('modular-dungeon', 'Chair', 'Chair', 0.95),
      lp('medieval-village-2020', 'Bench_1', 'Bench', 0.5),
      kk('dungeon', 'table_medium', 'Table', 0.8),
      kk('dungeon', 'chair', 'Chair', 0.95),
      kk('dungeon', 'stool', 'Stool', 0.5),
      kk('dungeon', 'bed_frame', 'Bed', 0.6),
      kk('dungeon', 'shelves', 'Shelves', 1.8),
      kk('furniture', 'chair_A_wood', 'Chair', 0.95),
    ],
  },
  {
    id: 'camp',
    category: 'objects',
    label: 'Camp, fire and light',
    note: 'Tents, fires, torches and lamps.',
    axis: 'height',
    items: [
      ph('Lantern_01', 'Lantern', 0.4),
      ph('vintage_oil_lamp', 'Oil lamp', 0.35),
      ph('wooden_candlestick', 'Candlestick', 0.3),
      ph('brass_candleholders', 'Candleholders', 0.3),
      mk('fantasy-props-megakit', 'Torch_Metal', 'Torch', 0.6),
      mk('fantasy-props-megakit', 'Lantern_Wall', 'Wall lantern', 0.5),
      mk('fantasy-props-megakit', 'CandleStick_Triple', 'Candelabra', 0.4),
      mk('fantasy-props-megakit', 'Cauldron', 'Cauldron', 0.6),
      study(
        'kenney',
        'source-resources',
        'shelter-open-awning',
        'Awning shelter (repainted)',
        true,
      ),
      study('kenney', 'source-resources', 'bundle-rolled-wool', 'Rolled wool (repainted)', true),
      study('kenney', 'source-resources', 'marker-single-board', 'Signpost (repainted)', true),
      kn('nature-kit', 'campfire_stones', 'Campfire', 1.0, 'length'),
      kn('nature-kit', 'tent_detailedClosed', 'Tent', 1.6),
      kn('survival-kit', 'campfire-pit', 'Fire pit', 1.0, 'length'),
      kn('survival-kit', 'tent-canvas', 'Canvas tent', 1.8),
      kn('survival-kit', 'bedroll', 'Bedroll', 1.9, 'length'),
      kn('survival-kit', 'signpost', 'Signpost', 1.8),
      lp('survival', 'Tent', 'Tent', 1.8),
      lp('survival', 'Bonfire', 'Bonfire', 1.0, 'length'),
      lp('survival', 'WoodenTorch', 'Torch', 0.6),
      kk('dungeon', 'torch', 'Torch', 0.6),
      kk('dungeon', 'candle_triple', 'Candles', 0.3),
      kk('halloween', 'lantern_standing', 'Lamp post', 1.6),
      kk('hexagon', 'tent', 'Tent', 1.8),
    ],
  },
  {
    id: 'food',
    category: 'objects',
    label: 'Food and drink',
    note: 'Small consumables at real size.',
    axis: 'max',
    items: [
      ph('food_apple_01', 'Apple', 0.08),
      ph('food_pears_asian_01', 'Pears', 0.12),
      ph('croissant', 'Croissant', 0.15),
      ph('yellow_onion', 'Onion', 0.08),
      ph('lemon', 'Lemon', 0.08),
      ph('bananas', 'Bananas', 0.2),
      ph('sweet_potato', 'Sweet potato', 0.2),
      ph('wooden_bowl_01', 'Bowl', 0.2),
      mk('fantasy-props-megakit', 'Carrot', 'Carrot', 0.18),
      mk('fantasy-props-megakit', 'Mug', 'Mug', 0.12),
      mk('fantasy-props-megakit', 'Bottle_1', 'Bottle', 0.3),
      mk('fantasy-props-megakit', 'FarmCrate_Carrot', 'Carrot crate', 0.45),
      kn('food-kit', 'bread', 'Bread', 0.3),
      kn('food-kit', 'cheese', 'Cheese', 0.15),
      kn('food-kit', 'apple', 'Apple', 0.08),
      kn('food-kit', 'fish', 'Fish', 0.4),
      kn('food-kit', 'meat-cooked', 'Roast meat', 0.2),
      kn('food-kit', 'pie', 'Pie', 0.25),
      lp('food', 'Bread', 'Bread', 0.3),
      lp('food', 'ChickenLeg', 'Chicken leg', 0.15),
      lp('food', 'Fish', 'Fish', 0.4),
      lp('food', 'Apple', 'Apple', 0.08),
      lp('food', 'Steak', 'Steak', 0.2),
      lp('food', 'CookingPot_Soup', 'Soup pot', 0.35),
      kk('dungeon', 'plate_food_A', 'Plate of food', 0.3),
      kk('dungeon', 'bottle_A_brown', 'Bottle', 0.3),
      kk('adventures', 'mug_full', 'Mug', 0.12),
    ],
  },
  {
    id: 'trinkets',
    category: 'objects',
    label: 'Coins, keys, books and valuables',
    note: 'Small valuables at real size.',
    axis: 'max',
    items: [
      ph('vintage_pocket_watch', 'Pocket watch', 0.06),
      ph('brass_goblets', 'Goblets', 0.18),
      ph('carved_wooden_plate', 'Carved plate', 0.3),
      ph('wooden_spoon', 'Spoon', 0.25),
      mk('fantasy-props-megakit', 'Coin_Pile', 'Coins', 0.2),
      mk('fantasy-props-megakit', 'Key_Gold', 'Key', 0.12),
      mk('fantasy-props-megakit', 'Book_Stack_1', 'Books', 0.3),
      mk('fantasy-props-megakit', 'Scroll_1', 'Scroll', 0.3),
      mk('fantasy-props-megakit', 'Chalice', 'Chalice', 0.2),
      mk('fantasy-props-megakit', 'Potion_2', 'Potion', 0.2),
      kn('mini-dungeon', 'coin', 'Coin', 0.04),
      kn('mini-dungeon', 'key', 'Key', 0.12),
      kn('mini-dungeon', 'potion', 'Potion', 0.2),
      lp('rpg-items', 'Coin', 'Coin', 0.04),
      lp('rpg-items', 'Key1', 'Key', 0.12),
      lp('rpg-items', 'Book1_Closed', 'Book', 0.25),
      lp('rpg-items', 'Potion1_Filled', 'Potion', 0.2),
      lp('rpg-items', 'Crown', 'Crown', 0.2),
      lp('rpg-items', 'Gold_Ingots', 'Gold ingots', 0.3),
      lp('rpg-items', 'Crystal1', 'Crystal', 0.25),
      kk('dungeon', 'coin_stack_medium', 'Coin stack', 0.15),
      kk('dungeon', 'key', 'Key', 0.12),
      kk('dungeon', 'bottle_A_labeled_green', 'Potion', 0.3),
      kk('adventures', 'spellbook_closed', 'Spellbook', 0.25),
    ],
  },
  {
    id: 'broadleaf',
    category: 'environment',
    label: 'Broadleaf trees',
    note: 'Deciduous trees, about 5–7 m tall.',
    axis: 'height',
    items: [
      study(
        'polyhaven',
        'source-natural-broadleaf',
        'natural-broadleaf-quiet',
        'Broadleaf (simplified scan)',
      ),
      study(
        'polyhaven',
        'source-natural-birch',
        'natural-birch-quiet',
        'Pale-barked tree (simplified scan)',
      ),
      study(
        'megakit',
        'source-nature',
        'broadleaf-sheltered-crown',
        'Broadleaf (canopy, in game)',
        true,
      ),
      study('megakit', 'source-vegetation', 'birch-slender-birch', 'Birch (canopy, in game)', true),
      mk('stylized-nature-megakit', 'CommonTree_1', 'Common tree', 6),
      mk('stylized-nature-megakit', 'CommonTree_3', 'Common tree', 6),
      mk('stylized-nature-megakit', 'TwistedTree_1', 'Twisted tree', 5),
      mk('stylized-nature-megakit', 'TwistedTree_3', 'Twisted tree', 5),
      kn('nature-kit', 'tree_oak', 'Oak', 6),
      kn('nature-kit', 'tree_default', 'Tree', 6),
      kn('nature-kit', 'tree_detailed', 'Detailed tree', 6),
      kn('nature-kit', 'tree_fat', 'Round tree', 5),
      lp('ultimate-nature', 'CommonTree_1', 'Common tree', 6),
      lp('ultimate-nature', 'BirchTree_1', 'Birch', 7),
      lp('ultimate-nature', 'Willow_1', 'Willow', 6),
      lp('textured-trees', 'Tree_1', 'Textured tree', 6),
      lp('textured-trees', 'Birch_1', 'Textured birch', 7),
      kk('hexagon', 'tree_single_A', 'Tree', 5),
      kk('hexagon', 'trees_A_large', 'Tree cluster', 6),
    ],
  },
  {
    id: 'conifers',
    category: 'environment',
    label: 'Conifers',
    note: 'Firs and pines, about 6–8 m tall.',
    axis: 'height',
    items: [
      study(
        'polyhaven',
        'source-grounded-conifer',
        'grounded-conifer-quiet',
        'Fir (simplified scan, in game)',
        true,
      ),
      study('megakit', 'source-vegetation', 'conifer-sheltered-pine', 'Pine (adapted)'),
      mk('stylized-nature-megakit', 'Pine_1', 'Pine', 8),
      mk('stylized-nature-megakit', 'Pine_3', 'Pine', 8),
      kn('nature-kit', 'tree_pineTallA_detailed', 'Tall pine', 8),
      kn('nature-kit', 'tree_pineRoundA', 'Round pine', 6),
      kn('nature-kit', 'tree_cone', 'Cone tree', 6),
      kn('graveyard-kit', 'pine', 'Pine', 7),
      lp('ultimate-nature', 'PineTree_1', 'Pine', 8),
      lp('textured-trees', 'Pine_1', 'Textured pine', 8),
      kk('halloween', 'tree_pine_yellow_large', 'Autumn pine', 7),
      kk('hexagon', 'tree_single_B', 'Pine', 6),
    ],
  },
  {
    id: 'deadwood',
    category: 'environment',
    label: 'Dead trees, stumps and logs',
    note: 'Fallen and standing deadwood.',
    axis: 'height',
    items: [
      ph('dead_tree_trunk', 'Fallen trunk', 3, 'length'),
      ph('dead_tree_trunk_02', 'Fallen trunk', 3, 'length'),
      ph('tree_stump_01', 'Stump', 0.6),
      ph('tree_stump_02', 'Stump', 0.6),
      ph('dry_branches_medium_01', 'Dry branches', 1.5, 'length'),
      study(
        'polyhaven',
        'source-grounded-deadwood',
        'grounded-deadwood-clear',
        'Fallen trunk (simplified scan)',
      ),
      mk('stylized-nature-megakit', 'DeadTree_1', 'Dead tree', 5),
      mk('stylized-nature-megakit', 'DeadTree_3', 'Dead tree', 5),
      study(
        'kenney',
        'source-resources',
        'fallen-wood-fallen-log',
        'Fallen log (repainted, in game)',
        true,
      ),
      study('kenney', 'source-resources', 'fallen-wood-forked-stump', 'Forked stump (repainted)'),
      kn('nature-kit', 'stump_oldTall', 'Stump', 0.8),
      kn('nature-kit', 'log_large', 'Log', 3, 'length'),
      kn('nature-kit', 'log_stack', 'Log stack', 0.8),
      lp('ultimate-nature', 'CommonTree_Dead_1', 'Dead tree', 6),
      lp('ultimate-nature', 'TreeStump_Moss', 'Mossy stump', 0.6),
      lp('ultimate-nature', 'WoodLog_Moss', 'Mossy log', 3, 'length'),
      lp('textured-trees', 'DeadTree_1', 'Textured dead tree', 6),
      kk('halloween', 'tree_dead_large', 'Dead tree', 5),
      kk('hexagon', 'tree_single_A_cut', 'Stump', 0.6),
    ],
  },
  {
    id: 'bushes',
    category: 'environment',
    label: 'Bushes and shrubs',
    note: 'Shrubs about 1 m tall.',
    axis: 'height',
    items: [
      ph('shrub_02', 'Shrub', 1.0),
      ph('shrub_03', 'Shrub', 0.8),
      ph('shrub_04', 'Shrub', 1.2),
      study('polyhaven', 'source-natural-shrub', 'natural-shrub-quiet', 'Shrub (simplified scan)'),
      study(
        'polyhaven',
        'source-rooted-berries',
        'rooted-berries-quiet',
        'Berry bush (simplified scan, in game)',
        true,
      ),
      study(
        'megakit',
        'source-vegetation',
        'shrub-rounded-thicket',
        'Shrub (canopy, in game)',
        true,
      ),
      mk('stylized-nature-megakit', 'Bush_Common', 'Bush', 1.2),
      mk('stylized-nature-megakit', 'Bush_Common_Flowers', 'Flowering bush', 1.2),
      mk('stylized-nature-megakit', 'Plant_7_Big', 'Broad plant', 0.8),
      kn('nature-kit', 'plant_bushDetailed', 'Bush', 1.0),
      kn('nature-kit', 'plant_bushLarge', 'Large bush', 1.2),
      kn('fantasy-town-kit', 'hedge', 'Hedge', 1.2),
      lp('ultimate-nature', 'Bush_1', 'Bush', 1.0),
      lp('ultimate-nature', 'BushBerries_1', 'Berry bush', 1.0),
    ],
  },
  {
    id: 'groundcover',
    category: 'environment',
    label: 'Grass, flowers, ferns and mushrooms',
    note: 'Ground plants at real height.',
    axis: 'height',
    items: [
      ph('fern_02', 'Fern', 0.6),
      ph('nettle_plant', 'Nettle', 0.7),
      ph('weed_plant_02', 'Weed', 0.4),
      ph('dandelion_01', 'Dandelion', 0.3),
      study('polyhaven', 'source-natural-grass', 'natural-grass-quiet', 'Grass (simplified scan)'),
      study('polyhaven', 'source-grounded-fern', 'grounded-fern-clear', 'Fern (simplified scan)'),
      study(
        'polyhaven',
        'source-natural-reeds',
        'natural-reeds-clear',
        'Reeds (simplified scan, in game)',
        true,
      ),
      study(
        'polyhaven',
        'source-natural-dry-fiber',
        'natural-dry-fiber-clear',
        'Dry grass (simplified scan, in game)',
        true,
      ),
      study(
        'megakit',
        'source-vegetation',
        'grass-broad-tuft',
        'Grass tuft (canopy, in game)',
        true,
      ),
      mk('stylized-nature-megakit', 'Grass_Common_Tall', 'Tall grass', 0.5),
      mk('stylized-nature-megakit', 'Grass_Wispy_Tall', 'Wispy grass', 0.6),
      mk('stylized-nature-megakit', 'Fern_1', 'Fern', 0.6),
      mk('stylized-nature-megakit', 'Flower_3_Group', 'Flowers', 0.35),
      mk('stylized-nature-megakit', 'Flower_4_Group', 'Flowers', 0.35),
      mk('stylized-nature-megakit', 'Mushroom_Common', 'Mushroom', 0.15),
      mk('stylized-nature-megakit', 'Clover_1', 'Clover', 0.12),
      kn('nature-kit', 'grass_large', 'Grass', 0.4),
      kn('nature-kit', 'flower_redA', 'Flower', 0.35),
      kn('nature-kit', 'flower_purpleA', 'Flower', 0.35),
      kn('nature-kit', 'mushroom_redGroup', 'Mushrooms', 0.15),
      kn('nature-kit', 'plant_flatTall', 'Plant', 0.4),
      lp('ultimate-nature', 'Grass', 'Grass', 0.4),
      lp('ultimate-nature', 'Flowers', 'Flowers', 0.35),
      lp('ultimate-nature', 'Plant_2', 'Plant', 0.5),
      kk('hexagon', 'waterplant_A', 'Water plant', 0.4),
    ],
  },
  {
    id: 'rocks',
    category: 'environment',
    label: 'Rocks, boulders and cliffs',
    note: 'Stones from pebbles to cliff faces.',
    axis: 'height',
    items: [
      ph('rock_moss_set_01', 'Mossy rocks', 1.5, 'length'),
      ph('boulder_01', 'Boulder', 1.5),
      ph('rock_07', 'Rock', 1.0),
      ph('stone_01', 'Stone', 0.6, 'length'),
      ph('namaqualand_boulder_02', 'Granite boulder', 2.0),
      ph('rock_face_01', 'Rock face', 4.0),
      study(
        'polyhaven',
        'source-grounded-boulder',
        'grounded-boulder-quiet',
        'Boulder (simplified scan)',
      ),
      study(
        'megakit',
        'source-vegetation',
        'rock-rounded-shoulder',
        'Rock (canopy, in game)',
        true,
      ),
      mk('stylized-nature-megakit', 'Rock_Medium_1', 'Rock', 1.0),
      mk('stylized-nature-megakit', 'Rock_Medium_3', 'Rock', 1.0),
      mk('stylized-nature-megakit', 'RockPath_Round_Wide', 'Stepping stones', 1.2, 'length'),
      study(
        'kenney',
        'source-resources',
        'river-stones-loose-stones',
        'River stones (repainted, in game)',
        true,
      ),
      kn('nature-kit', 'rock_largeA', 'Rock', 1.2),
      kn('nature-kit', 'rock_tallB', 'Tall rock', 1.5),
      kn('nature-kit', 'stone_largeC', 'Stone', 1.0),
      kn('nature-kit', 'cliff_block_rock', 'Cliff block', 3.0),
      lp('ultimate-nature', 'Rock_1', 'Rock', 1.0),
      lp('ultimate-nature', 'Rock_Moss_2', 'Mossy rock', 1.0),
      lp('medieval-village-2020', 'Rock_1', 'Rock', 1.0),
      kk('hexagon', 'rock_single_A', 'Rock', 1.0),
      kk('hexagon', 'rock_single_C', 'Rock', 1.0),
    ],
  },
  {
    id: 'terrain',
    category: 'environment',
    label: 'Ground surfaces',
    note: 'Ground textures and tiles as 2.5 m swatches.',
    axis: 'length',
    items: [
      surface('forest_leaves_02', 'Leaf litter'),
      surface('forest_ground_04', 'Forest floor'),
      surface('brown_mud_leaves_01', 'Muddy leaves'),
      surface('aerial_grass_rock', 'Grass and rock'),
      surface('grass_path_2', 'Grass path'),
      surface('rocky_trail_02', 'Rocky trail'),
      surface('gravel_road', 'Gravel'),
      surface('coast_sand_01', 'Sand'),
      surface('snow_02', 'Snow'),
      ...(['understory', 'woodland', 'meadow'] as const).map(
        (palette): PlannedItem => ({
          family: 'engine',
          pack: 'engine',
          model: 'ground-' + palette,
          label: `Game ground · ${palette}${palette === 'understory' ? ' (in game)' : ''}`,
          kind: 'ground',
          inGame: palette === 'understory',
          options: { palette },
        }),
      ),
      mk('stylized-nature-megakit', 'RockPath_Square_Wide', 'Stone path', 2.5, 'length'),
      kn('nature-kit', 'ground_grass', 'Grass tile', 2.5, 'length'),
      kn('nature-kit', 'ground_pathTile', 'Path tile', 2.5, 'length'),
      kn('hexagon-kit', 'grass', 'Grass hex', 2.5, 'length'),
      kn('hexagon-kit', 'dirt', 'Dirt hex', 2.5, 'length'),
      kn('hexagon-kit', 'sand', 'Sand hex', 2.5, 'length'),
      kn('hexagon-kit', 'stone', 'Stone hex', 2.5, 'length'),
      lp('medieval-village-2020', 'Path_Square', 'Path', 2.5, 'length'),
      kk('dungeon', 'floor_dirt_large', 'Dirt floor', 2.5, 'length'),
      kk('hexagon', 'hex_grass', 'Grass hex', 2.5, 'length'),
      kk('hexagon', 'hex_road_A', 'Road hex', 2.5, 'length'),
    ],
  },
  {
    id: 'water',
    category: 'environment',
    label: 'Water',
    note: 'Water surfaces drawn by the renderer, and kit water tiles.',
    axis: 'length',
    items: [
      ...(
        [
          ['clear', 'Clear stream (animated ripples)'],
          ['dark', 'Dark woodland pond (reflective)'],
          ['painted', 'Painted flat water (soft bands)'],
        ] as const
      ).map(
        ([style, label]): PlannedItem => ({
          family: 'engine',
          pack: 'engine',
          model: 'water-' + style,
          label,
          kind: 'water',
          options: { style },
        }),
      ),
      kn('nature-kit', 'ground_riverStraight', 'River tile', 2.5, 'length'),
      kn('nature-kit', 'cliff_waterfall_rock', 'Waterfall', 3.0, 'height'),
      kn('hexagon-kit', 'water', 'Water hex', 2.5, 'length'),
      kn('hexagon-kit', 'river-straight', 'River hex', 2.5, 'length'),
      lp('ultimate-nature', 'Lilypad', 'Lily pad', 0.4, 'length'),
      kk('hexagon', 'hex_water', 'Water hex', 2.5, 'length'),
      kk('hexagon', 'hex_river_A', 'River hex', 2.5, 'length'),
      kk('hexagon', 'waterlily_A', 'Water lily', 0.4, 'length'),
    ],
  },
  {
    id: 'deer',
    category: 'animals',
    label: 'Deer',
    note: 'Does about 1.45 m and stags about 1.95 m tall at the antlers.',
    axis: 'height',
    items: [
      study('current', 'source-woodland-doe', 'woodland-doe-quiet', 'Woodland doe (in game)', true),
      study(
        'current',
        'source-woodland-stag',
        'woodland-stag-quiet',
        'Woodland stag (in game)',
        true,
      ),
      study('current', 'source-natural-deer', 'natural-deer-quiet', 'Doe (earlier source)'),
      study('lowpoly', 'source-deer', 'deer-woodland-doe', 'Doe (repainted)'),
      study('lowpoly', 'source-stag', 'stag-branching-antlers', 'Stag (repainted)'),
      {
        family: 'lowpoly',
        pack: 'crownjoshua-deer',
        model: 'Deer',
        label: 'Deer (crownjoshua)',
        metres: 1.5,
      },
      kn('holiday-kit', 'reindeer', 'Reindeer', 1.4),
      // Ultimate Animated Animals sizes follow typical shoulder heights; the doe, stag and wolf
      // match the game's earlier repainted versions of the same models.
      lp('ultimate-animated-animals', 'Deer', 'Doe (animated pack)', 1.45),
      lp('ultimate-animated-animals', 'Stag', 'Stag (animated pack)', 1.95),
      // Fantasy Creatures are sized like the other versions of each species, not as their creator
      // made them (this stag is 2.36 m at the antlers there).
      fc('Deer', 'Base', 'Red deer stag', 1.95),
      wm('doe', 'Doe', 1.45),
      wm('deer', 'Stag', 1.95),
      // Species with no other version here stand at typical heights to the top of the antlers or
      // horns. Bighorn sheep and pronghorn have no subject of their own; the deer are the nearest
      // hoofed wild animals.
      wm('elk', 'Elk', 2.5),
      wm('moose', 'Moose', 2.5),
      wm('bighorn', 'Bighorn ram', 1.3),
      wm('pronghorn', 'Pronghorn', 1.4),
    ],
  },
  {
    id: 'predators',
    category: 'animals',
    label: 'Wolves, bears and foxes',
    note: 'Predators at real height.',
    axis: 'height',
    items: [
      study(
        'current',
        'source-woodland-wolf',
        'woodland-wolf-quiet',
        'Woodland wolf (in game)',
        true,
      ),
      study('current', 'source-bear', 'bear-forest-brown', 'Bear (in game)', true),
      study('current', 'source-bear', 'bear-heavy-shoulder', 'Bear, heavy shoulder'),
      lp('animal-pack-2', 'Wolf', 'Wolf', 0.85),
      lp('animals-2017', 'Red Fox', 'Red fox', 0.45),
      lp('animal-pack-2', 'Dog', 'Dog', 0.6),
      kn('cube-pets', 'animal-dog', 'Dog', 0.6),
      lp('ultimate-animated-animals', 'Wolf', 'Wolf (animated pack)', 0.96),
      lp('ultimate-animated-animals', 'Fox', 'Fox (animated pack)', 0.45),
      lp('ultimate-animated-animals', 'Husky', 'Husky (animated pack)', 0.75),
      lp('ultimate-animated-animals', 'ShibaInu', 'Shiba Inu (animated pack)', 0.5),
      fc('Wolf', 'Grey', 'Grey wolf', 0.96),
      fc('Bear', 'Brown', 'Cave bear', 1.25),
      wm('bear', 'Brown bear', 1.25),
    ],
  },
  {
    id: 'wildlife',
    category: 'animals',
    label: 'Hares, birds and small animals',
    note: 'Small animals at real size.',
    axis: 'height',
    items: [
      study('current', 'source-hare', 'hare-field', 'Hare (in game)', true),
      study('current', 'source-hare', 'hare-russet', 'Russet hare'),
      study('current', 'source-bird', 'bird-grey-wing', 'Shrike (in game)', true),
      lp('animals-2017', 'bird', 'Songbird', 0.2),
      lp('animals-2017', 'Chick', 'Chick', 0.15),
      lp('animal-pack-2', 'Eagle', 'Eagle', 0.6),
      lp('animal-pack-2', 'Cat', 'Cat', 0.3),
      kn('cube-pets', 'animal-bunny', 'Rabbit', 0.3),
      kn('cube-pets', 'animal-chick', 'Chick', 0.15),
      kn('cube-pets', 'animal-parrot', 'Parrot', 0.3),
      // Its rest pose spreads the wings, so it is sized by a golden eagle's wingspan.
      fc('Eagle', 'Golden', 'Golden eagle', 2.0, 'max'),
    ],
  },
  {
    id: 'farm',
    category: 'animals',
    label: 'Farm and work animals',
    note: 'Livestock at real height.',
    axis: 'height',
    items: [
      lp('farm-animals', 'Cow', 'Cow', 1.5),
      lp('farm-animals', 'Horse', 'Horse', 1.7),
      lp('farm-animals', 'Pig', 'Pig', 0.9),
      lp('farm-animals', 'Sheep', 'Sheep', 1.0),
      lp('farm-animals', 'Llama', 'Llama', 1.8),
      kn('cube-pets', 'animal-cow', 'Cow', 1.5),
      kn('cube-pets', 'animal-pig', 'Pig', 0.9),
      kn('cube-pets', 'animal-hog', 'Boar', 0.9),
      lp('ultimate-animated-animals', 'Cow', 'Cow (animated pack)', 1.5),
      lp('ultimate-animated-animals', 'Bull', 'Bull (animated pack)', 1.6),
      lp('ultimate-animated-animals', 'Horse', 'Horse (animated pack)', 2.0),
      lp('ultimate-animated-animals', 'Horse_White', 'White horse (animated pack)', 2.0),
      lp('ultimate-animated-animals', 'Donkey', 'Donkey (animated pack)', 1.5),
      lp('ultimate-animated-animals', 'Alpaca', 'Alpaca (animated pack)', 1.5),
      fc('Horse', 'Base', 'Horse', 2.0),
      fc('Cow', 'Base', 'Cow', 1.5),
      fc('Goat', 'Base', 'Goat', 0.95),
      fc('Sheep', 'Base', 'Sheep', 1.0),
      fc('Pig', 'Base', 'Pig', 0.9),
      fc('Chicken', 'Base', 'Hen', 0.4),
    ],
  },
  {
    id: 'walls',
    category: 'buildings',
    label: 'Walls',
    note: 'Wall sections about 3 m tall.',
    axis: 'height',
    items: [
      ...(
        [
          ['medieval_blocks_02', 'Dressed stone'],
          ['castle_brick_07', 'Castle brick'],
          ['plastered_stone_wall', 'Plastered stone'],
          ['rough_plaster_brick', 'Rough plaster'],
          ['medieval_wood', 'Medieval timber'],
          ['raw_plank_wall', 'Raw planks'],
          ['beam_wall_01', 'Beam wall'],
          ['clay_plaster', 'Clay plaster'],
        ] as const
      ).map(([model, label]) => ({ ...surface(model, label), options: { shape: 'wall' } })),
      mk('medieval-village-megakit', 'Wall_Plaster_Straight', 'Plaster wall', 3),
      mk('medieval-village-megakit', 'Wall_Plaster_WoodGrid', 'Timber-frame wall', 3),
      mk('medieval-village-megakit', 'Wall_UnevenBrick_Straight', 'Brick wall', 3),
      mk(
        'medieval-village-megakit',
        'Wall_Plaster_Window_Wide_Round',
        'Plaster wall with window',
        3,
      ),
      mk('medieval-village-megakit', 'Wall_UnevenBrick_Door_Round', 'Brick wall with door', 3),
      kn('fantasy-town-kit', 'wall', 'Stone wall', 3),
      kn('fantasy-town-kit', 'wall-wood', 'Timber wall', 3),
      kn('fantasy-town-kit', 'wall-wood-window-shutters', 'Timber wall with shutters', 3),
      kn('castle-kit', 'wall', 'Castle wall', 4),
      kn('retro-medieval-kit', 'wall-pane-wood', 'Wood pane wall', 3),
      kn('retro-medieval-kit', 'wall-fortified', 'Fortified wall', 4),
      kn('holiday-kit', 'cabin-wall', 'Log cabin wall', 3),
      kn('graveyard-kit', 'stone-wall', 'Low stone wall', 1.2),
      kn('graveyard-kit', 'brick-wall', 'Brick wall', 2),
      lp('modular-medieval', 'Wall', 'Wall', 4),
      lp('modular-medieval', 'WallBricks', 'Brick wall', 4),
      lp('modular-dungeon', 'Wall_Modular', 'Dungeon wall', 3),
      kk('dungeon', 'wall', 'Wall', 3),
      kk('dungeon', 'wall_window_open', 'Wall with window', 3),
      kk('dungeon', 'wall_doorway', 'Wall with doorway', 3),
    ],
  },
  {
    id: 'floors',
    category: 'buildings',
    label: 'Floors and foundations',
    note: 'Floor tiles shown about 2 m across.',
    axis: 'length',
    items: [
      ...(
        [
          ['old_wood_floor', 'Old wood floor'],
          ['cobblestone_floor_01', 'Cobblestones'],
          ['monastery_stone_floor', 'Flagstones'],
          ['dirt_floor', 'Packed dirt'],
        ] as const
      ).map(([model, label]) => ({ ...surface(model, label), options: { shape: 'floor' } })),
      mk('medieval-village-megakit', 'Floor_WoodDark', 'Dark wood floor', 2, 'length'),
      mk('medieval-village-megakit', 'Floor_WoodLight', 'Light wood floor', 2, 'length'),
      mk('medieval-village-megakit', 'Floor_Brick', 'Brick floor', 2, 'length'),
      mk('medieval-village-megakit', 'Floor_UnevenBrick', 'Uneven brick floor', 2, 'length'),
      kn('retro-medieval-kit', 'floor', 'Stone floor', 2, 'length'),
      kn('retro-medieval-kit', 'wood-floor', 'Wood floor', 2, 'length'),
      kn('holiday-kit', 'floor-wood', 'Wood floor', 2, 'length'),
      kn('holiday-kit', 'floor-stone', 'Stone floor', 2, 'length'),
      kn('survival-kit', 'floor-old', 'Old boards', 2, 'length'),
      lp('modular-dungeon', 'Floor_Modular', 'Dungeon floor', 2, 'length'),
      lp('modular-dungeon', 'Floor_BricksSeparate', 'Brick floor', 2, 'length'),
      kk('dungeon', 'floor_tile_large', 'Stone tiles', 2, 'length'),
      kk('dungeon', 'floor_wood_large', 'Wood floor', 2, 'length'),
      kk('dungeon', 'floor_dirt_large', 'Dirt floor', 2, 'length'),
    ],
  },
  {
    id: 'roofs',
    category: 'buildings',
    label: 'Roofs',
    note: 'Roof pieces and roofing materials.',
    axis: 'length',
    items: [
      ...(
        [
          ['thatch_roof_angled', 'Thatch'],
          ['reed_roof_03', 'Reed thatch'],
          ['roof_slates_02', 'Slate'],
          ['clay_roof_tiles', 'Clay tiles'],
          ['roof_tiles_14', 'Shingles'],
        ] as const
      ).map(([model, label]) => ({ ...surface(model, label), options: { shape: 'roof' } })),
      mk('medieval-village-megakit', 'Roof_RoundTiles_4x4', 'Tiled roof', 4),
      mk('medieval-village-megakit', 'Roof_Wooden_2x1', 'Wooden roof', 2),
      mk('medieval-village-megakit', 'Roof_Front_Brick4', 'Brick gable', 4),
      mk('medieval-village-megakit', 'Roof_Dormer_RoundTile', 'Dormer', 2),
      mk('medieval-village-megakit', 'Roof_Tower_RoundTiles', 'Tower roof', 3),
      kn('fantasy-town-kit', 'roof', 'Roof', 2),
      kn('fantasy-town-kit', 'roof-gable', 'Gable roof', 2),
      kn('fantasy-town-kit', 'roof-high-window', 'Roof with window', 2),
      kn('retro-medieval-kit', 'roof', 'Roof', 2),
      kn('holiday-kit', 'cabin-roof', 'Cabin roof', 2),
      kn('castle-kit', 'tower-square-roof', 'Tower roof', 3),
    ],
  },
  {
    id: 'openings',
    category: 'buildings',
    label: 'Doors, windows and stairs',
    note: 'Openings and stairs at real height.',
    axis: 'height',
    items: [
      ph('large_castle_door', 'Castle door', 3),
      mk('medieval-village-megakit', 'Door_1_Round', 'Round-top door', 2.1),
      mk('medieval-village-megakit', 'Door_2_Flat', 'Plank door', 2.1),
      mk('medieval-village-megakit', 'Window_Wide_Round1', 'Window', 1.2),
      mk('medieval-village-megakit', 'WindowShutters_Wide_Flat_Open', 'Shutters', 1.2),
      mk('medieval-village-megakit', 'Stairs_Exterior_Straight', 'Exterior stairs', 1.5),
      mk('medieval-village-megakit', 'Stair_Interior_Rails', 'Interior stairs', 3),
      kn('fantasy-town-kit', 'wall-wood-door', 'Timber wall with door', 3),
      kn('fantasy-town-kit', 'stairs-wood', 'Wooden stairs', 1.5),
      kn('fantasy-town-kit', 'stairs-stone', 'Stone stairs', 1.5),
      kn('castle-kit', 'door', 'Castle door', 3),
      kn('castle-kit', 'gate', 'Castle gate', 4),
      kn('retro-medieval-kit', 'ladder', 'Ladder', 3),
      lp('medieval-village-2020', 'Door_Round', 'Round door', 2.1),
      lp('medieval-village-2020', 'Window_1', 'Window', 1.2),
      lp('medieval-village-2020', 'Stairs', 'Stairs', 1.5),
      lp('modular-medieval', 'Door', 'Door', 2.5),
      lp('modular-medieval', 'WindowGothic', 'Gothic window', 2),
      kk('dungeon', 'stairs', 'Stairs', 3),
      kk('halloween', 'arch_gate', 'Arched gate', 3),
    ],
  },
  {
    id: 'fences',
    category: 'buildings',
    label: 'Fences, gates and bridges',
    note: 'Boundaries and crossings.',
    axis: 'height',
    items: [
      mk('medieval-village-megakit', 'Prop_WoodenFence_Single', 'Wooden fence', 1.1),
      mk('medieval-village-megakit', 'Prop_MetalFence_Simple', 'Iron fence', 1.2),
      kn('nature-kit', 'fence_planks', 'Plank fence', 1.1),
      kn('nature-kit', 'fence_gate', 'Gate', 1.1),
      kn('nature-kit', 'bridge_wood', 'Wooden bridge', 4, 'length'),
      kn('fantasy-town-kit', 'fence', 'Fence', 1.1),
      kn('graveyard-kit', 'iron-fence', 'Iron fence', 1.5),
      kn('graveyard-kit', 'fence', 'Picket fence', 1.1),
      kn('castle-kit', 'bridge-straight', 'Stone bridge', 6, 'length'),
      lp('medieval-village-2020', 'Fence', 'Fence', 1.1),
      lp('modular-dungeon', 'Fence_Straight_Modular', 'Fence', 1.1),
      lp('modular-medieval', 'Bridge', 'Bridge', 6, 'length'),
      kk('hexagon', 'fence_wood_straight', 'Wooden fence', 1.1),
      kk('hexagon', 'fence_stone_straight', 'Stone fence', 1.1),
      kk('hexagon', 'building_bridge_A', 'Bridge', 6, 'length'),
      kk('halloween', 'fence', 'Fence', 1.1),
      kk('halloween', 'fence_gate', 'Gate', 1.5),
    ],
  },
  {
    id: 'buildings',
    category: 'buildings',
    label: 'Whole buildings',
    note: 'Complete structures at real height. The stylized textured buildings are assembled from the village kit’s parts.',
    axis: 'height',
    items: [
      ...(
        [
          ['rough_plaster_brick', 'thatch_roof_angled', 'Plaster cottage, thatch'],
          ['medieval_blocks_02', 'roof_slates_02', 'Stone house, slate'],
          ['raw_plank_wall', 'roof_tiles_14', 'Plank cabin, shingles'],
        ] as const
      ).map(
        ([wall, roof, label]): PlannedItem => ({
          family: 'polyhaven',
          pack: 'polyhaven/' + wall,
          model: wall,
          label,
          kind: 'house',
          options: { wall, roof },
        }),
      ),
      ...villageBuildings(),
      kn('hexagon-kit', 'building-house', 'House', 6),
      kn('hexagon-kit', 'building-cabin', 'Cabin', 5),
      kn('hexagon-kit', 'building-mill', 'Mill', 8),
      kn('hexagon-kit', 'building-tower', 'Tower', 10),
      kn('fantasy-town-kit', 'windmill', 'Windmill', 10),
      kn('fantasy-town-kit', 'watermill', 'Watermill', 7),
      kn('graveyard-kit', 'crypt', 'Crypt', 4),
      kn('pirate-kit', 'tower-complete-small', 'Watchtower', 8),
      lp('medieval-village-2020', 'House_1', 'House', 6),
      lp('medieval-village-2020', 'House_3', 'House', 7),
      lp('medieval-village-2020', 'Inn', 'Inn', 9),
      lp('medieval-village-2020', 'Mill', 'Mill', 10),
      lp('medieval-village-2020', 'Blacksmith', 'Blacksmith', 6),
      lp('medieval-village-2020', 'Well', 'Well', 3),
      lp('medieval-village-2020', 'Stable', 'Stable', 5),
      lp('modular-medieval', 'Watchtower', 'Watchtower', 10),
      kk('hexagon', 'building_home_A_red', 'House', 6),
      kk('hexagon', 'building_tavern_red', 'Tavern', 8),
      kk('hexagon', 'building_windmill_red', 'Windmill', 10),
      kk('hexagon', 'building_well_red', 'Well', 3),
      kk('hexagon', 'building_tower_A_red', 'Tower', 10),
      kk('hexagon', 'building_blacksmith_red', 'Blacksmith', 7),
    ],
  },
];

// ---------------------------------------------------------------------------------------------
// glTF reading, embedding and writing.

/** Files by name within each pack. Some packs export glTF beside a shared Textures folder
 * instead of beside each model; the shallowest file of that name is the pack's default. */
const packFiles = new Map<string, Map<string, string>>();
function packFile(packRoot: string, name: string): string | undefined {
  let files = packFiles.get(packRoot);
  if (!files) {
    files = new Map();
    const walk = (directory: string) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (!files!.has(entry.name) || path.length < files!.get(entry.name)!.length)
          files!.set(entry.name, path);
      }
    };
    walk(packRoot);
    packFiles.set(packRoot, files);
  }
  return files.get(name);
}
function uriBytes(uri: string, directory: string, packRoot: string): Uint8Array {
  if (uri.startsWith('data:')) return Buffer.from(uri.slice(uri.indexOf(',') + 1), 'base64');
  const path = resolve(directory, decodeURIComponent(uri));
  if (!path.startsWith(packRoot)) throw new Error('A model reference escaped its pack.');
  if (existsSync(path)) return readFileSync(path);
  const fallback = packFile(packRoot, basename(path));
  if (!fallback) throw new Error(`Missing ${uri} for a model in ${packRoot}`);
  return readFileSync(fallback);
}
const surveyTextureLimit = 1024;
const reduced = new Map<string, Uint8Array>();
function surveyImage(bytes: Uint8Array): Uint8Array {
  if (Math.max(...imageSize(bytes)) <= surveyTextureLimit) return bytes;
  const key = createHash('sha256').update(bytes).digest('hex');
  const existing = reduced.get(key);
  if (existing) return existing;
  const directory = mkdtempSync(join(tmpdir(), 'openlegend-survey-image-'));
  try {
    const extension = mime(bytes) === 'image/png' ? '.png' : '.jpg';
    const input = join(directory, 'source' + extension);
    const output = join(directory, 'reduced' + extension);
    writeFileSync(input, bytes);
    execFileSync('sips', ['-Z', String(surveyTextureLimit), input, '--out', output], {
      stdio: 'ignore',
    });
    const result = readFileSync(output);
    reduced.set(key, result);
    return result;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

/** One binary buffer holding every buffer and image; external references become buffer views. */
function embed(
  json: Record<string, any>,
  bin: Uint8Array | undefined,
  directory: string,
  packRoot: string,
): Gltf {
  const parts: Uint8Array[] = [];
  let length = 0;
  const append = (bytes: Uint8Array) => {
    const offset = length;
    parts.push(bytes);
    length += align(bytes.byteLength);
    return offset;
  };
  const buffers: Uint8Array[] = (json['buffers'] ?? []).map((buffer: any) =>
    buffer.uri === undefined ? bin! : uriBytes(buffer.uri, directory, packRoot),
  );
  // Images already embedded in a source buffer keep their view unless the survey limit reduces
  // them; a reduced copy is appended and the original bytes are left unused.
  const reducedEmbedded = new Map<any, Uint8Array>();
  for (const image of json['images'] ?? []) {
    if (image.uri !== undefined || image.bufferView === undefined) continue;
    const view = json['bufferViews'][image.bufferView];
    const start = view.byteOffset ?? 0;
    const original = buffers[view.buffer]!.subarray(start, start + view.byteLength);
    const bytes = surveyImage(original);
    if (bytes !== original) reducedEmbedded.set(image, bytes);
  }
  const offsets = buffers.map(append);
  for (const view of json['bufferViews'] ?? []) {
    view.byteOffset = (view.byteOffset ?? 0) + offsets[view.buffer];
    view.buffer = 0;
  }
  for (const image of json['images'] ?? []) {
    const bytes =
      image.uri !== undefined
        ? surveyImage(uriBytes(image.uri, directory, packRoot))
        : reducedEmbedded.get(image);
    if (!bytes) continue;
    json['bufferViews'] ??= [];
    json['bufferViews'].push({
      buffer: 0,
      byteOffset: append(bytes),
      byteLength: bytes.byteLength,
    });
    image.bufferView = json['bufferViews'].length - 1;
    image.mimeType = image.mimeType ?? mime(bytes);
    delete image.uri;
  }
  const combined = concat(parts);
  json['buffers'] = [{ byteLength: combined.byteLength }];
  // Name each image by its content so the survey page can share one GPU texture between
  // models that embed the same trim sheet or colour atlas.
  for (const image of json['images'] ?? []) {
    const view = json['bufferViews'][image.bufferView];
    const bytes = combined.subarray(view.byteOffset, view.byteOffset + view.byteLength);
    image.name = `${image.name ?? 'image'}#${createHash('sha256').update(bytes).digest('hex').slice(0, 16)}`;
  }
  return { json, bin: combined };
}

function readGltf(path: string, packRoot: string): Gltf {
  const bytes = readFileSync(path);
  if (bytes.readUInt32LE(0) === 0x46546c67) {
    const { json, bin } = parseGlb(bytes);
    return embed(json, bin, dirname(path), packRoot);
  }
  return embed(JSON.parse(bytes.toString('utf8')), undefined, dirname(path), packRoot);
}

/** A building assembled from one pack's modular pieces. Each distinct piece's meshes are stored
 * once and reused by every node that places that piece; identical images, samplers, textures and
 * materials are shared, so the trim sheets most pieces use are embedded once per building. */
function assemble(packDirectory: string, parts: readonly PlannedPart[]): Gltf {
  const json: Record<string, any> = {
    asset: { version: '2.0', generator: 'OpenLegend asset survey assembly' },
    scene: 0,
    scenes: [{ nodes: [] }],
    nodes: [],
    meshes: [],
    materials: [],
    textures: [],
    images: [],
    samplers: [],
    accessors: [],
    bufferViews: [],
  };
  const chunks: Uint8Array[] = [];
  let length = 0;
  const append = (bytes: Uint8Array) => {
    const offset = length;
    chunks.push(bytes);
    length += align(bytes.byteLength);
    return offset;
  };
  const shared = new Map<string, number>();
  /** Index of an identical entry already in the named list, or of the newly added one. */
  const reuse = (list: string, key: string, create: () => unknown) => {
    let index = shared.get(`${list}|${key}`);
    if (index === undefined) {
      index = json[list].push(create()) - 1;
      shared.set(`${list}|${key}`, index);
    }
    return index;
  };
  const same = (list: string, value: unknown) => reuse(list, JSON.stringify(value), () => value);
  const pieces = new Map<string, { source: Record<string, any>; meshes: number[] }>();
  const piece = (model: string) => {
    const known = pieces.get(model);
    if (known) return known;
    const { json: source, bin } = readGltf(findModel(packDirectory, model), packDirectory);
    const bytes = (index: number) => {
      const view = source['bufferViews'][index];
      return bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
    };
    const views = new Map<number, number>();
    const view = (index: number) => {
      let copied = views.get(index);
      if (copied === undefined) {
        const { buffer: _, byteOffset: __, ...rest } = source['bufferViews'][index];
        copied =
          json['bufferViews'].push({ ...rest, buffer: 0, byteOffset: append(bytes(index)) }) - 1;
        views.set(index, copied);
      }
      return copied;
    };
    const accessors: number[] = (source['accessors'] ?? []).map(
      (accessor: any) =>
        json['accessors'].push(
          accessor.bufferView === undefined
            ? accessor
            : { ...accessor, bufferView: view(accessor.bufferView) },
        ) - 1,
    );
    const images: number[] = (source['images'] ?? []).map((image: any) => {
      const content = bytes(image.bufferView);
      return reuse('images', sha256(content), () => ({
        name: image.name,
        mimeType: image.mimeType,
        bufferView:
          json['bufferViews'].push({
            buffer: 0,
            byteOffset: append(content),
            byteLength: content.byteLength,
          }) - 1,
      }));
    });
    const samplers: number[] = (source['samplers'] ?? []).map((sampler: any) =>
      same('samplers', sampler),
    );
    const textures: number[] = (source['textures'] ?? []).map((texture: any) =>
      same('textures', {
        ...texture,
        ...(texture.sampler === undefined ? {} : { sampler: samplers[texture.sampler] }),
        source: images[texture.source],
      }),
    );
    // Core and extension texture references are all `…Texture` objects with an `index`.
    const retexture = (value: any): any =>
      Array.isArray(value)
        ? value.map(retexture)
        : value !== null && typeof value === 'object'
          ? Object.fromEntries(
              Object.entries(value).map(([key, entry]: [string, any]) => [
                key,
                key.endsWith('Texture') && typeof entry?.index === 'number'
                  ? { ...retexture(entry), index: textures[entry.index] }
                  : retexture(entry),
              ]),
            )
          : value;
    const materials: number[] = (source['materials'] ?? []).map((material: any) =>
      same('materials', retexture(material)),
    );
    const meshes: number[] = (source['meshes'] ?? []).map(
      (mesh: any) =>
        json['meshes'].push({
          ...mesh,
          primitives: mesh.primitives.map((primitive: any) => ({
            ...primitive,
            attributes: Object.fromEntries(
              Object.entries(primitive.attributes).map(([name, index]) => [
                name,
                accessors[index as number],
              ]),
            ),
            ...(primitive.indices === undefined ? {} : { indices: accessors[primitive.indices] }),
            ...(primitive.material === undefined
              ? {}
              : { material: materials[primitive.material] }),
          })),
        }) - 1,
    );
    const found = { source, meshes };
    pieces.set(model, found);
    return found;
  };
  const copy = (source: Record<string, any>, meshes: number[], index: number): number => {
    const { children, mesh, ...node } = source['nodes'][index];
    const copied = {
      ...node,
      ...(mesh === undefined ? {} : { mesh: meshes[mesh] }),
      ...(children
        ? { children: children.map((child: number) => copy(source, meshes, child)) }
        : {}),
    };
    return json['nodes'].push(copied) - 1;
  };
  // Exact quarter-turn rotations about +Y.
  const quarterTurns = [
    undefined,
    [0, Math.SQRT1_2, 0, Math.SQRT1_2],
    [0, 1, 0, 0],
    [0, Math.SQRT1_2, 0, -Math.SQRT1_2],
  ];
  for (const part of parts) {
    const { source, meshes } = piece(part.model);
    const roots: number[] = source['scenes'][source['scene'] ?? 0].nodes;
    const children = roots.map((root) => copy(source, meshes, root));
    const rotation = quarterTurns[((part.turn % 4) + 4) % 4];
    json['scenes'][0].nodes.push(
      json['nodes'].push({
        name: part.model,
        translation: [...part.at],
        ...(rotation ? { rotation } : {}),
        children,
      }) - 1,
    );
  }
  const bin = concat(chunks);
  json['buffers'] = [{ byteLength: bin.byteLength }];
  // glTF lists, when present, may not be empty.
  for (const key of Object.keys(json))
    if (Array.isArray(json[key]) && json[key].length === 0) delete json[key];
  return { json, bin };
}

/** Packs whose OBJ materials do not name the textures shipped beside them. */
const objTextures: Record<string, Record<string, string>> = {
  'quaternius-textured-trees': {
    Bark: 'Tree_Bark.jpg',
    Tree_Leaves: 'Tree_Leaves.png',
    Birch_Bark: 'Birch_Bark.png',
    Birch_Leaves: 'Birch_Leaves_Green.png',
    Pine_Leaves: 'Pine_Leaves.png',
  },
};
/** Older Quaternius packs and the community deer ship only OBJ/MTL: convert each material group
 * to a primitive with its diffuse colour or texture; faces without normals get flat normals. */
function readObj(path: string, pack: string): Gltf {
  const directory = dirname(path);
  const materials = new Map<string, { color: number[]; texture?: string; opacity: number }>();
  const text = readFileSync(path, 'utf8');
  for (const line of text.split(/\r?\n/))
    if (line.startsWith('mtllib ')) {
      const library = resolve(directory, line.slice(7).trim());
      if (!existsSync(library)) continue;
      let current = '';
      for (const raw of readFileSync(library, 'utf8').split(/\r?\n/)) {
        const [key, ...rest] = raw.trim().split(/\s+/);
        if (key === 'newmtl')
          materials.set((current = rest.join(' ')), { color: [0.8, 0.8, 0.8], opacity: 1 });
        else if (key === 'Kd' && current)
          materials.get(current)!.color = rest.slice(0, 3).map(Number);
        else if (key === 'd' && current) materials.get(current)!.opacity = Number(rest[0]);
        else if (key === 'map_Kd' && current) materials.get(current)!.texture = rest.at(-1);
      }
    }
  const positions: number[][] = [],
    uvs: number[][] = [],
    normals: number[][] = [];
  const groups = new Map<string, { p: number[]; n: number[]; t: number[] }>();
  let group = groups.get('') ?? { p: [], n: [], t: [] };
  groups.set('', group);
  const index = (value: string, list: number[][]) => {
    const n = Number(value);
    return n < 0 ? list.length + n : n - 1;
  };
  for (const line of text.split(/\r?\n/)) {
    const [key, ...rest] = line.trim().split(/\s+/);
    if (key === 'v') positions.push(rest.slice(0, 3).map(Number));
    else if (key === 'vt') uvs.push(rest.slice(0, 2).map(Number));
    else if (key === 'vn') normals.push(rest.slice(0, 3).map(Number));
    else if (key === 'usemtl') {
      const name = rest.join(' ');
      group = groups.get(name) ?? { p: [], n: [], t: [] };
      groups.set(name, group);
    } else if (key === 'f') {
      const corners = rest.map((corner) => corner.split('/'));
      for (let i = 1; i + 1 < corners.length; i++)
        for (const c of [corners[0]!, corners[i]!, corners[i + 1]!]) {
          group.p.push(...positions[index(c[0]!, positions)]!);
          group.t.push(...(c[1] ? uvs[index(c[1], uvs)]! : [0, 0]));
          group.n.push(...(c[2] ? normals[index(c[2], normals)]! : [NaN, NaN, NaN]));
        }
    }
  }
  const json: Record<string, any> = {
    asset: { version: '2.0', generator: 'OpenLegend asset survey OBJ conversion' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: basename(path, extname(path)) }],
    meshes: [{ primitives: [] }],
    materials: [],
    accessors: [],
    bufferViews: [],
    images: [],
    textures: [],
    samplers: [{}],
  };
  const parts: Uint8Array[] = [];
  let length = 0;
  const view = (data: Float32Array, components: number, minmax: boolean) => {
    const bytes = new Uint8Array(data.buffer);
    json['bufferViews'].push({ buffer: 0, byteOffset: length, byteLength: bytes.byteLength });
    parts.push(bytes);
    length += align(bytes.byteLength);
    const count = data.length / components;
    const accessor: Record<string, any> = {
      bufferView: json['bufferViews'].length - 1,
      componentType: 5126,
      count,
      type: components === 3 ? 'VEC3' : 'VEC2',
    };
    if (minmax) {
      accessor.min = [Infinity, Infinity, Infinity];
      accessor.max = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < data.length; i++) {
        accessor.min[i % 3] = Math.min(accessor.min[i % 3], data[i]!);
        accessor.max[i % 3] = Math.max(accessor.max[i % 3], data[i]!);
      }
    }
    json['accessors'].push(accessor);
    return json['accessors'].length - 1;
  };
  for (const [name, data] of groups) {
    if (!data.p.length) continue;
    const n = new Float32Array(data.n);
    for (let i = 0; i < n.length; i += 9)
      if (Number.isNaN(n[i])) {
        const p = data.p;
        const ax = p[i + 3]! - p[i]!,
          ay = p[i + 4]! - p[i + 1]!,
          az = p[i + 5]! - p[i + 2]!;
        const bx = p[i + 6]! - p[i]!,
          by = p[i + 7]! - p[i + 1]!,
          bz = p[i + 8]! - p[i + 2]!;
        let x = ay * bz - az * by,
          y = az * bx - ax * bz,
          z = ax * by - ay * bx;
        const l = Math.hypot(x, y, z) || 1;
        x /= l;
        y /= l;
        z /= l;
        for (let k = 0; k < 3; k++) n.set([x, y, z], i + k * 3);
      }
    const source = materials.get(name) ?? { color: [0.8, 0.8, 0.8], opacity: 1 };
    const named = objTextures[pack]?.[name];
    const texturePath = source.texture
      ? resolve(directory, source.texture)
      : named
        ? packFile(join(sources, pack), named)
        : undefined;
    const material: Record<string, any> = {
      name: name || 'Default',
      pbrMetallicRoughness: {
        baseColorFactor: [...source.color, source.opacity],
        metallicFactor: 0,
        roughnessFactor: 0.85,
      },
    };
    if (texturePath && existsSync(texturePath)) {
      const bytes = surveyImage(readFileSync(texturePath));
      json['bufferViews'].push({ buffer: 0, byteOffset: length, byteLength: bytes.byteLength });
      parts.push(bytes);
      length += align(bytes.byteLength);
      // Named by content, like embedded glTF images, so the page can share the texture.
      json['images'].push({
        bufferView: json['bufferViews'].length - 1,
        mimeType: mime(bytes),
        name: `${basename(texturePath)}#${sha256(bytes).slice(0, 16)}`,
      });
      json['textures'].push({ source: json['images'].length - 1, sampler: 0 });
      material.pbrMetallicRoughness.baseColorTexture = { index: json['textures'].length - 1 };
      material.pbrMetallicRoughness.baseColorFactor = [1, 1, 1, source.opacity];
      // OBJ texture rows start at the bottom; glTF's start at the top.
      for (let i = 1; i < data.t.length; i += 2) data.t[i] = 1 - data.t[i]!;
      if (source.opacity < 1 || mime(bytes) === 'image/png') material.alphaMode = 'MASK';
    }
    json['materials'].push(material);
    json['meshes'][0].primitives.push({
      attributes: {
        POSITION: view(new Float32Array(data.p), 3, true),
        NORMAL: view(n, 3, false),
        TEXCOORD_0: view(new Float32Array(data.t), 2, false),
      },
      material: json['materials'].length - 1,
    });
  }
  for (const key of ['images', 'textures']) if (!json[key].length) delete json[key];
  const bin = concat(parts);
  json['buffers'] = [{ byteLength: bin.byteLength }];
  return { json, bin };
}

/** Fantasy Creatures ships its models untextured; each creature's Godot scene paints the body with
 * a coat material at runtime. Its shader (addons/beasts/shaders/creature_coat.gdshaderinc) takes
 * colour from the coat texture times a tint, roughness from 1 − alpha × smoothness and an optional
 * OpenGL normal map; the model's single material is replaced with that one. glTF cannot read
 * roughness from a colour texture's alpha. Most of each coat has alpha near 0.1 (the eagle's near
 * 0.2), so roughness is the constant 0.9: the eagle's feathers come out slightly more matte, and
 * the few glossier spots, such as eyes and noses, lose their gloss. */
function paintCoat({ json, bin }: Gltf, packDirectory: string, coat: string): Gltf {
  const material = packFile(packDirectory, coat);
  const project = packFile(packDirectory, 'project.godot');
  if (!material || !project) throw new Error(`Missing ${coat} in ${packDirectory}`);
  const materials: any[] = json['materials'] ?? [];
  if (materials.length !== 1)
    throw new Error(`${coat} paints one material; its model has ${materials.length}.`);
  // Godot resources name their shader and textures by res:// paths from the project folder.
  const text = readFileSync(material, 'utf8');
  const paths = new Map<string, string>();
  for (const [line] of text.matchAll(/^\[ext_resource .*\]$/gm)) {
    const path = line.match(/ path="res:\/\/([^"]+)"/)?.[1];
    const id = line.match(/ id="([^"]+)"/)?.[1];
    if (path && id) paths.set(id, resolve(dirname(project), path));
  }
  const value = (name: string) => text.match(new RegExp(`^${name} = (.+)$`, 'm'))?.[1];
  const resource = (name: string) => {
    const path = paths.get(value(name)?.match(/ExtResource\("([^"]+)"\)/)?.[1] ?? '');
    // The pack is downloaded data; it must not pull other local files into a published model.
    if (path && !path.startsWith(packDirectory + '/'))
      throw new Error('A coat reference escaped its pack.');
    return path;
  };
  const coatImage = resource('shader_parameter/coat');
  if (!coatImage) throw new Error(`${coat} names no coat texture.`);
  const tint = value('shader_parameter/tint')
    ?.match(/Color\(([^)]+)\)/)?.[1]!
    .split(',')
    .map(Number);
  // Godot writes colour parameters in sRGB; glTF factors are linear.
  const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const smoothness = Number(value('shader_parameter/smoothness') ?? 1);
  const normalMap =
    value('shader_parameter/use_normal_map') === 'true'
      ? resource('shader_parameter/normal_map')
      : undefined;

  const parts = [bin];
  let length = align(bin.byteLength);
  const texture = (path: string) => {
    const bytes = surveyImage(readFileSync(path));
    json['bufferViews'].push({ buffer: 0, byteOffset: length, byteLength: bytes.byteLength });
    parts.push(bytes);
    length += align(bytes.byteLength);
    // Named by content, like embedded glTF images, so the page can share the texture.
    (json['images'] ??= []).push({
      bufferView: json['bufferViews'].length - 1,
      mimeType: mime(bytes),
      name: `${basename(path)}#${sha256(bytes).slice(0, 16)}`,
    });
    return (json['textures'] ??= []).push({ source: json['images'].length - 1 }) - 1;
  };
  json['materials'] = [
    {
      name: materials[0].name,
      ...(resource('shader')?.endsWith('_two_sided.gdshader') ? { doubleSided: true } : {}),
      pbrMetallicRoughness: {
        baseColorTexture: { index: texture(coatImage) },
        baseColorFactor: [...(tint ?? [1, 1, 1]).slice(0, 3).map(linear), 1],
        metallicFactor: 0,
        roughnessFactor: round(1 - 0.1 * smoothness),
      },
      ...(normalMap
        ? {
            normalTexture: {
              index: texture(normalMap),
              scale: Number(value('shader_parameter/normal_scale') ?? 1),
            },
          }
        : {}),
    },
  ];
  // The exported material's specular extension does not reach the creator's coat shader.
  const used = (json['extensionsUsed'] ?? []).filter(
    (name: string) => name !== 'KHR_materials_specular',
  );
  if (used.length) json['extensionsUsed'] = used;
  else delete json['extensionsUsed'];
  const painted = concat(parts);
  json['buffers'] = [{ byteLength: painted.byteLength }];
  return { json, bin: painted };
}

// ---------------------------------------------------------------------------------------------
// Catalog generation.

function findModel(packDirectory: string, model: string): string {
  const candidates: string[] = [];
  const walk = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else {
        const extension = extname(entry.name).toLowerCase();
        const stem = basename(entry.name, extname(entry.name));
        if (
          ['.glb', '.gltf', '.obj'].includes(extension) &&
          (stem === model || stem === model + '.gltf')
        )
          candidates.push(path);
      }
    }
  };
  walk(packDirectory);
  const rank = (path: string) => ['.glb', '.gltf', '.obj'].indexOf(extname(path).toLowerCase());
  candidates.sort((a, b) => rank(a) - rank(b) || a.length - b.length);
  if (!candidates[0]) throw new Error(`Missing ${model} in ${packDirectory}`);
  return candidates[0];
}
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
function writeOutput(relative: string, bytes: Uint8Array) {
  const path = join(workspace, relative);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
  return { file: relative, sha256: sha256(bytes), bytes: bytes.byteLength };
}
/** One credit per source pack, shared by its items. */
const packCredits: Record<string, { creator: string; license: string; page: string }> = {};
function provenance(pack: string) {
  const record = JSON.parse(readFileSync(join(sources, pack, 'download.json'), 'utf8'));
  packCredits[pack] = { creator: record.creator, license: record.license, page: record.page };
  return packCredits[pack];
}
const extentAlong = (axis: Axis, min: number[], max: number[]) => {
  const size = [0, 1, 2].map((k) => max[k]! - min[k]!);
  return axis === 'height'
    ? size[1]!
    : axis === 'length'
      ? Math.max(size[0]!, size[2]!)
      : Math.max(...size);
};
const round = (value: number) => Math.round(value * 1e5) / 1e5;
const studyCatalogs = new Map<string, any>();

const items: Record<string, unknown>[] = [];
const ids = new Set<string>();
for (const subject of subjects)
  for (const planned of subject.items) {
    // Two sources can share a model name (a pack's heater shield and its repainted study).
    const name = slug(planned.model.replace(/_1k$/, ''));
    let id = `${subject.id}-${planned.family}-${name}`;
    for (let copy = 2; ids.has(id); copy++) id = `${subject.id}-${planned.family}-${name}-${copy}`;
    ids.add(id);
    const base = {
      id,
      subject: subject.id,
      family: planned.family,
      label: planned.label,
      inGame: planned.inGame ?? false,
    };
    if (planned.kind === 'ground' || planned.kind === 'water') {
      items.push({
        ...base,
        kind: planned.kind,
        options: planned.options,
        credit: 'OpenLegend renderer',
        license: 'AGPL-3.0-only',
      });
      continue;
    }
    if (planned.pack.startsWith('study:')) {
      const group = planned.pack.slice(6);
      const catalog =
        studyCatalogs.get(group) ??
        JSON.parse(
          readFileSync(
            join(repository, 'apps/client/src/props/art-study', group, 'catalog.json'),
            'utf8',
          ),
        );
      studyCatalogs.set(group, catalog);
      const asset = catalog.assets.find((entry: any) => entry.id === planned.model);
      if (!asset) throw new Error(`Missing study asset ${planned.pack}/${planned.model}`);
      items.push({
        ...base,
        kind: 'model',
        file: `apps/client/src/props/art-study/${asset.fileGroup ?? group}/${asset.file}`,
        scale: 1,
        bounds: asset.bounds,
        triangles: asset.triangles,
        textures: asset.textureSizes,
        credit: asset.source,
        published: true,
      });
      continue;
    }
    const packDirectory = join(sources, planned.pack);
    provenance(planned.pack);
    if (planned.kind === 'surface' || planned.kind === 'house') {
      const maps = (texture: string) => {
        provenance('polyhaven/' + texture);
        const directory = join(sources, 'polyhaven', texture);
        const record = JSON.parse(readFileSync(join(directory, 'download.json'), 'utf8'));
        const pick = (key: string) =>
          record.files.find((file: any) => file.path.includes(`_${key}_`));
        const out: Record<string, unknown> = {};
        for (const [role, key] of [
          ['color', 'Diffuse'],
          ['normal', 'nor_gl'],
          ['roughness', 'Rough'],
        ] as const) {
          const file = pick(key) ?? (role === 'roughness' ? pick('arm') : undefined);
          if (!file) continue;
          out[role] = {
            ...writeOutput(
              `${outputRoot}/polyhaven-textures/${texture}/${role}.jpg`,
              readFileSync(join(directory, file.path)),
            ),
            // An ambient/roughness/metal map keeps roughness in its green channel.
            ...(file.path.includes('_arm_') ? { channel: 'g' } : {}),
          };
        }
        return out;
      };
      items.push({
        ...base,
        kind: planned.kind,
        options: planned.options,
        maps:
          planned.kind === 'house'
            ? { wall: maps(planned.options!['wall']!), roof: maps(planned.options!['roof']!) }
            : maps(planned.model),
        source: planned.pack,
      });
      continue;
    }
    if (planned.kind === 'assembly') {
      const gltf = assemble(packDirectory, planned.parts!);
      const stats = measure(gltf);
      const output = writeOutput(
        `${outputRoot}/${planned.family}/${slug(planned.pack)}-${name}.glb`,
        writeGlb(gltf),
      );
      items.push({
        ...base,
        kind: 'model',
        ...output,
        // Kit pieces are modelled in metres.
        scale: 1,
        bounds: { min: stats.min.map(round), max: stats.max.map(round) },
        triangles: stats.triangles,
        textures: stats.textures,
        source: planned.pack,
        parts: planned.parts!.length,
        sourceFiles: [...new Set(planned.parts!.map((part) => part.model))].map((model) =>
          findModel(packDirectory, model).slice(packDirectory.length + 1),
        ),
      });
      continue;
    }
    const source = findModel(packDirectory, planned.model);
    const read =
      extname(source).toLowerCase() === '.obj'
        ? readObj(source, planned.pack)
        : readGltf(source, packDirectory);
    const coated = planned.coat ? paintCoat(read, packDirectory, planned.coat) : read;
    const gltf = planned.pose ? holdPose(coated, planned.pose) : coated;
    // Kenney Nature Kit marks its materials unlit; light it like every other family.
    for (const material of gltf.json['materials'] ?? [])
      delete material.extensions?.KHR_materials_unlit;
    if (gltf.json['extensionsUsed'])
      gltf.json['extensionsUsed'] = gltf.json['extensionsUsed'].filter(
        (name: string) => name !== 'KHR_materials_unlit',
      );
    const stats = measure(gltf);
    const scale = round(
      planned.metres! /
        Math.max(extentAlong(planned.axis ?? subject.axis, stats.min, stats.max), 1e-6),
    );
    const file = planned.pack.startsWith('polyhaven/') ? name : `${slug(planned.pack)}-${name}`;
    const output = writeOutput(`${outputRoot}/${planned.family}/${file}.glb`, writeGlb(gltf));
    items.push({
      ...base,
      kind: 'model',
      ...output,
      scale,
      bounds: {
        min: stats.min.map((v) => round(v * scale)),
        max: stats.max.map((v) => round(v * scale)),
      },
      triangles: stats.triangles,
      textures: stats.textures,
      source: planned.pack,
      sourceFile: source.slice(packDirectory.length + 1),
      ...(planned.coat
        ? { coatFile: packFile(packDirectory, planned.coat)!.slice(packDirectory.length + 1) }
        : {}),
    });
  }

const catalog = {
  study: '2026-10-31-world-asset-survey',
  recipe: 'scripts/prepare-asset-survey.ts',
  families,
  categories,
  subjects: subjects.map(({ items: _, ...subject }) => subject),
  sources: packCredits,
  items,
};
const target = resolve(repository, values.catalog);
writeFileSync(target, JSON.stringify(catalog, null, 2) + '\n');
console.log(`Prepared ${items.length} survey items into ${workspace}; catalog ${target}`);
for (const pack of readdirSync(sources).filter((name) =>
  statSync(join(sources, name)).isDirectory(),
))
  if (!existsSync(join(sources, pack, 'download.json')) && pack !== 'polyhaven')
    console.warn('No provenance for', pack);
