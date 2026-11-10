import type { Outcome } from '@open-legend/domain';
import type { NativeWorld, NativeWorldConsumer } from '@open-legend/native-simulation';
import { attachNativeConsumer, encodeNativeJson, releaseNativeProduct } from './native-consumer.js';

/** A workflow result can outlive the publication's rows/history. Copy only this
 * small actual report under its own admission, including its string backing,
 * before Ready; a retained job must not pin the complete publication graph. */
export function copyNativeOutcome(
  world: Pick<NativeWorld, 'reserveConsumerBytes' | 'reserveConsumerJson'>,
  outcome: Outcome,
): Outcome {
  const encoded = encodeNativeJson(world, outcome);
  let allocation: NativeWorldConsumer | undefined;
  try {
    allocation = world.reserveConsumerJson(encoded);
    const copy = JSON.parse(encoded.toString('utf8')) as Outcome;
    return attachNativeConsumer(copy, allocation);
  } catch (error) {
    allocation?.release();
    throw error;
  } finally {
    releaseNativeProduct(encoded);
  }
}
