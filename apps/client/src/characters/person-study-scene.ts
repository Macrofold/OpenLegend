import * as pc from 'playcanvas';
import { candidateArt } from '../art-treatment';
import { initialCamera } from '../world-camera';
import { ScenePerformance } from '../scene-performance';
import { PersonActors, type PersonActor, type PersonAppearance } from './person-actor';
import { createPersonStage } from './person-stage';

const studyCue = { heading: 0, action: null };
// Authored inspection layout, not human dimensions or world movement rules.
const wearerSpacing = 1.8;
const referenceHeight = 1.8;

interface EditSample {
  wearer: number;
  inputAt: number;
  queuedAt: number;
  callCpuMs: number;
  committedSynchronously: boolean;
  editing: boolean;
  recipe: PersonAppearance['recipe'];
}

interface EditCapture {
  startedAt: number;
  latestInput?: number;
  requested: number;
  superseded: number;
  notCommitted: number;
  dropped: number;
  invalidInputTimestamps: number;
  inFlight: number;
  hidden: boolean;
  samples: Array<EditSample & { inputToSubmissionMs: number }>;
  awaitingRender: Map<number, EditSample>;
}

export type PersonStudyMovement = 'idle' | 'walk' | 'run' | 'transitions';
export type PersonStudyView = 'front' | 'quarter' | 'left' | 'right' | 'back' | 'game';

/** A private study consumer of the actual game actors, including blended gait
 * and contact correction. It does not advance single-clip preview animations. */
