import { person, personalText } from './narration.js';
import type { Command, Outcome, WorldState } from './types.js';
import { isSafeRecordId } from './records.js';
import { appendMemory, canonicalJson } from './events.js';

import { isActivityCommand } from './agency.js';
import {
  installedActivityHost,
  activityCommandSupported,
  activitySpendCeiling,
} from './activity-hosts.js';
import { validateChosenActivityControl } from './activity-execution.js';
import { hasRecordFields } from './records.js';
import { isDefinitionPin, sameDefinitionPin } from './state-owners.js';
import { STOCK_TRANSFER_LIMITS } from './stock-transfer.js';
import { cloneValue } from './draft.js';

/** Admission bounds, not promises about how much an actor remembers. Historical
 * records can live in the repository after leaving the resident working set.
 * docs/projects/action-experience-tech-design.md#four-records-one-execution-owner
 */
export const ACTIVITY_LIMITS = {
  nodes: 64,
  depth: 12,
  iterations: 16,
  /** One game day, so "until dawn" is expressible from any hour. */
  waitSeconds: 86400,
  facts: 48,
  text: 500,
  outputs: 16,
  links: 64,
  candidates: 4,
  visits: 512,
  definitions: 256,
  acquisitions: 64,
  page: 128,
  expandedWork: 4096,
  assessed: 1024,
  assessmentBytes: 262144,
  acquisitionBytes: 65536,
  recordBytes: 32768,
  retainedRecords: 100000,
} as const;

export interface ActivityOutput {
  port: string;
  itemId: string;
  definitionId: string;
  quantity: number;
}
export interface ActivityConnection {
  from: string;
  relation: 'material' | 'support' | 'state' | 'purpose';
  quantity?: number;
  port?: string;
}
/** These are permitted, event-time observations, never privileged snapshots. */
export type ActivityScalar = string | number | boolean;
export type ActivityRow = Record<string, ActivityScalar | ActivityScalar[]>;
export type ActivityDetail =
  | ActivityScalar
  | ActivityScalar[]
  | ActivityRow
  | ActivityRow[]
  | Record<string, ActivityRow | ActivityRow[]>;
export interface ActivityFact {
  name: string;
  value: ActivityDetail;
  critical: boolean;
  sentence?: string;
}
export interface ActivityView {
  name: string;
  actor?: string;
  target?: string;
  tool?: string;
  facts: ActivityFact[];
  children?: ActivityView[];
  result?: string;
}
export interface ActivityOccurrence {
  id: string;
  actorId: string;
  commandId: string;
  actionId: string;
  parentId?: string;
  parentName?: string;
  methodId?: string;
  at: number;
  endedAt?: number;
  command: Command;
  objects: Record<
    string,
    { kind: string; definitionId?: string; definitionVersion?: number; definitionDigest?: string }
  >;
  view: ActivityView;
  status: 'running' | 'completed' | 'blocked' | 'cancelled';
  outputs: ActivityOutput[];
  connections: ActivityConnection[];
  outcome?: Outcome;
  evidenceIds: string[];
  /** Reference to the personal result; the execution record is not a recall store. */
  resultMemoryId?: string;
  effects?: {
    id: string;
    subjectId: string;
    label: string;
    property: string;
    unit?: string;
    before: ActivityScalar;
    after: ActivityScalar;
  }[];
  /** Changed only by explicit evidence correction/revocation, not compaction. */
  revoked?: boolean;
  incomplete?: boolean;
  /** Trusted native admission links reusable meaning to one actual lot attempt. */
  stockResolution?: import('./stock-transfer.js').StockTransferAdmission;
  /** Requested guarded controls are one-session evidence, not inferred methods. */
  noLearningControl?: boolean;
}

export type ActivityPredicate =
  | { test: 'registered'; definition: import('./world-modules.js').DefinitionPin; role: string }
  | { test: 'alive' | 'available' | 'equipped' | 'lit'; role: string }
  | { test: 'output'; step: string; port: string; quantity: number }
  /** The actor's own accessible possessions hold at least this many of a definition. */
  | { test: 'holding'; definitionId: string; quantity: number }
  /** Simulation time has reached an absolute deadline bound when the request was admitted. */
  | { test: 'time'; at: number };
export type ActivityBinding = string | import('@open-legend/spatial').SurfacePoint;
export type ActivityArgument =
  | { role: string }
  | { output: string; port: string; quantity: number }
  | { literal: string | number | boolean };
export type ActivityNode =
  | {
      kind: 'invoke';
      key: string;
      name: string;
      command: Command['type'];
      args: Record<string, ActivityArgument>;
      outputs?: Omit<ActivityOutput, 'itemId'>[];
    }
  | { kind: 'sequence'; name: string; children: ActivityNode[] }
  | { kind: 'branch'; name: string; when: ActivityPredicate; yes: ActivityNode; no?: ActivityNode }
  | { kind: 'repeat'; name: string; until: ActivityPredicate; maximum: number; body: ActivityNode }
  | { kind: 'wait'; name: string; until: ActivityPredicate; seconds: number };
export interface ActivityMethod {
  executable: boolean;
  id: string;
  signature: string;
  manifest: string;
  name: string;
  root: ActivityNode;
  roles: Record<
    string,
    {
      commandFields: string[];
      kind: 'object' | 'place' | 'text' | 'self';
      definitionId?: string;
      definitionVersion?: number;
      definitionDigest?: string;
      entityKind?: string;
      maximumHealth?: number;
      /** A source must provide the material actually produced in the learner's trace. */
      gatheredDefinition?: import('./world-modules.js').DefinitionPin;
      /** The installed adapter, rather than an entity label, supplies target compatibility. */
      targetHost?: import('./world-modules.js').DefinitionPin;
    }
  >;
}
export interface ActivityAcquisition {
  id: string;
  methodId: string;
  actorId: string;
  at: number;
  supports: { occurrenceIds: string[]; evidenceIds: string[]; revoked: boolean }[];
  status: 'tentative';
  bindings: Record<string, ActivityBinding>;
}
export interface ActivityLearningCursor {
  inspection?: { eventId: string; after: number; methodAfter?: number };
  after: string | null;
  position?: number;
  examined?: string[];
  pending: string[];
  assessed: string[];
}
export interface ActionExperienceState {
  version: 1;
  /** Monotone admission count includes cold repository records. Never decremented
   * by residency compaction; a full allowance refuses new recorded work. */
  admitted: number;
  occurrences: Record<string, ActivityOccurrence[]>;
  methods: Record<string, ActivityMethod>;
  acquisitions: Record<string, Record<string, ActivityAcquisition>>;
  learning: Record<string, ActivityLearningCursor>;
  current: Record<string, string>;
  active: Record<string, { actorId: string; occurrenceId: string }>;
  items: Record<
    string,
    { actorId: string; occurrenceId: string; port: string; quantity: number; ambiguous?: boolean }[]
  >;
  changes: Record<string, { actorId: string; occurrenceId: string }[]>;
}
export const emptyActionExperience = (): ActionExperienceState => ({
  version: 1,
  admitted: 0,
  occurrences: {},
  methods: {},
  acquisitions: {},
  learning: {},
  current: {},
  active: {},
  items: {},
  changes: {},
});

/** Recording a committed transaction does not make its revision-bound command a
 * reusable plan. Such transactions remain inspectable through the same history. */
export function isRecordedActivityCommand(command: Command): boolean {
  if (isActivityCommand(command)) return true;
  if (!command || !isSafeRecordId(command.id) || !isSafeRecordId(command.actorId)) return false;
  if (command.type === 'recover') return true;
  if (command.type === 'teach')
    return isSafeRecordId(command.targetId) && isSafeRecordId(command.recipeId);
  if (command.type === 'unequip')
    return (
      isSafeRecordId(command.itemId) &&
      Number.isSafeInteger(command.expectedRevision) &&
      Number.isSafeInteger(command.placementRevision)
    );
  if (
    ['transfer-item', 'split-item', 'merge-item'].includes(command.type) &&
    'targetRevision' in command
  )
    return (
      isSafeRecordId(command.itemId) &&
      isSafeRecordId(command.targetId) &&
      Number.isSafeInteger(command.quantity) &&
      command.quantity > 0 &&
      [command.expectedRevision, command.placementRevision, command.targetRevision].every(
        (value) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0,
      )
    );
  return false;
}

