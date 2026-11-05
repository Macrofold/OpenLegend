import * as pc from 'playcanvas';
import type { ArtTreatment } from './art-treatment';

export type WindStrength = ArtTreatment['wind'];
// Strength scales how far plants bend; gusts scales how much the travelling
// gust fronts add on top of the steady sway.
const windProfiles: Record<WindStrength, { strength: number; gusts: number }> = {
  still: { strength: 0, gusts: 0 },
  light: { strength: 1, gusts: 0.6 },
  breezy: { strength: 1.8, gusts: 0.85 },
  gusty: { strength: 2.6, gusts: 1 },
};
// Wind moves crowns a fraction of a metre; padding swaying bounds by this keeps culling and
// shadow fitting from clipping them at the edge of the view.
export const windCullMargin = new pc.Vec3(0.6, 0.1, 0.6);
// One prevailing presentation wind, blowing roughly east-north-east. It is not
// world weather; a future weather fact could supply this direction and strength.
const windDirection = [0.86, 0.51] as const;

// Instanced scenery templates are bottom-anchored and one unit tall, so local Y
// is the height fraction and the instance matrix's Y axis carries the plant's
// world height. Individually placed plant props instead supply their height in
// metres and are measured from their model origin, which sits on the ground.
// Bending grows with the square of height, smaller plants bend further relative
// to their size and sway faster, and gust fronts travel downwind across the land.
// Leaf cards also rustle a little with each gust; vertices in the same small
// cell share a seed so a card moves together instead of stretching.
const windShader = `
uniform vec4 ol_wind;
#ifdef OL_WIND_PROP
  uniform float ol_windHeight;
#endif
vec3 ol_windOffset(vec3 local, vec3 world, mat4 model) {
  float strength = length(ol_wind.xy);
  if (strength < 0.0001) return vec3(0.0);
  vec2 along = ol_wind.xy / strength;
  vec2 across = vec2(-along.y, along.x);
  vec3 base = model[3].xyz;
  #ifdef OL_WIND_PROP
    float height = ol_windHeight;
    float h = clamp((world.y - base.y) / max(height, 0.01), 0.0, 1.0);
  #else
    float height = length(model[1].xyz);
    float h = clamp(local.y, 0.0, 1.0);
  #endif
  float time = ol_wind.z;
  float phase = dot(base.xz, vec2(0.37, 0.61))
    + fract(sin(dot(base.xz, vec2(12.9898, 78.233))) * 43758.5453) * 6.2831;
  float reach = 0.01 + 0.06 * exp(-0.45 * height);
  float rate = mix(2.6, 0.75, smoothstep(0.3, 6.0, height));
  float front = 0.5 + 0.5 * sin(dot(base.xz, along) * 0.11 - time * 0.9);
  float drift = 0.5 + 0.5 * sin(dot(base.xz, across) * 0.05 + time * 0.37);
  float gust = pow(front * (0.55 + 0.45 * drift), 3.0) * ol_wind.w;
  float lean = 0.35 + 0.65 * gust + sin(time * rate + phase) * (0.35 + 0.5 * gust);
  float side = 0.25 * sin(time * rate * 1.37 + phase * 1.7);
  vec2 bend = (along * lean + across * side) * h * h * height * reach * strength;
  vec3 offset = vec3(bend.x, -0.5 * dot(bend, bend) / max(height * h, 0.1), bend.y);
  #ifdef OL_WIND_LEAVES
    float seed = fract(sin(dot(floor(local * 9.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453) * 6.2831;
    float rim = clamp(length(local.xz) * 2.2, 0.0, 1.0);
    float rustle = (0.2 + gust) * strength * height * 0.004 * rim * h;
    offset += vec3(sin(time * 6.3 + seed), 0.6 * sin(time * 7.9 + seed * 1.3), cos(time * 5.7 + seed)) * rustle;
  #endif
  return offset;
}
`;

