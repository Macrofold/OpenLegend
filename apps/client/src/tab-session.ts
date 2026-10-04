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
let identity = savedIdentity();
let selectedScope = '';
const channel = new BroadcastChannel('open-legend:game-tabs');
type Notice = { type: 'selected'; scope: string } | { type: 'logout' };
type Message =
  | Notice
  | { type: 'probe'; query: string; page: string }
  | { type: 'reply'; query: string; page: string; identity: string; scope: string };
const listeners = new Set<(notice: Notice) => void>();
const probes = new Map<string, { identities: Set<string>; scopes: Set<string> }>();
channel.onmessage = ({ data }: MessageEvent<Message>) => {
  if (!data || typeof data !== 'object') return;
  if (data.type === 'probe' && typeof data.query === 'string') {
    channel.postMessage({
      type: 'reply',
      query: data.query,
      page: pageId,
      identity,
      scope: selectedScope,
    });
  } else if (
    data.type === 'reply' &&
    data.page !== pageId &&
    typeof data.identity === 'string' &&
    typeof data.scope === 'string'
  ) {
    probes.get(data.query)?.identities.add(data.identity);
    if (data.scope) probes.get(data.query)?.scopes.add(data.scope);
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
  const result = { identities: new Set<string>(), scopes: new Set<string>() };
  probes.set(query, result);
  channel.postMessage({ type: 'probe', query, page: pageId });
  // One bounded foreground check, never a background polling loop.
  await new Promise<void>((resolve) => setTimeout(resolve, 200));
  probes.delete(query);
  return result;
}
export const tabIdentityReady = discover().then((peers) => {
  // Duplicated tabs copy sessionStorage. Detect the original live page before
  // sending any server request, while an ordinary reload keeps its tab ID.
  if (peers.identities.has(identity)) identity = crypto.randomUUID();
  try {
    sessionStorage.setItem(identityKey, identity);
  } catch {
    // Optional persistence: current-page identity remains unique.
  }
});
export const tabClientId = () => identity;
export async function selectedTabElsewhere(scope: string): Promise<boolean> {
  await tabIdentityReady;
  return (await discover()).scopes.has(scope);
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
