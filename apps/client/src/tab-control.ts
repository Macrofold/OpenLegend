import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameView } from '@open-legend/protocol';
import { AccessError, changeTabControl, clearAccess, getState, logOut } from './api';
import { forgetSelectedTab, onTabNotice, selectedTabElsewhere, selectThisTab } from './tab-session';

function failureMessage(reason: unknown): string {
  if (reason instanceof DOMException && reason.name === 'TimeoutError')
    return 'The game server did not respond. Try again.';
  if (reason instanceof TypeError) return 'Could not reach the game server. Try again.';
  return reason instanceof Error ? reason.message : 'Could not connect. Try again.';
}

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
  const manualRef = useRef<'resume' | 'logout' | null>(null);
  const intent = useRef(0);
  const pending = useRef<Promise<void>>(Promise.resolve());
  const pause = useCallback(() => {
    // Logout must keep its intent/lock even if the player changes tabs while
    // waiting. The dialog is already paused; refocus cannot reopen this login.
    if (manualRef.current === 'logout') return;
    if (pausedRef.current && !resumingRef.current) return;
    intent.current++;
    pausedRef.current = true;
    resumingRef.current = false;
    manualRef.current = null;
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
    if (
      (resumingRef.current && manualRef.current) ||
      document.visibilityState !== 'visible' ||
      !document.hasFocus()
    )
      return pending.current;
    const attempt = ++intent.current;
    resumingRef.current = true;
    manualRef.current = explicit ? 'resume' : null;
    setResuming(true);
    setError('');
    pending.current = pending.current.then(async () => {
      if (attempt !== intent.current) return;
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
        if (!explicit) setBlocked(false);
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
          if (
            !explicit &&
            fresh.access &&
            fresh.access.controlGeneration !== before.access.controlGeneration
          ) {
            // The selected page can finish releasing while this foreground
            // entry is in flight. Reconcile that one revision race without
            // ever converting automatic entry into a replacement.
            await changeTabControl(fresh, 'acquire');
          } else throw reason;
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
        if (explicit && reason instanceof AccessError) {
          forgetSelectedTab();
          clearAccess();
          window.location.reload();
        } else if (explicit) setError(failureMessage(reason));
        else throw reason; // EntryScreen owns connection/authentication failures.
      } finally {
        if (attempt === intent.current) {
          resumingRef.current = false;
          manualRef.current = null;
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
    manualRef.current = 'logout';
    setResuming(true);
    setLoggingOut(true);
    setError('');
    try {
      await logOut();
    } catch (reason) {
      setError(failureMessage(reason));
      resumingRef.current = false;
      manualRef.current = null;
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
