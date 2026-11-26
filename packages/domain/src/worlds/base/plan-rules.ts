/** The bundled world's ordinary chosen-work reports. The agency mechanism and
 * compiled ordinary family consume these same words and account importance. */
export const BASE_PLAN_RULES = {
  // The first compiled requested-activity slice binds this existing family;
  // Source's general activity executor still consumes its full catalogue.
  requestedMovementFamily: 'move',
  invalidIdentity: {
    code: 'invalid-plan',
    message: 'Plan and child identities must be valid and unique.',
  },
  stalePlan: { code: 'stale-plan', message: 'Refresh the changed plan before editing it.' },
  invalidGoal: {
    code: 'invalid-goal',
    message: 'A plan requires an active goal belonging to this actor.',
  },
  stepLimit: { code: 'plan-limit', message: 'A frontier needs one to eight steps.' },
  unsupportedCapability: {
    code: 'unsupported-capability',
    message: 'This world does not install a requested action.',
  },
  invalidCommand: { code: 'invalid-plan', message: 'Only native physical work can be queued.' },
  watch: {
    defaultSeconds: 3600,
    maximumSeconds: 86400,
    unavailable: {
      code: 'watch-unavailable',
      message: 'Choose someone you recognize and a place you know before starting a watch.',
    },
    expired: {
      code: 'watch-expired',
      message: 'The watch ended without a confirmed sighting. The planned action did not start.',
    },
    withdrawn: {
      code: 'watch-withdrawn',
      message: 'The person or place could no longer be confirmed for this watch.',
    },
    waiting: { code: 'watching', message: 'The action is ready when you see them there.' },
  },
  chosenActivityActive: {
    code: 'chosen-activity-active',
    message:
      'Finish this chosen activity or explicitly replace or interrupt it before adding other work.',
  },
  invalidOutputs: {
    code: 'invalid-plan',
    message: 'Item references require an earlier single-output native step.',
  },
  planBlocked: {
    code: 'plan-blocked',
    message: 'Explicitly replace or cancel the blocked frontier.',
  },
  frontierFull: { code: 'plan-limit', message: 'Frontier is full or belongs to a different goal.' },
  queued: { code: 'queued', message: 'Native work queued; it has not completed.' },
  actorUnavailable: { code: 'actor-unavailable', message: 'This actor is unavailable.' },
  notChosenPlan: {
    code: 'cannot-pause',
    message: 'This work is not a chosen plan that can be paused; replace it or let it finish.',
  },
  alreadyPaused: {
    code: 'already-paused',
    message: 'Other paused work is already waiting to resume; let it resume, or replace it.',
  },
  pauseTooOften: { code: 'cannot-pause', message: 'This work has been paused too many times.' },
  pauseState: 'This state cannot be paused.',
  pauseAttack: 'An attack already under way cannot be paused; let it finish or replace it.',
  pauseMaterials: 'Materials are already in use for this step; let it finish or replace it.',
  pausedStep: { code: 'paused', message: 'Paused for other work; this step restarts later.' },
  pausedRestart: {
    code: 'paused',
    message: 'Paused for other work; restarted later as a new step.',
  },
  inactiveGoalReason: 'its goal is no longer active.',
  changedTargetReason: 'a target is no longer the one I saw.',
  missingObjectReason: 'something the activity uses no longer exists.',
  stalePaused: { code: 'stale-plan', message: 'That paused work has ended or changed.' },
  resumeRefusedPrefix: 'Could not resume: ',
  returnedFromIntervention: {
    code: 'cancelled',
    message: 'Ended by choice to return to paused work; committed effects remain.',
  },
  pausedWorkName: 'my paused work',
  resumeBlocked: ' paused work ({name}) could not resume: {reason} Nothing more of it was done.',
  resumed: ' paused work ({name}) resumed. The stopped step restarts from its beginning.',
  stoppedSummary:
    ' chosen work was cancelled at simulation time {time}. {queued} queued steps never started. Previously committed effects and costs remain; no further result is claimed.',
  discardedPaused: { code: 'cancelled', message: 'Paused work was cancelled; it will not resume.' },
  cancelledStep: { code: 'cancelled', message: 'Cancelled; committed costs remain spent.' },
  interruptedStep: {
    code: 'interrupted',
    message: 'Native work was interrupted; explicitly revise the frontier.',
  },
  staleEncounter: {
    code: 'stale-encounter',
    message: 'The queued target encounter changed. Revise the plan.',
  },
  missingOutput: {
    code: 'missing-plan-output',
    message: 'The earlier step has no completed item output. Revise the plan.',
  },
  fallbackResultSummary:
    'The requested action ({purpose}) {status}: {message} Result code: {code}.',
  completedResult: 'reported completion',
  refusedResult: 'was refused',
  resultImportance: 5,
  controlImportance: 6,
} as const;
/** Only the bundled watch method's admitted terms belong in this instruction. */
export const BASE_WATCH_TERM_INSTRUCTIONS =
  'With one offered walk, you can wait until you see a person you recognize at an exact place you know. Use their current reference and the complete familiar place name. A sighting waits for a new sighting. Presence can report what is already true or wait for a change.';
