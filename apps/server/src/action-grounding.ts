import {
  ACTION_GROUNDING_POLICY,
  actionGroundingQuestions,
  actionFulfillmentQuestions,
} from './jev-questions.js';
import { navigationInvocationSchema } from './navigation-contracts.js';
import { z } from 'zod';
import {
  captureActionTargets,
  observerDescription,
  bindNavigationInvocation,
  NAVIGATION_CAPABILITIES,
  FOLLOW_RULES,
  normalizeAttempt,
  sameAttempt,
  observeActor,
  type ActionFulfillment,
  type ActorResponse,
  type AttemptBinding,
  type Command,
  type NavigationInvocation,
  type WorldState,
} from '@open-legend/domain';
import type { GenerateRequest, JudgeRequest, JudgeValue } from '@open-legend/ai';

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

/** Exact complete forms only: never strip a qualifier to manufacture a free fast path. */
export function exactNavigation(
  text: string,
  world: WorldState,
  actorId: string,
  targetId?: string | null,
  visibleEntities?: NonNullable<ReturnType<typeof observeActor>>['visibleEntities'],
): NavigationInvocation | undefined {
  const number = '(-?\\d+(?:\\.\\d+)?)';
  const point = new RegExp(
    `^(?:go|move|walk)(?: to)?\\s+(?:x\\s*=\\s*)?${number}\\s*,\\s*(?:z\\s*=\\s*)?${number}(?:\\s+(?:on|surface)\\s+([a-zA-Z0-9_:-]+))?[.!]?$`,
    'i',
  ).exec(text.trim());
  if (point)
    return {
      family: 'move',
      x: Number(point[1]),
      z: Number(point[2]),
      surfaceId: point[3] ?? null,
      targetEntityId: null,
      distance: null,
    };
  const following = /^follow\s+(.+?)[.!]?$/iu.exec(text.trim());
  if (!following) return;
  const name = normalize(following[1]!).replace(/^the\s+/u, '');
  const visible = (visibleEntities ?? observeActor(world, actorId)?.visibleEntities ?? []).filter(
    (e) => e.actor?.alive && e.id !== actorId,
  );
  const matches = visible.filter(
    (e) =>
      (normalize(observerDescription(world, actorId, e.id)).replace(/^(?:an?|the)\s+/u, '') ===
        name ||
        e.id === following[1] ||
        (targetId === e.id &&
          ['this', 'that', 'this actor', 'that actor', 'this deer', 'that deer'].includes(name))) &&
      (!targetId || targetId === e.id),
  );
  if (matches.length !== 1) return;
  return {
    family: 'follow',
    x: null,
    z: null,
    surfaceId: null,
    targetEntityId: matches[0]!.id,
    distance: null,
  };
}

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
        (!op.act.targetEntityId || entityIds.includes(op.act.targetEntityId)),
    )
    .slice(0, 4);
  const additions: AttemptBinding[] = [];
  const seen = new Map<string, string>();
  for (const op of proposals) {
    const act = op.act!;
    const text = act.description!;
    ports.signal?.throwIfAborted();
    const normalized = JSON.stringify([normalize(text), act.targetEntityId, act.mode]);
    const priorOperation = seen.get(normalized);
    if (priorOperation) {
      const prior = additions.find((binding) => binding.operationId === priorOperation);
      if (prior?.fulfillment)
        additions.push({
          ...prior,
          operationId: op.localId,
          description: text,
          fulfillment: { ...prior.fulfillment, requested: text },
        });
      continue; // Repeat the chosen invocation, not its paid interpretation.
    }
    if (
      actor.agency.attempts.some(
        (pending) =>
          sameAttempt(pending, text, act.targetEntityId, act.mode) &&
          pending.manifestRevision === world.moduleManifest.revision &&
          (pending.status === 'awaiting-confirmation' || !ports.retryUnresolved),
      )
    )
      continue;
    seen.set(normalized, op.localId);
    try {
      let commands: Command[] | undefined;
      const exact = exactNavigation(
        text,
        world,
        actorId,
        act.targetEntityId,
        observed.visibleEntities,
      );
      if (exact) {
        const bound = bindNavigationInvocation(world, actorId, op.localId, exact, entityIds);
        if (!('ok' in bound)) commands = [bound];
        else {
          await ports.record('Action binding unavailable', { text, invocation: exact }, bound);
          continue;
        }
      }
      if (commands) {
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
          commands,
          fulfillment,
        });
        await ports.record('Action fulfillment', { text }, fulfillment);
        continue;
      }
      // Apply the explicit target before truncation; selection must survive dense scenes.
      const scoped = bindings
        .filter(
          (binding) =>
            binding.commands.length === 1 &&
            (!act.targetEntityId ||
              binding.commands.some(
                (command) =>
                  ('targetId' in command && command.targetId === act.targetEntityId) ||
                  ('heatId' in command && command.heatId === act.targetEntityId),
              )),
        )
        .slice(0, 48);
      const visible = act.targetEntityId
        ? [
            ...observed.visibleEntities.filter((e) => e.id === act.targetEntityId),
            ...observed.visibleEntities.filter((e) => e.id !== act.targetEntityId),
          ]
        : observed.visibleEntities;
      for (const target of visible
        .filter(
          (e) =>
            e.actor?.alive &&
            e.id !== actorId &&
            (!act.targetEntityId || e.id === act.targetEntityId),
        )
        .slice(0, 16)) {
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
      const context = {
        request: text,
        targetEntityId: act.targetEntityId,
        actor: {
          name: observed.actor.name,
          goals: actor.agency.goals.filter((g) => g.status === 'active').map((g) => g.objective),
          currentWork: actor.action?.type ?? null,
        },
        position: observed.actor.position,
        support: observed.actor.spatial.supportSurfaceId,
        entities: visible.slice(0, 64).map((e) => ({
          id: e.id,
          name: observerDescription(world, actorId, e.id),
          position: e.position,
          surfaceId: e.spatial.supportSurfaceId,
          living: !!e.actor?.alive,
        })),
        publicSupports:
          world.map.spatial.disclosure === 'public'
            ? world.map.spatial.surfaces.map((s) => ({ id: s.id, name: s.name }))
            : [],
        capabilities: NAVIGATION_CAPABILITIES,
        choices: scoped.map((c, index) => ({ id: `n${index}`, description: c.description })),
      };
      if (Buffer.byteLength(JSON.stringify(context)) > 32000) {
        await ports.record(
          'Action grounding deferred',
          { text },
          { reason: 'Scoped input budget exceeded.' },
        );
        continue;
      }
      const selected = await ports.judge({
        state: context,
        questions: actionGroundingQuestions(scoped.map((candidate) => candidate.description)),
      });
      const route = confident(selected, 'route');
      await ports.record('Action classification', context, selected);
      const chosen = route && /^n\d+$/u.test(route) ? scoped[Number(route.slice(1))] : undefined;
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
      if (route === 'unresolved') continue;
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
                .object({ actionId: handle, invocation: navigationInvocationSchema.nullable() })
                .strict(),
            )
            .max(8),
        })
        .strict();
      const result = schema.parse(
        await ports.generate({
          instructions:
            ACTION_GROUNDING_POLICY +
            ' Return a faithful executable subset only when useful. Account for every meaningful clause as supported or omitted; the revised description must disclose actual termination and effects. Use confirm when unsure an omission is acceptable, especially changed safety, stealth, recipient, instrument, scope or cost. Never treat a skipped prerequisite as successful. Existing handles keep their exact arguments. Each step selects exactly one actionId or navigation invocation. Only move/follow support generated parameters. Follow has no successful finite termination and cannot precede another step; do not promise unreachable continuation. Return unresolved with no steps when nothing faithful is executable. Do not invent capabilities, definitions, completed effects or output IDs. Return only specified JSON.',
          context,
          schema: z.toJSONSchema(schema, { target: 'draft-7' }),
        }),
      );
      if (result.disposition === 'unresolved' || !result.steps.length) {
        await ports.record('Action unresolved', { text }, result);
        continue;
      }
      const boundCommands: Command[] = [];
      let invalid = false;
      for (const [index, step] of result.steps.entries()) {
        if ((step.actionId === null) === (step.invocation === null)) {
          invalid = true;
          break;
        }
        const selectedCommand =
          step.actionId !== null
            ? scoped[Number(step.actionId.slice(1))]?.commands[0]
            : bindNavigationInvocation(
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
        await ports.record('Action binding rejected', { text }, result);
        continue;
      }
      const nativeDescription = boundCommands
        .map((command) => {
          if (command.type === 'move')
            return `Walk to x=${command.destination.x}, z=${command.destination.z} on ${command.destination.surfaceId}.`;
          if (command.type === 'follow')
            return `Follow ${observerDescription(world, actorId, command.targetId)} at ${command.distance ?? FOLLOW_RULES.defaultDistance} world units until cancelled, interrupted or lost from sight. No stealth or sunset stop.`;
          return (
            scoped.find((choice) => choice.commands[0] === command)?.description ??
            `Perform ${command.type}.`
          );
        })
        .join(' Then: ');
      if (nativeDescription.length > 1000) {
        await ports.record(
          'Action explanation budget exceeded',
          { text },
          { steps: boundCommands.length },
        );
        continue;
      }
      if (boundCommands.slice(0, -1).some((command) => command.type === 'follow')) {
        await ports.record(
          'Action continuation unavailable',
          { text },
          { reason: 'Indefinite following cannot truthfully complete before another step.' },
        );
        continue;
      }
      let verdict: ActionFulfillment['verdict'] =
        result.disposition === 'confirm' ? 'confirm' : result.omitted.length ? 'partial' : 'exact';
      let reason = result.reason;
      let omitted = result.omitted;
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
        if (assessment === 'reject') continue;
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
      await ports.record(
        'Action grounding unavailable',
        { text, operationId: op.localId },
        {
          reason: error instanceof Error ? error.message.slice(0, 1000) : 'Unavailable',
          retry: 'explicit only',
        },
      );
    }
  }
  return additions.map((binding) => ({
    ...binding,
    targetEpisodes: captureActionTargets(world, actorId, binding.commands),
  }));
}
