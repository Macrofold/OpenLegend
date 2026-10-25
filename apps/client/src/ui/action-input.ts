/** Device preferences and input geometry. These never contain world authority.
 * docs/projects/action-execution-and-skill-expression-tech-design.md#6-deviceui-and-accessibility-integration
 */
export interface ActionInputPreferences {
  forward: string;
  backward: string;
  left: string;
  right: string;
  attackMode: string;
  create: string;
}
export const DEFAULT_ACTION_INPUT: ActionInputPreferences = {
  forward: 'KeyW',
  backward: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  attackMode: 'KeyT',
  create: 'KeyW',
};
export const ATTACK_HOLD_MS = 150;
export type MovementKey = 'forward' | 'backward' | 'left' | 'right';
const movementKeys: MovementKey[] = ['forward', 'backward', 'left', 'right'];
const fixedPlainKeys = new Set(['KeyI', 'KeyC', 'KeyK', 'KeyJ', 'KeyV', 'KeyT', 'KeyP']);
const fixedShiftKeys = new Set(['KeyA', 'KeyS']);

export function inputPreferenceProblem(preferences: ActionInputPreferences): string | null {
  const directions = movementKeys.map((key) => preferences[key]);
  if (
    [...directions, preferences.attackMode, preferences.create].some(
      (code) => !/^Key[A-Z]$/.test(code),
    )
  )
    return 'Choose a letter key for each control.';
  if (new Set(directions).size !== directions.length)
    return 'Each movement direction needs a different key.';
  if (directions.some((code) => fixedPlainKeys.has(code)))
    return 'That movement key already opens another control. Choose another letter.';
  if (
    preferences.attackMode === preferences.create ||
    fixedShiftKeys.has(preferences.attackMode) ||
    fixedShiftKeys.has(preferences.create)
  )
    return 'That shifted key is already assigned. Choose another letter.';
  return null;
}
export function isActionInputPreferences(value: unknown): value is ActionInputPreferences {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    [...movementKeys, 'attackMode', 'create'].every((key) => typeof candidate[key] === 'string') &&
    inputPreferenceProblem(candidate as unknown as ActionInputPreferences) === null
  );
}
export function movementKey(
  code: string,
  preferences: ActionInputPreferences,
): MovementKey | undefined {
  return movementKeys.find((key) => preferences[key] === code);
}
/** Screen up points away from the camera on the horizontal plane. */
export function movementDirection(
  keys: ReadonlySet<MovementKey>,
  yaw: number,
): { x: number; z: number } {
  const side = Number(keys.has('right')) - Number(keys.has('left'));
  const forward = Number(keys.has('forward')) - Number(keys.has('backward'));
  const length = Math.hypot(side, forward);
  if (!length) return { x: 0, z: 0 };
  return {
    x: (side * Math.cos(yaw) - forward * Math.sin(yaw)) / length,
    z: (-side * Math.sin(yaw) - forward * Math.cos(yaw)) / length,
  };
}
export function timingPhase(origin: number, now: number, periodSeconds: number): number {
  return ((((now - origin) / (periodSeconds * 1000)) % 1) + 1) % 1;
}
export function ringRadius(phase: number): number {
  return phase <= 0.5 ? phase * 2 : (1 - phase) * 2;
}
