import type { AiClient } from '@open-legend/ai';
import { CognitionExecution } from './cognition-execution.js';
import { NativeNpcDirector } from './native-npc-director.js';
import { createNativeCognitionMaintenance } from './native-maintenance-host.js';
import { playerInteractionRequest } from './player-interaction-request.js';
import { recoverHumanRequest } from './human-request-recovery.js';
import { createServer, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { NativeHost } from '@open-legend/native-simulation';
import { z } from 'zod';
import {
  AuthorityError,
  isCharacterless,
  scopeKey,
  type RequestScope,
  type Capability,
} from './authority.js';
import { OpenIdAuthentication, browserLoginToken } from './authentication.js';
import type { AppConfig } from './config.js';
import { PostgresDatabase } from './postgres.js';
import { SqlGameRepository } from './store.js';
import { NativeWorldService } from './native-world-service.js';
import { NativePlayerHttp } from './native-player-http.js';
import { commandInputSchema, requestIdSchema } from './command-input-schema.js';
import { createClientAssets, type ClientAssets } from './client-assets.js';
import { readAssetIndex } from './asset-configuration.js';
import { readHttpJson } from './http-json.js';
import { gameCookie, gameHttpLocation, readGameCookie, writeJson } from './http-boundary.js';
import { OverloadError } from './work-lane.js';
import { SHUTDOWN_DEADLINE_MS, type ShutdownReport } from './server-shutdown.js';
import { worldInputSchema } from './world-input-schema.js';
import { Autosaves } from './autosaves.js';
import { GameSaveError } from './game-saves.js';
import { resolveRecentObservationReference } from './recent-history.js';
import { HistoryCursorError } from './perceived-events.js';
import { releaseNativeProduct, retainNativeProduct } from './native-consumer.js';
import { PrivateSnapshotStream } from './private-snapshot-stream.js';
import { nativeNpcReplyPreviewMemory } from './native-npc-reply-preview.js';
import type { NpcReplyPreview } from '@open-legend/protocol';
import {
  decisionJsonGraphBytes,
  decisionObjectBytes,
  decisionTextBytes,
} from './native-decision-allocation.js';

const clientId = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
const commandRequest = z
  .object({
    commandId: requestIdSchema,
    commandEpoch: z.string().uuid(),
    command: commandInputSchema,
  })
  .strict();
const sequence = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const presenceRequest = z
  .object({ clientId, visible: z.boolean(), sequence: sequence.optional() })
  .strict();
const controlRequest = z
  .object({
    paused: z.boolean().optional(),
    speed: z.number().optional(),
    clientId: clientId.optional(),
    presenceSequence: sequence.optional(),
  })
  .strict();

/** Explicit selected-proof composition. The ordinary full-game factory remains
 * separate; this factory adopts only validated current SQL and never constructs
 * a Source WorldService, SavedWorld or alternate gameplay authority. */
export async function createNativeGameServer(options: {
  readonly config: AppConfig;
  readonly production?: boolean;
  readonly host?: NativeHost;
  readonly store?: SqlGameRepository;
  readonly clientAssets?: ClientAssets;
  readonly now?: () => number;
  readonly tick?: boolean;
  readonly aiClient?: AiClient;
}) {
  const { config } = options;
  const now = options.now ?? Date.now;
  const host = options.host ?? new NativeHost(2);
  const store =
    options.store ??
    new SqlGameRepository(
      config.dataDirectory,
      new PostgresDatabase(config.databaseUrl, false, config.sqlWriteGroups),
    );
  let service: NativeWorldService | undefined;
  let director: NativeNpcDirector | undefined;
  let cognitionExecution: CognitionExecution | undefined;
  let player: NativePlayerHttp | undefined;
  let assets: ClientAssets | undefined;
  try {
    const assetIndex = await readAssetIndex();
    service = await NativeWorldService.open({
      host,
      store,
      config,
      now,
      presentationRelease: assetIndex.release,
    });
    const current = service;
    cognitionExecution = new CognitionExecution(store, now);
    const execution = cognitionExecution;
    const makeDirector = () =>
      new NativeNpcDirector(
        current,
        (ports) => createNativeCognitionMaintenance(current, ports, now),
        options.aiClient,
        now,
        execution,
      );
    director = makeDirector();
    let decisions = director;
    const autosaves = new Autosaves(current);
    await autosaves.initialize();
    player = new NativePlayerHttp(current, {
      executionSource: 'live-model',
      jevConfigured: !!(config.macrofoldKey || config.jevKey),
      llmConfigured: !!(config.macrofoldKey || config.llmKey),
    });
    let views = player;
    assets =
      options.clientAssets ??
      (await createClientAssets(options.production, {
        networkCapacity: config.capacity.requests,
        authorizeAsset: async (request, reference) => {
          try {
            const token = readGameCookie(request, 'ol_session');
            const login = await store.authority.authenticate(token, now());
            await store.assets.authorizeArtifact(
              { accountId: login.accountId },
              assetIndex.release,
              reference,
            );
            await store.authority.authenticate(token, now());
            return true;
          } catch {
            return false;
          }
        },
      }));
    const clientAssets = assets;
    const authentication =
      config.authentication.mode === 'oidc'
        ? new OpenIdAuthentication(config.authentication, now)
        : undefined;
    let stopping = false;
    let loadingSave = false;
    let activeWrites = 0;
    let thinking: Promise<void> | undefined;
    let requests = 0;
    let retainedBodyBytes = 0;
    let pendingStreams = 0;
    const privateStreams = new Set<PrivateSnapshotStream<NpcReplyPreview | null>>();
    const closePrivateStreams = async () => {
      const owned = [...privateStreams];
      for (const stream of owned) stream.close();
      await Promise.all(owned.map((stream) => stream.drain()));
    };
    const disconnects = new Set<Promise<void>>();
    let shutdown: Promise<ShutdownReport> | undefined;
    let previous = performance.now(),
      previousCallback = previous,
      suspendedSeconds = 0;
    let activeTick: Promise<void> | undefined,
      clockContinuation: ReturnType<typeof setImmediate> | undefined;
    const wakeClock = () => {
      if (stopping || loadingSave || activeTick) return;
      if (clockContinuation) clearImmediate(clockContinuation);
      clockContinuation = undefined;
      const offeredUntil = performance.now(),
        elapsed = (offeredUntil - Math.max(previous, current.clockStartedAt)) / 1000;
      previous = offeredUntil;
      const suspended = suspendedSeconds;
      suspendedSeconds = 0;
      let more = false;
      activeTick = current
        .tick(elapsed, suspended, { drain: false, offeredUntil })
        .then((value) => {
          more = value;
          const admittedElapsed = Math.min(
            elapsed,
            Math.max(0, (offeredUntil - current.clockStartedAt) / 1000),
          );
          autosaves.advance(Math.max(0, admittedElapsed - suspended));
          // Optional inference admission never blocks the clock's next turn.
          if (!thinking)
            thinking = decisions
              .considerThought()
              .catch((error: unknown) => {
                if (!(error instanceof OverloadError)) current.fail(error);
              })
              .finally(() => {
                thinking = undefined;
              });
        })
        .catch((error: unknown) => {
          if (error instanceof OverloadError) return;
          console.error('Native automatic simulation failed.', error);
          current.fail(error);
        })
        .finally(() => {
          activeTick = undefined;
          if (more && !stopping && !clockContinuation)
            clockContinuation = setImmediate(() => {
              clockContinuation = undefined;
              wakeClock();
            });
        });
    };
    if (options.tick !== false) current.useMonotonicClock();
    const clock =
      options.tick === false
        ? undefined
        : setInterval(() => {
            if (stopping) return;
            const at = performance.now(),
              gap = (at - previousCallback) / 1000;
            previousCallback = at;
            if (gap > 2) suspendedSeconds += gap;
            wakeClock();
          }, 50);
    clock?.unref();
    const server = createServer(async (request, response) => {
      response.setHeader('X-Content-Type-Options', 'nosniff');
      response.setHeader('Referrer-Policy', 'same-origin');
      response.setHeader('X-Frame-Options', 'DENY');
      const address = server.address();
      const location = gameHttpLocation(
        request,
        address && typeof address !== 'string' ? address.port : config.port,
        config.authentication,
      );
      if ('redirect' in location) {
        response.writeHead(307, { Location: location.redirect, 'Cache-Control': 'no-store' });
        response.end();
        return;
      }
      if ('status' in location)
        return writeJson(response, location.status, {
          ok: false,
          code: location.code,
          message: location.message,
        });
      const { url, ownOrigin } = location;
      let scope: RequestScope | undefined;
      let capability: Capability = 'play';
      const send = (status: number, value: unknown) => {
        if (scope && !current.currentScope(scope, capability))
          return writeJson(response, 403, {
            ok: false,
            code: 'stale-scope',
            message: 'Access changed. Refresh before continuing.',
          });
        writeJson(response, status, value);
      };
      if (requests >= config.capacity.requests) {
        response.setHeader('Retry-After', '1');
        return send(503, { ok: false, code: 'busy', message: new OverloadError().message });
      }
      if (stopping)
        return send(503, {
          ok: false,
          code: 'shutdown',
          message: 'The server is shutting down. No request was admitted.',
        });
      requests++;
      let requestBytes = 0;
      let writing = false;
      try {
        if (request.method === 'GET' && url.pathname.startsWith('/auth/')) {
          const cookie = (name: string, value: string, maxAge?: number) =>
            gameCookie(config.authentication, name, value, maxAge);
          if (config.authentication.mode === 'local' && url.pathname === '/auth/login') {
            response.setHeader('Set-Cookie', cookie('ol_session', await current.signInLocal()));
            response.writeHead(303, { Location: '/', 'Cache-Control': 'no-store' });
            response.end();
            return;
          }
          if (!authentication) throw new AuthorityError('forbidden');
          const stop = new AbortController();
          const disconnected = () => {
            if (!response.writableFinished) stop.abort();
          };
          request.once('aborted', disconnected);
          response.once('close', disconnected);
          try {
            if (url.pathname === '/auth/login') {
              const token = browserLoginToken();
              const destination = await authentication.begin(
                token,
                url.searchParams.get('change-account') === 'true',
                stop.signal,
              );
              stop.signal.throwIfAborted();
              response.setHeader('Set-Cookie', cookie('ol_login', token, 300));
              response.writeHead(303, { Location: destination.href, 'Cache-Control': 'no-store' });
              response.end();
              return;
            }
            if (url.pathname === '/auth/callback') {
              const previous = readGameCookie(request, 'ol_session');
              await authentication.complete(
                new URL(request.url!, ownOrigin),
                readGameCookie(request, 'ol_login'),
                async (identity, context) => {
                  const login = await current.authenticationMutation(() =>
                    store.db.transaction(async () => {
                      context.throwIfStopped();
                      const next = await store.authority.login(
                        identity,
                        now(),
                        config.authentication.sessionMs,
                        config.capacity.sessions,
                      );
                      if (previous) {
                        try {
                          const old = await store.authority.authenticate(previous, now());
                          await store.authority.revokeSession(old.id, now());
                        } catch (error) {
                          if (!(error instanceof AuthorityError)) throw error;
                        }
                      }
                      return next;
                    }),
                  );
                  context.throwIfStopped();
                  response.setHeader('Set-Cookie', [
                    cookie(
                      'ol_session',
                      login.token,
                      Math.floor(config.authentication.sessionMs / 1000),
                    ),
                    cookie('ol_login', '', 0),
                  ]);
                  response.writeHead(303, { Location: '/', 'Cache-Control': 'no-store' });
                  response.end();
                },
                stop.signal,
              );
              return;
            }
          } finally {
            request.off('aborted', disconnected);
            response.off('close', disconnected);
          }
          return send(404, { ok: false, code: 'route', message: 'Unknown API route.' });
        }
        if (!url.pathname.startsWith('/api/')) {
          await clientAssets.serve(request, response, url);
          return;
        }
        const origin = request.headers.origin;
        if (request.headers['sec-fetch-site'] === 'cross-site' || (origin && origin !== ownOrigin))
          return send(403, {
            ok: false,
            code: 'origin',
            message: 'Use the game in its own browser tab.',
          });
        let token = readGameCookie(request, 'ol_session');
        if (
          !token &&
          config.authentication.mode === 'local' &&
          request.method === 'GET' &&
          url.pathname === '/api/state'
        ) {
          token = current.localSessionToken;
          response.setHeader('Set-Cookie', gameCookie(config.authentication, 'ol_session', token));
        }
        const connectionId = clientId.parse(
          request.headers['x-ol-client'] ?? url.searchParams.get('client') ?? 'local-internal',
        );
        if (config.authentication.mode === 'oidc' && connectionId === 'local-internal')
          throw new AuthorityError('session');
        if (request.method === 'GET' && url.pathname === '/api/session') {
          const login = await store.authority.authenticate(token, now());
          const grant = await store.authority.grant(current.worldId, login.accountId);
          const entered =
            grant &&
            (grant.actorId ? grant.capabilities.includes('play') : grant.capabilities.length > 0);
          return send(200, {
            ok: true,
            accountId: login.accountId,
            worlds: entered
              ? [{ id: current.worldId, actorId: grant.actorId, capabilities: grant.capabilities }]
              : [],
          });
        }
        if (request.method === 'POST' && url.pathname === '/api/session/logout') {
          const login = await store.authority.authenticate(token, now());
          if (origin !== ownOrigin) throw new AuthorityError('forbidden');
          if (!(request.headers['content-type'] ?? '').startsWith('application/json'))
            return send(415, { ok: false, message: 'Use a JSON request.' });
          z.object({})
            .strict()
            .parse(await readHttpJson(request, url.pathname));
          await current.authenticationMutation(() =>
            store.authority.revokeSession(login.id, now()),
          );
          response.setHeader('Set-Cookie', gameCookie(config.authentication, 'ol_session', '', 0));
          return send(200, { ok: true, message: 'Signed out.' });
        }
        scope = await store.authority.authenticateScope(
          token,
          now(),
          current.worldId,
          current.timelineId,
          connectionId,
        );
        if (isCharacterless(scope))
          return send(403, {
            ok: false,
            code: 'characterless',
            message: 'This account has no character in this world. Use World operations.',
          });
        if (
          request.method === 'GET' &&
          url.pathname !== '/api/state' &&
          request.headers['x-ol-scope'] !== undefined &&
          request.headers['x-ol-scope'] !== scopeKey(scope)
        )
          throw new AuthorityError('stale-scope');
        if (loadingSave)
          return send(409, { ok: false, code: 'loading', message: 'A saved world is loading.' });
        if (request.method === 'GET' && url.pathname === '/api/state') {
          await views.state(scope, response);
          return;
        }
        if (request.method === 'GET' && url.pathname === '/api/chat/preview') {
          const previewScope = scope;
          current.assertScope(previewScope, 'play', true);
          const requestId = requestIdSchema.parse(url.searchParams.get('requestId'));
          if (
            url.searchParams.get('worldId') !== current.worldId ||
            url.searchParams.get('scope') !== scopeKey(previewScope)
          )
            throw new AuthorityError('stale-scope');
          if (views.connections + privateStreams.size + pendingStreams >= current.connectionLimit)
            return send(429, {
              ok: false,
              code: 'connections',
              message: 'Too many open connections.',
            });
          pendingStreams++;
          try {
            const initial = decisions.replyPreviews.snapshot(previewScope, requestId);
            if (initial) releaseNativeProduct(initial);
            current.assertScope(previewScope, 'play', true);
            if (response.destroyed) return;
            // Fund this stream, its watcher/timers and retained request scope
            // separately from snapshots, serialized text and queued frames.
            const streamMemory = current.world.reserveConsumerBytes(
              decisionObjectBytes(36) +
                decisionJsonGraphBytes(previewScope) +
                decisionTextBytes(requestId.length),
            );
            try {
              response.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-store',
                Connection: 'keep-alive',
                'X-Accel-Buffering': 'no',
              });
              response.flushHeaders();
              const stream = new PrivateSnapshotStream(
                response,
                async () => decisions.replyPreviews.snapshot(previewScope, requestId),
                () => !loadingSave && !stopping && current.currentScope(previewScope, 'play', true),
                (notify) => decisions.replyPreviews.watch(notify),
                () => {
                  privateStreams.delete(stream);
                  // A closed connection can still have a snapshot/publication
                  // in flight. Its retained scope ends only after that pump.
                  void stream.drain().then(
                    () => streamMemory.release(),
                    () => streamMemory.release(),
                  );
                },
                (snapshot) => (snapshot ? `${snapshot.generation}:${snapshot.sequence}` : 'none'),
                (snapshot) => {
                  const latest = decisions.replyPreviews.snapshot(previewScope, requestId);
                  try {
                    return (
                      snapshot?.generation === latest?.generation &&
                      snapshot?.sequence === latest?.sequence
                    );
                  } finally {
                    if (latest) releaseNativeProduct(latest);
                  }
                },
                nativeNpcReplyPreviewMemory(current),
                (publish) => current.publishReplyPreview(previewScope, publish),
              );
              privateStreams.add(stream);
            } catch (error) {
              streamMemory.release();
              throw error;
            }
          } finally {
            pendingStreams--;
          }
          return;
        }
        if (request.method === 'GET' && url.pathname === '/api/events') {
          if (views.connections + privateStreams.size + pendingStreams >= current.connectionLimit)
            return send(429, {
              ok: false,
              code: 'connections',
              message: 'Too many open game tabs.',
            });
          const transport = randomUUID();
          const capturedScope = scope;
          let connected = false,
            released = false,
            closed = response.destroyed;
          const release = async (): Promise<void> => {
            if (!connected || released || stopping) return;
            released = true;
            try {
              await current.setConnection(transport, false, capturedScope);
            } catch (error) {
              released = false;
              if (!(error instanceof OverloadError)) throw error;
              const retry = setTimeout(() => trackRelease(), 1000);
              retry.unref();
            }
          };
          const trackRelease = () => {
            const task = release().catch((error: unknown) =>
              console.error('Native connection cleanup failed.', error),
            );
            disconnects.add(task);
            void task.finally(() => disconnects.delete(task));
          };
          response.once('close', () => {
            closed = true;
            trackRelease();
          });
          pendingStreams++;
          try {
            if (closed) return;
            await current.setConnection(transport, true, capturedScope);
            connected = true;
            if (closed) {
              await release();
              return;
            }
            await views.connect(capturedScope, response, trackRelease);
          } catch (error) {
            await release();
            throw error;
          } finally {
            pendingStreams--;
          }
          return;
        }
        if (request.method === 'GET' && url.pathname === '/api/player-interaction/availability') {
          const value = z
            .object({ mode: z.enum(['speak', 'act']), targetId: requestIdSchema.optional() })
            .strict()
            .parse(Object.fromEntries(url.searchParams));
          return send(
            200,
            await current.playerInteractionAvailability(value.mode, value.targetId, scope),
          );
        }
        if (request.method !== 'POST')
          return send(404, { ok: false, code: 'route', message: 'Unknown API route.' });
        if (origin !== ownOrigin)
          return send(403, {
            ok: false,
            code: 'origin',
            message: 'Mutation requires the game origin.',
          });
        const contentType = request.headers['content-type'] ?? '';
        if (
          !contentType.startsWith('application/json') &&
          !(url.pathname === '/api/presence' && contentType.startsWith('text/plain'))
        )
          return send(415, { ok: false, code: 'content-type', message: 'Use a JSON request.' });
        const body = await readHttpJson(request, url.pathname, (bytes) => {
          if (retainedBodyBytes + bytes > 16 * 1024 * 1024) throw new OverloadError();
          retainedBodyBytes += bytes;
          requestBytes += bytes;
        });
        const submittedScope =
          request.headers['x-ol-scope'] ??
          (url.pathname === '/api/presence' ? url.searchParams.get('scope') : undefined);
        if (url.pathname !== '/api/embodiment' && submittedScope !== scopeKey(scope))
          throw new AuthorityError('stale-scope');
        if (loadingSave)
          return send(409, { ok: false, code: 'loading', message: 'A saved world is loading.' });
        writing = true;
        activeWrites++;
        const generation = request.headers['x-ol-generation'];
        if (generation && generation !== current.generation && url.pathname !== '/api/saves/load')
          return send(409, {
            ok: false,
            code: 'stale-world',
            message: 'The world changed. Reload this tab.',
          });
        switch (url.pathname) {
          case '/api/saves/list': {
            capability = 'save';
            current.assertScope(scope, capability);
            const page = z
              .object({
                before: z
                  .object({
                    createdAt: z.string().datetime(),
                    id: requestIdSchema,
                    sequence: sequence.optional(),
                  })
                  .strict()
                  .optional(),
              })
              .strict()
              .parse(body);
            const candidates = await store.saves.list(current.worldId, {
              limit: 101,
              before: page.before,
            });
            const saves = candidates.slice(0, 100),
              last = saves.at(-1);
            autosaves.observeCatalog(saves, await store.saves.storageBytes(), !page.before);
            return send(200, {
              ok: true,
              saves,
              autosaves: await autosaves.status(),
              next:
                candidates.length > 100 && last
                  ? { id: last.id, createdAt: last.createdAt, sequence: last.sequence }
                  : undefined,
            });
          }
          case '/api/saves/settings': {
            capability = 'save';
            current.assertScope(scope, capability);
            const value = z
              .object({
                enabled: z.boolean(),
                intervalMinutes: z.number(),
                retain: z.number(),
                revision: sequence,
              })
              .strict()
              .parse(body);
            await current.authenticationMutation(() =>
              store.db.transaction(async () => {
                await store.authority.assertFence({
                  scope: scope!,
                  capability: 'save',
                  controlling: false,
                  now,
                });
                const { revision, ...settings } = value;
                await autosaves.updateSettings(settings, revision);
              }),
            );
            return send(200, {
              ok: true,
              message: 'Autosave settings saved.',
              autosaves: await autosaves.status(),
            });
          }
          case '/api/saves/acknowledge': {
            capability = 'save';
            current.assertScope(scope, capability);
            const value = z.object({ id: z.string().uuid() }).strict().parse(body);
            const acknowledged = await current.authenticationMutation(() =>
              store.db.transaction(async () => {
                await store.authority.assertFence({
                  scope: scope!,
                  capability: 'save',
                  controlling: false,
                  now,
                });
                return store.saves.acknowledgeFailure(current.worldId, value.id);
              }),
            );
            return send(200, {
              ok: true,
              message: acknowledged
                ? 'Checkpoint failure acknowledged.'
                : 'That failure was already acknowledged or replaced by a newer one.',
              autosaves: await autosaves.status(),
            });
          }
          case '/api/saves/receipt': {
            capability = 'save';
            current.assertScope(scope, capability);
            const value = z
              .discriminatedUnion('operation', [
                z
                  .object({
                    operation: z.literal('create'),
                    requestId: z.string().uuid(),
                    label: z.string().trim().min(1).max(80),
                    timeline: requestIdSchema,
                  })
                  .strict(),
                z
                  .object({
                    operation: z.literal('load'),
                    requestId: z.string().uuid(),
                    saveId: requestIdSchema,
                    label: z.string().min(1).max(80),
                    timeline: requestIdSchema,
                  })
                  .strict(),
              ])
              .parse(body);
            if (value.operation === 'create') {
              const status = await store.saves.creationResult(
                current.worldId,
                value.requestId,
                value.label,
              );
              const message =
                status === 'resolved'
                  ? 'The original checkpoint was created.'
                  : status === 'pending'
                    ? 'The original checkpoint is still being created. Nothing was resubmitted.'
                    : 'The original checkpoint has no confirmed published result. Nothing was resubmitted.';
              return send(200, {
                ok: true,
                scope: scopeKey(scope),
                status,
                message,
                ...(status === 'resolved' ? { result: { ok: true, code: 'saved', message } } : {}),
              });
            }
            const prior = (await store.getIntegration(`load-request:${value.requestId}`)) as
              | { saveId: string }
              | undefined;
            if (prior && prior.saveId !== value.saveId)
              return send(409, {
                ok: false,
                code: 'idempotency-conflict',
                message: 'The saved checkpoint does not match the original load request.',
              });
            const message = prior
              ? current.storageError
                ? `The original load was installed, but saving still needs attention: ${current.storageError}`
                : 'The original load was installed. No checkpoint was loaded again and its protection was not replaced.'
              : 'The original load has no confirmed installation record. Nothing was loaded again.';
            return send(200, {
              ok: true,
              scope: scopeKey(scope),
              status: prior ? 'resolved' : 'unknown',
              message,
              ...(prior
                ? {
                    result: {
                      ok: !current.storageError,
                      code: current.storageError ? 'storage' : 'loaded',
                      message,
                    },
                  }
                : {}),
            });
          }
          case '/api/saves/load': {
            capability = 'save';
            current.assertScope(scope, 'save');
            const value = z
              .object({ id: requestIdSchema, requestId: z.string().uuid() })
              .strict()
              .parse(body);
            if (activeWrites > 1)
              return send(409, {
                ok: false,
                message: 'Another request is finishing. Try loading again shortly.',
              });
            const prior = (await store.getIntegration(`load-request:${value.requestId}`)) as
              | { saveId: string }
              | undefined;
            if (prior)
              return send(prior.saveId === value.id ? 200 : 409, {
                ok: prior.saveId === value.id,
                message:
                  prior.saveId === value.id
                    ? 'This load already completed.'
                    : 'Load request conflicts.',
              });
            if (generation !== current.generation)
              return send(409, {
                ok: false,
                message: 'The world changed. Reload this tab before loading.',
              });
            loadingSave = true;
            let draining = false,
              drained = false;
            try {
              await closePrivateStreams();
              const paused = await current.control({ paused: true }, scope);
              try {
                if (!paused.ok) throw new GameSaveError(paused.message);
              } finally {
                releaseNativeProduct(paused);
              }
              draining = true;
              decisions.macrofold.stop();
              await decisions.close();
              drained = true;
              await thinking;
              await current.restoreSave(value.id, value.requestId, scope);
              await views.close();
              player = views = new NativePlayerHttp(current, {
                executionSource: 'live-model',
                jevConfigured: !!(config.macrofoldKey || config.jevKey),
                llmConfigured: !!(config.macrofoldKey || config.llmKey),
              });
              // The committed new timeline invalidates the submitted old scope.
              scope = undefined;
              return send(200, { ok: true, message: 'Saved world loaded and paused.' });
            } finally {
              if (drained) director = decisions = makeDirector();
              else if (draining)
                current.fail(
                  new Error(
                    'Loading stopped before background work drained. Restart before continuing.',
                  ),
                );
              loadingSave = false;
            }
          }
          case '/api/chat': {
            const value = playerInteractionRequest.parse(body);
            if (value.candidate !== undefined)
              return send(200, {
                ok: false,
                code: 'invalid-declaration',
                message:
                  'Supply a proposal of at most 12,000 characters for authoring, separately from reuse or search.',
              });
            return send(
              202,
              await decisions.submitInteractive(
                value.requestId,
                value.text,
                value.npcId,
                scope,
                value.volume,
              ),
            );
          }
          case '/api/chat/receipt': {
            const value = z
              .object({ requestId: requestIdSchema, timeline: requestIdSchema })
              .strict()
              .parse(body);
            return send(200, await recoverHumanRequest(current, scope, value, 'chat'));
          }
          case '/api/chat/retry': {
            const value = z
              .object({ requestId: requestIdSchema, originalRequestId: requestIdSchema })
              .strict()
              .parse(body);
            return send(
              200,
              await decisions.retryInteractive(value.requestId, value.originalRequestId, scope),
            );
          }
          case '/api/ai/cancel': {
            const value = z.object({ jobId: requestIdSchema }).strict().parse(body);
            return send(200, await decisions.cancel(value.jobId, scope));
          }
          case '/api/input': {
            const result = await current.updateWorldInput(worldInputSchema.parse(body), scope);
            try {
              return send(200, result);
            } finally {
              releaseNativeProduct(result);
            }
          }
          case '/api/embodiment': {
            const value = z
              .object({
                id: requestIdSchema,
                expectedGeneration: sequence,
                operation: z.enum(['acquire', 'replace', 'release']),
              })
              .strict()
              .parse(body);
            if (
              submittedScope !== scopeKey(scope) &&
              submittedScope !== scopeKey({ ...scope, controlGeneration: value.expectedGeneration })
            )
              throw new AuthorityError('stale-scope');
            const result = await current.changeEmbodiment(scope, value);
            try {
              return send(result.ok ? 200 : 409, result);
            } finally {
              releaseNativeProduct(result);
            }
          }
          case '/api/control': {
            const result = await current.control(controlRequest.parse(body), scope);
            try {
              return send(200, result);
            } finally {
              releaseNativeProduct(result);
            }
          }
          case '/api/presence': {
            const value = presenceRequest.parse(body);
            await current.reportPresence(value.clientId, value.visible, value.sequence, scope);
            return send(200, {
              ok: true,
              code: 'presence',
              message: value.visible ? 'Present.' : 'Away.',
            });
          }
          case '/api/saves/create': {
            capability = 'save';
            current.assertScope(scope, 'save');
            const value = z
              .object({ id: z.string().uuid(), label: z.string().trim().min(1).max(80) })
              .strict()
              .parse(body);
            await current.createSave(value.label, value.id, scope);
            return send(200, { ok: true, message: 'Game saved.' });
          }
          case '/api/saves/delete': {
            capability = 'save';
            current.assertScope(scope, 'save');
            const value = z.object({ id: requestIdSchema }).strict().parse(body);
            await current.deleteSave(value.id, scope);
            return send(200, { ok: true, message: 'Save deleted.' });
          }
          case '/api/command': {
            const value = commandRequest.parse(body);
            const result = await current.command(
              value.commandId,
              value.command,
              value.commandEpoch,
              scope,
            );
            try {
              return send(200, result);
            } finally {
              releaseNativeProduct(result);
            }
          }
          case '/api/command/receipt': {
            const value = commandRequest.parse(body);
            const result = await current.commandReceipt(
              value.commandId,
              value.command,
              value.commandEpoch,
              scope,
            );
            try {
              return send(200, result);
            } finally {
              releaseNativeProduct(result);
            }
          }
          case '/api/memories':
          case '/api/god/memories': {
            const { actorId, ...value } = z
              .object({
                actorId: requestIdSchema,
                cursor: z.string().max(2048).optional(),
                query: z.string().max(200).optional(),
                thoughts: z.boolean().optional(),
                recent: z.boolean().optional(),
              })
              .strict()
              .parse(body);
            if (
              (url.pathname === '/api/memories' && actorId !== scope.actorId) ||
              (url.pathname === '/api/god/memories' && !config.godMode)
            )
              throw new AuthorityError('forbidden');
            await current.publishMemoryHistory(actorId, scope, value, (bytes) => {
              if (response.destroyed) return;
              response.writeHead(200, {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-store',
              });
              retainNativeProduct(bytes);
              response.once('close', () => releaseNativeProduct(bytes));
              response.end(bytes, () => releaseNativeProduct(bytes));
            });
            return;
          }
          case '/api/god/correct-memory':
          case '/api/god/forget-memory': {
            capability = 'create';
            current.assertScope(scope, capability);
            const correction = url.pathname === '/api/god/correct-memory';
            const fields = {
              actorId: requestIdSchema,
              ...(correction ? { correctionEventId: requestIdSchema } : {}),
            };
            const value = z
              .union([
                z.object({ ...fields, sourceId: requestIdSchema }).strict(),
                z.object({ ...fields, receiptReference: z.string().min(1).max(2048) }).strict(),
              ])
              .parse(body);
            // Both route schemas above require this actual evidence field only
            // for correction; the semantic writer independently admits its body.
            const correctionEventId =
              'correctionEventId' in value ? (value.correctionEventId as string) : undefined;
            const outcome =
              'receiptReference' in value
                ? correctionEventId
                  ? await current.correctRecentObservation(
                      resolveRecentObservationReference(
                        current,
                        value.actorId,
                        scope,
                        value.receiptReference,
                      ),
                      correctionEventId,
                      scope,
                    )
                  : await current.forgetRecentObservation(
                      resolveRecentObservationReference(
                        current,
                        value.actorId,
                        scope,
                        value.receiptReference,
                      ),
                      scope,
                    )
                : correctionEventId
                  ? await current.correctMemory(
                      value.actorId,
                      value.sourceId,
                      correctionEventId,
                      scope,
                    )
                  : await current.forgetMemory(value.actorId, value.sourceId, scope);
            try {
              if (!correction && outcome.ok) await store.db.exec('DELETE FROM intelligence_calls');
              // writeJson consumes the report synchronously; the response owns
              // its serialized body before this independent native copy ends.
              return send(200, outcome);
            } finally {
              releaseNativeProduct(outcome);
            }
          }
          default:
            return send(503, {
              ok: false,
              code: 'unavailable',
              message: 'This action is unavailable in this build.',
            });
        }
      } catch (error) {
        if (response.destroyed) return;
        if (response.headersSent) {
          response.destroy();
          return;
        }
        const authority = error instanceof AuthorityError;
        const invalid =
          error instanceof z.ZodError ||
          error instanceof SyntaxError ||
          error instanceof HistoryCursorError;
        return writeJson(
          response,
          authority
            ? 403
            : invalid || error instanceof GameSaveError
              ? 400
              : error instanceof OverloadError
                ? 503
                : 500,
          {
            ok: false,
            code: authority
              ? error.code
              : error instanceof GameSaveError
                ? 'save'
                : invalid
                  ? 'invalid-input'
                  : 'server',
            message:
              authority ||
              error instanceof OverloadError ||
              error instanceof GameSaveError ||
              error instanceof HistoryCursorError
                ? error.message
                : invalid
                  ? 'Invalid input.'
                  : 'The request could not complete. Check its status before submitting it again.',
          },
        );
      } finally {
        if (writing) activeWrites--;
        requests--;
        retainedBodyBytes -= requestBytes;
      }
    });
    server.requestTimeout = 10_000;
    server.headersTimeout = 10_000;
    const stop = (deadlineMs = SHUTDOWN_DEADLINE_MS): Promise<ShutdownReport> => {
      shutdown ??= (async () => {
        stopping = true;
        const privateClosed = closePrivateStreams();
        void privateClosed.catch(() => undefined);
        clearInterval(clock);
        if (clockContinuation) clearImmediate(clockContinuation);
        decisions.macrofold.stop();
        const decisionsClosed = decisions.close();
        void decisionsClosed.catch(() => undefined);
        const problems: string[] = [];
        const until = performance.now() + deadlineMs;
        const stage = async (name: string, operation: () => Promise<unknown>) => {
          let timer: ReturnType<typeof setTimeout> | undefined;
          try {
            await Promise.race([
              operation(),
              new Promise((_, reject) => {
                timer = setTimeout(
                  () => reject(new Error('Shutdown deadline elapsed.')),
                  Math.max(1, until - performance.now()),
                );
              }),
            ]);
          } catch (error) {
            problems.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
          } finally {
            clearTimeout(timer);
          }
        };
        await stage('Player publication', () => views.close());
        await stage('Private publication', () => privateClosed);
        await stage('Admitted clock batch', () => activeTick ?? Promise.resolve());
        await stage('Connection cleanup', () => Promise.all(disconnects));
        await stage('Admitted requests', async () => {
          while (requests) await new Promise((resolve) => setTimeout(resolve, 20));
        });
        await stage('NPC decision admission', () => thinking ?? Promise.resolve());
        await stage('NPC decisions and maintenance', () => decisionsClosed);
        execution.close();
        await stage('Automatic checkpoints', () => autosaves.close());
        let saved = false;
        await stage('Native world save and stop', async () => {
          await current.close();
          saved = true;
        });
        await stage(
          'HTTP server',
          () =>
            new Promise<void>((resolve, reject) => {
              server.close((error) =>
                error && (error as NodeJS.ErrnoException).code !== 'ERR_SERVER_NOT_RUNNING'
                  ? reject(error)
                  : resolve(),
              );
              server.closeAllConnections();
            }),
        );
        if (!options.clientAssets)
          await stage('Client assets', () =>
            clientAssets.close({ timeoutMs: Math.max(1, until - performance.now()) }),
          );
        if (!options.store) await stage('Storage', () => store.close());
        if (!options.host) {
          const status = host.requestShutdown();
          if (status.phase !== 'Closed')
            problems.push('Native host still owns outstanding consumers or work.');
        }
        return {
          saved,
          durableRevision: current.durable.revision,
          durableSimTime: current.durable.simTime,
          problems,
        };
      })();
      return shutdown;
    };
    return {
      server,
      service: current,
      config,
      get director() {
        return decisions;
      },
      isWorldRunning: true as const,
      shutdown: stop,
      close: () => stop().then(() => undefined),
    };
  } catch (error) {
    director?.macrofold.stop();
    await director?.close().catch(() => undefined);
    cognitionExecution?.close();
    await player?.close().catch(() => undefined);
    await service?.close().catch(() => undefined);
    if (!options.clientAssets) await assets?.close().catch(() => undefined);
    if (!options.store) await store.close().catch(() => undefined);
    if (!options.host) host.requestShutdown();
    throw error;
  }
}
