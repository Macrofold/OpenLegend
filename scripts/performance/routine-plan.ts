import { entityGet } from '../../packages/domain/src/index.js';
import {
  commitActorResponse,
  bindNativeChoice,
  captureActionTargets,
  worldPosition,
  type ActorResponse,
  type ActivityNode,
  type AttemptBinding,
  type Command,
} from '@open-legend/domain';
import { planningCandidates } from '../../apps/server/src/context.js';
import { domainCommand } from '../../apps/server/src/cognition.js';
import { decisionObservation } from '../../apps/server/src/decision-observation.js';
import { statusEffectActions } from '../../apps/server/src/status-effect-actions.js';
import type { JobRecord } from '../../apps/server/src/store.js';
import type { WorldService } from '../../apps/server/src/world-service.js';
import { OverloadError } from '../../apps/server/src/work-lane.js';

/** A forced diagnostic choice through the ordinary finite-plan admission owner.
 * It exercises no model, motivation, learning or new gameplay controller. */
export function prepareRoutinePlan(
  service: WorldService,
  actorId: string,
  id: string,
  kind: 'work' | 'rest' = 'work',
  targets?: { fiber: string; berries: string },
  cycles: 1 | 8 = 1,
) {
  const observed = decisionObservation(service.world, actorId);
  if (!observed || observed.actor.actor?.controller !== 'npc') return;
  const origin = worldPosition(observed.actor);
  const resource = (definitionId: string, targetId?: string) =>
    observed.visibleEntities
      .filter(
        (entity) =>
          (!targetId || entity.id === targetId) &&
          entity.resource?.definitionId === definitionId &&
          entity.resource.quantity > 0,
      )
      .sort((a, b) => {
        const p = worldPosition(a),
          q = worldPosition(b);
        return (
          Math.hypot(p.x - origin.x, p.z - origin.z) - Math.hypot(q.x - origin.x, q.z - origin.z)
        );
      })[0];
  const fiber = kind === 'work' ? resource('raw_fiber', targets?.fiber) : undefined,
    berries = kind === 'work' ? resource('berries', targets?.berries) : undefined;
  if (kind === 'work' && (!fiber || !berries)) return;
  const rest =
    kind === 'rest'
      ? statusEffectActions(service.world, observed.actor, observed.actor).find(
          (offer) =>
            offer.command.type === 'status-effect' &&
            offer.command.definitionId === 'wilderness:restorative-rest' &&
            offer.command.effectOperation === 'activate',
        )
      : undefined;
  if (kind === 'rest' && !rest) return;
  const offers =
    kind === 'rest'
      ? [{ ...rest!, description: rest!.label }]
      : planningCandidates(service, actorId, observed);
  const handles =
    kind === 'rest'
      ? [rest!.id]
      : [
          `plan-gather:${fiber!.id}`,
          'plan-prepare:fiber',
          'plan-prepare:cord',
          `plan-gather:${berries!.id}`,
        ];
  const selected = handles.map((handle) => offers.find((offer) => offer.id === handle));
  if (selected.some((offer) => !offer?.command)) return;
  let response: ActorResponse = {
    operations: [
      {
        localId: 'routine',
        requiresAccepted: [],
        talk: null,
        act: null,
        think: null,
        goal: null,
        plan: {
          mode: 'enqueue',
          expectedRevision: observed.actor.actor!.agency.plan?.revision ?? 0,
          goalId: null,
          steps: [
            ...handles.map((actionId) => ({ actionId, itemFromStep: null, useItemAs: null })),
            ...(kind === 'work'
              ? [{ actionId: null, itemFromStep: 3, useItemAs: 'eat' as const }]
              : []),
          ],
        },
      },
    ],
  };
  const actions = Object.fromEntries(
    selected.map((offer, i) => [
      handles[i]!,
      bindNativeChoice(
        service.world,
        actorId,
        domainCommand(offer!.command!, actorId, `${id}:offer:${i}`),
        'replace',
      ),
    ]),
  );
  const attemptBindings: AttemptBinding[] = [];
  if (cycles === 8 && kind === 'work') {
    // Explicit diagnostic commitment, through ordinary requested-activity admission.
    // It changes when this driver reconsiders rest, never a child's current prerequisites.
    const root: ActivityNode = {
      kind: 'sequence',
      name: 'Eight chosen work and meal cycles',
      children: Array.from({ length: cycles }, (_, i): ActivityNode[] => [
        {
          kind: 'invoke',
          key: `fiber_${i}`,
          name: 'Gather nearby fibers',
          command: 'gather',
          args: { targetId: { role: 'fiber' } },
          outputs: [],
        },
        {
          kind: 'invoke',
          key: `clean_${i}`,
          name: 'Prepare fibers',
          command: 'prepare',
          args: { preparation: { literal: 'fiber' } },
          outputs: [],
        },
        {
          kind: 'invoke',
          key: `cord_${i}`,
          name: 'Prepare cord',
          command: 'prepare',
          args: { preparation: { literal: 'cord' } },
          outputs: [],
        },
        {
          kind: 'invoke',
          key: `berries_${i}`,
          name: 'Gather nearby berries',
          command: 'gather',
          args: { targetId: { role: 'berries' } },
          outputs: [{ port: 'berries', definitionId: 'berries', quantity: 1 }],
        },
        {
          kind: 'invoke',
          key: `eat_${i}`,
          name: 'Eat this cycle’s gathered berries',
          command: 'eat',
          args: { itemId: { output: `berries_${i}`, port: 'berries', quantity: 1 } },
          outputs: [],
        },
      ]).flat(),
    };
    const description =
      'Complete eight cycles of gathering fibers, preparing fibers and cord, gathering berries, and eating those gathered berries, then stop.';
    const command: Extract<Command, { type: 'compose' }> = {
      id: `${id}:routine`,
      actorId,
      type: 'compose',
      name: root.name!,
      root,
      bindings: { fiber: fiber!.id, berries: berries!.id },
      mode: 'enqueue',
    };
    response = {
      operations: [
        {
          localId: 'routine',
          requiresAccepted: [],
          talk: null,
          act: {
            kind: 'proposal',
            actionId: null,
            verb: null,
            targetEntityId: null,
            description,
            mode: 'enqueue',
          },
          think: null,
          goal: null,
          plan: null,
        },
      ],
    };
    attemptBindings.push({
      operationId: 'routine',
      description,
      manifestRevision: service.world.moduleManifest.revision,
      targetEpisodes: captureActionTargets(service.world, actorId, [command]),
      commands: [command],
      fulfillment: {
        requested: description,
        executableDescription: description,
        verdict: 'exact',
        supported: [
          'Eight finite work and meal cycles',
          'Current nearby fiber and berry sources',
          'Each meal consumes only that cycle’s actual gathered berries',
          'Every child uses ordinary current native admission',
          'Stop after forty actions or an actual failure',
        ],
        omitted: [],
        reason:
          'A private diagnostic explicitly selects the supported native composition; this is not generated character motivation or a learned method.',
      },
    });
  }
  return {
    id,
    actorId,
    kind,
    response,
    attemptBindings,
    cycles: kind === 'work' ? cycles : 1,
    timeline: service.timelineId,
    expectedPlan: observed.actor.actor!.planGeneration,
    actions,
    entityIds: [actorId, ...observed.visibleEntities.map((entity) => entity.id)],
  };
}

