import {
  MacrofoldTransport,
  macrofoldObject as object,
  macrofoldString as string,
} from '@open-legend/ai';
import { digest, type GameRepository } from './store.js';
import type { AppConfig } from './config.js';
export const COGNITION_PERMISSIONS = {
  version: 1,
  shell: 'deny',
  files: {
    read: { include: ['mind/*.md'] },
    write: { include: ['mind/*.md'], exclude: ['mind/identity.md'] },
  },
  tools: { include: [] },
};
export interface ActorWorkspace {
  workspaceId: string;
  worktreeId: string;
}
/** Shared by startup, actor creation and scripts/macrofold-seed.ts. No presets. */
export class MacrofoldProvisioner {
  private inFlight = new Map<string, Promise<ActorWorkspace>>();
  private api: MacrofoldTransport;
  constructor(
    private config: AppConfig,
    private store: GameRepository,
    private worldId: string,
  ) {
    this.api = new MacrofoldTransport(config.macrofoldUrl, config.macrofoldKey);
  }
  ensure(actorId: string, name: string): Promise<ActorWorkspace> {
    const previous = this.inFlight.get(actorId);
    if (previous) return previous;
    const promise = this.create(actorId, name).finally(() => this.inFlight.delete(actorId));
    this.inFlight.set(actorId, promise);
    return promise;
  }
  private async create(actorId: string, name: string): Promise<ActorWorkspace> {
    const key = `macrofold-actor-v2:${digest(this.config.macrofoldUrl)}:${this.worldId}:${actorId}`;
    const state = this.store.getIntegration(key) as
      | { operationId: string; pending?: boolean; result?: ActorWorkspace }
      | undefined;
    if (state?.result) return state.result;
    if (state?.pending)
      throw new Error('Workspace creation admission uncertain; reconcile before creating another.');
    const operationId = digest({ key, version: 1 });
    this.store.putIntegration(key, { operationId, pending: true });
    const created = object(
      await this.api.request(
        '/v1/workspaces',
        {
          name: `Open Legend · ${name} · ${digest(this.worldId).slice(0, 8)}`.slice(0, 120),
          persistence: 'persistent',
          permissions: COGNITION_PERMISSIONS,
        },
        operationId,
      ),
    );
    const result = {
      workspaceId: string(created['id']),
      worktreeId: string(created['default_worktree_id']),
    };
    this.store.putIntegration(key, { operationId, result });
    return result;
  }
}
