/**
 * Prepare the November 4, 2026 asset library (art-direction/studies/2026-11-04-asset-library).
 *
 *   OPEN_LEGEND_ASSET_WORKSPACE=/absolute/workspace tsx scripts/prepare-asset-library.ts \
 *     --sources /absolute/library-sources --sources /absolute/survey-sources \
 *     --plan art-direction/studies/2026-11-04-asset-library/plan.json \
 *     --catalog apps/client/src/props/art-library/catalog.json
 *
 * Whole packs rather than hand-picked pieces: every model a pack's plan entry selects becomes one
 * GLB in the external workspace (one per object for a file holding a whole set), and every texture
 * set of a material pack becomes its colour, normal and roughness images. Each `--sources`
 * directory holds fetched downloads, one directory per pack (extracted when archived) with
 * download.json provenance; the first that has a pack supplies it. The plan's name rules file each
 * piece under a subject. Pieces are shown at the size their authors built them, the survey's median
 * scale for the same kit or the plan's unit for the pack, corrected by a power of ten when that
 * size is implausible for the subject (a model authored in centimetres). Pieces the October 31
 * survey already shows are skipped, so each appears once on the survey page. As in the survey,
 * geometry and materials are copied unchanged except that external buffers and images are embedded,
 * images over 1024 px are reduced, animated models hold the first frame of a standing clip, and
 * untextured exports get the textures their pack ships beside them: Fantasy Creatures' Godot coats,
 * the village kit's Godot materials or the plan's texture list. Each piece carries its pack's
 * confidence mark, "sure" or "fence" (on the fence), unless a plan rule marks it otherwise.
 * docs/asset-workflow.md#edit-or-generate-art
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  externalDirectory,
  godotResource,
  holdPose,
  linear,
  measure,
  mime,
  packFile,
  paintCoat,
  readGltf,
  splitScene,
  studyImage,
  textureAppender,
  writeGlb,
  type Gltf,
} from './model-files.js';

const repository = resolve(import.meta.dirname, '..');
const { values } = parseArgs({
  options: {
    sources: { type: 'string', multiple: true },
    plan: { type: 'string' },
    catalog: { type: 'string' },
  },
});
if (!values.sources?.length || !values.plan || !values.catalog)
  throw new Error('Usage: --sources DIR [--sources DIR] --plan PLAN.json --catalog CATALOG.json');
const sourceRoots = values.sources.map((path) => resolve(path));
const workspace = externalDirectory(process.env['OPEN_LEGEND_ASSET_WORKSPACE']);
const outputRoot = 'apps/client/src/props/art-library';

type Status = 'direction' | 'candidate' | 'current' | 'outside' | 'rejected';
type Fit = 'sure' | 'fence';
type Axis = 'height' | 'length' | 'max';
type Shape = 'ground' | 'wall' | 'floor' | 'roof';
interface Rule {
  subject: string;
  /** Regular expression matched from a word start in the file's words (see `words`). */
  match: string;
}
interface FitRule {
  match: string;
  fit: Fit;
  why: string;
}
interface Pack {
  id: string;
  title: string;
  creator: string;
  license: string;
  page: string;
  family: string;
  fit: Fit;
  why: string;
  /** Texture sets (one per directory) instead of models. */
  surfaces?: boolean;
  /** Regular expressions over the pack-relative path. */
  include?: string;
  exclude?: string;
  /** Rules tried before the plan's shared rules, and the subject when none matches. */
  rules?: Rule[];
  subject?: string;
  fits?: FitRule[];
  /** Metres per model unit, before any power-of-ten correction. */
  unit?: number;
  /** Paint untextured models with the coat material beside them (Fantasy Creatures). */
  coat?: boolean;
  /** Regular expression naming the clip whose first frame an animated model holds. */
  pose?: string;
  /** Folder (in the pack) of Godot material resources named like the glTF materials they paint. */
  godotMaterials?: string;
  /** Regular expression for leading kit words to drop from names before matching (`sm vki`). */
  prefix?: string;
  /** The part of `prefix` that labels drop too, when matching drops more (`orc` in `orc anvil`). */
  labelPrefix?: string;
  /** Label a single-file pack's piece with the pack's title (files named by an id). */
  nameFromTitle?: boolean;
  /** Texture files, by material name, for exports that left them out (paths in the pack). `file`
   * limits a set to models whose pack-relative path it matches, for kits that reuse one material
   * name over several atlases. */
  textures?: {
    file?: string;
    material: string;
    color: string;
    normal?: string;
    roughness?: string;
  }[];
  /** One piece per object for files that hold a whole set (see `splitScene`). */
  split?: boolean;
  /** Regular expression over split pieces' names to leave out. */
  excludePieces?: string;
}
interface Plan {
  study: string;
  /** New families; a pack may also use a survey family. Colours tell families apart on the page. */
  families: {
    id: string;
    label: string;
    source: string;
    status: Status;
    note: string;
    color: string;
  }[];
  categories: { id: string; label: string }[];
  subjects: { id: string; category: string; label: string; note: string; axis: Axis }[];
  /** Plausible extent along each subject's axis, in metres. */
  ranges: Record<string, [number, number]>;
  shapes: Record<string, Shape>;
  rules: Rule[];
  maxTriangles: number;
  packs: Pack[];
  paid: {
    name: string;
    creator: string;
    url: string;
    price: string;
    license: string;
    formats: string;
    contents: string;
    area: string;
    fit: Fit;
    why: string;
  }[];
  /** Models found but not yet fetched (for example during a download limit); not prepared. */
  pending?: unknown[];
}
const plan = JSON.parse(readFileSync(resolve(repository, values.plan), 'utf8')) as Plan;
const survey = JSON.parse(
  readFileSync(resolve(repository, 'apps/client/src/props/art-survey/catalog.json'), 'utf8'),
) as {
  families: { id: string }[];
  subjects: { id: string; axis: Axis }[];
  items: { kind: string; subject: string; scale?: number; source?: string; sourceFile?: string }[];
};

