import { useEffect, useRef, useState } from 'react';
import type { GameView, NpcReplyPreview } from '@open-legend/protocol';
import { npcReplyPreviewUrl } from '../api';

/** Browser reconnection reads a volatile snapshot; it never starts provider work. */
export function useReplyPreview(
  view: GameView,
  npcId: string | undefined,
  requestId: string | undefined,
  enabled: boolean,
  refresh: () => Promise<void>,
) {
  const key = `${view.worldId}:${view.saveTimeline}:${view.access?.scope}:${npcId}:${requestId}`;
  const [saved, setSaved] = useState<{ key: string; value: NpcReplyPreview } | null>(null);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  useEffect(() => {
    setSaved(null);
    if (!enabled || !requestId || !npcId) return;
    const stream = new EventSource(npcReplyPreviewUrl(view.worldId, requestId));
    let closed = false;
    let latest: NpcReplyPreview | null = null;
    const clear = () => {
      latest = null;
      setSaved(null);
    };
    stream.addEventListener('snapshot', (event) => {
      if (closed) return;
      try {
        const value = JSON.parse((event as MessageEvent).data) as NpcReplyPreview | null;
        if (value === null) {
          clear();
          return;
        }
        if (
          value.requestId !== requestId ||
          value.npcId !== npcId ||
          value.worldId !== view.worldId ||
          value.timelineId !== view.saveTimeline ||
          typeof value.generation !== 'string' ||
          typeof value.speaker !== 'string' ||
          typeof value.text !== 'string' ||
          value.text.length > 1200 ||
          (value.volume !== undefined && !['whisper', 'normal', 'shout'].includes(value.volume)) ||
          !['forming', 'withdrawn', 'settled'].includes(value.state) ||
          !Number.isSafeInteger(value.sequence) ||
          !Number.isSafeInteger(value.attempt) ||
          !Array.isArray(value.historyIds) ||
          value.historyIds.length > 16 ||
          value.historyIds.some((id) => typeof id !== 'string')
        )
          throw Error('Invalid preview.');
        if (
          latest &&
          (value.attempt < latest.attempt ||
            (value.generation === latest.generation && value.sequence <= latest.sequence))
        )
          return;
        latest = value;
        setSaved({ key, value });
        if (value.state === 'settled') void refreshRef.current();
      } catch {
        clear();
      }
    });
    // Clear sensitive text immediately; automatic EventSource reconnection reads
    // only this same server attempt and has no paid side effect.
    stream.onerror = clear;
    for (const event of ['access-changed', 'unavailable'])
      stream.addEventListener(event, () => {
        clear();
        stream.close();
        closed = true;
      });
    return () => {
      closed = true;
      stream.close();
    };
  }, [key, enabled]);
  return enabled && saved?.key === key ? saved.value : null;
}
