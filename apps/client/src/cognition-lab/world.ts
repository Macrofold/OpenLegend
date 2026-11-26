import { useCallback, useEffect, useRef, useState } from 'react';
import type { GamePatch, GameView } from '@open-legend/protocol';
import {
  AccessError,
  SignInRequiredError,
  LabUnavailableError,
  acceptAccess,
  applyGamePatch,
  clearAccess,
  eventsUrl,
  getState,
  invalidateStreamAccess,
  startPresence,
} from '../api';
import { browserSubscription } from '../browser-network';
import { onTabNotice } from '../tab-session';

/** Reading a Lab view opens no control or presence. The native event stream creates presence only for the explicit controller. */
export function useLabWorld() {
  const [view, setView] = useState<GameView>();
  const [error, setError] = useState('');
  const [current, setCurrent] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [revision, setRevision] = useState(0);
  const latest = useRef<GameView | undefined>(undefined);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    const show = (next: GameView) => {
      if (signal.aborted) return;
      acceptAccess(next);
      setUnavailable(false);
      setSignedOut(false);
      latest.current = next;
      setView(next);
      setCurrent(true);
      setError('');
    };
    const withdraw = (message: string, interrupted = false) => {
      if (signal.aborted) return;
      if (interrupted && latest.current) invalidateStreamAccess(latest.current);
      else if (!interrupted) clearAccess();
      latest.current = undefined;
      setView(undefined);
      setCurrent(false);
      setError(message);
    };
    setCurrent(false);
    void getState(signal)
      .then((next) => {
        show(next);
        if (signal.aborted || !next.access) return;
        const connection = browserSubscription(
          eventsUrl(next),
          signal,
          'game',
          (frame, context) => {
            context.throwIfStopped();
            if (signal.aborted || !latest.current || frame.kind === 'comment') return;
            if (frame.event === 'patch')
              show(applyGamePatch(latest.current, JSON.parse(frame.data) as GamePatch));
            else if (frame.event === 'reset') show(JSON.parse(frame.data) as GameView);
            else if (frame.event === 'access-changed' || frame.event === 'timeline-changed') {
              withdraw('The Lab situation or your access changed.');
              refresh();
            }
          },
        );
        void connection.done
          .then((result) => {
            if (signal.aborted || result.reason === 'closed') return;
            const status =
              result.reason === 'connection_failed' && result.failure.kind === 'http_status'
                ? result.failure.status
                : undefined;
            if (status === 401 || status === 403) {
              setSignedOut(status === 401);
              withdraw(status === 401 ? 'Sign in to open the Lab.' : 'Your access to the Lab changed.');
            } else {
              withdraw('Connection to the Lab ended. Refresh to reconnect.', true);
            }
          })
          .catch(() => withdraw('Connection to the Lab was interrupted. Refresh to reconnect.', true));
      })
      .catch((reason) => {
        if (signal.aborted) return;
        setUnavailable(reason instanceof LabUnavailableError);
        setSignedOut(reason instanceof SignInRequiredError);
        withdraw(
          reason instanceof Error ? reason.message : 'The Lab could not be opened.',
          !(reason instanceof AccessError || reason instanceof LabUnavailableError),
        );
      });
    const unsubscribe = onTabNotice((notice) => {
      if (notice.type === 'logout') {
        setSignedOut(true);
        withdraw('Sign in to open the Lab.');
        controller.abort();
      }
    });
    return () => {
      controller.abort();
      unsubscribe();
    };
  }, [revision, refresh]);
  const controllingScope = current && view?.access?.controlling ? view.access.scope : undefined;
  useEffect(
    () => (controllingScope ? startPresence(controllingScope) : undefined),
    [controllingScope],
  );
  return { view, error, current, refresh, unavailable, signedOut };
}