/** Exact event-time facts for the personal record, independent of prompt/display budgets.
 * Summaries never replace the source facts. docs/engine-and-world-boundaries.md#preserve-precise-history-and-solve-the-general-cause */
export function activityRecordText(view: ActivityView): string {
  const facts = view.facts.map(
    (fact) =>
      `${fact.name}: ${typeof fact.value === 'string' ? fact.value : JSON.stringify(fact.value)}`,
  );
  return [
    view.name,
    ...(view.actor ? [`actor: ${view.actor}`] : []),
    ...(view.target ? [`target: ${view.target}`] : []),
    ...(view.tool ? [`tool: ${view.tool}`] : []),
    ...facts,
    ...(view.children?.map(activityRecordText) ?? []),
    ...(view.result ? [`Result: ${view.result}`] : []),
  ].join('; ');
}

/** Input is already scoped by the observation owner. Labels and sentences cover
 * common facts; only critical unhandled data reaches the narrow JSON fallback. */
export function projectActivity(
  view: ActivityView,
  header?: 'Can do' | 'Doing now' | 'What happened' | 'Remaining',
  byteLimit = 16000,
  detailDepth = ACTIVITY_LIMITS.depth as number,
) {
  if (!Number.isInteger(detailDepth) || detailDepth < 0 || detailDepth > ACTIVITY_LIMITS.depth)
    throw new Error('Invalid activity detail depth.');
  // Brackets/newlines in names or quoted speech are data, never new steps.
  const prose = (value: string): string =>
    value
      .replaceAll('[', '［')
      .replaceAll(']', '］')
      .replace(/[\r\n]+/g, ' ');
  const safeDetail = (value: unknown, depth = 0): void => {
    if (depth > 4) throw new Error('Activity detail nesting exceeded.');
    if (typeof value === 'number' && !Number.isFinite(value))
      throw new Error('Non-finite activity detail.');
    if (value === null || !['string', 'number', 'boolean', 'object'].includes(typeof value))
      throw new Error('Unsupported activity detail.');
    if (typeof value === 'string' && value.length > ACTIVITY_LIMITS.text)
      throw new Error('Activity detail text exceeded.');
    if (value && typeof value === 'object') {
      if (Object.keys(value).length > 16) throw new Error('Activity detail size exceeded.');
      for (const [label, child] of Object.entries(value)) {
        if (
          !Array.isArray(value) &&
          (!label.trim() || label.length > 80 || /[_.:]|^(id|schema|kind|code|basis)$/i.test(label))
        )
          throw new Error('Activity detail needs a plain human label.');
        safeDetail(child, depth + 1);
      }
    }
  };
  const prepare = (optional: boolean) => {
    const covered: string[] = [],
      fallback: string[] = [];
    let count = 0,
      omitted = false;
    const render = (node: ActivityView, depth: number, path: string): string => {
      if (++count > ACTIVITY_LIMITS.nodes || depth > ACTIVITY_LIMITS.depth)
        throw new Error('Activity display structure exceeded.');
      if (
        typeof node.name !== 'string' ||
        !node.name.trim() ||
        node.name.length > ACTIVITY_LIMITS.text ||
        !Array.isArray(node.facts) ||
        node.facts.length > ACTIVITY_LIMITS.facts
      )
        throw new Error('Invalid activity display.');
      const details = [
        node.actor && `actor: ${prose(node.actor)}`,
        node.target && `target: ${prose(node.target)}`,
        node.tool && `tool: ${prose(node.tool)}`,
      ].filter(Boolean);
      const extra: Record<string, ActivityDetail> = {};
      for (const [index, fact] of node.facts.entries()) {
        if (!fact.critical && (!optional || depth > detailDepth)) {
          omitted = true;
          continue;
        }
        safeDetail(fact.value);
        if (!fact.name.trim() || fact.name.length > 80)
          throw new Error('A missing fact needs a readable description before it can be supplied.');
        const key = `${path}.facts.${index}`;
        if (fact.sentence) details.push(prose(fact.sentence));
        else if (typeof fact.value !== 'object')
          details.push(`${prose(fact.name)}: ${prose(String(fact.value))}`);
        else if (fact.critical) {
          extra[fact.name] = fact.value;
          fallback.push(key);
        } else {
          omitted = true;
          continue;
        }
        covered.push(key);
      }
      const children = node.children
        ?.map(
          (child, index) =>
            `${depth >= detailDepth ? `Step ${index + 1} within ${prose(node.name)}: ` : ''}${render(child, depth + 1, `${path}.${index}`)}`,
        )
        .join('; ');
      return `${prose(node.name)}${details.length ? ` (${details.join('; ')})` : ''}${children ? (depth >= detailDepth ? `. Nested layout is not shown. ${children}` : ` [${children}]`) : ''}${node.result && node.result !== node.children?.at(-1)?.result ? `. Result: ${prose(node.result)}` : ''}${Object.keys(extra).length ? `. Extra details: ${JSON.stringify(extra)}` : ''}`;
    };
    let text = `${header ? `${header}: ` : ''}${render(view, 0, 'action')}`;
    if (omitted) text += '. Optional details are not shown.';
    return { text, covered, fallback, omitted, bytes: new TextEncoder().encode(text).length };
  };
  const full = prepare(true);
  if (full.bytes <= byteLimit) return full;
  const required = prepare(false);
  if (required.bytes > byteLimit)
    throw new Error(
      'Required activity information exceeds the input budget; preparation is unfinished.',
    );
  return required;
}
export function renderActivity(
  view: ActivityView,
  header?: 'Can do' | 'Doing now' | 'What happened' | 'Remaining',
): string {
  return projectActivity(view, header).text;
}
export const ACTIVITY_SYNTAX =
  'Each action says what to do and with what. When brackets appear, they contain smaller actions in order; semicolons separate them. Results say what actually happened.';

export function occurrenceFor(
  world: WorldState,
  actorId: string,
  actionId: string,
): ActivityOccurrence | undefined {
  return world.actionExperience.occurrences[actorId]?.find((entry) => entry.actionId === actionId);
}

/** Project committed results, retaining event-time wording and observed changes;
 * never describe a recipe's possible future yield as a completed result. */
