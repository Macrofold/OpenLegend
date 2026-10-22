import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable, Writable } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { createNetworkOwner, type NetworkOperation } from '@open-legend/network';
import * as network from '@open-legend/network';
import type { NetworkOwner } from '@open-legend/network';
import { ownNodeStream, pipeOwned } from '@open-legend/network/node';
import type { ArtifactReference } from '@open-legend/assets';
import { AssetCache, type AssetCacheLease } from './asset-cache.js';
import { S3AssetStorage, withAssetStorageOperation } from './asset-storage.js';
import { copyPublicAssetToCache } from './asset-public-delivery.js';

vi.mock('@aws-sdk/credential-providers', () => ({
  fromIni: () => async () => ({
    accessKeyId: 'synthetic-key',
    secretAccessKey: 'synthetic-secret',
  }),
  fromTemporaryCredentials: () => async () => ({
    accessKeyId: 'synthetic-role-key',
    secretAccessKey: 'synthetic-role-secret',
  }),
}));
const bytes = Buffer.from('exact synthetic asset');
const reference: ArtifactReference = {
  boundary: 'runtime',
  accessDomain: 'public',
  mediaType: 'application/octet-stream',
  bytes: bytes.length,
  sha256: createHash('sha256').update(bytes).digest('hex'),
};
const roots: string[] = [];
const caches: AssetCache[] = [];
const stores: S3AssetStorage[] = [];
function storage() {
  const value = new S3AssetStorage({
    profile: 'synthetic',
    region: 'us-east-2',
    accountId: '123456789012',
    buckets: { runtime: 'synthetic-runtime' },
    maxObjectBytes: 1024,
  });
  stores.push(value);
  return value;
}
function identity() {
  return {
    response: {
      statusCode: 200,
      headers: { 'content-type': 'text/xml' },
      body: Readable.from([
        '<GetCallerIdentityResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/"><GetCallerIdentityResult><Arn>arn:aws:iam::123456789012:role/fixture</Arn><UserId>fixture</UserId><Account>123456789012</Account></GetCallerIdentityResult></GetCallerIdentityResponse>',
      ]),
    },
  };
}
function object(body = Readable.from([bytes])) {
  return {
    response: {
      statusCode: 200,
      headers: { 'content-length': String(bytes.length), 'content-type': reference.mediaType },
      body,
    },
  };
}

