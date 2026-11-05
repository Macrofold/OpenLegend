/**
 * Model files for the offline asset recipes: binary glTF (GLB) read, posed, measured and written
 * without a 3D tool, into an external workspace. Shared by the asset survey, asset library and
 * game-animal recipes so they read and measure a model the same way.
 * docs/asset-workflow.md#edit-or-generate-art
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

/** Asset outputs belong outside every Git checkout (docs/asset-workflow.md#where-files-belong). */
export function externalDirectory(value: string | undefined): string {
  if (!value) throw new Error('Set OPEN_LEGEND_ASSET_WORKSPACE to an external asset workspace.');
  const target = resolve(value);
  for (let parent = target; ; parent = dirname(parent)) {
    if (existsSync(join(parent, '.git')))
      throw new Error('Asset outputs must not be written into a Git checkout.');
    if (dirname(parent) === parent) break;
  }
  return target;
}

export interface Gltf {
  json: Record<string, any>;
  bin: Uint8Array;
}
export const align = (value: number) => (value + 3) & ~3;
export function concat(parts: Uint8Array[]): Uint8Array {
  const length = parts.reduce((sum, part) => sum + align(part.byteLength), 0);
  const out = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += align(part.byteLength);
  }
  return out;
}
export const mime = (bytes: Uint8Array) =>
  bytes[0] === 0x89 && bytes[1] === 0x50 ? 'image/png' : bytes[0] === 0xff ? 'image/jpeg' : '';
export function imageSize(bytes: Uint8Array): [number, number] {
  const view = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view[0] === 0x89) return [view.readUInt32BE(16), view.readUInt32BE(20)];
  for (let i = 2; i + 9 < view.length; ) {
    if (view[i] !== 0xff) break;
    const marker = view[i + 1]!;
    if (marker >= 0xc0 && marker <= 0xc3)
      return [view.readUInt16BE(i + 7), view.readUInt16BE(i + 5)];
    i += 2 + view.readUInt16BE(i + 2);
  }
  return [0, 0];
}

/** A GLB container's JSON and binary chunks. */
export function parseGlb(bytes: Buffer): { json: Record<string, any>; bin?: Uint8Array } {
  if (bytes.readUInt32LE(0) !== 0x46546c67) throw new Error('Not a binary glTF file.');
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8'));
  const binStart = 20 + jsonLength;
  const bin =
    binStart < bytes.length
      ? bytes.subarray(binStart + 8, binStart + 8 + bytes.readUInt32LE(binStart))
      : undefined;
  return { json, bin };
}

export function writeGlb({ json, bin }: Gltf): Uint8Array {
  const text = Buffer.from(JSON.stringify(json), 'utf8');
  const jsonChunk = Buffer.alloc(align(text.length), 0x20);
  text.copy(jsonChunk);
  const binChunk = Buffer.alloc(align(bin.byteLength));
  Buffer.from(bin.buffer, bin.byteOffset, bin.byteLength).copy(binChunk);
  const out = Buffer.alloc(12 + 8 + jsonChunk.length + (binChunk.length ? 8 + binChunk.length : 0));
  out.writeUInt32LE(0x46546c67, 0);
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(jsonChunk.length, 12);
  out.writeUInt32LE(0x4e4f534a, 16);
  jsonChunk.copy(out, 20);
  if (binChunk.length) {
    const at = 20 + jsonChunk.length;
    out.writeUInt32LE(binChunk.length, at);
    out.writeUInt32LE(0x004e4942, at + 4);
    binChunk.copy(out, at + 8);
  }
  return out;
}

/** Moves every node the clip animates to its first keyframe, so a page that plays no animation
 * shows that frame; the clips themselves are kept. */