export function activityResultFacts(
  world: WorldState,
  outputs: readonly ActivityOutput[],
  recorded?: readonly ActivityFact[],
): ActivityFact[] {
  if (recorded)
    return recorded.filter((fact) => fact.name === 'produced' || fact.name === 'observed changes');
  const produced = outputs.map((output) => ({
    quantity: output.quantity,
    material: world.itemDefinitions[output.definitionId]?.name ?? 'items',
  }));
  return produced.length
    ? [
        {
          name: 'produced',
          // Each admitted label retains its own text bound; several valid outputs
          // must not fail because their combined sentence exceeds one label's limit.
          value: produced,
          sentence: `produced: ${produced.map(({ quantity, material }) => `${quantity} ${material}`).join(', ')}`,
          critical: true,
        },
      ]
    : [];
}
export function beginActivity(
  world: WorldState,
  command: Command,
  actionId: string,
  view: ActivityView,
  parentId?: string,
): ActivityOccurrence {
  // A learned success may reproduce the physical action, never a human's one-attack consent.
  const { humanInitiated: _human, ...recordable } = command;
  command = recordable;
  if (command.type === 'strike' || command.type === 'hunt') {
    const { lethalPermission: _permission, ...physical } = command;
    command = physical;
  }
  const state = world.actionExperience;
  const entries = (state.occurrences[command.actorId] ??= []);
  const existing = entries.find((entry) => entry.commandId === command.id);
  if (existing) return existing;
  const objects: ActivityOccurrence['objects'] = {};
  for (const [field, value] of Object.entries(command)) {
    if (
      ![
        'targetId',
        'itemId',
        'weaponItemId',
        'ammoItemId',
        'heatId',
        'sourceId',
        'destinationId',
      ].includes(field) ||
      typeof value !== 'string'
    )
      continue;
    const entity = world.entities[value];
    if (!entity) continue;
    objects[value] = {
      kind: entity.kind,
      ...(entity.item
        ? {
            definitionId: entity.item.definitionPin.id,
            definitionVersion: entity.item.definitionPin.version,
            definitionDigest: entity.item.definitionPin.digest,
          }
        : {}),
    };
  }
  const record: ActivityOccurrence = {
    id: command.id,
    commandId: command.id,
    actionId,
    actorId: command.actorId,
    ...(parentId ? { parentId } : {}),
    at: world.simTime,
    // A learned frontier can supply a draft plan step; history owns a plain snapshot.
    command: cloneValue(command),
    objects,
    view,
    status: 'running',
    outputs: [],
    connections: [],
    evidenceIds: [],
  };
  const plan = world.entities[command.actorId]?.actor?.agency.plan;
  if (
    parentId &&
    plan?.id === parentId &&
    plan.activity?.control &&
    plan.steps.some((step) => step.id === command.id && step.activityKey)
  )
    record.noLearningControl = true;
  if (parentId && plan?.id === parentId) {
    const method = plan.activity?.methodId ? state.methods[plan.activity.methodId] : undefined;
    const name =
      plan.activity?.request?.name ??
      method?.name ??
      plan.steps.find((step) => step.command.purpose)?.command.purpose;
    if (name) record.parentName = name;
    if (method) record.methodId = method.id;
  }
  entries.push(record);
  state.admitted++;
  state.current[command.actorId] = actionId;
  state.active[actionId] = { actorId: command.actorId, occurrenceId: record.id };
  state.learning[command.actorId] ??= { after: null, pending: [], assessed: [] };
  return record;
}
export function bindActivityAction(
  world: WorldState,
  entry: ActivityOccurrence,
  actionId: string,
): void {
  delete world.actionExperience.active[entry.actionId];
  entry.actionId = actionId;
  world.actionExperience.current[entry.actorId] = actionId;
  world.actionExperience.active[actionId] = { actorId: entry.actorId, occurrenceId: entry.id };
}
export function activeActivity(
  world: WorldState,
  actionId: string,
): ActivityOccurrence | undefined {
  const ref = world.actionExperience.active[actionId];
  return (
    ref &&
    world.actionExperience.occurrences[ref.actorId]?.find((entry) => entry.id === ref.occurrenceId)
  );
}
/** Called by the lot owner with actual committed amounts. Merged provenance can
 * identify contributors, but never pretends to identify indistinguishable units. */
export function connectActivityItem(
  world: WorldState,
  type: 'split' | 'merge' | 'consume',
  sourceId: string,
  quantity: number,
  cause: string,
  targetId?: string,
): void {
  const state = world.actionExperience;
  const sources = state.items[sourceId];
  if (!sources?.length) return;
  const entry = activeActivity(world, cause);
  const sourceSize =
    (world.entities[sourceId]?.item?.quantity ?? 0) + (type === 'split' ? quantity : 0);
  const ambiguous =
    sources.length > 1 ||
    sources.some((source) => source.ambiguous) ||
    sources.reduce((sum, source) => sum + source.quantity, 0) < sourceSize;
  if (type === 'consume' && entry) {
    for (const source of sources) {
      if (source.actorId !== entry.actorId || source.occurrenceId === entry.id) continue;
      if (entry.connections.length >= ACTIVITY_LIMITS.links) break;
      entry.connections.push({
        from: source.occurrenceId,
        relation: 'material',
        port: source.port,
        ...(!ambiguous ? { quantity: Math.min(quantity, source.quantity) } : {}),
      });
    }
    if (ambiguous) entry.incomplete = true;
    if (ambiguous)
      entry.view.facts.push({
        name: 'ingredients',
        value: 'This stack contains mixed sources; individual units cannot be traced exactly',
        critical: true,
      });
  }
  if (targetId) {
    const target = (state.items[targetId] ??= []);
    for (const source of sources) {
      const prior = target.find(
        (value) =>
          value.actorId === source.actorId &&
          value.occurrenceId === source.occurrenceId &&
          value.port === source.port,
      );
      const moved = Math.min(quantity, source.quantity);
      if (prior) {
        prior.quantity += moved;
        prior.ambiguous ||= ambiguous;
      } else if (target.length < ACTIVITY_LIMITS.links)
        target.push({ ...source, quantity: moved, ...(ambiguous ? { ambiguous: true } : {}) });
    }
  }
  const remaining =
    type === 'merge'
      ? 0
      : Math.max(
          0,
          (world.entities[sourceId]?.item?.quantity ?? 0) - (type === 'consume' ? quantity : 0),
        );
  for (const source of sources) {
    // In a mixture, each number is only an upper bound on a source's remaining
    // units. Never publish those bounds as exact consumption quantities.
    source.quantity = ambiguous
      ? Math.min(source.quantity, remaining)
      : Math.max(0, source.quantity - quantity);
    source.ambiguous ||= ambiguous;
  }
  if (sources.every((source) => source.quantity === 0)) delete state.items[sourceId];
}
export function connectActivityState(
  world: WorldState,
  targetId: string,
  cause: string,
  before: number,
  after: number,
  permitted: boolean,
): void {
  const state = world.actionExperience;
  const entry = activeActivity(world, cause);
  const previous = state.changes[targetId] ?? [];
  if (entry && permitted) {
    for (const prior of previous)
      if (
        prior.actorId === entry.actorId &&
        prior.occurrenceId !== entry.id &&
        !entry.connections.some(
          (link) => link.from === prior.occurrenceId && link.relation === 'state',
        )
      ) {
        if (entry.connections.length < ACTIVITY_LIMITS.links)
          entry.connections.push({ from: prior.occurrenceId, relation: 'state' });
        else entry.incomplete = true;
      }
    recordActivityEffect(world, cause, {
      subjectId: targetId,
      property: 'health',
      before,
      after,
    });
    state.changes[targetId] = [
      ...previous,
      { actorId: entry.actorId, occurrenceId: entry.id },
    ].slice(-ACTIVITY_LIMITS.iterations);
  } else if (before !== after) {
    // An unobserved/external change breaks complete causal support. Later work can
    // still retain the observed entry condition, never another actor's private work.
    delete state.changes[targetId];
  }
}
/** The committing family supplies already permitted actual values, after clamps.
 * A change is one effect on a subject, never another child action to count twice. */
