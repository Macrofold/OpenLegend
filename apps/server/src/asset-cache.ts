import {
  artifactReferenceKey,
  assertArtifactReference,
  sameArtifact,
  type ArtifactReference,
} from '@open-legend/assets';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import type { Writable } from 'node:stream';
import {
  createNetworkOwner,
  NetworkError,
  type NetworkOperation,
  type NetworkOwner,
} from '@open-legend/network';
import { ownNodeStream, waitForOperationResources } from '@open-legend/network/node';
import {
  chmod,
  lstat,
  mkdir,
  opendir,
  readFile,
  readlink,
  rename,
  statfs,
  symlink,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { externalAssetPath } from './asset-directories.js';

interface CacheLimits {
  maxBytes: number;
  maxEntries: number;
  maxConcurrent: number;
}
interface FileStamp {
  size: number;
  mtimeMs: number;
  ctimeMs: number;
  ino: number;
}
interface CachedFile {
  reference: ArtifactReference;
  stamp: FileStamp;
  used: number;
  pins: Record<string, number>;
}
interface Transfer {
  reference: ArtifactReference;
  owner: string;
  status: 'queued' | 'active' | 'stopping' | 'failed';
  attempt: string;
  interests: Record<string, number>;
}
interface CacheState {
  limits: CacheLimits;
  owners: Record<string, number>;
  files: Record<string, CachedFile>;
  transfers: Record<string, Transfer>;
}
export interface AssetCacheOptions extends CacheLimits {
  root: string;
  transferTimeoutMs?: number;
}
export interface AssetCacheLease {
  path: string;
  reference: ArtifactReference;
  release(): Promise<void>;
}
/** The exact adapter supplies its source through the reviewed streaming boundary.
 * Cache exclusively owns the writable file, its pathname and publication. */
export type FetchAsset = (operation: NetworkOperation, sink: Writable) => Promise<void>;
const ownerPattern = /^[1-9][0-9]*-[a-f0-9-]{36}$/;
const keyPattern = /^[a-f0-9]{64}$/;
const own = (value: object, key: string) => Object.hasOwn(value, key);
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const codeIs = (error: unknown, code: string) =>
  error instanceof Error && 'code' in error && error.code === code;
const keyFor = (reference: ArtifactReference) =>
  createHash('sha256').update(artifactReferenceKey(reference)).digest('hex');
const count = (interests: Record<string, number>) =>
  Object.values(interests).reduce((sum, value) => sum + value, 0);

function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (codeIs(error, 'ESRCH')) return false;
    if (codeIs(error, 'EPERM')) return true;
    throw error;
  }
}
function ownerPid(owner: string): number {
  if (!ownerPattern.test(owner)) throw new Error('Malformed asset-cache process identity.');
  const pid = Number(owner.slice(0, owner.indexOf('-')));
  if (!Number.isSafeInteger(pid) || pid > 2_147_483_647)
    throw new Error('Malformed asset-cache process number.');
  return pid;
}
function assertInterests(value: unknown): asserts value is Record<string, number> {
  if (!record(value)) throw new Error('Malformed asset-cache reader interests.');
  for (const [owner, interest] of Object.entries(value)) {
    ownerPid(owner);
    if (!Number.isSafeInteger(interest) || Number(interest) <= 0)
      throw new Error('Malformed asset-cache reader count.');
  }
}
function parseState(value: unknown, limits: CacheLimits): CacheState {
  const storedLimits = record(value) ? value['limits'] : undefined;
  if (
    !record(value) ||
    !record(storedLimits) ||
    Object.entries(limits).some(([key, limit]) => storedLimits[key] !== limit) ||
    !record(value['owners']) ||
    !record(value['files']) ||
    !record(value['transfers'])
  )
    throw new Error('Asset cache has invalid metadata or different configured limits.');
  if (
    Object.keys(value['owners']).length > limits.maxEntries ||
    Object.keys(value['files']).length + Object.keys(value['transfers']).length > limits.maxEntries
  )
    throw new Error('Asset-cache metadata exceeds its admitted owner/file allowance.');
  let relationships = 0;
  for (const [owner, pid] of Object.entries(value['owners'])) {
    if (ownerPid(owner) !== pid) throw new Error('Malformed asset-cache owner.');
  }
  for (const [key, entry] of Object.entries(value['files'])) {
    const stamp = record(entry) ? entry['stamp'] : undefined;
    if (
      !keyPattern.test(key) ||
      !record(entry) ||
      !record(stamp) ||
      !Number.isFinite(entry['used']) ||
      !['size', 'mtimeMs', 'ctimeMs', 'ino'].every((field) => Number.isFinite(stamp[field]))
    )
      throw new Error('Malformed verified asset-cache entry.');
    assertArtifactReference(entry['reference']);
    assertInterests(entry['pins']);
    relationships += Object.keys(entry['pins']).length;
    if (relationships > limits.maxEntries * 4)
      throw new Error('Asset-cache metadata exceeds its admitted reader allowance.');
    if (keyFor(entry['reference']) !== key || stamp['size'] !== entry['reference'].bytes)
      throw new Error('Asset-cache file identity mismatch.');
  }
  for (const [key, transfer] of Object.entries(value['transfers'])) {
    if (
      !keyPattern.test(key) ||
      !record(transfer) ||
      !['queued', 'active', 'stopping', 'failed'].includes(String(transfer['status'])) ||
      typeof transfer['owner'] !== 'string' ||
      typeof transfer['attempt'] !== 'string' ||
      !/^[a-f0-9-]{36}$/.test(transfer['attempt']) ||
      own(value['files'], key)
    )
      throw new Error('Malformed asset-cache transfer.');
    ownerPid(transfer['owner']);
    assertArtifactReference(transfer['reference']);
    assertInterests(transfer['interests']);
    relationships += Object.keys(transfer['interests']).length;
    if (relationships > limits.maxEntries * 4)
      throw new Error('Asset-cache metadata exceeds its admitted reader allowance.');
    if (keyFor(transfer['reference']) !== key)
      throw new Error('Asset-cache transfer identity mismatch.');
  }
  // Every field consumed below has been checked at the current-format disk boundary.
  return value as unknown as CacheState;
}

