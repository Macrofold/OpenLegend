import * as pc from 'playcanvas';
import type { EntityView, GameView, Position } from '@open-legend/protocol';
import { playerEntity } from './entity-view';
import { VisionBlur, VISION_FOCUS } from './vision-blur';
import { CharacterStatuses } from './character-status';
import {
  animalArt,
  earthArt,
  fireArt,
  groundArt,
  personArt,
  random,
  resourceArt,
  shadowArt,
  treeArt,
} from './art';

interface RenderedEntity {
  observed: boolean;
  root: pc.Entity;
  sprite: pc.Entity;
  shadow: pc.Entity;
  view: EntityView;
  materials: pc.StandardMaterial[];
  lastFrame: number;
  facing: number;
  width: number;
  height: number;
}
export interface SceneCallbacks {
  select(entity: EntityView | null, at?: { x: number; y: number }, ground?: Position): void;
  move(position: Position): void;
  hover(entity: EntityView | null, at: { x: number; y: number }): void;
}
/** Presentation only. Entity positions, terrain and all interactions come from the public projection. */
export class WildernessScene {
  readonly app: pc.Application;
  private camera!: pc.Entity;
  private landscape!: pc.Entity;
  private actors = new Map<string, RenderedEntity>();
  private textures: pc.Texture[] = [];
  private materials: pc.StandardMaterial[] = [];
  private target = new pc.Vec3(12, 0, 12);
  private selected: string | null = null;
  private marker: pc.Entity;
  private destination: pc.Entity;
  private markerUntil = 0;
  private elapsed = 0;
  private view: GameView | null = null;
  private mapKey = '';
  private zoom = 12;
  private initialized = false;
  private visionBlur: VisionBlur;
  readonly statuses: CharacterStatuses;
  private drag: {
    pointerId: number;
    x: number;
    y: number;
    button: number;
    pan: boolean;
    moved: boolean;
  } | null = null;
  // Some browsers emit contextmenu on press, others after release. Pointer
  // gestures own their menu; suppress that native duplicate until the next press.
  private pointerContextHandled = false;
  private resizeObserver?: ResizeObserver;
  private destroyed = false;
  private readyRequested = false;
  private hoverPoint: { x: number; y: number } | null = null;
  private animations: Array<{ entity: pc.Entity; x: number; z: number; phase: number }> = [];