// A plan mistake would file pieces under a subject or family the page cannot show; refuse it here.
const subjectAxes = new Map<string, Axis>([
  ...survey.subjects.map((subject) => [subject.id, subject.axis] as const),
  ...plan.subjects.map((subject) => [subject.id, subject.axis] as const),
]);
const familyIds = new Set([...survey.families, ...plan.families].map((family) => family.id));
for (const rule of [...plan.rules, ...plan.packs.flatMap((pack) => pack.rules ?? [])])
  if (!subjectAxes.has(rule.subject)) throw new Error(`Unknown subject ${rule.subject}`);
for (const pack of plan.packs) {
  if (!familyIds.has(pack.family)) throw new Error(`Unknown family ${pack.family}`);
  if (pack.subject && !subjectAxes.has(pack.subject))
    throw new Error(`Unknown subject ${pack.subject}`);
}
// The survey chose each piece's real size by hand; the median scale it gave a kit's pieces in a
// subject (else in any subject) calibrates the same kit's other pieces.
const calibration = new Map<string, number>();
{
  const groups = new Map<string, number[]>();
  for (const item of survey.items)
    if (item.kind === 'model' && item.source && item.scale)
      for (const key of [item.source, `${item.source}\n${item.subject}`])
        groups.set(key, [...(groups.get(key) ?? []), item.scale]);
  for (const [key, scales] of groups)
    calibration.set(key, scales.sort((a, b) => a - b)[Math.floor(scales.length / 2)]!);
}
const inSurvey = new Set(
  survey.items
    .filter((item) => item.sourceFile)
    .map((item) => `${item.source}\n${item.sourceFile}`),
);

