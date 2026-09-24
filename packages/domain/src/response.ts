import { editKnowledge, knowledgeDocument, type KnowledgeEdit } from './knowledge.js';
import {
  assignGivenName,
  canRememberSubject,
  rememberSubject,
  type GivenNameEdit,
} from './worlds/base/knowledge.js';
import { capabilityBlocked } from './status-capabilities.js';
import { hasMemory, supportsManualWork } from './living.js';
import {
  normalizeAttempt,
  resolveAttempt,
  deferAttempt,
  arrangePlan,
  cancelPlan,
  changeGoal,
  type GoalChange,
  type PlannedCommand,
} from './agency.js';
import { getOwn, isSafeRecordId } from './records.js';
import { draftWorld } from './draft.js';
import { executeCommand, SIMULATION_RULES } from './kernel.js';
import { appendMemory, canonicalJson, emit, finish, outcome } from './events.js';
import { seesEntity } from './perception.js';
import { distance, hasLineOfSight } from './spatial.js';
import type { Command, Outcome, Transition, WorldState } from './types.js';

export interface ResponseOperation {
  note?: KnowledgeEdit | null;
  name?: GivenNameEdit | null;
  localId: string;
  requiresAccepted: string[];
  talk: { text: string; addresseeEntityId: string; selfIntroduction?: string | null } | null;
  act: {
    kind: 'known' | 'expression' | 'proposal';
    actionId: string | null;
    verb: 'nod' | 'smile' | 'frown' | 'wave' | 'shrug' | 'shake_head' | 'slap' | null;
    targetEntityId: string | null;
    description: string | null;
    mode: 'enqueue' | 'replace';
  } | null;
  think: { text: string; aboutEntityIds: string[] } | null;
  goal: GoalChange | null;
  plan: {
    mode: 'enqueue' | 'replace' | 'cancel';
    expectedRevision: number;
    goalId: string | null;
    steps: {
      actionId: string | null;
      itemFromStep: number | null;
      useItemAs: 'equip' | 'eat' | null;
    }[];
  } | null;
}
export interface ActorResponse {
  operations: ResponseOperation[];
}
export interface AttemptBinding {
  description: string;
  commands: Command[];
}

export interface ResponseReceipt {
  digest: string;
  components: Record<string, Outcome>;
  outcome: Outcome;
}
export const RESPONSE_LIMITS = { operations: 16, bytes: 40000 } as const;

