import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AiDirector } from './ai-director.js';
import type { Autosaves } from './autosaves.js';
import type { WorldService } from './world-service.js';
import { WorldClock } from './world-runtime.js';

afterEach(() => vi.useRealTimers());

function clockFixture() {
  vi.useFakeTimers();
  const tick = vi.fn(async (_elapsed: number, _excluded: number, _options: unknown) => false);
  const useMonotonicClock = vi.fn();
  const service = {
    clockStartedAt: 0,
    tick,
    useMonotonicClock,
    notify: vi.fn(),
  } as unknown as WorldService;
  const director = { considerThought: vi.fn(async () => {}) } as unknown as AiDirector;
  const autosaves = { advance: vi.fn() } as unknown as Autosaves;
  return { clock: new WorldClock(service, () => director, autosaves), tick, useMonotonicClock };
}

describe('shared host clock', () => {
  it('selects timestamped admission before its first automatic native offer', async () => {
    const h = clockFixture();
    try {
      h.clock.start();
      expect(h.useMonotonicClock).toHaveBeenCalledOnce();
      expect(h.tick).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(50);
      await h.clock.idle();
      expect(h.tick).toHaveBeenCalledOnce();
      expect(h.tick.mock.calls[0]?.[2]).toMatchObject({
        drain: false,
        offeredUntil: expect.any(Number),
      });
    } finally {
      h.clock.stop();
    }
  });

  it('coalesces navigation wakeups without reentering publication or waking after stop', async () => {
    const h = clockFixture();
    h.clock.start();
    h.clock.requestWake();
    h.clock.requestWake();
    h.clock.requestWake();
    expect(h.tick).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await h.clock.idle();
    expect(h.tick).toHaveBeenCalledOnce();
    h.clock.stop();
    h.clock.requestWake();
    await vi.advanceTimersByTimeAsync(100);
    expect(h.tick).toHaveBeenCalledOnce();
  });

  it('keeps a queued navigation wake behind an inspection boundary', async () => {
    const h = clockFixture();
    try {
      h.clock.start();
      h.clock.requestWake();
      const release = h.clock.holdBoundary();
      await vi.advanceTimersByTimeAsync(100);
      expect(h.tick).not.toHaveBeenCalled();
      release();
      await h.clock.idle();
      expect(h.tick).toHaveBeenCalledOnce();
      expect(h.tick.mock.calls[0]?.[0]).toBe(0);
    } finally {
      h.clock.stop();
    }
  });
});
