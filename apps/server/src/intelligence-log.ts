import { createNetworkOwner, type NetworkExchangeObserver } from '@open-legend/network';
import { normalizeReceiptCost } from '@open-legend/ai';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { AiClient, GenerateRequest } from '@open-legend/ai';
import type { IntelligenceCall } from '@open-legend/protocol';
import type { GameRepository } from './store.js';
import { recordBackgroundFailure } from './performance.js';
import {
  captureDiagnosticValue,
  prepareDiagnosticRecord,
  diagnosticValueBytes,
  DiagnosticRetention,
  DIAGNOSTIC_LIMITS,
  type PreparedDiagnosticRecord,
} from './diagnostic-capture.js';

interface ActiveCapture {
  call?: IntelligenceCall;
  exchangeBytes: number;
  exchangeSizes: number[];
  release: () => void;
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
      input,
      output,
      exchanges: [],
    });
  }
  private context = new AsyncLocalStorage<ActiveCapture | undefined>();
  private captures = new Set<ActiveCapture>();
  readonly network = createNetworkOwner({
    role: 'server-ai',
    capacity: 32,
    onExchange: Object.assign(
      (exchange: Parameters<NetworkExchangeObserver>[0]) => this.observeExchange(exchange),
      {
        captureContent: () => {
          const active = this.context.getStore();
          return !!active?.call && !this.closed;
        },
      },
    ),
  });
  constructor(private store: GameRepository) {}
  private pending = new Map<string, PreparedDiagnosticRecord>();
  private retention = new DiagnosticRetention();
  private draining?: Promise<void>;
  private drainTimer?: ReturnType<typeof setTimeout>;
  private latest = new Map<string, PreparedDiagnosticRecord>();
  private closed = false;
  private omitted = { content: 0, records: 0, captures: 0 };
  private omitContent = () => {
    this.omitted.content++;
  };
  /** Workflow updates receive an owned copy; encoded snapshots are shared internally. */
  get(id: string): IntelligenceCall | undefined {
    const record = this.latest.get(id);
    return record ? (JSON.parse(record.json) as IntelligenceCall) : undefined;
  }
  captureSnapshot() {
    return {
      ...this.retention.snapshot(),
      pending: this.pending.size,
      recent: this.latest.size,
      omitted: { ...this.omitted },
    };
  }
  private remove(map: Map<string, PreparedDiagnosticRecord>, id: string): void {
    const prior = map.get(id);
    if (!prior) return;
    map.delete(id);
    this.retention.release(prior);
  }
  private makeRoom(bytes: number): boolean {
    while (!this.retention.canRetain(bytes)) {
      // Recently completed or running snapshots are optional. SQL batches and
      // active capture reservations remain pinned until their actual owners finish.
      let candidate = this.pending.values().next().value;
      if (!candidate)
        for (const record of this.latest.values()) {
          if (this.retention.referenceCount(record) !== 1) continue;
          candidate = record;
          break;
        }
      if (!candidate) return false;
      if (this.latest.get(candidate.id) === candidate) this.remove(this.latest, candidate.id);
      if (this.pending.get(candidate.id) === candidate) this.remove(this.pending, candidate.id);
      this.omitted.records++;
    }
    return true;
  }
  async save(call: IntelligenceCall): Promise<void> {
    if (this.closed) return;
    try {
      if (!this.makeRoom(DIAGNOSTIC_LIMITS.recordBytes)) {
        this.omitted.records++;
        return;
      }
      const captured = prepareDiagnosticRecord(call, this.omitContent);
      if (!captured) {
        this.omitted.records++;
        return;
      }
      this.remove(this.latest, captured.id);
      this.remove(this.pending, captured.id);
      if (!this.makeRoom(captured.bytes)) {
        this.omitted.records++;
        return;
      }
      this.latest.set(captured.id, captured);
      this.retention.retain(captured);
      this.pending.set(captured.id, captured);
      this.retention.retain(captured);
      this.startDrain();
    } catch {
      this.omitted.records++;
      console.error('Could not capture intelligence diagnostics.');
    }
  }
  private startDrain(): void {
    if (this.draining || this.drainTimer || !this.pending.size || this.closed) return;
    // Inspector snapshots may lag 100 ms; gameplay/accounting never use this queue.
    // Batch distinct calls as well as superseded versions of one call to avoid an fsync per update.
    // docs/limits/observability.md#diagnostic-write-backlog
    this.drainTimer = setTimeout(() => {
      this.drainTimer = undefined;
      void this.drain();
    }, 100);
  }
  private drain(): Promise<void> {
    if (this.draining) return this.draining;
    this.draining = (async () => {
      const batch: PreparedDiagnosticRecord[] = [];
      for (const [id, entry] of this.pending) {
        this.pending.delete(id);
        // Transfer the existing reference from the pending queue to this SQL batch.
        batch.push(entry);
        if (batch.length >= 64) break;
      }
      try {
        await this.store.putIntelligenceCalls(batch);
      } catch (error: unknown) {
        recordBackgroundFailure('intelligence-write', error, { attemptedCalls: batch.length });
      } finally {
        for (const record of batch) this.retention.release(record);
      }
    })().finally(() => {
      this.draining = undefined;
      this.startDrain();
    });
    return this.draining;
  }
  async flush(): Promise<void> {
    do {
      clearTimeout(this.drainTimer);
      this.drainTimer = undefined;
      if (this.draining) await this.draining;
      else if (this.pending.size) await this.drain();
    } while (this.draining || this.pending.size || this.drainTimer);
  }
  async close(): Promise<void> {
    this.closed = true;
    for (const capture of this.captures) this.retireCapture(capture);
    await this.flush();
    for (const id of this.latest.keys()) this.remove(this.latest, id);
  }
  private retireCapture(capture: ActiveCapture): void {
    if (!this.captures.delete(capture)) return;
    // Abandoned network callbacks inherit this context after local completion.
    // Drop content as well as admission so they cannot extend its lifetime.
    capture.call = undefined;
    capture.exchangeBytes = 0;
    capture.exchangeSizes.length = 0;
    capture.release();
  }
  async run<T>(
    kind: string,
    input: unknown,
    execute: () => Promise<T>,
    metadata: Partial<
      Pick<
        IntelligenceCall,
        | 'id'
        | 'worldId'
        | 'actorId'
        | 'actorName'
        | 'trigger'
        | 'triggerType'
        | 'route'
        | 'ownerAccountId'
      >
    > = {},
  ): Promise<T> {
    const reservationBytes = DIAGNOSTIC_LIMITS.recordBytes * 3;
    const release =
      !this.closed && this.makeRoom(reservationBytes)
        ? this.retention.reserveCapture(reservationBytes)
        : undefined;
    if (!release) {
      this.omitted.captures++;
      return this.context.run(undefined, execute);
    }
    const prepared = prepareDiagnosticRecord(
      {
        ...metadata,
        id: metadata.id ?? randomUUID(),
        parentId: this.triggerContext.getStore(),
        kind,
        startedAt: new Date().toISOString(),
        status: 'running',
        input,
        exchanges: [],
        timings: {},
      },
      this.omitContent,
    );
    if (!prepared) {
      release();
      this.omitted.captures++;
      return this.context.run(undefined, execute);
    }
    const capture: ActiveCapture = {
      call: { ...prepared.value, exchanges: [], timings: {} },
      exchangeBytes: 0,
      exchangeSizes: [],
      release,
    };
    this.captures.add(capture);
    await this.save(capture.call!);
    return this.context.run(capture, async () => {
      try {
        const output = await execute();
        const call = capture.call;
        if (!call) return output;
        // Scores and source coverage explain retrieval; thousands of raw vector
        // coordinates only obscure the inspector and exhaust capture capacity.
        call.output = captureDiagnosticValue(
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
          DIAGNOSTIC_LIMITS.recordBytes,
          this.omitContent,
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
        const call = capture.call;
        if (!call) throw error;
        call.status = 'failed';
        call.output = captureDiagnosticValue(
          { error: error instanceof Error ? error.message : String(error) },
          DIAGNOSTIC_LIMITS.recordBytes,
          this.omitContent,
        );
        throw error;
      } finally {
        try {
          const call = capture.call;
          if (call) {
            call.completedAt = new Date().toISOString();
            call.timings!['application'] = {
              startedAt: call.startedAt,
              completedAt: call.completedAt,
              durationMs: Math.max(0, Date.parse(call.completedAt) - Date.parse(call.startedAt)),
            };
            await this.save(call);
          }
        } finally {
          this.retireCapture(capture);
        }
      }
    });
  }
  wrap(client: AiClient): AiClient {
    return {
      judge: (request) =>
        this.run('Jev', request, async () => {
          const result = await client.judge(request);
          result.receipt = normalizeReceiptCost(result.receipt);
          return result;
        }),
      generate: <T>(request: GenerateRequest) =>
        this.run(`LM · ${request.execution ?? 'default'} · ${request.task}`, request, async () => {
          const result = await client.generate<T>(request);
          result.receipt = normalizeReceiptCost(result.receipt);
          return result;
        }),
    };
  }
  private readonly observeExchange: NetworkExchangeObserver = (observed) => {
    const active = this.context.getStore();
    const call = active?.call;
    if (!call || this.closed) return;
    const exchange: IntelligenceCall['exchanges'][number] = {
      path: new URL(observed.url).pathname,
      method: observed.method,
      startedAt: new Date(observed.startedAt).toISOString(),
      input: observed.requestBody === undefined ? null : this.decode(observed.requestBody),
      httpStatus: observed.status,
      completedAt: new Date(observed.completedAt).toISOString(),
      durationMs: Math.max(0, observed.completedAt - observed.startedAt),
      truncated: observed.truncated || undefined,
      output: observed.streaming
        ? { unavailable: 'Streaming body omitted; final result is recorded.' }
        : observed.bytes
          ? this.decode(new TextDecoder().decode(observed.bytes))
          : { unavailable: observed.error?.kind ?? 'Response body unavailable.' },
    };
    const captured = captureDiagnosticValue(
      exchange,
      DIAGNOSTIC_LIMITS.recordBytes,
      this.omitContent,
    );
    if (!captured || typeof captured !== 'object' || !('path' in captured)) return;
    const bytes = diagnosticValueBytes(captured);
    while (
      call.exchanges.length &&
      (call.exchanges.length >= 100 || active.exchangeBytes + bytes > DIAGNOSTIC_LIMITS.recordBytes)
    ) {
      const poll = call.exchanges.findIndex((item) => item.method === 'GET');
      const index = poll >= 0 ? poll : 0;
      call.exchanges.splice(index, 1);
      active.exchangeBytes -= active.exchangeSizes.splice(index, 1)[0]!;
      this.omitContent();
    }
    active.exchangeBytes += bytes;
    active.exchangeSizes.push(bytes);
    call.exchanges.push(captured as IntelligenceCall['exchanges'][number]);
  };
  private decode(text: string): unknown {
    return captureDiagnosticValue(text, DIAGNOSTIC_LIMITS.recordBytes, this.omitContent);
  }
}
