import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ACTION_INPUT,
  inputPreferenceProblem,
  isActionInputPreferences,
  movementDirection,
  movementKey,
  timingPhase,
  ringRadius,
} from './action-input';

describe('deliberate action input', () => {
  it('normalizes diagonal motion in camera space and cancels opposing keys', () => {
    const direction = movementDirection(new Set(['forward', 'right']), Math.PI / 2);
    expect(Math.hypot(direction.x, direction.z)).toBeCloseTo(1);
    expect(direction.x).toBeCloseTo(-Math.SQRT1_2);
    expect(direction.z).toBeCloseTo(-Math.SQRT1_2);
    expect(movementDirection(new Set(['forward', 'backward']), 1)).toEqual({ x: 0, z: 0 });
  });
  it('keeps existing shortcuts available and rejects ambiguous remaps', () => {
    expect(isActionInputPreferences(DEFAULT_ACTION_INPUT)).toBe(true);
    expect(movementKey('KeyW', DEFAULT_ACTION_INPUT)).toBe('forward');
    expect(inputPreferenceProblem({ ...DEFAULT_ACTION_INPUT, left: 'KeyC' })).toBeTruthy();
    expect(inputPreferenceProblem({ ...DEFAULT_ACTION_INPUT, left: 'KeyW' })).toBeTruthy();
    expect(inputPreferenceProblem({ ...DEFAULT_ACTION_INPUT, attackMode: 'KeyS' })).toBeTruthy();
    expect(isActionInputPreferences({ ...DEFAULT_ACTION_INPUT, forward: null })).toBe(false);
  });
  it('uses elapsed real time rather than animation callbacks for phase', () => {
    expect(timingPhase(100, 325, 0.9)).toBeCloseTo(0.25);
    expect(timingPhase(100, 1225, 0.9)).toBeCloseTo(0.25);
    expect(ringRadius(0.25)).toBe(0.5);
    expect(ringRadius(0.75)).toBe(0.5);
  });
});
