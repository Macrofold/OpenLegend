import { foundationCapabilities } from './foundation-capabilities.js';
import { continuityView } from './continuity-view.js';
import {
  AuthorityError,
  capabilitySchema,
  scopeKey,
  type Capability,
  type RequestScope,
} from './authority.js';
import { OpenIdAuthentication, browserLoginToken } from './authentication.js';
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
import type { AiClient } from '@open-legend/ai';
import { AiDirector } from './ai-director.js';
import { readConfig, type AppConfig } from './config.js';
import { PostgresDatabase } from './postgres.js';
import { SqliteStore, digest } from './store.js';
import { WorldService, commandInputSchema, requestIdSchema } from './world-service.js';
import { projectPatch, projectView } from './view.js';
import type { GameView } from '@open-legend/protocol';
import { actionCatalogue } from './action-catalogue.js';
import { containerPage, objectHistoryPage } from './inventory-view.js';

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
    candidate: z.unknown().optional(),
    requestId: requestIdSchema,
    text: z.string().trim().min(1).max(1000),
    npcId: requestIdSchema.optional(),
  })
  .strict();
const worldAgentMessage = z
  .object({
    candidate: z.unknown().optional(),
    mode: z.enum(['discuss', 'invent']),
    continuation: z
      .object({
        parentId: requestIdSchema,
        action: z.enum(['clarify', 'revise', 'search', 'new', 'modify', 'reuse']),
        recipeId: requestIdSchema.optional(),
      })
      .strict()
      .optional(),
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
    stats: z
      .object({
        health: z.number().finite().min(0).max(100),
        fullness: z.number().finite().min(0).max(100).optional(),
        energy: z.number().finite().min(0).max(100).optional(),
      })
      .strict(),
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

async function jsonBody(request: IncomingMessage): Promise<unknown> {
  let bytes = 0;
  const chunks: Buffer[] = [];
  const limit = request.url?.startsWith('/api/god/editor/') ? 1_048_576 : 16_384;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string);
    bytes += buffer.length;
    if (bytes > limit) throw new Error('body-limit');
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}

function writeJson(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(value));
}

