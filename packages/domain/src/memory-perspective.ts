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
): string {
  const actor = world.entities[actorId];
  if (!actor?.actor) return text;
  const player = world.entities[controlledEntityId(world)];
  const named = (value: string) =>
    player ? value.replace(/\b(?:[Tt]he player|[Pp]layer|You)\b/g, () => player.name) : value;
  if (speech) {
    const separator = text.indexOf(':');
    if (separator < 0) return text;
    const speaker =
      sourceEntityId && world.entities[sourceEntityId]
        ? `${namePhrase(observerName(world, actorId, sourceEntityId), 'indefinite', { capitalize: true })} said`
        : 'An unidentified speaker said';
    return `${sourceEntityId === actorId ? 'I said' : speaker}${text.slice(separator)}`;
  }
  // Quoted testimony keeps the speaker's exact words, including names/pronouns.
  return text
    .split(/("[^"\n]*"|“[^”\n]*”)/g)
    .map((part, index) => {
      if (index % 2) return part;
      let result = named(part);
      // Without event attribution, keep third-person wording.
      if (sourceEntityId !== actorId) {
        const source = sourceEntityId ? world.entities[sourceEntityId] : undefined;
        if (index === 0 && source)
          result = result.replace(
            new RegExp(
              `^(?:${[...new Set([namePhrase(source, 'definite', { capitalize: true }), source.name])].map(escape).join('|')})(?=\\s|[.,:’']|$)`,
            ),
            namePhrase(observerName(world, actorId, source.id), 'indefinite', {
              capitalize: true,
            }),
          );
        return result;
      }
      const names = patterns(actor);
      // Only the leading native subject is known to be the event source.
      // Later occurrences may name a different entity with the same label.
      if (index === 0) {
        result = result.replace(names.possessive, 'my');
        result = result.replace(names.subject, 'I');
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
