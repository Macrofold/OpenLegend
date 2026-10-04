import { itemPileArt } from './art';
import {
  configureBillboard,
  billboardBodyPoint,
  instanceBillboards,
  cameraDepthFraction,
  spritePadding,
  updateBillboardBounds,
} from './billboard';
import { interpolateVisualFoot } from './world-motion';
import { WorldPresentation, lightSprite, type RevealBinding } from './world-presentation';
import { createSpriteRelief } from './sprite-relief';
import * as pc from 'playcanvas';
import { ShadowMaterial } from './shadow-material';
import { SpriteShadowBatches } from './shadow-batches';
import { HoverOutline } from './hover-outline';
import {
  ordinaryStencil,
  personStencil,
  sceneryStencil,
  setVisibilityStencil,
} from './visibility-stencil';
import { StatusIndicators } from './status-indicators';
import type { EntityView, GameView, SurfacePoint } from '@open-legend/protocol';
import {
  intersectBox,
  pickSurfaces,
  rayHits,
  spatialBlockers,
  surfaceById,
  surfaceHeight,
  type WorldPoint,
} from '@open-legend/spatial';
import {
  cameraPose,
  cameraPreferences,
  initialCamera,
  restoreCameraPreferences,
  updateCamera,
  CAMERA_FOV_DEGREES,
  type CameraCommand,
  type CameraState,
} from './world-camera';
import type {
  SceneCallbacks,
  WorldRenderer,
  SpeechCaptionOptions,
  ShadowQuality,
  PerceptionOptions,
} from './world-renderer';
import { birdArt, surfaceMesh, surfaceSeamsMesh } from './spatial-art';
import { playerEntity } from './entity-view';
import { MercenaryModels, type MercenaryActor } from './characters/mercenary';
import { VisionBlur, VISION_FOCUS } from './vision-blur';
import { PerceptionOverlay } from './perception-overlay';
import { CharacterStatuses } from './character-status';
import { SpeechCaptions, type CaptionPoint } from './speech-captions';
import {
  animalArt,
  earthArt,
  fireArt,
  groundArt,
  personArt,
  random,
  resourceArt,
  treeArt,
} from './art';

interface RenderedEntity {
  model?: MercenaryActor;
  departedAt?: number;
  observed: boolean;
  card: boolean;
  images: ImageData[];
  assetKey: string;
  root: pc.Entity;
  sprite: pc.Entity;
  meshCasters: pc.MeshInstance[];
  reveal: RevealBinding;
  renderedSupport: string | null;
  view: EntityView;
  materials: pc.StandardMaterial[];
  lastFrame: number;
  lastMoving?: boolean;
  punchRecovery?: number;
  facing: number;
  scaleFacing: number;
  width: number;
  height: number;
}
const NO_OUTLINE_MESHES: readonly pc.MeshInstance[] = [];
/** Presentation only. Entity positions, terrain and all interactions come from the public projection. */
export class WildernessScene implements WorldRenderer {
  readonly app: pc.Application;
  private camera!: pc.Entity;
  private sun!: pc.Entity;
  private landscape!: pc.Entity;
  private actors = new Map<string, RenderedEntity>();
  private knownEvents = new Set<string>();
  private textures: pc.Texture[] = [];
  private materials: pc.StandardMaterial[] = [];
  private cameraSettings = initialCamera();
  private geometryNodes = new Map<string, pc.Entity>();
  private geometryMeshes: pc.Mesh[] = [];
  private cutaways = new Set<string>();
  private cards = new Map<
    pc.Entity,
    {
      x: number;
      y: number;
      z: number;
      height: number;
      horizontalHeight?: number;
      padding: ReturnType<typeof spritePadding>;
      depth: number;
    }
  >();
  private landscapeCards = new Set<pc.Entity>();
  private outline!: HoverOutline;
  private hoveredId: string | null = null;
  private hoverStarted = 0;
  private landscapeBuffers: pc.VertexBuffer[] = [];
  private shadowBatches!: SpriteShadowBatches;
  private reliefMeshes = new Map<pc.Texture, ReturnType<typeof createSpriteRelief>>();
  private appearanceAssets = new Map<
    string,
    {
      materials: pc.StandardMaterial[];
      images: ImageData[];
      padding: ReturnType<typeof spritePadding>;
      refs: number;
    }
  >();
  private landscapeMaterials: pc.StandardMaterial[] = [];
  private selected: string | null = null;
  private marker: pc.Entity;
  private destination: pc.Entity;
  private markerUntil = 0;
  private elapsed = 0;
  private view: GameView | null = null;
  private mapKey = '';
  private worldKey = '';
  private cutawayKey = '';
  private orientedYaw = NaN;
  private orientedPitch = NaN;
  private nextHoverAt = 0;
  private lastHover?: { entity: EntityView | null; x: number; y: number };
  private initialized = false;
  private visionBlur: VisionBlur;
  private readonly perception: PerceptionOverlay;
  readonly statuses: CharacterStatuses;
  private statusIndicators: StatusIndicators;
  private readonly speech: SpeechCaptions;
  private drag: {
    pointerId: number;
    x: number;
    y: number;
    button: number;
    pan: boolean;
    orbit: boolean;
    moved: boolean;
  } | null = null;
  // Some browsers emit contextmenu on press, others after release. Pointer
  // gestures own their menu; suppress that native duplicate until the next press.
  private pointerContextHandled = false;
  private resizeObserver?: ResizeObserver;
  private destroyed = false;
  private readyRequested = false;
  private presentation!: WorldPresentation;
  private mercenary?: MercenaryModels;
  private hoverPoint: { x: number; y: number } | null = null;
  private animations: Array<{ y: number; entity: pc.Entity; x: number; z: number; phase: number }> =
    [];

