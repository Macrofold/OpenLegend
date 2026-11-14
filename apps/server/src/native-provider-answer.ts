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

/** Encodes a local provider answer to UTF-8, then decodes it to an independently
 * funded JS string. Byte-taking continuations encode that string again. The
 * temporary buffer and workspace end here. The caller releases the answer when
 * its provider turn settles, independently of the question and any SQL rows. */
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
