/**
 * Prepare the game's animals from the free sets Mike ranked on November 3, 2026 (AD09): WildMesh
 * 3D's painted doe, stag and brown bear first, then the Fantasy Creatures grey wolf, because
 * WildMesh 3D has no wolf. The hare and woodland bird keep their earlier models; neither set has
 * them.
 *
 *   OPEN_LEGEND_ASSET_WORKSPACE=/absolute/workspace tsx scripts/prepare-game-animals.ts \
 *     --survey /absolute/asset-survey-workspace
 *
 * Each animal starts from the world asset survey's prepared, reviewed model (`--survey` is that
 * survey's workspace; each file must match the survey catalog's SHA-256) and becomes one
 * art-study group the game's appearance selection can name: a still model standing in the first
 * frame of its idle, and a motion model with only the two clips the game plays, renamed `Idle`
 * and `Run` (apps/client/src/model-animation.ts). The game moves animals itself, so the walk that
 * plays as `Run` is held in place. Each model is scaled to the survey's real size, with its
 * footprint centred on the origin and its lowest point on the ground, and keeps only the data and
 * textures (at most 1024 px, as in the survey) those two files use. Models go to the external
 * workspace; the small group catalogs, with any credit the license requires, are written into the
 * checkout. docs/asset-workflow.md#edit-or-generate-art
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  compact,
  externalDirectory,
  holdPose,
  measure,
  parseGlb,
  writeGlb,
  type Gltf,
} from './model-files.js';

const repository = resolve(import.meta.dirname, '..');
const { values } = parseArgs({ options: { survey: { type: 'string' } } });
if (!values.survey) throw new Error('Pass --survey DIR, the asset survey workspace.');
const surveyWorkspace = resolve(values.survey);
const workspace = externalDirectory(process.env['OPEN_LEGEND_ASSET_WORKSPACE']);
const studyRoot = 'apps/client/src/props/art-study';

interface GameAnimal {
  /** Art-study group; the game names the asset as `study:<id>`. */
  group: string;
  id: string;
  /** World asset survey item the game version is made from. */
  survey: string;
  label: string;
  variant: string;
  description: string;
  /** Source clips the game plays as `Idle` and `Run`. */
  idle: string;
  walk: string;
  /** Node whose translation carries the source walk forward. */
  rootMotion: string;
  /** Source adaptation applied before this recipe, for the credit. */
  adapted?: string;
  /** Title for a source whose model file names none. */
  work?: string;
}
// WildMesh 3D's animals share one rig: RigRoot_01 carries each walk forward.
const animals: GameAnimal[] = [
  {
    group: 'source-wildmesh-doe',
    id: 'wildmesh-doe',
    survey: 'deer-wildmesh-doe-animated-cel-shading-3d-model',
    label: 'Doe · WildMesh 3D',
    variant: 'painted',
    description: 'WildMesh 3D’s painted doe with its breathing idle and walk.',
    idle: 'Stand_Breathing_01',
    walk: 'Walk',
    rootMotion: 'RigRoot_01',
  },
  {
    group: 'source-wildmesh-stag',
    id: 'wildmesh-stag',
    survey: 'deer-wildmesh-deer-animated-cel-shading-3d-model',
    label: 'Stag · WildMesh 3D',
    variant: 'painted',
    description: 'WildMesh 3D’s painted stag with its breathing idle and walk.',
    idle: 'Stand_Breathing_01',
    walk: 'Walk',
    rootMotion: 'RigRoot_01',
  },
  {
    group: 'source-wildmesh-bear',
    id: 'wildmesh-bear',
    survey: 'predators-wildmesh-bear-animated-cel-shading-3d-model',
    label: 'Brown bear · WildMesh 3D',
    variant: 'painted',
    description: 'WildMesh 3D’s painted brown bear with its breathing idle and walk.',
    idle: 'Stand_Breathing_01',
    walk: 'Walk',
    rootMotion: 'RigRoot_01',
  },
  {
    group: 'source-fantasy-wolf',
    id: 'fantasy-wolf-grey',
    survey: 'predators-creatures-wolf',
    label: 'Grey wolf · Fantasy Creatures',
    variant: 'grey',
    description: 'The Fantasy Creatures wolf in its grey coat, with its idle and walk.',
    idle: 'Idle',
    walk: 'Walk',
    rootMotion: 'Motion',
    adapted: 'grey coat applied as its Godot scene does',
    work: 'Wolf from Fantasy Creatures',
  },
];

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const round = (value: number) => Math.round(value * 1e6) / 1e6;
const survey = JSON.parse(
  readFileSync(join(repository, 'apps/client/src/props/art-survey/catalog.json'), 'utf8'),
);
const surveySources = JSON.parse(
  readFileSync(
    join(repository, 'art-direction/studies/2026-10-31-world-asset-survey/sources.json'),
    'utf8',
  ),
);
// Licenses that require a credit, with their deeds; public-domain dedications need none.
const attributionLicenses: Record<string, string> = {
  'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
};
const publicDomain = new Set(['CC0 1.0']);

