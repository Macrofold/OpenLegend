import type { ReactNode } from 'react';
import type { PublicEvent } from '@open-legend/protocol';
import { MechanicTerm } from '../design-system/components';

/** Links are based on occurrence-time admitted names, never current world identities. */
export function PerceivedEventText({
  event,
  inspectEntity,
}: {
  event: PublicEvent;
  inspectEntity?: (id: string) => void;
}) {
  const tokens: Array<{ label: string; render(text: string, key: number): ReactNode }> = [];
  if (inspectEntity && !event.descriptive)
    for (const ref of event.references ?? []) {
      if (
        !ref.label ||
        event.references?.some(
          (other) =>
            other.id !== ref.id &&
            other.label.toLocaleLowerCase() === ref.label.toLocaleLowerCase(),
        )
      )
        continue;
      tokens.push({
        label: ref.label,
        render: (text, key) => (
          <button
            key={key}
            type="button"
            className="ol-inline-reference"
            onClick={() => inspectEntity(ref.id)}
          >
            {text}
          </button>
        ),
      });
    }
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
  // Native speech attribution precedes the quotation. Words inside testimony are
  // not identity bindings, even when they repeat the speaker's or recipient's name.
  const quotedAt = event.speech ? text.indexOf(': “') : -1;
  const linkedText = quotedAt < 0 ? text : text.slice(0, quotedAt);
  const matches = tokens
    .flatMap((token) => {
      const literal = token.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(
        `(?<![\\p{L}\\p{N}\\p{M}_])${literal}(?![\\p{L}\\p{N}\\p{M}_])`,
        'giu',
      );
      return [...linkedText.matchAll(pattern)].map((match) => ({
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
