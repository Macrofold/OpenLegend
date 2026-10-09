import { activityCommandFields, isCookingInputField, cookingChoices } from '@open-legend/domain';
import { canonicalName } from '@open-legend/language';
import {
  accessiblePossession,
  clockDeadline,
  gatheringYield,
  inventoryFor,
  itemFor,
  ACTIVITY_LIMITS,
  bindActionInvocation,
  captureActionTargets,
  commitActorResponse,
  executeCommand,
  observeActor,
  observerDescription,
  portableItems,
  possessionItems,
  refuseAction,
  subjectReferenceCurrent,
  namedClockTimes,
  producedItemDefinition,
  typedRequestVocabulary,
  type TypedRequestVocabulary,
  unmetSlots,
  FOLLOW_RULES,
  type ActionFulfillment,
  type ActionInvocation,
  type ActivityArgument,
  type ActivityBinding,
  type ActivityNode,
  type ActionResolution,
  type AttemptBinding,
  type Command,
  type Entity,
  type IntentSlots,
  type ItemInstance,
  type ResolutionCategory,
  type WorldState,
} from '@open-legend/domain';
import type { ApiResult } from '@open-legend/protocol';
import { actionResponse } from './action-response.js';
import type { JobRecord } from './store.js';
import type { WorldService } from './world-service.js';

/** Slot references are the actor's visible surroundings, own accessible possessions or
 * items lying in a visible pile; names never stand in for them. */
export function actionReferencePermitted(
  world: WorldState,
  actorId: string,
  visibleIds: readonly string[],
  id: string,
): boolean {
  if (id === actorId || visibleIds.includes(id)) return true;
  if (!Object.hasOwn(world.entities, id)) return false;
  if (accessiblePossession(world, actorId, id)) return true;
  const placement = world.entities[id]!.placement;
  return (
    placement?.mode === 'contained' &&
    visibleIds.includes(placement.parentEntityId) &&
    world.entities[placement.parentEntityId]?.kind === 'item-pile'
  );
}
/** Typed commands the player or a character can issue without a model or a suggestion
 * list. A recognized form either binds native commands or returns a plain reason; it
 * never strips a qualifier to force a match. Unrecognized text returns undefined.
 * docs/action-capabilities.md#71-cheap-paths-and-model-use
 */
export interface TypedActionRequest {
  text: string;
  targetId: string | null;
  slots: IntentSlots | null;
}

/** Plain summary for callers that cannot interpret free text (no provider allowance). Clock
 * names come from the world; the forms are the engine's native families. */
export function typedActionForms(world: WorldState): string {
  const times = namedClockTimes(world).join('|');
  const until = times ? ` [until ${times}]` : '';
  return `Typed actions that need no AI: go to X, Z; move N m forward/back/left/right; go to NAME; go to where I last saw NAME; follow NAME [behind|beside|on the left|on the right] [at N m]${until} [and go to where I last saw them]; pick up [N|all] ITEM; drop [N|all] ITEM; gather RESOURCE [until I have N${times ? `|until ${times}` : ''}]; gather N RESOURCE; cook ITEM [at NAME]; eat [N] FOOD; equip ITEM; wait N minutes${times ? `|until ${times}` : ''}; ${times ? `stay by NAME until ${times}; ` : ''}A then B; stop.`;
}
/** A regex group matching one of this world's clock names; never matches when it names none. */
function untilGroup(world: WorldState): string {
  const names = namedClockTimes(world).map((name) => name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'));
  return names.length ? `(${names.join('|')})` : '((?!))';
}

const POSSESSION_SCAN = 256;
const NUMBERS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};
const clean = (text: string) =>
  text
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .replace(/\s+/gu, ' ')
    .replace(/[.!]+$/u, '')
    .trim();
const bare = (name: string) =>
  canonicalName(clean(name)).replace(/^(?:my|this|that|these|those|some|your)\s+/u, '');
/** Tolerate simple English plurals; this is matching, not semantic interpretation. */
const forms = (name: string) => {
  const word = bare(name);
  return new Set([
    word,
    word.replace(/ies$/u, 'y'),
    word.replace(/ves$/u, 'fe'),
    word.replace(/ves$/u, 'f'),
    word.replace(/es$/u, ''),
    word.replace(/s$/u, ''),
  ]);
};
const sameName = (a: string, b: string) => {
  const left = forms(a);
  return [...forms(b)].some((form) => left.has(form));
};
/** 2: a full name or definition id ("wood"); 1: only the head noun ("Small stone" →
 * "stone"); 0: no match. Callers keep the best level, so a full name beats a head noun. */
const matchLevel = (names: string[], wanted: string) =>
  names.some((name) => sameName(name, wanted))
    ? 2
    : names.some((name) => sameName(bare(name).split(' ').at(-1) ?? '', wanted))
      ? 1
      : 0;
function best<T>(entries: { value: T; level: number }[]): T[] {
  const top = Math.max(0, ...entries.map((entry) => entry.level));
  return top ? entries.filter((entry) => entry.level === top).map((entry) => entry.value) : [];
}
function itemNames(world: WorldState, definitionId: string): string[] {
  return [world.itemDefinitions[definitionId]?.name ?? '', definitionId.replace(/_/gu, ' ')];
}
const quantityWord = (word: string | undefined): number | 'all' | undefined => {
  if (!word) return undefined;
  if (['all', 'every', 'everything'].includes(word)) return 'all';
  if (/^\d+$/u.test(word)) return Number(word);
  return NUMBERS[word];
};
/** Words for "whatever is there", never the name of one kind of item. */
const GENERIC_ITEMS = new Set(['items', 'pile', 'everything', 'things', 'stuff']);
/** "The item": one unnamed stack, meaningful only when exactly one is possible. */
const SINGLE_ITEM = new Set(['item', 'thing', 'stack']);
const DEICTIC = new Set(['it', 'this', 'that', 'them', 'him', 'her', 'there']);
const PRONOUNS = new Set([
  'it',
  'them',
  'one',
  'one of them',
  'some',
  'some of them',
  'that',
  'those',
]);

interface Scope {
  world: WorldState;
  actorId: string;
  request: TypedActionRequest;
  localId: string;
  visible: Entity[];
  builder: Builder;
  /** The world's words for its things and requests (worlds/base/typed-requests.ts). */
  vocabulary: TypedRequestVocabulary;
  /** Regex group for this world's clock names. */
  until: string;
  /** How this clause may use the chosen item detail. 'names': only when the clause names
   * that item (used to find which clause owns it); 'owned': another clause of "A then B"
   * names it, so generic words here ("the item") keep their own meaning. */
  itemDetail?: 'names' | 'owned';
  /** Set for each clause of "A then B": the selection may belong to another clause. */
  sequence?: boolean;
}
type Omitted = ActionFulfillment['omitted'];
/** confirm: a central clause was dropped, so the initiator must accept the revision. */
type Plain = { commands: Command[]; description: string; omitted?: Omitted; confirm?: boolean };
type Composed = { root: ActivityNode; description: string; omitted?: Omitted; confirm?: boolean };
type Outcome = Plain | Composed | { refuse: [ResolutionCategory, string, string[]] };

const PERSONAL_FIELDS = new Set([
  'targetId',
  'intendedRecipientId',
  'itemId',
  'weaponItemId',
  'ammoItemId',
  'heatId',
  'destination',
  'text',
]);
/** Builds one requested activity: unique step keys, private role bindings and the actual
 * outputs earlier steps will commit, so later steps bind real results, never guessed IDs. */
