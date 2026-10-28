import { browserRequest } from './browser-network';
import { pruneWorldRequests } from './retained-request';
import type { AssetRevisionReference } from '@open-legend/assets';
import type {
  ApiResult,
  GamePatch,
  GameView,
  OperationsView,
  WorldCreationHostStatus,
  WorldAgentWorkResult,
  WorldCreationOperationView,
  WorldInputUpdate,
  WorldInputResult,
} from '@open-legend/protocol';

import { clearTradeDrafts } from './trade-drafts';
import { clearDraft } from './draft';
import { announceLogout, tabClientId, tabIdentityReady } from './tab-session';

async function prepareTabHeaders(): Promise<Record<string, string>> {
  await tabIdentityReady;
  // A duplicate selects a fresh identity while claiming its browser lock.
  // Capture it after that preparation, while retaining the request's old scope.
  return { 'X-OL-Client': tabClientId() };
}

let presenceSequence = 0;
let worldGeneration = '';
let viewScope = '';
let privateDraftNamespace = '';
let privateDraftTimeline = '';
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
/** An empty target and a committed world awaiting runtime adoption are recoverable host states. */
export class WorldCreationHostError extends Error {
  constructor(readonly host: WorldCreationHostStatus) {
    super(host.message);
  }
}
/** A restore is still replacing the world; entry must wait for a fresh view. */
export class WorldLoadingError extends Error {}
function clearSessionDrafts(
  preservePendingCommands = false,
  preserveCheckpointResults = false,
): void {
  try {
    for (const key of Object.keys(sessionStorage))
      if (
        key.startsWith('open-legend:composer-draft:') ||
        key.startsWith('open-legend:action-draft:') ||
        key.startsWith('open-legend:creation-request:') ||
        (!preserveCheckpointResults && key.startsWith('open-legend:checkpoint-request:')) ||
        (!preserveCheckpointResults && key.startsWith('open-legend:asset-selection:')) ||
        (!preservePendingCommands &&
          (key.startsWith('open-legend:action-request:') ||
            key.startsWith('open-legend:inventory-command:') ||
            key.startsWith('open-legend:invention-request:') ||
            key.startsWith('open-legend:activity-command:') ||
            key.startsWith('open-legend:agreement-command:')))
      )
        sessionStorage.removeItem(key);
  } catch {
    /* Browser storage is optional. */
  }
}
export function clearAccess(options?: {
  preservePendingCommands?: boolean;
  preserveCheckpointResultsFor?: string;
}): void {
  accessGeneration++;
  worldGeneration = '';
  viewScope = '';
  privateDraftNamespace = '';
  privateDraftTimeline = '';
  clearTradeDrafts();
  // Each store can be unavailable independently; local storage must not prevent session cleanup.
  clearSessionDrafts(options?.preservePendingCommands, !!options?.preserveCheckpointResultsFor);
  pruneWorldRequests(options?.preserveCheckpointResultsFor);
  try {
    if (!options?.preservePendingCommands) sessionStorage.removeItem('open-legend:private-owner');
  } catch {
    /* Session storage can fail independently of local storage. */
  }
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
  // In-memory sharing also expires when browser storage is unavailable.
  if (
    (privateDraftNamespace && privateDraftNamespace !== view.access?.privateDraftScope) ||
    (privateDraftTimeline && privateDraftTimeline !== view.saveTimeline)
  ) {
    clearTradeDrafts();
    clearDraft();
  }
  privateDraftNamespace = view.access?.privateDraftScope ?? '';
  pruneWorldRequests(view.checkpoint?.recoveryScope);
  privateDraftTimeline = view.saveTimeline ?? '';
  const owner = JSON.stringify([
    view.worldId,
    view.access?.accountId ?? 'local-player',
    view.access?.actorId ?? view.player.id,
  ]);
  const timelineKey = `open-legend:save-timeline:${view.worldId}`;
  // Each store owns its markers. Failure in one must never erase recovery in the other.
  try {
    const previousOwner = sessionStorage.getItem('open-legend:private-owner');
    const previousTimeline = sessionStorage.getItem(timelineKey);
    if (previousOwner !== owner || (previousTimeline && previousTimeline !== view.saveTimeline)) {
      clearTradeDrafts();
      // A load can itself replace the timeline. Keep only the same owner's read-only
      // checkpoint outcome description; never restore an executable old-world request.
      clearSessionDrafts(false, true);
    }
    sessionStorage.setItem('open-legend:private-owner', owner);
    if (view.saveTimeline) sessionStorage.setItem(timelineKey, view.saveTimeline);
  } catch {
    /* Session storage is optional; local cleanup still runs. */
  }
  try {
    const previousOwner = localStorage.getItem('open-legend:private-owner');
    const previousTimeline = localStorage.getItem(timelineKey);
    if (previousOwner !== owner) {
      for (const key of Object.keys(localStorage))
        if (
          key.startsWith('open-legend:world-agent:') ||
          key.startsWith('open-legend:authoring:') ||
          key.startsWith('open-legend:invention-draft:')
        )
          localStorage.removeItem(key);
    } else if (previousTimeline && previousTimeline !== view.saveTimeline) {
      localStorage.removeItem(`open-legend:world-agent:${view.worldId}`);
      localStorage.removeItem(`open-legend:invention-draft:${view.worldId}`);
    }
    localStorage.setItem('open-legend:private-owner', owner);
    if (view.saveTimeline) localStorage.setItem(timelineKey, view.saveTimeline);
  } catch {
    /* Local storage is optional and cannot invalidate session recovery. */
  }
}
export function eventsUrl(view: GameView): string {
  return `/api/events?client=${tabClientId()}&scope=${view.access?.scope ?? ''}&revision=${view.revision}`;
}
export function worldAgentProgressUrl(worldId: string, sessionId: string): string {
  const query = new URLSearchParams({
    worldId,
    sessionId,
    client: tabClientId(),
    scope: viewScope,
  });
  return `/api/world-agent/session/progress?${query}`;
}
export function npcReplyPreviewUrl(worldId: string, requestId: string): string {
  return `/api/chat/preview?${new URLSearchParams({ worldId, requestId, client: tabClientId(), scope: viewScope })}`;
}

