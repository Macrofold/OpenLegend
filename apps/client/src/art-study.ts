import * as pc from 'playcanvas';
import { ArtMaterials, candidateArt } from './art-treatment';
import { BundledModels, destroyModelApplication } from './bundled-models';
import { CAMERA_FOV_DEGREES, initialCamera } from './world-camera';
import { installLocomotion } from './model-animation';
import { StudyCapture } from './study-capture';
import studyLayout from './props/art-study/layout.json';
import './art-study.css';

interface StudyAsset {
  id: string;
  family: string;
  label: string;
  variant: string;
  description: string;
  recommended: boolean;
  file: string;
  animatedFile?: string;
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
  controls?: StudyAsset[];
}
type Choice = StudyAsset & {
  url: string;
  motionUrl?: string;
  sourceUrl?: string;
  historical: boolean;
  sourceControl?: boolean;
};
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
  '../../../art-direction/assets/{representative-study,source-study}/*.blend',
  {
    eager: true,
    query: '?url',
    import: 'default',
  },
);
const choices: Choice[] = Object.values(catalogs).flatMap((catalog) =>
  [
    ...catalog.assets,
    ...(catalog.controls ?? []).map((asset) => ({ ...asset, sourceControl: true })),
  ].map((asset) => ({
    ...asset,
    historical: !catalog.group.startsWith('source-'),
    url: modelUrls[`./props/art-study/${catalog.group}/${asset.file}`]!,
    motionUrl: asset.animatedFile
      ? modelUrls[`./props/art-study/${catalog.group}/${asset.animatedFile}`]
      : undefined,
    sourceUrl: sourceUrls[`../../../${catalog.sourceFile}`],
  })),
);
const layout: Record<string, { label: string; position: readonly number[] }> = studyLayout;
function element<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}
const subject = element<HTMLSelectElement>('subject');
const subjectKey = (choice: Choice) => (choice.historical ? 'earlier:' : '') + choice.family;
for (const family of new Set(choices.map(subjectKey))) {
  const option = document.createElement('option');
  option.value = family;
  const member = choices.find((choice) => subjectKey(choice) === family)!;
  option.textContent = `${member.historical ? 'Earlier study · ' : ''}${member.historical ? (layout[member.family]?.label ?? member.label) : member.label}`;
  subject.append(option);
}
const requested = new URLSearchParams(location.hash.slice(1)).get('subject');
if (requested && choices.some((choice) => subjectKey(choice) === requested))
  subject.value = requested;
else if (!requested && choices.some((choice) => choice.family === 'mercenary'))
  subject.value = 'mercenary';

