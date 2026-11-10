import { canonicalName } from '@open-legend/language';
import type { SurfacePoint } from '@open-legend/spatial';
import { cleanTypedActionText } from './typed-action-text.js';

export const typedBare = (name: string) =>
  canonicalName(cleanTypedActionText(name)).replace(
    /^(?:my|this|that|these|those|some|your)\s+/u,
    '',
  );
const forms = (name: string) => {
  const word = typedBare(name);
  return new Set([
    word,
    word.replace(/ies$/u, 'y'),
    word.replace(/ves$/u, 'fe'),
    word.replace(/ves$/u, 'f'),
    word.replace(/es$/u, ''),
    word.replace(/s$/u, ''),
  ]);
};
export const typedSameName = (a: string, b: string) => {
  const left = forms(a);
  return [...forms(b)].some((form) => left.has(form));
};
export const typedMatchLevel = (names: readonly string[], wanted: string) =>
  names.some((name) => typedSameName(name, wanted))
    ? 2
    : names.some((name) => typedSameName(typedBare(name).split(' ').at(-1) ?? '', wanted))
      ? 1
      : 0;
export function typedBest<T>(entries: readonly { value: T; level: number }[]): T[] {
  const top = Math.max(0, ...entries.map((entry) => entry.level));
  return top ? entries.filter((entry) => entry.level === top).map((entry) => entry.value) : [];
}
export const TYPED_DEICTIC: ReadonlySet<string> = new Set([
  'it',
  'this',
  'that',
  'them',
  'him',
  'her',
  'there',
]);
export type TypedNavigationSyntax = {
  readonly kind: 'approach' | 'last-seen';
  readonly name: string;
};
export function parseTypedNavigation(text: string): TypedNavigationSyntax | undefined {
  const returning =
    /^(?:go|move|walk|run|head|return)(?: back)? to (?:where|the (?:place|spot) where) (?:i|you|we) (?:last )?saw (.+)$/u.exec(
      text,
    ) ??
    /^(?:go|return|walk)(?: back)? to (.+?)(?:'s)? last(?: seen| known)? (?:place|position|location|spot)$/u.exec(
      text,
    );
  if (returning) return { kind: 'last-seen', name: returning[1]! };
  const going = /^(?:(?:go|move|walk|run|head)(?: over| up)? to|approach) (.+)$/u.exec(text);
  return going ? { kind: 'approach', name: going[1]! } : undefined;
}
export interface TypedNavigationRead {
  readonly actorId: string;
  readonly target: { readonly id: string; readonly label: string } | null;
  readonly sequence: boolean;
  readonly visible: readonly {
    readonly id: string;
    readonly label: string;
    readonly heat: boolean;
    readonly resourceNames: readonly string[];
  }[];
  readonly places: readonly {
    readonly subjectId: string;
    readonly label: string;
    readonly referenceCurrent: boolean;
    readonly at: number;
  }[];
  readonly vocabulary: {
    readonly heatSources: readonly string[];
    readonly beings: readonly string[];
  };
  readonly itemNames: readonly (readonly string[])[];
}
export type TypedNavigationDependency =
  | { readonly kind: 'visible' }
  | { readonly kind: 'target' }
  | { readonly kind: 'body'; readonly ordinal: number }
  | { readonly kind: 'place'; readonly ordinal: number };
export type TypedNavigationSelection =
  | { readonly kind: 'body' | 'place'; readonly ordinal: number }
  | {
      readonly kind: 'refused';
      readonly category: 'needs_clarification' | 'blocked';
      readonly reason: string;
      readonly depends: readonly TypedNavigationDependency[];
    }
  | { readonly kind: 'unknown' };
/** Name matching consumes only the offered actual body/place roster. Its
 * returned ordinals carry no command, point, episode or visibility authority. */
