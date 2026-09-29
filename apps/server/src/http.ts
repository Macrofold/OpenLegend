import { WorkLane, OverloadError } from './work-lane.js';
import { foundationCapabilities } from './foundation-capabilities.js';
import { continuitySubjects, continuityView } from './continuity-view.js';
import { memoryHistory } from './memory-history.js';
import { commitmentPage } from './commitment-view.js';
import {
  AuthorityError,
  capabilitySchema,
  isCharacterless,
  scopeKey,
  type Capability,
  type RequestScope,
} from './authority.js';
import { OperationsRoutes, characterlessRoute } from './operations-routes.js';
import { OpenIdAuthentication, browserLoginToken } from './authentication.js';
import { NavigationCoordinator } from './navigation/coordinator.js';
import { HistoryCursorError } from './perceived-events.js';
import { readHttpJson } from './http-json.js';
import { WorldAgentRunner } from './world-agent-runner.js';
import { WorldAgentStore } from './world-agent-store.js';
import { WorldAgentStream } from './world-agent-stream.js';
import { WorldAuthoringService } from './world-authoring.js';
import {
  sessionRequest,
  sessionTurnsRequest,
  sessionStatusRequest,
  sessionListRequest,
  AuthoringRequestError,
  sessionTurnRequest,
  sessionQuestionAnswerRequest,
  sessionQuestionContinueRequest,
  sessionOpenRequest,
  sessionDecisionRequest,
  sessionDraftReadRequest,
  sessionDraftHistoryRequest,
  sessionDraftCompareRequest,
  sessionDraftSaveRequest,
  sessionDraftPreviewRequest,
  sessionDraftCheckRequest,
  sessionDraftPrepareRequest,
  authoringToolRequest,
} from './world-authoring-contracts.js';
import { WorldToolService, WORLD_READ_TOOLS, worldReadRequest } from './world-tools.js';
import { createWorldMcp } from './world-mcp.js';
import { executeInventionTool, inventionToolInput } from './invention-tools.js';
import { GameSaveError } from './game-saves.js';
import { Autosaves } from './autosaves.js';
import {
  performanceSnapshot,
  timed,
  recordDuration,
  countMetric,
  startRuntimeMonitoring,
} from './performance.js';
import { amendCommitment, stateOwnerCapabilities, observerDescription } from '@open-legend/domain';
import { traceHistory, traceDetails } from './cognition-inspection.js';
import { admitStatusEffectPolicy, admitCognitionPolicy } from '@open-legend/domain';
import { inspectGodMind } from './god-mind.js';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { z } from 'zod';
import { intentSlotsSchema } from './navigation-contracts.js';
import type { AiClient } from '@open-legend/ai';
import { AiDirector } from './ai-director.js';
import { readConfig, type AppConfig } from './config.js';
import { PostgresDatabase } from './postgres.js';
import { SqlGameRepository, digest } from './store.js';
import { WorldService, commandInputSchema, requestIdSchema } from './world-service.js';
import { projectPatch, projectView } from './view.js';
import type { GameSaveCatalog, GameView } from '@open-legend/protocol';
import { actionCatalogue } from './action-catalogue.js';
import { containerPage, inventoryDestinationPage, objectHistoryPage } from './inventory-view.js';
import { activityRequests, activityStatus } from './activity-requests.js';

const clientId = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
const sequence = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const command = z
  .object({
    commandId: requestIdSchema,
    commandEpoch: z.string().uuid().optional(),
    command: commandInputSchema,
  })
  .strict();
const interaction = z
  .object({
    volume: z.enum(['whisper', 'normal', 'shout']).default('normal'),
    candidate: z.unknown().optional(),
    requestId: requestIdSchema,
    text: z.string().trim().min(1).max(1000),
    npcId: requestIdSchema.optional(),
  })
  .strict();
const worldAgentMessage = z
  .object({
    candidate: z.unknown().optional(),
    mode: z.enum(['discuss', 'invent', 'workshop']),
    continuation: z
      .object({
        parentId: requestIdSchema,
        action: z.enum(['clarify', 'revise', 'search', 'new', 'modify', 'reuse', 'apply']),
        recipeId: requestIdSchema.optional(),
        candidateDigest: z
          .string()
          .regex(/^[a-f0-9]{64}$/)
          .optional(),
      })
      .strict()
      .optional(),
    sessionId: requestIdSchema.optional(),
    retryOf: requestIdSchema.optional(),
    requestId: requestIdSchema,
    conversationId: requestIdSchema,
    worldId: requestIdSchema,
    text: z.string().trim().min(1).max(2000),
  })
  .strict();
const controls = z
  .object({
    paused: z.boolean().optional(),
    speed: z.union([z.literal(0.5), z.literal(1), z.literal(3), z.literal(8)]).optional(),
    clientId: clientId.optional(),
    presenceSequence: sequence.optional(),
  })
  .strict();
const presence = z
  .object({ clientId, visible: z.boolean(), sequence: sequence.optional() })
  .strict();
const actionContext = z
  .object({
    targetId: requestIdSchema.optional(),
    itemId: requestIdSchema.optional(),
    destinationId: requestIdSchema.optional(),
    quantity: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
    position: z
      .object({
        x: z.number().finite(),
        y: z.number().finite(),
        z: z.number().finite(),
        surfaceId: requestIdSchema,
      })
      .strict()
      .optional(),
  })
  .strict();
