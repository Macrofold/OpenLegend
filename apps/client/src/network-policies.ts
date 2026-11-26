import { inCognitionLab } from './lab-location';
/** Reviewed browser request semantics. A POST may be a read; recovery remains
 * with the caller retaining the original request, never with the transport.
 * docs/projects/completed/bounded-network-requests-tech-design.md#821-browser-request-classification-and-uncertain-outcome-recovery
 */
export type BrowserRequestClass = 'read' | 'preparation' | 'mutation' | 'presence';
export interface BrowserRequestPolicy {
  method: 'GET' | 'POST';
  pathname: string;
  discriminator?: string;
  semantic: BrowserRequestClass;
  timeoutMs: number;
  recovery: 'observation' | 'receipt' | 'same-id' | 'current-state' | 'unconfirmed' | 'latest';
}
const entries: BrowserRequestPolicy[] = [];
function routes(
  method: BrowserRequestPolicy['method'],
  paths: readonly string[],
  semantic: BrowserRequestClass,
  timeoutMs: number,
  recovery: BrowserRequestPolicy['recovery'],
) {
  for (const pathname of paths) entries.push({ method, pathname, semantic, timeoutMs, recovery });
}
routes(
  'GET',
  [
    '/api/cognition-lab/decisions',
    '/api/cognition-lab/decisions/settings',
    '/api/cognition-lab/runs',
  ],
  'read',
  15_000,
  'observation',
);
routes(
  'POST',
  ['/api/cognition-lab/replay', '/api/cognition-lab/decisions/stimuli'],
  'mutation',
  15_000,
  'receipt',
);
routes(
  'POST',
  [
    '/api/cognition-lab/scenarios/start',
    '/api/cognition-lab/scenarios/import',
    '/api/cognition-lab/scenarios/export',
  ],
  'mutation',
  60_000,
  'same-id',
);
routes('POST', ['/api/cognition-lab/decisions/reruns'], 'mutation', 45_000, 'same-id');
routes(
  'POST',
  [
    '/api/cognition-lab/comparisons',
    '/api/cognition-lab/decisions/reruns/history',
    '/api/cognition-lab/decisions/participants',
    '/api/cognition-lab/fields',
    '/api/cognition-lab/fields/detail',
  ],
  'read',
  15_000,
  'observation',
);
routes(
  'POST',
  [
    '/api/cognition-lab/prepare',
    '/api/cognition-lab/fields/edit',
    '/api/cognition-lab/holds',
    '/api/cognition-lab/scene/participation',
    '/api/cognition-lab/decisions/control',
    '/api/cognition-lab/decisions/settings',
    '/api/cognition-lab/decisions/participants/edit',
    '/api/cognition-lab/runs',
    '/api/god/editor/person/author',
  ],
  'mutation',
  15_000,
  'current-state',
);
routes(
  'GET',
  [
    '/api/state',
    '/api/operations',
    '/api/session',
    '/api/history',
    '/api/profile',
    '/api/ai/usage',
    '/api/world-events',
    '/api/construction',
    '/api/construction/hearths',
    '/api/player-interaction/availability',
    '/api/world-agent/creation/openings',
    '/api/world-agent/creation/targets',
  ],
  'read',
  15_000,
  'observation',
);
routes(
  'POST',
  [
    '/api/actions',
    '/api/activity-requests',
    '/api/activity-choices',
    '/api/activity-status',
    '/api/activity-preview',
    '/api/activity-history',
    '/api/god/activity-history',
    '/api/commitments',
    '/api/construction/preview',
    '/api/work-batches/preview',
    '/api/inventory',
    '/api/inventory/bindings',
    '/api/trade/disclosures',
    '/api/trade',
    '/api/inventory/access',
    '/api/inventory/destinations',
    '/api/inventory/history',
    '/api/known-places',
    '/api/known-places/inspect',
    '/api/god/family',
    '/api/god/family/people',
    '/api/god/invention-policy',
    '/api/god/editor/person',
    '/api/god/editor/person/inventory',
    '/api/god/editor/person/memory',
    '/api/god/editor/story',
    '/api/god/editor/world-events',
    '/api/god/editor/world-event',
    '/api/world-events/sources',
    '/api/mind',
    '/api/memories',
    '/api/god/mind',
    '/api/god/memories',
    '/api/mind/subjects',
    '/api/god/mind/subjects',
    '/api/god/triggers',
    '/api/god/trigger',
    '/api/god/intelligence-details',
    '/api/god/intelligence-stage',
    '/api/god/intelligence-calls',
    '/api/saves/list',
    '/api/world-agent/session/list',
    '/api/world-agent/session/status',
    '/api/world-agent/session/turns',
    '/api/world-agent/session/turn',
    '/api/world-agent/session/review',
    '/api/world-agent/session/draft-read',
    '/api/world-agent/session/draft-history',
    '/api/world-agent/session/draft-compare',
    '/api/world-agent/session/removal-page',
    '/api/world-agent/inspect',
    '/api/world-agent/tools',
  ],
  'read',
  15_000,
  'observation',
);
routes(
  'POST',
  [
    '/api/command/receipt',
    '/api/action-attempt/receipt',
    '/api/chat/receipt',
    '/api/saves/receipt',
    '/api/assets/selection-result',
    '/api/world-agent/creation/recover',
  ],
  'read',
  15_000,
  'receipt',
);
routes('POST', ['/api/inventions/list', '/api/inventions/receipt'], 'read', 15_000, 'receipt');
routes(
  'POST',
  [
    '/api/construction/hearth-preview',
    '/api/world-agent/session/draft-preview',
    '/api/world-agent/session/draft-check',
  ],
  'preparation',
  15_000,
  'observation',
);
routes(
  'POST',
  [
    '/api/command',
    '/api/action-attempt',
    '/api/expression',
    '/api/chat',
    '/api/chat/retry',
    '/api/assets/install',
    '/api/world-agent/creation/start',
    '/api/world-agent/creation/cancel',
    '/api/world-agent/session/decision',
    '/api/world-agent/session/apply',
  ],
  'mutation',
  30_000,
  'receipt',
);
routes(
  'POST',
  [
    '/api/world-agent/creation/draft',
    '/api/world-agent/session/draft-save',
    '/api/world-agent/session/draft-prepare',
    '/api/world-agent/session/removal',
    '/api/world-agent/session/question-answer',
    '/api/world-agent/session/question-continue',
    '/api/world-agent/session/open',
    '/api/god/items',
    '/api/god/spawn',
    '/api/god/person',
  ],
  'mutation',
  30_000,
  'same-id',
);
routes(
  'POST',
  [
    '/api/world-agent/session/cancel',
    '/api/world-agent/close',
    '/api/ai/cancel',
    '/api/saves/delete',
    '/api/saves/settings',
    '/api/saves/acknowledge',
    '/api/profile/preferences',
    '/api/invites/revoke',
    '/api/access',
    '/api/maintenance/schedule',
    '/api/maintenance/update',
    '/api/maintenance/cancel',
    '/api/maintenance/start',
    '/api/maintenance/ready',
    '/api/god/container-access',
    '/api/god/ownership',
    '/api/god/family/edit',
    '/api/god/appraisal',
    '/api/attention',
    '/api/knowledge',
    '/api/nickname',
    '/api/map/marker',
    '/api/god/knowledge',
    '/api/god/act',
    '/api/god/construction-shower',
    '/api/god/invention-policy/save',
    '/api/god/editor/person/save',
    '/api/god/editor/story/save',
    '/api/god/editor/world-events/save',
  ],
  'mutation',
  30_000,
  'current-state',
);
routes('POST', ['/api/invites/create'], 'mutation', 30_000, 'unconfirmed');
routes('POST', ['/api/saves/create', '/api/saves/load'], 'mutation', 60_000, 'receipt');
routes(
  'POST',
  ['/api/control', '/api/embodiment', '/api/session/logout'],
  'mutation',
  15_000,
  'current-state',
);
routes('POST', ['/api/presence'], 'presence', 5_000, 'latest');
// Fixed transient input never retries a stale direction or creates a durable action receipt.
routes('POST', ['/api/input'], 'presence', 1_000, 'latest');
export const STEERING_STOP = 'stop-steering';
entries.push({
  method: 'POST',
  pathname: '/api/input',
  discriminator: STEERING_STOP,
  semantic: 'presence',
  timeoutMs: 1_000,
  recovery: 'latest',
});
entries.push(
  {
    method: 'POST',
    pathname: '/api/world-agent/messages',
    discriminator: 'authoring',
    semantic: 'mutation',
    timeoutMs: 30_000,
    recovery: 'same-id',
  },
  {
    method: 'POST',
    pathname: '/api/world-agent/messages',
    discriminator: 'invention',
    semantic: 'mutation',
    timeoutMs: 15_000,
    recovery: 'receipt',
  },
  {
    method: 'POST',
    pathname: '/api/god/status-effects',
    discriminator: 'read',
    semantic: 'read',
    timeoutMs: 15_000,
    recovery: 'observation',
  },
  {
    method: 'POST',
    pathname: '/api/god/status-effects',
    discriminator: 'write',
    semantic: 'mutation',
    timeoutMs: 30_000,
    recovery: 'current-state',
  },
);
/** Resource builders use this root; the closed path shapes below still admit each request. */
export const cognitionLabApiRoot = '/api/cognition-lab';
export const browserRequestPolicies: readonly Readonly<BrowserRequestPolicy>[] = Object.freeze(
  entries.map((entry) => Object.freeze(entry)),
);

