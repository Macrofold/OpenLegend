import { useState } from 'react';

type Account = { actorId: string; text: string; modality: string };
export type PastEvent = {
  at: number;
  text: string;
  perspectives: Account[];
  expectedOrdinal: number;
};

export function PastEventEditor({
  people,
  now,
  ordinal,
  disabled,
  draft,
  change,
  apply,
}: {
  people: { id: string; name: string }[];
  now: number;
  ordinal: number;
  disabled: boolean;
  draft?: PastEvent;
  change(draft?: PastEvent): void;
  apply(): void;
}) {
  const [open, setOpen] = useState(false);
  const entry = draft ?? { at: now, expectedOrdinal: ordinal, text: '', perspectives: [] };
  const update = (values: Partial<PastEvent>) => change({ ...entry, ...values });
  return (
    <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>Add a past event</summary>
      <fieldset disabled={disabled}>
        <label>
          Time in scenario seconds{' '}
          <input
            type="number"
            min={0}
            max={now}
            step="any"
            value={Number.isFinite(entry.at) ? entry.at : ''}
            onChange={(event) => update({ at: event.target.valueAsNumber })}
          />
        </label>
        <label>
          What happened{' '}
          <textarea value={entry.text} onChange={(event) => update({ text: event.target.value })} />
        </label>
        <p>
          Only the people you select receive a personal account. Each person remembers their own
          wording.
        </p>
        {people.map((person) => {
          const account = entry.perspectives.find((row) => row.actorId === person.id);
          const others = entry.perspectives.filter((row) => row.actorId !== person.id);
          const replace = (next?: Account) =>
            update({ perspectives: next ? [...others, next] : others });
          return (
            <fieldset key={person.id}>
              <legend>
                <label>
                  <input
                    type="checkbox"
                    checked={!!account}
                    onChange={(event) =>
                      replace(
                        event.target.checked
                          ? { actorId: person.id, modality: 'observed', text: '' }
                          : undefined,
                      )
                    }
                  />{' '}
                  {person.name}
                </label>
              </legend>
              {account && (
                <>
                  <select
                    aria-label={person.name + ' sense'}
                    value={account.modality}
                    onChange={(e) => replace({ ...account, modality: e.target.value })}
                  >
                    {['observed', 'heard', 'felt', 'internal'].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <label>
                    Personal account{' '}
                    <textarea
                      value={account.text}
                      onChange={(e) => replace({ ...account, text: e.target.value })}
                    />
                  </label>
                </>
              )}
            </fieldset>
          );
        })}
        <button
          disabled={
            !entry.text.trim() ||
            !(entry.at >= 0 && entry.at <= now) ||
            entry.perspectives.some(
              (p) => !p.text.trim() || !people.some((actor) => actor.id === p.actorId),
            )
          }
          onClick={apply}
        >
          Add to history
        </button>
        {draft && <button onClick={() => change(undefined)}>Discard event draft</button>}
      </fieldset>
    </details>
  );
}
