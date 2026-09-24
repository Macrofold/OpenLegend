import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { WORLD_AUTHORING_TOOLS } from './world-authoring-contracts.js';
import type { WorldAuthoringService } from './world-authoring.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { McpServer, createMcpHandler } from '@modelcontextprotocol/server';
import { toNodeHandler } from '@modelcontextprotocol/node';
import type { McpReadConfig } from './mcp-config.js';
import { WORLD_READ_TOOLS, type WorldToolService } from './world-tools.js';

const MAX_BODY = 128 * 1024,
  MAX_INFLIGHT = 8,
  READ_TIMEOUT_MS = 10_000;
function fail(response: ServerResponse, status: number, message: string) {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    Connection: 'close',
    ...(status === 401 ? { 'WWW-Authenticate': 'Bearer' } : {}),
    ...(status === 405 ? { Allow: 'POST' } : {}),
  });
  response.end(JSON.stringify({ error: message }));
}
async function body(request: IncomingMessage): Promise<unknown> {
  const timer = setTimeout(
    () => request.destroy(new Error('MCP request timed out.')),
    READ_TIMEOUT_MS,
  );
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    for await (const part of request) {
      const chunk = Buffer.isBuffer(part) ? part : Buffer.from(part as string);
      size += chunk.length;
      if (size > MAX_BODY) throw new Error('MCP body limit exceeded.');
      chunks.push(chunk);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } finally {
    clearTimeout(timer);
  }
}

/** Stateless transport over shared services. Connector identity is not a session grant;
 * every write also checks a short-lived, application-issued context and exact review.
 * docs/world-agent-runtime.md#durable-write-sessions
 */
export function createWorldMcp(
  tools: WorldToolService,
  config: McpReadConfig | null,
  current: () => { worldId: string; loading: boolean },
  authoring?: WorldAuthoringService,
) {
  if (!config)
    return {
      handle: async (_request: IncomingMessage, response: ServerResponse) =>
        fail(response, 404, 'MCP is disabled.'),
      close: async () => {},
    };
  let inflight = 0,
    closed = false;
  const drains = new Set<() => void>();
  // A world-bound service credential is not an NPC identity or permission to approve a change.
  const validScope = () =>
    !!config &&
    Date.now() < config.expiresAt &&
    current().worldId === config.worldId &&
    !current().loading &&
    !closed;
  const entry = createMcpHandler(
    () => {
      const server = new McpServer({ name: 'openlegend-world-agent', version: '1.1.0' });
      for (const [name, tool] of Object.entries(WORLD_READ_TOOLS)) {
        server.registerTool(
          name,
          {
            description: tool.description,
            inputSchema: tool.schema,
            annotations: {
              readOnlyHint: true,
              destructiveHint: false,
              idempotentHint: true,
              openWorldHint: false,
            },
          },
          async (args: unknown) => {
            let result = validScope()
              ? tools.execute(name, args, {
                  worldId: config!.worldId,
                  principal: 'configured-mcp-world-reader',
                })
              : {
                  status: 'forbidden',
                  message: 'World read grant expired, changed, or is unavailable.',
                  cost: 'no-paid-work',
                };
            const reply = () => ({
              isError: result.status !== 'ok',
              structuredContent: { ...result },
              content: [{ type: 'text' as const, text: JSON.stringify(result) }],
            });
            if (Buffer.byteLength(JSON.stringify(reply())) > 160 * 1024)
              result = {
                status: 'capacity',
                message: 'MCP result exceeds its wire envelope; select a smaller page.',
                cost: 'no-paid-work',
              };
            return reply();
          },
        );
      }
      if (config.allowWrites && authoring)
        for (const [name, tool] of Object.entries(WORLD_AUTHORING_TOOLS)) {
          server.registerTool(
            name,
            {
              description: tool.description,
              inputSchema: tool.schema.extend({ contextHandle: z.string().min(32).max(256) }),
              annotations: {
                readOnlyHint: [
                  'ol_session',
                  'ol_draft_read',
                  'ol_compare',
                  'ol_validate',
                  'ol_approval_request',
                ].includes(name),
                destructiveHint: name === 'ol_change_apply',
                idempotentHint: true,
                openWorldHint: false,
              },
            },
            async (raw: unknown) => {
              const { contextHandle, ...args } = raw as {
                contextHandle: string;
                [key: string]: unknown;
              };
              let result = validScope()
                ? await authoring.execute(name, args, contextHandle)
                : {
                    status: 'forbidden',
                    message: 'World grant is unavailable.',
                    cost: 'no-paid-work',
                  };
              const reply = () => ({
                isError: ['invalid', 'forbidden', 'unavailable', 'capacity'].includes(
                  result.status,
                ),
                structuredContent: { ...result },
                content: [{ type: 'text' as const, text: JSON.stringify(result) }],
              });
              if (Buffer.byteLength(JSON.stringify(reply())) > 256 * 1024)
                result = {
                  status: 'capacity',
                  message:
                    'Result is too large. Read the exact record in a smaller operation; a prior write may already be committed.',
                  cost: 'no-paid-work',
                };
              return reply();
            },
          );
        }
      return server;
    },
    { legacy: 'stateless', responseMode: 'json', maxSubscriptions: 0 },
  );
  const node = toNodeHandler(entry);
  return {
    async handle(request: IncomingMessage, response: ServerResponse) {
      if (!config || closed) return fail(response, 404, 'MCP is disabled.');
      // Public exposure is limited to this route; existing browser routes retain localhost checks.
      if (
        !config.allowedHosts.includes((request.headers.host ?? '').toLowerCase()) ||
        request.headers.origin !== undefined
      )
        return fail(
          response,
          403,
          'Host or Origin is not allowed for this server-to-server connector.',
        );
      const bearer = /^Bearer ([^\s]{32,512})$/.exec(request.headers.authorization ?? '')?.[1];
      if (
        !bearer ||
        !timingSafeEqual(
          createHash('sha256').update(bearer).digest(),
          Buffer.from(config.tokenSha256, 'hex'),
        )
      )
        return fail(response, 401, 'Invalid connector credential.');
      if (!validScope())
        return fail(response, 403, 'World read grant expired, changed, or is unavailable.');
      if (request.url !== '/mcp') return fail(response, 400, 'MCP does not accept URL arguments.');
      if (request.method !== 'POST') return fail(response, 405, 'Use MCP POST requests.');
      if (
        request.headers['content-encoding'] ||
        !/^application\/json(?:\s*;|$)/i.test(request.headers['content-type'] ?? '')
      )
        return fail(response, 415, 'Use uncompressed application/json.');
      const length = Number(request.headers['content-length'] ?? 0);
      if (!Number.isSafeInteger(length) || length < 0 || length > MAX_BODY)
        return fail(response, 413, 'MCP body limit exceeded.');
      if (inflight >= MAX_INFLIGHT) return fail(response, 429, 'Too many concurrent MCP requests.');
      inflight++;
      try {
        const parsed = await body(request);
        if (!validScope()) return fail(response, 403, 'World read grant is unavailable.');
        // SDK supports bounded parsed input; we do not rely on an unbounded adapter body reader.
        await node(request, response, parsed);
      } catch {
        if (!response.headersSent && !response.destroyed)
          fail(response, 400, 'Invalid or incomplete MCP request.');
        else if (!response.writableEnded) response.end();
      } finally {
        inflight--;
        if (!inflight) {
          for (const resolve of drains) resolve();
          drains.clear();
        }
      }
    },
    async close() {
      closed = true;
      await entry.close();
      if (inflight) await new Promise<void>((resolve) => drains.add(resolve));
    },
  };
}
