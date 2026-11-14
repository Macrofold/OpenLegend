import type { NativeWorld } from '@open-legend/native-simulation';
import { encodeNativeJson } from './native-consumer.js';

export type NativeProviderCapacity = Pick<
  NativeWorld,
  'reserveConsumerBytes' | 'reserveConsumerJson'
>;

export type NativeProviderAnswer = Buffer;

/** Emits the local continuation's UTF-8 answer once under its own admission.
 * The caller retains this Buffer until the native answer settles, then releases
 * it independently of the question and SQL inputs. The worker copies its input. */
export function encodeNativeProviderAnswer(
  capacity: NativeProviderCapacity,
  value: unknown,
): NativeProviderAnswer {
  return encodeNativeJson(capacity, value);
}
