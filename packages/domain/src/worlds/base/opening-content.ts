import { canStand } from '@open-legend/spatial';
import { occupiedBodySweepClear } from '../../spatial.js';
import { spatialMap, bodyProfile } from '../../spatial-state.js';
import { hasRecordFields, isSafeRecordId } from '../../records.js';
import { entityGet, entitySet, entityValues } from '../../entity-collection.js';
import { createItemLot, declareObjectOwner, itemsForOwner } from '../../objects.js';
import { definitionPin } from '../../world-modules.js';
import { supportedPosition, worldPlacement } from '../../spatial-state.js';
import { starterGroundAt, type StartingGroundReservation } from './landscape.js';
import { baseSpatial } from './spatial-definitions.js';
import type { WorldState } from '../../types.js';

export const OPENING_PERSON_ROLES = [
  'player',
  'ada',
  'mercenary',
  'mara',
  'tavin',
  'kest',
  'orin',
] as const;
type PersonRole = (typeof OPENING_PERSON_ROLES)[number];
type Point = { x: number; z: number };
export interface BaseOpeningContent {
  clockOffsetHours: number;
  actorBindings: Record<PersonRole, { application: 'player' | 'resident' } | { entityId: string }>;
  conditions: Record<PersonRole, { fullness: number; energy: number }>;
  watchpostOffset: Point;
  wildlife: Array<{ id: string; position: Point }>;
  hearths: Array<{
    id: string;
    name: string;
    description: string;
    position: Point;
    placeId: string;
  }>;
  repairStock: {
    id: string;
    name: string;
    description: string;
    position: Point;
    ownerRole: PersonRole;
    lots: Array<{ id: string; definitionId: string; quantity: number; positions: Point[] }>;
  };
  introduction: string;
}
/** Closed authored composition data. These rows select existing initializers,
 * never executable scripts, grants, plans or fictional past actions. */