function stopsSteering(input: object): boolean {
  if (!('kind' in input) || input.kind !== 'steer' || !('direction' in input)) return false;
  const direction = input.direction;
  return (
    direction !== null &&
    typeof direction === 'object' &&
    'x' in direction &&
    direction.x === 0 &&
    'z' in direction &&
    direction.z === 0
  );
}

export function browserRequestPolicy(
  method: BrowserRequestPolicy['method'],
  path: string,
  body?: unknown,
): Readonly<BrowserRequestPolicy> {
  // API requests are same-origin paths. Queries contain identities, not policy.
  if (!path.startsWith('/api/') || path.startsWith('//') || path.includes('#'))
    throw new Error('The requested server operation is unavailable.');
  const rawPath = path.split('?')[0] ?? '';
  const pathname = /^\/api\/cognition-lab\/runs\/[a-f0-9-]{36}\/replay\/[a-f0-9-]{36}$/.test(
    rawPath,
  )
    ? '/api/cognition-lab/replay'
    : rawPath;
  const object = body && typeof body === 'object' ? body : {};
  const discriminator =
    pathname === '/api/world-agent/messages'
      ? 'sessionId' in object
        ? 'authoring'
        : 'invention'
      : pathname === '/api/god/status-effects'
        ? Object.keys(object).length
          ? 'write'
          : 'read'
        : pathname === '/api/input' && stopsSteering(object)
          ? STEERING_STOP
          : undefined;
  const policy = browserRequestPolicies.find(
    (entry) =>
      entry.method === method &&
      entry.pathname === pathname &&
      entry.discriminator === discriminator,
  );
  if (!policy) throw new Error('The requested server operation is unavailable.');
  return policy;
}

/** Classify ordinary requests before routing them into the independently authorized Lab. */
export function runtimeApiPath(path: string): string {
  return inCognitionLab && path.startsWith('/api/') && !path.startsWith('/api/cognition-lab/')
    ? '/api/cognition-lab' + path
    : path;
}
