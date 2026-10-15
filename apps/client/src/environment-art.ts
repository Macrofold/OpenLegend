import * as pc from 'playcanvas';
import { intersectBox, type SceneryInstance } from '@open-legend/spatial';
import { random } from './art';

/** Quiet painted regions replace the old all-over flecks. The scene still places
 * this artwork on the unchanged supported ground, never on a new terrain mesh. */
export function groupedGroundArt(seed: number, earth = false): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = earth ? 128 : 512;
  const ctx = canvas.getContext('2d')!;
  const size = canvas.width;
  const rng = random(seed);
  const colors = earth
    ? ['#a99c79', '#afa17d', '#a59874', '#b2a580']
    : ['#77815b', '#7e855e', '#6e7954', '#838963'];
  ctx.fillStyle = colors[0]!;
  ctx.fillRect(0, 0, size, size);
  // Broad, low-contrast masses leave breathing room around people and supplies.
  for (let i = 0; i < 38; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const radius = size * (0.025 + rng() * 0.08);
    ctx.fillStyle = colors[i % colors.length]!;
    const points: Array<readonly [number, number]> = [];
    for (let step = 0; step < 8; step++) {
      const a = (step * Math.PI * 2) / 8;
      const r = radius * (0.75 + rng() * 0.35);
      points.push([Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.55)]);
    }
    // Matching opposite edges preserve the quiet regions when the scene samples
    // this repeating source continuously across its existing world tiles.
    for (const dx of [-size, 0, size])
      for (const dy of [-size, 0, size]) {
        ctx.beginPath();
        for (const [index, [px, py]] of points.entries()) {
          if (!index) ctx.moveTo(px + dx, py + dy);
          else ctx.lineTo(px + dx, py + dy);
        }
        ctx.closePath();
        ctx.fill();
      }
  }
  // Sparse marks suggest grass/soil without making each pixel equally important.
  ctx.fillStyle = earth ? '#938768' : '#64724d';
  for (let i = 0; i < (earth ? 90 : 360); i++)
    ctx.fillRect(Math.floor(rng() * size), Math.floor(rng() * size), 2 + rng() * 3, 1);
  return canvas;
}

/** A handful of broad blades, with the same olive family as the ground. These
 * original cutouts avoid both transparent rectangles and glittering seed heads. */
export function groupedGrassArt(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  const blades = [
    [7, 13, -4],
    [12, 8, -3],
    [16, 5, 1],
    [21, 10, 4],
    [25, 17, 5],
  ];
  for (const [index, [x = 0, tip = 0, lean = 0]] of blades.entries()) {
    ctx.fillStyle = ['#60734e', '#81915d', '#718455'][index % 3]!;
    ctx.beginPath();
    ctx.moveTo(14 + (x - 16) * 0.4, 30);
    ctx.lineTo(x + lean, tip);
    ctx.lineTo(x + 2, tip + 10);
    ctx.lineTo(19 + (x - 16) * 0.4, 30);
    ctx.fill();
  }
  return canvas;
}

interface Geometry {
  positions: number[];
  normals: number[];
  colors: number[];
  indices: number[];
}
type Point = readonly [number, number, number];

function vertex(geometry: Geometry, position: Point, normal: Point, color: pc.Color): number {
  const index = geometry.positions.length / 3;
  geometry.positions.push(...position);
  geometry.normals.push(...normal);
  // Vertex colors are linear in the pinned engine, unlike the canvas source art.
  geometry.colors.push(color.r ** 2.2, color.g ** 2.2, color.b ** 2.2, 1);
  return index;
}

/** A few large, gently faceted lobes describe the crown. Color changes follow
 * those lobes and upper/lower faces rather than independent random triangles. */
function crown(
  geometry: Geometry,
  center: Point,
  radius: Point,
  palette: readonly pc.Color[],
  phase: number,
): void {
  const segments = 9;
  const rings = 4;
  const first = geometry.positions.length / 3;
  for (let row = 0; row <= rings; row++) {
    const elevation = (row * Math.PI) / rings;
    for (let col = 0; col <= segments; col++) {
      const angle = (col * Math.PI * 2) / segments + phase;
      const nx = Math.sin(elevation) * Math.cos(angle);
      const ny = Math.cos(elevation);
      const nz = Math.sin(elevation) * Math.sin(angle);
      const shape = 1 + 0.08 * Math.sin(angle * 3 + phase) * Math.sin(elevation);
      const length = Math.hypot(nx / radius[0], ny / radius[1], nz / radius[2]);
      vertex(
        geometry,
        [
          center[0] + nx * radius[0] * shape,
          center[1] + ny * radius[1],
          center[2] + nz * radius[2] * shape,
        ],
        [nx / radius[0] / length, ny / radius[1] / length, nz / radius[2] / length],
        palette[ny > 0.4 ? 2 : ny < -0.15 ? 0 : 1]!,
      );
    }
  }
  for (let row = 0; row < rings; row++)
    for (let col = 0; col < segments; col++) {
      const a = first + row * (segments + 1) + col;
      const b = a + segments + 1;
      if (row > 0) geometry.indices.push(a, a + 1, b);
      if (row < rings - 1) geometry.indices.push(a + 1, b + 1, b);
    }
}

