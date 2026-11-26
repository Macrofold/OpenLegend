/** The bundled world's authored fallback, shared by ordinary return and playtest recovery.
 * Other worlds may supply another anchor or omit fallback; the engine never searches randomly.
 */
export const BASE_PARTICIPATION_PRESENTATION = {
  changedRefresh: {
    code: 'participation-unavailable',
    message: 'Participation changed. Refresh before continuing.',
  },
  invalidAttempt: { code: 'participation-unavailable', message: 'Invalid exit attempt.' },
  staleAttempt: {
    code: 'participation-unavailable',
    message: 'This exit attempt is no longer current.',
  },
  changed: { code: 'participation-unavailable', message: 'Participation changed.' },
  alreadyPending: { code: 'unchanged', message: 'Exit is already pending.' },
  alreadyParticipating: { code: 'unchanged', message: 'Already participating.' },
  unsafeReturn: {
    code: 'participation-unavailable',
    message:
      'The saved location and configured return location are unavailable. A safe return location must be restored.',
  },
  active: { code: 'active', message: 'You have returned.' },
  exiting: { code: 'exiting', message: 'Departure is pending.' },
  inactive: {
    code: 'inactive',
    message: 'You have left the active world. Your belongings and history are retained.',
  },
  departedEvent: 'departed',
  departedClause: 'left the active world.',
  returnedEvent: 'returned',
  returnedClause: 'returned to the active world.',
};

export const BASE_PARTICIPATION_POLICY = {
  safeReturnAnchor: { x: 11, y: 0, z: 13, surfaceId: 'terrain' },
  // Five seconds at the world's normal 60 game seconds per real second. Pause does not count.
  exitExposureSeconds: 300,
  exitDescription:
    'After logout or leaving this tab, your character remains vulnerable for five fully simulated seconds at normal speed. Leave somewhere safe. Pause and route preparation do not count.',
};