/** Keeps the two clips the game plays, under the names it plays them by, and holds the walk in
 * place: the game moves the animal, so the clip must not carry it forward as well. Only the
 * skeleton's joints stay animated. Sketchfab's conversions also key the container nodes above
 * the skeleton, and the doe's walk resets its mirrored container's rotation, which turns the
 * whole doe over in every glTF player; the containers keep their stored placement instead. */
function keepClips(json: Record<string, any>, animal: GameAnimal) {
  const names = new Map([
    [animal.idle, 'Idle'],
    [animal.walk, 'Run'],
  ]);
  const root = json['nodes'].findIndex((node: any) => node.name === animal.rootMotion);
  if (root < 0) throw new Error(`${animal.id} has no ${animal.rootMotion} node.`);
  const joints = new Set<number>((json['skins'] ?? []).flatMap((skin: any) => skin.joints));
  json['animations'] = (json['animations'] ?? [])
    .filter((animation: any) => names.has(animation.name))
    .map((animation: any) => {
      const channels = animation.channels.filter(
        (channel: any) =>
          joints.has(channel.target.node) &&
          (channel.target.node !== root || channel.target.path !== 'translation'),
      );
      const used = [...new Set<number>(channels.map((channel: any) => channel.sampler))].sort(
        (a, b) => a - b,
      );
      const sampler = new Map(used.map((old, index) => [old, index]));
      return {
        ...animation,
        name: names.get(animation.name),
        channels: channels.map((channel: any) => ({
          ...channel,
          sampler: sampler.get(channel.sampler),
        })),
        samplers: used.map((index) => animation.samplers[index]),
      };
    });
  if (json['animations'].length !== names.size)
    throw new Error(`${animal.id} lacks ${animal.idle} or ${animal.walk}.`);
}

function writeOutput(relative: string, bytes: Uint8Array) {
  const path = join(workspace, relative);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
  return { file: relative, sha256: sha256(bytes), bytes: bytes.byteLength };
}