function branch(
  geometry: Geometry,
  base: Point,
  tip: Point,
  baseRadius: number,
  tipRadius: number,
  color: pc.Color,
): void {
  const axis = new pc.Vec3(tip[0] - base[0], tip[1] - base[1], tip[2] - base[2]).normalize();
  const side = new pc.Vec3()
    .cross(axis, Math.abs(axis.z) > 0.9 ? pc.Vec3.RIGHT : pc.Vec3.FORWARD)
    .normalize();
  const other = new pc.Vec3().cross(side, axis).normalize();
  const first = geometry.positions.length / 3;
  for (const [center, radius] of [
    [base, baseRadius],
    [tip, tipRadius],
  ] as const)
    for (let i = 0; i <= 6; i++) {
      const a = (i * Math.PI * 2) / 6;
      const nx = side.x * Math.cos(a) + other.x * Math.sin(a);
      const ny = side.y * Math.cos(a) + other.y * Math.sin(a);
      const nz = side.z * Math.cos(a) + other.z * Math.sin(a);
      vertex(
        geometry,
        [center[0] + nx * radius, center[1] + ny * radius, center[2] + nz * radius],
        [nx, ny, nz],
        color,
      );
    }
  for (let i = 0; i < 6; i++) {
    const a = first + i;
    geometry.indices.push(a, a + 7, a + 1, a + 1, a + 7, a + 8);
  }
}

