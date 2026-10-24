import { assetUrl, readAssetBytes } from '../asset-files';
import * as pc from 'playcanvas';
import type { ArtTreatment } from '../art-treatment';
const faithfulBody = assetUrl(
  'apps/client/src/characters/mercenary-assets/variants/body-faithful.png',
);
const faithfulCape = assetUrl(
  'apps/client/src/characters/mercenary-assets/variants/cape-faithful.png',
);
const paintedBody = assetUrl(
  'apps/client/src/characters/mercenary-assets/variants/body-painted.png',
);
const paintedCape = assetUrl(
  'apps/client/src/characters/mercenary-assets/variants/cape-painted.png',
);
const graphicBody = assetUrl(
  'apps/client/src/characters/mercenary-assets/variants/body-graphic.png',
);
const graphicCape = assetUrl(
  'apps/client/src/characters/mercenary-assets/variants/cape-graphic.png',
);
const restoredBody = assetUrl('apps/client/src/props/art-study/source-mercenary/body-restored.png');
const restoredCape = assetUrl('apps/client/src/props/art-study/source-mercenary/cape-restored.png');
const tailoredBody = assetUrl('apps/client/src/props/art-study/source-mercenary/body-tailored.png');
const tailoredCape = assetUrl('apps/client/src/props/art-study/source-mercenary/cape-tailored.png');
const embroideredBody = assetUrl(
  'apps/client/src/props/art-study/source-mercenary/body-embroidered.png',
);
const embroideredCape = assetUrl(
  'apps/client/src/props/art-study/source-mercenary/cape-embroidered.png',
);

export type MercenaryArt = ArtTreatment['mercenaryArt'];
type PaintedArt = Exclude<MercenaryArt, 'original'>;
type Paint = { body: pc.Texture; cape: pc.Texture };
const sources: Record<PaintedArt, readonly [string, string]> = {
  faithful: [faithfulBody, faithfulCape],
  painted: [paintedBody, paintedCape],
  graphic: [graphicBody, graphicCape],
  restored: [restoredBody, restoredCape],
  tailored: [tailoredBody, tailoredCape],
  embroidered: [embroideredBody, embroideredCape],
};

/** Finite offline artwork, shared by the existing mercenary owner. Loading a
 * comparison never changes geometry, rig, scale or the active game. */
export class MercenaryVariants {
  private readonly textures = new Set<pc.Texture>();
  private readonly images = new Set<ImageBitmap>();
  private readonly downloads = new Set<AbortController>();
  private readonly paints = new Map<PaintedArt, Paint>();
  private readonly pending = new Map<PaintedArt, Promise<void>>();
  private readonly textureLoads = new Map<string, Promise<pc.Texture>>();
  private readonly failed = new Set<PaintedArt>();
  private filtering: ArtTreatment['characterFiltering'] = 'source';
  private disposed = false;
  private wanted: MercenaryArt = 'original';
  private active: MercenaryArt = 'original';
  constructor(
    private readonly app: pc.Application,
    private readonly changed: () => void,
    private readonly prepareArt: (art: MercenaryArt) => Promise<void>,
  ) {}
  set(art: MercenaryArt): void {
    this.wanted = art;
    this.active = art === 'original' || this.paints.has(art) ? art : 'original';
    this.changed();
    if (art === 'original' || this.paints.has(art) || this.pending.has(art)) return;
    const [bodyUrl, capeUrl] = sources[art];
    const pending = Promise.all([this.load(bodyUrl), this.load(capeUrl), this.prepareArt(art)])
      .then(([body, cape]) => {
        if (this.disposed) return;
        this.paints.set(art, { body, cape });
        this.failed.delete(art);
        if (this.wanted === art) {
          this.active = art;
          this.changed();
        }
      })
      .catch((error: unknown) => {
        if (this.disposed) return;
        this.failed.add(art);
        console.warn('Mercenary artwork unavailable; retaining original artwork.', error);
      })
      .finally(() => this.pending.delete(art));
    this.pending.set(art, pending);
  }
  private load(url: string): Promise<pc.Texture> {
    const existing = this.textureLoads.get(url);
    if (existing) return existing;
    // A later explicit selection may retry a failed pair. Retain its successful
    // member so repeated partial failures do not allocate another GPU texture.
    const loading = this.loadTexture(url).catch((error: unknown) => {
      this.textureLoads.delete(url);
      throw error;
    });
    this.textureLoads.set(url, loading);
    return loading;
  }
  private async loadTexture(url: string): Promise<pc.Texture> {
    const download = new AbortController();
    this.downloads.add(download);
    try {
      const contents = await readAssetBytes(url, download.signal);
      const bitmap = await createImageBitmap(new Blob([contents], { type: 'image/png' }), {
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
  async ready(): Promise<boolean> {
    const wanted = this.wanted;
    if (wanted !== 'original') await this.pending.get(wanted);
    return !this.disposed && this.wanted === wanted && this.active === wanted;
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
    this.pending.clear();
    this.textureLoads.clear();
    for (const download of this.downloads) download.abort();
    this.downloads.clear();
    for (const texture of this.textures) texture.destroy();
    this.textures.clear();
    for (const image of this.images) image.close();
    this.images.clear();
  }
}
