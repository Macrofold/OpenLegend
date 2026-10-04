import { namePhrase, type Named } from '@open-legend/language';
import { observerName } from './worlds/base/knowledge.js';
import { controlledEntityId } from './identity.js';
import type { WorldState } from './types.js';

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A draft actor is stable during its observation burst; edits to its name invalidate
// the compiled patterns. Weak ownership avoids a process-wide cache of historical names.
const subjectPatterns = new WeakMap<
  object,
  { name: string; label: string; possessive: RegExp; subject: RegExp }
>();
function patterns(actor: Named) {
  const label = namePhrase(actor, 'definite', { capitalize: true });
  let cached = subjectPatterns.get(actor);
  if (!cached || cached.name !== actor.name || cached.label !== label) {
    const name = `(?:${[...new Set([label, actor.name])].map(escape).join('|')})`;
    cached = {
      name: actor.name,
      label,
      possessive: new RegExp(`^${name}['’]s\\b`),
      subject: new RegExp(`^${name}(?=\\s|[.,:’']|$)`),
    };
    subjectPatterns.set(actor, cached);
  }
  return cached;
}

/** Rephrase narration, never the contents of someone's attributed speech. */
export function memoryPerspective(
  world: WorldState,
  actorId: string,
  text: string,
  speech = false,
  sourceEntityId?: string,
  targetEntityId?: string,
  targetReference = false,
): string {
  const actor = world.entities[actorId];
  if (!actor?.actor) return text;
  const player = world.entities[controlledEntityId(world)];
  const named = (value: string) =>
    player ? value.replace(/\b(?:[Tt]he player|[Pp]layer|You)\b/g, () => player.name) : value;
  const source = sourceEntityId ? world.entities[sourceEntityId] : undefined;
  if (speech) {
    const prefix = source ? patterns(source).subject.exec(text)?.[0] : undefined;
    const separator = text.indexOf(':', prefix?.length ?? 0);
    if (separator < 0) return text;
    const speaker = source
      ? `${namePhrase(observerName(world, actorId, source.id), 'indefinite', { capitalize: true })} said`
      : 'An unidentified speaker said';
    return `${sourceEntityId === actorId ? 'I said' : speaker}${text.slice(separator)}`;
  }
  // Separate the attributed name before handling quotations/placeholders. A personal
  // name can contain quotes, "You", "Player" or dollar signs; all are literal name text.
  const self = sourceEntityId === actorId;
  const names = source && patterns(source);
  const possessive = self && names ? names.possessive.exec(text) : null;
  const prefix = possessive ?? names?.subject.exec(text);
  const subject =
    source && prefix
      ? self
        ? possessive
          ? 'My'
          : 'I'
        : namePhrase(observerName(world, actorId, source.id), 'indefinite', {
            capitalize: true,
          })
      : '';
  // Quoted testimony keeps the speaker's exact words, including names/pronouns.
  return text
    .slice(prefix?.[0].length ?? 0)
    .split(/("[^"\n]*"|“[^”\n]*”)/g)
    .map((part, index) => {
      if (index % 2) return part;
      let result = (index === 0 ? subject : '') + named(part);
      // Native events that mark this reference keep the canonical text neutral. Resolve
      // the target from the witness's knowledge, never from the target's global name.
      if (targetReference && targetEntityId && result.includes('the target'))
        result = result.replace(
          'the target',
          targetEntityId === actorId
            ? sourceEntityId === actorId
              ? 'myself'
              : 'me'
            : namePhrase(observerName(world, actorId, targetEntityId), 'indefinite'),
        );
      // Without event attribution, keep third-person wording.
      if (!self || index !== 0) return result;
      return result
        .replace(/^I is\b/, 'I am')
        .replace(/^I has\b/, 'I have')
        .replace(/^I does\b/, 'I do')
        .replace(
          /^I (nods|smiles|frowns|waves|shrugs|shakes|slaps)\b/,
          (_, verb: string) => `I ${verb.slice(0, -1)}`,
        );
    })
    .join('');
}
