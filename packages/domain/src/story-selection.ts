import { inventionPermission } from './invention-policy.js';
import { canonicalJson } from './events.js';
import type { Entity, WorldEvent, WorldState } from './types.js';
import { updateWorld } from './draft.js';

export interface StoryPolicy {
  id: string;
  version: number;
  evaluator: 'story_importance_v1' | 'silent_v1';
  enabled: boolean;
  fields: Record<
    string,
    { minimum: number; maximum: number; default: number; appliesTo: ('actor' | 'object')[] }
  >;
  introductions: { enabled: boolean; field: string; threshold: number };
  eventRules: {
    type: 'death' | 'body-effect' | 'god-revived';
    role: 'source' | 'target';
    field?: string;
    minimum?: number;
    fact?: 'healthDelta' | 'injuryDelta';
    maximum?: number;
    significance: number;
  }[];
  delivery: { maximumSources: number; minimumInterval: number; maximumAge: number };
}
export type StorySelection =
  | { kind: 'silent'; reason: string }
  | {
      kind: 'candidate';
      significance: number;
      reason: string;
      sourceEventIds: string[];
      milestoneKey?: string;
      groupKey: string;
    };
export const defaultStoryPolicy = (): StoryPolicy => ({
  id: 'story_importance',
  version: 1,
  evaluator: 'story_importance_v1',
  enabled: true,
  fields: {
    story_importance: { minimum: 0, maximum: 10, default: 0, appliesTo: ['actor', 'object'] },
  },
  introductions: { enabled: true, field: 'story_importance', threshold: 7 },
  eventRules: [],
  delivery: { maximumSources: 8, minimumInterval: 300, maximumAge: 600 },
});
function keys(value: object, allowed: string[]) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((k) => !allowed.includes(k))
  )
    throw new Error('Unsupported story configuration property.');
}
function number(value: number, low: number, high: number) {
  if (!Number.isFinite(value) || value < low || value > high)
    throw new Error('Story configuration number is out of bounds.');
}
export function validateStoryPolicy(p: StoryPolicy): void {
  keys(p, [
    'id',
    'version',
    'evaluator',
    'enabled',
    'fields',
    'introductions',
    'eventRules',
    'delivery',
  ]);
  if (
    typeof p.id !== 'string' ||
    !/^[a-z][a-z0-9_]{0,63}$/.test(p.id) ||
    !Number.isSafeInteger(p.version) ||
    p.version < 1 ||
    !['story_importance_v1', 'silent_v1'].includes(p.evaluator) ||
    typeof p.enabled !== 'boolean'
  )
    throw new Error('Unknown or invalid story mechanism.');
  if (!p.fields || Object.keys(p.fields).length > 16) throw new Error('Too many story fields.');
  keys(p.fields, Object.keys(p.fields));
  for (const [name, f] of Object.entries(p.fields)) {
    if (!/^[a-z][a-z0-9_]{0,63}$/.test(name)) throw new Error('Invalid story field name.');
    keys(f, ['minimum', 'maximum', 'default', 'appliesTo']);
    number(f.minimum, -1000, 1000);
    number(f.maximum, f.minimum, 1000);
    number(f.default, f.minimum, f.maximum);
    if (
      !Array.isArray(f.appliesTo) ||
      !f.appliesTo.length ||
      f.appliesTo.some((v) => !['actor', 'object'].includes(v))
    )
      throw new Error('Unsupported field applicability.');
  }
  keys(p.introductions, ['enabled', 'field', 'threshold']);
  if (
    typeof p.introductions.enabled !== 'boolean' ||
    typeof p.introductions.field !== 'string' ||
    !Object.hasOwn(p.fields, p.introductions.field)
  )
    throw new Error('Invalid introduction field.');
  number(p.introductions.threshold, -1000, 1000);
  if (!Array.isArray(p.eventRules) || p.eventRules.length > 32)
    throw new Error('Too many story rules.');
  for (const r of p.eventRules) {
    keys(r, ['type', 'role', 'field', 'minimum', 'fact', 'maximum', 'significance']);
    if (
      !['death', 'body-effect', 'god-revived'].includes(r.type) ||
      !['source', 'target'].includes(r.role)
    )
      throw new Error('Unsupported story event rule.');
    number(r.significance, 0, 10);
    if (r.field !== undefined) {
      if (!Object.hasOwn(p.fields, r.field)) throw new Error('Unknown rule field.');
      number(r.minimum!, -1000, 1000);
    } else if (r.minimum !== undefined) throw new Error('A field comparison needs a field.');
    if (r.fact !== undefined) {
      if (r.type !== 'body-effect' || !['healthDelta', 'injuryDelta'].includes(r.fact))
        throw new Error('Unsupported structured fact.');
      number(r.maximum!, -1000, 1000);
    } else if (r.maximum !== undefined) throw new Error('A fact comparison needs a fact.');
  }
  keys(p.delivery, ['maximumSources', 'minimumInterval', 'maximumAge']);
  number(p.delivery.maximumSources, 1, 16);
  if (!Number.isInteger(p.delivery.maximumSources))
    throw new Error('Source limit must be an integer.');
  number(p.delivery.minimumInterval, 0, 86400);
  number(p.delivery.maximumAge, 1, 86400);
}
export function storyField(
  p: StoryPolicy,
  entity: Entity | undefined,
  field: string,
): number | undefined {
  const f = p.fields[field];
  if (!entity || !f?.appliesTo.includes(entity.actor || entity.animal ? 'actor' : 'object'))
    return undefined;
  return entity.mechanismFields?.[p.id]?.[field] ?? f.default;
}
export interface StorySelectionInput {
  viewerId: string;
  event: WorldEvent;
  sourceText: string;
  source?: Entity;
  target?: Entity;
}
type Evaluator = (input: StorySelectionInput, config: StoryPolicy) => StorySelection;
const silent = (reason: string): StorySelection => ({ kind: 'silent', reason });
// Only reviewed host evaluators are executable. Configuration never supplies code.
const evaluators: Record<StoryPolicy['evaluator'], Evaluator> = {
  silent_v1: () => silent('Mechanism selects silence.'),
  story_importance_v1: (i, p) => {
    const e = i.event;
    const candidate = (
      significance: number,
      reason: string,
      milestoneKey?: string,
    ): StorySelection => ({
      kind: 'candidate',
      significance,
      reason,
      sourceEventIds: [e.id],
      milestoneKey,
      groupKey:
        typeof e.data?.['responseId'] === 'string'
          ? `response:${e.data['responseId']}`
          : e.type === 'body-effect' && typeof e.data?.['effectId'] === 'string'
            ? `effect:${e.data['effectId']}`
            : `event:${e.id}`,
    });
    if (e.type === 'encounter' && e.actorId === i.viewerId && i.target && p.introductions.enabled) {
      const value = storyField(p, i.target, p.introductions.field);
      if (value !== undefined && value >= p.introductions.threshold)
        return candidate(value, 'Designated introduction', `encounter:${i.target.id}`);
    }
    for (const r of p.eventRules) {
      if (e.type !== r.type) continue;
      const entity = r.role === 'source' ? i.source : i.target;
      if (r.field && (storyField(p, entity, r.field) ?? -Infinity) < r.minimum!) continue;
      if (
        r.fact &&
        (typeof e.data?.[r.fact] !== 'number' || (e.data[r.fact] as number) > r.maximum!)
      )
        continue;
      return candidate(r.significance, 'Supported consequential event');
    }
    return silent('No story rule matched.');
  },
};
export function selectStory(input: StorySelectionInput, p: StoryPolicy): StorySelection {
  const event = input.event;
  // Acquisition is private evidence, not a private thought. Only its sole observer may
  // receive a designated introduction. docs/narration-and-conversations.md#replaceable-story-selection
  const ownAcquisition =
    event.type === 'encounter' &&
    event.data?.['acquisition'] === 'visual' &&
    event.actorId === input.viewerId &&
    event.audience.length === 1 &&
    event.audience[0] === input.viewerId;
  if (
    (event.scope === 'private' && !ownAcquisition) ||
    !p.enabled ||
    !evaluators[p.evaluator] ||
    !input.event.audience.includes(input.viewerId) ||
    !input.sourceText.trim()
  )
    return silent('Disabled or unavailable evidence.');
  return evaluators[p.evaluator](input, p);
}
/** All configuration and field changes share validation and revision invalidation. */
export function editStoryMechanism(
  world: WorldState,
  policy: StoryPolicy,
  changes: { entityId: string; values: Record<string, number> | null }[],
): WorldState {
  validateStoryPolicy(policy);
  // Existing field values remain editable while definition authoring is locked.
  // docs/architecture.md#invention-policy-boundary
  if (canonicalJson(policy) !== canonicalJson(world.storyPolicy)) {
    const permission = inventionPermission(world, {
      origin: 'player',
      policyRevision: world.inventionPolicy.revision,
    });
    if (!permission.ok) throw new Error(permission.message);
  }
  return updateWorld(world, (draft) => {
    draft.storyPolicy = structuredClone(policy);
    for (const change of changes) {
      const entity = draft.entities[change.entityId];
      if (!entity) throw new Error('Unknown story entity.');
      entity.mechanismFields ??= {};
      if (change.values === null) delete entity.mechanismFields[policy.id];
      else entity.mechanismFields[policy.id] = { ...change.values };
    }
    for (const entity of Object.values(draft.entities))
      for (const [name, value] of Object.entries(entity.mechanismFields?.[policy.id] ?? {})) {
        const f = policy.fields[name];
        if (!f || !f.appliesTo.includes(entity.actor || entity.animal ? 'actor' : 'object'))
          throw new Error('Unsupported story field for entity.');
        number(value, f.minimum, f.maximum);
      }
    draft.storyPolicyRevision = (draft.storyPolicyRevision ?? 0) + 1;
  });
}
