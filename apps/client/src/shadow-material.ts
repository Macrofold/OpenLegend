import * as pc from 'playcanvas';
import type { ShadowQuality } from './world-renderer';

export const shadowSettings = {
  detailed: {
    sun: pc.SHADOW_PCSS_32F,
    local: pc.SHADOW_PCF5_32F,
    sunResolution: 2048,
    localResolution: 2048,
  },
  // The sun spans the camera frustum: 1024 undersamples thin foliage even at
  // ordinary framing. Keep the cheaper local atlas independent of that footprint.
  economy: {
    sun: pc.SHADOW_PCF5_32F,
    local: pc.SHADOW_PCF3_32F,
    sunResolution: 2048,
    localResolution: 1024,
  },
} satisfies Record<
  ShadowQuality,
  { sun: number; local: number; sunResolution: number; localResolution: number }
>;

// The engine's program cache owns shaders. Weak membership shares preparation
// across materials using the same program without retaining obsolete devices.
const prepared = new WeakSet<pc.Shader>();
export type ShaderVariantParameters = Parameters<pc.Material['getShaderVariant']>[0];

declare global {
  interface Window {
    /** Installed only by the local browser profiler; it records program ownership. */
    __openLegendShaderProbe?: (shader: pc.Shader, material: pc.Material, pass: number) => void;
  }
}

/** Prepare quality and day/night variants while creating an already-needed program.
 * PlayCanvas 2.22.2 otherwise first links it during drawing, blocking the render
 * thread (notably instanced grass). Use the same generator and processing inputs;
 * no alternate scene, hidden draw, copied GLSL or synchronous readiness query.
 * docs/world-presentation.md#shadow-quality
 */
export class ShadowMaterial extends pc.StandardMaterial {
  prepareRelated?: (params: ShaderVariantParameters, shader: pc.Shader) => void;
  private shadowFilteringPrepared = false;

  constructor(private sun?: pc.Light) {
    super();
  }

  override copy(source: pc.StandardMaterial): this {
    super.copy(source);
    // StandardMaterial.clone constructs without arguments before copying; retain
    // the disabled sun too, so clones first drawn at night can prepare sunrise.
    this.sun = source instanceof ShadowMaterial ? source.sun : this.sun;
    this.shadowFilteringPrepared = false;
    return this;
  }

  private prepareShadowFiltering(device: pc.GraphicsDevice): void {
    if (this.shadowFilteringPrepared || !this.useLighting) return;
    this.shadowFilteringPrepared = true;
    // PCSS stores raw nearest-sampled depths. Comparing a filtered depth would
    // invent surfaces between blockers; blend their visibility comparisons
    // instead, so fine shadows move across texels without binary sample jumps.
    // Preserve the artwork owner's existing fixed/screen sample-pattern chunk.
    // docs/world-presentation.md#shadow-quality
    const source =
      this.shaderChunks.glsl.get('shadowSoftPS') ??
      pc.ShaderChunks.get(device).get('shadowSoftPS')!;
    if (source.includes('float ol_pcssVisibility(')) return;
    this.shaderChunks.version = '2.22';
    this.shaderChunks.glsl.set(
      'shadowSoftPS',
      source
        .replace(
          'float PCSSFilter(',
          `float ol_pcssVisibility(TEXTURE_ACCEPT(shadowMap), vec2 uv, float receiverDepth) {
  vec2 size = vec2(textureSize(shadowMap, 0));
  vec2 pixel = uv * size - 0.5;
  vec2 weight = fract(pixel);
  vec2 corner = (floor(pixel) + 0.5) / size;
  vec2 texel = 1.0 / size;
  float a = step(receiverDepth, texture2DLod(shadowMap, corner, 0.0).r);
  float b = step(receiverDepth, texture2DLod(shadowMap, corner + vec2(texel.x, 0.0), 0.0).r);
  float c = step(receiverDepth, texture2DLod(shadowMap, corner + vec2(0.0, texel.y), 0.0).r);
  float d = step(receiverDepth, texture2DLod(shadowMap, corner + texel, 0.0).r);
  return mix(mix(a, b, weight.x), mix(c, d, weight.x), weight.y);
}
float PCSSFilter(`,
        )
        .replace(
          'float sum = 0.0;',
          `vec2 texel = 1.0 / vec2(textureSize(shadowMap, 0));
  filterRadius = max(filterRadius, 1.5 * max(texel.x, texel.y));
  float sum = 0.0;`,
        )
        .replace(
          /float depth = texture2DLod\(shadowMap, uv \+ offsetUV, 0\.0\)\.r;\s+sum \+= step\(receiverDepth, depth\);/,
          'sum += ol_pcssVisibility(TEXTURE_PASS(shadowMap), uv + offsetUV, receiverDepth);',
        )
        .replace(
          /if \(numBlockers < 1\)\s+return 1\.0f;/,
          // A sparse search can miss a thin blocker even at contact. Preserve
          // the filtered central footprint rather than popping fully lit.
          'if (numBlockers < 1) return ol_pcssVisibility(TEXTURE_PASS(shadowMap), shadowCoords.xy, receiverDepthClamped);',
        ),
    );
  }

  private variant(params: ShaderVariantParameters): pc.Shader {
    const shader = super.getShaderVariant(params);
    window.__openLegendShaderProbe?.(shader, this, params.pass);
    return shader;
  }

  override getShaderVariant(params: ShaderVariantParameters): pc.Shader {
    this.prepareShadowFiltering(params.device);
    const shader = this.variant(params);
    if (params.device.contextLost) return shader;
    if (params.pass === pc.SHADER_FORWARD) this.prepareRelated?.(params, shader);
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
          prepared.add(this.variant(params));
        }
    } finally {
      this.onUpdateShader = original;
      for (const light of copies) light.destroy();
    }
    return shader;
  }

  override destroy(): void {
    this.prepareRelated = undefined;
    super.destroy();
  }
}
