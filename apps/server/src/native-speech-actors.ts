import type { NativeHost, NativeWorldConsumer } from '@open-legend/native-simulation';

type Entry = {
  id: string;
  readonly actorId: string;
  readonly allocation: NativeWorldConsumer;
};

/** Recent job disclosure needs the speech address and its author, without
 * keeping the publication or personal account that supplied them alive. */
export class NativeSpeechActors {
  private readonly entries = new Map<string, Entry>();

  constructor(
    private readonly budget: Pick<NativeHost, 'reserveConsumerBytes'>,
    private readonly maximum: number,
  ) {}

  get(id: string): string | undefined {
    return this.entries.get(id)?.actorId;
  }

  prepare<T>(
    sources: readonly T[],
    address: (source: T) => string,
    author: (source: T) => string | undefined,
  ): { accept: () => void; release: () => void } | undefined {
    if (!sources.length) return undefined;
    let staged: Entry[] | undefined;
    let frame: NativeWorldConsumer | undefined;
    const release = () => {
      if (staged) for (const entry of staged) entry.allocation.release();
      staged = undefined;
      frame?.release();
      frame = undefined;
    };
    try {
      for (const source of sources) {
        const actorId = author(source);
        if (!actorId) continue;
        if (!staged) {
          frame = this.budget.reserveConsumerBytes(512);
          staged = [];
        }
        const id = address(source);
        // Cover Map growth/rehash and the staged slot, two independent
        // UTF-16 strings, and the temporary buffer used to detach each leaf.
        const allocation = this.budget.reserveConsumerBytes(512 + 4 * (id.length + actorId.length));
        try {
          staged.push({
            id: Buffer.from(id, 'utf16le').toString('utf16le'),
            actorId: Buffer.from(actorId, 'utf16le').toString('utf16le'),
            allocation,
          });
        } catch (error) {
          allocation.release();
          throw error;
        }
      }
      if (!staged) return undefined;
      return {
        accept: () => {
          if (!staged) return;
          for (const entry of staged) {
            const before = this.entries.get(entry.id);
            // Map.set retains an existing key and its insertion position.
            if (before) entry.id = before.id;
            this.entries.set(entry.id, entry);
            before?.allocation.release();
          }
          while (this.entries.size > this.maximum) {
            const oldest = this.entries.values().next().value!;
            this.entries.delete(oldest.id);
            oldest.allocation.release();
          }
          staged = undefined;
          release();
        },
        release,
      };
    } catch (error) {
      release();
      throw error;
    }
  }

  clear(): void {
    for (const entry of this.entries.values()) entry.allocation.release();
    this.entries.clear();
  }
}
