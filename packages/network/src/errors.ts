export type NetworkPhase =
  | 'admission'
  | 'credentials'
  | 'connect'
  | 'body'
  | 'callback'
  | 'cleanup'
  | 'subprocess';

export type NetworkFailureKind =
  | 'cancelled'
  | 'deadline_exceeded'
  | 'capacity_unavailable'
  | 'operation_closed'
  | 'transport_error'
  | 'body_too_large'
  | 'body_length_mismatch'
  | 'invalid_encoding'
  | 'invalid_stream';

/** Safe to log: never includes a URL, response body or arbitrary rejection text. */
export class NetworkError extends Error {
  readonly name = 'NetworkError';

  constructor(
    readonly kind: NetworkFailureKind,
    readonly phase: NetworkPhase,
    readonly dispatch: 'not_started' | 'started' = 'not_started',
    readonly status?: number,
  ) {
    super(`Network ${kind} during ${phase}`);
  }
}

export function networkError(
  error: unknown,
  phase: NetworkPhase,
  dispatch: 'not_started' | 'started',
  status?: number,
): NetworkError {
  return error instanceof NetworkError
    ? status === undefined || error.status !== undefined
      ? error
      : new NetworkError(error.kind, error.phase, error.dispatch, status)
    : new NetworkError('transport_error', phase, dispatch, status);
}
