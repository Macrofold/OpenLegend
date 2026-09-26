import {
  MacrofoldTransport,
  MacrofoldHttpError,
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
export interface WorkspaceToolProfile {
  id: string;
  permissions: unknown;
}
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
  async ensure(
    actorId: string,
    name: string,
    profile?: WorkspaceToolProfile,
  ): Promise<ActorWorkspace> {
    if (profile) actorId = `tools:${profile.id}:${actorId}`;
    const previous = this.inFlight.get(actorId);
    if (previous) return previous;
    const promise = this.create(actorId, name, profile).finally(() =>
      this.inFlight.delete(actorId),
    );
    this.inFlight.set(actorId, promise);
    return promise;
  }
  private async create(
    actorId: string,
    name: string,
    profile?: WorkspaceToolProfile,
  ): Promise<ActorWorkspace> {
    const key = `macrofold-actor-v2:${digest(this.config.macrofoldUrl)}:${this.worldId}:${actorId}`;
    const state = (await this.store.getIntegration(key)) as
      | {
          operationId: string;
          pending?: boolean;
          body?: Record<string, unknown>;
          result?: ActorWorkspace;
        }
      | undefined;
    if (state?.result) return state.result;
    if (state?.pending && !state.body)
      throw new Error(
        'Workspace creation has no saved request body; reconcile its original operation before retrying.',
      );
    const operationId = state?.operationId ?? digest({ key, version: 1 });
    const body = state?.body ?? {
      name: `Open Legend · ${name} · ${digest(this.worldId).slice(0, 8)}`.slice(0, 120),
      persistence: 'persistent',
      permissions: profile?.permissions ?? COGNITION_PERMISSIONS,
    };
    // Creation recovery repeats the exact provider identity/body; renamed actors cannot
    // accidentally change a pending request. docs/architecture.md#macrofold-worker-ownership
    await this.store.putIntegration(key, { operationId, body, pending: true });
    try {
      const created = object(await this.api.request('/v1/workspaces', body, operationId));
      const result = {
        workspaceId: string(created['id']),
        worktreeId: string(created['default_worktree_id']),
      };
      await this.store.putIntegration(key, { operationId, result });
      return result;
    } catch (error) {
      if (error instanceof MacrofoldHttpError && error.admissionRejected)
        await this.store.putIntegration(key, {
          operationId,
          body,
          pending: false,
          status: error.status,
          code: error.code,
        });
      throw error;
    }
  }
}