/** Sway vegetation in every pass that draws it (camera, shadows and depth), so
 * shadows move with their plants. The displacement is GPU-only: one shared
 * uniform per frame, no per-plant CPU work. `propHeight` selects the variant
 * for an individually placed plant model of that height in metres; omit it for
 * instanced scenery templates. docs/world-presentation.md#wind */
export function prepareWind(
  material: pc.StandardMaterial,
  device: pc.GraphicsDevice,
  leaves: boolean,
  propHeight?: number,
): void {
  const transform =
    material.shaderChunks.glsl.get('transformVS') ??
    pc.ShaderChunks.get(device).get('transformVS')!;
  const defines =
    (leaves ? '#define OL_WIND_LEAVES\n' : '') +
    (propHeight === undefined ? '' : '#define OL_WIND_PROP\n');
  material.shaderChunks.version = '2.22';
  material.shaderChunks.glsl.set(
    'transformVS',
    transform
      .replace('vec4 evalWorldPosition(', `${defines}${windShader}\nvec4 evalWorldPosition(`)
      .replace(
        'vec4 posW = modelMatrix * vec4(localPos, 1.0);',
        'vec4 posW = modelMatrix * vec4(localPos, 1.0);\n\tposW.xyz += ol_windOffset(localPos, posW.xyz, modelMatrix);',
      ),
  );
  if (propHeight !== undefined) material.setParameter('ol_windHeight', propHeight);
}

export interface VegetationContributor {
  x: number;
  y: number;
  z: number;
  radius: number;
}
interface Patch {
  material: pc.StandardMaterial;
  x: number;
  y: number;
  z: number;
  radius: number;
  contributors: Float32Array;
  distances: Float64Array;
}

/** Animation of existing decorative vegetation, separate from support and
 * collision: the shared wind and the procedural grass patches that bodies push
 * aside. Instances keep immutable positions; camera movement changes no
 * artwork/buffer.
 * docs/projects/3d-pixel-art-first-scene-plan.md#workload-and-resource-preparation */
export class VegetationMotion {
  private readonly patches: Patch[] = [];
  private readonly windValue = new Float32Array(4);
  private windUniform?: pc.ScopeId;
  private elapsed = 0;
  private submitted = 0;
  private tested = 0;
  private wind: WindStrength = 'still';

  register(
    material: pc.StandardMaterial,
    center: { x: number; y: number; z: number },
    radius: number,
  ): void {
    // Installed after instanceBillboards: preserve its camera/depth transform and
    // use the same displacement before that transform in all material passes.
    const declarations = material.shaderChunks.glsl.get('litUserDeclarationVS') ?? '';
    material.shaderChunks.glsl.set(
      'litUserDeclarationVS',
      `${declarations}
       uniform float ol_grassTime;
       uniform float ol_grassMode;
       uniform vec4 ol_grassBodies[4];
       vec2 ol_grassBend(vec3 foot) {
         float phase = fract(sin(dot(foot.xz, vec2(12.9898, 78.233))) * 43758.5453);
         float time = ol_grassTime;
         vec2 bend = vec2(0.0);
         if (ol_grassMode > 0.0) {
           float gust = sin(foot.x * 0.41 + foot.z * 0.27 - time * 1.35);
           float ripple = sin(foot.x * -0.73 + foot.z * 0.59 - time * 2.1 + phase * 2.0);
           bend = vec2(0.095, 0.055) * (gust + ripple * 0.3) * ol_grassMode;
         }
         for (int i = 0; i < 4; i++) {
           vec4 body = ol_grassBodies[i];
           vec2 away = foot.xz - body.xz;
           float distance = length(away);
           float mask = max(0.0, 1.0 - distance / max(body.w, 0.001));
           mask *= max(0.0, 1.0 - abs(foot.y - body.y));
           bend += away / max(distance, 0.05) * mask * mask * 0.65;
         }
         return clamp(bend, vec2(-0.7), vec2(0.7));
       }`,
    );
    const end = material.shaderChunks.glsl.get('litUserMainEndVS') ?? '';
    material.shaderChunks.glsl.set(
      'litUserMainEndVS',
      `float ol_grassTip = clamp(0.5 - vertex_position.z, 0.0, 1.0);
       vPositionW.xz += ol_grassBend(ol_spriteFoot) * ol_spriteSize.y * ol_grassTip * ol_grassTip;
       ${end}`,
    );
    const contributors = new Float32Array(16);
    material.setParameter('ol_grassTime', this.elapsed);
    material.setParameter('ol_grassMode', 0);
    material.setParameter('ol_grassBodies[0]', contributors);
    material.update();
    this.patches.push({
      material,
      ...center,
      radius,
      contributors,
      distances: new Float64Array(4),
    });
  }