/** These controls use the plan's original identity. Recovery never dispatches Start. */
export function worldCreationOperation(
  operation: 'start' | 'recover' | 'cancel',
  worldId: string,
  sessionId: string,
  planId: string,
  signal?: AbortSignal,
): Promise<WorldAgentWorkResult<WorldCreationOperationView>> {
  return post(`/api/world-agent/creation/${operation}`, { worldId, sessionId, planId }, signal);
}

export function setWorldPaused(paused: boolean): Promise<ApiResult> {
  return post('/api/control', {
    paused,
    ...(!paused ? { clientId: tabClientId(), presenceSequence: ++presenceSequence } : {}),
  });
}

export async function getState(signal?: AbortSignal): Promise<GameView> {
  const response = await browserRequest(
    '/api/state',
    {
      credentials: 'same-origin',
      cache: 'no-store',
      signal,
      headers: { 'X-OL-Client': tabClientId() },
    },
    undefined,
    prepareTabHeaders,
  );
  if (response.status === 409) {
    const body = response.body;
    if (body && typeof body === 'object' && 'code' in body && body.code === 'loading')
      throw new WorldLoadingError('A saved world is loading. Please wait.');
  }
  if (response.status === 403) {
    const body = (response.body ?? {}) as { code?: string; message?: string };
    if (body.code === 'characterless')
      throw new CharacterlessError(body.message ?? 'Open World operations.');
  }
  if (response.status === 401) throw new SignInRequiredError('Sign in to enter your world.');
  if (response.status === 403)
    throw new AccessError('This account does not currently have access to this world.');
  if (response.status === 503) {
    const body = (response.body ?? {}) as {
      code?: string;
      data?: WorldCreationHostStatus;
    };
    if (
      body.code === 'creation-host' &&
      body.data &&
      (body.data.status === 'awaiting-creation' || body.data.status === 'host-unavailable')
    )
      throw new WorldCreationHostError(body.data);
  }
  if (!response.ok) throw new Error(`The world could not be loaded (${response.status}).`);
  if (!response.body) throw new Error('The world could not be read. Refresh to reconnect.');
  const view = response.body as GameView;
  return view;
}
/** Capture the authority of this page's intent. A late release must never use
 * the newer authority accepted after a Resume in another tab. */
