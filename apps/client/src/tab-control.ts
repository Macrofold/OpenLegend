import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameView } from '@open-legend/protocol';
import { changeTabControl, getState } from './api';

/** Page attention is an application concern. World departure/return and command
 * authority remain server-owned. docs/projects/completed/tab-resume-tech-design.md */
export function useTabControl() {
  const [paused, setPaused] = useState(true);
  const [resuming, setResuming] = useState(false);
  const [error, setError] = useState('');
  const current = useRef<GameView | null>(null);
  const pausedRef = useRef(true);
  const resumingRef = useRef(false);
  const intent = useRef(0);
  // Serialize our own pause/return, while the server fences competing tabs.
  const pending = useRef<Promise<void>>(Promise.resolve());
  const pause = useCallback(() => {
    if (pausedRef.current && !resumingRef.current) return;
    intent.current++;
    pausedRef.current = true;
    resumingRef.current = false;
    setPaused(true);
    setResuming(false);
    pending.current = pending.current.then(async () => {
      const view = current.current;
      if (!view?.access?.controlling) return;
      try {
        await changeTabControl(view, 'release');
      } catch {
        // Losing a race with another tab is normal. Connection loss still uses
        // the server's existing departure deadline; Resume refreshes authority.
      }
    });
  }, []);
  const acceptView = useCallback(
    (view: GameView) => {
      // A paused snapshot begun before the click cannot cancel a newer Resume.
      if (resumingRef.current) return;
      current.current = view;
      if (!pausedRef.current && !view.access?.controlling) pause();
    },
    [pause],
  );
  const resume = useCallback((accept: (view: GameView) => void) => {
    if (resumingRef.current || document.visibilityState !== 'visible' || !document.hasFocus())
      return;
    const attempt = ++intent.current;
    resumingRef.current = true;
    setResuming(true);
    setError('');
    pending.current = pending.current.then(async () => {
      try {
        const before = await getState();
        if (attempt !== intent.current) return;
        // Also validate the body's return when an earlier acknowledgement was
        // lost: owning control alone does not mean the body is participating.
        await changeTabControl(before, 'replace');
        const after = await getState();
        current.current = after;
        if (attempt !== intent.current) return;
        if (!after.access?.controlling)
          throw new Error('Another tab resumed. Try Resume here again.');
        // Publish the fresh permissions before panels reopen or commands resume.
        accept(after);
        pausedRef.current = false;
        setPaused(false);
      } catch (reason) {
        if (attempt === intent.current)
          setError(
            reason instanceof TypeError
              ? 'Could not reach the game server. Try Resume here again.'
              : reason instanceof Error
                ? reason.message
                : 'Could not resume. Try again.',
          );
      } finally {
        if (attempt === intent.current) {
          resumingRef.current = false;
          setResuming(false);
        }
      }
    });
  }, []);
  useEffect(() => {
    const hidden = () => {
      if (document.visibilityState !== 'visible') pause();
    };
    window.addEventListener('blur', pause);
    window.addEventListener('pagehide', pause);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('blur', pause);
      window.removeEventListener('pagehide', pause);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [pause]);
  const isPaused = useCallback(() => pausedRef.current, []);
  return { paused, resuming, error, pause, resume, acceptView, isPaused };
}

export type TabControl = ReturnType<typeof useTabControl>;
