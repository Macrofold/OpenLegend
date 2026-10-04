import type { ApiResult, GamePatch, GameView, OperationsView } from '@open-legend/protocol';

// One identity for this page's heartbeats and explicit Resume actions. A delayed
// pagehide notification must not erase a newer return/resume notification.
const tabClientId = crypto.randomUUID();
let presenceSequence = 0;
let worldGeneration = '';
let viewScope = '';
let privateDraftNamespace = '';
let accessGeneration = 0;
export class AccessError extends Error {}
/** A missing session is a normal entry state, distinct from a refused world grant. */
export class SignInRequiredError extends AccessError {}
/** Local drafts use a native namespace independent of this tab's connection.
 * Requests still use the complete viewScope and access-generation fence below.
 */
export function privateDraftScope(): string {
  if (!privateDraftNamespace)
    throw new Error('Refresh your access before opening private saved work.');
  return privateDraftNamespace;
}
/** The signed-in account's grant has no character here; it uses World operations instead. */
export class CharacterlessError extends AccessError {}
function clearSessionDrafts(preservePendingCommands = false): void {
  try {
    for (const key of Object.keys(sessionStorage))
      if (
        key.startsWith('open-legend:composer-draft:') ||
        key.startsWith('open-legend:action-draft:') ||
        (!preservePendingCommands &&
          (key.startsWith('open-legend:inventory-command:') ||
            key.startsWith('open-legend:activity-command:')))
      )
        sessionStorage.removeItem(key);
  } catch {
    /* Browser storage is optional. */
  }
}
export function clearAccess(options?: { preservePendingCommands?: boolean }): void {
  accessGeneration++;
  worldGeneration = '';
  viewScope = '';
  privateDraftNamespace = '';
  // Each store can be unavailable independently; local storage must not prevent session cleanup.
  clearSessionDrafts(options?.preservePendingCommands);
  try {
    for (const key of Object.keys(localStorage))
      if (
        key.startsWith('open-legend:world-agent:') ||
        key.startsWith('open-legend:authoring:') ||
        key.startsWith('open-legend:invention-draft:')
      )
        localStorage.removeItem(key);
    // The caller may retain unresolved receipts only after proving the same native private owner
    // and save timeline. Keep that owner marker so the next view does not erase those receipts.
    if (!options?.preservePendingCommands) localStorage.removeItem('open-legend:private-owner');
  } catch {
    /* Browser storage is optional. */
  }
}
export function acceptAccess(view: GameView): void {
  const generation = view.historyEpoch?.split(':')[0] ?? '';
  const scope = view.access?.scope ?? '';
  if (generation === worldGeneration && scope === viewScope) return;
  accessGeneration++;
  worldGeneration = generation;
  viewScope = scope;
  privateDraftNamespace = view.access?.privateDraftScope ?? '';
  try {
    const owner = `${view.worldId}:${view.access?.accountId ?? 'local-player'}:${view.access?.actorId ?? view.player.id}`;
    const priorOwner = localStorage.getItem('open-legend:private-owner');
    if (priorOwner !== owner) {
      clearSessionDrafts();
      for (const key of Object.keys(localStorage))
        if (
          key.startsWith('open-legend:world-agent:') ||
          key.startsWith('open-legend:authoring:') ||
          key.startsWith('open-legend:invention-draft:')
        )
          localStorage.removeItem(key);
      localStorage.setItem('open-legend:private-owner', owner);
    }
    const key = `open-legend:save-timeline:${view.worldId}`;
    const previous = sessionStorage.getItem(key);
    if (previous && previous !== view.saveTimeline) {
      clearSessionDrafts();
      localStorage.removeItem(`open-legend:world-agent:${view.worldId}`);
      localStorage.removeItem(`open-legend:invention-draft:${view.worldId}`);
    }
    if (view.saveTimeline) sessionStorage.setItem(key, view.saveTimeline);
  } catch {
    /* Browser storage is optional. */
  }
}
export function eventsUrl(view: GameView): string {
  return `/api/events?client=${tabClientId}&scope=${view.access?.scope ?? ''}&revision=${view.revision}`;
}
export function worldAgentProgressUrl(worldId: string, sessionId: string): string {
  const query = new URLSearchParams({ worldId, sessionId, client: tabClientId, scope: viewScope });
  return `/api/world-agent/session/progress?${query}`;
}
export function npcReplyPreviewUrl(worldId: string, requestId: string): string {
  return `/api/chat/preview?${new URLSearchParams({ worldId, requestId, client: tabClientId, scope: viewScope })}`;
}

