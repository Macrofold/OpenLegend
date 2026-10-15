import * as pc from 'playcanvas';
import { ShadowMaterial } from '../shadow-material';
import { personStencil, setVisibilityStencil } from '../visibility-stencil';

/** Shared source artwork lit by the world, then sampled by the character image. */
export class MercenaryMaterials {
  private readonly prepared = new Map<pc.StandardMaterial, ShadowMaterial>();
  constructor(private readonly sun: pc.Light) {}

  prepare(source: pc.StandardMaterial): pc.StandardMaterial {
    const existing = this.prepared.get(source);
    if (existing) return existing;
    const material = new ShadowMaterial(this.sun).copy(source);
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
    material.update();
    this.prepared.set(source, material);
    return material;
  }

  destroy(): void {
    for (const material of this.prepared.values()) material.destroy();
    this.prepared.clear();
  }
}