/** Finite trusted asset inspection, independent of saves, world actions and AI. */
export class ArtStudy {
  readonly app: pc.Application;
  private readonly models: BundledModels;
  private readonly art: ArtMaterials;
  private readonly events = new AbortController();
  private readonly observer: ResizeObserver;
  private readonly camera: pc.Entity;
  private readonly sun: pc.Entity;
  private readonly fill: pc.Entity;
  private readonly frame: pc.CameraFrame;
  private readonly materials = new Map<pc.StandardMaterial, pc.StandardMaterial>();
  private readonly stageMaterial: pc.StandardMaterial;
  private roots: pc.Entity[] = [];
  private animations: pc.AnimComponent[] = [];
  private readonly bounds: pc.Vec3[] = [];
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
  private readonly gameCamera = initialCamera();
  private readonly capture: StudyCapture;
  private motionAllowed = !this.reduce.matches;
  constructor(private readonly canvas: HTMLCanvasElement) {
    this.capture = new StudyCapture(canvas);
    this.app = new pc.Application(canvas, {
      graphicsDeviceOptions: { antialias: true, alpha: false },
    });
    this.app.graphicsDevice.maxPixelRatio = 1;
    this.app.autoRender = false;
    element('turn').setAttribute('aria-pressed', 'false');
    element('labels-toggle').setAttribute('aria-pressed', String(!element('labels').hidden));
    element('motion-consent').hidden = !this.reduce.matches;
    this.models = new BundledModels(this.app);
    this.art = new ArtMaterials(this.app.graphicsDevice);
    this.app.scene.ambientLight = new pc.Color(0.32, 0.35, 0.37);
    this.camera = new pc.Entity('Study inspection camera', this.app);
    this.camera.addComponent('camera', {
      projection: pc.PROJECTION_ORTHOGRAPHIC,
      clearColor: new pc.Color(0.12, 0.18, 0.16),
      nearClip: 0.1,
      farClip: 500,
    });
    this.app.root.addChild(this.camera);
    this.frame = new pc.CameraFrame(this.app, this.camera.camera!);
    this.frame.rendering.toneMapping = pc.TONEMAP_ACES;
    this.frame.rendering.samples = 4;
    this.frame.update();
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
    this.fill = new pc.Entity('Cool sky fill', this.app);
    this.fill.addComponent('light', {
      type: 'directional',
      color: new pc.Color(0.68, 0.79, 1),
      intensity: 0.5,
      castShadows: false,
    });
    this.fill.setEulerAngles(25, 140, 0);
    this.app.root.addChild(this.fill);
    this.stageMaterial = new pc.StandardMaterial();
    this.stageMaterial.diffuse = new pc.Color(0.19, 0.22, 0.18);
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
    const captureName = () => 'openlegend-asset-' + subject.value.replace(':', '-');
    on(element('save-image'), 'click', () => this.capture.image(captureName()));
    on(element('record-motion'), 'click', () => {
      const button = element<HTMLButtonElement>('record-motion');
      button.disabled = this.capture.record(captureName(), (message) => {
        button.disabled = false;
        element('status').textContent = message;
      });
      if (button.disabled) element('status').textContent = 'Recording 8 seconds…';
    });
    on(element('framing'), 'change', () => this.applyFraming());
    on(element('light'), 'change', () => this.light());
    on(element('projection'), 'change', () => this.placeCamera());
    on(element('shading'), 'change', () => this.shading());
    on(element('pixel-treatment'), 'change', () => this.placeCamera());
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
      this.turning = !this.turning && this.motionAllowed;
      this.app.autoRender = this.turning;
      this.invalidate();
      element('turn').setAttribute('aria-pressed', String(this.turning));
    });
    on(element('labels-toggle'), 'click', () => {
      const labels = element('labels');
      labels.hidden = !labels.hidden;
      element('labels-toggle').setAttribute('aria-pressed', String(!labels.hidden));
    });
    on(element('motion-consent'), 'click', () => {
      this.motionAllowed = !this.motionAllowed;
      if (!this.motionAllowed) {
        this.turning = false;
        this.app.autoRender = false;
        element('turn').setAttribute('aria-pressed', 'false');
      }
      element('motion-consent').setAttribute('aria-pressed', String(this.motionAllowed));
      this.invalidate();
    });
    on(this.reduce, 'change', () => {
      this.motionAllowed = !this.reduce.matches;
      element('motion-consent').hidden = !this.reduce.matches;
      element('motion-consent').setAttribute('aria-pressed', 'false');
      if (this.reduce.matches) this.turning = false;
      this.app.autoRender = this.turning;
      this.invalidate();
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
    on(window, 'blur', () => {
      this.dragging = undefined;
    });
    on(canvas, 'webglcontextrestored', () => this.invalidate());
    canvas.addEventListener(
      'wheel',
      (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        event.preventDefault();
        this.adjustZoom(Math.exp(event.deltaY * 0.001));
      },
      { passive: false, signal: this.events.signal },
    );
    on(canvas, 'keydown', (event) => {
      const e = event as KeyboardEvent;
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-'].includes(e.key))
        return;
      e.preventDefault();
      if (e.key === 'ArrowLeft') this.yaw -= 0.12;
      if (e.key === 'ArrowRight') this.yaw += 0.12;
      if (e.key === 'ArrowUp') this.pitch = Math.min(1.2, this.pitch + 0.1);
      if (e.key === 'ArrowDown') this.pitch = Math.max(0.12, this.pitch - 0.1);
      if (e.key === '+' || e.key === '=') this.adjustZoom(0.8);
      else if (e.key === '-') this.adjustZoom(1.25);
      else this.placeCamera();
    });
    on(window, 'pagehide', () => this.destroy());
    this.app.on('update', (dt: number) => {
      if (this.disposed) return;
      if (this.turning && this.motionAllowed) {
        this.yaw += Math.min(dt, 0.1) * 0.22;
        this.placeCamera();
      }
      const pose = element<HTMLSelectElement>('pose').value;
      if (pose !== 'still' && this.motionAllowed && this.animations.length) {
        for (const anim of this.animations) {
          if (anim.baseLayer?.activeState !== pose) anim.baseLayer?.play(pose);
          anim.update(Math.min(dt, 0.1));
        }
        this.invalidate();
      }
      const motionEvidence = !this.motionAllowed
        ? 'Motion paused by your reduced-motion preference.'
        : pose === 'still'
          ? 'Pose held for comparison.'
          : `${this.animations.length} animated models · ${pose === 'Run' ? 'Movement' : 'Idle'} · ${(this.animations[0]?.baseLayer?.activeStateCurrentTime ?? 0).toFixed(1)} s`;
      if (element('motion-evidence').textContent !== motionEvidence)
        element('motion-evidence').textContent = motionEvidence;
      if (this.labelsDirty) {
        this.labels();
        this.labelsDirty = false;
      }
    });
    this.resize();
    this.restoreControls();
    this.app.start();
  }
  /** History can restore native select values after the module initialized. */
  restoreControls(): void {
    if (this.disposed) return;
    this.shading();
    this.light();
    this.applyFraming();
    void this.show();
  }
  private shading(): void {
    this.art.update({
      ...candidateArt,
      lighting: element<HTMLSelectElement>('shading').value === 'smooth' ? 'smooth' : 'soft',
    });
    this.invalidate();
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
          // The source leaf cards carry deliberately shaped canopy normals.
          // Reversing them on their backs makes a rotating crown flash dark.
          if (source.name.startsWith('Leaves')) material.twoSidedLighting = false;
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
    if (this.disposed) return;
    const epoch = ++this.epoch,
      composition = ['composition', 'calibration', 'cast'].includes(subject.value);
    const versions = element<HTMLSelectElement>('versions');
    const sourceOption = versions.querySelector<HTMLOptionElement>('option[value="source"]')!;
    sourceOption.disabled =
      composition ||
      !choices.some((asset) => subjectKey(asset) === subject.value && asset.sourceControl);
    if (versions.value === 'source' && sourceOption.disabled) versions.value = 'compare';
    const version = versions.value;
    const compare = !composition && version === 'compare';
    let selected = composition
      ? choices.filter(
          (asset) =>
            asset.recommended &&
            (subject.value === 'composition'
              ? asset.historical
              : (subject.value === 'cast'
                  ? ['mercenary', 'ada', 'mike', 'mara', 'tavin', 'kest', 'orin']
                  : ['mercenary', 'ada']
                ).includes(asset.family)),
        )
      : choices.filter(
          (asset) =>
            subjectKey(asset) === subject.value &&
            Boolean(asset.sourceControl) === (version === 'source'),
        );
    if (!compare && !composition && version !== 'source')
      selected =
        version === 'selected'
          ? selected.filter((asset) => asset.recommended)
          : selected.slice(Number(version), Number(version) + 1);
    if (!selected.length) {
      element('status').textContent = 'No exported assets are available for this subject yet.';
      return;
    }
    if (
      selected.length === this.displayed.length &&
      selected.every((asset, index) => asset === this.displayed[index])
    ) {
      element('status').textContent = '';
      return;
    }
    element('status').textContent = 'Loading fixed artwork…';
    this.canvas.dataset.ready = 'false';
    try {
      const resources = await Promise.all(
        selected.map((asset) => this.models.load(asset.label, asset.motionUrl ?? asset.url)),
      );
      if (this.disposed || epoch !== this.epoch) return;
      const animations: pc.AnimComponent[] = [];
      const fresh: pc.Entity[] = [];
      try {
        resources.forEach((resource, index) => {
          const artwork = resource.instantiateRenderEntity({
            castShadows: true,
            receiveShadows: true,
          });
          fresh.push(artwork);
          this.prepare(artwork);
          if (selected[index]!.motionUrl) animations.push(installLocomotion(artwork, resource));
          // A single exported mesh may carry its own origin offset. Position a
          // parent so its original model transform (and ground contact) survives.
          const placement = new pc.Entity(selected[index]!.id, this.app);
          placement.addChild(artwork);
          fresh[index] = placement;
        });
      } catch (error) {
        for (const root of fresh) root.destroy();
        throw error;
      }
      for (const root of this.roots) root.destroy();
      this.roots = fresh;
      this.animations = animations;
      this.bounds.length = 0;
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
      let minX = Infinity,
        maxX = -Infinity,
        minZ = Infinity,
        maxZ = -Infinity,
        maxY = 0;
      fresh.forEach((node, index) => {
        const asset = selected[index]!;
        const at = composition
          ? subject.value !== 'composition'
            ? [(index - (fresh.length - 1) / 2) * 1.2, 0]
            : (layout[asset.family]?.position ?? [index * 1.5, 0])
          : [(index - (fresh.length - 1) / 2) * spacing, 0];
        node.setPosition(at[0]!, -asset.bounds.min[1]!, at[1]!);
        this.app.root.addChild(node);
        minX = Math.min(minX, at[0]! + asset.bounds.min[0]!);
        maxX = Math.max(maxX, at[0]! + asset.bounds.max[0]!);
        minZ = Math.min(minZ, at[1]! + asset.bounds.min[2]!);
        maxZ = Math.max(maxZ, at[1]! + asset.bounds.max[2]!);
        for (const x of [asset.bounds.min[0]!, asset.bounds.max[0]!])
          for (const y of [asset.bounds.min[1]!, asset.bounds.max[1]!])
            for (const z of [asset.bounds.min[2]!, asset.bounds.max[2]!])
              this.bounds.push(new pc.Vec3(x + at[0]!, y - asset.bounds.min[1]!, z + at[1]!));
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
          p.textContent = asset.historical
            ? 'Earlier selection · rejected study'
            : 'Working selection · under review';
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
    this.placeCamera();
  }
  private invalidate(): void {
    if (!this.disposed) this.app.renderNextFrame = true;
  }
  private applyFraming(): void {
    this.zoom = 1;
    if (element<HTMLSelectElement>('framing').value === 'game') {
      this.yaw = this.gameCamera.yaw;
      this.pitch = this.gameCamera.pitch;
      element<HTMLSelectElement>('projection').value =
        this.gameCamera.projection === 'orthographic' ? 'ortho' : 'perspective';
    }
    this.placeCamera();
  }
  /** Fit the installed models in the current camera axes. In perspective,
   * nearer corners require more distance than corners on the target plane. */
  private fit(target: pc.Vec3, perspective: boolean, tangent: number, detail: boolean): number {
    const aspect = this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight);
    // Reserve space for the labels and frame edges at narrow and short sizes.
    const horizontal = aspect * Math.max(0.25, 1 - 32 / Math.max(1, this.canvas.clientWidth));
    const vertical = Math.max(0.25, 1 - 64 / Math.max(1, this.canvas.clientHeight));
    const sinYaw = Math.sin(this.yaw),
      cosYaw = Math.cos(this.yaw),
      sinPitch = Math.sin(this.pitch),
      cosPitch = Math.cos(this.pitch);
    let span = detail ? 0 : 0.55;
    for (const corner of this.bounds) {
      const x = corner.x - target.x,
        y = corner.y - target.y,
        z = corner.z - target.z;
      const across = Math.abs(x * cosYaw - z * sinYaw) / horizontal;
      const up = Math.abs(-x * sinYaw * sinPitch + y * cosPitch - z * cosYaw * sinPitch);
      const depth = perspective
        ? (x * sinYaw * cosPitch + y * sinPitch + z * cosYaw * cosPitch) * tangent
        : 0;
      span = Math.max(span, across + depth, detail ? 0 : up / vertical + depth);
    }
    return span;
  }
  private adjustZoom(scale: number): void {
    this.zoom = pc.math.clamp(this.zoom * scale, 0.15, 6);
    this.placeCamera();
  }
  private placeCamera(): void {
    this.labelsDirty = true;
    const camera = this.camera.camera!;
    const framing = element<HTMLSelectElement>('framing').value;
    const target = this.center.clone();
    if (framing === 'game') target.y = 0;
    if (framing === 'detail') target.y = this.tallest * 0.85;
    camera.projection =
      element<HTMLSelectElement>('projection').value === 'perspective'
        ? pc.PROJECTION_PERSPECTIVE
        : pc.PROJECTION_ORTHOGRAPHIC;
    camera.fov = framing === 'game' ? CAMERA_FOV_DEGREES : 50;
    const tangent = Math.tan(camera.fov * 0.5 * pc.math.DEG_TO_RAD);
    const perspective = camera.projection === pc.PROJECTION_PERSPECTIVE;
    this.span = this.fit(this.center, perspective, tangent, false);
    if (framing === 'detail')
      this.detailSpan = Math.max(this.span * 0.32, this.fit(target, perspective, tangent, true));
    const height =
      (framing === 'game'
        ? this.gameCamera.zoom
        : framing === 'closer'
          ? 4.5
          : framing === 'detail'
            ? this.detailSpan
            : this.span) * this.zoom;
    camera.orthoHeight = height;
    // Lower orthographic rays must start above the ground, including shallow
    // views; otherwise the foreground falls behind the camera's near plane.
    const diameter = this.extent.length();
    const distance = perspective
      ? Math.max(0.4, height / tangent)
      : Math.max(height / Math.sin(this.pitch) + 2, diameter + 2);
    camera.farClip = distance + diameter + 10;
    this.sun.light!.shadowDistance = distance + Math.max(10, this.span * 2);
    const h = Math.cos(this.pitch) * distance;
    this.camera.setPosition(
      target.x + Math.sin(this.yaw) * h,
      target.y + Math.sin(this.pitch) * distance,
      target.z + Math.cos(this.yaw) * h,
    );
    this.camera.lookAt(target);
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    const density = element<HTMLSelectElement>('pixel-treatment').value;
    // A metre of art retains the same number of samples during inspection zoom.
    // Resolve coverage before nearest enlargement, as the original viewer did.
    // This is a rendering comparison, not proof of stable rotating surface cells.
    const wantedHeight = density === 'native' ? rect.height : 2 * height * Number(density);
    const scale = Math.max(1, rect.height / Math.max(1, wantedHeight));
    const width = Math.max(1, Math.round(rect.width / scale));
    const pixelsHigh = Math.max(1, Math.round(rect.height / scale));
    if (this.app.graphicsDevice.width !== width || this.app.graphicsDevice.height !== pixelsHigh) {
      this.app.setCanvasResolution(pc.RESOLUTION_FIXED, width, pixelsHigh);
      this.frame.update();
    }
    const scenePass = this.camera.camera!.framePasses.find(
      (pass): pass is pc.FramePassCameraFrame => pass instanceof pc.FramePassCameraFrame,
    );
    if (scenePass) scenePass.renderTargetScale = density === 'native' ? 1 : 2;
    this.canvas.style.imageRendering = density === 'native' ? 'auto' : 'pixelated';
    const effective = pixelsHigh / (2 * height);
    element('pixel-evidence').textContent =
      `${width} × ${pixelsHigh} image · ${density === 'native' ? 'full display resolution' : `${effective.toFixed(1)} samples/metre${wantedHeight > rect.height ? ' · limited by display size' : ''}`} · ${framing === 'game' ? 'current game camera' : 'inspection framing'}`;
    this.invalidate();
  }
  private labels(): void {
    const framing = element<HTMLSelectElement>('framing').value;
    const compact = ['game', 'closer'].includes(framing);
    for (const { node, label, height } of this.anchors) {
      const text = label.dataset[compact ? 'short' : 'full']!;
      label.textContent = framing === 'game' && this.displayed.length === 3 ? text[0]! : text;
      label.classList.toggle('compact', framing === 'game');
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
      light.color = new pc.Color(1, 0.9, 0.76);
      light.intensity = 1.15;
      this.sun.setEulerAngles(42, -28, 0);
      this.app.scene.ambientLight = new pc.Color(0.32, 0.35, 0.37);
    }
    this.invalidate();
  }
  diagnostics() {
    return {
      displayed: this.displayed.map((asset) => asset.id),
      yaw: this.yaw,
      pitch: this.pitch,
      zoom: this.zoom,
      framing: element<HTMLSelectElement>('framing').value,
      projection: element<HTMLSelectElement>('projection').value,
      cameraHeight: this.camera.camera!.orthoHeight,
      autoRender: this.app.autoRender,
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
    this.capture.destroy();
    this.observer.disconnect();
    for (const root of this.roots) root.destroy();
    this.roots = [];
    for (const material of this.materials.values()) material.destroy();
    this.materials.clear();
    this.stageMaterial.destroy();
    this.frame.destroy();
    element('labels').replaceChildren();
    destroyModelApplication(this.app, [this.models.destroy()]);
    this.canvas.dataset.ready = 'false';
  }
}
let study = new ArtStudy(element<HTMLCanvasElement>('study-canvas'));
// Local diagnostic hook for this developer inspection page.
Object.assign(window, { artStudy: study });
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    study = new ArtStudy(element<HTMLCanvasElement>('study-canvas'));
    Object.assign(window, { artStudy: study });
  } else study.restoreControls();
});
