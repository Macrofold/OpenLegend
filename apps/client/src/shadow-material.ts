import * as pc from 'playcanvas';
import type { ShadowQuality } from './world-renderer';

export const shadowSettings = {
  detailed: { sun: pc.SHADOW_PCSS_32F, local: pc.SHADOW_PCF5_32F, resolution: 2048 },
  economy: { sun: pc.SHADOW_PCF3_32F, local: pc.SHADOW_PCF3_32F, resolution: 1024 },
} satisfies Record<ShadowQuality, { sun: number; local: number; resolution: number }>;

// The engine's program cache owns shaders. Weak membership shares preparation
// across materials using the same program without retaining obsolete devices.
const prepared = new WeakSet<pc.Shader>();

/** Prepare quality and day/night variants while creating an already-needed program.
 * PlayCanvas 2.22.2 otherwise first links it during drawing, blocking the render
 * thread (notably instanced grass). Use the same generator and processing inputs;
 * no alternate scene, hidden draw, copied GLSL or synchronous readiness query.
 * docs/world-presentation.md#shadow-quality
 */
export class ShadowMaterial extends pc.StandardMaterial {
  constructor(private sun?: pc.Light) {
    super();
  }

  override copy(source: pc.StandardMaterial): this {
    super.copy(source);
    // StandardMaterial.clone constructs without arguments before copying; retain
    // the disabled sun too, so clones first drawn at night can prepare sunrise.
    this.sun = source instanceof ShadowMaterial ? source.sun : this.sun;
    return this;
  }

  override getShaderVariant(params: Parameters<pc.Material['getShaderVariant']>[0]): pc.Shader {
    const shader = super.getShaderVariant(params);
    if (params.pass !== pc.SHADER_FORWARD || !this.useLighting || prepared.has(shader))
      return shader;
    prepared.add(shader);

    const original = this.onUpdateShader;
    const copies: pc.Light[] = [];
    try {
      for (const settings of Object.values(shadowSettings))
        for (const daylight of this.sun ? [true, false] : [undefined]) {
          this.onUpdateShader = (input) => {
            const options = original?.(input) ?? input;
            // Preserve the inherited `pass` getter: an enumerable own property
            // changes the engine's cache key and warms an unused duplicate.
            const alternate = Object.create(
              Object.getPrototypeOf(options),
              Object.getOwnPropertyDescriptors(options),
            ) as typeof options;
            const lights = this.sun
              ? [
                  ...(daylight ? [this.sun] : []),
                  ...options.litOptions.lights.filter((light: pc.Light) => light !== this.sun),
                ]
              : options.litOptions.lights;
            alternate.litOptions = {
              ...options.litOptions,
              clusteredLightingShadowType: settings.local,
              lights: lights.map((light: pc.Light) => {
                if (light.type !== pc.LIGHTTYPE_DIRECTIONAL) return light;
                const copy = light.clone();
                copy.shadowType = settings.sun;
                copies.push(copy);
                return copy;
              }),
            };
            return alternate;
          };
          prepared.add(super.getShaderVariant(params));
        }
    } finally {
      this.onUpdateShader = original;
      for (const light of copies) light.destroy();
    }
    return shader;
  }
}
