import { itemFor, inventoryFor, accessiblePossession } from '@open-legend/domain';
import { currentGoal, isFuel, NATIVE_PREPARATIONS } from '@open-legend/domain';
import {
  activeStimuli,
  STIMULUS_POLICY,
  type StimulusPolicy,
  capabilityBlocked,
  entityVisionQuery,
  nativeNeedBelow,
  projectAttributes,
  spatialQuery,
  visionRadius,
  worldPosition,
} from '@open-legend/domain';
import type { WorldState } from '@open-legend/domain';
import { digest } from './store.js';
import type { AttentionCandidate } from './recall.js';
import type { IntakeInputs, IntakeReason } from './actor-work.js';
import { nativeProtectionReason } from './native-protection.js';

/** The reason each autonomous-thought wake input represents, in input order. */
const THOUGHT_INPUT_REASONS: readonly IntakeReason[] = [
  'state', // controller
  'state', // incapacitation
  'state', // goal
  'state', // plan revision
  'state', // native protection (for example sleep)
  'condition', // body condition episodes
  'state', // possessions
  'condition', // exhausted
  'condition', // nearly collapsing
  'state', // action capability
  'condition', // reservoir concerns
  'exposure', // visible entities
  'exposure', // visible kinds and resource definitions
  'state', // known recipes
  'evidence', // memories
  'evidence', // awareness
  'evidence', // summaries
  'state', // accepted mind
  'state', // cognition policy
];
interface ThoughtExposure {
  people: unknown;
  objects: unknown;
  position: unknown;
  definitions: unknown;
  ids: string[];
  kinds: string;
}
/** Change-fed wake inputs for autonomous thought (EPR05). Every input is a cheap identity or
 * value, and each character's visible set is recomputed only when its own native exposure
 * lists, position or item definitions changed, not for every character on every poll. The
 * cache holds IDs and strings, never entities, and is discarded with the restore generation.
 * docs/events-perception-and-reactions.md#extend-actorwork-instead-of-replacing-the-scheduler */
export class ThoughtIntakeInputs {
  private scope?: string;
  private readonly exposure = new Map<string, ThoughtExposure>();
  /** Highest awareness sequence already weighed for urgency, per character. Separate from the
   * visibility cache so an incomplete query cannot reset it. */
  private readonly weighed = new Map<string, number>();
  /** Visible-set recomputations, for EPR00 accounting. */
  visibilityQueries = 0;
  /** World policy for ongoing perceived conditions; fixtures may install a review cadence. */
  stimulusPolicy: StimulusPolicy = STIMULUS_POLICY;

  /** Due reviews of ongoing salient stimuli (EPR06) on the simulation clock. `key` changes
   * exactly when a review falls due, making a fresh opportunity; `nextAt` is the next
   * deadline for the intake. Without a review cadence there is no key and no deadline. */
  stimulusReview(world: WorldState, id: string): { key?: string; due: string[]; nextAt: number } {
    if (!this.stimulusPolicy.reviewSeconds) return { due: [], nextAt: Infinity };
    // Deadlines cover every salient source; the cue limit bounds context, not reviews, and a
    // cut or reordering must not change the key.
    const { stimuli } = activeStimuli(world, id, { ...this.stimulusPolicy, limit: Infinity });
    const due = stimuli.filter((stimulus) => stimulus.reviews > 0);
    return {
      ...(due.length
        ? {
            key: due
              .map((stimulus) => `${stimulus.sourceId}:${stimulus.reviews}`)
              .sort()
              .join('|'),
          }
        : {}),
      due: due.map((stimulus) => stimulus.sourceId),
      nextAt: Math.min(Infinity, ...stimuli.map((stimulus) => stimulus.reviewAt ?? Infinity)),
    };
  }

