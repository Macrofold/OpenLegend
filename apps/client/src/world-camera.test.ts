import { describe, expect, it } from 'vitest';
import {
  cameraPose,
  cameraPreferences,
  initialCamera,
  restoreCameraPreferences,
  updateCamera,
} from './world-camera';

describe('plain tactical camera controller', () => {
  it('supports orbit, pitch, pan, projection and level focus without changing the input', () => {
    const initial = initialCamera(),
      copy = structuredClone(initial);
    let state = updateCamera(initial, { type: 'orbit', yaw: Math.PI / 2, pitch: 0.1 });
    state = updateCamera(state, { type: 'pan', dx: 50, dy: 0, viewportHeight: 500 });
    expect(state.focus.z).not.toBe(initial.focus.z);
    state = updateCamera(state, { type: 'level', id: 'deck', y: 3 });
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
  it('persists visual preferences without stale entity, floor or world focus', () => {
    const state = updateCamera(initialCamera(), { type: 'level', id: 'secret-floor', y: 9 });
    const preferences = cameraPreferences(state);
    expect(JSON.stringify(preferences)).not.toContain('secret');
    expect(
      restoreCameraPreferences({
        ...preferences,
        focus: { x: 100, y: 99, z: 100 },
        levelId: 'secret',
      }).focus,
    ).toEqual(initialCamera().focus);
    expect(restoreCameraPreferences({ zoom: Infinity, pitch: NaN })).toEqual(initialCamera());
  });
});