/** A path or name as lower-case words: `BookGroup_Medium_1.gltf` becomes `book group medium 1`. */
const words = (value: string) =>
  value
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])([0-9])/g, '$1 $2')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
const compile = (rule: Rule) => ({
  ...rule,
  start: new RegExp(`^(?:${rule.match})`, 'i'),
  test: new RegExp(`\\b(?:${rule.match})`, 'i'),
});
const sharedRules = plan.rules.map(compile);
// Kits name files head noun first (`Roof_Wooden_2x1_Center_Mirror`), often after a generic prefix.
const genericPrefix = /^(prop|props|sm|pm|env|mesh|model) /;
/** A rule matching the start of the file's name decides first, then one matching anywhere in it,
 * then the file's folders; rules are tried in plan order (the pack's own first). */
function subjectOf(pack: Pack, path: string): string | undefined {
  const rules = [...(pack.rules ?? []).map(compile), ...sharedRules];
  const name = words(path.split('/').at(-1)!)
    .replace(prefixOf(pack), '')
    .replace(genericPrefix, '');
  const folders = words(dirname(path));
  return (
    rules.find((rule) => rule.start.test(name))?.subject ??
    rules.find((rule) => rule.test.test(name))?.subject ??
    rules.find((rule) => rule.test.test(folders))?.subject ??
    pack.subject
  );
}
function fitOf(pack: Pack, path: string): { fit: Fit; why: string } {
  const name = words(path);
  const rule = (pack.fits ?? []).find((entry) =>
    new RegExp(`\\b(?:${entry.match})`, 'i').test(name),
  );
  return rule ? { fit: rule.fit, why: rule.why } : { fit: pack.fit, why: pack.why };
}
/** A piece's name from its file, folder or object, without resolution and format tags (`1k jpg`)
 * or the `Armature` that Blender exports name a rigged object's top node after. */
const nameOf = (path: string) =>
  words(path.split('/').at(-1)!)
    .replace(/\b([0-9]+k|jpg|png)\b/g, '')
    .replace(/ armature$/, '')
    .replace(/ +/g, ' ')
    .trim();
/** A pack's leading kit words (`sm vki`), else a generic prefix such as `prop`. */
const prefixOf = (pack: Pack) => (pack.prefix ? new RegExp(`^(?:${pack.prefix})`) : genericPrefix);
const label = (pack: Pack, path: string) => {
  const kit = pack.labelPrefix ?? pack.prefix;
  const text = nameOf(path)
    .replace(kit ? new RegExp(`^(?:${kit})`) : genericPrefix, '')
    .replace(genericPrefix, '')
    .trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
};
const slug = (path: string) => nameOf(path).replace(/ /g, '-');
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const round = (value: number) => Math.round(value * 1e5) / 1e5;

function files(directory: string): string[] {
  const found: string[] = [];
  const walk = (folder: string) => {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const path = join(folder, entry.name);
      if (entry.isDirectory()) walk(path);
      else found.push(path);
    }
  };
  walk(directory);
  return found.sort();
}
function writeOutput(path: string, bytes: Uint8Array) {
  const target = join(workspace, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, bytes);
}

/** The given size, unless the piece's largest dimension is more than five times outside the
 * subject's plausible range (a model authored in centimetres): then the power of ten that brings it
 * nearest the middle of that range. Measuring the largest dimension keeps flat pieces, such as
 * floor covers, from reading as implausibly small. */
function scaleFor(extent: number, unit: number, [low, high]: [number, number]) {
  const fits = (scale: number) => extent * scale >= low && extent * scale <= high;
  if (extent * unit >= low / 5 && extent * unit <= high * 5)
    return { scale: unit, sized: undefined };
  const middle = Math.sqrt(low * high);
  const corrected = [-3, -2, -1, 1, 2, 3]
    .map((power) => unit * 10 ** power)
    .filter(fits)
    .sort(
      (a, b) =>
        Math.abs(Math.log((extent * a) / middle)) - Math.abs(Math.log((extent * b) / middle)),
    )[0];
  return corrected
    ? { scale: corrected, sized: 'corrected' as const }
    : { scale: unit, sized: 'implausible' as const };
}
const largest = (min: number[], max: number[]) =>
  Math.max(...[0, 1, 2].map((i) => max[i]! - min[i]!));

