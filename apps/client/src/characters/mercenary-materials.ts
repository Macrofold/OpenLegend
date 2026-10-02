import * as pc from 'playcanvas';
import { ShadowMaterial } from '../shadow-material';
// Fixed model-surface paint; never classify colors or introduce noise per frame.
const palette = [
  '202830',
  '30383e',
  '454d50',
  '616b69',
  '87928a',
  'a5ac98',
  '322924',
  '49342b',
  '634431',
  '825738',
  'a87447',
  'c99a60',
  'e4bd83',
  '472c29',
  '684032',
  '915738',
  'b77950',
  'd79b68',
  'ecc28b',
  'f3d8a5',
  '392832',
  '683c3b',
  '934936',
  'ae5e42',
  '735330',
  'ad7337',
  'd19b4c',
  'edd09a',
  'f5deb0',
].map(
  (h) =>
    [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ] as const,
);
const shapedLight = `float getLightDiffuse(vec3 n,vec3 viewDir,vec3 lightDir){
 float d=max(dot(n,-lightDir),0.0);
 return .06+.20*smoothstep(.08,.22,d)+.29*smoothstep(.31,.49,d)+.33*smoothstep(.60,.80,d);
}`;
export class MercenaryMaterials {
  private readonly variants = new Map<pc.Texture, Map<boolean, pc.Texture>>();
  private readonly owned = new Set<pc.Texture>();
  private readonly prepared = new Map<pc.StandardMaterial, ShadowMaterial>();
  constructor(
    private readonly device: pc.GraphicsDevice,
    private readonly sun: pc.Light,
  ) {}
  prepare(source: pc.StandardMaterial): pc.StandardMaterial {
    const existing = this.prepared.get(source);
    if (existing) return existing;
    const material = new ShadowMaterial(this.sun).copy(source);
    this.prepared.set(source, material);
    material.useMetalness = true;
    material.metalness = 0;
    material.gloss = 0.05;
    material.specular.set(0.015, 0.015, 0.015);
    material.normalMap = null;
    material.shaderChunks.glsl.set('lightDiffuseLambertPS', shapedLight);
    if (material.diffuseMap)
      material.diffuseMap = this.surfaceTexture(
        material.diffuseMap,
        material.name.startsWith('Mercenary'),
      );
    material.update();
    return material;
  }
  private surfaceTexture(source: pc.Texture, body: boolean): pc.Texture {
    let cache = this.variants.get(source);
    if (!cache) {
      cache = new Map<boolean, pc.Texture>();
      this.variants.set(source, cache);
    }
    const cached = cache.get(body);
    if (cached) return cached;
    const image: unknown = source.getSource();
    const canvas = document.createElement('canvas');
    if (
      !(
        image instanceof HTMLImageElement ||
        image instanceof HTMLCanvasElement ||
        image instanceof ImageBitmap
      )
    )
      throw new Error('Unsupported mercenary texture source');
    canvas.width = Math.min(256, image.width);
    canvas.height = Math.min(256, image.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Texture preparation unavailable');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height),
      data = pixels.data;
    for (let i = 0; i < data.length; i += 4) {
      let r = (data[i] ?? 0) / 255,
        g = (data[i + 1] ?? 0) / 255,
        b = (data[i + 2] ?? 0) / 255;
      const high = Math.max(r, g, b),
        low = Math.min(r, g, b);
      if (body && high > 0.18 && high < 0.72 && high - low < 0.16 && b > r * 0.94) {
        // Broad metal value groups; repetitive artificial ring dots aliased in rotation.
        const l = r * 0.26 + g * 0.55 + b * 0.19;
        [r, g, b] = l < 0.35 ? [0.28, 0.34, 0.36] : [0.4, 0.46, 0.47];
      } else if (body && low > 0.34 && high - low < 0.28 && r > b * 1.1) {
        const l = r * 0.26 + g * 0.55 + b * 0.19;
        [r, g, b] =
          l < 0.51 ? [0.46, 0.42, 0.33] : l < 0.68 ? [0.66, 0.6, 0.47] : [0.83, 0.76, 0.61];
      }
      let best: readonly [number, number, number] = [32, 40, 48],
        distance = Infinity;
      for (const p of palette) {
        const d =
          (r * 255 - p[0]) ** 2 * 0.26 +
          (g * 255 - p[1]) ** 2 * 0.55 +
          (b * 255 - p[2]) ** 2 * 0.19;
        if (d < distance) {
          distance = d;
          best = p;
        }
      }
      data[i] = best[0];
      data[i + 1] = best[1];
      data[i + 2] = best[2];
    }
    ctx.putImageData(pixels, 0, 0);
    const texture = new pc.Texture(this.device, {
      name: 'Prepared pixel surface',
      flipY: source.flipY,
      premultiplyAlpha: source.premultiplyAlpha,
      width: canvas.width,
      height: canvas.height,
      mipmaps: true,
      minFilter: pc.FILTER_LINEAR_MIPMAP_LINEAR,
      magFilter: pc.FILTER_LINEAR,
      addressU: source.addressU,
      addressV: source.addressV,
      anisotropy: 4,
    });
    texture.setSource(canvas);
    cache.set(body, texture);
    this.owned.add(texture);
    return texture;
  }
  destroy(): void {
    for (const material of this.prepared.values()) material.destroy();
    for (const texture of this.owned) texture.destroy();
    this.owned.clear();
    this.variants.clear();
    this.prepared.clear();
  }
}
