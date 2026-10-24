import { studyAppearance } from './study-assets';
import { isCurrentAssetRelease } from './asset-files';
import type { AssetRevisionReference } from '@open-legend/assets';
import { destroyModelApplication } from './bundled-models';
import type { ConstructionShape } from '@open-legend/protocol';
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
import { WORLD_HOVER_DELAY_MS, WORLD_HOVER_FADE_MS } from './hover-feedback';
import { uiOwnsShortcut } from './ui/keyboard';
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
  panelRayFraction,
  pickSurfaces,
  rayHits,
  spatialBlockers,
  surfaceContains,
  surfaceHeight,
  type SceneryInstance,
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
  ConstructionPlacement,
  ConstructionPreviewTransform,
} from './world-renderer';
import {
  birdArt,
  groundMesh,
  surroundingGroundMesh,
  surfaceMesh,
  finitePanelMesh,
  surfaceSeamsMesh,
} from './spatial-art';
import { playerEntity } from './entity-view';
import { MercenaryModels, type MercenaryActor } from './characters/mercenary';
import {
  ArtMaterials,
  baselineArt,
  candidateArt,
  mountArtControls,
  type ArtTreatment,
} from './art-treatment';
import {
  groupedGroundArt,
  groupedGrassArt,
  createGroupedScenery,
  environmentSurfaceArt,
  prepareEnvironmentSurface,
  type EnvironmentSurface,
  type SceneryCameraOcclusion,
} from './environment-art';
import { VegetationMotion, type VegetationContributor } from './vegetation-motion';
import { markPixelEnvironment } from './scene-pixels';
import { ScenePropResources, propDimensions, type ScenePropActor } from './scene-props';
import { LibraryScenery } from './library-scenery';
import { LibraryActors, hasLibraryActor, type LibraryActor } from './library-actors';
import { VisionBlur, VISION_FOCUS } from './vision-blur';
import { PerceptionOverlay } from './perception-overlay';
import { FrameRateMeter } from './frame-rate';
import { ScenePerformance } from './scene-performance';
import { CharacterStatuses } from './character-status';
import { SpeechCaptions, type CaptionPoint } from './speech-captions';
import {
  animalArt,
  earthArt,
  fireArt,
  groundArt,
  personArt,
  rottingArt,
  random,
  resourceArt,
  practiceTargetArt,
  sceneryArt,
  predatorArt,
} from './art';

const restingCardBounds = new pc.BoundingBox(new pc.Vec3(0, 0, 0), new pc.Vec3(0.5, 0.05, 0.5));

interface RenderedEntity {
  attackPose?: boolean;
  model?: MercenaryActor | LibraryActor;
  sceneProp?: ScenePropActor;
  propInstalled?: boolean;
  departedAt?: number;
  observed: boolean;
  card: boolean;
  images: ImageData[];
  assetKey: string;
  root: pc.Entity;
  sprite: pc.Entity;
  meshes: pc.MeshInstance[];
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
interface LandscapeResource {
  signature: string;
  node: pc.Entity;
  meshes: pc.Mesh[];
  materials: pc.StandardMaterial[];
  buffers: pc.VertexBuffer[];
  cards: pc.Entity[];
  occlusion: SceneryCameraOcclusion[];
}
/** Presentation only. Entity positions, terrain and all interactions come from the public projection. */
export class WildernessScene implements WorldRenderer {
  readonly app: pc.Application;
  private camera!: pc.Entity;
  private sun!: pc.Entity;
  private landscape!: pc.Entity;
  private actors = new Map<string, RenderedEntity>();
  /** Only entries still approaching an accepted pose need interpolation math. */
  private readonly movingEntries = new Set<string>();
  private knownEvents = new Set<string>();
  private textures: pc.Texture[] = [];
  private materials: pc.StandardMaterial[] = [];
  private cameraSettings = initialCamera();
  private constructionPreview?: pc.Entity;
  private constructionPreviewMaterial?: pc.StandardMaterial;
  private geometryMeshes: pc.Mesh[] = [];
  private readonly structures = new Map<string, LandscapeResource>();
  private readonly sceneryGroups = new Map<string, LandscapeResource>();
  private landscapeMap?: GameView['map'];
  private landscapeScope = '';
  private structureMaterials?: {
    stone: pc.StandardMaterial;
    naturalStone: pc.StandardMaterial;
    timber: pc.StandardMaterial;
    deck: pc.StandardMaterial;
    ramp: pc.StandardMaterial;
  };
  private constructionPreviewValid?: boolean;
  private constructionShapes?: readonly ConstructionShape[];
  private constructionPlacement: ConstructionPlacement | null = null;
  private placementSampleTime = 0;
  private cards = new Map<
    pc.Entity,
    {
      x: number;
      y: number;
      z: number;
      height: number;
      width: number;
      horizontalLength?: number;
      horizontalHeight?: number;
      horizontalHeading?: number;
      padding: ReturnType<typeof spritePadding>;
      depth: number;
    }
  >();
  private outline!: HoverOutline;
  private hoveredId: string | null = null;
  private hoverStarted = 0;
  private targeting = false;
  private commandHeld = false;
  private revealHeld = false;
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
  private terrain?: GameView['map']['terrain'];
  private terrainKey = '';
  private worldKey = '';
  private orientedYaw = NaN;
  private orientedPitch = NaN;
  private nextHoverAt = 0;
  private lastHover?: { entity: EntityView | null; x: number; y: number; primary: boolean };
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
    primaryAction: boolean;
    primaryGesture?: string;
  } | null = null;
  // Some browsers emit contextmenu on press, others after release. Pointer
  // gestures own their menu; suppress that native duplicate until the next press.
  private pointerContextHandled = false;
  private resizeObserver?: ResizeObserver;
  private destroyed = false;
  private suspended = false;
  private readonly pendingFrames = new Set<Promise<unknown>>();
  private redrawPending = false;
  private readonly frameRateMeter = new FrameRateMeter();
  private profiler?: ScenePerformance;
  private renderedFrames = 0;
  private readyRequested = false;
  private presentation!: WorldPresentation;
  private sceneProps!: ScenePropResources;
  private libraryScenery!: LibraryScenery;
  private libraryActors!: LibraryActors;
  private mercenary?: MercenaryModels;
  private artMaterials!: ArtMaterials;
  private artSettings: ArtTreatment = { ...baselineArt };
  private requestedArt: ArtTreatment = { ...candidateArt };
  private externalAssetsAllowed = false;
  private removeArtControls?: () => void;
  private readonly vegetation = new VegetationMotion();
  private readonly landscapeOcclusion: SceneryCameraOcclusion[] = [];
  private readonly vegetationBodies: VegetationContributor[] = [];
  private readonly environmentTiles = new Map<EnvironmentSurface, pc.Texture>();
  private hoverPoint: { x: number; y: number } | null = null;
  private animations: Array<{ y: number; entity: pc.Entity; x: number; z: number; phase: number }> =
    [];