class Builder {
  readonly bindings: Record<string, ActivityBinding> = {};
  /** Things a clause is about that its native step does not name, e.g. where a walk goes. */
  readonly subjects = new Set<string>();
  readonly produced: { key: string; definitionId: string }[] = [];
  private keys = 0;
  key(): string {
    return `step${++this.keys}`;
  }
  role(value: ActivityBinding): string {
    const text = JSON.stringify(value);
    const found = Object.entries(this.bindings).find(([, bound]) => JSON.stringify(bound) === text);
    if (found) return found[0];
    const role = `role${Object.keys(this.bindings).length + 1}`;
    this.bindings[role] = value;
    return role;
  }
  invoke(command: Command, name: string, produces?: string): ActivityNode {
    const args: Record<string, ActivityArgument> = {};
    for (const [field, value] of Object.entries(activityCommandFields(command))) {
      if (['id', 'actorId', 'type', 'purpose'].includes(field) || value === undefined) continue;
      args[field] =
        PERSONAL_FIELDS.has(field) || isCookingInputField(field)
          ? { role: this.role(value as ActivityBinding) }
          : { literal: value as string | number | boolean };
    }
    const key = this.key();
    if (produces) this.produced.push({ key, definitionId: produces });
    return {
      kind: 'invoke',
      key,
      name: name.slice(0, 120),
      command: command.type,
      args,
      ...(produces ? { outputs: [{ port: produces, definitionId: produces, quantity: 1 }] } : {}),
    };
  }
}
/** What a native command commits as its output port, when a later step may use it. */
const producedDefinition = producedItemDefinition;

const capitalized = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
function refuse(category: ResolutionCategory, reason: string, depends: string[] = []): Outcome {
  return { refuse: [category, reason, depends] };
}
function named(scope: Scope, id: string): string {
  return observerDescription(scope.world, scope.actorId, id);
}
/** Visible things matching a spoken name. A lone request must use its selection. In "A then B"
 * a selection limits only the steps whose words it answers, and parse() and commit refuse a
 * sequence in which no step uses it, so a selected fire never hides the fiber another step
 * gathers. */
function visibleMatches(scope: Scope, name: string, accept: (entity: Entity) => boolean) {
  const target = scope.request.targetId ?? undefined;
  const wanted = bare(name);
  const rank = (entities: Entity[]) =>
    best(
      entities.map((entity) => ({
        value: entity,
        level:
          (target === entity.id && (DEICTIC.has(wanted) || wanted.startsWith('this '))) ||
          entity.id === name.trim()
            ? 3
            : Math.max(
                // Observer descriptions only: a person's name counts once this observer knows it.
                matchLevel([named(scope, entity.id)], wanted),
                // Any visible heat source answers to the world's words for one ("fire").
                entity.heat && scope.vocabulary.heatSources.includes(wanted) ? 2 : 0,
                entity.resource
                  ? matchLevel(itemNames(scope.world, entity.resource.definitionId), wanted)
                  : 0,
              ),
      })),
    );
  const candidates = scope.visible.filter(accept);
  if (!target) return rank(candidates);
  const selected = rank(candidates.filter((entity) => entity.id === target));
  if (selected.length || !scope.sequence) return selected;
  // A selection that answers the words but cannot take this step (a dead hare to follow)
  // still limits it, so the step is refused rather than quietly using another hare.
  return fitsSelection(scope, name) ? [] : rank(candidates);
}
/** Whether the selection answers the words, whatever the step's own filter. */
function fitsSelection(scope: Scope, name: string): boolean {
  return (
    !!scope.request.targetId &&
    visibleMatches({ ...scope, sequence: undefined }, name, () => true).length > 0
  );
}
/** A request limited to a selection that cannot serve it says why, instead of claiming that
 * nothing matching is in view: the selection answers the words but cannot take this action
 * (a dead hare to follow), or it is not what the words name. */
function selectionMismatch(scope: Scope, name: string, unable: string): Outcome {
  const target = scope.request.targetId!;
  return refuse(
    'needs_clarification',
    fitsSelection(scope, name)
      ? `${capitalized(named(scope, target))} cannot be ${unable}; select something else, or clear the selection.`
      : `${capitalized(named(scope, target))} does not match "${bare(name)}"; select a match, or clear the selection.`,
    [target],
  );
}
/** Why a named thing matched nothing: the selection excluded it, or it is not in view. */
function noMatch(
  scope: Scope,
  name: string,
  accept: (entity: Entity) => boolean,
  absent: string,
  unable: string,
): Outcome | undefined {
  const unselected = { ...scope, request: { ...scope.request, targetId: null } };
  if (
    scope.request.targetId &&
    (fitsSelection(scope, name) || visibleMatches(unselected, name, accept).length)
  )
    return selectionMismatch(scope, name, unable);
  return knownNoun(scope, name) ? refuse('blocked', absent, ['@visible']) : undefined;
}
/** Unknown words are left to interpretation; only a known kind of thing that is absent
 * earns a plain "not here" refusal. The vocabulary is public (item definitions, body kinds,
 * this actor's own observations), never a scan of hidden entities. */
function knownNoun(scope: Scope, name: string): boolean {
  const wanted = bare(name);
  // Pile and item words are the engine's own; things and creatures are the world's words.
  if (['pile', 'item', 'items'].includes(wanted)) return true;
  if (
    [...scope.vocabulary.heatSources, ...scope.vocabulary.beings].some((kind) =>
      sameName(kind, wanted),
    )
  )
    return true;
  if (
    Object.keys(scope.world.itemDefinitions).some(
      (id) => matchLevel(itemNames(scope.world, id), wanted) > 0,
    )
  )
    return true;
  if (scope.visible.some((entity) => matchLevel([named(scope, entity.id)], wanted) > 0))
    return true;
  const places = scope.world.entities[scope.actorId]?.actor?.agency.places ?? [];
  return places.some((place) => matchLevel([place.label], wanted) > 0);
}
/** A chosen item slot applies to the clause that names it (or says "it"); another clause
 * keeps its own words, and the final slot check reports any disagreement for review. */
function slotItemFor(scope: Scope, name: string): string | undefined {
  const id = scope.request.slots?.itemId;
  const item = id ? itemFor(scope.world, id) : undefined;
  if (!item) return undefined;
  // "2 of them" leaves "of them" after the amount; the partitive still means the chosen item.
  const wanted = bare(name).replace(/^of /u, '');
  if (matchLevel(itemNames(scope.world, item.definitionId), wanted) > 0) return item.id;
  if (scope.itemDetail === 'names') return undefined;
  return DEICTIC.has(wanted) ||
    PRONOUNS.has(wanted) ||
    (scope.itemDetail !== 'owned' && (GENERIC_ITEMS.has(wanted) || SINGLE_ITEM.has(wanted)))
    ? item.id
    : undefined;
}
function definitionName(world: WorldState, item: ItemInstance): string {
  return world.itemDefinitions[item.definitionId]?.name ?? item.definitionId;
}
function possessions(scope: Scope, name: string): ItemInstance[] | 'too-many' {
  const matches: { value: ItemInstance; level: number }[] = [];
  const chosen = slotItemFor(scope, name);
  let scanned = 0;
  for (const item of possessionItems(scope.world, scope.actorId)) {
    if (++scanned > POSSESSION_SCAN) return 'too-many';
    matches.push({
      value: item,
      level: chosen
        ? Number(item.id === chosen) * 3
        : matchLevel(itemNames(scope.world, item.definitionId), name),
    });
  }
  return best(matches);
}

const invocation = (fields: Partial<ActionInvocation>): ActionInvocation => ({
  family: 'move',
  x: null,
  z: null,
  surfaceId: null,
  frame: null,
  place: null,
  targetEntityId: null,
  distance: null,
  relation: null,
  onLost: null,
  until: null,
  itemId: null,
  quantity: null,
  ...fields,
});
function bind(scope: Scope, fields: Partial<ActionInvocation>, depends: string[] = []) {
  const bound = bindActionInvocation(
    scope.world,
    scope.actorId,
    scope.localId,
    invocation(fields),
    [scope.actorId, ...scope.visible.map((e) => e.id)],
  );
  return 'ok' in bound
    ? refuse(
        ['ambiguous-destination', 'invalid-invocation'].includes(bound.code)
          ? 'needs_clarification'
          : 'blocked',
        bound.code === 'invalid-invocation'
          ? `That request is outside what moving or following allows (distance ${FOLLOW_RULES.minimumDistance}–${FOLLOW_RULES.maximumDistance} m, offsets up to 50 m).`
          : bound.message,
        depends,
      )
    : bound;
}
const at = (point: { x: number; z: number }) =>
  `x=${Number(point.x.toFixed(1))}, z=${Number(point.z.toFixed(1))}`;

