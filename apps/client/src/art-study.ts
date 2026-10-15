import * as pc from 'playcanvas';
import { ArtMaterials, candidateArt } from './art-treatment';
import { BundledModels, destroyModelApplication } from './bundled-models';
import './art-study.css';

interface StudyAsset {
  id: string;
  family: string;
  label: string;
  variant: string;
  description: string;
  recommended: boolean;
  file: string;
  bounds: { min: number[]; max: number[] };
  triangles: number;
  vertices: number;
  textureSizes: number[][];
  source: string;
}
interface Catalog {
  group: string;
  sourceFile: string;
  assets: StudyAsset[];
}
type Choice = StudyAsset & { url: string; sourceUrl?: string };
const catalogs = import.meta.glob<Catalog>('./props/art-study/*/catalog.json', {
  eager: true,
  import: 'default',
});
const modelUrls = import.meta.glob<string>('./props/art-study/**/*.glb', {
  eager: true,
  query: '?url',
  import: 'default',
});
const sourceUrls = import.meta.glob<string>(
  '../../../art-direction/assets/representative-study/*.blend',
  {
    eager: true,
    query: '?url',
    import: 'default',
  },
);
const choices: Choice[] = Object.values(catalogs).flatMap((catalog) =>
  catalog.assets.map((asset) => ({
    ...asset,
    url: modelUrls[`./props/art-study/${catalog.group}/${asset.file}`]!,
    sourceUrl: sourceUrls[`../../../${catalog.sourceFile}`],
  })),
);
const familyNames: Record<string, string> = {
  rock: 'Rock and loose stones',
  broadleaf: 'Broadleaf tree',
  conifer: 'Conifer',
  'berry-bush': 'Berry bush',
  chest: 'Chest',
  sword: 'Arming sword',
  shield: 'Wooden shield',
  mara: 'Mara · wool coat',
  tavin: 'Tavin · woven vest',
  armor: 'Kest · armor',
};
function element<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}
const subject = element<HTMLSelectElement>('subject');
for (const family of new Set(choices.map((choice) => choice.family))) {
  const option = document.createElement('option');
  option.value = family;
  option.textContent = familyNames[family] ?? family;
  subject.append(option);
}
const requested = new URLSearchParams(location.hash.slice(1)).get('subject');
if (requested && choices.some((choice) => choice.family === requested)) subject.value = requested;