/** Shared, disposable verified bytes. Access authorization remains the caller's responsibility.
 * Mutable artist files must be copied elsewhere; this module never makes writable hard links. */
export class AssetCache {
  readonly root: string;
  private readonly limits: CacheLimits;
  private readonly network: NetworkOwner;
  private readonly readerNetwork: NetworkOwner;
  private readonly transferTimeoutMs: number;
  private readonly owner = `${process.pid}-${randomUUID()}`;
  private readonly closing = new AbortController();
  private readonly readers = new Map<string, string>();
  private readonly readerCounts = new Map<string, number>();
  private readonly workers = new Map<string, Promise<void>>();
  private readonly workerObservations = new Map<string, Promise<void>>();
  private readonly transferWaiters = new Set<() => void>();
  private transferSlots = 0;
  private readonly failures = new Map<string, unknown>();
  private stateQueue: Promise<void> = Promise.resolve();
  private initialization: Promise<void> | undefined;
  private closePromise: Promise<void> | undefined;
  private closed = false;

  constructor(options: AssetCacheOptions) {
    this.root = resolve(options.root);
    this.transferTimeoutMs = options.transferTimeoutMs ?? 300_000;
    if (!Number.isSafeInteger(this.transferTimeoutMs) || this.transferTimeoutMs < 1)
      throw new Error('Asset transfer deadline must be a positive safe integer.');
    this.limits = {
      maxBytes: options.maxBytes,
      maxEntries: options.maxEntries,
      maxConcurrent: options.maxConcurrent,
    };
    for (const limit of Object.values(this.limits)) {
      if (!Number.isSafeInteger(limit) || limit <= 0)
        throw new Error('Cache limits must be positive safe integers.');
    }
    if (options.maxConcurrent > options.maxEntries)
      throw new Error('Cache concurrency cannot exceed its entry allowance.');
    this.network = createNetworkOwner({
      role: 'server-asset-transfer',
      capacity: options.maxConcurrent,
    });
    this.readerNetwork = createNetworkOwner({
      role: 'asset-cache-readers',
      capacity: options.maxEntries,
    });
    if (options.maxEntries > Math.floor(Number.MAX_SAFE_INTEGER / 4096))
      throw new Error('Cache metadata allowance exceeds supported integer accounting.');
  }