const preferences = z
  .object({
    showUnavailableActions: z.boolean().optional(),
    pauseWhenHidden: z.boolean().optional(),
    narratorVoice: z.enum(['restrained', 'lyrical', 'wry']).optional(),
    revealMode: z.enum(['off', 'player', 'nearby']).optional(),
    revealRadius: z.number().finite().min(2).max(12).optional(),
    revealStrength: z.number().finite().min(0.2).max(0.95).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Choose a preference to update.');
const position = z
  .object({
    x: z.number().finite(),
    y: z.number().finite(),
    z: z.number().finite(),
    surfaceId: requestIdSchema,
  })
  .strict();
const godSpawnType = z.enum([
  'banked-campfire',
  'berry-bush',
  'berry-thicket',
  'deer',
  'dry-grass-fibers',
  'fallen-branches',
  'hare',
  'river-reeds',
  'river-stones',
]);
const godPerson = z
  .object({
    name: z.string().trim().min(1).max(80),
    personality: z.string().trim().max(1000),
    backstory: z.string().trim().max(4000),
    traitIds: z.array(requestIdSchema).max(8),
    initialGoals: z.array(z.string().trim().min(1).max(500)).max(8),
  })
  .strict();
const godPersonEditor = z
  .object({
    inventory: z
      .array(
        z
          .object({
            definitionId: requestIdSchema,
            quantity: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
          })
          .strict(),
      )
      .optional(),
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().max(2000),
    personality: z.string().trim().max(1000),
    backstory: z.string().trim().max(4000),
    traitIds: z.array(requestIdSchema).max(8),
    goals: z.array(z.string().trim().min(1).max(500)).max(8),
    meters: z.record(requestIdSchema, z.number().finite()),
  })
  .strict();
const godAwareness = z
  .object({
    eventType: z.string().max(200).optional(),
    sourceId: requestIdSchema.optional(),
    targetId: requestIdSchema.optional(),
    triggerKind: z
      .enum([
        'addressed_speech',
        'overheard_speech',
        'self_event',
        'directed_action',
        'observed_event',
      ])
      .optional(),
    content: z.string().max(20_000).optional(),
    eventId: requestIdSchema,
    actorId: requestIdSchema,
    text: z.string().max(20_000),
    at: z.number().finite().min(0),
    sequence: z.number().int().min(0),
    modality: z.enum(['heard', 'observed', 'felt', 'internal']),
    recognized: z.boolean(),
    intelligible: z.boolean(),
    entityIds: z.array(requestIdSchema).max(100),
    importance: z.number().finite(),
    urgency: z.number().finite().min(0).max(10).optional(),
  })
  .strict();
const godMemory = z
  .object({
    obligation: z
      .object({
        revision: z.number().int().min(0),
        status: z.enum(['active', 'fulfilled', 'cancelled', 'overdue']),
        dueAt: z.number().finite().min(0).optional(),
        completion: z
          .object({ eventType: z.string().max(200), targetId: requestIdSchema.optional() })
          .strict()
          .optional(),
        evidenceId: requestIdSchema,
      })
      .strict()
      .optional(),
    eventType: z.string().max(200).optional(),
    speakerId: requestIdSchema.optional(),
    sequence: z.number().int().min(0).optional(),
    id: requestIdSchema,
    actorId: requestIdSchema,
    kind: z.enum(['episode', 'belief', 'commitment', 'reflection']),
    source: z.enum(['observed', 'heard', 'felt', 'internal', 'inferred', 'self_thought']),
    responseId: requestIdSchema.optional(),
    summary: z.string().max(20_000),
    at: z.number().finite().min(0),
    entityIds: z.array(requestIdSchema).max(100),
    eventId: requestIdSchema.optional(),
    importance: z.number().finite(),
    resolved: z.boolean().optional(),
  })
  .strict();
const godSummary = z
  .object({
    id: requestIdSchema,
    text: z.string().max(20_000),
    sequence: z.number().int().min(0).optional(),
    from: z.number().finite().min(0),
    to: z.number().finite().min(0),
    sourceIds: z.array(requestIdSchema).max(1000),
    entityIds: z.array(requestIdSchema).max(100),
    importance: z.number().finite(),
    revision: z.number().int().min(0).optional(),
  })
  .strict();
const godMemoryEdit = z.discriminatedUnion('source', [
  z.object({ source: z.literal('awareness'), value: godAwareness }).strict(),
  z.object({ source: z.literal('memory'), value: godMemory }).strict(),
  z.object({ source: z.literal('summary'), value: godSummary }).strict(),
]);
const editorHash = z.string().regex(/^[a-f0-9]{64}$/);
const godWorldEvent = z
  .object({
    id: requestIdSchema,
    sequence: z.number().int().min(0),
    at: z.number().finite().min(0),
    type: z.string().trim().min(1).max(200),
    text: z.string().max(20_000),
    actorId: requestIdSchema.optional(),
    targetId: requestIdSchema.optional(),
    audience: z.array(requestIdSchema).max(1000),
    importance: z.number().finite().min(0).max(10).optional(),
    urgency: z.number().finite().min(0).max(10).optional(),
    data: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  })
  .strict();

function writeJson(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(value));
}

/** Whole-shutdown budget: stages share it, then resource close is attempted regardless (PF06). */
export const SHUTDOWN_DEADLINE_MS = 30_000;
export interface ShutdownReport {
  /** The final world save completed in this process. When false, a commit abandoned at its
   * deadline may still have reached the database; `durableRevision` is the last one confirmed. */
  saved: boolean;
  durableRevision: number;
  durableSimTime?: number;
  problems: string[];
}

/** One serialized world host with explicit local or verified OIDC account authority. */
interface GameServerOptions {
  config?: AppConfig;
  production?: boolean;
  store?: SqlGameRepository;
  aiClient?: AiClient;
  now?: () => number;
  tick?: boolean;
}

export async function createGameServer(options: GameServerOptions = {}) {
  const rollback: (() => void | Promise<void>)[] = [];
  try {
    return await initializeGameServer(options, (close) => rollback.push(close));
  } catch (error) {
    // A failed factory returns no handle. Release each resource it acquired, preserving
    // the initialization error and ownership of a caller-supplied store.
    // docs/maintainers/action-reconciliation.md#integration-tasks
    for (const close of rollback.reverse()) {
      try {
        await close();
      } catch {
        /* Continue closing the remaining owned resources. */
      }
    }
    throw error;
  }
}

async function initializeGameServer(
  options: GameServerOptions,
  onFailure: (close: () => void | Promise<void>) => void,
) {
  const config = options.config ?? readConfig();
  const store =
    options.store ??
    new SqlGameRepository(config.dataDirectory, new PostgresDatabase(config.databaseUrl));
  if (!options.store) onFailure(() => store.close());
  const service = new WorldService(store, config, options.now);
  onFailure(() => service.releaseHostWork());
  const autosaves = new Autosaves(service);
  onFailure(() => autosaves.close());
  await service.ready;
  await autosaves.initialize();
  const navigation = new NavigationCoordinator(service);
  onFailure(() => navigation.close());
  let director = new AiDirector(service, options.aiClient, options.now);
  onFailure(() => director.close());
  let loadingSave = false;
  const worldTools = new WorldToolService(service);
  const authoring = new WorldAuthoringService(
    new WorldAgentStore(store.db),
    service,
    () => !loadingSave,
  );
  await authoring.recover();
  const agentRuns = new WorldAgentRunner(
    authoring,
    (message, turn) => director.macrofold.message(message, turn.authority, turn),
    () => {
      service.storageError =
        'Authoring result persistence failed. Restart to reconcile the original turn; do not resubmit it.';
      service.notify();
    },
  );
  const makeMcp = () =>
    createWorldMcp(
      worldTools,
      config.mcpRead,
      () => ({
        worldId: service.world.id,
        loading: loadingSave,
      }),
      authoring,
    );
  let mcp = makeMcp();
  onFailure(() => mcp.close());
  onFailure(() => agentRuns.drain());
  let activeWrites = 0;
  let activeRequests = 0;
  let retainedBodyBytes = 0;
  const now = options.now ?? Date.now;
  const operations = new OperationsRoutes(service, store, config, now);
  const authentication =
    config.authentication.mode === 'oidc'
      ? new OpenIdAuthentication(config.authentication, now)
      : undefined;
  const cookie = (name: string, value: string, maxAge?: number) =>
    `${name}=${value}; HttpOnly; SameSite=Lax; Path=/${config.authentication.mode === 'oidc' && !config.authentication.insecureLoopback ? '; Secure' : ''}${maxAge === undefined ? '' : `; Max-Age=${maxAge}`}`;
  const readCookie = (request: IncomingMessage, name: 'ol_session' | 'ol_login' | 'ol_invite') =>
    new RegExp(`(?:^|;\\s*)${name}=([a-f0-9]{64})(?:;|$)`).exec(request.headers.cookie ?? '')?.[1];
  type StreamState = {
    scope: RequestScope;
    revision: number;
    blocked: boolean;
    timeout?: ReturnType<typeof setTimeout>;
  };
  type Channel = {
    scope: RequestScope;
    view?: GameView;
    patches: Map<number, { revision: number; message: string }>;
    bytes: number;
  };
  const channels = new Map<string, Channel>();
  const streams = new Map<ServerResponse, StreamState>();
  const ownerStreams = new Set<WorldAgentStream>();
  let pendingStreams = 0;
  const projectionLane = new WorkLane('projection', config.capacity.requests);
  const invalidateStream = (stream: ServerResponse) => {
    // No private payload accompanies revocation. A blocked connection is disconnected;
    // data already handed to the transport cannot be recalled.
    if (streams.get(stream)?.blocked) stream.destroy();
    else stream.end('event: access-changed\ndata: {}\n\n');
  };
  const currentView = (scope: RequestScope): Promise<GameView> => {
    const pending = projectionLane.run(async () => {
      service.assertScope(scope);
      for (const [key, channel] of channels)
        if (!service.currentScope(channel.scope)) channels.delete(key);
      const key = scopeKey(scope);
      let channel = channels.get(key);
      if (!channel) {
        while (channels.size >= config.capacity.connections)
          channels.delete(channels.keys().next().value!);
        channels.set(key, (channel = { scope, patches: new Map(), bytes: 0 }));
      }
      if (channel.view?.revision === service.version) return channel.view;
      const next = await timed('public.projection', () =>
        projectView(service, director.executionSource, scope),
      );
      service.assertScope(scope);
      if (channel.view) {
        const patch = projectPatch(channel.view, next);
        if (patch) {
          const message = `event: patch\ndata: ${JSON.stringify(patch)}\n\n`;
          channel.patches.set(channel.view.revision, { revision: next.revision, message });
          channel.bytes += Buffer.byteLength(message);
        } else {
          channel.patches.clear();
          channel.bytes = 0;
        }
        while (channel.patches.size > 64 || channel.bytes > 1_048_576) {
          const oldest = channel.patches.keys().next().value!;
          channel.bytes -= Buffer.byteLength(channel.patches.get(oldest)!.message);
          channel.patches.delete(oldest);
        }
      }
      channel.view = next;
      return next;
    });

    return pending;
  };
  const pump = (stream: ServerResponse) => {
    const state = streams.get(stream);
    if (!state || stream.destroyed) return;
    if (!service.currentScope(state.scope)) {
      invalidateStream(stream);
      return;
    }
    if (state.blocked) return;
    const channel = channels.get(scopeKey(state.scope));
    if (!channel?.view) return;
    while (state.revision !== channel.view.revision) {
      const patch = channel.patches.get(state.revision);
      const message = patch?.message ?? `event: reset\ndata: ${JSON.stringify(channel.view)}\n\n`;
      state.revision = patch?.revision ?? channel.view.revision;
      if (!stream.write(message)) {
        state.blocked = true;
        state.timeout = setTimeout(() => stream.destroy(), 30_000);
        break;
      }
    }
  };
  let publishTimer: ReturnType<typeof setTimeout> | undefined;
  let publishing = false;
  let publicationDone = Promise.resolve();
  let publishQueued = false;
  let nextPublicationAt = 0;
  let disposed = false;
  let shuttingDown: Promise<ShutdownReport> | undefined;
  const publish = () => {
    if (disposed) return;
    for (const stream of ownerStreams) stream.check();
    if (publishTimer) return;
    if (publishing) {
      publishQueued = true;
      return;
    }
    // Send immediately after idle, then coalesce to a 20 Hz ceiling. Adding a fresh
    // 50 ms delay after every batch made work time accumulate on top of the cadence.
    // docs/performance.md#bounded-batching-backpressure-and-publication
    const delay = Math.max(0, nextPublicationAt - performance.now());
    publishTimer = setTimeout(async () => {
      publishTimer = undefined;
      publishing = true;
      nextPublicationAt = performance.now() + 50;
      let completePublication!: () => void;
      publicationDone = new Promise<void>((resolve) => {
        completePublication = resolve;
      });
      try {
        if (!streams.size) return;
        let sliceStarted = performance.now();
        for (const [stream, state] of streams) {
          if (disposed) break;
          // Coalesce revisions and let command/socket I/O run between projection slices.
          // A hundred viewers must not monopolize the event loop in one microtask chain.
          if (performance.now() - sliceStarted >= 8) {
            await new Promise<void>((resolve) => setImmediate(resolve));
            sliceStarted = performance.now();
          }
          if (!service.currentScope(state.scope)) {
            invalidateStream(stream);
            continue;
          }
          const fresh = service.refreshScope(state.scope);
          if (scopeKey(fresh) !== scopeKey(state.scope)) {
            state.scope = fresh;
            state.revision = -1;
          }
          try {
            await currentView(state.scope);
            pump(stream);
          } catch (error) {
            if (error instanceof OverloadError) {
              publishQueued = true;
              continue;
            }
            // Revocation can race an awaited projection. It invalidates this audience,
            // not shared storage or other players' simulation.
            if (!(error instanceof AuthorityError)) throw error;
            invalidateStream(stream);
          }
        }
      } catch {
        service.storageError =
          'State publication failed; simulation paused. Restart and reconcile storage.';
        for (const stream of streams.keys()) stream.end();
        streams.clear();
      } finally {
        publishing = false;
        completePublication();
        if (publishQueued) {
          publishQueued = false;
          publish();
        }
      }
    }, delay);
  };
  const unsubscribe = service.subscribe(publish);
  onFailure(unsubscribe);
  const vite = options.production
    ? null
    : await (
        await import('vite')
      ).createServer({
        configFile: resolve('apps/client/vite.config.ts'),
        server: { middlewareMode: true },
        appType: 'spa',
      });
  if (vite) onFailure(() => vite.close());
  const assets = resolve('dist/client');
  const server = createServer(async (request, response) => {
    let responseScope: RequestScope | undefined;
    let responseCapability: Capability = 'play';
    const send = (target: ServerResponse, status: number, value: unknown) => {
      if (responseScope && !service.currentScope(responseScope, responseCapability))
        return writeJson(target, 403, {
          ok: false,
          code: 'stale-scope',
          message: 'Access changed. Refresh before continuing.',
        });
      return writeJson(target, status, value);
    };
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'same-origin');
    response.setHeader('X-Frame-Options', 'DENY');
    if (request.url === '/mcp' || request.url?.startsWith('/mcp?'))
      return mcp.handle(request, response);
    const address = server.address();
    const port = address && typeof address !== 'string' ? address.port : config.port;
    const allowedHosts = new Set(
      config.authentication.mode === 'local'
        ? [`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`]
        : [new URL(config.authentication.origin).host],
    );
    if (!allowedHosts.has(request.headers.host ?? ''))
      return send(response, 403, {
        ok: false,
        code: 'host',
        message: 'Use the configured game host.',
      });
    let url: URL;
    try {
      url = new URL(request.url ?? '/', `http://${request.headers.host}`);
    } catch {
      return send(response, 400, { ok: false, code: 'url', message: 'Invalid URL.' });
    }
    const ownOrigin =
      config.authentication.mode === 'oidc'
        ? config.authentication.origin
        : `http://${request.headers.host}`;
    if (request.method === 'GET' && url.pathname.startsWith('/auth/')) {
      try {
        if (url.pathname === '/auth/invite') {
          // The bearer token survives only the OIDC round trip; redemption needs verified identity.
          const token = url.searchParams.get('token') ?? '';
          const landing = await operations.inviteLanding(token);
          response.setHeader(
            'Set-Cookie',
            cookie('ol_invite', landing.usable ? token : '', landing.usable ? 900 : 0),
          );
          response.writeHead(303, { Location: landing.location, 'Cache-Control': 'no-store' });
          response.end();
          return;
        }
        if (config.authentication.mode === 'local' && url.pathname === '/auth/login') {
          // A database reset invalidates saved browser sessions. Let the existing
          // loopback-only /api/state bootstrap issue the current local session.
          response.setHeader('Set-Cookie', cookie('ol_session', '', 0));
          response.writeHead(303, { Location: '/', 'Cache-Control': 'no-store' });
          response.end();
          return;
        }
        if (!authentication) throw new AuthorityError('forbidden');
        if (url.pathname === '/auth/login') {
          const browserToken = browserLoginToken();
          const destination = await authentication.begin(browserToken);
          response.setHeader('Set-Cookie', cookie('ol_login', browserToken, 300));
          response.writeHead(303, { Location: destination.href, 'Cache-Control': 'no-store' });
          response.end();
          return;
        }
        if (url.pathname === '/auth/callback') {
          const callback = new URL(request.url!, ownOrigin);
          const identity = await authentication.complete(callback, readCookie(request, 'ol_login'));
          const previous = readCookie(request, 'ol_session');
          const login = await service.authenticationMutation(() =>
            store.db.transaction(async () => {
              const replacement = await store.authority.login(
                identity,
                now(),
                config.authentication.sessionMs,
                config.capacity.sessions,
              );
              if (previous) {
                try {
                  const oldSession = await store.authority.authenticate(previous, now());
                  await store.authority.revokeSession(oldSession.id, now());
                } catch (error) {
                  if (!(error instanceof AuthorityError)) throw error;
                }
              }
              return replacement;
            }),
          );
          const invite = readCookie(request, 'ol_invite');
          const location = invite
            ? await operations.completeInvite(invite, login.session.accountId)
            : '/';
          response.setHeader('Set-Cookie', [
            cookie('ol_session', login.token, Math.floor(config.authentication.sessionMs / 1000)),
            cookie('ol_login', '', 0),
            cookie('ol_invite', '', 0),
          ]);
          response.writeHead(303, { Location: location, 'Cache-Control': 'no-store' });
          response.end();
          return;
        }
      } catch {
        return send(response, 401, {
          ok: false,
          code: 'session',
          message: 'Sign-in could not be verified. Start sign-in again.',
        });
      }
      return send(response, 404, { ok: false, code: 'route' });
    }
    if (url.pathname.startsWith('/api/')) {
      if (loadingSave)
        return send(response, 409, {
          ok: false,
          code: 'loading',
          message: 'A saved world is loading. Please wait.',
        });
      const writing = request.method === 'POST';
      let requestBytes = 0;

      const origin = request.headers.origin;
      if (request.headers['sec-fetch-site'] === 'cross-site' || (origin && origin !== ownOrigin))
        return send(response, 403, {
          ok: false,
          code: 'origin',
          message: 'Use the game in its own browser tab.',
        });
      if (activeRequests >= config.capacity.requests) {
        response.setHeader('Retry-After', '1');
        return send(response, 503, {
          ok: false,
          code: 'busy',
          message: new OverloadError().message,
        });
      }
      // Shutdown stops intake before draining, so its final save covers every admitted command.
      if (disposed)
        return send(response, 503, {
          ok: false,
          code: 'shutdown',
          message: 'The server is shutting down. No request was admitted.',
        });
      activeRequests++;
      if (writing) activeWrites++;
      try {
        let token = readCookie(request, 'ol_session');
        if (
          !token &&
          config.authentication.mode === 'local' &&
          request.method === 'GET' &&
          url.pathname === '/api/state'
        ) {
          token = service.localSessionToken;
          response.setHeader('Set-Cookie', cookie('ol_session', token));
        }
        const login = await store.authority.authenticate(token, now());
        const connectionId = clientId.parse(
          request.headers['x-ol-client'] ?? url.searchParams.get('client') ?? 'local-internal',
        );
        if (config.authentication.mode === 'oidc' && connectionId === 'local-internal')
          throw new AuthorityError('session');
        if (request.method === 'GET' && url.pathname === '/api/session') {
          const grant = await store.authority.grant(service.world.id, login.accountId);
          const entered =
            grant &&
            (grant.actorId ? grant.capabilities.includes('play') : !!grant.capabilities.length);
          return send(response, 200, {
            ok: true,
            accountId: login.accountId,
            worlds: entered
              ? [
                  {
                    id: service.world.id,
                    actorId: grant.actorId,
                    capabilities: grant.capabilities,
                  },
                ]
              : [],
          });
        }
        if (request.method === 'POST' && url.pathname === '/api/session/logout') {
          if (origin !== ownOrigin) throw new AuthorityError('forbidden');
          if (!(request.headers['content-type'] ?? '').startsWith('application/json'))
            return send(response, 415, { ok: false, message: 'Use a JSON request.' });
          z.object({})
            .strict()
            .parse(
              await readHttpJson(request, url.pathname, (bytes) => {
                if (retainedBodyBytes + bytes > 16 * 1024 * 1024) throw new OverloadError();
                retainedBodyBytes += bytes;
                requestBytes += bytes;
              }),
            );
          await service.authenticationMutation(() =>
            store.authority.revokeSession(login.id, now()),
          );
          response.setHeader('Set-Cookie', cookie('ol_session', '', 0));
          return send(response, 200, { ok: true, message: 'Signed out.' });
        }
        let scope = await service.requestScope(login, connectionId);
        // Local compatibility has one explicit principal. Shared mode always requires explicit control acquisition.
        if (config.authentication.mode === 'local') {
          const lease = await store.authority.control(scope.worldId, scope.actorId);
          if (!lease.sessionId) {
            await store.authority.changeControl(
              scope,
              {
                id: `local-${connectionId}-${lease.generation}`,
                expectedGeneration: lease.generation,
                operation: 'acquire',
              },
              now,
            );
            scope = await service.requestScope(login, connectionId);
          }
        }
        if (isCharacterless(scope) && !characterlessRoute(request.method, url.pathname))
          return send(response, 403, {
            ok: false,
            code: 'characterless',
            message: 'This account has no character in this world. Use World operations.',
          });
        responseScope = scope;
        if (
          request.method === 'GET' &&
          url.pathname !== '/api/state' &&
          request.headers['x-ol-scope'] !== undefined &&
          request.headers['x-ol-scope'] !== scopeKey(scope)
        )
          throw new AuthorityError('stale-scope');
        if (request.method === 'GET' && url.pathname === '/api/state')
          return send(response, 200, await currentView(scope));
        if (request.method === 'GET' && url.pathname === '/api/operations') {
          // Operations sections carry their own capability checks and final currency check.
          responseScope = undefined;
          return send(response, 200, await operations.state(scope));
        }
        if (request.method === 'GET' && url.pathname === '/api/performance') {
          responseCapability = 'inspect';
          service.assertScope(scope, 'inspect');
          return send(response, 200, performanceSnapshot());
        }
        if (request.method === 'GET' && url.pathname === '/api/world-events') {
          const options = z
            .object({
              type: z
                .string()
                .regex(/^[a-z][a-z0-9_.:-]{0,63}$/)
                .optional(),
              cursor: z.string().max(2048).optional(),
              limit: z.coerce.number().int().min(1).max(100).optional(),
              q: z.string().max(200).optional(),
            })
            .strict()
            .parse(Object.fromEntries(url.searchParams));
          if (!store.history)
            return send(response, 503, { message: 'History repository unavailable.' });
          const epoch = `${service.timelineId}:${service.historyEpoch}:${scopeKey(scope)}`;
          const page = await store.history.perceivedEvents(
            service.world.id,
            scope.accountId,
            scope.actorId,
            epoch,
            options,
          );
          if (epoch !== `${service.timelineId}:${service.historyEpoch}:${scopeKey(scope)}`)
            throw new HistoryCursorError('History changed while loading. Refresh the event log.');
          return send(response, 200, page);
        }
        if (request.method === 'GET' && url.pathname === '/api/history') {
          const options = z
            .object({
              conversationId: requestIdSchema.optional(),
              active: z.literal('true').optional(),
              speechOnly: z.literal('true').optional(),
              responseActions: z.literal('true').optional(),
              participantId: requestIdSchema.optional(),
              before: z.coerce.number().int().nonnegative().optional(),
              watermark: z.coerce.number().int().nonnegative().optional(),
              limit: z.coerce.number().int().min(1).max(100).optional(),
            })
            .strict()
            .parse(Object.fromEntries(url.searchParams));
          if (!store.history)
            return send(response, 503, { message: 'History repository unavailable.' });
          const epoch = `${service.timelineId}:${service.historyEpoch}:${scopeKey(scope)}`;
          const scopedId = options.active
            ? service.world.conversations?.active[scope.actorId]
            : options.conversationId;
          const page = await store.history.transcript(
            service.world.id,
            scope.accountId,
            scope.actorId,
            {
              ...options,
              speechOnly: options.speechOnly === 'true',
              responseActions: options.responseActions === 'true',
              conversationId: scopedId,
            },
          );
          if (options.active && !scopedId) page.items = [];
          const speechJobs = options.speechOnly
            ? await store.getSpeechJobs(
                page.items
                  .filter((item) => item.speakerId === scope.actorId)
                  .map((item) => item.id),
              )
            : new Map();
          if (
            epoch !== `${service.timelineId}:${service.historyEpoch}:${scopeKey(scope)}` ||
            (options.active && scopedId !== service.world.conversations?.active[scope.actorId])
          )
            throw new HistoryCursorError(
              'History changed while loading. Refresh the conversation.',
            );
          const messages = options.speechOnly
            ? page.items.map((item) => {
                const job = speechJobs.get(item.id);
                const failed = job?.status === 'failed';
                return {
                  id: item.id,
                  kind: item.kind === 'speech' ? 'speech' : 'action',
                  speakerId: item.speakerId,
                  speech: item.speech,
                  speaker: item.speech
                    ? (item.speech.speaker?.nameAtTime ?? 'Someone')
                    : item.speakerId
                      ? observerDescription(service.world, scope.actorId, item.speakerId)
                      : 'Someone',
                  text: item.text,
                  time: item.time,
                  ...(job
                    ? {
                        replyStatus: job.status,
                        replyRequestId: job.id,
                        retryable: job.status === 'failed',
                        ...(failed ? { replyFailure: job.message } : {}),
                      }
                    : {}),
                };
              })
            : undefined;

          const activeId = service.world.conversations?.active[scope.actorId];
          const active = activeId ? service.world.conversations?.records[activeId] : undefined;
          return send(response, 200, {
            ...page,
            ...(messages ? { messages } : {}),
            voice: (await service.profileFor(scope)).preferences.narratorVoice,
            scope: scopedId,
            active: active
              ? {
                  id: active.id,
                  generation: active.generation,
                  members: active.intervals
                    .filter((i) => i.leftAt === undefined)
                    .map((i) => ({
                      id: i.actorId,
                      name: observerDescription(service.world, scope.actorId, i.actorId),
                    })),
                }
              : null,
          });
        }
        if (request.method === 'GET' && url.pathname === '/api/events') {
          if (streams.size + ownerStreams.size + pendingStreams >= config.capacity.connections)
            return send(response, 429, {
              ok: false,
              code: 'connections',
              message: 'Too many open game tabs.',
            });
          const transportId = randomBytes(16).toString('hex');
          let connected = false;
          let closed = false;
          let released = false;
          const release = async () => {
            if (!connected || released || disposed) return;
            released = true;
            try {
              await service.setConnection(transportId, false, scope);
            } catch (error) {
              released = false;
              if (!(error instanceof OverloadError)) throw error;
              // An expired cleanup must not leak a presence/connection slot. At most
              // one retry per admitted transport; this never replays gameplay.
              const retry = setTimeout(() => void release().catch(logCleanupFailure), 1000);
              retry.unref();
            }
          };
          const logCleanupFailure = (error: unknown) => {
            console.error(
              'Game connection cleanup failed:',
              error instanceof Error ? error.message : 'unknown error',
            );
          };
          response.once('close', () => {
            closed = true;
            clearTimeout(streams.get(response)?.timeout);
            streams.delete(response);
            void release().catch(logCleanupFailure);
          });
          // Keep admission reserved across the initial asynchronous private projection.
          pendingStreams++;
          try {
            await service.setConnection(transportId, true, scope);
            connected = true;
            if (closed) {
              await release();
              return;
            }
            await currentView(scope);
            service.assertScope(scope);
            if (response.destroyed) return;
            response.writeHead(200, {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-store',
              Connection: 'keep-alive',
              'X-Accel-Buffering': 'no',
            });
            const requested = url.searchParams.get('revision');
            const requestedRevision = requested === null ? NaN : Number(requested);
            streams.set(response, {
              scope,
              revision:
                url.searchParams.get('scope') === scopeKey(scope) &&
                Number.isSafeInteger(requestedRevision)
                  ? requestedRevision
                  : -1,
              blocked: false,
            });
            response.on('drain', () => {
              const state = streams.get(response);
              if (!state) return;
              clearTimeout(state.timeout);
              state.blocked = false;
              pump(response);
            });
            response.flushHeaders();
            // An up-to-date paused world still needs a live, established stream.
            response.write(': connected\n\n');
            pump(response);
            publish();
          } catch (error) {
            await release();
            throw error;
          } finally {
            pendingStreams--;
          }
          return;
        }
        if (request.method === 'GET' && url.pathname === '/api/world-agent/session/progress') {
          responseCapability = 'create';
          service.assertScope(scope, 'create');
          service.assertScope(scope, 'inspect');
          const sessionId = requestIdSchema.parse(url.searchParams.get('sessionId'));
          if (
            url.searchParams.get('worldId') !== service.world.id ||
            url.searchParams.get('scope') !== scopeKey(scope)
          )
            throw new AuthorityError('stale-scope');
          if (streams.size + ownerStreams.size + pendingStreams >= config.capacity.connections)
            return send(response, 429, { ok: false, message: 'Too many open connections.' });
          pendingStreams++;
          try {
            await authoring.progressSnapshot(sessionId, scope);
            service.assertScope(scope, 'create');
            service.assertScope(scope, 'inspect');
            if (response.destroyed) return;
            response.writeHead(200, {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-store',
              Connection: 'keep-alive',
              'X-Accel-Buffering': 'no',
            });
            response.flushHeaders();
            const stream = new WorldAgentStream(
              response,
              () => authoring.progressSnapshot(sessionId, scope),
              () =>
                config.godMode &&
                !loadingSave &&
                service.currentScope(scope, 'create') &&
                service.currentScope(scope, 'inspect'),
              (notify) => authoring.watchProgress(sessionId, notify),
              () => ownerStreams.delete(stream),
            );
            ownerStreams.add(stream);
          } finally {
            pendingStreams--;
          }
          return;
        }
        if (request.method !== 'POST')
          return send(response, 404, { ok: false, code: 'route', message: 'Unknown API route.' });
        // SameSite cookie plus an exact Origin check protects local mutations from other websites.
        if (origin !== ownOrigin)
          return send(response, 403, {
            ok: false,
            code: 'origin',
            message: 'Mutation requires the game origin.',
          });
        const contentType = request.headers['content-type'] ?? '';
        if (
          !contentType.startsWith('application/json') &&
          !(url.pathname === '/api/presence' && contentType.startsWith('text/plain'))
        )
          return send(response, 415, {
            ok: false,
            code: 'content-type',
            message: 'Use a JSON request.',
          });
        const body = await readHttpJson(request, url.pathname, (bytes) => {
          if (retainedBodyBytes + bytes > 16 * 1024 * 1024) throw new OverloadError();
          retainedBodyBytes += bytes;
          requestBytes += bytes;
        });
        const submittedScope =
          request.headers['x-ol-scope'] ??
          (url.pathname === '/api/presence' ? url.searchParams.get('scope') : undefined);
        if (
          config.authentication.mode === 'oidc' &&
          url.pathname !== '/api/embodiment' &&
          submittedScope !== scopeKey(scope)
        )
          throw new AuthorityError('stale-scope');
        const operation = await operations.post(url.pathname, scope, body);
        if (operation) {
          responseScope = undefined;
          return send(response, operation.status, operation.value);
        }
        if (url.pathname === '/api/access') {
          const value = z
            .object({
              accountId: requestIdSchema,
              expectedRevision: sequence,
              capabilities: z.array(capabilitySchema).max(5),
            })
            .strict()
            .parse(body);
          await service.authorized(scope, 'manage-access', false, () =>
            store.authority.setCapabilities(
              scope,
              value.accountId,
              value.expectedRevision,
              value.capabilities,
              now,
            ),
          );
          responseScope = undefined;
          return send(response, 200, { ok: true, message: 'Access updated.' });
        }
        if (url.pathname === '/api/access/binding') {
          const value = z
            .object({
              id: requestIdSchema,
              accountId: requestIdSchema,
              actorId: requestIdSchema,
              expectedRevision: sequence,
            })
            .strict()
            .parse(body);
          const result = await service.rebindAccount(scope, value);
          responseScope = undefined;
          return send(response, result.ok ? 200 : 409, result);
        }
        if (url.pathname === '/api/embodiment') {
          const value = z
            .object({
              id: requestIdSchema,
              expectedGeneration: sequence,
              operation: z.enum(['acquire', 'replace', 'release']),
            })
            .strict()
            .parse(body);
          // An acknowledgment can be lost after control advanced. Only the same current
          // login/grant/timeline may inspect its original generation-bound receipt.
          if (
            config.authentication.mode === 'oidc' &&
            submittedScope !== scopeKey(scope) &&
            submittedScope !== scopeKey({ ...scope, controlGeneration: value.expectedGeneration })
          )
            throw new AuthorityError('stale-scope');
          const result = await service.changeEmbodiment(scope, value);
          return send(response, result.ok ? 200 : 409, result);
        }
        const inspection = [
          '/api/world-agent/inspect',
          '/api/god/mind',
          '/api/god/mind/subjects',
          '/api/god/memories',
          '/api/god/activity-history',
          '/api/god/trigger',
          '/api/god/triggers',
          '/api/god/intelligence-details',
          '/api/god/intelligence-calls',
          '/api/god/editor/attributes',
          '/api/god/invention-policy',
          '/api/god/definitions/attributes',
          '/api/god/editor/story',
          '/api/god/editor/person',
          '/api/god/editor/person/memory',
          '/api/god/editor/world-events',
          '/api/god/editor/world-event',
        ].includes(url.pathname);
        const required: Capability = inspection
          ? 'inspect'
          : url.pathname.startsWith('/api/god/') ||
              url.pathname.startsWith('/api/world-agent/session/') ||
              url.pathname === '/api/world-agent/authoring'
            ? 'create'
            : url.pathname.startsWith('/api/saves/')
              ? 'save'
              : 'play';
        responseCapability = required;
        const controlling = [
          '/api/command',
          '/api/knowledge',
          '/api/control',
          '/api/conversation',
          '/api/commitment',
          '/api/chat',
          '/api/chat/retry',
          '/api/invent',
          '/api/world-agent/messages',
        ].includes(url.pathname);
        service.assertScope(scope, required, controlling);
        if (loadingSave)
          return send(response, 409, {
            ok: false,
            code: 'loading',
            message: 'A saved world is loading.',
          });
        const generation = request.headers['x-ol-generation'];
        if (generation && generation !== service.generation && url.pathname !== '/api/saves/load')
          return send(response, 409, {
            ok: false,
            code: 'stale-world',
            message: 'The world changed. Reload this tab.',
          });

        if (url.pathname.startsWith('/api/saves/') && !service.mayManageSaves(scope))
          return send(response, 403, {
            ok: false,
            message: 'World creator or host operator access required.',
          });
        const dispatch = async () => {
          switch (url.pathname) {
            case '/api/action-attempt': {
              const value = z
                .object({
                  requestId: requestIdSchema,
                  text: z.string().trim().min(1).max(500),
                  targetId: requestIdSchema.optional(),
                  mode: z.enum(['enqueue', 'replace', 'interrupt']),
                  slots: intentSlotsSchema.optional(),
                })
                .strict()
                .parse(body);
              return send(
                response,
                200,
                await director.submitAction(
                  value.requestId,
                  value.text,
                  value.mode,
                  value.targetId,
                  scope,
                  value.slots ?? null,
                ),
              );
            }
            case '/api/saves/list': {
              const page = z
                .object({
                  before: z
                    .object({
                      createdAt: z.string().datetime(),
                      id: requestIdSchema,
                      sequence: z.number().int().nonnegative().optional(),
                    })
                    .strict()
                    .optional(),
                })
                .strict()
                .parse(body);
              const candidates = await store.saves.list(service.world.id, {
                limit: 101,
                before: page.before,
              });
              const saves = candidates.slice(0, 100);
              autosaves.observeCatalog(saves, await store.saves.storageBytes(), !page.before);
              const last = saves.at(-1);
              return send(response, 200, {
                ok: true,
                saves,
                autosaves: await autosaves.status(),
                next:
                  candidates.length > 100 && last
                    ? { id: last.id, createdAt: last.createdAt, sequence: last.sequence }
                    : undefined,
              } satisfies GameSaveCatalog);
            }
            case '/api/saves/settings': {
              const value = z
                .object({
                  enabled: z.boolean(),
                  intervalMinutes: z.number(),
                  retain: z.number(),
                  revision: z.number().int().nonnegative(),
                })
                .strict()
                .parse(body);
              const { revision, ...settings } = value;
              await autosaves.updateSettings(settings, revision);
              return send(response, 200, {
                ok: true,
                message: 'Autosave settings saved.',
                autosaves: await autosaves.status(),
              });
            }
            case '/api/saves/acknowledge': {
              const value = z.object({ id: z.string().uuid() }).strict().parse(body);
              const acknowledged = await store.saves.acknowledgeFailure(service.world.id, value.id);
              return send(response, 200, {
                ok: true,
                message: acknowledged
                  ? 'Checkpoint failure acknowledged.'
                  : 'That failure was already acknowledged or replaced by a newer one.',
                autosaves: await autosaves.status(),
              });
            }
            case '/api/saves/create': {
              const value = z
                .object({ id: z.string().uuid(), label: z.string().trim().min(1).max(80) })
                .strict()
                .parse(body);
              await service.createSave(value.label, value.id, scope);
              return send(response, 200, { ok: true, message: 'Game saved.' });
            }
            case '/api/saves/delete': {
              const value = z.object({ id: requestIdSchema }).strict().parse(body);
              await service.deleteSave(value.id, scope);
              return send(response, 200, { ok: true, message: 'Save deleted.' });
            }
            case '/api/saves/load': {
              const value = z
                .object({ id: requestIdSchema, requestId: z.string().uuid() })
                .strict()
                .parse(body);
              const prior = (await store.getIntegration(`load-request:${value.requestId}`)) as
                | { saveId: string }
                | undefined;
              if (prior)
                return send(response, prior.saveId === value.id ? 200 : 409, {
                  ok: prior.saveId === value.id,
                  message:
                    prior.saveId === value.id
                      ? 'This load already completed.'
                      : 'Load request conflicts.',
                });
              if (generation !== service.generation)
                return send(response, 409, {
                  ok: false,
                  message: 'The world changed. Reload this tab before loading.',
                });
              if (activeWrites > 1)
                return send(response, 409, {
                  ok: false,
                  message: 'Another request is finishing. Try loading again shortly.',
                });
              loadingSave = true;
              let stopping = false;
              let drained = false;
              try {
                // Drain real background writers before replacing authority; no new worker framework.
                const paused = await service.control({ paused: true }, scope);
                if (!paused.ok) throw new GameSaveError(paused.message);
                stopping = true;
                director.macrofold.stop();
                await mcp.close();
                await agentRuns.drain();
                await director.close();
                drained = true;
                // Large reconstruction runs only after explicit pause and background drain.
                const payload = await store.saves.read(service.world.id, value.id);
                await service.authorized(scope, 'save', false, () =>
                  service.restoreSave(value.id, value.requestId, payload, scope),
                );
                channels.clear();
                responseScope = undefined;
                for (const stream of streams.keys()) stream.end();
                streams.clear();
                return send(response, 200, { ok: true, message: 'Saved world loaded and paused.' });
              } finally {
                if (drained) {
                  director = new AiDirector(service, options.aiClient, options.now);
                  mcp = makeMcp();
                  agentRuns.resume();
                }
                // A load refused before background work began stopping (busy, or the pause
                // failed) changed nothing, so it is an ordinary refusal, not a latch.
                else if (stopping) {
                  service.storageError =
                    'Loading stopped before background work drained. Restart before continuing.';
                  service.notify();
                }
                loadingSave = false;
                publish();
              }
            }
            case '/api/actions': {
              const context = actionContext.parse(body);
              return send(response, 200, {
                ok: true,
                catalogue: actionCatalogue(service, context, scope),
              });
            }
            case '/api/activity-requests':
              z.object({}).strict().parse(body);
              return send(response, 200, activityRequests(service, scope));
            case '/api/activity-status':
              z.object({}).strict().parse(body);
              return send(response, 200, activityStatus(service, scope));
            case '/api/activity-preview': {
              const input = commandInputSchema.parse(body);
              if (input.type !== 'activity-request')
                return send(response, 400, { ok: false, message: 'Review a requested activity.' });
              service.assertScope(scope, 'play', true);
              return send(response, 200, service.previewCommand(input, scope.actorId));
            }
            case '/api/inventory/history': {
              const value = z
                .object({
                  cursor: z.string().max(3000).optional(),
                  objectId: requestIdSchema.optional(),
                })
                .strict()
                .parse(body);
              return send(response, 200, await objectHistoryPage(service, scope, value));
            }
            case '/api/inventory': {
              const value = z
                .object({
                  containerId: requestIdSchema.optional(),
                  query: z.string().max(160).optional(),
                  cursor: z.string().max(3000).optional(),
                  mergeSourceId: requestIdSchema.optional(),
                })
                .strict()
                .parse(body);
              return send(response, 200, containerPage(service, scope, value));
            }
            case '/api/inventory/destinations': {
              const value = z
                .object({
                  source: z
                    .object({
                      itemId: requestIdSchema,
                      revision: sequence,
                      placementRevision: sequence,
                      contentsRevision: sequence.optional(),
                      containerId: requestIdSchema,
                      containerRevision: sequence,
                      quantity: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
                    })
                    .strict()
                    .optional(),
                  parentId: requestIdSchema.optional(),
                  query: z.string().max(160).optional(),
                  cursor: z.string().max(3000).optional(),
                })
                .strict()
                .parse(body);
              return send(response, 200, inventoryDestinationPage(service, scope, value));
            }
            case '/api/profile/preferences':
              return send(response, 200, {
                ok: true,
                profile: await service.setPreferences(preferences.parse(body), scope),
              });
            case '/api/command': {
              const value = command.parse(body);
              return send(
                response,
                200,
                await timed('command.durable', () =>
                  service.command(
                    value.commandId,
                    value.command,
                    undefined,
                    value.commandEpoch,
                    scope,
                  ),
                ),
              );
            }
            case '/api/narration/regenerate': {
              const value = z
                .object({ id: z.string().min(1).max(300), requestId: requestIdSchema })
                .strict()
                .parse(body);
              const ok =
                (await store.history?.regenerate(
                  service.world.id,
                  scope.accountId,
                  value.id,
                  value.requestId,
                )) ?? false;
              service.notifyHistory();
              return send(response, 200, {
                ok,
                code: ok ? 'queued' : 'unavailable',
                message: ok
                  ? 'Narration revision queued.'
                  : 'Narration is unavailable or already in progress.',
              });
            }
            case '/api/commitment': {
              const value = z
                .object({
                  id: requestIdSchema,
                  revision: z.number().int().nonnegative(),
                  cancel: z.boolean().optional(),
                  dueAt: z.number().finite().optional(),
                  completion: z
                    .object({
                      eventType: z.string().max(64),
                      targetId: requestIdSchema.optional(),
                      definitionId: requestIdSchema.optional(),
                    })
                    .strict()
                    .optional(),
                })
                .strict()
                .parse(body);
              return send(
                response,
                200,
                await service.transition((world) =>
                  amendCommitment(world, scope.actorId, value.id, value.revision, value),
                ),
              );
            }
            case '/api/conversation': {
              const value = z
                .object({
                  requestId: requestIdSchema,
                  operation: z.enum(['join', 'leave']),
                  conversationId: requestIdSchema,
                  generation: z.number().int().nonnegative(),
                })
                .strict()
                .parse(body);
              return send(
                response,
                200,
                await service.conversation(
                  value.requestId,
                  value.operation,
                  value.conversationId,
                  value.generation,
                  scope,
                ),
              );
            }
            case '/api/god/kinship': {
              if (!config.godMode)
                return send(response, 403, { ok: false, message: 'God access required.' });
              const value = z
                .object({
                  id: requestIdSchema,
                  firstId: requestIdSchema,
                  secondId: requestIdSchema,
                  kind: z.enum(['parent', 'sibling']),
                })
                .strict()
                .parse(body);
              return send(response, 200, await service.godKinship(value));
            }
            case '/api/god/effects': {
              if (!config.godMode)
                return send(response, 403, { ok: false, message: 'God access required.' });
              const value = z
                .object({
                  requestId: requestIdSchema,
                  effects: z
                    .array(
                      z
                        .object({
                          targetId: requestIdSchema,
                          kind: z.enum(['health', 'injury', 'healing', 'wetness', 'burning']),
                          amount: z.number().min(-100).max(100),
                        })
                        .strict(),
                    )
                    .min(1)
                    .max(64),
                  expected: z.record(z.string(), z.number().int().nonnegative()),
                })
                .strict()
                .parse(body);
              return send(
                response,
                200,
                await service.godEffects(value.requestId, value.effects, value.expected),
              );
            }
            case '/api/god/act': {
              if (!config.godMode)
                return send(response, 403, { ok: false, message: 'God access required.' });
              const value = z
                .object({
                  action: z.enum(['revive', 'enable-cognition']),
                  targetId: requestIdSchema,
                  requestId: requestIdSchema.optional(),
                  expectedRevision: z.number().int().nonnegative().optional(),
                })
                .strict()
                .parse(body);
              return send(
                response,
                200,
                await service.godAct(
                  value.action,
                  value.targetId,
                  value.requestId,
                  value.expectedRevision,
                ),
              );
            }
            case '/api/god/items': {
              if (!config.godMode)
                return send(response, 403, { ok: false, message: 'God access required.' });
              const value = z
                .object({
                  id: requestIdSchema,
                  definitionId: requestIdSchema,
                  quantity: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
                  destination: z.union([
                    z.object({ actorId: requestIdSchema }).strict(),
                    z.object({ position }).strict(),
                  ]),
                })
                .strict()
                .parse(body);
              return send(response, 200, await service.createItem(value, scope));
            }
            case '/api/god/container-access': {
              const value = z
                .object({
                  id: requestIdSchema,
                  itemId: requestIdSchema,
                  expectedRevision: sequence,
                  actors: z.array(requestIdSchema).max(100).nullable(),
                })
                .strict()
                .parse(body);
              return send(response, 200, await service.containerAccess(value, scope));
            }
            case '/api/god/ownership': {
              const value = z
                .object({
                  id: requestIdSchema,
                  itemId: requestIdSchema,
                  expectedRevision: sequence,
                  holderId: requestIdSchema.nullable(),
                  disclosure: z.enum(['custodian', 'public']),
                })
                .strict()
                .parse(body);
              return send(response, 200, await service.declareOwnership(value, scope));
            }
            case '/api/god/spawn': {
              if (!config.godMode)
                return send(response, 403, { ok: false, message: 'God access required.' });
              const value = z.object({ type: godSpawnType, position }).strict().parse(body);
              return send(response, 200, await service.spawn(value));
            }
            case '/api/god/person': {
              if (!config.godMode)
                return send(response, 403, { ok: false, message: 'God access required.' });
              const value = godPerson.extend({ position }).strict().parse(body);
              return send(
                response,
                200,
                await service.spawn({
                  type: 'person',
                  position: value.position,
                  person: {
                    name: value.name,
                    personality: value.personality,
                    backstory: value.backstory,
                    traitIds: value.traitIds,
                    initialGoals: value.initialGoals,
                  },
                }),
              );
            }
            case '/api/god/editor/attributes': {
              if (!config.godMode)
                return send(response, 403, { ok: false, message: 'God access required.' });
              const value = z.object({ actorId: requestIdSchema }).strict().parse(body);
              return send(response, 200, await service.attributeEditor(value.actorId, scope));
            }
            case '/api/god/editor/attributes/save': {
              if (!config.godMode)
                return send(response, 403, { ok: false, message: 'God access required.' });
              const value = z
                .object({
                  expectedGeneration: z.string().uuid(),
                  id: requestIdSchema,
                  actorId: requestIdSchema,
                  expectedManifestRevision: z.number().int().positive(),
                  changes: z
                    .array(
                      z
                        .object({
                          attributeId: requestIdSchema,
                          expectedRevision: z.number().int().nonnegative().nullable(),
                          value: z.union([z.number().finite(), z.string().min(1).max(64)]),
                        })
                        .strict(),
                    )
                    .min(1)
                    .max(32),
                })
                .strict()
                .parse(body);
              const { expectedGeneration, ...request } = value;
              return send(
                response,
                200,
                await service.godAttributeEdit(request, expectedGeneration),
              );
            }
            case '/api/god/invention-policy': {
              if (!config.godMode)
                return send(response, 403, { ok: false, message: 'God access required.' });
              z.object({}).strict().parse(body);
              return send(response, 200, {
                ok: true,
                generation: service.generation,
                policy: service.world.inventionPolicy,
              });
            }
            case '/api/god/invention-policy/save': {
              if (!config.godMode)
                return send(response, 403, { ok: false, message: 'God access required.' });
              const value = z
                .object({
                  expectedGeneration: z.string().uuid(),
                  expectedRevision: z.number().int().positive(),
                  playerLocked: z.boolean(),
                  agentLocked: z.boolean(),
                })
                .strict()
                .parse(body);
              return send(
                response,
                200,
                await service.godInventionPolicy(
                  value.expectedGeneration,
                  value.expectedRevision,
                  value,
                  scope,
                ),
              );
            }
            case '/api/god/definitions/attributes': {
              if (!config.godMode)
                return send(response, 403, { ok: false, message: 'God access required.' });
              z.object({}).strict().parse(body);
              return send(response, 200, {
                ok: true,
                generation: service.generation,
                manifest: service.world.moduleManifest,
                ownerCapabilities: stateOwnerCapabilities(service.world),
                foundationCapabilities: foundationCapabilities(service.world),
              });
            }
            case '/api/god/definitions/attribute': {
              if (!config.godMode)
                return send(response, 403, { ok: false, message: 'God access required.' });
              const value = z
                .object({
                  expectedGeneration: z.string().uuid(),
                  id: requestIdSchema,
                  expectedManifestRevision: z.number().int().positive(),
                  definition: z.record(z.string(), z.unknown()).optional(),
                  removeId: requestIdSchema.optional(),
                })
                .strict()
                .parse(body);
              // Family validation remains domain-owned; JSON cannot select an executable path.
              const { expectedGeneration, ...request } = value;
              return send(
                response,
                200,
                await service.godAttributeDeclaration(
                  request as import('@open-legend/domain').AttributeDeclarationRequest,
                  expectedGeneration,
                ),
              );
            }
            case '/api/god/editor/story': {
              if (!config.godMode)
                return send(response, 403, { ok: false, message: 'God access required.' });
              return send(response, 200, await service.storyEditor());
            }
            case '/api/god/editor/story/save': {
              if (!config.godMode)
                return send(response, 403, { ok: false, message: 'God access required.' });
              const value = z
                .object({
                  revision: z.number().int().nonnegative(),
                  policy: z.unknown(),
                  changes: z
                    .array(
                      z
                        .object({
                          entityId: requestIdSchema,
                          values: z.record(z.string(), z.number()).nullable(),
                        })
                        .strict(),
                    )
                    .max(100),
                })
                .strict()
                .parse(body);
              const result = await service.saveStoryEditor(
                value.revision,
                value.policy as import('@open-legend/domain').StoryPolicy,
                value.changes,
              );
              return send(response, result.ok ? 200 : result.code === 'stale' ? 409 : 400, result);
            }
            case '/api/god/editor/person': {
              if (!config.godMode)
                return send(response, 403, { ok: false, message: 'God access required.' });
              const { actorId, before } = z
                .object({ actorId: requestIdSchema, before: z.string().max(240).optional() })
                .strict()
                .parse(body);
              const result = await service.personEditor(actorId, before, scope);
              return send(response, result.ok ? 200 : 404, result);
            }
            case '/api/god/editor/person/memory': {
              if (!config.godMode)
                return send(response, 403, { ok: false, message: 'God access required.' });
              const value = z
                .object({ actorId: requestIdSchema, entryId: z.string().min(1).max(200) })
                .strict()
                .parse(body);
              const result = await service.personMemoryJson(value.actorId, value.entryId, scope);
              return send(response, result.ok ? 200 : 404, result);
            }
            case '/api/god/editor/person/save': {
              if (!config.godMode)
                return send(response, 403, { ok: false, message: 'God access required.' });
              const value = z
                .object({
                  actorId: requestIdSchema,
                  basePerson: godPersonEditor,
                  person: godPersonEditor,
                  manifestRevision: z.number().int().positive(),
                  bodyPolicyPin: z
                    .object({
                      id: requestIdSchema,
                      version: z.number().int().positive(),
                      digest: requestIdSchema,
                    })
                    .strict()
                    .nullable(),
                  generation: requestIdSchema,
                  memoryChanges: z
                    .array(
                      z
                        .object({
                          entryId: z.string().min(1).max(200),
                          expectedHash: editorHash,
                          replacement: godMemoryEdit.nullable(),
                        })
                        .strict(),
                    )
                    .max(10_000),
                })
                .strict()
                .parse(body);
              const result = await service.savePersonEditor(
                value.actorId,
                value.basePerson,
                value.person,
                value.memoryChanges,
                {
                  manifestRevision: value.manifestRevision,
                  bodyPolicyPin: value.bodyPolicyPin,
                  generation: value.generation,
                },
                scope,
              );
              return send(response, result.ok ? 200 : result.code === 'stale' ? 409 : 400, result);
            }
            case '/api/god/editor/world-events': {
              if (!config.godMode)
                return send(response, 403, { ok: false, message: 'God access required.' });
              const { before } = z
                .object({ before: z.number().int().nonnegative().optional() })
                .strict()
                .parse(body);
              return send(response, 200, await service.worldEventsEditor(before, scope));
            }
            case '/api/god/editor/world-event': {
              if (!config.godMode)
                return send(response, 403, { ok: false, message: 'God access required.' });
              const { id } = z.object({ id: requestIdSchema }).strict().parse(body);
              const result = await service.worldEventJson(id, scope);
              return send(response, result.ok ? 200 : 404, result);
            }
            case '/api/god/editor/world-events/save': {
              if (!config.godMode)
                return send(response, 403, { ok: false, message: 'God access required.' });
              const value = z
                .object({
                  changes: z
                    .array(
                      z
                        .object({
                          id: requestIdSchema,
                          expectedHash: editorHash,
                          replacement: godWorldEvent.nullable(),
                        })
                        .strict(),
                    )
                    .max(10_000),
                })
                .strict()
                .parse(body);
              const result = await service.saveWorldEventsEditor(value.changes, scope);
              return send(response, result.ok ? 200 : result.code === 'stale' ? 409 : 400, result);
            }
            case '/api/god/correct-memory': {
              if (!config.godMode)
                return send(response, 403, { ok: false, message: 'God access required.' });
              const value = z
                .object({
                  actorId: requestIdSchema,
                  sourceId: requestIdSchema,
                  correctionEventId: requestIdSchema,
                })
                .strict()
                .parse(body);
              return send(
                response,
                200,
                await service.correctMemory(
                  value.actorId,
                  value.sourceId,
                  value.correctionEventId,
                  scope,
                ),
              );
            }
            case '/api/god/forget-memory': {
              if (!config.godMode)
                return send(response, 403, { ok: false, message: 'God access required.' });
              const value = z
                .object({ actorId: requestIdSchema, sourceId: requestIdSchema })
                .strict()
                .parse(body);
              const result = await service.forgetMemory(value.actorId, value.sourceId, scope);
              if (result.ok) await store.db.exec('DELETE FROM intelligence_calls');
              return send(response, 200, result);
            }
            case '/api/god/status-effects': {
              if (!config.godMode)
                return send(response, 403, { ok: false, message: 'God access required.' });
              if (
                body &&
                typeof body === 'object' &&
                !Array.isArray(body) &&
                !Object.keys(body).length
              )
                return send(response, 200, { ok: true, policy: service.world.statusEffectPolicy });
              const value = z
                .object({ policy: z.unknown(), expectedRevision: z.number().int().min(1) })
                .strict()
                .parse(body);
              return send(
                response,
                200,
                await service.withActorHistory(undefined, () =>
                  service.transition((world) =>
                    admitStatusEffectPolicy(world, value.policy, value.expectedRevision),
                  ),
                ),
              );
            }
            case '/api/god/cognition-policy': {
              if (!config.godMode)
                return send(response, 403, { ok: false, message: 'God access required.' });
              const value = z
                .object({ policy: z.unknown(), expectedRevision: z.number().int().min(1) })
                .strict()
                .parse(body);
              return send(
                response,
                200,
                await service.transition((world) =>
                  admitCognitionPolicy(world, value.policy, value.expectedRevision),
                ),
              );
            }
            case '/api/god/triggers': {
              if (!config.godMode)
                return send(response, 403, { ok: false, message: 'God access required.' });
              const { peek, ...filter } = z
                .object({
                  offset: z.number().int().min(0).max(1000).default(0),
                  peek: z.boolean().default(false),
                  search: z.string().max(200).optional(),
                  actor: z.string().max(100).optional(),
                  route: z.string().max(50).optional(),
                  outcome: z.string().max(50).optional(),
                  stage: z.string().max(100).optional(),
                  from: z.string().max(40).optional(),
                  to: z.string().max(40).optional(),
                })
                .strict()
                .parse(body);
              return send(response, 200, {
                ok: true,
                worldId: service.world.id,
                ...(peek
                  ? {
                      roots: (await store.diagnosticRoots(0, {}, service.diagnosticAccess(scope)))
                        .slice(0, 1)
                        .map(({ id }) => ({ id })),
                    }
                  : await traceHistory(
                      store,
                      filter,
                      service.world,
                      service.diagnosticAccess(scope),
                    )),
              });
            }
            case '/api/god/trigger': {
              if (!config.godMode)
                return send(response, 403, { ok: false, message: 'God access required.' });
              const { id } = z.object({ id: requestIdSchema }).strict().parse(body);
              if (!(await service.mayInspectCall(id, scope))) throw new AuthorityError('forbidden');
              const details = await traceDetails(store, id, service.world);
              return send(response, details ? 200 : 404, { ok: !!details, details });
            }
            case '/api/god/intelligence-details': {
              if (!config.godMode)
                return send(response, 403, {
                  ok: false,
                  message: 'God inspection is disabled by the host.',
                });
              const { id } = z.object({ id: requestIdSchema }).strict().parse(body);
              return send(response, 200, {
                ok: true,
                details: await (async () => {
                  if (!(await service.mayInspectCall(id, scope)))
                    throw new AuthorityError('forbidden');
                  return director.macrofold.inspectCall(id);
                })(),
              });
            }
            case '/api/god/intelligence-calls': {
              if (!config.godMode)
                return send(response, 403, {
                  ok: false,
                  message: 'Enable OPEN_LEGEND_GOD_MODE to inspect private intelligence calls.',
                });
              const { offset } = z
                .object({ offset: z.number().int().min(0).max(1_000_000).default(0) })
                .strict()
                .parse(body);
              return send(response, 200, {
                ok: true,
                calls: await Promise.all(
                  (await store.intelligenceCalls(offset, service.diagnosticAccess(scope))).map(
                    async (call) => {
                      const input = call.input as { requestId?: string; actorScope?: string };
                      const requestId = input?.requestId;
                      const job = requestId
                        ? await store.getJob(requestId.slice(0, requestId.lastIndexOf(':')))
                        : undefined;
                      const worldAgent = call.kind.includes('world agent');
                      const actorId =
                        input?.actorScope ??
                        (job
                          ? job.kind === 'invention'
                            ? scope.actorId
                            : (job.request.npcId ?? service.defaultResidentEntityId)
                          : undefined);
                      return {
                        ...call,
                        actorName: worldAgent
                          ? 'World agent'
                          : actorId
                            ? (service.world.entities[actorId]?.name ?? actorId)
                            : call.actorName,
                        trigger: worldAgent
                          ? 'Message'
                          : job?.kind === 'chat'
                            ? 'Speech'
                            : job?.kind === 'invention'
                              ? 'Invention'
                              : job?.kind === 'thought'
                                ? job.request.text
                                : call.trigger,
                      };
                    },
                  ),
                ),
              });
            }
            case '/api/god/appraisal': {
              const value = z
                .object({
                  id: requestIdSchema,
                  worldId: requestIdSchema,
                  generation: requestIdSchema,
                  epoch: requestIdSchema,
                  actorId: requestIdSchema,
                  change: z.discriminatedUnion('kind', [
                    z
                      .object({
                        kind: z.literal('create'),
                        definitionPin: z
                          .object({
                            id: requestIdSchema,
                            version: z.number().int().positive(),
                            digest: requestIdSchema,
                          })
                          .strict(),
                        targetId: requestIdSchema.nullable(),
                      })
                      .strict(),
                    z
                      .object({
                        kind: z.literal('resolve'),
                        id: requestIdSchema,
                        expectedRevision: z.number().int().positive(),
                      })
                      .strict(),
                  ]),
                })
                .strict()
                .parse(body);
              const result = await service.authorCharacterAppraisal(value, scope);
              return send(response, 200, {
                ...result,
                ...(result.ok ? { mind: await inspectGodMind(service, value.actorId, scope) } : {}),
              });
            }
            case '/api/knowledge':
            case '/api/god/knowledge': {
              const owned = url.pathname === '/api/knowledge';
              if (!owned && !config.godMode)
                return send(response, 403, { ok: false, message: 'God editing is disabled.' });
              const value = z
                .object({
                  worldId: requestIdSchema,
                  generation: requestIdSchema,
                  actorId: requestIdSchema,
                  subjectId: requestIdSchema.nullable(),
                  expectedRevision: z.number().int().nonnegative(),
                  text: z.string(),
                  givenName: z.string().optional(),
                  nameRevision: z.number().int().nonnegative().optional(),
                })
                .strict()
                .parse(body);
              const result = await service.editCharacterKnowledge(
                value,
                scope,
                owned ? 'owner' : 'creator',
              );
              return send(response, 200, {
                ...result,
                ...(result.ok
                  ? {
                      mind: owned
                        ? continuityView(service, value.actorId, scope)
                        : await inspectGodMind(service, value.actorId, scope),
                    }
                  : {}),
              });
            }
            case '/api/activity-history':
            case '/api/god/activity-history': {
              const { actorId, after, methodAfter } = z
                .object({
                  actorId: requestIdSchema,
                  after: z.number().int().min(-1).default(-1),
                  methodAfter: z.number().int().min(0).max(64).default(0),
                })
                .strict()
                .parse(body);
              if (
                (url.pathname === '/api/activity-history' && actorId !== scope.actorId) ||
                (url.pathname.startsWith('/api/god/') && !config.godMode)
              )
                throw new AuthorityError('forbidden');
              return send(response, 200, {
                ok: true,
                page: await service.inspectActivities(actorId, after, scope, methodAfter),
              });
            }
            case '/api/mind': {
              const { actorId, cursor } = z
                .object({ actorId: requestIdSchema, cursor: z.string().max(2048).optional() })
                .strict()
                .parse(body);
              if (actorId !== scope.actorId) throw new AuthorityError('forbidden');
              return send(response, 200, {
                ok: true,
                mind: continuityView(service, actorId, scope, cursor),
              });
            }
            case '/api/god/mind': {
              if (!config.godMode)
                return send(response, 403, {
                  ok: false,
                  message: 'God inspection is disabled by the host.',
                });
              const { actorId, cursor } = z
                .object({ actorId: requestIdSchema, cursor: z.string().max(2048).optional() })
                .strict()
                .parse(body);
              if (!service.mayInspectPrivate(actorId, scope))
                return send(response, 403, {
                  ok: false,
                  message: 'Human-private character content is unavailable to this principal.',
                });
              return send(response, 200, {
                ok: true,
                mind: cursor
                  ? continuityView(service, actorId, scope, cursor)
                  : await inspectGodMind(service, actorId, scope),
              });
            }
            case '/api/mind/subjects':
            case '/api/god/mind/subjects': {
              const { actorId, ...request } = z
                .object({
                  actorId: requestIdSchema,
                  query: z.string().max(120).optional(),
                  after: z.string().max(2048).optional(),
                  subjectId: requestIdSchema.optional(),
                })
                .strict()
                .parse(body);
              if (
                (url.pathname === '/api/mind/subjects' && actorId !== scope.actorId) ||
                (url.pathname.startsWith('/api/god/') && !config.godMode)
              )
                throw new AuthorityError('forbidden');
              return send(response, 200, continuitySubjects(service, actorId, scope, request));
            }
            case '/api/memories':
            case '/api/god/memories': {
              const { actorId, ...request } = z
                .object({
                  actorId: requestIdSchema,
                  cursor: z.string().max(2048).optional(),
                  query: z.string().max(200).optional(),
                  thoughts: z.boolean().optional(),
                })
                .strict()
                .parse(body);
              if (
                (url.pathname === '/api/memories' && actorId !== scope.actorId) ||
                (url.pathname.startsWith('/api/god/') && !config.godMode)
              )
                throw new AuthorityError('forbidden');
              return send(response, 200, await memoryHistory(service, actorId, scope, request));
            }
            case '/api/commitments': {
              // Owner-only by construction: there is no actor parameter to name anyone else.
              const value = z
                .object({ cursor: z.string().max(2048).optional() })
                .strict()
                .parse(body);
              return send(response, 200, await commitmentPage(service, scope, value));
            }
            case '/api/control':
              return send(response, 200, await service.control(controls.parse(body), scope));
            case '/api/presence': {
              const value = presence.parse(body);
              await service.setPresence(value.clientId, value.visible, value.sequence, scope);
              return send(response, 200, {
                ok: true,
                code: 'presence',
                message: value.visible ? 'Present.' : 'Away.',
              });
            }
            case '/api/inventions/list': {
              const value = z
                .object({
                  worldId: requestIdSchema,
                  before: z
                    .object({ createdAt: z.number().int().nonnegative(), id: requestIdSchema })
                    .strict()
                    .optional(),
                })
                .strict()
                .parse(body);
              if (value.worldId !== service.world.id)
                return send(response, 409, { ok: false, message: 'World mismatch.' });
              const jobs = await store.inventionJobs(service.world.id, scope.actorId, value.before);
              const requests = jobs.map((job) => {
                const scope = job.request.invention!;
                const recipeId = job.invention?.recipeId;
                // A historical success is not proof of installation after restoring an older save.
                // docs/architecture.md#shared-invention-workflow
                return {
                  id: job.id,
                  createdAt: job.createdAt,
                  conversationId: scope.conversationId,
                  intent: job.request.text,
                  status: job.status,
                  code: job.invention?.code ?? job.status,
                  message: job.message,
                  candidate: job.invention?.candidate ?? scope.candidate,
                  mode: scope.mode,
                  candidateDigest: job.invention?.candidateDigest,
                  validation: job.invention?.validation,
                  parentId: scope.continuation?.parentId,
                  rootId: scope.rootId,
                  continuedBy: job.invention?.continuedBy,
                  search:
                    scope.timelineId === service.timelineId && job.invention?.search
                      ? {
                          ...job.invention.search,
                          matches: job.invention.search.matches.filter(
                            (match) =>
                              !!service.world.recipes[match.recipeId] &&
                              digest(service.world.recipes[match.recipeId]!.digest) ===
                                match.digest &&
                              service.world.knowledge[scope.actorId]?.some(
                                (entry) => entry.recipeId === match.recipeId,
                              ),
                          ),
                        }
                      : undefined,
                  recipeId,
                  installed:
                    !!recipeId &&
                    !!service.world.recipes[recipeId] &&
                    !!service.world.knowledge[scope.actorId]?.some(
                      (entry) => entry.recipeId === recipeId,
                    ),
                  currentTimeline: scope.timelineId === service.timelineId,
                };
              });
              const last = jobs.at(-1);
              return send(response, 200, {
                ok: true,
                requests,
                ...(jobs.length === 50 && last
                  ? { next: { createdAt: last.createdAt, id: last.id } }
                  : {}),
              });
            }
            case '/api/world-agent/session/open': {
              const value = sessionOpenRequest.parse(body);
              // Existing same-origin owner authentication is required; MCP cannot mint sessions.
              const data = await authoring.open(
                value.sessionId,
                value.worldId,
                value.budgetUsd,
                scope,
                value.purpose,
              );
              return send(response, 200, {
                ok: true,
                sessionId: data.sessionId,
                budgetUsd: data.budgetUsd,
              });
            }
            case '/api/world-agent/session/list': {
              const value = sessionListRequest.parse(body);
              if (value.worldId !== service.world.id)
                return send(response, 409, { ok: false, message: 'World mismatch.' });
              return send(response, 200, {
                ok: true,
                data: await authoring.sessions(value.before, scope),
              });
            }
            case '/api/world-agent/session/status': {
              const value = sessionStatusRequest.parse(body);
              if (!config.godMode)
                return send(response, 403, {
                  ok: false,
                  message: 'World-owner authoring is unavailable.',
                });
              if (value.worldId !== service.world.id)
                return send(response, 409, { ok: false, message: 'World mismatch.' });
              const exists = await authoring.records.session(value.sessionId);
              if (exists?.recoveryTurn) {
                try {
                  await authoring.reconcileQuestion(
                    value.sessionId,
                    scope,
                    (turnId, capture, progress, beginRun) =>
                      director.macrofold.reconcileQuestion(
                        value.sessionId,
                        turnId,
                        capture,
                        progress,
                        beginRun,
                      ),
                  );
                } catch {
                  // The unchanged uncertain outcome remains visible; status never redispatches.
                }
              }
              return send(response, 200, {
                ok: true,
                data: exists
                  ? await authoring.view(value.sessionId, value.afterDraft, value.afterPlan, scope)
                  : null,
                availability: authoring.availability(),
                enabled:
                  !!config.mcpRead?.allowWrites &&
                  config.godMode &&
                  !!config.macrofoldWorldConnectionId,
              });
            }
            case '/api/world-agent/session/turns': {
              const value = sessionTurnsRequest.parse(body);
              if (value.worldId !== service.world.id)
                return send(response, 409, { ok: false, message: 'World mismatch.' });
              return send(response, 200, {
                ok: true,
                data: await authoring.turns(value.sessionId, value.before, scope),
              });
            }
            case '/api/world-agent/session/draft-read': {
              const value = sessionDraftReadRequest.parse(body);
              if (value.worldId !== service.world.id)
                return send(response, 409, { ok: false, message: 'World mismatch.' });
              return send(
                response,
                200,
                await authoring.localDraftRead(value.sessionId, value, scope),
              );
            }
            case '/api/world-agent/session/draft-history': {
              const value = sessionDraftHistoryRequest.parse(body);
              if (value.worldId !== service.world.id)
                return send(response, 409, { ok: false, message: 'World mismatch.' });
              return send(
                response,
                200,
                await authoring.localDraftHistory(value.sessionId, value, scope),
              );
            }
            case '/api/world-agent/session/draft-compare': {
              const value = sessionDraftCompareRequest.parse(body);
              if (value.worldId !== service.world.id)
                return send(response, 409, { ok: false, message: 'World mismatch.' });
              return send(
                response,
                200,
                await authoring.localDraftCompare(value.sessionId, value, scope),
              );
            }
            case '/api/world-agent/session/draft-save': {
              const value = sessionDraftSaveRequest.parse(body);
              if (value.worldId !== service.world.id)
                return send(response, 409, { ok: false, message: 'World mismatch.' });
              return send(
                response,
                200,
                await authoring.localDraftSave(value.sessionId, value, scope),
              );
            }
            case '/api/world-agent/session/draft-preview': {
              const value = sessionDraftPreviewRequest.parse(body);
              if (value.worldId !== service.world.id)
                return send(response, 409, { ok: false, message: 'World mismatch.' });
              return send(
                response,
                200,
                await authoring.localDraftPreview(value.sessionId, value, scope),
              );
            }
            case '/api/world-agent/session/draft-check': {
              const value = sessionDraftCheckRequest.parse(body);
              if (value.worldId !== service.world.id)
                return send(response, 409, { ok: false, message: 'World mismatch.' });
              return send(
                response,
                200,
                await authoring.localDraftCheck(value.sessionId, value, scope),
              );
            }
            case '/api/world-agent/session/draft-prepare': {
              const value = sessionDraftPrepareRequest.parse(body);
              if (value.worldId !== service.world.id)
                return send(response, 409, { ok: false, message: 'World mismatch.' });
              return send(
                response,
                200,
                await authoring.localDraftPrepare(value.sessionId, value, scope),
              );
            }
            case '/api/world-agent/session/turn': {
              const value = sessionTurnRequest.parse(body);
              if (value.worldId !== service.world.id)
                return send(response, 409, { ok: false, message: 'World mismatch.' });
              return send(response, 200, {
                ok: true,
                data: await authoring.turn(value.sessionId, value.requestId, scope),
              });
            }
            case '/api/world-agent/session/question-answer': {
              const value = sessionQuestionAnswerRequest.parse(body);
              if (value.worldId !== service.world.id)
                return send(response, 409, { ok: false, message: 'World mismatch.' });
              return send(
                response,
                200,
                await agentRuns.answer(
                  {
                    authority: scope,
                    worldId: value.worldId,
                    sessionId: value.sessionId,
                    conversationId: value.sessionId,
                  },
                  value.questionTurnId,
                  value.digest,
                  value.answerId,
                  value.answers,
                  value.continueIfReady,
                  value.supersedes,
                ),
              );
            }
            case '/api/world-agent/session/question-continue': {
              const value = sessionQuestionContinueRequest.parse(body);
              if (value.worldId !== service.world.id)
                return send(response, 409, { ok: false, message: 'World mismatch.' });
              return send(
                response,
                200,
                await agentRuns.continue(
                  {
                    authority: scope,
                    worldId: value.worldId,
                    sessionId: value.sessionId,
                    conversationId: value.sessionId,
                  },
                  value.questionTurnId,
                  value.answerId,
                ),
              );
            }
            case '/api/world-agent/session/cancel': {
              const value = sessionTurnRequest.parse(body);
              if (value.worldId !== service.world.id)
                return send(response, 409, { ok: false, message: 'World mismatch.' });
              return send(
                response,
                200,
                await agentRuns.cancel(value.sessionId, value.requestId, scope),
              );
            }
            case '/api/world-agent/session/review': {
              const value = sessionRequest.extend({ planId: requestIdSchema }).strict().parse(body);
              if (value.worldId !== service.world.id)
                return send(response, 409, { ok: false, message: 'World mismatch.' });
              return send(response, 200, {
                ok: true,
                data: await authoring.review(value.sessionId, value.planId, scope),
              });
            }
            case '/api/world-agent/session/decision': {
              const value = sessionDecisionRequest.parse(body);
              if (value.worldId !== service.world.id)
                return send(response, 409, { ok: false, message: 'World mismatch.' });
              return send(response, 200, {
                ok: true,
                data: await authoring.decide(
                  value.sessionId,
                  value.planId,
                  value.digest,
                  value.decision,
                  scope,
                ),
              });
            }
            case '/api/world-agent/session/apply': {
              const value = sessionRequest.extend({ planId: requestIdSchema }).strict().parse(body);
              if (value.worldId !== service.world.id)
                return send(response, 409, { ok: false, message: 'World mismatch.' });
              const data = await authoring.applyLocal(value.sessionId, value.planId, scope);
              return send(response, 200, { ok: data.status === 'ok', message: data.message, data });
            }
            case '/api/world-agent/authoring': {
              if (!config.godMode)
                return send(response, 403, { ok: false, message: 'World-owner tools disabled.' });
              const value = authoringToolRequest.parse(body);
              const data = Object.hasOwn(WORLD_READ_TOOLS, value.name)
                ? await authoring.executeRead(
                    value.name,
                    value.arguments,
                    value.contextHandle,
                    worldTools,
                    scope,
                  )
                : await authoring.execute(value.name, value.arguments, value.contextHandle, scope);
              return send(response, 200, {
                ok:
                  data.status === 'ok' ||
                  data.status === 'needs_approval' ||
                  data.status === 'ready_for_review',
                message: data.message,
                data,
              });
            }
            case '/api/world-agent/inspect': {
              if (!config.godMode)
                return send(response, 403, {
                  ok: false,
                  message: 'World-owner inspection is disabled.',
                });
              const value = worldReadRequest.parse(body);
              const result = await worldTools.execute(value.name, value.arguments, {
                worldId: service.world.id,
                principal: scope.accountId,
                scope,
              });
              return send(response, 200, {
                ok: result.status === 'ok',
                result,
                message: result.message,
              });
            }
            case '/api/world-agent/tools': {
              const value = z
                .object({ worldId: requestIdSchema, tool: inventionToolInput })
                .strict()
                .parse(body);
              if (value.worldId !== service.world.id)
                return send(response, 409, { ok: false, message: 'World mismatch.' });
              return send(response, 200, {
                ok: true,
                result: executeInventionTool(service, scope.actorId, value.tool),
              });
            }
            case '/api/world-agent/messages': {
              const value = worldAgentMessage.parse(body);
              if (value.worldId !== service.world.id)
                return send(response, 409, {
                  ok: false,
                  code: 'world-mismatch',
                  message: 'This conversation belongs to another world.',
                });
              if (value.mode === 'discuss' && (value.continuation || value.candidate))
                return send(response, 400, {
                  ok: false,
                  message: 'Only Invent supports invention follow-ups.',
                });
              if (value.mode !== 'discuss' && value.retryOf)
                return send(response, 400, {
                  ok: false,
                  message:
                    'Submit a new explicit invention request; failed work is never replayed automatically.',
                });
              if (value.sessionId) {
                if (
                  value.mode !== 'discuss' ||
                  value.sessionId !== value.conversationId ||
                  value.retryOf
                )
                  return send(response, 400, {
                    ok: false,
                    message:
                      'Authoring uses this conversation’s admitted session. Repeat an identical request ID to inspect its result, or send a deliberate new turn.',
                  });
                const result = await agentRuns.submit({
                  ...value,
                  sessionId: value.sessionId,
                  authority: scope,
                });
                return send(
                  response,
                  result.ok ? (result.code === 'running' ? 202 : 200) : 409,
                  result,
                );
              }
              if (value.mode === 'discuss') service.assertScope(scope, 'create');
              const result =
                value.mode !== 'discuss'
                  ? await director.submitInteractive(
                      'invention',
                      value.requestId,
                      value.text,
                      undefined,
                      value.conversationId,
                      value.continuation,
                      value.candidate,
                      scope,
                      'normal',
                      value.mode === 'workshop' ? 'workshop' : undefined,
                    )
                  : await director.macrofold.message(value, scope);
              return send(response, result.ok ? 200 : 409, result);
            }
            case '/api/world-agent/close': {
              const value = z
                .object({ conversationId: requestIdSchema, worldId: requestIdSchema })
                .strict()
                .parse(body);
              if (value.worldId !== service.world.id)
                return send(response, 409, { ok: false, message: 'World mismatch.' });
              const ownedSession = await authoring.records.session(value.conversationId);
              if (ownedSession) {
                await authoring.close(value.conversationId, scope);
                agentRuns.cancelSession(value.conversationId);
              }
              await director.macrofold.closeConversation(
                value.conversationId,
                scope,
                !!ownedSession,
              );
              return send(response, 200, {
                ok: true,
                message: 'Conversation ended. Any active turn was stopped.',
              });
            }
            case '/api/ai/cancel': {
              const value = z.object({ jobId: requestIdSchema }).strict().parse(body);
              return send(response, 200, await director.cancel(value.jobId, scope));
            }
            case '/api/chat/retry': {
              const value = z
                .object({ requestId: requestIdSchema, originalRequestId: requestIdSchema })
                .strict()
                .parse(body);
              return send(
                response,
                200,
                await director.submit(
                  'chat',
                  value.requestId,
                  '',
                  undefined,
                  value.originalRequestId,
                  undefined,
                  undefined,
                  undefined,
                  undefined,
                  undefined,
                  scope,
                ),
              );
            }
            case '/api/chat':
            case '/api/invent': {
              const value = interaction.parse(body);
              return send(
                response,
                202,
                await director.submitInteractive(
                  url.pathname === '/api/chat' ? 'chat' : 'invention',
                  value.requestId,
                  value.text,
                  value.npcId,
                  undefined,
                  undefined,
                  value.candidate,
                  scope,
                  value.volume,
                ),
              );
            }
            default:
              return send(response, 404, {
                ok: false,
                code: 'route',
                message: 'Unknown API route.',
              });
          }
        };
        // Save I/O runs outside the mutation lane; service entry points fence mutations.
        // Authoring takes its session lane before the world lane; wrapping it here would invert
        // MCP Apply versus browser review/cancel ordering. Every Apply rechecks the world grant.
        // Read-only access is checked above and again by send after asynchronous work.
        // Autosave settings and failure acknowledgment are short writes without a service entry
        // point, so they run fenced in the lane and are ordered after any revocation.
        return [
          '/api/saves/list',
          '/api/saves/load',
          '/api/saves/create',
          '/api/saves/delete',
          '/api/world-agent/messages',
          '/api/chat',
          '/api/chat/retry',
          '/api/invent',
        ].includes(url.pathname) || url.pathname.startsWith('/api/world-agent/')
          ? await dispatch()
          : await service.authorized(scope, required, controlling, dispatch);
      } catch (error) {
        if (error instanceof OverloadError) {
          response.setHeader('Retry-After', '1');
          return send(response, 503, { ok: false, code: 'busy', message: error.message });
        }
        if (error instanceof AuthorityError) {
          responseScope = undefined;
          return send(response, error.code === 'session' ? 401 : 403, {
            ok: false,
            code: error.code,
            message: error.message,
            ...(error.code === 'session' ? { loginUrl: '/auth/login' } : {}),
          });
        }
        const invalid =
          error instanceof z.ZodError ||
          error instanceof SyntaxError ||
          error instanceof HistoryCursorError ||
          (error instanceof Error && error.message === 'body-limit');
        if (error instanceof AuthoringRequestError)
          return send(response, 409, {
            ok: false,
            code: 'authoring-request',
            message: error.message,
          });
        if (error instanceof GameSaveError)
          return send(response, 400, { ok: false, code: 'save', message: error.message });
        return send(response, invalid ? 400 : 500, {
          ok: false,
          code: invalid ? 'invalid-input' : 'server',
          message:
            error instanceof HistoryCursorError
              ? error.message
              : invalid
                ? 'The request does not match the supported bounded input.'
                : 'The request failed. No automatic retry was submitted.',
        });
      } finally {
        if (writing) activeWrites--;
        activeRequests--;
        retainedBodyBytes -= requestBytes;
      }
    }
    if (vite) {
      vite.middlewares(request, response);
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405);
      response.end();
      return;
    }
    try {
      const path = resolve(
        assets,
        `.${decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)}`,
      );
      if (!path.startsWith(`${assets}${sep}`)) {
        response.writeHead(403);
        response.end();
        return;
      }
      if (!(await stat(path)).isFile()) throw new Error('not-found');
      const types: Record<string, string> = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
      };
      response.writeHead(200, {
        'Content-Type': types[extname(path)] ?? 'application/octet-stream',
        'Cache-Control': extname(path) === '.html' ? 'no-cache' : 'public, max-age=3600',
      });
      response.end(request.method === 'HEAD' ? undefined : await readFile(path));
    } catch {
      response.writeHead(404);
      response.end('Not found. Build the client with pnpm run build.');
    }
  });
  server.requestTimeout = 10_000;
  server.headersTimeout = 10_000;
  const stopRuntimeMonitoring = startRuntimeMonitoring();
  onFailure(stopRuntimeMonitoring);
  let previous = performance.now();
  let previousCallback = previous;
  let suspendedSeconds = 0;
  let ticking = false;
  let activeTick: Promise<void> | undefined;
  let thinking: Promise<void> | undefined;
  const interval =
    options.tick === false
      ? undefined
      : setInterval(() => {
          if (disposed || loadingSave) return;
          const callbackAt = performance.now();
          const callbackGap = (callbackAt - previousCallback) / 1000;
          // Busy ticks still receive timer callbacks; only missing callbacks imply suspension.
          if (callbackGap > 2) suspendedSeconds += callbackGap;
          recordDuration('timer.lateness', Math.max(0, callbackGap * 1000 - 50));
          previousCallback = callbackAt;
          if (ticking) {
            countMetric('timer.skippedWhileBusy');
            return;
          }
          ticking = true;
          const current = performance.now();
          const elapsed = (current - previous) / 1000;
          previous = current;
          const excluded = suspendedSeconds;
          suspendedSeconds = 0;
          activeTick = (async () => {
            await timed('tick.wall', () => service.tick(elapsed, excluded));
            autosaves.advance(Math.max(0, elapsed - excluded));
            // Background admission must not hold the native clock (docs/performance.md#triggered-background-work).
            if (!thinking)
              thinking = director
                .considerThought()
                .catch((error: unknown) => {
                  if (error instanceof OverloadError) return;
                  service.storageError =
                    'Background admission failed; simulation paused. Restart and reconcile storage.';
                  service.notify();
                })
                .finally(() => {
                  thinking = undefined;
                });
          })()
            .catch((error: unknown) => {
              if (error instanceof OverloadError) return;
              service.storageError =
                'Background persistence failed; simulation paused. Restart and reconcile storage.';
              service.notify();
            })
            .finally(() => {
              ticking = false;
            });
        }, 50);

  return {
    server,
    service,
    get director() {
      return director;
    },
    async close(): Promise<void> {
      await this.shutdown();
    },
    /** Every caller, including a concurrent one, receives the first shutdown's report. */
    shutdown(deadlineMs = SHUTDOWN_DEADLINE_MS): Promise<ShutdownReport> {
      shuttingDown ??= shutdownOnce(deadlineMs);
      return shuttingDown;
    },
  };
  /** Finite shutdown (PF06): every stage has a share of one deadline, a failed or late
   * stage is reported instead of stopping the rest, and resource close is always attempted
   * (a close past the deadline is reported; main.ts exits one second after the report). The
   * report states whether the final save completed and the last revision confirmed durable. */
  async function shutdownOnce(deadlineMs: number): Promise<ShutdownReport> {
    disposed = true;
    const until = performance.now() + deadlineMs;
    const problems: string[] = [];
    const stage = async (name: string, work: () => unknown, share = 1) => {
      const remaining = Math.max(0, until - performance.now());
      let timer: ReturnType<typeof setTimeout> | undefined;
      const running = Promise.resolve().then(work);
      // A stage abandoned at its deadline may still fail later; that must not crash shutdown.
      running.catch(() => undefined);
      try {
        const late = await Promise.race([
          running.then(() => false),
          new Promise<boolean>((resolve) => {
            timer = setTimeout(() => resolve(true), remaining * share);
          }),
        ]);
        if (late) problems.push(`${name} did not finish before the shutdown deadline`);
        return !late;
      } catch (error) {
        problems.push(
          `${name} failed: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
        return false;
      } finally {
        clearTimeout(timer);
      }
    };
    stopRuntimeMonitoring();
    if (interval) clearInterval(interval);
    if (publishTimer) clearTimeout(publishTimer);
    unsubscribe();
    director.macrofold.stop();
    // Authoring owns a separate transport and runner; drain both before the final world save
    // under the same finite shutdown deadline, retaining unfinished turns for recovery.
    await stage('MCP requests', () => mcp.close(), 0.2);
    await stage('World Agent turns', () => agentRuns.drain(), 0.2);
    await stage('Native tick', () => activeTick, 0.2);
    await stage('Background admission', () => thinking, 0.2);
    await stage('Checkpoint drain', () => autosaves.close(), 0.3);
    await stage('AI director', () => director.close(), 0.2);
    await stage('Publication', () => publicationDone, 0.1);
    await stage('Navigation', () => navigation.close(), 0.1);
    // Intake stopped when shutdown began; let already admitted requests finish first.
    await stage(
      'Admitted requests',
      async () => {
        while (activeRequests > 0) await new Promise((resolve) => setTimeout(resolve, 20));
      },
      0.3,
    );
    // A latched storage failure means no later state can be written honestly.
    const latched = service.storageError;
    let saved = false;
    if (latched) problems.push(`Final world save skipped: ${latched}`);
    else
      await stage(
        'Final world save',
        // Wait for in-flight background saves within this stage's share rather than the
        // queue's 5-second admission limit, then save the remaining progress synchronously.
        async () => {
          await service.settleBackgroundSaves();
          await service.flush();
          saved = true;
        },
        0.8,
      );
    await stage('Projection drain', () => projectionLane.idle(), 0.3);
    for (const [stream, state] of streams) {
      clearTimeout(state.timeout);
      stream.end();
    }
    streams.clear();
    for (const stream of ownerStreams) stream.close();
    await stage(
      'HTTP server',
      () =>
        new Promise<void>((resolveClose, reject) => {
          server.close((error) =>
            error && (error as NodeJS.ErrnoException).code !== 'ERR_SERVER_NOT_RUNNING'
              ? reject(error)
              : resolveClose(),
          );
          server.closeAllConnections?.();
        }),
      0.5,
    );
    await stage('Development assets', () => vite?.close(), 0.5);
    service.releaseHostWork();
    await stage('Storage', () => store.close(), 1);
    // A final save that finished after its stage deadline still counts as saved.
    const durable = service.durable;
    return {
      saved,
      durableRevision: durable.revision,
      durableSimTime: durable.simTime,
      problems: saved
        ? problems.filter((problem) => !problem.startsWith('Final world save did not finish'))
        : problems,
    };
  }
}
