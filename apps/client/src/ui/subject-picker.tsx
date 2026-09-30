import { useEffect, useRef, useState } from 'react';
import type { MindSubject, MindSubjectPage } from '@open-legend/protocol';
import { post } from '../api';
import { SelectField } from '../design-system/components';

type SubjectResult = MindSubjectPage | { ok: false; message?: string };

export function subjectPath(owned: boolean): string {
  return owned ? '/api/mind/subjects' : '/api/god/mind/subjects';
}

/** Server-searched subject choice for private notes/feelings. The server searches only the
 * inspected character's own labels, so typing a hidden name cannot reveal anyone.
 * docs/limits/interface.md#qu11 */
export function SubjectPicker({
  actorId,
  owned,
  label,
  none,
  value,
  onSelect,
  onlyRecognized = false,
  disabled = false,
}: {
  actorId: string;
  owned: boolean;
  label: string;
  /** Fixed first choice, such as General knowledge. */
  none: string;
  value: MindSubject | null;
  onSelect(subject: MindSubject | null): void;
  /** Notes-only subjects stay visible but cannot be chosen. */
  onlyRecognized?: boolean;
  disabled?: boolean;
}) {
  const [text, setText] = useState(value?.label ?? none);
  const [results, setResults] = useState<MindSubject[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);
  // The input shows the current choice after selection; that label is not a search.
  const query = text === (value?.label ?? none) ? '' : text.trim();
  const load = (after?: string) => {
    const id = ++request.current;
    setLoading(true);
    void post<SubjectResult>(subjectPath(owned), {
      actorId,
      query: query.slice(0, 120),
      ...(after ? { after } : {}),
    })
      .then((result) => {
        if (id !== request.current) return;
        if (!result.ok) {
          setError(result.message ?? 'People are unavailable.');
          return;
        }
        setError('');
        // A person can move between status groups while pages load; list them once.
        setResults((current) => {
          if (!after) return result.subjects;
          const seen = new Set(current.map((subject) => subject.id));
          return [...current, ...result.subjects.filter((subject) => !seen.has(subject.id))];
        });
        setNext(result.next);
      })
      .catch((failure) => {
        if (id === request.current) setError(String(failure));
      })
      .finally(() => {
        if (id === request.current) setLoading(false);
      });
  };
  // A refreshed label (for example after naming someone) replaces the shown choice text.
  useEffect(() => setText(value?.label ?? none), [value?.id, value?.label]);
  // 150 ms matches the inventory search debounce (QU15).
  useEffect(() => {
    // Drop the previous query's rows at once so keyboard selection cannot pick a stale match.
    setResults([]);
    setNext(null);
    setLoading(true);
    const timer = setTimeout(() => load(), 150);
    return () => {
      clearTimeout(timer);
      request.current++;
    };
  }, [query, actorId, owned]);
  // The current choice stays first with its freshest label; React Aria needs it in the list.
  const choices = value
    ? [value, ...results.filter((subject) => subject.id !== value.id)]
    : results;
  return (
    <>
      <SelectField
        label={label}
        value={value?.id ?? ''}
        placement="bottom start"
        placeholder="Search people this character knows…"
        toggleLabel={`Show ${label.toLowerCase()} choices`}
        inputValue={text}
        onInputChange={setText}
        loading={loading}
        onLoadMore={next && !loading ? () => load(next) : undefined}
        disabledKeys={[
          ...(disabled ? ['', ...choices.map((subject) => subject.id)] : []),
          ...(onlyRecognized
            ? choices.filter((subject) => subject.status === 'notes-only').map((s) => s.id)
            : []),
        ]}
        options={[
          { id: '', label: none },
          ...choices.map((subject) => ({
            id: subject.id,
            label: subject.label,
            description: subject.detail,
          })),
        ]}
        onChange={(id) => {
          // Both text and selection are controlled, so React Aria leaves syncing the text to
          // us on selection and on blur (which re-reports the current key).
          const subject = id ? (choices.find((choice) => choice.id === id) ?? null) : null;
          setText(subject?.label ?? none);
          onSelect(subject);
        }}
      />
      {/* The fixed first choice keeps the list non-empty, so a failed search is said here. */}
      <p className="ol-meta" role="status">
        {query && !loading && !error && !results.length
          ? `No one this character knows matches “${query}”.`
          : ''}
      </p>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