  private file(key: string) {
    return join(this.root, 'files', key);
  }
  private partial(key: string, owner: string, attempt: string) {
    return join(this.root, 'partial', `${key}-${owner}-${attempt}`);
  }
  private async remove(path: string) {
    await unlink(path).catch((error: unknown) => {
      if (!codeIs(error, 'ENOENT')) throw error;
    });
  }

  /** Atomic symlink creation publishes a complete PID/token; no empty lock can be orphaned. */
  private async mutex<T>(action: () => Promise<T>): Promise<T> {
    const path = join(this.root, 'mutex');
    const token = `${process.pid}-${randomUUID()}`;
    const deadline = Date.now() + 30_000;
    for (;;) {
      try {
        await symlink(token, path);
        break;
      } catch (error) {
        if (!codeIs(error, 'EEXIST')) throw error;
      }
      let current: string;
      try {
        current = await readlink(path);
      } catch (error) {
        if (codeIs(error, 'ENOENT')) continue;
        throw error;
      }
      if (!processAlive(ownerPid(current))) {
        // Serialize recovery for this exact dead token. Re-read before unlinking so a stale
        // contender cannot accidentally remove a newer live process's mutex.
        const recovery = join(this.root, `recover-${current}`);
        let claimed = false;
        try {
          await symlink(token, recovery);
          claimed = true;
          const stillCurrent = await readlink(path).catch((error: unknown) => {
            if (codeIs(error, 'ENOENT')) return undefined;
            throw error;
          });
          if (stillCurrent === current) await this.remove(path);
        } catch (error) {
          if (!codeIs(error, 'EEXIST')) throw error;
          const recovering = await readlink(recovery).catch((readError: unknown) => {
            if (codeIs(readError, 'ENOENT')) return undefined;
            throw readError;
          });
          if (recovering && !processAlive(ownerPid(recovering)))
            throw new Error(
              'Asset-cache lock recovery was itself interrupted; inspect its dead-process recovery marker before retrying.',
            );
        } finally {
          if (claimed) await this.remove(recovery);
        }
      }
      if (Date.now() >= deadline)
        throw new Error('Asset-cache metadata is busy; no live process lock was removed.');
      await delay(25);
    }
    try {
      return await action();
    } finally {
      if ((await readlink(path)) !== token)
        throw new Error('Asset-cache mutex ownership changed unexpectedly.');
      await this.remove(path);
    }
  }

