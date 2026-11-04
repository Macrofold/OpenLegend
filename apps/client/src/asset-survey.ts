import * as pc from 'playcanvas';
import { ArtMaterials, candidateArt } from './art-treatment';
import {
  groupedGroundArt,
  isFoliageMaterialName,
  prepareFoliageLight,
  prepareGroundLighting,
} from './environment-art';
import { BundledModels, destroyModelApplication } from './bundled-models';
import { assetUrl, readAssetBytes } from './asset-files';
import surveyCatalog from './props/art-survey/catalog.json';
import './art-study.css';
import './asset-survey.css';

/** Developer survey of third-party styles for the art direction; no world, save or AI.
 * art-direction/studies/2026-10-31-world-asset-survey/README.md */
type Status = 'direction' | 'candidate' | 'current' | 'outside' | 'rejected';
interface Family {
  id: string;
  label: string;
  source: string;
  status: Status;
  note: string;
}
interface Subject {
  id: string;
  category: string;
  label: string;
  note: string;
}
interface Bounds {
  min: number[];
  max: number[];
}
interface TextureFile {
  file: string;
  /** Roughness taken from an ambient/roughness/metal map lives in its green channel. */
  channel?: 'r' | 'g' | 'b';
}
type SurfaceMaps = Partial<Record<'color' | 'normal' | 'roughness', TextureFile>>;
interface Item {
  id: string;
  subject: string;
  family: string;
  label: string;
  inGame: boolean;
  kind: 'model' | 'surface' | 'ground' | 'water' | 'house';
  file?: string;
  scale?: number;
  bounds?: Bounds;
  triangles?: number;
  textures?: number[][];
  source?: string;
  credit?: string;
  maps?: SurfaceMaps | { wall: SurfaceMaps; roof: SurfaceMaps };
  options?: Record<string, string>;
}
const catalog = surveyCatalog as unknown as {
  families: Family[];
  categories: { id: string; label: string }[];
  subjects: Subject[];
  sources: Record<string, { creator: string; license: string; page: string }>;
  items: Item[];
};
// Presentation colours that tell the families apart in the stage and cards.
const familyColors: Record<string, string> = {
  polyhaven: '#74aee0',
  megakit: '#93c56b',
  creatures: '#e893b4',
  wildmesh: '#8f9cf0',
  current: '#e3b65d',
  kenney: '#c890d8',
  lowpoly: '#de8a6f',
  kaykit: '#a9aaa2',
  engine: '#62c8c2',
};
const statusLabels: Record<Status, string> = {
  direction: 'Fits current direction',
  candidate: 'Candidate for the direction',
  current: 'In the game today',
  outside: 'Outside current direction',
  rejected: 'Rejected October 16',
};
// Every texture property of StandardMaterial, so a shared image is replaced in all of them before
// its duplicate is destroyed.
const textureSlots = pc.StandardMaterial.TEXTURE_PARAMETERS as string[];
const familyOrder = new Map(catalog.families.map((family, index) => [family.id, index]));
const subjectOrder = new Map(catalog.subjects.map((subject, index) => [subject.id, index]));
const families = new Map(catalog.families.map((family) => [family.id, family]));
const subjects = new Map(catalog.subjects.map((subject) => [subject.id, subject]));

function element<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

// Per-viewer picks are a local convenience; the export button carries them to the study record.
const storageKey = 'openlegend.asset-survey.picks';
interface Picks {
  liked: Record<string, true>;
  notes: Record<string, string>;
  bestFit: Record<string, string>;
}
function readPicks(): Picks {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? '{}') as Partial<Picks>;
    return { liked: value.liked ?? {}, notes: value.notes ?? {}, bestFit: value.bestFit ?? {} };
  } catch {
    return { liked: {}, notes: {}, bestFit: {} };
  }
}
const picks = readPicks();
function savePicks(): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(picks));
  } catch {
    element('copy-status').textContent =
      'This browser is not keeping picks; copy them before leaving.';
  }
}

interface View {
  grouping: 'subject' | 'family';
  category: string;
  subject: string;
  family: string;
}
function initialView(): View {
  const hash = new URLSearchParams(location.hash.slice(1));
  const subject = subjects.get(hash.get('subject') ?? '') ?? catalog.subjects[0]!;
  const category = catalog.categories.some((entry) => entry.id === hash.get('category'))
    ? hash.get('category')!
    : subject.category;
  return {
    grouping: hash.get('grouping') === 'family' ? 'family' : 'subject',
    category,
    subject:
      subject.category === category
        ? subject.id
        : catalog.subjects.find((entry) => entry.category === category)!.id,
    family: families.has(hash.get('family') ?? '') ? hash.get('family')! : 'polyhaven',
  };
}

interface Placed {
  item: Item;
  number: number;
  node: pc.Entity;
  center: pc.Vec3;
  min: pc.Vec3;
  max: pc.Vec3;
  label: HTMLElement;
}
interface Row {
  key: string;
  title: string;
  color: string;
  first: Placed;
  label: HTMLElement;
}
interface Lineup {
  models: BundledModels;
  /** Embedded images are named by content (`name#hash`); one texture serves every copy. */
  shared: Map<string, pc.Texture>;
  materials: pc.Material[];
  textures: pc.Texture[];
  meshes: pc.Mesh[];
  roots: pc.Entity[];
  placed: Placed[];
  rows: Row[];
  water: pc.StandardMaterial[];
}

/** Finite study scene. Each comparison owns only its models, materials and textures and keeps
 * the previous comparison on screen until its replacement has loaded. */
class AssetSurvey {
  readonly app: pc.Application;
  private readonly art: ArtMaterials;
  private readonly camera: pc.Entity;
  private readonly sun: pc.Entity;
  private readonly frame: pc.CameraFrame;
  private readonly stageMaterial: pc.StandardMaterial;
  private readonly events = new AbortController();
  private readonly observer: ResizeObserver;
  private readonly modelCleanup = new Set<Promise<void>>();
  private readonly reduce = matchMedia('(prefers-reduced-motion: reduce)');
  private readonly rippleTexture: pc.Texture;
  private readonly skyCube: pc.Texture;
  private readonly skyLight: pc.Texture;
  private lineup?: Lineup;
  private pending?: Lineup;
  private view = initialView();
  private enabled = new Set(catalog.families.map((family) => family.id));
  private selected?: string;
  private epoch = 0;
  private disposed = false;
  private yaw = 0;
  private pitch = 0.55;
  private defaultPitch = 0.55;
  private defaultYaw = 0;
  private zoom = 1;
  private readonly center = new pc.Vec3();
  private readonly extentCenter = new pc.Vec3();
  private readonly pan = new pc.Vec3();
  private corners: pc.Vec3[] = [];
  private focusSpan?: number;
  private turning = false;
  private labelsDirty = true;
  private dragging?: { id: number; x: number; y: number; moved: boolean; pan: boolean };
  constructor(private readonly canvas: HTMLCanvasElement) {
    this.app = new pc.Application(canvas, {
      graphicsDeviceOptions: { antialias: true, alpha: false },
    });
    this.app.graphicsDevice.maxPixelRatio = 1;
    this.app.autoRender = false;
    this.art = new ArtMaterials(this.app.graphicsDevice);
    this.camera = new pc.Entity('Survey camera', this.app);
    this.camera.addComponent('camera', {
      projection: pc.PROJECTION_ORTHOGRAPHIC,
      clearColor: new pc.Color(0.12, 0.18, 0.16),
      nearClip: 0.05,
      farClip: 600,
    });
    // The environment atlas doubles as a skybox source; keep the background the stage colour.
    this.camera.camera!.layers = this.camera.camera!.layers.filter(
      (id) => id !== pc.LAYERID_SKYBOX,
    );
    this.app.root.addChild(this.camera);
    this.frame = new pc.CameraFrame(this.app, this.camera.camera!);
    this.frame.rendering.toneMapping = pc.TONEMAP_ACES;
    this.frame.rendering.samples = 4;
    this.frame.update();
    this.sun = new pc.Entity('Survey daylight', this.app);
    this.sun.addComponent('light', {
      type: 'directional',
      castShadows: true,
      shadowType: pc.SHADOW_PCF3,
      shadowResolution: 2048,
      shadowBias: 0.15,
      normalOffsetBias: 0.02,
    });
    this.app.root.addChild(this.sun);
    const fill = new pc.Entity('Survey sky fill', this.app);
    fill.addComponent('light', {
      type: 'directional',
      color: new pc.Color(0.68, 0.79, 1),
      intensity: 0.5,
      castShadows: false,
    });
    fill.setEulerAngles(25, 140, 0);
    this.app.root.addChild(fill);
    this.stageMaterial = new pc.StandardMaterial();
    this.stageMaterial.diffuse = new pc.Color(0.19, 0.22, 0.18);
    this.stageMaterial.gloss = 0;
    this.stageMaterial.update();
    const floor = new pc.Entity('Neutral metre-scale ground', this.app);
    floor.addComponent('render', {
      type: 'plane',
      material: this.stageMaterial,
      castShadows: false,
    });
    floor.setLocalScale(2000, 1, 2000);
    floor.setLocalPosition(0, -0.01, 0);
    this.app.root.addChild(floor);
    this.rippleTexture = this.rippleNormals();
    this.skyCube = this.skyReflection();
    // Scanned physically based models, metals especially, are authored for surrounding light to
    // reflect; without it their metal reads almost black. The game has none today, so it stays a
    // choice here. docs/world-presentation.md records the finding.
    const source = pc.EnvLighting.generateLightingSource(this.skyCube, { size: 64 });
    this.skyLight = pc.EnvLighting.generateAtlas(source, { size: 256 });
    source.destroy();
    this.observer = new ResizeObserver(() => this.placeCamera());
    this.observer.observe(canvas.parentElement!);
    this.controls();
    this.app.on('update', (dt: number) => this.update(dt));
    this.shading();
    this.light();
    this.buildPicker();
    this.app.start();
    void this.show();
  }