export function compileBaseOpeningContent(
  value: unknown,
  extent: { width: number; depth: number },
): BaseOpeningContent {
  const fail = (): never => {
    throw new Error('Invalid complete Main opening content.');
  };
  const text = (s: unknown): s is string => typeof s === 'string' && !!s.trim() && s.length <= 4000;
  const point = (p: unknown): p is Point =>
    hasRecordFields(p, ['x', 'z']) &&
    typeof p.x === 'number' &&
    typeof p.z === 'number' &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.z) &&
    p.x >= 0 &&
    p.x < extent.width - 1 &&
    p.z >= 0 &&
    p.z < extent.depth - 1;
  if (
    !hasRecordFields(value, [
      'clockOffsetHours',
      'actorBindings',
      'conditions',
      'watchpostOffset',
      'wildlife',
      'hearths',
      'repairStock',
      'introduction',
    ]) ||
    typeof value.clockOffsetHours !== 'number' ||
    !Number.isFinite(value.clockOffsetHours) ||
    value.clockOffsetHours < 0 ||
    value.clockOffsetHours >= 24 ||
    !text(value.introduction) ||
    !hasRecordFields(value.actorBindings, [...OPENING_PERSON_ROLES]) ||
    !hasRecordFields(value.conditions, [...OPENING_PERSON_ROLES]) ||
    !hasRecordFields(value.watchpostOffset, ['x', 'z']) ||
    ![value.watchpostOffset.x, value.watchpostOffset.z].every(
      (n) => typeof n === 'number' && Number.isFinite(n),
    ) ||
    !Array.isArray(value.wildlife) ||
    !Array.isArray(value.hearths)
  )
    fail();
  const content = value as unknown as BaseOpeningContent;
  const identities = new Set<string>();
  for (const role of OPENING_PERSON_ROLES) {
    const binding = content.actorBindings[role] as unknown as Record<string, unknown>,
      condition = content.conditions[role];
    if (
      !(
        hasRecordFields(binding, ['application']) &&
        ['player', 'resident'].includes(String(binding.application))
      ) &&
      !(hasRecordFields(binding, ['entityId']) && isSafeRecordId(binding.entityId))
    )
      fail();
    const identity =
      'application' in binding ? `$${binding.application}` : String(binding.entityId);
    if (identities.has(identity)) fail();
    identities.add(identity);
    if (
      !hasRecordFields(condition, ['fullness', 'energy']) ||
      ![condition.fullness, condition.energy].every(
        (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100,
      )
    )
      fail();
  }
  const ids = new Set<string>();
  const id = (s: unknown) => {
    if (!isSafeRecordId(s) || ids.has(s)) fail();
    ids.add(s as string);
  };
  for (const animal of content.wildlife) {
    if (!hasRecordFields(animal, ['id', 'position']) || !point(animal.position)) fail();
    id(animal.id);
  }
  for (const hearth of content.hearths) {
    if (
      !hasRecordFields(hearth, ['id', 'name', 'description', 'position', 'placeId']) ||
      !text(hearth.name) ||
      !text(hearth.description) ||
      !point(hearth.position) ||
      !isSafeRecordId(hearth.placeId)
    )
      fail();
    id(hearth.id);
  }
  const stock = content.repairStock;
  if (
    !hasRecordFields(stock, ['id', 'name', 'description', 'position', 'ownerRole', 'lots']) ||
    !text(stock.name) ||
    !text(stock.description) ||
    !point(stock.position) ||
    !OPENING_PERSON_ROLES.includes(stock.ownerRole) ||
    !Array.isArray(stock.lots)
  )
    fail();
  id(stock.id);
  for (const lot of stock.lots) {
    if (
      !hasRecordFields(lot, ['id', 'definitionId', 'quantity', 'positions']) ||
      !isSafeRecordId(lot.definitionId) ||
      !Number.isSafeInteger(lot.quantity) ||
      lot.quantity < 1 ||
      !Array.isArray(lot.positions) ||
      !lot.positions.length ||
      !lot.positions.every(point) ||
      (lot.positions.length !== 1 && lot.positions.length !== lot.quantity)
    )
      fail();
    id(lot.id);
  }
  return structuredClone(content);
}
export function resolveOpeningPeople(
  content: BaseOpeningContent,
  playerId: string,
  residentId: string,
): Record<PersonRole, string> {
  const ids = Object.fromEntries(
    OPENING_PERSON_ROLES.map((role) => {
      const binding = content.actorBindings[role];
      return [
        role,
        'application' in binding
          ? binding.application === 'player'
            ? playerId
            : residentId
          : binding.entityId,
      ];
    }),
  ) as Record<PersonRole, string>;
  if (new Set(Object.values(ids)).size !== OPENING_PERSON_ROLES.length)
    throw new Error('Complete Main people require distinct identities.');
  return ids;
}
export function openingContentReservations(
  content: BaseOpeningContent,
): StartingGroundReservation[] {
  return [
    ...content.wildlife.map((row) => row.position),
    ...content.hearths.map((row) => row.position),
    content.repairStock.position,
    ...content.repairStock.lots.flatMap((row) => row.positions),
  ].map((p) => ({ minX: p.x - 1.5, maxX: p.x + 1.5, minZ: p.z - 1.5, maxZ: p.z + 1.5 }));
}
/** Creation-only conditions and possessions. Restoration never calls this. */
export function installBaseOpeningContent(
  world: WorldState,
  content: BaseOpeningContent,
  people: Record<PersonRole, string>,
): void {
  for (const role of OPENING_PERSON_ROLES) {
    const entity = entityGet(world.entities, people[role]);
    if (!entity?.actor) throw new Error(`The complete opening is missing ${role}.`);
  }
  for (const row of content.wildlife) {
    const animal = entityGet(world.entities, row.id);
    if (!animal?.animal || !animal.actor)
      throw new Error('The retained animal identity is missing.');
    const point = starterGroundAt(world.map.spatial!, row.position.x, row.position.z);
    animal.placement = worldPlacement(point, point.surfaceId);
  }
  for (const row of content.hearths) {
    const prior = entityGet(world.entities, row.id),
      point = starterGroundAt(world.map.spatial!, row.position.x, row.position.z);
    if (prior && !prior.heat)
      throw new Error('A public hearth collides with another starting identity.');
    entitySet(world.entities, row.id, {
      ...(prior ?? { spatial: baseSpatial('object') }),
      id: row.id,
      name: row.name,
      description: row.description,
      kind: 'campfire',
      icon: 'action.fire',
      placement: worldPlacement(point, point.surfaceId),
      heat: { lit: false, fuelSeconds: 0 },
    });
    world.places![row.placeId] = {
      id: row.placeId,
      revision: 1,
      label: row.name,
      description: row.description,
      point: { ...point },
      landmarkId: row.id,
      exposure: { kind: 'arrive-and-see', radius: 4, importance: 8 },
    };
  }
  const stock = content.repairStock,
    ground = (p: Point) => starterGroundAt(world.map.spatial!, p.x, p.z),
    centre = ground(stock.position);
  if (entityGet(world.entities, stock.id)) throw new Error('Repair stock identity collision.');
  entitySet(world.entities, stock.id, {
    id: stock.id,
    name: stock.name,
    description: stock.description,
    kind: 'item-pile',
    spatial: baseSpatial('object'),
    placement: worldPlacement(centre, centre.surfaceId),
  });
  for (const row of stock.lots) {
    const definition = world.itemDefinitions[row.definitionId];
    if (!definition) throw new Error('Repair stock requires its installed material.');
    for (const [index, position] of row.positions.entries()) {
      const pileId = `${row.id}:ground:${index}`,
        lotId = `${row.id}:lot:${index}`,
        point = ground(position);
      if (entityGet(world.entities, pileId) || entityGet(world.entities, lotId))
        throw new Error('Repair material identity collision.');
      entitySet(world.entities, pileId, {
        id: pileId,
        name: stock.name,
        description: stock.description,
        kind: 'item-pile',
        spatial: baseSpatial('object'),
        placement: worldPlacement(point, point.surfaceId),
      });
      createItemLot(
        world,
        pileId,
        row.definitionId,
        row.positions.length === 1 ? row.quantity : 1,
        lotId,
      );
      declareObjectOwner(world, lotId, 0, people[stock.ownerRole], 'public', stock.id);
    }
  }
  if (itemsForOwner(world, people.player).length)
    throw new Error('The complete Main player must arrive empty handed.');
}
export interface BaseOpeningManifestEntry {
  id: string;
  change: 'retained' | 'relocated' | 'replaced-quantity' | 'new';
  installer: string;
  position?: ReturnType<typeof supportedPosition>;
  definition?: ReturnType<typeof definitionPin>;
  quantity?: number;
  parentId?: string;
  declaredOwnerId?: string | null;
}
/** Derived comparison evidence, not a second saved inventory or authority owner. */
export function baseOpeningContentManifest(
  world: WorldState,
  content: BaseOpeningContent,
  sources: readonly import('./first-playable-config.js').BaseResourceSource[],
): Record<string, BaseOpeningManifestEntry> {
  const relocated = new Set([
      ...content.wildlife.map((row) => row.id),
      'kest',
      'orin',
      'watchpost-cache',
    ]),
    newIds = new Set([
      content.repairStock.id,
      ...content.hearths.filter((row) => row.id !== 'campfire').map((row) => row.id),
    ]),
    sourceRows = new Map(sources.map((source) => [source.id, source])),
    repairIds = new Set(
      content.repairStock.lots.flatMap((row) =>
        row.positions.flatMap((_, index) => [
          `${row.id}:ground:${index}`,
          `${row.id}:lot:${index}`,
        ]),
      ),
    );
  return Object.fromEntries(
    [...entityValues(world.entities)].map((entity) => {
      const point = supportedPosition(entity),
        definition = entity.item
          ? world.itemDefinitions[entity.item.definitionPin.id]
          : entity.resource
            ? world.itemDefinitions[entity.resource.definitionId]
            : undefined;
      const repair = repairIds.has(entity.id) || entity.id === content.repairStock.id,
        newPlace = world.constructionProfile?.suggestionPlaceIds?.some(
          (id) => world.places[id]?.landmarkId === entity.id,
        ),
        pasture = entity.id.startsWith('base:pasture-');
      const row: BaseOpeningManifestEntry = {
        id: entity.id,
        change:
          repair ||
          newIds.has(entity.id) ||
          newPlace ||
          pasture ||
          sourceRows.get(entity.id)?.placement.kind === 'anchor'
            ? 'new'
            : relocated.has(entity.id)
              ? 'relocated'
              : sourceRows.has(entity.id)
                ? 'replaced-quantity'
                : 'retained',
        installer: repair
          ? 'watchpost-repair-stock'
          : sourceRows.has(entity.id)
            ? 'first-playable-resources'
            : pasture
              ? 'first-playable-ecology'
              : 'ordinary-scenario',
        ...(point ? { position: { ...point } } : {}),
        ...(definition ? { definition: definitionPin(definition) } : {}),
        ...(entity.item
          ? { quantity: entity.item.quantity }
          : entity.resource
            ? { quantity: entity.resource.quantity }
            : {}),
        ...(entity.placement?.mode === 'contained'
          ? { parentId: entity.placement.parentEntityId }
          : {}),
        ...(entity.declaredOwner ? { declaredOwnerId: entity.declaredOwner.holderId } : {}),
      };
      return [entity.id, row];
    }),
  );
}