export class PersonStudyScene {
  private readonly stage: ReturnType<typeof createPersonStage>;
  private readonly owner: PersonActors;
  private readonly actors: PersonActor[];
  private readonly observer: ResizeObserver;
  private readonly reference: pc.Entity;
  private readonly referenceMaterial: pc.StandardMaterial;
  private readonly profiler?: ScenePerformance;
  private captureStart?: {
    configuration: ReturnType<PersonStudyScene['configuration']>;
    framebuffer: ReturnType<PersonStudyScene['framebuffer']>;
  };
  private captureChanges = 0;
  private hiddenDuringCapture = false;
  private editCapture?: EditCapture;
  private readonly parents: pc.Entity[] = [];
  private speeds: readonly { walk: number; run: number }[] = [];
  private readonly pending = new Map<
    number,
    {
      appearance: PersonAppearance;
      editing: boolean;
      inputAt?: number;
      queuedAt?: number;
      capture?: EditCapture;
    }
  >();
  private readonly editing = new Set<number>();
  private movement: PersonStudyMovement = 'idle';
  private view: PersonStudyView = 'front';
  private elapsed = 0;
  private paused = true;
  private disposed = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly appearances: readonly PersonAppearance[],
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
        this.stage.app.renderNextFrame = true;
        changed();
      },
    });
    this.actors = appearances.map((appearance, index) => {
      const parent = new pc.Entity('Study wearer ' + (index + 1), app);
      parent.setLocalPosition((index - (appearances.length - 1) / 2) * wearerSpacing, 0, 0);
      app.root.addChild(parent);
      this.parents.push(parent);
      const actor = this.owner.create(parent, appearance);
      actor.setVisible(true);
      return actor;
    });
    this.reference = new pc.Entity('1.80 m height marker', app);
    this.referenceMaterial = new pc.StandardMaterial();
    this.referenceMaterial.diffuse = new pc.Color(0.7, 0.72, 0.6);
    this.referenceMaterial.gloss = 0;
    this.referenceMaterial.update();
    app.root.addChild(this.reference);
    for (const [height, width, thickness] of [
      [referenceHeight / 2, 0.015, referenceHeight],
      [0.0075, 0.18, 0.015],
      [referenceHeight - 0.0075, 0.18, 0.015],
    ] as const) {
      const mark = new pc.Entity('Height marker', app);
      mark.addComponent('render', {
        type: 'box',
        material: this.referenceMaterial,
        castShadows: false,
        receiveShadows: false,
      });
      mark.setLocalScale(width, thickness, 0.015);
      mark.setLocalPosition(0, height, 0);
      this.reference.addChild(mark);
    }
    this.profiler = ScenePerformance.create(
      canvas,
      () => false,
      () =>
        this.actors.map((actor, index) => ({
          id: String(index),
          ...actor.diagnostics(),
          screen: null,
        })),
    );
    if (this.profiler) {
      app.on('frameupdate', this.profiler.beginFrame);
      app.on('frameend', this.endFrame, this);
      app.on('postrender', this.recordFrame, this);
      document.addEventListener('visibilitychange', this.recordVisibility);
    }
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    app.on('update', this.update, this);
    this.resize();
    app.start();
  }

  private update(dt: number): void {
    if (this.disposed) return;
    const started = this.profiler?.begin();
    for (const [index, pending] of this.pending) {
      this.pending.delete(index);
      const actor = this.actors[index];
      if (!actor) continue;
      const capture = pending.capture === this.editCapture ? this.editCapture : undefined;
      const started = capture && pending.inputAt !== undefined ? performance.now() : undefined;
      const previous = started === undefined ? undefined : actor.evaluation;
      const ready = actor.setAppearance(pending.appearance, undefined, pending.editing);
      const sample: EditSample | undefined =
        started === undefined || pending.inputAt === undefined || pending.queuedAt === undefined
          ? undefined
          : {
              wearer: index,
              inputAt: pending.inputAt,
              queuedAt: pending.queuedAt,
              callCpuMs: performance.now() - started,
              // Warm unchanged maps commit evaluation, fitting and draw synchronously
              // inside PersonMaterials.prepare. Async map changes are reported separately.
              committedSynchronously:
                actor.evaluation !== previous &&
                actor.evaluation?.recipe === pending.appearance.recipe,
              editing: pending.editing,
              recipe: pending.appearance.recipe,
            };
      if (capture && sample?.committedSynchronously) this.awaitRender(capture, sample);
      if (capture && sample && !sample.committedSynchronously) capture.inFlight++;
      void ready.then((accepted) => {
        if (capture && sample && !sample.committedSynchronously) {
          capture.inFlight--;
          if (this.editCapture === capture) {
            if (accepted) this.awaitRender(capture, sample);
            else capture.notCommitted++;
          }
        }
        if (!this.disposed) this.changed();
      });
    }
    if (this.paused) {
      this.profiler?.update(started);
      return;
    }
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
    this.profiler?.update(started);
  }

  private endFrame(): void {
    this.profiler?.endFrame(null, undefined, this.stage.app, true);
  }

  private recordFrame(): void {
    if (this.profiler?.isRecording() && document.visibilityState === 'visible')
      this.profiler.renderedFrame(performance.now());
    const capture = this.editCapture;
    if (!capture || document.visibilityState !== 'visible' || !capture.awaitingRender.size) return;
    const at = performance.now();
    for (const sample of capture.awaitingRender.values()) {
      if (this.actors[sample.wearer]?.evaluation?.recipe !== sample.recipe) capture.superseded++;
      else if (capture.samples.length === 1024) capture.dropped++;
      else capture.samples.push({ ...sample, inputToSubmissionMs: at - sample.inputAt });
    }
    capture.awaitingRender.clear();
  }

  private awaitRender(capture: EditCapture, sample: EditSample): void {
    if (capture.awaitingRender.has(sample.wearer)) capture.superseded++;
    capture.awaitingRender.set(sample.wearer, sample);
  }

  startEditCapture(): void {
    if (!this.profiler || this.disposed || this.editCapture) return;
    this.editCapture = {
      startedAt: performance.now(),
      requested: 0,
      superseded: 0,
      notCommitted: 0,
      dropped: 0,
      invalidInputTimestamps: 0,
      inFlight: 0,
      hidden: document.visibilityState !== 'visible',
      samples: [],
      awaitingRender: new Map(),
    };
  }

  recordInput(at: number): void {
    if (!this.editCapture) return;
    if (Number.isFinite(at) && at >= this.editCapture.startedAt && at <= performance.now())
      this.editCapture.latestInput = at;
    else {
      this.editCapture.latestInput = undefined;
      this.editCapture.invalidInputTimestamps++;
    }
  }

  stopEditCapture() {
    const capture = this.editCapture;
    if (!capture) return;
    this.editCapture = undefined;
    const unrendered =
      capture.awaitingRender.size +
      capture.inFlight +
      [...this.pending.values()].filter((pending) => pending.capture === capture).length;
    const samples = capture.samples;
    capture.samples = [];
    capture.awaitingRender.clear();
    return {
      startedAt: capture.startedAt,
      stoppedAt: performance.now(),
      configuration: this.configuration(),
      framebuffer: this.framebuffer(),
      requested: capture.requested,
      superseded: capture.superseded,
      notCommitted: capture.notCommitted,
      dropped: capture.dropped,
      unrendered,
      invalidInputTimestamps: capture.invalidInputTimestamps,
      hiddenDuringCapture: capture.hidden,
      samples,
      resources: this.diagnostics(),
      browser: navigator.userAgent,
      timingScope:
        'Event timestamp to render submission, not physical display latency. callCpuMs covers the complete preparation/install only when committedSynchronously is true; async material waits are not CPU samples.',
    };
  }

  private readonly recordVisibility = (): void => {
    if (this.captureStart && document.visibilityState !== 'visible')
      this.hiddenDuringCapture = true;
    if (this.editCapture && document.visibilityState !== 'visible') this.editCapture.hidden = true;
  };

  private configuration() {
    return {
      view: this.view,
      movement: this.movement,
      paused: this.paused,
      wearers: this.actors.map((actor, index) => ({
        recipe: actor.evaluation?.recipe,
        parts: actor.displayedParts,
        compiled: this.appearances[index]?.compiled,
      })),
    };
  }

  private framebuffer() {
    return {
      width: this.canvas.width,
      height: this.canvas.height,
      devicePixelRatio: window.devicePixelRatio,
    };
  }

  startCapture(): void {
    if (!this.profiler || this.disposed) return;
    this.profiler.stopCapture();
    this.captureStart = {
      configuration: this.configuration(),
      framebuffer: this.framebuffer(),
    };
    this.captureChanges = 0;
    this.hiddenDuringCapture = document.visibilityState !== 'visible';
    this.profiler.startCapture();
  }

  stopCapture() {
    if (!this.profiler || !this.captureStart || this.disposed) return;
    const profile = this.profiler.stopCapture();
    const result = {
      profile,
      configurationStart: this.captureStart.configuration,
      configurationEnd: this.configuration(),
      configurationChanges: this.captureChanges,
      hiddenDuringCapture: this.hiddenDuringCapture,
      framebufferStart: this.captureStart.framebuffer,
      framebufferEnd: this.framebuffer(),
      browser: navigator.userAgent,
      buildModules: Array.from(document.scripts, (script) => script.src).filter(Boolean),
      resources: this.diagnostics(),
      timingScope:
        'Frame update through render submission; excludes the browser frame wait. No world-state samples. CPU histograms use 0.25 ms buckets.',
    };
    this.captureStart = undefined;
    return result;
  }

  private resize(): void {
    const previous = this.captureStart ? this.framebuffer() : undefined;
    const bounds = this.canvas.getBoundingClientRect();
    this.stage.app.setCanvasResolution(
      pc.RESOLUTION_FIXED,
      Math.max(1, Math.round(bounds.width)),
      Math.max(1, Math.round(bounds.height)),
    );
    if (
      previous &&
      (previous.width !== this.canvas.width || previous.height !== this.canvas.height)
    )
      this.captureChanges++;
    this.frame();
  }

  private frame(): void {
    const bounds = this.canvas.getBoundingClientRect();
    const aspect = Math.max(0.1, bounds.width / Math.max(1, bounds.height));
    const width = this.actors.length * wearerSpacing + 0.6;
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
      const offset = (index - (this.parents.length - 1) / 2) * wearerSpacing;
      parent.setLocalPosition(offset * Math.cos(yaw), 0, -offset * Math.sin(yaw));
    });
    const markerOffset = -(this.parents.length * wearerSpacing) / 2 - 0.1;
    this.reference.setLocalPosition(markerOffset * Math.cos(yaw), 0, -markerOffset * Math.sin(yaw));
    this.reference.setLocalEulerAngles(0, yaw * pc.math.RAD_TO_DEG, 0);
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
      if (this.captureStart) this.captureChanges++;
      if (editing) this.editing.add(index);
      else this.editing.delete(index);
      const capture = this.editCapture;
      const inputAt = capture?.latestInput;
      if (capture && this.pending.get(index)?.capture === capture) capture.superseded++;
      if (capture && inputAt !== undefined) {
        capture.requested++;
        capture.latestInput = undefined;
      }
      this.pending.set(index, {
        appearance,
        editing,
        inputAt,
        queuedAt: inputAt === undefined ? undefined : performance.now(),
        capture: inputAt === undefined ? undefined : capture,
      });
    }
  }
  setView(view: PersonStudyView): void {
    if (this.captureStart && view !== this.view) this.captureChanges++;
    this.view = view;
    this.frame();
  }
  setMovement(movement: PersonStudyMovement): void {
    if (this.captureStart && movement !== this.movement) this.captureChanges++;
    this.movement = movement;
  }
  setPaused(paused: boolean): void {
    if (this.captureStart && paused !== this.paused) this.captureChanges++;
    this.paused = paused;
    this.stage.app.renderNextFrame = true;
  }
  diagnostics() {
    return {
      owner: this.owner.diagnostics(),
      wearers: this.actors.map((actor) => ({
        ...actor.diagnostics(),
        error: actor.error,
        availableMotions: actor.availableMotions,
      })),
    };
  }
  destroy() {
    if (this.disposed) return;
    const before = this.profiler ? this.diagnostics() : undefined;
    if (this.editCapture) this.stopEditCapture();
    this.disposed = true;
    this.captureStart = undefined;
    this.editCapture = undefined;
    this.pending.clear();
    this.observer.disconnect();
    this.stage.app.off('update', this.update, this);
    if (this.profiler) {
      this.stage.app.off('frameupdate', this.profiler.beginFrame);
      this.stage.app.off('frameend', this.endFrame, this);
      this.stage.app.off('postrender', this.recordFrame, this);
      document.removeEventListener('visibilitychange', this.recordVisibility);
      this.profiler.destroy();
    }
    this.owner.destroy();
    this.reference.destroy();
    this.referenceMaterial.destroy();
    this.stage.destroy();
    if (before)
      return {
        before,
        after: this.diagnostics(),
        // Browser/driver memory is not measured by these owned-resource counters.
        memoryScope: 'Character owner, textures and mesh buffers; GPU heap unavailable.',
      };
  }
}
