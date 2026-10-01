import {
  ACTION_GROUNDING_POLICY,
  actionGroundingQuestions,
  actionFulfillmentQuestions,
} from './jev-questions.js';
import { namedTimeSchema, navigationInvocationSchema } from './navigation-contracts.js';
import { z } from 'zod';
import { actionReferencePermitted, applySlotControl, typedAction } from './typed-actions.js';
import {
  captureActionTargets,
  worldPosition,
  worldSupport,
  observerDescription,
  bindActionInvocation,
  navigationCapabilities,
  FOLLOW_RULES,
  normalizeAttempt,
  sameAttempt,
  slotsKey,
  unmetSlots,
  validIntentSlots,
  refuseAction,
  resolutionSignature,
  possessionItems,
  portableItems,
  itemFor,
  type ResolutionCategory,
  observeActor,
  type ActionFulfillment,
  type IntentSlots,
  type ActorResponse,
  type AttemptBinding,
  type Command,
  type Entity,
  type WorldState,
} from '@open-legend/domain';
import type { GenerateRequest, JudgeRequest, JudgeValue } from '@open-legend/ai';

/** At most 32 own accessible possessions, scanned lazily; omission is disclosed. */
function possessionSample(world: WorldState, actorId: string) {
  const items = [];
  for (const item of possessionItems(world, actorId)) {
    if (items.length === 32) return { items, more: true };
    items.push({
      id: item.id,
      name: world.itemDefinitions[item.definitionId]?.name ?? item.definitionId,
      quantity: item.quantity,
    });
  }
  return { items, more: false };
}

/** Stacks in visible piles, selected pile first (visible order); the scan stops at the
 * limit and says when more exist so the interpreter can ask for a selection. */
function pileSample(world: WorldState, piles: readonly Entity[]) {
  const items = [];
  for (const pile of piles)
    for (const item of portableItems(world, pile.id)) {
      if (items.length === 32) return { items, more: true };
      items.push({
        id: item.id,
        pileId: pile.id,
        name: world.itemDefinitions[item.definitionId]?.name ?? item.definitionId,
        quantity: item.quantity,
      });
    }
  return { items, more: false };
}

interface GroundingPorts {
  judge(request: Omit<JudgeRequest, 'requestId' | 'signal'>): Promise<JudgeValue>;
  generate(request: Pick<GenerateRequest, 'instructions' | 'context' | 'schema'>): Promise<unknown>;
  record(kind: string, input: unknown, output: unknown): Promise<void>;
  signal?: AbortSignal;
  /** Explicit player resubmission may retry unavailable grounding; NPC retries remain bounded. */
  retryUnresolved?: boolean;
}
const normalize = normalizeAttempt;
const confident = (value: JudgeValue, key: string) => {
  const answer = value.answers[key];
  return answer && 'choice' in answer && (answer.probabilities[answer.choice] ?? 0) >= 0.8
    ? answer.choice
    : undefined;
};

const slotReferences = (slots?: IntentSlots | null) =>
  [slots?.itemId, slots?.instrumentId, slots?.recipientId].filter((id): id is string => !!id);

/** One bounded interpretation path shared by player action text and NPC proposals.
 * docs/architecture.md#jev-first-action-grounding
 */
