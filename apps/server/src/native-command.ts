import { canonicalJson, type Command } from '@open-legend/domain';

/** The ordinary receipt codec formats one already selected native command.
 * It reads no world, changes no binding and grants no execution authority. */
export function nativeCanonicalCommand(request: {
  binding: {
    candidateId: number;
    baseCut: number;
    generation: number;
    geometryRevision: number;
    serial: number;
  };
  command: Command;
}) {
  return { binding: request.binding, canonical: canonicalJson(request.command) };
}
