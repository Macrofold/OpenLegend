import type { NativeHost, NativeWorldConsumer } from '@open-legend/native-simulation';
import type { GameView } from '@open-legend/protocol';
import { attachNativeConsumer, releaseNativeProduct } from './native-consumer.js';

type Admission = Pick<NativeHost, 'reserveConsumerBytes'>;
type Profile = GameView['profile'];
type Entry = {
  readonly key: string;
  guard?: NativeWorldConsumer;
  pending?: Promise<void>;
  value?: Profile;
  cached: boolean;
  loading: boolean;
  borrowers: number;
};

/** UI preferences are operational data. A cache entry owns its small copied
 * profile; each actual reader gets an independent pin before eviction or a
 * restore can release the cache's holder. No profile is world authority. */
export class NativePlayerProfiles {
  private readonly entries = new Map<string, Entry>();
  private constructor(
    private budget: Admission | undefined,
    private readonly maximum: number,
    private storage: NativeWorldConsumer | undefined,
  ) {}

  static capture(budget: Admission, maximum: number): NativePlayerProfiles {
    // Bounded table backing, including growth/rehash overlap and one new entry.
    const storage = budget.reserveConsumerBytes((maximum + 3) * 256);
    try {
      return new NativePlayerProfiles(budget, maximum, storage);
    } catch (error) {
      storage.release();
      throw error;
    }
  }

  read(key: string, source: () => Promise<Profile>): Promise<Profile> {
    const budget = this.budget;
    if (!budget) throw new Error('Native player profiles were released.');
    // Admit this actual awaiting reader before constructing its continuation.
    const frame = budget.reserveConsumerBytes(512);
    let entry = this.entries.get(key);
    try {
      if (!entry) {
        const guard = budget.reserveConsumerBytes(512 + 2 * key.length);
        entry = { key, guard, cached: true, loading: true, borrowers: 0 };
        while (this.entries.size >= this.maximum) this.remove(this.entries.values().next().value!);
        this.entries.set(key, entry);
        entry.pending = this.load(entry, source);
      }
      entry.borrowers++;
      return this.borrow(entry, budget, frame);
    } catch (error) {
      frame.release();
      throw error;
    }
  }

  private async load(entry: Entry, source: () => Promise<Profile>): Promise<void> {
    try {
      entry.value = await source();
    } catch (error) {
      this.remove(entry);
      throw error;
    } finally {
      // A settled promise carries no profile result; clearing value later must
      // actually end the graph, even when an old waiter retains its promise.
      entry.pending = undefined;
      entry.loading = false;
      this.finish(entry);
    }
  }

  private async borrow(
    entry: Entry,
    budget: Admission,
    frame: NativeWorldConsumer,
  ): Promise<Profile> {
    try {
      await entry.pending;
      if (!this.budget) throw new Error('Native player profiles were released.');
      const value = entry.value!;
      const guard = budget.reserveConsumerBytes(256);
      try {
        return attachNativeConsumer(
          { id: value.id, revision: value.revision, preferences: value.preferences },
          guard,
          value,
        );
      } catch (error) {
        guard.release();
        throw error;
      }
    } finally {
      entry.borrowers--;
      this.finish(entry);
      frame.release();
    }
  }

  private finish(entry: Entry): void {
    if (entry.cached || entry.loading || entry.borrowers) return;
    if (entry.value) releaseNativeProduct(entry.value);
    entry.value = undefined;
    entry.guard?.release();
    entry.guard = undefined;
  }

  private remove(entry: Entry): void {
    if (this.entries.get(entry.key) === entry) this.entries.delete(entry.key);
    entry.cached = false;
    this.finish(entry);
  }

  clear(): void {
    for (const entry of this.entries.values()) this.remove(entry);
  }
  release(): void {
    this.clear();
    this.storage?.release();
    this.storage = undefined;
    this.budget = undefined;
  }
}
