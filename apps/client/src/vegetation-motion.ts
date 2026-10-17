import type * as pc from 'playcanvas';

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

/** Animation of existing decorative grass, separate from support and collision.
 * Instances keep immutable positions; camera movement changes no artwork/buffer.
 * docs/projects/3d-pixel-art-first-scene-plan.md#workload-and-resource-preparation */
export class VegetationMotion {
  private readonly patches: Patch[] = [];
  private elapsed = 0;
  private submitted = 0;
  private tested = 0;
  private mode: 'still' | 'smooth' | 'held' = 'still';

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
         if (ol_grassMode > 1.5) time = floor(time * 10.0 + phase) * 0.1;
         vec2 bend = vec2(0.0);
         if (ol_grassMode > 0.5) {
           float gust = sin(foot.x * 0.41 + foot.z * 0.27 - time * 1.35);
           float ripple = sin(foot.x * -0.73 + foot.z * 0.59 - time * 2.1 + phase * 2.0);
           bend = vec2(0.095, 0.055) * (gust + ripple * 0.3);
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
      mode: 'still' | 'smooth' | 'held';
      paused: boolean;
      reducedMotion: boolean;
    },
  ): void {
    if (!options.paused && !options.reducedMotion) this.elapsed += Math.min(dt, 0.1);
    this.mode = options.reducedMotion ? 'still' : options.mode;
    this.submitted = this.tested = 0;
    for (const patch of this.patches) {
      patch.contributors.fill(0);
      patch.distances.fill(Infinity);
      if (this.mode !== 'still')
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
      patch.material.setParameter(
        'ol_grassMode',
        this.mode === 'still' ? 0 : this.mode === 'smooth' ? 1 : 2,
      );
      patch.material.setParameter('ol_grassBodies[0]', patch.contributors);
    }
  }

  diagnostics(): {
    patches: number;
    mode: string;
    tested: number;
    submitted: number;
    elapsed: number;
  } {
    return {
      patches: this.patches.length,
      mode: this.mode,
      tested: this.tested,
      submitted: this.submitted,
      elapsed: this.elapsed,
    };
  }

  /** The scene owns materials and buffers; forget them before its landscape dies. */
  clear(): void {
    this.patches.length = 0;
    this.submitted = this.tested = 0;
  }
}
