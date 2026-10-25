import type { ReactNode } from 'react';
import type { PublicEvent } from '@open-legend/protocol';
import { MechanicTerm } from '../design-system/components';

/** Occurrence text retains its admitted wording; source inspection is owned by Events. */
export function PerceivedEventText({ event }: { event: PublicEvent }) {
  // Speech participants and literal quotations were already composed from the
  // acquired typed roles. A quoted name never creates a current-person link.
  if (event.speech) return <>{event.text}</>;
  const tokens: Array<{ label: string; render(text: string, key: number): ReactNode }> = [];
  const change = event.attributeChange;
  if (change?.name && change.meaning)
    tokens.push({
      label: change.name,
      render: (text, key) => (
        <MechanicTerm key={key} label={change.name!} explanation={change.meaning}>
          {text}
        </MechanicTerm>
      ),
    });
  if (change?.cause && change.causeMeaning)
    tokens.push({
      label: change.cause,
      render: (text, key) => (
        <MechanicTerm key={key} label={change.cause!} explanation={change.causeMeaning}>
          {text}
        </MechanicTerm>
      ),
    });
  // Literal, whole-term matching never links “Ada” inside “Canada”, and regex
  // offsets retain the original text even when Unicode case folding changes length.
  const text = event.text;
  const matches = tokens
    .flatMap((token) => {
      const literal = token.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(
        `(?<![\\p{L}\\p{N}\\p{M}_])${literal}(?![\\p{L}\\p{N}\\p{M}_])`,
        'giu',
      );
      return [...text.matchAll(pattern)].map((match) => ({
        index: match.index,
        text: match[0],
        token,
      }));
    })
    .sort((a, b) => a.index - b.index || b.text.length - a.text.length);
  const pieces: ReactNode[] = [];
  let offset = 0;
  for (const match of matches) {
    if (match.index < offset) continue;
    if (match.index > offset) pieces.push(text.slice(offset, match.index));
    pieces.push(match.token.render(match.text, match.index));
    offset = match.index + match.text.length;
  }
  if (offset < text.length) pieces.push(text.slice(offset));
  return <>{pieces}</>;
}
