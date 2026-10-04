import type { EntityView, GameView, SurfacePoint } from '@open-legend/protocol';
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
export interface SceneCallbacks {
  select(entity: EntityView | null, at?: ScreenPoint, ground?: SurfacePoint): void;
  move(position: SurfacePoint): void;
  hover(entity: EntityView | null, at: ScreenPoint): void;
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
export interface WorldRenderer {
  setPerceptionOptions(options: PerceptionOptions): void;
  setShadowQuality(quality: ShadowQuality): void;
  setCaptionOptions(options: SpeechCaptionOptions): void;
  resetTransientCaptions(): void;
  setView(view: GameView): void;
  select(id: string | null): boolean;
  center(): void;
  setZoom(delta: number): void;
  cameraCommand(command: CameraCommand): void;
  cameraState(): CameraState;
  screenPosition(id: string): ScreenPoint | null;
  destroy(): void;
}
