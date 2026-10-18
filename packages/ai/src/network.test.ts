import { describe, expect, it, vi } from 'vitest';
import { createNetworkOwner } from '@open-legend/network';
import { createEmbeddingClient } from './embedding.js';
import { MacrofoldTransport } from './macrofold.js';

describe('actual AI caller bounded network journeys (injected transport only)', () => {
  it('clips embedding observation to its earlier absolute deadline even when fetch ignores abort', async () => {
    let resolveResponse: (response: Response) => void = () => {};
    const fetcher = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve;
        }),
    );
    const network = createNetworkOwner({ role: 'fixture-embedding', capacity: 1, fetch: fetcher });
    const client = createEmbeddingClient({
      apiKey: 'fixture-only',
      model: 'fixture-model',
      dimensions: 64,
      timeoutMs: 1_000,
      network,
    });
    const result = await client.embed({
      requestId: 'fixture-embedding',
      texts: ['A supplied synthetic sentence.'],
      deadlineMs: Date.now() + 20,
    });
    expect(result).toMatchObject({
      outcome: 'uncertain',
      receipt: { dispatched: true, completionUncertain: true },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(network.snapshot().occupied).toBe(1);
    let cancellations = 0;
    resolveResponse(
      new Response(
        new ReadableStream({
          cancel() {
            cancellations++;
          },
        }),
      ),
    );
    for (let index = 0; index < 15; index++) await Promise.resolve();
    expect(cancellations).toBe(1);
    expect(network.snapshot().occupied).toBe(0);
  });

  it('preserves a known embedding refusal when diagnostic reading stalls', async () => {
    const client = createEmbeddingClient({
      apiKey: 'fixture-only',
      model: 'fixture-model',
      dimensions: 64,
      timeoutMs: 20,
      fetch: async () => new Response(new ReadableStream(), { status: 429 }),
    });
    const result = await client.embed({
      requestId: 'fixture-embedding-refusal',
      texts: ['Supplied synthetic evidence.'],
    });
    expect(result).toMatchObject({
      outcome: 'unavailable',
      receipt: { httpStatus: 429, completionUncertain: false },
    });
  });

  it.each(['complete', 'stalled'] as const)(
    'retains embedding uncertainty after HTTP 408 with a %s error body',
    async (body) => {
      const fetch = vi.fn(
        async () =>
          new Response(body === 'complete' ? 'Request timeout.' : new ReadableStream(), {
            status: 408,
          }),
      );
      const client = createEmbeddingClient({
        apiKey: 'fixture-only',
        model: 'fixture-model',
        dimensions: 64,
        timeoutMs: 20,
        fetch,
      });
      const result = await client.embed({
        requestId: `fixture-embedding-timeout-${body}`,
        texts: ['Supplied synthetic evidence.'],
      });
      expect(result).toMatchObject({
        outcome: 'uncertain',
        receipt: { httpStatus: 408, dispatched: true, completionUncertain: true },
      });
      expect(result.receipt.usage).toBeUndefined();
      expect(result.receipt.estimatedCostUsd).toBeUndefined();
      expect(fetch).toHaveBeenCalledOnce();
    },
  );

  it('keeps workspace file preparation inside the existing long-operation budget', async () => {
    const fetcher = vi.fn(() => new Promise<Response>(() => {}));
    const network = createNetworkOwner({ role: 'fixture-file', capacity: 1, fetch: fetcher });
    const api = new MacrofoldTransport(
      'https://fixture.invalid',
      'fixture-only',
      undefined,
      network,
    );
    await expect(
      api.run({ timeoutMs: 20 }, (operation) =>
        api.file('worktree', 'mind/evidence.md', 'GET', { signal: operation.signal }),
      ),
    ).rejects.toMatchObject({ kind: 'deadline_exceeded' });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(network.snapshot().occupied).toBe(1);
    await expect(api.run({ timeoutMs: 20 }, async () => {})).rejects.toMatchObject({
      kind: 'capacity_unavailable',
    });
  });

  it('retains private diagnostic omission through the inherited operation context', async () => {
    const observe = vi.fn();
    const network = createNetworkOwner({
      role: 'fixture-private',
      capacity: 1,
      fetch: async () => Response.json({ run_id: 'same-run' }),
      onExchange: observe,
    });
    const publicApi = new MacrofoldTransport(
      'https://fixture.invalid',
      'fixture-only',
      undefined,
      network,
    );
    const privateApi = new MacrofoldTransport(
      'https://fixture.invalid',
      'fixture-only',
      undefined,
      network,
      false,
    );
    await publicApi.run({ timeoutMs: 100 }, () => privateApi.request('/v1/runs/same-run'));
    expect(observe).not.toHaveBeenCalled();
    await publicApi.run({ timeoutMs: 100 }, () => publicApi.request('/v1/runs/same-run'));
    expect(observe).toHaveBeenCalledTimes(1);
    expect(observe.mock.calls[0]?.[0]).toMatchObject({ streaming: false, status: 200 });
    expect(new TextDecoder().decode(observe.mock.calls[0]?.[0].bytes)).toContain('same-run');
  });
});
