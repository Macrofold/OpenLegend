import type { EntityView, GameView, SurfacePoint, ConstructionShape } from '@open-legend/protocol';
import type { CameraCommand, CameraState } from './world-camera';
export type ShadowQuality = 'detailed' | 'economy';
export interface ScreenPoint {
  x: number;
  y: number;
}
export interface ScreenRect extends ScreenPoint {
  width: number;
  height: number;
}
export type SceneLoadProgress =
  | { phase: 'loading' | 'preparing' | 'ready'; completed: number; total: number }
  | { phase: 'failed'; completed: number; total: number; message: string };
export interface SceneCallbacks {
  loadingChanged?(progress: SceneLoadProgress): void;
  select(entity: EntityView | null, at?: ScreenPoint, ground?: SurfacePoint): void;
  move(position: SurfacePoint): void;
  target(entity: EntityView): void;
  beginPrimaryAction(entity: EntityView): string | null;
  commitPrimaryAction(gestureId: string, entity: EntityView): void;
  cancelPrimaryAction(): void;
  hover(entity: EntityView | null, at: ScreenPoint, primary: boolean): void;
  selectionDenied(message: string): void;
  cameraChanged?(state: CameraState): void;
}
/** A deliberately small application boundary, not an abstraction over every graphics API.
 * React and gameplay know only authorized DTOs, intentions, and plain camera state.
 * docs/spatial-world.md#renderer-boundary
 */
export interface SpeechCaptionOptions {
  enabled: boolean;
  /** Perceived speech from others that the overlay dropped or never showed, at most once a second. */
  onMissedCaptions?(report: { scope: string; count: number; incomplete: boolean }): void;
  paused: boolean;
  readingScale: number;
  uiScale: number;
  reducedMotion: boolean;
  occlusions?: readonly ScreenRect[];
}
export interface PerceptionOptions {
  vision: boolean;
  hearing: boolean;
}
export interface ConstructionPlacement {
  position(): SurfacePoint;
  /** Null means the current choice has no visible supported surface. */
  move(point: SurfacePoint | null): void;
  place(): void;
  rotate(direction: -1 | 1): void;
  cancel(): void;
}
export interface ConstructionPreviewTransform {
  origin: SurfacePoint;
  position: SurfacePoint;
  rotation: number;
}
export interface WorldRenderer {
  setConstructionPreview(
    shapes: readonly ConstructionShape[] | null,
    valid?: boolean,
    transform?: ConstructionPreviewTransform,
  ): void;
  setConstructionPlacement(placement: ConstructionPlacement | null): void;
  setTargeting(active: boolean): void;
  setSuspended(suspended: boolean): void;
  sampleFrameRate(): number | null;
  setPerceptionOptions(options: PerceptionOptions): void;
  setShadowQuality(quality: ShadowQuality): void;
  setCaptionOptions(options: SpeechCaptionOptions): void;
  resetTransientCaptions(): void;
  setView(view: GameView): void;
  /** Select an already server-observed subject, including a named HUD entry.
   * Camera picking and highlight visibility retain their own presentation limits. */
  select(id: string | null): boolean;
  center(): void;
  setZoom(delta: number): void;
  cameraCommand(command: CameraCommand): void;
  cameraState(): CameraState;
  screenPosition(id: string): ScreenPoint | null;
  destroy(): void;
}
