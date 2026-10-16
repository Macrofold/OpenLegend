import * as pc from 'playcanvas';
import { intersectBox, type SceneryInstance } from '@open-legend/spatial';
import { random } from './art';

export type EnvironmentSurface = 'foliage' | 'bark' | 'stone' | 'ground' | 'masonry' | 'timber';

/** Original stepped material clusters, not sampled lighting or per-pixel noise.
 * Leaf/bark plates repeat over two metres, with quiet ground over eight. */
export function environmentSurfaceArt(kind: EnvironmentSurface): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = kind === 'foliage' || kind === 'bark' ? 32 : 64;
  const size = canvas.width;
  const ctx = canvas.getContext('2d')!;
  const paint = (surface: EnvironmentSurface): void => {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);
    if (surface === 'masonry' || surface === 'timber') {
      // Useful construction, not an all-over detail overlay: quiet block faces,
      // staggered mortar or long boards, plus a few authored edge chips.
      const rows = surface === 'masonry' ? 8 : 1;
      for (let row = 0; row < rows; row++) {
        const offset = row % 2 ? 8 : 0;
        for (let x = -16; x < size; x += 16) {
          const y = row * 8,
            left = x + offset;
          ctx.fillStyle = ['#858585', '#929292', '#7b7b7b'][(row + (x + 16) / 16) % 3]!;
          ctx.fillRect(left + 1, y + 1, 15, surface === 'masonry' ? 7 : size);
          ctx.fillStyle = '#626262';
          ctx.fillRect(left, y, 1, surface === 'masonry' ? 8 : size);
          if (surface === 'masonry') ctx.fillRect(left, y, 16, 1);
          ctx.fillStyle = '#a4a4a4';
          ctx.fillRect(left + 3, y + 1, 9, 1);
        }
      }
      return;
    }
    // A small authored arrangement repeats at matching edges. Each mark is a
    // connected cluster several texels wide, leaving the surrounding field quiet.
    for (const dx of [-size, 0, size])
      for (const dy of [-size, 0, size]) {
        if (surface === 'foliage') {
          for (const [x, y, w] of [
            [1, 1, 7],
            [13, -2, 8],
            [24, 5, 7],
            [6, 12, 8],
            [18, 16, 9],
            [-2, 23, 7],
            [11, 26, 8],
            [26, 29, 7],
          ] as const) {
            const px = x + dx,
              py = y + dy,
              width = w;
            ctx.fillStyle = '#404040';
            ctx.fillRect(px + 1, py + 4, width - 1, 3);
            ctx.fillRect(px + 3, py + 7, width - 4, 1);
            ctx.fillStyle = '#a8a8a8';
            ctx.fillRect(px + 1, py + 2, width - 2, 3);
            ctx.fillRect(px, py + 3, width, 1);
            ctx.fillStyle = '#e0e0e0';
            ctx.fillRect(px + 2, py + 1, width - 4, 2);
            ctx.fillRect(px + 1, py + 2, 2, 1);
          }
        } else if (surface === 'bark') {
          for (const [x, y, h] of [
            [2, -3, 12],
            [10, 8, 14],
            [19, 1, 13],
            [26, 20, 15],
            [3, 19, 10],
            [17, 25, 13],
          ] as const) {
            const px = x + dx,
              py = y + dy,
              height = h;
            ctx.fillStyle = '#484848';
            ctx.fillRect(px + 3, py + 2, 2, height - 2);
            ctx.fillRect(px + 2, py + height - 1, 2, 2);
            ctx.fillStyle = '#cccccc';
            ctx.fillRect(px, py + 1, 2, height - 3);
            ctx.fillRect(px + 1, py, 2, height - 5);
          }
        } else {
          for (const [x, y, w, h] of [
            [0, 3, 22, 10],
            [30, 14, 24, 11],
            [10, 35, 25, 12],
            [45, 47, 23, 10],
          ] as const) {
            const px = x + dx,
              py = y + dy,
              width = w,
              height = h;
            ctx.fillStyle = surface === 'stone' ? '#737373' : '#7b7b7b';
            ctx.fillRect(px + 3, py + height - 2, width - 7, 3);
            ctx.fillStyle = surface === 'stone' ? '#a2a2a2' : '#999999';
            ctx.fillRect(px + 3, py, width - 7, height);
            ctx.fillRect(px, py + 3, width, height - 6);
            ctx.fillStyle = surface === 'stone' ? '#b1b1b1' : '#a3a3a3';
            ctx.fillRect(px + 5, py, width - 11, 2);
          }
        }
      }
  };
  paint(kind);
  if (kind === 'foliage') {
    const leaves = ctx.getImageData(0, 0, size, size);
    paint('bark');
    const bark = ctx.getImageData(0, 0, size, size);
    // One tiny shared tile holds leaves in red and bark in green. The geometry's
    // existing authored brown/white trunks choose bark, retaining family colors.
    for (let i = 0; i < leaves.data.length; i += 4) leaves.data[i + 1] = bark.data[i]!;
    ctx.putImageData(leaves, 0, 0);
  }
  return canvas;
}