export async function groundActionAttempts(
  world: WorldState,
  actorId: string,
  response: ActorResponse,
  bindings: AttemptBinding[],
  ports: GroundingPorts,
): Promise<AttemptBinding[]> {
  const observed = observeActor(world, actorId);
  if (!observed) return [];
  const actor = observed.actor.actor!;
  const entityIds = [actorId, ...observed.visibleEntities.map((e) => e.id)];
  const proposals = response.operations
    .filter(
      (op) =>
        op.act?.kind === 'proposal' &&
        op.act.description &&
        (!op.act.targetEntityId || entityIds.includes(op.act.targetEntityId)) &&
        slotReferences(op.act.slots).every((id) =>
          actionReferencePermitted(world, actorId, entityIds, id),
        ) &&
        // A stopping time this world does not name is refused at commit, before paid work.
        (!op.act.slots || validIntentSlots(world, op.act.slots)),
    )
    .slice(0, 4);
  const additions: AttemptBinding[] = [];
  const seen = new Map<string, string>();
  let interpretedNewIntents = 0;
  for (const op of proposals) {
    const act = op.act!;
    const text = act.description!;
    ports.signal?.throwIfAborted();
    const slots = act.slots ?? null;
    const normalized = JSON.stringify([
      normalize(text),
      act.targetEntityId,
      act.mode,
      slotsKey(slots),
    ]);
    const priorOperation = seen.get(normalized);
    if (priorOperation) {
      const prior = additions.find((binding) => binding.operationId === priorOperation);
      if (prior)
        additions.push({
          ...prior,
          operationId: op.localId,
          description: text,
          ...(prior.fulfillment ? { fulfillment: { ...prior.fulfillment, requested: text } } : {}),
        });
      continue; // Repeat the chosen invocation, not its paid interpretation.
    }
    const scoped = bindings.filter(
      (binding) =>
        binding.commands.length === 1 &&
        (!act.targetEntityId ||
          binding.commands.some(
            (command) =>
              ('targetId' in command && command.targetId === act.targetEntityId) ||
              ('heatId' in command && command.heatId === act.targetEntityId),
          )),
    );
    // Main's exact authored descriptions remain a free path, checked before typed forms so
    // an authored description is never re-parsed; ambiguity still needs grounding.
    const description = normalize(text).replace(/[.!?]+$/u, '');
    const matches = scoped.filter(
      (binding) =>
        normalize(binding.description).replace(/[.!?]+$/u, '') === description &&
        !unmetSlots(binding.commands, slots).length,
    );
    if (matches.length === 1) {
      seen.set(normalized, op.localId);
      const fulfillment: ActionFulfillment = {
        requested: text,
        executableDescription: text,
        verdict: 'exact',
        supported: [text],
        omitted: [],
        reason: 'Complete native form bound without inference.',
      };
      additions.push({
        operationId: op.localId,
        manifestRevision: world.moduleManifest.revision,
        description: text,
        commands: matches[0]!.commands,
        fulfillment,
      });
      await ports.record('Action fulfillment', { text }, fulfillment);
      continue;
    }
    // Recognized typed forms are free: they always rebind or restate their plain reason.
    const typed = typedAction(
      world,
      actorId,
      { text, targetId: act.targetEntityId, slots },
      op.localId,
    );
    if (typed) {
      seen.set(normalized, op.localId);
      additions.push(typed);
      await ports.record(
        typed.resolution ? 'Action refused' : 'Action fulfillment',
        { text, slots },
        typed.resolution ?? typed.fulfillment ?? null,
      );
      continue;
    }
    // Paid interpretation is not repeated for an unchanged autonomous failure; a changed
    // dependency signature (the reason's evidence) or an explicit player retry reopens it.
    if (
      actor.agency.attempts.some(
        (pending) =>
          sameAttempt(pending, text, act.targetEntityId, act.mode, slots) &&
          pending.manifestRevision === world.moduleManifest.revision &&
          (pending.status === 'awaiting-confirmation' ||
            (!ports.retryUnresolved &&
              (!pending.resolution ||
                pending.resolution.signature ===
                  resolutionSignature(world, actorId, pending.resolution.depends)))),
      )
    )
      continue;
    seen.set(normalized, op.localId);
    const unresolved = async (
      kind: string,
      detail: unknown,
      category: ResolutionCategory,
      reason: string,
      depends: string[] = [],
    ) => {
      await ports.record(kind, { text }, detail);
      additions.push({
        operationId: op.localId,
        manifestRevision: world.moduleManifest.revision,
        description: text,
        commands: [],
        resolution: refuseAction(world, actorId, category, reason, depends),
        keep: true,
      });
    };
    try {
      // Full pending storage cannot admit a new revision. Exact no-cost forms above
      // remain usable, and an explicit retry may resolve its existing slot.
      const existingIntent = actor.agency.attempts.some((pending) =>
        sameAttempt(pending, text, act.targetEntityId, act.mode, slots),
      );
      if (actor.agency.attempts.length + interpretedNewIntents >= 4 && !existingIntent) {
        await unresolved(
          'Action grounding deferred',
          { reason: 'pending-limit' },
          'unavailable',
          'Four requests already await a decision; withdraw one before asking for another interpretation.',
        );
        continue;
      }
      // Retain main's complete permitted handle set; catalogue order cannot hide a valid
      // action. The input byte envelope below refuses oversize grounding before inference.
      const visible = act.targetEntityId
        ? [
            ...observed.visibleEntities.filter((e) => e.id === act.targetEntityId),
            ...observed.visibleEntities.filter((e) => e.id !== act.targetEntityId),
          ]
        : observed.visibleEntities;
      const followTargets = new Set(
        scoped.flatMap((binding) =>
          binding.commands.flatMap((command) =>
            command.type === 'follow' ? [command.targetId] : [],
          ),
        ),
      );
      for (const target of visible.filter(
        (e) =>
          e.actor?.alive &&
          e.id !== actorId &&
          (!act.targetEntityId || e.id === act.targetEntityId) &&
          !followTargets.has(e.id),
      )) {
        scoped.push({
          description: `Follow ${observerDescription(world, actorId, target.id)} [${target.id}] at ordinary distance until cancelled, interrupted or lost from sight; no stealth or deadline.`,
          commands: [
            {
              id: op.localId,
              actorId,
              type: 'follow',
              targetId: target.id,
              distance: FOLLOW_RULES.defaultDistance,
            },
          ],
        });
      }
      // Jev may only choose a complete handle that already keeps every requested detail.
      const honoring = scoped.filter((binding) => !unmetSlots(binding.commands, slots).length);
      const context = {
        request: text,
        targetEntityId: act.targetEntityId,
        slots: slots && {
          ...slots,
          names: Object.fromEntries(
            slotReferences(slots).map((id) => [id, observerDescription(world, actorId, id)]),
          ),
        },
        actor: {
          name: observed.actor.name,
          goals: actor.agency.goals.filter((g) => g.status === 'active').map((g) => g.objective),
          currentWork: actor.action?.type ?? null,
        },
        position: worldPosition(observed.actor),
        support: worldSupport(observed.actor),
        entities: visible.slice(0, 64).map((e) => ({
          id: e.id,
          name: observerDescription(world, actorId, e.id),
          position: worldPosition(e),
          surfaceId: worldSupport(e),
          living: !!e.actor?.alive,
        })),
        entityCoverage: { available: visible.length, included: Math.min(visible.length, 64) },
        // Scoped item references let pickup/drop be interpreted without any shortlist.
        possessions: possessionSample(world, actorId),
        pileItems: pileSample(
          world,
          visible.filter((entity) => entity.kind === 'item-pile'),
        ),
        publicSupports:
          world.map.spatial.disclosure === 'public'
            ? world.map.spatial.surfaces.map((s) => ({ id: s.id, name: s.name }))
            : [],
        capabilities: navigationCapabilities(world),
        choices: scoped.map((c, index) => ({ id: `n${index}`, description: c.description })),
      };
      const selectable = new Set(honoring.map((binding) => scoped.indexOf(binding)));
      if (Buffer.byteLength(JSON.stringify(context)) > 100000) {
        await unresolved(
          'Action grounding deferred',
          { reason: 'Scoped input budget exceeded.' },
          'unavailable',
          'Too much is in view to interpret this request safely; nothing was started.',
          ['@visible'],
        );
        continue;
      }
      // Earlier proposals in this same response may still need a pending revision slot.
      if (!existingIntent) interpretedNewIntents++;
      const selected = await ports.judge({
        state: context,
        questions: actionGroundingQuestions(scoped.map((candidate) => candidate.description)),
      });
      const route = confident(selected, 'route');
      await ports.record('Action classification', context, selected);
      const chosen =
        route && /^n\d+$/u.test(route) && selectable.has(Number(route.slice(1)))
          ? scoped[Number(route.slice(1))]
          : undefined;
      if (chosen) {
        const fulfillment: ActionFulfillment = {
          requested: text,
          executableDescription: chosen.description,
          verdict: 'exact',
          supported: [text],
          omitted: [],
          reason: 'Jev selected a fully matching native binding.',
        };
        additions.push({
          operationId: op.localId,
          manifestRevision: world.moduleManifest.revision,
          description: text,
          commands: chosen.commands,
          fulfillment,
        });
        await ports.record('Action fulfillment', { text }, fulfillment);
        continue;
      }
      if (route === 'unresolved') {
        await unresolved(
          'Action unresolved',
          { route },
          'needs_planning',
          'No supported way to do that was found; nothing was started.',
        );
        continue;
      }
      const handle = scoped.length
        ? z.enum(scoped.map((_, index) => `n${index}`) as [string, ...string[]]).nullable()
        : z.null();
      const schema = z
        .object({
          disposition: z.enum(['execute', 'confirm', 'unresolved']),
          revised: z.string().min(1).max(1000),
          supported: z.array(z.string().min(1).max(500)).max(8),
          omitted: z
            .array(
              z
                .object({
                  requirement: z.string().min(1).max(500),
                  reason: z.string().min(1).max(500),
                })
                .strict(),
            )
            .max(8),
          reason: z.string().min(1).max(1000),
          steps: z
            .array(
              z
                .object({
                  actionId: handle,
                  invocation: navigationInvocationSchema
                    .extend({ until: namedTimeSchema(world) })
                    .nullable(),
                })
                .strict(),
            )
            .max(8),
        })
        .strict();
      const result = schema.parse(
        await ports.generate({
          instructions:
            ACTION_GROUNDING_POLICY +
            ' Return a faithful executable subset only when useful. Account for every meaningful clause as supported or omitted; the revised description must disclose actual termination and effects. Use confirm when unsure an omission is acceptable, especially changed safety, stealth, recipient, instrument, scope or cost. Never treat a skipped prerequisite as successful. Existing handles keep their exact arguments. Each step selects exactly one actionId or invocation. Only move/follow/pickup/drop invocations support generated parameters; pickup/drop items must come from the supplied possessions or pileItems. A follow without until has no successful finite termination and cannot precede another step; do not promise unreachable continuation. Return unresolved with no steps when nothing faithful is executable. Do not invent capabilities, definitions, completed effects or output IDs. Return only specified JSON.',
          context,
          schema: z.toJSONSchema(schema, { target: 'draft-7' }),
        }),
      );
      if (result.disposition === 'unresolved' || !result.steps.length) {
        await unresolved(
          'Action unresolved',
          result,
          'needs_planning',
          'No supported way to do that was found; nothing was started.',
        );
        continue;
      }
      let boundCommands: Command[] = [];
      let invalid = false;
      for (const [index, step] of result.steps.entries()) {
        if ((step.actionId === null) === (step.invocation === null)) {
          invalid = true;
          break;
        }
        const selectedCommand =
          step.actionId !== null
            ? scoped[Number(step.actionId.slice(1))]?.commands[0]
            : bindActionInvocation(
                world,
                actorId,
                `${op.localId}:${index}`,
                step.invocation,
                entityIds,
              );
        if (
          !selectedCommand ||
          'ok' in selectedCommand ||
          (act.targetEntityId &&
            'targetId' in selectedCommand &&
            selectedCommand.targetId !== act.targetEntityId)
        ) {
          invalid = true;
          break;
        }
        boundCommands.push(selectedCommand);
      }
      if (invalid) {
        await unresolved(
          'Action binding rejected',
          result,
          'needs_clarification',
          'The interpretation did not match a permitted action in view; nothing was started.',
          ['@visible'],
        );
        continue;
      }
      // Only a follow with a stopping time can truthfully complete before another step. The
      // guard runs before slot control wraps the steps into one composed activity.
      if (
        boundCommands
          .slice(0, -1)
          .some((command) => command.type === 'follow' && command.until === undefined)
      ) {
        await unresolved(
          'Action continuation unavailable',
          { reason: 'Indefinite following cannot truthfully complete before another step.' },
          'unsupported_capability',
          'Following has no natural end, so nothing can be queued after it.',
        );
        continue;
      }
      const describe = (command: Command) => {
        if (command.type === 'move')
          return `Walk to x=${command.destination.x}, z=${command.destination.z} on ${command.destination.surfaceId}.`;
        if (command.type === 'pickup')
          return `Pick up ${command.quantity ?? 'all'} ${command.itemId ? (world.itemDefinitions[itemFor(world, command.itemId)?.definitionId ?? '']?.name ?? 'items') : 'portable items'} from the pile.`;
        if (command.type === 'drop')
          return `Drop ${command.quantity} ${world.itemDefinitions[itemFor(world, command.itemId)?.definitionId ?? '']?.name ?? 'items'} on the ground.`;
        if (command.type === 'follow')
          return `Follow ${observerDescription(world, actorId, command.targetId)} at ${command.distance ?? FOLLOW_RULES.defaultDistance} world units${command.relation ? ` (${command.relation}, judged from their observed travel)` : ''} until ${command.until !== undefined ? 'the chosen clock time' : 'cancelled or interrupted'}; ${command.onLost ? 'on losing sight, walk to where they were last seen and stop there unless seen again' : 'stops on losing sight'}. No stealth.`;
        return (
          scoped.find((choice) => choice.commands[0] === command)?.description ??
          `Perform ${command.type}.`
        );
      };
      // Slot control either keeps the steps or appends one stopping rule: a repeat that
      // replaces the final gather, or a clock wait after the final move. Describe every step.
      const wrapped = applySlotControl(world, actorId, boundCommands, slots, op.localId);
      const composed =
        wrapped.length === 1 && wrapped[0]!.type === 'compose' ? wrapped[0] : undefined;
      const tail =
        composed?.type === 'compose'
          ? composed.root.kind === 'sequence'
            ? composed.root.children.at(-1)!
            : composed.root
          : undefined;
      const nativeDescription = [
        ...(composed
          ? tail?.kind === 'repeat'
            ? boundCommands.slice(0, -1)
            : boundCommands
          : wrapped
        ).map(describe),
        ...(tail?.kind === 'repeat'
          ? [
              `Repeat: ${tail.name} (at most ${tail.maximum} attempts; stops early if the source runs out).`,
            ]
          : tail?.kind === 'wait'
            ? [`${tail.name}.`]
            : []),
      ].join(' Then: ');
      boundCommands = wrapped;
      if (nativeDescription.length > 1000) {
        await unresolved(
          'Action explanation budget exceeded',
          { steps: boundCommands.length },
          'needs_clarification',
          'That request expands into too many steps to describe; ask for fewer at once.',
        );
        continue;
      }
      let verdict: ActionFulfillment['verdict'] =
        result.disposition === 'confirm' ? 'confirm' : result.omitted.length ? 'partial' : 'exact';
      let reason = result.reason;
      let omitted = result.omitted;
      // Native slot checks outrank the interpreter's claim that nothing was dropped.
      const unmet = unmetSlots(boundCommands, slots);
      if (unmet.length && verdict === 'exact') {
        verdict = 'confirm';
        reason = 'The native action does not keep every requested detail; accept it only as shown.';
        omitted = unmet.map((requirement) => ({
          requirement,
          reason: 'The chosen native action does not keep this requested detail.',
        }));
      }
      // Review actual decoded behavior, including candidates that claim no omissions.
      // docs/architecture.md#action-fulfillment-and-revision-approval
      if (verdict !== 'confirm') {
        const review = await ports.judge({
          state: {
            request: text,
            targetEntityId: act.targetEntityId,
            actor: context.actor,
            capabilities: context.capabilities,
            declaredOmissions: result.omitted,
            native: { description: nativeDescription, commands: boundCommands },
          },
          questions: actionFulfillmentQuestions(),
        });
        await ports.record(
          'Action fulfillment classification',
          { text, proposed: result, nativeDescription, commands: boundCommands },
          review,
        );
        const assessment = confident(review, 'fulfillment');
        if (assessment === 'reject') {
          await unresolved(
            'Action fulfillment rejected',
            { assessment },
            'needs_clarification',
            'The only executable interpretation did not match the request; nothing was started.',
          );
          continue;
        }
        const exact = assessment === 'exact' && omitted.length === 0;
        const partial = assessment === 'tolerable' && omitted.length > 0;
        if (!exact && !partial) {
          verdict = 'confirm';
          reason =
            'Independent review did not establish full fulfillment or tolerable documented omissions. Accept only the displayed native behavior.';
          if (!omitted.length)
            omitted = [
              {
                requirement: text,
                reason:
                  'Full fulfillment is unverified; the displayed native action is the proposed substitute.',
              },
            ];
        }
      }
      const fulfillment: ActionFulfillment = {
        requested: text,
        executableDescription: nativeDescription,
        verdict,
        supported: [nativeDescription.slice(0, 500)],
        omitted,
        reason,
      };
      additions.push({
        operationId: op.localId,
        manifestRevision: world.moduleManifest.revision,
        description: text,
        commands: boundCommands,
        fulfillment,
      });
      await ports.record('Action fulfillment', { text, commands: boundCommands }, fulfillment);
    } catch (error) {
      ports.signal?.throwIfAborted();
      await unresolved(
        'Action grounding unavailable',
        {
          operationId: op.localId,
          reason: error instanceof Error ? error.message.slice(0, 1000) : 'Unavailable',
          retry: 'explicit only',
        },
        'unavailable',
        'Interpreting this wording is unavailable right now; nothing was started. Retry it explicitly later.',
      );
    }
  }
  return additions.map((binding) => ({
    ...binding,
    targetEpisodes: captureActionTargets(world, actorId, binding.commands),
  }));
}
