// Authored sharing policy for the bundled world, not a universal consent law.
// docs/worlds/base/social.md#offering-and-accepting-possessions
export const BASE_HANDOVER = {
  /** Game seconds an unanswered offer stays open: 30 wall seconds at 1×, 3.75 at 8×. */
  offerSeconds: 1800,
  /** Pending offers one person may hold out at once. */
  pendingPerOfferer: 3,
} as const;
