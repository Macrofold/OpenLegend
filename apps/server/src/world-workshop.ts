import { z } from 'zod';
import { describeInvention, validateDeclaration, type DeclarationDraft } from '@open-legend/domain';
import { digest, type SqlDatabase } from './store.js';
import { normalizeInventionProposal } from './invention-service.js';
import { scopedInventionErrors } from './invention-context.js';
import {
  WorkshopError,
  WorkshopSessions,
  type WorkshopDraft,
  type WorkshopSession,
} from './workshop-session.js';
import type { WorldService } from './world-service.js';

const context = { contextHandle: z.string().uuid() };
const mutation = {
  ...context,
  operationId: z.string().uuid(),
  expectedRevision: z.number().int().positive(),
};
const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const WORLD_WRITE_TOOLS = {
  ol_workshop: {
    description:
      'Read this explicitly authorized workshop session, current draft, approval and shared spending. No new session or funding is created.',
    schema: z.object(context).strict(),
    readOnly: true,
  },
  ol_draft_save: {
    description:
      'Save a new immutable recipe draft revision, including invalid drafts and native findings. Reuse the exact operationId on a transport retry. Does not install, craft or spend. Read ol_context for the supported recipe schema.',
    schema: z
      .object({
        ...mutation,
        intent: z.string().trim().min(1).max(4000),
        candidateJson: z.string().min(2).max(12000),
        baseRecipeId: z.string().min(1).max(200).optional(),
      })
      .strict(),
    readOnly: false,
  },
  ol_draft_read: {
    description:
      'Read an exact retained draft revision from this session; default is the selected draft. Includes original intent, actual candidate and native validation limitations.',
    schema: z.object({ ...context, draftId: hash.optional() }).strict(),
    readOnly: true,
  },
  ol_approval_request: {
    description:
      'Request human review of the exact selected recipe draft. This cannot approve the proposal. Refresh after changed dependencies; no live world change.',
    schema: z.object({ ...mutation, candidateDigest: hash }).strict(),
    readOnly: false,
  },
  ol_change_apply: {
    description:
      'Install the exact human-approved selected recipe through native admission, then teach the session-bound player under existing rules. Resume the world first. Does not craft an item, rewrite old objects or support arbitrary module changes.',
    schema: z.object({ ...mutation, candidateDigest: hash }).strict(),
    readOnly: false,
  },
  ol_budget: {
    description:
      'Read spent, reserved, uncertain and remaining funds under the same workshop cap. No top-up or automatic reset.',
    schema: z.object(context).strict(),
    readOnly: true,
  },
} as const;
export type WorldWriteName = keyof typeof WORLD_WRITE_TOOLS;
export interface WorkshopResult {
  status: string;
  message?: string;
  data?: unknown;
  receipt?: unknown;
}

/** Shared local/MCP write service. Models author candidates; humans approve exact bytes;
 * the existing native admission remains the only recipe writer.
 * docs/world-agent-runtime.md#implemented-session-and-write-boundary
 */
