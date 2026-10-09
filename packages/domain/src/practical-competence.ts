import { emit, outcome } from './events.js';
import { occurrenceFor, renderActivity } from './action-experience.js';
import { BODY_PROFILES } from '@open-legend/spatial';
import { recordSemanticChange } from './dependencies.js';
import { isSafeRecordId } from './records.js';
import { isDefinitionPin, sameDefinitionPin } from './state-owners.js';
import { supportsManualWork } from './living.js';
import { nearbyLivingEntities, canReachEntity, hasLineOfSight, distance } from './spatial.js';
import { worldPosition, bodyProfile } from './spatial-state.js';
import { chargeWork, requireWork, WORK_LIMITS } from './work-budget.js';
import { definitionPin, type AttributeDefinition, type DefinitionPin } from './world-modules.js';
import type {
  ActorComponent,
  Entity,
  ItemDefinition,
  Outcome,
  WorldEvent,
  WorldState,
  Position,
} from './types.js';

/** Trusted finite-release consumer; authored names/numbers live in the installed definition.
 * docs/projects/authored-stats-tech-design.md#owners-and-data-flow */
export interface PracticeProfile {
  family: DefinitionPin;
  independentReleases: number;
  coachedReleases: number;
  missReduction: number;
  windupSeconds: number;
  feedbackSeconds: number;
  communicationRange: number;
  laneMargin: number;
  practiceLabel: string;
  coachingLabel: string;
  scope: string;
  guidance: string;
  improvedText: string;
}
export interface ReleaseSupport {
  occurrenceId: string;
  eventId: string;
}
export interface CoachingSupport {
  eventId: string;
  observed: ReleaseSupport;
  coachId: string;
  coachEvidenceId: string;
  learnerEvidenceId: string;
}
export interface PracticeProgress {
  starting: 0 | 1;
  revision: number;
  releases: ReleaseSupport[];
  coaching?: CoachingSupport;
}
export interface PracticeView {
  id: string;
  name: string;
  value: 0 | 1;
  starting: boolean;
  releases: number;
  independentRequired: number;
  coachedRequired: number;
  coached: boolean;
  scope: string;
  effect: string;
  evidence: (ReleaseSupport & { description: string })[];
}
export type PracticeStatus = Omit<PracticeView, 'evidence'>;
export function competenceValue(
  actor: ActorComponent,
  definition: AttributeDefinition,
): 0 | 1 | undefined {
  const progress = actor.practice?.[definition.id],
    profile = definition.practice;
  if (!progress || !profile) return;
  return progress.starting === 1 || hasEarnedPractice(progress, profile) ? 1 : 0;
}
export function hasEarnedPractice(progress: PracticeProgress, profile: PracticeProfile): boolean {
  return (
    progress.releases.length >= profile.independentReleases ||
    (!!progress.coaching && progress.releases.length >= profile.coachedReleases)
  );
}
export function initializePractice(
  actor: ActorComponent,
  definition: AttributeDefinition,
  starting: unknown,
): void {
  if (starting !== 0 && starting !== 1)
    throw new Error('Starting competence must be explicitly beginner or practiced.');
  if (actor.practice?.[definition.id]) throw new Error('Competence is already initialized.');
  (actor.practice ??= {})[definition.id] = { starting, revision: 0, releases: [] };
}
export function setStartingPractice(
  world: WorldState,
  entity: Entity,
  definition: AttributeDefinition,
  value: unknown,
): boolean {
  if (value !== 0 && value !== 1) throw new Error('Unsupported starting competence.');
  const progress = entity.actor?.practice?.[definition.id];
  if (!progress) throw new Error('Competence is not applicable.');
  if (progress.starting === value) return false;
  progress.starting = value;
  changed(world, entity, progress);
  return true;
}
function changed(world: WorldState, actor: Entity, progress: PracticeProgress): void {
  if (!Number.isSafeInteger(progress.revision + 1))
    throw new Error('Competence revision exhausted.');
  progress.revision++;
  recordSemanticChange(world, { kind: 'state', entityId: actor.id, field: 'attribute' });
}
export function practiceDefinition(world: WorldState, id: string): AttributeDefinition | undefined {
  return world.moduleManifest.definitions.find(
    (d) => d.id === id && d.implementation === 'finite-practice-v1',
  );
}
export function toolPracticeDefinition(
  world: WorldState,
  tool: ItemDefinition,
): AttributeDefinition | undefined {
  const recipe = tool.recipeId && world.recipes[tool.recipeId];
  return recipe
    ? world.moduleManifest.definitions.find(
        (d) => d.practice && sameDefinitionPin(d.practice.family, recipe.familyPin),
      )
    : undefined;
}
export function handlingAccuracy(
  world: WorldState,
  actor: Entity,
  tool: ItemDefinition,
): { accuracy: number; competence?: number; definition?: AttributeDefinition } {
  const definition = toolPracticeDefinition(world, tool);
  const competence = definition && actor.actor && competenceValue(actor.actor, definition);
  const accuracy = tool.launcher!.accuracy;
  return {
    accuracy:
      competence === 1 ? accuracy + definition!.practice!.missReduction * (1 - accuracy) : accuracy,
    ...(competence === undefined ? {} : { competence }),
    ...(definition ? { definition } : {}),
  };
}
export function practiceStatus(world: WorldState, actor: Entity): PracticeStatus[] {
  if (!actor.actor) return [];
  return world.moduleManifest.definitions.flatMap((definition) => {
    const value = competenceValue(actor.actor!, definition),
      p = actor.actor!.practice?.[definition.id],
      profile = definition.practice;
    return value === undefined || !p || !profile
      ? []
      : [
          {
            id: definition.id,
            name: definition.name,
            value,
            starting: p.starting === 1,
            releases: p.releases.length,
            independentRequired: profile.independentReleases,
            coachedRequired: profile.coachedReleases,
            coached: !!p.coaching,
            scope: profile.scope,
            effect: `${profile.missReduction * 100}% reduction of the tool-related miss chance; later shots only.`,
          },
        ];
  });
}
export function ownPractice(world: WorldState, actor: Entity): PracticeView[] {
  return practiceStatus(world, actor).map((status) => ({
    ...status,
    evidence: actor.actor!.practice![status.id]!.releases.map((support) => {
      const recorded = occurrenceFor(world, actor.id, support.occurrenceId);
      return {
        ...support,
        description: recorded
          ? renderActivity(recorded.view, 'What happened')
          : 'Retained released-shot evidence; inspect the recorded action for its historical details.',
      };
    }),
  }));
}
export function creditRelease(
  world: WorldState,
  actor: Entity,
  tool: ItemDefinition,
  event: WorldEvent,
  events: WorldEvent[],
): ReleaseSupport | undefined {
  const definition = toolPracticeDefinition(world, tool),
    profile = definition?.practice;
  const progress = definition && actor.actor?.practice?.[definition.id];
  const actionId = event.data?.['actionId'];
  const occurrence = typeof actionId === 'string' && occurrenceFor(world, actor.id, actionId);
  if (!definition || !profile || !progress || !occurrence || occurrence.revoked) return;
  const support = { occurrenceId: occurrence.id, eventId: event.id };
  if (
    progress.releases.length >= profile.independentReleases ||
    progress.releases.some((s) => s.occurrenceId === occurrence.id)
  )
    return support;
  const before = competenceValue(actor.actor!, definition);
  progress.releases.push(support);
  changed(world, actor, progress);
  if (before === 0 && competenceValue(actor.actor!, definition) === 1)
    emit(
      world,
      events,
      'competence-improved',
      profile.improvedText,
      actor,
      undefined,
      { attributeId: definition.id, semanticTrigger: true, value: 1 },
      'private',
    );
  return support;
}
export function creditCoaching(
  world: WorldState,
  learner: Entity,
  definition: AttributeDefinition,
  support: CoachingSupport,
  events: WorldEvent[],
): void {
  const progress = learner.actor?.practice?.[definition.id];
  if (!progress || progress.coaching) return;
  const before = competenceValue(learner.actor!, definition);
  progress.coaching = support;
  changed(world, learner, progress);
  if (before === 0 && competenceValue(learner.actor!, definition) === 1)
    emit(
      world,
      events,
      'competence-improved',
      definition.practice!.improvedText,
      learner,
      undefined,
      { attributeId: definition.id, semanticTrigger: true, value: 1 },
      'private',
    );
}
/** Explicit evidence invalidation only. Compaction never calls this owner. */
export function revokePracticeSupport(
  world: WorldState,
  actorId: string,
  affected: ReadonlySet<string>,
): void {
  for (const actor of Object.values(world.entities)) {
    chargeWork({ tests: 1 });
    for (const progress of Object.values(actor.actor?.practice ?? {})) {
      let edited = false;
      if (actor.id === actorId) {
        const retained = progress.releases.filter(
          (s) => !affected.has(s.eventId) && !affected.has(s.occurrenceId),
        );
        edited = retained.length !== progress.releases.length;
        if (edited) progress.releases = retained;
      }
      const help = progress.coaching;
      if (
        help &&
        ((actor.id === actorId &&
          [
            help.eventId,
            help.observed.eventId,
            help.observed.occurrenceId,
            help.learnerEvidenceId,
          ].some((id) => affected.has(id))) ||
          (help.coachId === actorId &&
            [
              help.eventId,
              help.observed.eventId,
              help.observed.occurrenceId,
              help.coachEvidenceId,
            ].some((id) => affected.has(id))))
      ) {
        delete progress.coaching;
        edited = true;
      }
      if (edited) changed(world, actor, progress);
    }
  }
}
// Candidate grids store feet. A body below a short elevated shot can still cross
// the lane, so the conservative bound must include height as well as width.
const bodyExtent = Math.max(...Object.values(BODY_PROFILES).flatMap((p) => [p.radius, p.height]));
/** Body clearance is real, but this consumer has no simulated projectile trajectory. */
export function practiceLaneProblem(
  world: WorldState,
  actor: Entity,
  target: Entity,
  range: number,
  margin: number,
): Outcome | null {
  if (!canReachEntity(world, actor, target, range))
    return outcome(
      false,
      'out-of-reach',
      'The practice target is outside a clear firing range. No shot was released.',
    );
  const from = worldPosition(actor),
    to = worldPosition(target),
    length = distance(from, to);
  const eye = { ...from, y: from.y + bodyProfile(actor).height / 2 },
    aim = { ...to, y: to.y + bodyProfile(target).height / 2 };
  if (!hasLineOfSight(world, eye, aim))
    return outcome(false, 'blocked-lane', 'The firing lane is blocked. No shot was released.');
  for (const entity of nearbyLivingEntities(world, from, length + margin + bodyExtent)) {
    chargeWork({ tests: 1 });
    if (entity.id === actor.id || !entity.actor?.alive) continue;
    const body = bodyProfile(entity);
    if (crossesBody(eye, aim, worldPosition(entity), body.radius + margin, body.height))
      return outcome(
        false,
        'blocked-lane',
        'The firing lane is not safely clear. No shot was released.',
      );
  }
  return null;
}
/** Clip the whole firing segment to the expanded body cylinder. Testing just the
 * body's centre misses bodies straddling an endpoint and fails on vertical segments. */