/** The coats beside a Fantasy Creatures model, one per material: `M_Dragon_WingAsh` paints
 * `M_DragonWing`. Longer material names claim their coats first, so the body never takes a wing's.
 * The body takes its base coat, else its first variant; other parts prefer the body's variant. */
function coatsFor(path: string, materials: readonly string[]): string[] {
  const files = readdirSync(dirname(path))
    .filter((name) => /^M_.*\.tres$/.test(name))
    .sort();
  const key = (name: string) =>
    name
      .replace(/\.tres$/, '')
      .replace(/_/g, '')
      .toLowerCase();
  const claimed = new Map<number, string[]>();
  const taken = new Set<string>();
  for (const index of materials
    .map((_, i) => i)
    .sort((a, b) => key(materials[b]!).length - key(materials[a]!).length)) {
    const own = files.filter(
      (file) => !taken.has(file) && key(file).startsWith(key(materials[index]!)),
    );
    for (const file of own) taken.add(file);
    claimed.set(index, own.length || materials.length > 1 ? own : files);
  }
  const variant = (index: number, file: string) => key(file).slice(key(materials[index]!).length);
  const body = claimed.get(0) ?? [];
  const bodyCoat = body.find((file) => /_Base\.tres$/.test(file)) ?? body[0];
  return materials.map((_, index) => {
    const own = claimed.get(index)!;
    const coat =
      index === 0
        ? bodyCoat
        : (own.find((file) => bodyCoat && variant(index, file) === variant(0, bodyCoat)) ?? own[0]);
    if (!coat) throw new Error(`no coat beside the model for ${materials[index]}`);
    return coat;
  });
}
/** Puts a pack's separately shipped colour, normal and roughness images on the materials they
 * belong to. A greyscale roughness image serves as glTF's metallic-roughness texture, whose green
 * channel carries roughness; metalness stays off. */
function attachTextures(
  gltf: Gltf,
  packDirectory: string,
  sets: NonNullable<Pack['textures']>,
  model: string,
): Gltf {
  const textures = textureAppender(gltf);
  const modelPath = relative(packDirectory, model);
  const modelSets = sets.filter(
    (entry) => !entry.file || new RegExp(entry.file, 'i').test(modelPath),
  );
  const file = (path: string) => {
    const target = resolve(packDirectory, path);
    // The pack is downloaded data; its plan entry must not pull other local files into a model.
    if (!target.startsWith(packDirectory + '/'))
      throw new Error('A texture path escaped its pack.');
    return textures.add(target);
  };
  for (const material of gltf.json['materials'] ?? []) {
    const set = modelSets.find((entry) =>
      new RegExp(entry.material, 'i').test(material.name ?? ''),
    );
    if (!set) continue;
    material.pbrMetallicRoughness = {
      ...material.pbrMetallicRoughness,
      baseColorFactor: [1, 1, 1, 1],
      baseColorTexture: { index: file(set.color) },
      ...(set.roughness
        ? {
            metallicRoughnessTexture: { index: file(set.roughness) },
            metallicFactor: 0,
            roughnessFactor: 1,
          }
        : {}),
    };
    if (set.normal) material.normalTexture = { index: file(set.normal) };
  }
  return textures.finish();
}
/** Applies the Godot material resource named like each glTF material: an albedo map times the
 * base colour (glTF multiplies by the vertex colours itself, as the kit's shader does), a
 * greyscale roughness map in the metallic-roughness texture's green channel, and a normal map. */
