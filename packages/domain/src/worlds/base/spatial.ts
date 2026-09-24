import type { SpatialLayout } from '@open-legend/spatial';
import type { FlightRoute } from '../../spatial-state.js';

export function starterSpatialLayout(width: number, depth: number): SpatialLayout {
  return {
    version: 1,
    revision: 1,
    disclosure: 'public',
    levels: [
      { id: 'ground', name: 'Clearing', focusY: 0 },
      { id: 'lookout', name: 'Lookout deck', focusY: 3 },
    ],
    surfaces: [
      {
        id: 'terrain',
        name: 'Clearing ground',
        levelId: 'ground',
        minX: 0,
        maxX: width - 1,
        minZ: 0,
        maxZ: depth - 1,
        y: 0,
        slopeX: 0,
        slopeZ: 0,
        thickness: 1,
        solidBase: -16,
        acousticTransmission: 0,
        material: 'ground',
      },
      {
        id: 'lookout-deck',
        name: 'Lookout deck',
        levelId: 'lookout',
        minX: 18,
        maxX: 25,
        minZ: 4,
        maxZ: 7,
        y: 3,
        slopeX: 0,
        slopeZ: 0,
        thickness: 0.35,
        acousticTransmission: 0.45,
        material: 'timber',
      },
      {
        id: 'lookout-ramp',
        name: 'Lookout ramp',
        levelId: 'ground',
        minX: 23,
        maxX: 25,
        minZ: 7,
        maxZ: 13,
        y: 3,
        slopeX: 0,
        slopeZ: -0.5,
        thickness: 0.25,
        solidBase: 0,
        acousticTransmission: 0.25,
        material: 'stone',
      },
    ],
    blockers: [
      {
        id: 'lookout-pillar-west',
        bounds: { min: { x: 18.15, y: 0, z: 4.15 }, max: { x: 18.55, y: 2.65, z: 4.55 } },
        movement: true,
        sight: true,
        acousticTransmission: 0.4,
        material: 'timber',
      },
      {
        id: 'lookout-pillar-east',
        bounds: { min: { x: 24.45, y: 0, z: 4.15 }, max: { x: 24.85, y: 2.65, z: 4.55 } },
        movement: true,
        sight: true,
        acousticTransmission: 0.4,
        material: 'timber',
      },
      {
        id: 'lookout-wall',
        bounds: { min: { x: 18, y: 3, z: 4 }, max: { x: 21, y: 4.4, z: 4.2 } },
        movement: true,
        sight: true,
        acousticTransmission: 0.4,
        material: 'timber',
      },
    ],
  };
}
export function starterFlightRoutes(): Record<string, FlightRoute> {
  return {
    'clearing-bird-loop': {
      id: 'clearing-bird-loop',
      speed: 0.12,
      climbSpeed: 0.06,
      points: [
        { position: { x: 22, y: 3, z: 5.5 }, landingSurfaceId: 'lookout-deck', waitSeconds: 180 },
        { position: { x: 22, y: 5.5, z: 5.5 }, waitSeconds: 0 },
        { position: { x: 15, y: 5.5, z: 9 }, waitSeconds: 0 },
        { position: { x: 10, y: 4.5, z: 15 }, waitSeconds: 0 },
        { position: { x: 20, y: 5.5, z: 16 }, waitSeconds: 0 },
        { position: { x: 22, y: 5.5, z: 5.5 }, waitSeconds: 0 },
      ],
    },
  };
}