function coniferTier(
  geometry: Geometry,
  centerY: number,
  radius: number,
  height: number,
  palette: readonly pc.Color[],
  phase: number,
): void {
  const segments = 9;
  const first = geometry.positions.length / 3;
  // Pointed tops and hanging hems keep these from reading as stacked spheres.
  const rings = [
    [1, 0.025],
    [0.45, 0.57],
    [0.04, 1],
    [0, 0.28],
  ] as const;
  for (const [row, [y, width]] of rings.entries())
    for (let col = 0; col <= segments; col++) {
      const a = (col * Math.PI * 2) / segments + phase;
      const edge = 1 + Math.sin(a * 3 + phase) * 0.08;
      const ny = row === 3 ? -0.9 : 0.55;
      const nx = Math.cos(a);
      const nz = Math.sin(a);
      const length = Math.hypot(nx, ny, nz);
      vertex(
        geometry,
        [
          Math.cos(a) * radius * width * edge,
          centerY + y * height,
          Math.sin(a) * radius * width * edge * 0.93,
        ],
        [nx / length, ny / length, nz / length],
        palette[row === 0 ? 2 : row === 3 ? 0 : 1]!,
      );
    }
  for (let row = 0; row < rings.length - 1; row++)
    for (let col = 0; col < segments; col++) {
      const a = first + row * (segments + 1) + col;
      const b = a + segments + 1;
      geometry.indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
}

function sceneryMesh(device: pc.GraphicsDevice, appearance: string, seed: number) {
  const geometry: Geometry = { positions: [], normals: [], colors: [], indices: [] };
  const rng = random(seed);
  const birch = appearance === 'tree-birch';
  const conifer = appearance === 'tree-conifer';
  const shrub = appearance === 'woodland-shrub';
  const palette = (
    conifer
      ? ['#314e45', '#4b6955', '#6a8263']
      : birch
        ? ['#4b6447', '#70875a', '#92a66c']
        : ['#405b43', '#607b4f', '#82965f']
  ).map((hex) => new pc.Color().fromString(hex));
  const bark = new pc.Color().fromString(birch ? '#c6c2aa' : '#756349');
  const phase = rng() * Math.PI * 2;
  if (!shrub) {
    branch(geometry, [0, 0, 0], [0.025, 0.77, -0.015], 0.038, 0.015, bark);
    if (!conifer) {
      branch(geometry, [0.008, 0.33, 0], [-0.26, 0.61, 0.04], 0.022, 0.007, bark);
      branch(geometry, [0.015, 0.48, -0.005], [0.24, 0.75, -0.1], 0.019, 0.006, bark);
      branch(geometry, [0.015, 0.48, 0], [-0.05, 0.7, 0.24], 0.019, 0.006, bark);
    }
  }
  if (conifer) {
    for (let tier = 0; tier < 4; tier++)
      coniferTier(
        geometry,
        0.25 + tier * 0.155,
        0.43 - tier * 0.095,
        0.285,
        palette,
        phase + tier * 0.7,
      );
  } else {
    const groups: Array<[Point, Point]> = shrub
      ? [
          [
            [0, 0.58, 0],
            [0.3, 0.4, 0.29],
          ],
          [
            [-0.22, 0.36, 0.04],
            [0.22, 0.28, 0.23],
          ],
          [
            [0.23, 0.4, -0.06],
            [0.2, 0.32, 0.24],
          ],
        ]
      : [
          [
            [0.02, 0.82, -0.02],
            [0.28, 0.18, 0.27],
          ],
          [
            [-0.23, 0.69, 0.04],
            [0.23, 0.18, 0.24],
          ],
          [
            [0.24, 0.72, -0.07],
            [0.22, 0.19, 0.22],
          ],
          [
            [-0.01, 0.63, 0.22],
            [0.29, 0.17, 0.23],
          ],
          [
            [0.03, 0.62, -0.2],
            [0.28, 0.17, 0.24],
          ],
        ];
    for (const [i, [center, radius]] of groups.entries())
      crown(geometry, center, radius, palette, phase + i * 0.8);
  }
  const mesh = new pc.Mesh(device);
  mesh.setPositions(geometry.positions);
  mesh.setNormals(geometry.normals);
  mesh.setColors(geometry.colors);
  mesh.setIndices(geometry.indices);
  mesh.update();
  return { mesh, positions: geometry.positions, indices: geometry.indices };
}

interface OccludingInstance {
  inverse: pc.Mat4;
  bounds: { min: pc.Vec3; max: pc.Vec3 };
}

/** Pointer occlusion follows the actual decorative crowns without giving them
 * native collision or sight authority. Shared local triangles and transforms
 * are prepared once; bounds reject irrelevant instances before triangle work. */
export class SceneryCameraOcclusion {
  private readonly from = new pc.Vec3();
  private readonly to = new pc.Vec3();
  private readonly direction = new pc.Vec3();
  constructor(
    private readonly positions: readonly number[],
    private readonly indices: readonly number[],
    private readonly instances: readonly OccludingInstance[],
    private readonly bounds: { min: pc.Vec3; max: pc.Vec3 },
  ) {}

  hit(from: pc.Vec3, to: pc.Vec3): number | null {
    if (intersectBox(from, to, this.bounds) === null) return null;
    let nearest = Infinity;
    for (const instance of this.instances) {
      const bound = intersectBox(from, to, instance.bounds);
      if (bound === null || bound > nearest) continue;
      instance.inverse.transformPoint(from, this.from);
      instance.inverse.transformPoint(to, this.to);
      this.direction.sub2(this.to, this.from);
      for (let i = 0; i < this.indices.length; i += 3) {
        const a = this.indices[i]! * 3;
        const b = this.indices[i + 1]! * 3;
        const c = this.indices[i + 2]! * 3;
        const ax = this.positions[a]!;
        const ay = this.positions[a + 1]!;
        const az = this.positions[a + 2]!;
        const e1x = this.positions[b]! - ax;
        const e1y = this.positions[b + 1]! - ay;
        const e1z = this.positions[b + 2]! - az;
        const e2x = this.positions[c]! - ax;
        const e2y = this.positions[c + 1]! - ay;
        const e2z = this.positions[c + 2]! - az;
        const px = this.direction.y * e2z - this.direction.z * e2y;
        const py = this.direction.z * e2x - this.direction.x * e2z;
        const pz = this.direction.x * e2y - this.direction.y * e2x;
        const determinant = e1x * px + e1y * py + e1z * pz;
        if (Math.abs(determinant) < 1e-9) continue;
        const inv = 1 / determinant;
        const tx = this.from.x - ax;
        const ty = this.from.y - ay;
        const tz = this.from.z - az;
        const u = (tx * px + ty * py + tz * pz) * inv;
        if (u < 0 || u > 1) continue;
        const qx = ty * e1z - tz * e1y;
        const qy = tz * e1x - tx * e1z;
        const qz = tx * e1y - ty * e1x;
        const v = (this.direction.x * qx + this.direction.y * qy + this.direction.z * qz) * inv;
        if (v < 0 || u + v > 1) continue;
        const fraction = (e2x * qx + e2y * qy + e2z * qz) * inv;
        if (fraction >= 0 && fraction <= 1 && fraction < nearest) nearest = fraction;
      }
    }
    return nearest === Infinity ? null : nearest;
  }
}

/** A replacement appearance for existing decorative instances only. Dimensions,
 * placements and all physical/navigation records remain owned by the world. */
export function createGroupedScenery(
  device: pc.GraphicsDevice,
  appearance: string,
  seed: number,
  instances: readonly SceneryInstance[],
  material: pc.StandardMaterial,
): {
  mesh: pc.Mesh;
  instance: pc.MeshInstance;
  buffer: pc.VertexBuffer;
  bounds: pc.BoundingBox;
  occlusion: SceneryCameraOcclusion | null;
} | null {
  if (!['tree-conifer', 'tree-birch', 'tree-broadleaf', 'woodland-shrub'].includes(appearance))
    return null;
  const { mesh, positions, indices } = sceneryMesh(device, appearance, seed);
  material.diffuseVertexColor = true;
  material.diffuse.set(1, 1, 1);
  material.specular.set(0.015, 0.015, 0.015);
  // Trees keep their authored width/height proportions. The engine's default
  // instanced normal transform assumes uniform scale; divide out each squared
  // axis length so stretched crowns still receive light on the correct face.
  const normal = pc.ShaderChunks.get(device).get('normalCoreVS')!;
  material.shaderChunks.glsl.set(
    'normalCoreVS',
    normal
      .replace(
        '#elif defined(INSTANCING)',
        `#elif defined(INSTANCING)
       mat3 ol_sceneryNormalMatrix(mat4 m) {
         return mat3(m[0].xyz / dot(m[0].xyz,m[0].xyz),
                     m[1].xyz / dot(m[1].xyz,m[1].xyz),
                     m[2].xyz / dot(m[2].xyz,m[2].xyz));
       }`,
      )
      .replace(
        /(#elif defined\(INSTANCING\)[\s\S]*?mat3 getNormalMatrix\(mat4 modelMatrix\) \{)[\s\S]*?(\n    \})/,
        '$1\n        return ol_sceneryNormalMatrix(modelMatrix);$2',
      ),
  );
  material.update();
  const transforms = new Float32Array(instances.length * 16);
  const matrix = new pc.Mat4();
  const rotation = new pc.Quat();
  const scale = new pc.Vec3();
  const position = new pc.Vec3();
  const min = new pc.Vec3(Infinity, Infinity, Infinity);
  const max = new pc.Vec3(-Infinity, -Infinity, -Infinity);
  const occluding: OccludingInstance[] = [];
  for (const [index, source] of instances.entries()) {
    const p = source.position;
    const angle = Math.sin(p.x * 12.9898 + p.z * 78.233 + seed) * 360;
    rotation.setFromEulerAngles(0, angle, 0);
    matrix.setTRS(
      position.set(p.x, p.y, p.z),
      rotation,
      scale.set(source.width, source.height, source.width),
    );
    transforms.set(matrix.data, index * 16);
    min.min(position.set(p.x - source.width * 0.7, p.y, p.z - source.width * 0.7));
    max.max(position.set(p.x + source.width * 0.7, p.y + source.height, p.z + source.width * 0.7));
    occluding.push({
      inverse: matrix.clone().invert(),
      bounds: {
        min: new pc.Vec3(p.x - source.width * 0.7, p.y, p.z - source.width * 0.7),
        max: new pc.Vec3(p.x + source.width * 0.7, p.y + source.height, p.z + source.width * 0.7),
      },
    });
  }
  const instance = new pc.MeshInstance(mesh, material);
  const buffer = new pc.VertexBuffer(
    device,
    pc.VertexFormat.getDefaultInstancingFormat(device),
    instances.length,
    { data: transforms, usage: pc.BUFFER_STATIC },
  );
  const bounds = new pc.BoundingBox();
  bounds.setMinMax(min, max);
  instance.setCustomAabb(bounds);
  instance.setInstancing(buffer, true);
  instance.castShadow = instances[0]?.castShadows ?? false;
  instance.receiveShadow = true;
  return {
    mesh,
    instance,
    buffer,
    bounds,
    occlusion: occluding.length
      ? new SceneryCameraOcclusion(positions, indices, occluding, { min, max })
      : null,
  };
}
