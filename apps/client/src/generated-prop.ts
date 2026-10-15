import * as pc from 'playcanvas';
import generatedChestUrl from './props/generated-chest.glb?url';
import { ArtMaterials } from './art-treatment';
import { ShadowMaterial } from './shadow-material';
import { ordinaryStencil, setVisibilityStencil } from './visibility-stencil';

function container(resource: unknown): resource is pc.ContainerResource {
  return (
    typeof resource === 'object' &&
    resource !== null &&
    'instantiateRenderEntity' in resource &&
    typeof resource.instantiateRenderEntity === 'function'
  );
}

/** One attributed offline E08 prop. Appearance only: its caller supplies the
 * existing object's envelope and owns fallback, reveal and semantic picking.
 * docs/verification/generated-prop-coherence.md */
export class GeneratedPropResources {
  private asset?: pc.Asset;
  private pending?: Promise<pc.ContainerResource>;
  private disposed = false;
  private readonly prepared = new Map<pc.StandardMaterial, pc.StandardMaterial>();
  private readonly actors = new Set<GeneratedPropActor>();
  constructor(
    private readonly app: pc.Application,
    private readonly art: ArtMaterials,
    private readonly sun?: pc.Light,
  ) {}

  create(
    parent: pc.Entity,
    width: number,
    height: number,
    depth: number,
    onReady?: (actor: GeneratedPropActor) => void,
  ): GeneratedPropActor {
    const actor: GeneratedPropActor = new GeneratedPropActor(
      parent,
      width,
      height,
      depth,
      this.load(),
      (material) => this.prepare(material),
      () => this.actors.delete(actor),
      onReady,
    );
    this.actors.add(actor);
    return actor;
  }

  private load(): Promise<pc.ContainerResource> {
    return (this.pending ??= new Promise<pc.ContainerResource>((resolve, reject) => {
      this.app.assets.loadFromUrl(generatedChestUrl, 'container', (error, asset) => {
        if (this.disposed || error || !asset || !container(asset.resource)) {
          if (asset) {
            asset.unload();
            this.app.assets.remove(asset);
          }
          reject(
            new Error(
              this.disposed
                ? 'Generated prop owner was destroyed.'
                : String(error ?? 'Generated prop did not load.'),
            ),
          );
          return;
        }
        this.asset = asset;
        resolve(asset.resource);
      });
    }));
  }

  private prepare(source: pc.StandardMaterial): pc.StandardMaterial {
    const existing = this.prepared.get(source);
    if (existing) return existing;
    const material = new ShadowMaterial(this.sun).copy(source);
    setVisibilityStencil(material, ordinaryStencil);
    this.art.prepare(material);
    material.update();
    this.prepared.set(source, material);
    return material;
  }

  /** Release any WorldPresentation cached copies before destroying this owner. */
  get materials(): readonly pc.StandardMaterial[] {
    return [...this.prepared.values()];
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const actor of [...this.actors]) actor.destroy();
    for (const material of this.prepared.values()) material.destroy();
    this.prepared.clear();
    if (this.asset) {
      this.asset.unload();
      this.app.assets.remove(this.asset);
    }
    this.asset = undefined;
  }
}

export class GeneratedPropActor {
  readonly ready: Promise<boolean>;
  readonly meshes: pc.MeshInstance[] = [];
  state: 'loading' | 'ready' | 'failed' = 'loading';
  visible = false;
  private node?: pc.Entity;
  private wanted = false;
  private disposed = false;
  get root(): pc.Entity | undefined {
    return this.node;
  }
  constructor(
    parent: pc.Entity,
    width: number,
    height: number,
    depth: number,
    loaded: Promise<pc.ContainerResource>,
    prepare: (source: pc.StandardMaterial) => pc.StandardMaterial,
    private readonly release: () => void,
    onReady?: (actor: GeneratedPropActor) => void,
  ) {
    this.ready = loaded
      .then((resource) => {
        if (this.disposed) return false;
        const node = (this.node = resource.instantiateRenderEntity({
          castShadows: true,
          receiveShadows: true,
        }));
        node.setLocalScale(width, height, depth);
        node.enabled = false;
        parent.addChild(node);
        for (const component of node.findComponents('render')) {
          if (!(component instanceof pc.RenderComponent)) continue;
          for (const instance of component.meshInstances) {
            if (instance.material instanceof pc.StandardMaterial)
              instance.material = prepare(instance.material);
            this.meshes.push(instance);
          }
        }
        if (this.meshes.length === 0) throw new Error('Generated prop contains no render meshes.');
        this.state = 'ready';
        this.setVisible(this.wanted);
        return true;
      })
      .catch((error: unknown) => {
        if (!this.disposed) {
          this.node?.destroy();
          this.node = undefined;
          this.meshes.length = 0;
          this.state = 'failed';
          this.visible = false;
          console.warn('Generated prop unavailable; keeping the authored crate.', error);
        }
        return false;
      })
      .then((installed) => {
        if (!installed || this.disposed) return false;
        onReady?.(this);
        return true;
      });
  }

  setVisible(visible: boolean): void {
    this.wanted = visible;
    this.visible = !this.disposed && this.state === 'ready' && visible;
    if (this.node) this.node.enabled = this.visible;
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.visible = false;
    this.node?.destroy();
    this.node = undefined;
    this.meshes.length = 0;
    this.release();
  }
}
