import { describe, expect, it } from 'vitest';
import {
  evaluateTimedRelease,
  validTimedReleaseProfile,
  type TimedReleaseProfile,
} from './execution-input.js';
const profile: TimedReleaseProfile = {
  kind: 'timed-release',
  periodSeconds: 0.9,
  center: 0.5,
  greenWidth: 0.06,
  ordinaryWidth: 0.15,
};
describe('optional execution evidence', () => {
  it('attains exact maxima and zero edges with both bundled and alternate narrow bands', () => {
    for (const center of [0.5, 0.43])
      for (const greenWidth of [0.06, 0.01]) {
        const value = { ...profile, center, greenWidth };
        expect(validTimedReleaseProfile(value)).toBe(true);
        for (const phase of [center / 2, 1 - center / 2]) {
          expect(evaluateTimedRelease(value, { kind: 'timed-release', phase })?.score).toBe(1);
        }
        for (const radius of [
          center - greenWidth,
          center + greenWidth,
          center - value.ordinaryWidth,
          center + value.ordinaryWidth,
        ])
          for (const phase of [radius / 2, 1 - radius / 2])
            expect(evaluateTimedRelease(value, { kind: 'timed-release', phase })?.score).toBe(0);
      }
  });
  it('refuses nonfinite claims and numerically collapsed authored bands', () => {
    for (const phase of [-1, 1, NaN, Infinity])
      expect(evaluateTimedRelease(profile, { kind: 'timed-release', phase })).toBeUndefined();
    expect(validTimedReleaseProfile({ ...profile, greenWidth: Number.MIN_VALUE })).toBe(false);
    expect(validTimedReleaseProfile({ ...profile, ordinaryWidth: 0.5 })).toBe(false);
  });
  it('keeps ordinary releases neutral', () => {
    expect(evaluateTimedRelease(profile, { kind: 'ordinary' })?.score).toBe(0);
  });
});