/** Attach fixed-density surface artwork to existing geometry. The caller owns
 * the shared texture/material lifetime; omitting this preserves prior colors.
 * Camera movement never changes coordinates, artwork, geometry or preparation. */
export function prepareEnvironmentSurface(
  material: pc.StandardMaterial,
  device: pc.GraphicsDevice,
  kind: EnvironmentSurface,
  texture: pc.Texture,
): void {
  texture.mipmaps = true;
  texture.minFilter = pc.FILTER_LINEAR_MIPMAP_LINEAR;
  texture.magFilter = pc.FILTER_LINEAR;
  texture.addressU = texture.addressV = pc.ADDRESS_REPEAT;
  const declarations = material.shaderChunks.glsl.get('litUserDeclarationVS') ?? '';
  const end = material.shaderChunks.glsl.get('litUserMainEndVS') ?? '';
  const objectAttached = kind !== 'ground';
  material.shaderChunks.glsl.set(
    'litUserDeclarationVS',
    `${declarations}\nvarying vec3 ol_environmentPosition;\nvarying vec3 ol_environmentNormal;`,
  );
  material.shaderChunks.glsl.set(
    'litUserMainEndVS',
    `${end}
     ol_environmentPosition = ${
       objectAttached
         ? 'vertex_position.xyz * vec3(length(dModelMatrix[0].xyz),length(dModelMatrix[1].xyz),length(dModelMatrix[2].xyz))'
         : 'vPositionW'
     };
     ol_environmentNormal = vec3(0.0,1.0,0.0);
     #ifdef NORMALS
       ol_environmentNormal = ${objectAttached ? 'vertex_normal' : 'dNormalMatrix * vertex_normal'};
     #endif`,
  );
  const diffuse =
    material.shaderChunks.glsl.get('diffusePS') ?? pc.ShaderChunks.get(device).get('diffusePS')!;
  const density = kind === 'ground' ? 8 : 16;
  material.shaderChunks.glsl.set(
    'diffusePS',
    diffuse.replace('void getAlbedo()', 'void ol_environmentSourceAlbedo()') +
      `
      uniform sampler2D ol_environmentTile;
      uniform float ol_surfaceEnabled;
      uniform float ol_surfaceEdges;
      varying vec3 ol_environmentPosition;
      varying vec3 ol_environmentNormal;
      vec4 ol_environmentSample(vec2 uv) {
        // Keep the continuous footprint for mip selection even where adjusted
        // coordinates leave cell interiors flat. Only magnification needs the
        // one-display-pixel transition; minification uses the prepared mips.
        vec2 dx = dFdx(uv), dy = dFdy(uv);
        vec2 size = vec2(${texture.width.toFixed(1)});
        vec2 texelDx = dx * size, texelDy = dy * size;
        float footprint = max(length(texelDx),length(texelDy));
        vec2 sampleUV = uv;
        if (footprint < 1.0) {
          vec2 pixel = uv * size - .5;
          vec2 cell = floor(pixel), fraction = fract(pixel);
          // Diagonal footprints can exceed one cell per axis: cap the ramp to
          // avoid a seam at cell centers, then meet ordinary mip UVs smoothly.
          vec2 width = clamp(abs(texelDx) + abs(texelDy),vec2(.0001),vec2(1.0));
          vec2 coverage = ol_surfaceEdges > .5
            ? clamp((fraction - .5) / width + .5,0.0,1.0)
            : step(vec2(.5),fraction);
          sampleUV = (cell + .5 + coverage) / size;
          if (ol_surfaceEdges > .5)
            sampleUV = mix(sampleUV,uv,smoothstep(.75,1.0,footprint));
        }
        return textureGrad(ol_environmentTile,sampleUV,dx,dy);
      }
      void getAlbedo() {
        ol_environmentSourceAlbedo();
        if (ol_surfaceEnabled < .5${kind === 'masonry' || kind === 'timber' || kind === 'stone' ? '' : ' || ol_surfaceEnabled > 1.5'}) return;
        vec3 p = ol_environmentPosition * ${(density / texture.width).toFixed(3)};
        vec3 weights = pow(abs(normalize(ol_environmentNormal)),vec3(10.0));
        weights /= max(dot(weights,vec3(1.0)),.0001);
        vec4 x = ol_environmentSample(p.zy);
        vec4 y = ol_environmentSample(p.xz);
        vec4 z = ol_environmentSample(p.xy);
        float bark = ${kind === 'foliage' ? 'step(dAlbedo.g * .98,dAlbedo.r)' : '0.0'};
        float field = dot(vec3(mix(x.r,x.g,bark),mix(y.r,y.g,bark),mix(z.r,z.g,bark)),weights);
        // Continuous derivatives select the prepared mip chain. At subpixel
        // coverage, taper contrast rather than flashing isolated bright cells.
        float footprint = max(length(dFdx(p)),length(dFdy(p))) * ${texture.width.toFixed(1)};
        float contrast = 1.0 - smoothstep(.75,1.75,footprint);
        vec3 pigment = ${kind === 'foliage' ? 'mix(mix(vec3(.44,.57,.54),vec3(1.45,1.42,1.02),field),vec3(mix(.52,1.52,field)),bark)' : 'vec3(mix(.52,1.52,field))'};
        dAlbedo *= mix(vec3(1.0),pigment,contrast);
      }`,
  );
  material.setParameter('ol_environmentTile', texture);
  material.update();
}

