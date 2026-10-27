import { describe, expect, it } from 'vitest';
import { createSdkOwner, type SdkOperation } from './sdk.js';
import type { NetworkClock, NetworkScheduler } from './lifetime.js';
class Time implements NetworkClock, NetworkScheduler {
  wall = 1000;
  mono = 0;
  callbacks = new Set<() => void>();
  wallNow = () => this.wall;
  monotonicNow = () => this.mono;
  schedule = (_delay: number, callback: () => void) => {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  };
  advance(ms: number) {
    this.wall += ms;
    this.mono += ms;
    for (const callback of [...this.callbacks]) {
      this.callbacks.delete(callback);
      callback();
    }
  }
}
function pending<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
async function flush() {
  for (let i = 0; i < 15; i++) await Promise.resolve();
}

describe('the minimal scalar SDK owner', () => {
  it('shares the deadline kernel and retains ignored SDK work through actual settlement', async () => {
    const time = new Time();
    const owner = createSdkOwner({ role: 'fixture', capacity: 1, clock: time, scheduler: time });
    const raw = pending<string>();
    let starts = 0;
    const result = owner
      .run({ timeoutMs: 10 }, (operation) =>
        operation.wait('credentials', () => {
          starts++;
          return raw.promise;
        }),
      )
      .catch((error: unknown) => error);
    time.advance(10);
    expect(await result).toMatchObject({ kind: 'deadline_exceeded' });
    for (let i = 0; i < 1000; i++)
      await expect(owner.run({ timeoutMs: 10 }, async () => starts++)).rejects.toMatchObject({
        kind: 'capacity_unavailable',
      });
    expect(starts).toBe(1);
    expect(owner.snapshot().occupied).toBe(1);
    raw.resolve('late');
    await flush();
    expect(owner.snapshot().occupied).toBe(0);
    expect(time.callbacks.size).toBe(0);
  });
  it('retains an expired publication callback until it actually ends and rejects retained handles', async () => {
    const time = new Time();
    const owner = createSdkOwner({ role: 'fixture', capacity: 1, clock: time, scheduler: time });
    const callback = pending<void>();
    let saved: SdkOperation | undefined;
    let publications = 0;
    const result = owner
      .run({ timeoutMs: 10 }, async (operation) => {
        saved = operation;
        await callback.promise;
        operation.throwIfStopped();
        publications++;
      })
      .catch((error: unknown) => error);
    time.advance(10);
    expect(await result).toMatchObject({ kind: 'deadline_exceeded' });
    expect(owner.snapshot().occupied).toBe(1);
    callback.resolve();
    await flush();
    expect(publications).toBe(0);
    expect(owner.snapshot().occupied).toBe(0);
    expect(() => saved?.wait('credentials', async () => 'forbidden')).toThrow();
  });
  it('checks both clocks and rejects preexpired work before invocation', async () => {
    const time = new Time();
    const owner = createSdkOwner({ role: 'fixture', capacity: 1, clock: time, scheduler: time });
    let starts = 0;
    await expect(
      owner.run({ timeoutMs: 10, deadlineAtMs: time.wall }, async () => starts++),
    ).rejects.toMatchObject({ kind: 'deadline_exceeded', dispatch: 'not_started' });
    expect(starts).toBe(0);
    const raw = pending<string>();
    const result = owner
      .run({ timeoutMs: 10 }, (operation) => operation.wait('credentials', () => raw.promise))
      .catch((error: unknown) => error);
    time.wall -= 1000;
    time.mono += 11;
    raw.resolve('late-after-clock-change');
    expect(await result).toMatchObject({ kind: 'deadline_exceeded' });
    await flush();
    expect(owner.snapshot().occupied).toBe(0);
  });
  it('closes a successful operation before returning and never permits reuse', async () => {
    const time = new Time();
    const owner = createSdkOwner({ role: 'fixture', capacity: 1, clock: time, scheduler: time });
    let operation: SdkOperation | undefined;
    await expect(
      owner.run({ timeoutMs: 10 }, async (current) => {
        operation = current;
        return current.wait('credentials', async () => 'ok');
      }),
    ).resolves.toBe('ok');
    expect(operation?.signal.aborted).toBe(true);
    expect(() => operation?.throwIfStopped()).toThrow();
    expect(owner.snapshot().occupied).toBe(0);
  });

  it('refuses a second SDK dispatch while the first raw request is unsettled', async () => {
    const time = new Time();
    const owner = createSdkOwner({ role: 'fixture', capacity: 1, clock: time, scheduler: time });
    const raw = pending<string>();
    let secondStarts = 0;
    const result = owner.run({ timeoutMs: 10 }, async (operation) => {
      const first = operation.wait('credentials', () => raw.promise);
      expect(() =>
        operation.wait('credentials', async () => {
          secondStarts++;
          return 'forbidden';
        }),
      ).toThrow(expect.objectContaining({ kind: 'capacity_unavailable' }));
      raw.resolve('ok');
      return first;
    });
    await expect(result).resolves.toBe('ok');
    expect(secondStarts).toBe(0);
    expect(owner.snapshot().occupied).toBe(0);
  });
});