export function holdPose(gltf: Gltf, clip: string): Gltf {
  const animation = (gltf.json['animations'] ?? []).find((entry: any) => entry.name === clip);
  if (!animation) throw new Error(`Missing animation ${clip}`);
  for (const channel of animation.channels) {
    const { node, path } = channel.target;
    if (node === undefined || path === 'weights') continue;
    const sampler = animation.samplers[channel.sampler];
    const size = path === 'rotation' ? 4 : 3;
    // A cubic spline keyframe stores its in-tangent before its value.
    const at = sampler.interpolation === 'CUBICSPLINE' ? size : 0;
    gltf.json['nodes'][node][path] = [
      ...accessorValues(gltf, sampler.output).subarray(at, at + size),
    ];
  }
  return gltf;
}

// ---------------------------------------------------------------------------------------------
// Measurement: rest-pose bounds as a renderer draws them, triangles and embedded image sizes.

type Mat = number[];
const identity = (): Mat => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function multiply(a: Mat, b: Mat): Mat {
  const out = new Array(16).fill(0);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 4; k++) out[c * 4 + r] += a[k * 4 + r]! * b[c * 4 + k]!;
  return out;
}
function local(node: any): Mat {
  if (node.matrix) return node.matrix;
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  return [
    (1 - 2 * (y * y + z * z)) * sx,
    2 * (x * y + z * w) * sx,
    2 * (x * z - y * w) * sx,
    0,
    2 * (x * y - z * w) * sy,
    (1 - 2 * (x * x + z * z)) * sy,
    2 * (y * z + x * w) * sy,
    0,
    2 * (x * z + y * w) * sz,
    2 * (y * z - x * w) * sz,
    (1 - 2 * (x * x + y * y)) * sz,
    0,
    tx,
    ty,
    tz,
    1,
  ];
}
const transform = (m: Mat, x: number, y: number, z: number) =>
  [0, 1, 2].map((k) => m[k]! * x + m[4 + k]! * y + m[8 + k]! * z + m[12 + k]!);
export const componentTypes: Record<
  number,
  [bytes: number, read: (data: DataView, at: number) => number, top: number]