  constructor(
    private canvas: HTMLCanvasElement,
    private callbacks: SceneCallbacks,
    private readonly options: {
      rememberCamera?: boolean;
      notices?: boolean;
      art?: ArtTreatment;
      studyRelease?: AssetRevisionReference;
    } = {},
  ) {
    this.externalAssetsAllowed = isCurrentAssetRelease(options.studyRelease);
    try {
      this.cameraSettings = restoreCameraPreferences(
        options.rememberCamera === false
          ? null
          : JSON.parse(localStorage.getItem('open-legend:camera-v1') ?? 'null'),
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
    this.profiler = ScenePerformance.create(
      canvas,
      (x, y, constraint) => {
        if (
          this.destroyed ||
          this.suspended ||
          !this.view ||
          this.targeting ||
          x < 0 ||
          y < 0 ||
          x >= canvas.clientWidth ||
          y >= canvas.clientHeight ||
          this.pick(x, y)
        )
          return false;
        const point = this.groundPoint(x, y);
        return (
          !!point &&
          (!constraint ||
            Math.hypot(
              point.x - constraint.anchor.x,
              point.y - constraint.anchor.y,
              point.z - constraint.anchor.z,
            ) <= constraint.radius)
        );
      },
      () =>
        Array.from(this.actors, ([id, entry]) =>
          entry.model
            ? { id, ...entry.model.diagnostics(), screen: this.screenPosition(id) }
            : undefined,
        ).filter((model) => model !== undefined),
    );
    if (this.profiler) {
      this.app.on('frameupdate', this.profiler.beginFrame);
      this.app.on('frameend', () => {
        if (!this.profiler?.isRecording()) return;
        this.profiler.endFrame(
          this.view,
          this.view ? this.actors.get(this.view.player.id)?.root.getPosition() : undefined,
          this.app,
        );
      });
    }
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
      this.artMaterials = new ArtMaterials(this.app.graphicsDevice);
      this.presentation = new WorldPresentation(this.app, this.camera, sun);
      this.libraryScenery = new LibraryScenery(this.app, this.artMaterials, sun.light!.light);
      this.libraryActors = new LibraryActors(
        this.app,
        this.presentation,
        this.camera,
        sun.light!.light,
        this.artMaterials,
      );
      this.sceneProps = new ScenePropResources(this.app, this.artMaterials, sun.light!.light);
      this.outline = new HoverOutline(this.app, this.camera);
      this.presentation.prepareHover(this.outline);
      this.mercenary = new MercenaryModels(
        this.app,
        this.presentation,
        this.camera,
        sun.light!.light,
        this.artMaterials,
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
      for (const node of [this.marker, this.destination])
        for (const mesh of node.render!.meshInstances) this.presentation.prepareInteraction(mesh);
      this.app.root.addChild(this.marker);
      this.app.root.addChild(this.destination);
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(canvas);
      canvas.addEventListener('pointerdown', this.pointerDown);
      canvas.addEventListener('pointermove', this.pointerMove);
      canvas.addEventListener('pointerleave', this.leaveCanvas);
      canvas.addEventListener('pointerup', this.pointerUp);
      canvas.addEventListener('pointercancel', this.pointerCancel);
      canvas.addEventListener('lostpointercapture', this.pointerCancel);
      canvas.addEventListener('contextmenu', this.contextMenu);
      canvas.addEventListener('wheel', this.wheel, { passive: false });
      canvas.addEventListener('keydown', this.cameraKey);
      canvas.addEventListener('blur', this.blur);
      window.addEventListener('keydown', this.modifierKey);
      window.addEventListener('keyup', this.modifierKey);
      document.addEventListener('focusin', this.focusChanged);
      window.addEventListener('blur', this.blur);
      document.addEventListener('visibilitychange', this.visibilityChanged);
      this.app.on('update', (dt: number) => this.update(dt));
      this.app.on('postrender', this.recordFrame);
      this.app.on('framerender', this.prepareRender);
      this.app.on('postrender', this.finishRender);
      this.app.graphicsDevice.on('devicelost', this.resetRenderQueue);
      this.resize();
      this.placeCamera();
      this.setArtTreatment(options.art ?? { ...candidateArt });
      this.removeArtControls = mountArtControls(
        canvas,
        (style) => this.setArtTreatment(style),
        () => this.artSettings,
      );
      this.app.start();
    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  // Keep slow GPUs from queuing old views while input and scene updates continue.
  // Two submitted frames retain overlap without accumulating seconds of stale images.
  private prepareRender = (): void => {
    this.redrawPending ||= this.app.renderNextFrame;
    const ready = this.pendingFrames.size < 2;
    this.app.autoRender = !this.suspended && ready;
    this.app.renderNextFrame = this.redrawPending && ready;
  };
  private finishRender = (): void => {
    this.redrawPending = false;
    const device = this.app.graphicsDevice;
    if (this.destroyed || !(device instanceof pc.WebglGraphicsDevice)) return;
    let fence: Promise<unknown>;
    try {
      fence = device.clientWaitAsync(0, 4);
    } catch {
      // Failed or lost contexts must not strand the renderer behind a pending slot.
      return;
    }
    this.pendingFrames.add(fence);
    const release = () => this.pendingFrames.delete(fence);
    // Completion owns only its own slot, even after context loss or scene disposal.
    void fence.then(release, release);
  };
  private resetRenderQueue = (): void => {
    this.pendingFrames.clear();
    this.redrawPending = true;
  };

  /** Developer comparison changes no DTO, world identity, actions or saved state. */
  setArtTreatment(style: ArtTreatment): void {
    this.requestedArt = { ...style };
    if (!this.externalAssetsAllowed)
      style = {
        ...style,
        environment: 'baseline',
        assetSources: 'retained',
        mercenaryArt: 'original',
        hareArt: 'sprite',
        prop: 'authored',
      };
    const rebuild =
      style.environment !== this.artSettings.environment ||
      style.groundPalette !== this.artSettings.groundPalette ||
      style.surfaceArt !== this.artSettings.surfaceArt;
    const previousSources = this.artSettings.assetSources;
    const replaceSources = style.assetSources !== previousSources;
    const replaceProp = style.prop !== this.artSettings.prop;
    const replaceHares = style.hareArt !== this.artSettings.hareArt;
    const relight = style.atmosphere !== this.artSettings.atmosphere;
    this.artSettings = { ...style };
    this.artMaterials.update(style);
    this.libraryScenery?.setTreatment(style);
    if (['natural', 'kenney', 'quaternius', 'study', 'canopy'].includes(style.environment)) {
      const family = style.environment as 'natural' | 'kenney' | 'quaternius' | 'study' | 'canopy';
      void this.libraryScenery
        .load(family)
        .then((loaded) => {
          if (!loaded || this.destroyed || this.artSettings.environment !== family || !this.view)
            return;
          this.buildLandscape(this.view.map);
          this.updateEntityPresentation();
        })
        .catch((error: unknown) => {
          if (!this.destroyed)
            console.warn('Library scenery could not load; retaining the authored fallback.', error);
        });
    }
    this.mercenary?.setArtTreatment(style);
    this.presentation.setArtTreatment(style);
    if (relight && this.view)
      this.presentation.lighting(
        this.view,
        [...this.actors.values()].map((entry) => entry.view),
      );
    this.app.renderNextFrame = true;
    for (const texture of this.textures) {
      if ([...this.environmentTiles.values()].includes(texture)) continue;
      texture.mipmaps = style.filtering === 'mip';
      texture.minFilter =
        style.filtering === 'mip' ? pc.FILTER_LINEAR_MIPMAP_LINEAR : pc.FILTER_NEAREST;
    }
    if (rebuild && this.view) {
      this.buildLandscape(this.view.map);
      this.updateEntityPresentation();
    }
    if ((replaceProp || replaceHares || replaceSources) && this.view) {
      let replaced = false;
      for (const [id, entry] of this.actors)
        if (
          (replaceSources &&
            studyAppearance(entry.view.appearance, previousSources) !==
              studyAppearance(entry.view.appearance, style.assetSources)) ||
          (replaceProp && entry.view.appearance === 'crate-mesh') ||
          (replaceHares && entry.view.kind === 'animal' && entry.view.subtype === 'hare')
        ) {
          this.releaseEntity(entry);
          this.actors.delete(id);
          replaced = true;
        }
      if (replaced) this.setView(this.view);
    }
  }
  artDiagnostics() {
    const stats = this.app.stats;
    const device = this.app.graphicsDevice;
    return {
      device: {
        backend: device.deviceType,
        framebuffer: [device.width, device.height],
        displayPixelRatio: window.devicePixelRatio,
        renderPixelRatio: device.maxPixelRatio,
      },
      memoryBytes: {
        textures: stats.vram.tex,
        vertexBuffers: stats.vram.vb,
        indexBuffers: stats.vram.ib,
        total: stats.vram.tex + stats.vram.vb + stats.vram.ib + stats.vram.ub + stats.vram.sb,
      },
      drawCalls: { ...stats.drawCalls },
      submittedTriangles: stats.frame.triangles || null,
      settings: { ...this.artSettings },
      vegetation: this.vegetation.diagnostics(),
      effects: this.presentation.effectsDiagnostics(),
      pixels: this.presentation.pixelDiagnostics(),
      entities: this.actors.size,
      scenery: this.view?.map.spatial.scenery?.length,
      libraryScenery: this.libraryScenery.diagnostics(),
      materials: this.materials.length,
      textures: this.textures.length,
      character: [...this.actors.values()]
        .filter((e) => e.model)
        .map((e) => e.model!.diagnostics()),
      props: [...this.actors.values()]
        .filter((entry) => entry.sceneProp)
        .map((entry) => ({
          id: entry.view.id,
          state: entry.sceneProp!.state,
          visible: entry.sceneProp!.visible,
          meshes: entry.sceneProp!.meshes.length,
        })),
    };
  }
  setArtMeasurement(enabled: boolean): void {
    if (this.app.graphicsDevice.gpuProfiler) this.app.graphicsDevice.gpuProfiler.enabled = enabled;
  }
  sampleArtFrame() {
    const frame = this.app.stats.frame;
    // Detailed CPU counters are provided by development/profiler builds only.
    // A release build must report absence rather than a zero-cost frame.
    return {
      renderedFrames: this.renderedFrames,
      updateMs: frame.updateStart ? frame.updateTime : null,
      renderSubmissionMs: frame.renderStart ? frame.renderTime : null,
      gpuPassMs: this.app.stats.gpu.size
        ? [...this.app.stats.gpu.values()].reduce((sum: number, value: number) => sum + value, 0)
        : null,
      draws: this.app.stats.drawCalls.total,
    };
  }
  private resetFrameRate = (): void => this.frameRateMeter.reset();
  private recordFrame = (): void => {
    if (this.view && document.visibilityState === 'visible') {
      this.renderedFrames++;
      const at = performance.now();
      this.frameRateMeter.record(at);
      this.profiler?.renderedFrame(at);
    }
  };
  sampleFrameRate(): number | null {
    return this.destroyed || this.suspended || document.visibilityState !== 'visible'
      ? null
      : this.frameRateMeter.sample(performance.now());
  }
  setSuspended(suspended: boolean): void {
    if (this.suspended === suspended) return;
    if (suspended) this.blur();
    this.suspended = suspended;
    this.frameRateMeter.reset();
    this.app.autoRender = !suspended;
    // A fresh snapshot may render once behind the pause dialog; retain GPU assets.
    this.app.renderNextFrame = true;
  }
  setShadowQuality(quality: ShadowQuality): void {
    if (this.presentation.setShadowQuality(quality) && this.view)
      this.presentation.lighting(
        this.view,
        [...this.actors.values()].map((entry) => entry.view),
      );
  }
  setPerceptionOptions(options: PerceptionOptions): void {
    this.perception.setOptions(options);
  }
  setTargeting(active: boolean): void {
    this.targeting = active;
    this.updateCursor();
  }
  setView(view: GameView): void {
    const profileStarted = this.profiler?.begin();
    const external = isCurrentAssetRelease(this.options.studyRelease ?? view.presentationRelease);
    if (external !== this.externalAssetsAllowed) {
      for (const entry of this.actors.values()) this.releaseEntity(entry);
      this.actors.clear();
      this.externalAssetsAllowed = external;
      this.mapKey = '';
      this.landscapeMap = undefined;
      // Apply the requested treatment only after this exact release is admitted.
      // No previous observer's view is rebuilt during the transition.
      const previous = this.view;
      this.view = null;
      this.setArtTreatment(this.requestedArt);
      this.view = previous;
    }
    const controlChanged = this.view?.access?.scope !== view.access?.scope;
    this.view = view;
    this.perception.setView(view);
    if (this.terrain !== view.map.terrain) {
      this.terrain = view.map.terrain;
      this.terrainKey = JSON.stringify(view.map.terrain);
    }
    // A restored timeline can replace geometry at the same saved spatial revision.
    const worldKey = JSON.stringify([
      view.worldId,
      view.saveTimeline,
      view.player.id,
      view.access?.privateDraftScope,
    ]);
    if (this.worldKey !== worldKey) {
      for (const entry of this.actors.values()) this.releaseEntity(entry);
      this.actors.clear();
      this.knownEvents.clear();
      this.selected = null;
      this.initialized = false;
      this.worldKey = worldKey;
    }
    const landscapeScope = JSON.stringify([view.worldId, view.saveTimeline]);
    if (this.landscapeMap !== view.map || this.landscapeScope !== landscapeScope) {
      const key = JSON.stringify([
        view.worldId,
        view.saveTimeline,
        view.map.seed,
        view.map.width,
        view.map.height,
        this.terrainKey,
        view.map.tiles,
        view.map.spatial.surfaces.filter((surface) => surface.terrain),
      ]);
      if (this.mapKey !== key) {
        this.buildLandscape(view.map);
        this.mapKey = key;
      } else this.updateLandscapeResources(view.map);
      this.landscapeMap = view.map;
      this.landscapeScope = landscapeScope;
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
    const playerAbsent =
      !!view.player.death ||
      view.player.participation === 'inactive' ||
      view.player.bodyState === 'removed';
    const entities = [
      ...view.entities.filter((entity) => entity.id !== view.player.id),
      ...(playerAbsent ? [] : [playerEntity(view)]),
    ];
    const visible = new Set(entities.map((entity) => entity.id));
    if (controlChanged) {
      // Resume retains current public assets/camera, never an old observer's ghosts
      // or transient events. The new snapshot alone establishes current disclosure.
      this.resetTransientCaptions();
      this.knownEvents = new Set(view.events.map((event) => event.id));
      this.clearHover();
      this.setModifiers(false, false);
      for (const [id, entry] of this.actors)
        if (!visible.has(id)) {
          this.releaseEntity(entry);
          this.actors.delete(id);
        }
      if (this.selected && !visible.has(this.selected)) {
        this.selected = null;
        this.callbacks.select(null);
      }
    }
    const departed = new Set(
      view.events
        .filter(
          (event) =>
            (event.type === 'departed' || event.type === 'body-removed') &&
            !this.knownEvents.has(event.id),
        )
        .map((event) => event.actorId),
    );
    this.knownEvents = new Set(view.events.map((event) => event.id));
    for (const [id, entry] of this.actors)
      if (!visible.has(entry.view.id)) {
        // Loose piles have no renderer ghost: occlusion and collection both hide the heap.
        // docs/worlds/base/items.md#ground-piles
        if (
          entry.view.kind === 'item-pile' ||
          (entry.view.id === view.player.id && playerAbsent) ||
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
      if (entry?.observed && entry.view === entity) continue;
      this.movingEntries.add(entity.id);
      const baseSignature = `${
        entity.contents
          ?.slice(0, 12)
          .map((item) => `${item.definitionId}:${Math.min(3, item.quantity)}`)
          .join('|') ?? ''
      }:${entity.assembly?.revision ?? ''}:${entity.kind}:${entity.subtype}:${entity.appearance}:${entity.kind === 'resource' ? entity.name : ''}:${entity.quantity === 0 && !!propDimensions(studyAppearance(entity.appearance, this.artSettings.assetSources))?.depletedUrl}:${entity.bodyState ?? ''}:${!!entity.heat?.lit}:${entity.kind === 'actor' && entity.id === view.player.id && view.player.inventory.some((item) => item.equipped)}`;
      // Restoring another valid construction branch can retain the same edit
      // count. The actual permitted pieces/palette decide appearance and picking.
      const signature = entity.assembly
        ? JSON.stringify([
            baseSignature,
            entity.assembly.familyId,
            entity.assembly.implementation,
            entity.assembly.presentation,
            entity.assembly.shapes,
          ])
        : baseSignature;
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
      const groundPoseChanged =
        card &&
        (card.horizontalHeading !== entity.heading ||
          card.horizontalLength !== (entity.bodySize?.height ?? entry.height));
      if (card) {
        card.horizontalHeading = entity.heading;
        card.horizontalLength = entity.bodySize?.height ?? entry.height;
      }
      if (
        card &&
        (card.horizontalHeight !==
          (entity.statusEffects?.some((effect) => effect.pose === 'horizontal')
            ? (entity.bodySize?.width ?? entry.width)
            : undefined) ||
          (card.horizontalHeight !== undefined && groundPoseChanged))
      ) {
        // Use projected presentation, never action names or elapsed client time.
        // docs/architecture.md#react-presentation-and-character-traits
        card.horizontalHeight = entity.statusEffects?.some((effect) => effect.pose === 'horizontal')
          ? (entity.bodySize?.width ?? entry.width)
          : undefined;
        this.orientCard(entry.sprite);
        for (const mesh of entry.sprite.render?.meshInstances ?? [])
          mesh.setParameter(
            'ol_spriteSize',
            card.horizontalHeight === undefined
              ? [entry.width, entry.height]
              : [entity.bodySize?.width ?? entry.width, entity.bodySize?.height ?? entry.height],
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
    this.updateEntityPresentation();
    this.presentation.lighting(
      view,
      [...this.actors.values()].map((entry) => entry.view),
    );
    if (this.options.notices !== false) this.statuses.observe(view);
    this.statusIndicators.observe(entities);
    this.speech.observe(view);
    this.profiler?.view(profileStarted, view, this.actors.size);
    if (!this.readyRequested) {
      this.readyRequested = true;
      // An existing WebGL context alone does not prove that the world rendered.
      this.app.renderNextFrame = true;
      this.app.once('postrender', () => {
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
    // A named entry in the server-permitted list can be inspected outside the
    // camera's sharp focus. Pixel picking and the marker retain their narrower
    // presentation checks; remembered or no-longer-observed entries still refuse.
    if (id && !entry?.observed) {
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
    if (!this.view) return;
    this.cameraSettings = updateCamera(this.cameraSettings, command);
    if (command.type === 'follow' && this.cameraSettings.following && this.view)
      this.cameraSettings = updateCamera(this.cameraSettings, {
        type: 'focus',
        point: this.view.player.position,
      });
    this.placeCamera();
    // No storage write for every pointer sample. Commit preferences when a gesture ends.
    if (!this.drag) this.saveCameraPreferences();
    this.callbacks.cameraChanged?.(this.cameraState());
  }
  private saveCameraPreferences(): void {
    if (this.options.rememberCamera === false) return;
    try {
      localStorage.setItem(
        'open-legend:camera-v1',
        JSON.stringify(cameraPreferences(this.cameraSettings)),
      );
    } catch {
      /* Optional local presentation preference. */
    }
  }
  private updateEntityPresentation(): void {
    for (const entry of this.actors.values()) {
      this.updateModelVisibility(entry);
      for (const mesh of entry.meshCasters) mesh.castShadow = entry.observed;
      this.applyEntityOpacity(entry, this.entityOpacity(entry));
      // Suspended scenes can still render a newly scoped snapshot once. Revoke
      // old see-through silhouettes here rather than waiting for frame updates.
      if (!entry.observed) this.updateReadThrough(entry, 0, true);
    }
  }
  screenPosition(id: string): { x: number; y: number } | null {
    const entry = this.actors.get(id);
    if (!entry || !this.identifiable(entry)) return null;
    if (entry.model?.visible && entry.model.screenAnchor) {
      const anchor = entry.model.screenAnchor;
      return { x: anchor.x, y: anchor.y - 8 };
    }
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

  /** Hearing controls content; the camera controls where permitted evidence is shown. */
  private updateSpeech(): void {
    const view = this.view;
    if (!view) return;
    const width = this.canvas.clientWidth,
      height = this.canvas.clientHeight;
    const cameraPosition = this.camera.getPosition();
    const project = (point: pc.Vec3): CaptionPoint => {
      const screen = this.camera.camera!.worldToScreen(point);
      return { x: screen.x, y: screen.y };
    };
    const inFront = (point: pc.Vec3) =>
      point.clone().sub(cameraPosition).dot(this.camera.forward) > 0;
    this.speech.update({
      width,
      height,
      head: (id) => {
        const entity = this.actors.get(id);
        if (!entity?.observed || !inFront(entity.root.getPosition())) return null;
        const p = this.statusAnchor(id);
        if (!p || p.x < 0 || p.x > width || p.y < 0 || p.y > height) return null;
        return { x: p.x, y: p.y - 54, source: p };
      },
      direction: (speech, captionWidth, captionHeight, sourceId) => {
        const speaker = sourceId ? this.actors.get(sourceId) : undefined;
        let dx: number,
          dy: number,
          approximate = false;
        let source: { x: number; y: number } | undefined;
        if (speaker?.observed) {
          const point = speaker.root
            .getPosition()
            .clone()
            .add(new pc.Vec3(0, 1, 0));
          const screen = project(point);
          if (inFront(point)) source = screen;
          // Perspective divides by depth and flips points behind the camera;
          // orthographic projection keeps their screen-space direction unchanged.
          const sign = this.cameraSettings.projection === 'perspective' && !inFront(point) ? -1 : 1;
          dx = (screen.x - width / 2) * sign;
          dy = (screen.y - height / 2) * sign;
        } else {
          // An event-time bearing has no range. Until the localization contract
          // grants one, don't pretend this is a camera-relative hidden position.
          if (!speech.direction) return null;
          const heardAt = speech.listenerPosition,
            player = view.player.position;
          if (Math.hypot(player.x - heardAt.x, player.y - heardAt.y, player.z - heardAt.z) > 0.5)
            return null;
          const angle = (speech.direction.sector * Math.PI) / 4;
          const vector = new pc.Vec3(Math.cos(angle), 0, Math.sin(angle));
          dx = vector.dot(this.camera.right);
          dy = -vector.dot(this.camera.up);
          approximate = true;
        }
        const length = Math.hypot(dx, dy);
        if (length < 0.001) {
          dx = 0;
          dy = 1;
        } else {
          dx /= length;
          dy /= length;
        }
        // A screen-space circle stays useful when the camera is detached or zoomed.
        const radius = Math.max(
          0,
          Math.min(
            280,
            width * 0.35,
            height * 0.35,
            (width - captionWidth) / 2 - 16,
            (height - captionHeight) / 2 - 16,
          ),
        );
        return {
          x: width / 2 + dx * radius,
          y: height / 2 + dy * radius + captionHeight / 2,
          arrow: Math.atan2(dy, dx),
          approximate,
          source,
        };
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
    // Resizing clears the canvas even while focus loss suspends automatic rendering.
    this.app.renderNextFrame = true;
  }
  private texture(source: HTMLCanvasElement): pc.Texture {
    const mip = this.artSettings.filtering === 'mip';
    const texture = new pc.Texture(this.app.graphicsDevice, {
      width: source.width,
      height: source.height,
      mipmaps: mip,
      minFilter: mip ? pc.FILTER_LINEAR_MIPMAP_LINEAR : pc.FILTER_NEAREST,
      magFilter: pc.FILTER_NEAREST,
      addressU: pc.ADDRESS_CLAMP_TO_EDGE,
      addressV: pc.ADDRESS_CLAMP_TO_EDGE,
    });
    texture.setSource(source);
    this.textures.push(texture);
    return texture;
  }
  private prepareSurface(material: pc.StandardMaterial, kind: EnvironmentSurface): void {
    let texture = this.environmentTiles.get(kind);
    if (!texture) {
      texture = this.texture(environmentSurfaceArt(kind));
      this.environmentTiles.set(kind, texture);
    }
    prepareEnvironmentSurface(material, this.app.graphicsDevice, kind, texture);
    markPixelEnvironment(material, this.app.graphicsDevice);
  }
  private material(
    color: string,
    source?: HTMLCanvasElement,
    transparent = false,
    unlit = false,
  ): pc.StandardMaterial {
    const material = new ShadowMaterial(this.sun.light!.light);
    material.name = source ? (unlit ? 'Unlit sprite' : 'Lit sprite') : 'Solid surface';
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
    if (!unlit && (!source || !transparent)) this.artMaterials.prepare(material);
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
    this.cards.set(sprite, {
      x,
      y,
      z,
      height,
      width,
      padding: padding ?? spritePadding([]),
      depth: 0,
    });
    // Relief depth is normalized to artwork width; facing flips never reverse it.
    sprite.setLocalScale(width, width, height);
    sprite.render!.castShadows = castShadows;
    configureBillboard(material);
    if (material.useLighting) {
      lightSprite(material, this.app.graphicsDevice);
      this.artMaterials.prepare(material);
    }
    sprite.render!.meshInstances[0]!.setParameter('ol_spriteSize', [width, height]);
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
    for (const mesh of sprite.render?.meshInstances ?? [])
      mesh.setParameter('ol_groundPose', binding.horizontalHeight === undefined ? 0 : 1);
    if (binding.horizontalHeight !== undefined) {
      sprite.setLocalScale(
        binding.horizontalHeight * (sprite.getLocalScale().x < 0 ? -1 : 1),
        binding.horizontalHeight,
        binding.horizontalLength ?? binding.height,
      );
      sprite.setEulerAngles(0, ((binding.horizontalHeading ?? 0) * 180) / Math.PI, 0);
      sprite.setLocalPosition(binding.x, binding.y + 0.03, binding.z);
      // A resting image occupies the same ground rectangle used by native fit checks.
      for (const mesh of sprite.render?.meshInstances ?? []) {
        mesh.setCustomAabb(restingCardBounds);
      }
      return;
    }
    sprite.setLocalScale(
      binding.width * (sprite.getLocalScale().x < 0 ? -1 : 1),
      binding.width,
      binding.height,
    );
    // Full camera-facing cards retain their silhouette at every pitch. Body depth is
    // supplied by the shared billboard shader, including alpha-tested shadow casting.
    sprite.setRotation(this.camera.getRotation());
    sprite.rotateLocal(90, 0, 0);
    const center = binding.height * (0.5 - binding.padding.bottom) + bob;
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
    entity.render!.material.name = name;
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
  setConstructionPlacement(placement: ConstructionPlacement | null): void {
    const entering = placement && !this.constructionPlacement;
    this.constructionPlacement = placement;
    this.updateCursor();
    if (entering) this.canvas.focus({ preventScroll: true });
  }
  setConstructionPreview(
    shapes: readonly ConstructionShape[] | null,
    valid = false,
    transform?: ConstructionPreviewTransform,
  ): void {
    // Pointer motion transforms one retained mesh; it never rebuilds all the parts.
    if (shapes && shapes === this.constructionShapes && this.constructionPreview) {
      this.positionConstructionPreview(valid, transform);
      return;
    }
    this.constructionShapes = shapes ?? undefined;
    this.constructionPreview?.destroy();
    this.constructionPreview = undefined;
    if (this.constructionPreviewMaterial) {
      this.releaseMaterial(this.constructionPreviewMaterial);
      this.constructionPreviewMaterial = undefined;
      this.constructionPreviewValid = undefined;
    }
    if (!shapes) return;
    const root = new pc.Entity('Construction preview', this.app);
    this.app.root.addChild(root);
    const material = this.material(valid ? '#498967' : '#b76d54');
    material.opacity = 0.3;
    material.blendType = pc.BLEND_NORMAL;
    material.depthWrite = false;
    material.update();
    this.constructionPreview = root;
    this.constructionPreviewMaterial = material;
    for (const shape of shapes) {
      const node = this.constructionPart(
        shape,
        root,
        material,
        transform?.origin ?? { x: 0, y: 0, z: 0 },
      );
      node.render!.castShadows = false;
    }
    this.positionConstructionPreview(valid, transform);
  }
  private positionConstructionPreview(
    valid: boolean,
    transform?: ConstructionPreviewTransform,
  ): void {
    const root = this.constructionPreview;
    if (!root) return;
    root.setPosition(
      transform?.position.x ?? 0,
      transform?.position.y ?? 0,
      transform?.position.z ?? 0,
    );
    root.setEulerAngles(0, ((transform?.rotation ?? 0) * 180) / Math.PI, 0);
    const material = this.constructionPreviewMaterial;
    if (material && this.constructionPreviewValid !== valid) {
      this.constructionPreviewValid = valid;
      material.diffuse.fromString(valid ? '#75dca0' : '#dfb76d');
      material.emissive.copy(material.diffuse).mulScalar(0.25);
      material.update();
    }
  }
  private constructionPart(
    shape: ConstructionShape,
    parent: pc.Entity,
    material: pc.StandardMaterial,
    origin: { x: number; y: number; z: number },
  ): pc.Entity {
    if (shape.panel) {
      const node = new pc.Entity(shape.id, this.app);
      // RenderComponent destroys its unique mesh instance and mesh with the node
      // (installed PlayCanvas 2.22.2); no retained shared mesh or per-frame rebuild.
      node.addComponent('render', {
        meshInstances: [
          new pc.MeshInstance(
            finitePanelMesh(this.app.graphicsDevice, shape.panel, origin),
            material,
            node,
          ),
        ],
      });
      parent.addChild(node);
      return node;
    }
    const a = shape.min,
      b = shape.max;
    return this.primitive(
      shape.id,
      shape.geometry ?? 'box',
      material,
      parent,
      (a.x + b.x) / 2 - origin.x,
      (a.y + b.y) / 2 - origin.y,
      (a.z + b.z) / 2 - origin.z,
      b.x - a.x,
      b.y - a.y,
      b.z - a.z,
    );
  }
  private releaseEntity(entry: RenderedEntity): void {
    this.movingEntries.delete(entry.view.id);
    if (this.hoveredId === entry.view.id) this.clearHover();
    entry.model?.destroy();
    entry.sceneProp?.destroy();
    this.cards.delete(entry.sprite);
    this.presentation.removeReveal(entry.reveal);
    if (entry.sprite.render) this.presentation.removeEffect(entry.sprite.render);
    entry.root.destroy();
    const asset = this.appearanceAssets.get(entry.assetKey);
    if (asset && --asset.refs === 0) {
      for (const material of asset.materials) this.releaseMaterial(material);
      this.appearanceAssets.delete(entry.assetKey);
    }
  }
  private appearanceMeshes(root: pc.Entity): pc.MeshInstance[] {
    const meshes = (root.findComponents('render') as pc.RenderComponent[]).flatMap(
      (render) => render.meshInstances,
    );
    // Solid multipart objects need the same remembered fade as cards. Prepare shared
    // materials once; per-entity opacity stays on mesh instances, not shared materials.
    // docs/world-presentation.md#motion-and-depth
    for (const mesh of meshes) {
      const material = mesh.material as pc.StandardMaterial;
      if (material.blendType === pc.BLEND_NONE && material.opacityDither === pc.DITHER_NONE) {
        material.opacityDither = pc.DITHER_BAYER8;
        material.update();
      }
    }
    return meshes;
  }
  private applyEntityOpacity(entry: RenderedEntity, opacity: number): void {
    for (const mesh of entry.meshes)
      mesh.setParameter(
        'material_opacity',
        opacity * (mesh.material as pc.StandardMaterial).opacity,
      );
  }
  private makeEntity(view: EntityView, game: GameView): RenderedEntity {
    const root = new pc.Entity(view.name, this.app);
    this.app.root.addChild(root);
    root.setPosition(view.position.x, view.position.y, view.position.z);
    if (view.assembly) {
      const key = JSON.stringify([
        'assembly',
        view.assembly.familyId,
        view.assembly.implementation,
        view.assembly.presentation,
      ]);
      let asset = this.appearanceAssets.get(key);
      if (!asset) {
        const cloth = this.material(view.assembly.presentation.coverColor);
        cloth.opacity = view.assembly.presentation.coverOpacity;
        cloth.blendType = cloth.opacity < 1 ? pc.BLEND_NORMAL : pc.BLEND_NONE;
        cloth.update();
        asset = {
          materials: [this.material(view.assembly.presentation.postColor), cloth],
          images: [],
          padding: spritePadding([]),
          refs: 0,
        };
        this.appearanceAssets.set(key, asset);
      }
      asset.refs++;
      const nodes = view.assembly.shapes.map((shape) =>
        this.constructionPart(
          shape,
          root,
          asset!.materials[
            shape.role === 'cover' ||
            shape.role === 'panel' ||
            shape.role === 'access-panel' ||
            shape.role === 'gate'
              ? 1
              : 0
          ]!,
          view.position,
        ),
      );
      const sprite =
        nodes[0] ??
        this.primitive(
          'Assembly place',
          'box',
          asset.materials[0]!,
          root,
          0,
          0.01,
          0,
          0.02,
          0.02,
          0.02,
        );
      const meshes = this.appearanceMeshes(root);
      return {
        root,
        sprite,
        meshes,
        meshCasters: meshes,
        reveal: this.presentation.addReveal(sprite, asset.materials[0]!, false, false),
        renderedSupport: view.supportSurfaceId,
        view,
        materials: asset.materials,
        images: [],
        assetKey: key,
        card: false,
        lastFrame: -1,
        facing: 1,
        scaleFacing: 1,
        width: view.radius * 2,
        height: 0.05,
        observed: true,
      };
    }
    const dead = !!view.bodyState;
    const lit = !!view.heat?.lit;
    const person = view.kind === 'actor' || (view.kind === 'remains' && view.bodyPlan === 'biped');
    const equipped =
      view.id === game.player.id && game.player.inventory.some((item) => item.equipped);
    const deer = view.subtype === 'deer',
      bird = view.subtype === 'bird',
      wolf = view.subtype === 'wolf',
      bear = view.subtype === 'bear',
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
          : person
            ? `person:${view.id !== game.player.id}:${equipped}:${view.bodyState ?? ''}`
            : view.kind === 'animal' || view.kind === 'remains'
              ? `animal:${view.subtype}:${view.appearance}:${view.bodyState ?? ''}`
              : view.kind === 'practice-target'
                ? 'practice-target'
                : view.kind === 'station'
                  ? `fire:${lit}`
                  : `resource:${JSON.stringify([view.subtype + view.name, resourceSeed])}`;
    let width =
      view.kind === 'item-pile'
        ? 1
        : crate
          ? 1
          : person
            ? dead
              ? 2.1
              : 1.05
            : bear
              ? 2.8
              : wolf
                ? 2.4
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
          : person
            ? dead
              ? 0.55
              : 2.1
            : bear
              ? 1.9
              : wolf
                ? 1.4
                : deer
                  ? 1.9
                  : bird
                    ? 1
                    : view.kind === 'animal' || view.kind === 'remains'
                      ? 1.05
                      : view.kind === 'station'
                        ? 1.65
                        : 1.6;
    if (dead && (view.kind === 'animal' || view.kind === 'remains'))
      height = Math.min(height, 0.45);
    let asset = this.appearanceAssets.get(key);
    if (!asset) {
      const images =
        view.kind === 'item-pile'
          ? [itemPileArt(view.contents ?? [])]
          : crate
            ? []
            : person
              ? (dead ? [0] : [0, 1, 2, 3, 4, 5]).map((frame) =>
                  personArt(view.id !== game.player.id, dead ? 0 : frame, equipped && !dead, dead),
                )
              : view.kind === 'animal' || view.kind === 'remains'
                ? (dead ? [0] : [0, 1, 2]).map((frame) =>
                    bird
                      ? birdArt(frame, dead)
                      : wolf || bear
                        ? predatorArt(bear, frame === 1 ? 2 : frame === 2 ? -2 : 0, dead)
                        : animalArt(deer, frame === 1 ? 2 : frame === 2 ? -2 : 0, dead),
                  )
                : view.kind === 'practice-target'
                  ? [practiceTargetArt()]
                  : view.kind === 'station'
                    ? (lit ? [0, 1, 2] : [0]).map((frame) => fireArt(frame, lit))
                    : [resourceArt(view.subtype + view.name, resourceSeed)];
      const materials = crate
        ? [this.material('#a17a4d'), this.material('#564631')]
        : images.map((source) => {
            if (view.bodyState === 'rotting') source = rottingArt(source);
            const m = this.material('#ffffff', source, true, lit);
            configureBillboard(m);
            if (m.useLighting) lightSprite(m, this.app.graphicsDevice);
            this.artMaterials.prepare(m);
            return m;
          });
      // Read alpha once while creating an asset, not a Canvas readback on each hover frame.
      if (person || view.kind === 'animal')
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
    if (lit && sprite.render) this.presentation.addEffect(sprite.render);
    const meshes = this.appearanceMeshes(root);
    const entry: RenderedEntity = {
      model:
        this.externalAssetsAllowed && !dead && view.appearance === 'mercenary-model'
          ? this.mercenary?.create(root)
          : this.externalAssetsAllowed &&
              !dead &&
              hasLibraryActor(studyAppearance(view.appearance, this.artSettings.assetSources))
            ? this.libraryActors.create(
                root,
                studyAppearance(view.appearance, this.artSettings.assetSources),
              )
            : this.externalAssetsAllowed &&
                !dead &&
                view.kind === 'animal' &&
                view.subtype === 'hare' &&
                this.artSettings.hareArt !== 'sprite'
              ? this.libraryActors.create(root, this.artSettings.hareArt)
              : undefined,
      root,
      sprite,
      meshes,
      meshCasters: (root.findComponents('render') as pc.RenderComponent[])
        .flatMap((render) => render.meshInstances)
        .filter((mesh) => mesh.castShadow),
      reveal: this.presentation.addReveal(
        sprite,
        asset.materials[0]!,
        !crate,
        person || view.kind === 'animal',
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
    const preparedProp = this.externalAssetsAllowed
      ? propDimensions(studyAppearance(view.appearance, this.artSettings.assetSources))
      : undefined;
    if (preparedProp || (crate && this.artSettings.prop !== 'authored')) {
      entry.sceneProp = this.sceneProps.create(
        root,
        preparedProp?.width ?? width,
        preparedProp?.height ?? height,
        preparedProp?.depth ?? 0.8,
        preparedProp
          ? studyAppearance(view.appearance, this.artSettings.assetSources)
          : this.artSettings.prop,
        view.quantity === 0,
      );
    }
    return entry;
  }
  private installSceneProp(entry: RenderedEntity): void {
    const actor = entry.sceneProp;
    const sprite = actor?.root;
    // Late asset arrival must not upgrade a remembered or cut-away object.
    // The ordinary visible-frame owner performs the atomic swap after admission.
    if (!actor || !sprite || actor.state !== 'ready' || entry.propInstalled) return;
    this.presentation.removeReveal(entry.reveal);
    this.cards.delete(entry.sprite);
    for (const node of [...entry.root.children]) if (node !== sprite) node.destroy();
    entry.card = false;
    const dimensions = propDimensions(
      studyAppearance(entry.view.appearance, this.artSettings.assetSources),
    );
    if (dimensions) {
      entry.width = dimensions.width;
      entry.height = dimensions.height;
    }
    entry.sprite = sprite;
    entry.meshes = this.appearanceMeshes(sprite);
    entry.meshCasters = entry.meshes.filter((mesh) => mesh.castShadow);
    entry.materials = entry.meshes.map((mesh) => mesh.material as pc.StandardMaterial);
    entry.lastFrame = 0;
    entry.reveal = this.presentation.addReveal(
      sprite,
      entry.materials[0]!,
      false,
      false,
      entry.meshes,
    );
    actor.setVisible(true);
    entry.propInstalled = true;
    this.applyEntityOpacity(entry, this.entityOpacity(entry));
  }
  private releaseLandscapeResource(resource: LandscapeResource): void {
    resource.node.destroy();
    for (const card of resource.cards) this.cards.delete(card);
    for (const buffer of resource.buffers) buffer.destroy();
    for (const mesh of resource.meshes) mesh.destroy();
    for (const material of resource.materials) {
      this.vegetation.unregister(material);
      this.releaseMaterial(material);
    }
  }

  /** Prepare replacements before exposing them. Unchanged geometry/art keeps its
   * existing GPU resources; the full terrain/glint random sequence is independent. */
  private updateLandscapeResources(map: GameView['map']): void {
    const materials = this.structureMaterials;
    if (!materials) throw new Error('Landscape materials are unavailable.');
    const desired = new Map<
      string,
      { id: string; signature: string; build(resource: LandscapeResource): void }
    >();
    const authoredBlockers = new Set(map.spatial.blockers.map((blocker) => blocker.id));
    const pieceOrdinals = new Map<string, number>();
    for (const blocker of spatialBlockers(map)) {
      const ordinal = pieceOrdinals.get(blocker.id) ?? 0;
      pieceOrdinals.set(blocker.id, ordinal + 1);
      // Several exact solids can belong to one physical object. Keep every
      // render resource while picking still identifies that original object.
      desired.set(JSON.stringify(['blocker', blocker.id, ordinal]), {
        id: blocker.id,
        signature: JSON.stringify([blocker, authoredBlockers.has(blocker.id)]),
        build: (resource) => {
          const a = blocker.bounds.min,
            b = blocker.bounds.max;
          this.primitive(
            blocker.id,
            'box',
            blocker.material === 'stone'
              ? authoredBlockers.has(blocker.id)
                ? materials.stone
                : materials.naturalStone
              : materials.timber,
            resource.node,
            (a.x + b.x) / 2,
            (a.y + b.y) / 2,
            (a.z + b.z) / 2,
            b.x - a.x,
            b.y - a.y,
            b.z - a.z,
          );
        },
      });
    }
    for (const surface of map.spatial.surfaces) {
      if (surface.terrain) continue;
      desired.set(JSON.stringify(['surface', surface.id]), {
        id: surface.id,
        signature: JSON.stringify(surface),
        build: (resource) => {
          const mesh = surfaceMesh(this.app.graphicsDevice, surface);
          resource.meshes.push(mesh);
          resource.node.addComponent('render', {
            meshInstances: [
              new pc.MeshInstance(
                mesh,
                surface.material === 'timber' ? materials.deck : materials.ramp,
              ),
            ],
            castShadows: true,
            receiveShadows: true,
          });
          if (surface.material === 'timber') {
            const seams = surfaceSeamsMesh(this.app.graphicsDevice, surface);
            resource.meshes.push(seams);
            const detail = new pc.Entity('Deck plank seams', this.app);
            detail.addComponent('render', {
              meshInstances: [new pc.MeshInstance(seams, materials.timber)],
              castShadows: false,
              receiveShadows: true,
            });
            resource.node.addChild(detail);
          }
        },
      });
    }
    const grouped = this.artSettings.environment !== 'baseline';
    const groups = new Map<string, SceneryInstance[]>();
    const library = ['natural', 'kenney', 'quaternius', 'study', 'canopy'].includes(
      this.artSettings.environment,
    );
    for (const instance of map.spatial.scenery ?? []) {
      const cell = instance.appearance === 'meadow-grass' ? 8 : 16;
      const patch = grouped
        ? `:${Math.floor(instance.position.x / cell)}:${Math.floor(instance.position.z / cell)}`
        : '';
      // Library geometry is shared across authored rotation seeds. Keeping the
      // seed in this key splits identical meshes into redundant shadow draws.
      const key = `${instance.appearance}:${library ? '' : instance.seed}:${instance.castShadows}${patch}`;
      const group = groups.get(key);
      if (group) group.push(instance);
      else groups.set(key, [instance]);
    }
    const scenery = new Map<
      string,
      { signature: string; build(resource: LandscapeResource): void }
    >();
    for (const [key, instances] of groups)
      scenery.set(key, {
        signature: JSON.stringify(instances),
        build: (resource) => {
          const first = instances[0]!;
          if (
            this.artSettings.environment === 'natural' ||
            this.artSettings.environment === 'kenney' ||
            this.artSettings.environment === 'quaternius' ||
            this.artSettings.environment === 'study' ||
            this.artSettings.environment === 'canopy'
          ) {
            const shape = this.libraryScenery.create(
              this.artSettings.environment,
              first.appearance,
              instances,
            );
            if (shape) {
              resource.occlusion.push(...shape.occlusion);
              resource.buffers.push(shape.buffer);
              const node = new pc.Entity(first.appearance + ' · library', this.app);
              node.addComponent('render', {
                meshInstances: shape.meshInstances,
                castShadows: first.castShadows,
                receiveShadows: true,
              });
              node.render!.customAabb = shape.bounds;
              resource.node.addChild(node);
              return;
            }
          }
          if (grouped && first.appearance !== 'meadow-grass') {
            const material = this.material('#ffffff');
            resource.materials.push(material);
            setVisibilityStencil(material, sceneryStencil);
            const shape = createGroupedScenery(
              this.app.graphicsDevice,
              first.appearance,
              first.seed,
              instances,
              material,
            );
            if (shape) {
              this.prepareSurface(material, 'foliage');
              if (shape.occlusion) resource.occlusion.push(shape.occlusion);
              resource.meshes.push(shape.mesh);
              resource.buffers.push(shape.buffer);
              const node = new pc.Entity(first.appearance, this.app);
              node.addComponent('render', {
                meshInstances: [shape.instance],
                castShadows: first.castShadows,
                receiveShadows: true,
              });
              node.render!.customAabb = shape.bounds;
              resource.node.addChild(node);
              return;
            }
            resource.materials.pop();
            this.releaseMaterial(material);
          }
          const image =
            grouped && first.appearance === 'meadow-grass'
              ? groupedGrassArt()
              : sceneryArt(first.appearance, first.seed);
          if (!image) return;
          const material = this.material('#ffffff', image, true);
          resource.materials.push(material);
          setVisibilityStencil(material, sceneryStencil);
          const padding = spritePadding([
            image.getContext('2d')!.getImageData(0, 0, image.width, image.height),
          ]);
          const transforms: number[] = [];
          for (const instance of instances) {
            const { x, y, z } = instance.position;
            if (instance.castShadows) {
              resource.cards.push(
                this.billboard(
                  instance.id,
                  material,
                  resource.node,
                  x,
                  y,
                  z,
                  instance.width,
                  instance.height,
                  true,
                ),
              );
            } else {
              transforms.push(
                instance.width,
                0,
                0,
                0,
                0,
                instance.width,
                0,
                0,
                0,
                0,
                instance.height,
                0,
                x,
                y,
                z,
                1,
              );
            }
          }
          if (transforms.length) {
            const batch = instanceBillboards(
              this.app.graphicsDevice,
              material,
              new Float32Array(transforms),
              padding.bottom,
            );
            lightSprite(material, this.app.graphicsDevice);
            this.artMaterials.prepare(material);
            if (grouped && first.appearance === 'meadow-grass') {
              const center = instances.reduce(
                (sum, i) => ({
                  x: sum.x + i.position.x / instances.length,
                  y: sum.y + i.position.y / instances.length,
                  z: sum.z + i.position.z / instances.length,
                }),
                { x: 0, y: 0, z: 0 },
              );
              const radius =
                Math.max(
                  ...instances.map((i) =>
                    Math.hypot(i.position.x - center.x, i.position.z - center.z),
                  ),
                ) + 1;
              this.vegetation.register(material, center, radius);
            }
            resource.buffers.push(batch.buffer);
            const node = new pc.Entity(first.appearance, this.app);
            node.addComponent('render', { meshInstances: [batch.instance], castShadows: false });
            node.render!.customAabb = batch.bounds;
            resource.node.addChild(node);
          }
        },
      });
    const prepared: LandscapeResource[] = [];
    const prepare = (
      current: Map<string, LandscapeResource>,
      specs: Map<string, { signature: string; build(resource: LandscapeResource): void }>,
    ) => {
      const next = new Map<string, LandscapeResource>();
      for (const [key, spec] of specs) {
        const existing = current.get(key);
        if (existing?.signature === spec.signature) {
          next.set(key, existing);
          continue;
        }
        const node = new pc.Entity('Landscape resource', this.app);
        node.enabled = false;
        this.landscape.addChild(node);
        const resource: LandscapeResource = {
          signature: spec.signature,
          node,
          meshes: [],
          materials: [],
          buffers: [],
          cards: [],
          occlusion: [],
        };
        prepared.push(resource);
        spec.build(resource);
        next.set(key, resource);
      }
      return next;
    };
    let nextStructures: Map<string, LandscapeResource>, nextScenery: Map<string, LandscapeResource>;
    try {
      nextStructures = prepare(this.structures, desired);
      nextScenery = prepare(this.sceneryGroups, scenery);
    } catch (error) {
      for (const resource of prepared) this.releaseLandscapeResource(resource);
      throw error;
    }
    const install = (
      current: Map<string, LandscapeResource>,
      next: Map<string, LandscapeResource>,
    ) => {
      for (const [key, resource] of current)
        if (next.get(key) !== resource) this.releaseLandscapeResource(resource);
      current.clear();
      for (const [key, resource] of next) {
        resource.node.enabled = true;
        current.set(key, resource);
      }
    };
    install(this.structures, nextStructures);
    install(this.sceneryGroups, nextScenery);
    this.landscapeOcclusion.length = 0;
    for (const resource of this.sceneryGroups.values())
      this.landscapeOcclusion.push(...resource.occlusion);
    if (this.profiler?.isRecording()) {
      this.canvas.dataset.sceneryCount = String(map.spatial.scenery?.length ?? 0);
      this.canvas.dataset.landscapeResourceCount = String(
        this.structures.size + this.sceneryGroups.size,
      );
      this.canvas.dataset.landscapeResourceBuildCount = String(
        Number(this.canvas.dataset.landscapeResourceBuildCount ?? 0) + prepared.length,
      );
    }
  }

  private buildLandscape(map: GameView['map']): void {
    const started = this.profiler?.begin();
    for (const resource of this.structures.values()) this.releaseLandscapeResource(resource);
    for (const resource of this.sceneryGroups.values()) this.releaseLandscapeResource(resource);
    this.structures.clear();
    this.sceneryGroups.clear();
    this.vegetation.clear();
    this.landscapeOcclusion.length = 0;
    this.landscape.destroy();
    for (const material of this.landscapeMaterials) this.releaseMaterial(material);
    this.landscapeMaterials = [];
    for (const mesh of this.geometryMeshes) mesh.destroy();
    this.geometryMeshes = [];
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
    const grouped = this.artSettings.environment !== 'baseline';
    const painted = this.artSettings.surfaceArt === 'painted';
    const groundTexture = grouped
      ? groupedGroundArt(map.seed, false, painted, this.artSettings.groundPalette)
      : groundArt(map.seed);
    const earthTexture = grouped
      ? groupedGroundArt(map.seed, true, painted, this.artSettings.groundPalette)
      : earthArt(map.seed);
    for (let z = 0; z < map.height; z++)
      for (let x = 0; x < map.width; x++) {
        const terrain = map.terrain[map.tiles[z]![x]!]!.presentation;
        const px = x * tileSize,
          py = (map.height - 1 - z) * tileSize;
        if (terrain.style === 'liquid') {
          ctx.fillStyle = terrain.color;
          ctx.fillRect(px, py, tileSize, tileSize);
          for (let i = 0; i < 65; i++) {
            ctx.fillStyle =
              terrain.patternColors![Math.floor(rng() * terrain.patternColors!.length)]!;
            ctx.fillRect(px + rng() * tileSize, py + rng() * tileSize, 3 + rng() * 8, 1);
          }
        } else {
          const texture = terrain.style === 'earth' ? earthTexture : groundTexture;
          // Both treatments consume the same preparation randomness so river
          // marks and later glints stay in place during a matched comparison.
          const cropX = rng(),
            cropY = rng();
          ctx.drawImage(
            texture,
            grouped
              ? (x * tileSize) % texture.width
              : Math.floor(cropX * (texture.width - tileSize)),
            grouped
              ? ((map.height - 1 - z) * tileSize) % texture.height
              : Math.floor(cropY * (texture.height - tileSize)),
            tileSize,
            tileSize,
            px,
            py,
            tileSize,
            tileSize,
          );
          // Irregular shoreline lip stays inside the authoritative walkable bank tile.
          const neighbor = map.terrain[map.tiles[z]?.[x - 1] ?? '']?.presentation;
          if (neighbor?.style === 'liquid') {
            for (let p = 0; p < tileSize; p += 2) {
              ctx.fillStyle = neighbor.bankColors![0];
              ctx.fillRect(px, py + p, 2 + rng() * 5, 2);
              ctx.fillStyle = neighbor.bankColors![1];
              ctx.fillRect(px, py + p, 1, 2);
            }
          }
        }
      }
    const ground = this.material('#ffffff', source);
    this.prepareSurface(ground, 'ground');
    const mesh = groundMesh(this.app.graphicsDevice, map.spatial.surfaces, map.width, map.height);
    if (mesh) {
      this.geometryMeshes.push(mesh);
      const receiver = new pc.Entity('Supported ground', this.app);
      receiver.addComponent('render', {
        meshInstances: [new pc.MeshInstance(mesh, ground)],
        castShadows: true,
        receiveShadows: true,
      });
      this.landscape.addChild(receiver);
    }
    // Matching repeated soil carries the view beyond finite support, without a dark rectangular plate.
    const earth = this.material('#ffffff', groundTexture);
    earth.diffuseMap!.addressU = pc.ADDRESS_REPEAT;
    earth.diffuseMap!.addressV = pc.ADDRESS_REPEAT;
    earth.diffuseMapTiling.set(map.width / 16, map.height / 16);
    this.prepareSurface(earth, 'ground');
    earth.update();
    const surroundMesh = surroundingGroundMesh(
      this.app.graphicsDevice,
      map.spatial.surfaces,
      map.width,
      map.height,
    );
    if (surroundMesh) {
      this.geometryMeshes.push(surroundMesh);
      const surround = new pc.Entity('Surrounding forest floor', this.app);
      surround.addComponent('render', {
        meshInstances: [new pc.MeshInstance(surroundMesh, earth)],
        castShadows: false,
        receiveShadows: true,
      });
      this.landscape.addChild(surround);
    }
    const stone = this.material('#7b8178'),
      naturalStone = this.material('#747c70'),
      timber = this.material('#715438'),
      deck = this.material('#b48b57'),
      ramp = this.material('#8b8e7a');
    this.prepareSurface(stone, 'masonry');
    this.prepareSurface(naturalStone, 'stone');
    this.prepareSurface(timber, 'timber');
    this.prepareSurface(deck, 'timber');
    this.prepareSurface(ramp, 'stone');
    for (const material of [stone, naturalStone, timber, deck, ramp])
      setVisibilityStencil(material, sceneryStencil);
    this.structureMaterials = { stone, naturalStone, timber, deck, ramp };
    const liquidGlints = new Map<string, pc.StandardMaterial>();
    for (let i = 0; i < 36; i++) {
      const x = rng() * map.width,
        z = rng() * map.height;
      const terrainId = map.tiles[Math.round(z)]?.[Math.round(x)];
      const terrain = terrainId === undefined ? undefined : map.terrain[terrainId]?.presentation;
      if (terrain?.style !== 'liquid') continue;
      const support = map.spatial.surfaces.find((s) => s.terrain && surfaceContains(s, { x, z }));
      if (!support) continue;
      let glint = liquidGlints.get(terrainId!);
      if (!glint) {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 8;
        const context = canvas.getContext('2d')!;
        context.fillStyle = terrain.glintColors![0];
        context.fillRect(2, 3, 22, 1);
        context.fillStyle = terrain.glintColors![1];
        context.fillRect(8, 6, 22, 1);
        glint = this.material('#ffffff', canvas, true, true);
        liquidGlints.set(terrainId!, glint);
      }
      const y = surfaceHeight(support, x, z);
      const entity = this.primitive(
        'Liquid glint',
        'plane',
        glint,
        this.landscape,
        x,
        y + 0.012,
        z,
        0.3 + rng() * 0.5,
        1,
        0.15,
      );
      this.animations.push({ y, entity, x, z, phase: rng() * Math.PI * 2 });
    }
    this.landscapeMaterials = this.materials.slice(materialStart);
    this.updateLandscapeResources(map);
    if (started !== undefined && this.profiler?.isRecording()) {
      this.canvas.dataset.sceneryCount = String(map.spatial.scenery?.length ?? 0);
      this.canvas.dataset.landscapeBuildMs = String(Math.round(performance.now() - started));
      this.canvas.dataset.landscapeBuildCount = String(
        Number(this.canvas.dataset.landscapeBuildCount ?? 0) + 1,
      );
    }
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
    this.canvas.dataset.projection = this.cameraSettings.projection;
    this.canvas.dataset.cameraYaw = String(this.cameraSettings.yaw);
    this.canvas.dataset.cameraPitch = String(this.cameraSettings.pitch);
    if (
      this.orientedYaw !== this.cameraSettings.yaw ||
      this.orientedPitch !== this.cameraSettings.pitch
    ) {
      this.orientedYaw = this.cameraSettings.yaw;
      this.orientedPitch = this.cameraSettings.pitch;
      for (const card of this.cards.keys()) this.orientCard(card);
    }
  }
  private entityOpacity(entry: RenderedEntity): number {
    if (entry.departedAt !== undefined)
      return Math.max(0, 1 - (this.elapsed - entry.departedAt) / 0.4);
    return entry.observed ? 1 - (entry.view.departureProgress ?? 0) : 0.28;
  }
  private update(dt: number): void {
    if (this.suspended) return;
    const profileStarted = this.profiler?.begin();
    this.elapsed += Math.min(dt, 0.1);
    for (const [id, entry] of this.actors) {
      const opacity = this.entityOpacity(entry);
      if (entry.departedAt !== undefined && opacity === 0) {
        this.releaseEntity(entry);
        this.actors.delete(id);
        continue;
      }
      this.applyEntityOpacity(entry, opacity);
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
      const interpolating = this.movingEntries.has(entry.view.id);
      const position = interpolating ? entry.root.getPosition().clone() : entry.root.getPosition();
      const dx = interpolating ? entry.view.position.x - position.x : 0;
      const dy = interpolating ? entry.view.position.y - position.y : 0;
      const dz = interpolating ? entry.view.position.z - position.z : 0;
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
      if (interpolating && Math.abs(dx) + Math.abs(dy) + Math.abs(dz) <= 1e-6)
        this.movingEntries.delete(entry.view.id);
      this.updateModelVisibility(entry);
      if (entry.root.enabled) this.installSceneProp(entry);
      entry.model?.update(
        entry.view,
        dt,
        moving,
        !!this.view?.clock.paused || !!this.view?.clock.preparingNavigation,
        this.revealStrength(entry),
        this.selected === entry.view.id && this.identifiable(entry),
        this.artSettings,
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
        const animalStrike = entry.view.kind === 'animal' && punch?.kind === 'melee';
        if (moving || entry.lastMoving || animalStrike || entry.attackPose)
          this.orientCard(
            entry.sprite,
            animalStrike
              ? -0.12 * (punch.phase === 'windup' ? punch.progress : 1 - punch.progress)
              : entry.view.kind === 'actor' &&
                  !entry.view.statusEffects?.some((effect) => effect.pose === 'horizontal') &&
                  moving
                ? Math.sin(this.elapsed * 12) * 0.015
                : 0,
          );
        entry.attackPose = animalStrike;
        entry.lastMoving = moving;
        if (positionChanged) {
          const p = entry.root.getPosition();
          for (const mi of entry.sprite.render!.meshInstances)
            mi.setParameter('ol_spriteFoot', [p.x, p.y, p.z]);
        }
      }
      this.updateReadThrough(entry, dt);
    }
    const selected = this.selected ? this.actors.get(this.selected) : undefined;
    if (this.selected && !selected?.observed) {
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
      this.perception.moveOrigin(position);
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
    this.vegetationBodies.length = 0;
    for (const entry of this.actors.values())
      if (
        entry.observed &&
        entry.root.enabled &&
        (entry.view.kind === 'actor' || entry.view.kind === 'animal')
      ) {
        const p = entry.root.getPosition();
        this.vegetationBodies.push({ x: p.x, y: p.y, z: p.z, radius: entry.width * 0.65 + 0.3 });
      }
    this.vegetation.update(dt, this.vegetationBodies, {
      mode: this.artSettings.vegetation,
      paused: !!this.view?.clock.paused,
      reducedMotion: document.documentElement.dataset.reduceMotion === 'true',
    });
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
      const point = entry.model?.visible
        ? entry.model.screenPoint(head)
        : this.camera.camera!.worldToScreen(head);
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
    const age = performance.now() - this.hoverStarted;
    const fade =
      !hoverValid || (!this.targeting && age <= WORLD_HOVER_DELAY_MS)
        ? 0
        : document.documentElement.dataset.reduceMotion === 'true'
          ? 1
          : this.targeting
            ? 1
            : Math.min(1, (age - WORLD_HOVER_DELAY_MS) / WORLD_HOVER_FADE_MS);
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
          wave.y + 0.012,
          wave.z,
        );
    this.profiler?.update(profileStarted);
  }
  private revealStrength(entry: RenderedEntity): number {
    const view = this.view;
    if (!view || !entry.observed || !entry.root.enabled) return 0;
    // The modifier broadens presentation only to this already-permitted projection.
    // Reuse the same GPU scenery mask; never discover targets or scan target × blocker pairs.
    if (this.revealHeld) return 0.95;
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
  private updateReadThrough(entry: RenderedEntity, dt: number, immediate = false): void {
    this.presentation.updateReveal(
      entry.reveal,
      entry.materials[Math.max(0, entry.lastFrame) % entry.materials.length]!,
      entry.root.getPosition(),
      this.cards.get(entry.sprite)?.horizontalHeight === undefined ? entry.width : entry.height,
      this.cards.get(entry.sprite)?.horizontalHeight ?? entry.height,
      this.revealStrength(entry),
      dt,
      entry.observed && entry.root.enabled && !entry.model?.visible,
      this.selected === entry.view.id && this.identifiable(entry),
      immediate,
    );
  }
  private updateCursor(): void {
    this.canvas.style.cursor =
      this.drag?.moved && this.drag.pan
        ? 'grabbing'
        : this.targeting || this.constructionPlacement
          ? 'crosshair'
          : this.commandHeld
            ? 'pointer'
            : '';
  }
  private setModifiers(command: boolean, reveal: boolean): void {
    if (this.commandHeld !== command) {
      this.commandHeld = command;
      if (!command && this.drag?.primaryAction) this.cancelDrag();
      this.updateCursor();
      if (this.hoverPoint && !this.drag) {
        const rect = this.canvas.getBoundingClientRect();
        this.publishHover(
          this.hoverEntity(this.hoverPoint.x - rect.left, this.hoverPoint.y - rect.top),
          this.hoverPoint,
        );
      }
    }
    if (this.revealHeld === reveal) return;
    this.revealHeld = reveal;
    this.canvas.dataset.revealing = String(reveal);
    // Reconcile once on the gesture boundary, including when suspension stops updates.
    // Releasing Option restores the configured appearance without a stuck paused frame.
    for (const entry of this.actors.values()) {
      this.updateReadThrough(entry, 0, true);
      entry.model?.setReadThrough(this.revealStrength(entry));
    }
    this.app.renderNextFrame = true;
  }
  private modifierKey = (event: KeyboardEvent): void => {
    if (this.suspended || uiOwnsShortcut(event)) {
      this.setModifiers(false, false);
      return;
    }
    this.setModifiers(event.metaKey, event.altKey);
  };
  private focusChanged = (event: FocusEvent): void => {
    if (event.target !== this.canvas) this.setModifiers(false, false);
  };
  private leaveCanvas = (): void => {
    this.clearHover();
    if (!this.drag) this.setModifiers(false, false);
  };
  private visibilityChanged = (): void => {
    this.resetFrameRate();
    if (document.visibilityState !== 'visible') this.blur();
  };
  private updateModelVisibility(entry: RenderedEntity): void {
    if (!entry.model) return;
    const supported =
      entry.observed &&
      entry.root.enabled &&
      !entry.view.bodyState &&
      !entry.view.statusEffects?.some((effect) => effect.pose === 'horizontal') &&
      !entry.view.actionAnimation &&
      entry.view.departureProgress === undefined;
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
    const primary = this.commandHeld && !this.targeting && !this.constructionPlacement;
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
      this.lastHover.y === point.y &&
      this.lastHover.primary === primary
    )
      return;
    this.lastHover = { entity, ...point, primary };
    this.callbacks.hover(entity, point, primary);
  }
  private clearHover = (): void => {
    this.hoverPoint = null;
    this.publishHover(null, { x: 0, y: 0 });
    this.outline?.update([], 0, true);
  };
  private screenRay(
    x: number,
    y: number,
  ): { from: pc.Vec3; to: pc.Vec3; screenX: number; screenY: number } {
    const camera = this.camera.camera!;
    // Camera commands can arrive before the engine refreshes its cached view.
    // Use the current transform so picking agrees with the character image now.
    const inverse = new pc.Mat4()
      .mul2(camera.projectionMatrix, this.camera.getWorldTransform().clone().invert())
      .invert();
    const viewport = this.app.graphicsDevice.clientRect;
    const rect = camera.rect;
    const clipX = ((x - rect.x * viewport.width) / (rect.z * viewport.width)) * 2 - 1;
    const clipY =
      1 - ((y - (1 - rect.y - rect.w) * viewport.height) / (rect.w * viewport.height)) * 2;
    const endpoint = (z: number): pc.Vec3 => {
      const point = inverse.transformVec4(new pc.Vec4(clipX, clipY, z, 1));
      return new pc.Vec3(point.x / point.w, point.y / point.w, point.z / point.w);
    };
    return {
      from: endpoint(-1),
      to: endpoint(1),
      screenX: x,
      screenY: y,
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
    if (binding.horizontalHeight !== undefined)
      return { point: new pc.Vec3().lerp(ray.from, ray.to, t), fraction: t };
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
  private cameraObstruction(ray: {
    from: pc.Vec3;
    to: pc.Vec3;
    screenX?: number;
    screenY?: number;
  }): number {
    if (!this.view) return 0;
    let obstruction = rayHits(this.view.map, ray.from, ray.to, 'sight')[0]?.fraction ?? Infinity;
    // One neighboring framebuffer pixel supplies the opacity-map footprint.
    // Retain the originating pointer coordinates rather than project through a
    // potentially stale engine view cache immediately after a camera command.
    const screen =
      ray.screenX === undefined || ray.screenY === undefined
        ? this.camera.camera!.worldToScreen(ray.from)
        : { x: ray.screenX, y: ray.screenY };
    const device = this.app.graphicsDevice;
    const scale =
      this.artSettings.sceneGrid === 'half'
        ? 0.5
        : this.artSettings.sceneGrid === 'third'
          ? 1 / 3
          : 1;
    const differentials = {
      x: this.screenRay(screen.x + device.clientRect.width / (device.width * scale), screen.y),
      y: this.screenRay(screen.x, screen.y + device.clientRect.height / (device.height * scale)),
    };
    for (const shape of this.landscapeOcclusion) {
      const hit = shape.hit(ray.from, ray.to, differentials);
      if (hit !== null) obstruction = Math.min(obstruction, hit);
    }
    // Decorative canopies obstruct the camera but never grant or remove bodily perception.
    for (const group of this.sceneryGroups.values())
      for (const card of group.cards) {
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
      if (entry.view.assembly) {
        for (const shape of entry.view.assembly.shapes) {
          const hit = shape.panel
            ? (panelRayFraction(shape.panel, ray.from, ray.to) ?? null)
            : intersectBox(ray.from, ray.to, { min: shape.min, max: shape.max });
          if (hit !== null && (fraction === null || hit < fraction)) fraction = hit;
        }
      } else if (entry.model?.visible) {
        const hit = entry.model.hit(ray.from, ray.to);
        fraction = hit?.fraction ?? null;
        bodyPoint = hit?.point;
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
        const width = entry.model?.visible ? entry.model.width : entry.width;
        const q = entry.model?.visible
          ? 0
          : Math.hypot(
              (hit.x - foot.x) / Math.max(width * 0.7, 0.1),
              (hit.y - foot.y - height / 2) / Math.max(height * 0.65, 0.1),
              (hit.z - foot.z) / Math.max(width * 0.7, 0.1),
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
    const obstruction = rayHits(this.view.map, ray.from, ray.to, 'sight')[0]?.fraction ?? Infinity;
    const hit = pickSurfaces(this.view.map, ray.from, ray.to, null)[0];
    return hit && hit.fraction <= obstruction + 1e-4 ? hit.point : null;
  }
  private local(event: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  private pointerDown = (event: PointerEvent): void => {
    if (!this.view || this.suspended) {
      // A rejected press must not open a delayed native menu after the first view arrives.
      this.pointerContextHandled = true;
      return;
    }
    if (event.button > 2 || this.drag) return;
    this.canvas.focus({ preventScroll: true });
    this.setModifiers(event.metaKey, event.altKey);
    this.pointerContextHandled = false;
    // macOS Control-click is a context gesture even when reported as primary.
    if (event.button === 0 && event.ctrlKey) return;
    this.drag = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      button: event.button,
      // Track primary drags to suppress release actions, without moving the camera.
      pan: event.button !== 0,
      orbit: event.button === 2 && !event.shiftKey,
      moved: false,
      primaryAction: event.button === 0 && event.metaKey,
    };
    if (this.drag.primaryAction && !this.targeting && !this.constructionPlacement) {
      const point = this.local(event),
        entry = this.pick(point.x, point.y);
      if (entry && this.identifiable(entry))
        this.drag.primaryGesture = this.callbacks.beginPrimaryAction(entry.view) ?? undefined;
    }
    this.canvas.setPointerCapture(event.pointerId);
    this.publishHover(null, { x: event.clientX, y: event.clientY });
  };
  private pointerMove = (event: PointerEvent): void => {
    if (this.suspended) return;
    if (document.activeElement === this.canvas || document.activeElement === document.body)
      this.setModifiers(event.metaKey, event.altKey);
    this.hoverPoint = { x: event.clientX, y: event.clientY };
    const drag = this.drag;
    if (this.constructionPlacement && !drag && event.timeStamp - this.placementSampleTime >= 40) {
      this.placementSampleTime = event.timeStamp;
      const local = this.local(event);
      const point = this.groundPoint(local.x, local.y);
      this.constructionPlacement.move(point);
    }
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
    this.cancelDrag(true);
    if (drag.moved || event.button !== drag.button) {
      this.callbacks.cancelPrimaryAction();
      return;
    }
    if (drag.button === 2) {
      if (this.constructionPlacement) {
        this.constructionPlacement.cancel();
        return;
      }
      this.openContextMenu(event);
      return;
    }
    if (drag.button !== 0 || event.ctrlKey) {
      this.callbacks.cancelPrimaryAction();
      return;
    }
    const local = this.local(event);
    if (this.constructionPlacement) {
      const point = this.groundPoint(local.x, local.y);
      this.constructionPlacement.move(point);
      if (point) this.constructionPlacement.place();
      return;
    }
    const entry = this.pick(local.x, local.y);
    if (entry && !this.identifiable(entry)) {
      this.denySelection();
      return;
    }
    if (this.targeting) {
      if (entry) this.callbacks.target(entry.view);
      return;
    }
    if (drag.primaryAction) {
      if (entry && event.metaKey && drag.primaryGesture)
        this.callbacks.commitPrimaryAction(drag.primaryGesture, entry.view);
      else this.callbacks.cancelPrimaryAction();
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
    if (
      event.defaultPrevented ||
      event.isComposing ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    )
      return;
    const delta = Math.PI / 8;
    if (
      this.constructionPlacement &&
      (event.code === 'KeyQ' ||
        event.code === 'KeyE' ||
        event.key === 'Escape' ||
        event.key === 'Enter' ||
        event.key.startsWith('Arrow'))
    ) {
      if (event.key === 'Escape') this.constructionPlacement.cancel();
      else if (event.key === 'Enter') {
        if (!event.repeat) this.constructionPlacement.place();
      } else if (event.key.startsWith('Arrow')) {
        const point = this.constructionPlacement.position();
        const screen = this.camera.camera!.worldToScreen(new pc.Vec3(point.x, point.y, point.z));
        const next = this.groundPoint(
          screen.x + (event.key === 'ArrowLeft' ? -16 : event.key === 'ArrowRight' ? 16 : 0),
          screen.y + (event.key === 'ArrowUp' ? -16 : event.key === 'ArrowDown' ? 16 : 0),
        );
        this.constructionPlacement.move(next);
      } else this.constructionPlacement.rotate(event.code === 'KeyQ' ? -1 : 1);
    } else if (event.shiftKey && event.key.startsWith('Arrow')) {
      // Keyboard panning follows the same screen-space command as dragging;
      // it never moves the character or grants additional perception.
      this.cameraCommand({
        type: 'pan',
        dx: event.key === 'ArrowLeft' ? 48 : event.key === 'ArrowRight' ? -48 : 0,
        dy: event.key === 'ArrowUp' ? 48 : event.key === 'ArrowDown' ? -48 : 0,
        viewportHeight: this.canvas.clientHeight,
      });
    } else if (event.key === 'Home') this.center();
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
      this.cameraCommand({
        type: 'orbit',
        yaw: event.key === 'ArrowLeft' ? -delta : delta,
        pitch: 0,
      });
    else if (event.key === 'ArrowUp' || event.key === 'ArrowDown')
      this.cameraCommand({ type: 'orbit', yaw: 0, pitch: event.key === 'ArrowUp' ? 0.12 : -0.12 });
    else return;
    event.preventDefault();
    event.stopPropagation();
  };
  private cancelDrag(releasing = false): void {
    const drag = this.drag;
    this.drag = null;
    this.updateCursor();
    if (!drag) return;
    if (!releasing || drag.moved) this.callbacks.cancelPrimaryAction();
    if (drag.button === 2) this.pointerContextHandled = true;
    this.saveCameraPreferences();
    if (this.canvas.hasPointerCapture(drag.pointerId))
      this.canvas.releasePointerCapture(drag.pointerId);
  }
  private pointerCancel = (event: PointerEvent): void => {
    if (event.pointerId === this.drag?.pointerId) {
      this.setModifiers(false, false);
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
    if (!this.view) return;
    if (this.constructionPlacement) {
      this.constructionPlacement.cancel();
      return;
    }
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
    // Resolve the object as the player saw it at the click. Clearing held Option
    // first would make a revealed object unpickable before its menu could open.
    this.setModifiers(false, false);
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
    this.setModifiers(false, false);
    this.clearHover();
    this.cancelDrag();
  };
  destroy(): void {
    this.removeArtControls?.();
    this.vegetation.clear();
    this.landscapeOcclusion.length = 0;
    if (this.destroyed) return;
    this.destroyed = true;
    this.suspended = true;
    this.app.autoRender = false;
    pc.AppBase.cancelTick(this.app);
    this.canvas.dataset.ready = 'false';
    this.resizeObserver?.disconnect();
    this.canvas.removeEventListener('pointerdown', this.pointerDown);
    this.canvas.removeEventListener('pointermove', this.pointerMove);
    this.canvas.removeEventListener('pointerleave', this.leaveCanvas);
    this.canvas.removeEventListener('pointerup', this.pointerUp);
    this.canvas.removeEventListener('pointercancel', this.pointerCancel);
    this.canvas.removeEventListener('lostpointercapture', this.pointerCancel);
    this.canvas.removeEventListener('contextmenu', this.contextMenu);
    this.canvas.removeEventListener('wheel', this.wheel);
    this.canvas.removeEventListener('keydown', this.cameraKey);
    this.canvas.removeEventListener('blur', this.blur);
    window.removeEventListener('keydown', this.modifierKey);
    window.removeEventListener('keyup', this.modifierKey);
    document.removeEventListener('focusin', this.focusChanged);
    window.removeEventListener('blur', this.blur);
    document.removeEventListener('visibilitychange', this.visibilityChanged);
    this.app.off('postrender', this.recordFrame);
    this.app.off('framerender', this.prepareRender);
    this.app.off('postrender', this.finishRender);
    this.app.graphicsDevice.off('devicelost', this.resetRenderQueue);
    this.pendingFrames.clear();
    this.redrawPending = false;
    this.cancelDrag();
    this.shadowBatches?.destroy();
    this.hoveredId = null;
    this.hoverPoint = null;
    this.outline?.destroy();
    for (const resource of this.structures.values()) this.releaseLandscapeResource(resource);
    for (const resource of this.sceneryGroups.values()) this.releaseLandscapeResource(resource);
    this.structures.clear();
    this.sceneryGroups.clear();
    this.landscape?.destroy();
    for (const mesh of this.geometryMeshes) mesh.destroy();
    this.geometryMeshes = [];
    for (const entry of this.actors.values()) {
      entry.model?.destroy();
      entry.sceneProp?.destroy();
      this.presentation?.removeReveal(entry.reveal);
    }
    this.presentation?.destroy();
    const propParsing = this.sceneProps?.destroy();
    const mercenaryParsing = this.mercenary?.destroy();
    const animalParsing = this.libraryActors?.destroy();
    this.landscape?.destroy();
    this.libraryScenery?.destroy();
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
    this.profiler?.destroy();
    this.setConstructionPreview(null);
    destroyModelApplication(this.app, [propParsing, mercenaryParsing, animalParsing]);
  }
}

export function createWorldRenderer(
  canvas: HTMLCanvasElement,
  callbacks: SceneCallbacks,
): WorldRenderer {
  return new WildernessScene(canvas, callbacks);
}