function paintGodotMaterials(gltf: Gltf, packDirectory: string, folder: string): Gltf {
  const project = packFile(packDirectory, 'project.godot');
  if (!project) throw new Error('no project.godot in the pack');
  const textures = textureAppender(gltf);
  for (const material of gltf.json['materials'] ?? []) {
    const file = join(packDirectory, folder, `${material.name}.tres`);
    if (!existsSync(file)) continue;
    const { value, resource } = godotResource(file, project, packDirectory);
    // Some materials name maps the pack does not ship; those are left unpainted.
    const shipped = (name: string) => {
      const path = resource(name);
      return path && existsSync(path) ? path : undefined;
    };
    const color = shipped('shader_parameter/albedo_map');
    if (!color) continue;
    const tint = value('shader_parameter/base_color')
      ?.match(/Color\(([^)]+)\)/)?.[1]
      ?.split(',')
      .map(Number) ?? [1, 1, 1];
    const rough =
      value('shader_parameter/use_rough_map') === 'true'
        ? shipped('shader_parameter/rough_map')
        : undefined;
    const normal =
      value('shader_parameter/use_normal_map') === 'true'
        ? shipped('shader_parameter/normal_map')
        : undefined;
    material.pbrMetallicRoughness = {
      baseColorTexture: { index: textures.add(color) },
      baseColorFactor: [...tint.slice(0, 3).map(linear), 1],
      // A greyscale roughness map would also read as metalness, so metal stays painted.
      metallicFactor: rough ? 0 : Number(value('shader_parameter/metallic') ?? 0),
      roughnessFactor: rough ? 1 : Number(value('shader_parameter/roughness') ?? 0.8),
      ...(rough ? { metallicRoughnessTexture: { index: textures.add(rough) } } : {}),
    };
    if (normal) material.normalTexture = { index: textures.add(normal) };
    if (/TwoSided/.test(resource('shader') ?? '')) material.doubleSided = true;
  }
  return textures.finish();
}
function prepareModel(pack: Pack, packDirectory: string, path: string): Gltf {
  let gltf = readGltf(path, packDirectory);
  if (pack.textures) gltf = attachTextures(gltf, packDirectory, pack.textures, path);
  if (pack.godotMaterials) gltf = paintGodotMaterials(gltf, packDirectory, pack.godotMaterials);
  if (pack.coat)
    gltf = paintCoat(
      gltf,
      packDirectory,
      coatsFor(
        path,
        (gltf.json['materials'] ?? []).map((material: any) => material.name ?? ''),
      ),
    );
  const clips: string[] = (gltf.json['animations'] ?? [])
    .map((animation: any) => animation.name)
    .filter(Boolean);
  const still =
    clips.find((name) => new RegExp(pack.pose ?? 'idle|stand|breath', 'i').test(name)) ?? clips[0];
  return still ? holdPose(gltf, still) : gltf;
}

// A set's lower levels of detail repeat its pieces; only the full-detail object is shown.
const lowerDetail = /\blod ?_?[1-9]\b|_lod[1-9]\b/i;
const excludedPiece = (pack: Pack) =>
  pack.excludePieces ? new RegExp(pack.excludePieces, 'i') : undefined;
const shapes = plan.shapes;
/** Map images by the names material libraries use; OpenGL-style normals are preferred. */
const mapPatterns: [keyof Maps, RegExp][] = [
  ['color', /(^|[_ -])(color|col|diff|diffuse|albedo|base ?color|basecolor)([_ -.]|$)/i],
  ['normal', /(^|[_ -])(normal ?gl|nor ?gl)([_ -.]|$)/i],
  ['normal', /(^|[_ -])(normal|nor)([_ -.]|$)/i],
  ['roughness', /(^|[_ -])(roughness|rough)([_ -.]|$)/i],
  ['arm', /(^|[_ -])arm([_ -.]|$)/i],
];
interface Maps {
  color?: string;
  normal?: string;
  roughness?: string;
  arm?: string;
}