  reset(scope: string): void {
    if (this.scope === scope) return;
    this.scope = scope;
    this.exposure.clear();
    this.weighed.clear();
  }
  /** The last complete visible set; undefined while this character's query is incomplete. */
  visible(id: string): string[] | undefined {
    return this.exposure.get(id)?.ids;
  }
  /** `verify` compares an inspection's captured inputs and must not consume the urgency of
   * awareness that arrived meanwhile; only refresh reads advance that baseline. */
  read(world: WorldState, id: string, verify = false): IntakeInputs {
    const entity = world.entities[id]!,
      actor = entity.actor!;
    const position = worldPosition(entity);
    let seen = this.exposure.get(id);
    if (
      !seen ||
      seen.people !== world.visiblePeople?.[id] ||
      seen.objects !== world.visibleObjects?.[id] ||
      seen.position !== position ||
      seen.definitions !== world.itemDefinitions
    ) {
      this.visibilityQueries++;
      const query = spatialQuery(world, position, visionRadius(world, entity));
      if (query.status !== 'complete') {
        this.exposure.delete(id);
        return { values: [query.status], reasons: ['exposure'] };
      }
      const sees = entityVisionQuery(world, entity);
      const ids = query.values.filter((other) => other.id !== id && sees(other)).map((o) => o.id);
      seen = {
        people: world.visiblePeople?.[id],
        objects: world.visibleObjects?.[id],
        position,
        definitions: world.itemDefinitions,
        ids,
        // Interest predicates use kind/resource definition, not pose. Detect an edited
        // target even when visible membership itself is unchanged.
        kinds: ids
          .map(
            (other) =>
              `${world.entities[other]!.kind}:${world.entities[other]!.resource?.definitionId ?? ''}`,
          )
          .join('\0'),
      };
      this.exposure.set(id, seen);
    }
    // Awareness newer than the last weighed sequence orders urgent work first; it never
    // admits anything. Sequences, not array positions, survive consolidation removing entries.
    const entries = world.experience?.awareness[id] ?? [];
    const last = entries.at(-1)?.sequence ?? 0;
    const since = this.weighed.get(id);
    let urgency = 0;
    if (since === undefined) {
      // A new character starts from its current history, not its whole retained past.
      if (!verify) this.weighed.set(id, last);
    } else if (last > since) {
      let newest = since;
      for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i]!;
        if (entry.sequence <= since) break;
        urgency = Math.max(urgency, entry.urgency ?? 0);
        newest = Math.max(newest, entry.sequence);
      }
      if (!verify) this.weighed.set(id, newest);
    }
    return {
      values: [
        actor.controller,
        actor.incapacitated,
        currentGoal(actor),
        actor.agency.plan?.revision,
        nativeProtectionReason(world, id),
        actor.conditions,
        entity.inventoryRevision,
        nativeNeedBelow(actor, 'energy', 15),
        nativeNeedBelow(actor, 'energy', 10),
        capabilityBlocked(world, entity, 'actions'),
        projectAttributes(world, entity, 'owner')
          .filter((v) => v.concern && Object.hasOwn(actor.attributes ?? {}, v.id))
          .map((v) => v.id)
          .join('|'),
        seen.ids.join('\0'),
        seen.kinds,
        world.recipes,
        world.memories[id],
        world.experience?.awareness[id],
        world.experience?.summaries[id],
        world.innerWorlds?.[id],
        world.cognitionPolicy,
      ],
      reasons: THOUGHT_INPUT_REASONS,
      urgency,
    };
  }
}
export interface InterestSubscription {
  version: 1;
  goal: string;
  mindRevision: number;
  knowledgeRevision?: number;
  expiresAt: number;
  properties: string[];
  entityKinds: string[];
  definitions: string[];
}
/** Native prerequisites are actor-owned knowledge; no goal-prose inference or hidden-world scan. */
function planDefinitions(world: WorldState, actorId: string): string[] {
  const actor = world.entities[actorId]?.actor;
  const plan = actor?.agency.plan;
  if (
    !plan ||
    !['active', 'blocked'].includes(plan.status) ||
    (plan.goalId &&
      !actor!.agency.goals.some((goal) => goal.id === plan.goalId && goal.status === 'active'))
  )
    return [];
  return [
    ...new Set(
      plan.steps
        .filter((step) => !['completed', 'cancelled'].includes(step.status))
        .flatMap(({ command }) => {
          if (command.type === 'prepare') return [NATIVE_PREPARATIONS[command.preparation].input];
          if (command.type === 'craft')
            return world.knowledge[actorId]?.some((entry) => entry.recipeId === command.recipeId)
              ? (world.recipes[command.recipeId]?.inputs.map((input) => input.definitionId) ?? [])
              : [];
          if (command.type === 'cook') return ['raw_meat'];
          if (command.type === 'tend-fire' && command.operation === 'fuel')
            return Object.values(world.itemDefinitions)
              .filter(isFuel)
              .map((definition) => definition.id);
          return [];
        }),
    ),
  ];
}
/** Preserve all actor-permitted interests; truncating here would hide later valid matches.
 * docs/architecture.md#content-counts-and-request-limits */