export function recordActivityEffect(
  world: WorldState,
  cause: string,
  effect: Omit<NonNullable<ActivityOccurrence['effects']>[number], 'id' | 'label'>,
): void {
  const entry = activeActivity(world, cause);
  if (!entry) return;
  const effects = (entry.effects ??= []);
  const previous = effects.find(
    (value) => value.subjectId === effect.subjectId && value.property === effect.property,
  );
  if (previous) previous.after = effect.after;
  else {
    if (effects.length >= ACTIVITY_LIMITS.outputs)
      throw new Error('The admitted action effect allowance is full.');
    effects.push({
      ...effect,
      label: personalText(world, entry.actorId, { parts: [person(effect.subjectId, 'object')] }),
      id: `${entry.id}:effect:${effects.length}`,
    });
  }
  const fact: ActivityFact = {
    name: 'observed changes',
    critical: true,
    value: effects.map(({ label, property, unit, before, after }) => ({
      target: label,
      property,
      ...(unit ? { unit } : {}),
      before,
      after,
    })),
    sentence: effects
      .map((value) => {
        const { label, property, before, after } = value;
        if (typeof before === 'boolean' && typeof after === 'boolean')
          return `${label}: ${property} ${before === after ? `remained ${after ? 'active' : 'inactive'}` : after ? 'began' : 'ended'}`;
        const change =
          typeof before === 'number' && typeof after === 'number' ? after - before : undefined;
        return `${label}: ${property} ${before} to ${after}${change === undefined ? '' : ` (${change >= 0 ? '+' : ''}${change})`}`;
      })
      .join('; '),
  };
  const index = entry.view.facts.findIndex((value) => value.name === fact.name);
  if (index < 0) entry.view.facts.push(fact);
  else entry.view.facts[index] = fact;
}
export function endActivity(
  world: WorldState,
  actorId: string,
  actionId: string,
  result: Outcome,
): string | undefined {
  const entry = occurrenceFor(world, actorId, actionId);
  if (!entry || entry.status !== 'running') return entry?.resultMemoryId;
  entry.status = result.ok ? 'completed' : result.code === 'cancelled' ? 'cancelled' : 'blocked';
  entry.endedAt = world.simTime;
  entry.outcome = result;
  entry.outputs = result.outputs ?? entry.outputs;
  for (const output of entry.outputs) {
    const sources = (world.actionExperience.items[output.itemId] ??= []);
    if (sources.length < ACTIVITY_LIMITS.links)
      sources.push({
        actorId,
        occurrenceId: entry.id,
        port: output.port,
        quantity: output.quantity,
      });
  }
  delete world.actionExperience.active[actionId];
  if (world.actionExperience.current[actorId] === actionId)
    delete world.actionExperience.current[actorId];
  entry.view.result = result.message;
  const last = entry.view.children?.at(-1);
  if (last && !last.result) last.result = result.message;
  for (const fact of entry.view.facts) {
    if (fact.name === 'health') fact.name = 'health before the attempt';
    if (fact.name === 'distance') fact.name = 'distance before the attempt';
  }
  entry.view.facts.push(...activityResultFacts(world, entry.outputs));
  // Forgetting a running attempt revokes its personal evidence, not its already
  // admitted physical work. Completion must not recreate the forgotten episode.
  if (!entry.revoked && !world.experience?.forgotten[actorId]?.includes(entry.id)) {
    entry.resultMemoryId ??= appendMemory(world, actorId, {
      kind: 'episode',
      source: 'internal',
      importance: 6,
      activityId: entry.id,
      summary: {
        parts: [
          person(actorId, 'possessive'),
          ` action ${entry.status} at simulation time ${world.simTime}: ${activityRecordText(entry.view)}`,
        ],
      },
      entityIds: [actorId],
    });
  }
  world.entities[actorId]!.actor!.agency.lastResultMemoryId = entry.resultMemoryId;
  const cursor = world.actionExperience.learning[actorId]!;
  if (!cursor.pending.includes(entry.id)) cursor.pending.push(entry.id);
  if (cursor.pending.length > ACTIVITY_LIMITS.page) cursor.pending.shift();
  return entry.resultMemoryId;
}
/** Executable fields are closed even when a save or a model supplies extra JSON.
 * This describes existing native commands, never installs a new executor. */
const invocationFields: Partial<
  Record<Command['type'], { required: string[]; optional?: string[] }>
> = {
  pickup: { required: ['targetId'], optional: ['itemId', 'quantity'] },
  drop: { required: ['itemId', 'quantity'] },
  move: { required: ['destination'] },
  // Requested activities may end a follow at an absolute deadline; learning refuses to
  // generalize one (activity-learning.ts), since a past deadline is not reusable.
  follow: { required: ['targetId'], optional: ['distance', 'relation', 'onLost', 'until'] },
  gather: { required: ['targetId'], optional: ['itemId'] },
  harvest: { required: ['targetId'] },
  prepare: { required: ['preparation'] },
  craft: { required: ['recipeId'] },
  replenish: { required: ['targetId', 'attributeId'] },
  equip: { required: ['itemId'] },
  guard: { required: ['itemId'], optional: ['targetId', 'facing', 'autoEquip'] },
  eat: { required: ['itemId'] },
  'inspect-inventory': {
    required: [],
    optional: ['containerId', 'after', 'expectedRevision', 'expectedScope'],
  },
  strike: { required: ['targetId', 'definitionId'], optional: ['weaponItemId', 'autoEquip'] },
  hunt: { required: ['targetId'], optional: ['weaponItemId', 'ammoItemId', 'autoEquip'] },
  'treat-scar': { required: ['targetId', 'scarId'] },
  cook: { required: ['itemId', 'heatId'] },
  'tend-fire': {
    required: ['targetId', 'operation'],
    optional: [
      'itemId',
      'definitionId',
      'definitionVersion',
      'definitionDigest',
      'minimumHeld',
      'onlyWhenLow',
    ],
  },
  'transfer-stock': {
    required: [
      'sourceId',
      'destinationId',
      'definitionId',
      'definitionVersion',
      'definitionDigest',
      'quantity',
      'minimumHeld',
    ],
  },
  'status-effect': { required: ['targetId', 'definitionId', 'operation'] },
  say: { required: ['text'], optional: ['targetId', 'intendedRecipientId', 'volume'] },
};
function exactFields(value: object, fields: string[]): void {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !fields.includes(key))
  )
    throw new Error('Unsupported activity field.');
}
export function validateActivityNode(root: ActivityNode): void {
  let count = 0,
    expanded = 0;
  const keys = new Set<string>();
  const ports = new Map<string, Set<string>>();
  const walk = (node: ActivityNode, depth: number, multiplier: number): void => {
    if (
      !node ||
      ++count > ACTIVITY_LIMITS.nodes ||
      depth > ACTIVITY_LIMITS.depth ||
      (expanded += multiplier) > ACTIVITY_LIMITS.expandedWork ||
      typeof node.name !== 'string' ||
      !node.name.trim() ||
      node.name.length > ACTIVITY_LIMITS.text
    )
      throw new Error('Invalid or oversized activity structure.');
    const predicate = (p: ActivityPredicate): void => {
      if (
        !p ||
        ![
          'alive',
          'available',
          'equipped',
          'lit',
          'output',
          'holding',
          'time',
          'registered',
        ].includes(p.test) ||
        (p.test === 'registered' &&
          (!p.definition ||
            !isSafeRecordId(p.definition.id) ||
            !Number.isSafeInteger(p.definition.version) ||
            p.definition.version < 1 ||
            typeof p.definition.digest !== 'string' ||
            !p.definition.digest ||
            Object.keys(p.definition).sort().join(',') !== 'digest,id,version')) ||
        (p.test === 'output'
          ? !keys.has(p.step) ||
            !ports.get(p.step)?.has(p.port) ||
            !isSafeRecordId(p.port) ||
            !Number.isSafeInteger(p.quantity) ||
            p.quantity <= 0
          : p.test === 'holding'
            ? !isSafeRecordId(p.definitionId) ||
              !Number.isSafeInteger(p.quantity) ||
              p.quantity <= 0
            : p.test === 'time'
              ? !Number.isFinite(p.at) || p.at < 0
              : !isSafeRecordId(p.role))
      )
        throw new Error('Invalid activity condition.');
      exactFields(
        p,
        p.test === 'registered'
          ? ['test', 'definition', 'role']
          : p.test === 'output'
            ? ['test', 'step', 'port', 'quantity']
            : p.test === 'holding'
              ? ['test', 'definitionId', 'quantity']
              : p.test === 'time'
                ? ['test', 'at']
                : ['test', 'role'],
      );
    };
    switch (node.kind) {
      case 'invoke': {
        exactFields(node, ['kind', 'key', 'name', 'command', 'args', 'outputs']);
        if (
          node.outputs &&
          (node.outputs.length > ACTIVITY_LIMITS.outputs ||
            node.outputs.some(
              (output) =>
                !isSafeRecordId(output.port) ||
                !isSafeRecordId(output.definitionId) ||
                !Number.isSafeInteger(output.quantity) ||
                output.quantity < 1,
            ))
        )
          throw new Error('Invalid activity output description.');
        for (const output of node.outputs ?? [])
          exactFields(output, ['port', 'definitionId', 'quantity']);
        const fields = invocationFields[node.command];
        if (
          !fields ||
          !isSafeRecordId(node.key) ||
          keys.has(node.key) ||
          !node.args ||
          fields.required.some((field) => !(field in node.args))
        )
          throw new Error('Invalid activity invocation.');
        exactFields(node.args, [...fields.required, ...(fields.optional ?? [])]);
        for (const [field, arg] of Object.entries(node.args)) {
          if (!arg || typeof arg !== 'object') throw new Error('Invalid activity argument.');
          if ('role' in arg) {
            exactFields(arg, ['role']);
            if (!isSafeRecordId(arg.role)) throw new Error('Invalid activity role.');
          } else if ('output' in arg) {
            exactFields(arg, ['output', 'port', 'quantity']);
            if (
              !['itemId', 'weaponItemId', 'ammoItemId'].includes(field) ||
              !keys.has(arg.output) ||
              !ports.get(arg.output)?.has(arg.port) ||
              !isSafeRecordId(arg.port) ||
              !Number.isSafeInteger(arg.quantity) ||
              arg.quantity <= 0
            )
              throw new Error('Invalid activity output reference.');
          } else {
            if (
              [
                'targetId',
                'intendedRecipientId',
                'itemId',
                'weaponItemId',
                'ammoItemId',
                'heatId',
                'sourceId',
                'destinationId',
                'destination',
                'text',
              ].includes(field)
            )
              throw new Error('Personal activity values must use private bindings.');
            exactFields(arg, ['literal']);
            if (
              !('literal' in arg) ||
              !['string', 'number', 'boolean'].includes(typeof arg.literal) ||
              (typeof arg.literal === 'number' && !Number.isFinite(arg.literal)) ||
              (typeof arg.literal === 'string' && arg.literal.length > ACTIVITY_LIMITS.text)
            )
              throw new Error('Invalid activity literal.');
          }
        }
        keys.add(node.key);
        ports.set(node.key, new Set(node.outputs?.map((output) => output.port) ?? []));
        break;
      }
      case 'sequence':
        exactFields(node, ['kind', 'name', 'children']);
        if (!Array.isArray(node.children) || !node.children.length)
          throw new Error('Empty activity sequence.');
        for (const child of node.children) walk(child, depth + 1, multiplier);
        break;
      case 'branch':
        exactFields(node, ['kind', 'name', 'when', 'yes', 'no']);
        predicate(node.when);
        walk(node.yes, depth + 1, multiplier);
        if (node.no) walk(node.no, depth + 1, multiplier);
        break;
      case 'repeat':
        exactFields(node, ['kind', 'name', 'until', 'maximum', 'body']);
        if (
          !Number.isInteger(node.maximum) ||
          node.maximum < 1 ||
          node.maximum > ACTIVITY_LIMITS.iterations
        )
          throw new Error('Unbounded activity repetition.');
        walk(node.body, depth + 1, multiplier * node.maximum);
        predicate(node.until);
        break;
      case 'wait':
        exactFields(node, ['kind', 'name', 'until', 'seconds']);
        predicate(node.until);
        if (
          !Number.isFinite(node.seconds) ||
          node.seconds <= 0 ||
          node.seconds > ACTIVITY_LIMITS.waitSeconds
        )
          throw new Error('Unbounded activity wait.');
        break;
      default:
        throw new Error('Unsupported activity operator.');
    }
  };
  walk(root, 0, 1);
}

