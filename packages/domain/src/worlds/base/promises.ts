import type { WorldState, WorldEvent } from '../../types.js';

/** Native occurrence names remain open; a removed world behavior cannot be
 * promised as an automatic completion. Presentation is only a partial view.
 * docs/projects/bookkeeping-simplification-tech-design.md#bk29-e--remove-generic-animal-announcements-and-private-invalidation */
export function allowsCommitmentCompletion(eventType: string): boolean {
  return eventType !== 'animal-response';
}

export const BASE_PROMISE_RULES = {
  id: 'base:spoken-promises',
  version: 1,
  limit: 16,
  speechEvent: 'speech',
  completionEvent: 'gathered',
  admissionPrefix: 'I promise to',
  gatherPrefix: 'I promise to gather ',
  ignoredTerminalPunctuation: ['.', '!'],
  itemIdSeparator: '_',
  itemIdSeparatorReplacement: ' ',
  importance: 10,
  summaryPrefix: 'said: ',
} as const;

/** The literal phrase belongs to this world; whitespace and line handling use
 * the same ordinary JavaScript grammar as speech text. */
function beginsWithPhrase(text: string, phrase: string): boolean {
  return text.slice(0, phrase.length).toLowerCase() === phrase.toLowerCase();
}

export function nativePromiseDefinitions(world: Pick<WorldState, 'itemDefinitions'>) {
  return Object.values(world.itemDefinitions).map((definition) => ({
    id: definition.id,
    normalizedId: definition.id
      .replaceAll(BASE_PROMISE_RULES.itemIdSeparator, BASE_PROMISE_RULES.itemIdSeparatorReplacement)
      .toLowerCase(),
    normalizedName: definition.name.toLowerCase(),
  }));
}

export function recognizePromise(
  world: WorldState,
  event: WorldEvent,
): { completion?: { eventType: string; definitionId: string } } | undefined {
  if (
    event.type !== BASE_PROMISE_RULES.speechEvent ||
    !event.actorId ||
    !beginsWithPhrase(String(event.data?.['text'] ?? ''), BASE_PROMISE_RULES.admissionPrefix) ||
    !/^\s+\S/.test(
      String(event.data?.['text'] ?? '').slice(BASE_PROMISE_RULES.admissionPrefix.length),
    )
  )
    return;
  let words = String(event.data?.['text'] ?? '').trim();
  if (BASE_PROMISE_RULES.ignoredTerminalPunctuation.some((mark) => words.endsWith(mark)))
    words = words.slice(0, -1);
  const suffix = beginsWithPhrase(words, BASE_PROMISE_RULES.gatherPrefix)
    ? words.slice(BASE_PROMISE_RULES.gatherPrefix.length)
    : undefined;
  const named = suffix && !/[\n\r\u2028\u2029]/.test(suffix) ? suffix.toLowerCase() : undefined;
  if (!named) return {};
  const definitions = Object.values(world.itemDefinitions).filter(
    (definition) =>
      definition.id
        .replaceAll(
          BASE_PROMISE_RULES.itemIdSeparator,
          BASE_PROMISE_RULES.itemIdSeparatorReplacement,
        )
        .toLowerCase() === named || definition.name.toLowerCase() === named,
  );
  return definitions.length === 1
    ? {
        completion: {
          eventType: BASE_PROMISE_RULES.completionEvent,
          definitionId: definitions[0]!.id,
        },
      }
    : {};
}
