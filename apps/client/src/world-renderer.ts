import type { EntityView, GameView, SurfacePoint } from '@open-legend/protocol';
import type { CameraCommand, CameraState } from './world-camera';
export interface ScreenPoint {
  x: number;
  y: number;
}
export interface SceneCallbacks {
  select(entity: EntityView | null, at?: ScreenPoint, ground?: SurfacePoint): void;
  move(position: SurfacePoint): void;
  hover(entity: EntityView | null, at: ScreenPoint): void;
  cameraChanged?(state: CameraState): void;
}
/** A deliberately small application boundary, not an abstraction over every graphics API.
 * React and gameplay know only authorized DTOs, intentions, and plain camera state.
 * docs/spatial-world.md#renderer-boundary
 */
export interface WorldRenderer {
  setView(view: GameView): void;
  select(id: string | null): void;
  center(): void;
  setZoom(delta: number): void;
  cameraCommand(command: CameraCommand): void;
  cameraState(): CameraState;
  screenPosition(id: string): ScreenPoint | null;
  destroy(): void;
}