  // ------------------------------------------------------------------ controls and navigation
  private on(target: EventTarget, event: string, handler: EventListener): void {
    target.addEventListener(event, handler, { signal: this.events.signal });
  }
  private controls(): void {
    const familyChoice = element<HTMLSelectElement>('family-choice');
    familyChoice.replaceChildren();
    for (const family of catalog.families) familyChoice.add(new Option(family.label, family.id));
    const fieldset = element('families');
    for (const label of fieldset.querySelectorAll('label')) label.remove();
    for (const family of catalog.families) {
      const label = document.createElement('label');
      label.style.setProperty('--family', familyColors[family.id]!);
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = true;
      input.value = family.id;
      this.on(input, 'change', () => {
        if (input.checked) this.enabled.add(family.id);
        else this.enabled.delete(family.id);
        void this.show();
      });
      const swatch = document.createElement('span');
      swatch.className = 'swatch';
      label.append(input, swatch, family.label);
      fieldset.append(label);
    }
    this.on(element('grouping'), 'change', () => {
      this.view.grouping = element<HTMLSelectElement>('grouping').value as View['grouping'];
      void this.show();
    });
    this.on(familyChoice, 'change', () => {
      this.view.family = familyChoice.value;
      void this.show();
    });
    this.on(element('light'), 'change', () => this.light());
    this.on(element('reflections'), 'change', () => this.light());
    this.on(element('shading'), 'change', () => this.shading());
    this.on(element('projection'), 'change', () => this.placeCamera());
    this.on(element('reset-view'), 'click', () => this.resetCamera());
    this.on(element('turn'), 'click', () => {
      this.turning = !this.turning && !this.reduce.matches;
      element('turn').setAttribute('aria-pressed', String(this.turning));
      this.updateAutoRender();
    });
    this.on(element('labels-toggle'), 'click', () => {
      const labels = element('labels');
      labels.hidden = !labels.hidden;
      element('labels-toggle').setAttribute('aria-pressed', String(!labels.hidden));
    });
    this.on(this.reduce, 'change', () => {
      if (this.reduce.matches) this.turning = false;
      element('turn').setAttribute('aria-pressed', String(this.turning));
      this.updateAutoRender();
    });
    this.on(element('copy-picks'), 'click', () => void this.copyPicks());
    this.on(element('clear-picks'), 'click', () => {
      if (!confirm('Clear every like, note and best-fit choice in this survey?')) return;
      picks.liked = {};
      picks.notes = {};
      picks.bestFit = {};
      savePicks();
      this.renderCards();
      this.renderPicks();
      this.buildPicker();
    });
    this.on(element('inspect-resources'), 'click', () => {
      element('inspection-metrics').textContent = JSON.stringify(this.diagnostics(), null, 2);
    });
    const canvas = this.canvas;
    this.on(canvas, 'pointerdown', (event) => {
      const e = event as PointerEvent;
      if (e.button !== 0) return;
      canvas.focus();
      canvas.setPointerCapture(e.pointerId);
      this.dragging = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        moved: false,
        pan: e.shiftKey,
      };
    });
    this.on(canvas, 'pointermove', (event) => {
      const e = event as PointerEvent,
        drag = this.dragging;
      if (!drag || drag.id !== e.pointerId) return;
      const dx = e.clientX - drag.x,
        dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      if (!drag.moved) return;
      if (drag.pan) {
        const height = this.camera.camera!.orthoHeight;
        const perPixel = (2 * height) / Math.max(1, canvas.clientHeight);
        this.pan.add(this.camera.right.clone().mulScalar(-dx * perPixel));
        this.pan.add(this.camera.up.clone().mulScalar(dy * perPixel));
      } else {
        this.yaw -= dx * 0.008;
        this.pitch = pc.math.clamp(this.pitch + dy * 0.006, 0.08, 1.45);
      }
      drag.x = e.clientX;
      drag.y = e.clientY;
      this.placeCamera();
    });
    this.on(canvas, 'pointerup', (event) => {
      const e = event as PointerEvent;
      if (this.dragging && !this.dragging.moved) this.pick(e.offsetX, e.offsetY, false);
      this.dragging = undefined;
    });
    for (const name of ['pointercancel', 'lostpointercapture'])
      this.on(canvas, name, () => {
        this.dragging = undefined;
      });
    this.on(canvas, 'dblclick', (event) => {
      const e = event as MouseEvent;
      this.pick(e.offsetX, e.offsetY, true);
    });
    canvas.addEventListener(
      'wheel',
      (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        event.preventDefault();
        this.adjustZoom(Math.exp(event.deltaY * 0.001));
      },
      { passive: false, signal: this.events.signal },
    );
    this.on(canvas, 'keydown', (event) => {
      const e = event as KeyboardEvent;
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      const keys: Record<string, () => void> = {
        ArrowLeft: () => (this.yaw -= 0.12),
        ArrowRight: () => (this.yaw += 0.12),
        ArrowUp: () => (this.pitch = Math.min(1.45, this.pitch + 0.08)),
        ArrowDown: () => (this.pitch = Math.max(0.08, this.pitch - 0.08)),
        '+': () => (this.zoom = Math.max(0.05, this.zoom * 0.8)),
        '=': () => (this.zoom = Math.max(0.05, this.zoom * 0.8)),
        '-': () => (this.zoom = Math.min(6, this.zoom * 1.25)),
      };
      const action = keys[e.key];
      if (!action) return;
      e.preventDefault();
      action();
      this.placeCamera();
    });
    this.on(window, 'pagehide', () => this.destroy());
    this.on(window, 'hashchange', () => {
      const next = initialView();
      if (JSON.stringify(next) === JSON.stringify(this.view)) return;
      this.view = next;
      void this.show();
    });
  }
  /** Category and subject buttons; counts show how many pieces and likes each holds. */
  private buildPicker(): void {
    const categoryGroup = element('categories');
    categoryGroup.replaceChildren(
      ...catalog.categories.map((category) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = category.label;
        button.setAttribute('aria-pressed', String(category.id === this.view.category));
        button.onclick = () => {
          if (category.id === this.view.category) return;
          this.view.category = category.id;
          this.view.subject = catalog.subjects.find(
            (subject) => subject.category === category.id,
          )!.id;
          void this.show();
        };
        return button;
      }),
    );
    const subjectGroup = element('subjects');
    subjectGroup.hidden = this.view.grouping === 'family';
    subjectGroup.replaceChildren(
      ...catalog.subjects
        .filter((subject) => subject.category === this.view.category)
        .map((subject) => {
          const button = document.createElement('button');
          button.type = 'button';
          const items = catalog.items.filter((item) => item.subject === subject.id);
          const liked = items.filter((item) => picks.liked[item.id]).length;
          button.append(subject.label);
          const count = document.createElement('span');
          count.className = 'count';
          count.textContent = String(items.length);
          button.append(count);
          if (liked) {
            const heart = document.createElement('span');
            heart.className = 'liked';
            heart.textContent = `♥${liked}`;
            heart.setAttribute('aria-label', `${liked} liked`);
            button.append(heart);
          }
          button.setAttribute('aria-pressed', String(subject.id === this.view.subject));
          button.onclick = () => {
            if (subject.id === this.view.subject) return;
            this.view.subject = subject.id;
            void this.show();
          };
          return button;
        }),
    );
    element<HTMLSelectElement>('grouping').value = this.view.grouping;
    element('family-choice-label').hidden = this.view.grouping !== 'family';
    element<HTMLSelectElement>('family-choice').value = this.view.family;
    element('families').hidden = this.view.grouping === 'family';
  }

  // ------------------------------------------------------------------ building a comparison
  private selection(): { items: Item[]; groupKey: (item: Item) => string } {
    if (this.view.grouping === 'family') {
      const items = catalog.items
        .filter(
          (item) =>
            item.family === this.view.family &&
            subjects.get(item.subject)!.category === this.view.category,
        )
        .sort((a, b) => subjectOrder.get(a.subject)! - subjectOrder.get(b.subject)!);
      return { items, groupKey: (item) => item.subject };
    }
    const items = catalog.items
      .filter((item) => item.subject === this.view.subject && this.enabled.has(item.family))
      .sort((a, b) => familyOrder.get(a.family)! - familyOrder.get(b.family)!);
    return { items, groupKey: (item) => item.family };
  }
  async show(): Promise<void> {
    if (this.disposed) return;
    const epoch = ++this.epoch;
    this.buildPicker();
    history.replaceState(
      null,
      '',
      '#' +
        new URLSearchParams(
          this.view.grouping === 'family'
            ? { grouping: 'family', category: this.view.category, family: this.view.family }
            : { category: this.view.category, subject: this.view.subject },
        ).toString(),
    );
    const { items, groupKey } = this.selection();
    if (this.pending) this.releaseLineup(this.pending);
    if (!items.length) {
      // A filtered-empty comparison clears the stage rather than leaving older pieces in view.
      if (this.lineup) this.releaseLineup(this.lineup);
      this.lineup = undefined;
      element('labels').replaceChildren();
      element('family-groups').replaceChildren();
      element('status').textContent = 'No pieces match the chosen families. Tick a family above.';
      this.canvas.dataset.ready = 'true';
      this.updateAutoRender();
      return;
    }
    element('status').textContent = `Loading ${items.length} pieces…`;
    this.canvas.dataset.ready = 'false';
    const lineup: Lineup = (this.pending = {
      models: new BundledModels(this.app),
      shared: new Map(),
      materials: [],
      textures: [],
      meshes: [],
      roots: [],
      placed: [],
      rows: [],
      water: [],
    });
    const built = await Promise.allSettled(
      items.map((item) =>
        this.build(item, lineup).then((node) => {
          // Owned from creation, so a superseded comparison destroys pieces it never placed.
          lineup.roots.push(node);
          return node;
        }),
      ),
    );
    if (this.disposed || epoch !== this.epoch) {
      if (this.pending === lineup) this.pending = undefined;
      this.releaseLineup(lineup);
      return;
    }
    this.pending = undefined;
    const failed = built.filter((result) => result.status === 'rejected');
    for (const result of failed) console.warn('Survey piece unavailable.', result.reason);
    const entries = items
      .map((item, index) => ({
        item,
        node: built[index]!.status === 'fulfilled' ? built[index]!.value : undefined,
      }))
      .filter((entry): entry is { item: Item; node: pc.Entity } => entry.node !== undefined);
    if (!entries.length) {
      this.releaseLineup(lineup);
      element('status').textContent =
        `None of the ${items.length} pieces could load${this.lineup ? '; the previous comparison is still shown' : ''}.`;
      this.canvas.dataset.ready = String(!!this.lineup);
      return;
    }
    this.layout(lineup, entries, groupKey);
    if (this.lineup) this.releaseLineup(this.lineup);
    this.lineup = lineup;
    this.selected = undefined;
    this.resetCamera();
    this.renderCards();
    this.renderPicks();
    this.updateAutoRender();
    element('status').textContent = failed.length
      ? `${failed.length} of ${items.length} pieces could not load; the rest are shown.`
      : '';
    this.canvas.dataset.ready = 'true';
  }
  /** Returns an entity whose origin is the piece's ground centre, at real size. */
  private async build(item: Item, lineup: Lineup): Promise<pc.Entity> {
    if (item.kind === 'model') {
      const resource = await lineup.models.load(item.label, assetUrl(item.file!));
      const artwork = resource.instantiateRenderEntity({ castShadows: true, receiveShadows: true });
      this.prepareMaterials(artwork, lineup);
      const scale = item.scale ?? 1;
      const bounds = item.bounds!;
      // A single-node glTF can carry its own scale or rotation on the instantiated root: apply
      // the survey scale and ground offset on parents so that transform survives.
      const scaler = new pc.Entity('real size', this.app);
      scaler.setLocalScale(scale, scale, scale);
      scaler.addChild(artwork);
      const node = new pc.Entity(item.id, this.app);
      const grounded = new pc.Entity('ground centre', this.app);
      grounded.setLocalPosition(
        -(bounds.min[0]! + bounds.max[0]!) / 2,
        -bounds.min[1]!,
        -(bounds.min[2]! + bounds.max[2]!) / 2,
      );
      grounded.addChild(scaler);
      node.addChild(grounded);
      return node;
    }
    if (item.kind === 'water') return this.water(item, lineup);
    if (item.kind === 'ground') {
      const texture = this.canvasTexture(
        groupedGroundArt(
          17,
          false,
          item.options!['palette'] as 'meadow' | 'woodland' | 'understory',
        ),
        lineup,
      );
      const material = new pc.StandardMaterial();
      material.diffuseMap = texture;
      material.diffuseMapTiling = new pc.Vec2(0.62, 0.62);
      material.gloss = 0.1;
      prepareGroundLighting(material, this.app.graphicsDevice);
      material.update();
      lineup.materials.push(material);
      return this.box('ground', 2.5, 0.04, 2.5, material);
    }
    if (item.kind === 'house') {
      const maps = item.maps as { wall: SurfaceMaps; roof: SurfaceMaps };
      const [wall, roof] = await Promise.all([
        this.surfaceMaterial(maps.wall, lineup, 2, 1.5),
        this.surfaceMaterial(maps.roof, lineup, 1.6, 1.4),
      ]);
      const node = this.box('house walls', 4, 2.6, 3.2, wall);
      node.addChild(this.gable(4, 3.2, 1.5, 0, wall, lineup, false, 2.6));
      node.addChild(this.gable(4.5, 3.8, 1.7, 0.08, roof, lineup, true, 2.5));
      return node;
    }
    const maps = item.maps as SurfaceMaps;
    const shape = item.options?.['shape'] ?? 'ground';
    if (shape === 'wall')
      return this.box('wall', 3, 3, 0.25, await this.surfaceMaterial(maps, lineup, 1.5, 1.5));
    if (shape === 'floor')
      return this.box('floor', 2, 0.1, 2, await this.surfaceMaterial(maps, lineup, 1, 1));
    if (shape === 'roof') {
      const material = await this.surfaceMaterial(maps, lineup, 1.5, 1.1);
      const node = new pc.Entity('roof', this.app);
      node.addChild(this.gable(3, 2.6, 1.3, 0.06, material, lineup, true, 0));
      return node;
    }
    return this.box(
      'ground swatch',
      2.5,
      0.04,
      2.5,
      await this.surfaceMaterial(maps, lineup, 1.25, 1.25),
    );
  }
  private prepareMaterials(node: pc.Entity, lineup: Lineup): void {
    const prepared = new Map<pc.Material, pc.StandardMaterial>();
    for (const component of node.findComponents('render')) {
      if (!(component instanceof pc.RenderComponent)) continue;
      for (const mesh of component.meshInstances) {
        const source = mesh.material;
        if (!(source instanceof pc.StandardMaterial)) continue;
        let material = prepared.get(source);
        if (!material) {
          material = source.clone();
          const slots = material as unknown as Record<string, pc.Texture | null | undefined>;
          const duplicates = new Set<pc.Texture>();
          for (const slot of textureSlots) {
            const texture = slots[slot];
            if (!(texture instanceof pc.Texture)) continue;
            // The parser appends a counter to the image name; the rest identifies the content.
            // Wrapping stays in the key so differently sampled uses of one image stay apart.
            const name = texture.name.replace(/-\d+$/, '');
            const key = `${name}|${texture.addressU}|${texture.addressV}`;
            const shared = name.includes('#') ? lineup.shared.get(key) : undefined;
            if (shared) {
              slots[slot] = shared;
              if (texture !== shared) duplicates.add(texture);
              continue;
            }
            if (name.includes('#')) lineup.shared.set(key, texture);
            texture.magFilter = pc.FILTER_LINEAR;
            texture.minFilter = pc.FILTER_LINEAR_MIPMAP_LINEAR;
            texture.mipmaps = true;
          }
          // The parser uploads each embedded image; free a copy once no slot uses it.
          // Texture.destroy ignores the container's later second call.
          for (const texture of duplicates) texture.destroy();
          // Glass (glTF transmission) would need a scene-colour pass this study does not render;
          // refract the environment instead. The pinned declaration omits this documented property.
          (material as unknown as { useDynamicRefraction: boolean }).useDynamicRefraction = false;
          this.art.prepare(material);
          if (isFoliageMaterialName(source.name)) {
            material.twoSidedLighting = false;
            prepareFoliageLight(material, this.app.graphicsDevice);
            material.specularityFactor = 0.04;
          }
          material.update();
          prepared.set(source, material);
          lineup.materials.push(material);
        }
        mesh.material = material;
      }
    }
  }
  private async texture(file: TextureFile, lineup: Lineup, srgb: boolean): Promise<pc.Texture> {
    const bytes = await readAssetBytes(assetUrl(file.file));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/jpeg' }), {
      imageOrientation: 'none',
      premultiplyAlpha: 'none',
      colorSpaceConversion: 'none',
    });
    const texture = new pc.Texture(this.app.graphicsDevice, {
      name: file.file.split('/').slice(-2).join('/'),
      width: bitmap.width,
      height: bitmap.height,
      format: srgb ? pc.PIXELFORMAT_SRGBA8 : pc.PIXELFORMAT_RGBA8,
      mipmaps: true,
      minFilter: pc.FILTER_LINEAR_MIPMAP_LINEAR,
      magFilter: pc.FILTER_LINEAR,
      addressU: pc.ADDRESS_REPEAT,
      addressV: pc.ADDRESS_REPEAT,
      flipY: false,
    });
    // The pinned runtime accepts ImageBitmap; its declaration lists DOM sources only.
    texture.setSource(bitmap as unknown as HTMLImageElement);
    lineup.textures.push(texture);
    return texture;
  }
  private async surfaceMaterial(
    maps: SurfaceMaps,
    lineup: Lineup,
    u: number,
    v: number,
  ): Promise<pc.StandardMaterial> {
    const [color, normal, roughness] = await Promise.all([
      maps.color ? this.texture(maps.color, lineup, true) : undefined,
      maps.normal ? this.texture(maps.normal, lineup, false) : undefined,
      maps.roughness ? this.texture(maps.roughness, lineup, false) : undefined,
    ]);
    const material = new pc.StandardMaterial();
    const tiling = new pc.Vec2(u, v);
    material.useMetalness = true;
    material.metalness = 0;
    if (color) {
      material.diffuseMap = color;
      material.diffuseMapTiling = tiling;
    }
    if (normal) {
      material.normalMap = normal;
      material.normalMapTiling = tiling;
    }
    if (roughness) {
      material.glossMap = roughness;
      material.glossMapChannel = maps.roughness!.channel ?? 'r';
      material.glossInvert = true;
      material.glossMapTiling = tiling;
    }
    material.gloss = 1;
    this.art.prepare(material);
    material.update();
    lineup.materials.push(material);
    return material;
  }
  private canvasTexture(canvas: HTMLCanvasElement, lineup: Lineup): pc.Texture {
    const texture = new pc.Texture(this.app.graphicsDevice, {
      name: 'Survey canvas art',
      format: pc.PIXELFORMAT_SRGBA8,
      mipmaps: true,
      minFilter: pc.FILTER_LINEAR_MIPMAP_LINEAR,
      magFilter: pc.FILTER_LINEAR,
      addressU: pc.ADDRESS_REPEAT,
      addressV: pc.ADDRESS_REPEAT,
    });
    texture.setSource(canvas);
    lineup.textures.push(texture);
    return texture;
  }
  private box(name: string, x: number, y: number, z: number, material: pc.Material): pc.Entity {
    const node = new pc.Entity(name, this.app);
    const body = new pc.Entity(name + ' body', this.app);
    body.addComponent('render', { type: 'box', material, castShadows: true, receiveShadows: true });
    body.setLocalScale(x, y, z);
    body.setLocalPosition(0, y / 2, 0);
    node.addChild(body);
    return node;
  }
  /** A gable roof: two sloping planes and, when `closed`, the triangular ends. `overhang` lifts the
   * eaves above `base` so a roof can sit on walls without fighting their top face. */
  private gable(
    width: number,
    depth: number,
    rise: number,
    overhang: number,
    material: pc.Material,
    lineup: Lineup,
    slopes: boolean,
    base: number,
  ): pc.Entity {
    const w = width / 2,
      d = depth / 2,
      y0 = base + overhang,
      y1 = base + overhang + rise;
    const slope = Math.hypot(d, rise);
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const quad = (points: number[][], uv: number[][]) => {
      const start = positions.length / 3;
      for (const p of points) positions.push(...p);
      for (const t of uv) uvs.push(...t);
      indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
    };
    if (slopes) {
      quad(
        [
          [-w, y0, d],
          [w, y0, d],
          [w, y1, 0],
          [-w, y1, 0],
        ],
        [
          [0, 0],
          [width / 2, 0],
          [width / 2, slope / 2],
          [0, slope / 2],
        ],
      );
      quad(
        [
          [w, y0, -d],
          [-w, y0, -d],
          [-w, y1, 0],
          [w, y1, 0],
        ],
        [
          [0, 0],
          [width / 2, 0],
          [width / 2, slope / 2],
          [0, slope / 2],
        ],
      );
    } else
      for (const side of [1, -1]) {
        const start = positions.length / 3;
        positions.push(side * w, y0, side * d, side * w, y0, -side * d, side * w, y1, 0);
        uvs.push(0, 0, depth / 2, 0, depth / 4, rise / 2);
        indices.push(start, start + 1, start + 2);
      }
    const mesh = new pc.Mesh(this.app.graphicsDevice);
    mesh.setPositions(positions);
    mesh.setUvs(0, uvs);
    mesh.setNormals(pc.calculateNormals(positions, indices));
    mesh.setIndices(indices);
    mesh.update();
    lineup.meshes.push(mesh);
    const instance = new pc.MeshInstance(mesh, material);
    const node = new pc.Entity('gable', this.app);
    node.addComponent('render', {
      meshInstances: [instance],
      castShadows: true,
      receiveShadows: true,
    });
    if (material instanceof pc.StandardMaterial) {
      // The roof is single-surfaced; draw and light both of its faces.
      material.cull = pc.CULLFACE_NONE;
      material.twoSidedLighting = true;
      material.update();
    }
    return node;
  }

  // ------------------------------------------------------------------ water treatments
  /** Tileable ripple normals drawn once; water materials scroll them while motion is allowed. */
  private rippleNormals(): pc.Texture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const context = canvas.getContext('2d')!;
    const image = context.createImageData(size, size);
    const height = (x: number, y: number) => {
      let h = 0;
      for (const [fx, fy, amplitude] of [
        [3, 2, 1],
        [-2, 5, 0.6],
        [7, -4, 0.35],
        [-9, -8, 0.2],
      ] as const)
        h += amplitude * Math.sin(((fx * x + fy * y) / size) * Math.PI * 2);
      return h;
    };
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const dx = height(x + 1, y) - height(x - 1, y);
        const dy = height(x, y + 1) - height(x, y - 1);
        const nx = -dx * 2.5,
          ny = -dy * 2.5,
          length = Math.hypot(nx, ny, 1);
        const i = (y * size + x) * 4;
        image.data[i] = ((nx / length) * 0.5 + 0.5) * 255;
        image.data[i + 1] = ((ny / length) * 0.5 + 0.5) * 255;
        image.data[i + 2] = ((1 / length) * 0.5 + 0.5) * 255;
        image.data[i + 3] = 255;
      }
    context.putImageData(image, 0, 0);
    const texture = new pc.Texture(this.app.graphicsDevice, {
      name: 'Survey water ripples',
      format: pc.PIXELFORMAT_RGBA8,
      mipmaps: true,
      minFilter: pc.FILTER_LINEAR_MIPMAP_LINEAR,
      magFilter: pc.FILTER_LINEAR,
      addressU: pc.ADDRESS_REPEAT,
      addressV: pc.ADDRESS_REPEAT,
    });
    texture.setSource(canvas);
    return texture;
  }
  /** A small sky gradient that water reflects; it is not drawn as a background. */
  private skyReflection(): pc.Texture {
    const faces = Array.from({ length: 6 }, (_, face) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 32;
      const context = canvas.getContext('2d')!;
      const gradient = context.createLinearGradient(0, 0, 0, 32);
      const top = face === 2 ? '#9fc4e8' : '#a9cbe6';
      const bottom = face === 3 ? '#26332b' : face === 2 ? '#9fc4e8' : '#55705f';
      gradient.addColorStop(0, top);
      gradient.addColorStop(
        0.55,
        face === 2 || face === 3 ? (face === 2 ? top : bottom) : '#d9e4dc',
      );
      gradient.addColorStop(1, bottom);
      context.fillStyle = gradient;
      context.fillRect(0, 0, 32, 32);
      return canvas;
    });
    const cube = new pc.Texture(this.app.graphicsDevice, {
      name: 'Survey sky reflection',
      cubemap: true,
      width: 32,
      height: 32,
      format: pc.PIXELFORMAT_SRGBA8,
      mipmaps: false,
      minFilter: pc.FILTER_LINEAR,
      magFilter: pc.FILTER_LINEAR,
      addressU: pc.ADDRESS_CLAMP_TO_EDGE,
      addressV: pc.ADDRESS_CLAMP_TO_EDGE,
    });
    cube.setSource(faces as unknown as HTMLCanvasElement[]);
    return cube;
  }
  private water(item: Item, lineup: Lineup): pc.Entity {
    const style = item.options!['style'];
    const node = new pc.Entity('water ' + style, this.app);
    const bank = new pc.StandardMaterial();
    bank.diffuse = new pc.Color(0.24, 0.21, 0.16);
    bank.gloss = 0.1;
    bank.update();
    lineup.materials.push(bank);
    const basin = new pc.Entity('bank', this.app);
    basin.addComponent('render', { type: 'cylinder', material: bank, castShadows: false });
    basin.setLocalScale(2.8, 0.04, 2.8);
    basin.setLocalPosition(0, 0.02, 0);
    node.addChild(basin);
    const material = new pc.StandardMaterial();
    material.useMetalness = false;
    if (style === 'painted') {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const context = canvas.getContext('2d')!;
      const gradient = context.createRadialGradient(128, 128, 10, 128, 128, 128);
      gradient.addColorStop(0, '#2f6f78');
      gradient.addColorStop(0.72, '#4f9a96');
      gradient.addColorStop(0.86, '#8cc7b8');
      gradient.addColorStop(0.92, '#e6f1e8');
      gradient.addColorStop(1, '#8cc7b8');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 256, 256);
      material.diffuseMap = this.canvasTexture(canvas, lineup);
      material.gloss = 0.35;
      material.specular = new pc.Color(0.2, 0.2, 0.2);
      this.art.prepare(material);
    } else {
      const clear = style === 'clear';
      material.diffuse = clear ? new pc.Color(0.05, 0.13, 0.12) : new pc.Color(0.015, 0.03, 0.025);
      material.normalMap = this.rippleTexture;
      material.normalMapTiling = new pc.Vec2(clear ? 2.2 : 1.4, clear ? 2.2 : 1.4);
      material.bumpiness = clear ? 0.7 : 0.25;
      material.gloss = clear ? 0.9 : 0.96;
      material.specular = new pc.Color(0.6, 0.6, 0.6);
      material.cubeMap = this.skyCube;
      material.reflectivity = clear ? 0.55 : 0.85;
      if (clear) {
        material.opacity = 0.86;
        material.blendType = pc.BLEND_NORMAL;
        material.depthWrite = false;
      }
      lineup.water.push(material);
    }
    material.update();
    lineup.materials.push(material);
    const surface = new pc.Entity('water surface', this.app);
    surface.addComponent('render', {
      type: 'cylinder',
      material,
      castShadows: false,
      receiveShadows: true,
    });
    surface.setLocalScale(2.4, 0.02, 2.4);
    surface.setLocalPosition(0, 0.045, 0);
    node.addChild(surface);
    return node;
  }

  // ------------------------------------------------------------------ layout and labels
  /** Groups become blocks: each block is one line of pieces, and blocks fill a grid a few columns
   * wide so the comparison uses the stage's width rather than one tall column. */
  private layout(
    lineup: Lineup,
    entries: { item: Item; node: pc.Entity }[],
    groupKey: (item: Item) => string,
  ): void {
    const groups = new Map<string, { item: Item; node: pc.Entity; size: pc.Vec3 }[]>();
    for (const entry of entries) {
      const key = groupKey(entry.item);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push({ ...entry, size: this.footprint(entry.item) });
    }
    // Flat pieces (ground swatches, floors, water) wrap into a small grid inside their block so
    // they are not reduced to one long sliver; standing pieces keep a single line.
    const blocks = [...groups].map(([key, members]) => {
      const widest = Math.max(...members.map((member) => member.size.x));
      const tallest = Math.max(...members.map((member) => member.size.y));
      const gap = pc.math.clamp(widest * 0.3, 0.08, 2);
      const perLine = tallest < 0.6 ? Math.ceil(Math.sqrt(members.length * 1.6)) : members.length;
      const lines: (typeof members)[] = [];
      for (let i = 0; i < members.length; i += perLine) lines.push(members.slice(i, i + perLine));
      const lineWidth = (line: typeof members) =>
        line.reduce((sum, member) => sum + member.size.x, 0) + gap * (line.length - 1);
      const lineDepth = (line: typeof members) => Math.max(...line.map((member) => member.size.z));
      return {
        key,
        lines,
        gap,
        lineWidth,
        lineDepth,
        width: Math.max(...lines.map(lineWidth)),
        tallest,
        deepest: lines.reduce((sum, line) => sum + lineDepth(line), 0) + gap * (lines.length - 1),
      };
    });
    const spacing = Math.max(...blocks.map((block) => block.gap)) * 3;
    const widthsFor = (count: number) =>
      Array.from({ length: count }, (_, column) =>
        Math.max(
          0,
          ...blocks.filter((_, index) => index % count === column).map((block) => block.width),
        ),
      );
    // Choose the column count whose grid best matches the stage's shape, so neither the width
    // nor the stacked depth leaves most of the view empty.
    const aspect = this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight);
    const flatLineup = blocks.every((block) => block.tallest < 0.6);
    const pitch = flatLineup ? 1.0 : 0.55;
    let columns = 1;
    let bestSpan = Infinity;
    for (let count = 1; count <= blocks.length; count++) {
      const width = widthsFor(count).reduce((sum, value) => sum + value, 0) + spacing * (count - 1);
      let depth = 0;
      let tallest = 0;
      for (let start = 0; start < blocks.length; start += count) {
        const line = blocks.slice(start, start + count);
        const lineTallest = Math.max(...line.map((block) => block.tallest));
        depth +=
          Math.max(...line.map((block) => block.deepest)) +
          Math.max(0.5, lineTallest * 1.45, spacing);
        tallest = Math.max(tallest, lineTallest);
      }
      const height = depth * Math.sin(pitch) + tallest * Math.cos(pitch);
      const span = Math.max(width / aspect, height);
      if (span < bestSpan * 0.97) {
        bestSpan = span;
        columns = count;
      }
    }
    const columnWidths = widthsFor(columns);
    const totalWidth =
      columnWidths.reduce((sum, width) => sum + width, 0) + spacing * (columns - 1);
    const labels = element('labels');
    labels.replaceChildren();
    let z = 0;
    let number = 0;
    for (let start = 0; start < blocks.length; start += columns) {
      const blockLine = blocks.slice(start, start + columns);
      const deepest = Math.max(...blockLine.map((block) => block.deepest));
      const tallest = Math.max(...blockLine.map((block) => block.tallest));
      let left = -totalWidth / 2;
      blockLine.forEach((block, column) => {
        let first: Placed | undefined;
        let lineFront = z;
        for (const line of block.lines) {
          const rowZ = lineFront - block.lineDepth(line) / 2;
          let x = left + (columnWidths[column]! - block.lineWidth(line)) / 2;
          for (const member of line) {
            const cx = x + member.size.x / 2;
            member.node.setPosition(cx, 0, rowZ);
            this.app.root.addChild(member.node);
            const label = document.createElement('span');
            label.className = 'survey-label';
            label.style.setProperty('--family', familyColors[member.item.family]!);
            label.textContent = String(++number);
            labels.append(label);
            const placed: Placed = {
              item: member.item,
              number,
              node: member.node,
              center: new pc.Vec3(cx, member.size.y / 2, rowZ),
              min: new pc.Vec3(cx - member.size.x / 2, 0, rowZ - member.size.z / 2),
              max: new pc.Vec3(cx + member.size.x / 2, member.size.y, rowZ + member.size.z / 2),
              label,
            };
            first ??= placed;
            lineup.placed.push(placed);
            x += member.size.x + block.gap;
          }
          lineFront -= block.lineDepth(line) + block.gap;
        }
        const row = document.createElement('span');
        row.className = 'survey-row-label';
        const family = families.get(block.key);
        const color = familyColors[family ? block.key : this.view.family]!;
        row.style.setProperty('--family', color);
        row.textContent = family ? family.label : subjects.get(block.key)!.label;
        labels.append(row);
        lineup.rows.push({
          key: block.key,
          title: row.textContent,
          color,
          first: first!,
          label: row,
        });
        left += columnWidths[column]! + spacing;
      });
      // Block lines step back by their depth plus enough that, from the default camera pitch,
      // the tallest piece does not reach the bases of the blocks behind it.
      z -= deepest + Math.max(0.5, tallest * 1.45, spacing);
    }
    // Look down more steeply when the pieces are flat; standing pieces get a slight
    // three-quarter view so walls and flat-fronted models are not seen edge-on.
    this.defaultPitch = pitch;
    this.defaultYaw = flatLineup ? 0 : 0.35;
    this.corners = lineup.placed.flatMap((placed) =>
      [placed.min.x, placed.max.x].flatMap((x) =>
        [placed.min.y, placed.max.y].flatMap((y) =>
          [placed.min.z, placed.max.z].map((zz) => new pc.Vec3(x, y, zz)),
        ),
      ),
    );
    const min = new pc.Vec3(Infinity, Infinity, Infinity),
      max = new pc.Vec3(-Infinity, -Infinity, -Infinity);
    for (const corner of this.corners) {
      min.min(corner);
      max.max(corner);
    }
    this.extentCenter.add2(min, max).mulScalar(0.5);
  }
  /** Width, height and depth of a placed piece in metres. */
  private footprint(item: Item): pc.Vec3 {
    if (item.kind === 'model') {
      const { min, max } = item.bounds!;
      return new pc.Vec3(max[0]! - min[0]!, max[1]! - min[1]!, max[2]! - min[2]!);
    }
    if (item.kind === 'water') return new pc.Vec3(2.8, 0.06, 2.8);
    if (item.kind === 'house') return new pc.Vec3(4.5, 4.3, 3.8);
    const shape = item.options?.['shape'];
    if (shape === 'wall') return new pc.Vec3(3, 3, 0.25);
    if (shape === 'floor') return new pc.Vec3(2, 0.1, 2);
    if (shape === 'roof') return new pc.Vec3(3, 1.4, 2.6);
    return new pc.Vec3(2.5, 0.04, 2.5);
  }
  private labels(): void {
    const lineup = this.lineup;
    if (!lineup) return;
    const camera = this.camera.camera!;
    const point = new pc.Vec3();
    for (const placed of lineup.placed) {
      point.set(placed.center.x, placed.max.y + 0.04, placed.center.z);
      const at = camera.worldToScreen(point);
      placed.label.style.left = `${at.x}px`;
      placed.label.style.top = `${at.y}px`;
      const selected = placed.item.id === this.selected;
      placed.label.classList.toggle('selected', selected);
      placed.label.textContent = selected
        ? `${placed.number} · ${placed.item.label}`
        : String(placed.number);
    }
    for (const row of lineup.rows) {
      point.set(row.first.min.x, 0, row.first.max.z);
      const at = camera.worldToScreen(point);
      row.label.style.left = `${at.x}px`;
      row.label.style.top = `${at.y + 14}px`;
    }
  }

  // ------------------------------------------------------------------ camera
  private resetCamera(): void {
    this.yaw = this.defaultYaw;
    this.pitch = this.defaultPitch;
    this.zoom = 1;
    this.pan.set(0, 0, 0);
    this.focusSpan = undefined;
    this.center.copy(this.extentCenter);
    this.placeCamera();
  }
  private adjustZoom(scale: number): void {
    this.zoom = pc.math.clamp(this.zoom * scale, 0.03, 6);
    this.placeCamera();
  }
  /** Fit the placed pieces in the current view axes, reserving room for labels. */
  private fit(target: pc.Vec3, tangent: number, perspective: boolean): number {
    const aspect = this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight);
    const horizontal = aspect * Math.max(0.25, 1 - 160 / Math.max(1, this.canvas.clientWidth));
    const vertical = Math.max(0.25, 1 - 70 / Math.max(1, this.canvas.clientHeight));
    const sinYaw = Math.sin(this.yaw),
      cosYaw = Math.cos(this.yaw),
      sinPitch = Math.sin(this.pitch),
      cosPitch = Math.cos(this.pitch);
    let span = 0.5;
    for (const corner of this.corners) {
      const x = corner.x - target.x,
        y = corner.y - target.y,
        z = corner.z - target.z;
      const across = Math.abs(x * cosYaw - z * sinYaw) / horizontal;
      const up = Math.abs(-x * sinYaw * sinPitch + y * cosPitch - z * cosYaw * sinPitch) / vertical;
      const depth = perspective
        ? (x * sinYaw * cosPitch + y * sinPitch + z * cosYaw * cosPitch) * tangent
        : 0;
      span = Math.max(span, across + depth, up + depth);
    }
    return span;
  }
  private placeCamera(): void {
    this.labelsDirty = true;
    const camera = this.camera.camera!;
    const perspective = element<HTMLSelectElement>('projection').value === 'perspective';
    camera.projection = perspective ? pc.PROJECTION_PERSPECTIVE : pc.PROJECTION_ORTHOGRAPHIC;
    camera.fov = 40;
    const tangent = Math.tan(camera.fov * 0.5 * pc.math.DEG_TO_RAD);
    const target = this.center.clone().add(this.pan);
    const span = (this.focusSpan ?? this.fit(this.center, tangent, perspective)) * this.zoom;
    camera.orthoHeight = span;
    let diameter = 1;
    for (const corner of this.corners)
      diameter = Math.max(diameter, corner.distance(this.center) * 2);
    const distance = perspective ? Math.max(0.4, span / tangent) : diameter + 10;
    camera.nearClip = perspective ? Math.max(0.02, distance * 0.01) : 0.1;
    camera.farClip = distance + diameter + 20;
    this.sun.light!.shadowDistance = distance + diameter;
    const h = Math.cos(this.pitch) * distance;
    this.camera.setPosition(
      target.x + Math.sin(this.yaw) * h,
      target.y + Math.sin(this.pitch) * distance,
      target.z + Math.cos(this.yaw) * h,
    );
    this.camera.lookAt(target);
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width)),
      height = Math.max(1, Math.round(rect.height));
    if (this.app.graphicsDevice.width !== width || this.app.graphicsDevice.height !== height) {
      this.app.setCanvasResolution(pc.RESOLUTION_FIXED, width, height);
      this.frame.update();
    }
    this.invalidate();
  }

  // ------------------------------------------------------------------ selection
  private pick(x: number, y: number, focus: boolean): void {
    const lineup = this.lineup;
    if (!lineup) return;
    const camera = this.camera.camera!;
    const from = camera.screenToWorld(x, y, camera.nearClip);
    const to = camera.screenToWorld(x, y, camera.farClip);
    const ray = new pc.Ray(from, to.clone().sub(from).normalize());
    const box = new pc.BoundingBox();
    const hit = new pc.Vec3();
    let best: Placed | undefined;
    let nearest = Infinity;
    for (const placed of lineup.placed) {
      box.setMinMax(placed.min, placed.max);
      if (box.intersectsRay(ray, hit)) {
        const distance = hit.distance(from);
        if (distance < nearest) {
          nearest = distance;
          best = placed;
        }
      }
    }
    this.select(best?.item.id, focus, true);
  }
  select(id: string | undefined, focus: boolean, scrollCard: boolean): void {
    this.selected = id;
    for (const card of document.querySelectorAll<HTMLElement>('.survey-card'))
      card.classList.toggle('selected', card.dataset.id === id);
    const placed = this.lineup?.placed.find((entry) => entry.item.id === id);
    if (placed && scrollCard)
      document
        .querySelector(`.survey-card[data-id="${CSS.escape(placed.item.id)}"]`)
        ?.scrollIntoView({ block: 'nearest', behavior: this.reduce.matches ? 'auto' : 'smooth' });
    if (placed && focus) {
      this.center.copy(placed.center);
      this.pan.set(0, 0, 0);
      const size = placed.max.clone().sub(placed.min);
      this.focusSpan = Math.max(0.15, size.length() * 0.75);
      this.zoom = 1;
      this.placeCamera();
    }
    this.labelsDirty = true;
    this.invalidate();
  }

  // ------------------------------------------------------------------ cards and picks
  private renderCards(): void {
    const container = element('family-groups');
    const lineup = this.lineup;
    if (!lineup) return;
    const byGroup = new Map<string, Placed[]>();
    for (const row of lineup.rows) byGroup.set(row.key, []);
    for (const placed of lineup.placed) {
      const key = this.view.grouping === 'family' ? placed.item.subject : placed.item.family;
      byGroup.get(key)?.push(placed);
    }
    container.replaceChildren(
      ...[...byGroup].map(([key, members]) => {
        const family = families.get(key);
        const section = document.createElement('section');
        section.className = 'survey-group';
        section.style.setProperty('--family', familyColors[family ? key : this.view.family]!);
        const header = document.createElement('div');
        header.className = 'survey-group-header';
        const title = document.createElement('h2');
        title.textContent = family ? family.label : subjects.get(key)!.label;
        header.append(title);
        if (family) {
          const source = document.createElement('span');
          source.className = 'source';
          source.textContent = family.source;
          const badge = document.createElement('span');
          badge.className = `badge ${family.status}`;
          badge.textContent = statusLabels[family.status];
          header.append(source, badge);
          if (this.view.grouping === 'subject') {
            // Captured now: the view can change while these cards remain during a load.
            const subject = subjects.get(this.view.subject)!;
            const best = document.createElement('label');
            best.className = 'best-fit';
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'best-fit';
            radio.checked = picks.bestFit[subject.id] === key;
            radio.setAttribute(
              'aria-label',
              `${family.label} is the best fit for ${subject.label.toLowerCase()}`,
            );
            radio.onchange = () => {
              picks.bestFit[subject.id] = key;
              savePicks();
              this.renderPicks();
            };
            best.append(radio, `Best fit for ${subject.label.toLowerCase()}`);
            header.append(best);
          }
        }
        section.append(header);
        const note = document.createElement('p');
        note.className = 'survey-group-note';
        note.textContent = family ? family.note : subjects.get(key)!.note;
        section.append(note);
        const cards = document.createElement('div');
        cards.className = 'survey-cards';
        cards.append(...members.map((placed) => this.card(placed)));
        section.append(cards);
        return section;
      }),
    );
  }
  private card(placed: Placed): HTMLElement {
    const item = placed.item;
    const card = document.createElement('article');
    card.className = 'survey-card';
    card.dataset.id = item.id;
    card.style.setProperty('--family', familyColors[item.family]!);
    card.classList.toggle('liked', !!picks.liked[item.id]);
    const title = document.createElement('h3');
    const number = document.createElement('span');
    number.className = 'number';
    number.textContent = String(placed.number);
    title.append(number, item.label);
    card.append(title);
    if (item.inGame) {
      const badge = document.createElement('span');
      badge.className = 'badge in-game';
      badge.textContent = 'In game now';
      card.append(badge);
    }
    const facts = document.createElement('small');
    const size = placed.max.clone().sub(placed.min);
    facts.textContent = [
      `${size.y.toFixed(2)} m tall · ${Math.max(size.x, size.z).toFixed(2)} m across`,
      item.triangles !== undefined ? `${item.triangles.toLocaleString()} triangles` : undefined,
      item.textures?.length
        ? `${item.textures.length} texture${item.textures.length === 1 ? '' : 's'} up to ${Math.max(...item.textures.map((t) => Math.max(t[0]!, t[1]!)))} px`
        : item.kind === 'model'
          ? 'flat colours, no texture'
          : undefined,
    ]
      .filter(Boolean)
      .join(' · ');
    card.append(facts);
    const credit = document.createElement('p');
    credit.className = 'credit';
    const origin = item.source ? catalog.sources[item.source] : undefined;
    if (origin) {
      const link = document.createElement('a');
      link.href = origin.page;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.textContent = `${origin.creator} · ${origin.license}`;
      credit.append(link);
    } else credit.textContent = item.credit ?? '';
    card.append(credit);
    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const like = document.createElement('button');
    like.type = 'button';
    like.className = 'like';
    const liked = () => !!picks.liked[item.id];
    const refresh = () => {
      like.setAttribute('aria-pressed', String(liked()));
      like.textContent = liked() ? '♥ Liked' : '♡ Like';
      card.classList.toggle('liked', liked());
    };
    like.onclick = () => {
      if (liked()) delete picks.liked[item.id];
      else picks.liked[item.id] = true;
      savePicks();
      refresh();
      this.renderPicks();
      this.buildPicker();
    };
    refresh();
    const focus = document.createElement('button');
    focus.type = 'button';
    focus.textContent = 'Focus';
    focus.onclick = () => this.select(item.id, true, false);
    actions.append(like, focus);
    card.append(actions);
    const note = document.createElement('input');
    note.type = 'text';
    note.placeholder = 'Note (optional)';
    note.setAttribute('aria-label', `Note about ${item.label}`);
    note.value = picks.notes[item.id] ?? '';
    note.oninput = () => {
      if (note.value.trim()) picks.notes[item.id] = note.value;
      else delete picks.notes[item.id];
      savePicks();
    };
    card.append(note);
    card.onclick = (event) => {
      if ((event.target as HTMLElement).closest('button, input, a')) return;
      this.select(item.id, false, false);
    };
    return card;
  }
  private renderPicks(): void {
    const liked = catalog.items.filter((item) => picks.liked[item.id]);
    const fits = Object.entries(picks.bestFit);
    element('picks-summary').textContent = liked.length
      ? `${liked.length} liked piece${liked.length === 1 ? '' : 's'} · best-fit family chosen for ${fits.length} subject${fits.length === 1 ? '' : 's'}`
      : 'Like pieces in the cards below, and mark the family that fits each subject best.';
    const counts = new Map<string, number>();
    for (const item of liked) counts.set(item.family, (counts.get(item.family) ?? 0) + 1);
    for (const [, family] of fits) counts.set(family, counts.get(family) ?? 0);
    const most = Math.max(1, ...counts.values());
    element('picks-families').replaceChildren(
      ...catalog.families
        .filter((family) => counts.has(family.id))
        .map((family) => {
          const row = document.createElement('div');
          row.className = 'picks-family';
          row.style.setProperty('--family', familyColors[family.id]!);
          const swatch = document.createElement('span');
          swatch.className = 'swatch';
          const name = document.createElement('span');
          const bestFor = fits.filter(([, id]) => id === family.id).length;
          name.textContent = family.label + (bestFor ? ` · best fit for ${bestFor}` : '');
          const count = document.createElement('span');
          count.textContent = `♥ ${counts.get(family.id)}`;
          const bar = document.createElement('div');
          bar.className = 'picks-bar';
          const fill = document.createElement('span');
          fill.style.width = `${(100 * counts.get(family.id)!) / most}%`;
          bar.append(fill);
          row.append(swatch, name, count, bar);
          return row;
        }),
    );
    element('picks-list').replaceChildren(
      ...liked.map((item) => {
        const entry = document.createElement('li');
        const link = document.createElement('a');
        link.href =
          '#' +
          new URLSearchParams({
            category: subjects.get(item.subject)!.category,
            subject: item.subject,
          });
        link.textContent = `${item.label} (${families.get(item.family)!.label}, ${subjects.get(item.subject)!.label.toLowerCase()})`;
        entry.append(link);
        return entry;
      }),
    );
  }
  private async copyPicks(): Promise<void> {
    const lines = ['# OpenLegend world asset survey picks', ''];
    for (const category of catalog.categories) {
      const relevant = catalog.subjects.filter((subject) => subject.category === category.id);
      const section: string[] = [];
      for (const subject of relevant) {
        const liked = catalog.items.filter(
          (item) => item.subject === subject.id && picks.liked[item.id],
        );
        const best = picks.bestFit[subject.id];
        if (!liked.length && !best) continue;
        section.push(
          `- **${subject.label}**${best ? ` — best fit: ${families.get(best)?.label ?? best}` : ''}`,
        );
        for (const item of liked)
          section.push(
            `  - ${item.label} (${families.get(item.family)!.label}; ${item.id})${picks.notes[item.id] ? ` — ${picks.notes[item.id]}` : ''}`,
          );
      }
      if (section.length) lines.push(`## ${category.label}`, ...section, '');
    }
    const notesOnly = catalog.items.filter((item) => picks.notes[item.id] && !picks.liked[item.id]);
    if (notesOnly.length)
      lines.push(
        '## Other notes',
        ...notesOnly.map((item) => `- ${item.label} (${item.id}): ${picks.notes[item.id]}`),
      );
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      element('copy-status').textContent = 'Copied. Paste it into the conversation.';
    } catch {
      element('copy-status').textContent = 'Copying was blocked; select the text below instead.';
      element('inspection-metrics').textContent = lines.join('\n');
      (element('inspection-metrics').closest('details') as HTMLDetailsElement).open = true;
    }
  }

  /** Native history restoration can restore select and checkbox values after start-up. */
  restoreControls(): void {
    if (this.disposed) return;
    this.shading();
    this.light();
    this.placeCamera();
    const restored = new Set(
      [...element('families').querySelectorAll('input')]
        .filter((input) => input.checked)
        .map((input) => input.value),
    );
    if ([...restored].sort().join() !== [...this.enabled].sort().join()) {
      this.enabled = restored;
      void this.show();
    }
  }

  // ------------------------------------------------------------------ light, frame loop, teardown
  private shading(): void {
    this.art.update({
      ...candidateArt,
      lighting: element<HTMLSelectElement>('shading').value === 'soft' ? 'soft' : 'smooth',
    });
    this.invalidate();
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
    const sky = element<HTMLSelectElement>('reflections').value === 'sky';
    this.app.scene.envAtlas = sky ? this.skyLight : null;
    this.app.scene.skyboxIntensity = mode === 'overcast' ? 0.9 : mode === 'warm' ? 0.55 : 0.7;
    this.invalidate();
  }
  private updateAutoRender(): void {
    const water = !!this.lineup?.water.length && !this.reduce.matches;
    this.app.autoRender = this.turning || water;
    this.invalidate();
  }
  private update(dt: number): void {
    if (this.disposed) return;
    const step = Math.min(dt, 0.1);
    if (this.turning) {
      this.yaw += step * 0.22;
      this.placeCamera();
    }
    if (!this.reduce.matches)
      for (const material of this.lineup?.water ?? []) {
        const offset = material.normalMapOffset;
        material.normalMapOffset = new pc.Vec2(
          (offset.x + step * 0.018) % 1,
          (offset.y + step * 0.011) % 1,
        );
        material.update();
      }
    if (this.labelsDirty) {
      this.labels();
      this.labelsDirty = false;
    }
  }
  private invalidate(): void {
    if (!this.disposed) this.app.renderNextFrame = true;
  }
  private releaseLineup(lineup: Lineup): void {
    for (const root of lineup.roots) root.destroy();
    for (const material of lineup.materials) material.destroy();
    for (const texture of lineup.textures) texture.destroy();
    for (const mesh of lineup.meshes) mesh.destroy();
    lineup.roots.length =
      lineup.materials.length =
      lineup.textures.length =
      lineup.meshes.length =
        0;
    const pending = lineup.models.destroy();
    if (!pending) return;
    this.modelCleanup.add(pending);
    void pending.finally(() => this.modelCleanup.delete(pending));
  }
  diagnostics() {
    return {
      view: this.view,
      pieces: this.lineup?.placed.length ?? 0,
      selected: this.selected,
      draws: this.app.stats.drawCalls.total,
      triangles: this.app.stats.frame.triangles,
      buffer: [this.app.graphicsDevice.width, this.app.graphicsDevice.height],
      memoryBytes: { ...this.app.stats.vram },
      materials: this.lineup?.materials.length ?? 0,
      textures: this.lineup?.textures.length ?? 0,
      autoRender: this.app.autoRender,
    };
  }
  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.epoch++;
    this.events.abort();
    this.observer.disconnect();
    if (this.lineup) this.releaseLineup(this.lineup);
    if (this.pending) this.releaseLineup(this.pending);
    this.app.scene.envAtlas = null;
    this.rippleTexture.destroy();
    this.skyCube.destroy();
    this.skyLight.destroy();
    this.stageMaterial.destroy();
    this.frame.destroy();
    element('labels').replaceChildren();
    destroyModelApplication(this.app, [...this.modelCleanup]);
  }
}

const sourceNames = [
  ...new Set(
    Object.values(catalog.sources).map((source) => `${source.creator} (${source.license})`),
  ),
];
element('source-credits').textContent =
  `Sources: ${sourceNames.join(', ')}; earlier OpenLegend study adaptations keep their recorded credits.`;
let survey = new AssetSurvey(element<HTMLCanvasElement>('survey-canvas'));
// Local diagnostic hook for this developer inspection page.
Object.assign(window, { assetSurvey: survey });
window.addEventListener('pageshow', (event) => {
  if (!event.persisted) return survey.restoreControls();
  survey = new AssetSurvey(element<HTMLCanvasElement>('survey-canvas'));
  Object.assign(window, { assetSurvey: survey });
});
