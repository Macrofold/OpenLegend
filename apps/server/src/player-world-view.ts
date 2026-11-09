import type { WorldState } from '@open-legend/domain';
import type { GameView } from '@open-legend/protocol';
import { worldClockParts } from '@open-legend/protocol';

type Presentation = WorldState['presentation'];

/** Formatting accepts only authored presentation and an already permitted
 * current place label. A remembered place cannot stand in for current exposure. */
export function projectPlayerPresentation(presentation: Presentation, nearestLabel?: string) {
  const worldName = presentation?.worldName ?? 'World';
  return {
    worldName,
    locationName: nearestLabel ?? worldName,
    timeLabel: presentation?.timeLabel ?? 'World time',
    ...(presentation?.introduction ? { introduction: presentation.introduction } : {}),
    ...(presentation?.crafting
      ? {
          crafting: {
            categoryLabel: presentation.crafting.categoryLabel,
            allLabel: presentation.crafting.allLabel,
            categories: presentation.crafting.categories,
          },
        }
      : {}),
  };
}

export function playerCalendarFields(
  seconds: number,
  offsetHours: number,
  calendar: NonNullable<Presentation>['calendar'],
) {
  const { day, hour } = worldClockParts(seconds, offsetHours);
  return {
    seconds,
    day,
    hour,
    offsetHours,
    ...(calendar ? { dayLabel: calendar.dayLabel } : {}),
  };
}

export function projectPlayerCartography(
  art: NonNullable<NonNullable<Presentation>['mapArt']>,
  noteCharacters: number | undefined,
  revision: number,
  placesRevision: NonNullable<GameView['cartography']>['placesRevision'],
  markers: NonNullable<GameView['cartography']>['markers'],
): NonNullable<GameView['cartography']> {
  return {
    art: { path: art.path, bounds: { ...art.bounds }, northDegrees: art.northDegrees },
    revision,
    placesRevision,
    maxMarkers: art.maxMarkers,
    labelCharacters: art.labelCharacters,
    ...(noteCharacters === undefined ? {} : { noteCharacters }),
    markerIcons: art.markerIcons.map((icon) => ({ ...icon })),
    markers,
  };
}

export function projectPlayerClock(
  seconds: number,
  presentation: Presentation,
  namedTimes: Readonly<Record<string, number>>,
  offsetHours: number,
  operational: Pick<GameView['clock'], 'weather' | 'speed' | 'baseRatio' | 'paused' | 'pauseReason' | 'preparingNavigation'>,
): GameView['clock'] {
  return {
    weather: operational.weather,
    ...(presentation?.daylight
      ? {
          daylight: {
            startHour: namedTimes[presentation.daylight.startTime]!,
            endHour: namedTimes[presentation.daylight.endTime]!,
            noonElevationDegrees: presentation.daylight.noonElevationDegrees,
          },
        }
      : {}),
    ...playerCalendarFields(seconds, offsetHours, presentation?.calendar),
    speed: operational.speed,
    baseRatio: operational.baseRatio,
    paused: operational.paused,
    pauseReason: operational.pauseReason,
    preparingNavigation: operational.preparingNavigation,
    namedTimes: Object.keys(namedTimes),
  };
}
