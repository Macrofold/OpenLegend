import { useCallback, useEffect, useState } from 'react';
import type { AiUsageView } from '@open-legend/protocol';
import { getScoped } from './api';

/** The two allowance panels share this scoped read only while one is visible. */
export function usePlayerAiUsage(scope: string | undefined, visible: boolean, changed: string) {
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<{
    scope: string;
    value?: AiUsageView;
    unavailable?: boolean;
  }>();
  const retry = useCallback(() => setRefresh((value) => value + 1), []);
  useEffect(() => {
    if (!scope || !visible) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const now = new Date();
    const nextMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
    function rollover() {
      const left = nextMonth - Date.now();
      if (left <= 0) retry();
      else timer = setTimeout(rollover, Math.min(left, 2_147_483_647));
    }
    rollover();
    return () => clearTimeout(timer);
  }, [scope, visible, retry, result?.value?.budget.period]);
  useEffect(() => {
    setResult((value) => (value?.scope === scope ? value : undefined));
    if (!scope || !visible) return;
    const controller = new AbortController();
    void getScoped<AiUsageView>('/api/ai/usage', controller.signal).then(
      (value) => {
        if (!controller.signal.aborted) setResult({ scope, value });
      },
      () => {
        if (!controller.signal.aborted) setResult({ scope, unavailable: true });
      },
    );
    return () => controller.abort();
  }, [scope, visible, changed, refresh]);
  const selected = result?.scope === scope ? result : undefined;
  return { value: selected?.value, unavailable: selected?.unavailable, retry };
}

export type PlayerAiUsage = ReturnType<typeof usePlayerAiUsage>;
