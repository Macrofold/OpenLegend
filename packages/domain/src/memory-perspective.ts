import type { WorldState } from './types.js';

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Rephrase narration, never the contents of someone's attributed speech. */
export function memoryPerspective(
  world: WorldState,
  actorId: string,
  text: string,
  speech = false,
): string {
  const actor = world.entities[actorId];
  if (!actor?.actor) return text;
  const player = world.entities['player'];
  const named = (value: string) =>
    player ? value.replace(/\b(?:[Tt]he player|[Pp]layer|You)\b/g, () => player.name) : value;
  if (speech) {
    const separator = text.indexOf(':');
    if (separator < 0) return text;
    const speaker = named(text.slice(0, separator));
    return `${speaker === actor.name ? 'I said' : speaker}${text.slice(separator)}`;
  }
  // Quoted testimony keeps the speaker's exact words, including names/pronouns.
  return text
    .split(/("[^"\n]*"|“[^”\n]*”)/g)
    .map((part, index) => {
      if (index % 2) return part;
      let result = named(part);
      const name = escape(actor.name);
      result = result.replace(new RegExp(`\\b${name}['’]s\\b`, 'g'), 'my');
      // Native narration uses past tense; legacy present-tense identity needs agreement.
      result = result.replace(
        new RegExp(`(^|[.!?]\\s+|\\band\\s+|\\bthat\\s+)${name}\\b`, 'g'),
        '$1I',
      );
      result = result.replace(
        new RegExp(`\\b(to|with|about|from|taught|met|revived|helped|saw) ${name}\\b`, 'g'),
        '$1me',
      );
      return result
        .replace(/\bI is\b/g, 'I am')
        .replace(/\bI has\b/g, 'I have')
        .replace(/\bI does\b/g, 'I do')
        .replace(/^my\b/, 'My');
    })
    .join('');
}