export function selectTypedNavigation(
  syntax: TypedNavigationSyntax,
  read: TypedNavigationRead,
): TypedNavigationSelection {
  const wanted = typedBare(syntax.name);
  const rank = (candidates: readonly number[]) =>
    typedBest(
      candidates.map((ordinal) => {
        const body = read.visible[ordinal]!;
        return {
          value: ordinal,
          level:
            (read.target?.id === body.id &&
              (TYPED_DEICTIC.has(wanted) || wanted.startsWith('this '))) ||
            body.id === syntax.name.trim()
              ? 3
              : Math.max(
                  typedMatchLevel([body.label], wanted),
                  body.heat && read.vocabulary.heatSources.includes(wanted) ? 2 : 0,
                  body.resourceNames.length ? typedMatchLevel(body.resourceNames, wanted) : 0,
                ),
        };
      }),
    );
  const visibleMatches = (other: boolean, selected = true) => {
    const candidates = read.visible.flatMap((body, ordinal) =>
      !other || body.id !== read.actorId ? [ordinal] : [],
    );
    if (!selected || !read.target) return rank(candidates);
    const own = rank(candidates.filter((ordinal) => read.visible[ordinal]!.id === read.target!.id));
    if (own.length || !read.sequence) return own;
    return fitsSelection() ? [] : rank(candidates);
  };
  const fitsSelection = () =>
    !!read.target &&
    rank(read.visible.flatMap((body, ordinal) => (body.id === read.target!.id ? [ordinal] : [])))
      .length > 0;
  const known = () =>
    ['pile', 'item', 'items'].includes(wanted) ||
    [...read.vocabulary.heatSources, ...read.vocabulary.beings].some((kind) =>
      typedSameName(kind, wanted),
    ) ||
    read.itemNames.some((names) => typedMatchLevel(names, wanted) > 0) ||
    read.visible.some((body) => typedMatchLevel([body.label], wanted) > 0) ||
    read.places.some((place) => typedMatchLevel([place.label], wanted) > 0);
  const capitalized = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
  const refused = (
    category: 'needs_clarification' | 'blocked',
    reason: string,
    depends: readonly TypedNavigationDependency[] = [],
  ): TypedNavigationSelection => ({ kind: 'refused', category, reason, depends });
  if (syntax.kind === 'last-seen') {
    const matches = typedBest(
      read.places.map((place, ordinal) => ({
        value: ordinal,
        level:
          read.target?.id === place.subjectId && TYPED_DEICTIC.has(wanted) && place.referenceCurrent
            ? 3
            : typedMatchLevel([place.label], wanted),
      })),
    );
    if (matches.length !== 1)
      return matches.length
        ? refused(
            'needs_clarification',
            `More than one remembered sighting matches "${wanted}"; select the one you mean.`,
            matches.map((ordinal) => ({ kind: 'place', ordinal })),
          )
        : known()
          ? refused('blocked', `There is no remembered sighting of "${wanted}" to return to.`)
          : { kind: 'unknown' };
    const subject = read.places[matches[0]!]!.subjectId;
    const ordinal = read.places.findIndex((place) => place.subjectId === subject);
    const place = read.places[ordinal]!;
    const stillSeen = place.referenceCurrent && read.visible.some((body) => body.id === subject);
    if (stillSeen && read.target && !read.sequence && read.target.id !== subject)
      return refused(
        'needs_clarification',
        `${capitalized(read.target.label)} is not the one you last saw (${place.label}); select that one, or clear the selection.`,
        [{ kind: 'target' }],
      );
    return { kind: 'place', ordinal };
  }
  const matches = visibleMatches(true);
  if (matches.length === 1) return { kind: 'body', ordinal: matches[0]! };
  if (matches.length)
    return refused(
      'needs_clarification',
      `More than one visible thing matches "${wanted}"; select the one to go to.`,
      matches.map((ordinal) => ({ kind: 'body', ordinal })),
    );
  if (read.target && (fitsSelection() || visibleMatches(true, false).length))
    return refused(
      'needs_clarification',
      fitsSelection()
        ? `${capitalized(read.target.label)} cannot be walked to; select something else, or clear the selection.`
        : `${capitalized(read.target.label)} does not match "${wanted}"; select a match, or clear the selection.`,
      [{ kind: 'target' }],
    );
  return known()
    ? refused('blocked', `Nothing called "${wanted}" is in view to go to.`, [{ kind: 'visible' }])
    : { kind: 'unknown' };
}
export type TypedNavigationPrepared =
  | { readonly kind: 'approach'; readonly label: string; readonly destination: SurfacePoint }
  | {
      readonly kind: 'last-seen';
      readonly label: string;
      readonly at: number;
      readonly stillSeen: boolean;
      readonly simTime: number;
      readonly destination: SurfacePoint;
    };
export function typedNavigationDescription(value: TypedNavigationPrepared): string {
  if (value.kind === 'approach')
    return `Walk near ${value.label}'s current position; this does not follow later movement.`;
  const at = (point: SurfacePoint) =>
    `x=${Number(point.x.toFixed(1))}, z=${Number(point.z.toFixed(1))}`;
  return value.stillSeen
    ? `Walk to ${value.label}, which is still in view (${at(value.destination)}). This does not track it.`
    : `Walk to where you last saw ${value.label} (${at(value.destination)}, ${Math.round((value.simTime - value.at) / 60)} min ago). This does not track it.`;
}