const items: Record<string, unknown>[] = [];
const skipped: { source: string; file: string; reason: string }[] = [];
const sources: Record<string, { creator: string; license: string; page: string }> = {};
/** Pieces are named by pack and file, not subject, so a revised rule keeps their ids and likes. */
const names = new Set<string>();
const uniqueName = (pack: string, path: string) => {
  const base = `${pack}-${slug(path)}`;
  let name = base;
  for (let n = 2; names.has(name); n++) name = `${base}-${n}`;
  names.add(name);
  return { id: name, file: name.slice(pack.length + 1) };
};

for (const pack of plan.packs) {
  const root = sourceRoots.map((directory) => join(directory, pack.id)).find(existsSync);
  if (!root) throw new Error(`Fetch ${pack.id} into one of the --sources directories first.`);
  sources[pack.id] = { creator: pack.creator, license: pack.license, page: pack.page };
  const include = new RegExp(
    pack.include ?? (pack.surfaces ? '\\.(jpe?g|png)$' : '\\.(gltf|glb)$'),
    'i',
  );
  const exclude = pack.exclude ? new RegExp(pack.exclude, 'i') : undefined;
  const selected = files(root)
    .map((path) => relative(root, path))
    // An exclusion may name a raw path or the readable words of one (`coffee table`).
    .filter((path) => include.test(path) && !exclude?.test(path) && !exclude?.test(words(path)));
  let added = 0;

  if (pack.surfaces) {
    const sets = new Map<string, Maps>();
    for (const path of selected) {
      const kind = mapPatterns.find(([, test]) => test.test(path.split('/').at(-1)!))?.[0];
      if (!kind) continue;
      const set = sets.get(dirname(path)) ?? {};
      set[kind] ??= path;
      sets.set(dirname(path), set);
    }
    for (const [folder, maps] of sets) {
      // An archive's `extracted` folder is named for the material folder that holds it.
      const named = folder.replace(/\/extracted$/, '');
      const subject = subjectOf(pack, named);
      if (!subject || !maps.color) {
        skipped.push({
          source: pack.id,
          file: folder,
          reason: maps.color ? 'no subject rule' : 'no colour map',
        });
        continue;
      }
      const { id, file: name } = uniqueName(pack.id, named);
      const written: Record<string, unknown> = {};
      for (const kind of ['color', 'normal', 'roughness', 'arm'] as const) {
        if (!maps[kind] || (kind === 'arm' && maps.roughness)) continue;
        const bytes = studyImage(readFileSync(join(root, maps[kind])));
        const file = `${outputRoot}/${pack.id}/${name}/${kind}${mime(bytes) === 'image/png' ? '.png' : '.jpg'}`;
        writeOutput(file, bytes);
        // An ambient/roughness/metal image keeps roughness in its green channel.
        written[kind === 'arm' ? 'roughness' : kind] = {
          file,
          sha256: sha256(bytes),
          bytes: bytes.byteLength,
          ...(kind === 'arm' ? { channel: 'g' } : {}),
        };
      }
      items.push({
        id,
        subject,
        family: pack.family,
        label: label(pack, named),
        inGame: false,
        kind: 'surface',
        maps: written,
        options: { shape: shapes[subject] ?? 'ground' },
        source: pack.id,
        sourceFile: folder,
        ...fitOf(pack, named),
      });
      added++;
    }
    console.log(`${pack.id}: ${added} surfaces`);
    continue;
  }

  for (const path of selected) {
    const skip = (reason: string, file = path) => skipped.push({ source: pack.id, file, reason });
    if (inSurvey.has(`${pack.id}\n${path}`)) {
      skip('in the October 31 survey');
      continue;
    }
    let parts: { name: string; gltf: Gltf }[];
    try {
      const prepared = prepareModel(pack, root, join(root, path));
      parts = pack.split ? splitScene(prepared) : [{ name: '', gltf: prepared }];
    } catch (error) {
      // Downloaded third-party files can be malformed; one broken model must not stop the rest.
      skip(`unreadable: ${(error as Error).message}`);
      continue;
    }
    for (const { name: piece, gltf } of parts) {
      // A split piece is named, filed and credited by its own object name within the file.
      const named = piece ? `${dirname(path)}/${piece}` : path;
      const sourceFile = piece ? `${path}#${piece}` : path;
      if (piece && (lowerDetail.test(piece) || excludedPiece(pack)?.test(piece))) {
        skip('lower-detail or excluded piece', sourceFile);
        continue;
      }
      const subject = subjectOf(pack, named);
      if (!subject) {
        skip('no subject rule', sourceFile);
        continue;
      }
      let measured: ReturnType<typeof measure>;
      try {
        measured = measure(gltf);
      } catch (error) {
        skip(`unreadable: ${(error as Error).message}`, sourceFile);
        continue;
      }
      if (measured.triangles > plan.maxTriangles) {
        skip(`${measured.triangles.toLocaleString('en')} triangles`, sourceFile);
        continue;
      }
      const bytes = writeGlb(gltf);
      const { id, file: name } = uniqueName(
        pack.id,
        // A file named by an id (`nameFromTitle`) adds nothing to its pieces' names.
        piece && !pack.nameFromTitle ? `${words(path.split('/').at(-1)!)} ${piece}` : piece || path,
      );
      const file = `${outputRoot}/${pack.id}/${name}.glb`;
      writeOutput(file, bytes);
      const calibrated = calibration.get(`${pack.id}\n${subject}`) ?? calibration.get(pack.id);
      const { scale, sized } = scaleFor(
        largest(measured.min, measured.max),
        calibrated ?? pack.unit ?? 1,
        plan.ranges[subject] ?? [0.01, 100],
      );
      const clips = (gltf.json['animations'] ?? []).length;
      items.push({
        id,
        subject,
        family: pack.family,
        label: !piece && pack.nameFromTitle ? pack.title : label(pack, named),
        inGame: false,
        kind: 'model',
        file,
        sha256: sha256(bytes),
        bytes: bytes.byteLength,
        scale: round(scale),
        // How the size was set when it is not the author's: from the survey, or by a power of ten.
        ...(sized ? { sized } : calibrated !== undefined ? { sized: 'calibrated' } : {}),
        // In metres at the shown size, as the survey records them: the page grounds and spaces
        // pieces by their bounds.
        bounds: {
          min: measured.min.map((value) => round(value * scale)),
          max: measured.max.map((value) => round(value * scale)),
        },
        triangles: measured.triangles,
        textures: measured.textures,
        ...(clips ? { animations: clips } : {}),
        source: pack.id,
        sourceFile,
        ...fitOf(pack, named),
      });
      added++;
    }
  }
  console.log(`${pack.id}: ${added} models from ${selected.length} files`);
}

// Distinct pieces that share a pack and a name (two subkits' lean-tos, a set's copies of one
// object name) are numbered apart on their cards.
const sameName = new Map<string, Record<string, unknown>[]>();
for (const item of items) {
  const key = `${item['source']}\n${item['label']}`;
  const group = sameName.get(key);
  if (group) group.push(item);
  else sameName.set(key, [item]);
}
for (const group of sameName.values())
  if (group.length > 1)
    group.forEach((item, index) => (item['label'] = `${item['label']} ${index + 1}`));

const catalog = {
  study: plan.study,
  recipe: 'scripts/prepare-asset-library.ts',
  families: plan.families,
  categories: plan.categories,
  subjects: plan.subjects,
  sources,
  items,
  paid: plan.paid,
  skipped,
};
writeFileSync(resolve(repository, values.catalog), JSON.stringify(catalog, null, 2) + '\n');
console.log(
  `${items.length} pieces from ${plan.packs.length} packs; ${skipped.length} files skipped.`,
);