/** A current executable root must resolve its exact installed observation support.
 * Archived non-executable methods may retain historical definitions as evidence. */
function validateInstalledActivityConditions(
  world: WorldState,
  root: ActivityNode,
  bindings?: Record<string, ActivityBinding>,
): void {
  if (root.kind === 'invoke') {
    if (
      bindings &&
      Object.values(root.args).some((arg) => 'role' in arg && !Object.hasOwn(bindings, arg.role))
    )
      throw new Error('Missing saved activity binding.');
    if (root.command === 'transfer-stock' && !activityCommandSupported(world, root.command))
      throw new Error('Missing installed stock-transfer support.');
    return;
  }
  if (root.kind === 'sequence') {
    root.children.forEach((child) => validateInstalledActivityConditions(world, child, bindings));
    return;
  }
  const condition = root.kind === 'branch' ? root.when : root.until;
  if (
    condition.test === 'registered' &&
    (!isDefinitionPin(condition.definition) ||
      !installedActivityHost(world, condition.definition)?.evaluateCondition ||
      (bindings && typeof bindings[condition.role] !== 'string'))
  )
    throw new Error('Missing installed activity observation support or binding.');
  if (root.kind === 'branch') {
    validateInstalledActivityConditions(world, root.yes, bindings);
    if (root.no) validateInstalledActivityConditions(world, root.no, bindings);
  }
  if (root.kind === 'repeat') validateInstalledActivityConditions(world, root.body, bindings);
}

function validateStockResolution(entry: ActivityOccurrence): void {
  const receipt = entry.stockResolution,
    command = entry.command;
  if (receipt === undefined) {
    if (command.type === 'transfer-stock' && entry.status === 'completed' && entry.outcome?.ok)
      throw new Error('Missing committed stock-transfer resolution.');
    return;
  }
  if (
    !hasRecordFields(receipt, [
      'sourceId',
      'destinationId',
      'destinationRevision',
      'definition',
      'quantity',
      'minimumHeld',
      'lots',
    ]) ||
    command.type !== 'transfer-stock' ||
    entry.status !== 'completed' ||
    !entry.outcome?.ok ||
    receipt.sourceId !== command.sourceId ||
    receipt.destinationId !== command.destinationId ||
    receipt.sourceId === receipt.destinationId ||
    !isSafeRecordId(receipt.sourceId) ||
    !isSafeRecordId(receipt.destinationId) ||
    !isDefinitionPin(receipt.definition) ||
    !sameDefinitionPin(receipt.definition, {
      id: command.definitionId,
      version: command.definitionVersion,
      digest: command.definitionDigest,
    }) ||
    !Number.isSafeInteger(receipt.destinationRevision) ||
    receipt.destinationRevision < 0 ||
    receipt.quantity !== command.quantity ||
    !Number.isSafeInteger(receipt.quantity) ||
    receipt.quantity < 1 ||
    receipt.minimumHeld !== command.minimumHeld ||
    !Number.isSafeInteger(receipt.minimumHeld) ||
    receipt.minimumHeld < 0 ||
    !Array.isArray(receipt.lots) ||
    !receipt.lots.length ||
    receipt.lots.length > STOCK_TRANSFER_LIMITS.movedLots
  )
    throw new Error('Invalid committed stock-transfer resolution.');
  let quantity = 0;
  const lotIds = new Set<string>();
  for (const lot of receipt.lots) {
    if (
      !hasRecordFields(lot, ['itemId', 'quantity', 'revision', 'placementRevision']) ||
      !isSafeRecordId(lot.itemId) ||
      lotIds.has(lot.itemId) ||
      !Number.isSafeInteger(lot.quantity) ||
      lot.quantity < 1 ||
      !Number.isSafeInteger(lot.revision) ||
      lot.revision < 0 ||
      !Number.isSafeInteger(lot.placementRevision) ||
      lot.placementRevision < 0 ||
      !Number.isSafeInteger((quantity += lot.quantity))
    )
      throw new Error('Invalid committed stock-transfer lot.');
    lotIds.add(lot.itemId);
  }
  if (
    quantity !== receipt.quantity ||
    entry.outputs.length !== receipt.lots.length ||
    new Set(entry.outputs.map((output) => output.itemId)).size !== entry.outputs.length ||
    entry.outputs.reduce((sum, output) => sum + output.quantity, 0) !== receipt.quantity ||
    entry.outputs.some(
      (output, index) =>
        output.definitionId !== receipt.definition.id ||
        output.port !== receipt.definition.id ||
        output.quantity !== receipt.lots[index]!.quantity,
    )
  )
    throw new Error('Stock-transfer resolution disagrees with its actual outputs.');
}