/** Suffix and prefix clauses, stripped in any order; the rest names the target. */
function follow(scope: Scope, rest: string): Outcome | undefined {
  let name = rest;
  let distance: number | null = null;
  let relation: ActionInvocation['relation'] = null;
  let onLost: ActionInvocation['onLost'] = null;
  let until: string | null = null;
  const clauses: [RegExp, (match: RegExpExecArray) => void][] = [
    [new RegExp(` until ${scope.until}$`, 'u'), (m) => (until = m[1]!)],
    [
      /,? (?:and )?(?:if (?:i|you) lose (?:sight of )?(?:him|her|them|it),? )?(?:go|head|return|walk) (?:back )?to where (?:i|you) last saw (?:him|her|them|it)$/u,
      () => (onLost = 'last-seen'),
    ],
    [
      /,? (?:and )?stop if (?:i|you) lose (?:sight of )?(?:him|her|them|it)$/u,
      () => (onLost = 'stop'),
    ],
    [
      / at (\d+(?:\.\d+)?) ?(?:m|metres|meters|units|world units)?$/u,
      (m) => (distance = Number(m[1])),
    ],
    [/,? (?:staying |keeping )?(?:behind)$/u, () => (relation = 'behind')],
    [
      /,? (?:staying |keeping )?(?:beside|alongside|next to (?:him|her|them|it))$/u,
      () => (relation = 'beside'),
    ],
    [
      /,? (?:staying |keeping )?(?:on|to) (?:the |my |their |his |her |its )?(left|right)(?: side)?$/u,
      (m) => (relation = m[1] as 'left' | 'right'),
    ],
  ];
  for (let changed = true; changed; ) {
    changed = false;
    for (const [pattern, apply] of clauses) {
      const match = pattern.exec(name);
      if (match) {
        apply(match);
        name = name.slice(0, match.index).trim();
        changed = true;
      }
    }
    const prefix = /^(behind|beside|alongside) (.+)$/u.exec(name);
    if (prefix) {
      relation = prefix[1] === 'behind' ? 'behind' : 'beside';
      name = prefix[2]!;
      changed = true;
    }
  }
  until ??= scope.request.slots?.until ?? null;
  const alive = (e: Entity) => !!e.actor?.alive && e.id !== scope.actorId;
  const matches = visibleMatches(scope, name, alive);
  if (matches.length !== 1)
    return matches.length
      ? refuse(
          'needs_clarification',
          `More than one visible being matches "${bare(name)}"; select the one to follow.`,
          matches.map((e) => e.id),
        )
      : noMatch(
          scope,
          name,
          alive,
          `No living being called "${bare(name)}" is in view to follow.`,
          'followed',
        );
  const target = matches[0]!;
  const bound = bind(
    scope,
    { family: 'follow', targetEntityId: target.id, distance, relation, onLost, until },
    [target.id],
  );
  if ('refuse' in bound) return bound;
  const command = bound as Extract<Command, { type: 'follow' }>;
  const words = {
    near: '',
    behind: ' behind them (in the direction you see them travel; near them until they move)',
    beside:
      ' beside them (relative to the direction you see them travel; near them until they move)',
    left: ' on their left (relative to the direction you see them travel; near them until they move)',
    right:
      ' on their right (relative to the direction you see them travel; near them until they move)',
  };
  return {
    commands: [command],
    description: `Follow ${named(scope, target.id)} at ${command.distance ?? FOLLOW_RULES.defaultDistance} m${words[command.relation ?? 'near']}${command.until !== undefined ? ` until ${until}` : ' until stopped'}. ${command.onLost ? 'If you lose sight of them, walk to where you last saw them and stop there unless you see them again.' : 'Stops if you lose sight of them.'}`,
  };
}

const DIRECTIONS: Record<string, { x: number; z: number }> = {
  forward: { x: 0, z: 1 },
  forwards: { x: 0, z: 1 },
  ahead: { x: 0, z: 1 },
  back: { x: 0, z: -1 },
  backward: { x: 0, z: -1 },
  backwards: { x: 0, z: -1 },
  left: { x: -1, z: 0 },
  right: { x: 1, z: 0 },
};
/** "move 3 m left and 2 forward": offsets in the actor's own facing, never the camera's. */
function offset(scope: Scope, text: string): Outcome | undefined {
  const part =
    '(?:(\\d+(?:\\.\\d+)?) ?(?:m|metres|meters|steps|units)? )?(forwards?|ahead|backwards?|back|left|right)';
  const match = new RegExp(
    `^(?:go|move|walk|step|run) ${part}(?: (?:and|then) ${part})?$`,
    'u',
  ).exec(text);
  if (!match) return undefined;
  const stepping = text.startsWith('step');
  let x = 0,
    z = 0;
  for (const [amount, direction] of [
    [match[1], match[2]],
    [match[3], match[4]],
  ] as const) {
    if (!direction) continue;
    if (amount === undefined && !stepping)
      return refuse('needs_clarification', 'Say how far, for example "move 3 m left".');
    const metres = amount === undefined ? 1 : Number(amount);
    x += DIRECTIONS[direction]!.x * metres;
    z += DIRECTIONS[direction]!.z * metres;
  }
  const bound = bind(scope, { family: 'move', frame: 'actor', x, z });
  if ('refuse' in bound) return bound;
  const destination = (bound as Extract<Command, { type: 'move' }>).destination;
  return {
    commands: [bound as Command],
    description: `Walk ${[x ? `${Math.abs(x)} m ${x > 0 ? 'right' : 'left'}` : '', z ? `${Math.abs(z)} m ${z > 0 ? 'forward' : 'back'}` : ''].filter(Boolean).join(' and ')} of your current facing, to ${at(destination)}.`,
  };
}

/** "go where I last saw the deer": the actor's own recorded sighting, matched by how it was
 * described then. A visible thing counts as that subject only when recognition holds, so a
 * new encounter never reveals that it is the same entity. */
function lastSeen(scope: Scope, name: string): Outcome | undefined {
  const actor = scope.world.entities[scope.actorId]!.actor!;
  const wanted = bare(name);
  const matches = best(
    (actor.agency.places ?? []).map((place) => ({
      value: place.subjectId,
      level:
        // A selected entity names a remembered sighting only in the same encounter.
        scope.request.targetId === place.subjectId &&
        DEICTIC.has(wanted) &&
        subjectReferenceCurrent(scope.world, scope.actorId, place.subjectId, place.episode)
          ? 3
          : matchLevel([place.label], wanted),
    })),
  );
  if (matches.length !== 1)
    return matches.length
      ? refuse(
          'needs_clarification',
          `More than one remembered sighting matches "${wanted}"; select the one you mean.`,
          matches,
        )
      : knownNoun(scope, name)
        ? refuse('blocked', `There is no remembered sighting of "${wanted}" to return to.`, [])
        : undefined;
  const place = actor.agency.places!.find((p) => p.subjectId === matches[0])!;
  // Only the same encounter (or recognition) still seen now is approached where it is; any
  // other case walks to this record's own point, never to a hidden entity's current place.
  const stillSeen =
    scope.visible.some((entity) => entity.id === place.subjectId) &&
    subjectReferenceCurrent(scope.world, scope.actorId, place.subjectId, place.episode);
  // A lone request must use its selection, as for "go to NAME". Only a subject still seen in
  // the same encounter is compared or recorded as what the walk is about; a walk to an old
  // point names only a place, as in a sequence.
  const target = scope.request.targetId;
  if (stillSeen && target && !scope.sequence && target !== place.subjectId)
    return refuse(
      'needs_clarification',
      `${capitalized(named(scope, target))} is not the one you last saw (${place.label}); select that one, or clear the selection.`,
      [target],
    );
  if (stillSeen) scope.builder.subjects.add(place.subjectId);
  const bound: Command | Outcome = stillSeen
    ? bind(scope, { family: 'move', place: 'target', targetEntityId: place.subjectId })
    : {
        id: scope.localId,
        actorId: scope.actorId,
        type: 'move',
        destination: { ...place.point },
      };
  if ('refuse' in bound) return bound;
  const destination = (bound as Extract<Command, { type: 'move' }>).destination;
  return {
    commands: [bound as Command],
    description: stillSeen
      ? `Walk to ${place.label}, which is still in view (${at(destination)}). This does not track it.`
      : `Walk to where you last saw ${place.label} (${at(destination)}, ${Math.round((scope.world.simTime - place.at) / 60)} min ago). This does not track it.`,
  };
}