export async function changeTabControl(
  view: GameView,
  operation: 'acquire' | 'replace' | 'release',
): Promise<ApiResult> {
  if (!view.access) throw new Error('Refresh your character before resuming.');
  const body = {
    id: crypto.randomUUID(),
    expectedGeneration: view.access.controlGeneration,
    operation,
  };
  const response = await browserRequest(
    '/api/embodiment',
    {
      method: 'POST',
      credentials: 'same-origin',
      keepalive: operation === 'release',
      headers: {
        'Content-Type': 'application/json',
        'X-OL-Client': tabClientId(),
        'X-OL-Scope': view.access.scope,
        'X-OL-Generation': view.historyEpoch?.split(':')[0] ?? '',
      },
      body: JSON.stringify(body),
    },
    body,
    prepareTabHeaders,
  );
  const result = response.body as ApiResult | undefined;
  if (!result)
    throw new Error('The character control change is unconfirmed. Refresh before continuing.');
  if (!result.ok) throw new Error(result.message || 'Your character could not resume here.');
  return result;
}
/** Operator/spectator console state. It opens no event stream and never counts as presence. */
export async function getOperations(): Promise<OperationsView> {
  const generation = accessGeneration;
  const response = await browserRequest(
    '/api/operations',
    {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'X-OL-Client': tabClientId() },
    },
    undefined,
    prepareTabHeaders,
  );
  const result = (response.body ?? {}) as Partial<OperationsView> & {
    message?: string;
  };
  if (generation !== accessGeneration)
    throw new AccessError('Your access or world changed. Refresh World operations.');
  if (response.status === 401) throw new SignInRequiredError('Sign in to continue.');
  if (response.status === 403)
    throw new AccessError(result.message ?? 'This account has no access to this world.');
  if (!response.ok || !result.ok)
    throw new Error(result.message ?? 'World operations could not be loaded. Try again.');
  const view = result as OperationsView;
  pruneWorldRequests(view.checkpoint?.recoveryScope);
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
  const response = await browserRequest(
    path,
    {
      credentials: 'same-origin',
      cache: 'no-store',
      signal,
      headers: { 'X-OL-Client': tabClientId(), 'X-OL-Scope': scope },
    },
    undefined,
    prepareTabHeaders,
  );
  if (!response.ok)
    throw new Error(`The requested information is unavailable (${response.status}).`);
  if (response.body === undefined) throw new Error('The requested information could not be read.');
  const result = response.body as T;
  if (generation !== accessGeneration)
    throw new Error('Your access or world changed. Reload this information.');
  return result;
}
function applyFields<T extends object>(
  current: T,
  fields?: Partial<T>,
  remove?: Array<keyof T>,
): T {
  if (!fields && !remove?.length) return current;
  const next = { ...current, ...fields };
  for (const key of remove ?? []) delete next[key];
  return next;
}
const requiredEntityFields = new Set([
  'id',
  'name',
  'kind',
  'subtype',
  'position',
  'supportSurfaceId',
  'heading',
  'appearance',
  'radius',
  'status',
]);
export function applyGamePatch(current: GameView, patch: GamePatch): GameView {
  if (
    patch.schemaVersion !== current.schemaVersion ||
    patch.scope !== current.access?.scope ||
    patch.baseRevision !== current.revision ||
    patch.revision <= current.revision
  )
    throw new Error('Game update revision mismatch.');
  let entities = current.entities;
  if (patch.entities) {
    const byId = new Map(current.entities.map((entity) => [entity.id, entity]));
    const touched = new Set<string>();
    const touch = (id: string) => {
      if (touched.has(id)) throw new Error('Conflicting game entity changes.');
      touched.add(id);
    };
    for (const id of patch.entities.remove) {
      touch(id);
      if (!byId.delete(id)) throw new Error('Missing removed game entity.');
    }
    for (const entity of patch.entities.add) {
      touch(entity.id);
      if (byId.has(entity.id)) throw new Error('Duplicate added game entity.');
      byId.set(entity.id, entity);
    }
    for (const change of patch.entities.update) {
      touch(change.id);
      const before = byId.get(change.id);
      if (!before || Object.hasOwn(change.set ?? {}, 'id'))
        throw new Error('Missing or renamed game entity.');
      for (const field of change.remove ?? [])
        if (requiredEntityFields.has(field) || Object.hasOwn(change.set ?? {}, field))
          throw new Error('Conflicting or required entity fields.');
      byId.set(change.id, applyFields<typeof before>(before, change.set, change.remove));
    }
    if (patch.entities.order) {
      const order = patch.entities.order;
      if (
        order.length !== byId.size ||
        new Set(order).size !== order.length ||
        order.some((id) => !byId.has(id))
      )
        throw new Error('Incomplete game entity order.');
      entities = order.map((id) => byId.get(id)!);
    } else entities = [...byId.values()];
  }
  const next: GameView = {
    ...current,
    revision: patch.revision,
    ...(patch.commandEpoch !== undefined ? { commandEpoch: patch.commandEpoch } : {}),
    ...(patch.historyEpoch !== undefined ? { historyEpoch: patch.historyEpoch } : {}),
    ...(patch.worldEventsRevision !== undefined
      ? { worldEventsRevision: patch.worldEventsRevision }
      : {}),
    ...(patch.historyRevision !== undefined ? { historyRevision: patch.historyRevision } : {}),
    ...(Object.hasOwn(patch, 'narrator') ? { narrator: patch.narrator } : {}),
    ...(Object.hasOwn(patch, 'cartography') ? { cartography: patch.cartography } : {}),
    ...(patch.profile ? { profile: patch.profile } : {}),
    clock: applyFields(current.clock, patch.clock, patch.remove?.clock),
    player: applyFields(current.player, patch.player, patch.remove?.player),
    ...(patch.entities ? { entities } : {}),
    ...(patch.recipes ? { recipes: patch.recipes } : {}),
    ...(patch.events ? { events: patch.events } : {}),
    ...(patch.conversation ? { conversation: patch.conversation } : {}),
    ai: applyFields(current.ai, patch.ai, patch.remove?.ai),
    ...(patch.milestones ? { milestones: patch.milestones } : {}),
    ...(patch.persistence ? { persistence: patch.persistence } : {}),
  };
  for (const key of patch.remove?.view ?? []) delete next[key];
  return next;
}
async function sendPost<T extends { ok: boolean; message?: string }>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<{ response: { ok: boolean; status: number }; result: T }> {
  const response = await browserRequest(
    path,
    {
      method: 'POST',
      signal,
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-OL-Generation': worldGeneration,
        'X-OL-Client': tabClientId(),
        'X-OL-Scope': viewScope,
      },
      body: JSON.stringify(body),
    },
    body,
    prepareTabHeaders,
  );
  if (response.body === undefined)
    throw new Error(`The server returned an unreadable response (${response.status}).`);
  const result = response.body as T;
  return { response, result };
}
export async function post<T extends { ok: boolean; message?: string } = ApiResult>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const generation = accessGeneration;
  const { response, result } = await sendPost<T>(path, body, signal);
  if (generation !== accessGeneration)
    throw new Error('Your access or world changed. Reload before continuing.');
  if (!response.ok && !result.message)
    throw new Error(`The request was not accepted (${response.status}).`);
  return result;
}
export function updateWorldInput(
  input: WorldInputUpdate,
  signal?: AbortSignal,
): Promise<WorldInputResult> {
  return post<WorldInputResult>('/api/input', input, signal);
}
/** Loading intentionally replaces this timeline. Only the selected load's
 * non-disclosing success acknowledgment may cross that change; no old result
 * fields are adopted. Reload resolves the current account/session from scratch.
 * docs/save-and-load.md#loading-as-an-authority-transition
 */