function crossesBody(
  from: Position,
  to: Position,
  body: Position,
  radius: number,
  height: number,
): boolean {
  const dx = to.x - from.x,
    dz = to.z - from.z,
    dy = to.y - from.y;
  const x = from.x - body.x,
    z = from.z - body.z;
  const a = dx * dx + dz * dz,
    b = x * dx + z * dz,
    c = x * x + z * z - radius * radius;
  let enter = 0,
    exit = 1;
  if (a === 0) {
    if (c > 0) return false;
  } else {
    const discriminant = b * b - a * c;
    if (discriminant < 0) return false;
    const span = Math.sqrt(discriminant);
    enter = Math.max(enter, (-b - span) / a);
    exit = Math.min(exit, (-b + span) / a);
  }
  if (dy === 0) {
    if (from.y < body.y || from.y > body.y + height) return false;
  } else {
    const low = (body.y - from.y) / dy,
      high = (body.y + height - from.y) / dy;
    enter = Math.max(enter, Math.min(low, high));
    exit = Math.min(exit, Math.max(low, high));
  }
  return enter <= exit;
}
export function validatePracticeProfile(definition: AttributeDefinition): void {
  const p = definition.practice;
  if (
    !p ||
    definition.schema.kind !== 'number' ||
    definition.schema.min !== 0 ||
    definition.schema.max !== 1 ||
    ![0, 1].includes(definition.schema.initial) ||
    !isSafeRecordId(p.family?.id) ||
    !Number.isSafeInteger(p.family.version) ||
    p.family.version < 1 ||
    typeof p.family.digest !== 'string' ||
    ![p.independentReleases, p.coachedReleases].every((n) => Number.isSafeInteger(n) && n > 0) ||
    p.coachedReleases > p.independentReleases ||
    !Number.isFinite(p.missReduction) ||
    p.missReduction < 0 ||
    p.missReduction >= 1 ||
    ![p.windupSeconds, p.feedbackSeconds, p.communicationRange, p.laneMargin].every(
      (n) => Number.isFinite(n) && n > 0,
    ) ||
    ![p.practiceLabel, p.coachingLabel, p.scope, p.guidance, p.improvedText].every(
      (s) => typeof s === 'string' && s.trim().length > 0 && s.length <= 1000,
    )
  )
    throw new Error('Invalid finite practice consumer.');
  requireWork(
    { tests: p.independentReleases, retainedBytes: p.independentReleases * 256 },
    WORK_LIMITS.module,
  );
}
export function validReleaseSupport(
  world: WorldState,
  actorId: string,
  family: DefinitionPin,
  support: ReleaseSupport,
): boolean {
  const recorded = occurrenceFor(world, actorId, support.occurrenceId);
  return (
    isSafeRecordId(support.occurrenceId) &&
    isSafeRecordId(support.eventId) &&
    (!recorded ||
      (!recorded.revoked &&
        !!recorded.release &&
        recorded.release.eventId === support.eventId &&
        !!recorded.release.family &&
        sameDefinitionPin(recorded.release.family, family)))
  );
}
export function validatePractice(world: WorldState): void {
  for (const entity of Object.values(world.entities)) {
    for (const [id, progress] of Object.entries(entity.actor?.practice ?? {})) {
      const definition = practiceDefinition(world, id);
      if (
        !definition ||
        !supportsManualWork(entity) ||
        ![0, 1].includes(progress.starting) ||
        !Number.isSafeInteger(progress.revision) ||
        progress.revision < 0 ||
        !Array.isArray(progress.releases) ||
        progress.releases.length > definition.practice!.independentReleases ||
        new Set(progress.releases.map((s) => s.occurrenceId)).size !== progress.releases.length ||
        progress.releases.some(
          (s) => !validReleaseSupport(world, entity.id, definition.practice!.family, s),
        ) ||
        (progress.coaching &&
          ![
            progress.coaching.eventId,
            progress.coaching.coachId,
            progress.coaching.coachEvidenceId,
            progress.coaching.learnerEvidenceId,
            progress.coaching.observed.eventId,
            progress.coaching.observed.occurrenceId,
          ].every(isSafeRecordId)) ||
        entity.actor?.attributes?.[id]
      )
        throw new Error('Invalid current competence support.');
    }
    if (
      entity.practiceTarget &&
      (!practiceDefinition(world, entity.practiceTarget.attributeId) ||
        entity.actor ||
        entity.animal ||
        entity.remains ||
        entity.resource)
    )
      throw new Error('Invalid inert practice target.');
    const action = entity.actor?.action;
    if (action?.competencePin) {
      const definition = practiceDefinition(world, action.competencePin.id);
      if (
        !['hunt', 'practice-shot', 'coaching'].includes(action.type) ||
        !isDefinitionPin(action.competencePin) ||
        !definition ||
        !sameDefinitionPin(action.competencePin, definitionPin(definition))
      )
        throw new Error('Invalid saved handling rule.');
    }
    if (
      action?.type === 'practice-shot' &&
      (!action.competencePin ||
        world.entities[action.targetId ?? '']?.practiceTarget?.attributeId !==
          action.competencePin.id)
    )
      throw new Error('Invalid saved practice target or rule.');
  }
}
