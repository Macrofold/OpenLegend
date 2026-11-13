import type { Outcome } from '@open-legend/domain';
import type { NativeWorld } from '@open-legend/native-simulation';
import { copyNativeProduct } from './native-consumer.js';

/** A workflow result can outlive the publication's rows/history. Copy only this
 * small actual report under its own admission, including its string backing,
 * before Ready; a retained job must not pin the complete publication graph. */
export function copyNativeOutcome(
  world: Pick<NativeWorld, 'reserveConsumerBytes' | 'reserveConsumerJson'>,
  outcome: Outcome,
): Outcome {
  return copyNativeProduct(world, outcome);
}
