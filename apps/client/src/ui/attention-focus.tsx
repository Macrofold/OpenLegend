import { useEffect, useRef, useState } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import type { ApiResult, EntityView, GameView } from '@open-legend/protocol';
import { post } from '../api';
import { LoadingIndicator } from '../design-system/loading';

/** A deliberate preference uses received subjects, independently from camera or
 * ordinary object inspection. No automatic request on selection/render. */
export function AttentionFocus({
  subject,
  view,
  connected,
}: {
  subject: EntityView;
  view: GameView;
  connected: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const pending = useRef(false);
  const alive = useRef(true);
  const identity = JSON.stringify([
    view.worldId,
    view.saveTimeline,
    view.access?.scope,
    subject.id,
  ]);
  const current = useRef(identity);
  current.current = identity;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function choose() {
    if (pending.current || !connected || !view.access?.controlling || view.clock.paused) return;
    pending.current = true;
    setBusy(true);
    setMessage('');
    const captured = current.current;
    try {
      const answer = await post<ApiResult>('/api/attention', {
        targetId: subject.attentionPreference ? null : subject.id,
      });
      if (alive.current && current.current === captured) setMessage(answer.message);
    } catch (error) {
      if (alive.current && current.current === captured)
        setMessage(error instanceof Error ? error.message : 'Focus could not be changed.');
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  }
  if (subject.attentionPreference === undefined) return null;
  return (
    <>
      <AriaButton
        data-picker-row
        className="ol-item"
        isDisabled={!connected || !view.access?.controlling || view.clock.paused || busy}
        onPress={() => void choose()}
      >
        <span>{subject.attentionPreference ? 'Stop focusing here' : 'Focus here'}</span>
      </AriaButton>
      {view.clock.paused && <p className="ol-meta">Resume the world to change focus.</p>}
      <LoadingIndicator active={busy} label="Changing focus" />
      {message && (
        <p className="ol-meta" role="status">
          {message}
        </p>
      )}
    </>
  );
}
