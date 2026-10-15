import * as pc from 'playcanvas';
import { ShadowMaterial } from '../shadow-material';
import { personStencil, setVisibilityStencil } from '../visibility-stencil';
import { ModelSurfaceDepth } from './model-surface-depth';

/** Scene-owned material clones borrow the GLB's unchanged authored textures. */
export class MercenaryMaterials {
  private readonly prepared = new Map<pc.StandardMaterial, ShadowMaterial>();
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
    const material = new ShadowMaterial(this.sun).copy(source);
    this.prepared.set(source, material);
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
    ModelSurfaceDepth.prepareMaterial(material, this.device);
    material.update();
    return material;
  }

  destroy(): void {
    for (const material of this.prepared.values()) material.destroy();
    this.prepared.clear();
  }
}
