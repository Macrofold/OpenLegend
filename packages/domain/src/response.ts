import { draftWorld } from './draft.js';
import { executeCommand, SIMULATION_RULES } from './kernel.js';
import { appendMemory, canonicalJson, emit, finish, outcome } from './events.js';
import { canSee } from './perception.js';
import { distance, hasLineOfSight } from './spatial.js';
import type { Command, Outcome, Transition, WorldState } from './types.js';

export interface ActorResponse {
  talk: { text: string; addressee: string } | null;
  act: {
    kind: 'known' | 'expression' | 'proposal';
    actionId: string | null;
    verb: 'nod' | 'smile' | 'frown' | 'wave' | 'shrug' | 'shake_head' | 'slap' | null;
    target: string | null;
    description: string | null;
  } | null;
  think: { text: string; about: string[] } | null;
}
export interface ResponseReceipt {
  digest: string;
  components: Partial<Record<'talk' | 'act' | 'think', Outcome>>;
  /** Optional only for additive compatibility with receipts saved before aggregate outcomes. */
  outcome?: Outcome;
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
): Transition {
  const reject = (message: string): Transition => ({
    world: input,
    events: [],
    outcome: outcome(false, 'response-rejected', message),
  });
  const digest = canonicalJson({ actorId, response, actions, entityIds, expectedPlan });
  const prior = input.responseReceipts?.[id];
  if (prior) {
    const priorComponents = Object.values(prior.components);
    const priorOutcome =
      prior.outcome ??
      (priorComponents.length === 0 || priorComponents.some((component) => component.ok)
        ? outcome(true, 'responded', 'Response was already applied.')
        : outcome(false, 'response-rejected', 'No response component was accepted.'));
    return prior.digest === digest
      ? {
          world: input,
          events: [],
          outcome: { ...priorOutcome, code: 'duplicate' },
        }
      : reject('Response identity was reused with different content.');
  }
  const actor = input.entities[actorId];
  if (input.paused || !actor?.actor?.alive || actor.actor.incapacitated || actor.actor.rest?.asleep)
    return reject('The actor cannot respond now.');
  const permitted = new Set(entityIds);
  let world = draftWorld(input);
  const events: Transition['events'] = [];
  const components: ResponseReceipt['components'] = {};
  const command = (part: 'talk' | 'act', value: Command) => {
    let transition = executeCommand(world, value);
    // A reply remains valid speech if its intended listener moved while it was
    // being composed. It is spoken aloud to the current audible audience;
    // mechanical actions continue to enforce their live prerequisites.
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
      });
    world = draftWorld(transition.world);
    for (const event of transition.events) {
      const saved = world.events.find((entry) => entry.id === event.id);
      if (saved) saved.data = { ...saved.data, responseId: id };
    }
    events.push(
      ...transition.events.map((event) => ({ ...event, data: { ...event.data, responseId: id } })),
    );
    components[part] = transition.outcome;
  };
  if (response.talk) {
    const validTarget =
      permitted.has(response.talk.addressee) &&
      Object.hasOwn(world.entities, response.talk.addressee);
    if (!response.talk.text.trim() || response.talk.text.length > 1200 || !validTarget)
      components.talk = outcome(
        false,
        'invalid-speech',
        'The proposed speech or addressee is unavailable.',
      );
    else
      command('talk', {
        id: `${id}:talk`,
        actorId,
        type: 'say',
        text: response.talk.text,
        targetId: response.talk.addressee,
      });
  }
  const act = response.act;
  const invalidActShape =
    !!act &&
    ((act.kind === 'known' && (!act.actionId || act.verb || act.target || act.description)) ||
      (act.kind === 'expression' && (!act.verb || act.actionId || act.description)) ||
      (act.kind === 'proposal' && (!act.description || act.actionId || act.verb || act.target)));
  if (invalidActShape) {
    components.act = outcome(
      false,
      'invalid-action-response',
      'The proposed action fields do not match its kind.',
    );
  } else if (act?.kind === 'known' && !Object.hasOwn(actions, act.actionId!)) {
    components.act = outcome(false, 'unoffered-action', 'The proposed action was not offered.');
  } else if (act?.kind === 'known') {
    const selected = actions[act.actionId!];
    if (input.entities[actorId]!.actor!.planGeneration !== expectedPlan)
      components.act = outcome(false, 'stale-plan', 'The current task changed.');
    else if (selected) command('act', { ...selected, actorId, id: `${id}:act` });
    else components.act = outcome(true, 'continued', 'Existing behavior continues.');
  } else if (act?.kind === 'expression') {
    const source = world.entities[actorId]!;
    const target = act.target ? world.entities[act.target] : undefined;
    const invalidTarget =
      !!act.target && (!permitted.has(act.target) || !Object.hasOwn(world.entities, act.target));
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
      !act.verb ||
      !Object.hasOwn(verbs, act.verb) ||
      invalidTarget ||
      !reachable ||
      (target &&
        (!hasLineOfSight(world, source.position, target.position) ||
          !canSee(source.position, target.position) ||
          (target.actor && !target.actor.alive)))
    )
      components.act = outcome(
        false,
        'invalid-expression',
        'The expression target is unavailable or out of reach.',
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
      components.act = outcome(
        true,
        'expressed',
        'Expression accepted without mechanical effects.',
      );
    }
  } else if (act?.kind === 'proposal') {
    components.act = outcome(
      false,
      'unsupported-action',
      'Unlisted action proposed; new mechanics require separate invention admission. Nothing was performed.',
    );
  }
  if (response.think) {
    const invalidReferences = response.think.about.some(
      (target) => !permitted.has(target) || !Object.hasOwn(world.entities, target),
    );
    if (
      !response.think.text.trim() ||
      response.think.text.length > 240 ||
      response.think.about.length > 8 ||
      invalidReferences
    )
      components.think = outcome(
        false,
        'invalid-thought',
        'The proposed thought exceeds its limits or references unavailable entities.',
      );
    else {
      appendMemory(world, actorId, {
        kind: 'episode',
        source: 'self_thought',
        summary: `I thought: ${response.think.text}`,
        entityIds: response.think.about,
        importance: 5,
        responseId: id,
      });
      components.think = outcome(true, 'thought', 'Private thought remembered.');
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
        : outcome(false, 'response-rejected', 'No response component was accepted.');
  const receipts = (world.responseReceipts ??= {});
  receipts[id] = { digest, components, outcome: overall };
  // This is only the recent in-state idempotency/debug window. Actor memories,
  // world events, durable jobs and conversation history keep their own retention.
  for (const oldId of Object.keys(receipts).slice(0, -RESPONSE_RECEIPT_LIMIT))
    delete receipts[oldId];
  return finish(world, events, overall);
}
