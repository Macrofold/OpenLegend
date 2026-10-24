import type { GameView } from '@open-legend/protocol';

/** Public authored lighting follows the same installed clock as the HUD.
 * It never changes physical perception. docs/world-presentation.md#sun-path */
export function sunlightAtHour(hour: number, policy?: GameView['clock']['daylight']) {
  if (!policy) return { toSun: { x: 0, y: 1, z: 0 }, daylight: 1, isDay: true };
  const duration = (policy.endHour - policy.startHour + 24) % 24,
    elapsed = (((hour - policy.startHour) % 24) + 24) % 24,
    phase =
      elapsed < duration
        ? (elapsed * Math.PI) / duration
        : Math.PI + ((elapsed - duration) * Math.PI) / (24 - duration),
    height = Math.sin(phase),
    elevation = (policy.noonElevationDegrees * Math.PI) / 180;
  return {
    toSun: { x: Math.cos(phase), y: height * Math.sin(elevation), z: height * Math.cos(elevation) },
    daylight: elapsed < duration ? Math.max(0, height) : 0,
    isDay: elapsed < duration,
  };
}