/** "go to the fire": a reachable stance near a visible thing's current position. */
function approach(scope: Scope, name: string): Outcome | undefined {
  const other = (e: Entity) => e.id !== scope.actorId;
  const matches = visibleMatches(scope, name, other);
  if (matches.length !== 1)
    return matches.length
      ? refuse(
          'needs_clarification',
          `More than one visible thing matches "${bare(name)}"; select the one to go to.`,
          matches.map((e) => e.id),
        )
      : noMatch(
          scope,
          name,
          other,
          `Nothing called "${bare(name)}" is in view to go to.`,
          'walked to',
        );
  scope.builder.subjects.add(matches[0]!.id);
  const bound = bind(scope, { family: 'move', place: 'target', targetEntityId: matches[0]!.id }, [
    matches[0]!.id,
  ]);
  if ('refuse' in bound) return bound;
  return {
    commands: [bound as Command],
    description: `Walk near ${named(scope, matches[0]!.id)}'s current position; this does not follow later movement.`,
  };
}

function pickup(
  scope: Scope,
  quantity: number | 'all' | undefined,
  name: string,
): Outcome | undefined {
  const piles = scope.visible.filter((e) => e.kind === 'item-pile');
  // As in visibleMatches: a lone request must use its selection; in "A then B" a selected
  // pile limits only the steps whose words it answers.
  const target = scope.request.targetId;
  const selectedPiles = target ? piles.filter((pile) => pile.id === target) : piles;
  const source = scope.sequence && !selectedPiles.length ? piles : selectedPiles;
  // "pick up (all) the items" means the whole pile and "the item" its only stack, never a
  // stack named "items". A chosen item detail decides instead only when it lies in the pile.
  let chosen = slotItemFor(scope, name);
  const word = bare(name);
  const generic = GENERIC_ITEMS.has(word) || SINGLE_ITEM.has(word);
  if (generic)
    chosen =
      chosen &&
      source.some((pile) => portableItems(scope.world, pile.id).some((item) => item.id === chosen))
        ? chosen
        : undefined;
  if (generic && !chosen) {
    if (source.length !== 1)
      return source.length
        ? refuse('needs_clarification', 'More than one pile is in view; select the pile.', [
            '@visible',
          ])
        : target && piles.length
          ? selectionMismatch(scope, name, 'picked up from')
          : refuse('blocked', 'No pile of items is in view to pick up from.', ['@visible']);
    const pile = source[0]!;
    const stacks = portableItems(scope.world, pile.id);
    // "every item" still means all of them; only a bare "the item" names one stack.
    if (SINGLE_ITEM.has(word) && quantity !== 'all') {
      if (stacks.length !== 1)
        return refuse(
          'needs_clarification',
          'That pile holds several stacks; select the one you mean.',
          [pile.id],
        );
      chosen = stacks[0]!.id;
    } else if (typeof quantity === 'number')
      return refuse('needs_clarification', `Select the stack to take ${quantity} from.`, [pile.id]);
    else
      return {
        commands: [
          { id: scope.localId, actorId: scope.actorId, type: 'pickup', targetId: pile.id },
        ],
        description: `Pick up everything portable from ${named(scope, pile.id)}.`,
      };
  }
  const find = (within: Entity[]) =>
    best(
      within.flatMap((pile) =>
        portableItems(scope.world, pile.id).map((item) => ({
          value: { pile, item },
          level: chosen
            ? Number(item.id === chosen) * 3
            : matchLevel(itemNames(scope.world, item.definitionId), name),
        })),
      ),
    );
  let found = find(source);
  const elsewhere = found.length || source === piles ? [] : find(piles);
  if (elsewhere.length) {
    // A selected pile can be picked up from; it just does not hold what was asked for.
    if (!scope.sequence)
      return source.length
        ? refuse(
            'needs_clarification',
            `${capitalized(named(scope, source[0]!.id))} does not hold ${definitionName(scope.world, elsewhere[0]!.item)}; select the pile it lies in, or clear the selection.`,
            [source[0]!.id],
          )
        : selectionMismatch(scope, name, 'picked up from');
    found = elsewhere;
  }
  if (!found.length)
    return knownNoun(scope, name)
      ? refuse('blocked', `No ${bare(name)} lies in a visible pile within view.`, [
          '@visible',
          ...source.map((pile) => pile.id),
        ])
      : undefined;
  const piled = new Set(found.map((entry) => entry.pile.id));
  if (piled.size > 1)
    return refuse(
      'needs_clarification',
      `${bare(name)} lies in more than one pile; select the pile to pick up from.`,
      [...piled],
    );
  const pile = found[0]!.pile;
  if (quantity === 'all' || found.length > 1) {
    if (typeof quantity === 'number')
      return refuse(
        'needs_clarification',
        `That pile holds ${found.length} separate stacks of ${bare(name)}; pick up all of them or select one stack.`,
        [pile.id],
      );
    return {
      commands: found.map(({ item }, index) => ({
        id: `${scope.localId}:${index}`,
        actorId: scope.actorId,
        type: 'pickup',
        targetId: pile.id,
        itemId: item.id,
      })),
      description: `Pick up all ${bare(name)} from the pile.`,
    };
  }
  const item = found[0]!.item;
  if (typeof quantity === 'number' && quantity > item.quantity)
    return refuse(
      'blocked',
      `Only ${item.quantity} ${definitionName(scope.world, item)} lie in that pile.`,
      [pile.id],
    );
  // A stated amount is kept even when it is the whole stack: it is exactly what was asked,
  // and the pickup takes no more if the stack grows before the step starts.
  const part = typeof quantity === 'number' ? quantity : undefined;
  return {
    commands: [
      {
        id: scope.localId,
        actorId: scope.actorId,
        type: 'pickup',
        targetId: pile.id,
        itemId: item.id,
        ...(part !== undefined ? { quantity: part } : {}),
      },
    ],
    description: `Pick up ${part ?? item.quantity} ${definitionName(scope.world, item)} from the pile${part !== undefined && part < item.quantity ? `, leaving ${item.quantity - part}` : ''}.`,
  };
}

function carried(scope: Scope, name: string): ItemInstance | Outcome | undefined {
  const matches = possessions(scope, name);
  if (matches === 'too-many')
    return refuse(
      'needs_clarification',
      `Too many possessions to search by name; select the ${bare(name)} directly.`,
    );
  if (!matches.length)
    return knownNoun(scope, name) && !GENERIC_ITEMS.has(bare(name)) && !SINGLE_ITEM.has(bare(name))
      ? refuse('blocked', `You are not carrying any ${bare(name)}.`)
      : undefined;
  if (matches.length > 1 && new Set(matches.map((item) => item.definitionId)).size > 1)
    return refuse(
      'needs_clarification',
      `Several different possessions match "${bare(name)}"; select the one you mean.`,
    );
  return matches[0]!;
}

function drop(
  scope: Scope,
  quantity: number | 'all' | undefined,
  name: string,
): Outcome | undefined {
  const item = carried(scope, name);
  if (!item || !('id' in item)) return item;
  const amount = quantity === 'all' || quantity === undefined ? item.quantity : quantity;
  if (amount > item.quantity)
    return refuse(
      'blocked',
      `You carry only ${item.quantity} ${definitionName(scope.world, item)} in that stack.`,
      [item.id],
    );
  return {
    commands: [
      {
        id: scope.localId,
        actorId: scope.actorId,
        type: 'drop',
        itemId: item.id,
        quantity: amount,
      },
    ],
    description: `Drop ${amount} ${definitionName(scope.world, item)} on the ground.`,
  };
}

function gather(scope: Scope, name: string): Outcome | undefined {
  const source = (e: Entity) => !!e.resource;
  const matches = visibleMatches(scope, name, source);
  if (!matches.length)
    return noMatch(scope, name, source, `No ${bare(name)} to gather is in view.`, 'gathered from');
  const here = scope.world.entities[scope.actorId]!;
  // Declared metric: straight-line distance among visible sources, preferring ones that do
  // not visibly look depleted (depletion is an outward, perceived feature).
  const nearest = [...matches].sort(
    (a, b) =>
      Number((b.resource?.quantity ?? 0) > 0) - Number((a.resource?.quantity ?? 0) > 0) ||
      distanceBetween(here, a) - distanceBetween(here, b) ||
      a.id.localeCompare(b.id),
  )[0]!;
  return {
    commands: [{ id: scope.localId, actorId: scope.actorId, type: 'gather', targetId: nearest.id }],
    description: `Gather once from the nearest visible ${named(scope, nearest.id)}.`,
  };
}
function distanceBetween(a: Entity, b: Entity): number {
  const p = a.placement?.mode === 'world' ? a.placement.position : undefined;
  const q = b.placement?.mode === 'world' ? b.placement.position : undefined;
  return p && q ? Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) : Infinity;
}

