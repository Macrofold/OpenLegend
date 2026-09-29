import { useEffect, useRef, useState } from 'react';
import type { ActivityHistoryPage } from '@open-legend/protocol';
import { post } from '../api';
import { Button, Section } from '../design-system/components';

/** Explicit private inspection. Nothing is fetched into the ordinary world view. */
export function ActivityHistory({ actorId, owned }: { actorId: string; owned: boolean }) {
  const [page, setPage] = useState<ActivityHistoryPage>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  const load = async (after = -1, methodAfter = 0) => {
    const sequence = ++request.current;
    setBusy(true);
    setError('');
    try {
      const result = await post<{ ok: boolean; message?: string; page?: ActivityHistoryPage }>(
        owned ? '/api/activity-history' : '/api/god/activity-history',
        { actorId, after, methodAfter },
      );
      if (sequence !== request.current) return;
      if (!result.ok || !result.page)
        throw new Error(result.message ?? 'Action history is unavailable.');
      setPage(result.page);
    } catch (error) {
      if (sequence === request.current) setError(String(error));
    } finally {
      if (sequence === request.current) setBusy(false);
    }
  };
  return (
    <Section title="My actions and learned activities">
      <Button
        isDisabled={busy}
        onPress={() => {
          void load();
        }}
      >
        Inspect from the beginning
      </Button>
      {error && (
        <p role="alert" className="ol-prose">
          {error}
        </p>
      )}
      {page && (
        <>
          <p className="ol-prose">{page.learningStatus}</p>
          <p className="ol-caption">
            Recorded attempts describe what happened then. They do not promise the same result now.
          </p>
          {page.entries.map((entry, index) => (
            <p className="ol-prose" key={index}>
              {entry.text}
            </p>
          ))}
          {!page.entries.length && <p className="ol-meta">No permitted actions on this page.</p>}
          {page.next !== null && (
            <Button
              isDisabled={busy}
              onPress={() => {
                void load(page.next!);
              }}
            >
              Next actions
            </Button>
          )}
          <details>
            <summary>Personally learned activities</summary>
            {page.methods.map((method, index) => (
              <p className="ol-prose" key={index}>
                {method.text}. {method.status}.
              </p>
            ))}
            {page.methodNext !== null && (
              <Button
                isDisabled={busy}
                onPress={() => {
                  void load(-1, page.methodNext!);
                }}
              >
                Next learned activities
              </Button>
            )}
            {!page.methods.length && <p className="ol-meta">No activities learned yet.</p>}
          </details>
        </>
      )}
    </Section>
  );
}
