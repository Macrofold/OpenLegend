import * as pc from 'playcanvas';

export type BundledModel = pc.ContainerResource & { animations: pc.Asset[] };
function container(value: unknown): value is BundledModel {
  return (
    typeof value === 'object' &&
    value !== null &&
    'instantiateRenderEntity' in value &&
    typeof value.instantiateRenderEntity === 'function' &&
    'animations' in value &&
    Array.isArray(value.animations)
  );
}

/** Lifetime of the finite trusted GLBs bundled with a scene. Downloads can be
 * cancelled; already-started local glTF parsing must finish before its registry
 * is destroyed because the pinned parser registers embedded images asynchronously. */
export class BundledModels {
  private readonly assets: pc.Asset[] = [];
  private readonly pending = new Map<string, Promise<BundledModel>>();
  private readonly downloads = new Set<AbortController>();
  private readonly parsing = new Set<Promise<BundledModel>>();
  private disposed = false;
  constructor(private readonly app: pc.Application) {}

  load(name: string, url: string): Promise<BundledModel> {
    if (this.disposed) return Promise.reject(new Error('Model owner was destroyed.'));
    const existing = this.pending.get(url);
    if (existing) return existing;
    const download = new AbortController();
    this.downloads.add(download);
    const promise = fetch(url, { signal: download.signal })
      .then((response) => {
        if (!response.ok) throw new Error(name + ' download failed.');
        return response.arrayBuffer();
      })
      .finally(() => this.downloads.delete(download))
      .then((contents) => {
        if (this.disposed) throw new Error('Model owner was destroyed.');
        const asset = new pc.Asset(name, 'container', { url, filename: url, contents });
        const parsed = new Promise<BundledModel>((resolve, reject) => {
          asset.once('load', () => {
            if (this.disposed || !container(asset.resource)) {
              asset.unload();
              this.app.assets.remove(asset);
              reject(new Error(name + ' owner was destroyed or its model is unavailable.'));
            } else {
              this.assets.push(asset);
              resolve(asset.resource);
            }
          });
          asset.once('error', () => {
            asset.unload();
            this.app.assets.remove(asset);
            reject(new Error(name + ' model unavailable.'));
          });
        });
        this.parsing.add(parsed);
        this.app.assets.add(asset);
        this.app.assets.load(asset);
        return parsed.finally(() => this.parsing.delete(parsed));
      })
      .catch((error: unknown) => {
        // Share in-flight/successful work, but a transient failure must not
        // poison later explicit requests for this bundled asset. No retry is
        // dispatched here; the next caller decides whether to request it again.
        this.pending.delete(url);
        throw error;
      });
    this.pending.set(url, promise);
    return promise;
  }

  destroy(): Promise<void> | undefined {
    if (this.disposed) return;
    this.disposed = true;
    for (const download of this.downloads) download.abort();
    this.downloads.clear();
    for (const asset of this.assets) {
      asset.unload();
      this.app.assets.remove(asset);
    }
    this.assets.length = 0;
    this.pending.clear();
    if (this.parsing.size) return Promise.allSettled([...this.parsing]).then(() => undefined);
    return undefined;
  }
}

/** Stop an inspection/game renderer now; only local model-parser cleanup may
 * outlive it. The pinned engine otherwise clears a same-canvas successor entry. */
export function destroyModelApplication(
  app: pc.Application,
  parsing: readonly (Promise<void> | undefined)[],
): void {
  app.autoRender = false;
  pc.AppBase.cancelTick(app);
  const finish = () => {
    const id = app.graphicsDevice.canvas.id;
    app.once('destroy', () => {
      const replacement = pc.AppBase.getApplication(id);
      if (!replacement || replacement === app) return;
      // The engine defers destruction requested inside an update. Restore only
      // after its actual cleanup, and never overwrite a newer/live registry entry
      // or resurrect a replacement that has itself already been destroyed.
      queueMicrotask(() => {
        if (replacement.root && !pc.AppBase.getApplication(id))
          Object.assign(pc.AppBase._applications, { [id]: replacement });
      });
    });
    app.destroy();
  };
  const pending = parsing.filter((item): item is Promise<void> => item !== undefined);
  if (pending.length) void Promise.all(pending).then(finish);
  else finish();
}
