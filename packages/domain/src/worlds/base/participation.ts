/** The bundled world's authored fallback, shared by ordinary return and playtest recovery.
 * Other worlds may supply another anchor or omit fallback; the engine never searches randomly.
 */
export const BASE_PARTICIPATION_POLICY = {
  safeReturnAnchor: { x: 11, y: 0, z: 13, surfaceId: 'terrain' },
  // Five seconds at the world's normal 60 game seconds per real second. Pause does not count.
  exitExposureSeconds: 300,
  exitDescription:
    'After logout or leaving this tab, your character remains vulnerable for five fully simulated seconds at normal speed. Leave somewhere safe. Pause and route preparation do not count.',
};
