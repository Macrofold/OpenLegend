export const SHUTDOWN_DEADLINE_MS = 30_000;
export interface ShutdownReport {
  /** The final world save completed in this process. When false, a commit abandoned at its
   * deadline may still have reached the database; `durableRevision` is the last one confirmed. */
  saved: boolean;
  durableRevision: number;
  durableSimTime?: number;
  problems: string[];
}