export function validResponseEnvelope(value: ActorResponse): boolean {
  if (
    !value ||
    typeof value !== 'object' ||
    Object.keys(value).join() !== 'operations' ||
    !Array.isArray(value.operations) ||
    value.operations.length > RESPONSE_LIMITS.operations
  )
    return false;
  if (new TextEncoder().encode(JSON.stringify(value)).length > RESPONSE_LIMITS.bytes) return false;
  const ids = new Set<string>();
  const fields = ['talk', 'act', 'think', 'goal', 'plan', 'note', 'name'] as const;
  for (const op of value.operations) {
    if (
      !op ||
      Object.keys(op).some((key) => !['localId', 'requiresAccepted', ...fields].includes(key)) ||
      Object.keys(op).length < 7 ||
      !/^[a-z][a-z0-9_]{0,23}$/.test(op.localId) ||
      !isSafeRecordId(op.localId) ||
      ids.has(op.localId) ||
      !Array.isArray(op.requiresAccepted) ||
      op.requiresAccepted.length > 16 ||
      new Set(op.requiresAccepted).size !== op.requiresAccepted.length ||
      op.requiresAccepted.some((id) => !ids.has(id)) ||
      fields.some(
        (field) =>
          (!['note', 'name'].includes(field) && !(field in op)) ||
          (op[field] != null && (typeof op[field] !== 'object' || Array.isArray(op[field]))),
      ) ||
      fields.filter((field) => op[field] != null).length !== 1
    )
      return false;
    const record = (value: unknown, keys: string[]) =>
      !!value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value).length === keys.length &&
      keys.every((key) => Object.hasOwn(value, key));
    const text = (value: unknown) => typeof value === 'string';
    const nullableText = (value: unknown) => value === null || text(value);
    const strings = (value: unknown) => Array.isArray(value) && value.every(text);
    if (
      op.talk &&
      (!(
        record(op.talk, ['text', 'addresseeEntityId']) ||
        record(op.talk, ['text', 'addresseeEntityId', 'selfIntroduction'])
      ) ||
        !text(op.talk.text) ||
        !text(op.talk.addresseeEntityId) ||
        (op.talk.selfIntroduction !== undefined && !nullableText(op.talk.selfIntroduction)))
    )
      return false;
    if (
      op.think &&
      (!record(op.think, ['text', 'aboutEntityIds']) ||
        !text(op.think.text) ||
        !strings(op.think.aboutEntityIds))
    )
      return false;
    if (
      op.act &&
      (!record(op.act, ['kind', 'actionId', 'verb', 'targetEntityId', 'description', 'mode']) ||
        !['known', 'expression', 'proposal'].includes(op.act.kind) ||
        !['enqueue', 'replace'].includes(op.act.mode) ||
        ![op.act.actionId, op.act.verb, op.act.targetEntityId, op.act.description].every(
          nullableText,
        ))
    )
      return false;
    if (
      op.goal &&
      (!record(op.goal, ['operation', 'goalId', 'expectedRevision', 'objective', 'parentId']) ||
        !['create', 'revise', 'pause', 'resume', 'complete', 'abandon'].includes(
          op.goal.operation,
        ) ||
        ![op.goal.goalId, op.goal.objective, op.goal.parentId].every(nullableText) ||
        !(
          op.goal.expectedRevision === null ||
          (Number.isSafeInteger(op.goal.expectedRevision) && op.goal.expectedRevision >= 0)
        ))
    )
      return false;
    if (
      op.plan &&
      (!record(op.plan, ['mode', 'expectedRevision', 'goalId', 'steps']) ||
        !['enqueue', 'replace', 'cancel'].includes(op.plan.mode) ||
        !Number.isSafeInteger(op.plan.expectedRevision) ||
        op.plan.expectedRevision < 0 ||
        !nullableText(op.plan.goalId) ||
        !Array.isArray(op.plan.steps) ||
        op.plan.steps.length > 8 ||
        op.plan.steps.some(
          (step, index) =>
            !record(step, ['actionId', 'itemFromStep', 'useItemAs']) ||
            (step.actionId !== null
              ? typeof step.actionId !== 'string' ||
                step.itemFromStep !== null ||
                step.useItemAs !== null
              : !Number.isSafeInteger(step.itemFromStep) ||
                step.itemFromStep! < 0 ||
                step.itemFromStep! >= index ||
                !['equip', 'eat'].includes(step.useItemAs!)),
        ))
    )
      return false;
    if (
      op.note &&
      (!record(op.note, ['subjectId', 'expectedRevision', 'text']) ||
        !nullableText(op.note.subjectId) ||
        !text(op.note.text) ||
        !Number.isSafeInteger(op.note.expectedRevision))
    )
      return false;
    if (
      op.name &&
      (!record(op.name, ['subjectId', 'expectedRevision', 'givenName']) ||
        !text(op.name.subjectId) ||
        !text(op.name.givenName) ||
        !Number.isSafeInteger(op.name.expectedRevision))
    )
      return false;
    ids.add(op.localId);
  }
  return true;
}
export const RESPONSE_RECEIPT_LIMIT = 300;

