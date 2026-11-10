import { createServer, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { NativeHost } from '@open-legend/native-simulation';
import { z } from 'zod';
import { AuthorityError, isCharacterless, scopeKey, type RequestScope } from './authority.js';
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
import { SHUTDOWN_DEADLINE_MS, type ShutdownReport } from './http.js';

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
  let player: NativePlayerHttp | undefined;
  let assets: ClientAssets | undefined;
  try {
    service = await NativeWorldService.open({ host, store, config, now });
    const current = service;
    player = new NativePlayerHttp(current, {
      executionSource: 'live-model',
      jevConfigured: !!(config.macrofoldKey || config.jevKey),
      llmConfigured: !!(config.macrofoldKey || config.llmKey),
    });
    const views = player;
    const assetIndex = await readAssetIndex();
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
    let requests = 0;
    let retainedBodyBytes = 0;
    let pendingStreams = 0;
    const disconnects = new Set<Promise<void>>();
    let shutdown: Promise<ShutdownReport> | undefined;
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
      let capability: 'play' | 'create' = 'play';
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
        if (request.method === 'GET' && url.pathname === '/api/state') {
          await views.state(scope, response);
          return;
        }
        if (request.method === 'GET' && url.pathname === '/api/events') {
          if (views.connections + pendingStreams >= current.connectionLimit)
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
        const generation = request.headers['x-ol-generation'];
        if (generation && generation !== current.generation && url.pathname !== '/api/saves/load')
          return send(409, {
            ok: false,
            code: 'stale-world',
            message: 'The world changed. Reload this tab.',
          });
        switch (url.pathname) {
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
            return send(result.ok ? 200 : 409, result);
          }
          case '/api/control':
            return send(200, await current.control(controlRequest.parse(body), scope));
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
            current.assertScope(scope, 'save');
            const value = z
              .object({ id: z.string().uuid(), label: z.string().trim().min(1).max(80) })
              .strict()
              .parse(body);
            await current.createSave(value.label, value.id, scope);
            return send(200, { ok: true, message: 'Game saved.' });
          }
          case '/api/saves/delete': {
            current.assertScope(scope, 'save');
            const value = z.object({ id: requestIdSchema }).strict().parse(body);
            await current.deleteSave(value.id, scope);
            return send(200, { ok: true, message: 'Save deleted.' });
          }
          case '/api/command': {
            const value = commandRequest.parse(body);
            return send(
              200,
              await current.command(value.commandId, value.command, value.commandEpoch, scope),
            );
          }
          case '/api/command/receipt': {
            const value = commandRequest.parse(body);
            return send(
              200,
              await current.commandReceipt(
                value.commandId,
                value.command,
                value.commandEpoch,
                scope,
              ),
            );
          }
          case '/api/god/forget-memory': {
            capability = 'create';
            current.assertScope(scope, capability);
            const value = z
              .object({ actorId: requestIdSchema, sourceId: requestIdSchema })
              .strict()
              .parse(body);
            const outcome = await current.forgetMemory(value.actorId, value.sourceId, scope);
            if (outcome.ok) await store.db.exec('DELETE FROM intelligence_calls');
            return send(200, outcome);
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
        const invalid = error instanceof z.ZodError || error instanceof SyntaxError;
        return writeJson(
          response,
          authority ? 403 : invalid ? 400 : error instanceof OverloadError ? 503 : 500,
          {
            ok: false,
            code: authority ? error.code : invalid ? 'invalid-input' : 'server',
            message:
              authority || error instanceof OverloadError
                ? error.message
                : invalid
                  ? 'Invalid input.'
                  : 'The request could not complete. Check its status before submitting it again.',
          },
        );
      } finally {
        requests--;
        retainedBodyBytes -= requestBytes;
      }
    });
    server.requestTimeout = 10_000;
    server.headersTimeout = 10_000;
    const stop = (deadlineMs = SHUTDOWN_DEADLINE_MS): Promise<ShutdownReport> => {
      shutdown ??= (async () => {
        stopping = true;
        current.closeAdmission();
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
        await stage('Connection cleanup', () => Promise.all(disconnects));
        await stage('Admitted requests', async () => {
          while (requests) await new Promise((resolve) => setTimeout(resolve, 20));
        });
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
      isWorldRunning: true as const,
      shutdown: stop,
      close: () => stop().then(() => undefined),
    };
  } catch (error) {
    await player?.close().catch(() => undefined);
    await service?.close().catch(() => undefined);
    if (!options.clientAssets) await assets?.close().catch(() => undefined);
    if (!options.store) await store.close().catch(() => undefined);
    if (!options.host) host.requestShutdown();
    throw error;
  }
}