export async function selectRoutinePlan(
  service: WorldService,
  selection: NonNullable<ReturnType<typeof prepareRoutinePlan>>,
  onStage?: (
    stage: 'initial durable job' | 'native plan admission' | 'helper terminal diagnostic',
  ) => void,
) {
  const job: JobRecord = {
    id: selection.id,
    kind: 'action',
    status: 'generating',
    message:
      selection.kind === 'rest'
        ? 'Selecting an ordinary diagnostic rest plan.'
        : 'Selecting a finite diagnostic resident plan.',
    fingerprint: JSON.stringify(selection.response),
    createdAt: Date.now(),
    request: {
      text:
        selection.kind === 'rest'
          ? 'Diagnostic ordinary rest selection.'
          : 'Diagnostic five-step ordinary work selection.',
      npcId: selection.actorId,
    },
  };
  // Keep the existing durable response gate and receipt; no paid dispatch occurs.
  onStage?.('initial durable job');
  await service.store.putJob(job);
  onStage?.('native plan admission');
  let entered = false;
  let retryUnstarted = false;
  let result: Awaited<ReturnType<WorldService['transition']>>;
  try {
    result = await service.transition(
      (world) => {
        entered = true;
        return commitActorResponse(
          world,
          selection.id,
          selection.actorId,
          selection.response,
          selection.actions,
          selection.entityIds,
          selection.expectedPlan,
          selection.attemptBindings,
        );
      },
      undefined,
      selection.id,
      async (world) =>
        service.timelineId === selection.timeline &&
        entityGet(world.entities, selection.actorId)?.actor?.controller === 'npc',
    );
  } catch (error) {
    // Only queue refusal before the native callback proves that no plan started.
    // Later failures remain uncertain and must not be retried as fresh choices.
    if (!(error instanceof OverloadError) || entered) throw error;
    retryUnstarted = true;
    result = { ok: false, code: error.code, message: error.message };
  }
  const outcome = retryUnstarted
    ? result
    : (service.world.responseReceipts?.[selection.id]?.components['routine'] ?? result);
  onStage?.('helper terminal diagnostic');
  await service.store.putJob({
    ...job,
    status: outcome.ok ? 'completed' : 'failed',
    result: outcome,
    completedAt: Date.now(),
  });
  return retryUnstarted ? { ...outcome, retryUnstarted: true as const } : outcome;
}