/** In a sequence, "eat it" binds the actual output an earlier step commits, never a guessed
 * item. The output must exist at dispatch or the activity stops honestly. */
function fromEarlier(scope: Scope, name: string, type: 'eat' | 'equip'): Composed | undefined {
  const wanted = bare(name);
  const earlier = [...scope.builder.produced]
    .reverse()
    .find(
      (entry) =>
        PRONOUNS.has(wanted) ||
        PRONOUNS.has(clean(name)) ||
        matchLevel(itemNames(scope.world, entry.definitionId), wanted) > 0,
    );
  if (!earlier) return undefined;
  const label = scope.world.itemDefinitions[earlier.definitionId]?.name ?? earlier.definitionId;
  return {
    root: {
      kind: 'invoke',
      key: scope.builder.key(),
      name: `${type === 'eat' ? 'Eat' : 'Equip'} the ${label} produced earlier`.slice(0, 120),
      command: type,
      args: { itemId: { output: earlier.key, port: earlier.definitionId, quantity: 1 } },
    },
    description: `${type === 'eat' ? 'Eat one' : 'Equip the'} ${label} the earlier step actually produces.`,
  };
}

function eat(
  scope: Scope,
  quantity: number | 'all' | undefined,
  name: string,
): Outcome | undefined {
  if ((quantity ?? 1) === 1 && scope.builder.produced.length) {
    const later = fromEarlier(scope, name, 'eat');
    if (later) return later;
  }
  const item = carried(scope, name);
  if (!item || !('id' in item)) return item;
  const count = quantity === 'all' ? item.quantity : (quantity ?? 1);
  if (count > 8) return refuse('needs_clarification', 'Choose at most eight servings at once.');
  if (count > item.quantity)
    return refuse(
      'blocked',
      `You carry only ${item.quantity} ${definitionName(scope.world, item)}.`,
      [item.id],
    );
  return {
    commands: Array.from({ length: count }, (_, index) => ({
      id: `${scope.localId}:${index}`,
      actorId: scope.actorId,
      type: 'eat' as const,
      itemId: item.id,
    })),
    description: `Eat ${count} ${definitionName(scope.world, item)}.`,
  };
}

function equip(scope: Scope, name: string): Outcome | undefined {
  const later = scope.builder.produced.length ? fromEarlier(scope, name, 'equip') : undefined;
  if (later) return later;
  const item = carried(scope, name);
  if (!item || !('id' in item)) return item;
  return {
    commands: [{ id: scope.localId, actorId: scope.actorId, type: 'equip', itemId: item.id }],
    description: `Equip ${definitionName(scope.world, item)}.`,
  };
}

function heldCount(scope: Scope, definitionId: string): number {
  let held = 0,
    scanned = 0;
  for (const item of possessionItems(scope.world, scope.actorId)) {
    if (++scanned > POSSESSION_SCAN) break;
    if (item.definitionId === definitionId) held += item.quantity;
  }
  return held;
}

/** "gather RESOURCE until I have 6" / "gather 4 RESOURCE" / "gather RESOURCE until TIME": a bounded repeat
 * of one native gather with a registered stopping condition. The condition stops the
 * repetition; it never authorizes other ways of getting the material. */
function gatherUntil(
  scope: Scope,
  name: string,
  stop: { held: number; disclosed?: string } | { until: string },
): Outcome | undefined {
  const single = gather(scope, name);
  if (!single || !('commands' in single)) return single;
  const command = single.commands[0] as Extract<Command, { type: 'gather' | 'harvest' }>;
  const source = scope.world.entities[command.targetId]!;
  const definitionId = source.resource!.definitionId;
  const label = scope.world.itemDefinitions[definitionId]?.name ?? definitionId;
  // The same carried-tool rule the native gather uses at completion.
  const perAttempt = gatheringYield(
    inventoryFor(scope.world, scope.actorId).map(
      (item) => scope.world.itemDefinitions[item.definitionId],
    ),
    definitionId,
  );
  const body = scope.builder.invoke(
    command,
    `Gather from ${named(scope, source.id)}`,
    definitionId,
  );
  if ('held' in stop) {
    const held = heldCount(scope, definitionId);
    if (held >= stop.held)
      return refuse('blocked', `You already carry ${held} ${label}; nothing to gather.`, [
        source.id,
      ]);
    const attempts = Math.ceil((stop.held - held) / perAttempt);
    if (attempts > ACTIVITY_LIMITS.iterations)
      return refuse(
        'needs_clarification',
        `That needs about ${attempts} gathering attempts; one activity allows at most ${ACTIVITY_LIMITS.iterations}. Ask for a smaller amount.`,
        [source.id],
      );
    return {
      root: {
        kind: 'repeat',
        name: `Gather ${label} until carrying ${stop.held}`.slice(0, 120),
        until: { test: 'holding', definitionId, quantity: stop.held },
        maximum: attempts,
        body,
      },
      description: `Gather from the nearest visible ${named(scope, source.id)} until you carry ${stop.held} ${label} (about ${attempts} attempts of up to ${perAttempt}; it stops if the source runs out or the limit is reached).${stop.disclosed ? ` ${stop.disclosed}` : ''}`,
    };
  }
  const deadline = clockDeadline(scope.world, stop.until);
  if (deadline === undefined) return unnamedTime();
  return {
    root: {
      kind: 'repeat',
      name: `Gather ${label} until ${stop.until}`.slice(0, 120),
      until: { test: 'time', at: deadline },
      maximum: ACTIVITY_LIMITS.iterations,
      body,
    },
    description: `Gather from the nearest visible ${named(scope, source.id)} repeatedly until ${stop.until}, at most ${ACTIVITY_LIMITS.iterations} attempts; it stops earlier if the source runs out.`,
  };
}

const unnamedTime = () =>
  refuse('needs_clarification', 'That stopping time is not one this world names.');
function waitNode(scope: Scope, at: number, label: string): ActivityNode {
  return {
    kind: 'wait',
    name: `Wait until ${label}`.slice(0, 120),
    until: { test: 'time', at },
    seconds: Math.max(1, at - scope.world.simTime),
  };
}
/** "wait until TIME" / "wait 30 minutes": an admitted native wait on the simulation clock. */
function waitUntil(scope: Scope, until: string | number): Outcome {
  const at =
    typeof until === 'number' ? scope.world.simTime + until : clockDeadline(scope.world, until);
  if (at === undefined) return unnamedTime();
  if (at - scope.world.simTime > ACTIVITY_LIMITS.waitSeconds)
    return refuse('needs_clarification', 'Waits are limited to one game day.');
  const label = typeof until === 'number' ? `${Math.round(until / 60)} more minutes pass` : until;
  return {
    root: waitNode(scope, at, label),
    description: `Wait where you are until ${label}; anything you choose meanwhile can interrupt it.`,
  };
}

/** "stay by NAME until TIME": go near it once, then wait on the clock. */
function stayUntil(
  scope: Scope,
  name: string,
  until: string,
  omitted?: Omitted,
): Outcome | undefined {
  const near = approach(scope, name);
  if (!near || !('commands' in near)) return near;
  const at = clockDeadline(scope.world, until);
  if (at === undefined) return unnamedTime();
  const target = visibleMatches(scope, name, (e) => e.id !== scope.actorId)[0]!;
  return {
    root: {
      kind: 'sequence',
      name: `Stay by ${named(scope, target.id)} until ${until}`.slice(0, 120),
      children: [
        scope.builder.invoke(near.commands[0]!, `Go near ${named(scope, target.id)}`),
        waitNode(scope, at, until),
      ],
    },
    description: `Walk near ${named(scope, target.id)}, then wait there until ${until}.`,
    ...(omitted ? { omitted, confirm: true } : {}),
  };
}

