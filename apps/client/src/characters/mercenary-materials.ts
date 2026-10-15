import * as pc from 'playcanvas';
import { ShadowMaterial } from '../shadow-material';
import { personStencil, setVisibilityStencil } from '../visibility-stencil';
import { ModelSurfaceDepth } from './model-surface-depth';

/** Scene-owned material/paint preparation. The source GLB remains unchanged. */
export class MercenaryMaterials {
  private readonly prepared = new Map<pc.StandardMaterial, ShadowMaterial>();
  private readonly textures = new Map<pc.Texture, pc.Texture>();
  constructor(
    private readonly sun: pc.Light,
    private readonly device: pc.GraphicsDevice,
  ) {}

  get values(): Iterable<pc.StandardMaterial> {
    return this.prepared.values();
  }

  prepare(source: pc.StandardMaterial): pc.StandardMaterial {
    const existing = this.prepared.get(source);
    if (existing) return existing;
    const paint = source.diffuseMap ? this.surfacePaint(source.diffuseMap) : null;
    const material = new ShadowMaterial(this.sun).copy(source);
    material.useMetalness = true;
    material.metalness = 0;
    material.specular.set(0.015, 0.015, 0.015);
    // The imported atlas also supplied emission, which made the outfit glow
    // through world lighting. Keep its diffuse artwork and authored roughness.
    material.emissiveMap = null;
    material.emissive.set(0, 0, 0);
    if (paint) material.diffuseMap = paint;
    // Both sides share each simulated panel's outer winding. Render embroidery
    // outside and the original dark lining inside, without coplanar overdraw.
    if (source.name === 'Madder wool · gold peacock embroidery') material.cull = pc.CULLFACE_BACK;
    else if (source.name === 'Cape lining · dark russet') {
      material.cull = pc.CULLFACE_FRONT;
      material.twoSidedLighting = true;
    }
    setVisibilityStencil(material, personStencil);
    ModelSurfaceDepth.prepareMaterial(material, this.device);
    material.update();
    this.prepared.set(source, material);
    return material;
  }

  private surfacePaint(source: pc.Texture): pc.Texture {
    const existing = this.textures.get(source);
    if (existing) return existing;
    const canvas = document.createElement('canvas');
    // Match neighboring painted people without resampling the animated model.
    // Keep the cape's aspect ratio and source colors; the face needs its subtle values.
    canvas.width = 192;
    canvas.height = Math.round((source.height / source.width) * canvas.width);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Mercenary paint preparation unavailable');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(source.getSource(), 0, 0, canvas.width, canvas.height);
    const texture = new pc.Texture(this.device, {
      name: 'Mercenary fixed surface paint',
      width: canvas.width,
      height: canvas.height,
      format: pc.PIXELFORMAT_RGBA8,
      srgb: source.srgb,
      mipmaps: true,
      minFilter: pc.FILTER_NEAREST_MIPMAP_LINEAR,
      magFilter: pc.FILTER_NEAREST,
      addressU: source.addressU,
      addressV: source.addressV,
    });
    texture.setSource(canvas);
    this.textures.set(source, texture);
    return texture;
  }

  destroy(): void {
    for (const material of this.prepared.values()) material.destroy();
    this.prepared.clear();
    for (const texture of this.textures.values()) texture.destroy();
    this.textures.clear();
  }
}
