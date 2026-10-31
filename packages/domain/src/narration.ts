import { entityGet } from './entity-collection.js';
import { isSafeRecordId, hasRecordFields, isImmutableData } from './records.js';
import {
  namePhrase,
  personPhrase,
  presentTense,
  parseNarrationToken,
  type PersonRole,
  type Named,
  type NameArticle,
  validName,
} from '@open-legend/language';
import { observerName } from './worlds/base/knowledge.js';
import type { Entity, WorldState } from './types.js';

export type { PersonRole } from '@open-legend/language';
export type NarrationPart =
  | string
  | {
      entityId: string;
      role: PersonRole | 'name';
      article?: NameArticle;
    }
  | { subjectId: string; verb: string };
/** Native grammar is structure; literal text (including quotations) is never reparsed.
 * docs/projects/compelling-characters-tech-design.md#shared-personal-presentation */
export interface Narration {
  parts: NarrationPart[];
}
/** Saved event-time grammar and permitted names. Rendering never looks up a later
 * entity or upgrades an unfamiliar participant with newly learned identity. */
export interface CapturedNarration {
  kind: 'captured-narration';
  narration: Narration;
  names: Record<string, Named>;
  selfId?: string;
  person: 'first' | 'second' | 'third';
}
export type NativeText = string | CapturedNarration;
const renderedNativeText = new WeakMap<CapturedNarration, string>();
export function nativeText(value: NativeText): string {
  if (typeof value === 'string') return value;
  const reusable = isImmutableData(value);
  const held = reusable && renderedNativeText.get(value);
  if (held !== false && held !== undefined) return held;
  const text = renderNarrationParts(
    value.narration,
    { selfId: value.selfId, names: new Map(Object.entries(value.names)) },
    value.person,
  );
  if (reusable) renderedNativeText.set(value, text);
  return text;
}
/** Capture permitted names once at the acquisition boundary. Literal strings
 * and quotations remain literal; this helper never reparses their contents. */
export function capturedNarration(
  narration: Narration,
  names: ReadonlyMap<string, Named>,
  selfId?: string,
): CapturedNarration {
  return {
    kind: 'captured-narration',
    narration,
    names: Object.fromEntries(
      [...names].map(([id, value]) => [
        id,
        {
          name: value.name,
          ...(value.nameForm ? { nameForm: value.nameForm } : {}),
          ...(value.indefiniteArticle ? { indefiniteArticle: value.indefiniteArticle } : {}),
        },
      ]),
    ),
    ...(selfId ? { selfId } : {}),
    person: selfId ? 'first' : 'third',
  };
}
export function validateNativeText(value: unknown): asserts value is NativeText {
  if (typeof value === 'string') return;
  if (
    !hasRecordFields(value, ['kind', 'narration', 'names', 'person'], ['selfId']) ||
    value.kind !== 'captured-narration' ||
    !['first', 'second', 'third'].includes(String(value.person)) ||
    (value.selfId !== undefined && !isSafeRecordId(value.selfId)) ||
    !value.names ||
    typeof value.names !== 'object' ||
    Array.isArray(value.names) ||
    Object.entries(value.names).some(([id, name]) => !isSafeRecordId(id) || !validName(name))
  )
    throw new Error('Invalid captured native wording.');
  validateNarration(value.narration);
  const names = value.names;
  if (
    value.narration.parts.some(
      (part) =>
        typeof part !== 'string' &&
        !Object.hasOwn(names, 'verb' in part ? part.subjectId : part.entityId),
    )
  )
    throw new Error('Captured native wording has no participant.');
}
export interface NarrationPerspective {
  selfId?: string;
  names: ReadonlyMap<string, Named>;
}
export const person = (
  entity: Entity | string,
  role: PersonRole = 'subject',
  article?: NameArticle,
): NarrationPart => ({
  entityId: typeof entity === 'string' ? entity : entity.id,
  role,
  ...(article ? { article } : {}),
});
export const presentVerb = (entity: Entity | string, verb: string): NarrationPart => ({
  subjectId: typeof entity === 'string' ? entity : entity.id,
  verb,
});
export function subjectNarration(
  subject: Entity | string,
  rest: string | NarrationPart[],
): Narration {
  return { parts: [person(subject), ' ', ...(typeof rest === 'string' ? [rest] : rest)] };
}
export function renderNarration(
  world: WorldState,
  narration: Narration,
  viewerId?: string,
): string {
  const names = new Map<string, Named>();
  for (const part of narration.parts) {
    if (typeof part === 'string') continue;
    const id = 'verb' in part ? part.subjectId : part.entityId;
    if (!names.has(id))
      names.set(
        id,
        viewerId
          ? observerName(world, viewerId, id)
          : (entityGet(world.entities, id) ?? { name: 'unidentified individual' }),
      );
  }
  return renderNarrationParts(narration, { selfId: viewerId, names }, viewerId ? 'first' : 'third');
}

