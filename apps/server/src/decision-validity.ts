import {
  entityGet,
  currentBodyGrant,
  prepareCurrentBodyReadScope,
  activeAppraisals,
  appraisalDefinition,
  attributeDefinition,
  bodyEligibilityRevision,
  projectAttributes,
  requiredOutcomeEvidence,
  scopedAppraisals,
  type AppraisalScope,
  type ActorComponent,
  type ActorAgency,
  type Entity,
  type ResultEvidence,
  type WorldState,
} from '@open-legend/domain';
import { digest } from './content-digest.js';

type Attribute = ReturnType<typeof projectAttributes>[number];
type Feeling = ReturnType<typeof activeAppraisals>[number];
export interface DecisionValidityFacts {
  readonly installed: {
    readonly modules: number;
    readonly cognition: number;
    readonly status: number;
  };
  readonly identity: {
    readonly name: Entity['name'];
    readonly species: ActorComponent['species'];
    readonly traits: ActorComponent['traits'];
  };
  readonly actorId: string;
  readonly life: ActorComponent['physicalLife'];
  readonly controller: ActorComponent['controller'];
  readonly alive: ActorComponent['alive'];
  readonly incapacitated: ActorComponent['incapacitated'];
  readonly capabilities: ActorComponent['capabilities'];
  readonly body: string;
  readonly attributes: readonly (Attribute | Omit<Attribute, 'value' | 'revision'>)[];
  readonly feelings: readonly (
    | Feeling
    | (Omit<Feeling, 'value'> & {
        readonly value: { readonly kind: 'band'; readonly band: number };
      })
  )[];
  readonly planGeneration: ActorComponent['planGeneration'];
  readonly agency: Omit<ActorAgency, 'semantic'>;
  readonly action: Pick<
    NonNullable<ActorComponent['action']>,
    'id' | 'type' | 'stage' | 'targetId'
  > | null;
  readonly mind: number | undefined;
  readonly forgotten: readonly string[] | undefined;
  readonly corrections: Readonly<Record<string, string>> | undefined;
  readonly outcomes: readonly ResultEvidence[];
}
/** The semantic read owner supplies every dependency. Explicit ordering retains
 * the existing fingerprint independently of a producer's object construction. */
export function decisionValidityFromRead(read: DecisionValidityFacts): string {
  return digest({
    installed: read.installed,
    identity: read.identity,
    actorId: read.actorId,
    life: read.life,
    controller: read.controller,
    alive: read.alive,
    incapacitated: read.incapacitated,
    capabilities: read.capabilities,
    body: read.body,
    attributes: read.attributes,
    feelings: read.feelings,
    planGeneration: read.planGeneration,
    agency: read.agency,
    action: read.action,
    mind: read.mind,
    forgotten: read.forgotten,
    corrections: read.corrections,
    outcomes: read.outcomes,
  });
}
export interface PreparedResponseValidityFacts {
  readonly world: string;
  readonly policy: WorldState['cognitionPolicy'];
  readonly modules: number;
  readonly status: number;
  readonly identity: readonly [
    Entity['name'] | undefined,
    Entity['description'] | undefined,
    ActorComponent['species'],
    ActorComponent['traits'],
    ActorComponent['personality'],
    ActorComponent['backstory'],
  ];
  readonly life: ActorComponent['physicalLife'];
  readonly controller: ActorComponent['controller'] | undefined;
  readonly alive: ActorComponent['alive'] | undefined;
  readonly incapacitated: ActorComponent['incapacitated'] | undefined;
  readonly capabilities: ActorComponent['capabilities'];
  readonly goals: ActorAgency['goals'] | undefined;
  readonly mind: number | undefined;
  readonly forgotten: readonly string[] | undefined;
  readonly corrections: Readonly<Record<string, string>> | undefined;
  readonly feelings: readonly { readonly id: string; readonly revision: number }[];
}
export function preparedResponseValidityFromRead(read: PreparedResponseValidityFacts): string {
  return digest({
    world: read.world,
    policy: read.policy,
    modules: read.modules,
    status: read.status,
    identity: read.identity,
    life: read.life,
    controller: read.controller,
    alive: read.alive,
    incapacitated: read.incapacitated,
    capabilities: read.capabilities,
    goals: read.goals,
    mind: read.mind,
    forgotten: read.forgotten,
    corrections: read.corrections,
    feelings: read.feelings,
  });
}

/** Additive personally experienced blows remain evidence for the next opportunity,
 * not an automatic veto of a still-legal choice after the one funded refresh.
 * Physical capability, exact work and selected subjects are checked again at admission.
 * Other bodies losing contact revoke individual proposals, not independent interpretation. */
