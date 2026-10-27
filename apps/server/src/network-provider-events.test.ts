import { describe, expect, it, vi } from 'vitest';
import { createNetworkOwner } from '@open-legend/network';
import { consumeProviderStream } from './world-agent-events.js';

describe('private Run event caller with native Web Streams and injected fetch', () => {
  it('retains exact identity and terminal delivery without waiting for uncooperative cancellation', async () => {
    let finishCleanup: () => void = () => {};
    const cleanup = new Promise<void>((resolve) => {
      finishCleanup = resolve;
    });
    const raw = {
      schema_version: 1,
      run_id: 'run-fixture',
      sequence: '7',
      type: 'run.succeeded',
      data: {},
    };
    const text = `id: 7\nevent: run.succeeded\ndata: ${JSON.stringify(raw)}\n\n`;
    const observed = vi.fn();
    let cancellations = 0;
    const owner = createNetworkOwner({
      role: 'private-run-fixture',
      capacity: 1,
      fetch: async () =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(text));
            },
            cancel() {
              cancellations++;
              return cleanup;
            },
          }),
          { headers: { 'content-type': 'text/event-stream' } },
        ),
      onExchange: observed,
    });
    const consume = vi.fn(async () => {});
    await owner.run({ timeoutMs: 1_000 }, (operation) =>
      consumeProviderStream(
        operation,
        'https://fixture.invalid',
        'fixture-only',
        'run-fixture',
        '6',
        operation.signal,
        consume,
        async () => {},
      ),
    );
    expect(consume).toHaveBeenCalledExactlyOnceWith({
      runId: 'run-fixture',
      sequence: '7',
      type: 'run.succeeded',
      data: {},
    });
    expect(cancellations).toBe(1);
    expect(observed).not.toHaveBeenCalled();
    expect(owner.snapshot().occupied).toBe(1);
    finishCleanup();
    for (let index = 0; index < 15; index++) await Promise.resolve();
    expect(owner.snapshot().occupied).toBe(0);
  });

  it('bounds an idle persistence callback with the original observation deadline', async () => {
    let finishIdle: () => void = () => {};
    const idle = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishIdle = resolve;
        }),
    );
    const owner = createNetworkOwner({
      role: 'private-run-idle',
      capacity: 1,
      fetch: async () =>
        new Response(new ReadableStream(), { headers: { 'content-type': 'text/event-stream' } }),
    });
    await expect(
      owner.run({ timeoutMs: 300 }, (operation) =>
        consumeProviderStream(
          operation,
          'https://fixture.invalid',
          'fixture-only',
          'run-fixture',
          '6',
          operation.signal,
          async () => {},
          idle,
        ),
      ),
    ).rejects.toMatchObject({ kind: 'deadline_exceeded' });
    expect(idle).toHaveBeenCalledTimes(1);
    expect(owner.snapshot().occupied).toBe(1);
    finishIdle();
    for (let index = 0; index < 15; index++) await Promise.resolve();
    expect(owner.snapshot().occupied).toBe(0);
  });
});
