import { observerDescription } from './worlds/base/knowledge.js';
import { controlledEntityId } from './identity.js';
import type { WorldState } from './types.js';

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Rephrase narration, never the contents of someone's attributed speech. */
export function memoryPerspective(
  world: WorldState,
  actorId: string,
  text: string,
  speech = false,
  sourceEntityId?: string,
): string {
  const actor = world.entities[actorId];
  if (!actor?.actor) return text;
  const player = world.entities[controlledEntityId(world)];
  const named = (value: string) =>
    player ? value.replace(/\b(?:[Tt]he player|[Pp]layer|You)\b/g, () => player.name) : value;
  if (speech) {
    const separator = text.indexOf(':');
    if (separator < 0) return text;
    const speaker = sourceEntityId && world.entities[sourceEntityId] ? `${observerDescription(world, actorId, sourceEntityId)} said` : 'An unidentified speaker said';
    return `${sourceEntityId === actorId ? 'I said' : speaker}${text.slice(separator)}`;
  }
  // Quoted testimony keeps the speaker's exact words, including names/pronouns.
  return text
    .split(/("[^"\n]*"|“[^”\n]*”)/g)
    .map((part, index) => {
      if (index % 2) return part;
      let result = named(part);
      // Attribution is evidence, not a name match; unknown legacy subjects stay in third person.
      if (sourceEntityId !== actorId) {
        const source = sourceEntityId ? world.entities[sourceEntityId] : undefined;
        if (index === 0 && source) result = result.replace(new RegExp(`^${escape(source.name)}(?=\\s|[.,:’'])`), observerDescription(world, actorId, source.id));
        return result;
      }
      const name = escape(actor.name);
      // Only the leading native subject is known to be the event source.
      // Later occurrences may name a different entity with the same label.
      if (index === 0) {
        result = result.replace(new RegExp(`^${name}['’]s\\b`), 'my');
        result = result.replace(new RegExp(`^${name}\\b`), 'I');
      }
      return result
        .replace(/\bI is\b/g, 'I am')
        .replace(/\bI has\b/g, 'I have')
        .replace(/\bI does\b/g, 'I do')
        .replace(
          /^I (nods|smiles|frowns|waves|shrugs|shakes|slaps)\b/,
          (_, verb: string) => `I ${verb.slice(0, -1)}`,
        )
        .replace(/^my\b/, 'My');
    })
    .join('');
}
