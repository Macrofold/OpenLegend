import { formatOrdinaryActivityView, type OrdinaryActivityViewInput } from '@open-legend/domain';

/** This finite capture already passed native physical/current/name admission.
 * Formatting uses the actual selected-world owner, without a WorldState, I/O,
 * paid provider or a new action permission. Its binding resumes only that cursor. */
export function nativeActivityDisplay(request: {
  binding: {
    candidateId: number;
    baseCut: number;
    generation: number;
    geometryRevision: number;
    serial: number;
  };
  profile: { id: string; version: number };
  input: OrdinaryActivityViewInput;
}) {
  return {
    binding: request.binding,
    view: formatOrdinaryActivityView(request.profile, request.input),
  };
}
