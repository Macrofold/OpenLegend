import type { GameView, PublicEvent } from '@open-legend/protocol';

// The accepted gesture vocabulary (packages/domain/src/response.ts expression verbs).
const GESTURES: [RegExp, string][] = [
  [/\bnods\b/, 'Nods'],
  [/\bsmiles\b/, 'Smiles'],
  [/\bfrowns\b/, 'Frowns'],
  [/\bwaves\b/, 'Waves'],
  [/\bshrugs\b/, 'Shrugs'],
  [/\bshakes their head\b/, 'Shakes their head'],
  [/\bslaps\b/, 'Slaps'],
];

/** Descriptive expression text is already viewer-permitted. Native gesture wording uses
 * this viewer's own labels (the player, or the target's projected name), never the
 * event text's target name, which can be a name this viewer has not learned.
 * docs/ui-design-brief.md#future-character-reactions */
export function reactionNotice(
  view: GameView,
  event: PublicEvent,
): { text: string; actor?: string } | null {
  if (event.type !== 'expression' || !event.actorId) return null;
  const actor =
    event.actorId === view.player.id
      ? view.player
      : view.entities.find((entity) => entity.id === event.actorId);
  // The server has already captured this viewer's permitted wording at occurrence time.
  if (actor && event.descriptive)
    return {
      text:
        event.actorId === view.player.id
          ? event.text.replace(/^(?:I|You) /, () => `${actor.name} `)
          : event.text,
    };
  const gesture = GESTURES.find(([pattern]) => pattern.test(event.text))?.[1];
  if (!actor || !gesture) return null;
  const target = !event.targetId
    ? null
    : event.targetId === view.player.id
      ? 'you'
      : (view.entities.find((entity) => entity.id === event.targetId)?.name ?? null);
  const text = !target
    ? gesture
    : gesture === 'Slaps'
      ? `Slaps ${target}`
      : `${gesture} toward ${target}`;
  return { text, actor: actor.name };
}
