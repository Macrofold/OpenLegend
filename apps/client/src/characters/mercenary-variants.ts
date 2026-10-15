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
  private readonly textures = new Set<pc.Texture>();
  private readonly images = new Set<ImageBitmap>();
  private readonly downloads = new Set<AbortController>();
  private readonly paints = new Map<PaintedArt, Paint>();
  private readonly pending = new Map<PaintedArt, Promise<void>>();
  private readonly failed = new Set<PaintedArt>();
  private filtering: ArtTreatment['characterFiltering'] = 'source';
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
  private async load(url: string): Promise<pc.Texture> {
    const download = new AbortController();
    this.downloads.add(download);
    try {
      const response = await fetch(url, { signal: download.signal });
      if (!response.ok) throw new Error('Mercenary artwork did not load.');
      const bitmap = await createImageBitmap(await response.blob(), {
        imageOrientation: 'none',
        premultiplyAlpha: 'none',
        colorSpaceConversion: 'none',
      });
      if (this.disposed) {
        bitmap.close();
        throw new Error('Mercenary artwork owner was destroyed.');
      }
      const texture = new pc.Texture(this.app.graphicsDevice, {
        name: url.split('/').at(-1),
        width: bitmap.width,
        height: bitmap.height,
        format: pc.PIXELFORMAT_SRGBA8,
        flipY: false,
        addressU: pc.ADDRESS_CLAMP_TO_EDGE,
        addressV: pc.ADDRESS_CLAMP_TO_EDGE,
      });
      this.filterTexture(texture);
      // The pinned runtime accepts ImageBitmap, but its declaration still lists
      // only DOM image/video/canvas sources.
      texture.setSource(bitmap as unknown as HTMLImageElement);
      this.images.add(bitmap);
      this.textures.add(texture);
      return texture;
    } finally {
      this.downloads.delete(download);
    }
  }
  setFiltering(filtering: ArtTreatment['characterFiltering']): void {
    if (this.filtering === filtering) return;
    this.filtering = filtering;
    for (const texture of this.textures) this.filterTexture(texture);
  }
  private filterTexture(texture: pc.Texture): void {
    // Source artwork was authored for mipmapped minification; retain that
    // sampling as its source policy and compare a deliberately sharper control.
    texture.magFilter = pc.FILTER_NEAREST;
    texture.mipmaps = this.filtering !== 'nearest';
    texture.minFilter =
      this.filtering === 'nearest' ? pc.FILTER_NEAREST : pc.FILTER_LINEAR_MIPMAP_LINEAR;
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
    for (const download of this.downloads) download.abort();
    this.downloads.clear();
    for (const texture of this.textures) texture.destroy();
    this.textures.clear();
    for (const image of this.images) image.close();
    this.images.clear();
  }
}
