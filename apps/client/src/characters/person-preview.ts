import * as pc from 'playcanvas';
import type { AppearanceRecipe } from '@open-legend/protocol';
import { createPersonStage } from './person-stage';
import { currentCameraProjection } from '../camera-projection';
import type { PersonPreview, PersonPreviewState, PersonPreviewView } from '../world-renderer';
import { PersonActors, type PersonActor, type PersonAppearance } from './person-actor';
import { requiredPersonValue } from './person-family';

/** Inspection is another consumer of the game wearer, with its own private rig
 * and buffers. Pointer events only replace pending work; one frame evaluates it. */
export class PersonPreviewRenderer implements PersonPreview {
  private readonly app: pc.Application;
  private readonly owner: PersonActors;
  private readonly actor: PersonActor;
  private readonly camera: pc.Entity;
  private readonly stage: ReturnType<typeof createPersonStage>;
  private readonly cameraComponent: pc.CameraComponent;
  private readonly observer: ResizeObserver;
  private pending?: { recipe: AppearanceRecipe; parts: readonly string[]; editing: boolean };
  private appearance: PersonAppearance;
  private view: PersonPreviewView = 'front';
  private selected?: string;
  private yaw = 0;
  private playing = false;
  private clip?: string;
  private disposed = false;
  private editing = false;
  private generation = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    appearance: PersonAppearance,
    private readonly changed: (state: PersonPreviewState) => void,
  ) {
    this.appearance = appearance;
    this.stage = createPersonStage(canvas);
    const { app, camera, cameraComponent, sun, art } = this.stage;
    this.app = app;
    this.camera = camera;
    this.cameraComponent = cameraComponent;
    this.owner = new PersonActors({
      app: this.app,
      camera: this.camera,
      sun: sun.light?.light,
      art,
      preview: true,
      changed: () => this.refresh(),
    });
    this.actor = this.owner.create(this.app.root, appearance);
    this.actor.setVisible(true);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.app.on('update', this.update, this);
    this.resize();
    this.app.start();
  }

  private update(dt: number): void {
    if (this.disposed) return;
    const pending = this.pending;
    if (pending) {
      this.pending = undefined;
      const generation = ++this.generation;
      this.editing = pending.editing;
      this.appearance = { ...this.appearance, recipe: pending.recipe, parts: pending.parts };
      void this.actor.setAppearance(this.appearance, undefined, pending.editing).then((ready) => {
        if (this.disposed || generation !== this.generation) return;
        if (ready && !this.editing) this.actor.setPreviewMotion(this.clip);
        this.refresh();
      });
    }
    if (this.playing && !this.editing && this.actor.advancePreview(dt))
      this.app.renderNextFrame = true;
  }

  private resize(): void {
    const bounds = this.canvas.getBoundingClientRect();
    this.app.setCanvasResolution(
      pc.RESOLUTION_FIXED,
      Math.max(1, Math.round(bounds.width)),
      Math.max(1, Math.round(bounds.height)),
    );
    this.refresh();
  }

  private refresh(): void {
    if (this.disposed) return;
    const family = this.actor?.source;
    const evaluated = this.actor?.evaluation;
    const supportOffset = this.actor?.supportOffset ?? 0;
    const camera = this.cameraComponent;
    const bounds = this.canvas.getBoundingClientRect();
    const aspect = Math.max(0.1, bounds.width / Math.max(1, bounds.height));
    const maxHeight = family
      ? requiredPersonValue(family.controls[family.statureControl], 'stature control').bounds[1]
      : 2.2;
    let height = maxHeight + supportOffset,
      centre = new pc.Vec3(0, height / 2, 0),
      width = this.actor?.width ?? 1;
    if (this.view === 'face' && evaluated && family) {
      const head = evaluated.canonicalPositions.get(
        requiredPersonValue(
          family.facePresets[
            requiredPersonValue(
              evaluated.recipe.selections[family.faceSelectionRole],
              'face choice',
            )
          ],
          'face preset',
        ).meshId,
      );
      if (head) {
        const box = new pc.BoundingBox();
        box.compute(head);
        centre = box.center.clone();
        centre.y += supportOffset;
        height = box.halfExtents.y * 2.5;
        width = box.halfExtents.x * 2.5;
      }
    }
    camera.orthoHeight = Math.max(height / 2, width / (aspect * 2)) * 1.12;
    this.camera.setPosition(
      centre.x + Math.sin(this.yaw) * 6,
      centre.y,
      centre.z + Math.cos(this.yaw) * 6,
    );
    this.camera.lookAt(centre);
    let handle: PersonPreviewState['handle'];
    const control = family?.controls[this.selected ?? ''];
    if (
      control?.handle &&
      evaluated &&
      !this.clip &&
      !this.playing &&
      (this.view === control.handle.view ||
        (this.view === 'face' && control.handle.view === 'front'))
    ) {
      const landmark = evaluated.landmarks[control.handle.landmarkId];
      if (landmark) {
        const projected = currentCameraProjection(camera).transformVec4(
          new pc.Vec4(landmark[0], landmark[1] + supportOffset, landmark[2], 1),
        );
        handle = {
          control: requiredPersonValue(this.selected, 'selected control'),
          x: ((projected.x / projected.w + 1) / 2) * bounds.width,
          y: ((1 - projected.y / projected.w) / 2) * bounds.height,
          axis: control.handle.axis,
          direction: control.handle.direction ?? 1,
          travelPixels: Math.max(
            1,
            ((bounds.height * evaluated.statureMetres) / (camera.orthoHeight * 2)) *
              control.handle.travelFraction,
          ),
        };
      }
    }
    this.app.renderNextFrame = true;
    this.changed({
      recipe: evaluated?.recipe,
      parts: this.actor?.displayedParts,
      view: this.view,
      status: this.actor?.state ?? 'loading',
      preparing: this.actor?.preparing ?? true,
      error: this.actor?.error,
      handle,
      motions: this.actor?.availableMotions ?? [],
    });
  }

  setAppearance(recipe: AppearanceRecipe, parts: readonly string[], editing: boolean): void {
    this.pending = { recipe, parts, editing };
  }
  setClay(clay: boolean): void {
    if (this.disposed) return;
    this.actor.setClay(clay);
    this.stage.setClay(clay);
  }
  setView(view: PersonPreviewView): void {
    this.view = view;
    this.yaw = view === 'profile' ? Math.PI / 2 : view === 'quarter' ? Math.PI / 4 : 0;
    this.refresh();
  }
  selectControl(id: string | undefined): void {
    this.selected = id;
    const handle = this.actor.source?.controls[id ?? '']?.handle;
    if (handle && !(this.view === 'face' && handle.view === 'front')) this.setView(handle.view);
    else this.refresh();
  }
  rotate(radians: number): void {
    this.yaw += radians;
    this.view = 'quarter';
    this.refresh();
  }
  setMotion(name: string | undefined, playing: boolean): boolean {
    if (this.disposed) return false;
    // A staged fit belongs to the current clip. New movement choices wait for
    // that appearance; Rest still synchronizes feature-selection gestures.
    if (
      name !== undefined &&
      (this.pending || this.editing || this.actor.preparing || !this.actor.presentationReady)
    )
      return false;
    this.clip = name;
    this.playing = name !== undefined && playing;
    this.actor.setPreviewMotion(name);
    this.refresh();
    return true;
  }
  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.generation++;
    this.pending = undefined;
    this.observer.disconnect();
    this.app.off('update', this.update, this);
    this.owner.destroy();
    this.stage.destroy();
  }
}
