import {
  commandDescriptions,
  nativeActionIcon,
  selectedDailyRain,
  selectedEventPresentation,
  selectedPlayerControlCanUseInactive,
  selectedPlayerViewRules,
  selectedPlaytestMilestoneRules,
  type WorldState,
} from '../packages/domain/src/index.js';
import { digest } from '../apps/server/src/content-digest.js';
import { BASE_TIME_POLICY } from '../packages/domain/src/worlds/base/time.js';
import { rustGameServerScenePolicy } from './rust-game-server-scene.js';

/** Export only public, installed world display data. Account, progress and
 * observer evidence come from the Rust server's live permitted read. */
export function rustGameServerViewPolicy(world: WorldState) {
  const presentation = world.presentation;
  const status = world.statusEffectPolicy;
  const rules = selectedPlayerViewRules(world);
  const body = world.moduleManifest.bodyPolicy;
  const map = world.map;
  const art = presentation?.mapArt;
  const daylight = presentation?.daylight;
  const rain = selectedDailyRain(world);
  return {
    scene: rustGameServerScenePolicy(world),
    events: {
      journalMovement: rules.journalMovement,
      presentation: selectedEventPresentation(world),
    },
    world: {
      name: presentation?.worldName ?? 'World',
      timeLabel: presentation?.timeLabel ?? 'World time',
      introduction: presentation?.introduction,
      crafting: presentation?.crafting && {
        categoryLabel: presentation.crafting.categoryLabel,
        allLabel: presentation.crafting.allLabel,
        categories: presentation.crafting.categories,
      },
      dayLabel: presentation?.calendar?.dayLabel,
      historyTemplate: presentation?.calendar?.historyTemplate,
      namedTimes: Object.keys(status.namedTimes),
      offsetHours: status.clockOffsetHours,
      baseRatio: (world.timePolicy ?? BASE_TIME_POLICY).normalGameSecondsPerSecond,
      milestones: selectedPlaytestMilestoneRules(world),
      dailyRain: rain && {
        minX: rain.region.bounds.minX,
        maxX: rain.region.bounds.maxX,
        minZ: rain.region.bounds.minZ,
        maxZ: rain.region.bounds.maxZ,
        start: rain.windowLocalHours.start,
        end: rain.windowLocalHours.end,
        raining: rain.labels.raining,
        dry: rain.labels.dry,
        intensity: rain.intensity,
      },
      daylight: daylight && {
        startHour: status.namedTimes[daylight.startTime],
        endHour: status.namedTimes[daylight.endTime],
        noonElevationDegrees: daylight.noonElevationDegrees,
      },
      map: {
        width: map.width,
        height: map.height,
        spatial: map.spatial,
        tiles: map.tiles,
        terrain: map.terrain,
      },
      cartography: art && {
        art: { path: art.path, bounds: art.bounds, northDegrees: art.northDegrees },
        maxMarkers: art.maxMarkers,
        labelCharacters: art.labelCharacters,
        noteCharacters: world.knowledgePolicy?.maxCharacters.subject,
        markerIcons: art.markerIcons,
      },
      inventionPolicy: {
        revision: world.inventionPolicy.revision,
        playerLocked: world.inventionPolicy.playerLocked,
        agentLocked: world.inventionPolicy.agentLocked,
      },
      constructionRevision:
        world.hearthDefinitions || world.constructionProfile
          ? digest([world.hearthDefinitions, world.constructionProfile, []])
          : undefined,
    },
    controls: {
      moveDescription: commandDescriptions().move!,
      stopLabel: rules.stopLabel,
      stopIcon: nativeActionIcon('cancel'),
      stopInactive: selectedPlayerControlCanUseInactive(world, { type: 'cancel' }),
      noWork: rules.noWork,
      pausedAction: rules.pausedAction,
      unavailableAction: rules.unavailableAction,
      recoverLabel: body?.recovery?.label,
      recoverReason: rules.recoverReason,
      respawnLabel: body?.reincarnation?.continueLabel,
      respawnReason: rules.respawnReason,
    },
  };
}