/** "cook the meat at the fire": the native cook of one carried or earlier-produced item. */
function cook(scope: Scope, itemName: string, fireName: string | undefined): Outcome | undefined {
  // Unnamed, a selected heat source is used; otherwise any visible one (lit first). A lone
  // request whose selection is not a heat source asks plainly, because the explicit target
  // must be what the action uses; in a sequence another clause may use the selection.
  const targetId = scope.request.targetId;
  const heat = (e: Entity) => !!e.heat;
  const selected = scope.visible.find((e) => e.id === targetId && heat(e));
  if (!fireName && targetId && !selected && !scope.sequence)
    return refuse(
      'needs_clarification',
      `${capitalized(named(scope, targetId))} is not something to cook over; select what to cook over, or clear the selection.`,
      [targetId],
    );
  const fires = fireName
    ? visibleMatches(scope, fireName, heat)
    : selected
      ? [selected]
      : scope.visible.filter((e) => !!e.heat);
  const fire = fires.find((e) => e.heat?.lit) ?? fires[0];
  if (!fire)
    return fireName
      ? noMatch(
          scope,
          fireName,
          heat,
          `No ${bare(fireName)} is in view to cook over.`,
          'cooked over',
        )
      : refuse('blocked', 'Nothing to cook over is in view.', ['@visible']);
  const item = carried(scope, itemName);
  if (!item || !('id' in item)) return item;
  const choices = cookingChoices(
    scope.world,
    [...possessionItems(scope.world, scope.actorId)],
    fire.id,
    item.id,
  );
  if (choices.length > 1)
    return refuse(
      'needs_clarification',
      `Choose which preparation to use for ${definitionName(scope.world, item)}.`,
      [item.id],
    );
  const choice = choices[0];
  if (!choice)
    return refuse(
      'blocked',
      `No installed preparation has its exact ingredients available for ${definitionName(scope.world, item)}.`,
      [item.id],
    );
  return {
    commands: [{ ...choice, id: scope.localId, actorId: scope.actorId }],
    description: `${scope.world.foodPreparations[choice.preparationId]!.name} over ${named(scope, fire.id)}.`,
  };
}

