import type { WorldState, WorldEvent } from '../../types.js';

export const COMMITMENT_ADMISSION_LIMIT = 16;
export function recognizePromise(
  world: WorldState,
  event: WorldEvent,
): { completion?: { eventType: string; definitionId: string } } | undefined {
  if (
    event.type !== 'speech' ||
    !event.actorId ||
    !/^I promise to\s+\S/i.test(String(event.data?.['text'] ?? ''))
  )
    return;
  const words = String(event.data?.['text'] ?? '')
    .trim()
    .replace(/[.!]$/, '');
  const named = /^I promise to gather (.+)$/i.exec(words)?.[1]?.toLowerCase();
  if (!named) return {};
  const definitions = Object.values(world.itemDefinitions).filter(
    (definition) =>
      definition.id.replaceAll('_', ' ').toLowerCase() === named ||
      definition.name.toLowerCase() === named,
  );
  return definitions.length === 1
    ? { completion: { eventType: 'gathered', definitionId: definitions[0]!.id } }
    : {};
}
