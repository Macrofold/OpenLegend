import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameView } from '@open-legend/protocol';
import { changeTabControl, clearAccess, getState, logOut } from './api';
import { forgetSelectedTab, onTabNotice, selectedTabElsewhere, selectThisTab } from './tab-session';

/** Browser attention controls presentation, never command authority or world law.
 * docs/projects/tab-resume-tech-design.md */
export function useTabControl() {
  const [paused, setPaused] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState('');
  const current = useRef<GameView | null>(null);
  const pausedRef = useRef(true);
  const resumingRef = useRef(false);
  const intent = useRef(0);
  const pending = useRef<Promise<void>>(Promise.resolve());
  const pause = useCallback(() => {
    if (pausedRef.current && !resumingRef.current) return;
    intent.current++;
    pausedRef.current = true;
    resumingRef.current = false;
    setPaused(true);
    setResuming(false);
    // Capture now, not when the queue runs after a newer return.
    const view = current.current;
    pending.current = pending.current.then(async () => {
      if (!view?.access?.controlling) return;
      try {
        await changeTabControl(view, 'release');
      } catch {
        /* A competing tab or lost connection uses the normal exit grace. */
      }
    });
  }, []);
  const acceptView = useCallback(
    (view: GameView) => {
      if (resumingRef.current) return;
      current.current = view;
      if (!pausedRef.current && !view.access?.controlling) {
        pause();
        if (view.access?.controlledElsewhere) {
          forgetSelectedTab();
          setBlocked(true);
        }
      }
    },
    [pause],
  );
  const enter = useCallback((accept: (view: GameView) => void, explicit = false) => {
    if (resumingRef.current || document.visibilityState !== 'visible' || !document.hasFocus())
      return pending.current;
    const attempt = ++intent.current;
    resumingRef.current = true;
    setResuming(true);
    setError('');
    pending.current = pending.current.then(async () => {
      try {
        const before = await getState(AbortSignal.timeout(15000));
        if (attempt !== intent.current) return;
        current.current = before;
        if (!before.access) throw new Error('Refresh your character before entering.');
        if (!explicit && (await selectedTabElsewhere(before.access.privateDraftScope))) {
          if (attempt !== intent.current) return;
          accept(before);
          setBlocked(true);
          return;
        }
        if (attempt !== intent.current) return;
        try {
          await changeTabControl(before, explicit ? 'replace' : 'acquire');
        } catch (reason) {
          // A simultaneous entrant may win. Refresh rather than replacing them.
          const fresh = await getState(AbortSignal.timeout(15000));
          if (attempt !== intent.current) return;
          current.current = fresh;
          if (!explicit && fresh.access?.controlledElsewhere) {
            accept(fresh);
            setBlocked(true);
            return;
          }
          throw reason;
        }
        const after = await getState(AbortSignal.timeout(15000));
        if (attempt !== intent.current) return;
        current.current = after;
        if (!after.access?.controlling) throw new Error('Another tab resumed. Try again.');
        accept(after);
        selectThisTab(after.access.privateDraftScope);
        pausedRef.current = false;
        setBlocked(false);
        setPaused(false);
      } catch (reason) {
        if (attempt !== intent.current) return;
        if (explicit)
          setError(reason instanceof Error ? reason.message : 'Could not resume. Try again.');
        else throw reason; // EntryScreen owns connection/authentication failures.
      } finally {
        if (attempt === intent.current) {
          resumingRef.current = false;
          setResuming(false);
        }
      }
    });
    // Keep the serialization lane usable after a rejected automatic entry.
    const result = pending.current;
    pending.current = result.catch(() => {});
    return result;
  }, []);
  const logout = useCallback(async () => {
    if (resumingRef.current) return;
    intent.current++;
    resumingRef.current = true;
    setResuming(true);
    setLoggingOut(true);
    setError('');
    try {
      await logOut();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not log out. Try again.');
      resumingRef.current = false;
      setResuming(false);
      setLoggingOut(false);
    }
  }, []);
  useEffect(() => {
    const hidden = () => {
      if (document.visibilityState !== 'visible') pause();
    };
    const unsubscribe = onTabNotice((notice) => {
      if (notice.type === 'logout') {
        pause();
        clearAccess();
        window.location.reload();
      } else if (notice.scope === current.current?.access?.privateDraftScope) {
        pause();
        setBlocked(true);
      }
    });
    window.addEventListener('blur', pause);
    window.addEventListener('pagehide', pause);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      unsubscribe();
      window.removeEventListener('blur', pause);
      window.removeEventListener('pagehide', pause);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [pause]);
  const isPaused = useCallback(() => pausedRef.current, []);
  return {
    paused,
    blocked,
    resuming,
    loggingOut,
    error,
    pause,
    enter,
    logout,
    acceptView,
    isPaused,
  };
}
export type TabControl = ReturnType<typeof useTabControl>;
