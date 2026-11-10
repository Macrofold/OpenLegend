import type { ActionFulfillment, ResolutionCategory } from '@open-legend/domain';
import type { SurfacePoint } from '@open-legend/spatial';

/** Pure lexical facts shared by the Source binder and native preparation.
 * Matching a phrase supplies no target, route, admission or executable effect. */
export type FreeTypedActionSyntax =
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

export const cleanTypedActionText = (text: string) =>
  text
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .replace(/\s+/gu, ' ')
    .replace(/[.!]+$/u, '')
    .trim();
const directions: Readonly<Record<string, { readonly x: number; readonly z: number }>> = {
  forward: { x: 0, z: 1 },
  forwards: { x: 0, z: 1 },
  ahead: { x: 0, z: 1 },
  back: { x: 0, z: -1 },
  backward: { x: 0, z: -1 },
  backwards: { x: 0, z: -1 },
  left: { x: -1, z: 0 },
  right: { x: 1, z: 0 },
};
const number = '(-?\\d+(?:\\.\\d+)?)';
const point = new RegExp(
  `^(?:go|move|walk|run)(?: to)?\\s+(?:x\\s*=\\s*)?${number}\\s*,\\s*(?:z\\s*=\\s*)?${number}(?:\\s+(?:on|surface)\\s+([a-z0-9_:-]+))?$`,
  'u',
);
const part =
  '(?:(\\d+(?:\\.\\d+)?) ?(?:m|metres|meters|steps|units)? )?(forwards?|ahead|backwards?|back|left|right)';
const offset = new RegExp(`^(?:go|move|walk|step|run) ${part}(?: (?:and|then) ${part})?$`, 'u');

/** Input is one already-cleaned clause in Source's bounded composition parser. */
export function parseFreeTypedActionClause(text: string): FreeTypedActionSyntax | null {
  const stopping =
    /^(?:stop|cancel|halt)(?: (?:it|that|now|everything|what (?:i'?m|i am|you'?re) doing|working|(following|gathering|moving|walking)))?$/u.exec(
      text,
    );
  if (stopping) {
    const activity = stopping[1];
    if (
      activity === undefined ||
      activity === 'following' ||
      activity === 'gathering' ||
      activity === 'moving' ||
      activity === 'walking'
    )
      return { kind: 'stop', activity: activity ?? null };
  }
  const selected = point.exec(text);
  if (selected)
    return {
      kind: 'point',
      x: Number(selected[1]),
      z: Number(selected[2]),
      surfaceId: selected[3] ?? null,
    };
  const moved = offset.exec(text);
  if (!moved) return null;
  const stepping = text.startsWith('step');
  let x = 0,
    z = 0;
  for (const [amount, direction] of [
    [moved[1], moved[2]],
    [moved[3], moved[4]],
  ] as const) {
    if (!direction) continue;
    if (amount === undefined && !stepping) return { kind: 'distance-needed' };
    const metres = amount === undefined ? 1 : Number(amount),
      value = directions[direction]!;
    x += value.x * metres;
    z += value.z * metres;
  }
  return { kind: 'offset', x, z };
}
/** Compositions retain Source's separate all-clause binder. This free route
 * cannot silently execute the recognized prefix of a multi-step request. */
export function parseFreeTypedActionSyntax(text: string): FreeTypedActionSyntax | null {
  const cleaned = cleanTypedActionText(text);
  return cleaned.split(/\s*(?:,\s*(?:and\s+)?then|\s+and\s+then|\s+then|;)\s+/u).length === 1
    ? parseFreeTypedActionClause(cleaned)
    : null;
}