/** One serialized world host with explicit local or verified OIDC account authority. */
export async function createGameServer(
  options: {
    config?: AppConfig;
    production?: boolean;
    store?: SqliteStore;
    aiClient?: AiClient;
    now?: () => number;
    tick?: boolean;
  } = {},
) {
  const config = options.config ?? readConfig();
  const store =
    options.store ??
    new SqliteStore(
      config.databasePath,
      config.databaseUrl ? new PostgresDatabase(config.databaseUrl) : undefined,
    );
  const service = new WorldService(store, config, options.now);
  const autosaves = new Autosaves(service);
  await service.ready;
  let director = new AiDirector(service, options.aiClient, options.now);
  let loadingSave = false;
  let activeWrites = 0;
  const now = options.now ?? Date.now;
  const authentication =
    config.authentication.mode === 'oidc'
      ? new OpenIdAuthentication(config.authentication, now)
      : undefined;
  const cookie = (name: string, value: string, maxAge?: number) =>
    `${name}=${value}; HttpOnly; SameSite=Lax; Path=/${config.authentication.mode === 'oidc' && !config.authentication.insecureLoopback ? '; Secure' : ''}${maxAge === undefined ? '' : `; Max-Age=${maxAge}`}`;
  const readCookie = (request: IncomingMessage, name: 'ol_session' | 'ol_login') =>
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
  let pendingStreams = 0;
  let projectionQueue: Promise<unknown> = Promise.resolve();
  const invalidateStream = (stream: ServerResponse) => {
    // No private payload accompanies revocation. A blocked connection is disconnected;
    // data already handed to the transport cannot be recalled.
    if (streams.get(stream)?.blocked) stream.destroy();
    else stream.end('event: access-changed\ndata: {}\n\n');
  };
  const currentView = (scope: RequestScope): Promise<GameView> => {
    const pending = projectionQueue.then(async () => {
      service.assertScope(scope);
      for (const [key, channel] of channels)
        if (!service.currentScope(channel.scope)) channels.delete(key);
      const key = scopeKey(scope);
      let channel = channels.get(key);
      if (!channel) {
        while (channels.size >= 32) channels.delete(channels.keys().next().value!);
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
    projectionQueue = pending.catch(() => undefined);
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
  let publishQueued = false;
  let disposed = false;
  const publish = () => {
    if (disposed) return;
    if (publishTimer) return;
    if (publishing) {
      publishQueued = true;
      return;
    }
    publishTimer = setTimeout(async () => {
      publishTimer = undefined;
      publishing = true;
      try {
        if (!streams.size) return;
        for (const [stream, state] of streams) {
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
        if (publishQueued) {
          publishQueued = false;
          publish();
        }
      }
    }, 0);
  };
  const unsubscribe = service.subscribe(publish);
  const vite = options.production
    ? null
    : await (
        await import('vite')
      ).createServer({
        configFile: resolve('apps/client/vite.config.ts'),
        server: { middlewareMode: true },
        appType: 'spa',
      });
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
          response.setHeader('Set-Cookie', [
            cookie('ol_session', login.token, Math.floor(config.authentication.sessionMs / 1000)),
            cookie('ol_login', '', 0),
          ]);
          response.writeHead(303, { Location: '/', 'Cache-Control': 'no-store' });
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

      const origin = request.headers.origin;
      if (request.headers['sec-fetch-site'] === 'cross-site' || (origin && origin !== ownOrigin))
        return send(response, 403, {
          ok: false,
          code: 'origin',
          message: 'Use the game in its own browser tab.',
        });
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
          return send(response, 200, {
            ok: true,
            accountId: login.accountId,
            worlds: grant?.capabilities.includes('play')
              ? [{ id: service.world.id, actorId: grant.actorId }]
              : [],
          });
        }
        if (request.method === 'POST' && url.pathname === '/api/session/logout') {
          if (origin !== ownOrigin) throw new AuthorityError('forbidden');
          if (!(request.headers['content-type'] ?? '').startsWith('application/json'))
            return send(response, 415, { ok: false, message: 'Use a JSON request.' });
          z.object({})
            .strict()
            .parse(await jsonBody(request));
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
        if (request.method === 'GET' && url.pathname === '/api/performance') {
          service.assertScope(scope, 'inspect');
          return send(response, 200, performanceSnapshot());
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
          const messages = options.speechOnly
            ? page.items.map((item) => {
                const job = speechJobs.get(item.id);
                const failed = job?.status === 'failed';
                return {
                  id: item.id,
                  kind: item.kind === 'speech' ? 'speech' : 'action',
                  speakerId: item.speakerId,
                  speaker: item.speakerId
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
          if (streams.size + pendingStreams >= 8)
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
            await service.setConnection(transportId, false, scope);
          };
          response.once('close', () => {
            closed = true;
            clearTimeout(streams.get(response)?.timeout);
            streams.delete(response);
            void release().catch((error: unknown) => {
              console.error(
                'Game connection cleanup failed:',
                error instanceof Error ? error.message : 'unknown error',
              );
            });
          });
          // Keep admission reserved across the initial asynchronous private projection.
          pendingStreams++;
          try {
            connected = true;
            await service.setConnection(transportId, true, scope);
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
        const body = await jsonBody(request);
        const submittedScope =
          request.headers['x-ol-scope'] ??
          (url.pathname === '/api/presence' ? url.searchParams.get('scope') : undefined);
        if (
          config.authentication.mode === 'oidc' &&
          url.pathname !== '/api/embodiment' &&
          submittedScope !== scopeKey(scope)
        )
          throw new AuthorityError('stale-scope');
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
          '/api/god/mind',
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
          : url.pathname.startsWith('/api/god/')
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
            case '/api/saves/list': {
              const page = z
                .object({
                  before: z
                    .object({ createdAt: z.string().datetime(), id: requestIdSchema })
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
              autosaves.observeCatalog(saves);
              return send(response, 200, {
                ok: true,
                saves,
                autosaves: autosaves.status,
                next:
                  candidates.length > 100
                    ? { id: saves.at(-1)!.id, createdAt: saves.at(-1)!.createdAt }
                    : undefined,
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
              let drained = false;
              try {
                // Drain real background writers before replacing authority; no new worker framework.
                const paused = await service.control({ paused: true }, scope);
                if (!paused.ok) throw new GameSaveError(paused.message);
                director.macrofold.stop();
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
                if (drained) director = new AiDirector(service, options.aiClient, options.now);
                else {
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
                })
                .strict()
                .parse(body);
              return send(response, 200, containerPage(service, scope, value));
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
              if (value.mode === 'invent' && value.retryOf)
                return send(response, 400, {
                  ok: false,
                  message:
                    'Submit a new explicit invention request; failed work is never replayed automatically.',
                });
              if (value.mode === 'discuss') service.assertScope(scope, 'create');
              const result =
                value.mode === 'invent'
                  ? await director.submitInteractive(
                      'invention',
                      value.requestId,
                      value.text,
                      undefined,
                      value.conversationId,
                      value.continuation,
                      value.candidate,
                      scope,
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
              await director.macrofold.closeConversation(value.conversationId, scope);
              return send(response, 200, {
                ok: true,
                message: 'Conversation ended; compute shutdown requested.',
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
        // Read-only catalog access is checked above and again by send after its filesystem work.
        return [
          '/api/saves/list',
          '/api/saves/load',
          '/api/saves/create',
          '/api/saves/delete',
          '/api/world-agent/messages',
          '/api/chat',
          '/api/chat/retry',
          '/api/invent',
        ].includes(url.pathname)
          ? await dispatch()
          : await service.authorized(scope, required, controlling, dispatch);
      } catch (error) {
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
          (error instanceof Error && error.message === 'body-limit');
        if (error instanceof GameSaveError)
          return send(response, 400, { ok: false, code: 'save', message: error.message });
        return send(response, invalid ? 400 : 500, {
          ok: false,
          code: invalid ? 'invalid-input' : 'server',
          message: invalid
            ? 'The request does not match the supported bounded input.'
            : 'The request failed. No automatic retry was submitted.',
        });
      } finally {
        if (writing) activeWrites--;
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
                .catch(() => {
                  service.storageError =
                    'Background admission failed; simulation paused. Restart and reconcile storage.';
                  service.notify();
                })
                .finally(() => {
                  thinking = undefined;
                });
          })()
            .catch(() => {
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
    async close() {
      if (disposed) return;
      disposed = true;
      stopRuntimeMonitoring();
      if (interval) clearInterval(interval);
      if (publishTimer) clearTimeout(publishTimer);
      unsubscribe();
      director.macrofold.stop();
      await activeTick;
      await thinking;
      await autosaves.close();
      await director.close();
      await service.flush();
      await projectionQueue;
      for (const [stream, state] of streams) {
        clearTimeout(state.timeout);
        stream.end();
      }
      streams.clear();
      await new Promise<void>((resolveClose, reject) =>
        server.close((error) => (error ? reject(error) : resolveClose())),
      );
      await vite?.close();
      service.releaseHostWork();
      await store.close();
    },
  };
}