  constructor(
    private canvas: HTMLCanvasElement,
    private callbacks: SceneCallbacks,
  ) {
    this.app = new pc.Application(canvas, {
      graphicsDeviceOptions: {
        alpha: false,
        antialias: false,
        powerPreference: 'high-performance',
      },
    });
    this.canvas.dataset.ready = 'false';
    this.visionBlur = new VisionBlur(canvas);
    this.statuses = new CharacterStatuses(canvas);
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
        orthoHeight: this.zoom,
        nearClip: 0.1,
        farClip: 150,
      });
      this.app.root.addChild(this.camera);
      const sun = new pc.Entity('Afternoon sun', this.app);
      sun.addComponent('light', {
        type: 'directional',
        color: new pc.Color(1, 0.91, 0.72),
        intensity: 1.1,
        castShadows: true,
        shadowResolution: 1024,
        shadowDistance: 60,
        normalOffsetBias: 0.04,
      });
      sun.setEulerAngles(52, -32, 0);
      this.app.root.addChild(sun);
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

  setView(view: GameView): void {
    this.view = view;
    const key = `${view.worldId}:${view.map.seed}:${view.map.width}:${view.map.height}`;
    if (this.mapKey !== key) {
      for (const entry of this.actors.values()) entry.root.destroy();
      this.actors.clear();
      this.mapKey = key;
      this.buildLandscape(view.map);
    }
    if (!this.initialized) {
      this.target.set(view.player.position.x, 0, view.player.position.z - 1);
      this.initialized = true;
      this.placeCamera();
    }
    const entities = [
      ...view.entities.filter((entity) => entity.id !== view.player.id),
      playerEntity(view),
    ];
    const visible = new Set(entities.map((entity) => entity.id));
    for (const [id, entry] of this.actors)
      if (!visible.has(id)) {
        const distance = Math.hypot(
          entry.view.position.x - view.player.position.x,
          entry.view.position.z - view.player.position.z,
        );
        if (distance <= view.vision.radius) {
          // Absence inside current sight means it really disappeared/changed.
          entry.root.destroy();
          this.actors.delete(id);
        } else {
          // Only retain the last permitted image; never predict hidden movement.
          entry.observed = false;
          entry.root.setPosition(entry.view.position.x, 0, entry.view.position.z);
        }
      }
    for (const entity of entities) {
      let entry = this.actors.get(entity.id);
      const signature = `${entity.kind}:${entity.subtype}:${entity.status === 'Dead'}:${entity.kind === 'actor' && entity.id === view.player.id && view.player.inventory.some((item) => item.equipped)}`;
      if (entry && entry.root.tags.list()[0] !== signature) {
        entry.root.destroy();
        this.actors.delete(entity.id);
        entry = undefined;
      }
      if (!entry) {
        entry = this.makeEntity(entity, view);
        entry.root.tags.add(signature);
        this.actors.set(entity.id, entry);
      }
      entry.view = entity;
      entry.observed = true;
    }
    // A bounded, session-only visual memory; never a second source of live facts.
    const remembered = [...this.actors].filter(([, entry]) => !entry.observed);
    for (const [id, entry] of remembered.slice(0, Math.max(0, remembered.length - 128))) {
      entry.root.destroy();
      this.actors.delete(id);
    }
    this.statuses.observe(view);
    if (!this.readyRequested) {
      this.readyRequested = true;
      // An existing WebGL context alone does not prove that the world rendered.
      this.app.once('frameend', () => {
        if (!this.destroyed) this.canvas.dataset.ready = 'true';
      });
    }
  }

  select(id: string | null): void {
    this.selected = id;
  }
  center(): void {
    if (this.view) {
      this.target.set(this.view.player.position.x, 0, this.view.player.position.z - 1);
      this.placeCamera();
    }
  }
  setZoom(delta: number): void {
    this.zoom = pc.math.clamp(this.zoom + delta, 6, 25);
    this.camera.camera!.orthoHeight = this.zoom;
  }
  screenPosition(id: string): { x: number; y: number } | null {
    const entry = this.actors.get(id);
    if (!entry || !this.identifiable(entry)) return null;
    const point = this.camera.camera!.worldToScreen(
      entry.root
        .getPosition()
        .clone()
        .add(new pc.Vec3(0, entry.height + 0.1, 0)),
    );
    return { x: point.x, y: point.y };
  }

  /** Anchor to the rendered sprite's top edge, including its tilt/animation. */
  private statusAnchor(id: string): { x: number; y: number } | null {
    const entry = this.actors.get(id);
    if (!entry || !this.identifiable(entry)) return null;
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

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    // CSS owns display size. resizeCanvas rewrites it using KEEP_ASPECT and
    // feeds rounded backing-buffer dimensions into this observer repeatedly.
    // Only resize the rendering buffer so viewport changes cannot drift or crop.
    this.app.setCanvasResolution(
      pc.RESOLUTION_FIXED,
      Math.max(1, Math.round(rect.width * 0.8)),
      Math.max(1, Math.round(rect.height * 0.8)),
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
    const material = new pc.StandardMaterial();
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
        material.blendType = pc.BLEND_NORMAL;
        material.depthWrite = true;
      }
    }
    if (unlit) {
      material.useLighting = false;
      material.emissive.copy(material.diffuse);
      if (source) material.emissiveMap = material.diffuseMap;
      material.diffuse.set(0, 0, 0);
    }
    material.cull = pc.CULLFACE_NONE;
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
  ): pc.Entity {
    // Plane tilted toward fixed elevated camera, with lower edge touching the ground.
    const sprite = this.primitive(
      name,
      'plane',
      material,
      parent,
      x,
      y + height * 0.4,
      z - height * 0.3,
      width,
      1,
      height,
    );
    sprite.setEulerAngles(53, 0, 0);
    return sprite;
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
  private makeEntity(view: EntityView, game: GameView): RenderedEntity {
    const root = new pc.Entity(view.name, this.app);
    this.app.root.addChild(root);
    root.setPosition(view.position.x, 0, view.position.z);
    let width = 1.1,
      height = 1.4,
      art: HTMLCanvasElement[];
    if (view.kind === 'actor') {
      width = 1.05;
      height = 2.1;
      const equipped =
        view.id === game.player.id && game.player.inventory.some((item) => item.equipped);
      art = [0, 1, 2].map((frame) => personArt(view.id !== game.player.id, frame, equipped));
    } else if (view.kind === 'animal' || view.kind === 'remains') {
      const deer = /deer/i.test(view.subtype + view.name);
      width = deer ? 2.3 : 1.25;
      height = deer ? 1.9 : 1.05;
      art = [0, 2, -2].map((frame) =>
        animalArt(deer, frame, view.kind === 'remains' || view.status === 'Dead'),
      );
    } else if (view.kind === 'station') {
      width = 1.5;
      height = 1.65;
      art = [0, 1, 2].map(fireArt);
    } else {
      width = 1.9;
      height = 1.6;
      art = [
        resourceArt(
          view.subtype + view.name,
          view.id.split('').reduce((sum, letter) => sum + letter.charCodeAt(0), 0),
        ),
      ];
    }
    const materials = art.map((source) => this.material('#ffffff', source, true, true));
    const shadow = this.primitive(
      'Contact shadow',
      'plane',
      this.material('#ffffff', shadowArt(), true, true),
      root,
      0,
      0.025,
      0,
      width * 0.9,
      1,
      width * 0.6,
    );
    const sprite = this.billboard(view.name, materials[0]!, root, 0, 0.04, 0, width, height);
    if (view.kind === 'remains' || view.status === 'Dead') sprite.setLocalEulerAngles(53, 0, 75);
    return {
      root,
      sprite,
      shadow,
      view,
      materials,
      lastFrame: -1,
      facing: 1,
      width,
      height,
      observed: true,
    };
  }
  private buildLandscape(map: GameView['map']): void {
    this.landscape.destroy();
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
    const ground = this.material('#ffffff', source, false, true);
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
    const rockMaterial = this.material('#ffffff', undefined, false, true);
    rockMaterial.emissiveVertexColor = true;
    rockMaterial.update();
    for (const obstacle of map.obstacles) {
      if (obstacle.kind === 'rock') {
        this.rock(obstacle.x, obstacle.z, rng, rockMaterial);
        this.primitive(
          'Stone contact shadow',
          'plane',
          this.material('#ffffff', shadowArt(), true, true),
          this.landscape,
          obstacle.x + 0.2,
          0.018,
          obstacle.z + 0.2,
          1.8,
          1,
          1.5,
        );
      }
    }
    // Large woodland silhouettes remain outside the playable map; they imply no hidden collision.
    const trees = [0, 1, 2, 3].map((i) =>
      this.material('#ffffff', treeArt(map.seed + i * 19), true, true),
    );
    const shade = this.material('#ffffff', shadowArt(), true, true);
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
      this.primitive('Tree shade', 'plane', shade, this.landscape, x + 1, 0.009, z + 1, 6, 1, 4);
      this.billboard(
        'Woodland canopy',
        trees[i % trees.length]!,
        this.landscape,
        x,
        0,
        z,
        h * 0.83,
        h,
      );
    }
    // Ground-height texture detail is decorative and does not obstruct movement.
    const tuft = this.material('#ffffff', resourceArt('grass', map.seed), true, true);
    for (let i = 0; i < 210; i++) {
      const x = rng() * (map.width - 1),
        z = rng() * (map.height - 1);
      if (map.tiles[Math.round(z)]?.[Math.round(x)] !== 'grass') continue;
      const h = 0.16 + rng() * 0.28;
      this.billboard('Meadow grass', tuft, this.landscape, x, 0, z, h * 1.5, h);
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
      this.animations.push({ entity, x, z, phase: rng() * Math.PI * 2 });
    }
  }
  private rock(x: number, z: number, rng: () => number, material: pc.StandardMaterial): void {
    // Hand-shaped faceted volume, with per-face stone tones; no smooth toy-like spheres.
    const lower: number[][] = [],
      upper: number[][] = [];
    for (let i = 0; i < 7; i++) {
      const angle = (i * Math.PI * 2) / 7;
      const radius = 0.48 + rng() * 0.12;
      lower.push([Math.cos(angle) * radius, 0.03, Math.sin(angle) * radius]);
      upper.push([
        Math.cos(angle) * radius * 0.72,
        0.35 + rng() * 0.23,
        Math.sin(angle) * radius * 0.68,
      ]);
    }
    const positions: number[] = [],
      colors: number[] = [];
    const peak = [0.02, 0.67 + rng() * 0.2, -0.06];
    const palette = [
      [111, 126, 108],
      [138, 145, 124],
      [162, 165, 141],
      [121, 135, 116],
      [151, 158, 133],
    ];
    const triangle = (a: number[], b: number[], c: number[], shade: number): void => {
      positions.push(...a, ...b, ...c);
      const color = palette[shade % palette.length]!;
      for (let i = 0; i < 3; i++) colors.push(color[0]!, color[1]!, color[2]!, 255);
    };
    for (let i = 0; i < 7; i++) {
      const n = (i + 1) % 7;
      triangle(lower[i]!, upper[i]!, lower[n]!, i);
      triangle(lower[n]!, upper[i]!, upper[n]!, i);
      triangle(upper[i]!, peak, upper[n]!, i + 2);
    }
    const mesh = new pc.Mesh(this.app.graphicsDevice);
    mesh.setPositions(positions);
    mesh.setColors32(colors);
    const indices = positions.map((_, index) => index).slice(0, positions.length / 3);
    mesh.setNormals(pc.calculateNormals(positions, indices));
    mesh.update();
    const entity = new pc.Entity('Weathered stone', this.app);
    entity.addComponent('render', {
      meshInstances: [new pc.MeshInstance(mesh, material)],
      castShadows: true,
    });
    entity.setPosition(x, 0, z);
    entity.setEulerAngles(0, rng() * 180, 0);
    this.landscape.addChild(entity);
  }
  private placeCamera(): void {
    this.camera.setPosition(this.target.x, 34, this.target.z + 28);
    this.camera.lookAt(this.target);
    this.camera.camera!.orthoHeight = this.zoom;
  }
  private update(dt: number): void {
    this.elapsed += Math.min(dt, 0.1);
    for (const entry of this.actors.values()) {
      if (!entry.observed) continue;
      const position = entry.root.getPosition().clone();
      const dx = entry.view.position.x - position.x;
      const dz = entry.view.position.z - position.z;
      const moving = Math.abs(dx) + Math.abs(dz) > 0.025;
      if (Math.abs(dx) > 0.012) entry.facing = dx < 0 ? -1 : 1;
      position.x += dx * Math.min(1, dt * 13);
      position.z += dz * Math.min(1, dt * 13);
      entry.root.setPosition(position);
      const animated = entry.view.kind === 'station' || moving;
      const frame =
        animated && !this.view?.clock.paused
          ? 1 + (Math.floor(this.elapsed * (entry.view.kind === 'station' ? 4 : 6)) % 2)
          : 0;
      if (frame !== entry.lastFrame) {
        entry.sprite.render!.material = entry.materials[frame % entry.materials.length]!;
        entry.lastFrame = frame;
      }
      entry.sprite.setLocalScale(entry.width * entry.facing, 1, entry.height);
      if (entry.view.kind === 'actor')
        entry.sprite.setLocalPosition(
          0,
          0.04 + entry.height * 0.4 + (moving ? Math.sin(this.elapsed * 12) * 0.015 : 0),
          -entry.height * 0.3,
        );
    }
    const selected = this.selected ? this.actors.get(this.selected) : undefined;
    this.marker.enabled = !!selected && this.identifiable(selected);
    if (selected && this.identifiable(selected)) {
      const p = selected.root.getPosition();
      this.marker.setPosition(p.x, 0.035, p.z);
      const scale = Math.max(1.1, selected.view.radius * 2.6);
      this.marker.setLocalScale(scale, 1, scale);
      this.marker.setEulerAngles(0, this.elapsed * 8, 0);
    }
    this.destination.enabled = this.elapsed < this.markerUntil;
    const player = this.view && this.actors.get(this.view.player.id);
    if (player && this.view) {
      const position = player.root.getPosition();
      const projection = this.camera.camera!;
      const center = projection.worldToScreen(position);
      const xEdge = projection.worldToScreen(
        position.clone().add(new pc.Vec3(this.view.vision.radius, 0, 0)),
      );
      const zEdge = projection.worldToScreen(
        position.clone().add(new pc.Vec3(0, 0, this.view.vision.radius)),
      );
      this.visionBlur.update(
        center.x,
        center.y,
        Math.abs(xEdge.x - center.x),
        Math.abs(zEdge.y - center.y),
      );
    }
    this.statuses.update((id) => this.statusAnchor(id));
    // Reevaluate stationary pointers as actors move or the camera changes.
    if (this.hoverPoint && !this.drag) {
      const rect = this.canvas.getBoundingClientRect();
      this.callbacks.hover(
        this.pick(this.hoverPoint.x - rect.left, this.hoverPoint.y - rect.top),
        this.hoverPoint,
      );
    }
    for (const wave of this.animations)
      if (!this.view?.clock.paused)
        wave.entity.setPosition(
          wave.x + Math.sin(this.elapsed * 0.7 + wave.phase) * 0.12,
          0.012,
          wave.z,
        );
  }
  private identifiable(entry: RenderedEntity): boolean {
    const player = this.view && this.actors.get(this.view.player.id);
    if (!entry.observed || !player || !this.view) return false;
    // Fully obscured pixels must not reveal an identity through picking. This
    // presentation restriction only narrows the server's permitted observation.
    return (
      entry.root.getPosition().distance(player.root.getPosition()) <
      this.view.vision.radius * VISION_FOCUS.obscuredFraction
    );
  }
  private clearHover = (): void => {
    this.hoverPoint = null;
    this.callbacks.hover(null, { x: 0, y: 0 });
  };
  private pick(x: number, y: number): EntityView | null {
    let best: EntityView | null = null,
      distance = Infinity,
      depth = Infinity;
    for (const entry of this.actors.values()) {
      if (!this.identifiable(entry)) continue;
      const foot = this.camera.camera!.worldToScreen(entry.root.getPosition());
      // Pick the visible tilted sprite, not an estimated vertical actor capsule.
      // A capsule missed the upper part of resources and people's heads.
      const transform = entry.sprite.getWorldTransform();
      const corners = [
        new pc.Vec3(-0.5, 0, -0.5),
        new pc.Vec3(0.5, 0, -0.5),
        new pc.Vec3(-0.5, 0, 0.5),
        new pc.Vec3(0.5, 0, 0.5),
      ].map((corner) => this.camera.camera!.worldToScreen(transform.transformPoint(corner)));
      const left = Math.min(foot.x - 12, ...corners.map((corner) => corner.x)) - 3;
      const right = Math.max(foot.x + 12, ...corners.map((corner) => corner.x)) + 3;
      const top = Math.min(...corners.map((corner) => corner.y)) - 3;
      const bottom = Math.max(foot.y + 6, ...corners.map((corner) => corner.y)) + 3;
      if (x >= left && x <= right && y >= top && y <= bottom) {
        const d = Math.hypot(x - foot.x, y - (top + bottom) / 2);
        const spriteDepth = entry.sprite
          .getPosition()
          .clone()
          .sub(this.camera.getPosition())
          .dot(this.camera.forward);
        // Overlapping silhouettes belong to the visible foreground sprite;
        // proximity to a background resource's center must not steal the click.
        if (spriteDepth < depth - 0.01 || (Math.abs(spriteDepth - depth) <= 0.01 && d < distance)) {
          depth = spriteDepth;
          distance = d;
          best = entry.view;
        }
      }
    }
    return best;
  }
  private groundPoint(x: number, y: number): Position | null {
    const a = this.camera.camera!.screenToWorld(x, y, 1),
      b = this.camera.camera!.screenToWorld(x, y, 100);
    const t = -a.y / (b.y - a.y);
    const position = { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
    const map = this.view?.map;
    return map &&
      position.x >= -0.45 &&
      position.z >= -0.45 &&
      position.x < map.width - 0.5 &&
      position.z < map.height - 0.5
      ? position
      : null;
  }
  private local(event: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  private pointerDown = (event: PointerEvent): void => {
    if (event.button > 2 || this.drag) return;
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
      moved: false,
    };
    this.canvas.setPointerCapture(event.pointerId);
  };
  private pointerMove = (event: PointerEvent): void => {
    this.hoverPoint = { x: event.clientX, y: event.clientY };
    const local = this.local(event);
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
      const scale = (this.zoom * 2) / this.canvas.clientHeight;
      this.target.x -= dx * scale;
      this.target.z -= dy * scale * 1.3;
      drag.x = event.clientX;
      drag.y = event.clientY;
      this.canvas.style.cursor = 'grabbing';
      this.callbacks.hover(null, { x: event.clientX, y: event.clientY });
      this.placeCamera();
    } else {
      this.callbacks.hover(this.pick(local.x, local.y), { x: event.clientX, y: event.clientY });
    }
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
    const entity = this.pick(local.x, local.y);
    if (entity) this.callbacks.select(entity);
    else {
      const position = this.groundPoint(local.x, local.y);
      if (position) {
        this.destination.setPosition(position.x, 0.035, position.z);
        this.markerUntil = this.elapsed + 1.7;
        this.callbacks.move(position);
      }
      this.callbacks.select(null);
    }
  };
  private wheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.setZoom(event.deltaY * 0.008);
  };
  private cancelDrag(): void {
    const drag = this.drag;
    this.drag = null;
    this.canvas.style.cursor = '';
    if (!drag) return;
    if (drag.button === 2) this.pointerContextHandled = true;
    if (this.canvas.hasPointerCapture(drag.pointerId))
      this.canvas.releasePointerCapture(drag.pointerId);
  }
  private pointerCancel = (event: PointerEvent): void => {
    if (event.pointerId === this.drag?.pointerId) this.cancelDrag();
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
        : this.pick(local.x, local.y);
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
    window.removeEventListener('blur', this.blur);
    this.cancelDrag();
    this.textures.forEach((texture) => texture.destroy());
    this.materials.forEach((material) => material.destroy());
    this.visionBlur.destroy();
    this.statuses.destroy();
    this.app.destroy();
  }
}