/** Pure participant grammar; quotations and all other literal strings are appended unchanged. */
export function renderNarrationParts(
  narration: Readonly<Narration>,
  perspective: Readonly<NarrationPerspective>,
  grammaticalPerson: 'first' | 'second' | 'third',
): string {
  const named = (id: string): Named =>
    perspective.names.get(id) ?? { name: 'unidentified individual' };
  const personal = grammaticalPerson !== 'third';
  let text = '';
  for (const part of narration.parts) {
    if (typeof part === 'string') {
      text += part;
      continue;
    }
    if ('verb' in part) {
      text += presentTense(
        part.verb,
        personal && perspective.selfId === part.subjectId,
        named(part.subjectId).nameForm === 'plural',
        grammaticalPerson === 'second' ? 'second' : 'first',
      );
      continue;
    }
    const self = personal && perspective.selfId === part.entityId;
    const subject = named(part.entityId);
    const article = part.article ?? (personal ? 'indefinite' : 'definite');
    const value =
      part.role === 'name'
        ? namePhrase(subject, article)
        : personPhrase(
            subject,
            part.role,
            self,
            article,
            grammaticalPerson === 'second' ? 'second' : 'first',
          );
    text +=
      (!text || /[.!?]\s*$/.test(text)) &&
      ((self && part.role !== 'name') || subject.nameForm !== 'proper')
        ? value[0]!.toUpperCase() + value.slice(1)
        : value;
  }
  return text;
}
/** World-authored templates retain their vocabulary; only grammatical participant tokens
 * are interpreted. Entity bindings use observer identity; named values are inserted literally,
 * even when they carry definition IDs, and are never parsed as another template. */
export function narrationTemplate(
  template: string,
  bindings: Record<string, Entity | Named | undefined>,
): Narration {
  const parts: NarrationPart[] = [];
  let end = 0;
  for (const match of template.matchAll(/\{([^{}]*)\}/g)) {
    const token = parseNarrationToken(match[1]!);
    if (!token) continue;
    parts.push(template.slice(end, match.index));
    const value = bindings[token.binding];
    // Definition IDs identify content; only physical entities carry observer identity.
    const entity = value && 'kind' in value ? value : undefined;
    if (token.verb) {
      parts.push(
        entity
          ? presentVerb(entity.id, token.verb)
          : presentTense(token.verb, false, value?.nameForm === 'plural'),
      );
    } else if (entity) {
      // Even explicit name tokens pass through observer identity, never global names.
      parts.push({
        entityId: entity.id,
        role: token.role!,
        ...(token.article ? { article: token.article } : {}),
      });
    } else {
      const named = value ?? { name: 'unknown' };
      parts.push(
        token.role === 'name'
          ? namePhrase(named, token.article)
          : personPhrase(named, token.role!, false, token.article ?? 'none'),
      );
    }
    end = match.index + match[0].length;
  }
  parts.push(template.slice(end));
  return { parts };
}

/** Freeform authored/model text already belongs to its named owner. Do not guess its
 * grammar or rewrite quotations; native producers use structured narration instead. */
export function personalText(
  world: WorldState,
  actorId: string,
  text: NativeText | Narration,
): string {
  return typeof text === 'string' || 'kind' in text
    ? nativeText(text)
    : renderNarration(world, text, actorId);
}

/** Saved native structure is untrusted at import; validate before any observer renders it. */
export function validateNarration(value: unknown): asserts value is Narration {
  if (
    !hasRecordFields(value, ['parts']) ||
    !Array.isArray(value.parts) ||
    value.parts.some((part: unknown) => {
      if (typeof part === 'string') return false;
      if (hasRecordFields(part, ['subjectId', 'verb']))
        return (
          !isSafeRecordId(part.subjectId) ||
          typeof part.verb !== 'string' ||
          !/^[a-z]+$/.test(part.verb)
        );
      return (
        !hasRecordFields(part, ['entityId', 'role'], ['article']) ||
        !isSafeRecordId(part.entityId) ||
        !['name', 'subject', 'object', 'possessive', 'reflexive'].includes(String(part.role)) ||
        (part.article !== undefined &&
          !['none', 'indefinite', 'definite'].includes(String(part.article)))
      );
    })
  )
    throw new Error('Invalid native narration.');
}