  private async load(): Promise<CacheState> {
    const path = join(this.root, 'state.json');
    try {
      if ((await lstat(path)).size > this.limits.maxEntries * 4096)
        throw new Error('Asset-cache metadata exceeds its admitted size.');
      return parseState(JSON.parse(await readFile(path, 'utf8')), this.limits);
    } catch (error) {
      if (!codeIs(error, 'ENOENT')) throw error;
      for (const name of ['files', 'partial']) {
        const directory = await opendir(join(this.root, name));
        for await (const _entry of directory)
          throw new Error(
            'Asset-cache metadata is missing while files remain; inspect or explicitly reset this disposable cache.',
          );
      }
      return { limits: this.limits, owners: {}, files: {}, transfers: {} };
    }
  }
  private assertBounds(state: CacheState) {
    const entries = Object.values(state.files);
    const transfers = Object.values(state.transfers);
    const interests =
      entries.reduce((n, entry) => n + Object.keys(entry.pins).length, 0) +
      transfers.reduce((n, entry) => n + Object.keys(entry.interests).length, 0);
    if (
      entries.length + transfers.length > this.limits.maxEntries ||
      Object.keys(state.owners).length > this.limits.maxEntries ||
      interests > this.limits.maxEntries * 4 ||
      this.reservedBytes(state) > this.limits.maxBytes
    )
      throw new Error('Asset cache has reached its configured file, reader or byte capacity.');
  }
  private async save(state: CacheState) {
    this.assertBounds(state);
    const body = JSON.stringify(state);
    if (Buffer.byteLength(body) > this.limits.maxEntries * 4096)
      throw new Error('Asset-cache metadata has reached its admitted size.');
    const temporary = join(this.root, `.state-${this.owner}-${randomUUID()}.tmp`);
    try {
      await writeFile(temporary, body, { flag: 'wx', mode: 0o600 });
      await rename(temporary, join(this.root, 'state.json'));
    } finally {
      await this.remove(temporary);
    }
  }
  private reservedBytes(state: CacheState) {
    return (
      Object.values(state.files).reduce((n, entry) => n + entry.reference.bytes, 0) +
      Object.values(state.transfers).reduce(
        (n, entry) => n + (entry.status === 'failed' ? 0 : entry.reference.bytes),
        0,
      )
    );
  }
  private async reconcileDead(state: CacheState) {
    const candidates = new Set(Object.keys(state.owners));
    for (const file of Object.values(state.files))
      for (const owner of Object.keys(file.pins)) candidates.add(owner);
    for (const transfer of Object.values(state.transfers)) {
      candidates.add(transfer.owner);
      for (const owner of Object.keys(transfer.interests)) candidates.add(owner);
    }
    const dead = new Set([...candidates].filter((owner) => !processAlive(ownerPid(owner))));
    for (const owner of dead) delete state.owners[owner];
    for (const entry of Object.values(state.files)) {
      for (const owner of Object.keys(entry.pins)) if (dead.has(owner)) delete entry.pins[owner];
    }
    for (const [key, transfer] of Object.entries(state.transfers)) {
      for (const owner of Object.keys(transfer.interests))
        if (dead.has(owner)) delete transfer.interests[owner];
      if (dead.has(transfer.owner)) {
        await this.remove(this.partial(key, transfer.owner, transfer.attempt));
        // A process may have died after rename but before committing the verified record.
        await this.remove(this.file(key));
        delete state.transfers[key];
      } else if (transfer.status === 'failed' && count(transfer.interests) === 0) {
        delete state.transfers[key];
      }
    }
  }
  private async withState<T>(action: (state: CacheState) => Promise<T> | T): Promise<T> {
    // Contend for the filesystem lock once per cache instance. Its concurrent
    // requests share an ordered queue instead of racing their own symlinks.
    const work = this.stateQueue.then(() =>
      this.mutex(async () => {
        const state = await this.load();
        const before = JSON.stringify(state);
        await this.reconcileDead(state);
        try {
          return await action(state);
        } finally {
          // Waiting readers and transfer monitors do not rewrite identical metadata every poll.
          if (JSON.stringify(state) !== before) await this.save(state);
        }
      }),
    );
    this.stateQueue = work.then(
      () => undefined,
      () => undefined,
    );
    return work;
  }
  private initialize(): Promise<void> {
    this.initialization ??= (async () => {
      await externalAssetPath(this.root);
      await mkdir(this.root, { recursive: true, mode: 0o700 });
      const root = await lstat(this.root);
      if (!root.isDirectory() || root.isSymbolicLink())
        throw new Error('Asset-cache root must be a real private directory.');
      await chmod(this.root, 0o700);
      const contents = await opendir(this.root);
      let checked = 0;
      for await (const item of contents) {
        if (++checked > this.limits.maxEntries * 4)
          throw new Error('Asset-cache metadata directory exceeds its admitted entry allowance.');
        const abandoned = /^\.state-([1-9][0-9]*)-[a-f0-9-]{36}-[a-f0-9-]{36}\.tmp$/.exec(
          item.name,
        );
        if (abandoned?.[1] && !processAlive(Number(abandoned[1])))
          await this.remove(join(this.root, item.name));
      }
      await mkdir(join(this.root, 'files'), { recursive: true, mode: 0o700 });
      await mkdir(join(this.root, 'partial'), { recursive: true, mode: 0o700 });
      for (const name of ['files', 'partial'])
        if (!(await lstat(join(this.root, name))).isDirectory())
          throw new Error('Asset-cache storage directories must not be symlinks.');
      await this.withState((state) => {
        state.owners[this.owner] = process.pid;
      });
    })();
    return this.initialization;
  }
  private interestCount(key: string) {
    return this.readerCounts.get(key) ?? 0;
  }
  private setInterest(state: CacheState, key: string) {
    const interests = state.files[key]?.pins ?? state.transfers[key]?.interests;
    if (!interests) return;
    const readers = this.interestCount(key);
    if (readers) interests[this.owner] = readers;
    else delete interests[this.owner];
  }
  private async evictFor(state: CacheState, reference: ArtifactReference) {
    let reserved = this.reservedBytes(state);
    let entries = Object.keys(state.files).length + Object.keys(state.transfers).length;
    if (reserved + reference.bytes > this.limits.maxBytes || entries >= this.limits.maxEntries) {
      const unused = Object.entries(state.files)
        .filter(([, entry]) => count(entry.pins) === 0)
        .sort((a, b) => a[1].used - b[1].used);
      let next = 0;
      while (
        reserved + reference.bytes > this.limits.maxBytes ||
        entries >= this.limits.maxEntries
      ) {
        const candidate = unused[next++];
        if (!candidate)
          throw new Error(
            'Asset-cache capacity is occupied by active files or reserved downloads. Release them or explicitly increase the configured budget.',
          );
        const [key, entry] = candidate;
        await this.remove(this.file(key));
        delete state.files[key];
        reserved -= entry.reference.bytes;
        entries--;
      }
    }
    const disk = await statfs(this.root);
    let remainingReservations = 0;
    for (const [key, transfer] of Object.entries(state.transfers)) {
      if (transfer.status === 'failed') continue;
      const written = await lstat(this.partial(key, transfer.owner, transfer.attempt))
        .then((file) => file.size)
        .catch((error: unknown) => {
          if (codeIs(error, 'ENOENT')) return 0;
          throw error;
        });
      remainingReservations += Math.max(0, transfer.reference.bytes - written);
    }
    if (reference.bytes + remainingReservations > disk.bavail * disk.bsize)
      throw new Error('Insufficient disk space after accounting for outstanding asset downloads.');
  }
  private startWorker(key: string, fetch: FetchAsset) {
    if (this.workers.has(key)) return;
    let observed = () => {};
    const observation = new Promise<void>((resolve) => {
      observed = resolve;
    });
    this.workerObservations.set(key, observation);
    const work = this.withTransferSlot(() => this.runWorker(key, fetch, observed))
      .catch((error: unknown) => {
        this.failures.set(key, error);
      })
      .finally(() => {
        observed();
        this.workers.delete(key);
        this.workerObservations.delete(key);
        if (!this.interestCount(key)) this.failures.delete(key);
      });
    this.workers.set(key, work);
  }
  /** Only admitted local transfers may poll shared disk admission. Queued files
   * wait in memory instead of each rescanning the complete cache every 50 ms. */
  private async withTransferSlot(operation: () => Promise<void>) {
    if (this.transferSlots >= this.limits.maxConcurrent)
      await new Promise<void>((resolve) => this.transferWaiters.add(resolve));
    else this.transferSlots++;
    try {
      await operation();
    } finally {
      const next = this.transferWaiters.values().next().value;
      if (next) {
        this.transferWaiters.delete(next);
        next();
      } else this.transferSlots--;
    }
  }
  private async awaitWorker(work: Promise<void>, signal: AbortSignal) {
    let abort: (() => void) | undefined;
    try {
      await Promise.race([
        work,
        new Promise<never>((_resolve, reject) => {
          abort = () => reject(signal.reason);
          signal.addEventListener('abort', abort, { once: true });
          if (signal.aborted) abort();
        }),
      ]);
    } finally {
      if (abort) signal.removeEventListener('abort', abort);
    }
  }
  private async runWorker(key: string, fetch: FetchAsset, observed: () => void) {
    let transfer: Transfer | undefined;
    for (;;) {
      const admission = await this.withState(async (state) => {
        const current = state.transfers[key];
        if (!current || current.owner !== this.owner || current.status === 'failed') return 'gone';
        if (this.closed || !count(current.interests)) {
          await this.remove(this.partial(key, current.owner, current.attempt));
          delete state.transfers[key];
          return 'gone';
        }
        if (
          Object.values(state.transfers).filter(
            (entry) => entry.status === 'active' || entry.status === 'stopping',
          ).length >= this.limits.maxConcurrent
        )
          return 'waiting';
        current.status = 'active';
        transfer = structuredClone(current);
        return 'active';
      });
      if (admission === 'gone') return;
      if (admission === 'active') break;
      await delay(50);
    }
    if (!transfer) throw new Error('Asset-cache transfer admission was lost.');
    const admitted = transfer;
    const temporary = this.partial(key, this.owner, admitted.attempt);
    const controller = new AbortController();
    const monitoring = new AbortController();
    const monitor = (async () => {
      while (!monitoring.signal.aborted) {
        await delay(100, undefined, { signal: monitoring.signal });
        const needed = await this.withState(
          (state) => count(state.transfers[key]?.interests ?? {}) > 0,
        );
        const size = await lstat(temporary)
          .then((file) => file.size)
          .catch((error: unknown) => {
            if (codeIs(error, 'ENOENT')) return 0;
            throw error;
          });
        if (!needed || size > admitted.reference.bytes)
          controller.abort(
            new Error('Asset transfer has no readers or exceeded its reserved bytes.'),
          );
      }
    })().catch((error: unknown) => {
      if (!monitoring.signal.aborted) controller.abort(error);
    });
    let operation: NetworkOperation | undefined;
    let renamed = false;
    try {
      await this.network.run(
        { timeoutMs: this.transferTimeoutMs, signal: controller.signal },
        async (current) => {
          operation = current;
          current.throwIfStopped();
          const sink = createWriteStream(temporary, { flags: 'wx', mode: 0o600 });
          const owned = ownNodeStream(current, sink);
          try {
            await current.wait(
              'body',
              () =>
                new Promise<void>((resolve, reject) => {
                  const clear = () => {
                    sink.off('open', opened);
                    sink.off('error', failed);
                    sink.off('close', closed);
                  };
                  const opened = () => {
                    clear();
                    resolve();
                  };
                  const failed = (error: Error) => {
                    clear();
                    reject(error);
                  };
                  const closed = () => {
                    clear();
                    reject(new Error('Asset cache sink closed before opening.'));
                  };
                  sink.once('open', opened);
                  sink.once('error', failed);
                  sink.once('close', closed);
                }),
            );
            current.throwIfStopped();
            await fetch(current, sink);
            current.throwIfStopped();
            await owned.closed;
            current.throwIfStopped();
            const before = await lstat(temporary);
            if (!before.isFile() || before.size !== admitted.reference.bytes)
              throw new Error('Downloaded asset size does not match its exact reference.');
            const hash = createHash('sha256');
            for await (const chunk of createReadStream(temporary, { signal: current.signal }))
              hash.update(chunk);
            current.throwIfStopped();
            if (hash.digest('hex') !== admitted.reference.sha256)
              throw new Error('Downloaded asset checksum does not match its exact reference.');
            await chmod(temporary, 0o400);
            current.throwIfStopped();
            await this.withState(async (state) => {
              const pending = state.transfers[key];
              current.throwIfStopped();
              if (
                !pending ||
                pending.owner !== this.owner ||
                pending.attempt !== admitted.attempt ||
                !count(pending.interests)
              )
                throw new Error('Asset transfer was cancelled before finalization.');
              await rename(temporary, this.file(key));
              renamed = true;
              const file = await lstat(this.file(key));
              // The same cross-process lock covers rename and this final fence.
              // Once registration admits the atomic state save, that local commit
              // may finish after observation ends; it must never be undone here.
              try {
                current.throwIfStopped();
              } catch (error) {
                await this.remove(this.file(key));
                renamed = false;
                throw error;
              }
              if (state.transfers[key] !== pending || !count(pending.interests))
                throw new Error('Asset transfer lost final publication ownership.');
              state.files[key] = {
                reference: admitted.reference,
                stamp: {
                  size: file.size,
                  mtimeMs: file.mtimeMs,
                  ctimeMs: file.ctimeMs,
                  ino: file.ino,
                },
                used: Date.now(),
                pins: pending.interests,
              };
              delete state.transfers[key];
            });
          } finally {
            owned.stop();
            await owned.closed;
          }
        },
      );
    } catch (error) {
      this.failures.set(key, error);
      observed();
      await this.withState((state) => {
        const pending = state.transfers[key];
        if (pending?.owner === this.owner && pending.attempt === admitted.attempt)
          pending.status = 'stopping';
      });
      // A bounded caller wait is independent from physical cleanup. Retain the
      // shared transfer reservation and local slot while a fetch/SDK/body ignores
      // cancellation; a later attempt gets neither its bytes nor its pathname.
      if (operation) await waitForOperationResources(operation);
      await this.withState(async (state) => {
        const pending = state.transfers[key];
        if (pending?.owner === this.owner && pending.attempt === admitted.attempt) {
          await this.remove(temporary);
          if (renamed && !state.files[key]) await this.remove(this.file(key));
          pending.status = 'failed';
        }
      });
    } finally {
      monitoring.abort();
      await monitor;
    }
  }
  private async verifyWarm(key: string, entry: CachedFile, signal: AbortSignal) {
    const path = this.file(key);
    const current = await lstat(path);
    if (!current.isFile() || current.size !== entry.reference.bytes)
      throw new Error('Cached asset is missing, altered or no longer a regular file.');
    if (
      current.size === entry.stamp.size &&
      current.ino === entry.stamp.ino &&
      current.mtimeMs === entry.stamp.mtimeMs &&
      current.ctimeMs === entry.stamp.ctimeMs
    )
      return;
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(path, { signal })) hash.update(chunk);
    const after = await lstat(path);
    if (
      hash.digest('hex') !== entry.reference.sha256 ||
      current.size !== after.size ||
      current.mtimeMs !== after.mtimeMs ||
      current.ctimeMs !== after.ctimeMs ||
      current.ino !== after.ino
    )
      throw new Error(
        'Cached asset failed integrity verification; release its readers and prune it before retrying.',
      );
    await this.withState((state) => {
      const existing = state.files[key];
      if (existing)
        existing.stamp = {
          size: after.size,
          mtimeMs: after.mtimeMs,
          ctimeMs: after.ctimeMs,
          ino: after.ino,
        };
    });
  }

  async acquire(
    reference: ArtifactReference,
    fetch: FetchAsset,
    signal?: AbortSignal,
  ): Promise<AssetCacheLease> {
    return this.readerNetwork.run(
      { timeoutMs: this.transferTimeoutMs, signal },
      async (operation) => {
        let lease: AssetCacheLease | undefined;
        // The final network guard can reject after this callback returns. Own
        // that handoff cleanup before returning a pinned lease: success transfers
        // it to the caller, while every other terminal cause releases it here.
        const handoff = new Promise<void>((resolve, reject) => {
          operation.signal.addEventListener(
            'abort',
            () => {
              const cause: unknown = operation.signal.reason;
              if (cause instanceof NetworkError && cause.kind === 'operation_closed') resolve();
              else Promise.resolve(lease?.release()).then(resolve, reject);
            },
            { once: true },
          );
        });
        void operation.wait('cleanup', () => handoff).catch(() => {});
        const acquired = await this.acquireWithin(reference, fetch, operation.signal);
        let released: Promise<void> | undefined;
        lease = { ...acquired, release: () => (released ??= acquired.release()) };
        try {
          operation.throwIfStopped();
          return lease;
        } catch (error) {
          await lease.release();
          throw error;
        }
      },
    );
  }
  private async acquireWithin(
    reference: ArtifactReference,
    fetch: FetchAsset,
    signal: AbortSignal,
  ): Promise<AssetCacheLease> {
    if (this.closed) throw new Error('Asset cache is closed.');
    assertArtifactReference(reference);
    if (reference.bytes > this.limits.maxBytes)
      throw new Error('Requested asset exceeds the configured cache byte allowance.');
    if (this.readers.size >= this.limits.maxEntries)
      throw new Error('Asset cache has reached its configured reader/queue allowance.');
    const exact = Object.freeze(structuredClone(reference));
    const key = keyFor(exact);
    const reader = randomUUID();
    const interestSignal = AbortSignal.any([...(signal ? [signal] : []), this.closing.signal]);
    interestSignal.throwIfAborted();
    this.readers.set(reader, key);
    this.readerCounts.set(key, this.interestCount(key) + 1);
    let acquired = false;
    try {
      await this.initialize();
      for (;;) {
        interestSignal.throwIfAborted();
        const result = await this.withState(async (state) => {
          const entry = state.files[key];
          if (entry) {
            if (!sameArtifact(entry.reference, exact))
              throw new Error('Conflicting cache metadata for the same exact artifact.');
            this.setInterest(state, key);
            entry.used = Date.now();
            return { kind: 'cached' as const, entry: structuredClone(entry) };
          }
          let transfer = state.transfers[key];
          if (!transfer) {
            await this.evictFor(state, exact);
            transfer = {
              reference: exact,
              owner: this.owner,
              attempt: randomUUID(),
              status: 'queued',
              interests: {},
            };
            state.transfers[key] = transfer;
            this.failures.delete(key);
          } else if (!sameArtifact(transfer.reference, exact))
            throw new Error('Conflicting pending artifact metadata.');
          this.setInterest(state, key);
          if (
            transfer.status === 'failed' ||
            transfer.status === 'stopping' ||
            this.failures.has(key)
          )
            return { kind: 'failed' as const };
          if (transfer.owner === this.owner) this.startWorker(key, fetch);
          return { kind: 'waiting' as const, owned: transfer.owner === this.owner };
        });
        interestSignal.throwIfAborted();
        if (result.kind === 'failed')
          throw new Error('Asset download failed; no partial bytes were published.', {
            cause: this.failures.get(key),
          });
        if (result.kind === 'cached') {
          await this.verifyWarm(key, result.entry, interestSignal);
          interestSignal.throwIfAborted();
          acquired = true;
          return { path: this.file(key), reference: exact, release: () => this.release(reader) };
        }
        const work = result.owned ? this.workerObservations.get(key) : undefined;
        if (work) await this.awaitWorker(work, interestSignal);
        else await delay(50, undefined, { signal: interestSignal });
      }
    } finally {
      if (!acquired) await this.release(reader);
    }
  }
  private async release(reader: string) {
    const key = this.readers.get(reader);
    if (!key) return;
    this.readers.delete(reader);
    const remaining = this.interestCount(key) - 1;
    if (remaining) this.readerCounts.set(key, remaining);
    else this.readerCounts.delete(key);
    if (this.initialization) {
      await this.initialization;
      await this.withState((state) => this.setInterest(state, key));
      if (!this.interestCount(key) && !this.workers.has(key)) this.failures.delete(key);
    }
  }
  async prune(): Promise<{ removedBytes: number; retainedBytes: number }> {
    if (this.closed) throw new Error('Asset cache is closed.');
    await this.initialize();
    return this.withState(async (state) => {
      let removedBytes = 0;
      for (const [key, entry] of Object.entries(state.files)) {
        if (count(entry.pins)) continue;
        await this.remove(this.file(key));
        removedBytes += entry.reference.bytes;
        delete state.files[key];
      }
      return { removedBytes, retainedBytes: this.reservedBytes(state) };
    });
  }
  async close(
    budget: { timeoutMs: number; signal?: AbortSignal } = { timeoutMs: 30_000 },
  ): Promise<void> {
    this.closePromise ??= this.finishClose();
    const result = await this.network.shutdown(budget, this.closePromise);
    if (result.unresolved)
      throw new Error(
        'Asset cache shutdown ended with owned transfers or metadata still unsettled.',
      );
    await this.closePromise;
  }
  private async finishClose(): Promise<void> {
    this.closed = true;
    this.closing.abort(new Error('Asset cache closed.'));
    this.readerNetwork.stop('shutdown');
    if (!this.initialization) return;
    await this.initialization;
    await this.readerNetwork.whenIdle();
    this.readers.clear();
    this.readerCounts.clear();
    await this.withState((state) => {
      for (const entry of Object.values(state.files)) delete entry.pins[this.owner];
      for (const entry of Object.values(state.transfers)) delete entry.interests[this.owner];
    });
    await Promise.allSettled(this.workers.values());
    await this.withState((state) => {
      delete state.owners[this.owner];
    });
  }
}