export class WorldWorkshop {
  readonly sessions: WorkshopSessions;
  private tail: Promise<unknown> = Promise.resolve();
  constructor(
    readonly service: WorldService,
    db: SqlDatabase,
    private readonly checkAvailable: () => void = () => {},
  ) {
    this.sessions = new WorkshopSessions(service, db);
  }
  private serial<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.tail.then(fn);
    this.tail = next.catch(() => undefined);
    return next;
  }
  private dependencies(candidate: unknown, base?: WorkshopDraft['base']) {
    const world = this.service.world;
    const raw = candidate as Partial<DeclarationDraft> | null;
    const ids = new Set<string>();
    if (Array.isArray(raw?.inputs))
      for (const input of raw.inputs)
        if (typeof input?.definitionId === 'string') ids.add(input.definitionId);
    if (typeof raw?.output?.gatheringTool?.resourceId === 'string')
      ids.add(raw.output.gatheringTool.resourceId);
    return digest({
      profile: world.profile,
      manifest: world.moduleManifest.revision,
      policy: world.inventionPolicy,
      definitions: [...ids]
        .sort()
        .map((id) => [
          id,
          Object.hasOwn(world.itemDefinitions, id) ? world.itemDefinitions[id] : null,
        ]),
      base: base ? (world.recipes[base.recipeId] ?? null) : null,
    });
  }
  private draftKey(session: WorkshopSession, id: string) {
    return `world-workshop:draft:${session.id}:${id}`;
  }
  private currentDraft(session: WorkshopSession, candidateDigest: string) {
    const draft = session.selected;
    if (!draft || draft.digest !== candidateDigest)
      throw new WorkshopError('stale', 'Read the currently selected draft before continuing.');
    if (draft.errors.length)
      throw new WorkshopError('blocked', 'The draft still has native validation failures.');
    if (draft.dependencies !== this.dependencies(draft.candidate, draft.base))
      throw new WorkshopError(
        'stale',
        'Relevant definitions or policy changed. Save and review a new revision.',
      );
    return draft;
  }
  async view(session: WorkshopSession) {
    return {
      id: session.id,
      contextHandle: session.contextHandle,
      revision: session.revision,
      closed: session.closed,
      worldId: session.worldId,
      actorId: session.actorId,
      selected: session.selected ?? null,
      approval: session.approval ?? null,
      application: session.application ?? null,
      budget: await this.sessions.exposure(session),
      coverage:
        'Finite recipe authoring; native checks do not prove full interactions or natural-language intent fidelity. Apply and crafting are separate.',
    };
  }
  async begin(conversationId: string) {
    return this.serial(async () => {
      this.checkAvailable();
      return this.view(await this.sessions.begin(conversationId));
    });
  }
  async get(contextHandle: string) {
    this.checkAvailable();
    return this.view(await this.sessions.get(contextHandle));
  }

  async execute(
    name: string,
    input: unknown,
    checkGrant: () => void = () => {},
  ): Promise<WorkshopResult> {
    if (!Object.hasOwn(WORLD_WRITE_TOOLS, name))
      return { status: 'invalid', message: 'Unknown workshop tool.' };
    const spec = WORLD_WRITE_TOOLS[name as WorldWriteName];
    const parsed = spec.schema.safeParse(input);
    if (!parsed.success)
      return { status: 'invalid', message: 'Arguments do not match the workshop tool schema.' };
    return this.serial(async () => {
      try {
        const args = parsed.data;
        let session = await this.sessions.get(args.contextHandle);
        const check = () => {
          this.checkAvailable();
          checkGrant();
          this.sessions.assertCurrent(session);
        };
        check();
        if (name === 'ol_workshop') return { status: 'ok', data: await this.view(session) };
        if (name === 'ol_budget')
          return { status: 'ok', data: await this.sessions.exposure(session) };
        if (name === 'ol_draft_read') {
          const id = (args as { draftId?: string }).draftId;
          const draft = id
            ? await this.service.store.getIntegration(this.draftKey(session, id))
            : session.selected;
          return { status: draft ? 'ok' : 'unavailable', data: draft ?? null };
        }
        const write = args as z.infer<typeof WORLD_WRITE_TOOLS.ol_change_apply.schema>;
        const fingerprint = digest({ name, args });
        const key = this.sessions.receiptKey(session.id, write.operationId);
        const previous = (await this.service.store.getIntegration(key)) as
          | { fingerprint: string; result?: WorkshopResult }
          | undefined;
        const requestId = `wa-${digest([session.id, write.operationId])}`;
        const resuming =
          !!previous &&
          !previous.result &&
          name === 'ol_change_apply' &&
          session.application?.operationId === write.operationId;
        if (previous) {
          if (previous.fingerprint !== fingerprint)
            throw new WorkshopError('conflict', 'Operation ID was used for different input.');
          if (previous.result) return previous.result;
          // Only this unpaid native operation can resume from its exact durable claim.
          // External inference/art attempts still never redispatch on uncertain completion.
          if (!resuming)
            throw new WorkshopError(
              'uncertain',
              'Read retained state before continuing this unresolved operation.',
            );
          const receipt = this.service.world.declarationReceipts[requestId];
          if (receipt) {
            const result = {
              status: 'ok',
              message: 'Native installation already committed.',
              receipt,
            };
            await this.sessions.save(
              session,
              {
                ...session,
                application: { operationId: write.operationId, requestId, state: 'applied' },
              },
              [{ key, value: { fingerprint, result } }],
              check,
            );
            return result;
          }
        }
        if (!resuming && session.revision !== write.expectedRevision)
          throw new WorkshopError(
            'conflict',
            'Workshop revision changed. Read ol_workshop before continuing.',
          );
        if (session.application?.state === 'pending' && !resuming)
          throw new WorkshopError(
            'busy',
            'Reconcile the pending native Apply with its original operation ID first.',
          );
        if (session.revision >= 4096 && !resuming)
          throw new WorkshopError(
            'capacity',
            'Workshop mutation limit reached. Retained drafts and receipts remain readable.',
          );
        let next: WorkshopSession = { ...session };
        const records: { key: string; value: unknown }[] = [];
        let result: WorkshopResult;
        if (name === 'ol_draft_save') {
          const value = args as z.infer<typeof WORLD_WRITE_TOOLS.ol_draft_save.schema>;
          if ((session.selected?.revision ?? 0) >= 512)
            throw new WorkshopError(
              'capacity',
              'This session has reached its retained draft limit. Export/read the selected draft before starting a new session.',
            );
          let candidate: unknown;
          try {
            candidate = normalizeInventionProposal(JSON.parse(value.candidateJson));
          } catch {
            throw new WorkshopError('invalid', 'Candidate must be valid JSON.');
          }
          const recipe =
            value.baseRecipeId && Object.hasOwn(this.service.world.recipes, value.baseRecipeId)
              ? this.service.world.recipes[value.baseRecipeId]
              : undefined;
          if (value.baseRecipeId && !recipe)
            throw new WorkshopError('unavailable', 'Selected base is not installed.');
          const base = recipe
            ? { recipeId: recipe.id, version: recipe.version, digest: recipe.digest }
            : undefined;
          const draft: WorkshopDraft = {
            id: digest([session.id, write.operationId]),
            revision: (session.selected?.revision ?? 0) + 1,
            digest: digest(candidate),
            intent: value.intent,
            candidate,
            ...(base ? { base } : {}),
            errors: validateDeclaration(this.service.world, candidate),
            dependencies: this.dependencies(candidate, base),
          };
          next = { ...session, selected: draft };
          delete next.approval;
          delete next.application;
          records.push({ key: this.draftKey(session, draft.id), value: draft });
          result = {
            status: 'ok',
            data: {
              draft,
              revision: session.revision + 1,
              summary: draft.errors.length
                ? 'Draft retained with native findings; not ready to apply.'
                : describeInvention(candidate as DeclarationDraft),
            },
          };
        } else if (name === 'ol_approval_request') {
          const draft = this.currentDraft(session, write.candidateDigest);
          next.approval = {
            ...(session.approval?.digest === draft.digest ? session.approval : {}),
            digest: draft.digest,
            dependencies: draft.dependencies,
            requested: true,
          };
          result = {
            status: 'needs_approval',
            message: 'Review card ready. The human must approve this exact revision in OpenLegend.',
            data: { revision: session.revision + 1 },
          };
        } else {
          const draft = this.currentDraft(session, write.candidateDigest);
          if (
            session.approval?.digest !== draft.digest ||
            session.approval.dependencies !== draft.dependencies ||
            session.approval.approvedBy !== session.accountId
          )
            throw new WorkshopError(
              'needs_approval',
              'Human approval of this exact draft is required.',
            );
          if (session.application?.state === 'applied')
            throw new WorkshopError(
              'blocked',
              'This draft is already applied. Read its receipt or save a new draft.',
            );
          if (session.actorId !== this.service.controlledEntityId)
            throw new WorkshopError(
              'forbidden',
              'Control changed. This session cannot install on behalf of another actor.',
            );
          const errors = scopedInventionErrors(this.service, session.actorId, draft.candidate);
          if (errors.length) throw new WorkshopError('blocked', errors.join(' '));
          // Persist intent before native commit; a lost response cannot silently duplicate effects.
          if (!resuming) {
            await this.sessions.save(
              session,
              {
                ...session,
                application: { operationId: write.operationId, requestId, state: 'pending' },
              },
              [{ key, value: { fingerprint } }],
              check,
            );
            session = await this.sessions.get(args.contextHandle);
          }
          const outcome = await this.service.admit(
            draft.candidate as DeclarationDraft,
            {
              requestId,
              actorId: session.actorId,
              source: 'supplied-proposal',
              authority: {
                origin: 'player',
                policyRevision: this.service.world.inventionPolicy.revision,
              },
              ...(draft.base ? { derivedFrom: draft.base } : {}),
              evidence: ['Exact World Agent draft approved by the initiating player.'],
            },
            () => {
              check();
              if (session.actorId !== this.service.controlledEntityId)
                throw new WorkshopError('forbidden', 'Actor control changed.');
              this.currentDraft(session, draft.digest);
            },
          );
          result = {
            status: outcome.ok ? 'ok' : 'blocked',
            message: outcome.message,
            receipt:
              this.service.world.declarationReceipts[
                `wa-${digest([session.id, write.operationId])}`
              ] ?? outcome,
          };
          const completed: WorkshopSession = { ...session };
          if (outcome.ok)
            completed.application = { operationId: write.operationId, requestId, state: 'applied' };
          else delete completed.application;
          // A failed metadata save is reconciled from the committed native receipt on retry.
          await this.sessions.save(
            session,
            completed,
            [{ key, value: { fingerprint, result } }],
            check,
          );
          return result;
        }
        records.push({ key, value: { fingerprint, result } });
        await this.sessions.save(session, next, records, check);
        return result;
      } catch (error) {
        if (error instanceof WorkshopError) return { status: error.code, message: error.message };
        return {
          status: 'unavailable',
          message:
            'Workshop operation could not complete. Read retained state before retrying; do not assume no effect.',
        };
      }
    });
  }

  /** Human-only entrypoint: never registered as an MCP tool. */
  async approve(
    handle: string,
    expectedRevision: number,
    candidateDigest: string,
    approve: boolean,
  ) {
    return this.serial(async () => {
      this.checkAvailable();
      const session = await this.sessions.get(handle);
      if (session.revision !== expectedRevision)
        throw new WorkshopError('conflict', 'Review changed. Refresh before deciding.');
      const draft = this.currentDraft(session, candidateDigest);
      if (!session.approval?.requested || session.approval.digest !== draft.digest)
        throw new WorkshopError('stale', 'This candidate has no current approval request.');
      if (session.application) throw new WorkshopError('busy', 'An Apply is pending or completed.');
      const next = { ...session };
      if (approve)
        next.approval = {
          digest: draft.digest,
          dependencies: draft.dependencies,
          requested: true,
          approvedBy: session.accountId,
        };
      else delete next.approval;
      await this.sessions.save(session, next, [], this.checkAvailable);
      return this.get(handle);
    });
  }
  async close(handle: string) {
    return this.serial(async () => {
      this.checkAvailable();
      const session = await this.sessions.get(handle);
      await this.sessions.save(session, { ...session, closed: true }, [], this.checkAvailable);
    });
  }
}
