import { cleanTypedActionText } from './typed-action-text.js';
export { cleanTypedActionText } from './typed-action-text.js';
import {
  parseTypedNavigation,
  typedNavigationDescription,
  type TypedNavigationPrepared,
  type TypedNavigationSyntax,
} from './typed-navigation.js';
import {
  typedPointGrammar,
  typedRelativeFormat as relativeFormat,
  typedStop,
  type ActionFulfillment,
  type ResolutionCategory,
} from '@open-legend/domain';
import type { SurfacePoint } from '@open-legend/spatial';

/** Pure lexical facts shared by the Source binder and native preparation.
 * Matching a phrase supplies no target, route, admission or executable effect. */
export type FreeTypedActionSyntax =
  | { readonly kind: 'unsupported'; readonly family: 'compose' | 'movement-wait' | 'wait' }
  | TypedNavigationSyntax
  | {
      readonly kind: 'stop';
      readonly activity: 'following' | 'gathering' | 'moving' | 'walking' | null;
    }
  | {
      readonly kind: 'point';
      readonly x: number;
      readonly z: number;
      readonly surfaceId: string | null;
    }
  | { readonly kind: 'offset'; readonly x: number; readonly z: number }
  | { readonly kind: 'distance-needed' };

const relative = typedPointGrammar.relative;
const directions: Readonly<Record<string, readonly number[]>> = relative.directions;
const number = '(-?[0-9]+(?:\\.[0-9]+)?)';
const [x, z] = typedPointGrammar.axes;
const point = new RegExp(
  `^(?:${typedPointGrammar.verbs.join('|')})(?: ${typedPointGrammar.destination})? +(?:${x} *= *)?${number} *, *(?:${z} *= *)?${number}(?: +(?:${typedPointGrammar.support.join('|')}) +([a-z0-9_:-]+))?$`,
  'u',
);
const part = `(?:(\\d+(?:\\.\\d+)?) ?(?:${relative.units.join('|')})? )?(${Object.keys(directions).join('|')})`;
const offset = new RegExp(
  `^(?:${relative.verbs.join('|')}) ${part}(?: (?:${relative.sameClauseJoin}|then) ${part})?$`,
  'u',
);

/** Input is one already-cleaned clause in Source's bounded composition parser. */
export function parseFreeTypedActionClause(text: string): FreeTypedActionSyntax | null {
  const activity = typedStop(text);
  if (activity !== undefined) return { kind: 'stop', activity };
  const selected = point.exec(text);
  if (selected)
    return {
      kind: 'point',
      x: Number(selected[1]),
      z: Number(selected[2]),
      surfaceId: selected[3] ?? null,
    };
  const moved = offset.exec(text);
  if (!moved) {
    const navigation = parseTypedNavigation(text);
    if (navigation) return navigation;
    if (
      /^(?:wait|rest|stay|keep watch)(?: here)?(?: until .+| \d+ (?:minutes?|mins?|hours?))?$/u.test(
        text,
      )
    )
      return { kind: 'unsupported', family: 'wait' };
    return null;
  }
  const stepping = text.startsWith(relative.implicitDistanceVerb);
  let x = 0,
    z = 0;
  for (const [amount, direction] of [
    [moved[1], moved[2]],
    [moved[3], moved[4]],
  ] as const) {
    if (!direction) continue;
    if (amount === undefined && !stepping) return { kind: 'distance-needed' };
    const metres = amount === undefined ? 1 : Number(amount);
    const [right, forward] = directions[direction]!;
    x += right! * metres;
    z += forward! * metres;
  }
  return { kind: 'offset', x, z };
}
/** Compositions retain Source's separate all-clause binder. This free route
 * cannot silently execute the recognized prefix of a multi-step request. */
export function parseFreeTypedActionSyntax(text: string): FreeTypedActionSyntax | null {
  const cleaned = cleanTypedActionText(text);
  const clauses = cleaned.split(/\s*(?:,\s*(?:and\s+)?then|\s+and\s+then|\s+then|;)\s+/u);
  if (clauses.length === 1) return parseFreeTypedActionClause(cleaned);
  return clauses.length > 4 ||
    clauses.every((clause) => parseFreeTypedActionClause(clause) !== null)
    ? { kind: 'unsupported', family: 'compose' }
    : null;
}

