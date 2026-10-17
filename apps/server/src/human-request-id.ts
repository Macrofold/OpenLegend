import type { RequestScope } from './authority.js';
import { digest } from './content-digest.js';

/** Browser request IDs belong to the submitting account and world, not a control lease. */
export function humanRequestId(authority: RequestScope, id: string): string {
  return `human:${digest({ account: authority.accountId, world: authority.worldId, id })}`;
}
