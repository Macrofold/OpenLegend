import { isSafeRecordId, hasRecordFields } from './records.js';
import {
  namePhrase,
  personPhrase,
  presentTense,
  parseNarrationToken,
  type PersonRole,
  type Named,
  type NameArticle,
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
  const named = (id: string): Named =>
    viewerId
      ? observerName(world, viewerId, id)
      : (world.entities[id] ?? { name: 'unidentified individual' });
  let text = '';
  for (const part of narration.parts) {
    if (typeof part === 'string') {
      text += part;
      continue;
    }
    if ('verb' in part) {
      text += presentTense(
        part.verb,
        viewerId === part.subjectId,
        named(part.subjectId).nameForm === 'plural',
      );
      continue;
    }
    const self = viewerId === part.entityId;
    const subject = named(part.entityId);
    const article = part.article ?? (viewerId ? 'indefinite' : 'definite');
    const value =
      part.role === 'name'
        ? namePhrase(subject, article)
        : personPhrase(subject, part.role, self, article);
    text +=
      (!text || /[.!?]\s*$/.test(text)) &&
      ((self && part.role !== 'name') || subject.nameForm !== 'proper')
        ? value[0]!.toUpperCase() + value.slice(1)
        : value;
  }
  return text;
}
/** World-authored templates retain their vocabulary; only grammatical participant tokens
 * are interpreted. Item/name text is inserted literally, never parsed as another template. */
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
    if (token.verb) {
      parts.push(
        value && 'id' in value
          ? presentVerb(value.id, token.verb)
          : presentTense(token.verb, false, value?.nameForm === 'plural'),
      );
    } else if (value && 'id' in value) {
      // Even explicit name tokens pass through observer identity, never global names.
      parts.push({
        entityId: value.id,
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
export function personalText(world: WorldState, actorId: string, text: string | Narration): string {
  return typeof text === 'string' ? text : renderNarration(world, text, actorId);
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
