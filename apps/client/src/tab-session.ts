// Browser coordination describes open tabs; server leases alone admit commands.
// No private character data or credentials travel over this channel.
const pageId = crypto.randomUUID();
const identityKey = 'open-legend:tab-id';
function savedIdentity(): string {
  try {
    const stored = sessionStorage.getItem(identityKey);
    return stored && /^[0-9a-f-]{36}$/.test(stored) ? stored : crypto.randomUUID();
  } catch {
    return crypto.randomUUID();
  }
}
// A copied sessionStorage value is only a candidate until this document owns
// its exclusive browser lock. A timed BroadcastChannel reply cannot prove that
// a busy or suspended original tab does not still own the same identity.
let identity: string = pageId;
let selectedScope = '';
const channel = new BroadcastChannel('open-legend:game-tabs');
type Notice = { type: 'selected'; scope: string } | { type: 'logout' };
type Message =
  | Notice
  | { type: 'probe'; query: string; page: string }
  | { type: 'reply'; query: string; page: string; scope: string };
const listeners = new Set<(notice: Notice) => void>();
const probes = new Map<string, Set<string>>();
channel.onmessage = ({ data }: MessageEvent<Message>) => {
  if (!data || typeof data !== 'object') return;
  if (data.type === 'probe' && typeof data.query === 'string') {
    channel.postMessage({
      type: 'reply',
      query: data.query,
      page: pageId,
      scope: selectedScope,
    });
  } else if (data.type === 'reply' && data.page !== pageId && typeof data.scope === 'string') {
    if (data.scope) probes.get(data.query)?.add(data.scope);
  } else if (
    (data.type === 'selected' && typeof data.scope === 'string') ||
    data.type === 'logout'
  ) {
    if (data.type === 'logout' || data.scope === selectedScope) selectedScope = '';
    for (const listener of listeners) listener(data);
  }
};
async function discover() {
  const query = crypto.randomUUID();
  const result = new Set<string>();
  probes.set(query, result);
  channel.postMessage({ type: 'probe', query, page: pageId });
  // One bounded foreground check, never a background polling loop.
  await new Promise<void>((resolve) => setTimeout(resolve, 200));
  probes.delete(query);
  return result;
}
function claim(candidate: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    void navigator.locks
      .request(`open-legend:tab:${candidate}`, { ifAvailable: true }, (lock) => {
        if (!lock) {
          resolve(false);
          return;
        }
        resolve(true);
        // The browser releases this lock during document unloading, including
        // reload. Keep it through page hiding/BFCache so another tab cannot
        // claim an identity that this document may later resume using.
        return new Promise<void>(() => {});
      })
      .catch(reject);
  });
}
export const tabIdentityReady = (async () => {
  if (typeof navigator === 'undefined' || !navigator.locks) {
    // Without cross-document exclusion, fresh document identity is the safe
    // fallback. Do not persist it: reload cannot promise controller recovery.
    return;
  }
  const candidate = savedIdentity();
  if (await claim(candidate)) identity = candidate;
  else if (!(await claim(identity))) throw new Error('Could not establish this tab’s identity.');
  try {
    sessionStorage.setItem(identityKey, identity);
  } catch {
    // Optional persistence: current-page identity remains unique.
  }
})();
export const tabClientId = () => identity;
export async function selectedTabElsewhere(scope: string): Promise<boolean> {
  await tabIdentityReady;
  return (await discover()).has(scope);
}
export function selectThisTab(scope: string): void {
  selectedScope = scope;
  channel.postMessage({ type: 'selected', scope });
}
export function forgetSelectedTab(): void {
  selectedScope = '';
}
export function announceLogout(): void {
  selectedScope = '';
  channel.postMessage({ type: 'logout' });
}
export function onTabNotice(listener: (notice: Notice) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
