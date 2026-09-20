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
  const references = [
    response.talk?.addressee,
    ...(response.think?.about ?? []),
    ...(response.act?.kind === 'expression' ? [response.act.target] : []),
  ].filter((value): value is string => !!value);
  if (references.some((target) => !permitted.has(target) || !Object.hasOwn(input.entities, target)))
    return reject('Response contains an unknown or impermissible entity handle.');
  if (
    response.act?.kind === 'known' &&
    (!response.act.actionId || !Object.hasOwn(actions, response.act.actionId))
  )
    return reject('Response contains an unoffered action handle.');
  if (
    response.act &&
    ((response.act.kind === 'known' &&
      (!response.act.actionId ||
        response.act.verb ||
        response.act.target ||
        response.act.description)) ||
      (response.act.kind === 'expression' &&
        (!response.act.verb || response.act.actionId || response.act.description)) ||
      (response.act.kind === 'proposal' &&
        (!response.act.description ||
          response.act.actionId ||
          response.act.verb ||
          response.act.target)))
  )
    return reject('Response action fields do not match its kind.');
  if (
    (response.talk && (!response.talk.text.trim() || response.talk.text.length > 1200)) ||
    (response.think &&
      (!response.think.text.trim() ||
        response.think.text.length > 240 ||
        response.think.about.length > 8))
  )
    return reject('Response exceeds text limits.');
  let world = draftWorld(input);
  const events: Transition['events'] = [];
  const components: ResponseReceipt['components'] = {};
  const command = (part: 'talk' | 'act', value: Command) => {
    const transition = executeCommand(world, value);
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
  if (response.talk)
    command('talk', {
      id: `${id}:talk`,
      actorId,
      type: 'say',
      text: response.talk.text,
      targetId: response.talk.addressee,
    });
  const act = response.act;
  if (act?.kind === 'known') {
    const selected = actions[act.actionId!];
    if (world.entities[actorId]!.actor!.planGeneration !== expectedPlan)
      components.act = outcome(false, 'stale-plan', 'The current task changed.');
    else if (selected) command('act', { ...selected, actorId, id: `${id}:act` });
    else components.act = outcome(true, 'continued', 'Existing behavior continues.');
  } else if (act?.kind === 'expression') {
    const source = world.entities[actorId]!;
    const target = act.target ? world.entities[act.target] : undefined;
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
      !reachable ||
      (target &&
        (!canSee(source.position, target.position) || (target.actor && !target.actor.alive)))
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