afterEach(async () => {
  vi.useRealTimers();
  for (const store of stores.splice(0)) store.close();
  for (const cache of caches.splice(0)) await cache.close({ timeoutMs: 1000 });
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('owned exact asset transfers', () => {
  it('preserves a workflow semantic error through its bounded storage parent', async () => {
    const owner = createNetworkOwner({ role: 'fixture-semantic-storage-parent', capacity: 1 });
    const refusal = new Error('Fixture protected operation was refused.');
    await expect(
      owner.run({ timeoutMs: 1000 }, (operation) =>
        withAssetStorageOperation(operation, async () => {
          throw refusal;
        }),
      ),
    ).rejects.toBe(refusal);
    expect(owner.snapshot().occupied).toBe(0);
  });

  it('waits for the prior copy source to close before any conditional retry', async () => {
    let releaseSource = () => {};
    let downloads = 0;
    let uploads = 0;
    let stored = false;
    const source = new Readable({
      read() {
        this.push(bytes);
        this.push(null);
      },
      destroy(error, callback) {
        releaseSource = () => callback(error);
      },
    });
    vi.spyOn(NodeHttpHandler.prototype, 'handle').mockImplementation(
      async (request): ReturnType<NodeHttpHandler['handle']> => {
        if (request.hostname.startsWith('sts.')) return identity();
        if (request.method === 'HEAD') {
          const exists = request.path.includes('/public/') || stored;
          return {
            response: {
              statusCode: exists ? 200 : 404,
              headers: exists
                ? {
                    'content-length': String(bytes.length),
                    'content-type': reference.mediaType,
                    'x-amz-checksum-sha256': createHash('sha256').update(bytes).digest('base64'),
                    'x-amz-checksum-type': 'FULL_OBJECT',
                  }
                : {},
              body: Readable.from([]),
            },
          };
        }
        if (request.method === 'GET') return object(++downloads === 1 ? source : undefined);
        expect(request.method).toBe('PUT');
        expect(request.headers['if-none-match']).toBe('*');
        if (!(request.body instanceof Readable)) throw new Error('Expected streaming copy input.');
        const received: Buffer[] = [];
        for await (const chunk of request.body) received.push(Buffer.from(chunk));
        expect(Buffer.concat(received)).toEqual(bytes);
        uploads++;
        if (uploads < 3)
          return {
            response: {
              statusCode: 503,
              headers: { 'content-type': 'application/xml' },
              body: Readable.from(['<Error><Code>ServiceUnavailable</Code></Error>']),
            },
          };
        stored = true;
        return { response: { statusCode: 200, headers: {}, body: Readable.from([]) } };
      },
    );
    const destination: ArtifactReference = { ...reference, accessDomain: 'curated-private' };
    const copying = storage().copy(reference, destination);
    void copying.catch(() => {});
    try {
      await expect.poll(() => uploads).toBe(1);
      expect(source.closed).toBe(false);
      await new Promise<void>((resolve) => setTimeout(resolve, 150));
      expect(downloads).toBe(1);
      expect(uploads).toBe(1);
      releaseSource();
      await expect(copying).resolves.toMatchObject(destination);
      expect(downloads).toBe(3);
      expect(uploads).toBe(3);
      expect(source.closed).toBe(true);
    } finally {
      releaseSource();
    }
  });

  it('retains the parent while copy cleanup outlives its original deadline without retrying', async () => {
    let releaseSource = () => {};
    let uploads = 0;
    const source = new Readable({
      read() {
        this.push(bytes);
        this.push(null);
      },
      destroy(error, callback) {
        releaseSource = () => callback(error);
      },
    });
    vi.spyOn(NodeHttpHandler.prototype, 'handle').mockImplementation(
      async (request): ReturnType<NodeHttpHandler['handle']> => {
        if (request.hostname.startsWith('sts.')) return identity();
        if (request.method === 'HEAD')
          return {
            response: {
              statusCode: request.path.includes('/public/') ? 200 : 404,
              headers: {
                'content-length': String(bytes.length),
                'content-type': reference.mediaType,
                'x-amz-checksum-sha256': createHash('sha256').update(bytes).digest('base64'),
                'x-amz-checksum-type': 'FULL_OBJECT',
              },
              body: Readable.from([]),
            },
          };
        if (request.method === 'GET') return object(source);
        if (!(request.body instanceof Readable)) throw new Error('Expected streaming copy input.');
        for await (const _chunk of request.body) {
          // Consume exactly the real SDK upload body before the transient reply.
        }
        uploads++;
        return {
          response: {
            statusCode: 503,
            headers: { 'content-type': 'application/xml' },
            body: Readable.from(['<Error><Code>ServiceUnavailable</Code></Error>']),
          },
        };
      },
    );
    const store = storage();
    await store.principal();
    const owner = createNetworkOwner({ role: 'fixture-copy-parent', capacity: 1 });
    const copying = owner.run({ timeoutMs: 100 }, (operation) =>
      withAssetStorageOperation(operation, () =>
        store.copy(reference, { ...reference, accessDomain: 'curated-private' }),
      ),
    );
    try {
      await expect(copying).rejects.toMatchObject({ kind: 'deadline_exceeded' });
      expect(uploads).toBe(1);
      expect(owner.snapshot().occupied).toBe(1);
      await new Promise<void>((resolve) => setTimeout(resolve, 150));
      expect(uploads).toBe(1);
      releaseSource();
      await owner.whenIdle();
      expect(owner.snapshot().occupied).toBe(0);
    } finally {
      releaseSource();
    }
  });

  it('owns rejected final lease handoff cleanup until its pin release actually settles', async () => {
    const original = network.createNetworkOwner;
    const controller = new AbortController();
    let readerOwner: NetworkOwner | undefined;
    let release = () => {};
    let cleanupStarted = false;
    const cleanup = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.spyOn(network, 'createNetworkOwner').mockImplementation((options) => {
      const owner = original(options);
      if (options.role !== 'asset-cache-readers') return owner;
      readerOwner = owner;
      return {
        ...owner,
        run: (budget, work) =>
          owner.run(budget, async (operation) => {
            const result = await work(operation);
            // Cancel between the cache callback's return and the shared final
            // guard. Its provisional pin must not disappear with the result.
            const lease = result as AssetCacheLease;
            const prior = lease.release;
            lease.release = async () => {
              cleanupStarted = true;
              await cleanup;
              await prior();
            };
            controller.abort();
            return result;
          }),
      };
    });
    const root = await mkdtemp(join(tmpdir(), 'openlegend-network-handoff-'));
    roots.push(root);
    const cache = new AssetCache({ root, maxBytes: 1024, maxEntries: 2, maxConcurrent: 1 });
    caches.push(cache);
    const result = cache.acquire(
      reference,
      (operation, sink) =>
        pipeOwned(operation, Readable.from([bytes]), sink, {
          maxBytes: bytes.length,
          exactBytes: bytes.length,
        }).then(() => {}),
      controller.signal,
    );
    await expect(result).rejects.toMatchObject({ kind: 'cancelled' });
    expect(cleanupStarted).toBe(true);
    expect(readerOwner?.snapshot().occupied).toBe(1);
    expect(await cache.prune()).toEqual({ removedBytes: 0, retainedBytes: bytes.length });
    release();
    await expect.poll(() => readerOwner?.snapshot().occupied).toBe(0);
    expect(await cache.prune()).toEqual({ removedBytes: bytes.length, retainedBytes: 0 });
  });

  it('runs the actual AWS SDK identity and GetObject through a cache-owned sink', async () => {
    const requests: string[] = [];
    vi.spyOn(NodeHttpHandler.prototype, 'handle').mockImplementation(
      async (request): ReturnType<NodeHttpHandler['handle']> => {
        requests.push(request.hostname);
        return request.hostname.startsWith('sts.') ? identity() : object();
      },
    );
    const store = storage();
    const owner = createNetworkOwner({ role: 'fixture-transfer', capacity: 1 });
    const chunks: Buffer[] = [];
    const sink = new Writable({
      write(chunk: Buffer, _encoding, done) {
        chunks.push(Buffer.from(chunk));
        done();
      },
    });
    await owner.run({ timeoutMs: 1000 }, (operation) =>
      store.downloadInto(reference, sink, operation),
    );
    expect(Buffer.concat(chunks)).toEqual(bytes);
    expect(sink.closed).toBe(true);
    expect(requests).toHaveLength(2);
    await owner.whenIdle();
    expect(owner.snapshot().occupied).toBe(0);
  });

  it('destroys a late SDK GetObject without writing and retains admission until it arrives', async () => {
    let late: ((value: ReturnType<typeof object>) => void) | undefined;
    vi.spyOn(NodeHttpHandler.prototype, 'handle').mockImplementation(
      async (request): ReturnType<NodeHttpHandler['handle']> => {
        if (request.hostname.startsWith('sts.')) return identity();
        return new Promise<ReturnType<typeof object>>((resolve) => {
          late = resolve;
        });
      },
    );
    const store = storage();
    await store.principal();
    const owner = createNetworkOwner({ role: 'fixture-transfer', capacity: 1 });
    let writes = 0;
    const sink = new Writable({
      write(_chunk, _encoding, done) {
        writes++;
        done();
      },
    });
    vi.useFakeTimers();
    const waiting = owner.run({ timeoutMs: 10 }, async (operation) => {
      ownNodeStream(operation, sink);
      await store.downloadInto(reference, sink, operation);
    });
    const failure = waiting.catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(11);
    expect(await failure).toMatchObject({ kind: 'deadline_exceeded' });
    expect(owner.snapshot().occupied).toBe(1);
    expect(writes).toBe(0);
    const body = Readable.from([bytes]);
    expect(late).toBeTypeOf('function');
    late?.(object(body));
    await vi.advanceTimersByTimeAsync(1);
    expect(body.destroyed).toBe(true);
    expect(writes).toBe(0);
    expect(owner.snapshot().occupied).toBe(0);
  });

  it('retains exactly three conditional upload attempts with a fresh completed source each time', async () => {
    let uploads = 0;
    let stored = false;
    const bodies: unknown[] = [];
    vi.spyOn(NodeHttpHandler.prototype, 'handle').mockImplementation(
      async (request): ReturnType<NodeHttpHandler['handle']> => {
        if (request.hostname.startsWith('sts.')) return identity();
        if (request.method === 'HEAD')
          return {
            response: {
              statusCode: stored ? 200 : 404,
              headers: stored
                ? {
                    'content-length': String(bytes.length),
                    'content-type': reference.mediaType,
                    'x-amz-checksum-sha256': createHash('sha256').update(bytes).digest('base64'),
                    'x-amz-checksum-type': 'FULL_OBJECT',
                  }
                : {},
              body: Readable.from([]),
            },
          };
        expect(request.method).toBe('PUT');
        expect(request.headers['if-none-match']).toBe('*');
        expect(bodies).not.toContain(request.body);
        bodies.push(request.body);
        const received: Buffer[] = [];
        if (!(request.body instanceof Readable))
          throw new Error('Fixture expected an owned upload source.');
        for await (const chunk of request.body) received.push(Buffer.from(chunk));
        expect(Buffer.concat(received)).toEqual(bytes);
        uploads++;
        if (uploads < 3)
          return {
            response: {
              statusCode: 503,
              headers: { 'content-type': 'application/xml' },
              body: Readable.from([
                '<Error><Code>ServiceUnavailable</Code><Message>synthetic failure</Message></Error>',
              ]),
            },
          };
        stored = true;
        return { response: { statusCode: 200, headers: {}, body: Readable.from([]) } };
      },
    );
    const root = await mkdtemp(join(tmpdir(), 'openlegend-network-upload-'));
    roots.push(root);
    const source = root + '/input';
    await writeFile(source, bytes);
    await expect(storage().upload(reference, source)).resolves.toMatchObject(reference);
    expect(uploads).toBe(3);
  });

  it('bounds an SDK metadata body before XML decoding and can recover without caching a late identity', async () => {
    const oversized = Readable.from([Buffer.alloc(1_048_577, 'x')]);
    let first = true;
    vi.spyOn(NodeHttpHandler.prototype, 'handle').mockImplementation(
      async (): ReturnType<NodeHttpHandler['handle']> => {
        if (first) {
          first = false;
          return {
            response: { statusCode: 200, headers: { 'content-type': 'text/xml' }, body: oversized },
          };
        }
        return identity();
      },
    );
    const store = storage();
    await expect(store.principal()).rejects.toMatchObject({ kind: 'body_too_large' });
    expect(oversized.destroyed).toBe(true);
    await expect(store.principal()).resolves.toBe('arn:aws:iam::123456789012:role/fixture');
  });

  it('shares one exact transfer while a cancelled reader detaches and another receives verified bytes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'openlegend-network-cache-'));
    roots.push(root);
    const cache = new AssetCache({ root, maxBytes: 1024, maxEntries: 8, maxConcurrent: 1 });
    caches.push(cache);
    let ready: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      ready = resolve;
    });
    let copies = 0;
    const copy = async (operation: NetworkOperation, sink: Writable) => {
      copies++;
      await operation.wait('body', () => gate);
      await pipeOwned(operation, Readable.from([bytes]), sink, {
        maxBytes: bytes.length,
        exactBytes: bytes.length,
      });
    };
    const first = new AbortController();
    const cancelled = cache.acquire(reference, copy, first.signal).catch((error: unknown) => error);
    const retained = cache.acquire(reference, copy);
    // Wait for shared transfer admission rather than racing the initial reader registration.
    while (!copies) await new Promise((resolve) => setTimeout(resolve, 5));
    first.abort(new Error('synthetic reader left'));
    await cancelled;
    ready?.();
    const lease = await retained;
    expect(await readFile(lease.path)).toEqual(bytes);
    expect(copies).toBe(1);
    expect(await readdir(root + '/partial')).toEqual([]);
    await lease.release();
  });

  it('keeps a timed-out public transfer reserved until ignored headers arrive, then uses a fresh temporary identity', async () => {
    const root = await mkdtemp(join(tmpdir(), 'openlegend-network-cache-'));
    roots.push(root);
    const cache = new AssetCache({
      root,
      maxBytes: 1024,
      maxEntries: 8,
      maxConcurrent: 1,
      transferTimeoutMs: 200,
    });
    caches.push(cache);
    let releaseHeaders: ((response: Response) => void) | undefined;
    const transport = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          releaseHeaders = resolve;
        }),
    );
    vi.stubGlobal('fetch', transport);
    const copy = (operation: NetworkOperation, sink: Writable) =>
      copyPublicAssetToCache(reference, sink, operation);
    await expect(cache.acquire(reference, copy)).rejects.toMatchObject({
      kind: 'deadline_exceeded',
    });
    const firstTemporary = await readdir(root + '/partial');
    expect(firstTemporary).toHaveLength(1);
    await expect(cache.acquire(reference, copy)).rejects.toThrow('Asset download failed');
    expect(transport).toHaveBeenCalledTimes(1);
    const stateBefore = JSON.parse(await readFile(root + '/state.json', 'utf8')) as {
      transfers: Record<string, { status: string }>;
    };
    expect(Object.values(stateBefore.transfers)[0]?.status).toBe('stopping');
    releaseHeaders?.(
      new Response(bytes, {
        headers: { 'content-length': String(bytes.length), 'content-type': reference.mediaType },
      }),
    );
    for (;;) {
      const state = JSON.parse(await readFile(root + '/state.json', 'utf8')) as {
        transfers: Record<string, { status: string }>;
      };
      if (Object.values(state.transfers).every((transfer) => transfer.status === 'failed')) break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    expect(await readdir(root + '/partial')).toEqual([]);
    let secondTemporary: string[] = [];
    const lease = await cache.acquire(reference, async (operation, sink) => {
      secondTemporary = await readdir(root + '/partial');
      await pipeOwned(operation, Readable.from([bytes]), sink, {
        maxBytes: bytes.length,
        exactBytes: bytes.length,
      });
    });
    expect(secondTemporary).toHaveLength(1);
    expect(secondTemporary[0]).not.toBe(firstTemporary[0]);
    expect(await readFile(lease.path)).toEqual(bytes);
    await lease.release();
  });

  it('expires a queued cache subscriber without a caller signal while physical transfer admission stays occupied', async () => {
    const root = await mkdtemp(join(tmpdir(), 'openlegend-network-queued-cache-'));
    roots.push(root);
    const cache = new AssetCache({
      root,
      maxBytes: 1024,
      maxEntries: 2,
      maxConcurrent: 1,
      transferTimeoutMs: 100,
    });
    caches.push(cache);
    let finishRaw = () => {};
    const raw = new Promise<void>((resolve) => {
      finishRaw = resolve;
    });
    let copies = 0;
    const copy = async (operation: NetworkOperation) => {
      copies++;
      await operation.wait('connect', () => raw);
    };
    const first = cache.acquire(reference, copy).catch((error: unknown) => error);
    while (!copies) await new Promise((resolve) => setTimeout(resolve, 5));
    const queuedReference = { ...reference, sha256: 'b'.repeat(64) };
    const queued = cache.acquire(queuedReference, copy).catch((error: unknown) => error);
    expect(await first).toMatchObject({ kind: 'deadline_exceeded' });
    expect(await queued).toMatchObject({ kind: 'deadline_exceeded' });
    expect(copies).toBe(1);
    expect(await cache.prune()).toEqual({ removedBytes: 0, retainedBytes: reference.bytes * 2 });
    const retained = JSON.parse(await readFile(root + '/state.json', 'utf8')) as {
      transfers: Record<string, { status: string }>;
      files: Record<string, unknown>;
    };
    expect(Object.values(retained.transfers).some((entry) => entry.status === 'stopping')).toBe(
      true,
    );
    expect(Object.keys(retained.files)).toHaveLength(0);
    finishRaw();
    for (;;) {
      const state = JSON.parse(await readFile(root + '/state.json', 'utf8')) as {
        transfers: Record<string, unknown>;
        files: Record<string, unknown>;
      };
      if (Object.keys(state.transfers).length === 0) {
        expect(Object.keys(state.files)).toHaveLength(0);
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    expect(await readdir(root + '/partial')).toEqual([]);
    expect(copies).toBe(1);
  });
});
