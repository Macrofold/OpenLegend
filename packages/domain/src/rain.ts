import type { IncidentRain, WorldPoint } from '@open-legend/spatial';
import type { DailyRainDefinition } from './assembly-types.js';
import type { WorldState } from './types.js';
import { getOwn, hasRecordFields, isSafeRecordId } from './records.js';
import { definitionPin } from './world-modules.js';
import { isDefinitionPin, sameDefinitionPin } from './state-owners.js';
import { inDailyWindow, localHour } from './status-effects.js';
import { dailyWindowBoundary } from './simulation-time.js';

export type DailyRainShape = Pick<
  DailyRainDefinition,
  'id' | 'version' | 'implementation' | 'windowLocalHours' | 'intensity' | 'overlap' | 'labels'
>;
export function validateDailyRainShape(
  value: unknown,
): asserts value is DailyRainShape & { clock: unknown; region: unknown } {
  if (
    !hasRecordFields(value, [
      'id',
      'version',
      'implementation',
      'clock',
      'windowLocalHours',
      'region',
      'intensity',
      'overlap',
      'labels',
    ]) ||
    !isSafeRecordId(value.id) ||
    !Number.isSafeInteger(value.version) ||
    Number(value.version) < 1 ||
    value.implementation !== 'daily-vertical-rain' ||
    value.overlap !== 'maximum' ||
    typeof value.intensity !== 'number' ||
    !Number.isFinite(value.intensity) ||
    value.intensity < 0 ||
    value.intensity > 1 ||
    !hasRecordFields(value.windowLocalHours, ['start', 'end']) ||
    ![value.windowLocalHours.start, value.windowLocalHours.end].every(
      (n) => typeof n === 'number' && Number.isFinite(n),
    ) ||
    Number(value.windowLocalHours.start) < 0 ||
    Number(value.windowLocalHours.start) >= Number(value.windowLocalHours.end) ||
    Number(value.windowLocalHours.end) >= 24 ||
    !hasRecordFields(value.labels, ['raining', 'dry']) ||
    Object.values(value.labels).some((t) => typeof t !== 'string' || !t.trim() || t.length > 500)
  )
    throw new Error('Invalid daily vertical-rain definition.');
}
export function validateDailyRain(world: WorldState): void {
  for (const [id, definition] of Object.entries(world.dailyRainDefinitions ?? {})) {
    validateDailyRainShape(definition);
    const { clock, region } = definition;
    if (
      id !== definition.id ||
      !hasRecordFields(clock, ['clock', 'offsetHours']) ||
      clock.clock !== 'localTime' ||
      clock.offsetHours !== world.statusEffectPolicy.clockOffsetHours ||
      !hasRecordFields(region, ['opening', 'bounds']) ||
      !isDefinitionPin(region.opening) ||
      !hasRecordFields(region.bounds, ['id', 'version', 'minX', 'maxX', 'minZ', 'maxZ']) ||
      !isSafeRecordId(region.bounds.id) ||
      !Number.isSafeInteger(region.bounds.version) ||
      Number(region.bounds.version) < 1 ||
      !(['minX', 'maxX', 'minZ', 'maxZ'] as const).every(
        (key) => typeof region.bounds[key] === 'number' && Number.isFinite(region.bounds[key]),
      ) ||
      !sameDefinitionPin(
        region.opening,
        definitionPin(region.bounds as DailyRainDefinition['region']['bounds']),
      ) ||
      Number(region.bounds.minX) >= Number(region.bounds.maxX) ||
      Number(region.bounds.minZ) >= Number(region.bounds.maxZ)
    )
      throw new Error('Daily rain requires its exact installed clock and finite opening bounds.');
  }
  const pin = world.constructionProfile?.dailyRain;
  if (pin) {
    const definition = getOwn(world.dailyRainDefinitions ?? {}, pin.id);
    if (!isDefinitionPin(pin) || !definition || !sameDefinitionPin(pin, definitionPin(definition)))
      throw new Error('The selected daily rain is missing or changed.');
  }
}
export function selectedDailyRain(world: WorldState): DailyRainDefinition | undefined {
  const pin = world.constructionProfile?.dailyRain;
  return pin && world.dailyRainDefinitions?.[pin.id];
}
/** At most one ordinary source and one explicitly requested finite cue. No mutable weather phase. */
export function incidentRain(world: WorldState): readonly IncidentRain[] {
  const daily = selectedDailyRain(world),
    sources: IncidentRain[] = [];
  if (
    daily &&
    daily.intensity > 0 &&
    inDailyWindow(localHour(world), daily.windowLocalHours.start, daily.windowLocalHours.end)
  )
    sources.push({ ...daily.region.bounds, intensity: daily.intensity });
  const cue = world.finiteRain;
  if (cue && cue.intensity > 0 && world.simTime >= cue.startsAt && world.simTime < cue.endsAt)
    sources.push(cue);
  return sources;
}
export function dailyRainBoundary(world: WorldState): number {
  const daily = selectedDailyRain(world);
  return daily ? dailyWindowBoundary(world, daily.windowLocalHours) : Infinity;
}
export function localWeatherView(
  world: WorldState,
  point: WorldPoint,
): { label: string; intensity: number } | undefined {
  const daily = selectedDailyRain(world);
  if (!daily) return;
  const intensity = incidentRain(world).reduce(
    (maximum, source) =>
      point.x >= source.minX &&
      point.x <= source.maxX &&
      point.z >= source.minZ &&
      point.z <= source.maxZ
        ? Math.max(maximum, source.intensity)
        : maximum,
    0,
  );
  return { label: intensity > 0 ? daily.labels.raining : daily.labels.dry, intensity };
}
