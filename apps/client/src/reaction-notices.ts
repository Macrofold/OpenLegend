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
): { actorId: string; text: string; actor?: string } | null {
  if (event.type !== 'expression') return null;
  // An event can name a past participant without exposing their current body.
  // Only an explicit contact that is still in this view can anchor its caption.
  const actorId =
    event.actorId ??
    event.references?.find((reference) => reference.role === 'actor')?.contactReference;
  if (!actorId) return null;
  const self = actorId === view.player.id;
  const actor = self ? view.player : view.entities.find((entity) => entity.id === actorId);
  if (!actor) return null;
  // The server has already captured this viewer's permitted wording at occurrence time.
  if (event.descriptive)
    return {
      actorId,
      text: self ? event.text.replace(/^(?:I|You) /, () => `${actor.name} `) : event.text,
    };
  const gesture = GESTURES.find(([pattern]) => pattern.test(event.text))?.[1];
  if (!gesture) return null;
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
  return { actorId, text, actor: actor.name };
}
