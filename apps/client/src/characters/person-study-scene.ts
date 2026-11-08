import * as pc from 'playcanvas';
import { candidateArt } from '../art-treatment';
import { initialCamera } from '../world-camera';
import { PersonActors, type PersonActor, type PersonAppearance } from './person-actor';
import { createPersonStage } from './person-stage';

const studyCue = { heading: 0, action: null };

export type PersonStudyMovement = 'idle' | 'walk' | 'run' | 'transitions';
export type PersonStudyView = 'front' | 'quarter' | 'left' | 'right' | 'back' | 'game';

/** A private study consumer of the actual game actors, including blended gait
 * and contact correction. It does not advance single-clip preview animations. */
export class PersonStudyScene {
  private readonly stage: ReturnType<typeof createPersonStage>;
  private readonly owner: PersonActors;
  private readonly actors: PersonActor[];
  private readonly observer: ResizeObserver;
  private readonly parents: pc.Entity[] = [];
  private speeds: readonly { walk: number; run: number }[] = [];
  private readonly pending = new Map<number, { appearance: PersonAppearance; editing: boolean }>();
  private readonly editing = new Set<number>();
  private movement: PersonStudyMovement = 'idle';
  private view: PersonStudyView = 'front';
  private elapsed = 0;
  private paused = true;
  private disposed = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    appearances: readonly PersonAppearance[],
    private readonly changed: () => void,
  ) {
    this.stage = createPersonStage(canvas);
    const { app, camera, sun, art } = this.stage;
    this.owner = new PersonActors({
      app,
      camera,
      sun: sun.light?.light,
      art,
      changed: () => {
        if (this.disposed) return;
        this.speeds = this.actors.map((actor) => {
          const strides = actor.availableStrides;
          return { walk: strides[0]?.groundSpeed ?? 0, run: strides.at(-1)?.groundSpeed ?? 0 };
        });
        this.frame();
        changed();
      },
    });
    this.actors = appearances.map((appearance, index) => {
      const parent = new pc.Entity('Study wearer ' + (index + 1), app);
      parent.setLocalPosition((index - (appearances.length - 1) / 2) * 1.25, 0, 0);
      app.root.addChild(parent);
      this.parents.push(parent);
      const actor = this.owner.create(parent, appearance);
      actor.setVisible(true);
      return actor;
    });
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    app.on('update', this.update, this);
    this.resize();
    app.start();
  }

  private update(dt: number): void {
    if (this.disposed) return;
    for (const [index, pending] of this.pending) {
      this.pending.delete(index);
      void this.actors[index]
        ?.setAppearance(pending.appearance, undefined, pending.editing)
        .then(() => {
          if (!this.disposed) this.changed();
        });
    }
    if (this.paused) return;
    this.elapsed += Math.min(dt, 0.1);
    for (const [index, actor] of this.actors.entries()) {
      if (this.editing.has(index)) continue;
      const { walk = 0, run = 0 } = this.speeds[index] ?? {};
      // Deliberate study journey: stop, walk, mixed stride, run, stop.
      // Speeds come from this wearer's fitted source, never world travel tuning.
      const phase = this.elapsed % 12;
      const speed =
        this.movement === 'walk'
          ? walk
          : this.movement === 'run'
            ? run
            : this.movement === 'transitions'
              ? phase < 2
                ? 0
                : phase < 5
                  ? walk
                  : phase < 7
                    ? (walk + run) / 2
                    : phase < 10
                      ? run
                      : 0
              : 0;
      actor.update(studyCue, dt, speed, this.paused, 0, false, candidateArt);
    }
    if (!this.paused) this.stage.app.renderNextFrame = true;
  }

  private resize(): void {
    const bounds = this.canvas.getBoundingClientRect();
    this.stage.app.setCanvasResolution(
      pc.RESOLUTION_FIXED,
      Math.max(1, Math.round(bounds.width)),
      Math.max(1, Math.round(bounds.height)),
    );
    this.frame();
  }

  private frame(): void {
    const bounds = this.canvas.getBoundingClientRect();
    const aspect = Math.max(0.1, bounds.width / Math.max(1, bounds.height));
    const width = Math.max(1, this.actors.length * 1.25);
    const ordinary = initialCamera();
    const yaw = {
      front: 0,
      quarter: Math.PI / 4,
      left: Math.PI / 2,
      right: -Math.PI / 2,
      back: Math.PI,
      game: ordinary.yaw,
    }[this.view];
    const target = new pc.Vec3(0, this.view === 'game' ? 0 : 1, 0);
    const pitch = this.view === 'game' ? ordinary.pitch : 0;
    this.parents.forEach((parent, index) => {
      const offset = (index - (this.parents.length - 1) / 2) * 1.25;
      parent.setLocalPosition(offset * Math.cos(yaw), 0, -offset * Math.sin(yaw));
    });
    const { camera, cameraComponent, app } = this.stage;
    cameraComponent.orthoHeight =
      this.view === 'game' ? ordinary.zoom : Math.max(1.15, width / (aspect * 2)) * 1.12;
    camera.setPosition(
      Math.sin(yaw) * 8 * Math.cos(pitch),
      target.y + Math.sin(pitch) * 8,
      Math.cos(yaw) * 8 * Math.cos(pitch),
    );
    camera.lookAt(target);
    app.renderNextFrame = true;
  }

  setAppearance(index: number, appearance: PersonAppearance, editing = false): void {
    if (!this.disposed && this.actors[index]) {
      if (editing) this.editing.add(index);
      else this.editing.delete(index);
      this.pending.set(index, { appearance, editing });
    }
  }
  setView(view: PersonStudyView): void {
    this.view = view;
    this.frame();
  }
  setMovement(movement: PersonStudyMovement): void {
    this.movement = movement;
  }
  setPaused(paused: boolean): void {
    this.paused = paused;
    this.stage.app.renderNextFrame = true;
  }
  diagnostics() {
    return {
      owner: this.owner.diagnostics(),
      wearers: this.actors.map((actor) => ({ ...actor.diagnostics(), error: actor.error })),
    };
  }
  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.pending.clear();
    this.observer.disconnect();
    this.stage.app.off('update', this.update, this);
    this.owner.destroy();
    this.stage.destroy();
  }
}
