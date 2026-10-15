import * as pc from 'playcanvas';
import { ShadowMaterial } from '../shadow-material';
import { ArtMaterials, type ArtTreatment } from '../art-treatment';
import { personStencil, setVisibilityStencil } from '../visibility-stencil';
import { MercenaryVariants, type MercenaryArt } from './mercenary-variants';

/** Shared source artwork lit by the world, then sampled by the character image. */
export class MercenaryMaterials {
  private readonly prepared = new Map<pc.StandardMaterial, ShadowMaterial>();
  private readonly textures = new Set<pc.Texture>();
  private readonly originalSampling = new WeakMap<
    pc.Texture,
    {
      min: number;
      mag: number;
      mipmaps: boolean;
    }
  >();
  private filtering: ArtTreatment['characterFiltering'] = 'source';
  private readonly variants: MercenaryVariants;
  private wantedArt: MercenaryArt = 'original';
  constructor(
    app: pc.Application,
    private readonly sun: pc.Light,
    private readonly art: ArtMaterials,
    private readonly artChanged: (art: MercenaryArt) => void,
  ) {
    this.variants = new MercenaryVariants(app, () => {
      for (const [source, material] of this.prepared) this.applyPaint(source, material);
      this.artChanged(this.variants.current);
    });
  }

  prepare(source: pc.StandardMaterial): pc.StandardMaterial {
    const existing = this.prepared.get(source);
    if (existing) return existing;
    const material = new ShadowMaterial(this.sun).copy(source);
    const paint = material.diffuseMap;
    if (paint && !this.originalSampling.has(paint)) {
      // The GLB owner retains these textures. Remember its imported sampling
      // once so the source control survives nearest/mipmap comparison toggles.
      this.originalSampling.set(paint, {
        min: paint.minFilter,
        mag: paint.magFilter,
        mipmaps: paint.mipmaps,
      });
      this.textures.add(paint);
      this.filterTexture(paint);
    }
    material.useMetalness = true;
    material.metalness = 0;
    material.specular.set(0.015, 0.015, 0.015);
    // The imported atlas also supplied emission, which made the outfit glow
    // through world lighting. Keep its diffuse artwork and authored roughness.
    material.emissiveMap = null;
    material.emissive.set(0, 0, 0);
    // Both sides share each simulated panel's outer winding. Render embroidery
    // outside and the original dark lining inside, without coplanar overdraw.
    if (source.name === 'Madder wool · gold peacock embroidery') material.cull = pc.CULLFACE_BACK;
    else if (source.name === 'Cape lining · dark russet') {
      material.cull = pc.CULLFACE_FRONT;
      material.twoSidedLighting = true;
    }
    setVisibilityStencil(material, personStencil);
    this.art.prepare(
      material,
      source.name.includes('Madder') || source.name.includes('lining')
        ? 2
        : source.name === 'Mercenary · pixel-painted material atlas'
          ? 1
          : 0,
    );
    material.update();
    this.prepared.set(source, material);
    this.applyPaint(source, material);
    return material;
  }

  private applyPaint(source: pc.StandardMaterial, material: pc.StandardMaterial): void {
    const body = source.name === 'Mercenary · pixel-painted material atlas';
    const cape = source.name.includes('Madder');
    if (!body && !cape) return;
    const paint = this.variants.paint;
    material.diffuseMap = paint ? (body ? paint.body : paint.cape) : source.diffuseMap;
    // The new offline designs already describe mail, leather, wraps and fabric.
    // Repainting them with the older height zones would erase their differences.
    material.setParameter('ol_artRole', paint ? 0 : body ? 1 : 2);
    material.update();
  }

  setArtTreatment(style: Readonly<ArtTreatment>): void {
    if (style.characterFiltering !== this.filtering) {
      this.filtering = style.characterFiltering;
      for (const texture of this.textures) this.filterTexture(texture);
    }
    if (style.mercenaryArt !== this.wantedArt) {
      this.wantedArt = style.mercenaryArt;
      this.variants.set(style.mercenaryArt);
    }
  }
  diagnostics() {
    return this.variants.diagnostics();
  }
  private filterTexture(texture: pc.Texture): void {
    const source = this.originalSampling.get(texture);
    if (this.filtering === 'source' && source) {
      texture.minFilter = source.min;
      texture.magFilter = source.mag;
      texture.mipmaps = source.mipmaps;
    } else {
      texture.mipmaps = this.filtering === 'mip';
      texture.minFilter =
        this.filtering === 'mip' ? pc.FILTER_LINEAR_MIPMAP_LINEAR : pc.FILTER_NEAREST;
      // Minification is compared separately from the final nearest enlargement.
      texture.magFilter = pc.FILTER_NEAREST;
    }
  }
  destroy(): void {
    this.textures.clear();
    for (const material of this.prepared.values()) material.destroy();
    this.prepared.clear();
    this.variants.destroy();
  }
}