const recipe = {
  path: 'scripts/prepare-game-animals.ts',
  sha256: sha256(readFileSync(join(repository, 'scripts/prepare-game-animals.ts'))),
};
const helpers = {
  'model-files.ts': sha256(readFileSync(join(repository, 'scripts/model-files.ts'))),
};
for (const animal of animals) {
  const item = survey.items.find((entry: any) => entry.id === animal.survey);
  if (!item) throw new Error(`The survey catalog has no ${animal.survey}.`);
  const pack = surveySources.packs.find((entry: any) => entry.id === item.source);
  if (!pack) throw new Error(`The survey's sources.json has no ${item.source}.`);
  const licenseUrl = attributionLicenses[pack.license];
  // An unlisted license could silently lose a credit Settings → Credits must show.
  if (!licenseUrl && !publicDomain.has(pack.license))
    throw new Error(`Add the credit rules for ${pack.license} before using ${item.source}.`);
  const bytes = readFileSync(join(surveyWorkspace, item.file));
  // The game version must come from the file Mike reviewed in the survey.
  if (sha256(bytes) !== item.sha256) throw new Error(`${item.file} is not the reviewed file.`);
  const { json, bin } = parseGlb(bytes);
  const source = holdPose({ json, bin: bin! }, animal.idle);
  keepClips(source.json, animal);

  // One new root gives the survey's real size and sets the model on its footprint.
  const scene = source.json['scenes'][source.json['scene'] ?? 0];
  const root = { name: 'OpenLegend placement', scale: Array(3).fill(item.scale) };
  source.json['nodes'].push({ ...root, children: scene.nodes });
  source.json['scenes'] = [{ ...scene, nodes: [source.json['nodes'].length - 1] }];
  source.json['scene'] = 0;
  const motion = compact(source);
  const placed = measure(motion);
  Object.assign(motion.json['nodes'].at(-1), {
    translation: [
      -(placed.min[0]! + placed.max[0]!) / 2,
      -placed.min[1]!,
      -(placed.min[2]! + placed.max[2]!) / 2,
    ],
  });
  const still = compact({
    json: { ...structuredClone(motion.json), animations: [] },
    bin: motion.bin,
  });
  const stats = measure(still);
  const vertices = still.json['nodes'].reduce(
    (sum: number, node: any) =>
      node.mesh === undefined
        ? sum
        : sum +
          still.json['meshes'][node.mesh].primitives.reduce(
            (count: number, primitive: any) =>
              count + still.json['accessors'][primitive.attributes.POSITION].count,
            0,
          ),
    0,
  );

  const directory = `${studyRoot}/${animal.group}`;
  const stillFile = writeOutput(`${directory}/${animal.id}.glb`, writeGlb(still));
  const motionFile = writeOutput(`${directory}/${animal.id}-motion.glb`, writeGlb(motion));
  const title: string = json['asset']?.extras?.title ?? animal.work ?? item.label;
  const height = (stats.max[1]! - stats.min[1]!).toFixed(2);
  const changes = `resized to ${height} m, standing in the first frame of its idle, with only that idle and its walk, held in place`;
  const asset = {
    id: animal.id,
    family: animal.id,
    label: animal.label,
    variant: animal.variant,
    description: animal.description,
    recommended: true,
    file: `${animal.id}.glb`,
    bounds: { min: stats.min.map(round), max: stats.max.map(round) },
    triangles: stats.triangles,
    vertices,
    textureSizes: stats.textures,
    sha256: stillFile.sha256,
    source: `${title} by ${pack.creator}, ${pack.license}, ${pack.page}; ${[animal.adapted, changes].filter(Boolean).join('; ')}, by OpenLegend.`,
    animatedFile: `${animal.id}-motion.glb`,
    animatedSha256: motionFile.sha256,
  };
  const catalog = {
    group: animal.group,
    recipe,
    helpers,
    survey: { item: item.id, file: item.file, sha256: item.sha256 },
    sources: [
      {
        page: pack.page,
        creator: pack.creator,
        license: pack.license,
        file: pack.file,
        ...(item.sourceFile && item.sourceFile !== pack.file ? { model: item.sourceFile } : {}),
        ...(item.coatFile ? { coat: item.coatFile } : {}),
        bytes: pack.bytes,
        sha256: pack.sha256,
        retrieved: pack.retrieved,
      },
    ],
    // Shown in Settings → Credits; public-domain sources need none.
    ...(licenseUrl
      ? {
          attribution: [
            {
              work: title,
              creator: pack.creator,
              url: pack.page,
              license: pack.license,
              licenseUrl,
              changes: 'Resized by OpenLegend, keeping only its standing and walking animations.',
            },
          ],
        }
      : {}),
    assets: [asset],
  };
  mkdirSync(join(repository, directory), { recursive: true });
  writeFileSync(
    join(repository, directory, 'catalog.json'),
    JSON.stringify(catalog, null, 2) + '\n',
  );
  console.log(
    `${animal.id}: ${height} m tall, ${stats.triangles} triangles, textures ${JSON.stringify(stats.textures)}; still ${stillFile.bytes} bytes, motion ${motionFile.bytes} bytes`,
  );
}
console.log(`Prepared ${animals.length} game animals into ${workspace}`);