  constructor(
    private canvas: HTMLCanvasElement,
    private callbacks: SceneCallbacks,
  ) {
    try {
      this.cameraSettings = restoreCameraPreferences(
        JSON.parse(localStorage.getItem('open-legend:camera-v1') ?? 'null'),
      );
    } catch {
      /* Camera preference storage is optional. */
    }
    this.app = new pc.Application(canvas, {
      graphicsDeviceOptions: {
        alpha: false,
        antialias: false,
        powerPreference: 'high-performance',
      },
    });
    this.canvas.dataset.ready = 'false';
    this.visionBlur = new VisionBlur(canvas);
    this.perception = new PerceptionOverlay(this.app, canvas);
    this.statuses = new CharacterStatuses(canvas);
    this.statusIndicators = new StatusIndicators(canvas);
    this.speech = new SpeechCaptions(canvas);
    try {
      this.camera = new pc.Entity('Camera', this.app);
      this.landscape = new pc.Entity('Landscape', this.app);
      this.app.graphicsDevice.maxPixelRatio = 1;
      this.app.scene.ambientLight = new pc.Color(0.67, 0.72, 0.61);
      this.app.scene.fog.type = pc.FOG_LINEAR;
      this.app.scene.fog.color = new pc.Color(0.4, 0.47, 0.37);
      this.app.scene.fog.start = 63;
      this.app.scene.fog.end = 110;
      this.camera.addComponent('camera', {
        clearColor: new pc.Color(0.27, 0.34, 0.27),
        projection: pc.PROJECTION_ORTHOGRAPHIC,
        orthoHeight: this.cameraSettings.zoom,
        nearClip: 0.1,
        farClip: 256,
        fov: CAMERA_FOV_DEGREES,
      });
      this.app.root.addChild(this.camera);
      const sun = (this.sun = new pc.Entity('Sun', this.app));
      sun.enabled = false;
      sun.addComponent('light', {
        type: 'directional',
        color: new pc.Color(1, 0.91, 0.72),
        intensity: 0,
        castShadows: true,
        shadowDistance: 40,
        normalOffsetBias: 0.04,
      });
      this.app.root.addChild(sun);
      this.presentation = new WorldPresentation(this.app, this.camera, sun);
      this.outline = new HoverOutline(this.app, this.camera);
      this.mercenary = new MercenaryModels(
        this.app,
        this.presentation,
        this.camera,
        this.sun.light!.light,
      );
      this.shadowBatches = new SpriteShadowBatches(
        this.app.graphicsDevice,
        this.app.scene.layers.getLayerById(pc.LAYERID_WORLD)!,
      );
      this.app.root.addChild(this.landscape);
      this.marker = this.ring('#e3ca87', 'Selection');
      this.destination = this.ring('#cfdfb6', 'Destination');
      this.destination.enabled = false;
      this.marker.enabled = false;
      this.app.root.addChild(this.marker);
      this.app.root.addChild(this.destination);
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(canvas);
      canvas.addEventListener('pointerdown', this.pointerDown);
      canvas.addEventListener('pointermove', this.pointerMove);
      canvas.addEventListener('pointerleave', this.clearHover);
      canvas.addEventListener('pointerup', this.pointerUp);
      canvas.addEventListener('pointercancel', this.pointerCancel);
      canvas.addEventListener('lostpointercapture', this.pointerCancel);
      canvas.addEventListener('contextmenu', this.contextMenu);
      canvas.addEventListener('wheel', this.wheel, { passive: false });
      canvas.addEventListener('keydown', this.cameraKey);
      window.addEventListener('blur', this.blur);
      this.app.on('update', (dt: number) => this.update(dt));
      this.resize();
      this.placeCamera();
      this.app.start();
    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  setShadowQuality(quality: ShadowQuality): void {
    if (this.presentation.setShadowQuality(quality) && this.view)
      this.presentation.lighting(this.view);
  }
  setPerceptionOptions(options: PerceptionOptions): void {
    this.perception.setOptions(options);
  }
  setView(view: GameView): void {
    this.view = view;
    this.perception.setView(view);
    const key = `${view.worldId}:${view.map.seed}:${view.map.width}:${view.map.height}:${view.map.spatial.revision}`;
    const worldKey = `${view.worldId}:${view.saveTimeline}:${view.access?.scope}`;
    if (this.worldKey !== worldKey) {
      for (const entry of this.actors.values()) this.releaseEntity(entry);
      this.actors.clear();
      this.knownEvents.clear();
      this.selected = null;
      this.initialized = false;
      this.worldKey = worldKey;
      this.mapKey = '';
      this.cutawayKey = '';
    }
    if (this.mapKey !== key) {
      // Geometry changes rebuild the landscape, not every unchanged actor's sprite/GPU assets.
      this.mapKey = key;
      this.buildLandscape(view.map);
    }
    if (!this.initialized) {
      this.cameraSettings = updateCamera(this.cameraSettings, {
        type: 'focus',
        point: { ...view.player.position, z: view.player.position.z - 1 },
      });
      this.initialized = true;
      this.placeCamera();
      this.callbacks.cameraChanged?.(this.cameraState());
    }
    const entities = [
      ...view.entities.filter((entity) => entity.id !== view.player.id),
      ...(view.player.participation === 'inactive' ? [] : [playerEntity(view)]),
    ];
    const visible = new Set(entities.map((entity) => entity.id));
    const departed = new Set(
      view.events
        .filter((event) => event.type === 'departed' && !this.knownEvents.has(event.id))
        .map((event) => event.actorId),
    );
    this.knownEvents = new Set(view.events.map((event) => event.id));
    for (const [id, entry] of this.actors)
      if (!visible.has(entry.view.id)) {
        // Loose piles have no renderer ghost: occlusion and collection both hide the heap.
        // docs/worlds/base/items.md#ground-piles
        if (
          entry.view.kind === 'item-pile' ||
          (entry.view.id === view.player.id && view.player.participation === 'inactive') ||
          (departed.has(id) && document.documentElement.dataset.reduceMotion === 'true')
        ) {
          this.releaseEntity(entry);
          this.actors.delete(id);
          continue;
        }
        // Absence can mean occlusion, not disappearance. Retain only the last authorized image;
        // an unobserved ghost has no interaction or current-state knowledge.
        if (departed.has(id)) entry.departedAt = this.elapsed;
        entry.observed = false;
        entry.root.setPosition(entry.view.position.x, entry.view.position.y, entry.view.position.z);
      }
    for (const entity of entities) {
      let entry = this.actors.get(entity.id);
      const signature = `${
        entity.contents
          ?.slice(0, 12)
          .map((item) => `${item.definitionId}:${Math.min(3, item.quantity)}`)
          .join('|') ?? ''
      }:${entity.kind}:${entity.subtype}:${entity.appearance}:${entity.kind === 'resource' ? entity.name : ''}:${entity.status === 'Dead'}:${entity.kind === 'actor' && entity.id === view.player.id && view.player.inventory.some((item) => item.equipped)}`;
      if (entry && entry.root.tags.list()[0] !== signature) {
        this.releaseEntity(entry);
        this.actors.delete(entity.id);
        entry = undefined;
      }
      if (!entry) {
        entry = this.makeEntity(entity, view);
        entry.root.tags.add(signature);
        this.actors.set(entity.id, entry);
      }
      const card = this.cards.get(entry.sprite);
      if (
        card &&
        card.horizontalHeight !==
          (entity.statusEffects?.some((effect) => effect.pose === 'horizontal')
            ? entry.width
            : undefined)
      ) {
        // Use projected presentation, never action names or elapsed client time.
        // docs/architecture.md#react-presentation-and-character-traits
        card.horizontalHeight = entity.statusEffects?.some((effect) => effect.pose === 'horizontal')
          ? entry.width
          : undefined;
        this.orientCard(entry.sprite);
        for (const mesh of entry.sprite.render?.meshInstances ?? [])
          mesh.setParameter(
            'ol_spriteSize',
            card.horizontalHeight === undefined
              ? [entry.width, entry.height]
              : [entry.height, entry.width],
          );
      }
      entry.view = entity;
      entry.observed = true;
      delete entry.departedAt;
    }
    // A bounded, session-only visual memory; never a second source of live facts.
    const remembered = [...this.actors].filter(([, entry]) => !entry.observed);
    for (const [id, entry] of remembered.slice(0, Math.max(0, remembered.length - 128))) {
      this.releaseEntity(entry);
      this.actors.delete(id);
    }
    this.applyLevelFocus();
    this.presentation.lighting(view);
    this.statuses.observe(view);
    this.statusIndicators.observe(entities);
    this.speech.observe(view);
    if (!this.readyRequested) {
      this.readyRequested = true;
      // An existing WebGL context alone does not prove that the world rendered.
      this.app.once('frameend', () => {
        if (!this.destroyed) this.canvas.dataset.ready = 'true';
      });
    }
  }

  setCaptionOptions(options: SpeechCaptionOptions): void {
    this.speech.setOptions(options);
  }
  resetTransientCaptions(): void {
    this.speech.resetBaseline();
  }
  select(id: string | null): boolean {
    const entry = id ? this.actors.get(id) : undefined;
    if (id && (!entry || !this.identifiable(entry))) {
      this.denySelection();
      return false;
    }
    this.selected = id;
    return true;
  }
  center(): void {
    if (this.view) this.cameraCommand({ type: 'focus', point: this.view.player.position });
  }
  setZoom(delta: number): void {
    this.cameraCommand({ type: 'zoom', delta });
  }
  cameraState(): CameraState {
    return { ...this.cameraSettings, focus: { ...this.cameraSettings.focus } };
  }
  cameraCommand(command: CameraCommand): void {
    if (
      command.type === 'level' &&
      command.id &&
      !this.view?.map.spatial.levels.some((level) => level.id === command.id)
    )
      return;
    this.cameraSettings = updateCamera(this.cameraSettings, command);
    if (command.type === 'follow' && this.cameraSettings.following && this.view)
      this.cameraSettings = updateCamera(this.cameraSettings, {
        type: 'focus',
        point: this.view.player.position,
      });
    this.placeCamera();
    this.applyLevelFocus();
    // No storage write for every pointer sample. Commit preferences when a gesture ends.
    if (!this.drag) this.saveCameraPreferences();
    this.callbacks.cameraChanged?.(this.cameraState());
  }
  private saveCameraPreferences(): void {
    try {
      localStorage.setItem(
        'open-legend:camera-v1',
        JSON.stringify(cameraPreferences(this.cameraSettings)),
      );
    } catch {
      /* Optional local presentation preference. */
    }
  }
  private applyLevelFocus(): void {
    const map = this.view?.map;
    if (!map) return;
    const level = map.spatial.levels.find((entry) => entry.id === this.cameraSettings.levelId);
    const cutawayKey = `${this.mapKey}:${level?.id ?? 'all'}`;
    if (this.cutawayKey !== cutawayKey) {
      this.cutawayKey = cutawayKey;
      this.cutaways.clear();
      if (level) {
        for (const surface of map.spatial.surfaces) {
          const minimum = Math.min(
            surfaceHeight(surface, surface.minX, surface.minZ),
            surfaceHeight(surface, surface.minX, surface.maxZ),
            surfaceHeight(surface, surface.maxX, surface.minZ),
            surfaceHeight(surface, surface.maxX, surface.maxZ),
          );
          if (surface.levelId !== level.id && minimum > level.focusY + 0.05)
            this.cutaways.add(surface.id);
        }
        for (const blocker of spatialBlockers(map))
          if (blocker.bounds.min.y > level.focusY + 0.05) this.cutaways.add(blocker.id);
      }
      for (const [id, node] of this.geometryNodes)
        this.presentation.setCutaway(node, this.cutaways.has(id));
    }
    for (const entry of this.actors.values()) {
      const support = surfaceById(map, entry.view.supportSurfaceId ?? '');
      entry.root.enabled =
        !level ||
        !support ||
        support.levelId === level.id ||
        entry.view.id === this.view!.player.id;
      this.updateModelVisibility(entry);
      for (const mesh of entry.meshCasters) mesh.castShadow = entry.observed && entry.root.enabled;
      for (const mesh of entry.sprite.render?.meshInstances ?? [])
        mesh.setParameter(
          'material_opacity',
          entry.departedAt !== undefined
            ? Math.max(0, 1 - (this.elapsed - entry.departedAt) / 0.4)
            : entry.observed
              ? 1
              : 0.28,
        );
    }
    this.canvas.dataset.projection = this.cameraSettings.projection;
    this.canvas.dataset.floor = level?.id ?? 'all';
    this.canvas.dataset.cameraYaw = String(this.cameraSettings.yaw);
    this.canvas.dataset.cameraPitch = String(this.cameraSettings.pitch);
  }
  screenPosition(id: string): { x: number; y: number } | null {
    const entry = this.actors.get(id);
    if (!entry || !this.identifiable(entry)) return null;
    const point = this.camera.camera!.worldToScreen(
      entry.root
        .getPosition()
        .clone()
        .add(new pc.Vec3(0, (entry.model?.visible ? entry.model.height : entry.height) + 0.1, 0)),
    );
    return { x: point.x, y: point.y };
  }

  /** Anchor to the rendered sprite's top edge, including its tilt/animation. */
  private statusAnchor(id: string): { x: number; y: number } | null {
    const entry = this.actors.get(id);
    if (!entry || !this.identifiable(entry)) return null;
    if (!entry.card || entry.model?.visible) return this.screenPosition(id);
    const transform = entry.sprite.getWorldTransform();
    const points = [
      new pc.Vec3(-0.5, 0, -0.5),
      new pc.Vec3(0.5, 0, -0.5),
      new pc.Vec3(-0.5, 0, 0.5),
      new pc.Vec3(0.5, 0, 0.5),
    ].map((corner) => this.camera.camera!.worldToScreen(transform.transformPoint(corner)));
    return {
      x:
        (Math.min(...points.map((point) => point.x)) +
          Math.max(...points.map((point) => point.x))) /
        2,
      y: Math.min(...points.map((point) => point.y)),
    };
  }

  /** Only permitted bearings and the listener's own pose enter this projection.
   * docs/hearing-and-speech.md#8-listener-centered-directional-captions */
  private updateSpeech(): void {
    const view = this.view;
    if (!view) return;
    const width = this.canvas.clientWidth,
      height = this.canvas.clientHeight;
    const player = view.player.position;
    const project = (point: pc.Vec3): CaptionPoint | null => {
      if (point.clone().sub(this.camera.getPosition()).dot(this.camera.forward) <= 0) return null;
      const screen = this.camera.camera!.worldToScreen(point);
      return { x: screen.x, y: screen.y };
    };
    // Match main's displayed-pose interpolation; current authoritative movement below
    // still revokes an obsolete bearing before it can track a hidden source.
    const displayed = this.actors.get(view.player.id)?.root.getPosition();
    const origin = displayed
      ? displayed.clone().add(new pc.Vec3(0, 1, 0))
      : new pc.Vec3(player.x, player.y + 1, player.z);
    const center = project(origin);
    const inView =
      center &&
      center.x >= 32 &&
      center.x <= width - 32 &&
      center.y >= 100 &&
      center.y <= height - 32;
    this.speech.update({
      width,
      height,
      head: (id) => {
        const entity = this.actors.get(id);
        if (!entity || !project(entity.root.getPosition())) return null;
        const p = this.statusAnchor(id);
        // Reserve space for native work/status notices; never follow remembered ghosts.
        return p ? { x: p.x, y: p.y - 54 } : null;
      },
      direction: (speech, captionWidth, captionHeight) => {
        if (!inView || !speech.direction || view.hearing.referenceRadius <= 0) return null;
        const heardAt = speech.listenerPosition;
        if (Math.hypot(player.x - heardAt.x, player.y - heardAt.y, player.z - heardAt.z) > 0.5)
          return null;
        const radius = Math.min(3, view.hearing.referenceRadius * 0.3);
        const angle = (speech.direction.sector * Math.PI) / 4;
        for (const scale of [1, 0.75, 0.5, 0.25]) {
          const point = project(
            origin
              .clone()
              .add(
                new pc.Vec3(Math.cos(angle) * radius * scale, 0, Math.sin(angle) * radius * scale),
              ),
          );
          if (!point || !center || Math.hypot(point.x - center.x, point.y - center.y) < 2) continue;
          if (
            point.x - captionWidth / 2 < 8 ||
            point.x + captionWidth / 2 > width - 8 ||
            point.y - captionHeight < 8 ||
            point.y > height - 8
          )
            continue;
          return { ...point, arrow: Math.atan2(point.y - center.y, point.x - center.x) };
        }
        return null;
      },
      neutral: () => ({ x: width / 2, y: height - 90 }),
    });
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    // CSS owns display size. resizeCanvas rewrites it using KEEP_ASPECT and
    // feeds rounded backing-buffer dimensions into this observer repeatedly.
    // Only resize the rendering buffer so viewport changes cannot drift or crop.
    this.app.setCanvasResolution(
      pc.RESOLUTION_FIXED,
      Math.max(1, Math.round(rect.width)),
      Math.max(1, Math.round(rect.height)),
    );
  }
  private texture(source: HTMLCanvasElement): pc.Texture {
    const texture = new pc.Texture(this.app.graphicsDevice, {
      width: source.width,
      height: source.height,
      mipmaps: false,
      minFilter: pc.FILTER_NEAREST,
      magFilter: pc.FILTER_NEAREST,
      addressU: pc.ADDRESS_CLAMP_TO_EDGE,
      addressV: pc.ADDRESS_CLAMP_TO_EDGE,
    });
    texture.setSource(source);
    this.textures.push(texture);
    return texture;
  }
  private material(
    color: string,
    source?: HTMLCanvasElement,
    transparent = false,
    unlit = false,
  ): pc.StandardMaterial {
    const material = new ShadowMaterial(this.sun.light!.light);
    material.diffuse.fromString(color);
    material.useMetalness = false;
    material.shininess = 0;
    if (source) {
      const texture = this.texture(source);
      material.diffuseMap = texture;
      if (transparent) {
        material.opacityMap = texture;
        material.opacityMapChannel = 'a';
        material.alphaTest = 0.08;
        material.blendType = unlit ? pc.BLEND_NORMAL : pc.BLEND_NONE;
        if (!unlit) material.opacityDither = pc.DITHER_BAYER8;
        material.depthWrite = true;
      }
    }
    if (unlit) {
      material.useLighting = false;
      material.emissive.copy(material.diffuse);
      if (source) material.emissiveMap = material.diffuseMap;
      material.diffuse.set(0, 0, 0);
    }
    material.twoSidedLighting = true;
    material.cull = pc.CULLFACE_NONE;
    setVisibilityStencil(material, ordinaryStencil);
    material.update();
    this.materials.push(material);
    return material;
  }
  private primitive(
    name: string,
    type: string,
    material: pc.StandardMaterial,
    parent: pc.Entity,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
  ): pc.Entity {
    const entity = new pc.Entity(name, this.app);
    entity.addComponent('render', {
      type,
      material,
      castShadows: type !== 'plane',
      receiveShadows: true,
    });
    entity.setPosition(x, y, z);
    entity.setLocalScale(sx, sy, sz);
    parent.addChild(entity);
    return entity;
  }
  private billboard(
    name: string,
    material: pc.StandardMaterial,
    parent: pc.Entity,
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    castShadows = false,
    padding?: ReturnType<typeof spritePadding>,
  ): pc.Entity {
    const sprite = this.primitive(name, 'plane', material, parent, x, y, z, width, 1, height);
    const texture = material.diffuseMap;
    if (!padding && texture) {
      let image = this.alphaMasks.get(texture);
      if (!image) {
        const source = texture.getSource();
        if (source instanceof HTMLCanvasElement) {
          image = source.getContext('2d')!.getImageData(0, 0, source.width, source.height);
          this.alphaMasks.set(texture, image);
        }
      }
      padding = spritePadding(image ? [image] : []);
    }
    this.cards.set(sprite, { x, y, z, height, padding: padding ?? spritePadding([]), depth: 0 });
    // Relief depth is normalized to artwork width; facing flips never reverse it.
    sprite.setLocalScale(width, width, height);
    sprite.render!.castShadows = castShadows;
    configureBillboard(material);
    if (material.useLighting) lightSprite(material, this.app.graphicsDevice);
    sprite.render!.meshInstances[0]!.setParameter('ol_spriteSize', [width, height]);
    if (parent === this.landscape) this.landscapeCards.add(sprite);
    if (castShadows) this.setSpriteRelief(sprite, material);
    this.orientCard(sprite);
    return sprite;
  }
  private setSpriteRelief(
    sprite: pc.Entity,
    material: pc.StandardMaterial,
    image?: ImageData,
  ): void {
    const texture = material.diffuseMap;
    if (!texture) return;
    let relief = this.reliefMeshes.get(texture);
    if (!relief) {
      image ??= this.alphaMasks.get(texture);
      if (!image) {
        const source = texture.getSource();
        if (!(source instanceof HTMLCanvasElement)) return;
        image = source.getContext('2d')!.getImageData(0, 0, source.width, source.height);
        this.alphaMasks.set(texture, image);
      }
      relief = createSpriteRelief(this.app.graphicsDevice, image);
      // Retain inactive animation frames until their texture/appearance is released.
      relief.mesh.incRefCount();
      this.reliefMeshes.set(texture, relief);
    }
    const mesh = sprite.render!.meshInstances[0]!;
    if (mesh.mesh === relief.mesh) return;
    mesh.mesh = relief.mesh;
    this.cards.get(sprite)!.depth = relief.depth;
    this.orientCard(sprite);
  }
  private orientCard(sprite: pc.Entity, bob = 0): void {
    const binding = this.cards.get(sprite);
    if (!binding) return;
    // Full camera-facing cards retain their silhouette at every pitch. Body depth is
    // supplied by the shared billboard shader, including alpha-tested shadow casting.
    sprite.setRotation(this.camera.getRotation());
    sprite.rotateLocal(90, 0, 0);
    if (binding.horizontalHeight !== undefined) sprite.rotateLocal(0, 90, 0);
    const height = binding.horizontalHeight ?? binding.height;
    const padding =
      binding.horizontalHeight === undefined
        ? binding.padding.bottom
        : sprite.getLocalScale().x < 0
          ? binding.padding.right
          : binding.padding.left;
    const center = height * (0.5 - padding) + bob;
    const up = this.camera.up;
    sprite.setLocalPosition(
      binding.x + up.x * center,
      binding.y + up.y * center,
      binding.z + up.z * center,
    );
    const foot = sprite
      .parent!.getPosition()
      .clone()
      .add(new pc.Vec3(binding.x, binding.y, binding.z));
    updateBillboardBounds(sprite, foot, this.camera.right, up, binding.depth);
    for (const mi of sprite.render?.meshInstances ?? [])
      mi.setParameter('ol_spriteFoot', [foot.x, foot.y, foot.z]);
  }
  private ring(color: string, name: string): pc.Entity {
    const source = document.createElement('canvas');
    source.width = 64;
    source.height = 64;
    const ctx = source.getContext('2d')!;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([11, 5]);
    ctx.beginPath();
    ctx.arc(32, 32, 25, 0, Math.PI * 2);
    ctx.stroke();
    const entity = new pc.Entity(name, this.app);
    entity.addComponent('render', {
      type: 'plane',
      material: this.material('#ffffff', source, true, true),
      castShadows: false,
    });
    entity.setLocalScale(1.4, 1, 1.4);
    return entity;
  }
  private releaseMaterial(material: pc.StandardMaterial): void {
    this.shadowBatches.releaseMaterial(material);
    this.presentation?.releaseMaterial(material);
    const texture = material.diffuseMap;
    if (texture) {
      const relief = this.reliefMeshes.get(texture);
      if (relief) {
        relief.mesh.decRefCount();
        if (relief.mesh.refCount === 0) relief.mesh.destroy();
        this.reliefMeshes.delete(texture);
      }
      texture.destroy();
      this.textures = this.textures.filter((entry) => entry !== texture);
    }
    material.destroy();
    this.materials = this.materials.filter((entry) => entry !== material);
  }
  private releaseEntity(entry: RenderedEntity): void {
    if (this.hoveredId === entry.view.id) this.clearHover();
    entry.model?.destroy();
    this.cards.delete(entry.sprite);
    this.presentation.removeReveal(entry.reveal);
    entry.root.destroy();
    const asset = this.appearanceAssets.get(entry.assetKey);
    if (asset && --asset.refs === 0) {
      for (const material of asset.materials) this.releaseMaterial(material);
      this.appearanceAssets.delete(entry.assetKey);
    }
  }
  private makeEntity(view: EntityView, game: GameView): RenderedEntity {
    const root = new pc.Entity(view.name, this.app);
    this.app.root.addChild(root);
    root.setPosition(view.position.x, view.position.y, view.position.z);
    const dead = view.kind === 'remains' || view.status === 'Dead';
    const equipped =
      view.id === game.player.id && game.player.inventory.some((item) => item.equipped);
    const deer = view.subtype === 'deer',
      bird = view.subtype === 'bird',
      crate = view.appearance === 'crate-mesh';
    // Identical procedural inputs produce identical artwork, regardless of identity.
    const resourceSeed = view.id.split('').reduce((sum, letter) => sum + letter.charCodeAt(0), 0);
    const key =
      view.kind === 'item-pile'
        ? `pile:${view.contents
            ?.slice(0, 12)
            .map((item) => `${item.definitionId}:${Math.min(3, item.quantity)}`)
            .join('|')}`
        : crate
          ? 'crate-mesh'
          : view.kind === 'actor'
            ? `person:${view.id !== game.player.id}:${equipped}:${dead}`
            : view.kind === 'animal' || view.kind === 'remains'
              ? `animal:${view.subtype}:${dead}`
              : view.kind === 'station'
                ? 'fire'
                : `resource:${JSON.stringify([view.subtype + view.name, resourceSeed])}`;
    let width =
      view.kind === 'item-pile'
        ? 1
        : crate
          ? 1
          : view.kind === 'actor'
            ? 1.05
            : deer
              ? 2.3
              : bird
                ? 1.3
                : view.kind === 'animal' || view.kind === 'remains'
                  ? 1.25
                  : view.kind === 'station'
                    ? 1.5
                    : 1.9;
    let height =
      view.kind === 'item-pile'
        ? 0.55
        : crate
          ? 0.8
          : view.kind === 'actor'
            ? 2.1
            : deer
              ? 1.9
              : bird
                ? 1
                : view.kind === 'animal' || view.kind === 'remains'
                  ? 1.05
                  : view.kind === 'station'
                    ? 1.65
                    : 1.6;
    let asset = this.appearanceAssets.get(key);
    if (!asset) {
      const images =
        view.kind === 'item-pile'
          ? [itemPileArt(view.contents ?? [])]
          : crate
            ? []
            : view.kind === 'actor'
              ? [0, 1, 2, 3, 4, 5].map((frame) =>
                  personArt(view.id !== game.player.id, frame, equipped),
                )
              : view.kind === 'animal' || view.kind === 'remains'
                ? [0, 1, 2].map((frame) =>
                    bird
                      ? birdArt(frame, dead)
                      : animalArt(deer, frame === 1 ? 2 : frame === 2 ? -2 : 0, dead),
                  )
                : view.kind === 'station'
                  ? [0, 1, 2].map(fireArt)
                  : [resourceArt(view.subtype + view.name, resourceSeed)];
      const materials = crate
        ? [this.material('#a17a4d'), this.material('#564631')]
        : images.map((source) => {
            const m = this.material('#ffffff', source, true, view.kind === 'station');
            configureBillboard(m);
            if (m.useLighting) lightSprite(m, this.app.graphicsDevice);
            return m;
          });
      // Read alpha once while creating an asset, not a Canvas readback on each hover frame.
      if (view.kind === 'actor' || view.kind === 'animal')
        for (const material of materials) setVisibilityStencil(material, personStencil);
      const pixels = images.map((image) =>
        image.getContext('2d')!.getImageData(0, 0, image.width, image.height),
      );
      asset = {
        images: pixels,
        materials,
        padding: spritePadding(pixels),
        refs: 0,
      };
      this.appearanceAssets.set(key, asset);
    }
    asset.refs++;
    let sprite: pc.Entity;
    if (crate) {
      sprite = this.primitive(
        view.name,
        'box',
        asset.materials[0]!,
        root,
        0,
        height / 2,
        0,
        width,
        height,
        0.8,
      );
      for (const x of [-0.43, 0.43])
        this.primitive(
          'Crate band',
          'box',
          asset.materials[1]!,
          root,
          x,
          height / 2,
          0,
          0.08,
          height + 0.035,
          0.84,
        );
      this.primitive(
        'Crate lid band',
        'box',
        asset.materials[1]!,
        root,
        0,
        height + 0.015,
        0,
        width,
        0.035,
        0.08,
      );
    } else
      sprite = this.billboard(
        view.name,
        asset.materials[0]!,
        root,
        0,
        0,
        0,
        width,
        height,
        view.kind !== 'station',
        asset.padding,
      );
    return {
      model: view.appearance === 'mercenary-model' ? this.mercenary?.create(root) : undefined,
      root,
      sprite,
      meshCasters: (root.findComponents('render') as pc.RenderComponent[])
        .flatMap((render) => render.meshInstances)
        .filter((mesh) => mesh.castShadow),
      reveal: this.presentation.addReveal(
        sprite,
        asset.materials[0]!,
        !crate,
        view.kind === 'actor' || view.kind === 'animal',
      ),
      renderedSupport: view.supportSurfaceId,
      view,
      materials: asset.materials,
      images: asset.images,
      assetKey: key,
      card: !crate,
      lastFrame: -1,
      facing: 1,
      scaleFacing: 1,
      width,
      height,
      observed: true,
    };
  }
  private buildLandscape(map: GameView['map']): void {
    this.landscape.destroy();
    for (const buffer of this.landscapeBuffers) buffer.destroy();
    this.landscapeBuffers = [];
    for (const card of this.landscapeCards) this.cards.delete(card);
    this.landscapeCards.clear();
    for (const material of this.landscapeMaterials) this.releaseMaterial(material);
    this.landscapeMaterials = [];
    for (const mesh of this.geometryMeshes) mesh.destroy();
    this.geometryMeshes = [];
    this.geometryNodes.clear();
    const materialStart = this.materials.length;
    this.landscape = new pc.Entity('Landscape', this.app);
    this.app.root.addChild(this.landscape);
    this.animations = [];
    const rng = random(map.seed);
    const tileSize = 32;
    const source = document.createElement('canvas');
    source.width = map.width * tileSize;
    source.height = map.height * tileSize;
    const ctx = source.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const grass = groundArt(map.seed);
    const sand = earthArt(map.seed);
    for (let z = 0; z < map.height; z++)
      for (let x = 0; x < map.width; x++) {
        const terrain = map.tiles[z]?.[x] ?? 'grass';
        const px = x * tileSize,
          py = (map.height - 1 - z) * tileSize;
        if (terrain === 'water') {
          ctx.fillStyle = '#46736b';
          ctx.fillRect(px, py, tileSize, tileSize);
          for (let i = 0; i < 65; i++) {
            ctx.fillStyle = ['#416b63', '#4f7d70', '#587e6e', '#739785'][Math.floor(rng() * 4)]!;
            ctx.fillRect(px + rng() * tileSize, py + rng() * tileSize, 3 + rng() * 8, 1);
          }
        } else {
          const texture = terrain === 'sand' ? sand : grass;
          ctx.drawImage(
            texture,
            Math.floor(rng() * (texture.width - tileSize)),
            Math.floor(rng() * (texture.height - tileSize)),
            tileSize,
            tileSize,
            px,
            py,
            tileSize,
            tileSize,
          );
          // Irregular shoreline lip stays inside the authoritative walkable bank tile.
          if (map.tiles[z]?.[x - 1] === 'water') {
            for (let p = 0; p < tileSize; p += 2) {
              ctx.fillStyle = '#c2b78b';
              ctx.fillRect(px, py + p, 2 + rng() * 5, 2);
              ctx.fillStyle = '#6d7960';
              ctx.fillRect(px, py + p, 1, 2);
            }
          }
        }
      }
    const ground = this.material('#ffffff', source);
    this.primitive(
      'Living ground',
      'plane',
      ground,
      this.landscape,
      (map.width - 1) / 2,
      0,
      (map.height - 1) / 2,
      map.width,
      1,
      map.height,
    );
    const earth = this.material('#596448', groundArt(map.seed + 1));
    this.primitive(
      'Forest floor beyond the clearing',
      'plane',
      earth,
      this.landscape,
      map.width / 2,
      -0.06,
      map.height / 2,
      map.width + 26,
      1,
      map.height + 24,
    );
    const stone = this.material('#7b8178'),
      timber = this.material('#715438');
    setVisibilityStencil(stone, sceneryStencil);
    setVisibilityStencil(timber, sceneryStencil);
    for (const blocker of spatialBlockers(map)) {
      const a = blocker.bounds.min,
        b = blocker.bounds.max;
      const node = this.primitive(
        blocker.id,
        'box',
        blocker.material === 'stone' ? stone : timber,
        this.landscape,
        (a.x + b.x) / 2,
        (a.y + b.y) / 2,
        (a.z + b.z) / 2,
        b.x - a.x,
        b.y - a.y,
        b.z - a.z,
      );
      this.geometryNodes.set(blocker.id, node);
    }
    const deckMaterial = this.material('#b48b57'),
      rampMaterial = this.material('#8b8e7a');
    setVisibilityStencil(deckMaterial, sceneryStencil);
    setVisibilityStencil(rampMaterial, sceneryStencil);
    for (const surface of map.spatial.surfaces) {
      if (surface.material === 'ground') continue;
      const mesh = surfaceMesh(this.app.graphicsDevice, surface);
      this.geometryMeshes.push(mesh);
      const node = new pc.Entity(surface.name, this.app);
      node.addComponent('render', {
        meshInstances: [
          new pc.MeshInstance(mesh, surface.material === 'timber' ? deckMaterial : rampMaterial),
        ],
        castShadows: true,
        receiveShadows: true,
      });
      this.landscape.addChild(node);
      this.geometryNodes.set(surface.id, node);
      if (surface.material === 'timber') {
        const seams = surfaceSeamsMesh(this.app.graphicsDevice, surface);
        this.geometryMeshes.push(seams);
        const detail = new pc.Entity('Deck plank seams', this.app);
        detail.addComponent('render', {
          meshInstances: [new pc.MeshInstance(seams, timber)],
          castShadows: false,
          receiveShadows: true,
        });
        node.addChild(detail);
      }
    }
    // Large woodland silhouettes remain outside the playable map; they imply no hidden collision.
    const trees = [0, 1, 2, 3].map((i) =>
      this.material('#ffffff', treeArt(map.seed + i * 19), true),
    );
    for (const material of trees) setVisibilityStencil(material, sceneryStencil);
    for (let i = 0; i < 34; i++) {
      const edge = i % 3;
      let x: number, z: number;
      if (edge === 0) {
        x = 3 + rng() * map.width;
        z = -2 - rng() * 5;
      } else if (edge === 1) {
        x = map.width + 1 + rng() * 5;
        z = rng() * (map.height + 4);
      } else {
        x = 5 + rng() * map.width;
        z = map.height + 2 + rng() * 5;
      }
      const h = 5.7 + rng() * 3;
      this.billboard(
        'Woodland canopy',
        trees[i % trees.length]!,
        this.landscape,
        x,
        0,
        z,
        h * 0.83,
        h,
        true,
      );
    }
    // Ground-height texture detail is decorative and does not obstruct movement.
    const grassImage = resourceArt('grass', map.seed);
    const tuft = this.material('#ffffff', grassImage, true);
    const grassTransforms: number[] = [];
    for (let i = 0; i < 210; i++) {
      const x = rng() * (map.width - 1),
        z = rng() * (map.height - 1);
      if (map.tiles[Math.round(z)]?.[Math.round(x)] !== 'grass') continue;
      const h = 0.16 + rng() * 0.28;
      const width = h * 1.5;
      grassTransforms.push(width, 0, 0, 0, 0, width, 0, 0, 0, 0, h, 0, x, 0, z, 1);
    }
    if (grassTransforms.length) {
      const padding = spritePadding([
        grassImage.getContext('2d')!.getImageData(0, 0, grassImage.width, grassImage.height),
      ]);
      const batch = instanceBillboards(
        this.app.graphicsDevice,
        tuft,
        new Float32Array(grassTransforms),
        padding.bottom,
      );
      lightSprite(tuft, this.app.graphicsDevice);
      this.landscapeBuffers.push(batch.buffer);
      const node = new pc.Entity('Meadow grass', this.app);
      node.addComponent('render', { meshInstances: [batch.instance], castShadows: false });
      this.landscape.addChild(node);
    }
    const waterCanvas = document.createElement('canvas');
    waterCanvas.width = 32;
    waterCanvas.height = 8;
    const wctx = waterCanvas.getContext('2d')!;
    wctx.fillStyle = '#a9bd9a';
    wctx.fillRect(2, 3, 22, 1);
    wctx.fillStyle = '#729a86';
    wctx.fillRect(8, 6, 22, 1);
    const waterShine = this.material('#ffffff', waterCanvas, true, true);
    for (let i = 0; i < 36; i++) {
      const x = rng() * map.width,
        z = rng() * map.height;
      if (map.tiles[Math.round(z)]?.[Math.round(x)] !== 'water') continue;
      const entity = this.primitive(
        'Stream glint',
        'plane',
        waterShine,
        this.landscape,
        x,
        0.012,
        z,
        0.3 + rng() * 0.5,
        1,
        0.15,
      );
      this.animations.push({ y: 0, entity, x, z, phase: rng() * Math.PI * 2 });
    }
    this.landscapeMaterials = this.materials.slice(materialStart);
  }
  private placeCamera(): void {
    const pose = cameraPose(this.cameraSettings);
    this.camera.setPosition(pose.position.x, pose.position.y, pose.position.z);
    this.camera.lookAt(pose.target.x, pose.target.y, pose.target.z);
    const right = this.camera.right,
      up = this.camera.up;
    this.app.graphicsDevice.scope.resolve('ol_cameraRight').setValue([right.x, right.y, right.z]);
    this.app.graphicsDevice.scope.resolve('ol_cameraUp').setValue([up.x, up.y, up.z]);
    this.camera.camera!.projection =
      this.cameraSettings.projection === 'orthographic'
        ? pc.PROJECTION_ORTHOGRAPHIC
        : pc.PROJECTION_PERSPECTIVE;
    this.camera.camera!.orthoHeight = this.cameraSettings.zoom;
    if (
      this.orientedYaw !== this.cameraSettings.yaw ||
      this.orientedPitch !== this.cameraSettings.pitch
    ) {
      this.orientedYaw = this.cameraSettings.yaw;
      this.orientedPitch = this.cameraSettings.pitch;
      for (const card of this.cards.keys()) this.orientCard(card);
    }
  }
  private update(dt: number): void {
    this.elapsed += Math.min(dt, 0.1);
    for (const [id, entry] of this.actors) {
      if (entry.departedAt !== undefined) {
        const opacity = Math.max(0, 1 - (this.elapsed - entry.departedAt) / 0.4);
        if (opacity === 0) {
          this.releaseEntity(entry);
          this.actors.delete(id);
          continue;
        }
        for (const mesh of entry.sprite.render?.meshInstances ?? [])
          mesh.setParameter('material_opacity', opacity);
      }
      if (!entry.observed) {
        this.presentation.updateReveal(
          entry.reveal,
          entry.materials[Math.max(0, entry.lastFrame) % entry.materials.length]!,
          entry.root.getPosition(),
          entry.width,
          entry.height,
          0,
          dt,
          false,
          false,
        );
        continue;
      }
      const position = entry.root.getPosition().clone();
      const dx = entry.view.position.x - position.x;
      const dy = entry.view.position.y - position.y;
      const dz = entry.view.position.z - position.z;
      const moving = Math.abs(dx) + Math.abs(dy) + Math.abs(dz) > 0.025;
      const screenMotion = dx * this.camera.right.x + dz * this.camera.right.z;
      if (Math.abs(screenMotion) > 0.012) entry.facing = screenMotion < 0 ? -1 : 1;
      if (
        this.view &&
        (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) > 1e-6 ||
          entry.renderedSupport !== entry.view.supportSurfaceId)
      ) {
        const pose = interpolateVisualFoot(
          this.view.map,
          position,
          entry.view.position,
          entry.renderedSupport,
          entry.view.supportSurfaceId,
          1 - Math.exp(-Math.min(dt, 0.1) * 13),
        );
        position.set(pose.point.x, pose.point.y, pose.point.z);
        entry.renderedSupport = pose.support;
      }
      const positionChanged = position.distance(entry.root.getPosition()) > 1e-6;
      if (positionChanged) entry.root.setPosition(position);
      this.updateModelVisibility(entry);
      entry.model?.update(
        entry.view,
        dt,
        moving,
        !!this.view?.clock.paused || !!this.view?.clock.preparingNavigation,
        this.revealStrength(entry),
        this.selected === entry.view.id && this.identifiable(entry),
      );
      if (entry.model) entry.sprite.enabled = !entry.model.visible;
      const punch = entry.view.actionAnimation;
      let punchFrame = 0;
      if (
        (punch?.kind === 'punch' || punch?.kind === 'melee') &&
        entry.view.kind === 'actor' &&
        !entry.view.statusEffects?.some((effect) => effect.pose === 'horizontal')
      ) {
        const direction =
          punch.direction.x * this.camera.right.x + punch.direction.z * this.camera.right.z;
        if (Math.abs(direction) > 0.01) entry.facing = direction < 0 ? -1 : 1;
        punchFrame =
          punch.phase === 'recovery'
            ? punch.progress < 0.4
              ? 5
              : punch.progress < 0.8
                ? 4
                : 3
            : punch.progress < 0.4
              ? 3
              : punch.progress < 0.8
                ? 4
                : 5;
        entry.punchRecovery = 0.18;
      } else if (entry.punchRecovery) {
        // A short visual recovery ends at idle even when no further snapshots arrive.
        // docs/targeted-actions.md#presentation
        if (!this.view?.clock.paused) entry.punchRecovery = Math.max(0, entry.punchRecovery - dt);
        punchFrame = entry.punchRecovery > 0.12 ? 4 : entry.punchRecovery > 0.06 ? 3 : 0;
      }
      const animated =
        entry.card &&
        !entry.view.statusEffects?.some((effect) => effect.pose === 'horizontal') &&
        (entry.view.kind === 'station' || moving);
      const frame =
        punchFrame ||
        (animated && !this.view?.clock.paused && !this.view?.clock.preparingNavigation
          ? 1 + (Math.floor(this.elapsed * (entry.view.kind === 'station' ? 4 : 6)) % 2)
          : 0);
      if (frame !== entry.lastFrame) {
        const material = entry.materials[frame % entry.materials.length]!;
        entry.sprite.render!.material = material;
        if (entry.card && entry.view.kind !== 'station')
          this.setSpriteRelief(entry.sprite, material, entry.images[frame % entry.images.length]);
        entry.lastFrame = frame;
      }
      if (entry.card) {
        if (entry.facing !== entry.scaleFacing) {
          entry.sprite.setLocalScale(entry.width * entry.facing, entry.width, entry.height);
          entry.scaleFacing = entry.facing;
          this.orientCard(entry.sprite);
        }
        if (moving || entry.lastMoving)
          this.orientCard(
            entry.sprite,
            entry.view.kind === 'actor' &&
              !entry.view.statusEffects?.some((effect) => effect.pose === 'horizontal') &&
              moving
              ? Math.sin(this.elapsed * 12) * 0.015
              : 0,
          );
        entry.lastMoving = moving;
        if (positionChanged) {
          const p = entry.root.getPosition();
          for (const mi of entry.sprite.render!.meshInstances)
            mi.setParameter('ol_spriteFoot', [p.x, p.y, p.z]);
        }
      }
      this.presentation.updateReveal(
        entry.reveal,
        entry.materials[Math.max(0, entry.lastFrame) % entry.materials.length]!,
        position,
        this.cards.get(entry.sprite)?.horizontalHeight === undefined ? entry.width : entry.height,
        this.cards.get(entry.sprite)?.horizontalHeight ?? entry.height,
        this.revealStrength(entry),
        dt,
        entry.observed && entry.root.enabled && !entry.model?.visible,
        this.selected === entry.view.id && this.identifiable(entry),
      );
    }
    const selected = this.selected ? this.actors.get(this.selected) : undefined;
    if (this.selected && (!selected || !this.identifiable(selected))) {
      this.selected = null;
      this.callbacks.select(null);
    }
    this.marker.enabled = !!selected && this.identifiable(selected);
    if (selected && this.identifiable(selected)) {
      const p = selected.root.getPosition();
      this.marker.setPosition(p.x, p.y + 0.035, p.z);
      const scale = Math.max(1.1, selected.view.radius * 2.6);
      this.marker.setLocalScale(scale, 1, scale);
      this.marker.setEulerAngles(0, this.elapsed * 8, 0);
    }
    this.destination.enabled = this.elapsed < this.markerUntil;
    const player = this.view && this.actors.get(this.view.player.id);
    if (player && this.view) {
      const position = player.root.getPosition();
      // Follow the interpolated sprite, not network snapshots; docs/spatial-world.md#picking-and-controls.
      if (this.cameraSettings.following) {
        const focus = this.cameraSettings.focus;
        if (focus.x !== position.x || focus.y !== position.y || focus.z !== position.z) {
          this.cameraSettings = updateCamera(this.cameraSettings, {
            type: 'focus',
            point: position,
          });
          this.placeCamera();
        }
      }
      const projection = this.camera.camera!;
      const center = projection.worldToScreen(position);
      // Project a 3D-radius presentation mask along camera axes, not fixed world X/Z.
      const xEdge = projection.worldToScreen(
        position.clone().add(this.camera.right.clone().mulScalar(this.view.vision.radius)),
      );
      const yEdge = projection.worldToScreen(
        position.clone().add(this.camera.up.clone().mulScalar(this.view.vision.radius)),
      );
      this.visionBlur.update(
        center.x,
        center.y,
        Math.abs(xEdge.x - center.x),
        Math.abs(yEdge.y - center.y),
      );
    }
    this.statuses.update((id) => this.statusAnchor(id));
    this.statusIndicators.update((id) => {
      const entry = this.actors.get(id);
      if (!entry || !this.identifiable(entry)) return null;
      // Top of the original sprite remains its head after the horizontal rotation.
      const head = entry.model?.visible
        ? entry.root
            .getPosition()
            .clone()
            .add(new pc.Vec3(0, entry.model.height * 0.92, 0))
        : entry.sprite.getWorldTransform().transformPoint(new pc.Vec3(0, 0, -0.4));
      const point = this.camera.camera!.worldToScreen(head);
      return { x: point.x, y: point.y };
    }, !!this.view?.clock.paused);
    this.updateSpeech();
    this.shadowBatches.sync(this.cards.keys());
    // Reevaluate stationary pointers as actors move or the camera changes.
    if (this.hoverPoint && !this.drag && this.elapsed >= this.nextHoverAt) {
      this.nextHoverAt = this.elapsed + 0.05;
      const rect = this.canvas.getBoundingClientRect();
      this.publishHover(
        this.hoverEntity(this.hoverPoint.x - rect.left, this.hoverPoint.y - rect.top),
        this.hoverPoint,
      );
    }
    const hovered = this.hoveredId ? this.actors.get(this.hoveredId) : undefined;
    const hoverValid = !!hovered && this.identifiable(hovered) && !this.drag && !!this.hoverPoint;
    const age = (performance.now() - this.hoverStarted) / 1000;
    const fade =
      !hoverValid || age <= 1
        ? 0
        : document.documentElement.dataset.reduceMotion === 'true'
          ? 1
          : Math.min(1, (age - 1) / 0.25);
    this.outline.update(
      fade > 0 && hovered
        ? hovered.model?.visible
          ? hovered.model.outlineMeshes
          : hovered.sprite.render!.meshInstances
        : NO_OUTLINE_MESHES,
      fade,
      !!hovered && this.selected !== hovered.view.id,
    );
    for (const wave of this.animations)
      if (!this.view?.clock.paused)
        wave.entity.setPosition(
          wave.x + Math.sin(this.elapsed * 0.7 + wave.phase) * 0.12,
          0.012,
          wave.z,
        );
  }
  private revealStrength(entry: RenderedEntity): number {
    const view = this.view;
    if (!view || !entry.observed || !entry.root.enabled) return 0;
    const prefs = view.profile.preferences,
      mode = prefs.revealMode ?? 'nearby';
    if (mode === 'off') return 0;
    if (entry.view.id === view.player.id) return prefs.revealStrength ?? 0.7;
    if (mode !== 'nearby') return 0;
    const player = this.actors.get(view.player.id);
    if (!player) return 0;
    const d = entry.root.getPosition().distance(player.root.getPosition()),
      radius = prefs.revealRadius ?? 6;
    return (
      (prefs.revealStrength ?? 0.7) *
      Math.max(0, Math.min(1, (radius - d) / Math.min(1.5, radius * 0.3)))
    );
  }
  private updateModelVisibility(entry: RenderedEntity): void {
    if (!entry.model) return;
    const supported =
      entry.observed &&
      entry.root.enabled &&
      entry.view.status !== 'Dead' &&
      !entry.view.statusEffects?.some((effect) => effect.pose === 'horizontal') &&
      !entry.view.actionAnimation;
    entry.model.setVisible(supported);
    entry.sprite.enabled = !entry.model.visible;
  }
  private identifiable(entry: RenderedEntity): boolean {
    const player = this.view && this.actors.get(this.view.player.id);
    if (!entry.observed || !entry.root.enabled || !player || !this.view) return false;
    // Fully obscured pixels must not reveal an identity through picking. This
    // presentation restriction only narrows the server's permitted observation.
    return (
      entry.root.getPosition().distance(player.root.getPosition()) <
      this.view.vision.radius * VISION_FOCUS.obscuredFraction
    );
  }
  private publishHover(entity: EntityView | null, point: { x: number; y: number }): void {
    const id = entity?.id ?? null;
    if (id !== this.hoveredId) {
      this.hoveredId = id;
      this.hoverStarted = performance.now();
    }
    this.perception.hideHint();
    if (!entity && this.hoverPoint && !this.drag)
      this.perception.hover(
        point,
        (position) => {
          const worldPoint = new pc.Vec3(position.x, position.y, position.z);
          const depth = worldPoint.clone().sub(this.camera.getPosition()).dot(this.camera.forward);
          const camera = this.camera.camera!;
          // worldToScreen retains clip-space Z; it is negative for many visible
          // orthographic points. Test physical camera depth instead.
          return depth >= camera.nearClip && depth <= camera.farClip
            ? camera.worldToScreen(worldPoint)
            : null;
        },
        (position) => {
          const rect = this.canvas.getBoundingClientRect();
          const ray = this.screenRay(point.x - rect.left, point.y - rect.top);
          return (
            cameraDepthFraction(
              new pc.Vec3(position.x, position.y, position.z),
              ray.from,
              ray.to,
              this.camera.forward,
            ) <=
            this.cameraObstruction(ray) + 1e-5
          );
        },
      );
    // Stationary hover must not rerender React at the GPU frame rate.
    if (
      this.lastHover?.entity === entity &&
      this.lastHover.x === point.x &&
      this.lastHover.y === point.y
    )
      return;
    this.lastHover = { entity, ...point };
    this.callbacks.hover(entity, point);
  }
  private clearHover = (): void => {
    this.hoverPoint = null;
    this.publishHover(null, { x: 0, y: 0 });
    this.outline?.update([], 0, true);
  };
  private screenRay(x: number, y: number): { from: pc.Vec3; to: pc.Vec3 } {
    const camera = this.camera.camera!;
    return {
      from: camera.screenToWorld(x, y, camera.nearClip),
      to: camera.screenToWorld(x, y, camera.farClip),
    };
  }
  private cardHit(
    card: pc.Entity,
    image: ImageData,
    ray: { from: pc.Vec3; to: pc.Vec3 },
  ): { fraction: number; point: pc.Vec3 } | null {
    const inverse = card.getWorldTransform().clone().invert();
    const from = inverse.transformPoint(ray.from),
      to = inverse.transformPoint(ray.to);
    const dy = to.y - from.y;
    if (Math.abs(dy) < 1e-7) return null;
    const t = -from.y / dy,
      u = from.x + (to.x - from.x) * t + 0.5,
      v = from.z + (to.z - from.z) * t + 0.5;
    if (t < 0 || t > 1 || u < 0 || u >= 1 || v < 0 || v >= 1) return null;
    if (
      image.data[
        (Math.floor(v * image.height) * image.width + Math.floor(u * image.width)) * 4 + 3
      ]! < 24
    )
      return null;
    const binding = this.cards.get(card)!;
    const foot = card
      .parent!.getPosition()
      .clone()
      .add(new pc.Vec3(binding.x, binding.y, binding.z));
    const point = billboardBodyPoint(
      new pc.Vec3().lerp(ray.from, ray.to, t),
      foot,
      this.camera.right,
      this.camera.up,
    );
    const fraction = cameraDepthFraction(point, ray.from, ray.to, this.camera.forward);
    // The displayed card can intersect a ray while its upright body is clipped.
    // Match rendered depth before either target selection or canopy obstruction.
    return fraction >= 0 && fraction <= 1 ? { point, fraction } : null;
  }
  private readonly alphaMasks = new WeakMap<pc.Texture, ImageData>();
  private cameraObstruction(ray: { from: pc.Vec3; to: pc.Vec3 }): number {
    if (!this.view) return 0;
    let obstruction =
      rayHits(this.view.map, ray.from, ray.to, 'sight', this.cutaways)[0]?.fraction ?? Infinity;
    // Decorative canopies obstruct the camera but never grant or remove bodily perception.
    for (const card of this.landscapeCards) {
      if (!card.enabled || this.cards.get(card)!.height < 2) continue;
      const texture = (card.render!.material as pc.StandardMaterial).diffuseMap;
      if (!texture) continue;
      let image = this.alphaMasks.get(texture);
      if (!image) {
        const source: unknown = texture.getSource();
        if (!(source instanceof HTMLCanvasElement)) continue;
        image = source.getContext('2d')!.getImageData(0, 0, source.width, source.height);
        this.alphaMasks.set(texture, image);
      }
      const hit = this.cardHit(card, image, ray);
      if (hit) obstruction = Math.min(obstruction, hit.fraction);
    }
    return obstruction;
  }
  private hoverEntity(x: number, y: number): EntityView | null {
    const entry = this.pick(x, y);
    return entry && this.identifiable(entry) ? entry.view : null;
  }
  private denySelection(): void {
    this.callbacks.selectionDenied(`${this.view?.player.name ?? 'Your character'} can't see this.`);
  }
  private pick(x: number, y: number): RenderedEntity | null {
    if (!this.view) return null;
    const ray = this.screenRay(x, y);
    const obstruction = this.cameraObstruction(ray);
    let best: RenderedEntity | null = null,
      revealed: RenderedEntity | null = null,
      revealedCharacter: RenderedEntity | null = null,
      nearestCharacter = Infinity,
      nearest = obstruction + 1e-5,
      nearestReveal = Infinity;
    for (const entry of this.actors.values()) {
      if (!entry.root.enabled) continue;
      let fraction: number | null = null,
        bodyPoint: pc.Vec3 | undefined;
      if (entry.model?.visible) {
        fraction = entry.model.hit(ray.from, ray.to);
      } else if (!entry.card) {
        const p = entry.root.getPosition();
        fraction = intersectBox(ray.from, ray.to, {
          min: { x: p.x - entry.width / 2, y: p.y, z: p.z - 0.4 },
          max: { x: p.x + entry.width / 2, y: p.y + entry.height, z: p.z + 0.4 },
        });
      } else {
        const image = entry.images[Math.max(0, entry.lastFrame) % entry.images.length]!;
        const hit = this.cardHit(entry.sprite, image, ray);
        fraction = hit?.fraction ?? null;
        bodyPoint = hit?.point;
      }
      if (fraction === null) continue;
      if (entry.view.id === this.selected && this.identifiable(entry)) return entry;
      if (fraction <= obstruction + 1e-5 && fraction < nearest) {
        nearest = fraction;
        best = entry;
      } else if (
        fraction > obstruction + 1e-5 &&
        this.identifiable(entry) &&
        (entry.model?.visible ? entry.model.revealStrength : entry.reveal.strength) > 0.05 &&
        this.revealStrength(entry) > 0.05 &&
        (fraction < nearestReveal ||
          ((entry.view.kind === 'actor' || entry.view.kind === 'animal') &&
            fraction < nearestCharacter))
      ) {
        const hit = bodyPoint ?? ray.from.clone().lerp(ray.from, ray.to, fraction),
          foot = entry.root.getPosition();
        const height = entry.model?.visible ? entry.model.height : entry.height;
        const q = Math.hypot(
          (hit.x - foot.x) / Math.max(entry.width * 0.7, 0.1),
          (hit.y - foot.y - height / 2) / Math.max(height * 0.65, 0.1),
          (hit.z - foot.z) / Math.max(entry.width * 0.7, 0.1),
        );
        // Match the shader's feather, not the whole bounding rectangle of a hidden sprite.
        const t = Math.max(0, Math.min(1, (q - 0.65) / 0.7));
        const strength = entry.model?.visible ? entry.model.revealStrength : entry.reveal.strength;
        if ((1 - t * t * (3 - 2 * t)) * strength > 0.05) {
          if (fraction < nearestReveal) {
            nearestReveal = fraction;
            revealed = entry;
          }
          if (
            (entry.view.kind === 'actor' || entry.view.kind === 'animal') &&
            fraction < nearestCharacter
          ) {
            nearestCharacter = fraction;
            revealedCharacter = entry;
          }
        }
      }
    }
    return best ?? revealedCharacter ?? revealed;
  }
  private groundPoint(x: number, y: number): SurfacePoint | null {
    if (!this.view) return null;
    const ray = this.screenRay(x, y);
    const obstruction =
      rayHits(this.view.map, ray.from, ray.to, 'sight', this.cutaways)[0]?.fraction ?? Infinity;
    const hit = pickSurfaces(this.view.map, ray.from, ray.to, this.cameraSettings.levelId)[0];
    return hit && hit.fraction <= obstruction + 1e-4 ? hit.point : null;
  }
  private local(event: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  private pointerDown = (event: PointerEvent): void => {
    if (event.button > 2 || this.drag) return;
    this.canvas.focus({ preventScroll: true });
    this.pointerContextHandled = false;
    // macOS Control-click is a context gesture even when reported as primary.
    if (event.button === 0 && event.ctrlKey) return;
    this.drag = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      button: event.button,
      // Primary drag follows the design system; secondary/middle retain camera access.
      pan: true,
      orbit: event.button === 2 || event.shiftKey,
      moved: false,
    };
    this.canvas.setPointerCapture(event.pointerId);
    this.publishHover(null, { x: event.clientX, y: event.clientY });
  };
  private pointerMove = (event: PointerEvent): void => {
    this.hoverPoint = { x: event.clientX, y: event.clientY };
    const drag = this.drag;
    if (drag) {
      if (event.pointerId !== drag.pointerId) return;
      const heldButton = drag.button === 1 ? 4 : drag.button === 2 ? 2 : 1;
      if (!(event.buttons & heldButton)) {
        this.cancelDrag();
        return;
      }
      const dx = event.clientX - drag.x,
        dy = event.clientY - drag.y;
      // Accumulate small movements from the press before choosing a drag. Once
      // panning, track incremental motion even if the pointer returns to its start.
      if (!drag.moved && Math.hypot(dx, dy) <= 5) return;
      drag.moved = true;
      if (!drag.pan) return;
      this.cameraCommand(
        drag.orbit
          ? { type: 'orbit', yaw: -dx * 0.007, pitch: dy * 0.006 }
          : { type: 'pan', dx, dy, viewportHeight: this.canvas.clientHeight },
      );
      drag.x = event.clientX;
      drag.y = event.clientY;
      this.canvas.style.cursor = 'grabbing';
      this.publishHover(null, { x: event.clientX, y: event.clientY });
    }
    // Hover is sampled by update() at 20 Hz; clicks still resolve immediately.
  };
  private pointerUp = (event: PointerEvent): void => {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    this.cancelDrag();
    if (drag.moved || event.button !== drag.button) return;
    if (drag.button === 2) {
      this.openContextMenu(event);
      return;
    }
    if (drag.button !== 0 || event.ctrlKey) return;
    const local = this.local(event);
    const entry = this.pick(local.x, local.y);
    if (entry && !this.identifiable(entry)) {
      this.denySelection();
      return;
    }
    if (entry) this.callbacks.select(entry.view);
    else {
      const position = this.groundPoint(local.x, local.y);
      if (position) {
        this.destination.setPosition(position.x, position.y + 0.035, position.z);
        this.markerUntil = this.elapsed + 1.7;
        this.callbacks.move(position);
      }
      this.callbacks.select(null);
    }
  };
  private wheel = (event: WheelEvent): void => {
    event.preventDefault();
    if (event.shiftKey) this.cameraCommand({ type: 'orbit', yaw: 0, pitch: event.deltaY * 0.001 });
    else this.setZoom(event.deltaY * 0.008);
  };
  private cameraKey = (event: KeyboardEvent): void => {
    const delta = Math.PI / 8;
    if (event.key === 'Home') this.center();
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
      this.cameraCommand({
        type: 'orbit',
        yaw: event.key === 'ArrowLeft' ? -delta : delta,
        pitch: 0,
      });
    else if (event.key === 'ArrowUp' || event.key === 'ArrowDown')
      this.cameraCommand({ type: 'orbit', yaw: 0, pitch: event.key === 'ArrowUp' ? 0.12 : -0.12 });
    else if (event.key === 'PageUp' || event.key === 'PageDown') {
      const levels = this.view?.map.spatial.levels ?? [];
      const choices = [null, ...levels.map((level) => level.id)];
      const index = choices.indexOf(this.cameraSettings.levelId);
      const id =
        choices[(index + (event.key === 'PageUp' ? 1 : choices.length - 1)) % choices.length] ??
        null;
      this.cameraCommand({
        type: 'level',
        id,
        y: levels.find((level) => level.id === id)?.focusY ?? this.view?.player.position.y ?? 0,
      });
    } else if (event.key.toLowerCase() === 'p') this.cameraCommand({ type: 'projection' });
    else return;
    event.preventDefault();
    event.stopPropagation();
  };
  private cancelDrag(): void {
    const drag = this.drag;
    this.drag = null;
    this.canvas.style.cursor = '';
    if (!drag) return;
    if (drag.button === 2) this.pointerContextHandled = true;
    this.saveCameraPreferences();
    if (this.canvas.hasPointerCapture(drag.pointerId))
      this.canvas.releasePointerCapture(drag.pointerId);
  }
  private pointerCancel = (event: PointerEvent): void => {
    if (event.pointerId === this.drag?.pointerId) {
      this.clearHover();
      this.cancelDrag();
    }
  };
  private contextMenu = (event: MouseEvent): void => {
    event.preventDefault();
    const keyboard = event.clientX === 0 && event.clientY === 0;
    if (!keyboard && (this.drag?.button === 2 || this.pointerContextHandled)) return;
    // Keep keyboard and macOS Control-click/native gestures that arrive without
    // a secondary pointer sequence. Actual right presses wait for pointerup.
    this.cancelDrag();
    this.openContextMenu(event);
  };
  private openContextMenu(event: MouseEvent): void {
    const local = this.local(event);
    const keyboard =
      !Number.isFinite(event.clientX) ||
      !Number.isFinite(event.clientY) ||
      (event.clientX === 0 && event.clientY === 0);
    const entity =
      keyboard && this.selected
        ? this.screenPosition(this.selected)
          ? this.actors.get(this.selected)!.view
          : null
        : (this.pick(local.x, local.y)?.view ?? null);
    if (entity) {
      const entry = this.actors.get(entity.id);
      if (!entry || !this.identifiable(entry)) {
        this.denySelection();
        return;
      }
    }
    const anchor = keyboard && entity ? this.screenPosition(entity.id) : null;
    const rect = this.canvas.getBoundingClientRect();
    this.callbacks.select(
      entity,
      anchor
        ? { x: anchor.x + rect.left, y: anchor.y + rect.top }
        : { x: event.clientX, y: event.clientY },
      !entity && !keyboard ? (this.groundPoint(local.x, local.y) ?? undefined) : undefined,
    );
  }
  private blur = (): void => {
    this.clearHover();
    this.cancelDrag();
  };
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.canvas.dataset.ready = 'false';
    this.resizeObserver?.disconnect();
    this.canvas.removeEventListener('pointerdown', this.pointerDown);
    this.canvas.removeEventListener('pointermove', this.pointerMove);
    this.canvas.removeEventListener('pointerleave', this.clearHover);
    this.canvas.removeEventListener('pointerup', this.pointerUp);
    this.canvas.removeEventListener('pointercancel', this.pointerCancel);
    this.canvas.removeEventListener('lostpointercapture', this.pointerCancel);
    this.canvas.removeEventListener('contextmenu', this.contextMenu);
    this.canvas.removeEventListener('wheel', this.wheel);
    this.canvas.removeEventListener('keydown', this.cameraKey);
    window.removeEventListener('blur', this.blur);
    this.cancelDrag();
    this.shadowBatches?.destroy();
    this.hoveredId = null;
    this.hoverPoint = null;
    this.outline?.destroy();
    for (const entry of this.actors.values()) {
      entry.model?.destroy();
      this.presentation?.removeReveal(entry.reveal);
    }
    this.presentation?.destroy();
    this.mercenary?.destroy();
    for (const { mesh } of this.reliefMeshes.values()) {
      mesh.decRefCount();
      if (mesh.refCount === 0) mesh.destroy();
    }
    this.reliefMeshes.clear();
    this.textures.forEach((texture) => texture.destroy());
    this.materials.forEach((material) => material.destroy());
    this.visionBlur.destroy();
    this.perception.destroy();
    this.statuses.destroy();
    this.statusIndicators.destroy();
    this.speech.destroy();
    for (const buffer of this.landscapeBuffers) buffer.destroy();
    this.landscapeBuffers = [];
    this.app.destroy();
  }
}

export function createWorldRenderer(
  canvas: HTMLCanvasElement,
  callbacks: SceneCallbacks,
): WorldRenderer {
  return new WildernessScene(canvas, callbacks);
}
