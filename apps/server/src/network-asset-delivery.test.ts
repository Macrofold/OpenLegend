import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeOwned } from '@open-legend/network/node';
import { AssetCache } from './asset-cache.js';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, expect, it } from 'vitest';
import type { ArtifactReference } from '@open-legend/assets';
import { createAssetDelivery } from './asset-delivery.js';
import type { AssetResolver } from './asset-runtime.js';

const bytes = Buffer.from('a synthetic complete asset');
const reference: ArtifactReference = {
  boundary: 'runtime',
  accessDomain: 'public',
  sha256: createHash('sha256').update(bytes).digest('hex'),
  bytes: bytes.length,
  mediaType: 'application/octet-stream',
};
const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

it('releases a resolver lease arriving after HTTP cancellation and retains shutdown through its cleanup', async () => {
  let enter = () => {};
  const entered = new Promise<void>((resolve) => {
    enter = resolve;
  });
  let offer: (lease: Awaited<ReturnType<AssetResolver>>) => void = () => {};
  const acquisition = new Promise<Awaited<ReturnType<AssetResolver>>>((resolve) => {
    offer = resolve;
  });
  let finishRelease = () => {};
  const releasing = new Promise<void>((resolve) => {
    finishRelease = resolve;
  });
  let releases = 0;
  let pins = 0;
  let closed = false;
  const resolver: AssetResolver = Object.assign(
    async () => {
      enter();
      return acquisition;
    },
    {
      reference: () => reference,
      releaseSha256: 'a'.repeat(64),
      release: {
        owner: { kind: 'collection' as const, id: 'fixture' },
        assetId: 'fixture',
        revisionId: 'fixture',
        manifestSha256: 'a'.repeat(64),
      },
      close: async () => {
        expect(pins).toBe(0);
        closed = true;
      },
    },
  );
  const delivery = await createAssetDelivery(undefined, resolver, 1);
  const server = createServer((request, response) => {
    void delivery
      .serve(request, response, new URL(request.url ?? '/', 'http://127.0.0.1'))
      .catch(() => response.destroy());
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const port = (server.address() as AddressInfo).port;
    const cancellation = new AbortController();
    const reading = fetch(`http://127.0.0.1:${port}/__assets/synthetic`, {
      signal: cancellation.signal,
    }).catch(() => undefined);
    await entered;
    cancellation.abort();
    await reading;
    await expect(delivery.close({ timeoutMs: 25 })).rejects.toThrow('unsettled');
    pins++;
    offer({
      path: join(tmpdir(), 'late-lease-is-never-opened'),
      reference,
      release: async () => {
        releases++;
        await releasing;
        pins--;
      },
    });
    await expect.poll(() => releases).toBe(1);
    expect(closed).toBe(false);
    expect(pins).toBe(1);
    finishRelease();
    await expect.poll(() => closed).toBe(true);
    expect(pins).toBe(0);
    expect(releases).toBe(1);
  } finally {
    finishRelease();
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

it('serves a range through the real HTTP caller and retires its source pin before resolver shutdown', async () => {
  const root = await mkdtemp(join(tmpdir(), 'openlegend-network-delivery-'));
  roots.push(root);
  await writeFile(root + '/asset', bytes);
  let pins = 0;
  let releases = 0;
  let closed = false;
  const resolver: AssetResolver = Object.assign(
    async () => {
      pins++;
      return {
        path: root + '/asset',
        reference,
        release: async () => {
          pins--;
          releases++;
        },
      };
    },
    {
      reference: () => reference,
      releaseSha256: 'a'.repeat(64),
      release: {
        owner: { kind: 'collection' as const, id: 'fixture' },
        assetId: 'fixture',
        revisionId: 'fixture',
        manifestSha256: 'a'.repeat(64),
      },
      close: async () => {
        expect(pins).toBe(0);
        closed = true;
      },
    },
  );
  const delivery = await createAssetDelivery(undefined, resolver, 1);
  const server = createServer((request, response) => {
    void delivery
      .serve(request, response, new URL(request.url ?? '/', 'http://127.0.0.1'))
      .catch(() => response.destroy());
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const port = (server.address() as AddressInfo).port;
    const result = await fetch(`http://127.0.0.1:${port}/__assets/synthetic`, {
      headers: { range: 'bytes=2-7' },
    });
    expect(result.status).toBe(206);
    expect(result.headers.get('content-range')).toBe(`bytes 2-7/${bytes.length}`);
    expect(Buffer.from(await result.arrayBuffer())).toEqual(bytes.subarray(2, 8));
    await delivery.close({ timeoutMs: 1000 });
    expect(releases).toBe(1);
    expect(closed).toBe(true);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await delivery.close({ timeoutMs: 1000 });
  }
});

it('streams a complete 16 MiB exact asset through cache and HTTP while retaining its read pin', async () => {
  const root = await mkdtemp(join(tmpdir(), 'openlegend-network-large-asset-'));
  roots.push(root);
  const chunk = Buffer.alloc(64 * 1024, 0x5a);
  const hash = createHash('sha256');
  for (let i = 0; i < 256; i++) hash.update(chunk);
  const large: ArtifactReference = {
    ...reference,
    bytes: 16 * 1024 * 1024,
    sha256: hash.digest('hex'),
  };
  const cache = new AssetCache({
    root: root + '/cache',
    maxBytes: 32 * 1024 * 1024,
    maxEntries: 8,
    maxConcurrent: 1,
    transferTimeoutMs: 5000,
  });
  let copies = 0;
  let releases = 0;
  const resolver: AssetResolver = Object.assign(
    async (_path: string, signal?: AbortSignal) => {
      const lease = await cache.acquire(
        large,
        async (operation, sink) => {
          copies++;
          const source = Readable.from(
            (function* () {
              for (let i = 0; i < 256; i++) yield chunk;
            })(),
          );
          await pipeOwned(operation, source, sink, {
            maxBytes: large.bytes,
            exactBytes: large.bytes,
          });
        },
        signal,
      );
      return {
        ...lease,
        release: async () => {
          releases++;
          await lease.release();
        },
      };
    },
    {
      reference: () => large,
      releaseSha256: 'a'.repeat(64),
      release: {
        owner: { kind: 'collection' as const, id: 'fixture' },
        assetId: 'fixture',
        revisionId: 'fixture',
        manifestSha256: 'a'.repeat(64),
      },
      close: (budget?: { timeoutMs: number; signal?: AbortSignal }) => cache.close(budget),
    },
  );
  const delivery = await createAssetDelivery(undefined, resolver, 1);
  const server = createServer((request, response) => {
    void delivery
      .serve(request, response, new URL(request.url ?? '/', 'http://127.0.0.1'))
      .catch(() => response.destroy());
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const started = performance.now();
  try {
    const port = (server.address() as AddressInfo).port;
    const result = await fetch(`http://127.0.0.1:${port}/__assets/synthetic-large`);
    expect(result.status).toBe(200);
    expect(result.headers.get('content-length')).toBe(String(large.bytes));
    // The client has only received headers. Backpressure keeps the source pin
    // live, and a competing prune must retain the verified complete file.
    expect(await cache.prune()).toEqual({ removedBytes: 0, retainedBytes: large.bytes });
    const reader = result.body?.getReader();
    if (!reader) throw new Error('The HTTP fixture returned no readable body.');
    const receivedHash = createHash('sha256');
    let received = 0;
    try {
      for (;;) {
        const next = await reader.read();
        if (next.done) break;
        received += next.value.byteLength;
        receivedHash.update(next.value);
      }
    } finally {
      reader.releaseLock();
    }
    expect(received).toBe(large.bytes);
    expect(receivedHash.digest('hex')).toBe(large.sha256);
    await delivery.close({ timeoutMs: 5000 });
    expect(copies).toBe(1);
    expect(releases).toBe(1);
    const state = JSON.parse(await readFile(root + '/cache/state.json', 'utf8')) as {
      files: Record<string, { pins: Record<string, number> }>;
      transfers: Record<string, unknown>;
      owners: Record<string, unknown>;
    };
    expect(Object.keys(state.transfers)).toHaveLength(0);
    expect(Object.keys(state.owners)).toHaveLength(0);
    expect(Object.values(state.files).every((file) => Object.keys(file.pins).length === 0)).toBe(
      true,
    );
    console.info(
      `Complete synthetic asset: ${received} bytes, ${(performance.now() - started).toFixed(1)} ms through cache and HTTP; one transfer and one released pin.`,
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await delivery.close({ timeoutMs: 5000 });
  }
});
