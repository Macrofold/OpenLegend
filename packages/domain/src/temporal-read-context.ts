import type { WorldState } from './types.js';
import type { ReceivedValueLookup } from './received-values.js';
import type { TemporalChunk } from './temporal-evidence.js';
import {
  selectedRecognitionSupportReader,
  selectedRecognitionSupportSourceIds,
} from './world-composition.js';

/** A selected actor's immutable disclosure snapshot, never a partial world.
 * docs/projects/attention-and-scenes-runtime-design.md#72-exact-requestanswer-sequence */
export interface TemporalReadContext {
  readonly actorId: string;
  readonly forgotten: ReadonlySet<string>;
  readonly corrected: ReadonlySet<string>;
  readonly recognitionSupportSourceIds: (keys: readonly string[]) => string[];
}
export interface CapturedTemporalHistoryContext {
  readonly actorId: string;
  readonly maximumOperations?: number;
  readonly maximumCandidates?: number;
  readonly at?: number;
  readonly maxAgeSeconds?: number;
  readonly chunks: readonly TemporalChunk[];
  readonly releasedThrough?: number;
  readonly recordingGap?: { readonly from: number; readonly through: number };
  readonly sources: ReceivedValueLookup;
  readonly disclosure: TemporalReadContext;
}
export type TemporalReadSource = WorldState | TemporalReadContext;

export function captureTemporalReadContext(
  world: WorldState,
  actorId: string,
): TemporalReadContext {
  return {
    actorId,
    forgotten: new Set(world.experience?.forgotten[actorId] ?? []),
    corrected: new Set(Object.keys(world.experience?.corrections?.[actorId] ?? {})),
    recognitionSupportSourceIds: selectedRecognitionSupportReader(world),
  };
}

export function temporalRecognitionSupportSourceIds(
  source: TemporalReadSource,
  keys: readonly string[],
): string[] {
  return 'recognitionSupportSourceIds' in source
    ? source.recognitionSupportSourceIds(keys)
    : selectedRecognitionSupportSourceIds(source, keys);
}

export function temporalReadSourceRevoked(
  source: TemporalReadSource,
  actorId: string,
  id: string,
): boolean {
  if ('recognitionSupportSourceIds' in source)
    return source.actorId !== actorId || source.forgotten.has(id) || source.corrected.has(id);
  return (
    (source.experience?.forgotten[actorId] ?? []).includes(id) ||
    Object.hasOwn(source.experience?.corrections?.[actorId] ?? {}, id)
  );
}