> = {
  5120: [1, (data, at) => data.getInt8(at), 127],
  5121: [1, (data, at) => data.getUint8(at), 255],
  5122: [2, (data, at) => data.getInt16(at, true), 32767],
  5123: [2, (data, at) => data.getUint16(at, true), 65535],
  5125: [4, (data, at) => data.getUint32(at, true), 1],
  5126: [4, (data, at) => data.getFloat32(at, true), 1],
};
export const componentCounts: Record<string, number> = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT4: 16,
};
/** An accessor's elements in order; normalized integers become the fractions glTF defines. */
export function accessorValues({ json, bin }: Gltf, index: number): Float64Array {
  const accessor = json['accessors'][index];
  const view = json['bufferViews'][accessor.bufferView];
  const count = componentCounts[accessor.type]!;
  const [bytes, read, top] = componentTypes[accessor.componentType]!;
  const stride = view.byteStride ?? bytes * count;
  const data = new DataView(
    bin.buffer,
    bin.byteOffset + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0),
  );
  const values = new Float64Array(accessor.count * count);
  for (let element = 0; element < accessor.count; element++)
    for (let component = 0; component < count; component++) {
      const value = read(data, element * stride + component * bytes);
      values[element * count + component] = accessor.normalized ? Math.max(value / top, -1) : value;
    }
  return values;
}
export function measure(gltf: Gltf) {
  const { json, bin } = gltf;
  const min = [Infinity, Infinity, Infinity],
    max = [-Infinity, -Infinity, -Infinity];
  const extend = (point: number[]) =>
    point.forEach((v, k) => {
      min[k] = Math.min(min[k]!, v);
      max[k] = Math.max(max[k]!, v);
    });
  let triangles = 0;
  const nodes: any[] = json['nodes'] ?? [];
  const children = new Set(nodes.flatMap((n: any) => n.children ?? []));
  const roots: number[] =
    json['scenes']?.[json['scene'] ?? 0]?.nodes ??
    nodes.map((_: any, i: number) => i).filter((i: number) => !children.has(i));
  // A skinned mesh is drawn through its joints, which can sit anywhere in the scene.
  const worlds: Mat[] = [];
  const place = (index: number, parent: Mat) => {
    worlds[index] = multiply(parent, local(nodes[index]));
    for (const child of nodes[index].children ?? []) place(child, worlds[index]!);
  };
  for (const root of roots) place(root, identity());
  nodes.forEach((node, index) => {
    const world = worlds[index];
    if (node.mesh === undefined || !world) return;
    for (const primitive of json['meshes'][node.mesh].primitives) {
      if ((primitive.mode ?? 4) !== 4) continue;
      const position = json['accessors'][primitive.attributes.POSITION];
      triangles +=
        (primitive.indices !== undefined
          ? json['accessors'][primitive.indices].count
          : position.count) / 3;
      if (node.skin === undefined) {
        for (const x of [position.min[0], position.max[0]])
          for (const y of [position.min[1], position.max[1]])
            for (const z of [position.min[2], position.max[2]]) extend(transform(world, x, y, z));
        continue;
      }
      // glTF places a skinned vertex by its weighted joints (each joint's world matrix times its
      // inverse bind matrix) and ignores the mesh node's own transform. Sketchfab's conversions
      // keep such vertices at another scale, so the rest pose is measured vertex by vertex.
      const skin = json['skins'][node.skin];
      const inverse =
        skin.inverseBindMatrices === undefined
          ? undefined
          : accessorValues(gltf, skin.inverseBindMatrices);
      const joints: Mat[] = skin.joints.map((joint: number, k: number) =>
        inverse
          ? multiply(worlds[joint]!, [...inverse.subarray(k * 16, k * 16 + 16)])
          : worlds[joint]!,
      );
      const points = accessorValues(gltf, primitive.attributes.POSITION);
      const influences = [0, 1]
        .filter((set) => primitive.attributes[`JOINTS_${set}`] !== undefined)
        .map(
          (set) =>
            [
              accessorValues(gltf, primitive.attributes[`JOINTS_${set}`]),
              accessorValues(gltf, primitive.attributes[`WEIGHTS_${set}`]),
            ] as const,
        );
      for (let vertex = 0; vertex < position.count; vertex++) {
        const [x, y, z] = [points[vertex * 3]!, points[vertex * 3 + 1]!, points[vertex * 3 + 2]!];
        const placed = [0, 0, 0];
        for (const [indices, weights] of influences)
          for (let i = vertex * 4; i < vertex * 4 + 4; i++) {
            if (!weights[i]) continue;
            const moved = transform(joints[indices[i]!]!, x, y, z);
            for (let k = 0; k < 3; k++) placed[k] = placed[k]! + weights[i]! * moved[k]!;
          }
        extend(placed);
      }
    }
  });
  const textures = (json['images'] ?? []).map((image: any) => {
    const view = json['bufferViews'][image.bufferView];
    return imageSize(bin.subarray(view.byteOffset, view.byteOffset + view.byteLength));
  });
  return { min, max, triangles: Math.round(triangles), textures };
}

// ---------------------------------------------------------------------------------------------
// Reading a pack's glTF files into one self-contained binary model.

/** Files by name within each pack. Some packs export glTF beside a shared Textures folder
 * instead of beside each model; the shallowest file of that name is the pack's default. */
const packFiles = new Map<string, Map<string, string>>();
export function packFile(packRoot: string, name: string): string | undefined {
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
  if (!path.startsWith(packRoot + '/')) throw new Error('A model reference escaped its pack.');
  if (existsSync(path)) return readFileSync(path);
  // Some exporters name a renamed image `name_png.png` while the pack holds `name.png`.
  const fallback =
    packFile(packRoot, basename(path)) ??
    packFile(packRoot, basename(path).replace(/_(png|jpe?g)(\.[a-z]+)$/i, '$2'));
  if (!fallback) throw new Error(`Missing ${uri} for a model in ${packRoot}`);
  return readFileSync(fallback);
}
/** Images larger than 1024 px (or `limit`) are reduced to that size (macOS `sips`) so a lineup
 * of trim-sheet models fits in GPU memory; identical images are reduced once. */
