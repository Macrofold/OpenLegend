import { speechPresentation } from '@open-legend/language';
import type { PublicEvent } from '@open-legend/protocol';

/** Public event roles and original labels are the entire input. Opening a caption
 * or log cannot discover a name, recipient or current body. */
export function eventSpeechPresentation(
  event: PublicEvent & { speech: NonNullable<PublicEvent['speech']> },
  observerId: string,
) {
  const speech = event.speech;
  return speechPresentation({
    speaker: speech.speaker ? { ...speech.speaker, name: speech.speaker.nameAtTime } : null,
    addressee: speech.addressee ? { ...speech.addressee, name: speech.addressee.nameAtTime } : null,
    self: speech.perception === 'self',
    addressed: event.targetId === observerId,
    directed: speech.addressing === 'directed',
    seen: speech.perception === 'seen',
    intelligibility: speech.intelligibility,
    delivery: speech.delivery,
    words: speech.segments
      .map((segment) => (segment.kind === 'heard' ? segment.text : '[…]'))
      .join(' '),
    perspective: 'second',
  });
}