  update(
    dt: number,
    presented: readonly VegetationContributor[],
    options: {
      wind: WindStrength;
      paused: boolean;
      reducedMotion: boolean;
      device: pc.GraphicsDevice;
    },
  ): void {
    if (!options.paused && !options.reducedMotion) this.elapsed += Math.min(dt, 0.1);
    this.wind = options.reducedMotion ? 'still' : options.wind;
    const { strength, gusts } = windProfiles[this.wind];
    this.windValue[0] = windDirection[0] * strength;
    this.windValue[1] = windDirection[1] * strength;
    this.windValue[2] = this.elapsed;
    this.windValue[3] = gusts;
    (this.windUniform ??= options.device.scope.resolve('ol_wind')).setValue(this.windValue);
    this.submitted = this.tested = 0;
    for (const patch of this.patches) {
      patch.contributors.fill(0);
      patch.distances.fill(Infinity);
      if (this.wind !== 'still')
        for (const body of presented) {
          this.tested++;
          const dx = body.x - patch.x;
          const dz = body.z - patch.z;
          const distance = dx * dx + dz * dz;
          if (Math.abs(body.y - patch.y) > 1.5 || distance > (patch.radius + body.radius) ** 2)
            continue;
          // A patch submits four nearest relevant bodies, not every world actor
          // to every blade. Larger-density field rendering remains a separate
          // measured decision, not an implicit unlimited shader loop.
          let slot = 3;
          if (distance >= patch.distances[slot]!) continue;
          while (slot > 0 && distance < patch.distances[slot - 1]!) {
            patch.distances[slot] = patch.distances[slot - 1]!;
            patch.contributors.copyWithin(slot * 4, (slot - 1) * 4, slot * 4);
            slot--;
          }
          patch.distances[slot] = distance;
          const first = slot * 4;
          patch.contributors[first] = body.x;
          patch.contributors[first + 1] = body.y;
          patch.contributors[first + 2] = body.z;
          patch.contributors[first + 3] = body.radius;
        }
      for (let i = 3; i < patch.contributors.length; i += 4)
        if (patch.contributors[i]! > 0) this.submitted++;
      patch.material.setParameter('ol_grassTime', this.elapsed);
      patch.material.setParameter('ol_grassMode', strength);
      patch.material.setParameter('ol_grassBodies[0]', patch.contributors);
    }
  }

  diagnostics(): {
    patches: number;
    wind: string;
    tested: number;
    submitted: number;
    elapsed: number;
  } {
    return {
      patches: this.patches.length,
      wind: this.wind,
      tested: this.tested,
      submitted: this.submitted,
      elapsed: this.elapsed,
    };
  }

  unregister(material: pc.StandardMaterial): void {
    const index = this.patches.findIndex((patch) => patch.material === material);
    if (index >= 0) this.patches.splice(index, 1);
  }

  /** The scene owns materials and buffers; forget them before its landscape dies. */
  clear(): void {
    this.patches.length = 0;
    this.submitted = this.tested = 0;
  }
}
