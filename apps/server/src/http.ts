import { traceHistory, traceDetails } from './cognition-inspection.js';
import { admitCognitionPolicy } from '@open-legend/domain';
import { inspectGodMind } from './god-mind.js';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { z } from 'zod';
import type { AiClient } from '@open-legend/ai';
import { AiDirector } from './ai-director.js';
import { readConfig, type AppConfig } from './config.js';
import { PostgresDatabase } from './postgres.js';
import { SqliteStore } from './store.js';
import { WorldService, commandInputSchema, requestIdSchema } from './world-service.js';
import { projectView } from './view.js';
import { actionCatalogue } from './action-catalogue.js';

const clientId = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
const sequence = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const command = z.object({ commandId: requestIdSchema, command: commandInputSchema }).strict();
const interaction = z
  .object({
    requestId: requestIdSchema,
    text: z.string().trim().min(1).max(1000),
    npcId: z.literal('ada').optional(),
  })
  .strict();
const worldAgentMessage = z
  .object({
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
    position: z.object({ x: z.number().finite(), z: z.number().finite() }).strict().optional(),
  })
  .strict();
const preferences = z
  .object({
    showUnavailableActions: z.boolean().optional(),
    pauseWhenHidden: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Choose a preference to update.');

async function jsonBody(request: IncomingMessage): Promise<unknown> {
  let bytes = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string);
    bytes += buffer.length;
    if (bytes > 16_384) throw new Error('body-limit');
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}

function send(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(value));
}

