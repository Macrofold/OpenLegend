import type { ApiResult, GamePatch, GameView } from '@open-legend/protocol';

// One identity for this page's heartbeats and explicit Resume actions. A delayed
// pagehide notification must not erase a newer return/resume notification.
const tabClientId = crypto.randomUUID();
let presenceSequence = 0;
let worldGeneration = '';

export function setWorldPaused(paused: boolean): Promise<ApiResult> {
  return post('/api/control', {
    paused,
    ...(!paused ? { clientId: tabClientId, presenceSequence: ++presenceSequence } : {}),
  });
}

export async function getState(): Promise<GameView> {
  const response = await fetch('/api/state', { credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) throw new Error(`The world could not be loaded (${response.status}).`);
  const view = (await response.json()) as GameView;
  worldGeneration = view.historyEpoch?.split(':')[0] ?? '';
  try {
    const key = `open-legend:save-timeline:${view.worldId}`;
    const previous = sessionStorage.getItem(key);
    if (previous && previous !== view.saveTimeline) {
      localStorage.removeItem(`open-legend:world-agent:${view.worldId}`);
      localStorage.removeItem(`open-legend:invention-draft:${view.worldId}`);
      sessionStorage.removeItem('open-legend:composer-draft:v2');
    }
    if (view.saveTimeline) sessionStorage.setItem(key, view.saveTimeline);
  } catch {
    /* Browser storage is optional. */
  }
  return view;
}
export function applyGamePatch(current: GameView, patch: GamePatch): GameView {
  if (patch.baseRevision !== current.revision || patch.revision <= current.revision)
    throw new Error('Game update revision mismatch.');
  let entities = current.entities;
  if (patch.entities) {
    const removed = new Set(patch.entities.remove);
    const byId = new Map(
      current.entities
        .filter((entity) => !removed.has(entity.id))
        .map((entity) => [entity.id, entity]),
    );
    for (const entity of patch.entities.upsert) byId.set(entity.id, entity);
    entities = patch.entities.order
      ? patch.entities.order.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []))
      : [...byId.values()];
  }
  return {
    ...current,
    revision: patch.revision,
    ...(patch.commandEpoch !== undefined ? { commandEpoch: patch.commandEpoch } : {}),
    ...(patch.historyEpoch ? { historyEpoch: patch.historyEpoch } : {}),
    ...(patch.historyRevision ? { historyRevision: patch.historyRevision } : {}),
    ...(Object.hasOwn(patch, 'narrator') ? { narrator: patch.narrator } : {}),
    ...(patch.profile ? { profile: patch.profile } : {}),
    ...(patch.clock ? { clock: { ...current.clock, ...patch.clock } } : {}),
    ...(patch.player ? { player: { ...current.player, ...patch.player } } : {}),
    ...(patch.entities ? { entities } : {}),
    ...(patch.recipes ? { recipes: patch.recipes } : {}),
    ...(patch.events ? { events: patch.events } : {}),
    ...(patch.conversation ? { conversation: patch.conversation } : {}),
    ...(patch.ai ? { ai: { ...current.ai, ...patch.ai } } : {}),
    ...(patch.milestones ? { milestones: patch.milestones } : {}),
    ...(patch.persistence ? { persistence: patch.persistence } : {}),
  };
}
export async function post<T extends { ok: boolean; message?: string } = ApiResult>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    signal,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-OL-Generation': worldGeneration },
    body: JSON.stringify(body),
  });
  let result: T;
  try {
    result = (await response.json()) as T;
  } catch {
    throw new Error(`The server returned an unreadable response (${response.status}).`);
  }
  if (!response.ok && !result.message)
    throw new Error(`The request was not accepted (${response.status}).`);
  return result;
}
/** Report foreground attention independently of the server's saved pause policy.
 * The open event stream proves connection even if background heartbeats stop. */
export function startPresence(): () => void {
  let focused = document.hasFocus();
  const send = (visible: boolean, beacon = false): void => {
    const body = { clientId: tabClientId, visible, sequence: ++presenceSequence };
    if (beacon) {
      const queued = navigator.sendBeacon(
        '/api/presence',
        new Blob([JSON.stringify(body)], { type: 'application/json' }),
      );
      if (queued) return;
    }
    void fetch('/api/presence', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => undefined);
  };
  const active = (): boolean => document.visibilityState === 'visible' && focused;
  const visibility = (): void => {
    focused = document.hasFocus();
    send(active(), !active());
  };
  const focus = (): void => {
    focused = true;
    send(active());
  };
  const blur = (): void => {
    focused = false;
    send(false, true);
  };
  const pagehide = (): void => send(false, true);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pagehide', pagehide);
  window.addEventListener('pageshow', visibility);
  window.addEventListener('focus', focus);
  window.addEventListener('blur', blur);
  const interval = window.setInterval(() => send(active()), 5000);
  send(active());
  return () => {
    clearInterval(interval);
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('pagehide', pagehide);
    window.removeEventListener('pageshow', visibility);
    window.removeEventListener('focus', focus);
    window.removeEventListener('blur', blur);
    send(false, true);
  };
}