export function typedActionFulfillment(
  requested: string,
  description: string,
  unmet: readonly string[],
  omitted: ActionFulfillment['omitted'] = [],
  confirm = false,
): ActionFulfillment {
  const missing = [
    ...omitted,
    ...unmet.map((requirement) => ({
      requirement,
      reason: 'The typed native action cannot keep this requested detail.',
    })),
  ];
  return {
    requested,
    executableDescription: description.slice(0, 1000),
    verdict: confirm || unmet.length > 0 ? 'confirm' : missing.length ? 'partial' : 'exact',
    supported: [description.slice(0, 500)],
    omitted: missing.slice(0, 8),
    reason: confirm || unmet.length > 0 ? relativeFormat.confirm : relativeFormat.complete,
  };
}
export function typedInvocationRefusal(
  outcome: { readonly code: string; readonly message: string },
  limits: {
    readonly minimumDistance: number;
    readonly maximumDistance: number;
    readonly offset: number;
  },
) {
  return {
    category: (['ambiguous-destination', 'invalid-invocation'].includes(outcome.code)
      ? 'needs_clarification'
      : 'blocked') as ResolutionCategory,
    reason:
      outcome.code === 'invalid-invocation'
        ? `${relativeFormat.outsidePrefix}${limits.minimumDistance}–${limits.maximumDistance}${relativeFormat.outsideOffsets}${limits.offset}${relativeFormat.outsideSuffix}`
        : outcome.message,
  };
}
export type FreeTypedActionPrepared =
  | { readonly kind: 'unsupported'; readonly family: string }
  | TypedNavigationPrepared
  | { readonly kind: 'unknown' }
  | {
      readonly kind: 'named-refused';
      readonly category: ResolutionCategory;
      readonly reason: string;
    }
  | { readonly kind: 'stop' }
  | { readonly kind: 'point'; readonly destination: SurfacePoint }
  | {
      readonly kind: 'offset';
      readonly x: number;
      readonly z: number;
      readonly destination: SurfacePoint;
    }
  | { readonly kind: 'not-stopping'; readonly activity: string }
  | { readonly kind: 'distance-needed' }
  | {
      readonly kind: 'invocation-refused' | 'preview-refused';
      readonly outcome: { readonly code: string; readonly message: string };
    };

export function freeTypedActionDescription(
  value: Extract<FreeTypedActionPrepared, { kind: 'stop' | 'point' | 'offset' }>,
): string {
  const at = (point: SurfacePoint) =>
    `x=${Number(point.x.toFixed(1))}, z=${Number(point.z.toFixed(1))}`;
  if (value.kind === 'stop') return 'Stop current work; materials already used stay spent.';
  if (value.kind === 'point')
    return `Walk to ${at(value.destination)} on ${value.destination.surfaceId}.`;
  const format = relativeFormat;
  const axes = [
    value.x ? `${Math.abs(value.x)}${format.unit}${value.x > 0 ? format.right : format.left}` : '',
    value.z
      ? `${Math.abs(value.z)}${format.unit}${value.z > 0 ? format.forward : format.back}`
      : '',
  ];
  return `${format.walk}${axes.filter(Boolean).join(format.join)}${format.destination}${at(value.destination)}.`;
}

/** Native supplies only its already-bound command's finite result. This shared
 * renderer neither binds coordinates nor reviews physical permission. */
export function formatFreeTypedActionPreparation(request: {
  readonly requested: string;
  readonly prepared: FreeTypedActionPrepared;
  readonly unmet: readonly string[];
  readonly limits: {
    readonly minimumDistance: number;
    readonly maximumDistance: number;
    readonly offset: number;
  };
}) {
  const value = request.prepared;
  if (value.kind === 'unknown') return { fulfillment: null, resolution: null };
  let resolution: { category: ResolutionCategory; reason: string } | undefined;
  if (value.kind === 'unsupported')
    resolution = {
      category: 'unsupported_capability',
      reason: 'That complete activity is not available; nothing was started.',
    };
  else if (value.kind === 'named-refused')
    resolution = { category: value.category, reason: value.reason };
  else if (value.kind === 'not-stopping')
    resolution = {
      category: 'needs_clarification',
      reason: `You are not ${value.activity} right now; nothing was stopped.`,
    };
  else if (value.kind === 'distance-needed')
    resolution = {
      category: 'needs_clarification',
      reason: relativeFormat.distanceNeeded,
    };
  else if (value.kind === 'invocation-refused')
    resolution = typedInvocationRefusal(value.outcome, request.limits);
  else if (value.kind === 'preview-refused')
    resolution = {
      category: ['unsupported-body', 'unsupported', 'unsupported-capability'].includes(
        value.outcome.code,
      )
        ? 'unsupported_capability'
        : 'blocked',
      reason: value.outcome.message,
    };
  if (resolution)
    return {
      fulfillment: null,
      resolution: { ...resolution, reason: resolution.reason.slice(0, 500) },
    };
  const description =
    value.kind === 'approach' || value.kind === 'last-seen'
      ? typedNavigationDescription(value)
      : value.kind === 'stop' || value.kind === 'point' || value.kind === 'offset'
        ? freeTypedActionDescription(value)
        : undefined;
  if (description === undefined)
    throw new Error('The typed native preparation has no rendered result.');
  return {
    fulfillment: typedActionFulfillment(request.requested, description, request.unmet),
    resolution: null,
  };
}
