/**
 * Prepare the game's replacements for its repainted low-poly stand-ins (AD09 "Replace
 * placeholders"): pieces chosen from Mike's likes in the asset survey page's Comparisons
 * (November 4-5, 2026). A stand-in whose chosen piece is already game art (the carved chest, the
 * worn post, the simplified fallen trunk) is named directly in the art selection instead.
 *
 *   OPEN_LEGEND_ASSET_WORKSPACE=/absolute/workspace tsx scripts/prepare-game-props.ts \
 *     --survey /absolute/asset-survey-workspace --library /absolute/asset-library-workspace
 *
 * Each replacement starts from the survey's or library's prepared, reviewed piece (`--survey` and
 * `--library` are their workspaces; each file must match its catalog's SHA-256) and keeps the real
 * size the page shows, with its footprint centred on the origin and its lowest point on the
 * ground (or a set multiple of that size, for a pile whose size its role sets), and only the
 * data and textures it uses, at most 512 px: these are small pieces seen from the gameplay
 * camera, and each file carries its own copy of its kit's texture set. The game
 * gives these item piles one small physical body whatever their model, so the size is only how
 * they look. The models go to the external workspace; the group catalog, with any credit the
 * license requires, is written into the checkout, and the art selection names each replacement
 * for the stand-in's appearance. docs/asset-workflow.md#edit-or-generate-art
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  compact,
  externalDirectory,
  measure,
  parseGlb,
  reduceImages,
  writeGlb,
} from './model-files.js';

const repository = resolve(import.meta.dirname, '..');
const { values } = parseArgs({
  options: { survey: { type: 'string' }, library: { type: 'string' } },
});
if (!values.survey || !values.library)
  throw new Error('Pass --survey DIR and --library DIR, the survey and library workspaces.');
const workspace = externalDirectory(process.env['OPEN_LEGEND_ASSET_WORKSPACE']);
const studyRoot = 'apps/client/src/props/art-study';
const group = 'source-library-props';

interface Replacement {
  /** The stand-in's art-study asset; the selection maps `study:<replaces>` to the replacement. */
  replaces: string;
  /** The chosen piece: `survey:<id>` or `library:<id>`. */
  piece: string;
  id: string;
  label: string;
  description: string;
  /** Multiplies the page's size, for a piece whose size its role sets: a loose stone pile. */
  scale?: number;
}
const replacements: Replacement[] = [
  {
    replaces: 'supplies-open-box',
    piece: 'survey:containers-megakit-crate-wooden',
    id: 'library-supplies-crate',
    label: 'Workshop supplies · Quaternius',
    description: 'The anchor kit’s wooden crate, which Mike liked in the survey.',
  },
  {
    replaces: 'workbench-open-bench',
    piece: 'survey:furniture-megakit-workbench',
    id: 'library-workbench',
    label: 'Riverside workbench · Quaternius',
    description: 'The anchor kit’s workbench, which Mike liked in the survey.',
  },
  {
    replaces: 'bundle-tied-bundle',
    piece: 'library:algumacoisaqq-medieval-village-kit-sm-vk-prop-bedroll',
    id: 'library-bundle-bedroll',
    label: 'Travelling bundle · Gruginski',
    description: 'The village kit’s tied bedroll, which Mike liked among the bundles.',
  },
  {
    replaces: 'bundle-rolled-wool',
    piece: 'library:algumacoisaqq-medieval-weapons-items-it-leather-backpack',
    id: 'library-bundle-backpack',
    label: 'Equipment bundle · Gruginski',
    description: 'A leather backpack, which Mike liked among the bundles.',
  },
  {
    replaces: 'river-stones-loose-stones',
    piece: 'library:algumacoisaqq-medieval-village-kit-sm-vk-pile-stone-1',
    id: 'library-river-stones',
    label: 'Loose river stones · Gruginski',
    description:
      'The village kit’s stone pile at a third of its size, a loose pile to gather from.',
    scale: 0.35,
  },
];

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const round = (value: number) => Math.round(value * 1e6) / 1e6;
const readJson = (path: string) => JSON.parse(readFileSync(join(repository, path), 'utf8'));
const collections = {
  survey: {
    catalog: readJson('apps/client/src/props/art-survey/catalog.json'),
    sources: readJson('art-direction/studies/2026-10-31-world-asset-survey/sources.json').packs,
    workspace: resolve(values.survey),
  },
  library: {
    catalog: readJson('apps/client/src/props/art-library/catalog.json'),
    sources: readJson('art-direction/studies/2026-11-04-asset-library/sources.json').packs,
    workspace: resolve(values.library),
    titles: new Map<string, string>(
      readJson('art-direction/studies/2026-11-04-asset-library/plan.json').packs.map(
        (pack: { id: string; title: string }) => [pack.id, pack.title],
      ),
    ),
  },
};
// Licenses that require a credit, with their deeds; public-domain dedications need none.
const attributionLicenses: Record<string, string> = {
  'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'CC BY 3.0': 'https://creativecommons.org/licenses/by/3.0/',
};
const publicDomain = new Set(['CC0 1.0']);
const standIns = new Map<string, { bounds: { min: number[]; max: number[] } }>(
  readdirSync(join(repository, studyRoot), { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() && existsSync(join(repository, studyRoot, entry.name, 'catalog.json')),
    )
    .flatMap((entry) => readJson(`${studyRoot}/${entry.name}/catalog.json`).assets ?? [])
    .map((asset: { id: string; bounds: { min: number[]; max: number[] } }) => [asset.id, asset]),
);

const recipe = {
  path: 'scripts/prepare-game-props.ts',
  sha256: sha256(readFileSync(join(repository, 'scripts/prepare-game-props.ts'))),
};
const helpers = {
  'model-files.ts': sha256(readFileSync(join(repository, 'scripts/model-files.ts'))),
};
const assets: Record<string, unknown>[] = [];
const sources: Record<string, unknown>[] = [];
const attribution: Record<string, unknown>[] = [];
const selections = readJson(`${studyRoot}/selections.json`);
for (const replacement of replacements) {
  if (!standIns.has(replacement.replaces))
    throw new Error(`No art-study asset ${replacement.replaces} to replace.`);
  const [from, pieceId] = replacement.piece.split(':') as ['survey' | 'library', string];
  const collection = collections[from];
  const item = collection.catalog.items.find((entry: { id: string }) => entry.id === pieceId);
  if (!item || item.kind !== 'model')
    throw new Error(`The ${from} catalog has no model ${pieceId}.`);
  const pack = collection.sources.find((entry: { id: string }) => entry.id === item.source);
  if (!pack) throw new Error(`The ${from} sources have no ${item.source}.`);
  const licenseUrl = attributionLicenses[pack.license];
  // An unlisted license could silently lose a credit Settings → Credits must show.
  if (!licenseUrl && !publicDomain.has(pack.license))
    throw new Error(`Add the credit rules for ${pack.license} before using ${item.source}.`);
  const bytes = readFileSync(join(collection.workspace, item.file));
  // The game version must come from the file Mike reviewed in the page.
  if (sha256(bytes) !== item.sha256) throw new Error(`${item.file} is not the reviewed file.`);
  const { json, bin } = parseGlb(bytes);

  // One new root gives the page's real size and sets the piece on its footprint.
  const scene = json['scenes'][json['scene'] ?? 0];
  const factor = replacement.scale ?? 1;
  json['nodes'].push({ name: 'OpenLegend placement', scale: Array(3).fill(item.scale * factor) });
  json['nodes'].at(-1).children = scene.nodes;
  json['scenes'] = [{ ...scene, nodes: [json['nodes'].length - 1] }];
  json['scene'] = 0;
  const placed = compact({ json: { ...json, animations: [] }, bin: bin! });
  const at = measure(placed);
  placed.json['nodes'].at(-1).translation = [
    -(at.min[0]! + at.max[0]!) / 2,
    -at.min[1]!,
    -(at.min[2]! + at.max[2]!) / 2,
  ];
  // Placement is measured above at full detail; only the images change here.
  const model = reduceImages(placed, 512);
  const stats = measure(model);
  const vertices = model.json['nodes'].reduce(
    (sum: number, node: any) =>
      node.mesh === undefined
        ? sum
        : sum +
          model.json['meshes'][node.mesh].primitives.reduce(
            (count: number, primitive: any) =>
              count + model.json['accessors'][primitive.attributes.POSITION].count,
            0,
          ),
    0,
  );
  const output = writeGlb(model);
  const file = `${studyRoot}/${group}/${replacement.id}.glb`;
  mkdirSync(dirname(join(workspace, file)), { recursive: true });
  writeFileSync(join(workspace, file), output);

  const title = from === 'library' ? collections.library.titles.get(item.source) : undefined;
  const work = title ? `${item.label} from ${title}` : item.label;
  assets.push({
    id: replacement.id,
    family: replacement.id,
    label: replacement.label,
    variant: from,
    description: replacement.description,
    recommended: true,
    file: `${replacement.id}.glb`,
    bounds: { min: stats.min.map(round), max: stats.max.map(round) },
    triangles: stats.triangles,
    vertices,
    textureSizes: stats.textures,
    sha256: sha256(output),
    source: `${work} by ${pack.creator}, ${pack.license}, ${pack.page}; placed on its footprint at ${factor === 1 ? 'the size' : `${factor} times the size`} the asset ${from} shows, by OpenLegend.`,
  });
  if (!sources.some((entry) => entry['page'] === pack.page))
    sources.push({
      page: pack.page,
      creator: pack.creator,
      license: pack.license,
      file: pack.file,
      bytes: pack.bytes,
      sha256: pack.sha256,
      retrieved: pack.retrieved,
    });
  // Shown in Settings → Credits; public-domain sources need none.
  if (licenseUrl)
    attribution.push({
      work,
      creator: pack.creator,
      url: pack.page,
      license: pack.license,
      licenseUrl,
      changes:
        factor === 1
          ? 'Placed on its footprint by OpenLegend.'
          : 'Resized and placed by OpenLegend.',
    });
  selections[`study:${replacement.replaces}`] = `study:${replacement.id}`;
  const size = [0, 1, 2].map((axis) => (stats.max[axis]! - stats.min[axis]!).toFixed(2));
  console.log(
    `${replacement.id} for ${replacement.replaces}: ${size.join(' × ')} m, ${stats.triangles} triangles, textures ${JSON.stringify(stats.textures)}, ${output.byteLength} bytes`,
  );
}
const catalog = {
  group,
  recipe,
  helpers,
  sources,
  ...(attribution.length ? { attribution } : {}),
  assets,
};
mkdirSync(join(repository, studyRoot, group), { recursive: true });
writeFileSync(
  join(repository, studyRoot, group, 'catalog.json'),
  JSON.stringify(catalog, null, 2) + '\n',
);
writeFileSync(
  join(repository, studyRoot, 'selections.json'),
  JSON.stringify(selections, null, 2) + '\n',
);
console.log(`Prepared ${replacements.length} game props into ${workspace}`);