/** Creation admission checks actual geometry; a configured reservation alone is
 * never proof that a supported clear body exists. */
export function validateBaseOpeningPlacements(world: WorldState): void {
  const map = spatialMap(world);
  for (const entity of entityValues(world.entities)) {
    if (entity.placement?.mode !== 'world') continue;
    const point = supportedPosition(entity);
    if (
      !point ||
      !canStand(map, point, bodyProfile(entity)) ||
      !occupiedBodySweepClear(world, entity, point, point)
    )
      throw new Error(`The starting body for ${entity.id} has no clear supported placement.`);
  }
}

export function installBaseCampSuggestions(
  world: WorldState,
  sites: import('./first-playable-config.js').BaseOpeningGeometry['campReservations'],
): void {
  const ids: string[] = [];
  const boundary = world.assemblyFamilies?.[world.constructionProfile!.boundary!.id];
  if (boundary?.implementation !== 'grounded-panel-boundary')
    throw new Error('The suggested camp requires its installed building geometry.');
  for (const site of sites) {
    const id = `camp-site:${site.id}`,
      markerId = `${id}:marker`,
      centre = starterGroundAt(
        world.map.spatial!,
        (site.minX + site.maxX) / 2,
        (site.minZ + site.maxZ) / 2,
      ),
      marker = starterGroundAt(world.map.spatial!, site.minX - 0.6, centre.z);
    if (entityGet(world.entities, markerId) || world.places[id])
      throw new Error('Camp suggestion identity collision.');
    entitySet(world.entities, markerId, {
      id: markerId,
      name: site.label,
      description: site.description,
      kind: 'resource',
      spatial: baseSpatial('object'),
      placement: worldPlacement(marker, marker.surfaceId),
      appearance: 'study:marker-worn-post',
    });
    world.places[id] = {
      id,
      revision: site.revision,
      label: site.label,
      description: site.description,
      point: starterGroundAt(
        world.map.spatial!,
        centre.x - boundary.geometry.section.spacing,
        centre.z - boundary.geometry.section.spacing,
      ),
      landmarkId: markerId,
      exposure: { kind: 'arrive-and-see', radius: 4, importance: 8 },
    };
    ids.push(id);
  }
  world.constructionProfile!.suggestionPlaceIds = ids;
}