/** Quiet painted regions replace the old all-over flecks. The scene still places
 * this artwork on the unchanged supported ground, never on a new terrain mesh. */
export function groupedGroundArt(
  seed: number,
  earth = false,
  pixelSurface = false,
  palette: 'meadow' | 'woodland' = 'meadow',
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = earth ? 128 : 512;
  const ctx = canvas.getContext('2d')!;
  const size = canvas.width;
  const rng = random(seed);
  const colors =
    palette === 'woodland'
      ? earth
        ? ['#8e8270', '#968975', '#897c69', '#9c8e79']
        : ['#46634f', '#4c6a54', '#405c4a', '#536f58']
      : earth
        ? ['#a99c79', '#afa17d', '#a59874', '#b2a580']
        : ['#77815b', '#7e855e', '#6e7954', '#838963'];
  ctx.fillStyle = colors[0]!;
  ctx.fillRect(0, 0, size, size);
  const grid = pixelSurface ? 8 : 1;
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
      points.push([
        Math.round((x + Math.cos(a) * r) / grid) * grid,
        Math.round((y + Math.sin(a) * r * 0.55) / grid) * grid,
      ]);
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
  // The pixel-surface treatment supplies its own connected material clusters;
  // retain the earlier small flecks only in the original grouped comparison.
  ctx.fillStyle = earth ? '#938768' : '#64724d';
  if (!pixelSurface)
    for (let i = 0; i < (earth ? 90 : 360); i++)
      ctx.fillRect(Math.floor(rng() * size), Math.floor(rng() * size), 2 + rng() * 3, 1);
  if (pixelSurface) {
    const cells = document.createElement('canvas');
    cells.width = cells.height = size / grid;
    const pixels = cells.getContext('2d')!;
    pixels.imageSmoothingEnabled = false;
    pixels.drawImage(canvas, 0, 0, cells.width, cells.height);
    ctx.clearRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(cells, 0, 0, size, size);
  }
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

export interface SceneryAlpha {
  uvs: readonly number[];
  width: number;
  height: number;
  rgba: readonly number[];
  cutoff: number;
}

export interface SceneryRayDifferentials {
  x: { from: pc.Vec3; to: pc.Vec3 };
  y: { from: pc.Vec3; to: pc.Vec3 };
}
interface AlphaMip {
  width: number;
  height: number;
  values: Float32Array;
}
const alphaMipCache = new WeakMap<readonly number[], readonly AlphaMip[]>();
function alphaMips(alpha: SceneryAlpha): readonly AlphaMip[] {
  const cached = alphaMipCache.get(alpha.rgba);
  if (cached) return cached;
  let width = alpha.width,
    height = alpha.height;
  let values = Float32Array.from(
    { length: width * height },
    (_, i) => alpha.rgba[i * 4 + 3]! / 255,
  );
  const mips: AlphaMip[] = [{ width, height, values }];
  while (width > 1 || height > 1) {
    const nextWidth = Math.max(1, width >> 1),
      nextHeight = Math.max(1, height >> 1);
    const next = new Float32Array(nextWidth * nextHeight);
    for (let y = 0; y < nextHeight; y++)
      for (let x = 0; x < nextWidth; x++) {
        const left = x * 2,
          right = Math.min(left + 1, width - 1),
          top = y * 2,
          bottom = Math.min(top + 1, height - 1);
        next[y * nextWidth + x] =
          Math.round(
            ((values[top * width + left]! +
              values[top * width + right]! +
              values[bottom * width + left]! +
              values[bottom * width + right]!) *
              255) /
              4,
          ) / 255;
      }
    width = nextWidth;
    height = nextHeight;
    values = next;
    mips.push({ width, height, values });
  }
  alphaMipCache.set(alpha.rgba, mips);
  return mips;
}
function alphaTexel(mip: AlphaMip, x: number, y: number): number {
  const col = ((x % mip.width) + mip.width) % mip.width,
    row = ((y % mip.height) + mip.height) % mip.height;
  return mip.values[row * mip.width + col]!;
}
function filteredAlpha(mip: AlphaMip, u: number, v: number): number {
  const x = u * mip.width - 0.5,
    y = v * mip.height - 0.5,
    col = Math.floor(x),
    row = Math.floor(y),
    fx = x - col,
    fy = y - row;
  const top = alphaTexel(mip, col, row) * (1 - fx) + alphaTexel(mip, col + 1, row) * fx,
    bottom = alphaTexel(mip, col, row + 1) * (1 - fx) + alphaTexel(mip, col + 1, row + 1) * fx;
  return top * (1 - fy) + bottom * fy;
}
function sampledAlpha(mips: readonly AlphaMip[], u: number, v: number, footprint: number): number {
  const first = mips[0]!;
  if (footprint <= 1)
    return alphaTexel(first, Math.floor(u * first.width), Math.floor(v * first.height));
  const lod = Math.min(mips.length - 1, Math.log2(footprint)),
    level = Math.floor(lod),
    blend = lod - level;
  return (
    filteredAlpha(mips[level]!, u, v) * (1 - blend) +
    filteredAlpha(mips[Math.min(level + 1, mips.length - 1)]!, u, v) * blend
  );
}

/** Pointer occlusion follows the actual decorative crowns without giving them
 * native collision or sight authority. Shared local triangles and transforms
 * are prepared once; bounds reject irrelevant instances before triangle work. */
export class SceneryCameraOcclusion {
  private readonly from = new pc.Vec3();
  private readonly to = new pc.Vec3();
  private readonly direction = new pc.Vec3();
  private readonly offsetFrom = [new pc.Vec3(), new pc.Vec3()];
  private readonly offsetDirection = [new pc.Vec3(), new pc.Vec3()];
  private readonly mips?: readonly AlphaMip[];
  constructor(
    private readonly positions: readonly number[],
    private readonly indices: readonly number[],
    private readonly instances: readonly OccludingInstance[],
    private readonly bounds: { min: pc.Vec3; max: pc.Vec3 },
    private readonly alpha?: SceneryAlpha,
  ) {
    if (alpha) this.mips = alphaMips(alpha);
  }

  hit(from: pc.Vec3, to: pc.Vec3, differentials?: SceneryRayDifferentials): number | null {
    if (intersectBox(from, to, this.bounds) === null) return null;
    let nearest = Infinity;
    for (const instance of this.instances) {
      const bound = intersectBox(from, to, instance.bounds);
      if (bound === null || bound > nearest) continue;
      instance.inverse.transformPoint(from, this.from);
      instance.inverse.transformPoint(to, this.to);
      this.direction.sub2(this.to, this.from);
      if (this.alpha && differentials)
        for (let axis = 0; axis < 2; axis++) {
          const ray = axis === 0 ? differentials.x : differentials.y;
          instance.inverse.transformPoint(ray.from, this.offsetFrom[axis]!);
          instance.inverse.transformPoint(ray.to, this.offsetDirection[axis]!);
          this.offsetDirection[axis]!.sub(this.offsetFrom[axis]!);
        }
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
        if (fraction < 0 || fraction > 1 || fraction >= nearest) continue;
        if (this.alpha) {
          const alpha = this.alpha;
          const ai = this.indices[i]! * 2,
            bi = this.indices[i + 1]! * 2,
            ci = this.indices[i + 2]! * 2;
          const x = alpha.uvs[ai]! * (1 - u - v) + alpha.uvs[bi]! * u + alpha.uvs[ci]! * v;
          const y =
            alpha.uvs[ai + 1]! * (1 - u - v) + alpha.uvs[bi + 1]! * u + alpha.uvs[ci + 1]! * v;
          let footprint = 0;
          if (differentials)
            for (let axis = 0; axis < 2; axis++) {
              const origin = this.offsetFrom[axis]!,
                direction = this.offsetDirection[axis]!;
              const dx = direction.y * e2z - direction.z * e2y,
                dy = direction.z * e2x - direction.x * e2z,
                dz = direction.x * e2y - direction.y * e2x;
              const det = e1x * dx + e1y * dy + e1z * dz;
              if (Math.abs(det) < 1e-12) {
                footprint = Infinity;
                break;
              }
              const ox = origin.x - ax,
                oy = origin.y - ay,
                oz = origin.z - az;
              // Neighboring rays meet the triangle's plane, including outside
              // its edges: this estimates texture derivatives, not another hit.
              const bu = (ox * dx + oy * dy + oz * dz) / det;
              const bv =
                (direction.x * (oy * e1z - oz * e1y) +
                  direction.y * (oz * e1x - ox * e1z) +
                  direction.z * (ox * e1y - oy * e1x)) /
                det;
              const du =
                alpha.uvs[ai]! * (1 - bu - bv) + alpha.uvs[bi]! * bu + alpha.uvs[ci]! * bv - x;
              const dv =
                alpha.uvs[ai + 1]! * (1 - bu - bv) +
                alpha.uvs[bi + 1]! * bu +
                alpha.uvs[ci + 1]! * bv -
                y;
              footprint = Math.max(footprint, Math.hypot(du * alpha.width, dv * alpha.height));
            }
          // Match nearest magnification and trilinear minification in the same
          // top-origin repeating UVs. GPU mip rounding and finite one-pixel ray
          // differences can still disagree exactly at a cutoff boundary.
          if (sampledAlpha(this.mips!, x, y, footprint) < alpha.cutoff) continue;
        }
        nearest = fraction;
      }
    }
    return nearest === Infinity ? null : nearest;
  }
}

/** Imported and procedural scenery both stretch to the world's authored width
 * and height. Correct the engine's uniform-scale instancing normal assumption. */
export function prepareSceneryNormals(
  material: pc.StandardMaterial,
  device: pc.GraphicsDevice,
): void {
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
        /(#elif defined\(INSTANCING\)[\s\S]*?mat3 getNormalMatrix\(mat4 modelMatrix\)\s*\{)[\s\S]*?(\n\s*\})/,
        '$1\n        return ol_sceneryNormalMatrix(modelMatrix);$2',
      ),
  );
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
  prepareSceneryNormals(material, device);
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
