import { finitePoint, type WorldPoint } from '@open-legend/spatial';
export interface CameraState {
  focus: WorldPoint;
  yaw: number;
  pitch: number;
  zoom: number;
  projection: 'orthographic' | 'perspective';
  levelId: string | null;
  rotationLocked: boolean;
  following: boolean;
}
export type CameraCommand =
  | { type: 'orbit'; yaw: number; pitch: number }
  | { type: 'pan'; dx: number; dy: number; viewportHeight: number }
  | { type: 'zoom'; delta: number }
  | { type: 'focus'; point: WorldPoint }
  | { type: 'level'; id: string | null; y: number }
  | { type: 'projection' }
  | { type: 'rotation-lock' }
  | { type: 'follow' };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const CAMERA_FOV_DEGREES = 45;
export function initialCamera(): CameraState {
  return {
    focus: { x: 11, y: 0, z: 12 },
    yaw: 0,
    pitch: 0.88,
    zoom: 12,
    projection: 'orthographic',
    levelId: null,
    rotationLocked: false,
    following: false,
  };
}
/** Pure client presentation controller. No world position, visibility grant, or simulation clock is changed. */
export function updateCamera(state: CameraState, command: CameraCommand): CameraState {
  switch (command.type) {
    case 'orbit':
      if (![command.yaw, command.pitch].every(Number.isFinite)) return state;
      return {
        ...state,
        yaw: state.rotationLocked
          ? state.yaw
          : Math.atan2(Math.sin(state.yaw + command.yaw), Math.cos(state.yaw + command.yaw)),
        pitch: clamp(state.pitch + command.pitch, Math.PI / 7.2, Math.PI / 2.4),
      };
    case 'pan': {
      if (
        ![command.dx, command.dy, command.viewportHeight].every(Number.isFinite) ||
        command.viewportHeight <= 0
      )
        return state;
      const scale = (state.zoom * 2) / command.viewportHeight;
      const dx = clamp(command.dx, -1000, 1000) * scale,
        dy = (clamp(command.dy, -1000, 1000) * scale) / Math.sin(state.pitch);
      return {
        ...state,
        following: false,
        focus: {
          x: clamp(state.focus.x - dx * Math.cos(state.yaw) - dy * Math.sin(state.yaw), -64, 192),
          y: state.focus.y,
          z: clamp(state.focus.z + dx * Math.sin(state.yaw) - dy * Math.cos(state.yaw), -64, 192),
        },
      };
    }
    case 'zoom':
      return Number.isFinite(command.delta)
        ? { ...state, zoom: clamp(state.zoom + command.delta, 4, 30) }
        : state;
    case 'focus':
      return finitePoint(command.point)
        ? { ...state, focus: { ...command.point }, levelId: null }
        : state;
    case 'level':
      return Number.isFinite(command.y)
        ? {
            ...state,
            following: false,
            levelId: command.id,
            focus: { ...state.focus, y: command.y },
          }
        : state;
    case 'projection':
      return {
        ...state,
        projection: state.projection === 'orthographic' ? 'perspective' : 'orthographic',
      };
    case 'follow':
      return { ...state, following: !state.following, levelId: null };
    case 'rotation-lock':
      return { ...state, rotationLocked: !state.rotationLocked };
  }
}
export function cameraPose(state: CameraState): { position: WorldPoint; target: WorldPoint } {
  const distance =
    state.projection === 'perspective'
      ? state.zoom / Math.tan((CAMERA_FOV_DEGREES * Math.PI) / 360)
      : Math.max(32, state.zoom * 2.5);
  const horizontal = Math.cos(state.pitch) * distance;
  return {
    position: {
      x: state.focus.x + Math.sin(state.yaw) * horizontal,
      y: state.focus.y + Math.sin(state.pitch) * distance,
      z: state.focus.z + Math.cos(state.yaw) * horizontal,
    },
    target: { ...state.focus },
  };
}
/** Only reusable view preferences survive reload; never retain a hidden-world focus or entity selection. */
export function cameraPreferences(state: CameraState) {
  return {
    yaw: state.yaw,
    pitch: state.pitch,
    zoom: state.zoom,
    projection: state.projection,
    rotationLocked: state.rotationLocked,
    following: state.following,
  };
}
export function restoreCameraPreferences(value: unknown): CameraState {
  const state = initialCamera();
  if (!value || typeof value !== 'object') return state;
  const v = value as Partial<CameraState>;
  if (typeof v.yaw === 'number' && Number.isFinite(v.yaw))
    state.yaw = Math.atan2(Math.sin(v.yaw), Math.cos(v.yaw));
  if (typeof v.pitch === 'number' && Number.isFinite(v.pitch))
    state.pitch = clamp(v.pitch, Math.PI / 7.2, Math.PI / 2.4);
  if (typeof v.zoom === 'number' && Number.isFinite(v.zoom)) state.zoom = clamp(v.zoom, 4, 30);
  if (v.projection === 'perspective') state.projection = v.projection;
  if (typeof v.rotationLocked === 'boolean') state.rotationLocked = v.rotationLocked;
  if (typeof v.following === 'boolean') state.following = v.following;
  return state;
}
