/** Wording for the bundled world's ordinary movement, status and cancellation
 * families. Source and the compiled native family consume this same data. */
export const BASE_ORDINARY_ACTION_RULES = {
  id: 'wilderness:ordinary-action-rules',
  version: 1,
  invalidCommand: {
    code: 'invalid-command',
    message: 'A command needs bounded actor and command IDs.',
  },
  unknownActor: { code: 'unknown-actor', message: 'That actor does not exist.' },
  inactive: { code: 'inactive', message: 'Return to the world before acting.' },
  actionsRestricted: {
    code: 'capability-restricted',
    message: 'This actor cannot act in its current state.',
  },
  speechRestricted: { code: 'capability-restricted', message: 'Speech is unavailable.' },
  movementRestricted: { code: 'capability-restricted', message: 'Movement is unavailable.' },
  paused: { code: 'paused', message: 'The world is paused.' },
  notAlive: { code: 'not-alive', message: 'This actor cannot act.' },
  unsupportedAirborne: {
    code: 'unsupported-airborne-action',
    message: 'This native action requires a supported ground stance.',
  },
  unsupportedController: {
    code: 'unsupported-controller',
    message: 'This entity has no installed native controller.',
  },
  experienceCapacity: {
    code: 'experience-capacity',
    message:
      'The action-record allowance is full. Existing work and history are preserved; new recorded actions need more storage allowance.',
  },
  idempotencyConflict: {
    code: 'idempotency-conflict',
    message: 'This command ID was already used with another body.',
  },
  unsupportedNavigation: {
    code: 'unsupported-navigation',
    message: 'Only a short direct probe is supported without vision.',
  },
  blocked: { code: 'blocked', message: 'Choose walkable ground.' },
  unreachable: {
    code: 'unreachable',
    message: 'No supported route to a reachable stance was found.',
  },
  noRoute: { code: 'no-route', message: 'No supported route was found.' },
  budgetExceeded: { code: 'budget-exceeded', message: 'No supported route was found.' },
  staleAction: { code: 'stale-action', message: 'That action has ended or been replaced.' },
  cannotInterrupt: {
    code: 'cannot-interrupt',
    message: 'The current state must end before starting another activity.',
  },
  cannotCancel: {
    code: 'cannot-interrupt',
    message: 'This state does not allow voluntary interruption.',
  },
  staleNativeMovement: {
    code: 'stale-native-movement',
    message: 'The selected native movement is no longer current.',
  },
  accepted: { code: 'accepted', message: 'Action started.' },
  cancelledByChoice: {
    code: 'cancelled',
    message: 'Stopped by choice; already committed effects remain.',
  },
  cancelledReplaced: {
    code: 'cancelled',
    message: 'Replaced by newly chosen work; committed effects remain.',
  },
  stopped: {
    code: 'cancelled',
    message: 'Stopped. Materials already used in work remain consumed.',
  },
  invalidEffect: {
    code: 'invalid-effect',
    message: 'Choose an available status effect and target.',
  },
  invalidFacing: {
    code: 'invalid-pose',
    message: 'Choose a valid facing for an ordinary resting posture.',
  },
  invalidRestingPlace: {
    code: 'invalid-pose',
    message: 'Choose an available resting place for this person.',
  },
  outOfReach: {
    code: 'out-of-reach',
    message: 'The target must be permitted, visible and within reach.',
  },
  notActive: { code: 'not-active', message: 'That status effect is not active.' },
  notApplicable: {
    code: 'not-applicable',
    message: 'The status effect activation conditions are not met.',
  },
  movementDeparture: 'started moving to {x}, {z}.',
  actionStartedEvent: 'action-started',
  statusOutcomeCode: 'status-effect',
  activated: 'activated',
  deactivated: 'deactivated',
  approachName: 'Move into reach',
  approachFacts: ['distance', 'approach'],
  beforeAttemptFacts: {
    health: 'health before the attempt',
    distance: 'distance before the attempt',
  },
  statusInterruptionSuffix: ' interrupted the activity.',
  movementArrival: 'moved to {x}, {z}.',
  movementCompleted: { code: 'completed', message: 'move completed.' },
  movementMissingDestination: 'the target disappeared.',
  movementDestinationNotReached: 'the destination was not reached.',
  movementChangingRoute: 'the target or route keeps changing; choose a new action.',
  movementBlockedRoute: 'the route became physically blocked.',
  actionStoppedPrefix: 'stopped: ',
  actionStoppedEvent: 'action-stopped',
  movementArrivalEvent: 'moved',
} as const;