const studyTextureLimit = 1024;
const reduced = new Map<string, Uint8Array>();
export function studyImage(bytes: Uint8Array, limit = studyTextureLimit): Uint8Array {
  if (Math.max(...imageSize(bytes)) <= limit) return bytes;
  const key = `${limit}:${createHash('sha256').update(bytes).digest('hex')}`;
  const existing = reduced.get(key);
  if (existing) return existing;
  const directory = mkdtempSync(join(tmpdir(), 'openlegend-study-image-'));
  try {
    const extension = mime(bytes) === 'image/png' ? '.png' : '.jpg';
    const input = join(directory, 'source' + extension);
    const output = join(directory, 'reduced' + extension);
    writeFileSync(input, bytes);
    execFileSync('sips', ['-Z', String(limit), input, '--out', output], {
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
  // Images already embedded in a source buffer keep their view unless the study limit reduces
  // them; a reduced copy is appended and the original bytes are left unused.
  const reducedEmbedded = new Map<any, Uint8Array>();
  for (const image of json['images'] ?? []) {
    if (image.uri !== undefined || image.bufferView === undefined) continue;
    const view = json['bufferViews'][image.bufferView];
    const start = view.byteOffset ?? 0;
    const original = buffers[view.buffer]!.subarray(start, start + view.byteLength);
    const bytes = studyImage(original);
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
        ? studyImage(uriBytes(image.uri, directory, packRoot))
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
  // Name each image by its content so the study pages can share one GPU texture between
  // models that embed the same trim sheet or colour atlas.
  for (const image of json['images'] ?? []) {
    const view = json['bufferViews'][image.bufferView];
    const bytes = combined.subarray(view.byteOffset, view.byteOffset + view.byteLength);
    image.name = `${image.name ?? 'image'}#${createHash('sha256').update(bytes).digest('hex').slice(0, 16)}`;
  }
  return { json, bin: combined };
}

/** A glTF or GLB file inside a pack as one self-contained model (see `embed`). */
export function readGltf(path: string, packRoot: string): Gltf {
  const bytes = readFileSync(path);
  if (bytes.readUInt32LE(0) === 0x46546c67) {
    const { json, bin } = parseGlb(bytes);
    return embed(json, bin, dirname(path), packRoot);
  }
  return embed(JSON.parse(bytes.toString('utf8')), undefined, dirname(path), packRoot);
}

/** Appends image files to a self-contained model as textures; `finish` rewrites its one buffer.
 * Each image is reduced like embedded ones and named by content, so the pages share the texture. */
export function textureAppender({ json, bin }: Gltf) {
  const parts = [bin];
  let length = align(bin.byteLength);
  return {
    add(path: string): number {
      const bytes = studyImage(readFileSync(path));
      json['bufferViews'] ??= [];
      json['bufferViews'].push({ buffer: 0, byteOffset: length, byteLength: bytes.byteLength });
      parts.push(bytes);
      length += align(bytes.byteLength);
      (json['images'] ??= []).push({
        bufferView: json['bufferViews'].length - 1,
        mimeType: mime(bytes),
        name: `${basename(path)}#${createHash('sha256').update(bytes).digest('hex').slice(0, 16)}`,
      });
      return (json['textures'] ??= []).push({ source: json['images'].length - 1 }) - 1;
    },
    finish(): Gltf {
      const combined = concat(parts);
      json['buffers'] = [{ byteLength: combined.byteLength }];
      return { json, bin: combined };
    },
  };
}

// Godot writes colour parameters in sRGB; glTF factors are linear.
export const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
/** A Godot resource file's `name = value` properties and the files its ExtResource values name,
 * whose res:// paths start at the project folder. The pack is downloaded data, so a reference
 * that leaves it is refused: no other local file may reach a published model. */
export function godotResource(file: string, project: string, packDirectory: string) {
  const text = readFileSync(file, 'utf8');
  const paths = new Map<string, string>();
  for (const [line] of text.matchAll(/^\[ext_resource .*\]$/gm)) {
    const path = line.match(/ path="res:\/\/([^"]+)"/)?.[1];
    const id = line.match(/ id="([^"]+)"/)?.[1];
    if (path && id) paths.set(id, resolve(dirname(project), path));
  }
  const value = (name: string) => text.match(new RegExp(`^${name} = (.+)$`, 'm'))?.[1];
  const resource = (name: string) => {
    const path = paths.get(value(name)?.match(/ExtResource\("([^"]+)"\)/)?.[1] ?? '');
    if (path && !path.startsWith(packDirectory + '/'))
      throw new Error('A Godot resource reference escaped its pack.');
    return path;
  };
  return { value, resource };
}

/** Fantasy Creatures ships its models untextured; each creature's Godot scene paints the body with
 * a coat material at runtime. Its shader (addons/beasts/shaders/creature_coat.gdshaderinc) takes
 * colour from the coat texture times a tint, roughness from 1 − alpha × smoothness and an optional
 * OpenGL normal map; each of the model's materials is replaced, in order, with the coat named for
 * it (wings, a harness or an ooze's contents have their own). glTF cannot read roughness from a
 * colour texture's alpha. Most of each coat has alpha near 0.1 (the eagle's near 0.2), so roughness
 * is the constant 0.9: the eagle's feathers come out slightly more matte, and the few glossier
 * spots, such as eyes and noses, lose their gloss. Translucent wings are drawn opaque. */
export function paintCoat(
  { json, bin }: Gltf,
  packDirectory: string,
  coats: readonly string[],
): Gltf {
  const project = packFile(packDirectory, 'project.godot');
  if (!project) throw new Error(`Missing project.godot in ${packDirectory}`);
  const materials: any[] = json['materials'] ?? [];
  if (materials.length !== coats.length)
    throw new Error(`${coats.length} coats for a model with ${materials.length} materials.`);

  const textures = textureAppender({ json, bin });
  json['materials'] = materials.map((original, index) => {
    const coat = coats[index]!;
    const material = packFile(packDirectory, coat);
    if (!material) throw new Error(`Missing ${coat} in ${packDirectory}`);
    const { value, resource } = godotResource(material, project, packDirectory);
    const coatImage = resource('shader_parameter/coat');
    if (!coatImage) throw new Error(`${coat} names no coat texture.`);
    const tint = value('shader_parameter/tint')
      ?.match(/Color\(([^)]+)\)/)?.[1]!
      .split(',')
      .map(Number);
    const smoothness = Number(value('shader_parameter/smoothness') ?? 1);
    const normalMap =
      value('shader_parameter/use_normal_map') === 'true'
        ? resource('shader_parameter/normal_map')
        : undefined;
    return {
      name: original.name,
      ...(resource('shader')?.endsWith('_two_sided.gdshader') ? { doubleSided: true } : {}),
      pbrMetallicRoughness: {
        baseColorTexture: { index: textures.add(coatImage) },
        baseColorFactor: [...(tint ?? [1, 1, 1]).slice(0, 3).map(linear), 1],
        metallicFactor: 0,
        roughnessFactor: Math.round((1 - 0.1 * smoothness) * 1e5) / 1e5,
      },
      ...(normalMap
        ? {
            normalTexture: {
              index: textures.add(normalMap),
              scale: Number(value('shader_parameter/normal_scale') ?? 1),
            },
          }
        : {}),
    };
  });
  // The exported material's specular extension does not reach the creator's coat shader.
  const used = (json['extensionsUsed'] ?? []).filter(
    (name: string) => name !== 'KHR_materials_specular',
  );
  if (used.length) json['extensionsUsed'] = used;
  else delete json['extensionsUsed'];
  return textures.finish();
}
/** Keeps only the accessors, images, textures and samplers that the meshes, skins, materials and
 * animations use, and rewrites the binary buffer with one buffer view each. The survey's files
 * also carry every source clip and each reduced image's unreduced original, and Sketchfab packs
 * all clips' keyframes into a few shared views, so whole views cannot simply be kept. */
export function compact({ json, bin }: Gltf): Gltf {
  const kept = (list: any[] | undefined, used: Set<number>) => {
    const order = [...used].sort((a, b) => a - b);
    return {
      items: order.map((index) => list![index]),
      at: new Map(order.map((old, index) => [old, index])),
    };
  };
  const accessorRefs: [object: any, key: string | number][] = [];
  for (const mesh of json['meshes'] ?? [])
    for (const primitive of mesh.primitives) {
      for (const key of Object.keys(primitive.attributes))
        accessorRefs.push([primitive.attributes, key]);
      if (primitive.indices !== undefined) accessorRefs.push([primitive, 'indices']);
      for (const target of primitive.targets ?? [])
        for (const key of Object.keys(target)) accessorRefs.push([target, key]);
    }
  for (const skin of json['skins'] ?? [])
    if (skin.inverseBindMatrices !== undefined) accessorRefs.push([skin, 'inverseBindMatrices']);
  for (const animation of json['animations'] ?? [])
    for (const sampler of animation.samplers)
      accessorRefs.push([sampler, 'input'], [sampler, 'output']);
  // Core and extension texture references both end in "Texture" (diffuseTexture, normalTexture).
  const textureRefs: any[] = [];
  const findTextures = (value: unknown, key = '') => {
    if (Array.isArray(value)) value.forEach((entry) => findTextures(entry));
    else if (value && typeof value === 'object') {
      if (key.endsWith('Texture') && typeof (value as any).index === 'number')
        textureRefs.push(value);
      for (const [name, entry] of Object.entries(value)) findTextures(entry, name);
    }
  };
  findTextures(json['materials'] ?? []);

  const accessors = kept(json['accessors'], new Set(accessorRefs.map(([o, k]) => o[k])));
  const textures = kept(json['textures'], new Set(textureRefs.map((ref) => ref.index)));
  const images = kept(
    json['images'],
    new Set(textures.items.flatMap((texture) => texture.source ?? [])),
  );
  const samplers = kept(
    json['samplers'],
    new Set(textures.items.flatMap((texture) => texture.sampler ?? [])),
  );
  const vertexData = new Set(
    (json['meshes'] ?? []).flatMap((mesh: any) =>
      mesh.primitives.flatMap((primitive: any) =>
        [primitive.attributes, ...(primitive.targets ?? [])].flatMap((map) =>
          Object.values(map).map((index) => json['accessors'][index as number]),
        ),
      ),
    ),
  );

  const parts: Uint8Array[] = [];
  const views: any[] = [];
  let length = 0;
  const addView = (bytes: Uint8Array, view: object) => {
    views.push({ buffer: 0, byteOffset: length, byteLength: bytes.byteLength, ...view });
    parts.push(bytes);
    length += align(bytes.byteLength);
    return views.length - 1;
  };
  for (const accessor of accessors.items) {
    // Neither source uses sparse accessors; copying one element by element would break it.
    if (accessor.sparse) throw new Error('Sparse accessors are not supported.');
    if (accessor.bufferView === undefined) continue;
    const view = json['bufferViews'][accessor.bufferView];
    const size = componentTypes[accessor.componentType]![0] * componentCounts[accessor.type]!;
    // Vertex attribute elements must start on 4-byte boundaries.
    const stride = vertexData.has(accessor) ? align(size) : size;
    const from = view.byteStride ?? size;
    const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    const bytes = new Uint8Array(stride * accessor.count);
    for (let element = 0; element < accessor.count; element++)
      bytes.set(
        bin.subarray(start + element * from, start + element * from + size),
        element * stride,
      );
    accessor.bufferView = addView(bytes, {
      ...(view.target !== undefined ? { target: view.target } : {}),
      ...(stride !== size ? { byteStride: stride } : {}),
    });
    delete accessor.byteOffset;
  }
  for (const image of images.items) {
    if (image.bufferView === undefined) continue;
    const view = json['bufferViews'][image.bufferView];
    const start = view.byteOffset ?? 0;
    image.bufferView = addView(bin.subarray(start, start + view.byteLength), {});
  }
  json['bufferViews'] = views;
  for (const [object, key] of accessorRefs) object[key] = accessors.at.get(object[key]);
  for (const ref of textureRefs) ref.index = textures.at.get(ref.index);
  for (const texture of textures.items) {
    if (texture.source !== undefined) texture.source = images.at.get(texture.source);
    if (texture.sampler !== undefined) texture.sampler = samplers.at.get(texture.sampler);
  }
  json['accessors'] = accessors.items;
  json['textures'] = textures.items;
  json['images'] = images.items;
  json['samplers'] = samplers.items;
  // glTF arrays, when present, may not be empty.
  for (const key of ['textures', 'images', 'samplers', 'animations'])
    if (!json[key]?.length) delete json[key];
  const packed = concat(parts);
  json['buffers'] = [{ byteLength: packed.byteLength }];
  return { json, bin: packed };
}

/** The model with every embedded image larger than `limit` px reduced, for game pieces that
 * need less texture detail than a study shows. */
export function reduceImages({ json, bin }: Gltf, limit: number): Gltf {
  const parts: Uint8Array[] = [bin];
  let offset = align(bin.byteLength);
  const views = [...(json['bufferViews'] ?? [])];
  const images = (json['images'] ?? []).map((image: any) => {
    if (image.bufferView === undefined) return image;
    const view = views[image.bufferView];
    const start = view.byteOffset ?? 0;
    const bytes = bin.subarray(start, start + view.byteLength);
    const smaller = studyImage(bytes, limit);
    if (smaller === bytes) return image;
    views.push({ buffer: 0, byteOffset: offset, byteLength: smaller.byteLength });
    parts.push(smaller);
    offset += align(smaller.byteLength);
    return { ...image, bufferView: views.length - 1 };
  });
  return compact({ json: { ...json, bufferViews: views, images }, bin: concat(parts) });
}

/** A scene holding several separate objects (a pack exported as one file) as one model per object.
 * Below any chain of single-child wrapper nodes, each child that holds a mesh becomes a piece. A
 * piece keeps its wrapper ancestors, whose transforms often turn a Z-up export upright, its skin
 * joints and their animation channels, and only the meshes, materials and buffer data it uses. A
 * scene with fewer than two such children is returned whole, unnamed. */
export function splitScene(gltf: Gltf): { name: string; gltf: Gltf }[] {
  const { nodes, chain, pieces } = scenePieces(gltf);
  if (pieces.length < 2) return [{ name: '', gltf }];
  return pieces.map((piece) => ({
    name: nodes[piece].name ?? `Piece ${piece}`,
    gltf: keepSubtrees(gltf, chain, [piece]),
  }));
}

/** The whole scene without the pieces (as `splitScene` finds them) whose names match, such as the
 * ground plane a model was posed on. */
export function withoutPieces(gltf: Gltf, excluded: RegExp): Gltf {
  const { nodes, chain, pieces } = scenePieces(gltf);
  const kept = pieces.filter((piece) => !excluded.test(nodes[piece].name ?? ''));
  return kept.length === pieces.length ? gltf : keepSubtrees(gltf, chain, kept);
}

function scenePieces(gltf: Gltf) {
  const nodes: any[] = gltf.json['nodes'] ?? [];
  const scene = gltf.json['scenes']?.[gltf.json['scene'] ?? 0];
  const chain: number[] = [];
  let level: number[] = scene?.nodes ?? [];
  while (
    level.length === 1 &&
    nodes[level[0]!].mesh === undefined &&
    nodes[level[0]!].children?.length
  ) {
    chain.push(level[0]!);
    level = nodes[level[0]!].children;
  }
  const holdsMesh = (index: number): boolean =>
    nodes[index].mesh !== undefined || (nodes[index].children ?? []).some(holdsMesh);
  return { nodes, chain, pieces: level.filter(holdsMesh) };
}

function keepSubtrees(source: Gltf, chain: readonly number[], roots: readonly number[]): Gltf {
  const json = structuredClone(source.json);
  const nodes: any[] = json['nodes'];
  const parents = new Map<number, number>();
  nodes.forEach((node, index) => {
    for (const child of node.children ?? []) parents.set(child, index);
  });
  const kept = new Set<number>(chain);
  const keepUp = (index: number) => {
    for (
      let at: number | undefined = index;
      at !== undefined && !kept.has(at);
      at = parents.get(at)
    )
      kept.add(at);
  };
  const visit = (index: number) => {
    kept.add(index);
    for (const child of nodes[index].children ?? []) visit(child);
  };
  for (const root of roots) visit(root);
  // Skinned meshes need their joints, which may sit outside the piece's own subtree.
  for (const index of [...kept]) {
    const skin = json['skins']?.[nodes[index].skin];
    for (const joint of skin?.joints ?? []) keepUp(joint);
    if (skin?.skeleton !== undefined) keepUp(skin.skeleton);
  }
  const order = [...kept].sort((a, b) => a - b);
  const at = new Map(order.map((old, index) => [old, index]));
  json['nodes'] = order.map((index) => nodes[index]);
  for (const node of json['nodes']) {
    if (node.children) node.children = node.children.filter((child: number) => kept.has(child));
    node.children = node.children?.map((child: number) => at.get(child));
    if (!node.children?.length) delete node.children;
    delete node.camera;
  }
  delete json['cameras'];
  // Joints outside the wrapper chain keep their own top node, so the scene lists every kept root.
  json['scenes'] = [
    { nodes: order.filter((index) => !kept.has(parents.get(index) ?? -1)).map((i) => at.get(i)) },
  ];
  json['scene'] = 0;

  const remap = (list: any[] | undefined, used: Set<number>) => {
    const order = [...used].sort((a, b) => a - b);
    return { items: order.map((index) => list![index]), at: new Map(order.map((o, i) => [o, i])) };
  };
  const meshes = remap(
    json['meshes'],
    new Set(json['nodes'].flatMap((node: any) => node.mesh ?? [])),
  );
  const materials = remap(
    json['materials'],
    new Set(
      meshes.items.flatMap((mesh: any) =>
        mesh.primitives.flatMap((primitive: any) => primitive.material ?? []),
      ),
    ),
  );
  const skins = remap(
    json['skins'],
    new Set(json['nodes'].flatMap((node: any) => node.skin ?? [])),
  );
  for (const node of json['nodes']) {
    if (node.mesh !== undefined) node.mesh = meshes.at.get(node.mesh);
    if (node.skin !== undefined) node.skin = skins.at.get(node.skin);
  }
  for (const mesh of meshes.items)
    for (const primitive of mesh.primitives)
      if (primitive.material !== undefined)
        primitive.material = materials.at.get(primitive.material);
  for (const skin of skins.items) {
    skin.joints = skin.joints.map((joint: number) => at.get(joint));
    if (skin.skeleton !== undefined) skin.skeleton = at.get(skin.skeleton);
  }
  json['meshes'] = meshes.items;
  json['materials'] = materials.items;
  json['skins'] = skins.items;
  json['animations'] = (json['animations'] ?? []).flatMap((animation: any) => {
    const channels = animation.channels.filter((channel: any) => kept.has(channel.target.node));
    if (!channels.length) return [];
    const samplers = remap(
      animation.samplers,
      new Set(channels.map((channel: any) => channel.sampler)),
    );
    return [
      {
        ...animation,
        channels: channels.map((channel: any) => ({
          ...channel,
          sampler: samplers.at.get(channel.sampler),
          target: { ...channel.target, node: at.get(channel.target.node) },
        })),
        samplers: samplers.items,
      },
    ];
  });
  for (const key of ['materials', 'skins']) if (!json[key].length) delete json[key];
  return compact({ json, bin: source.bin });
}
