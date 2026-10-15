import * as pc from 'playcanvas';
import type { ArtTreatment } from '../art-treatment';
import faithfulBody from './mercenary-assets/variants/body-faithful.png?url';
import faithfulCape from './mercenary-assets/variants/cape-faithful.png?url';
import paintedBody from './mercenary-assets/variants/body-painted.png?url';
import paintedCape from './mercenary-assets/variants/cape-painted.png?url';
import graphicBody from './mercenary-assets/variants/body-graphic.png?url';
import graphicCape from './mercenary-assets/variants/cape-graphic.png?url';

export type MercenaryArt = ArtTreatment['mercenaryArt'];
type PaintedArt = Exclude<MercenaryArt, 'original'>;
type Paint = { body: pc.Texture; cape: pc.Texture };
const sources: Record<PaintedArt, readonly [string, string]> = {
  faithful: [faithfulBody, faithfulCape],
  painted: [paintedBody, paintedCape],
  graphic: [graphicBody, graphicCape],
};

/** Finite offline artwork, shared by the existing mercenary owner. Loading a
 * comparison never changes geometry, rig, scale or the active game. */
export class MercenaryVariants {
  private readonly assets = new Set<pc.Asset>();
  private readonly paints = new Map<PaintedArt, Paint>();
  private readonly pending = new Map<PaintedArt, Promise<void>>();
  private readonly failed = new Set<PaintedArt>();
  private disposed = false;
  private wanted: MercenaryArt = 'original';
  private active: MercenaryArt = 'original';
  constructor(
    private readonly app: pc.Application,
    private readonly changed: () => void,
  ) {}
  set(art: MercenaryArt): void {
    this.wanted = art;
    this.active = art === 'original' || this.paints.has(art) ? art : 'original';
    this.changed();
    if (art === 'original' || this.paints.has(art) || this.pending.has(art)) return;
    const [bodyUrl, capeUrl] = sources[art];
    const pending = Promise.all([this.load(bodyUrl), this.load(capeUrl)])
      .then(([body, cape]) => {
        if (this.disposed) return;
        this.paints.set(art, { body, cape });
        if (this.wanted === art) {
          this.active = art;
          this.changed();
        }
      })
      .catch((error: unknown) => {
        if (this.disposed) return;
        this.failed.add(art);
        console.warn('Mercenary artwork unavailable; retaining original artwork.', error);
      });
    this.pending.set(art, pending);
  }
  private load(url: string): Promise<pc.Texture> {
    return new Promise((resolve, reject) => {
      this.app.assets.loadFromUrl(url, 'texture', (error, asset) => {
        if (this.disposed) {
          asset?.unload();
          if (asset) this.app.assets.remove(asset);
          reject(new Error('Mercenary artwork owner was destroyed.'));
          return;
        }
        if (asset) this.assets.add(asset);
        if (error || !(asset?.resource instanceof pc.Texture)) {
          reject(new Error('Mercenary artwork did not load.'));
          return;
        }
        const texture = asset.resource;
        texture.flipY = false;
        texture.addressU = texture.addressV = pc.ADDRESS_CLAMP_TO_EDGE;
        texture.magFilter = pc.FILTER_NEAREST;
        texture.mipmaps = true;
        texture.minFilter = pc.FILTER_LINEAR_MIPMAP_LINEAR;
        resolve(texture);
      });
    });
  }
  get current(): MercenaryArt {
    return this.active;
  }
  get paint(): Paint | undefined {
    return this.active === 'original' ? undefined : this.paints.get(this.active);
  }
  diagnostics() {
    return {
      wanted: this.wanted,
      active: this.active,
      loaded: [...this.paints.keys()],
      failed: [...this.failed],
    };
  }
  destroy(): void {
    this.disposed = true;
    this.paints.clear();
    for (const asset of this.assets) {
      asset.unload();
      this.app.assets.remove(asset);
    }
    this.assets.clear();
  }
}
