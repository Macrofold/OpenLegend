import { randomUUID } from 'node:crypto';
import type { GameRepository } from './store.js';

/** Instance identity is outside rewindable native checkpoints. Every provider provisioning
 * entry point uses it so game, lab and independent lab instances cannot share mutable workspaces. */
export async function executionNamespace(
  store: Pick<GameRepository, 'getIntegration' | 'putIntegration'>,
): Promise<string> {
  const existing = await store.getIntegration('runtime-execution-namespace');
  if (typeof existing === 'string' && existing) return existing;
  const namespace = randomUUID();
  await store.putIntegration('runtime-execution-namespace', namespace);
  return namespace;
}
