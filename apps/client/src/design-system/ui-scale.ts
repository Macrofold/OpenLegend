export const UI_SCALES = [0.9, 1, 1.15, 1.3] as const;
export const AUTO_UI_SCALE_RANGE = [UI_SCALES[0], 1] as const;
export type UiScalePreference = 'auto' | number;

export function isUiScalePreference(value: unknown): value is UiScalePreference {
  return value === 'auto' || (typeof value === 'number' && UI_SCALES.some((n) => n === value));
}

/** Size against the available CSS viewport, not display pixels or pixel density.
 * The shorter axis preserves world space on wide/short windows. Keep the existing
 * minimum; below it, layout adapts instead of shrinking text. Roomier windows
 * give space back to the world; larger reading sizes remain an explicit choice.
 * docs/limits/ui-ux.md#uxl14 */
export function resolveUiScale(
  preference: UiScalePreference,
  width: number,
  height: number,
): number {
  if (preference !== 'auto') return preference;
  return Math.max(
    AUTO_UI_SCALE_RANGE[0],
    Math.min(AUTO_UI_SCALE_RANGE[1], width / 1920, height / 1080),
  );
}