/** Local personal-world host. A public/shared-world deployment requires real user authorization. */
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
  const director = new AiDirector(service, options.aiClient, options.now);
  const session = randomBytes(32).toString('hex');
  const streams = new Set<ServerResponse>();
  let publishTimer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  const publish = () => {
    if (publishTimer || disposed) return;
    publishTimer = setTimeout(() => {
      publishTimer = undefined;
      if (!streams.size) return;
      const message = `event: state\ndata: ${JSON.stringify(projectView(service, director.executionSource))}\n\n`;
      for (const stream of streams)
        if (!stream.write(message)) {
          streams.delete(stream);
          stream.end();
        }
    }, 100);
  };
  const unsubscribe = service.subscribe(publish);
  const authenticated = (request: IncomingMessage) => {
    const cookie = /(?:^|;\s*)ol_session=([a-f0-9]{64})(?:;|$)/.exec(
      request.headers.cookie ?? '',
    )?.[1];
    return !!cookie && timingSafeEqual(Buffer.from(cookie), Buffer.from(session));
  };
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
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'same-origin');
    response.setHeader('X-Frame-Options', 'DENY');
    const address = server.address();
    const port = address && typeof address !== 'string' ? address.port : config.port;
    const allowedHosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
    if (!allowedHosts.has(request.headers.host ?? ''))
      return send(response, 403, {
        ok: false,
        code: 'host',
        message: 'This is a local personal-world server.',
      });
    let url: URL;
    try {
      url = new URL(request.url ?? '/', `http://${request.headers.host}`);
    } catch {
      return send(response, 400, { ok: false, code: 'url', message: 'Invalid URL.' });
    }
    if (url.pathname.startsWith('/api/')) {
      const origin = request.headers.origin;
      const ownOrigin = `http://${request.headers.host}`;
      if (request.headers['sec-fetch-site'] === 'cross-site' || (origin && origin !== ownOrigin))
        return send(response, 403, {
          ok: false,
          code: 'origin',
          message: 'Use the game in its own local browser tab.',
        });
      try {
        if (request.method === 'GET' && url.pathname === '/api/state') {
          response.setHeader(
            'Set-Cookie',
            `ol_session=${session}; HttpOnly; SameSite=Strict; Path=/`,
          );
          return send(response, 200, projectView(service, director.executionSource));
        }
        if (!authenticated(request))
          return send(response, 401, {
            ok: false,
            code: 'session',
            message: 'Reload the game to establish a local session.',
          });
        if (request.method === 'GET' && url.pathname === '/api/events') {
          if (streams.size >= 8)
            return send(response, 429, {
              ok: false,
              code: 'connections',
              message: 'Too many open game tabs.',
            });
          const connectionId = randomBytes(16).toString('hex');
          service.setConnection(connectionId, true);
          response.on('close', () => {
            streams.delete(response);
            if (!disposed) service.setConnection(connectionId, false);
          });
          response.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-store',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
          });
          response.write(
            `event: state\ndata: ${JSON.stringify(projectView(service, director.executionSource))}\n\n`,
          );
          streams.add(response);
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
        switch (url.pathname) {
          case '/api/actions': {
            const context = actionContext.parse(body);
            return send(response, 200, { ok: true, catalogue: actionCatalogue(service, context) });
          }
          case '/api/profile/preferences':
            return send(response, 200, {
              ok: true,
              profile: service.setPreferences(preferences.parse(body)),
            });
          case '/api/command': {
            const value = command.parse(body);
            return send(response, 200, service.command(value.commandId, value.command));
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
              service.correctMemory(value.actorId, value.sourceId, value.correctionEventId),
            );
          }
          case '/api/god/forget-memory': {
            if (!config.godMode)
              return send(response, 403, { ok: false, message: 'God access required.' });
            const value = z
              .object({ actorId: requestIdSchema, sourceId: requestIdSchema })
              .strict()
              .parse(body);
            const result = service.forgetMemory(value.actorId, value.sourceId);
            if (result.ok) store.db.exec('DELETE FROM intelligence_calls');
            return send(response, 200, result);
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
              service.transition((world) =>
                admitCognitionPolicy(world, value.policy, value.expectedRevision),
              ),
            );
          }
          case '/api/god/triggers': {
            if (!config.godMode)
              return send(response, 403, { ok: false, message: 'God access required.' });
            const filter = z
              .object({
                offset: z.number().int().min(0).max(1000).default(0),
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
              ...traceHistory(store, filter),
            });
          }
          case '/api/god/trigger': {
            if (!config.godMode)
              return send(response, 403, { ok: false, message: 'God access required.' });
            const { id } = z.object({ id: requestIdSchema }).strict().parse(body);
            const details = traceDetails(store, id);
            return send(response, details ? 200 : 404, { ok: !!details, details });
          }
          case '/api/god/intelligence-details': {
            if (!config.godMode)
              return send(response, 403, {
                ok: false,
                message: 'God inspection is disabled by the host.',
              });
            const { id } = z.object({ id: z.string().uuid() }).strict().parse(body);
            return send(response, 200, {
              ok: true,
              details: await director.macrofold.inspectCall(id),
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
              calls: store.intelligenceCalls(offset).map((call) => {
                const input = call.input as { requestId?: string; actorScope?: string };
                const requestId = input?.requestId;
                const job = requestId
                  ? store.getJob(requestId.slice(0, requestId.lastIndexOf(':')))
                  : undefined;
                const worldAgent = call.kind.includes('world agent');
                const actorId =
                  input?.actorScope ??
                  (job
                    ? job.kind === 'invention'
                      ? 'player'
                      : (job.request.npcId ?? 'ada')
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
              }),
            });
          }
          case '/api/god/mind': {
            if (!config.godMode)
              return send(response, 403, {
                ok: false,
                message: 'God inspection is disabled by the host.',
              });
            const { actorId } = z.object({ actorId: requestIdSchema }).strict().parse(body);
            return send(response, 200, { ok: true, mind: inspectGodMind(service, actorId) });
          }
          case '/api/control':
            return send(response, 200, service.control(controls.parse(body)));
          case '/api/presence': {
            const value = presence.parse(body);
            service.setPresence(value.clientId, value.visible, value.sequence);
            return send(response, 200, {
              ok: true,
              code: 'presence',
              message: value.visible ? 'Present.' : 'Away.',
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
            const result = await director.macrofold.message(value);
            return send(response, result.ok ? 200 : 409, result);
          }
          case '/api/world-agent/close': {
            const value = z
              .object({ conversationId: requestIdSchema, worldId: requestIdSchema })
              .strict()
              .parse(body);
            if (value.worldId !== service.world.id)
              return send(response, 409, { ok: false, message: 'World mismatch.' });
            await director.macrofold.closeConversation(value.conversationId);
            return send(response, 200, {
              ok: true,
              message: 'Conversation ended; compute shutdown requested.',
            });
          }
          case '/api/ai/cancel': {
            const value = z.object({ jobId: requestIdSchema }).strict().parse(body);
            return send(response, 200, director.cancel(value.jobId));
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
              ),
            );
          }
          default:
            return send(response, 404, { ok: false, code: 'route', message: 'Unknown API route.' });
        }
      } catch (error) {
        const invalid =
          error instanceof z.ZodError ||
          error instanceof SyntaxError ||
          (error instanceof Error && error.message === 'body-limit');
        return send(response, invalid ? 400 : 500, {
          ok: false,
          code: invalid ? 'invalid-input' : 'server',
          message: invalid
            ? 'The request does not match the supported bounded input.'
            : 'The request failed. No automatic retry was submitted.',
        });
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
  let previous = performance.now();
  const interval =
    options.tick === false
      ? undefined
      : setInterval(() => {
          const current = performance.now();
          service.tick((current - previous) / 1000);
          previous = current;
          director.considerThought();
        }, 250);

  return {
    server,
    service,
    director,
    async close() {
      if (disposed) return;
      disposed = true;
      if (interval) clearInterval(interval);
      if (publishTimer) clearTimeout(publishTimer);
      unsubscribe();
      director.macrofold.stop();
      await director.close();
      for (const stream of streams) stream.end();
      streams.clear();
      await new Promise<void>((resolveClose, reject) =>
        server.close((error) => (error ? reject(error) : resolveClose())),
      );
      await vite?.close();
      store.close();
    },
  };
}