export function typedActionFulfillment(requested: string, description: string, unmet: readonly string[], omitted: ActionFulfillment['omitted'] = [], confirm = false): ActionFulfillment {
  const missing = [...omitted, ...unmet.map((requirement) => ({ requirement, reason: 'The typed native action cannot keep this requested detail.' }))];
  return {
    requested, executableDescription: description.slice(0, 1000),
    verdict: confirm || unmet.length > 0 ? 'confirm' : missing.length ? 'partial' : 'exact',
    supported: [description.slice(0, 500)], omitted: missing.slice(0, 8),
    reason: confirm || unmet.length > 0
      ? 'Accept only the shown native action; it does not keep every requested detail.'
      : 'Complete typed form bound without inference.',
  };
}
export function typedInvocationRefusal(outcome: { readonly code: string; readonly message: string }, limits: { readonly minimumDistance: number; readonly maximumDistance: number; readonly offset: number }) {
  return { category: (['ambiguous-destination', 'invalid-invocation'].includes(outcome.code) ? 'needs_clarification' : 'blocked') as ResolutionCategory,
    reason: outcome.code === 'invalid-invocation'
      ? `That request is outside what moving or following allows (distance ${limits.minimumDistance}–${limits.maximumDistance} m, offsets up to ${limits.offset} m).`
      : outcome.message };
}
export type FreeTypedActionPrepared =
  | { readonly kind: 'stop' }
  | { readonly kind: 'point'; readonly destination: SurfacePoint }
  | { readonly kind: 'offset'; readonly x: number; readonly z: number; readonly destination: SurfacePoint }
  | { readonly kind: 'not-stopping'; readonly activity: string }
  | { readonly kind: 'distance-needed' }
  | { readonly kind: 'invocation-refused' | 'preview-refused'; readonly outcome: { readonly code: string; readonly message: string } };

export function freeTypedActionDescription(value: Extract<FreeTypedActionPrepared, { kind: 'stop' | 'point' | 'offset' }>): string {
  const at = (point: SurfacePoint) => `x=${Number(point.x.toFixed(1))}, z=${Number(point.z.toFixed(1))}`;
  if (value.kind === 'stop') return 'Stop current work; materials already used stay spent.';
  if (value.kind === 'point') return `Walk to ${at(value.destination)} on ${value.destination.surfaceId}.`;
  return `Walk ${[value.x ? `${Math.abs(value.x)} m ${value.x > 0 ? 'right' : 'left'}` : '', value.z ? `${Math.abs(value.z)} m ${value.z > 0 ? 'forward' : 'back'}` : ''].filter(Boolean).join(' and ')} of your current facing, to ${at(value.destination)}.`;
}

/** Native supplies only its already-bound command's finite result. This shared
 * renderer neither binds coordinates nor reviews physical permission. */
export function formatFreeTypedActionPreparation(request: {
  readonly requested: string;
  readonly prepared: FreeTypedActionPrepared;
  readonly unmet: readonly string[];
  readonly limits: { readonly minimumDistance: number; readonly maximumDistance: number; readonly offset: number };
}) {
  const value = request.prepared;
  let resolution: { category: ResolutionCategory; reason: string } | undefined;
  if (value.kind === 'not-stopping') resolution = { category: 'needs_clarification', reason: `You are not ${value.activity} right now; nothing was stopped.` };
  else if (value.kind === 'distance-needed') resolution = { category: 'needs_clarification', reason: 'Say how far, for example "move 3 m left".' };
  else if (value.kind === 'invocation-refused') resolution = typedInvocationRefusal(value.outcome, request.limits);
  else if (value.kind === 'preview-refused') resolution = { category: ['unsupported-body', 'unsupported', 'unsupported-capability'].includes(value.outcome.code) ? 'unsupported_capability' : 'blocked', reason: value.outcome.message };
  if (resolution) return { fulfillment: null, resolution: { ...resolution, reason: resolution.reason.slice(0, 500) } };
  const description = value.kind === 'stop' || value.kind === 'point' || value.kind === 'offset'
    ? freeTypedActionDescription(value) : undefined;
  if (description === undefined) throw new Error('The typed native preparation has no rendered result.');
  return { fulfillment: typedActionFulfillment(request.requested, description, request.unmet), resolution: null };
}
