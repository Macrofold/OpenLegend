/**
 * Model files for the offline asset recipes: binary glTF (GLB) read, posed, measured and written
 * without a 3D tool, into an external workspace. Shared by the asset survey and game-animal
 * recipes so both measure a model the same way.
 * docs/asset-workflow.md#edit-or-generate-art
 */
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

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
