import type { NativeWorld } from '@open-legend/native-simulation';
import {
  attachNativeConsumer,
  encodeNativeJsonText,
  releaseNativeProduct,
} from './native-consumer.js';

export type NativeProviderCapacity = Pick<
  NativeWorld,
  'reserveConsumerBytes' | 'reserveConsumerJson'
>;

export interface NativeProviderAnswer {
  readonly json: string;
}

/** Provider continuations consume JSON text through their existing typed
 * boundary. Its new string owns its storage independently of the question or
 * SQL rows. The temporary encoder Buffer and V8 workspace end here. */
export function encodeNativeProviderAnswer(
  capacity: NativeProviderCapacity,
  value: unknown,
): NativeProviderAnswer {
  const encoded = encodeNativeJsonText(capacity, value);
  let allocation;
  try {
    allocation = capacity.reserveConsumerBytes(256);
    return attachNativeConsumer({ json: encoded.text }, allocation, encoded);
  } catch (error) {
    allocation?.release();
    throw error;
  } finally {
    releaseNativeProduct(encoded);
  }
}