export function preparedResponseValidity(
  world: WorldState,
  actorId: string,
  scopes: readonly AppraisalScope[],
): string {
  const entity = entityGet(world.entities, actorId),
    actor = entity?.actor;
  return preparedResponseValidityFromRead({
    world: world.id,
    policy: world.cognitionPolicy,
    modules: world.moduleManifest.revision,
    status: world.statusEffectPolicy.revision,
    identity: [
      entity?.name,
      entity?.description,
      actor?.species,
      actor?.traits,
      actor?.personality,
      actor?.backstory,
    ],
    life: actor?.physicalLife,
    controller: actor?.controller,
    alive: actor?.alive,
    incapacitated: actor?.incapacitated,
    capabilities: actor?.capabilities,
    goals: actor?.agency.goals,
    mind: world.innerWorlds?.[actorId]?.revision ?? world.minds?.[actorId]?.revision,
    forgotten: world.experience?.forgotten[actorId],
    corrections: world.experience?.corrections?.[actorId],
    // The appraisal owner advances revisions at actual subscribed decay boundaries,
    // explicit interpretation and resolution. Reclassifying its continuously read
    // value here would invent an immediate boundary for a newly selected 0.5.
    feelings: scopedAppraisals(world, actorId, scopes).map(({ id, revision }) => ({
      id,
      revision,
    })),
  });
}

/** Task-local semantic facts: no history bodies or whole-world revision in this fingerprint. */
export function decisionValidity(world: WorldState, actorId: string): string {
  const entity = entityGet(world.entities, actorId);
  const actor = entity?.actor;
  if (!actor) return 'unavailable';
  const flowing = new Set(
    world.statusEffectPolicy.definitions.flatMap((definition) =>
      definition.whileActive.flatMap((operation) =>
        'changeRate' in operation && operation.changeRate.target === '$subject'
          ? [operation.changeRate.attribute]
          : [],
      ),
    ),
  );
  const attributes = projectAttributes(world, entity, 'owner').map((attribute) => {
    const definition = attributeDefinition(world, attribute.id);
    if (
      (definition?.reservoir || flowing.has(attribute.id)) &&
      (definition?.concern || definition?.condition)
    ) {
      const { value: _value, revision: _revision, ...stable } = attribute;
      return stable;
    }
    return attribute;
  });
  // Spending or acknowledging a bounded thinking opportunity changes bookkeeping,
  // not the question's meaning. It must not cancel its own admitted decision.
  const { semantic: _semantic, ...agency } = actor.agency;
  const feelings = activeAppraisals(world, actorId).map((feeling) => {
    const definition = appraisalDefinition(world, feeling.definitionPin);
    if (definition?.lifetime.kind === 'decays' && feeling.value.kind === 'scaled') {
      const value = feeling.value.value;
      return {
        ...feeling,
        value: {
          kind: 'band' as const,
          band: definition.lifetime.bands.findIndex((boundary) => value >= boundary),
        },
      };
    }
    return feeling;
  });
  return decisionValidityFromRead({
    // Installed rules and authored identity shape the meaning of the prepared question.
    // Their revisions change independently of the plan or selected memory sources.
    installed: {
      modules: world.moduleManifest.revision,
      cognition: world.cognitionPolicy.revision,
      status: world.statusEffectPolicy.revision,
    },
    identity: { name: entity.name, species: actor.species, traits: actor.traits },
    actorId,
    life: actor.physicalLife,
    controller: actor.controller,
    alive: actor.alive,
    incapacitated: actor.incapacitated,
    capabilities: actor.capabilities,
    body: bodyEligibilityRevision(world, entity),
    attributes,
    feelings,
    planGeneration: actor.planGeneration,
    agency,
    action: actor.action
      ? {
          id: actor.action.id,
          type: actor.action.type,
          stage: actor.action.stage,
          targetId: actor.action.targetId,
        }
      : null,
    mind: world.innerWorlds?.[actorId]?.revision ?? world.minds?.[actorId]?.revision,
    forgotten: world.experience?.forgotten[actorId],
    corrections: world.experience?.corrections?.[actorId],
    outcomes: requiredOutcomeEvidence(world, actorId),
  });
}

/** A remembered individual or grace period never renews a captured physical body. */
export function physicalEntityReferencesCurrent(
  world: WorldState,
  actorId: string,
  entityLeases: Readonly<Record<string, string>>,
  targetIds: readonly string[] = Object.keys(entityLeases),
): boolean {
  const reads = prepareCurrentBodyReadScope(world, actorId);
  return targetIds.every(
    (id) =>
      entityLeases[id] === undefined ||
      currentBodyGrant(world, actorId, id, reads)?.leaseId === entityLeases[id],
  );
}
