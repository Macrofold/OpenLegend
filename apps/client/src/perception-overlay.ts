import * as pc from 'playcanvas';
import type { GameView } from '@open-legend/protocol';
import type { WorldPoint } from '@open-legend/spatial';
import type { PerceptionOptions, ScreenPoint } from './world-renderer';
import {
  GUIDE_SAMPLING,
  perceptionField,
  perceptionFieldKey,
  type GuideContour,
} from './perception-field';

const COLORS = { vision: [0.43, 0.84, 0.72], hearing: [0.91, 0.71, 0.35] } as const;
const CORE_WIDTH = 0.0375;
const LIFT = 0.035;

/** Scene-owned depth-tested fills and ribbons. No pick registration, authority or animation.
 * Work happens on changed projections, outside the rendered-frame callback. */
export class PerceptionOverlay {
  private root: pc.Entity;
  private meshes: pc.Mesh[] = [];
  private materials: pc.StandardMaterial[] = [];
  private options: PerceptionOptions = { vision: false, hearing: false };
  private view: GameView | null = null;
  private key = '';
  private rebuilds = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private nextAt = 0;
  private contours: GuideContour[] = [];
  private hint = document.createElement('div');
  private destroyed = false;

  constructor(
    private readonly app: pc.Application,
    private readonly canvas: HTMLCanvasElement,
  ) {
    this.root = new pc.Entity('Perception range guides', app);
    app.root.addChild(this.root);
    this.hint.className = 'ol-perception-hint';
    this.hint.hidden = true;
    this.hint.setAttribute('aria-hidden', 'true');
    canvas.after(this.hint);
  }
  setView(view: GameView): void {
    if (
      this.view &&
      (view.worldId !== this.view.worldId ||
        view.saveTimeline !== this.view.saveTimeline ||
        view.access?.scope !== this.view.access?.scope ||
        view.player.id !== this.view.player.id)
    ) {
      this.clear();
      this.key = '';
    }
    this.view = view;
    this.schedule();
  }
  setOptions(options: PerceptionOptions): void {
    if (options.vision === this.options.vision && options.hearing === this.options.hearing) return;
    this.options = { ...options };
    // Off means immediately gone, including any pending stale field.
    this.clear();
    this.key = '';
    this.schedule();
  }
  private schedule(): void {
    const view = this.view;
    if (!view || this.destroyed || (!this.options.vision && !this.options.hearing)) return;
    const key = perceptionFieldKey(view, this.options);
    if (key === this.key || this.timer !== undefined) return;
    this.timer = setTimeout(
      () => {
        this.timer = undefined;
        if (!this.view || this.destroyed || (!this.options.vision && !this.options.hearing)) return;
        const currentKey = perceptionFieldKey(this.view, this.options);
        const start = performance.now();
        this.clear();
        this.contours = perceptionField(this.view, this.options).map((contour) => ({
          ...contour,
          segments:
            contour.sense === 'hearing' ? dashedSegments(contour.segments) : contour.segments,
        }));
        this.draw();
        this.key = currentKey;
        this.nextAt = performance.now() + GUIDE_SAMPLING.intervalMs;
        // Bounded diagnostic, contains no actors, sources, geometry or private input.
        this.canvas.dataset.perceptionRebuilds = String(++this.rebuilds);
        this.canvas.dataset.perceptionMs = (performance.now() - start).toFixed(1);
        this.canvas.dataset.perceptionSegments = String(
          this.contours.reduce((total, contour) => total + contour.segments.length, 0),
        );
      },
      Math.max(0, this.nextAt - performance.now()),
    );
  }
  private draw(): void {
    for (const contour of this.contours) {
      const color = COLORS[contour.sense];
      const brightness = [0.92, 0.58, 0.34][contour.band] ?? 0.34;
      // Tint the whole reachable area once, not once per overlapping inner band.
      if (
        !this.contours.some((other) => other.sense === contour.sense && other.band > contour.band)
      )
        this.addMesh(
          contour.vertices.flatMap((point) => [point.x, point.y + LIFT, point.z]),
          contour.triangles,
          color,
          1,
          0.025,
          `${contour.sense} area`,
        );
      for (const [width, opacity] of [
        [CORE_WIDTH * 4.5, 0.045],
        [CORE_WIDTH * 2.5, 0.11],
        [CORE_WIDTH, 0.85],
      ]) {
        const positions: number[] = [],
          indices: number[] = [];
        for (const [a, b] of contour.segments) {
          const length = Math.hypot(b.x - a.x, b.z - a.z);
          if (length < 0.001) continue;
          const nx = (((b.z - a.z) / length) * width!) / 2,
            nz = ((-(b.x - a.x) / length) * width!) / 2;
          const i = positions.length / 3;
          const capX = (((b.x - a.x) / length) * width!) / 2;
          const capZ = (((b.z - a.z) / length) * width!) / 2;
          for (const point of [
            { ...a, x: a.x - capX, z: a.z - capZ },
            { ...b, x: b.x + capX, z: b.z + capZ },
          ])
            positions.push(
              point.x - nx,
              point.y + LIFT,
              point.z - nz,
              point.x + nx,
              point.y + LIFT,
              point.z + nz,
            );
          indices.push(i, i + 1, i + 2, i + 2, i + 1, i + 3);
        }
        if (!indices.length) continue;
        this.addMesh(
          positions,
          indices,
          color,
          brightness,
          opacity!,
          `${contour.sense} ${contour.band}`,
        );
      }
    }
  }
  private addMesh(
    positions: number[],
    indices: number[],
    color: readonly [number, number, number],
    brightness: number,
    opacity: number,
    name: string,
  ): void {
    if (!indices.length) return;
    const mesh = new pc.Mesh(this.app.graphicsDevice);
    mesh.setPositions(positions);
    mesh.setIndices(indices);
    mesh.update();
    const material = new pc.StandardMaterial();
    material.useLighting = false;
    material.useFog = false;
    material.diffuse.set(0, 0, 0);
    material.emissive.set(color[0] * brightness, color[1] * brightness, color[2] * brightness);
    material.opacity = opacity;
    material.blendType = pc.BLEND_NORMAL;
    material.depthTest = true;
    material.depthWrite = false;
    material.cull = pc.CULLFACE_NONE;
    material.update();
    const node = new pc.Entity(name, this.app);
    node.addComponent('render', {
      meshInstances: [new pc.MeshInstance(mesh, material)],
      castShadows: false,
      receiveShadows: false,
    });
    this.root.addChild(node);
    this.meshes.push(mesh);
    this.materials.push(material);
  }
  hideHint(): void {
    this.hint.hidden = true;
  }
  hover(
    point: ScreenPoint,
    project: (point: WorldPoint) => ScreenPoint | null,
    visible: (point: WorldPoint) => boolean,
  ): void {
    this.hideHint();
    if (document.elementFromPoint(point.x, point.y) !== this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    let closest = 6,
      hit: { label: string; point: WorldPoint } | undefined;
    for (const contour of this.contours)
      for (const [a, b] of contour.segments) {
        const from = project({ ...a, y: a.y + LIFT }),
          to = project({ ...b, y: b.y + LIFT });
        if (!from || !to) continue;
        const dx = to.x - from.x,
          dy = to.y - from.y,
          length = dx * dx + dy * dy;
        const t =
          length === 0
            ? 0
            : Math.max(
                0,
                Math.min(
                  1,
                  ((point.x - rect.left - from.x) * dx + (point.y - rect.top - from.y) * dy) /
                    length,
                ),
              );
        const separation = Math.hypot(
          point.x - rect.left - from.x - dx * t,
          point.y - rect.top - from.y - dy * t,
        );
        if (separation < closest) {
          closest = separation;
          hit = {
            label: contour.label,
            point: {
              x: a.x + (b.x - a.x) * t,
              y: a.y + (b.y - a.y) * t + LIFT,
              z: a.z + (b.z - a.z) * t,
            },
          };
        }
      }
    if (!hit || !visible(hit.point)) return;
    this.hint.textContent = hit.label;
    this.hint.hidden = false;
    const { width, height } = this.hint.getBoundingClientRect();
    this.hint.style.left = `${Math.max(8, Math.min(point.x + 14, innerWidth - width - 8))}px`;
    this.hint.style.top = `${Math.max(8, point.y - height - 14)}px`;
  }
  private clear(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.hideHint();
    for (const child of [...this.root.children]) child.destroy();
    for (const mesh of this.meshes) if (mesh.refCount === 0) mesh.destroy();
    for (const material of this.materials) material.destroy();
    this.meshes = [];
    this.materials = [];
    this.contours = [];
    this.canvas.dataset.perceptionSegments = '0';
  }
  destroy(): void {
    this.destroyed = true;
    this.clear();
    this.root.destroy();
    this.hint.remove();
    delete this.canvas.dataset.perceptionMs;
    delete this.canvas.dataset.perceptionRebuilds;
    delete this.canvas.dataset.perceptionSegments;
  }
}

/** One cached set of visible dashes serves drawing and lowest-priority hovering. */
function dashedSegments(segments: GuideContour['segments']): GuideContour['segments'] {
  const dashes: GuideContour['segments'] = [];
  let progress = 0;
  for (const [a, b] of segments) {
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    const at = (distance: number): WorldPoint => {
      const t = distance / length;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
    };
    let cursor = 0;
    while (cursor < length) {
      const phase = (progress + cursor) % 1.1;
      const end = Math.min(length, cursor + (phase < 0.7 ? 0.7 - phase : 1.1 - phase));
      if (phase < 0.7) dashes.push([at(cursor), at(end)]);
      cursor = end + 1e-6;
    }
    progress += length;
  }
  return dashes;
}