export function setWorldPaused(paused: boolean): Promise<ApiResult> {
  return post('/api/control', {
    paused,
    ...(!paused ? { clientId: tabClientId, presenceSequence: ++presenceSequence } : {}),
  });
}

export async function getState(): Promise<GameView> {
  const response = await fetch('/api/state', {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'X-OL-Client': tabClientId },
  });
  if (response.status === 403) {
    const body = (await response.json().catch(() => ({}))) as { code?: string; message?: string };
    if (body.code === 'characterless')
      throw new CharacterlessError(body.message ?? 'Open World operations.');
  }
  if (response.status === 401) throw new SignInRequiredError('Sign in to enter your world.');
  if (response.status === 403)
    throw new AccessError('This account does not currently have access to this world.');
  if (!response.ok) throw new Error(`The world could not be loaded (${response.status}).`);
  const view = (await response.json()) as GameView;
  return view;
}
/** Operator/spectator console state. It opens no event stream and never counts as presence. */
export async function getOperations(): Promise<OperationsView> {
  const response = await fetch('/api/operations', {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'X-OL-Client': tabClientId },
  });
  const result = (await response.json().catch(() => ({}))) as Partial<OperationsView> & {
    message?: string;
  };
  if (response.status === 401) throw new AccessError('Sign in to continue.');
  if (!response.ok || !result.ok)
    throw new AccessError(result.message ?? 'This account has no access to this world.');
  const view = result as OperationsView;
  // Mutations carry this audience; a changed scope or world generation invalidates in-flight work.
  if (view.generation !== worldGeneration || view.scope !== viewScope) {
    accessGeneration++;
    worldGeneration = view.generation;
    viewScope = view.scope;
  }
  return view;
}
/** Private reads carry this tab's audience and discard responses from a prior scope. */
export async function getScoped<T>(path: string, signal?: AbortSignal): Promise<T> {
  const scope = viewScope;
  const generation = accessGeneration;
  const response = await fetch(path, {
    credentials: 'same-origin',
    cache: 'no-store',
    signal,
    headers: { 'X-OL-Client': tabClientId, 'X-OL-Scope': scope },
  });
  if (!response.ok) throw new Error(`The requested history is unavailable (${response.status}).`);
  const result = (await response.json()) as T;
  if (generation !== accessGeneration)
    throw new Error('Your access or world changed. Reload this history.');
  return result;
}
export function applyGamePatch(current: GameView, patch: GamePatch): GameView {
  if (
    patch.scope !== current.access?.scope ||
    patch.baseRevision !== current.revision ||
    patch.revision <= current.revision
  )
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
    ...(patch.worldEventsRevision ? { worldEventsRevision: patch.worldEventsRevision } : {}),
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
  const generation = accessGeneration;
  const response = await fetch(path, {
    method: 'POST',
    signal,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'X-OL-Generation': worldGeneration,
      'X-OL-Client': tabClientId,
      'X-OL-Scope': viewScope,
    },
    body: JSON.stringify(body),
  });
  let result: T;
  try {
    result = (await response.json()) as T;
  } catch {
    throw new Error(`The server returned an unreadable response (${response.status}).`);
  }
  if (generation !== accessGeneration)
    throw new Error('Your access or world changed. Reload before continuing.');
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
        `/api/presence?client=${tabClientId}&scope=${viewScope}`,
        new Blob([JSON.stringify(body)], { type: 'application/json' }),
      );
      if (queued) return;
    }
    void fetch('/api/presence', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-OL-Client': tabClientId,
        'X-OL-Scope': viewScope,
      },
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
