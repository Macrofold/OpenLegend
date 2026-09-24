import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { AiClient, FetchTransport } from '@open-legend/ai';
import type { IntelligenceCall } from '@open-legend/protocol';
import type { GameRepository } from './store.js';

function clean(value: unknown): unknown {
  const ancestors = new WeakSet<object>();
  const visit = (item: unknown, key = '', embeddingContext = false): unknown => {
    if (/authorization|api[_-]?key|secret|password|access[_-]?token|refresh[_-]?token/i.test(key))
      return '[redacted]';
    if (/signal|abort/i.test(key) || item instanceof AbortSignal || item instanceof AbortController)
      return undefined;
    if (typeof item === 'string') {
      // Provider bodies can themselves be encoded JSON; sanitize those before capture too.
      if (/^\s*[\[{]/.test(item)) {
        try {
          return visit(JSON.parse(item), key, embeddingContext);
        } catch {}
      }
      return item
        .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi, 'Bearer [redacted]')
        .replace(
          /((?:api[_-]?key|password|secret|access[_-]?token|refresh[_-]?token)\s*[=:]\s*)[^\s&,;]+/gi,
          '$1[redacted]',
        );
    }
    if (!item || typeof item !== 'object') return item ?? null;
    if (ancestors.has(item)) return '[circular]';
    if (ArrayBuffer.isView(item))
      return { dimensions: item.byteLength, unavailable: 'Binary capture omitted.' };
    if (
      Array.isArray(item) &&
      (/embedding|vectors?/i.test(key) ||
        ((embeddingContext || item.length > 32) && item.every((v) => typeof v === 'number')))
    )
      return { dimensions: item.length };
    embeddingContext ||= 'kind' in item && /embedding/i.test(String(item.kind));
    ancestors.add(item);
    const result = Array.isArray(item)
      ? item.map((value) => visit(value, '', embeddingContext))
      : Object.fromEntries(
          Object.entries(item)
            .map(([name, value]) => [name, visit(value, name, embeddingContext)])
            .filter(([, value]) => value !== undefined),
        );
    ancestors.delete(item);
    return result;
  };
  return visit(value);
}

/** Private diagnostic records, separate from simulation state and public projections. */
export class IntelligenceLog {
  private triggerContext = new AsyncLocalStorage<string>();
  withTrigger<T>(id: string, execute: () => Promise<T>): Promise<T> {
    return this.triggerContext.run(id, execute);
  }
  async record(
    id: string,
    kind: string,
    input: unknown,
    output?: unknown,
    startedAt = new Date().toISOString(),
  ): Promise<void> {
    const completedAt = new Date().toISOString();
    await this.save({
      id,
      parentId: this.triggerContext.getStore(),
      kind,
      startedAt,
      completedAt,
      timings: {
        application: {
          startedAt,
          completedAt,
          durationMs: Math.max(0, Date.parse(completedAt) - Date.parse(startedAt)),
        },
      },
      status: 'completed',
      input: clean(input),
      output: clean(output),
      exchanges: [],
    });
  }
  private context = new AsyncLocalStorage<IntelligenceCall>();
  constructor(private store: GameRepository) {}
  private lane: Promise<void> = Promise.resolve();
  private latest = new Map<string, IntelligenceCall>();
  private closed = false;
  /** Workflow updates use log-owned state; durable diagnostics are eventually consistent. */
  get(id: string): IntelligenceCall | undefined {
    const call = this.latest.get(id);
    return call ? structuredClone(call) : undefined;
  }
  async save(call: IntelligenceCall): Promise<void> {
    if (this.closed) return;
    try {
      const captured = clean(call) as IntelligenceCall;
      if (Buffer.byteLength(JSON.stringify(captured.input ?? null)) > 500000)
        captured.input = { unavailable: 'Diagnostic input exceeded capture limit.' };
      if (Buffer.byteLength(JSON.stringify(captured)) > 1000000) {
        captured.exchanges = [];
        if (Buffer.byteLength(JSON.stringify(captured)) > 1000000)
          captured.output = {
            unavailable: 'Capture limit exceeded; receipt remains in accounting.',
          };
      }
      this.latest.delete(captured.id);
      this.latest.set(captured.id, structuredClone(captured));
      // Preserve running workflow roots while bounding completed diagnostic lookup state.
      if (this.latest.size > 1000) {
        const completed = [...this.latest].find(([, value]) => value.status !== 'running');
        if (completed) this.latest.delete(completed[0]);
      }
      this.lane = this.lane.then(async () => {
        try {
          await this.store.putIntelligenceCall(captured);
        } catch {
          console.error('Could not persist intelligence diagnostics.');
        }
      });
    } catch {
      console.error('Could not capture intelligence diagnostics.');
    }
  }
  async flush(): Promise<void> {
    await this.lane;
  }
  async close(): Promise<void> {
    this.closed = true;
    await this.flush();
    this.latest.clear();
  }
  async run<T>(
    kind: string,
    input: unknown,
    execute: () => Promise<T>,
    metadata: Partial<
      Pick<
        IntelligenceCall,
        'id' | 'worldId' | 'actorId' | 'actorName' | 'trigger' | 'triggerType' | 'route'
      >
    > = {},
  ): Promise<T> {
    const call: IntelligenceCall = {
      ...metadata,
      id: metadata.id ?? randomUUID(),
      parentId: this.triggerContext.getStore(),
      kind,
      startedAt: new Date().toISOString(),
      status: 'running',
      input: clean(input),
      exchanges: [],
      timings: {},
    };
    if (Buffer.byteLength(JSON.stringify(call.input)) > 500000)
      call.input = { unavailable: 'Diagnostic input exceeded capture limit.' };
    await this.save(call);
    return this.context.run(call, async () => {
      try {
        const output = await execute();
        // Scores and source coverage explain retrieval; thousands of raw vector
        // coordinates only obscure the inspector and exhaust capture capacity.
        call.output = clean(
          kind === 'Embeddings' &&
            output &&
            typeof output === 'object' &&
            'value' in output &&
            Array.isArray(output.value)
            ? {
                ...output,
                value: { vectors: output.value.length, dimensions: output.value[0]?.length },
              }
            : output,
        );
        const outcome =
          output && typeof output === 'object' && 'outcome' in output
            ? String(output.outcome)
            : undefined;
        const rejected =
          output && typeof output === 'object' && 'ok' in output && output.ok === false;
        call.status = rejected || (outcome && outcome !== 'value') ? 'failed' : 'completed';
        call.disposition = rejected
          ? 'code' in output
            ? String(output.code)
            : 'failed'
          : (outcome ?? 'completed');
        return output;
      } catch (error) {
        call.status = 'failed';
        call.output = { error: error instanceof Error ? error.message : String(error) };
        throw error;
      } finally {
        call.completedAt = new Date().toISOString();
        call.timings!['application'] = {
          startedAt: call.startedAt,
          completedAt: call.completedAt,
          durationMs: Math.max(0, Date.parse(call.completedAt) - Date.parse(call.startedAt)),
        };
        await this.save(call);
      }
    });
  }
  wrap(client: AiClient): AiClient {
    return {
      judge: (request) => this.run('Jev', request, async () => await client.judge(request)),
      generate: (request) =>
        this.run(
          `LM · ${request.execution ?? 'default'} · ${request.task}`,
          request,
          async () => await client.generate(request),
        ),
    };
  }
  readonly fetch: FetchTransport = async (url, init) => {
    const call = this.context.getStore();
    if (!call) return await fetch(url, init);
    const path = new URL(url).pathname;
    const exchange: IntelligenceCall['exchanges'][number] = {
      path,
      method: init.method ?? 'GET',
      startedAt: new Date().toISOString(),
      input: typeof init.body === 'string' ? this.decode(init.body) : null,
    };
    call.exchanges.push(exchange);
    if (call.exchanges.length > 100) {
      const oldestPoll = call.exchanges.findIndex((item) => item.method === 'GET');
      call.exchanges.splice(oldestPoll >= 0 ? oldestPoll : 0, 1);
    }
    try {
      const response = await fetch(url, init);
      exchange.httpStatus = response.status;
      // Bound diagnostic capture while leaving the original provider response untouched.
      const reader = response.clone().body?.getReader();
      if (reader) {
        const chunks: Uint8Array[] = [];
        let size = 0;
        try {
          for (;;) {
            const chunk = await reader.read();
            if (chunk.done) break;
            const remaining = 1_000_000 - size;
            chunks.push(chunk.value.subarray(0, remaining));
            size += chunk.value.byteLength;
            if (size > 1_000_000) {
              exchange.truncated = true;
              break;
            }
          }
          exchange.output = this.decode(Buffer.concat(chunks).toString('utf8'));
        } catch {
          exchange.output = { error: 'Response capture interrupted.' };
        } finally {
          void reader.cancel().catch(() => undefined);
        }
      }
      return response;
    } catch (error) {
      exchange.output = { error: error instanceof Error ? error.message : String(error) };
      throw error;
    } finally {
      exchange.completedAt = new Date().toISOString();
      exchange.durationMs = Math.max(
        0,
        Date.parse(exchange.completedAt) - Date.parse(exchange.startedAt),
      );
    }
  };
  private decode(text: string): unknown {
    try {
      return clean(JSON.parse(text));
    } catch {
      return text;
    }
  }
}
