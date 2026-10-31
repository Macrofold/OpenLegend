import { describe, expect, it } from 'vitest';
import { createLabReadAdmission } from './read-admission';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => (resolve = done));
  return { promise, resolve };
}

describe('lab view read admission', () => {
  it('bounds pane fanout and removes an obsolete queued read before transport', async () => {
    const admit = createLabReadAdmission();
    const gate = deferred();
    const obsolete = new AbortController();
    const started: number[] = [];
    let active = 0;
    let maximum = 0;
    const read = (id: number, signal = new AbortController().signal) =>
      admit(signal, async () => {
        started.push(id);
        active++;
        maximum = Math.max(maximum, active);
        await gate.promise;
        active--;
      });
    const reads = Array.from({ length: 18 }, (_, id) =>
      read(id, id === 7 ? obsolete.signal : undefined),
    );
    const refused = expect(reads[7]).rejects.toMatchObject({ name: 'AbortError' });
    await Promise.resolve();
    expect(started).toEqual([0, 1, 2, 3]);
    obsolete.abort();
    await refused;
    gate.resolve();
    await Promise.all(reads.filter((_, id) => id !== 7));
    expect(maximum).toBe(4);
    expect(started).toHaveLength(17);
    expect(started).not.toContain(7);
  });

  it('has finite waiting room and drains failures without replaying an active read', async () => {
    const admit = createLabReadAdmission();
    const gate = deferred();
    const queued = new AbortController();
    let starts = 0;
    const running = Array.from({ length: 4 }, () =>
      admit(new AbortController().signal, async () => {
        starts++;
        await gate.promise;
        throw new Error('Original read failed.');
      }),
    );
    const waiting = Array.from({ length: 32 }, () => admit(queued.signal, async () => starts++));
    const settlements = Promise.allSettled([...running, ...waiting]);
    await expect(admit(new AbortController().signal, async () => starts++)).rejects.toThrow(
      'Too many lab views are waiting.',
    );
    queued.abort();
    gate.resolve();
    await settlements;
    expect(starts).toBe(4);
    await expect(admit(new AbortController().signal, async () => 'Fresh read.')).resolves.toBe(
      'Fresh read.',
    );
  });
});