/** Statements that are not requests to act now never execute. */
function notAnAction(text: string): string | undefined {
  if (/^(?:don'?t|do not|never|avoid)\b/u.test(text))
    return 'That describes something not to do; nothing was started.';
  // Only a request framed as a possibility; a mid-sentence "maybe near the river" is a hint.
  if (
    /^(?:(?:i|we) (?:might|may|could|would)|maybe|perhaps|someday)\b/u.test(text) ||
    /\b(?:tomorrow|someday|later today)$/u.test(text)
  )
    return 'That describes a possibility, not an action to take now; nothing was started.';
  if (/^pretend\b/u.test(text))
    return 'Pretending has no effect in the world here; nothing was started.';
  if (/^(?:say|tell|ask|shout|whisper)\b/u.test(text) || /^["“].*["”]$/u.test(text))
    return 'That is speech or a request to someone, not a physical action; nothing was started.';
  return undefined;
}

/** One step of a typed request; sequences reuse it per clause with a shared builder. */
function parseOne(scope: Scope, text: string): Outcome | undefined {
  const slots = scope.request.slots;
  const stopping =
    /^(?:stop|cancel|halt)(?: (?:it|that|now|everything|what (?:i'?m|i am|you'?re) doing|working|(following|gathering|moving|walking)))?$/u.exec(
      text,
    );
  if (stopping) {
    // A named activity must be the current one; "stop following" never ends a craft.
    const named = {
      following: ['follow'],
      gathering: ['gather'],
      moving: ['move'],
      walking: ['move'],
    };
    const current = scope.world.entities[scope.actorId]?.actor?.action?.type;
    if (stopping[1] && !named[stopping[1] as keyof typeof named].includes(current ?? ''))
      return refuse(
        'needs_clarification',
        `You are not ${stopping[1]} right now; nothing was stopped.`,
      );
    return {
      commands: [{ id: scope.localId, actorId: scope.actorId, type: 'cancel' }],
      description: 'Stop current work; materials already used stay spent.',
    };
  }
  const number = '(-?\\d+(?:\\.\\d+)?)';
  const point = new RegExp(
    `^(?:go|move|walk|run)(?: to)?\\s+(?:x\\s*=\\s*)?${number}\\s*,\\s*(?:z\\s*=\\s*)?${number}(?:\\s+(?:on|surface)\\s+([a-z0-9_:-]+))?$`,
    'u',
  ).exec(text);
  if (point) {
    const bound = bind(scope, {
      family: 'move',
      x: Number(point[1]),
      z: Number(point[2]),
      surfaceId: point[3] ?? null,
    });
    if ('refuse' in bound) return bound;
    const destination = (bound as Extract<Command, { type: 'move' }>).destination;
    return {
      commands: [bound as Command],
      description: `Walk to ${at(destination)} on ${destination.surfaceId}.`,
    };
  }
  const moved = offset(scope, text);
  if (moved) return moved;
  // Near-substitutes the world offers for requests it has no action for (tending a fire).
  for (const revision of scope.vocabulary.revisions) {
    const words = (list: readonly string[]) =>
      list.map((w) => w.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')).join('|');
    const tending = new RegExp(
      `^(?:${words(revision.verbs)}) (?:the )?(${words(scope.vocabulary.heatSources)})(?: (?:${words(revision.states)}))?(?: until ${scope.until})?$`,
      'u',
    ).exec(text);
    if (!tending) continue;
    const until = tending[2] ?? slots?.until ?? undefined;
    return until
      ? stayUntil(scope, tending[1]!, until, [{ ...revision.omitted }])
      : refuse('unsupported_capability', revision.withoutTime);
  }
  const staying = new RegExp(
    `^(?:stay|wait|rest|sit|keep watch|watch)(?: here)? (?:by|near|at|beside|next to|over) (.+?)(?: until ${scope.until})?$`,
    'u',
  ).exec(text);
  if (staying && (staying[2] ?? slots?.until))
    return stayUntil(scope, staying[1]!, (staying[2] ?? slots?.until)!);
  const waiting = new RegExp(
    `^(?:wait|rest|stay|keep watch)(?: here)?(?: until ${scope.until}| (\\d+) (minutes?|mins?|hours?))?$`,
    'u',
  ).exec(text);
  if (waiting) {
    if (waiting[1] ?? (!waiting[2] && slots?.until))
      return waitUntil(scope, (waiting[1] ?? slots?.until)!);
    if (waiting[2])
      return waitUntil(scope, Number(waiting[2]) * (waiting[3]!.startsWith('h') ? 3600 : 60));
    const first = namedClockTimes(scope.world)[0];
    return refuse(
      'needs_clarification',
      `Say until when, for example "${first ? `wait until ${first}` : 'wait 30 minutes'}".`,
    );
  }
  const returning =
    /^(?:go|move|walk|run|head|return)(?: back)? to (?:where|the (?:place|spot) where) (?:i|you|we) (?:last )?saw (.+)$/u.exec(
      text,
    ) ??
    /^(?:go|return|walk)(?: back)? to (.+?)(?:'s)? last(?: seen| known)? (?:place|position|location|spot)$/u.exec(
      text,
    );
  if (returning) return lastSeen(scope, returning[1]!);
  const going = /^(?:(?:go|move|walk|run|head)(?: over| up)? to|approach) (.+)$/u.exec(text);
  if (going)
    return slots?.until ? stayUntil(scope, going[1]!, slots.until) : approach(scope, going[1]!);
  const following = /^follow (.+)$/u.exec(text);
  if (following) return follow(scope, following[1]!);
  const AMOUNT =
    '(?:(\\d+|all|every|everything|a|an|one|two|three|four|five|six|seven|eight|nine|ten) )?';
  const taking = new RegExp(`^(?:pick up|pickup|take|grab) ${AMOUNT}(.+)$`, 'u').exec(
    text.replace(/ (?:from|off) (?:the )?(?:pile|ground|floor)$/u, ''),
  );
  // Only a real amount word is an amount; "a"/"an" count as one before a single noun.
  const split = (match: RegExpExecArray) => {
    const said = quantityWord(match[1]);
    return {
      amount: said ?? (slots?.quantityMode === 'exact' ? slots.quantity! : undefined),
      name: match[2]!,
    };
  };
  if (taking) {
    const { amount, name } = split(taking);
    return pickup(scope, amount, name);
  }
  const dropping = new RegExp(`^(?:drop|put down|set down|discard) ${AMOUNT}(.+)$`, 'u').exec(
    text.replace(/ on(?:to)? the ground$/u, ''),
  );
  if (dropping) {
    const { amount, name } = split(dropping);
    return drop(scope, amount, name);
  }
  const eating = new RegExp(`^eat ${AMOUNT}(.+)$`, 'u').exec(text);
  if (eating) {
    const { amount, name } = split(eating);
    return eat(scope, amount, name);
  }
  const equipping = /^(?:equip|wield|ready) (.+)$/u.exec(text);
  if (equipping) return equip(scope, equipping[1]!);
  const cooking = /^cook (.+?)(?: (?:at|on|over|in) (?:the )?(.+))?$/u.exec(text);
  if (cooking) return cook(scope, cooking[1]!, cooking[2]);
  // The amount must end the clause (optionally "more" and the resource's own noun): extra
  // conditions such as "unless a wolf comes" are never silently dropped.
  const gatheringUntil = new RegExp(
    `^(?:gather|collect|get)(?: some| more)? (.+?) until (?:(?:i|you|we) (?:have|hold|carry|get) (\\d+|two|three|four|five|six|seven|eight|nine|ten)( more)?(?: ([a-z ]+))?|${scope.until}|(?:there(?:'s| is) )?enough)$`,
    'u',
  ).exec(text);
  if (gatheringUntil) {
    if (gatheringUntil[5])
      return gatherUntil(scope, gatheringUntil[1]!, { until: gatheringUntil[5] });
    const amount = quantityWord(gatheringUntil[2]);
    // "until I have 5 wood" must count what this source yields; another item's name is a
    // different request, left to interpretation rather than silently counting the wrong thing.
    const noun = gatheringUntil[4];
    if (noun && matchLevel([gatheringUntil[1]!], noun) === 0) {
      const single = gather(scope, gatheringUntil[1]!);
      if (!single || !('commands' in single)) return single;
      const source = scope.world.entities[(single.commands[0] as { targetId: string }).targetId]!;
      if (matchLevel(itemNames(scope.world, source.resource!.definitionId), noun) === 0)
        return undefined;
    }
    if (typeof amount === 'number' && gatheringUntil[3]) {
      const single = gather(scope, gatheringUntil[1]!);
      if (!single || !('commands' in single)) return single;
      const source = scope.world.entities[(single.commands[0] as { targetId: string }).targetId]!;
      return gatherUntil(scope, gatheringUntil[1]!, {
        held: heldCount(scope, source.resource!.definitionId) + amount,
      });
    }
    if (typeof amount === 'number') return gatherUntil(scope, gatheringUntil[1]!, { held: amount });
    if (slots?.quantityMode === 'held')
      return gatherUntil(scope, gatheringUntil[1]!, { held: slots.quantity! });
    return refuse(
      'needs_clarification',
      `Say how much is enough, for example "gather ${bare(gatheringUntil[1]!)} until I have 6".`,
    );
  }
  const gatheringSome =
    /^(?:gather|collect) (\d+|two|three|four|five|six|seven|eight|nine|ten) (.+)$/u.exec(text);
  if (gatheringSome) {
    // "gather 4 wood" means four more than now; batch yields may overshoot, disclosed.
    const single = gather(scope, gatheringSome[2]!);
    if (!single || !('commands' in single)) return single;
    const source = scope.world.entities[(single.commands[0] as { targetId: string }).targetId]!;
    const held = heldCount(scope, source.resource!.definitionId);
    return gatherUntil(scope, gatheringSome[2]!, {
      held: held + (quantityWord(gatheringSome[1]) as number),
      disclosed: 'Each attempt yields a fixed batch, so you may end with slightly more.',
    });
  }
  const gathering = /^(?:gather|collect)(?: some| more)? (?:(?:from|at) )?(.+)$/u.exec(text);
  if (gathering) {
    if (slots?.quantityMode === 'held')
      return gatherUntil(scope, gathering[1]!, { held: slots.quantity! });
    if (slots?.until) return gatherUntil(scope, gathering[1]!, { until: slots.until });
    return gather(scope, gathering[1]!);
  }
  // Requests the world recognizes but has no action for, refused with its own reason.
  for (const entry of scope.vocabulary.unsupported)
    if (entry.verbs.some((verb) => text.startsWith(`${verb} `)))
      return refuse('unsupported_capability', entry.reason);
  return undefined;
}

/** "gather berries then eat one": bounded clauses sharing one builder, so a later clause
 * binds an earlier clause's actual output. Any unrecognized clause leaves the whole request
 * to interpretation; any refused clause refuses the whole request with its reason. */
function parse(scope: Scope): Outcome | undefined {
  const text = clean(scope.request.text);
  const statement = notAnAction(text);
  if (statement) return refuse('needs_clarification', statement);
  const clauses = text.split(/\s*(?:,\s*(?:and\s+)?then|\s+and\s+then|\s+then|;)\s+/u);
  if (clauses.length === 1) return parseOne(scope, text);
  if (clauses.length > 4)
    return refuse('needs_clarification', 'Ask for at most four steps at once.');
  const children: ActivityNode[] = [];
  const descriptions: string[] = [];
  const omitted: Omitted = [];
  let confirm = false;
  // A chosen stopping time or amount controls only the final step, as for interpreted
  // steps; earlier clauses keep their own words.
  const slots = scope.request.slots;
  const clauseRequest = (index: number): TypedActionRequest =>
    index === clauses.length - 1 || !slots
      ? scope.request
      : { ...scope.request, slots: { ...slots, until: null, quantity: null, quantityMode: null } };
  // One per-clause scope for both passes below, so the ownership pass parses each clause
  // exactly as the real pass does.
  const clauseScope = (index: number, extra: Partial<Scope>): Scope => ({
    ...scope,
    sequence: true,
    request: clauseRequest(index),
    ...extra,
  });
  // The chosen item detail belongs to the clause that names it. Parse each clause once with
  // name matching only (its own request, a scratch builder, no effects) to see which clauses
  // bind it by name; a generic word elsewhere ("the item") then keeps its own meaning.
  const chosenId = slots?.itemId;
  const namedBy = new Set<number>();
  if (chosenId)
    for (const [index, clause] of clauses.entries()) {
      const scratch = new Builder();
      const part = parseOne(clauseScope(index, { builder: scratch, itemDetail: 'names' }), clause);
      const bound = JSON.stringify([part, scratch.bindings]);
      if (part && !('refuse' in part) && bound.includes(JSON.stringify(chosenId)))
        namedBy.add(index);
    }
  for (const [index, clause] of clauses.entries()) {
    const owned = [...namedBy].some((other) => other !== index);
    const part = parseOne(clauseScope(index, owned ? { itemDetail: 'owned' } : {}), clause);
    if (!part) return undefined;
    if ('refuse' in part) {
      const [category, reason, depends] = part.refuse;
      return refuse(category, `Step ${index + 1} (${clause}): ${reason}`, depends);
    }
    if ('root' in part) children.push(part.root);
    else {
      if (part.commands.some((command) => command.type === 'cancel'))
        return refuse('needs_clarification', 'Stopping cannot be one step of a sequence.');
      children.push(
        ...part.commands.map((command) =>
          scope.builder.invoke(command, clause, producedDefinition(scope.world, command)),
        ),
      );
    }
    descriptions.push(part.description);
    omitted.push(...(part.omitted ?? []));
    confirm ||= !!part.confirm;
  }
  // An indefinite follow cannot truthfully complete before a later step.
  const lastFollow = children
    .slice(0, -1)
    .some((node) => node.kind === 'invoke' && node.command === 'follow' && !('until' in node.args));
  if (lastFollow)
    return refuse(
      'unsupported_capability',
      namedClockTimes(scope.world).length
        ? `Following has no natural end, so nothing can come after it; add "until ${namedClockTimes(scope.world)[0]}" or put it last.`
        : 'Following has no natural end, so nothing can come after it; put it last.',
    );
  // Commit refuses a sequence that names things but not the selection (response.ts); say so
  // plainly here. A sequence of places and waits alone has no competing target.
  const target = scope.request.targetId;
  const bound = Object.values(scope.builder.bindings);
  if (
    target &&
    (bound.some((value) => typeof value === 'string') || scope.builder.subjects.size) &&
    !bound.includes(target) &&
    !scope.builder.subjects.has(target)
  )
    return refuse(
      'needs_clarification',
      `${capitalized(named(scope, target))} is not used by any step; select something a step names, or clear the selection.`,
      [target],
    );
  return {
    root: { kind: 'sequence', name: text.slice(0, 120), children },
    description: descriptions.map((d, i) => `${i + 1}. ${d}`).join(' '),
    ...(omitted.length ? { omitted } : {}),
    ...(confirm ? { confirm } : {}),
  };
}

/** Bind a recognized typed action through the same binding contract as model output. */
export function typedAction(
  world: WorldState,
  actorId: string,
  request: TypedActionRequest,
  localId: string,
): AttemptBinding | undefined {
  const observed = observeActor(world, actorId);
  if (!observed) return undefined;
  const scope: Scope = {
    world,
    actorId,
    request,
    localId,
    visible: observed.visibleEntities,
    builder: new Builder(),
    vocabulary: typedRequestVocabulary(world),
    until: untilGroup(world),
  };
  const result = parse(scope);
  if (!result) return undefined;
  const base = {
    operationId: localId,
    manifestRevision: world.moduleManifest.revision,
    description: request.text,
  };
  if ('refuse' in result)
    return { ...base, commands: [], resolution: refuseAction(world, actorId, ...result.refuse) };
  const commands: Command[] =
    'root' in result
      ? [
          {
            id: localId,
            actorId,
            type: 'compose',
            name: request.text.slice(0, 120),
            root: result.root,
            bindings: scope.builder.bindings,
            mode: 'enqueue',
            ...(scope.builder.subjects.size
              ? { subjects: [...scope.builder.subjects].slice(0, 8) }
              : {}),
          },
        ]
      : result.commands;
  const [first] = commands;
  // Current admission gives the plain reason now; later steps still recheck at their start.
  // A composition previews its own first step when admitted.
  if (first && first.type !== 'cancel' && first.type !== 'compose') {
    const preview = executeCommand(
      world,
      { ...first, id: `${localId}:preview` },
      { preview: true },
    );
    if (!preview.outcome.ok)
      return {
        ...base,
        commands: [],
        resolution: refuseAction(
          world,
          actorId,
          ['unsupported-body', 'unsupported'].includes(preview.outcome.code)
            ? 'unsupported_capability'
            : 'blocked',
          preview.outcome.message,
          ['targetId', 'itemId'].flatMap((key) => {
            const value = Object.getOwnPropertyDescriptor(first, key)?.value;
            return typeof value === 'string' ? [value] : [];
          }),
        ),
      };
  }
  const unmet = unmetSlots(commands, request.slots);
  const omitted = [
    ...(result.omitted ?? []),
    ...unmet.map((requirement) => ({
      requirement,
      reason: 'The typed native action cannot keep this requested detail.',
    })),
  ];
  const confirm = unmet.length > 0 || !!result.confirm;
  const fulfillment: ActionFulfillment = {
    requested: request.text,
    executableDescription: result.description.slice(0, 1000),
    verdict: confirm ? 'confirm' : omitted.length ? 'partial' : 'exact',
    supported: [result.description.slice(0, 500)],
    omitted: omitted.slice(0, 8),
    reason: confirm
      ? 'Accept only the shown native action; it does not keep every requested detail.'
      : 'Complete typed form bound without inference.',
  };
  return { ...base, commands, fulfillment };
}

/** Commit a recognized typed request immediately: no provider, no intelligence slot and
 * no suggestion list. A completed job record keeps the retry identity durable and shows
 * the plain result; the response receipt keeps the domain commit idempotent.
 * docs/architecture.md#jev-first-action-grounding
 */
export async function commitTypedAction(
  service: WorldService,
  job: Pick<JobRecord, 'id' | 'authority' | 'fingerprint'>,
  actorId: string,
  request: TypedActionRequest,
  mode: 'enqueue' | 'replace' | 'interrupt',
): Promise<ApiResult | undefined> {
  if (!typedAction(service.world, actorId, request, 'action')) return undefined;
  const response = actionResponse({
    kind: 'proposal',
    description: request.text,
    actionId: null,
    verb: null,
    targetEntityId: request.targetId,
    mode,
    slots: request.slots,
  });
  // Durable admission: the job exists before the commit, so a same-id retry after the hot
  // receipt window can never execute the request again.
  const record = {
    ...job,
    kind: 'action' as const,
    createdAt: Date.now(),
    request: { text: request.text, npcId: actorId },
  };
  await service.store.putJob({
    ...record,
    status: 'generating',
    message: 'Resolving your action.',
  });
  const result = await service.transition(
    (world) => {
      const binding = typedAction(world, actorId, request, 'action');
      const visibleIds = [
        actorId,
        ...(observeActor(world, actorId)?.visibleEntities.map((entity) => entity.id) ?? []),
      ];
      const refs = [
        ...visibleIds,
        ...[request.slots?.itemId, request.slots?.instrumentId, request.slots?.recipientId].filter(
          (ref): ref is string =>
            !!ref && actionReferencePermitted(world, actorId, visibleIds, ref),
        ),
      ];
      return commitActorResponse(
        world,
        job.id,
        actorId,
        response,
        {},
        refs,
        world.entities[actorId]?.actor?.planGeneration ?? 0,
        binding
          ? [{ ...binding, targetEpisodes: captureActionTargets(world, actorId, binding.commands) }]
          : [],
      );
    },
    undefined,
    job.id,
  );
  const component = service.world.responseReceipts?.[job.id]?.components['action'];
  const outcome = component ?? result;
  // A pause or storage failure committed nothing: record it as failed, not completed, so the
  // player's next attempt is a fresh request rather than a replay of this refusal.
  await service.store.putJob({
    ...record,
    status: component ? 'completed' : 'failed',
    message: outcome.message,
  });
  service.notify();
  return { ok: outcome.ok, code: outcome.code, message: outcome.message, jobId: job.id };
}

/** Interpreted results never author control flow: requested amounts and stopping times in
 * slots become native repetition, waits or a follow deadline here. Anything else is left
 * as bound, and the slot check reports what it does not keep.
 * docs/action-capabilities.md#8-native-activity-composition
 */
export function applySlotControl(
  world: WorldState,
  actorId: string,
  commands: Command[],
  slots: IntentSlots | null,
  localId: string,
): Command[] {
  if (!slots || (!slots.until && slots.quantityMode !== 'held') || !commands.length)
    return commands;
  const last = commands.at(-1)!;
  if (slots.until && last.type === 'follow' && last.until === undefined) {
    const until = clockDeadline(world, slots.until);
    return until === undefined ? commands : [...commands.slice(0, -1), { ...last, until }];
  }
  const builder = new Builder();
  const children = commands.slice(0, -1).map((command) => builder.invoke(command, command.type));
  let tail: ActivityNode | undefined;
  if (slots.quantityMode === 'held' && last.type === 'gather') {
    const definitionId = world.entities[last.targetId]?.resource?.definitionId;
    if (!definitionId) return commands;
    tail = {
      kind: 'repeat',
      name: `Gather until carrying ${slots.quantity}`,
      until: { test: 'holding', definitionId, quantity: slots.quantity! },
      maximum: ACTIVITY_LIMITS.iterations,
      body: builder.invoke(last, 'Gather'),
    };
  } else if (slots.until && last.type === 'move') {
    const at = clockDeadline(world, slots.until);
    if (at === undefined) return commands;
    children.push(builder.invoke(last, 'Go there'));
    tail = {
      kind: 'wait',
      name: `Wait until ${slots.until}`,
      until: { test: 'time', at },
      seconds: Math.max(1, at - world.simTime),
    };
  }
  if (!tail) return commands;
  return [
    {
      id: localId,
      actorId,
      type: 'compose',
      name: 'Requested activity',
      root: children.length
        ? { kind: 'sequence', name: 'Requested activity', children: [...children, tail] }
        : tail,
      bindings: builder.bindings,
      mode: 'enqueue',
    },
  ];
}
