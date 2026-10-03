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
  connectionId: string;
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
    const promise = this.create(actorId, name, profile)
      .then(async (resource) => {
        if (profile) await this.bindConnection(profile.connectionId, resource.workspaceId);
        return resource;
      })
      .finally(() => this.inFlight.delete(actorId));
    this.inFlight.set(actorId, promise);
    return promise;
  }
  /** Operator-approved connection ceiling plus a single workspace grant. Never make
   * the world connection organization-wide or broaden a profile's immutable tools.
   * Persist the original conditional request so ambiguity cannot create a new grant. */
  private async bindConnection(connectionId: string, workspaceId: string): Promise<void> {
    const key = `macrofold-world-access:${connectionId}:${workspaceId}`;
    const state = (await this.store.getIntegration(key)) as
      | { granted?: boolean; pending?: boolean; version: string; operationId: string }
      | undefined;
    if (state?.granted) return;
    const access = state?.pending
      ? state
      : object(await this.api.request(`/v1/connections/${connectionId}/access`));
    const version = string(access.version);
    const operationId = state?.pending ? state.operationId : digest({ key, version });
    await this.store.putIntegration(key, { pending: true, version, operationId });
    try {
      await this.api.request(
        `/v1/connections/${connectionId}/access/rules`,
        { scope: 'workspace', workspace_id: workspaceId },
        operationId,
        undefined,
        1_000_000,
        undefined,
        version,
      );
      await this.store.putIntegration(key, { granted: true, version, operationId });
    } catch (error) {
      // A stale access revision proves this grant was not accepted. An explicit
      // later conversation request can review the new ceiling before dispatch.
      if (error instanceof MacrofoldHttpError && error.status === 412)
        await this.store.putIntegration(key, { pending: false, version, operationId });
      throw error;
    }
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