/** One saved transition, independent component outcomes, no generated effects. */
export function commitActorResponse(
  input: WorldState,
  id: string,
  actorId: string,
  response: ActorResponse,
  actions: Record<string, Command | null>,
  entityIds: string[],
  expectedPlan: number,
  attemptBindings: AttemptBinding[] = [],
  expectedEncounters?: Record<string, string>,
  evidenceIds: string[] = [],
  knowledgeReferences: Record<string, string> = {},
): Transition {
  const reject = (message: string): Transition => ({
    world: input,
    events: [],
    outcome: outcome(false, 'response-rejected', message),
  });
  const unavailable = (message: string): Transition => ({
    world: input,
    events: [],
    outcome: outcome(false, 'actor-unavailable', message),
  });
  if (!isSafeRecordId(id) || id.length > 100 || !validResponseEnvelope(response))
    return reject('Malformed decision envelope, aliases, dependencies or aggregate limits.');
  const digest = canonicalJson({
    actorId,
    response,
    actions,
    entityIds,
    expectedPlan,
    attemptBindings,
    expectedEncounters,
    evidenceIds,
    knowledgeReferences,
  });
  const prior = getOwn(input.responseReceipts ?? {}, id);
  if (prior) {
    return prior.digest === digest
      ? {
          world: input,
          events: [],
          outcome: { ...prior.outcome, code: 'duplicate' },
        }
      : reject('Response identity was reused with different content.');
  }
  const actor = getOwn(input.entities, actorId);
  // Paused commits wait for resume at the paid-work boundary rather than turning
  // an admitted response into a failure. See docs/architecture.md#paid-work-absence-and-recovery.
  if (input.paused)
    return {
      world: input,
      events: [],
      outcome: outcome(false, 'paused', 'The response is waiting for the world to resume.'),
    };
  if (!actor?.actor) return unavailable('The person is no longer available.');
  if (!actor.actor.alive) return unavailable(`${actor.name} is dead and cannot respond.`);
  if (actor.actor.incapacitated)
    return unavailable(`${actor.name} is incapacitated and cannot respond.`);
  if (capabilityBlocked(input, actor, 'speech'))
    return unavailable(`${actor.name} cannot speak in their current state.`);
  const permitted = new Set(entityIds);
  let world = draftWorld(input);
  const events: Transition['events'] = [];
  const components: ResponseReceipt['components'] = {};
  let localId = '';
  const command = (part: 'talk' | 'act', value: Command) => {
    let transition = executeCommand(world, value);
    // Speaking aloud preserves intent without claiming the recipient heard or joined.
    // docs/narration-and-conversations.md#speech-intent-and-audience
    if (
      part === 'talk' &&
      value.type === 'say' &&
      !transition.outcome.ok &&
      transition.outcome.code === 'not-heard'
    )
      transition = executeCommand(world, {
        id: value.id,
        actorId: value.actorId,
        type: 'say',
        text: value.text,
        ...(value.selfIntroduction ? { selfIntroduction: value.selfIntroduction } : {}),
        intendedRecipientId: value.targetId,
      });
    world = draftWorld(transition.world);
    for (const event of transition.events) {
      const saved = world.events.find((entry) => entry.id === event.id);
      if (saved) saved.data = { ...saved.data, responseId: id };
    }
    events.push(
      ...transition.events.map((event) => ({ ...event, data: { ...event.data, responseId: id } })),
    );
    components[localId] = transition.outcome;
  };
  for (const op of response.operations) {
    localId = op.localId;
    if (op.requiresAccepted.some((dependency) => !components[dependency]?.ok)) {
      components[localId] = outcome(
        false,
        'dependency-rejected',
        'An admission dependency was rejected.',
      );
      continue;
    }
    const goalRef = (ref: string | null): string | null | undefined => {
      if (!ref?.startsWith('$')) return ref;
      const alias = ref.slice(1);
      return op.requiresAccepted.includes(alias) ? components[alias]?.goalId : undefined;
    };
    const subject = op.name?.subjectId ?? op.note?.subjectId;
    const rememberedSubject = op.note?.subjectId
      ? getOwn(knowledgeReferences, op.note.subjectId)
      : undefined;
    if (
      subject &&
      !rememberedSubject &&
      expectedEncounters &&
      expectedEncounters[subject] !== world.perceptionEpisodes?.[actorId]?.[subject]
    ) {
      components[localId] = outcome(
        false,
        'stale-encounter',
        'The perceived subject encounter changed.',
      );
      continue;
    }
    if (op.name) components[localId] = assignGivenName(world, actorId, op.name, entityIds);
    if (op.note) {
      const subjectId = rememberedSubject ?? op.note.subjectId;
      const existingDocument = rememberedSubject && knowledgeDocument(world, actorId, subjectId);
      if (
        subjectId !== null &&
        (rememberedSubject ? !existingDocument : !canRememberSubject(world, actorId, subjectId))
      )
        components[localId] = outcome(
          false,
          'recognition-unavailable',
          'The subject has no supported identity binding.',
        );
      else {
        // Editing a remembered document does not identify a new exposure of its subject.
        // docs/knowledge.md#subject-binding
        components[localId] = editKnowledge(
          world,
          actorId,
          { ...op.note, subjectId },
          rememberedSubject ? [rememberedSubject] : entityIds,
          evidenceIds,
        );
        if (components[localId]!.ok && subjectId !== null && !rememberedSubject)
          rememberSubject(world, actorId, subjectId);
      }
    }
    if (op.talk) {
      const validTarget =
        permitted.has(op.talk.addresseeEntityId) &&
        Object.hasOwn(world.entities, op.talk.addresseeEntityId);
      if (!op.talk.text.trim() || op.talk.text.length > 1200 || !validTarget)
        components[localId] = outcome(
          false,
          'invalid-speech',
          !validTarget
            ? 'talk.addresseeEntityId must reference a permitted existing entity ID.'
            : 'Speech must contain 1–1200 characters.',
        );
      else
        command('talk', {
          id: `${id}:${localId}`,
          actorId,
          type: 'say',
          text: op.talk.text,
          ...(op.talk.selfIntroduction ? { selfIntroduction: op.talk.selfIntroduction } : {}),
          targetId: op.talk.addresseeEntityId,
        });
    }
    const act = op.act;
    const invalidActShape =
      !!act &&
      ((act.kind === 'known' &&
        (!act.actionId || act.verb || act.targetEntityId || act.description)) ||
        (act.kind === 'expression' && (!act.verb || act.actionId || act.description)) ||
        (act.kind === 'proposal' &&
          (!act.description ||
            act.description.length > 500 ||
            act.actionId ||
            act.verb ||
            act.targetEntityId)));
    if (invalidActShape) {
      components[localId] = outcome(
        false,
        'invalid-action-response',
        'The proposed action fields do not match its kind.',
      );
    } else if (act?.kind === 'known' && !Object.hasOwn(actions, act.actionId!)) {
      components[localId] = outcome(
        false,
        'unoffered-action',
        'The proposed action was not offered.',
      );
    } else if (act?.kind === 'known') {
      const selected = actions[act.actionId!];
      if (act.mode === 'replace' && input.entities[actorId]!.actor!.planGeneration !== expectedPlan)
        components[localId] = outcome(false, 'stale-plan', 'The current task changed.');
      else if (
        selected &&
        ['conversation', 'teach', 'cancel', 'recover', 'withdraw-attempt'].includes(selected.type)
      )
        command('act', { ...selected, actorId, id: `${id}:${localId}` });
      else if (selected)
        components[localId] = arrangePlan(
          world.entities[actorId]!.actor!,
          `${id}:${localId}`,
          [{ ...selected, actorId, id: `${id}:${localId}` }],
          act.mode,
          world.entities[actorId]!.actor!.agency.plan?.revision ?? 0,
          null,
        );
      else components[localId] = outcome(true, 'continued', 'Existing behavior continues.');
    } else if (act?.kind === 'expression') {
      const source = world.entities[actorId]!;
      const target = act.targetEntityId ? world.entities[act.targetEntityId] : undefined;
      const invalidTarget =
        !!act.targetEntityId &&
        (!permitted.has(act.targetEntityId) || !Object.hasOwn(world.entities, act.targetEntityId));
      const verbs = {
        nod: 'nods',
        smile: 'smiles',
        frown: 'frowns',
        wave: 'waves',
        shrug: 'shrugs',
        shake_head: 'shakes their head',
        slap: 'slaps',
      };
      const reachable =
        act.verb !== 'slap' ||
        (!!target &&
          target.id !== actorId &&
          distance(source.position, target.position) <= SIMULATION_RULES.interactionRadius &&
          hasLineOfSight(world, source.position, target.position));
      if (
        !supportsManualWork(source) ||
        !act.verb ||
        !Object.hasOwn(verbs, act.verb) ||
        invalidTarget ||
        !reachable ||
        (target &&
          (!hasLineOfSight(world, source.position, target.position) ||
            !seesEntity(world, source, target) ||
            (target.actor && !target.actor.alive)))
      )
        components[localId] = outcome(
          false,
          supportsManualWork(source) ? 'invalid-expression' : 'unsupported-body',
          supportsManualWork(source)
            ? 'The expression target is unavailable or out of reach.'
            : 'This gesture requires a supported biped body.',
        );
      else {
        emit(
          world,
          events,
          'expression',
          `${source.name} ${verbs[act.verb!]}${target ? `${act.verb === 'slap' ? ' ' : ' toward '}${target.name}` : ''}.`,
          source,
          target?.id,
          { mechanical: false, responseId: id, semanticTrigger: true },
        );
        components[localId] = outcome(
          true,
          'expressed',
          'Expression accepted without mechanical effects.',
        );
      }
    } else if (act?.kind === 'proposal') {
      // Server-scoped interpretation chooses existing commands, never effects. Admission
      // remains native and a composition queues sequential work rather than executing it here.
      // docs/architecture.md#actor-agency-foundation
      const normalize = (text: string) => normalizeAttempt(text).replace(/[.!?]+$/u, '');
      const matches = attemptBindings.filter(
        (binding) => normalize(binding.description) === normalize(act.description!),
      );
      const component = world.entities[actorId]!.actor!;
      if (matches.length === 1) {
        const selected = matches[0]!.commands;
        if (
          act.mode === 'replace' &&
          input.entities[actorId]!.actor!.planGeneration !== expectedPlan
        )
          components[localId] = outcome(false, 'stale-plan', 'The current native task changed.');
        else if (
          selected.length === 1 &&
          ['conversation', 'teach', 'cancel', 'recover', 'withdraw-attempt'].includes(
            selected[0]!.type,
          )
        )
          command('act', { ...selected[0]!, actorId, id: `${id}:${localId}` });
        else
          components[localId] = arrangePlan(
            component,
            `${id}:${localId}`,
            selected.map((command, index) => ({
              ...command,
              actorId,
              id: `${id}:${localId}:${index}`,
            })),
            act.mode,
            component.agency.plan?.revision ?? 0,
            null,
          );
        if (components[localId]?.ok)
          resolveAttempt(world.entities[actorId]!.actor!, act.description!);
      } else
        components[localId] = deferAttempt(world, actorId, `${id}:${localId}`, act.description!);
    }

    if (op.think) {
      const invalidReferences = op.think.aboutEntityIds.some(
        (target) => !permitted.has(target) || !Object.hasOwn(world.entities, target),
      );
      if (
        !hasMemory(world.entities[actorId]) ||
        !op.think.text.trim() ||
        op.think.text.length > 240 ||
        op.think.aboutEntityIds.length > 8 ||
        invalidReferences
      )
        components[localId] = outcome(
          false,
          'invalid-thought',
          'The proposed thought exceeds its limits or references unavailable entities.',
        );
      else {
        appendMemory(world, actorId, {
          kind: 'episode',
          source: 'self_thought',
          summary: `I thought: ${op.think.text}`,
          entityIds: op.think.aboutEntityIds,
          importance: 5,
          responseId: id,
        });
        components[localId] = outcome(true, 'thought', 'Private thought remembered.');
      }
    }

    if (op.goal) {
      const goalId = goalRef(op.goal.goalId),
        parentId = goalRef(op.goal.parentId);
      components[localId] =
        actor.actor.controller === 'player'
          ? outcome(false, 'player-intention', 'Player intentions require explicit player input.')
          : goalId === undefined || parentId === undefined
            ? outcome(
                false,
                'invalid-goal-reference',
                'Local goal references require an accepted goal dependency.',
              )
            : changeGoal(
                world.entities[actorId]!.actor!,
                { ...op.goal, goalId, parentId },
                `${id}:${localId}`,
                'actor',
              );
    }
    if (op.plan) {
      const component = world.entities[actorId]!.actor!;
      const goalId = goalRef(op.plan.goalId);
      if (
        goalId === undefined ||
        op.plan.steps.some((step) => step.actionId !== null && !getOwn(actions, step.actionId))
      )
        components[localId] = outcome(
          false,
          'unoffered-action',
          'Plan references require supplied actions and accepted goals.',
        );
      else if (op.plan.mode === 'cancel') {
        if (
          op.plan.steps.length ||
          op.plan.goalId !== null ||
          (component.agency.plan?.revision ?? 0) !== op.plan.expectedRevision
        )
          components[localId] = outcome(
            false,
            'invalid-plan',
            'Cancellation requires the current plan revision and no new steps or goal.',
          );
        else {
          cancelPlan(component);
          components[localId] = outcome(
            true,
            'cancelled',
            'Future dispatch cancelled; goals and spent resources retained.',
          );
        }
      } else
        components[localId] = arrangePlan(
          component,
          `${id}:${localId}`,
          op.plan.steps.map(
            (step, index): PlannedCommand =>
              step.actionId !== null
                ? {
                    ...actions[step.actionId]!,
                    actorId,
                    id: `${id}:${localId}:${index}`,
                  }
                : {
                    type: step.useItemAs!,
                    itemFromStep: `${id}:${localId}:${step.itemFromStep}`,
                    actorId,
                    id: `${id}:${localId}:${index}`,
                  },
          ),
          op.plan.mode,
          op.plan.expectedRevision,
          goalId,
        );
    }
  }
  const accepted = Object.values(components).filter((part) => part.ok).length;
  const rejected = Object.values(components).filter((part) => !part.ok).length;
  const overall = !Object.keys(components).length
    ? outcome(true, 'response-empty', 'No new response was chosen.')
    : rejected === 0
      ? outcome(true, 'responded', 'Response completed.')
      : accepted > 0
        ? outcome(true, 'response-partial', 'Response completed with rejected components.')
        : outcome(
            false,
            'response-rejected',
            `No response component was accepted. ${Object.entries(components)
              .map(([part, result]) => `${part}: ${result.message}`)
              .join(' ')}`,
          );
  const receipts = (world.responseReceipts ??= {});
  receipts[id] = { digest, components, outcome: overall };
  // This is only the recent in-state idempotency/debug window. Actor memories,
  // world events, durable jobs and conversation history keep their own retention.
  for (const oldId of Object.keys(receipts).slice(0, -RESPONSE_RECEIPT_LIMIT))
    delete receipts[oldId];
  return finish(world, events, overall);
}
