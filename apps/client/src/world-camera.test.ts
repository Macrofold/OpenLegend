import { describe, expect, it } from 'vitest';
import {
  cameraPose,
  cameraPreferences,
  initialCamera,
  restoreCameraPreferences,
  updateCamera,
} from './world-camera';

describe('plain tactical camera controller', () => {
  it('supports orbit, pitch, pan, projection and XYZ focus without changing the input', () => {
    const initial = initialCamera(),
      copy = structuredClone(initial);
    let state = updateCamera(initial, { type: 'orbit', yaw: Math.PI / 2, pitch: 0.1 });
    state = updateCamera(state, { type: 'pan', dx: 50, dy: 0, viewportHeight: 500 });
    expect(state.focus.z).not.toBe(initial.focus.z);
    state = updateCamera(state, { type: 'focus', point: { x: 2, y: 3, z: 4 } });
    const orthographic = cameraPose(state);
    state = updateCamera(state, { type: 'projection' });
    expect(state.projection).toBe('perspective');
    expect(cameraPose(state).target.y).toBe(3);
    expect(cameraPose(state).position).not.toEqual(orthographic.position);
    expect(initial).toEqual(copy);
  });
  it('clamps pitch/zoom, honors yaw lock and rejects nonfinite gestures', () => {
    let state = updateCamera(initialCamera(), { type: 'rotation-lock' });
    state = updateCamera(state, { type: 'orbit', yaw: 2, pitch: 200 });
    expect(state.yaw).toBe(0);
    expect(state.pitch).toBeLessThan(Math.PI / 2);
    expect(updateCamera(state, { type: 'zoom', delta: -1000 }).zoom).toBe(4);
    expect(updateCamera(state, { type: 'pan', dx: NaN, dy: 0, viewportHeight: 1 })).toBe(state);
    expect(updateCamera(state, { type: 'orbit', yaw: Infinity, pitch: 0 })).toBe(state);
  });
  it('persists visual preferences without stale entity or world focus', () => {
    const state = updateCamera(initialCamera(), { type: 'focus', point: { x: 99, y: 9, z: 99 } });
    const preferences = cameraPreferences(state);
    expect(preferences).not.toHaveProperty('focus');
    expect(
      restoreCameraPreferences({
        ...preferences,
        focus: { x: 100, y: 99, z: 100 },
      }).focus,
    ).toEqual(initialCamera().focus);
    expect(restoreCameraPreferences({ zoom: Infinity, pitch: NaN })).toEqual(initialCamera());
  });
});
