import { canonicalJson, jsonByteLength } from '@open-legend/domain';
import type { NativeHost, NativeWorldConsumer } from '@open-legend/native-simulation';
import type { NativePlayerRead } from './native-player-view.js';
import {
  attachNativeConsumer,
  nativeCanonicalJsonWorkspace,
  nativeJsonEncodingWorkspace,
  releaseNativeProduct,
} from './native-consumer.js';

type Admission = Pick<NativeHost, 'reserveConsumerBytes'>;
type Entry = {
  readonly key: string;
  readonly bindings: string;
  readonly details: string;
  readonly bindingRevision: number;
  readonly detailRevision: number;
  readonly guard: NativeWorldConsumer;
};

/** Two exact private-self signatures produce display revision numbers only.
 * Strings and table backing have independent service lifetimes; no actor body,
 * publication or scope graph is retained by this small operational cache. */
export class NativeInventoryReads {
  private readonly entries = new Map<string, Entry>();
  private revision = 0;
  private constructor(
    private budget: Admission | undefined,
    private readonly maximum: number,
    private storage: NativeWorldConsumer | undefined,
  ) {}

  static capture(budget: Admission, maximum: number): NativeInventoryReads {
    // Bounded Map backing (including growth/rehash overlap), owning class,
    // and one prospective entry coexist with the current entries.
    const storage = budget.reserveConsumerBytes((maximum + 3) * 256);
    try {
      return new NativeInventoryReads(budget, maximum, storage);
    } catch (error) {
      storage.release();
      throw error;
    }
  }

  read(
    key: string,
    self: NativePlayerRead['self'],
    paused: boolean,
  ): Pick<Entry, 'bindingRevision' | 'detailRevision'> {
    const budget = this.budget;
    if (!budget) throw new Error('Native inventory read revisions were released.');
    // The exact existing two Source input tuples contain 3 + 10 borrowed values.
    const frame = budget.reserveConsumerBytes(2 * 256 + 13 * 8);
    let output: NativeWorldConsumer | undefined;
    let workspace: NativeWorldConsumer | undefined;
    let selected: Pick<Entry, 'bindingRevision' | 'detailRevision'> | undefined;
    let returned = false;
    let used = false;
    try {
      const bindings = [self.player.inventoryRevision, self.player.body, self.player.equipped];
      const details = [
        self.position,
        self.heading,
        self.attributes,
        self.statusEffects,
        self.action,
        self.player.body,
        self.player.knowledgeRevision,
        self.alive,
        self.incapacitated,
        paused,
      ];
      const shape = Math.max(
        nativeJsonEncodingWorkspace(bindings),
        nativeJsonEncodingWorkspace(details),
      );
      const measuring = budget.reserveConsumerBytes(shape + 256);
      let bindingBytes: number, detailBytes: number;
      try {
        bindingBytes = jsonByteLength(bindings, { cache: false });
        detailBytes = jsonByteLength(details, { cache: false });
      } finally {
        measuring.release();
      }
      output = budget.reserveConsumerBytes(256 + 2 * (key.length + bindingBytes + detailBytes));
      // Eight-wire overlap covers a Unicode leaf's doubled JSON.stringify
      // builder/result, input flattening and the canonical parent joins. The
      // retained result strings already have their separate output allowance.
      workspace = budget.reserveConsumerBytes(
        Math.max(
          nativeCanonicalJsonWorkspace(bindings, bindingBytes),
          nativeCanonicalJsonWorkspace(details, detailBytes),
        ),
      );
      const bindingText = canonicalJson(bindings),
        detailText = canonicalJson(details),
        before = this.entries.get(key);
      const bindingChanged = !before || before.bindings !== bindingText,
        detailChanged = !before || before.details !== detailText;
      if (!bindingChanged && !detailChanged) {
        selected = this.selected(budget, before);
        returned = true;
        return selected;
      }
      const next = this.revision + Number(bindingChanged) + Number(detailChanged);
      if (!Number.isSafeInteger(next)) throw new Error('Player read revision exhausted.');
      let revision = this.revision;
      const after: Entry = {
        // Map.set preserves an existing key's backing and insertion order.
        key: before?.key ?? key,
        bindings: bindingText,
        details: detailText,
        bindingRevision: bindingChanged ? ++revision : before.bindingRevision,
        detailRevision: detailChanged ? ++revision : before.detailRevision,
        guard: output,
      };
      selected = this.selected(budget, after);
      if (!before && this.entries.size >= this.maximum) {
        const oldest = this.entries.values().next().value!;
        this.entries.delete(oldest.key);
        oldest.guard.release();
      }
      this.entries.set(after.key, after);
      used = true;
      this.revision = revision;
      before?.guard.release();
      returned = true;
      return selected;
    } finally {
      if (!returned && selected) releaseNativeProduct(selected);
      if (!used) output?.release();
      workspace?.release();
      frame.release();
    }
  }

  private selected(
    budget: Admission,
    entry: Entry,
  ): Pick<Entry, 'bindingRevision' | 'detailRevision'> {
    const guard = budget.reserveConsumerBytes(256);
    try {
      return attachNativeConsumer(
        { bindingRevision: entry.bindingRevision, detailRevision: entry.detailRevision },
        guard,
      );
    } catch (error) {
      guard.release();
      throw error;
    }
  }

  clear(): void {
    for (const entry of this.entries.values()) entry.guard.release();
    this.entries.clear();
  }
  release(): void {
    this.clear();
    this.storage?.release();
    this.storage = undefined;
    this.budget = undefined;
  }
}
