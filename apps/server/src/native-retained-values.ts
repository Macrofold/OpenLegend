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
  /** The actual decoded membership object doubles as SQL's lookup. Its own
   * admission covers the keys/backing; no second Node index is constructed. */
  readonly ids: Readonly<Record<string, true>>;
}

export async function captureNativeRetainedValues(world: NativeWorld) {
  const captured = freezeNativeProduct(
    decodeNativeProduct<NativeRetainedValues>(await world.retainedValues()),
  );
  // The SQL collector can retain just this lookup after the service refreshes
  // its root. Keep the actual decoded keys/backing admitted for that lifetime.
  retainNativeSources(captured.ids, captured);
  return captured;
}
