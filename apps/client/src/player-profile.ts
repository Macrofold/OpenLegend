import { useCallback, useEffect, useState } from 'react';
import type { ApiResult, PlayerPreferencePatch, PlayerProfile } from '@open-legend/protocol';
import { getScoped, post } from './api';

// A preference write changes the renderer as well as the panel that made it.
// Listeners request their own permitted copy; no profile travels between tabs.
const refresh = new EventTarget();

export async function savePlayerPreferences(patch: PlayerPreferencePatch): Promise<ApiResult> {
  const result = await post('/api/profile/preferences', patch);
  if (result.ok) refresh.dispatchEvent(new Event('change'));
  return result;
}

export function usePlayerProfile(scope: string | undefined, connected: boolean, settings: boolean) {
  const [request, setRequest] = useState(0);
  const [result, setResult] = useState<{ scope: string; profile?: PlayerProfile; failed?: boolean }>();
  const retry = useCallback(() => setRequest((value) => value + 1), []);
  useEffect(() => {
    refresh.addEventListener('change', retry);
    return () => refresh.removeEventListener('change', retry);
  }, [retry]);
  useEffect(() => {
    if (settings) retry();
  }, [settings, retry]);
  useEffect(() => {
    setResult((value) => (value?.scope === scope ? value : undefined));
    if (!scope || !connected) return;
    const controller = new AbortController();
    void getScoped<PlayerProfile>('/api/profile', controller.signal).then(
      (profile) => {
        if (!controller.signal.aborted) setResult({ scope, profile });
      },
      () => {
        if (!controller.signal.aborted)
          setResult((value) => ({
            scope,
            profile: value?.scope === scope ? value.profile : undefined,
            failed: true,
          }));
      },
    );
    return () => controller.abort();
  }, [scope, connected, request]);
  const selected = result?.scope === scope ? result : undefined;
  return { profile: selected?.profile, failed: selected?.failed, retry };
}

export type PlayerProfileRead = ReturnType<typeof usePlayerProfile>;
