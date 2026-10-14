import {
  canWalkSegment,
  distance3D,
  SPATIAL_LIMITS,
  type NavigationRequest,
  type NavigationResult,
  type SurfacePoint,
} from '@open-legend/spatial';
import { nativeOperationAvailable, SIMULATION_RULES } from '../../kernel.js';
import { inventoryTotals } from '../../objects.js';
import { findApproachPath, isWalkable } from '../../spatial.js';
import { bodyProfile, spatialMap, supportedPosition, worldPlacement } from '../../spatial-state.js';
import { recipeFamily } from '../../world-modules.js';
import { supportsManualWork } from '../../living.js';
import type { Entity, WorldState } from '../../types.js';
import { BASE_OPENING_PROFILE, type BaseInitialWorldCandidate } from './initial-opening.js';
import { NATIVE_PREPARATIONS } from './items.js';

export interface BaseOpeningReadiness {
  activity: string;
  payoff: string;
  findings: Array<{ id: string; status: 'ready' | 'blocked' | 'incomplete'; message: string }>;
  navigation: Array<{ id: string; request: NavigationRequest }>;
}

/** These are read-only checks on one prepared opening, not actions or future success.
 * Server-native route results must remain bound to this exact candidate/request.
 */
export function checkBaseOpeningReadiness(
  candidate: BaseInitialWorldCandidate,
  world: WorldState,
  completedRoutes: ReadonlyMap<string, NavigationResult> = new Map(),
): BaseOpeningReadiness {
  const profile = BASE_OPENING_PROFILE.openings.find(
    (opening) => opening.id === candidate.opening,
  )!;
  const result: BaseOpeningReadiness = {
    activity: profile.activity,
    payoff: profile.payoff,
    findings: [],
    navigation: [],
  };
  const finding = (
    id: string,
    status: BaseOpeningReadiness['findings'][number]['status'],
    message: string,
  ) => result.findings.push({ id, status, message });
  const player = world.entities[candidate.player.id];
  const start = player && supportedPosition(player);
  if (
    !player ||
    !start ||
    !isWalkable(world, start, start.surfaceId, bodyProfile(player)) ||
    !supportsManualWork(player)
  ) {
    finding(
      'controlled-person',
      'blocked',
      'The controlled person needs a supported body and clear standing position.',
    );
    return result;
  }
  finding(
    'controlled-person',
    'ready',
    'The controlled person has a supported body, exact standing support and body clearance.',
  );
  const resumed = { ...world, paused: false };
  const totals = new Map(
    inventoryTotals(world, player.id).map((stock) => [stock.definitionId, stock.quantity]),
  );
  const route = (
    target: Entity,
    reach: number,
  ): { status: 'ready'; stance: SurfacePoint } | { status: 'blocked' | 'incomplete' } => {
    const plan = findApproachPath(world, player, target, reach);
    if (!plan) return { status: 'blocked' };
    if (plan.status === 'reached') return { status: 'ready', stance: plan.path.at(-1) ?? start };
    if (plan.status !== 'pending')
      return { status: plan.status === 'budget-exceeded' ? 'incomplete' : 'blocked' };
    const id = `access:${target.id}`;
    const completed = completedRoutes.get(id);
    if (!completed) {
      result.navigation.push({ id, request: plan.request });
      return { status: 'incomplete' };
    }
    if (completed.status !== 'reached')
      return {
        status: ['budget-exceeded', 'unavailable'].includes(completed.status)
          ? 'incomplete'
          : 'blocked',
      };
    // Use the same physical segment/endpoint requirements as native route admission.
    // A corridor or partial path alone is never proof of a reachable work stance.
    let previous = plan.request.from;
    if (completed.path.length > SPATIAL_LIMITS.maxPathPoints) return { status: 'incomplete' };
    for (const point of completed.path) {
      if (!canWalkSegment(spatialMap(world), previous, point, bodyProfile(player)))
        return { status: 'blocked' };
      previous = point;
    }
    return plan.request.destinations.some(
      (destination) =>
        destination.surfaceId === previous.surfaceId && distance3D(destination, previous) < 1e-6,
    )
      ? { status: 'ready', stance: previous }
      : { status: 'incomplete' };
  };
  const sourceQuantity = (
    definitionId: string,
    minimum: number,
  ): { status: 'ready' | 'blocked' | 'incomplete'; quantity: number } => {
    let quantity = 0;
    let incomplete = false;
    const pendingStart = result.navigation.length;
    for (const scene of candidate.scene) {
      if (scene.kind !== 'resource' || scene.definition.id !== definitionId || scene.quantity < 1)
        continue;
      const target = world.entities[scene.id]!;
      const access = route(target, SIMULATION_RULES.interactionRadius);
      if (access.status === 'incomplete') incomplete = true;
      if (access.status !== 'ready') continue;
      // Hypothetical standing is a read-only eligibility query; it creates no final
      // position, perception, knowledge, receipt, time or RNG change.
      const standingPlayer: Entity = {
        ...player,
        placement: worldPlacement(access.stance, access.stance.surfaceId),
      };
      const atSource = { ...resumed, entities: { ...world.entities, [player.id]: standingPlayer } };
      const available = nativeOperationAvailable(atSource, {
        id: 'opening-gather-check',
        actorId: player.id,
        type: 'gather',
        targetId: target.id,
      });
      if (!available.ok) {
        if (available.code.includes('budget')) incomplete = true;
        continue;
      }
      quantity += target.resource!.quantity;
      if (quantity >= minimum) {
        result.navigation.splice(pendingStart);
        return { status: 'ready', quantity };
      }
    }
    return { status: incomplete ? 'incomplete' : 'blocked', quantity };
  };
  const anyAccess = (targets: readonly Entity[]): 'ready' | 'blocked' | 'incomplete' => {
    const pendingStart = result.navigation.length;
    let incomplete = false;
    for (const target of targets) {
      const access = route(target, SIMULATION_RULES.interactionRadius);
      if (access.status === 'ready') {
        result.navigation.splice(pendingStart);
        return 'ready';
      }
      incomplete ||= access.status === 'incomplete';
    }
    return incomplete ? 'incomplete' : 'blocked';
  };

  const method = world.knowledge[player.id]
    ?.map((known) => world.recipes[known.recipeId])
    .find((recipe) => recipe?.familyPin.id === 'base:woven-container');
  if (!method)
    finding(
      'known-making',
      'blocked',
      'The controlled person has not learned the selected dependable container method.',
    );
  else {
    const immediate = nativeOperationAvailable(resumed, {
      id: 'opening-craft-check',
      actorId: player.id,
      type: 'craft',
      recipeId: method.id,
    });
    if (immediate.ok)
      finding(
        'known-making',
        'ready',
        'The known container method can start through ordinary crafting with current possessions.',
      );
    else if (immediate.code !== 'missing-material')
      finding(
        'known-making',
        immediate.code.includes('budget') ? 'incomplete' : 'blocked',
        immediate.message,
      );
    else {
      const inputs = new Map<string, number>();
      for (const input of method.inputs)
        inputs.set(input.definitionId, (inputs.get(input.definitionId) ?? 0) + input.quantity);
      const cordNeeded = Math.max(
        0,
        (inputs.get(NATIVE_PREPARATIONS.cord.output) ?? 0) -
          (totals.get(NATIVE_PREPARATIONS.cord.output) ?? 0),
      );
      const cordBatches = Math.ceil(cordNeeded / NATIVE_PREPARATIONS.cord.outputQuantity);
      const fiberNeeded = Math.max(
        0,
        (inputs.get(NATIVE_PREPARATIONS.fiber.output) ?? 0) +
          cordBatches * NATIVE_PREPARATIONS.cord.inputQuantity -
          (totals.get(NATIVE_PREPARATIONS.fiber.output) ?? 0),
      );
      const fiberBatches = Math.ceil(fiberNeeded / NATIVE_PREPARATIONS.fiber.outputQuantity);
      const rawNeeded = Math.max(
        0,
        fiberBatches * NATIVE_PREPARATIONS.fiber.inputQuantity -
          (totals.get(NATIVE_PREPARATIONS.fiber.input) ?? 0),
      );
      const otherMissing = [...inputs].some(
        ([definitionId, quantity]) =>
          definitionId !== NATIVE_PREPARATIONS.fiber.output &&
          definitionId !== NATIVE_PREPARATIONS.cord.output &&
          (totals.get(definitionId) ?? 0) < quantity,
      );
      const supply = rawNeeded
        ? sourceQuantity(NATIVE_PREPARATIONS.fiber.input, rawNeeded)
        : { status: 'ready' as const, quantity: 0 };
      finding(
        'known-making',
        otherMissing ? 'blocked' : supply.status,
        otherMissing
          ? 'The known method is missing an input outside this opening’s supported fiber preparation route.'
          : supply.status === 'ready'
            ? 'Accessible finite fibers and the existing preparation rules supply the known container method’s actual missing inputs.'
            : supply.status === 'incomplete'
              ? 'The required route to enough gatherable fibers is still incomplete.'
              : 'The known container needs more accessible fibers than this opening supplies.',
      );
    }
  }

  if (candidate.opening === 'inhabited') {
    const swing = recipeFamily(world, 'base:swing');
    const invention =
      !!swing &&
      !world.inventionPolicy.playerLocked &&
      world.authorship.playerAccountIds[player.id] !== undefined;
    finding(
      'invention-opportunity',
      invention ? 'ready' : 'blocked',
      invention
        ? 'The current human invention policy and installed sling-like family support a new-tool proposal; its actual generated contents still require ordinary admission.'
        : 'The selected opening lacks an admitted hunting-tool family, player account binding or permission to propose it.',
    );
    const ammunition =
      (totals.get('stone') ?? 0) > 0
        ? { status: 'ready' as const, quantity: totals.get('stone')! }
        : sourceQuantity('stone', 1);
    finding(
      'ammunition',
      ammunition.status,
      ammunition.status === 'ready'
        ? 'Finite compatible stone ammunition is carried or available through an admitted reachable gathering opportunity.'
        : ammunition.status === 'incomplete'
          ? 'The route to required ammunition is still incomplete.'
          : 'The opening has no accessible compatible hunting ammunition.',
    );
    const quarryAccess = anyAccess(
      candidate.scene
        .filter((scene) => scene.kind === 'hare')
        .map((scene) => world.entities[scene.id]!)
        .filter((entity) => entity.actor?.alive),
    );
    finding(
      'hunting-target',
      quarryAccess,
      quarryAccess === 'ready'
        ? 'A live supported animal has a reachable current approach; readiness does not guarantee a hunting hit or predict its movement.'
        : quarryAccess === 'incomplete'
          ? 'The initial route toward the selected quarry is incomplete.'
          : 'The selected hunting activity needs a currently reachable supported live quarry.',
    );
    const heatAccess = anyAccess(
      candidate.scene
        .filter((scene) => scene.kind === 'fire' && scene.fuelSeconds > 0)
        .map((scene) => world.entities[scene.id]!),
    );
    finding(
      'cooking-access',
      heatAccess,
      heatAccess === 'ready'
        ? 'A lit finite-fuel fire has a physically reachable cooking stance.'
        : heatAccess === 'incomplete'
          ? 'The required route to cooking heat is incomplete.'
          : 'The hunting-food loop needs reachable supported cooking heat.',
    );
    const toolMaterials = (totals.get('prepared_fiber') ?? 0) > 0 && (totals.get('cord') ?? 0) > 0;
    finding(
      'tool-inputs',
      toolMaterials ? 'ready' : 'blocked',
      toolMaterials
        ? 'Actual pouch and binding materials are present for a supported hunting-tool proposal; the generated tool’s exact requirements remain to be checked.'
        : 'The advertised invention opportunity is missing its required supported pouch or binding materials.',
    );
  }
  const foodNavigationStart = result.navigation.length;
  const food =
    (totals.get('berries') ?? 0) > 0 || (totals.get('cooked_meat') ?? 0) > 0
      ? { status: 'ready' as const, quantity: 1 }
      : sourceQuantity('berries', 1);
  if (candidate.harsh && food.status !== 'ready') result.navigation.splice(foodNavigationStart);
  finding(
    'starting-food',
    candidate.harsh ? 'ready' : food.status,
    food.status === 'ready'
      ? 'Finite known food is carried or available through an admitted reachable gathering opportunity; readiness does not establish balance or long-term survival.'
      : candidate.harsh
        ? 'The creator deliberately selected food scarcity. No emergency supplies were added.'
        : food.status === 'incomplete'
          ? 'The required route to starting food is incomplete.'
          : 'No accessible starting food is present; choose deliberate scarcity or provide a finite food opportunity.',
  );
  return result;
}
