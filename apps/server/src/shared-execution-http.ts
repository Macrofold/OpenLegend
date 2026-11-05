import { createServer, type IncomingMessage } from 'node:http';
import { z } from 'zod';
import { SHARED_EXECUTION_CONTROL_BYTES } from '@open-legend/ai';
import { SharedExecution, ExecutionRefusal } from './shared-execution.js';

async function body(request: IncomingMessage, maxBytes = 524288): Promise<unknown> {
  let bytes = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    const b = Buffer.from(chunk);
    bytes += b.length;
    if (bytes > maxBytes) throw new ExecutionRefusal('Execution body exceeds its allowance.', 413);
    chunks.push(b);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}
/** Dedicated operational endpoint. No world data, provider secrets or administrative credentials are projected. */
export function createSharedExecutionServer(owner: SharedExecution) {
  const server = createServer(async (req, res) => {
    res.setHeader('content-type', 'application/json');
    res.setHeader('cache-control', 'no-store');
    try {
      const parts = (req.url ?? '').split('/').filter(Boolean);
      const token = req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : undefined;
      let result: unknown;
      if (req.method === 'GET' && parts[0] === 'configuration' && parts.length === 1) {
        owner.authorize(token);
        result = owner.configuration();
      } else if (req.method === 'POST' && parts[0] === 'tasks' && parts.length === 2) {
        owner.authorize(token);
        const input = z
          .object({ limitUsd: z.number().positive() })
          .strict()
          .parse(await body(req));
        await owner.fund(parts[1]!, input.limitUsd);
        result = { funded: true };
      } else if (req.method === 'POST' && parts[0] === 'campaigns' && parts.length === 1) {
        owner.authorize(token);
        result = await owner.admit(await body(req, SHARED_EXECUTION_CONTROL_BYTES));
      } else if (
        req.method === 'POST' &&
        parts[0] === 'campaigns' &&
        parts[2] === 'close' &&
        parts.length === 3
      ) {
        owner.authorize(token, { kind: 'campaign', id: parts[1]! });
        result = await owner.closeCampaign(parts[1]!);
      } else if (parts[0] === 'grants' && parts[1]) {
        const id = parts[1];
        owner.authorize(token, { kind: 'grant', id });
        if (req.method === 'GET' && parts.length === 2) result = await owner.inspect(id);
        else if (req.method === 'POST' && parts[2] === 'start' && parts.length === 3)
          result = await owner.startGrant(id, await body(req));
        else if (req.method === 'POST' && parts[2] === 'execute' && parts.length === 3)
          result = await owner.execute(id, await body(req));
        else if (req.method === 'POST' && parts[2] === 'close' && parts.length === 3)
          result = await owner.closeGrant(id);
        else if (req.method === 'GET' && parts[2] === 'attempts' && parts.length === 4)
          result = await owner.observe(id, parts[3]!);
        else if (
          req.method === 'POST' &&
          parts[2] === 'attempts' &&
          parts[4] === 'cancel' &&
          parts.length === 5
        )
          result = await owner.cancelAttempt(id, parts[3]!);
        else throw new ExecutionRefusal('Unknown execution operation.', 404);
      } else throw new ExecutionRefusal('Unknown execution operation.', 404);
      res.end(JSON.stringify(result));
    } catch (error) {
      res.statusCode =
        error instanceof ExecutionRefusal
          ? error.status
          : error instanceof z.ZodError || error instanceof SyntaxError
            ? 400
            : 503;
      // Operational errors contain neither request content nor provider responses.
      res.end(
        JSON.stringify({
          error: res.statusCode === 503 ? 'execution_observation_required' : 'execution_refused',
        }),
      );
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 5000;
  server.maxConnections = 256;
  return server;
}