export function validateActionExperience(world: WorldState): void {
  const state = world.actionExperience;
  if (
    !state ||
    state.version !== 1 ||
    !state.occurrences ||
    !state.methods ||
    !state.acquisitions ||
    !state.learning ||
    !state.active ||
    !state.current ||
    !state.items ||
    !state.changes ||
    !Number.isSafeInteger(state.admitted) ||
    state.admitted < 0 ||
    state.admitted > ACTIVITY_LIMITS.retainedRecords
  )
    throw new Error(
      'Incompatible development action-experience format. Create a separate current-format world.',
    );
  if (Object.keys(state.methods).length > ACTIVITY_LIMITS.definitions)
    throw new Error('Too many retained activity methods.');
  const signatures = new Set<string>();
  for (const [id, method] of Object.entries(state.methods)) {
    exactFields(method, ['executable', 'id', 'signature', 'manifest', 'name', 'root', 'roles']);
    validateActivityNode(method.root);
    if (method.executable && method.manifest === canonicalJson(world.moduleManifest))
      validateInstalledActivityConditions(world, method.root);
    if (
      id !== method.id ||
      !isSafeRecordId(id) ||
      typeof method.executable !== 'boolean' ||
      method.name !== method.root.name ||
      typeof method.manifest !== 'string' ||
      method.signature !==
        canonicalJson({
          root: method.root,
          roles: method.roles,
          manifest: method.manifest,
          executable: method.executable,
        }) ||
      signatures.has(method.signature) ||
      new TextEncoder().encode(JSON.stringify(method)).length > ACTIVITY_LIMITS.recordBytes
    )
      throw new Error('Invalid or duplicate activity definition.');
    signatures.add(method.signature);
    if (!method.roles || Object.keys(method.roles).length > ACTIVITY_LIMITS.nodes)
      throw new Error('Invalid activity roles.');
    for (const [role, rule] of Object.entries(method.roles)) {
      exactFields(rule, [
        'commandFields',
        'kind',
        'definitionId',
        'definitionVersion',
        'definitionDigest',
        'entityKind',
        'maximumHealth',
        'gatheredDefinition',
        'targetHost',
      ]);
      if (
        !isSafeRecordId(role) ||
        !['object', 'place', 'text', 'self'].includes(rule.kind) ||
        !Array.isArray(rule.commandFields) ||
        !rule.commandFields.length ||
        rule.commandFields.length > 8 ||
        rule.commandFields.some(
          (field) =>
            ![
              'targetId',
              'intendedRecipientId',
              'itemId',
              'weaponItemId',
              'ammoItemId',
              'heatId',
              'sourceId',
              'destinationId',
              'destination',
              'text',
            ].includes(field),
        ) ||
        (rule.kind === 'place' && rule.commandFields.some((field) => field !== 'destination')) ||
        (rule.kind === 'text' && rule.commandFields.some((field) => field !== 'text')) ||
        (rule.kind === 'self' &&
          (rule.commandFields.some((field) => !['sourceId', 'destinationId'].includes(field)) ||
            rule.definitionId !== undefined ||
            rule.entityKind !== undefined ||
            rule.maximumHealth !== undefined ||
            rule.gatheredDefinition !== undefined ||
            rule.targetHost !== undefined)) ||
        (rule.kind === 'object' &&
          rule.commandFields.some((field) => ['text', 'destination'].includes(field))) ||
        (rule.definitionId !== undefined &&
          (!isSafeRecordId(rule.definitionId) ||
            !Number.isSafeInteger(rule.definitionVersion) ||
            rule.definitionVersion! < 1 ||
            typeof rule.definitionDigest !== 'string')) ||
        (rule.maximumHealth !== undefined &&
          (!Number.isFinite(rule.maximumHealth) || rule.maximumHealth < 0)) ||
        [rule.gatheredDefinition, rule.targetHost].some(
          (pin) =>
            pin !== undefined &&
            (rule.kind !== 'object' ||
              Object.keys(pin).sort().join(',') !== 'digest,id,version' ||
              !isSafeRecordId(pin.id) ||
              !Number.isSafeInteger(pin.version) ||
              pin.version < 1 ||
              typeof pin.digest !== 'string' ||
              !pin.digest),
        )
      )
        throw new Error('Invalid activity role constraint.');
    }
    const walk = (node: ActivityNode): void => {
      if (node.kind === 'invoke') {
        for (const [field, arg] of Object.entries(node.args))
          if ('role' in arg && !method.roles[arg.role]?.commandFields.includes(field))
            throw new Error('Unbound activity role.');
      } else if (node.kind === 'sequence') node.children.forEach(walk);
      else {
        const p = node.kind === 'branch' ? node.when : node.until;
        if ('role' in p && method.roles[p.role]?.kind !== 'object')
          throw new Error('Unbound activity condition.');
        if (node.kind === 'branch') {
          walk(node.yes);
          if (node.no) walk(node.no);
        }
        if (node.kind === 'repeat') walk(node.body);
      }
    };
    walk(method.root);
  }
  let resident = 0;
  const all = new Map(
    Object.values(state.occurrences)
      .flat()
      .map((entry) => [entry.id, entry]),
  );
  const order = new Map(
    Object.values(state.occurrences).flatMap((entries) =>
      entries.map((entry, index) => [entry.id, index] as const),
    ),
  );
  if (
    all.size !== Object.values(state.occurrences).reduce((sum, entries) => sum + entries.length, 0)
  )
    throw new Error('Duplicate action occurrence identity.');
  for (const [actorId, entries] of Object.entries(state.occurrences)) {
    const ids = new Set<string>();
    for (const entry of entries) {
      resident++;
      if (
        !isSafeRecordId(entry.id) ||
        ids.has(entry.id) ||
        entry.actorId !== actorId ||
        !isSafeRecordId(entry.actionId) ||
        (entry.resultMemoryId !== undefined && !isSafeRecordId(entry.resultMemoryId)) ||
        (entry.parentId !== undefined && !isSafeRecordId(entry.parentId)) ||
        (entry.parentName !== undefined &&
          (typeof entry.parentName !== 'string' ||
            !entry.parentName.trim() ||
            entry.parentName.length > ACTIVITY_LIMITS.text)) ||
        (entry.methodId !== undefined && !state.methods[entry.methodId]) ||
        entry.command.id !== entry.id ||
        entry.command.actorId !== actorId ||
        !isRecordedActivityCommand(entry.command) ||
        !Number.isFinite(entry.at) ||
        entry.at < 0 ||
        !['running', 'completed', 'blocked', 'cancelled'].includes(entry.status) ||
        !Array.isArray(entry.outputs) ||
        entry.outputs.length > ACTIVITY_LIMITS.outputs ||
        !Array.isArray(entry.connections) ||
        entry.connections.length > ACTIVITY_LIMITS.links ||
        !Array.isArray(entry.evidenceIds) ||
        entry.evidenceIds.length > ACTIVITY_LIMITS.links ||
        entry.evidenceIds.some((id) => !isSafeRecordId(id)) ||
        (entry.noLearningControl !== undefined && typeof entry.noLearningControl !== 'boolean') ||
        new TextEncoder().encode(JSON.stringify(entry)).length > ACTIVITY_LIMITS.recordBytes ||
        (entry.status !== 'running' &&
          (!Number.isFinite(entry.endedAt) ||
            entry.endedAt! < entry.at ||
            !entry.outcome ||
            typeof entry.outcome.ok !== 'boolean'))
      )
        throw new Error('Invalid action experience.');
      ids.add(entry.id);
      validateStockResolution(entry);
      for (const link of entry.connections) {
        const source = all.get(link.from);
        if (
          !isSafeRecordId(link.from) ||
          link.from === entry.id ||
          !['material', 'support', 'state', 'purpose'].includes(link.relation) ||
          (source &&
            (source.actorId !== actorId ||
              source.at > entry.at ||
              order.get(source.id)! >= order.get(entry.id)!)) ||
          (link.quantity !== undefined && (!Number.isFinite(link.quantity) || link.quantity <= 0))
        )
          throw new Error('Invalid activity connection.');
      }
      for (const output of entry.outputs)
        if (
          !isSafeRecordId(output.port) ||
          !isSafeRecordId(output.itemId) ||
          !isSafeRecordId(output.definitionId) ||
          !Number.isSafeInteger(output.quantity) ||
          output.quantity < 1
        )
          throw new Error('Invalid action output.');
      if (
        entry.effects &&
        (entry.effects.length > ACTIVITY_LIMITS.outputs ||
          new Set(entry.effects.map((effect) => effect.id)).size !== entry.effects.length ||
          entry.effects.some(
            (effect) =>
              !isSafeRecordId(effect.id) ||
              !isSafeRecordId(effect.subjectId) ||
              [effect.label, effect.property].some(
                (value) =>
                  typeof value !== 'string' || !value.trim() || value.length > ACTIVITY_LIMITS.text,
              ) ||
              (effect.unit !== undefined &&
                (typeof effect.unit !== 'string' || effect.unit.length > ACTIVITY_LIMITS.text)) ||
              [effect.before, effect.after].some(
                (value) =>
                  !['string', 'number', 'boolean'].includes(typeof value) ||
                  (typeof value === 'number' && !Number.isFinite(value)) ||
                  (typeof value === 'string' && value.length > ACTIVITY_LIMITS.text),
              ),
          ))
      )
        throw new Error('Invalid observed action effect.');
      renderActivity(entry.view);
    }
  }
  if (resident > state.admitted) throw new Error('Activity storage accounting is incomplete.');
  for (const cursor of Object.values(state.learning)) {
    if (
      !Array.isArray(cursor.assessed) ||
      cursor.assessed.length > ACTIVITY_LIMITS.assessed ||
      cursor.assessed.some((value) => typeof value !== 'string') ||
      new TextEncoder().encode(JSON.stringify(cursor.assessed)).length >
        ACTIVITY_LIMITS.assessmentBytes ||
      !Array.isArray(cursor.pending) ||
      cursor.pending.length > ACTIVITY_LIMITS.page ||
      (cursor.examined?.length ?? 0) > ACTIVITY_LIMITS.visits ||
      [...cursor.pending, ...(cursor.examined ?? [])].some((id) => !isSafeRecordId(id)) ||
      (cursor.inspection !== undefined &&
        (!isSafeRecordId(cursor.inspection.eventId) ||
          !Number.isSafeInteger(cursor.inspection.after) ||
          cursor.inspection.after < -1 ||
          (cursor.inspection.methodAfter !== undefined &&
            (!Number.isSafeInteger(cursor.inspection.methodAfter) ||
              cursor.inspection.methodAfter < 0)))) ||
      (cursor.position !== undefined &&
        (!Number.isSafeInteger(cursor.position) || cursor.position < -1))
    )
      throw new Error('Invalid activity learning cursor.');
  }
  for (const [actionId, ref] of Object.entries(state.active)) {
    const entry = all.get(ref.occurrenceId);
    if (
      !entry ||
      entry.actorId !== ref.actorId ||
      entry.actionId !== actionId ||
      entry.status !== 'running'
    )
      throw new Error('Invalid active action occurrence.');
  }
  for (const [actorId, actionId] of Object.entries(state.current))
    if (state.active[actionId]?.actorId !== actorId)
      throw new Error('Invalid current action occurrence.');
  for (const [itemId, sources] of Object.entries(state.items)) {
    if (
      !isSafeRecordId(itemId) ||
      !Array.isArray(sources) ||
      sources.length > ACTIVITY_LIMITS.links ||
      sources.some(
        (source) =>
          !isSafeRecordId(source.actorId) ||
          !isSafeRecordId(source.occurrenceId) ||
          !isSafeRecordId(source.port) ||
          !Number.isSafeInteger(source.quantity) ||
          source.quantity < 0 ||
          (source.ambiguous !== undefined && typeof source.ambiguous !== 'boolean'),
      )
    )
      throw new Error('Invalid action item provenance.');
  }
  for (const [subjectId, sources] of Object.entries(state.changes))
    if (
      !isSafeRecordId(subjectId) ||
      !Array.isArray(sources) ||
      sources.length > ACTIVITY_LIMITS.iterations ||
      sources.some(
        (source) => !isSafeRecordId(source.actorId) || !isSafeRecordId(source.occurrenceId),
      )
    )
      throw new Error('Invalid action state provenance.');
  for (const [actorId, acquisitions] of Object.entries(state.acquisitions)) {
    if (Object.keys(acquisitions).length > ACTIVITY_LIMITS.acquisitions)
      throw new Error('Too many personal activity acquisitions.');
    for (const acquisition of Object.values(acquisitions)) {
      if (
        new TextEncoder().encode(JSON.stringify(acquisition)).length >
          ACTIVITY_LIMITS.acquisitionBytes ||
        acquisition.actorId !== actorId ||
        !state.methods[acquisition.methodId] ||
        !acquisition.supports.length ||
        acquisition.status !== 'tentative' ||
        acquisition.supports.length > ACTIVITY_LIMITS.links ||
        acquisition.supports.some(
          (support) =>
            !support.occurrenceIds.length ||
            support.occurrenceIds.length > ACTIVITY_LIMITS.nodes ||
            support.evidenceIds.length > ACTIVITY_LIMITS.nodes * ACTIVITY_LIMITS.links ||
            [...support.occurrenceIds, ...support.evidenceIds].some((id) => !isSafeRecordId(id)) ||
            typeof support.revoked !== 'boolean',
        )
      )
        throw new Error('Invalid personal activity acquisition.');
      validateActivityBindings(state.methods[acquisition.methodId]!, acquisition.bindings);
    }
  }
  for (const execution of Object.values(world.entities).flatMap((entity) =>
    [entity.actor?.agency.plan?.activity, entity.actor?.agency.suspended?.activity].flatMap(
      (activity) => (activity ? [{ entity, activity }] : []),
    ),
  )) {
    const { entity, activity } = execution;
    const plan =
      entity.actor!.agency.plan?.activity === activity
        ? entity.actor!.agency.plan!
        : entity.actor!.agency.suspended!;
    validateExecution(world, entity.id, activity, plan);
  }
}