export async function loadGameSave(request: {
  id: string;
  requestId: string;
}): Promise<ApiResult | undefined> {
  const generation = accessGeneration;
  const { response, result } = await sendPost<ApiResult>('/api/saves/load', request);
  if (response.ok && result.ok === true) {
    window.location.reload();
    return;
  }
  if (generation !== accessGeneration)
    throw new Error('Your access or world changed. Reload before continuing.');
  if (!response.ok && !result.message)
    throw new Error(`The saved game could not be loaded (${response.status}).`);
  return result;
}

export interface AssetReleaseSelectionRequest {
  requestId: string;
  timeline: string;
  reference: AssetRevisionReference;
  expectedRevision: number;
}
export function selectInstalledArtwork(
  request: AssetReleaseSelectionRequest,
  operation: 'install' | 'selection-result',
  signal?: AbortSignal,
) {
  const { requestId, ...selection } = request;
  return post<{
    ok: boolean;
    reference?: AssetRevisionReference;
    completedUnavailable?: boolean;
    retryable?: boolean;
    message?: string;
  }>('/api/assets/' + operation, { id: requestId, ...selection }, signal);
}
let presenceSending = false;
let latestPresence: { scope: string; visible: boolean } | undefined;
function flushPresence(): void {
  if (presenceSending || !latestPresence) return;
  const desired = latestPresence;
  latestPresence = undefined;
  presenceSending = true;
  // Allocate ordering at dispatch, rather than accumulating expired heartbeats.
  const body = { clientId: tabClientId(), visible: desired.visible, sequence: ++presenceSequence };
  void browserRequest(
    '/api/presence',
    {
      method: 'POST',
      credentials: 'same-origin',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        'X-OL-Client': tabClientId(),
        'X-OL-Scope': desired.scope,
      },
      body: JSON.stringify(body),
    },
    body,
  )
    .catch(() => undefined)
    .finally(() => {
      presenceSending = false;
      flushPresence();
    });
}
/** Report foreground attention independently of the server's saved pause policy.
 * The open event stream proves connection even if background heartbeats stop.
 * Capture accepted control so cleanup cannot withdraw a successor's presence.
 * docs/world-presentation.md#camera-and-settings */