/** Finite trusted asset inspection, independent of saves, world actions and AI. */
export class ArtStudy {
  readonly app: pc.Application;
  private readonly models: BundledModels;
  private readonly art: ArtMaterials;
  private readonly events = new AbortController();
  private readonly observer: ResizeObserver;
  private readonly camera: pc.Entity;
  private readonly sun: pc.Entity;
  private readonly materials = new Map<pc.StandardMaterial, pc.StandardMaterial>();
  private readonly stageMaterial: pc.StandardMaterial;
  private roots: pc.Entity[] = [];
  private displayed: Choice[] = [];
  private anchors: { node: pc.Entity; label: HTMLElement; height: number }[] = [];
  private epoch = 0;
  private disposed = false;
  private yaw = 0.28;
  private pitch = 0.18;
  private zoom = 1;
  private span = 5;
  private detailSpan = 1;
  private readonly extent = new pc.Vec3(0, 3, 0);
  private tallest = 2;
  private center = new pc.Vec3(0, 1.2, 0);
  private turning = false;
  private labelsDirty = true;
  private dragging?: { id: number; x: number; y: number };
  private readonly reduce = matchMedia('(prefers-reduced-motion: reduce)');
  constructor(private readonly canvas: HTMLCanvasElement) {
    this.app = new pc.Application(canvas, {
      graphicsDeviceOptions: { antialias: true, alpha: false },
    });
    this.app.graphicsDevice.maxPixelRatio = 1;
    element('turn').setAttribute('aria-pressed', 'false');
    element('labels-toggle').setAttribute('aria-pressed', String(!element('labels').hidden));
    this.models = new BundledModels(this.app);
    this.art = new ArtMaterials(this.app.graphicsDevice);
    this.art.update({
      ...candidateArt,
      lighting: element<HTMLSelectElement>('shading').value === 'smooth' ? 'smooth' : 'soft',
    });
    this.app.scene.ambientLight = new pc.Color(0.48, 0.51, 0.45);
    this.camera = new pc.Entity('Study inspection camera', this.app);
    this.camera.addComponent('camera', {
      projection: pc.PROJECTION_ORTHOGRAPHIC,
      clearColor: new pc.Color(0.68, 0.72, 0.64),
      nearClip: 0.1,
      farClip: 500,
    });
    this.app.root.addChild(this.camera);
    this.sun = new pc.Entity('Shared study daylight', this.app);
    this.sun.addComponent('light', {
      type: 'directional',
      color: new pc.Color(1, 0.97, 0.88),
      intensity: 1.45,
      castShadows: true,
      shadowType: pc.SHADOW_PCF3,
      shadowResolution: 2048,
      shadowDistance: 30,
      shadowBias: 0.15,
      normalOffsetBias: 0.02,
    });
    this.sun.setEulerAngles(42, -28, 0);
    this.app.root.addChild(this.sun);
    this.stageMaterial = new pc.StandardMaterial();
    this.stageMaterial.diffuse = new pc.Color(0.48, 0.52, 0.43);
    this.stageMaterial.gloss = 0;
    this.stageMaterial.update();
    const floor = new pc.Entity('Neutral metre-scale study ground', this.app);
    floor.addComponent('render', {
      type: 'plane',
      material: this.stageMaterial,
      castShadows: false,
    });
    floor.setLocalScale(1000, 1, 1000);
    floor.setLocalPosition(0, -0.008, 0);
    this.app.root.addChild(floor);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas.parentElement!);
    const on = (target: EventTarget, event: string, handler: EventListener) =>
      target.addEventListener(event, handler, { signal: this.events.signal });
    for (const id of ['subject', 'versions']) on(element(id), 'change', () => void this.show());
    on(element('framing'), 'change', () => {
      this.zoom = 1;
      this.placeCamera();
    });
    on(element('light'), 'change', () => this.light());
    on(element('projection'), 'change', () => this.placeCamera());
    on(element('shading'), 'change', () =>
      this.art.update({
        ...candidateArt,
        lighting: element<HTMLSelectElement>('shading').value === 'smooth' ? 'smooth' : 'soft',
      }),
    );
    for (const [id, yaw] of [
      ['front', 0],
      ['quarter', 0.55],
      ['back', Math.PI],
    ] as const)
      on(element(id), 'click', () => {
        this.yaw = yaw;
        this.placeCamera();
      });
    on(element('zoom-in'), 'click', () => this.adjustZoom(0.8));
    on(element('zoom-out'), 'click', () => this.adjustZoom(1.25));
    on(element('turn'), 'click', () => {
      this.turning = !this.turning && !this.reduce.matches;
      element('turn').setAttribute('aria-pressed', String(this.turning));
    });
    on(element('labels-toggle'), 'click', () => {
      const labels = element('labels');
      labels.hidden = !labels.hidden;
      element('labels-toggle').setAttribute('aria-pressed', String(!labels.hidden));
    });
    on(this.reduce, 'change', () => {
      if (this.reduce.matches) this.turning = false;
      element('turn').setAttribute('aria-pressed', String(this.turning));
    });
    on(canvas, 'pointerdown', (event) => {
      const e = event as PointerEvent;
      if (e.button !== 0) return;
      canvas.focus();
      canvas.setPointerCapture(e.pointerId);
      this.dragging = { id: e.pointerId, x: e.clientX, y: e.clientY };
    });
    on(canvas, 'pointermove', (event) => {
      const e = event as PointerEvent,
        drag = this.dragging;
      if (!drag || drag.id !== e.pointerId) return;
      this.yaw -= (e.clientX - drag.x) * 0.008;
      this.pitch = pc.math.clamp(this.pitch + (e.clientY - drag.y) * 0.006, 0.12, 1.2);
      drag.x = e.clientX;
      drag.y = e.clientY;
      this.placeCamera();
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'])
      on(canvas, name, () => {
        this.dragging = undefined;
      });
    canvas.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();
        this.adjustZoom(Math.exp(event.deltaY * 0.001));
      },
      { passive: false, signal: this.events.signal },
    );
    on(canvas, 'keydown', (event) => {
      const e = event as KeyboardEvent;
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-'].includes(e.key))
        return;
      e.preventDefault();
      if (e.key === 'ArrowLeft') this.yaw -= 0.12;
      if (e.key === 'ArrowRight') this.yaw += 0.12;
      if (e.key === 'ArrowUp') this.pitch = Math.min(1.2, this.pitch + 0.1);
      if (e.key === 'ArrowDown') this.pitch = Math.max(0.12, this.pitch - 0.1);
      if (e.key === '+' || e.key === '=') this.adjustZoom(0.8);
      if (e.key === '-') this.adjustZoom(1.25);
      this.placeCamera();
    });
    on(window, 'pagehide', () => this.destroy());
    this.app.on('update', (dt: number) => {
      if (this.disposed) return;
      if (this.turning && !this.reduce.matches) {
        this.yaw += Math.min(dt, 0.1) * 0.22;
        this.placeCamera();
      }
      if (this.labelsDirty) {
        this.labels();
        this.labelsDirty = false;
      }
    });
    this.light();
    this.resize();
    this.app.start();
    void this.show();
  }
  private prepare(node: pc.Entity): void {
    for (const component of node.findComponents('render')) {
      if (!(component instanceof pc.RenderComponent)) continue;
      for (const mesh of component.meshInstances) {
        const source = mesh.material;
        if (!(source instanceof pc.StandardMaterial)) continue;
        let material = this.materials.get(source);
        if (!material) {
          material = source.clone();
          for (const texture of [material.diffuseMap, material.normalMap, material.opacityMap]) {
            if (!texture) continue;
            texture.magFilter = pc.FILTER_NEAREST;
            texture.minFilter = pc.FILTER_LINEAR_MIPMAP_LINEAR;
            texture.mipmaps = true;
          }
          this.art.prepare(material);
          material.update();
          this.materials.set(source, material);
        }
        mesh.material = material;
      }
    }
  }
  async show(): Promise<void> {
    const epoch = ++this.epoch,
      composition = subject.value === 'composition';
    const compare = !composition && element<HTMLSelectElement>('versions').value === 'compare';
    let selected = composition
      ? choices.filter((asset) => asset.recommended)
      : choices.filter((asset) => asset.family === subject.value);
    if (!compare && !composition) selected = selected.filter((asset) => asset.recommended);
    if (!selected.length) {
      element('status').textContent = 'No exported assets are available for this subject yet.';
      return;
    }
    element('status').textContent = 'Loading fixed artwork…';
    try {
      const resources = await Promise.all(
        selected.map((asset) => this.models.load(asset.label, asset.url)),
      );
      if (this.disposed || epoch !== this.epoch) return;
      const fresh = resources.map((resource, index) => {
        const artwork = resource.instantiateRenderEntity({
          castShadows: true,
          receiveShadows: true,
        });
        this.prepare(artwork);
        // A single exported mesh may carry its own origin offset. Position a
        // parent so its original model transform (and ground contact) survives.
        const placement = new pc.Entity(selected[index]!.id, this.app);
        placement.addChild(artwork);
        return placement;
      });
      for (const root of this.roots) root.destroy();
      this.roots = fresh;
      this.displayed = selected;
      element('labels').replaceChildren();
      this.anchors = [];
      const largest = Math.max(
        ...selected.map((asset) =>
          Math.max(
            asset.bounds.max[0]! - asset.bounds.min[0]!,
            asset.bounds.max[2]! - asset.bounds.min[2]!,
          ),
        ),
      );
      const spacing = Math.max(0.9, largest * 1.25);
      const places: Record<string, [number, number]> = {
        broadleaf: [-3.4, -2],
        conifer: [3.8, -2.8],
        'berry-bush': [2.8, 0.9],
        rock: [-2.4, 1.6],
        chest: [0.8, 1.8],
        mara: [-0.8, 0],
        tavin: [0.25, -0.2],
        armor: [1.35, -0.2],
        sword: [-0.5, 2.2],
        shield: [2.1, 2],
      };
      let minX = Infinity,
        maxX = -Infinity,
        minZ = Infinity,
        maxZ = -Infinity,
        maxY = 0;
      fresh.forEach((node, index) => {
        const asset = selected[index]!;
        const at = composition
          ? (places[asset.family] ?? [index * 1.5, 0])
          : [(index - (fresh.length - 1) / 2) * spacing, 0];
        node.setPosition(at[0]!, -asset.bounds.min[1]!, at[1]!);
        this.app.root.addChild(node);
        minX = Math.min(minX, at[0]! + asset.bounds.min[0]!);
        maxX = Math.max(maxX, at[0]! + asset.bounds.max[0]!);
        minZ = Math.min(minZ, at[1]! + asset.bounds.min[2]!);
        maxZ = Math.max(maxZ, at[1]! + asset.bounds.max[2]!);
        const height = asset.bounds.max[1]! - asset.bounds.min[1]!;
        maxY = Math.max(maxY, height);
        const label = document.createElement('span');
        label.className = 'study-label';
        label.textContent = composition
          ? asset.label
          : `${String.fromCharCode(65 + index)} · ${asset.variant}${asset.recommended ? ' · selected' : ''}`;
        label.dataset.full = label.textContent;
        label.dataset.short = composition
          ? asset.label
          : `${String.fromCharCode(65 + index)}${asset.recommended ? ' ✓' : ''}`;
        element('labels').append(label);
        this.anchors.push({ node, label, height });
      });
      this.center.set((minX + maxX) / 2, maxY * 0.45, (minZ + maxZ) / 2);
      this.tallest = maxY;
      this.extent.set(maxX - minX, maxY, maxZ - minZ);
      this.fit();
      this.zoom = 1;
      this.placeCamera();
      this.cards(selected);
      element('status').textContent = '';
      history.replaceState(null, '', `#subject=${encodeURIComponent(subject.value)}`);
      this.canvas.dataset.ready = 'true';
    } catch (error: unknown) {
      if (this.disposed || epoch !== this.epoch) return;
      console.error(error);
      element('status').textContent =
        'This comparison could not load. The previous displayed assets are retained; choose another subject or reload.';
    }
  }
  private cards(assets: Choice[]): void {
    element('asset-cards').replaceChildren(
      ...assets.map((asset) => {
        const card = document.createElement('article');
        card.className = 'study-card';
        const title = document.createElement('h2');
        title.textContent = `${asset.label} · ${asset.variant}`;
        card.append(title);
        if (asset.recommended) {
          const p = document.createElement('p');
          p.className = 'recommendation';
          p.textContent = 'Working selection';
          card.append(p);
        }
        const description = document.createElement('p');
        description.textContent = asset.description;
        card.append(description);
        const facts = document.createElement('small');
        facts.textContent = `${(asset.bounds.max[1]! - asset.bounds.min[1]!).toFixed(2)} m tall · ${asset.triangles.toLocaleString()} triangles · ${asset.textureSizes.map((size) => size.join('×')).join(', ')} fixed paint`;
        card.append(facts);
        const download = document.createElement('p');
        const model = document.createElement('a');
        model.href = asset.url;
        model.download = asset.file;
        model.textContent = 'Download GLB';
        download.append(model);
        if (asset.sourceUrl) {
          const source = document.createElement('a');
          source.href = asset.sourceUrl;
          source.download = '';
          source.textContent = 'Editable Blender source';
          download.append(' · ', source);
        }
        card.append(download);
        return card;
      }),
    );
  }
  private resize(): void {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.app.setCanvasResolution(
      pc.RESOLUTION_FIXED,
      Math.max(1, Math.round(rect.width)),
      Math.max(1, Math.round(rect.height)),
    );
    this.fit();
    this.placeCamera();
  }
  private fit(): void {
    const aspect = this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight);
    this.span = Math.max(
      this.extent.y * 0.7,
      this.extent.x / (aspect * 1.55),
      this.extent.z * 0.5,
      0.55,
    );
    this.detailSpan = Math.max(this.span * 0.32, this.extent.x / (aspect * 1.95));
  }
  private adjustZoom(scale: number): void {
    this.zoom = pc.math.clamp(this.zoom * scale, 0.15, 6);
    this.placeCamera();
  }
  private placeCamera(): void {
    this.labelsDirty = true;
    const camera = this.camera.camera!;
    const framing = element<HTMLSelectElement>('framing').value;
    const height =
      (framing === 'game' ? 4.5 : framing === 'detail' ? this.detailSpan : this.span) * this.zoom;
    const target = this.center.clone();
    if (framing === 'detail') target.y = this.tallest * 0.85;
    camera.projection =
      element<HTMLSelectElement>('projection').value === 'perspective'
        ? pc.PROJECTION_PERSPECTIVE
        : pc.PROJECTION_ORTHOGRAPHIC;
    camera.fov = 50;
    camera.orthoHeight = height;
    // Lower orthographic rays must start above the ground, including shallow
    // views; otherwise the foreground falls behind the camera's near plane.
    const distance =
      camera.projection === pc.PROJECTION_ORTHOGRAPHIC
        ? height / Math.sin(this.pitch) + 2
        : Math.max(0.4, height / Math.tan(25 * pc.math.DEG_TO_RAD));
    this.sun.light!.shadowDistance = distance + Math.max(10, this.span * 2);
    const h = Math.cos(this.pitch) * distance;
    this.camera.setPosition(
      target.x + Math.sin(this.yaw) * h,
      target.y + Math.sin(this.pitch) * distance,
      target.z + Math.cos(this.yaw) * h,
    );
    this.camera.lookAt(target);
  }
  private labels(): void {
    for (const { node, label, height } of this.anchors) {
      label.textContent =
        label.dataset[element<HTMLSelectElement>('framing').value === 'game' ? 'short' : 'full']!;
      const p = node.getPosition().clone();
      p.y += height + 0.08;
      const at = this.camera.camera!.worldToScreen(p);
      label.style.left = `${at.x}px`;
      label.style.top = `${at.y}px`;
    }
  }
  private light(): void {
    const mode = element<HTMLSelectElement>('light').value,
      light = this.sun.light!;
    if (mode === 'warm') {
      light.color = new pc.Color(1, 0.73, 0.46);
      light.intensity = 1.35;
      this.sun.setEulerAngles(22, -45, 0);
      this.app.scene.ambientLight = new pc.Color(0.4, 0.44, 0.48);
    } else if (mode === 'overcast') {
      light.color = new pc.Color(0.85, 0.93, 1);
      light.intensity = 0.65;
      this.sun.setEulerAngles(55, -20, 0);
      this.app.scene.ambientLight = new pc.Color(0.58, 0.61, 0.58);
    } else {
      light.color = new pc.Color(1, 0.97, 0.88);
      light.intensity = 1.45;
      this.sun.setEulerAngles(42, -28, 0);
      this.app.scene.ambientLight = new pc.Color(0.48, 0.51, 0.45);
    }
  }
  diagnostics() {
    return {
      displayed: this.displayed.map((asset) => asset.id),
      yaw: this.yaw,
      pitch: this.pitch,
      zoom: this.zoom,
      span: this.span,
      turning: this.turning,
      reducedMotion: this.reduce.matches,
      assets: this.app.assets.list().length,
      materials: this.materials.size,
      draws: this.app.stats.drawCalls.total,
      triangles: this.app.stats.frame.triangles,
      buffer: [this.app.graphicsDevice.width, this.app.graphicsDevice.height],
      textures: [...this.materials.values()].map((material) => ({
        width: material.diffuseMap?.width,
        height: material.diffuseMap?.height,
      })),
    };
  }
  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.epoch++;
    this.events.abort();
    this.observer.disconnect();
    for (const root of this.roots) root.destroy();
    this.roots = [];
    for (const material of this.materials.values()) material.destroy();
    this.materials.clear();
    this.stageMaterial.destroy();
    element('labels').replaceChildren();
    destroyModelApplication(this.app, [this.models.destroy()]);
    this.canvas.dataset.ready = 'false';
  }
}
let study = new ArtStudy(element<HTMLCanvasElement>('study-canvas'));
// Local read-only diagnostic hook for this developer inspection page.
Object.assign(window, { artStudy: study });
window.addEventListener('pageshow', (event) => {
  if (!event.persisted) return;
  study = new ArtStudy(element<HTMLCanvasElement>('study-canvas'));
  Object.assign(window, { artStudy: study });
});