/** A requested activity carries its own validated root; a learned one names its method. */
function validateExecution(
  world: WorldState,
  actorId: string,
  execution: import('./activity-execution.js').ActivityExecution,
  plan: import('./agency.js').ActorPlan,
): void {
  const state = world.actionExperience,
    simTime = world.simTime;
  exactFields(execution, [
    'methodId',
    'request',
    'bindings',
    'pending',
    'outputs',
    'serial',
    'processed',
    'archivedSteps',
    'activeKey',
    'reason',
    'control',
    'attempts',
    'lastAttemptId',
    'spent',
    'interrupted',
    'terminal',
  ]);
  if (
    !execution.bindings ||
    typeof execution.bindings !== 'object' ||
    Array.isArray(execution.bindings) ||
    !Array.isArray(execution.pending) ||
    !execution.outputs ||
    typeof execution.outputs !== 'object' ||
    Array.isArray(execution.outputs)
  )
    throw new Error('Invalid saved activity execution shape.');
  {
    const method = execution.request
      ? undefined
      : execution.methodId
        ? state.methods[execution.methodId]
        : undefined;
    const root = execution.request?.root ?? method?.root;
    if (execution.request !== undefined) {
      if (!hasRecordFields(execution.request, ['name', 'root']))
        throw new Error('Invalid saved requested activity shape.');
      if (
        execution.methodId !== undefined ||
        typeof execution.request.name !== 'string' ||
        !execution.request.name.trim() ||
        execution.request.name.length > ACTIVITY_LIMITS.text
      )
        throw new Error('Invalid saved requested activity.');
      validateActivityNode(execution.request.root);
      if (
        Object.keys(execution.bindings).length > ACTIVITY_LIMITS.nodes ||
        Object.entries(execution.bindings).some(
          ([role, value]) =>
            !isSafeRecordId(role) ||
            !(
              isSafeRecordId(value) ||
              (typeof value === 'object' &&
                value !== null &&
                [value.x, value.y, value.z].every(Number.isFinite) &&
                isSafeRecordId(value.surfaceId))
            ),
        )
      )
        throw new Error('Invalid saved requested activity bindings.');
    }
    if (
      !root ||
      (!execution.request && (!method || !state.acquisitions[actorId]?.[method.id])) ||
      !Number.isSafeInteger(execution.serial) ||
      execution.serial < 0 ||
      execution.serial > ACTIVITY_LIMITS.expandedWork ||
      !Number.isSafeInteger(execution.processed) ||
      execution.processed < 0 ||
      execution.processed > ACTIVITY_LIMITS.expandedWork ||
      (execution.archivedSteps !== undefined &&
        (!Number.isSafeInteger(execution.archivedSteps) ||
          execution.archivedSteps < 0 ||
          execution.archivedSteps > execution.serial)) ||
      execution.pending.length > ACTIVITY_LIMITS.nodes
    )
      throw new Error('Invalid saved activity execution.');
    if (method) validateActivityBindings(method, execution.bindings);
    validateInstalledActivityConditions(world, root, execution.bindings);
    if (execution.control !== undefined) {
      if (!execution.request || execution.methodId !== undefined)
        throw new Error('A chosen watch cannot be a learned activity control.');
      validateChosenActivityControl(world, root, execution.bindings, execution.control);
      const attemptPrefix = `${plan.id}:step:`,
        attemptParts =
          typeof execution.lastAttemptId === 'string'
            ? execution.lastAttemptId.slice(attemptPrefix.length).split(':r')
            : [];
      const validAttemptId =
        isSafeRecordId(execution.lastAttemptId) &&
        execution.lastAttemptId.startsWith(attemptPrefix) &&
        attemptParts.every(
          (part, index) =>
            /^[1-9]\d*$/u.test(part) &&
            Number.isSafeInteger(Number(part)) &&
            Number(part) <= (index === 0 ? execution.serial : plan.revision),
        );
      let retainedAttempts = 0,
        retainedSpent = 0;
      const retainedIds = new Set<string>();
      for (const step of [...plan.steps, ...world.entities[actorId]!.actor!.agency.history]) {
        if (
          !step.id.startsWith(attemptPrefix) ||
          !step.activityKey ||
          step.command.type !== execution.control.budget.command ||
          retainedIds.has(step.id)
        )
          continue;
        retainedIds.add(step.id);
        if (step.actionId !== undefined) retainedAttempts++;
        const spent = step.outcome?.spent;
        const ceiling =
          'itemFromStep' in step.command ? undefined : activitySpendCeiling(world, step.command);
        if (spent === undefined) {
          if (step.status === 'completed' && step.outcome?.ok)
            throw new Error('A completed counted action needs its spending receipt.');
          continue;
        }
        if (
          !Number.isSafeInteger(spent) ||
          spent < 0 ||
          ceiling === undefined ||
          spent > ceiling ||
          (spent > 0 && (!step.outcome?.ok || step.actionId === undefined))
        )
          throw new Error('Invalid saved chosen activity spending receipt.');
        retainedSpent += spent;
      }
      // Older steps can leave the frontier and bounded history; available evidence
      // still prevents resetting counters below native attempts and committed costs.
      if (
        !Number.isSafeInteger(execution.attempts) ||
        execution.attempts! < retainedAttempts ||
        execution.attempts! > execution.control.budget.maximumAttempts ||
        (execution.attempts === 0 ? execution.lastAttemptId !== undefined : !validAttemptId) ||
        !Number.isSafeInteger(execution.spent) ||
        execution.spent! < retainedSpent ||
        execution.spent! > execution.control.budget.maximumSpent ||
        typeof execution.interrupted !== 'boolean' ||
        typeof execution.terminal !== 'boolean' ||
        (world.entities[actorId]?.actor?.agency.suspended?.activity === execution &&
          !execution.interrupted) ||
        (execution.terminal &&
          (plan.status === 'active' ||
            execution.pending.length > 0 ||
            plan.steps.some((step) => step.status === 'queued' || step.status === 'running')))
      )
        throw new Error('Invalid saved chosen activity counters or terminal work.');
    } else if (
      [
        execution.attempts,
        execution.lastAttemptId,
        execution.spent,
        execution.interrupted,
        execution.terminal,
      ].some((value) => value !== undefined)
    )
      throw new Error('Saved chosen activity counters need their admitted control.');
    const subtrees = new Set<string>(),
      keys = new Set<string>();
    const visit = (node: ActivityNode): void => {
      subtrees.add(canonicalJson(node));
      if (node.kind === 'invoke') keys.add(node.key);
      if (node.kind === 'sequence') node.children.forEach(visit);
      if (node.kind === 'branch') {
        visit(node.yes);
        if (node.no) visit(node.no);
      }
      if (node.kind === 'repeat') visit(node.body);
    };
    visit(root);
    if (execution.control && execution.lastAttemptId !== undefined) {
      const lastAttempt = [...plan.steps, ...world.entities[actorId]!.actor!.agency.history].find(
        (step) => step.id === execution.lastAttemptId,
      );
      const runningAttempt = plan.steps.find(
        (step) =>
          step.status === 'running' &&
          step.activityKey !== undefined &&
          step.command.type === execution.control!.budget.command,
      );
      // Paused watches can outlive bounded history. Check retained evidence without
      // making that history's residency a new promise about suspended work.
      if (
        (runningAttempt && runningAttempt.id !== execution.lastAttemptId) ||
        (lastAttempt &&
          (lastAttempt.command.type !== execution.control.budget.command ||
            !lastAttempt.activityKey ||
            !keys.has(lastAttempt.activityKey)))
      )
        throw new Error('Invalid saved chosen activity attempt identity.');
    }
    for (const frame of execution.pending) {
      if (!hasRecordFields(frame, ['node', 'iteration'], ['startedAt']))
        throw new Error('Invalid saved activity frontier shape.');
      if (
        !subtrees.has(canonicalJson(frame.node)) ||
        !Number.isSafeInteger(frame.iteration) ||
        frame.iteration < 0 ||
        frame.iteration > ACTIVITY_LIMITS.iterations ||
        (frame.startedAt !== undefined &&
          (!Number.isFinite(frame.startedAt) || frame.startedAt < 0 || frame.startedAt > simTime))
      )
        throw new Error('Invalid saved activity frontier.');
    }
    if (
      (execution.activeKey && !keys.has(execution.activeKey)) ||
      Object.keys(execution.outputs).some((key) => !keys.has(key))
    )
      throw new Error('Invalid saved activity output key.');
    for (const outputs of Object.values(execution.outputs))
      if (
        !Array.isArray(outputs) ||
        outputs.length > ACTIVITY_LIMITS.outputs ||
        outputs.some(
          (output) =>
            !hasRecordFields(output, ['itemId', 'port', 'definitionId', 'quantity']) ||
            !isSafeRecordId(output.itemId) ||
            !isSafeRecordId(output.port) ||
            !isSafeRecordId(output.definitionId) ||
            !Number.isSafeInteger(output.quantity) ||
            output.quantity < 1,
        )
      )
        throw new Error('Invalid saved activity output.');
  }
}

export function validateActivityBindings(
  method: ActivityMethod,
  bindings: Record<string, ActivityBinding>,
): void {
  if (!bindings || Object.keys(bindings).length !== Object.keys(method.roles).length)
    throw new Error('Invalid activity bindings.');
  for (const [role, rule] of Object.entries(method.roles)) {
    const value = bindings[role];
    if (
      rule.kind === 'place'
        ? !value ||
          typeof value !== 'object' ||
          !isSafeRecordId(value.surfaceId) ||
          ![value.x, value.y, value.z].every(Number.isFinite)
        : typeof value !== 'string' ||
          (rule.kind === 'text' ? !value.trim() || value.length > 1500 : !isSafeRecordId(value))
    )
      throw new Error('Invalid activity binding.');
  }
}
