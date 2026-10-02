/** Bundled-world presentation preset, not gameplay astronomy. Replace this local
 * preset when another environment supplies an authorized lighting description.
 * docs/world-presentation.md#sun-path
 */
const SUNRISE_HOUR = 6;
const DAYLIGHT_HOURS = 12;
const NOON_ELEVATION = (60 * Math.PI) / 180;

/** Unit direction toward the sun; the light's rays travel in the opposite direction. */
export function sunlightAtHour(hour: number) {
  const wrappedHour = ((hour % 24) + 24) % 24;
  const phase = ((wrappedHour - SUNRISE_HOUR) * Math.PI) / DAYLIGHT_HOURS;
  const height = Math.sin(phase);
  // A tilted circular orbit: +X sunrise, +Z noon, −X sunset. No Euler interpolation
  // or horizon clamp; direction and intensity stay continuous across the whole day.
  return {
    toSun: {
      x: Math.cos(phase),
      y: height * Math.sin(NOON_ELEVATION),
      z: height * Math.cos(NOON_ELEVATION),
    },
    daylight: Math.max(0, height),
  };
}
