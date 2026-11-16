import type { NativeWorld } from '@open-legend/native-simulation';
import {
  decodeNativeProduct,
  freezeNativeProduct,
  retainNativeSources,
} from './native-consumer.js';

export interface NativeRetainedValues {
  readonly worldId: string;
  readonly generation: string;
  readonly acceptedCut: number;
  /** Restore preparation supplies prospective IDs before the active world has
   * issued a membership revision. Its first refresh requests the full set. */
  readonly membershipRevision?: number;
  /** The actual decoded membership object doubles as SQL's lookup. Its own
   * admission covers the keys/backing; no second Node index is constructed. */
  readonly ids: Readonly<Record<string, true>>;
}

interface KnownMembership {
  readonly acceptedCut: number;
  readonly membershipRevision: number;
}

export function captureNativeRetainedValues(world: NativeWorld): Promise<NativeRetainedValues>;
export function captureNativeRetainedValues(
  world: NativeWorld,
  known: KnownMembership | undefined,
): Promise<NativeRetainedValues | undefined>;
/** Export protection only after actual membership changes. The service may
 * supply a prior revision from this world generation and its expected cut.
 * A hit preserves the prior lookup owner, including independent SQL borrows. */
export async function captureNativeRetainedValues(
  world: NativeWorld,
  known?: KnownMembership,
): Promise<NativeRetainedValues | undefined> {
  const output = await world.retainedValues(known?.acceptedCut, known?.membershipRevision);
  if (!output) {
    if (!known) throw new Error('Native value protection requires the initial lookup.');
    return undefined;
  }
  const captured = freezeNativeProduct(decodeNativeProduct<NativeRetainedValues>(output));
  // The SQL collector can retain just this lookup after the service refreshes
  // its root. Keep the actual decoded keys/backing admitted for that lifetime.
  retainNativeSources(captured.ids, captured);
  return captured;
}