export function startPresence(scope: string): () => void {
  let focused = document.hasFocus();
  const send = (visible: boolean, beacon = false): void => {
    if (beacon) {
      const body = { clientId: tabClientId(), visible, sequence: ++presenceSequence };
      const queued = navigator.sendBeacon(
        `/api/presence?client=${tabClientId()}&scope=${scope}`,
        new Blob([JSON.stringify(body)], { type: 'application/json' }),
      );
      // Browser queue acceptance is not a server acknowledgement. Its newer
      // sequence also supersedes any older queued visible heartbeat locally.
      if (queued) {
        latestPresence = undefined;
        return;
      }
    }
    latestPresence = { scope, visible };
    flushPresence();
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

/** Logout needs no controlling lease: it must also work from a displaced tab. */
export async function logOut(): Promise<void> {
  try {
    const response = await browserRequest(
      '/api/session/logout',
      {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      },
      {},
      prepareTabHeaders,
    );
    const result = response.body as ApiResult | undefined;
    if (response.status !== 401 && (!response.ok || !result?.ok))
      throw new Error(
        result?.message || 'Logout is unconfirmed. Check your sign-in status before continuing.',
      );
  } catch (error) {
    // State entry can establish a local-development session, so only this
    // read-only authentication endpoint can reconcile a lost logout reply.
    const session = await browserRequest(
      '/api/session',
      {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'X-OL-Client': tabClientId() },
      },
      undefined,
      prepareTabHeaders,
    ).catch(() => undefined);
    if (session?.status !== 401) throw error;
  }
  clearAccess();
  announceLogout();
  window.location.reload();
}