export function compileInterests(
  world: WorldState,
  actorId: string,
  selected: AttentionCandidate[],
): InterestSubscription {
  const definitions = new Set<string>(planDefinitions(world, actorId));
  const kinds = new Set<string>();
  for (const c of selected) {
    if (c.kind === 'possession') {
      const item = itemFor(world, c.id.slice(5));
      if (item) definitions.add(item.definitionId);
    }
    if (c.kind === 'entity') {
      const entity = world.entities[c.id.slice(7)];
      if (entity?.resource) definitions.add(entity.resource.definitionId);
      if (entity) kinds.add(entity.kind);
    }
  }
  return {
    version: 1,
    goal: digest(currentGoal(world.entities[actorId]!.actor!)),
    knowledgeRevision: world.knowledgeRevisions?.[actorId] ?? 0,
    mindRevision: world.innerWorlds?.[actorId]?.revision ?? 0,
    expiresAt: world.simTime + 7200,
    properties: [
      ...new Set([...definitions].flatMap((id) => world.itemDefinitions[id]?.properties ?? [])),
    ],
    entityKinds: [...kinds],
    definitions: [...definitions],
  };
}
export function interestMatches(
  world: WorldState,
  actorId: string,
  subscription: InterestSubscription | undefined,
  visibleIds: string[],
): string[] {
  const valid =
    subscription &&
    subscription.version === 1 &&
    subscription.goal === digest(currentGoal(world.entities[actorId]!.actor!)) &&
    (subscription.knowledgeRevision ?? 0) === (world.knowledgeRevisions?.[actorId] ?? 0) &&
    subscription.mindRevision === (world.innerWorlds?.[actorId]?.revision ?? 0) &&
    world.simTime < subscription.expiresAt;
  const definitions = new Set([
    ...(valid ? subscription.definitions : []),
    ...planDefinitions(world, actorId),
  ]);
  const kinds = valid ? subscription.entityKinds : [];
  const properties = new Set([
    ...(valid ? subscription.properties : []),
    ...[...definitions].flatMap((id) => world.itemDefinitions[id]?.properties ?? []),
  ]);
  return visibleIds.filter((id) => {
    const entity = world.entities[id];
    const definition = entity?.resource && world.itemDefinitions[entity.resource.definitionId];
    return (
      !!entity &&
      (kinds.includes(entity.kind) ||
        (!!definition &&
          (definitions.has(definition.id) || definition.properties.some((p) => properties.has(p)))))
    );
  });
}

/** Inventory changes only wake decisions for semantically selected interests or explicit prerequisites.
 * Custody/access are checked again; a changed hidden or unrelated object supplies no cue. */
export function relevantPossessions(
  world: WorldState,
  actorId: string,
  subscription: InterestSubscription | undefined,
): string[] {
  const valid =
    subscription &&
    subscription.version === 1 &&
    subscription.goal === digest(currentGoal(world.entities[actorId]!.actor!)) &&
    subscription.knowledgeRevision === (world.knowledgeRevisions?.[actorId] ?? 0) &&
    subscription.mindRevision === (world.innerWorlds?.[actorId]?.revision ?? 0) &&
    world.simTime < subscription.expiresAt;
  const definitions = new Set([
    ...planDefinitions(world, actorId),
    ...(valid ? subscription.definitions : []),
  ]);
  const properties = new Set(valid ? subscription.properties : []);
  if (!definitions.size && !properties.size) return [];
  return inventoryFor(world, actorId)
    .filter((item) => {
      const definition = world.itemDefinitions[item.definitionId];
      return (
        accessiblePossession(world, actorId, item.id) &&
        definition &&
        (definitions.has(definition.id) || definition.properties.some((p) => properties.has(p)))
      );
    })
    .map((item) => `${item.id}:${item.revision}:${item.quantity}`)
    .sort();
}
